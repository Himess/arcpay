import { parseUnits } from 'viem';
import {
  createPaymentHeader,
  selectPaymentRequirements,
} from 'x402/client';
import { useFacilitator } from 'x402/verify';
import type { ArcPay } from '../../core/client';
import type { PaymentResult, PaymentOptions } from './types';
import { USDC_DECIMALS } from '../../utils/constants';

// x402 protocol version
const X402_VERSION = 1;

/**
 * Parse price from x402 format
 */
function parsePrice(price: string): bigint {
  const cleanPrice = price.replace(/^\$/, '');
  return parseUnits(cleanPrice, USDC_DECIMALS);
}

/**
 * Micropayment buyer for making paid requests using x402 protocol
 *
 * Uses the official x402 library from Coinbase for payment header creation
 * and facilitator verification.
 *
 * @example
 * ```typescript
 * const buyer = new MicropaymentBuyer(arcpay);
 * const result = await buyer.payAndFetch('https://api.example.com/premium');
 * ```
 */
export class MicropaymentBuyer {
  private client: ArcPay;
  private facilitator: ReturnType<typeof useFacilitator>;

  constructor(client: ArcPay) {
    if (!client.hasSigner()) {
      throw new Error('Signer required for micropayment buyer');
    }
    this.client = client;

    // Initialize x402 facilitator client
    this.facilitator = useFacilitator({
      url: client.network.facilitatorUrl as `${string}://${string}`,
    });
  }

  /**
   * Make a paid request to a paywalled endpoint using x402 protocol
   *
   * @param url - URL to fetch
   * @param options - Payment options
   * @returns Payment result with response
   */
  async payAndFetch(url: string, options?: PaymentOptions): Promise<PaymentResult> {
    try {
      // First, make a request to get payment requirements
      const initialResponse = await fetch(url, options?.requestInit);

      // If not 402, return directly
      if (initialResponse.status !== 402) {
        return {
          success: true,
          response: initialResponse,
        };
      }

      // Parse payment requirements from x402 header
      const paymentRequiredHeader = initialResponse.headers.get('X-Payment');
      if (!paymentRequiredHeader) {
        return {
          success: false,
          error: 'No X-Payment header in 402 response',
        };
      }

      // Decode payment requirements
      let paymentRequirements;
      try {
        paymentRequirements = JSON.parse(
          Buffer.from(paymentRequiredHeader, 'base64').toString('utf-8')
        );
      } catch {
        // Try as plain JSON
        paymentRequirements = JSON.parse(paymentRequiredHeader);
      }

      // Ensure it's an array
      const requirements = Array.isArray(paymentRequirements)
        ? paymentRequirements
        : [paymentRequirements];

      // Select appropriate payment requirement for Arc network
      const networkId = `eip155:${this.client.network.chainId}`;
      const selectedRequirement = selectPaymentRequirements(
        requirements,
        networkId as Parameters<typeof selectPaymentRequirements>[1],
        'exact'
      );

      if (!selectedRequirement) {
        return {
          success: false,
          error: 'No compatible payment requirements for Arc network',
        };
      }

      // Check max price limit
      if (options?.maxPrice) {
        const maxPriceWei = parsePrice(options.maxPrice);
        const priceStr = typeof selectedRequirement.maxAmountRequired === 'string'
          ? selectedRequirement.maxAmountRequired
          : String(selectedRequirement.maxAmountRequired);
        const priceWei = parsePrice(priceStr);
        if (priceWei > maxPriceWei) {
          return {
            success: false,
            error: `Price ${priceStr} exceeds max ${options.maxPrice}`,
          };
        }
      }

      // Create x402 payment header using the official library
      // Cast walletClient to x402 Signer type (compatible at runtime)
      const paymentHeader = await createPaymentHeader(
        this.client.walletClient! as Parameters<typeof createPaymentHeader>[0],
        X402_VERSION,
        selectedRequirement
      );

      // Retry request with x402 payment header
      const paidResponse = await fetch(url, {
        ...options?.requestInit,
        headers: {
          ...options?.requestInit?.headers,
          'X-Payment': paymentHeader,
        },
      });

      if (!paidResponse.ok && paidResponse.status === 402) {
        return {
          success: false,
          error: 'Payment rejected by server',
        };
      }

      return {
        success: true,
        response: paidResponse,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Make a paid GET request and parse JSON response
   *
   * @param url - URL to fetch
   * @param options - Payment options
   * @returns Parsed JSON response
   */
  async payAndGet<T>(url: string, options?: PaymentOptions): Promise<T> {
    const result = await this.payAndFetch(url, options);

    if (!result.success) {
      throw new Error(result.error || 'Payment failed');
    }

    if (!result.response) {
      throw new Error('No response received');
    }

    if (!result.response.ok) {
      throw new Error(`Request failed: ${result.response.status}`);
    }

    return result.response.json() as Promise<T>;
  }

  /**
   * Verify a payment with the facilitator
   */
  async verifyPayment(
    payload: Parameters<typeof this.facilitator.verify>[0],
    requirements: Parameters<typeof this.facilitator.verify>[1]
  ) {
    return this.facilitator.verify(payload, requirements);
  }

  /**
   * Get supported payment kinds from facilitator
   */
  async getSupportedPaymentKinds() {
    return this.facilitator.supported();
  }
}
