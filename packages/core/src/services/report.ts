// ==========================================================================
// REPORT SERVICE
// Regulatory and compliance report generation
// ==========================================================================

import { randomUUID } from '../utils/crypto.js';
import type { Ledger, LedgerSummary } from '../entities/ledger.js';
import type { AuditPackage } from '../entities/audit-package.js';
import type { VerificationSummary } from '../entities/verification.js';

export type ReportType = 'integrity' | 'audit' | 'compliance' | 'activity';
export type ReportFormat = 'json' | 'csv' | 'pdf';

export interface ReportConfig {
  type: ReportType;
  format: ReportFormat;
  startDate: Date;
  endDate: Date;
  ledgerIds?: string[];
  includeProofs?: boolean;
}

export interface ReportOutput {
  id: string;
  type: ReportType;
  format: ReportFormat;
  filename: string;
  content: string;
  mimeType: string;
  generatedAt: Date;
  period: {
    start: Date;
    end: Date;
  };
}

export interface IntegrityReportData {
  period: { start: string; end: string };
  ledgerSummaries: LedgerSummary[];
  verificationSummary: VerificationSummary;
  integrityScore: number;
  alerts: number;
}

export interface ActivityReportData {
  period: { start: string; end: string };
  totalTransactions: number;
  transactionsByType: Record<string, number>;
  transactionsByLedger: Record<string, number>;
  peakActivity: { date: string; count: number };
}

export class ReportService {
  /**
   * Generate an integrity report
   */
  generateIntegrityReport(
    config: ReportConfig,
    data: IntegrityReportData
  ): ReportOutput {
    const content = this.formatReport(config.format, {
      reportType: 'Integrity Report',
      generatedAt: new Date().toISOString(),
      ...data,
    });

    return {
      id: randomUUID(),
      type: 'integrity',
      format: config.format,
      filename: this.generateFilename('integrity', config),
      content,
      mimeType: this.getMimeType(config.format),
      generatedAt: new Date(),
      period: {
        start: config.startDate,
        end: config.endDate,
      },
    };
  }

  /**
   * Generate an activity report
   */
  generateActivityReport(
    config: ReportConfig,
    data: ActivityReportData
  ): ReportOutput {
    const content = this.formatReport(config.format, {
      reportType: 'Activity Report',
      generatedAt: new Date().toISOString(),
      ...data,
    });

    return {
      id: randomUUID(),
      type: 'activity',
      format: config.format,
      filename: this.generateFilename('activity', config),
      content,
      mimeType: this.getMimeType(config.format),
      generatedAt: new Date(),
      period: {
        start: config.startDate,
        end: config.endDate,
      },
    };
  }

  /**
   * Generate an audit summary report
   */
  generateAuditSummaryReport(
    config: ReportConfig,
    packages: AuditPackage[]
  ): ReportOutput {
    const data = {
      reportType: 'Audit Summary Report',
      generatedAt: new Date().toISOString(),
      period: {
        start: config.startDate.toISOString(),
        end: config.endDate.toISOString(),
      },
      totalPackages: packages.length,
      packages: packages.map((pkg) => ({
        id: pkg.id,
        name: pkg.name,
        ledgerId: pkg.ledgerId,
        transactionCount: pkg.transactionCount,
        status: pkg.status,
        generatedAt: pkg.generatedAt.toISOString(),
      })),
    };

    const content = this.formatReport(config.format, data);

    return {
      id: randomUUID(),
      type: 'audit',
      format: config.format,
      filename: this.generateFilename('audit-summary', config),
      content,
      mimeType: this.getMimeType(config.format),
      generatedAt: new Date(),
      period: {
        start: config.startDate,
        end: config.endDate,
      },
    };
  }

  private formatReport(format: ReportFormat, data: Record<string, unknown>): string {
    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'csv':
        return this.toCSV(data);
      case 'pdf':
        // PDF generation would require a library like pdfkit
        // For now, return JSON with a note
        return JSON.stringify({ ...data, _note: 'PDF generation pending' }, null, 2);
      default:
        return JSON.stringify(data, null, 2);
    }
  }

  private toCSV(data: Record<string, unknown>): string {
    const lines: string[] = [];

    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value)) {
        if (value.length > 0 && typeof value[0] === 'object') {
          // Array of objects - create header row
          const headers = Object.keys(value[0] as object);
          lines.push(headers.join(','));
          for (const item of value) {
            const row = headers.map((h) => String((item as Record<string, unknown>)[h] ?? ''));
            lines.push(row.join(','));
          }
        }
      } else if (typeof value !== 'object') {
        lines.push(`${key},${String(value)}`);
      }
    }

    return lines.join('\n');
  }

  private generateFilename(type: string, config: ReportConfig): string {
    const start = config.startDate.toISOString().split('T')[0];
    const end = config.endDate.toISOString().split('T')[0];
    const ext = config.format === 'pdf' ? 'pdf' : config.format === 'csv' ? 'csv' : 'json';
    return `veilvault-${type}-${start}-to-${end}.${ext}`;
  }

  private getMimeType(format: ReportFormat): string {
    switch (format) {
      case 'json':
        return 'application/json';
      case 'csv':
        return 'text/csv';
      case 'pdf':
        return 'application/pdf';
      default:
        return 'application/octet-stream';
    }
  }
}

export function createReportService(): ReportService {
  return new ReportService();
}
