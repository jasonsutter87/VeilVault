// ==========================================================================
// SOX 404 COMPLIANCE ROUTES
// Sarbanes-Oxley compliance management endpoints
// ==========================================================================

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  createSoxDeficiency,
  createManagementAssessment,
  evaluateDeficiencyType,
  requiresDisclosure,
  addControlToScope,
  addAccountToScope,
  updateTestingResults,
  addDeficiencyToAssessment,
  concludeAssessment,
  createSoxCertification,
  signCertification,
  calculateSoxSummary,
  type SoxDeficiency,
  type ManagementAssessment,
  type SoxCertification,
  type FinancialStatementArea,
  type Control,
} from '@veilvault/core';

// In-memory stores (replace with database in production)
const deficiencies = new Map<string, SoxDeficiency>();
const assessments = new Map<string, ManagementAssessment>();
const certifications = new Map<string, SoxCertification>();

// For testing purposes - would come from controls service
const mockControls: Control[] = [];

// Validation schemas
const createDeficiencySchema = z.object({
  organizationId: z.string().uuid(),
  issueId: z.string().uuid(),
  affectedAssertions: z.array(z.enum([
    'existence',
    'completeness',
    'valuation',
    'rights_obligations',
    'presentation_disclosure',
  ])),
  affectedAccounts: z.array(z.enum([
    'revenue',
    'accounts_receivable',
    'inventory',
    'fixed_assets',
    'accounts_payable',
    'payroll',
    'treasury',
    'financial_close',
    'income_taxes',
    'equity',
    'other',
  ])),
  affectedControls: z.array(z.string()),
  likelihood: z.enum(['remote', 'reasonably_possible', 'probable']),
  magnitude: z.enum(['inconsequential', 'more_than_inconsequential', 'material']),
  aggregationRisk: z.boolean().optional(),
  compensatingControls: z.array(z.string()).optional(),
  remediationTargetDate: z.string().transform(s => new Date(s)).optional(),
  createdBy: z.string(),
});

const createAssessmentSchema = z.object({
  organizationId: z.string().uuid(),
  fiscalYear: z.number().int().min(2000).max(2100),
  periodEnd: z.string().transform(s => new Date(s)),
  preparedBy: z.string(),
  preparedByName: z.string(),
});

const concludeAssessmentSchema = z.object({
  conclusion: z.enum(['effective', 'ineffective']),
  notes: z.string(),
  approvedBy: z.string(),
  approvedByName: z.string(),
});

const createCertificationSchema = z.object({
  type: z.enum(['sox_302', 'sox_404', 'sub_certification']),
  certifierId: z.string(),
  certifierName: z.string(),
  certifierTitle: z.string(),
  companyName: z.string(),
});

export async function soxRoutes(fastify: FastifyInstance) {
  // ==========================================================================
  // DEFICIENCY ENDPOINTS
  // ==========================================================================

  // Create deficiency
  fastify.post('/deficiencies', async (request, reply) => {
    const body = createDeficiencySchema.parse(request.body);

    // Auto-classify based on likelihood and magnitude
    const deficiencyType = evaluateDeficiencyType(body.likelihood, body.magnitude);

    const deficiency = createSoxDeficiency({
      ...body,
      deficiencyType,
    });

    deficiencies.set(deficiency.id, deficiency);

    return reply.status(201).send({
      success: true,
      data: {
        ...deficiency,
        requiresDisclosure: requiresDisclosure(deficiency),
      },
    });
  });

  // Get deficiency by ID
  fastify.get<{ Params: { id: string } }>('/deficiencies/:id', async (request, reply) => {
    const { id } = request.params;
    const deficiency = deficiencies.get(id);

    if (!deficiency) {
      return reply.status(404).send({
        error: true,
        message: 'Deficiency not found',
      });
    }

    return {
      success: true,
      data: {
        ...deficiency,
        requiresDisclosure: requiresDisclosure(deficiency),
      },
    };
  });

  // List deficiencies
  fastify.get<{
    Querystring: {
      organizationId?: string;
      deficiencyType?: string;
      status?: string;
      fiscalYear?: string;
    };
  }>('/deficiencies', async (request) => {
    const { organizationId, deficiencyType, status } = request.query;
    let list = Array.from(deficiencies.values());

    if (organizationId) {
      list = list.filter(d => d.organizationId === organizationId);
    }
    if (deficiencyType) {
      list = list.filter(d => d.deficiencyType === deficiencyType);
    }
    if (status) {
      list = list.filter(d => d.status === status);
    }

    return {
      success: true,
      data: list.map(d => ({
        ...d,
        requiresDisclosure: requiresDisclosure(d),
      })),
      total: list.length,
    };
  });

  // Update deficiency status
  fastify.patch<{ Params: { id: string }; Body: { status: string } }>(
    '/deficiencies/:id/status',
    async (request, reply) => {
      const { id } = request.params;
      const { status } = request.body as { status: SoxDeficiency['status'] };

      const deficiency = deficiencies.get(id);
      if (!deficiency) {
        return reply.status(404).send({
          error: true,
          message: 'Deficiency not found',
        });
      }

      const updated: SoxDeficiency = {
        ...deficiency,
        status,
        remediatedDate: status === 'remediated' ? new Date() : deficiency.remediatedDate,
        updatedAt: new Date(),
      };

      deficiencies.set(id, updated);

      return {
        success: true,
        data: updated,
      };
    }
  );

  // Evaluate deficiency classification
  fastify.post<{
    Body: {
      likelihood: 'remote' | 'reasonably_possible' | 'probable';
      magnitude: 'inconsequential' | 'more_than_inconsequential' | 'material';
    };
  }>('/deficiencies/evaluate-type', async (request) => {
    const { likelihood, magnitude } = request.body;

    const deficiencyType = evaluateDeficiencyType(likelihood, magnitude);

    return {
      success: true,
      data: {
        likelihood,
        magnitude,
        deficiencyType,
        requiresDisclosure: deficiencyType !== 'control_deficiency',
      },
    };
  });

  // ==========================================================================
  // MANAGEMENT ASSESSMENT ENDPOINTS
  // ==========================================================================

  // Create assessment
  fastify.post('/assessments', async (request, reply) => {
    const body = createAssessmentSchema.parse(request.body);

    const assessment = createManagementAssessment(body);
    assessments.set(assessment.id, assessment);

    return reply.status(201).send({
      success: true,
      data: assessment,
    });
  });

  // Get assessment by ID
  fastify.get<{ Params: { id: string } }>('/assessments/:id', async (request, reply) => {
    const { id } = request.params;
    const assessment = assessments.get(id);

    if (!assessment) {
      return reply.status(404).send({
        error: true,
        message: 'Assessment not found',
      });
    }

    return {
      success: true,
      data: assessment,
    };
  });

  // List assessments
  fastify.get<{
    Querystring: { organizationId?: string; fiscalYear?: string; status?: string };
  }>('/assessments', async (request) => {
    const { organizationId, fiscalYear, status } = request.query;
    let list = Array.from(assessments.values());

    if (organizationId) {
      list = list.filter(a => a.organizationId === organizationId);
    }
    if (fiscalYear) {
      list = list.filter(a => a.fiscalYear === parseInt(fiscalYear, 10));
    }
    if (status) {
      list = list.filter(a => a.status === status);
    }

    return {
      success: true,
      data: list,
      total: list.length,
    };
  });

  // Add control to scope
  fastify.post<{ Params: { id: string }; Body: { controlId: string } }>(
    '/assessments/:id/controls',
    async (request, reply) => {
      const { id } = request.params;
      const { controlId } = request.body;

      const assessment = assessments.get(id);
      if (!assessment) {
        return reply.status(404).send({
          error: true,
          message: 'Assessment not found',
        });
      }

      const updated = addControlToScope(assessment, controlId);
      assessments.set(id, updated);

      return {
        success: true,
        data: updated,
      };
    }
  );

  // Add account to scope
  fastify.post<{ Params: { id: string }; Body: { account: FinancialStatementArea } }>(
    '/assessments/:id/accounts',
    async (request, reply) => {
      const { id } = request.params;
      const { account } = request.body;

      const assessment = assessments.get(id);
      if (!assessment) {
        return reply.status(404).send({
          error: true,
          message: 'Assessment not found',
        });
      }

      const updated = addAccountToScope(assessment, account);
      assessments.set(id, updated);

      return {
        success: true,
        data: updated,
      };
    }
  );

  // Update testing results
  fastify.patch<{
    Params: { id: string };
    Body: { controlsTested: number; controlsEffective: number; controlsIneffective: number };
  }>('/assessments/:id/testing-results', async (request, reply) => {
    const { id } = request.params;
    const results = request.body as {
      controlsTested: number;
      controlsEffective: number;
      controlsIneffective: number;
    };

    const assessment = assessments.get(id);
    if (!assessment) {
      return reply.status(404).send({
        error: true,
        message: 'Assessment not found',
      });
    }

    const updated = updateTestingResults(assessment, results);
    assessments.set(id, updated);

    return {
      success: true,
      data: updated,
    };
  });

  // Add deficiency to assessment
  fastify.post<{ Params: { id: string }; Body: { deficiencyId: string } }>(
    '/assessments/:id/deficiencies',
    async (request, reply) => {
      const { id } = request.params;
      const { deficiencyId } = request.body;

      const assessment = assessments.get(id);
      if (!assessment) {
        return reply.status(404).send({
          error: true,
          message: 'Assessment not found',
        });
      }

      const deficiency = deficiencies.get(deficiencyId);
      if (!deficiency) {
        return reply.status(404).send({
          error: true,
          message: 'Deficiency not found',
        });
      }

      const updated = addDeficiencyToAssessment(assessment, deficiency);
      assessments.set(id, updated);

      return {
        success: true,
        data: updated,
      };
    }
  );

  // Conclude assessment
  fastify.post<{ Params: { id: string } }>(
    '/assessments/:id/conclude',
    async (request, reply) => {
      const { id } = request.params;
      const body = concludeAssessmentSchema.parse(request.body);

      const assessment = assessments.get(id);
      if (!assessment) {
        return reply.status(404).send({
          error: true,
          message: 'Assessment not found',
        });
      }

      // Cannot conclude as effective if there are material weaknesses
      if (body.conclusion === 'effective' && assessment.materialWeaknesses > 0) {
        return reply.status(400).send({
          error: true,
          message: 'Cannot conclude as effective with material weaknesses present',
        });
      }

      const updated = concludeAssessment(
        assessment,
        body.conclusion,
        body.notes,
        body.approvedBy,
        body.approvedByName
      );
      assessments.set(id, updated);

      return {
        success: true,
        data: updated,
      };
    }
  );

  // ==========================================================================
  // CERTIFICATION ENDPOINTS
  // ==========================================================================

  // Create certification from assessment
  fastify.post<{ Params: { assessmentId: string } }>(
    '/assessments/:assessmentId/certifications',
    async (request, reply) => {
      const { assessmentId } = request.params;
      const body = createCertificationSchema.parse(request.body);

      const assessment = assessments.get(assessmentId);
      if (!assessment) {
        return reply.status(404).send({
          error: true,
          message: 'Assessment not found',
        });
      }

      if (assessment.status !== 'approved') {
        return reply.status(400).send({
          error: true,
          message: 'Assessment must be approved before creating certification',
        });
      }

      const certification = createSoxCertification(
        assessment,
        body.type,
        body.certifierId,
        body.certifierName,
        body.certifierTitle,
        body.companyName
      );

      certifications.set(certification.id, certification);

      return reply.status(201).send({
        success: true,
        data: certification,
      });
    }
  );

  // Get certification by ID
  fastify.get<{ Params: { id: string } }>('/certifications/:id', async (request, reply) => {
    const { id } = request.params;
    const certification = certifications.get(id);

    if (!certification) {
      return reply.status(404).send({
        error: true,
        message: 'Certification not found',
      });
    }

    return {
      success: true,
      data: certification,
    };
  });

  // List certifications
  fastify.get<{
    Querystring: { organizationId?: string; fiscalYear?: string; type?: string; status?: string };
  }>('/certifications', async (request) => {
    const { organizationId, fiscalYear, type, status } = request.query;
    let list = Array.from(certifications.values());

    if (organizationId) {
      list = list.filter(c => c.organizationId === organizationId);
    }
    if (fiscalYear) {
      list = list.filter(c => c.fiscalYear === parseInt(fiscalYear, 10));
    }
    if (type) {
      list = list.filter(c => c.type === type);
    }
    if (status) {
      list = list.filter(c => c.status === status);
    }

    return {
      success: true,
      data: list,
      total: list.length,
    };
  });

  // Sign certification
  fastify.post<{ Params: { id: string } }>(
    '/certifications/:id/sign',
    async (request, reply) => {
      const { id } = request.params;

      const certification = certifications.get(id);
      if (!certification) {
        return reply.status(404).send({
          error: true,
          message: 'Certification not found',
        });
      }

      if (certification.status !== 'pending') {
        return reply.status(400).send({
          error: true,
          message: 'Certification has already been signed',
        });
      }

      const updated = signCertification(certification);
      certifications.set(id, updated);

      return {
        success: true,
        data: updated,
      };
    }
  );

  // ==========================================================================
  // SOX SUMMARY & DASHBOARD
  // ==========================================================================

  // Get SOX summary
  fastify.get<{ Querystring: { organizationId: string; fiscalYear?: string } }>(
    '/summary',
    async (request, reply) => {
      const { organizationId, fiscalYear } = request.query;

      const year = fiscalYear ? parseInt(fiscalYear, 10) : new Date().getFullYear();

      const orgDeficiencies = Array.from(deficiencies.values()).filter(
        d => d.organizationId === organizationId
      );

      const orgAssessment = Array.from(assessments.values()).find(
        a => a.organizationId === organizationId && a.fiscalYear === year
      );

      const orgCertification = orgAssessment
        ? Array.from(certifications.values()).find(c => c.assessmentId === orgAssessment.id)
        : undefined;

      const summary = calculateSoxSummary(
        mockControls.filter(c => c.organizationId === organizationId),
        orgDeficiencies,
        orgAssessment,
        orgCertification
      );

      return {
        success: true,
        data: summary,
      };
    }
  );

  // Get SOX timeline / status
  fastify.get<{ Querystring: { organizationId: string; fiscalYear?: string } }>(
    '/timeline',
    async (request) => {
      const { organizationId, fiscalYear } = request.query;
      const year = fiscalYear ? parseInt(fiscalYear, 10) : new Date().getFullYear();

      const assessment = Array.from(assessments.values()).find(
        a => a.organizationId === organizationId && a.fiscalYear === year
      );

      const certification = assessment
        ? Array.from(certifications.values()).find(c => c.assessmentId === assessment.id)
        : undefined;

      const openDeficiencies = Array.from(deficiencies.values()).filter(
        d => d.organizationId === organizationId && d.status !== 'remediated'
      );

      return {
        success: true,
        data: {
          fiscalYear: year,
          phases: [
            {
              name: 'Planning & Scoping',
              status: assessment ? 'completed' : 'pending',
              completedDate: assessment?.createdAt,
            },
            {
              name: 'Control Testing',
              status: assessment?.totalControlsTested ? 'in_progress' : 'pending',
              progress: assessment
                ? Math.round((assessment.totalControlsTested / Math.max(assessment.scopedControls.length, 1)) * 100)
                : 0,
            },
            {
              name: 'Deficiency Evaluation',
              status: openDeficiencies.length > 0 ? 'in_progress' : 'pending',
              openDeficiencies: openDeficiencies.length,
            },
            {
              name: 'Management Assessment',
              status: assessment?.status ?? 'pending',
              conclusion: assessment?.conclusion,
            },
            {
              name: 'Certification',
              status: certification?.status ?? 'pending',
              signedDate: certification?.signedAt,
            },
          ],
        },
      };
    }
  );
}
