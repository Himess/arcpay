/**
 * Smart Wallet Module - ERC-4337 Account Abstraction
 *
 * Provides smart contract wallets with advanced features:
 * - Gasless transactions via paymasters
 * - Batch operations for efficiency
 * - Session keys for delegated access
 * - Social recovery
 *
 * @example
 * ```typescript
 * import { createSmartWallet } from 'arcpay';
 *
 * const wallet = await createSmartWallet({
 *   ownerKey: process.env.OWNER_KEY,
 *   paymasterUrl: 'https://paymaster.arc.network',
 * });
 *
 * // Gasless transfer
 * await wallet.sendUSDC('0x...', '100.00', { sponsored: true });
 *
 * // Batch multiple operations
 * await wallet.executeBatch([
 *   { to: usdcAddress, value: '0', data: transferCalldata1 },
 *   { to: usdcAddress, value: '0', data: transferCalldata2 },
 * ]);
 *
 * // Setup session key for limited access
 * await wallet.addSessionKey({
 *   sessionKey: '0x...',
 *   validUntil: Date.now() / 1000 + 3600,
 *   validAfter: Date.now() / 1000,
 *   allowedTargets: [usdcAddress],
 *   allowedSelectors: ['0xa9059cbb'], // transfer
 *   spendingLimit: '50',
 * });
 * ```
 */

export * from './types';
export { SmartWallet, createSmartWallet } from './wallet';
