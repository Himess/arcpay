/**
 * FX module - Stablecoin swaps using StableFX
 *
 * Enables USDC ↔ EURC swaps with institutional-grade FX rates.
 *
 * **Note:** StableFX requires KYB/AML verification for production use.
 * This implementation provides mock quotes for development/demo purposes
 * when no API key is provided.
 *
 * @example
 * ```typescript
 * const arc = await ArcPay.init({
 *   network: 'arc-testnet',
 *   privateKey: process.env.PRIVATE_KEY,
 * });
 *
 * // Get quote
 * const quote = await arc.fx.getQuote({
 *   from: 'USDC',
 *   to: 'EURC',
 *   amount: '1000',
 * });
 *
 * console.log(`Rate: ${quote.rate}`);
 * console.log(`You get: ${quote.to.amount} EURC`);
 *
 * // Execute swap (mock in demo mode)
 * const result = await arc.fx.swap({ quoteId: quote.id });
 * ```
 */

import type { ArcPay } from '../../core/client';
import type {
  FXCurrency,
  FXPair,
  FXQuoteParams,
  FXQuote,
  FXSwapParams,
  FXSwapResult,
  FXConfig,
} from './types';
import { SUPPORTED_PAIRS, CURRENCY_ADDRESSES } from './types';

/**
 * StableFX API base URL
 */
const STABLEFX_API_URL = 'https://api-sandbox.circle.com/v1/exchange/stablefx';

/**
 * Mock exchange rates for demo
 */
const MOCK_RATES: Record<string, number> = {
  'USDC/EURC': 0.92,
  'EURC/USDC': 1.087,
};

/**
 * FX module for stablecoin swaps
 */
export class FXModule {
  private client: ArcPay;
  private apiKey?: string;
  private pendingQuotes: Map<string, FXQuote> = new Map();

  constructor(client: ArcPay, config?: FXConfig) {
    this.client = client;
    // Check environment variable first, then config
    this.apiKey = process.env.CIRCLE_API_KEY || config?.apiKey;

    if (this.apiKey) {
      console.log('FX: Circle API key detected, using real StableFX API');
    }
  }

  /**
   * Get a quote for currency swap
   *
   * @param params - Quote parameters
   * @returns Quote with rate and amounts
   */
  async getQuote(params: FXQuoteParams): Promise<FXQuote> {
    // Validate pair
    const pair = `${params.from}/${params.to}` as FXPair;
    if (!SUPPORTED_PAIRS.includes(pair)) {
      throw new Error(`Unsupported pair: ${pair}. Supported: ${SUPPORTED_PAIRS.join(', ')}`);
    }

    // If no API key, return mock quote
    if (!this.apiKey) {
      console.warn('FX: Using mock quote (no API key configured)');
      return this.createMockQuote(params);
    }

    // Real API call
    try {
      const res = await fetch(`${STABLEFX_API_URL}/quotes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: { currency: params.from, amount: params.amount },
          to: { currency: params.to },
          tenor: 'instant',
        }),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(`StableFX API error: ${error}`);
      }

      const quote = await res.json() as FXQuote;
      this.pendingQuotes.set(quote.id, quote);
      return quote;
    } catch (error) {
      // Fallback to mock on error
      console.warn('FX: API call failed, using mock quote:', error);
      return this.createMockQuote(params);
    }
  }

  /**
   * Create a mock quote for demo purposes
   */
  private createMockQuote(params: FXQuoteParams): FXQuote {
    const pair = `${params.from}/${params.to}`;
    const rate = MOCK_RATES[pair] || 1.0;
    const toAmount = (parseFloat(params.amount) * rate).toFixed(2);

    const quote: FXQuote = {
      id: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      rate: rate.toString(),
      from: {
        currency: params.from,
        amount: params.amount,
      },
      to: {
        currency: params.to,
        amount: toAmount,
      },
      expiry: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      fee: {
        currency: 'USDC',
        amount: '0.00',
      },
      _mock: true,
    };

    this.pendingQuotes.set(quote.id, quote);
    return quote;
  }

  /**
   * Execute a swap based on a quote
   *
   * @param params - Swap parameters
   * @returns Swap result
   */
  async swap(params: FXSwapParams): Promise<FXSwapResult> {
    const quote = this.pendingQuotes.get(params.quoteId);

    if (!quote) {
      return { success: false, error: 'Quote not found or expired' };
    }

    // Check if quote is expired
    if (new Date(quote.expiry) < new Date()) {
      this.pendingQuotes.delete(params.quoteId);
      return { success: false, error: 'Quote has expired' };
    }

    // Mock swap
    if (quote._mock) {
      console.warn('FX: Executing mock swap (no real transaction)');
      this.pendingQuotes.delete(params.quoteId);

      return {
        success: true,
        received: quote.to.amount,
        _mock: true,
      };
    }

    // Real swap (requires API key)
    if (!this.apiKey) {
      return {
        success: false,
        error: 'StableFX API key required for real swaps. This is a mock implementation.',
      };
    }

    if (!this.client.hasSigner()) {
      return { success: false, error: 'Signer required for swap' };
    }

    try {
      const res = await fetch(`${STABLEFX_API_URL}/trades`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quoteId: params.quoteId,
        }),
      });

      if (!res.ok) {
        const error = await res.text();
        return { success: false, error: `StableFX API error: ${error}` };
      }

      const result = await res.json() as { transactionHash?: string; received?: string };
      this.pendingQuotes.delete(params.quoteId);

      return {
        success: true,
        txHash: result.transactionHash,
        received: result.received || quote.to.amount,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Swap failed',
      };
    }
  }

  /**
   * Get supported trading pairs
   *
   * @returns List of supported pairs
   */
  getSupportedPairs(): FXPair[] {
    return [...SUPPORTED_PAIRS];
  }

  /**
   * Get currency address on Arc
   *
   * @param currency - Currency symbol
   * @returns Contract address
   */
  getCurrencyAddress(currency: FXCurrency): string {
    return CURRENCY_ADDRESSES[currency];
  }

  /**
   * Check if a pair is supported
   *
   * @param from - Source currency
   * @param to - Target currency
   * @returns Whether pair is supported
   */
  isPairSupported(from: FXCurrency, to: FXCurrency): boolean {
    const pair = `${from}/${to}` as FXPair;
    return SUPPORTED_PAIRS.includes(pair);
  }

  /**
   * Get current mock rate (for display purposes)
   *
   * @param from - Source currency
   * @param to - Target currency
   * @returns Mock exchange rate
   */
  getMockRate(from: FXCurrency, to: FXCurrency): number {
    const pair = `${from}/${to}`;
    return MOCK_RATES[pair] || 1.0;
  }
}

export * from './types';
