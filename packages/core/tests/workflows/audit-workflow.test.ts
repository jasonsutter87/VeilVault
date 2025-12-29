import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Audit Workflow E2E Tests
 *
 * Comprehensive tests for end-to-end audit workflows including
 * planning, execution, review, and completion processes.
 */

// Workflow state types
type AuditPhase = 'planning' | 'fieldwork' | 'reporting' | 'review' | 'completed' | 'cancelled';
type WorkpaperStatus = 'draft' | 'in_review' | 'reviewed' | 'approved' | 'superseded';
type FindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'informational';
type ControlResult = 'pass' | 'fail' | 'exception' | 'not_tested';

interface WorkflowAudit {
  id: string;
  name: string;
  phase: AuditPhase;
  leadAuditorId: string;
  teamMemberIds: string[];
  plannedStartDate: Date;
  plannedEndDate: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  workpapers: WorkflowWorkpaper[];
  findings: WorkflowFinding[];
  controlTests: WorkflowControlTest[];
  approvals: WorkflowApproval[];
  milestones: WorkflowMilestone[];
}

interface WorkflowWorkpaper {
  id: string;
  reference: string;
  title: string;
  status: WorkpaperStatus;
  preparedById: string;
  preparedAt: Date;
  reviewedById?: string;
  reviewedAt?: Date;
  approvedById?: string;
  approvedAt?: Date;
  reviewNotes: string[];
}

interface WorkflowFinding {
  id: string;
  title: string;
  severity: FindingSeverity;
  status: 'draft' | 'open' | 'remediation' | 'validation' | 'closed' | 'accepted';
  assignedToId?: string;
  dueDate?: Date;
  remediationPlan?: string;
  validatedById?: string;
  validatedAt?: Date;
}

interface WorkflowControlTest {
  id: string;
  controlId: string;
  result: ControlResult;
  testedById: string;
  testedAt: Date;
  sampleSize: number;
  exceptionsFound: number;
  workpaperId?: string;
}

interface WorkflowApproval {
  id: string;
  type: 'phase_transition' | 'workpaper' | 'finding' | 'report';
  status: 'pending' | 'approved' | 'rejected';
  requestedById: string;
  requestedAt: Date;
  approvedById?: string;
  approvedAt?: Date;
  rejectedById?: string;
  rejectedAt?: Date;
  comments?: string;
}

interface WorkflowMilestone {
  id: string;
  name: string;
  plannedDate: Date;
  actualDate?: Date;
  status: 'pending' | 'completed' | 'overdue';
}

// Audit workflow manager
class AuditWorkflowManager {
  private audit: WorkflowAudit;
  private auditLogs: Array<{
    timestamp: Date;
    action: string;
    userId: string;
    details: string;
  }> = [];

  constructor(auditData: Partial<WorkflowAudit>) {
    this.audit = {
      id: auditData.id || `audit-${Date.now()}`,
      name: auditData.name || 'New Audit',
      phase: auditData.phase || 'planning',
      leadAuditorId: auditData.leadAuditorId || '',
      teamMemberIds: auditData.teamMemberIds || [],
      plannedStartDate: auditData.plannedStartDate || new Date(),
      plannedEndDate: auditData.plannedEndDate || new Date(),
      workpapers: auditData.workpapers || [],
      findings: auditData.findings || [],
      controlTests: auditData.controlTests || [],
      approvals: auditData.approvals || [],
      milestones: auditData.milestones || [],
    };
  }

  getAudit(): WorkflowAudit {
    return { ...this.audit };
  }

  getLogs(): typeof this.auditLogs {
    return [...this.auditLogs];
  }

  private log(action: string, userId: string, details: string): void {
    this.auditLogs.push({ timestamp: new Date(), action, userId, details });
  }

  // Phase transitions
  canTransitionTo(targetPhase: AuditPhase): { canTransition: boolean; blockers: string[] } {
    const blockers: string[] = [];

    switch (targetPhase) {
      case 'fieldwork':
        if (this.audit.phase !== 'planning') {
          blockers.push('Can only start fieldwork from planning phase');
        }
        if (!this.audit.leadAuditorId) {
          blockers.push('Lead auditor must be assigned');
        }
        if (this.audit.milestones.length === 0) {
          blockers.push('Audit plan must have milestones');
        }
        break;

      case 'reporting':
        if (this.audit.phase !== 'fieldwork') {
          blockers.push('Can only start reporting from fieldwork phase');
        }
        const untestedControls = this.audit.controlTests.filter(t => t.result === 'not_tested');
        if (untestedControls.length > 0) {
          blockers.push(`${untestedControls.length} controls have not been tested`);
        }
        const pendingWorkpapers = this.audit.workpapers.filter(w => w.status === 'draft' || w.status === 'in_review');
        if (pendingWorkpapers.length > 0) {
          blockers.push(`${pendingWorkpapers.length} workpapers are not yet approved`);
        }
        break;

      case 'review':
        if (this.audit.phase !== 'reporting') {
          blockers.push('Can only submit for review from reporting phase');
        }
        const openFindings = this.audit.findings.filter(f => f.status === 'draft');
        if (openFindings.length > 0) {
          blockers.push(`${openFindings.length} findings are still in draft`);
        }
        break;

      case 'completed':
        if (this.audit.phase !== 'review') {
          blockers.push('Can only complete audit from review phase');
        }
        const pendingApprovals = this.audit.approvals.filter(a => a.status === 'pending');
        if (pendingApprovals.length > 0) {
          blockers.push(`${pendingApprovals.length} approvals are pending`);
        }
        break;

      case 'cancelled':
        if (this.audit.phase === 'completed') {
          blockers.push('Cannot cancel a completed audit');
        }
        break;
    }

    return { canTransition: blockers.length === 0, blockers };
  }

  transitionTo(targetPhase: AuditPhase, userId: string): { success: boolean; error?: string } {
    const { canTransition, blockers } = this.canTransitionTo(targetPhase);

    if (!canTransition) {
      return { success: false, error: blockers.join('; ') };
    }

    const previousPhase = this.audit.phase;
    this.audit.phase = targetPhase;

    if (targetPhase === 'fieldwork' && !this.audit.actualStartDate) {
      this.audit.actualStartDate = new Date();
    }

    if (targetPhase === 'completed') {
      this.audit.actualEndDate = new Date();
    }

    this.log('phase_transition', userId, `Phase changed from ${previousPhase} to ${targetPhase}`);

    return { success: true };
  }

  // Workpaper management
  createWorkpaper(data: Omit<WorkflowWorkpaper, 'id' | 'preparedAt'>): WorkflowWorkpaper {
    const workpaper: WorkflowWorkpaper = {
      ...data,
      id: `wp-${Date.now()}`,
      preparedAt: new Date(),
      reviewNotes: [],
    };
    this.audit.workpapers.push(workpaper);
    this.log('workpaper_created', data.preparedById, `Workpaper ${data.reference} created`);
    return workpaper;
  }

  submitWorkpaperForReview(workpaperId: string, userId: string): { success: boolean; error?: string } {
    const workpaper = this.audit.workpapers.find(w => w.id === workpaperId);
    if (!workpaper) return { success: false, error: 'Workpaper not found' };

    if (workpaper.status !== 'draft') {
      return { success: false, error: 'Only draft workpapers can be submitted for review' };
    }

    if (workpaper.preparedById !== userId) {
      return { success: false, error: 'Only the preparer can submit for review' };
    }

    workpaper.status = 'in_review';
    this.log('workpaper_submitted', userId, `Workpaper ${workpaper.reference} submitted for review`);
    return { success: true };
  }

  reviewWorkpaper(workpaperId: string, reviewerId: string, approved: boolean, notes?: string): { success: boolean; error?: string } {
    const workpaper = this.audit.workpapers.find(w => w.id === workpaperId);
    if (!workpaper) return { success: false, error: 'Workpaper not found' };

    if (workpaper.status !== 'in_review') {
      return { success: false, error: 'Workpaper is not in review' };
    }

    if (workpaper.preparedById === reviewerId) {
      return { success: false, error: 'Preparer cannot review their own workpaper' };
    }

    workpaper.reviewedById = reviewerId;
    workpaper.reviewedAt = new Date();

    if (notes) {
      workpaper.reviewNotes.push(notes);
    }

    if (approved) {
      workpaper.status = 'reviewed';
      this.log('workpaper_reviewed', reviewerId, `Workpaper ${workpaper.reference} reviewed and approved`);
    } else {
      workpaper.status = 'draft';
      this.log('workpaper_rejected', reviewerId, `Workpaper ${workpaper.reference} returned for revision: ${notes}`);
    }

    return { success: true };
  }

  approveWorkpaper(workpaperId: string, approverId: string): { success: boolean; error?: string } {
    const workpaper = this.audit.workpapers.find(w => w.id === workpaperId);
    if (!workpaper) return { success: false, error: 'Workpaper not found' };

    if (workpaper.status !== 'reviewed') {
      return { success: false, error: 'Workpaper must be reviewed before approval' };
    }

    if (workpaper.preparedById === approverId || workpaper.reviewedById === approverId) {
      return { success: false, error: 'Cannot approve workpaper you prepared or reviewed' };
    }

    workpaper.approvedById = approverId;
    workpaper.approvedAt = new Date();
    workpaper.status = 'approved';

    this.log('workpaper_approved', approverId, `Workpaper ${workpaper.reference} approved`);
    return { success: true };
  }

  // Finding management
  createFinding(data: Omit<WorkflowFinding, 'id' | 'status'>, userId: string): WorkflowFinding {
    const finding: WorkflowFinding = {
      ...data,
      id: `finding-${Date.now()}`,
      status: 'draft',
    };
    this.audit.findings.push(finding);
    this.log('finding_created', userId, `Finding "${data.title}" created`);
    return finding;
  }

  issueFinding(findingId: string, userId: string): { success: boolean; error?: string } {
    const finding = this.audit.findings.find(f => f.id === findingId);
    if (!finding) return { success: false, error: 'Finding not found' };

    if (finding.status !== 'draft') {
      return { success: false, error: 'Only draft findings can be issued' };
    }

    finding.status = 'open';
    this.log('finding_issued', userId, `Finding "${finding.title}" issued`);
    return { success: true };
  }

  assignRemediationOwner(findingId: string, ownerId: string, dueDate: Date, userId: string): { success: boolean; error?: string } {
    const finding = this.audit.findings.find(f => f.id === findingId);
    if (!finding) return { success: false, error: 'Finding not found' };

    if (finding.status !== 'open') {
      return { success: false, error: 'Can only assign owner to open findings' };
    }

    finding.assignedToId = ownerId;
    finding.dueDate = dueDate;
    finding.status = 'remediation';

    this.log('finding_assigned', userId, `Finding "${finding.title}" assigned to ${ownerId}`);
    return { success: true };
  }

  submitRemediationForValidation(findingId: string, plan: string, userId: string): { success: boolean; error?: string } {
    const finding = this.audit.findings.find(f => f.id === findingId);
    if (!finding) return { success: false, error: 'Finding not found' };

    if (finding.status !== 'remediation') {
      return { success: false, error: 'Finding is not in remediation' };
    }

    if (finding.assignedToId !== userId) {
      return { success: false, error: 'Only assigned owner can submit remediation' };
    }

    finding.remediationPlan = plan;
    finding.status = 'validation';

    this.log('remediation_submitted', userId, `Remediation for "${finding.title}" submitted for validation`);
    return { success: true };
  }

  validateRemediation(findingId: string, validatorId: string, accepted: boolean): { success: boolean; error?: string } {
    const finding = this.audit.findings.find(f => f.id === findingId);
    if (!finding) return { success: false, error: 'Finding not found' };

    if (finding.status !== 'validation') {
      return { success: false, error: 'Finding is not pending validation' };
    }

    if (finding.assignedToId === validatorId) {
      return { success: false, error: 'Owner cannot validate their own remediation' };
    }

    finding.validatedById = validatorId;
    finding.validatedAt = new Date();

    if (accepted) {
      finding.status = 'closed';
      this.log('remediation_validated', validatorId, `Remediation for "${finding.title}" validated and closed`);
    } else {
      finding.status = 'remediation';
      this.log('remediation_rejected', validatorId, `Remediation for "${finding.title}" rejected`);
    }

    return { success: true };
  }

  acceptRisk(findingId: string, accepterId: string): { success: boolean; error?: string } {
    const finding = this.audit.findings.find(f => f.id === findingId);
    if (!finding) return { success: false, error: 'Finding not found' };

    if (finding.status !== 'open' && finding.status !== 'remediation') {
      return { success: false, error: 'Can only accept risk for open or in-remediation findings' };
    }

    finding.status = 'accepted';
    this.log('risk_accepted', accepterId, `Risk accepted for "${finding.title}"`);
    return { success: true };
  }

  // Control testing
  recordControlTest(data: Omit<WorkflowControlTest, 'id'>, userId: string): WorkflowControlTest {
    const test: WorkflowControlTest = {
      ...data,
      id: `test-${Date.now()}`,
    };
    this.audit.controlTests.push(test);
    this.log('control_tested', userId, `Control ${data.controlId} tested: ${data.result}`);
    return test;
  }

  // Approval workflow
  requestApproval(type: WorkflowApproval['type'], requesterId: string): WorkflowApproval {
    const approval: WorkflowApproval = {
      id: `approval-${Date.now()}`,
      type,
      status: 'pending',
      requestedById: requesterId,
      requestedAt: new Date(),
    };
    this.audit.approvals.push(approval);
    this.log('approval_requested', requesterId, `Approval requested: ${type}`);
    return approval;
  }

  processApproval(approvalId: string, approverId: string, approved: boolean, comments?: string): { success: boolean; error?: string } {
    const approval = this.audit.approvals.find(a => a.id === approvalId);
    if (!approval) return { success: false, error: 'Approval not found' };

    if (approval.status !== 'pending') {
      return { success: false, error: 'Approval already processed' };
    }

    if (approval.requestedById === approverId) {
      return { success: false, error: 'Cannot approve own request' };
    }

    approval.comments = comments;

    if (approved) {
      approval.status = 'approved';
      approval.approvedById = approverId;
      approval.approvedAt = new Date();
      this.log('approval_granted', approverId, `Approval granted: ${approval.type}`);
    } else {
      approval.status = 'rejected';
      approval.rejectedById = approverId;
      approval.rejectedAt = new Date();
      this.log('approval_rejected', approverId, `Approval rejected: ${approval.type}`);
    }

    return { success: true };
  }

  // Milestone tracking
  addMilestone(name: string, plannedDate: Date): WorkflowMilestone {
    const milestone: WorkflowMilestone = {
      id: `milestone-${Date.now()}`,
      name,
      plannedDate,
      status: 'pending',
    };
    this.audit.milestones.push(milestone);
    return milestone;
  }

  completeMilestone(milestoneId: string, userId: string): { success: boolean; error?: string } {
    const milestone = this.audit.milestones.find(m => m.id === milestoneId);
    if (!milestone) return { success: false, error: 'Milestone not found' };

    milestone.actualDate = new Date();
    milestone.status = milestone.actualDate <= milestone.plannedDate ? 'completed' : 'overdue';

    this.log('milestone_completed', userId, `Milestone "${milestone.name}" completed`);
    return { success: true };
  }

  // Progress metrics
  getProgress(): {
    workpaperProgress: number;
    testingProgress: number;
    findingsResolved: number;
    milestonesCompleted: number;
  } {
    const totalWorkpapers = this.audit.workpapers.length;
    const approvedWorkpapers = this.audit.workpapers.filter(w => w.status === 'approved').length;

    const totalTests = this.audit.controlTests.length;
    const completedTests = this.audit.controlTests.filter(t => t.result !== 'not_tested').length;

    const totalFindings = this.audit.findings.length;
    const resolvedFindings = this.audit.findings.filter(f => f.status === 'closed' || f.status === 'accepted').length;

    const totalMilestones = this.audit.milestones.length;
    const completedMilestones = this.audit.milestones.filter(m => m.status === 'completed' || m.status === 'overdue').length;

    return {
      workpaperProgress: totalWorkpapers > 0 ? (approvedWorkpapers / totalWorkpapers) * 100 : 0,
      testingProgress: totalTests > 0 ? (completedTests / totalTests) * 100 : 0,
      findingsResolved: totalFindings > 0 ? (resolvedFindings / totalFindings) * 100 : 0,
      milestonesCompleted: totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0,
    };
  }
}

describe('Audit Workflow E2E', () => {
  let workflow: AuditWorkflowManager;

  beforeEach(() => {
    workflow = new AuditWorkflowManager({
      name: 'Q1 2024 SOX Audit',
      leadAuditorId: 'lead-auditor',
      teamMemberIds: ['auditor-1', 'auditor-2'],
      plannedStartDate: new Date('2024-01-01'),
      plannedEndDate: new Date('2024-03-31'),
    });
  });

  describe('Phase Transitions', () => {
    it('should start in planning phase', () => {
      expect(workflow.getAudit().phase).toBe('planning');
    });

    it('should transition from planning to fieldwork', () => {
      workflow.addMilestone('Planning Complete', new Date());

      const result = workflow.transitionTo('fieldwork', 'lead-auditor');
      expect(result.success).toBe(true);
      expect(workflow.getAudit().phase).toBe('fieldwork');
    });

    it('should set actual start date when starting fieldwork', () => {
      workflow.addMilestone('Planning Complete', new Date());
      workflow.transitionTo('fieldwork', 'lead-auditor');

      expect(workflow.getAudit().actualStartDate).toBeDefined();
    });

    it('should require lead auditor for fieldwork', () => {
      const noLeadWorkflow = new AuditWorkflowManager({ name: 'Test' });
      noLeadWorkflow.addMilestone('Test', new Date());

      const { canTransition, blockers } = noLeadWorkflow.canTransitionTo('fieldwork');
      expect(canTransition).toBe(false);
      expect(blockers.some(b => b.includes('Lead auditor'))).toBe(true);
    });

    it('should require milestones for fieldwork', () => {
      const { canTransition, blockers } = workflow.canTransitionTo('fieldwork');
      expect(canTransition).toBe(false);
      expect(blockers.some(b => b.includes('milestones'))).toBe(true);
    });

    it('should require all controls tested for reporting', () => {
      workflow.addMilestone('Test', new Date());
      workflow.transitionTo('fieldwork', 'lead-auditor');

      workflow.recordControlTest({
        controlId: 'ctrl-1',
        result: 'pass',
        testedById: 'auditor-1',
        testedAt: new Date(),
        sampleSize: 25,
        exceptionsFound: 0,
      }, 'auditor-1');

      workflow.recordControlTest({
        controlId: 'ctrl-2',
        result: 'not_tested',
        testedById: 'auditor-1',
        testedAt: new Date(),
        sampleSize: 0,
        exceptionsFound: 0,
      }, 'auditor-1');

      const { canTransition, blockers } = workflow.canTransitionTo('reporting');
      expect(canTransition).toBe(false);
      expect(blockers.some(b => b.includes('not been tested'))).toBe(true);
    });

    it('should require approved workpapers for reporting', () => {
      workflow.addMilestone('Test', new Date());
      workflow.transitionTo('fieldwork', 'lead-auditor');

      workflow.createWorkpaper({
        reference: 'WP-001',
        title: 'Test Workpaper',
        status: 'draft',
        preparedById: 'auditor-1',
      });

      const { canTransition, blockers } = workflow.canTransitionTo('reporting');
      expect(canTransition).toBe(false);
      expect(blockers.some(b => b.includes('workpapers'))).toBe(true);
    });

    it('should complete full workflow', () => {
      // Planning
      workflow.addMilestone('Planning Complete', new Date());

      // Start fieldwork
      workflow.transitionTo('fieldwork', 'lead-auditor');

      // Create and approve workpaper
      const wp = workflow.createWorkpaper({
        reference: 'WP-001',
        title: 'Test Workpaper',
        status: 'draft',
        preparedById: 'auditor-1',
      });

      workflow.submitWorkpaperForReview(wp.id, 'auditor-1');
      workflow.reviewWorkpaper(wp.id, 'auditor-2', true);
      workflow.approveWorkpaper(wp.id, 'lead-auditor');

      // Record control test
      workflow.recordControlTest({
        controlId: 'ctrl-1',
        result: 'pass',
        testedById: 'auditor-1',
        testedAt: new Date(),
        sampleSize: 25,
        exceptionsFound: 0,
      }, 'auditor-1');

      // Move to reporting
      workflow.transitionTo('reporting', 'lead-auditor');
      expect(workflow.getAudit().phase).toBe('reporting');

      // Move to review
      workflow.transitionTo('review', 'lead-auditor');
      expect(workflow.getAudit().phase).toBe('review');

      // Complete
      workflow.transitionTo('completed', 'lead-auditor');
      expect(workflow.getAudit().phase).toBe('completed');
      expect(workflow.getAudit().actualEndDate).toBeDefined();
    });

    it('should not allow cancelling completed audit', () => {
      // Fast-track to completed
      workflow.addMilestone('Test', new Date());
      workflow.transitionTo('fieldwork', 'lead-auditor');

      // Create minimal workpaper
      const wp = workflow.createWorkpaper({
        reference: 'WP-001',
        title: 'Workpaper',
        status: 'draft',
        preparedById: 'auditor-1',
      });
      workflow.submitWorkpaperForReview(wp.id, 'auditor-1');
      workflow.reviewWorkpaper(wp.id, 'auditor-2', true);
      workflow.approveWorkpaper(wp.id, 'lead-auditor');

      workflow.transitionTo('reporting', 'lead-auditor');
      workflow.transitionTo('review', 'lead-auditor');
      workflow.transitionTo('completed', 'lead-auditor');

      const { canTransition, blockers } = workflow.canTransitionTo('cancelled');
      expect(canTransition).toBe(false);
      expect(blockers.some(b => b.includes('completed'))).toBe(true);
    });
  });

  describe('Workpaper Workflow', () => {
    beforeEach(() => {
      workflow.addMilestone('Test', new Date());
      workflow.transitionTo('fieldwork', 'lead-auditor');
    });

    it('should create workpaper in draft status', () => {
      const wp = workflow.createWorkpaper({
        reference: 'WP-001',
        title: 'Test Workpaper',
        status: 'draft',
        preparedById: 'auditor-1',
      });

      expect(wp.status).toBe('draft');
      expect(wp.preparedAt).toBeDefined();
    });

    it('should submit workpaper for review', () => {
      const wp = workflow.createWorkpaper({
        reference: 'WP-001',
        title: 'Test',
        status: 'draft',
        preparedById: 'auditor-1',
      });

      const result = workflow.submitWorkpaperForReview(wp.id, 'auditor-1');
      expect(result.success).toBe(true);

      const updated = workflow.getAudit().workpapers.find(w => w.id === wp.id);
      expect(updated?.status).toBe('in_review');
    });

    it('should only allow preparer to submit', () => {
      const wp = workflow.createWorkpaper({
        reference: 'WP-001',
        title: 'Test',
        status: 'draft',
        preparedById: 'auditor-1',
      });

      const result = workflow.submitWorkpaperForReview(wp.id, 'auditor-2');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Only the preparer');
    });

    it('should not allow self-review', () => {
      const wp = workflow.createWorkpaper({
        reference: 'WP-001',
        title: 'Test',
        status: 'draft',
        preparedById: 'auditor-1',
      });

      workflow.submitWorkpaperForReview(wp.id, 'auditor-1');
      const result = workflow.reviewWorkpaper(wp.id, 'auditor-1', true);

      expect(result.success).toBe(false);
      expect(result.error).toContain('cannot review their own');
    });

    it('should return workpaper to draft on rejection', () => {
      const wp = workflow.createWorkpaper({
        reference: 'WP-001',
        title: 'Test',
        status: 'draft',
        preparedById: 'auditor-1',
      });

      workflow.submitWorkpaperForReview(wp.id, 'auditor-1');
      workflow.reviewWorkpaper(wp.id, 'auditor-2', false, 'Needs more detail');

      const updated = workflow.getAudit().workpapers.find(w => w.id === wp.id);
      expect(updated?.status).toBe('draft');
      expect(updated?.reviewNotes).toContain('Needs more detail');
    });

    it('should require different person for approval', () => {
      const wp = workflow.createWorkpaper({
        reference: 'WP-001',
        title: 'Test',
        status: 'draft',
        preparedById: 'auditor-1',
      });

      workflow.submitWorkpaperForReview(wp.id, 'auditor-1');
      workflow.reviewWorkpaper(wp.id, 'auditor-2', true);

      const result1 = workflow.approveWorkpaper(wp.id, 'auditor-1');
      expect(result1.success).toBe(false);

      const result2 = workflow.approveWorkpaper(wp.id, 'auditor-2');
      expect(result2.success).toBe(false);

      const result3 = workflow.approveWorkpaper(wp.id, 'lead-auditor');
      expect(result3.success).toBe(true);
    });

    it('should require review before approval', () => {
      const wp = workflow.createWorkpaper({
        reference: 'WP-001',
        title: 'Test',
        status: 'draft',
        preparedById: 'auditor-1',
      });

      workflow.submitWorkpaperForReview(wp.id, 'auditor-1');

      const result = workflow.approveWorkpaper(wp.id, 'lead-auditor');
      expect(result.success).toBe(false);
      expect(result.error).toContain('must be reviewed');
    });
  });

  describe('Finding Workflow', () => {
    beforeEach(() => {
      workflow.addMilestone('Test', new Date());
      workflow.transitionTo('fieldwork', 'lead-auditor');
    });

    it('should create finding in draft status', () => {
      const finding = workflow.createFinding({
        title: 'Access Control Weakness',
        severity: 'high',
      }, 'auditor-1');

      expect(finding.status).toBe('draft');
    });

    it('should issue finding', () => {
      const finding = workflow.createFinding({
        title: 'Test Finding',
        severity: 'medium',
      }, 'auditor-1');

      const result = workflow.issueFinding(finding.id, 'lead-auditor');
      expect(result.success).toBe(true);

      const updated = workflow.getAudit().findings.find(f => f.id === finding.id);
      expect(updated?.status).toBe('open');
    });

    it('should assign remediation owner', () => {
      const finding = workflow.createFinding({
        title: 'Test Finding',
        severity: 'high',
      }, 'auditor-1');

      workflow.issueFinding(finding.id, 'lead-auditor');

      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const result = workflow.assignRemediationOwner(finding.id, 'control-owner', dueDate, 'lead-auditor');

      expect(result.success).toBe(true);
      const updated = workflow.getAudit().findings.find(f => f.id === finding.id);
      expect(updated?.assignedToId).toBe('control-owner');
      expect(updated?.status).toBe('remediation');
    });

    it('should complete finding remediation workflow', () => {
      const finding = workflow.createFinding({
        title: 'Test Finding',
        severity: 'high',
      }, 'auditor-1');

      // Issue
      workflow.issueFinding(finding.id, 'lead-auditor');

      // Assign
      workflow.assignRemediationOwner(finding.id, 'control-owner', new Date(), 'lead-auditor');

      // Submit remediation
      const submitResult = workflow.submitRemediationForValidation(
        finding.id,
        'Implemented new access controls',
        'control-owner'
      );
      expect(submitResult.success).toBe(true);

      // Validate
      const validateResult = workflow.validateRemediation(finding.id, 'auditor-1', true);
      expect(validateResult.success).toBe(true);

      const updated = workflow.getAudit().findings.find(f => f.id === finding.id);
      expect(updated?.status).toBe('closed');
    });

    it('should not allow owner to validate own remediation', () => {
      const finding = workflow.createFinding({
        title: 'Test Finding',
        severity: 'medium',
      }, 'auditor-1');

      workflow.issueFinding(finding.id, 'lead-auditor');
      workflow.assignRemediationOwner(finding.id, 'control-owner', new Date(), 'lead-auditor');
      workflow.submitRemediationForValidation(finding.id, 'Fixed', 'control-owner');

      const result = workflow.validateRemediation(finding.id, 'control-owner', true);
      expect(result.success).toBe(false);
      expect(result.error).toContain('cannot validate');
    });

    it('should return to remediation on validation rejection', () => {
      const finding = workflow.createFinding({
        title: 'Test Finding',
        severity: 'medium',
      }, 'auditor-1');

      workflow.issueFinding(finding.id, 'lead-auditor');
      workflow.assignRemediationOwner(finding.id, 'control-owner', new Date(), 'lead-auditor');
      workflow.submitRemediationForValidation(finding.id, 'Fixed', 'control-owner');
      workflow.validateRemediation(finding.id, 'auditor-1', false);

      const updated = workflow.getAudit().findings.find(f => f.id === finding.id);
      expect(updated?.status).toBe('remediation');
    });

    it('should allow risk acceptance', () => {
      const finding = workflow.createFinding({
        title: 'Low Risk Finding',
        severity: 'low',
      }, 'auditor-1');

      workflow.issueFinding(finding.id, 'lead-auditor');

      const result = workflow.acceptRisk(finding.id, 'management');
      expect(result.success).toBe(true);

      const updated = workflow.getAudit().findings.find(f => f.id === finding.id);
      expect(updated?.status).toBe('accepted');
    });
  });

  describe('Approval Workflow', () => {
    it('should create pending approval', () => {
      const approval = workflow.requestApproval('phase_transition', 'lead-auditor');

      expect(approval.status).toBe('pending');
      expect(approval.requestedById).toBe('lead-auditor');
    });

    it('should approve request', () => {
      const approval = workflow.requestApproval('report', 'lead-auditor');
      const result = workflow.processApproval(approval.id, 'manager', true, 'Looks good');

      expect(result.success).toBe(true);
      const updated = workflow.getAudit().approvals.find(a => a.id === approval.id);
      expect(updated?.status).toBe('approved');
      expect(updated?.approvedById).toBe('manager');
    });

    it('should reject request', () => {
      const approval = workflow.requestApproval('report', 'lead-auditor');
      const result = workflow.processApproval(approval.id, 'manager', false, 'Needs revision');

      expect(result.success).toBe(true);
      const updated = workflow.getAudit().approvals.find(a => a.id === approval.id);
      expect(updated?.status).toBe('rejected');
      expect(updated?.rejectedById).toBe('manager');
      expect(updated?.comments).toBe('Needs revision');
    });

    it('should not allow self-approval', () => {
      const approval = workflow.requestApproval('report', 'lead-auditor');
      const result = workflow.processApproval(approval.id, 'lead-auditor', true);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot approve own');
    });

    it('should not process already processed approval', () => {
      const approval = workflow.requestApproval('report', 'lead-auditor');
      workflow.processApproval(approval.id, 'manager', true);

      const result = workflow.processApproval(approval.id, 'executive', true);
      expect(result.success).toBe(false);
      expect(result.error).toContain('already processed');
    });
  });

  describe('Milestone Tracking', () => {
    it('should add milestone', () => {
      const milestone = workflow.addMilestone('Planning Complete', new Date('2024-01-15'));

      expect(milestone.status).toBe('pending');
      expect(workflow.getAudit().milestones.length).toBe(1);
    });

    it('should complete milestone on time', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-10'));

      const milestone = workflow.addMilestone('Planning Complete', new Date('2024-01-15'));
      workflow.completeMilestone(milestone.id, 'lead-auditor');

      const updated = workflow.getAudit().milestones.find(m => m.id === milestone.id);
      expect(updated?.status).toBe('completed');

      vi.useRealTimers();
    });

    it('should mark overdue milestone', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-20'));

      const milestone = workflow.addMilestone('Planning Complete', new Date('2024-01-15'));
      workflow.completeMilestone(milestone.id, 'lead-auditor');

      const updated = workflow.getAudit().milestones.find(m => m.id === milestone.id);
      expect(updated?.status).toBe('overdue');

      vi.useRealTimers();
    });
  });

  describe('Progress Tracking', () => {
    beforeEach(() => {
      workflow.addMilestone('Test', new Date());
      workflow.transitionTo('fieldwork', 'lead-auditor');
    });

    it('should calculate workpaper progress', () => {
      // Create 4 workpapers
      for (let i = 0; i < 4; i++) {
        const wp = workflow.createWorkpaper({
          reference: `WP-00${i}`,
          title: `Workpaper ${i}`,
          status: 'draft',
          preparedById: 'auditor-1',
        });

        if (i < 2) {
          workflow.submitWorkpaperForReview(wp.id, 'auditor-1');
          workflow.reviewWorkpaper(wp.id, 'auditor-2', true);
          workflow.approveWorkpaper(wp.id, 'lead-auditor');
        }
      }

      const progress = workflow.getProgress();
      expect(progress.workpaperProgress).toBe(50); // 2 of 4
    });

    it('should calculate testing progress', () => {
      workflow.recordControlTest({
        controlId: 'ctrl-1',
        result: 'pass',
        testedById: 'auditor-1',
        testedAt: new Date(),
        sampleSize: 25,
        exceptionsFound: 0,
      }, 'auditor-1');

      workflow.recordControlTest({
        controlId: 'ctrl-2',
        result: 'not_tested',
        testedById: 'auditor-1',
        testedAt: new Date(),
        sampleSize: 0,
        exceptionsFound: 0,
      }, 'auditor-1');

      const progress = workflow.getProgress();
      expect(progress.testingProgress).toBe(50);
    });

    it('should calculate findings resolved', () => {
      const finding1 = workflow.createFinding({ title: 'Finding 1', severity: 'high' }, 'auditor-1');
      workflow.createFinding({ title: 'Finding 2', severity: 'medium' }, 'auditor-1');

      workflow.issueFinding(finding1.id, 'lead-auditor');
      workflow.acceptRisk(finding1.id, 'management');

      const progress = workflow.getProgress();
      expect(progress.findingsResolved).toBe(50);
    });

    it('should calculate milestone progress', () => {
      const m1 = workflow.addMilestone('M1', new Date());
      workflow.addMilestone('M2', new Date());

      workflow.completeMilestone(m1.id, 'lead-auditor');

      const progress = workflow.getProgress();
      expect(progress.milestonesCompleted).toBe(50);
    });
  });

  describe('Audit Logging', () => {
    it('should log phase transitions', () => {
      workflow.addMilestone('Test', new Date());
      workflow.transitionTo('fieldwork', 'lead-auditor');

      const logs = workflow.getLogs();
      expect(logs.some(l => l.action === 'phase_transition')).toBe(true);
    });

    it('should log workpaper actions', () => {
      workflow.addMilestone('Test', new Date());
      workflow.transitionTo('fieldwork', 'lead-auditor');

      const wp = workflow.createWorkpaper({
        reference: 'WP-001',
        title: 'Test',
        status: 'draft',
        preparedById: 'auditor-1',
      });

      const logs = workflow.getLogs();
      expect(logs.some(l => l.action === 'workpaper_created')).toBe(true);
    });

    it('should log finding actions', () => {
      workflow.addMilestone('Test', new Date());
      workflow.transitionTo('fieldwork', 'lead-auditor');

      workflow.createFinding({ title: 'Test', severity: 'high' }, 'auditor-1');

      const logs = workflow.getLogs();
      expect(logs.some(l => l.action === 'finding_created')).toBe(true);
    });

    it('should include timestamp, user, and details', () => {
      workflow.addMilestone('Test', new Date());
      workflow.transitionTo('fieldwork', 'lead-auditor');

      const logs = workflow.getLogs();
      const phaseLog = logs.find(l => l.action === 'phase_transition');

      expect(phaseLog?.timestamp).toBeDefined();
      expect(phaseLog?.userId).toBe('lead-auditor');
      expect(phaseLog?.details).toContain('fieldwork');
    });
  });
});
