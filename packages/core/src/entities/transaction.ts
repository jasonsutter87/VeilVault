// ==========================================================================
// TRANSACTION ENTITY
// Core transaction model for VeilVault
// ==========================================================================

import { randomUUID } from '../utils/crypto.js';

export type TransactionType = 'credit' | 'debit' | 'transfer' | 'adjustment';
export type TransactionStatus = 'pending' | 'confirmed' | 'failed';

export interface Transaction {
  id: string;
  ledgerId: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  currency: string;
  accountId: string;
  counterpartyId?: string;
  reference?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
  createdAt: Date;
  confirmedAt?: Date;
  proofId?: string;
}

export interface CreateTransactionInput {
  ledgerId: string;
  type: TransactionType;
  amount: number;
  currency: string;
  accountId: string;
  counterpartyId?: string;
  reference?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export function createTransaction(input: CreateTransactionInput): Transaction {
  const now = new Date();
  return {
    id: randomUUID(),
    ledgerId: input.ledgerId,
    type: input.type,
    status: 'pending',
    amount: input.amount,
    currency: input.currency,
    accountId: input.accountId,
    counterpartyId: input.counterpartyId,
    reference: input.reference,
    description: input.description,
    metadata: input.metadata,
    timestamp: now,
    createdAt: now,
  };
}

export function confirmTransaction(
  tx: Transaction,
  proofId: string
): Transaction {
  return {
    ...tx,
    status: 'confirmed',
    confirmedAt: new Date(),
    proofId,
  };
}

export function serializeTransaction(tx: Transaction): string {
  return JSON.stringify({
    id: tx.id,
    type: tx.type,
    amount: tx.amount,
    currency: tx.currency,
    accountId: tx.accountId,
    counterpartyId: tx.counterpartyId,
    reference: tx.reference,
    timestamp: tx.timestamp.toISOString(),
  });
}
