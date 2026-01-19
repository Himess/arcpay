import type { ArcPay } from '../../core/client';
import { createPaywall, definePaywall } from './paywall';
import { MicropaymentBuyer } from './buyer';
import type { PaywallConfig, PaymentResult, PaymentOptions } from './types';

/**
 * Micropayments module for x402 protocol integration
 *
 * @example
 * ```typescript
 * // Server-side: Create paywall
 * app.use(arc.micropayments.paywall('0xYourAddress', {
 *   'GET /api/premium': { price: '0.10' }
 * }));
 *
 * // Client-side: Make paid request
 * const data = await arc.micropayments.pay('https://api.example.com/premium');
 * ```
 */
export class MicropaymentsModule {
  private client: ArcPay;
  private buyer?: MicropaymentBuyer;

  constructor(client: ArcPay) {
    this.client = client;
  }

  /**
   * Create Express/Hono middleware for paywalled routes
   *
   * @param payTo - Address to receive payments
   * @param routes - Route configuration
   * @returns Middleware function
   *
   * @example
   * ```typescript
   * app.use(arc.micropayments.paywall('0x...', {
   *   'GET /api/premium': { price: '0.10', description: 'Premium API' },
   *   'POST /api/generate': { price: '1.00', description: 'AI generation' },
   * }));
   * ```
   */
  paywall(
    payTo: string,
    routes: PaywallConfig
  ): (req: unknown, res: unknown, next: () => void) => void {
    return createPaywall(this.client, payTo, routes);
  }

  /**
   * Get a buyer instance for making paid requests
   *
   * @returns MicropaymentBuyer instance
   */
  getBuyer(): MicropaymentBuyer {
    if (!this.buyer) {
      this.buyer = new MicropaymentBuyer(this.client);
    }
    return this.buyer;
  }

  /**
   * Make a paid request to a paywalled endpoint
   *
   * @param url - URL to fetch
   * @param options - Payment options
   * @returns Parsed JSON response
   *
   * @example
   * ```typescript
   * const data = await arc.micropayments.pay('https://api.example.com/premium');
   * ```
   */
  async pay<T>(url: string, options?: PaymentOptions): Promise<T> {
    return this.getBuyer().payAndGet<T>(url, options);
  }

  /**
   * Make a paid fetch request (returns full response)
   *
   * @param url - URL to fetch
   * @param options - Payment options
   * @returns Payment result with response
   */
  async fetch(url: string, options?: PaymentOptions): Promise<PaymentResult> {
    return this.getBuyer().payAndFetch(url, options);
  }

  /**
   * Helper to define paywall configuration with type checking
   */
  static definePaywall = definePaywall;
}

export * from './types';
export { MicropaymentBuyer } from './buyer';
