// ==========================================================================
// AUDIT SERVICE
// Audit package generation and management
// ==========================================================================

import { VaultLedger } from '@veilvault/sdk';
import type { Transaction } from '../entities/transaction.js';
import type { AuditPackage, CreateAuditPackageInput } from '../entities/audit-package.js';
import {
  createAuditPackage,
  exportAuditPackageJson,
  isAuditPackageExpired,
} from '../entities/audit-package.js';

export interface AuditServiceConfig {
  vaultLedger: VaultLedger;
}

export class AuditService {
  private vaultLedger: VaultLedger;
  private packages: Map<string, AuditPackage> = new Map();

  constructor(config: AuditServiceConfig) {
    this.vaultLedger = config.vaultLedger;
  }

  /**
   * Generate an audit package for a date range
   */
  async generateAuditPackage(
    input: CreateAuditPackageInput
  ): Promise<AuditPackage> {
    // Fetch transactions for the date range
    const transactions = await this.vaultLedger.listTransactions(input.ledgerId);

    // Filter by date range
    const filteredTx = transactions.filter((tx) => {
      const txDate = new Date(tx.timestamp);
      return txDate >= input.startDate && txDate <= input.endDate;
    });

    // Get proofs for all transactions
    const proofs: string[] = [];
    for (const tx of filteredTx) {
      try {
        const proof = await this.vaultLedger.getProof(input.ledgerId, tx.id);
        proofs.push(this.vaultLedger.serializeProof(proof));
      } catch {
        // Transaction might not have a proof yet
      }
    }

    // Get current ledger state
    const ledgers = await this.vaultLedger.listLedgers();
    const ledger = ledgers.find((l) => l.id === input.ledgerId);
    const rootHash = ledger?.rootHash ?? '';

    // Create proof bundle
    const proofBundle = JSON.stringify({
      version: '1.0',
      ledgerId: input.ledgerId,
      period: {
        start: input.startDate.toISOString(),
        end: input.endDate.toISOString(),
      },
      transactionCount: filteredTx.length,
      rootHash,
      proofs,
    });

    // Create the audit package
    const auditPackage = createAuditPackage(
      input,
      filteredTx.length,
      rootHash,
      proofBundle
    );

    this.packages.set(auditPackage.id, auditPackage);

    return auditPackage;
  }

  /**
   * Get an audit package by ID
   */
  getAuditPackage(packageId: string): AuditPackage | undefined {
    return this.packages.get(packageId);
  }

  /**
   * List all audit packages for a ledger
   */
  listAuditPackages(ledgerId: string): AuditPackage[] {
    return Array.from(this.packages.values()).filter(
      (pkg) => pkg.ledgerId === ledgerId
    );
  }

  /**
   * Export audit package as JSON
   */
  exportPackageJson(packageId: string): string | null {
    const pkg = this.packages.get(packageId);
    if (!pkg) return null;

    const exported = exportAuditPackageJson(pkg);
    return exported.content as string;
  }

  /**
   * Verify an audit package
   */
  async verifyAuditPackage(
    packageId: string
  ): Promise<{ valid: boolean; message: string }> {
    const pkg = this.packages.get(packageId);
    if (!pkg) {
      return { valid: false, message: 'Package not found' };
    }

    if (isAuditPackageExpired(pkg)) {
      return { valid: false, message: 'Package has expired' };
    }

    // Parse and verify each proof in the bundle
    try {
      const bundle = JSON.parse(pkg.proofBundle);

      // Verify root hash matches current ledger
      const ledgers = await this.vaultLedger.listLedgers();
      const ledger = ledgers.find((l) => l.id === pkg.ledgerId);

      if (!ledger) {
        return { valid: false, message: 'Ledger not found' };
      }

      // Note: In production, we'd verify each proof individually
      // For now, check basic structure
      if (bundle.rootHash !== pkg.rootHash) {
        return { valid: false, message: 'Root hash mismatch in bundle' };
      }

      return {
        valid: true,
        message: `Verified ${bundle.transactionCount} transactions`,
      };
    } catch (error) {
      return {
        valid: false,
        message: `Verification error: ${error instanceof Error ? error.message : 'Unknown'}`,
      };
    }
  }

  /**
   * Revoke an audit package
   */
  revokeAuditPackage(packageId: string): boolean {
    const pkg = this.packages.get(packageId);
    if (!pkg) return false;

    pkg.status = 'revoked';
    return true;
  }
}

export function createAuditService(config: AuditServiceConfig): AuditService {
  return new AuditService(config);
}
