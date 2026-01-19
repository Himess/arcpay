/**
 * Stream Settlement - Handles micro-batch settlements
 */

import type { WalletClient } from 'viem';
import type { SettlementRecord } from './types';

const USDC_ADDRESS = '0x3600000000000000000000000000000000000000';
const USDC_DECIMALS = 6;

const ERC20_TRANSFER_ABI = [
  {
    name: 'transfer',
    type: 'function',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const;

interface PendingSettlement {
  amount: string;
  resolve: (record: SettlementRecord) => void;
  reject: (error: Error) => void;
}

/**
 * Stream settlement handler
 *
 * Batches small settlements to reduce transaction costs.
 */
export class StreamSettlement {
  private wallet: WalletClient;
  private recipientAddress: string;
  private pendingSettlements: PendingSettlement[] = [];
  private isProcessing: boolean = false;

  constructor(wallet: WalletClient, recipientAddress: string) {
    this.wallet = wallet;
    this.recipientAddress = recipientAddress;
  }

  /**
   * Queue a settlement
   *
   * @param amount - Amount to settle
   * @returns Settlement record promise
   */
  async settle(amount: string): Promise<SettlementRecord> {
    return new Promise((resolve, reject) => {
      this.pendingSettlements.push({ amount, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Process settlement queue (batches small settlements)
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.pendingSettlements.length === 0) return;

    this.isProcessing = true;

    try {
      // Batch all pending settlements
      const batch = [...this.pendingSettlements];
      this.pendingSettlements = [];

      const totalAmount = batch.reduce((sum, s) => sum + parseFloat(s.amount), 0);

      // Execute single transaction for batch
      const txHash = await this.executeTransfer(totalAmount.toFixed(6));

      // Create settlement record
      const record: SettlementRecord = {
        timestamp: new Date().toISOString(),
        amount: totalAmount.toFixed(6),
        txHash,
        units: 0, // Will be set by meter
      };

      // Resolve all promises
      batch.forEach((s) => s.resolve(record));
    } catch (error) {
      // On error, reject all pending
      const batch = [...this.pendingSettlements];
      this.pendingSettlements = [];
      batch.forEach((s) =>
        s.reject(error instanceof Error ? error : new Error('Settlement failed'))
      );
    } finally {
      this.isProcessing = false;

      // Process any new items that came in
      if (this.pendingSettlements.length > 0) {
        setTimeout(() => this.processQueue(), 100);
      }
    }
  }

  /**
   * Execute USDC transfer
   */
  private async executeTransfer(amount: string): Promise<string> {
    // Convert to wei (USDC has 6 decimals)
    const amountWei = BigInt(Math.floor(parseFloat(amount) * 10 ** USDC_DECIMALS));

    // Type assertion for wallet with writeContract
    const walletWithWrite = this.wallet as WalletClient & {
      writeContract: (args: {
        address: `0x${string}`;
        abi: typeof ERC20_TRANSFER_ABI;
        functionName: 'transfer';
        args: [`0x${string}`, bigint];
      }) => Promise<`0x${string}`>;
    };

    // ERC20 transfer
    const hash = await walletWithWrite.writeContract({
      address: USDC_ADDRESS as `0x${string}`,
      abi: ERC20_TRANSFER_ABI,
      functionName: 'transfer',
      args: [this.recipientAddress as `0x${string}`, amountWei],
    });

    return hash;
  }

  /**
   * Force settle any remaining amount
   */
  async flush(): Promise<SettlementRecord | null> {
    if (this.pendingSettlements.length === 0 && !this.isProcessing) {
      return null;
    }

    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!this.isProcessing && this.pendingSettlements.length === 0) {
          clearInterval(checkInterval);
          resolve(null);
        }
      }, 100);

      // Trigger processing
      this.processQueue();
    });
  }

  /**
   * Get pending settlement count
   */
  getPendingCount(): number {
    return this.pendingSettlements.length;
  }

  /**
   * Check if currently processing
   */
  isSettling(): boolean {
    return this.isProcessing;
  }
}
