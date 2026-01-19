/**
 * ArcPay Payment Requests Module
 *
 * Request payments from contacts (ask for money).
 *
 * @example
 * ```typescript
 * import { createRequestManager } from 'arcpay';
 *
 * const requests = createRequestManager(arcPayClient);
 *
 * // Request payment from someone
 * const request = await requests.create({
 *   from: 'alice',
 *   amount: '50',
 *   reason: 'Dinner last night'
 * });
 *
 * // List incoming requests (money owed to others)
 * const incoming = await requests.listIncoming();
 *
 * // Pay a request
 * await requests.pay('req_abc123');
 *
 * // Decline a request
 * await requests.decline('req_abc123', 'Already paid cash');
 * ```
 */

import type {
  PaymentRequest,
  PaymentRequestStatus,
  RequestParty,
  CreateRequestOptions,
  CreateBulkRequestOptions,
  ListRequestsOptions,
  RequestManagerConfig,
} from './types';
import { createStorage } from '../contacts/storage';
import type { StorageAdapter } from '../contacts/types';
import { ContactManager, createContactManager } from '../contacts';
import type { ArcPay } from '../../core/client';

// Re-export types
export type {
  PaymentRequest,
  PaymentRequestStatus,
  RequestParty,
  CreateRequestOptions,
  CreateBulkRequestOptions,
  ListRequestsOptions,
  RequestManagerConfig,
};

const REQUESTS_KEY = 'payment_requests';

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `req_${timestamp}_${random}`;
}

/**
 * Parse due date string
 */
function parseDueDate(dueDate: string): Date {
  // Check if it's "in Xd" format
  const match = dueDate.match(/^in\s+(\d+)([hdwm])$/i);
  if (match) {
    const now = new Date();
    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();

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

  // Otherwise try to parse as ISO date
  return new Date(dueDate);
}

/**
 * Payment Request Manager
 *
 * Manages payment requests with persistence.
 */
export class PaymentRequestManager {
  private arcPay: ArcPay | null = null;
  private contactManager: ContactManager;
  private storage: StorageAdapter;
  private requests: Map<string, PaymentRequest> = new Map();
  private loaded: boolean = false;

  constructor(config: RequestManagerConfig = {}) {
    const prefix = config.storagePrefix ?? 'arcpay_requests_';
    this.storage = createStorage({ prefix });
    this.contactManager = createContactManager();
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
   * Ensure requests are loaded from storage
   */
  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;

    const data = await this.storage.get(REQUESTS_KEY);
    if (data) {
      try {
        const parsed = JSON.parse(data) as PaymentRequest[];
        for (const request of parsed) {
          this.requests.set(request.id, request);
        }
      } catch {
        // Ignore parse errors
      }
    }

    this.loaded = true;
  }

  /**
   * Save requests to storage
   */
  private async save(): Promise<void> {
    const data = Array.from(this.requests.values());
    await this.storage.set(REQUESTS_KEY, JSON.stringify(data));
  }

  /**
   * Update request statuses (check for expiration)
   */
  private updateStatuses(): void {
    const now = new Date();

    for (const request of this.requests.values()) {
      if (request.status === 'pending') {
        // Check expiration
        if (request.dueDate && new Date(request.dueDate) < now) {
          request.status = 'expired';
        }
      }
    }
  }

  /**
   * Resolve a name or address to an address
   */
  private async resolveAddress(nameOrAddress: string): Promise<string | undefined> {
    if (/^0x[a-fA-F0-9]{40}$/.test(nameOrAddress)) {
      return nameOrAddress.toLowerCase();
    }
    return this.contactManager.resolve(nameOrAddress);
  }

  /**
   * Create a payment request
   *
   * @example
   * ```typescript
   * const request = await requests.create({
   *   from: 'alice',
   *   amount: '50',
   *   reason: 'Dinner split'
   * });
   * ```
   */
  async create(options: CreateRequestOptions): Promise<PaymentRequest> {
    await this.ensureLoaded();

    if (!this.arcPay) {
      throw new Error('ArcPay client not set. Call setArcPay() first.');
    }

    const fromAddress = await this.resolveAddress(options.from);
    if (!fromAddress) {
      throw new Error(`Could not resolve address for "${options.from}"`);
    }

    const toAddress = this.arcPay.address;
    if (!toAddress) {
      throw new Error('No signer available');
    }

    // Get contact name if available
    const fromContact = await this.contactManager.findByAddress(fromAddress);
    const toContact = await this.contactManager.findByAddress(toAddress);

    const request: PaymentRequest = {
      id: generateRequestId(),
      from: {
        name: fromContact?.displayName || options.from,
        address: fromAddress,
      },
      to: {
        name: toContact?.displayName,
        address: toAddress,
      },
      amount: options.amount,
      reason: options.reason,
      dueDate: options.dueDate ? parseDueDate(options.dueDate).toISOString() : undefined,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    this.requests.set(request.id, request);
    await this.save();

    return request;
  }

  /**
   * Create bulk payment requests
   *
   * @example
   * ```typescript
   * const requests = await requests.createBulk({
   *   from: ['alice', 'bob', 'charlie'],
   *   amount: '33.33',
   *   reason: 'Split dinner bill'
   * });
   * ```
   */
  async createBulk(options: CreateBulkRequestOptions): Promise<PaymentRequest[]> {
    const results: PaymentRequest[] = [];

    for (const from of options.from) {
      const request = await this.create({
        from,
        amount: options.amount,
        reason: options.reason,
        dueDate: options.dueDate,
      });
      results.push(request);
    }

    return results;
  }

  /**
   * Pay a payment request
   *
   * @example
   * ```typescript
   * const result = await requests.pay('req_abc123');
   * ```
   */
  async pay(requestId: string): Promise<{ txHash: string }> {
    await this.ensureLoaded();
    this.updateStatuses();

    if (!this.arcPay) {
      throw new Error('ArcPay client not set. Call setArcPay() first.');
    }

    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`Payment request "${requestId}" not found`);
    }

    if (request.status !== 'pending') {
      throw new Error(`Cannot pay request with status "${request.status}"`);
    }

    // Send payment to the requester
    const result = await this.arcPay.sendUSDC(request.to.address, request.amount);

    if (!result.success || !result.txHash) {
      throw new Error(result.error || 'Payment failed');
    }

    // Update request
    request.status = 'paid';
    request.paidAt = new Date().toISOString();
    request.txHash = result.txHash;

    this.requests.set(requestId, request);
    await this.save();

    return { txHash: result.txHash };
  }

  /**
   * Decline a payment request
   *
   * @example
   * ```typescript
   * await requests.decline('req_abc123', 'Already paid cash');
   * ```
   */
  async decline(requestId: string, reason?: string): Promise<void> {
    await this.ensureLoaded();

    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`Payment request "${requestId}" not found`);
    }

    if (request.status !== 'pending') {
      throw new Error(`Cannot decline request with status "${request.status}"`);
    }

    request.status = 'declined';
    request.declineReason = reason;

    this.requests.set(requestId, request);
    await this.save();
  }

  /**
   * Cancel a payment request (by the requester)
   *
   * @example
   * ```typescript
   * await requests.cancel('req_abc123');
   * ```
   */
  async cancel(requestId: string): Promise<void> {
    await this.ensureLoaded();

    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`Payment request "${requestId}" not found`);
    }

    if (request.status !== 'pending') {
      throw new Error(`Cannot cancel request with status "${request.status}"`);
    }

    request.status = 'cancelled';

    this.requests.set(requestId, request);
    await this.save();
  }

  /**
   * Get request status
   */
  async getStatus(requestId: string): Promise<PaymentRequest> {
    await this.ensureLoaded();
    this.updateStatuses();

    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`Payment request "${requestId}" not found`);
    }

    return request;
  }

  /**
   * Get a request by ID
   */
  async get(requestId: string): Promise<PaymentRequest | undefined> {
    await this.ensureLoaded();
    this.updateStatuses();
    return this.requests.get(requestId);
  }

  /**
   * List incoming requests (requests for you to pay)
   *
   * @example
   * ```typescript
   * const incoming = await requests.listIncoming();
   * ```
   */
  async listIncoming(options?: ListRequestsOptions): Promise<PaymentRequest[]> {
    await this.ensureLoaded();
    this.updateStatuses();

    if (!this.arcPay?.address) {
      return [];
    }

    const myAddress = this.arcPay.address.toLowerCase();
    let results = Array.from(this.requests.values()).filter(
      (r) => r.from.address.toLowerCase() === myAddress
    );

    // Filter by status
    if (options?.status) {
      results = results.filter((r) => r.status === options.status);
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
   * List outgoing requests (requests you sent)
   *
   * @example
   * ```typescript
   * const outgoing = await requests.listOutgoing();
   * ```
   */
  async listOutgoing(options?: ListRequestsOptions): Promise<PaymentRequest[]> {
    await this.ensureLoaded();
    this.updateStatuses();

    if (!this.arcPay?.address) {
      return [];
    }

    const myAddress = this.arcPay.address.toLowerCase();
    let results = Array.from(this.requests.values()).filter(
      (r) => r.to.address.toLowerCase() === myAddress
    );

    // Filter by status
    if (options?.status) {
      results = results.filter((r) => r.status === options.status);
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
   * List all requests
   */
  async list(options?: ListRequestsOptions): Promise<PaymentRequest[]> {
    await this.ensureLoaded();
    this.updateStatuses();

    let results = Array.from(this.requests.values());

    // Filter by status
    if (options?.status) {
      results = results.filter((r) => r.status === options.status);
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
   * Get pending incoming count
   */
  async getPendingIncomingCount(): Promise<number> {
    const incoming = await this.listIncoming({ status: 'pending' });
    return incoming.length;
  }

  /**
   * Get pending outgoing count
   */
  async getPendingOutgoingCount(): Promise<number> {
    const outgoing = await this.listOutgoing({ status: 'pending' });
    return outgoing.length;
  }

  /**
   * Get total amount requested (outgoing)
   */
  async getTotalRequested(): Promise<string> {
    const outgoing = await this.listOutgoing({ status: 'paid' });
    const total = outgoing.reduce((sum, r) => sum + parseFloat(r.amount), 0);
    return total.toFixed(2);
  }

  /**
   * Delete a request
   */
  async delete(requestId: string): Promise<boolean> {
    await this.ensureLoaded();

    const deleted = this.requests.delete(requestId);
    if (deleted) {
      await this.save();
    }

    return deleted;
  }

  /**
   * Clear all requests
   */
  async clear(): Promise<void> {
    this.requests.clear();
    await this.storage.delete(REQUESTS_KEY);
  }
}

/**
 * Create a payment request manager instance
 */
export function createRequestManager(
  arcPay?: ArcPay,
  config?: RequestManagerConfig
): PaymentRequestManager {
  const manager = new PaymentRequestManager(config);
  if (arcPay) {
    manager.setArcPay(arcPay);
  }
  return manager;
}

/**
 * One-liner: Request payment from someone
 *
 * @example
 * ```typescript
 * const request = await requestPayment(arcPay, 'alice', '50', 'Dinner split');
 * ```
 */
export async function requestPayment(
  arcPay: ArcPay,
  from: string,
  amount: string,
  reason?: string
): Promise<PaymentRequest> {
  const manager = createRequestManager(arcPay);
  return manager.create({ from, amount, reason });
}

/**
 * One-liner: Request payment from multiple people
 *
 * @example
 * ```typescript
 * const requests = await requestPaymentFrom(
 *   arcPay,
 *   ['alice', 'bob', 'charlie'],
 *   '33.33',
 *   'Split dinner'
 * );
 * ```
 */
export async function requestPaymentFrom(
  arcPay: ArcPay,
  from: string[],
  amount: string,
  reason?: string
): Promise<PaymentRequest[]> {
  const manager = createRequestManager(arcPay);
  return manager.createBulk({ from, amount, reason });
}

export default PaymentRequestManager;
