// ==========================================================================
// TRANSACTION ROUTES
// Transaction management and proof endpoints
// ==========================================================================

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createVaultLedger, type VaultLedgerConfig, type TransactionData } from '@veilvault/sdk';

// Validation schemas
const createTransactionSchema = z.object({
  ledgerId: z.string().uuid(),
  type: z.enum(['credit', 'debit', 'transfer', 'adjustment']),
  amount: z.number().positive(),
  currency: z.string().length(3),
  accountId: z.string().min(1),
  counterpartyId: z.string().optional(),
  reference: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const getProofSchema = z.object({
  ledgerId: z.string().uuid(),
  entryId: z.string(),
});

// Initialize VaultLedger
function getLedgerClient(): ReturnType<typeof createVaultLedger> {
  const config: VaultLedgerConfig = {
    apiKey: process.env.VEILCHAIN_API_KEY ?? 'dev-key',
    baseUrl: process.env.VEILCHAIN_URL ?? 'http://localhost:3000',
  };
  return createVaultLedger(config);
}

export async function transactionRoutes(fastify: FastifyInstance) {
  const ledgerClient = getLedgerClient();

  // Create a new transaction (append to ledger)
  fastify.post('/', async (request, reply) => {
    const body = createTransactionSchema.parse(request.body);

    const transactionData: TransactionData = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type: body.type,
      amount: body.amount,
      currency: body.currency,
      accountId: body.accountId,
      counterpartyId: body.counterpartyId,
      reference: body.reference,
      metadata: body.metadata,
    };

    try {
      const proof = await ledgerClient.appendTransaction(
        body.ledgerId,
        transactionData
      );

      return reply.status(201).send({
        success: true,
        data: {
          transaction: transactionData,
          proof,
        },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: true,
        message: 'Failed to create transaction',
      });
    }
  });

  // Get proof for a specific transaction
  fastify.get<{ Params: { ledgerId: string; entryId: string } }>(
    '/:ledgerId/:entryId/proof',
    async (request, reply) => {
      const { ledgerId, entryId } = request.params;

      try {
        const proof = await ledgerClient.getProof(ledgerId, entryId);

        return {
          success: true,
          data: proof,
        };
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: true,
          message: 'Failed to get proof',
        });
      }
    }
  );

  // Get serialized proof for external verification
  fastify.get<{ Params: { ledgerId: string; entryId: string } }>(
    '/:ledgerId/:entryId/proof/export',
    async (request, reply) => {
      const { ledgerId, entryId } = request.params;

      try {
        const proof = await ledgerClient.getProof(ledgerId, entryId);
        const serialized = ledgerClient.serializeProof(proof);

        return {
          success: true,
          data: {
            proof: serialized,
            format: 'base64',
            instructions: 'Use VeilVault SDK or VeilChain to verify this proof',
          },
        };
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: true,
          message: 'Failed to export proof',
        });
      }
    }
  );

  // Batch create transactions
  fastify.post<{ Body: { ledgerId: string; transactions: unknown[] } }>(
    '/batch',
    async (request, reply) => {
      const { ledgerId, transactions } = request.body;

      if (!Array.isArray(transactions) || transactions.length === 0) {
        return reply.status(400).send({
          error: true,
          message: 'Transactions array is required',
        });
      }

      if (transactions.length > 100) {
        return reply.status(400).send({
          error: true,
          message: 'Maximum 100 transactions per batch',
        });
      }

      const results: Array<{ success: boolean; transaction?: unknown; error?: string }> = [];

      for (const tx of transactions) {
        try {
          const parsed = createTransactionSchema.omit({ ledgerId: true }).parse(tx);
          const transactionData: TransactionData = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            ...parsed,
          };

          const proof = await ledgerClient.appendTransaction(ledgerId, transactionData);
          results.push({
            success: true,
            transaction: { ...transactionData, proof },
          });
        } catch (error) {
          results.push({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      const successCount = results.filter((r) => r.success).length;

      return reply.status(successCount === results.length ? 201 : 207).send({
        success: successCount === results.length,
        data: {
          total: results.length,
          succeeded: successCount,
          failed: results.length - successCount,
          results,
        },
      });
    }
  );
}
