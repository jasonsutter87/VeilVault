// ==========================================================================
// VEILVAULT SDK TYPES
// ==========================================================================

export interface VaultConfig {
  veilchain: {
    apiKey: string;
    baseUrl: string;
  };
  veilproof?: {
    apiKey: string;
    baseUrl: string;
  };
  veilkey?: {
    apiKey: string;
    baseUrl: string;
  };
  veilsign?: {
    apiKey: string;
    baseUrl: string;
  };
}

export interface TransactionData {
  id: string;
  timestamp: string;
  type: 'credit' | 'debit' | 'transfer' | 'adjustment';
  amount: number;
  currency: string;
  accountId: string;
  counterpartyId?: string;
  reference?: string;
  metadata?: Record<string, unknown>;
}

export interface LedgerInfo {
  id: string;
  name: string;
  createdAt: string;
  rootHash: string;
  entryCount: number;
}

export interface TransactionProof {
  entryId: string;
  ledgerId: string;
  rootHash: string;
  proof: string[];
  index: number;
  timestamp: string;
}

export interface AuditPackage {
  id: string;
  ledgerId: string;
  startDate: string;
  endDate: string;
  transactionCount: number;
  rootHash: string;
  proofs: TransactionProof[];
  generatedAt: string;
  generatedBy: string;
}

export interface IntegrityStatus {
  status: 'healthy' | 'warning' | 'error';
  ledgerId: string;
  lastVerified: string;
  rootHash: string;
  entryCount: number;
  message?: string;
}

export interface VerificationResult {
  valid: boolean;
  ledgerId: string;
  entryId: string;
  verifiedAt: string;
  details?: {
    expectedRoot: string;
    computedRoot: string;
    proofPath: string[];
  };
}
