// ==========================================================================
// INTEGRITY SERVICE
// Real-time integrity monitoring and verification
// ==========================================================================

import { randomUUID } from '../utils/crypto.js';
import { VaultLedger, type IntegrityStatus } from '@veilvault/sdk';
import type { Ledger } from '../entities/ledger.js';
import type { Verification, VerificationSummary } from '../entities/verification.js';
import { createVerification, calculateVerificationSummary } from '../entities/verification.js';

export type IntegrityLevel = 'healthy' | 'warning' | 'error';

export interface IntegrityReport {
  timestamp: Date;
  overallStatus: IntegrityLevel;
  ledgerStatuses: Map<string, IntegrityStatus>;
  recentVerifications: Verification[];
  summary: VerificationSummary;
  alerts: IntegrityAlert[];
}

export interface IntegrityAlert {
  id: string;
  level: 'info' | 'warning' | 'critical';
  ledgerId: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

export interface IntegrityServiceConfig {
  vaultLedger: VaultLedger;
  checkIntervalMs?: number;
  alertThreshold?: number;
}

export class IntegrityService {
  private vaultLedger: VaultLedger;
  private checkInterval: number;
  private alertThreshold: number;
  private verificationHistory: Verification[] = [];
  private alerts: IntegrityAlert[] = [];

  constructor(config: IntegrityServiceConfig) {
    this.vaultLedger = config.vaultLedger;
    this.checkInterval = config.checkIntervalMs ?? 60000; // 1 minute
    this.alertThreshold = config.alertThreshold ?? 95; // 95% integrity score
  }

  /**
   * Check integrity of a single ledger
   */
  async checkLedgerIntegrity(ledgerId: string): Promise<IntegrityStatus> {
    return this.vaultLedger.getIntegrityStatus(ledgerId);
  }

  /**
   * Check integrity of all ledgers
   */
  async checkAllLedgers(): Promise<IntegrityReport> {
    const ledgers = await this.vaultLedger.listLedgers();
    const ledgerStatuses = new Map<string, IntegrityStatus>();
    const newAlerts: IntegrityAlert[] = [];

    let overallStatus: IntegrityLevel = 'healthy';

    for (const ledger of ledgers) {
      const status = await this.checkLedgerIntegrity(ledger.id);
      ledgerStatuses.set(ledger.id, status);

      if (status.status === 'error') {
        overallStatus = 'error';
        newAlerts.push({
          id: randomUUID(),
          level: 'critical',
          ledgerId: ledger.id,
          message: status.message ?? 'Integrity check failed',
          timestamp: new Date(),
          acknowledged: false,
        });
      } else if (status.status === 'warning' && overallStatus !== 'error') {
        overallStatus = 'warning';
        newAlerts.push({
          id: randomUUID(),
          level: 'warning',
          ledgerId: ledger.id,
          message: status.message ?? 'Integrity warning detected',
          timestamp: new Date(),
          acknowledged: false,
        });
      }
    }

    this.alerts.push(...newAlerts);

    const summary = calculateVerificationSummary(this.verificationHistory);

    return {
      timestamp: new Date(),
      overallStatus,
      ledgerStatuses,
      recentVerifications: this.verificationHistory.slice(-100),
      summary,
      alerts: this.alerts.filter((a) => !a.acknowledged),
    };
  }

  /**
   * Record a verification result
   */
  recordVerification(verification: Verification): void {
    this.verificationHistory.push(verification);

    // Keep only last 1000 verifications
    if (this.verificationHistory.length > 1000) {
      this.verificationHistory = this.verificationHistory.slice(-1000);
    }

    // Check if we need to create an alert
    if (verification.status === 'invalid') {
      this.alerts.push({
        id: randomUUID(),
        level: 'critical',
        ledgerId: verification.targetId,
        message: `Verification failed for ${verification.type}: ${verification.targetId}`,
        timestamp: new Date(),
        acknowledged: false,
      });
    }
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  /**
   * Get current integrity score (0-100)
   */
  getIntegrityScore(): number {
    const summary = calculateVerificationSummary(this.verificationHistory);
    return summary.integrityScore;
  }

  /**
   * Get unacknowledged alerts
   */
  getActiveAlerts(): IntegrityAlert[] {
    return this.alerts.filter((a) => !a.acknowledged);
  }
}

export function createIntegrityService(
  config: IntegrityServiceConfig
): IntegrityService {
  return new IntegrityService(config);
}
