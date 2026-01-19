/**
 * Subscription Manager Module
 *
 * Manage recurring payments and subscriptions with automatic billing.
 *
 * @example
 * ```typescript
 * import { createSubscriptionManager } from 'arcpay';
 *
 * const subs = createSubscriptionManager({
 *   privateKey: process.env.PRIVATE_KEY,
 * });
 *
 * // Create a subscription plan
 * const plan = subs.createPlan({
 *   name: 'Pro Plan',
 *   price: '9.99',
 *   period: 'monthly',
 *   features: ['Unlimited API calls', 'Priority support']
 * });
 *
 * // Subscribe to a plan
 * const subscription = await subs.subscribe({
 *   plan: plan.id,
 *   merchant: '0x...'
 * });
 *
 * // Cancel subscription
 * await subs.cancel(subscription.id);
 * ```
 */

import { ArcPayClient } from '../../core/client';
import { createStreamManager, type StreamManager } from '../streams';
import type {
  Subscription,
  SubscriptionPlan,
  SubscriptionPayment,
  SubscriptionStatus,
  SubscriptionManagerConfig,
  CreateSubscriptionParams,
  CreatePlanParams,
  BillingPeriod,
} from './types';

export * from './types';

/**
 * Get period duration in milliseconds
 */
function getPeriodMs(period: BillingPeriod): number {
  switch (period) {
    case 'daily':
      return 24 * 60 * 60 * 1000;
    case 'weekly':
      return 7 * 24 * 60 * 60 * 1000;
    case 'monthly':
      return 30 * 24 * 60 * 60 * 1000;
    case 'yearly':
      return 365 * 24 * 60 * 60 * 1000;
    default:
      return 30 * 24 * 60 * 60 * 1000;
  }
}

/**
 * Get period duration in seconds
 */
function getPeriodSeconds(period: BillingPeriod): number {
  return Math.floor(getPeriodMs(period) / 1000);
}

/**
 * Subscription Manager
 */
export class SubscriptionManager {
  private client: ArcPayClient;
  private streams: StreamManager;
  private config: SubscriptionManagerConfig;

  private plans: Map<string, SubscriptionPlan> = new Map();
  private subscriptions: Map<string, Subscription> = new Map();
  private payments: Map<string, SubscriptionPayment[]> = new Map();

  constructor(config: SubscriptionManagerConfig) {
    this.config = {
      autoRenew: true,
      gracePeriodDays: 3,
      ...config,
    };

    this.client = new ArcPayClient({
      network: 'arc-testnet',
      privateKey: config.privateKey,
    });

    this.streams = createStreamManager({ privateKey: config.privateKey });
  }

  // ============================================
  // PLAN MANAGEMENT
  // ============================================

  /**
   * Create a subscription plan
   *
   * @example
   * ```typescript
   * const plan = subs.createPlan({
   *   name: 'Pro Plan',
   *   price: '9.99',
   *   period: 'monthly',
   *   features: ['Unlimited API calls', 'Priority support']
   * });
   * ```
   */
  createPlan(params: CreatePlanParams): SubscriptionPlan {
    const plan: SubscriptionPlan = {
      id: `plan_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name: params.name,
      price: params.price,
      period: params.period,
      description: params.description,
      features: params.features,
      metadata: params.metadata,
    };

    this.plans.set(plan.id, plan);
    return plan;
  }

  /**
   * Get a plan by ID
   */
  getPlan(planId: string): SubscriptionPlan | undefined {
    return this.plans.get(planId);
  }

  /**
   * List all plans
   */
  listPlans(): SubscriptionPlan[] {
    return Array.from(this.plans.values());
  }

  /**
   * Delete a plan
   */
  deletePlan(planId: string): boolean {
    // Check if any active subscriptions use this plan
    const activeSubs = Array.from(this.subscriptions.values()).filter(
      (s) => s.planId === planId && s.status === 'active'
    );

    if (activeSubs.length > 0) {
      throw new Error(`Cannot delete plan with ${activeSubs.length} active subscriptions`);
    }

    return this.plans.delete(planId);
  }

  // ============================================
  // SUBSCRIPTION MANAGEMENT
  // ============================================

  /**
   * Subscribe to a plan
   *
   * @example
   * ```typescript
   * // Subscribe to existing plan
   * const sub = await subs.subscribe({
   *   plan: 'plan_123',
   *   merchant: '0x...'
   * });
   *
   * // Subscribe with inline plan
   * const sub = await subs.subscribe({
   *   plan: { name: 'Custom', price: '5', period: 'monthly' },
   *   merchant: '0x...'
   * });
   *
   * // Use streaming for continuous payments
   * const sub = await subs.subscribe({
   *   plan: 'plan_123',
   *   merchant: '0x...',
   *   useStreaming: true
   * });
   * ```
   */
  async subscribe(params: CreateSubscriptionParams): Promise<Subscription> {
    const { address: subscriber } = await this.client.getBalance();

    // Resolve plan
    let plan: SubscriptionPlan;
    if (typeof params.plan === 'string') {
      const existingPlan = this.plans.get(params.plan);
      if (!existingPlan) {
        throw new Error(`Plan not found: ${params.plan}`);
      }
      plan = existingPlan;
    } else {
      // Create inline plan
      plan = this.createPlan(params.plan);
    }

    const now = new Date();
    const periodMs = getPeriodMs(plan.period);
    const periodEnd = new Date(now.getTime() + periodMs);
    const nextBilling = new Date(now.getTime() + periodMs);

    // Create subscription
    const subscription: Subscription = {
      id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      planId: plan.id,
      subscriber,
      merchant: params.merchant,
      status: 'active',
      price: plan.price,
      period: plan.period,
      createdAt: now.toISOString(),
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
      nextBillingDate: nextBilling.toISOString(),
      cancelAtPeriodEnd: false,
      metadata: params.metadata,
    };

    // Make initial payment
    if (params.useStreaming) {
      // Use streaming for continuous payments
      const stream = await this.streams.createStream({
        recipient: params.merchant,
        totalAmount: plan.price,
        duration: getPeriodSeconds(plan.period),
      });
      subscription.streamId = stream.id;
    } else {
      // One-time payment for the period
      const result = await this.client.transfer({
        to: params.merchant,
        amount: plan.price,
      });
      subscription.lastPaymentDate = now.toISOString();
      subscription.lastPaymentTxHash = result.txHash;

      // Record payment
      this.recordPayment(subscription.id, plan.price, 'completed', result.txHash);
    }

    this.subscriptions.set(subscription.id, subscription);

    // Send webhook
    await this.sendWebhook('subscription.created', subscription);

    return subscription;
  }

  /**
   * Get subscription by ID
   */
  getSubscription(subscriptionId: string): Subscription | undefined {
    return this.subscriptions.get(subscriptionId);
  }

  /**
   * List subscriptions
   */
  listSubscriptions(filter?: {
    status?: SubscriptionStatus;
    merchant?: string;
    subscriber?: string;
  }): Subscription[] {
    let subs = Array.from(this.subscriptions.values());

    if (filter?.status) {
      subs = subs.filter((s) => s.status === filter.status);
    }
    if (filter?.merchant) {
      subs = subs.filter((s) => s.merchant.toLowerCase() === filter.merchant!.toLowerCase());
    }
    if (filter?.subscriber) {
      subs = subs.filter((s) => s.subscriber.toLowerCase() === filter.subscriber!.toLowerCase());
    }

    return subs;
  }

  /**
   * Cancel a subscription
   *
   * @example
   * ```typescript
   * // Cancel immediately
   * await subs.cancel('sub_123');
   *
   * // Cancel at period end (continue until paid period expires)
   * await subs.cancel('sub_123', { atPeriodEnd: true });
   * ```
   */
  async cancel(
    subscriptionId: string,
    options?: { atPeriodEnd?: boolean; reason?: string }
  ): Promise<Subscription> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription not found: ${subscriptionId}`);
    }

    if (options?.atPeriodEnd) {
      // Cancel at period end
      subscription.cancelAtPeriodEnd = true;
      subscription.cancelledAt = new Date().toISOString();
    } else {
      // Immediate cancellation
      subscription.status = 'cancelled';
      subscription.cancelledAt = new Date().toISOString();

      // Cancel stream if active
      if (subscription.streamId) {
        await this.streams.cancelStream(subscription.streamId);
      }
    }

    this.subscriptions.set(subscriptionId, subscription);

    // Send webhook
    await this.sendWebhook('subscription.cancelled', subscription);

    return subscription;
  }

  /**
   * Pause a subscription
   */
  async pause(subscriptionId: string): Promise<Subscription> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription not found: ${subscriptionId}`);
    }

    subscription.status = 'paused';

    // Pause stream if active
    if (subscription.streamId) {
      await this.streams.cancelStream(subscription.streamId);
    }

    this.subscriptions.set(subscriptionId, subscription);

    // Send webhook
    await this.sendWebhook('subscription.paused', subscription);

    return subscription;
  }

  /**
   * Resume a paused subscription
   */
  async resume(subscriptionId: string): Promise<Subscription> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription not found: ${subscriptionId}`);
    }

    if (subscription.status !== 'paused') {
      throw new Error(`Subscription is not paused: ${subscription.status}`);
    }

    const plan = this.plans.get(subscription.planId);
    if (!plan) {
      throw new Error(`Plan not found: ${subscription.planId}`);
    }

    // Resume with new billing period
    const now = new Date();
    const periodMs = getPeriodMs(subscription.period);

    subscription.status = 'active';
    subscription.currentPeriodStart = now.toISOString();
    subscription.currentPeriodEnd = new Date(now.getTime() + periodMs).toISOString();
    subscription.nextBillingDate = new Date(now.getTime() + periodMs).toISOString();
    subscription.cancelAtPeriodEnd = false;

    // Make payment for new period
    const result = await this.client.transfer({
      to: subscription.merchant,
      amount: subscription.price,
    });

    subscription.lastPaymentDate = now.toISOString();
    subscription.lastPaymentTxHash = result.txHash;

    this.subscriptions.set(subscriptionId, subscription);
    this.recordPayment(subscriptionId, subscription.price, 'completed', result.txHash);

    // Send webhook
    await this.sendWebhook('subscription.resumed', subscription);

    return subscription;
  }

  /**
   * Update subscription (change plan)
   */
  async updatePlan(subscriptionId: string, newPlanId: string): Promise<Subscription> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription not found: ${subscriptionId}`);
    }

    const newPlan = this.plans.get(newPlanId);
    if (!newPlan) {
      throw new Error(`Plan not found: ${newPlanId}`);
    }

    // Update plan details
    const oldPlanId = subscription.planId;
    subscription.planId = newPlanId;
    subscription.price = newPlan.price;
    subscription.period = newPlan.period;

    this.subscriptions.set(subscriptionId, subscription);

    // Send webhook
    await this.sendWebhook('subscription.updated', {
      subscription,
      previousPlanId: oldPlanId,
    });

    return subscription;
  }

  /**
   * Process renewals for due subscriptions
   * Call this periodically (e.g., via cron job)
   */
  async processRenewals(): Promise<{ renewed: string[]; failed: string[] }> {
    const renewed: string[] = [];
    const failed: string[] = [];

    const now = new Date();

    for (const subscription of this.subscriptions.values()) {
      // Skip non-active subscriptions
      if (subscription.status !== 'active') continue;

      // Check if renewal is due
      const nextBilling = new Date(subscription.nextBillingDate);
      if (now < nextBilling) continue;

      // Check if should cancel at period end
      if (subscription.cancelAtPeriodEnd) {
        subscription.status = 'cancelled';
        this.subscriptions.set(subscription.id, subscription);
        await this.sendWebhook('subscription.cancelled', subscription);
        continue;
      }

      // Skip streaming subscriptions (handled separately)
      if (subscription.streamId) continue;

      // Attempt renewal payment
      try {
        const result = await this.client.transfer({
          to: subscription.merchant,
          amount: subscription.price,
        });

        // Update subscription
        const periodMs = getPeriodMs(subscription.period);
        subscription.currentPeriodStart = now.toISOString();
        subscription.currentPeriodEnd = new Date(now.getTime() + periodMs).toISOString();
        subscription.nextBillingDate = new Date(now.getTime() + periodMs).toISOString();
        subscription.lastPaymentDate = now.toISOString();
        subscription.lastPaymentTxHash = result.txHash;

        this.subscriptions.set(subscription.id, subscription);
        this.recordPayment(subscription.id, subscription.price, 'completed', result.txHash);

        renewed.push(subscription.id);
        await this.sendWebhook('subscription.renewed', subscription);
      } catch (error) {
        // Mark as past_due within grace period
        const gracePeriod = (this.config.gracePeriodDays || 3) * 24 * 60 * 60 * 1000;
        const periodEnd = new Date(subscription.currentPeriodEnd);

        if (now.getTime() - periodEnd.getTime() > gracePeriod) {
          subscription.status = 'expired';
        } else {
          subscription.status = 'past_due';
        }

        this.subscriptions.set(subscription.id, subscription);
        this.recordPayment(
          subscription.id,
          subscription.price,
          'failed',
          undefined,
          error instanceof Error ? error.message : 'Payment failed'
        );

        failed.push(subscription.id);
        await this.sendWebhook('subscription.payment_failed', {
          subscription,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { renewed, failed };
  }

  // ============================================
  // PAYMENT HISTORY
  // ============================================

  /**
   * Get payment history for a subscription
   */
  getPaymentHistory(subscriptionId: string): SubscriptionPayment[] {
    return this.payments.get(subscriptionId) || [];
  }

  /**
   * Record a payment
   */
  private recordPayment(
    subscriptionId: string,
    amount: string,
    status: 'pending' | 'completed' | 'failed',
    txHash?: string,
    error?: string
  ): void {
    const payment: SubscriptionPayment = {
      id: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      subscriptionId,
      amount,
      status,
      txHash,
      createdAt: new Date().toISOString(),
      error,
    };

    const history = this.payments.get(subscriptionId) || [];
    history.push(payment);
    this.payments.set(subscriptionId, history);
  }

  // ============================================
  // WEBHOOKS
  // ============================================

  /**
   * Send webhook notification
   */
  private async sendWebhook(event: string, data: unknown): Promise<void> {
    if (!this.config.webhookUrl) return;

    try {
      await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event,
          data,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch {
      // Ignore webhook errors
    }
  }
}

/**
 * Create a subscription manager instance
 *
 * @example
 * ```typescript
 * const subs = createSubscriptionManager({
 *   privateKey: process.env.PRIVATE_KEY,
 *   webhookUrl: 'https://my-app.com/webhooks/subscriptions'
 * });
 *
 * // Create and manage subscriptions
 * const sub = await subs.subscribe({
 *   plan: { name: 'Basic', price: '5', period: 'monthly' },
 *   merchant: '0x...'
 * });
 * ```
 */
export function createSubscriptionManager(config: SubscriptionManagerConfig): SubscriptionManager {
  return new SubscriptionManager(config);
}

export default { createSubscriptionManager, SubscriptionManager };
