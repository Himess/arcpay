/**
 * Payment Stream - Real-time payment streaming for APIs
 */

import { createWalletClient, http, publicActions, type Chain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import type { WalletClient } from 'viem';
import type {
  StreamConfig,
  StreamSession,
  StreamEvents,
  StreamableResponse,
  MeteredRequestOptions,
  MeteredRequestResult,
} from './types';
import { UsageMeter } from './meter';
import { StreamSettlement } from './settlement';

/**
 * Arc testnet chain configuration
 */
const arcTestnet: Chain = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.arc.network'] },
  },
};

interface SessionData {
  meter: UsageMeter;
  settlement: StreamSettlement;
}

/**
 * Payment Stream for real-time micro-payments
 *
 * Enables per-token/per-second payments for streaming APIs like LLMs.
 */
export class PaymentStream {
  private wallet: ReturnType<typeof createWalletClient>;
  private sessions: Map<string, SessionData> = new Map();

  constructor(privateKey: string) {
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    this.wallet = createWalletClient({
      account,
      chain: arcTestnet,
      transport: http(),
    }).extend(publicActions);
  }

  /**
   * Create a payment stream to an LLM or streaming API
   *
   * @param config - Stream configuration
   * @param events - Event callbacks
   * @returns Streamable response with controls
   */
  async createStream<T = string>(
    config: StreamConfig,
    events?: Partial<StreamEvents>
  ): Promise<StreamableResponse<T>> {
    const sessionId = `stream_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    // Extract recipient from endpoint or config
    const recipientAddress = await this.resolveRecipient(config.endpoint);

    // Initialize meter and settlement
    const meter = new UsageMeter(sessionId, config);
    const settlement = new StreamSettlement(
      this.wallet as WalletClient,
      recipientAddress
    );

    this.sessions.set(sessionId, { meter, settlement });

    // Settlement interval
    const settlementInterval = config.options?.settlementInterval || 5000;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let isPaused = false;
    let isStopped = false;
    let warningEmitted = false;

    // Create async generator
    const self = this;

    async function* streamGenerator(): AsyncGenerator<T> {
      try {
        // Start periodic settlement check
        intervalId = setInterval(async () => {
          if (isPaused || isStopped) return;

          const pending = meter.getPendingAmount();
          if (parseFloat(pending) > 0) {
            try {
              const record = await settlement.settle(pending);
              meter.recordSettlement(record.txHash);
              events?.onSettle?.(record);
            } catch (e) {
              events?.onError?.(e as Error);
            }
          }
        }, settlementInterval);

        // Make request to streaming endpoint
        const response = await fetch(config.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.body) {
          throw new Error('No response body');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (!isStopped) {
          if (isPaused) {
            await new Promise((resolve) => setTimeout(resolve, 100));
            continue;
          }

          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);

          // Count units based on rate type
          const units = self.countUnits(chunk, config.rate.per);

          // Record usage
          const { shouldSettle, exhausted } = meter.recordUsage(units);

          // Check warning (only emit once)
          if (!warningEmitted && meter.checkWarning()) {
            warningEmitted = true;
            events?.onWarning?.('Approaching budget limit', meter.getSession());
          }

          // Check exhaustion
          if (exhausted) {
            events?.onExhausted?.(meter.getSession());
            if (config.options?.autoStop !== false) {
              isStopped = true;
              break;
            }
          }

          // Trigger immediate settlement if needed
          if (shouldSettle) {
            const pending = meter.getPendingAmount();
            try {
              const record = await settlement.settle(pending);
              meter.recordSettlement(record.txHash);
              events?.onSettle?.(record);
            } catch (e) {
              events?.onError?.(e as Error);
            }
          }

          // Emit unit event
          events?.onUnit?.(chunk as unknown, meter.getSession());

          yield chunk as T;
        }

        // Final settlement
        const finalPending = meter.getPendingAmount();
        if (parseFloat(finalPending) > 0) {
          try {
            const record = await settlement.settle(finalPending);
            meter.recordSettlement(record.txHash);
            events?.onSettle?.(record);
          } catch (e) {
            events?.onError?.(e as Error);
          }
        }
      } catch (error) {
        events?.onError?.(error as Error);
        throw error;
      } finally {
        if (intervalId) clearInterval(intervalId);
        meter.setStatus('stopped');
        self.sessions.delete(sessionId);
      }
    }

    // Create streamable response
    const generator = streamGenerator();

    const streamable: StreamableResponse<T> = {
      [Symbol.asyncIterator]: () => generator,

      session: meter.getSession(),

      stop: async () => {
        isStopped = true;
        if (intervalId) clearInterval(intervalId);

        // Final settlement
        const pending = meter.getPendingAmount();
        if (parseFloat(pending) > 0) {
          try {
            const record = await settlement.settle(pending);
            meter.recordSettlement(record.txHash);
          } catch (e) {
            console.error('Final settlement failed:', e);
          }
        }

        meter.setStatus('stopped');
        return meter.getSession();
      },

      pause: () => {
        isPaused = true;
        meter.setStatus('paused');
      },

      resume: () => {
        isPaused = false;
        meter.setStatus('active');
      },

      getStatus: () => meter.getSession(),
    };

    return streamable;
  }

  /**
   * Create a simple metered request (non-streaming)
   *
   * @param endpoint - Target endpoint
   * @param options - Request options including price
   * @returns Response data and payment record
   */
  async meteredRequest<T>(
    endpoint: string,
    options: MeteredRequestOptions
  ): Promise<MeteredRequestResult<T>> {
    const recipientAddress = await this.resolveRecipient(endpoint);
    const settlement = new StreamSettlement(
      this.wallet as WalletClient,
      recipientAddress
    );

    // Pre-pay
    const paymentRecord = await settlement.settle(options.price);

    // Make request
    const response = await fetch(endpoint, {
      method: options.method || 'GET',
      headers: options.headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const data = (await response.json()) as T;

    return { data, payment: paymentRecord };
  }

  /**
   * Count units based on type
   */
  private countUnits(chunk: string, unitType: string): number {
    switch (unitType) {
      case 'token':
        // Rough token estimation (4 chars ~ 1 token for English text)
        return Math.ceil(chunk.length / 4);
      case 'kb':
        return chunk.length / 1024;
      case 'request':
        return 1;
      case 'second':
        return 1; // Handled by interval
      default:
        return 1;
    }
  }

  /**
   * Resolve recipient address from endpoint
   */
  private async resolveRecipient(endpoint: string): Promise<string> {
    // Try to get from x402 payment requirements
    try {
      const response = await fetch(endpoint, { method: 'OPTIONS' });
      const paymentInfo = response.headers.get('X-Payment-Address');
      if (paymentInfo) return paymentInfo;
    } catch {
      // Ignore errors
    }

    // Try HEAD request
    try {
      const response = await fetch(endpoint, { method: 'HEAD' });
      const paymentInfo = response.headers.get('X-Payment-Address');
      if (paymentInfo) return paymentInfo;
    } catch {
      // Ignore errors
    }

    // Default: extract from URL or use placeholder
    // In production, this should be configured or discovered
    console.warn(
      '[PaymentStream] Could not resolve recipient, using placeholder address'
    );
    return '0x742d35Cc6634C0532925a3b844Bc9e7595f5E123';
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): StreamSession[] {
    return Array.from(this.sessions.values()).map((s) => s.meter.getSession());
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): StreamSession | undefined {
    return this.sessions.get(sessionId)?.meter.getSession();
  }
}

/**
 * Create a payment stream instance
 *
 * @param privateKey - Wallet private key
 * @returns PaymentStream instance
 *
 * @example
 * ```typescript
 * const stream = createPaymentStream(privateKey);
 *
 * const response = await stream.createStream({
 *   endpoint: 'https://api.llm.com/generate',
 *   rate: { amount: '0.0001', per: 'token' },
 *   budget: { max: '1.00', warningAt: '0.80' }
 * });
 *
 * for await (const token of response) {
 *   console.log(token); // Auto-paid per token!
 * }
 *
 * const finalSession = await response.stop();
 * console.log(`Total spent: ${finalSession.billing.total}`);
 * ```
 */
export function createPaymentStream(privateKey: string): PaymentStream {
  return new PaymentStream(privateKey);
}
