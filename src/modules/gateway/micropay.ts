/**
 * Gateway Micropayments - Unified balance micropayment support
 *
 * Enables micropayments using Gateway's unified balance,
 * with automatic source chain selection and optional batched settlement.
 */

import type { GatewayModule } from './index';
import type { GatewayDomain, UnifiedBalance } from './types';

/**
 * Micropayment options
 */
export interface MicropayOptions {
  /** Target address to pay */
  to: string;
  /** Maximum payment amount in USDC */
  maxAmount: string;
  /** Preferred source chain (auto-selected if not specified) */
  sourceChain?: GatewayDomain;
  /** Settlement mode: immediate or batched */
  settlement?: 'immediate' | 'batched';
}

/**
 * Micropayment result
 */
export interface MicropayResult {
  success: boolean;
  /** Amount paid in USDC */
  amount?: string;
  /** Transaction hash */
  txHash?: string;
  /** Source chain used for payment */
  sourceChain?: string;
  /** Settlement mode used */
  settlementMode?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Cross-chain payment options
 */
export interface CrosschainPayOptions {
  /** Source chain */
  from: GatewayDomain;
  /** Destination chain */
  to: GatewayDomain;
  /** Recipient address on destination chain */
  recipient: string;
  /** Amount in USDC */
  amount: string;
  /** Optional purpose/memo */
  purpose?: string;
}

/**
 * Cross-chain payment result
 */
export interface CrosschainPayResult {
  success: boolean;
  /** Transaction hash on source chain */
  sourceTxHash?: string;
  /** Transaction hash on destination chain (if completed) */
  destinationTxHash?: string;
  /** Attestation for minting */
  attestation?: string;
  /** Estimated arrival time */
  estimatedArrival?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Gateway Micropayments handler
 *
 * Provides micropayment functionality using Gateway's unified balance.
 */
export class GatewayMicropay {
  private gateway: GatewayModule;

  constructor(gateway: GatewayModule) {
    this.gateway = gateway;
  }

  /**
   * Make a micropayment using Gateway unified balance
   *
   * Automatically selects the best source chain if not specified.
   *
   * @param options - Micropayment options
   * @returns Micropayment result
   */
  async pay(options: MicropayOptions): Promise<MicropayResult> {
    try {
      // Get unified balance
      const balance = await this.gateway.getUnifiedBalance();

      if (
        !balance.available ||
        parseFloat(balance.available) < parseFloat(options.maxAmount)
      ) {
        return {
          success: false,
          error: `Insufficient unified balance: ${balance.available || '0'} USDC`,
        };
      }

      // Select source chain
      const sourceChain =
        options.sourceChain || this.selectBestSourceChain(balance);

      // For batched settlement, queue the transaction
      if (options.settlement === 'batched') {
        return this.queueBatchedPayment(options, sourceChain);
      }

      // Immediate settlement via Gateway withdrawal
      const result = await this.gateway.withdraw({
        chain: sourceChain as GatewayDomain,
        amount: options.maxAmount,
        recipient: options.to,
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Micropayment failed',
        };
      }

      return {
        success: true,
        amount: options.maxAmount,
        txHash: result.initTxHash,
        sourceChain,
        settlementMode: 'immediate',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Micropay failed',
      };
    }
  }

  /**
   * Make a cross-chain micropayment
   *
   * @param options - Cross-chain payment options
   * @returns Cross-chain payment result
   */
  async crosschainPay(
    options: CrosschainPayOptions
  ): Promise<CrosschainPayResult> {
    try {
      // Use Gateway for cross-chain transfer
      const result = await this.gateway.withdraw({
        chain: options.to,
        amount: options.amount,
        recipient: options.recipient,
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Cross-chain payment failed',
        };
      }

      return {
        success: true,
        sourceTxHash: result.initTxHash,
        attestation: result.attestation,
        estimatedArrival: this.estimateArrival(options.from, options.to),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Crosschain pay failed',
      };
    }
  }

  /**
   * Queue payment for batched settlement (lower fees)
   *
   * Note: Batched settlement is a planned Gateway feature.
   * Currently simulates with immediate settlement.
   */
  private async queueBatchedPayment(
    options: MicropayOptions,
    sourceChain: string
  ): Promise<MicropayResult> {
    // Batched settlement not yet available on Gateway
    // Using immediate settlement with flag
    console.warn(
      '[GatewayMicropay] Batched settlement not yet available, using immediate'
    );

    const result = await this.gateway.withdraw({
      chain: sourceChain as GatewayDomain,
      amount: options.maxAmount,
      recipient: options.to,
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Batched payment failed',
      };
    }

    return {
      success: true,
      amount: options.maxAmount,
      txHash: result.initTxHash,
      sourceChain,
      settlementMode: 'batched_simulated',
    };
  }

  /**
   * Select the best source chain for payment
   *
   * Prefers Arc testnet if available, otherwise picks chain with highest balance.
   */
  private selectBestSourceChain(balance: UnifiedBalance): string {
    const chainBalances = balance.byChain;

    // Prefer Arc testnet if has balance
    if (chainBalances['arcTestnet'] && parseFloat(chainBalances['arcTestnet']) > 0) {
      return 'arcTestnet';
    }

    if (chainBalances['arc'] && parseFloat(chainBalances['arc']) > 0) {
      return 'arc';
    }

    // Otherwise pick chain with highest balance
    let bestChain = 'arcTestnet';
    let maxBalance = 0;

    for (const [chain, balanceStr] of Object.entries(chainBalances)) {
      const bal = parseFloat(balanceStr);
      if (bal > maxBalance) {
        maxBalance = bal;
        bestChain = chain;
      }
    }

    return bestChain;
  }

  /**
   * Estimate arrival time for cross-chain transfers
   */
  private estimateArrival(from: GatewayDomain, to: GatewayDomain): string {
    // Estimated finality times in minutes
    const times: Record<string, number> = {
      ethereum: 20,
      sepolia: 20,
      avalanche: 1,
      avalancheFuji: 1,
      base: 2,
      baseSepolia: 2,
      arc: 1,
      arcTestnet: 1,
    };

    const fromTime = times[from] || 5;
    const toTime = times[to] || 5;
    const total = fromTime + toTime;

    return `~${total} minutes`;
  }
}
