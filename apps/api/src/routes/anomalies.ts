// ==========================================================================
// ANOMALY DETECTION ROUTES
// AI-powered (statistical) anomaly detection for GRC data
// ==========================================================================

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  runAnomalyScan,
  detectRiskScoreAnomalies,
  detectRiskClusters,
  detectControlFailureAnomalies,
  detectControlTestGaps,
  detectIssueSurge,
  detectIssueVelocityAnomalies,
  detectMetricAnomalies,
  acknowledgeAnomaly,
  resolveAnomaly,
  filterAnomalies,
  stats,
} from '@veilvault/core';
import type {
  GrcAnomaly,
  AnomalyDetectionConfig,
  TimeSeriesDataPoint,
  GrcMetricConfig,
} from '@veilvault/core';

// In-memory stores (replace with database in production)
const detectedAnomalies = new Map<string, GrcAnomaly>();
const scanHistory: { timestamp: Date; summary: unknown }[] = [];

// Validation schemas
const sensitivitySchema = z.enum(['low', 'medium', 'high']);

const detectionConfigSchema = z.object({
  sensitivity: sensitivitySchema.optional(),
  methods: z.array(z.enum(['zscore', 'iqr', 'grubbs', 'mad', 'isolation', 'dbscan'])).optional(),
  minConfidence: z.number().min(0).max(1).optional(),
});

const metricDataPointSchema = z.object({
  timestamp: z.string().transform(s => new Date(s)),
  value: z.number(),
  entityId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const metricConfigSchema = z.object({
  name: z.string(),
  thresholds: z.object({
    warning: z.number(),
    critical: z.number(),
    direction: z.enum(['above', 'below']),
  }).optional(),
  expectedRange: z.object({
    min: z.number(),
    max: z.number(),
  }).optional(),
  sensitivity: sensitivitySchema.optional(),
});

export async function anomalyRoutes(fastify: FastifyInstance) {
  // ==========================================================================
  // SCAN ENDPOINTS
  // ==========================================================================

  // Run comprehensive anomaly scan
  fastify.post<{
    Body: {
      organizationId: string;
      config?: z.infer<typeof detectionConfigSchema>;
    };
  }>('/scan', async (request, reply) => {
    const { organizationId, config } = request.body;

    // In real implementation, fetch actual data from database
    // For now, return structure showing how it would work
    const result = {
      organizationId,
      config: config || { sensitivity: 'medium' },
      message: 'Scan endpoint ready - connect to data sources',
      scanId: crypto.randomUUID(),
      timestamp: new Date(),
    };

    scanHistory.push({ timestamp: new Date(), summary: result });

    return reply.status(200).send({
      success: true,
      data: result,
    });
  });

  // Get scan history
  fastify.get('/scan/history', async () => {
    return {
      success: true,
      data: scanHistory.slice(-20), // Last 20 scans
    };
  });

  // ==========================================================================
  // SPECIFIC ANOMALY DETECTIONS
  // ==========================================================================

  // Analyze metrics for anomalies
  fastify.post<{
    Body: {
      dataPoints: z.infer<typeof metricDataPointSchema>[];
      config: z.infer<typeof metricConfigSchema>;
      detectionConfig?: z.infer<typeof detectionConfigSchema>;
    };
  }>('/analyze/metrics', async (request, reply) => {
    const body = request.body;

    const dataPoints: TimeSeriesDataPoint[] = body.dataPoints.map(dp => ({
      timestamp: new Date(dp.timestamp),
      value: dp.value,
      entityId: dp.entityId,
      metadata: dp.metadata,
    }));

    const metricConfig: GrcMetricConfig = {
      name: body.config.name,
      thresholds: body.config.thresholds,
      expectedRange: body.config.expectedRange,
      sensitivity: body.config.sensitivity,
    };

    const detectionConfig: AnomalyDetectionConfig = {
      sensitivity: body.detectionConfig?.sensitivity || 'medium',
      methods: body.detectionConfig?.methods,
      minConfidence: body.detectionConfig?.minConfidence,
    };

    const anomalies = detectMetricAnomalies(dataPoints, metricConfig, detectionConfig);

    // Store detected anomalies
    for (const anomaly of anomalies) {
      detectedAnomalies.set(anomaly.id, anomaly);
    }

    return {
      success: true,
      data: {
        anomalies,
        statistics: stats.describeTimeSeries(dataPoints.map(dp => dp.value)),
        summary: stats.summarizeAnomalies(dataPoints.map(dp => dp.value), detectionConfig),
      },
    };
  });

  // Analyze raw values for outliers
  fastify.post<{
    Body: {
      values: number[];
      config?: z.infer<typeof detectionConfigSchema>;
    };
  }>('/analyze/values', async (request) => {
    const { values, config } = request.body;

    const detectionConfig: AnomalyDetectionConfig = {
      sensitivity: config?.sensitivity || 'medium',
      methods: config?.methods,
      minConfidence: config?.minConfidence,
    };

    const outliers = stats.detectOutliersEnsemble(values, detectionConfig);
    const summary = stats.summarizeAnomalies(values, detectionConfig);
    const descriptive = stats.describe(values);

    return {
      success: true,
      data: {
        outliers,
        summary,
        statistics: descriptive,
      },
    };
  });

  // Analyze time series for patterns
  fastify.post<{
    Body: {
      values: number[];
      window?: number;
    };
  }>('/analyze/timeseries', async (request) => {
    const { values, window = 10 } = request.body;

    const trend = stats.detectTrend(values);
    const tsStats = stats.describeTimeSeries(values);
    const anomalies = stats.detectTimeSeriesAnomalies(values, window);
    const spikes = stats.detectSpikes(values, window);
    const levelShifts = stats.detectLevelShifts(values, window);

    return {
      success: true,
      data: {
        trend,
        statistics: tsStats,
        anomalies: {
          rolling: anomalies,
          spikes,
          levelShifts,
        },
        smoothed: {
          sma: stats.sma(values, window),
          ema: stats.ema(values, window),
        },
      },
    };
  });

  // ==========================================================================
  // ANOMALY MANAGEMENT
  // ==========================================================================

  // Get all detected anomalies
  fastify.get<{
    Querystring: {
      severity?: string;
      type?: string;
      entityType?: string;
      acknowledged?: string;
      resolved?: string;
    };
  }>('/', async (request) => {
    const { severity, type, entityType, acknowledged, resolved } = request.query;

    let anomalies = Array.from(detectedAnomalies.values());

    // Apply filters
    anomalies = filterAnomalies(anomalies, {
      severity: severity ? [severity as 'info' | 'warning' | 'critical'] : undefined,
      types: type ? [type as never] : undefined,
      entityType: entityType ? [entityType as 'risk' | 'control' | 'issue' | 'metric'] : undefined,
      acknowledged: acknowledged !== undefined ? acknowledged === 'true' : undefined,
      resolved: resolved !== undefined ? resolved === 'true' : undefined,
    });

    return {
      success: true,
      data: anomalies,
      total: anomalies.length,
    };
  });

  // Get anomaly by ID
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;
    const anomaly = detectedAnomalies.get(id);

    if (!anomaly) {
      return reply.status(404).send({
        error: true,
        message: 'Anomaly not found',
      });
    }

    return {
      success: true,
      data: anomaly,
    };
  });

  // Acknowledge anomaly
  fastify.post<{
    Params: { id: string };
    Body: { userId: string };
  }>('/:id/acknowledge', async (request, reply) => {
    const { id } = request.params;
    const { userId } = request.body;

    const anomaly = detectedAnomalies.get(id);
    if (!anomaly) {
      return reply.status(404).send({
        error: true,
        message: 'Anomaly not found',
      });
    }

    const updated = acknowledgeAnomaly(anomaly, userId);
    detectedAnomalies.set(id, updated);

    return {
      success: true,
      data: updated,
    };
  });

  // Resolve anomaly
  fastify.post<{
    Params: { id: string };
    Body: { resolution: string };
  }>('/:id/resolve', async (request, reply) => {
    const { id } = request.params;
    const { resolution } = request.body;

    const anomaly = detectedAnomalies.get(id);
    if (!anomaly) {
      return reply.status(404).send({
        error: true,
        message: 'Anomaly not found',
      });
    }

    const updated = resolveAnomaly(anomaly, resolution);
    detectedAnomalies.set(id, updated);

    return {
      success: true,
      data: updated,
    };
  });

  // Delete anomaly
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;

    if (!detectedAnomalies.has(id)) {
      return reply.status(404).send({
        error: true,
        message: 'Anomaly not found',
      });
    }

    detectedAnomalies.delete(id);

    return {
      success: true,
      message: 'Anomaly deleted',
    };
  });

  // ==========================================================================
  // STATISTICS ENDPOINTS (Direct access to stats library)
  // ==========================================================================

  // Descriptive statistics
  fastify.post<{ Body: { values: number[] } }>('/stats/describe', async (request) => {
    const { values } = request.body;

    return {
      success: true,
      data: stats.describe(values),
    };
  });

  // Linear regression
  fastify.post<{ Body: { x: number[]; y: number[] } }>('/stats/regression', async (request) => {
    const { x, y } = request.body;

    return {
      success: true,
      data: stats.linearRegression(x, y),
    };
  });

  // Correlation
  fastify.post<{ Body: { x: number[]; y: number[] } }>('/stats/correlation', async (request) => {
    const { x, y } = request.body;

    return {
      success: true,
      data: {
        correlation: stats.correlation(x, y),
        covariance: stats.covariance(x, y),
      },
    };
  });

  // Forecast
  fastify.post<{
    Body: { values: number[]; periods: number; method?: 'ses' | 'linear' };
  }>('/stats/forecast', async (request) => {
    const { values, periods, method = 'ses' } = request.body;

    const forecast = method === 'linear'
      ? stats.forecastLinear(values, periods)
      : stats.forecastSES(values, periods);

    return {
      success: true,
      data: forecast,
    };
  });

  // ==========================================================================
  // DASHBOARD SUMMARY
  // ==========================================================================

  // Get anomaly dashboard summary
  fastify.get('/dashboard', async () => {
    const anomalies = Array.from(detectedAnomalies.values());

    const unacknowledged = anomalies.filter(a => !a.acknowledged);
    const unresolved = anomalies.filter(a => !a.resolvedAt);
    const critical = anomalies.filter(a => a.severity === 'critical' && !a.resolvedAt);

    // Group by entity type
    const byEntityType: Record<string, number> = {};
    for (const a of unresolved) {
      byEntityType[a.entityType] = (byEntityType[a.entityType] || 0) + 1;
    }

    // Group by type
    const byType: Record<string, number> = {};
    for (const a of unresolved) {
      byType[a.type] = (byType[a.type] || 0) + 1;
    }

    // Recent anomalies (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentAnomalies = anomalies.filter(a => a.detectedAt > sevenDaysAgo);

    return {
      success: true,
      data: {
        total: anomalies.length,
        unacknowledged: unacknowledged.length,
        unresolved: unresolved.length,
        critical: critical.length,
        byEntityType,
        byType,
        recentCount: recentAnomalies.length,
        latestAnomalies: anomalies
          .sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime())
          .slice(0, 10),
      },
    };
  });
}
