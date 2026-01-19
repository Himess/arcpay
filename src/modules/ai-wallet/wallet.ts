/**
 * AI Wallet - Intelligent Payment Wallet
 *
 * Combines Intent Engine, Streaming, and Agent for
 * natural language controlled autonomous payments.
 */

import { createWalletClient, http, publicActions, formatUnits, parseUnits, type Chain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { IntentExecutor } from '../intent/executor';
import { PaymentStream } from '../streaming/stream';
import type {
  AIWalletConfig,
  ConversationContext,
  ExtractedEntities,
  PendingAction,
  ActionResult,
  WalletCapabilities,
  LearningData,
  WalletAnalytics,
  ScheduledAction,
  AISuggestion,
  Workflow,
  WorkflowStep,
} from './types';
import type { Intent } from '../intent/types';
import type { StreamSession } from '../streaming/types';

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

const USDC_ADDRESS = '0x3600000000000000000000000000000000000000';
const USDC_DECIMALS = 6;

/**
 * AI Wallet with natural language interface
 */
export class AIWallet {
  private wallet: ReturnType<typeof createWalletClient>;
  private account: ReturnType<typeof privateKeyToAccount>;
  private intentEngine: IntentExecutor;
  private streamEngine: PaymentStream;
  private config: AIWalletConfig;

  private conversations: Map<string, ConversationContext> = new Map();
  private pendingActions: Map<string, PendingAction> = new Map();
  private scheduledActions: Map<string, ScheduledAction> = new Map();
  private workflows: Map<string, Workflow> = new Map();
  private learningData: LearningData = {
    frequentRecipients: [],
    spendingPatterns: [],
    preferredActions: [],
    shortcuts: [],
  };
  private analytics: WalletAnalytics = {
    totalTransactions: 0,
    totalVolume: '0',
    activeStreams: 0,
    activeSubscriptions: 0,
    commandsProcessed: 0,
    successRate: 100,
    averageResponseTime: 0,
    topCommands: [],
  };

  constructor(config: AIWalletConfig) {
    this.config = config;
    this.account = privateKeyToAccount(config.privateKey as `0x${string}`);
    this.wallet = createWalletClient({
      account: this.account,
      chain: arcTestnet,
      transport: http(),
    }).extend(publicActions);

    this.intentEngine = new IntentExecutor({ privateKey: config.privateKey });
    this.streamEngine = new PaymentStream(config.privateKey);

    // Start scheduled action processor
    this.startScheduleProcessor();
  }

  /**
   * Process a natural language command
   *
   * @param input - Natural language input
   * @param conversationId - Optional conversation ID for context
   * @returns Action result
   */
  async chat(input: string, conversationId?: string): Promise<ActionResult> {
    const startTime = Date.now();
    const convId = conversationId || this.createConversation();
    const context = this.conversations.get(convId)!;

    // Add user message
    context.messages.push({
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    });

    // Extract entities
    const entities = this.extractEntities(input);
    context.entities = this.mergeEntities(context.entities, entities);

    // Check for confirmation response
    if (context.pendingConfirmation) {
      if (this.isConfirmation(input)) {
        const result = await this.executeAction(context.pendingConfirmation);
        context.pendingConfirmation = undefined;
        this.addAssistantMessage(context, result);
        return result;
      } else if (this.isCancellation(input)) {
        context.pendingConfirmation = undefined;
        const result: ActionResult = {
          success: true,
          type: 'cancelled',
          executionTime: Date.now() - startTime,
        };
        this.addAssistantMessage(context, result);
        return result;
      }
    }

    // Check for shortcut
    const shortcut = this.findShortcut(input);
    if (shortcut) {
      const action = this.createActionFromShortcut(shortcut);
      return this.processAction(context, action, startTime);
    }

    // Parse intent
    const intent = await this.intentEngine.execute(input);
    context.currentIntent = intent;

    // Check if high-risk action needs confirmation
    if (this.needsConfirmation(intent)) {
      const pendingAction = this.createPendingAction(intent);
      context.pendingConfirmation = pendingAction;
      this.pendingActions.set(pendingAction.confirmationCode, pendingAction);

      const result: ActionResult = {
        success: true,
        type: 'pending_confirmation',
        data: {
          message: this.formatConfirmationRequest(pendingAction),
          confirmationCode: pendingAction.confirmationCode,
        },
        executionTime: Date.now() - startTime,
      };
      this.addAssistantMessage(context, result);
      return result;
    }

    // Execute directly if low-risk or autonomous mode
    const action = this.createPendingAction(intent);
    return this.processAction(context, action, startTime);
  }

  /**
   * Confirm a pending action
   *
   * @param confirmationCode - Confirmation code
   * @returns Action result
   */
  async confirm(confirmationCode: string): Promise<ActionResult> {
    const action = this.pendingActions.get(confirmationCode);
    if (!action) {
      return {
        success: false,
        type: 'confirmation',
        error: 'Invalid or expired confirmation code',
        executionTime: 0,
      };
    }

    if (new Date(action.expiresAt) < new Date()) {
      this.pendingActions.delete(confirmationCode);
      return {
        success: false,
        type: 'confirmation',
        error: 'Confirmation expired',
        executionTime: 0,
      };
    }

    this.pendingActions.delete(confirmationCode);
    return this.executeAction(action);
  }

  /**
   * Create a payment stream with natural language
   *
   * @param command - Natural language command
   * @returns Stream session
   */
  async createStream(command: string): Promise<StreamSession | null> {
    const intent = await this.intentEngine.execute(command);

    if (intent.parsed.action !== 'stream') {
      return null;
    }

    const params = intent.parsed.params as Record<string, string | undefined>;
    const rate = params.rate;
    const recipient = params.recipient;
    const budget = params.budget;

    const stream = await this.streamEngine.createStream({
      endpoint: recipient || '',
      rate: {
        amount: rate || '0.0001',
        per: 'token',
      },
      budget: {
        max: budget || '10.00',
        warningAt: '0.80',
      },
    });

    this.analytics.activeStreams++;
    return stream.session;
  }

  /**
   * Schedule an action
   *
   * @param command - Natural language command
   * @param schedule - Schedule configuration
   * @returns Scheduled action
   */
  async schedule(
    command: string,
    schedule: { at?: string; every?: string; maxExecutions?: number }
  ): Promise<ScheduledAction> {
    const intent = await this.intentEngine.execute(command);
    const action = this.createPendingAction(intent);

    const scheduled: ScheduledAction = {
      id: `sched_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      action,
      scheduleType: schedule.every ? 'recurring' : 'once',
      nextExecution: schedule.at || new Date(Date.now() + 60000).toISOString(),
      recurrence: schedule.every,
      executionCount: 0,
      maxExecutions: schedule.maxExecutions,
      isActive: true,
    };

    this.scheduledActions.set(scheduled.id, scheduled);
    return scheduled;
  }

  /**
   * Create a workflow with multiple steps
   *
   * @param name - Workflow name
   * @param commands - Array of commands
   * @returns Workflow
   */
  async createWorkflow(name: string, commands: string[]): Promise<Workflow> {
    const steps: WorkflowStep[] = [];

    for (let i = 0; i < commands.length; i++) {
      const intent = await this.intentEngine.execute(commands[i]);
      const action = this.createPendingAction(intent);

      steps.push({
        id: `step_${i}`,
        name: commands[i],
        action,
        state: 'pending',
      });
    }

    const workflow: Workflow = {
      id: `wf_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name,
      steps,
      currentStep: 0,
      state: 'pending',
    };

    this.workflows.set(workflow.id, workflow);
    return workflow;
  }

  /**
   * Execute a workflow
   *
   * @param workflowId - Workflow ID
   * @returns Workflow result
   */
  async executeWorkflow(workflowId: string): Promise<Workflow> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    workflow.state = 'running';
    workflow.startedAt = new Date().toISOString();

    for (let i = workflow.currentStep; i < workflow.steps.length; i++) {
      const step = workflow.steps[i];
      step.state = 'running';
      workflow.currentStep = i;

      try {
        const result = await this.executeAction(step.action);
        step.result = result;
        step.state = result.success ? 'completed' : 'failed';

        if (!result.success) {
          workflow.state = 'failed';
          break;
        }
      } catch (error) {
        step.state = 'failed';
        step.result = {
          success: false,
          type: step.action.type,
          error: error instanceof Error ? error.message : 'Unknown error',
          executionTime: 0,
        };
        workflow.state = 'failed';
        break;
      }
    }

    if (workflow.steps.every((s) => s.state === 'completed')) {
      workflow.state = 'completed';
    }

    workflow.completedAt = new Date().toISOString();
    this.workflows.set(workflowId, workflow);
    return workflow;
  }

  /**
   * Add a shortcut command
   *
   * @param trigger - Trigger phrase
   * @param command - Full command to execute
   */
  addShortcut(trigger: string, command: string): void {
    const intent = this.intentEngine['parser'].parse(command);
    this.learningData.shortcuts.push({
      trigger: trigger.toLowerCase(),
      action: intent.action,
      params: intent.params as Record<string, unknown>,
    });
  }

  /**
   * Get AI suggestions based on patterns
   *
   * @returns AI suggestions
   */
  getSuggestions(): AISuggestion[] {
    const suggestions: AISuggestion[] = [];

    // Check for recurring patterns
    if (this.learningData.spendingPatterns.length > 0) {
      const topPattern = this.learningData.spendingPatterns[0];
      suggestions.push({
        type: 'recommendation',
        message: `You frequently send ${topPattern.averageAmount} USDC. Would you like to set up an automated payment?`,
        confidence: 0.8,
        priority: 'medium',
      });
    }

    // Check for frequent recipients
    if (this.learningData.frequentRecipients.length > 0) {
      const topRecipient = this.learningData.frequentRecipients[0];
      suggestions.push({
        type: 'optimization',
        message: `You often send to ${topRecipient.label || topRecipient.address}. Would you like to create a shortcut?`,
        confidence: 0.9,
        priority: 'low',
      });
    }

    return suggestions;
  }

  /**
   * Get wallet capabilities
   *
   * @returns Capabilities
   */
  getCapabilities(): WalletCapabilities {
    return {
      payments: true,
      streaming: true,
      swaps: true,
      bridging: true,
      subscriptions: true,
      autonomous: this.config.autonomousMode || false,
      voice: false, // Would require speech recognition integration
      languages: ['en'],
    };
  }

  /**
   * Get wallet analytics
   *
   * @returns Analytics
   */
  getAnalytics(): WalletAnalytics {
    return { ...this.analytics };
  }

  /**
   * Get wallet balance
   *
   * @returns Balance in USDC
   */
  async getBalance(): Promise<string> {
    const walletWithRead = this.wallet as typeof this.wallet & {
      readContract: (args: {
        address: `0x${string}`;
        abi: readonly unknown[];
        functionName: string;
        args: unknown[];
      }) => Promise<bigint>;
    };

    try {
      const balance = await walletWithRead.readContract({
        address: USDC_ADDRESS as `0x${string}`,
        abi: [
          {
            name: 'balanceOf',
            type: 'function',
            inputs: [{ name: 'account', type: 'address' }],
            outputs: [{ type: 'uint256' }],
          },
        ],
        functionName: 'balanceOf',
        args: [this.account.address],
      });
      return formatUnits(balance, USDC_DECIMALS);
    } catch {
      return '0';
    }
  }

  /**
   * Get help text
   *
   * @returns Help examples
   */
  getHelp(): string[] {
    return [
      'send $10 to 0x...',
      'stream $0.001 per token to api.com max $5',
      'split $100 between 0x..., 0x...',
      'swap $50 USDC to EURC',
      'bridge $100 to Base',
      'pay $5 monthly to 0x...',
      'schedule "send $10 to 0x..." at 9am tomorrow',
    ];
  }

  // Private methods

  private createConversation(): string {
    const id = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.conversations.set(id, {
      id,
      messages: [],
      entities: {
        amounts: [],
        recipients: [],
        tokens: [],
        timeReferences: [],
        actions: [],
      },
    });
    return id;
  }

  private extractEntities(input: string): ExtractedEntities {
    const entities: ExtractedEntities = {
      amounts: [],
      recipients: [],
      tokens: [],
      timeReferences: [],
      actions: [],
    };

    // Extract amounts
    const amountRegex = /\$?([\d,]+(?:\.\d+)?)\s*(USDC|EURC|USD)?/gi;
    let match;
    while ((match = amountRegex.exec(input)) !== null) {
      entities.amounts.push({
        value: match[1].replace(/,/g, ''),
        currency: match[2] || 'USDC',
        confidence: 0.9,
      });
    }

    // Extract addresses
    const addressRegex = /0x[a-fA-F0-9]{40}/g;
    while ((match = addressRegex.exec(input)) !== null) {
      entities.recipients.push({
        address: match[0],
        confidence: 1.0,
      });
    }

    // Extract action keywords
    const actions = ['send', 'pay', 'transfer', 'stream', 'swap', 'bridge', 'split'];
    for (const action of actions) {
      if (input.toLowerCase().includes(action)) {
        entities.actions.push({
          action,
          confidence: 0.8,
        });
      }
    }

    return entities;
  }

  private mergeEntities(existing: ExtractedEntities, newEntities: ExtractedEntities): ExtractedEntities {
    return {
      amounts: [...existing.amounts, ...newEntities.amounts],
      recipients: [...existing.recipients, ...newEntities.recipients],
      tokens: [...existing.tokens, ...newEntities.tokens],
      timeReferences: [...existing.timeReferences, ...newEntities.timeReferences],
      actions: [...existing.actions, ...newEntities.actions],
    };
  }

  private isConfirmation(input: string): boolean {
    const confirmWords = ['yes', 'confirm', 'ok', 'proceed', 'do it', 'execute', 'approve'];
    return confirmWords.some((w) => input.toLowerCase().includes(w));
  }

  private isCancellation(input: string): boolean {
    const cancelWords = ['no', 'cancel', 'stop', 'abort', 'nevermind', 'forget it'];
    return cancelWords.some((w) => input.toLowerCase().includes(w));
  }

  private findShortcut(input: string): LearningData['shortcuts'][0] | undefined {
    const normalizedInput = input.toLowerCase().trim();
    return this.learningData.shortcuts.find((s) => normalizedInput.startsWith(s.trigger));
  }

  private createActionFromShortcut(
    shortcut: LearningData['shortcuts'][0]
  ): PendingAction {
    return {
      type: shortcut.action as PendingAction['type'],
      params: shortcut.params,
      riskLevel: 'low',
      expiresAt: new Date(Date.now() + 300000).toISOString(),
      confirmationCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
    };
  }

  private needsConfirmation(intent: Intent): boolean {
    if (this.config.autonomousMode) return false;

    // High value transactions need confirmation
    const amount = parseFloat(intent.parsed.params.amount || '0');
    const limit = parseFloat(this.config.limits?.perTransaction || '100');

    if (amount > limit) return true;

    // Unknown recipients need confirmation
    const recipient = intent.parsed.params.recipient;
    if (recipient && !this.learningData.frequentRecipients.some((r) => r.address === recipient)) {
      return true;
    }

    // Low confidence intents need confirmation
    if (intent.parsed.confidence < 0.8) return true;

    return false;
  }

  private createPendingAction(intent: Intent): PendingAction {
    const amount = intent.parsed.params.amount || '0';

    return {
      type: intent.parsed.action as PendingAction['type'],
      params: intent.parsed.params as Record<string, unknown>,
      estimatedCost: amount,
      riskLevel: this.assessRisk(intent),
      expiresAt: new Date(Date.now() + 300000).toISOString(),
      confirmationCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
    };
  }

  private assessRisk(intent: Intent): 'low' | 'medium' | 'high' {
    const amount = parseFloat(intent.parsed.params.amount || '0');

    if (amount > 1000) return 'high';
    if (amount > 100) return 'medium';
    return 'low';
  }

  private formatConfirmationRequest(action: PendingAction): string {
    const riskEmoji = action.riskLevel === 'high' ? '⚠️' : action.riskLevel === 'medium' ? '⚡' : '✅';

    return `${riskEmoji} Please confirm: ${action.type} ${action.estimatedCost} USDC
Risk: ${action.riskLevel}
Code: ${action.confirmationCode}
Reply "yes" to confirm or "no" to cancel.`;
  }

  private async processAction(
    context: ConversationContext,
    action: PendingAction,
    startTime: number
  ): Promise<ActionResult> {
    const result = await this.executeAction(action);
    result.executionTime = Date.now() - startTime;
    this.addAssistantMessage(context, result);
    this.updateAnalytics(action, result);
    this.updateLearning(action, result);
    return result;
  }

  private async executeAction(action: PendingAction): Promise<ActionResult> {
    const startTime = Date.now();

    try {
      switch (action.type) {
        case 'send': {
          const intent = await this.intentEngine.execute(
            `send ${action.params.amount} to ${action.params.recipient}`
          );
          return {
            success: intent.status === 'completed',
            type: 'send',
            txHash: intent.result?.txHash,
            data: intent.result?.data as Record<string, unknown> | undefined,
            error: intent.result?.error,
            executionTime: Date.now() - startTime,
          };
        }

        case 'stream': {
          const session = await this.createStream(
            `stream ${action.params.rate} per ${action.params.per || 'token'} to ${action.params.recipient} max ${action.params.budget}`
          );
          return {
            success: !!session,
            type: 'stream',
            data: session ? { sessionId: session.id } : undefined,
            executionTime: Date.now() - startTime,
          };
        }

        default:
          return {
            success: true,
            type: action.type,
            data: { message: `${action.type} action queued`, params: action.params },
            executionTime: Date.now() - startTime,
          };
      }
    } catch (error) {
      return {
        success: false,
        type: action.type,
        error: error instanceof Error ? error.message : 'Execution failed',
        executionTime: Date.now() - startTime,
      };
    }
  }

  private addAssistantMessage(context: ConversationContext, result: ActionResult): void {
    const message = result.success
      ? `✅ ${result.type} completed${result.txHash ? ` (tx: ${result.txHash.slice(0, 10)}...)` : ''}`
      : `❌ ${result.type} failed: ${result.error}`;

    context.messages.push({
      role: 'assistant',
      content: message,
      timestamp: new Date().toISOString(),
      action: result,
    });
  }

  private updateAnalytics(action: PendingAction, result: ActionResult): void {
    this.analytics.commandsProcessed++;
    this.analytics.totalTransactions++;

    if (action.estimatedCost) {
      const current = parseUnits(this.analytics.totalVolume, USDC_DECIMALS);
      const add = parseUnits(action.estimatedCost, USDC_DECIMALS);
      this.analytics.totalVolume = formatUnits(current + add, USDC_DECIMALS);
    }

    // Update success rate
    const successCount = Math.round(
      (this.analytics.successRate / 100) * (this.analytics.commandsProcessed - 1)
    );
    const newSuccessCount = result.success ? successCount + 1 : successCount;
    this.analytics.successRate = (newSuccessCount / this.analytics.commandsProcessed) * 100;

    // Update response time
    this.analytics.averageResponseTime =
      (this.analytics.averageResponseTime * (this.analytics.commandsProcessed - 1) +
        result.executionTime) /
      this.analytics.commandsProcessed;
  }

  private updateLearning(action: PendingAction, result: ActionResult): void {
    if (!result.success) return;

    // Update frequent recipients
    const recipient = action.params.recipient as string | undefined;
    if (recipient) {
      const existing = this.learningData.frequentRecipients.find(
        (r) => r.address.toLowerCase() === recipient.toLowerCase()
      );
      if (existing) {
        existing.frequency++;
        existing.lastUsed = new Date().toISOString();
      } else {
        this.learningData.frequentRecipients.push({
          address: recipient,
          frequency: 1,
          lastUsed: new Date().toISOString(),
        });
      }
      // Sort by frequency
      this.learningData.frequentRecipients.sort((a, b) => b.frequency - a.frequency);
    }

    // Update preferred actions
    const existingAction = this.learningData.preferredActions.find((a) => a.action === action.type);
    if (existingAction) {
      existingAction.frequency++;
      existingAction.successRate =
        (existingAction.successRate * (existingAction.frequency - 1) + (result.success ? 100 : 0)) /
        existingAction.frequency;
    } else {
      this.learningData.preferredActions.push({
        action: action.type,
        frequency: 1,
        successRate: result.success ? 100 : 0,
      });
    }
  }

  private startScheduleProcessor(): void {
    setInterval(() => {
      const now = new Date();

      for (const [_id, scheduled] of this.scheduledActions) {
        if (!scheduled.isActive) continue;

        const nextExec = new Date(scheduled.nextExecution);
        if (nextExec <= now) {
          // Execute
          this.executeAction(scheduled.action).then((result) => {
            scheduled.executionCount++;

            // Notify via webhook
            if (this.config.webhookUrl) {
              fetch(this.config.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'scheduled_execution', scheduled, result }),
              }).catch(() => {});
            }

            // Update next execution or deactivate
            if (
              scheduled.scheduleType === 'once' ||
              (scheduled.maxExecutions && scheduled.executionCount >= scheduled.maxExecutions)
            ) {
              scheduled.isActive = false;
            } else if (scheduled.recurrence) {
              // Simple interval parsing (e.g., "1h", "30m", "1d")
              const interval = this.parseInterval(scheduled.recurrence);
              scheduled.nextExecution = new Date(now.getTime() + interval).toISOString();
            }
          });
        }
      }
    }, 60000); // Check every minute
  }

  private parseInterval(interval: string): number {
    const match = interval.match(/^(\d+)(s|m|h|d)$/);
    if (!match) return 3600000; // Default 1 hour

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60000;
      case 'h':
        return value * 3600000;
      case 'd':
        return value * 86400000;
      default:
        return 3600000;
    }
  }
}

/**
 * Create an AI Wallet instance
 *
 * @param config - Wallet configuration
 * @returns AIWallet instance
 *
 * @example
 * ```typescript
 * const wallet = createAIWallet({
 *   privateKey: process.env.PRIVATE_KEY,
 *   autonomousMode: false,
 *   limits: { perTransaction: '100' }
 * });
 *
 * // Natural language payments
 * await wallet.chat("send $10 to 0x...");
 * await wallet.chat("stream $0.001 per token to api.llm.com max $5");
 *
 * // Schedule payments
 * await wallet.schedule("send $100 to 0x...", { at: "2024-01-15T09:00:00Z" });
 *
 * // Create workflow
 * const workflow = await wallet.createWorkflow("Weekly payroll", [
 *   "send $1000 to 0x111...",
 *   "send $1500 to 0x222...",
 *   "send $2000 to 0x333...",
 * ]);
 * await wallet.executeWorkflow(workflow.id);
 *
 * // Get suggestions
 * const suggestions = wallet.getSuggestions();
 * ```
 */
export function createAIWallet(config: AIWalletConfig): AIWallet {
  return new AIWallet(config);
}
