import { parseUnits } from 'viem';
import { useFacilitator } from 'x402/verify';
import type { PaywallConfig, PaywallRoute } from './types';
import type { ArcPay } from '../../core/client';
import { USDC_DECIMALS } from '../../utils/constants';

// x402 protocol version
const X402_VERSION = 1;

/**
 * Build x402 PaymentRequirements from route config
 */
function buildPaymentRequirements(
  route: string,
  config: PaywallRoute,
  payTo: string,
  chainId: number,
  usdcAddress: string
): object {
  // Parse price - remove $ if present
  const priceStr = config.price.startsWith('$') ? config.price.slice(1) : config.price;
  const priceWei = parseUnits(priceStr, USDC_DECIMALS);

  return {
    scheme: 'exact',
    network: `eip155:${chainId}`,
    maxAmountRequired: priceWei.toString(),
    resource: route,
    description: config.description || `Access to ${route}`,
    mimeType: config.mimeType || 'application/json',
    payTo,
    asset: usdcAddress,
    extra: {
      name: 'USDC',
      version: '2',
      decimals: USDC_DECIMALS,
    },
  };
}

/**
 * Decode x402 payment header
 */
function decodePaymentHeader(header: string): object | null {
  try {
    // Try base64 decode first
    const decoded = Buffer.from(header, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch {
    try {
      // Try plain JSON
      return JSON.parse(header);
    } catch {
      return null;
    }
  }
}

/**
 * Create x402 paywall middleware for Express/Hono
 *
 * Uses the official x402 library from Coinbase for payment verification.
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { ArcPay } from 'arcpay';
 *
 * const app = express();
 * const arc = await ArcPay.init({ network: 'arc-testnet' });
 *
 * // Apply paywall to specific routes
 * app.use(arc.micropayments.paywall('0xYourAddress', {
 *   'GET /api/premium': { price: '0.10', description: 'Premium data' },
 *   'GET /api/basic': { price: '0.01', description: 'Basic data' },
 * }));
 * ```
 */
export function createPaywall(
  client: ArcPay,
  payTo: string,
  routes: PaywallConfig
): (req: unknown, res: unknown, next: () => void) => void {
  // Initialize x402 facilitator for payment verification
  const facilitator = useFacilitator({
    url: client.network.facilitatorUrl as `${string}://${string}`,
  });

  // Build x402 payment requirements for each route
  const routeRequirements: Record<string, object> = {};

  for (const [route, config] of Object.entries(routes)) {
    routeRequirements[route] = buildPaymentRequirements(
      route,
      config,
      payTo,
      client.network.chainId,
      client.network.usdc
    );
  }

  // Return Express/Hono compatible middleware
  return async (req: unknown, res: unknown, next: () => void) => {
    const request = req as {
      method?: string;
      path?: string;
      url?: string;
      headers?: Record<string, string>;
    };
    const response = res as {
      status: (code: number) => { json: (data: unknown) => void; send: (data: string) => void };
      setHeader: (name: string, value: string) => void;
    };

    // Get route key
    const method = request.method || 'GET';
    const path = request.path || request.url || '/';
    const routeKey = `${method} ${path}`;

    // Check if route is paywalled
    const paymentRequirements = routeRequirements[routeKey];
    if (!paymentRequirements) {
      next();
      return;
    }

    // Check for x402 payment header
    const paymentHeader = request.headers?.['x-payment'];

    if (!paymentHeader) {
      // Return 402 Payment Required with x402 payment requirements
      const requirementsEncoded = Buffer.from(
        JSON.stringify([paymentRequirements])
      ).toString('base64');

      response.setHeader('Content-Type', 'application/json');
      response.setHeader('X-Payment', requirementsEncoded);
      response.setHeader('X-Payment-Version', String(X402_VERSION));
      response.status(402).json({
        error: 'Payment Required',
        message: (paymentRequirements as { description?: string }).description || 'This endpoint requires payment',
        x402Version: X402_VERSION,
        accepts: [paymentRequirements],
      });
      return;
    }

    // Decode and verify payment
    const paymentPayload = decodePaymentHeader(paymentHeader);
    if (!paymentPayload) {
      response.setHeader('Content-Type', 'application/json');
      response.status(400).json({
        error: 'Invalid Payment',
        message: 'Could not decode X-Payment header',
      });
      return;
    }

    try {
      // Verify payment with x402 facilitator
      const verifyResult = await facilitator.verify(
        paymentPayload as Parameters<typeof facilitator.verify>[0],
        paymentRequirements as Parameters<typeof facilitator.verify>[1]
      );

      if (!verifyResult.isValid) {
        response.setHeader('Content-Type', 'application/json');
        response.status(402).json({
          error: 'Payment Invalid',
          message: verifyResult.invalidReason || 'Payment verification failed',
        });
        return;
      }

      // Payment verified - settle and proceed
      try {
        await facilitator.settle(
          paymentPayload as Parameters<typeof facilitator.settle>[0],
          paymentRequirements as Parameters<typeof facilitator.settle>[1]
        );
      } catch (settleError) {
        // Log but don't block - payment was verified
        console.warn('x402 settlement warning:', settleError);
      }

      // Payment successful - proceed to route handler
      next();
    } catch (error) {
      response.setHeader('Content-Type', 'application/json');
      response.status(500).json({
        error: 'Verification Error',
        message: error instanceof Error ? error.message : 'Unknown verification error',
      });
    }
  };
}

/**
 * Create paywall configuration helper
 */
export function definePaywall(config: PaywallConfig): PaywallConfig {
  return config;
}
