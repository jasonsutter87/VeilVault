// ==========================================================================
// COMMENT ROUTES
// Comment and discussion endpoints
// ==========================================================================

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createCollaborationService } from '@veilvault/core';

// Validation schemas
const createCommentSchema = z.object({
  targetType: z.enum(['ledger', 'transaction', 'audit', 'verification', 'task', 'report']),
  targetId: z.string(),
  parentId: z.string().optional(),
  content: z.string().min(1).max(5000),
});

// Get or create service for organization
const collaborationServices = new Map<string, ReturnType<typeof createCollaborationService>>();

function getService(organizationId: string) {
  if (!collaborationServices.has(organizationId)) {
    collaborationServices.set(organizationId, createCollaborationService({ organizationId }));
  }
  return collaborationServices.get(organizationId)!;
}

export async function commentRoutes(fastify: FastifyInstance) {
  // Create comment
  fastify.post<{ Body: { organizationId: string; authorId: string; authorName: string } & z.infer<typeof createCommentSchema> }>(
    '/',
    async (request, reply) => {
      const { organizationId, authorId, authorName, ...commentData } = request.body;
      const body = createCommentSchema.parse(commentData);

      const service = getService(organizationId);
      const comment = service.addComment({
        ...body,
        authorId,
        authorName,
      });

      return reply.status(201).send({
        success: true,
        data: comment,
      });
    }
  );

  // Get comments for a target
  fastify.get<{ Querystring: { organizationId: string; targetType: string; targetId: string } }>(
    '/',
    async (request, reply) => {
      const { organizationId, targetType, targetId } = request.query;

      if (!targetType || !targetId) {
        return reply.status(400).send({
          error: true,
          message: 'targetType and targetId are required',
        });
      }

      const service = getService(organizationId);
      const comments = service.getCommentsForTarget(targetType, targetId);

      return {
        success: true,
        data: comments,
        total: comments.length,
      };
    }
  );

  // Get comment by ID
  fastify.get<{ Params: { id: string }; Querystring: { organizationId: string } }>(
    '/:id',
    async (request, reply) => {
      const { id } = request.params;
      const { organizationId } = request.query;

      const service = getService(organizationId);
      const comment = service.getComment(id);

      if (!comment) {
        return reply.status(404).send({
          error: true,
          message: 'Comment not found',
        });
      }

      return {
        success: true,
        data: comment,
      };
    }
  );

  // Get comment thread
  fastify.get<{ Params: { id: string }; Querystring: { organizationId: string } }>(
    '/:id/thread',
    async (request, reply) => {
      const { id } = request.params;
      const { organizationId } = request.query;

      const service = getService(organizationId);
      const thread = service.getCommentThread(id);

      if (!thread) {
        return reply.status(404).send({
          error: true,
          message: 'Comment not found',
        });
      }

      return {
        success: true,
        data: thread,
      };
    }
  );

  // Edit comment
  fastify.patch<{ Params: { id: string }; Body: { organizationId: string; content: string } }>(
    '/:id',
    async (request, reply) => {
      const { id } = request.params;
      const { organizationId, content } = request.body;

      const service = getService(organizationId);
      const comment = service.editComment(id, content);

      if (!comment) {
        return reply.status(404).send({
          error: true,
          message: 'Comment not found',
        });
      }

      return {
        success: true,
        data: comment,
      };
    }
  );

  // Resolve comment
  fastify.post<{ Params: { id: string }; Body: { organizationId: string } }>(
    '/:id/resolve',
    async (request, reply) => {
      const { id } = request.params;
      const { organizationId } = request.body;

      const service = getService(organizationId);
      const comment = service.resolveCommentById(id);

      if (!comment) {
        return reply.status(404).send({
          error: true,
          message: 'Comment not found',
        });
      }

      return {
        success: true,
        data: comment,
      };
    }
  );

  // Add reaction
  fastify.post<{ Params: { id: string }; Body: { organizationId: string; userId: string; emoji: string } }>(
    '/:id/reactions',
    async (request, reply) => {
      const { id } = request.params;
      const { organizationId, userId, emoji } = request.body;

      const service = getService(organizationId);
      const comment = service.addCommentReaction(id, userId, emoji);

      if (!comment) {
        return reply.status(404).send({
          error: true,
          message: 'Comment not found',
        });
      }

      return {
        success: true,
        data: comment,
      };
    }
  );

  // Delete comment (soft delete)
  fastify.delete<{ Params: { id: string }; Querystring: { organizationId: string } }>(
    '/:id',
    async (request, reply) => {
      const { id } = request.params;
      const { organizationId } = request.query;

      const service = getService(organizationId);
      const deleted = service.deleteComment(id);

      if (!deleted) {
        return reply.status(404).send({
          error: true,
          message: 'Comment not found',
        });
      }

      return {
        success: true,
        message: 'Comment deleted',
      };
    }
  );
}
