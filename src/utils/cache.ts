/**
 * ArcPay SDK - Caching Layer
 *
 * Provides in-memory caching for RPC calls to reduce network requests
 * and improve performance for frequently accessed data like balances.
 *
 * Features:
 * - TTL-based cache expiration
 * - Automatic stale data removal
 * - Cache statistics
 * - Manual invalidation
 */

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
}

export interface CacheConfig {
  /** Default TTL in milliseconds (default: 10000 = 10 seconds) */
  defaultTTL?: number;
  /** Maximum cache entries (default: 1000) */
  maxEntries?: number;
  /** Enable cache statistics (default: false) */
  enableStats?: boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

/**
 * Simple in-memory cache with TTL support
 */
export class Cache<T = unknown> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private config: Required<CacheConfig>;
  private stats = { hits: 0, misses: 0 };

  constructor(config: CacheConfig = {}) {
    this.config = {
      defaultTTL: config.defaultTTL ?? 10000, // 10 seconds
      maxEntries: config.maxEntries ?? 1000,
      enableStats: config.enableStats ?? false,
    };

    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Get a value from cache
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      if (this.config.enableStats) this.stats.misses++;
      return undefined;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      if (this.config.enableStats) this.stats.misses++;
      return undefined;
    }

    if (this.config.enableStats) this.stats.hits++;
    return entry.value;
  }

  /**
   * Set a value in cache
   */
  set(key: string, value: T, ttl?: number): void {
    // Enforce max entries
    if (this.cache.size >= this.config.maxEntries) {
      this.evictOldest();
    }

    const now = Date.now();
    this.cache.set(key, {
      value,
      expiresAt: now + (ttl ?? this.config.defaultTTL),
      createdAt: now,
    });
  }

  /**
   * Get or set a value (useful for async operations)
   */
  async getOrSet(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await fetcher();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Delete a specific key
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Delete all keys matching a pattern
   */
  deletePattern(pattern: string | RegExp): number {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    let deleted = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deleted++;
      }
    }

    return deleted;
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }

  /**
   * Get all keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Evict the oldest entry
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Start periodic cleanup
   */
  private startCleanupInterval(): void {
    // Run cleanup every minute
    setInterval(() => this.cleanup(), 60000);
  }
}

// ============================================
// SPECIALIZED CACHES
// ============================================

/**
 * Balance cache with address-based keys
 */
export class BalanceCache extends Cache<string> {
  constructor(ttl: number = 5000) {
    super({ defaultTTL: ttl, enableStats: true });
  }

  /**
   * Get cached balance for an address
   */
  getBalance(address: string, token: string = 'USDC'): string | undefined {
    const key = this.makeKey(address, token);
    return this.get(key);
  }

  /**
   * Set cached balance for an address
   */
  setBalance(address: string, balance: string, token: string = 'USDC'): void {
    const key = this.makeKey(address, token);
    this.set(key, balance);
  }

  /**
   * Invalidate balance cache for an address (after a transfer)
   */
  invalidateAddress(address: string): number {
    return this.deletePattern(new RegExp(`^balance:${address.toLowerCase()}:`));
  }

  /**
   * Get or fetch balance
   */
  async getOrFetchBalance(
    address: string,
    fetcher: () => Promise<string>,
    token: string = 'USDC'
  ): Promise<string> {
    const key = this.makeKey(address, token);
    return this.getOrSet(key, fetcher);
  }

  private makeKey(address: string, token: string): string {
    return `balance:${address.toLowerCase()}:${token}`;
  }
}

/**
 * Contract call cache for read-only contract calls
 */
export class ContractCache extends Cache<unknown> {
  constructor(ttl: number = 30000) {
    super({ defaultTTL: ttl, enableStats: true });
  }

  /**
   * Get cached contract call result
   */
  getCall(contract: string, method: string, args: unknown[]): unknown | undefined {
    const key = this.makeKey(contract, method, args);
    return this.get(key);
  }

  /**
   * Set cached contract call result
   */
  setCall(contract: string, method: string, args: unknown[], result: unknown): void {
    const key = this.makeKey(contract, method, args);
    this.set(key, result);
  }

  /**
   * Invalidate all cache for a contract
   */
  invalidateContract(contract: string): number {
    return this.deletePattern(new RegExp(`^contract:${contract.toLowerCase()}:`));
  }

  private makeKey(contract: string, method: string, args: unknown[]): string {
    const argsHash = JSON.stringify(args);
    return `contract:${contract.toLowerCase()}:${method}:${argsHash}`;
  }
}

// ============================================
// GLOBAL INSTANCES
// ============================================

/** Global balance cache instance */
export const balanceCache = new BalanceCache();

/** Global contract cache instance */
export const contractCache = new ContractCache();

/**
 * Create a new cache instance
 */
export function createCache<T>(config?: CacheConfig): Cache<T> {
  return new Cache<T>(config);
}

/**
 * Create a balance cache
 */
export function createBalanceCache(ttl?: number): BalanceCache {
  return new BalanceCache(ttl);
}

/**
 * Create a contract cache
 */
export function createContractCache(ttl?: number): ContractCache {
  return new ContractCache(ttl);
}
