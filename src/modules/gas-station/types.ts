/**
 * Gas Station Types - Circle Gas Station integration
 */

/**
 * Gas sponsorship policy configuration
 */
export interface GasSponsorPolicy {
  /** Policy name */
  name: string;
  /** Maximum gas per transaction (in wei) */
  maxGasPerTx: string;
  /** Maximum total gas per user per day (in wei) */
  maxGasPerUserDaily: string;
  /** Maximum total gas per day across all users */
  maxTotalDaily: string;
  /** Allowed contract addresses (empty = all allowed) */
  allowedContracts: string[];
  /** Allowed function selectors (empty = all allowed) */
  allowedFunctions: string[];
  /** Whether to require user registration */
  requireRegistration: boolean;
  /** User tier requirements */
  tierRequirements?: {
    minTransactions?: number;
    minVolume?: string;
    requiredNFT?: string;
  };
}

/**
 * User gas usage stats
 */
export interface UserGasStats {
  /** User address */
  address: string;
  /** Total gas sponsored today */
  gasToday: string;
  /** Total gas sponsored all time */
  gasAllTime: string;
  /** Number of sponsored transactions today */
  txCountToday: number;
  /** Number of sponsored transactions all time */
  txCountAllTime: number;
  /** Last sponsored transaction timestamp */
  lastSponsored?: string;
  /** User tier */
  tier: 'free' | 'basic' | 'premium' | 'unlimited';
}

/**
 * Gas sponsorship request
 */
export interface GasSponsorshipRequest {
  /** User address */
  userAddress: string;
  /** Target contract address */
  to: string;
  /** Transaction data */
  data: string;
  /** Estimated gas */
  estimatedGas: string;
  /** Optional: specific policy to use */
  policyName?: string;
}

/**
 * Gas sponsorship result
 */
export interface GasSponsorshipResult {
  /** Whether sponsorship was approved */
  approved: boolean;
  /** Reason if rejected */
  reason?: string;
  /** Sponsored transaction hash (if approved and executed) */
  txHash?: string;
  /** Amount of gas sponsored */
  gasSponsored?: string;
  /** Policy used */
  policyUsed?: string;
  /** Updated user stats */
  userStats?: UserGasStats;
}

/**
 * Gas station configuration
 */
export interface GasStationConfig {
  /** Wallet private key for sponsoring */
  privateKey: string;
  /** Default policy */
  defaultPolicy?: GasSponsorPolicy;
  /** Named policies */
  policies?: Record<string, GasSponsorPolicy>;
  /** Webhook URL for notifications */
  webhookUrl?: string;
  /** Enable dry-run mode (simulate without executing) */
  dryRun?: boolean;
}

/**
 * Gas station stats
 */
export interface GasStationStats {
  /** Total gas sponsored today */
  gasToday: string;
  /** Total gas sponsored all time */
  gasAllTime: string;
  /** Number of sponsored transactions today */
  txCountToday: number;
  /** Number of users sponsored today */
  usersToday: number;
  /** Remaining daily budget */
  remainingDailyBudget: string;
  /** Active policies */
  activePolicies: string[];
}

/**
 * Relayer transaction for meta-transactions
 */
export interface RelayerTransaction {
  /** Original sender */
  from: string;
  /** Target contract */
  to: string;
  /** Transaction data */
  data: string;
  /** Nonce */
  nonce: number;
  /** Signature */
  signature: string;
  /** Deadline timestamp */
  deadline: number;
}

/**
 * EIP-2771 forwarder interface
 */
export interface ForwarderRequest {
  from: string;
  to: string;
  value: string;
  gas: string;
  nonce: string;
  data: string;
}
