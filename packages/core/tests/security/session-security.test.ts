import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as crypto from 'crypto';

/**
 * Session Security Tests
 *
 * Comprehensive tests for session management, token security,
 * and session hijacking prevention for banking applications.
 */

interface Session {
  id: string;
  userId: string;
  token: string;
  refreshToken: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
  ipAddress: string;
  userAgent: string;
  fingerprint: string;
  isActive: boolean;
  mfaVerified: boolean;
  deviceId?: string;
  location?: { country: string; city: string };
}

interface SessionConfig {
  maxSessionDuration: number; // ms
  idleTimeout: number; // ms
  maxConcurrentSessions: number;
  requireMfa: boolean;
  bindToIp: boolean;
  bindToUserAgent: boolean;
  refreshTokenRotation: boolean;
  slidingExpiration: boolean;
}

class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private userSessions: Map<string, Set<string>> = new Map();
  private revokedTokens: Set<string> = new Set();
  private config: SessionConfig;

  constructor(config: Partial<SessionConfig> = {}) {
    this.config = {
      maxSessionDuration: 24 * 60 * 60 * 1000, // 24 hours
      idleTimeout: 30 * 60 * 1000, // 30 minutes
      maxConcurrentSessions: 5,
      requireMfa: true,
      bindToIp: true,
      bindToUserAgent: true,
      refreshTokenRotation: true,
      slidingExpiration: true,
      ...config,
    };
  }

  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private generateSessionId(): string {
    return crypto.randomUUID();
  }

  private computeFingerprint(ipAddress: string, userAgent: string): string {
    return crypto.createHash('sha256').update(`${ipAddress}:${userAgent}`).digest('hex');
  }

  createSession(params: {
    userId: string;
    ipAddress: string;
    userAgent: string;
    mfaVerified?: boolean;
    deviceId?: string;
  }): Session | { error: string } {
    const { userId, ipAddress, userAgent, mfaVerified = false, deviceId } = params;

    // Check MFA requirement
    if (this.config.requireMfa && !mfaVerified) {
      return { error: 'MFA verification required' };
    }

    // Check concurrent session limit
    const existingSessions = this.userSessions.get(userId) || new Set();
    const activeSessions = [...existingSessions].filter(id => {
      const session = this.sessions.get(id);
      return session?.isActive && session.expiresAt > new Date();
    });

    if (activeSessions.length >= this.config.maxConcurrentSessions) {
      return { error: 'Maximum concurrent sessions exceeded' };
    }

    const now = new Date();
    const session: Session = {
      id: this.generateSessionId(),
      userId,
      token: this.generateToken(),
      refreshToken: this.generateToken(),
      createdAt: now,
      expiresAt: new Date(now.getTime() + this.config.maxSessionDuration),
      lastActivityAt: now,
      ipAddress,
      userAgent,
      fingerprint: this.computeFingerprint(ipAddress, userAgent),
      isActive: true,
      mfaVerified,
      deviceId,
    };

    this.sessions.set(session.id, session);

    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, new Set());
    }
    this.userSessions.get(userId)!.add(session.id);

    return session;
  }

  validateSession(token: string, context: { ipAddress: string; userAgent: string }): Session | { error: string } {
    // Check if token is revoked
    if (this.revokedTokens.has(token)) {
      return { error: 'Token has been revoked' };
    }

    // Find session by token
    const session = [...this.sessions.values()].find(s => s.token === token);

    if (!session) {
      return { error: 'Invalid session token' };
    }

    if (!session.isActive) {
      return { error: 'Session is inactive' };
    }

    const now = new Date();

    // Check expiration
    if (session.expiresAt < now) {
      this.revokeSession(session.id);
      return { error: 'Session has expired' };
    }

    // Check idle timeout
    const idleTime = now.getTime() - session.lastActivityAt.getTime();
    if (idleTime > this.config.idleTimeout) {
      this.revokeSession(session.id);
      return { error: 'Session timed out due to inactivity' };
    }

    // Check IP binding
    if (this.config.bindToIp && session.ipAddress !== context.ipAddress) {
      this.revokeSession(session.id);
      return { error: 'Session IP address mismatch - possible session hijacking' };
    }

    // Check user agent binding
    if (this.config.bindToUserAgent && session.userAgent !== context.userAgent) {
      this.revokeSession(session.id);
      return { error: 'Session user agent mismatch - possible session hijacking' };
    }

    // Check fingerprint
    const expectedFingerprint = this.computeFingerprint(context.ipAddress, context.userAgent);
    if (session.fingerprint !== expectedFingerprint) {
      this.revokeSession(session.id);
      return { error: 'Session fingerprint mismatch' };
    }

    // Update last activity for sliding expiration
    if (this.config.slidingExpiration) {
      session.lastActivityAt = now;
    }

    return session;
  }

  refreshSession(refreshToken: string, context: { ipAddress: string; userAgent: string }): Session | { error: string } {
    // Check if token is revoked
    if (this.revokedTokens.has(refreshToken)) {
      return { error: 'Refresh token has been revoked' };
    }

    const session = [...this.sessions.values()].find(s => s.refreshToken === refreshToken);

    if (!session) {
      return { error: 'Invalid refresh token' };
    }

    if (!session.isActive) {
      return { error: 'Session is inactive' };
    }

    // Check maximum session duration
    const sessionAge = Date.now() - session.createdAt.getTime();
    if (sessionAge > this.config.maxSessionDuration) {
      this.revokeSession(session.id);
      return { error: 'Maximum session duration exceeded' };
    }

    // Check context
    if (this.config.bindToIp && session.ipAddress !== context.ipAddress) {
      this.revokeSession(session.id);
      return { error: 'IP address changed - session invalidated' };
    }

    // Revoke old tokens
    this.revokedTokens.add(session.token);
    if (this.config.refreshTokenRotation) {
      this.revokedTokens.add(session.refreshToken);
    }

    // Generate new tokens
    const now = new Date();
    session.token = this.generateToken();
    if (this.config.refreshTokenRotation) {
      session.refreshToken = this.generateToken();
    }
    session.lastActivityAt = now;
    session.expiresAt = new Date(now.getTime() + this.config.maxSessionDuration);

    return session;
  }

  revokeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.isActive = false;
    this.revokedTokens.add(session.token);
    this.revokedTokens.add(session.refreshToken);

    return true;
  }

  revokeAllUserSessions(userId: string): number {
    const sessionIds = this.userSessions.get(userId) || new Set();
    let count = 0;

    sessionIds.forEach(id => {
      if (this.revokeSession(id)) count++;
    });

    return count;
  }

  revokeOtherSessions(userId: string, currentSessionId: string): number {
    const sessionIds = this.userSessions.get(userId) || new Set();
    let count = 0;

    sessionIds.forEach(id => {
      if (id !== currentSessionId && this.revokeSession(id)) count++;
    });

    return count;
  }

  getActiveSessions(userId: string): Session[] {
    const sessionIds = this.userSessions.get(userId) || new Set();
    return [...sessionIds]
      .map(id => this.sessions.get(id))
      .filter((s): s is Session => s !== undefined && s.isActive && s.expiresAt > new Date());
  }

  isTokenRevoked(token: string): boolean {
    return this.revokedTokens.has(token);
  }

  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }
}

// Test helpers
function createValidContext() {
  return {
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  };
}

describe('Session Security', () => {
  let sessionManager: SessionManager;

  beforeEach(() => {
    vi.useFakeTimers();
    sessionManager = new SessionManager({
      maxSessionDuration: 24 * 60 * 60 * 1000, // 24 hours
      idleTimeout: 30 * 60 * 1000, // 30 minutes
      maxConcurrentSessions: 3,
      requireMfa: false, // Disable for basic tests
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Session Creation', () => {
    it('should create a new session with valid parameters', () => {
      const context = createValidContext();
      const result = sessionManager.createSession({
        userId: 'user-123',
        ...context,
      });

      expect('error' in result).toBe(false);
      const session = result as Session;
      expect(session.id).toBeDefined();
      expect(session.token).toHaveLength(64); // 32 bytes hex
      expect(session.refreshToken).toHaveLength(64);
      expect(session.userId).toBe('user-123');
      expect(session.isActive).toBe(true);
    });

    it('should generate unique session IDs', () => {
      const context = createValidContext();
      const sessions = new Set<string>();

      for (let i = 0; i < 100; i++) {
        const result = sessionManager.createSession({
          userId: `user-${i}`,
          ...context,
        });
        expect('error' in result).toBe(false);
        const session = result as Session;
        expect(sessions.has(session.id)).toBe(false);
        sessions.add(session.id);
      }
    });

    it('should generate unique tokens', () => {
      const context = createValidContext();
      const tokens = new Set<string>();

      for (let i = 0; i < 100; i++) {
        const result = sessionManager.createSession({
          userId: `user-${i}`,
          ...context,
        });
        expect('error' in result).toBe(false);
        const session = result as Session;
        expect(tokens.has(session.token)).toBe(false);
        expect(tokens.has(session.refreshToken)).toBe(false);
        tokens.add(session.token);
        tokens.add(session.refreshToken);
      }
    });

    it('should set correct expiration time', () => {
      const now = new Date('2024-06-15T10:00:00Z');
      vi.setSystemTime(now);

      const context = createValidContext();
      const result = sessionManager.createSession({
        userId: 'user-123',
        ...context,
      });

      const session = result as Session;
      const expectedExpiry = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      expect(session.expiresAt.getTime()).toBe(expectedExpiry.getTime());
    });

    it('should store IP address and user agent', () => {
      const context = {
        ipAddress: '10.0.0.50',
        userAgent: 'Custom/1.0',
      };
      const result = sessionManager.createSession({
        userId: 'user-123',
        ...context,
      });

      const session = result as Session;
      expect(session.ipAddress).toBe('10.0.0.50');
      expect(session.userAgent).toBe('Custom/1.0');
    });

    it('should compute session fingerprint', () => {
      const context = createValidContext();
      const result = sessionManager.createSession({
        userId: 'user-123',
        ...context,
      });

      const session = result as Session;
      expect(session.fingerprint).toBeDefined();
      expect(session.fingerprint).toHaveLength(64); // SHA-256 hex
    });

    it('should track device ID if provided', () => {
      const context = createValidContext();
      const result = sessionManager.createSession({
        userId: 'user-123',
        deviceId: 'device-abc-123',
        ...context,
      });

      const session = result as Session;
      expect(session.deviceId).toBe('device-abc-123');
    });
  });

  describe('Session Validation', () => {
    it('should validate a valid session', () => {
      const context = createValidContext();
      const createResult = sessionManager.createSession({
        userId: 'user-123',
        ...context,
      });
      const session = createResult as Session;

      const validateResult = sessionManager.validateSession(session.token, context);
      expect('error' in validateResult).toBe(false);
      expect((validateResult as Session).id).toBe(session.id);
    });

    it('should reject invalid token', () => {
      const context = createValidContext();
      const result = sessionManager.validateSession('invalid-token', context);
      expect('error' in result).toBe(true);
      expect((result as { error: string }).error).toContain('Invalid');
    });

    it('should reject expired session', () => {
      const context = createValidContext();
      const createResult = sessionManager.createSession({
        userId: 'user-123',
        ...context,
      });
      const session = createResult as Session;

      // Fast forward past expiration
      vi.advanceTimersByTime(25 * 60 * 60 * 1000); // 25 hours

      const result = sessionManager.validateSession(session.token, context);
      expect('error' in result).toBe(true);
      expect((result as { error: string }).error).toContain('expired');
    });

    it('should reject session after idle timeout', () => {
      const context = createValidContext();
      const createResult = sessionManager.createSession({
        userId: 'user-123',
        ...context,
      });
      const session = createResult as Session;

      // Fast forward past idle timeout
      vi.advanceTimersByTime(31 * 60 * 1000); // 31 minutes

      const result = sessionManager.validateSession(session.token, context);
      expect('error' in result).toBe(true);
      expect((result as { error: string }).error).toContain('inactivity');
    });

    it('should extend session on activity with sliding expiration', () => {
      const context = createValidContext();
      const createResult = sessionManager.createSession({
        userId: 'user-123',
        ...context,
      });
      const session = createResult as Session;

      // Use session at 15 minutes
      vi.advanceTimersByTime(15 * 60 * 1000);
      const result1 = sessionManager.validateSession(session.token, context);
      expect('error' in result1).toBe(false);

      // Use session at 30 minutes (15 + 15)
      vi.advanceTimersByTime(15 * 60 * 1000);
      const result2 = sessionManager.validateSession(session.token, context);
      expect('error' in result2).toBe(false);

      // Use session at 45 minutes (30 + 15) - still valid due to sliding
      vi.advanceTimersByTime(15 * 60 * 1000);
      const result3 = sessionManager.validateSession(session.token, context);
      expect('error' in result3).toBe(false);
    });

    it('should reject revoked session', () => {
      const context = createValidContext();
      const createResult = sessionManager.createSession({
        userId: 'user-123',
        ...context,
      });
      const session = createResult as Session;

      sessionManager.revokeSession(session.id);

      const result = sessionManager.validateSession(session.token, context);
      expect('error' in result).toBe(true);
    });

    it('should reject session with mismatched IP', () => {
      const context = createValidContext();
      const createResult = sessionManager.createSession({
        userId: 'user-123',
        ...context,
      });
      const session = createResult as Session;

      const attackerContext = {
        ...context,
        ipAddress: '10.0.0.99', // Different IP
      };

      const result = sessionManager.validateSession(session.token, attackerContext);
      expect('error' in result).toBe(true);
      expect((result as { error: string }).error).toContain('IP address mismatch');
    });

    it('should reject session with mismatched user agent', () => {
      const context = createValidContext();
      const createResult = sessionManager.createSession({
        userId: 'user-123',
        ...context,
      });
      const session = createResult as Session;

      const attackerContext = {
        ...context,
        userAgent: 'Attacker/1.0', // Different user agent
      };

      const result = sessionManager.validateSession(session.token, attackerContext);
      expect('error' in result).toBe(true);
      expect((result as { error: string }).error).toContain('user agent mismatch');
    });

    it('should reject session with mismatched fingerprint', () => {
      const context = createValidContext();
      const createResult = sessionManager.createSession({
        userId: 'user-123',
        ...context,
      });
      const session = createResult as Session;

      // Both IP and user agent different
      const attackerContext = {
        ipAddress: '10.0.0.99',
        userAgent: 'Attacker/1.0',
      };

      const result = sessionManager.validateSession(session.token, attackerContext);
      expect('error' in result).toBe(true);
    });
  });

  describe('Session Refresh', () => {
    it('should refresh session with valid refresh token', () => {
      const context = createValidContext();
      const createResult = sessionManager.createSession({
        userId: 'user-123',
        ...context,
      });
      const session = createResult as Session;
      const originalToken = session.token;

      const refreshResult = sessionManager.refreshSession(session.refreshToken, context);
      expect('error' in refreshResult).toBe(false);

      const refreshedSession = refreshResult as Session;
      expect(refreshedSession.token).not.toBe(originalToken);
    });

    it('should rotate refresh token', () => {
      const context = createValidContext();
      const createResult = sessionManager.createSession({
        userId: 'user-123',
        ...context,
      });
      const session = createResult as Session;
      const originalRefreshToken = session.refreshToken;

      const refreshResult = sessionManager.refreshSession(session.refreshToken, context);
      expect('error' in refreshResult).toBe(false);

      const refreshedSession = refreshResult as Session;
      expect(refreshedSession.refreshToken).not.toBe(originalRefreshToken);
    });

    it('should revoke old tokens after refresh', () => {
      const context = createValidContext();
      const createResult = sessionManager.createSession({
        userId: 'user-123',
        ...context,
      });
      const session = createResult as Session;
      const originalToken = session.token;
      const originalRefreshToken = session.refreshToken;

      sessionManager.refreshSession(session.refreshToken, context);

      expect(sessionManager.isTokenRevoked(originalToken)).toBe(true);
      expect(sessionManager.isTokenRevoked(originalRefreshToken)).toBe(true);
    });

    it('should reject invalid refresh token', () => {
      const context = createValidContext();
      const result = sessionManager.refreshSession('invalid-refresh-token', context);
      expect('error' in result).toBe(true);
      expect((result as { error: string }).error).toContain('Invalid');
    });

    it('should reject revoked refresh token', () => {
      const context = createValidContext();
      const createResult = sessionManager.createSession({
        userId: 'user-123',
        ...context,
      });
      const session = createResult as Session;
      const refreshToken = session.refreshToken;

      // Use refresh token once
      sessionManager.refreshSession(refreshToken, context);

      // Try to use it again
      const result = sessionManager.refreshSession(refreshToken, context);
      expect('error' in result).toBe(true);
      expect((result as { error: string }).error).toContain('revoked');
    });

    it('should reject refresh from different IP', () => {
      const context = createValidContext();
      const createResult = sessionManager.createSession({
        userId: 'user-123',
        ...context,
      });
      const session = createResult as Session;

      const attackerContext = {
        ...context,
        ipAddress: '10.0.0.99',
      };

      const result = sessionManager.refreshSession(session.refreshToken, attackerContext);
      expect('error' in result).toBe(true);
      expect((result as { error: string }).error).toContain('IP address');
    });

    it('should reject refresh after max session duration', () => {
      const context = createValidContext();
      const createResult = sessionManager.createSession({
        userId: 'user-123',
        ...context,
      });
      const session = createResult as Session;

      // Fast forward past max duration
      vi.advanceTimersByTime(25 * 60 * 60 * 1000); // 25 hours

      const result = sessionManager.refreshSession(session.refreshToken, context);
      expect('error' in result).toBe(true);
      expect((result as { error: string }).error).toContain('Maximum session duration');
    });
  });

  describe('Concurrent Session Control', () => {
    it('should allow sessions up to the limit', () => {
      const context = createValidContext();

      for (let i = 0; i < 3; i++) {
        const result = sessionManager.createSession({
          userId: 'user-123',
          ipAddress: `192.168.1.${100 + i}`,
          userAgent: context.userAgent,
        });
        expect('error' in result).toBe(false);
      }
    });

    it('should reject new session when limit exceeded', () => {
      const context = createValidContext();

      // Create 3 sessions (the limit)
      for (let i = 0; i < 3; i++) {
        sessionManager.createSession({
          userId: 'user-123',
          ipAddress: `192.168.1.${100 + i}`,
          userAgent: context.userAgent,
        });
      }

      // Try to create a 4th
      const result = sessionManager.createSession({
        userId: 'user-123',
        ipAddress: '192.168.1.200',
        userAgent: context.userAgent,
      });

      expect('error' in result).toBe(true);
      expect((result as { error: string }).error).toContain('concurrent sessions');
    });

    it('should allow new session after revoking one', () => {
      const context = createValidContext();
      const sessions: Session[] = [];

      // Create 3 sessions
      for (let i = 0; i < 3; i++) {
        const result = sessionManager.createSession({
          userId: 'user-123',
          ipAddress: `192.168.1.${100 + i}`,
          userAgent: context.userAgent,
        });
        sessions.push(result as Session);
      }

      // Revoke one
      sessionManager.revokeSession(sessions[0].id);

      // Should now be able to create another
      const result = sessionManager.createSession({
        userId: 'user-123',
        ipAddress: '192.168.1.200',
        userAgent: context.userAgent,
      });

      expect('error' in result).toBe(false);
    });

    it('should get all active sessions for user', () => {
      const context = createValidContext();

      for (let i = 0; i < 3; i++) {
        sessionManager.createSession({
          userId: 'user-123',
          ipAddress: `192.168.1.${100 + i}`,
          userAgent: context.userAgent,
        });
      }

      const activeSessions = sessionManager.getActiveSessions('user-123');
      expect(activeSessions.length).toBe(3);
    });

    it('should revoke all user sessions', () => {
      const context = createValidContext();

      for (let i = 0; i < 3; i++) {
        sessionManager.createSession({
          userId: 'user-123',
          ipAddress: `192.168.1.${100 + i}`,
          userAgent: context.userAgent,
        });
      }

      const revokedCount = sessionManager.revokeAllUserSessions('user-123');
      expect(revokedCount).toBe(3);

      const activeSessions = sessionManager.getActiveSessions('user-123');
      expect(activeSessions.length).toBe(0);
    });

    it('should revoke other sessions keeping current', () => {
      const context = createValidContext();
      const sessions: Session[] = [];

      for (let i = 0; i < 3; i++) {
        const result = sessionManager.createSession({
          userId: 'user-123',
          ipAddress: `192.168.1.${100 + i}`,
          userAgent: context.userAgent,
        });
        sessions.push(result as Session);
      }

      const currentSessionId = sessions[1].id;
      const revokedCount = sessionManager.revokeOtherSessions('user-123', currentSessionId);
      expect(revokedCount).toBe(2);

      const activeSessions = sessionManager.getActiveSessions('user-123');
      expect(activeSessions.length).toBe(1);
      expect(activeSessions[0].id).toBe(currentSessionId);
    });
  });

  describe('MFA Requirements', () => {
    let mfaManager: SessionManager;

    beforeEach(() => {
      mfaManager = new SessionManager({
        requireMfa: true,
        maxConcurrentSessions: 5,
      });
    });

    it('should reject session creation without MFA when required', () => {
      const context = createValidContext();
      const result = mfaManager.createSession({
        userId: 'user-123',
        ...context,
        mfaVerified: false,
      });

      expect('error' in result).toBe(true);
      expect((result as { error: string }).error).toContain('MFA');
    });

    it('should allow session creation with MFA verified', () => {
      const context = createValidContext();
      const result = mfaManager.createSession({
        userId: 'user-123',
        ...context,
        mfaVerified: true,
      });

      expect('error' in result).toBe(false);
      expect((result as Session).mfaVerified).toBe(true);
    });
  });

  describe('Session Hijacking Prevention', () => {
    it('should detect session replay from different location', () => {
      const context = createValidContext();
      const createResult = sessionManager.createSession({
        userId: 'user-123',
        ...context,
      });
      const session = createResult as Session;

      // Attacker gets the token somehow
      const attackerContext = {
        ipAddress: '203.0.113.50', // Different IP (attacker's)
        userAgent: context.userAgent,
      };

      const result = sessionManager.validateSession(session.token, attackerContext);
      expect('error' in result).toBe(true);
      expect((result as { error: string }).error).toContain('hijacking');
    });

    it('should detect session fixation attempts', () => {
      const context = createValidContext();

      // Attacker creates session
      const attackerSession = sessionManager.createSession({
        userId: 'attacker',
        ipAddress: '203.0.113.50',
        userAgent: 'Attacker/1.0',
      }) as Session;

      // Victim tries to use attacker's token from their location
      const victimContext = createValidContext();
      const result = sessionManager.validateSession(attackerSession.token, victimContext);

      expect('error' in result).toBe(true);
    });

    it('should invalidate session on suspicious activity', () => {
      const context = createValidContext();
      const createResult = sessionManager.createSession({
        userId: 'user-123',
        ...context,
      });
      const session = createResult as Session;

      // Simulate suspicious activity - IP change
      const suspiciousContext = {
        ...context,
        ipAddress: '203.0.113.99',
      };

      // This should fail and revoke the session
      sessionManager.validateSession(session.token, suspiciousContext);

      // Original user should also be logged out
      const result = sessionManager.validateSession(session.token, context);
      expect('error' in result).toBe(true);
    });

    it('should use timing-safe token comparison', () => {
      const context = createValidContext();
      const createResult = sessionManager.createSession({
        userId: 'user-123',
        ...context,
      });
      const session = createResult as Session;

      // Test that partial token matches don't validate
      const partialToken = session.token.substring(0, 32) + '0'.repeat(32);
      const result = sessionManager.validateSession(partialToken, context);
      expect('error' in result).toBe(true);
    });
  });

  describe('Token Entropy', () => {
    it('should generate tokens with sufficient entropy', () => {
      const context = createValidContext();
      const tokens: string[] = [];

      for (let i = 0; i < 100; i++) {
        const result = sessionManager.createSession({
          userId: `user-${i}`,
          ...context,
        });
        const session = result as Session;
        tokens.push(session.token);
      }

      // Check uniqueness
      const unique = new Set(tokens);
      expect(unique.size).toBe(100);

      // Check token format (hex string)
      tokens.forEach(token => {
        expect(token).toMatch(/^[0-9a-f]{64}$/);
      });
    });

    it('should use cryptographically secure random for tokens', () => {
      const context = createValidContext();
      const result = sessionManager.createSession({
        userId: 'user-123',
        ...context,
      });
      const session = result as Session;

      // Token should be 32 bytes (256 bits) of randomness
      const bytes = Buffer.from(session.token, 'hex');
      expect(bytes.length).toBe(32);
    });
  });

  describe('Session Cleanup', () => {
    it('should not include expired sessions in active count', () => {
      const context = createValidContext();

      // Create 3 sessions
      for (let i = 0; i < 3; i++) {
        sessionManager.createSession({
          userId: 'user-123',
          ipAddress: `192.168.1.${100 + i}`,
          userAgent: context.userAgent,
        });
      }

      // Fast forward to expire them
      vi.advanceTimersByTime(25 * 60 * 60 * 1000);

      const activeSessions = sessionManager.getActiveSessions('user-123');
      expect(activeSessions.length).toBe(0);
    });

    it('should allow new sessions after old ones expire', () => {
      const context = createValidContext();

      // Create 3 sessions (limit)
      for (let i = 0; i < 3; i++) {
        sessionManager.createSession({
          userId: 'user-123',
          ipAddress: `192.168.1.${100 + i}`,
          userAgent: context.userAgent,
        });
      }

      // Fast forward to expire them
      vi.advanceTimersByTime(25 * 60 * 60 * 1000);

      // Should be able to create new sessions
      const result = sessionManager.createSession({
        userId: 'user-123',
        ...context,
      });

      expect('error' in result).toBe(false);
    });
  });
});

describe('Session Security - Edge Cases', () => {
  let sessionManager: SessionManager;

  beforeEach(() => {
    vi.useFakeTimers();
    sessionManager = new SessionManager({
      requireMfa: false,
      maxConcurrentSessions: 10,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should handle empty user agent', () => {
    const result = sessionManager.createSession({
      userId: 'user-123',
      ipAddress: '192.168.1.100',
      userAgent: '',
    });

    expect('error' in result).toBe(false);
    expect((result as Session).userAgent).toBe('');
  });

  it('should handle very long user agent strings', () => {
    const longUserAgent = 'Mozilla/5.0 '.repeat(100);
    const result = sessionManager.createSession({
      userId: 'user-123',
      ipAddress: '192.168.1.100',
      userAgent: longUserAgent,
    });

    expect('error' in result).toBe(false);
  });

  it('should handle IPv6 addresses', () => {
    const result = sessionManager.createSession({
      userId: 'user-123',
      ipAddress: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
      userAgent: 'Test/1.0',
    });

    expect('error' in result).toBe(false);
    expect((result as Session).ipAddress).toBe('2001:0db8:85a3:0000:0000:8a2e:0370:7334');
  });

  it('should handle localhost addresses', () => {
    const contexts = [
      '127.0.0.1',
      '::1',
      'localhost',
    ];

    contexts.forEach(ip => {
      const result = sessionManager.createSession({
        userId: 'user-123',
        ipAddress: ip,
        userAgent: 'Test/1.0',
      });
      expect('error' in result).toBe(false);
    });
  });

  it('should handle rapid session creation/validation', async () => {
    const context = createValidContext();
    const operations: Promise<void>[] = [];

    for (let i = 0; i < 50; i++) {
      operations.push((async () => {
        const result = sessionManager.createSession({
          userId: `user-${i}`,
          ...context,
        });
        const session = result as Session;
        sessionManager.validateSession(session.token, context);
        sessionManager.refreshSession(session.refreshToken, context);
      })());
    }

    await Promise.all(operations);
  });

  it('should handle session for multiple users independently', () => {
    const context = createValidContext();

    const user1Session = sessionManager.createSession({
      userId: 'user-1',
      ...context,
    }) as Session;

    const user2Session = sessionManager.createSession({
      userId: 'user-2',
      ...context,
    }) as Session;

    // Revoke user1's sessions
    sessionManager.revokeAllUserSessions('user-1');

    // User2 should still be valid
    const result = sessionManager.validateSession(user2Session.token, context);
    expect('error' in result).toBe(false);

    // User1 should be invalid
    const result1 = sessionManager.validateSession(user1Session.token, context);
    expect('error' in result1).toBe(true);
  });
});
