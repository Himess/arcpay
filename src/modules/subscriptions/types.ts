/**
 * Subscription Manager Types
 */

/**
 * Subscription billing period
 */
export type BillingPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

/**
 * Subscription status
 */
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'expired' | 'past_due';

/**
 * Subscription plan definition
 */
export interface SubscriptionPlan {
  /** Unique plan identifier */
  id: string;
  /** Plan name */
  name: string;
  /** Plan description */
  description?: string;
  /** Price per billing period */
  price: string;
  /** Billing period */
  period: BillingPeriod;
  /** Features included in this plan */
  features?: string[];
  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Subscription record
 */
export interface Subscription {
  /** Unique subscription ID */
  id: string;
  /** Plan ID */
  planId: string;
  /** Subscriber address */
  subscriber: string;
  /** Merchant/provider address */
  merchant: string;
  /** Status */
  status: SubscriptionStatus;
  /** Price per period */
  price: string;
  /** Billing period */
  period: BillingPeriod;
  /** Created timestamp */
  createdAt: string;
  /** Current period start */
  currentPeriodStart: string;
  /** Current period end */
  currentPeriodEnd: string;
  /** Next billing date */
  nextBillingDate: string;
  /** Last payment date */
  lastPaymentDate?: string;
  /** Last payment tx hash */
  lastPaymentTxHash?: string;
  /** Payment stream ID (if using streams) */
  streamId?: string;
  /** Cancel at period end */
  cancelAtPeriodEnd: boolean;
  /** Cancelled at timestamp */
  cancelledAt?: string;
  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Create subscription params
 */
export interface CreateSubscriptionParams {
  /** Plan ID or inline plan config */
  plan: string | Omit<SubscriptionPlan, 'id'>;
  /** Merchant address to pay */
  merchant: string;
  /** Use streaming for payments */
  useStreaming?: boolean;
  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Create plan params
 */
export interface CreatePlanParams {
  name: string;
  price: string;
  period: BillingPeriod;
  description?: string;
  features?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Subscription payment record
 */
export interface SubscriptionPayment {
  id: string;
  subscriptionId: string;
  amount: string;
  status: 'pending' | 'completed' | 'failed';
  txHash?: string;
  createdAt: string;
  error?: string;
}

/**
 * Subscription manager configuration
 */
export interface SubscriptionManagerConfig {
  /** Private key for signing transactions */
  privateKey: string;
  /** Auto-renew subscriptions (default: true) */
  autoRenew?: boolean;
  /** Grace period for failed payments (in days) */
  gracePeriodDays?: number;
  /** Webhook URL for notifications */
  webhookUrl?: string;
}
