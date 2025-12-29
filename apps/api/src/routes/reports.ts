// ==========================================================================
// REPORT BUILDER ROUTES
// Custom report generation and management
// ==========================================================================

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  createReportTemplate,
  createReportInstance,
  generateReportData,
  formatReportAsCSV,
  formatReportAsHTML,
  getRiskRegisterTemplate,
  getControlMatrixTemplate,
  getIssueSummaryTemplate,
  getExecutiveDashboardTemplate,
  calculateReportSummary,
  type ReportTemplate,
  type ReportInstance,
} from '@veilvault/core';

// In-memory stores (replace with database in production)
const templates = new Map<string, ReportTemplate>();
const instances = new Map<string, ReportInstance>();

// Validation schemas
const dataSourceSchema = z.object({
  entity: z.enum(['risks', 'controls', 'issues', 'tests', 'deficiencies', 'assessments']),
  alias: z.string().optional(),
  join: z.object({
    entity: z.string(),
    localField: z.string(),
    foreignField: z.string(),
  }).optional(),
});

const filterSchema = z.object({
  field: z.string(),
  operator: z.enum(['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'in', 'between', 'is_null', 'is_not_null']),
  value: z.unknown(),
  isParameter: z.boolean().optional(),
  parameterName: z.string().optional(),
});

const columnSchema = z.object({
  field: z.string(),
  header: z.string(),
  width: z.number().optional(),
  format: z.object({
    type: z.enum(['text', 'number', 'date', 'currency', 'percentage', 'boolean', 'status', 'severity']),
    dateFormat: z.string().optional(),
    decimalPlaces: z.number().optional(),
    currencyCode: z.string().optional(),
  }).optional(),
  visible: z.boolean(),
  order: z.number(),
});

const createTemplateSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string(),
  type: z.enum([
    'risk_register',
    'control_matrix',
    'issue_summary',
    'sox_status',
    'audit_findings',
    'remediation_tracker',
    'executive_dashboard',
    'regulatory_compliance',
    'custom',
  ]),
  dataSources: z.array(dataSourceSchema),
  columns: z.array(columnSchema),
  filters: z.array(filterSchema).optional(),
  groupBy: z.array(z.string()).optional(),
  sortBy: z.array(z.object({
    field: z.string(),
    direction: z.enum(['asc', 'desc']),
  })).optional(),
  aggregations: z.array(z.object({
    field: z.string(),
    function: z.enum(['count', 'sum', 'avg', 'min', 'max', 'count_distinct']),
    alias: z.string(),
    groupBy: z.string().optional(),
  })).optional(),
  summaryMetrics: z.array(z.object({
    name: z.string(),
    field: z.string(),
    function: z.enum(['count', 'sum', 'avg', 'percentage']),
    filter: filterSchema.optional(),
    format: z.object({
      type: z.enum(['text', 'number', 'date', 'currency', 'percentage', 'boolean', 'status', 'severity']),
      decimalPlaces: z.number().optional(),
    }),
  })).optional(),
  format: z.enum(['json', 'csv', 'pdf', 'excel', 'html']).optional(),
  schedule: z.enum(['on_demand', 'daily', 'weekly', 'monthly', 'quarterly']).optional(),
  recipients: z.array(z.string()).optional(),
  createdBy: z.string(),
});

export async function reportRoutes(fastify: FastifyInstance) {
  // ==========================================================================
  // TEMPLATE ENDPOINTS
  // ==========================================================================

  // Create custom template
  fastify.post('/templates', async (request, reply) => {
    const body = createTemplateSchema.parse(request.body);

    const template = createReportTemplate(body);
    templates.set(template.id, template);

    return reply.status(201).send({
      success: true,
      data: template,
    });
  });

  // Get template by ID
  fastify.get<{ Params: { id: string } }>('/templates/:id', async (request, reply) => {
    const { id } = request.params;
    const template = templates.get(id);

    if (!template) {
      return reply.status(404).send({
        error: true,
        message: 'Report template not found',
      });
    }

    return {
      success: true,
      data: template,
    };
  });

  // List templates
  fastify.get<{
    Querystring: { organizationId?: string; type?: string; schedule?: string };
  }>('/templates', async (request) => {
    const { organizationId, type, schedule } = request.query;
    let list = Array.from(templates.values());

    if (organizationId) {
      list = list.filter(t => t.organizationId === organizationId);
    }
    if (type) {
      list = list.filter(t => t.type === type);
    }
    if (schedule) {
      list = list.filter(t => t.schedule === schedule);
    }

    return {
      success: true,
      data: list,
      total: list.length,
    };
  });

  // Update template
  fastify.patch<{ Params: { id: string } }>(
    '/templates/:id',
    async (request, reply) => {
      const { id } = request.params;
      const updates = request.body as Partial<ReportTemplate>;

      const template = templates.get(id);
      if (!template) {
        return reply.status(404).send({
          error: true,
          message: 'Report template not found',
        });
      }

      const updated: ReportTemplate = {
        ...template,
        ...updates,
        id: template.id, // Preserve ID
        organizationId: template.organizationId, // Preserve org
        createdBy: template.createdBy, // Preserve creator
        createdAt: template.createdAt, // Preserve created date
        updatedAt: new Date(),
      };

      templates.set(id, updated);

      return {
        success: true,
        data: updated,
      };
    }
  );

  // Delete template
  fastify.delete<{ Params: { id: string } }>('/templates/:id', async (request, reply) => {
    const { id } = request.params;

    if (!templates.has(id)) {
      return reply.status(404).send({
        error: true,
        message: 'Report template not found',
      });
    }

    templates.delete(id);

    return {
      success: true,
      message: 'Template deleted',
    };
  });

  // Clone template
  fastify.post<{ Params: { id: string }; Body: { name: string; createdBy: string } }>(
    '/templates/:id/clone',
    async (request, reply) => {
      const { id } = request.params;
      const { name, createdBy } = request.body;

      const template = templates.get(id);
      if (!template) {
        return reply.status(404).send({
          error: true,
          message: 'Report template not found',
        });
      }

      const cloned = createReportTemplate({
        ...template,
        name,
        createdBy,
      });

      templates.set(cloned.id, cloned);

      return reply.status(201).send({
        success: true,
        data: cloned,
      });
    }
  );

  // ==========================================================================
  // BUILT-IN TEMPLATES
  // ==========================================================================

  // Initialize built-in templates for organization
  fastify.post<{ Params: { organizationId: string }; Body: { createdBy: string } }>(
    '/templates/initialize/:organizationId',
    async (request, reply) => {
      const { organizationId } = request.params;
      const { createdBy } = request.body;

      const builtIn = [
        getRiskRegisterTemplate(organizationId, createdBy),
        getControlMatrixTemplate(organizationId, createdBy),
        getIssueSummaryTemplate(organizationId, createdBy),
        getExecutiveDashboardTemplate(organizationId, createdBy),
      ];

      for (const template of builtIn) {
        templates.set(template.id, template);
      }

      return reply.status(201).send({
        success: true,
        data: {
          templatesCreated: builtIn.length,
          templates: builtIn,
        },
      });
    }
  );

  // ==========================================================================
  // REPORT GENERATION
  // ==========================================================================

  // Generate report
  fastify.post<{
    Params: { templateId: string };
    Body: { generatedBy: string; parameters?: Record<string, unknown>; data?: unknown };
  }>('/templates/:templateId/generate', async (request, reply) => {
    const { templateId } = request.params;
    const { generatedBy, parameters, data } = request.body;

    const template = templates.get(templateId);
    if (!template) {
      return reply.status(404).send({
        error: true,
        message: 'Report template not found',
      });
    }

    // Create report instance
    const instance = createReportInstance(template, generatedBy, parameters);
    instances.set(instance.id, { ...instance, status: 'generating' });

    try {
      // Generate report data
      const reportData = generateReportData(template, (data ?? {}) as never);

      // Update instance with results
      const completed: ReportInstance = {
        ...instance,
        status: 'completed',
        data: reportData,
      };

      instances.set(instance.id, completed);

      // Update template last generated
      templates.set(templateId, {
        ...template,
        lastGeneratedAt: new Date(),
      });

      return reply.status(201).send({
        success: true,
        data: completed,
      });
    } catch (error) {
      const failed: ReportInstance = {
        ...instance,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      instances.set(instance.id, failed);

      return reply.status(500).send({
        error: true,
        message: 'Report generation failed',
        details: failed.error,
      });
    }
  });

  // Get report instance
  fastify.get<{ Params: { instanceId: string } }>(
    '/instances/:instanceId',
    async (request, reply) => {
      const { instanceId } = request.params;
      const instance = instances.get(instanceId);

      if (!instance) {
        return reply.status(404).send({
          error: true,
          message: 'Report instance not found',
        });
      }

      return {
        success: true,
        data: instance,
      };
    }
  );

  // List report instances
  fastify.get<{
    Querystring: { organizationId?: string; templateId?: string; status?: string };
  }>('/instances', async (request) => {
    const { organizationId, templateId, status } = request.query;
    let list = Array.from(instances.values());

    if (organizationId) {
      list = list.filter(i => i.organizationId === organizationId);
    }
    if (templateId) {
      list = list.filter(i => i.templateId === templateId);
    }
    if (status) {
      list = list.filter(i => i.status === status);
    }

    // Sort by generated date (newest first)
    list.sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());

    return {
      success: true,
      data: list,
      total: list.length,
    };
  });

  // Download report in specified format
  fastify.get<{ Params: { instanceId: string }; Querystring: { format?: string } }>(
    '/instances/:instanceId/download',
    async (request, reply) => {
      const { instanceId } = request.params;
      const { format } = request.query;

      const instance = instances.get(instanceId);
      if (!instance) {
        return reply.status(404).send({
          error: true,
          message: 'Report instance not found',
        });
      }

      if (instance.status !== 'completed' || !instance.data) {
        return reply.status(400).send({
          error: true,
          message: 'Report not ready for download',
        });
      }

      const template = templates.get(instance.templateId);
      if (!template) {
        return reply.status(404).send({
          error: true,
          message: 'Template not found',
        });
      }

      const outputFormat = format ?? instance.format;

      // Update download count
      instances.set(instanceId, {
        ...instance,
        downloadCount: instance.downloadCount + 1,
        lastDownloadedAt: new Date(),
      });

      switch (outputFormat) {
        case 'csv':
          const csv = formatReportAsCSV(instance.data);
          return reply
            .header('Content-Type', 'text/csv')
            .header('Content-Disposition', `attachment; filename="${template.name}.csv"`)
            .send(csv);

        case 'html':
          const html = formatReportAsHTML(instance.data, template);
          return reply
            .header('Content-Type', 'text/html')
            .send(html);

        case 'json':
        default:
          return reply
            .header('Content-Type', 'application/json')
            .send(instance.data);
      }
    }
  );

  // ==========================================================================
  // REPORT SUMMARY
  // ==========================================================================

  // Get report summary
  fastify.get<{ Querystring: { organizationId?: string } }>('/summary', async (request) => {
    const { organizationId } = request.query;

    let templateList = Array.from(templates.values());
    let instanceList = Array.from(instances.values());

    if (organizationId) {
      templateList = templateList.filter(t => t.organizationId === organizationId);
      instanceList = instanceList.filter(i => i.organizationId === organizationId);
    }

    const summary = calculateReportSummary(templateList, instanceList);

    return {
      success: true,
      data: summary,
    };
  });

  // ==========================================================================
  // QUICK REPORTS (Pre-built templates)
  // ==========================================================================

  // Quick risk register
  fastify.post<{
    Body: { organizationId: string; generatedBy: string; risks: unknown[] };
  }>('/quick/risk-register', async (request, reply) => {
    const { organizationId, generatedBy, risks } = request.body;

    const template = getRiskRegisterTemplate(organizationId, generatedBy);
    const instance = createReportInstance(template, generatedBy);
    const reportData = generateReportData(template, { risks: risks as never[] });

    const completed: ReportInstance = {
      ...instance,
      status: 'completed',
      data: reportData,
    };

    instances.set(completed.id, completed);

    return reply.status(201).send({
      success: true,
      data: completed,
    });
  });

  // Quick control matrix
  fastify.post<{
    Body: { organizationId: string; generatedBy: string; controls: unknown[] };
  }>('/quick/control-matrix', async (request, reply) => {
    const { organizationId, generatedBy, controls } = request.body;

    const template = getControlMatrixTemplate(organizationId, generatedBy);
    const instance = createReportInstance(template, generatedBy);
    const reportData = generateReportData(template, { controls: controls as never[] });

    const completed: ReportInstance = {
      ...instance,
      status: 'completed',
      data: reportData,
    };

    instances.set(completed.id, completed);

    return reply.status(201).send({
      success: true,
      data: completed,
    });
  });

  // Quick issue summary
  fastify.post<{
    Body: { organizationId: string; generatedBy: string; issues: unknown[] };
  }>('/quick/issue-summary', async (request, reply) => {
    const { organizationId, generatedBy, issues } = request.body;

    const template = getIssueSummaryTemplate(organizationId, generatedBy);
    const instance = createReportInstance(template, generatedBy);
    const reportData = generateReportData(template, { issues: issues as never[] });

    const completed: ReportInstance = {
      ...instance,
      status: 'completed',
      data: reportData,
    };

    instances.set(completed.id, completed);

    return reply.status(201).send({
      success: true,
      data: completed,
    });
  });
}
