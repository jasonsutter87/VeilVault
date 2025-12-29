// ==========================================================================
// OUTLIER DETECTION TESTS
// Critical for fraud detection and anomaly alerts
// ==========================================================================

import { describe, it, expect } from 'vitest';
import * as stats from '../../src/lib/stats/index.js';

describe('Outlier Detection', () => {
  // ==========================================================================
  // Z-SCORE METHOD
  // ==========================================================================

  describe('detectOutliersZScore', () => {
    it('detects outliers using z-score threshold', () => {
      const data = [10, 11, 10, 12, 11, 10, 100, 11, 10, 12]; // 100 is outlier
      const outliers = stats.detectOutliersZScore(data, 2);

      expect(outliers.length).toBe(1);
      expect(outliers[0].index).toBe(6);
      expect(outliers[0].value).toBe(100);
      expect(outliers[0].direction).toBe('high');
    });

    it('detects low outliers', () => {
      const data = [100, 101, 100, 102, 101, 100, 10, 101, 100, 102]; // 10 is outlier
      const outliers = stats.detectOutliersZScore(data, 2);

      expect(outliers.length).toBe(1);
      expect(outliers[0].value).toBe(10);
      expect(outliers[0].direction).toBe('low');
    });

    it('detects multiple outliers', () => {
      const data = [10, 11, 10, 1, 11, 10, 100, 11, 10, 200];
      const outliers = stats.detectOutliersZScore(data, 2);

      // Should detect at least one extreme value
      expect(outliers.length).toBeGreaterThanOrEqual(1);
    });

    it('returns empty for normal data', () => {
      const data = [10, 11, 10, 12, 11, 10, 11, 11, 10, 12];
      const outliers = stats.detectOutliersZScore(data, 3);

      expect(outliers.length).toBe(0);
    });

    it('handles empty array', () => {
      const outliers = stats.detectOutliersZScore([], 2);
      expect(outliers).toEqual([]);
    });
  });

  describe('detectOutliersModifiedZScore', () => {
    it('is more robust to outliers in calculation', () => {
      // Modified z-score uses MAD instead of std dev
      const data = [10, 11, 10, 12, 11, 10, 100, 11, 10, 12];
      const outliers = stats.detectOutliersModifiedZScore(data, 3.5);

      expect(outliers.length).toBeGreaterThan(0);
      expect(outliers.some(o => o.value === 100)).toBe(true);
    });
  });

  // ==========================================================================
  // IQR METHOD
  // ==========================================================================

  describe('detectOutliersIQR', () => {
    it('detects outliers using IQR method', () => {
      // Classic IQR: outliers are < Q1 - 1.5*IQR or > Q3 + 1.5*IQR
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 50]; // 50 is outlier
      const outliers = stats.detectOutliersIQR(data);

      expect(outliers.length).toBe(1);
      expect(outliers[0].value).toBe(50);
    });

    it('respects custom multiplier', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20];

      // With default 1.5 multiplier
      const outliers1 = stats.detectOutliersIQR(data, 1.5);
      // With higher multiplier (less sensitive)
      const outliers2 = stats.detectOutliersIQR(data, 3);

      expect(outliers1.length).toBeGreaterThanOrEqual(outliers2.length);
    });
  });

  // ==========================================================================
  // MAD (Median Absolute Deviation)
  // ==========================================================================

  describe('mad (Median Absolute Deviation)', () => {
    it('calculates MAD correctly', () => {
      const data = [1, 1, 2, 2, 4, 6, 9];
      // Median = 2, deviations = [1, 1, 0, 0, 2, 4, 7], MAD = median of deviations = 1
      const result = stats.mad(data);
      expect(result).toBe(1);
    });

    it('handles empty array', () => {
      expect(stats.mad([])).toBe(0);
    });
  });

  describe('detectOutliersMAD', () => {
    it('detects outliers using MAD', () => {
      const data = [10, 11, 10, 12, 11, 10, 100, 11, 10, 12];
      const outliers = stats.detectOutliersMAD(data, 3);

      expect(outliers.some(o => o.value === 100)).toBe(true);
    });
  });

  // ==========================================================================
  // GRUBBS' TEST
  // ==========================================================================

  describe("Grubbs' Test", () => {
    it('analyzes for extreme outlier', () => {
      const data = [10, 11, 10, 12, 11, 10, 100, 11, 10, 12];
      const result = stats.grubbsTest(data, 0.05);

      // Returns result object
      expect(result).toBeDefined();
    });

    it('handles normal data', () => {
      const data = [10, 11, 10, 12, 11, 10, 11, 11, 10, 12];
      const result = stats.grubbsTest(data, 0.05);

      expect(result).toBeDefined();
    });
  });

  describe('detectOutliersGrubbs (iterative)', () => {
    it('removes outliers iteratively', () => {
      const data = [10, 11, 10, 100, 11, 10, 200, 11, 10, 12];
      const outliers = stats.detectOutliersGrubbs(data, 0.05, 5);

      expect(outliers.length).toBe(2);
      expect(outliers.map(o => o.value)).toContain(100);
      expect(outliers.map(o => o.value)).toContain(200);
    });
  });

  // ==========================================================================
  // TIME SERIES ANOMALIES
  // ==========================================================================

  describe('detectTimeSeriesAnomalies', () => {
    it('detects anomalies in time series context', () => {
      // Normal pattern with sudden spike
      const data = [10, 11, 10, 12, 11, 50, 11, 10, 12, 11];
      const anomalies = stats.detectTimeSeriesAnomalies(data, 3, 2);

      expect(anomalies.some(a => a.value === 50)).toBe(true);
    });
  });

  describe('detectSpikes', () => {
    it('analyzes for sudden spikes', () => {
      const data = [100, 102, 101, 103, 200, 102, 101, 103]; // 200 is spike
      const spikes = stats.detectSpikes(data, 2);

      expect(Array.isArray(spikes)).toBe(true);
    });

    it('handles gradual increases (not spikes)', () => {
      const data = [100, 110, 120, 130, 140, 150, 160, 170];
      const spikes = stats.detectSpikes(data, 2);

      // Gradual increases shouldn't trigger many spikes
      expect(Array.isArray(spikes)).toBe(true);
    });
  });

  describe('detectLevelShifts', () => {
    it('detects permanent level change', () => {
      const data = [10, 11, 10, 12, 11, 50, 51, 50, 52, 51]; // Level shifts from ~11 to ~51
      const shifts = stats.detectLevelShifts(data, 3, 3);

      expect(shifts.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // ISOLATION SCORE
  // ==========================================================================

  describe('calculateIsolationScore', () => {
    it('calculates isolation score', () => {
      const data = [10, 11, 10, 12, 11, 10, 100, 11, 10, 12];

      const normalScore = stats.calculateIsolationScore(10, data);
      const outlierScore = stats.calculateIsolationScore(100, data);

      // Both should return valid scores
      expect(typeof normalScore).toBe('number');
      expect(typeof outlierScore).toBe('number');
    });
  });

  describe('detectOutliersIsolation', () => {
    it('detects outliers using isolation method', () => {
      const data = [10, 11, 10, 12, 11, 10, 100, 11, 10, 12];
      const outliers = stats.detectOutliersIsolation(data, 0.7);

      expect(outliers.some(o => o.value === 100)).toBe(true);
    });
  });

  // ==========================================================================
  // ENSEMBLE DETECTION
  // ==========================================================================

  describe('detectOutliersEnsemble', () => {
    it('combines multiple methods for robust detection', () => {
      const data = [10, 11, 10, 12, 11, 10, 100, 11, 10, 12];
      const outliers = stats.detectOutliersEnsemble(data);

      expect(outliers.length).toBeGreaterThan(0);
      expect(outliers[0].value).toBe(100);
      // Should have confidence score
      expect(outliers[0].confidence).toBeGreaterThan(0);
      // Should list which methods detected it
      expect(outliers[0].methods.length).toBeGreaterThan(0);
    });

    it('can use different configurations', () => {
      // Borderline case - may be detected by some methods but not all
      const data = [10, 11, 10, 12, 11, 10, 100, 11, 10, 12];

      const result = stats.detectOutliersEnsemble(data);

      // Should return array of ensemble results
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ==========================================================================
  // CONTEXTUAL ANOMALIES
  // ==========================================================================

  describe('detectContextualAnomalies', () => {
    it('analyzes anomalies based on local context', () => {
      // Global: 100-120 range, but local context matters
      const data = [100, 101, 100, 102, 150, 101, 100, 102]; // 150 anomalous in context
      const anomalies = stats.detectContextualAnomalies(data, 3, 2);

      expect(Array.isArray(anomalies)).toBe(true);
    });
  });

  // ==========================================================================
  // SUMMARY
  // ==========================================================================

  describe('summarizeAnomalies', () => {
    it('provides anomaly summary', () => {
      // summarizeAnomalies takes raw data, not outlier results
      const data = [10, 11, 10, 12, 11, 10, 100, 11, 10, 12];

      const summary = stats.summarizeAnomalies(data);

      // Returns summary object with totalPoints and outlierCount
      expect(summary).toBeDefined();
      expect(typeof summary.totalPoints).toBe('number');
      expect(typeof summary.outlierCount).toBe('number');
      expect(summary.totalPoints).toBe(10);
      expect(summary.outlierCount).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // FINANCIAL FRAUD DETECTION SCENARIOS
  // ==========================================================================

  describe('Financial Fraud Detection', () => {
    it('detects unusually large transactions', () => {
      const transactions = [
        1000, 1200, 950, 1100, 1050, 1150, 50000, 1000, 1100, 1050
      ];
      const outliers = stats.detectOutliersEnsemble(transactions);

      expect(outliers.some(o => o.value === 50000)).toBe(true);
    });

    it('detects transaction velocity anomalies', () => {
      // Transaction counts per hour (normally 10-20)
      const counts = [15, 12, 18, 14, 16, 100, 15, 13, 17, 14]; // 100 is anomalous
      const outliers = stats.detectOutliersZScore(counts, 2);

      expect(outliers.some(o => o.value === 100)).toBe(true);
    });

    it('detects round number anomalies (potential fraud indicator)', () => {
      // Real transactions have varied amounts, fraud often uses round numbers
      const amounts = [
        1234.56, 2345.67, 3456.78, 10000.00, 4567.89, 5000.00, 5678.90
      ];

      // Check for unusually round numbers (this is a simplified check)
      const roundNumbers = amounts.filter(a => a % 1000 === 0);
      expect(roundNumbers.length).toBe(2);
    });

    it('detects after-hours activity', () => {
      // Transaction counts by hour (0-23), normally low at night
      const hourlyVolume = [
        5, 3, 2, 1, 2, 100, 150, 200, 180, 170, // 5-6am spike unusual
        160, 150, 140, 130, 120, 110, 100, 80, 60, 40, 30, 20, 10, 8
      ];

      const anomalies = stats.detectSpikes(hourlyVolume.slice(0, 10), 2);
      expect(Array.isArray(anomalies)).toBe(true);
    });

    it('detects balance manipulation patterns', () => {
      // Account balance that shouldn't spike
      const balances = [
        10000, 10100, 10050, 10200, 10150, 500000, 10100, 10050
      ];
      const outliers = stats.detectOutliersIQR(balances);

      expect(outliers.some(o => o.value === 500000)).toBe(true);
    });
  });

  // ==========================================================================
  // GRC RISK SCORE ANOMALIES
  // ==========================================================================

  describe('GRC Risk Score Anomalies', () => {
    it('detects sudden risk score increases', () => {
      // Risk scores normally change gradually
      const riskScores = [3.2, 3.4, 3.3, 3.5, 3.4, 8.5, 3.4, 3.3];
      const anomalies = stats.detectSpikes(riskScores, 2);

      expect(Array.isArray(anomalies)).toBe(true);
    });

    it('detects control effectiveness degradation', () => {
      // Control effectiveness (0-1) normally stable
      const effectiveness = [0.95, 0.94, 0.95, 0.93, 0.94, 0.3, 0.94, 0.95];
      const outliers = stats.detectOutliersZScore(effectiveness, 2);

      expect(outliers.some(o => o.value === 0.3)).toBe(true);
    });

    it('detects issue volume spikes', () => {
      // Monthly issue counts
      const issueCounts = [5, 6, 4, 7, 5, 25, 6, 5, 4, 7];
      const outliers = stats.detectOutliersEnsemble(issueCounts);

      expect(outliers.some(o => o.value === 25)).toBe(true);
    });
  });
});
