// ==========================================================================
// ALERT ROUTES
// Alert rules and event management
// ==========================================================================

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  createAlertRule,
  getDefaultAlertRules,
  evaluateRiskAlerts,
  evaluateControlAlerts,
  evaluateIssueAlerts,
  acknowledgeAlert,
  resolveAlert,
  alertEventToNotification,
  calculateAlertSummary,
  type AlertRule,
  type AlertEvent,
  type Risk,
  type Control,
  type Issue,
} from '@veilvault/core';

// In-memory stores (replace with database in production)
const alertRules = new Map<string, AlertRule>();
const alertEvents = new Map<string, AlertEvent>();

// Validation schemas
const createRuleSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string(),
  triggerType: z.enum([
    'risk_score_exceeds_threshold',
    'risk_outside_appetite',
    'risk_trend_increasing',
    'kri_threshold_breached',
    'kri_status_red',
    'control_test_failed',
    'control_test_due',
    'control_test_overdue',
    'control_effectiveness_degraded',
    'issue_created',
    'issue_due_soon',
    'issue_overdue',
    'issue_severity_high',
    'issue_escalated',
    'remediation_step_overdue',
    'integrity_check_failed',
    'audit_package_generated',
    'scheduled_review_due',
  ]),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.enum(['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'in', 'not_in']),
    value: z.unknown(),
  })).optional(),
  actions: z.array(z.object({
    type: z.enum(['notification', 'email', 'webhook', 'slack', 'teams']),
    config: z.record(z.unknown()),
  })),
  schedule: z.object({
    frequency: z.enum(['hourly', 'daily', 'weekly', 'monthly']),
    dayOfWeek: z.number().min(0).max(6).optional(),
    dayOfMonth: z.number().min(1).max(31).optional(),
    hour: z.number().min(0).max(23).optional(),
    minute: z.number().min(0).max(59).optional(),
    timezone: z.string().optional(),
  }).optional(),
  createdBy: z.string(),
});

export async function alertRoutes(fastify: FastifyInstance) {
  // Initialize default rules for organization
  fastify.post<{ Params: { organizationId: string }; Body: { createdBy: string } }>(
    '/organizations/:organizationId/initialize',
    async (request, reply) => {
      const { organizationId } = request.params;
      const { createdBy } = request.body;

      const defaults = getDefaultAlertRules(organizationId, createdBy);
      for (const rule of defaults) {
        alertRules.set(rule.id, rule);
      }

      return reply.status(201).send({
        success: true,
        data: {
          rulesCreated: defaults.length,
          rules: defaults,
        },
      });
    }
  );

  // Create custom alert rule
  fastify.post('/', async (request, reply) => {
    const body = createRuleSchema.parse(request.body);

    const rule = createAlertRule(body);
    alertRules.set(rule.id, rule);

    return reply.status(201).send({
      success: true,
      data: rule,
    });
  });

  // Get alert rule by ID
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;
    const rule = alertRules.get(id);

    if (!rule) {
      return reply.status(404).send({
        error: true,
        message: 'Alert rule not found',
      });
    }

    return {
      success: true,
      data: rule,
    };
  });

  // List all alert rules for organization
  fastify.get<{ Querystring: { organizationId?: string; enabled?: string; triggerType?: string } }>(
    '/',
    async (request) => {
      const { organizationId, enabled, triggerType } = request.query;
      let rules = Array.from(alertRules.values());

      if (organizationId) {
        rules = rules.filter(r => r.organizationId === organizationId);
      }
      if (enabled !== undefined) {
        rules = rules.filter(r => r.enabled === (enabled === 'true'));
      }
      if (triggerType) {
        rules = rules.filter(r => r.triggerType === triggerType);
      }

      return {
        success: true,
        data: rules,
        total: rules.length,
      };
    }
  );

  // Enable/disable alert rule
  fastify.patch<{ Params: { id: string }; Body: { enabled: boolean } }>(
    '/:id/status',
    async (request, reply) => {
      const { id } = request.params;
      const { enabled } = request.body;

      const rule = alertRules.get(id);
      if (!rule) {
        return reply.status(404).send({
          error: true,
          message: 'Alert rule not found',
        });
      }

      const updated: AlertRule = {
        ...rule,
        enabled,
        updatedAt: new Date(),
      };
      alertRules.set(id, updated);

      return {
        success: true,
        data: updated,
      };
    }
  );

  // Delete alert rule
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;

    if (!alertRules.has(id)) {
      return reply.status(404).send({
        error: true,
        message: 'Alert rule not found',
      });
    }

    alertRules.delete(id);

    return {
      success: true,
      message: 'Alert rule deleted',
    };
  });

  // ==========================================================================
  // ALERT EVALUATION ENDPOINTS
  // ==========================================================================

  // Evaluate risk against alert rules
  fastify.post<{ Body: { risk: Risk } }>('/evaluate/risk', async (request) => {
    const { risk } = request.body;

    const rules = Array.from(alertRules.values()).filter(
      r => r.organizationId === risk.organizationId && r.enabled
    );

    const events = evaluateRiskAlerts(risk, rules);

    // Store events
    for (const event of events) {
      alertEvents.set(event.id, event);
    }

    return {
      success: true,
      data: {
        eventsTriggered: events.length,
        events,
      },
    };
  });

  // Evaluate control against alert rules
  fastify.post<{ Body: { control: Control } }>('/evaluate/control', async (request) => {
    const { control } = request.body;

    const rules = Array.from(alertRules.values()).filter(
      r => r.organizationId === control.organizationId && r.enabled
    );

    const events = evaluateControlAlerts(control, rules);

    // Store events
    for (const event of events) {
      alertEvents.set(event.id, event);
    }

    return {
      success: true,
      data: {
        eventsTriggered: events.length,
        events,
      },
    };
  });

  // Evaluate issue against alert rules
  fastify.post<{ Body: { issue: Issue } }>('/evaluate/issue', async (request) => {
    const { issue } = request.body;

    const rules = Array.from(alertRules.values()).filter(
      r => r.organizationId === issue.organizationId && r.enabled
    );

    const events = evaluateIssueAlerts(issue, rules);

    // Store events
    for (const event of events) {
      alertEvents.set(event.id, event);
    }

    return {
      success: true,
      data: {
        eventsTriggered: events.length,
        events,
      },
    };
  });

  // ==========================================================================
  // ALERT EVENTS
  // ==========================================================================

  // List alert events
  fastify.get<{
    Querystring: {
      organizationId?: string;
      severity?: string;
      sourceType?: string;
      acknowledged?: string;
      resolved?: string;
    };
  }>('/events', async (request) => {
    const { organizationId, severity, sourceType, acknowledged, resolved } = request.query;
    let events = Array.from(alertEvents.values());

    if (organizationId) {
      events = events.filter(e => e.organizationId === organizationId);
    }
    if (severity) {
      events = events.filter(e => e.severity === severity);
    }
    if (sourceType) {
      events = events.filter(e => e.sourceType === sourceType);
    }
    if (acknowledged !== undefined) {
      events = events.filter(e => e.acknowledged === (acknowledged === 'true'));
    }
    if (resolved !== undefined) {
      events = events.filter(e => e.resolved === (resolved === 'true'));
    }

    // Sort by creation date (newest first)
    events.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return {
      success: true,
      data: events,
      total: events.length,
    };
  });

  // Get alert event by ID
  fastify.get<{ Params: { eventId: string } }>('/events/:eventId', async (request, reply) => {
    const { eventId } = request.params;
    const event = alertEvents.get(eventId);

    if (!event) {
      return reply.status(404).send({
        error: true,
        message: 'Alert event not found',
      });
    }

    return {
      success: true,
      data: event,
    };
  });

  // Acknowledge alert event
  fastify.post<{ Params: { eventId: string }; Body: { userId: string } }>(
    '/events/:eventId/acknowledge',
    async (request, reply) => {
      const { eventId } = request.params;
      const { userId } = request.body;

      const event = alertEvents.get(eventId);
      if (!event) {
        return reply.status(404).send({
          error: true,
          message: 'Alert event not found',
        });
      }

      const updated = acknowledgeAlert(event, userId);
      alertEvents.set(eventId, updated);

      return {
        success: true,
        data: updated,
      };
    }
  );

  // Resolve alert event
  fastify.post<{ Params: { eventId: string } }>(
    '/events/:eventId/resolve',
    async (request, reply) => {
      const { eventId } = request.params;

      const event = alertEvents.get(eventId);
      if (!event) {
        return reply.status(404).send({
          error: true,
          message: 'Alert event not found',
        });
      }

      const updated = resolveAlert(event);
      alertEvents.set(eventId, updated);

      return {
        success: true,
        data: updated,
      };
    }
  );

  // Convert alert to notification
  fastify.post<{ Params: { eventId: string }; Body: { userId: string } }>(
    '/events/:eventId/notify',
    async (request, reply) => {
      const { eventId } = request.params;
      const { userId } = request.body;

      const event = alertEvents.get(eventId);
      if (!event) {
        return reply.status(404).send({
          error: true,
          message: 'Alert event not found',
        });
      }

      const notification = alertEventToNotification(event, userId);

      return {
        success: true,
        data: notification,
      };
    }
  );

  // Get alert summary
  fastify.get<{ Querystring: { organizationId?: string } }>(
    '/events/summary',
    async (request) => {
      const { organizationId } = request.query;
      let events = Array.from(alertEvents.values());

      if (organizationId) {
        events = events.filter(e => e.organizationId === organizationId);
      }

      const summary = calculateAlertSummary(events);

      return {
        success: true,
        data: summary,
      };
    }
  );

  // Bulk acknowledge alerts
  fastify.post<{ Body: { eventIds: string[]; userId: string } }>(
    '/events/bulk-acknowledge',
    async (request) => {
      const { eventIds, userId } = request.body;
      const updated: AlertEvent[] = [];

      for (const eventId of eventIds) {
        const event = alertEvents.get(eventId);
        if (event) {
          const ack = acknowledgeAlert(event, userId);
          alertEvents.set(eventId, ack);
          updated.push(ack);
        }
      }

      return {
        success: true,
        data: {
          acknowledged: updated.length,
          events: updated,
        },
      };
    }
  );
}
