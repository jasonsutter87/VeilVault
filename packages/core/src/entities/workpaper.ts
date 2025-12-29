// ==========================================================================
// WORKPAPER ENTITY
// Audit documentation and evidence management
// ==========================================================================

import { randomUUID } from '../utils/crypto.js';

// ==========================================================================
// TYPES
// ==========================================================================

export type WorkpaperType =
  | 'memo'
  | 'schedule'
  | 'leadsheet'
  | 'testing'
  | 'tickmark'
  | 'checklist'
  | 'narrative'
  | 'flowchart'
  | 'reconciliation'
  | 'confirmation'
  | 'evidence'
  | 'summary';

export type WorkpaperStatus =
  | 'draft'
  | 'in_progress'
  | 'pending_review'
  | 'reviewed'
  | 'approved'
  | 'superseded'
  | 'archived';

export type ReviewDecision = 'approve' | 'request_changes' | 'reject';

// ==========================================================================
// WORKPAPER
// ==========================================================================

export interface Workpaper {
  id: string;
  organizationId: string;
  auditId: string; // Parent audit engagement

  // Identification
  referenceNumber: string; // e.g., "WP-001", "A-1.1"
  title: string;
  description?: string;
  type: WorkpaperType;

  // Hierarchy
  parentId?: string; // For nested workpapers
  sectionId?: string; // Audit section
  sequence: number; // Order within section

  // Content
  content?: string; // Rich text content
  contentFormat: 'markdown' | 'html' | 'plain';

  // Linked items
  linkedControlIds: string[];
  linkedRiskIds: string[];
  linkedTestIds: string[];
  linkedIssueIds: string[];

  // Attachments
  attachments: WorkpaperAttachment[];

  // Tickmarks
  tickmarks: Tickmark[];

  // Status and workflow
  status: WorkpaperStatus;
  preparedBy: string;
  preparedByName: string;
  preparedAt: Date;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: Date;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: Date;

  // Review notes
  reviewNotes: ReviewNote[];

  // Sign-offs
  signOffs: SignOff[];

  // Cross-references
  crossReferences: CrossReference[];

  // Metadata
  periodStart?: Date;
  periodEnd?: Date;
  materialityThreshold?: number;
  sampleSize?: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lockedAt?: Date;
  lockedBy?: string;
}

export interface WorkpaperAttachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storageKey: string;
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt: Date;
  description?: string;
  isEvidence: boolean;
}

export interface Tickmark {
  id: string;
  symbol: string;
  meaning: string;
  cellReference?: string; // For spreadsheet-style workpapers
  notes?: string;
  addedBy: string;
  addedAt: Date;
}

export interface ReviewNote {
  id: string;
  reviewerId: string;
  reviewerName: string;
  content: string;
  decision: ReviewDecision;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  createdAt: Date;
}

export interface SignOff {
  id: string;
  userId: string;
  userName: string;
  role: 'preparer' | 'reviewer' | 'approver' | 'partner';
  signedAt: Date;
  ipAddress?: string;
  comments?: string;
}

export interface CrossReference {
  id: string;
  targetType: 'workpaper' | 'control' | 'risk' | 'issue' | 'test' | 'external';
  targetId: string;
  targetRef?: string; // Display reference
  description?: string;
  addedBy: string;
  addedAt: Date;
}

// ==========================================================================
// CREATE WORKPAPER
// ==========================================================================

export interface CreateWorkpaperInput {
  organizationId: string;
  auditId: string;
  referenceNumber: string;
  title: string;
  description?: string;
  type: WorkpaperType;
  parentId?: string;
  sectionId?: string;
  sequence?: number;
  content?: string;
  contentFormat?: 'markdown' | 'html' | 'plain';
  preparedBy: string;
  preparedByName: string;
  periodStart?: Date;
  periodEnd?: Date;
  materialityThreshold?: number;
}

export function createWorkpaper(input: CreateWorkpaperInput): Workpaper {
  const now = new Date();

  return {
    id: randomUUID(),
    organizationId: input.organizationId,
    auditId: input.auditId,
    referenceNumber: input.referenceNumber,
    title: input.title,
    description: input.description,
    type: input.type,
    parentId: input.parentId,
    sectionId: input.sectionId,
    sequence: input.sequence ?? 0,
    content: input.content,
    contentFormat: input.contentFormat ?? 'markdown',
    linkedControlIds: [],
    linkedRiskIds: [],
    linkedTestIds: [],
    linkedIssueIds: [],
    attachments: [],
    tickmarks: [],
    status: 'draft',
    preparedBy: input.preparedBy,
    preparedByName: input.preparedByName,
    preparedAt: now,
    reviewNotes: [],
    signOffs: [],
    crossReferences: [],
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    materialityThreshold: input.materialityThreshold,
    createdAt: now,
    updatedAt: now,
  };
}

// ==========================================================================
// WORKPAPER OPERATIONS
// ==========================================================================

export function updateWorkpaperContent(
  workpaper: Workpaper,
  content: string,
  contentFormat?: 'markdown' | 'html' | 'plain'
): Workpaper {
  if (workpaper.lockedAt) {
    throw new Error('Cannot update locked workpaper');
  }

  return {
    ...workpaper,
    content,
    contentFormat: contentFormat ?? workpaper.contentFormat,
    status: workpaper.status === 'draft' ? 'in_progress' : workpaper.status,
    updatedAt: new Date(),
  };
}

export function submitForReview(workpaper: Workpaper): Workpaper {
  if (workpaper.status !== 'draft' && workpaper.status !== 'in_progress') {
    throw new Error('Only draft or in-progress workpapers can be submitted for review');
  }

  return {
    ...workpaper,
    status: 'pending_review',
    updatedAt: new Date(),
  };
}

export function addReviewNote(
  workpaper: Workpaper,
  reviewerId: string,
  reviewerName: string,
  content: string,
  decision: ReviewDecision
): Workpaper {
  const note: ReviewNote = {
    id: randomUUID(),
    reviewerId,
    reviewerName,
    content,
    decision,
    resolved: false,
    createdAt: new Date(),
  };

  let newStatus = workpaper.status;
  if (decision === 'approve') {
    newStatus = 'reviewed';
  } else if (decision === 'request_changes') {
    newStatus = 'in_progress';
  }

  return {
    ...workpaper,
    status: newStatus,
    reviewNotes: [...workpaper.reviewNotes, note],
    reviewedBy: reviewerId,
    reviewedByName: reviewerName,
    reviewedAt: new Date(),
    updatedAt: new Date(),
  };
}

export function resolveReviewNote(
  workpaper: Workpaper,
  noteId: string,
  resolvedBy: string
): Workpaper {
  return {
    ...workpaper,
    reviewNotes: workpaper.reviewNotes.map(note =>
      note.id === noteId
        ? { ...note, resolved: true, resolvedAt: new Date(), resolvedBy }
        : note
    ),
    updatedAt: new Date(),
  };
}

export function approveWorkpaper(
  workpaper: Workpaper,
  approverId: string,
  approverName: string
): Workpaper {
  if (workpaper.status !== 'reviewed') {
    throw new Error('Only reviewed workpapers can be approved');
  }

  const signOff: SignOff = {
    id: randomUUID(),
    userId: approverId,
    userName: approverName,
    role: 'approver',
    signedAt: new Date(),
  };

  return {
    ...workpaper,
    status: 'approved',
    approvedBy: approverId,
    approvedByName: approverName,
    approvedAt: new Date(),
    signOffs: [...workpaper.signOffs, signOff],
    updatedAt: new Date(),
  };
}

export function lockWorkpaper(
  workpaper: Workpaper,
  lockedBy: string
): Workpaper {
  return {
    ...workpaper,
    lockedAt: new Date(),
    lockedBy,
    updatedAt: new Date(),
  };
}

export function unlockWorkpaper(workpaper: Workpaper): Workpaper {
  return {
    ...workpaper,
    lockedAt: undefined,
    lockedBy: undefined,
    updatedAt: new Date(),
  };
}

// ==========================================================================
// ATTACHMENT OPERATIONS
// ==========================================================================

export function addAttachment(
  workpaper: Workpaper,
  attachment: Omit<WorkpaperAttachment, 'id' | 'uploadedAt'>
): Workpaper {
  const newAttachment: WorkpaperAttachment = {
    ...attachment,
    id: randomUUID(),
    uploadedAt: new Date(),
  };

  return {
    ...workpaper,
    attachments: [...workpaper.attachments, newAttachment],
    updatedAt: new Date(),
  };
}

export function removeAttachment(
  workpaper: Workpaper,
  attachmentId: string
): Workpaper {
  return {
    ...workpaper,
    attachments: workpaper.attachments.filter(a => a.id !== attachmentId),
    updatedAt: new Date(),
  };
}

// ==========================================================================
// TICKMARK OPERATIONS
// ==========================================================================

export function addTickmark(
  workpaper: Workpaper,
  symbol: string,
  meaning: string,
  addedBy: string,
  cellReference?: string,
  notes?: string
): Workpaper {
  const tickmark: Tickmark = {
    id: randomUUID(),
    symbol,
    meaning,
    cellReference,
    notes,
    addedBy,
    addedAt: new Date(),
  };

  return {
    ...workpaper,
    tickmarks: [...workpaper.tickmarks, tickmark],
    updatedAt: new Date(),
  };
}

export function removeTickmark(
  workpaper: Workpaper,
  tickmarkId: string
): Workpaper {
  return {
    ...workpaper,
    tickmarks: workpaper.tickmarks.filter(t => t.id !== tickmarkId),
    updatedAt: new Date(),
  };
}

// Standard audit tickmarks
export const STANDARD_TICKMARKS: { symbol: string; meaning: string }[] = [
  { symbol: '✓', meaning: 'Agreed to source document' },
  { symbol: '✗', meaning: 'Exception noted' },
  { symbol: '⊕', meaning: 'Footed (verified addition)' },
  { symbol: '⊗', meaning: 'Cross-footed (verified horizontal addition)' },
  { symbol: '→', meaning: 'Traced to' },
  { symbol: '←', meaning: 'Traced from' },
  { symbol: '◊', meaning: 'Recalculated' },
  { symbol: '△', meaning: 'Agreed to prior period' },
  { symbol: '○', meaning: 'Confirmed externally' },
  { symbol: '●', meaning: 'Inspected original document' },
  { symbol: 'R', meaning: 'Re-performed' },
  { symbol: 'I', meaning: 'Inquired' },
  { symbol: 'O', meaning: 'Observed' },
  { symbol: 'S', meaning: 'Sample selected' },
  { symbol: '?', meaning: 'Follow-up required' },
];

// ==========================================================================
// CROSS-REFERENCE OPERATIONS
// ==========================================================================

export function addCrossReference(
  workpaper: Workpaper,
  targetType: CrossReference['targetType'],
  targetId: string,
  addedBy: string,
  targetRef?: string,
  description?: string
): Workpaper {
  const ref: CrossReference = {
    id: randomUUID(),
    targetType,
    targetId,
    targetRef,
    description,
    addedBy,
    addedAt: new Date(),
  };

  return {
    ...workpaper,
    crossReferences: [...workpaper.crossReferences, ref],
    updatedAt: new Date(),
  };
}

export function removeCrossReference(
  workpaper: Workpaper,
  refId: string
): Workpaper {
  return {
    ...workpaper,
    crossReferences: workpaper.crossReferences.filter(r => r.id !== refId),
    updatedAt: new Date(),
  };
}

// ==========================================================================
// LINKING OPERATIONS
// ==========================================================================

export function linkControl(workpaper: Workpaper, controlId: string): Workpaper {
  if (workpaper.linkedControlIds.includes(controlId)) return workpaper;

  return {
    ...workpaper,
    linkedControlIds: [...workpaper.linkedControlIds, controlId],
    updatedAt: new Date(),
  };
}

export function unlinkControl(workpaper: Workpaper, controlId: string): Workpaper {
  return {
    ...workpaper,
    linkedControlIds: workpaper.linkedControlIds.filter(id => id !== controlId),
    updatedAt: new Date(),
  };
}

export function linkRisk(workpaper: Workpaper, riskId: string): Workpaper {
  if (workpaper.linkedRiskIds.includes(riskId)) return workpaper;

  return {
    ...workpaper,
    linkedRiskIds: [...workpaper.linkedRiskIds, riskId],
    updatedAt: new Date(),
  };
}

export function unlinkRisk(workpaper: Workpaper, riskId: string): Workpaper {
  return {
    ...workpaper,
    linkedRiskIds: workpaper.linkedRiskIds.filter(id => id !== riskId),
    updatedAt: new Date(),
  };
}

export function linkIssue(workpaper: Workpaper, issueId: string): Workpaper {
  if (workpaper.linkedIssueIds.includes(issueId)) return workpaper;

  return {
    ...workpaper,
    linkedIssueIds: [...workpaper.linkedIssueIds, issueId],
    updatedAt: new Date(),
  };
}

export function unlinkIssue(workpaper: Workpaper, issueId: string): Workpaper {
  return {
    ...workpaper,
    linkedIssueIds: workpaper.linkedIssueIds.filter(id => id !== issueId),
    updatedAt: new Date(),
  };
}

// ==========================================================================
// WORKPAPER QUERIES
// ==========================================================================

export interface WorkpaperQuery {
  organizationId?: string;
  auditId?: string;
  sectionId?: string;
  parentId?: string;
  type?: WorkpaperType;
  status?: WorkpaperStatus;
  preparedBy?: string;
  reviewedBy?: string;
  approvedBy?: string;
  hasUnresolvedNotes?: boolean;
  searchTerm?: string;
  limit?: number;
  offset?: number;
}

export function filterWorkpapers(
  workpapers: Workpaper[],
  query: WorkpaperQuery
): Workpaper[] {
  let filtered = [...workpapers];

  if (query.organizationId) {
    filtered = filtered.filter(w => w.organizationId === query.organizationId);
  }
  if (query.auditId) {
    filtered = filtered.filter(w => w.auditId === query.auditId);
  }
  if (query.sectionId) {
    filtered = filtered.filter(w => w.sectionId === query.sectionId);
  }
  if (query.parentId) {
    filtered = filtered.filter(w => w.parentId === query.parentId);
  }
  if (query.type) {
    filtered = filtered.filter(w => w.type === query.type);
  }
  if (query.status) {
    filtered = filtered.filter(w => w.status === query.status);
  }
  if (query.preparedBy) {
    filtered = filtered.filter(w => w.preparedBy === query.preparedBy);
  }
  if (query.reviewedBy) {
    filtered = filtered.filter(w => w.reviewedBy === query.reviewedBy);
  }
  if (query.approvedBy) {
    filtered = filtered.filter(w => w.approvedBy === query.approvedBy);
  }
  if (query.hasUnresolvedNotes) {
    filtered = filtered.filter(w => w.reviewNotes.some(n => !n.resolved));
  }
  if (query.searchTerm) {
    const term = query.searchTerm.toLowerCase();
    filtered = filtered.filter(w =>
      w.title.toLowerCase().includes(term) ||
      w.referenceNumber.toLowerCase().includes(term) ||
      w.description?.toLowerCase().includes(term) ||
      w.content?.toLowerCase().includes(term)
    );
  }

  // Sort by section then sequence
  filtered.sort((a, b) => {
    if (a.sectionId !== b.sectionId) {
      return (a.sectionId ?? '').localeCompare(b.sectionId ?? '');
    }
    return a.sequence - b.sequence;
  });

  // Pagination
  const offset = query.offset ?? 0;
  const limit = query.limit ?? 50;
  return filtered.slice(offset, offset + limit);
}

// ==========================================================================
// WORKPAPER SUMMARY
// ==========================================================================

export interface WorkpaperSummary {
  total: number;
  byStatus: Record<WorkpaperStatus, number>;
  byType: Record<WorkpaperType, number>;
  pendingReview: number;
  unresolvedNotes: number;
  locked: number;
  completionRate: number;
  avgReviewTime?: number; // days
}

export function summarizeWorkpapers(workpapers: Workpaper[]): WorkpaperSummary {
  const byStatus: Record<string, number> = {};
  const byType: Record<string, number> = {};
  let pendingReview = 0;
  let unresolvedNotes = 0;
  let locked = 0;
  let approved = 0;
  const reviewTimes: number[] = [];

  for (const wp of workpapers) {
    byStatus[wp.status] = (byStatus[wp.status] ?? 0) + 1;
    byType[wp.type] = (byType[wp.type] ?? 0) + 1;

    if (wp.status === 'pending_review') pendingReview++;
    if (wp.lockedAt) locked++;
    if (wp.status === 'approved') approved++;

    const unresolved = wp.reviewNotes.filter(n => !n.resolved).length;
    unresolvedNotes += unresolved;

    // Calculate review time
    if (wp.preparedAt && wp.reviewedAt) {
      const days = (wp.reviewedAt.getTime() - wp.preparedAt.getTime()) / (1000 * 60 * 60 * 24);
      reviewTimes.push(days);
    }
  }

  const completionRate = workpapers.length > 0 ? approved / workpapers.length : 0;
  const avgReviewTime = reviewTimes.length > 0
    ? reviewTimes.reduce((a, b) => a + b, 0) / reviewTimes.length
    : undefined;

  return {
    total: workpapers.length,
    byStatus: byStatus as Record<WorkpaperStatus, number>,
    byType: byType as Record<WorkpaperType, number>,
    pendingReview,
    unresolvedNotes,
    locked,
    completionRate,
    avgReviewTime,
  };
}

// ==========================================================================
// WORKPAPER SECTION
// ==========================================================================

export interface WorkpaperSection {
  id: string;
  auditId: string;
  name: string;
  description?: string;
  sequence: number;
  parentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export function createWorkpaperSection(
  auditId: string,
  name: string,
  sequence: number,
  description?: string,
  parentId?: string
): WorkpaperSection {
  const now = new Date();

  return {
    id: randomUUID(),
    auditId,
    name,
    description,
    sequence,
    parentId,
    createdAt: now,
    updatedAt: now,
  };
}

// ==========================================================================
// ROLL FORWARD
// ==========================================================================

export function rollForwardWorkpaper(
  workpaper: Workpaper,
  newAuditId: string,
  newPeriodStart: Date,
  newPeriodEnd: Date,
  preparedBy: string,
  preparedByName: string
): Workpaper {
  const now = new Date();

  return {
    ...workpaper,
    id: randomUUID(),
    auditId: newAuditId,
    status: 'draft',
    periodStart: newPeriodStart,
    periodEnd: newPeriodEnd,
    preparedBy,
    preparedByName,
    preparedAt: now,
    reviewedBy: undefined,
    reviewedByName: undefined,
    reviewedAt: undefined,
    approvedBy: undefined,
    approvedByName: undefined,
    approvedAt: undefined,
    reviewNotes: [],
    signOffs: [],
    lockedAt: undefined,
    lockedBy: undefined,
    createdAt: now,
    updatedAt: now,
    // Keep content, attachments, tickmarks, cross-references for reference
    // but clear evidence attachments
    attachments: workpaper.attachments.filter(a => !a.isEvidence),
  };
}
