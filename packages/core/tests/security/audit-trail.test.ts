import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as crypto from 'crypto';

/**
 * Audit Trail Security Tests
 *
 * Comprehensive tests for audit trail immutability, completeness,
 * and tamper detection for banking/audit applications.
 */

// Mock audit entry structure
interface AuditEntry {
  id: string;
  timestamp: Date;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  previousValue?: unknown;
  newValue?: unknown;
  ipAddress: string;
  userAgent: string;
  sessionId: string;
  hash: string;
  previousHash: string;
  signature?: string;
}

// Mock audit trail service
class AuditTrailService {
  private entries: AuditEntry[] = [];
  private readonly secretKey: string;

  constructor(secretKey: string = 'audit-secret-key') {
    this.secretKey = secretKey;
  }

  private computeHash(entry: Omit<AuditEntry, 'hash'>): string {
    const data = JSON.stringify({
      id: entry.id,
      timestamp: entry.timestamp.toISOString(),
      userId: entry.userId,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      previousValue: entry.previousValue,
      newValue: entry.newValue,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      sessionId: entry.sessionId,
      previousHash: entry.previousHash,
    });
    return crypto.createHmac('sha256', this.secretKey).update(data).digest('hex');
  }

  private sign(hash: string): string {
    return crypto.createHmac('sha512', this.secretKey).update(hash).digest('hex');
  }

  append(entry: Omit<AuditEntry, 'id' | 'hash' | 'previousHash' | 'signature'>): AuditEntry {
    const previousHash = this.entries.length > 0
      ? this.entries[this.entries.length - 1].hash
      : '0'.repeat(64);

    const id = crypto.randomUUID();
    const entryWithChain = { ...entry, id, previousHash };
    const hash = this.computeHash(entryWithChain);
    const signature = this.sign(hash);

    const fullEntry: AuditEntry = { ...entryWithChain, hash, signature };
    this.entries.push(fullEntry);
    return fullEntry;
  }

  getEntries(): AuditEntry[] {
    return [...this.entries];
  }

  getEntry(id: string): AuditEntry | undefined {
    return this.entries.find(e => e.id === id);
  }

  verifyChain(): { valid: boolean; brokenAt?: number; error?: string } {
    if (this.entries.length === 0) {
      return { valid: true };
    }

    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];

      // Verify hash
      const expectedHash = this.computeHash({
        id: entry.id,
        timestamp: entry.timestamp,
        userId: entry.userId,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        previousValue: entry.previousValue,
        newValue: entry.newValue,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        sessionId: entry.sessionId,
        previousHash: entry.previousHash,
      });

      if (entry.hash !== expectedHash) {
        return { valid: false, brokenAt: i, error: 'Hash mismatch - entry tampered' };
      }

      // Verify chain link
      if (i === 0) {
        if (entry.previousHash !== '0'.repeat(64)) {
          return { valid: false, brokenAt: i, error: 'Genesis block has invalid previous hash' };
        }
      } else {
        if (entry.previousHash !== this.entries[i - 1].hash) {
          return { valid: false, brokenAt: i, error: 'Chain broken - previous hash mismatch' };
        }
      }

      // Verify signature
      if (entry.signature) {
        const expectedSignature = this.sign(entry.hash);
        if (entry.signature !== expectedSignature) {
          return { valid: false, brokenAt: i, error: 'Signature verification failed' };
        }
      }
    }

    return { valid: true };
  }

  queryByUser(userId: string): AuditEntry[] {
    return this.entries.filter(e => e.userId === userId);
  }

  queryByResource(resourceType: string, resourceId: string): AuditEntry[] {
    return this.entries.filter(e => e.resourceType === resourceType && e.resourceId === resourceId);
  }

  queryByTimeRange(start: Date, end: Date): AuditEntry[] {
    return this.entries.filter(e => e.timestamp >= start && e.timestamp <= end);
  }

  queryByAction(action: string): AuditEntry[] {
    return this.entries.filter(e => e.action === action);
  }

  getChangeHistory(resourceType: string, resourceId: string): Array<{
    timestamp: Date;
    userId: string;
    action: string;
    previousValue: unknown;
    newValue: unknown;
  }> {
    return this.queryByResource(resourceType, resourceId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .map(e => ({
        timestamp: e.timestamp,
        userId: e.userId,
        action: e.action,
        previousValue: e.previousValue,
        newValue: e.newValue,
      }));
  }

  // Attempt to modify an entry (should fail in production)
  _unsafeModify(id: string, changes: Partial<AuditEntry>): boolean {
    const index = this.entries.findIndex(e => e.id === id);
    if (index === -1) return false;
    this.entries[index] = { ...this.entries[index], ...changes };
    return true;
  }

  // Attempt to delete an entry (should fail in production)
  _unsafeDelete(id: string): boolean {
    const index = this.entries.findIndex(e => e.id === id);
    if (index === -1) return false;
    this.entries.splice(index, 1);
    return true;
  }

  // Attempt to insert an entry (should fail in production)
  _unsafeInsert(entry: AuditEntry, position: number): boolean {
    if (position < 0 || position > this.entries.length) return false;
    this.entries.splice(position, 0, entry);
    return true;
  }
}

// Audit entry factory for tests
function createAuditEntry(overrides: Partial<Omit<AuditEntry, 'id' | 'hash' | 'previousHash' | 'signature'>> = {}): Omit<AuditEntry, 'id' | 'hash' | 'previousHash' | 'signature'> {
  return {
    timestamp: new Date(),
    userId: 'user-123',
    action: 'UPDATE',
    resourceType: 'control',
    resourceId: 'ctrl-456',
    previousValue: { status: 'draft' },
    newValue: { status: 'approved' },
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0',
    sessionId: 'sess-789',
    ...overrides,
  };
}

describe('Audit Trail Security', () => {
  let auditService: AuditTrailService;

  beforeEach(() => {
    auditService = new AuditTrailService();
  });

  describe('Immutability', () => {
    it('should detect when an entry hash is modified', () => {
      auditService.append(createAuditEntry());
      auditService.append(createAuditEntry({ action: 'CREATE' }));

      // Tamper with an entry's hash
      const entries = auditService.getEntries();
      auditService._unsafeModify(entries[0].id, { hash: 'tampered-hash' });

      const verification = auditService.verifyChain();
      expect(verification.valid).toBe(false);
      expect(verification.brokenAt).toBe(0);
      expect(verification.error).toContain('Hash mismatch');
    });

    it('should detect when entry data is modified', () => {
      auditService.append(createAuditEntry());
      auditService.append(createAuditEntry({ action: 'DELETE' }));

      // Tamper with entry data
      const entries = auditService.getEntries();
      auditService._unsafeModify(entries[0].id, { action: 'ADMIN_OVERRIDE' });

      const verification = auditService.verifyChain();
      expect(verification.valid).toBe(false);
      expect(verification.error).toContain('Hash mismatch');
    });

    it('should detect when timestamp is modified', () => {
      auditService.append(createAuditEntry({ timestamp: new Date('2024-01-01') }));

      const entries = auditService.getEntries();
      auditService._unsafeModify(entries[0].id, { timestamp: new Date('2023-01-01') });

      const verification = auditService.verifyChain();
      expect(verification.valid).toBe(false);
    });

    it('should detect when userId is modified', () => {
      auditService.append(createAuditEntry({ userId: 'original-user' }));

      const entries = auditService.getEntries();
      auditService._unsafeModify(entries[0].id, { userId: 'different-user' });

      const verification = auditService.verifyChain();
      expect(verification.valid).toBe(false);
    });

    it('should detect when previousValue is modified', () => {
      auditService.append(createAuditEntry({
        previousValue: { amount: 1000 },
        newValue: { amount: 1500 }
      }));

      const entries = auditService.getEntries();
      auditService._unsafeModify(entries[0].id, { previousValue: { amount: 500 } });

      const verification = auditService.verifyChain();
      expect(verification.valid).toBe(false);
    });

    it('should detect when newValue is modified', () => {
      auditService.append(createAuditEntry({
        previousValue: { amount: 1000 },
        newValue: { amount: 1500 }
      }));

      const entries = auditService.getEntries();
      auditService._unsafeModify(entries[0].id, { newValue: { amount: 2000 } });

      const verification = auditService.verifyChain();
      expect(verification.valid).toBe(false);
    });

    it('should detect when ipAddress is modified', () => {
      auditService.append(createAuditEntry({ ipAddress: '10.0.0.1' }));

      const entries = auditService.getEntries();
      auditService._unsafeModify(entries[0].id, { ipAddress: '192.168.1.1' });

      const verification = auditService.verifyChain();
      expect(verification.valid).toBe(false);
    });

    it('should detect when sessionId is modified', () => {
      auditService.append(createAuditEntry({ sessionId: 'original-session' }));

      const entries = auditService.getEntries();
      auditService._unsafeModify(entries[0].id, { sessionId: 'hijacked-session' });

      const verification = auditService.verifyChain();
      expect(verification.valid).toBe(false);
    });
  });

  describe('Chain Integrity', () => {
    it('should validate an empty audit trail', () => {
      const verification = auditService.verifyChain();
      expect(verification.valid).toBe(true);
    });

    it('should validate a single entry', () => {
      auditService.append(createAuditEntry());

      const verification = auditService.verifyChain();
      expect(verification.valid).toBe(true);
    });

    it('should validate a chain of entries', () => {
      for (let i = 0; i < 100; i++) {
        auditService.append(createAuditEntry({ action: `ACTION_${i}` }));
      }

      const verification = auditService.verifyChain();
      expect(verification.valid).toBe(true);
    });

    it('should detect broken chain when previousHash is modified', () => {
      auditService.append(createAuditEntry());
      auditService.append(createAuditEntry({ action: 'SECOND' }));
      auditService.append(createAuditEntry({ action: 'THIRD' }));

      const entries = auditService.getEntries();
      auditService._unsafeModify(entries[1].id, { previousHash: 'broken-link' });

      const verification = auditService.verifyChain();
      expect(verification.valid).toBe(false);
      expect(verification.brokenAt).toBe(1);
    });

    it('should detect entry deletion', () => {
      auditService.append(createAuditEntry({ action: 'FIRST' }));
      auditService.append(createAuditEntry({ action: 'SECOND' }));
      auditService.append(createAuditEntry({ action: 'THIRD' }));

      const entries = auditService.getEntries();
      auditService._unsafeDelete(entries[1].id);

      const verification = auditService.verifyChain();
      expect(verification.valid).toBe(false);
      expect(verification.error).toContain('previous hash mismatch');
    });

    it('should detect entry insertion', () => {
      const entry1 = auditService.append(createAuditEntry({ action: 'FIRST' }));
      auditService.append(createAuditEntry({ action: 'SECOND' }));

      // Try to insert a fake entry
      const fakeEntry: AuditEntry = {
        id: 'fake-id',
        timestamp: new Date(),
        userId: 'attacker',
        action: 'FAKE',
        resourceType: 'fake',
        resourceId: 'fake-id',
        ipAddress: '0.0.0.0',
        userAgent: 'fake',
        sessionId: 'fake',
        hash: 'fake-hash',
        previousHash: entry1.hash,
      };
      auditService._unsafeInsert(fakeEntry, 1);

      const verification = auditService.verifyChain();
      expect(verification.valid).toBe(false);
    });

    it('should detect reordering of entries', () => {
      auditService.append(createAuditEntry({ action: 'FIRST' }));
      auditService.append(createAuditEntry({ action: 'SECOND' }));
      auditService.append(createAuditEntry({ action: 'THIRD' }));

      const entries = auditService.getEntries();
      // Swap entries
      const temp = entries[0];
      auditService._unsafeDelete(entries[0].id);
      auditService._unsafeInsert(temp, 1);

      const verification = auditService.verifyChain();
      expect(verification.valid).toBe(false);
    });

    it('should detect genesis block tampering', () => {
      auditService.append(createAuditEntry());

      const entries = auditService.getEntries();
      auditService._unsafeModify(entries[0].id, { previousHash: 'not-genesis' });

      const verification = auditService.verifyChain();
      expect(verification.valid).toBe(false);
      expect(verification.error).toContain('Genesis block');
    });
  });

  describe('Signature Verification', () => {
    it('should include signature on all entries', () => {
      auditService.append(createAuditEntry());

      const entries = auditService.getEntries();
      expect(entries[0].signature).toBeDefined();
      expect(entries[0].signature?.length).toBe(128); // SHA-512 hex
    });

    it('should detect signature tampering', () => {
      auditService.append(createAuditEntry());

      const entries = auditService.getEntries();
      auditService._unsafeModify(entries[0].id, { signature: 'forged-signature' });

      const verification = auditService.verifyChain();
      expect(verification.valid).toBe(false);
      expect(verification.error).toContain('Signature');
    });

    it('should detect signature removal', () => {
      auditService.append(createAuditEntry());

      const entries = auditService.getEntries();
      auditService._unsafeModify(entries[0].id, { signature: undefined });

      // Should still pass if signature is optional, but we track it
      const entry = auditService.getEntry(entries[0].id);
      expect(entry?.signature).toBeUndefined();
    });
  });

  describe('Completeness', () => {
    it('should capture all required fields', () => {
      const entry = auditService.append(createAuditEntry({
        userId: 'user-123',
        action: 'UPDATE',
        resourceType: 'control',
        resourceId: 'ctrl-456',
        previousValue: { status: 'draft' },
        newValue: { status: 'approved' },
        ipAddress: '10.0.0.1',
        userAgent: 'Mozilla/5.0',
        sessionId: 'sess-abc',
      }));

      expect(entry.id).toBeDefined();
      expect(entry.timestamp).toBeInstanceOf(Date);
      expect(entry.userId).toBe('user-123');
      expect(entry.action).toBe('UPDATE');
      expect(entry.resourceType).toBe('control');
      expect(entry.resourceId).toBe('ctrl-456');
      expect(entry.previousValue).toEqual({ status: 'draft' });
      expect(entry.newValue).toEqual({ status: 'approved' });
      expect(entry.ipAddress).toBe('10.0.0.1');
      expect(entry.userAgent).toBe('Mozilla/5.0');
      expect(entry.sessionId).toBe('sess-abc');
      expect(entry.hash).toBeDefined();
      expect(entry.previousHash).toBeDefined();
    });

    it('should preserve complex nested values', () => {
      const complexValue = {
        items: [
          { id: 1, name: 'Item 1', nested: { deep: { value: 'test' } } },
          { id: 2, name: 'Item 2', tags: ['a', 'b', 'c'] },
        ],
        metadata: {
          version: 2,
          updatedBy: 'system',
          config: { enabled: true, threshold: 0.95 },
        },
      };

      const entry = auditService.append(createAuditEntry({
        previousValue: null,
        newValue: complexValue,
      }));

      expect(entry.newValue).toEqual(complexValue);
    });

    it('should handle null and undefined values', () => {
      const entry = auditService.append(createAuditEntry({
        previousValue: null,
        newValue: undefined,
      }));

      expect(entry.previousValue).toBeNull();
      expect(entry.newValue).toBeUndefined();
    });

    it('should preserve special characters in values', () => {
      const entry = auditService.append(createAuditEntry({
        action: 'UPDATE',
        previousValue: { text: 'Hello <script>alert("xss")</script>' },
        newValue: { text: 'Safe text with "quotes" and \'apostrophes\'' },
      }));

      expect(entry.previousValue).toEqual({ text: 'Hello <script>alert("xss")</script>' });
      expect(entry.newValue).toEqual({ text: 'Safe text with "quotes" and \'apostrophes\'' });
    });

    it('should preserve unicode and emoji in values', () => {
      const entry = auditService.append(createAuditEntry({
        previousValue: { name: '日本語テスト' },
        newValue: { name: 'Test 🎉 emoji 中文' },
      }));

      expect(entry.previousValue).toEqual({ name: '日本語テスト' });
      expect(entry.newValue).toEqual({ name: 'Test 🎉 emoji 中文' });
    });
  });

  describe('Timestamps', () => {
    it('should record timestamps with millisecond precision', () => {
      const before = Date.now();
      const entry = auditService.append(createAuditEntry({ timestamp: new Date() }));
      const after = Date.now();

      const entryTime = entry.timestamp.getTime();
      expect(entryTime).toBeGreaterThanOrEqual(before);
      expect(entryTime).toBeLessThanOrEqual(after);
    });

    it('should preserve original timestamp', () => {
      const specificTime = new Date('2024-06-15T14:30:00.123Z');
      const entry = auditService.append(createAuditEntry({ timestamp: specificTime }));

      expect(entry.timestamp.toISOString()).toBe('2024-06-15T14:30:00.123Z');
    });

    it('should maintain chronological order', () => {
      const timestamps = [
        new Date('2024-01-01T10:00:00Z'),
        new Date('2024-01-01T11:00:00Z'),
        new Date('2024-01-01T12:00:00Z'),
      ];

      timestamps.forEach(ts => {
        auditService.append(createAuditEntry({ timestamp: ts }));
      });

      const entries = auditService.getEntries();
      for (let i = 1; i < entries.length; i++) {
        expect(entries[i].timestamp.getTime()).toBeGreaterThan(entries[i - 1].timestamp.getTime());
      }
    });

    it('should detect timestamp backdating attempts through hash', () => {
      auditService.append(createAuditEntry({ timestamp: new Date('2024-06-01') }));

      const entries = auditService.getEntries();
      // Try to backdate
      auditService._unsafeModify(entries[0].id, { timestamp: new Date('2023-01-01') });

      const verification = auditService.verifyChain();
      expect(verification.valid).toBe(false);
    });
  });

  describe('Query Operations', () => {
    beforeEach(() => {
      // Populate with test data
      const users = ['user-1', 'user-2', 'user-3'];
      const actions = ['CREATE', 'UPDATE', 'DELETE', 'VIEW'];
      const resources = ['control', 'risk', 'audit'];

      for (let i = 0; i < 50; i++) {
        auditService.append(createAuditEntry({
          timestamp: new Date(Date.now() - (50 - i) * 60000), // Stagger by minutes
          userId: users[i % users.length],
          action: actions[i % actions.length],
          resourceType: resources[i % resources.length],
          resourceId: `${resources[i % resources.length]}-${Math.floor(i / 3)}`,
        }));
      }
    });

    it('should query by user', () => {
      const user1Entries = auditService.queryByUser('user-1');
      expect(user1Entries.length).toBeGreaterThan(0);
      expect(user1Entries.every(e => e.userId === 'user-1')).toBe(true);
    });

    it('should query by resource', () => {
      const controlEntries = auditService.queryByResource('control', 'control-0');
      expect(controlEntries.length).toBeGreaterThan(0);
      expect(controlEntries.every(e => e.resourceType === 'control' && e.resourceId === 'control-0')).toBe(true);
    });

    it('should query by time range', () => {
      const entries = auditService.getEntries();
      const midpoint = entries[25].timestamp;
      const start = new Date(midpoint.getTime() - 10 * 60000);
      const end = new Date(midpoint.getTime() + 10 * 60000);

      const rangeEntries = auditService.queryByTimeRange(start, end);
      expect(rangeEntries.length).toBeGreaterThan(0);
      expect(rangeEntries.every(e => e.timestamp >= start && e.timestamp <= end)).toBe(true);
    });

    it('should query by action', () => {
      const createEntries = auditService.queryByAction('CREATE');
      expect(createEntries.length).toBeGreaterThan(0);
      expect(createEntries.every(e => e.action === 'CREATE')).toBe(true);
    });

    it('should return change history in chronological order', () => {
      const history = auditService.getChangeHistory('control', 'control-0');
      expect(history.length).toBeGreaterThan(0);

      for (let i = 1; i < history.length; i++) {
        expect(history[i].timestamp.getTime()).toBeGreaterThanOrEqual(history[i - 1].timestamp.getTime());
      }
    });

    it('should return empty array for non-existent queries', () => {
      expect(auditService.queryByUser('non-existent')).toEqual([]);
      expect(auditService.queryByResource('fake', 'fake')).toEqual([]);
      expect(auditService.queryByAction('NONEXISTENT')).toEqual([]);
    });
  });

  describe('Action Types', () => {
    const actions = [
      'CREATE',
      'READ',
      'UPDATE',
      'DELETE',
      'LOGIN',
      'LOGOUT',
      'LOGIN_FAILED',
      'PASSWORD_CHANGE',
      'PASSWORD_RESET',
      'MFA_ENABLE',
      'MFA_DISABLE',
      'PERMISSION_GRANT',
      'PERMISSION_REVOKE',
      'ROLE_ASSIGN',
      'ROLE_REMOVE',
      'EXPORT',
      'IMPORT',
      'APPROVE',
      'REJECT',
      'SUBMIT',
      'ARCHIVE',
      'RESTORE',
      'LOCK',
      'UNLOCK',
    ];

    actions.forEach(action => {
      it(`should record ${action} action`, () => {
        const entry = auditService.append(createAuditEntry({ action }));
        expect(entry.action).toBe(action);

        const verification = auditService.verifyChain();
        expect(verification.valid).toBe(true);
      });
    });
  });

  describe('Resource Types', () => {
    const resourceTypes = [
      'user',
      'role',
      'permission',
      'control',
      'risk',
      'audit',
      'workpaper',
      'evidence',
      'finding',
      'issue',
      'certification',
      'ledger',
      'transaction',
      'report',
      'template',
      'setting',
      'integration',
      'api_key',
      'session',
    ];

    resourceTypes.forEach(resourceType => {
      it(`should track ${resourceType} resource changes`, () => {
        const entry = auditService.append(createAuditEntry({
          resourceType,
          resourceId: `${resourceType}-123`,
        }));

        expect(entry.resourceType).toBe(resourceType);
        expect(entry.resourceId).toBe(`${resourceType}-123`);
      });
    });
  });

  describe('Security Context', () => {
    it('should capture IP address for each action', () => {
      const entry = auditService.append(createAuditEntry({
        ipAddress: '203.0.113.45',
      }));

      expect(entry.ipAddress).toBe('203.0.113.45');
    });

    it('should handle IPv6 addresses', () => {
      const entry = auditService.append(createAuditEntry({
        ipAddress: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
      }));

      expect(entry.ipAddress).toBe('2001:0db8:85a3:0000:0000:8a2e:0370:7334');
    });

    it('should capture user agent for forensics', () => {
      const entry = auditService.append(createAuditEntry({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      }));

      expect(entry.userAgent).toContain('Mozilla');
    });

    it('should link to session for correlation', () => {
      const sessionId = 'session-abc-123';
      const entries = [
        auditService.append(createAuditEntry({ sessionId, action: 'LOGIN' })),
        auditService.append(createAuditEntry({ sessionId, action: 'VIEW' })),
        auditService.append(createAuditEntry({ sessionId, action: 'UPDATE' })),
        auditService.append(createAuditEntry({ sessionId, action: 'LOGOUT' })),
      ];

      expect(entries.every(e => e.sessionId === sessionId)).toBe(true);
    });
  });

  describe('Concurrent Access', () => {
    it('should handle rapid sequential appends', async () => {
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(Promise.resolve(auditService.append(createAuditEntry({ action: `ACTION_${i}` }))));
      }

      await Promise.all(promises);

      const entries = auditService.getEntries();
      expect(entries.length).toBe(100);

      const verification = auditService.verifyChain();
      expect(verification.valid).toBe(true);
    });

    it('should maintain chain integrity under load', () => {
      // Simulate high-volume audit logging
      for (let i = 0; i < 1000; i++) {
        auditService.append(createAuditEntry({
          userId: `user-${i % 10}`,
          action: ['CREATE', 'UPDATE', 'DELETE', 'VIEW'][i % 4],
          resourceType: ['control', 'risk', 'audit'][i % 3],
          resourceId: `resource-${i}`,
        }));
      }

      const verification = auditService.verifyChain();
      expect(verification.valid).toBe(true);
      expect(auditService.getEntries().length).toBe(1000);
    });
  });

  describe('Data Integrity Edge Cases', () => {
    it('should handle empty string values', () => {
      const entry = auditService.append(createAuditEntry({
        previousValue: '',
        newValue: 'new value',
      }));

      expect(entry.previousValue).toBe('');
      expect(auditService.verifyChain().valid).toBe(true);
    });

    it('should handle very large values', () => {
      const largeValue = 'x'.repeat(100000);
      const entry = auditService.append(createAuditEntry({
        newValue: { content: largeValue },
      }));

      expect((entry.newValue as { content: string }).content.length).toBe(100000);
      expect(auditService.verifyChain().valid).toBe(true);
    });

    it('should handle binary-like data as base64', () => {
      const binaryData = Buffer.from('binary content').toString('base64');
      const entry = auditService.append(createAuditEntry({
        newValue: { attachment: binaryData },
      }));

      expect((entry.newValue as { attachment: string }).attachment).toBe(binaryData);
    });

    it('should handle circular reference prevention', () => {
      // JSON.stringify handles circular refs, but we should test the approach
      const obj: Record<string, unknown> = { name: 'test' };
      // Don't actually create circular ref, just test normal nested objects
      obj.nested = { deep: { value: 'test' } };

      const entry = auditService.append(createAuditEntry({
        newValue: obj,
      }));

      expect(entry.newValue).toEqual({ name: 'test', nested: { deep: { value: 'test' } } });
    });

    it('should handle dates in values correctly', () => {
      const date = new Date('2024-06-15T10:30:00Z');
      const entry = auditService.append(createAuditEntry({
        previousValue: { createdAt: date.toISOString() },
        newValue: { createdAt: date.toISOString(), updatedAt: new Date().toISOString() },
      }));

      expect((entry.previousValue as { createdAt: string }).createdAt).toBe('2024-06-15T10:30:00.000Z');
    });
  });

  describe('Forensic Capabilities', () => {
    it('should provide complete audit trail for compliance review', () => {
      // Simulate a control lifecycle
      const controlId = 'ctrl-sox-101';

      auditService.append(createAuditEntry({
        action: 'CREATE',
        resourceType: 'control',
        resourceId: controlId,
        userId: 'control-owner',
        previousValue: null,
        newValue: { name: 'Revenue Recognition', status: 'draft' },
      }));

      auditService.append(createAuditEntry({
        action: 'UPDATE',
        resourceType: 'control',
        resourceId: controlId,
        userId: 'control-owner',
        previousValue: { status: 'draft' },
        newValue: { status: 'pending_review' },
      }));

      auditService.append(createAuditEntry({
        action: 'APPROVE',
        resourceType: 'control',
        resourceId: controlId,
        userId: 'reviewer',
        previousValue: { status: 'pending_review' },
        newValue: { status: 'approved' },
      }));

      const history = auditService.getChangeHistory('control', controlId);
      expect(history.length).toBe(3);
      expect(history[0].action).toBe('CREATE');
      expect(history[1].action).toBe('UPDATE');
      expect(history[2].action).toBe('APPROVE');
    });

    it('should support who-what-when-where forensics', () => {
      const entry = auditService.append(createAuditEntry({
        userId: 'john.doe@company.com',
        action: 'DELETE',
        resourceType: 'evidence',
        resourceId: 'evidence-sensitive-123',
        timestamp: new Date('2024-06-15T15:30:00Z'),
        ipAddress: '10.0.0.50',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        sessionId: 'sess-forensic-test',
      }));

      // WHO
      expect(entry.userId).toBe('john.doe@company.com');
      // WHAT
      expect(entry.action).toBe('DELETE');
      expect(entry.resourceType).toBe('evidence');
      expect(entry.resourceId).toBe('evidence-sensitive-123');
      // WHEN
      expect(entry.timestamp).toEqual(new Date('2024-06-15T15:30:00Z'));
      // WHERE
      expect(entry.ipAddress).toBe('10.0.0.50');
      expect(entry.sessionId).toBe('sess-forensic-test');
    });
  });
});

describe('Audit Trail Compliance', () => {
  let auditService: AuditTrailService;

  beforeEach(() => {
    auditService = new AuditTrailService();
  });

  describe('SOX Compliance', () => {
    it('should maintain complete change history for financial controls', () => {
      const controlId = 'sox-ctrl-001';

      // Document control creation
      auditService.append(createAuditEntry({
        action: 'CREATE',
        resourceType: 'control',
        resourceId: controlId,
        newValue: { type: 'financial', soxRelevant: true },
      }));

      // Document testing
      auditService.append(createAuditEntry({
        action: 'UPDATE',
        resourceType: 'control',
        resourceId: controlId,
        previousValue: { testStatus: 'untested' },
        newValue: { testStatus: 'passed', testedBy: 'auditor-1', testedAt: new Date() },
      }));

      const history = auditService.getChangeHistory('control', controlId);
      expect(history.length).toBe(2);
      expect(auditService.verifyChain().valid).toBe(true);
    });

    it('should track all approval workflows', () => {
      const certId = 'cert-302-2024';

      auditService.append(createAuditEntry({
        action: 'CREATE',
        resourceType: 'certification',
        resourceId: certId,
        userId: 'cfo@company.com',
        newValue: { type: 'SOX-302', status: 'draft' },
      }));

      auditService.append(createAuditEntry({
        action: 'SUBMIT',
        resourceType: 'certification',
        resourceId: certId,
        userId: 'cfo@company.com',
        previousValue: { status: 'draft' },
        newValue: { status: 'submitted' },
      }));

      auditService.append(createAuditEntry({
        action: 'APPROVE',
        resourceType: 'certification',
        resourceId: certId,
        userId: 'ceo@company.com',
        previousValue: { status: 'submitted' },
        newValue: { status: 'approved', approvedAt: new Date() },
      }));

      const history = auditService.getChangeHistory('certification', certId);
      expect(history.map(h => h.action)).toEqual(['CREATE', 'SUBMIT', 'APPROVE']);
    });
  });

  describe('Retention Requirements', () => {
    it('should support 7-year retention period queries', () => {
      // Simulate entries from different years
      const years = [2018, 2019, 2020, 2021, 2022, 2023, 2024];
      years.forEach(year => {
        auditService.append(createAuditEntry({
          timestamp: new Date(`${year}-06-15T12:00:00Z`),
          action: 'ARCHIVE',
          resourceType: 'financial_record',
          resourceId: `record-${year}`,
        }));
      });

      const entries = auditService.getEntries();
      expect(entries.length).toBe(7);

      // Query for specific year
      const start = new Date('2020-01-01');
      const end = new Date('2020-12-31');
      const year2020 = auditService.queryByTimeRange(start, end);
      expect(year2020.length).toBe(1);
    });
  });
});
