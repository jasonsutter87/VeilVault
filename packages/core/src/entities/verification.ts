// ==========================================================================
// VERIFICATION ENTITY
// Verification records and results
// ==========================================================================

import { randomUUID } from '../utils/crypto.js';

export type VerificationType = 'transaction' | 'ledger' | 'audit-package' | 'customer';
export type VerificationStatus = 'valid' | 'invalid' | 'pending' | 'error';

export interface Verification {
  id: string;
  type: VerificationType;
  targetId: string; // Transaction ID, Ledger ID, etc.
  status: VerificationStatus;
  verifiedAt: Date;
  verifiedBy?: string;
  proofHash: string;
  computedRoot: string;
  expectedRoot: string;
  details?: VerificationDetails;
}

export interface VerificationDetails {
  proofPath?: string[];
  index?: number;
  entryHash?: string;
  message?: string;
}

export interface CreateVerificationInput {
  type: VerificationType;
  targetId: string;
  proofHash: string;
  computedRoot: string;
  expectedRoot: string;
  verifiedBy?: string;
  details?: VerificationDetails;
}

export function createVerification(input: CreateVerificationInput): Verification {
  const isValid = input.computedRoot === input.expectedRoot;

  return {
    id: randomUUID(),
    type: input.type,
    targetId: input.targetId,
    status: isValid ? 'valid' : 'invalid',
    verifiedAt: new Date(),
    verifiedBy: input.verifiedBy,
    proofHash: input.proofHash,
    computedRoot: input.computedRoot,
    expectedRoot: input.expectedRoot,
    details: input.details,
  };
}

export interface VerificationSummary {
  totalVerifications: number;
  validCount: number;
  invalidCount: number;
  pendingCount: number;
  errorCount: number;
  lastVerification?: Date;
  integrityScore: number; // 0-100
}

export function calculateVerificationSummary(
  verifications: Verification[]
): VerificationSummary {
  const counts = {
    valid: 0,
    invalid: 0,
    pending: 0,
    error: 0,
  };

  let lastVerification: Date | undefined;

  for (const v of verifications) {
    counts[v.status]++;
    if (!lastVerification || v.verifiedAt > lastVerification) {
      lastVerification = v.verifiedAt;
    }
  }

  const total = verifications.length;
  const integrityScore = total > 0 ? Math.round((counts.valid / total) * 100) : 100;

  return {
    totalVerifications: total,
    validCount: counts.valid,
    invalidCount: counts.invalid,
    pendingCount: counts.pending,
    errorCount: counts.error,
    lastVerification,
    integrityScore,
  };
}

export interface CustomerVerification {
  customerId: string;
  accountId: string;
  statementDate: Date;
  balanceVerified: boolean;
  transactionsVerified: boolean;
  proofProvided: string;
  verifiedAt: Date;
}
