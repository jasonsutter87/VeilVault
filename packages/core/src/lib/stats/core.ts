// ==========================================================================
// CORE STATISTICS LIBRARY
// Pure TypeScript statistical functions - zero dependencies
// ==========================================================================

/**
 * Calculate the sum of an array of numbers
 */
export function sum(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((acc, val) => acc + val, 0);
}

/**
 * Calculate the arithmetic mean (average)
 */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return sum(values) / values.length;
}

/**
 * Calculate the median (middle value)
 */
export function median(values: number[]): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

/**
 * Calculate the mode (most frequent value)
 * Returns array in case of multiple modes
 */
export function mode(values: number[]): number[] {
  if (values.length === 0) return [];

  const counts = new Map<number, number>();
  let maxCount = 0;

  for (const val of values) {
    const count = (counts.get(val) ?? 0) + 1;
    counts.set(val, count);
    if (count > maxCount) maxCount = count;
  }

  const modes: number[] = [];
  for (const [val, count] of counts) {
    if (count === maxCount) modes.push(val);
  }

  return modes.sort((a, b) => a - b);
}

/**
 * Calculate population variance
 */
export function variance(values: number[], sample = false): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return 0;

  const avg = mean(values);
  const squaredDiffs = values.map(val => Math.pow(val - avg, 2));
  const divisor = sample ? values.length - 1 : values.length;

  return sum(squaredDiffs) / divisor;
}

/**
 * Calculate standard deviation
 */
export function standardDeviation(values: number[], sample = false): number {
  return Math.sqrt(variance(values, sample));
}

/**
 * Alias for standardDeviation
 */
export const stdDev = standardDeviation;

/**
 * Calculate the range (max - min)
 */
export function range(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.max(...values) - Math.min(...values);
}

/**
 * Calculate a specific percentile
 * @param values - Array of numbers
 * @param p - Percentile (0-100)
 */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  if (p < 0 || p > 100) throw new Error('Percentile must be between 0 and 100');

  const sorted = [...values].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) return sorted[lower]!;

  const weight = index - lower;
  return sorted[lower]! * (1 - weight) + sorted[upper]! * weight;
}

/**
 * Calculate quartiles (Q1, Q2/median, Q3)
 */
export function quartiles(values: number[]): { q1: number; q2: number; q3: number } {
  return {
    q1: percentile(values, 25),
    q2: percentile(values, 50),
    q3: percentile(values, 75),
  };
}

/**
 * Calculate Interquartile Range (IQR)
 */
export function iqr(values: number[]): number {
  const q = quartiles(values);
  return q.q3 - q.q1;
}

/**
 * Calculate Z-score for a single value
 */
export function zScore(value: number, values: number[]): number;
export function zScore(value: number, avg: number, std: number): number;
export function zScore(value: number, valuesOrMean: number[] | number, std?: number): number {
  let avg: number;
  let stdDeviation: number;

  if (Array.isArray(valuesOrMean)) {
    avg = mean(valuesOrMean);
    stdDeviation = standardDeviation(valuesOrMean);
  } else {
    avg = valuesOrMean;
    stdDeviation = std!;
  }

  if (stdDeviation === 0) return 0;
  return (value - avg) / stdDeviation;
}

/**
 * Calculate Z-scores for all values in an array
 */
export function zScores(values: number[]): number[] {
  const avg = mean(values);
  const std = standardDeviation(values);

  if (std === 0) return values.map(() => 0);
  return values.map(val => (val - avg) / std);
}

/**
 * Calculate coefficient of variation (CV)
 * Measures relative variability as a percentage
 */
export function coefficientOfVariation(values: number[]): number {
  const avg = mean(values);
  if (avg === 0) return 0;
  return (standardDeviation(values) / Math.abs(avg)) * 100;
}

/**
 * Calculate skewness (asymmetry of distribution)
 * Positive = right tail longer, Negative = left tail longer
 */
export function skewness(values: number[]): number {
  if (values.length < 3) return 0;

  const n = values.length;
  const avg = mean(values);
  const std = standardDeviation(values);

  if (std === 0) return 0;

  const cubedDiffs = values.map(val => Math.pow((val - avg) / std, 3));
  return (n / ((n - 1) * (n - 2))) * sum(cubedDiffs);
}

/**
 * Calculate kurtosis (tailedness of distribution)
 * Higher = heavier tails, more outliers
 */
export function kurtosis(values: number[]): number {
  if (values.length < 4) return 0;

  const n = values.length;
  const avg = mean(values);
  const std = standardDeviation(values);

  if (std === 0) return 0;

  const fourthPowers = values.map(val => Math.pow((val - avg) / std, 4));
  const m4 = sum(fourthPowers) / n;

  // Excess kurtosis (normal distribution = 0)
  return m4 - 3;
}

/**
 * Calculate covariance between two arrays
 */
export function covariance(x: number[], y: number[], sample = false): number {
  if (x.length !== y.length) throw new Error('Arrays must have equal length');
  if (x.length === 0) return 0;

  const xMean = mean(x);
  const yMean = mean(y);

  const products = x.map((xi, i) => (xi - xMean) * (y[i]! - yMean));
  const divisor = sample ? x.length - 1 : x.length;

  return sum(products) / divisor;
}

/**
 * Calculate Pearson correlation coefficient
 * Returns value between -1 and 1
 */
export function correlation(x: number[], y: number[]): number {
  if (x.length !== y.length) throw new Error('Arrays must have equal length');
  if (x.length === 0) return 0;

  const xStd = standardDeviation(x);
  const yStd = standardDeviation(y);

  if (xStd === 0 || yStd === 0) return 0;

  return covariance(x, y) / (xStd * yStd);
}

/**
 * Normalize values to 0-1 range (min-max scaling)
 */
export function normalize(values: number[]): number[] {
  if (values.length === 0) return [];

  const min = Math.min(...values);
  const max = Math.max(...values);
  const rangeVal = max - min;

  if (rangeVal === 0) return values.map(() => 0.5);
  return values.map(val => (val - min) / rangeVal);
}

/**
 * Standardize values (Z-score normalization)
 * Results in mean=0, std=1
 */
export function standardize(values: number[]): number[] {
  return zScores(values);
}

/**
 * Calculate simple linear regression
 * Returns slope and intercept: y = slope * x + intercept
 */
export function linearRegression(x: number[], y: number[]): { slope: number; intercept: number; r2: number } {
  if (x.length !== y.length) throw new Error('Arrays must have equal length');
  if (x.length < 2) return { slope: 0, intercept: 0, r2: 0 };

  const n = x.length;
  const xMean = mean(x);
  const yMean = mean(y);

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    const xDiff = x[i]! - xMean;
    numerator += xDiff * (y[i]! - yMean);
    denominator += xDiff * xDiff;
  }

  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = yMean - slope * xMean;

  // Calculate R-squared
  const predictions = x.map(xi => slope * xi + intercept);
  const ssRes = sum(y.map((yi, i) => Math.pow(yi - predictions[i]!, 2)));
  const ssTot = sum(y.map(yi => Math.pow(yi - yMean, 2)));
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  return { slope, intercept, r2 };
}

/**
 * Descriptive statistics summary
 */
export interface DescriptiveStats {
  count: number;
  sum: number;
  mean: number;
  median: number;
  mode: number[];
  min: number;
  max: number;
  range: number;
  variance: number;
  stdDev: number;
  cv: number; // Coefficient of variation
  q1: number;
  q2: number;
  q3: number;
  iqr: number;
  skewness: number;
  kurtosis: number;
}

/**
 * Calculate all descriptive statistics for an array
 */
export function describe(values: number[]): DescriptiveStats {
  if (values.length === 0) {
    return {
      count: 0, sum: 0, mean: 0, median: 0, mode: [],
      min: 0, max: 0, range: 0, variance: 0, stdDev: 0, cv: 0,
      q1: 0, q2: 0, q3: 0, iqr: 0, skewness: 0, kurtosis: 0,
    };
  }

  const q = quartiles(values);

  return {
    count: values.length,
    sum: sum(values),
    mean: mean(values),
    median: median(values),
    mode: mode(values),
    min: Math.min(...values),
    max: Math.max(...values),
    range: range(values),
    variance: variance(values),
    stdDev: standardDeviation(values),
    cv: coefficientOfVariation(values),
    q1: q.q1,
    q2: q.q2,
    q3: q.q3,
    iqr: iqr(values),
    skewness: skewness(values),
    kurtosis: kurtosis(values),
  };
}
