// ==========================================================================
// TASK ENTITY
// Task management for audit workflows
// ==========================================================================

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskStatus = 'pending' | 'in_progress' | 'review' | 'completed' | 'cancelled';
export type TaskType =
  | 'audit_review'
  | 'control_test'
  | 'evidence_request'
  | 'remediation'
  | 'verification'
  | 'report_review'
  | 'general';

export interface Task {
  id: string;
  organizationId: string;
  title: string;
  description?: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  assigneeName?: string;
  creatorId: string;
  creatorName: string;
  targetType?: string; // ledger, audit, etc.
  targetId?: string;
  dueDate?: Date;
  completedAt?: Date;
  completedBy?: string;
  checklist: TaskChecklistItem[];
  tags: string[];
  watchers: string[]; // User IDs
  estimatedHours?: number;
  actualHours?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  completedAt?: Date;
  completedBy?: string;
}

export interface CreateTaskInput {
  organizationId: string;
  title: string;
  description?: string;
  type: TaskType;
  priority?: TaskPriority;
  assigneeId?: string;
  assigneeName?: string;
  creatorId: string;
  creatorName: string;
  targetType?: string;
  targetId?: string;
  dueDate?: Date;
  tags?: string[];
}

export function createTask(input: CreateTaskInput): Task {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    organizationId: input.organizationId,
    title: input.title,
    description: input.description,
    type: input.type,
    status: 'pending',
    priority: input.priority ?? 'medium',
    assigneeId: input.assigneeId,
    assigneeName: input.assigneeName,
    creatorId: input.creatorId,
    creatorName: input.creatorName,
    targetType: input.targetType,
    targetId: input.targetId,
    dueDate: input.dueDate,
    checklist: [],
    tags: input.tags ?? [],
    watchers: [input.creatorId],
    createdAt: now,
    updatedAt: now,
  };
}

export function assignTask(task: Task, assigneeId: string, assigneeName: string): Task {
  return {
    ...task,
    assigneeId,
    assigneeName,
    status: task.status === 'pending' ? 'in_progress' : task.status,
    watchers: [...new Set([...task.watchers, assigneeId])],
    updatedAt: new Date(),
  };
}

export function updateTaskStatus(task: Task, status: TaskStatus, userId?: string): Task {
  const now = new Date();
  return {
    ...task,
    status,
    completedAt: status === 'completed' ? now : undefined,
    completedBy: status === 'completed' ? userId : undefined,
    updatedAt: now,
  };
}

export function addChecklistItem(task: Task, text: string): Task {
  return {
    ...task,
    checklist: [
      ...task.checklist,
      {
        id: crypto.randomUUID(),
        text,
        completed: false,
      },
    ],
    updatedAt: new Date(),
  };
}

export function toggleChecklistItem(task: Task, itemId: string, userId: string): Task {
  const now = new Date();
  return {
    ...task,
    checklist: task.checklist.map((item) =>
      item.id === itemId
        ? {
            ...item,
            completed: !item.completed,
            completedAt: !item.completed ? now : undefined,
            completedBy: !item.completed ? userId : undefined,
          }
        : item
    ),
    updatedAt: now,
  };
}

export function addWatcher(task: Task, userId: string): Task {
  if (task.watchers.includes(userId)) return task;
  return {
    ...task,
    watchers: [...task.watchers, userId],
    updatedAt: new Date(),
  };
}

export function removeWatcher(task: Task, userId: string): Task {
  return {
    ...task,
    watchers: task.watchers.filter((id) => id !== userId),
    updatedAt: new Date(),
  };
}

export function logTime(task: Task, hours: number): Task {
  return {
    ...task,
    actualHours: (task.actualHours ?? 0) + hours,
    updatedAt: new Date(),
  };
}

export function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === 'completed' || task.status === 'cancelled') {
    return false;
  }
  return new Date() > task.dueDate;
}

export function getChecklistProgress(task: Task): { completed: number; total: number; percentage: number } {
  const total = task.checklist.length;
  const completed = task.checklist.filter((item) => item.completed).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { completed, total, percentage };
}

export interface TaskSummary {
  total: number;
  pending: number;
  inProgress: number;
  review: number;
  completed: number;
  overdue: number;
}

export function calculateTaskSummary(tasks: Task[]): TaskSummary {
  return tasks.reduce(
    (summary, task) => {
      summary.total++;
      summary[task.status === 'in_progress' ? 'inProgress' : task.status]++;
      if (isOverdue(task)) summary.overdue++;
      return summary;
    },
    { total: 0, pending: 0, inProgress: 0, review: 0, completed: 0, cancelled: 0, overdue: 0 } as TaskSummary & { cancelled: number }
  );
}
