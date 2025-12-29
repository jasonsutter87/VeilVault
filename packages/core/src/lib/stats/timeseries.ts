// ==========================================================================
// TIME SERIES ANALYSIS LIBRARY
// Pure TypeScript time series functions - zero dependencies
// ==========================================================================

import { mean, standardDeviation, linearRegression } from './core.js';

// ==========================================================================
// MOVING AVERAGES
// ==========================================================================

/**
 * Simple Moving Average (SMA)
 * Returns array of averages for each window position
 */
export function sma(values: number[], window: number): number[] {
  if (values.length === 0 || window <= 0) return [];
  if (window > values.length) return [mean(values)];

  const result: number[] = [];

  for (let i = window - 1; i < values.length; i++) {
    const windowSlice = values.slice(i - window + 1, i + 1);
    result.push(mean(windowSlice));
  }

  return result;
}

/**
 * Weighted Moving Average (WMA)
 * More recent values have higher weights
 */
export function wma(values: number[], window: number): number[] {
  if (values.length === 0 || window <= 0) return [];
  if (window > values.length) window = values.length;

  const result: number[] = [];
  const weightSum = (window * (window + 1)) / 2; // Sum of 1 + 2 + ... + n

  for (let i = window - 1; i < values.length; i++) {
    let weightedSum = 0;
    for (let j = 0; j < window; j++) {
      weightedSum += values[i - window + 1 + j]! * (j + 1);
    }
    result.push(weightedSum / weightSum);
  }

  return result;
}

/**
 * Exponential Moving Average (EMA)
 * α = 2 / (window + 1) - smoothing factor
 */
export function ema(values: number[], window: number): number[] {
  if (values.length === 0 || window <= 0) return [];

  const alpha = 2 / (window + 1);
  const result: number[] = [values[0]!];

  for (let i = 1; i < values.length; i++) {
    const currentEma = alpha * values[i]! + (1 - alpha) * result[i - 1]!;
    result.push(currentEma);
  }

  return result;
}

/**
 * Double Exponential Moving Average (DEMA)
 * Reduces lag compared to EMA
 */
export function dema(values: number[], window: number): number[] {
  if (values.length === 0 || window <= 0) return [];

  const ema1 = ema(values, window);
  const ema2 = ema(ema1, window);

  return ema1.map((e1, i) => 2 * e1 - ema2[i]!);
}

/**
 * Triple Exponential Moving Average (TEMA)
 * Further reduces lag
 */
export function tema(values: number[], window: number): number[] {
  if (values.length === 0 || window <= 0) return [];

  const ema1 = ema(values, window);
  const ema2 = ema(ema1, window);
  const ema3 = ema(ema2, window);

  return ema1.map((e1, i) => 3 * e1 - 3 * ema2[i]! + ema3[i]!);
}

// ==========================================================================
// RATE OF CHANGE & MOMENTUM
// ==========================================================================

/**
 * Rate of Change (ROC)
 * Percentage change from n periods ago
 */
export function roc(values: number[], period: number): number[] {
  if (values.length === 0 || period <= 0) return [];

  const result: number[] = [];

  for (let i = period; i < values.length; i++) {
    const previous = values[i - period]!;
    if (previous === 0) {
      result.push(0);
    } else {
      result.push(((values[i]! - previous) / previous) * 100);
    }
  }

  return result;
}

/**
 * Momentum
 * Difference from n periods ago
 */
export function momentum(values: number[], period: number): number[] {
  if (values.length === 0 || period <= 0) return [];

  const result: number[] = [];

  for (let i = period; i < values.length; i++) {
    result.push(values[i]! - values[i - period]!);
  }

  return result;
}

/**
 * Velocity (first derivative approximation)
 * Rate of change at each point
 */
export function velocity(values: number[]): number[] {
  if (values.length < 2) return [];

  const result: number[] = [];

  for (let i = 1; i < values.length; i++) {
    result.push(values[i]! - values[i - 1]!);
  }

  return result;
}

/**
 * Acceleration (second derivative approximation)
 * Rate of change of velocity
 */
export function acceleration(values: number[]): number[] {
  return velocity(velocity(values));
}

// ==========================================================================
// TREND DETECTION
// ==========================================================================

export type TrendDirection = 'up' | 'down' | 'flat';

export interface TrendResult {
  direction: TrendDirection;
  slope: number;
  strength: number; // R-squared (0-1)
  confidence: number; // How confident we are in the trend
}

/**
 * Detect overall trend using linear regression
 */
export function detectTrend(values: number[]): TrendResult {
  if (values.length < 2) {
    return { direction: 'flat', slope: 0, strength: 0, confidence: 0 };
  }

  const x = values.map((_, i) => i);
  const { slope, r2 } = linearRegression(x, values);

  // Normalize slope relative to mean
  const avg = mean(values);
  const normalizedSlope = avg === 0 ? slope : slope / Math.abs(avg);

  // Determine direction with threshold
  const threshold = 0.01; // 1% change per period
  let direction: TrendDirection;
  if (normalizedSlope > threshold) {
    direction = 'up';
  } else if (normalizedSlope < -threshold) {
    direction = 'down';
  } else {
    direction = 'flat';
  }

  // Confidence based on R² and sample size
  const sizeConfidence = Math.min(values.length / 30, 1); // Max confidence at 30+ points
  const confidence = r2 * sizeConfidence;

  return {
    direction,
    slope,
    strength: r2,
    confidence,
  };
}

/**
 * Detect trend changes (inflection points)
 * Returns indices where trend changes direction
 */
export function detectTrendChanges(values: number[], window: number = 5): number[] {
  if (values.length < window * 2) return [];

  const changes: number[] = [];

  for (let i = window; i < values.length - window; i++) {
    const leftSlice = values.slice(i - window, i);
    const rightSlice = values.slice(i, i + window);

    const leftTrend = detectTrend(leftSlice);
    const rightTrend = detectTrend(rightSlice);

    // Trend change if direction differs and both have strength
    if (leftTrend.direction !== rightTrend.direction &&
        leftTrend.strength > 0.3 && rightTrend.strength > 0.3) {
      changes.push(i);
    }
  }

  return changes;
}

// ==========================================================================
// SEASONALITY & PATTERNS
// ==========================================================================

/**
 * Calculate autocorrelation at a specific lag
 * Measures how correlated a series is with a lagged version of itself
 */
export function autocorrelation(values: number[], lag: number): number {
  if (lag >= values.length || lag < 0) return 0;

  const n = values.length - lag;
  const avg = mean(values);

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < values.length; i++) {
    denominator += Math.pow(values[i]! - avg, 2);
  }

  for (let i = 0; i < n; i++) {
    numerator += (values[i]! - avg) * (values[i + lag]! - avg);
  }

  if (denominator === 0) return 0;
  return numerator / denominator;
}

/**
 * Calculate autocorrelation for multiple lags
 */
export function autocorrelationFunction(values: number[], maxLag: number): number[] {
  const result: number[] = [];

  for (let lag = 0; lag <= maxLag; lag++) {
    result.push(autocorrelation(values, lag));
  }

  return result;
}

/**
 * Detect seasonality period by finding significant autocorrelation peaks
 */
export function detectSeasonality(values: number[], maxPeriod: number = 30): number | null {
  if (values.length < maxPeriod * 2) return null;

  const acf = autocorrelationFunction(values, maxPeriod);

  // Find first significant peak after lag 1
  let maxCorr = 0;
  let period: number | null = null;

  for (let lag = 2; lag < acf.length; lag++) {
    if (acf[lag]! > maxCorr && acf[lag]! > 0.3) {
      // Check if it's a local maximum
      if ((lag === 2 || acf[lag]! > acf[lag - 1]!) &&
          (lag === acf.length - 1 || acf[lag]! > acf[lag + 1]!)) {
        maxCorr = acf[lag]!;
        period = lag;
      }
    }
  }

  return period;
}

// ==========================================================================
// VOLATILITY
// ==========================================================================

/**
 * Rolling volatility (standard deviation over window)
 */
export function rollingVolatility(values: number[], window: number): number[] {
  if (values.length === 0 || window <= 0) return [];
  if (window > values.length) return [standardDeviation(values)];

  const result: number[] = [];

  for (let i = window - 1; i < values.length; i++) {
    const windowSlice = values.slice(i - window + 1, i + 1);
    result.push(standardDeviation(windowSlice));
  }

  return result;
}

/**
 * Average True Range (ATR) style volatility
 * Uses absolute changes rather than standard deviation
 */
export function averageAbsoluteChange(values: number[], window: number): number[] {
  if (values.length < 2 || window <= 0) return [];

  const changes: number[] = [];
  for (let i = 1; i < values.length; i++) {
    changes.push(Math.abs(values[i]! - values[i - 1]!));
  }

  return sma(changes, window);
}

/**
 * Coefficient of variation over rolling window
 * Relative volatility (volatility / mean)
 */
export function rollingCV(values: number[], window: number): number[] {
  if (values.length === 0 || window <= 0) return [];

  const result: number[] = [];

  for (let i = window - 1; i < values.length; i++) {
    const windowSlice = values.slice(i - window + 1, i + 1);
    const avg = mean(windowSlice);
    const std = standardDeviation(windowSlice);
    result.push(avg === 0 ? 0 : (std / Math.abs(avg)) * 100);
  }

  return result;
}

// ==========================================================================
// SMOOTHING & FILTERING
// ==========================================================================

/**
 * Hodrick-Prescott filter (simplified)
 * Separates trend from cyclical component
 * Lambda: 100 for annual, 1600 for quarterly, 129600 for monthly
 */
export function hpFilter(values: number[], lambda: number = 1600): { trend: number[]; cycle: number[] } {
  const n = values.length;
  if (n < 4) {
    return { trend: [...values], cycle: values.map(() => 0) };
  }

  // Simplified HP filter using iterative smoothing
  const trend = [...values];
  const iterations = 100;

  for (let iter = 0; iter < iterations; iter++) {
    const newTrend = [...trend];

    for (let i = 2; i < n - 2; i++) {
      const smooth = (trend[i - 2]! - 4 * trend[i - 1]! + 6 * trend[i]! - 4 * trend[i + 1]! + trend[i + 2]!) / lambda;
      newTrend[i] = values[i]! - smooth;
    }

    for (let i = 0; i < n; i++) {
      trend[i] = newTrend[i]!;
    }
  }

  const cycle = values.map((v, i) => v - trend[i]!);

  return { trend, cycle };
}

/**
 * Savitzky-Golay filter (polynomial smoothing)
 * Better preserves peaks than moving average
 */
export function savitzkyGolay(values: number[], window: number = 5): number[] {
  if (values.length < window) return [...values];

  // Use 2nd order polynomial coefficients for window 5
  const half = Math.floor(window / 2);
  const result: number[] = [];

  // Pad edges
  for (let i = 0; i < half; i++) {
    result.push(values[i]!);
  }

  // Apply filter
  for (let i = half; i < values.length - half; i++) {
    // Simplified: weighted average with center emphasis
    let sum = 0;
    let weights = 0;

    for (let j = -half; j <= half; j++) {
      const weight = 1 / (1 + Math.abs(j));
      sum += values[i + j]! * weight;
      weights += weight;
    }

    result.push(sum / weights);
  }

  // Pad edges
  for (let i = values.length - half; i < values.length; i++) {
    result.push(values[i]!);
  }

  return result;
}

// ==========================================================================
// FORECASTING (Simple)
// ==========================================================================

export interface ForecastResult {
  forecast: number[];
  lower: number[]; // Lower confidence bound
  upper: number[]; // Upper confidence bound
  method: string;
}

/**
 * Simple exponential smoothing forecast
 */
export function forecastSES(values: number[], periods: number, alpha: number = 0.3): ForecastResult {
  if (values.length === 0) {
    return { forecast: [], lower: [], upper: [], method: 'ses' };
  }

  // Calculate smoothed values
  const smoothed = ema(values, Math.round(2 / alpha - 1));
  const lastSmoothed = smoothed[smoothed.length - 1]!;

  // Calculate error for confidence intervals
  const errors = values.slice(1).map((v, i) => v - smoothed[i]!);
  const mse = mean(errors.map(e => e * e));
  const std = Math.sqrt(mse);

  // Forecast is flat for SES
  const forecast: number[] = [];
  const lower: number[] = [];
  const upper: number[] = [];

  for (let i = 1; i <= periods; i++) {
    forecast.push(lastSmoothed);
    // Confidence interval widens with horizon
    const interval = 1.96 * std * Math.sqrt(i);
    lower.push(lastSmoothed - interval);
    upper.push(lastSmoothed + interval);
  }

  return { forecast, lower, upper, method: 'ses' };
}

/**
 * Linear trend forecast
 */
export function forecastLinear(values: number[], periods: number): ForecastResult {
  if (values.length < 2) {
    return { forecast: [], lower: [], upper: [], method: 'linear' };
  }

  const x = values.map((_, i) => i);
  const { slope, intercept, r2 } = linearRegression(x, values);

  // Calculate residual standard error
  const predicted = x.map(xi => slope * xi + intercept);
  const residuals = values.map((v, i) => v - predicted[i]!);
  const rse = standardDeviation(residuals);

  const forecast: number[] = [];
  const lower: number[] = [];
  const upper: number[] = [];
  const n = values.length;

  for (let i = 1; i <= periods; i++) {
    const futureX = n + i - 1;
    const forecastValue = slope * futureX + intercept;
    forecast.push(forecastValue);

    // Prediction interval (wider than confidence interval)
    const interval = 1.96 * rse * Math.sqrt(1 + 1/n + Math.pow(futureX - mean(x), 2) / (n * standardDeviation(x)));
    lower.push(forecastValue - interval);
    upper.push(forecastValue + interval);
  }

  return { forecast, lower, upper, method: 'linear' };
}

// ==========================================================================
// COMPARISON & BENCHMARKING
// ==========================================================================

/**
 * Calculate percentage difference between two series
 */
export function percentageDifference(actual: number[], benchmark: number[]): number[] {
  const minLength = Math.min(actual.length, benchmark.length);
  const result: number[] = [];

  for (let i = 0; i < minLength; i++) {
    if (benchmark[i] === 0) {
      result.push(0);
    } else {
      result.push(((actual[i]! - benchmark[i]!) / Math.abs(benchmark[i]!)) * 100);
    }
  }

  return result;
}

/**
 * Calculate cumulative sum
 */
export function cumsum(values: number[]): number[] {
  const result: number[] = [];
  let sum = 0;

  for (const val of values) {
    sum += val;
    result.push(sum);
  }

  return result;
}

/**
 * Calculate cumulative product (useful for compound returns)
 */
export function cumprod(values: number[]): number[] {
  const result: number[] = [];
  let product = 1;

  for (const val of values) {
    product *= val;
    result.push(product);
  }

  return result;
}

/**
 * Calculate returns from price series
 * Simple returns: (P1 - P0) / P0
 */
export function returns(values: number[], type: 'simple' | 'log' = 'simple'): number[] {
  if (values.length < 2) return [];

  const result: number[] = [];

  for (let i = 1; i < values.length; i++) {
    if (values[i - 1] === 0) {
      result.push(0);
    } else if (type === 'log') {
      result.push(Math.log(values[i]! / values[i - 1]!));
    } else {
      result.push((values[i]! - values[i - 1]!) / values[i - 1]!);
    }
  }

  return result;
}

// ==========================================================================
// TIME SERIES SUMMARY
// ==========================================================================

export interface TimeSeriesStats {
  length: number;
  first: number;
  last: number;
  min: number;
  max: number;
  mean: number;
  std: number;
  trend: TrendResult;
  volatility: number;
  autocorrelation1: number; // Lag-1 autocorrelation
  seasonalPeriod: number | null;
}

/**
 * Get comprehensive time series statistics
 */
export function describeTimeSeries(values: number[]): TimeSeriesStats {
  if (values.length === 0) {
    return {
      length: 0,
      first: 0,
      last: 0,
      min: 0,
      max: 0,
      mean: 0,
      std: 0,
      trend: { direction: 'flat', slope: 0, strength: 0, confidence: 0 },
      volatility: 0,
      autocorrelation1: 0,
      seasonalPeriod: null,
    };
  }

  const avg = mean(values);
  const std = standardDeviation(values);

  return {
    length: values.length,
    first: values[0]!,
    last: values[values.length - 1]!,
    min: Math.min(...values),
    max: Math.max(...values),
    mean: avg,
    std,
    trend: detectTrend(values),
    volatility: avg === 0 ? 0 : (std / Math.abs(avg)) * 100,
    autocorrelation1: autocorrelation(values, 1),
    seasonalPeriod: detectSeasonality(values),
  };
}
