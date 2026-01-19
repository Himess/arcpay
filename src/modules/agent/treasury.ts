/**
 * Treasury Manager - Transaction tracking and budget management
 */

import type { TransactionRecord, TreasuryStats } from './types';

/**
 * Treasury manager for tracking agent spending
 */
export class TreasuryManager {
  private transactions: TransactionRecord[] = [];
  private dailySpent: number = 0;
  private monthlySpent: number = 0;
  private lastDailyReset: Date;
  private lastMonthlyReset: Date;

  constructor() {
    this.lastDailyReset = new Date();
    this.lastMonthlyReset = new Date();
  }

  /**
   * Record a new transaction
   *
   * @param record - Transaction details (without id)
   * @returns Generated transaction ID
   */
  recordTransaction(record: Omit<TransactionRecord, 'id'>): string {
    const id = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const transaction: TransactionRecord = { ...record, id };

    this.transactions.push(transaction);

    if (record.status === 'settled') {
      const amount = parseFloat(record.amount);
      this.dailySpent += amount;
      this.monthlySpent += amount;
    }

    return id;
  }

  /**
   * Update an existing transaction
   *
   * @param id - Transaction ID
   * @param updates - Fields to update
   */
  updateTransaction(id: string, updates: Partial<TransactionRecord>): void {
    const tx = this.transactions.find((t) => t.id === id);
    if (tx) {
      // If status changed to settled, update spending
      if (updates.status === 'settled' && tx.status !== 'settled') {
        const amount = parseFloat(updates.amount || tx.amount);
        this.dailySpent += amount;
        this.monthlySpent += amount;
      }

      Object.assign(tx, updates);
    }
  }

  /**
   * Get a specific transaction
   *
   * @param id - Transaction ID
   * @returns Transaction record or undefined
   */
  getTransaction(id: string): TransactionRecord | undefined {
    return this.transactions.find((t) => t.id === id);
  }

  /**
   * Get treasury statistics
   *
   * @param dailyBudget - Daily budget limit
   * @param monthlyBudget - Monthly budget limit (optional)
   * @returns Treasury stats
   */
  getStats(dailyBudget: string, monthlyBudget?: string): TreasuryStats {
    this.resetIfNeeded();

    const totalSpent = this.transactions
      .filter((t) => t.status === 'settled')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    return {
      totalSpent: totalSpent.toFixed(2),
      dailySpent: this.dailySpent.toFixed(2),
      monthlySpent: this.monthlySpent.toFixed(2),
      remainingDailyBudget: Math.max(0, parseFloat(dailyBudget) - this.dailySpent).toFixed(2),
      remainingMonthlyBudget: monthlyBudget
        ? Math.max(0, parseFloat(monthlyBudget) - this.monthlySpent).toFixed(2)
        : undefined,
      transactionHistory: [...this.transactions].reverse().slice(0, 100),
    };
  }

  /**
   * Get recent transactions
   *
   * @param limit - Maximum number of transactions to return
   * @returns Recent transactions (newest first)
   */
  getRecentTransactions(limit: number = 10): TransactionRecord[] {
    return [...this.transactions].reverse().slice(0, limit);
  }

  /**
   * Get transactions by status
   *
   * @param status - Transaction status filter
   * @returns Filtered transactions
   */
  getTransactionsByStatus(status: TransactionRecord['status']): TransactionRecord[] {
    return this.transactions.filter((t) => t.status === status);
  }

  /**
   * Get pending transactions count
   */
  getPendingCount(): number {
    return this.transactions.filter((t) => t.status === 'pending').length;
  }

  /**
   * Clear old transaction history (keep last N)
   *
   * @param keep - Number of transactions to keep
   */
  pruneHistory(keep: number = 1000): void {
    if (this.transactions.length > keep) {
      this.transactions = this.transactions.slice(-keep);
    }
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
      this.dailySpent = 0;
      this.lastDailyReset = now;
    }

    // Reset monthly on 1st
    if (now.getMonth() !== this.lastMonthlyReset.getMonth() ||
        now.getFullYear() !== this.lastMonthlyReset.getFullYear()) {
      this.monthlySpent = 0;
      this.lastMonthlyReset = now;
    }
  }
}
