/**
 * Payment Channels Types - x402 Channel Scheme
 */

/**
 * Payment channel state
 */
export type ChannelState = 'pending' | 'open' | 'closing' | 'closed' | 'disputed';

/**
 * Channel configuration
 */
export interface ChannelConfig {
  /** Wallet private key */
  privateKey: string;
  /** Channel contract address (optional, for custom deployments) */
  channelContract?: string;
  /** Default channel duration in seconds */
  defaultDuration?: number;
  /** Auto-settle threshold (triggers settlement when reached) */
  autoSettleThreshold?: string;
  /** Custom RPC URL */
  rpcUrl?: string;
}

/**
 * Auto-topup configuration
 */
export interface AutoTopupConfig {
  /** Balance threshold that triggers topup */
  threshold: string;
  /** Amount to add when threshold is reached */
  amount: string;
  /** Maximum number of auto-topups (default: unlimited) */
  maxTopups?: number;
}

/**
 * Channel creation parameters
 */
export interface CreateChannelParams {
  /** Recipient address */
  recipient: string;
  /** Total channel deposit */
  deposit: string;
  /** Channel duration in seconds */
  duration?: number;
  /** Metadata for the channel */
  metadata?: Record<string, unknown>;
  /** Auto-topup configuration */
  autoTopup?: AutoTopupConfig;
}

/**
 * Payment channel info
 */
export interface PaymentChannel {
  /** Channel ID */
  id: string;
  /** Sender address */
  sender: string;
  /** Recipient address */
  recipient: string;
  /** Total deposit */
  deposit: string;
  /** Amount already paid */
  spent: string;
  /** Remaining balance */
  balance: string;
  /** Channel state */
  state: ChannelState;
  /** Nonce for payments */
  nonce: number;
  /** Creation timestamp */
  createdAt: string;
  /** Expiry timestamp */
  expiresAt: string;
  /** On-chain channel address */
  channelAddress?: string;
  /** Last payment signature */
  lastSignature?: string;
}

/**
 * Signed payment for off-chain transfer
 */
export interface SignedPayment {
  /** Channel ID */
  channelId: string;
  /** Payment amount (cumulative total spent) */
  amount: string;
  /** Payment nonce */
  nonce: number;
  /** Sender signature */
  signature: string;
  /** Timestamp */
  timestamp: string;
}

/**
 * Payment request from merchant
 */
export interface PaymentRequest {
  /** Request ID */
  requestId: string;
  /** Channel ID */
  channelId: string;
  /** Requested amount */
  amount: string;
  /** Description */
  description?: string;
  /** Expiry timestamp */
  expiresAt: string;
  /** Callback URL */
  callbackUrl?: string;
}

/**
 * Payment receipt from merchant
 */
export interface PaymentReceipt {
  /** Receipt ID */
  receiptId: string;
  /** Channel ID */
  channelId: string;
  /** Payment amount */
  amount: string;
  /** Total spent after this payment */
  totalSpent: string;
  /** Nonce used */
  nonce: number;
  /** Timestamp */
  timestamp: string;
  /** Recipient acknowledgment signature */
  acknowledgment?: string;
}

/**
 * Channel settlement result
 */
export interface SettlementResult {
  /** Channel ID */
  channelId: string;
  /** Settlement transaction hash */
  txHash: string;
  /** Final amount paid to recipient */
  finalAmount: string;
  /** Amount refunded to sender */
  refundAmount: string;
  /** Settlement timestamp */
  settledAt: string;
}

/**
 * Dispute result
 */
export interface DisputeResult {
  /** Channel ID */
  channelId: string;
  /** Dispute transaction hash */
  txHash: string;
  /** Disputed amount */
  disputedAmount: string;
  /** Challenge period end */
  challengeEndsAt: string;
}

/**
 * x402 header for HTTP requests
 */
export interface X402ChannelHeader {
  /** Scheme identifier */
  scheme: 'channel';
  /** Channel ID */
  channelId: string;
  /** Signed payment */
  payment: SignedPayment;
}

/**
 * Channel statistics
 */
export interface ChannelStats {
  /** Total channels created */
  totalChannels: number;
  /** Currently open channels */
  openChannels: number;
  /** Total deposited */
  totalDeposited: string;
  /** Total spent */
  totalSpent: string;
  /** Total refunded */
  totalRefunded: string;
}

/**
 * Batch payment for multiple small payments
 */
export interface BatchPayment {
  /** Payments in this batch */
  payments: Array<{
    channelId: string;
    amount: string;
  }>;
  /** Batch signature */
  batchSignature: string;
  /** Batch nonce */
  batchNonce: number;
}

/**
 * Batch payment item for single channel batch payments
 */
export interface BatchPaymentItem {
  /** Amount for this payment */
  amount: string;
  /** Optional memo/description */
  memo?: string;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Batch payment receipt
 */
export interface BatchPaymentReceipt {
  /** Single signature covering all payments */
  signature: string;
  /** Individual payments in the batch */
  payments: Array<{
    amount: string;
    memo?: string;
    nonce: number;
  }>;
  /** Total amount of all payments */
  totalAmount: string;
  /** Number of payments in batch */
  count: number;
  /** Timestamp */
  timestamp: string;
}

/**
 * Auto-topup status
 */
export interface AutoTopupStatus {
  /** Whether auto-topup is enabled */
  enabled: boolean;
  /** Balance threshold that triggers topup */
  threshold: string;
  /** Amount to add when threshold is reached */
  topupAmount: string;
  /** Remaining topups (number or 'unlimited') */
  topupsRemaining: number | 'unlimited';
  /** Total topups performed */
  totalTopups: number;
}

/**
 * Extended channel statistics (per channel)
 */
export interface ExtendedChannelStats {
  /** Total number of payments */
  totalPayments: number;
  /** Total volume transacted */
  totalVolume: string;
  /** Average payment size */
  averagePayment: string;
  /** Largest single payment */
  largestPayment: string;
  /** Smallest single payment */
  smallestPayment: string;
  /** Payments per hour rate */
  paymentsPerHour: number;
  /** Channel age in seconds */
  channelAge: number;
  /** Number of topups performed */
  topupCount: number;
}
