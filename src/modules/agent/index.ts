/**
 * Agent Module - Autonomous payment engine for AI agents
 *
 * This module provides policy-based autonomous payment capabilities
 * for AI agents, including:
 * - Spending policies (per-transaction, daily, monthly limits)
 * - Endpoint whitelisting/blacklisting
 * - Automatic x402 payment handling
 * - Transaction tracking and treasury management
 *
 * @example
 * ```typescript
 * import { createAgent } from 'arcpay';
 *
 * const agent = createAgent({
 *   wallet: '0x...',
 *   policies: {
 *     maxPerTransaction: '1.00',
 *     dailyBudget: '50.00',
 *     allowedEndpoints: ['api.example.com/*']
 *   }
 * });
 *
 * const result = await agent.fetch('https://api.example.com/data', {
 *   maxPrice: '0.50'
 * });
 * ```
 */

// Types
export * from './types';

// Classes
export { Agent, createAgent } from './agent';
export { PolicyEngine } from './policies';
export { AutoPayHandler } from './autopay';
export { TreasuryManager } from './treasury';
