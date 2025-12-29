// ==========================================================================
// ALERT SERVICE
// Automated alerts for GRC events - risks, controls, issues
// ==========================================================================

import { randomUUID } from '../utils/crypto.js';
import type { Risk } from '../entities/risk.js';
import { getRiskLevel } from '../entities/risk.js';
import type { Control } from '../entities/control.js';
import type { Issue } from '../entities/issue.js';
import { createNotification, type Notification, type NotificationPriority } from '../entities/notification.js';

// ==========================================================================
// ALERT RULE TYPES
// ==========================================================================

export type AlertTriggerType =
  // Risk triggers
  | 'risk_score_exceeds_threshold'
  | 'risk_outside_appetite'
  | 'risk_trend_increasing'
  | 'kri_threshold_breached'
  | 'kri_status_red'
  // Control triggers
  | 'control_test_failed'
  | 'control_test_due'
  | 'control_test_overdue'
  | 'control_effectiveness_degraded'
  // Issue triggers
  | 'issue_created'
  | 'issue_due_soon'
  | 'issue_overdue'
  | 'issue_severity_high'
  | 'issue_escalated'
  | 'remediation_step_overdue'
  // System triggers
  | 'integrity_check_failed'
  | 'audit_package_generated'
  | 'scheduled_review_due';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface AlertRule {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  triggerType: AlertTriggerType;
  enabled: boolean;

  // Conditions
  conditions: AlertCondition[];

  // Actions
  actions: AlertAction[];

  // Schedule (for scheduled alerts)
  schedule?: AlertSchedule;

  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  lastTriggeredAt?: Date;
  triggerCount: number;
}

export interface AlertCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'not_in';
  value: unknown;
}

export interface AlertAction {
  type: 'notification' | 'email' | 'webhook' | 'slack' | 'teams';
  config: Record<string, unknown>;
}

export interface AlertSchedule {
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  hour?: number; // 0-23
  minute?: number; // 0-59
  timezone?: string;
}

export interface AlertEvent {
  id: string;
  organizationId: string;
  ruleId: string;
  ruleName: string;
  triggerType: AlertTriggerType;
  severity: AlertSeverity;
  title: string;
  message: string;
  sourceType: 'risk' | 'control' | 'issue' | 'system';
  sourceId: string;
  sourceName: string;
  metadata: Record<string, unknown>;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedAt?: Date;
  createdAt: Date;
}

// ==========================================================================
// CREATE ALERT RULE
// ==========================================================================

export interface CreateAlertRuleInput {
  organizationId: string;
  name: string;
  description: string;
  triggerType: AlertTriggerType;
  conditions?: AlertCondition[];
  actions: AlertAction[];
  schedule?: AlertSchedule;
  createdBy: string;
}

export function createAlertRule(input: CreateAlertRuleInput): AlertRule {
  const now = new Date();
  return {
    id: randomUUID(),
    organizationId: input.organizationId,
    name: input.name,
    description: input.description,
    triggerType: input.triggerType,
    enabled: true,
    conditions: input.conditions ?? [],
    actions: input.actions,
    schedule: input.schedule,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
    triggerCount: 0,
  };
}

// ==========================================================================
// DEFAULT ALERT RULES
// ==========================================================================

export function getDefaultAlertRules(organizationId: string, createdBy: string): AlertRule[] {
  return [
    createAlertRule({
      organizationId,
      name: 'Critical Risk Alert',
      description: 'Alert when a risk reaches critical level',
      triggerType: 'risk_score_exceeds_threshold',
      conditions: [{ field: 'residualScore', operator: 'greater_than', value: 16 }],
      actions: [{ type: 'notification', config: { priority: 'urgent' } }],
      createdBy,
    }),
    createAlertRule({
      organizationId,
      name: 'Risk Outside Appetite',
      description: 'Alert when risk exceeds organizational appetite',
      triggerType: 'risk_outside_appetite',
      conditions: [{ field: 'withinAppetite', operator: 'equals', value: false }],
      actions: [{ type: 'notification', config: { priority: 'high' } }],
      createdBy,
    }),
    createAlertRule({
      organizationId,
      name: 'KRI Threshold Breach',
      description: 'Alert when a Key Risk Indicator turns red',
      triggerType: 'kri_status_red',
      conditions: [{ field: 'status', operator: 'equals', value: 'red' }],
      actions: [{ type: 'notification', config: { priority: 'high' } }],
      createdBy,
    }),
    createAlertRule({
      organizationId,
      name: 'Control Test Failed',
      description: 'Alert when a control test fails',
      triggerType: 'control_test_failed',
      conditions: [{ field: 'result', operator: 'equals', value: 'fail' }],
      actions: [{ type: 'notification', config: { priority: 'urgent' } }],
      createdBy,
    }),
    createAlertRule({
      organizationId,
      name: 'Control Test Overdue',
      description: 'Alert when control testing is overdue',
      triggerType: 'control_test_overdue',
      conditions: [],
      actions: [{ type: 'notification', config: { priority: 'high' } }],
      schedule: { frequency: 'daily', hour: 8, minute: 0 },
      createdBy,
    }),
    createAlertRule({
      organizationId,
      name: 'Critical Issue Created',
      description: 'Alert when a critical severity issue is created',
      triggerType: 'issue_severity_high',
      conditions: [{ field: 'severity', operator: 'in', value: ['high', 'critical'] }],
      actions: [{ type: 'notification', config: { priority: 'high' } }],
      createdBy,
    }),
    createAlertRule({
      organizationId,
      name: 'Issue Overdue',
      description: 'Alert when an issue passes its target date',
      triggerType: 'issue_overdue',
      conditions: [],
      actions: [{ type: 'notification', config: { priority: 'high' } }],
      schedule: { frequency: 'daily', hour: 8, minute: 0 },
      createdBy,
    }),
    createAlertRule({
      organizationId,
      name: 'Issue Due Soon',
      description: 'Alert when an issue is due within 7 days',
      triggerType: 'issue_due_soon',
      conditions: [{ field: 'daysUntilDue', operator: 'less_than', value: 7 }],
      actions: [{ type: 'notification', config: { priority: 'normal' } }],
      schedule: { frequency: 'daily', hour: 8, minute: 0 },
      createdBy,
    }),
  ];
}

// ==========================================================================
// ALERT EVALUATION
// ==========================================================================

export function evaluateRiskAlerts(
  risk: Risk,
  rules: AlertRule[]
): AlertEvent[] {
  const events: AlertEvent[] = [];
  const now = new Date();

  for (const rule of rules.filter(r => r.enabled)) {
    let shouldTrigger = false;
    let severity: AlertSeverity = 'warning';
    let title = '';
    let message = '';

    switch (rule.triggerType) {
      case 'risk_score_exceeds_threshold': {
        const threshold = rule.conditions.find(c => c.field === 'residualScore')?.value as number ?? 16;
        if (risk.residualScore > threshold) {
          shouldTrigger = true;
          severity = risk.residualScore > 20 ? 'critical' : 'warning';
          title = `Risk Score Exceeded Threshold`;
          message = `Risk "${risk.name}" has a residual score of ${risk.residualScore} (threshold: ${threshold})`;
        }
        break;
      }
      case 'risk_outside_appetite': {
        if (!risk.withinAppetite) {
          shouldTrigger = true;
          severity = getRiskLevel(risk.residualScore) === 'critical' ? 'critical' : 'warning';
          title = `Risk Outside Appetite`;
          message = `Risk "${risk.name}" exceeds organizational risk appetite (score: ${risk.residualScore}, target: ${risk.targetScore})`;
        }
        break;
      }
      case 'risk_trend_increasing': {
        if (risk.trend === 'increasing') {
          shouldTrigger = true;
          severity = 'warning';
          title = `Risk Trend Increasing`;
          message = `Risk "${risk.name}" shows an increasing trend`;
        }
        break;
      }
      case 'kri_status_red': {
        const redKRIs = risk.keyRiskIndicators.filter(k => k.status === 'red');
        if (redKRIs.length > 0) {
          shouldTrigger = true;
          severity = 'critical';
          title = `KRI Threshold Breached`;
          message = `Risk "${risk.name}" has ${redKRIs.length} KRI(s) in red status: ${redKRIs.map(k => k.name).join(', ')}`;
        }
        break;
      }
    }

    if (shouldTrigger) {
      events.push({
        id: randomUUID(),
        organizationId: risk.organizationId,
        ruleId: rule.id,
        ruleName: rule.name,
        triggerType: rule.triggerType,
        severity,
        title,
        message,
        sourceType: 'risk',
        sourceId: risk.id,
        sourceName: risk.name,
        metadata: {
          riskCategory: risk.category,
          inherentScore: risk.inherentScore,
          residualScore: risk.residualScore,
          riskLevel: getRiskLevel(risk.residualScore),
        },
        acknowledged: false,
        resolved: false,
        createdAt: now,
      });
    }
  }

  return events;
}

export function evaluateControlAlerts(
  control: Control,
  rules: AlertRule[]
): AlertEvent[] {
  const events: AlertEvent[] = [];
  const now = new Date();

  for (const rule of rules.filter(r => r.enabled)) {
    let shouldTrigger = false;
    let severity: AlertSeverity = 'warning';
    let title = '';
    let message = '';

    switch (rule.triggerType) {
      case 'control_test_overdue': {
        if (control.nextTestDate && control.nextTestDate < now) {
          shouldTrigger = true;
          const daysOverdue = Math.floor((now.getTime() - control.nextTestDate.getTime()) / (1000 * 60 * 60 * 24));
          severity = daysOverdue > 30 ? 'critical' : 'warning';
          title = `Control Test Overdue`;
          message = `Control "${control.name}" testing is ${daysOverdue} days overdue`;
        }
        break;
      }
      case 'control_test_due': {
        if (control.nextTestDate) {
          const daysUntil = Math.floor((control.nextTestDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (daysUntil >= 0 && daysUntil <= 7) {
            shouldTrigger = true;
            severity = 'info';
            title = `Control Test Due Soon`;
            message = `Control "${control.name}" testing is due in ${daysUntil} days`;
          }
        }
        break;
      }
      case 'control_effectiveness_degraded': {
        if (control.currentEffectiveness === 'ineffective' || control.currentEffectiveness === 'partially_effective') {
          shouldTrigger = true;
          severity = control.currentEffectiveness === 'ineffective' ? 'critical' : 'warning';
          title = `Control Effectiveness Degraded`;
          message = `Control "${control.name}" is currently ${control.currentEffectiveness.replace('_', ' ')}`;
        }
        break;
      }
    }

    if (shouldTrigger) {
      events.push({
        id: randomUUID(),
        organizationId: control.organizationId,
        ruleId: rule.id,
        ruleName: rule.name,
        triggerType: rule.triggerType,
        severity,
        title,
        message,
        sourceType: 'control',
        sourceId: control.id,
        sourceName: control.name,
        metadata: {
          controlId: control.controlId,
          controlType: control.type,
          controlNature: control.nature,
          effectiveness: control.currentEffectiveness,
          isSoxRelevant: control.isSoxRelevant,
        },
        acknowledged: false,
        resolved: false,
        createdAt: now,
      });
    }
  }

  return events;
}

export function evaluateIssueAlerts(
  issue: Issue,
  rules: AlertRule[]
): AlertEvent[] {
  const events: AlertEvent[] = [];
  const now = new Date();

  for (const rule of rules.filter(r => r.enabled)) {
    let shouldTrigger = false;
    let severity: AlertSeverity = 'warning';
    let title = '';
    let message = '';

    switch (rule.triggerType) {
      case 'issue_created': {
        // This would be triggered on creation, check if recently created
        const hoursSinceCreation = (now.getTime() - issue.createdAt.getTime()) / (1000 * 60 * 60);
        if (hoursSinceCreation < 1) {
          shouldTrigger = true;
          severity = issue.severity === 'critical' ? 'critical' : 'info';
          title = `New Issue Created`;
          message = `Issue "${issue.title}" (${issue.severity} severity) has been created`;
        }
        break;
      }
      case 'issue_severity_high': {
        if (issue.severity === 'high' || issue.severity === 'critical') {
          shouldTrigger = true;
          severity = issue.severity === 'critical' ? 'critical' : 'warning';
          title = `High Severity Issue`;
          message = `Issue "${issue.title}" has ${issue.severity} severity`;
        }
        break;
      }
      case 'issue_overdue': {
        if (issue.targetDate && issue.targetDate < now && !['closed', 'validated', 'accepted', 'deferred'].includes(issue.status)) {
          shouldTrigger = true;
          const daysOverdue = Math.floor((now.getTime() - issue.targetDate.getTime()) / (1000 * 60 * 60 * 24));
          severity = daysOverdue > 30 ? 'critical' : 'warning';
          title = `Issue Overdue`;
          message = `Issue "${issue.title}" is ${daysOverdue} days past target date`;
        }
        break;
      }
      case 'issue_due_soon': {
        if (issue.targetDate && !['closed', 'validated', 'accepted', 'deferred'].includes(issue.status)) {
          const daysUntil = Math.floor((issue.targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          const threshold = (rule.conditions.find(c => c.field === 'daysUntilDue')?.value as number) ?? 7;
          if (daysUntil >= 0 && daysUntil <= threshold) {
            shouldTrigger = true;
            severity = daysUntil <= 3 ? 'warning' : 'info';
            title = `Issue Due Soon`;
            message = `Issue "${issue.title}" is due in ${daysUntil} days`;
          }
        }
        break;
      }
      case 'issue_escalated': {
        if (issue.escalationLevel && issue.escalationLevel > 0) {
          shouldTrigger = true;
          severity = issue.escalationLevel >= 2 ? 'critical' : 'warning';
          title = `Issue Escalated`;
          message = `Issue "${issue.title}" has been escalated to level ${issue.escalationLevel}`;
        }
        break;
      }
    }

    if (shouldTrigger) {
      events.push({
        id: randomUUID(),
        organizationId: issue.organizationId,
        ruleId: rule.id,
        ruleName: rule.name,
        triggerType: rule.triggerType,
        severity,
        title,
        message,
        sourceType: 'issue',
        sourceId: issue.id,
        sourceName: issue.title,
        metadata: {
          issueNumber: issue.issueNumber,
          issueType: issue.type,
          issueSeverity: issue.severity,
          issueStatus: issue.status,
          targetDate: issue.targetDate?.toISOString(),
        },
        acknowledged: false,
        resolved: false,
        createdAt: now,
      });
    }
  }

  return events;
}

// ==========================================================================
// ALERT EVENT MANAGEMENT
// ==========================================================================

export function acknowledgeAlert(event: AlertEvent, userId: string): AlertEvent {
  return {
    ...event,
    acknowledged: true,
    acknowledgedBy: userId,
    acknowledgedAt: new Date(),
  };
}

export function resolveAlert(event: AlertEvent): AlertEvent {
  return {
    ...event,
    resolved: true,
    resolvedAt: new Date(),
  };
}

// ==========================================================================
// CONVERT ALERT TO NOTIFICATION
// ==========================================================================

export function alertEventToNotification(
  event: AlertEvent,
  userId: string
): Notification {
  const priorityMap: Record<AlertSeverity, NotificationPriority> = {
    info: 'normal',
    warning: 'high',
    critical: 'urgent',
  };

  return createNotification({
    organizationId: event.organizationId,
    userId,
    type: event.sourceType === 'risk' ? 'integrity_alert' :
          event.sourceType === 'control' ? 'integrity_warning' :
          'system',
    priority: priorityMap[event.severity],
    title: event.title,
    message: event.message,
    link: `/${event.sourceType}s/${event.sourceId}`,
    metadata: {
      alertEventId: event.id,
      ruleId: event.ruleId,
      sourceType: event.sourceType,
      sourceId: event.sourceId,
      ...event.metadata,
    },
  });
}

// ==========================================================================
// ALERT SUMMARY
// ==========================================================================

export interface AlertSummary {
  total: number;
  bySeverity: Record<AlertSeverity, number>;
  bySourceType: Record<string, number>;
  byTriggerType: Record<string, number>;
  unacknowledged: number;
  unresolved: number;
  last24Hours: number;
  last7Days: number;
}

export function calculateAlertSummary(events: AlertEvent[]): AlertSummary {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const summary: AlertSummary = {
    total: events.length,
    bySeverity: { info: 0, warning: 0, critical: 0 },
    bySourceType: {},
    byTriggerType: {},
    unacknowledged: 0,
    unresolved: 0,
    last24Hours: 0,
    last7Days: 0,
  };

  for (const event of events) {
    summary.bySeverity[event.severity]++;
    summary.bySourceType[event.sourceType] = (summary.bySourceType[event.sourceType] ?? 0) + 1;
    summary.byTriggerType[event.triggerType] = (summary.byTriggerType[event.triggerType] ?? 0) + 1;

    if (!event.acknowledged) summary.unacknowledged++;
    if (!event.resolved) summary.unresolved++;

    if (event.createdAt >= oneDayAgo) summary.last24Hours++;
    if (event.createdAt >= sevenDaysAgo) summary.last7Days++;
  }

  return summary;
}
