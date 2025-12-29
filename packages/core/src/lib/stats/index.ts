// ==========================================================================
// STATISTICS LIBRARY
// Pure TypeScript statistical analysis - zero dependencies
// ==========================================================================
//
// This library provides comprehensive statistical analysis tools:
//
// CORE (core.ts)
// - Basic stats: sum, mean, median, mode, variance, stdDev
// - Percentiles: percentile, quartiles, iqr
// - Z-scores: zScore, zScores
// - Shape: skewness, kurtosis, coefficientOfVariation
// - Relationships: covariance, correlation, linearRegression
// - Normalization: normalize, standardize
// - Summary: describe
//
// TIME SERIES (timeseries.ts)
// - Moving averages: sma, wma, ema, dema, tema
// - Rate of change: roc, momentum, velocity, acceleration
// - Trend detection: detectTrend, detectTrendChanges
// - Seasonality: autocorrelation, autocorrelationFunction, detectSeasonality
// - Volatility: rollingVolatility, averageAbsoluteChange, rollingCV
// - Smoothing: hpFilter, savitzkyGolay
// - Forecasting: forecastSES, forecastLinear
// - Comparison: percentageDifference, cumsum, cumprod, returns
// - Summary: describeTimeSeries
//
// OUTLIERS (outliers.ts)
// - Statistical: detectOutliersZScore, detectOutliersModifiedZScore
// - IQR-based: detectOutliersIQR, mad, detectOutliersMAD
// - Hypothesis testing: grubbsTest, detectOutliersGrubbs
// - Time series: detectTimeSeriesAnomalies, detectSpikes, detectLevelShifts
// - Isolation: calculateIsolationScore, detectOutliersIsolation
// - Ensemble: detectOutliersEnsemble
// - Contextual: detectContextualAnomalies
// - Summary: summarizeAnomalies
//
// ==========================================================================

// Core statistics
export {
  sum,
  mean,
  median,
  mode,
  variance,
  standardDeviation,
  stdDev,
  range,
  percentile,
  quartiles,
  iqr,
  zScore,
  zScores,
  coefficientOfVariation,
  skewness,
  kurtosis,
  covariance,
  correlation,
  normalize,
  standardize,
  linearRegression,
  describe,
  type DescriptiveStats,
} from './core.js';

// Time series analysis
export {
  // Moving averages
  sma,
  wma,
  ema,
  dema,
  tema,
  // Rate of change
  roc,
  momentum,
  velocity,
  acceleration,
  // Trend detection
  detectTrend,
  detectTrendChanges,
  type TrendDirection,
  type TrendResult,
  // Seasonality
  autocorrelation,
  autocorrelationFunction,
  detectSeasonality,
  // Volatility
  rollingVolatility,
  averageAbsoluteChange,
  rollingCV,
  // Smoothing
  hpFilter,
  savitzkyGolay,
  // Forecasting
  forecastSES,
  forecastLinear,
  type ForecastResult,
  // Comparison
  percentageDifference,
  cumsum,
  cumprod,
  returns,
  // Summary
  describeTimeSeries,
  type TimeSeriesStats,
} from './timeseries.js';

// Outlier detection
export {
  // Types
  type OutlierResult,
  type AnomalyDetectionConfig,
  type EnsembleResult,
  type ContextualAnomalyResult,
  type AnomalySummary,
  // Z-score methods
  detectOutliersZScore,
  detectOutliersModifiedZScore,
  // IQR methods
  detectOutliersIQR,
  // MAD methods
  mad,
  detectOutliersMAD,
  // Grubbs' test
  grubbsTest,
  detectOutliersGrubbs,
  // Time series anomalies
  detectTimeSeriesAnomalies,
  detectSpikes,
  detectLevelShifts,
  // Isolation methods
  calculateIsolationScore,
  detectOutliersIsolation,
  // Ensemble detection
  detectOutliersEnsemble,
  // Contextual detection
  detectContextualAnomalies,
  // Summary
  summarizeAnomalies,
} from './outliers.js';
