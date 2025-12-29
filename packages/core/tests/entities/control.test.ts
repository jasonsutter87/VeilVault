// ==========================================================================
// CONTROL ENTITY TESTS
// Bulletproof tests for SOX/compliance control testing
// ==========================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createControl,
  activateControl,
  linkRiskToControl,
  unlinkRiskFromControl,
  updateControlEffectiveness,
  scheduleControlTest,
  createControlTest,
  selectSamples,
  recordTestResult,
  addTestEvidence,
  reviewTest,
  calculateControlSummary,
  getRecommendedSampleSize,
  type Control,
  type ControlTest,
  type CreateControlInput,
  type CreateControlTestInput,
  type ControlException,
} from '../../src/entities/control.js';

describe('Control Entity', () => {
  // ==========================================================================
  // CONTROL CREATION
  // ==========================================================================

  describe('createControl', () => {
    const validInput: CreateControlInput = {
      organizationId: 'org-123',
      controlId: 'FIN-001',
      name: 'Bank Reconciliation Review',
      description: 'Monthly review of bank reconciliations',
      objective: 'Ensure all transactions are properly recorded',
      type: 'detective',
      nature: 'manual',
      frequency: 'monthly',
      ownerId: 'user-123',
      ownerName: 'Jane Controller',
      testingProcedure: 'Select sample of reconciliations and verify...',
    };

    it('creates a control with required fields', () => {
      const control = createControl(validInput);

      expect(control.id).toBeDefined();
      expect(control.organizationId).toBe('org-123');
      expect(control.controlId).toBe('FIN-001');
      expect(control.name).toBe('Bank Reconciliation Review');
    });

    it('sets initial status to draft', () => {
      const control = createControl(validInput);
      expect(control.status).toBe('draft');
    });

    it('sets initial effectiveness to not_tested', () => {
      const control = createControl(validInput);
      expect(control.currentEffectiveness).toBe('not_tested');
    });

    it('defaults isSoxRelevant to false', () => {
      const control = createControl(validInput);
      expect(control.isSoxRelevant).toBe(false);
    });

    it('accepts SOX relevant flag and assertions', () => {
      const control = createControl({
        ...validInput,
        isSoxRelevant: true,
        soxAssertion: ['existence', 'completeness'],
        financialStatementArea: 'Cash and Equivalents',
      });

      expect(control.isSoxRelevant).toBe(true);
      expect(control.soxAssertion).toEqual(['existence', 'completeness']);
      expect(control.financialStatementArea).toBe('Cash and Equivalents');
    });

    it('initializes empty arrays', () => {
      const control = createControl(validInput);

      expect(control.riskIds).toEqual([]);
      expect(control.tags).toEqual([]);
      expect(control.attachments).toEqual([]);
      expect(control.evidenceRequired).toEqual([]);
    });

    it('accepts optional evidence requirements', () => {
      const control = createControl({
        ...validInput,
        evidenceRequired: ['screenshot', 'approval email', 'reconciliation report'],
      });

      expect(control.evidenceRequired).toHaveLength(3);
    });

    it('sets timestamps', () => {
      const before = new Date();
      const control = createControl(validInput);
      const after = new Date();

      expect(control.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(control.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  // ==========================================================================
  // CONTROL LIFECYCLE
  // ==========================================================================

  describe('Control Lifecycle', () => {
    let control: Control;

    beforeEach(() => {
      control = createControl({
        organizationId: 'org-123',
        controlId: 'FIN-001',
        name: 'Test Control',
        description: 'Test',
        objective: 'Test objective',
        type: 'preventive',
        nature: 'automated',
        frequency: 'daily',
        ownerId: 'user-1',
        ownerName: 'Owner',
        testingProcedure: 'Test procedure',
      });
    });

    describe('activateControl', () => {
      it('changes status to active', () => {
        const activated = activateControl(control);
        expect(activated.status).toBe('active');
      });

      it('updates timestamp', () => {
        const activated = activateControl(control);
        expect(activated.updatedAt.getTime()).toBeGreaterThanOrEqual(control.createdAt.getTime());
      });
    });

    describe('updateControlEffectiveness', () => {
      it('updates effectiveness rating', () => {
        const updated = updateControlEffectiveness(control, 'effective');
        expect(updated.currentEffectiveness).toBe('effective');
      });

      it('sets lastTestedAt timestamp', () => {
        const before = new Date();
        const updated = updateControlEffectiveness(control, 'effective');

        expect(updated.lastTestedAt).toBeDefined();
        expect(updated.lastTestedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      });

      it('handles all effectiveness values', () => {
        expect(updateControlEffectiveness(control, 'effective').currentEffectiveness).toBe('effective');
        expect(updateControlEffectiveness(control, 'partially_effective').currentEffectiveness).toBe(
          'partially_effective'
        );
        expect(updateControlEffectiveness(control, 'ineffective').currentEffectiveness).toBe('ineffective');
      });
    });

    describe('scheduleControlTest', () => {
      it('sets next test date', () => {
        const futureDate = new Date('2025-06-01');
        const scheduled = scheduleControlTest(control, futureDate);

        expect(scheduled.nextTestDate).toEqual(futureDate);
      });
    });
  });

  // ==========================================================================
  // RISK LINKING
  // ==========================================================================

  describe('Risk Linking', () => {
    let control: Control;

    beforeEach(() => {
      control = createControl({
        organizationId: 'org-123',
        controlId: 'FIN-001',
        name: 'Test Control',
        description: 'Test',
        objective: 'Test',
        type: 'detective',
        nature: 'manual',
        frequency: 'monthly',
        ownerId: 'user-1',
        ownerName: 'Owner',
        testingProcedure: 'Test',
      });
    });

    describe('linkRiskToControl', () => {
      it('adds risk to control', () => {
        const updated = linkRiskToControl(control, 'risk-1');
        expect(updated.riskIds).toContain('risk-1');
      });

      it('does not duplicate links', () => {
        let updated = linkRiskToControl(control, 'risk-1');
        updated = linkRiskToControl(updated, 'risk-1');

        expect(updated.riskIds.filter((id) => id === 'risk-1').length).toBe(1);
      });

      it('can link multiple risks', () => {
        let updated = linkRiskToControl(control, 'risk-1');
        updated = linkRiskToControl(updated, 'risk-2');
        updated = linkRiskToControl(updated, 'risk-3');

        expect(updated.riskIds).toHaveLength(3);
      });
    });

    describe('unlinkRiskFromControl', () => {
      it('removes risk from control', () => {
        let updated = linkRiskToControl(control, 'risk-1');
        updated = linkRiskToControl(updated, 'risk-2');
        updated = unlinkRiskFromControl(updated, 'risk-1');

        expect(updated.riskIds).not.toContain('risk-1');
        expect(updated.riskIds).toContain('risk-2');
      });

      it('handles non-existent risk gracefully', () => {
        const updated = unlinkRiskFromControl(control, 'non-existent');
        expect(updated.riskIds).toEqual([]);
      });
    });
  });

  // ==========================================================================
  // CONTROL TEST CREATION
  // ==========================================================================

  describe('Control Tests', () => {
    const testInput: CreateControlTestInput = {
      controlId: 'ctrl-123',
      organizationId: 'org-123',
      testType: 'operating',
      testPeriodStart: new Date('2025-01-01'),
      testPeriodEnd: new Date('2025-03-31'),
      testerId: 'user-456',
      testerName: 'Auditor Jane',
      populationSize: 100,
      sampleSize: 25,
    };

    describe('createControlTest', () => {
      it('creates a test with required fields', () => {
        const test = createControlTest(testInput);

        expect(test.id).toBeDefined();
        expect(test.controlId).toBe('ctrl-123');
        expect(test.testType).toBe('operating');
        expect(test.testerId).toBe('user-456');
      });

      it('initializes test tracking fields', () => {
        const test = createControlTest(testInput);

        expect(test.samplesSelected).toEqual([]);
        expect(test.samplesTested).toBe(0);
        expect(test.exceptionsFound).toBe(0);
        expect(test.evidenceCollected).toEqual([]);
      });

      it('sets execution timestamp', () => {
        const before = new Date();
        const test = createControlTest(testInput);

        expect(test.executedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      });

      it('has no result initially', () => {
        const test = createControlTest(testInput);
        expect(test.result).toBeUndefined();
        expect(test.completedAt).toBeUndefined();
      });
    });

    describe('selectSamples', () => {
      it('records selected samples', () => {
        const test = createControlTest(testInput);
        const samples = ['TXN-001', 'TXN-002', 'TXN-003'];

        const updated = selectSamples(test, samples);

        expect(updated.samplesSelected).toEqual(samples);
        expect(updated.samplesSelected).toHaveLength(3);
      });
    });

    describe('recordTestResult', () => {
      it('records pass result', () => {
        let test = createControlTest(testInput);
        test = selectSamples(test, ['TXN-001', 'TXN-002']);

        const completed = recordTestResult(test, 'pass', []);

        expect(completed.result).toBe('pass');
        expect(completed.exceptionsFound).toBe(0);
        expect(completed.samplesTested).toBe(2);
        expect(completed.completedAt).toBeDefined();
      });

      it('records fail result with exceptions', () => {
        let test = createControlTest(testInput);
        test = selectSamples(test, ['TXN-001', 'TXN-002', 'TXN-003']);

        const exceptions: ControlException[] = [
          {
            id: 'exc-1',
            sampleRef: 'TXN-001',
            description: 'Missing approval signature',
            severity: 'high',
          },
          {
            id: 'exc-2',
            sampleRef: 'TXN-003',
            description: 'Late processing',
            severity: 'low',
          },
        ];

        const completed = recordTestResult(test, 'fail', exceptions);

        expect(completed.result).toBe('fail');
        expect(completed.exceptionsFound).toBe(2);
        expect(completed.exceptionsDetails).toHaveLength(2);
      });

      it('records pass_with_exceptions', () => {
        let test = createControlTest(testInput);
        test = selectSamples(test, ['TXN-001', 'TXN-002', 'TXN-003']);

        const exceptions: ControlException[] = [
          {
            id: 'exc-1',
            sampleRef: 'TXN-002',
            description: 'Minor documentation issue',
            severity: 'low',
          },
        ];

        const completed = recordTestResult(test, 'pass_with_exceptions', exceptions);

        expect(completed.result).toBe('pass_with_exceptions');
        expect(completed.exceptionsFound).toBe(1);
      });
    });

    describe('addTestEvidence', () => {
      it('adds evidence to test', () => {
        const test = createControlTest(testInput);

        const updated = addTestEvidence(test, {
          type: 'screenshot',
          name: 'Approval Screen.png',
          description: 'Screenshot of approval workflow',
          url: 'https://storage.example.com/evidence/123.png',
          uploadedAt: new Date(),
          uploadedBy: 'user-456',
        });

        expect(updated.evidenceCollected).toHaveLength(1);
        expect(updated.evidenceCollected[0]!.id).toBeDefined();
        expect(updated.evidenceCollected[0]!.type).toBe('screenshot');
      });

      it('can add multiple evidence items', () => {
        let test = createControlTest(testInput);

        test = addTestEvidence(test, {
          type: 'screenshot',
          name: 'Evidence 1',
          url: 'https://storage.example.com/1.png',
          uploadedAt: new Date(),
          uploadedBy: 'user-1',
        });

        test = addTestEvidence(test, {
          type: 'document',
          name: 'Evidence 2',
          url: 'https://storage.example.com/2.pdf',
          uploadedAt: new Date(),
          uploadedBy: 'user-1',
        });

        expect(test.evidenceCollected).toHaveLength(2);
      });
    });

    describe('reviewTest', () => {
      it('records reviewer information', () => {
        let test = createControlTest(testInput);
        test = selectSamples(test, ['TXN-001']);
        test = recordTestResult(test, 'pass', []);

        const reviewed = reviewTest(test, 'user-789', 'Senior Auditor', 'Looks good');

        expect(reviewed.reviewedBy).toBe('user-789');
        expect(reviewed.reviewedByName).toBe('Senior Auditor');
        expect(reviewed.reviewNotes).toBe('Looks good');
        expect(reviewed.reviewedAt).toBeDefined();
      });
    });
  });

  // ==========================================================================
  // CONTROL SUMMARY
  // ==========================================================================

  describe('calculateControlSummary', () => {
    it('calculates totals correctly', () => {
      const controls = [
        createControl({
          organizationId: 'org-1',
          controlId: 'C-001',
          name: 'Control 1',
          description: 'Test',
          objective: 'Test',
          type: 'preventive',
          nature: 'automated',
          frequency: 'daily',
          ownerId: 'user-1',
          ownerName: 'Owner',
          testingProcedure: 'Test',
        }),
        createControl({
          organizationId: 'org-1',
          controlId: 'C-002',
          name: 'Control 2',
          description: 'Test',
          objective: 'Test',
          type: 'detective',
          nature: 'manual',
          frequency: 'monthly',
          ownerId: 'user-1',
          ownerName: 'Owner',
          testingProcedure: 'Test',
        }),
      ];

      const summary = calculateControlSummary(controls);
      expect(summary.total).toBe(2);
    });

    it('counts by status', () => {
      const draftControl = createControl({
        organizationId: 'org-1',
        controlId: 'C-001',
        name: 'Draft',
        description: 'Test',
        objective: 'Test',
        type: 'preventive',
        nature: 'automated',
        frequency: 'daily',
        ownerId: 'user-1',
        ownerName: 'Owner',
        testingProcedure: 'Test',
      });

      const activeControl = activateControl(
        createControl({
          organizationId: 'org-1',
          controlId: 'C-002',
          name: 'Active',
          description: 'Test',
          objective: 'Test',
          type: 'detective',
          nature: 'manual',
          frequency: 'monthly',
          ownerId: 'user-1',
          ownerName: 'Owner',
          testingProcedure: 'Test',
        })
      );

      const summary = calculateControlSummary([draftControl, activeControl]);

      expect(summary.byStatus.draft).toBe(1);
      expect(summary.byStatus.active).toBe(1);
    });

    it('counts by type', () => {
      const controls = [
        createControl({
          organizationId: 'org-1',
          controlId: 'C-001',
          name: 'Preventive',
          description: 'Test',
          objective: 'Test',
          type: 'preventive',
          nature: 'automated',
          frequency: 'daily',
          ownerId: 'user-1',
          ownerName: 'Owner',
          testingProcedure: 'Test',
        }),
        createControl({
          organizationId: 'org-1',
          controlId: 'C-002',
          name: 'Detective',
          description: 'Test',
          objective: 'Test',
          type: 'detective',
          nature: 'manual',
          frequency: 'monthly',
          ownerId: 'user-1',
          ownerName: 'Owner',
          testingProcedure: 'Test',
        }),
        createControl({
          organizationId: 'org-1',
          controlId: 'C-003',
          name: 'Corrective',
          description: 'Test',
          objective: 'Test',
          type: 'corrective',
          nature: 'hybrid',
          frequency: 'weekly',
          ownerId: 'user-1',
          ownerName: 'Owner',
          testingProcedure: 'Test',
        }),
      ];

      const summary = calculateControlSummary(controls);

      expect(summary.byType.preventive).toBe(1);
      expect(summary.byType.detective).toBe(1);
      expect(summary.byType.corrective).toBe(1);
    });

    it('counts SOX relevant controls', () => {
      const soxControl = createControl({
        organizationId: 'org-1',
        controlId: 'SOX-001',
        name: 'SOX Control',
        description: 'Test',
        objective: 'Test',
        type: 'preventive',
        nature: 'manual',
        frequency: 'monthly',
        ownerId: 'user-1',
        ownerName: 'Owner',
        testingProcedure: 'Test',
        isSoxRelevant: true,
        soxAssertion: ['existence'],
      });

      const nonSoxControl = createControl({
        organizationId: 'org-1',
        controlId: 'OP-001',
        name: 'Non-SOX Control',
        description: 'Test',
        objective: 'Test',
        type: 'detective',
        nature: 'automated',
        frequency: 'daily',
        ownerId: 'user-1',
        ownerName: 'Owner',
        testingProcedure: 'Test',
      });

      const summary = calculateControlSummary([soxControl, nonSoxControl]);
      expect(summary.soxRelevant).toBe(1);
    });

    it('counts testing due and overdue', () => {
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const fiftyDaysFromNow = new Date(now.getTime() + 50 * 24 * 60 * 60 * 1000);
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const overdueControl = scheduleControlTest(
        createControl({
          organizationId: 'org-1',
          controlId: 'C-001',
          name: 'Overdue',
          description: 'Test',
          objective: 'Test',
          type: 'preventive',
          nature: 'manual',
          frequency: 'monthly',
          ownerId: 'user-1',
          ownerName: 'Owner',
          testingProcedure: 'Test',
        }),
        yesterday
      );

      const dueSoonControl = scheduleControlTest(
        createControl({
          organizationId: 'org-1',
          controlId: 'C-002',
          name: 'Due Soon',
          description: 'Test',
          objective: 'Test',
          type: 'detective',
          nature: 'automated',
          frequency: 'quarterly',
          ownerId: 'user-1',
          ownerName: 'Owner',
          testingProcedure: 'Test',
        }),
        thirtyDaysFromNow
      );

      const notDueControl = scheduleControlTest(
        createControl({
          organizationId: 'org-1',
          controlId: 'C-003',
          name: 'Not Due',
          description: 'Test',
          objective: 'Test',
          type: 'corrective',
          nature: 'hybrid',
          frequency: 'annually',
          ownerId: 'user-1',
          ownerName: 'Owner',
          testingProcedure: 'Test',
        }),
        fiftyDaysFromNow
      );

      const summary = calculateControlSummary([overdueControl, dueSoonControl, notDueControl]);

      expect(summary.overdueTesting).toBe(1);
      expect(summary.testingDue).toBe(1);
    });

    it('handles empty array', () => {
      const summary = calculateControlSummary([]);
      expect(summary.total).toBe(0);
      expect(summary.soxRelevant).toBe(0);
    });
  });

  // ==========================================================================
  // SAMPLE SIZE RECOMMENDATIONS
  // ==========================================================================

  describe('getRecommendedSampleSize', () => {
    it('returns correct samples for continuous controls', () => {
      expect(getRecommendedSampleSize('continuous', 1000)).toBe(25);
    });

    it('returns correct samples for daily controls', () => {
      expect(getRecommendedSampleSize('daily', 365)).toBe(25);
    });

    it('returns correct samples for weekly controls', () => {
      expect(getRecommendedSampleSize('weekly', 52)).toBe(10);
    });

    it('returns correct samples for monthly controls', () => {
      expect(getRecommendedSampleSize('monthly', 12)).toBe(3);
    });

    it('returns correct samples for quarterly controls', () => {
      expect(getRecommendedSampleSize('quarterly', 4)).toBe(2);
    });

    it('returns correct samples for annual controls', () => {
      expect(getRecommendedSampleSize('annually', 1)).toBe(1);
    });

    it('limits sample size to population size', () => {
      // If population is smaller than recommended, use population size
      expect(getRecommendedSampleSize('weekly', 5)).toBe(5);
      expect(getRecommendedSampleSize('monthly', 2)).toBe(2);
    });
  });

  // ==========================================================================
  // SOX COMPLIANCE SCENARIOS
  // ==========================================================================

  describe('SOX Compliance Scenarios', () => {
    it('creates a complete SOX control with all assertions', () => {
      const control = createControl({
        organizationId: 'org-sox',
        controlId: 'SOX-FIN-001',
        name: 'Revenue Recognition Review',
        description: 'Review of revenue recognition for material transactions',
        objective: 'Ensure revenue is recognized in accordance with ASC 606',
        type: 'detective',
        nature: 'manual',
        frequency: 'monthly',
        ownerId: 'controller-1',
        ownerName: 'Corporate Controller',
        testingProcedure: '1. Select sample of material transactions\n2. Verify recognition criteria\n3. Validate timing',
        isSoxRelevant: true,
        soxAssertion: ['existence', 'completeness', 'valuation', 'rights_obligations', 'presentation_disclosure'],
        financialStatementArea: 'Revenue',
        evidenceRequired: ['Transaction listing', 'Contract review memo', 'Management sign-off'],
      });

      expect(control.isSoxRelevant).toBe(true);
      expect(control.soxAssertion).toHaveLength(5);
      expect(control.financialStatementArea).toBe('Revenue');
      expect(control.evidenceRequired).toHaveLength(3);
    });

    it('tracks full testing lifecycle for audit', () => {
      // Create control
      let control = createControl({
        organizationId: 'org-sox',
        controlId: 'SOX-AP-001',
        name: 'Vendor Payment Approval',
        description: 'Approval of vendor payments above threshold',
        objective: 'Prevent unauthorized payments',
        type: 'preventive',
        nature: 'manual',
        frequency: 'daily',
        ownerId: 'ap-manager',
        ownerName: 'AP Manager',
        testingProcedure: 'Verify dual approval for payments > $10,000',
        isSoxRelevant: true,
        soxAssertion: ['existence'],
      });

      // Activate control
      control = activateControl(control);
      expect(control.status).toBe('active');

      // Create test
      let test = createControlTest({
        controlId: control.id,
        organizationId: control.organizationId,
        testType: 'operating',
        testPeriodStart: new Date('2025-01-01'),
        testPeriodEnd: new Date('2025-03-31'),
        testerId: 'auditor-1',
        testerName: 'Internal Auditor',
        populationSize: 250,
        sampleSize: 25,
      });

      // Select and test samples
      const sampleIds = ['INV-001', 'INV-002', 'INV-003'];
      test = selectSamples(test, sampleIds);

      // Add evidence
      test = addTestEvidence(test, {
        type: 'export',
        name: 'AP Transaction Report Q1.xlsx',
        url: 'https://storage.example.com/reports/ap-q1.xlsx',
        uploadedAt: new Date(),
        uploadedBy: 'auditor-1',
      });

      // Record result with one exception
      const exceptions: ControlException[] = [
        {
          id: 'exc-1',
          sampleRef: 'INV-002',
          description: 'Second approval obtained 3 days after payment',
          severity: 'medium',
          rootCause: 'Approver was on PTO, system allowed bypass',
        },
      ];
      test = recordTestResult(test, 'pass_with_exceptions', exceptions);

      // Manager review
      test = reviewTest(test, 'audit-manager', 'Audit Manager', 'Exception noted, remediation required');

      // Update control effectiveness
      control = updateControlEffectiveness(control, 'partially_effective');

      // Verify final state
      expect(test.result).toBe('pass_with_exceptions');
      expect(test.exceptionsFound).toBe(1);
      expect(test.reviewedAt).toBeDefined();
      expect(control.currentEffectiveness).toBe('partially_effective');
      expect(control.lastTestedAt).toBeDefined();
    });
  });
});
