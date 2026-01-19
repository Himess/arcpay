/**
 * ArcPay AI Module
 *
 * Gemini 3.0 Flash powered AI features:
 * - Function Calling: Direct payment execution
 * - Multimodal: Invoice, receipt, delivery proof analysis
 * - Voice Integration: Hands-free payment commands
 * - Intent Parsing: Natural language command parsing
 * - Transaction Explainer: Human-readable tx summaries
 * - Spending Advisor: AI-powered financial insights
 */

// Gemini Client
export { GeminiClient, createGeminiClient } from './gemini-client';

// Function Declarations
export { ARCPAY_FUNCTIONS, getFunctionByName } from './function-declarations';
export type { FunctionDeclaration } from './function-declarations';

// Multimodal Analyzer
export { MultimodalAnalyzer, createMultimodalAnalyzer } from './multimodal-analyzer';

// AI Agent
export { AIAgent, createAIAgent } from './ai-agent';
export type { AIAgentConfig } from './ai-agent';

// Command Parser (Fallback)
export { CommandParser, createCommandParser } from './intent-parser';
export type {
  ParsedCommand,
  CommandAction,
  CommandParams,
} from './intent-parser';

// Transaction Explainer
export { TransactionExplainer, createTransactionExplainer } from './transaction-explainer';
export type {
  TransactionData,
  TransactionType,
  DecodedTransaction,
  TransactionExplanation,
} from './transaction-explainer';

// Spending Advisor
export { SpendingAdvisor, createSpendingAdvisor } from './spending-advisor';
export type {
  SpendingData,
  TransactionRecord,
  BudgetInfo,
  SpendingAnalysis,
  SpendingAdvice,
  BudgetStatus,
} from './spending-advisor';

// Types
export type {
  GeminiConfig,
  GeminiFunctionResponse,
  InvoiceAnalysis,
  ReceiptAnalysis,
  DeliveryProofAnalysis,
  PaymentImageAnalysis,
  AICommandResult,
} from './types';
