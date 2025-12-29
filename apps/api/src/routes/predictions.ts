// ==========================================================================
// PREDICTIONS API ROUTES
// Predictive analytics endpoints
// ==========================================================================

import type { FastifyInstance } from 'fastify';
import {
  predictRiskScores,
  predictControlEffectiveness,
  predictIssueVolume,
  predictComplianceScore,
  predictMetric,
  identifyRiskClusters,
  generateEarlyWarnings,
  summarizePredictions,
  type RiskHistory,
  type ControlHistory,
  type IssueCounts,
  type ComplianceHistory,
  type PredictionConfig,
} from '@veilvault/core';

// ==========================================================================
// ROUTES
// ==========================================================================

export async function predictionRoutes(fastify: FastifyInstance) {
  // Predict risk scores
  fastify.post<{
    Body: {
      organizationId: string;
      histories: RiskHistory[];
      config?: Partial<PredictionConfig>;
    };
  }>('/risks', async (request) => {
    const { organizationId, histories, config } = request.body;

    const predictions = predictRiskScores(histories, organizationId, config);

    return {
      success: true,
      data: predictions,
      total: predictions.length,
    };
  });

  // Predict control effectiveness
  fastify.post<{
    Body: {
      organizationId: string;
      histories: ControlHistory[];
      config?: Partial<PredictionConfig>;
    };
  }>('/controls', async (request) => {
    const { organizationId, histories, config } = request.body;

    const predictions = predictControlEffectiveness(histories, organizationId, config);

    return {
      success: true,
      data: predictions,
      total: predictions.length,
    };
  });

  // Predict issue volume
  fastify.post<{
    Body: {
      organizationId: string;
      counts: IssueCounts[];
      config?: Partial<PredictionConfig>;
    };
  }>('/issues', async (request) => {
    const { organizationId, counts, config } = request.body;

    const result = predictIssueVolume(counts, organizationId, config);

    return {
      success: true,
      data: {
        opened: result.openedPrediction,
        backlog: result.backlogPrediction,
        alerts: result.alerts,
      },
    };
  });

  // Predict compliance scores
  fastify.post<{
    Body: {
      organizationId: string;
      history: ComplianceHistory[];
      config?: Partial<PredictionConfig>;
    };
  }>('/compliance', async (request) => {
    const { organizationId, history, config } = request.body;

    const result = predictComplianceScore(history, organizationId, config);

    return {
      success: true,
      data: {
        overall: result.overallPrediction,
        byFramework: result.frameworkPredictions,
        alerts: result.alerts,
      },
    };
  });

  // Predict any metric
  fastify.post<{
    Body: {
      organizationId: string;
      metricName: string;
      values: number[];
      config?: Partial<PredictionConfig>;
    };
  }>('/metric', async (request) => {
    const { organizationId, metricName, values, config } = request.body;

    const prediction = predictMetric(values, metricName, organizationId, config);

    return {
      success: true,
      data: prediction,
    };
  });

  // Get early warnings
  fastify.post<{
    Body: {
      organizationId: string;
      riskHistories: RiskHistory[];
      controlHistories: ControlHistory[];
      complianceHistory?: ComplianceHistory[];
      config?: Partial<PredictionConfig>;
    };
  }>('/early-warnings', async (request) => {
    const { organizationId, riskHistories, controlHistories, complianceHistory, config } = request.body;

    const riskPredictions = predictRiskScores(riskHistories, organizationId, config);
    const controlPredictions = predictControlEffectiveness(controlHistories, organizationId, config);

    let compliancePrediction = null;
    if (complianceHistory && complianceHistory.length > 0) {
      const result = predictComplianceScore(complianceHistory, organizationId, config);
      compliancePrediction = result.overallPrediction;
    }

    const warnings = generateEarlyWarnings(riskPredictions, controlPredictions, compliancePrediction);

    return {
      success: true,
      data: warnings,
      total: warnings.length,
      bySeverity: {
        critical: warnings.filter(w => w.severity === 'critical').length,
        high: warnings.filter(w => w.severity === 'high').length,
        medium: warnings.filter(w => w.severity === 'medium').length,
      },
    };
  });

  // Full prediction summary
  fastify.post<{
    Body: {
      organizationId: string;
      riskHistories: RiskHistory[];
      controlHistories: ControlHistory[];
      complianceHistory?: ComplianceHistory[];
      risks: Array<{ id: string; category: string; residualScore: number }>;
      config?: Partial<PredictionConfig>;
    };
  }>('/summary', async (request) => {
    const { organizationId, riskHistories, controlHistories, complianceHistory, risks, config } = request.body;

    const riskPredictions = predictRiskScores(riskHistories, organizationId, config);
    const controlPredictions = predictControlEffectiveness(controlHistories, organizationId, config);

    let compliancePrediction = null;
    if (complianceHistory && complianceHistory.length > 0) {
      const result = predictComplianceScore(complianceHistory, organizationId, config);
      compliancePrediction = result.overallPrediction;
    }

    const riskClusters = identifyRiskClusters(risks as any, riskHistories);
    const earlyWarnings = generateEarlyWarnings(riskPredictions, controlPredictions, compliancePrediction);

    const summary = summarizePredictions(
      organizationId,
      riskPredictions,
      controlPredictions,
      compliancePrediction,
      riskClusters,
      earlyWarnings
    );

    return {
      success: true,
      data: summary,
    };
  });

  // Dashboard endpoint
  fastify.get<{
    Querystring: { organizationId: string };
  }>('/dashboard', async (request) => {
    const { organizationId } = request.query;

    // In production, this would fetch historical data from the database
    // For now, return structure for frontend integration
    return {
      success: true,
      data: {
        organizationId,
        message: 'Provide historical data via POST endpoints to generate predictions',
        endpoints: {
          risks: 'POST /api/predictions/risks',
          controls: 'POST /api/predictions/controls',
          issues: 'POST /api/predictions/issues',
          compliance: 'POST /api/predictions/compliance',
          metric: 'POST /api/predictions/metric',
          earlyWarnings: 'POST /api/predictions/early-warnings',
          summary: 'POST /api/predictions/summary',
        },
      },
    };
  });
}
