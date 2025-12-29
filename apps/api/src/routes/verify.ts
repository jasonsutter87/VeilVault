// ==========================================================================
// VERIFY ROUTES
// Proof verification endpoints
// ==========================================================================

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createVaultLedger, type VaultLedgerConfig } from '@veilvault/sdk';

// Validation schemas
const verifyProofSchema = z.object({
  proof: z.string(), // Serialized proof JSON
});

const verifyBatchSchema = z.object({
  proofs: z.array(
    z.object({
      entryId: z.string(),
      proof: z.string(),
    })
  ),
});

// Initialize VaultLedger
function getLedgerClient(): ReturnType<typeof createVaultLedger> {
  const config: VaultLedgerConfig = {
    apiKey: process.env.VEILCHAIN_API_KEY ?? 'dev-key',
    baseUrl: process.env.VEILCHAIN_URL ?? 'http://localhost:3000',
  };
  return createVaultLedger(config);
}

export async function verifyRoutes(fastify: FastifyInstance) {
  const ledgerClient = getLedgerClient();

  // Verify a single proof
  fastify.post('/', async (request, reply) => {
    const body = verifyProofSchema.parse(request.body);

    try {
      // Deserialize the proof
      const proof = ledgerClient.deserializeProof(body.proof);

      // Verify locally - returns boolean
      const isValid = await ledgerClient.verifyProofLocally(proof);

      return {
        success: true,
        data: {
          valid: isValid,
          verifiedAt: new Date().toISOString(),
          proofRoot: proof.root,
          proofIndex: proof.index,
        },
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(400).send({
        error: true,
        message: 'Invalid proof format',
      });
    }
  });

  // Verify multiple proofs in batch
  fastify.post('/batch', async (request, reply) => {
    const body = verifyBatchSchema.parse(request.body);

    if (body.proofs.length > 100) {
      return reply.status(400).send({
        error: true,
        message: 'Maximum 100 proofs per batch',
      });
    }

    const results: Array<{
      entryId: string;
      valid: boolean;
      error?: string;
    }> = [];

    for (const item of body.proofs) {
      try {
        const proof = ledgerClient.deserializeProof(item.proof);
        const isValid = await ledgerClient.verifyProofLocally(proof);

        results.push({
          entryId: item.entryId,
          valid: isValid,
        });
      } catch (error) {
        results.push({
          entryId: item.entryId,
          valid: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const validCount = results.filter((r) => r.valid).length;

    return {
      success: true,
      data: {
        total: results.length,
        valid: validCount,
        invalid: results.length - validCount,
        results,
        verifiedAt: new Date().toISOString(),
      },
    };
  });

  // Verify proof against current ledger state
  fastify.post<{ Params: { ledgerId: string; entryId: string } }>(
    '/live/:ledgerId/:entryId',
    async (request, reply) => {
      const { ledgerId, entryId } = request.params;

      try {
        // Get fresh proof from ledger
        const result = await ledgerClient.getProofByEntryId(ledgerId, entryId);

        // Get current integrity status
        const status = await ledgerClient.getIntegrityStatus(ledgerId);

        return {
          success: true,
          data: {
            valid: status.status === 'healthy',
            ledgerId,
            entryId,
            currentRootHash: status.rootHash,
            proofRootHash: result.rootHash,
            rootsMatch: status.rootHash === result.rootHash,
            verifiedAt: new Date().toISOString(),
          },
        };
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: true,
          message: 'Failed to verify against live ledger',
        });
      }
    }
  );

  // Get verification instructions (for external auditors)
  fastify.get('/instructions', async () => {
    return {
      success: true,
      data: {
        title: 'VeilVault Proof Verification',
        description:
          'Instructions for independently verifying VeilVault proofs',
        methods: [
          {
            name: 'API Verification',
            description: 'POST your proof to /api/verify',
            format: {
              proof: 'JSON-serialized Merkle proof',
            },
          },
          {
            name: 'SDK Verification',
            description: 'Use @veilvault/sdk or @veilchain/core',
            code: `
import { verifyProofOffline } from '@veilchain/core';

const isValid = verifyProofOffline({
  leaf: 'entry-hash',
  proof: ['sibling-hash-1', 'sibling-hash-2'],
  directions: ['left', 'right'],
  index: 0,
  root: 'root-hash',
});
            `.trim(),
          },
          {
            name: 'Manual Verification',
            description:
              'Compute Merkle root from proof path and compare to published root',
            steps: [
              '1. Hash the entry data with SHA-256',
              '2. Combine with sibling hashes using proof path',
              '3. Compare computed root with published root hash',
              '4. Verify root was published at claimed timestamp',
            ],
          },
        ],
      },
    };
  });
}
