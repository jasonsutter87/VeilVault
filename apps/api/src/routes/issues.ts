// ==========================================================================
// ISSUE ROUTES
// Issue tracking and remediation management endpoints
// ==========================================================================

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  createIssue,
  openIssue,
  createRemediationPlan,
  updateRemediationStep,
  requestValidation,
  validateIssue,
  closeIssue,
  deferIssue,
  acceptIssueRisk,
  extendTargetDate,
  escalateIssue,
  addIssueComment,
  calculateIssueSummary,
  type Issue,
} from '@veilvault/core';

// In-memory store (replace with database in production)
const issues = new Map<string, Issue>();

// Validation schemas
const createIssueSchema = z.object({
  organizationId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  type: z.enum([
    'control_deficiency',
    'control_gap',
    'process_issue',
    'compliance_finding',
    'audit_finding',
    'exception',
    'observation',
    'management_letter_point',
  ]),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  source: z.enum(['internal_audit', 'external_audit', 'control_testing', 'management_review', 'regulatory_exam', 'self_identified', 'continuous_monitoring']),
  identifiedBy: z.string(),
  identifiedByName: z.string(),
  ownerId: z.string(),
  ownerName: z.string(),
  targetDate: z.string().transform((s) => new Date(s)).optional(),
  controlId: z.string().optional(),
  riskId: z.string().optional(),
  controlTestId: z.string().optional(),
  rootCause: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const remediationStepSchema = z.object({
  order: z.number().int().positive(),
  description: z.string().min(1),
  assigneeId: z.string(),
  assigneeName: z.string(),
  dueDate: z.string().transform((s) => new Date(s)),
});

const remediationPlanSchema = z.object({
  description: z.string().min(1),
  steps: z.array(remediationStepSchema),
  estimatedCost: z.number().optional(),
  estimatedEffort: z.string().optional(),
  userId: z.string(),
  userName: z.string(),
});

const updateStepSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'blocked']).optional(),
  notes: z.string().optional(),
  userId: z.string(),
  userName: z.string(),
});

const deferSchema = z.object({
  userId: z.string(),
  userName: z.string(),
  reason: z.string().min(1),
  deferUntil: z.string().transform((s) => new Date(s)),
});

const extendSchema = z.object({
  userId: z.string(),
  userName: z.string(),
  reason: z.string().min(1),
  newTargetDate: z.string().transform((s) => new Date(s)),
});

const escalateSchema = z.object({
  escalatedById: z.string(),
  escalatedByName: z.string(),
  newOwnerId: z.string(),
  newOwnerName: z.string(),
  reason: z.string().min(1),
});

const commentSchema = z.object({
  authorId: z.string(),
  authorName: z.string(),
  content: z.string().min(1),
  isInternal: z.boolean().optional(),
});

export async function issueRoutes(fastify: FastifyInstance) {
  // Create issue
  fastify.post('/', async (request, reply) => {
    const body = createIssueSchema.parse(request.body);

    const issue = createIssue(body);
    issues.set(issue.id, issue);

    return reply.status(201).send({
      success: true,
      data: issue,
    });
  });

  // Get issue by ID
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;
    const issue = issues.get(id);

    if (!issue) {
      return reply.status(404).send({
        error: true,
        message: 'Issue not found',
      });
    }

    return {
      success: true,
      data: issue,
    };
  });

  // List all issues
  fastify.get<{
    Querystring: {
      organizationId?: string;
      status?: string;
      severity?: string;
      type?: string;
      ownerId?: string;
    };
  }>('/', async (request) => {
    const { organizationId, status, severity, type, ownerId } = request.query;
    let issueList = Array.from(issues.values());

    if (organizationId) {
      issueList = issueList.filter((i) => i.organizationId === organizationId);
    }
    if (status) {
      issueList = issueList.filter((i) => i.status === status);
    }
    if (severity) {
      issueList = issueList.filter((i) => i.severity === severity);
    }
    if (type) {
      issueList = issueList.filter((i) => i.type === type);
    }
    if (ownerId) {
      issueList = issueList.filter((i) => i.ownerId === ownerId);
    }

    return {
      success: true,
      data: issueList,
      total: issueList.length,
    };
  });

  // Open issue (move from draft to open)
  fastify.post<{ Params: { id: string }; Body: { userId: string; userName: string } }>(
    '/:id/open',
    async (request, reply) => {
      const { id } = request.params;
      const { userId, userName } = request.body as { userId: string; userName: string };

      const issue = issues.get(id);
      if (!issue) {
        return reply.status(404).send({
          error: true,
          message: 'Issue not found',
        });
      }

      const opened = openIssue(issue, userId, userName);
      issues.set(id, opened);

      return {
        success: true,
        data: opened,
      };
    }
  );

  // Create remediation plan
  fastify.post<{ Params: { id: string } }>(
    '/:id/remediation-plan',
    async (request, reply) => {
      const { id } = request.params;
      const body = remediationPlanSchema.parse(request.body);

      const issue = issues.get(id);
      if (!issue) {
        return reply.status(404).send({
          error: true,
          message: 'Issue not found',
        });
      }

      const { userId, userName, steps, ...planData } = body;

      // Add required id and status to each step
      const stepsWithIds = steps.map((step) => ({
        ...step,
        id: crypto.randomUUID(),
        status: 'pending' as const,
      }));

      const updated = createRemediationPlan(
        issue,
        { ...planData, steps: stepsWithIds },
        userId,
        userName
      );
      issues.set(id, updated);

      return {
        success: true,
        data: updated,
      };
    }
  );

  // Update remediation step
  fastify.patch<{ Params: { id: string; stepId: string } }>(
    '/:id/remediation-steps/:stepId',
    async (request, reply) => {
      const { id, stepId } = request.params;
      const body = updateStepSchema.parse(request.body);

      const issue = issues.get(id);
      if (!issue) {
        return reply.status(404).send({
          error: true,
          message: 'Issue not found',
        });
      }

      const { userId, userName, ...updates } = body;
      const updated = updateRemediationStep(issue, stepId, updates, userId, userName);
      issues.set(id, updated);

      return {
        success: true,
        data: updated,
      };
    }
  );

  // Request validation
  fastify.post<{ Params: { id: string }; Body: { userId: string; userName: string } }>(
    '/:id/request-validation',
    async (request, reply) => {
      const { id } = request.params;
      const { userId, userName } = request.body as { userId: string; userName: string };

      const issue = issues.get(id);
      if (!issue) {
        return reply.status(404).send({
          error: true,
          message: 'Issue not found',
        });
      }

      const updated = requestValidation(issue, userId, userName);
      issues.set(id, updated);

      return {
        success: true,
        data: updated,
      };
    }
  );

  // Validate issue
  fastify.post<{
    Params: { id: string };
    Body: { validatorId: string; validatorName: string; notes?: string };
  }>('/:id/validate', async (request, reply) => {
    const { id } = request.params;
    const { validatorId, validatorName, notes } = request.body as {
      validatorId: string;
      validatorName: string;
      notes?: string;
    };

    const issue = issues.get(id);
    if (!issue) {
      return reply.status(404).send({
        error: true,
        message: 'Issue not found',
      });
    }

    const updated = validateIssue(issue, validatorId, validatorName, notes);
    issues.set(id, updated);

    return {
      success: true,
      data: updated,
    };
  });

  // Close issue
  fastify.post<{
    Params: { id: string };
    Body: { userId: string; userName: string };
  }>('/:id/close', async (request, reply) => {
    const { id } = request.params;
    const { userId, userName } = request.body as { userId: string; userName: string };

    const issue = issues.get(id);
    if (!issue) {
      return reply.status(404).send({
        error: true,
        message: 'Issue not found',
      });
    }

    const updated = closeIssue(issue, userId, userName);
    issues.set(id, updated);

    return {
      success: true,
      data: updated,
    };
  });

  // Defer issue
  fastify.post<{ Params: { id: string } }>('/:id/defer', async (request, reply) => {
    const { id } = request.params;
    const body = deferSchema.parse(request.body);

    const issue = issues.get(id);
    if (!issue) {
      return reply.status(404).send({
        error: true,
        message: 'Issue not found',
      });
    }

    const updated = deferIssue(issue, body.deferUntil, body.reason, body.userId, body.userName);
    issues.set(id, updated);

    return {
      success: true,
      data: updated,
    };
  });

  // Accept risk (for issues that cannot be remediated)
  fastify.post<{
    Params: { id: string };
    Body: { userId: string; userName: string; justification: string };
  }>('/:id/accept-risk', async (request, reply) => {
    const { id } = request.params;
    const { userId, userName, justification } = request.body as {
      userId: string;
      userName: string;
      justification: string;
    };

    const issue = issues.get(id);
    if (!issue) {
      return reply.status(404).send({
        error: true,
        message: 'Issue not found',
      });
    }

    const updated = acceptIssueRisk(issue, justification, userId, userName);
    issues.set(id, updated);

    return {
      success: true,
      data: updated,
    };
  });

  // Extend target date
  fastify.post<{ Params: { id: string } }>('/:id/extend', async (request, reply) => {
    const { id } = request.params;
    const body = extendSchema.parse(request.body);

    const issue = issues.get(id);
    if (!issue) {
      return reply.status(404).send({
        error: true,
        message: 'Issue not found',
      });
    }

    const updated = extendTargetDate(issue, body.newTargetDate, body.reason, body.userId, body.userName);
    issues.set(id, updated);

    return {
      success: true,
      data: updated,
    };
  });

  // Escalate issue
  fastify.post<{ Params: { id: string } }>('/:id/escalate', async (request, reply) => {
    const { id } = request.params;
    const body = escalateSchema.parse(request.body);

    const issue = issues.get(id);
    if (!issue) {
      return reply.status(404).send({
        error: true,
        message: 'Issue not found',
      });
    }

    const updated = escalateIssue(issue, body);
    issues.set(id, updated);

    return {
      success: true,
      data: updated,
    };
  });

  // Add comment
  fastify.post<{ Params: { id: string } }>('/:id/comments', async (request, reply) => {
    const { id } = request.params;
    const body = commentSchema.parse(request.body);

    const issue = issues.get(id);
    if (!issue) {
      return reply.status(404).send({
        error: true,
        message: 'Issue not found',
      });
    }

    const updated = addIssueComment(issue, body.content, body.authorId, body.authorName, body.isInternal ?? false);
    issues.set(id, updated);

    return {
      success: true,
      data: updated,
    };
  });

  // Get issue summary
  fastify.get<{ Querystring: { organizationId?: string } }>('/summary', async (request) => {
    const { organizationId } = request.query;
    let issueList = Array.from(issues.values());

    if (organizationId) {
      issueList = issueList.filter((i) => i.organizationId === organizationId);
    }

    const summary = calculateIssueSummary(issueList);

    return {
      success: true,
      data: summary,
    };
  });

  // Get overdue issues
  fastify.get<{ Querystring: { organizationId?: string } }>('/overdue', async (request) => {
    const { organizationId } = request.query;
    const now = new Date();
    let issueList = Array.from(issues.values());

    if (organizationId) {
      issueList = issueList.filter((i) => i.organizationId === organizationId);
    }

    const overdue = issueList.filter(
      (i) =>
        i.targetDate &&
        i.targetDate < now &&
        !['closed', 'validated', 'accepted', 'deferred'].includes(i.status)
    );

    return {
      success: true,
      data: overdue,
      total: overdue.length,
    };
  });

  // Get issues by control
  fastify.get<{ Params: { controlId: string } }>(
    '/by-control/:controlId',
    async (request) => {
      const { controlId } = request.params;

      const related = Array.from(issues.values()).filter(
        (i) => i.controlId === controlId
      );

      return {
        success: true,
        data: related,
        total: related.length,
      };
    }
  );

  // Get issues by risk
  fastify.get<{ Params: { riskId: string } }>('/by-risk/:riskId', async (request) => {
    const { riskId } = request.params;

    const related = Array.from(issues.values()).filter(
      (i) => i.riskId === riskId
    );

    return {
      success: true,
      data: related,
      total: related.length,
    };
  });
}
