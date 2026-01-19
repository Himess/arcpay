/**
 * Smart Wallet Types - ERC-4337 Account Abstraction
 */

/**
 * User operation for ERC-4337
 */
export interface UserOperation {
  /** Smart wallet address */
  sender: string;
  /** Nonce */
  nonce: string;
  /** Init code (for wallet deployment) */
  initCode: string;
  /** Call data */
  callData: string;
  /** Call gas limit */
  callGasLimit: string;
  /** Verification gas limit */
  verificationGasLimit: string;
  /** Pre-verification gas */
  preVerificationGas: string;
  /** Max fee per gas */
  maxFeePerGas: string;
  /** Max priority fee per gas */
  maxPriorityFeePerGas: string;
  /** Paymaster and data */
  paymasterAndData: string;
  /** Signature */
  signature: string;
}

/**
 * Smart wallet configuration
 */
export interface SmartWalletConfig {
  /** Owner private key or signer */
  ownerKey: string;
  /** Entry point address */
  entryPoint?: string;
  /** Wallet factory address */
  factory?: string;
  /** Bundler URL */
  bundlerUrl?: string;
  /** Paymaster URL (for sponsored transactions) */
  paymasterUrl?: string;
  /** Salt for deterministic deployment */
  salt?: string;
}

/**
 * Smart wallet info
 */
export interface SmartWalletInfo {
  /** Smart wallet address */
  address: string;
  /** Owner address */
  owner: string;
  /** Whether deployed on chain */
  isDeployed: boolean;
  /** Current nonce */
  nonce: string;
  /** Wallet balance */
  balance: string;
}

/**
 * Batch operation
 */
export interface BatchOperation {
  /** Target address */
  to: string;
  /** Value to send */
  value: string;
  /** Call data */
  data: string;
}

/**
 * Transaction options
 */
export interface SmartWalletTxOptions {
  /** Use paymaster for gas */
  sponsored?: boolean;
  /** Gas limit override */
  gasLimit?: string;
  /** Priority fee override */
  priorityFee?: string;
}

/**
 * User operation result
 */
export interface UserOperationResult {
  /** User operation hash */
  userOpHash: string;
  /** Transaction hash (after inclusion) */
  txHash?: string;
  /** Whether operation succeeded */
  success: boolean;
  /** Gas used */
  actualGasUsed?: string;
  /** Error reason if failed */
  reason?: string;
}

/**
 * Session key configuration
 */
export interface SessionKeyConfig {
  /** Session key public address */
  sessionKey: string;
  /** Valid until timestamp */
  validUntil: number;
  /** Valid after timestamp */
  validAfter: number;
  /** Allowed target addresses */
  allowedTargets: string[];
  /** Allowed function selectors */
  allowedSelectors: string[];
  /** Spending limit per transaction */
  spendingLimit?: string;
  /** Total spending limit */
  totalSpendingLimit?: string;
}

/**
 * Session key info
 */
export interface SessionKeyInfo extends SessionKeyConfig {
  /** Whether session is active */
  isActive: boolean;
  /** Amount spent so far */
  amountSpent: string;
  /** Number of transactions */
  txCount: number;
}

/**
 * Recovery config
 */
export interface RecoveryConfig {
  /** Guardian addresses */
  guardians: string[];
  /** Required signatures for recovery */
  threshold: number;
  /** Delay before recovery executes */
  delayPeriod: number;
}

/**
 * Recovery request
 */
export interface RecoveryRequest {
  /** Request ID */
  id: string;
  /** New owner address */
  newOwner: string;
  /** Timestamp when request was created */
  createdAt: number;
  /** Timestamp when recovery can execute */
  executeAfter: number;
  /** Current approvals */
  approvals: string[];
  /** Whether executed */
  executed: boolean;
}

/**
 * Paymaster data
 */
export interface PaymasterData {
  /** Paymaster address */
  address: string;
  /** Paymaster type */
  type: 'verifying' | 'deposit' | 'token';
  /** Additional data */
  data?: string;
  /** Token address (for token paymaster) */
  token?: string;
  /** Exchange rate (for token paymaster) */
  exchangeRate?: string;
}

/**
 * Bundler response
 */
export interface BundlerResponse {
  /** User operation hash */
  userOperationHash: string;
}

/**
 * User operation receipt
 */
export interface UserOperationReceipt {
  /** User operation hash */
  userOpHash: string;
  /** Entry point address */
  entryPoint: string;
  /** Sender address */
  sender: string;
  /** Nonce */
  nonce: string;
  /** Paymaster address */
  paymaster?: string;
  /** Actual gas cost */
  actualGasCost: string;
  /** Actual gas used */
  actualGasUsed: string;
  /** Whether operation succeeded */
  success: boolean;
  /** Logs */
  logs: unknown[];
  /** Transaction receipt */
  receipt: {
    transactionHash: string;
    blockNumber: string;
    blockHash: string;
  };
}
