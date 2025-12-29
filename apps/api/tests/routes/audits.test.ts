import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Audits API Endpoint Tests
 *
 * Comprehensive tests for the audits API endpoints
 * including CRUD, workflow management, and reporting.
 */

interface Audit {
  id: string;
  name: string;
  type: 'internal' | 'external' | 'sox' | 'compliance' | 'operational' | 'financial' | 'it';
  status: 'planned' | 'in_progress' | 'review' | 'completed' | 'cancelled';
  startDate: Date;
  endDate?: Date;
  leadAuditorId: string;
  teamMembers: string[];
  description?: string;
  scope?: string;
  findings: string[];
  workpapers: string[];
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class AuditsApiHandler {
  private audits: Map<string, Audit> = new Map();
  private idCounter = 1;

  // GET /api/audits
  listAudits(params: {
    organizationId: string;
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
    year?: number;
    leadAuditorId?: string;
  }): ApiResponse<{ audits: Audit[]; total: number }> {
    let audits = [...this.audits.values()].filter(a => a.organizationId === params.organizationId);

    if (params.type) {
      audits = audits.filter(a => a.type === params.type);
    }

    if (params.status) {
      audits = audits.filter(a => a.status === params.status);
    }

    if (params.year) {
      audits = audits.filter(a => a.startDate.getFullYear() === params.year);
    }

    if (params.leadAuditorId) {
      audits = audits.filter(a => a.leadAuditorId === params.leadAuditorId);
    }

    const page = params.page || 1;
    const limit = params.limit || 20;
    const start = (page - 1) * limit;
    const paged = audits.slice(start, start + limit);

    return { success: true, data: { audits: paged, total: audits.length } };
  }

  // GET /api/audits/:id
  getAudit(id: string, organizationId: string): ApiResponse<Audit> {
    const audit = this.audits.get(id);
    if (!audit) return { success: false, error: 'Audit not found' };
    if (audit.organizationId !== organizationId) return { success: false, error: 'Access denied' };
    return { success: true, data: audit };
  }

  // POST /api/audits
  createAudit(data: Omit<Audit, 'id' | 'createdAt' | 'updatedAt' | 'findings' | 'workpapers'>): ApiResponse<Audit> {
    if (!data.name) return { success: false, error: 'Name is required' };
    if (!data.type) return { success: false, error: 'Type is required' };
    if (!data.leadAuditorId) return { success: false, error: 'Lead auditor is required' };
    if (!data.startDate) return { success: false, error: 'Start date is required' };

    if (data.endDate && data.endDate < data.startDate) {
      return { success: false, error: 'End date must be after start date' };
    }

    const audit: Audit = {
      ...data,
      id: `audit-${this.idCounter++}`,
      status: data.status || 'planned',
      teamMembers: data.teamMembers || [],
      findings: [],
      workpapers: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.audits.set(audit.id, audit);
    return { success: true, data: audit, message: 'Audit created successfully' };
  }

  // PUT /api/audits/:id
  updateAudit(id: string, data: Partial<Audit>, organizationId: string): ApiResponse<Audit> {
    const audit = this.audits.get(id);
    if (!audit) return { success: false, error: 'Audit not found' };
    if (audit.organizationId !== organizationId) return { success: false, error: 'Access denied' };

    // Validate end date if provided
    const startDate = data.startDate || audit.startDate;
    const endDate = data.endDate || audit.endDate;
    if (endDate && endDate < startDate) {
      return { success: false, error: 'End date must be after start date' };
    }

    const updated = { ...audit, ...data, id: audit.id, organizationId: audit.organizationId, updatedAt: new Date() };
    this.audits.set(id, updated);
    return { success: true, data: updated };
  }

  // DELETE /api/audits/:id
  deleteAudit(id: string, organizationId: string): ApiResponse<null> {
    const audit = this.audits.get(id);
    if (!audit) return { success: false, error: 'Audit not found' };
    if (audit.organizationId !== organizationId) return { success: false, error: 'Access denied' };

    // Can only delete planned audits
    if (audit.status !== 'planned' && audit.status !== 'cancelled') {
      return { success: false, error: 'Can only delete planned or cancelled audits' };
    }

    this.audits.delete(id);
    return { success: true, message: 'Audit deleted successfully' };
  }

  // POST /api/audits/:id/start
  startAudit(id: string, organizationId: string): ApiResponse<Audit> {
    const audit = this.audits.get(id);
    if (!audit) return { success: false, error: 'Audit not found' };
    if (audit.organizationId !== organizationId) return { success: false, error: 'Access denied' };

    if (audit.status !== 'planned') {
      return { success: false, error: 'Can only start planned audits' };
    }

    audit.status = 'in_progress';
    audit.updatedAt = new Date();
    return { success: true, data: audit, message: 'Audit started' };
  }

  // POST /api/audits/:id/submit-for-review
  submitForReview(id: string, organizationId: string): ApiResponse<Audit> {
    const audit = this.audits.get(id);
    if (!audit) return { success: false, error: 'Audit not found' };
    if (audit.organizationId !== organizationId) return { success: false, error: 'Access denied' };

    if (audit.status !== 'in_progress') {
      return { success: false, error: 'Can only submit in-progress audits for review' };
    }

    audit.status = 'review';
    audit.updatedAt = new Date();
    return { success: true, data: audit, message: 'Audit submitted for review' };
  }

  // POST /api/audits/:id/complete
  completeAudit(id: string, organizationId: string): ApiResponse<Audit> {
    const audit = this.audits.get(id);
    if (!audit) return { success: false, error: 'Audit not found' };
    if (audit.organizationId !== organizationId) return { success: false, error: 'Access denied' };

    if (audit.status !== 'review') {
      return { success: false, error: 'Can only complete audits in review status' };
    }

    audit.status = 'completed';
    audit.endDate = new Date();
    audit.updatedAt = new Date();
    return { success: true, data: audit, message: 'Audit completed' };
  }

  // POST /api/audits/:id/cancel
  cancelAudit(id: string, organizationId: string, reason: string): ApiResponse<Audit> {
    const audit = this.audits.get(id);
    if (!audit) return { success: false, error: 'Audit not found' };
    if (audit.organizationId !== organizationId) return { success: false, error: 'Access denied' };

    if (audit.status === 'completed') {
      return { success: false, error: 'Cannot cancel completed audits' };
    }

    if (!reason) {
      return { success: false, error: 'Cancellation reason is required' };
    }

    audit.status = 'cancelled';
    audit.description = (audit.description || '') + `\n\nCancellation reason: ${reason}`;
    audit.updatedAt = new Date();
    return { success: true, data: audit, message: 'Audit cancelled' };
  }

  // POST /api/audits/:id/team
  addTeamMember(id: string, userId: string, organizationId: string): ApiResponse<Audit> {
    const audit = this.audits.get(id);
    if (!audit) return { success: false, error: 'Audit not found' };
    if (audit.organizationId !== organizationId) return { success: false, error: 'Access denied' };

    if (!audit.teamMembers.includes(userId)) {
      audit.teamMembers.push(userId);
      audit.updatedAt = new Date();
    }

    return { success: true, data: audit };
  }

  // DELETE /api/audits/:id/team/:userId
  removeTeamMember(id: string, userId: string, organizationId: string): ApiResponse<Audit> {
    const audit = this.audits.get(id);
    if (!audit) return { success: false, error: 'Audit not found' };
    if (audit.organizationId !== organizationId) return { success: false, error: 'Access denied' };

    // Cannot remove lead auditor
    if (audit.leadAuditorId === userId) {
      return { success: false, error: 'Cannot remove lead auditor from team' };
    }

    audit.teamMembers = audit.teamMembers.filter(m => m !== userId);
    audit.updatedAt = new Date();
    return { success: true, data: audit };
  }

  // GET /api/audits/summary
  getSummary(organizationId: string, year?: number): ApiResponse<{
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    completionRate: number;
    averageDuration: number;
  }> {
    let audits = [...this.audits.values()].filter(a => a.organizationId === organizationId);

    if (year) {
      audits = audits.filter(a => a.startDate.getFullYear() === year);
    }

    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let completedCount = 0;
    let totalDuration = 0;
    let durationCount = 0;

    audits.forEach(a => {
      byStatus[a.status] = (byStatus[a.status] || 0) + 1;
      byType[a.type] = (byType[a.type] || 0) + 1;

      if (a.status === 'completed') {
        completedCount++;
        if (a.endDate) {
          totalDuration += a.endDate.getTime() - a.startDate.getTime();
          durationCount++;
        }
      }
    });

    const completionRate = audits.length > 0 ? (completedCount / audits.length) * 100 : 0;
    const averageDuration = durationCount > 0 ? totalDuration / durationCount / (1000 * 60 * 60 * 24) : 0; // Days

    return {
      success: true,
      data: {
        total: audits.length,
        byStatus,
        byType,
        completionRate,
        averageDuration,
      },
    };
  }

  // GET /api/audits/:id/progress
  getProgress(id: string, organizationId: string): ApiResponse<{
    workpapersCompleted: number;
    workpapersTotal: number;
    findingsCount: number;
    daysRemaining: number;
    percentComplete: number;
  }> {
    const audit = this.audits.get(id);
    if (!audit) return { success: false, error: 'Audit not found' };
    if (audit.organizationId !== organizationId) return { success: false, error: 'Access denied' };

    const workpapersCompleted = Math.floor(audit.workpapers.length * 0.7); // Mock
    const daysRemaining = audit.endDate
      ? Math.max(0, Math.ceil((audit.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : 0;

    return {
      success: true,
      data: {
        workpapersCompleted,
        workpapersTotal: audit.workpapers.length || 10, // Mock total
        findingsCount: audit.findings.length,
        daysRemaining,
        percentComplete: audit.workpapers.length > 0 ? (workpapersCompleted / audit.workpapers.length) * 100 : 0,
      },
    };
  }

  seedAudit(audit: Audit): void {
    this.audits.set(audit.id, audit);
  }
}

describe('Audits API', () => {
  let handler: AuditsApiHandler;
  const orgId = 'org-123';

  beforeEach(() => {
    handler = new AuditsApiHandler();
  });

  describe('GET /api/audits', () => {
    beforeEach(() => {
      for (let i = 1; i <= 15; i++) {
        handler.seedAudit({
          id: `audit-${i}`,
          name: `Audit ${i}`,
          type: ['internal', 'external', 'sox', 'compliance'][i % 4] as Audit['type'],
          status: ['planned', 'in_progress', 'review', 'completed'][i % 4] as Audit['status'],
          startDate: new Date(`2024-${String((i % 12) + 1).padStart(2, '0')}-01`),
          leadAuditorId: `user-${(i % 3) + 1}`,
          teamMembers: [],
          findings: [],
          workpapers: [],
          organizationId: orgId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    });

    it('should list all audits', () => {
      const result = handler.listAudits({ organizationId: orgId });
      expect(result.success).toBe(true);
      expect(result.data?.total).toBe(15);
    });

    it('should filter by type', () => {
      const result = handler.listAudits({ organizationId: orgId, type: 'sox' });
      expect(result.data?.audits.every(a => a.type === 'sox')).toBe(true);
    });

    it('should filter by status', () => {
      const result = handler.listAudits({ organizationId: orgId, status: 'completed' });
      expect(result.data?.audits.every(a => a.status === 'completed')).toBe(true);
    });

    it('should filter by year', () => {
      const result = handler.listAudits({ organizationId: orgId, year: 2024 });
      expect(result.data?.audits.every(a => a.startDate.getFullYear() === 2024)).toBe(true);
    });

    it('should filter by lead auditor', () => {
      const result = handler.listAudits({ organizationId: orgId, leadAuditorId: 'user-1' });
      expect(result.data?.audits.every(a => a.leadAuditorId === 'user-1')).toBe(true);
    });

    it('should paginate results', () => {
      const result = handler.listAudits({ organizationId: orgId, page: 1, limit: 5 });
      expect(result.data?.audits.length).toBe(5);
    });
  });

  describe('GET /api/audits/:id', () => {
    beforeEach(() => {
      handler.seedAudit({
        id: 'audit-1',
        name: 'Test Audit',
        type: 'sox',
        status: 'in_progress',
        startDate: new Date('2024-01-01'),
        leadAuditorId: 'user-1',
        teamMembers: ['user-2', 'user-3'],
        findings: [],
        workpapers: [],
        organizationId: orgId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it('should get audit by ID', () => {
      const result = handler.getAudit('audit-1', orgId);
      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Test Audit');
    });

    it('should return error for non-existent audit', () => {
      const result = handler.getAudit('non-existent', orgId);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Audit not found');
    });

    it('should deny access from different organization', () => {
      const result = handler.getAudit('audit-1', 'other-org');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Access denied');
    });
  });

  describe('POST /api/audits', () => {
    it('should create a new audit', () => {
      const result = handler.createAudit({
        name: 'Q1 2024 SOX Audit',
        type: 'sox',
        status: 'planned',
        startDate: new Date('2024-01-15'),
        leadAuditorId: 'user-1',
        teamMembers: [],
        organizationId: orgId,
      });

      expect(result.success).toBe(true);
      expect(result.data?.id).toBeDefined();
      expect(result.data?.name).toBe('Q1 2024 SOX Audit');
    });

    it('should require name', () => {
      const result = handler.createAudit({
        name: '',
        type: 'sox',
        status: 'planned',
        startDate: new Date('2024-01-15'),
        leadAuditorId: 'user-1',
        teamMembers: [],
        organizationId: orgId,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Name is required');
    });

    it('should require type', () => {
      const result = handler.createAudit({
        name: 'Test Audit',
        type: '' as Audit['type'],
        status: 'planned',
        startDate: new Date('2024-01-15'),
        leadAuditorId: 'user-1',
        teamMembers: [],
        organizationId: orgId,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Type is required');
    });

    it('should require lead auditor', () => {
      const result = handler.createAudit({
        name: 'Test Audit',
        type: 'sox',
        status: 'planned',
        startDate: new Date('2024-01-15'),
        leadAuditorId: '',
        teamMembers: [],
        organizationId: orgId,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Lead auditor is required');
    });

    it('should validate end date after start date', () => {
      const result = handler.createAudit({
        name: 'Test Audit',
        type: 'sox',
        status: 'planned',
        startDate: new Date('2024-06-01'),
        endDate: new Date('2024-01-01'),
        leadAuditorId: 'user-1',
        teamMembers: [],
        organizationId: orgId,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('End date must be after start date');
    });
  });

  describe('PUT /api/audits/:id', () => {
    beforeEach(() => {
      handler.seedAudit({
        id: 'audit-1',
        name: 'Original Audit',
        type: 'sox',
        status: 'planned',
        startDate: new Date('2024-01-01'),
        leadAuditorId: 'user-1',
        teamMembers: [],
        findings: [],
        workpapers: [],
        organizationId: orgId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it('should update audit', () => {
      const result = handler.updateAudit('audit-1', { name: 'Updated Audit' }, orgId);
      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Updated Audit');
    });

    it('should validate end date on update', () => {
      const result = handler.updateAudit('audit-1', {
        endDate: new Date('2023-01-01'),
      }, orgId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('End date must be after start date');
    });
  });

  describe('DELETE /api/audits/:id', () => {
    it('should delete planned audit', () => {
      handler.seedAudit({
        id: 'audit-1',
        name: 'Planned Audit',
        type: 'sox',
        status: 'planned',
        startDate: new Date('2024-01-01'),
        leadAuditorId: 'user-1',
        teamMembers: [],
        findings: [],
        workpapers: [],
        organizationId: orgId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = handler.deleteAudit('audit-1', orgId);
      expect(result.success).toBe(true);
    });

    it('should not delete in-progress audit', () => {
      handler.seedAudit({
        id: 'audit-1',
        name: 'In Progress Audit',
        type: 'sox',
        status: 'in_progress',
        startDate: new Date('2024-01-01'),
        leadAuditorId: 'user-1',
        teamMembers: [],
        findings: [],
        workpapers: [],
        organizationId: orgId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = handler.deleteAudit('audit-1', orgId);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Can only delete planned or cancelled audits');
    });
  });

  describe('Audit Workflow', () => {
    beforeEach(() => {
      handler.seedAudit({
        id: 'audit-1',
        name: 'Workflow Test Audit',
        type: 'sox',
        status: 'planned',
        startDate: new Date('2024-01-01'),
        leadAuditorId: 'user-1',
        teamMembers: [],
        findings: [],
        workpapers: [],
        organizationId: orgId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it('should start planned audit', () => {
      const result = handler.startAudit('audit-1', orgId);
      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('in_progress');
    });

    it('should not start already started audit', () => {
      handler.startAudit('audit-1', orgId);
      const result = handler.startAudit('audit-1', orgId);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Can only start planned audits');
    });

    it('should submit in-progress audit for review', () => {
      handler.startAudit('audit-1', orgId);
      const result = handler.submitForReview('audit-1', orgId);
      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('review');
    });

    it('should not submit planned audit for review', () => {
      const result = handler.submitForReview('audit-1', orgId);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Can only submit in-progress audits for review');
    });

    it('should complete audit in review', () => {
      handler.startAudit('audit-1', orgId);
      handler.submitForReview('audit-1', orgId);
      const result = handler.completeAudit('audit-1', orgId);
      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('completed');
      expect(result.data?.endDate).toBeDefined();
    });

    it('should not complete audit not in review', () => {
      handler.startAudit('audit-1', orgId);
      const result = handler.completeAudit('audit-1', orgId);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Can only complete audits in review status');
    });

    it('should follow full workflow: planned -> in_progress -> review -> completed', () => {
      let audit = handler.getAudit('audit-1', orgId).data;
      expect(audit?.status).toBe('planned');

      handler.startAudit('audit-1', orgId);
      audit = handler.getAudit('audit-1', orgId).data;
      expect(audit?.status).toBe('in_progress');

      handler.submitForReview('audit-1', orgId);
      audit = handler.getAudit('audit-1', orgId).data;
      expect(audit?.status).toBe('review');

      handler.completeAudit('audit-1', orgId);
      audit = handler.getAudit('audit-1', orgId).data;
      expect(audit?.status).toBe('completed');
    });
  });

  describe('Audit Cancellation', () => {
    it('should cancel planned audit', () => {
      handler.seedAudit({
        id: 'audit-1',
        name: 'Test Audit',
        type: 'sox',
        status: 'planned',
        startDate: new Date('2024-01-01'),
        leadAuditorId: 'user-1',
        teamMembers: [],
        findings: [],
        workpapers: [],
        organizationId: orgId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = handler.cancelAudit('audit-1', orgId, 'Budget constraints');
      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('cancelled');
      expect(result.data?.description).toContain('Budget constraints');
    });

    it('should cancel in-progress audit', () => {
      handler.seedAudit({
        id: 'audit-1',
        name: 'Test Audit',
        type: 'sox',
        status: 'in_progress',
        startDate: new Date('2024-01-01'),
        leadAuditorId: 'user-1',
        teamMembers: [],
        findings: [],
        workpapers: [],
        organizationId: orgId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = handler.cancelAudit('audit-1', orgId, 'Scope change');
      expect(result.success).toBe(true);
    });

    it('should not cancel completed audit', () => {
      handler.seedAudit({
        id: 'audit-1',
        name: 'Test Audit',
        type: 'sox',
        status: 'completed',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-01'),
        leadAuditorId: 'user-1',
        teamMembers: [],
        findings: [],
        workpapers: [],
        organizationId: orgId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = handler.cancelAudit('audit-1', orgId, 'Too late');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot cancel completed audits');
    });

    it('should require cancellation reason', () => {
      handler.seedAudit({
        id: 'audit-1',
        name: 'Test Audit',
        type: 'sox',
        status: 'planned',
        startDate: new Date('2024-01-01'),
        leadAuditorId: 'user-1',
        teamMembers: [],
        findings: [],
        workpapers: [],
        organizationId: orgId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = handler.cancelAudit('audit-1', orgId, '');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Cancellation reason is required');
    });
  });

  describe('Team Management', () => {
    beforeEach(() => {
      handler.seedAudit({
        id: 'audit-1',
        name: 'Test Audit',
        type: 'sox',
        status: 'in_progress',
        startDate: new Date('2024-01-01'),
        leadAuditorId: 'user-1',
        teamMembers: ['user-2'],
        findings: [],
        workpapers: [],
        organizationId: orgId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it('should add team member', () => {
      const result = handler.addTeamMember('audit-1', 'user-3', orgId);
      expect(result.success).toBe(true);
      expect(result.data?.teamMembers).toContain('user-3');
    });

    it('should not duplicate team member', () => {
      handler.addTeamMember('audit-1', 'user-3', orgId);
      handler.addTeamMember('audit-1', 'user-3', orgId);

      const result = handler.getAudit('audit-1', orgId);
      expect(result.data?.teamMembers.filter(m => m === 'user-3').length).toBe(1);
    });

    it('should remove team member', () => {
      const result = handler.removeTeamMember('audit-1', 'user-2', orgId);
      expect(result.success).toBe(true);
      expect(result.data?.teamMembers).not.toContain('user-2');
    });

    it('should not remove lead auditor', () => {
      const result = handler.removeTeamMember('audit-1', 'user-1', orgId);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot remove lead auditor from team');
    });
  });

  describe('GET /api/audits/summary', () => {
    beforeEach(() => {
      handler.seedAudit({
        id: 'audit-1',
        name: 'Completed Audit 1',
        type: 'sox',
        status: 'completed',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-30'),
        leadAuditorId: 'user-1',
        teamMembers: [],
        findings: [],
        workpapers: [],
        organizationId: orgId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      handler.seedAudit({
        id: 'audit-2',
        name: 'In Progress Audit',
        type: 'internal',
        status: 'in_progress',
        startDate: new Date('2024-02-01'),
        leadAuditorId: 'user-1',
        teamMembers: [],
        findings: [],
        workpapers: [],
        organizationId: orgId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it('should return audit summary', () => {
      const result = handler.getSummary(orgId);

      expect(result.success).toBe(true);
      expect(result.data?.total).toBe(2);
    });

    it('should count by status', () => {
      const result = handler.getSummary(orgId);

      expect(result.data?.byStatus.completed).toBe(1);
      expect(result.data?.byStatus.in_progress).toBe(1);
    });

    it('should count by type', () => {
      const result = handler.getSummary(orgId);

      expect(result.data?.byType.sox).toBe(1);
      expect(result.data?.byType.internal).toBe(1);
    });

    it('should calculate completion rate', () => {
      const result = handler.getSummary(orgId);
      expect(result.data?.completionRate).toBe(50); // 1 of 2
    });

    it('should filter summary by year', () => {
      const result = handler.getSummary(orgId, 2024);
      expect(result.data?.total).toBe(2);
    });
  });

  describe('GET /api/audits/:id/progress', () => {
    beforeEach(() => {
      handler.seedAudit({
        id: 'audit-1',
        name: 'Test Audit',
        type: 'sox',
        status: 'in_progress',
        startDate: new Date('2024-01-01'),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        leadAuditorId: 'user-1',
        teamMembers: [],
        findings: ['finding-1', 'finding-2'],
        workpapers: ['wp-1', 'wp-2', 'wp-3'],
        organizationId: orgId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it('should get audit progress', () => {
      const result = handler.getProgress('audit-1', orgId);

      expect(result.success).toBe(true);
      expect(result.data?.findingsCount).toBe(2);
      expect(result.data?.daysRemaining).toBeGreaterThanOrEqual(6);
    });
  });
});
