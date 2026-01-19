/**
 * Event Emitter System
 *
 * Features:
 * - Type-safe event emission and handling
 * - Async event handlers
 * - Event filtering and transformation
 * - Event history/replay
 * - Webhook notifications
 * - WebSocket support
 */

import { ArcPayError, ErrorCodes } from './errors';

/**
 * Event types for ArcPay SDK
 */
export enum EventType {
  // Transaction events
  TRANSACTION_PENDING = 'transaction:pending',
  TRANSACTION_CONFIRMED = 'transaction:confirmed',
  TRANSACTION_FAILED = 'transaction:failed',

  // Stream events
  STREAM_CREATED = 'stream:created',
  STREAM_STARTED = 'stream:started',
  STREAM_PAUSED = 'stream:paused',
  STREAM_RESUMED = 'stream:resumed',
  STREAM_CANCELLED = 'stream:cancelled',
  STREAM_COMPLETED = 'stream:completed',
  STREAM_CLAIMED = 'stream:claimed',

  // Payment channel events
  CHANNEL_OPENED = 'channel:opened',
  CHANNEL_PAYMENT = 'channel:payment',
  CHANNEL_CLOSING = 'channel:closing',
  CHANNEL_CLOSED = 'channel:closed',
  CHANNEL_DISPUTED = 'channel:disputed',

  // Escrow events
  ESCROW_CREATED = 'escrow:created',
  ESCROW_FUNDED = 'escrow:funded',
  ESCROW_RELEASED = 'escrow:released',
  ESCROW_REFUNDED = 'escrow:refunded',
  ESCROW_DISPUTED = 'escrow:disputed',
  ESCROW_RESOLVED = 'escrow:resolved',

  // Smart wallet events
  WALLET_CREATED = 'wallet:created',
  WALLET_DEPLOYED = 'wallet:deployed',
  WALLET_OPERATION = 'wallet:operation',

  // Gas station events
  GAS_SPONSORED = 'gas:sponsored',
  GAS_POLICY_CREATED = 'gas:policy:created',
  GAS_POLICY_UPDATED = 'gas:policy:updated',

  // Intent events
  INTENT_CREATED = 'intent:created',
  INTENT_EXECUTED = 'intent:executed',
  INTENT_FAILED = 'intent:failed',

  // Privacy events
  STEALTH_ADDRESS_GENERATED = 'stealth:address:generated',
  STEALTH_PAYMENT_SENT = 'stealth:payment:sent',
  STEALTH_PAYMENT_RECEIVED = 'stealth:payment:received',

  // Compliance events
  KYC_SUBMITTED = 'kyc:submitted',
  KYC_APPROVED = 'kyc:approved',
  KYC_REJECTED = 'kyc:rejected',
  SANCTIONS_CHECK = 'sanctions:check',

  // System events
  CONNECTION_ESTABLISHED = 'system:connected',
  CONNECTION_LOST = 'system:disconnected',
  ERROR = 'system:error',
}

/**
 * Base event interface
 */
export interface BaseEvent {
  id: string;
  type: EventType;
  timestamp: number;
  source: string;
  data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Transaction event data
 */
export interface TransactionEventData extends BaseEvent {
  type:
    | EventType.TRANSACTION_PENDING
    | EventType.TRANSACTION_CONFIRMED
    | EventType.TRANSACTION_FAILED;
  data: {
    hash: string;
    from: string;
    to: string;
    value: string;
    confirmations?: number;
    blockNumber?: number;
    gasUsed?: string;
    error?: string;
  };
}

/**
 * Stream event data
 */
export interface StreamEventData extends BaseEvent {
  type:
    | EventType.STREAM_CREATED
    | EventType.STREAM_STARTED
    | EventType.STREAM_PAUSED
    | EventType.STREAM_RESUMED
    | EventType.STREAM_CANCELLED
    | EventType.STREAM_COMPLETED
    | EventType.STREAM_CLAIMED;
  data: {
    streamId: string;
    sender: string;
    recipient: string;
    totalAmount: string;
    claimedAmount?: string;
    remainingAmount?: string;
  };
}

/**
 * Channel event data
 */
export interface ChannelEventData extends BaseEvent {
  type:
    | EventType.CHANNEL_OPENED
    | EventType.CHANNEL_PAYMENT
    | EventType.CHANNEL_CLOSING
    | EventType.CHANNEL_CLOSED
    | EventType.CHANNEL_DISPUTED;
  data: {
    channelId: string;
    sender: string;
    recipient: string;
    balance?: string;
    paymentAmount?: string;
    nonce?: number;
  };
}

/**
 * Escrow event data
 */
export interface EscrowEventData extends BaseEvent {
  type:
    | EventType.ESCROW_CREATED
    | EventType.ESCROW_FUNDED
    | EventType.ESCROW_RELEASED
    | EventType.ESCROW_REFUNDED
    | EventType.ESCROW_DISPUTED
    | EventType.ESCROW_RESOLVED;
  data: {
    escrowId: string;
    depositor: string;
    beneficiary: string;
    arbiter?: string;
    amount: string;
    reason?: string;
  };
}

/**
 * System event data
 */
export interface SystemEventData extends BaseEvent {
  type: EventType.CONNECTION_ESTABLISHED | EventType.CONNECTION_LOST | EventType.ERROR;
  data: {
    message: string;
    code?: number;
    details?: Record<string, unknown>;
  };
}

/**
 * Union type for all events
 */
export type ArcPayEvent =
  | TransactionEventData
  | StreamEventData
  | ChannelEventData
  | EscrowEventData
  | SystemEventData
  | BaseEvent;

/**
 * Event handler function type
 */
export type EventHandler<T extends BaseEvent = BaseEvent> = (event: T) => void | Promise<void>;

/**
 * Event filter function type
 */
export type EventFilter<T extends BaseEvent = BaseEvent> = (event: T) => boolean;

/**
 * Subscription options
 */
export interface SubscriptionOptions {
  /** Filter events before handler is called */
  filter?: EventFilter;
  /** Only receive events once */
  once?: boolean;
  /** Priority (higher = called first) */
  priority?: number;
  /** Timeout for async handlers */
  timeout?: number;
}

/**
 * Subscription handle
 */
export interface Subscription {
  id: string;
  eventType: EventType | '*';
  unsubscribe: () => void;
}

/**
 * Webhook configuration
 */
export interface WebhookConfig {
  url: string;
  secret?: string;
  events: EventType[];
  headers?: Record<string, string>;
  retries?: number;
  timeout?: number;
}

/**
 * Generate unique event ID
 */
function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Generate unique subscription ID
 */
function generateSubscriptionId(): string {
  return `sub_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Event Emitter class
 */
export class EventEmitter {
  private handlers: Map<
    string,
    Array<{
      id: string;
      handler: EventHandler;
      options: SubscriptionOptions;
    }>
  > = new Map();

  private wildcardHandlers: Array<{
    id: string;
    handler: EventHandler;
    options: SubscriptionOptions;
  }> = [];

  private eventHistory: BaseEvent[] = [];
  private maxHistorySize: number = 1000;
  private webhooks: Map<string, WebhookConfig> = new Map();

  constructor(options?: { maxHistorySize?: number }) {
    if (options?.maxHistorySize) {
      this.maxHistorySize = options.maxHistorySize;
    }
  }

  /**
   * Subscribe to events
   */
  on<T extends BaseEvent>(
    eventType: EventType | '*',
    handler: EventHandler<T>,
    options: SubscriptionOptions = {}
  ): Subscription {
    const subscriptionId = generateSubscriptionId();

    const handlerEntry = {
      id: subscriptionId,
      handler: handler as EventHandler,
      options: { priority: 0, ...options },
    };

    if (eventType === '*') {
      this.wildcardHandlers.push(handlerEntry);
      this.sortHandlersByPriority(this.wildcardHandlers);
    } else {
      if (!this.handlers.has(eventType)) {
        this.handlers.set(eventType, []);
      }
      this.handlers.get(eventType)!.push(handlerEntry);
      this.sortHandlersByPriority(this.handlers.get(eventType)!);
    }

    return {
      id: subscriptionId,
      eventType,
      unsubscribe: () => this.off(eventType, subscriptionId),
    };
  }

  /**
   * Subscribe to events (once)
   */
  once<T extends BaseEvent>(
    eventType: EventType | '*',
    handler: EventHandler<T>,
    options: SubscriptionOptions = {}
  ): Subscription {
    return this.on(eventType, handler, { ...options, once: true });
  }

  /**
   * Unsubscribe from events
   */
  off(eventType: EventType | '*', subscriptionId: string): boolean {
    if (eventType === '*') {
      const index = this.wildcardHandlers.findIndex((h) => h.id === subscriptionId);
      if (index !== -1) {
        this.wildcardHandlers.splice(index, 1);
        return true;
      }
    } else {
      const handlers = this.handlers.get(eventType);
      if (handlers) {
        const index = handlers.findIndex((h) => h.id === subscriptionId);
        if (index !== -1) {
          handlers.splice(index, 1);
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Emit an event
   */
  async emit(eventType: EventType, data: Omit<BaseEvent, 'id' | 'timestamp'>): Promise<void> {
    const event: BaseEvent = {
      id: generateEventId(),
      timestamp: Date.now(),
      ...data,
      type: eventType,
    };

    // Store in history
    this.addToHistory(event);

    // Get handlers for this event type
    const typeHandlers = this.handlers.get(eventType) || [];
    const allHandlers = [...typeHandlers, ...this.wildcardHandlers];

    // Track handlers to remove (once handlers)
    const toRemove: Array<{ eventType: EventType | '*'; id: string }> = [];

    // Execute handlers
    await Promise.all(
      allHandlers.map(async ({ id, handler, options }) => {
        // Apply filter
        if (options.filter && !options.filter(event)) {
          return;
        }

        try {
          // Execute with timeout if specified
          if (options.timeout) {
            await Promise.race([
              handler(event),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Handler timeout')), options.timeout)
              ),
            ]);
          } else {
            await handler(event);
          }

          // Mark for removal if once
          if (options.once) {
            const handlerEventType = this.wildcardHandlers.some((h) => h.id === id)
              ? '*'
              : eventType;
            toRemove.push({ eventType: handlerEventType, id });
          }
        } catch (error) {
          console.error(`Event handler error for ${eventType}:`, error);
        }
      })
    );

    // Remove once handlers
    for (const { eventType: et, id } of toRemove) {
      this.off(et, id);
    }

    // Send to webhooks
    await this.notifyWebhooks(event);
  }

  /**
   * Emit event synchronously (fire and forget)
   */
  emitSync(eventType: EventType, data: Omit<ArcPayEvent, 'id' | 'timestamp'>): void {
    this.emit(eventType, data).catch((error) => {
      console.error(`Failed to emit event ${eventType}:`, error);
    });
  }

  /**
   * Wait for a specific event
   */
  waitFor<T extends BaseEvent>(
    eventType: EventType,
    filter?: EventFilter<T>,
    timeout?: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      let timeoutId: ReturnType<typeof setTimeout> | undefined;

      const subscription = this.once<T>(
        eventType,
        (event) => {
          if (timeoutId) clearTimeout(timeoutId);
          resolve(event);
        },
        { filter: filter as EventFilter }
      );

      if (timeout) {
        timeoutId = setTimeout(() => {
          subscription.unsubscribe();
          reject(
            new ArcPayError(
              `Timeout waiting for event ${eventType}`,
              ErrorCodes.OPERATION_TIMEOUT,
              'NETWORK',
              { retryable: true }
            )
          );
        }, timeout);
      }
    });
  }

  /**
   * Get event history
   */
  getHistory(options?: {
    eventType?: EventType;
    since?: number;
    limit?: number;
  }): BaseEvent[] {
    let history = [...this.eventHistory];

    if (options?.eventType) {
      history = history.filter((e) => e.type === options.eventType);
    }

    if (options?.since) {
      const since = options.since;
      history = history.filter((e) => e.timestamp >= since);
    }

    if (options?.limit) {
      history = history.slice(-options.limit);
    }

    return history;
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Register a webhook
   */
  registerWebhook(id: string, config: WebhookConfig): void {
    this.webhooks.set(id, config);
  }

  /**
   * Unregister a webhook
   */
  unregisterWebhook(id: string): boolean {
    return this.webhooks.delete(id);
  }

  /**
   * Get all webhooks
   */
  getWebhooks(): Map<string, WebhookConfig> {
    return new Map(this.webhooks);
  }

  /**
   * Get listener count
   */
  listenerCount(eventType?: EventType): number {
    if (eventType) {
      return (this.handlers.get(eventType)?.length || 0) + this.wildcardHandlers.length;
    }

    let count = this.wildcardHandlers.length;
    for (const handlers of this.handlers.values()) {
      count += handlers.length;
    }
    return count;
  }

  /**
   * Remove all listeners
   */
  removeAllListeners(eventType?: EventType): void {
    if (eventType) {
      this.handlers.delete(eventType);
    } else {
      this.handlers.clear();
      this.wildcardHandlers = [];
    }
  }

  private addToHistory(event: BaseEvent): void {
    this.eventHistory.push(event);

    // Trim history if needed
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }
  }

  private sortHandlersByPriority(
    handlers: Array<{
      id: string;
      handler: EventHandler;
      options: SubscriptionOptions;
    }>
  ): void {
    handlers.sort((a, b) => (b.options.priority || 0) - (a.options.priority || 0));
  }

  private async notifyWebhooks(event: BaseEvent): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const [id, config] of this.webhooks) {
      if (!config.events.includes(event.type)) {
        continue;
      }

      promises.push(this.sendWebhook(id, config, event));
    }

    await Promise.allSettled(promises);
  }

  private async sendWebhook(
    id: string,
    config: WebhookConfig,
    event: BaseEvent
  ): Promise<void> {
    const maxRetries = config.retries || 3;
    const timeout = config.timeout || 10000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'X-ArcPay-Event': event.type,
          'X-ArcPay-Delivery': event.id,
          'X-ArcPay-Timestamp': event.timestamp.toString(),
          ...config.headers,
        };

        // Add signature if secret is configured
        if (config.secret) {
          const payload = JSON.stringify(event);
          const signature = await this.signWebhookPayload(payload, config.secret);
          headers['X-ArcPay-Signature'] = signature;
        }

        const response = await fetch(config.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(event),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          return;
        }

        // Non-retryable status codes
        if (response.status >= 400 && response.status < 500) {
          console.error(
            `Webhook ${id} failed with status ${response.status}, not retrying`
          );
          return;
        }

        throw new Error(`Webhook returned status ${response.status}`);
      } catch (error) {
        if (attempt === maxRetries) {
          console.error(`Webhook ${id} failed after ${maxRetries} attempts:`, error);
        } else {
          // Exponential backoff
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt) * 1000)
          );
        }
      }
    }
  }

  private async signWebhookPayload(payload: string, secret: string): Promise<string> {
    // Use Web Crypto API for HMAC-SHA256
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(payload);

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, messageData);
    const hashArray = Array.from(new Uint8Array(signature));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
}

/**
 * Create typed event helper
 */
export function createEvent(
  type: EventType,
  source: string,
  data?: Record<string, unknown>,
  metadata?: Record<string, unknown>
): Omit<BaseEvent, 'id' | 'timestamp'> {
  return {
    type,
    source,
    data,
    metadata,
  };
}

/**
 * Global event emitter instance
 */
export const globalEventEmitter = new EventEmitter();

/**
 * Transaction watcher for monitoring confirmations
 */
export class TransactionWatcher {
  private emitter: EventEmitter;
  private watchedTxs: Map<
    string,
    {
      hash: string;
      requiredConfirmations: number;
      currentConfirmations: number;
      checkInterval: ReturnType<typeof setInterval>;
    }
  > = new Map();

  constructor(emitter: EventEmitter = globalEventEmitter) {
    this.emitter = emitter;
  }

  /**
   * Watch a transaction for confirmations
   */
  watch(
    hash: string,
    options: {
      requiredConfirmations?: number;
      pollIntervalMs?: number;
      getConfirmations: () => Promise<{
        confirmations: number;
        blockNumber?: number;
        gasUsed?: string;
      }>;
      from: string;
      to: string;
      value: string;
    }
  ): void {
    const requiredConfirmations = options.requiredConfirmations || 1;
    const pollInterval = options.pollIntervalMs || 3000;

    // Emit pending event
    this.emitter.emitSync(EventType.TRANSACTION_PENDING, {
      type: EventType.TRANSACTION_PENDING,
      source: 'TransactionWatcher',
      data: {
        hash,
        from: options.from,
        to: options.to,
        value: options.value,
        confirmations: 0,
      },
    });

    const checkInterval = setInterval(async () => {
      try {
        const { confirmations, blockNumber, gasUsed } = await options.getConfirmations();

        const watched = this.watchedTxs.get(hash);
        if (!watched) {
          clearInterval(checkInterval);
          return;
        }

        watched.currentConfirmations = confirmations;

        if (confirmations >= requiredConfirmations) {
          this.emitter.emitSync(EventType.TRANSACTION_CONFIRMED, {
            type: EventType.TRANSACTION_CONFIRMED,
            source: 'TransactionWatcher',
            data: {
              hash,
              from: options.from,
              to: options.to,
              value: options.value,
              confirmations,
              blockNumber,
              gasUsed,
            },
          });

          this.unwatch(hash);
        }
      } catch (error) {
        this.emitter.emitSync(EventType.TRANSACTION_FAILED, {
          type: EventType.TRANSACTION_FAILED,
          source: 'TransactionWatcher',
          data: {
            hash,
            from: options.from,
            to: options.to,
            value: options.value,
            error: error instanceof Error ? error.message : String(error),
          },
        });

        this.unwatch(hash);
      }
    }, pollInterval);

    this.watchedTxs.set(hash, {
      hash,
      requiredConfirmations,
      currentConfirmations: 0,
      checkInterval,
    });
  }

  /**
   * Stop watching a transaction
   */
  unwatch(hash: string): boolean {
    const watched = this.watchedTxs.get(hash);
    if (watched) {
      clearInterval(watched.checkInterval);
      this.watchedTxs.delete(hash);
      return true;
    }
    return false;
  }

  /**
   * Get all watched transactions
   */
  getWatched(): string[] {
    return Array.from(this.watchedTxs.keys());
  }

  /**
   * Stop all watches
   */
  stopAll(): void {
    for (const [hash] of this.watchedTxs) {
      this.unwatch(hash);
    }
  }
}

/**
 * Stream payment watcher
 */
export class StreamWatcher {
  private emitter: EventEmitter;
  private watchedStreams: Map<
    string,
    {
      streamId: string;
      checkInterval: ReturnType<typeof setInterval>;
    }
  > = new Map();

  constructor(emitter: EventEmitter = globalEventEmitter) {
    this.emitter = emitter;
  }

  /**
   * Watch a stream for updates
   */
  watch(
    streamId: string,
    options: {
      pollIntervalMs?: number;
      getStreamState: () => Promise<{
        sender: string;
        recipient: string;
        totalAmount: string;
        claimedAmount: string;
        status: 'active' | 'paused' | 'cancelled' | 'completed';
      }>;
    }
  ): void {
    const pollInterval = options.pollIntervalMs || 5000;
    let lastStatus: string | null = null;

    const checkInterval = setInterval(async () => {
      try {
        const state = await options.getStreamState();

        // Emit event on status change
        if (lastStatus !== state.status) {
          let eventType: EventType;
          switch (state.status) {
            case 'active':
              eventType = lastStatus === 'paused' ? EventType.STREAM_RESUMED : EventType.STREAM_STARTED;
              break;
            case 'paused':
              eventType = EventType.STREAM_PAUSED;
              break;
            case 'cancelled':
              eventType = EventType.STREAM_CANCELLED;
              this.unwatch(streamId);
              break;
            case 'completed':
              eventType = EventType.STREAM_COMPLETED;
              this.unwatch(streamId);
              break;
            default:
              return;
          }

          this.emitter.emitSync(eventType, {
            type: eventType,
            source: 'StreamWatcher',
            data: {
              streamId,
              sender: state.sender,
              recipient: state.recipient,
              totalAmount: state.totalAmount,
              claimedAmount: state.claimedAmount,
              remainingAmount: (
                BigInt(state.totalAmount) - BigInt(state.claimedAmount)
              ).toString(),
            },
          });

          lastStatus = state.status;
        }
      } catch (error) {
        console.error(`Error watching stream ${streamId}:`, error);
      }
    }, pollInterval);

    this.watchedStreams.set(streamId, {
      streamId,
      checkInterval,
    });
  }

  /**
   * Stop watching a stream
   */
  unwatch(streamId: string): boolean {
    const watched = this.watchedStreams.get(streamId);
    if (watched) {
      clearInterval(watched.checkInterval);
      this.watchedStreams.delete(streamId);
      return true;
    }
    return false;
  }

  /**
   * Stop all watches
   */
  stopAll(): void {
    for (const [streamId] of this.watchedStreams) {
      this.unwatch(streamId);
    }
  }
}

export default {
  EventEmitter,
  EventType,
  globalEventEmitter,
  TransactionWatcher,
  StreamWatcher,
  createEvent,
};
