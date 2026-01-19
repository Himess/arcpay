/**
 * USYC balance information
 */
export interface USYCBalance {
  /** USYC token balance */
  usyc: string;
  /** Estimated current value in USDC */
  usdcValue: string;
  /** Accumulated yield */
  yield: string;
  /** Current USYC/USDC exchange rate */
  exchangeRate: string;
  /** Whether the exchange rate is estimated (true if fetched from contract failed) */
  isEstimate?: boolean;
}

/**
 * Result of a subscribe operation (USDC → USYC)
 */
export interface SubscribeResult {
  success: boolean;
  /** Transaction hash */
  txHash?: string;
  /** Amount of USYC received */
  usycReceived?: string;
  /** Explorer URL */
  explorerUrl?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Result of a redeem operation (USYC → USDC)
 */
export interface RedeemResult {
  success: boolean;
  /** Transaction hash */
  txHash?: string;
  /** Amount of USDC received */
  usdcReceived?: string;
  /** Explorer URL */
  explorerUrl?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Options for subscribe/redeem operations
 */
export interface USYCOperationOptions {
  /** Minimum amount to receive (slippage protection) */
  minimumReceived?: string;
  /** Deadline timestamp (Unix seconds) */
  deadline?: number;
}

/**
 * USYC status information
 */
export interface USYCStatus {
  /** Whether USYC is available on the network */
  available: boolean;
  /** Contract address if available */
  contractAddress?: string;
  /** Teller contract address */
  tellerAddress?: string;
  /** Current APY (if known) */
  currentApy?: string;
}
