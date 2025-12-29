import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Workflow State Machine Tests
 * Comprehensive testing of state transitions, guards, and business rules
 * Critical for maintaining audit workflow integrity
 */

// ============================================================================
// STATE MACHINE TYPES
// ============================================================================
type AuditState = 'draft' | 'planned' | 'fieldwork' | 'review' | 'reporting' | 'completed' | 'cancelled';
type WorkpaperState = 'draft' | 'in_progress' | 'prepared' | 'reviewed' | 'approved' | 'archived';
type FindingState = 'identified' | 'confirmed' | 'remediation' | 'validated' | 'closed';
type IssueState = 'open' | 'in_progress' | 'pending_review' | 'resolved' | 'closed' | 'reopened';
type CertificationState = 'pending' | 'in_review' | 'approved' | 'rejected' | 'expired';

interface Transition<S extends string> {
  from: S;
  to: S;
  event: string;
  guards?: ((context: any) => boolean)[];
  actions?: ((context: any) => void)[];
}

interface StateMachineConfig<S extends string> {
  initial: S;
  states: S[];
  transitions: Transition<S>[];
  onTransition?: (from: S, to: S, event: string) => void;
}

// ============================================================================
// STATE MACHINE IMPLEMENTATION
// ============================================================================
class StateMachine<S extends string> {
  private currentState: S;
  private config: StateMachineConfig<S>;
  private history: { from: S; to: S; event: string; timestamp: Date }[];

  constructor(config: StateMachineConfig<S>) {
    this.config = config;
    this.currentState = config.initial;
    this.history = [];
  }

  getState(): S {
    return this.currentState;
  }

  getHistory(): { from: S; to: S; event: string; timestamp: Date }[] {
    return [...this.history];
  }

  canTransition(event: string, context?: any): boolean {
    const transition = this.findTransition(event);
    if (!transition) return false;

    if (transition.guards) {
      return transition.guards.every(guard => guard(context || {}));
    }

    return true;
  }

  transition(event: string, context?: any): { success: boolean; error?: string } {
    const transition = this.findTransition(event);

    if (!transition) {
      return {
        success: false,
        error: `No transition '${event}' from state '${this.currentState}'`,
      };
    }

    if (transition.guards) {
      const failedGuard = transition.guards.find(guard => !guard(context || {}));
      if (failedGuard) {
        return {
          success: false,
          error: `Guard condition failed for transition '${event}'`,
        };
      }
    }

    const previousState = this.currentState;
    this.currentState = transition.to;

    // Execute actions
    if (transition.actions) {
      transition.actions.forEach(action => action(context || {}));
    }

    // Record history
    this.history.push({
      from: previousState,
      to: this.currentState,
      event,
      timestamp: new Date(),
    });

    // Call onTransition callback
    if (this.config.onTransition) {
      this.config.onTransition(previousState, this.currentState, event);
    }

    return { success: true };
  }

  getAvailableTransitions(context?: any): string[] {
    return this.config.transitions
      .filter(t => t.from === this.currentState)
      .filter(t => !t.guards || t.guards.every(guard => guard(context || {})))
      .map(t => t.event);
  }

  reset(): void {
    this.currentState = this.config.initial;
    this.history = [];
  }

  private findTransition(event: string): Transition<S> | undefined {
    return this.config.transitions.find(
      t => t.from === this.currentState && t.event === event
    );
  }
}

// ============================================================================
// AUDIT WORKFLOW STATE MACHINE
// ============================================================================
function createAuditStateMachine(): StateMachine<AuditState> {
  return new StateMachine<AuditState>({
    initial: 'draft',
    states: ['draft', 'planned', 'fieldwork', 'review', 'reporting', 'completed', 'cancelled'],
    transitions: [
      { from: 'draft', to: 'planned', event: 'PLAN' },
      { from: 'draft', to: 'cancelled', event: 'CANCEL' },
      { from: 'planned', to: 'fieldwork', event: 'START_FIELDWORK' },
      { from: 'planned', to: 'draft', event: 'REVISE' },
      { from: 'planned', to: 'cancelled', event: 'CANCEL' },
      { from: 'fieldwork', to: 'review', event: 'COMPLETE_FIELDWORK' },
      { from: 'fieldwork', to: 'planned', event: 'RETURN_TO_PLANNING' },
      { from: 'fieldwork', to: 'cancelled', event: 'CANCEL' },
      { from: 'review', to: 'fieldwork', event: 'REQUEST_MORE_WORK' },
      { from: 'review', to: 'reporting', event: 'APPROVE_REVIEW' },
      { from: 'review', to: 'cancelled', event: 'CANCEL' },
      { from: 'reporting', to: 'review', event: 'REVISE_REPORT' },
      { from: 'reporting', to: 'completed', event: 'FINALIZE' },
      { from: 'completed', to: 'reporting', event: 'REOPEN' },
    ],
  });
}

// ============================================================================
// WORKPAPER WORKFLOW STATE MACHINE
// ============================================================================
function createWorkpaperStateMachine(context: {
  hasEvidence?: boolean;
  hasSignoff?: boolean;
  reviewerApproved?: boolean;
}): StateMachine<WorkpaperState> {
  return new StateMachine<WorkpaperState>({
    initial: 'draft',
    states: ['draft', 'in_progress', 'prepared', 'reviewed', 'approved', 'archived'],
    transitions: [
      { from: 'draft', to: 'in_progress', event: 'START_WORK' },
      {
        from: 'in_progress',
        to: 'prepared',
        event: 'SUBMIT_FOR_REVIEW',
        guards: [
          (ctx) => ctx.hasEvidence === true,
          (ctx) => ctx.hasSignoff === true,
        ],
      },
      { from: 'in_progress', to: 'draft', event: 'SAVE_DRAFT' },
      {
        from: 'prepared',
        to: 'reviewed',
        event: 'COMPLETE_REVIEW',
        guards: [(ctx) => ctx.reviewerApproved === true],
      },
      { from: 'prepared', to: 'in_progress', event: 'RETURN_FOR_REWORK' },
      { from: 'reviewed', to: 'approved', event: 'APPROVE' },
      { from: 'reviewed', to: 'prepared', event: 'REQUEST_CHANGES' },
      { from: 'approved', to: 'archived', event: 'ARCHIVE' },
      { from: 'approved', to: 'reviewed', event: 'REVOKE_APPROVAL' },
    ],
  });
}

// ============================================================================
// FINDING WORKFLOW STATE MACHINE
// ============================================================================
function createFindingStateMachine(): StateMachine<FindingState> {
  return new StateMachine<FindingState>({
    initial: 'identified',
    states: ['identified', 'confirmed', 'remediation', 'validated', 'closed'],
    transitions: [
      { from: 'identified', to: 'confirmed', event: 'CONFIRM' },
      { from: 'identified', to: 'closed', event: 'DISMISS' },
      { from: 'confirmed', to: 'remediation', event: 'START_REMEDIATION' },
      { from: 'confirmed', to: 'closed', event: 'ACCEPT_RISK' },
      { from: 'remediation', to: 'validated', event: 'COMPLETE_REMEDIATION' },
      { from: 'remediation', to: 'confirmed', event: 'REMEDIATION_FAILED' },
      { from: 'validated', to: 'closed', event: 'CLOSE' },
      { from: 'validated', to: 'remediation', event: 'REOPEN_REMEDIATION' },
      { from: 'closed', to: 'identified', event: 'REOPEN' },
    ],
  });
}

// ============================================================================
// ISSUE WORKFLOW STATE MACHINE
// ============================================================================
function createIssueStateMachine(context: {
  hasOwner?: boolean;
  hasResolution?: boolean;
  reviewApproved?: boolean;
}): StateMachine<IssueState> {
  return new StateMachine<IssueState>({
    initial: 'open',
    states: ['open', 'in_progress', 'pending_review', 'resolved', 'closed', 'reopened'],
    transitions: [
      {
        from: 'open',
        to: 'in_progress',
        event: 'ASSIGN',
        guards: [(ctx) => ctx.hasOwner === true],
      },
      { from: 'open', to: 'closed', event: 'CLOSE_AS_INVALID' },
      {
        from: 'in_progress',
        to: 'pending_review',
        event: 'SUBMIT_RESOLUTION',
        guards: [(ctx) => ctx.hasResolution === true],
      },
      { from: 'in_progress', to: 'open', event: 'UNASSIGN' },
      {
        from: 'pending_review',
        to: 'resolved',
        event: 'APPROVE_RESOLUTION',
        guards: [(ctx) => ctx.reviewApproved === true],
      },
      { from: 'pending_review', to: 'in_progress', event: 'REJECT_RESOLUTION' },
      { from: 'resolved', to: 'closed', event: 'CLOSE' },
      { from: 'resolved', to: 'reopened', event: 'REOPEN' },
      { from: 'closed', to: 'reopened', event: 'REOPEN' },
      { from: 'reopened', to: 'in_progress', event: 'ASSIGN' },
    ],
  });
}

// ============================================================================
// CERTIFICATION WORKFLOW STATE MACHINE
// ============================================================================
function createCertificationStateMachine(context: {
  allControlsAssessed?: boolean;
  cfoSigned?: boolean;
  ceoSigned?: boolean;
}): StateMachine<CertificationState> {
  return new StateMachine<CertificationState>({
    initial: 'pending',
    states: ['pending', 'in_review', 'approved', 'rejected', 'expired'],
    transitions: [
      {
        from: 'pending',
        to: 'in_review',
        event: 'SUBMIT_FOR_CERTIFICATION',
        guards: [(ctx) => ctx.allControlsAssessed === true],
      },
      {
        from: 'in_review',
        to: 'approved',
        event: 'APPROVE',
        guards: [
          (ctx) => ctx.cfoSigned === true,
          (ctx) => ctx.ceoSigned === true,
        ],
      },
      { from: 'in_review', to: 'rejected', event: 'REJECT' },
      { from: 'in_review', to: 'pending', event: 'RETURN_FOR_REVISION' },
      { from: 'approved', to: 'expired', event: 'EXPIRE' },
      { from: 'rejected', to: 'pending', event: 'REVISE' },
      { from: 'expired', to: 'pending', event: 'RENEW' },
    ],
  });
}

// ============================================================================
// TESTS
// ============================================================================

describe('Audit Workflow State Machine', () => {
  let machine: StateMachine<AuditState>;

  beforeEach(() => {
    machine = createAuditStateMachine();
  });

  describe('Initial State', () => {
    it('should start in draft state', () => {
      expect(machine.getState()).toBe('draft');
    });

    it('should have empty history initially', () => {
      expect(machine.getHistory()).toHaveLength(0);
    });
  });

  describe('Happy Path', () => {
    it('should complete full audit lifecycle', () => {
      expect(machine.transition('PLAN').success).toBe(true);
      expect(machine.getState()).toBe('planned');

      expect(machine.transition('START_FIELDWORK').success).toBe(true);
      expect(machine.getState()).toBe('fieldwork');

      expect(machine.transition('COMPLETE_FIELDWORK').success).toBe(true);
      expect(machine.getState()).toBe('review');

      expect(machine.transition('APPROVE_REVIEW').success).toBe(true);
      expect(machine.getState()).toBe('reporting');

      expect(machine.transition('FINALIZE').success).toBe(true);
      expect(machine.getState()).toBe('completed');

      expect(machine.getHistory()).toHaveLength(5);
    });
  });

  describe('Backward Transitions', () => {
    it('should allow revision from planned to draft', () => {
      machine.transition('PLAN');
      expect(machine.transition('REVISE').success).toBe(true);
      expect(machine.getState()).toBe('draft');
    });

    it('should allow return to planning from fieldwork', () => {
      machine.transition('PLAN');
      machine.transition('START_FIELDWORK');
      expect(machine.transition('RETURN_TO_PLANNING').success).toBe(true);
      expect(machine.getState()).toBe('planned');
    });

    it('should allow request for more work during review', () => {
      machine.transition('PLAN');
      machine.transition('START_FIELDWORK');
      machine.transition('COMPLETE_FIELDWORK');
      expect(machine.transition('REQUEST_MORE_WORK').success).toBe(true);
      expect(machine.getState()).toBe('fieldwork');
    });

    it('should allow report revision', () => {
      machine.transition('PLAN');
      machine.transition('START_FIELDWORK');
      machine.transition('COMPLETE_FIELDWORK');
      machine.transition('APPROVE_REVIEW');
      expect(machine.transition('REVISE_REPORT').success).toBe(true);
      expect(machine.getState()).toBe('review');
    });

    it('should allow reopening completed audit', () => {
      machine.transition('PLAN');
      machine.transition('START_FIELDWORK');
      machine.transition('COMPLETE_FIELDWORK');
      machine.transition('APPROVE_REVIEW');
      machine.transition('FINALIZE');
      expect(machine.transition('REOPEN').success).toBe(true);
      expect(machine.getState()).toBe('reporting');
    });
  });

  describe('Cancellation', () => {
    it('should allow cancellation from draft', () => {
      expect(machine.transition('CANCEL').success).toBe(true);
      expect(machine.getState()).toBe('cancelled');
    });

    it('should allow cancellation from planned', () => {
      machine.transition('PLAN');
      expect(machine.transition('CANCEL').success).toBe(true);
      expect(machine.getState()).toBe('cancelled');
    });

    it('should allow cancellation from fieldwork', () => {
      machine.transition('PLAN');
      machine.transition('START_FIELDWORK');
      expect(machine.transition('CANCEL').success).toBe(true);
      expect(machine.getState()).toBe('cancelled');
    });

    it('should allow cancellation from review', () => {
      machine.transition('PLAN');
      machine.transition('START_FIELDWORK');
      machine.transition('COMPLETE_FIELDWORK');
      expect(machine.transition('CANCEL').success).toBe(true);
      expect(machine.getState()).toBe('cancelled');
    });

    it('should not allow transitions from cancelled state', () => {
      machine.transition('CANCEL');
      expect(machine.transition('PLAN').success).toBe(false);
      expect(machine.getState()).toBe('cancelled');
    });
  });

  describe('Invalid Transitions', () => {
    it('should not allow skipping planned state', () => {
      expect(machine.transition('START_FIELDWORK').success).toBe(false);
      expect(machine.getState()).toBe('draft');
    });

    it('should not allow finalizing from review', () => {
      machine.transition('PLAN');
      machine.transition('START_FIELDWORK');
      machine.transition('COMPLETE_FIELDWORK');
      expect(machine.transition('FINALIZE').success).toBe(false);
    });

    it('should return error message for invalid transition', () => {
      const result = machine.transition('INVALID_EVENT');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Available Transitions', () => {
    it('should list available transitions from draft', () => {
      const available = machine.getAvailableTransitions();
      expect(available).toContain('PLAN');
      expect(available).toContain('CANCEL');
      expect(available).not.toContain('START_FIELDWORK');
    });

    it('should list available transitions from fieldwork', () => {
      machine.transition('PLAN');
      machine.transition('START_FIELDWORK');
      const available = machine.getAvailableTransitions();
      expect(available).toContain('COMPLETE_FIELDWORK');
      expect(available).toContain('RETURN_TO_PLANNING');
      expect(available).toContain('CANCEL');
    });
  });

  describe('History Tracking', () => {
    it('should track all transitions in history', () => {
      machine.transition('PLAN');
      machine.transition('START_FIELDWORK');
      machine.transition('RETURN_TO_PLANNING');
      machine.transition('START_FIELDWORK');

      const history = machine.getHistory();
      expect(history).toHaveLength(4);
      expect(history[0].event).toBe('PLAN');
      expect(history[1].event).toBe('START_FIELDWORK');
      expect(history[2].event).toBe('RETURN_TO_PLANNING');
      expect(history[3].event).toBe('START_FIELDWORK');
    });

    it('should record timestamps in history', () => {
      machine.transition('PLAN');
      const history = machine.getHistory();
      expect(history[0].timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Reset', () => {
    it('should reset to initial state', () => {
      machine.transition('PLAN');
      machine.transition('START_FIELDWORK');
      machine.reset();
      expect(machine.getState()).toBe('draft');
    });

    it('should clear history on reset', () => {
      machine.transition('PLAN');
      machine.transition('START_FIELDWORK');
      machine.reset();
      expect(machine.getHistory()).toHaveLength(0);
    });
  });
});

describe('Workpaper Workflow State Machine', () => {
  describe('Guard Conditions', () => {
    it('should block submission without evidence', () => {
      const machine = createWorkpaperStateMachine({
        hasEvidence: false,
        hasSignoff: true,
      });
      machine.transition('START_WORK');
      expect(machine.canTransition('SUBMIT_FOR_REVIEW', { hasEvidence: false, hasSignoff: true })).toBe(false);
    });

    it('should block submission without signoff', () => {
      const machine = createWorkpaperStateMachine({
        hasEvidence: true,
        hasSignoff: false,
      });
      machine.transition('START_WORK');
      expect(machine.canTransition('SUBMIT_FOR_REVIEW', { hasEvidence: true, hasSignoff: false })).toBe(false);
    });

    it('should allow submission with evidence and signoff', () => {
      const machine = createWorkpaperStateMachine({
        hasEvidence: true,
        hasSignoff: true,
      });
      machine.transition('START_WORK');
      expect(machine.canTransition('SUBMIT_FOR_REVIEW', { hasEvidence: true, hasSignoff: true })).toBe(true);
    });

    it('should block review completion without approval', () => {
      const machine = createWorkpaperStateMachine({
        hasEvidence: true,
        hasSignoff: true,
        reviewerApproved: false,
      });
      machine.transition('START_WORK');
      machine.transition('SUBMIT_FOR_REVIEW', { hasEvidence: true, hasSignoff: true });
      expect(machine.canTransition('COMPLETE_REVIEW', { reviewerApproved: false })).toBe(false);
    });
  });

  describe('Three-Way Review Process', () => {
    it('should complete full three-way review', () => {
      const machine = createWorkpaperStateMachine({});

      // Preparer
      machine.transition('START_WORK');
      expect(machine.getState()).toBe('in_progress');

      machine.transition('SUBMIT_FOR_REVIEW', { hasEvidence: true, hasSignoff: true });
      expect(machine.getState()).toBe('prepared');

      // Reviewer
      machine.transition('COMPLETE_REVIEW', { reviewerApproved: true });
      expect(machine.getState()).toBe('reviewed');

      // Approver
      machine.transition('APPROVE');
      expect(machine.getState()).toBe('approved');

      // Archive
      machine.transition('ARCHIVE');
      expect(machine.getState()).toBe('archived');
    });

    it('should allow rework at each stage', () => {
      const machine = createWorkpaperStateMachine({});

      machine.transition('START_WORK');
      machine.transition('SUBMIT_FOR_REVIEW', { hasEvidence: true, hasSignoff: true });

      // Reviewer returns for rework
      machine.transition('RETURN_FOR_REWORK');
      expect(machine.getState()).toBe('in_progress');

      machine.transition('SUBMIT_FOR_REVIEW', { hasEvidence: true, hasSignoff: true });
      machine.transition('COMPLETE_REVIEW', { reviewerApproved: true });

      // Approver requests changes
      machine.transition('REQUEST_CHANGES');
      expect(machine.getState()).toBe('prepared');
    });

    it('should allow approval revocation', () => {
      const machine = createWorkpaperStateMachine({});

      machine.transition('START_WORK');
      machine.transition('SUBMIT_FOR_REVIEW', { hasEvidence: true, hasSignoff: true });
      machine.transition('COMPLETE_REVIEW', { reviewerApproved: true });
      machine.transition('APPROVE');

      machine.transition('REVOKE_APPROVAL');
      expect(machine.getState()).toBe('reviewed');
    });
  });
});

describe('Finding Workflow State Machine', () => {
  let machine: StateMachine<FindingState>;

  beforeEach(() => {
    machine = createFindingStateMachine();
  });

  describe('Finding Lifecycle', () => {
    it('should complete full remediation lifecycle', () => {
      expect(machine.getState()).toBe('identified');

      machine.transition('CONFIRM');
      expect(machine.getState()).toBe('confirmed');

      machine.transition('START_REMEDIATION');
      expect(machine.getState()).toBe('remediation');

      machine.transition('COMPLETE_REMEDIATION');
      expect(machine.getState()).toBe('validated');

      machine.transition('CLOSE');
      expect(machine.getState()).toBe('closed');
    });

    it('should allow dismissing unconfirmed finding', () => {
      machine.transition('DISMISS');
      expect(machine.getState()).toBe('closed');
    });

    it('should allow accepting risk instead of remediation', () => {
      machine.transition('CONFIRM');
      machine.transition('ACCEPT_RISK');
      expect(machine.getState()).toBe('closed');
    });

    it('should allow remediation failure and retry', () => {
      machine.transition('CONFIRM');
      machine.transition('START_REMEDIATION');
      machine.transition('REMEDIATION_FAILED');
      expect(machine.getState()).toBe('confirmed');

      // Retry remediation
      machine.transition('START_REMEDIATION');
      expect(machine.getState()).toBe('remediation');
    });

    it('should allow reopening closed finding', () => {
      machine.transition('CONFIRM');
      machine.transition('START_REMEDIATION');
      machine.transition('COMPLETE_REMEDIATION');
      machine.transition('CLOSE');

      machine.transition('REOPEN');
      expect(machine.getState()).toBe('identified');
    });

    it('should allow reopening remediation from validated', () => {
      machine.transition('CONFIRM');
      machine.transition('START_REMEDIATION');
      machine.transition('COMPLETE_REMEDIATION');

      machine.transition('REOPEN_REMEDIATION');
      expect(machine.getState()).toBe('remediation');
    });
  });
});

describe('Issue Workflow State Machine', () => {
  describe('Guard Conditions', () => {
    it('should block assignment without owner', () => {
      const machine = createIssueStateMachine({ hasOwner: false });
      expect(machine.canTransition('ASSIGN', { hasOwner: false })).toBe(false);
    });

    it('should allow assignment with owner', () => {
      const machine = createIssueStateMachine({ hasOwner: true });
      expect(machine.canTransition('ASSIGN', { hasOwner: true })).toBe(true);
    });

    it('should block resolution submission without resolution', () => {
      const machine = createIssueStateMachine({ hasOwner: true, hasResolution: false });
      machine.transition('ASSIGN', { hasOwner: true });
      expect(machine.canTransition('SUBMIT_RESOLUTION', { hasResolution: false })).toBe(false);
    });

    it('should block resolution approval without review', () => {
      const machine = createIssueStateMachine({
        hasOwner: true,
        hasResolution: true,
        reviewApproved: false,
      });
      machine.transition('ASSIGN', { hasOwner: true });
      machine.transition('SUBMIT_RESOLUTION', { hasResolution: true });
      expect(machine.canTransition('APPROVE_RESOLUTION', { reviewApproved: false })).toBe(false);
    });
  });

  describe('Issue Lifecycle', () => {
    it('should complete full issue lifecycle', () => {
      const machine = createIssueStateMachine({});

      machine.transition('ASSIGN', { hasOwner: true });
      expect(machine.getState()).toBe('in_progress');

      machine.transition('SUBMIT_RESOLUTION', { hasResolution: true });
      expect(machine.getState()).toBe('pending_review');

      machine.transition('APPROVE_RESOLUTION', { reviewApproved: true });
      expect(machine.getState()).toBe('resolved');

      machine.transition('CLOSE');
      expect(machine.getState()).toBe('closed');
    });

    it('should allow closing as invalid from open', () => {
      const machine = createIssueStateMachine({});
      machine.transition('CLOSE_AS_INVALID');
      expect(machine.getState()).toBe('closed');
    });

    it('should allow rejection and rework', () => {
      const machine = createIssueStateMachine({});

      machine.transition('ASSIGN', { hasOwner: true });
      machine.transition('SUBMIT_RESOLUTION', { hasResolution: true });
      machine.transition('REJECT_RESOLUTION');
      expect(machine.getState()).toBe('in_progress');
    });

    it('should allow reopening resolved issues', () => {
      const machine = createIssueStateMachine({});

      machine.transition('ASSIGN', { hasOwner: true });
      machine.transition('SUBMIT_RESOLUTION', { hasResolution: true });
      machine.transition('APPROVE_RESOLUTION', { reviewApproved: true });
      machine.transition('REOPEN');
      expect(machine.getState()).toBe('reopened');
    });

    it('should allow reopening closed issues', () => {
      const machine = createIssueStateMachine({});

      machine.transition('ASSIGN', { hasOwner: true });
      machine.transition('SUBMIT_RESOLUTION', { hasResolution: true });
      machine.transition('APPROVE_RESOLUTION', { reviewApproved: true });
      machine.transition('CLOSE');
      machine.transition('REOPEN');
      expect(machine.getState()).toBe('reopened');
    });

    it('should allow assigning reopened issues', () => {
      const machine = createIssueStateMachine({});

      machine.transition('ASSIGN', { hasOwner: true });
      machine.transition('SUBMIT_RESOLUTION', { hasResolution: true });
      machine.transition('APPROVE_RESOLUTION', { reviewApproved: true });
      machine.transition('REOPEN');
      machine.transition('ASSIGN', { hasOwner: true });
      expect(machine.getState()).toBe('in_progress');
    });
  });
});

describe('Certification Workflow State Machine', () => {
  describe('Guard Conditions', () => {
    it('should block certification without all controls assessed', () => {
      const machine = createCertificationStateMachine({ allControlsAssessed: false });
      expect(machine.canTransition('SUBMIT_FOR_CERTIFICATION', { allControlsAssessed: false })).toBe(false);
    });

    it('should block approval without CFO signature', () => {
      const machine = createCertificationStateMachine({
        allControlsAssessed: true,
        cfoSigned: false,
        ceoSigned: true,
      });
      machine.transition('SUBMIT_FOR_CERTIFICATION', { allControlsAssessed: true });
      expect(machine.canTransition('APPROVE', { cfoSigned: false, ceoSigned: true })).toBe(false);
    });

    it('should block approval without CEO signature', () => {
      const machine = createCertificationStateMachine({
        allControlsAssessed: true,
        cfoSigned: true,
        ceoSigned: false,
      });
      machine.transition('SUBMIT_FOR_CERTIFICATION', { allControlsAssessed: true });
      expect(machine.canTransition('APPROVE', { cfoSigned: true, ceoSigned: false })).toBe(false);
    });

    it('should allow approval with both signatures', () => {
      const machine = createCertificationStateMachine({
        allControlsAssessed: true,
        cfoSigned: true,
        ceoSigned: true,
      });
      machine.transition('SUBMIT_FOR_CERTIFICATION', { allControlsAssessed: true });
      expect(machine.canTransition('APPROVE', { cfoSigned: true, ceoSigned: true })).toBe(true);
    });
  });

  describe('Certification Lifecycle', () => {
    it('should complete full certification lifecycle', () => {
      const machine = createCertificationStateMachine({});

      machine.transition('SUBMIT_FOR_CERTIFICATION', { allControlsAssessed: true });
      expect(machine.getState()).toBe('in_review');

      machine.transition('APPROVE', { cfoSigned: true, ceoSigned: true });
      expect(machine.getState()).toBe('approved');
    });

    it('should handle rejection and revision', () => {
      const machine = createCertificationStateMachine({});

      machine.transition('SUBMIT_FOR_CERTIFICATION', { allControlsAssessed: true });
      machine.transition('REJECT');
      expect(machine.getState()).toBe('rejected');

      machine.transition('REVISE');
      expect(machine.getState()).toBe('pending');
    });

    it('should handle return for revision', () => {
      const machine = createCertificationStateMachine({});

      machine.transition('SUBMIT_FOR_CERTIFICATION', { allControlsAssessed: true });
      machine.transition('RETURN_FOR_REVISION');
      expect(machine.getState()).toBe('pending');
    });

    it('should handle expiration', () => {
      const machine = createCertificationStateMachine({});

      machine.transition('SUBMIT_FOR_CERTIFICATION', { allControlsAssessed: true });
      machine.transition('APPROVE', { cfoSigned: true, ceoSigned: true });
      machine.transition('EXPIRE');
      expect(machine.getState()).toBe('expired');
    });

    it('should handle renewal after expiration', () => {
      const machine = createCertificationStateMachine({});

      machine.transition('SUBMIT_FOR_CERTIFICATION', { allControlsAssessed: true });
      machine.transition('APPROVE', { cfoSigned: true, ceoSigned: true });
      machine.transition('EXPIRE');
      machine.transition('RENEW');
      expect(machine.getState()).toBe('pending');
    });
  });
});

describe('State Machine Edge Cases', () => {
  describe('Concurrent Transitions', () => {
    it('should handle rapid successive transitions', () => {
      const machine = createAuditStateMachine();

      // Rapid transitions
      machine.transition('PLAN');
      machine.transition('START_FIELDWORK');
      machine.transition('COMPLETE_FIELDWORK');
      machine.transition('APPROVE_REVIEW');
      machine.transition('FINALIZE');

      expect(machine.getState()).toBe('completed');
      expect(machine.getHistory()).toHaveLength(5);
    });
  });

  describe('Self-Transitions', () => {
    it('should not allow undefined self-transitions', () => {
      const machine = createAuditStateMachine();
      machine.transition('PLAN');

      // Try to transition to same state with invalid event
      const result = machine.transition('PLAN');
      expect(result.success).toBe(false);
    });
  });

  describe('Actions Execution', () => {
    it('should execute actions on transition', () => {
      let actionExecuted = false;

      const machine = new StateMachine<'a' | 'b'>({
        initial: 'a',
        states: ['a', 'b'],
        transitions: [
          {
            from: 'a',
            to: 'b',
            event: 'GO',
            actions: [() => { actionExecuted = true; }],
          },
        ],
      });

      machine.transition('GO');
      expect(actionExecuted).toBe(true);
    });

    it('should pass context to actions', () => {
      let receivedContext: any = null;

      const machine = new StateMachine<'a' | 'b'>({
        initial: 'a',
        states: ['a', 'b'],
        transitions: [
          {
            from: 'a',
            to: 'b',
            event: 'GO',
            actions: [(ctx) => { receivedContext = ctx; }],
          },
        ],
      });

      machine.transition('GO', { userId: 'test-user' });
      expect(receivedContext).toEqual({ userId: 'test-user' });
    });
  });

  describe('OnTransition Callback', () => {
    it('should call onTransition callback', () => {
      let callbackCalled = false;
      let callbackArgs: any = null;

      const machine = new StateMachine<'a' | 'b'>({
        initial: 'a',
        states: ['a', 'b'],
        transitions: [{ from: 'a', to: 'b', event: 'GO' }],
        onTransition: (from, to, event) => {
          callbackCalled = true;
          callbackArgs = { from, to, event };
        },
      });

      machine.transition('GO');
      expect(callbackCalled).toBe(true);
      expect(callbackArgs).toEqual({ from: 'a', to: 'b', event: 'GO' });
    });
  });
});
