// ==========================================================================
// VEILVAULT CRYPTO SERVICE
// Wrapper around VeilKey for threshold cryptography operations
// ==========================================================================

import {
  VeilKey,
  CeremonyCoordinator,
  type VeilKeyConfig,
  type CeremonyConfig,
  type KeyGroup,
} from '@veilkey/core';

export interface MultiPartyApproval {
  id: string;
  operation: string;
  requiredSignatures: number;
  collectedSignatures: number;
  participants: string[];
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  createdAt: string;
  expiresAt: string;
}

export interface VaultCryptoConfig {
  threshold: number;
  totalShares: number;
}

/**
 * VaultCrypto - Threshold cryptography for multi-party operations
 */
export class VaultCrypto {
  private veilKey: VeilKey;
  private config: VaultCryptoConfig;

  constructor(config: VaultCryptoConfig) {
    this.config = config;
    this.veilKey = new VeilKey({
      threshold: config.threshold,
      numShares: config.totalShares,
      algorithm: 'RSA-2048',
    });
  }

  /**
   * Initialize a key ceremony for a new audit group
   */
  async initializeCeremony(
    groupName: string,
    participants: string[]
  ): Promise<string> {
    const ceremonyConfig: CeremonyConfig = {
      threshold: this.config.threshold,
      totalParticipants: participants.length,
      timeout: 3600000, // 1 hour
      requireAllCommitments: true,
    };

    const coordinator = new CeremonyCoordinator(ceremonyConfig);

    // Register participants
    for (const participant of participants) {
      await coordinator.registerParticipant({
        id: participant,
        name: participant,
        publicKey: '', // Would be provided by participant
      });
    }

    return coordinator.getCeremonyId();
  }

  /**
   * Create a multi-party approval request
   */
  async createApprovalRequest(
    operation: string,
    participants: string[],
    expiresInMs: number = 86400000 // 24 hours
  ): Promise<MultiPartyApproval> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresInMs);

    return {
      id: crypto.randomUUID(),
      operation,
      requiredSignatures: this.config.threshold,
      collectedSignatures: 0,
      participants,
      status: 'pending',
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Get the threshold configuration
   */
  getThresholdConfig(): { threshold: number; total: number } {
    return {
      threshold: this.config.threshold,
      total: this.config.totalShares,
    };
  }
}

export function createVaultCrypto(config: VaultCryptoConfig): VaultCrypto {
  return new VaultCrypto(config);
}
