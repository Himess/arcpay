/**
 * ArcPay AI Agent SDK
 *
 * Purpose-built SDK for AI agents and autonomous systems to handle
 * payments, escrows, and financial transactions without human intervention.
 *
 * Designed for:
 * - LLM-powered agents (GPT, Claude, etc.)
 * - Autonomous trading bots
 * - AI service marketplaces
 * - Machine-to-machine payments
 *
 * @example
 * ```typescript
 * import { createAgent } from 'arcpay/agent';
 *
 * const agent = createAgent({
 *   privateKey: process.env.AGENT_PRIVATE_KEY,
 *   budget: { daily: '100', perTransaction: '10' }
 * });
 *
 * // AI agent pays for API calls automatically
 * await agent.payForService('openai-api', '0.05');
 *
 * // AI agent hires a freelancer with escrow protection
 * const task = await agent.createTask({
 *   description: 'Write a blog post about AI',
 *   payment: '50',
 *   freelancer: '0x...',
 *   deadline: '24h'
 * });
 *
 * // AI agent reviews and releases payment
 * await agent.approveTask(task.id);
 * ```
 */

import { ArcPayClient } from '../core/client';
import { createEscrowManager, type EscrowManager } from '../modules/escrow';
import { createPaymentChannelManager, type PaymentChannelManager } from '../modules/channels';
import { createStreamManager, type StreamManager } from '../modules/streams';
import { createPrivacyModule, type PrivacyModule } from '../modules/privacy';
import { parseUnits, formatUnits } from 'viem';

// On-chain registry exports
export {
  OnchainAgentManager,
  createOnchainAgentManager,
  type OnchainAgentConfig,
  type RegisterAgentParams,
  type ExecutePaymentParams,
  type OnchainAgentInfo,
  type OnchainTxResult,
} from './onchain-registry';

/**
 * Budget limits for autonomous spending
 */
export interface BudgetConfig {
  /** Maximum daily spending limit */
  daily?: string;
  /** Maximum per-transaction limit */
  perTransaction?: string;
  /** Maximum hourly spending */
  hourly?: string;
  /** Require approval above this amount */
  approvalThreshold?: string;
}

/**
 * Active hours configuration for time-based restrictions
 */
export interface ActiveHoursConfig {
  /** Start time in HH:MM format (e.g., '09:00') */
  start: string;
  /** End time in HH:MM format (e.g., '18:00') */
  end: string;
  /** Timezone (e.g., 'UTC', 'Europe/Istanbul') */
  timezone: string;
  /** Allow payments on weekends (default: true) */
  allowWeekends?: boolean;
}

/**
 * Pending payment requiring human approval
 */
export interface PendingPayment {
  id: string;
  recipient: string;
  amount: string;
  category?: string;
  reason: string;
  requestedAt: string;
}

/**
 * Agent configuration
 */
export interface AgentConfig {
  /** Wallet private key */
  privateKey: string;
  /** Budget limits */
  budget?: BudgetConfig;
  /** Agent name (for logging) */
  name?: string;
  /** Enable verbose logging */
  verbose?: boolean;
  /** Webhook URL for notifications */
  webhookUrl?: string;
  /** Auto-approve payments under threshold */
  autoApprove?: boolean;

  // Security: Whitelist/Blacklist
  /** Only allow payments to these addresses */
  allowedRecipients?: string[];
  /** Block payments to these addresses */
  blockedRecipients?: string[];

  // Category-based budgets
  /** Budget limits per category (e.g., { 'api-calls': '200', 'freelance': '500' }) */
  categoryBudgets?: Record<string, string>;

  // Human approval thresholds
  /** Auto-approve payments below this amount */
  autoApproveBelow?: string;
  /** Require human approval above this amount */
  requireHumanAbove?: string;
  /** Callback for human approval */
  onHumanApprovalRequired?: (payment: PendingPayment) => Promise<boolean>;

  // Time-based restrictions
  /** Active hours for payments */
  activeHours?: ActiveHoursConfig;

  // On-chain registry options
  /** Use on-chain AgentRegistry for trustless budget management */
  useOnchainBudget?: boolean;
  /** Custom AgentRegistry address (overrides default) */
  registryAddress?: string;
}

/**
 * Task configuration for escrow-based work
 */
export interface TaskConfig {
  /** Task description */
  description: string;
  /** Payment amount in USDC */
  payment: string;
  /** Freelancer/worker address */
  worker: string;
  /** Deadline (e.g., '24h', '7d', '2024-12-31') */
  deadline?: string;
  /** Milestones for partial payments */
  milestones?: Array<{
    description: string;
    amount: string;
  }>;
  /** Arbiter address for disputes */
  arbiter?: string;
}

/**
 * Service payment record
 */
export interface ServicePayment {
  id: string;
  service: string;
  amount: string;
  timestamp: string;
  txHash?: string;
}

/**
 * Task record
 */
export interface Task {
  id: string;
  description: string;
  payment: string;
  worker: string;
  status: 'pending' | 'in_progress' | 'review' | 'completed' | 'disputed';
  escrowId: string;
  createdAt: string;
  completedAt?: string;
}

/**
 * Stream configuration
 */
export interface StreamConfig {
  /** Recipient address */
  recipient: string;
  /** Total amount or rate (e.g., '1000', '1000/month') */
  amount: string;
  /** Duration or 'continuous' */
  duration?: string;
  /** Start immediately or scheduled */
  startAt?: string;
}

/**
 * Spending report
 */
export interface SpendingReport {
  period: string;
  totalSpent: string;
  transactionCount: number;
  byCategory: Record<string, string>;
  byRecipient: Record<string, string>;
  remainingBudget: {
    daily: string;
    hourly: string;
  };
}

// ============================================
// AGENT-TO-AGENT TYPES
// ============================================

/**
 * Agent info for A2A payments
 */
export interface AgentInfo {
  /** Agent's wallet address */
  address: string;
  /** Agent's name/identifier */
  name?: string;
  /** Agent's capabilities */
  capabilities?: string[];
  /** Agent's hourly rate */
  hourlyRate?: string;
}

/**
 * Agent hire configuration
 */
export interface HireAgentConfig {
  /** Target agent's address */
  agentAddress: string;
  /** Task description */
  task: string;
  /** Payment amount */
  payment: string;
  /** Deadline (e.g., '24h', '7d') */
  deadline?: string;
  /** Required capabilities */
  requiredCapabilities?: string[];
  /** Arbiter for disputes */
  arbiter?: string;
  /** Callback URL for status updates */
  callbackUrl?: string;
}

/**
 * Agent work record
 */
export interface AgentWork {
  id: string;
  /** Hiring agent address */
  employer: string;
  /** Working agent address */
  worker: string;
  /** Task description */
  task: string;
  /** Payment amount */
  payment: string;
  /** Escrow ID */
  escrowId: string;
  /** Stream ID (if streaming) */
  streamId?: string;
  /** Work status */
  status: 'pending' | 'accepted' | 'in_progress' | 'submitted' | 'approved' | 'disputed' | 'completed';
  /** Submission/result from worker */
  result?: string;
  /** Created timestamp */
  createdAt: string;
  /** Deadline */
  deadline?: string;
}

/**
 * Agent stream configuration
 */
export interface AgentStreamConfig {
  /** Target agent address */
  agentAddress: string;
  /** Rate per period (e.g., '100/hour', '1000/day') */
  rate: string;
  /** Duration or 'continuous' */
  duration?: string;
  /** Task/purpose description */
  purpose?: string;
}

/**
 * AI Agent for autonomous commerce
 *
 * Provides a high-level API for AI agents to handle payments,
 * escrows, and financial transactions autonomously.
 */
export class ArcPayAgent {
  private client: ArcPayClient;
  private escrow: EscrowManager;
  private channels: PaymentChannelManager;
  private streams: StreamManager;
  private privacy: PrivacyModule;
  private config: AgentConfig;

  private spending: {
    daily: bigint;
    hourly: bigint;
    lastDailyReset: number;
    lastHourlyReset: number;
  };

  private servicePayments: ServicePayment[] = [];
  private tasks: Map<string, Task> = new Map();
  private openChannels: Map<string, string> = new Map(); // service -> channelId
  private agentWorks: Map<string, AgentWork> = new Map(); // Agent-to-Agent work records

  // Security: Whitelist/Blacklist
  private whitelist: Set<string> = new Set();
  private blacklist: Set<string> = new Set();

  // Category budgets tracking
  private categorySpending: Map<string, bigint> = new Map();
  private categoryLastReset: Map<string, number> = new Map();

  constructor(config: AgentConfig) {
    this.config = {
      autoApprove: true,
      verbose: false,
      ...config,
    };

    // Initialize all modules
    this.client = new ArcPayClient({
      network: 'arc-testnet',
      privateKey: config.privateKey,
    });

    this.escrow = createEscrowManager({ privateKey: config.privateKey });
    this.channels = createPaymentChannelManager({ privateKey: config.privateKey });
    this.streams = createStreamManager({ privateKey: config.privateKey });
    this.privacy = createPrivacyModule({ privateKey: config.privateKey });

    // Initialize spending trackers
    const now = Date.now();
    this.spending = {
      daily: 0n,
      hourly: 0n,
      lastDailyReset: now,
      lastHourlyReset: now,
    };

    // Initialize whitelist/blacklist from config
    if (config.allowedRecipients) {
      for (const addr of config.allowedRecipients) {
        this.whitelist.add(addr.toLowerCase());
      }
    }
    if (config.blockedRecipients) {
      for (const addr of config.blockedRecipients) {
        this.blacklist.add(addr.toLowerCase());
      }
    }

    this.log(`Agent "${config.name || 'unnamed'}" initialized`);
  }

  // ============================================
  // SIMPLE PAYMENTS
  // ============================================

  /**
   * Pay for a service (API call, compute, etc.)
   *
   * Ideal for:
   * - API usage fees
   * - Compute costs
   * - Data purchases
   * - Micro-transactions
   *
   * @example
   * ```typescript
   * // Pay for an API call
   * await agent.payForService('openai', '0.05');
   *
   * // Pay with metadata
   * await agent.payForService('anthropic', '0.10', {
   *   model: 'claude-3',
   *   tokens: 1500
   * });
   * ```
   */
  async payForService(
    service: string,
    amount: string,
    metadata?: { category?: string; [key: string]: unknown }
  ): Promise<ServicePayment> {
    const category = metadata?.category;

    // Check budget with full validation (recipient + category)
    await this.checkBudget(amount, service, category);

    // Get or create payment channel for this service
    const channelId = this.openChannels.get(service);

    let txHash: string | undefined;

    if (channelId) {
      // Use existing channel for micro-payment
      const receipt = await this.channels.pay(channelId, amount);
      txHash = receipt.signature;
    } else {
      // Direct transfer for one-time payment
      const result = await this.client.transfer({
        to: service, // Service address
        amount,
      });
      txHash = result.txHash;
    }

    // Record spending
    this.recordSpending(amount);

    // Record category spending if category specified
    if (category) {
      this.recordCategorySpending(category, amount);
    }

    const payment: ServicePayment = {
      id: `svc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      service,
      amount,
      timestamp: new Date().toISOString(),
      txHash,
    };

    this.servicePayments.push(payment);
    this.log(`Paid ${amount} USDC for service: ${service}${category ? ` (category: ${category})` : ''}`);

    return payment;
  }

  /**
   * Quick payment to any address
   *
   * @example
   * ```typescript
   * await agent.pay('0x...', '10');
   * await agent.pay('0x...', '5', { note: 'Refund' });
   * ```
   */
  async pay(
    to: string,
    amount: string,
    options?: { note?: string; private?: boolean; category?: string }
  ): Promise<{ txHash: string }> {
    // Check budget with full validation (recipient + category)
    await this.checkBudget(amount, to, options?.category);

    let txHash: string;

    if (options?.private) {
      // Use stealth address for privacy
      const result = await this.privacy.sendPrivate({ to, amount });
      txHash = result.txHash || '';
    } else {
      const result = await this.client.transfer({ to, amount });
      txHash = result.txHash;
    }

    this.recordSpending(amount);

    // Record category spending if specified
    if (options?.category) {
      this.recordCategorySpending(options.category, amount);
    }

    this.log(`Paid ${amount} USDC to ${to.slice(0, 10)}...`);

    return { txHash };
  }

  // ============================================
  // TASK & ESCROW MANAGEMENT
  // ============================================

  /**
   * Create a task with escrow protection
   *
   * Perfect for:
   * - Hiring freelancers
   * - Commissioning work
   * - Bounties
   * - Gig economy tasks
   *
   * @example
   * ```typescript
   * const task = await agent.createTask({
   *   description: 'Write a blog post about AI agents',
   *   payment: '50',
   *   worker: '0x...',
   *   deadline: '48h'
   * });
   *
   * // Later, when work is done
   * await agent.approveTask(task.id);
   * ```
   */
  async createTask(config: TaskConfig): Promise<Task> {
    // Check budget with full validation (recipient = worker)
    await this.checkBudget(config.payment, config.worker);

    // Calculate expiry
    const expiresAt = this.parseDeadline(config.deadline || '7d');

    // Create escrow
    const escrow = await this.escrow.createEscrow({
      depositor: await this.getAddress(),
      beneficiary: config.worker,
      amount: config.payment,
      conditions: [
        {
          type: 'approval',
          params: { approver: await this.getAddress() },
          isMet: false,
        },
      ],
      arbitrators: config.arbiter ? [config.arbiter] : [],
      expiresAt: expiresAt.toISOString(),
      description: config.description,
    });

    // Fund the escrow
    await this.escrow.fundEscrow(escrow.id);

    this.recordSpending(config.payment);

    const task: Task = {
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      description: config.description,
      payment: config.payment,
      worker: config.worker,
      status: 'pending',
      escrowId: escrow.id,
      createdAt: new Date().toISOString(),
    };

    this.tasks.set(task.id, task);
    this.log(`Created task: ${config.description} (${config.payment} USDC)`);

    return task;
  }

  /**
   * Approve a task and release payment
   *
   * @example
   * ```typescript
   * await agent.approveTask('task_123');
   * ```
   */
  async approveTask(taskId: string): Promise<{ txHash: string }> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);

    const result = await this.escrow.releaseEscrow(task.escrowId);

    task.status = 'completed';
    task.completedAt = new Date().toISOString();
    this.tasks.set(taskId, task);

    this.log(`Approved task: ${taskId}`);
    return { txHash: result.txHash || '' };
  }

  /**
   * Reject a task and get refund
   *
   * @example
   * ```typescript
   * await agent.rejectTask('task_123', 'Work quality insufficient');
   * ```
   */
  async rejectTask(taskId: string, reason: string): Promise<{ txHash: string }> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);

    // Create dispute
    await this.escrow.createDispute(task.escrowId, reason);

    task.status = 'disputed';
    this.tasks.set(taskId, task);

    this.log(`Rejected task: ${taskId} - ${reason}`);
    return { txHash: '' };
  }

  /**
   * Get task status
   */
  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * List all tasks
   */
  listTasks(filter?: { status?: Task['status'] }): Task[] {
    const tasks = Array.from(this.tasks.values());
    if (filter?.status) {
      return tasks.filter((t) => t.status === filter.status);
    }
    return tasks;
  }

  // ============================================
  // STREAMING PAYMENTS
  // ============================================

  /**
   * Start streaming payments (salaries, subscriptions)
   *
   * @example
   * ```typescript
   * // Stream $1000 over 30 days
   * await agent.startStream({
   *   recipient: '0x...',
   *   amount: '1000',
   *   duration: '30d'
   * });
   *
   * // Continuous stream at $100/day
   * await agent.startStream({
   *   recipient: '0x...',
   *   amount: '100/day',
   *   duration: 'continuous'
   * });
   * ```
   */
  async startStream(config: StreamConfig): Promise<{ streamId: string; txHash: string }> {
    // Parse amount and duration
    const { amount, duration } = this.parseStreamConfig(config);

    // Check budget with full validation (recipient)
    await this.checkBudget(amount, config.recipient);

    const stream = await this.streams.createStream({
      recipient: config.recipient,
      totalAmount: amount,
      duration,
    });

    this.recordSpending(amount);
    this.log(`Started stream: ${amount} USDC over ${duration}s to ${config.recipient.slice(0, 10)}...`);

    return {
      streamId: stream.id,
      txHash: stream.txHash || '',
    };
  }

  /**
   * Stop a stream
   */
  async stopStream(streamId: string): Promise<void> {
    await this.streams.cancelStream(streamId);
    this.log(`Stopped stream: ${streamId}`);
  }

  // ============================================
  // PAYMENT CHANNELS
  // ============================================

  /**
   * Open a payment channel for frequent micro-payments
   *
   * Ideal for:
   * - API providers
   * - Gaming
   * - IoT payments
   * - High-frequency trading
   *
   * @example
   * ```typescript
   * // Open channel with $10 deposit
   * await agent.openChannel('openai-service', '0x...', '10');
   *
   * // Make micro-payments (instant, no gas)
   * await agent.channelPay('openai-service', '0.001');
   * await agent.channelPay('openai-service', '0.002');
   * ```
   */
  async openChannel(
    serviceName: string,
    recipient: string,
    deposit: string
  ): Promise<{ channelId: string }> {
    // Check budget with full validation (recipient)
    await this.checkBudget(deposit, recipient);

    const channel = await this.channels.createChannel({
      recipient,
      deposit,
    });

    this.openChannels.set(serviceName, channel.id);
    this.recordSpending(deposit);

    this.log(`Opened channel for ${serviceName}: ${deposit} USDC`);
    return { channelId: channel.id };
  }

  /**
   * Pay through an open channel (instant, no gas)
   */
  async channelPay(serviceName: string, amount: string): Promise<{ receipt: string }> {
    const channelId = this.openChannels.get(serviceName);
    if (!channelId) {
      throw new Error(`No open channel for service: ${serviceName}`);
    }

    const receipt = await this.channels.pay(channelId, amount);
    this.log(`Channel payment: ${amount} USDC to ${serviceName}`);

    return { receipt: receipt.signature };
  }

  /**
   * Close a payment channel
   */
  async closeChannel(serviceName: string): Promise<{ txHash: string }> {
    const channelId = this.openChannels.get(serviceName);
    if (!channelId) {
      throw new Error(`No open channel for service: ${serviceName}`);
    }

    const result = await this.channels.closeChannel(channelId);
    this.openChannels.delete(serviceName);

    this.log(`Closed channel for ${serviceName}`);
    return { txHash: result.txHash };
  }

  // ============================================
  // PRIVACY
  // ============================================

  /**
   * Get stealth address for receiving private payments
   */
  getStealthAddress(): string {
    return this.privacy.getStealthMetaAddress();
  }

  /**
   * Send a private payment (stealth address)
   */
  async payPrivate(to: string, amount: string, options?: { category?: string }): Promise<{ txHash: string }> {
    // Check budget with full validation (recipient)
    await this.checkBudget(amount, to, options?.category);

    const result = await this.privacy.sendPrivate({ to, amount });
    this.recordSpending(amount);

    // Record category spending if specified
    if (options?.category) {
      this.recordCategorySpending(options.category, amount);
    }

    this.log(`Private payment: ${amount} USDC`);
    return { txHash: result.txHash || '' };
  }

  /**
   * Scan for incoming private payments
   */
  async scanPrivatePayments(): Promise<
    Array<{
      amount: string;
      timestamp: number;
      claimed: boolean;
    }>
  > {
    const result = await this.privacy.scanAnnouncements();
    return result.payments.map((p) => ({
      amount: p.amount,
      timestamp: p.timestamp,
      claimed: p.claimed,
    }));
  }

  // ============================================
  // AGENT-TO-AGENT PAYMENTS
  // ============================================

  /**
   * Hire another agent to perform a task (escrow protected)
   *
   * Ideal for:
   * - AI agent collaboration
   * - Task delegation between agents
   * - Multi-agent systems
   * - Agent marketplaces
   *
   * @example
   * ```typescript
   * // Hire an agent for a task
   * const work = await agent.hireAgent({
   *   agentAddress: '0x...worker-agent',
   *   task: 'Analyze market data and generate report',
   *   payment: '50',
   *   deadline: '24h'
   * });
   *
   * // Later, approve the work
   * await agent.approveAgentWork(work.id);
   * ```
   */
  async hireAgent(config: HireAgentConfig): Promise<AgentWork> {
    // Check budget with full validation (recipient = agentAddress)
    await this.checkBudget(config.payment, config.agentAddress);

    const employer = await this.getAddress();
    const expiresAt = this.parseDeadline(config.deadline || '7d');

    // Create escrow for the work
    const escrow = await this.escrow.createEscrow({
      depositor: employer,
      beneficiary: config.agentAddress,
      amount: config.payment,
      conditions: [
        {
          type: 'approval',
          params: { approver: employer },
          isMet: false,
        },
      ],
      arbitrators: config.arbiter ? [config.arbiter] : [],
      expiresAt: expiresAt.toISOString(),
      description: `Agent Work: ${config.task}`,
    });

    // Fund the escrow
    await this.escrow.fundEscrow(escrow.id);
    this.recordSpending(config.payment);

    const work: AgentWork = {
      id: `work_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      employer,
      worker: config.agentAddress,
      task: config.task,
      payment: config.payment,
      escrowId: escrow.id,
      status: 'pending',
      createdAt: new Date().toISOString(),
      deadline: expiresAt.toISOString(),
    };

    this.agentWorks.set(work.id, work);
    this.log(`Hired agent ${config.agentAddress.slice(0, 10)}... for: ${config.task} (${config.payment} USDC)`);

    // Send callback if configured
    if (config.callbackUrl) {
      this.sendCallback(config.callbackUrl, { type: 'work_created', work }).catch(() => {});
    }

    return work;
  }

  /**
   * Start streaming payments to another agent
   *
   * Ideal for:
   * - Continuous agent services
   * - Agent subscriptions
   * - Pay-as-you-go agent resources
   *
   * @example
   * ```typescript
   * // Stream $100/day to a monitoring agent
   * const work = await agent.streamToAgent({
   *   agentAddress: '0x...monitoring-agent',
   *   rate: '100/day',
   *   duration: '30d',
   *   purpose: 'System monitoring'
   * });
   * ```
   */
  async streamToAgent(config: AgentStreamConfig): Promise<AgentWork> {
    const { amount, duration } = this.parseStreamConfig({
      recipient: config.agentAddress,
      amount: config.rate,
      duration: config.duration,
    });

    // Check budget with full validation (recipient = agentAddress)
    await this.checkBudget(amount, config.agentAddress);

    const employer = await this.getAddress();

    // Create stream
    const stream = await this.streams.createStream({
      recipient: config.agentAddress,
      totalAmount: amount,
      duration,
    });

    this.recordSpending(amount);

    const work: AgentWork = {
      id: `work_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      employer,
      worker: config.agentAddress,
      task: config.purpose || 'Streaming payment',
      payment: amount,
      escrowId: '',
      streamId: stream.id,
      status: 'in_progress',
      createdAt: new Date().toISOString(),
    };

    this.agentWorks.set(work.id, work);
    this.log(`Streaming ${amount} USDC to agent ${config.agentAddress.slice(0, 10)}... (${config.rate})`);

    return work;
  }

  /**
   * Approve agent work and release payment
   *
   * @example
   * ```typescript
   * // Approve completed work
   * await agent.approveAgentWork('work_123');
   *
   * // Approve with result verification
   * await agent.approveAgentWork('work_123', 'Result meets requirements');
   * ```
   */
  async approveAgentWork(workId: string, notes?: string): Promise<{ txHash: string; success: boolean }> {
    const work = this.agentWorks.get(workId);
    if (!work) {
      throw new Error(`Agent work not found: ${workId}`);
    }

    if (work.status === 'completed' || work.status === 'approved') {
      return { txHash: '', success: true };
    }

    // If it's a stream, just mark as completed
    if (work.streamId) {
      work.status = 'completed';
      work.result = notes;
      this.agentWorks.set(workId, work);
      this.log(`Approved agent stream work: ${workId}`);
      return { txHash: '', success: true };
    }

    // Release escrow
    const result = await this.escrow.releaseEscrow(work.escrowId);

    work.status = 'completed';
    work.result = notes;
    this.agentWorks.set(workId, work);

    this.log(`Approved agent work: ${workId}`);
    return { txHash: result.txHash || '', success: result.success };
  }

  /**
   * Reject agent work and initiate dispute
   *
   * @example
   * ```typescript
   * await agent.rejectAgentWork('work_123', 'Output quality insufficient');
   * ```
   */
  async rejectAgentWork(workId: string, reason: string): Promise<{ success: boolean }> {
    const work = this.agentWorks.get(workId);
    if (!work) {
      throw new Error(`Agent work not found: ${workId}`);
    }

    // If it's a stream, cancel it
    if (work.streamId) {
      await this.streams.cancelStream(work.streamId);
      work.status = 'disputed';
      this.agentWorks.set(workId, work);
      this.log(`Cancelled agent stream: ${workId} - ${reason}`);
      return { success: true };
    }

    // Create dispute on escrow
    await this.escrow.createDispute(work.escrowId, reason);

    work.status = 'disputed';
    this.agentWorks.set(workId, work);

    this.log(`Rejected agent work: ${workId} - ${reason}`);
    return { success: true };
  }

  /**
   * Get agent work by ID
   */
  getAgentWork(workId: string): AgentWork | undefined {
    return this.agentWorks.get(workId);
  }

  /**
   * List all agent work records
   */
  listAgentWorks(filter?: { status?: AgentWork['status']; worker?: string }): AgentWork[] {
    let works = Array.from(this.agentWorks.values());

    if (filter?.status) {
      works = works.filter((w) => w.status === filter.status);
    }
    if (filter?.worker) {
      works = works.filter((w) => w.worker.toLowerCase() === filter.worker!.toLowerCase());
    }

    return works;
  }

  /**
   * Accept work as a worker agent
   *
   * @example
   * ```typescript
   * // As a worker agent, accept incoming work
   * await workerAgent.acceptWork('work_123');
   * ```
   */
  async acceptWork(workId: string): Promise<{ success: boolean }> {
    const work = this.agentWorks.get(workId);
    if (!work) {
      throw new Error(`Agent work not found: ${workId}`);
    }

    if (work.status !== 'pending') {
      throw new Error(`Work is not pending: ${work.status}`);
    }

    work.status = 'accepted';
    this.agentWorks.set(workId, work);

    this.log(`Accepted work: ${workId}`);
    return { success: true };
  }

  /**
   * Submit completed work
   *
   * @example
   * ```typescript
   * // Worker agent submits completed work
   * await workerAgent.submitWork('work_123', 'Task completed. Results: ...');
   * ```
   */
  async submitWork(workId: string, result: string): Promise<{ success: boolean }> {
    const work = this.agentWorks.get(workId);
    if (!work) {
      throw new Error(`Agent work not found: ${workId}`);
    }

    work.status = 'submitted';
    work.result = result;
    this.agentWorks.set(workId, work);

    this.log(`Submitted work: ${workId}`);
    return { success: true };
  }

  /**
   * Send webhook callback
   */
  private async sendCallback(url: string, data: unknown): Promise<void> {
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch {
      // Ignore callback errors
    }
  }

  // ============================================
  // BUDGET & REPORTING
  // ============================================

  /**
   * Get spending report
   */
  getSpendingReport(): SpendingReport {
    const dailyLimit = this.config.budget?.daily || '1000000';
    const hourlyLimit = this.config.budget?.hourly || '100000';

    const byCategory: Record<string, string> = {};
    const byRecipient: Record<string, string> = {};

    // Aggregate service payments
    for (const payment of this.servicePayments) {
      byCategory[payment.service] = (
        parseFloat(byCategory[payment.service] || '0') + parseFloat(payment.amount)
      ).toString();
    }

    // Aggregate task payments
    for (const task of this.tasks.values()) {
      if (task.status === 'completed') {
        byRecipient[task.worker] = (
          parseFloat(byRecipient[task.worker] || '0') + parseFloat(task.payment)
        ).toString();
      }
    }

    return {
      period: 'current',
      totalSpent: formatUnits(this.spending.daily, 18),
      transactionCount: this.servicePayments.length + this.tasks.size,
      byCategory,
      byRecipient,
      remainingBudget: {
        daily: (parseFloat(dailyLimit) - parseFloat(formatUnits(this.spending.daily, 18))).toString(),
        hourly: (parseFloat(hourlyLimit) - parseFloat(formatUnits(this.spending.hourly, 18))).toString(),
      },
    };
  }

  /**
   * Get current balance
   */
  async getBalance(): Promise<string> {
    const balance = await this.client.getBalance();
    return balance.usdc;
  }

  /**
   * Get agent wallet address
   */
  async getAddress(): Promise<string> {
    const balance = await this.client.getBalance();
    return balance.address;
  }

  // ============================================
  // WHITELIST/BLACKLIST MANAGEMENT
  // ============================================

  /**
   * Add address to whitelist
   */
  addToWhitelist(address: string): void {
    this.whitelist.add(address.toLowerCase());
    this.log(`Added ${address} to whitelist`);
  }

  /**
   * Remove address from whitelist
   */
  removeFromWhitelist(address: string): void {
    this.whitelist.delete(address.toLowerCase());
    this.log(`Removed ${address} from whitelist`);
  }

  /**
   * Check if address is whitelisted
   */
  isWhitelisted(address: string): boolean {
    // If no whitelist configured, all addresses are allowed
    if (this.whitelist.size === 0 && !this.config.allowedRecipients?.length) {
      return true;
    }
    return this.whitelist.has(address.toLowerCase());
  }

  /**
   * Add address to blacklist
   */
  addToBlacklist(address: string): void {
    this.blacklist.add(address.toLowerCase());
    this.log(`Added ${address} to blacklist`);
  }

  /**
   * Remove address from blacklist
   */
  removeFromBlacklist(address: string): void {
    this.blacklist.delete(address.toLowerCase());
    this.log(`Removed ${address} from blacklist`);
  }

  /**
   * Check if address is blacklisted
   */
  isBlacklisted(address: string): boolean {
    return this.blacklist.has(address.toLowerCase());
  }

  // ============================================
  // CATEGORY BUDGET MANAGEMENT
  // ============================================

  /**
   * Set budget limit for a category
   */
  setCategoryBudget(category: string, amount: string): void {
    if (!this.config.categoryBudgets) {
      this.config.categoryBudgets = {};
    }
    this.config.categoryBudgets[category] = amount;
    this.log(`Set category '${category}' budget to ${amount} USDC`);
  }

  /**
   * Get budget limit for a category
   */
  getCategoryBudget(category: string): string {
    return this.config.categoryBudgets?.[category] || '0';
  }

  /**
   * Get current spending for a category
   */
  getCategorySpending(category: string): string {
    const spending = this.categorySpending.get(category) || 0n;
    return formatUnits(spending, 18);
  }

  /**
   * Get remaining budget for a category
   */
  getRemainingCategoryBudget(category: string): string {
    const limit = this.config.categoryBudgets?.[category];
    if (!limit) return 'unlimited';

    const limitWei = parseUnits(limit, 18);
    const spentWei = this.categorySpending.get(category) || 0n;
    const remaining = limitWei - spentWei;

    return remaining > 0n ? formatUnits(remaining, 18) : '0';
  }

  // ============================================
  // ACTIVE HOURS MANAGEMENT
  // ============================================

  /**
   * Check if current time is within active hours
   */
  isWithinActiveHours(): boolean {
    if (!this.config.activeHours) return true;

    const { start, end, timezone, allowWeekends = true } = this.config.activeHours;

    // Get current time in the specified timezone
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      weekday: 'short',
    };

    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(now);

    const hourPart = parts.find((p) => p.type === 'hour')?.value || '00';
    const minutePart = parts.find((p) => p.type === 'minute')?.value || '00';
    const weekday = parts.find((p) => p.type === 'weekday')?.value || '';

    const currentTime = `${hourPart}:${minutePart}`;

    // Check weekend
    if (!allowWeekends && (weekday === 'Sat' || weekday === 'Sun')) {
      return false;
    }

    // Compare times
    return currentTime >= start && currentTime <= end;
  }

  /**
   * Get next active window start and end times
   */
  getNextActiveWindow(): { start: Date; end: Date } {
    const now = new Date();

    if (!this.config.activeHours) {
      return { start: now, end: new Date(now.getTime() + 24 * 60 * 60 * 1000) };
    }

    const { start, end, allowWeekends = true } = this.config.activeHours;
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);

    // Find next active window
    let nextStart = new Date(now);
    nextStart.setHours(startHour, startMin, 0, 0);

    // If we're past today's window, move to tomorrow
    if (now.getHours() > endHour || (now.getHours() === endHour && now.getMinutes() >= endMin)) {
      nextStart.setDate(nextStart.getDate() + 1);
    }

    // Skip weekends if not allowed
    if (!allowWeekends) {
      while (nextStart.getDay() === 0 || nextStart.getDay() === 6) {
        nextStart.setDate(nextStart.getDate() + 1);
      }
    }

    const nextEnd = new Date(nextStart);
    nextEnd.setHours(endHour, endMin, 0, 0);

    return { start: nextStart, end: nextEnd };
  }

  // ============================================
  // PAYMENT VALIDATION
  // ============================================

  /**
   * Validate a payment against all security rules
   */
  private async validatePayment(
    recipient: string,
    amount: string,
    options?: { category?: string }
  ): Promise<void> {
    const amountWei = parseUnits(amount, 18);

    // 1. Blacklist check
    if (this.isBlacklisted(recipient)) {
      throw new Error(`Payment blocked: Recipient ${recipient} is blacklisted`);
    }

    // 2. Whitelist check (if whitelist is configured)
    if (this.whitelist.size > 0 || this.config.allowedRecipients?.length) {
      if (!this.isWhitelisted(recipient)) {
        throw new Error(`Payment blocked: Recipient ${recipient} is not in whitelist`);
      }
    }

    // 3. Active hours check
    if (!this.isWithinActiveHours()) {
      const nextWindow = this.getNextActiveWindow();
      throw new Error(
        `Payment blocked: Outside active hours. Next window: ${nextWindow.start.toISOString()}`
      );
    }

    // 4. Category budget check
    if (options?.category && this.config.categoryBudgets?.[options.category]) {
      const categoryLimit = parseUnits(this.config.categoryBudgets[options.category], 18);

      // Reset category spending daily
      const now = Date.now();
      const lastReset = this.categoryLastReset.get(options.category) || 0;
      if (now - lastReset > 24 * 60 * 60 * 1000) {
        this.categorySpending.set(options.category, 0n);
        this.categoryLastReset.set(options.category, now);
      }

      const currentSpent = this.categorySpending.get(options.category) || 0n;
      const newTotal = currentSpent + amountWei;
      if (newTotal > categoryLimit) {
        throw new Error(
          `Payment blocked: Category '${options.category}' budget exceeded. ` +
            `Limit: ${this.config.categoryBudgets[options.category]}, ` +
            `Spent: ${formatUnits(currentSpent, 18)}, ` +
            `Requested: ${amount}`
        );
      }
    }

    // 5. Human approval check
    if (this.config.requireHumanAbove) {
      const threshold = parseUnits(this.config.requireHumanAbove, 18);
      if (amountWei > threshold && this.config.onHumanApprovalRequired) {
        const pendingPayment: PendingPayment = {
          id: `pending_${Date.now()}`,
          recipient,
          amount,
          category: options?.category,
          reason: `Amount ${amount} exceeds threshold ${this.config.requireHumanAbove}`,
          requestedAt: new Date().toISOString(),
        };

        this.log(`Requesting human approval for ${amount} USDC to ${recipient}`);
        const approved = await this.config.onHumanApprovalRequired(pendingPayment);

        if (!approved) {
          throw new Error(`Payment blocked: Human approval denied for ${amount} USDC`);
        }
        this.log(`Human approval granted for ${amount} USDC`);
      }
    }

    // 6. Standard budget checks (daily, hourly, per-transaction)
    await this.checkBudgetLimits(amount);
  }

  /**
   * Record spending for a category
   */
  private recordCategorySpending(category: string, amount: string): void {
    const amountWei = parseUnits(amount, 18);
    const current = this.categorySpending.get(category) || 0n;
    this.categorySpending.set(category, current + amountWei);
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private async checkBudget(amount: string, recipient?: string, category?: string): Promise<void> {
    // Use comprehensive validation if recipient is provided
    if (recipient) {
      await this.validatePayment(recipient, amount, { category });
      return;
    }

    // Otherwise, just check budget limits
    await this.checkBudgetLimits(amount);
  }

  private async checkBudgetLimits(amount: string): Promise<void> {
    const amountWei = parseUnits(amount, 18);

    // Reset counters if needed
    const now = Date.now();
    if (now - this.spending.lastDailyReset > 24 * 60 * 60 * 1000) {
      this.spending.daily = 0n;
      this.spending.lastDailyReset = now;
    }
    if (now - this.spending.lastHourlyReset > 60 * 60 * 1000) {
      this.spending.hourly = 0n;
      this.spending.lastHourlyReset = now;
    }

    // Check per-transaction limit
    if (this.config.budget?.perTransaction) {
      const limit = parseUnits(this.config.budget.perTransaction, 18);
      if (amountWei > limit) {
        throw new Error(
          `Transaction amount ${amount} exceeds per-transaction limit ${this.config.budget.perTransaction}`
        );
      }
    }

    // Check daily limit
    if (this.config.budget?.daily) {
      const limit = parseUnits(this.config.budget.daily, 18);
      if (this.spending.daily + amountWei > limit) {
        throw new Error(`Daily spending limit exceeded (${this.config.budget.daily} USDC)`);
      }
    }

    // Check hourly limit
    if (this.config.budget?.hourly) {
      const limit = parseUnits(this.config.budget.hourly, 18);
      if (this.spending.hourly + amountWei > limit) {
        throw new Error(`Hourly spending limit exceeded (${this.config.budget.hourly} USDC)`);
      }
    }

    // Check approval threshold
    if (this.config.budget?.approvalThreshold && !this.config.autoApprove) {
      const threshold = parseUnits(this.config.budget.approvalThreshold, 18);
      if (amountWei > threshold) {
        throw new Error(
          `Amount ${amount} exceeds approval threshold. Manual approval required.`
        );
      }
    }
  }

  private recordSpending(amount: string): void {
    const amountWei = parseUnits(amount, 18);
    this.spending.daily += amountWei;
    this.spending.hourly += amountWei;
  }

  private parseDeadline(deadline: string): Date {
    const now = new Date();

    // Parse formats like '24h', '7d', '2w'
    const match = deadline.match(/^(\d+)(h|d|w|m)$/);
    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2];

      switch (unit) {
        case 'h':
          return new Date(now.getTime() + value * 60 * 60 * 1000);
        case 'd':
          return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
        case 'w':
          return new Date(now.getTime() + value * 7 * 24 * 60 * 60 * 1000);
        case 'm':
          return new Date(now.getTime() + value * 30 * 24 * 60 * 60 * 1000);
      }
    }

    // Try parsing as date
    const parsed = new Date(deadline);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }

    // Default to 7 days
    return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  }

  private parseStreamConfig(config: StreamConfig): { amount: string; duration: number } {
    // Parse rate format like '100/day', '1000/month'
    const rateMatch = config.amount.match(/^([\d.]+)\/(hour|day|week|month)$/);

    if (rateMatch) {
      const rate = parseFloat(rateMatch[1]);
      const period = rateMatch[2];

      // Default duration based on period
      let durationSeconds: number;
      switch (period) {
        case 'hour':
          durationSeconds = 60 * 60;
          break;
        case 'day':
          durationSeconds = 24 * 60 * 60;
          break;
        case 'week':
          durationSeconds = 7 * 24 * 60 * 60;
          break;
        case 'month':
          durationSeconds = 30 * 24 * 60 * 60;
          break;
        default:
          durationSeconds = 24 * 60 * 60;
      }

      // If duration specified, calculate total amount
      if (config.duration && config.duration !== 'continuous') {
        const deadline = this.parseDeadline(config.duration);
        durationSeconds = Math.floor((deadline.getTime() - Date.now()) / 1000);
      }

      const totalAmount = rate.toString();
      return { amount: totalAmount, duration: durationSeconds };
    }

    // Simple amount format
    const duration = config.duration
      ? Math.floor((this.parseDeadline(config.duration).getTime() - Date.now()) / 1000)
      : 30 * 24 * 60 * 60; // Default 30 days

    return { amount: config.amount, duration };
  }

  private log(message: string): void {
    if (this.config.verbose) {
      console.log(`[ArcPay Agent${this.config.name ? ` - ${this.config.name}` : ''}] ${message}`);
    }
  }
}

/**
 * Create an AI agent for autonomous commerce
 *
 * Supports two modes:
 * - **Off-chain (default)**: Budget limits enforced locally in SDK
 * - **On-chain (trustless)**: Budget limits enforced by AgentRegistry smart contract
 *
 * @example
 * ```typescript
 * // Off-chain agent (default - Dev Tools track)
 * const agent = createAgent({
 *   privateKey: process.env.AGENT_KEY,
 *   name: 'trading-bot',
 *   budget: {
 *     daily: '1000',
 *     perTransaction: '100'
 *   }
 * });
 *
 * // On-chain agent (Trustless AI Agent track)
 * const onchainAgent = createAgent({
 *   privateKey: process.env.AGENT_KEY,
 *   useOnchainBudget: true,
 *   registryAddress: '0x...'
 * });
 *
 * // Agent can now make autonomous payments
 * await agent.pay('0x...', '50');
 * ```
 */
export function createAgent(config: AgentConfig): ArcPayAgent {
  // Note: On-chain agents use OnchainAgentManager directly
  // This function always returns an ArcPayAgent (off-chain mode)
  // For on-chain mode, use createOnchainAgentManager() instead
  if (config.useOnchainBudget) {
    console.log(
      'Note: For full on-chain trustless budget management, use createOnchainAgentManager() instead. ' +
        'This agent instance will use off-chain budget tracking with on-chain payments.'
    );
  }

  return new ArcPayAgent(config);
}

export default { createAgent, ArcPayAgent };
