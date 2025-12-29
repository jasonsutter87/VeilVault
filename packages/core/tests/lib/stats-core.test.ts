// ==========================================================================
// STATISTICS CORE LIBRARY TESTS
// Bulletproof tests for financial calculations
// ==========================================================================

import { describe, it, expect } from 'vitest';
import * as stats from '../../src/lib/stats/index.js';

describe('Statistics Core Library', () => {
  // ==========================================================================
  // BASIC STATISTICS
  // ==========================================================================

  describe('mean', () => {
    it('calculates mean correctly for positive numbers', () => {
      expect(stats.mean([1, 2, 3, 4, 5])).toBe(3);
      expect(stats.mean([10, 20, 30])).toBe(20);
    });

    it('calculates mean correctly for negative numbers', () => {
      expect(stats.mean([-5, -3, -1, 1, 3, 5])).toBe(0);
    });

    it('calculates mean correctly for decimals', () => {
      expect(stats.mean([1.5, 2.5, 3.5])).toBe(2.5);
    });

    it('handles single value', () => {
      expect(stats.mean([42])).toBe(42);
    });

    it('handles empty array', () => {
      expect(stats.mean([])).toBe(0);
    });

    it('handles large numbers (financial amounts)', () => {
      const amounts = [1000000, 2000000, 3000000];
      expect(stats.mean(amounts)).toBe(2000000);
    });

    it('handles very small numbers (percentages)', () => {
      const rates = [0.001, 0.002, 0.003];
      expect(stats.mean(rates)).toBeCloseTo(0.002, 10);
    });
  });

  describe('median', () => {
    it('calculates median for odd-length array', () => {
      expect(stats.median([1, 2, 3, 4, 5])).toBe(3);
      expect(stats.median([5, 1, 3])).toBe(3); // Should sort first
    });

    it('calculates median for even-length array', () => {
      expect(stats.median([1, 2, 3, 4])).toBe(2.5);
      expect(stats.median([10, 20, 30, 40])).toBe(25);
    });

    it('handles single value', () => {
      expect(stats.median([42])).toBe(42);
    });

    it('handles empty array', () => {
      expect(stats.median([])).toBe(0);
    });

    it('handles unsorted input', () => {
      expect(stats.median([5, 2, 8, 1, 9])).toBe(5);
    });
  });

  describe('mode', () => {
    it('finds single mode', () => {
      expect(stats.mode([1, 2, 2, 3])).toEqual([2]);
    });

    it('finds multiple modes', () => {
      const result = stats.mode([1, 1, 2, 2, 3]);
      expect(result).toContain(1);
      expect(result).toContain(2);
      expect(result.length).toBe(2);
    });

    it('returns all values when no mode (all unique)', () => {
      const result = stats.mode([1, 2, 3, 4]);
      expect(result.length).toBe(4);
    });

    it('handles empty array', () => {
      expect(stats.mode([])).toEqual([]);
    });
  });

  describe('variance and stdDev', () => {
    it('calculates variance correctly', () => {
      // Population variance of [2, 4, 4, 4, 5, 5, 7, 9] = 4
      expect(stats.variance([2, 4, 4, 4, 5, 5, 7, 9])).toBe(4);
    });

    it('calculates standard deviation correctly', () => {
      expect(stats.stdDev([2, 4, 4, 4, 5, 5, 7, 9])).toBe(2);
    });

    it('returns 0 for single value', () => {
      expect(stats.variance([5])).toBe(0);
      expect(stats.stdDev([5])).toBe(0);
    });

    it('returns 0 for empty array', () => {
      expect(stats.variance([])).toBe(0);
      expect(stats.stdDev([])).toBe(0);
    });

    it('returns 0 for constant values', () => {
      expect(stats.variance([5, 5, 5, 5])).toBe(0);
      expect(stats.stdDev([5, 5, 5, 5])).toBe(0);
    });
  });

  describe('sum', () => {
    it('calculates sum correctly', () => {
      expect(stats.sum([1, 2, 3, 4, 5])).toBe(15);
    });

    it('handles empty array', () => {
      expect(stats.sum([])).toBe(0);
    });

    it('handles negative numbers', () => {
      expect(stats.sum([-1, -2, 3])).toBe(0);
    });

    it('handles large financial sums', () => {
      const transactions = [1000000, 2500000, 750000, 3250000];
      expect(stats.sum(transactions)).toBe(7500000);
    });
  });

  describe('min and max', () => {
    it('finds minimum', () => {
      expect(stats.min([5, 2, 8, 1, 9])).toBe(1);
    });

    it('finds maximum', () => {
      expect(stats.max([5, 2, 8, 1, 9])).toBe(9);
    });

    it('handles negative numbers', () => {
      expect(stats.min([-5, -2, -8])).toBe(-8);
      expect(stats.max([-5, -2, -8])).toBe(-2);
    });

    it('returns Infinity/-Infinity for empty array', () => {
      expect(stats.min([])).toBe(Infinity);
      expect(stats.max([])).toBe(-Infinity);
    });
  });

  describe('range', () => {
    it('calculates range correctly', () => {
      expect(stats.range([1, 5, 3, 9, 2])).toBe(8);
    });

    it('returns 0 for single value', () => {
      expect(stats.range([5])).toBe(0);
    });

    it('returns 0 for empty array', () => {
      expect(stats.range([])).toBe(0);
    });
  });

  // ==========================================================================
  // PERCENTILES
  // ==========================================================================

  describe('percentile', () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    it('calculates 50th percentile (median)', () => {
      expect(stats.percentile(data, 50)).toBe(5.5);
    });

    it('calculates 25th percentile (Q1)', () => {
      expect(stats.percentile(data, 25)).toBeCloseTo(3.25, 1);
    });

    it('calculates 75th percentile (Q3)', () => {
      expect(stats.percentile(data, 75)).toBeCloseTo(7.75, 1);
    });

    it('handles 0th percentile (min)', () => {
      expect(stats.percentile(data, 0)).toBe(1);
    });

    it('handles 100th percentile (max)', () => {
      expect(stats.percentile(data, 100)).toBe(10);
    });

    it('handles empty array', () => {
      expect(stats.percentile([], 50)).toBe(0);
    });
  });

  describe('quartiles', () => {
    it('calculates quartiles correctly', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const q = stats.quartiles(data);

      expect(q.q1).toBeCloseTo(3.25, 1);
      expect(q.q2).toBe(5.5);
      expect(q.q3).toBeCloseTo(7.75, 1);
    });

    it('returns zeros for empty array', () => {
      const q = stats.quartiles([]);
      expect(q.q1).toBe(0);
      expect(q.q2).toBe(0);
      expect(q.q3).toBe(0);
    });
  });

  describe('interquartileRange (IQR)', () => {
    it('calculates IQR correctly', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      expect(stats.interquartileRange(data)).toBeCloseTo(4.5, 1);
    });
  });

  // ==========================================================================
  // CORRELATION & REGRESSION
  // ==========================================================================

  describe('correlation', () => {
    it('calculates perfect positive correlation', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [2, 4, 6, 8, 10]; // y = 2x
      expect(stats.correlation(x, y)).toBeCloseTo(1, 5);
    });

    it('calculates perfect negative correlation', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [10, 8, 6, 4, 2]; // y = -2x + 12
      expect(stats.correlation(x, y)).toBeCloseTo(-1, 5);
    });

    it('calculates zero correlation for unrelated data', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [3, 3, 3, 3, 3]; // constant
      expect(stats.correlation(x, y)).toBe(0);
    });

    it('handles empty arrays', () => {
      expect(stats.correlation([], [])).toBe(0);
    });

    it('throws on mismatched lengths', () => {
      expect(() => stats.correlation([1, 2, 3], [1, 2])).toThrow();
    });
  });

  describe('linearRegression', () => {
    it('calculates regression for perfect linear relationship', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [3, 5, 7, 9, 11]; // y = 2x + 1
      const reg = stats.linearRegression(x, y);

      expect(reg.slope).toBeCloseTo(2, 5);
      expect(reg.intercept).toBeCloseTo(1, 5);
      expect(reg.r2).toBeCloseTo(1, 5);
    });

    it('can predict using slope and intercept', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [3, 5, 7, 9, 11];
      const reg = stats.linearRegression(x, y);

      // Predict: y = slope * x + intercept
      const predict = (x: number) => reg.slope * x + reg.intercept;
      expect(predict(6)).toBeCloseTo(13, 5);
      expect(predict(0)).toBeCloseTo(1, 5);
    });

    it('handles empty arrays', () => {
      const reg = stats.linearRegression([], []);
      expect(reg.slope).toBe(0);
      expect(reg.intercept).toBe(0);
      expect(reg.r2).toBe(0);
    });
  });

  // ==========================================================================
  // COEFFICIENT OF VARIATION
  // ==========================================================================

  describe('coefficientOfVariation', () => {
    it('calculates CV correctly', () => {
      // CV = stdDev / mean
      const data = [10, 10, 10, 10]; // stdDev=0, mean=10, CV=0
      expect(stats.coefficientOfVariation(data)).toBe(0);
    });

    it('returns 0 for zero mean', () => {
      const data = [-1, 0, 1];
      expect(stats.coefficientOfVariation(data)).toBe(0);
    });

    it('calculates for financial volatility', () => {
      // Stock prices with some variation
      const prices = [100, 102, 98, 101, 99];
      const cv = stats.coefficientOfVariation(prices);
      expect(cv).toBeGreaterThan(0);
      expect(cv).toBeLessThan(10); // CV returns percentage, so <10% is low volatility
    });
  });

  // ==========================================================================
  // Z-SCORES
  // ==========================================================================

  describe('zScore', () => {
    it('calculates z-score correctly', () => {
      const data = [2, 4, 4, 4, 5, 5, 7, 9];
      // mean = 5, stdDev = 2

      expect(stats.zScore(5, data)).toBe(0); // Mean has z-score of 0
      expect(stats.zScore(7, data)).toBe(1); // One stdDev above mean
      expect(stats.zScore(3, data)).toBe(-1); // One stdDev below mean
    });

    it('handles zero standard deviation', () => {
      const data = [5, 5, 5, 5];
      expect(stats.zScore(5, data)).toBe(0);
    });
  });

  describe('zScores', () => {
    it('calculates z-scores for all values', () => {
      const data = [2, 4, 4, 4, 5, 5, 7, 9];
      const zScores = stats.zScores(data);

      expect(zScores.length).toBe(data.length);

      // Mean value should have z-score near 0
      const meanIdx = data.indexOf(5);
      expect(zScores[meanIdx]).toBe(0);
    });

    it('handles empty array', () => {
      expect(stats.zScores([])).toEqual([]);
    });
  });

  // ==========================================================================
  // EDGE CASES FOR FINANCIAL DATA
  // ==========================================================================

  describe('Financial Edge Cases', () => {
    it('handles currency precision (2 decimal places)', () => {
      const amounts = [100.50, 200.75, 150.25];
      const avg = stats.mean(amounts);
      expect(avg).toBeCloseTo(150.50, 2);
    });

    it('handles percentage calculations', () => {
      const rates = [0.05, 0.07, 0.03, 0.06]; // 5%, 7%, 3%, 6%
      expect(stats.mean(rates)).toBeCloseTo(0.0525, 4);
    });

    it('handles basis points', () => {
      const bps = [25, 50, 75, 100]; // Basis points
      expect(stats.mean(bps)).toBe(62.5);
    });

    it('handles large transaction volumes', () => {
      const volumes = Array(10000).fill(0).map((_, i) => i * 1000);
      const result = stats.mean(volumes);
      expect(result).toBeCloseTo(4999500, 0);
    });

    it('handles negative values (losses)', () => {
      const pnl = [1000, -500, 750, -250, 500];
      expect(stats.sum(pnl)).toBe(1500);
      expect(stats.mean(pnl)).toBe(300);
    });
  });

  // ==========================================================================
  // DESCRIBE FUNCTION
  // ==========================================================================

  describe('describe', () => {
    it('provides comprehensive statistics', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const desc = stats.describe(data);

      expect(desc.count).toBe(10);
      expect(desc.mean).toBe(5.5);
      expect(desc.median).toBe(5.5);
      expect(desc.min).toBe(1);
      expect(desc.max).toBe(10);
      expect(desc.stdDev).toBeGreaterThan(0);
      expect(desc.variance).toBeGreaterThan(0);
    });

    it('handles empty array', () => {
      const desc = stats.describe([]);
      expect(desc.count).toBe(0);
      expect(desc.mean).toBe(0);
    });
  });
});
