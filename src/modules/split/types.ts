/**
 * ArcPay Split Payment - Type Definitions
 *
 * Types for bill splitting and group payments.
 */

/**
 * Recipient in a split payment
 */
export interface SplitRecipient {
  /** Contact name or wallet address */
  to: string;
  /** Fixed amount (takes precedence over percent) */
  amount?: string;
  /** Percentage of total (if no fixed amount) */
  percent?: number;
}

/**
 * Result of a split payment for one recipient
 */
export interface SplitRecipientResult {
  /** Contact name (if resolved) or address */
  name: string;
  /** Wallet address */
  address: string;
  /** Amount sent */
  amount: string;
  /** Transaction hash */
  txHash: string;
  /** Status of this payment */
  status: 'success' | 'failed';
  /** Error message if failed */
  error?: string;
}

/**
 * Result of a complete split payment
 */
export interface SplitResult {
  /** Unique split ID */
  id: string;
  /** Total amount split */
  total: string;
  /** Individual results */
  recipients: SplitRecipientResult[];
  /** Number of successful payments */
  successCount: number;
  /** Number of failed payments */
  failedCount: number;
  /** Timestamp */
  createdAt: string;
}

/**
 * Split calculation result (before execution)
 */
export interface SplitCalculation {
  /** Recipients with resolved amounts */
  recipients: Array<{
    to: string;
    address: string;
    amount: string;
  }>;
  /** Total amount to be sent */
  total: string;
}

/**
 * Options for creating a split payment
 */
export interface SplitPaymentOptions {
  /** Total amount to split (required for equal splits) */
  total?: string;
  /** Recipients with optional custom amounts/percentages */
  recipients: string[] | SplitRecipient[];
  /** Memo for the payments */
  memo?: string;
  /** Whether to continue if some payments fail */
  continueOnError?: boolean;
}

/**
 * Split manager configuration
 */
export interface SplitManagerConfig {
  /** Default behavior on error */
  continueOnError?: boolean;
}
