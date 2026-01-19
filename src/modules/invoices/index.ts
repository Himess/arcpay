/**
 * Invoice System Module
 *
 * Create, send, and track invoices with automatic payment processing.
 *
 * @example
 * ```typescript
 * import { createInvoiceManager } from 'arcpay';
 *
 * const invoices = createInvoiceManager({
 *   privateKey: process.env.PRIVATE_KEY,
 *   issuerName: 'My Company',
 * });
 *
 * // Create an invoice
 * const invoice = invoices.create({
 *   to: '0x...customer',
 *   items: [
 *     { description: 'Web Development', quantity: 10, unitPrice: '100' },
 *     { description: 'Hosting (1 year)', quantity: 1, unitPrice: '200' }
 *   ],
 *   dueDate: '30d',
 *   notes: 'Thank you for your business!'
 * });
 *
 * // Send to customer
 * await invoices.send(invoice.id);
 *
 * // Customer pays
 * await invoices.pay({ invoiceId: invoice.id });
 * ```
 */

import { ArcPayClient } from '../../core/client';
import type {
  Invoice,
  InvoiceLineItem,
  InvoiceRecipient,
  InvoiceStatus,
  InvoiceManagerConfig,
  CreateInvoiceParams,
  PayInvoiceParams,
  PayInvoiceResult,
  InvoiceReminder,
  InvoiceStats,
} from './types';

export * from './types';

/**
 * Generate invoice number
 */
function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `INV-${year}-${random}`;
}

/**
 * Parse due date (supports ISO strings and relative formats)
 */
function parseDueDate(dueDate: string): Date {
  // Try relative format (e.g., '30d', '2w')
  const match = dueDate.match(/^(\d+)(d|w|m)$/);
  if (match) {
    const value = parseInt(match[1]);
    const unit = match[2];
    const now = new Date();

    switch (unit) {
      case 'd':
        return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
      case 'w':
        return new Date(now.getTime() + value * 7 * 24 * 60 * 60 * 1000);
      case 'm':
        return new Date(now.getTime() + value * 30 * 24 * 60 * 60 * 1000);
    }
  }

  // Try ISO date
  const parsed = new Date(dueDate);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  // Default: 30 days from now
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
}

/**
 * Calculate line item total
 */
function calculateLineItemTotal(item: Omit<InvoiceLineItem, 'total'>): string {
  const total = item.quantity * parseFloat(item.unitPrice);
  const discount = item.discount ? parseFloat(item.discount) : 0;
  const afterDiscount = total - discount;
  const tax = item.taxRate ? afterDiscount * (item.taxRate / 100) : 0;
  return (afterDiscount + tax).toFixed(6);
}

/**
 * Invoice Manager
 */
export class InvoiceManager {
  private client: ArcPayClient;
  private config: InvoiceManagerConfig;

  private invoices: Map<string, Invoice> = new Map();
  private reminders: InvoiceReminder[] = [];
  private invoiceCounter = 0;

  constructor(config: InvoiceManagerConfig) {
    this.config = {
      defaultPaymentTerms: 30,
      defaultTaxRate: 0,
      autoReminders: true,
      ...config,
    };

    this.client = new ArcPayClient({
      network: 'arc-testnet',
      privateKey: config.privateKey,
    });
  }

  // ============================================
  // INVOICE CREATION
  // ============================================

  /**
   * Create a new invoice
   *
   * @example
   * ```typescript
   * const invoice = await invoices.create({
   *   to: '0x...customer',
   *   items: [
   *     { description: 'Consulting', quantity: 5, unitPrice: '150' }
   *   ],
   *   dueDate: '30d',
   *   taxRate: 10
   * });
   * ```
   */
  async create(params: CreateInvoiceParams): Promise<Invoice> {
    const issuer = await this.getAddress();

    // Parse recipient
    const recipient: InvoiceRecipient =
      typeof params.to === 'string' ? { address: params.to } : params.to;

    // Calculate line items with totals
    const items: InvoiceLineItem[] = params.items.map((item) => ({
      ...item,
      taxRate: item.taxRate ?? params.taxRate ?? this.config.defaultTaxRate,
      total: calculateLineItemTotal({
        ...item,
        taxRate: item.taxRate ?? params.taxRate ?? this.config.defaultTaxRate,
      }),
    }));

    // Calculate totals
    const subtotal = items.reduce((sum, item) => {
      const base = item.quantity * parseFloat(item.unitPrice);
      return sum + base;
    }, 0);

    const discount = params.discount ? parseFloat(params.discount) : 0;
    const afterDiscount = subtotal - discount;

    const taxRate = params.taxRate ?? this.config.defaultTaxRate ?? 0;
    const tax = afterDiscount * (taxRate / 100);

    const total = afterDiscount + tax;

    // Parse due date
    const dueDate = parseDueDate(
      params.dueDate || `${this.config.defaultPaymentTerms || 30}d`
    );

    const invoice: Invoice = {
      id: `inv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      number: params.invoiceNumber || generateInvoiceNumber(),
      from: issuer,
      to: recipient,
      status: 'draft',
      items,
      subtotal: subtotal.toFixed(6),
      tax: tax.toFixed(6),
      discount: discount.toFixed(6),
      total: total.toFixed(6),
      currency: params.currency || 'USDC',
      issuedAt: new Date().toISOString(),
      dueDate: dueDate.toISOString(),
      notes: params.notes,
      terms: params.terms,
      metadata: params.metadata,
    };

    // Generate payment link
    invoice.paymentLink = this.generatePaymentLink(invoice);
    invoice.qrCode = this.generateQRData(invoice);

    this.invoices.set(invoice.id, invoice);
    this.invoiceCounter++;

    return invoice;
  }

  /**
   * Generate payment link for an invoice
   */
  private generatePaymentLink(invoice: Invoice): string {
    // In a real implementation, this would be a hosted payment page
    // For now, return a deep link format
    const params = new URLSearchParams({
      id: invoice.id,
      to: invoice.from,
      amount: invoice.total,
      currency: invoice.currency,
      ref: invoice.number,
    });
    return `arcpay://pay?${params.toString()}`;
  }

  /**
   * Generate QR code data for an invoice
   */
  private generateQRData(invoice: Invoice): string {
    // Return JSON that can be encoded as QR
    return JSON.stringify({
      type: 'arcpay_invoice',
      id: invoice.id,
      to: invoice.from,
      amount: invoice.total,
      currency: invoice.currency,
      ref: invoice.number,
    });
  }

  // ============================================
  // INVOICE MANAGEMENT
  // ============================================

  /**
   * Get an invoice by ID
   */
  get(invoiceId: string): Invoice | undefined {
    return this.invoices.get(invoiceId);
  }

  /**
   * List invoices with optional filters
   */
  list(filter?: {
    status?: InvoiceStatus;
    to?: string;
    from?: string;
  }): Invoice[] {
    let invoices = Array.from(this.invoices.values());

    if (filter?.status) {
      invoices = invoices.filter((i) => i.status === filter.status);
    }
    if (filter?.to) {
      invoices = invoices.filter(
        (i) => i.to.address.toLowerCase() === filter.to!.toLowerCase()
      );
    }
    if (filter?.from) {
      invoices = invoices.filter(
        (i) => i.from.toLowerCase() === filter.from!.toLowerCase()
      );
    }

    return invoices.sort(
      (a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
    );
  }

  /**
   * Send an invoice to the recipient
   */
  async send(invoiceId: string): Promise<Invoice> {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) {
      throw new Error(`Invoice not found: ${invoiceId}`);
    }

    if (invoice.status !== 'draft') {
      throw new Error(`Invoice already sent: ${invoice.status}`);
    }

    invoice.status = 'sent';
    this.invoices.set(invoiceId, invoice);

    // Send webhook notification
    await this.sendWebhook('invoice.sent', invoice);

    return invoice;
  }

  /**
   * Mark invoice as viewed
   */
  markViewed(invoiceId: string): Invoice {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) {
      throw new Error(`Invoice not found: ${invoiceId}`);
    }

    if (invoice.status === 'sent') {
      invoice.status = 'viewed';
      this.invoices.set(invoiceId, invoice);
    }

    return invoice;
  }

  /**
   * Cancel an invoice
   */
  cancel(invoiceId: string, reason?: string): Invoice {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) {
      throw new Error(`Invoice not found: ${invoiceId}`);
    }

    if (invoice.status === 'paid') {
      throw new Error('Cannot cancel a paid invoice');
    }

    invoice.status = 'cancelled';
    if (reason) {
      invoice.notes = (invoice.notes || '') + `\nCancelled: ${reason}`;
    }

    this.invoices.set(invoiceId, invoice);

    return invoice;
  }

  /**
   * Update an invoice (only drafts)
   */
  update(
    invoiceId: string,
    updates: Partial<Pick<Invoice, 'items' | 'dueDate' | 'notes' | 'terms' | 'discount'>>
  ): Invoice {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) {
      throw new Error(`Invoice not found: ${invoiceId}`);
    }

    if (invoice.status !== 'draft') {
      throw new Error('Can only update draft invoices');
    }

    // Apply updates
    if (updates.items) {
      invoice.items = updates.items.map((item) => ({
        ...item,
        total: calculateLineItemTotal(item),
      }));

      // Recalculate totals
      const subtotal = invoice.items.reduce((sum, item) => {
        return sum + item.quantity * parseFloat(item.unitPrice);
      }, 0);

      const discount = updates.discount
        ? parseFloat(updates.discount)
        : parseFloat(invoice.discount);
      const afterDiscount = subtotal - discount;
      const taxRate = this.config.defaultTaxRate || 0;
      const tax = afterDiscount * (taxRate / 100);

      invoice.subtotal = subtotal.toFixed(6);
      invoice.discount = discount.toFixed(6);
      invoice.tax = tax.toFixed(6);
      invoice.total = (afterDiscount + tax).toFixed(6);
    }

    if (updates.dueDate) {
      invoice.dueDate = parseDueDate(updates.dueDate).toISOString();
    }

    if (updates.notes !== undefined) {
      invoice.notes = updates.notes;
    }

    if (updates.terms !== undefined) {
      invoice.terms = updates.terms;
    }

    this.invoices.set(invoiceId, invoice);
    return invoice;
  }

  // ============================================
  // PAYMENT
  // ============================================

  /**
   * Pay an invoice
   *
   * @example
   * ```typescript
   * // Pay exact amount
   * await invoices.pay({ invoiceId: 'inv_123' });
   *
   * // Pay with tip
   * await invoices.pay({ invoiceId: 'inv_123', tip: '5' });
   * ```
   */
  async pay(params: PayInvoiceParams): Promise<PayInvoiceResult> {
    const invoice = this.invoices.get(params.invoiceId);
    if (!invoice) {
      return { success: false, error: `Invoice not found: ${params.invoiceId}` };
    }

    if (invoice.status === 'paid') {
      return { success: false, error: 'Invoice already paid' };
    }

    if (invoice.status === 'cancelled') {
      return { success: false, error: 'Invoice is cancelled' };
    }

    try {
      const amount = params.tip
        ? (parseFloat(invoice.total) + parseFloat(params.tip)).toFixed(6)
        : invoice.total;

      const result = await this.client.transfer({
        to: invoice.from,
        amount,
      });

      invoice.status = 'paid';
      invoice.paidAt = new Date().toISOString();
      invoice.paymentTxHash = result.txHash;

      this.invoices.set(params.invoiceId, invoice);

      // Send webhook
      await this.sendWebhook('invoice.paid', invoice);

      return { success: true, txHash: result.txHash };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment failed',
      };
    }
  }

  /**
   * Refund a paid invoice
   */
  async refund(
    invoiceId: string,
    options?: { partial?: string; reason?: string }
  ): Promise<PayInvoiceResult> {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) {
      return { success: false, error: `Invoice not found: ${invoiceId}` };
    }

    if (invoice.status !== 'paid') {
      return { success: false, error: 'Can only refund paid invoices' };
    }

    try {
      const amount = options?.partial || invoice.total;

      const result = await this.client.transfer({
        to: invoice.to.address,
        amount,
      });

      invoice.status = 'refunded';
      if (options?.reason) {
        invoice.notes = (invoice.notes || '') + `\nRefunded: ${options.reason}`;
      }

      this.invoices.set(invoiceId, invoice);

      // Send webhook
      await this.sendWebhook('invoice.refunded', invoice);

      return { success: true, txHash: result.txHash };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Refund failed',
      };
    }
  }

  // ============================================
  // REMINDERS & OVERDUE
  // ============================================

  /**
   * Check and update overdue invoices
   */
  checkOverdue(): Invoice[] {
    const now = new Date();
    const overdueInvoices: Invoice[] = [];

    for (const invoice of this.invoices.values()) {
      if (
        (invoice.status === 'sent' || invoice.status === 'viewed') &&
        new Date(invoice.dueDate) < now
      ) {
        invoice.status = 'overdue';
        this.invoices.set(invoice.id, invoice);
        overdueInvoices.push(invoice);
      }
    }

    return overdueInvoices;
  }

  /**
   * Send payment reminders
   */
  async sendReminders(): Promise<InvoiceReminder[]> {
    const now = new Date();
    const sentReminders: InvoiceReminder[] = [];

    for (const invoice of this.invoices.values()) {
      if (invoice.status !== 'sent' && invoice.status !== 'viewed') {
        continue;
      }

      const dueDate = new Date(invoice.dueDate);
      const daysUntilDue = Math.ceil(
        (dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      );

      let reminderType: InvoiceReminder['reminderType'] | null = null;

      if (daysUntilDue === 7) {
        reminderType = 'upcoming';
      } else if (daysUntilDue === 0) {
        reminderType = 'due';
      } else if (daysUntilDue < 0 && daysUntilDue % 7 === 0) {
        reminderType = 'overdue';
      }

      if (reminderType) {
        const reminder: InvoiceReminder = {
          invoiceId: invoice.id,
          reminderType,
          sentAt: now.toISOString(),
          daysBefore: daysUntilDue > 0 ? daysUntilDue : undefined,
          daysAfter: daysUntilDue < 0 ? Math.abs(daysUntilDue) : undefined,
        };

        this.reminders.push(reminder);
        sentReminders.push(reminder);

        // Send webhook
        await this.sendWebhook('invoice.reminder', { invoice, reminder });
      }
    }

    return sentReminders;
  }

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Get invoice statistics
   */
  getStats(): InvoiceStats {
    const invoices = Array.from(this.invoices.values());

    const stats: InvoiceStats = {
      total: invoices.length,
      draft: 0,
      sent: 0,
      paid: 0,
      overdue: 0,
      totalRevenue: '0',
      averageInvoice: '0',
      averagePaymentTime: 0,
    };

    let totalRevenue = 0;
    let totalPaymentDays = 0;
    let paidCount = 0;

    for (const invoice of invoices) {
      switch (invoice.status) {
        case 'draft':
          stats.draft++;
          break;
        case 'sent':
        case 'viewed':
          stats.sent++;
          break;
        case 'paid':
        case 'refunded':
          stats.paid++;
          totalRevenue += parseFloat(invoice.total);
          if (invoice.paidAt && invoice.issuedAt) {
            const paymentDays = Math.ceil(
              (new Date(invoice.paidAt).getTime() -
                new Date(invoice.issuedAt).getTime()) /
                (24 * 60 * 60 * 1000)
            );
            totalPaymentDays += paymentDays;
            paidCount++;
          }
          break;
        case 'overdue':
          stats.overdue++;
          break;
      }
    }

    stats.totalRevenue = totalRevenue.toFixed(6);
    stats.averageInvoice =
      invoices.length > 0 ? (totalRevenue / invoices.length).toFixed(6) : '0';
    stats.averagePaymentTime = paidCount > 0 ? totalPaymentDays / paidCount : 0;

    return stats;
  }

  // ============================================
  // HELPERS
  // ============================================

  /**
   * Get address (cached after first call)
   */
  private cachedAddress?: string;

  private async getAddress(): Promise<string> {
    if (this.cachedAddress) return this.cachedAddress;
    const { address } = await this.client.getBalance();
    this.cachedAddress = address;
    return address;
  }

  /**
   * Send webhook notification
   */
  private async sendWebhook(event: string, data: unknown): Promise<void> {
    if (!this.config.webhookUrl) return;

    try {
      await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event,
          data,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch {
      // Ignore webhook errors
    }
  }
}

/**
 * Create an invoice manager instance
 *
 * @example
 * ```typescript
 * const invoices = createInvoiceManager({
 *   privateKey: process.env.PRIVATE_KEY,
 *   issuerName: 'My Company',
 *   defaultPaymentTerms: 30,
 * });
 * ```
 */
export function createInvoiceManager(config: InvoiceManagerConfig): InvoiceManager {
  return new InvoiceManager(config);
}

export default { createInvoiceManager, InvoiceManager };
