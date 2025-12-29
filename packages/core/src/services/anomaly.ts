// ==========================================================================
// GRC ANOMALY DETECTION SERVICE
// Detects unusual patterns in GRC data using statistical methods
// ==========================================================================

import { randomUUID } from '../utils/crypto.js';
import type { Risk } from '../entities/risk.js';
import type { Control, ControlEffectiveness } from '../entities/control.js';
import type { Issue } from '../entities/issue.js';
import {
  mean,
  standardDeviation,
  zScore,
  detectTrend,
  ema,
  detectOutliersEnsemble,
  detectTimeSeriesAnomalies,
  detectSpikes,
  detectLevelShifts,
  summarizeAnomalies,
  describeTimeSeries,
  type TrendResult,
  type OutlierResult,
  type AnomalyDetectionConfig as StatsAnomalyConfig,
} from '../lib/stats/index.js';

// Re-export for external use
export type { StatsAnomalyConfig as AnomalyDetectionConfig };

// ==========================================================================
// TYPES
// ==========================================================================

export type AnomalyType =
  | 'risk_score_spike'
  | 'control_failure_cluster'
  | 'issue_surge'
  | 'unusual_pattern'
  | 'trend_change'
  | 'seasonal_deviation'
  | 'threshold_breach'
  | 'velocity_anomaly';

export type AnomalySeverity = 'info' | 'warning' | 'critical';

export interface GrcAnomaly {
  id: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  title: string;
  description: string;
  detectedAt: Date;
  entityType: 'risk' | 'control' | 'issue' | 'metric';
  entityIds: string[];
  anomalyScore: number;
  confidence: number;
  method: string;
  context: {
    expectedRange?: { min: number; max: number };
    actualValue?: number;
    trend?: TrendResult;
    historicalMean?: number;
    historicalStd?: number;
  };
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolution?: string;
  resolvedAt?: Date;
}

export interface AnomalyDetectionResult {
  anomalies: GrcAnomaly[];
  summary: {
    totalChecked: number;
    anomaliesFound: number;
    bySeverity: { info: number; warning: number; critical: number };
    byType: Record<AnomalyType, number>;
  };
  timestamp: Date;
}

export interface TimeSeriesDataPoint {
  timestamp: Date;
  value: number;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export interface GrcMetricConfig {
  name: string;
  thresholds?: {
    warning: number;
    critical: number;
    direction: 'above' | 'below';
  };
  expectedRange?: { min: number; max: number };
  sensitivity?: 'low' | 'medium' | 'high';
}

// ==========================================================================
// RISK ANOMALY DETECTION
// ==========================================================================

/**
 * Detect anomalies in risk scores over time
 */
export function detectRiskScoreAnomalies(
  risks: Risk[],
  historicalScores: Map<string, number[]>,
  config: StatsAnomalyConfig = { sensitivity: 'medium' }
): GrcAnomaly[] {
  const anomalies: GrcAnomaly[] = [];

  for (const risk of risks) {
    const history = historicalScores.get(risk.id);
    if (!history || history.length < 5) continue;

    // Current residual score
    const currentScore = risk.residualScore;

    // Add current score to history for analysis
    const fullHistory = [...history, currentScore];

    // Detect spikes
    const spikes = detectSpikes(fullHistory, 5, 2);
    const latestSpike = spikes.find(s => s.index === fullHistory.length - 1);

    if (latestSpike) {
      anomalies.push({
        id: randomUUID(),
        type: 'risk_score_spike',
        severity: latestSpike.score > 3 ? 'critical' : 'warning',
        title: `Risk score spike: ${risk.name}`,
        description: `Risk score jumped from historical average of ${mean(history).toFixed(1)} to ${currentScore}`,
        detectedAt: new Date(),
        entityType: 'risk',
        entityIds: [risk.id],
        anomalyScore: latestSpike.score,
        confidence: Math.min(latestSpike.score / 5, 1),
        method: 'spike_detection',
        context: {
          actualValue: currentScore,
          historicalMean: mean(history),
          historicalStd: standardDeviation(history),
        },
        acknowledged: false,
      });
    }

    // Detect trend changes
    const trend = detectTrend(fullHistory);
    if (trend.direction === 'up' && trend.confidence > 0.7) {
      anomalies.push({
        id: randomUUID(),
        type: 'trend_change',
        severity: trend.slope > 0.5 ? 'warning' : 'info',
        title: `Increasing risk trend: ${risk.name}`,
        description: `Risk score showing consistent upward trend with ${(trend.confidence * 100).toFixed(0)}% confidence`,
        detectedAt: new Date(),
        entityType: 'risk',
        entityIds: [risk.id],
        anomalyScore: trend.slope,
        confidence: trend.confidence,
        method: 'trend_detection',
        context: { trend },
        acknowledged: false,
      });
    }
  }

  return anomalies;
}

/**
 * Detect unusual clustering of high-risk items
 */
export function detectRiskClusters(
  risks: Risk[],
  config: { highRiskThreshold?: number } = {}
): GrcAnomaly[] {
  const anomalies: GrcAnomaly[] = [];
  const threshold = config.highRiskThreshold ?? 15;

  // Group by category
  const byCategory = new Map<string, Risk[]>();
  for (const risk of risks) {
    const cat = risk.category;
    const existing = byCategory.get(cat) || [];
    existing.push(risk);
    byCategory.set(cat, existing);
  }

  // Check each category
  for (const [category, categoryRisks] of byCategory) {
    const highRisks = categoryRisks.filter(r => r.residualScore >= threshold);

    const highRiskRatio = highRisks.length / categoryRisks.length;

    if (highRiskRatio > 0.5 && highRisks.length >= 3) {
      anomalies.push({
        id: randomUUID(),
        type: 'unusual_pattern',
        severity: highRiskRatio > 0.7 ? 'critical' : 'warning',
        title: `High-risk concentration in ${category}`,
        description: `${(highRiskRatio * 100).toFixed(0)}% of risks in ${category} are high severity (${highRisks.length}/${categoryRisks.length})`,
        detectedAt: new Date(),
        entityType: 'risk',
        entityIds: highRisks.map(r => r.id),
        anomalyScore: highRiskRatio,
        confidence: 0.9,
        method: 'cluster_detection',
        context: {},
        acknowledged: false,
      });
    }
  }

  return anomalies;
}

// ==========================================================================
// CONTROL ANOMALY DETECTION
// ==========================================================================

/**
 * Check if control effectiveness indicates failure
 */
function isControlFailing(effectiveness: ControlEffectiveness): boolean {
  return effectiveness === 'ineffective' || effectiveness === 'partially_effective';
}

/**
 * Detect unusual control failure patterns
 */
export function detectControlFailureAnomalies(
  controls: Control[],
  historicalFailureRates: Map<string, number[]>,
  config: StatsAnomalyConfig = { sensitivity: 'medium' }
): GrcAnomaly[] {
  const anomalies: GrcAnomaly[] = [];

  // Check for clusters of failing controls
  const failingControls = controls.filter(c => isControlFailing(c.currentEffectiveness));

  const failureRate = controls.length > 0 ? failingControls.length / controls.length : 0;

  if (failureRate > 0.2 && failingControls.length >= 3) {
    anomalies.push({
      id: randomUUID(),
      type: 'control_failure_cluster',
      severity: failureRate > 0.3 ? 'critical' : 'warning',
      title: 'Control failure cluster detected',
      description: `${(failureRate * 100).toFixed(0)}% of controls are failing (${failingControls.length}/${controls.length})`,
      detectedAt: new Date(),
      entityType: 'control',
      entityIds: failingControls.map(c => c.id),
      anomalyScore: failureRate,
      confidence: 0.95,
      method: 'cluster_detection',
      context: {},
      acknowledged: false,
    });
  }

  // Check individual control failure rate trends
  for (const control of controls) {
    const history = historicalFailureRates.get(control.id);
    if (!history || history.length < 5) continue;

    // Current failure rate (1 if failed, 0 if effective)
    const currentFailure = isControlFailing(control.currentEffectiveness) ? 1 : 0;
    const fullHistory = [...history, currentFailure];

    // Use EMA to detect if failure rate is trending up
    const smoothed = ema(fullHistory, 3);
    const latestSmoothed = smoothed[smoothed.length - 1]!;

    if (latestSmoothed > 0.6 && mean(history.slice(0, -3)) < 0.3) {
      anomalies.push({
        id: randomUUID(),
        type: 'trend_change',
        severity: 'warning',
        title: `Degrading control: ${control.name}`,
        description: `Control effectiveness declining - failure rate trend at ${(latestSmoothed * 100).toFixed(0)}%`,
        detectedAt: new Date(),
        entityType: 'control',
        entityIds: [control.id],
        anomalyScore: latestSmoothed,
        confidence: 0.8,
        method: 'ema_trend',
        context: {
          historicalMean: mean(history),
        },
        acknowledged: false,
      });
    }
  }

  return anomalies;
}

/**
 * Detect controls with unusual test gaps
 */
export function detectControlTestGaps(
  controls: Control[],
  config: { maxDaysWithoutTest?: number } = {}
): GrcAnomaly[] {
  const anomalies: GrcAnomaly[] = [];
  const maxDays = config.maxDaysWithoutTest ?? 90;
  const now = new Date();

  for (const control of controls) {
    if (!control.lastTestedAt) continue;

    const daysSinceTest = Math.floor(
      (now.getTime() - control.lastTestedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceTest > maxDays) {
      const severity: AnomalySeverity = daysSinceTest > maxDays * 2 ? 'critical' :
                                        daysSinceTest > maxDays * 1.5 ? 'warning' : 'info';

      anomalies.push({
        id: randomUUID(),
        type: 'threshold_breach',
        severity,
        title: `Control test overdue: ${control.name}`,
        description: `Control has not been tested in ${daysSinceTest} days (threshold: ${maxDays} days)`,
        detectedAt: new Date(),
        entityType: 'control',
        entityIds: [control.id],
        anomalyScore: daysSinceTest / maxDays,
        confidence: 1,
        method: 'threshold_check',
        context: {
          actualValue: daysSinceTest,
          expectedRange: { min: 0, max: maxDays },
        },
        acknowledged: false,
      });
    }
  }

  return anomalies;
}

// ==========================================================================
// ISSUE ANOMALY DETECTION
// ==========================================================================

/**
 * Check if issue is actively open (not closed/resolved)
 */
function isIssueOpen(status: string): boolean {
  return status === 'open' || status === 'draft' || status === 'in_remediation' || status === 'pending_validation';
}

/**
 * Detect unusual surge in issues
 */
export function detectIssueSurge(
  issues: Issue[],
  historicalCounts: number[],
  config: StatsAnomalyConfig = { sensitivity: 'medium' }
): GrcAnomaly[] {
  const anomalies: GrcAnomaly[] = [];

  if (historicalCounts.length < 5) return anomalies;

  // Current count of open issues
  const currentCount = issues.filter(i => isIssueOpen(i.status)).length;

  const fullHistory = [...historicalCounts, currentCount];

  // Detect if current count is an outlier
  const outliers = detectOutliersEnsemble(fullHistory, config);
  const currentIsOutlier = outliers.find(o => o.index === fullHistory.length - 1);

  if (currentIsOutlier && currentIsOutlier.direction === 'high') {
    anomalies.push({
      id: randomUUID(),
      type: 'issue_surge',
      severity: currentIsOutlier.score > 3 ? 'critical' : 'warning',
      title: 'Issue surge detected',
      description: `Current open issue count (${currentCount}) is significantly higher than historical average (${mean(historicalCounts).toFixed(1)})`,
      detectedAt: new Date(),
      entityType: 'issue',
      entityIds: issues.filter(i => isIssueOpen(i.status)).map(i => i.id),
      anomalyScore: currentIsOutlier.score,
      confidence: currentIsOutlier.confidence ?? 0.8,
      method: 'ensemble_detection',
      context: {
        actualValue: currentCount,
        historicalMean: mean(historicalCounts),
        historicalStd: standardDeviation(historicalCounts),
      },
      acknowledged: false,
    });
  }

  return anomalies;
}

/**
 * Detect issues with unusual velocity (rate of creation or closure)
 */
export function detectIssueVelocityAnomalies(
  dailyCreatedCounts: number[],
  dailyClosedCounts: number[],
  config: StatsAnomalyConfig = { sensitivity: 'medium' }
): GrcAnomaly[] {
  const anomalies: GrcAnomaly[] = [];

  if (dailyCreatedCounts.length < 10) return anomalies;

  // Analyze creation rate
  const creationStats = describeTimeSeries(dailyCreatedCounts);
  if (creationStats.trend.direction === 'up' && creationStats.trend.confidence > 0.7) {
    anomalies.push({
      id: randomUUID(),
      type: 'velocity_anomaly',
      severity: creationStats.trend.slope > 1 ? 'warning' : 'info',
      title: 'Increasing issue creation rate',
      description: `Issues are being created at an accelerating pace (slope: ${creationStats.trend.slope.toFixed(2)})`,
      detectedAt: new Date(),
      entityType: 'issue',
      entityIds: [],
      anomalyScore: creationStats.trend.slope,
      confidence: creationStats.trend.confidence,
      method: 'trend_detection',
      context: { trend: creationStats.trend },
      acknowledged: false,
    });
  }

  // Analyze closure rate slowdown
  if (dailyClosedCounts.length >= 10) {
    const closureStats = describeTimeSeries(dailyClosedCounts);
    if (closureStats.trend.direction === 'down' && closureStats.trend.confidence > 0.7) {
      anomalies.push({
        id: randomUUID(),
        type: 'velocity_anomaly',
        severity: 'warning',
        title: 'Declining issue closure rate',
        description: `Issues are being closed at a slowing pace - potential bottleneck`,
        detectedAt: new Date(),
        entityType: 'issue',
        entityIds: [],
        anomalyScore: Math.abs(closureStats.trend.slope),
        confidence: closureStats.trend.confidence,
        method: 'trend_detection',
        context: { trend: closureStats.trend },
        acknowledged: false,
      });
    }
  }

  // Check if creation exceeds closure (backlog growing)
  if (dailyCreatedCounts.length === dailyClosedCounts.length) {
    const netChange = dailyCreatedCounts.map((c, i) => c - dailyClosedCounts[i]!);
    const recentNet = netChange.slice(-7);
    const avgNetChange = mean(recentNet);

    if (avgNetChange > 2) {
      anomalies.push({
        id: randomUUID(),
        type: 'velocity_anomaly',
        severity: avgNetChange > 5 ? 'critical' : 'warning',
        title: 'Issue backlog growing',
        description: `On average, ${avgNetChange.toFixed(1)} more issues created than closed per day`,
        detectedAt: new Date(),
        entityType: 'issue',
        entityIds: [],
        anomalyScore: avgNetChange,
        confidence: 0.9,
        method: 'velocity_analysis',
        context: {
          actualValue: avgNetChange,
        },
        acknowledged: false,
      });
    }
  }

  return anomalies;
}

// ==========================================================================
// GENERIC METRIC ANOMALY DETECTION
// ==========================================================================

/**
 * Detect anomalies in any time series metric
 */
export function detectMetricAnomalies(
  dataPoints: TimeSeriesDataPoint[],
  metricConfig: GrcMetricConfig,
  detectionConfig: StatsAnomalyConfig = { sensitivity: 'medium' }
): GrcAnomaly[] {
  const anomalies: GrcAnomaly[] = [];

  if (dataPoints.length < 5) return anomalies;

  const values = dataPoints.map(dp => dp.value);

  // Check threshold breaches
  if (metricConfig.thresholds) {
    const latest = dataPoints[dataPoints.length - 1]!;
    const { warning, critical, direction } = metricConfig.thresholds;

    const breachesCritical = direction === 'above'
      ? latest.value > critical
      : latest.value < critical;

    const breachesWarning = direction === 'above'
      ? latest.value > warning
      : latest.value < warning;

    if (breachesCritical || breachesWarning) {
      anomalies.push({
        id: randomUUID(),
        type: 'threshold_breach',
        severity: breachesCritical ? 'critical' : 'warning',
        title: `${metricConfig.name} threshold breach`,
        description: `Current value (${latest.value}) ${direction === 'above' ? 'exceeds' : 'falls below'} ${breachesCritical ? 'critical' : 'warning'} threshold`,
        detectedAt: new Date(),
        entityType: 'metric',
        entityIds: latest.entityId ? [latest.entityId] : [],
        anomalyScore: Math.abs(latest.value - (breachesCritical ? critical : warning)),
        confidence: 1,
        method: 'threshold_check',
        context: {
          actualValue: latest.value,
          expectedRange: {
            min: direction === 'below' ? critical : -Infinity,
            max: direction === 'above' ? critical : Infinity,
          },
        },
        acknowledged: false,
      });
    }
  }

  // Statistical anomaly detection
  const outliers = detectOutliersEnsemble(values, detectionConfig);
  const latestIndex = values.length - 1;
  const latestOutlier = outliers.find(o => o.index === latestIndex);

  if (latestOutlier) {
    anomalies.push({
      id: randomUUID(),
      type: 'unusual_pattern',
      severity: latestOutlier.score > 3.5 ? 'critical' : latestOutlier.score > 2.5 ? 'warning' : 'info',
      title: `Unusual ${metricConfig.name} value`,
      description: `Current value is statistically unusual (${latestOutlier.confidence ? (latestOutlier.confidence * 100).toFixed(0) + '% confidence' : ''})`,
      detectedAt: new Date(),
      entityType: 'metric',
      entityIds: dataPoints[latestIndex]!.entityId ? [dataPoints[latestIndex]!.entityId!] : [],
      anomalyScore: latestOutlier.score,
      confidence: latestOutlier.confidence ?? 0.8,
      method: 'ensemble_detection',
      context: {
        actualValue: values[latestIndex],
        historicalMean: mean(values.slice(0, -1)),
        historicalStd: standardDeviation(values.slice(0, -1)),
      },
      acknowledged: false,
    });
  }

  // Trend detection
  const trend = detectTrend(values);
  if ((trend.direction === 'up' || trend.direction === 'down') && trend.confidence > 0.8) {
    const isAlarming = metricConfig.thresholds
      ? (metricConfig.thresholds.direction === 'above' && trend.direction === 'up') ||
        (metricConfig.thresholds.direction === 'below' && trend.direction === 'down')
      : trend.strength > 0.5;

    if (isAlarming) {
      anomalies.push({
        id: randomUUID(),
        type: 'trend_change',
        severity: trend.strength > 0.7 ? 'warning' : 'info',
        title: `${metricConfig.name} trending ${trend.direction}`,
        description: `Consistent ${trend.direction}ward trend with ${(trend.confidence * 100).toFixed(0)}% confidence`,
        detectedAt: new Date(),
        entityType: 'metric',
        entityIds: [],
        anomalyScore: trend.strength,
        confidence: trend.confidence,
        method: 'trend_detection',
        context: { trend },
        acknowledged: false,
      });
    }
  }

  // Level shift detection
  const levelShifts = detectLevelShifts(values, 5, 2.5);
  if (levelShifts.length > 0) {
    const latestShift = levelShifts[levelShifts.length - 1]!;
    if (latestShift.index >= values.length - 3) {
      anomalies.push({
        id: randomUUID(),
        type: 'trend_change',
        severity: latestShift.score > 3 ? 'warning' : 'info',
        title: `${metricConfig.name} level shift detected`,
        description: `Sudden permanent change in ${metricConfig.name} baseline`,
        detectedAt: new Date(),
        entityType: 'metric',
        entityIds: [],
        anomalyScore: latestShift.score,
        confidence: 0.85,
        method: 'level_shift_detection',
        context: {},
        acknowledged: false,
      });
    }
  }

  return anomalies;
}

// ==========================================================================
// COMPREHENSIVE ANOMALY SCAN
// ==========================================================================

/**
 * Run comprehensive anomaly detection across all GRC data
 */
export function runAnomalyScan(data: {
  risks: Risk[];
  controls: Control[];
  issues: Issue[];
  historicalRiskScores?: Map<string, number[]>;
  historicalControlFailures?: Map<string, number[]>;
  historicalIssueCounts?: number[];
  dailyIssuesCreated?: number[];
  dailyIssuesClosed?: number[];
}, config: StatsAnomalyConfig = { sensitivity: 'medium' }): AnomalyDetectionResult {
  const allAnomalies: GrcAnomaly[] = [];

  // Risk anomalies
  if (data.historicalRiskScores) {
    allAnomalies.push(...detectRiskScoreAnomalies(data.risks, data.historicalRiskScores, config));
  }
  allAnomalies.push(...detectRiskClusters(data.risks));

  // Control anomalies
  if (data.historicalControlFailures) {
    allAnomalies.push(...detectControlFailureAnomalies(data.controls, data.historicalControlFailures, config));
  }
  allAnomalies.push(...detectControlTestGaps(data.controls));

  // Issue anomalies
  if (data.historicalIssueCounts) {
    allAnomalies.push(...detectIssueSurge(data.issues, data.historicalIssueCounts, config));
  }
  if (data.dailyIssuesCreated && data.dailyIssuesClosed) {
    allAnomalies.push(...detectIssueVelocityAnomalies(data.dailyIssuesCreated, data.dailyIssuesClosed, config));
  }

  // Build summary
  const bySeverity = { info: 0, warning: 0, critical: 0 };
  const byType: Record<string, number> = {};

  for (const anomaly of allAnomalies) {
    bySeverity[anomaly.severity]++;
    byType[anomaly.type] = (byType[anomaly.type] || 0) + 1;
  }

  // Sort by severity (critical first) then by score
  allAnomalies.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity];
    }
    return b.anomalyScore - a.anomalyScore;
  });

  return {
    anomalies: allAnomalies,
    summary: {
      totalChecked: data.risks.length + data.controls.length + data.issues.length,
      anomaliesFound: allAnomalies.length,
      bySeverity,
      byType: byType as Record<AnomalyType, number>,
    },
    timestamp: new Date(),
  };
}

// ==========================================================================
// ANOMALY MANAGEMENT
// ==========================================================================

/**
 * Acknowledge an anomaly
 */
export function acknowledgeAnomaly(
  anomaly: GrcAnomaly,
  userId: string
): GrcAnomaly {
  return {
    ...anomaly,
    acknowledged: true,
    acknowledgedBy: userId,
    acknowledgedAt: new Date(),
  };
}

/**
 * Resolve an anomaly with notes
 */
export function resolveAnomaly(
  anomaly: GrcAnomaly,
  resolution: string
): GrcAnomaly {
  return {
    ...anomaly,
    resolution,
    resolvedAt: new Date(),
  };
}

/**
 * Filter anomalies by criteria
 */
export function filterAnomalies(
  anomalies: GrcAnomaly[],
  filters: {
    severity?: AnomalySeverity[];
    types?: AnomalyType[];
    entityType?: ('risk' | 'control' | 'issue' | 'metric')[];
    acknowledged?: boolean;
    resolved?: boolean;
    minScore?: number;
    minConfidence?: number;
  }
): GrcAnomaly[] {
  return anomalies.filter(a => {
    if (filters.severity && !filters.severity.includes(a.severity)) return false;
    if (filters.types && !filters.types.includes(a.type)) return false;
    if (filters.entityType && !filters.entityType.includes(a.entityType)) return false;
    if (filters.acknowledged !== undefined && a.acknowledged !== filters.acknowledged) return false;
    if (filters.resolved !== undefined && (!!a.resolvedAt) !== filters.resolved) return false;
    if (filters.minScore !== undefined && a.anomalyScore < filters.minScore) return false;
    if (filters.minConfidence !== undefined && a.confidence < filters.minConfidence) return false;
    return true;
  });
}
