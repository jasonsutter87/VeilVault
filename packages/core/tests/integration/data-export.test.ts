import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Data Export and Import Tests
 *
 * Comprehensive tests for data export/import functionality
 * including format validation, integrity verification, and compliance.
 */

interface ExportConfig {
  format: 'csv' | 'json' | 'xml' | 'xlsx';
  includeHeaders: boolean;
  dateFormat: string;
  numberFormat: 'decimal' | 'accounting';
  encoding: 'utf-8' | 'utf-16' | 'ascii';
  delimiter?: string;
  includeMetadata: boolean;
}

interface ExportResult {
  success: boolean;
  data?: string;
  filename?: string;
  recordCount: number;
  checksum: string;
  exportedAt: Date;
  config: ExportConfig;
  errors?: string[];
}

interface ImportResult {
  success: boolean;
  recordsImported: number;
  recordsSkipped: number;
  errors: Array<{
    row: number;
    field: string;
    message: string;
  }>;
  warnings: string[];
}

// Mock data exporter
class DataExporter {
  private config: ExportConfig;

  constructor(config: Partial<ExportConfig> = {}) {
    this.config = {
      format: config.format || 'csv',
      includeHeaders: config.includeHeaders ?? true,
      dateFormat: config.dateFormat || 'YYYY-MM-DD',
      numberFormat: config.numberFormat || 'decimal',
      encoding: config.encoding || 'utf-8',
      delimiter: config.delimiter || ',',
      includeMetadata: config.includeMetadata ?? false,
    };
  }

  exportToCsv<T extends Record<string, unknown>>(data: T[], columns: string[]): ExportResult {
    try {
      const lines: string[] = [];

      // Header
      if (this.config.includeHeaders) {
        lines.push(columns.join(this.config.delimiter));
      }

      // Data rows
      data.forEach(row => {
        const values = columns.map(col => {
          const value = row[col];
          return this.formatValue(value);
        });
        lines.push(values.join(this.config.delimiter));
      });

      const csvData = lines.join('\n');

      return {
        success: true,
        data: csvData,
        filename: `export_${Date.now()}.csv`,
        recordCount: data.length,
        checksum: this.computeChecksum(csvData),
        exportedAt: new Date(),
        config: this.config,
      };
    } catch (error) {
      return {
        success: false,
        recordCount: 0,
        checksum: '',
        exportedAt: new Date(),
        config: this.config,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  exportToJson<T extends Record<string, unknown>>(data: T[], options: { pretty?: boolean } = {}): ExportResult {
    try {
      const exportData = this.config.includeMetadata
        ? {
            metadata: {
              exportedAt: new Date().toISOString(),
              recordCount: data.length,
              format: 'json',
            },
            records: data,
          }
        : data;

      const jsonData = options.pretty
        ? JSON.stringify(exportData, null, 2)
        : JSON.stringify(exportData);

      return {
        success: true,
        data: jsonData,
        filename: `export_${Date.now()}.json`,
        recordCount: data.length,
        checksum: this.computeChecksum(jsonData),
        exportedAt: new Date(),
        config: this.config,
      };
    } catch (error) {
      return {
        success: false,
        recordCount: 0,
        checksum: '',
        exportedAt: new Date(),
        config: this.config,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  private formatValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (value instanceof Date) {
      return this.formatDate(value);
    }

    if (typeof value === 'number') {
      return this.formatNumber(value);
    }

    if (typeof value === 'string') {
      // Escape quotes and wrap in quotes if contains delimiter
      const escaped = value.replace(/"/g, '""');
      if (escaped.includes(this.config.delimiter!) || escaped.includes('\n')) {
        return `"${escaped}"`;
      }
      return escaped;
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    switch (this.config.dateFormat) {
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
      case 'MM/DD/YYYY':
        return `${month}/${day}/${year}`;
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`;
      default:
        return date.toISOString();
    }
  }

  private formatNumber(value: number): string {
    if (this.config.numberFormat === 'accounting') {
      return value < 0
        ? `(${Math.abs(value).toFixed(2)})`
        : value.toFixed(2);
    }
    return value.toString();
  }

  private computeChecksum(data: string): string {
    // Simple checksum for testing
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
}

// Mock data importer
class DataImporter {
  private validationRules: Map<string, (value: string) => boolean> = new Map();

  addValidationRule(field: string, rule: (value: string) => boolean): void {
    this.validationRules.set(field, rule);
  }

  importFromCsv(csvData: string, options: {
    hasHeaders?: boolean;
    delimiter?: string;
    expectedColumns?: string[];
  } = {}): ImportResult {
    const {
      hasHeaders = true,
      delimiter = ',',
      expectedColumns = [],
    } = options;

    const errors: ImportResult['errors'] = [];
    const warnings: string[] = [];
    let recordsImported = 0;
    let recordsSkipped = 0;

    const lines = csvData.split('\n').filter(line => line.trim());

    if (lines.length === 0) {
      return {
        success: false,
        recordsImported: 0,
        recordsSkipped: 0,
        errors: [{ row: 0, field: '', message: 'Empty file' }],
        warnings: [],
      };
    }

    let headers: string[] = [];
    let dataStartIndex = 0;

    if (hasHeaders) {
      headers = this.parseCsvLine(lines[0], delimiter);
      dataStartIndex = 1;

      // Validate expected columns
      if (expectedColumns.length > 0) {
        const missingColumns = expectedColumns.filter(col => !headers.includes(col));
        if (missingColumns.length > 0) {
          errors.push({
            row: 0,
            field: 'headers',
            message: `Missing required columns: ${missingColumns.join(', ')}`,
          });
        }
      }
    }

    for (let i = dataStartIndex; i < lines.length; i++) {
      const rowNumber = i + 1;
      const values = this.parseCsvLine(lines[i], delimiter);

      // Validate row
      let rowValid = true;

      if (hasHeaders && values.length !== headers.length) {
        errors.push({
          row: rowNumber,
          field: '',
          message: `Expected ${headers.length} columns, got ${values.length}`,
        });
        rowValid = false;
      }

      // Field validation
      if (hasHeaders) {
        headers.forEach((header, colIndex) => {
          const value = values[colIndex] || '';
          const rule = this.validationRules.get(header);
          if (rule && !rule(value)) {
            errors.push({
              row: rowNumber,
              field: header,
              message: `Invalid value for ${header}: "${value}"`,
            });
            rowValid = false;
          }
        });
      }

      if (rowValid) {
        recordsImported++;
      } else {
        recordsSkipped++;
      }
    }

    return {
      success: errors.length === 0,
      recordsImported,
      recordsSkipped,
      errors,
      warnings,
    };
  }

  importFromJson(jsonData: string, options: {
    schema?: Record<string, 'string' | 'number' | 'boolean' | 'date'>;
  } = {}): ImportResult {
    const errors: ImportResult['errors'] = [];
    const warnings: string[] = [];

    try {
      const data = JSON.parse(jsonData);
      const records = Array.isArray(data) ? data : (data.records || []);

      if (!Array.isArray(records)) {
        return {
          success: false,
          recordsImported: 0,
          recordsSkipped: 0,
          errors: [{ row: 0, field: '', message: 'Invalid JSON structure: expected array' }],
          warnings: [],
        };
      }

      let recordsImported = 0;
      let recordsSkipped = 0;

      records.forEach((record, index) => {
        let recordValid = true;

        if (options.schema) {
          Object.entries(options.schema).forEach(([field, expectedType]) => {
            const value = record[field];
            const actualType = typeof value;

            if (expectedType === 'date') {
              if (typeof value !== 'string' || isNaN(Date.parse(value))) {
                errors.push({
                  row: index + 1,
                  field,
                  message: `Expected date, got ${actualType}`,
                });
                recordValid = false;
              }
            } else if (actualType !== expectedType && value !== null && value !== undefined) {
              errors.push({
                row: index + 1,
                field,
                message: `Expected ${expectedType}, got ${actualType}`,
              });
              recordValid = false;
            }
          });
        }

        if (recordValid) {
          recordsImported++;
        } else {
          recordsSkipped++;
        }
      });

      return {
        success: errors.length === 0,
        recordsImported,
        recordsSkipped,
        errors,
        warnings,
      };
    } catch (error) {
      return {
        success: false,
        recordsImported: 0,
        recordsSkipped: 0,
        errors: [{ row: 0, field: '', message: `JSON parse error: ${error}` }],
        warnings: [],
      };
    }
  }

  private parseCsvLine(line: string, delimiter: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    values.push(current);
    return values;
  }
}

describe('Data Export', () => {
  let exporter: DataExporter;

  const testData = [
    { id: 1, name: 'John Doe', amount: 1000.50, date: new Date('2024-01-15'), active: true },
    { id: 2, name: 'Jane Smith', amount: -250.75, date: new Date('2024-02-20'), active: false },
    { id: 3, name: 'Bob Wilson', amount: 500.00, date: new Date('2024-03-10'), active: true },
  ];

  beforeEach(() => {
    exporter = new DataExporter();
  });

  describe('CSV Export', () => {
    it('should export data to CSV format', () => {
      const result = exporter.exportToCsv(testData, ['id', 'name', 'amount']);

      expect(result.success).toBe(true);
      expect(result.data).toContain('id,name,amount');
      expect(result.recordCount).toBe(3);
    });

    it('should include headers when configured', () => {
      const exporterWithHeaders = new DataExporter({ includeHeaders: true });
      const result = exporterWithHeaders.exportToCsv(testData, ['id', 'name']);

      const lines = result.data!.split('\n');
      expect(lines[0]).toBe('id,name');
    });

    it('should exclude headers when configured', () => {
      const exporterNoHeaders = new DataExporter({ includeHeaders: false });
      const result = exporterNoHeaders.exportToCsv(testData, ['id', 'name']);

      const lines = result.data!.split('\n');
      expect(lines[0]).not.toContain('id,name');
      expect(lines[0]).toContain('1');
    });

    it('should use custom delimiter', () => {
      const exporterSemicolon = new DataExporter({ delimiter: ';' });
      const result = exporterSemicolon.exportToCsv(testData, ['id', 'name']);

      expect(result.data).toContain('id;name');
    });

    it('should escape values with delimiters', () => {
      const dataWithCommas = [
        { id: 1, name: 'Doe, John', description: 'Test value' },
      ];

      const result = exporter.exportToCsv(dataWithCommas, ['id', 'name', 'description']);

      expect(result.data).toContain('"Doe, John"');
    });

    it('should escape values with quotes', () => {
      const dataWithQuotes = [
        { id: 1, name: 'John "JD" Doe', description: 'Test' },
      ];

      const result = exporter.exportToCsv(dataWithQuotes, ['id', 'name']);

      expect(result.data).toContain('""JD""');
    });

    it('should format dates correctly', () => {
      const exporterDateFormat = new DataExporter({ dateFormat: 'YYYY-MM-DD' });
      const result = exporterDateFormat.exportToCsv(testData, ['id', 'date']);

      expect(result.data).toContain('2024-01-15');
    });

    it('should format dates in different formats', () => {
      const exporterUSDate = new DataExporter({ dateFormat: 'MM/DD/YYYY' });
      const result = exporterUSDate.exportToCsv(testData, ['id', 'date']);

      expect(result.data).toContain('01/15/2024');
    });

    it('should format numbers in decimal format', () => {
      const result = exporter.exportToCsv(testData, ['id', 'amount']);

      expect(result.data).toContain('1000.5');
      expect(result.data).toContain('-250.75');
    });

    it('should format numbers in accounting format', () => {
      const exporterAccounting = new DataExporter({ numberFormat: 'accounting' });
      const result = exporterAccounting.exportToCsv(testData, ['id', 'amount']);

      expect(result.data).toContain('1000.50');
      expect(result.data).toContain('(250.75)');
    });

    it('should handle null and undefined values', () => {
      const dataWithNulls = [
        { id: 1, name: null, description: undefined },
      ];

      const result = exporter.exportToCsv(dataWithNulls, ['id', 'name', 'description']);

      expect(result.success).toBe(true);
      expect(result.data).toContain('1,,');
    });

    it('should generate checksum', () => {
      const result = exporter.exportToCsv(testData, ['id', 'name']);

      expect(result.checksum).toBeDefined();
      expect(result.checksum.length).toBeGreaterThan(0);
    });

    it('should generate consistent checksum for same data', () => {
      const result1 = exporter.exportToCsv(testData, ['id', 'name']);
      const result2 = exporter.exportToCsv(testData, ['id', 'name']);

      expect(result1.checksum).toBe(result2.checksum);
    });
  });

  describe('JSON Export', () => {
    it('should export data to JSON format', () => {
      const result = exporter.exportToJson(testData);

      expect(result.success).toBe(true);
      expect(result.recordCount).toBe(3);
    });

    it('should produce valid JSON', () => {
      const result = exporter.exportToJson(testData);

      expect(() => JSON.parse(result.data!)).not.toThrow();
    });

    it('should pretty print when requested', () => {
      const result = exporter.exportToJson(testData, { pretty: true });

      expect(result.data).toContain('\n');
      expect(result.data).toContain('  ');
    });

    it('should include metadata when configured', () => {
      const exporterWithMeta = new DataExporter({ includeMetadata: true });
      const result = exporterWithMeta.exportToJson(testData);

      const parsed = JSON.parse(result.data!);
      expect(parsed.metadata).toBeDefined();
      expect(parsed.metadata.recordCount).toBe(3);
      expect(parsed.records).toHaveLength(3);
    });

    it('should handle nested objects', () => {
      const nestedData = [
        { id: 1, details: { name: 'Test', values: [1, 2, 3] } },
      ];

      const result = exporter.exportToJson(nestedData);

      expect(result.success).toBe(true);
      const parsed = JSON.parse(result.data!);
      expect(parsed[0].details.name).toBe('Test');
    });
  });
});

describe('Data Import', () => {
  let importer: DataImporter;

  beforeEach(() => {
    importer = new DataImporter();
  });

  describe('CSV Import', () => {
    it('should import valid CSV data', () => {
      const csvData = 'id,name,amount\n1,John,1000\n2,Jane,2000';
      const result = importer.importFromCsv(csvData);

      expect(result.success).toBe(true);
      expect(result.recordsImported).toBe(2);
      expect(result.recordsSkipped).toBe(0);
    });

    it('should handle CSV without headers', () => {
      const csvData = '1,John,1000\n2,Jane,2000';
      const result = importer.importFromCsv(csvData, { hasHeaders: false });

      expect(result.success).toBe(true);
      expect(result.recordsImported).toBe(2);
    });

    it('should detect missing required columns', () => {
      const csvData = 'id,name\n1,John\n2,Jane';
      const result = importer.importFromCsv(csvData, {
        expectedColumns: ['id', 'name', 'amount'],
      });

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.message.includes('Missing'))).toBe(true);
    });

    it('should detect column count mismatch', () => {
      const csvData = 'id,name,amount\n1,John\n2,Jane,2000,extra';
      const result = importer.importFromCsv(csvData);

      expect(result.success).toBe(false);
      expect(result.recordsSkipped).toBe(2);
    });

    it('should validate fields with custom rules', () => {
      importer.addValidationRule('amount', (value) => {
        const num = parseFloat(value);
        return !isNaN(num) && num >= 0;
      });

      const csvData = 'id,amount\n1,1000\n2,-500\n3,abc';
      const result = importer.importFromCsv(csvData);

      expect(result.recordsImported).toBe(1);
      expect(result.recordsSkipped).toBe(2);
    });

    it('should handle custom delimiter', () => {
      const csvData = 'id;name;amount\n1;John;1000\n2;Jane;2000';
      const result = importer.importFromCsv(csvData, { delimiter: ';' });

      expect(result.success).toBe(true);
      expect(result.recordsImported).toBe(2);
    });

    it('should handle quoted values', () => {
      const csvData = 'id,name,description\n1,"Doe, John","Test value"\n2,Jane,Simple';
      const result = importer.importFromCsv(csvData);

      expect(result.success).toBe(true);
      expect(result.recordsImported).toBe(2);
    });

    it('should handle escaped quotes', () => {
      const csvData = 'id,name\n1,"John ""JD"" Doe"\n2,Jane';
      const result = importer.importFromCsv(csvData);

      expect(result.success).toBe(true);
      expect(result.recordsImported).toBe(2);
    });

    it('should reject empty file', () => {
      const result = importer.importFromCsv('');

      expect(result.success).toBe(false);
      expect(result.errors[0].message).toContain('Empty');
    });

    it('should track row numbers in errors', () => {
      importer.addValidationRule('amount', (value) => parseFloat(value) >= 0);

      const csvData = 'id,amount\n1,100\n2,-50\n3,200';
      const result = importer.importFromCsv(csvData);

      expect(result.errors.length).toBe(1);
      expect(result.errors[0].row).toBe(3); // Row 3 (1-indexed, after header)
    });
  });

  describe('JSON Import', () => {
    it('should import valid JSON array', () => {
      const jsonData = JSON.stringify([
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' },
      ]);

      const result = importer.importFromJson(jsonData);

      expect(result.success).toBe(true);
      expect(result.recordsImported).toBe(2);
    });

    it('should import JSON with records wrapper', () => {
      const jsonData = JSON.stringify({
        metadata: { count: 2 },
        records: [
          { id: 1, name: 'John' },
          { id: 2, name: 'Jane' },
        ],
      });

      const result = importer.importFromJson(jsonData);

      expect(result.success).toBe(true);
      expect(result.recordsImported).toBe(2);
    });

    it('should validate schema types', () => {
      const jsonData = JSON.stringify([
        { id: 1, name: 'John', amount: 1000 },
        { id: 'two', name: 123, amount: 'abc' },
      ]);

      const result = importer.importFromJson(jsonData, {
        schema: {
          id: 'number',
          name: 'string',
          amount: 'number',
        },
      });

      expect(result.recordsImported).toBe(1);
      expect(result.recordsSkipped).toBe(1);
    });

    it('should validate date fields', () => {
      const jsonData = JSON.stringify([
        { id: 1, date: '2024-01-15' },
        { id: 2, date: 'not-a-date' },
      ]);

      const result = importer.importFromJson(jsonData, {
        schema: { date: 'date' },
      });

      expect(result.recordsImported).toBe(1);
      expect(result.recordsSkipped).toBe(1);
    });

    it('should reject invalid JSON', () => {
      const result = importer.importFromJson('{ invalid json }');

      expect(result.success).toBe(false);
      expect(result.errors[0].message).toContain('parse error');
    });

    it('should reject non-array structure', () => {
      const jsonData = JSON.stringify({ single: 'object' });

      const result = importer.importFromJson(jsonData);

      expect(result.success).toBe(false);
      expect(result.errors[0].message).toContain('expected array');
    });
  });
});

describe('Export/Import Round Trip', () => {
  it('should preserve data through CSV export/import', () => {
    const originalData = [
      { id: 1, name: 'John Doe', amount: 1000 },
      { id: 2, name: 'Jane Smith', amount: 2000 },
    ];

    const exporter = new DataExporter();
    const importer = new DataImporter();

    const exported = exporter.exportToCsv(originalData, ['id', 'name', 'amount']);
    const imported = importer.importFromCsv(exported.data!);

    expect(exported.recordCount).toBe(imported.recordsImported);
  });

  it('should preserve data through JSON export/import', () => {
    const originalData = [
      { id: 1, name: 'John', nested: { value: 123 } },
      { id: 2, name: 'Jane', nested: { value: 456 } },
    ];

    const exporter = new DataExporter();
    const importer = new DataImporter();

    const exported = exporter.exportToJson(originalData);
    const imported = importer.importFromJson(exported.data!);

    expect(exported.recordCount).toBe(imported.recordsImported);
  });
});
