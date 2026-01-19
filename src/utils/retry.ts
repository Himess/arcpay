/**
 * Retry and Resilience Layer
 *
 * Features:
 * - Exponential backoff with jitter
 * - Circuit breaker pattern
 * - Fallback support
 * - Timeout handling
 */

import {
  ArcPayError,
  NetworkError,
  RateLimitError,
  OperationTimeoutError,
  isRetryableError,
  wrapError,
  ErrorCodes,
} from './errors';

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Initial delay in milliseconds (alias: baseDelay) */
  initialDelayMs: number;
  /** Maximum delay in milliseconds */
  maxDelayMs: number;
  /** Backoff multiplier */
  backoffMultiplier: number;
  /** Add jitter to prevent thundering herd */
  jitter: boolean;
  /** Timeout for each attempt in milliseconds */
  timeoutMs?: number;
  /** Custom retry condition */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  /** Callback on retry */
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
  /** List of error codes that should trigger retry */
  retryableErrors?: string[];
}

/**
 * Simplified retry configuration (for agent/module use)
 */
export interface SimpleRetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts?: number;
  /** Base delay in milliseconds (default: 1000) */
  baseDelay?: number;
  /** Maximum delay in milliseconds (default: 30000) */
  maxDelay?: number;
  /** Backoff multiplier (default: 2) */
  backoffMultiplier?: number;
  /** Error codes that should trigger retry (e.g., ['NETWORK_ERROR', 'TIMEOUT', 'RPC_ERROR']) */
  retryableErrors?: string[];
  /** Callback on retry */
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitter: true,
  timeoutMs: 30000,
};

/**
 * Circuit breaker state
 */
export type CircuitState = 'closed' | 'open' | 'half-open';

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit */
  failureThreshold: number;
  /** Time to wait before trying again (ms) */
  resetTimeoutMs: number;
  /** Number of successful calls to close circuit */
  successThreshold: number;
  /** Callback on state change */
  onStateChange?: (from: CircuitState, to: CircuitState) => void;
}

/**
 * Default circuit breaker configuration
 */
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 60000,
  successThreshold: 3,
};

/**
 * Calculate delay with exponential backoff and optional jitter
 */
export function calculateDelay(
  attempt: number,
  config: Pick<RetryConfig, 'initialDelayMs' | 'maxDelayMs' | 'backoffMultiplier' | 'jitter'>
): number {
  const exponentialDelay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
  const boundedDelay = Math.min(exponentialDelay, config.maxDelayMs);

  if (config.jitter) {
    // Add random jitter (±25%)
    const jitterRange = boundedDelay * 0.25;
    const jitter = Math.random() * jitterRange * 2 - jitterRange;
    return Math.max(0, Math.round(boundedDelay + jitter));
  }

  return Math.round(boundedDelay);
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute with timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string = 'Operation'
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new OperationTimeoutError(operation, timeoutMs));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

/**
 * Check if error matches retryable error codes
 */
function matchesRetryableErrors(error: unknown, retryableErrors: string[]): boolean {
  if (error instanceof ArcPayError) {
    // Check error name
    if (retryableErrors.includes(error.name)) return true;

    // Check category
    if (retryableErrors.includes(error.category)) return true;

    // Check error code string representation
    const codeStr = String(error.code);
    if (retryableErrors.includes(codeStr)) return true;
  }

  if (error instanceof Error) {
    // Check common error patterns
    const message = error.message.toLowerCase();
    for (const retryable of retryableErrors) {
      const pattern = retryable.toLowerCase();
      if (message.includes(pattern)) return true;
    }
  }

  return false;
}

/**
 * Retry an async operation with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const mergedConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: unknown;

  for (let attempt = 1; attempt <= mergedConfig.maxAttempts; attempt++) {
    try {
      // Execute with timeout if configured
      const result = mergedConfig.timeoutMs
        ? await withTimeout(fn(), mergedConfig.timeoutMs, 'retry operation')
        : await fn();
      return result;
    } catch (error) {
      lastError = error;

      // Check if we should retry
      let shouldRetry: boolean;
      if (mergedConfig.shouldRetry) {
        shouldRetry = mergedConfig.shouldRetry(error, attempt);
      } else if (mergedConfig.retryableErrors && mergedConfig.retryableErrors.length > 0) {
        shouldRetry = matchesRetryableErrors(error, mergedConfig.retryableErrors);
      } else {
        shouldRetry = isRetryableError(error);
      }

      if (!shouldRetry || attempt >= mergedConfig.maxAttempts) {
        throw wrapError(error, `Failed after ${attempt} attempts`);
      }

      // Calculate delay
      const delay = calculateDelay(attempt, mergedConfig);

      // Handle rate limit errors with specific delay
      if (error instanceof RateLimitError && error.metadata?.retryAfterMs) {
        const rateLimitDelay = error.metadata.retryAfterMs as number;
        mergedConfig.onRetry?.(error, attempt, rateLimitDelay);
        await sleep(rateLimitDelay);
      } else {
        mergedConfig.onRetry?.(error, attempt, delay);
        await sleep(delay);
      }
    }
  }

  throw wrapError(lastError, `Failed after ${mergedConfig.maxAttempts} attempts`);
}

/**
 * Simple retry wrapper with defaults optimized for RPC calls
 *
 * @example
 * ```typescript
 * const result = await simpleRetry(
 *   () => client.sendTransaction(tx),
 *   {
 *     maxAttempts: 3,
 *     baseDelay: 1000,
 *     retryableErrors: ['NETWORK_ERROR', 'TIMEOUT', 'RPC_ERROR'],
 *     onRetry: (attempt, error) => {
 *       console.log(`Retry ${attempt}: ${error.message}`);
 *     }
 *   }
 * );
 * ```
 */
export async function simpleRetry<T>(
  fn: () => Promise<T>,
  config?: SimpleRetryConfig
): Promise<T> {
  return retry(fn, {
    maxAttempts: config?.maxAttempts ?? 3,
    initialDelayMs: config?.baseDelay ?? 1000,
    maxDelayMs: config?.maxDelay ?? 30000,
    backoffMultiplier: config?.backoffMultiplier ?? 2,
    jitter: true,
    retryableErrors: config?.retryableErrors,
    onRetry: config?.onRetry
      ? (error, attempt, _delay) => {
          config.onRetry!(attempt, error instanceof Error ? error : new Error(String(error)));
        }
      : undefined,
  });
}

/**
 * Circuit Breaker implementation
 */
export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime: number = 0;
  private config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config };
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Check if circuit allows requests
   */
  isAllowed(): boolean {
    if (this.state === 'closed') {
      return true;
    }

    if (this.state === 'open') {
      // Check if reset timeout has elapsed
      if (Date.now() - this.lastFailureTime >= this.config.resetTimeoutMs) {
        this.transitionTo('half-open');
        return true;
      }
      return false;
    }

    // Half-open: allow one request
    return true;
  }

  /**
   * Record a successful call
   */
  recordSuccess(): void {
    if (this.state === 'half-open') {
      this.successes++;
      if (this.successes >= this.config.successThreshold) {
        this.transitionTo('closed');
        this.reset();
      }
    } else if (this.state === 'closed') {
      // Reset failure count on success
      this.failures = 0;
    }
  }

  /**
   * Record a failed call
   */
  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'half-open') {
      this.transitionTo('open');
      this.successes = 0;
    } else if (this.state === 'closed' && this.failures >= this.config.failureThreshold) {
      this.transitionTo('open');
    }
  }

  /**
   * Reset the circuit breaker
   */
  reset(): void {
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = 0;
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.isAllowed()) {
      throw new ArcPayError(
        'Circuit breaker is open. Service is temporarily unavailable.',
        ErrorCodes.NETWORK_ERROR,
        'NETWORK',
        {
          retryable: true,
          recovery: `Wait ${Math.ceil(
            (this.config.resetTimeoutMs - (Date.now() - this.lastFailureTime)) / 1000
          )} seconds before retrying.`,
        }
      );
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;
    this.config.onStateChange?.(oldState, newState);
  }
}

/**
 * Fallback RPC configuration
 */
export interface FallbackRPCConfig {
  /** List of RPC endpoints in order of preference */
  endpoints: string[];
  /** Retry configuration for each endpoint */
  retryConfig?: Partial<RetryConfig>;
  /** Circuit breaker for each endpoint */
  useCircuitBreaker?: boolean;
  /** Circuit breaker configuration */
  circuitBreakerConfig?: Partial<CircuitBreakerConfig>;
}

/**
 * Fallback RPC Manager
 */
export class FallbackRPCManager {
  private endpoints: string[];
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private config: FallbackRPCConfig;

  constructor(config: FallbackRPCConfig) {
    this.config = config;
    this.endpoints = config.endpoints;

    if (config.useCircuitBreaker) {
      for (const endpoint of this.endpoints) {
        this.circuitBreakers.set(
          endpoint,
          new CircuitBreaker(config.circuitBreakerConfig)
        );
      }
    }
  }

  /**
   * Execute a request with fallback support
   */
  async execute<T>(
    fn: (endpoint: string) => Promise<T>,
    operation: string = 'RPC call'
  ): Promise<T> {
    const errors: Array<{ endpoint: string; error: unknown }> = [];

    for (const endpoint of this.endpoints) {
      const circuitBreaker = this.circuitBreakers.get(endpoint);

      // Skip if circuit breaker is open
      if (circuitBreaker && !circuitBreaker.isAllowed()) {
        continue;
      }

      try {
        const result = await retry(
          () => fn(endpoint),
          this.config.retryConfig
        );

        circuitBreaker?.recordSuccess();
        return result;
      } catch (error) {
        circuitBreaker?.recordFailure();
        errors.push({ endpoint, error });
      }
    }

    // All endpoints failed
    throw new NetworkError(
      `${operation} failed on all ${this.endpoints.length} endpoints`,
      {
        metadata: {
          endpoints: this.endpoints,
          errors: errors.map((e) => ({
            endpoint: e.endpoint,
            message: e.error instanceof Error ? e.error.message : String(e.error),
          })),
        },
      }
    );
  }

  /**
   * Get the first available endpoint
   */
  getAvailableEndpoint(): string | null {
    for (const endpoint of this.endpoints) {
      const circuitBreaker = this.circuitBreakers.get(endpoint);
      if (!circuitBreaker || circuitBreaker.isAllowed()) {
        return endpoint;
      }
    }
    return null;
  }

  /**
   * Add a new endpoint
   */
  addEndpoint(endpoint: string): void {
    if (!this.endpoints.includes(endpoint)) {
      this.endpoints.push(endpoint);
      if (this.config.useCircuitBreaker) {
        this.circuitBreakers.set(
          endpoint,
          new CircuitBreaker(this.config.circuitBreakerConfig)
        );
      }
    }
  }

  /**
   * Remove an endpoint
   */
  removeEndpoint(endpoint: string): void {
    const index = this.endpoints.indexOf(endpoint);
    if (index !== -1) {
      this.endpoints.splice(index, 1);
      this.circuitBreakers.delete(endpoint);
    }
  }

  /**
   * Get circuit breaker state for an endpoint
   */
  getCircuitState(endpoint: string): CircuitState | null {
    return this.circuitBreakers.get(endpoint)?.getState() ?? null;
  }
}

/**
 * Create a retryable function wrapper
 */
export function withRetry<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  config: Partial<RetryConfig> = {}
): T {
  return (async (...args: Parameters<T>) => {
    return retry(() => fn(...args) as Promise<ReturnType<T>>, config);
  }) as T;
}

/**
 * Batch executor with concurrency control
 */
export async function batchExecute<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  options: {
    concurrency?: number;
    retryConfig?: Partial<RetryConfig>;
    onProgress?: (completed: number, total: number) => void;
  } = {}
): Promise<Array<{ success: boolean; result?: R; error?: unknown; item: T }>> {
  const { concurrency = 5, retryConfig, onProgress } = options;
  const results: Array<{ success: boolean; result?: R; error?: unknown; item: T }> = [];
  let completed = 0;

  const executeOne = async (item: T, index: number) => {
    try {
      const result = await retry(() => fn(item, index), retryConfig);
      results[index] = { success: true, result, item };
    } catch (error) {
      results[index] = { success: false, error, item };
    }

    completed++;
    onProgress?.(completed, items.length);
  };

  // Process in batches
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    await Promise.all(batch.map((item, j) => executeOne(item, i + j)));
  }

  return results;
}

/**
 * Debounce a function
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delayMs: number
): T & { cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const debounced = ((...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delayMs);
  }) as T & { cancel: () => void };

  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debounced;
}

/**
 * Throttle a function
 */
export function throttle<T extends (...args: unknown[]) => void>(
  fn: T,
  limitMs: number
): T {
  let lastCall = 0;

  return ((...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= limitMs) {
      lastCall = now;
      fn(...args);
    }
  }) as T;
}
