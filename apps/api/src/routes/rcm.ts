// ==========================================================================
// RCM (RISK-CONTROL MATRIX) ROUTES
// Unified view of risks, controls, and their relationships
// ==========================================================================

import type { FastifyInstance } from 'fastify';
import {
  createRCMService,
  type Risk,
  type Control,
  type ControlTest,
} from '@veilvault/core';

// Create RCM service instances per organization
const rcmServices = new Map<string, ReturnType<typeof createRCMService>>();

function getOrCreateRCMService(organizationId: string) {
  let service = rcmServices.get(organizationId);
  if (!service) {
    service = createRCMService({ organizationId });
    rcmServices.set(organizationId, service);
  }
  return service;
}

export async function rcmRoutes(fastify: FastifyInstance) {
  // Initialize RCM with risks and controls
  fastify.post<{
    Params: { organizationId: string };
    Body: { risks: Risk[]; controls: Control[] };
  }>('/:organizationId/initialize', async (request, reply) => {
    const { organizationId } = request.params;
    const { risks, controls } = request.body;

    const service = getOrCreateRCMService(organizationId);

    // Add all risks
    for (const risk of risks) {
      service.addRisk(risk);
    }

    // Add all controls
    for (const control of controls) {
      service.addControl(control);
    }

    return reply.status(201).send({
      success: true,
      data: {
        risksLoaded: risks.length,
        controlsLoaded: controls.length,
      },
    });
  });

  // Get full matrix
  fastify.get<{ Params: { organizationId: string } }>(
    '/:organizationId/matrix',
    async (request, reply) => {
      const { organizationId } = request.params;
      const service = rcmServices.get(organizationId);

      if (!service) {
        return reply.status(404).send({
          error: true,
          message: 'RCM not initialized for this organization',
        });
      }

      const matrix = service.generateMatrix();

      return {
        success: true,
        data: matrix,
      };
    }
  );

  // Get RCM summary
  fastify.get<{ Params: { organizationId: string } }>(
    '/:organizationId/summary',
    async (request, reply) => {
      const { organizationId } = request.params;
      const service = rcmServices.get(organizationId);

      if (!service) {
        return reply.status(404).send({
          error: true,
          message: 'RCM not initialized for this organization',
        });
      }

      const summary = service.getSummary();

      return {
        success: true,
        data: summary,
      };
    }
  );

  // Get all mappings
  fastify.get<{ Params: { organizationId: string } }>(
    '/:organizationId/mappings',
    async (request, reply) => {
      const { organizationId } = request.params;
      const service = rcmServices.get(organizationId);

      if (!service) {
        return reply.status(404).send({
          error: true,
          message: 'RCM not initialized for this organization',
        });
      }

      const mappings = service.getMappings();

      return {
        success: true,
        data: mappings,
        total: mappings.length,
      };
    }
  );

  // Link risk and control
  fastify.post<{
    Params: { organizationId: string };
    Body: { riskId: string; controlId: string };
  }>('/:organizationId/link', async (request, reply) => {
    const { organizationId } = request.params;
    const { riskId, controlId } = request.body;

    const service = rcmServices.get(organizationId);
    if (!service) {
      return reply.status(404).send({
        error: true,
        message: 'RCM not initialized for this organization',
      });
    }

    const result = service.linkRiskAndControl(riskId, controlId);
    if (!result) {
      return reply.status(404).send({
        error: true,
        message: 'Risk or control not found',
      });
    }

    return {
      success: true,
      data: result,
    };
  });

  // Get controls for a risk
  fastify.get<{ Params: { organizationId: string; riskId: string } }>(
    '/:organizationId/risks/:riskId/controls',
    async (request, reply) => {
      const { organizationId, riskId } = request.params;
      const service = rcmServices.get(organizationId);

      if (!service) {
        return reply.status(404).send({
          error: true,
          message: 'RCM not initialized for this organization',
        });
      }

      const controls = service.getControlsForRisk(riskId);

      return {
        success: true,
        data: controls,
        total: controls.length,
      };
    }
  );

  // Get risks for a control
  fastify.get<{ Params: { organizationId: string; controlId: string } }>(
    '/:organizationId/controls/:controlId/risks',
    async (request, reply) => {
      const { organizationId, controlId } = request.params;
      const service = rcmServices.get(organizationId);

      if (!service) {
        return reply.status(404).send({
          error: true,
          message: 'RCM not initialized for this organization',
        });
      }

      const risks = service.getRisksForControl(controlId);

      return {
        success: true,
        data: risks,
        total: risks.length,
      };
    }
  );

  // Identify coverage gaps
  fastify.get<{ Params: { organizationId: string } }>(
    '/:organizationId/gaps',
    async (request, reply) => {
      const { organizationId } = request.params;
      const service = rcmServices.get(organizationId);

      if (!service) {
        return reply.status(404).send({
          error: true,
          message: 'RCM not initialized for this organization',
        });
      }

      const gaps = service.identifyGaps();

      return {
        success: true,
        data: gaps,
        total: gaps.length,
      };
    }
  );

  // Add control test and update effectiveness
  fastify.post<{
    Params: { organizationId: string };
    Body: ControlTest;
  }>('/:organizationId/control-tests', async (request, reply) => {
    const { organizationId } = request.params;
    const test = request.body;

    const service = rcmServices.get(organizationId);
    if (!service) {
      return reply.status(404).send({
        error: true,
        message: 'RCM not initialized for this organization',
      });
    }

    service.addControlTest(test);

    return reply.status(201).send({
      success: true,
      data: {
        testId: test.id,
        controlId: test.controlId,
        result: test.result,
      },
    });
  });

  // Recalculate residual risk for a specific risk
  fastify.post<{ Params: { organizationId: string; riskId: string } }>(
    '/:organizationId/risks/:riskId/recalculate',
    async (request, reply) => {
      const { organizationId, riskId } = request.params;
      const service = rcmServices.get(organizationId);

      if (!service) {
        return reply.status(404).send({
          error: true,
          message: 'RCM not initialized for this organization',
        });
      }

      const updatedRisk = service.recalculateResidualRisk(riskId);
      if (!updatedRisk) {
        return reply.status(404).send({
          error: true,
          message: 'Risk not found',
        });
      }

      return {
        success: true,
        data: updatedRisk,
      };
    }
  );

  // Get latest test for a control
  fastify.get<{ Params: { organizationId: string; controlId: string } }>(
    '/:organizationId/controls/:controlId/latest-test',
    async (request, reply) => {
      const { organizationId, controlId } = request.params;
      const service = rcmServices.get(organizationId);

      if (!service) {
        return reply.status(404).send({
          error: true,
          message: 'RCM not initialized for this organization',
        });
      }

      const latestTest = service.getLatestControlTest(controlId);

      if (!latestTest) {
        return reply.status(404).send({
          error: true,
          message: 'No tests found for this control',
        });
      }

      return {
        success: true,
        data: latestTest,
      };
    }
  );

  // Get all test history for a control
  fastify.get<{ Params: { organizationId: string; controlId: string } }>(
    '/:organizationId/controls/:controlId/tests',
    async (request, reply) => {
      const { organizationId, controlId } = request.params;
      const service = rcmServices.get(organizationId);

      if (!service) {
        return reply.status(404).send({
          error: true,
          message: 'RCM not initialized for this organization',
        });
      }

      const tests = service.getControlTests(controlId);

      return {
        success: true,
        data: tests,
        total: tests.length,
      };
    }
  );

  // Add individual risk
  fastify.post<{
    Params: { organizationId: string };
    Body: Risk;
  }>('/:organizationId/risks', async (request, reply) => {
    const { organizationId } = request.params;
    const risk = request.body;

    const service = getOrCreateRCMService(organizationId);
    service.addRisk(risk);

    return reply.status(201).send({
      success: true,
      data: risk,
    });
  });

  // Add individual control
  fastify.post<{
    Params: { organizationId: string };
    Body: Control;
  }>('/:organizationId/controls', async (request, reply) => {
    const { organizationId } = request.params;
    const control = request.body;

    const service = getOrCreateRCMService(organizationId);
    service.addControl(control);

    return reply.status(201).send({
      success: true,
      data: control,
    });
  });

  // Get a specific risk from RCM
  fastify.get<{ Params: { organizationId: string; riskId: string } }>(
    '/:organizationId/risks/:riskId',
    async (request, reply) => {
      const { organizationId, riskId } = request.params;
      const service = rcmServices.get(organizationId);

      if (!service) {
        return reply.status(404).send({
          error: true,
          message: 'RCM not initialized for this organization',
        });
      }

      const risk = service.getRisk(riskId);
      if (!risk) {
        return reply.status(404).send({
          error: true,
          message: 'Risk not found',
        });
      }

      return {
        success: true,
        data: risk,
      };
    }
  );

  // Get a specific control from RCM
  fastify.get<{ Params: { organizationId: string; controlId: string } }>(
    '/:organizationId/controls/:controlId',
    async (request, reply) => {
      const { organizationId, controlId } = request.params;
      const service = rcmServices.get(organizationId);

      if (!service) {
        return reply.status(404).send({
          error: true,
          message: 'RCM not initialized for this organization',
        });
      }

      const control = service.getControl(controlId);
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
    }
  );
}
