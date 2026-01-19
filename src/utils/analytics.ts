/**
 * Analytics Dashboard
 *
 * Comprehensive analytics and metrics tracking for all ArcPay operations.
 *
 * @example
 * ```typescript
 * import { Analytics } from 'arcpay';
 *
 * const analytics = new Analytics();
 *
 * // Track events
 * analytics.track('payment.sent', { amount: '100', to: '0x...' });
 *
 * // Get metrics
 * const metrics = analytics.getMetrics();
 *
 * // Get dashboard summary
 * const dashboard = analytics.getDashboard();
 * ```
 */

/**
 * Analytics event
 */
export interface AnalyticsEvent {
  id: string;
  type: string;
  category: AnalyticsCategory;
  data: Record<string, unknown>;
  timestamp: string;
  sessionId?: string;
  userId?: string;
}

/**
 * Analytics category
 */
export type AnalyticsCategory =
  | 'payment'
  | 'stream'
  | 'escrow'
  | 'channel'
  | 'subscription'
  | 'invoice'
  | 'agent'
  | 'bridge'
  | 'gateway'
  | 'fx'
  | 'privacy'
  | 'system';

/**
 * Time series data point
 */
export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
}

/**
 * Metric definition
 */
export interface Metric {
  name: string;
  value: number;
  unit?: string;
  change?: number; // Percentage change from previous period
  trend?: 'up' | 'down' | 'stable';
}

/**
 * Dashboard data
 */
export interface Dashboard {
  /** Overview metrics */
  overview: {
    totalVolume: Metric;
    totalTransactions: Metric;
    activeStreams: Metric;
    activeEscrows: Metric;
    activeSubscriptions: Metric;
    pendingInvoices: Metric;
  };
  /** Volume over time */
  volumeTimeSeries: TimeSeriesPoint[];
  /** Transactions over time */
  transactionTimeSeries: TimeSeriesPoint[];
  /** Top recipients */
  topRecipients: Array<{ address: string; volume: string; count: number }>;
  /** Category breakdown */
  categoryBreakdown: Record<AnalyticsCategory, { volume: string; count: number }>;
  /** Recent activity */
  recentActivity: AnalyticsEvent[];
  /** Error rate */
  errorRate: number;
  /** Success rate */
  successRate: number;
}

/**
 * Analytics configuration
 */
export interface AnalyticsConfig {
  /** Enable analytics */
  enabled?: boolean;
  /** Session ID */
  sessionId?: string;
  /** User ID */
  userId?: string;
  /** Maximum events to store */
  maxEvents?: number;
  /** Flush interval (ms) for batch processing */
  flushInterval?: number;
  /** Custom event handler */
  onEvent?: (event: AnalyticsEvent) => void;
}

/**
 * Analytics Manager
 */
export class Analytics {
  private config: AnalyticsConfig;
  private events: AnalyticsEvent[] = [];
  private counters: Map<string, number> = new Map();
  private sums: Map<string, number> = new Map();
  private timeSeries: Map<string, TimeSeriesPoint[]> = new Map();

  constructor(config: AnalyticsConfig = {}) {
    this.config = {
      enabled: true,
      maxEvents: 10000,
      flushInterval: 60000,
      ...config,
    };
  }

  // ============================================
  // EVENT TRACKING
  // ============================================

  /**
   * Track an event
   *
   * @example
   * ```typescript
   * analytics.track('payment.sent', {
   *   amount: '100',
   *   to: '0x...',
   *   category: 'payment'
   * });
   * ```
   */
  track(eventType: string, data: Record<string, unknown> = {}): void {
    if (!this.config.enabled) return;

    const category = this.inferCategory(eventType);

    const event: AnalyticsEvent = {
      id: this.generateId(),
      type: eventType,
      category,
      data,
      timestamp: new Date().toISOString(),
      sessionId: this.config.sessionId,
      userId: this.config.userId,
    };

    this.events.push(event);

    // Trim if over limit
    if (this.events.length > (this.config.maxEvents || 10000)) {
      this.events.shift();
    }

    // Update counters
    this.increment(`events.${eventType}`);
    this.increment(`events.category.${category}`);

    // Update volume if applicable
    if (data.amount) {
      const amount = parseFloat(String(data.amount)) || 0;
      this.add('volume.total', amount);
      this.add(`volume.${category}`, amount);
    }

    // Track success/failure
    if (data.success !== undefined) {
      if (data.success) {
        this.increment('success.total');
      } else {
        this.increment('errors.total');
      }
    }

    // Update time series
    this.recordTimeSeries('transactions', 1);
    if (data.amount) {
      this.recordTimeSeries('volume', parseFloat(String(data.amount)) || 0);
    }

    // Call custom handler
    if (this.config.onEvent) {
      this.config.onEvent(event);
    }
  }

  /**
   * Track a payment
   */
  trackPayment(params: {
    txHash: string;
    amount: string;
    from: string;
    to: string;
    success: boolean;
    type?: string;
  }): void {
    this.track('payment.completed', {
      ...params,
      category: 'payment',
    });
  }

  /**
   * Track a stream
   */
  trackStream(params: {
    streamId: string;
    action: 'created' | 'claimed' | 'cancelled';
    amount?: string;
  }): void {
    this.track(`stream.${params.action}`, {
      ...params,
      category: 'stream',
    });
  }

  /**
   * Track an error
   */
  trackError(params: { code: string; message: string; context?: unknown }): void {
    this.track('system.error', {
      ...params,
      category: 'system',
    });
  }

  // ============================================
  // METRICS
  // ============================================

  /**
   * Increment a counter
   */
  increment(key: string, amount = 1): void {
    this.counters.set(key, (this.counters.get(key) || 0) + amount);
  }

  /**
   * Add to a sum
   */
  add(key: string, value: number): void {
    this.sums.set(key, (this.sums.get(key) || 0) + value);
  }

  /**
   * Get a counter value
   */
  getCounter(key: string): number {
    return this.counters.get(key) || 0;
  }

  /**
   * Get a sum value
   */
  getSum(key: string): number {
    return this.sums.get(key) || 0;
  }

  /**
   * Get all metrics
   */
  getMetrics(): Record<string, Metric> {
    const metrics: Record<string, Metric> = {};

    // Counter metrics
    for (const [key, value] of this.counters.entries()) {
      metrics[key] = { name: key, value };
    }

    // Sum metrics
    for (const [key, value] of this.sums.entries()) {
      metrics[key] = { name: key, value, unit: 'USDC' };
    }

    return metrics;
  }

  // ============================================
  // TIME SERIES
  // ============================================

  /**
   * Record a time series data point
   */
  private recordTimeSeries(name: string, value: number): void {
    const now = new Date();
    // Round to hour for aggregation
    now.setMinutes(0, 0, 0);
    const timestamp = now.toISOString();

    const series = this.timeSeries.get(name) || [];
    const existing = series.find((p) => p.timestamp === timestamp);

    if (existing) {
      existing.value += value;
    } else {
      series.push({ timestamp, value });
      // Keep last 30 days
      while (series.length > 720) {
        series.shift();
      }
    }

    this.timeSeries.set(name, series);
  }

  /**
   * Get time series data
   */
  getTimeSeries(name: string, hours = 24): TimeSeriesPoint[] {
    const series = this.timeSeries.get(name) || [];
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

    return series.filter((p) => new Date(p.timestamp) >= cutoff);
  }

  // ============================================
  // DASHBOARD
  // ============================================

  /**
   * Get dashboard summary
   */
  getDashboard(): Dashboard {
    const events = this.events;
    const recentEvents = events.slice(-50).reverse();

    // Calculate top recipients
    const recipientVolume: Record<string, { volume: number; count: number }> = {};
    for (const event of events) {
      if (event.data.to && event.data.amount) {
        const to = String(event.data.to);
        if (!recipientVolume[to]) {
          recipientVolume[to] = { volume: 0, count: 0 };
        }
        recipientVolume[to].volume += parseFloat(String(event.data.amount)) || 0;
        recipientVolume[to].count++;
      }
    }

    const topRecipients = Object.entries(recipientVolume)
      .map(([address, data]) => ({
        address,
        volume: data.volume.toFixed(6),
        count: data.count,
      }))
      .sort((a, b) => parseFloat(b.volume) - parseFloat(a.volume))
      .slice(0, 10);

    // Category breakdown
    const categoryBreakdown: Record<AnalyticsCategory, { volume: string; count: number }> = {
      payment: { volume: this.getSum('volume.payment').toFixed(6), count: this.getCounter('events.category.payment') },
      stream: { volume: this.getSum('volume.stream').toFixed(6), count: this.getCounter('events.category.stream') },
      escrow: { volume: this.getSum('volume.escrow').toFixed(6), count: this.getCounter('events.category.escrow') },
      channel: { volume: this.getSum('volume.channel').toFixed(6), count: this.getCounter('events.category.channel') },
      subscription: { volume: this.getSum('volume.subscription').toFixed(6), count: this.getCounter('events.category.subscription') },
      invoice: { volume: this.getSum('volume.invoice').toFixed(6), count: this.getCounter('events.category.invoice') },
      agent: { volume: this.getSum('volume.agent').toFixed(6), count: this.getCounter('events.category.agent') },
      bridge: { volume: this.getSum('volume.bridge').toFixed(6), count: this.getCounter('events.category.bridge') },
      gateway: { volume: this.getSum('volume.gateway').toFixed(6), count: this.getCounter('events.category.gateway') },
      fx: { volume: this.getSum('volume.fx').toFixed(6), count: this.getCounter('events.category.fx') },
      privacy: { volume: this.getSum('volume.privacy').toFixed(6), count: this.getCounter('events.category.privacy') },
      system: { volume: '0', count: this.getCounter('events.category.system') },
    };

    // Success/error rates
    const totalOps = this.getCounter('success.total') + this.getCounter('errors.total');
    const successRate = totalOps > 0 ? this.getCounter('success.total') / totalOps : 1;
    const errorRate = totalOps > 0 ? this.getCounter('errors.total') / totalOps : 0;

    return {
      overview: {
        totalVolume: {
          name: 'Total Volume',
          value: this.getSum('volume.total'),
          unit: 'USDC',
        },
        totalTransactions: {
          name: 'Total Transactions',
          value: events.length,
        },
        activeStreams: {
          name: 'Active Streams',
          value: this.getCounter('streams.active'),
        },
        activeEscrows: {
          name: 'Active Escrows',
          value: this.getCounter('escrows.active'),
        },
        activeSubscriptions: {
          name: 'Active Subscriptions',
          value: this.getCounter('subscriptions.active'),
        },
        pendingInvoices: {
          name: 'Pending Invoices',
          value: this.getCounter('invoices.pending'),
        },
      },
      volumeTimeSeries: this.getTimeSeries('volume'),
      transactionTimeSeries: this.getTimeSeries('transactions'),
      topRecipients,
      categoryBreakdown,
      recentActivity: recentEvents,
      errorRate,
      successRate,
    };
  }

  // ============================================
  // REPORTS
  // ============================================

  /**
   * Generate a summary report
   */
  generateReport(period: 'day' | 'week' | 'month' = 'day'): {
    period: string;
    startDate: string;
    endDate: string;
    metrics: Record<string, Metric>;
    topCategories: Array<{ category: string; volume: string; count: number }>;
    trends: Array<{ metric: string; change: number; trend: 'up' | 'down' | 'stable' }>;
  } {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const periodEvents = this.events.filter(
      (e) => new Date(e.timestamp) >= startDate
    );

    // Calculate metrics for period
    let periodVolume = 0;
    const categoryStats: Record<string, { volume: number; count: number }> = {};

    for (const event of periodEvents) {
      if (event.data.amount) {
        periodVolume += parseFloat(String(event.data.amount)) || 0;
      }

      if (!categoryStats[event.category]) {
        categoryStats[event.category] = { volume: 0, count: 0 };
      }
      categoryStats[event.category].count++;
      if (event.data.amount) {
        categoryStats[event.category].volume += parseFloat(String(event.data.amount)) || 0;
      }
    }

    const topCategories = Object.entries(categoryStats)
      .map(([category, data]) => ({
        category,
        volume: data.volume.toFixed(6),
        count: data.count,
      }))
      .sort((a, b) => parseFloat(b.volume) - parseFloat(a.volume));

    return {
      period,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      metrics: {
        volume: { name: 'Volume', value: periodVolume, unit: 'USDC' },
        transactions: { name: 'Transactions', value: periodEvents.length },
      },
      topCategories,
      trends: [], // Would need historical comparison
    };
  }

  // ============================================
  // EXPORT
  // ============================================

  /**
   * Export all data as JSON
   */
  exportData(): string {
    return JSON.stringify({
      events: this.events,
      counters: Object.fromEntries(this.counters),
      sums: Object.fromEntries(this.sums),
      timeSeries: Object.fromEntries(this.timeSeries),
      exportedAt: new Date().toISOString(),
    });
  }

  /**
   * Import data from JSON
   */
  importData(json: string): void {
    const data = JSON.parse(json);
    this.events = data.events || [];
    this.counters = new Map(Object.entries(data.counters || {}));
    this.sums = new Map(Object.entries(data.sums || {}));
    this.timeSeries = new Map(Object.entries(data.timeSeries || {}));
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.events = [];
    this.counters.clear();
    this.sums.clear();
    this.timeSeries.clear();
  }

  // ============================================
  // HELPERS
  // ============================================

  private inferCategory(eventType: string): AnalyticsCategory {
    const prefix = eventType.split('.')[0];
    const categoryMap: Record<string, AnalyticsCategory> = {
      payment: 'payment',
      stream: 'stream',
      escrow: 'escrow',
      channel: 'channel',
      subscription: 'subscription',
      invoice: 'invoice',
      agent: 'agent',
      bridge: 'bridge',
      gateway: 'gateway',
      fx: 'fx',
      privacy: 'privacy',
      system: 'system',
    };
    return categoryMap[prefix] || 'system';
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }
}

/**
 * Create an analytics instance
 */
export function createAnalytics(config?: AnalyticsConfig): Analytics {
  return new Analytics(config);
}

/**
 * Global analytics instance
 */
let globalAnalytics: Analytics | null = null;

/**
 * Get or create the global analytics instance
 */
export function getGlobalAnalytics(config?: AnalyticsConfig): Analytics {
  if (!globalAnalytics) {
    globalAnalytics = new Analytics(config);
  }
  return globalAnalytics;
}

export default { Analytics, createAnalytics, getGlobalAnalytics };
