// ==========================================================================
// REAL-TIME COLLABORATION SERVICE
// WebSocket event types and message handling
// ==========================================================================

import { randomUUID } from '../utils/crypto.js';

// ==========================================================================
// EVENT TYPES
// ==========================================================================

export type RealtimeEventType =
  // Entity changes
  | 'entity:created'
  | 'entity:updated'
  | 'entity:deleted'
  // Collaboration
  | 'user:joined'
  | 'user:left'
  | 'user:typing'
  | 'user:viewing'
  // Presence
  | 'user:online'
  | 'user:away'
  | 'user:busy'
  | 'users:online'
  | 'viewers:list'
  // Comments
  | 'comment:added'
  | 'comment:updated'
  | 'comment:deleted'
  // Notifications
  | 'notification:new'
  | 'notification:read'
  // Alerts
  | 'alert:triggered'
  | 'alert:acknowledged'
  // Tasks
  | 'task:assigned'
  | 'task:completed'
  | 'task:overdue'
  // Anomalies
  | 'anomaly:detected'
  | 'anomaly:resolved'
  // System
  | 'system:broadcast'
  | 'system:maintenance'
  | 'ping'
  | 'pong';

export type EntityType =
  | 'risk'
  | 'control'
  | 'issue'
  | 'task'
  | 'ledger'
  | 'transaction'
  | 'audit_package'
  | 'report'
  | 'user'
  | 'organization';

// ==========================================================================
// MESSAGE TYPES
// ==========================================================================

export interface RealtimeMessage<T = unknown> {
  id: string;
  type: RealtimeEventType;
  timestamp: Date;
  senderId?: string;
  senderName?: string;
  organizationId?: string;
  payload: T;
}

export interface EntityChangePayload {
  entityType: EntityType;
  entityId: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
  entity?: unknown;
}

export interface UserPresencePayload {
  userId: string;
  userName: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  currentView?: string;
  entityType?: EntityType;
  entityId?: string;
}

export interface TypingPayload {
  userId: string;
  userName: string;
  entityType: EntityType;
  entityId: string;
  isTyping: boolean;
}

export interface CommentPayload {
  commentId: string;
  entityType: EntityType;
  entityId: string;
  content?: string;
  authorId: string;
  authorName: string;
  parentCommentId?: string;
}

export interface NotificationPayload {
  notificationId: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  link?: string;
  targetUserId?: string;
}

export interface AlertPayload {
  alertId: string;
  ruleId: string;
  ruleName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  entityType?: EntityType;
  entityId?: string;
}

export interface TaskPayload {
  taskId: string;
  title: string;
  assigneeId: string;
  assigneeName: string;
  dueDate?: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface AnomalyPayload {
  anomalyId: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  entityType?: EntityType;
  entityIds?: string[];
}

// ==========================================================================
// MESSAGE BUILDERS
// ==========================================================================

export function createMessage<T>(
  type: RealtimeEventType,
  payload: T,
  options: {
    senderId?: string;
    senderName?: string;
    organizationId?: string;
  } = {}
): RealtimeMessage<T> {
  return {
    id: randomUUID(),
    type,
    timestamp: new Date(),
    senderId: options.senderId,
    senderName: options.senderName,
    organizationId: options.organizationId,
    payload,
  };
}

export function createEntityCreatedMessage(
  entityType: EntityType,
  entityId: string,
  entity: unknown,
  options: { senderId?: string; senderName?: string; organizationId?: string } = {}
): RealtimeMessage<EntityChangePayload> {
  return createMessage('entity:created', { entityType, entityId, entity }, options);
}

export function createEntityUpdatedMessage(
  entityType: EntityType,
  entityId: string,
  changes: Record<string, { old: unknown; new: unknown }>,
  options: { senderId?: string; senderName?: string; organizationId?: string } = {}
): RealtimeMessage<EntityChangePayload> {
  return createMessage('entity:updated', { entityType, entityId, changes }, options);
}

export function createEntityDeletedMessage(
  entityType: EntityType,
  entityId: string,
  options: { senderId?: string; senderName?: string; organizationId?: string } = {}
): RealtimeMessage<EntityChangePayload> {
  return createMessage('entity:deleted', { entityType, entityId }, options);
}

export function createUserJoinedMessage(
  userId: string,
  userName: string,
  organizationId: string
): RealtimeMessage<UserPresencePayload> {
  return createMessage(
    'user:joined',
    { userId, userName, status: 'online' },
    { senderId: userId, senderName: userName, organizationId }
  );
}

export function createUserLeftMessage(
  userId: string,
  userName: string,
  organizationId: string
): RealtimeMessage<UserPresencePayload> {
  return createMessage(
    'user:left',
    { userId, userName, status: 'offline' },
    { senderId: userId, senderName: userName, organizationId }
  );
}

export function createTypingMessage(
  userId: string,
  userName: string,
  entityType: EntityType,
  entityId: string,
  isTyping: boolean
): RealtimeMessage<TypingPayload> {
  return createMessage(
    'user:typing',
    { userId, userName, entityType, entityId, isTyping },
    { senderId: userId, senderName: userName }
  );
}

export function createViewingMessage(
  userId: string,
  userName: string,
  entityType: EntityType,
  entityId: string
): RealtimeMessage<UserPresencePayload> {
  return createMessage(
    'user:viewing',
    { userId, userName, status: 'online', entityType, entityId, currentView: `${entityType}/${entityId}` },
    { senderId: userId, senderName: userName }
  );
}

export function createCommentAddedMessage(
  comment: {
    id: string;
    content: string;
    authorId: string;
    authorName: string;
    parentCommentId?: string;
  },
  entityType: EntityType,
  entityId: string,
  organizationId: string
): RealtimeMessage<CommentPayload> {
  return createMessage(
    'comment:added',
    {
      commentId: comment.id,
      entityType,
      entityId,
      content: comment.content,
      authorId: comment.authorId,
      authorName: comment.authorName,
      parentCommentId: comment.parentCommentId,
    },
    { senderId: comment.authorId, senderName: comment.authorName, organizationId }
  );
}

export function createNotificationMessage(
  notification: {
    id: string;
    title: string;
    message: string;
    severity: 'info' | 'warning' | 'error' | 'success';
    link?: string;
  },
  targetUserId?: string
): RealtimeMessage<NotificationPayload> {
  return createMessage('notification:new', {
    notificationId: notification.id,
    title: notification.title,
    message: notification.message,
    severity: notification.severity,
    link: notification.link,
    targetUserId,
  });
}

export function createAlertTriggeredMessage(
  alert: {
    id: string;
    ruleId: string;
    ruleName: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
  },
  entityType?: EntityType,
  entityId?: string,
  organizationId?: string
): RealtimeMessage<AlertPayload> {
  return createMessage(
    'alert:triggered',
    {
      alertId: alert.id,
      ruleId: alert.ruleId,
      ruleName: alert.ruleName,
      severity: alert.severity,
      message: alert.message,
      entityType,
      entityId,
    },
    { organizationId }
  );
}

export function createTaskAssignedMessage(
  task: {
    id: string;
    title: string;
    assigneeId: string;
    assigneeName: string;
    dueDate?: Date;
    priority: 'low' | 'medium' | 'high' | 'urgent';
  },
  organizationId: string
): RealtimeMessage<TaskPayload> {
  return createMessage(
    'task:assigned',
    {
      taskId: task.id,
      title: task.title,
      assigneeId: task.assigneeId,
      assigneeName: task.assigneeName,
      dueDate: task.dueDate,
      priority: task.priority,
    },
    { organizationId }
  );
}

export function createAnomalyDetectedMessage(
  anomaly: {
    id: string;
    type: string;
    severity: 'info' | 'warning' | 'critical';
    title: string;
  },
  entityType?: EntityType,
  entityIds?: string[],
  organizationId?: string
): RealtimeMessage<AnomalyPayload> {
  return createMessage(
    'anomaly:detected',
    {
      anomalyId: anomaly.id,
      type: anomaly.type,
      severity: anomaly.severity,
      title: anomaly.title,
      entityType,
      entityIds,
    },
    { organizationId }
  );
}

// ==========================================================================
// ROOM/CHANNEL MANAGEMENT
// ==========================================================================

export type RoomType = 'organization' | 'entity' | 'user' | 'broadcast';

export interface Room {
  id: string;
  type: RoomType;
  name: string;
  organizationId?: string;
  entityType?: EntityType;
  entityId?: string;
  members: Set<string>; // User IDs
  createdAt: Date;
}

export function createRoom(
  type: RoomType,
  name: string,
  options: {
    organizationId?: string;
    entityType?: EntityType;
    entityId?: string;
  } = {}
): Room {
  return {
    id: randomUUID(),
    type,
    name,
    organizationId: options.organizationId,
    entityType: options.entityType,
    entityId: options.entityId,
    members: new Set(),
    createdAt: new Date(),
  };
}

export function getRoomId(type: RoomType, ...parts: string[]): string {
  return `${type}:${parts.join(':')}`;
}

export function getOrganizationRoomId(organizationId: string): string {
  return getRoomId('organization', organizationId);
}

export function getEntityRoomId(entityType: EntityType, entityId: string): string {
  return getRoomId('entity', entityType, entityId);
}

export function getUserRoomId(userId: string): string {
  return getRoomId('user', userId);
}

// ==========================================================================
// PRESENCE TRACKING
// ==========================================================================

export interface UserPresence {
  userId: string;
  userName: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeenAt: Date;
  currentView?: string;
  entityType?: EntityType;
  entityId?: string;
  connectionCount: number;
}

export interface PresenceStore {
  users: Map<string, UserPresence>;

  setOnline(userId: string, userName: string): void;
  setOffline(userId: string): void;
  setAway(userId: string): void;
  setBusy(userId: string): void;
  setViewing(userId: string, entityType: EntityType, entityId: string): void;
  clearViewing(userId: string): void;
  getPresence(userId: string): UserPresence | undefined;
  getOnlineUsers(organizationId?: string): UserPresence[];
  getViewers(entityType: EntityType, entityId: string): UserPresence[];
}

export function createPresenceStore(): PresenceStore {
  const users = new Map<string, UserPresence>();

  return {
    users,

    setOnline(userId: string, userName: string) {
      const existing = users.get(userId);
      if (existing) {
        existing.status = 'online';
        existing.lastSeenAt = new Date();
        existing.connectionCount++;
      } else {
        users.set(userId, {
          userId,
          userName,
          status: 'online',
          lastSeenAt: new Date(),
          connectionCount: 1,
        });
      }
    },

    setOffline(userId: string) {
      const user = users.get(userId);
      if (user) {
        user.connectionCount--;
        if (user.connectionCount <= 0) {
          user.status = 'offline';
          user.lastSeenAt = new Date();
          user.currentView = undefined;
          user.entityType = undefined;
          user.entityId = undefined;
        }
      }
    },

    setAway(userId: string) {
      const user = users.get(userId);
      if (user) {
        user.status = 'away';
        user.lastSeenAt = new Date();
      }
    },

    setBusy(userId: string) {
      const user = users.get(userId);
      if (user) {
        user.status = 'busy';
        user.lastSeenAt = new Date();
      }
    },

    setViewing(userId: string, entityType: EntityType, entityId: string) {
      const user = users.get(userId);
      if (user) {
        user.currentView = `${entityType}/${entityId}`;
        user.entityType = entityType;
        user.entityId = entityId;
        user.lastSeenAt = new Date();
      }
    },

    clearViewing(userId: string) {
      const user = users.get(userId);
      if (user) {
        user.currentView = undefined;
        user.entityType = undefined;
        user.entityId = undefined;
      }
    },

    getPresence(userId: string) {
      return users.get(userId);
    },

    getOnlineUsers() {
      return Array.from(users.values()).filter(u => u.status !== 'offline');
    },

    getViewers(entityType: EntityType, entityId: string) {
      return Array.from(users.values()).filter(
        u => u.status !== 'offline' && u.entityType === entityType && u.entityId === entityId
      );
    },
  };
}

// ==========================================================================
// TYPING INDICATORS
// ==========================================================================

export interface TypingIndicator {
  userId: string;
  userName: string;
  entityType: EntityType;
  entityId: string;
  startedAt: Date;
  expiresAt: Date;
}

export interface TypingStore {
  indicators: Map<string, TypingIndicator>;

  startTyping(userId: string, userName: string, entityType: EntityType, entityId: string, ttlMs?: number): void;
  stopTyping(userId: string, entityType: EntityType, entityId: string): void;
  getTyping(entityType: EntityType, entityId: string): TypingIndicator[];
  cleanup(): void;
}

export function createTypingStore(): TypingStore {
  const indicators = new Map<string, TypingIndicator>();

  const getKey = (userId: string, entityType: EntityType, entityId: string) =>
    `${userId}:${entityType}:${entityId}`;

  return {
    indicators,

    startTyping(userId: string, userName: string, entityType: EntityType, entityId: string, ttlMs = 5000) {
      const key = getKey(userId, entityType, entityId);
      const now = new Date();
      indicators.set(key, {
        userId,
        userName,
        entityType,
        entityId,
        startedAt: now,
        expiresAt: new Date(now.getTime() + ttlMs),
      });
    },

    stopTyping(userId: string, entityType: EntityType, entityId: string) {
      const key = getKey(userId, entityType, entityId);
      indicators.delete(key);
    },

    getTyping(entityType: EntityType, entityId: string) {
      const now = new Date();
      const result: TypingIndicator[] = [];

      for (const [key, indicator] of indicators) {
        if (indicator.entityType === entityType && indicator.entityId === entityId) {
          if (indicator.expiresAt > now) {
            result.push(indicator);
          } else {
            indicators.delete(key);
          }
        }
      }

      return result;
    },

    cleanup() {
      const now = new Date();
      for (const [key, indicator] of indicators) {
        if (indicator.expiresAt <= now) {
          indicators.delete(key);
        }
      }
    },
  };
}
