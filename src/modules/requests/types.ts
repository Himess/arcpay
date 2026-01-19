/**
 * ArcPay Payment Requests - Type Definitions
 *
 * Types for payment requests (asking for money).
 */

/**
 * Payment request status
 */
export type PaymentRequestStatus = 'pending' | 'paid' | 'declined' | 'expired' | 'cancelled';

/**
 * Party in a payment request
 */
export interface RequestParty {
  /** Contact name (if known) */
  name?: string;
  /** Wallet address */
  address: string;
}

/**
 * Payment request
 */
export interface PaymentRequest {
  /** Unique request ID */
  id: string;
  /** Who should pay */
  from: RequestParty;
  /** Who is requesting (recipient) */
  to: RequestParty;
  /** Amount requested */
  amount: string;
  /** Reason for request */
  reason?: string;
  /** Due date */
  dueDate?: string;
  /** Current status */
  status: PaymentRequestStatus;
  /** When paid */
  paidAt?: string;
  /** Transaction hash if paid */
  txHash?: string;
  /** Reason for decline */
  declineReason?: string;
  /** Created timestamp */
  createdAt: string;
}

/**
 * Options for creating a payment request
 */
export interface CreateRequestOptions {
  /** Contact name or address to request from */
  from: string;
  /** Amount to request */
  amount: string;
  /** Reason for the request */
  reason?: string;
  /** Due date (ISO string or 'in Xd' format) */
  dueDate?: string;
}

/**
 * Options for creating bulk payment requests
 */
export interface CreateBulkRequestOptions {
  /** Contact names or addresses to request from */
  from: string[];
  /** Amount to request from each */
  amount: string;
  /** Reason for the request */
  reason?: string;
  /** Due date */
  dueDate?: string;
}

/**
 * Options for listing payment requests
 */
export interface ListRequestsOptions {
  /** Filter by status */
  status?: PaymentRequestStatus;
  /** Limit number of results */
  limit?: number;
}

/**
 * Payment request manager configuration
 */
export interface RequestManagerConfig {
  /** Storage adapter key prefix */
  storagePrefix?: string;
}
