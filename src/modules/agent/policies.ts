/**
 * Policy Engine - Spending rules enforcement for autonomous agents
 */

import { parseUnits, formatUnits } from 'viem';
import type { AgentPolicy, PolicyCheckResult } from './types';

const USDC_DECIMALS = 6;

/**
 * Policy engine for enforcing agent spending rules
 */
export class PolicyEngine {
  private policy: AgentPolicy;
  private dailySpent: bigint = 0n;
  private monthlySpent: bigint = 0n;
  private lastDailyReset: Date;
  private lastMonthlyReset: Date;

  constructor(policy: AgentPolicy) {
    this.policy = policy;
    this.lastDailyReset = new Date();
    this.lastMonthlyReset = new Date();
  }

  /**
   * Check if a payment is allowed by policies
   *
   * @param amount - Amount to pay
   * @param endpoint - Target endpoint
   * @returns Check result with allowed status and reason
   */
  checkPayment(amount: string, endpoint: string): PolicyCheckResult {
    this.resetIfNeeded();

    const amountWei = parseUnits(amount, USDC_DECIMALS);

    // Check per-transaction limit
    const maxPerTx = parseUnits(this.policy.maxPerTransaction, USDC_DECIMALS);
    if (amountWei > maxPerTx) {
      return {
        allowed: false,
        reason: `Amount ${amount} exceeds max per transaction ${this.policy.maxPerTransaction}`,
      };
    }

    // Check daily budget
    const dailyBudget = parseUnits(this.policy.dailyBudget, USDC_DECIMALS);
    if (this.dailySpent + amountWei > dailyBudget) {
      return {
        allowed: false,
        reason: `Would exceed daily budget. Spent: ${this.formatAmount(this.dailySpent)}, Limit: ${this.policy.dailyBudget}`,
      };
    }

    // Check monthly budget if set
    if (this.policy.monthlyBudget) {
      const monthlyBudget = parseUnits(this.policy.monthlyBudget, USDC_DECIMALS);
      if (this.monthlySpent + amountWei > monthlyBudget) {
        return {
          allowed: false,
          reason: `Would exceed monthly budget. Spent: ${this.formatAmount(this.monthlySpent)}, Limit: ${this.policy.monthlyBudget}`,
        };
      }
    }

    // Check endpoint whitelist
    if (this.policy.allowedEndpoints && this.policy.allowedEndpoints.length > 0) {
      const isAllowed = this.policy.allowedEndpoints.some((pattern) =>
        this.matchEndpoint(endpoint, pattern)
      );
      if (!isAllowed) {
        return { allowed: false, reason: `Endpoint ${endpoint} not in whitelist` };
      }
    }

    // Check endpoint blacklist
    if (this.policy.blockedEndpoints && this.policy.blockedEndpoints.length > 0) {
      const isBlocked = this.policy.blockedEndpoints.some((pattern) =>
        this.matchEndpoint(endpoint, pattern)
      );
      if (isBlocked) {
        return { allowed: false, reason: `Endpoint ${endpoint} is blocked` };
      }
    }

    // Check approval threshold
    if (this.policy.requireApproval) {
      const threshold = parseUnits(this.policy.requireApproval.above, USDC_DECIMALS);
      if (amountWei > threshold) {
        return {
          allowed: false,
          reason: `Amount ${amount} requires human approval (threshold: ${this.policy.requireApproval.above})`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Record a successful payment
   *
   * @param amount - Amount that was paid
   */
  recordPayment(amount: string): void {
    const amountWei = parseUnits(amount, USDC_DECIMALS);
    this.dailySpent += amountWei;
    this.monthlySpent += amountWei;
  }

  /**
   * Get remaining budgets
   *
   * @returns Remaining daily and monthly budgets
   */
  getRemainingBudgets(): { daily: string; monthly?: string } {
    this.resetIfNeeded();

    const dailyBudget = parseUnits(this.policy.dailyBudget, USDC_DECIMALS);
    const remainingDaily = dailyBudget - this.dailySpent;

    const result: { daily: string; monthly?: string } = {
      daily: this.formatAmount(remainingDaily > 0n ? remainingDaily : 0n),
    };

    if (this.policy.monthlyBudget) {
      const monthlyBudget = parseUnits(this.policy.monthlyBudget, USDC_DECIMALS);
      const remainingMonthly = monthlyBudget - this.monthlySpent;
      result.monthly = this.formatAmount(remainingMonthly > 0n ? remainingMonthly : 0n);
    }

    return result;
  }

  /**
   * Get current spending stats
   */
  getSpendingStats(): { dailySpent: string; monthlySpent: string } {
    this.resetIfNeeded();
    return {
      dailySpent: this.formatAmount(this.dailySpent),
      monthlySpent: this.formatAmount(this.monthlySpent),
    };
  }

  /**
   * Update policy rules
   */
  updatePolicy(policy: Partial<AgentPolicy>): void {
    this.policy = { ...this.policy, ...policy };
  }

  /**
   * Get current policy
   */
  getPolicy(): AgentPolicy {
    return { ...this.policy };
  }

  /**
   * Reset spending counters if day/month changed
   */
  private resetIfNeeded(): void {
    const now = new Date();

    // Reset daily at midnight
    if (now.getDate() !== this.lastDailyReset.getDate() ||
        now.getMonth() !== this.lastDailyReset.getMonth() ||
        now.getFullYear() !== this.lastDailyReset.getFullYear()) {
      this.dailySpent = 0n;
      this.lastDailyReset = now;
    }

    // Reset monthly on 1st
    if (now.getMonth() !== this.lastMonthlyReset.getMonth() ||
        now.getFullYear() !== this.lastMonthlyReset.getFullYear()) {
      this.monthlySpent = 0n;
      this.lastMonthlyReset = now;
    }
  }

  /**
   * Match endpoint against wildcard pattern
   */
  private matchEndpoint(endpoint: string, pattern: string): boolean {
    // Remove protocol for matching
    const cleanEndpoint = endpoint.replace(/^https?:\/\//, '');
    const cleanPattern = pattern.replace(/^https?:\/\//, '');

    // Convert wildcard pattern to regex
    const regexPattern = cleanPattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special chars except *
      .replace(/\*/g, '.*'); // Convert * to .*

    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(cleanEndpoint);
  }

  /**
   * Format wei amount to human-readable string
   */
  private formatAmount(wei: bigint): string {
    return formatUnits(wei, USDC_DECIMALS);
  }
}
