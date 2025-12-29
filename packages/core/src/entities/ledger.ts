// ==========================================================================
// LEDGER ENTITY
// Transaction ledger model for VeilVault
// ==========================================================================

import { randomUUID } from '../utils/crypto.js';

export type LedgerStatus = 'active' | 'archived' | 'suspended';

export interface Ledger {
  id: string;
  name: string;
  description?: string;
  status: LedgerStatus;
  rootHash: string;
  entryCount: number;
  createdAt: Date;
  updatedAt: Date;
  lastVerifiedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface CreateLedgerInput {
  name: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export function createLedger(
  input: CreateLedgerInput,
  initialRootHash: string
): Ledger {
  const now = new Date();
  return {
    id: randomUUID(),
    name: input.name,
    description: input.description,
    status: 'active',
    rootHash: initialRootHash,
    entryCount: 0,
    createdAt: now,
    updatedAt: now,
    metadata: input.metadata,
  };
}

export function updateLedgerRoot(
  ledger: Ledger,
  newRootHash: string,
  newEntryCount: number
): Ledger {
  return {
    ...ledger,
    rootHash: newRootHash,
    entryCount: newEntryCount,
    updatedAt: new Date(),
  };
}

export function markLedgerVerified(ledger: Ledger): Ledger {
  return {
    ...ledger,
    lastVerifiedAt: new Date(),
    updatedAt: new Date(),
  };
}

export interface LedgerSummary {
  id: string;
  name: string;
  status: LedgerStatus;
  entryCount: number;
  lastActivity: Date;
  integrityStatus: 'healthy' | 'warning' | 'error';
}

export function toLedgerSummary(
  ledger: Ledger,
  integrityStatus: 'healthy' | 'warning' | 'error' = 'healthy'
): LedgerSummary {
  return {
    id: ledger.id,
    name: ledger.name,
    status: ledger.status,
    entryCount: ledger.entryCount,
    lastActivity: ledger.updatedAt,
    integrityStatus,
  };
}
