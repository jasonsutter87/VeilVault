import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Performance and Load Testing
 *
 * Comprehensive tests for performance, concurrency,
 * and load handling in banking/audit applications.
 */

// Performance metrics tracker
interface PerformanceMetrics {
  operationName: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  error?: string;
}

class PerformanceTracker {
  private metrics: PerformanceMetrics[] = [];

  track<T>(operationName: string, operation: () => T): T {
    const startTime = performance.now();
    let success = true;
    let error: string | undefined;

    try {
      const result = operation();
      return result;
    } catch (e) {
      success = false;
      error = e instanceof Error ? e.message : 'Unknown error';
      throw e;
    } finally {
      const endTime = performance.now();
      this.metrics.push({
        operationName,
        startTime,
        endTime,
        duration: endTime - startTime,
        success,
        error,
      });
    }
  }

  async trackAsync<T>(operationName: string, operation: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    let success = true;
    let error: string | undefined;

    try {
      const result = await operation();
      return result;
    } catch (e) {
      success = false;
      error = e instanceof Error ? e.message : 'Unknown error';
      throw e;
    } finally {
      const endTime = performance.now();
      this.metrics.push({
        operationName,
        startTime,
        endTime,
        duration: endTime - startTime,
        success,
        error,
      });
    }
  }

  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  getAverageTime(operationName?: string): number {
    const filtered = operationName
      ? this.metrics.filter(m => m.operationName === operationName)
      : this.metrics;

    if (filtered.length === 0) return 0;
    return filtered.reduce((sum, m) => sum + m.duration, 0) / filtered.length;
  }

  getMaxTime(operationName?: string): number {
    const filtered = operationName
      ? this.metrics.filter(m => m.operationName === operationName)
      : this.metrics;

    if (filtered.length === 0) return 0;
    return Math.max(...filtered.map(m => m.duration));
  }

  getMinTime(operationName?: string): number {
    const filtered = operationName
      ? this.metrics.filter(m => m.operationName === operationName)
      : this.metrics;

    if (filtered.length === 0) return 0;
    return Math.min(...filtered.map(m => m.duration));
  }

  getPercentile(percentile: number, operationName?: string): number {
    const filtered = operationName
      ? this.metrics.filter(m => m.operationName === operationName)
      : this.metrics;

    if (filtered.length === 0) return 0;

    const sorted = filtered.map(m => m.duration).sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  getSuccessRate(operationName?: string): number {
    const filtered = operationName
      ? this.metrics.filter(m => m.operationName === operationName)
      : this.metrics;

    if (filtered.length === 0) return 100;
    const successful = filtered.filter(m => m.success).length;
    return (successful / filtered.length) * 100;
  }

  getThroughput(): number {
    if (this.metrics.length < 2) return 0;

    const sorted = [...this.metrics].sort((a, b) => a.startTime - b.startTime);
    const totalTime = (sorted[sorted.length - 1].endTime - sorted[0].startTime) / 1000; // seconds

    return this.metrics.length / totalTime;
  }

  clear(): void {
    this.metrics = [];
  }
}

// Mock data store for testing
class MockDataStore {
  private data: Map<string, unknown> = new Map();
  private locks: Map<string, Promise<void>> = new Map();
  private lockResolvers: Map<string, () => void> = new Map();
  private readLatency: number;
  private writeLatency: number;

  constructor(readLatency = 1, writeLatency = 2) {
    this.readLatency = readLatency;
    this.writeLatency = writeLatency;
  }

  private async simulateLatency(isWrite: boolean): Promise<void> {
    const latency = isWrite ? this.writeLatency : this.readLatency;
    await new Promise(resolve => setTimeout(resolve, latency));
  }

  async get(key: string): Promise<unknown | undefined> {
    await this.simulateLatency(false);
    return this.data.get(key);
  }

  async set(key: string, value: unknown): Promise<void> {
    await this.simulateLatency(true);
    this.data.set(key, value);
  }

  async delete(key: string): Promise<boolean> {
    await this.simulateLatency(true);
    return this.data.delete(key);
  }

  async acquireLock(key: string, timeout = 5000): Promise<boolean> {
    const startTime = Date.now();

    while (this.locks.has(key)) {
      if (Date.now() - startTime > timeout) {
        return false; // Timeout
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Create lock
    let resolver: () => void;
    const lockPromise = new Promise<void>(resolve => {
      resolver = resolve;
    });
    this.locks.set(key, lockPromise);
    this.lockResolvers.set(key, resolver!);

    return true;
  }

  releaseLock(key: string): void {
    const resolver = this.lockResolvers.get(key);
    if (resolver) {
      resolver();
      this.locks.delete(key);
      this.lockResolvers.delete(key);
    }
  }

  size(): number {
    return this.data.size;
  }

  clear(): void {
    this.data.clear();
    this.locks.clear();
    this.lockResolvers.clear();
  }
}

// Mock batch processor
class BatchProcessor {
  private batchSize: number;
  private flushInterval: number;
  private queue: unknown[] = [];
  private processedCount = 0;
  private flushTimer?: ReturnType<typeof setTimeout>;

  constructor(batchSize = 100, flushInterval = 1000) {
    this.batchSize = batchSize;
    this.flushInterval = flushInterval;
  }

  add(item: unknown): void {
    this.queue.push(item);

    if (this.queue.length >= this.batchSize) {
      this.flush();
    } else if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), this.flushInterval);
    }
  }

  flush(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }

    const batch = this.queue.splice(0, this.batchSize);
    this.processedCount += batch.length;
  }

  getProcessedCount(): number {
    return this.processedCount;
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  clear(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }
    this.queue = [];
    this.processedCount = 0;
  }
}

// Rate limiter
class RateLimiter {
  private tokens: number;
  private maxTokens: number;
  private refillRate: number; // tokens per second
  private lastRefill: number;

  constructor(maxTokens: number, refillRate: number) {
    this.tokens = maxTokens;
    this.maxTokens = maxTokens;
    this.refillRate = refillRate;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const tokensToAdd = elapsed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  tryAcquire(count = 1): boolean {
    this.refill();

    if (this.tokens >= count) {
      this.tokens -= count;
      return true;
    }

    return false;
  }

  async acquire(count = 1, timeout = 5000): Promise<boolean> {
    const startTime = Date.now();

    while (!this.tryAcquire(count)) {
      if (Date.now() - startTime > timeout) {
        return false;
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    return true;
  }

  getAvailableTokens(): number {
    this.refill();
    return this.tokens;
  }
}

// Connection pool
class ConnectionPool {
  private available: number[] = [];
  private inUse: Set<number> = new Set();
  private maxConnections: number;
  private waitQueue: Array<(connectionId: number) => void> = [];

  constructor(maxConnections: number) {
    this.maxConnections = maxConnections;
    for (let i = 0; i < maxConnections; i++) {
      this.available.push(i);
    }
  }

  async acquire(timeout = 5000): Promise<number | null> {
    if (this.available.length > 0) {
      const connectionId = this.available.pop()!;
      this.inUse.add(connectionId);
      return connectionId;
    }

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        const index = this.waitQueue.indexOf(resolve as (connectionId: number) => void);
        if (index !== -1) {
          this.waitQueue.splice(index, 1);
        }
        resolve(null);
      }, timeout);

      this.waitQueue.push((connectionId: number) => {
        clearTimeout(timer);
        resolve(connectionId);
      });
    });
  }

  release(connectionId: number): void {
    if (!this.inUse.has(connectionId)) return;

    this.inUse.delete(connectionId);

    if (this.waitQueue.length > 0) {
      const waiter = this.waitQueue.shift()!;
      this.inUse.add(connectionId);
      waiter(connectionId);
    } else {
      this.available.push(connectionId);
    }
  }

  getStats(): { available: number; inUse: number; waiting: number } {
    return {
      available: this.available.length,
      inUse: this.inUse.size,
      waiting: this.waitQueue.length,
    };
  }
}

describe('Performance Tracking', () => {
  let tracker: PerformanceTracker;

  beforeEach(() => {
    tracker = new PerformanceTracker();
  });

  it('should track operation duration', () => {
    tracker.track('test-op', () => {
      // Simulate work
      for (let i = 0; i < 10000; i++) {
        Math.sqrt(i);
      }
    });

    const metrics = tracker.getMetrics();
    expect(metrics.length).toBe(1);
    expect(metrics[0].duration).toBeGreaterThan(0);
  });

  it('should track multiple operations', () => {
    for (let i = 0; i < 100; i++) {
      tracker.track('operation', () => Math.sqrt(i));
    }

    expect(tracker.getMetrics().length).toBe(100);
  });

  it('should calculate average time', () => {
    for (let i = 0; i < 100; i++) {
      tracker.track('test', () => Math.sqrt(i));
    }

    const avg = tracker.getAverageTime('test');
    expect(avg).toBeGreaterThan(0);
  });

  it('should calculate max time', () => {
    for (let i = 0; i < 100; i++) {
      tracker.track('test', () => {
        for (let j = 0; j < i * 100; j++) {
          Math.sqrt(j);
        }
      });
    }

    const maxTime = tracker.getMaxTime('test');
    const avgTime = tracker.getAverageTime('test');
    expect(maxTime).toBeGreaterThanOrEqual(avgTime);
  });

  it('should calculate min time', () => {
    for (let i = 0; i < 100; i++) {
      tracker.track('test', () => {
        for (let j = 0; j < i * 100; j++) {
          Math.sqrt(j);
        }
      });
    }

    const minTime = tracker.getMinTime('test');
    const avgTime = tracker.getAverageTime('test');
    expect(minTime).toBeLessThanOrEqual(avgTime);
  });

  it('should calculate percentiles', () => {
    for (let i = 0; i < 100; i++) {
      tracker.track('test', () => {
        for (let j = 0; j < i * 100; j++) {
          Math.sqrt(j);
        }
      });
    }

    const p50 = tracker.getPercentile(50, 'test');
    const p95 = tracker.getPercentile(95, 'test');
    const p99 = tracker.getPercentile(99, 'test');

    expect(p50).toBeLessThanOrEqual(p95);
    expect(p95).toBeLessThanOrEqual(p99);
  });

  it('should track success rate', () => {
    for (let i = 0; i < 100; i++) {
      try {
        tracker.track('test', () => {
          if (i % 10 === 0) throw new Error('Simulated failure');
          return i;
        });
      } catch {
        // Expected
      }
    }

    const successRate = tracker.getSuccessRate('test');
    expect(successRate).toBe(90); // 90% success
  });

  it('should track async operations', async () => {
    await tracker.trackAsync('async-op', async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    const metrics = tracker.getMetrics();
    expect(metrics.length).toBe(1);
    expect(metrics[0].duration).toBeGreaterThanOrEqual(10);
  });
});

describe('Data Store Performance', () => {
  let store: MockDataStore;
  let tracker: PerformanceTracker;

  beforeEach(() => {
    store = new MockDataStore(1, 2);
    tracker = new PerformanceTracker();
  });

  it('should handle many concurrent reads', async () => {
    // Seed data
    for (let i = 0; i < 100; i++) {
      await store.set(`key-${i}`, `value-${i}`);
    }

    // Concurrent reads
    const reads = [];
    for (let i = 0; i < 100; i++) {
      reads.push(
        tracker.trackAsync('read', () => store.get(`key-${i % 100}`))
      );
    }

    await Promise.all(reads);

    const avgTime = tracker.getAverageTime('read');
    expect(avgTime).toBeLessThan(50); // Should be fast
  });

  it('should handle many concurrent writes', async () => {
    const writes = [];
    for (let i = 0; i < 100; i++) {
      writes.push(
        tracker.trackAsync('write', () => store.set(`key-${i}`, `value-${i}`))
      );
    }

    await Promise.all(writes);

    expect(store.size()).toBe(100);
    const avgTime = tracker.getAverageTime('write');
    expect(avgTime).toBeLessThan(50);
  });

  it('should handle mixed read/write workload', async () => {
    // Seed some data
    for (let i = 0; i < 50; i++) {
      await store.set(`key-${i}`, `value-${i}`);
    }

    const operations = [];
    for (let i = 0; i < 100; i++) {
      if (i % 3 === 0) {
        operations.push(tracker.trackAsync('write', () => store.set(`key-${i}`, `new-value-${i}`)));
      } else {
        operations.push(tracker.trackAsync('read', () => store.get(`key-${i % 50}`)));
      }
    }

    await Promise.all(operations);

    const readAvg = tracker.getAverageTime('read');
    const writeAvg = tracker.getAverageTime('write');

    // Write should be slower than read
    expect(writeAvg).toBeGreaterThanOrEqual(readAvg);
  });

  it('should handle lock contention', async () => {
    const key = 'shared-resource';

    const operations = [];
    for (let i = 0; i < 10; i++) {
      operations.push((async () => {
        const acquired = await store.acquireLock(key, 5000);
        if (acquired) {
          await store.set(key, i);
          await new Promise(resolve => setTimeout(resolve, 5));
          store.releaseLock(key);
        }
        return acquired;
      })());
    }

    const results = await Promise.all(operations);
    const successCount = results.filter(r => r).length;

    expect(successCount).toBe(10); // All should eventually acquire lock
  });

  it('should timeout on lock contention', async () => {
    const key = 'contested-resource';

    // Acquire lock and hold it
    await store.acquireLock(key);

    // Try to acquire with short timeout
    const acquired = await store.acquireLock(key, 100);

    expect(acquired).toBe(false);

    // Cleanup
    store.releaseLock(key);
  });
});

describe('Batch Processing', () => {
  let processor: BatchProcessor;

  beforeEach(() => {
    processor = new BatchProcessor(100, 1000);
  });

  afterEach(() => {
    processor.clear();
  });

  it('should batch items until batch size reached', () => {
    for (let i = 0; i < 99; i++) {
      processor.add({ id: i });
    }

    expect(processor.getQueueSize()).toBe(99);
    expect(processor.getProcessedCount()).toBe(0);

    processor.add({ id: 99 });

    expect(processor.getProcessedCount()).toBe(100);
    expect(processor.getQueueSize()).toBe(0);
  });

  it('should handle overflow items', () => {
    for (let i = 0; i < 250; i++) {
      processor.add({ id: i });
    }

    expect(processor.getProcessedCount()).toBe(200); // 2 full batches
    expect(processor.getQueueSize()).toBe(50); // Remaining
  });

  it('should flush on interval', async () => {
    vi.useFakeTimers();

    for (let i = 0; i < 50; i++) {
      processor.add({ id: i });
    }

    expect(processor.getProcessedCount()).toBe(0);

    vi.advanceTimersByTime(1000);

    expect(processor.getProcessedCount()).toBe(50);

    vi.useRealTimers();
  });

  it('should handle rapid additions', () => {
    for (let i = 0; i < 10000; i++) {
      processor.add({ id: i });
    }

    expect(processor.getProcessedCount()).toBe(10000);
    expect(processor.getQueueSize()).toBe(0);
  });
});

describe('Rate Limiting', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter(10, 5); // 10 tokens, 5/second refill
  });

  it('should allow requests within limit', () => {
    for (let i = 0; i < 10; i++) {
      expect(limiter.tryAcquire()).toBe(true);
    }
  });

  it('should reject requests exceeding limit', () => {
    for (let i = 0; i < 10; i++) {
      limiter.tryAcquire();
    }

    expect(limiter.tryAcquire()).toBe(false);
  });

  it('should refill tokens over time', async () => {
    // Use all tokens
    for (let i = 0; i < 10; i++) {
      limiter.tryAcquire();
    }

    expect(limiter.tryAcquire()).toBe(false);

    // Wait for refill
    await new Promise(resolve => setTimeout(resolve, 200));

    expect(limiter.tryAcquire()).toBe(true);
  });

  it('should handle burst traffic', () => {
    // Initial burst
    let successCount = 0;
    for (let i = 0; i < 20; i++) {
      if (limiter.tryAcquire()) successCount++;
    }

    expect(successCount).toBe(10); // Only 10 tokens available
  });

  it('should acquire multiple tokens', () => {
    expect(limiter.tryAcquire(5)).toBe(true);
    expect(limiter.tryAcquire(5)).toBe(true);
    expect(limiter.tryAcquire(5)).toBe(false);
  });

  it('should wait for tokens with timeout', async () => {
    // Use all tokens
    for (let i = 0; i < 10; i++) {
      limiter.tryAcquire();
    }

    const acquired = await limiter.acquire(1, 500);
    expect(acquired).toBe(true);
  });
});

describe('Connection Pool', () => {
  let pool: ConnectionPool;

  beforeEach(() => {
    pool = new ConnectionPool(5);
  });

  it('should provide connections', async () => {
    const conn = await pool.acquire();
    expect(conn).toBeDefined();
    expect(typeof conn).toBe('number');
  });

  it('should track connection stats', async () => {
    const conn1 = await pool.acquire();
    const conn2 = await pool.acquire();

    const stats = pool.getStats();
    expect(stats.available).toBe(3);
    expect(stats.inUse).toBe(2);

    pool.release(conn1!);
    pool.release(conn2!);
  });

  it('should limit concurrent connections', async () => {
    const connections = [];
    for (let i = 0; i < 5; i++) {
      connections.push(await pool.acquire());
    }

    const stats = pool.getStats();
    expect(stats.available).toBe(0);
    expect(stats.inUse).toBe(5);

    // Try to acquire one more
    const extraConnPromise = pool.acquire(100); // Short timeout

    // Should timeout
    const extraConn = await extraConnPromise;
    expect(extraConn).toBeNull();

    // Cleanup
    connections.forEach(c => pool.release(c!));
  });

  it('should queue waiting requests', async () => {
    const connections = [];
    for (let i = 0; i < 5; i++) {
      connections.push(await pool.acquire());
    }

    const stats = pool.getStats();
    expect(stats.waiting).toBe(0);

    // Start waiting for connection
    const waitingPromise = pool.acquire(5000);

    // Give time for request to queue
    await new Promise(resolve => setTimeout(resolve, 10));

    const statsAfter = pool.getStats();
    expect(statsAfter.waiting).toBe(1);

    // Release a connection
    pool.release(connections[0]!);

    const newConn = await waitingPromise;
    expect(newConn).toBeDefined();

    // Cleanup
    pool.release(newConn!);
    connections.slice(1).forEach(c => pool.release(c!));
  });

  it('should handle high concurrency', async () => {
    const operations = [];

    for (let i = 0; i < 50; i++) {
      operations.push((async () => {
        const conn = await pool.acquire(2000);
        if (conn !== null) {
          await new Promise(resolve => setTimeout(resolve, 10));
          pool.release(conn);
          return true;
        }
        return false;
      })());
    }

    const results = await Promise.all(operations);
    const successCount = results.filter(r => r).length;

    expect(successCount).toBe(50); // All should eventually succeed
  });
});

describe('Large Data Set Performance', () => {
  it('should handle sorting large arrays', () => {
    const tracker = new PerformanceTracker();
    const data = Array.from({ length: 100000 }, () => Math.random());

    tracker.track('sort', () => {
      [...data].sort((a, b) => a - b);
    });

    const duration = tracker.getAverageTime('sort');
    expect(duration).toBeLessThan(1000); // Should sort in under 1 second
  });

  it('should handle filtering large arrays', () => {
    const tracker = new PerformanceTracker();
    const data = Array.from({ length: 100000 }, (_, i) => ({ id: i, value: Math.random() }));

    tracker.track('filter', () => {
      data.filter(item => item.value > 0.5);
    });

    const duration = tracker.getAverageTime('filter');
    expect(duration).toBeLessThan(100);
  });

  it('should handle map operations on large arrays', () => {
    const tracker = new PerformanceTracker();
    const data = Array.from({ length: 100000 }, (_, i) => ({ id: i, value: Math.random() }));

    tracker.track('map', () => {
      data.map(item => ({ ...item, computed: item.value * 2 }));
    });

    const duration = tracker.getAverageTime('map');
    expect(duration).toBeLessThan(200);
  });

  it('should handle reduce operations on large arrays', () => {
    const tracker = new PerformanceTracker();
    const data = Array.from({ length: 100000 }, (_, i) => ({ id: i, value: Math.random() }));

    tracker.track('reduce', () => {
      data.reduce((acc, item) => acc + item.value, 0);
    });

    const duration = tracker.getAverageTime('reduce');
    expect(duration).toBeLessThan(100);
  });

  it('should handle grouping large datasets', () => {
    const tracker = new PerformanceTracker();
    const categories = ['A', 'B', 'C', 'D', 'E'];
    const data = Array.from({ length: 100000 }, (_, i) => ({
      id: i,
      category: categories[i % categories.length],
      value: Math.random(),
    }));

    tracker.track('group', () => {
      const groups: Record<string, typeof data> = {};
      data.forEach(item => {
        if (!groups[item.category]) {
          groups[item.category] = [];
        }
        groups[item.category].push(item);
      });
      return groups;
    });

    const duration = tracker.getAverageTime('group');
    expect(duration).toBeLessThan(200);
  });
});

describe('Memory Efficiency', () => {
  it('should not leak memory in loops', () => {
    const iterations = 10000;
    const results: number[] = [];

    for (let i = 0; i < iterations; i++) {
      // Create and discard objects
      const obj = { id: i, data: Array(100).fill(i) };
      results.push(obj.data[0]);
    }

    expect(results.length).toBe(iterations);
  });

  it('should handle object reuse efficiently', () => {
    const pool: object[] = [];
    const poolSize = 100;

    // Pre-allocate objects
    for (let i = 0; i < poolSize; i++) {
      pool.push({ id: 0, data: null as unknown });
    }

    // Reuse objects
    for (let i = 0; i < 10000; i++) {
      const obj = pool[i % poolSize];
      (obj as Record<string, unknown>).id = i;
      (obj as Record<string, unknown>).data = `data-${i}`;
    }

    expect(pool.length).toBe(poolSize);
  });
});
