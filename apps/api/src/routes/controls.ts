// ==========================================================================
// CONTROL ROUTES
// Internal controls management and testing endpoints
// ==========================================================================

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  createControl,
  activateControl,
  linkRiskToControl,
  unlinkRiskFromControl,
  updateControlEffectiveness,
  scheduleControlTest,
  createControlTest,
  selectSamples,
  recordTestResult,
  addTestEvidence,
  reviewTest,
  calculateControlSummary,
  getRecommendedSampleSize,
  type Control,
  type ControlTest,
  type ControlException,
} from '@veilvault/core';

// In-memory stores (replace with database in production)
const controls = new Map<string, Control>();
const controlTests = new Map<string, ControlTest>();

// Validation schemas
const createControlSchema = z.object({
  organizationId: z.string().uuid(),
  controlId: z.string().min(1), // User-defined ID like "FIN-001"
  name: z.string().min(1).max(200),
  description: z.string().min(1),
  objective: z.string().min(1),
  type: z.enum(['preventive', 'detective', 'corrective', 'directive']),
  nature: z.enum(['manual', 'automated', 'hybrid']),
  frequency: z.enum(['continuous', 'daily', 'weekly', 'monthly', 'quarterly', 'annually', 'ad_hoc']),
  ownerId: z.string(),
  ownerName: z.string(),
  testingProcedure: z.string(),
  isSoxRelevant: z.boolean().optional(),
  soxAssertion: z
    .array(z.enum(['existence', 'completeness', 'valuation', 'rights_obligations', 'presentation_disclosure']))
    .optional(),
  financialStatementArea: z.string().optional(),
  evidenceRequired: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

const createTestSchema = z.object({
  controlId: z.string().uuid(),
  organizationId: z.string().uuid(),
  testType: z.enum(['design', 'operating']),
  testPeriodStart: z.string().transform((s) => new Date(s)),
  testPeriodEnd: z.string().transform((s) => new Date(s)),
  testerId: z.string(),
  testerName: z.string(),
  populationSize: z.number().int().positive(),
  sampleSize: z.number().int().positive(),
});

const recordResultSchema = z.object({
  result: z.enum(['pass', 'fail', 'pass_with_exceptions', 'not_applicable']),
  exceptions: z
    .array(
      z.object({
        id: z.string(),
        sampleRef: z.string(),
        description: z.string(),
        severity: z.enum(['low', 'medium', 'high']),
        rootCause: z.string().optional(),
        issueId: z.string().optional(),
      })
    )
    .optional(),
});

export async function controlRoutes(fastify: FastifyInstance) {
  // Create control
  fastify.post('/', async (request, reply) => {
    const body = createControlSchema.parse(request.body);

    const control = createControl(body);
    controls.set(control.id, control);

    return reply.status(201).send({
      success: true,
      data: control,
    });
  });

  // Get control by ID
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;
    const control = controls.get(id);

    if (!control) {
      return reply.status(404).send({
        error: true,
        message: 'Control not found',
      });
    }

    return {
      success: true,
      data: control,
    };
  });

  // List all controls
  fastify.get<{
    Querystring: {
      organizationId?: string;
      type?: string;
      nature?: string;
      status?: string;
      soxRelevant?: string;
    };
  }>('/', async (request) => {
    const { organizationId, type, nature, status, soxRelevant } = request.query;
    let controlList = Array.from(controls.values());

    if (organizationId) {
      controlList = controlList.filter((c) => c.organizationId === organizationId);
    }
    if (type) {
      controlList = controlList.filter((c) => c.type === type);
    }
    if (nature) {
      controlList = controlList.filter((c) => c.nature === nature);
    }
    if (status) {
      controlList = controlList.filter((c) => c.status === status);
    }
    if (soxRelevant !== undefined) {
      controlList = controlList.filter((c) => c.isSoxRelevant === (soxRelevant === 'true'));
    }

    return {
      success: true,
      data: controlList,
      total: controlList.length,
    };
  });

  // Activate control
  fastify.post<{ Params: { id: string } }>('/:id/activate', async (request, reply) => {
    const { id } = request.params;

    const control = controls.get(id);
    if (!control) {
      return reply.status(404).send({
        error: true,
        message: 'Control not found',
      });
    }

    const activated = activateControl(control);
    controls.set(id, activated);

    return {
      success: true,
      data: activated,
    };
  });

  // Link risk to control
  fastify.post<{ Params: { id: string }; Body: { riskId: string } }>(
    '/:id/risks',
    async (request, reply) => {
      const { id } = request.params;
      const { riskId } = request.body as { riskId: string };

      const control = controls.get(id);
      if (!control) {
        return reply.status(404).send({
          error: true,
          message: 'Control not found',
        });
      }

      const updated = linkRiskToControl(control, riskId);
      controls.set(id, updated);

      return {
        success: true,
        data: updated,
      };
    }
  );

  // Unlink risk from control
  fastify.delete<{ Params: { id: string; riskId: string } }>(
    '/:id/risks/:riskId',
    async (request, reply) => {
      const { id, riskId } = request.params;

      const control = controls.get(id);
      if (!control) {
        return reply.status(404).send({
          error: true,
          message: 'Control not found',
        });
      }

      const updated = unlinkRiskFromControl(control, riskId);
      controls.set(id, updated);

      return {
        success: true,
        data: updated,
      };
    }
  );

  // Update control effectiveness
  fastify.patch<{
    Params: { id: string };
    Body: { effectiveness: string };
  }>('/:id/effectiveness', async (request, reply) => {
    const { id } = request.params;
    const { effectiveness } = request.body as { effectiveness: string };

    const control = controls.get(id);
    if (!control) {
      return reply.status(404).send({
        error: true,
        message: 'Control not found',
      });
    }

    const validEffectiveness = ['effective', 'partially_effective', 'ineffective', 'not_tested'];
    if (!validEffectiveness.includes(effectiveness)) {
      return reply.status(400).send({
        error: true,
        message: 'Invalid effectiveness value',
      });
    }

    const updated = updateControlEffectiveness(
      control,
      effectiveness as Control['currentEffectiveness']
    );
    controls.set(id, updated);

    return {
      success: true,
      data: updated,
    };
  });

  // Schedule next test
  fastify.post<{ Params: { id: string }; Body: { nextTestDate: string } }>(
    '/:id/schedule-test',
    async (request, reply) => {
      const { id } = request.params;
      const { nextTestDate } = request.body as { nextTestDate: string };

      const control = controls.get(id);
      if (!control) {
        return reply.status(404).send({
          error: true,
          message: 'Control not found',
        });
      }

      const updated = scheduleControlTest(control, new Date(nextTestDate));
      controls.set(id, updated);

      return {
        success: true,
        data: updated,
      };
    }
  );

  // Get recommended sample size
  fastify.get<{ Params: { id: string }; Querystring: { populationSize: string } }>(
    '/:id/sample-size',
    async (request, reply) => {
      const { id } = request.params;
      const { populationSize } = request.query;

      const control = controls.get(id);
      if (!control) {
        return reply.status(404).send({
          error: true,
          message: 'Control not found',
        });
      }

      const recommended = getRecommendedSampleSize(control.frequency, parseInt(populationSize, 10));

      return {
        success: true,
        data: {
          frequency: control.frequency,
          populationSize: parseInt(populationSize, 10),
          recommendedSampleSize: recommended,
        },
      };
    }
  );

  // Get control summary
  fastify.get<{ Querystring: { organizationId?: string } }>('/summary', async (request) => {
    const { organizationId } = request.query;
    let controlList = Array.from(controls.values());

    if (organizationId) {
      controlList = controlList.filter((c) => c.organizationId === organizationId);
    }

    const summary = calculateControlSummary(controlList);

    return {
      success: true,
      data: summary,
    };
  });

  // ==========================================================================
  // CONTROL TEST ROUTES
  // ==========================================================================

  // Create control test
  fastify.post('/tests', async (request, reply) => {
    const body = createTestSchema.parse(request.body);

    const test = createControlTest(body);
    controlTests.set(test.id, test);

    return reply.status(201).send({
      success: true,
      data: test,
    });
  });

  // Get control test by ID
  fastify.get<{ Params: { testId: string } }>('/tests/:testId', async (request, reply) => {
    const { testId } = request.params;
    const test = controlTests.get(testId);

    if (!test) {
      return reply.status(404).send({
        error: true,
        message: 'Control test not found',
      });
    }

    return {
      success: true,
      data: test,
    };
  });

  // List tests for a control
  fastify.get<{ Params: { id: string } }>('/:id/tests', async (request, reply) => {
    const { id } = request.params;

    const control = controls.get(id);
    if (!control) {
      return reply.status(404).send({
        error: true,
        message: 'Control not found',
      });
    }

    const tests = Array.from(controlTests.values()).filter((t) => t.controlId === id);

    return {
      success: true,
      data: tests,
      total: tests.length,
    };
  });

  // Select samples for test
  fastify.post<{ Params: { testId: string }; Body: { sampleIds: string[] } }>(
    '/tests/:testId/samples',
    async (request, reply) => {
      const { testId } = request.params;
      const { sampleIds } = request.body as { sampleIds: string[] };

      const test = controlTests.get(testId);
      if (!test) {
        return reply.status(404).send({
          error: true,
          message: 'Control test not found',
        });
      }

      const updated = selectSamples(test, sampleIds);
      controlTests.set(testId, updated);

      return {
        success: true,
        data: updated,
      };
    }
  );

  // Record test result
  fastify.post<{ Params: { testId: string } }>(
    '/tests/:testId/result',
    async (request, reply) => {
      const { testId } = request.params;
      const body = recordResultSchema.parse(request.body);

      const test = controlTests.get(testId);
      if (!test) {
        return reply.status(404).send({
          error: true,
          message: 'Control test not found',
        });
      }

      const updated = recordTestResult(
        test,
        body.result,
        (body.exceptions ?? []) as ControlException[]
      );
      controlTests.set(testId, updated);

      // Update control effectiveness based on result
      const control = controls.get(test.controlId);
      if (control) {
        let effectiveness = control.currentEffectiveness;
        if (body.result === 'pass') {
          effectiveness = 'effective';
        } else if (body.result === 'fail') {
          effectiveness = 'ineffective';
        } else if (body.result === 'pass_with_exceptions') {
          effectiveness = 'partially_effective';
        }

        const updatedControl = updateControlEffectiveness(control, effectiveness);
        controls.set(control.id, updatedControl);
      }

      return {
        success: true,
        data: updated,
      };
    }
  );

  // Add test evidence
  fastify.post<{ Params: { testId: string } }>(
    '/tests/:testId/evidence',
    async (request, reply) => {
      const { testId } = request.params;
      const evidence = request.body as {
        type: 'screenshot' | 'document' | 'export' | 'log' | 'other';
        name: string;
        description?: string;
        url: string;
        uploadedAt: string;
        uploadedBy: string;
      };

      const test = controlTests.get(testId);
      if (!test) {
        return reply.status(404).send({
          error: true,
          message: 'Control test not found',
        });
      }

      const updated = addTestEvidence(test, {
        ...evidence,
        uploadedAt: new Date(evidence.uploadedAt),
      });
      controlTests.set(testId, updated);

      return {
        success: true,
        data: updated,
      };
    }
  );

  // Review test
  fastify.post<{
    Params: { testId: string };
    Body: { reviewerId: string; reviewerName: string; notes?: string };
  }>('/tests/:testId/review', async (request, reply) => {
    const { testId } = request.params;
    const { reviewerId, reviewerName, notes } = request.body as {
      reviewerId: string;
      reviewerName: string;
      notes?: string;
    };

    const test = controlTests.get(testId);
    if (!test) {
      return reply.status(404).send({
        error: true,
        message: 'Control test not found',
      });
    }

    const updated = reviewTest(test, reviewerId, reviewerName, notes);
    controlTests.set(testId, updated);

    return {
      success: true,
      data: updated,
    };
  });
}
