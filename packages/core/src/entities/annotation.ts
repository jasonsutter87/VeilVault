// ==========================================================================
// ANNOTATION ENTITY
// Comments, mentions, and annotations for GRC entities
// ==========================================================================

import { randomUUID } from '../utils/crypto.js';

// ==========================================================================
// TYPES
// ==========================================================================

export type AnnotationType = 'comment' | 'note' | 'question' | 'action_item' | 'highlight';
export type AnnotationStatus = 'open' | 'resolved' | 'archived';
export type AnnotationVisibility = 'public' | 'internal' | 'private';

export type AnnotatableEntity =
  | 'risk'
  | 'control'
  | 'control_test'
  | 'issue'
  | 'task'
  | 'ledger'
  | 'transaction'
  | 'audit_package'
  | 'report'
  | 'sox_assessment'
  | 'certification';

// ==========================================================================
// ANNOTATION
// ==========================================================================

export interface Annotation {
  id: string;
  organizationId: string;

  // Target
  entityType: AnnotatableEntity;
  entityId: string;
  fieldPath?: string; // For field-level annotations (e.g., "residualScore")

  // Content
  type: AnnotationType;
  content: string;
  formattedContent?: string; // Rendered markdown/HTML

  // Threading
  parentId?: string; // For replies
  threadId: string; // Root annotation ID for grouping

  // Mentions
  mentions: Mention[];

  // Author
  authorId: string;
  authorName: string;
  authorAvatar?: string;

  // Status
  status: AnnotationStatus;
  visibility: AnnotationVisibility;
  isPinned: boolean;

  // Reactions
  reactions: Reaction[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolvedByName?: string;
}

export interface Mention {
  userId: string;
  userName: string;
  startIndex: number;
  endIndex: number;
}

export interface Reaction {
  emoji: string;
  userId: string;
  userName: string;
  createdAt: Date;
}

// ==========================================================================
// CREATE ANNOTATION
// ==========================================================================

export interface CreateAnnotationInput {
  organizationId: string;
  entityType: AnnotatableEntity;
  entityId: string;
  fieldPath?: string;
  type?: AnnotationType;
  content: string;
  parentId?: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  visibility?: AnnotationVisibility;
  mentions?: Mention[];
}

export function createAnnotation(input: CreateAnnotationInput): Annotation {
  const now = new Date();
  const id = randomUUID();

  return {
    id,
    organizationId: input.organizationId,
    entityType: input.entityType,
    entityId: input.entityId,
    fieldPath: input.fieldPath,
    type: input.type ?? 'comment',
    content: input.content,
    parentId: input.parentId,
    threadId: input.parentId ?? id, // If no parent, this is the thread root
    mentions: input.mentions ?? extractMentions(input.content),
    authorId: input.authorId,
    authorName: input.authorName,
    authorAvatar: input.authorAvatar,
    status: 'open',
    visibility: input.visibility ?? 'public',
    isPinned: false,
    reactions: [],
    createdAt: now,
    updatedAt: now,
  };
}

// ==========================================================================
// ANNOTATION OPERATIONS
// ==========================================================================

export function updateAnnotationContent(
  annotation: Annotation,
  content: string
): Annotation {
  return {
    ...annotation,
    content,
    mentions: extractMentions(content),
    updatedAt: new Date(),
  };
}

export function resolveAnnotation(
  annotation: Annotation,
  userId: string,
  userName: string
): Annotation {
  return {
    ...annotation,
    status: 'resolved',
    resolvedAt: new Date(),
    resolvedBy: userId,
    resolvedByName: userName,
    updatedAt: new Date(),
  };
}

export function reopenAnnotation(annotation: Annotation): Annotation {
  return {
    ...annotation,
    status: 'open',
    resolvedAt: undefined,
    resolvedBy: undefined,
    resolvedByName: undefined,
    updatedAt: new Date(),
  };
}

export function archiveAnnotation(annotation: Annotation): Annotation {
  return {
    ...annotation,
    status: 'archived',
    updatedAt: new Date(),
  };
}

export function pinAnnotation(annotation: Annotation): Annotation {
  return {
    ...annotation,
    isPinned: true,
    updatedAt: new Date(),
  };
}

export function unpinAnnotation(annotation: Annotation): Annotation {
  return {
    ...annotation,
    isPinned: false,
    updatedAt: new Date(),
  };
}

export function addAnnotationReaction(
  annotation: Annotation,
  emoji: string,
  userId: string,
  userName: string
): Annotation {
  // Remove existing reaction from this user with same emoji
  const filteredReactions = annotation.reactions.filter(
    r => !(r.userId === userId && r.emoji === emoji)
  );

  return {
    ...annotation,
    reactions: [
      ...filteredReactions,
      { emoji, userId, userName, createdAt: new Date() },
    ],
    updatedAt: new Date(),
  };
}

export function removeAnnotationReaction(
  annotation: Annotation,
  emoji: string,
  userId: string
): Annotation {
  return {
    ...annotation,
    reactions: annotation.reactions.filter(
      r => !(r.userId === userId && r.emoji === emoji)
    ),
    updatedAt: new Date(),
  };
}

// ==========================================================================
// MENTION PARSING
// ==========================================================================

export function extractMentions(content: string): Mention[] {
  const mentions: Mention[] = [];
  // Match @[username](userId) format
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push({
      userName: match[1]!,
      userId: match[2]!,
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  return mentions;
}

export function formatMentions(content: string, mentions: Mention[]): string {
  // Convert mentions to displayable format
  let formatted = content;
  // Process in reverse order to maintain indices
  const sortedMentions = [...mentions].sort((a, b) => b.startIndex - a.startIndex);

  for (const mention of sortedMentions) {
    const mentionText = content.substring(mention.startIndex, mention.endIndex);
    const displayText = `<span class="mention" data-user-id="${mention.userId}">@${mention.userName}</span>`;
    formatted = formatted.substring(0, mention.startIndex) + displayText + formatted.substring(mention.endIndex);
  }

  return formatted;
}

// ==========================================================================
// ANNOTATION QUERIES
// ==========================================================================

export interface AnnotationQuery {
  organizationId?: string;
  entityType?: AnnotatableEntity;
  entityId?: string;
  threadId?: string;
  authorId?: string;
  type?: AnnotationType;
  status?: AnnotationStatus;
  visibility?: AnnotationVisibility;
  mentionsUserId?: string;
  isPinned?: boolean;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export function filterAnnotations(annotations: Annotation[], query: AnnotationQuery): Annotation[] {
  let filtered = [...annotations];

  if (query.organizationId) {
    filtered = filtered.filter(a => a.organizationId === query.organizationId);
  }
  if (query.entityType) {
    filtered = filtered.filter(a => a.entityType === query.entityType);
  }
  if (query.entityId) {
    filtered = filtered.filter(a => a.entityId === query.entityId);
  }
  if (query.threadId) {
    filtered = filtered.filter(a => a.threadId === query.threadId);
  }
  if (query.authorId) {
    filtered = filtered.filter(a => a.authorId === query.authorId);
  }
  if (query.type) {
    filtered = filtered.filter(a => a.type === query.type);
  }
  if (query.status) {
    filtered = filtered.filter(a => a.status === query.status);
  }
  if (query.visibility) {
    filtered = filtered.filter(a => a.visibility === query.visibility);
  }
  if (query.mentionsUserId) {
    filtered = filtered.filter(a => a.mentions.some(m => m.userId === query.mentionsUserId));
  }
  if (query.isPinned !== undefined) {
    filtered = filtered.filter(a => a.isPinned === query.isPinned);
  }
  if (query.startDate) {
    filtered = filtered.filter(a => a.createdAt >= query.startDate!);
  }
  if (query.endDate) {
    filtered = filtered.filter(a => a.createdAt <= query.endDate!);
  }

  // Sort by pinned first, then by date
  filtered.sort((a, b) => {
    if (a.isPinned !== b.isPinned) {
      return a.isPinned ? -1 : 1;
    }
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  // Pagination
  const offset = query.offset ?? 0;
  const limit = query.limit ?? 50;
  return filtered.slice(offset, offset + limit);
}

// ==========================================================================
// THREAD HELPERS
// ==========================================================================

export function getThread(annotations: Annotation[], threadId: string): Annotation[] {
  return annotations
    .filter(a => a.threadId === threadId)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

export function getThreadCount(annotations: Annotation[], threadId: string): number {
  return annotations.filter(a => a.threadId === threadId).length;
}

export function getRootAnnotations(annotations: Annotation[]): Annotation[] {
  return annotations.filter(a => !a.parentId);
}

// ==========================================================================
// ANNOTATION SUMMARY
// ==========================================================================

export interface AnnotationSummary {
  total: number;
  byType: Record<AnnotationType, number>;
  byStatus: Record<AnnotationStatus, number>;
  openThreads: number;
  resolvedThreads: number;
  pinnedCount: number;
  recentAuthors: { authorId: string; authorName: string; count: number }[];
}

export function summarizeAnnotations(annotations: Annotation[]): AnnotationSummary {
  const byType: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  const authorCounts = new Map<string, { authorId: string; authorName: string; count: number }>();
  const threadStatuses = new Map<string, boolean>();
  let pinnedCount = 0;

  for (const annotation of annotations) {
    byType[annotation.type] = (byType[annotation.type] ?? 0) + 1;
    byStatus[annotation.status] = (byStatus[annotation.status] ?? 0) + 1;

    if (annotation.isPinned) pinnedCount++;

    // Track thread resolution status
    if (!annotation.parentId) {
      threadStatuses.set(annotation.threadId, annotation.status === 'resolved');
    }

    // Track authors
    const existing = authorCounts.get(annotation.authorId);
    if (existing) {
      existing.count++;
    } else {
      authorCounts.set(annotation.authorId, {
        authorId: annotation.authorId,
        authorName: annotation.authorName,
        count: 1,
      });
    }
  }

  const recentAuthors = Array.from(authorCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  let openThreads = 0;
  let resolvedThreads = 0;
  for (const resolved of threadStatuses.values()) {
    if (resolved) resolvedThreads++;
    else openThreads++;
  }

  return {
    total: annotations.length,
    byType: byType as Record<AnnotationType, number>,
    byStatus: byStatus as Record<AnnotationStatus, number>,
    openThreads,
    resolvedThreads,
    pinnedCount,
    recentAuthors,
  };
}
