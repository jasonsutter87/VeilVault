// ==========================================================================
// RISK ROUTES
// Risk assessment and management endpoints
// ==========================================================================

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  createRisk,
  assessRisk,
  linkControlToRisk,
  unlinkControlFromRisk,
  addKeyRiskIndicator,
  updateKRIValue,
  acceptRisk,
  closeRisk,
  generateRiskHeatMap,
  calculateRiskSummary,
  getRiskLevel,
  type Risk,
} from '@veilvault/core';

// In-memory store (replace with database in production)
const risks = new Map<string, Risk>();

// Validation schemas
const createRiskSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().min(1),
  category: z.enum([
    'strategic',
    'operational',
    'financial',
    'compliance',
    'technology',
    'reputational',
    'third_party',
    'fraud',
    'cyber',
  ]),
  inherentLikelihood: z.number().int().min(1).max(5) as z.ZodType<1 | 2 | 3 | 4 | 5>,
  inherentImpact: z.number().int().min(1).max(5) as z.ZodType<1 | 2 | 3 | 4 | 5>,
  ownerId: z.string(),
  ownerName: z.string(),
  targetScore: z.number().optional(),
  riskAppetite: z.enum(['low', 'medium', 'high']).optional(),
  tags: z.array(z.string()).optional(),
});

const assessRiskSchema = z.object({
  residualLikelihood: z.number().int().min(1).max(5) as z.ZodType<1 | 2 | 3 | 4 | 5>,
  residualImpact: z.number().int().min(1).max(5) as z.ZodType<1 | 2 | 3 | 4 | 5>,
  reviewerId: z.string(),
  reviewerName: z.string(),
});

const addKRISchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  metric: z.string(),
  currentValue: z.number(),
  threshold: z.number(),
  thresholdType: z.enum(['above', 'below', 'range']),
  rangeMin: z.number().optional(),
  rangeMax: z.number().optional(),
});

export async function riskRoutes(fastify: FastifyInstance) {
  // Create risk
  fastify.post('/', async (request, reply) => {
    const body = createRiskSchema.parse(request.body);

    const risk = createRisk(body);
    risks.set(risk.id, risk);

    return reply.status(201).send({
      success: true,
      data: risk,
    });
  });

  // Get risk by ID
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;
    const risk = risks.get(id);

    if (!risk) {
      return reply.status(404).send({
        error: true,
        message: 'Risk not found',
      });
    }

    return {
      success: true,
      data: {
        ...risk,
        level: getRiskLevel(risk.residualScore),
      },
    };
  });

  // List all risks for an organization
  fastify.get<{ Querystring: { organizationId?: string; category?: string; status?: string } }>(
    '/',
    async (request) => {
      const { organizationId, category, status } = request.query;
      let riskList = Array.from(risks.values());

      if (organizationId) {
        riskList = riskList.filter((r) => r.organizationId === organizationId);
      }
      if (category) {
        riskList = riskList.filter((r) => r.category === category);
      }
      if (status) {
        riskList = riskList.filter((r) => r.status === status);
      }

      return {
        success: true,
        data: riskList.map((r) => ({
          ...r,
          level: getRiskLevel(r.residualScore),
        })),
        total: riskList.length,
      };
    }
  );

  // Assess risk (update residual scores)
  fastify.post<{ Params: { id: string } }>('/:id/assess', async (request, reply) => {
    const { id } = request.params;
    const body = assessRiskSchema.parse(request.body);

    const risk = risks.get(id);
    if (!risk) {
      return reply.status(404).send({
        error: true,
        message: 'Risk not found',
      });
    }

    const assessed = assessRisk(risk, body);
    risks.set(id, assessed);

    return {
      success: true,
      data: assessed,
    };
  });

  // Link control to risk
  fastify.post<{ Params: { id: string }; Body: { controlId: string } }>(
    '/:id/controls',
    async (request, reply) => {
      const { id } = request.params;
      const { controlId } = request.body as { controlId: string };

      const risk = risks.get(id);
      if (!risk) {
        return reply.status(404).send({
          error: true,
          message: 'Risk not found',
        });
      }

      const updated = linkControlToRisk(risk, controlId);
      risks.set(id, updated);

      return {
        success: true,
        data: updated,
      };
    }
  );

  // Unlink control from risk
  fastify.delete<{ Params: { id: string; controlId: string } }>(
    '/:id/controls/:controlId',
    async (request, reply) => {
      const { id, controlId } = request.params;

      const risk = risks.get(id);
      if (!risk) {
        return reply.status(404).send({
          error: true,
          message: 'Risk not found',
        });
      }

      const updated = unlinkControlFromRisk(risk, controlId);
      risks.set(id, updated);

      return {
        success: true,
        data: updated,
      };
    }
  );

  // Add Key Risk Indicator
  fastify.post<{ Params: { id: string } }>('/:id/kris', async (request, reply) => {
    const { id } = request.params;
    const body = addKRISchema.parse(request.body);

    const risk = risks.get(id);
    if (!risk) {
      return reply.status(404).send({
        error: true,
        message: 'Risk not found',
      });
    }

    const updated = addKeyRiskIndicator(risk, body);
    risks.set(id, updated);

    return {
      success: true,
      data: updated,
    };
  });

  // Update KRI value
  fastify.patch<{ Params: { id: string; kriId: string }; Body: { value: number } }>(
    '/:id/kris/:kriId',
    async (request, reply) => {
      const { id, kriId } = request.params;
      const { value } = request.body as { value: number };

      const risk = risks.get(id);
      if (!risk) {
        return reply.status(404).send({
          error: true,
          message: 'Risk not found',
        });
      }

      const updated = updateKRIValue(risk, kriId, value);
      risks.set(id, updated);

      return {
        success: true,
        data: updated,
      };
    }
  );

  // Accept risk
  fastify.post<{ Params: { id: string }; Body: { userId: string; userName: string } }>(
    '/:id/accept',
    async (request, reply) => {
      const { id } = request.params;
      const { userId, userName } = request.body as { userId: string; userName: string };

      const risk = risks.get(id);
      if (!risk) {
        return reply.status(404).send({
          error: true,
          message: 'Risk not found',
        });
      }

      const updated = acceptRisk(risk, userId, userName);
      risks.set(id, updated);

      return {
        success: true,
        data: updated,
      };
    }
  );

  // Close risk
  fastify.post<{ Params: { id: string } }>('/:id/close', async (request, reply) => {
    const { id } = request.params;

    const risk = risks.get(id);
    if (!risk) {
      return reply.status(404).send({
        error: true,
        message: 'Risk not found',
      });
    }

    const updated = closeRisk(risk);
    risks.set(id, updated);

    return {
      success: true,
      data: updated,
    };
  });

  // Generate risk heat map
  fastify.get<{ Querystring: { organizationId?: string } }>('/heat-map', async (request) => {
    const { organizationId } = request.query;
    let riskList = Array.from(risks.values());

    if (organizationId) {
      riskList = riskList.filter((r) => r.organizationId === organizationId);
    }

    const heatMap = generateRiskHeatMap(riskList);

    return {
      success: true,
      data: heatMap,
    };
  });

  // Get risk summary
  fastify.get<{ Querystring: { organizationId?: string } }>('/summary', async (request) => {
    const { organizationId } = request.query;
    let riskList = Array.from(risks.values());

    if (organizationId) {
      riskList = riskList.filter((r) => r.organizationId === organizationId);
    }

    const summary = calculateRiskSummary(riskList);

    return {
      success: true,
      data: summary,
    };
  });
}
