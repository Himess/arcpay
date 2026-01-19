/**
 * Combo Module - Combined workflows
 *
 * High-level APIs that combine streaming, intent, and privacy modules.
 *
 * @example
 * ```typescript
 * import { createComboPipelines } from 'arcpay';
 *
 * const combo = createComboPipelines({ privateKey });
 *
 * // Intent + Streaming: Parse natural language and create stream
 * const { stream } = await combo.intentStream(
 *   "stream $0.001 per token to api.llm.com max $5"
 * );
 *
 * // Intent + Privacy: Natural language with privacy
 * await combo.intentPrivate("send $100 privately to st:arc:0x...");
 *
 * // Stream + Privacy: Streaming with stealth addresses
 * await combo.privateStream({
 *   recipientMetaAddress: 'st:arc:0x...',
 *   endpoint: 'https://api.llm.com/generate',
 *   ratePerToken: '0.0001',
 *   maxBudget: '5.00'
 * });
 *
 * // Full combo: Intent + Stream + Privacy
 * await combo.fullCombo("privately stream $0.0001/token to api.com max $1");
 * ```
 */

export * from './pipelines';
export { ComboPipelines, createComboPipelines } from './pipelines';
