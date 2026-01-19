import { formatUnits, parseUnits } from 'viem';
import type { ArcPay } from '../../core/client';
import type { SponsorRequest, SponsorResult, SpendingRules, UserSpendingStats } from './types';
import { getTxUrl } from '../../utils/explorer';
import { USDC_DECIMALS } from '../../utils/constants';
import type { Address, Hex } from '../../core/types';

/**
 * Gas sponsor for sponsoring user transactions
 *
 * On Arc, USDC is the native gas token, so sponsorship means
 * the sponsor pays the USDC gas fees on behalf of users.
 */
export class GasSponsor {
  private client: ArcPay;
  private rules: SpendingRules;
  private dailySpending: Map<string, number> = new Map();
  private dailyResetTime: number = Date.now();
  private totalSponsored: number = 0;
  private transactionCount: number = 0;

  constructor(client: ArcPay, rules: SpendingRules = {}) {
    this.client = client;
    this.rules = rules;
  }

  /**
   * Update spending rules
   */
  setRules(rules: SpendingRules): void {
    this.rules = { ...this.rules, ...rules };
  }

  /**
   * Get current spending rules
   */
  getRules(): SpendingRules {
    return { ...this.rules };
  }

  /**
   * Sponsor a user's transaction
   *
   * This executes the transaction on behalf of the user,
   * paying the gas fees from the sponsor's wallet.
   */
  async sponsor(request: SponsorRequest): Promise<SponsorResult> {
    if (!this.client.hasSigner()) {
      return { success: false, error: 'Signer required for sponsorship' };
    }

    // Reset daily spending if needed
    this.checkDailyReset();

    // Validate against rules
    const validationError = this.validateRequest(request);
    if (validationError) {
      return { success: false, error: validationError };
    }

    try {
      // Estimate gas cost
      const gasEstimate = await this.client.publicClient.estimateGas({
        account: this.client.address,
        to: request.to as Address,
        data: request.data as Hex,
        value: request.value ? parseUnits(request.value, USDC_DECIMALS) : 0n,
      });

      const gasPrice = await this.client.publicClient.getGasPrice();
      const gasCost = gasEstimate * gasPrice;
      const gasCostUsdc = formatUnits(gasCost, 18); // Native USDC uses 18 decimals for gas

      // Check per-transaction limit
      if (this.rules.maxPerTransaction) {
        const limit = parseFloat(this.rules.maxPerTransaction);
        if (parseFloat(gasCostUsdc) > limit) {
          return {
            success: false,
            error: `Gas cost ${gasCostUsdc} exceeds max per transaction ${this.rules.maxPerTransaction}`,
          };
        }
      }

      // Check daily budget
      if (this.rules.dailyBudget) {
        const budget = parseFloat(this.rules.dailyBudget);
        const totalAfter = this.totalSponsored + parseFloat(gasCostUsdc);
        if (totalAfter > budget) {
          return {
            success: false,
            error: 'Daily budget exceeded',
          };
        }
      }

      // Send sponsored transaction
      const hash = await this.client.walletClient!.sendTransaction({
        to: request.to as Address,
        data: request.data as Hex,
        value: request.value ? parseUnits(request.value, USDC_DECIMALS) : 0n,
        gas: gasEstimate,
      });

      // Wait for confirmation
      await this.client.publicClient.waitForTransactionReceipt({ hash });

      // Track spending
      this.trackSpending(request.userAddress, parseFloat(gasCostUsdc));

      return {
        success: true,
        txHash: hash,
        sponsoredAmount: gasCostUsdc,
        explorerUrl: getTxUrl(this.client.network, hash),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validate request against spending rules
   */
  private validateRequest(request: SponsorRequest): string | null {
    // Check contract whitelist
    if (this.rules.allowedContracts?.length) {
      const allowed = this.rules.allowedContracts.map((a) => a.toLowerCase());
      if (!allowed.includes(request.to.toLowerCase())) {
        return 'Contract not in whitelist';
      }
    }

    // Check method whitelist
    if (this.rules.allowedMethods?.length) {
      const methodSelector = request.data.slice(0, 10).toLowerCase();
      const allowed = this.rules.allowedMethods.map((m) => m.toLowerCase());
      if (!allowed.includes(methodSelector)) {
        return 'Method not in whitelist';
      }
    }

    // Check daily limit per user
    if (this.rules.maxPerUserDaily) {
      const addr = request.userAddress.toLowerCase();
      const spent = this.dailySpending.get(addr) || 0;
      const limit = parseFloat(this.rules.maxPerUserDaily);
      if (spent >= limit) {
        return 'Daily spending limit reached for user';
      }
    }

    return null;
  }

  /**
   * Track spending for a user
   */
  private trackSpending(userAddress: string, amount: number): void {
    const addr = userAddress.toLowerCase();
    const current = this.dailySpending.get(addr) || 0;
    this.dailySpending.set(addr, current + amount);
    this.totalSponsored += amount;
    this.transactionCount++;
  }

  /**
   * Check and reset daily spending if needed
   */
  private checkDailyReset(): void {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    if (now - this.dailyResetTime > oneDayMs) {
      this.dailySpending.clear();
      this.totalSponsored = 0;
      this.transactionCount = 0;
      this.dailyResetTime = now;
    }
  }

  /**
   * Manually reset daily limits
   */
  resetDailyLimits(): void {
    this.dailySpending.clear();
    this.totalSponsored = 0;
    this.transactionCount = 0;
    this.dailyResetTime = Date.now();
  }

  /**
   * Get spending stats for a user
   */
  getUserStats(address: string): UserSpendingStats {
    const addr = address.toLowerCase();
    return {
      address: addr,
      dailySpent: (this.dailySpending.get(addr) || 0).toFixed(6),
      transactionCount: 0, // Would need separate tracking
    };
  }

  /**
   * Get overall paymaster stats
   */
  getStats(): { totalSponsored: string; transactionCount: number; uniqueUsers: number } {
    return {
      totalSponsored: this.totalSponsored.toFixed(6),
      transactionCount: this.transactionCount,
      uniqueUsers: this.dailySpending.size,
    };
  }
}
