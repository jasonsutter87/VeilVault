// ==========================================================================
// RISK ENTITY TESTS
// Bulletproof tests for GRC risk management
// ==========================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createRisk,
  assessRisk,
  linkControlToRisk,
  unlinkControlFromRisk,
  addKeyRiskIndicator,
  updateKRIValue,
  acceptRisk,
  closeRisk,
  calculateRiskScore,
  getRiskLevel,
  getRiskColor,
  generateRiskHeatMap,
  calculateRiskSummary,
  LIKELIHOOD_LABELS,
  IMPACT_LABELS,
  RISK_APPETITE_THRESHOLDS,
  type Risk,
  type CreateRiskInput,
} from '../../src/entities/risk.js';

describe('Risk Entity', () => {
  // ==========================================================================
  // RISK CREATION
  // ==========================================================================

  describe('createRisk', () => {
    const validInput: CreateRiskInput = {
      organizationId: 'org-123',
      name: 'Fraud Risk',
      description: 'Risk of fraudulent transactions',
      category: 'fraud',
      inherentLikelihood: 3,
      inherentImpact: 4,
      ownerId: 'user-123',
      ownerName: 'John Smith',
    };

    it('creates a risk with required fields', () => {
      const risk = createRisk(validInput);

      expect(risk.id).toBeDefined();
      expect(risk.id.length).toBeGreaterThan(0);
      expect(risk.organizationId).toBe('org-123');
      expect(risk.name).toBe('Fraud Risk');
      expect(risk.description).toBe('Risk of fraudulent transactions');
      expect(risk.category).toBe('fraud');
    });

    it('calculates inherent score correctly', () => {
      const risk = createRisk(validInput);

      // 3 * 4 = 12
      expect(risk.inherentScore).toBe(12);
    });

    it('sets residual score equal to inherent initially', () => {
      const risk = createRisk(validInput);

      expect(risk.residualLikelihood).toBe(risk.inherentLikelihood);
      expect(risk.residualImpact).toBe(risk.inherentImpact);
      expect(risk.residualScore).toBe(risk.inherentScore);
    });

    it('sets initial status to identified', () => {
      const risk = createRisk(validInput);
      expect(risk.status).toBe('identified');
    });

    it('sets initial trend to stable', () => {
      const risk = createRisk(validInput);
      expect(risk.trend).toBe('stable');
    });

    it('uses default medium risk appetite', () => {
      const risk = createRisk(validInput);

      expect(risk.riskAppetite).toBe('medium');
      expect(risk.targetScore).toBe(RISK_APPETITE_THRESHOLDS.medium);
    });

    it('uses custom risk appetite when provided', () => {
      const risk = createRisk({ ...validInput, riskAppetite: 'low' });

      expect(risk.riskAppetite).toBe('low');
      expect(risk.targetScore).toBe(RISK_APPETITE_THRESHOLDS.low);
    });

    it('uses custom target score when provided', () => {
      const risk = createRisk({ ...validInput, targetScore: 8 });
      expect(risk.targetScore).toBe(8);
    });

    it('calculates withinAppetite correctly', () => {
      // High inherent score (12) with medium appetite (12) - just within
      const withinRisk = createRisk(validInput);
      expect(withinRisk.withinAppetite).toBe(true);

      // High score with low appetite (6) - outside
      const outsideRisk = createRisk({ ...validInput, riskAppetite: 'low' });
      expect(outsideRisk.withinAppetite).toBe(false);
    });

    it('initializes empty arrays for links', () => {
      const risk = createRisk(validInput);

      expect(risk.controlIds).toEqual([]);
      expect(risk.issueIds).toEqual([]);
      expect(risk.keyRiskIndicators).toEqual([]);
      expect(risk.attachments).toEqual([]);
    });

    it('sets timestamps', () => {
      const before = new Date();
      const risk = createRisk(validInput);
      const after = new Date();

      expect(risk.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(risk.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(risk.updatedAt.getTime()).toBe(risk.createdAt.getTime());
    });

    it('accepts optional tags', () => {
      const risk = createRisk({ ...validInput, tags: ['sox', 'financial'] });
      expect(risk.tags).toEqual(['sox', 'financial']);
    });
  });

  // ==========================================================================
  // RISK ASSESSMENT
  // ==========================================================================

  describe('assessRisk', () => {
    let risk: Risk;

    beforeEach(() => {
      risk = createRisk({
        organizationId: 'org-123',
        name: 'Test Risk',
        description: 'Test',
        category: 'operational',
        inherentLikelihood: 4,
        inherentImpact: 4,
        ownerId: 'user-1',
        ownerName: 'Owner',
      });
    });

    it('updates residual scores', () => {
      const assessed = assessRisk(risk, {
        residualLikelihood: 2,
        residualImpact: 2,
        reviewerId: 'user-2',
        reviewerName: 'Reviewer',
      });

      expect(assessed.residualLikelihood).toBe(2);
      expect(assessed.residualImpact).toBe(2);
      expect(assessed.residualScore).toBe(4);
    });

    it('sets trend to decreasing when score reduces', () => {
      const assessed = assessRisk(risk, {
        residualLikelihood: 2,
        residualImpact: 2,
        reviewerId: 'user-2',
        reviewerName: 'Reviewer',
      });

      expect(assessed.trend).toBe('decreasing');
    });

    it('sets trend to increasing when score increases', () => {
      // First reduce the score
      risk = assessRisk(risk, {
        residualLikelihood: 2,
        residualImpact: 2,
        reviewerId: 'user-2',
        reviewerName: 'Reviewer',
      });

      // Then increase it
      const reassessed = assessRisk(risk, {
        residualLikelihood: 4,
        residualImpact: 4,
        reviewerId: 'user-2',
        reviewerName: 'Reviewer',
      });

      expect(reassessed.trend).toBe('increasing');
    });

    it('sets trend to stable when score unchanged', () => {
      const assessed = assessRisk(risk, {
        residualLikelihood: 4,
        residualImpact: 4,
        reviewerId: 'user-2',
        reviewerName: 'Reviewer',
      });

      expect(assessed.trend).toBe('stable');
    });

    it('updates status to assessed', () => {
      const assessed = assessRisk(risk, {
        residualLikelihood: 2,
        residualImpact: 2,
        reviewerId: 'user-2',
        reviewerName: 'Reviewer',
      });

      expect(assessed.status).toBe('assessed');
    });

    it('records reviewer information', () => {
      const assessed = assessRisk(risk, {
        residualLikelihood: 2,
        residualImpact: 2,
        reviewerId: 'user-2',
        reviewerName: 'Jane Doe',
      });

      expect(assessed.reviewerId).toBe('user-2');
      expect(assessed.reviewerName).toBe('Jane Doe');
    });

    it('sets lastAssessedAt timestamp', () => {
      const before = new Date();
      const assessed = assessRisk(risk, {
        residualLikelihood: 2,
        residualImpact: 2,
        reviewerId: 'user-2',
        reviewerName: 'Reviewer',
      });

      expect(assessed.lastAssessedAt).toBeDefined();
      expect(assessed.lastAssessedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('updates withinAppetite based on new residual score', () => {
      // Original: 16 with target 12 = outside
      expect(risk.withinAppetite).toBe(false);

      const assessed = assessRisk(risk, {
        residualLikelihood: 2,
        residualImpact: 2,
        reviewerId: 'user-2',
        reviewerName: 'Reviewer',
      });

      // New: 4 with target 12 = within
      expect(assessed.withinAppetite).toBe(true);
    });
  });

  // ==========================================================================
  // CONTROL LINKING
  // ==========================================================================

  describe('Control Linking', () => {
    let risk: Risk;

    beforeEach(() => {
      risk = createRisk({
        organizationId: 'org-123',
        name: 'Test Risk',
        description: 'Test',
        category: 'compliance',
        inherentLikelihood: 3,
        inherentImpact: 3,
        ownerId: 'user-1',
        ownerName: 'Owner',
      });
    });

    describe('linkControlToRisk', () => {
      it('adds control to risk', () => {
        const updated = linkControlToRisk(risk, 'control-1');
        expect(updated.controlIds).toContain('control-1');
      });

      it('does not duplicate control links', () => {
        let updated = linkControlToRisk(risk, 'control-1');
        updated = linkControlToRisk(updated, 'control-1');

        expect(updated.controlIds.filter((id) => id === 'control-1').length).toBe(1);
      });

      it('changes status to mitigating if already assessed', () => {
        risk = assessRisk(risk, {
          residualLikelihood: 2,
          residualImpact: 2,
          reviewerId: 'user-2',
          reviewerName: 'Reviewer',
        });
        expect(risk.status).toBe('assessed');

        const updated = linkControlToRisk(risk, 'control-1');
        expect(updated.status).toBe('mitigating');
      });
    });

    describe('unlinkControlFromRisk', () => {
      it('removes control from risk', () => {
        let updated = linkControlToRisk(risk, 'control-1');
        updated = linkControlToRisk(updated, 'control-2');
        updated = unlinkControlFromRisk(updated, 'control-1');

        expect(updated.controlIds).not.toContain('control-1');
        expect(updated.controlIds).toContain('control-2');
      });

      it('handles removing non-existent control gracefully', () => {
        const updated = unlinkControlFromRisk(risk, 'non-existent');
        expect(updated.controlIds).toEqual([]);
      });
    });
  });

  // ==========================================================================
  // KEY RISK INDICATORS
  // ==========================================================================

  describe('Key Risk Indicators', () => {
    let risk: Risk;

    beforeEach(() => {
      risk = createRisk({
        organizationId: 'org-123',
        name: 'Transaction Risk',
        description: 'Risk from transactions',
        category: 'fraud',
        inherentLikelihood: 3,
        inherentImpact: 4,
        ownerId: 'user-1',
        ownerName: 'Owner',
      });
    });

    describe('addKeyRiskIndicator', () => {
      it('adds KRI with calculated status', () => {
        const updated = addKeyRiskIndicator(risk, {
          name: 'Failed Transactions',
          metric: 'count',
          currentValue: 5,
          threshold: 10,
          thresholdType: 'above',
        });

        expect(updated.keyRiskIndicators.length).toBe(1);
        const kri = updated.keyRiskIndicators[0]!;
        expect(kri.name).toBe('Failed Transactions');
        expect(kri.id).toBeDefined();
        expect(kri.status).toBe('green'); // 5 < 10
      });

      it('calculates yellow status for above threshold type', () => {
        const updated = addKeyRiskIndicator(risk, {
          name: 'Failed Transactions',
          metric: 'count',
          currentValue: 11, // Just above 10
          threshold: 10,
          thresholdType: 'above',
        });

        expect(updated.keyRiskIndicators[0]!.status).toBe('yellow');
      });

      it('calculates red status for significantly above threshold', () => {
        const updated = addKeyRiskIndicator(risk, {
          name: 'Failed Transactions',
          metric: 'count',
          currentValue: 15, // > 10 * 1.2 = 12
          threshold: 10,
          thresholdType: 'above',
        });

        expect(updated.keyRiskIndicators[0]!.status).toBe('red');
      });

      it('calculates status for below threshold type', () => {
        // Green: above threshold
        let updated = addKeyRiskIndicator(risk, {
          name: 'Control Effectiveness',
          metric: 'percent',
          currentValue: 90,
          threshold: 80,
          thresholdType: 'below',
        });
        expect(updated.keyRiskIndicators[0]!.status).toBe('green');

        // Yellow: below threshold
        updated = addKeyRiskIndicator(risk, {
          name: 'Control Effectiveness',
          metric: 'percent',
          currentValue: 75, // Below 80
          threshold: 80,
          thresholdType: 'below',
        });
        expect(updated.keyRiskIndicators[0]!.status).toBe('yellow');

        // Red: significantly below
        updated = addKeyRiskIndicator(risk, {
          name: 'Control Effectiveness',
          metric: 'percent',
          currentValue: 60, // < 80 * 0.8 = 64
          threshold: 80,
          thresholdType: 'below',
        });
        expect(updated.keyRiskIndicators[0]!.status).toBe('red');
      });

      it('calculates status for range threshold type', () => {
        // Green: within range center
        let updated = addKeyRiskIndicator(risk, {
          name: 'Processing Time',
          metric: 'ms',
          currentValue: 500,
          threshold: 0, // Not used for range
          thresholdType: 'range',
          rangeMin: 100,
          rangeMax: 900,
        });
        expect(updated.keyRiskIndicators[0]!.status).toBe('green');

        // Red: outside range
        updated = addKeyRiskIndicator(risk, {
          name: 'Processing Time',
          metric: 'ms',
          currentValue: 1000, // > 900
          threshold: 0,
          thresholdType: 'range',
          rangeMin: 100,
          rangeMax: 900,
        });
        expect(updated.keyRiskIndicators[0]!.status).toBe('red');
      });
    });

    describe('updateKRIValue', () => {
      it('updates KRI value and recalculates status', () => {
        let updated = addKeyRiskIndicator(risk, {
          name: 'Failed Transactions',
          metric: 'count',
          currentValue: 5,
          threshold: 10,
          thresholdType: 'above',
        });

        const kriId = updated.keyRiskIndicators[0]!.id;
        expect(updated.keyRiskIndicators[0]!.status).toBe('green');

        updated = updateKRIValue(updated, kriId, 15);
        expect(updated.keyRiskIndicators[0]!.currentValue).toBe(15);
        expect(updated.keyRiskIndicators[0]!.status).toBe('red');
      });
    });
  });

  // ==========================================================================
  // RISK LIFECYCLE
  // ==========================================================================

  describe('Risk Lifecycle', () => {
    let risk: Risk;

    beforeEach(() => {
      risk = createRisk({
        organizationId: 'org-123',
        name: 'Test Risk',
        description: 'Test',
        category: 'technology',
        inherentLikelihood: 2,
        inherentImpact: 2,
        ownerId: 'user-1',
        ownerName: 'Owner',
      });
    });

    describe('acceptRisk', () => {
      it('changes status to accepted', () => {
        const accepted = acceptRisk(risk, 'user-2', 'Approver');
        expect(accepted.status).toBe('accepted');
      });

      it('records approver information', () => {
        const accepted = acceptRisk(risk, 'user-2', 'Approver');
        expect(accepted.reviewerId).toBe('user-2');
        expect(accepted.reviewerName).toBe('Approver');
      });
    });

    describe('closeRisk', () => {
      it('changes status to closed', () => {
        const closed = closeRisk(risk);
        expect(closed.status).toBe('closed');
      });
    });
  });

  // ==========================================================================
  // RISK SCORING UTILITIES
  // ==========================================================================

  describe('Risk Scoring Utilities', () => {
    describe('calculateRiskScore', () => {
      it('multiplies likelihood by impact', () => {
        expect(calculateRiskScore(1, 1)).toBe(1);
        expect(calculateRiskScore(5, 5)).toBe(25);
        expect(calculateRiskScore(3, 4)).toBe(12);
      });
    });

    describe('getRiskLevel', () => {
      it('returns correct level for score ranges', () => {
        expect(getRiskLevel(1)).toBe('low');
        expect(getRiskLevel(4)).toBe('low');
        expect(getRiskLevel(5)).toBe('medium');
        expect(getRiskLevel(9)).toBe('medium');
        expect(getRiskLevel(10)).toBe('high');
        expect(getRiskLevel(16)).toBe('high');
        expect(getRiskLevel(17)).toBe('critical');
        expect(getRiskLevel(25)).toBe('critical');
      });
    });

    describe('getRiskColor', () => {
      it('returns correct color for score ranges', () => {
        expect(getRiskColor(1)).toBe('green');
        expect(getRiskColor(4)).toBe('green');
        expect(getRiskColor(5)).toBe('yellow');
        expect(getRiskColor(9)).toBe('yellow');
        expect(getRiskColor(10)).toBe('orange');
        expect(getRiskColor(16)).toBe('orange');
        expect(getRiskColor(17)).toBe('red');
        expect(getRiskColor(25)).toBe('red');
      });
    });
  });

  // ==========================================================================
  // RISK HEAT MAP
  // ==========================================================================

  describe('generateRiskHeatMap', () => {
    it('generates 5x5 matrix', () => {
      const heatMap = generateRiskHeatMap([]);

      expect(heatMap.length).toBe(5); // 5 likelihood rows
      expect(heatMap[0]!.length).toBe(5); // 5 impact columns
    });

    it('places risks in correct cells', () => {
      const risks = [
        createRisk({
          organizationId: 'org-1',
          name: 'High Risk',
          description: 'Test',
          category: 'financial',
          inherentLikelihood: 5,
          inherentImpact: 5,
          ownerId: 'user-1',
          ownerName: 'Owner',
        }),
      ];

      const heatMap = generateRiskHeatMap(risks);

      // Likelihood 5 is first row (index 0), Impact 5 is last column (index 4)
      expect(heatMap[0]![4]!.risks.length).toBe(1);
      expect(heatMap[0]![4]!.score).toBe(25);
      expect(heatMap[0]![4]!.level).toBe('critical');
    });

    it('calculates correct scores for all cells', () => {
      const heatMap = generateRiskHeatMap([]);

      // Top-right corner: likelihood 5, impact 5 = 25
      expect(heatMap[0]![4]!.score).toBe(25);

      // Bottom-left corner: likelihood 1, impact 1 = 1
      expect(heatMap[4]![0]!.score).toBe(1);
    });
  });

  // ==========================================================================
  // RISK SUMMARY
  // ==========================================================================

  describe('calculateRiskSummary', () => {
    it('calculates totals correctly', () => {
      const risks = [
        createRisk({
          organizationId: 'org-1',
          name: 'Risk 1',
          description: 'Test',
          category: 'financial',
          inherentLikelihood: 3,
          inherentImpact: 3,
          ownerId: 'user-1',
          ownerName: 'Owner',
        }),
        createRisk({
          organizationId: 'org-1',
          name: 'Risk 2',
          description: 'Test',
          category: 'operational',
          inherentLikelihood: 2,
          inherentImpact: 2,
          ownerId: 'user-1',
          ownerName: 'Owner',
        }),
      ];

      const summary = calculateRiskSummary(risks);

      expect(summary.total).toBe(2);
    });

    it('counts by status', () => {
      const risk1 = createRisk({
        organizationId: 'org-1',
        name: 'Risk 1',
        description: 'Test',
        category: 'financial',
        inherentLikelihood: 3,
        inherentImpact: 3,
        ownerId: 'user-1',
        ownerName: 'Owner',
      });

      const risk2 = assessRisk(
        createRisk({
          organizationId: 'org-1',
          name: 'Risk 2',
          description: 'Test',
          category: 'operational',
          inherentLikelihood: 2,
          inherentImpact: 2,
          ownerId: 'user-1',
          ownerName: 'Owner',
        }),
        { residualLikelihood: 2, residualImpact: 2, reviewerId: 'user-2', reviewerName: 'Rev' }
      );

      const summary = calculateRiskSummary([risk1, risk2]);

      expect(summary.byStatus.identified).toBe(1);
      expect(summary.byStatus.assessed).toBe(1);
    });

    it('counts by category', () => {
      const risks = [
        createRisk({
          organizationId: 'org-1',
          name: 'Risk 1',
          description: 'Test',
          category: 'fraud',
          inherentLikelihood: 3,
          inherentImpact: 3,
          ownerId: 'user-1',
          ownerName: 'Owner',
        }),
        createRisk({
          organizationId: 'org-1',
          name: 'Risk 2',
          description: 'Test',
          category: 'fraud',
          inherentLikelihood: 2,
          inherentImpact: 2,
          ownerId: 'user-1',
          ownerName: 'Owner',
        }),
      ];

      const summary = calculateRiskSummary(risks);
      expect(summary.byCategory.fraud).toBe(2);
    });

    it('counts within and outside appetite', () => {
      const withinAppetite = createRisk({
        organizationId: 'org-1',
        name: 'Low Risk',
        description: 'Test',
        category: 'financial',
        inherentLikelihood: 2,
        inherentImpact: 2, // Score 4 <= 12 (medium appetite)
        ownerId: 'user-1',
        ownerName: 'Owner',
      });

      const outsideAppetite = createRisk({
        organizationId: 'org-1',
        name: 'High Risk',
        description: 'Test',
        category: 'financial',
        inherentLikelihood: 5,
        inherentImpact: 5, // Score 25 > 12
        ownerId: 'user-1',
        ownerName: 'Owner',
      });

      const summary = calculateRiskSummary([withinAppetite, outsideAppetite]);

      expect(summary.withinAppetite).toBe(1);
      expect(summary.outsideAppetite).toBe(1);
    });

    it('calculates average residual score', () => {
      const risks = [
        createRisk({
          organizationId: 'org-1',
          name: 'Risk 1',
          description: 'Test',
          category: 'financial',
          inherentLikelihood: 2,
          inherentImpact: 2, // Score 4
          ownerId: 'user-1',
          ownerName: 'Owner',
        }),
        createRisk({
          organizationId: 'org-1',
          name: 'Risk 2',
          description: 'Test',
          category: 'financial',
          inherentLikelihood: 4,
          inherentImpact: 4, // Score 16
          ownerId: 'user-1',
          ownerName: 'Owner',
        }),
      ];

      const summary = calculateRiskSummary(risks);
      expect(summary.averageResidualScore).toBe(10); // (4 + 16) / 2
    });

    it('counts KRI alerts', () => {
      let risk = createRisk({
        organizationId: 'org-1',
        name: 'Risk',
        description: 'Test',
        category: 'financial',
        inherentLikelihood: 3,
        inherentImpact: 3,
        ownerId: 'user-1',
        ownerName: 'Owner',
      });

      // Add a red KRI
      risk = addKeyRiskIndicator(risk, {
        name: 'Alert KRI',
        metric: 'count',
        currentValue: 20, // > 10 * 1.2 = 12, so RED
        threshold: 10,
        thresholdType: 'above',
      });

      const summary = calculateRiskSummary([risk]);
      expect(summary.kriAlerts).toBe(1);
    });

    it('handles empty array', () => {
      const summary = calculateRiskSummary([]);

      expect(summary.total).toBe(0);
      expect(summary.averageResidualScore).toBe(0);
    });
  });

  // ==========================================================================
  // CONSTANTS
  // ==========================================================================

  describe('Constants', () => {
    it('has correct likelihood labels', () => {
      expect(LIKELIHOOD_LABELS[1]).toBe('Rare');
      expect(LIKELIHOOD_LABELS[5]).toBe('Almost Certain');
    });

    it('has correct impact labels', () => {
      expect(IMPACT_LABELS[1]).toBe('Insignificant');
      expect(IMPACT_LABELS[5]).toBe('Catastrophic');
    });

    it('has correct appetite thresholds', () => {
      expect(RISK_APPETITE_THRESHOLDS.low).toBe(6);
      expect(RISK_APPETITE_THRESHOLDS.medium).toBe(12);
      expect(RISK_APPETITE_THRESHOLDS.high).toBe(20);
    });
  });
});
