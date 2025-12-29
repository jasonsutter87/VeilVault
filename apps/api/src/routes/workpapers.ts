// ==========================================================================
// WORKPAPER API ROUTES
// Audit documentation management
// ==========================================================================

import type { FastifyInstance } from 'fastify';
import {
  createWorkpaper,
  updateWorkpaperContent,
  submitForReview,
  addReviewNote,
  resolveReviewNote,
  approveWorkpaper,
  lockWorkpaper,
  unlockWorkpaper,
  addAttachment,
  removeAttachment,
  addTickmark,
  removeTickmark,
  addCrossReference,
  removeCrossReference,
  linkControl,
  unlinkControl,
  linkRisk,
  unlinkRisk,
  linkIssue,
  unlinkIssue,
  filterWorkpapers,
  summarizeWorkpapers,
  rollForwardWorkpaper,
  createWorkpaperSection,
  STANDARD_TICKMARKS,
  type Workpaper,
  type WorkpaperQuery,
  type CreateWorkpaperInput,
  type ReviewDecision,
  type CrossReference,
} from '@veilvault/core';

// In-memory store (replace with database in production)
const workpapers = new Map<string, Workpaper>();

// ==========================================================================
// ROUTES
// ==========================================================================

export async function workpaperRoutes(fastify: FastifyInstance) {
  // List workpapers
  fastify.get<{
    Querystring: WorkpaperQuery;
  }>('/', async (request) => {
    const query = request.query;
    const all = Array.from(workpapers.values());
    const filtered = filterWorkpapers(all, query);
    const summary = summarizeWorkpapers(filtered);

    return {
      success: true,
      data: filtered,
      total: filtered.length,
      summary,
    };
  });

  // Get workpaper by ID
  fastify.get<{
    Params: { id: string };
  }>('/:id', async (request, reply) => {
    const workpaper = workpapers.get(request.params.id);
    if (!workpaper) {
      return reply.status(404).send({ error: true, message: 'Workpaper not found' });
    }

    return { success: true, data: workpaper };
  });

  // Create workpaper
  fastify.post<{
    Body: CreateWorkpaperInput;
  }>('/', async (request) => {
    const workpaper = createWorkpaper(request.body);
    workpapers.set(workpaper.id, workpaper);

    return { success: true, data: workpaper };
  });

  // Update workpaper content
  fastify.patch<{
    Params: { id: string };
    Body: { content: string; contentFormat?: 'markdown' | 'html' | 'plain' };
  }>('/:id/content', async (request, reply) => {
    const workpaper = workpapers.get(request.params.id);
    if (!workpaper) {
      return reply.status(404).send({ error: true, message: 'Workpaper not found' });
    }

    try {
      const updated = updateWorkpaperContent(
        workpaper,
        request.body.content,
        request.body.contentFormat
      );
      workpapers.set(updated.id, updated);
      return { success: true, data: updated };
    } catch (error) {
      return reply.status(400).send({ error: true, message: (error as Error).message });
    }
  });

  // Submit for review
  fastify.post<{
    Params: { id: string };
  }>('/:id/submit', async (request, reply) => {
    const workpaper = workpapers.get(request.params.id);
    if (!workpaper) {
      return reply.status(404).send({ error: true, message: 'Workpaper not found' });
    }

    try {
      const updated = submitForReview(workpaper);
      workpapers.set(updated.id, updated);
      return { success: true, data: updated };
    } catch (error) {
      return reply.status(400).send({ error: true, message: (error as Error).message });
    }
  });

  // Add review note
  fastify.post<{
    Params: { id: string };
    Body: {
      reviewerId: string;
      reviewerName: string;
      content: string;
      decision: ReviewDecision;
    };
  }>('/:id/review', async (request, reply) => {
    const workpaper = workpapers.get(request.params.id);
    if (!workpaper) {
      return reply.status(404).send({ error: true, message: 'Workpaper not found' });
    }

    const { reviewerId, reviewerName, content, decision } = request.body;
    const updated = addReviewNote(workpaper, reviewerId, reviewerName, content, decision);
    workpapers.set(updated.id, updated);

    return { success: true, data: updated };
  });

  // Resolve review note
  fastify.post<{
    Params: { id: string; noteId: string };
    Body: { resolvedBy: string };
  }>('/:id/review/:noteId/resolve', async (request, reply) => {
    const workpaper = workpapers.get(request.params.id);
    if (!workpaper) {
      return reply.status(404).send({ error: true, message: 'Workpaper not found' });
    }

    const updated = resolveReviewNote(workpaper, request.params.noteId, request.body.resolvedBy);
    workpapers.set(updated.id, updated);

    return { success: true, data: updated };
  });

  // Approve workpaper
  fastify.post<{
    Params: { id: string };
    Body: { approverId: string; approverName: string };
  }>('/:id/approve', async (request, reply) => {
    const workpaper = workpapers.get(request.params.id);
    if (!workpaper) {
      return reply.status(404).send({ error: true, message: 'Workpaper not found' });
    }

    try {
      const { approverId, approverName } = request.body;
      const updated = approveWorkpaper(workpaper, approverId, approverName);
      workpapers.set(updated.id, updated);
      return { success: true, data: updated };
    } catch (error) {
      return reply.status(400).send({ error: true, message: (error as Error).message });
    }
  });

  // Lock workpaper
  fastify.post<{
    Params: { id: string };
    Body: { lockedBy: string };
  }>('/:id/lock', async (request, reply) => {
    const workpaper = workpapers.get(request.params.id);
    if (!workpaper) {
      return reply.status(404).send({ error: true, message: 'Workpaper not found' });
    }

    const updated = lockWorkpaper(workpaper, request.body.lockedBy);
    workpapers.set(updated.id, updated);

    return { success: true, data: updated };
  });

  // Unlock workpaper
  fastify.post<{
    Params: { id: string };
  }>('/:id/unlock', async (request, reply) => {
    const workpaper = workpapers.get(request.params.id);
    if (!workpaper) {
      return reply.status(404).send({ error: true, message: 'Workpaper not found' });
    }

    const updated = unlockWorkpaper(workpaper);
    workpapers.set(updated.id, updated);

    return { success: true, data: updated };
  });

  // Add attachment
  fastify.post<{
    Params: { id: string };
    Body: {
      fileName: string;
      fileType: string;
      fileSize: number;
      storageKey: string;
      uploadedBy: string;
      uploadedByName: string;
      description?: string;
      isEvidence?: boolean;
    };
  }>('/:id/attachments', async (request, reply) => {
    const workpaper = workpapers.get(request.params.id);
    if (!workpaper) {
      return reply.status(404).send({ error: true, message: 'Workpaper not found' });
    }

    const { isEvidence = false, ...rest } = request.body;
    const updated = addAttachment(workpaper, { ...rest, isEvidence });
    workpapers.set(updated.id, updated);

    return { success: true, data: updated };
  });

  // Remove attachment
  fastify.delete<{
    Params: { id: string; attachmentId: string };
  }>('/:id/attachments/:attachmentId', async (request, reply) => {
    const workpaper = workpapers.get(request.params.id);
    if (!workpaper) {
      return reply.status(404).send({ error: true, message: 'Workpaper not found' });
    }

    const updated = removeAttachment(workpaper, request.params.attachmentId);
    workpapers.set(updated.id, updated);

    return { success: true, data: updated };
  });

  // Add tickmark
  fastify.post<{
    Params: { id: string };
    Body: {
      symbol: string;
      meaning: string;
      addedBy: string;
      cellReference?: string;
      notes?: string;
    };
  }>('/:id/tickmarks', async (request, reply) => {
    const workpaper = workpapers.get(request.params.id);
    if (!workpaper) {
      return reply.status(404).send({ error: true, message: 'Workpaper not found' });
    }

    const { symbol, meaning, addedBy, cellReference, notes } = request.body;
    const updated = addTickmark(workpaper, symbol, meaning, addedBy, cellReference, notes);
    workpapers.set(updated.id, updated);

    return { success: true, data: updated };
  });

  // Remove tickmark
  fastify.delete<{
    Params: { id: string; tickmarkId: string };
  }>('/:id/tickmarks/:tickmarkId', async (request, reply) => {
    const workpaper = workpapers.get(request.params.id);
    if (!workpaper) {
      return reply.status(404).send({ error: true, message: 'Workpaper not found' });
    }

    const updated = removeTickmark(workpaper, request.params.tickmarkId);
    workpapers.set(updated.id, updated);

    return { success: true, data: updated };
  });

  // Get standard tickmarks
  fastify.get('/tickmarks/standard', async () => {
    return {
      success: true,
      data: STANDARD_TICKMARKS,
    };
  });

  // Add cross-reference
  fastify.post<{
    Params: { id: string };
    Body: {
      targetType: CrossReference['targetType'];
      targetId: string;
      addedBy: string;
      targetRef?: string;
      description?: string;
    };
  }>('/:id/cross-references', async (request, reply) => {
    const workpaper = workpapers.get(request.params.id);
    if (!workpaper) {
      return reply.status(404).send({ error: true, message: 'Workpaper not found' });
    }

    const { targetType, targetId, addedBy, targetRef, description } = request.body;
    const updated = addCrossReference(workpaper, targetType, targetId, addedBy, targetRef, description);
    workpapers.set(updated.id, updated);

    return { success: true, data: updated };
  });

  // Remove cross-reference
  fastify.delete<{
    Params: { id: string; refId: string };
  }>('/:id/cross-references/:refId', async (request, reply) => {
    const workpaper = workpapers.get(request.params.id);
    if (!workpaper) {
      return reply.status(404).send({ error: true, message: 'Workpaper not found' });
    }

    const updated = removeCrossReference(workpaper, request.params.refId);
    workpapers.set(updated.id, updated);

    return { success: true, data: updated };
  });

  // Link control
  fastify.post<{
    Params: { id: string };
    Body: { controlId: string };
  }>('/:id/links/control', async (request, reply) => {
    const workpaper = workpapers.get(request.params.id);
    if (!workpaper) {
      return reply.status(404).send({ error: true, message: 'Workpaper not found' });
    }

    const updated = linkControl(workpaper, request.body.controlId);
    workpapers.set(updated.id, updated);

    return { success: true, data: updated };
  });

  // Unlink control
  fastify.delete<{
    Params: { id: string; controlId: string };
  }>('/:id/links/control/:controlId', async (request, reply) => {
    const workpaper = workpapers.get(request.params.id);
    if (!workpaper) {
      return reply.status(404).send({ error: true, message: 'Workpaper not found' });
    }

    const updated = unlinkControl(workpaper, request.params.controlId);
    workpapers.set(updated.id, updated);

    return { success: true, data: updated };
  });

  // Link risk
  fastify.post<{
    Params: { id: string };
    Body: { riskId: string };
  }>('/:id/links/risk', async (request, reply) => {
    const workpaper = workpapers.get(request.params.id);
    if (!workpaper) {
      return reply.status(404).send({ error: true, message: 'Workpaper not found' });
    }

    const updated = linkRisk(workpaper, request.body.riskId);
    workpapers.set(updated.id, updated);

    return { success: true, data: updated };
  });

  // Unlink risk
  fastify.delete<{
    Params: { id: string; riskId: string };
  }>('/:id/links/risk/:riskId', async (request, reply) => {
    const workpaper = workpapers.get(request.params.id);
    if (!workpaper) {
      return reply.status(404).send({ error: true, message: 'Workpaper not found' });
    }

    const updated = unlinkRisk(workpaper, request.params.riskId);
    workpapers.set(updated.id, updated);

    return { success: true, data: updated };
  });

  // Link issue
  fastify.post<{
    Params: { id: string };
    Body: { issueId: string };
  }>('/:id/links/issue', async (request, reply) => {
    const workpaper = workpapers.get(request.params.id);
    if (!workpaper) {
      return reply.status(404).send({ error: true, message: 'Workpaper not found' });
    }

    const updated = linkIssue(workpaper, request.body.issueId);
    workpapers.set(updated.id, updated);

    return { success: true, data: updated };
  });

  // Unlink issue
  fastify.delete<{
    Params: { id: string; issueId: string };
  }>('/:id/links/issue/:issueId', async (request, reply) => {
    const workpaper = workpapers.get(request.params.id);
    if (!workpaper) {
      return reply.status(404).send({ error: true, message: 'Workpaper not found' });
    }

    const updated = unlinkIssue(workpaper, request.params.issueId);
    workpapers.set(updated.id, updated);

    return { success: true, data: updated };
  });

  // Roll forward workpaper
  fastify.post<{
    Params: { id: string };
    Body: {
      newAuditId: string;
      newPeriodStart: string;
      newPeriodEnd: string;
      preparedBy: string;
      preparedByName: string;
    };
  }>('/:id/roll-forward', async (request, reply) => {
    const workpaper = workpapers.get(request.params.id);
    if (!workpaper) {
      return reply.status(404).send({ error: true, message: 'Workpaper not found' });
    }

    const { newAuditId, newPeriodStart, newPeriodEnd, preparedBy, preparedByName } = request.body;
    const newWorkpaper = rollForwardWorkpaper(
      workpaper,
      newAuditId,
      new Date(newPeriodStart),
      new Date(newPeriodEnd),
      preparedBy,
      preparedByName
    );
    workpapers.set(newWorkpaper.id, newWorkpaper);

    return { success: true, data: newWorkpaper };
  });

  // Get summary for audit
  fastify.get<{
    Params: { auditId: string };
  }>('/audit/:auditId/summary', async (request) => {
    const auditWorkpapers = Array.from(workpapers.values())
      .filter(w => w.auditId === request.params.auditId);

    const summary = summarizeWorkpapers(auditWorkpapers);

    return {
      success: true,
      data: summary,
    };
  });

  // Delete workpaper
  fastify.delete<{
    Params: { id: string };
  }>('/:id', async (request, reply) => {
    const workpaper = workpapers.get(request.params.id);
    if (!workpaper) {
      return reply.status(404).send({ error: true, message: 'Workpaper not found' });
    }

    if (workpaper.status === 'approved') {
      return reply.status(400).send({ error: true, message: 'Cannot delete approved workpaper' });
    }

    workpapers.delete(request.params.id);

    return { success: true, message: 'Workpaper deleted' };
  });
}
