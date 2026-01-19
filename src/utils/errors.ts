/**
 * ArcPay SDK Error System
 *
 * Comprehensive error handling with:
 * - Error codes and categories
 * - Retryable vs non-retryable classification
 * - Recovery suggestions
 * - Serialization for logging
 */

/**
 * Error category for classification
 */
export type ErrorCategory =
  | 'NETWORK'
  | 'TRANSACTION'
  | 'VALIDATION'
  | 'CONTRACT'
  | 'AUTHENTICATION'
  | 'BALANCE'
  | 'COMPLIANCE'
  | 'TIMEOUT'
  | 'RATE_LIMIT'
  | 'INTERNAL'
  | 'AGENT'
  | 'CHANNEL';

/**
 * Error codes with descriptive names
 */
export const ErrorCodes = {
  // Network errors (1xxx)
  NETWORK_ERROR: 1001,
  RPC_ERROR: 1002,
  CONNECTION_TIMEOUT: 1003,
  DNS_RESOLUTION_FAILED: 1004,
  SSL_ERROR: 1005,

  // Transaction errors (2xxx)
  TRANSACTION_FAILED: 2001,
  TRANSACTION_REVERTED: 2002,
  TRANSACTION_TIMEOUT: 2003,
  TRANSACTION_UNDERPRICED: 2004,
  NONCE_TOO_LOW: 2005,
  NONCE_TOO_HIGH: 2006,
  GAS_ESTIMATION_FAILED: 2007,
  INSUFFICIENT_GAS: 2008,
  TRANSACTION_REPLACED: 2009,

  // Validation errors (3xxx)
  VALIDATION_ERROR: 3001,
  INVALID_ADDRESS: 3002,
  INVALID_AMOUNT: 3003,
  INVALID_SIGNATURE: 3004,
  INVALID_PARAMETER: 3005,
  MISSING_PARAMETER: 3006,

  // Contract errors (4xxx)
  CONTRACT_ERROR: 4001,
  CONTRACT_NOT_DEPLOYED: 4002,
  CONTRACT_CALL_FAILED: 4003,
  CONTRACT_REVERT: 4004,
  ABI_ENCODING_ERROR: 4005,

  // Authentication errors (5xxx)
  SIGNER_REQUIRED: 5001,
  INVALID_PRIVATE_KEY: 5002,
  SIGNATURE_VERIFICATION_FAILED: 5003,
  UNAUTHORIZED: 5004,

  // Balance errors (6xxx)
  INSUFFICIENT_BALANCE: 6001,
  INSUFFICIENT_ALLOWANCE: 6002,
  INSUFFICIENT_GAS_BALANCE: 6003,

  // Compliance errors (7xxx)
  COMPLIANCE_ERROR: 7001,
  SANCTIONED_ADDRESS: 7002,
  KYC_REQUIRED: 7003,
  TRANSACTION_BLOCKED: 7004,
  VELOCITY_LIMIT_EXCEEDED: 7005,

  // Timeout errors (8xxx)
  TIMEOUT_ERROR: 8001,
  OPERATION_TIMEOUT: 8002,
  CONFIRMATION_TIMEOUT: 8003,

  // Rate limit errors (9xxx)
  RATE_LIMIT_ERROR: 9001,
  TOO_MANY_REQUESTS: 9002,
  BUNDLER_RATE_LIMITED: 9003,

  // Internal errors (10xxx)
  INTERNAL_ERROR: 10001,
  UNKNOWN_ERROR: 10002,
  NOT_IMPLEMENTED: 10003,

  // Agent errors (11xxx)
  RECIPIENT_BLACKLISTED: 11001,
  RECIPIENT_NOT_WHITELISTED: 11002,
  OUTSIDE_ACTIVE_HOURS: 11003,
  CATEGORY_BUDGET_EXCEEDED: 11004,
  HUMAN_APPROVAL_DENIED: 11005,
  AGENT_BUDGET_EXCEEDED: 11006,

  // Channel errors (12xxx)
  CHANNEL_NOT_FOUND: 12001,
  CHANNEL_EXPIRED: 12002,
  CHANNEL_CLOSED: 12003,
  CHANNEL_INSUFFICIENT_FUNDS: 12004,
  CHANNEL_DISPUTED: 12005,
  BATCH_PAYMENT_FAILED: 12006,
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Error metadata for additional context
 */
export interface ErrorMetadata {
  txHash?: string;
  address?: string;
  amount?: string;
  token?: string;
  contractAddress?: string;
  blockNumber?: number;
  gasUsed?: string;
  reason?: string;
  [key: string]: unknown;
}

/**
 * Serialized error format for logging
 */
export interface SerializedError {
  name: string;
  message: string;
  code: number;
  category: ErrorCategory;
  retryable: boolean;
  recovery?: string;
  metadata?: ErrorMetadata;
  stack?: string;
  timestamp: string;
}

/**
 * Base error class for ArcPay SDK
 */
export class ArcPayError extends Error {
  public readonly code: number;
  public readonly category: ErrorCategory;
  public readonly retryable: boolean;
  public readonly recovery?: string;
  public readonly metadata?: ErrorMetadata;
  public readonly timestamp: Date;

  constructor(
    message: string,
    code: number,
    category: ErrorCategory,
    options?: {
      retryable?: boolean;
      recovery?: string;
      metadata?: ErrorMetadata;
      cause?: unknown;
    }
  ) {
    super(message);
    this.name = 'ArcPayError';
    this.code = code;
    this.category = category;
    this.retryable = options?.retryable ?? false;
    this.recovery = options?.recovery;
    this.metadata = options?.metadata;
    this.timestamp = new Date();

    if (options?.cause) {
      this.cause = options.cause;
    }

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Serialize error for logging
   */
  toJSON(): SerializedError {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      category: this.category,
      retryable: this.retryable,
      recovery: this.recovery,
      metadata: this.metadata,
      stack: this.stack,
      timestamp: this.timestamp.toISOString(),
    };
  }

  /**
   * Create a string representation
   */
  toString(): string {
    return `[${this.code}] ${this.name}: ${this.message}`;
  }
}

/**
 * Network connection error
 */
export class NetworkError extends ArcPayError {
  constructor(message: string, options?: { cause?: unknown; metadata?: ErrorMetadata }) {
    super(message, ErrorCodes.NETWORK_ERROR, 'NETWORK', {
      retryable: true,
      recovery: 'Check your internet connection and try again. If the problem persists, the RPC endpoint may be down.',
      ...options,
    });
    this.name = 'NetworkError';
  }
}

/**
 * RPC error from blockchain node
 */
export class RPCError extends ArcPayError {
  constructor(message: string, options?: { cause?: unknown; metadata?: ErrorMetadata }) {
    super(message, ErrorCodes.RPC_ERROR, 'NETWORK', {
      retryable: true,
      recovery: 'The RPC endpoint returned an error. Try again or switch to a different RPC endpoint.',
      ...options,
    });
    this.name = 'RPCError';
  }
}

/**
 * Connection timeout error
 */
export class ConnectionTimeoutError extends ArcPayError {
  constructor(endpoint: string, timeoutMs: number) {
    super(
      `Connection to ${endpoint} timed out after ${timeoutMs}ms`,
      ErrorCodes.CONNECTION_TIMEOUT,
      'TIMEOUT',
      {
        retryable: true,
        recovery: 'The connection timed out. Check your network or try a different RPC endpoint.',
        metadata: { endpoint, timeoutMs },
      }
    );
    this.name = 'ConnectionTimeoutError';
  }
}

/**
 * Transaction error
 */
export class TransactionError extends ArcPayError {
  constructor(
    message: string,
    options?: {
      txHash?: string;
      cause?: unknown;
      metadata?: ErrorMetadata;
    }
  ) {
    super(message, ErrorCodes.TRANSACTION_FAILED, 'TRANSACTION', {
      retryable: false,
      recovery: 'The transaction failed. Check the transaction details and try again.',
      metadata: { txHash: options?.txHash, ...options?.metadata },
      cause: options?.cause,
    });
    this.name = 'TransactionError';
  }
}

/**
 * Transaction reverted error
 */
export class TransactionRevertedError extends ArcPayError {
  constructor(
    reason: string,
    options?: {
      txHash?: string;
      contractAddress?: string;
      metadata?: ErrorMetadata;
    }
  ) {
    super(
      `Transaction reverted: ${reason}`,
      ErrorCodes.TRANSACTION_REVERTED,
      'TRANSACTION',
      {
        retryable: false,
        recovery: 'The transaction was reverted by the contract. Check the revert reason and fix the issue.',
        metadata: { reason, txHash: options?.txHash, contractAddress: options?.contractAddress, ...options?.metadata },
      }
    );
    this.name = 'TransactionRevertedError';
  }
}

/**
 * Transaction timeout error
 */
export class TransactionTimeoutError extends ArcPayError {
  constructor(txHash: string, timeoutMs: number) {
    super(
      `Transaction ${txHash} was not confirmed within ${timeoutMs}ms`,
      ErrorCodes.TRANSACTION_TIMEOUT,
      'TIMEOUT',
      {
        retryable: true,
        recovery: 'The transaction was not confirmed in time. It may still be pending. Check the transaction status.',
        metadata: { txHash, timeoutMs },
      }
    );
    this.name = 'TransactionTimeoutError';
  }
}

/**
 * Transaction underpriced error
 */
export class TransactionUnderpricedError extends ArcPayError {
  constructor(options?: { currentGasPrice?: string; requiredGasPrice?: string }) {
    super(
      'Transaction underpriced. Gas price too low.',
      ErrorCodes.TRANSACTION_UNDERPRICED,
      'TRANSACTION',
      {
        retryable: true,
        recovery: 'Increase the gas price and try again.',
        metadata: options,
      }
    );
    this.name = 'TransactionUnderpricedError';
  }
}

/**
 * Nonce error
 */
export class NonceError extends ArcPayError {
  constructor(type: 'low' | 'high', expected: number, got: number) {
    super(
      `Nonce too ${type}. Expected: ${expected}, Got: ${got}`,
      type === 'low' ? ErrorCodes.NONCE_TOO_LOW : ErrorCodes.NONCE_TOO_HIGH,
      'TRANSACTION',
      {
        retryable: true,
        recovery: type === 'low'
          ? 'A transaction with this nonce was already mined. Get the latest nonce and retry.'
          : 'There are pending transactions. Wait for them to be mined or cancel them.',
        metadata: { expected, got },
      }
    );
    this.name = 'NonceError';
  }
}

/**
 * Gas estimation error
 */
export class GasEstimationError extends ArcPayError {
  constructor(message: string, options?: { cause?: unknown; metadata?: ErrorMetadata }) {
    super(message, ErrorCodes.GAS_ESTIMATION_FAILED, 'TRANSACTION', {
      retryable: false,
      recovery: 'Gas estimation failed. The transaction may revert. Check the contract and parameters.',
      ...options,
    });
    this.name = 'GasEstimationError';
  }
}

/**
 * Validation error
 */
export class ValidationError extends ArcPayError {
  constructor(message: string, options?: { field?: string; value?: unknown }) {
    super(message, ErrorCodes.VALIDATION_ERROR, 'VALIDATION', {
      retryable: false,
      recovery: 'Fix the validation error and try again.',
      metadata: options as ErrorMetadata,
    });
    this.name = 'ValidationError';
  }
}

/**
 * Invalid address error
 */
export class InvalidAddressError extends ArcPayError {
  constructor(address: string) {
    super(
      `Invalid address: ${address}`,
      ErrorCodes.INVALID_ADDRESS,
      'VALIDATION',
      {
        retryable: false,
        recovery: 'Provide a valid Ethereum address (0x followed by 40 hex characters).',
        metadata: { address },
      }
    );
    this.name = 'InvalidAddressError';
  }
}

/**
 * Invalid amount error
 */
export class InvalidAmountError extends ArcPayError {
  constructor(amount: string, reason?: string) {
    super(
      `Invalid amount: ${amount}${reason ? ` - ${reason}` : ''}`,
      ErrorCodes.INVALID_AMOUNT,
      'VALIDATION',
      {
        retryable: false,
        recovery: 'Provide a valid positive number.',
        metadata: { amount, reason },
      }
    );
    this.name = 'InvalidAmountError';
  }
}

/**
 * Contract error
 */
export class ContractError extends ArcPayError {
  constructor(message: string, options?: { contractAddress?: string; cause?: unknown; metadata?: ErrorMetadata }) {
    super(message, ErrorCodes.CONTRACT_ERROR, 'CONTRACT', {
      retryable: false,
      recovery: 'Check the contract interaction and parameters.',
      metadata: { contractAddress: options?.contractAddress, ...options?.metadata },
      cause: options?.cause,
    });
    this.name = 'ContractError';
  }
}

/**
 * Contract not deployed error
 */
export class ContractNotDeployedError extends ArcPayError {
  constructor(contractAddress: string) {
    super(
      `Contract not deployed at ${contractAddress}`,
      ErrorCodes.CONTRACT_NOT_DEPLOYED,
      'CONTRACT',
      {
        retryable: false,
        recovery: 'Ensure the contract is deployed on the correct network.',
        metadata: { contractAddress },
      }
    );
    this.name = 'ContractNotDeployedError';
  }
}

/**
 * Signer required error
 */
export class SignerRequiredError extends ArcPayError {
  constructor(operation: string) {
    super(
      `Signer (private key) required for ${operation}. Initialize ArcPay with privateKey option.`,
      ErrorCodes.SIGNER_REQUIRED,
      'AUTHENTICATION',
      {
        retryable: false,
        recovery: 'Provide a private key when initializing ArcPay.',
        metadata: { operation },
      }
    );
    this.name = 'SignerRequiredError';
  }
}

/**
 * Invalid private key error
 */
export class InvalidPrivateKeyError extends ArcPayError {
  constructor() {
    super(
      'Invalid private key format',
      ErrorCodes.INVALID_PRIVATE_KEY,
      'AUTHENTICATION',
      {
        retryable: false,
        recovery: 'Provide a valid private key (64 hex characters, optionally prefixed with 0x).',
      }
    );
    this.name = 'InvalidPrivateKeyError';
  }
}

/**
 * Insufficient balance error
 */
export class InsufficientBalanceError extends ArcPayError {
  constructor(
    public readonly required: string,
    public readonly available: string,
    public readonly token: string
  ) {
    super(
      `Insufficient ${token} balance. Required: ${required}, Available: ${available}`,
      ErrorCodes.INSUFFICIENT_BALANCE,
      'BALANCE',
      {
        retryable: false,
        recovery: `Ensure you have at least ${required} ${token} in your wallet.`,
        metadata: { required, available, token },
      }
    );
    this.name = 'InsufficientBalanceError';
  }
}

/**
 * Insufficient allowance error
 */
export class InsufficientAllowanceError extends ArcPayError {
  constructor(
    public readonly required: string,
    public readonly allowed: string,
    public readonly token: string,
    public readonly spender: string
  ) {
    super(
      `Insufficient ${token} allowance for ${spender}. Required: ${required}, Allowed: ${allowed}`,
      ErrorCodes.INSUFFICIENT_ALLOWANCE,
      'BALANCE',
      {
        retryable: false,
        recovery: `Approve ${spender} to spend at least ${required} ${token}.`,
        metadata: { required, allowed, token, spender },
      }
    );
    this.name = 'InsufficientAllowanceError';
  }
}

/**
 * Compliance error
 */
export class ComplianceError extends ArcPayError {
  constructor(message: string, options?: { address?: string; reason?: string; metadata?: ErrorMetadata }) {
    super(message, ErrorCodes.COMPLIANCE_ERROR, 'COMPLIANCE', {
      retryable: false,
      recovery: 'This address or transaction has been flagged for compliance reasons.',
      metadata: { address: options?.address, reason: options?.reason, ...options?.metadata },
    });
    this.name = 'ComplianceError';
  }
}

/**
 * Sanctioned address error
 */
export class SanctionedAddressError extends ArcPayError {
  constructor(address: string, lists?: string[]) {
    super(
      `Address ${address} is on sanctions list`,
      ErrorCodes.SANCTIONED_ADDRESS,
      'COMPLIANCE',
      {
        retryable: false,
        recovery: 'Transactions with sanctioned addresses are prohibited.',
        metadata: { address, lists },
      }
    );
    this.name = 'SanctionedAddressError';
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends ArcPayError {
  constructor(retryAfterMs?: number) {
    super(
      'Rate limit exceeded',
      ErrorCodes.RATE_LIMIT_ERROR,
      'RATE_LIMIT',
      {
        retryable: true,
        recovery: retryAfterMs
          ? `Wait ${Math.ceil(retryAfterMs / 1000)} seconds before retrying.`
          : 'Wait and try again later.',
        metadata: { retryAfterMs },
      }
    );
    this.name = 'RateLimitError';
  }
}

/**
 * USYC not allowed error
 */
export class USYCNotAllowedError extends ArcPayError {
  constructor(address: string) {
    super(
      `Address ${address} is not on the USYC allowlist`,
      ErrorCodes.UNAUTHORIZED,
      'AUTHENTICATION',
      {
        retryable: false,
        recovery: 'Apply at https://usyc.dev.hashnote.com/ to get on the allowlist.',
        metadata: { address },
      }
    );
    this.name = 'USYCNotAllowedError';
  }
}

/**
 * Operation timeout error
 */
export class OperationTimeoutError extends ArcPayError {
  constructor(operation: string, timeoutMs: number) {
    super(
      `Operation "${operation}" timed out after ${timeoutMs}ms`,
      ErrorCodes.OPERATION_TIMEOUT,
      'TIMEOUT',
      {
        retryable: true,
        recovery: 'The operation took too long. Try again.',
        metadata: { operation, timeoutMs },
      }
    );
    this.name = 'OperationTimeoutError';
  }
}

/**
 * Not implemented error
 */
export class NotImplementedError extends ArcPayError {
  constructor(feature: string) {
    super(
      `Feature "${feature}" is not implemented yet`,
      ErrorCodes.NOT_IMPLEMENTED,
      'INTERNAL',
      {
        retryable: false,
        recovery: 'This feature is coming soon.',
        metadata: { feature },
      }
    );
    this.name = 'NotImplementedError';
  }
}

// ============================================
// AGENT MODULE ERRORS
// ============================================

/**
 * Recipient blacklisted error
 */
export class RecipientBlacklistedError extends ArcPayError {
  constructor(recipient: string, blockedAt?: string) {
    super(
      `Payment blocked: Recipient ${recipient} is blacklisted`,
      ErrorCodes.RECIPIENT_BLACKLISTED,
      'AGENT',
      {
        retryable: false,
        recovery: 'Remove address from blacklist using agent.removeFromBlacklist()',
        metadata: { recipient, blockedAt },
      }
    );
    this.name = 'RecipientBlacklistedError';
  }
}

/**
 * Recipient not whitelisted error
 */
export class RecipientNotWhitelistedError extends ArcPayError {
  constructor(recipient: string) {
    super(
      `Payment blocked: Recipient ${recipient} is not in whitelist`,
      ErrorCodes.RECIPIENT_NOT_WHITELISTED,
      'AGENT',
      {
        retryable: false,
        recovery: 'Add address to whitelist using agent.addToWhitelist()',
        metadata: { recipient },
      }
    );
    this.name = 'RecipientNotWhitelistedError';
  }
}

/**
 * Outside active hours error
 */
export class OutsideActiveHoursError extends ArcPayError {
  constructor(
    currentTime: string,
    activeHours: string,
    nextWindow: string
  ) {
    super(
      `Payment blocked: Outside active hours`,
      ErrorCodes.OUTSIDE_ACTIVE_HOURS,
      'AGENT',
      {
        retryable: true,
        recovery: 'Wait for next active window or update activeHours config',
        metadata: { currentTime, activeHours, nextWindow },
      }
    );
    this.name = 'OutsideActiveHoursError';
  }
}

/**
 * Category budget exceeded error
 */
export class CategoryBudgetExceededError extends ArcPayError {
  constructor(
    category: string,
    limit: string,
    spent: string,
    requested: string
  ) {
    super(
      `Category budget exceeded`,
      ErrorCodes.CATEGORY_BUDGET_EXCEEDED,
      'AGENT',
      {
        retryable: false,
        recovery: 'Increase category budget or wait for daily reset',
        metadata: { category, limit, spent, requested },
      }
    );
    this.name = 'CategoryBudgetExceededError';
  }
}

/**
 * Human approval denied error
 */
export class HumanApprovalDeniedError extends ArcPayError {
  constructor(amount: string, recipient: string) {
    super(
      `Payment blocked: Human approval denied for ${amount} USDC`,
      ErrorCodes.HUMAN_APPROVAL_DENIED,
      'AGENT',
      {
        retryable: false,
        recovery: 'Request approval again or reduce payment amount',
        metadata: { amount, recipient },
      }
    );
    this.name = 'HumanApprovalDeniedError';
  }
}

/**
 * Agent budget exceeded error
 */
export class AgentBudgetExceededError extends ArcPayError {
  constructor(
    limitType: 'daily' | 'hourly' | 'perTransaction',
    limit: string,
    current: string,
    requested: string
  ) {
    super(
      `${limitType} spending limit exceeded`,
      ErrorCodes.AGENT_BUDGET_EXCEEDED,
      'AGENT',
      {
        retryable: limitType !== 'perTransaction',
        recovery: limitType === 'perTransaction'
          ? 'Reduce payment amount below per-transaction limit'
          : `Wait for ${limitType} limit reset or increase budget`,
        metadata: { limitType, limit, current, requested },
      }
    );
    this.name = 'AgentBudgetExceededError';
  }
}

// ============================================
// CHANNEL MODULE ERRORS
// ============================================

/**
 * Channel not found error
 */
export class ChannelNotFoundError extends ArcPayError {
  constructor(channelId: string) {
    super(
      `Channel not found: ${channelId}`,
      ErrorCodes.CHANNEL_NOT_FOUND,
      'CHANNEL',
      {
        retryable: false,
        recovery: 'Create a new channel using channels.createChannel()',
        metadata: { channelId },
      }
    );
    this.name = 'ChannelNotFoundError';
  }
}

/**
 * Channel expired error
 */
export class ChannelExpiredError extends ArcPayError {
  constructor(channelId: string, expiredAt: string) {
    super(
      `Channel has expired`,
      ErrorCodes.CHANNEL_EXPIRED,
      'CHANNEL',
      {
        retryable: false,
        recovery: 'Close the channel and create a new one',
        metadata: { channelId, expiredAt },
      }
    );
    this.name = 'ChannelExpiredError';
  }
}

/**
 * Channel closed error
 */
export class ChannelClosedError extends ArcPayError {
  constructor(channelId: string) {
    super(
      `Channel is already closed`,
      ErrorCodes.CHANNEL_CLOSED,
      'CHANNEL',
      {
        retryable: false,
        recovery: 'Create a new channel for future payments',
        metadata: { channelId },
      }
    );
    this.name = 'ChannelClosedError';
  }
}

/**
 * Channel insufficient funds error
 */
export class ChannelInsufficientFundsError extends ArcPayError {
  constructor(
    channelId: string,
    available: string,
    required: string,
    autoTopupEnabled: boolean
  ) {
    super(
      `Channel has insufficient funds`,
      ErrorCodes.CHANNEL_INSUFFICIENT_FUNDS,
      'CHANNEL',
      {
        retryable: autoTopupEnabled,
        recovery: autoTopupEnabled
          ? 'Auto-topup will refill the channel'
          : 'Top up channel manually or enable auto-topup',
        metadata: { channelId, available, required, autoTopupEnabled },
      }
    );
    this.name = 'ChannelInsufficientFundsError';
  }
}

/**
 * Channel disputed error
 */
export class ChannelDisputedError extends ArcPayError {
  constructor(channelId: string, disputedAt: string) {
    super(
      `Channel is in disputed state`,
      ErrorCodes.CHANNEL_DISPUTED,
      'CHANNEL',
      {
        retryable: false,
        recovery: 'Wait for dispute resolution',
        metadata: { channelId, disputedAt },
      }
    );
    this.name = 'ChannelDisputedError';
  }
}

/**
 * Batch payment failed error
 */
export class BatchPaymentFailedError extends ArcPayError {
  constructor(
    channelId: string,
    reason: string,
    failedAt: number,
    totalPayments: number
  ) {
    super(
      `Batch payment failed: ${reason}`,
      ErrorCodes.BATCH_PAYMENT_FAILED,
      'CHANNEL',
      {
        retryable: false,
        recovery: 'Check channel balance and try with fewer payments',
        metadata: { channelId, reason, failedAt, totalPayments },
      }
    );
    this.name = 'BatchPaymentFailedError';
  }
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof ArcPayError) {
    return error.retryable;
  }
  // Network errors are generally retryable
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('timeout') ||
      message.includes('econnrefused') ||
      message.includes('enotfound') ||
      message.includes('rate limit') ||
      message.includes('429')
    );
  }
  return false;
}

/**
 * Wrap unknown error into ArcPayError
 */
export function wrapError(error: unknown, context?: string): ArcPayError {
  if (error instanceof ArcPayError) {
    return error;
  }

  if (error instanceof Error) {
    const message = context ? `${context}: ${error.message}` : error.message;

    // Try to classify the error
    const lowerMessage = error.message.toLowerCase();

    if (lowerMessage.includes('insufficient') && lowerMessage.includes('balance')) {
      return new InsufficientBalanceError('unknown', '0', 'unknown');
    }

    if (lowerMessage.includes('nonce too low')) {
      return new NonceError('low', 0, 0);
    }

    if (lowerMessage.includes('timeout')) {
      return new OperationTimeoutError(context || 'unknown', 0);
    }

    if (lowerMessage.includes('rate limit') || lowerMessage.includes('429')) {
      return new RateLimitError();
    }

    if (lowerMessage.includes('reverted') || lowerMessage.includes('revert')) {
      return new TransactionRevertedError(error.message);
    }

    return new ArcPayError(message, ErrorCodes.UNKNOWN_ERROR, 'INTERNAL', {
      cause: error,
    });
  }

  return new ArcPayError(
    context || 'Unknown error occurred',
    ErrorCodes.UNKNOWN_ERROR,
    'INTERNAL',
    { cause: error }
  );
}
