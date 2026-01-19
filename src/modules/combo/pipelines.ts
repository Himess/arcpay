/**
 * Combo Pipelines - Combined workflows using multiple modules
 */

import { PaymentStream } from '../streaming';
import type { StreamableResponse, StreamConfig } from '../streaming';
import { IntentExecutor } from '../intent';
import type { Intent } from '../intent';
import { PrivacyModule } from '../privacy';
import type { PrivatePaymentResult, StealthAddress } from '../privacy';

/**
 * Combo pipeline configuration
 */
export interface ComboPipelineConfig {
  /** Wallet private key */
  privateKey: string;
}

/**
 * Intent + Stream result
 */
export interface IntentStreamResult {
  /** Parsed intent */
  intent: Intent;
  /** Created stream (if applicable) */
  stream: StreamableResponse<string> | null;
  /** Stream config used */
  streamConfig?: StreamConfig;
}

/**
 * Intent + Privacy result
 */
export interface IntentPrivateResult {
  /** Parsed intent */
  intent: Intent;
  /** Private payment result (if applicable) */
  privateResult: PrivatePaymentResult | null;
  /** Whether privacy was applied */
  isPrivate: boolean;
}

/**
 * Stream + Privacy result
 */
export interface PrivateStreamResult {
  /** Created stream */
  stream: StreamableResponse<string>;
  /** Stealth address for settlements */
  stealthAddress: string;
  /** Ephemeral public key */
  ephemeralPubKey: string;
}

/**
 * Full combo result
 */
export interface FullComboResult {
  /** Parsed intent */
  intent: Intent;
  /** Created stream */
  stream: StreamableResponse<string>;
  /** Whether privacy was applied */
  isPrivate: boolean;
  /** Stealth info (if private) */
  stealthInfo: StealthAddress | null;
}

/**
 * Combo Pipelines - Combined module workflows
 *
 * Provides high-level APIs that combine streaming, intent,
 * and privacy modules for common use cases.
 */
export class ComboPipelines {
  private stream: PaymentStream;
  private intent: IntentExecutor;
  private privacy: PrivacyModule;

  constructor(config: ComboPipelineConfig) {
    this.stream = new PaymentStream(config.privateKey);
    this.intent = new IntentExecutor({ privateKey: config.privateKey });
    this.privacy = new PrivacyModule({ privateKey: config.privateKey });
  }

  /**
   * COMBO 1: Intent + Streaming
   *
   * Parse natural language command and create a payment stream.
   *
   * @param command - Natural language command (e.g., "stream $0.001 per token to api.com max $5")
   * @returns Intent result and created stream
   *
   * @example
   * ```typescript
   * const { intent, stream } = await combo.intentStream(
   *   "stream $0.0001 per token to api.llm.com max $5"
   * );
   *
   * if (stream) {
   *   for await (const token of stream) {
   *     console.log(token);
   *   }
   * }
   * ```
   */
  async intentStream(command: string): Promise<IntentStreamResult> {
    const intentResult = await this.intent.execute(command);

    // Check if intent is for streaming
    if (
      !intentResult.result?.success ||
      intentResult.parsed.action !== 'stream'
    ) {
      return { intent: intentResult, stream: null };
    }

    const params = intentResult.parsed.params;

    if (!params.service || !params.amount) {
      return { intent: intentResult, stream: null };
    }

    const streamConfig: StreamConfig = {
      endpoint: params.service,
      rate: {
        amount: params.amount,
        per: (params.frequency as 'token' | 'second' | 'request' | 'kb') || 'token',
      },
      budget: {
        max: params.maxPrice || '10.00',
      },
    };

    const stream = await this.stream.createStream(streamConfig);

    return {
      intent: intentResult,
      stream,
      streamConfig,
    };
  }

  /**
   * COMBO 2: Intent + Privacy
   *
   * Parse natural language command and apply privacy if requested.
   * Keywords like "privately", "stealth", "hidden", "secret" trigger privacy.
   *
   * @param command - Natural language command
   * @returns Intent result and private payment result
   *
   * @example
   * ```typescript
   * const { intent, privateResult } = await combo.intentPrivate(
   *   "send $100 privately to st:arc:0x..."
   * );
   * ```
   */
  async intentPrivate(command: string): Promise<IntentPrivateResult> {
    // Check for privacy keywords
    const isPrivate = /privat|stealth|hidden|secret/i.test(command);

    // Parse intent
    const intentResult = await this.intent.execute(command);

    // Only apply privacy to send actions
    if (intentResult.parsed.action !== 'send' || !isPrivate) {
      return {
        intent: intentResult,
        privateResult: null,
        isPrivate: false,
      };
    }

    const params = intentResult.parsed.params;

    if (!params.recipient || !params.amount) {
      return {
        intent: intentResult,
        privateResult: null,
        isPrivate: false,
      };
    }

    // Execute private payment
    const privateResult = await this.privacy.sendPrivate({
      to: params.recipient,
      amount: params.amount,
    });

    return {
      intent: intentResult,
      privateResult,
      isPrivate: true,
    };
  }

  /**
   * COMBO 3: Stream + Privacy
   *
   * Create a streaming payment session with stealth address settlements.
   *
   * @param config - Private stream configuration
   * @returns Stream and stealth address info
   *
   * @example
   * ```typescript
   * const { stream, stealthAddress, ephemeralPubKey } = await combo.privateStream({
   *   recipientMetaAddress: 'st:arc:0x...',
   *   endpoint: 'https://api.llm.com/generate',
   *   ratePerToken: '0.0001',
   *   maxBudget: '5.00'
   * });
   * ```
   */
  async privateStream(config: {
    recipientMetaAddress: string;
    endpoint: string;
    ratePerToken: string;
    maxBudget: string;
  }): Promise<PrivateStreamResult> {
    // Generate stealth address for settlements
    const stealth = this.privacy.generateReceiveAddress();

    // Create stream
    const stream = await this.stream.createStream({
      endpoint: config.endpoint,
      rate: { amount: config.ratePerToken, per: 'token' },
      budget: { max: config.maxBudget },
    });

    return {
      stream,
      stealthAddress: stealth.address,
      ephemeralPubKey: stealth.ephemeralPubKey,
    };
  }

  /**
   * COMBO 4: Intent + Stream + Privacy (FULL)
   *
   * Parse natural language, create stream, optionally with privacy.
   *
   * @param command - Natural language command
   * @returns Full combo result
   *
   * @example
   * ```typescript
   * const result = await combo.fullCombo(
   *   "privately stream $0.0001 per token to api.com max $1"
   * );
   *
   * for await (const token of result.stream) {
   *   console.log(token);
   * }
   *
   * if (result.isPrivate) {
   *   console.log('Stealth address:', result.stealthInfo?.address);
   * }
   * ```
   */
  async fullCombo(command: string): Promise<FullComboResult> {
    // Check for privacy keywords
    const isPrivate = /privat|stealth|hidden|secret/i.test(command);

    // Parse intent
    const intentResult = await this.intent.execute(command);

    if (intentResult.parsed.action !== 'stream') {
      throw new Error(
        'Full combo requires a stream intent. Use commands like "stream $X per token to endpoint max $Y"'
      );
    }

    const params = intentResult.parsed.params;

    if (!params.service || !params.amount) {
      throw new Error('Missing service or amount in stream intent');
    }

    // Generate stealth address if private
    let stealthInfo: StealthAddress | null = null;
    if (isPrivate) {
      stealthInfo = this.privacy.generateReceiveAddress();
    }

    // Create stream
    const stream = await this.stream.createStream({
      endpoint: params.service,
      rate: {
        amount: params.amount,
        per: (params.frequency as 'token' | 'second' | 'request' | 'kb') || 'token',
      },
      budget: { max: params.maxPrice || '10.00' },
    });

    return {
      intent: intentResult,
      stream,
      isPrivate,
      stealthInfo,
    };
  }

  /**
   * Get access to individual modules
   *
   * @returns Object containing stream, intent, and privacy modules
   */
  getModules(): {
    stream: PaymentStream;
    intent: IntentExecutor;
    privacy: PrivacyModule;
  } {
    return {
      stream: this.stream,
      intent: this.intent,
      privacy: this.privacy,
    };
  }

  /**
   * Get the stealth meta-address for receiving private payments
   */
  getStealthMetaAddress(): string {
    return this.privacy.getStealthMetaAddress();
  }

  /**
   * Get help with available commands
   */
  getHelp(): string[] {
    return [
      ...this.intent.getHelp(),
      '',
      'Privacy modifiers: Add "privately", "stealth", "hidden", or "secret" to enable privacy',
      '',
      'Combo examples:',
      '  - "privately stream $0.001 per token to api.com max $5"',
      '  - "send $100 secretly to st:arc:0x..."',
    ];
  }
}

/**
 * Create a combo pipelines instance
 *
 * @param config - Pipeline configuration
 * @returns ComboPipelines instance
 *
 * @example
 * ```typescript
 * const combo = createComboPipelines({ privateKey });
 *
 * // Intent + Stream
 * await combo.intentStream("stream $0.001 per token to api.llm.com max $5");
 *
 * // Intent + Privacy
 * await combo.intentPrivate("send $100 privately to st:arc:0x...");
 *
 * // Stream + Privacy
 * await combo.privateStream({ ... });
 *
 * // Full combo
 * await combo.fullCombo("privately stream $0.0001/token to api.com max $1");
 * ```
 */
export function createComboPipelines(config: ComboPipelineConfig): ComboPipelines {
  return new ComboPipelines(config);
}
