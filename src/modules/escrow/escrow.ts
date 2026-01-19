/**
 * Escrow Module - Multi-party Conditional Payments
 *
 * Secure escrow for marketplace, freelance, and multi-party transactions.
 * Uses the deployed ArcPayEscrow contract on Arc Testnet.
 */

import {
  createWalletClient,
  createPublicClient,
  http,
  parseUnits,
  formatUnits,
  type Chain,
  type PublicClient,
  type WalletClient,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import type {
  EscrowConfig,
  CreateEscrowParams,
  Escrow,
  EscrowState,
  Dispute,
  Milestone,
  FundResult,
  ReleaseResult,
  RefundResult,
  EscrowStats,
} from './types';
import { getContractAddresses, ESCROW_ABI } from '../../contracts';

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

const USDC_DECIMALS = 6;

const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
] as const;

/**
 * Convert contract state to string state
 */
function stateToString(state: number): EscrowState {
  const states: EscrowState[] = ['created', 'funded', 'released', 'refunded', 'disputed', 'resolved'];
  return states[state] || 'created';
}

/**
 * Escrow Manager for multi-party conditional payments
 */
export class EscrowManager {
  private walletClient: WalletClient;
  private publicClient: PublicClient;
  private account: ReturnType<typeof privateKeyToAccount>;
  private config: EscrowConfig;
  private contractAddress: `0x${string}`;
  private usdcAddress: `0x${string}`;

  // Local cache for quick lookups
  private escrowCache: Map<string, Escrow> = new Map();
  private milestonesCache: Map<string, Milestone[]> = new Map();

  constructor(config: EscrowConfig) {
    this.config = {
      disputePeriod: 604800, // 7 days
      expiryPeriod: 2592000, // 30 days
      feePercentage: 100, // 1%
      ...config,
    };

    const addresses = getContractAddresses(5042002);
    this.contractAddress = addresses.escrow as `0x${string}`;
    this.usdcAddress = addresses.usdc as `0x${string}`;

    this.account = privateKeyToAccount(config.privateKey as `0x${string}`);

    this.publicClient = createPublicClient({
      chain: arcTestnet,
      transport: http(config.rpcUrl || 'https://rpc.testnet.arc.network'),
    });

    this.walletClient = createWalletClient({
      account: this.account,
      chain: arcTestnet,
      transport: http(config.rpcUrl || 'https://rpc.testnet.arc.network'),
    });
  }

  /**
   * Create a new escrow on-chain
   */
  async createEscrow(params: CreateEscrowParams): Promise<Escrow> {
    const amount = parseUnits(params.amount, USDC_DECIMALS);
    const expiresAt = params.expiresAt
      ? Math.floor(new Date(params.expiresAt).getTime() / 1000)
      : Math.floor(Date.now() / 1000) + (this.config.expiryPeriod || 2592000);

    const arbiter = params.arbitrators?.[0] || '0x0000000000000000000000000000000000000000';
    const conditionHash = params.description || '';

    // Create escrow on contract
    const hash = await this.walletClient.writeContract({
      chain: arcTestnet,
      account: this.account,
      address: this.contractAddress,
      abi: ESCROW_ABI,
      functionName: 'createEscrow',
      args: [
        params.beneficiary as `0x${string}`,
        arbiter as `0x${string}`,
        amount,
        BigInt(expiresAt),
        conditionHash,
      ],
    });

    // Wait for transaction
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

    // For now, generate a local ID and map to on-chain
    const escrowId = receipt.logs[0]?.topics[1] || `0x${hash.slice(2, 66)}`;

    const escrow: Escrow = {
      id: escrowId,
      depositor: params.depositor,
      beneficiary: params.beneficiary,
      amount: params.amount,
      state: 'created',
      conditions: params.conditions.map((c) => ({ ...c, isMet: false })),
      arbitrators: params.arbitrators || [],
      createdAt: new Date().toISOString(),
      expiresAt: new Date(expiresAt * 1000).toISOString(),
      description: params.description,
      transactions: [
        {
          type: 'create',
          txHash: hash,
          amount: '0',
          timestamp: new Date().toISOString(),
          from: this.account.address,
          to: this.contractAddress,
        },
      ],
      disputes: [],
      feeAmount: '0',
      metadata: { ...params.metadata, onChainId: escrowId },
    };

    this.escrowCache.set(escrowId, escrow);
    return escrow;
  }

  /**
   * Fund an escrow on-chain
   */
  async fundEscrow(escrowId: string): Promise<FundResult> {
    const escrow = this.escrowCache.get(escrowId);
    if (!escrow) {
      return {
        success: false,
        escrowId,
        newState: 'created',
        amountFunded: '0',
        error: 'Escrow not found in cache',
      };
    }

    try {
      const amount = parseUnits(escrow.amount, USDC_DECIMALS);

      // First approve USDC spending
      const approveHash = await this.walletClient.writeContract({
        chain: arcTestnet,
        account: this.account,
        address: this.usdcAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [this.contractAddress, amount],
      });
      await this.publicClient.waitForTransactionReceipt({ hash: approveHash });

      // Fund the escrow
      const fundHash = await this.walletClient.writeContract({
        chain: arcTestnet,
        account: this.account,
        address: this.contractAddress,
        abi: ESCROW_ABI,
        functionName: 'fundEscrow',
        args: [escrowId as `0x${string}`],
      });
      await this.publicClient.waitForTransactionReceipt({ hash: fundHash });

      escrow.state = 'funded';
      escrow.fundedAt = new Date().toISOString();
      escrow.transactions.push({
        type: 'fund',
        txHash: fundHash,
        amount: escrow.amount,
        timestamp: new Date().toISOString(),
        from: escrow.depositor,
        to: this.contractAddress,
      });

      this.escrowCache.set(escrowId, escrow);

      return {
        success: true,
        escrowId,
        txHash: fundHash,
        newState: 'funded',
        amountFunded: escrow.amount,
      };
    } catch (error) {
      return {
        success: false,
        escrowId,
        newState: escrow.state,
        amountFunded: '0',
        error: error instanceof Error ? error.message : 'Funding failed',
      };
    }
  }

  /**
   * Create and fund escrow in one transaction
   */
  async createAndFundEscrow(params: CreateEscrowParams): Promise<{ escrow: Escrow; fundResult: FundResult }> {
    const amount = parseUnits(params.amount, USDC_DECIMALS);
    const expiresAt = params.expiresAt
      ? Math.floor(new Date(params.expiresAt).getTime() / 1000)
      : Math.floor(Date.now() / 1000) + (this.config.expiryPeriod || 2592000);

    const arbiter = params.arbitrators?.[0] || '0x0000000000000000000000000000000000000000';

    try {
      // Approve USDC
      const approveHash = await this.walletClient.writeContract({
        chain: arcTestnet,
        account: this.account,
        address: this.usdcAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [this.contractAddress, amount],
      });
      await this.publicClient.waitForTransactionReceipt({ hash: approveHash });

      // Create and fund
      const hash = await this.walletClient.writeContract({
        chain: arcTestnet,
        account: this.account,
        address: this.contractAddress,
        abi: ESCROW_ABI,
        functionName: 'createAndFundEscrow',
        args: [
          params.beneficiary as `0x${string}`,
          arbiter as `0x${string}`,
          amount,
          BigInt(expiresAt),
          params.description || '',
        ],
      });

      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
      const escrowId = receipt.logs[0]?.topics[1] || `0x${hash.slice(2, 66)}`;

      const escrow: Escrow = {
        id: escrowId,
        depositor: params.depositor,
        beneficiary: params.beneficiary,
        amount: params.amount,
        state: 'funded',
        conditions: params.conditions.map((c) => ({ ...c, isMet: false })),
        arbitrators: params.arbitrators || [],
        createdAt: new Date().toISOString(),
        fundedAt: new Date().toISOString(),
        expiresAt: new Date(expiresAt * 1000).toISOString(),
        description: params.description,
        transactions: [
          {
            type: 'fund',
            txHash: hash,
            amount: params.amount,
            timestamp: new Date().toISOString(),
            from: params.depositor,
            to: this.contractAddress,
          },
        ],
        disputes: [],
        feeAmount: '0',
        metadata: { ...params.metadata, onChainId: escrowId },
      };

      this.escrowCache.set(escrowId, escrow);

      return {
        escrow,
        fundResult: {
          success: true,
          escrowId,
          txHash: hash,
          newState: 'funded',
          amountFunded: params.amount,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Release escrow to beneficiary
   */
  async releaseEscrow(escrowId: string): Promise<ReleaseResult> {
    const escrow = this.escrowCache.get(escrowId);
    if (!escrow) {
      return {
        success: false,
        escrowId,
        newState: 'funded',
        amountReleased: '0',
        recipient: '',
        error: 'Escrow not found',
      };
    }

    try {
      const hash = await this.walletClient.writeContract({
        chain: arcTestnet,
        account: this.account,
        address: this.contractAddress,
        abi: ESCROW_ABI,
        functionName: 'releaseEscrow',
        args: [escrowId as `0x${string}`],
      });

      await this.publicClient.waitForTransactionReceipt({ hash });

      escrow.state = 'released';
      escrow.releasedAt = new Date().toISOString();
      escrow.transactions.push({
        type: 'release',
        txHash: hash,
        amount: escrow.amount,
        timestamp: new Date().toISOString(),
        from: this.contractAddress,
        to: escrow.beneficiary,
      });

      this.escrowCache.set(escrowId, escrow);

      return {
        success: true,
        escrowId,
        txHash: hash,
        newState: 'released',
        amountReleased: escrow.amount,
        recipient: escrow.beneficiary,
      };
    } catch (error) {
      return {
        success: false,
        escrowId,
        newState: escrow.state,
        amountReleased: '0',
        recipient: escrow.beneficiary,
        error: error instanceof Error ? error.message : 'Release failed',
      };
    }
  }

  /**
   * Refund escrow to depositor (after expiry)
   */
  async refundEscrow(escrowId: string): Promise<RefundResult> {
    const escrow = this.escrowCache.get(escrowId);
    if (!escrow) {
      return {
        success: false,
        escrowId,
        newState: 'funded',
        amountRefunded: '0',
        recipient: '',
        error: 'Escrow not found',
      };
    }

    try {
      const hash = await this.walletClient.writeContract({
        chain: arcTestnet,
        account: this.account,
        address: this.contractAddress,
        abi: ESCROW_ABI,
        functionName: 'refundEscrow',
        args: [escrowId as `0x${string}`],
      });

      await this.publicClient.waitForTransactionReceipt({ hash });

      escrow.state = 'refunded';
      escrow.transactions.push({
        type: 'refund',
        txHash: hash,
        amount: escrow.amount,
        timestamp: new Date().toISOString(),
        from: this.contractAddress,
        to: escrow.depositor,
      });

      this.escrowCache.set(escrowId, escrow);

      return {
        success: true,
        escrowId,
        txHash: hash,
        newState: 'refunded',
        amountRefunded: escrow.amount,
        recipient: escrow.depositor,
      };
    } catch (error) {
      return {
        success: false,
        escrowId,
        newState: escrow.state,
        amountRefunded: '0',
        recipient: escrow.depositor,
        error: error instanceof Error ? error.message : 'Refund failed',
      };
    }
  }

  /**
   * Create a dispute
   */
  async createDispute(escrowId: string, reason: string): Promise<Dispute | null> {
    const escrow = this.escrowCache.get(escrowId);
    if (!escrow) return null;

    try {
      const hash = await this.walletClient.writeContract({
        chain: arcTestnet,
        account: this.account,
        address: this.contractAddress,
        abi: ESCROW_ABI,
        functionName: 'createDispute',
        args: [escrowId as `0x${string}`, reason],
      });

      await this.publicClient.waitForTransactionReceipt({ hash });

      const dispute: Dispute = {
        id: `dispute_${Date.now()}`,
        raisedBy: this.account.address,
        reason,
        state: 'open',
        createdAt: new Date().toISOString(),
      };

      escrow.state = 'disputed';
      escrow.disputes.push(dispute);
      this.escrowCache.set(escrowId, escrow);

      return dispute;
    } catch (error) {
      return null;
    }
  }

  /**
   * Resolve a dispute (arbiter only)
   */
  async resolveDispute(
    escrowId: string,
    depositorShare: number, // 0-10000 basis points
    beneficiaryShare: number // 0-10000 basis points
  ): Promise<{ success: boolean; txHash?: string }> {
    try {
      const hash = await this.walletClient.writeContract({
        chain: arcTestnet,
        account: this.account,
        address: this.contractAddress,
        abi: ESCROW_ABI,
        functionName: 'resolveDispute',
        args: [escrowId as `0x${string}`, BigInt(depositorShare), BigInt(beneficiaryShare)],
      });

      await this.publicClient.waitForTransactionReceipt({ hash });

      const escrow = this.escrowCache.get(escrowId);
      if (escrow) {
        escrow.state = 'resolved';
        this.escrowCache.set(escrowId, escrow);
      }

      return { success: true, txHash: hash };
    } catch (error) {
      return { success: false };
    }
  }

  /**
   * Get escrow from cache or chain
   */
  async getEscrow(escrowId: string): Promise<Escrow | null> {
    // Check cache first
    const cached = this.escrowCache.get(escrowId);
    if (cached) return cached;

    // Fetch from chain
    try {
      const result = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: ESCROW_ABI,
        functionName: 'getEscrow',
        args: [escrowId as `0x${string}`],
      });

      const data = result as {
        id: string;
        depositor: string;
        beneficiary: string;
        arbiter: string;
        token: string;
        amount: bigint;
        fundedAt: bigint;
        expiresAt: bigint;
        state: number;
        conditionHash: string;
        releasedAmount: bigint;
        refundedAmount: bigint;
      };

      const escrow: Escrow = {
        id: escrowId,
        depositor: data.depositor,
        beneficiary: data.beneficiary,
        amount: formatUnits(data.amount, USDC_DECIMALS),
        state: stateToString(data.state),
        conditions: [],
        arbitrators: data.arbiter !== '0x0000000000000000000000000000000000000000' ? [data.arbiter] : [],
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Number(data.expiresAt) * 1000).toISOString(),
        fundedAt: data.fundedAt > 0 ? new Date(Number(data.fundedAt) * 1000).toISOString() : undefined,
        description: data.conditionHash,
        transactions: [],
        disputes: [],
        feeAmount: '0',
        metadata: { onChainId: escrowId },
      };

      this.escrowCache.set(escrowId, escrow);
      return escrow;
    } catch {
      return null;
    }
  }

  /**
   * Get user's escrows
   */
  async getUserEscrows(userAddress: string): Promise<string[]> {
    try {
      const result = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: ESCROW_ABI,
        functionName: 'getUserEscrows',
        args: [userAddress as `0x${string}`],
      });
      return result as string[];
    } catch {
      return [];
    }
  }

  /**
   * Get escrow stats
   */
  async getStats(): Promise<EscrowStats> {
    const escrows = Array.from(this.escrowCache.values());

    let totalVolume = 0n;
    let releasedAmount = 0n;
    let refundedAmount = 0n;
    let totalDuration = 0;
    let completedCount = 0;

    for (const escrow of escrows) {
      const amount = parseUnits(escrow.amount, USDC_DECIMALS);
      totalVolume += amount;
      if (escrow.state === 'released') {
        releasedAmount += amount;
        completedCount++;
        if (escrow.createdAt && escrow.releasedAt) {
          totalDuration += new Date(escrow.releasedAt).getTime() - new Date(escrow.createdAt).getTime();
        }
      }
      if (escrow.state === 'refunded') {
        refundedAmount += amount;
        completedCount++;
      }
    }

    const activeCount = escrows.filter((e) => e.state === 'funded' || e.state === 'active').length;
    const disputedCount = escrows.filter((e) => e.state === 'disputed').length;
    const disputeRate = escrows.length > 0 ? disputedCount / escrows.length : 0;
    const avgDuration = completedCount > 0 ? Math.floor(totalDuration / completedCount / 1000) : 0;

    return {
      totalCreated: escrows.length,
      activeCount,
      totalVolume: formatUnits(totalVolume, USDC_DECIMALS),
      totalReleased: formatUnits(releasedAmount, USDC_DECIMALS),
      totalRefunded: formatUnits(refundedAmount, USDC_DECIMALS),
      disputeRate,
      averageDuration: avgDuration,
    };
  }

  /**
   * Add milestones to escrow
   */
  async addMilestones(
    escrowId: string,
    milestones: Array<{ amount: string; description: string }>
  ): Promise<boolean> {
    try {
      const amounts = milestones.map((m) => parseUnits(m.amount, USDC_DECIMALS));
      const descriptions = milestones.map((m) => m.description);

      const hash = await this.walletClient.writeContract({
        chain: arcTestnet,
        account: this.account,
        address: this.contractAddress,
        abi: ESCROW_ABI,
        functionName: 'addMilestones',
        args: [escrowId as `0x${string}`, amounts, descriptions],
      });

      await this.publicClient.waitForTransactionReceipt({ hash });

      // Update local cache
      const localMilestones: Milestone[] = milestones.map((m, i) => ({
        id: `${escrowId}_milestone_${i}`,
        escrowId,
        description: m.description,
        amount: m.amount,
        status: 'pending',
      }));

      this.milestonesCache.set(escrowId, localMilestones);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Complete a milestone
   */
  async completeMilestone(escrowId: string, milestoneIndex: number): Promise<boolean> {
    try {
      const hash = await this.walletClient.writeContract({
        chain: arcTestnet,
        account: this.account,
        address: this.contractAddress,
        abi: ESCROW_ABI,
        functionName: 'completeMilestone',
        args: [escrowId as `0x${string}`, BigInt(milestoneIndex)],
      });

      await this.publicClient.waitForTransactionReceipt({ hash });

      // Update local cache
      const milestones = this.milestonesCache.get(escrowId);
      if (milestones && milestones[milestoneIndex]) {
        milestones[milestoneIndex].status = 'completed';
        milestones[milestoneIndex].completedAt = new Date().toISOString();
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get contract address
   */
  getContractAddress(): string {
    return this.contractAddress;
  }
}

/**
 * Create escrow manager instance
 */
export function createEscrowManager(config: EscrowConfig): EscrowManager {
  return new EscrowManager(config);
}
