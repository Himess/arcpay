import type { ArcPay } from '../../core/client';
import { GasSponsor } from './sponsor';
import type { SpendingRules, SponsorRequest, SponsorResult } from './types';

/**
 * Paymaster module for gas sponsorship
 *
 * On Arc, USDC is the native gas token. This module allows you to
 * sponsor transactions for your users, paying the gas fees on their behalf.
 *
 * @example
 * ```typescript
 * const arc = await ArcPay.init({
 *   network: 'arc-testnet',
 *   privateKey: process.env.SPONSOR_PRIVATE_KEY,
 * });
 *
 * // Set spending rules
 * arc.paymaster.setRules({
 *   maxPerTransaction: '0.01',
 *   maxPerUserDaily: '1.00',
 *   dailyBudget: '100.00',
 * });
 *
 * // Sponsor a user's transaction
 * const result = await arc.paymaster.sponsorTransaction({
 *   userAddress: '0x...',
 *   to: contractAddress,
 *   data: encodedFunctionCall,
 * });
 * ```
 */
export class PaymasterModule {
  private client: ArcPay;
  private sponsor: GasSponsor;

  constructor(client: ArcPay) {
    this.client = client;
    this.sponsor = new GasSponsor(client);
  }

  /**
   * Set spending rules for gas sponsorship
   *
   * @param rules - Spending rules configuration
   *
   * @example
   * ```typescript
   * arc.paymaster.setRules({
   *   maxPerTransaction: '0.01',      // Max 0.01 USDC per tx
   *   maxPerUserDaily: '1.00',        // Max 1 USDC per user per day
   *   dailyBudget: '100.00',          // Total daily budget
   *   allowedContracts: ['0x...'],    // Optional: whitelist contracts
   * });
   * ```
   */
  setRules(rules: SpendingRules): void {
    this.sponsor.setRules(rules);
  }

  /**
   * Get current spending rules
   */
  getRules(): SpendingRules {
    return this.sponsor.getRules();
  }

  /**
   * Sponsor a user's transaction
   *
   * Executes the transaction on behalf of the user, paying gas from sponsor wallet.
   *
   * @param request - Transaction details
   * @returns Sponsorship result
   *
   * @example
   * ```typescript
   * const result = await arc.paymaster.sponsorTransaction({
   *   userAddress: '0xuser...',
   *   to: '0xcontract...',
   *   data: '0xfunction...',
   * });
   *
   * if (result.success) {
   *   console.log(`Sponsored! Gas: ${result.sponsoredAmount} USDC`);
   *   console.log(`Tx: ${result.explorerUrl}`);
   * }
   * ```
   */
  async sponsorTransaction(request: SponsorRequest): Promise<SponsorResult> {
    return this.sponsor.sponsor(request);
  }

  /**
   * Reset daily spending limits
   *
   * Call this to manually reset all daily counters.
   * Useful for testing or administrative purposes.
   */
  resetDailyLimits(): void {
    this.sponsor.resetDailyLimits();
  }

  /**
   * Get spending stats for a specific user
   *
   * @param address - User's address
   * @returns User spending statistics
   */
  getUserStats(address: string) {
    return this.sponsor.getUserStats(address);
  }

  /**
   * Get overall paymaster statistics
   *
   * @returns Paymaster statistics
   */
  getStats() {
    return this.sponsor.getStats();
  }

  /**
   * Check if paymaster is configured (has signer)
   */
  isConfigured(): boolean {
    return this.client.hasSigner();
  }
}

export * from './types';
export { GasSponsor } from './sponsor';
