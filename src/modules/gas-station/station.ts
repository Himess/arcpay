/**
 * Gas Station - Circle-style gas sponsorship for users
 */

import { createWalletClient, http, publicActions, parseGwei, formatEther, type Chain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import type {
  GasStationConfig,
  GasSponsorPolicy,
  GasSponsorshipRequest,
  GasSponsorshipResult,
  UserGasStats,
  GasStationStats,
  RelayerTransaction,
  ForwarderRequest,
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
};

/**
 * Default gas sponsor policy
 */
const DEFAULT_POLICY: GasSponsorPolicy = {
  name: 'default',
  maxGasPerTx: parseGwei('500000').toString(), // 500k gas max per tx
  maxGasPerUserDaily: parseGwei('5000000').toString(), // 5M gas per user per day
  maxTotalDaily: parseGwei('100000000').toString(), // 100M gas total per day
  allowedContracts: [],
  allowedFunctions: [],
  requireRegistration: false,
};

/**
 * Gas Station for sponsoring user transactions
 *
 * Implements Circle Gas Station patterns for gasless transactions.
 */
export class GasStation {
  private wallet: ReturnType<typeof createWalletClient>;
  private policies: Map<string, GasSponsorPolicy> = new Map();
  private userStats: Map<string, UserGasStats> = new Map();
  private dailyStats = {
    gasSponsored: BigInt(0),
    txCount: 0,
    users: new Set<string>(),
    date: new Date().toDateString(),
  };
  private config: GasStationConfig;

  constructor(config: GasStationConfig) {
    this.config = config;
    const account = privateKeyToAccount(config.privateKey as `0x${string}`);
    this.wallet = createWalletClient({
      account,
      chain: arcTestnet,
      transport: http(),
    }).extend(publicActions);

    // Initialize policies
    this.policies.set('default', config.defaultPolicy || DEFAULT_POLICY);
    if (config.policies) {
      for (const [name, policy] of Object.entries(config.policies)) {
        this.policies.set(name, policy);
      }
    }
  }

  /**
   * Sponsor a transaction for a user
   *
   * @param request - Sponsorship request
   * @returns Sponsorship result
   */
  async sponsor(request: GasSponsorshipRequest): Promise<GasSponsorshipResult> {
    // Reset daily stats if new day
    this.resetDailyIfNeeded();

    // Get applicable policy
    const policy = this.policies.get(request.policyName || 'default') || DEFAULT_POLICY;

    // Validate against policy
    const validationResult = this.validateRequest(request, policy);
    if (!validationResult.valid) {
      return {
        approved: false,
        reason: validationResult.reason,
      };
    }

    // Check user stats
    const userStats = this.getUserStats(request.userAddress);
    const gasAmount = BigInt(request.estimatedGas);

    // Check user daily limit
    if (BigInt(userStats.gasToday) + gasAmount > BigInt(policy.maxGasPerUserDaily)) {
      return {
        approved: false,
        reason: 'User daily gas limit exceeded',
        userStats,
      };
    }

    // Check total daily limit
    if (this.dailyStats.gasSponsored + gasAmount > BigInt(policy.maxTotalDaily)) {
      return {
        approved: false,
        reason: 'Total daily gas limit exceeded',
      };
    }

    // Dry run mode
    if (this.config.dryRun) {
      return {
        approved: true,
        reason: 'Dry run - would have sponsored',
        gasSponsored: request.estimatedGas,
        policyUsed: policy.name,
        userStats,
      };
    }

    // Execute sponsored transaction
    try {
      const txHash = await this.executeSponsoredTx(request);

      // Update stats
      this.updateStats(request.userAddress, gasAmount);
      const updatedStats = this.getUserStats(request.userAddress);

      // Webhook notification
      if (this.config.webhookUrl) {
        this.notifyWebhook({
          type: 'sponsored',
          txHash,
          userAddress: request.userAddress,
          gasSponsored: request.estimatedGas,
        });
      }

      return {
        approved: true,
        txHash,
        gasSponsored: request.estimatedGas,
        policyUsed: policy.name,
        userStats: updatedStats,
      };
    } catch (error) {
      return {
        approved: false,
        reason: error instanceof Error ? error.message : 'Transaction failed',
      };
    }
  }

  /**
   * Execute a meta-transaction via relayer
   *
   * @param relayerTx - Relayer transaction with signature
   * @returns Transaction hash
   */
  async relay(relayerTx: RelayerTransaction): Promise<string> {
    // Verify signature
    const isValid = await this.verifyRelayerSignature(relayerTx);
    if (!isValid) {
      throw new Error('Invalid relayer transaction signature');
    }

    // Check deadline
    if (Date.now() / 1000 > relayerTx.deadline) {
      throw new Error('Relayer transaction expired');
    }

    // Execute via forwarder contract
    return this.executeForwardedTx(relayerTx);
  }

  /**
   * Execute EIP-2771 forwarded transaction
   *
   * @param forwarderReq - Forwarder request
   * @param signature - User signature
   * @returns Transaction hash
   */
  async forward(forwarderReq: ForwarderRequest, _signature: string): Promise<string> {
    // This would call a trusted forwarder contract
    // For now, simulate the execution
    const walletWithSend = this.wallet as typeof this.wallet & {
      sendTransaction: (args: {
        to: `0x${string}`;
        data: `0x${string}`;
        gas: bigint;
      }) => Promise<`0x${string}`>;
    };

    const txHash = await walletWithSend.sendTransaction({
      to: forwarderReq.to as `0x${string}`,
      data: forwarderReq.data as `0x${string}`,
      gas: BigInt(forwarderReq.gas),
    });

    return txHash;
  }

  /**
   * Add a new sponsorship policy
   *
   * @param policy - Policy configuration
   */
  addPolicy(policy: GasSponsorPolicy): void {
    this.policies.set(policy.name, policy);
  }

  /**
   * Remove a policy
   *
   * @param name - Policy name
   */
  removePolicy(name: string): void {
    if (name === 'default') {
      throw new Error('Cannot remove default policy');
    }
    this.policies.delete(name);
  }

  /**
   * Get user gas stats
   *
   * @param address - User address
   * @returns User stats
   */
  getUserStats(address: string): UserGasStats {
    const normalizedAddress = address.toLowerCase();
    let stats = this.userStats.get(normalizedAddress);

    if (!stats) {
      stats = {
        address: normalizedAddress,
        gasToday: '0',
        gasAllTime: '0',
        txCountToday: 0,
        txCountAllTime: 0,
        tier: 'free',
      };
      this.userStats.set(normalizedAddress, stats);
    }

    return stats;
  }

  /**
   * Get gas station stats
   *
   * @returns Station stats
   */
  getStats(): GasStationStats {
    const defaultPolicy = this.policies.get('default') || DEFAULT_POLICY;
    const remaining = BigInt(defaultPolicy.maxTotalDaily) - this.dailyStats.gasSponsored;

    return {
      gasToday: this.dailyStats.gasSponsored.toString(),
      gasAllTime: this.calculateAllTimeGas(),
      txCountToday: this.dailyStats.txCount,
      usersToday: this.dailyStats.users.size,
      remainingDailyBudget: remaining.toString(),
      activePolicies: Array.from(this.policies.keys()),
    };
  }

  /**
   * Set user tier
   *
   * @param address - User address
   * @param tier - New tier
   */
  setUserTier(address: string, tier: UserGasStats['tier']): void {
    const stats = this.getUserStats(address);
    stats.tier = tier;
  }

  /**
   * Check if user is eligible for sponsorship
   *
   * @param address - User address
   * @param policyName - Policy to check against
   * @returns Eligibility result
   */
  checkEligibility(
    address: string,
    policyName?: string
  ): { eligible: boolean; reason?: string; remainingGas: string } {
    const policy = this.policies.get(policyName || 'default') || DEFAULT_POLICY;
    const userStats = this.getUserStats(address);

    const remainingUserGas = BigInt(policy.maxGasPerUserDaily) - BigInt(userStats.gasToday);
    const remainingTotalGas = BigInt(policy.maxTotalDaily) - this.dailyStats.gasSponsored;
    const remainingGas =
      remainingUserGas < remainingTotalGas ? remainingUserGas : remainingTotalGas;

    if (remainingUserGas <= 0) {
      return {
        eligible: false,
        reason: 'User daily limit reached',
        remainingGas: '0',
      };
    }

    if (remainingTotalGas <= 0) {
      return {
        eligible: false,
        reason: 'Station daily limit reached',
        remainingGas: '0',
      };
    }

    // Check tier requirements
    if (policy.tierRequirements) {
      const { minTransactions, minVolume } = policy.tierRequirements;

      if (minTransactions && userStats.txCountAllTime < minTransactions) {
        return {
          eligible: false,
          reason: `Requires ${minTransactions} transactions, user has ${userStats.txCountAllTime}`,
          remainingGas: remainingGas.toString(),
        };
      }

      if (minVolume && BigInt(userStats.gasAllTime) < BigInt(minVolume)) {
        return {
          eligible: false,
          reason: 'Minimum volume requirement not met',
          remainingGas: remainingGas.toString(),
        };
      }
    }

    return {
      eligible: true,
      remainingGas: remainingGas.toString(),
    };
  }

  /**
   * Get sponsorship quote
   *
   * @param estimatedGas - Estimated gas for transaction
   * @returns Quote in native currency
   */
  async getQuote(estimatedGas: string): Promise<{ gasCost: string; usdcValue: string }> {
    // On Arc, native currency is USDC
    const gasPrice = parseGwei('1'); // 1 gwei base fee
    const gasCost = BigInt(estimatedGas) * gasPrice;

    return {
      gasCost: gasCost.toString(),
      usdcValue: formatEther(gasCost), // USDC value
    };
  }

  // Private methods

  private validateRequest(
    request: GasSponsorshipRequest,
    policy: GasSponsorPolicy
  ): { valid: boolean; reason?: string } {
    // Check gas limit
    if (BigInt(request.estimatedGas) > BigInt(policy.maxGasPerTx)) {
      return { valid: false, reason: 'Gas exceeds per-transaction limit' };
    }

    // Check allowed contracts
    if (policy.allowedContracts.length > 0) {
      const normalizedTo = request.to.toLowerCase();
      const allowed = policy.allowedContracts.some((c) => c.toLowerCase() === normalizedTo);
      if (!allowed) {
        return { valid: false, reason: 'Contract not in allowed list' };
      }
    }

    // Check allowed functions
    if (policy.allowedFunctions.length > 0 && request.data.length >= 10) {
      const selector = request.data.slice(0, 10);
      if (!policy.allowedFunctions.includes(selector)) {
        return { valid: false, reason: 'Function not in allowed list' };
      }
    }

    return { valid: true };
  }

  private async executeSponsoredTx(request: GasSponsorshipRequest): Promise<string> {
    const walletWithSend = this.wallet as typeof this.wallet & {
      sendTransaction: (args: {
        to: `0x${string}`;
        data: `0x${string}`;
        gas: bigint;
      }) => Promise<`0x${string}`>;
    };

    const txHash = await walletWithSend.sendTransaction({
      to: request.to as `0x${string}`,
      data: request.data as `0x${string}`,
      gas: BigInt(request.estimatedGas),
    });

    return txHash;
  }

  private async verifyRelayerSignature(_relayerTx: RelayerTransaction): Promise<boolean> {
    // In production, verify EIP-712 signature
    // For now, return true
    return true;
  }

  private async executeForwardedTx(relayerTx: RelayerTransaction): Promise<string> {
    const walletWithSend = this.wallet as typeof this.wallet & {
      sendTransaction: (args: {
        to: `0x${string}`;
        data: `0x${string}`;
      }) => Promise<`0x${string}`>;
    };

    const txHash = await walletWithSend.sendTransaction({
      to: relayerTx.to as `0x${string}`,
      data: relayerTx.data as `0x${string}`,
    });

    return txHash;
  }

  private updateStats(userAddress: string, gasAmount: bigint): void {
    const normalizedAddress = userAddress.toLowerCase();
    const stats = this.getUserStats(normalizedAddress);

    stats.gasToday = (BigInt(stats.gasToday) + gasAmount).toString();
    stats.gasAllTime = (BigInt(stats.gasAllTime) + gasAmount).toString();
    stats.txCountToday++;
    stats.txCountAllTime++;
    stats.lastSponsored = new Date().toISOString();

    this.userStats.set(normalizedAddress, stats);

    this.dailyStats.gasSponsored += gasAmount;
    this.dailyStats.txCount++;
    this.dailyStats.users.add(normalizedAddress);
  }

  private resetDailyIfNeeded(): void {
    const today = new Date().toDateString();
    if (this.dailyStats.date !== today) {
      this.dailyStats = {
        gasSponsored: BigInt(0),
        txCount: 0,
        users: new Set<string>(),
        date: today,
      };

      // Reset user daily stats
      for (const stats of this.userStats.values()) {
        stats.gasToday = '0';
        stats.txCountToday = 0;
      }
    }
  }

  private calculateAllTimeGas(): string {
    let total = BigInt(0);
    for (const stats of this.userStats.values()) {
      total += BigInt(stats.gasAllTime);
    }
    return total.toString();
  }

  private notifyWebhook(data: Record<string, unknown>): void {
    if (!this.config.webhookUrl) return;

    // Fire and forget webhook notification
    fetch(this.config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(() => {
      // Ignore webhook errors
    });
  }
}

/**
 * Create a gas station instance
 *
 * @param config - Station configuration
 * @returns GasStation instance
 *
 * @example
 * ```typescript
 * const station = createGasStation({
 *   privateKey: process.env.SPONSOR_KEY,
 *   defaultPolicy: {
 *     name: 'default',
 *     maxGasPerTx: '500000',
 *     maxGasPerUserDaily: '5000000',
 *     maxTotalDaily: '100000000',
 *     allowedContracts: [],
 *     allowedFunctions: [],
 *     requireRegistration: false,
 *   }
 * });
 *
 * // Sponsor a transaction
 * const result = await station.sponsor({
 *   userAddress: '0x...',
 *   to: '0x...', // contract address
 *   data: '0x...', // transaction data
 *   estimatedGas: '100000',
 * });
 *
 * if (result.approved) {
 *   console.log('Sponsored tx:', result.txHash);
 * }
 * ```
 */
export function createGasStation(config: GasStationConfig): GasStation {
  return new GasStation(config);
}
