/**
 * Auto Pay Handler - Automatic x402 payment handling for agents
 */

import { formatUnits } from 'viem';
import type { WalletClient } from 'viem';
import { createPaymentHeader } from 'x402/client';
import type { PolicyEngine } from './policies';
import type { AutoPayOptions, AutoPayResult } from './types';

const USDC_DECIMALS = 6;
const X402_VERSION = 1;

/**
 * Auto-pay handler for autonomous x402 payments
 */
export class AutoPayHandler {
  private wallet: WalletClient;
  private policyEngine: PolicyEngine;

  constructor(
    wallet: WalletClient,
    policyEngine: PolicyEngine,
    _facilitatorUrl: string = 'https://x402.org/facilitator'
  ) {
    this.wallet = wallet;
    this.policyEngine = policyEngine;
    // facilitatorUrl reserved for future use with facilitator verification
  }

  /**
   * Make a request with automatic x402 payment handling
   *
   * @param options - Request options
   * @returns Auto-pay result
   */
  async fetch(options: AutoPayOptions): Promise<AutoPayResult> {
    const {
      url,
      maxPrice,
      method = 'GET',
      body,
      headers = {},
      timeout = 30000,
    } = options;

    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // First request - check if payment required
      const initialResponse = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // If not 402, return response directly
      if (initialResponse.status !== 402) {
        return {
          success: initialResponse.ok,
          response: await this.parseResponse(initialResponse),
          error: initialResponse.ok ? undefined : `HTTP ${initialResponse.status}`,
        };
      }

      // Parse payment requirements
      const paymentHeader = initialResponse.headers.get('X-Payment');
      if (!paymentHeader) {
        return { success: false, error: 'No X-Payment header in 402 response' };
      }

      // Decode payment requirements
      let requirements;
      try {
        requirements = JSON.parse(Buffer.from(paymentHeader, 'base64').toString('utf-8'));
      } catch {
        try {
          requirements = JSON.parse(paymentHeader);
        } catch {
          return { success: false, error: 'Failed to parse payment requirements' };
        }
      }

      // Ensure it's an array
      const requirementsArray = Array.isArray(requirements) ? requirements : [requirements];
      if (requirementsArray.length === 0) {
        return { success: false, error: 'No payment requirements found' };
      }

      // Select first compatible requirement
      const requirement = requirementsArray[0];
      const requiredAmount = this.formatAmount(requirement.maxAmountRequired);

      // Check against max price
      if (parseFloat(requiredAmount) > parseFloat(maxPrice)) {
        return {
          success: false,
          error: `Price ${requiredAmount} USDC exceeds max ${maxPrice} USDC`,
        };
      }

      // Check policy
      const policyCheck = this.policyEngine.checkPayment(requiredAmount, url);
      if (!policyCheck.allowed) {
        return {
          success: false,
          policyViolation: policyCheck.reason,
        };
      }

      // Create payment header using x402
      const paymentHeaderValue = await createPaymentHeader(
        this.wallet as Parameters<typeof createPaymentHeader>[0],
        X402_VERSION,
        requirement
      );

      // Retry with payment
      const paidController = new AbortController();
      const paidTimeoutId = setTimeout(() => paidController.abort(), timeout);

      const paidResponse = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
          'X-Payment': paymentHeaderValue,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: paidController.signal,
      });

      clearTimeout(paidTimeoutId);

      if (paidResponse.ok) {
        // Record successful payment
        this.policyEngine.recordPayment(requiredAmount);

        // Try to get tx hash from response header
        const paymentResponse = paidResponse.headers.get('X-Payment-Response');
        let txHash: string | undefined;

        if (paymentResponse) {
          try {
            const decoded = JSON.parse(Buffer.from(paymentResponse, 'base64').toString('utf-8'));
            txHash = decoded.txHash;
          } catch {
            // Ignore parsing errors
          }
        }

        return {
          success: true,
          response: await this.parseResponse(paidResponse),
          payment: {
            amount: requiredAmount,
            txHash,
            settledAt: new Date().toISOString(),
          },
        };
      }

      // Payment rejected
      if (paidResponse.status === 402) {
        return {
          success: false,
          error: 'Payment rejected by server',
        };
      }

      return {
        success: false,
        error: `Request failed with status ${paidResponse.status}`,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { success: false, error: 'Request timed out' };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Parse response based on content type
   */
  private async parseResponse(response: Response): Promise<unknown> {
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return response.json();
    }
    return response.text();
  }

  /**
   * Format atomic amount to human-readable
   */
  private formatAmount(atomicAmount: string | number): string {
    const amount = typeof atomicAmount === 'string' ? BigInt(atomicAmount) : BigInt(atomicAmount);
    return formatUnits(amount, USDC_DECIMALS);
  }
}
