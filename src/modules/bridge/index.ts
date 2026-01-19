/**
 * Bridge module - Cross-chain USDC transfers using Circle Bridge Kit
 *
 * Enables seamless USDC transfers between Arc and other supported chains
 * using Circle's Cross-Chain Transfer Protocol (CCTP).
 *
 * @example
 * ```typescript
 * const arc = await ArcPay.init({
 *   network: 'arc-testnet',
 *   privateKey: process.env.PRIVATE_KEY,
 * });
 *
 * // Bridge 100 USDC from Arc to Base
 * const result = await arc.bridge.transfer({
 *   to: 'base-sepolia',
 *   amount: '100',
 * });
 *
 * console.log('Transfer complete:', result.success);
 * ```
 */

import { BridgeKit } from '@circle-fin/bridge-kit';
import { createAdapterFromPrivateKey } from '@circle-fin/adapter-viem-v2';
import type { ArcPay } from '../../core/client';
import type {
  SupportedChain,
  BridgeTransferParams,
  BridgeTransferResult,
  BridgeStatusResult,
  BridgeEvent,
  ChainInfo,
  AttestationResponse,
  TransferInfo,
} from './types';

/**
 * Circle CCTP Attestation API URL
 */
const CCTP_ATTESTATION_API = 'https://iris-api.circle.com/attestations';

/**
 * Chain name mapping for Bridge Kit
 */
const CHAIN_MAP: Record<SupportedChain, string> = {
  'arc': 'Arc',
  'arc-testnet': 'Arc',
  'ethereum': 'Ethereum',
  'sepolia': 'Ethereum-Sepolia',
  'base': 'Base',
  'base-sepolia': 'Base-Sepolia',
  'arbitrum': 'Arbitrum',
  'arbitrum-sepolia': 'Arbitrum-Sepolia',
  'avalanche': 'Avalanche',
  'avalanche-fuji': 'Avalanche-Fuji',
  'polygon': 'Polygon',
  'polygon-amoy': 'Polygon-Amoy',
};

/**
 * Chain info for supported chains
 */
const CHAIN_INFO: Record<SupportedChain, ChainInfo> = {
  'arc': { name: 'Arc', chainId: 6042002, isTestnet: false },
  'arc-testnet': { name: 'Arc Testnet', chainId: 5042002, isTestnet: true },
  'ethereum': { name: 'Ethereum', chainId: 1, isTestnet: false },
  'sepolia': { name: 'Sepolia', chainId: 11155111, isTestnet: true },
  'base': { name: 'Base', chainId: 8453, isTestnet: false },
  'base-sepolia': { name: 'Base Sepolia', chainId: 84532, isTestnet: true },
  'arbitrum': { name: 'Arbitrum', chainId: 42161, isTestnet: false },
  'arbitrum-sepolia': { name: 'Arbitrum Sepolia', chainId: 421614, isTestnet: true },
  'avalanche': { name: 'Avalanche', chainId: 43114, isTestnet: false },
  'avalanche-fuji': { name: 'Avalanche Fuji', chainId: 43113, isTestnet: true },
  'polygon': { name: 'Polygon', chainId: 137, isTestnet: false },
  'polygon-amoy': { name: 'Polygon Amoy', chainId: 80002, isTestnet: true },
};

/**
 * Bridge module for cross-chain USDC transfers
 */
export class BridgeModule {
  private client: ArcPay;
  private kit: BridgeKit;
  private privateKey?: string;
  private eventHandlers: Map<string, ((event: BridgeEvent) => void)[]> = new Map();
  private transfers: Map<string, TransferInfo> = new Map();

  constructor(client: ArcPay) {
    this.client = client;
    this.kit = new BridgeKit();

    // Try to extract private key from wallet client account
    if (client.walletClient?.account) {
      const account = client.walletClient.account;
      // Check if account has source property indicating it's from privateKeyToAccount
      if ('source' in account && account.source === 'privateKey') {
        // The private key is not directly accessible from viem account
        // Users need to pass it explicitly for bridge operations
      }
    }
  }

  /**
   * Set private key for bridge operations
   * Required because Bridge Kit needs raw private key access
   */
  setPrivateKey(privateKey: string): void {
    this.privateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  }

  /**
   * Get current source chain name for Bridge Kit
   */
  private getSourceChain(): string {
    const networkName = this.client.network.name as SupportedChain;
    return CHAIN_MAP[networkName] || 'Arc';
  }

  /**
   * Transfer USDC to another chain
   *
   * @param params - Transfer parameters
   * @returns Transfer result
   *
   * @example
   * ```typescript
   * // First set private key (required for bridge)
   * arc.bridge.setPrivateKey(process.env.PRIVATE_KEY);
   *
   * const result = await arc.bridge.transfer({
   *   to: 'base-sepolia',
   *   amount: '100',
   *   recipient: '0x...', // Optional: different recipient
   * });
   * ```
   */
  async transfer(params: BridgeTransferParams): Promise<BridgeTransferResult> {
    if (!this.privateKey) {
      return {
        success: false,
        error: 'Private key required for bridge. Call setPrivateKey() first.',
      };
    }

    try {
      const sourceChain = this.getSourceChain();
      const targetChain = CHAIN_MAP[params.to];

      if (!targetChain) {
        return { success: false, error: `Unsupported target chain: ${params.to}` };
      }

      // Create adapter with private key
      const adapter = createAdapterFromPrivateKey({
        privateKey: this.privateKey,
      });

      // Execute bridge
      const result = await this.kit.bridge({
        from: {
          adapter,
          chain: sourceChain as Parameters<typeof this.kit.bridge>[0]['from']['chain'],
        },
        to: {
          adapter,
          chain: targetChain as Parameters<typeof this.kit.bridge>[0]['to']['chain'],
        },
        amount: params.amount,
      });

      // Extract transaction hashes from steps
      const burnStep = result.steps.find(s => s.name.toLowerCase().includes('burn'));
      const mintStep = result.steps.find(s => s.name.toLowerCase().includes('mint'));

      // Generate transfer ID and extract message hash if available
      const transferId = burnStep?.txHash || `bridge-${Date.now()}`;
      const messageHash = this.extractMessageHash(burnStep?.txHash);

      // Store transfer info for status tracking
      if (burnStep?.txHash) {
        const transferInfo: TransferInfo = {
          transferId,
          messageHash: messageHash || transferId,
          sourceChain: this.client.network.name as SupportedChain,
          destinationChain: params.to,
          amount: params.amount,
          burnTxHash: burnStep.txHash,
          mintTxHash: mintStep?.txHash,
          status: mintStep?.txHash ? 'completed' : 'burned',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        this.transfers.set(transferId, transferInfo);
      }

      // Emit events
      this.emit('complete', {
        type: 'complete',
        txHash: mintStep?.txHash || burnStep?.txHash,
      });

      return {
        success: result.state === 'success',
        transferId,
        burnTxHash: burnStep?.txHash,
        mintTxHash: mintStep?.txHash,
        explorerUrl: mintStep?.explorerUrl || this.getExplorerUrl(params.to, mintStep?.txHash),
        error: result.state === 'error' ? 'Bridge transfer failed' : undefined,
      };
    } catch (error) {
      this.emit('error', {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Bridge transfer failed',
      };
    }
  }

  /**
   * Get transfer status using Circle CCTP Attestation API
   *
   * @param transferId - Transfer ID (burn tx hash or message hash)
   * @returns Status result with attestation info
   */
  async getStatus(transferId: string): Promise<BridgeStatusResult> {
    // Check if we have stored transfer info
    const storedTransfer = this.transfers.get(transferId);

    if (storedTransfer) {
      // If already completed, return cached result
      if (storedTransfer.status === 'completed' && storedTransfer.mintTxHash) {
        return {
          status: 'completed',
          burnTxHash: storedTransfer.burnTxHash,
          mintTxHash: storedTransfer.mintTxHash,
        };
      }

      // Query attestation API with message hash
      const attestationResult = await this.queryAttestationAPI(storedTransfer.messageHash);

      if (attestationResult) {
        // Update stored transfer with attestation
        storedTransfer.updatedAt = Date.now();

        if (attestationResult.status === 'complete' && attestationResult.attestation) {
          storedTransfer.attestation = attestationResult.attestation;
          storedTransfer.status = 'minting';

          return {
            status: 'minting',
            burnTxHash: storedTransfer.burnTxHash,
          };
        } else {
          // Still waiting for attestation
          storedTransfer.status = 'burned';

          return {
            status: 'burned',
            burnTxHash: storedTransfer.burnTxHash,
          };
        }
      }
    }

    // If no stored transfer, try to query attestation API directly
    // (transferId might be the message hash)
    const attestationResult = await this.queryAttestationAPI(transferId);

    if (attestationResult) {
      if (attestationResult.status === 'complete' && attestationResult.attestation) {
        return {
          status: 'minting',
          burnTxHash: transferId,
        };
      } else {
        return {
          status: 'pending',
          burnTxHash: transferId,
        };
      }
    }

    // Fallback: return pending status
    return {
      status: 'pending',
      burnTxHash: transferId,
    };
  }

  /**
   * Query Circle CCTP Attestation API
   *
   * @param messageHash - The message hash from burn transaction
   * @returns Attestation response or null if not found
   */
  private async queryAttestationAPI(messageHash: string): Promise<AttestationResponse | null> {
    try {
      const response = await fetch(`${CCTP_ATTESTATION_API}/${messageHash}`);

      if (!response.ok) {
        if (response.status === 404) {
          // Attestation not yet available
          return { status: 'pending_confirmations' };
        }
        console.warn(`Attestation API error: ${response.status}`);
        return null;
      }

      const data = await response.json() as AttestationResponse;
      return data;
    } catch (error) {
      console.warn('Failed to query attestation API:', error);
      return null;
    }
  }

  /**
   * Extract message hash from burn transaction
   * In CCTP, the message hash is typically emitted in the MessageSent event
   *
   * @param burnTxHash - The burn transaction hash
   * @returns Message hash or null
   */
  private extractMessageHash(burnTxHash?: string): string | null {
    if (!burnTxHash) return null;

    // In a full implementation, we would:
    // 1. Fetch the transaction receipt
    // 2. Parse the MessageSent event logs
    // 3. Extract the message hash from the event data
    //
    // For now, we use the burn tx hash as identifier
    // The Bridge Kit handles this internally during transfer
    return burnTxHash;
  }

  /**
   * Get all tracked transfers
   *
   * @returns List of transfer info
   */
  getTrackedTransfers(): TransferInfo[] {
    return Array.from(this.transfers.values());
  }

  /**
   * Update transfer status after mint completion
   *
   * @param transferId - Transfer ID
   * @param mintTxHash - Mint transaction hash
   */
  updateTransferCompleted(transferId: string, mintTxHash: string): void {
    const transfer = this.transfers.get(transferId);
    if (transfer) {
      transfer.status = 'completed';
      transfer.mintTxHash = mintTxHash;
      transfer.updatedAt = Date.now();
    }
  }

  /**
   * Get supported chains for bridging
   *
   * @returns List of supported chains
   */
  getSupportedChains(): ChainInfo[] {
    const isTestnet = this.client.network.name.includes('testnet');
    return Object.entries(CHAIN_INFO)
      .filter(([, info]) => info.isTestnet === isTestnet)
      .map(([, info]) => info);
  }

  /**
   * Check if a chain is supported
   *
   * @param chain - Chain to check
   * @returns Whether chain is supported
   */
  isChainSupported(chain: string): boolean {
    return chain in CHAIN_MAP;
  }

  /**
   * Get explorer URL for a transaction
   */
  private getExplorerUrl(chain: SupportedChain, txHash?: string): string | undefined {
    if (!txHash) return undefined;

    const explorers: Record<string, string> = {
      'arc-testnet': 'https://testnet.arcscan.app',
      'base-sepolia': 'https://sepolia.basescan.org',
      'sepolia': 'https://sepolia.etherscan.io',
      'arbitrum-sepolia': 'https://sepolia.arbiscan.io',
      'avalanche-fuji': 'https://testnet.snowtrace.io',
      'polygon-amoy': 'https://amoy.polygonscan.com',
    };

    const explorer = explorers[chain];
    return explorer ? `${explorer}/tx/${txHash}` : undefined;
  }

  /**
   * Register event handler
   */
  on(event: string, handler: (event: BridgeEvent) => void): void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.push(handler);
    this.eventHandlers.set(event, handlers);
  }

  /**
   * Emit event to handlers
   */
  private emit(event: string, data: BridgeEvent): void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach((handler) => handler(data));

    // Also emit to wildcard handlers
    const wildcardHandlers = this.eventHandlers.get('*') || [];
    wildcardHandlers.forEach((handler) => handler(data));
  }
}

export * from './types';
