/**
 * Webhook Notifications System
 *
 * Centralized webhook system for real-time notifications.
 *
 * @example
 * ```typescript
 * import { WebhookManager } from 'arcpay';
 *
 * const webhooks = new WebhookManager({
 *   endpoints: [
 *     { url: 'https://my-server.com/webhooks', secret: 'my-secret' }
 *   ]
 * });
 *
 * // Register for specific events
 * webhooks.subscribe('payment.completed', 'https://my-server.com/payments');
 *
 * // Or subscribe to all events
 * webhooks.subscribeAll('https://my-server.com/all-events');
 *
 * // Webhooks are automatically sent when events occur
 * ```
 */

import { createHmac } from 'crypto';

/**
 * Webhook event types
 */
export type WebhookEventType =
  // Payment events
  | 'payment.initiated'
  | 'payment.completed'
  | 'payment.failed'
  // Stream events
  | 'stream.created'
  | 'stream.claimed'
  | 'stream.cancelled'
  | 'stream.completed'
  // Escrow events
  | 'escrow.created'
  | 'escrow.funded'
  | 'escrow.released'
  | 'escrow.refunded'
  | 'escrow.disputed'
  // Subscription events
  | 'subscription.created'
  | 'subscription.renewed'
  | 'subscription.cancelled'
  | 'subscription.payment_failed'
  // Invoice events
  | 'invoice.created'
  | 'invoice.sent'
  | 'invoice.paid'
  | 'invoice.overdue'
  // Channel events
  | 'channel.opened'
  | 'channel.payment'
  | 'channel.closed'
  // Agent events
  | 'agent.work_created'
  | 'agent.work_completed'
  | 'agent.budget_alert'
  // Multisig events
  | 'multisig.created'
  | 'multisig.signed'
  | 'multisig.threshold_met'
  | 'multisig.released'
  // System events
  | 'system.error'
  | 'system.warning';

/**
 * Webhook payload
 */
export interface WebhookPayload {
  /** Event ID */
  id: string;
  /** Event type */
  type: WebhookEventType;
  /** Timestamp */
  timestamp: string;
  /** Event data */
  data: unknown;
  /** Retry attempt number */
  attempt?: number;
}

/**
 * Webhook endpoint configuration
 */
export interface WebhookEndpoint {
  /** Endpoint URL */
  url: string;
  /** Shared secret for HMAC signature */
  secret?: string;
  /** Event types to receive (empty = all) */
  events?: WebhookEventType[];
  /** Is endpoint active */
  active?: boolean;
  /** Custom headers */
  headers?: Record<string, string>;
  /** Timeout in ms */
  timeout?: number;
}

/**
 * Webhook delivery record
 */
export interface WebhookDelivery {
  /** Delivery ID */
  id: string;
  /** Endpoint URL */
  endpoint: string;
  /** Event type */
  eventType: WebhookEventType;
  /** Payload sent */
  payload: WebhookPayload;
  /** HTTP status code */
  statusCode?: number;
  /** Response body */
  response?: string;
  /** Success */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Delivery timestamp */
  deliveredAt: string;
  /** Duration in ms */
  durationMs: number;
  /** Retry count */
  retryCount: number;
}

/**
 * Webhook manager configuration
 */
export interface WebhookManagerConfig {
  /** Default endpoints */
  endpoints?: WebhookEndpoint[];
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Retry delay base (ms) - exponential backoff */
  retryDelayBase?: number;
  /** Request timeout (ms) */
  timeout?: number;
  /** Enable signature verification */
  signPayloads?: boolean;
  /** Queue size limit */
  queueLimit?: number;
}

/**
 * Webhook statistics
 */
export interface WebhookStats {
  totalSent: number;
  totalSuccessful: number;
  totalFailed: number;
  byEventType: Record<string, { sent: number; successful: number; failed: number }>;
  byEndpoint: Record<string, { sent: number; successful: number; failed: number }>;
  averageDeliveryTime: number;
}

/**
 * Webhook Manager
 */
export class WebhookManager {
  private config: WebhookManagerConfig;
  private endpoints: Map<string, WebhookEndpoint> = new Map();
  private deliveries: WebhookDelivery[] = [];
  private pendingQueue: WebhookPayload[] = [];
  private stats: WebhookStats = {
    totalSent: 0,
    totalSuccessful: 0,
    totalFailed: 0,
    byEventType: {},
    byEndpoint: {},
    averageDeliveryTime: 0,
  };

  constructor(config: WebhookManagerConfig = {}) {
    this.config = {
      maxRetries: 3,
      retryDelayBase: 1000,
      timeout: 30000,
      signPayloads: true,
      queueLimit: 1000,
      ...config,
    };

    // Register default endpoints
    if (config.endpoints) {
      for (const endpoint of config.endpoints) {
        this.registerEndpoint(endpoint);
      }
    }
  }

  // ============================================
  // ENDPOINT MANAGEMENT
  // ============================================

  /**
   * Register a webhook endpoint
   */
  registerEndpoint(endpoint: WebhookEndpoint): string {
    const id = this.generateId();
    this.endpoints.set(id, { active: true, timeout: this.config.timeout, ...endpoint });
    return id;
  }

  /**
   * Subscribe to specific event types
   */
  subscribe(eventType: WebhookEventType | WebhookEventType[], url: string, secret?: string): string {
    const events = Array.isArray(eventType) ? eventType : [eventType];
    return this.registerEndpoint({ url, secret, events });
  }

  /**
   * Subscribe to all events
   */
  subscribeAll(url: string, secret?: string): string {
    return this.registerEndpoint({ url, secret, events: [] });
  }

  /**
   * Unregister an endpoint
   */
  unregister(endpointId: string): boolean {
    return this.endpoints.delete(endpointId);
  }

  /**
   * Pause an endpoint
   */
  pause(endpointId: string): void {
    const endpoint = this.endpoints.get(endpointId);
    if (endpoint) {
      endpoint.active = false;
    }
  }

  /**
   * Resume an endpoint
   */
  resume(endpointId: string): void {
    const endpoint = this.endpoints.get(endpointId);
    if (endpoint) {
      endpoint.active = true;
    }
  }

  /**
   * List all endpoints
   */
  listEndpoints(): Array<WebhookEndpoint & { id: string }> {
    return Array.from(this.endpoints.entries()).map(([id, endpoint]) => ({
      id,
      ...endpoint,
    }));
  }

  // ============================================
  // EVENT SENDING
  // ============================================

  /**
   * Send a webhook event
   *
   * @example
   * ```typescript
   * await webhooks.send('payment.completed', {
   *   txHash: '0x...',
   *   amount: '100',
   *   recipient: '0x...'
   * });
   * ```
   */
  async send(eventType: WebhookEventType, data: unknown): Promise<WebhookDelivery[]> {
    const payload: WebhookPayload = {
      id: this.generateId(),
      type: eventType,
      timestamp: new Date().toISOString(),
      data,
    };

    // Find matching endpoints
    const matchingEndpoints = Array.from(this.endpoints.entries()).filter(([, endpoint]) => {
      if (!endpoint.active) return false;
      if (!endpoint.events || endpoint.events.length === 0) return true;
      return endpoint.events.includes(eventType);
    });

    // Send to all matching endpoints
    const deliveries = await Promise.all(
      matchingEndpoints.map(([id, endpoint]) => this.deliver(id, endpoint, payload))
    );

    return deliveries;
  }

  /**
   * Queue an event for later sending (useful for batching)
   */
  queue(eventType: WebhookEventType, data: unknown): void {
    if (this.pendingQueue.length >= (this.config.queueLimit || 1000)) {
      // Remove oldest
      this.pendingQueue.shift();
    }

    this.pendingQueue.push({
      id: this.generateId(),
      type: eventType,
      timestamp: new Date().toISOString(),
      data,
    });
  }

  /**
   * Flush the queue (send all pending events)
   */
  async flush(): Promise<WebhookDelivery[]> {
    const all: WebhookDelivery[] = [];

    while (this.pendingQueue.length > 0) {
      const payload = this.pendingQueue.shift()!;

      const matchingEndpoints = Array.from(this.endpoints.entries()).filter(([, endpoint]) => {
        if (!endpoint.active) return false;
        if (!endpoint.events || endpoint.events.length === 0) return true;
        return endpoint.events.includes(payload.type);
      });

      const deliveries = await Promise.all(
        matchingEndpoints.map(([id, endpoint]) => this.deliver(id, endpoint, payload))
      );

      all.push(...deliveries);
    }

    return all;
  }

  // ============================================
  // DELIVERY
  // ============================================

  /**
   * Deliver a webhook to an endpoint
   */
  private async deliver(
    endpointId: string,
    endpoint: WebhookEndpoint,
    payload: WebhookPayload,
    retryCount = 0
  ): Promise<WebhookDelivery> {
    const startTime = Date.now();
    const body = JSON.stringify(payload);

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Id': payload.id,
      'X-Webhook-Event': payload.type,
      'X-Webhook-Timestamp': payload.timestamp,
      ...endpoint.headers,
    };

    // Add signature if secret provided
    if (endpoint.secret && this.config.signPayloads) {
      const signature = this.sign(body, endpoint.secret);
      headers['X-Webhook-Signature'] = signature;
    }

    let delivery: WebhookDelivery;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        endpoint.timeout || this.config.timeout || 30000
      );

      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseText = await response.text();
      const duration = Date.now() - startTime;

      delivery = {
        id: this.generateId(),
        endpoint: endpoint.url,
        eventType: payload.type,
        payload,
        statusCode: response.status,
        response: responseText.slice(0, 1000), // Limit response size
        success: response.ok,
        deliveredAt: new Date().toISOString(),
        durationMs: duration,
        retryCount,
      };

      // Retry on server errors
      if (!response.ok && response.status >= 500 && retryCount < (this.config.maxRetries || 3)) {
        const delay = (this.config.retryDelayBase || 1000) * Math.pow(2, retryCount);
        await this.sleep(delay);
        return this.deliver(endpointId, endpoint, { ...payload, attempt: retryCount + 1 }, retryCount + 1);
      }
    } catch (error) {
      const duration = Date.now() - startTime;

      delivery = {
        id: this.generateId(),
        endpoint: endpoint.url,
        eventType: payload.type,
        payload,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        deliveredAt: new Date().toISOString(),
        durationMs: duration,
        retryCount,
      };

      // Retry on network errors
      if (retryCount < (this.config.maxRetries || 3)) {
        const delay = (this.config.retryDelayBase || 1000) * Math.pow(2, retryCount);
        await this.sleep(delay);
        return this.deliver(endpointId, endpoint, { ...payload, attempt: retryCount + 1 }, retryCount + 1);
      }
    }

    // Record delivery
    this.deliveries.push(delivery);
    if (this.deliveries.length > 10000) {
      this.deliveries.shift();
    }

    // Update stats
    this.updateStats(delivery);

    return delivery;
  }

  /**
   * Sign a payload with HMAC-SHA256
   */
  private sign(payload: string, secret: string): string {
    const hmac = createHmac('sha256', secret);
    hmac.update(payload);
    return `sha256=${hmac.digest('hex')}`;
  }

  // ============================================
  // HISTORY & STATS
  // ============================================

  /**
   * Get delivery history
   */
  getDeliveryHistory(filter?: {
    eventType?: WebhookEventType;
    endpoint?: string;
    success?: boolean;
    limit?: number;
  }): WebhookDelivery[] {
    let history = [...this.deliveries];

    if (filter?.eventType) {
      history = history.filter((d) => d.eventType === filter.eventType);
    }
    if (filter?.endpoint) {
      history = history.filter((d) => d.endpoint === filter.endpoint);
    }
    if (filter?.success !== undefined) {
      history = history.filter((d) => d.success === filter.success);
    }

    // Most recent first
    history.reverse();

    if (filter?.limit) {
      history = history.slice(0, filter.limit);
    }

    return history;
  }

  /**
   * Get webhook statistics
   */
  getStats(): WebhookStats {
    return { ...this.stats };
  }

  /**
   * Update statistics
   */
  private updateStats(delivery: WebhookDelivery): void {
    this.stats.totalSent++;

    if (delivery.success) {
      this.stats.totalSuccessful++;
    } else {
      this.stats.totalFailed++;
    }

    // By event type
    if (!this.stats.byEventType[delivery.eventType]) {
      this.stats.byEventType[delivery.eventType] = { sent: 0, successful: 0, failed: 0 };
    }
    this.stats.byEventType[delivery.eventType].sent++;
    if (delivery.success) {
      this.stats.byEventType[delivery.eventType].successful++;
    } else {
      this.stats.byEventType[delivery.eventType].failed++;
    }

    // By endpoint
    if (!this.stats.byEndpoint[delivery.endpoint]) {
      this.stats.byEndpoint[delivery.endpoint] = { sent: 0, successful: 0, failed: 0 };
    }
    this.stats.byEndpoint[delivery.endpoint].sent++;
    if (delivery.success) {
      this.stats.byEndpoint[delivery.endpoint].successful++;
    } else {
      this.stats.byEndpoint[delivery.endpoint].failed++;
    }

    // Average delivery time
    const totalTime = this.deliveries.reduce((sum, d) => sum + d.durationMs, 0);
    this.stats.averageDeliveryTime = totalTime / this.deliveries.length;
  }

  /**
   * Retry a failed delivery
   */
  async retry(deliveryId: string): Promise<WebhookDelivery | null> {
    const original = this.deliveries.find((d) => d.id === deliveryId);
    if (!original) return null;

    const endpoint = Array.from(this.endpoints.values()).find((e) => e.url === original.endpoint);
    if (!endpoint) return null;

    const endpointId = Array.from(this.endpoints.entries()).find(([, e]) => e.url === original.endpoint)?.[0];
    if (!endpointId) return null;

    return this.deliver(endpointId, endpoint, original.payload, original.retryCount + 1);
  }

  // ============================================
  // HELPERS
  // ============================================

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create a webhook manager instance
 *
 * @example
 * ```typescript
 * const webhooks = createWebhookManager({
 *   endpoints: [
 *     { url: 'https://my-server.com/webhooks', secret: 'my-secret' }
 *   ],
 *   maxRetries: 3
 * });
 * ```
 */
export function createWebhookManager(config?: WebhookManagerConfig): WebhookManager {
  return new WebhookManager(config);
}

/**
 * Global webhook manager instance
 */
let globalWebhookManager: WebhookManager | null = null;

/**
 * Get or create the global webhook manager
 */
export function getGlobalWebhookManager(config?: WebhookManagerConfig): WebhookManager {
  if (!globalWebhookManager) {
    globalWebhookManager = new WebhookManager(config);
  }
  return globalWebhookManager;
}

export default { WebhookManager, createWebhookManager, getGlobalWebhookManager };
