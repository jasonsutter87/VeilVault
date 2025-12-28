// ==========================================================================
// VEILVAULT LEDGER SERVICE
// Wrapper around VeilChain for transaction ledger operations
// ==========================================================================

import {
  VeilChainClient,
  MerkleTree,
  verifyProofOffline,
  serializeProofForStorage,
  deserializeProofFromStorage,
} from '@veilchain/core';

import type {
  VaultConfig,
  TransactionData,
  LedgerInfo,
  TransactionProof,
  IntegrityStatus,
  VerificationResult,
} from './types.js';

export interface VaultLedgerConfig {
  apiKey: string;
  baseUrl: string;
}

export class VaultLedger {
  private client: VeilChainClient;
  private localTree: MerkleTree | null = null;

  constructor(config: VaultLedgerConfig) {
    this.client = new VeilChainClient({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
    });
  }

  /**
   * Create a new transaction ledger
   */
  async createLedger(name: string, description?: string): Promise<LedgerInfo> {
    const result = await this.client.createLedger({
      name,
      metadata: { description, type: 'transaction-ledger' },
    });

    return {
      id: result.id,
      name: result.name,
      createdAt: result.createdAt,
      rootHash: result.rootHash,
      entryCount: 0,
    };
  }

  /**
   * Append a transaction to the ledger
   */
  async appendTransaction(
    ledgerId: string,
    transaction: TransactionData
  ): Promise<TransactionProof> {
    const result = await this.client.append(ledgerId, {
      data: transaction,
      timestamp: transaction.timestamp,
    });

    return {
      entryId: result.entryId,
      ledgerId,
      rootHash: result.rootHash,
      proof: result.proof,
      index: result.index,
      timestamp: transaction.timestamp,
    };
  }

  /**
   * Get inclusion proof for a transaction
   */
  async getProof(ledgerId: string, entryId: string): Promise<TransactionProof> {
    const result = await this.client.getProof(ledgerId, entryId);

    return {
      entryId,
      ledgerId,
      rootHash: result.rootHash,
      proof: result.proof,
      index: result.index,
      timestamp: result.timestamp,
    };
  }

  /**
   * Verify a proof locally (no network call)
   */
  verifyProofLocally(
    entryHash: string,
    proof: TransactionProof
  ): VerificationResult {
    const isValid = verifyProofOffline({
      entryHash,
      proof: proof.proof,
      index: proof.index,
      rootHash: proof.rootHash,
    });

    return {
      valid: isValid,
      ledgerId: proof.ledgerId,
      entryId: proof.entryId,
      verifiedAt: new Date().toISOString(),
      details: {
        expectedRoot: proof.rootHash,
        computedRoot: isValid ? proof.rootHash : 'mismatch',
        proofPath: proof.proof,
      },
    };
  }

  /**
   * Get ledger integrity status
   */
  async getIntegrityStatus(ledgerId: string): Promise<IntegrityStatus> {
    try {
      const health = await this.client.healthCheck();
      const ledgers = await this.client.listLedgers({ limit: 1 });

      // Find the specific ledger
      const ledger = ledgers.find((l: any) => l.id === ledgerId);

      if (!ledger) {
        return {
          status: 'error',
          ledgerId,
          lastVerified: new Date().toISOString(),
          rootHash: '',
          entryCount: 0,
          message: 'Ledger not found',
        };
      }

      return {
        status: 'healthy',
        ledgerId,
        lastVerified: new Date().toISOString(),
        rootHash: ledger.rootHash,
        entryCount: ledger.entryCount,
      };
    } catch (error) {
      return {
        status: 'error',
        ledgerId,
        lastVerified: new Date().toISOString(),
        rootHash: '',
        entryCount: 0,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * List all ledgers
   */
  async listLedgers(): Promise<LedgerInfo[]> {
    const ledgers = await this.client.listLedgers({});

    return ledgers.map((l: any) => ({
      id: l.id,
      name: l.name,
      createdAt: l.createdAt,
      rootHash: l.rootHash,
      entryCount: l.entryCount,
    }));
  }

  /**
   * List transactions in a ledger
   */
  async listTransactions(
    ledgerId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<TransactionData[]> {
    const entries = await this.client.listEntries(ledgerId, {
      limit: options?.limit ?? 100,
      offset: options?.offset ?? 0,
    });

    return entries.map((e: any) => e.data as TransactionData);
  }

  /**
   * Serialize a proof for storage/transmission
   */
  serializeProof(proof: TransactionProof): string {
    return serializeProofForStorage({
      entryId: proof.entryId,
      rootHash: proof.rootHash,
      proof: proof.proof,
      index: proof.index,
    });
  }

  /**
   * Deserialize a stored proof
   */
  deserializeProof(serialized: string, ledgerId: string): TransactionProof {
    const parsed = deserializeProofFromStorage(serialized);
    return {
      entryId: parsed.entryId,
      ledgerId,
      rootHash: parsed.rootHash,
      proof: parsed.proof,
      index: parsed.index,
      timestamp: '',
    };
  }
}

/**
 * Factory function to create VaultLedger instance
 */
export function createVaultLedger(config: VaultLedgerConfig): VaultLedger {
  return new VaultLedger(config);
}
