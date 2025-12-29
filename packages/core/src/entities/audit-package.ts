// ==========================================================================
// AUDIT PACKAGE ENTITY
// Verifiable audit package for external auditors
// ==========================================================================

import { randomUUID } from '../utils/crypto.js';

export type AuditPackageStatus = 'generating' | 'ready' | 'expired' | 'revoked';

export interface AuditPackage {
  id: string;
  ledgerId: string;
  name: string;
  description?: string;
  status: AuditPackageStatus;
  startDate: Date;
  endDate: Date;
  transactionCount: number;
  rootHash: string;
  proofBundle: string; // Serialized proof bundle
  generatedAt: Date;
  generatedBy: string;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface CreateAuditPackageInput {
  ledgerId: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  generatedBy: string;
  expiresInDays?: number;
}

export function createAuditPackage(
  input: CreateAuditPackageInput,
  transactionCount: number,
  rootHash: string,
  proofBundle: string
): AuditPackage {
  const now = new Date();
  const expiresAt = input.expiresInDays
    ? new Date(now.getTime() + input.expiresInDays * 24 * 60 * 60 * 1000)
    : undefined;

  return {
    id: randomUUID(),
    ledgerId: input.ledgerId,
    name: input.name,
    description: input.description,
    status: 'ready',
    startDate: input.startDate,
    endDate: input.endDate,
    transactionCount,
    rootHash,
    proofBundle,
    generatedAt: now,
    generatedBy: input.generatedBy,
    expiresAt,
  };
}

export interface AuditPackageExport {
  format: 'json' | 'pdf';
  filename: string;
  content: string | Buffer;
  mimeType: string;
}

export function getAuditPackageFilename(pkg: AuditPackage): string {
  const start = pkg.startDate.toISOString().split('T')[0];
  const end = pkg.endDate.toISOString().split('T')[0];
  return `audit-${pkg.ledgerId}-${start}-to-${end}`;
}

export function exportAuditPackageJson(pkg: AuditPackage): AuditPackageExport {
  return {
    format: 'json',
    filename: `${getAuditPackageFilename(pkg)}.json`,
    content: JSON.stringify(
      {
        id: pkg.id,
        ledgerId: pkg.ledgerId,
        name: pkg.name,
        period: {
          start: pkg.startDate.toISOString(),
          end: pkg.endDate.toISOString(),
        },
        transactionCount: pkg.transactionCount,
        rootHash: pkg.rootHash,
        proofBundle: pkg.proofBundle,
        generatedAt: pkg.generatedAt.toISOString(),
        generatedBy: pkg.generatedBy,
      },
      null,
      2
    ),
    mimeType: 'application/json',
  };
}

export function isAuditPackageExpired(pkg: AuditPackage): boolean {
  if (!pkg.expiresAt) return false;
  return new Date() > pkg.expiresAt;
}
