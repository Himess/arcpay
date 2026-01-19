/**
 * Rate Limiting Module
 *
 * Protect APIs and transactions with configurable rate limits.
 *
 * @example
 * ```typescript
 * import { RateLimiter } from 'arcpay';
 *
 * const limiter = new RateLimiter({
 *   maxRequests: 100,
 *   windowMs: 60000, // 1 minute
 * });
 *
 * // Check if allowed
 * if (limiter.isAllowed('user_123')) {
 *   await processPayment();
 * } else {
 *   throw new Error('Rate limit exceeded');
 * }
 *
 * // Or use with async/await
 * await limiter.acquire('user_123'); // Throws if not allowed
 * ```
 */

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /** Maximum requests per window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
  /** Key prefix for namespacing */
  keyPrefix?: string;
  /** Skip rate limiting for these keys */
  whitelist?: string[];
  /** Custom rate limits per key pattern */
  customLimits?: Array<{
    pattern: RegExp;
    maxRequests: number;
    windowMs: number;
  }>;
}

/**
 * Rate limit state for a key
 */
export interface RateLimitState {
  /** Number of requests in current window */
  count: number;
  /** Window start timestamp */
  windowStart: number;
  /** Remaining requests */
  remaining: number;
  /** Reset timestamp */
  resetAt: number;
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  /** Is request allowed */
  allowed: boolean;
  /** Remaining requests */
  remaining: number;
  /** Reset timestamp */
  resetAt: number;
  /** Retry after (ms) if blocked */
  retryAfter?: number;
  /** Limit for this key */
  limit: number;
}

/**
 * Token bucket for smooth rate limiting
 */
interface TokenBucket {
  tokens: number;
  lastRefill: number;
  maxTokens: number;
  refillRate: number; // tokens per ms
}

/**
 * Rate Limiter
 */
export class RateLimiter {
  private config: RateLimitConfig;
  private states: Map<string, RateLimitState> = new Map();
  private buckets: Map<string, TokenBucket> = new Map();

  constructor(config: RateLimitConfig) {
    this.config = {
      keyPrefix: '',
      whitelist: [],
      customLimits: [],
      ...config,
    };

    // Clean up old entries periodically
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Check if a request is allowed
   *
   * @example
   * ```typescript
   * const result = limiter.check('user_123');
   * if (!result.allowed) {
   *   console.log(`Retry after ${result.retryAfter}ms`);
   * }
   * ```
   */
  check(key: string): RateLimitResult {
    const fullKey = this.getFullKey(key);

    // Check whitelist
    if (this.config.whitelist?.includes(key)) {
      return {
        allowed: true,
        remaining: Infinity,
        resetAt: Date.now(),
        limit: Infinity,
      };
    }

    // Get config for this key
    const { maxRequests, windowMs } = this.getLimitForKey(key);

    // Get or create state
    const now = Date.now();
    let state = this.states.get(fullKey);

    if (!state || now - state.windowStart >= windowMs) {
      // New window
      state = {
        count: 0,
        windowStart: now,
        remaining: maxRequests,
        resetAt: now + windowMs,
      };
    }

    const allowed = state.count < maxRequests;
    const remaining = Math.max(0, maxRequests - state.count - (allowed ? 1 : 0));
    const retryAfter = allowed ? undefined : state.resetAt - now;

    return {
      allowed,
      remaining,
      resetAt: state.resetAt,
      retryAfter,
      limit: maxRequests,
    };
  }

  /**
   * Check and consume a request
   *
   * @returns true if allowed, false if rate limited
   */
  isAllowed(key: string): boolean {
    const result = this.check(key);
    if (result.allowed) {
      this.consume(key);
    }
    return result.allowed;
  }

  /**
   * Consume a request (increment counter)
   */
  consume(key: string): void {
    const fullKey = this.getFullKey(key);
    const { maxRequests, windowMs } = this.getLimitForKey(key);
    const now = Date.now();

    let state = this.states.get(fullKey);

    if (!state || now - state.windowStart >= windowMs) {
      state = {
        count: 1,
        windowStart: now,
        remaining: maxRequests - 1,
        resetAt: now + windowMs,
      };
    } else {
      state.count++;
      state.remaining = Math.max(0, maxRequests - state.count);
    }

    this.states.set(fullKey, state);
  }

  /**
   * Acquire permission (throws if rate limited)
   *
   * @throws Error if rate limited
   */
  async acquire(key: string): Promise<void> {
    const result = this.check(key);
    if (!result.allowed) {
      throw new RateLimitError(
        `Rate limit exceeded. Retry after ${result.retryAfter}ms`,
        result.retryAfter || 0
      );
    }
    this.consume(key);
  }

  /**
   * Wait until allowed (blocks until rate limit resets)
   */
  async waitForAllowance(key: string, maxWaitMs = 60000): Promise<void> {
    const startTime = Date.now();

    while (true) {
      const result = this.check(key);
      if (result.allowed) {
        this.consume(key);
        return;
      }

      const waited = Date.now() - startTime;
      if (waited >= maxWaitMs) {
        throw new RateLimitError('Max wait time exceeded', result.retryAfter || 0);
      }

      // Wait until reset
      const waitTime = Math.min(result.retryAfter || 1000, maxWaitMs - waited);
      await this.sleep(waitTime);
    }
  }

  // ============================================
  // TOKEN BUCKET (Smooth Rate Limiting)
  // ============================================

  /**
   * Check and consume using token bucket (smoother rate limiting)
   *
   * @example
   * ```typescript
   * // Allow 10 requests per second with burst of 20
   * const allowed = limiter.tokenBucketCheck('user_123', {
   *   maxTokens: 20,
   *   refillRate: 10 / 1000 // 10 tokens per second
   * });
   * ```
   */
  tokenBucketCheck(
    key: string,
    config?: { maxTokens?: number; refillRate?: number }
  ): boolean {
    const fullKey = this.getFullKey(key);
    const now = Date.now();

    // Get or create bucket
    let bucket = this.buckets.get(fullKey);
    const maxTokens = config?.maxTokens || this.config.maxRequests;
    const refillRate = config?.refillRate || this.config.maxRequests / this.config.windowMs;

    if (!bucket) {
      bucket = {
        tokens: maxTokens,
        lastRefill: now,
        maxTokens,
        refillRate,
      };
    }

    // Refill tokens
    const elapsed = now - bucket.lastRefill;
    bucket.tokens = Math.min(bucket.maxTokens, bucket.tokens + elapsed * bucket.refillRate);
    bucket.lastRefill = now;

    // Check and consume
    if (bucket.tokens >= 1) {
      bucket.tokens--;
      this.buckets.set(fullKey, bucket);
      return true;
    }

    this.buckets.set(fullKey, bucket);
    return false;
  }

  // ============================================
  // SLIDING WINDOW
  // ============================================

  /**
   * Get current usage in sliding window
   */
  getUsage(key: string): { used: number; limit: number; remaining: number } {
    const fullKey = this.getFullKey(key);
    const { maxRequests } = this.getLimitForKey(key);
    const state = this.states.get(fullKey);

    const used = state?.count || 0;
    return {
      used,
      limit: maxRequests,
      remaining: Math.max(0, maxRequests - used),
    };
  }

  /**
   * Reset rate limit for a key
   */
  reset(key: string): void {
    const fullKey = this.getFullKey(key);
    this.states.delete(fullKey);
    this.buckets.delete(fullKey);
  }

  /**
   * Reset all rate limits
   */
  resetAll(): void {
    this.states.clear();
    this.buckets.clear();
  }

  // ============================================
  // HELPERS
  // ============================================

  private getFullKey(key: string): string {
    return this.config.keyPrefix ? `${this.config.keyPrefix}:${key}` : key;
  }

  private getLimitForKey(key: string): { maxRequests: number; windowMs: number } {
    // Check custom limits
    for (const custom of this.config.customLimits || []) {
      if (custom.pattern.test(key)) {
        return { maxRequests: custom.maxRequests, windowMs: custom.windowMs };
      }
    }

    // Default limits
    return {
      maxRequests: this.config.maxRequests,
      windowMs: this.config.windowMs,
    };
  }

  private cleanup(): void {
    const now = Date.now();

    // Clean up expired states
    for (const [key, state] of this.states.entries()) {
      if (now > state.resetAt + 60000) {
        this.states.delete(key);
      }
    }

    // Clean up old buckets
    for (const [key, bucket] of this.buckets.entries()) {
      if (now - bucket.lastRefill > this.config.windowMs * 2) {
        this.buckets.delete(key);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Rate Limit Error
 */
export class RateLimitError extends Error {
  public retryAfter: number;

  constructor(message: string, retryAfter: number) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Create a rate limiter
 *
 * @example
 * ```typescript
 * // Simple rate limiter
 * const limiter = createRateLimiter({
 *   maxRequests: 100,
 *   windowMs: 60000
 * });
 *
 * // With custom limits per user type
 * const limiter = createRateLimiter({
 *   maxRequests: 10,
 *   windowMs: 60000,
 *   customLimits: [
 *     { pattern: /^premium_/, maxRequests: 100, windowMs: 60000 },
 *     { pattern: /^api_/, maxRequests: 1000, windowMs: 60000 },
 *   ]
 * });
 * ```
 */
export function createRateLimiter(config: RateLimitConfig): RateLimiter {
  return new RateLimiter(config);
}

/**
 * Decorator for rate limiting methods
 *
 * @example
 * ```typescript
 * class PaymentService {
 *   @rateLimit({ maxRequests: 10, windowMs: 60000 })
 *   async processPayment(userId: string) {
 *     // ...
 *   }
 * }
 * ```
 */
export function rateLimit(config: RateLimitConfig) {
  const limiter = new RateLimiter(config);

  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      // Use first argument as key, or 'default'
      const key = typeof args[0] === 'string' ? args[0] : 'default';

      await limiter.acquire(key);
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

export default { RateLimiter, RateLimitError, createRateLimiter, rateLimit };
