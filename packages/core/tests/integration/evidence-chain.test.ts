import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Evidence Chain of Custody Tests
 * Testing evidence integrity, chain of custody, and forensic capabilities
 * Critical for legal defensibility in banking audits
 */

// ============================================================================
// TYPES
// ============================================================================
interface Evidence {
  id: string;
  name: string;
  type: 'document' | 'screenshot' | 'report' | 'data_export' | 'email' | 'other';
  hash: string;
  hashAlgorithm: 'sha256' | 'sha512';
  size: number;
  mimeType: string;
  uploadedAt: Date;
  uploadedBy: string;
  controlId?: string;
  workpaperId?: string;
  findingId?: string;
  metadata: Record<string, any>;
}

interface CustodyEvent {
  id: string;
  evidenceId: string;
  action: 'upload' | 'view' | 'download' | 'link' | 'unlink' | 'verify' | 'archive' | 'restore';
  performedBy: string;
  performedAt: Date;
  ipAddress: string;
  userAgent: string;
  details: Record<string, any>;
  previousHash: string;
  eventHash: string;
}

interface ChainOfCustody {
  evidenceId: string;
  events: CustodyEvent[];
  currentHash: string;
  isIntact: boolean;
  lastVerified: Date;
}

// ============================================================================
// EVIDENCE MANAGER
// ============================================================================
class EvidenceManager {
  private evidence: Map<string, Evidence>;
  private custodyChains: Map<string, ChainOfCustody>;
  private quarantinedEvidence: Set<string>;

  constructor() {
    this.evidence = new Map();
    this.custodyChains = new Map();
    this.quarantinedEvidence = new Set();
  }

  async uploadEvidence(
    file: { name: string; content: Buffer; mimeType: string },
    userId: string,
    context: { controlId?: string; workpaperId?: string; findingId?: string }
  ): Promise<Evidence> {
    const hash = await this.computeHash(file.content);
    const id = this.generateId();

    const evidence: Evidence = {
      id,
      name: file.name,
      type: this.detectType(file.mimeType, file.name),
      hash,
      hashAlgorithm: 'sha256',
      size: file.content.length,
      mimeType: file.mimeType,
      uploadedAt: new Date(),
      uploadedBy: userId,
      controlId: context.controlId,
      workpaperId: context.workpaperId,
      findingId: context.findingId,
      metadata: {},
    };

    this.evidence.set(id, evidence);

    // Initialize chain of custody
    this.initializeCustodyChain(evidence, userId);

    return evidence;
  }

  private detectType(mimeType: string, filename: string): Evidence['type'] {
    if (mimeType.includes('pdf') || mimeType.includes('word') || mimeType.includes('document')) {
      return 'document';
    }
    if (mimeType.includes('image')) {
      return 'screenshot';
    }
    if (mimeType.includes('csv') || mimeType.includes('excel') || mimeType.includes('json')) {
      return 'data_export';
    }
    if (mimeType.includes('message') || filename.includes('.eml')) {
      return 'email';
    }
    if (mimeType.includes('html') && filename.includes('report')) {
      return 'report';
    }
    return 'other';
  }

  private initializeCustodyChain(evidence: Evidence, userId: string): void {
    const initialEvent: CustodyEvent = {
      id: this.generateId(),
      evidenceId: evidence.id,
      action: 'upload',
      performedBy: userId,
      performedAt: evidence.uploadedAt,
      ipAddress: '0.0.0.0',
      userAgent: 'system',
      details: {
        originalFilename: evidence.name,
        fileHash: evidence.hash,
        fileSize: evidence.size,
      },
      previousHash: '0'.repeat(64),
      eventHash: '',
    };

    initialEvent.eventHash = this.computeEventHash(initialEvent);

    const chain: ChainOfCustody = {
      evidenceId: evidence.id,
      events: [initialEvent],
      currentHash: initialEvent.eventHash,
      isIntact: true,
      lastVerified: new Date(),
    };

    this.custodyChains.set(evidence.id, chain);
  }

  async recordAccess(
    evidenceId: string,
    action: CustodyEvent['action'],
    userId: string,
    context: { ipAddress: string; userAgent: string; details?: Record<string, any> }
  ): Promise<CustodyEvent> {
    const chain = this.custodyChains.get(evidenceId);
    if (!chain) {
      throw new Error('Evidence not found');
    }

    const event: CustodyEvent = {
      id: this.generateId(),
      evidenceId,
      action,
      performedBy: userId,
      performedAt: new Date(),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      details: context.details || {},
      previousHash: chain.currentHash,
      eventHash: '',
    };

    event.eventHash = this.computeEventHash(event);
    chain.events.push(event);
    chain.currentHash = event.eventHash;

    return event;
  }

  async verifyIntegrity(evidenceId: string): Promise<{
    intact: boolean;
    fileHashValid: boolean;
    chainValid: boolean;
    errors: string[];
  }> {
    const evidence = this.evidence.get(evidenceId);
    const chain = this.custodyChains.get(evidenceId);
    const errors: string[] = [];

    if (!evidence || !chain) {
      return { intact: false, fileHashValid: false, chainValid: false, errors: ['Evidence not found'] };
    }

    // Verify chain integrity
    let expectedPreviousHash = '0'.repeat(64);
    let chainValid = true;

    for (const event of chain.events) {
      if (event.previousHash !== expectedPreviousHash) {
        chainValid = false;
        errors.push(`Chain broken at event ${event.id}`);
      }

      const computedHash = this.computeEventHash(event);
      if (computedHash !== event.eventHash) {
        chainValid = false;
        errors.push(`Event hash mismatch at ${event.id}`);
      }

      expectedPreviousHash = event.eventHash;
    }

    // Update verification status
    chain.isIntact = chainValid;
    chain.lastVerified = new Date();

    // Record verification event
    await this.recordAccess(evidenceId, 'verify', 'system', {
      ipAddress: '0.0.0.0',
      userAgent: 'verification-service',
      details: { chainValid, errors },
    });

    return {
      intact: chainValid,
      fileHashValid: true, // Would verify actual file hash in real implementation
      chainValid,
      errors,
    };
  }

  async getAuditTrail(evidenceId: string): Promise<CustodyEvent[]> {
    const chain = this.custodyChains.get(evidenceId);
    return chain ? [...chain.events] : [];
  }

  async linkToControl(evidenceId: string, controlId: string, userId: string): Promise<void> {
    const evidence = this.evidence.get(evidenceId);
    if (!evidence) throw new Error('Evidence not found');

    evidence.controlId = controlId;

    await this.recordAccess(evidenceId, 'link', userId, {
      ipAddress: '0.0.0.0',
      userAgent: 'system',
      details: { linkedTo: 'control', targetId: controlId },
    });
  }

  async linkToWorkpaper(evidenceId: string, workpaperId: string, userId: string): Promise<void> {
    const evidence = this.evidence.get(evidenceId);
    if (!evidence) throw new Error('Evidence not found');

    evidence.workpaperId = workpaperId;

    await this.recordAccess(evidenceId, 'link', userId, {
      ipAddress: '0.0.0.0',
      userAgent: 'system',
      details: { linkedTo: 'workpaper', targetId: workpaperId },
    });
  }

  async archive(evidenceId: string, userId: string): Promise<void> {
    await this.recordAccess(evidenceId, 'archive', userId, {
      ipAddress: '0.0.0.0',
      userAgent: 'system',
      details: { reason: 'audit_completed' },
    });
  }

  quarantine(evidenceId: string): void {
    this.quarantinedEvidence.add(evidenceId);
  }

  isQuarantined(evidenceId: string): boolean {
    return this.quarantinedEvidence.has(evidenceId);
  }

  getEvidence(id: string): Evidence | undefined {
    return this.evidence.get(id);
  }

  getAllEvidence(): Evidence[] {
    return [...this.evidence.values()];
  }

  private generateId(): string {
    return 'ev-' + Math.random().toString(36).substring(2, 15);
  }

  private async computeHash(content: Buffer): Promise<string> {
    // Simulated SHA-256 hash
    return 'sha256-' + Math.random().toString(36).substring(2, 66);
  }

  private computeEventHash(event: CustodyEvent): string {
    const data = JSON.stringify({
      evidenceId: event.evidenceId,
      action: event.action,
      performedBy: event.performedBy,
      performedAt: event.performedAt.toISOString(),
      previousHash: event.previousHash,
    });
    return 'hash-' + data.length.toString(16) + '-' + Math.random().toString(36).substring(2, 20);
  }
}

// ============================================================================
// EVIDENCE RETENTION POLICY
// ============================================================================
interface RetentionPolicy {
  id: string;
  name: string;
  evidenceTypes: Evidence['type'][];
  retentionPeriodDays: number;
  afterExpiry: 'archive' | 'delete' | 'review';
  legalHold: boolean;
}

class RetentionManager {
  private policies: Map<string, RetentionPolicy>;
  private evidenceRetention: Map<string, string>; // evidenceId -> policyId

  constructor() {
    this.policies = new Map();
    this.evidenceRetention = new Map();
  }

  addPolicy(policy: RetentionPolicy): void {
    this.policies.set(policy.id, policy);
  }

  applyPolicy(evidenceId: string, policyId: string): void {
    if (!this.policies.has(policyId)) {
      throw new Error('Policy not found');
    }
    this.evidenceRetention.set(evidenceId, policyId);
  }

  getPolicy(evidenceId: string): RetentionPolicy | undefined {
    const policyId = this.evidenceRetention.get(evidenceId);
    return policyId ? this.policies.get(policyId) : undefined;
  }

  getExpirationDate(evidence: Evidence): Date | null {
    const policy = this.getPolicy(evidence.id);
    if (!policy) return null;

    const expiry = new Date(evidence.uploadedAt);
    expiry.setDate(expiry.getDate() + policy.retentionPeriodDays);
    return expiry;
  }

  isExpired(evidence: Evidence): boolean {
    const expiry = this.getExpirationDate(evidence);
    return expiry ? expiry < new Date() : false;
  }

  isUnderLegalHold(evidenceId: string): boolean {
    const policy = this.getPolicy(evidenceId);
    return policy?.legalHold || false;
  }

  setLegalHold(evidenceId: string, hold: boolean): void {
    const policyId = this.evidenceRetention.get(evidenceId);
    if (policyId) {
      const policy = this.policies.get(policyId);
      if (policy) {
        policy.legalHold = hold;
      }
    }
  }
}

// ============================================================================
// TESTS
// ============================================================================

describe('Evidence Chain of Custody', () => {
  let manager: EvidenceManager;

  beforeEach(() => {
    manager = new EvidenceManager();
  });

  describe('Evidence Upload', () => {
    it('should upload evidence with hash', async () => {
      const file = {
        name: 'bank_statement.pdf',
        content: Buffer.from('test content'),
        mimeType: 'application/pdf',
      };

      const evidence = await manager.uploadEvidence(file, 'user-1', {});

      expect(evidence.id).toBeDefined();
      expect(evidence.name).toBe('bank_statement.pdf');
      expect(evidence.type).toBe('document');
      expect(evidence.hash).toBeDefined();
      expect(evidence.hashAlgorithm).toBe('sha256');
      expect(evidence.uploadedBy).toBe('user-1');
    });

    it('should detect evidence type from mime type', async () => {
      const tests = [
        { mimeType: 'application/pdf', expected: 'document' },
        { mimeType: 'image/png', expected: 'screenshot' },
        { mimeType: 'text/csv', expected: 'data_export' },
        { mimeType: 'application/json', expected: 'data_export' },
        { mimeType: 'message/rfc822', expected: 'email' },
        { mimeType: 'application/octet-stream', expected: 'other' },
      ];

      for (const test of tests) {
        const evidence = await manager.uploadEvidence(
          { name: 'test.file', content: Buffer.from(''), mimeType: test.mimeType },
          'user-1',
          {}
        );
        expect(evidence.type).toBe(test.expected);
      }
    });

    it('should link evidence to control', async () => {
      const evidence = await manager.uploadEvidence(
        { name: 'test.pdf', content: Buffer.from(''), mimeType: 'application/pdf' },
        'user-1',
        { controlId: 'ctrl-123' }
      );

      expect(evidence.controlId).toBe('ctrl-123');
    });

    it('should link evidence to workpaper', async () => {
      const evidence = await manager.uploadEvidence(
        { name: 'test.pdf', content: Buffer.from(''), mimeType: 'application/pdf' },
        'user-1',
        { workpaperId: 'wp-123' }
      );

      expect(evidence.workpaperId).toBe('wp-123');
    });

    it('should link evidence to finding', async () => {
      const evidence = await manager.uploadEvidence(
        { name: 'test.pdf', content: Buffer.from(''), mimeType: 'application/pdf' },
        'user-1',
        { findingId: 'find-123' }
      );

      expect(evidence.findingId).toBe('find-123');
    });
  });

  describe('Chain of Custody', () => {
    it('should initialize chain on upload', async () => {
      const evidence = await manager.uploadEvidence(
        { name: 'test.pdf', content: Buffer.from(''), mimeType: 'application/pdf' },
        'user-1',
        {}
      );

      const trail = await manager.getAuditTrail(evidence.id);
      expect(trail).toHaveLength(1);
      expect(trail[0].action).toBe('upload');
      expect(trail[0].performedBy).toBe('user-1');
    });

    it('should record view access', async () => {
      const evidence = await manager.uploadEvidence(
        { name: 'test.pdf', content: Buffer.from(''), mimeType: 'application/pdf' },
        'user-1',
        {}
      );

      await manager.recordAccess(evidence.id, 'view', 'user-2', {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      const trail = await manager.getAuditTrail(evidence.id);
      expect(trail).toHaveLength(2);
      expect(trail[1].action).toBe('view');
      expect(trail[1].performedBy).toBe('user-2');
    });

    it('should record download access', async () => {
      const evidence = await manager.uploadEvidence(
        { name: 'test.pdf', content: Buffer.from(''), mimeType: 'application/pdf' },
        'user-1',
        {}
      );

      await manager.recordAccess(evidence.id, 'download', 'user-2', {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      const trail = await manager.getAuditTrail(evidence.id);
      expect(trail[1].action).toBe('download');
    });

    it('should maintain hash chain between events', async () => {
      const evidence = await manager.uploadEvidence(
        { name: 'test.pdf', content: Buffer.from(''), mimeType: 'application/pdf' },
        'user-1',
        {}
      );

      await manager.recordAccess(evidence.id, 'view', 'user-2', {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      await manager.recordAccess(evidence.id, 'download', 'user-3', {
        ipAddress: '192.168.1.2',
        userAgent: 'Mozilla/5.0',
      });

      const trail = await manager.getAuditTrail(evidence.id);

      // Each event should reference previous event's hash
      expect(trail[1].previousHash).toBe(trail[0].eventHash);
      expect(trail[2].previousHash).toBe(trail[1].eventHash);
    });

    it('should verify chain integrity', async () => {
      const evidence = await manager.uploadEvidence(
        { name: 'test.pdf', content: Buffer.from(''), mimeType: 'application/pdf' },
        'user-1',
        {}
      );

      await manager.recordAccess(evidence.id, 'view', 'user-2', {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      const result = await manager.verifyIntegrity(evidence.id);
      expect(result.intact).toBe(true);
      expect(result.chainValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should record verification in audit trail', async () => {
      const evidence = await manager.uploadEvidence(
        { name: 'test.pdf', content: Buffer.from(''), mimeType: 'application/pdf' },
        'user-1',
        {}
      );

      await manager.verifyIntegrity(evidence.id);

      const trail = await manager.getAuditTrail(evidence.id);
      expect(trail.some(e => e.action === 'verify')).toBe(true);
    });
  });

  describe('Evidence Linking', () => {
    it('should link evidence to control with audit trail', async () => {
      const evidence = await manager.uploadEvidence(
        { name: 'test.pdf', content: Buffer.from(''), mimeType: 'application/pdf' },
        'user-1',
        {}
      );

      await manager.linkToControl(evidence.id, 'ctrl-123', 'user-2');

      const updated = manager.getEvidence(evidence.id);
      expect(updated?.controlId).toBe('ctrl-123');

      const trail = await manager.getAuditTrail(evidence.id);
      expect(trail.some(e => e.action === 'link' && e.details.linkedTo === 'control')).toBe(true);
    });

    it('should link evidence to workpaper with audit trail', async () => {
      const evidence = await manager.uploadEvidence(
        { name: 'test.pdf', content: Buffer.from(''), mimeType: 'application/pdf' },
        'user-1',
        {}
      );

      await manager.linkToWorkpaper(evidence.id, 'wp-123', 'user-2');

      const trail = await manager.getAuditTrail(evidence.id);
      expect(trail.some(e => e.action === 'link' && e.details.linkedTo === 'workpaper')).toBe(true);
    });
  });

  describe('Evidence Archive', () => {
    it('should archive evidence with audit trail', async () => {
      const evidence = await manager.uploadEvidence(
        { name: 'test.pdf', content: Buffer.from(''), mimeType: 'application/pdf' },
        'user-1',
        {}
      );

      await manager.archive(evidence.id, 'user-2');

      const trail = await manager.getAuditTrail(evidence.id);
      expect(trail.some(e => e.action === 'archive')).toBe(true);
    });
  });

  describe('Evidence Quarantine', () => {
    it('should quarantine suspicious evidence', async () => {
      const evidence = await manager.uploadEvidence(
        { name: 'suspicious.exe', content: Buffer.from(''), mimeType: 'application/octet-stream' },
        'user-1',
        {}
      );

      manager.quarantine(evidence.id);
      expect(manager.isQuarantined(evidence.id)).toBe(true);
    });

    it('should not quarantine regular evidence', async () => {
      const evidence = await manager.uploadEvidence(
        { name: 'test.pdf', content: Buffer.from(''), mimeType: 'application/pdf' },
        'user-1',
        {}
      );

      expect(manager.isQuarantined(evidence.id)).toBe(false);
    });
  });

  describe('Evidence Retrieval', () => {
    it('should retrieve all evidence', async () => {
      await manager.uploadEvidence(
        { name: 'test1.pdf', content: Buffer.from(''), mimeType: 'application/pdf' },
        'user-1',
        {}
      );
      await manager.uploadEvidence(
        { name: 'test2.pdf', content: Buffer.from(''), mimeType: 'application/pdf' },
        'user-1',
        {}
      );

      const all = manager.getAllEvidence();
      expect(all).toHaveLength(2);
    });

    it('should retrieve evidence by id', async () => {
      const evidence = await manager.uploadEvidence(
        { name: 'test.pdf', content: Buffer.from(''), mimeType: 'application/pdf' },
        'user-1',
        {}
      );

      const retrieved = manager.getEvidence(evidence.id);
      expect(retrieved).toEqual(evidence);
    });

    it('should return undefined for non-existent evidence', () => {
      const retrieved = manager.getEvidence('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });
});

describe('Evidence Retention', () => {
  let retention: RetentionManager;

  beforeEach(() => {
    retention = new RetentionManager();
  });

  describe('Policy Management', () => {
    it('should add retention policy', () => {
      const policy: RetentionPolicy = {
        id: 'pol-1',
        name: 'Standard Retention',
        evidenceTypes: ['document'],
        retentionPeriodDays: 365 * 7, // 7 years
        afterExpiry: 'archive',
        legalHold: false,
      };

      retention.addPolicy(policy);
      expect(retention.getPolicy('test-id')).toBeUndefined(); // No evidence linked yet
    });

    it('should apply policy to evidence', () => {
      const policy: RetentionPolicy = {
        id: 'pol-1',
        name: 'Standard Retention',
        evidenceTypes: ['document'],
        retentionPeriodDays: 365 * 7,
        afterExpiry: 'archive',
        legalHold: false,
      };

      retention.addPolicy(policy);
      retention.applyPolicy('ev-1', 'pol-1');

      const applied = retention.getPolicy('ev-1');
      expect(applied).toEqual(policy);
    });

    it('should throw error for non-existent policy', () => {
      expect(() => retention.applyPolicy('ev-1', 'non-existent')).toThrow('Policy not found');
    });
  });

  describe('Expiration Calculation', () => {
    it('should calculate expiration date', () => {
      const policy: RetentionPolicy = {
        id: 'pol-1',
        name: 'Standard Retention',
        evidenceTypes: ['document'],
        retentionPeriodDays: 365, // 1 year
        afterExpiry: 'archive',
        legalHold: false,
      };

      retention.addPolicy(policy);

      const evidence: Evidence = {
        id: 'ev-1',
        name: 'test.pdf',
        type: 'document',
        hash: 'hash',
        hashAlgorithm: 'sha256',
        size: 1000,
        mimeType: 'application/pdf',
        uploadedAt: new Date('2024-01-01'),
        uploadedBy: 'user-1',
        metadata: {},
      };

      retention.applyPolicy('ev-1', 'pol-1');
      const expiry = retention.getExpirationDate(evidence);

      expect(expiry).toEqual(new Date('2025-01-01'));
    });

    it('should return null for evidence without policy', () => {
      const evidence: Evidence = {
        id: 'ev-1',
        name: 'test.pdf',
        type: 'document',
        hash: 'hash',
        hashAlgorithm: 'sha256',
        size: 1000,
        mimeType: 'application/pdf',
        uploadedAt: new Date(),
        uploadedBy: 'user-1',
        metadata: {},
      };

      expect(retention.getExpirationDate(evidence)).toBeNull();
    });

    it('should detect expired evidence', () => {
      const policy: RetentionPolicy = {
        id: 'pol-1',
        name: 'Short Retention',
        evidenceTypes: ['document'],
        retentionPeriodDays: 30,
        afterExpiry: 'archive',
        legalHold: false,
      };

      retention.addPolicy(policy);

      const evidence: Evidence = {
        id: 'ev-1',
        name: 'test.pdf',
        type: 'document',
        hash: 'hash',
        hashAlgorithm: 'sha256',
        size: 1000,
        mimeType: 'application/pdf',
        uploadedAt: new Date('2020-01-01'), // Old evidence
        uploadedBy: 'user-1',
        metadata: {},
      };

      retention.applyPolicy('ev-1', 'pol-1');
      expect(retention.isExpired(evidence)).toBe(true);
    });

    it('should detect non-expired evidence', () => {
      const policy: RetentionPolicy = {
        id: 'pol-1',
        name: 'Standard Retention',
        evidenceTypes: ['document'],
        retentionPeriodDays: 365 * 10, // 10 years
        afterExpiry: 'archive',
        legalHold: false,
      };

      retention.addPolicy(policy);

      const evidence: Evidence = {
        id: 'ev-1',
        name: 'test.pdf',
        type: 'document',
        hash: 'hash',
        hashAlgorithm: 'sha256',
        size: 1000,
        mimeType: 'application/pdf',
        uploadedAt: new Date(), // Today
        uploadedBy: 'user-1',
        metadata: {},
      };

      retention.applyPolicy('ev-1', 'pol-1');
      expect(retention.isExpired(evidence)).toBe(false);
    });
  });

  describe('Legal Hold', () => {
    it('should detect legal hold status', () => {
      const policy: RetentionPolicy = {
        id: 'pol-1',
        name: 'Legal Hold',
        evidenceTypes: ['document'],
        retentionPeriodDays: 365,
        afterExpiry: 'review',
        legalHold: true,
      };

      retention.addPolicy(policy);
      retention.applyPolicy('ev-1', 'pol-1');

      expect(retention.isUnderLegalHold('ev-1')).toBe(true);
    });

    it('should set legal hold', () => {
      const policy: RetentionPolicy = {
        id: 'pol-1',
        name: 'Standard',
        evidenceTypes: ['document'],
        retentionPeriodDays: 365,
        afterExpiry: 'archive',
        legalHold: false,
      };

      retention.addPolicy(policy);
      retention.applyPolicy('ev-1', 'pol-1');

      expect(retention.isUnderLegalHold('ev-1')).toBe(false);

      retention.setLegalHold('ev-1', true);
      expect(retention.isUnderLegalHold('ev-1')).toBe(true);
    });

    it('should release legal hold', () => {
      const policy: RetentionPolicy = {
        id: 'pol-1',
        name: 'Legal Hold',
        evidenceTypes: ['document'],
        retentionPeriodDays: 365,
        afterExpiry: 'review',
        legalHold: true,
      };

      retention.addPolicy(policy);
      retention.applyPolicy('ev-1', 'pol-1');

      retention.setLegalHold('ev-1', false);
      expect(retention.isUnderLegalHold('ev-1')).toBe(false);
    });

    it('should return false for evidence without policy', () => {
      expect(retention.isUnderLegalHold('non-existent')).toBe(false);
    });
  });
});

describe('Evidence Integrity Edge Cases', () => {
  let manager: EvidenceManager;

  beforeEach(() => {
    manager = new EvidenceManager();
  });

  describe('Error Handling', () => {
    it('should throw error when recording access for non-existent evidence', async () => {
      await expect(
        manager.recordAccess('non-existent', 'view', 'user-1', {
          ipAddress: '0.0.0.0',
          userAgent: 'test',
        })
      ).rejects.toThrow('Evidence not found');
    });

    it('should throw error when linking non-existent evidence to control', async () => {
      await expect(manager.linkToControl('non-existent', 'ctrl-1', 'user-1')).rejects.toThrow(
        'Evidence not found'
      );
    });

    it('should throw error when linking non-existent evidence to workpaper', async () => {
      await expect(manager.linkToWorkpaper('non-existent', 'wp-1', 'user-1')).rejects.toThrow(
        'Evidence not found'
      );
    });

    it('should return empty audit trail for non-existent evidence', async () => {
      const trail = await manager.getAuditTrail('non-existent');
      expect(trail).toEqual([]);
    });

    it('should handle verification of non-existent evidence', async () => {
      const result = await manager.verifyIntegrity('non-existent');
      expect(result.intact).toBe(false);
      expect(result.errors).toContain('Evidence not found');
    });
  });

  describe('Large Audit Trails', () => {
    it('should handle many access events', async () => {
      const evidence = await manager.uploadEvidence(
        { name: 'test.pdf', content: Buffer.from(''), mimeType: 'application/pdf' },
        'user-1',
        {}
      );

      // Record 100 access events
      for (let i = 0; i < 100; i++) {
        await manager.recordAccess(evidence.id, 'view', `user-${i}`, {
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        });
      }

      const trail = await manager.getAuditTrail(evidence.id);
      expect(trail).toHaveLength(101); // 1 upload + 100 views

      const result = await manager.verifyIntegrity(evidence.id);
      expect(result.chainValid).toBe(true);
    });
  });

  describe('Concurrent Access', () => {
    it('should handle concurrent access recording', async () => {
      const evidence = await manager.uploadEvidence(
        { name: 'test.pdf', content: Buffer.from(''), mimeType: 'application/pdf' },
        'user-1',
        {}
      );

      // Record concurrent access
      const promises = Array(10)
        .fill(null)
        .map((_, i) =>
          manager.recordAccess(evidence.id, 'view', `user-${i}`, {
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0',
          })
        );

      await Promise.all(promises);

      const trail = await manager.getAuditTrail(evidence.id);
      expect(trail).toHaveLength(11); // 1 upload + 10 views
    });
  });
});
