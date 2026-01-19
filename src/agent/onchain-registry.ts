/**
 * On-chain Agent Registry Integration
 *
 * Provides trustless budget management for AI agents via smart contracts.
 * All budget limits, whitelist/blacklist, and payments are enforced on-chain.
 *
 * @example
 * ```typescript
 * const registry = new OnchainAgentManager({
 *   privateKey: process.env.AGENT_PRIVATE_KEY,
 *   network: 'arc-testnet',
 * });
 *
 * // Register agent (owner calls this)
 * await registry.registerAgent({
 *   dailyBudget: '1000000000', // 1000 USDC (6 decimals)
 *   perTxLimit: '100000000',   // 100 USDC
 * });
 *
 * // Execute payment (agent calls this)
 * await registry.executePayment({
 *   recipient: '0x...',
 *   amount: '50000000', // 50 USDC
 *   memo: 'API payment',
 * });
 * ```
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  formatUnits,
  type PublicClient,
  type WalletClient,
  type Address,
  type Chain,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { AGENT_REGISTRY_ABI } from '../contracts/abis';
import { getContractAddresses } from '../contracts/addresses';
import { NETWORKS } from '../core/config';
import type { NetworkName } from '../core/config';

/**
 * On-chain agent configuration
 */
export interface OnchainAgentConfig {
  /** Agent's private key */
  privateKey: string;
  /** Network to use */
  network?: NetworkName;
  /** Custom registry address (overrides default) */
  registryAddress?: `0x${string}`;
  /** Custom RPC URL */
  rpcUrl?: string;
}

/**
 * Agent registration parameters
 */
export interface RegisterAgentParams {
  /** Agent wallet address (defaults to signer address) */
  agentAddress?: string;
  /** Maximum daily spending (human-readable, e.g., "1000" for 1000 USDC) */
  dailyBudget: string;
  /** Maximum per-transaction limit (human-readable) */
  perTxLimit: string;
}

/**
 * Payment execution parameters
 */
export interface ExecutePaymentParams {
  /** Recipient address */
  recipient: string;
  /** Amount to pay (human-readable, e.g., "50" for 50 USDC) */
  amount: string;
  /** Optional memo */
  memo?: string;
}

/**
 * On-chain agent config returned from contract
 */
export interface OnchainAgentInfo {
  owner: string;
  dailyBudget: string;
  perTxLimit: string;
  todaySpent: string;
  lastResetTimestamp: number;
  active: boolean;
  balance: string;
  remainingDailyBudget: string;
}

/**
 * Transaction result
 */
export interface OnchainTxResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

/**
 * On-chain Agent Manager
 *
 * Manages AI agent registration, budget, and payments through the AgentRegistry contract.
 */
export class OnchainAgentManager {
  private publicClient: PublicClient;
  private walletClient: WalletClient;
  private registryAddress: `0x${string}`;
  private agentAddress: `0x${string}`;
  private chain: Chain;

  constructor(config: OnchainAgentConfig) {
    const network = NETWORKS[config.network || 'arc-testnet'];
    const chainId = network.chainId;

    // Get registry address from config or defaults
    if (config.registryAddress) {
      this.registryAddress = config.registryAddress;
    } else {
      const addresses = getContractAddresses(chainId);
      this.registryAddress = addresses.agentRegistry as `0x${string}`;
    }

    // Create chain config
    this.chain = {
      id: chainId,
      name: network.name,
      nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
      rpcUrls: {
        default: { http: [config.rpcUrl || network.rpcUrl] },
      },
    } as Chain;

    // Create account from private key
    const privateKey = config.privateKey.startsWith('0x')
      ? config.privateKey as `0x${string}`
      : `0x${config.privateKey}` as `0x${string}`;
    const account = privateKeyToAccount(privateKey);
    this.agentAddress = account.address;

    // Create clients
    this.publicClient = createPublicClient({
      chain: this.chain,
      transport: http(config.rpcUrl || network.rpcUrl),
    });

    this.walletClient = createWalletClient({
      account,
      chain: this.chain,
      transport: http(config.rpcUrl || network.rpcUrl),
    });
  }

  /**
   * Get agent address
   */
  getAgentAddress(): string {
    return this.agentAddress;
  }

  /**
   * Register a new agent with budget limits
   * Called by the agent owner (human)
   */
  async registerAgent(params: RegisterAgentParams): Promise<OnchainTxResult> {
    try {
      const agentAddr = (params.agentAddress || this.agentAddress) as `0x${string}`;
      const dailyBudget = parseUnits(params.dailyBudget, 18);
      const perTxLimit = parseUnits(params.perTxLimit, 18);

      const hash = await this.walletClient.writeContract({
        account: this.walletClient.account!,
        chain: this.chain,
        address: this.registryAddress,
        abi: AGENT_REGISTRY_ABI,
        functionName: 'registerAgent',
        args: [agentAddr, dailyBudget, perTxLimit],
      });

      await this.publicClient.waitForTransactionReceipt({ hash });

      return { success: true, txHash: hash };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      };
    }
  }

  /**
   * Update agent budget limits
   * Called by the agent owner
   */
  async updateAgent(params: {
    agentAddress?: string;
    dailyBudget: string;
    perTxLimit: string;
  }): Promise<OnchainTxResult> {
    try {
      const agentAddr = (params.agentAddress || this.agentAddress) as `0x${string}`;
      const dailyBudget = parseUnits(params.dailyBudget, 18);
      const perTxLimit = parseUnits(params.perTxLimit, 18);

      const hash = await this.walletClient.writeContract({
        account: this.walletClient.account!,
        chain: this.chain,
        address: this.registryAddress,
        abi: AGENT_REGISTRY_ABI,
        functionName: 'updateAgent',
        args: [agentAddr, dailyBudget, perTxLimit],
      });

      await this.publicClient.waitForTransactionReceipt({ hash });

      return { success: true, txHash: hash };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Update failed',
      };
    }
  }

  /**
   * Execute a payment from agent's deposited funds
   * Called by the agent itself
   */
  async executePayment(params: ExecutePaymentParams): Promise<OnchainTxResult> {
    try {
      const amount = parseUnits(params.amount, 18);

      const hash = await this.walletClient.writeContract({
        account: this.walletClient.account!,
        chain: this.chain,
        address: this.registryAddress,
        abi: AGENT_REGISTRY_ABI,
        functionName: 'executePayment',
        args: [params.recipient as `0x${string}`, amount, params.memo || ''],
      });

      await this.publicClient.waitForTransactionReceipt({ hash });

      return { success: true, txHash: hash };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment failed',
      };
    }
  }

  /**
   * Deposit ERC20 USDC for agent to use (for wrapped tokens only)
   * For Arc Testnet native USDC, use depositFundsNative() instead
   *
   * @deprecated Use depositFundsNative() for Arc Testnet
   */
  async depositFunds(params: {
    agentAddress?: string;
    amount: string;
  }): Promise<OnchainTxResult> {
    console.warn(
      '⚠️ depositFunds() uses ERC20 safeTransferFrom. For Arc native USDC, use depositFundsNative() instead.'
    );

    try {
      const agentAddr = (params.agentAddress || this.agentAddress) as `0x${string}`;
      const amount = parseUnits(params.amount, 18);

      const hash = await this.walletClient.writeContract({
        account: this.walletClient.account!,
        chain: this.chain,
        address: this.registryAddress,
        abi: AGENT_REGISTRY_ABI,
        functionName: 'depositFunds',
        args: [agentAddr, amount],
      });

      await this.publicClient.waitForTransactionReceipt({ hash });

      return { success: true, txHash: hash };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Deposit failed',
      };
    }
  }

  /**
   * Deposit NATIVE USDC for agent to use (Arc Testnet compatible)
   * This is the recommended method for Arc Testnet where USDC is the native gas token
   *
   * @example
   * ```typescript
   * // Deposit 100 USDC to agent
   * await registry.depositFundsNative({
   *   agentAddress: '0x...',
   *   amount: '100'
   * });
   * ```
   */
  async depositFundsNative(params: {
    agentAddress?: string;
    amount: string;
  }): Promise<OnchainTxResult> {
    try {
      const agentAddr = (params.agentAddress || this.agentAddress) as `0x${string}`;
      const amount = parseUnits(params.amount, 18);

      const hash = await this.walletClient.writeContract({
        account: this.walletClient.account!,
        chain: this.chain,
        address: this.registryAddress,
        abi: AGENT_REGISTRY_ABI,
        functionName: 'depositFundsNative',
        args: [agentAddr],
        value: amount, // Send native USDC
      });

      await this.publicClient.waitForTransactionReceipt({ hash });

      return { success: true, txHash: hash };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Deposit failed',
      };
    }
  }

  /**
   * Withdraw unused funds
   * Called by the agent owner
   */
  async withdrawFunds(params: {
    agentAddress?: string;
    amount: string;
  }): Promise<OnchainTxResult> {
    try {
      const agentAddr = (params.agentAddress || this.agentAddress) as `0x${string}`;
      const amount = parseUnits(params.amount, 18);

      const hash = await this.walletClient.writeContract({
        account: this.walletClient.account!,
        chain: this.chain,
        address: this.registryAddress,
        abi: AGENT_REGISTRY_ABI,
        functionName: 'withdrawFunds',
        args: [agentAddr, amount],
      });

      await this.publicClient.waitForTransactionReceipt({ hash });

      return { success: true, txHash: hash };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Withdrawal failed',
      };
    }
  }

  /**
   * Add address to whitelist
   */
  async addToWhitelist(params: {
    agentAddress?: string;
    address: string;
  }): Promise<OnchainTxResult> {
    try {
      const agentAddr = (params.agentAddress || this.agentAddress) as `0x${string}`;

      const hash = await this.walletClient.writeContract({
        account: this.walletClient.account!,
        chain: this.chain,
        address: this.registryAddress,
        abi: AGENT_REGISTRY_ABI,
        functionName: 'addToWhitelist',
        args: [agentAddr, params.address as `0x${string}`],
      });

      await this.publicClient.waitForTransactionReceipt({ hash });

      return { success: true, txHash: hash };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Whitelist add failed',
      };
    }
  }

  /**
   * Remove address from whitelist
   */
  async removeFromWhitelist(params: {
    agentAddress?: string;
    address: string;
  }): Promise<OnchainTxResult> {
    try {
      const agentAddr = (params.agentAddress || this.agentAddress) as `0x${string}`;

      const hash = await this.walletClient.writeContract({
        account: this.walletClient.account!,
        chain: this.chain,
        address: this.registryAddress,
        abi: AGENT_REGISTRY_ABI,
        functionName: 'removeFromWhitelist',
        args: [agentAddr, params.address as `0x${string}`],
      });

      await this.publicClient.waitForTransactionReceipt({ hash });

      return { success: true, txHash: hash };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Whitelist remove failed',
      };
    }
  }

  /**
   * Add address to blacklist
   */
  async addToBlacklist(params: {
    agentAddress?: string;
    address: string;
  }): Promise<OnchainTxResult> {
    try {
      const agentAddr = (params.agentAddress || this.agentAddress) as `0x${string}`;

      const hash = await this.walletClient.writeContract({
        account: this.walletClient.account!,
        chain: this.chain,
        address: this.registryAddress,
        abi: AGENT_REGISTRY_ABI,
        functionName: 'addToBlacklist',
        args: [agentAddr, params.address as `0x${string}`],
      });

      await this.publicClient.waitForTransactionReceipt({ hash });

      return { success: true, txHash: hash };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Blacklist add failed',
      };
    }
  }

  /**
   * Remove address from blacklist
   */
  async removeFromBlacklist(params: {
    agentAddress?: string;
    address: string;
  }): Promise<OnchainTxResult> {
    try {
      const agentAddr = (params.agentAddress || this.agentAddress) as `0x${string}`;

      const hash = await this.walletClient.writeContract({
        account: this.walletClient.account!,
        chain: this.chain,
        address: this.registryAddress,
        abi: AGENT_REGISTRY_ABI,
        functionName: 'removeFromBlacklist',
        args: [agentAddr, params.address as `0x${string}`],
      });

      await this.publicClient.waitForTransactionReceipt({ hash });

      return { success: true, txHash: hash };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Blacklist remove failed',
      };
    }
  }

  /**
   * Deactivate agent (emergency stop)
   */
  async deactivateAgent(agentAddress?: string): Promise<OnchainTxResult> {
    try {
      const agentAddr = (agentAddress || this.agentAddress) as `0x${string}`;

      const hash = await this.walletClient.writeContract({
        account: this.walletClient.account!,
        chain: this.chain,
        address: this.registryAddress,
        abi: AGENT_REGISTRY_ABI,
        functionName: 'deactivateAgent',
        args: [agentAddr],
      });

      await this.publicClient.waitForTransactionReceipt({ hash });

      return { success: true, txHash: hash };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Deactivation failed',
      };
    }
  }

  /**
   * Reactivate agent
   */
  async reactivateAgent(agentAddress?: string): Promise<OnchainTxResult> {
    try {
      const agentAddr = (agentAddress || this.agentAddress) as `0x${string}`;

      const hash = await this.walletClient.writeContract({
        account: this.walletClient.account!,
        chain: this.chain,
        address: this.registryAddress,
        abi: AGENT_REGISTRY_ABI,
        functionName: 'reactivateAgent',
        args: [agentAddr],
      });

      await this.publicClient.waitForTransactionReceipt({ hash });

      return { success: true, txHash: hash };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Reactivation failed',
      };
    }
  }

  /**
   * Get agent info from on-chain
   */
  async getAgentInfo(agentAddress?: string): Promise<OnchainAgentInfo | null> {
    try {
      const agentAddr = (agentAddress || this.agentAddress) as `0x${string}`;

      const [config, balance, remainingBudget] = await Promise.all([
        this.publicClient.readContract({
          address: this.registryAddress,
          abi: AGENT_REGISTRY_ABI,
          functionName: 'getAgentConfig',
          args: [agentAddr],
        }) as Promise<{
          owner: Address;
          dailyBudget: bigint;
          perTxLimit: bigint;
          todaySpent: bigint;
          lastResetTimestamp: bigint;
          active: boolean;
        }>,
        this.publicClient.readContract({
          address: this.registryAddress,
          abi: AGENT_REGISTRY_ABI,
          functionName: 'getAgentBalance',
          args: [agentAddr],
        }) as Promise<bigint>,
        this.publicClient.readContract({
          address: this.registryAddress,
          abi: AGENT_REGISTRY_ABI,
          functionName: 'getRemainingDailyBudget',
          args: [agentAddr],
        }) as Promise<bigint>,
      ]);

      // Check if agent is registered (owner is zero address if not)
      if (config.owner === '0x0000000000000000000000000000000000000000') {
        return null;
      }

      return {
        owner: config.owner,
        dailyBudget: formatUnits(config.dailyBudget, 18),
        perTxLimit: formatUnits(config.perTxLimit, 18),
        todaySpent: formatUnits(config.todaySpent, 18),
        lastResetTimestamp: Number(config.lastResetTimestamp),
        active: config.active,
        balance: formatUnits(balance, 18),
        remainingDailyBudget: formatUnits(remainingBudget, 18),
      };
    } catch (error) {
      console.error('Failed to get agent info:', error);
      return null;
    }
  }

  /**
   * Get whitelist for an agent
   */
  async getWhitelist(agentAddress?: string): Promise<string[]> {
    try {
      const agentAddr = (agentAddress || this.agentAddress) as `0x${string}`;

      const whitelist = await this.publicClient.readContract({
        address: this.registryAddress,
        abi: AGENT_REGISTRY_ABI,
        functionName: 'getWhitelist',
        args: [agentAddr],
      }) as Address[];

      return whitelist as string[];
    } catch (error) {
      console.error('Failed to get whitelist:', error);
      return [];
    }
  }

  /**
   * Get blacklist for an agent
   */
  async getBlacklist(agentAddress?: string): Promise<string[]> {
    try {
      const agentAddr = (agentAddress || this.agentAddress) as `0x${string}`;

      const blacklist = await this.publicClient.readContract({
        address: this.registryAddress,
        abi: AGENT_REGISTRY_ABI,
        functionName: 'getBlacklist',
        args: [agentAddr],
      }) as Address[];

      return blacklist as string[];
    } catch (error) {
      console.error('Failed to get blacklist:', error);
      return [];
    }
  }

  /**
   * Check if an address is whitelisted
   */
  async isWhitelisted(params: {
    agentAddress?: string;
    address: string;
  }): Promise<boolean> {
    try {
      const agentAddr = (params.agentAddress || this.agentAddress) as `0x${string}`;

      return await this.publicClient.readContract({
        address: this.registryAddress,
        abi: AGENT_REGISTRY_ABI,
        functionName: 'isWhitelisted',
        args: [agentAddr, params.address as `0x${string}`],
      }) as boolean;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if an address is blacklisted
   */
  async isBlacklisted(params: {
    agentAddress?: string;
    address: string;
  }): Promise<boolean> {
    try {
      const agentAddr = (params.agentAddress || this.agentAddress) as `0x${string}`;

      return await this.publicClient.readContract({
        address: this.registryAddress,
        abi: AGENT_REGISTRY_ABI,
        functionName: 'isBlacklisted',
        args: [agentAddr, params.address as `0x${string}`],
      }) as boolean;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Create an on-chain agent manager
 */
export function createOnchainAgentManager(config: OnchainAgentConfig): OnchainAgentManager {
  return new OnchainAgentManager(config);
}
