// ==========================================================================
// COLLABORATION SERVICE
// Manages comments, tasks, notifications, and activity
// ==========================================================================

import type { Comment, CreateCommentInput, CommentThread } from '../entities/comment.js';
import type { Task, CreateTaskInput, TaskSummary } from '../entities/task.js';
import type {
  Notification,
  CreateNotificationInput,
  Activity,
  CreateActivityInput,
  ActivityFeed,
} from '../entities/notification.js';
import {
  createComment,
  updateComment,
  resolveComment,
  addReaction,
  softDeleteComment,
  buildCommentThread,
} from '../entities/comment.js';
import {
  createTask,
  assignTask,
  updateTaskStatus,
  addChecklistItem,
  toggleChecklistItem,
  calculateTaskSummary,
  isOverdue,
} from '../entities/task.js';
import {
  createNotification,
  markAsRead,
  archiveNotification,
  createActivity,
  formatActivityMessage,
  groupActivitiesByDate,
} from '../entities/notification.js';

export interface CollaborationServiceConfig {
  organizationId: string;
}

export class CollaborationService {
  private organizationId: string;
  private comments: Map<string, Comment> = new Map();
  private tasks: Map<string, Task> = new Map();
  private notifications: Map<string, Notification> = new Map();
  private activities: Activity[] = [];

  constructor(config: CollaborationServiceConfig) {
    this.organizationId = config.organizationId;
  }

  // ==========================================================================
  // COMMENTS
  // ==========================================================================

  addComment(input: Omit<CreateCommentInput, 'organizationId'>): Comment {
    const comment = createComment({
      ...input,
      organizationId: this.organizationId,
    });
    this.comments.set(comment.id, comment);

    // Create notifications for mentions
    for (const mentionedUserId of comment.mentions) {
      this.createMentionNotification(comment, mentionedUserId);
    }

    // Log activity
    this.logActivity({
      actorId: input.authorId,
      actorName: input.authorName,
      action: 'commented',
      targetType: input.targetType,
      targetId: input.targetId,
    });

    return comment;
  }

  getComment(commentId: string): Comment | undefined {
    return this.comments.get(commentId);
  }

  getCommentsForTarget(targetType: string, targetId: string): Comment[] {
    return Array.from(this.comments.values())
      .filter(
        (c) =>
          c.targetType === targetType &&
          c.targetId === targetId &&
          !c.deletedAt
      )
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  getCommentThread(rootCommentId: string): CommentThread | null {
    const allComments = Array.from(this.comments.values());
    return buildCommentThread(allComments, rootCommentId);
  }

  editComment(commentId: string, newContent: string): Comment | null {
    const comment = this.comments.get(commentId);
    if (!comment) return null;

    const updated = updateComment(comment, newContent);
    this.comments.set(commentId, updated);
    return updated;
  }

  resolveCommentById(commentId: string): Comment | null {
    const comment = this.comments.get(commentId);
    if (!comment) return null;

    const resolved = resolveComment(comment);
    this.comments.set(commentId, resolved);
    return resolved;
  }

  addCommentReaction(commentId: string, userId: string, emoji: string): Comment | null {
    const comment = this.comments.get(commentId);
    if (!comment) return null;

    const updated = addReaction(comment, userId, emoji);
    this.comments.set(commentId, updated);
    return updated;
  }

  deleteComment(commentId: string): boolean {
    const comment = this.comments.get(commentId);
    if (!comment) return false;

    const deleted = softDeleteComment(comment);
    this.comments.set(commentId, deleted);
    return true;
  }

  private createMentionNotification(comment: Comment, userId: string): void {
    const notification = createNotification({
      organizationId: this.organizationId,
      userId,
      type: 'comment_mention',
      priority: 'normal',
      title: 'You were mentioned',
      message: `${comment.authorName} mentioned you in a comment`,
      link: `/${comment.targetType}s/${comment.targetId}#comment-${comment.id}`,
      metadata: { commentId: comment.id },
    });
    this.notifications.set(notification.id, notification);
  }

  // ==========================================================================
  // TASKS
  // ==========================================================================

  createNewTask(input: Omit<CreateTaskInput, 'organizationId'>): Task {
    const task = createTask({
      ...input,
      organizationId: this.organizationId,
    });
    this.tasks.set(task.id, task);

    // Notify assignee if assigned
    if (task.assigneeId && task.assigneeId !== task.creatorId) {
      this.createTaskAssignedNotification(task);
    }

    // Log activity
    this.logActivity({
      actorId: input.creatorId,
      actorName: input.creatorName,
      action: 'created',
      targetType: 'task',
      targetId: task.id,
      targetName: task.title,
    });

    return task;
  }

  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  getTasksForTarget(targetType: string, targetId: string): Task[] {
    return Array.from(this.tasks.values())
      .filter((t) => t.targetType === targetType && t.targetId === targetId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  getTasksForUser(userId: string): Task[] {
    return Array.from(this.tasks.values())
      .filter((t) => t.assigneeId === userId || t.creatorId === userId)
      .sort((a, b) => {
        // Sort by priority, then due date
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;

        if (a.dueDate && b.dueDate) {
          return a.dueDate.getTime() - b.dueDate.getTime();
        }
        return 0;
      });
  }

  assignTaskTo(taskId: string, assigneeId: string, assigneeName: string, actorId: string, actorName: string): Task | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    const updated = assignTask(task, assigneeId, assigneeName);
    this.tasks.set(taskId, updated);

    // Notify assignee
    if (assigneeId !== actorId) {
      this.createTaskAssignedNotification(updated);
    }

    // Log activity
    this.logActivity({
      actorId,
      actorName,
      action: 'assigned',
      targetType: 'task',
      targetId: taskId,
      targetName: task.title,
      details: { assigneeId, assigneeName },
    });

    return updated;
  }

  updateStatus(taskId: string, status: Task['status'], userId: string, userName: string): Task | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    const updated = updateTaskStatus(task, status, userId);
    this.tasks.set(taskId, updated);

    // Notify watchers if completed
    if (status === 'completed') {
      for (const watcherId of task.watchers) {
        if (watcherId !== userId) {
          this.createTaskCompletedNotification(updated, watcherId);
        }
      }
    }

    // Log activity
    this.logActivity({
      actorId: userId,
      actorName: userName,
      action: status === 'completed' ? 'completed' : 'updated',
      targetType: 'task',
      targetId: taskId,
      targetName: task.title,
      details: { status },
    });

    return updated;
  }

  addTaskChecklistItem(taskId: string, text: string): Task | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    const updated = addChecklistItem(task, text);
    this.tasks.set(taskId, updated);
    return updated;
  }

  toggleTaskChecklistItem(taskId: string, itemId: string, userId: string): Task | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    const updated = toggleChecklistItem(task, itemId, userId);
    this.tasks.set(taskId, updated);
    return updated;
  }

  getTaskSummary(): TaskSummary {
    return calculateTaskSummary(Array.from(this.tasks.values()));
  }

  getOverdueTasks(): Task[] {
    return Array.from(this.tasks.values()).filter(isOverdue);
  }

  private createTaskAssignedNotification(task: Task): void {
    if (!task.assigneeId) return;

    const notification = createNotification({
      organizationId: this.organizationId,
      userId: task.assigneeId,
      type: 'task_assigned',
      priority: task.priority === 'critical' ? 'urgent' : 'normal',
      title: 'New task assigned',
      message: `You've been assigned: ${task.title}`,
      link: `/tasks/${task.id}`,
      metadata: { taskId: task.id },
    });
    this.notifications.set(notification.id, notification);
  }

  private createTaskCompletedNotification(task: Task, userId: string): void {
    const notification = createNotification({
      organizationId: this.organizationId,
      userId,
      type: 'task_completed',
      priority: 'low',
      title: 'Task completed',
      message: `"${task.title}" has been completed`,
      link: `/tasks/${task.id}`,
      metadata: { taskId: task.id },
    });
    this.notifications.set(notification.id, notification);
  }

  // ==========================================================================
  // NOTIFICATIONS
  // ==========================================================================

  notify(input: Omit<CreateNotificationInput, 'organizationId'>): Notification {
    const notification = createNotification({
      ...input,
      organizationId: this.organizationId,
    });
    this.notifications.set(notification.id, notification);
    return notification;
  }

  getNotificationsForUser(userId: string, includeRead = false): Notification[] {
    return Array.from(this.notifications.values())
      .filter((n) => n.userId === userId && !n.archived && (includeRead || !n.read))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getUnreadCount(userId: string): number {
    return Array.from(this.notifications.values()).filter(
      (n) => n.userId === userId && !n.read && !n.archived
    ).length;
  }

  markNotificationAsRead(notificationId: string): Notification | null {
    const notification = this.notifications.get(notificationId);
    if (!notification) return null;

    const updated = markAsRead(notification);
    this.notifications.set(notificationId, updated);
    return updated;
  }

  markAllAsRead(userId: string): number {
    let count = 0;
    for (const [id, notification] of this.notifications) {
      if (notification.userId === userId && !notification.read) {
        this.notifications.set(id, markAsRead(notification));
        count++;
      }
    }
    return count;
  }

  archiveNotificationById(notificationId: string): boolean {
    const notification = this.notifications.get(notificationId);
    if (!notification) return false;

    this.notifications.set(notificationId, archiveNotification(notification));
    return true;
  }

  // ==========================================================================
  // ACTIVITY LOG
  // ==========================================================================

  logActivity(input: Omit<CreateActivityInput, 'organizationId'>): Activity {
    const activity = createActivity({
      ...input,
      organizationId: this.organizationId,
    });
    this.activities.push(activity);
    return activity;
  }

  getActivityFeed(limit = 50, offset = 0): ActivityFeed {
    const sorted = [...this.activities].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
    const total = sorted.length;
    const activities = sorted.slice(offset, offset + limit);

    return {
      activities,
      total,
      hasMore: offset + limit < total,
    };
  }

  getActivityForTarget(targetType: string, targetId: string): Activity[] {
    return this.activities
      .filter((a) => a.targetType === targetType && a.targetId === targetId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getActivityByUser(userId: string): Activity[] {
    return this.activities
      .filter((a) => a.actorId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getActivityGroupedByDate(): Map<string, Activity[]> {
    return groupActivitiesByDate(this.activities);
  }
}

export function createCollaborationService(
  config: CollaborationServiceConfig
): CollaborationService {
  return new CollaborationService(config);
}
