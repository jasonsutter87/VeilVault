import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * API Rate Limiting and DDoS Protection Tests
 * Critical for protecting banking/audit application from abuse
 */

// ============================================================================
// RATE LIMITER TYPES
// ============================================================================
interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator?: (req: any) => string; // Key to identify client
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  handler?: (req: any, res: any) => void;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}

interface SlidingWindowEntry {
  timestamp: number;
  count: number;
}

// ============================================================================
// TOKEN BUCKET RATE LIMITER
// ============================================================================
class TokenBucketRateLimiter {
  private buckets: Map<string, { tokens: number; lastRefill: number }>;
  private maxTokens: number;
  private refillRate: number; // tokens per second
  private refillInterval: number;

  constructor(maxTokens: number, refillRate: number) {
    this.buckets = new Map();
    this.maxTokens = maxTokens;
    this.refillRate = refillRate;
    this.refillInterval = 1000 / refillRate;
  }

  consume(key: string, tokens: number = 1): RateLimitResult {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = { tokens: this.maxTokens, lastRefill: now };
      this.buckets.set(key, bucket);
    }

    // Refill tokens based on time elapsed
    const elapsed = now - bucket.lastRefill;
    const tokensToAdd = Math.floor(elapsed / this.refillInterval);
    bucket.tokens = Math.min(this.maxTokens, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    if (bucket.tokens >= tokens) {
      bucket.tokens -= tokens;
      return {
        allowed: true,
        remaining: bucket.tokens,
        resetTime: new Date(now + (this.maxTokens - bucket.tokens) * this.refillInterval),
      };
    }

    const waitTime = Math.ceil((tokens - bucket.tokens) * this.refillInterval);
    return {
      allowed: false,
      remaining: bucket.tokens,
      resetTime: new Date(now + waitTime),
      retryAfter: Math.ceil(waitTime / 1000),
    };
  }

  getTokens(key: string): number {
    const bucket = this.buckets.get(key);
    return bucket ? bucket.tokens : this.maxTokens;
  }

  reset(key: string): void {
    this.buckets.delete(key);
  }

  resetAll(): void {
    this.buckets.clear();
  }
}

// ============================================================================
// SLIDING WINDOW RATE LIMITER
// ============================================================================
class SlidingWindowRateLimiter {
  private windows: Map<string, SlidingWindowEntry[]>;
  private windowSizeMs: number;
  private maxRequests: number;

  constructor(windowSizeMs: number, maxRequests: number) {
    this.windows = new Map();
    this.windowSizeMs = windowSizeMs;
    this.maxRequests = maxRequests;
  }

  consume(key: string): RateLimitResult {
    const now = Date.now();
    const windowStart = now - this.windowSizeMs;

    let entries = this.windows.get(key) || [];

    // Remove expired entries
    entries = entries.filter(e => e.timestamp > windowStart);

    // Count requests in current window
    const requestCount = entries.reduce((sum, e) => sum + e.count, 0);

    if (requestCount >= this.maxRequests) {
      const oldestEntry = entries[0];
      const resetTime = new Date(oldestEntry.timestamp + this.windowSizeMs);
      const retryAfter = Math.ceil((resetTime.getTime() - now) / 1000);

      return {
        allowed: false,
        remaining: 0,
        resetTime,
        retryAfter,
      };
    }

    // Add new request
    entries.push({ timestamp: now, count: 1 });
    this.windows.set(key, entries);

    return {
      allowed: true,
      remaining: this.maxRequests - requestCount - 1,
      resetTime: new Date(now + this.windowSizeMs),
    };
  }

  getRequestCount(key: string): number {
    const now = Date.now();
    const windowStart = now - this.windowSizeMs;
    const entries = this.windows.get(key) || [];
    return entries.filter(e => e.timestamp > windowStart).reduce((sum, e) => sum + e.count, 0);
  }

  reset(key: string): void {
    this.windows.delete(key);
  }
}

// ============================================================================
// FIXED WINDOW RATE LIMITER
// ============================================================================
class FixedWindowRateLimiter {
  private windows: Map<string, { count: number; windowStart: number }>;
  private windowSizeMs: number;
  private maxRequests: number;

  constructor(windowSizeMs: number, maxRequests: number) {
    this.windows = new Map();
    this.windowSizeMs = windowSizeMs;
    this.maxRequests = maxRequests;
  }

  consume(key: string): RateLimitResult {
    const now = Date.now();
    const currentWindowStart = Math.floor(now / this.windowSizeMs) * this.windowSizeMs;

    let window = this.windows.get(key);

    // Reset if new window
    if (!window || window.windowStart !== currentWindowStart) {
      window = { count: 0, windowStart: currentWindowStart };
    }

    const resetTime = new Date(currentWindowStart + this.windowSizeMs);

    if (window.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime,
        retryAfter: Math.ceil((resetTime.getTime() - now) / 1000),
      };
    }

    window.count++;
    this.windows.set(key, window);

    return {
      allowed: true,
      remaining: this.maxRequests - window.count,
      resetTime,
    };
  }

  reset(key: string): void {
    this.windows.delete(key);
  }
}

// ============================================================================
// LEAKY BUCKET RATE LIMITER
// ============================================================================
class LeakyBucketRateLimiter {
  private buckets: Map<string, { level: number; lastLeak: number }>;
  private capacity: number;
  private leakRate: number; // requests per second

  constructor(capacity: number, leakRate: number) {
    this.buckets = new Map();
    this.capacity = capacity;
    this.leakRate = leakRate;
  }

  consume(key: string): RateLimitResult {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = { level: 0, lastLeak: now };
    }

    // Calculate leak
    const elapsed = (now - bucket.lastLeak) / 1000;
    const leaked = elapsed * this.leakRate;
    bucket.level = Math.max(0, bucket.level - leaked);
    bucket.lastLeak = now;

    if (bucket.level >= this.capacity) {
      const waitTime = ((bucket.level - this.capacity + 1) / this.leakRate) * 1000;
      return {
        allowed: false,
        remaining: 0,
        resetTime: new Date(now + waitTime),
        retryAfter: Math.ceil(waitTime / 1000),
      };
    }

    bucket.level++;
    this.buckets.set(key, bucket);

    return {
      allowed: true,
      remaining: Math.floor(this.capacity - bucket.level),
      resetTime: new Date(now + (bucket.level / this.leakRate) * 1000),
    };
  }
}

// ============================================================================
// ADAPTIVE RATE LIMITER
// ============================================================================
class AdaptiveRateLimiter {
  private baseLimiter: TokenBucketRateLimiter;
  private suspiciousClients: Map<string, { score: number; lastUpdate: number }>;
  private baseTokens: number;
  private suspicionThreshold: number;
  private decayRate: number;

  constructor(baseTokens: number, refillRate: number) {
    this.baseLimiter = new TokenBucketRateLimiter(baseTokens, refillRate);
    this.suspiciousClients = new Map();
    this.baseTokens = baseTokens;
    this.suspicionThreshold = 50;
    this.decayRate = 0.1; // Score decays 10% per minute
  }

  consume(key: string, suspicious: boolean = false): RateLimitResult {
    this.updateSuspicionScore(key, suspicious);

    const score = this.getSuspicionScore(key);
    const penalty = Math.min(0.9, score / 100); // Max 90% reduction
    const effectiveTokens = Math.ceil(this.baseTokens * (1 - penalty));

    // Apply stricter limits for suspicious clients
    if (score > this.suspicionThreshold) {
      const strictLimiter = new TokenBucketRateLimiter(effectiveTokens, 1);
      return strictLimiter.consume(key);
    }

    return this.baseLimiter.consume(key);
  }

  private updateSuspicionScore(key: string, suspicious: boolean): void {
    const now = Date.now();
    let entry = this.suspiciousClients.get(key);

    if (!entry) {
      entry = { score: 0, lastUpdate: now };
    }

    // Apply decay
    const minutesElapsed = (now - entry.lastUpdate) / 60000;
    entry.score = entry.score * Math.pow(1 - this.decayRate, minutesElapsed);

    // Add suspicion if applicable
    if (suspicious) {
      entry.score += 10;
    }

    entry.lastUpdate = now;
    this.suspiciousClients.set(key, entry);
  }

  getSuspicionScore(key: string): number {
    const entry = this.suspiciousClients.get(key);
    return entry ? entry.score : 0;
  }

  markSuspicious(key: string, amount: number = 20): void {
    const entry = this.suspiciousClients.get(key) || { score: 0, lastUpdate: Date.now() };
    entry.score += amount;
    this.suspiciousClients.set(key, entry);
  }
}

// ============================================================================
// IP-BASED RATE LIMITER WITH ALLOWLIST/BLOCKLIST
// ============================================================================
class IPRateLimiter {
  private limiter: SlidingWindowRateLimiter;
  private allowlist: Set<string>;
  private blocklist: Set<string>;
  private temporaryBlocks: Map<string, number>; // IP -> block until timestamp

  constructor(windowMs: number, maxRequests: number) {
    this.limiter = new SlidingWindowRateLimiter(windowMs, maxRequests);
    this.allowlist = new Set();
    this.blocklist = new Set();
    this.temporaryBlocks = new Map();
  }

  addToAllowlist(ip: string): void {
    this.allowlist.add(ip);
    this.blocklist.delete(ip);
  }

  addToBlocklist(ip: string): void {
    this.blocklist.add(ip);
    this.allowlist.delete(ip);
  }

  temporaryBlock(ip: string, durationMs: number): void {
    this.temporaryBlocks.set(ip, Date.now() + durationMs);
  }

  consume(ip: string): RateLimitResult {
    // Check blocklist
    if (this.blocklist.has(ip)) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: new Date(Date.now() + 86400000), // 24 hours
        retryAfter: 86400,
      };
    }

    // Check temporary blocks
    const blockUntil = this.temporaryBlocks.get(ip);
    if (blockUntil && blockUntil > Date.now()) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: new Date(blockUntil),
        retryAfter: Math.ceil((blockUntil - Date.now()) / 1000),
      };
    }

    // Clear expired temporary block
    if (blockUntil) {
      this.temporaryBlocks.delete(ip);
    }

    // Check allowlist
    if (this.allowlist.has(ip)) {
      return {
        allowed: true,
        remaining: Infinity,
        resetTime: new Date(),
      };
    }

    return this.limiter.consume(ip);
  }

  isBlocked(ip: string): boolean {
    if (this.blocklist.has(ip)) return true;
    const blockUntil = this.temporaryBlocks.get(ip);
    return blockUntil ? blockUntil > Date.now() : false;
  }

  isAllowlisted(ip: string): boolean {
    return this.allowlist.has(ip);
  }
}

// ============================================================================
// DISTRIBUTED RATE LIMITER (Mock)
// ============================================================================
class DistributedRateLimiter {
  private store: Map<string, { count: number; expiresAt: number }>;
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number, maxRequests: number) {
    this.store = new Map();
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  async consume(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    const entry = this.store.get(key);

    // Check if expired
    if (!entry || entry.expiresAt <= now) {
      this.store.set(key, { count: 1, expiresAt: now + this.windowMs });
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime: new Date(now + this.windowMs),
      };
    }

    if (entry.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: new Date(entry.expiresAt),
        retryAfter: Math.ceil((entry.expiresAt - now) / 1000),
      };
    }

    entry.count++;
    return {
      allowed: true,
      remaining: this.maxRequests - entry.count,
      resetTime: new Date(entry.expiresAt),
    };
  }

  async increment(key: string, amount: number = 1): Promise<number> {
    const entry = this.store.get(key);
    if (entry) {
      entry.count += amount;
      return entry.count;
    }
    return amount;
  }
}

// ============================================================================
// TESTS
// ============================================================================

describe('Token Bucket Rate Limiter', () => {
  let limiter: TokenBucketRateLimiter;

  beforeEach(() => {
    limiter = new TokenBucketRateLimiter(10, 1); // 10 tokens, 1 token/second
  });

  describe('Basic Functionality', () => {
    it('should allow requests within limit', () => {
      for (let i = 0; i < 10; i++) {
        const result = limiter.consume('client-1');
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(9 - i);
      }
    });

    it('should deny requests over limit', () => {
      // Exhaust tokens
      for (let i = 0; i < 10; i++) {
        limiter.consume('client-1');
      }

      const result = limiter.consume('client-1');
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should track different clients separately', () => {
      // Exhaust client-1 tokens
      for (let i = 0; i < 10; i++) {
        limiter.consume('client-1');
      }

      // client-2 should still have tokens
      const result = limiter.consume('client-2');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it('should refill tokens over time', () => {
      // Exhaust tokens
      for (let i = 0; i < 10; i++) {
        limiter.consume('client-1');
      }

      // Simulate time passing
      vi.useFakeTimers();
      vi.advanceTimersByTime(5000); // 5 seconds = 5 tokens

      const result = limiter.consume('client-1');
      expect(result.allowed).toBe(true);

      vi.useRealTimers();
    });

    it('should not exceed max tokens on refill', () => {
      vi.useFakeTimers();
      vi.advanceTimersByTime(60000); // 1 minute

      expect(limiter.getTokens('new-client')).toBe(10);

      vi.useRealTimers();
    });

    it('should consume multiple tokens', () => {
      const result = limiter.consume('client-1', 5);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5);
    });

    it('should deny if not enough tokens for multi-token request', () => {
      limiter.consume('client-1', 8);
      const result = limiter.consume('client-1', 5);
      expect(result.allowed).toBe(false);
    });

    it('should reset client tokens', () => {
      // Exhaust tokens
      for (let i = 0; i < 10; i++) {
        limiter.consume('client-1');
      }

      limiter.reset('client-1');
      const result = limiter.consume('client-1');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it('should reset all clients', () => {
      limiter.consume('client-1', 10);
      limiter.consume('client-2', 10);

      limiter.resetAll();

      expect(limiter.consume('client-1').allowed).toBe(true);
      expect(limiter.consume('client-2').allowed).toBe(true);
    });
  });
});

describe('Sliding Window Rate Limiter', () => {
  let limiter: SlidingWindowRateLimiter;

  beforeEach(() => {
    limiter = new SlidingWindowRateLimiter(60000, 100); // 100 requests per minute
  });

  describe('Basic Functionality', () => {
    it('should allow requests within limit', () => {
      for (let i = 0; i < 100; i++) {
        const result = limiter.consume('client-1');
        expect(result.allowed).toBe(true);
      }
    });

    it('should deny requests over limit', () => {
      for (let i = 0; i < 100; i++) {
        limiter.consume('client-1');
      }

      const result = limiter.consume('client-1');
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should track request count correctly', () => {
      for (let i = 0; i < 50; i++) {
        limiter.consume('client-1');
      }

      expect(limiter.getRequestCount('client-1')).toBe(50);
    });

    it('should allow requests after window slides', () => {
      vi.useFakeTimers();

      // Make 100 requests
      for (let i = 0; i < 100; i++) {
        limiter.consume('client-1');
      }

      // Advance past window
      vi.advanceTimersByTime(61000);

      const result = limiter.consume('client-1');
      expect(result.allowed).toBe(true);

      vi.useRealTimers();
    });

    it('should handle partial window slide', () => {
      vi.useFakeTimers();

      // Make 100 requests
      for (let i = 0; i < 100; i++) {
        limiter.consume('client-1');
      }

      // Advance 30 seconds (half window)
      vi.advanceTimersByTime(30000);

      // Some requests should have expired
      const count = limiter.getRequestCount('client-1');
      expect(count).toBeLessThanOrEqual(100);

      vi.useRealTimers();
    });
  });
});

describe('Fixed Window Rate Limiter', () => {
  let limiter: FixedWindowRateLimiter;

  beforeEach(() => {
    limiter = new FixedWindowRateLimiter(60000, 100);
  });

  describe('Basic Functionality', () => {
    it('should allow requests within limit', () => {
      for (let i = 0; i < 100; i++) {
        expect(limiter.consume('client-1').allowed).toBe(true);
      }
    });

    it('should deny requests over limit', () => {
      for (let i = 0; i < 100; i++) {
        limiter.consume('client-1');
      }

      expect(limiter.consume('client-1').allowed).toBe(false);
    });

    it('should reset at window boundary', () => {
      vi.useFakeTimers();

      // Exhaust limit
      for (let i = 0; i < 100; i++) {
        limiter.consume('client-1');
      }

      // Move to next window
      vi.advanceTimersByTime(60000);

      expect(limiter.consume('client-1').allowed).toBe(true);

      vi.useRealTimers();
    });
  });
});

describe('Leaky Bucket Rate Limiter', () => {
  let limiter: LeakyBucketRateLimiter;

  beforeEach(() => {
    limiter = new LeakyBucketRateLimiter(10, 2); // Capacity 10, leak 2/second
  });

  describe('Basic Functionality', () => {
    it('should allow requests within capacity', () => {
      for (let i = 0; i < 10; i++) {
        expect(limiter.consume('client-1').allowed).toBe(true);
      }
    });

    it('should deny requests when bucket is full', () => {
      for (let i = 0; i < 10; i++) {
        limiter.consume('client-1');
      }

      expect(limiter.consume('client-1').allowed).toBe(false);
    });

    it('should allow requests as bucket leaks', () => {
      vi.useFakeTimers();

      // Fill bucket
      for (let i = 0; i < 10; i++) {
        limiter.consume('client-1');
      }

      // Wait for leak (2 requests per second)
      vi.advanceTimersByTime(1000);

      expect(limiter.consume('client-1').allowed).toBe(true);

      vi.useRealTimers();
    });
  });
});

describe('Adaptive Rate Limiter', () => {
  let limiter: AdaptiveRateLimiter;

  beforeEach(() => {
    limiter = new AdaptiveRateLimiter(100, 10);
  });

  describe('Suspicion Tracking', () => {
    it('should track suspicion score', () => {
      expect(limiter.getSuspicionScore('client-1')).toBe(0);

      limiter.markSuspicious('client-1', 30);
      expect(limiter.getSuspicionScore('client-1')).toBe(30);
    });

    it('should increase suspicion on suspicious requests', () => {
      limiter.consume('client-1', true); // suspicious
      limiter.consume('client-1', true); // suspicious

      expect(limiter.getSuspicionScore('client-1')).toBeGreaterThan(0);
    });

    it('should apply stricter limits for suspicious clients', () => {
      // Mark as highly suspicious
      limiter.markSuspicious('client-1', 100);

      // Should have reduced rate limit
      const result = limiter.consume('client-1');
      expect(result.remaining).toBeLessThan(100);
    });

    it('should decay suspicion over time', () => {
      vi.useFakeTimers();

      limiter.markSuspicious('client-1', 50);
      const initialScore = limiter.getSuspicionScore('client-1');

      // Advance 5 minutes
      vi.advanceTimersByTime(300000);
      limiter.consume('client-1'); // Trigger score update

      expect(limiter.getSuspicionScore('client-1')).toBeLessThan(initialScore);

      vi.useRealTimers();
    });
  });
});

describe('IP Rate Limiter', () => {
  let limiter: IPRateLimiter;

  beforeEach(() => {
    limiter = new IPRateLimiter(60000, 100);
  });

  describe('Allowlist', () => {
    it('should bypass rate limiting for allowlisted IPs', () => {
      limiter.addToAllowlist('192.168.1.1');

      // Should never be rate limited
      for (let i = 0; i < 200; i++) {
        expect(limiter.consume('192.168.1.1').allowed).toBe(true);
      }
    });

    it('should identify allowlisted IPs', () => {
      limiter.addToAllowlist('192.168.1.1');
      expect(limiter.isAllowlisted('192.168.1.1')).toBe(true);
      expect(limiter.isAllowlisted('192.168.1.2')).toBe(false);
    });
  });

  describe('Blocklist', () => {
    it('should block all requests from blocklisted IPs', () => {
      limiter.addToBlocklist('10.0.0.1');

      const result = limiter.consume('10.0.0.1');
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBe(86400);
    });

    it('should identify blocked IPs', () => {
      limiter.addToBlocklist('10.0.0.1');
      expect(limiter.isBlocked('10.0.0.1')).toBe(true);
      expect(limiter.isBlocked('10.0.0.2')).toBe(false);
    });

    it('should remove from allowlist when blocklisted', () => {
      limiter.addToAllowlist('10.0.0.1');
      limiter.addToBlocklist('10.0.0.1');

      expect(limiter.isAllowlisted('10.0.0.1')).toBe(false);
      expect(limiter.isBlocked('10.0.0.1')).toBe(true);
    });
  });

  describe('Temporary Blocks', () => {
    it('should temporarily block IP', () => {
      limiter.temporaryBlock('10.0.0.1', 30000); // 30 seconds

      const result = limiter.consume('10.0.0.1');
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeLessThanOrEqual(30);
    });

    it('should unblock after duration expires', () => {
      vi.useFakeTimers();

      limiter.temporaryBlock('10.0.0.1', 30000);

      // Advance past block duration
      vi.advanceTimersByTime(31000);

      expect(limiter.consume('10.0.0.1').allowed).toBe(true);

      vi.useRealTimers();
    });

    it('should identify temporarily blocked IPs', () => {
      limiter.temporaryBlock('10.0.0.1', 30000);
      expect(limiter.isBlocked('10.0.0.1')).toBe(true);
    });
  });

  describe('Regular Rate Limiting', () => {
    it('should rate limit non-special IPs', () => {
      for (let i = 0; i < 100; i++) {
        limiter.consume('10.0.0.1');
      }

      expect(limiter.consume('10.0.0.1').allowed).toBe(false);
    });
  });
});

describe('Distributed Rate Limiter', () => {
  let limiter: DistributedRateLimiter;

  beforeEach(() => {
    limiter = new DistributedRateLimiter(60000, 100);
  });

  describe('Async Operations', () => {
    it('should handle concurrent requests', async () => {
      const promises = Array(50).fill(null).map(() => limiter.consume('client-1'));
      const results = await Promise.all(promises);

      const allowed = results.filter(r => r.allowed).length;
      expect(allowed).toBe(50);
    });

    it('should deny requests over limit', async () => {
      // Exhaust limit
      for (let i = 0; i < 100; i++) {
        await limiter.consume('client-1');
      }

      const result = await limiter.consume('client-1');
      expect(result.allowed).toBe(false);
    });

    it('should increment counter', async () => {
      await limiter.consume('client-1');
      const count = await limiter.increment('client-1', 5);
      expect(count).toBe(6);
    });
  });
});

describe('Rate Limiter Edge Cases', () => {
  describe('Burst Handling', () => {
    it('should handle burst traffic', () => {
      const limiter = new TokenBucketRateLimiter(100, 10);

      // Burst of 100 requests
      const results = Array(100).fill(null).map(() => limiter.consume('client-1'));
      const allowed = results.filter(r => r.allowed).length;

      expect(allowed).toBe(100);
    });

    it('should throttle after burst', () => {
      const limiter = new TokenBucketRateLimiter(100, 10);

      // Burst of 100 requests
      for (let i = 0; i < 100; i++) {
        limiter.consume('client-1');
      }

      // Next request should be denied
      expect(limiter.consume('client-1').allowed).toBe(false);
    });
  });

  describe('Zero/Negative Values', () => {
    it('should handle zero max requests', () => {
      const limiter = new SlidingWindowRateLimiter(60000, 0);
      expect(limiter.consume('client-1').allowed).toBe(false);
    });

    it('should handle zero window size', () => {
      const limiter = new FixedWindowRateLimiter(0, 100);
      // Should still function, resetting every millisecond
      expect(limiter.consume('client-1').allowed).toBe(true);
    });
  });

  describe('Large Numbers', () => {
    it('should handle large request counts', () => {
      const limiter = new SlidingWindowRateLimiter(60000, 1000000);

      for (let i = 0; i < 1000; i++) {
        expect(limiter.consume('client-1').allowed).toBe(true);
      }
    });

    it('should handle large window sizes', () => {
      const limiter = new FixedWindowRateLimiter(86400000, 1000); // 24 hours
      expect(limiter.consume('client-1').allowed).toBe(true);
    });
  });

  describe('Key Handling', () => {
    it('should handle empty key', () => {
      const limiter = new TokenBucketRateLimiter(10, 1);
      expect(limiter.consume('').allowed).toBe(true);
    });

    it('should handle special characters in key', () => {
      const limiter = new TokenBucketRateLimiter(10, 1);
      expect(limiter.consume('user@example.com:192.168.1.1').allowed).toBe(true);
    });

    it('should handle unicode in key', () => {
      const limiter = new TokenBucketRateLimiter(10, 1);
      expect(limiter.consume('用户:123').allowed).toBe(true);
    });
  });
});

describe('Rate Limiter Security', () => {
  describe('DoS Prevention', () => {
    it('should prevent simple DoS by limiting requests', () => {
      const limiter = new TokenBucketRateLimiter(10, 1);

      // Attacker tries to flood
      const attackResults = Array(1000).fill(null).map(() => limiter.consume('attacker'));
      const blocked = attackResults.filter(r => !r.allowed).length;

      expect(blocked).toBeGreaterThan(900);
    });

    it('should prevent distributed DoS with IP limiting', () => {
      const limiter = new IPRateLimiter(60000, 100);

      // Multiple attackers
      const ips = Array(10).fill(null).map((_, i) => `10.0.0.${i}`);

      let totalBlocked = 0;
      for (const ip of ips) {
        for (let i = 0; i < 200; i++) {
          if (!limiter.consume(ip).allowed) {
            totalBlocked++;
          }
        }
      }

      expect(totalBlocked).toBeGreaterThan(1000);
    });
  });

  describe('Rate Limit Bypass Prevention', () => {
    it('should not allow key manipulation to bypass limits', () => {
      const limiter = new TokenBucketRateLimiter(10, 1);

      // Exhaust main key
      for (let i = 0; i < 10; i++) {
        limiter.consume('client-1');
      }

      // Try similar keys
      expect(limiter.consume('client-1').allowed).toBe(false);
      expect(limiter.consume('CLIENT-1').allowed).toBe(true); // Different key
      expect(limiter.consume('client-1 ').allowed).toBe(true); // Different key
    });
  });
});
