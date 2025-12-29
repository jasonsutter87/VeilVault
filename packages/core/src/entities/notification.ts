// ==========================================================================
// NOTIFICATION ENTITY
// In-app notifications and activity feed
// ==========================================================================

import { randomUUID } from '../utils/crypto.js';

export type NotificationType =
  | 'task_assigned'
  | 'task_completed'
  | 'task_due_soon'
  | 'task_overdue'
  | 'comment_added'
  | 'comment_reply'
  | 'comment_mention'
  | 'audit_generated'
  | 'audit_verified'
  | 'integrity_alert'
  | 'integrity_warning'
  | 'user_invited'
  | 'user_joined'
  | 'ledger_created'
  | 'transaction_added'
  | 'verification_failed'
  | 'system';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Notification {
  id: string;
  organizationId: string;
  userId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, unknown>;
  read: boolean;
  readAt?: Date;
  archived: boolean;
  createdAt: Date;
}

export interface CreateNotificationInput {
  organizationId: string;
  userId: string;
  type: NotificationType;
  priority?: NotificationPriority;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

export function createNotification(input: CreateNotificationInput): Notification {
  return {
    id: randomUUID(),
    organizationId: input.organizationId,
    userId: input.userId,
    type: input.type,
    priority: input.priority ?? 'normal',
    title: input.title,
    message: input.message,
    link: input.link,
    metadata: input.metadata,
    read: false,
    archived: false,
    createdAt: new Date(),
  };
}

export function markAsRead(notification: Notification): Notification {
  return {
    ...notification,
    read: true,
    readAt: new Date(),
  };
}

export function archiveNotification(notification: Notification): Notification {
  return {
    ...notification,
    archived: true,
  };
}

export interface NotificationPreferences {
  // Which notification types to send
  taskAssigned: boolean;
  taskCompleted: boolean;
  taskDueSoon: boolean;
  taskOverdue: boolean;
  commentAdded: boolean;
  commentReply: boolean;
  commentMention: boolean;
  auditGenerated: boolean;
  auditVerified: boolean;
  integrityAlert: boolean;
  integrityWarning: boolean;
  userInvited: boolean;
  userJoined: boolean;
  // Delivery methods
  inApp: boolean;
  email: boolean;
  // Email digest settings
  emailDigestFrequency: 'realtime' | 'daily' | 'weekly' | 'none';
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  taskAssigned: true,
  taskCompleted: true,
  taskDueSoon: true,
  taskOverdue: true,
  commentAdded: true,
  commentReply: true,
  commentMention: true,
  auditGenerated: true,
  auditVerified: false,
  integrityAlert: true,
  integrityWarning: true,
  userInvited: true,
  userJoined: false,
  inApp: true,
  email: true,
  emailDigestFrequency: 'realtime',
};

// ==========================================================================
// ACTIVITY LOG
// Audit trail of all actions
// ==========================================================================

export type ActivityAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'archived'
  | 'restored'
  | 'assigned'
  | 'unassigned'
  | 'completed'
  | 'verified'
  | 'exported'
  | 'shared'
  | 'commented'
  | 'logged_in'
  | 'logged_out'
  | 'invited'
  | 'joined'
  | 'left';

export interface Activity {
  id: string;
  organizationId: string;
  actorId: string;
  actorName: string;
  action: ActivityAction;
  targetType: string;
  targetId: string;
  targetName?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface CreateActivityInput {
  organizationId: string;
  actorId: string;
  actorName: string;
  action: ActivityAction;
  targetType: string;
  targetId: string;
  targetName?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export function createActivity(input: CreateActivityInput): Activity {
  return {
    id: randomUUID(),
    organizationId: input.organizationId,
    actorId: input.actorId,
    actorName: input.actorName,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    targetName: input.targetName,
    details: input.details,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    createdAt: new Date(),
  };
}

export function formatActivityMessage(activity: Activity): string {
  const target = activity.targetName ?? activity.targetType;

  const actionMessages: Record<ActivityAction, string> = {
    created: `created ${target}`,
    updated: `updated ${target}`,
    deleted: `deleted ${target}`,
    archived: `archived ${target}`,
    restored: `restored ${target}`,
    assigned: `assigned ${target}`,
    unassigned: `unassigned from ${target}`,
    completed: `completed ${target}`,
    verified: `verified ${target}`,
    exported: `exported ${target}`,
    shared: `shared ${target}`,
    commented: `commented on ${target}`,
    logged_in: 'logged in',
    logged_out: 'logged out',
    invited: `invited to ${target}`,
    joined: `joined ${target}`,
    left: `left ${target}`,
  };

  return `${activity.actorName} ${actionMessages[activity.action]}`;
}

export interface ActivityFeed {
  activities: Activity[];
  total: number;
  hasMore: boolean;
}

export function groupActivitiesByDate(activities: Activity[]): Map<string, Activity[]> {
  const groups = new Map<string, Activity[]>();

  for (const activity of activities) {
    const dateKey = activity.createdAt.toISOString().split('T')[0] ?? '';
    const existing = groups.get(dateKey) ?? [];
    groups.set(dateKey, [...existing, activity]);
  }

  return groups;
}
