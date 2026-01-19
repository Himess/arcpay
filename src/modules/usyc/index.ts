import type { ArcPay } from '../../core/client';
import { USYCOperations } from './operations';
import type { USYCBalance, SubscribeResult, RedeemResult, USYCOperationOptions, USYCStatus } from './types';

/**
 * USYC module for yield operations
 *
 * USYC is Circle's yield-bearing token backed by short-term US Treasuries.
 * This module allows you to:
 * - Subscribe: Deposit USDC to receive USYC and start earning yield
 * - Redeem: Burn USYC to receive USDC plus accumulated yield
 * - Check balances and yield
 *
 * **Important:** USYC requires your wallet to be on the allowlist.
 * Apply at: https://usyc.dev.hashnote.com/
 *
 * @example
 * ```typescript
 * const arc = await ArcPay.init({
 *   network: 'arc-testnet',
 *   privateKey: process.env.PRIVATE_KEY,
 * });
 *
 * // Check if allowed
 * const allowed = await arc.usyc.isAllowlisted();
 *
 * // Subscribe (deposit USDC, get USYC)
 * const subscribeResult = await arc.usyc.subscribe('1000');
 *
 * // Check balance and yield
 * const balance = await arc.usyc.getBalance();
 * console.log(`USYC: ${balance.usyc}, Yield: ${balance.yield}`);
 *
 * // Redeem (burn USYC, get USDC)
 * const redeemResult = await arc.usyc.redeem('500');
 * ```
 */
export class USYCModule {
  private client: ArcPay;
  private operations: USYCOperations;

  constructor(client: ArcPay) {
    this.client = client;
    this.operations = new USYCOperations(client);
  }

  /**
   * Check if USYC is available on current network
   */
  isAvailable(): boolean {
    return this.operations.isAvailable();
  }

  /**
   * Get USYC status information
   */
  getStatus(): USYCStatus {
    return {
      available: this.isAvailable(),
      contractAddress: this.client.network.usyc,
      tellerAddress: this.client.network.usycTeller,
    };
  }

  /**
   * Get the current USYC/USDC exchange rate from the accountant contract
   *
   * The exchange rate represents how much USDC you get per 1 USYC.
   * A rate > 1.0 indicates positive yield accumulation.
   *
   * @returns Exchange rate as a string (e.g., "1.0234" means 1 USYC = 1.0234 USDC)
   *
   * @example
   * ```typescript
   * const rate = await arc.usyc.getExchangeRate();
   * console.log(`Current rate: 1 USYC = ${rate} USDC`);
   * ```
   */
  async getExchangeRate(): Promise<string> {
    return this.operations.getExchangeRate();
  }

  /**
   * Check if an address is on the USYC allowlist
   *
   * @param address - Address to check (defaults to signer)
   * @returns Whether address is allowed
   *
   * @example
   * ```typescript
   * const allowed = await arc.usyc.isAllowlisted();
   * if (!allowed) {
   *   console.log('Apply for allowlist at https://usyc.dev.hashnote.com/');
   * }
   * ```
   */
  async isAllowlisted(address?: string): Promise<boolean> {
    return this.operations.isAllowlisted(address);
  }

  /**
   * Get USYC balance and yield information
   *
   * @param address - Address to check (defaults to signer)
   * @returns Balance information including yield
   *
   * @example
   * ```typescript
   * const balance = await arc.usyc.getBalance();
   * console.log(`USYC Balance: ${balance.usyc}`);
   * console.log(`USDC Value: ${balance.usdcValue}`);
   * console.log(`Yield Earned: ${balance.yield}`);
   * ```
   */
  async getBalance(address?: string): Promise<USYCBalance> {
    return this.operations.getBalance(address);
  }

  /**
   * Subscribe USDC to USYC (start earning yield)
   *
   * Deposits USDC into the USYC contract and receives USYC tokens.
   * USYC tokens represent your share of the yield-bearing pool.
   *
   * @param amount - Amount of USDC to subscribe
   * @param options - Operation options (slippage, deadline)
   * @returns Subscribe result
   *
   * @example
   * ```typescript
   * // Subscribe 1000 USDC
   * const result = await arc.usyc.subscribe('1000');
   *
   * if (result.success) {
   *   console.log(`Subscribed! Received ${result.usycReceived} USYC`);
   *   console.log(`Tx: ${result.explorerUrl}`);
   * }
   * ```
   */
  async subscribe(amount: string, options?: USYCOperationOptions): Promise<SubscribeResult> {
    return this.operations.subscribe(amount, options);
  }

  /**
   * Redeem USYC to USDC (withdraw with yield)
   *
   * Burns USYC tokens and receives USDC plus any accumulated yield.
   *
   * @param amount - Amount of USYC to redeem
   * @param options - Operation options (slippage, deadline)
   * @returns Redeem result
   *
   * @example
   * ```typescript
   * // Redeem all USYC
   * const balance = await arc.usyc.getBalance();
   * const result = await arc.usyc.redeem(balance.usyc);
   *
   * if (result.success) {
   *   console.log(`Redeemed! Received ${result.usdcReceived} USDC`);
   * }
   * ```
   */
  async redeem(amount: string, options?: USYCOperationOptions): Promise<RedeemResult> {
    return this.operations.redeem(amount, options);
  }

  /**
   * Get the URL to apply for USYC allowlist
   */
  getAllowlistUrl(): string {
    return 'https://usyc.dev.hashnote.com/';
  }
}

export * from './types';
export { USYCOperations } from './operations';
