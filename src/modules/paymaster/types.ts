/**
 * Spending rules for gas sponsorship
 */
export interface SpendingRules {
  /** Maximum USDC per single transaction */
  maxPerTransaction?: string;
  /** Maximum USDC per user per day */
  maxPerUserDaily?: string;
  /** Total daily budget */
  dailyBudget?: string;
  /** Whitelist of contract addresses (empty = allow all) */
  allowedContracts?: string[];
  /** Whitelist of function selectors */
  allowedMethods?: string[];
}

/**
 * Request for sponsoring a transaction
 */
export interface SponsorRequest {
  /** User's address */
  userAddress: string;
  /** Target contract address */
  to: string;
  /** Encoded function call data */
  data: string;
  /** Value to send (in USDC, optional) */
  value?: string;
}

/**
 * Result of a sponsored transaction
 */
export interface SponsorResult {
  success: boolean;
  /** Transaction hash */
  txHash?: string;
  /** Amount of gas sponsored in USDC */
  sponsoredAmount?: string;
  /** Explorer URL */
  explorerUrl?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Daily spending stats for a user
 */
export interface UserSpendingStats {
  address: string;
  dailySpent: string;
  transactionCount: number;
  lastTransaction?: string;
}

/**
 * Paymaster stats
 */
export interface PaymasterStats {
  totalSponsored: string;
  dailySponsored: string;
  transactionCount: number;
  uniqueUsers: number;
}
