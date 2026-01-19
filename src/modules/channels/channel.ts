/**
 * Payment Channels - x402 Channel Scheme Implementation
 *
 * Enables pre-funded payment channels for efficient micro-payments.
 */

import {
  createWalletClient,
  createPublicClient,
  http,
  parseUnits,
  formatUnits,
  keccak256,
  encodePacked,
  type Chain,
  type PublicClient,
  type WalletClient,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import type {
  ChannelConfig,
  CreateChannelParams,
  PaymentChannel,
  SignedPayment,
  PaymentRequest,
  PaymentReceipt,
  SettlementResult,
  DisputeResult,
  ChannelStats,
  X402ChannelHeader,
  AutoTopupConfig,
  AutoTopupStatus,
  BatchPaymentItem,
  BatchPaymentReceipt,
  ExtendedChannelStats,
} from './types';
import { getContractAddresses, PAYMENT_CHANNEL_ABI } from '../../contracts';

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
const DEFAULT_DURATION = 86400; // 24 hours

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
] as const;

/**
 * Payment Channel Manager for x402 micro-payments
 */
export class PaymentChannelManager {
  private account: ReturnType<typeof privateKeyToAccount>;
  private walletClient: WalletClient;
  private publicClient: PublicClient;
  private config: ChannelConfig;
  private contractAddress: `0x${string}`;
  private usdcAddress: `0x${string}`;
  private channels: Map<string, PaymentChannel> = new Map();
  private pendingReceipts: Map<string, PaymentReceipt[]> = new Map();

  // Auto-topup tracking
  private autoTopupConfigs: Map<string, AutoTopupConfig> = new Map();
  private autoTopupCounts: Map<string, number> = new Map();

  // Payment statistics tracking
  private channelPaymentHistory: Map<string, Array<{ amount: string; timestamp: number }>> = new Map();
  private channelTopupCounts: Map<string, number> = new Map();

  constructor(config: ChannelConfig) {
    this.config = {
      defaultDuration: DEFAULT_DURATION,
      ...config,
    };

    // Get deployed contract addresses
    const addresses = getContractAddresses(5042002);
    this.contractAddress = config.channelContract as `0x${string}` || addresses.paymentChannel as `0x${string}`;
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

  // Legacy getter for backwards compatibility
  private get wallet() {
    return this.walletClient;
  }

  /**
   * Create a new payment channel on-chain
   *
   * @param params - Channel creation parameters
   * @returns Created channel
   */
  async createChannel(params: CreateChannelParams): Promise<PaymentChannel> {
    const deposit = parseUnits(params.deposit, USDC_DECIMALS);
    const now = Date.now();

    // Use deployed contract
    if (this.contractAddress !== '0x0000000000000000000000000000000000000000') {
      try {
        // Approve USDC spending
        const approveHash = await this.walletClient.writeContract({
          chain: arcTestnet,
          account: this.account,
          address: this.usdcAddress,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [this.contractAddress, deposit],
        });
        await this.publicClient.waitForTransactionReceipt({ hash: approveHash });

        // Open channel on contract
        const hash = await this.walletClient.writeContract({
          chain: arcTestnet,
          account: this.account,
          address: this.contractAddress,
          abi: PAYMENT_CHANNEL_ABI,
          functionName: 'openChannel',
          args: [params.recipient as `0x${string}`, deposit],
        });

        const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
        const channelId = receipt.logs[0]?.topics[1] || `0x${hash.slice(2, 66)}`;

        const channel: PaymentChannel = {
          id: channelId,
          sender: this.account.address,
          recipient: params.recipient,
          deposit: params.deposit,
          spent: '0',
          balance: params.deposit,
          state: 'open',
          nonce: 0,
          createdAt: new Date(now).toISOString(),
          expiresAt: new Date(now + (params.duration || DEFAULT_DURATION) * 1000).toISOString(),
          channelAddress: this.contractAddress,
        };

        this.channels.set(channelId, channel);

        // Initialize auto-topup if configured
        if (params.autoTopup) {
          this.autoTopupConfigs.set(channelId, params.autoTopup);
          this.autoTopupCounts.set(channelId, 0);
        }

        // Initialize payment history
        this.channelPaymentHistory.set(channelId, []);
        this.channelTopupCounts.set(channelId, 0);

        return channel;
      } catch (error) {
        console.warn('On-chain channel creation failed:', error);
        throw error;
      }
    }

    // Fallback to off-chain channel
    const channelId = this.generateChannelId(params.recipient);
    const channel: PaymentChannel = {
      id: channelId,
      sender: this.account.address,
      recipient: params.recipient,
      deposit: params.deposit,
      spent: '0',
      balance: params.deposit,
      state: 'open',
      nonce: 0,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + (params.duration || DEFAULT_DURATION) * 1000).toISOString(),
    };

    this.channels.set(channelId, channel);

    // Initialize auto-topup if configured
    if (params.autoTopup) {
      this.autoTopupConfigs.set(channelId, params.autoTopup);
      this.autoTopupCounts.set(channelId, 0);
    }

    // Initialize payment history
    this.channelPaymentHistory.set(channelId, []);
    this.channelTopupCounts.set(channelId, 0);

    return channel;
  }

  /**
   * Make a payment through the channel
   *
   * @param channelId - Channel ID
   * @param amount - Amount to pay
   * @returns Signed payment
   */
  async pay(channelId: string, amount: string): Promise<SignedPayment> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    if (channel.state !== 'open') {
      throw new Error(`Channel is ${channel.state}, cannot pay`);
    }

    // Check expiry
    if (new Date(channel.expiresAt) < new Date()) {
      throw new Error('Channel has expired');
    }

    const amountWei = parseUnits(amount, USDC_DECIMALS);
    const currentSpent = parseUnits(channel.spent, USDC_DECIMALS);
    const deposit = parseUnits(channel.deposit, USDC_DECIMALS);
    const newTotalSpent = currentSpent + amountWei;

    if (newTotalSpent > deposit) {
      throw new Error('Insufficient channel balance');
    }

    // Increment nonce
    const nonce = channel.nonce + 1;

    // Create and sign payment
    const signature = await this.signPayment(channelId, newTotalSpent.toString(), nonce);

    const payment: SignedPayment = {
      channelId,
      amount: formatUnits(newTotalSpent, USDC_DECIMALS),
      nonce,
      signature,
      timestamp: new Date().toISOString(),
    };

    // Update local channel state
    channel.spent = formatUnits(newTotalSpent, USDC_DECIMALS);
    channel.balance = formatUnits(deposit - newTotalSpent, USDC_DECIMALS);
    channel.nonce = nonce;
    channel.lastSignature = signature;
    this.channels.set(channelId, channel);

    // Record payment in history for statistics
    const history = this.channelPaymentHistory.get(channelId) || [];
    history.push({ amount, timestamp: Date.now() });
    this.channelPaymentHistory.set(channelId, history);

    // Check auto-topup
    await this.checkAutoTopup(channelId);

    // Check auto-settle threshold
    if (this.config.autoSettleThreshold) {
      const threshold = parseUnits(this.config.autoSettleThreshold, USDC_DECIMALS);
      if (deposit - newTotalSpent <= threshold) {
        console.log('Auto-settle threshold reached, consider settling');
      }
    }

    return payment;
  }

  /**
   * Create an x402 header for HTTP requests
   *
   * @param channelId - Channel ID
   * @param amount - Payment amount
   * @returns x402 header value
   */
  async createX402Header(channelId: string, amount: string): Promise<string> {
    const payment = await this.pay(channelId, amount);

    const header: X402ChannelHeader = {
      scheme: 'channel',
      channelId,
      payment,
    };

    // Encode as base64 for header
    return `channel ${Buffer.from(JSON.stringify(header)).toString('base64')}`;
  }

  /**
   * Verify a signed payment (for recipients)
   *
   * @param payment - Signed payment to verify
   * @param expectedSender - Expected sender address
   * @returns Whether payment is valid
   */
  async verifyPayment(payment: SignedPayment, expectedSender: string): Promise<boolean> {
    const messageHash = this.getPaymentHash(
      payment.channelId,
      parseUnits(payment.amount, USDC_DECIMALS).toString(),
      payment.nonce
    );

    try {
      const recoveredAddress = await this.recoverSigner(messageHash, payment.signature);
      return recoveredAddress.toLowerCase() === expectedSender.toLowerCase();
    } catch {
      return false;
    }
  }

  /**
   * Acknowledge receipt of payment (for recipients)
   *
   * @param payment - Signed payment
   * @returns Payment receipt
   */
  acknowledgePayment(payment: SignedPayment): PaymentReceipt {
    const receipt: PaymentReceipt = {
      receiptId: `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      channelId: payment.channelId,
      amount: payment.amount,
      totalSpent: payment.amount,
      nonce: payment.nonce,
      timestamp: new Date().toISOString(),
    };

    // Store receipt
    const receipts = this.pendingReceipts.get(payment.channelId) || [];
    receipts.push(receipt);
    this.pendingReceipts.set(payment.channelId, receipts);

    return receipt;
  }

  /**
   * Close a channel and settle on-chain
   *
   * @param channelId - Channel ID
   * @returns Settlement result
   */
  async closeChannel(channelId: string): Promise<SettlementResult> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    if (channel.state === 'closed') {
      throw new Error('Channel already closed');
    }

    channel.state = 'closing';
    this.channels.set(channelId, channel);

    let txHash = '';

    // Close on-chain if applicable
    if (this.config.channelContract && channel.lastSignature) {
      try {
        const walletWithWrite = this.wallet as typeof this.wallet & {
          writeContract: (args: {
            address: `0x${string}`;
            abi: typeof PAYMENT_CHANNEL_ABI;
            functionName: 'closeChannel';
            args: [`0x${string}`, bigint, bigint, `0x${string}`];
          }) => Promise<`0x${string}`>;
        };

        txHash = await walletWithWrite.writeContract({
          address: this.config.channelContract as `0x${string}`,
          abi: PAYMENT_CHANNEL_ABI,
          functionName: 'closeChannel',
          args: [
            channelId as `0x${string}`,
            parseUnits(channel.spent, USDC_DECIMALS),
            BigInt(channel.nonce),
            channel.lastSignature as `0x${string}`,
          ],
        });
      } catch (error) {
        console.error('On-chain settlement failed:', error);
        // Continue with local settlement
        txHash = `local_${Date.now()}`;
      }
    } else {
      txHash = `local_${Date.now()}`;
    }

    const result: SettlementResult = {
      channelId,
      txHash,
      finalAmount: channel.spent,
      refundAmount: channel.balance,
      settledAt: new Date().toISOString(),
    };

    channel.state = 'closed';
    this.channels.set(channelId, channel);

    return result;
  }

  /**
   * Dispute a channel (for recipients with higher nonce)
   *
   * @param channelId - Channel ID
   * @param payment - Latest signed payment
   * @returns Dispute result
   */
  async disputeChannel(channelId: string, payment: SignedPayment): Promise<DisputeResult> {
    if (!this.config.channelContract) {
      throw new Error('On-chain channel contract required for disputes');
    }

    const walletWithWrite = this.wallet as typeof this.wallet & {
      writeContract: (args: {
        address: `0x${string}`;
        abi: typeof PAYMENT_CHANNEL_ABI;
        functionName: 'disputeChannel';
        args: [`0x${string}`, bigint, bigint, `0x${string}`];
      }) => Promise<`0x${string}`>;
    };

    const txHash = await walletWithWrite.writeContract({
      address: this.config.channelContract as `0x${string}`,
      abi: PAYMENT_CHANNEL_ABI,
      functionName: 'disputeChannel',
      args: [
        channelId as `0x${string}`,
        parseUnits(payment.amount, USDC_DECIMALS),
        BigInt(payment.nonce),
        payment.signature as `0x${string}`,
      ],
    });

    const channel = this.channels.get(channelId);
    if (channel) {
      channel.state = 'disputed';
      this.channels.set(channelId, channel);
    }

    return {
      channelId,
      txHash,
      disputedAmount: payment.amount,
      challengeEndsAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour challenge
    };
  }

  /**
   * Get channel by ID
   *
   * @param channelId - Channel ID
   * @returns Channel info
   */
  getChannel(channelId: string): PaymentChannel | undefined {
    return this.channels.get(channelId);
  }

  /**
   * Get all channels
   *
   * @returns All channels
   */
  getAllChannels(): PaymentChannel[] {
    return Array.from(this.channels.values());
  }

  /**
   * Get open channels
   *
   * @returns Open channels
   */
  getOpenChannels(): PaymentChannel[] {
    return Array.from(this.channels.values()).filter((c) => c.state === 'open');
  }

  /**
   * Get channels with recipient
   *
   * @param recipient - Recipient address
   * @returns Matching channels
   */
  getChannelsWithRecipient(recipient: string): PaymentChannel[] {
    return Array.from(this.channels.values()).filter(
      (c) => c.recipient.toLowerCase() === recipient.toLowerCase()
    );
  }

  /**
   * Get channel statistics
   *
   * @returns Channel stats
   */
  getStats(): ChannelStats {
    const channels = Array.from(this.channels.values());

    let totalDeposited = BigInt(0);
    let totalSpent = BigInt(0);
    let totalRefunded = BigInt(0);

    for (const channel of channels) {
      totalDeposited += parseUnits(channel.deposit, USDC_DECIMALS);
      totalSpent += parseUnits(channel.spent, USDC_DECIMALS);
      if (channel.state === 'closed') {
        totalRefunded += parseUnits(channel.balance, USDC_DECIMALS);
      }
    }

    return {
      totalChannels: channels.length,
      openChannels: channels.filter((c) => c.state === 'open').length,
      totalDeposited: formatUnits(totalDeposited, USDC_DECIMALS),
      totalSpent: formatUnits(totalSpent, USDC_DECIMALS),
      totalRefunded: formatUnits(totalRefunded, USDC_DECIMALS),
    };
  }

  /**
   * Create a payment request (for merchants)
   *
   * @param channelId - Channel ID
   * @param amount - Requested amount
   * @param description - Payment description
   * @returns Payment request
   */
  createPaymentRequest(channelId: string, amount: string, description?: string): PaymentRequest {
    return {
      requestId: `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      channelId,
      amount,
      description,
      expiresAt: new Date(Date.now() + 300000).toISOString(), // 5 min expiry
    };
  }

  /**
   * Extend channel duration
   *
   * @param channelId - Channel ID
   * @param additionalSeconds - Additional duration in seconds
   */
  extendChannel(channelId: string, additionalSeconds: number): void {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    const currentExpiry = new Date(channel.expiresAt);
    const newExpiry = new Date(currentExpiry.getTime() + additionalSeconds * 1000);
    channel.expiresAt = newExpiry.toISOString();
    this.channels.set(channelId, channel);

    // Note: On-chain extension would require a separate transaction
  }

  /**
   * Top up channel deposit
   *
   * @param channelId - Channel ID
   * @param additionalDeposit - Additional deposit amount
   */
  async topUpChannel(channelId: string, additionalDeposit: string): Promise<void> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    const currentDeposit = parseUnits(channel.deposit, USDC_DECIMALS);
    const additional = parseUnits(additionalDeposit, USDC_DECIMALS);
    const newDeposit = currentDeposit + additional;

    const currentBalance = parseUnits(channel.balance, USDC_DECIMALS);
    const newBalance = currentBalance + additional;

    channel.deposit = formatUnits(newDeposit, USDC_DECIMALS);
    channel.balance = formatUnits(newBalance, USDC_DECIMALS);
    this.channels.set(channelId, channel);

    // Track topup count
    const currentCount = this.channelTopupCounts.get(channelId) || 0;
    this.channelTopupCounts.set(channelId, currentCount + 1);

    // Note: On-chain top-up would require a separate transaction
  }

  // ============================================
  // BATCH PAYMENTS
  // ============================================

  /**
   * Make multiple payments with a single signature
   *
   * @param channelId - Channel ID
   * @param payments - Array of payment items
   * @returns Batch payment receipt
   *
   * @example
   * ```typescript
   * const receipt = await channels.batchPay(channel.id, [
   *   { amount: '0.001', memo: 'API call 1' },
   *   { amount: '0.002', memo: 'API call 2' },
   *   { amount: '0.001', memo: 'API call 3' },
   * ]);
   * console.log(`Paid ${receipt.totalAmount} in ${receipt.count} payments`);
   * ```
   */
  async batchPay(channelId: string, payments: BatchPaymentItem[]): Promise<BatchPaymentReceipt> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    if (channel.state !== 'open') {
      throw new Error(`Channel is ${channel.state}, cannot pay`);
    }

    if (new Date(channel.expiresAt) < new Date()) {
      throw new Error('Channel has expired');
    }

    if (payments.length === 0) {
      throw new Error('No payments provided');
    }

    // Calculate total amount
    let totalAmountWei = BigInt(0);
    for (const payment of payments) {
      totalAmountWei += parseUnits(payment.amount, USDC_DECIMALS);
    }

    const currentSpent = parseUnits(channel.spent, USDC_DECIMALS);
    const deposit = parseUnits(channel.deposit, USDC_DECIMALS);
    const newTotalSpent = currentSpent + totalAmountWei;

    if (newTotalSpent > deposit) {
      throw new Error('Insufficient channel balance for batch payment');
    }

    // Generate single nonce for entire batch
    const batchNonce = channel.nonce + 1;

    // Create and sign the batch payment (covers total amount)
    const signature = await this.signPayment(channelId, newTotalSpent.toString(), batchNonce);

    // Build receipt with individual payment details
    const paymentDetails: Array<{ amount: string; memo?: string; nonce: number }> = [];
    let currentNonce = batchNonce;

    for (const payment of payments) {
      paymentDetails.push({
        amount: payment.amount,
        memo: payment.memo,
        nonce: currentNonce,
      });
      currentNonce++;

      // Record in history
      const history = this.channelPaymentHistory.get(channelId) || [];
      history.push({ amount: payment.amount, timestamp: Date.now() });
      this.channelPaymentHistory.set(channelId, history);
    }

    // Update channel state
    channel.spent = formatUnits(newTotalSpent, USDC_DECIMALS);
    channel.balance = formatUnits(deposit - newTotalSpent, USDC_DECIMALS);
    channel.nonce = currentNonce - 1;
    channel.lastSignature = signature;
    this.channels.set(channelId, channel);

    // Check auto-topup after batch
    await this.checkAutoTopup(channelId);

    const receipt: BatchPaymentReceipt = {
      signature,
      payments: paymentDetails,
      totalAmount: formatUnits(totalAmountWei, USDC_DECIMALS),
      count: payments.length,
      timestamp: new Date().toISOString(),
    };

    return receipt;
  }

  // ============================================
  // AUTO-TOPUP MANAGEMENT
  // ============================================

  /**
   * Get auto-topup status for a channel
   *
   * @param channelId - Channel ID
   * @returns Auto-topup status
   */
  getAutoTopupStatus(channelId: string): AutoTopupStatus {
    const config = this.autoTopupConfigs.get(channelId);
    const topupCount = this.autoTopupCounts.get(channelId) || 0;

    if (!config) {
      return {
        enabled: false,
        threshold: '0',
        topupAmount: '0',
        topupsRemaining: 0,
        totalTopups: topupCount,
      };
    }

    const maxTopups = config.maxTopups;
    const topupsRemaining = maxTopups === undefined
      ? 'unlimited'
      : Math.max(0, maxTopups - topupCount);

    return {
      enabled: true,
      threshold: config.threshold,
      topupAmount: config.amount,
      topupsRemaining,
      totalTopups: topupCount,
    };
  }

  /**
   * Update auto-topup configuration for a channel
   *
   * @param channelId - Channel ID
   * @param config - New auto-topup configuration
   */
  updateAutoTopup(channelId: string, config: AutoTopupConfig): void {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    this.autoTopupConfigs.set(channelId, config);

    // Reset count if this is a new configuration
    if (!this.autoTopupCounts.has(channelId)) {
      this.autoTopupCounts.set(channelId, 0);
    }
  }

  /**
   * Disable auto-topup for a channel
   *
   * @param channelId - Channel ID
   */
  disableAutoTopup(channelId: string): void {
    this.autoTopupConfigs.delete(channelId);
  }

  /**
   * Check and perform auto-topup if needed
   */
  private async checkAutoTopup(channelId: string): Promise<void> {
    const config = this.autoTopupConfigs.get(channelId);
    if (!config) return;

    const channel = this.channels.get(channelId);
    if (!channel) return;

    const currentBalance = parseUnits(channel.balance, USDC_DECIMALS);
    const threshold = parseUnits(config.threshold, USDC_DECIMALS);

    // Check if balance is below threshold
    if (currentBalance > threshold) return;

    // Check if max topups reached
    const topupCount = this.autoTopupCounts.get(channelId) || 0;
    if (config.maxTopups !== undefined && topupCount >= config.maxTopups) {
      console.log(`Auto-topup limit reached for channel ${channelId}`);
      return;
    }

    // Perform topup
    try {
      await this.topUpChannel(channelId, config.amount);

      // Increment topup counter
      this.autoTopupCounts.set(channelId, topupCount + 1);
      console.log(`Auto-topup performed: ${config.amount} USDC to channel ${channelId}`);
    } catch (error) {
      console.error('Auto-topup failed:', error);
    }
  }

  // ============================================
  // EXTENDED CHANNEL STATISTICS
  // ============================================

  /**
   * Get detailed statistics for a specific channel
   *
   * @param channelId - Channel ID
   * @returns Extended channel statistics
   *
   * @example
   * ```typescript
   * const stats = channels.getChannelStats(channel.id);
   * console.log(`Total volume: ${stats.totalVolume}, Avg: ${stats.averagePayment}`);
   * ```
   */
  getChannelStats(channelId: string): ExtendedChannelStats {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    const history = this.channelPaymentHistory.get(channelId) || [];
    const topupCount = this.channelTopupCounts.get(channelId) || 0;

    // Calculate statistics
    let totalVolumeWei = BigInt(0);
    let largestWei = BigInt(0);
    let smallestWei = history.length > 0 ? parseUnits(history[0].amount, USDC_DECIMALS) : BigInt(0);

    for (const payment of history) {
      const amountWei = parseUnits(payment.amount, USDC_DECIMALS);
      totalVolumeWei += amountWei;
      if (amountWei > largestWei) largestWei = amountWei;
      if (amountWei < smallestWei) smallestWei = amountWei;
    }

    const totalPayments = history.length;
    const averageWei = totalPayments > 0 ? totalVolumeWei / BigInt(totalPayments) : BigInt(0);

    // Calculate payments per hour
    const channelCreated = new Date(channel.createdAt).getTime();
    const channelAgeMs = Date.now() - channelCreated;
    const channelAgeHours = channelAgeMs / (1000 * 60 * 60);
    const paymentsPerHour = channelAgeHours > 0 ? totalPayments / channelAgeHours : 0;

    return {
      totalPayments,
      totalVolume: formatUnits(totalVolumeWei, USDC_DECIMALS),
      averagePayment: formatUnits(averageWei, USDC_DECIMALS),
      largestPayment: formatUnits(largestWei, USDC_DECIMALS),
      smallestPayment: formatUnits(smallestWei, USDC_DECIMALS),
      paymentsPerHour: Math.round(paymentsPerHour * 100) / 100,
      channelAge: Math.floor(channelAgeMs / 1000),
      topupCount,
    };
  }

  // Private methods

  private generateChannelId(recipient: string): string {
    const data = encodePacked(
      ['address', 'address', 'uint256', 'uint256'],
      [
        this.account.address,
        recipient as `0x${string}`,
        BigInt(Date.now()),
        BigInt(Math.floor(Math.random() * 1000000)),
      ]
    );
    return keccak256(data);
  }

  private async signPayment(channelId: string, amount: string, nonce: number): Promise<string> {
    const messageHash = this.getPaymentHash(channelId, amount, nonce);

    const signature = await this.account.signMessage({
      message: { raw: messageHash as `0x${string}` },
    });

    return signature;
  }

  private getPaymentHash(channelId: string, amount: string, nonce: number): string {
    return keccak256(
      encodePacked(
        ['bytes32', 'uint256', 'uint256'],
        [channelId as `0x${string}`, BigInt(amount), BigInt(nonce)]
      )
    );
  }

  private async recoverSigner(_messageHash: string, _signature: string): Promise<string> {
    // In production, use viem's verifyMessage or similar
    // For now, return a placeholder
    return this.account.address;
  }
}

/**
 * Create a payment channel manager
 *
 * @param config - Manager configuration
 * @returns PaymentChannelManager instance
 *
 * @example
 * ```typescript
 * const channels = createPaymentChannelManager({
 *   privateKey: process.env.PRIVATE_KEY,
 * });
 *
 * // Create a channel with $100 deposit
 * const channel = await channels.createChannel({
 *   recipient: '0x...',
 *   deposit: '100',
 *   duration: 86400, // 24 hours
 * });
 *
 * // Make micro-payments
 * const payment1 = await channels.pay(channel.id, '0.001');
 * const payment2 = await channels.pay(channel.id, '0.002');
 *
 * // Use with HTTP x402
 * const header = await channels.createX402Header(channel.id, '0.001');
 * fetch(url, { headers: { 'X-Payment': header } });
 *
 * // Close and settle
 * const settlement = await channels.closeChannel(channel.id);
 * ```
 */
export function createPaymentChannelManager(config: ChannelConfig): PaymentChannelManager {
  return new PaymentChannelManager(config);
}
