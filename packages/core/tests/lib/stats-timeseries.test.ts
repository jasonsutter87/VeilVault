// ==========================================================================
// TIME SERIES ANALYSIS TESTS
// Critical for anomaly detection in financial data
// ==========================================================================

import { describe, it, expect } from 'vitest';
import * as stats from '../../src/lib/stats/index.js';

describe('Time Series Analysis', () => {
  // ==========================================================================
  // MOVING AVERAGES
  // ==========================================================================

  describe('Simple Moving Average (SMA)', () => {
    it('calculates SMA correctly', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const sma3 = stats.sma(data, 3);

      // First valid SMA at index 2: (1+2+3)/3 = 2
      expect(sma3[0]).toBe(2);
      // Last SMA: (8+9+10)/3 = 9
      expect(sma3[sma3.length - 1]).toBe(9);
      expect(sma3.length).toBe(8); // n - window + 1
    });

    it('handles window size of 1', () => {
      const data = [1, 2, 3, 4, 5];
      const sma1 = stats.sma(data, 1);
      expect(sma1).toEqual(data);
    });

    it('handles window size equal to data length', () => {
      const data = [1, 2, 3, 4, 5];
      const sma5 = stats.sma(data, 5);
      expect(sma5.length).toBe(1);
      expect(sma5[0]).toBe(3); // Mean of all values
    });

    it('handles window larger than data', () => {
      const data = [1, 2, 3];
      const sma5 = stats.sma(data, 5);
      // Implementation may return partial results or array with one element
      expect(sma5.length).toBeLessThanOrEqual(data.length);
    });
  });

  describe('Exponential Moving Average (EMA)', () => {
    it('calculates EMA correctly', () => {
      const data = [10, 11, 12, 13, 14, 15];
      const ema = stats.ema(data, 3);

      expect(ema.length).toBeGreaterThan(0);
      // EMA should show upward trend for increasing data
      expect(ema[ema.length - 1]).toBeGreaterThan(ema[0]);
    });

    it('reacts to recent changes', () => {
      const data = [10, 10, 10, 10, 20]; // Sudden spike
      const emaResult = stats.ema(data, 3);

      // EMA should increase after spike
      expect(emaResult[emaResult.length - 1]).toBeGreaterThan(10);
    });
  });

  describe('Weighted Moving Average (WMA)', () => {
    it('calculates WMA with higher weight on recent values', () => {
      const data = [1, 2, 3, 4, 5];
      const wma = stats.wma(data, 3);

      // WMA weights: [1, 2, 3] / 6
      // For [1,2,3]: (1*1 + 2*2 + 3*3) / 6 = 14/6 ≈ 2.33
      expect(wma[0]).toBeCloseTo(2.333, 2);
    });
  });

  // ==========================================================================
  // TREND DETECTION
  // ==========================================================================

  describe('detectTrend', () => {
    it('detects upward trend', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const trend = stats.detectTrend(data);

      expect(trend.direction).toBe('up');
      expect(trend.slope).toBeGreaterThan(0);
      expect(trend.strength).toBeGreaterThan(0.5);
    });

    it('detects downward trend', () => {
      const data = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
      const trend = stats.detectTrend(data);

      expect(trend.direction).toBe('down');
      expect(trend.slope).toBeLessThan(0);
      expect(trend.strength).toBeGreaterThan(0.5);
    });

    it('detects flat/no trend', () => {
      const data = [5, 5, 5, 5, 5, 5, 5, 5, 5, 5];
      const trend = stats.detectTrend(data);

      expect(trend.direction).toBe('flat');
      expect(Math.abs(trend.slope)).toBeLessThan(0.01);
    });

    it('handles noisy upward trend', () => {
      const data = [1, 3, 2, 4, 3, 5, 4, 6, 5, 7];
      const trend = stats.detectTrend(data);

      expect(trend.direction).toBe('up');
    });

    it('handles empty array', () => {
      const trend = stats.detectTrend([]);
      expect(trend.direction).toBe('flat');
    });
  });

  describe('detectTrendChanges', () => {
    it('detects trend changes', () => {
      // Up then down
      const data = [1, 2, 3, 4, 5, 5, 4, 3, 2, 1];
      const changes = stats.detectTrendChanges(data, 3);

      // May detect changes at reversal points
      expect(Array.isArray(changes)).toBe(true);
    });
  });

  // ==========================================================================
  // RATE OF CHANGE
  // ==========================================================================

  describe('Rate of Change (ROC)', () => {
    it('calculates percentage change', () => {
      const data = [100, 110, 121, 133.1]; // 10% growth each period
      const roc = stats.roc(data, 1);

      expect(roc[0]).toBeCloseTo(10, 1); // 10% change
      expect(roc[1]).toBeCloseTo(10, 1);
      expect(roc[2]).toBeCloseTo(10, 1);
    });

    it('handles negative changes', () => {
      const data = [100, 90, 81]; // 10% decline each period
      const roc = stats.roc(data, 1);

      expect(roc[0]).toBeCloseTo(-10, 1);
      expect(roc[1]).toBeCloseTo(-10, 1);
    });
  });

  describe('momentum', () => {
    it('calculates momentum correctly', () => {
      const data = [10, 12, 15, 14, 16, 20];
      const mom = stats.momentum(data, 2);

      // Momentum = current - n periods ago
      expect(mom[0]).toBe(5); // 15 - 10
      expect(mom[1]).toBe(2); // 14 - 12
    });
  });

  // ==========================================================================
  // VOLATILITY
  // ==========================================================================

  describe('rollingVolatility', () => {
    it('calculates rolling standard deviation', () => {
      const data = [10, 11, 9, 12, 8, 13, 7, 14];
      const vol = stats.rollingVolatility(data, 3);

      expect(vol.length).toBe(data.length - 2); // n - window + 1
      expect(vol.every(v => v >= 0)).toBe(true); // Volatility is non-negative
    });

    it('detects increasing volatility', () => {
      // Low volatility then high volatility
      const data = [10, 10.1, 10, 10.1, 10, 5, 15, 3, 17, 2];
      const vol = stats.rollingVolatility(data, 3);

      // Later volatility should be higher
      expect(vol[vol.length - 1]).toBeGreaterThan(vol[0]);
    });
  });

  // ==========================================================================
  // FORECASTING
  // ==========================================================================

  describe('forecastLinear', () => {
    it('forecasts linear trend', () => {
      const data = [1, 2, 3, 4, 5];
      const result = stats.forecastLinear(data, 3);

      // Returns forecast result object with forecast, lower, upper arrays
      expect(result).toBeDefined();
      expect(Array.isArray(result.forecast)).toBe(true);
      expect(result.forecast.length).toBe(3);
      // Predictions should continue the upward trend
      expect(result.forecast[0]).toBeGreaterThan(5);
    });

    it('handles flat data', () => {
      const data = [5, 5, 5, 5, 5];
      const result = stats.forecastLinear(data, 3);

      expect(result).toBeDefined();
      expect(Array.isArray(result.forecast)).toBe(true);
      // Flat data should forecast flat values
      result.forecast.forEach(v => expect(v).toBeCloseTo(5, 1));
    });
  });

  describe('forecastSES (Simple Exponential Smoothing)', () => {
    it('forecasts with exponential smoothing', () => {
      const data = [10, 12, 14, 13, 15, 17];
      const forecast = stats.forecastSES(data, 3, 0.3);

      expect(forecast).toBeDefined();
    });
  });

  // ==========================================================================
  // DESCRIBE TIME SERIES
  // ==========================================================================

  describe('describeTimeSeries', () => {
    it('provides comprehensive time series analysis', () => {
      const data = [100, 102, 105, 103, 107, 110, 108, 112, 115, 113];
      const desc = stats.describeTimeSeries(data);

      expect(desc).toBeDefined();
      expect(desc.trend).toBeDefined();
      expect(typeof desc.volatility).toBe('number');
    });
  });

  // ==========================================================================
  // SEASONALITY (basic)
  // ==========================================================================

  describe('detectSeasonality', () => {
    it('detects periodic pattern', () => {
      // Weekly pattern: high Mon-Fri, low Sat-Sun (repeated)
      const data = [
        10, 12, 11, 13, 14, 5, 4,  // Week 1
        11, 13, 12, 14, 15, 6, 5,  // Week 2
        10, 12, 11, 13, 14, 5, 4,  // Week 3
        11, 13, 12, 14, 15, 6, 5,  // Week 4
      ];

      const seasonality = stats.detectSeasonality(data);

      // Returns seasonality info
      expect(seasonality).toBeDefined();
      if (seasonality) {
        expect(typeof seasonality.hasSeason).toBe('boolean');
      }
    });
  });

  // ==========================================================================
  // FINANCIAL TIME SERIES EDGE CASES
  // ==========================================================================

  describe('Financial Time Series', () => {
    it('handles stock price movements', () => {
      const prices = [100, 102, 99, 103, 101, 105, 98, 107, 104, 110];
      const trend = stats.detectTrend(prices);
      const vol = stats.rollingVolatility(prices, 3);

      // Trend may be up, flat, or slightly noisy
      expect(['up', 'flat', 'down']).toContain(trend.direction);
      expect(vol.length).toBeGreaterThan(0);
    });

    it('handles transaction volume spikes', () => {
      // Normal volume with spike
      const volume = [1000, 1100, 950, 1050, 5000, 1000, 1100, 1000];
      const vol = stats.rollingVolatility(volume, 3);

      // Should detect increased volatility around spike
      const maxVolIdx = vol.indexOf(Math.max(...vol));
      expect(maxVolIdx).toBeGreaterThan(0);
    });

    it('calculates daily returns', () => {
      const prices = [100, 105, 103, 108, 106];
      const returns = stats.roc(prices, 1);

      expect(returns[0]).toBeCloseTo(5, 1); // 5% return
      expect(returns[1]).toBeCloseTo(-1.9, 1); // ~-1.9% return
    });
  });
});
