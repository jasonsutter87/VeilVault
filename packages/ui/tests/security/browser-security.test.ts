import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Browser Security Tests
 * CSP, CORS, XSS prevention, and client-side security measures
 */

// ============================================================================
// CONTENT SECURITY POLICY (CSP) TYPES
// ============================================================================
interface CSPDirectives {
  'default-src'?: string[];
  'script-src'?: string[];
  'style-src'?: string[];
  'img-src'?: string[];
  'font-src'?: string[];
  'connect-src'?: string[];
  'frame-src'?: string[];
  'frame-ancestors'?: string[];
  'object-src'?: string[];
  'base-uri'?: string[];
  'form-action'?: string[];
  'upgrade-insecure-requests'?: boolean;
  'block-all-mixed-content'?: boolean;
  'report-uri'?: string;
  'report-to'?: string;
}

// ============================================================================
// CSP BUILDER
// ============================================================================
class CSPBuilder {
  private directives: CSPDirectives;
  private nonces: Set<string>;

  constructor() {
    this.directives = {};
    this.nonces = new Set();
  }

  setDefault(sources: string[]): this {
    this.directives['default-src'] = sources;
    return this;
  }

  setScriptSrc(sources: string[]): this {
    this.directives['script-src'] = sources;
    return this;
  }

  setStyleSrc(sources: string[]): this {
    this.directives['style-src'] = sources;
    return this;
  }

  setImgSrc(sources: string[]): this {
    this.directives['img-src'] = sources;
    return this;
  }

  setConnectSrc(sources: string[]): this {
    this.directives['connect-src'] = sources;
    return this;
  }

  setFrameAncestors(sources: string[]): this {
    this.directives['frame-ancestors'] = sources;
    return this;
  }

  setFormAction(sources: string[]): this {
    this.directives['form-action'] = sources;
    return this;
  }

  setBaseUri(sources: string[]): this {
    this.directives['base-uri'] = sources;
    return this;
  }

  setObjectSrc(sources: string[]): this {
    this.directives['object-src'] = sources;
    return this;
  }

  upgradeInsecureRequests(): this {
    this.directives['upgrade-insecure-requests'] = true;
    return this;
  }

  blockAllMixedContent(): this {
    this.directives['block-all-mixed-content'] = true;
    return this;
  }

  setReportUri(uri: string): this {
    this.directives['report-uri'] = uri;
    return this;
  }

  addNonce(nonce: string): this {
    this.nonces.add(nonce);
    return this;
  }

  generateNonce(): string {
    const nonce = 'nonce-' + Math.random().toString(36).substring(2, 15);
    this.nonces.add(nonce);
    return nonce;
  }

  build(): string {
    const parts: string[] = [];

    for (const [directive, value] of Object.entries(this.directives)) {
      if (value === true) {
        parts.push(directive);
      } else if (typeof value === 'string') {
        parts.push(`${directive} ${value}`);
      } else if (Array.isArray(value)) {
        let sources = [...value];
        if (directive === 'script-src' && this.nonces.size > 0) {
          sources = sources.concat([...this.nonces].map(n => `'${n}'`));
        }
        parts.push(`${directive} ${sources.join(' ')}`);
      }
    }

    return parts.join('; ');
  }

  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for unsafe directives
    const unsafeDirectives = ['script-src', 'style-src'];
    for (const directive of unsafeDirectives) {
      const value = this.directives[directive as keyof CSPDirectives];
      if (Array.isArray(value)) {
        if (value.includes("'unsafe-inline'") && !value.some(v => v.startsWith("'nonce-") || v.startsWith("'sha"))) {
          errors.push(`${directive} uses unsafe-inline without nonce or hash`);
        }
        if (value.includes("'unsafe-eval'")) {
          errors.push(`${directive} uses unsafe-eval`);
        }
      }
    }

    // Check for missing important directives
    if (!this.directives['default-src'] && !this.directives['script-src']) {
      errors.push('Missing default-src or script-src directive');
    }

    if (!this.directives['object-src']) {
      errors.push('Missing object-src directive (should be none)');
    }

    if (!this.directives['base-uri']) {
      errors.push('Missing base-uri directive');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// ============================================================================
// CORS POLICY
// ============================================================================
interface CORSConfig {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  credentials: boolean;
  maxAge: number;
}

class CORSPolicy {
  private config: CORSConfig;

  constructor(config: Partial<CORSConfig> = {}) {
    this.config = {
      allowedOrigins: config.allowedOrigins || [],
      allowedMethods: config.allowedMethods || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: config.allowedHeaders || ['Content-Type', 'Authorization'],
      exposedHeaders: config.exposedHeaders || [],
      credentials: config.credentials ?? false,
      maxAge: config.maxAge || 86400,
    };
  }

  isOriginAllowed(origin: string): boolean {
    if (this.config.allowedOrigins.includes('*')) {
      return true;
    }

    // Check exact match
    if (this.config.allowedOrigins.includes(origin)) {
      return true;
    }

    // Check wildcard subdomains
    for (const allowed of this.config.allowedOrigins) {
      if (allowed.startsWith('*.')) {
        const domain = allowed.slice(2);
        if (origin.endsWith(domain) || origin.endsWith('.' + domain)) {
          return true;
        }
      }
    }

    return false;
  }

  isMethodAllowed(method: string): boolean {
    return this.config.allowedMethods.includes(method.toUpperCase());
  }

  isHeaderAllowed(header: string): boolean {
    // Always allowed headers (simple headers)
    const simpleHeaders = ['accept', 'accept-language', 'content-language', 'content-type'];
    if (simpleHeaders.includes(header.toLowerCase())) {
      return true;
    }

    return this.config.allowedHeaders.some(
      h => h.toLowerCase() === header.toLowerCase()
    );
  }

  getHeaders(origin: string): Record<string, string> {
    const headers: Record<string, string> = {};

    if (this.isOriginAllowed(origin)) {
      headers['Access-Control-Allow-Origin'] = this.config.allowedOrigins.includes('*') ? '*' : origin;
    }

    if (this.config.credentials) {
      headers['Access-Control-Allow-Credentials'] = 'true';
    }

    if (this.config.exposedHeaders.length > 0) {
      headers['Access-Control-Expose-Headers'] = this.config.exposedHeaders.join(', ');
    }

    return headers;
  }

  getPreflightHeaders(origin: string, requestMethod: string, requestHeaders: string[]): Record<string, string> {
    const headers = this.getHeaders(origin);

    if (this.isMethodAllowed(requestMethod)) {
      headers['Access-Control-Allow-Methods'] = this.config.allowedMethods.join(', ');
    }

    const allowedRequestHeaders = requestHeaders.filter(h => this.isHeaderAllowed(h));
    if (allowedRequestHeaders.length > 0) {
      headers['Access-Control-Allow-Headers'] = allowedRequestHeaders.join(', ');
    }

    headers['Access-Control-Max-Age'] = this.config.maxAge.toString();

    return headers;
  }

  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for wildcard with credentials
    if (this.config.allowedOrigins.includes('*') && this.config.credentials) {
      errors.push('Cannot use wildcard origin with credentials');
    }

    // Check for dangerous methods
    if (this.config.allowedMethods.includes('TRACE')) {
      errors.push('TRACE method is dangerous and should not be allowed');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// ============================================================================
// XSS PREVENTER
// ============================================================================
class XSSPreventer {
  private sanitizedCount: number = 0;

  sanitizeHTML(input: string): string {
    if (typeof input !== 'string') return '';

    this.sanitizedCount++;

    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  sanitizeURL(url: string): string | null {
    if (typeof url !== 'string') return null;

    // Reject javascript: and data: URLs
    const lowerUrl = url.toLowerCase().trim();
    if (lowerUrl.startsWith('javascript:') || lowerUrl.startsWith('data:')) {
      return null;
    }

    // Reject vbscript:
    if (lowerUrl.startsWith('vbscript:')) {
      return null;
    }

    return url;
  }

  sanitizeAttribute(name: string, value: string): string | null {
    const lowerName = name.toLowerCase();

    // Block event handlers
    if (lowerName.startsWith('on')) {
      return null;
    }

    // Sanitize href and src attributes
    if (lowerName === 'href' || lowerName === 'src') {
      return this.sanitizeURL(value);
    }

    // Block style attribute (can contain expressions)
    if (lowerName === 'style') {
      // Remove dangerous CSS
      return value
        .replace(/expression\s*\(/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/behavior\s*:/gi, '');
    }

    return this.sanitizeHTML(value);
  }

  sanitizeJSON(input: string): string {
    // Escape HTML entities in JSON strings
    return input
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026');
  }

  getSanitizedCount(): number {
    return this.sanitizedCount;
  }

  resetCount(): void {
    this.sanitizedCount = 0;
  }
}

// ============================================================================
// SECURE COOKIE BUILDER
// ============================================================================
class SecureCookieBuilder {
  private name: string;
  private value: string;
  private options: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'Strict' | 'Lax' | 'None';
    path: string;
    domain?: string;
    maxAge?: number;
    expires?: Date;
  };

  constructor(name: string, value: string) {
    this.name = name;
    this.value = value;
    this.options = {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      path: '/',
    };
  }

  httpOnly(enabled: boolean = true): this {
    this.options.httpOnly = enabled;
    return this;
  }

  secure(enabled: boolean = true): this {
    this.options.secure = enabled;
    return this;
  }

  sameSite(value: 'Strict' | 'Lax' | 'None'): this {
    this.options.sameSite = value;
    return this;
  }

  path(path: string): this {
    this.options.path = path;
    return this;
  }

  domain(domain: string): this {
    this.options.domain = domain;
    return this;
  }

  maxAge(seconds: number): this {
    this.options.maxAge = seconds;
    return this;
  }

  expires(date: Date): this {
    this.options.expires = date;
    return this;
  }

  build(): string {
    let cookie = `${encodeURIComponent(this.name)}=${encodeURIComponent(this.value)}`;

    cookie += `; Path=${this.options.path}`;

    if (this.options.domain) {
      cookie += `; Domain=${this.options.domain}`;
    }

    if (this.options.maxAge !== undefined) {
      cookie += `; Max-Age=${this.options.maxAge}`;
    }

    if (this.options.expires) {
      cookie += `; Expires=${this.options.expires.toUTCString()}`;
    }

    if (this.options.httpOnly) {
      cookie += '; HttpOnly';
    }

    if (this.options.secure) {
      cookie += '; Secure';
    }

    cookie += `; SameSite=${this.options.sameSite}`;

    return cookie;
  }

  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // SameSite=None requires Secure
    if (this.options.sameSite === 'None' && !this.options.secure) {
      errors.push('SameSite=None requires Secure flag');
    }

    // Sensitive cookies should be HttpOnly
    const sensitiveNames = ['session', 'token', 'auth', 'csrf'];
    if (sensitiveNames.some(n => this.name.toLowerCase().includes(n)) && !this.options.httpOnly) {
      errors.push('Sensitive cookies should have HttpOnly flag');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// ============================================================================
// SECURITY HEADERS BUILDER
// ============================================================================
class SecurityHeadersBuilder {
  private headers: Map<string, string>;

  constructor() {
    this.headers = new Map();
  }

  setStrictTransportSecurity(maxAge: number, includeSubdomains: boolean = true, preload: boolean = false): this {
    let value = `max-age=${maxAge}`;
    if (includeSubdomains) value += '; includeSubDomains';
    if (preload) value += '; preload';
    this.headers.set('Strict-Transport-Security', value);
    return this;
  }

  setXContentTypeOptions(): this {
    this.headers.set('X-Content-Type-Options', 'nosniff');
    return this;
  }

  setXFrameOptions(value: 'DENY' | 'SAMEORIGIN'): this {
    this.headers.set('X-Frame-Options', value);
    return this;
  }

  setXXSSProtection(enabled: boolean = true, mode: 'block' | '' = 'block'): this {
    const value = enabled ? (mode === 'block' ? '1; mode=block' : '1') : '0';
    this.headers.set('X-XSS-Protection', value);
    return this;
  }

  setReferrerPolicy(policy: string): this {
    this.headers.set('Referrer-Policy', policy);
    return this;
  }

  setPermissionsPolicy(directives: Record<string, string[]>): this {
    const parts = Object.entries(directives).map(([feature, allowlist]) => {
      if (allowlist.length === 0) return `${feature}=()`;
      return `${feature}=(${allowlist.join(' ')})`;
    });
    this.headers.set('Permissions-Policy', parts.join(', '));
    return this;
  }

  setCrossOriginOpenerPolicy(value: 'same-origin' | 'same-origin-allow-popups' | 'unsafe-none'): this {
    this.headers.set('Cross-Origin-Opener-Policy', value);
    return this;
  }

  setCrossOriginEmbedderPolicy(value: 'require-corp' | 'credentialless' | 'unsafe-none'): this {
    this.headers.set('Cross-Origin-Embedder-Policy', value);
    return this;
  }

  setCrossOriginResourcePolicy(value: 'same-origin' | 'same-site' | 'cross-origin'): this {
    this.headers.set('Cross-Origin-Resource-Policy', value);
    return this;
  }

  setContentSecurityPolicy(csp: string): this {
    this.headers.set('Content-Security-Policy', csp);
    return this;
  }

  build(): Record<string, string> {
    return Object.fromEntries(this.headers);
  }

  validate(): { valid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    if (!this.headers.has('Strict-Transport-Security')) {
      warnings.push('Missing Strict-Transport-Security header');
    }

    if (!this.headers.has('X-Content-Type-Options')) {
      warnings.push('Missing X-Content-Type-Options header');
    }

    if (!this.headers.has('X-Frame-Options') && !this.headers.get('Content-Security-Policy')?.includes('frame-ancestors')) {
      warnings.push('Missing clickjacking protection (X-Frame-Options or frame-ancestors)');
    }

    if (!this.headers.has('Referrer-Policy')) {
      warnings.push('Missing Referrer-Policy header');
    }

    return {
      valid: warnings.length === 0,
      warnings,
    };
  }
}

// ============================================================================
// TESTS
// ============================================================================

describe('Content Security Policy', () => {
  let builder: CSPBuilder;

  beforeEach(() => {
    builder = new CSPBuilder();
  });

  describe('Directive Building', () => {
    it('should build basic CSP', () => {
      builder.setDefault(["'self'"]);
      const csp = builder.build();
      expect(csp).toBe("default-src 'self'");
    });

    it('should build CSP with multiple directives', () => {
      builder
        .setDefault(["'self'"])
        .setScriptSrc(["'self'", 'https://cdn.example.com'])
        .setStyleSrc(["'self'", "'unsafe-inline'"]);

      const csp = builder.build();
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self' https://cdn.example.com");
      expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    });

    it('should add nonce to script-src', () => {
      builder
        .setDefault(["'self'"])
        .setScriptSrc(["'self'"])
        .addNonce('nonce-abc123');

      const csp = builder.build();
      expect(csp).toContain("'nonce-abc123'");
    });

    it('should generate unique nonces', () => {
      const nonce1 = builder.generateNonce();
      const nonce2 = builder.generateNonce();
      expect(nonce1).not.toBe(nonce2);
    });

    it('should build upgrade-insecure-requests', () => {
      builder.setDefault(["'self'"]).upgradeInsecureRequests();
      const csp = builder.build();
      expect(csp).toContain('upgrade-insecure-requests');
    });

    it('should build block-all-mixed-content', () => {
      builder.setDefault(["'self'"]).blockAllMixedContent();
      const csp = builder.build();
      expect(csp).toContain('block-all-mixed-content');
    });

    it('should build frame-ancestors', () => {
      builder.setFrameAncestors(["'none'"]);
      const csp = builder.build();
      expect(csp).toContain("frame-ancestors 'none'");
    });

    it('should build report-uri', () => {
      builder.setDefault(["'self'"]).setReportUri('/csp-report');
      const csp = builder.build();
      expect(csp).toContain('report-uri /csp-report');
    });
  });

  describe('CSP Validation', () => {
    it('should warn about unsafe-inline without nonce', () => {
      builder.setScriptSrc(["'self'", "'unsafe-inline'"]);
      const result = builder.validate();
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('unsafe-inline'))).toBe(true);
    });

    it('should accept unsafe-inline with nonce', () => {
      builder
        .setScriptSrc(["'self'", "'unsafe-inline'", "'nonce-abc123'"])
        .setDefault(["'self'"])
        .setObjectSrc(["'none'"])
        .setBaseUri(["'self'"]);
      const result = builder.validate();
      expect(result.errors.filter(e => e.includes('unsafe-inline'))).toHaveLength(0);
    });

    it('should warn about unsafe-eval', () => {
      builder.setScriptSrc(["'self'", "'unsafe-eval'"]);
      const result = builder.validate();
      expect(result.errors.some(e => e.includes('unsafe-eval'))).toBe(true);
    });

    it('should warn about missing object-src', () => {
      builder.setDefault(["'self'"]);
      const result = builder.validate();
      expect(result.errors.some(e => e.includes('object-src'))).toBe(true);
    });

    it('should warn about missing base-uri', () => {
      builder.setDefault(["'self'"]).setObjectSrc(["'none'"]);
      const result = builder.validate();
      expect(result.errors.some(e => e.includes('base-uri'))).toBe(true);
    });

    it('should pass validation with secure CSP', () => {
      builder
        .setDefault(["'self'"])
        .setScriptSrc(["'self'"])
        .setObjectSrc(["'none'"])
        .setBaseUri(["'self'"]);
      const result = builder.validate();
      expect(result.valid).toBe(true);
    });
  });
});

describe('CORS Policy', () => {
  describe('Origin Validation', () => {
    it('should allow exact origin match', () => {
      const policy = new CORSPolicy({
        allowedOrigins: ['https://example.com'],
      });
      expect(policy.isOriginAllowed('https://example.com')).toBe(true);
      expect(policy.isOriginAllowed('https://other.com')).toBe(false);
    });

    it('should allow wildcard origin', () => {
      const policy = new CORSPolicy({
        allowedOrigins: ['*'],
      });
      expect(policy.isOriginAllowed('https://any.com')).toBe(true);
    });

    it('should allow wildcard subdomain', () => {
      const policy = new CORSPolicy({
        allowedOrigins: ['*.example.com'],
      });
      expect(policy.isOriginAllowed('https://sub.example.com')).toBe(true);
      expect(policy.isOriginAllowed('https://other.com')).toBe(false);
    });

    it('should allow multiple origins', () => {
      const policy = new CORSPolicy({
        allowedOrigins: ['https://a.com', 'https://b.com'],
      });
      expect(policy.isOriginAllowed('https://a.com')).toBe(true);
      expect(policy.isOriginAllowed('https://b.com')).toBe(true);
      expect(policy.isOriginAllowed('https://c.com')).toBe(false);
    });
  });

  describe('Method Validation', () => {
    it('should allow configured methods', () => {
      const policy = new CORSPolicy({
        allowedMethods: ['GET', 'POST'],
      });
      expect(policy.isMethodAllowed('GET')).toBe(true);
      expect(policy.isMethodAllowed('POST')).toBe(true);
      expect(policy.isMethodAllowed('DELETE')).toBe(false);
    });

    it('should be case insensitive', () => {
      const policy = new CORSPolicy({
        allowedMethods: ['GET'],
      });
      expect(policy.isMethodAllowed('get')).toBe(true);
    });
  });

  describe('Header Validation', () => {
    it('should always allow simple headers', () => {
      const policy = new CORSPolicy({});
      expect(policy.isHeaderAllowed('Content-Type')).toBe(true);
      expect(policy.isHeaderAllowed('Accept')).toBe(true);
    });

    it('should allow configured headers', () => {
      const policy = new CORSPolicy({
        allowedHeaders: ['Authorization', 'X-Custom-Header'],
      });
      expect(policy.isHeaderAllowed('Authorization')).toBe(true);
      expect(policy.isHeaderAllowed('X-Custom-Header')).toBe(true);
      expect(policy.isHeaderAllowed('X-Other')).toBe(false);
    });
  });

  describe('Response Headers', () => {
    it('should return correct headers for allowed origin', () => {
      const policy = new CORSPolicy({
        allowedOrigins: ['https://example.com'],
        credentials: true,
      });

      const headers = policy.getHeaders('https://example.com');
      expect(headers['Access-Control-Allow-Origin']).toBe('https://example.com');
      expect(headers['Access-Control-Allow-Credentials']).toBe('true');
    });

    it('should return wildcard for wildcard config', () => {
      const policy = new CORSPolicy({
        allowedOrigins: ['*'],
      });

      const headers = policy.getHeaders('https://any.com');
      expect(headers['Access-Control-Allow-Origin']).toBe('*');
    });

    it('should include exposed headers', () => {
      const policy = new CORSPolicy({
        allowedOrigins: ['*'],
        exposedHeaders: ['X-Custom-Header', 'X-Request-Id'],
      });

      const headers = policy.getHeaders('https://example.com');
      expect(headers['Access-Control-Expose-Headers']).toBe('X-Custom-Header, X-Request-Id');
    });

    it('should return preflight headers', () => {
      const policy = new CORSPolicy({
        allowedOrigins: ['https://example.com'],
        allowedMethods: ['GET', 'POST', 'PUT'],
        allowedHeaders: ['Authorization'],
        maxAge: 3600,
      });

      const headers = policy.getPreflightHeaders('https://example.com', 'PUT', ['Authorization']);
      expect(headers['Access-Control-Allow-Methods']).toContain('PUT');
      expect(headers['Access-Control-Allow-Headers']).toBe('Authorization');
      expect(headers['Access-Control-Max-Age']).toBe('3600');
    });
  });

  describe('CORS Validation', () => {
    it('should reject wildcard with credentials', () => {
      const policy = new CORSPolicy({
        allowedOrigins: ['*'],
        credentials: true,
      });

      const result = policy.validate();
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('wildcard'))).toBe(true);
    });

    it('should reject TRACE method', () => {
      const policy = new CORSPolicy({
        allowedMethods: ['GET', 'TRACE'],
      });

      const result = policy.validate();
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('TRACE'))).toBe(true);
    });

    it('should pass validation for secure config', () => {
      const policy = new CORSPolicy({
        allowedOrigins: ['https://example.com'],
        allowedMethods: ['GET', 'POST'],
        credentials: true,
      });

      expect(policy.validate().valid).toBe(true);
    });
  });
});

describe('XSS Prevention', () => {
  let preventer: XSSPreventer;

  beforeEach(() => {
    preventer = new XSSPreventer();
  });

  describe('HTML Sanitization', () => {
    it('should escape HTML entities', () => {
      expect(preventer.sanitizeHTML('<script>')).toBe('&lt;script&gt;');
      expect(preventer.sanitizeHTML('a & b')).toBe('a &amp; b');
      expect(preventer.sanitizeHTML('"quoted"')).toBe('&quot;quoted&quot;');
      expect(preventer.sanitizeHTML("it's")).toBe("it&#x27;s");
    });

    it('should track sanitization count', () => {
      preventer.sanitizeHTML('test1');
      preventer.sanitizeHTML('test2');
      expect(preventer.getSanitizedCount()).toBe(2);
    });

    it('should reset count', () => {
      preventer.sanitizeHTML('test');
      preventer.resetCount();
      expect(preventer.getSanitizedCount()).toBe(0);
    });

    it('should handle non-string input', () => {
      expect(preventer.sanitizeHTML(null as any)).toBe('');
      expect(preventer.sanitizeHTML(undefined as any)).toBe('');
    });
  });

  describe('URL Sanitization', () => {
    it('should allow safe URLs', () => {
      expect(preventer.sanitizeURL('https://example.com')).toBe('https://example.com');
      expect(preventer.sanitizeURL('/path/to/page')).toBe('/path/to/page');
    });

    it('should block javascript: URLs', () => {
      expect(preventer.sanitizeURL('javascript:alert(1)')).toBeNull();
      expect(preventer.sanitizeURL('JAVASCRIPT:alert(1)')).toBeNull();
      expect(preventer.sanitizeURL('  javascript:alert(1)')).toBeNull();
    });

    it('should block data: URLs', () => {
      expect(preventer.sanitizeURL('data:text/html,<script>')).toBeNull();
    });

    it('should block vbscript: URLs', () => {
      expect(preventer.sanitizeURL('vbscript:msgbox(1)')).toBeNull();
    });

    it('should handle non-string input', () => {
      expect(preventer.sanitizeURL(null as any)).toBeNull();
    });
  });

  describe('Attribute Sanitization', () => {
    it('should block event handlers', () => {
      expect(preventer.sanitizeAttribute('onclick', 'alert(1)')).toBeNull();
      expect(preventer.sanitizeAttribute('onmouseover', 'alert(1)')).toBeNull();
      expect(preventer.sanitizeAttribute('ONERROR', 'alert(1)')).toBeNull();
    });

    it('should sanitize href attributes', () => {
      expect(preventer.sanitizeAttribute('href', 'javascript:alert(1)')).toBeNull();
      expect(preventer.sanitizeAttribute('href', 'https://example.com')).toBe('https://example.com');
    });

    it('should sanitize src attributes', () => {
      expect(preventer.sanitizeAttribute('src', 'javascript:alert(1)')).toBeNull();
      expect(preventer.sanitizeAttribute('src', '/image.png')).toBe('/image.png');
    });

    it('should sanitize style attributes', () => {
      const result = preventer.sanitizeAttribute('style', 'expression(alert(1))');
      expect(result).not.toContain('expression');
    });

    it('should escape regular attributes', () => {
      expect(preventer.sanitizeAttribute('class', '<test>')).toBe('&lt;test&gt;');
    });
  });

  describe('JSON Sanitization', () => {
    it('should escape HTML in JSON', () => {
      const result = preventer.sanitizeJSON('{"msg": "<script>"}');
      expect(result).not.toContain('<script>');
      expect(result).toContain('\\u003c');
    });
  });
});

describe('Secure Cookies', () => {
  describe('Cookie Building', () => {
    it('should build basic secure cookie', () => {
      const cookie = new SecureCookieBuilder('session', 'abc123').build();
      expect(cookie).toContain('session=abc123');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Secure');
      expect(cookie).toContain('SameSite=Strict');
    });

    it('should set path', () => {
      const cookie = new SecureCookieBuilder('test', 'value').path('/api').build();
      expect(cookie).toContain('Path=/api');
    });

    it('should set domain', () => {
      const cookie = new SecureCookieBuilder('test', 'value').domain('.example.com').build();
      expect(cookie).toContain('Domain=.example.com');
    });

    it('should set max age', () => {
      const cookie = new SecureCookieBuilder('test', 'value').maxAge(3600).build();
      expect(cookie).toContain('Max-Age=3600');
    });

    it('should set expiration', () => {
      const date = new Date('2025-12-31');
      const cookie = new SecureCookieBuilder('test', 'value').expires(date).build();
      expect(cookie).toContain('Expires=');
    });

    it('should set SameSite=Lax', () => {
      const cookie = new SecureCookieBuilder('test', 'value').sameSite('Lax').build();
      expect(cookie).toContain('SameSite=Lax');
    });

    it('should disable HttpOnly', () => {
      const cookie = new SecureCookieBuilder('test', 'value').httpOnly(false).build();
      expect(cookie).not.toContain('HttpOnly');
    });

    it('should encode special characters', () => {
      const cookie = new SecureCookieBuilder('name=test', 'value=123').build();
      expect(cookie).toContain('name%3Dtest');
      expect(cookie).toContain('value%3D123');
    });
  });

  describe('Cookie Validation', () => {
    it('should reject SameSite=None without Secure', () => {
      const cookie = new SecureCookieBuilder('test', 'value').sameSite('None').secure(false);
      const result = cookie.validate();
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('SameSite=None'))).toBe(true);
    });

    it('should warn about missing HttpOnly for session cookies', () => {
      const cookie = new SecureCookieBuilder('session_id', 'value').httpOnly(false);
      const result = cookie.validate();
      expect(result.errors.some(e => e.includes('HttpOnly'))).toBe(true);
    });

    it('should pass validation for secure cookie', () => {
      const cookie = new SecureCookieBuilder('session', 'value');
      expect(cookie.validate().valid).toBe(true);
    });
  });
});

describe('Security Headers', () => {
  let builder: SecurityHeadersBuilder;

  beforeEach(() => {
    builder = new SecurityHeadersBuilder();
  });

  describe('Header Building', () => {
    it('should set HSTS', () => {
      builder.setStrictTransportSecurity(31536000, true, true);
      const headers = builder.build();
      expect(headers['Strict-Transport-Security']).toBe('max-age=31536000; includeSubDomains; preload');
    });

    it('should set X-Content-Type-Options', () => {
      builder.setXContentTypeOptions();
      expect(builder.build()['X-Content-Type-Options']).toBe('nosniff');
    });

    it('should set X-Frame-Options', () => {
      builder.setXFrameOptions('DENY');
      expect(builder.build()['X-Frame-Options']).toBe('DENY');
    });

    it('should set X-XSS-Protection', () => {
      builder.setXXSSProtection(true, 'block');
      expect(builder.build()['X-XSS-Protection']).toBe('1; mode=block');
    });

    it('should set Referrer-Policy', () => {
      builder.setReferrerPolicy('strict-origin-when-cross-origin');
      expect(builder.build()['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    });

    it('should set Permissions-Policy', () => {
      builder.setPermissionsPolicy({
        geolocation: [],
        camera: [],
        microphone: [],
      });
      const headers = builder.build();
      expect(headers['Permissions-Policy']).toContain('geolocation=()');
    });

    it('should set COOP', () => {
      builder.setCrossOriginOpenerPolicy('same-origin');
      expect(builder.build()['Cross-Origin-Opener-Policy']).toBe('same-origin');
    });

    it('should set COEP', () => {
      builder.setCrossOriginEmbedderPolicy('require-corp');
      expect(builder.build()['Cross-Origin-Embedder-Policy']).toBe('require-corp');
    });

    it('should set CORP', () => {
      builder.setCrossOriginResourcePolicy('same-origin');
      expect(builder.build()['Cross-Origin-Resource-Policy']).toBe('same-origin');
    });
  });

  describe('Header Validation', () => {
    it('should warn about missing HSTS', () => {
      const result = builder.validate();
      expect(result.warnings.some(w => w.includes('Strict-Transport-Security'))).toBe(true);
    });

    it('should warn about missing X-Content-Type-Options', () => {
      const result = builder.validate();
      expect(result.warnings.some(w => w.includes('X-Content-Type-Options'))).toBe(true);
    });

    it('should warn about missing clickjacking protection', () => {
      const result = builder.validate();
      expect(result.warnings.some(w => w.includes('clickjacking'))).toBe(true);
    });

    it('should pass validation with all headers set', () => {
      builder
        .setStrictTransportSecurity(31536000)
        .setXContentTypeOptions()
        .setXFrameOptions('DENY')
        .setReferrerPolicy('strict-origin');

      const result = builder.validate();
      expect(result.valid).toBe(true);
    });
  });
});
