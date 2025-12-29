// ==========================================================================
// PBC (PROVIDED BY CLIENT) REQUEST ENTITY
// Audit document request management and automation
// ==========================================================================

import { randomUUID } from '../utils/crypto.js';

// ==========================================================================
// TYPES
// ==========================================================================

export type PbcRequestStatus =
  | 'draft'
  | 'pending'
  | 'in_progress'
  | 'submitted'
  | 'under_review'
  | 'accepted'
  | 'rejected'
  | 'overdue'
  | 'cancelled';

export type PbcRequestPriority = 'critical' | 'high' | 'medium' | 'low';

export type PbcRequestCategory =
  | 'financial_statements'
  | 'bank_reconciliations'
  | 'accounts_receivable'
  | 'accounts_payable'
  | 'inventory'
  | 'fixed_assets'
  | 'payroll'
  | 'tax'
  | 'contracts'
  | 'policies'
  | 'minutes'
  | 'confirmations'
  | 'legal'
  | 'it_systems'
  | 'other';

// ==========================================================================
// PBC REQUEST
// ==========================================================================

export interface PbcRequest {
  id: string;
  organizationId: string;
  auditId: string;

  // Request details
  requestNumber: string; // e.g., "PBC-2024-001"
  title: string;
  description: string;
  category: PbcRequestCategory;
  priority: PbcRequestPriority;

  // Linked items
  workpaperId?: string;
  controlIds: string[];
  riskIds: string[];

  // Documents
  requestedDocuments: RequestedDocument[];
  submittedDocuments: SubmittedDocument[];

  // Status
  status: PbcRequestStatus;

  // Assignment
  requestedBy: string;
  requestedByName: string;
  assignedTo?: string;
  assignedToName?: string;
  assignedToEmail?: string;

  // Dates
  requestedAt: Date;
  dueDate: Date;
  submittedAt?: Date;
  reviewedAt?: Date;
  acceptedAt?: Date;

  // Review
  reviewedBy?: string;
  reviewedByName?: string;
  reviewNotes?: string;
  rejectionReason?: string;

  // Reminders
  reminders: PbcReminder[];
  remindersSent: number;
  lastReminderAt?: Date;

  // Tracking
  viewedByClient: boolean;
  viewedAt?: Date;
  downloadedAt?: Date;

  // Communication
  messages: PbcMessage[];

  // Metadata
  tags: string[];
  customFields: Record<string, unknown>;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface RequestedDocument {
  id: string;
  name: string;
  description?: string;
  fileTypes?: string[]; // Accepted file types
  required: boolean;
  sampleUrl?: string; // Link to sample/template
  notes?: string;
}

export interface SubmittedDocument {
  id: string;
  requestedDocumentId?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storageKey: string;
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt: Date;
  notes?: string;
  isAccepted?: boolean;
  rejectionReason?: string;
}

export interface PbcReminder {
  id: string;
  type: 'email' | 'in_app' | 'sms';
  scheduledFor: Date;
  sentAt?: Date;
  status: 'scheduled' | 'sent' | 'failed' | 'cancelled';
  error?: string;
}

export interface PbcMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderType: 'auditor' | 'client';
  content: string;
  attachmentIds?: string[];
  createdAt: Date;
  readAt?: Date;
}

// ==========================================================================
// PBC TEMPLATE
// ==========================================================================

export interface PbcTemplate {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  category: PbcRequestCategory;
  isGlobal: boolean; // Available to all audits

  // Template content
  defaultTitle: string;
  defaultDescription: string;
  defaultPriority: PbcRequestPriority;
  defaultDueDays: number; // Days from request creation
  requestedDocuments: Omit<RequestedDocument, 'id'>[];

  // Automation
  autoReminders: boolean;
  reminderDays: number[]; // Days before due date to send reminders

  createdBy: string;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==========================================================================
// CREATE PBC REQUEST
// ==========================================================================

export interface CreatePbcRequestInput {
  organizationId: string;
  auditId: string;
  title: string;
  description: string;
  category: PbcRequestCategory;
  priority?: PbcRequestPriority;
  workpaperId?: string;
  controlIds?: string[];
  riskIds?: string[];
  requestedDocuments: Omit<RequestedDocument, 'id'>[];
  requestedBy: string;
  requestedByName: string;
  assignedTo?: string;
  assignedToName?: string;
  assignedToEmail?: string;
  dueDate: Date;
  tags?: string[];
}

let requestCounter = 0;

export function createPbcRequest(input: CreatePbcRequestInput): PbcRequest {
  const now = new Date();
  requestCounter++;
  const year = now.getFullYear();
  const num = requestCounter.toString().padStart(3, '0');

  return {
    id: randomUUID(),
    organizationId: input.organizationId,
    auditId: input.auditId,
    requestNumber: `PBC-${year}-${num}`,
    title: input.title,
    description: input.description,
    category: input.category,
    priority: input.priority ?? 'medium',
    workpaperId: input.workpaperId,
    controlIds: input.controlIds ?? [],
    riskIds: input.riskIds ?? [],
    requestedDocuments: input.requestedDocuments.map(doc => ({
      ...doc,
      id: randomUUID(),
    })),
    submittedDocuments: [],
    status: 'draft',
    requestedBy: input.requestedBy,
    requestedByName: input.requestedByName,
    assignedTo: input.assignedTo,
    assignedToName: input.assignedToName,
    assignedToEmail: input.assignedToEmail,
    requestedAt: now,
    dueDate: input.dueDate,
    reminders: [],
    remindersSent: 0,
    viewedByClient: false,
    messages: [],
    tags: input.tags ?? [],
    customFields: {},
    createdAt: now,
    updatedAt: now,
  };
}

// ==========================================================================
// CREATE FROM TEMPLATE
// ==========================================================================

export function createPbcRequestFromTemplate(
  template: PbcTemplate,
  input: {
    organizationId: string;
    auditId: string;
    requestedBy: string;
    requestedByName: string;
    assignedTo?: string;
    assignedToName?: string;
    assignedToEmail?: string;
    dueDate?: Date;
    overrides?: Partial<{
      title: string;
      description: string;
      priority: PbcRequestPriority;
    }>;
  }
): PbcRequest {
  const now = new Date();
  const dueDate = input.dueDate ??
    new Date(now.getTime() + template.defaultDueDays * 24 * 60 * 60 * 1000);

  const request = createPbcRequest({
    organizationId: input.organizationId,
    auditId: input.auditId,
    title: input.overrides?.title ?? template.defaultTitle,
    description: input.overrides?.description ?? template.defaultDescription,
    category: template.category,
    priority: input.overrides?.priority ?? template.defaultPriority,
    requestedDocuments: template.requestedDocuments,
    requestedBy: input.requestedBy,
    requestedByName: input.requestedByName,
    assignedTo: input.assignedTo,
    assignedToName: input.assignedToName,
    assignedToEmail: input.assignedToEmail,
    dueDate,
  });

  // Schedule auto-reminders if enabled
  if (template.autoReminders) {
    request.reminders = template.reminderDays.map(days => {
      const reminderDate = new Date(dueDate);
      reminderDate.setDate(reminderDate.getDate() - days);

      return {
        id: randomUUID(),
        type: 'email' as const,
        scheduledFor: reminderDate,
        status: 'scheduled' as const,
      };
    });
  }

  return request;
}

// ==========================================================================
// PBC REQUEST OPERATIONS
// ==========================================================================

export function sendPbcRequest(request: PbcRequest): PbcRequest {
  if (request.status !== 'draft') {
    throw new Error('Only draft requests can be sent');
  }

  return {
    ...request,
    status: 'pending',
    requestedAt: new Date(),
    updatedAt: new Date(),
  };
}

export function markClientViewed(request: PbcRequest): PbcRequest {
  return {
    ...request,
    viewedByClient: true,
    viewedAt: new Date(),
    status: request.status === 'pending' ? 'in_progress' : request.status,
    updatedAt: new Date(),
  };
}

export function submitDocument(
  request: PbcRequest,
  document: Omit<SubmittedDocument, 'id' | 'uploadedAt'>
): PbcRequest {
  const newDoc: SubmittedDocument = {
    ...document,
    id: randomUUID(),
    uploadedAt: new Date(),
  };

  return {
    ...request,
    submittedDocuments: [...request.submittedDocuments, newDoc],
    status: 'in_progress',
    updatedAt: new Date(),
  };
}

export function removeSubmittedDocument(
  request: PbcRequest,
  documentId: string
): PbcRequest {
  return {
    ...request,
    submittedDocuments: request.submittedDocuments.filter(d => d.id !== documentId),
    updatedAt: new Date(),
  };
}

export function submitPbcRequest(request: PbcRequest): PbcRequest {
  const requiredDocs = request.requestedDocuments.filter(d => d.required);
  const submittedForRequired = requiredDocs.filter(req =>
    request.submittedDocuments.some(sub => sub.requestedDocumentId === req.id)
  );

  if (submittedForRequired.length < requiredDocs.length) {
    throw new Error('Not all required documents have been submitted');
  }

  return {
    ...request,
    status: 'submitted',
    submittedAt: new Date(),
    updatedAt: new Date(),
  };
}

export function reviewPbcRequest(
  request: PbcRequest,
  reviewerId: string,
  reviewerName: string,
  notes?: string
): PbcRequest {
  return {
    ...request,
    status: 'under_review',
    reviewedBy: reviewerId,
    reviewedByName: reviewerName,
    reviewNotes: notes,
    reviewedAt: new Date(),
    updatedAt: new Date(),
  };
}

export function acceptPbcRequest(
  request: PbcRequest,
  reviewerId: string,
  reviewerName: string,
  notes?: string
): PbcRequest {
  // Mark all submitted documents as accepted
  const acceptedDocs = request.submittedDocuments.map(doc => ({
    ...doc,
    isAccepted: true,
  }));

  return {
    ...request,
    submittedDocuments: acceptedDocs,
    status: 'accepted',
    reviewedBy: reviewerId,
    reviewedByName: reviewerName,
    reviewNotes: notes,
    acceptedAt: new Date(),
    updatedAt: new Date(),
  };
}

export function rejectPbcRequest(
  request: PbcRequest,
  reviewerId: string,
  reviewerName: string,
  reason: string,
  rejectedDocumentIds?: string[]
): PbcRequest {
  const updatedDocs = request.submittedDocuments.map(doc => {
    if (rejectedDocumentIds?.includes(doc.id)) {
      return { ...doc, isAccepted: false, rejectionReason: reason };
    }
    return doc;
  });

  return {
    ...request,
    submittedDocuments: updatedDocs,
    status: 'rejected',
    reviewedBy: reviewerId,
    reviewedByName: reviewerName,
    rejectionReason: reason,
    reviewedAt: new Date(),
    updatedAt: new Date(),
  };
}

export function cancelPbcRequest(request: PbcRequest): PbcRequest {
  return {
    ...request,
    status: 'cancelled',
    reminders: request.reminders.map(r => ({ ...r, status: 'cancelled' as const })),
    updatedAt: new Date(),
  };
}

export function markOverdue(request: PbcRequest): PbcRequest {
  if (request.status === 'accepted' || request.status === 'cancelled') {
    return request;
  }

  return {
    ...request,
    status: 'overdue',
    updatedAt: new Date(),
  };
}

// ==========================================================================
// MESSAGE OPERATIONS
// ==========================================================================

export function addMessage(
  request: PbcRequest,
  senderId: string,
  senderName: string,
  senderType: 'auditor' | 'client',
  content: string,
  attachmentIds?: string[]
): PbcRequest {
  const message: PbcMessage = {
    id: randomUUID(),
    senderId,
    senderName,
    senderType,
    content,
    attachmentIds,
    createdAt: new Date(),
  };

  return {
    ...request,
    messages: [...request.messages, message],
    updatedAt: new Date(),
  };
}

export function markMessageRead(
  request: PbcRequest,
  messageId: string
): PbcRequest {
  return {
    ...request,
    messages: request.messages.map(m =>
      m.id === messageId ? { ...m, readAt: new Date() } : m
    ),
    updatedAt: new Date(),
  };
}

// ==========================================================================
// REMINDER OPERATIONS
// ==========================================================================

export function scheduleReminder(
  request: PbcRequest,
  type: 'email' | 'in_app' | 'sms',
  scheduledFor: Date
): PbcRequest {
  const reminder: PbcReminder = {
    id: randomUUID(),
    type,
    scheduledFor,
    status: 'scheduled',
  };

  return {
    ...request,
    reminders: [...request.reminders, reminder],
    updatedAt: new Date(),
  };
}

export function markReminderSent(
  request: PbcRequest,
  reminderId: string,
  error?: string
): PbcRequest {
  return {
    ...request,
    reminders: request.reminders.map(r =>
      r.id === reminderId
        ? {
            ...r,
            sentAt: new Date(),
            status: error ? 'failed' as const : 'sent' as const,
            error,
          }
        : r
    ),
    remindersSent: request.remindersSent + (error ? 0 : 1),
    lastReminderAt: error ? request.lastReminderAt : new Date(),
    updatedAt: new Date(),
  };
}

export function getDueReminders(requests: PbcRequest[]): { request: PbcRequest; reminder: PbcReminder }[] {
  const now = new Date();
  const due: { request: PbcRequest; reminder: PbcReminder }[] = [];

  for (const request of requests) {
    if (request.status === 'accepted' || request.status === 'cancelled') continue;

    for (const reminder of request.reminders) {
      if (reminder.status === 'scheduled' && reminder.scheduledFor <= now) {
        due.push({ request, reminder });
      }
    }
  }

  return due;
}

// ==========================================================================
// QUERY & FILTER
// ==========================================================================

export interface PbcRequestQuery {
  organizationId?: string;
  auditId?: string;
  status?: PbcRequestStatus | PbcRequestStatus[];
  priority?: PbcRequestPriority;
  category?: PbcRequestCategory;
  assignedTo?: string;
  requestedBy?: string;
  isOverdue?: boolean;
  hasUnreadMessages?: boolean;
  searchTerm?: string;
  dueBefore?: Date;
  dueAfter?: Date;
  limit?: number;
  offset?: number;
}

export function filterPbcRequests(
  requests: PbcRequest[],
  query: PbcRequestQuery
): PbcRequest[] {
  let filtered = [...requests];

  if (query.organizationId) {
    filtered = filtered.filter(r => r.organizationId === query.organizationId);
  }
  if (query.auditId) {
    filtered = filtered.filter(r => r.auditId === query.auditId);
  }
  if (query.status) {
    const statuses = Array.isArray(query.status) ? query.status : [query.status];
    filtered = filtered.filter(r => statuses.includes(r.status));
  }
  if (query.priority) {
    filtered = filtered.filter(r => r.priority === query.priority);
  }
  if (query.category) {
    filtered = filtered.filter(r => r.category === query.category);
  }
  if (query.assignedTo) {
    filtered = filtered.filter(r => r.assignedTo === query.assignedTo);
  }
  if (query.requestedBy) {
    filtered = filtered.filter(r => r.requestedBy === query.requestedBy);
  }
  if (query.isOverdue) {
    const now = new Date();
    filtered = filtered.filter(r =>
      r.dueDate < now && !['accepted', 'cancelled'].includes(r.status)
    );
  }
  if (query.hasUnreadMessages) {
    filtered = filtered.filter(r =>
      r.messages.some(m => !m.readAt)
    );
  }
  if (query.searchTerm) {
    const term = query.searchTerm.toLowerCase();
    filtered = filtered.filter(r =>
      r.title.toLowerCase().includes(term) ||
      r.requestNumber.toLowerCase().includes(term) ||
      r.description.toLowerCase().includes(term)
    );
  }
  if (query.dueBefore) {
    filtered = filtered.filter(r => r.dueDate <= query.dueBefore!);
  }
  if (query.dueAfter) {
    filtered = filtered.filter(r => r.dueDate >= query.dueAfter!);
  }

  // Sort by priority then due date
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  filtered.sort((a, b) => {
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pDiff !== 0) return pDiff;
    return a.dueDate.getTime() - b.dueDate.getTime();
  });

  // Pagination
  const offset = query.offset ?? 0;
  const limit = query.limit ?? 50;
  return filtered.slice(offset, offset + limit);
}

// ==========================================================================
// SUMMARY
// ==========================================================================

export interface PbcRequestSummary {
  total: number;
  byStatus: Record<PbcRequestStatus, number>;
  byPriority: Record<PbcRequestPriority, number>;
  byCategory: Record<PbcRequestCategory, number>;
  overdue: number;
  dueThisWeek: number;
  submissionRate: number;
  avgResponseTime?: number; // days
  unreadMessages: number;
}

export function summarizePbcRequests(requests: PbcRequest[]): PbcRequestSummary {
  const now = new Date();
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const byStatus: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  let overdue = 0;
  let dueThisWeek = 0;
  let submitted = 0;
  let unreadMessages = 0;
  const responseTimes: number[] = [];

  for (const request of requests) {
    byStatus[request.status] = (byStatus[request.status] ?? 0) + 1;
    byPriority[request.priority] = (byPriority[request.priority] ?? 0) + 1;
    byCategory[request.category] = (byCategory[request.category] ?? 0) + 1;

    if (request.dueDate < now && !['accepted', 'cancelled'].includes(request.status)) {
      overdue++;
    }

    if (request.dueDate >= now && request.dueDate <= oneWeekFromNow) {
      dueThisWeek++;
    }

    if (['submitted', 'under_review', 'accepted'].includes(request.status)) {
      submitted++;
    }

    unreadMessages += request.messages.filter(m => !m.readAt).length;

    if (request.requestedAt && request.submittedAt) {
      const days = (request.submittedAt.getTime() - request.requestedAt.getTime()) / (1000 * 60 * 60 * 24);
      responseTimes.push(days);
    }
  }

  const submissionRate = requests.length > 0 ? submitted / requests.length : 0;
  const avgResponseTime = responseTimes.length > 0
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    : undefined;

  return {
    total: requests.length,
    byStatus: byStatus as Record<PbcRequestStatus, number>,
    byPriority: byPriority as Record<PbcRequestPriority, number>,
    byCategory: byCategory as Record<PbcRequestCategory, number>,
    overdue,
    dueThisWeek,
    submissionRate,
    avgResponseTime,
    unreadMessages,
  };
}

// ==========================================================================
// TEMPLATE OPERATIONS
// ==========================================================================

export interface CreatePbcTemplateInput {
  organizationId: string;
  name: string;
  description?: string;
  category: PbcRequestCategory;
  isGlobal?: boolean;
  defaultTitle: string;
  defaultDescription: string;
  defaultPriority?: PbcRequestPriority;
  defaultDueDays?: number;
  requestedDocuments: Omit<RequestedDocument, 'id'>[];
  autoReminders?: boolean;
  reminderDays?: number[];
  createdBy: string;
  createdByName: string;
}

export function createPbcTemplate(input: CreatePbcTemplateInput): PbcTemplate {
  const now = new Date();

  return {
    id: randomUUID(),
    organizationId: input.organizationId,
    name: input.name,
    description: input.description,
    category: input.category,
    isGlobal: input.isGlobal ?? false,
    defaultTitle: input.defaultTitle,
    defaultDescription: input.defaultDescription,
    defaultPriority: input.defaultPriority ?? 'medium',
    defaultDueDays: input.defaultDueDays ?? 14,
    requestedDocuments: input.requestedDocuments,
    autoReminders: input.autoReminders ?? true,
    reminderDays: input.reminderDays ?? [7, 3, 1],
    createdBy: input.createdBy,
    createdByName: input.createdByName,
    createdAt: now,
    updatedAt: now,
  };
}

// ==========================================================================
// STANDARD TEMPLATES
// ==========================================================================

export const STANDARD_PBC_TEMPLATES: Omit<CreatePbcTemplateInput, 'organizationId' | 'createdBy' | 'createdByName'>[] = [
  {
    name: 'Bank Reconciliations',
    category: 'bank_reconciliations',
    isGlobal: true,
    defaultTitle: 'Bank Reconciliations Request',
    defaultDescription: 'Please provide bank reconciliations for all accounts for the period under audit.',
    defaultPriority: 'high',
    defaultDueDays: 14,
    requestedDocuments: [
      { name: 'Bank Statements', required: true },
      { name: 'Bank Reconciliations', required: true },
      { name: 'Outstanding Check List', required: true },
      { name: 'Deposits in Transit List', required: false },
    ],
    autoReminders: true,
    reminderDays: [7, 3, 1],
  },
  {
    name: 'Accounts Receivable Aging',
    category: 'accounts_receivable',
    isGlobal: true,
    defaultTitle: 'Accounts Receivable Aging Request',
    defaultDescription: 'Please provide the accounts receivable aging report as of period end.',
    defaultPriority: 'high',
    defaultDueDays: 14,
    requestedDocuments: [
      { name: 'AR Aging Report', required: true },
      { name: 'Bad Debt Reserve Analysis', required: true },
      { name: 'Credit Memo Listing', required: false },
    ],
    autoReminders: true,
    reminderDays: [7, 3, 1],
  },
  {
    name: 'Fixed Asset Schedule',
    category: 'fixed_assets',
    isGlobal: true,
    defaultTitle: 'Fixed Asset Schedule Request',
    defaultDescription: 'Please provide the fixed asset schedule including additions, disposals, and depreciation.',
    defaultPriority: 'medium',
    defaultDueDays: 21,
    requestedDocuments: [
      { name: 'Fixed Asset Register', required: true },
      { name: 'Additions Schedule', required: true },
      { name: 'Disposals Schedule', required: true },
      { name: 'Depreciation Schedule', required: true },
    ],
    autoReminders: true,
    reminderDays: [7, 3, 1],
  },
  {
    name: 'Board Minutes',
    category: 'minutes',
    isGlobal: true,
    defaultTitle: 'Board Minutes Request',
    defaultDescription: 'Please provide copies of all board meeting minutes for the period under audit.',
    defaultPriority: 'medium',
    defaultDueDays: 14,
    requestedDocuments: [
      { name: 'Board Meeting Minutes', required: true },
      { name: 'Audit Committee Minutes', required: false },
      { name: 'Compensation Committee Minutes', required: false },
    ],
    autoReminders: true,
    reminderDays: [7, 3, 1],
  },
];
