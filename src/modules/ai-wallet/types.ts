/**
 * AI Wallet Types - Intelligent Payment Wallet
 */

import type { Intent } from '../intent/types';
import type { AgentPolicy } from '../agent/types';

/**
 * AI Wallet configuration
 */
export interface AIWalletConfig {
  /** Wallet private key */
  privateKey: string;
  /** AI model to use for intent understanding */
  aiModel?: 'local' | 'openai' | 'anthropic';
  /** API key for external AI (if using openai/anthropic) */
  aiApiKey?: string;
  /** Enable autonomous mode */
  autonomousMode?: boolean;
  /** Default policies for autonomous payments */
  defaultPolicies?: AgentPolicy[];
  /** Spending limits */
  limits?: {
    perTransaction?: string;
    perDay?: string;
    perMonth?: string;
  };
  /** Webhook for notifications */
  webhookUrl?: string;
}

/**
 * AI conversation context
 */
export interface ConversationContext {
  /** Conversation ID */
  id: string;
  /** Messages in conversation */
  messages: ConversationMessage[];
  /** Extracted entities */
  entities: ExtractedEntities;
  /** Current intent */
  currentIntent?: Intent;
  /** Pending confirmation */
  pendingConfirmation?: PendingAction;
}

/**
 * Conversation message
 */
export interface ConversationMessage {
  /** Message role */
  role: 'user' | 'assistant' | 'system';
  /** Message content */
  content: string;
  /** Timestamp */
  timestamp: string;
  /** Associated action (if any) */
  action?: ActionResult;
}

/**
 * Extracted entities from conversation
 */
export interface ExtractedEntities {
  /** Mentioned amounts */
  amounts: Array<{ value: string; currency: string; confidence: number }>;
  /** Mentioned addresses/recipients */
  recipients: Array<{ address: string; label?: string; confidence: number }>;
  /** Mentioned tokens */
  tokens: Array<{ symbol: string; address?: string; confidence: number }>;
  /** Time references */
  timeReferences: Array<{ type: 'relative' | 'absolute'; value: string; timestamp?: number }>;
  /** Action keywords */
  actions: Array<{ action: string; confidence: number }>;
}

/**
 * Pending action awaiting confirmation
 */
export interface PendingAction {
  /** Action type */
  type: 'send' | 'stream' | 'swap' | 'bridge' | 'subscribe' | 'batch';
  /** Action parameters */
  params: Record<string, unknown>;
  /** Estimated cost */
  estimatedCost?: string;
  /** Risk assessment */
  riskLevel: 'low' | 'medium' | 'high';
  /** Expiry timestamp */
  expiresAt: string;
  /** Confirmation code */
  confirmationCode: string;
}

/**
 * Action result
 */
export interface ActionResult {
  /** Whether action succeeded */
  success: boolean;
  /** Action type */
  type: string;
  /** Transaction hash (if applicable) */
  txHash?: string;
  /** Result data */
  data?: Record<string, unknown>;
  /** Error message */
  error?: string;
  /** Execution time in ms */
  executionTime: number;
}

/**
 * AI Wallet capabilities
 */
export interface WalletCapabilities {
  /** Can execute payments */
  payments: boolean;
  /** Can create streams */
  streaming: boolean;
  /** Can perform swaps */
  swaps: boolean;
  /** Can bridge cross-chain */
  bridging: boolean;
  /** Can manage subscriptions */
  subscriptions: boolean;
  /** Supports autonomous mode */
  autonomous: boolean;
  /** Supports voice commands */
  voice: boolean;
  /** Supported languages */
  languages: string[];
}

/**
 * Learning data from interactions
 */
export interface LearningData {
  /** Common recipients */
  frequentRecipients: Array<{
    address: string;
    label?: string;
    frequency: number;
    lastUsed: string;
  }>;
  /** Spending patterns */
  spendingPatterns: Array<{
    category: string;
    averageAmount: string;
    frequency: string;
    timeOfDay?: string;
  }>;
  /** Preferred actions */
  preferredActions: Array<{
    action: string;
    frequency: number;
    successRate: number;
  }>;
  /** Command shortcuts */
  shortcuts: Array<{
    trigger: string;
    action: string;
    params: Record<string, unknown>;
  }>;
}

/**
 * Wallet analytics
 */
export interface WalletAnalytics {
  /** Total transactions */
  totalTransactions: number;
  /** Total volume */
  totalVolume: string;
  /** Active streams */
  activeStreams: number;
  /** Active subscriptions */
  activeSubscriptions: number;
  /** Commands processed */
  commandsProcessed: number;
  /** Success rate */
  successRate: number;
  /** Average response time */
  averageResponseTime: number;
  /** Most used commands */
  topCommands: Array<{ command: string; count: number }>;
}

/**
 * Scheduled action
 */
export interface ScheduledAction {
  /** Schedule ID */
  id: string;
  /** Action to execute */
  action: PendingAction;
  /** Schedule type */
  scheduleType: 'once' | 'recurring';
  /** Next execution time */
  nextExecution: string;
  /** Recurrence pattern (cron-like) */
  recurrence?: string;
  /** Number of executions */
  executionCount: number;
  /** Maximum executions (for recurring) */
  maxExecutions?: number;
  /** Whether active */
  isActive: boolean;
}

/**
 * Notification settings
 */
export interface NotificationSettings {
  /** Notify on large transactions */
  largeTransactionThreshold?: string;
  /** Notify on stream events */
  streamEvents: boolean;
  /** Notify on low balance */
  lowBalanceThreshold?: string;
  /** Notify on scheduled actions */
  scheduledActions: boolean;
  /** Notification channels */
  channels: Array<'webhook' | 'email' | 'push'>;
}

/**
 * AI suggestion
 */
export interface AISuggestion {
  /** Suggestion type */
  type: 'optimization' | 'reminder' | 'alert' | 'recommendation';
  /** Suggestion message */
  message: string;
  /** Suggested action */
  suggestedAction?: PendingAction;
  /** Confidence score */
  confidence: number;
  /** Priority */
  priority: 'low' | 'medium' | 'high';
}

/**
 * Voice command result
 */
export interface VoiceCommandResult {
  /** Transcribed text */
  transcript: string;
  /** Confidence score */
  confidence: number;
  /** Parsed intent */
  intent?: Intent;
  /** Action result */
  result?: ActionResult;
}

/**
 * Multi-step workflow
 */
export interface Workflow {
  /** Workflow ID */
  id: string;
  /** Workflow name */
  name: string;
  /** Steps in order */
  steps: WorkflowStep[];
  /** Current step index */
  currentStep: number;
  /** Workflow state */
  state: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  /** Started at */
  startedAt?: string;
  /** Completed at */
  completedAt?: string;
}

/**
 * Workflow step
 */
export interface WorkflowStep {
  /** Step ID */
  id: string;
  /** Step name */
  name: string;
  /** Action to execute */
  action: PendingAction;
  /** Condition to proceed (optional) */
  condition?: string;
  /** Step state */
  state: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  /** Step result */
  result?: ActionResult;
}
