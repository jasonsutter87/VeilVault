// ==========================================================================
// AUDIT TRAIL SERVICE
// Immutable logging of all system actions for compliance
// ==========================================================================

import { randomUUID } from '../utils/crypto.js';
import type { Resource, Action } from './rbac.js';

// ==========================================================================
// TYPES
// ==========================================================================

export type AuditEventCategory =
  | 'authentication'
  | 'authorization'
  | 'data_access'
  | 'data_modification'
  | 'configuration'
  | 'security'
  | 'compliance'
  | 'system';

export type AuditEventSeverity = 'info' | 'warning' | 'error' | 'critical';

export type AuditEventOutcome = 'success' | 'failure' | 'unknown';

export interface AuditEvent {
  id: string;
  timestamp: Date;
  category: AuditEventCategory;
  severity: AuditEventSeverity;
  outcome: AuditEventOutcome;

  // Actor (who)
  actorId?: string;
  actorName?: string;
  actorType: 'user' | 'system' | 'api' | 'automation';
  actorIp?: string;
  actorUserAgent?: string;

  // Action (what)
  action: Action | string;
  resource: Resource | string;
  resourceId?: string;
  resourceName?: string;

  // Context (where/how)
  organizationId?: string;
  sessionId?: string;
  requestId?: string;
  correlationId?: string;

  // Details
  description: string;
  previousValue?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown>;

  // Compliance
  retentionDays?: number;
  isCompliance?: boolean;
  complianceFrameworks?: string[]; // SOX, PCI, etc.
}

export interface CreateAuditEventInput {
  category: AuditEventCategory;
  severity?: AuditEventSeverity;
  outcome?: AuditEventOutcome;
  actorId?: string;
  actorName?: string;
  actorType?: 'user' | 'system' | 'api' | 'automation';
  actorIp?: string;
  actorUserAgent?: string;
  action: Action | string;
  resource: Resource | string;
  resourceId?: string;
  resourceName?: string;
  organizationId?: string;
  sessionId?: string;
  requestId?: string;
  correlationId?: string;
  description: string;
  previousValue?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown>;
  isCompliance?: boolean;
  complianceFrameworks?: string[];
}

// ==========================================================================
// AUDIT EVENT BUILDER
// ==========================================================================

export function createAuditEvent(input: CreateAuditEventInput): AuditEvent {
  return {
    id: randomUUID(),
    timestamp: new Date(),
    category: input.category,
    severity: input.severity ?? 'info',
    outcome: input.outcome ?? 'success',
    actorId: input.actorId,
    actorName: input.actorName,
    actorType: input.actorType ?? 'user',
    actorIp: input.actorIp,
    actorUserAgent: input.actorUserAgent,
    action: input.action,
    resource: input.resource,
    resourceId: input.resourceId,
    resourceName: input.resourceName,
    organizationId: input.organizationId,
    sessionId: input.sessionId,
    requestId: input.requestId,
    correlationId: input.correlationId,
    description: input.description,
    previousValue: input.previousValue,
    newValue: input.newValue,
    metadata: input.metadata,
    retentionDays: getRetentionDays(input.category, input.isCompliance),
    isCompliance: input.isCompliance,
    complianceFrameworks: input.complianceFrameworks,
  };
}

function getRetentionDays(category: AuditEventCategory, isCompliance?: boolean): number {
  // SOX requires 7 years, most compliance requires 3-5 years
  if (isCompliance) return 2555; // 7 years

  switch (category) {
    case 'security':
    case 'authentication':
    case 'authorization':
      return 365; // 1 year
    case 'compliance':
      return 2555; // 7 years
    case 'data_modification':
      return 730; // 2 years
    case 'configuration':
      return 365;
    default:
      return 90; // 90 days default
  }
}

// ==========================================================================
// CONVENIENCE BUILDERS
// ==========================================================================

// Authentication events
export function createLoginEvent(
  userId: string,
  userName: string,
  success: boolean,
  options: { ip?: string; userAgent?: string; reason?: string } = {}
): AuditEvent {
  return createAuditEvent({
    category: 'authentication',
    severity: success ? 'info' : 'warning',
    outcome: success ? 'success' : 'failure',
    actorId: userId,
    actorName: userName,
    actorIp: options.ip,
    actorUserAgent: options.userAgent,
    action: 'execute',
    resource: 'user',
    resourceId: userId,
    description: success
      ? `User ${userName} logged in successfully`
      : `Failed login attempt for ${userName}: ${options.reason ?? 'unknown'}`,
  });
}

export function createLogoutEvent(
  userId: string,
  userName: string,
  options: { ip?: string; sessionId?: string } = {}
): AuditEvent {
  return createAuditEvent({
    category: 'authentication',
    actorId: userId,
    actorName: userName,
    actorIp: options.ip,
    sessionId: options.sessionId,
    action: 'execute',
    resource: 'user',
    resourceId: userId,
    description: `User ${userName} logged out`,
  });
}

// Data access events
export function createDataAccessEvent(
  actorId: string,
  actorName: string,
  resource: Resource,
  resourceId: string,
  resourceName: string,
  organizationId: string
): AuditEvent {
  return createAuditEvent({
    category: 'data_access',
    actorId,
    actorName,
    action: 'read',
    resource,
    resourceId,
    resourceName,
    organizationId,
    description: `${actorName} accessed ${resource} "${resourceName}"`,
  });
}

export function createDataExportEvent(
  actorId: string,
  actorName: string,
  resource: Resource,
  resourceIds: string[],
  format: string,
  organizationId: string
): AuditEvent {
  return createAuditEvent({
    category: 'data_access',
    severity: 'warning', // Exports are sensitive
    actorId,
    actorName,
    action: 'export',
    resource,
    organizationId,
    description: `${actorName} exported ${resourceIds.length} ${resource} records as ${format}`,
    metadata: { resourceIds, format },
    isCompliance: true,
  });
}

// Data modification events
export function createDataCreateEvent(
  actorId: string,
  actorName: string,
  resource: Resource,
  resourceId: string,
  resourceName: string,
  newValue: unknown,
  organizationId: string
): AuditEvent {
  return createAuditEvent({
    category: 'data_modification',
    actorId,
    actorName,
    action: 'create',
    resource,
    resourceId,
    resourceName,
    organizationId,
    description: `${actorName} created ${resource} "${resourceName}"`,
    newValue,
  });
}

export function createDataUpdateEvent(
  actorId: string,
  actorName: string,
  resource: Resource,
  resourceId: string,
  resourceName: string,
  previousValue: unknown,
  newValue: unknown,
  organizationId: string,
  changedFields?: string[]
): AuditEvent {
  return createAuditEvent({
    category: 'data_modification',
    actorId,
    actorName,
    action: 'update',
    resource,
    resourceId,
    resourceName,
    organizationId,
    description: `${actorName} updated ${resource} "${resourceName}"${changedFields ? ` (fields: ${changedFields.join(', ')})` : ''}`,
    previousValue,
    newValue,
    metadata: changedFields ? { changedFields } : undefined,
  });
}

export function createDataDeleteEvent(
  actorId: string,
  actorName: string,
  resource: Resource,
  resourceId: string,
  resourceName: string,
  previousValue: unknown,
  organizationId: string
): AuditEvent {
  return createAuditEvent({
    category: 'data_modification',
    severity: 'warning',
    actorId,
    actorName,
    action: 'delete',
    resource,
    resourceId,
    resourceName,
    organizationId,
    description: `${actorName} deleted ${resource} "${resourceName}"`,
    previousValue,
  });
}

// Security events
export function createPermissionDeniedEvent(
  actorId: string,
  actorName: string,
  action: Action,
  resource: Resource,
  resourceId: string,
  organizationId: string
): AuditEvent {
  return createAuditEvent({
    category: 'security',
    severity: 'warning',
    outcome: 'failure',
    actorId,
    actorName,
    action,
    resource,
    resourceId,
    organizationId,
    description: `Permission denied: ${actorName} attempted to ${action} ${resource} ${resourceId}`,
  });
}

export function createRoleAssignmentEvent(
  actorId: string,
  actorName: string,
  targetUserId: string,
  targetUserName: string,
  roleId: string,
  roleName: string,
  organizationId: string,
  isRevoke: boolean = false
): AuditEvent {
  return createAuditEvent({
    category: 'security',
    severity: 'warning',
    actorId,
    actorName,
    action: isRevoke ? 'delete' : 'create',
    resource: 'role',
    resourceId: roleId,
    resourceName: roleName,
    organizationId,
    description: isRevoke
      ? `${actorName} revoked role "${roleName}" from ${targetUserName}`
      : `${actorName} assigned role "${roleName}" to ${targetUserName}`,
    metadata: { targetUserId, targetUserName },
  });
}

// Compliance events
export function createApprovalEvent(
  actorId: string,
  actorName: string,
  resource: Resource,
  resourceId: string,
  resourceName: string,
  approved: boolean,
  organizationId: string,
  comments?: string
): AuditEvent {
  return createAuditEvent({
    category: 'compliance',
    actorId,
    actorName,
    action: approved ? 'approve' : 'reject',
    resource,
    resourceId,
    resourceName,
    organizationId,
    description: approved
      ? `${actorName} approved ${resource} "${resourceName}"`
      : `${actorName} rejected ${resource} "${resourceName}"`,
    metadata: comments ? { comments } : undefined,
    isCompliance: true,
    complianceFrameworks: ['SOX'],
  });
}

export function createCertificationEvent(
  actorId: string,
  actorName: string,
  certificationType: 'SOX302' | 'SOX404',
  certificationId: string,
  period: string,
  organizationId: string
): AuditEvent {
  return createAuditEvent({
    category: 'compliance',
    severity: 'warning',
    actorId,
    actorName,
    action: 'approve',
    resource: 'certification',
    resourceId: certificationId,
    resourceName: `${certificationType} Certification - ${period}`,
    organizationId,
    description: `${actorName} signed ${certificationType} certification for ${period}`,
    isCompliance: true,
    complianceFrameworks: ['SOX'],
  });
}

// System events
export function createSystemEvent(
  action: string,
  description: string,
  metadata?: Record<string, unknown>
): AuditEvent {
  return createAuditEvent({
    category: 'system',
    actorType: 'system',
    action,
    resource: 'settings',
    description,
    metadata,
  });
}

export function createAutomationEvent(
  automationName: string,
  action: string,
  resource: Resource,
  resourceId: string,
  description: string,
  organizationId: string
): AuditEvent {
  return createAuditEvent({
    category: 'system',
    actorType: 'automation',
    actorName: automationName,
    action,
    resource,
    resourceId,
    organizationId,
    description,
  });
}

// ==========================================================================
// AUDIT LOG QUERY
// ==========================================================================

export interface AuditLogQuery {
  organizationId?: string;
  actorId?: string;
  resource?: Resource;
  resourceId?: string;
  action?: Action;
  category?: AuditEventCategory;
  severity?: AuditEventSeverity;
  outcome?: AuditEventOutcome;
  startDate?: Date;
  endDate?: Date;
  searchText?: string;
  isCompliance?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'severity' | 'category';
  sortOrder?: 'asc' | 'desc';
}

export function filterAuditEvents(events: AuditEvent[], query: AuditLogQuery): AuditEvent[] {
  let filtered = [...events];

  if (query.organizationId) {
    filtered = filtered.filter(e => e.organizationId === query.organizationId);
  }
  if (query.actorId) {
    filtered = filtered.filter(e => e.actorId === query.actorId);
  }
  if (query.resource) {
    filtered = filtered.filter(e => e.resource === query.resource);
  }
  if (query.resourceId) {
    filtered = filtered.filter(e => e.resourceId === query.resourceId);
  }
  if (query.action) {
    filtered = filtered.filter(e => e.action === query.action);
  }
  if (query.category) {
    filtered = filtered.filter(e => e.category === query.category);
  }
  if (query.severity) {
    filtered = filtered.filter(e => e.severity === query.severity);
  }
  if (query.outcome) {
    filtered = filtered.filter(e => e.outcome === query.outcome);
  }
  if (query.startDate) {
    filtered = filtered.filter(e => e.timestamp >= query.startDate!);
  }
  if (query.endDate) {
    filtered = filtered.filter(e => e.timestamp <= query.endDate!);
  }
  if (query.isCompliance !== undefined) {
    filtered = filtered.filter(e => e.isCompliance === query.isCompliance);
  }
  if (query.searchText) {
    const searchLower = query.searchText.toLowerCase();
    filtered = filtered.filter(e =>
      e.description.toLowerCase().includes(searchLower) ||
      e.actorName?.toLowerCase().includes(searchLower) ||
      e.resourceName?.toLowerCase().includes(searchLower)
    );
  }

  // Sort
  const sortBy = query.sortBy ?? 'timestamp';
  const sortOrder = query.sortOrder ?? 'desc';
  const severityOrder = { critical: 0, error: 1, warning: 2, info: 3 };

  filtered.sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'timestamp':
        comparison = a.timestamp.getTime() - b.timestamp.getTime();
        break;
      case 'severity':
        comparison = severityOrder[a.severity] - severityOrder[b.severity];
        break;
      case 'category':
        comparison = a.category.localeCompare(b.category);
        break;
    }
    return sortOrder === 'desc' ? -comparison : comparison;
  });

  // Pagination
  const offset = query.offset ?? 0;
  const limit = query.limit ?? 100;
  return filtered.slice(offset, offset + limit);
}

// ==========================================================================
// AUDIT LOG SUMMARY
// ==========================================================================

export interface AuditLogSummary {
  totalEvents: number;
  byCategory: Record<AuditEventCategory, number>;
  bySeverity: Record<AuditEventSeverity, number>;
  byOutcome: Record<AuditEventOutcome, number>;
  byResource: Record<string, number>;
  byActor: { actorId: string; actorName: string; count: number }[];
  recentActivity: AuditEvent[];
  securityAlerts: AuditEvent[];
  complianceEvents: number;
}

export function summarizeAuditLog(events: AuditEvent[]): AuditLogSummary {
  const byCategory: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  const byOutcome: Record<string, number> = {};
  const byResource: Record<string, number> = {};
  const actorCounts = new Map<string, { actorId: string; actorName: string; count: number }>();
  let complianceEvents = 0;

  for (const event of events) {
    byCategory[event.category] = (byCategory[event.category] ?? 0) + 1;
    bySeverity[event.severity] = (bySeverity[event.severity] ?? 0) + 1;
    byOutcome[event.outcome] = (byOutcome[event.outcome] ?? 0) + 1;
    byResource[event.resource] = (byResource[event.resource] ?? 0) + 1;

    if (event.actorId) {
      const existing = actorCounts.get(event.actorId);
      if (existing) {
        existing.count++;
      } else {
        actorCounts.set(event.actorId, {
          actorId: event.actorId,
          actorName: event.actorName ?? 'Unknown',
          count: 1,
        });
      }
    }

    if (event.isCompliance) {
      complianceEvents++;
    }
  }

  // Top actors
  const byActor = Array.from(actorCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Recent activity (last 24 hours)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentActivity = events
    .filter(e => e.timestamp >= oneDayAgo)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 20);

  // Security alerts
  const securityAlerts = events
    .filter(e => e.category === 'security' && (e.severity === 'warning' || e.severity === 'error' || e.severity === 'critical'))
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 10);

  return {
    totalEvents: events.length,
    byCategory: byCategory as Record<AuditEventCategory, number>,
    bySeverity: bySeverity as Record<AuditEventSeverity, number>,
    byOutcome: byOutcome as Record<AuditEventOutcome, number>,
    byResource,
    byActor,
    recentActivity,
    securityAlerts,
    complianceEvents,
  };
}
