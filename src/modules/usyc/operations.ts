import { formatUnits, parseUnits } from 'viem';
import type { ArcPay } from '../../core/client';
import type { USYCBalance, SubscribeResult, RedeemResult, USYCOperationOptions } from './types';
import {
  ERC20_ABI,
  USYC_TELLER_ABI,
  USYC_ACCOUNTANT_ABI,
  USYC_ENTITLEMENTS_ABI,
  USYC_DECIMALS,
  USDC_DECIMALS,
} from '../../utils/constants';
import { USYCNotAllowedError, NetworkError } from '../../utils/errors';
import { getTxUrl } from '../../utils/explorer';
import type { Address } from '../../core/types';

// Rate precision - typically 18 decimals for exchange rates
const RATE_DECIMALS = 18;

/**
 * USYC Operations handler
 *
 * USYC is Circle's yield-bearing token backed by short-term US Treasuries.
 * Users can subscribe (deposit USDC to get USYC) and redeem (burn USYC to get USDC).
 *
 * Important: USYC requires wallet to be on the allowlist.
 * Apply at: https://usyc.dev.hashnote.com/
 */
export class USYCOperations {
  private client: ArcPay;
  private accountantAddress: Address | null = null;

  constructor(client: ArcPay) {
    this.client = client;
  }

  /**
   * Check if USYC is available on current network
   */
  isAvailable(): boolean {
    return !!this.client.network.usyc && !!this.client.network.usycTeller;
  }

  /**
   * Ensure USYC is available
   */
  private ensureAvailable(): void {
    if (!this.isAvailable()) {
      throw new NetworkError('USYC is not available on this network');
    }
  }

  /**
   * Get the accountant contract address from Teller
   */
  private async getAccountantAddress(): Promise<Address> {
    if (this.accountantAddress) {
      return this.accountantAddress;
    }

    this.ensureAvailable();

    try {
      const accountant = await this.client.publicClient.readContract({
        address: this.client.network.usycTeller as Address,
        abi: USYC_TELLER_ABI,
        functionName: 'accountant',
      });

      this.accountantAddress = accountant as Address;
      return this.accountantAddress;
    } catch (error) {
      throw new NetworkError('Failed to get accountant address from Teller', { cause: error });
    }
  }

  /**
   * Get the current USYC/USDC exchange rate from the accountant contract
   *
   * @returns Exchange rate (e.g., 1.0234 means 1 USYC = 1.0234 USDC)
   */
  async getExchangeRate(): Promise<string> {
    const result = await this.getExchangeRateWithEstimate();
    return result.rate;
  }

  /**
   * Get exchange rate with estimate flag
   * @internal
   */
  private async getExchangeRateWithEstimate(): Promise<{ rate: string; isEstimate: boolean }> {
    this.ensureAvailable();

    try {
      const accountantAddr = await this.getAccountantAddress();

      // Try getRateInQuote with USDC address first
      try {
        const rate = await this.client.publicClient.readContract({
          address: accountantAddr,
          abi: USYC_ACCOUNTANT_ABI,
          functionName: 'getRateInQuote',
          args: [this.client.network.usdc as Address],
        });

        // Rate is typically in 18 decimals
        return { rate: formatUnits(rate as bigint, RATE_DECIMALS), isEstimate: false };
      } catch {
        // Fallback to getRate if getRateInQuote fails
        const rate = await this.client.publicClient.readContract({
          address: accountantAddr,
          abi: USYC_ACCOUNTANT_ABI,
          functionName: 'getRate',
        });

        return { rate: formatUnits(rate as bigint, RATE_DECIMALS), isEstimate: false };
      }
    } catch (error) {
      // If all fails, return a reasonable default with warning
      console.warn(
        'USYC: Could not fetch exchange rate from contract. ' +
        'Using fallback rate of 1.0. This is expected on Arc testnet.'
      );
      return { rate: '1.0', isEstimate: true };
    }
  }

  /**
   * Check if an address is on the USYC allowlist
   *
   * @param address - Address to check (defaults to signer)
   * @returns Whether address is allowed
   */
  async isAllowlisted(address?: string): Promise<boolean> {
    this.ensureAvailable();

    const addr = address || this.client.address;
    if (!addr) {
      throw new Error('Address required');
    }

    try {
      const allowed = await this.client.publicClient.readContract({
        address: this.client.network.usycEntitlements as Address,
        abi: USYC_ENTITLEMENTS_ABI,
        functionName: 'isAllowed',
        args: [addr as Address],
      });

      return allowed as boolean;
    } catch {
      // If contract call fails, assume not allowed
      return false;
    }
  }

  /**
   * Get USYC balance and yield information
   *
   * @param address - Address to check (defaults to signer)
   * @returns Balance information
   */
  async getBalance(address?: string): Promise<USYCBalance> {
    this.ensureAvailable();

    const addr = address || this.client.address;
    if (!addr) {
      throw new Error('Address required');
    }

    // Get USYC balance
    const balance = await this.client.publicClient.readContract({
      address: this.client.network.usyc as Address,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [addr as Address],
    });

    const usycAmount = formatUnits(balance as bigint, USYC_DECIMALS);

    // Get exchange rate from contract (with estimate flag)
    const { rate: exchangeRate, isEstimate } = await this.getExchangeRateWithEstimate();
    const rate = parseFloat(exchangeRate);

    // Calculate USDC value based on exchange rate
    const usdcValue = (parseFloat(usycAmount) * rate).toFixed(USDC_DECIMALS);

    // Yield is the difference (rate > 1 means positive yield)
    const yieldAmount = (parseFloat(usdcValue) - parseFloat(usycAmount)).toFixed(USDC_DECIMALS);

    return {
      usyc: usycAmount,
      usdcValue,
      yield: yieldAmount,
      exchangeRate,
      isEstimate,
    };
  }

  /**
   * Subscribe USDC to USYC (start earning yield)
   *
   * @param amount - Amount of USDC to subscribe
   * @param options - Operation options
   * @returns Subscribe result
   */
  async subscribe(amount: string, options?: USYCOperationOptions): Promise<SubscribeResult> {
    this.ensureAvailable();

    if (!this.client.hasSigner()) {
      return { success: false, error: 'Signer required for subscribe' };
    }

    // Check allowlist
    const allowed = await this.isAllowlisted();
    if (!allowed) {
      throw new USYCNotAllowedError(this.client.address!);
    }

    try {
      const depositAmount = parseUnits(amount, USDC_DECIMALS);
      const minimumMint = options?.minimumReceived
        ? parseUnits(options.minimumReceived, USYC_DECIMALS)
        : 0n;

      // First, approve USDC spending
      const approveHash = await this.client.walletClient!.writeContract({
        address: this.client.network.usdc as Address,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [this.client.network.usycTeller as Address, depositAmount],
      });

      await this.client.publicClient.waitForTransactionReceipt({ hash: approveHash });

      // Then, deposit
      const depositHash = await this.client.walletClient!.writeContract({
        address: this.client.network.usycTeller as Address,
        abi: USYC_TELLER_ABI,
        functionName: 'deposit',
        args: [
          this.client.network.usdc as Address,
          depositAmount,
          minimumMint,
        ],
      });

      await this.client.publicClient.waitForTransactionReceipt({ hash: depositHash });

      // Calculate approximate USYC received based on exchange rate
      const exchangeRate = await this.getExchangeRate();
      const rate = parseFloat(exchangeRate);
      const estimatedUsyc = (parseFloat(amount) / rate).toFixed(USYC_DECIMALS);

      return {
        success: true,
        txHash: depositHash,
        usycReceived: estimatedUsyc,
        explorerUrl: getTxUrl(this.client.network, depositHash),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Subscribe failed',
      };
    }
  }

  /**
   * Redeem USYC to USDC (withdraw with yield)
   *
   * @param amount - Amount of USYC to redeem
   * @param options - Operation options
   * @returns Redeem result
   */
  async redeem(amount: string, options?: USYCOperationOptions): Promise<RedeemResult> {
    this.ensureAvailable();

    if (!this.client.hasSigner()) {
      return { success: false, error: 'Signer required for redeem' };
    }

    // Check allowlist
    const allowed = await this.isAllowlisted();
    if (!allowed) {
      throw new USYCNotAllowedError(this.client.address!);
    }

    try {
      const shareAmount = parseUnits(amount, USYC_DECIMALS);
      const minimumAssets = options?.minimumReceived
        ? parseUnits(options.minimumReceived, USDC_DECIMALS)
        : 0n;
      const deadline = options?.deadline || Math.floor(Date.now() / 1000) + 3600; // 1 hour default

      // Withdraw
      const hash = await this.client.walletClient!.writeContract({
        address: this.client.network.usycTeller as Address,
        abi: USYC_TELLER_ABI,
        functionName: 'bulkWithdraw',
        args: [
          this.client.network.usdc as Address,
          shareAmount,
          minimumAssets,
          BigInt(deadline),
        ],
      });

      await this.client.publicClient.waitForTransactionReceipt({ hash });

      // Calculate approximate USDC received based on exchange rate
      const exchangeRate = await this.getExchangeRate();
      const rate = parseFloat(exchangeRate);
      const estimatedUsdc = (parseFloat(amount) * rate).toFixed(USDC_DECIMALS);

      return {
        success: true,
        txHash: hash,
        usdcReceived: estimatedUsdc,
        explorerUrl: getTxUrl(this.client.network, hash),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Redeem failed',
      };
    }
  }
}
