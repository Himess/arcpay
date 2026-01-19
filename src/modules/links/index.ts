/**
 * ArcPay Payment Links Module
 *
 * Create shareable payment links that anyone can pay.
 *
 * @example
 * ```typescript
 * import { createLinkManager } from 'arcpay';
 *
 * const links = createLinkManager(arcPayClient);
 *
 * // Create a payment link
 * const link = await links.create({
 *   amount: '50',
 *   description: 'Dinner split'
 * });
 * console.log(link.url); // arcpay://pay/link_abc123
 *
 * // Pay a link
 * const result = await links.pay('link_abc123');
 *
 * // List all links
 * const allLinks = await links.list();
 * ```
 */

import type {
  PaymentLink,
  PaymentLinkStatus,
  LinkPayment,
  CreateLinkOptions,
  ListLinksOptions,
  LinkManagerConfig,
} from './types';
import { createStorage } from '../contacts/storage';
import type { StorageAdapter } from '../contacts/types';
import type { ArcPay } from '../../core/client';

// Re-export types
export type {
  PaymentLink,
  PaymentLinkStatus,
  LinkPayment,
  CreateLinkOptions,
  ListLinksOptions,
  LinkManagerConfig,
};

const LINKS_KEY = 'payment_links';

/**
 * Generate unique link ID
 */
function generateLinkId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `link_${timestamp}_${random}`;
}

/**
 * Parse expiration string to date
 */
function parseExpiration(expiresIn: string): Date {
  const now = new Date();
  const match = expiresIn.match(/^(\d+)([hdwm])$/);

  if (!match) {
    throw new Error(`Invalid expiration format: ${expiresIn}. Use format like '24h', '7d', '4w', '1m'`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'h':
      now.setHours(now.getHours() + value);
      break;
    case 'd':
      now.setDate(now.getDate() + value);
      break;
    case 'w':
      now.setDate(now.getDate() + value * 7);
      break;
    case 'm':
      now.setMonth(now.getMonth() + value);
      break;
  }

  return now;
}

/**
 * Payment Link Manager
 *
 * Manages shareable payment links with persistence.
 */
export class PaymentLinkManager {
  private arcPay: ArcPay | null = null;
  private storage: StorageAdapter;
  private links: Map<string, PaymentLink> = new Map();
  private loaded: boolean = false;
  private baseUrl: string;

  constructor(config: LinkManagerConfig = {}) {
    const prefix = config.storagePrefix ?? 'arcpay_links_';
    this.storage = createStorage({ prefix });
    this.baseUrl = config.baseUrl ?? 'arcpay://pay';
  }

  /**
   * Set the ArcPay client instance
   */
  setArcPay(client: ArcPay): void {
    this.arcPay = client;
  }

  /**
   * Ensure links are loaded from storage
   */
  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;

    const data = await this.storage.get(LINKS_KEY);
    if (data) {
      try {
        const parsed = JSON.parse(data) as PaymentLink[];
        for (const link of parsed) {
          this.links.set(link.id, link);
        }
      } catch {
        // Ignore parse errors
      }
    }

    this.loaded = true;
  }

  /**
   * Save links to storage
   */
  private async save(): Promise<void> {
    const data = Array.from(this.links.values());
    await this.storage.set(LINKS_KEY, JSON.stringify(data));
  }

  /**
   * Update link statuses (check for expiration)
   */
  private updateStatuses(): void {
    const now = new Date();

    for (const link of this.links.values()) {
      if (link.status === 'active') {
        // Check expiration
        if (link.expiresAt && new Date(link.expiresAt) < now) {
          link.status = 'expired';
        }
        // Check max uses
        if (link.maxUses !== undefined && link.usedCount >= link.maxUses) {
          link.status = 'paid';
        }
      }
    }
  }

  /**
   * Create a new payment link
   *
   * @example
   * ```typescript
   * const link = await links.create({
   *   amount: '50',
   *   description: 'Dinner split',
   *   expiresIn: '7d',
   *   maxUses: 1
   * });
   * ```
   */
  async create(options: CreateLinkOptions = {}): Promise<PaymentLink> {
    await this.ensureLoaded();

    if (!this.arcPay) {
      throw new Error('ArcPay client not set. Call setArcPay() first.');
    }

    const id = generateLinkId();
    const recipient = options.recipient ?? this.arcPay.address;

    if (!recipient) {
      throw new Error('No recipient specified and no signer available');
    }

    const link: PaymentLink = {
      id,
      url: `${this.baseUrl}/${id}`,
      amount: options.amount,
      recipient,
      description: options.description,
      expiresAt: options.expiresIn ? parseExpiration(options.expiresIn).toISOString() : undefined,
      maxUses: options.maxUses,
      usedCount: 0,
      status: 'active',
      payments: [],
      createdAt: new Date().toISOString(),
    };

    this.links.set(id, link);
    await this.save();

    return link;
  }

  /**
   * Pay a payment link by ID
   *
   * @example
   * ```typescript
   * const result = await links.pay('link_abc123');
   * ```
   */
  async pay(linkId: string, amount?: string): Promise<{ txHash: string; link: PaymentLink }> {
    await this.ensureLoaded();
    this.updateStatuses();

    if (!this.arcPay) {
      throw new Error('ArcPay client not set. Call setArcPay() first.');
    }

    const link = this.links.get(linkId);
    if (!link) {
      throw new Error(`Payment link "${linkId}" not found`);
    }

    if (link.status !== 'active') {
      throw new Error(`Payment link is ${link.status}`);
    }

    // Determine amount to pay
    const payAmount = amount ?? link.amount;
    if (!payAmount) {
      throw new Error('No amount specified and link has no fixed amount');
    }

    // Send payment
    const result = await this.arcPay.sendUSDC(link.recipient, payAmount);

    if (!result.success || !result.txHash) {
      throw new Error(result.error || 'Payment failed');
    }

    // Record payment
    const payment: LinkPayment = {
      paidBy: this.arcPay.address || 'unknown',
      txHash: result.txHash,
      amount: payAmount,
      paidAt: new Date().toISOString(),
    };

    link.payments.push(payment);
    link.usedCount++;

    // Update status
    if (link.maxUses !== undefined && link.usedCount >= link.maxUses) {
      link.status = 'paid';
    }

    this.links.set(linkId, link);
    await this.save();

    return { txHash: result.txHash, link };
  }

  /**
   * Pay a link from URL
   *
   * @example
   * ```typescript
   * const result = await links.payFromUrl('arcpay://pay/link_abc123');
   * ```
   */
  async payFromUrl(url: string, amount?: string): Promise<{ txHash: string; link: PaymentLink }> {
    const linkId = this.extractLinkId(url);
    if (!linkId) {
      throw new Error(`Invalid payment link URL: ${url}`);
    }
    return this.pay(linkId, amount);
  }

  /**
   * Get link status
   *
   * @example
   * ```typescript
   * const link = await links.getStatus('link_abc123');
   * ```
   */
  async getStatus(linkId: string): Promise<PaymentLink> {
    await this.ensureLoaded();
    this.updateStatuses();

    const link = this.links.get(linkId);
    if (!link) {
      throw new Error(`Payment link "${linkId}" not found`);
    }

    return link;
  }

  /**
   * Get a link by ID (alias for getStatus)
   */
  async get(linkId: string): Promise<PaymentLink | undefined> {
    await this.ensureLoaded();
    this.updateStatuses();
    return this.links.get(linkId);
  }

  /**
   * List all links with optional filtering
   *
   * @example
   * ```typescript
   * const activeLinks = await links.list({ status: 'active' });
   * ```
   */
  async list(options?: ListLinksOptions): Promise<PaymentLink[]> {
    await this.ensureLoaded();
    this.updateStatuses();

    let results = Array.from(this.links.values());

    // Filter by status
    if (options?.status) {
      results = results.filter((l) => l.status === options.status);
    }

    // Sort by creation date (newest first)
    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Limit results
    if (options?.limit && options.limit > 0) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Cancel a payment link
   *
   * @example
   * ```typescript
   * await links.cancel('link_abc123');
   * ```
   */
  async cancel(linkId: string): Promise<void> {
    await this.ensureLoaded();

    const link = this.links.get(linkId);
    if (!link) {
      throw new Error(`Payment link "${linkId}" not found`);
    }

    if (link.status !== 'active') {
      throw new Error(`Cannot cancel link with status "${link.status}"`);
    }

    link.status = 'cancelled';
    this.links.set(linkId, link);
    await this.save();
  }

  /**
   * Delete a payment link
   */
  async delete(linkId: string): Promise<boolean> {
    await this.ensureLoaded();

    const deleted = this.links.delete(linkId);
    if (deleted) {
      await this.save();
    }

    return deleted;
  }

  /**
   * Get active links count
   */
  async getActiveCount(): Promise<number> {
    await this.ensureLoaded();
    this.updateStatuses();

    return Array.from(this.links.values()).filter((l) => l.status === 'active').length;
  }

  /**
   * Get total received through links
   */
  async getTotalReceived(): Promise<string> {
    await this.ensureLoaded();

    let total = 0;
    for (const link of this.links.values()) {
      for (const payment of link.payments) {
        total += parseFloat(payment.amount);
      }
    }

    return total.toFixed(2);
  }

  /**
   * Clear all links
   */
  async clear(): Promise<void> {
    this.links.clear();
    await this.storage.delete(LINKS_KEY);
  }

  // ========== Private Helpers ==========

  private extractLinkId(url: string): string | null {
    // Match arcpay://pay/{id} or https://arcpay.app/pay/{id}
    const patterns = [
      /arcpay:\/\/pay\/([a-zA-Z0-9_]+)/,
      /https?:\/\/[^\/]+\/pay\/([a-zA-Z0-9_]+)/,
      /^(link_[a-zA-Z0-9_]+)$/, // Just the ID
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }
}

/**
 * Create a payment link manager instance
 */
export function createLinkManager(
  arcPay?: ArcPay,
  config?: LinkManagerConfig
): PaymentLinkManager {
  const manager = new PaymentLinkManager(config);
  if (arcPay) {
    manager.setArcPay(arcPay);
  }
  return manager;
}

/**
 * One-liner: Create a payment link
 *
 * @example
 * ```typescript
 * const url = await createPaymentLink(arcPay, '50', 'Dinner split');
 * ```
 */
export async function createPaymentLink(
  arcPay: ArcPay,
  amount?: string,
  description?: string
): Promise<string> {
  const manager = createLinkManager(arcPay);
  const link = await manager.create({ amount, description });
  return link.url;
}

/**
 * One-liner: Pay a link
 *
 * @example
 * ```typescript
 * const result = await payLink(arcPay, 'link_abc123');
 * ```
 */
export async function payLink(
  arcPay: ArcPay,
  urlOrId: string,
  amount?: string
): Promise<{ txHash: string }> {
  const manager = createLinkManager(arcPay);
  const result = await manager.payFromUrl(urlOrId, amount);
  return { txHash: result.txHash };
}

export default PaymentLinkManager;
