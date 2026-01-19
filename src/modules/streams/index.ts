/**
 * Stream Payments Module
 *
 * Real-time streaming payments for salaries, subscriptions, and continuous payments.
 * Uses the deployed ArcPayStreamPayment contract on Arc Testnet.
 */

import {
  createWalletClient,
  createPublicClient,
  http,
  parseUnits,
  type Chain,
  type PublicClient,
  type WalletClient,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import type {
  StreamConfig,
  CreateStreamParams,
  Stream,
  StreamState,
  ClaimResult,
  CancelResult,
  ClaimableInfo,
  StreamStats,
  PauseResumeResult,
} from './types';
import { getContractAddresses, STREAM_PAYMENT_ABI } from '../../contracts';

// Re-export types
export type {
  StreamConfig,
  CreateStreamParams,
  Stream,
  StreamState,
  ClaimResult,
  CancelResult,
  ClaimableInfo,
  StreamStats,
  PauseResumeResult,
};

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

// Arc uses native USDC as gas token with 18 decimals
const USDC_DECIMALS = 18;

/**
 * Stream Payment Manager
 */
export class StreamManager {
  private account: ReturnType<typeof privateKeyToAccount>;
  private walletClient: WalletClient;
  private publicClient: PublicClient;
  private contractAddress: `0x${string}`;
  private streams: Map<string, Stream> = new Map();

  constructor(config: StreamConfig) {
    // Get deployed contract addresses
    const addresses = getContractAddresses(5042002);
    this.contractAddress = (config.streamContract as `0x${string}`) || (addresses.streamPayment as `0x${string}`);

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
   * Create a new payment stream
   */
  async createStream(params: CreateStreamParams): Promise<Stream> {
    const amount = parseUnits(params.totalAmount, USDC_DECIMALS);
    const now = Math.floor(Date.now() / 1000);
    const startTime = params.startAt || now;
    const endTime = startTime + params.duration;

    // Check if contract is deployed
    if (this.contractAddress === '0x0000000000000000000000000000000000000000') {
      // Local/mock stream
      const streamId = `stream_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const ratePerSecond = (parseFloat(params.totalAmount) / params.duration).toFixed(12);

      const stream: Stream = {
        id: streamId,
        sender: this.account.address,
        recipient: params.recipient,
        totalAmount: params.totalAmount,
        claimedAmount: '0',
        ratePerSecond,
        startTime,
        endTime,
        state: 'active',
        createdAt: new Date().toISOString(),
      };

      this.streams.set(streamId, stream);
      return stream;
    }

    // On-chain stream (native USDC - no approve needed)
    try {
      // Create stream with native value
      const hash = await this.walletClient.writeContract({
        chain: arcTestnet,
        account: this.account,
        address: this.contractAddress,
        abi: STREAM_PAYMENT_ABI,
        functionName: 'createStream',
        args: [params.recipient as `0x${string}`, amount, BigInt(params.duration)],
        value: amount, // Send native USDC
      });

      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

      // Extract stream ID from StreamCreated event (first indexed topic after event signature)
      const streamCreatedLog = receipt.logs.find(log =>
        log.address.toLowerCase() === this.contractAddress.toLowerCase()
      );
      const streamId = streamCreatedLog?.topics[1] || `0x${hash.slice(2, 66)}`;

      const ratePerSecond = (parseFloat(params.totalAmount) / params.duration).toFixed(12);

      const stream: Stream = {
        id: streamId,
        sender: this.account.address,
        recipient: params.recipient,
        totalAmount: params.totalAmount,
        claimedAmount: '0',
        ratePerSecond,
        startTime,
        endTime,
        state: 'active',
        txHash: hash,
        createdAt: new Date().toISOString(),
      };

      this.streams.set(streamId, stream);
      return stream;
    } catch (error) {
      throw new Error(`Failed to create stream: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Claim available funds from a stream
   */
  async claim(streamId: string): Promise<ClaimResult> {
    const stream = this.streams.get(streamId);

    // Check if contract is deployed
    if (this.contractAddress === '0x0000000000000000000000000000000000000000') {
      // Local/mock claim
      if (!stream) {
        return { success: false, streamId, amountClaimed: '0', txHash: '', error: 'Stream not found' };
      }

      const claimable = this.calculateClaimable(stream);
      stream.claimedAmount = (parseFloat(stream.claimedAmount) + parseFloat(claimable)).toString();
      this.streams.set(streamId, stream);

      return {
        success: true,
        streamId,
        amountClaimed: claimable,
        txHash: `local_claim_${Date.now()}`,
      };
    }

    // On-chain claim
    try {
      const hash = await this.walletClient.writeContract({
        chain: arcTestnet,
        account: this.account,
        address: this.contractAddress,
        abi: STREAM_PAYMENT_ABI,
        functionName: 'claim',
        args: [streamId as `0x${string}`],
      });

      await this.publicClient.waitForTransactionReceipt({ hash });

      // Parse claimed amount from logs if needed
      const claimedAmount = stream ? this.calculateClaimable(stream) : '0';

      if (stream) {
        stream.claimedAmount = (parseFloat(stream.claimedAmount) + parseFloat(claimedAmount)).toString();
        this.streams.set(streamId, stream);
      }

      return {
        success: true,
        streamId,
        amountClaimed: claimedAmount,
        txHash: hash,
      };
    } catch (error) {
      return {
        success: false,
        streamId,
        amountClaimed: '0',
        txHash: '',
        error: error instanceof Error ? error.message : 'Claim failed',
      };
    }
  }

  /**
   * Pause a stream
   */
  async pause(streamId: string): Promise<PauseResumeResult> {
    const stream = this.streams.get(streamId);

    // Check if contract is deployed
    if (this.contractAddress === '0x0000000000000000000000000000000000000000') {
      // Local/mock pause
      if (!stream) {
        return { success: false, streamId, error: 'Stream not found' };
      }

      stream.state = 'paused';
      this.streams.set(streamId, stream);
      return { success: true, streamId };
    }

    // On-chain pause
    try {
      const hash = await this.walletClient.writeContract({
        chain: arcTestnet,
        account: this.account,
        address: this.contractAddress,
        abi: STREAM_PAYMENT_ABI,
        functionName: 'pauseStream',
        args: [streamId as `0x${string}`],
      });

      await this.publicClient.waitForTransactionReceipt({ hash });

      if (stream) {
        stream.state = 'paused';
        this.streams.set(streamId, stream);
      }

      return { success: true, streamId, txHash: hash };
    } catch (error) {
      return {
        success: false,
        streamId,
        error: error instanceof Error ? error.message : 'Pause failed',
      };
    }
  }

  /**
   * Resume a paused stream
   */
  async resume(streamId: string): Promise<PauseResumeResult> {
    const stream = this.streams.get(streamId);

    // Check if contract is deployed
    if (this.contractAddress === '0x0000000000000000000000000000000000000000') {
      // Local/mock resume
      if (!stream) {
        return { success: false, streamId, error: 'Stream not found' };
      }

      stream.state = 'active';
      this.streams.set(streamId, stream);
      return { success: true, streamId };
    }

    // On-chain resume
    try {
      const hash = await this.walletClient.writeContract({
        chain: arcTestnet,
        account: this.account,
        address: this.contractAddress,
        abi: STREAM_PAYMENT_ABI,
        functionName: 'resumeStream',
        args: [streamId as `0x${string}`],
      });

      await this.publicClient.waitForTransactionReceipt({ hash });

      if (stream) {
        stream.state = 'active';
        this.streams.set(streamId, stream);
      }

      return { success: true, streamId, txHash: hash };
    } catch (error) {
      return {
        success: false,
        streamId,
        error: error instanceof Error ? error.message : 'Resume failed',
      };
    }
  }

  /**
   * Cancel a stream
   */
  async cancelStream(streamId: string): Promise<CancelResult> {
    const stream = this.streams.get(streamId);

    if (!stream) {
      return {
        success: false,
        streamId,
        refundedAmount: '0',
        recipientAmount: '0',
        txHash: '',
        error: 'Stream not found',
      };
    }

    // Check if contract is deployed
    if (this.contractAddress === '0x0000000000000000000000000000000000000000') {
      // Local/mock cancel
      const claimable = this.calculateClaimable(stream);
      const refund = (parseFloat(stream.totalAmount) - parseFloat(stream.claimedAmount) - parseFloat(claimable)).toString();

      stream.state = 'cancelled';
      this.streams.set(streamId, stream);

      return {
        success: true,
        streamId,
        refundedAmount: refund,
        recipientAmount: claimable,
        txHash: `local_cancel_${Date.now()}`,
      };
    }

    // On-chain cancel
    try {
      const hash = await this.walletClient.writeContract({
        chain: arcTestnet,
        account: this.account,
        address: this.contractAddress,
        abi: STREAM_PAYMENT_ABI,
        functionName: 'cancelStream',
        args: [streamId as `0x${string}`],
      });

      await this.publicClient.waitForTransactionReceipt({ hash });

      const claimable = this.calculateClaimable(stream);
      const refund = (parseFloat(stream.totalAmount) - parseFloat(stream.claimedAmount) - parseFloat(claimable)).toString();

      stream.state = 'cancelled';
      this.streams.set(streamId, stream);

      return {
        success: true,
        streamId,
        refundedAmount: refund,
        recipientAmount: claimable,
        txHash: hash,
      };
    } catch (error) {
      return {
        success: false,
        streamId,
        refundedAmount: '0',
        recipientAmount: '0',
        txHash: '',
        error: error instanceof Error ? error.message : 'Cancel failed',
      };
    }
  }

  /**
   * Get claimable amount for a stream
   */
  async getClaimable(streamId: string): Promise<ClaimableInfo> {
    const stream = this.streams.get(streamId);

    if (!stream) {
      return {
        streamId,
        claimable: '0',
        totalClaimed: '0',
        remaining: '0',
        progress: 0,
      };
    }

    const claimable = this.calculateClaimable(stream);
    const remaining = (parseFloat(stream.totalAmount) - parseFloat(stream.claimedAmount) - parseFloat(claimable)).toString();
    const progress = (parseFloat(stream.claimedAmount) + parseFloat(claimable)) / parseFloat(stream.totalAmount) * 100;

    return {
      streamId,
      claimable,
      totalClaimed: stream.claimedAmount,
      remaining,
      progress: Math.min(progress, 100),
    };
  }

  /**
   * Get a stream by ID
   */
  getStream(streamId: string): Stream | undefined {
    return this.streams.get(streamId);
  }

  /**
   * Get all streams
   */
  getAllStreams(): Stream[] {
    return Array.from(this.streams.values());
  }

  /**
   * Get sender streams
   */
  getSenderStreams(): Stream[] {
    return Array.from(this.streams.values()).filter(
      (s) => s.sender.toLowerCase() === this.account.address.toLowerCase()
    );
  }

  /**
   * Get recipient streams
   */
  getRecipientStreams(): Stream[] {
    return Array.from(this.streams.values()).filter(
      (s) => s.recipient.toLowerCase() === this.account.address.toLowerCase()
    );
  }

  /**
   * Get stream stats
   */
  async getStats(): Promise<StreamStats> {
    const streams = Array.from(this.streams.values());

    let totalVolume = 0;
    let totalClaimed = 0;

    for (const stream of streams) {
      totalVolume += parseFloat(stream.totalAmount);
      totalClaimed += parseFloat(stream.claimedAmount);
    }

    return {
      totalCreated: streams.length,
      activeCount: streams.filter((s) => s.state === 'active').length,
      totalVolume: totalVolume.toString(),
      totalClaimed: totalClaimed.toString(),
    };
  }

  /**
   * Calculate claimable amount for a stream
   */
  private calculateClaimable(stream: Stream): string {
    if (stream.state !== 'active') return '0';

    const now = Math.floor(Date.now() / 1000);
    const elapsed = Math.min(now, stream.endTime) - stream.startTime;

    if (elapsed <= 0) return '0';

    const totalStreamed = parseFloat(stream.ratePerSecond) * elapsed;
    const claimable = totalStreamed - parseFloat(stream.claimedAmount);

    return Math.max(0, claimable).toFixed(6);
  }

  /**
   * Get contract address
   */
  getContractAddress(): string {
    return this.contractAddress;
  }
}

/**
 * Create a stream manager
 */
export function createStreamManager(config: StreamConfig): StreamManager {
  return new StreamManager(config);
}

export default { StreamManager, createStreamManager };
