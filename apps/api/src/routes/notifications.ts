// ==========================================================================
// NOTIFICATION ROUTES
// Notifications and activity feed endpoints
// ==========================================================================

import type { FastifyInstance } from 'fastify';
import { createCollaborationService } from '@veilvault/core';

// Get or create service for organization
const collaborationServices = new Map<string, ReturnType<typeof createCollaborationService>>();

function getService(organizationId: string) {
  if (!collaborationServices.has(organizationId)) {
    collaborationServices.set(organizationId, createCollaborationService({ organizationId }));
  }
  return collaborationServices.get(organizationId)!;
}

export async function notificationRoutes(fastify: FastifyInstance) {
  // Get notifications for user
  fastify.get<{ Querystring: { organizationId: string; userId: string; includeRead?: string } }>(
    '/',
    async (request, reply) => {
      const { organizationId, userId, includeRead } = request.query;

      if (!userId) {
        return reply.status(400).send({
          error: true,
          message: 'userId is required',
        });
      }

      const service = getService(organizationId);
      const notifications = service.getNotificationsForUser(userId, includeRead === 'true');

      return {
        success: true,
        data: notifications,
        unreadCount: service.getUnreadCount(userId),
      };
    }
  );

  // Get unread count
  fastify.get<{ Querystring: { organizationId: string; userId: string } }>(
    '/unread-count',
    async (request, reply) => {
      const { organizationId, userId } = request.query;

      if (!userId) {
        return reply.status(400).send({
          error: true,
          message: 'userId is required',
        });
      }

      const service = getService(organizationId);

      return {
        success: true,
        data: {
          count: service.getUnreadCount(userId),
        },
      };
    }
  );

  // Mark notification as read
  fastify.post<{ Params: { id: string }; Body: { organizationId: string } }>(
    '/:id/read',
    async (request, reply) => {
      const { id } = request.params;
      const { organizationId } = request.body;

      const service = getService(organizationId);
      const notification = service.markNotificationAsRead(id);

      if (!notification) {
        return reply.status(404).send({
          error: true,
          message: 'Notification not found',
        });
      }

      return {
        success: true,
        data: notification,
      };
    }
  );

  // Mark all notifications as read
  fastify.post<{ Body: { organizationId: string; userId: string } }>(
    '/read-all',
    async (request, reply) => {
      const { organizationId, userId } = request.body;

      const service = getService(organizationId);
      const count = service.markAllAsRead(userId);

      return {
        success: true,
        data: {
          markedAsRead: count,
        },
      };
    }
  );

  // Archive notification
  fastify.post<{ Params: { id: string }; Body: { organizationId: string } }>(
    '/:id/archive',
    async (request, reply) => {
      const { id } = request.params;
      const { organizationId } = request.body;

      const service = getService(organizationId);
      const archived = service.archiveNotificationById(id);

      if (!archived) {
        return reply.status(404).send({
          error: true,
          message: 'Notification not found',
        });
      }

      return {
        success: true,
        message: 'Notification archived',
      };
    }
  );

  // Get activity feed
  fastify.get<{ Querystring: { organizationId: string; limit?: string; offset?: string } }>(
    '/activity',
    async (request, reply) => {
      const { organizationId, limit, offset } = request.query;

      const service = getService(organizationId);
      const feed = service.getActivityFeed(
        parseInt(limit ?? '50', 10),
        parseInt(offset ?? '0', 10)
      );

      return {
        success: true,
        data: feed.activities,
        total: feed.total,
        hasMore: feed.hasMore,
      };
    }
  );

  // Get activity for specific target
  fastify.get<{ Querystring: { organizationId: string; targetType: string; targetId: string } }>(
    '/activity/target',
    async (request, reply) => {
      const { organizationId, targetType, targetId } = request.query;

      if (!targetType || !targetId) {
        return reply.status(400).send({
          error: true,
          message: 'targetType and targetId are required',
        });
      }

      const service = getService(organizationId);
      const activities = service.getActivityForTarget(targetType, targetId);

      return {
        success: true,
        data: activities,
      };
    }
  );

  // Get activity by user
  fastify.get<{ Querystring: { organizationId: string; userId: string } }>(
    '/activity/user',
    async (request, reply) => {
      const { organizationId, userId } = request.query;

      if (!userId) {
        return reply.status(400).send({
          error: true,
          message: 'userId is required',
        });
      }

      const service = getService(organizationId);
      const activities = service.getActivityByUser(userId);

      return {
        success: true,
        data: activities,
      };
    }
  );
}
