/**
 * Configuration for a paywalled route
 */
export interface PaywallRoute {
  /** Price in USD (e.g., "0.10" or "$0.10") */
  price: string;
  /** Description shown to buyer */
  description?: string;
  /** MIME type of the response */
  mimeType?: string;
}

/**
 * Paywall configuration mapping routes to prices
 */
export interface PaywallConfig {
  [route: string]: PaywallRoute;
}

/**
 * Payment result
 */
export interface PaymentResult {
  success: boolean;
  txHash?: string;
  response?: Response;
  error?: string;
}

/**
 * Payment options for the pay function
 */
export interface PaymentOptions {
  /** Request options (headers, etc.) */
  requestInit?: RequestInit;
  /** Max price willing to pay (optional limit) */
  maxPrice?: string;
}

/**
 * x402 payment configuration
 */
export interface X402PaymentConfig {
  scheme: string;
  price: string;
  network: string;
  payTo: string;
}
