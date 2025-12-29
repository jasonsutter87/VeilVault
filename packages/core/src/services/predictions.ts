// ==========================================================================
// PREDICTIVE RISK ANALYTICS
// Forecasting and trend prediction for GRC metrics
// ==========================================================================

import { randomUUID } from '../utils/crypto.js';
import * as stats from '../lib/stats/index.js';
import type { Risk, RiskCategory } from '../entities/risk.js';
import type { Control } from '../entities/control.js';
import type { Issue } from '../entities/issue.js';

// ==========================================================================
// TYPES
// ==========================================================================

export type PredictionType =
  | 'risk_score'
  | 'control_effectiveness'
  | 'issue_count'
  | 'compliance_score'
  | 'metric_value';

export type PredictionConfidence = 'high' | 'medium' | 'low';
export type TrendDirection = 'improving' | 'stable' | 'deteriorating';

export interface Prediction {
  id: string;
  organizationId: string;
  type: PredictionType;
  entityType?: string;
  entityId?: string;

  // Current state
  currentValue: number;

  // Predictions
  predictions: PredictedValue[];

  // Trend analysis
  trend: TrendDirection;
  trendStrength: number; // 0-1

  // Confidence
  confidence: PredictionConfidence;
  confidenceScore: number; // 0-1

  // Model info
  model: PredictionModel;
  dataPoints: number;

  // Risk indicators
  alerts: PredictionAlert[];

  createdAt: Date;
  expiresAt: Date;
}

export interface PredictedValue {
  period: number; // periods ahead (1, 2, 3...)
  periodLabel: string; // "Next Week", "2 Weeks", etc.
  value: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
}

export type PredictionModel =
  | 'linear_regression'
  | 'exponential_smoothing'
  | 'moving_average'
  | 'weighted_ensemble';

export interface PredictionAlert {
  type: 'threshold_breach' | 'trend_reversal' | 'volatility_spike' | 'anomaly_predicted';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  predictedPeriod?: number;
  predictedValue?: number;
  threshold?: number;
}

// ==========================================================================
// CONFIGURATION
// ==========================================================================

export interface PredictionConfig {
  periodsAhead: number;
  confidenceLevel: number; // 0.90, 0.95, 0.99
  minDataPoints: number;
  smoothingFactor?: number;
  seasonalPeriod?: number;
  thresholds?: {
    critical?: number;
    high?: number;
    medium?: number;
  };
}

const DEFAULT_CONFIG: PredictionConfig = {
  periodsAhead: 4,
  confidenceLevel: 0.95,
  minDataPoints: 10,
  smoothingFactor: 0.3,
};

// ==========================================================================
// RISK SCORE PREDICTION
// ==========================================================================

export interface RiskHistory {
  riskId: string;
  scores: { date: Date; score: number }[];
}

export function predictRiskScores(
  histories: RiskHistory[],
  organizationId: string,
  config: Partial<PredictionConfig> = {}
): Prediction[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const predictions: Prediction[] = [];

  for (const history of histories) {
    if (history.scores.length < cfg.minDataPoints) continue;

    const values = history.scores.map(s => s.score);
    const prediction = createPrediction(
      values,
      'risk_score',
      organizationId,
      cfg,
      'risk',
      history.riskId
    );

    // Add risk-specific alerts
    if (cfg.thresholds) {
      for (const pred of prediction.predictions) {
        if (cfg.thresholds.critical && pred.value >= cfg.thresholds.critical) {
          prediction.alerts.push({
            type: 'threshold_breach',
            severity: 'critical',
            message: `Risk score predicted to reach critical level (${pred.value.toFixed(1)}) in ${pred.periodLabel}`,
            predictedPeriod: pred.period,
            predictedValue: pred.value,
            threshold: cfg.thresholds.critical,
          });
        } else if (cfg.thresholds.high && pred.value >= cfg.thresholds.high) {
          prediction.alerts.push({
            type: 'threshold_breach',
            severity: 'high',
            message: `Risk score predicted to reach high level (${pred.value.toFixed(1)}) in ${pred.periodLabel}`,
            predictedPeriod: pred.period,
            predictedValue: pred.value,
            threshold: cfg.thresholds.high,
          });
        }
      }
    }

    predictions.push(prediction);
  }

  return predictions;
}

// ==========================================================================
// CONTROL EFFECTIVENESS PREDICTION
// ==========================================================================

export interface ControlHistory {
  controlId: string;
  effectiveness: { date: Date; score: number }[];
  testResults: { date: Date; passed: boolean }[];
}

export function predictControlEffectiveness(
  histories: ControlHistory[],
  organizationId: string,
  config: Partial<PredictionConfig> = {}
): Prediction[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const predictions: Prediction[] = [];

  for (const history of histories) {
    if (history.effectiveness.length < cfg.minDataPoints) continue;

    const values = history.effectiveness.map(e => e.score);
    const prediction = createPrediction(
      values,
      'control_effectiveness',
      organizationId,
      cfg,
      'control',
      history.controlId
    );

    // Check for predicted failures
    const failureThreshold = 0.5; // Below 50% is considered failing
    for (const pred of prediction.predictions) {
      if (pred.value < failureThreshold) {
        prediction.alerts.push({
          type: 'threshold_breach',
          severity: pred.value < 0.3 ? 'critical' : 'high',
          message: `Control effectiveness predicted to fall to ${(pred.value * 100).toFixed(0)}% in ${pred.periodLabel}`,
          predictedPeriod: pred.period,
          predictedValue: pred.value,
          threshold: failureThreshold,
        });
      }
    }

    // Calculate test pass rate trend
    if (history.testResults.length >= 5) {
      const passRates = calculateRollingPassRate(history.testResults, 5);
      const passRateTrend = stats.detectTrend(passRates);

      if (passRateTrend.direction === 'down' && passRateTrend.strength > 0.5) {
        prediction.alerts.push({
          type: 'trend_reversal',
          severity: 'medium',
          message: `Control test pass rate is declining (${(passRateTrend.slope * 100).toFixed(1)}% per period)`,
        });
      }
    }

    predictions.push(prediction);
  }

  return predictions;
}

function calculateRollingPassRate(
  results: { date: Date; passed: boolean }[],
  windowSize: number
): number[] {
  if (results.length < windowSize) return [];

  const rates: number[] = [];
  for (let i = windowSize - 1; i < results.length; i++) {
    const window = results.slice(i - windowSize + 1, i + 1);
    const passCount = window.filter(r => r.passed).length;
    rates.push(passCount / windowSize);
  }
  return rates;
}

// ==========================================================================
// ISSUE VOLUME PREDICTION
// ==========================================================================

export interface IssueCounts {
  period: Date;
  opened: number;
  closed: number;
  overdue: number;
}

export function predictIssueVolume(
  counts: IssueCounts[],
  organizationId: string,
  config: Partial<PredictionConfig> = {}
): {
  openedPrediction: Prediction;
  backlogPrediction: Prediction;
  alerts: PredictionAlert[];
} {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  const openedValues = counts.map(c => c.opened);
  const backlogValues = counts.map((c, i) => {
    // Calculate running backlog
    let backlog = 0;
    for (let j = 0; j <= i; j++) {
      backlog += counts[j]!.opened - counts[j]!.closed;
    }
    return Math.max(0, backlog);
  });

  const openedPrediction = createPrediction(
    openedValues,
    'issue_count',
    organizationId,
    cfg
  );

  const backlogPrediction = createPrediction(
    backlogValues,
    'issue_count',
    organizationId,
    cfg
  );

  const alerts: PredictionAlert[] = [];

  // Check for issue surge
  const lastOpened = openedValues[openedValues.length - 1] ?? 0;
  const avgOpened = stats.mean(openedValues.slice(0, -1));
  if (lastOpened > avgOpened * 1.5) {
    alerts.push({
      type: 'anomaly_predicted',
      severity: 'high',
      message: `Issue volume spike detected: ${lastOpened} issues (${((lastOpened / avgOpened - 1) * 100).toFixed(0)}% above average)`,
    });
  }

  // Check backlog trend
  if (backlogPrediction.trend === 'deteriorating') {
    const predictedBacklog = backlogPrediction.predictions[backlogPrediction.predictions.length - 1];
    if (predictedBacklog && predictedBacklog.value > backlogValues[backlogValues.length - 1]! * 1.5) {
      alerts.push({
        type: 'threshold_breach',
        severity: 'high',
        message: `Issue backlog predicted to grow to ${Math.round(predictedBacklog.value)} issues`,
        predictedValue: predictedBacklog.value,
      });
    }
  }

  return { openedPrediction, backlogPrediction, alerts };
}

// ==========================================================================
// COMPLIANCE SCORE PREDICTION
// ==========================================================================

export interface ComplianceHistory {
  period: Date;
  overallScore: number;
  byFramework: Record<string, number>;
}

export function predictComplianceScore(
  history: ComplianceHistory[],
  organizationId: string,
  config: Partial<PredictionConfig> = {}
): {
  overallPrediction: Prediction;
  frameworkPredictions: Record<string, Prediction>;
  alerts: PredictionAlert[];
} {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const alerts: PredictionAlert[] = [];

  // Overall prediction
  const overallValues = history.map(h => h.overallScore);
  const overallPrediction = createPrediction(
    overallValues,
    'compliance_score',
    organizationId,
    cfg
  );

  // Framework-specific predictions
  const frameworkPredictions: Record<string, Prediction> = {};
  const frameworks = new Set<string>();
  history.forEach(h => Object.keys(h.byFramework).forEach(f => frameworks.add(f)));

  for (const framework of frameworks) {
    const frameworkValues = history
      .map(h => h.byFramework[framework])
      .filter((v): v is number => v !== undefined);

    if (frameworkValues.length >= cfg.minDataPoints) {
      frameworkPredictions[framework] = createPrediction(
        frameworkValues,
        'compliance_score',
        organizationId,
        cfg
      );

      // Check for compliance deterioration
      const pred = frameworkPredictions[framework]!;
      if (pred.trend === 'deteriorating' && pred.trendStrength > 0.5) {
        const lastPrediction = pred.predictions[pred.predictions.length - 1];
        if (lastPrediction && lastPrediction.value < 0.8) {
          alerts.push({
            type: 'threshold_breach',
            severity: lastPrediction.value < 0.7 ? 'critical' : 'high',
            message: `${framework} compliance predicted to fall to ${(lastPrediction.value * 100).toFixed(0)}%`,
            predictedValue: lastPrediction.value,
          });
        }
      }
    }
  }

  // Check overall trend
  if (overallPrediction.trend === 'deteriorating') {
    alerts.push({
      type: 'trend_reversal',
      severity: 'medium',
      message: `Overall compliance score showing downward trend`,
    });
  }

  return { overallPrediction, frameworkPredictions, alerts };
}

// ==========================================================================
// METRIC PREDICTION
// ==========================================================================

export function predictMetric(
  values: number[],
  metricName: string,
  organizationId: string,
  config: Partial<PredictionConfig> = {}
): Prediction {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  return createPrediction(values, 'metric_value', organizationId, cfg);
}

// ==========================================================================
// CORE PREDICTION ENGINE
// ==========================================================================

function createPrediction(
  values: number[],
  type: PredictionType,
  organizationId: string,
  config: PredictionConfig,
  entityType?: string,
  entityId?: string
): Prediction {
  const currentValue = values[values.length - 1] ?? 0;

  // Calculate trend
  const trendInfo = stats.detectTrend(values);
  const trend: TrendDirection =
    trendInfo.direction === 'up' ? 'improving' :
    trendInfo.direction === 'down' ? 'deteriorating' : 'stable';

  // Generate predictions using ensemble
  const predictions = generatePredictions(values, config);

  // Calculate confidence
  const { confidence, confidenceScore } = calculateConfidence(values, predictions);

  // Detect volatility for alerts
  const alerts: PredictionAlert[] = [];
  const volatility = stats.coefficientOfVariation(values);
  if (volatility > 0.3) {
    alerts.push({
      type: 'volatility_spike',
      severity: volatility > 0.5 ? 'high' : 'medium',
      message: `High volatility detected (CV: ${(volatility * 100).toFixed(0)}%)`,
    });
  }

  return {
    id: randomUUID(),
    organizationId,
    type,
    entityType,
    entityId,
    currentValue,
    predictions,
    trend,
    trendStrength: trendInfo.strength,
    confidence,
    confidenceScore,
    model: 'weighted_ensemble',
    dataPoints: values.length,
    alerts,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
  };
}

function generatePredictions(
  values: number[],
  config: PredictionConfig
): PredictedValue[] {
  const predictions: PredictedValue[] = [];
  const n = values.length;

  // Use multiple models and ensemble them
  const linearPredictions = predictLinear(values, config.periodsAhead);
  const sesPredictions = predictExponentialSmoothing(values, config.periodsAhead, config.smoothingFactor ?? 0.3);
  const maPredictions = predictMovingAverage(values, config.periodsAhead);

  // Calculate prediction variance for confidence intervals
  const residuals = calculateResiduals(values);
  const residualStd = stats.stdDev(residuals);

  // Z-score for confidence level
  const zScore = getZScore(config.confidenceLevel);

  for (let i = 0; i < config.periodsAhead; i++) {
    const period = i + 1;

    // Weighted ensemble (favor recent-sensitive models)
    const linear = linearPredictions[i] ?? 0;
    const ses = sesPredictions[i] ?? 0;
    const ma = maPredictions[i] ?? 0;

    // Weight: SES 0.4, Linear 0.35, MA 0.25
    const value = ses * 0.4 + linear * 0.35 + ma * 0.25;

    // Widen confidence interval for further predictions
    const intervalWidth = residualStd * zScore * Math.sqrt(period);

    predictions.push({
      period,
      periodLabel: getPeriodLabel(period),
      value,
      lowerBound: value - intervalWidth,
      upperBound: value + intervalWidth,
      confidence: Math.max(0.5, 1 - (period * 0.1)), // Decreasing confidence
    });
  }

  return predictions;
}

function predictLinear(values: number[], periods: number): number[] {
  const xs = values.map((_, i) => i);
  const reg = stats.linearRegression(xs, values);

  const predictions: number[] = [];
  for (let i = 0; i < periods; i++) {
    predictions.push(reg.slope * (values.length + i) + reg.intercept);
  }
  return predictions;
}

function predictExponentialSmoothing(
  values: number[],
  periods: number,
  alpha: number
): number[] {
  // Simple exponential smoothing
  let smoothed = values[0] ?? 0;
  for (const value of values) {
    smoothed = alpha * value + (1 - alpha) * smoothed;
  }

  // For SES, all future predictions are the last smoothed value
  return Array(periods).fill(smoothed);
}

function predictMovingAverage(values: number[], periods: number): number[] {
  const windowSize = Math.min(5, Math.floor(values.length / 2));
  const ma = stats.sma(values, windowSize);
  const lastMA = ma[ma.length - 1] ?? values[values.length - 1] ?? 0;

  // Trend-adjusted MA
  const trend = stats.detectTrend(ma);
  const predictions: number[] = [];

  for (let i = 0; i < periods; i++) {
    predictions.push(lastMA + trend.slope * (i + 1));
  }

  return predictions;
}

function calculateResiduals(values: number[]): number[] {
  if (values.length < 3) return [0];

  const residuals: number[] = [];
  const windowSize = 3;

  for (let i = windowSize; i < values.length; i++) {
    const window = values.slice(i - windowSize, i);
    const predicted = stats.mean(window);
    const actual = values[i]!;
    residuals.push(actual - predicted);
  }

  return residuals;
}

function calculateConfidence(
  values: number[],
  predictions: PredictedValue[]
): { confidence: PredictionConfidence; confidenceScore: number } {
  // Factors that increase confidence:
  // 1. More data points
  // 2. Lower volatility
  // 3. Strong trend (either direction)

  const dataPointScore = Math.min(1, values.length / 30); // Max at 30 points
  const volatility = stats.coefficientOfVariation(values);
  const volatilityScore = Math.max(0, 1 - volatility);
  const trend = stats.detectTrend(values);
  const trendScore = trend.strength;

  const confidenceScore = (dataPointScore * 0.3 + volatilityScore * 0.4 + trendScore * 0.3);

  const confidence: PredictionConfidence =
    confidenceScore >= 0.7 ? 'high' :
    confidenceScore >= 0.4 ? 'medium' : 'low';

  return { confidence, confidenceScore };
}

function getZScore(confidenceLevel: number): number {
  // Common z-scores for confidence intervals
  if (confidenceLevel >= 0.99) return 2.576;
  if (confidenceLevel >= 0.95) return 1.96;
  if (confidenceLevel >= 0.90) return 1.645;
  return 1.28; // 80%
}

function getPeriodLabel(period: number): string {
  if (period === 1) return 'Next Period';
  if (period === 2) return '2 Periods';
  if (period === 3) return '3 Periods';
  return `${period} Periods`;
}

// ==========================================================================
// RISK CLUSTERING & CORRELATION
// ==========================================================================

export interface RiskCluster {
  id: string;
  name: string;
  risks: string[];
  avgScore: number;
  trend: TrendDirection;
  correlationStrength: number;
}

export function identifyRiskClusters(
  risks: Risk[],
  histories: RiskHistory[]
): RiskCluster[] {
  // Group by category
  const byCategory = new Map<RiskCategory, Risk[]>();
  for (const risk of risks) {
    const list = byCategory.get(risk.category) ?? [];
    list.push(risk);
    byCategory.set(risk.category, list);
  }

  const clusters: RiskCluster[] = [];

  for (const [category, categoryRisks] of byCategory) {
    if (categoryRisks.length < 2) continue;

    // Find correlated risks within category
    const riskHistories = categoryRisks
      .map(r => histories.find(h => h.riskId === r.id))
      .filter((h): h is RiskHistory => h !== undefined && h.scores.length >= 5);

    if (riskHistories.length < 2) continue;

    // Calculate pairwise correlations
    const correlations: number[] = [];
    for (let i = 0; i < riskHistories.length; i++) {
      for (let j = i + 1; j < riskHistories.length; j++) {
        const scores1 = riskHistories[i]!.scores.map(s => s.score);
        const scores2 = riskHistories[j]!.scores.map(s => s.score);
        const minLen = Math.min(scores1.length, scores2.length);
        const corr = stats.correlation(
          scores1.slice(-minLen),
          scores2.slice(-minLen)
        );
        if (!isNaN(corr)) correlations.push(Math.abs(corr));
      }
    }

    const avgCorrelation = correlations.length > 0 ? stats.mean(correlations) : 0;

    // Only cluster if correlation is meaningful
    if (avgCorrelation < 0.3) continue;

    const scores = categoryRisks.map(r => r.residualScore);
    const avgScore = stats.mean(scores);

    // Determine trend from histories
    const allScores = riskHistories.flatMap(h => h.scores.map(s => s.score));
    const trend = stats.detectTrend(allScores);

    clusters.push({
      id: randomUUID(),
      name: `${category} Risks`,
      risks: categoryRisks.map(r => r.id),
      avgScore,
      trend: trend.direction === 'up' ? 'deteriorating' :
             trend.direction === 'down' ? 'improving' : 'stable',
      correlationStrength: avgCorrelation,
    });
  }

  return clusters.sort((a, b) => b.avgScore - a.avgScore);
}

// ==========================================================================
// EARLY WARNING SYSTEM
// ==========================================================================

export interface EarlyWarning {
  id: string;
  type: 'risk' | 'control' | 'compliance' | 'issue';
  severity: 'critical' | 'high' | 'medium';
  entityId?: string;
  entityName?: string;
  message: string;
  predictedImpact: string;
  recommendedAction: string;
  confidenceScore: number;
  triggeredAt: Date;
  deadline?: Date;
}

export function generateEarlyWarnings(
  riskPredictions: Prediction[],
  controlPredictions: Prediction[],
  compliancePrediction: Prediction | null
): EarlyWarning[] {
  const warnings: EarlyWarning[] = [];

  // Risk warnings
  for (const pred of riskPredictions) {
    for (const alert of pred.alerts) {
      if (alert.severity === 'critical' || alert.severity === 'high') {
        warnings.push({
          id: randomUUID(),
          type: 'risk',
          severity: alert.severity,
          entityId: pred.entityId,
          message: alert.message,
          predictedImpact: `Risk score may reach ${alert.predictedValue?.toFixed(1) ?? 'elevated levels'}`,
          recommendedAction: 'Review risk mitigation controls and consider additional measures',
          confidenceScore: pred.confidenceScore,
          triggeredAt: new Date(),
        });
      }
    }

    // Trend-based warning
    if (pred.trend === 'deteriorating' && pred.trendStrength > 0.6) {
      warnings.push({
        id: randomUUID(),
        type: 'risk',
        severity: 'medium',
        entityId: pred.entityId,
        message: `Risk showing strong deteriorating trend`,
        predictedImpact: 'Continued increase in risk exposure expected',
        recommendedAction: 'Investigate root causes and strengthen controls',
        confidenceScore: pred.confidenceScore,
        triggeredAt: new Date(),
      });
    }
  }

  // Control warnings
  for (const pred of controlPredictions) {
    for (const alert of pred.alerts) {
      if (alert.severity === 'critical' || alert.severity === 'high') {
        warnings.push({
          id: randomUUID(),
          type: 'control',
          severity: alert.severity,
          entityId: pred.entityId,
          message: alert.message,
          predictedImpact: 'Control may fail to adequately mitigate associated risks',
          recommendedAction: 'Schedule control review and testing, consider control redesign',
          confidenceScore: pred.confidenceScore,
          triggeredAt: new Date(),
        });
      }
    }
  }

  // Compliance warnings
  if (compliancePrediction) {
    for (const alert of compliancePrediction.alerts) {
      warnings.push({
        id: randomUUID(),
        type: 'compliance',
        severity: alert.severity === 'critical' ? 'critical' : 'high',
        message: alert.message,
        predictedImpact: 'Regulatory compliance may be at risk',
        recommendedAction: 'Prioritize remediation of compliance gaps',
        confidenceScore: compliancePrediction.confidenceScore,
        triggeredAt: new Date(),
      });
    }
  }

  return warnings.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

// ==========================================================================
// PREDICTION SUMMARY
// ==========================================================================

export interface PredictionSummary {
  organizationId: string;
  generatedAt: Date;

  // Counts
  totalPredictions: number;
  highConfidencePredictions: number;

  // Trends
  overallRiskTrend: TrendDirection;
  overallControlTrend: TrendDirection;
  overallComplianceTrend: TrendDirection;

  // Alerts
  criticalAlerts: number;
  highAlerts: number;
  mediumAlerts: number;

  // Early warnings
  earlyWarnings: EarlyWarning[];

  // Risk clusters
  riskClusters: RiskCluster[];
}

export function summarizePredictions(
  organizationId: string,
  riskPredictions: Prediction[],
  controlPredictions: Prediction[],
  compliancePrediction: Prediction | null,
  riskClusters: RiskCluster[],
  earlyWarnings: EarlyWarning[]
): PredictionSummary {
  const allPredictions = [
    ...riskPredictions,
    ...controlPredictions,
    ...(compliancePrediction ? [compliancePrediction] : []),
  ];

  const allAlerts = allPredictions.flatMap(p => p.alerts);

  // Aggregate trends
  const riskTrends = riskPredictions.map(p => p.trend);
  const controlTrends = controlPredictions.map(p => p.trend);

  return {
    organizationId,
    generatedAt: new Date(),
    totalPredictions: allPredictions.length,
    highConfidencePredictions: allPredictions.filter(p => p.confidence === 'high').length,
    overallRiskTrend: aggregateTrend(riskTrends),
    overallControlTrend: aggregateTrend(controlTrends),
    overallComplianceTrend: compliancePrediction?.trend ?? 'stable',
    criticalAlerts: allAlerts.filter(a => a.severity === 'critical').length,
    highAlerts: allAlerts.filter(a => a.severity === 'high').length,
    mediumAlerts: allAlerts.filter(a => a.severity === 'medium').length,
    earlyWarnings,
    riskClusters,
  };
}

function aggregateTrend(trends: TrendDirection[]): TrendDirection {
  if (trends.length === 0) return 'stable';

  const counts = { improving: 0, stable: 0, deteriorating: 0 };
  for (const t of trends) counts[t]++;

  if (counts.deteriorating > counts.improving + counts.stable) return 'deteriorating';
  if (counts.improving > counts.deteriorating + counts.stable) return 'improving';
  return 'stable';
}
