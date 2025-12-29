// ==========================================================================
// MERKLE TREE TESTS
// Comprehensive tests for cryptographic data integrity
// Essential for audit trail immutability in banking applications
// ==========================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import * as crypto from 'crypto';

// Merkle Tree implementation for testing
class MerkleTree {
  private leaves: Buffer[] = [];
  private layers: Buffer[][] = [];

  constructor(data: (string | Buffer)[] = []) {
    if (data.length > 0) {
      this.leaves = data.map(d => this.hash(d));
      this.buildTree();
    }
  }

  private hash(data: string | Buffer): Buffer {
    return crypto.createHash('sha256').update(data).digest();
  }

  private hashPair(left: Buffer, right: Buffer): Buffer {
    const combined = Buffer.concat([left, right]);
    return this.hash(combined);
  }

  private buildTree(): void {
    if (this.leaves.length === 0) return;

    this.layers = [this.leaves];
    let currentLayer = this.leaves;

    while (currentLayer.length > 1) {
      const nextLayer: Buffer[] = [];

      for (let i = 0; i < currentLayer.length; i += 2) {
        const left = currentLayer[i];
        const right = currentLayer[i + 1] || left; // Duplicate last if odd
        nextLayer.push(this.hashPair(left, right));
      }

      this.layers.push(nextLayer);
      currentLayer = nextLayer;
    }
  }

  getRoot(): Buffer | null {
    if (this.layers.length === 0) return null;
    return this.layers[this.layers.length - 1][0];
  }

  getRootHex(): string | null {
    const root = this.getRoot();
    return root ? root.toString('hex') : null;
  }

  getProof(index: number): { hash: Buffer; position: 'left' | 'right' }[] {
    if (index < 0 || index >= this.leaves.length) {
      throw new Error('Index out of bounds');
    }

    const proof: { hash: Buffer; position: 'left' | 'right' }[] = [];
    let currentIndex = index;

    for (let i = 0; i < this.layers.length - 1; i++) {
      const layer = this.layers[i];
      const isLeft = currentIndex % 2 === 0;
      const siblingIndex = isLeft ? currentIndex + 1 : currentIndex - 1;

      if (siblingIndex < layer.length) {
        proof.push({
          hash: layer[siblingIndex],
          position: isLeft ? 'right' : 'left',
        });
      } else {
        // Duplicate handling for odd number of nodes
        proof.push({
          hash: layer[currentIndex],
          position: 'right',
        });
      }

      currentIndex = Math.floor(currentIndex / 2);
    }

    return proof;
  }

  verify(data: string | Buffer, proof: { hash: Buffer; position: 'left' | 'right' }[], root: Buffer): boolean {
    let currentHash = this.hash(data);

    for (const { hash, position } of proof) {
      if (position === 'left') {
        currentHash = this.hashPair(hash, currentHash);
      } else {
        currentHash = this.hashPair(currentHash, hash);
      }
    }

    return currentHash.equals(root);
  }

  addLeaf(data: string | Buffer): void {
    this.leaves.push(this.hash(data));
    this.buildTree();
  }

  getLeafCount(): number {
    return this.leaves.length;
  }

  getDepth(): number {
    return this.layers.length;
  }
}

// Incremental Merkle Tree for append-only audit logs
class IncrementalMerkleTree {
  private maxDepth: number;
  private leaves: Buffer[] = [];
  private zeroHashes: Buffer[];

  constructor(maxDepth: number = 32) {
    this.maxDepth = maxDepth;
    this.zeroHashes = this.computeZeroHashes();
  }

  private hash(data: Buffer | string): Buffer {
    return crypto.createHash('sha256').update(data).digest();
  }

  private computeZeroHashes(): Buffer[] {
    const zeros: Buffer[] = [Buffer.alloc(32, 0)];

    for (let i = 1; i <= this.maxDepth; i++) {
      zeros.push(this.hash(Buffer.concat([zeros[i - 1], zeros[i - 1]])));
    }

    return zeros;
  }

  append(data: string | Buffer): number {
    const index = this.leaves.length;
    this.leaves.push(this.hash(typeof data === 'string' ? Buffer.from(data) : data));
    return index;
  }

  getRoot(): Buffer {
    if (this.leaves.length === 0) {
      return this.zeroHashes[this.maxDepth];
    }

    let currentLevel = [...this.leaves];

    for (let depth = 0; depth < this.maxDepth; depth++) {
      const nextLevel: Buffer[] = [];
      const zeroHash = this.zeroHashes[depth];

      for (let i = 0; i < Math.ceil(currentLevel.length / 2); i++) {
        const left = currentLevel[i * 2] || zeroHash;
        const right = currentLevel[i * 2 + 1] || zeroHash;
        nextLevel.push(this.hash(Buffer.concat([left, right])));
      }

      if (nextLevel.length === 0) {
        nextLevel.push(this.zeroHashes[depth + 1]);
      }

      currentLevel = nextLevel;
    }

    return currentLevel[0];
  }

  getConsistencyProof(oldSize: number, newSize: number): Buffer[] {
    // Simplified consistency proof
    const proof: Buffer[] = [];
    // In production, implement RFC 6962 consistency proof
    return proof;
  }
}

describe('Merkle Tree', () => {
  describe('Basic operations', () => {
    it('should create empty tree', () => {
      const tree = new MerkleTree();
      expect(tree.getRoot()).toBeNull();
      expect(tree.getLeafCount()).toBe(0);
    });

    it('should create tree with single leaf', () => {
      const tree = new MerkleTree(['transaction-1']);
      expect(tree.getRoot()).not.toBeNull();
      expect(tree.getLeafCount()).toBe(1);
      expect(tree.getDepth()).toBe(1);
    });

    it('should create tree with multiple leaves', () => {
      const data = ['tx-1', 'tx-2', 'tx-3', 'tx-4'];
      const tree = new MerkleTree(data);
      expect(tree.getLeafCount()).toBe(4);
      expect(tree.getDepth()).toBe(3); // log2(4) + 1
    });

    it('should handle odd number of leaves', () => {
      const tree = new MerkleTree(['tx-1', 'tx-2', 'tx-3']);
      expect(tree.getLeafCount()).toBe(3);
      expect(tree.getRoot()).not.toBeNull();
    });
  });

  describe('Root consistency', () => {
    it('should produce same root for same data', () => {
      const data = ['ledger-entry-1', 'ledger-entry-2', 'ledger-entry-3'];
      const tree1 = new MerkleTree(data);
      const tree2 = new MerkleTree(data);
      expect(tree1.getRootHex()).toBe(tree2.getRootHex());
    });

    it('should produce different root for different data', () => {
      const tree1 = new MerkleTree(['data-1', 'data-2']);
      const tree2 = new MerkleTree(['data-1', 'data-3']);
      expect(tree1.getRootHex()).not.toBe(tree2.getRootHex());
    });

    it('should produce different root for different order', () => {
      const tree1 = new MerkleTree(['data-1', 'data-2']);
      const tree2 = new MerkleTree(['data-2', 'data-1']);
      expect(tree1.getRootHex()).not.toBe(tree2.getRootHex());
    });

    it('should produce deterministic roots', () => {
      const data = Array.from({ length: 100 }, (_, i) => `entry-${i}`);
      const roots: string[] = [];

      for (let i = 0; i < 10; i++) {
        const tree = new MerkleTree(data);
        roots.push(tree.getRootHex()!);
      }

      // All roots should be identical
      expect(new Set(roots).size).toBe(1);
    });
  });

  describe('Proof generation and verification', () => {
    let tree: MerkleTree;
    const data = ['entry-0', 'entry-1', 'entry-2', 'entry-3', 'entry-4', 'entry-5', 'entry-6', 'entry-7'];

    beforeEach(() => {
      tree = new MerkleTree(data);
    });

    it('should generate valid proof for each leaf', () => {
      const root = tree.getRoot()!;

      for (let i = 0; i < data.length; i++) {
        const proof = tree.getProof(i);
        expect(tree.verify(data[i], proof, root)).toBe(true);
      }
    });

    it('should reject proof for modified data', () => {
      const root = tree.getRoot()!;
      const proof = tree.getProof(0);

      // Try to verify different data with same proof
      expect(tree.verify('modified-entry', proof, root)).toBe(false);
    });

    it('should reject proof for wrong index', () => {
      const root = tree.getRoot()!;
      const proof = tree.getProof(0);

      // Try to verify data[1] with proof for data[0]
      expect(tree.verify(data[1], proof, root)).toBe(false);
    });

    it('should reject proof with tampered hash', () => {
      const root = tree.getRoot()!;
      const proof = tree.getProof(0);

      // Tamper with proof
      if (proof.length > 0) {
        proof[0].hash = crypto.randomBytes(32);
      }

      expect(tree.verify(data[0], proof, root)).toBe(false);
    });

    it('should reject proof with wrong root', () => {
      const wrongRoot = crypto.randomBytes(32);
      const proof = tree.getProof(0);

      expect(tree.verify(data[0], proof, wrongRoot)).toBe(false);
    });

    it('should throw for invalid index', () => {
      expect(() => tree.getProof(-1)).toThrow('Index out of bounds');
      expect(() => tree.getProof(100)).toThrow('Index out of bounds');
    });
  });

  describe('Large tree performance', () => {
    it('should handle 1000 entries efficiently', () => {
      const data = Array.from({ length: 1000 }, (_, i) => `ledger-entry-${i}`);

      const start = Date.now();
      const tree = new MerkleTree(data);
      const buildTime = Date.now() - start;

      expect(buildTime).toBeLessThan(1000); // Should build in under 1 second
      expect(tree.getRoot()).not.toBeNull();
      expect(tree.getLeafCount()).toBe(1000);
    });

    it('should generate proof for any leaf in large tree', () => {
      const data = Array.from({ length: 1000 }, (_, i) => `entry-${i}`);
      const tree = new MerkleTree(data);
      const root = tree.getRoot()!;

      // Test random indices
      const testIndices = [0, 499, 999, 123, 876];
      for (const idx of testIndices) {
        const proof = tree.getProof(idx);
        expect(tree.verify(data[idx], proof, root)).toBe(true);
      }
    });

    it('should have logarithmic proof size', () => {
      const sizes = [8, 64, 512, 1024];

      for (const size of sizes) {
        const data = Array.from({ length: size }, (_, i) => `entry-${i}`);
        const tree = new MerkleTree(data);
        const proof = tree.getProof(0);

        // Proof size should be approximately log2(size)
        const expectedProofSize = Math.ceil(Math.log2(size));
        expect(proof.length).toBeLessThanOrEqual(expectedProofSize);
      }
    });
  });

  describe('Dynamic tree operations', () => {
    it('should add leaves incrementally', () => {
      const tree = new MerkleTree();

      tree.addLeaf('entry-1');
      const root1 = tree.getRootHex();

      tree.addLeaf('entry-2');
      const root2 = tree.getRootHex();

      expect(root1).not.toBe(root2);
      expect(tree.getLeafCount()).toBe(2);
    });

    it('should produce same root regardless of construction method', () => {
      const data = ['a', 'b', 'c', 'd'];

      // Build all at once
      const tree1 = new MerkleTree(data);

      // Build incrementally
      const tree2 = new MerkleTree();
      data.forEach(d => tree2.addLeaf(d));

      expect(tree1.getRootHex()).toBe(tree2.getRootHex());
    });
  });

  describe('Edge cases', () => {
    it('should handle empty strings', () => {
      const tree = new MerkleTree(['', 'data', '']);
      expect(tree.getRoot()).not.toBeNull();
    });

    it('should handle binary data', () => {
      const data = [
        Buffer.from([0x00, 0x01, 0x02]),
        Buffer.from([0xff, 0xfe, 0xfd]),
      ];
      const tree = new MerkleTree(data);
      expect(tree.getRoot()).not.toBeNull();
    });

    it('should handle very long strings', () => {
      const longString = 'x'.repeat(1000000);
      const tree = new MerkleTree([longString, 'short']);
      expect(tree.getRoot()).not.toBeNull();
    });

    it('should handle unicode strings', () => {
      const tree = new MerkleTree(['日本語', 'العربية', '🔐🔒🔓']);
      expect(tree.getRoot()).not.toBeNull();
    });
  });
});

describe('Incremental Merkle Tree', () => {
  describe('Basic operations', () => {
    it('should start with zero root', () => {
      const tree = new IncrementalMerkleTree();
      const root = tree.getRoot();
      expect(root).not.toBeNull();
      expect(root.length).toBe(32);
    });

    it('should change root on append', () => {
      const tree = new IncrementalMerkleTree();
      const root1 = tree.getRoot().toString('hex');

      tree.append('entry-1');
      const root2 = tree.getRoot().toString('hex');

      expect(root1).not.toBe(root2);
    });

    it('should return correct index on append', () => {
      const tree = new IncrementalMerkleTree();

      expect(tree.append('entry-0')).toBe(0);
      expect(tree.append('entry-1')).toBe(1);
      expect(tree.append('entry-2')).toBe(2);
    });
  });

  describe('Append-only property', () => {
    it('should produce consistent roots for same sequence', () => {
      const tree1 = new IncrementalMerkleTree();
      const tree2 = new IncrementalMerkleTree();

      const entries = ['tx-1', 'tx-2', 'tx-3'];

      for (const entry of entries) {
        tree1.append(entry);
        tree2.append(entry);
      }

      expect(tree1.getRoot().toString('hex')).toBe(tree2.getRoot().toString('hex'));
    });

    it('should have different roots for different sequences', () => {
      const tree1 = new IncrementalMerkleTree();
      const tree2 = new IncrementalMerkleTree();

      tree1.append('tx-1');
      tree1.append('tx-2');

      tree2.append('tx-2');
      tree2.append('tx-1');

      expect(tree1.getRoot().toString('hex')).not.toBe(tree2.getRoot().toString('hex'));
    });
  });

  describe('Audit trail simulation', () => {
    it('should track transaction history', () => {
      const auditLog = new IncrementalMerkleTree();
      const snapshots: string[] = [];

      // Simulate 100 audit events
      for (let i = 0; i < 100; i++) {
        const event = JSON.stringify({
          timestamp: Date.now(),
          userId: `user-${i % 10}`,
          action: 'LEDGER_UPDATE',
          details: `Transaction ${i}`,
        });

        auditLog.append(event);
        snapshots.push(auditLog.getRoot().toString('hex'));
      }

      // All snapshots should be unique
      expect(new Set(snapshots).size).toBe(100);
    });

    it('should handle high-frequency appends', () => {
      const tree = new IncrementalMerkleTree();

      const start = Date.now();
      for (let i = 0; i < 10000; i++) {
        tree.append(`entry-${i}`);
      }
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
    });
  });
});

describe('Cryptographic Hash Properties', () => {
  const hash = (data: string): string => {
    return crypto.createHash('sha256').update(data).digest('hex');
  };

  describe('Determinism', () => {
    it('should produce same hash for same input', () => {
      const data = 'test-data';
      const hash1 = hash(data);
      const hash2 = hash(data);
      expect(hash1).toBe(hash2);
    });

    it('should be deterministic across multiple calls', () => {
      const data = 'consistent-data';
      const hashes = Array.from({ length: 1000 }, () => hash(data));
      expect(new Set(hashes).size).toBe(1);
    });
  });

  describe('Collision resistance', () => {
    it('should produce different hashes for different inputs', () => {
      const hash1 = hash('input-1');
      const hash2 = hash('input-2');
      expect(hash1).not.toBe(hash2);
    });

    it('should be sensitive to small changes', () => {
      const hash1 = hash('hello');
      const hash2 = hash('Hello');
      const hash3 = hash('hello ');
      const hash4 = hash('hello1');

      const hashes = [hash1, hash2, hash3, hash4];
      expect(new Set(hashes).size).toBe(4);
    });

    it('should produce different hashes for similar financial data', () => {
      const tx1 = hash(JSON.stringify({ amount: 1000.00, currency: 'USD' }));
      const tx2 = hash(JSON.stringify({ amount: 1000.01, currency: 'USD' }));
      expect(tx1).not.toBe(tx2);
    });
  });

  describe('Avalanche effect', () => {
    it('should change approximately half of bits for small input change', () => {
      const hash1 = hash('test');
      const hash2 = hash('test1');

      // Convert to binary and count different bits
      const bits1 = BigInt('0x' + hash1).toString(2).padStart(256, '0');
      const bits2 = BigInt('0x' + hash2).toString(2).padStart(256, '0');

      let differentBits = 0;
      for (let i = 0; i < bits1.length; i++) {
        if (bits1[i] !== bits2[i]) differentBits++;
      }

      // Should change roughly 50% of bits (allowing 30-70% range)
      const changePercentage = differentBits / 256;
      expect(changePercentage).toBeGreaterThan(0.30);
      expect(changePercentage).toBeLessThan(0.70);
    });
  });

  describe('Pre-image resistance', () => {
    it('should have fixed output length regardless of input', () => {
      const shortInput = hash('a');
      const longInput = hash('a'.repeat(10000));

      expect(shortInput.length).toBe(64); // 256 bits = 64 hex chars
      expect(longInput.length).toBe(64);
    });
  });

  describe('Financial data integrity', () => {
    interface LedgerEntry {
      id: string;
      timestamp: string;
      amount: number;
      currency: string;
      debitAccount: string;
      creditAccount: string;
      description: string;
    }

    const hashLedgerEntry = (entry: LedgerEntry): string => {
      // Canonical JSON serialization for consistent hashing
      const canonical = JSON.stringify(entry, Object.keys(entry).sort());
      return hash(canonical);
    };

    it('should detect any modification to ledger entry', () => {
      const entry: LedgerEntry = {
        id: 'TXN-2024-001',
        timestamp: '2024-12-28T10:00:00Z',
        amount: 1000000,
        currency: 'USD',
        debitAccount: '1000-00',
        creditAccount: '2000-00',
        description: 'Q4 Revenue',
      };

      const originalHash = hashLedgerEntry(entry);

      // Test modification of each field
      const modifiedAmount = { ...entry, amount: 1000001 };
      const modifiedTimestamp = { ...entry, timestamp: '2024-12-28T10:00:01Z' };
      const modifiedAccount = { ...entry, debitAccount: '1000-01' };

      expect(hashLedgerEntry(modifiedAmount)).not.toBe(originalHash);
      expect(hashLedgerEntry(modifiedTimestamp)).not.toBe(originalHash);
      expect(hashLedgerEntry(modifiedAccount)).not.toBe(originalHash);
    });

    it('should produce same hash for semantically identical entries', () => {
      const entry1: LedgerEntry = {
        id: 'TXN-001',
        timestamp: '2024-12-28T10:00:00Z',
        amount: 1000,
        currency: 'USD',
        debitAccount: '1000',
        creditAccount: '2000',
        description: 'Test',
      };

      // Same data, potentially different property order in source
      const entry2: LedgerEntry = {
        amount: 1000,
        currency: 'USD',
        debitAccount: '1000',
        creditAccount: '2000',
        description: 'Test',
        id: 'TXN-001',
        timestamp: '2024-12-28T10:00:00Z',
      };

      // With canonical serialization, order shouldn't matter
      expect(hashLedgerEntry(entry1)).toBe(hashLedgerEntry(entry2));
    });
  });
});

describe('Proof of Existence', () => {
  interface TimestampedProof {
    dataHash: string;
    timestamp: Date;
    merkleRoot: string;
    proof: { hash: Buffer; position: 'left' | 'right' }[];
  }

  class ProofOfExistence {
    private tree: MerkleTree;
    private dataMap: Map<string, number> = new Map();
    private timestamps: Map<string, Date> = new Map();

    constructor() {
      this.tree = new MerkleTree();
    }

    addDocument(data: string | Buffer): string {
      const dataHash = crypto.createHash('sha256').update(data).digest('hex');
      const index = this.tree.getLeafCount();

      this.tree.addLeaf(data);
      this.dataMap.set(dataHash, index);
      this.timestamps.set(dataHash, new Date());

      return dataHash;
    }

    getProof(dataHash: string): TimestampedProof | null {
      const index = this.dataMap.get(dataHash);
      if (index === undefined) return null;

      return {
        dataHash,
        timestamp: this.timestamps.get(dataHash)!,
        merkleRoot: this.tree.getRootHex()!,
        proof: this.tree.getProof(index),
      };
    }

    verify(data: string | Buffer, proof: TimestampedProof): boolean {
      const dataHash = crypto.createHash('sha256').update(data).digest('hex');
      if (dataHash !== proof.dataHash) return false;

      return this.tree.verify(data, proof.proof, Buffer.from(proof.merkleRoot, 'hex'));
    }
  }

  describe('Document timestamping', () => {
    let poe: ProofOfExistence;

    beforeEach(() => {
      poe = new ProofOfExistence();
    });

    it('should generate proof for document', () => {
      const doc = 'Financial Statement Q4 2024';
      const hash = poe.addDocument(doc);

      expect(hash).toHaveLength(64);

      const proof = poe.getProof(hash);
      expect(proof).not.toBeNull();
      expect(proof?.dataHash).toBe(hash);
      expect(proof?.timestamp).toBeInstanceOf(Date);
    });

    it('should verify document existence', () => {
      const doc = 'Audit Report 2024';
      const hash = poe.addDocument(doc);
      const proof = poe.getProof(hash)!;

      expect(poe.verify(doc, proof)).toBe(true);
    });

    it('should reject modified document', () => {
      const originalDoc = 'Original Content';
      const modifiedDoc = 'Modified Content';

      const hash = poe.addDocument(originalDoc);
      const proof = poe.getProof(hash)!;

      expect(poe.verify(modifiedDoc, proof)).toBe(false);
    });

    it('should handle multiple documents', () => {
      const docs = [
        'Balance Sheet',
        'Income Statement',
        'Cash Flow Statement',
        'Statement of Changes in Equity',
      ];

      const hashes = docs.map(doc => poe.addDocument(doc));

      for (let i = 0; i < docs.length; i++) {
        const proof = poe.getProof(hashes[i])!;
        expect(poe.verify(docs[i], proof)).toBe(true);
      }
    });
  });
});
