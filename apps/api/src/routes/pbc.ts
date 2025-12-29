// ==========================================================================
// PBC REQUEST API ROUTES
// Audit document request automation
// ==========================================================================

import type { FastifyInstance } from 'fastify';
import {
  createPbcRequest,
  createPbcRequestFromTemplate,
  sendPbcRequest,
  markClientViewed,
  submitDocument,
  removeSubmittedDocument,
  submitPbcRequest,
  reviewPbcRequest,
  acceptPbcRequest,
  rejectPbcRequest,
  cancelPbcRequest,
  addMessage,
  markMessageRead,
  scheduleReminder,
  filterPbcRequests,
  summarizePbcRequests,
  getDueReminders,
  createPbcTemplate,
  STANDARD_PBC_TEMPLATES,
  type PbcRequest,
  type PbcTemplate,
  type PbcRequestQuery,
  type CreatePbcRequestInput,
  type CreatePbcTemplateInput,
} from '@veilvault/core';

// In-memory stores
const requests = new Map<string, PbcRequest>();
const templates = new Map<string, PbcTemplate>();

export async function pbcRoutes(fastify: FastifyInstance) {
  // List requests
  fastify.get<{ Querystring: PbcRequestQuery }>('/', async (request) => {
    const all = Array.from(requests.values());
    const filtered = filterPbcRequests(all, request.query);
    const summary = summarizePbcRequests(filtered);
    return { success: true, data: filtered, total: filtered.length, summary };
  });

  // Get by ID
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const pbc = requests.get(request.params.id);
    if (!pbc) return reply.status(404).send({ error: true, message: 'Not found' });
    return { success: true, data: pbc };
  });

  // Create request
  fastify.post<{ Body: CreatePbcRequestInput }>('/', async (request) => {
    const pbc = createPbcRequest(request.body);
    requests.set(pbc.id, pbc);
    return { success: true, data: pbc };
  });

  // Create from template
  fastify.post<{
    Params: { templateId: string };
    Body: {
      organizationId: string;
      auditId: string;
      requestedBy: string;
      requestedByName: string;
      assignedTo?: string;
      assignedToName?: string;
      assignedToEmail?: string;
      dueDate?: string;
    };
  }>('/from-template/:templateId', async (request, reply) => {
    const template = templates.get(request.params.templateId);
    if (!template) return reply.status(404).send({ error: true, message: 'Template not found' });

    const pbc = createPbcRequestFromTemplate(template, {
      ...request.body,
      dueDate: request.body.dueDate ? new Date(request.body.dueDate) : undefined,
    });
    requests.set(pbc.id, pbc);
    return { success: true, data: pbc };
  });

  // Send request
  fastify.post<{ Params: { id: string } }>('/:id/send', async (request, reply) => {
    const pbc = requests.get(request.params.id);
    if (!pbc) return reply.status(404).send({ error: true, message: 'Not found' });
    try {
      const updated = sendPbcRequest(pbc);
      requests.set(updated.id, updated);
      return { success: true, data: updated };
    } catch (e) {
      return reply.status(400).send({ error: true, message: (e as Error).message });
    }
  });

  // Mark viewed by client
  fastify.post<{ Params: { id: string } }>('/:id/viewed', async (request, reply) => {
    const pbc = requests.get(request.params.id);
    if (!pbc) return reply.status(404).send({ error: true, message: 'Not found' });
    const updated = markClientViewed(pbc);
    requests.set(updated.id, updated);
    return { success: true, data: updated };
  });

  // Submit document
  fastify.post<{
    Params: { id: string };
    Body: {
      requestedDocumentId?: string;
      fileName: string;
      fileType: string;
      fileSize: number;
      storageKey: string;
      uploadedBy: string;
      uploadedByName: string;
      notes?: string;
    };
  }>('/:id/documents', async (request, reply) => {
    const pbc = requests.get(request.params.id);
    if (!pbc) return reply.status(404).send({ error: true, message: 'Not found' });
    const updated = submitDocument(pbc, request.body);
    requests.set(updated.id, updated);
    return { success: true, data: updated };
  });

  // Remove document
  fastify.delete<{ Params: { id: string; docId: string } }>('/:id/documents/:docId', async (request, reply) => {
    const pbc = requests.get(request.params.id);
    if (!pbc) return reply.status(404).send({ error: true, message: 'Not found' });
    const updated = removeSubmittedDocument(pbc, request.params.docId);
    requests.set(updated.id, updated);
    return { success: true, data: updated };
  });

  // Submit request (client done uploading)
  fastify.post<{ Params: { id: string } }>('/:id/submit', async (request, reply) => {
    const pbc = requests.get(request.params.id);
    if (!pbc) return reply.status(404).send({ error: true, message: 'Not found' });
    try {
      const updated = submitPbcRequest(pbc);
      requests.set(updated.id, updated);
      return { success: true, data: updated };
    } catch (e) {
      return reply.status(400).send({ error: true, message: (e as Error).message });
    }
  });

  // Review
  fastify.post<{
    Params: { id: string };
    Body: { reviewerId: string; reviewerName: string; notes?: string };
  }>('/:id/review', async (request, reply) => {
    const pbc = requests.get(request.params.id);
    if (!pbc) return reply.status(404).send({ error: true, message: 'Not found' });
    const { reviewerId, reviewerName, notes } = request.body;
    const updated = reviewPbcRequest(pbc, reviewerId, reviewerName, notes);
    requests.set(updated.id, updated);
    return { success: true, data: updated };
  });

  // Accept
  fastify.post<{
    Params: { id: string };
    Body: { reviewerId: string; reviewerName: string; notes?: string };
  }>('/:id/accept', async (request, reply) => {
    const pbc = requests.get(request.params.id);
    if (!pbc) return reply.status(404).send({ error: true, message: 'Not found' });
    const { reviewerId, reviewerName, notes } = request.body;
    const updated = acceptPbcRequest(pbc, reviewerId, reviewerName, notes);
    requests.set(updated.id, updated);
    return { success: true, data: updated };
  });

  // Reject
  fastify.post<{
    Params: { id: string };
    Body: { reviewerId: string; reviewerName: string; reason: string; rejectedDocumentIds?: string[] };
  }>('/:id/reject', async (request, reply) => {
    const pbc = requests.get(request.params.id);
    if (!pbc) return reply.status(404).send({ error: true, message: 'Not found' });
    const { reviewerId, reviewerName, reason, rejectedDocumentIds } = request.body;
    const updated = rejectPbcRequest(pbc, reviewerId, reviewerName, reason, rejectedDocumentIds);
    requests.set(updated.id, updated);
    return { success: true, data: updated };
  });

  // Cancel
  fastify.post<{ Params: { id: string } }>('/:id/cancel', async (request, reply) => {
    const pbc = requests.get(request.params.id);
    if (!pbc) return reply.status(404).send({ error: true, message: 'Not found' });
    const updated = cancelPbcRequest(pbc);
    requests.set(updated.id, updated);
    return { success: true, data: updated };
  });

  // Add message
  fastify.post<{
    Params: { id: string };
    Body: { senderId: string; senderName: string; senderType: 'auditor' | 'client'; content: string };
  }>('/:id/messages', async (request, reply) => {
    const pbc = requests.get(request.params.id);
    if (!pbc) return reply.status(404).send({ error: true, message: 'Not found' });
    const { senderId, senderName, senderType, content } = request.body;
    const updated = addMessage(pbc, senderId, senderName, senderType, content);
    requests.set(updated.id, updated);
    return { success: true, data: updated };
  });

  // Mark message read
  fastify.post<{ Params: { id: string; messageId: string } }>('/:id/messages/:messageId/read', async (request, reply) => {
    const pbc = requests.get(request.params.id);
    if (!pbc) return reply.status(404).send({ error: true, message: 'Not found' });
    const updated = markMessageRead(pbc, request.params.messageId);
    requests.set(updated.id, updated);
    return { success: true, data: updated };
  });

  // Schedule reminder
  fastify.post<{
    Params: { id: string };
    Body: { type: 'email' | 'in_app' | 'sms'; scheduledFor: string };
  }>('/:id/reminders', async (request, reply) => {
    const pbc = requests.get(request.params.id);
    if (!pbc) return reply.status(404).send({ error: true, message: 'Not found' });
    const updated = scheduleReminder(pbc, request.body.type, new Date(request.body.scheduledFor));
    requests.set(updated.id, updated);
    return { success: true, data: updated };
  });

  // Get due reminders
  fastify.get('/reminders/due', async () => {
    const all = Array.from(requests.values());
    const due = getDueReminders(all);
    return { success: true, data: due, total: due.length };
  });

  // --- TEMPLATES ---

  // List templates
  fastify.get('/templates', async () => {
    const all = Array.from(templates.values());
    return { success: true, data: all };
  });

  // Get standard templates
  fastify.get('/templates/standard', async () => {
    return { success: true, data: STANDARD_PBC_TEMPLATES };
  });

  // Create template
  fastify.post<{ Body: CreatePbcTemplateInput }>('/templates', async (request) => {
    const template = createPbcTemplate(request.body);
    templates.set(template.id, template);
    return { success: true, data: template };
  });

  // Get template by ID
  fastify.get<{ Params: { templateId: string } }>('/templates/:templateId', async (request, reply) => {
    const template = templates.get(request.params.templateId);
    if (!template) return reply.status(404).send({ error: true, message: 'Not found' });
    return { success: true, data: template };
  });

  // Summary for audit
  fastify.get<{ Params: { auditId: string } }>('/audit/:auditId/summary', async (request) => {
    const auditRequests = Array.from(requests.values()).filter(r => r.auditId === request.params.auditId);
    const summary = summarizePbcRequests(auditRequests);
    return { success: true, data: summary };
  });
}
