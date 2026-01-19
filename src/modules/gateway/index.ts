/**
 * Gateway module - Unified USDC balance across chains
 *
 * Gateway enables instant (<500ms) cross-chain USDC access
 * with a single unified balance.
 *
 * @example
 * ```typescript
 * const arc = await ArcPay.init({
 *   network: 'arc-testnet',
 *   privateKey: process.env.PRIVATE_KEY,
 * });
 *
 * // Get unified balance
 * const balance = await arc.gateway.getUnifiedBalance();
 *
 * // Deposit USDC to gateway
 * await arc.gateway.deposit({ amount: '1000' });
 *
 * // Instant withdraw to any chain
 * await arc.gateway.withdraw({
 *   chain: 'baseSepolia',
 *   amount: '500',
 * });
 * ```
 */

import { formatUnits, parseUnits, pad } from 'viem';
import type { ArcPay } from '../../core/client';
import type { Address } from '../../core/types';
import {
  GATEWAY_WALLET_ABI,
  GATEWAY_CONTRACTS,
  BURN_INTENT_TYPES,
  BURN_INTENT_DOMAIN,
} from './abi';
import type {
  UnifiedBalance,
  GatewayDepositParams,
  GatewayDepositResult,
  GatewayWithdrawParams,
  GatewayWithdrawResult,
  GatewayInfo,
} from './types';
import { GATEWAY_DOMAINS } from './types';
import { ERC20_ABI, USDC_DECIMALS } from '../../utils/constants';
import { getTxUrl } from '../../utils/explorer';

/**
 * Gateway API base URL
 */
const GATEWAY_API_URL = 'https://gateway-api-testnet.circle.com/v1';

/**
 * Gateway module for unified USDC balance
 */
export class GatewayModule {
  private client: ArcPay;
  private apiKey?: string;

  constructor(client: ArcPay, apiKey?: string) {
    this.client = client;
    this.apiKey = apiKey;
  }

  /**
   * Get headers for API requests
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  /**
   * Get Gateway API info
   */
  async getInfo(): Promise<GatewayInfo> {
    try {
      const res = await fetch(`${GATEWAY_API_URL}/info`, {
        headers: this.getHeaders(),
      });
      if (!res.ok) {
        throw new Error(`Gateway API error: ${res.status}`);
      }
      return res.json() as Promise<GatewayInfo>;
    } catch (error) {
      // Return mock info if API is unavailable
      return {
        supportedDomains: [0, 1, 6, 26],
        supportedTokens: ['USDC'],
        apiVersion: '1.0',
      };
    }
  }

  /**
   * Get unified balance across all chains
   *
   * @returns Unified balance information
   */
  async getUnifiedBalance(): Promise<UnifiedBalance> {
    const address = this.client.address;
    if (!address) {
      throw new Error('Address required for balance check');
    }

    try {
      // Try to get balance from Gateway API
      const domains = Object.values(GATEWAY_DOMAINS).join(',');
      const res = await fetch(
        `${GATEWAY_API_URL}/balances?depositor=${address}&domains=${domains}`,
        { headers: this.getHeaders() }
      );

      if (res.ok) {
        const data = await res.json();
        return this.parseApiBalance(data);
      }
    } catch {
      // Fall through to on-chain check
    }

    // Fallback: Check on-chain balance in Gateway Wallet
    try {
      const balance = await this.client.publicClient.readContract({
        address: GATEWAY_CONTRACTS.GATEWAY_WALLET,
        abi: GATEWAY_WALLET_ABI,
        functionName: 'balanceOf',
        args: [address as Address, this.client.network.usdc as Address],
      });

      const formatted = formatUnits(balance as bigint, USDC_DECIMALS);

      return {
        total: formatted,
        available: formatted,
        pending: '0',
        byChain: {
          [this.client.network.name]: formatted,
        },
      };
    } catch {
      // Return zero balance if contract call fails
      return {
        total: '0',
        available: '0',
        pending: '0',
        byChain: {},
      };
    }
  }

  /**
   * Parse API balance response
   */
  private parseApiBalance(data: unknown): UnifiedBalance {
    // Parse the API response format
    const balances = data as { balances?: Array<{ domain: number; amount: string }> };
    const byChain: Record<string, string> = {};
    let total = 0n;

    if (balances.balances) {
      for (const b of balances.balances) {
        const domainName = this.getDomainName(b.domain);
        byChain[domainName] = b.amount;
        total += BigInt(b.amount);
      }
    }

    const formatted = formatUnits(total, USDC_DECIMALS);
    return {
      total: formatted,
      available: formatted,
      pending: '0',
      byChain,
    };
  }

  /**
   * Get domain name from domain ID
   */
  private getDomainName(domainId: number): string {
    for (const [name, id] of Object.entries(GATEWAY_DOMAINS)) {
      if (id === domainId) return name;
    }
    return `domain-${domainId}`;
  }

  /**
   * Deposit USDC to Gateway
   *
   * @param params - Deposit parameters
   * @returns Deposit result
   */
  async deposit(params: GatewayDepositParams): Promise<GatewayDepositResult> {
    if (!this.client.hasSigner()) {
      return { success: false, error: 'Signer required for deposit' };
    }

    try {
      const amount = parseUnits(params.amount, USDC_DECIMALS);

      // First, approve USDC spending
      const approveHash = await this.client.walletClient!.writeContract({
        address: this.client.network.usdc as Address,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [GATEWAY_CONTRACTS.GATEWAY_WALLET, amount],
      });

      await this.client.publicClient.waitForTransactionReceipt({ hash: approveHash });

      // Then, deposit to Gateway
      const depositHash = await this.client.walletClient!.writeContract({
        address: GATEWAY_CONTRACTS.GATEWAY_WALLET,
        abi: GATEWAY_WALLET_ABI,
        functionName: 'deposit',
        args: [this.client.network.usdc as Address, amount],
      });

      await this.client.publicClient.waitForTransactionReceipt({ hash: depositHash });

      return {
        success: true,
        txHash: depositHash,
        explorerUrl: getTxUrl(this.client.network, depositHash),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Deposit failed',
      };
    }
  }

  /**
   * Withdraw USDC from Gateway to a specific chain
   *
   * @param params - Withdraw parameters
   * @returns Withdraw result
   */
  async withdraw(params: GatewayWithdrawParams): Promise<GatewayWithdrawResult> {
    if (!this.client.hasSigner()) {
      return { success: false, error: 'Signer required for withdrawal' };
    }

    const address = this.client.address!;
    const destinationDomain = GATEWAY_DOMAINS[params.chain];

    if (destinationDomain === undefined) {
      return { success: false, error: `Unsupported chain: ${params.chain}` };
    }

    try {
      const amount = parseUnits(params.amount, USDC_DECIMALS);
      const recipient = params.recipient || address;

      // For same-chain withdrawal, use direct withdraw
      if (destinationDomain === GATEWAY_DOMAINS[this.client.network.name === 'arc-testnet' ? 'arcTestnet' : 'arc']) {
        const hash = await this.client.walletClient!.writeContract({
          address: GATEWAY_CONTRACTS.GATEWAY_WALLET,
          abi: GATEWAY_WALLET_ABI,
          functionName: 'initiateWithdrawal',
          args: [this.client.network.usdc as Address, amount],
        });

        await this.client.publicClient.waitForTransactionReceipt({ hash });

        return {
          success: true,
          initTxHash: hash,
          explorerUrl: getTxUrl(this.client.network, hash),
        };
      }

      // For cross-chain withdrawal, create and sign burn intent
      const nonce = BigInt(Date.now());
      const expiry = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour

      const burnIntent = {
        depositor: address as `0x${string}`,
        token: this.client.network.usdc as `0x${string}`,
        amount,
        destinationDomain,
        destinationAddress: pad(recipient as `0x${string}`, { size: 32 }),
        nonce,
        expiry,
      };

      // Sign the burn intent
      const signature = await this.client.walletClient!.signTypedData({
        domain: {
          ...BURN_INTENT_DOMAIN,
          chainId: this.client.network.chainId,
        },
        types: BURN_INTENT_TYPES,
        primaryType: 'BurnIntent',
        message: burnIntent,
      });

      // Submit to Gateway API
      const res = await fetch(`${GATEWAY_API_URL}/transfer`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          burnIntent: JSON.stringify(burnIntent),
          signature,
        }),
      });

      if (!res.ok) {
        const error = await res.text();
        return { success: false, error: `Gateway API error: ${error}` };
      }

      const data = await res.json() as { attestation?: string };

      return {
        success: true,
        attestation: data.attestation,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Withdrawal failed',
      };
    }
  }

  /**
   * Get supported domains
   */
  getSupportedDomains(): Record<string, number> {
    return { ...GATEWAY_DOMAINS };
  }
}

export * from './types';
export * from './abi';
export * from './micropay';
