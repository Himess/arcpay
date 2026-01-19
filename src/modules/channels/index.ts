/**
 * Payment Channels Module - x402 Channel Scheme
 *
 * Pre-funded payment channels for efficient micro-payments.
 * Supports off-chain payments with on-chain settlement.
 *
 * @example
 * ```typescript
 * import { createPaymentChannelManager } from 'arcpay';
 *
 * const channels = createPaymentChannelManager({
 *   privateKey: process.env.PRIVATE_KEY,
 * });
 *
 * // Create channel with deposit
 * const channel = await channels.createChannel({
 *   recipient: '0x...',
 *   deposit: '100.00',
 * });
 *
 * // Make instant micro-payments (off-chain)
 * await channels.pay(channel.id, '0.001');
 * await channels.pay(channel.id, '0.002');
 *
 * // Create x402 header for HTTP
 * const header = await channels.createX402Header(channel.id, '0.001');
 *
 * // Close and settle on-chain
 * const settlement = await channels.closeChannel(channel.id);
 * console.log('Refund:', settlement.refundAmount);
 * ```
 */

export * from './types';
export { PaymentChannelManager, createPaymentChannelManager } from './channel';
