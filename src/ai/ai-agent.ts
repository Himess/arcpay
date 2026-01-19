/**
 * AI Agent with Gemini Function Calling
 *
 * This class bridges Gemini's function calls to real ArcPay operations.
 * Gemini 3.0 Flash analyzes user intent and calls appropriate payment functions.
 */

import { GeminiClient } from './gemini-client';
import { ARCPAY_FUNCTIONS } from './function-declarations';
import { MultimodalAnalyzer } from './multimodal-analyzer';
import { ArcPayAgent, createAgent } from '../agent';
import type { AgentConfig } from '../agent';
import type { GeminiFunctionResponse, AICommandResult } from './types';

// ============ Types ============

export interface AIAgentConfig extends AgentConfig {
  geminiApiKey: string;
  autoExecute?: boolean; // Automatically execute function calls (default: true with confirmation)
  confirmBeforeExecute?: boolean; // Ask for confirmation before executing (default: true for payments)
  confirmThreshold?: string; // Confirm payments above this amount (default: '100')
}

// Image part for multimodal
interface ImagePart {
  inlineData: {
    data: string;
    mimeType: string;
  };
}

// ============ AI Agent ============

export class AIAgent {
  private agent: ArcPayAgent;
  private gemini: GeminiClient;
  private multimodal: MultimodalAnalyzer;
  private config: AIAgentConfig;
  private pendingExecution: (() => Promise<AICommandResult>) | null = null;

  constructor(config: AIAgentConfig) {
    this.config = config;

    // Initialize underlying agent
    this.agent = createAgent(config);

    // Initialize Gemini with function calling
    this.gemini = new GeminiClient({ apiKey: config.geminiApiKey });
    this.gemini.initWithFunctions(ARCPAY_FUNCTIONS);

    // Initialize multimodal analyzer
    this.multimodal = new MultimodalAnalyzer(this.gemini);
  }

  /**
   * Process a text command using Gemini Function Calling
   */
  async processCommand(command: string): Promise<AICommandResult> {
    const systemPrompt = this.buildSystemPrompt();
    const fullPrompt = `${systemPrompt}\n\nUser command: ${command}`;

    try {
      const response = await this.gemini.generateWithFunctions(fullPrompt);
      return this.handleGeminiResponse(response, command);
    } catch (error) {
      return {
        success: false,
        action: 'error',
        message: error instanceof Error ? error.message : 'Failed to process command'
      };
    }
  }

  /**
   * Process a command with an image (multimodal)
   */
  async processWithImage(
    command: string,
    imageBase64: string,
    mimeType: string = 'image/jpeg'
  ): Promise<AICommandResult> {
    const systemPrompt = this.buildSystemPrompt();
    const fullPrompt = `${systemPrompt}\n\nUser command: ${command}\n\nAnalyze the attached image and execute the appropriate payment action.`;

    const imagePart: ImagePart = {
      inlineData: {
        data: imageBase64,
        mimeType
      }
    };

    try {
      const response = await this.gemini.generateWithFunctions(fullPrompt, [imagePart]);
      return this.handleGeminiResponse(response, command);
    } catch (error) {
      return {
        success: false,
        action: 'error',
        message: error instanceof Error ? error.message : 'Failed to process image command'
      };
    }
  }

  /**
   * Analyze invoice and optionally pay
   */
  async analyzeAndPayInvoice(
    imageBase64: string,
    autoPay: boolean = false
  ): Promise<AICommandResult> {
    const analysis = await this.multimodal.analyzeInvoice(imageBase64);

    if (!analysis.detected) {
      return {
        success: false,
        action: 'analyze',
        message: 'Could not detect an invoice in the image.'
      };
    }

    if (analysis.confidence < 0.7) {
      return {
        success: false,
        action: 'analyze',
        message: `Invoice detected but confidence is low (${(analysis.confidence * 100).toFixed(0)}%). Please verify details manually.`,
        data: { analysis }
      };
    }

    if (!analysis.amount || !analysis.recipient) {
      return {
        success: false,
        action: 'analyze',
        message: 'Invoice detected but missing payment details (amount or recipient address).',
        data: { analysis }
      };
    }

    // If auto-pay is disabled, return analysis with confirmation needed
    if (!autoPay) {
      return {
        success: true,
        action: 'analyze',
        message: `Invoice found: ${analysis.amount} ${analysis.currency || 'USDC'} to ${analysis.recipientName || analysis.recipient}`,
        data: { analysis },
        needsConfirmation: true,
        confirmationPrompt: `Pay ${analysis.amount} ${analysis.currency || 'USDC'} to ${analysis.recipientName || analysis.recipient}?`
      };
    }

    // Auto-pay the invoice
    return this.executeFunctionCall('payInvoice', {
      recipient: analysis.recipient,
      amount: analysis.amount,
      invoiceNumber: analysis.invoiceNumber,
      dueDate: analysis.dueDate
    });
  }

  /**
   * Analyze delivery proof and decide on escrow release
   */
  async analyzeDeliveryAndRelease(
    imageBase64: string,
    escrowId: string,
    expectedDelivery: string,
    autoRelease: boolean = false
  ): Promise<AICommandResult> {
    const analysis = await this.multimodal.analyzeDeliveryProof(imageBase64, expectedDelivery);

    if (analysis.recommendation === 'release' && analysis.confidence >= 0.8) {
      if (autoRelease) {
        return this.executeFunctionCall('releaseEscrow', { escrowId });
      } else {
        return {
          success: true,
          action: 'analyze',
          message: `Delivery verified with ${(analysis.confidence * 100).toFixed(0)}% confidence. ${analysis.reasoning}`,
          data: { analysis },
          needsConfirmation: true,
          confirmationPrompt: `Release escrow payment? AI detected: ${analysis.evidence.join(', ')}`
        };
      }
    } else if (analysis.recommendation === 'hold') {
      return {
        success: false,
        action: 'analyze',
        message: `Cannot verify delivery. ${analysis.reasoning}`,
        data: { analysis }
      };
    } else {
      return {
        success: true,
        action: 'review',
        message: `Manual review recommended. ${analysis.reasoning}`,
        data: { analysis },
        needsConfirmation: true,
        confirmationPrompt: 'AI recommends manual review. Do you want to release the escrow anyway?'
      };
    }
  }

  /**
   * Confirm and execute pending action
   */
  async confirmExecution(): Promise<AICommandResult> {
    if (!this.pendingExecution) {
      return {
        success: false,
        action: 'error',
        message: 'No pending action to confirm'
      };
    }

    const result = await this.pendingExecution();
    this.pendingExecution = null;
    return result;
  }

  /**
   * Cancel pending action
   */
  cancelPendingAction(): void {
    this.pendingExecution = null;
  }

  // ============ Private Methods ============

  private buildSystemPrompt(): string {
    return `You are an AI payment agent powered by ArcPay SDK. You can execute blockchain payments on the Arc network using USDC.

Your capabilities:
- Send USDC payments (pay)
- Create and manage escrows (createEscrow, releaseEscrow, refundEscrow)
- Set up payment streams for recurring payments (createStream, cancelStream)
- Hire other AI agents for tasks (hireAgent, approveAgentWork)
- Send private/anonymous payments (payPrivate)
- Check balances and spending reports (getBalance, getSpendingReport)
- Manage whitelist/blacklist (addToWhitelist, addToBlacklist)
- Process invoices and subscriptions (payInvoice, subscribe)

When processing images:
- Analyze invoices to extract payment details
- Verify delivery proofs before releasing escrow
- Parse receipts for transaction records

Always use the appropriate function for the user's request. If you're unsure, ask for clarification.
For large payments (over ${this.config.confirmThreshold || '100'} USDC), always confirm before executing.`;
  }

  private async handleGeminiResponse(
    response: GeminiFunctionResponse,
    _originalCommand: string
  ): Promise<AICommandResult> {
    if (response.type === 'text') {
      // Gemini responded with text instead of function call
      return {
        success: true,
        action: 'chat',
        message: response.text || 'I understood your request but no action was needed.'
      };
    }

    // Gemini wants to call function(s)
    const functionCalls = response.functionCalls || [];

    if (functionCalls.length === 0) {
      return {
        success: false,
        action: 'unknown',
        message: 'Could not determine what action to take.'
      };
    }

    // For now, execute first function call
    const call = functionCalls[0];

    // Check if confirmation is needed
    if (this.needsConfirmation(call)) {
      this.pendingExecution = () => this.executeFunctionCall(call.name, call.args);

      return {
        success: true,
        action: call.name,
        message: this.buildConfirmationMessage(call),
        functionCalls,
        needsConfirmation: true,
        confirmationPrompt: this.buildConfirmationMessage(call)
      };
    }

    // Execute immediately
    return this.executeFunctionCall(call.name, call.args);
  }

  private needsConfirmation(call: { name: string; args: Record<string, unknown> }): boolean {
    if (this.config.confirmBeforeExecute === false) return false;

    const paymentActions = ['pay', 'payInvoice', 'createEscrow', 'releaseEscrow', 'createStream', 'hireAgent', 'payPrivate'];

    if (!paymentActions.includes(call.name)) return false;

    const amount = call.args.amount as string | undefined;
    if (!amount) return false;

    const threshold = parseFloat(this.config.confirmThreshold || '100');
    return parseFloat(amount) >= threshold;
  }

  private buildConfirmationMessage(call: { name: string; args: Record<string, unknown> }): string {
    const { name, args } = call;

    switch (name) {
      case 'pay':
        return `Send ${args.amount} USDC to ${args.recipient}?`;
      case 'createEscrow':
        return `Create escrow for ${args.amount} USDC to ${args.beneficiary}?`;
      case 'releaseEscrow':
        return `Release escrow ${args.escrowId}?`;
      case 'createStream':
        return `Start streaming ${args.totalAmount} USDC to ${args.recipient} over ${args.duration}?`;
      case 'hireAgent':
        return `Hire agent ${args.agentAddress} for ${args.payment} USDC? Task: ${args.task}`;
      default:
        return `Execute ${name}?`;
    }
  }

  private async executeFunctionCall(
    name: string,
    args: Record<string, unknown>
  ): Promise<AICommandResult> {
    try {
      switch (name) {
        case 'pay': {
          const payResult = await this.agent.pay(
            args.recipient as string,
            args.amount as string,
            { note: args.memo as string }
          );
          return {
            success: true,
            action: 'pay',
            message: `Sent ${args.amount} USDC to ${args.recipient}`,
            txHash: payResult.txHash
          };
        }

        case 'createEscrow': {
          const escrowResult = await this.agent.createTask({
            description: args.description as string || 'Escrow',
            payment: args.amount as string,
            worker: args.beneficiary as string,
            deadline: args.duration as string || '7d'
          });
          return {
            success: true,
            action: 'createEscrow',
            message: `Created escrow for ${args.amount} USDC`,
            txHash: escrowResult.escrowId,
            data: { escrowId: escrowResult.id }
          };
        }

        case 'releaseEscrow': {
          const releaseResult = await this.agent.approveTask(args.escrowId as string);
          return {
            success: true,
            action: 'releaseEscrow',
            message: 'Escrow released successfully',
            txHash: releaseResult.txHash
          };
        }

        case 'createStream': {
          const streamResult = await this.agent.streamToAgent({
            agentAddress: args.recipient as string,
            rate: `${args.totalAmount}/${args.duration}`,
            duration: args.duration as string
          });
          return {
            success: true,
            action: 'createStream',
            message: `Started streaming ${args.totalAmount} USDC over ${args.duration}`,
            txHash: streamResult.streamId || streamResult.id,
            data: { streamId: streamResult.id }
          };
        }

        case 'hireAgent': {
          const hireResult = await this.agent.hireAgent({
            agentAddress: args.agentAddress as string,
            task: args.task as string,
            payment: args.payment as string,
            deadline: args.deadline as string || '24h'
          });
          return {
            success: true,
            action: 'hireAgent',
            message: `Hired agent for ${args.payment} USDC. Task: ${args.task}`,
            txHash: hireResult.escrowId || hireResult.id,
            data: { workId: hireResult.id }
          };
        }

        case 'getBalance': {
          const balance = await this.agent.getBalance();
          return {
            success: true,
            action: 'getBalance',
            message: `Current balance: ${balance} USDC`,
            data: { balance }
          };
        }

        case 'getSpendingReport': {
          const report = await this.agent.getSpendingReport();
          return {
            success: true,
            action: 'getSpendingReport',
            message: `Spent ${report.totalSpent} USDC today`,
            data: { report }
          };
        }

        case 'addToWhitelist': {
          this.agent.addToWhitelist(args.address as string);
          return {
            success: true,
            action: 'addToWhitelist',
            message: `Added ${args.address} to whitelist`
          };
        }

        case 'addToBlacklist': {
          this.agent.addToBlacklist(args.address as string);
          return {
            success: true,
            action: 'addToBlacklist',
            message: `Blocked ${args.address}`
          };
        }

        case 'payInvoice': {
          const invoiceResult = await this.agent.pay(
            args.recipient as string,
            args.amount as string,
            { note: `Invoice: ${args.invoiceNumber || 'N/A'}` }
          );
          return {
            success: true,
            action: 'payInvoice',
            message: `Paid invoice for ${args.amount} USDC`,
            txHash: invoiceResult.txHash
          };
        }

        default:
          return {
            success: false,
            action: name,
            message: `Unknown function: ${name}`
          };
      }
    } catch (error) {
      return {
        success: false,
        action: name,
        message: error instanceof Error ? error.message : 'Execution failed'
      };
    }
  }

  // ============ Public Accessors ============

  getAgent(): ArcPayAgent {
    return this.agent;
  }

  getMultimodalAnalyzer(): MultimodalAnalyzer {
    return this.multimodal;
  }

  async getAddress(): Promise<string> {
    return this.agent.getAddress();
  }
}

// ============ Factory ============

export function createAIAgent(config: AIAgentConfig): AIAgent {
  return new AIAgent(config);
}
