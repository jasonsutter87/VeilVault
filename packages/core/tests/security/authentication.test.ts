// ==========================================================================
// AUTHENTICATION TESTS
// Comprehensive tests for authentication mechanisms
// Critical for banking/audit application security
// ==========================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as crypto from 'crypto';

// Mock authentication utilities
const hashPassword = (password: string, salt: string): string => {
  return crypto.pbkdf2Sync(password, salt, 310000, 32, 'sha256').toString('hex');
};

const generateSalt = (): string => {
  return crypto.randomBytes(16).toString('hex');
};

const verifyPassword = (password: string, hash: string, salt: string): boolean => {
  const computed = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash));
};

const generateToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

const isValidToken = (token: string): boolean => {
  return /^[a-f0-9]{64}$/.test(token);
};

// Password policy
const validatePasswordPolicy = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < 12) {
    errors.push('Password must be at least 12 characters');
  }
  if (password.length > 128) {
    errors.push('Password must be at most 128 characters');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Password must not contain more than 2 consecutive identical characters');
  }
  if (/^[a-zA-Z]+$/.test(password) || /^[0-9]+$/.test(password)) {
    errors.push('Password must not be only letters or only numbers');
  }

  // Check for common passwords
  const commonPasswords = ['password', 'qwerty', '123456', 'letmein', 'admin', 'welcome'];
  if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
    errors.push('Password must not contain common password patterns');
  }

  return { valid: errors.length === 0, errors };
};

// Session management
interface Session {
  id: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
}

const createSession = (userId: string, ipAddress: string, userAgent: string, durationMinutes: number = 30): Session => {
  const now = new Date();
  return {
    id: generateToken(),
    userId,
    createdAt: now,
    expiresAt: new Date(now.getTime() + durationMinutes * 60 * 1000),
    ipAddress,
    userAgent,
    isActive: true,
  };
};

const isSessionValid = (session: Session, currentIp: string, currentUserAgent: string): boolean => {
  const now = new Date();
  return session.isActive &&
         session.expiresAt > now &&
         session.ipAddress === currentIp &&
         session.userAgent === currentUserAgent;
};

describe('Password Hashing', () => {
  describe('Hash generation', () => {
    it('should generate unique salts', () => {
      const salt1 = generateSalt();
      const salt2 = generateSalt();
      expect(salt1).not.toBe(salt2);
    });

    it('should generate salt of correct length', () => {
      const salt = generateSalt();
      expect(salt).toHaveLength(32); // 16 bytes = 32 hex chars
    });

    it('should generate different hashes for same password with different salts', () => {
      const password = 'SecureP@ssw0rd!';
      const salt1 = generateSalt();
      const salt2 = generateSalt();
      const hash1 = hashPassword(password, salt1);
      const hash2 = hashPassword(password, salt2);
      expect(hash1).not.toBe(hash2);
    });

    it('should generate consistent hashes for same password and salt', () => {
      const password = 'SecureP@ssw0rd!';
      const salt = generateSalt();
      const hash1 = hashPassword(password, salt);
      const hash2 = hashPassword(password, salt);
      expect(hash1).toBe(hash2);
    });

    it('should generate hash of correct length', () => {
      const password = 'SecureP@ssw0rd!';
      const salt = generateSalt();
      const hash = hashPassword(password, salt);
      expect(hash).toHaveLength(64); // 32 bytes = 64 hex chars
    });
  });

  describe('Password verification', () => {
    it('should verify correct password', () => {
      const password = 'SecureP@ssw0rd!';
      const salt = generateSalt();
      const hash = hashPassword(password, salt);
      expect(verifyPassword(password, hash, salt)).toBe(true);
    });

    it('should reject incorrect password', () => {
      const password = 'SecureP@ssw0rd!';
      const wrongPassword = 'WrongP@ssw0rd!';
      const salt = generateSalt();
      const hash = hashPassword(password, salt);
      expect(verifyPassword(wrongPassword, hash, salt)).toBe(false);
    });

    it('should reject password with wrong salt', () => {
      const password = 'SecureP@ssw0rd!';
      const salt = generateSalt();
      const wrongSalt = generateSalt();
      const hash = hashPassword(password, salt);
      expect(verifyPassword(password, hash, wrongSalt)).toBe(false);
    });

    it('should be resistant to timing attacks', () => {
      // This tests that we use constant-time comparison
      const password = 'SecureP@ssw0rd!';
      const salt = generateSalt();
      const hash = hashPassword(password, salt);

      // Measure time for correct password
      const start1 = process.hrtime.bigint();
      verifyPassword(password, hash, salt);
      const time1 = process.hrtime.bigint() - start1;

      // Measure time for wrong password (same length)
      const start2 = process.hrtime.bigint();
      verifyPassword('WrongP@ssw0rd!', hash, salt);
      const time2 = process.hrtime.bigint() - start2;

      // Times should be similar (within 10x, accounting for JIT)
      const ratio = Number(time1) / Number(time2);
      expect(ratio).toBeGreaterThan(0.1);
      expect(ratio).toBeLessThan(10);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty password', () => {
      const password = '';
      const salt = generateSalt();
      const hash = hashPassword(password, salt);
      expect(hash).toHaveLength(64);
      expect(verifyPassword(password, hash, salt)).toBe(true);
    });

    it('should handle very long password', () => {
      const password = 'a'.repeat(10000);
      const salt = generateSalt();
      const hash = hashPassword(password, salt);
      expect(verifyPassword(password, hash, salt)).toBe(true);
    });

    it('should handle unicode password', () => {
      const password = 'Пароль密码🔐!123';
      const salt = generateSalt();
      const hash = hashPassword(password, salt);
      expect(verifyPassword(password, hash, salt)).toBe(true);
    });

    it('should handle password with null bytes', () => {
      const password = 'pass\x00word';
      const salt = generateSalt();
      const hash = hashPassword(password, salt);
      expect(verifyPassword(password, hash, salt)).toBe(true);
    });
  });
});

describe('Password Policy', () => {
  describe('Valid passwords', () => {
    const validPasswords = [
      'SecureP@ss123!',
      'MyStr0ng!Pass',
      'C0mplex#Passw0rd',
      'Audit2024!@#$',
      'B@nking$ecure1',
    ];

    validPasswords.forEach(password => {
      it(`should accept valid password: ${password}`, () => {
        const result = validatePasswordPolicy(password);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });
  });

  describe('Invalid passwords - too short', () => {
    it('should reject password shorter than 12 characters', () => {
      const result = validatePasswordPolicy('Short!1');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 12 characters');
    });
  });

  describe('Invalid passwords - missing requirements', () => {
    it('should reject password without lowercase', () => {
      const result = validatePasswordPolicy('ALLUPPERCASE123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without uppercase', () => {
      const result = validatePasswordPolicy('alllowercase123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without number', () => {
      const result = validatePasswordPolicy('NoNumbersHere!@');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject password without special character', () => {
      const result = validatePasswordPolicy('NoSpecialChar123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });
  });

  describe('Invalid passwords - patterns', () => {
    it('should reject password with consecutive characters', () => {
      const result = validatePasswordPolicy('Passsword111!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must not contain more than 2 consecutive identical characters');
    });

    it('should reject password containing "password"', () => {
      const result = validatePasswordPolicy('MyPassword123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must not contain common password patterns');
    });

    it('should reject password containing "admin"', () => {
      const result = validatePasswordPolicy('AdminUser123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must not contain common password patterns');
    });
  });

  describe('Too long passwords', () => {
    it('should reject password longer than 128 characters', () => {
      const result = validatePasswordPolicy('Aa1!' + 'a'.repeat(130));
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at most 128 characters');
    });
  });
});

describe('Token Generation', () => {
  it('should generate unique tokens', () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      const token = generateToken();
      expect(tokens.has(token)).toBe(false);
      tokens.add(token);
    }
  });

  it('should generate tokens of correct length', () => {
    const token = generateToken();
    expect(token).toHaveLength(64); // 32 bytes = 64 hex chars
  });

  it('should generate valid hex tokens', () => {
    const token = generateToken();
    expect(isValidToken(token)).toBe(true);
  });

  it('should reject invalid tokens', () => {
    expect(isValidToken('')).toBe(false);
    expect(isValidToken('too-short')).toBe(false);
    expect(isValidToken('g'.repeat(64))).toBe(false); // 'g' is not hex
    expect(isValidToken('a'.repeat(63))).toBe(false);
    expect(isValidToken('a'.repeat(65))).toBe(false);
  });
});

describe('Session Management', () => {
  let session: Session;
  const userId = 'user-123';
  const ipAddress = '192.168.1.100';
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';

  beforeEach(() => {
    session = createSession(userId, ipAddress, userAgent, 30);
  });

  describe('Session creation', () => {
    it('should create session with valid ID', () => {
      expect(isValidToken(session.id)).toBe(true);
    });

    it('should set correct user ID', () => {
      expect(session.userId).toBe(userId);
    });

    it('should set correct expiration time', () => {
      const expectedExpiry = session.createdAt.getTime() + 30 * 60 * 1000;
      expect(session.expiresAt.getTime()).toBe(expectedExpiry);
    });

    it('should bind session to IP address', () => {
      expect(session.ipAddress).toBe(ipAddress);
    });

    it('should bind session to user agent', () => {
      expect(session.userAgent).toBe(userAgent);
    });

    it('should create active session', () => {
      expect(session.isActive).toBe(true);
    });
  });

  describe('Session validation', () => {
    it('should validate active session with correct credentials', () => {
      expect(isSessionValid(session, ipAddress, userAgent)).toBe(true);
    });

    it('should reject session with wrong IP', () => {
      expect(isSessionValid(session, '10.0.0.1', userAgent)).toBe(false);
    });

    it('should reject session with wrong user agent', () => {
      expect(isSessionValid(session, ipAddress, 'Different Browser')).toBe(false);
    });

    it('should reject inactive session', () => {
      session.isActive = false;
      expect(isSessionValid(session, ipAddress, userAgent)).toBe(false);
    });

    it('should reject expired session', () => {
      session.expiresAt = new Date(Date.now() - 1000);
      expect(isSessionValid(session, ipAddress, userAgent)).toBe(false);
    });
  });

  describe('Session timeout', () => {
    it('should create session with custom duration', () => {
      const shortSession = createSession(userId, ipAddress, userAgent, 5);
      const expectedExpiry = shortSession.createdAt.getTime() + 5 * 60 * 1000;
      expect(shortSession.expiresAt.getTime()).toBe(expectedExpiry);
    });

    it('should expire session after timeout', () => {
      vi.useFakeTimers();
      const testSession = createSession(userId, ipAddress, userAgent, 1);

      expect(isSessionValid(testSession, ipAddress, userAgent)).toBe(true);

      // Advance time by 61 seconds
      vi.advanceTimersByTime(61 * 1000);

      expect(isSessionValid(testSession, ipAddress, userAgent)).toBe(false);

      vi.useRealTimers();
    });
  });
});

describe('Brute Force Protection', () => {
  interface LoginAttempt {
    timestamp: Date;
    success: boolean;
  }

  const loginAttempts: Map<string, LoginAttempt[]> = new Map();

  const recordLoginAttempt = (userId: string, success: boolean): void => {
    const attempts = loginAttempts.get(userId) || [];
    attempts.push({ timestamp: new Date(), success });
    loginAttempts.set(userId, attempts);
  };

  const isAccountLocked = (userId: string, maxAttempts: number = 5, windowMinutes: number = 15): boolean => {
    const attempts = loginAttempts.get(userId) || [];
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

    const recentFailures = attempts.filter(
      a => !a.success && a.timestamp > windowStart
    );

    return recentFailures.length >= maxAttempts;
  };

  const getWaitTime = (userId: string): number => {
    const attempts = loginAttempts.get(userId) || [];
    const recentFailures = attempts.filter(a => !a.success).length;

    // Exponential backoff: 2^failures seconds, max 1 hour
    return Math.min(Math.pow(2, recentFailures) * 1000, 3600 * 1000);
  };

  beforeEach(() => {
    loginAttempts.clear();
  });

  it('should allow login with no previous attempts', () => {
    expect(isAccountLocked('user-1')).toBe(false);
  });

  it('should not lock account after few failed attempts', () => {
    for (let i = 0; i < 3; i++) {
      recordLoginAttempt('user-2', false);
    }
    expect(isAccountLocked('user-2')).toBe(false);
  });

  it('should lock account after max failed attempts', () => {
    for (let i = 0; i < 5; i++) {
      recordLoginAttempt('user-3', false);
    }
    expect(isAccountLocked('user-3')).toBe(true);
  });

  it('should not count successful attempts toward lockout', () => {
    for (let i = 0; i < 3; i++) {
      recordLoginAttempt('user-4', false);
    }
    recordLoginAttempt('user-4', true);
    for (let i = 0; i < 3; i++) {
      recordLoginAttempt('user-4', false);
    }
    // Only 6 failures, but not consecutive in time window context
    expect(isAccountLocked('user-4', 5)).toBe(true);
  });

  it('should implement exponential backoff', () => {
    recordLoginAttempt('user-5', false);
    expect(getWaitTime('user-5')).toBe(2000);

    recordLoginAttempt('user-5', false);
    expect(getWaitTime('user-5')).toBe(4000);

    recordLoginAttempt('user-5', false);
    expect(getWaitTime('user-5')).toBe(8000);
  });

  it('should cap exponential backoff at 1 hour', () => {
    for (let i = 0; i < 20; i++) {
      recordLoginAttempt('user-6', false);
    }
    expect(getWaitTime('user-6')).toBe(3600 * 1000);
  });
});

describe('Multi-Factor Authentication', () => {
  const generateTOTPSecret = (): string => {
    return crypto.randomBytes(20).toString('base64');
  };

  const generateTOTP = (secret: string, timeStep: number = 30): string => {
    const time = Math.floor(Date.now() / 1000 / timeStep);
    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeBigUInt64BE(BigInt(time));

    const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'base64'));
    hmac.update(timeBuffer);
    const hash = hmac.digest();

    const offset = hash[hash.length - 1] & 0x0f;
    const code = ((hash[offset] & 0x7f) << 24 |
                  (hash[offset + 1] & 0xff) << 16 |
                  (hash[offset + 2] & 0xff) << 8 |
                  (hash[offset + 3] & 0xff)) % 1000000;

    return code.toString().padStart(6, '0');
  };

  const verifyTOTP = (secret: string, code: string, window: number = 1): boolean => {
    for (let i = -window; i <= window; i++) {
      const time = Math.floor(Date.now() / 1000 / 30) + i;
      const timeBuffer = Buffer.alloc(8);
      timeBuffer.writeBigUInt64BE(BigInt(time));

      const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'base64'));
      hmac.update(timeBuffer);
      const hash = hmac.digest();

      const offset = hash[hash.length - 1] & 0x0f;
      const expectedCode = ((hash[offset] & 0x7f) << 24 |
                            (hash[offset + 1] & 0xff) << 16 |
                            (hash[offset + 2] & 0xff) << 8 |
                            (hash[offset + 3] & 0xff)) % 1000000;

      if (code === expectedCode.toString().padStart(6, '0')) {
        return true;
      }
    }
    return false;
  };

  describe('TOTP Generation', () => {
    it('should generate 6-digit codes', () => {
      const secret = generateTOTPSecret();
      const code = generateTOTP(secret);
      expect(code).toMatch(/^\d{6}$/);
    });

    it('should generate different codes for different secrets', () => {
      const secret1 = generateTOTPSecret();
      const secret2 = generateTOTPSecret();
      const code1 = generateTOTP(secret1);
      const code2 = generateTOTP(secret2);
      expect(code1).not.toBe(code2);
    });

    it('should generate consistent codes for same secret and time', () => {
      const secret = generateTOTPSecret();
      const code1 = generateTOTP(secret);
      const code2 = generateTOTP(secret);
      expect(code1).toBe(code2);
    });
  });

  describe('TOTP Verification', () => {
    it('should verify correct current code', () => {
      const secret = generateTOTPSecret();
      const code = generateTOTP(secret);
      expect(verifyTOTP(secret, code)).toBe(true);
    });

    it('should reject incorrect code', () => {
      const secret = generateTOTPSecret();
      expect(verifyTOTP(secret, '000000')).toBe(false);
      expect(verifyTOTP(secret, '123456')).toBe(false);
    });

    it('should reject code with wrong secret', () => {
      const secret1 = generateTOTPSecret();
      const secret2 = generateTOTPSecret();
      const code = generateTOTP(secret1);
      expect(verifyTOTP(secret2, code)).toBe(false);
    });

    it('should accept code within time window', () => {
      const secret = generateTOTPSecret();
      const code = generateTOTP(secret);
      expect(verifyTOTP(secret, code, 1)).toBe(true);
    });

    it('should reject non-numeric codes', () => {
      const secret = generateTOTPSecret();
      expect(verifyTOTP(secret, 'abcdef')).toBe(false);
      expect(verifyTOTP(secret, '12345a')).toBe(false);
    });

    it('should reject codes of wrong length', () => {
      const secret = generateTOTPSecret();
      expect(verifyTOTP(secret, '12345')).toBe(false);
      expect(verifyTOTP(secret, '1234567')).toBe(false);
    });
  });

  describe('Backup Codes', () => {
    const generateBackupCodes = (count: number = 10): string[] => {
      const codes: string[] = [];
      for (let i = 0; i < count; i++) {
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();
        codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
      }
      return codes;
    };

    it('should generate requested number of backup codes', () => {
      const codes = generateBackupCodes(10);
      expect(codes).toHaveLength(10);
    });

    it('should generate unique backup codes', () => {
      const codes = generateBackupCodes(100);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(100);
    });

    it('should generate codes in correct format', () => {
      const codes = generateBackupCodes(10);
      codes.forEach(code => {
        expect(code).toMatch(/^[A-F0-9]{4}-[A-F0-9]{4}$/);
      });
    });
  });
});

describe('JWT-like Token Validation', () => {
  interface TokenPayload {
    sub: string;
    iat: number;
    exp: number;
    iss: string;
    aud: string;
    roles: string[];
  }

  const createToken = (payload: Omit<TokenPayload, 'iat' | 'exp'>, expiresInSeconds: number = 3600): string => {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);

    const fullPayload: TokenPayload = {
      ...payload,
      iat: now,
      exp: now + expiresInSeconds,
    };

    const headerBase64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const payloadBase64 = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');

    const signature = crypto
      .createHmac('sha256', 'test-secret-key')
      .update(`${headerBase64}.${payloadBase64}`)
      .digest('base64url');

    return `${headerBase64}.${payloadBase64}.${signature}`;
  };

  const validateToken = (token: string): { valid: boolean; payload?: TokenPayload; error?: string } => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return { valid: false, error: 'Invalid token format' };
      }

      const [headerBase64, payloadBase64, signature] = parts;

      // Verify signature
      const expectedSignature = crypto
        .createHmac('sha256', 'test-secret-key')
        .update(`${headerBase64}.${payloadBase64}`)
        .digest('base64url');

      if (signature !== expectedSignature) {
        return { valid: false, error: 'Invalid signature' };
      }

      // Decode payload
      const payload: TokenPayload = JSON.parse(
        Buffer.from(payloadBase64, 'base64url').toString()
      );

      // Check expiration
      if (payload.exp < Math.floor(Date.now() / 1000)) {
        return { valid: false, error: 'Token expired' };
      }

      // Check issued at (not in future)
      if (payload.iat > Math.floor(Date.now() / 1000) + 60) {
        return { valid: false, error: 'Token issued in future' };
      }

      return { valid: true, payload };
    } catch (error) {
      return { valid: false, error: 'Token parsing failed' };
    }
  };

  describe('Token creation', () => {
    it('should create valid token format', () => {
      const token = createToken({
        sub: 'user-123',
        iss: 'veilvault',
        aud: 'veilvault-api',
        roles: ['auditor'],
      });

      const parts = token.split('.');
      expect(parts).toHaveLength(3);
    });

    it('should include all required claims', () => {
      const token = createToken({
        sub: 'user-123',
        iss: 'veilvault',
        aud: 'veilvault-api',
        roles: ['auditor'],
      });

      const result = validateToken(token);
      expect(result.valid).toBe(true);
      expect(result.payload?.sub).toBe('user-123');
      expect(result.payload?.iss).toBe('veilvault');
      expect(result.payload?.aud).toBe('veilvault-api');
      expect(result.payload?.roles).toContain('auditor');
    });
  });

  describe('Token validation', () => {
    it('should validate correct token', () => {
      const token = createToken({
        sub: 'user-123',
        iss: 'veilvault',
        aud: 'veilvault-api',
        roles: ['auditor'],
      });

      const result = validateToken(token);
      expect(result.valid).toBe(true);
    });

    it('should reject token with invalid signature', () => {
      const token = createToken({
        sub: 'user-123',
        iss: 'veilvault',
        aud: 'veilvault-api',
        roles: ['auditor'],
      });

      // Tamper with signature
      const tamperedToken = token.slice(0, -5) + 'XXXXX';
      const result = validateToken(tamperedToken);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid signature');
    });

    it('should reject expired token', () => {
      const token = createToken({
        sub: 'user-123',
        iss: 'veilvault',
        aud: 'veilvault-api',
        roles: ['auditor'],
      }, -3600); // Already expired

      const result = validateToken(token);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token expired');
    });

    it('should reject malformed token', () => {
      expect(validateToken('not.a.valid.token').valid).toBe(false);
      expect(validateToken('').valid).toBe(false);
      expect(validateToken('no-dots').valid).toBe(false);
    });

    it('should reject token with tampered payload', () => {
      const token = createToken({
        sub: 'user-123',
        iss: 'veilvault',
        aud: 'veilvault-api',
        roles: ['auditor'],
      });

      // Modify payload
      const parts = token.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      payload.roles = ['admin']; // Attempt privilege escalation
      const tamperedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

      const result = validateToken(tamperedToken);
      expect(result.valid).toBe(false);
    });
  });
});
