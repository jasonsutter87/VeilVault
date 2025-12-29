import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Entity Validation Tests
 *
 * Comprehensive tests for validating all domain entities
 * used in banking/audit applications.
 */

// Validation result type
interface ValidationResult {
  valid: boolean;
  errors: Array<{ field: string; message: string; code: string }>;
}

// Mock validator class
class EntityValidator {
  // User validation
  validateUser(user: Record<string, unknown>): ValidationResult {
    const errors: ValidationResult['errors'] = [];

    // Email validation
    if (!user.email) {
      errors.push({ field: 'email', message: 'Email is required', code: 'REQUIRED' });
    } else if (typeof user.email !== 'string') {
      errors.push({ field: 'email', message: 'Email must be a string', code: 'TYPE_ERROR' });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
      errors.push({ field: 'email', message: 'Invalid email format', code: 'INVALID_FORMAT' });
    }

    // Name validation
    if (!user.name) {
      errors.push({ field: 'name', message: 'Name is required', code: 'REQUIRED' });
    } else if (typeof user.name !== 'string') {
      errors.push({ field: 'name', message: 'Name must be a string', code: 'TYPE_ERROR' });
    } else if (user.name.length < 2) {
      errors.push({ field: 'name', message: 'Name must be at least 2 characters', code: 'MIN_LENGTH' });
    } else if (user.name.length > 100) {
      errors.push({ field: 'name', message: 'Name must not exceed 100 characters', code: 'MAX_LENGTH' });
    }

    // Role validation
    const validRoles = ['admin', 'auditor', 'reviewer', 'viewer', 'control_owner'];
    if (!user.role) {
      errors.push({ field: 'role', message: 'Role is required', code: 'REQUIRED' });
    } else if (!validRoles.includes(user.role as string)) {
      errors.push({ field: 'role', message: 'Invalid role', code: 'INVALID_ENUM' });
    }

    // Organization validation
    if (user.organizationId && typeof user.organizationId !== 'string') {
      errors.push({ field: 'organizationId', message: 'Organization ID must be a string', code: 'TYPE_ERROR' });
    }

    return { valid: errors.length === 0, errors };
  }

  // Control validation
  validateControl(control: Record<string, unknown>): ValidationResult {
    const errors: ValidationResult['errors'] = [];

    // Name
    if (!control.name) {
      errors.push({ field: 'name', message: 'Control name is required', code: 'REQUIRED' });
    } else if (typeof control.name !== 'string') {
      errors.push({ field: 'name', message: 'Control name must be a string', code: 'TYPE_ERROR' });
    } else if (control.name.length < 3) {
      errors.push({ field: 'name', message: 'Control name must be at least 3 characters', code: 'MIN_LENGTH' });
    } else if (control.name.length > 200) {
      errors.push({ field: 'name', message: 'Control name must not exceed 200 characters', code: 'MAX_LENGTH' });
    }

    // Control ID format
    if (!control.controlId) {
      errors.push({ field: 'controlId', message: 'Control ID is required', code: 'REQUIRED' });
    } else if (typeof control.controlId !== 'string') {
      errors.push({ field: 'controlId', message: 'Control ID must be a string', code: 'TYPE_ERROR' });
    } else if (!/^[A-Z]{2,4}-\d{3,5}$/.test(control.controlId as string)) {
      errors.push({ field: 'controlId', message: 'Control ID must match format XX-NNN (e.g., SOX-101)', code: 'INVALID_FORMAT' });
    }

    // Type validation
    const validTypes = ['preventive', 'detective', 'corrective', 'directive'];
    if (!control.type) {
      errors.push({ field: 'type', message: 'Control type is required', code: 'REQUIRED' });
    } else if (!validTypes.includes(control.type as string)) {
      errors.push({ field: 'type', message: 'Invalid control type', code: 'INVALID_ENUM' });
    }

    // Frequency validation
    const validFrequencies = ['continuous', 'daily', 'weekly', 'monthly', 'quarterly', 'annually', 'ad-hoc'];
    if (!control.frequency) {
      errors.push({ field: 'frequency', message: 'Control frequency is required', code: 'REQUIRED' });
    } else if (!validFrequencies.includes(control.frequency as string)) {
      errors.push({ field: 'frequency', message: 'Invalid control frequency', code: 'INVALID_ENUM' });
    }

    // Owner validation
    if (!control.ownerId) {
      errors.push({ field: 'ownerId', message: 'Control owner is required', code: 'REQUIRED' });
    }

    // Effectiveness rating
    if (control.effectivenessRating !== undefined) {
      const rating = control.effectivenessRating as string;
      const validRatings = ['effective', 'partially_effective', 'ineffective', 'not_tested'];
      if (!validRatings.includes(rating)) {
        errors.push({ field: 'effectivenessRating', message: 'Invalid effectiveness rating', code: 'INVALID_ENUM' });
      }
    }

    // SOX relevance
    if (control.soxRelevant !== undefined && typeof control.soxRelevant !== 'boolean') {
      errors.push({ field: 'soxRelevant', message: 'SOX relevance must be a boolean', code: 'TYPE_ERROR' });
    }

    return { valid: errors.length === 0, errors };
  }

  // Risk validation
  validateRisk(risk: Record<string, unknown>): ValidationResult {
    const errors: ValidationResult['errors'] = [];

    // Title
    if (!risk.title) {
      errors.push({ field: 'title', message: 'Risk title is required', code: 'REQUIRED' });
    } else if (typeof risk.title !== 'string') {
      errors.push({ field: 'title', message: 'Risk title must be a string', code: 'TYPE_ERROR' });
    } else if (risk.title.length < 5) {
      errors.push({ field: 'title', message: 'Risk title must be at least 5 characters', code: 'MIN_LENGTH' });
    }

    // Category
    const validCategories = ['operational', 'financial', 'compliance', 'strategic', 'reputational', 'technology', 'legal'];
    if (!risk.category) {
      errors.push({ field: 'category', message: 'Risk category is required', code: 'REQUIRED' });
    } else if (!validCategories.includes(risk.category as string)) {
      errors.push({ field: 'category', message: 'Invalid risk category', code: 'INVALID_ENUM' });
    }

    // Likelihood (1-5)
    if (risk.likelihood === undefined) {
      errors.push({ field: 'likelihood', message: 'Likelihood is required', code: 'REQUIRED' });
    } else if (typeof risk.likelihood !== 'number') {
      errors.push({ field: 'likelihood', message: 'Likelihood must be a number', code: 'TYPE_ERROR' });
    } else if (risk.likelihood < 1 || risk.likelihood > 5) {
      errors.push({ field: 'likelihood', message: 'Likelihood must be between 1 and 5', code: 'OUT_OF_RANGE' });
    } else if (!Number.isInteger(risk.likelihood)) {
      errors.push({ field: 'likelihood', message: 'Likelihood must be an integer', code: 'TYPE_ERROR' });
    }

    // Impact (1-5)
    if (risk.impact === undefined) {
      errors.push({ field: 'impact', message: 'Impact is required', code: 'REQUIRED' });
    } else if (typeof risk.impact !== 'number') {
      errors.push({ field: 'impact', message: 'Impact must be a number', code: 'TYPE_ERROR' });
    } else if (risk.impact < 1 || risk.impact > 5) {
      errors.push({ field: 'impact', message: 'Impact must be between 1 and 5', code: 'OUT_OF_RANGE' });
    } else if (!Number.isInteger(risk.impact)) {
      errors.push({ field: 'impact', message: 'Impact must be an integer', code: 'TYPE_ERROR' });
    }

    // Status
    const validStatuses = ['identified', 'assessed', 'mitigated', 'accepted', 'closed'];
    if (!risk.status) {
      errors.push({ field: 'status', message: 'Risk status is required', code: 'REQUIRED' });
    } else if (!validStatuses.includes(risk.status as string)) {
      errors.push({ field: 'status', message: 'Invalid risk status', code: 'INVALID_ENUM' });
    }

    return { valid: errors.length === 0, errors };
  }

  // Audit validation
  validateAudit(audit: Record<string, unknown>): ValidationResult {
    const errors: ValidationResult['errors'] = [];

    // Name
    if (!audit.name) {
      errors.push({ field: 'name', message: 'Audit name is required', code: 'REQUIRED' });
    } else if (typeof audit.name !== 'string') {
      errors.push({ field: 'name', message: 'Audit name must be a string', code: 'TYPE_ERROR' });
    }

    // Type
    const validTypes = ['internal', 'external', 'sox', 'compliance', 'operational', 'financial', 'it'];
    if (!audit.type) {
      errors.push({ field: 'type', message: 'Audit type is required', code: 'REQUIRED' });
    } else if (!validTypes.includes(audit.type as string)) {
      errors.push({ field: 'type', message: 'Invalid audit type', code: 'INVALID_ENUM' });
    }

    // Status
    const validStatuses = ['planned', 'in_progress', 'review', 'completed', 'cancelled'];
    if (!audit.status) {
      errors.push({ field: 'status', message: 'Audit status is required', code: 'REQUIRED' });
    } else if (!validStatuses.includes(audit.status as string)) {
      errors.push({ field: 'status', message: 'Invalid audit status', code: 'INVALID_ENUM' });
    }

    // Start date
    if (!audit.startDate) {
      errors.push({ field: 'startDate', message: 'Start date is required', code: 'REQUIRED' });
    } else if (!(audit.startDate instanceof Date) && isNaN(Date.parse(audit.startDate as string))) {
      errors.push({ field: 'startDate', message: 'Invalid start date format', code: 'INVALID_FORMAT' });
    }

    // End date
    if (audit.endDate) {
      if (!(audit.endDate instanceof Date) && isNaN(Date.parse(audit.endDate as string))) {
        errors.push({ field: 'endDate', message: 'Invalid end date format', code: 'INVALID_FORMAT' });
      } else if (audit.startDate) {
        const start = new Date(audit.startDate as string);
        const end = new Date(audit.endDate as string);
        if (end < start) {
          errors.push({ field: 'endDate', message: 'End date must be after start date', code: 'INVALID_RANGE' });
        }
      }
    }

    // Lead auditor
    if (!audit.leadAuditorId) {
      errors.push({ field: 'leadAuditorId', message: 'Lead auditor is required', code: 'REQUIRED' });
    }

    return { valid: errors.length === 0, errors };
  }

  // Workpaper validation
  validateWorkpaper(workpaper: Record<string, unknown>): ValidationResult {
    const errors: ValidationResult['errors'] = [];

    // Reference number
    if (!workpaper.reference) {
      errors.push({ field: 'reference', message: 'Reference number is required', code: 'REQUIRED' });
    } else if (typeof workpaper.reference !== 'string') {
      errors.push({ field: 'reference', message: 'Reference must be a string', code: 'TYPE_ERROR' });
    } else if (!/^WP-\d{4}-\d{3}$/.test(workpaper.reference as string)) {
      errors.push({ field: 'reference', message: 'Reference must match format WP-YYYY-NNN', code: 'INVALID_FORMAT' });
    }

    // Title
    if (!workpaper.title) {
      errors.push({ field: 'title', message: 'Title is required', code: 'REQUIRED' });
    }

    // Status
    const validStatuses = ['draft', 'in_review', 'reviewed', 'approved', 'superseded'];
    if (!workpaper.status) {
      errors.push({ field: 'status', message: 'Status is required', code: 'REQUIRED' });
    } else if (!validStatuses.includes(workpaper.status as string)) {
      errors.push({ field: 'status', message: 'Invalid workpaper status', code: 'INVALID_ENUM' });
    }

    // Audit ID
    if (!workpaper.auditId) {
      errors.push({ field: 'auditId', message: 'Audit ID is required', code: 'REQUIRED' });
    }

    // Prepared by
    if (!workpaper.preparedById) {
      errors.push({ field: 'preparedById', message: 'Preparer is required', code: 'REQUIRED' });
    }

    return { valid: errors.length === 0, errors };
  }

  // Finding validation
  validateFinding(finding: Record<string, unknown>): ValidationResult {
    const errors: ValidationResult['errors'] = [];

    // Title
    if (!finding.title) {
      errors.push({ field: 'title', message: 'Finding title is required', code: 'REQUIRED' });
    }

    // Severity
    const validSeverities = ['critical', 'high', 'medium', 'low', 'informational'];
    if (!finding.severity) {
      errors.push({ field: 'severity', message: 'Severity is required', code: 'REQUIRED' });
    } else if (!validSeverities.includes(finding.severity as string)) {
      errors.push({ field: 'severity', message: 'Invalid severity level', code: 'INVALID_ENUM' });
    }

    // Status
    const validStatuses = ['draft', 'open', 'remediation_in_progress', 'pending_validation', 'closed', 'accepted'];
    if (!finding.status) {
      errors.push({ field: 'status', message: 'Status is required', code: 'REQUIRED' });
    } else if (!validStatuses.includes(finding.status as string)) {
      errors.push({ field: 'status', message: 'Invalid finding status', code: 'INVALID_ENUM' });
    }

    // Description
    if (!finding.description) {
      errors.push({ field: 'description', message: 'Description is required', code: 'REQUIRED' });
    } else if (typeof finding.description === 'string' && finding.description.length < 20) {
      errors.push({ field: 'description', message: 'Description must be at least 20 characters', code: 'MIN_LENGTH' });
    }

    // Recommendation
    if (!finding.recommendation) {
      errors.push({ field: 'recommendation', message: 'Recommendation is required', code: 'REQUIRED' });
    }

    // Due date for remediation
    if (finding.dueDate) {
      if (isNaN(Date.parse(finding.dueDate as string))) {
        errors.push({ field: 'dueDate', message: 'Invalid due date format', code: 'INVALID_FORMAT' });
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // Evidence validation
  validateEvidence(evidence: Record<string, unknown>): ValidationResult {
    const errors: ValidationResult['errors'] = [];

    // Name
    if (!evidence.name) {
      errors.push({ field: 'name', message: 'Evidence name is required', code: 'REQUIRED' });
    }

    // Type
    const validTypes = ['document', 'screenshot', 'export', 'log', 'email', 'video', 'other'];
    if (!evidence.type) {
      errors.push({ field: 'type', message: 'Evidence type is required', code: 'REQUIRED' });
    } else if (!validTypes.includes(evidence.type as string)) {
      errors.push({ field: 'type', message: 'Invalid evidence type', code: 'INVALID_ENUM' });
    }

    // File size
    if (evidence.fileSize !== undefined) {
      if (typeof evidence.fileSize !== 'number') {
        errors.push({ field: 'fileSize', message: 'File size must be a number', code: 'TYPE_ERROR' });
      } else if (evidence.fileSize < 0) {
        errors.push({ field: 'fileSize', message: 'File size cannot be negative', code: 'OUT_OF_RANGE' });
      } else if (evidence.fileSize > 100 * 1024 * 1024) { // 100MB limit
        errors.push({ field: 'fileSize', message: 'File size exceeds maximum allowed (100MB)', code: 'MAX_SIZE' });
      }
    }

    // File type validation
    if (evidence.mimeType) {
      const allowedMimeTypes = [
        'application/pdf',
        'image/png',
        'image/jpeg',
        'image/gif',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/csv',
      ];
      if (!allowedMimeTypes.includes(evidence.mimeType as string)) {
        errors.push({ field: 'mimeType', message: 'File type not allowed', code: 'INVALID_TYPE' });
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // Transaction validation (for ledger entries)
  validateTransaction(transaction: Record<string, unknown>): ValidationResult {
    const errors: ValidationResult['errors'] = [];

    // Amount
    if (transaction.amount === undefined) {
      errors.push({ field: 'amount', message: 'Amount is required', code: 'REQUIRED' });
    } else if (typeof transaction.amount !== 'number') {
      errors.push({ field: 'amount', message: 'Amount must be a number', code: 'TYPE_ERROR' });
    } else if (!isFinite(transaction.amount)) {
      errors.push({ field: 'amount', message: 'Amount must be a finite number', code: 'INVALID_VALUE' });
    }

    // Currency
    const validCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'CNY'];
    if (!transaction.currency) {
      errors.push({ field: 'currency', message: 'Currency is required', code: 'REQUIRED' });
    } else if (!validCurrencies.includes(transaction.currency as string)) {
      errors.push({ field: 'currency', message: 'Invalid currency code', code: 'INVALID_ENUM' });
    }

    // Date
    if (!transaction.date) {
      errors.push({ field: 'date', message: 'Transaction date is required', code: 'REQUIRED' });
    } else if (isNaN(Date.parse(transaction.date as string))) {
      errors.push({ field: 'date', message: 'Invalid date format', code: 'INVALID_FORMAT' });
    }

    // Reference
    if (!transaction.reference) {
      errors.push({ field: 'reference', message: 'Transaction reference is required', code: 'REQUIRED' });
    }

    return { valid: errors.length === 0, errors };
  }

  // Certification validation (SOX certifications)
  validateCertification(cert: Record<string, unknown>): ValidationResult {
    const errors: ValidationResult['errors'] = [];

    // Type
    const validTypes = ['302', '404', '906'];
    if (!cert.type) {
      errors.push({ field: 'type', message: 'Certification type is required', code: 'REQUIRED' });
    } else if (!validTypes.includes(cert.type as string)) {
      errors.push({ field: 'type', message: 'Invalid certification type', code: 'INVALID_ENUM' });
    }

    // Period
    if (!cert.period) {
      errors.push({ field: 'period', message: 'Period is required', code: 'REQUIRED' });
    } else if (!/^\d{4}-Q[1-4]$/.test(cert.period as string)) {
      errors.push({ field: 'period', message: 'Period must match format YYYY-QN (e.g., 2024-Q1)', code: 'INVALID_FORMAT' });
    }

    // Status
    const validStatuses = ['draft', 'pending_review', 'pending_approval', 'approved', 'rejected'];
    if (!cert.status) {
      errors.push({ field: 'status', message: 'Status is required', code: 'REQUIRED' });
    } else if (!validStatuses.includes(cert.status as string)) {
      errors.push({ field: 'status', message: 'Invalid certification status', code: 'INVALID_ENUM' });
    }

    // Certifier
    if (!cert.certifierId) {
      errors.push({ field: 'certifierId', message: 'Certifier is required', code: 'REQUIRED' });
    }

    return { valid: errors.length === 0, errors };
  }

  // Issue validation
  validateIssue(issue: Record<string, unknown>): ValidationResult {
    const errors: ValidationResult['errors'] = [];

    // Title
    if (!issue.title) {
      errors.push({ field: 'title', message: 'Issue title is required', code: 'REQUIRED' });
    }

    // Priority
    const validPriorities = ['critical', 'high', 'medium', 'low'];
    if (!issue.priority) {
      errors.push({ field: 'priority', message: 'Priority is required', code: 'REQUIRED' });
    } else if (!validPriorities.includes(issue.priority as string)) {
      errors.push({ field: 'priority', message: 'Invalid priority', code: 'INVALID_ENUM' });
    }

    // Status
    const validStatuses = ['open', 'in_progress', 'pending_verification', 'closed', 'deferred'];
    if (!issue.status) {
      errors.push({ field: 'status', message: 'Status is required', code: 'REQUIRED' });
    } else if (!validStatuses.includes(issue.status as string)) {
      errors.push({ field: 'status', message: 'Invalid issue status', code: 'INVALID_ENUM' });
    }

    // Owner
    if (!issue.ownerId) {
      errors.push({ field: 'ownerId', message: 'Issue owner is required', code: 'REQUIRED' });
    }

    // Due date
    if (!issue.dueDate) {
      errors.push({ field: 'dueDate', message: 'Due date is required', code: 'REQUIRED' });
    } else if (isNaN(Date.parse(issue.dueDate as string))) {
      errors.push({ field: 'dueDate', message: 'Invalid due date format', code: 'INVALID_FORMAT' });
    }

    return { valid: errors.length === 0, errors };
  }
}

describe('Entity Validation', () => {
  let validator: EntityValidator;

  beforeEach(() => {
    validator = new EntityValidator();
  });

  describe('User Validation', () => {
    it('should validate a valid user', () => {
      const user = {
        email: 'john.doe@company.com',
        name: 'John Doe',
        role: 'auditor',
        organizationId: 'org-123',
      };

      const result = validator.validateUser(user);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require email', () => {
      const user = { name: 'John', role: 'auditor' };
      const result = validator.validateUser(user);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.objectContaining({ field: 'email', code: 'REQUIRED' }));
    });

    it('should validate email format', () => {
      const invalidEmails = ['notanemail', 'missing@domain', '@nodomain.com', 'spaces in@email.com'];
      invalidEmails.forEach(email => {
        const result = validator.validateUser({ email, name: 'Test', role: 'auditor' });
        expect(result.valid).toBe(false);
        expect(result.errors).toContainEqual(expect.objectContaining({ field: 'email', code: 'INVALID_FORMAT' }));
      });
    });

    it('should validate name length', () => {
      const result = validator.validateUser({ email: 'test@test.com', name: 'A', role: 'auditor' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.objectContaining({ field: 'name', code: 'MIN_LENGTH' }));
    });

    it('should reject invalid roles', () => {
      const result = validator.validateUser({ email: 'test@test.com', name: 'Test', role: 'superadmin' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.objectContaining({ field: 'role', code: 'INVALID_ENUM' }));
    });

    it('should accept all valid roles', () => {
      const validRoles = ['admin', 'auditor', 'reviewer', 'viewer', 'control_owner'];
      validRoles.forEach(role => {
        const result = validator.validateUser({ email: 'test@test.com', name: 'Test', role });
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('Control Validation', () => {
    const validControl = {
      name: 'Revenue Recognition Control',
      controlId: 'SOX-101',
      type: 'preventive',
      frequency: 'monthly',
      ownerId: 'user-123',
    };

    it('should validate a valid control', () => {
      const result = validator.validateControl(validControl);
      expect(result.valid).toBe(true);
    });

    it('should require control name', () => {
      const result = validator.validateControl({ ...validControl, name: undefined });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.objectContaining({ field: 'name', code: 'REQUIRED' }));
    });

    it('should validate control ID format', () => {
      const invalidIds = ['SOX101', 'S-1', 'TOOLONG-12345', '123-ABC', 'sox-101'];
      invalidIds.forEach(controlId => {
        const result = validator.validateControl({ ...validControl, controlId });
        expect(result.valid).toBe(false);
        expect(result.errors).toContainEqual(expect.objectContaining({ field: 'controlId', code: 'INVALID_FORMAT' }));
      });
    });

    it('should accept valid control ID formats', () => {
      const validIds = ['SOX-101', 'IT-1234', 'FIN-999', 'CTRL-12345'];
      validIds.forEach(controlId => {
        const result = validator.validateControl({ ...validControl, controlId });
        expect(result.valid).toBe(true);
      });
    });

    it('should validate control types', () => {
      const validTypes = ['preventive', 'detective', 'corrective', 'directive'];
      validTypes.forEach(type => {
        const result = validator.validateControl({ ...validControl, type });
        expect(result.valid).toBe(true);
      });
    });

    it('should reject invalid control types', () => {
      const result = validator.validateControl({ ...validControl, type: 'reactive' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.objectContaining({ field: 'type', code: 'INVALID_ENUM' }));
    });

    it('should validate effectiveness ratings', () => {
      const validRatings = ['effective', 'partially_effective', 'ineffective', 'not_tested'];
      validRatings.forEach(effectivenessRating => {
        const result = validator.validateControl({ ...validControl, effectivenessRating });
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('Risk Validation', () => {
    const validRisk = {
      title: 'Data Breach Risk',
      category: 'technology',
      likelihood: 3,
      impact: 4,
      status: 'assessed',
    };

    it('should validate a valid risk', () => {
      const result = validator.validateRisk(validRisk);
      expect(result.valid).toBe(true);
    });

    it('should validate likelihood range (1-5)', () => {
      [0, 6, -1, 10].forEach(likelihood => {
        const result = validator.validateRisk({ ...validRisk, likelihood });
        expect(result.valid).toBe(false);
        expect(result.errors).toContainEqual(expect.objectContaining({ field: 'likelihood', code: 'OUT_OF_RANGE' }));
      });
    });

    it('should accept valid likelihood values', () => {
      [1, 2, 3, 4, 5].forEach(likelihood => {
        const result = validator.validateRisk({ ...validRisk, likelihood });
        expect(result.valid).toBe(true);
      });
    });

    it('should validate impact range (1-5)', () => {
      [0, 6, -1, 10].forEach(impact => {
        const result = validator.validateRisk({ ...validRisk, impact });
        expect(result.valid).toBe(false);
        expect(result.errors).toContainEqual(expect.objectContaining({ field: 'impact', code: 'OUT_OF_RANGE' }));
      });
    });

    it('should require integer values for likelihood', () => {
      const result = validator.validateRisk({ ...validRisk, likelihood: 2.5 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.objectContaining({ field: 'likelihood', code: 'TYPE_ERROR' }));
    });

    it('should validate risk categories', () => {
      const validCategories = ['operational', 'financial', 'compliance', 'strategic', 'reputational', 'technology', 'legal'];
      validCategories.forEach(category => {
        const result = validator.validateRisk({ ...validRisk, category });
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('Audit Validation', () => {
    const validAudit = {
      name: 'Q1 2024 SOX Audit',
      type: 'sox',
      status: 'in_progress',
      startDate: '2024-01-01',
      leadAuditorId: 'user-123',
    };

    it('should validate a valid audit', () => {
      const result = validator.validateAudit(validAudit);
      expect(result.valid).toBe(true);
    });

    it('should validate audit types', () => {
      const validTypes = ['internal', 'external', 'sox', 'compliance', 'operational', 'financial', 'it'];
      validTypes.forEach(type => {
        const result = validator.validateAudit({ ...validAudit, type });
        expect(result.valid).toBe(true);
      });
    });

    it('should validate date format', () => {
      const result = validator.validateAudit({ ...validAudit, startDate: 'not-a-date' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.objectContaining({ field: 'startDate', code: 'INVALID_FORMAT' }));
    });

    it('should ensure end date is after start date', () => {
      const result = validator.validateAudit({
        ...validAudit,
        startDate: '2024-06-01',
        endDate: '2024-01-01',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.objectContaining({ field: 'endDate', code: 'INVALID_RANGE' }));
    });
  });

  describe('Workpaper Validation', () => {
    const validWorkpaper = {
      reference: 'WP-2024-001',
      title: 'Revenue Testing Workpaper',
      status: 'draft',
      auditId: 'audit-123',
      preparedById: 'user-123',
    };

    it('should validate a valid workpaper', () => {
      const result = validator.validateWorkpaper(validWorkpaper);
      expect(result.valid).toBe(true);
    });

    it('should validate reference format', () => {
      const invalidRefs = ['WP2024001', 'WP-24-001', 'WP-2024-1', 'workpaper-1'];
      invalidRefs.forEach(reference => {
        const result = validator.validateWorkpaper({ ...validWorkpaper, reference });
        expect(result.valid).toBe(false);
        expect(result.errors).toContainEqual(expect.objectContaining({ field: 'reference', code: 'INVALID_FORMAT' }));
      });
    });

    it('should accept valid reference formats', () => {
      const validRefs = ['WP-2024-001', 'WP-2024-999', 'WP-1999-123'];
      validRefs.forEach(reference => {
        const result = validator.validateWorkpaper({ ...validWorkpaper, reference });
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('Finding Validation', () => {
    const validFinding = {
      title: 'Access Control Weakness',
      severity: 'high',
      status: 'open',
      description: 'This is a detailed description of the finding that exceeds 20 characters.',
      recommendation: 'Implement stronger access controls',
    };

    it('should validate a valid finding', () => {
      const result = validator.validateFinding(validFinding);
      expect(result.valid).toBe(true);
    });

    it('should validate severity levels', () => {
      const validSeverities = ['critical', 'high', 'medium', 'low', 'informational'];
      validSeverities.forEach(severity => {
        const result = validator.validateFinding({ ...validFinding, severity });
        expect(result.valid).toBe(true);
      });
    });

    it('should require minimum description length', () => {
      const result = validator.validateFinding({ ...validFinding, description: 'Too short' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.objectContaining({ field: 'description', code: 'MIN_LENGTH' }));
    });
  });

  describe('Evidence Validation', () => {
    const validEvidence = {
      name: 'Bank Statement Q1 2024',
      type: 'document',
      fileSize: 1024 * 1024, // 1MB
      mimeType: 'application/pdf',
    };

    it('should validate valid evidence', () => {
      const result = validator.validateEvidence(validEvidence);
      expect(result.valid).toBe(true);
    });

    it('should reject files over 100MB', () => {
      const result = validator.validateEvidence({
        ...validEvidence,
        fileSize: 150 * 1024 * 1024,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.objectContaining({ field: 'fileSize', code: 'MAX_SIZE' }));
    });

    it('should reject negative file sizes', () => {
      const result = validator.validateEvidence({
        ...validEvidence,
        fileSize: -100,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.objectContaining({ field: 'fileSize', code: 'OUT_OF_RANGE' }));
    });

    it('should validate allowed MIME types', () => {
      const allowedTypes = [
        'application/pdf',
        'image/png',
        'image/jpeg',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ];
      allowedTypes.forEach(mimeType => {
        const result = validator.validateEvidence({ ...validEvidence, mimeType });
        expect(result.valid).toBe(true);
      });
    });

    it('should reject disallowed MIME types', () => {
      const disallowedTypes = ['application/x-executable', 'application/javascript', 'text/html'];
      disallowedTypes.forEach(mimeType => {
        const result = validator.validateEvidence({ ...validEvidence, mimeType });
        expect(result.valid).toBe(false);
        expect(result.errors).toContainEqual(expect.objectContaining({ field: 'mimeType', code: 'INVALID_TYPE' }));
      });
    });
  });

  describe('Transaction Validation', () => {
    const validTransaction = {
      amount: 1000.50,
      currency: 'USD',
      date: '2024-06-15',
      reference: 'TXN-123456',
    };

    it('should validate a valid transaction', () => {
      const result = validator.validateTransaction(validTransaction);
      expect(result.valid).toBe(true);
    });

    it('should validate currency codes', () => {
      const validCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'CNY'];
      validCurrencies.forEach(currency => {
        const result = validator.validateTransaction({ ...validTransaction, currency });
        expect(result.valid).toBe(true);
      });
    });

    it('should reject invalid currencies', () => {
      const result = validator.validateTransaction({ ...validTransaction, currency: 'XYZ' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.objectContaining({ field: 'currency', code: 'INVALID_ENUM' }));
    });

    it('should reject non-finite amounts', () => {
      [Infinity, -Infinity, NaN].forEach(amount => {
        const result = validator.validateTransaction({ ...validTransaction, amount });
        expect(result.valid).toBe(false);
      });
    });
  });

  describe('Certification Validation', () => {
    const validCert = {
      type: '302',
      period: '2024-Q1',
      status: 'pending_approval',
      certifierId: 'user-cfo',
    };

    it('should validate a valid certification', () => {
      const result = validator.validateCertification(validCert);
      expect(result.valid).toBe(true);
    });

    it('should validate SOX certification types', () => {
      const validTypes = ['302', '404', '906'];
      validTypes.forEach(type => {
        const result = validator.validateCertification({ ...validCert, type });
        expect(result.valid).toBe(true);
      });
    });

    it('should validate period format', () => {
      const validPeriods = ['2024-Q1', '2024-Q2', '2024-Q3', '2024-Q4', '2023-Q1'];
      validPeriods.forEach(period => {
        const result = validator.validateCertification({ ...validCert, period });
        expect(result.valid).toBe(true);
      });
    });

    it('should reject invalid period formats', () => {
      const invalidPeriods = ['2024Q1', '2024-Q5', 'Q1-2024', '24-Q1', '2024-1'];
      invalidPeriods.forEach(period => {
        const result = validator.validateCertification({ ...validCert, period });
        expect(result.valid).toBe(false);
        expect(result.errors).toContainEqual(expect.objectContaining({ field: 'period', code: 'INVALID_FORMAT' }));
      });
    });
  });

  describe('Issue Validation', () => {
    const validIssue = {
      title: 'Missing Documentation',
      priority: 'high',
      status: 'open',
      ownerId: 'user-123',
      dueDate: '2024-12-31',
    };

    it('should validate a valid issue', () => {
      const result = validator.validateIssue(validIssue);
      expect(result.valid).toBe(true);
    });

    it('should validate priorities', () => {
      const validPriorities = ['critical', 'high', 'medium', 'low'];
      validPriorities.forEach(priority => {
        const result = validator.validateIssue({ ...validIssue, priority });
        expect(result.valid).toBe(true);
      });
    });

    it('should require due date', () => {
      const result = validator.validateIssue({ ...validIssue, dueDate: undefined });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.objectContaining({ field: 'dueDate', code: 'REQUIRED' }));
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty objects', () => {
      const results = [
        validator.validateUser({}),
        validator.validateControl({}),
        validator.validateRisk({}),
        validator.validateAudit({}),
      ];

      results.forEach(result => {
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    it('should handle null values', () => {
      const result = validator.validateUser({ email: null, name: null, role: null });
      expect(result.valid).toBe(false);
    });

    it('should handle undefined values', () => {
      const result = validator.validateControl({
        name: undefined,
        controlId: undefined,
        type: undefined,
      });
      expect(result.valid).toBe(false);
    });

    it('should handle wrong types', () => {
      const result = validator.validateUser({
        email: 123,
        name: { first: 'John' },
        role: ['admin'],
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'TYPE_ERROR')).toBe(true);
    });

    it('should handle XSS attempts in string fields', () => {
      const xssPayload = '<script>alert("xss")</script>';
      const result = validator.validateUser({
        email: `test@test.com${xssPayload}`,
        name: xssPayload,
        role: 'auditor',
      });

      // Email should fail due to format
      expect(result.errors).toContainEqual(expect.objectContaining({ field: 'email', code: 'INVALID_FORMAT' }));
    });

    it('should handle SQL injection attempts', () => {
      const sqlPayload = "'; DROP TABLE users; --";
      const result = validator.validateControl({
        name: sqlPayload,
        controlId: sqlPayload,
        type: 'preventive',
        frequency: 'monthly',
        ownerId: sqlPayload,
      });

      // Control ID should fail format validation
      expect(result.errors).toContainEqual(expect.objectContaining({ field: 'controlId', code: 'INVALID_FORMAT' }));
    });
  });
});
