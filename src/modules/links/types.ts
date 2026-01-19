/**
 * ArcPay Payment Links - Type Definitions
 *
 * Types for shareable payment links.
 */

/**
 * Payment link status
 */
export type PaymentLinkStatus = 'active' | 'paid' | 'expired' | 'cancelled';

/**
 * Payment made through a link
 */
export interface LinkPayment {
  /** Who paid */
  paidBy: string;
  /** Transaction hash */
  txHash: string;
  /** Amount paid */
  amount: string;
  /** When paid */
  paidAt: string;
}

/**
 * Payment link
 */
export interface PaymentLink {
  /** Unique link ID */
  id: string;
  /** Shareable URL */
  url: string;
  /** Fixed amount (if set) */
  amount?: string;
  /** Recipient address */
  recipient: string;
  /** Optional description */
  description?: string;
  /** Expiration date */
  expiresAt?: string;
  /** Maximum uses (undefined = unlimited) */
  maxUses?: number;
  /** Number of times used */
  usedCount: number;
  /** Current status */
  status: PaymentLinkStatus;
  /** Payment history */
  payments: LinkPayment[];
  /** Created timestamp */
  createdAt: string;
}

/**
 * Options for creating a payment link
 */
export interface CreateLinkOptions {
  /** Fixed amount (optional, payer can choose if not set) */
  amount?: string;
  /** Recipient address (defaults to signer) */
  recipient?: string;
  /** Description shown to payer */
  description?: string;
  /** Expires in (e.g., '24h', '7d', '30d') */
  expiresIn?: string;
  /** Maximum number of uses */
  maxUses?: number;
}

/**
 * Options for listing links
 */
export interface ListLinksOptions {
  /** Filter by status */
  status?: PaymentLinkStatus;
  /** Limit number of results */
  limit?: number;
}

/**
 * Payment link manager configuration
 */
export interface LinkManagerConfig {
  /** Base URL for payment links */
  baseUrl?: string;
  /** Storage adapter key prefix */
  storagePrefix?: string;
}
