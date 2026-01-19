/**
 * Agent module types - Autonomous payment engine for AI agents
 */

/**
 * Spending policy for autonomous agents
 */
export interface AgentPolicy {
  /** Max amount per single transaction (e.g., "1.00") */
  maxPerTransaction: string;
  /** Max daily spending (e.g., "50.00") */
  dailyBudget: string;
  /** Optional monthly limit */
  monthlyBudget?: string;

  /** Whitelist patterns for allowed endpoints (e.g., ["api.example.com/*"]) */
  allowedEndpoints?: string[];
  /** Blacklist patterns for blocked endpoints */
  blockedEndpoints?: string[];

  /** Approval thresholds for human review */
  requireApproval?: {
    /** Amount threshold that triggers approval requirement */
    above: string;
  };

  /** Allowed assets (e.g., ["USDC", "EURC"]) */
  allowedAssets?: string[];
}

/**
 * Agent configuration
 */
export interface AgentConfig {
  /** Private key for wallet */
  wallet: `0x${string}` | string;
  /** Spending policies */
  policies: AgentPolicy;
  /** Network (default: arc-testnet) */
  network?: string;
  /** x402 facilitator URL */
  facilitatorUrl?: string;
}

/**
 * Agent state information
 */
export interface AgentState {
  /** Wallet address */
  address: string;
  /** Current USDC balance */
  balance: string;
  /** Amount spent today */
  dailySpent: string;
  /** Amount spent this month */
  monthlySpent: string;
  /** Total transaction count */
  transactionCount: number;
  /** Last reset date */
  lastResetDate: string;
}

/**
 * Auto-pay request options
 */
export interface AutoPayOptions {
  /** Target URL */
  url: string;
  /** Maximum price willing to pay */
  maxPrice: string;
  /** HTTP method */
  method?: 'GET' | 'POST';
  /** Request body (for POST) */
  body?: unknown;
  /** Additional headers */
  headers?: Record<string, string>;
  /** Request timeout in ms */
  timeout?: number;
}

/**
 * Auto-pay result
 */
export interface AutoPayResult {
  /** Whether request succeeded */
  success: boolean;
  /** Response data */
  response?: unknown;
  /** Payment details (if payment was made) */
  payment?: {
    /** Amount paid */
    amount: string;
    /** Transaction hash */
    txHash?: string;
    /** Settlement timestamp */
    settledAt?: string;
  };
  /** Error message */
  error?: string;
  /** Policy violation reason */
  policyViolation?: string;
}

/**
 * Treasury statistics
 */
export interface TreasuryStats {
  /** Total amount spent all-time */
  totalSpent: string;
  /** Amount spent today */
  dailySpent: string;
  /** Amount spent this month */
  monthlySpent: string;
  /** Remaining daily budget */
  remainingDailyBudget: string;
  /** Remaining monthly budget (if set) */
  remainingMonthlyBudget?: string;
  /** Recent transaction history */
  transactionHistory: TransactionRecord[];
}

/**
 * Transaction record
 */
export interface TransactionRecord {
  /** Unique ID */
  id: string;
  /** Timestamp */
  timestamp: string;
  /** Target endpoint */
  endpoint: string;
  /** Amount paid */
  amount: string;
  /** Transaction hash */
  txHash?: string;
  /** Status */
  status: 'pending' | 'settled' | 'failed';
}

/**
 * Policy check result
 */
export interface PolicyCheckResult {
  /** Whether payment is allowed */
  allowed: boolean;
  /** Reason if not allowed */
  reason?: string;
}
