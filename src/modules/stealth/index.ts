/**
 * Stealth Payments Module
 *
 * Privacy-preserving payments using stealth addresses (EIP-5564).
 * Each payment goes to a unique one-time address that only the recipient can spend from.
 *
 * @example
 * ```typescript
 * // Recipient: Generate and register stealth keys
 * const stealth = new StealthManager({ privateKey: '0x...' });
 * const keys = stealth.generateKeys();
 * await stealth.registerMetaAddress(keys);
 *
 * // Sender: Send private payment
 * const metaAddress = await stealth.getMetaAddress(recipientAddress);
 * await stealth.sendPayment({ recipient: metaAddress, amount: '100' });
 *
 * // Recipient: Scan and claim payments
 * const payments = await stealth.scanPayments(keys);
 * for (const payment of payments) {
 *   await stealth.claimPayment(payment);
 * }
 * ```
 */

import {
  createWalletClient,
  createPublicClient,
  http,
  parseUnits,
  formatUnits,
  type Chain,
  type PublicClient,
  type WalletClient,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
  generateStealthKeys,
  getMetaAddress,
  generateStealthAddress,
  scanAnnouncement,
} from './crypto';
import type {
  StealthConfig,
  StealthKeyPair,
  StealthMetaAddress,
  StealthAnnouncement,
  ScannedPayment,
  SendStealthParams,
  SendStealthResult,
  ClaimStealthResult,
} from './types';
import { getContractAddresses, STEALTH_REGISTRY_ABI } from '../../contracts';

// Re-export types and crypto functions
export type {
  StealthConfig,
  StealthKeyPair,
  StealthMetaAddress,
  StealthAnnouncement,
  ScannedPayment,
  SendStealthParams,
  SendStealthResult,
  ClaimStealthResult,
};
export { generateStealthKeys, getMetaAddress, generateStealthAddress, scanAnnouncement };

/**
 * Arc testnet chain configuration
 */
const arcTestnet: Chain = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.arc.network'] },
  },
};

// Native USDC uses 18 decimals on Arc
const USDC_DECIMALS = 18;

/**
 * Stealth Payment Manager
 */
export class StealthManager {
  private account: ReturnType<typeof privateKeyToAccount>;
  private walletClient: WalletClient;
  private publicClient: PublicClient;
  private registryAddress: `0x${string}`;

  constructor(config: StealthConfig) {
    const addresses = getContractAddresses(5042002);
    this.registryAddress =
      (config.registryAddress as `0x${string}`) ||
      (addresses.stealthRegistry as `0x${string}`);

    this.account = privateKeyToAccount(config.privateKey as `0x${string}`);

    this.publicClient = createPublicClient({
      chain: arcTestnet,
      transport: http(config.rpcUrl || 'https://rpc.testnet.arc.network'),
    });

    this.walletClient = createWalletClient({
      account: this.account,
      chain: arcTestnet,
      transport: http(config.rpcUrl || 'https://rpc.testnet.arc.network'),
    });
  }

  /**
   * Generate a new stealth key pair
   */
  generateKeys(): StealthKeyPair {
    return generateStealthKeys();
  }

  /**
   * Get the wallet address
   */
  getAddress(): string {
    return this.account.address;
  }

  /**
   * Register stealth meta-address on-chain
   */
  async registerMetaAddress(keys: StealthKeyPair): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      const meta = getMetaAddress(keys);

      const hash = await this.walletClient.writeContract({
        chain: arcTestnet,
        account: this.account,
        address: this.registryAddress,
        abi: STEALTH_REGISTRY_ABI,
        functionName: 'registerMetaAddress',
        args: [meta.spendingPublicKey as `0x${string}`, meta.viewingPublicKey as `0x${string}`],
      });

      await this.publicClient.waitForTransactionReceipt({ hash });

      return { success: true, txHash: hash };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      };
    }
  }

  /**
   * Get meta-address for a user from the registry
   */
  async getMetaAddress(userAddress: string): Promise<StealthMetaAddress | null> {
    try {
      const result = await this.publicClient.readContract({
        address: this.registryAddress,
        abi: STEALTH_REGISTRY_ABI,
        functionName: 'getMetaAddress',
        args: [userAddress as `0x${string}`],
      }) as { spendingPubKey: string; viewingPubKey: string; registeredAt: bigint; active: boolean };

      if (!result.active || result.registeredAt === 0n) {
        return null;
      }

      return {
        spendingPublicKey: result.spendingPubKey,
        viewingPublicKey: result.viewingPubKey,
      };
    } catch {
      return null;
    }
  }

  /**
   * Check if a user has registered a stealth meta-address
   */
  async isRegistered(userAddress: string): Promise<boolean> {
    try {
      return await this.publicClient.readContract({
        address: this.registryAddress,
        abi: STEALTH_REGISTRY_ABI,
        functionName: 'isRegistered',
        args: [userAddress as `0x${string}`],
      }) as boolean;
    } catch {
      return false;
    }
  }

  /**
   * Send a stealth payment
   */
  async sendPayment(params: SendStealthParams): Promise<SendStealthResult> {
    try {
      // Get recipient's meta-address
      let metaAddress: StealthMetaAddress;
      if (typeof params.recipient === 'string') {
        const fetched = await this.getMetaAddress(params.recipient);
        if (!fetched) {
          return { success: false, error: 'Recipient has no registered stealth meta-address' };
        }
        metaAddress = fetched;
      } else {
        metaAddress = params.recipient;
      }

      // Generate stealth address
      const stealthResult = generateStealthAddress(metaAddress);

      // Parse amount
      const amount = parseUnits(params.amount, USDC_DECIMALS);

      // Prepare memo (empty if not provided)
      const encryptedMemo = params.memo ? `0x${Buffer.from(params.memo).toString('hex')}` : '0x';

      // Send payment
      const hash = await this.walletClient.writeContract({
        chain: arcTestnet,
        account: this.account,
        address: this.registryAddress,
        abi: STEALTH_REGISTRY_ABI,
        functionName: 'sendStealthPayment',
        args: [
          stealthResult.stealthAddress as `0x${string}`,
          stealthResult.ephemeralPublicKey as `0x${string}`,
          encryptedMemo as `0x${string}`,
        ],
        value: amount,
      });

      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

      // Extract announcement ID from logs
      const announcementLog = receipt.logs.find(
        (log) => log.address.toLowerCase() === this.registryAddress.toLowerCase()
      );
      const announcementId = announcementLog?.topics[1] || '';

      return {
        success: true,
        announcementId,
        stealthAddress: stealthResult.stealthAddress,
        txHash: hash,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment failed',
      };
    }
  }

  /**
   * Scan for payments belonging to us
   */
  async scanPayments(keys: StealthKeyPair, fromIndex = 0, count = 100): Promise<ScannedPayment[]> {
    try {
      const announcements = await this.publicClient.readContract({
        address: this.registryAddress,
        abi: STEALTH_REGISTRY_ABI,
        functionName: 'getAnnouncements',
        args: [BigInt(fromIndex), BigInt(count)],
      }) as Array<{
        id: string;
        stealthAddress: string;
        amount: bigint;
        ephemeralPubKey: string;
        encryptedMemo: string;
        timestamp: bigint;
        claimed: boolean;
      }>;

      const payments: ScannedPayment[] = [];

      for (const ann of announcements) {
        if (ann.claimed) continue;

        // Try to derive the stealth private key
        const stealthPrivateKey = scanAnnouncement(
          keys,
          ann.ephemeralPubKey,
          ann.stealthAddress
        );

        if (stealthPrivateKey) {
          // This payment belongs to us!
          payments.push({
            announcement: {
              id: ann.id,
              stealthAddress: ann.stealthAddress,
              amount: formatUnits(ann.amount, USDC_DECIMALS),
              ephemeralPublicKey: ann.ephemeralPubKey,
              encryptedMemo: ann.encryptedMemo,
              timestamp: Number(ann.timestamp),
              claimed: ann.claimed,
            },
            stealthPrivateKey,
            memo: ann.encryptedMemo && ann.encryptedMemo !== '0x'
              ? Buffer.from(ann.encryptedMemo.slice(2), 'hex').toString()
              : undefined,
          });
        }
      }

      return payments;
    } catch (error) {
      console.error('Scan failed:', error);
      return [];
    }
  }

  /**
   * Claim a stealth payment (transfer from stealth address to your main wallet)
   */
  async claimPayment(payment: ScannedPayment): Promise<ClaimStealthResult> {
    try {
      // Create wallet client for stealth address
      const stealthAccount = privateKeyToAccount(payment.stealthPrivateKey as `0x${string}`);
      const stealthWallet = createWalletClient({
        account: stealthAccount,
        chain: arcTestnet,
        transport: http('https://rpc.testnet.arc.network'),
      });

      // Get balance of stealth address
      const balance = await this.publicClient.getBalance({
        address: stealthAccount.address,
      });

      if (balance === 0n) {
        return { success: false, error: 'No balance to claim' };
      }

      // Estimate gas for transfer
      const gasPrice = await this.publicClient.getGasPrice();
      const gasLimit = 21000n;
      const gasCost = gasPrice * gasLimit;

      // Calculate amount to send (balance - gas)
      const amountToSend = balance - gasCost;
      if (amountToSend <= 0n) {
        return { success: false, error: 'Balance too low to cover gas' };
      }

      // Send to main wallet
      const hash = await stealthWallet.sendTransaction({
        to: this.account.address,
        value: amountToSend,
        gas: gasLimit,
      });

      await this.publicClient.waitForTransactionReceipt({ hash });

      // Mark as claimed in registry
      try {
        await stealthWallet.writeContract({
          chain: arcTestnet,
          account: stealthAccount,
          address: this.registryAddress,
          abi: STEALTH_REGISTRY_ABI,
          functionName: 'markClaimed',
          args: [payment.announcement.id as `0x${string}`],
        });
      } catch {
        // Not critical if this fails
      }

      return {
        success: true,
        amount: formatUnits(amountToSend, USDC_DECIMALS),
        txHash: hash,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Claim failed',
      };
    }
  }

  /**
   * Get total announcements count
   */
  async getTotalAnnouncements(): Promise<number> {
    try {
      const count = await this.publicClient.readContract({
        address: this.registryAddress,
        abi: STEALTH_REGISTRY_ABI,
        functionName: 'getTotalAnnouncements',
        args: [],
      }) as bigint;
      return Number(count);
    } catch {
      return 0;
    }
  }
}

/**
 * Create a stealth manager instance
 */
export function createStealthManager(config: StealthConfig): StealthManager {
  return new StealthManager(config);
}

export default { StealthManager, createStealthManager, generateStealthKeys };
