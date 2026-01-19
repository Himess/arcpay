/**
 * Stream Payments Types
 */

/**
 * Stream state
 */
export type StreamState = 'pending' | 'active' | 'paused' | 'completed' | 'cancelled';

/**
 * Stream configuration
 */
export interface StreamConfig {
  /** Wallet private key */
  privateKey: string;
  /** Stream contract address (optional) */
  streamContract?: string;
  /** Custom RPC URL */
  rpcUrl?: string;
}

/**
 * Create stream parameters
 */
export interface CreateStreamParams {
  /** Recipient address */
  recipient: string;
  /** Total amount to stream */
  totalAmount: string;
  /** Duration in seconds */
  duration: number;
  /** Start time (optional, defaults to now) */
  startAt?: number;
}

/**
 * Stream info
 */
export interface Stream {
  /** Stream ID */
  id: string;
  /** Sender address */
  sender: string;
  /** Recipient address */
  recipient: string;
  /** Total amount */
  totalAmount: string;
  /** Claimed amount */
  claimedAmount: string;
  /** Rate per second */
  ratePerSecond: string;
  /** Start time (unix timestamp) */
  startTime: number;
  /** End time (unix timestamp) */
  endTime: number;
  /** Current state */
  state: StreamState;
  /** Transaction hash */
  txHash?: string;
  /** Created timestamp */
  createdAt: string;
}

/**
 * Claim result
 */
export interface ClaimResult {
  /** Success status */
  success: boolean;
  /** Stream ID */
  streamId: string;
  /** Amount claimed */
  amountClaimed: string;
  /** Transaction hash */
  txHash: string;
  /** Error message */
  error?: string;
}

/**
 * Cancel result
 */
export interface CancelResult {
  /** Success status */
  success: boolean;
  /** Stream ID */
  streamId: string;
  /** Amount refunded to sender */
  refundedAmount: string;
  /** Amount sent to recipient */
  recipientAmount: string;
  /** Transaction hash */
  txHash: string;
  /** Error message */
  error?: string;
}

/**
 * Claimable info
 */
export interface ClaimableInfo {
  /** Stream ID */
  streamId: string;
  /** Claimable amount */
  claimable: string;
  /** Total claimed so far */
  totalClaimed: string;
  /** Remaining to be streamed */
  remaining: string;
  /** Progress percentage */
  progress: number;
}

/**
 * Stream stats
 */
export interface StreamStats {
  /** Total streams created */
  totalCreated: number;
  /** Currently active streams */
  activeCount: number;
  /** Total volume streamed */
  totalVolume: string;
  /** Total claimed */
  totalClaimed: string;
}

/**
 * Pause/Resume result
 */
export interface PauseResumeResult {
  /** Success status */
  success: boolean;
  /** Stream ID */
  streamId: string;
  /** Transaction hash */
  txHash?: string;
  /** Error message */
  error?: string;
}
