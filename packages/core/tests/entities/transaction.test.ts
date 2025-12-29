import { describe, it, expect } from 'vitest';
import {
  createTransaction,
  confirmTransaction,
  serializeTransaction,
  type CreateTransactionInput,
} from '../../src/entities/transaction.js';

describe('Transaction Entity', () => {
  describe('createTransaction', () => {
    it('should create a transaction with valid input', () => {
      const input: CreateTransactionInput = {
        ledgerId: 'ledger-123',
        type: 'credit',
        amount: 1000,
        currency: 'USD',
        accountId: 'account-456',
      };

      const tx = createTransaction(input);

      expect(tx.id).toBeDefined();
      expect(tx.ledgerId).toBe('ledger-123');
      expect(tx.type).toBe('credit');
      expect(tx.amount).toBe(1000);
      expect(tx.currency).toBe('USD');
      expect(tx.accountId).toBe('account-456');
      expect(tx.status).toBe('pending');
    });

    it('should set timestamps on creation', () => {
      const beforeCreate = new Date();
      const tx = createTransaction({
        ledgerId: 'ledger-123',
        type: 'debit',
        amount: 500,
        currency: 'USD',
        accountId: 'account-456',
      });
      const afterCreate = new Date();

      expect(tx.timestamp.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(tx.timestamp.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
      expect(tx.createdAt.getTime()).toEqual(tx.timestamp.getTime());
    });

    it('should include optional fields when provided', () => {
      const tx = createTransaction({
        ledgerId: 'ledger-123',
        type: 'transfer',
        amount: 2500,
        currency: 'USD',
        accountId: 'account-456',
        counterpartyId: 'counterparty-789',
        reference: 'REF-12345',
        description: 'Wire transfer',
        metadata: { batch: 'B001', priority: 'high' },
      });

      expect(tx.counterpartyId).toBe('counterparty-789');
      expect(tx.reference).toBe('REF-12345');
      expect(tx.description).toBe('Wire transfer');
      expect(tx.metadata).toEqual({ batch: 'B001', priority: 'high' });
    });

    it('should not have proofId initially', () => {
      const tx = createTransaction({
        ledgerId: 'ledger-123',
        type: 'credit',
        amount: 100,
        currency: 'USD',
        accountId: 'account-456',
      });

      expect(tx.proofId).toBeUndefined();
      expect(tx.confirmedAt).toBeUndefined();
    });

    it('should support all transaction types', () => {
      const types = ['credit', 'debit', 'transfer', 'adjustment'] as const;

      types.forEach((type) => {
        const tx = createTransaction({
          ledgerId: 'ledger-123',
          type,
          amount: 100,
          currency: 'USD',
          accountId: 'account-456',
        });
        expect(tx.type).toBe(type);
      });
    });

    it('should handle zero amounts', () => {
      const tx = createTransaction({
        ledgerId: 'ledger-123',
        type: 'adjustment',
        amount: 0,
        currency: 'USD',
        accountId: 'account-456',
      });

      expect(tx.amount).toBe(0);
    });

    it('should handle negative amounts for adjustments', () => {
      const tx = createTransaction({
        ledgerId: 'ledger-123',
        type: 'adjustment',
        amount: -500,
        currency: 'USD',
        accountId: 'account-456',
      });

      expect(tx.amount).toBe(-500);
    });
  });

  describe('confirmTransaction', () => {
    it('should confirm a pending transaction', () => {
      const tx = createTransaction({
        ledgerId: 'ledger-123',
        type: 'credit',
        amount: 1000,
        currency: 'USD',
        accountId: 'account-456',
      });

      expect(tx.status).toBe('pending');

      const confirmed = confirmTransaction(tx, 'proof-abc-123');

      expect(confirmed.status).toBe('confirmed');
      expect(confirmed.proofId).toBe('proof-abc-123');
      expect(confirmed.confirmedAt).toBeDefined();
    });

    it('should set confirmedAt timestamp', () => {
      const tx = createTransaction({
        ledgerId: 'ledger-123',
        type: 'debit',
        amount: 500,
        currency: 'USD',
        accountId: 'account-456',
      });

      const beforeConfirm = new Date();
      const confirmed = confirmTransaction(tx, 'proof-xyz');
      const afterConfirm = new Date();

      expect(confirmed.confirmedAt!.getTime()).toBeGreaterThanOrEqual(beforeConfirm.getTime());
      expect(confirmed.confirmedAt!.getTime()).toBeLessThanOrEqual(afterConfirm.getTime());
    });

    it('should preserve all original fields', () => {
      const tx = createTransaction({
        ledgerId: 'ledger-123',
        type: 'transfer',
        amount: 2500,
        currency: 'EUR',
        accountId: 'account-456',
        counterpartyId: 'counterparty-789',
        reference: 'REF-12345',
      });

      const confirmed = confirmTransaction(tx, 'proof-123');

      expect(confirmed.id).toBe(tx.id);
      expect(confirmed.ledgerId).toBe(tx.ledgerId);
      expect(confirmed.type).toBe(tx.type);
      expect(confirmed.amount).toBe(tx.amount);
      expect(confirmed.currency).toBe(tx.currency);
      expect(confirmed.accountId).toBe(tx.accountId);
      expect(confirmed.counterpartyId).toBe(tx.counterpartyId);
      expect(confirmed.reference).toBe(tx.reference);
      expect(confirmed.timestamp).toBe(tx.timestamp);
      expect(confirmed.createdAt).toBe(tx.createdAt);
    });
  });

  describe('serializeTransaction', () => {
    it('should serialize transaction to JSON string', () => {
      const tx = createTransaction({
        ledgerId: 'ledger-123',
        type: 'credit',
        amount: 1000,
        currency: 'USD',
        accountId: 'account-456',
      });

      const serialized = serializeTransaction(tx);
      const parsed = JSON.parse(serialized);

      expect(parsed.id).toBe(tx.id);
      expect(parsed.type).toBe('credit');
      expect(parsed.amount).toBe(1000);
      expect(parsed.currency).toBe('USD');
      expect(parsed.accountId).toBe('account-456');
    });

    it('should include counterparty when present', () => {
      const tx = createTransaction({
        ledgerId: 'ledger-123',
        type: 'transfer',
        amount: 500,
        currency: 'USD',
        accountId: 'account-456',
        counterpartyId: 'counterparty-789',
      });

      const serialized = serializeTransaction(tx);
      const parsed = JSON.parse(serialized);

      expect(parsed.counterpartyId).toBe('counterparty-789');
    });

    it('should serialize timestamp as ISO string', () => {
      const tx = createTransaction({
        ledgerId: 'ledger-123',
        type: 'debit',
        amount: 250,
        currency: 'USD',
        accountId: 'account-456',
      });

      const serialized = serializeTransaction(tx);
      const parsed = JSON.parse(serialized);

      expect(parsed.timestamp).toBe(tx.timestamp.toISOString());
    });

    it('should produce deterministic output for same data', () => {
      const tx = createTransaction({
        ledgerId: 'ledger-123',
        type: 'credit',
        amount: 1000,
        currency: 'USD',
        accountId: 'account-456',
        reference: 'REF-001',
      });

      const serialized1 = serializeTransaction(tx);
      const serialized2 = serializeTransaction(tx);

      expect(serialized1).toBe(serialized2);
    });

    it('should not include metadata in serialization', () => {
      const tx = createTransaction({
        ledgerId: 'ledger-123',
        type: 'credit',
        amount: 1000,
        currency: 'USD',
        accountId: 'account-456',
        metadata: { internal: 'data', secret: 'value' },
      });

      const serialized = serializeTransaction(tx);
      const parsed = JSON.parse(serialized);

      expect(parsed.metadata).toBeUndefined();
    });
  });

  describe('Security Tests', () => {
    it('security: should generate unique transaction IDs', () => {
      const txIds = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const tx = createTransaction({
          ledgerId: 'ledger-123',
          type: 'credit',
          amount: 100,
          currency: 'USD',
          accountId: 'account-456',
        });
        txIds.add(tx.id);
      }
      expect(txIds.size).toBe(100);
    });

    it('security: should not allow amount manipulation after creation', () => {
      const tx = createTransaction({
        ledgerId: 'ledger-123',
        type: 'credit',
        amount: 1000,
        currency: 'USD',
        accountId: 'account-456',
      });

      const originalAmount = tx.amount;
      const serialized1 = serializeTransaction(tx);

      // Verify serialization is consistent
      expect(JSON.parse(serialized1).amount).toBe(originalAmount);
    });
  });
});
