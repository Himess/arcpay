/**
 * AI Wallet Module - Intelligent Payment Wallet
 *
 * Natural language controlled wallet combining:
 * - Intent Engine for command parsing
 * - Streaming for real-time payments
 * - Agent for autonomous operations
 *
 * @example
 * ```typescript
 * import { createAIWallet } from 'arcpay';
 *
 * const wallet = createAIWallet({
 *   privateKey: process.env.PRIVATE_KEY,
 *   autonomousMode: false,
 * });
 *
 * // Chat interface
 * await wallet.chat("send $10 to 0x...");
 * await wallet.chat("stream $0.001 per token to api.com max $5");
 * await wallet.chat("split $100 between 0x..., 0x..., 0x...");
 *
 * // Scheduled payments
 * await wallet.schedule("send $100 to 0x...", {
 *   at: "2024-01-15T09:00:00Z"
 * });
 *
 * // Recurring payments
 * await wallet.schedule("send $50 to 0x...", {
 *   every: "1d",
 *   maxExecutions: 30
 * });
 *
 * // Workflows
 * const workflow = await wallet.createWorkflow("Payroll", [
 *   "send $1000 to employee1.eth",
 *   "send $1500 to employee2.eth",
 * ]);
 * await wallet.executeWorkflow(workflow.id);
 *
 * // Shortcuts
 * wallet.addShortcut("coffee", "send $5 to 0x...");
 * await wallet.chat("coffee"); // Executes the shortcut
 *
 * // Analytics
 * const analytics = wallet.getAnalytics();
 * console.log('Total volume:', analytics.totalVolume);
 * ```
 */

export * from './types';
export { AIWallet, createAIWallet } from './wallet';
