// ==========================================================================
// AUDIT SERVICE
// Audit package generation and management
// ==========================================================================

import { VaultLedger } from '@veilvault/sdk';
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
   * In a full implementation, this would query the ledger for entries in the date range
   */
  async generateAuditPackage(
    input: CreateAuditPackageInput
  ): Promise<AuditPackage> {
    // Get current ledger state
    const integrityStatus = await this.vaultLedger.getIntegrityStatus(input.ledgerId);

    if (integrityStatus.status === 'error') {
      throw new Error(integrityStatus.message || 'Ledger not found');
    }

    const rootHash = integrityStatus.rootHash;
    const entryCount = integrityStatus.entryCount;

    // Create proof bundle
    // In production, this would include proofs for all entries in the date range
    const proofBundle = JSON.stringify({
      version: '1.0',
      ledgerId: input.ledgerId,
      period: {
        start: input.startDate.toISOString(),
        end: input.endDate.toISOString(),
      },
      entryCount,
      rootHash,
      proofs: [], // Would contain serialized proofs in production
    });

    // Create the audit package
    const auditPackage = createAuditPackage(
      input,
      entryCount,
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

    // Parse and verify the proof bundle
    try {
      const bundle = JSON.parse(pkg.proofBundle);

      // Get current ledger status
      const status = await this.vaultLedger.getIntegrityStatus(pkg.ledgerId);

      if (status.status === 'error') {
        return { valid: false, message: 'Ledger not found' };
      }

      // Note: In production, we'd verify each proof individually
      // For now, check basic structure
      if (bundle.rootHash !== pkg.rootHash) {
        return { valid: false, message: 'Root hash mismatch in bundle' };
      }

      return {
        valid: true,
        message: `Verified package with ${bundle.entryCount} entries`,
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
