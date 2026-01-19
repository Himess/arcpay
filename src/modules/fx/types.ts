/**
 * FX module types - Stablecoin swaps (USDC ↔ EURC)
 */

/**
 * Supported currencies for FX
 */
export type FXCurrency = 'USDC' | 'EURC';

/**
 * FX trading pair
 */
export type FXPair = 'USDC/EURC' | 'EURC/USDC';

/**
 * Quote request parameters
 */
export interface FXQuoteParams {
  /** Source currency */
  from: FXCurrency;
  /** Target currency */
  to: FXCurrency;
  /** Amount to swap */
  amount: string;
}

/**
 * Quote response
 */
export interface FXQuote {
  /** Quote ID */
  id: string;
  /** Exchange rate */
  rate: string;
  /** Source currency info */
  from: {
    currency: FXCurrency;
    amount: string;
  };
  /** Target currency info */
  to: {
    currency: FXCurrency;
    amount: string;
  };
  /** Quote expiry time */
  expiry: string;
  /** Fee info */
  fee: {
    currency: FXCurrency;
    amount: string;
  };
  /** Whether this is a mock quote */
  _mock?: boolean;
}

/**
 * Swap request parameters
 */
export interface FXSwapParams {
  /** Quote ID to execute */
  quoteId: string;
  /** Minimum amount to receive (slippage protection) */
  minReceived?: string;
}

/**
 * Swap result
 */
export interface FXSwapResult {
  success: boolean;
  /** Transaction hash */
  txHash?: string;
  /** Amount received */
  received?: string;
  /** Explorer URL */
  explorerUrl?: string;
  /** Error message */
  error?: string;
  /** Whether this is a mock swap */
  _mock?: boolean;
}

/**
 * FX module configuration
 */
export interface FXConfig {
  /** StableFX API key (optional - required for real swaps) */
  apiKey?: string;
}

/**
 * Supported currency pairs
 */
export const SUPPORTED_PAIRS: FXPair[] = ['USDC/EURC', 'EURC/USDC'];

/**
 * Currency addresses on Arc
 */
export const CURRENCY_ADDRESSES = {
  USDC: '0x3600000000000000000000000000000000000000',
  EURC: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a',
} as const;

/**
 * FX contract addresses
 */
export const FX_CONTRACTS = {
  FX_ESCROW: '0x1f91886C7028986aD885ffCee0e40b75C9cd5aC1',
  PERMIT2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
} as const;
