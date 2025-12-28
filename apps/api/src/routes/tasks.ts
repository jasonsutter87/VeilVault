// ==========================================================================
// TASK ROUTES
// Task management endpoints
// ==========================================================================

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createCollaborationService } from '@veilvault/core';

// Validation schemas
const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  type: z.enum([
    'audit_review',
    'control_test',
    'evidence_request',
    'remediation',
    'verification',
    'report_review',
    'general',
  ]),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  assigneeId: z.string().uuid().optional(),
  assigneeName: z.string().optional(),
  targetType: z.string().optional(),
  targetId: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
});

const updateTaskStatusSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'review', 'completed', 'cancelled']),
});

// Create service (in production, this would be per-organization)
const collaborationServices = new Map<string, ReturnType<typeof createCollaborationService>>();

function getService(organizationId: string) {
  if (!collaborationServices.has(organizationId)) {
    collaborationServices.set(organizationId, createCollaborationService({ organizationId }));
  }
  return collaborationServices.get(organizationId)!;
}

export async function taskRoutes(fastify: FastifyInstance) {
  // Create task
  fastify.post<{ Body: { organizationId: string; creatorId: string; creatorName: string } & z.infer<typeof createTaskSchema> }>(
    '/',
    async (request, reply) => {
      const { organizationId, creatorId, creatorName, ...taskData } = request.body;
      const body = createTaskSchema.parse(taskData);

      const service = getService(organizationId);
      const task = service.createNewTask({
        ...body,
        creatorId,
        creatorName,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      });

      return reply.status(201).send({
        success: true,
        data: task,
      });
    }
  );

  // Get task by ID
  fastify.get<{ Params: { id: string }; Querystring: { organizationId: string } }>(
    '/:id',
    async (request, reply) => {
      const { id } = request.params;
      const { organizationId } = request.query;

      const service = getService(organizationId);
      const task = service.getTask(id);

      if (!task) {
        return reply.status(404).send({
          error: true,
          message: 'Task not found',
        });
      }

      return {
        success: true,
        data: task,
      };
    }
  );

  // List tasks for organization/user
  fastify.get<{ Querystring: { organizationId: string; userId?: string; targetType?: string; targetId?: string } }>(
    '/',
    async (request, reply) => {
      const { organizationId, userId, targetType, targetId } = request.query;

      const service = getService(organizationId);

      let tasks;
      if (userId) {
        tasks = service.getTasksForUser(userId);
      } else if (targetType && targetId) {
        tasks = service.getTasksForTarget(targetType, targetId);
      } else {
        // Return summary for organization
        const summary = service.getTaskSummary();
        return {
          success: true,
          data: {
            summary,
            overdue: service.getOverdueTasks(),
          },
        };
      }

      return {
        success: true,
        data: tasks,
      };
    }
  );

  // Update task status
  fastify.patch<{ Params: { id: string }; Body: { organizationId: string; userId: string; userName: string } & z.infer<typeof updateTaskStatusSchema> }>(
    '/:id/status',
    async (request, reply) => {
      const { id } = request.params;
      const { organizationId, userId, userName, status } = request.body;

      const service = getService(organizationId);
      const task = service.updateStatus(id, status, userId, userName);

      if (!task) {
        return reply.status(404).send({
          error: true,
          message: 'Task not found',
        });
      }

      return {
        success: true,
        data: task,
      };
    }
  );

  // Assign task
  fastify.post<{ Params: { id: string }; Body: { organizationId: string; assigneeId: string; assigneeName: string; actorId: string; actorName: string } }>(
    '/:id/assign',
    async (request, reply) => {
      const { id } = request.params;
      const { organizationId, assigneeId, assigneeName, actorId, actorName } = request.body;

      const service = getService(organizationId);
      const task = service.assignTaskTo(id, assigneeId, assigneeName, actorId, actorName);

      if (!task) {
        return reply.status(404).send({
          error: true,
          message: 'Task not found',
        });
      }

      return {
        success: true,
        data: task,
      };
    }
  );

  // Add checklist item
  fastify.post<{ Params: { id: string }; Body: { organizationId: string; text: string } }>(
    '/:id/checklist',
    async (request, reply) => {
      const { id } = request.params;
      const { organizationId, text } = request.body;

      const service = getService(organizationId);
      const task = service.addTaskChecklistItem(id, text);

      if (!task) {
        return reply.status(404).send({
          error: true,
          message: 'Task not found',
        });
      }

      return {
        success: true,
        data: task,
      };
    }
  );

  // Toggle checklist item
  fastify.post<{ Params: { id: string; itemId: string }; Body: { organizationId: string; userId: string } }>(
    '/:id/checklist/:itemId/toggle',
    async (request, reply) => {
      const { id, itemId } = request.params;
      const { organizationId, userId } = request.body;

      const service = getService(organizationId);
      const task = service.toggleTaskChecklistItem(id, itemId, userId);

      if (!task) {
        return reply.status(404).send({
          error: true,
          message: 'Task not found',
        });
      }

      return {
        success: true,
        data: task,
      };
    }
  );

  // Get task summary
  fastify.get<{ Querystring: { organizationId: string } }>(
    '/summary',
    async (request, reply) => {
      const { organizationId } = request.query;

      const service = getService(organizationId);
      const summary = service.getTaskSummary();
      const overdue = service.getOverdueTasks();

      return {
        success: true,
        data: {
          summary,
          overdueCount: overdue.length,
          overdueTasks: overdue.slice(0, 5), // Top 5 overdue
        },
      };
    }
  );
}
