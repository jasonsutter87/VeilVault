import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Certificate and PKI Security Tests
 * Testing certificate validation, chain verification, and PKI operations
 * Critical for secure communications in banking/audit applications
 */

// ============================================================================
// CERTIFICATE TYPES
// ============================================================================
interface Certificate {
  serialNumber: string;
  subject: {
    commonName: string;
    organization: string;
    organizationalUnit?: string;
    country?: string;
    state?: string;
    locality?: string;
  };
  issuer: {
    commonName: string;
    organization: string;
  };
  validFrom: Date;
  validTo: Date;
  publicKey: string;
  signature: string;
  signatureAlgorithm: string;
  keyUsage: string[];
  extendedKeyUsage?: string[];
  subjectAltNames?: string[];
  isCA: boolean;
  pathLenConstraint?: number;
  crlDistributionPoints?: string[];
  ocspResponderUrl?: string;
  fingerprint: {
    sha256: string;
    sha1: string;
  };
}

interface CertificateChain {
  certificates: Certificate[];
  rootCert: Certificate;
  intermediateCerts: Certificate[];
  leafCert: Certificate;
}

// ============================================================================
// CERTIFICATE VALIDATOR
// ============================================================================
class CertificateValidator {
  private trustedRoots: Map<string, Certificate>;
  private revokedCerts: Set<string>;
  private allowExpiredCerts: boolean;
  private requireOCSP: boolean;

  constructor(options: { allowExpiredCerts?: boolean; requireOCSP?: boolean } = {}) {
    this.trustedRoots = new Map();
    this.revokedCerts = new Set();
    this.allowExpiredCerts = options.allowExpiredCerts || false;
    this.requireOCSP = options.requireOCSP || false;
  }

  addTrustedRoot(cert: Certificate): void {
    this.trustedRoots.set(cert.fingerprint.sha256, cert);
  }

  revokeCertificate(serialNumber: string): void {
    this.revokedCerts.add(serialNumber);
  }

  validateCertificate(cert: Certificate): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check validity period
    const now = new Date();
    if (!this.allowExpiredCerts) {
      if (now < cert.validFrom) {
        errors.push('Certificate not yet valid');
      }
      if (now > cert.validTo) {
        errors.push('Certificate has expired');
      }
    }

    // Check revocation status
    if (this.revokedCerts.has(cert.serialNumber)) {
      errors.push('Certificate has been revoked');
    }

    // Validate key usage
    if (cert.keyUsage.length === 0) {
      errors.push('No key usage specified');
    }

    // Check signature algorithm
    const weakAlgorithms = ['md5', 'sha1'];
    if (weakAlgorithms.some(alg => cert.signatureAlgorithm.toLowerCase().includes(alg))) {
      errors.push('Weak signature algorithm');
    }

    // Check key strength (simplified - check public key length)
    if (cert.publicKey.length < 256) {
      errors.push('Weak key strength');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  validateChain(chain: CertificateChain): { valid: boolean; errors: string[]; path: string[] } {
    const errors: string[] = [];
    const path: string[] = [];

    // Validate each certificate in chain
    const allCerts = [chain.leafCert, ...chain.intermediateCerts, chain.rootCert];

    for (const cert of allCerts) {
      const result = this.validateCertificate(cert);
      if (!result.valid) {
        errors.push(...result.errors.map(e => `${cert.subject.commonName}: ${e}`));
      }
      path.push(cert.subject.commonName);
    }

    // Verify chain linkage
    for (let i = 0; i < allCerts.length - 1; i++) {
      const current = allCerts[i];
      const issuer = allCerts[i + 1];

      if (current.issuer.commonName !== issuer.subject.commonName) {
        errors.push(`Chain broken: ${current.subject.commonName} not issued by ${issuer.subject.commonName}`);
      }
    }

    // Verify root is trusted
    const rootFingerprint = chain.rootCert.fingerprint.sha256;
    if (!this.trustedRoots.has(rootFingerprint)) {
      errors.push('Root certificate not in trusted store');
    }

    // Check path length constraints
    for (let i = chain.intermediateCerts.length - 1; i >= 0; i--) {
      const cert = chain.intermediateCerts[i];
      if (cert.pathLenConstraint !== undefined) {
        if (i > cert.pathLenConstraint) {
          errors.push(`Path length constraint violated at ${cert.subject.commonName}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      path,
    };
  }

  validateHostname(cert: Certificate, hostname: string): boolean {
    // Check common name
    if (cert.subject.commonName === hostname) {
      return true;
    }

    // Check Subject Alternative Names
    if (cert.subjectAltNames) {
      for (const san of cert.subjectAltNames) {
        if (san === hostname) {
          return true;
        }

        // Handle wildcards
        if (san.startsWith('*.')) {
          const pattern = san.slice(2);
          const parts = hostname.split('.');
          if (parts.length > 1) {
            const hostDomain = parts.slice(1).join('.');
            if (hostDomain === pattern) {
              return true;
            }
          }
        }
      }
    }

    return false;
  }

  validateKeyUsage(cert: Certificate, requiredUsages: string[]): boolean {
    return requiredUsages.every(usage => cert.keyUsage.includes(usage));
  }

  validateExtendedKeyUsage(cert: Certificate, requiredUsages: string[]): boolean {
    if (!cert.extendedKeyUsage) return false;
    return requiredUsages.every(usage => cert.extendedKeyUsage!.includes(usage));
  }

  getCertificateAge(cert: Certificate): number {
    const now = new Date();
    const ageMs = now.getTime() - cert.validFrom.getTime();
    return Math.floor(ageMs / (1000 * 60 * 60 * 24)); // Days
  }

  getDaysUntilExpiry(cert: Certificate): number {
    const now = new Date();
    const remainingMs = cert.validTo.getTime() - now.getTime();
    return Math.floor(remainingMs / (1000 * 60 * 60 * 24)); // Days
  }

  isNearExpiry(cert: Certificate, thresholdDays: number = 30): boolean {
    return this.getDaysUntilExpiry(cert) <= thresholdDays;
  }
}

// ============================================================================
// CERTIFICATE PINNING
// ============================================================================
class CertificatePinning {
  private pins: Map<string, Set<string>>; // hostname -> Set of fingerprints
  private backupPins: Map<string, Set<string>>;

  constructor() {
    this.pins = new Map();
    this.backupPins = new Map();
  }

  addPin(hostname: string, fingerprint: string, isBackup: boolean = false): void {
    const pinSet = isBackup ? this.backupPins : this.pins;
    if (!pinSet.has(hostname)) {
      pinSet.set(hostname, new Set());
    }
    pinSet.get(hostname)!.add(fingerprint.toLowerCase());
  }

  removePin(hostname: string, fingerprint: string): void {
    this.pins.get(hostname)?.delete(fingerprint.toLowerCase());
    this.backupPins.get(hostname)?.delete(fingerprint.toLowerCase());
  }

  validatePin(hostname: string, cert: Certificate): { valid: boolean; usedBackup: boolean } {
    const primaryPins = this.pins.get(hostname);
    const backupPins = this.backupPins.get(hostname);

    const fingerprint = cert.fingerprint.sha256.toLowerCase();

    // Check primary pins
    if (primaryPins && primaryPins.has(fingerprint)) {
      return { valid: true, usedBackup: false };
    }

    // Check backup pins
    if (backupPins && backupPins.has(fingerprint)) {
      return { valid: true, usedBackup: true };
    }

    // No pins for this hostname = allow all
    if (!primaryPins && !backupPins) {
      return { valid: true, usedBackup: false };
    }

    return { valid: false, usedBackup: false };
  }

  hasPins(hostname: string): boolean {
    return this.pins.has(hostname) || this.backupPins.has(hostname);
  }
}

// ============================================================================
// CERTIFICATE TRANSPARENCY
// ============================================================================
class CertificateTransparency {
  private logs: Map<string, { url: string; publicKey: string }>;
  private sctRecords: Map<string, { timestamp: Date; logId: string; signature: string }[]>;

  constructor() {
    this.logs = new Map();
    this.sctRecords = new Map();
  }

  addLog(logId: string, url: string, publicKey: string): void {
    this.logs.set(logId, { url, publicKey });
  }

  addSCT(certFingerprint: string, sct: { timestamp: Date; logId: string; signature: string }): void {
    if (!this.sctRecords.has(certFingerprint)) {
      this.sctRecords.set(certFingerprint, []);
    }
    this.sctRecords.get(certFingerprint)!.push(sct);
  }

  validateSCT(cert: Certificate, minSCTs: number = 2): { valid: boolean; sctCount: number; errors: string[] } {
    const errors: string[] = [];
    const scts = this.sctRecords.get(cert.fingerprint.sha256) || [];

    if (scts.length < minSCTs) {
      errors.push(`Insufficient SCTs: found ${scts.length}, required ${minSCTs}`);
    }

    // Verify SCTs are from known logs
    for (const sct of scts) {
      if (!this.logs.has(sct.logId)) {
        errors.push(`Unknown CT log: ${sct.logId}`);
      }
    }

    // Check SCT timestamps
    const now = new Date();
    for (const sct of scts) {
      if (sct.timestamp > now) {
        errors.push('SCT timestamp is in the future');
      }
    }

    return {
      valid: errors.length === 0,
      sctCount: scts.length,
      errors,
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
function createMockCertificate(overrides: Partial<Certificate> = {}): Certificate {
  const now = new Date();
  const validFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const validTo = new Date(now.getTime() + 335 * 24 * 60 * 60 * 1000); // 335 days from now

  return {
    serialNumber: Math.random().toString(36).substring(2, 15),
    subject: {
      commonName: 'test.example.com',
      organization: 'Test Organization',
    },
    issuer: {
      commonName: 'Test CA',
      organization: 'Test CA Organization',
    },
    validFrom,
    validTo,
    publicKey: 'a'.repeat(512), // Simulated 4096-bit key
    signature: 'mock-signature',
    signatureAlgorithm: 'SHA256withRSA',
    keyUsage: ['digitalSignature', 'keyEncipherment'],
    isCA: false,
    fingerprint: {
      sha256: Math.random().toString(36).substring(2, 66),
      sha1: Math.random().toString(36).substring(2, 42),
    },
    ...overrides,
  };
}

function createMockChain(): CertificateChain {
  const root = createMockCertificate({
    subject: { commonName: 'Root CA', organization: 'Root Org' },
    issuer: { commonName: 'Root CA', organization: 'Root Org' },
    isCA: true,
    keyUsage: ['keyCertSign', 'cRLSign'],
  });

  const intermediate = createMockCertificate({
    subject: { commonName: 'Intermediate CA', organization: 'Intermediate Org' },
    issuer: { commonName: 'Root CA', organization: 'Root Org' },
    isCA: true,
    keyUsage: ['keyCertSign', 'cRLSign'],
    pathLenConstraint: 0,
  });

  const leaf = createMockCertificate({
    subject: { commonName: 'www.example.com', organization: 'Example Inc' },
    issuer: { commonName: 'Intermediate CA', organization: 'Intermediate Org' },
    isCA: false,
    keyUsage: ['digitalSignature', 'keyEncipherment'],
    extendedKeyUsage: ['serverAuth', 'clientAuth'],
    subjectAltNames: ['www.example.com', 'example.com', '*.example.com'],
  });

  return {
    certificates: [leaf, intermediate, root],
    rootCert: root,
    intermediateCerts: [intermediate],
    leafCert: leaf,
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe('Certificate Validation', () => {
  let validator: CertificateValidator;

  beforeEach(() => {
    validator = new CertificateValidator();
  });

  describe('Basic Certificate Validation', () => {
    it('should validate a valid certificate', () => {
      const cert = createMockCertificate();
      const result = validator.validateCertificate(cert);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject expired certificate', () => {
      const cert = createMockCertificate({
        validTo: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      });
      const result = validator.validateCertificate(cert);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Certificate has expired');
    });

    it('should reject not-yet-valid certificate', () => {
      const cert = createMockCertificate({
        validFrom: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      });
      const result = validator.validateCertificate(cert);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Certificate not yet valid');
    });

    it('should reject revoked certificate', () => {
      const cert = createMockCertificate();
      validator.revokeCertificate(cert.serialNumber);
      const result = validator.validateCertificate(cert);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Certificate has been revoked');
    });

    it('should reject weak signature algorithm (MD5)', () => {
      const cert = createMockCertificate({
        signatureAlgorithm: 'MD5withRSA',
      });
      const result = validator.validateCertificate(cert);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Weak signature algorithm');
    });

    it('should reject weak signature algorithm (SHA1)', () => {
      const cert = createMockCertificate({
        signatureAlgorithm: 'SHA1withRSA',
      });
      const result = validator.validateCertificate(cert);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Weak signature algorithm');
    });

    it('should reject certificate with no key usage', () => {
      const cert = createMockCertificate({
        keyUsage: [],
      });
      const result = validator.validateCertificate(cert);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('No key usage specified');
    });

    it('should reject weak key strength', () => {
      const cert = createMockCertificate({
        publicKey: 'weak', // Too short
      });
      const result = validator.validateCertificate(cert);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Weak key strength');
    });

    it('should allow expired certs when configured', () => {
      const validator = new CertificateValidator({ allowExpiredCerts: true });
      const cert = createMockCertificate({
        validTo: new Date(Date.now() - 24 * 60 * 60 * 1000),
      });
      const result = validator.validateCertificate(cert);
      expect(result.errors).not.toContain('Certificate has expired');
    });
  });

  describe('Certificate Chain Validation', () => {
    it('should validate a complete chain', () => {
      const chain = createMockChain();
      validator.addTrustedRoot(chain.rootCert);
      const result = validator.validateChain(chain);
      expect(result.valid).toBe(true);
      expect(result.path).toHaveLength(3);
    });

    it('should reject chain with untrusted root', () => {
      const chain = createMockChain();
      // Don't add root to trusted store
      const result = validator.validateChain(chain);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('not in trusted store'))).toBe(true);
    });

    it('should reject broken chain', () => {
      const chain = createMockChain();
      // Break the chain by modifying intermediate issuer
      chain.intermediateCerts[0].issuer.commonName = 'Unknown CA';
      validator.addTrustedRoot(chain.rootCert);
      const result = validator.validateChain(chain);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Chain broken'))).toBe(true);
    });

    it('should report all errors in chain', () => {
      const chain = createMockChain();
      // Add multiple issues
      chain.leafCert.validTo = new Date(Date.now() - 24 * 60 * 60 * 1000); // Expired
      validator.revokeCertificate(chain.intermediateCerts[0].serialNumber); // Revoked
      validator.addTrustedRoot(chain.rootCert);

      const result = validator.validateChain(chain);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('Hostname Validation', () => {
    it('should match exact hostname', () => {
      const cert = createMockCertificate({
        subject: { commonName: 'www.example.com', organization: 'Test' },
      });
      expect(validator.validateHostname(cert, 'www.example.com')).toBe(true);
    });

    it('should match hostname in SAN', () => {
      const cert = createMockCertificate({
        subject: { commonName: 'example.com', organization: 'Test' },
        subjectAltNames: ['www.example.com', 'api.example.com'],
      });
      expect(validator.validateHostname(cert, 'api.example.com')).toBe(true);
    });

    it('should match wildcard certificate', () => {
      const cert = createMockCertificate({
        subject: { commonName: '*.example.com', organization: 'Test' },
        subjectAltNames: ['*.example.com'],
      });
      expect(validator.validateHostname(cert, 'www.example.com')).toBe(true);
      expect(validator.validateHostname(cert, 'api.example.com')).toBe(true);
    });

    it('should not match unrelated hostname', () => {
      const cert = createMockCertificate({
        subject: { commonName: 'www.example.com', organization: 'Test' },
      });
      expect(validator.validateHostname(cert, 'www.other.com')).toBe(false);
    });

    it('should not allow wildcard to match apex domain', () => {
      const cert = createMockCertificate({
        subjectAltNames: ['*.example.com'],
      });
      expect(validator.validateHostname(cert, 'example.com')).toBe(false);
    });
  });

  describe('Key Usage Validation', () => {
    it('should validate required key usages', () => {
      const cert = createMockCertificate({
        keyUsage: ['digitalSignature', 'keyEncipherment', 'dataEncipherment'],
      });
      expect(validator.validateKeyUsage(cert, ['digitalSignature'])).toBe(true);
      expect(validator.validateKeyUsage(cert, ['digitalSignature', 'keyEncipherment'])).toBe(true);
    });

    it('should reject missing key usage', () => {
      const cert = createMockCertificate({
        keyUsage: ['digitalSignature'],
      });
      expect(validator.validateKeyUsage(cert, ['keyEncipherment'])).toBe(false);
    });

    it('should validate extended key usage', () => {
      const cert = createMockCertificate({
        extendedKeyUsage: ['serverAuth', 'clientAuth'],
      });
      expect(validator.validateExtendedKeyUsage(cert, ['serverAuth'])).toBe(true);
    });

    it('should reject missing extended key usage', () => {
      const cert = createMockCertificate({
        extendedKeyUsage: ['serverAuth'],
      });
      expect(validator.validateExtendedKeyUsage(cert, ['clientAuth'])).toBe(false);
    });
  });

  describe('Certificate Age and Expiry', () => {
    it('should calculate certificate age', () => {
      const validFrom = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000); // 100 days ago
      const cert = createMockCertificate({ validFrom });
      const age = validator.getCertificateAge(cert);
      expect(age).toBeGreaterThanOrEqual(99);
      expect(age).toBeLessThanOrEqual(101);
    });

    it('should calculate days until expiry', () => {
      const validTo = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days from now
      const cert = createMockCertificate({ validTo });
      const days = validator.getDaysUntilExpiry(cert);
      expect(days).toBeGreaterThanOrEqual(59);
      expect(days).toBeLessThanOrEqual(61);
    });

    it('should detect near-expiry certificate', () => {
      const validTo = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000); // 15 days from now
      const cert = createMockCertificate({ validTo });
      expect(validator.isNearExpiry(cert, 30)).toBe(true);
      expect(validator.isNearExpiry(cert, 10)).toBe(false);
    });
  });
});

describe('Certificate Pinning', () => {
  let pinning: CertificatePinning;

  beforeEach(() => {
    pinning = new CertificatePinning();
  });

  describe('Pin Management', () => {
    it('should add and validate primary pin', () => {
      const cert = createMockCertificate();
      pinning.addPin('example.com', cert.fingerprint.sha256);

      const result = pinning.validatePin('example.com', cert);
      expect(result.valid).toBe(true);
      expect(result.usedBackup).toBe(false);
    });

    it('should add and validate backup pin', () => {
      const cert = createMockCertificate();
      pinning.addPin('example.com', cert.fingerprint.sha256, true);

      const result = pinning.validatePin('example.com', cert);
      expect(result.valid).toBe(true);
      expect(result.usedBackup).toBe(true);
    });

    it('should prefer primary pin over backup', () => {
      const primaryCert = createMockCertificate();
      const backupCert = createMockCertificate();

      pinning.addPin('example.com', primaryCert.fingerprint.sha256, false);
      pinning.addPin('example.com', backupCert.fingerprint.sha256, true);

      const resultPrimary = pinning.validatePin('example.com', primaryCert);
      expect(resultPrimary.valid).toBe(true);
      expect(resultPrimary.usedBackup).toBe(false);

      const resultBackup = pinning.validatePin('example.com', backupCert);
      expect(resultBackup.valid).toBe(true);
      expect(resultBackup.usedBackup).toBe(true);
    });

    it('should reject unpinned certificate', () => {
      const pinnedCert = createMockCertificate();
      const unpinnedCert = createMockCertificate();

      pinning.addPin('example.com', pinnedCert.fingerprint.sha256);

      const result = pinning.validatePin('example.com', unpinnedCert);
      expect(result.valid).toBe(false);
    });

    it('should allow any certificate for unpinned hosts', () => {
      const cert = createMockCertificate();
      const result = pinning.validatePin('unpinned.com', cert);
      expect(result.valid).toBe(true);
    });

    it('should remove pins', () => {
      const cert = createMockCertificate();
      pinning.addPin('example.com', cert.fingerprint.sha256);
      pinning.removePin('example.com', cert.fingerprint.sha256);

      // After removing only pin, should allow any cert
      const result = pinning.validatePin('example.com', cert);
      expect(result.valid).toBe(true);
    });

    it('should check if hostname has pins', () => {
      const cert = createMockCertificate();
      expect(pinning.hasPins('example.com')).toBe(false);

      pinning.addPin('example.com', cert.fingerprint.sha256);
      expect(pinning.hasPins('example.com')).toBe(true);
    });

    it('should handle case-insensitive fingerprints', () => {
      const cert = createMockCertificate({
        fingerprint: {
          sha256: 'ABCDEF123456',
          sha1: 'test',
        },
      });

      pinning.addPin('example.com', 'abcdef123456'); // lowercase
      const result = pinning.validatePin('example.com', cert);
      expect(result.valid).toBe(true);
    });
  });
});

describe('Certificate Transparency', () => {
  let ct: CertificateTransparency;

  beforeEach(() => {
    ct = new CertificateTransparency();
    ct.addLog('log1', 'https://ct.example.com/log1', 'public-key-1');
    ct.addLog('log2', 'https://ct.example.com/log2', 'public-key-2');
    ct.addLog('log3', 'https://ct.example.com/log3', 'public-key-3');
  });

  describe('SCT Validation', () => {
    it('should validate certificate with sufficient SCTs', () => {
      const cert = createMockCertificate();

      ct.addSCT(cert.fingerprint.sha256, {
        timestamp: new Date(Date.now() - 1000),
        logId: 'log1',
        signature: 'sig1',
      });
      ct.addSCT(cert.fingerprint.sha256, {
        timestamp: new Date(Date.now() - 2000),
        logId: 'log2',
        signature: 'sig2',
      });

      const result = ct.validateSCT(cert, 2);
      expect(result.valid).toBe(true);
      expect(result.sctCount).toBe(2);
    });

    it('should reject certificate with insufficient SCTs', () => {
      const cert = createMockCertificate();

      ct.addSCT(cert.fingerprint.sha256, {
        timestamp: new Date(),
        logId: 'log1',
        signature: 'sig1',
      });

      const result = ct.validateSCT(cert, 2);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Insufficient SCTs'))).toBe(true);
    });

    it('should reject SCT from unknown log', () => {
      const cert = createMockCertificate();

      ct.addSCT(cert.fingerprint.sha256, {
        timestamp: new Date(),
        logId: 'unknown-log',
        signature: 'sig1',
      });
      ct.addSCT(cert.fingerprint.sha256, {
        timestamp: new Date(),
        logId: 'log1',
        signature: 'sig2',
      });

      const result = ct.validateSCT(cert, 2);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Unknown CT log'))).toBe(true);
    });

    it('should reject SCT with future timestamp', () => {
      const cert = createMockCertificate();

      ct.addSCT(cert.fingerprint.sha256, {
        timestamp: new Date(Date.now() + 60000), // 1 minute in future
        logId: 'log1',
        signature: 'sig1',
      });
      ct.addSCT(cert.fingerprint.sha256, {
        timestamp: new Date(),
        logId: 'log2',
        signature: 'sig2',
      });

      const result = ct.validateSCT(cert, 2);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('future'))).toBe(true);
    });

    it('should report certificate with no SCTs', () => {
      const cert = createMockCertificate();
      const result = ct.validateSCT(cert, 2);
      expect(result.valid).toBe(false);
      expect(result.sctCount).toBe(0);
    });
  });
});

describe('Certificate Security Edge Cases', () => {
  let validator: CertificateValidator;

  beforeEach(() => {
    validator = new CertificateValidator();
  });

  describe('Path Length Constraints', () => {
    it('should enforce path length constraint of 0', () => {
      const root = createMockCertificate({
        subject: { commonName: 'Root CA', organization: 'Root' },
        issuer: { commonName: 'Root CA', organization: 'Root' },
        isCA: true,
        keyUsage: ['keyCertSign'],
      });

      const intermediate1 = createMockCertificate({
        subject: { commonName: 'Intermediate 1', organization: 'Int' },
        issuer: { commonName: 'Root CA', organization: 'Root' },
        isCA: true,
        keyUsage: ['keyCertSign'],
        pathLenConstraint: 0, // No more intermediates allowed
      });

      const intermediate2 = createMockCertificate({
        subject: { commonName: 'Intermediate 2', organization: 'Int' },
        issuer: { commonName: 'Intermediate 1', organization: 'Int' },
        isCA: true,
        keyUsage: ['keyCertSign'],
      });

      const leaf = createMockCertificate({
        subject: { commonName: 'leaf.example.com', organization: 'Leaf' },
        issuer: { commonName: 'Intermediate 2', organization: 'Int' },
      });

      const chain: CertificateChain = {
        certificates: [leaf, intermediate2, intermediate1, root],
        rootCert: root,
        intermediateCerts: [intermediate2, intermediate1],
        leafCert: leaf,
      };

      validator.addTrustedRoot(root);
      const result = validator.validateChain(chain);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Path length constraint'))).toBe(true);
    });
  });

  describe('Self-Signed Certificates', () => {
    it('should handle self-signed certificate', () => {
      const selfSigned = createMockCertificate({
        subject: { commonName: 'Self Signed', organization: 'Self' },
        issuer: { commonName: 'Self Signed', organization: 'Self' },
        isCA: true,
        keyUsage: ['digitalSignature', 'keyCertSign'],
      });

      const result = validator.validateCertificate(selfSigned);
      // Should be valid as a certificate itself
      expect(result.valid).toBe(true);
    });
  });

  describe('Multiple Validation Failures', () => {
    it('should report all validation failures', () => {
      const cert = createMockCertificate({
        validTo: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired
        signatureAlgorithm: 'MD5withRSA', // Weak
        keyUsage: [], // No key usage
        publicKey: 'weak', // Weak key
      });

      validator.revokeCertificate(cert.serialNumber);
      const result = validator.validateCertificate(cert);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Boundary Conditions', () => {
    it('should handle certificate exactly at validity boundary', () => {
      const now = new Date();
      const cert = createMockCertificate({
        validFrom: now,
        validTo: new Date(now.getTime() + 1), // Valid for 1ms
      });

      const result = validator.validateCertificate(cert);
      // Should be valid at exact boundary
      expect(result.valid).toBe(true);
    });

    it('should handle very long validity periods', () => {
      const cert = createMockCertificate({
        validTo: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000), // 100 years
      });

      const result = validator.validateCertificate(cert);
      expect(result.valid).toBe(true);
    });
  });
});
