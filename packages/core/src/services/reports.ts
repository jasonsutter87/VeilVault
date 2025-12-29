// ==========================================================================
// CUSTOM REPORT BUILDER SERVICE
// Configurable report generation for GRC data
// ==========================================================================

import { randomUUID } from '../utils/crypto.js';
import type { Risk } from '../entities/risk.js';
import type { Control } from '../entities/control.js';
import type { Issue } from '../entities/issue.js';

// ==========================================================================
// REPORT TEMPLATES
// ==========================================================================

export type CustomReportType =
  | 'risk_register'
  | 'control_matrix'
  | 'issue_summary'
  | 'sox_status'
  | 'audit_findings'
  | 'remediation_tracker'
  | 'executive_dashboard'
  | 'regulatory_compliance'
  | 'custom';

export type CustomReportFormat = 'json' | 'csv' | 'pdf' | 'excel' | 'html';

export type ReportSchedule = 'on_demand' | 'daily' | 'weekly' | 'monthly' | 'quarterly';

export interface ReportTemplate {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  type: CustomReportType;

  // Data selection
  dataSources: DataSource[];
  filters: ReportFilter[];
  columns: ReportColumn[];
  groupBy?: string[];
  sortBy?: SortOption[];

  // Aggregations
  aggregations: Aggregation[];
  summaryMetrics: SummaryMetric[];

  // Formatting
  format: CustomReportFormat;
  styling: ReportStyling;

  // Scheduling
  schedule: ReportSchedule;
  scheduleConfig?: ScheduleConfig;
  recipients?: string[];

  // Metadata
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  lastGeneratedAt?: Date;
}

export interface DataSource {
  entity: 'risks' | 'controls' | 'issues' | 'tests' | 'deficiencies' | 'assessments';
  alias?: string;
  join?: {
    entity: string;
    localField: string;
    foreignField: string;
  };
}

export interface ReportFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'between' | 'is_null' | 'is_not_null';
  value?: unknown;
  isParameter?: boolean; // Allow user input at runtime
  parameterName?: string;
}

export interface ReportColumn {
  field: string;
  header: string;
  width?: number;
  format?: ColumnFormat;
  visible: boolean;
  order: number;
}

export interface ColumnFormat {
  type: 'text' | 'number' | 'date' | 'currency' | 'percentage' | 'boolean' | 'status' | 'severity';
  dateFormat?: string;
  decimalPlaces?: number;
  currencyCode?: string;
  statusColors?: Record<string, string>;
}

export interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
}

export interface Aggregation {
  field: string;
  function: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'count_distinct';
  alias: string;
  groupBy?: string;
}

export interface SummaryMetric {
  name: string;
  field: string;
  function: 'count' | 'sum' | 'avg' | 'percentage';
  filter?: ReportFilter;
  format: ColumnFormat;
}

export interface ReportStyling {
  theme: 'default' | 'professional' | 'minimal' | 'branded';
  headerColor?: string;
  accentColor?: string;
  showLogo: boolean;
  logoUrl?: string;
  pageOrientation: 'portrait' | 'landscape';
  pageSize: 'letter' | 'a4' | 'legal';
  includePageNumbers: boolean;
  includeGeneratedDate: boolean;
  customCss?: string;
}

export interface ScheduleConfig {
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  hour: number; // 0-23
  minute: number; // 0-59
  timezone: string;
}

// ==========================================================================
// REPORT INSTANCE (Generated Report)
// ==========================================================================

export interface ReportInstance {
  id: string;
  templateId: string;
  organizationId: string;
  name: string;
  type: CustomReportType;
  format: CustomReportFormat;

  // Generation details
  generatedBy: string;
  generatedAt: Date;
  parameters?: Record<string, unknown>;

  // Output
  status: 'pending' | 'generating' | 'completed' | 'failed';
  data?: ReportData;
  fileUrl?: string;
  fileSizeBytes?: number;
  error?: string;

  // Audit
  downloadCount: number;
  lastDownloadedAt?: Date;
  expiresAt?: Date;
}

export interface ReportData {
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  summary: Record<string, unknown>;
  generatedAt: Date;
  rowCount: number;
  executionTimeMs: number;
}

// ==========================================================================
// CREATE FUNCTIONS
// ==========================================================================

export interface CreateTemplateInput {
  organizationId: string;
  name: string;
  description: string;
  type: CustomReportType;
  dataSources: DataSource[];
  columns: ReportColumn[];
  filters?: ReportFilter[];
  groupBy?: string[];
  sortBy?: SortOption[];
  aggregations?: Aggregation[];
  summaryMetrics?: SummaryMetric[];
  format?: CustomReportFormat;
  schedule?: ReportSchedule;
  scheduleConfig?: ScheduleConfig;
  recipients?: string[];
  createdBy: string;
}

export function createReportTemplate(input: CreateTemplateInput): ReportTemplate {
  const now = new Date();
  return {
    id: randomUUID(),
    organizationId: input.organizationId,
    name: input.name,
    description: input.description,
    type: input.type,
    dataSources: input.dataSources,
    filters: input.filters ?? [],
    columns: input.columns,
    groupBy: input.groupBy,
    sortBy: input.sortBy,
    aggregations: input.aggregations ?? [],
    summaryMetrics: input.summaryMetrics ?? [],
    format: input.format ?? 'json',
    styling: {
      theme: 'default',
      showLogo: true,
      pageOrientation: 'portrait',
      pageSize: 'letter',
      includePageNumbers: true,
      includeGeneratedDate: true,
    },
    schedule: input.schedule ?? 'on_demand',
    scheduleConfig: input.scheduleConfig,
    recipients: input.recipients,
    isPublic: false,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  };
}

export function createReportInstance(
  template: ReportTemplate,
  generatedBy: string,
  parameters?: Record<string, unknown>
): ReportInstance {
  const now = new Date();
  return {
    id: randomUUID(),
    templateId: template.id,
    organizationId: template.organizationId,
    name: template.name,
    type: template.type,
    format: template.format,
    generatedBy,
    generatedAt: now,
    parameters,
    status: 'pending',
    downloadCount: 0,
    expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
  };
}

// ==========================================================================
// BUILT-IN REPORT TEMPLATES
// ==========================================================================

export function getRiskRegisterTemplate(organizationId: string, createdBy: string): ReportTemplate {
  return createReportTemplate({
    organizationId,
    name: 'Risk Register',
    description: 'Complete listing of all organizational risks with scoring and status',
    type: 'risk_register',
    dataSources: [{ entity: 'risks' }],
    columns: [
      { field: 'name', header: 'Risk Name', visible: true, order: 1 },
      { field: 'category', header: 'Category', visible: true, order: 2 },
      { field: 'status', header: 'Status', visible: true, order: 3, format: { type: 'status' } },
      { field: 'inherentScore', header: 'Inherent Score', visible: true, order: 4, format: { type: 'number' } },
      { field: 'residualScore', header: 'Residual Score', visible: true, order: 5, format: { type: 'number' } },
      { field: 'withinAppetite', header: 'Within Appetite', visible: true, order: 6, format: { type: 'boolean' } },
      { field: 'ownerName', header: 'Risk Owner', visible: true, order: 7 },
      { field: 'controlIds', header: 'Linked Controls', visible: true, order: 8 },
      { field: 'lastAssessedAt', header: 'Last Assessed', visible: true, order: 9, format: { type: 'date' } },
    ],
    sortBy: [{ field: 'residualScore', direction: 'desc' }],
    summaryMetrics: [
      { name: 'Total Risks', field: 'id', function: 'count', format: { type: 'number' } },
      { name: 'Critical Risks', field: 'residualScore', function: 'count', filter: { field: 'residualScore', operator: 'greater_than', value: 16 }, format: { type: 'number' } },
      { name: 'Avg Residual Score', field: 'residualScore', function: 'avg', format: { type: 'number', decimalPlaces: 1 } },
    ],
    createdBy,
  });
}

export function getControlMatrixTemplate(organizationId: string, createdBy: string): ReportTemplate {
  return createReportTemplate({
    organizationId,
    name: 'Control Matrix',
    description: 'Internal controls inventory with effectiveness status',
    type: 'control_matrix',
    dataSources: [{ entity: 'controls' }],
    columns: [
      { field: 'controlId', header: 'Control ID', visible: true, order: 1 },
      { field: 'name', header: 'Control Name', visible: true, order: 2 },
      { field: 'type', header: 'Type', visible: true, order: 3 },
      { field: 'nature', header: 'Nature', visible: true, order: 4 },
      { field: 'frequency', header: 'Frequency', visible: true, order: 5 },
      { field: 'currentEffectiveness', header: 'Effectiveness', visible: true, order: 6, format: { type: 'status' } },
      { field: 'isSoxRelevant', header: 'SOX Relevant', visible: true, order: 7, format: { type: 'boolean' } },
      { field: 'ownerName', header: 'Control Owner', visible: true, order: 8 },
      { field: 'lastTestedAt', header: 'Last Tested', visible: true, order: 9, format: { type: 'date' } },
      { field: 'nextTestDate', header: 'Next Test', visible: true, order: 10, format: { type: 'date' } },
    ],
    filters: [{ field: 'status', operator: 'equals', value: 'active' }],
    sortBy: [{ field: 'controlId', direction: 'asc' }],
    summaryMetrics: [
      { name: 'Total Controls', field: 'id', function: 'count', format: { type: 'number' } },
      { name: 'Effective', field: 'currentEffectiveness', function: 'count', filter: { field: 'currentEffectiveness', operator: 'equals', value: 'effective' }, format: { type: 'number' } },
      { name: 'Ineffective', field: 'currentEffectiveness', function: 'count', filter: { field: 'currentEffectiveness', operator: 'equals', value: 'ineffective' }, format: { type: 'number' } },
      { name: 'SOX Controls', field: 'isSoxRelevant', function: 'count', filter: { field: 'isSoxRelevant', operator: 'equals', value: true }, format: { type: 'number' } },
    ],
    createdBy,
  });
}

export function getIssueSummaryTemplate(organizationId: string, createdBy: string): ReportTemplate {
  return createReportTemplate({
    organizationId,
    name: 'Issue Summary Report',
    description: 'Open issues and remediation status',
    type: 'issue_summary',
    dataSources: [{ entity: 'issues' }],
    columns: [
      { field: 'issueNumber', header: 'Issue #', visible: true, order: 1 },
      { field: 'title', header: 'Title', visible: true, order: 2 },
      { field: 'type', header: 'Type', visible: true, order: 3 },
      { field: 'severity', header: 'Severity', visible: true, order: 4, format: { type: 'severity' } },
      { field: 'status', header: 'Status', visible: true, order: 5, format: { type: 'status' } },
      { field: 'ownerName', header: 'Owner', visible: true, order: 6 },
      { field: 'targetDate', header: 'Target Date', visible: true, order: 7, format: { type: 'date' } },
      { field: 'identifiedDate', header: 'Identified', visible: true, order: 8, format: { type: 'date' } },
      { field: 'escalationLevel', header: 'Escalation', visible: true, order: 9, format: { type: 'number' } },
    ],
    filters: [{ field: 'status', operator: 'not_equals', value: 'closed' }],
    sortBy: [
      { field: 'severity', direction: 'desc' },
      { field: 'targetDate', direction: 'asc' },
    ],
    summaryMetrics: [
      { name: 'Open Issues', field: 'id', function: 'count', format: { type: 'number' } },
      { name: 'Critical/High', field: 'severity', function: 'count', filter: { field: 'severity', operator: 'in', value: ['critical', 'high'] }, format: { type: 'number' } },
      { name: 'Overdue', field: 'targetDate', function: 'count', filter: { field: 'targetDate', operator: 'less_than', value: new Date() }, format: { type: 'number' } },
    ],
    createdBy,
  });
}

export function getExecutiveDashboardTemplate(organizationId: string, createdBy: string): ReportTemplate {
  return createReportTemplate({
    organizationId,
    name: 'Executive Dashboard',
    description: 'High-level GRC metrics for leadership',
    type: 'executive_dashboard',
    dataSources: [
      { entity: 'risks' },
      { entity: 'controls' },
      { entity: 'issues' },
    ],
    columns: [],
    summaryMetrics: [
      // Risk metrics
      { name: 'Total Risks', field: 'risks.id', function: 'count', format: { type: 'number' } },
      { name: 'Critical Risks', field: 'risks.residualScore', function: 'count', filter: { field: 'residualScore', operator: 'greater_than', value: 16 }, format: { type: 'number' } },
      { name: 'Risks Outside Appetite', field: 'risks.withinAppetite', function: 'count', filter: { field: 'withinAppetite', operator: 'equals', value: false }, format: { type: 'number' } },
      // Control metrics
      { name: 'Total Controls', field: 'controls.id', function: 'count', format: { type: 'number' } },
      { name: 'Effective Controls', field: 'controls.currentEffectiveness', function: 'percentage', filter: { field: 'currentEffectiveness', operator: 'equals', value: 'effective' }, format: { type: 'percentage' } },
      { name: 'Testing Overdue', field: 'controls.nextTestDate', function: 'count', filter: { field: 'nextTestDate', operator: 'less_than', value: new Date() }, format: { type: 'number' } },
      // Issue metrics
      { name: 'Open Issues', field: 'issues.status', function: 'count', filter: { field: 'status', operator: 'not_equals', value: 'closed' }, format: { type: 'number' } },
      { name: 'Overdue Issues', field: 'issues.targetDate', function: 'count', filter: { field: 'targetDate', operator: 'less_than', value: new Date() }, format: { type: 'number' } },
    ],
    format: 'pdf',
    createdBy,
  });
}

// ==========================================================================
// REPORT GENERATION
// ==========================================================================

export interface GenerateReportInput {
  risks?: Risk[];
  controls?: Control[];
  issues?: Issue[];
}

export function generateReportData(
  template: ReportTemplate,
  data: GenerateReportInput
): ReportData {
  const startTime = Date.now();

  // Collect data from sources
  let rows: Record<string, unknown>[] = [];

  for (const source of template.dataSources) {
    const sourceData = data[source.entity as keyof GenerateReportInput] ?? [];
    rows = rows.concat(sourceData.map(item => ({ ...item, _source: source.entity })));
  }

  // Apply filters
  for (const filter of template.filters) {
    rows = rows.filter(row => evaluateFilter(row, filter));
  }

  // Apply sorting
  if (template.sortBy && template.sortBy.length > 0) {
    rows.sort((a, b) => {
      for (const sort of template.sortBy!) {
        const aVal = a[sort.field];
        const bVal = b[sort.field];
        const comparison = compareValues(aVal, bVal);
        if (comparison !== 0) {
          return sort.direction === 'asc' ? comparison : -comparison;
        }
      }
      return 0;
    });
  }

  // Calculate summary metrics
  const summary: Record<string, unknown> = {};
  for (const metric of template.summaryMetrics) {
    let metricData = rows;
    if (metric.filter) {
      metricData = metricData.filter(row => evaluateFilter(row, metric.filter!));
    }

    switch (metric.function) {
      case 'count':
        summary[metric.name] = metricData.length;
        break;
      case 'sum':
        summary[metric.name] = metricData.reduce((acc, row) => acc + (Number(row[metric.field]) || 0), 0);
        break;
      case 'avg':
        const sum = metricData.reduce((acc, row) => acc + (Number(row[metric.field]) || 0), 0);
        summary[metric.name] = metricData.length > 0 ? sum / metricData.length : 0;
        break;
      case 'percentage':
        summary[metric.name] = rows.length > 0 ? (metricData.length / rows.length) * 100 : 0;
        break;
    }
  }

  // Select only visible columns
  const visibleColumns = template.columns.filter(c => c.visible).sort((a, b) => a.order - b.order);

  return {
    columns: visibleColumns,
    rows,
    summary,
    generatedAt: new Date(),
    rowCount: rows.length,
    executionTimeMs: Date.now() - startTime,
  };
}

function evaluateFilter(row: Record<string, unknown>, filter: ReportFilter): boolean {
  const value = row[filter.field];

  switch (filter.operator) {
    case 'equals':
      return value === filter.value;
    case 'not_equals':
      return value !== filter.value;
    case 'contains':
      return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
    case 'greater_than':
      return Number(value) > Number(filter.value);
    case 'less_than':
      return Number(value) < Number(filter.value);
    case 'in':
      return Array.isArray(filter.value) && filter.value.includes(value);
    case 'is_null':
      return value === null || value === undefined;
    case 'is_not_null':
      return value !== null && value !== undefined;
    case 'between':
      if (Array.isArray(filter.value) && filter.value.length === 2) {
        const num = Number(value);
        return num >= Number(filter.value[0]) && num <= Number(filter.value[1]);
      }
      return false;
    default:
      return true;
  }
}

function compareValues(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;

  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() - b.getTime();
  }

  return String(a).localeCompare(String(b));
}

// ==========================================================================
// REPORT FORMATTING
// ==========================================================================

export function formatReportAsCSV(data: ReportData): string {
  const headers = data.columns.map(c => c.header).join(',');
  const rows = data.rows.map(row =>
    data.columns.map(col => {
      const value = row[col.field];
      const formatted = formatValue(value, col.format);
      // Escape CSV values
      if (typeof formatted === 'string' && (formatted.includes(',') || formatted.includes('"'))) {
        return `"${formatted.replace(/"/g, '""')}"`;
      }
      return formatted;
    }).join(',')
  ).join('\n');

  return `${headers}\n${rows}`;
}

export function formatReportAsHTML(data: ReportData, template: ReportTemplate): string {
  const style = template.styling;

  const headerStyle = style.headerColor ? `background-color: ${style.headerColor};` : '';
  const accentStyle = style.accentColor ? `color: ${style.accentColor};` : '';

  let html = `<!DOCTYPE html>
<html>
<head>
  <title>${template.name}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { ${accentStyle} }
    table { border-collapse: collapse; width: 100%; }
    th { ${headerStyle} padding: 10px; text-align: left; border: 1px solid #ddd; }
    td { padding: 8px; border: 1px solid #ddd; }
    tr:nth-child(even) { background-color: #f9f9f9; }
    .summary { margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 5px; }
    .footer { margin-top: 20px; font-size: 12px; color: #666; }
    ${style.customCss ?? ''}
  </style>
</head>
<body>`;

  if (style.showLogo && style.logoUrl) {
    html += `<img src="${style.logoUrl}" alt="Logo" style="max-height: 50px;" />`;
  }

  html += `<h1>${template.name}</h1>
  <p>${template.description}</p>`;

  // Summary section
  if (Object.keys(data.summary).length > 0) {
    html += `<div class="summary"><h3>Summary</h3>`;
    for (const [key, value] of Object.entries(data.summary)) {
      html += `<p><strong>${key}:</strong> ${value}</p>`;
    }
    html += `</div>`;
  }

  // Data table
  html += `<table><thead><tr>`;
  for (const col of data.columns) {
    html += `<th>${col.header}</th>`;
  }
  html += `</tr></thead><tbody>`;

  for (const row of data.rows) {
    html += `<tr>`;
    for (const col of data.columns) {
      const value = formatValue(row[col.field], col.format);
      html += `<td>${value}</td>`;
    }
    html += `</tr>`;
  }

  html += `</tbody></table>`;

  if (style.includeGeneratedDate) {
    html += `<div class="footer">Generated: ${data.generatedAt.toISOString()}</div>`;
  }

  html += `</body></html>`;

  return html;
}

function formatValue(value: unknown, format?: ColumnFormat): string {
  if (value === null || value === undefined) return '';

  if (!format) return String(value);

  switch (format.type) {
    case 'date':
      if (value instanceof Date) {
        return value.toLocaleDateString();
      }
      return new Date(String(value)).toLocaleDateString();

    case 'number':
      const num = Number(value);
      return format.decimalPlaces !== undefined
        ? num.toFixed(format.decimalPlaces)
        : String(num);

    case 'currency':
      const amount = Number(value);
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: format.currencyCode ?? 'USD',
      }).format(amount);

    case 'percentage':
      return `${Number(value).toFixed(format.decimalPlaces ?? 1)}%`;

    case 'boolean':
      return value ? 'Yes' : 'No';

    case 'status':
    case 'severity':
      return String(value).replace(/_/g, ' ').toUpperCase();

    default:
      return String(value);
  }
}

// ==========================================================================
// REPORT SUMMARY
// ==========================================================================

export interface ReportSummary {
  totalTemplates: number;
  byType: Record<CustomReportType, number>;
  scheduledReports: number;
  recentReports: number;
  mostUsedTemplates: Array<{ templateId: string; name: string; usageCount: number }>;
}

export function calculateReportSummary(
  templates: ReportTemplate[],
  instances: ReportInstance[]
): ReportSummary {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const byType: Record<CustomReportType, number> = {
    risk_register: 0,
    control_matrix: 0,
    issue_summary: 0,
    sox_status: 0,
    audit_findings: 0,
    remediation_tracker: 0,
    executive_dashboard: 0,
    regulatory_compliance: 0,
    custom: 0,
  };

  for (const template of templates) {
    byType[template.type]++;
  }

  const usageCounts = new Map<string, number>();
  for (const instance of instances) {
    const count = usageCounts.get(instance.templateId) ?? 0;
    usageCounts.set(instance.templateId, count + 1);
  }

  const mostUsed = Array.from(usageCounts.entries())
    .map(([templateId, count]) => {
      const template = templates.find(t => t.id === templateId);
      return {
        templateId,
        name: template?.name ?? 'Unknown',
        usageCount: count,
      };
    })
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 5);

  return {
    totalTemplates: templates.length,
    byType,
    scheduledReports: templates.filter(t => t.schedule !== 'on_demand').length,
    recentReports: instances.filter(i => i.generatedAt >= sevenDaysAgo).length,
    mostUsedTemplates: mostUsed,
  };
}
