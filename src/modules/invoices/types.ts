/**
 * Invoice System Types
 */

/**
 * Invoice status
 */
export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled' | 'refunded';

/**
 * Line item on an invoice
 */
export interface InvoiceLineItem {
  /** Item description */
  description: string;
  /** Quantity */
  quantity: number;
  /** Unit price */
  unitPrice: string;
  /** Total (quantity * unitPrice) */
  total: string;
  /** Tax rate (optional) */
  taxRate?: number;
  /** Discount (optional) */
  discount?: string;
}

/**
 * Invoice recipient/customer
 */
export interface InvoiceRecipient {
  /** Wallet address */
  address: string;
  /** Name (optional) */
  name?: string;
  /** Email (optional, for notifications) */
  email?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Invoice data
 */
export interface Invoice {
  /** Unique invoice ID */
  id: string;
  /** Invoice number (human-readable) */
  number: string;
  /** Issuer address */
  from: string;
  /** Recipient info */
  to: InvoiceRecipient;
  /** Status */
  status: InvoiceStatus;
  /** Line items */
  items: InvoiceLineItem[];
  /** Subtotal (before tax/discount) */
  subtotal: string;
  /** Tax amount */
  tax: string;
  /** Discount amount */
  discount: string;
  /** Total amount due */
  total: string;
  /** Currency (USDC, EURC, etc.) */
  currency: string;
  /** Issue date */
  issuedAt: string;
  /** Due date */
  dueDate: string;
  /** Paid date (if paid) */
  paidAt?: string;
  /** Payment tx hash (if paid) */
  paymentTxHash?: string;
  /** Notes/memo */
  notes?: string;
  /** Terms and conditions */
  terms?: string;
  /** Metadata */
  metadata?: Record<string, unknown>;
  /** Payment link (for sharing) */
  paymentLink?: string;
  /** QR code data */
  qrCode?: string;
}

/**
 * Create invoice params
 */
export interface CreateInvoiceParams {
  /** Recipient address or full recipient info */
  to: string | InvoiceRecipient;
  /** Line items */
  items: Omit<InvoiceLineItem, 'total'>[];
  /** Due date (ISO string or relative like '30d') */
  dueDate?: string;
  /** Currency (default: USDC) */
  currency?: string;
  /** Tax rate (percentage, e.g., 10 for 10%) */
  taxRate?: number;
  /** Discount amount */
  discount?: string;
  /** Notes */
  notes?: string;
  /** Terms */
  terms?: string;
  /** Custom invoice number (auto-generated if not provided) */
  invoiceNumber?: string;
  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Invoice payment params
 */
export interface PayInvoiceParams {
  /** Invoice ID */
  invoiceId: string;
  /** Tip amount (optional) */
  tip?: string;
}

/**
 * Invoice payment result
 */
export interface PayInvoiceResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

/**
 * Invoice manager configuration
 */
export interface InvoiceManagerConfig {
  /** Private key for signing transactions */
  privateKey: string;
  /** Default payment terms (days) */
  defaultPaymentTerms?: number;
  /** Default tax rate */
  defaultTaxRate?: number;
  /** Company/issuer name */
  issuerName?: string;
  /** Webhook URL for notifications */
  webhookUrl?: string;
  /** Auto-send reminders */
  autoReminders?: boolean;
}

/**
 * Invoice reminder
 */
export interface InvoiceReminder {
  invoiceId: string;
  reminderType: 'upcoming' | 'due' | 'overdue';
  sentAt: string;
  daysBefore?: number;
  daysAfter?: number;
}

/**
 * Invoice statistics
 */
export interface InvoiceStats {
  total: number;
  draft: number;
  sent: number;
  paid: number;
  overdue: number;
  totalRevenue: string;
  averageInvoice: string;
  averagePaymentTime: number; // days
}
