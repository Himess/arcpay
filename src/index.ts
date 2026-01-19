/**
 * ArcPay SDK
 *
 * Unified TypeScript SDK for Arc blockchain featuring:
 * - Micropayments: x402 protocol for pay-per-use APIs
 * - Paymaster: Gas sponsorship for your users
 * - USYC: Yield-bearing token operations
 * - Bridge: Cross-chain USDC transfers via CCTP
 * - Gateway: Unified USDC balance across chains
 * - FX: Stablecoin swaps (USDC ↔ EURC)
 * - Agent: Autonomous AI agent payment engine
 * - Streaming: Real-time per-token/per-second payments
 * - Intent: Natural language payment commands
 * - Privacy: Stealth address payments
 * - Combo: Combined workflows
 *
 * @example
 * ```typescript
 * import { ArcPay } from 'arcpay';
 *
 * // Initialize client
 * const arc = await ArcPay.init({
 *   network: 'arc-testnet',
 *   privateKey: process.env.PRIVATE_KEY, // optional for read-only
 * });
 *
 * // Basic operations
 * const balance = await arc.getBalance();
 * await arc.sendUSDC('0x...', '10.00');
 *
 * // Micropayments (x402)
 * const data = await arc.micropayments.pay('https://api.example.com/premium');
 *
 * // Bridge to another chain
 * await arc.bridge.transfer({ to: 'base-sepolia', amount: '100' });
 *
 * // Gateway unified balance
 * const unified = await arc.gateway.getUnifiedBalance();
 *
 * // FX swap
 * const quote = await arc.fx.getQuote({ from: 'USDC', to: 'EURC', amount: '1000' });
 *
 * // USYC yield
 * await arc.usyc.subscribe('1000'); // Deposit USDC, get USYC
 * const yieldInfo = await arc.usyc.getBalance();
 * ```
 *
 * @packageDocumentation
 */

// Main client
export { ArcPay } from './core/client';

// Core types and config
export type {
  ArcPayConfig,
  TransactionResult,
  BalanceInfo,
  TokenType,
  Address,
  Hex,
} from './core/types';

export type { NetworkConfig, NetworkName } from './core/config';
export { NETWORKS, getNetwork } from './core/config';

// Micropayments module
export { MicropaymentsModule, MicropaymentBuyer } from './modules/micropayments';
export type {
  PaywallConfig,
  PaywallRoute,
  PaymentResult,
  PaymentOptions,
} from './modules/micropayments';

// Paymaster module
export { PaymasterModule, GasSponsor } from './modules/paymaster';
export type {
  SpendingRules,
  SponsorRequest,
  SponsorResult,
  UserSpendingStats,
  PaymasterStats,
} from './modules/paymaster';

// USYC module
export { USYCModule, USYCOperations } from './modules/usyc';
export type {
  USYCBalance,
  SubscribeResult,
  RedeemResult,
  USYCOperationOptions,
  USYCStatus,
} from './modules/usyc';

// Bridge module
export { BridgeModule } from './modules/bridge';
export type {
  SupportedChain,
  BridgeTransferParams,
  BridgeTransferResult,
  BridgeStatusResult,
  BridgeEvent,
  ChainInfo,
} from './modules/bridge';

// Gateway module
export { GatewayModule, GatewayMicropay } from './modules/gateway';
export type {
  UnifiedBalance,
  GatewayDepositParams,
  GatewayDepositResult,
  GatewayWithdrawParams,
  GatewayWithdrawResult,
  GatewayInfo,
  GatewayDomain,
  MicropayOptions,
  MicropayResult,
  CrosschainPayOptions,
  CrosschainPayResult,
} from './modules/gateway';
export { GATEWAY_DOMAINS } from './modules/gateway';

// FX module
export { FXModule } from './modules/fx';
export type {
  FXCurrency,
  FXPair,
  FXQuoteParams,
  FXQuote,
  FXSwapParams,
  FXSwapResult,
  FXConfig,
} from './modules/fx';
export { SUPPORTED_PAIRS, CURRENCY_ADDRESSES, FX_CONTRACTS } from './modules/fx';

// Agent module
export { Agent, createAgent, PolicyEngine, AutoPayHandler, TreasuryManager } from './modules/agent';
export type {
  AgentPolicy,
  AgentConfig,
  AgentState,
  AutoPayOptions,
  AutoPayResult,
  TreasuryStats,
  TransactionRecord,
  PolicyCheckResult,
} from './modules/agent';

// Streaming module (WOW Feature)
export { PaymentStream, createPaymentStream, UsageMeter, StreamSettlement } from './modules/streaming';
export type {
  StreamConfig,
  StreamSession,
  SettlementRecord,
  StreamEvents,
  StreamableResponse,
  MeteredRequestOptions,
  MeteredRequestResult,
} from './modules/streaming';

// Intent module (WOW Feature)
export { IntentExecutor, createIntentEngine, IntentParser } from './modules/intent';
export type {
  Intent,
  ParsedIntent,
  IntentAction,
  IntentParams,
  IntentResult,
  IntentTemplate,
  IntentEngineConfig,
} from './modules/intent';
export { builtInTemplates, getTemplates, getAllExamples } from './modules/intent';

// Privacy module (WOW Feature)
export { PrivacyModule, createPrivacyModule, StealthAddressGenerator } from './modules/privacy';
export type {
  StealthKeyPair,
  StealthAddress,
  StealthPayment,
  EncryptedMemo,
  PrivacyConfig,
  SendPrivateOptions,
  PrivatePaymentResult,
  ClaimResult,
  ScanResult,
} from './modules/privacy';

// Combo module (WOW Feature)
export { ComboPipelines, createComboPipelines } from './modules/combo';
export type {
  ComboPipelineConfig,
  IntentStreamResult,
  IntentPrivateResult,
  PrivateStreamResult,
  FullComboResult,
} from './modules/combo';

// Gas Station module (Circle-style gas sponsorship)
export { GasStation, createGasStation } from './modules/gas-station';
export type {
  GasStationConfig,
  GasSponsorPolicy,
  GasSponsorshipRequest,
  GasSponsorshipResult,
  UserGasStats,
  GasStationStats,
  RelayerTransaction,
  ForwarderRequest,
} from './modules/gas-station';

// Smart Wallet module (ERC-4337 Account Abstraction)
export { SmartWallet, createSmartWallet } from './modules/smart-wallet';
export type {
  SmartWalletConfig,
  SmartWalletInfo,
  UserOperation,
  UserOperationResult,
  BatchOperation,
  SmartWalletTxOptions,
  SessionKeyConfig,
  SessionKeyInfo,
  RecoveryConfig,
  RecoveryRequest,
  PaymasterData,
  UserOperationReceipt,
} from './modules/smart-wallet';

// Payment Channels module (x402 Channel Scheme)
export { PaymentChannelManager, createPaymentChannelManager } from './modules/channels';
export type {
  ChannelConfig,
  CreateChannelParams,
  PaymentChannel,
  SignedPayment,
  PaymentRequest,
  PaymentReceipt,
  SettlementResult as ChannelSettlementResult,
  DisputeResult,
  ChannelStats,
  X402ChannelHeader,
  AutoTopupConfig,
  AutoTopupStatus,
  BatchPaymentItem,
  BatchPaymentReceipt,
  ExtendedChannelStats,
} from './modules/channels';

// AI Wallet module (Intelligent Payment Wallet)
export { AIWallet, createAIWallet } from './modules/ai-wallet';
export type {
  AIWalletConfig,
  ConversationContext,
  ConversationMessage,
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
} from './modules/ai-wallet';

// Compliance module (KYC/AML/Sanctions)
export { ComplianceModule, createComplianceModule } from './modules/compliance';
export type {
  ComplianceConfig,
  ComplianceProfile,
  CheckResult,
  ComplianceFlag,
  SanctionsCheckResult,
  TransactionScreeningRequest,
  TransactionScreeningResult,
  TravelRuleData,
  ComplianceReport,
  WhitelistEntry,
  BlacklistEntry,
  VelocityCheckResult,
  PatternDetectionResult,
} from './modules/compliance';

// Escrow module (Multi-party Conditional Payments)
export { EscrowManager, createEscrowManager, MultisigEscrowManager, createMultisigEscrow } from './modules/escrow';
export type {
  EscrowConfig,
  CreateEscrowParams,
  Escrow,
  EscrowState,
  ReleaseCondition,
  Dispute,
  Milestone,
  MultiPartyEscrow,
  PartyInfo,
  DistributionRule,
  EscrowResult,
  FundResult,
  ReleaseResult,
  RefundResult,
  EscrowStats,
  MultisigSigner,
  MultisigEscrowConfig,
  MultisigEscrow,
  MultisigState,
  MultisigApproval,
  ApprovalResult,
} from './modules/escrow';

// Utilities
export * from './utils/errors';
export * from './utils/validation';
export { USDC_DECIMALS, EURC_DECIMALS, USYC_DECIMALS, ERC20_ABI } from './utils/constants';

// Retry & Resilience utilities
export {
  retry,
  simpleRetry,
  withTimeout,
  withRetry,
  batchExecute,
  debounce,
  throttle,
  calculateDelay,
  sleep,
  CircuitBreaker,
  FallbackRPCManager,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
} from './utils/retry';
export type {
  RetryConfig,
  SimpleRetryConfig,
  CircuitState,
  CircuitBreakerConfig,
  FallbackRPCConfig,
} from './utils/retry';

// Event system
export {
  EventEmitter,
  EventType,
  globalEventEmitter,
  TransactionWatcher,
  StreamWatcher,
  createEvent,
} from './utils/events';
export type {
  BaseEvent,
  TransactionEventData,
  StreamEventData,
  ChannelEventData,
  EscrowEventData,
  SystemEventData,
  ArcPayEvent,
  EventHandler,
  EventFilter,
  Subscription,
  SubscriptionOptions,
  WebhookConfig,
} from './utils/events';

// Logging
export {
  Logger,
  defaultLogger,
  loggers,
  createLogger,
} from './utils/logger';
export type {
  LogLevel,
  LoggerConfig,
} from './utils/logger';

// Webhook Notifications
export {
  WebhookManager,
  createWebhookManager,
  getGlobalWebhookManager,
} from './utils/webhooks';
export type {
  WebhookEventType,
  WebhookPayload,
  WebhookEndpoint,
  WebhookDelivery,
  WebhookManagerConfig,
  WebhookStats,
} from './utils/webhooks';

// Analytics Dashboard
export {
  Analytics,
  createAnalytics,
  getGlobalAnalytics,
} from './utils/analytics';
export type {
  AnalyticsEvent,
  AnalyticsCategory,
  TimeSeriesPoint,
  Metric,
  Dashboard,
  AnalyticsConfig,
} from './utils/analytics';

// Rate Limiting
export {
  RateLimiter,
  RateLimitError,
  createRateLimiter,
  rateLimit,
} from './utils/rate-limit';
export type {
  RateLimitConfig,
  RateLimitState,
  RateLimitResult,
} from './utils/rate-limit';

// Caching
export {
  Cache,
  BalanceCache,
  ContractCache,
  balanceCache,
  contractCache,
  createCache,
  createBalanceCache,
  createContractCache,
} from './utils/cache';
export type {
  CacheEntry,
  CacheConfig,
  CacheStats,
} from './utils/cache';

// Contract addresses and ABIs
export {
  CONTRACT_ADDRESSES,
  getContractAddresses,
  areContractsDeployed,
  ESCROW_ABI,
  PAYMENT_CHANNEL_ABI,
  STEALTH_REGISTRY_ABI,
  STREAM_PAYMENT_ABI,
  AGENT_REGISTRY_ABI,
} from './contracts';
export type { ContractAddresses } from './contracts';

// Stream Payments module (Real-time salary/subscription streaming)
export { StreamManager, createStreamManager } from './modules/streams';
export type {
  StreamConfig as StreamPaymentConfig,
  Stream,
  StreamState,
  CreateStreamParams,
  ClaimResult as StreamClaimResult,
  CancelResult as StreamCancelResult,
  StreamStats,
} from './modules/streams';

// ==================================================
// 🚀 NEW: AI Agent SDK for Autonomous Commerce
// ==================================================
export { ArcPayAgent, createAgent as createArcAgent, OnchainAgentManager, createOnchainAgentManager } from './agent';
export type {
  AgentConfig as ArcPayAgentConfig,
  BudgetConfig,
  TaskConfig,
  Task,
  ServicePayment,
  StreamConfig as AgentStreamConfig,
  SpendingReport,
  OnchainAgentConfig,
  OnchainAgentInfo,
  OnchainTxResult,
  RegisterAgentParams,
  ExecutePaymentParams,
} from './agent';

// ==================================================
// ⚡ NEW: One-liner Simple API
// ==================================================
export {
  configure,
  pay,
  balance,
  escrow as simpleEscrow,
  releaseEscrow,
  refundEscrow,
  stream,
  claimStream,
  cancelStream,
  openChannel,
  channelPay,
  closeChannel,
  getStealthAddress,
  payPrivate,
  // Contact one-liners
  addContact,
  getContact,
  listContacts,
  deleteContact,
  resolveContact,
  searchContacts,
} from './simple';

// ==================================================
// ⚛️ React Hooks (separate package)
// ==================================================
// React hooks are available in src/react/index.ts
// To use, copy the file to your React project or
// import the hooks directly from the source.
//
// Available hooks:
// - useArcPay: Main hook for payments and balance
// - useEscrow: Escrow management
// - useStream: Streaming payments
// - useChannel: Payment channels
// - usePrivacy: Stealth address payments
// - useAgent: AI Agent functionality

// Note: Client alias for compatibility
export { ArcPayClient as ArcClient } from './core/client';

// ==================================================
// 📅 Subscription Manager (Recurring Payments)
// ==================================================
export { SubscriptionManager, createSubscriptionManager } from './modules/subscriptions';
export type {
  Subscription as RecurringSubscription,
  SubscriptionPlan,
  SubscriptionPayment,
  SubscriptionStatus,
  BillingPeriod,
  SubscriptionManagerConfig,
  CreateSubscriptionParams,
  CreatePlanParams,
} from './modules/subscriptions';

// ==================================================
// 🧾 Invoice System (Create & Track Invoices)
// ==================================================
export { InvoiceManager, createInvoiceManager } from './modules/invoices';
export type {
  Invoice,
  InvoiceLineItem,
  InvoiceRecipient,
  InvoiceStatus,
  InvoiceManagerConfig,
  CreateInvoiceParams,
  PayInvoiceParams,
  PayInvoiceResult,
  InvoiceReminder,
  InvoiceStats,
} from './modules/invoices';

// ==================================================
// 📇 Contact Manager (Address Aliases & Contacts)
// ==================================================
export { ContactManager, createContactManager, getGlobalContactManager } from './modules/contacts';
export { MemoryStorage, LocalStorageAdapter, FileStorage, createStorage } from './modules/contacts';
export type {
  Contact,
  ContactMetadata,
  ContactCategory,
  ContactManagerConfig,
  ContactSearchOptions,
  FuzzyMatchResult,
  StorageAdapter,
} from './modules/contacts';

// ==================================================
// 📋 Payment Templates (Netflix, Spotify, etc.)
// ==================================================
export {
  TemplateManager,
  createTemplateManager,
  getGlobalTemplateManager,
  ALL_TEMPLATES,
  SUBSCRIPTION_TEMPLATES,
  BUSINESS_TEMPLATES,
  PERSONAL_TEMPLATES,
  UTILITY_TEMPLATES,
  getTemplateById,
  searchTemplates,
} from './modules/templates';
export type {
  PaymentTemplate,
  UseTemplateOptions,
  TemplateManagerConfig,
  TemplateCategory,
  TemplateListOptions,
} from './modules/templates';

// ==================================================
// ➗ Split Payment (Bill Splitting)
// ==================================================
export {
  SplitManager,
  createSplitManager,
  splitPayment as splitPaymentFn,
  splitCustom as splitCustomFn,
} from './modules/split';
export type {
  SplitRecipient,
  SplitRecipientResult,
  SplitResult,
  SplitCalculation,
  SplitPaymentOptions,
  SplitManagerConfig,
} from './modules/split';

// ==================================================
// 🔗 Payment Links (Shareable URLs)
// ==================================================
export {
  PaymentLinkManager,
  createLinkManager,
  createPaymentLink as createPaymentLinkFn,
  payLink as payLinkFn,
} from './modules/links';
export type {
  PaymentLink,
  PaymentLinkStatus,
  LinkPayment,
  CreateLinkOptions,
  ListLinksOptions,
  LinkManagerConfig,
} from './modules/links';

// ==================================================
// 📩 Payment Requests (Request Money)
// ==================================================
export {
  PaymentRequestManager,
  createRequestManager,
  requestPayment as requestPaymentFn,
  requestPaymentFrom as requestPaymentFromFn,
} from './modules/requests';
export type {
  PaymentRequest as MoneyRequest,
  PaymentRequestStatus as MoneyRequestStatus,
  RequestParty,
  CreateRequestOptions,
  CreateBulkRequestOptions,
  ListRequestsOptions,
  RequestManagerConfig,
} from './modules/requests';

// ==================================================
// 🤖 NEW: AI Module (Gemini 3.0 Flash Function Calling)
// ==================================================
export {
  GeminiClient,
  createGeminiClient,
  MultimodalAnalyzer,
  createMultimodalAnalyzer,
  AIAgent,
  createAIAgent,
  ARCPAY_FUNCTIONS,
  getFunctionByName,
  CommandParser,
  createCommandParser,
  TransactionExplainer,
  createTransactionExplainer,
  SpendingAdvisor,
  createSpendingAdvisor,
} from './ai';
export type {
  GeminiConfig,
  GeminiFunctionResponse,
  InvoiceAnalysis,
  ReceiptAnalysis,
  DeliveryProofAnalysis,
  PaymentImageAnalysis,
  AICommandResult,
  AIAgentConfig,
  FunctionDeclaration,
  ParsedCommand,
  CommandAction,
  CommandParams,
  TransactionData,
  TransactionType,
  TransactionExplanation,
  SpendingData,
  SpendingAnalysis,
  SpendingAdvice,
  BudgetStatus,
} from './ai';

// ==================================================
// 🎤 NEW: Voice Module (Speech Recognition & Synthesis)
// ==================================================
export {
  SpeechRecognizer,
  createSpeechRecognizer,
  SpeechSynthesizer,
  createSpeechSynthesizer,
  VoiceEnabledAgent,
  createVoiceAgent,
} from './voice';
export type {
  SpeechRecognitionConfig,
  SpeechRecognitionResult,
  SpeechSynthesisConfig,
  VoiceAgentConfig,
  VoiceCommandResult,
  VoiceEnabledAgentConfig,
} from './voice';
