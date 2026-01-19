/**
 * Agent - Main autonomous payment agent class
 */

import { createWalletClient, http, publicActions, type Chain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { PolicyEngine } from './policies';
import { AutoPayHandler } from './autopay';
import { TreasuryManager } from './treasury';
import type {
  AgentConfig,
  AgentState,
  AutoPayOptions,
  AutoPayResult,
  TreasuryStats,
  PolicyCheckResult,
} from './types';

/**
 * Arc testnet chain configuration
 */
const arcTestnet: Chain = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.arc.network'] },
  },
  blockExplorers: {
    default: { name: 'ArcScan', url: 'https://testnet.arcscan.app' },
  },
};

/**
 * Autonomous payment agent for AI systems
 *
 * Handles x402 payments automatically within policy-defined limits.
 * Tracks spending, enforces budgets, and maintains transaction history.
 */
export class Agent {
  private wallet: ReturnType<typeof createWalletClient> & ReturnType<typeof publicActions>;
  private policyEngine: PolicyEngine;
  private autoPayHandler: AutoPayHandler;
  private treasuryManager: TreasuryManager;
  private config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;

    // Create wallet client from private key
    const account = privateKeyToAccount(config.wallet as `0x${string}`);
    this.wallet = createWalletClient({
      account,
      chain: arcTestnet,
      transport: http(),
    }).extend(publicActions);

    // Initialize components
    this.policyEngine = new PolicyEngine(config.policies);
    this.autoPayHandler = new AutoPayHandler(
      this.wallet,
      this.policyEngine,
      config.facilitatorUrl
    );
    this.treasuryManager = new TreasuryManager();
  }

  /**
   * Get agent's wallet address
   */
  get address(): string {
    return this.wallet.account?.address || '';
  }

  /**
   * Get agent state including balance and spending stats
   */
  async getState(): Promise<AgentState> {
    const balance = await this.wallet.getBalance({
      address: this.wallet.account?.address as `0x${string}`,
    });

    const spendingStats = this.policyEngine.getSpendingStats();
    const stats = this.treasuryManager.getStats(
      this.config.policies.dailyBudget,
      this.config.policies.monthlyBudget
    );

    return {
      address: this.wallet.account?.address || '',
      balance: (Number(balance) / 1e18).toFixed(4),
      dailySpent: spendingStats.dailySpent,
      monthlySpent: spendingStats.monthlySpent,
      transactionCount: stats.transactionHistory.length,
      lastResetDate: new Date().toISOString().split('T')[0],
    };
  }

  /**
   * Make an autonomous payment request
   *
   * Handles x402 payments automatically within policy limits.
   * If the endpoint requires payment, it will be handled transparently.
   *
   * @param url - Target URL
   * @param options - Optional request options
   * @returns Auto-pay result with response and payment details
   */
  async fetch(url: string, options?: Partial<AutoPayOptions>): Promise<AutoPayResult> {
    const fullOptions: AutoPayOptions = {
      url,
      maxPrice: options?.maxPrice || this.config.policies.maxPerTransaction,
      method: options?.method || 'GET',
      body: options?.body,
      headers: options?.headers,
      timeout: options?.timeout,
    };

    // Record transaction start
    const txId = this.treasuryManager.recordTransaction({
      timestamp: new Date().toISOString(),
      endpoint: url,
      amount: '0', // Will update after payment
      status: 'pending',
    });

    const result = await this.autoPayHandler.fetch(fullOptions);

    // Update transaction record
    if (result.success && result.payment) {
      this.treasuryManager.updateTransaction(txId, {
        amount: result.payment.amount,
        txHash: result.payment.txHash,
        status: 'settled',
      });
    } else {
      this.treasuryManager.updateTransaction(txId, {
        status: 'failed',
      });
    }

    return result;
  }

  /**
   * Check if a payment would be allowed by policies
   *
   * Useful for pre-checking before making requests.
   *
   * @param amount - Amount to check
   * @param endpoint - Target endpoint
   * @returns Policy check result
   */
  checkPayment(amount: string, endpoint: string): PolicyCheckResult {
    return this.policyEngine.checkPayment(amount, endpoint);
  }

  /**
   * Get treasury statistics
   *
   * @returns Treasury stats including spending and transaction history
   */
  getTreasuryStats(): TreasuryStats {
    return this.treasuryManager.getStats(
      this.config.policies.dailyBudget,
      this.config.policies.monthlyBudget
    );
  }

  /**
   * Get remaining budgets
   *
   * @returns Remaining daily and monthly budgets
   */
  getRemainingBudgets(): { daily: string; monthly?: string } {
    return this.policyEngine.getRemainingBudgets();
  }

  /**
   * Get current policy configuration
   */
  getPolicy() {
    return this.policyEngine.getPolicy();
  }

  /**
   * Update policy rules
   *
   * @param updates - Partial policy updates
   */
  updatePolicy(updates: Partial<AgentConfig['policies']>): void {
    this.policyEngine.updatePolicy(updates);
  }

  /**
   * Get recent transactions
   *
   * @param limit - Maximum number of transactions to return
   * @returns Recent transactions
   */
  getRecentTransactions(limit: number = 10) {
    return this.treasuryManager.getRecentTransactions(limit);
  }

  /**
   * Get pending transactions count
   */
  getPendingCount(): number {
    return this.treasuryManager.getPendingCount();
  }
}

/**
 * Create an autonomous payment agent
 *
 * @param config - Agent configuration
 * @returns Configured Agent instance
 *
 * @example
 * ```typescript
 * const agent = createAgent({
 *   wallet: process.env.AGENT_PRIVATE_KEY as `0x${string}`,
 *   policies: {
 *     maxPerTransaction: '0.50',
 *     dailyBudget: '25.00',
 *     monthlyBudget: '500.00',
 *     allowedEndpoints: ['api.weather.com/*', 'api.news.com/*'],
 *     blockedEndpoints: ['*.malicious.com'],
 *     requireApproval: { above: '5.00' }
 *   }
 * });
 *
 * // Make autonomous API call with auto-payment
 * const result = await agent.fetch('https://api.weather.com/v1/current', {
 *   maxPrice: '0.10'
 * });
 * ```
 */
export function createAgent(config: AgentConfig): Agent {
  return new Agent(config);
}
