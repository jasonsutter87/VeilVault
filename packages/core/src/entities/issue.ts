// ==========================================================================
// ISSUE ENTITY
// Issue tracking and deficiency management
// ==========================================================================

import { randomUUID } from '../utils/crypto.js';

export type IssueType =
  | 'control_deficiency'
  | 'control_gap'
  | 'process_issue'
  | 'compliance_finding'
  | 'audit_finding'
  | 'exception'
  | 'observation'
  | 'management_letter_point';

export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IssueStatus =
  | 'draft'
  | 'open'
  | 'in_remediation'
  | 'pending_validation'
  | 'validated'
  | 'closed'
  | 'deferred'
  | 'accepted';

export type IssueSource =
  | 'internal_audit'
  | 'external_audit'
  | 'control_testing'
  | 'management_review'
  | 'regulatory_exam'
  | 'self_identified'
  | 'continuous_monitoring';

export interface Issue {
  id: string;
  organizationId: string;
  issueNumber: string; // User-friendly ID (e.g., "ISS-2024-001")
  title: string;
  description: string;
  type: IssueType;
  severity: IssueSeverity;
  status: IssueStatus;
  source: IssueSource;

  // Root Cause Analysis
  rootCause?: string;
  rootCauseCategory?: RootCauseCategory;

  // Impact Assessment
  financialImpact?: number;
  impactDescription?: string;
  affectedProcesses: string[];
  affectedSystems: string[];

  // Linked Entities
  controlId?: string;
  riskId?: string;
  controlTestId?: string;

  // Ownership
  identifiedBy: string;
  identifiedByName: string;
  ownerId: string;
  ownerName: string;

  // Remediation
  remediationPlan?: RemediationPlan;
  remediationHistory: RemediationAction[];

  // Dates
  identifiedDate: Date;
  targetDate?: Date;
  actualClosureDate?: Date;
  deferredUntil?: Date;

  // Validation
  validatedBy?: string;
  validatedByName?: string;
  validationDate?: Date;
  validationNotes?: string;

  // Escalation
  escalationLevel: number;
  escalationHistory: EscalationRecord[];

  // Metadata
  tags: string[];
  attachments: IssueAttachment[];
  comments: IssueComment[];
  createdAt: Date;
  updatedAt: Date;
}

export type RootCauseCategory =
  | 'people'
  | 'process'
  | 'technology'
  | 'policy'
  | 'training'
  | 'communication'
  | 'external'
  | 'other';

export interface RemediationPlan {
  id: string;
  description: string;
  steps: RemediationStep[];
  estimatedCost?: number;
  estimatedEffort?: string; // e.g., "40 hours"
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: Date;
}

export interface RemediationStep {
  id: string;
  order: number;
  description: string;
  assigneeId?: string;
  assigneeName?: string;
  dueDate?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  completedAt?: Date;
  notes?: string;
}

export interface RemediationAction {
  id: string;
  actionType: 'status_change' | 'plan_update' | 'step_complete' | 'comment' | 'escalation' | 'extension';
  description: string;
  performedBy: string;
  performedByName: string;
  performedAt: Date;
  previousValue?: string;
  newValue?: string;
}

export interface IssueAttachment {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadedAt: Date;
  uploadedBy: string;
}

export interface IssueComment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: Date;
  isInternal: boolean; // Hidden from external auditors
}

export interface EscalationRecord {
  id: string;
  level: number;
  escalatedBy: string;
  escalatedByName: string;
  escalatedTo: string;
  escalatedToName: string;
  reason: string;
  escalatedAt: Date;
}

export interface CreateIssueInput {
  organizationId: string;
  title: string;
  description: string;
  type: IssueType;
  severity: IssueSeverity;
  source: IssueSource;
  identifiedBy: string;
  identifiedByName: string;
  ownerId: string;
  ownerName: string;
  controlId?: string;
  riskId?: string;
  controlTestId?: string;
  targetDate?: Date;
  rootCause?: string;
  rootCauseCategory?: RootCauseCategory;
  tags?: string[];
}

// ==========================================================================
// ISSUE FUNCTIONS
// ==========================================================================

let issueCounter = 0;

function generateIssueNumber(): string {
  issueCounter++;
  const year = new Date().getFullYear();
  return `ISS-${year}-${String(issueCounter).padStart(4, '0')}`;
}

export function createIssue(input: CreateIssueInput): Issue {
  const now = new Date();

  return {
    id: randomUUID(),
    organizationId: input.organizationId,
    issueNumber: generateIssueNumber(),
    title: input.title,
    description: input.description,
    type: input.type,
    severity: input.severity,
    status: 'draft',
    source: input.source,

    rootCause: input.rootCause,
    rootCauseCategory: input.rootCauseCategory,

    affectedProcesses: [],
    affectedSystems: [],

    controlId: input.controlId,
    riskId: input.riskId,
    controlTestId: input.controlTestId,

    identifiedBy: input.identifiedBy,
    identifiedByName: input.identifiedByName,
    ownerId: input.ownerId,
    ownerName: input.ownerName,

    remediationHistory: [],

    identifiedDate: now,
    targetDate: input.targetDate,

    escalationLevel: 0,
    escalationHistory: [],

    tags: input.tags ?? [],
    attachments: [],
    comments: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function openIssue(issue: Issue, userId: string, userName: string): Issue {
  const action: RemediationAction = {
    id: randomUUID(),
    actionType: 'status_change',
    description: 'Issue opened',
    performedBy: userId,
    performedByName: userName,
    performedAt: new Date(),
    previousValue: issue.status,
    newValue: 'open',
  };

  return {
    ...issue,
    status: 'open',
    remediationHistory: [...issue.remediationHistory, action],
    updatedAt: new Date(),
  };
}

export function createRemediationPlan(
  issue: Issue,
  plan: Omit<RemediationPlan, 'id'>,
  userId: string,
  userName: string
): Issue {
  const action: RemediationAction = {
    id: randomUUID(),
    actionType: 'plan_update',
    description: 'Remediation plan created',
    performedBy: userId,
    performedByName: userName,
    performedAt: new Date(),
  };

  return {
    ...issue,
    remediationPlan: {
      ...plan,
      id: randomUUID(),
      steps: plan.steps.map((step, index) => ({
        ...step,
        id: randomUUID(),
        order: index + 1,
        status: step.status ?? 'pending',
      })),
    },
    status: issue.status === 'open' ? 'in_remediation' : issue.status,
    remediationHistory: [...issue.remediationHistory, action],
    updatedAt: new Date(),
  };
}

export function updateRemediationStep(
  issue: Issue,
  stepId: string,
  updates: Partial<RemediationStep>,
  userId: string,
  userName: string
): Issue {
  if (!issue.remediationPlan) return issue;

  const action: RemediationAction = {
    id: randomUUID(),
    actionType: 'step_complete',
    description: `Remediation step updated: ${updates.status ?? 'modified'}`,
    performedBy: userId,
    performedByName: userName,
    performedAt: new Date(),
  };

  const updatedSteps = issue.remediationPlan.steps.map((step) => {
    if (step.id !== stepId) return step;
    return {
      ...step,
      ...updates,
      completedAt: updates.status === 'completed' ? new Date() : step.completedAt,
    };
  });

  return {
    ...issue,
    remediationPlan: {
      ...issue.remediationPlan,
      steps: updatedSteps,
    },
    remediationHistory: [...issue.remediationHistory, action],
    updatedAt: new Date(),
  };
}

export function requestValidation(issue: Issue, userId: string, userName: string): Issue {
  const action: RemediationAction = {
    id: randomUUID(),
    actionType: 'status_change',
    description: 'Validation requested',
    performedBy: userId,
    performedByName: userName,
    performedAt: new Date(),
    previousValue: issue.status,
    newValue: 'pending_validation',
  };

  return {
    ...issue,
    status: 'pending_validation',
    remediationHistory: [...issue.remediationHistory, action],
    updatedAt: new Date(),
  };
}

export function validateIssue(
  issue: Issue,
  validatorId: string,
  validatorName: string,
  notes?: string
): Issue {
  const now = new Date();
  const action: RemediationAction = {
    id: randomUUID(),
    actionType: 'status_change',
    description: `Issue validated: ${notes ?? 'Approved'}`,
    performedBy: validatorId,
    performedByName: validatorName,
    performedAt: now,
    previousValue: issue.status,
    newValue: 'validated',
  };

  return {
    ...issue,
    status: 'validated',
    validatedBy: validatorId,
    validatedByName: validatorName,
    validationDate: now,
    validationNotes: notes,
    remediationHistory: [...issue.remediationHistory, action],
    updatedAt: now,
  };
}

export function closeIssue(issue: Issue, userId: string, userName: string): Issue {
  const now = new Date();
  const action: RemediationAction = {
    id: randomUUID(),
    actionType: 'status_change',
    description: 'Issue closed',
    performedBy: userId,
    performedByName: userName,
    performedAt: now,
    previousValue: issue.status,
    newValue: 'closed',
  };

  return {
    ...issue,
    status: 'closed',
    actualClosureDate: now,
    remediationHistory: [...issue.remediationHistory, action],
    updatedAt: now,
  };
}

export function deferIssue(
  issue: Issue,
  deferUntil: Date,
  reason: string,
  userId: string,
  userName: string
): Issue {
  const action: RemediationAction = {
    id: randomUUID(),
    actionType: 'status_change',
    description: `Issue deferred until ${deferUntil.toISOString().split('T')[0]}: ${reason}`,
    performedBy: userId,
    performedByName: userName,
    performedAt: new Date(),
    previousValue: issue.status,
    newValue: 'deferred',
  };

  return {
    ...issue,
    status: 'deferred',
    deferredUntil: deferUntil,
    remediationHistory: [...issue.remediationHistory, action],
    updatedAt: new Date(),
  };
}

export function acceptIssueRisk(issue: Issue, justification: string, userId: string, userName: string): Issue {
  const action: RemediationAction = {
    id: randomUUID(),
    actionType: 'status_change',
    description: `Risk accepted: ${justification}`,
    performedBy: userId,
    performedByName: userName,
    performedAt: new Date(),
    previousValue: issue.status,
    newValue: 'accepted',
  };

  return {
    ...issue,
    status: 'accepted',
    remediationHistory: [...issue.remediationHistory, action],
    updatedAt: new Date(),
  };
}

export function extendTargetDate(
  issue: Issue,
  newTargetDate: Date,
  reason: string,
  userId: string,
  userName: string
): Issue {
  const action: RemediationAction = {
    id: randomUUID(),
    actionType: 'extension',
    description: `Target date extended: ${reason}`,
    performedBy: userId,
    performedByName: userName,
    performedAt: new Date(),
    previousValue: issue.targetDate?.toISOString(),
    newValue: newTargetDate.toISOString(),
  };

  return {
    ...issue,
    targetDate: newTargetDate,
    remediationHistory: [...issue.remediationHistory, action],
    updatedAt: new Date(),
  };
}

export function addIssueComment(
  issue: Issue,
  content: string,
  authorId: string,
  authorName: string,
  isInternal = false
): Issue {
  const comment: IssueComment = {
    id: randomUUID(),
    content,
    authorId,
    authorName,
    createdAt: new Date(),
    isInternal,
  };

  return {
    ...issue,
    comments: [...issue.comments, comment],
    updatedAt: new Date(),
  };
}

export function escalateIssue(
  issue: Issue,
  input: {
    escalatedById: string;
    escalatedByName: string;
    newOwnerId: string;
    newOwnerName: string;
    reason: string;
  }
): Issue {
  const now = new Date();
  const newLevel = issue.escalationLevel + 1;

  const action: RemediationAction = {
    id: randomUUID(),
    actionType: 'escalation',
    description: `Escalated to ${input.newOwnerName} (Level ${newLevel}): ${input.reason}`,
    performedBy: input.escalatedById,
    performedByName: input.escalatedByName,
    performedAt: now,
    previousValue: issue.ownerName,
    newValue: input.newOwnerName,
  };

  const escalationRecord: EscalationRecord = {
    id: randomUUID(),
    level: newLevel,
    escalatedBy: input.escalatedById,
    escalatedByName: input.escalatedByName,
    escalatedTo: input.newOwnerId,
    escalatedToName: input.newOwnerName,
    reason: input.reason,
    escalatedAt: now,
  };

  return {
    ...issue,
    ownerId: input.newOwnerId,
    ownerName: input.newOwnerName,
    escalationLevel: newLevel,
    escalationHistory: [...issue.escalationHistory, escalationRecord],
    remediationHistory: [...issue.remediationHistory, action],
    updatedAt: now,
  };
}

// ==========================================================================
// ISSUE SUMMARY & ANALYTICS
// ==========================================================================

export interface IssueSummary {
  total: number;
  byStatus: Record<IssueStatus, number>;
  bySeverity: Record<IssueSeverity, number>;
  byType: Record<IssueType, number>;
  bySource: Record<IssueSource, number>;
  overdue: number;
  dueSoon: number; // Due in next 30 days
  averageAgeDays: number;
  closedThisMonth: number;
}

export function calculateIssueSummary(issues: Issue[]): IssueSummary {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const summary: IssueSummary = {
    total: issues.length,
    byStatus: {
      draft: 0,
      open: 0,
      in_remediation: 0,
      pending_validation: 0,
      validated: 0,
      closed: 0,
      deferred: 0,
      accepted: 0,
    },
    bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
    byType: {
      control_deficiency: 0,
      control_gap: 0,
      process_issue: 0,
      compliance_finding: 0,
      audit_finding: 0,
      exception: 0,
      observation: 0,
      management_letter_point: 0,
    },
    bySource: {
      internal_audit: 0,
      external_audit: 0,
      control_testing: 0,
      management_review: 0,
      regulatory_exam: 0,
      self_identified: 0,
      continuous_monitoring: 0,
    },
    overdue: 0,
    dueSoon: 0,
    averageAgeDays: 0,
    closedThisMonth: 0,
  };

  let totalAgeDays = 0;
  const openIssues = issues.filter((i) => !['closed', 'accepted', 'deferred'].includes(i.status));

  for (const issue of issues) {
    summary.byStatus[issue.status]++;
    summary.bySeverity[issue.severity]++;
    summary.byType[issue.type]++;
    summary.bySource[issue.source]++;

    // Overdue check
    if (issue.targetDate && issue.targetDate < now && !['closed', 'accepted'].includes(issue.status)) {
      summary.overdue++;
    }

    // Due soon check
    if (
      issue.targetDate &&
      issue.targetDate >= now &&
      issue.targetDate <= thirtyDaysFromNow &&
      !['closed', 'accepted'].includes(issue.status)
    ) {
      summary.dueSoon++;
    }

    // Closed this month
    if (issue.status === 'closed' && issue.actualClosureDate && issue.actualClosureDate >= startOfMonth) {
      summary.closedThisMonth++;
    }
  }

  // Average age calculation
  for (const issue of openIssues) {
    const ageMs = now.getTime() - issue.identifiedDate.getTime();
    totalAgeDays += ageMs / (1000 * 60 * 60 * 24);
  }

  summary.averageAgeDays = openIssues.length > 0 ? Math.round(totalAgeDays / openIssues.length) : 0;

  return summary;
}

export function getOverdueIssues(issues: Issue[]): Issue[] {
  const now = new Date();
  return issues.filter(
    (i) => i.targetDate && i.targetDate < now && !['closed', 'accepted', 'deferred'].includes(i.status)
  );
}

export function getRemediationProgress(issue: Issue): { completed: number; total: number; percentage: number } {
  if (!issue.remediationPlan || issue.remediationPlan.steps.length === 0) {
    return { completed: 0, total: 0, percentage: 0 };
  }

  const total = issue.remediationPlan.steps.length;
  const completed = issue.remediationPlan.steps.filter((s) => s.status === 'completed').length;
  const percentage = Math.round((completed / total) * 100);

  return { completed, total, percentage };
}
