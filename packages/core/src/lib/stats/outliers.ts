// ==========================================================================
// OUTLIER DETECTION LIBRARY
// Pure TypeScript outlier detection algorithms - zero dependencies
// ==========================================================================

import {
  mean,
  standardDeviation,
  median,
  iqr,
  percentile,
  zScore,
  zScores,
} from './core.js';

import {
  sma,
  ema,
  rollingVolatility,
  detectTrend,
  velocity,
} from './timeseries.js';

// ==========================================================================
// TYPES
// ==========================================================================

export interface OutlierResult {
  index: number;
  value: number;
  score: number;      // How extreme (higher = more anomalous)
  method: string;     // Detection method used
  direction: 'high' | 'low' | 'both';
  threshold: number;  // Threshold used for detection
}

export interface AnomalyDetectionConfig {
  sensitivity: 'low' | 'medium' | 'high';
  methods?: ('zscore' | 'iqr' | 'grubbs' | 'mad' | 'isolation' | 'dbscan')[];
  minConfidence?: number; // 0-1, how many methods must agree
}

// ==========================================================================
// Z-SCORE METHOD
// ==========================================================================

/**
 * Detect outliers using Z-score method
 * Traditional: |z| > 3 for outliers, |z| > 2 for possible outliers
 */
export function detectOutliersZScore(
  values: number[],
  threshold: number = 3
): OutlierResult[] {
  if (values.length < 3) return [];

  const scores = zScores(values);
  const results: OutlierResult[] = [];

  for (let i = 0; i < values.length; i++) {
    const z = scores[i]!;
    if (Math.abs(z) > threshold) {
      results.push({
        index: i,
        value: values[i]!,
        score: Math.abs(z),
        method: 'zscore',
        direction: z > 0 ? 'high' : 'low',
        threshold,
      });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

/**
 * Modified Z-score using median and MAD (more robust)
 */
export function detectOutliersModifiedZScore(
  values: number[],
  threshold: number = 3.5
): OutlierResult[] {
  if (values.length < 3) return [];

  const med = median(values);
  const madValue = mad(values);

  if (madValue === 0) return [];

  // Modified z-score: 0.6745 * (x - median) / MAD
  const k = 0.6745; // Consistency constant for normal distribution

  const results: OutlierResult[] = [];

  for (let i = 0; i < values.length; i++) {
    const modZ = k * (values[i]! - med) / madValue;
    if (Math.abs(modZ) > threshold) {
      results.push({
        index: i,
        value: values[i]!,
        score: Math.abs(modZ),
        method: 'modified_zscore',
        direction: modZ > 0 ? 'high' : 'low',
        threshold,
      });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

// ==========================================================================
// IQR METHOD (Tukey's Fences)
// ==========================================================================

/**
 * Detect outliers using IQR method (Tukey's fences)
 * Default k=1.5 for outliers, k=3 for extreme outliers
 */
export function detectOutliersIQR(
  values: number[],
  k: number = 1.5
): OutlierResult[] {
  if (values.length < 4) return [];

  const q1 = percentile(values, 25);
  const q3 = percentile(values, 75);
  const iqrValue = q3 - q1;

  const lowerFence = q1 - k * iqrValue;
  const upperFence = q3 + k * iqrValue;

  const results: OutlierResult[] = [];

  for (let i = 0; i < values.length; i++) {
    const val = values[i]!;
    if (val < lowerFence) {
      const distance = lowerFence - val;
      results.push({
        index: i,
        value: val,
        score: iqrValue === 0 ? 0 : distance / iqrValue,
        method: 'iqr',
        direction: 'low',
        threshold: lowerFence,
      });
    } else if (val > upperFence) {
      const distance = val - upperFence;
      results.push({
        index: i,
        value: val,
        score: iqrValue === 0 ? 0 : distance / iqrValue,
        method: 'iqr',
        direction: 'high',
        threshold: upperFence,
      });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

// ==========================================================================
// MAD (Median Absolute Deviation)
// ==========================================================================

/**
 * Calculate Median Absolute Deviation
 * More robust than standard deviation
 */
export function mad(values: number[]): number {
  if (values.length === 0) return 0;

  const med = median(values);
  const absoluteDeviations = values.map(v => Math.abs(v - med));

  return median(absoluteDeviations);
}

/**
 * Detect outliers using MAD
 */
export function detectOutliersMAD(
  values: number[],
  threshold: number = 3
): OutlierResult[] {
  if (values.length < 3) return [];

  const med = median(values);
  const madValue = mad(values);

  if (madValue === 0) return [];

  const results: OutlierResult[] = [];

  for (let i = 0; i < values.length; i++) {
    const deviation = Math.abs(values[i]! - med) / madValue;
    if (deviation > threshold) {
      results.push({
        index: i,
        value: values[i]!,
        score: deviation,
        method: 'mad',
        direction: values[i]! > med ? 'high' : 'low',
        threshold,
      });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

// ==========================================================================
// GRUBBS' TEST (Statistical hypothesis test)
// ==========================================================================

/**
 * Grubbs' test for single outlier
 * Returns the most extreme value if it's a statistical outlier
 */
export function grubbsTest(values: number[], alpha: number = 0.05): OutlierResult | null {
  if (values.length < 7) return null; // Need sufficient sample size

  const n = values.length;
  const avg = mean(values);
  const std = standardDeviation(values);

  if (std === 0) return null;

  // Find most extreme value
  let maxGrubbs = 0;
  let maxIndex = 0;
  let direction: 'high' | 'low' = 'high';

  for (let i = 0; i < n; i++) {
    const g = Math.abs(values[i]! - avg) / std;
    if (g > maxGrubbs) {
      maxGrubbs = g;
      maxIndex = i;
      direction = values[i]! > avg ? 'high' : 'low';
    }
  }

  // Critical value (approximation using t-distribution)
  // G_critical ≈ ((n-1)/√n) * √(t²/(n-2+t²))
  // Using simplified critical values table
  const criticalValues: Record<number, number> = {
    7: 2.02, 8: 2.13, 9: 2.22, 10: 2.29,
    15: 2.55, 20: 2.71, 25: 2.82, 30: 2.91,
    40: 3.04, 50: 3.13, 100: 3.38,
  };

  // Interpolate critical value
  let critical = 3.5; // Default for large n
  const keys = Object.keys(criticalValues).map(Number).sort((a, b) => a - b);

  for (let i = 0; i < keys.length - 1; i++) {
    if (n >= keys[i]! && n < keys[i + 1]!) {
      const ratio = (n - keys[i]!) / (keys[i + 1]! - keys[i]!);
      critical = criticalValues[keys[i]!]! +
        ratio * (criticalValues[keys[i + 1]!]! - criticalValues[keys[i]!]!);
      break;
    }
  }

  if (maxGrubbs > critical) {
    return {
      index: maxIndex,
      value: values[maxIndex]!,
      score: maxGrubbs,
      method: 'grubbs',
      direction,
      threshold: critical,
    };
  }

  return null;
}

/**
 * Iterative Grubbs' test (remove outliers one at a time)
 */
export function detectOutliersGrubbs(
  values: number[],
  alpha: number = 0.05,
  maxOutliers: number = 10
): OutlierResult[] {
  const results: OutlierResult[] = [];
  const remaining = [...values];
  const originalIndices = values.map((_, i) => i);

  for (let i = 0; i < maxOutliers; i++) {
    if (remaining.length < 7) break;

    // Create a temporary array for testing
    const testValues = [...remaining];
    const testIndices = [...originalIndices];

    // Find the original index
    let offset = 0;
    const outlier = grubbsTest(testValues, alpha);

    if (!outlier) break;

    // Map back to original index
    let removedOriginalIdx = -1;
    let count = 0;
    for (let j = 0; j < values.length; j++) {
      if (testIndices.includes(j)) {
        if (count === outlier.index) {
          removedOriginalIdx = j;
          break;
        }
        count++;
      }
    }

    if (removedOriginalIdx === -1) break;

    results.push({
      ...outlier,
      index: removedOriginalIdx,
    });

    // Remove from remaining
    const remainingIdx = remaining.findIndex((_, idx) =>
      originalIndices.filter((oi, ri) => ri < remaining.length)[idx] === removedOriginalIdx
    );

    if (remainingIdx !== -1) {
      remaining.splice(remainingIdx, 1);
      const origIdxPos = originalIndices.indexOf(removedOriginalIdx);
      if (origIdxPos !== -1) {
        originalIndices.splice(origIdxPos, 1);
      }
    }
  }

  return results;
}

// ==========================================================================
// TIME SERIES ANOMALY DETECTION
// ==========================================================================

/**
 * Detect anomalies in time series using rolling statistics
 */
export function detectTimeSeriesAnomalies(
  values: number[],
  window: number = 10,
  threshold: number = 3
): OutlierResult[] {
  if (values.length < window + 1) return [];

  const results: OutlierResult[] = [];

  for (let i = window; i < values.length; i++) {
    const windowValues = values.slice(i - window, i);
    const avg = mean(windowValues);
    const std = standardDeviation(windowValues);

    if (std === 0) continue;

    const z = zScore(values[i]!, avg, std);

    if (Math.abs(z) > threshold) {
      results.push({
        index: i,
        value: values[i]!,
        score: Math.abs(z),
        method: 'rolling_zscore',
        direction: z > 0 ? 'high' : 'low',
        threshold,
      });
    }
  }

  return results;
}

/**
 * Detect sudden changes/spikes in time series
 */
export function detectSpikes(
  values: number[],
  window: number = 5,
  threshold: number = 2
): OutlierResult[] {
  if (values.length < window + 1) return [];

  const results: OutlierResult[] = [];
  const smoothed = sma(values, window);

  // Compare each value to its smoothed counterpart
  const startOffset = window - 1;

  for (let i = startOffset; i < values.length; i++) {
    const smoothedIdx = i - startOffset;
    const smoothedVal = smoothed[smoothedIdx];

    if (smoothedVal === undefined) continue;

    const diff = Math.abs(values[i]! - smoothedVal);
    const vol = rollingVolatility(values.slice(0, i + 1), window);
    const currentVol = vol[vol.length - 1] || 1;

    const score = diff / currentVol;

    if (score > threshold) {
      results.push({
        index: i,
        value: values[i]!,
        score,
        method: 'spike_detection',
        direction: values[i]! > smoothedVal ? 'high' : 'low',
        threshold,
      });
    }
  }

  return results;
}

/**
 * Detect level shifts (sudden permanent changes in mean)
 */
export function detectLevelShifts(
  values: number[],
  window: number = 10,
  threshold: number = 2
): OutlierResult[] {
  if (values.length < window * 2 + 1) return [];

  const results: OutlierResult[] = [];

  for (let i = window; i < values.length - window; i++) {
    const beforeWindow = values.slice(i - window, i);
    const afterWindow = values.slice(i + 1, i + 1 + window);

    const beforeMean = mean(beforeWindow);
    const afterMean = mean(afterWindow);
    const pooledStd = Math.sqrt(
      (standardDeviation(beforeWindow) ** 2 + standardDeviation(afterWindow) ** 2) / 2
    );

    if (pooledStd === 0) continue;

    const shift = Math.abs(afterMean - beforeMean) / pooledStd;

    if (shift > threshold) {
      results.push({
        index: i,
        value: values[i]!,
        score: shift,
        method: 'level_shift',
        direction: afterMean > beforeMean ? 'high' : 'low',
        threshold,
      });
    }
  }

  return results;
}

// ==========================================================================
// ISOLATION FOREST (Simplified)
// ==========================================================================

/**
 * Simplified isolation score calculation
 * Based on how easy it is to "isolate" a point
 */
export function calculateIsolationScore(value: number, values: number[]): number {
  if (values.length < 2) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const valueIdx = sorted.findIndex(v => v >= value);

  // Calculate how "isolated" this value is
  // Points at extremes or in sparse regions have higher scores
  const leftGap = valueIdx === 0 ? Infinity :
    value - sorted[valueIdx - 1]!;
  const rightGap = valueIdx === sorted.length - 1 ? Infinity :
    sorted[valueIdx + 1]! - value;

  const avgGap = (sorted[sorted.length - 1]! - sorted[0]!) / (sorted.length - 1);

  // Score based on relative gap size
  const minGap = Math.min(leftGap, rightGap);
  const maxGap = Math.max(leftGap, rightGap);

  // Higher score = more isolated
  return avgGap === 0 ? 0 : maxGap / avgGap;
}

/**
 * Detect outliers using simplified isolation method
 */
export function detectOutliersIsolation(
  values: number[],
  threshold: number = 2
): OutlierResult[] {
  if (values.length < 10) return [];

  const results: OutlierResult[] = [];

  for (let i = 0; i < values.length; i++) {
    const score = calculateIsolationScore(values[i]!, values);

    if (score > threshold) {
      const avg = mean(values);
      results.push({
        index: i,
        value: values[i]!,
        score,
        method: 'isolation',
        direction: values[i]! > avg ? 'high' : 'low',
        threshold,
      });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

// ==========================================================================
// ENSEMBLE DETECTION
// ==========================================================================

export interface EnsembleResult extends OutlierResult {
  confidence: number;  // 0-1, how many methods agreed
  methods: string[];   // Which methods detected this
}

/**
 * Detect outliers using multiple methods and voting
 */
export function detectOutliersEnsemble(
  values: number[],
  config: AnomalyDetectionConfig = { sensitivity: 'medium' }
): EnsembleResult[] {
  // Determine thresholds based on sensitivity
  const thresholds = {
    low: { zscore: 3.5, iqr: 2.2, mad: 4, grubbs: 0.01 },
    medium: { zscore: 3, iqr: 1.5, mad: 3, grubbs: 0.05 },
    high: { zscore: 2.5, iqr: 1.3, mad: 2.5, grubbs: 0.1 },
  };

  const t = thresholds[config.sensitivity];
  const methods = config.methods || ['zscore', 'iqr', 'mad', 'grubbs'];
  const minConfidence = config.minConfidence ?? 0.5;

  // Helper type for accumulating results
  type ResultAccumulator = { methods: string[]; scores: number[]; value: number; direction: 'high' | 'low' };

  // Run each method
  const allResults = new Map<number, ResultAccumulator>();

  const addResult = (r: OutlierResult, methodName: string) => {
    const existing = allResults.get(r.index);
    if (existing) {
      existing.methods.push(methodName);
      existing.scores.push(r.score);
    } else {
      allResults.set(r.index, {
        methods: [methodName],
        scores: [r.score],
        value: r.value,
        direction: r.direction === 'both' ? 'high' : r.direction,
      });
    }
  };

  if (methods.includes('zscore')) {
    const results = detectOutliersZScore(values, t.zscore);
    for (const r of results) {
      addResult(r, 'zscore');
    }
  }

  if (methods.includes('iqr')) {
    const results = detectOutliersIQR(values, t.iqr);
    for (const r of results) {
      addResult(r, 'iqr');
    }
  }

  if (methods.includes('mad')) {
    const results = detectOutliersMAD(values, t.mad);
    for (const r of results) {
      addResult(r, 'mad');
    }
  }

  if (methods.includes('grubbs')) {
    const results = detectOutliersGrubbs(values, t.grubbs);
    for (const r of results) {
      addResult(r, 'grubbs');
    }
  }

  if (methods.includes('isolation')) {
    const results = detectOutliersIsolation(values);
    for (const r of results) {
      addResult(r, 'isolation');
    }
  }

  // Convert to ensemble results with confidence
  const ensembleResults: EnsembleResult[] = [];

  for (const [index, data] of allResults) {
    const confidence = data.methods.length / methods.length;

    if (confidence >= minConfidence) {
      ensembleResults.push({
        index,
        value: data.value,
        score: mean(data.scores),
        method: 'ensemble',
        direction: data.direction,
        threshold: minConfidence,
        confidence,
        methods: data.methods,
      });
    }
  }

  return ensembleResults.sort((a, b) => b.confidence - a.confidence || b.score - a.score);
}

// ==========================================================================
// CONTEXTUAL ANOMALY DETECTION
// ==========================================================================

export interface ContextualAnomalyResult extends OutlierResult {
  context: string;     // What made this anomalous in context
  expectedRange: { min: number; max: number };
}

/**
 * Detect anomalies considering context (day of week, trends, etc.)
 */
export function detectContextualAnomalies(
  values: number[],
  context: {
    timestamps?: Date[];
    categories?: string[];
  } = {},
  threshold: number = 2.5
): ContextualAnomalyResult[] {
  const results: ContextualAnomalyResult[] = [];

  // If we have timestamps, check for day-of-week patterns
  if (context.timestamps && context.timestamps.length === values.length) {
    const byDayOfWeek: Map<number, number[]> = new Map();

    for (let i = 0; i < values.length; i++) {
      const dow = context.timestamps[i]!.getDay();
      const existing = byDayOfWeek.get(dow) || [];
      existing.push(values[i]!);
      byDayOfWeek.set(dow, existing);
    }

    // Check each value against its day-of-week cohort
    for (let i = 0; i < values.length; i++) {
      const dow = context.timestamps[i]!.getDay();
      const cohort = byDayOfWeek.get(dow) || [];

      if (cohort.length < 3) continue;

      const cohortMean = mean(cohort);
      const cohortStd = standardDeviation(cohort);

      if (cohortStd === 0) continue;

      const z = zScore(values[i]!, cohortMean, cohortStd);

      if (Math.abs(z) > threshold) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        results.push({
          index: i,
          value: values[i]!,
          score: Math.abs(z),
          method: 'contextual_dow',
          direction: z > 0 ? 'high' : 'low',
          threshold,
          context: `Unusual for ${dayNames[dow]}`,
          expectedRange: {
            min: cohortMean - threshold * cohortStd,
            max: cohortMean + threshold * cohortStd,
          },
        });
      }
    }
  }

  // If we have categories, check within each category
  if (context.categories && context.categories.length === values.length) {
    const byCategory: Map<string, { indices: number[]; values: number[] }> = new Map();

    for (let i = 0; i < values.length; i++) {
      const cat = context.categories[i]!;
      const existing = byCategory.get(cat) || { indices: [], values: [] };
      existing.indices.push(i);
      existing.values.push(values[i]!);
      byCategory.set(cat, existing);
    }

    for (const [category, data] of byCategory) {
      if (data.values.length < 3) continue;

      const catMean = mean(data.values);
      const catStd = standardDeviation(data.values);

      if (catStd === 0) continue;

      for (let j = 0; j < data.values.length; j++) {
        const z = zScore(data.values[j]!, catMean, catStd);

        if (Math.abs(z) > threshold) {
          results.push({
            index: data.indices[j]!,
            value: data.values[j]!,
            score: Math.abs(z),
            method: 'contextual_category',
            direction: z > 0 ? 'high' : 'low',
            threshold,
            context: `Unusual for category: ${category}`,
            expectedRange: {
              min: catMean - threshold * catStd,
              max: catMean + threshold * catStd,
            },
          });
        }
      }
    }
  }

  // Deduplicate by index, keeping highest score
  const uniqueResults: Map<number, ContextualAnomalyResult> = new Map();
  for (const r of results) {
    const existing = uniqueResults.get(r.index);
    if (!existing || r.score > existing.score) {
      uniqueResults.set(r.index, r);
    }
  }

  return Array.from(uniqueResults.values()).sort((a, b) => b.score - a.score);
}

// ==========================================================================
// SUMMARY
// ==========================================================================

export interface AnomalySummary {
  totalPoints: number;
  outlierCount: number;
  outlierPercentage: number;
  methods: {
    method: string;
    count: number;
  }[];
  mostAnomalous: OutlierResult | null;
  distribution: {
    high: number;
    low: number;
  };
}

/**
 * Get summary of detected anomalies
 */
export function summarizeAnomalies(
  values: number[],
  config: AnomalyDetectionConfig = { sensitivity: 'medium' }
): AnomalySummary {
  const results = detectOutliersEnsemble(values, config);

  const methodCounts: Map<string, number> = new Map();
  let highCount = 0;
  let lowCount = 0;

  for (const r of results) {
    for (const m of (r as EnsembleResult).methods) {
      methodCounts.set(m, (methodCounts.get(m) || 0) + 1);
    }
    if (r.direction === 'high') highCount++;
    else lowCount++;
  }

  return {
    totalPoints: values.length,
    outlierCount: results.length,
    outlierPercentage: values.length === 0 ? 0 : (results.length / values.length) * 100,
    methods: Array.from(methodCounts.entries())
      .map(([method, count]) => ({ method, count }))
      .sort((a, b) => b.count - a.count),
    mostAnomalous: results.length > 0 ? results[0]! : null,
    distribution: { high: highCount, low: lowCount },
  };
}
