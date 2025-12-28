// ==========================================================================
// ORGANIZATION ROUTES
// Multi-tenant organization management
// ==========================================================================

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  createOrganization,
  activateOrganization,
  upgradeTier,
  hasFeature,
  canAddUser,
  canAddLedger,
  TIER_LIMITS,
  type Organization,
} from '@veilvault/core';

// In-memory store (replace with database in production)
const organizations = new Map<string, Organization>();

// Validation schemas
const createOrgSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(['credit_union', 'regional_bank', 'enterprise_bank', 'regulator', 'auditor_firm']),
  tier: z.enum(['starter', 'professional', 'enterprise', 'regulator']).optional(),
  contactEmail: z.string().email(),
});

const updateOrgSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  settings: z
    .object({
      timezone: z.string().optional(),
      dateFormat: z.string().optional(),
      currency: z.string().optional(),
      requireMFA: z.boolean().optional(),
      sessionTimeoutMinutes: z.number().optional(),
      auditRetentionDays: z.number().optional(),
      allowExternalSharing: z.boolean().optional(),
    })
    .optional(),
});

export async function organizationRoutes(fastify: FastifyInstance) {
  // Create organization
  fastify.post('/', async (request, reply) => {
    const body = createOrgSchema.parse(request.body);

    const org = createOrganization(body);
    organizations.set(org.id, org);

    return reply.status(201).send({
      success: true,
      data: org,
    });
  });

  // Get organization by ID
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;
    const org = organizations.get(id);

    if (!org) {
      return reply.status(404).send({
        error: true,
        message: 'Organization not found',
      });
    }

    return {
      success: true,
      data: org,
    };
  });

  // Update organization
  fastify.patch<{ Params: { id: string } }>(
    '/:id',
    async (request, reply) => {
      const { id } = request.params;
      const body = updateOrgSchema.parse(request.body);

      const org = organizations.get(id);
      if (!org) {
        return reply.status(404).send({
          error: true,
          message: 'Organization not found',
        });
      }

      const updated: Organization = {
        ...org,
        name: body.name ?? org.name,
        settings: body.settings ? { ...org.settings, ...body.settings } : org.settings,
        updatedAt: new Date(),
      };
      organizations.set(id, updated);

      return {
        success: true,
        data: updated,
      };
    }
  );

  // Activate organization (after trial/payment)
  fastify.post<{ Params: { id: string } }>(
    '/:id/activate',
    async (request, reply) => {
      const { id } = request.params;

      const org = organizations.get(id);
      if (!org) {
        return reply.status(404).send({
          error: true,
          message: 'Organization not found',
        });
      }

      const activated = activateOrganization(org);
      organizations.set(id, activated);

      return {
        success: true,
        data: activated,
      };
    }
  );

  // Upgrade subscription tier
  fastify.post<{ Params: { id: string }; Body: { tier: string } }>(
    '/:id/upgrade',
    async (request, reply) => {
      const { id } = request.params;
      const { tier } = request.body as { tier: string };

      const org = organizations.get(id);
      if (!org) {
        return reply.status(404).send({
          error: true,
          message: 'Organization not found',
        });
      }

      if (!['starter', 'professional', 'enterprise', 'regulator'].includes(tier)) {
        return reply.status(400).send({
          error: true,
          message: 'Invalid tier',
        });
      }

      const upgraded = upgradeTier(org, tier as Organization['subscription']['tier']);
      organizations.set(id, upgraded);

      return {
        success: true,
        data: upgraded,
      };
    }
  );

  // Check if organization has a feature
  fastify.get<{ Params: { id: string }; Querystring: { feature: string } }>(
    '/:id/features/check',
    async (request, reply) => {
      const { id } = request.params;
      const { feature } = request.query;

      const org = organizations.get(id);
      if (!org) {
        return reply.status(404).send({
          error: true,
          message: 'Organization not found',
        });
      }

      return {
        success: true,
        data: {
          feature,
          enabled: hasFeature(org, feature),
        },
      };
    }
  );

  // Check limits
  fastify.get<{ Params: { id: string } }>(
    '/:id/limits',
    async (request, reply) => {
      const { id } = request.params;

      const org = organizations.get(id);
      if (!org) {
        return reply.status(404).send({
          error: true,
          message: 'Organization not found',
        });
      }

      // In production, these would be actual counts from the database
      const currentUserCount = 1;
      const currentLedgerCount = 0;

      return {
        success: true,
        data: {
          users: {
            current: currentUserCount,
            max: org.subscription.maxUsers,
            canAdd: canAddUser(org, currentUserCount),
          },
          ledgers: {
            current: currentLedgerCount,
            max: org.subscription.maxLedgers,
            canAdd: canAddLedger(org, currentLedgerCount),
          },
        },
      };
    }
  );

  // Get available tiers
  fastify.get('/tiers', async () => {
    return {
      success: true,
      data: Object.entries(TIER_LIMITS).map(([tier, limits]) => ({
        tier,
        ...limits,
      })),
    };
  });

  // List all organizations (admin only)
  fastify.get('/', async () => {
    const orgs = Array.from(organizations.values());

    return {
      success: true,
      data: orgs,
      total: orgs.length,
    };
  });
}
