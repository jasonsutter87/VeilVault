// ==========================================================================
// COMMENT ENTITY
// Comments on ledgers, transactions, audits, and other entities
// ==========================================================================

export type CommentTargetType = 'ledger' | 'transaction' | 'audit' | 'verification' | 'task' | 'report';

export interface Comment {
  id: string;
  organizationId: string;
  targetType: CommentTargetType;
  targetId: string;
  parentId?: string; // For threaded replies
  authorId: string;
  authorName: string;
  content: string;
  mentions: string[]; // User IDs mentioned with @
  attachments: CommentAttachment[];
  reactions: CommentReaction[];
  isEdited: boolean;
  isResolved: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface CommentAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
}

export interface CommentReaction {
  userId: string;
  emoji: string;
  createdAt: Date;
}

export interface CreateCommentInput {
  organizationId: string;
  targetType: CommentTargetType;
  targetId: string;
  parentId?: string;
  authorId: string;
  authorName: string;
  content: string;
}

export function createComment(input: CreateCommentInput): Comment {
  const now = new Date();
  const mentions = extractMentions(input.content);

  return {
    id: crypto.randomUUID(),
    organizationId: input.organizationId,
    targetType: input.targetType,
    targetId: input.targetId,
    parentId: input.parentId,
    authorId: input.authorId,
    authorName: input.authorName,
    content: input.content,
    mentions,
    attachments: [],
    reactions: [],
    isEdited: false,
    isResolved: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateComment(comment: Comment, newContent: string): Comment {
  return {
    ...comment,
    content: newContent,
    mentions: extractMentions(newContent),
    isEdited: true,
    updatedAt: new Date(),
  };
}

export function resolveComment(comment: Comment): Comment {
  return {
    ...comment,
    isResolved: true,
    updatedAt: new Date(),
  };
}

export function addReaction(comment: Comment, userId: string, emoji: string): Comment {
  // Remove existing reaction from this user
  const reactions = comment.reactions.filter((r) => r.userId !== userId);

  return {
    ...comment,
    reactions: [...reactions, { userId, emoji, createdAt: new Date() }],
    updatedAt: new Date(),
  };
}

export function removeReaction(comment: Comment, userId: string): Comment {
  return {
    ...comment,
    reactions: comment.reactions.filter((r) => r.userId !== userId),
    updatedAt: new Date(),
  };
}

export function softDeleteComment(comment: Comment): Comment {
  return {
    ...comment,
    deletedAt: new Date(),
    updatedAt: new Date(),
  };
}

// Extract @mentions from content
function extractMentions(content: string): string[] {
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[2]); // User ID is in the second capture group
  }

  return [...new Set(mentions)]; // Remove duplicates
}

export interface CommentThread {
  root: Comment;
  replies: Comment[];
  replyCount: number;
}

export function buildCommentThread(comments: Comment[], rootId: string): CommentThread | null {
  const root = comments.find((c) => c.id === rootId);
  if (!root) return null;

  const replies = comments
    .filter((c) => c.parentId === rootId && !c.deletedAt)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  return {
    root,
    replies,
    replyCount: replies.length,
  };
}
