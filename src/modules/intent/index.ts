/**
 * Intent Module - Natural language payment commands
 *
 * Parse and execute payment commands in natural language.
 *
 * @example
 * ```typescript
 * import { createIntentEngine } from 'arcpay';
 *
 * const intent = createIntentEngine({ privateKey });
 *
 * // Send payment
 * await intent.execute("send $10 to 0x742d35...");
 *
 * // Split payment
 * await intent.execute("split $100 between 0x111..., 0x222..., 0x333...");
 *
 * // Stream payment
 * await intent.execute("stream $0.001 per token to api.llm.com max $5");
 *
 * // Subscribe
 * await intent.execute("subscribe to api.premium.com for $9.99/month");
 *
 * // Bridge
 * await intent.execute("bridge $100 from ethereum to arc");
 *
 * // Get help
 * const examples = intent.getHelp();
 * ```
 */

export * from './types';
export { IntentParser } from './parser';
export { IntentExecutor, createIntentEngine } from './executor';
export { builtInTemplates, getTemplates, getAllExamples } from './templates';
