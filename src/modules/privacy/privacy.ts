/**
 * Privacy Module - Stealth address payments
 *
 * Integrates with deployed StealthRegistry contract for on-chain
 * stealth meta-address registration and payment announcements.
 */

import { createWalletClient, http, publicActions, parseUnits, formatUnits, type Chain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import type {
  PrivacyConfig,
  StealthKeyPair,
  SendPrivateOptions,
  PrivatePaymentResult,
  StealthPayment,
  ClaimResult,
} from './types';
import { StealthAddressGenerator } from './stealth';
import { getContractAddresses } from '../../contracts/addresses';
import { STEALTH_REGISTRY_ABI } from '../../contracts/abis';

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

// Get real contract addresses
const addresses = getContractAddresses(5042002);
const USDC_ADDRESS = addresses.usdc as `0x${string}`;
const STEALTH_REGISTRY_ADDRESS = addresses.stealthRegistry as `0x${string}`;
const USDC_DECIMALS = 6;

const ERC20_ABI = [
  {
    name: 'transfer',
    type: 'function',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
] as const;

/**
 * Privacy module for stealth address payments
 *
 * Enables private payments using stealth addresses.
 * Recipients share their stealth meta-address, senders generate
 * one-time addresses that only the recipient can claim.
 */
export class PrivacyModule {
  private wallet: ReturnType<typeof createWalletClient>;
  private stealthKeys: StealthKeyPair;
  private sentPayments: StealthPayment[] = [];
  private stealthRegistryAddress: `0x${string}`;
  public lastScannedIndex: number = 0;
  public registeredOnChain: boolean = false;

  constructor(config: PrivacyConfig) {
    const account = privateKeyToAccount(config.privateKey as `0x${string}`);
    this.wallet = createWalletClient({
      account,
      chain: arcTestnet,
      transport: http(),
    }).extend(publicActions);

    // Use provided stealth keys or generate new ones
    this.stealthKeys =
      config.stealthKeys || StealthAddressGenerator.generateKeyPair();

    // Set stealth registry contract address
    this.stealthRegistryAddress = STEALTH_REGISTRY_ADDRESS;
  }

  /**
   * Get stealth meta-address to share with senders
   *
   * Share this address with anyone who wants to send you
   * private payments.
   */
  getStealthMetaAddress(): string {
    return this.stealthKeys.stealthMetaAddress;
  }

  /**
   * Get stealth keys for backup
   *
   * IMPORTANT: Store these securely! They're needed to claim payments.
   */
  getStealthKeys(): StealthKeyPair {
    return { ...this.stealthKeys };
  }

  /**
   * Check if stealth meta-address is registered on-chain
   */
  async isRegisteredOnChain(): Promise<boolean> {
    try {
      const walletWithRead = this.wallet as typeof this.wallet & {
        readContract: (args: {
          address: `0x${string}`;
          abi: readonly string[];
          functionName: string;
          args: unknown[];
        }) => Promise<boolean>;
      };

      const result = await walletWithRead.readContract({
        address: this.stealthRegistryAddress,
        abi: STEALTH_REGISTRY_ABI,
        functionName: 'isRegistered',
        args: [this.wallet.account?.address],
      });

      this.registeredOnChain = result;
      return result;
    } catch {
      return false;
    }
  }

  /**
   * Register stealth meta-address on-chain
   *
   * This allows others to look up your meta-address and send you private payments.
   * Only needs to be called once per wallet.
   */
  async registerOnChain(): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      // Check if already registered
      const isRegistered = await this.isRegisteredOnChain();
      if (isRegistered) {
        return { success: true, error: 'Already registered on-chain' };
      }

      // Extract spending and viewing public keys from stealth meta-address
      const metaAddress = this.stealthKeys.stealthMetaAddress;
      // Format: st:arc:spendingPubKey:viewingPubKey
      const parts = metaAddress.split(':');
      if (parts.length !== 4) {
        return { success: false, error: 'Invalid stealth meta-address format' };
      }

      const spendingPubKey = `0x${parts[2]}` as `0x${string}`;
      const viewingPubKey = `0x${parts[3]}` as `0x${string}`;

      const walletWithWrite = this.wallet as typeof this.wallet & {
        writeContract: (args: {
          address: `0x${string}`;
          abi: readonly string[];
          functionName: string;
          args: unknown[];
        }) => Promise<`0x${string}`>;
      };

      const hash = await walletWithWrite.writeContract({
        address: this.stealthRegistryAddress,
        abi: STEALTH_REGISTRY_ABI,
        functionName: 'registerMetaAddress',
        args: [spendingPubKey, viewingPubKey],
      });

      this.registeredOnChain = true;
      return { success: true, txHash: hash };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      };
    }
  }

  /**
   * Generate a new receive address
   *
   * Creates a one-time stealth address for receiving a payment.
   */
  generateReceiveAddress() {
    return StealthAddressGenerator.generateStealthAddress(
      this.stealthKeys.stealthMetaAddress
    );
  }

  /**
   * Send private payment using stealth address
   *
   * If recipient provides a stealth meta-address (st:arc:...),
   * a new stealth address is generated for privacy.
   * The payment is announced on-chain via StealthRegistry.
   *
   * @param options - Payment options
   * @returns Payment result with stealth details
   */
  async sendPrivate(options: SendPrivateOptions): Promise<PrivatePaymentResult> {
    try {
      const isStealthAddress = StealthAddressGenerator.isStealthMetaAddress(
        options.to
      );

      let targetAddress: string;
      let ephemeralPubKey: string | undefined;
      let viewTag: string | undefined;

      if (isStealthAddress) {
        // Generate stealth address for recipient
        const stealth = StealthAddressGenerator.generateStealthAddress(options.to);
        targetAddress = stealth.address;
        ephemeralPubKey = stealth.ephemeralPubKey;
        viewTag = stealth.viewTag;
      } else {
        // Regular address - just do direct transfer
        targetAddress = options.to;
      }

      const amountWei = parseUnits(options.amount, USDC_DECIMALS);

      const walletWithMethods = this.wallet as typeof this.wallet & {
        writeContract: (args: {
          address: `0x${string}`;
          abi: typeof ERC20_ABI | readonly string[];
          functionName: string;
          args: unknown[];
        }) => Promise<`0x${string}`>;
        readContract: (args: {
          address: `0x${string}`;
          abi: typeof ERC20_ABI;
          functionName: string;
          args: unknown[];
        }) => Promise<bigint>;
      };

      let hash: `0x${string}`;

      if (ephemeralPubKey) {
        // Use StealthRegistry for on-chain announcement
        // First, check and approve USDC for the registry
        const currentAllowance = await walletWithMethods.readContract({
          address: USDC_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [this.wallet.account?.address, this.stealthRegistryAddress],
        });

        if (currentAllowance < amountWei) {
          // Approve USDC for StealthRegistry
          await walletWithMethods.writeContract({
            address: USDC_ADDRESS,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [this.stealthRegistryAddress, amountWei * 2n], // Approve extra for future
          });
        }

        // Create encrypted memo (optional - can include viewTag)
        const encryptedMemo = viewTag ? `0x${viewTag}` : '0x';

        // Send via StealthRegistry contract
        hash = await walletWithMethods.writeContract({
          address: this.stealthRegistryAddress,
          abi: STEALTH_REGISTRY_ABI,
          functionName: 'sendStealthPayment',
          args: [
            targetAddress as `0x${string}`,
            amountWei,
            `0x${ephemeralPubKey}` as `0x${string}`,
            encryptedMemo as `0x${string}`,
          ],
        });

        // Record stealth payment locally
        this.sentPayments.push({
          id: `sp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          stealthAddress: targetAddress,
          ephemeralPubKey,
          amount: options.amount,
          txHash: hash,
          timestamp: new Date().toISOString(),
          claimed: false,
        });
      } else {
        // Direct transfer for non-stealth addresses
        hash = await walletWithMethods.writeContract({
          address: USDC_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [targetAddress as `0x${string}`, amountWei],
        });
      }

      return {
        success: true,
        txHash: hash,
        stealthAddress: targetAddress,
        ephemeralPubKey,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Private send failed',
      };
    }
  }

  /**
   * Claim a stealth payment
   *
   * Uses the ephemeral public key to derive the private key
   * for the stealth address and transfer funds.
   *
   * @param stealthAddress - The stealth address holding funds
   * @param ephemeralPubKey - Ephemeral public key from sender
   * @param toAddress - Optional destination (defaults to main wallet)
   * @returns Claim result
   */
  async claimPayment(
    stealthAddress: string,
    ephemeralPubKey: string,
    toAddress?: string
  ): Promise<ClaimResult> {
    try {
      // Derive private key for stealth address
      const stealthPrivKey = StealthAddressGenerator.computeStealthPrivateKey(
        this.stealthKeys,
        ephemeralPubKey
      );

      // Create wallet for stealth address
      const stealthAccount = privateKeyToAccount(stealthPrivKey);
      const stealthWallet = createWalletClient({
        account: stealthAccount,
        chain: arcTestnet,
        transport: http(),
      }).extend(publicActions);

      // Check balance
      const balance = await (stealthWallet as typeof stealthWallet & {
        readContract: (args: {
          address: `0x${string}`;
          abi: typeof ERC20_ABI;
          functionName: 'balanceOf';
          args: [`0x${string}`];
        }) => Promise<bigint>;
      }).readContract({
        address: USDC_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [stealthAddress as `0x${string}`],
      });

      if (balance === 0n) {
        return {
          success: false,
          error: 'No balance to claim at this stealth address',
        };
      }

      // Transfer to destination
      const destination =
        toAddress || (this.wallet.account?.address as `0x${string}`);

      const stealthWalletWithWrite = stealthWallet as typeof stealthWallet & {
        writeContract: (args: {
          address: `0x${string}`;
          abi: typeof ERC20_ABI;
          functionName: 'transfer';
          args: [`0x${string}`, bigint];
        }) => Promise<`0x${string}`>;
      };

      const hash = await stealthWalletWithWrite.writeContract({
        address: USDC_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [destination as `0x${string}`, balance],
      });

      const amount = (Number(balance) / 10 ** USDC_DECIMALS).toFixed(6);

      return {
        success: true,
        txHash: hash,
        amount,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Claim failed',
      };
    }
  }

  /**
   * Check if an address belongs to us
   *
   * Uses view tag for quick filtering, then full derivation.
   *
   * @param ephemeralPubKey - Ephemeral public key from announcement
   * @param viewTag - View tag for quick check
   * @param stealthAddress - Address to verify
   * @returns Whether this payment is for us
   */
  isOurPayment(
    ephemeralPubKey: string,
    viewTag: string,
    stealthAddress: string
  ): boolean {
    // Quick check with view tag
    if (
      !StealthAddressGenerator.checkViewTag(
        this.stealthKeys,
        ephemeralPubKey,
        viewTag
      )
    ) {
      return false;
    }

    // Full derivation check
    const derivedAddress = StealthAddressGenerator.deriveStealthAddress(
      this.stealthKeys,
      ephemeralPubKey
    );

    return derivedAddress.toLowerCase() === stealthAddress.toLowerCase();
  }

  /**
   * Get sent stealth payments
   */
  getSentPayments(): StealthPayment[] {
    return [...this.sentPayments];
  }

  /**
   * Get unclaimed sent payments
   */
  getUnclaimedPayments(): StealthPayment[] {
    return this.sentPayments.filter((p) => !p.claimed);
  }

  /**
   * Mark a payment as claimed
   */
  markClaimed(paymentId: string): void {
    const payment = this.sentPayments.find((p) => p.id === paymentId);
    if (payment) {
      payment.claimed = true;
    }
  }

  /**
   * Scan on-chain announcements for payments to us
   *
   * Queries the StealthRegistry contract for new announcements
   * and checks if any are destined for our stealth addresses.
   *
   * @param count - Number of announcements to fetch (default 100)
   * @returns Array of payments belonging to us
   */
  async scanAnnouncements(count: number = 100): Promise<{
    payments: Array<{
      id: string;
      stealthAddress: string;
      ephemeralPubKey: string;
      amount: string;
      timestamp: number;
      claimed: boolean;
    }>;
    scannedCount: number;
  }> {
    try {
      const walletWithRead = this.wallet as typeof this.wallet & {
        readContract: (args: {
          address: `0x${string}`;
          abi: readonly string[];
          functionName: string;
          args: unknown[];
        }) => Promise<unknown>;
      };

      // Get announcements from registry
      const result = await walletWithRead.readContract({
        address: this.stealthRegistryAddress,
        abi: STEALTH_REGISTRY_ABI,
        functionName: 'getNewAnnouncements',
        args: [count],
      }) as [
        Array<{
          id: string;
          stealthAddress: string;
          token: string;
          amount: bigint;
          ephemeralPubKey: string;
          encryptedMemo: string;
          timestamp: bigint;
          claimed: boolean;
        }>,
        bigint
      ];

      const [announcements, newLastIndex] = result;
      const ourPayments: Array<{
        id: string;
        stealthAddress: string;
        ephemeralPubKey: string;
        amount: string;
        timestamp: number;
        claimed: boolean;
      }> = [];

      for (const announcement of announcements) {
        // Extract ephemeral public key (remove 0x prefix if present)
        const ephemeralPubKey = announcement.ephemeralPubKey.startsWith('0x')
          ? announcement.ephemeralPubKey.slice(2)
          : announcement.ephemeralPubKey;

        // Extract view tag from encrypted memo if available
        const viewTag = announcement.encryptedMemo.length > 2
          ? (announcement.encryptedMemo.startsWith('0x')
            ? announcement.encryptedMemo.slice(2)
            : announcement.encryptedMemo)
          : '';

        // Check if this payment is for us
        const isOurs = viewTag
          ? this.isOurPayment(ephemeralPubKey, viewTag, announcement.stealthAddress)
          : this.checkPaymentWithoutViewTag(ephemeralPubKey, announcement.stealthAddress);

        if (isOurs) {
          ourPayments.push({
            id: announcement.id,
            stealthAddress: announcement.stealthAddress,
            ephemeralPubKey,
            amount: formatUnits(announcement.amount, USDC_DECIMALS),
            timestamp: Number(announcement.timestamp),
            claimed: announcement.claimed,
          });
        }
      }

      // Update last scanned index
      this.lastScannedIndex = Number(newLastIndex);

      return {
        payments: ourPayments,
        scannedCount: announcements.length,
      };
    } catch (error) {
      console.error('Failed to scan announcements:', error);
      return {
        payments: [],
        scannedCount: 0,
      };
    }
  }

  /**
   * Check if payment is for us without view tag
   * @internal
   */
  private checkPaymentWithoutViewTag(ephemeralPubKey: string, stealthAddress: string): boolean {
    try {
      const derivedAddress = StealthAddressGenerator.deriveStealthAddress(
        this.stealthKeys,
        ephemeralPubKey
      );
      return derivedAddress.toLowerCase() === stealthAddress.toLowerCase();
    } catch {
      return false;
    }
  }

  /**
   * Get total announcements count from registry
   */
  async getTotalAnnouncements(): Promise<number> {
    try {
      const walletWithRead = this.wallet as typeof this.wallet & {
        readContract: (args: {
          address: `0x${string}`;
          abi: readonly string[];
          functionName: string;
          args: unknown[];
        }) => Promise<bigint>;
      };

      const total = await walletWithRead.readContract({
        address: this.stealthRegistryAddress,
        abi: STEALTH_REGISTRY_ABI,
        functionName: 'getTotalAnnouncements',
        args: [],
      });

      return Number(total);
    } catch {
      return 0;
    }
  }

  /**
   * Get the stealth registry contract address
   */
  getRegistryAddress(): string {
    return this.stealthRegistryAddress;
  }
}

/**
 * Create a privacy module
 *
 * @param config - Privacy configuration
 * @returns PrivacyModule instance
 *
 * @example
 * ```typescript
 * const privacy = createPrivacyModule({ privateKey });
 *
 * // Get your stealth meta-address to share
 * const myStealthAddress = privacy.getStealthMetaAddress();
 * console.log(`Send me private payments to: ${myStealthAddress}`);
 *
 * // Send a private payment
 * const result = await privacy.sendPrivate({
 *   to: 'st:arc:742d35Cc6634C0532925a3b844Bc9e7595f5E123...',
 *   amount: '100'
 * });
 *
 * // Claim a received payment
 * await privacy.claimPayment(stealthAddress, ephemeralPubKey);
 * ```
 */
export function createPrivacyModule(config: PrivacyConfig): PrivacyModule {
  return new PrivacyModule(config);
}
