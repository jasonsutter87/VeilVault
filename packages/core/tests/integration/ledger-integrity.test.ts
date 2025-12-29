import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as crypto from 'crypto';

/**
 * Ledger Integrity Integration Tests
 *
 * Comprehensive tests for cryptographic ledger integrity,
 * transaction verification, and proof generation.
 */

interface LedgerEntry {
  id: string;
  timestamp: Date;
  type: 'debit' | 'credit' | 'adjustment';
  amount: number;
  currency: string;
  accountId: string;
  description: string;
  reference: string;
  metadata: Record<string, unknown>;
  hash: string;
  previousHash: string;
  signature: string;
}

interface LedgerVerificationResult {
  valid: boolean;
  entriesVerified: number;
  errorsFound: Array<{
    entryId: string;
    errorType: 'hash_mismatch' | 'chain_broken' | 'signature_invalid' | 'timestamp_invalid';
    message: string;
  }>;
}

interface InclusionProof {
  entryHash: string;
  path: Array<{ hash: string; position: 'left' | 'right' }>;
  rootHash: string;
}

class ImmutableLedger {
  private entries: LedgerEntry[] = [];
  private secretKey: Buffer;
  private merkleRoot: string = '';

  constructor(secretKey?: Buffer) {
    this.secretKey = secretKey || crypto.randomBytes(32);
  }

  private computeHash(entry: Omit<LedgerEntry, 'hash' | 'signature'>): string {
    const data = JSON.stringify({
      id: entry.id,
      timestamp: entry.timestamp.toISOString(),
      type: entry.type,
      amount: entry.amount,
      currency: entry.currency,
      accountId: entry.accountId,
      description: entry.description,
      reference: entry.reference,
      metadata: entry.metadata,
      previousHash: entry.previousHash,
    });
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private sign(hash: string): string {
    return crypto.createHmac('sha512', this.secretKey).update(hash).digest('hex');
  }

  private verifySignature(hash: string, signature: string): boolean {
    const expected = this.sign(hash);
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
  }

  append(data: Omit<LedgerEntry, 'id' | 'hash' | 'previousHash' | 'signature'>): LedgerEntry {
    const previousHash = this.entries.length > 0
      ? this.entries[this.entries.length - 1].hash
      : '0'.repeat(64);

    const entryWithoutHashAndSig = {
      ...data,
      id: crypto.randomUUID(),
      previousHash,
    };

    const hash = this.computeHash(entryWithoutHashAndSig);
    const signature = this.sign(hash);

    const entry: LedgerEntry = {
      ...entryWithoutHashAndSig,
      hash,
      signature,
    };

    this.entries.push(entry);
    this.updateMerkleRoot();

    return entry;
  }

  getEntry(id: string): LedgerEntry | undefined {
    return this.entries.find(e => e.id === id);
  }

  getEntries(): LedgerEntry[] {
    return [...this.entries];
  }

  getEntriesForAccount(accountId: string): LedgerEntry[] {
    return this.entries.filter(e => e.accountId === accountId);
  }

  getEntriesByDateRange(start: Date, end: Date): LedgerEntry[] {
    return this.entries.filter(e => e.timestamp >= start && e.timestamp <= end);
  }

  getAccountBalance(accountId: string): number {
    return this.entries
      .filter(e => e.accountId === accountId)
      .reduce((balance, entry) => {
        if (entry.type === 'credit') return balance + entry.amount;
        if (entry.type === 'debit') return balance - entry.amount;
        return balance + entry.amount; // adjustment can be positive or negative
      }, 0);
  }

  verifyChain(): LedgerVerificationResult {
    const errorsFound: LedgerVerificationResult['errorsFound'] = [];

    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];

      // Verify hash
      const expectedHash = this.computeHash({
        id: entry.id,
        timestamp: entry.timestamp,
        type: entry.type,
        amount: entry.amount,
        currency: entry.currency,
        accountId: entry.accountId,
        description: entry.description,
        reference: entry.reference,
        metadata: entry.metadata,
        previousHash: entry.previousHash,
      });

      if (entry.hash !== expectedHash) {
        errorsFound.push({
          entryId: entry.id,
          errorType: 'hash_mismatch',
          message: 'Entry hash does not match computed hash',
        });
      }

      // Verify chain link
      if (i === 0) {
        if (entry.previousHash !== '0'.repeat(64)) {
          errorsFound.push({
            entryId: entry.id,
            errorType: 'chain_broken',
            message: 'Genesis entry has invalid previous hash',
          });
        }
      } else {
        if (entry.previousHash !== this.entries[i - 1].hash) {
          errorsFound.push({
            entryId: entry.id,
            errorType: 'chain_broken',
            message: 'Previous hash does not match prior entry',
          });
        }
      }

      // Verify signature
      if (!this.verifySignature(entry.hash, entry.signature)) {
        errorsFound.push({
          entryId: entry.id,
          errorType: 'signature_invalid',
          message: 'Signature verification failed',
        });
      }

      // Verify timestamp ordering
      if (i > 0 && entry.timestamp < this.entries[i - 1].timestamp) {
        errorsFound.push({
          entryId: entry.id,
          errorType: 'timestamp_invalid',
          message: 'Entry timestamp is before previous entry',
        });
      }
    }

    return {
      valid: errorsFound.length === 0,
      entriesVerified: this.entries.length,
      errorsFound,
    };
  }

  // Merkle tree operations
  private updateMerkleRoot(): void {
    if (this.entries.length === 0) {
      this.merkleRoot = '';
      return;
    }

    let hashes = this.entries.map(e => e.hash);

    while (hashes.length > 1) {
      const newLevel: string[] = [];
      for (let i = 0; i < hashes.length; i += 2) {
        const left = hashes[i];
        const right = hashes[i + 1] || left; // Duplicate last if odd
        const combined = crypto.createHash('sha256')
          .update(left + right)
          .digest('hex');
        newLevel.push(combined);
      }
      hashes = newLevel;
    }

    this.merkleRoot = hashes[0];
  }

  getMerkleRoot(): string {
    return this.merkleRoot;
  }

  generateInclusionProof(entryId: string): InclusionProof | null {
    const index = this.entries.findIndex(e => e.id === entryId);
    if (index === -1) return null;

    const path: InclusionProof['path'] = [];
    let hashes = this.entries.map(e => e.hash);
    let currentIndex = index;

    while (hashes.length > 1) {
      const siblingIndex = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;
      const siblingHash = hashes[siblingIndex] || hashes[currentIndex];
      const position = currentIndex % 2 === 0 ? 'right' : 'left';

      path.push({ hash: siblingHash, position });

      const newLevel: string[] = [];
      for (let i = 0; i < hashes.length; i += 2) {
        const left = hashes[i];
        const right = hashes[i + 1] || left;
        const combined = crypto.createHash('sha256')
          .update(left + right)
          .digest('hex');
        newLevel.push(combined);
      }

      hashes = newLevel;
      currentIndex = Math.floor(currentIndex / 2);
    }

    return {
      entryHash: this.entries[index].hash,
      path,
      rootHash: this.merkleRoot,
    };
  }

  verifyInclusionProof(proof: InclusionProof): boolean {
    let currentHash = proof.entryHash;

    for (const step of proof.path) {
      const left = step.position === 'left' ? step.hash : currentHash;
      const right = step.position === 'left' ? currentHash : step.hash;
      currentHash = crypto.createHash('sha256')
        .update(left + right)
        .digest('hex');
    }

    return currentHash === proof.rootHash;
  }

  // Tamper attempt methods for testing
  _unsafeTamper(entryId: string, changes: Partial<LedgerEntry>): void {
    const index = this.entries.findIndex(e => e.id === entryId);
    if (index !== -1) {
      this.entries[index] = { ...this.entries[index], ...changes };
    }
  }

  _unsafeDelete(entryId: string): void {
    const index = this.entries.findIndex(e => e.id === entryId);
    if (index !== -1) {
      this.entries.splice(index, 1);
    }
  }

  _unsafeInsert(entry: LedgerEntry, position: number): void {
    this.entries.splice(position, 0, entry);
  }
}

describe('Immutable Ledger', () => {
  let ledger: ImmutableLedger;

  beforeEach(() => {
    ledger = new ImmutableLedger();
  });

  describe('Entry Creation', () => {
    it('should create entry with unique ID', () => {
      const entry = ledger.append({
        timestamp: new Date(),
        type: 'credit',
        amount: 1000,
        currency: 'USD',
        accountId: 'acc-123',
        description: 'Deposit',
        reference: 'DEP-001',
        metadata: {},
      });

      expect(entry.id).toBeDefined();
      expect(entry.id.length).toBeGreaterThan(0);
    });

    it('should compute hash for entry', () => {
      const entry = ledger.append({
        timestamp: new Date(),
        type: 'credit',
        amount: 1000,
        currency: 'USD',
        accountId: 'acc-123',
        description: 'Test',
        reference: 'REF-001',
        metadata: {},
      });

      expect(entry.hash).toBeDefined();
      expect(entry.hash.length).toBe(64); // SHA-256 hex
    });

    it('should sign entry', () => {
      const entry = ledger.append({
        timestamp: new Date(),
        type: 'credit',
        amount: 1000,
        currency: 'USD',
        accountId: 'acc-123',
        description: 'Test',
        reference: 'REF-001',
        metadata: {},
      });

      expect(entry.signature).toBeDefined();
      expect(entry.signature.length).toBe(128); // SHA-512 hex
    });

    it('should link to previous entry', () => {
      const entry1 = ledger.append({
        timestamp: new Date(),
        type: 'credit',
        amount: 1000,
        currency: 'USD',
        accountId: 'acc-123',
        description: 'First',
        reference: 'REF-001',
        metadata: {},
      });

      const entry2 = ledger.append({
        timestamp: new Date(),
        type: 'debit',
        amount: 500,
        currency: 'USD',
        accountId: 'acc-123',
        description: 'Second',
        reference: 'REF-002',
        metadata: {},
      });

      expect(entry2.previousHash).toBe(entry1.hash);
    });

    it('should set genesis block previous hash to zeros', () => {
      const entry = ledger.append({
        timestamp: new Date(),
        type: 'credit',
        amount: 1000,
        currency: 'USD',
        accountId: 'acc-123',
        description: 'Genesis',
        reference: 'GEN-001',
        metadata: {},
      });

      expect(entry.previousHash).toBe('0'.repeat(64));
    });
  });

  describe('Entry Retrieval', () => {
    beforeEach(() => {
      for (let i = 0; i < 10; i++) {
        ledger.append({
          timestamp: new Date(Date.now() + i * 1000),
          type: i % 2 === 0 ? 'credit' : 'debit',
          amount: 100 * (i + 1),
          currency: 'USD',
          accountId: `acc-${i % 3}`,
          description: `Transaction ${i}`,
          reference: `REF-${i}`,
          metadata: { index: i },
        });
      }
    });

    it('should get entry by ID', () => {
      const entries = ledger.getEntries();
      const entry = ledger.getEntry(entries[0].id);

      expect(entry).toBeDefined();
      expect(entry?.description).toBe('Transaction 0');
    });

    it('should return undefined for non-existent entry', () => {
      const entry = ledger.getEntry('non-existent');
      expect(entry).toBeUndefined();
    });

    it('should get entries for account', () => {
      const accountEntries = ledger.getEntriesForAccount('acc-0');

      expect(accountEntries.length).toBe(4); // 0, 3, 6, 9
      expect(accountEntries.every(e => e.accountId === 'acc-0')).toBe(true);
    });

    it('should get entries by date range', () => {
      const entries = ledger.getEntries();
      const start = entries[2].timestamp;
      const end = entries[5].timestamp;

      const rangeEntries = ledger.getEntriesByDateRange(start, end);

      expect(rangeEntries.length).toBe(4); // 2, 3, 4, 5
    });
  });

  describe('Account Balance', () => {
    it('should calculate balance from credits and debits', () => {
      ledger.append({
        timestamp: new Date(),
        type: 'credit',
        amount: 1000,
        currency: 'USD',
        accountId: 'acc-1',
        description: 'Deposit',
        reference: 'REF-1',
        metadata: {},
      });

      ledger.append({
        timestamp: new Date(),
        type: 'debit',
        amount: 300,
        currency: 'USD',
        accountId: 'acc-1',
        description: 'Withdrawal',
        reference: 'REF-2',
        metadata: {},
      });

      ledger.append({
        timestamp: new Date(),
        type: 'credit',
        amount: 500,
        currency: 'USD',
        accountId: 'acc-1',
        description: 'Transfer in',
        reference: 'REF-3',
        metadata: {},
      });

      const balance = ledger.getAccountBalance('acc-1');
      expect(balance).toBe(1200); // 1000 - 300 + 500
    });

    it('should handle adjustments', () => {
      ledger.append({
        timestamp: new Date(),
        type: 'credit',
        amount: 1000,
        currency: 'USD',
        accountId: 'acc-1',
        description: 'Deposit',
        reference: 'REF-1',
        metadata: {},
      });

      ledger.append({
        timestamp: new Date(),
        type: 'adjustment',
        amount: -50,
        currency: 'USD',
        accountId: 'acc-1',
        description: 'Fee adjustment',
        reference: 'REF-2',
        metadata: {},
      });

      const balance = ledger.getAccountBalance('acc-1');
      expect(balance).toBe(950);
    });

    it('should return zero for account with no entries', () => {
      const balance = ledger.getAccountBalance('non-existent');
      expect(balance).toBe(0);
    });
  });

  describe('Chain Verification', () => {
    it('should verify valid chain', () => {
      for (let i = 0; i < 100; i++) {
        ledger.append({
          timestamp: new Date(Date.now() + i),
          type: 'credit',
          amount: 100,
          currency: 'USD',
          accountId: 'acc-1',
          description: `Entry ${i}`,
          reference: `REF-${i}`,
          metadata: {},
        });
      }

      const result = ledger.verifyChain();

      expect(result.valid).toBe(true);
      expect(result.entriesVerified).toBe(100);
      expect(result.errorsFound.length).toBe(0);
    });

    it('should detect hash tampering', () => {
      ledger.append({
        timestamp: new Date(),
        type: 'credit',
        amount: 1000,
        currency: 'USD',
        accountId: 'acc-1',
        description: 'Original',
        reference: 'REF-1',
        metadata: {},
      });

      const entries = ledger.getEntries();
      ledger._unsafeTamper(entries[0].id, { hash: 'tampered-hash' });

      const result = ledger.verifyChain();

      expect(result.valid).toBe(false);
      expect(result.errorsFound.some(e => e.errorType === 'hash_mismatch')).toBe(true);
    });

    it('should detect amount tampering', () => {
      ledger.append({
        timestamp: new Date(),
        type: 'credit',
        amount: 1000,
        currency: 'USD',
        accountId: 'acc-1',
        description: 'Original',
        reference: 'REF-1',
        metadata: {},
      });

      const entries = ledger.getEntries();
      ledger._unsafeTamper(entries[0].id, { amount: 999999 });

      const result = ledger.verifyChain();

      expect(result.valid).toBe(false);
      expect(result.errorsFound.some(e => e.errorType === 'hash_mismatch')).toBe(true);
    });

    it('should detect chain break', () => {
      ledger.append({
        timestamp: new Date(),
        type: 'credit',
        amount: 1000,
        currency: 'USD',
        accountId: 'acc-1',
        description: 'First',
        reference: 'REF-1',
        metadata: {},
      });

      ledger.append({
        timestamp: new Date(),
        type: 'credit',
        amount: 500,
        currency: 'USD',
        accountId: 'acc-1',
        description: 'Second',
        reference: 'REF-2',
        metadata: {},
      });

      const entries = ledger.getEntries();
      ledger._unsafeTamper(entries[1].id, { previousHash: 'broken-link' });

      const result = ledger.verifyChain();

      expect(result.valid).toBe(false);
      expect(result.errorsFound.some(e => e.errorType === 'chain_broken')).toBe(true);
    });

    it('should detect signature tampering', () => {
      ledger.append({
        timestamp: new Date(),
        type: 'credit',
        amount: 1000,
        currency: 'USD',
        accountId: 'acc-1',
        description: 'Original',
        reference: 'REF-1',
        metadata: {},
      });

      const entries = ledger.getEntries();
      ledger._unsafeTamper(entries[0].id, { signature: 'forged-signature' });

      const result = ledger.verifyChain();

      expect(result.valid).toBe(false);
      expect(result.errorsFound.some(e => e.errorType === 'signature_invalid')).toBe(true);
    });

    it('should detect entry deletion', () => {
      ledger.append({
        timestamp: new Date(),
        type: 'credit',
        amount: 1000,
        currency: 'USD',
        accountId: 'acc-1',
        description: 'First',
        reference: 'REF-1',
        metadata: {},
      });

      ledger.append({
        timestamp: new Date(),
        type: 'credit',
        amount: 500,
        currency: 'USD',
        accountId: 'acc-1',
        description: 'Second',
        reference: 'REF-2',
        metadata: {},
      });

      ledger.append({
        timestamp: new Date(),
        type: 'credit',
        amount: 250,
        currency: 'USD',
        accountId: 'acc-1',
        description: 'Third',
        reference: 'REF-3',
        metadata: {},
      });

      const entries = ledger.getEntries();
      ledger._unsafeDelete(entries[1].id);

      const result = ledger.verifyChain();

      expect(result.valid).toBe(false);
      expect(result.errorsFound.some(e => e.errorType === 'chain_broken')).toBe(true);
    });

    it('should detect timestamp manipulation', () => {
      ledger.append({
        timestamp: new Date('2024-01-02'),
        type: 'credit',
        amount: 1000,
        currency: 'USD',
        accountId: 'acc-1',
        description: 'First',
        reference: 'REF-1',
        metadata: {},
      });

      ledger.append({
        timestamp: new Date('2024-01-01'), // Earlier than first
        type: 'credit',
        amount: 500,
        currency: 'USD',
        accountId: 'acc-1',
        description: 'Second',
        reference: 'REF-2',
        metadata: {},
      });

      const result = ledger.verifyChain();

      expect(result.valid).toBe(false);
      expect(result.errorsFound.some(e => e.errorType === 'timestamp_invalid')).toBe(true);
    });
  });

  describe('Merkle Tree', () => {
    beforeEach(() => {
      for (let i = 0; i < 8; i++) {
        ledger.append({
          timestamp: new Date(Date.now() + i),
          type: 'credit',
          amount: 100 * (i + 1),
          currency: 'USD',
          accountId: 'acc-1',
          description: `Entry ${i}`,
          reference: `REF-${i}`,
          metadata: {},
        });
      }
    });

    it('should compute Merkle root', () => {
      const root = ledger.getMerkleRoot();

      expect(root).toBeDefined();
      expect(root.length).toBe(64); // SHA-256 hex
    });

    it('should generate inclusion proof', () => {
      const entries = ledger.getEntries();
      const proof = ledger.generateInclusionProof(entries[3].id);

      expect(proof).not.toBeNull();
      expect(proof?.entryHash).toBe(entries[3].hash);
      expect(proof?.rootHash).toBe(ledger.getMerkleRoot());
      expect(proof?.path.length).toBeGreaterThan(0);
    });

    it('should verify valid inclusion proof', () => {
      const entries = ledger.getEntries();
      const proof = ledger.generateInclusionProof(entries[3].id);

      expect(proof).not.toBeNull();
      expect(ledger.verifyInclusionProof(proof!)).toBe(true);
    });

    it('should reject invalid inclusion proof', () => {
      const entries = ledger.getEntries();
      const proof = ledger.generateInclusionProof(entries[3].id);

      expect(proof).not.toBeNull();

      // Tamper with proof
      proof!.entryHash = 'tampered-hash';

      expect(ledger.verifyInclusionProof(proof!)).toBe(false);
    });

    it('should reject proof with wrong root', () => {
      const entries = ledger.getEntries();
      const proof = ledger.generateInclusionProof(entries[3].id);

      expect(proof).not.toBeNull();

      // Wrong root
      proof!.rootHash = 'wrong-root';

      expect(ledger.verifyInclusionProof(proof!)).toBe(false);
    });

    it('should return null for non-existent entry', () => {
      const proof = ledger.generateInclusionProof('non-existent');
      expect(proof).toBeNull();
    });

    it('should update root on new entries', () => {
      const originalRoot = ledger.getMerkleRoot();

      ledger.append({
        timestamp: new Date(),
        type: 'credit',
        amount: 999,
        currency: 'USD',
        accountId: 'acc-1',
        description: 'New',
        reference: 'REF-NEW',
        metadata: {},
      });

      const newRoot = ledger.getMerkleRoot();

      expect(newRoot).not.toBe(originalRoot);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle rapid sequential appends', () => {
      for (let i = 0; i < 1000; i++) {
        ledger.append({
          timestamp: new Date(Date.now() + i),
          type: 'credit',
          amount: 100,
          currency: 'USD',
          accountId: 'acc-1',
          description: `Entry ${i}`,
          reference: `REF-${i}`,
          metadata: {},
        });
      }

      const result = ledger.verifyChain();

      expect(result.valid).toBe(true);
      expect(result.entriesVerified).toBe(1000);
    });

    it('should maintain chain integrity under load', () => {
      // Create many entries
      for (let i = 0; i < 500; i++) {
        ledger.append({
          timestamp: new Date(Date.now() + i),
          type: i % 2 === 0 ? 'credit' : 'debit',
          amount: Math.random() * 1000,
          currency: 'USD',
          accountId: `acc-${i % 10}`,
          description: `Transaction ${i}`,
          reference: `REF-${i}`,
          metadata: { batchId: Math.floor(i / 100) },
        });
      }

      const result = ledger.verifyChain();
      expect(result.valid).toBe(true);
    });
  });
});

describe('Ledger Compliance', () => {
  let ledger: ImmutableLedger;

  beforeEach(() => {
    ledger = new ImmutableLedger();
  });

  describe('Audit Trail Requirements', () => {
    it('should preserve complete transaction history', () => {
      const transactions = [
        { type: 'credit' as const, amount: 1000, description: 'Initial deposit' },
        { type: 'debit' as const, amount: 200, description: 'Withdrawal' },
        { type: 'credit' as const, amount: 500, description: 'Transfer in' },
        { type: 'debit' as const, amount: 150, description: 'Fee' },
      ];

      transactions.forEach((tx, i) => {
        ledger.append({
          timestamp: new Date(Date.now() + i * 1000),
          ...tx,
          currency: 'USD',
          accountId: 'acc-1',
          reference: `REF-${i}`,
          metadata: {},
        });
      });

      const entries = ledger.getEntries();

      expect(entries.length).toBe(4);
      expect(entries[0].description).toBe('Initial deposit');
      expect(entries[3].description).toBe('Fee');
    });

    it('should timestamp all entries', () => {
      ledger.append({
        timestamp: new Date(),
        type: 'credit',
        amount: 1000,
        currency: 'USD',
        accountId: 'acc-1',
        description: 'Test',
        reference: 'REF-1',
        metadata: {},
      });

      const entries = ledger.getEntries();
      expect(entries[0].timestamp).toBeInstanceOf(Date);
    });

    it('should link entries cryptographically', () => {
      for (let i = 0; i < 10; i++) {
        ledger.append({
          timestamp: new Date(Date.now() + i),
          type: 'credit',
          amount: 100,
          currency: 'USD',
          accountId: 'acc-1',
          description: `Entry ${i}`,
          reference: `REF-${i}`,
          metadata: {},
        });
      }

      const entries = ledger.getEntries();

      for (let i = 1; i < entries.length; i++) {
        expect(entries[i].previousHash).toBe(entries[i - 1].hash);
      }
    });
  });

  describe('Regulatory Compliance', () => {
    it('should support 7-year retention queries', () => {
      // Simulate entries from different years
      const years = [2018, 2019, 2020, 2021, 2022, 2023, 2024];
      years.forEach((year, i) => {
        ledger.append({
          timestamp: new Date(`${year}-06-15`),
          type: 'credit',
          amount: 1000 * (i + 1),
          currency: 'USD',
          accountId: 'acc-1',
          description: `Annual entry ${year}`,
          reference: `REF-${year}`,
          metadata: { year },
        });
      });

      const entries = ledger.getEntries();
      expect(entries.length).toBe(7);

      // Query specific year
      const year2020Entries = ledger.getEntriesByDateRange(
        new Date('2020-01-01'),
        new Date('2020-12-31')
      );
      expect(year2020Entries.length).toBe(1);
      expect(year2020Entries[0].metadata.year).toBe(2020);
    });

    it('should support balance reconciliation', () => {
      // Create offsetting entries
      ledger.append({
        timestamp: new Date(),
        type: 'credit',
        amount: 10000,
        currency: 'USD',
        accountId: 'asset-account',
        description: 'Asset increase',
        reference: 'JE-001-DR',
        metadata: { journalEntryId: 'JE-001' },
      });

      ledger.append({
        timestamp: new Date(),
        type: 'credit',
        amount: 10000,
        currency: 'USD',
        accountId: 'liability-account',
        description: 'Liability increase',
        reference: 'JE-001-CR',
        metadata: { journalEntryId: 'JE-001' },
      });

      const assetBalance = ledger.getAccountBalance('asset-account');
      const liabilityBalance = ledger.getAccountBalance('liability-account');

      expect(assetBalance).toBe(10000);
      expect(liabilityBalance).toBe(10000);
    });
  });
});
