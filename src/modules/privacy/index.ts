/**
 * Privacy Module - Stealth address payments
 *
 * Enables private payments using stealth addresses.
 * Based on EIP-5564 concepts with simplified implementation.
 *
 * @example
 * ```typescript
 * import { createPrivacyModule } from 'arcpay';
 *
 * const privacy = createPrivacyModule({ privateKey });
 *
 * // Get your stealth meta-address to share with senders
 * const myAddress = privacy.getStealthMetaAddress();
 * // => "st:arc:742d35Cc6634C0532925a3b844Bc9e7595f5E123..."
 *
 * // Send a private payment
 * const result = await privacy.sendPrivate({
 *   to: recipientStealthMetaAddress,
 *   amount: '100'
 * });
 * // => { success: true, stealthAddress: "0x...", ephemeralPubKey: "0x..." }
 *
 * // Claim a received payment
 * await privacy.claimPayment(stealthAddress, ephemeralPubKey);
 * ```
 */

export * from './types';
export { StealthAddressGenerator } from './stealth';
export { PrivacyModule, createPrivacyModule } from './privacy';
