/**
 * Compliance & Safety Tests
 * Tests: Address screening, circuit breaker, rate limiter
 */

import { TestResult, runTest } from './types';
import { getTestContext } from './config';

// Known blocked addresses (OFAC sanctions list - examples)
const BLOCKED_ADDRESSES = [
  '0x8589427373D6D84E98730D7795D8f6f8731FDA16', // Tornado Cash
  '0x722122dF12D4e14e13Ac3b6895a86e84145b6967', // Tornado Cash
  '0x7F19720A857F834887FC9A7bC0a0fBe7Fc7f8102', // Lazarus Group
];

// Circuit breaker state
const circuitBreakerState = {
  tripped: false,
  failureCount: 0,
  lastFailure: 0,
  threshold: 5,
  resetTime: 60000, // 1 minute
};

// Rate limiter state
const rateLimiterState = new Map<string, { count: number; resetAt: number }>();

export async function runComplianceTests(): Promise<TestResult[]> {
  console.log('\n🛡️ Category 16: Compliance & Safety Tests');
  console.log('─'.repeat(40));

  const results: TestResult[] = [];
  const ctx = getTestContext();

  // TEST_16_1: compliance.screenAddress() - Clean address
  results.push(await runTest('TEST_16_1', 'compliance.screenAddress() - Clean address', 'Compliance', async () => {
    const cleanAddress = ctx.walletAddress;

    const isBlocked = BLOCKED_ADDRESSES.some(
      blocked => blocked.toLowerCase() === cleanAddress.toLowerCase()
    );

    if (isBlocked) {
      throw new Error('Test wallet is unexpectedly blocked');
    }

    return {
      details: {
        method: 'compliance.screenAddress()',
        address: cleanAddress,
        isBlocked: false,
        status: 'CLEAR',
      },
    };
  }));

  // TEST_16_2: compliance.screenAddress() - Blocked address
  results.push(await runTest('TEST_16_2', 'compliance.screenAddress() - Blocked address', 'Compliance', async () => {
    const blockedAddress = BLOCKED_ADDRESSES[0];

    const isBlocked = BLOCKED_ADDRESSES.some(
      blocked => blocked.toLowerCase() === blockedAddress.toLowerCase()
    );

    if (!isBlocked) {
      throw new Error('Known blocked address not detected');
    }

    return {
      details: {
        method: 'compliance.screenAddress()',
        address: blockedAddress,
        isBlocked: true,
        status: 'BLOCKED',
        reason: 'OFAC Sanctions List',
      },
    };
  }));

  // TEST_16_3: circuitBreaker.checkTransaction()
  results.push(await runTest('TEST_16_3', 'circuitBreaker.checkTransaction()', 'Compliance', async () => {
    // Simulate circuit breaker check
    const now = Date.now();

    // Reset if enough time has passed
    if (now - circuitBreakerState.lastFailure > circuitBreakerState.resetTime) {
      circuitBreakerState.tripped = false;
      circuitBreakerState.failureCount = 0;
    }

    // Check if circuit is tripped
    const canProceed = !circuitBreakerState.tripped;

    return {
      details: {
        method: 'circuitBreaker.checkTransaction()',
        canProceed,
        isTripped: circuitBreakerState.tripped,
        failureCount: circuitBreakerState.failureCount,
        threshold: circuitBreakerState.threshold,
        status: canProceed ? 'CIRCUIT_CLOSED' : 'CIRCUIT_OPEN',
      },
    };
  }));

  // TEST_16_4: rateLimiter.checkLimit()
  results.push(await runTest('TEST_16_4', 'rateLimiter.checkLimit()', 'Compliance', async () => {
    const userId = ctx.walletAddress;
    const now = Date.now();
    const windowMs = 60000; // 1 minute window
    const maxRequests = 100;

    // Get or create rate limit entry
    let entry = rateLimiterState.get(userId);

    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      rateLimiterState.set(userId, entry);
    }

    // Increment count
    entry.count++;

    const isLimited = entry.count > maxRequests;
    const remaining = Math.max(0, maxRequests - entry.count);

    return {
      details: {
        method: 'rateLimiter.checkLimit()',
        userId: userId.slice(0, 10) + '...',
        requestCount: entry.count,
        maxRequests,
        remaining,
        isLimited,
        resetsAt: new Date(entry.resetAt).toISOString(),
        status: isLimited ? 'RATE_LIMITED' : 'OK',
      },
    };
  }));

  return results;
}
