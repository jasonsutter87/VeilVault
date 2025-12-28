// ==========================================================================
// VEILVAULT AUTH SERVICE
// Wrapper around VeilSign for credential-based authentication
// ==========================================================================

import {
  VeilSignClient,
  createCredential,
  verifyCredential,
  type VeilSignClientConfig,
} from '@veilsign/core';

export interface VaultCredential {
  id: string;
  type: 'admin' | 'auditor' | 'viewer' | 'customer';
  subject: string;
  issuedAt: string;
  expiresAt: string;
  claims: Record<string, unknown>;
  signature: string;
}

export interface VaultAuthConfig {
  apiKey?: string;
  baseUrl: string;
}

/**
 * VaultAuth - Credential-based authentication using VeilSign
 */
export class VaultAuth {
  private client: VeilSignClient;

  constructor(config: VaultAuthConfig) {
    this.client = new VeilSignClient({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
    });
  }

  /**
   * Issue a new credential
   */
  async issueCredential(
    type: VaultCredential['type'],
    subject: string,
    claims: Record<string, unknown>,
    validityDays: number = 365
  ): Promise<VaultCredential> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000);

    const credential = await createCredential({
      type: `veilvault:${type}`,
      subject,
      claims: {
        ...claims,
        role: type,
      },
      issuedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });

    return {
      id: credential.id,
      type,
      subject,
      issuedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      claims,
      signature: credential.signature,
    };
  }

  /**
   * Verify a credential
   */
  async verifyCredential(credential: VaultCredential): Promise<{
    valid: boolean;
    expired: boolean;
    message?: string;
  }> {
    try {
      const result = await verifyCredential({
        id: credential.id,
        type: `veilvault:${credential.type}`,
        subject: credential.subject,
        claims: credential.claims,
        issuedAt: credential.issuedAt,
        expiresAt: credential.expiresAt,
        signature: credential.signature,
      });

      const now = new Date();
      const expiresAt = new Date(credential.expiresAt);
      const expired = now > expiresAt;

      return {
        valid: result && !expired,
        expired,
        message: expired ? 'Credential has expired' : undefined,
      };
    } catch (error) {
      return {
        valid: false,
        expired: false,
        message: error instanceof Error ? error.message : 'Verification failed',
      };
    }
  }

  /**
   * Check if a credential has a specific permission
   */
  hasPermission(
    credential: VaultCredential,
    permission: string
  ): boolean {
    const permissions: Record<VaultCredential['type'], string[]> = {
      admin: ['read', 'write', 'delete', 'audit', 'manage'],
      auditor: ['read', 'audit', 'export'],
      viewer: ['read'],
      customer: ['read:own', 'verify:own'],
    };

    return permissions[credential.type]?.includes(permission) ?? false;
  }
}

export function createVaultAuth(config: VaultAuthConfig): VaultAuth {
  return new VaultAuth(config);
}
