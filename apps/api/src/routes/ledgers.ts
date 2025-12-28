// ==========================================================================
// LEDGER ROUTES
// Transaction ledger management endpoints
// ==========================================================================

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createVaultLedger, type VaultLedgerConfig } from '@veilvault/sdk';

// Validation schemas
const createLedgerSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

const listLedgersSchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

// Initialize VaultLedger (in production, this would come from config/env)
function getLedgerClient(): ReturnType<typeof createVaultLedger> {
  const config: VaultLedgerConfig = {
    apiKey: process.env.VEILCHAIN_API_KEY ?? 'dev-key',
    baseUrl: process.env.VEILCHAIN_URL ?? 'http://localhost:3000',
  };
  return createVaultLedger(config);
}

export async function ledgerRoutes(fastify: FastifyInstance) {
  const ledgerClient = getLedgerClient();

  // Create a new ledger
  fastify.post('/', async (request, reply) => {
    const body = createLedgerSchema.parse(request.body);

    try {
      const ledger = await ledgerClient.createLedger(body.name, body.description);

      return reply.status(201).send({
        success: true,
        data: ledger,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: true,
        message: 'Failed to create ledger',
      });
    }
  });

  // List all ledgers
  fastify.get('/', async (request, reply) => {
    const query = listLedgersSchema.parse(request.query);

    try {
      const ledgers = await ledgerClient.listLedgers();

      // Apply pagination
      const paginated = ledgers.slice(query.offset, query.offset + query.limit);

      return {
        success: true,
        data: paginated,
        pagination: {
          total: ledgers.length,
          limit: query.limit,
          offset: query.offset,
        },
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: true,
        message: 'Failed to list ledgers',
      });
    }
  });

  // Get a specific ledger
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;

    try {
      const ledgers = await ledgerClient.listLedgers();
      const ledger = ledgers.find((l) => l.id === id);

      if (!ledger) {
        return reply.status(404).send({
          error: true,
          message: 'Ledger not found',
        });
      }

      return {
        success: true,
        data: ledger,
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: true,
        message: 'Failed to get ledger',
      });
    }
  });

  // Get ledger integrity status
  fastify.get<{ Params: { id: string } }>(
    '/:id/integrity',
    async (request, reply) => {
      const { id } = request.params;

      try {
        const status = await ledgerClient.getIntegrityStatus(id);

        return {
          success: true,
          data: status,
        };
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: true,
          message: 'Failed to check integrity',
        });
      }
    }
  );

  // Get transactions in a ledger
  fastify.get<{ Params: { id: string }; Querystring: { limit?: string; offset?: string } }>(
    '/:id/transactions',
    async (request, reply) => {
      const { id } = request.params;
      const limit = parseInt(request.query.limit ?? '100', 10);
      const offset = parseInt(request.query.offset ?? '0', 10);

      try {
        const transactions = await ledgerClient.listTransactions(id, {
          limit,
          offset,
        });

        return {
          success: true,
          data: transactions,
          pagination: {
            limit,
            offset,
          },
        };
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: true,
          message: 'Failed to list transactions',
        });
      }
    }
  );
}
