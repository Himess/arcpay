/**
 * Streaming Module - Real-time payment streaming
 *
 * Enables per-token/per-second payments for streaming APIs like LLMs.
 *
 * @example
 * ```typescript
 * import { createPaymentStream } from 'arcpay';
 *
 * const stream = createPaymentStream(privateKey);
 *
 * // Create streaming payment session
 * const response = await stream.createStream({
 *   endpoint: 'https://api.llm.com/generate',
 *   rate: { amount: '0.0001', per: 'token' },
 *   budget: { max: '1.00' }
 * });
 *
 * // Consume stream - payments happen automatically
 * for await (const token of response) {
 *   process.stdout.write(token);
 * }
 *
 * // Check final spending
 * const session = response.getStatus();
 * console.log(`Total spent: ${session.billing.total}`);
 * ```
 */

export * from './types';
export { UsageMeter } from './meter';
export { StreamSettlement } from './settlement';
export { PaymentStream, createPaymentStream } from './stream';
