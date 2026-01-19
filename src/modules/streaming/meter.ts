/**
 * Usage Meter - Tracks streaming usage and billing
 */

import type { StreamConfig, StreamSession, SettlementRecord } from './types';

/**
 * Usage meter for tracking stream consumption
 */
export class UsageMeter {
  private session: StreamSession;
  private config: StreamConfig;
  private unsettledUnits: number = 0;
  private unsettledAmount: number = 0;

  constructor(sessionId: string, config: StreamConfig) {
    this.config = config;
    this.session = {
      id: sessionId,
      endpoint: config.endpoint,
      status: 'active',
      startedAt: new Date().toISOString(),
      usage: { units: 0, unitType: config.rate.per },
      billing: {
        accrued: '0',
        settled: '0',
        total: '0',
        remaining: config.budget.max,
      },
      settlements: [],
    };
  }

  /**
   * Record usage of units
   *
   * @param units - Number of units consumed
   * @returns Whether to settle and if budget exhausted
   */
  recordUsage(units: number): { shouldSettle: boolean; exhausted: boolean } {
    const rateAmount = parseFloat(this.config.rate.amount);
    const cost = units * rateAmount;

    this.session.usage.units += units;
    this.unsettledUnits += units;
    this.unsettledAmount += cost;

    // Update billing
    const accrued = this.unsettledAmount;
    const settled = parseFloat(this.session.billing.settled);
    const total = accrued + settled;
    const max = parseFloat(this.config.budget.max);

    this.session.billing.accrued = accrued.toFixed(6);
    this.session.billing.total = total.toFixed(6);
    this.session.billing.remaining = Math.max(0, max - total).toFixed(6);

    // Check if should settle
    const minSettlement = parseFloat(
      this.config.options?.minSettlementAmount || '0.01'
    );
    const shouldSettle = this.unsettledAmount >= minSettlement;

    // Check if exhausted
    const exhausted = total >= max;
    if (exhausted) {
      this.session.status = 'exhausted';
    }

    return { shouldSettle, exhausted };
  }

  /**
   * Record a settlement
   *
   * @param txHash - Transaction hash
   * @returns Settlement record
   */
  recordSettlement(txHash: string): SettlementRecord {
    const record: SettlementRecord = {
      timestamp: new Date().toISOString(),
      amount: this.unsettledAmount.toFixed(6),
      txHash,
      units: this.unsettledUnits,
    };

    // Update session
    this.session.settlements.push(record);
    this.session.billing.settled = (
      parseFloat(this.session.billing.settled) + this.unsettledAmount
    ).toFixed(6);
    this.session.billing.accrued = '0';

    // Reset unsettled
    this.unsettledUnits = 0;
    this.unsettledAmount = 0;

    return record;
  }

  /**
   * Get amount pending settlement
   */
  getPendingAmount(): string {
    return this.unsettledAmount.toFixed(6);
  }

  /**
   * Get pending units count
   */
  getPendingUnits(): number {
    return this.unsettledUnits;
  }

  /**
   * Get current session state
   */
  getSession(): StreamSession {
    return { ...this.session };
  }

  /**
   * Check if warning threshold reached
   */
  checkWarning(): boolean {
    if (!this.config.budget.warningAt) return false;
    const total = parseFloat(this.session.billing.total);
    const warning = parseFloat(this.config.budget.warningAt);
    return total >= warning;
  }

  /**
   * Check if a specific warning amount was just crossed
   */
  justCrossedWarning(): boolean {
    if (!this.config.budget.warningAt) return false;
    const warning = parseFloat(this.config.budget.warningAt);
    const previousTotal =
      parseFloat(this.session.billing.total) - this.unsettledAmount;
    const currentTotal = parseFloat(this.session.billing.total);
    return previousTotal < warning && currentTotal >= warning;
  }

  /**
   * Update session status
   */
  setStatus(status: StreamSession['status']): void {
    this.session.status = status;
  }

  /**
   * Get budget utilization percentage
   */
  getUtilization(): number {
    const total = parseFloat(this.session.billing.total);
    const max = parseFloat(this.config.budget.max);
    return max > 0 ? (total / max) * 100 : 0;
  }
}
