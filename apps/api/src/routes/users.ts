// ==========================================================================
// USER ROUTES
// User management and RBAC endpoints
// ==========================================================================

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  createUser,
  activateUser,
  hasPermission,
  getUserPermissions,
  ROLE_PERMISSIONS,
  type UserRole,
  type User,
} from '@veilvault/core';

// In-memory store (replace with database in production)
const users = new Map<string, User>();

// Validation schemas
const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.enum(['admin', 'auditor', 'viewer', 'customer']),
  organizationId: z.string().uuid(),
  title: z.string().optional(),
  department: z.string().optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  role: z.enum(['admin', 'auditor', 'viewer', 'customer']).optional(),
  title: z.string().optional(),
  department: z.string().optional(),
});

export async function userRoutes(fastify: FastifyInstance) {
  // Create a new user (invite)
  fastify.post('/', async (request, reply) => {
    const body = createUserSchema.parse(request.body);

    // Check if email already exists
    const existingUser = Array.from(users.values()).find(
      (u) => u.email === body.email.toLowerCase()
    );
    if (existingUser) {
      return reply.status(409).send({
        error: true,
        message: 'User with this email already exists',
      });
    }

    const user = createUser(body);
    users.set(user.id, user);

    return reply.status(201).send({
      success: true,
      data: sanitizeUser(user),
    });
  });

  // List users in organization
  fastify.get<{ Querystring: { organizationId: string } }>(
    '/',
    async (request, reply) => {
      const { organizationId } = request.query;

      if (!organizationId) {
        return reply.status(400).send({
          error: true,
          message: 'organizationId is required',
        });
      }

      const orgUsers = Array.from(users.values())
        .filter((u) => u.organizationId === organizationId)
        .map(sanitizeUser);

      return {
        success: true,
        data: orgUsers,
      };
    }
  );

  // Get user by ID
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;
    const user = users.get(id);

    if (!user) {
      return reply.status(404).send({
        error: true,
        message: 'User not found',
      });
    }

    return {
      success: true,
      data: sanitizeUser(user),
    };
  });

  // Update user
  fastify.patch<{ Params: { id: string } }>(
    '/:id',
    async (request, reply) => {
      const { id } = request.params;
      const body = updateUserSchema.parse(request.body);

      const user = users.get(id);
      if (!user) {
        return reply.status(404).send({
          error: true,
          message: 'User not found',
        });
      }

      const updated: User = {
        ...user,
        ...body,
        updatedAt: new Date(),
      };
      users.set(id, updated);

      return {
        success: true,
        data: sanitizeUser(updated),
      };
    }
  );

  // Activate user (after accepting invite)
  fastify.post<{ Params: { id: string } }>(
    '/:id/activate',
    async (request, reply) => {
      const { id } = request.params;

      const user = users.get(id);
      if (!user) {
        return reply.status(404).send({
          error: true,
          message: 'User not found',
        });
      }

      const activated = activateUser(user);
      users.set(id, activated);

      return {
        success: true,
        data: sanitizeUser(activated),
      };
    }
  );

  // Get user permissions
  fastify.get<{ Params: { id: string } }>(
    '/:id/permissions',
    async (request, reply) => {
      const { id } = request.params;

      const user = users.get(id);
      if (!user) {
        return reply.status(404).send({
          error: true,
          message: 'User not found',
        });
      }

      return {
        success: true,
        data: {
          role: user.role,
          permissions: getUserPermissions(user),
        },
      };
    }
  );

  // Check specific permission
  fastify.get<{ Params: { id: string }; Querystring: { permission: string } }>(
    '/:id/permissions/check',
    async (request, reply) => {
      const { id } = request.params;
      const { permission } = request.query;

      const user = users.get(id);
      if (!user) {
        return reply.status(404).send({
          error: true,
          message: 'User not found',
        });
      }

      return {
        success: true,
        data: {
          permission,
          allowed: hasPermission(user, permission as any),
        },
      };
    }
  );

  // Get all roles and their permissions
  fastify.get('/roles', async () => {
    return {
      success: true,
      data: Object.entries(ROLE_PERMISSIONS).map(([role, permissions]) => ({
        role,
        permissions,
        permissionCount: permissions.length,
      })),
    };
  });

  // Deactivate user
  fastify.post<{ Params: { id: string } }>(
    '/:id/deactivate',
    async (request, reply) => {
      const { id } = request.params;

      const user = users.get(id);
      if (!user) {
        return reply.status(404).send({
          error: true,
          message: 'User not found',
        });
      }

      const deactivated: User = {
        ...user,
        status: 'deactivated',
        updatedAt: new Date(),
      };
      users.set(id, deactivated);

      return {
        success: true,
        message: 'User deactivated',
      };
    }
  );
}

// Remove sensitive fields from user object
function sanitizeUser(user: User): Omit<User, 'preferences'> & { preferences?: User['preferences'] } {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    organizationId: user.organizationId,
    avatar: user.avatar,
    title: user.title,
    department: user.department,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
