/**
 * ArcPay Split Payment Module
 *
 * Split payments between multiple recipients with equal, custom, or percentage-based amounts.
 *
 * @example
 * ```typescript
 * import { createSplitManager } from 'arcpay';
 *
 * const split = createSplitManager(arcPayClient);
 *
 * // Split equally between friends
 * const result = await split.split({
 *   total: '100',
 *   recipients: ['alice', 'bob', 'charlie']
 * });
 *
 * // Split with custom amounts
 * const result = await split.split({
 *   recipients: [
 *     { to: 'alice', amount: '50' },
 *     { to: 'bob', amount: '30' },
 *     { to: 'charlie', amount: '20' }
 *   ]
 * });
 *
 * // Split by percentage
 * const result = await split.split({
 *   total: '100',
 *   recipients: [
 *     { to: 'alice', percent: 50 },
 *     { to: 'bob', percent: 30 },
 *     { to: 'charlie', percent: 20 }
 *   ]
 * });
 * ```
 */

import type {
  SplitRecipient,
  SplitRecipientResult,
  SplitResult,
  SplitCalculation,
  SplitPaymentOptions,
  SplitManagerConfig,
} from './types';
import { ContactManager, createContactManager } from '../contacts';
import type { ArcPay } from '../../core/client';

// Re-export types
export type {
  SplitRecipient,
  SplitRecipientResult,
  SplitResult,
  SplitCalculation,
  SplitPaymentOptions,
  SplitManagerConfig,
};

/**
 * Generate unique split ID
 */
function generateSplitId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `split_${timestamp}_${random}`;
}

/**
 * Calculate equal split amounts
 *
 * @example
 * ```typescript
 * const result = calculateEqualSplit('100', 3);
 * // { perPerson: '33.33', remainder: '0.01' }
 * ```
 */
export function calculateEqualSplit(total: string, count: number): { perPerson: string; remainder: string } {
  const totalAmount = parseFloat(total);
  const perPerson = Math.floor((totalAmount / count) * 100) / 100;
  const remainder = totalAmount - (perPerson * count);

  return {
    perPerson: perPerson.toFixed(2),
    remainder: remainder.toFixed(2),
  };
}

/**
 * Calculate percentage-based split amounts
 *
 * @example
 * ```typescript
 * const amounts = calculatePercentSplit('100', [60, 40]);
 * // ['60.00', '40.00']
 * ```
 */
export function calculatePercentSplit(total: string, percentages: number[]): string[] {
  const totalAmount = parseFloat(total);
  return percentages.map(percent => ((percent / 100) * totalAmount).toFixed(2));
}

/**
 * Split Payment Manager
 *
 * Handles splitting payments between multiple recipients.
 */
export class SplitManager {
  private arcPay: ArcPay | null = null;
  private contactManager: ContactManager;
  private continueOnError: boolean;

  constructor(config: SplitManagerConfig = {}) {
    this.contactManager = createContactManager();
    this.continueOnError = config.continueOnError ?? true;
  }

  /**
   * Set the ArcPay client instance
   */
  setArcPay(client: ArcPay): void {
    this.arcPay = client;
  }

  /**
   * Set the contact manager to use
   */
  setContactManager(manager: ContactManager): void {
    this.contactManager = manager;
  }

  /**
   * Calculate split amounts without executing
   *
   * @example
   * ```typescript
   * const calc = await split.calculate({
   *   total: '100',
   *   recipients: ['alice', 'bob', 'charlie']
   * });
   * console.log(calc.recipients);
   * // [{ to: 'alice', address: '0x...', amount: '33.33' }, ...]
   * ```
   */
  async calculate(options: SplitPaymentOptions): Promise<SplitCalculation> {
    const recipients = this.normalizeRecipients(options.recipients);
    const resolvedRecipients: Array<{ to: string; address: string; amount: string }> = [];
    let calculatedTotal = 0;

    // If we have a total and simple string array, split equally
    if (options.total && this.isSimpleRecipientList(options.recipients)) {
      const perPerson = parseFloat(options.total) / recipients.length;
      const perPersonStr = perPerson.toFixed(2);

      for (const recipient of recipients) {
        const address = await this.resolveAddress(recipient.to);
        if (!address) {
          throw new Error(`Could not resolve address for "${recipient.to}"`);
        }
        resolvedRecipients.push({
          to: recipient.to,
          address,
          amount: perPersonStr,
        });
        calculatedTotal += perPerson;
      }
    } else {
      // Calculate amounts based on fixed amounts or percentages
      const total = options.total ? parseFloat(options.total) : 0;

      for (const recipient of recipients) {
        const address = await this.resolveAddress(recipient.to);
        if (!address) {
          throw new Error(`Could not resolve address for "${recipient.to}"`);
        }

        let amount: string;
        if (recipient.amount) {
          amount = recipient.amount;
        } else if (recipient.percent !== undefined && total > 0) {
          amount = ((recipient.percent / 100) * total).toFixed(2);
        } else {
          throw new Error(`Recipient "${recipient.to}" has no amount or percent specified`);
        }

        resolvedRecipients.push({
          to: recipient.to,
          address,
          amount,
        });
        calculatedTotal += parseFloat(amount);
      }
    }

    return {
      recipients: resolvedRecipients,
      total: calculatedTotal.toFixed(2),
    };
  }

  /**
   * Split a payment between multiple recipients
   *
   * @example
   * ```typescript
   * // Split $100 equally between 3 friends
   * const result = await split.split({
   *   total: '100',
   *   recipients: ['alice', 'bob', 'charlie']
   * });
   *
   * // Split with custom amounts
   * const result = await split.split({
   *   recipients: [
   *     { to: 'alice', amount: '50' },
   *     { to: 'bob', amount: '30' }
   *   ]
   * });
   * ```
   */
  async split(options: SplitPaymentOptions): Promise<SplitResult> {
    if (!this.arcPay) {
      throw new Error('ArcPay client not set. Call setArcPay() first.');
    }

    const calculation = await this.calculate(options);
    const results: SplitRecipientResult[] = [];
    let successCount = 0;
    let failedCount = 0;
    const continueOnError = options.continueOnError ?? this.continueOnError;

    for (const recipient of calculation.recipients) {
      try {
        const txResult = await this.arcPay.sendUSDC(recipient.address, recipient.amount);

        if (txResult.success && txResult.txHash) {
          results.push({
            name: recipient.to,
            address: recipient.address,
            amount: recipient.amount,
            txHash: txResult.txHash,
            status: 'success',
          });
          successCount++;
        } else {
          results.push({
            name: recipient.to,
            address: recipient.address,
            amount: recipient.amount,
            txHash: '',
            status: 'failed',
            error: txResult.error || 'Transaction failed',
          });
          failedCount++;

          if (!continueOnError) {
            break;
          }
        }
      } catch (error) {
        results.push({
          name: recipient.to,
          address: recipient.address,
          amount: recipient.amount,
          txHash: '',
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        failedCount++;

        if (!continueOnError) {
          break;
        }
      }
    }

    return {
      id: generateSplitId(),
      total: calculation.total,
      recipients: results,
      successCount,
      failedCount,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Preview a split without executing payments
   *
   * @example
   * ```typescript
   * const preview = await split.preview('100', ['alice', 'bob', 'charlie']);
   * console.log(preview.perPerson); // '33.33'
   * ```
   */
  async preview(
    total: string,
    recipients: string[]
  ): Promise<{ total: string; perPerson: string; recipients: Array<{ to: string; address: string; amount: string }> }> {
    if (recipients.length < 2) {
      throw new Error('At least 2 recipients required for split');
    }

    const calculation = await this.calculate({ total, recipients });
    const perPerson = (parseFloat(total) / recipients.length).toFixed(2);

    return {
      total,
      perPerson,
      recipients: calculation.recipients,
    };
  }

  /**
   * Split equally between recipients
   *
   * @example
   * ```typescript
   * const result = await split.equal('100', ['alice', 'bob', 'charlie']);
   * ```
   */
  async equal(total: string, recipients: string[]): Promise<SplitResult> {
    if (recipients.length < 2) {
      throw new Error('At least 2 recipients required for split');
    }
    return this.split({ total, recipients });
  }

  /**
   * Split with custom amounts
   *
   * @example
   * ```typescript
   * const result = await split.custom([
   *   { to: 'alice', amount: '50' },
   *   { to: 'bob', amount: '30' }
   * ]);
   * ```
   */
  async custom(recipients: SplitRecipient[]): Promise<SplitResult> {
    return this.split({ recipients });
  }

  /**
   * Split by percentage
   *
   * @example
   * ```typescript
   * const result = await split.byPercent('100', [
   *   { to: 'alice', percent: 50 },
   *   { to: 'bob', percent: 30 },
   *   { to: 'charlie', percent: 20 }
   * ]);
   * ```
   */
  async byPercent(
    total: string,
    recipients: Array<{ to: string; percent: number }>
  ): Promise<SplitResult> {
    if (!this.validatePercentages(recipients)) {
      throw new Error('Percentages must sum to 100');
    }
    return this.split({ total, recipients });
  }

  /**
   * Validate that percentages sum to 100
   */
  validatePercentages(recipients: Array<{ percent: number }>): boolean {
    const sum = recipients.reduce((acc, r) => acc + r.percent, 0);
    return Math.abs(sum - 100) < 0.01; // Allow small floating point variance
  }

  // ========== Private Helpers ==========

  private normalizeRecipients(
    recipients: string[] | SplitRecipient[]
  ): SplitRecipient[] {
    if (this.isSimpleRecipientList(recipients)) {
      return (recipients as string[]).map((to) => ({ to }));
    }
    return recipients as SplitRecipient[];
  }

  private isSimpleRecipientList(
    recipients: string[] | SplitRecipient[]
  ): recipients is string[] {
    return recipients.length > 0 && typeof recipients[0] === 'string';
  }

  private async resolveAddress(nameOrAddress: string): Promise<string | undefined> {
    // If it's already an address, return it
    if (/^0x[a-fA-F0-9]{40}$/.test(nameOrAddress)) {
      return nameOrAddress.toLowerCase();
    }

    // Try to resolve from contacts
    return this.contactManager.resolve(nameOrAddress);
  }
}

/**
 * Create a split manager instance
 */
export function createSplitManager(
  arcPay?: ArcPay,
  config?: SplitManagerConfig
): SplitManager {
  const manager = new SplitManager(config);
  if (arcPay) {
    manager.setArcPay(arcPay);
  }
  return manager;
}

/**
 * One-liner: Split payment equally
 *
 * @example
 * ```typescript
 * const result = await splitPayment('100', ['alice', 'bob', 'charlie']);
 * ```
 */
export async function splitPayment(
  arcPay: ArcPay,
  total: string,
  recipients: string[]
): Promise<SplitResult> {
  const manager = createSplitManager(arcPay);
  return manager.equal(total, recipients);
}

/**
 * One-liner: Split with custom amounts
 *
 * @example
 * ```typescript
 * const result = await splitCustom([
 *   { to: 'alice', amount: '50' },
 *   { to: 'bob', amount: '30' }
 * ]);
 * ```
 */
export async function splitCustom(
  arcPay: ArcPay,
  recipients: SplitRecipient[]
): Promise<SplitResult> {
  const manager = createSplitManager(arcPay);
  return manager.custom(recipients);
}

export default SplitManager;
