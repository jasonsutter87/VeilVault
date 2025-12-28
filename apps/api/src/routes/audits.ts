// ==========================================================================
// AUDIT ROUTES
// Audit package generation and management
// ==========================================================================

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createVaultLedger, type VaultLedgerConfig } from '@veilvault/sdk';
import { createAuditService } from '@veilvault/core';

// Validation schemas
const createAuditPackageSchema = z.object({
  ledgerId: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  expiresInDays: z.number().int().positive().max(365).optional(),
});

// Initialize services
function getServices() {
  const ledgerConfig: VaultLedgerConfig = {
    apiKey: process.env.VEILCHAIN_API_KEY ?? 'dev-key',
    baseUrl: process.env.VEILCHAIN_URL ?? 'http://localhost:3000',
  };
  const vaultLedger = createVaultLedger(ledgerConfig);
  const auditService = createAuditService({ vaultLedger });

  return { vaultLedger, auditService };
}

export async function auditRoutes(fastify: FastifyInstance) {
  const { auditService } = getServices();

  // Generate a new audit package
  fastify.post('/', async (request, reply) => {
    const body = createAuditPackageSchema.parse(request.body);

    try {
      const auditPackage = await auditService.generateAuditPackage({
        ledgerId: body.ledgerId,
        name: body.name,
        description: body.description,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        generatedBy: 'api', // Would come from auth in production
        expiresInDays: body.expiresInDays,
      });

      return reply.status(201).send({
        success: true,
        data: {
          id: auditPackage.id,
          name: auditPackage.name,
          ledgerId: auditPackage.ledgerId,
          status: auditPackage.status,
          transactionCount: auditPackage.transactionCount,
          generatedAt: auditPackage.generatedAt.toISOString(),
          expiresAt: auditPackage.expiresAt?.toISOString(),
        },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: true,
        message: 'Failed to generate audit package',
      });
    }
  });

  // Get audit package by ID
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;

    const auditPackage = auditService.getAuditPackage(id);

    if (!auditPackage) {
      return reply.status(404).send({
        error: true,
        message: 'Audit package not found',
      });
    }

    return {
      success: true,
      data: {
        id: auditPackage.id,
        name: auditPackage.name,
        ledgerId: auditPackage.ledgerId,
        status: auditPackage.status,
        period: {
          start: auditPackage.startDate.toISOString(),
          end: auditPackage.endDate.toISOString(),
        },
        transactionCount: auditPackage.transactionCount,
        rootHash: auditPackage.rootHash,
        generatedAt: auditPackage.generatedAt.toISOString(),
        generatedBy: auditPackage.generatedBy,
        expiresAt: auditPackage.expiresAt?.toISOString(),
      },
    };
  });

  // Export audit package as JSON
  fastify.get<{ Params: { id: string } }>(
    '/:id/export',
    async (request, reply) => {
      const { id } = request.params;

      const exported = auditService.exportPackageJson(id);

      if (!exported) {
        return reply.status(404).send({
          error: true,
          message: 'Audit package not found',
        });
      }

      reply.header('Content-Type', 'application/json');
      reply.header(
        'Content-Disposition',
        `attachment; filename="audit-${id}.json"`
      );

      return exported;
    }
  );

  // Verify an audit package
  fastify.post<{ Params: { id: string } }>(
    '/:id/verify',
    async (request, reply) => {
      const { id } = request.params;

      try {
        const result = await auditService.verifyAuditPackage(id);

        return {
          success: true,
          data: {
            packageId: id,
            valid: result.valid,
            message: result.message,
            verifiedAt: new Date().toISOString(),
          },
        };
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: true,
          message: 'Failed to verify audit package',
        });
      }
    }
  );

  // List audit packages for a ledger
  fastify.get<{ Querystring: { ledgerId: string } }>(
    '/',
    async (request, reply) => {
      const { ledgerId } = request.query;

      if (!ledgerId) {
        return reply.status(400).send({
          error: true,
          message: 'ledgerId query parameter is required',
        });
      }

      const packages = auditService.listAuditPackages(ledgerId);

      return {
        success: true,
        data: packages.map((pkg) => ({
          id: pkg.id,
          name: pkg.name,
          status: pkg.status,
          transactionCount: pkg.transactionCount,
          generatedAt: pkg.generatedAt.toISOString(),
        })),
      };
    }
  );

  // Revoke an audit package
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;

    const revoked = auditService.revokeAuditPackage(id);

    if (!revoked) {
      return reply.status(404).send({
        error: true,
        message: 'Audit package not found',
      });
    }

    return {
      success: true,
      message: 'Audit package revoked',
    };
  });
}
