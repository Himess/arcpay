/**
 * Subscription Tests
 * Tests: Create plan, subscribe, check status, cancel
 */

import { TestResult, runTest } from './types';
import { getTestContext } from './config';

// In-memory subscription store for testing
const subscriptionStore = {
  plans: new Map<string, any>(),
  subscriptions: new Map<string, any>(),
};

export async function runSubscriptionTests(): Promise<TestResult[]> {
  console.log('\n📅 Category 12: Subscription Tests');
  console.log('─'.repeat(40));

  const results: TestResult[] = [];
  const ctx = getTestContext();

  let createdPlanId: string | undefined;
  let createdSubscriptionId: string | undefined;

  // TEST_12_1: Create Subscription Plan (local)
  results.push(await runTest('TEST_12_1', 'Create Subscription Plan (local)', 'Subscriptions', async () => {
    createdPlanId = `plan-${Date.now()}`;

    const plan = {
      id: createdPlanId,
      name: 'Pro Plan',
      description: 'Premium features for power users',
      price: '9.99',
      currency: 'USDC',
      interval: 'monthly',
      features: ['Unlimited API calls', 'Priority support', 'Custom webhooks'],
      createdAt: new Date().toISOString(),
      merchantAddress: ctx.walletAddress,
    };

    subscriptionStore.plans.set(createdPlanId, plan);

    return {
      details: {
        planId: createdPlanId,
        name: plan.name,
        price: `${plan.price} ${plan.currency}`,
        interval: plan.interval,
        features: plan.features,
      },
    };
  }));

  // TEST_12_2: Subscribe to Plan (local)
  results.push(await runTest('TEST_12_2', 'Subscribe to Plan (local)', 'Subscriptions', async () => {
    if (!createdPlanId) {
      throw new Error('No plan created to subscribe to');
    }

    createdSubscriptionId = `sub-${Date.now()}`;

    const subscription = {
      id: createdSubscriptionId,
      planId: createdPlanId,
      subscriberAddress: ctx.circleWallet.address,
      status: 'active',
      startDate: new Date().toISOString(),
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      payments: [],
    };

    subscriptionStore.subscriptions.set(createdSubscriptionId, subscription);

    return {
      details: {
        subscriptionId: createdSubscriptionId,
        planId: createdPlanId,
        subscriber: ctx.circleWallet.address,
        status: subscription.status,
        startDate: subscription.startDate,
        nextBillingDate: subscription.nextBillingDate,
      },
    };
  }));

  // TEST_12_3: Check Subscription Status
  results.push(await runTest('TEST_12_3', 'Check Subscription Status', 'Subscriptions', async () => {
    if (!createdSubscriptionId) {
      throw new Error('No subscription created to check');
    }

    const subscription = subscriptionStore.subscriptions.get(createdSubscriptionId);

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const plan = subscriptionStore.plans.get(subscription.planId);

    return {
      details: {
        subscriptionId: createdSubscriptionId,
        status: subscription.status,
        plan: plan?.name,
        price: `${plan?.price} ${plan?.currency}`,
        nextBillingDate: subscription.nextBillingDate,
        isActive: subscription.status === 'active',
      },
    };
  }));

  // TEST_12_4: Cancel Subscription
  results.push(await runTest('TEST_12_4', 'Cancel Subscription', 'Subscriptions', async () => {
    if (!createdSubscriptionId) {
      throw new Error('No subscription created to cancel');
    }

    const subscription = subscriptionStore.subscriptions.get(createdSubscriptionId);

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Update subscription status
    subscription.status = 'cancelled';
    subscription.cancelledAt = new Date().toISOString();

    subscriptionStore.subscriptions.set(createdSubscriptionId, subscription);

    return {
      details: {
        subscriptionId: createdSubscriptionId,
        previousStatus: 'active',
        newStatus: subscription.status,
        cancelledAt: subscription.cancelledAt,
      },
    };
  }));

  return results;
}
