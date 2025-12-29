// ==========================================================================
// RISK-CONTROL MATRIX (RCM) SERVICE
// Manages the relationship between risks and controls
// ==========================================================================

import type { Risk, RiskSummary } from '../entities/risk.js';
import { calculateRiskSummary, getRiskLevel, linkControlToRisk, assessRisk } from '../entities/risk.js';
import type { Control, ControlSummary, ControlTest } from '../entities/control.js';
import { calculateControlSummary, updateControlEffectiveness, linkRiskToControl } from '../entities/control.js';

export interface RiskControlMapping {
  riskId: string;
  riskName: string;
  controlId: string;
  controlName: string;
  controlEffectiveness: Control['currentEffectiveness'];
  coverageStrength: 'strong' | 'moderate' | 'weak';
}

export interface RCMCell {
  risk: Risk;
  controls: Control[];
  coverageGap: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  mitigationStatus: 'fully_mitigated' | 'partially_mitigated' | 'not_mitigated';
}

export interface RCMSummary {
  totalRisks: number;
  totalControls: number;
  totalMappings: number;
  risksWithoutControls: number;
  controlsWithoutRisks: number;
  coverageGaps: string[]; // Risk IDs with gaps
  overallCoverageScore: number; // 0-100
  riskSummary: RiskSummary;
  controlSummary: ControlSummary;
}

export interface RCMConfig {
  organizationId: string;
}

export class RiskControlMatrixService {
  private organizationId: string;
  private risks: Map<string, Risk> = new Map();
  private controls: Map<string, Control> = new Map();
  private controlTests: Map<string, ControlTest[]> = new Map();

  constructor(config: RCMConfig) {
    this.organizationId = config.organizationId;
  }

  // ==========================================================================
  // RISK MANAGEMENT
  // ==========================================================================

  addRisk(risk: Risk): void {
    this.risks.set(risk.id, risk);
  }

  getRisk(riskId: string): Risk | undefined {
    return this.risks.get(riskId);
  }

  getAllRisks(): Risk[] {
    return Array.from(this.risks.values());
  }

  updateRisk(risk: Risk): void {
    this.risks.set(risk.id, risk);
  }

  // ==========================================================================
  // CONTROL MANAGEMENT
  // ==========================================================================

  addControl(control: Control): void {
    this.controls.set(control.id, control);
  }

  getControl(controlId: string): Control | undefined {
    return this.controls.get(controlId);
  }

  getAllControls(): Control[] {
    return Array.from(this.controls.values());
  }

  updateControl(control: Control): void {
    this.controls.set(control.id, control);
  }

  // ==========================================================================
  // MAPPING OPERATIONS
  // ==========================================================================

  /**
   * Link a control to a risk (bidirectional)
   */
  linkRiskAndControl(riskId: string, controlId: string): { risk: Risk; control: Control } | null {
    const risk = this.risks.get(riskId);
    const control = this.controls.get(controlId);

    if (!risk || !control) return null;

    const updatedRisk = linkControlToRisk(risk, controlId);
    const updatedControl = linkRiskToControl(control, riskId);

    this.risks.set(riskId, updatedRisk);
    this.controls.set(controlId, updatedControl);

    return { risk: updatedRisk, control: updatedControl };
  }

  /**
   * Get all risk-control mappings
   */
  getMappings(): RiskControlMapping[] {
    const mappings: RiskControlMapping[] = [];

    for (const risk of this.risks.values()) {
      for (const controlId of risk.controlIds) {
        const control = this.controls.get(controlId);
        if (control) {
          mappings.push({
            riskId: risk.id,
            riskName: risk.name,
            controlId: control.id,
            controlName: control.name,
            controlEffectiveness: control.currentEffectiveness,
            coverageStrength: this.calculateCoverageStrength(control),
          });
        }
      }
    }

    return mappings;
  }

  /**
   * Get controls for a specific risk
   */
  getControlsForRisk(riskId: string): Control[] {
    const risk = this.risks.get(riskId);
    if (!risk) return [];

    return risk.controlIds
      .map((id) => this.controls.get(id))
      .filter((c): c is Control => c !== undefined);
  }

  /**
   * Get risks for a specific control
   */
  getRisksForControl(controlId: string): Risk[] {
    const control = this.controls.get(controlId);
    if (!control) return [];

    return control.riskIds
      .map((id) => this.risks.get(id))
      .filter((r): r is Risk => r !== undefined);
  }

  // ==========================================================================
  // MATRIX GENERATION
  // ==========================================================================

  /**
   * Generate the full Risk-Control Matrix
   */
  generateMatrix(): RCMCell[] {
    const cells: RCMCell[] = [];

    for (const risk of this.risks.values()) {
      const controls = this.getControlsForRisk(risk.id);

      cells.push({
        risk,
        controls,
        coverageGap: this.hasCoverageGap(risk, controls),
        riskLevel: getRiskLevel(risk.residualScore),
        mitigationStatus: this.getMitigationStatus(risk, controls),
      });
    }

    // Sort by risk level (critical first)
    return cells.sort((a, b) => {
      const levelOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return levelOrder[a.riskLevel] - levelOrder[b.riskLevel];
    });
  }

  /**
   * Generate RCM summary
   */
  getSummary(): RCMSummary {
    const risks = this.getAllRisks();
    const controls = this.getAllControls();
    const mappings = this.getMappings();

    const risksWithoutControls = risks.filter((r) => r.controlIds.length === 0);
    const controlsWithoutRisks = controls.filter((c) => c.riskIds.length === 0);

    const coverageGaps: string[] = [];
    for (const risk of risks) {
      const riskControls = this.getControlsForRisk(risk.id);
      if (this.hasCoverageGap(risk, riskControls)) {
        coverageGaps.push(risk.id);
      }
    }

    // Calculate overall coverage score
    const overallCoverageScore = this.calculateOverallCoverageScore(risks, controls);

    return {
      totalRisks: risks.length,
      totalControls: controls.length,
      totalMappings: mappings.length,
      risksWithoutControls: risksWithoutControls.length,
      controlsWithoutRisks: controlsWithoutRisks.length,
      coverageGaps,
      overallCoverageScore,
      riskSummary: calculateRiskSummary(risks),
      controlSummary: calculateControlSummary(controls),
    };
  }

  // ==========================================================================
  // GAP ANALYSIS
  // ==========================================================================

  /**
   * Identify risks with insufficient control coverage
   */
  identifyGaps(): Array<{
    risk: Risk;
    gapType: 'no_controls' | 'ineffective_controls' | 'insufficient_coverage';
    recommendation: string;
  }> {
    const gaps: Array<{
      risk: Risk;
      gapType: 'no_controls' | 'ineffective_controls' | 'insufficient_coverage';
      recommendation: string;
    }> = [];

    for (const risk of this.risks.values()) {
      const controls = this.getControlsForRisk(risk.id);

      if (controls.length === 0) {
        gaps.push({
          risk,
          gapType: 'no_controls',
          recommendation: `Implement controls to mitigate risk: ${risk.name}`,
        });
        continue;
      }

      const effectiveControls = controls.filter((c) => c.currentEffectiveness === 'effective');
      if (effectiveControls.length === 0) {
        gaps.push({
          risk,
          gapType: 'ineffective_controls',
          recommendation: `Improve effectiveness of controls for risk: ${risk.name}`,
        });
        continue;
      }

      // Check if risk is still outside appetite despite controls
      if (!risk.withinAppetite) {
        gaps.push({
          risk,
          gapType: 'insufficient_coverage',
          recommendation: `Add additional controls or strengthen existing controls for risk: ${risk.name}`,
        });
      }
    }

    return gaps;
  }

  // ==========================================================================
  // CONTROL TEST MANAGEMENT
  // ==========================================================================

  addControlTest(test: ControlTest): void {
    const tests = this.controlTests.get(test.controlId) ?? [];
    tests.push(test);
    this.controlTests.set(test.controlId, tests);

    // Update control effectiveness based on test result
    if (test.result) {
      const control = this.controls.get(test.controlId);
      if (control) {
        let effectiveness = control.currentEffectiveness;
        if (test.result === 'pass') {
          effectiveness = 'effective';
        } else if (test.result === 'fail') {
          effectiveness = 'ineffective';
        } else if (test.result === 'pass_with_exceptions') {
          effectiveness = 'partially_effective';
        }

        const updatedControl = updateControlEffectiveness(control, effectiveness);
        this.controls.set(control.id, updatedControl);
      }
    }
  }

  getControlTests(controlId: string): ControlTest[] {
    return this.controlTests.get(controlId) ?? [];
  }

  getLatestControlTest(controlId: string): ControlTest | undefined {
    const tests = this.controlTests.get(controlId) ?? [];
    return tests.sort((a, b) => b.executedAt.getTime() - a.executedAt.getTime())[0];
  }

  // ==========================================================================
  // RECALCULATE RESIDUAL RISK
  // ==========================================================================

  /**
   * Recalculate residual risk based on control effectiveness
   */
  recalculateResidualRisk(riskId: string): Risk | null {
    const risk = this.risks.get(riskId);
    if (!risk) return null;

    const controls = this.getControlsForRisk(riskId);
    if (controls.length === 0) {
      // No controls, residual = inherent
      return risk;
    }

    // Calculate mitigation factor based on control effectiveness
    let mitigationFactor = 0;
    for (const control of controls) {
      if (control.currentEffectiveness === 'effective') {
        mitigationFactor += 0.3; // Each effective control reduces risk by 30%
      } else if (control.currentEffectiveness === 'partially_effective') {
        mitigationFactor += 0.15;
      }
    }

    // Cap mitigation at 70% (can't fully eliminate risk with controls alone)
    mitigationFactor = Math.min(mitigationFactor, 0.7);

    // Calculate new residual scores
    const likelihoodReduction = Math.floor(risk.inherentLikelihood * mitigationFactor);
    const impactReduction = Math.floor(risk.inherentImpact * mitigationFactor * 0.5); // Impact harder to reduce

    const newLikelihood = Math.max(1, risk.inherentLikelihood - likelihoodReduction) as 1 | 2 | 3 | 4 | 5;
    const newImpact = Math.max(1, risk.inherentImpact - impactReduction) as 1 | 2 | 3 | 4 | 5;

    const updatedRisk = assessRisk(risk, {
      residualLikelihood: newLikelihood,
      residualImpact: newImpact,
      reviewerId: 'system',
      reviewerName: 'System Auto-Calculation',
    });

    this.risks.set(riskId, updatedRisk);
    return updatedRisk;
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private calculateCoverageStrength(control: Control): 'strong' | 'moderate' | 'weak' {
    if (control.currentEffectiveness === 'effective' && control.nature === 'automated') {
      return 'strong';
    }
    if (control.currentEffectiveness === 'effective' || control.currentEffectiveness === 'partially_effective') {
      return 'moderate';
    }
    return 'weak';
  }

  private hasCoverageGap(risk: Risk, controls: Control[]): boolean {
    if (controls.length === 0) return true;

    const hasEffectiveControl = controls.some((c) => c.currentEffectiveness === 'effective');
    if (!hasEffectiveControl && getRiskLevel(risk.residualScore) !== 'low') {
      return true;
    }

    return !risk.withinAppetite;
  }

  private getMitigationStatus(
    risk: Risk,
    controls: Control[]
  ): 'fully_mitigated' | 'partially_mitigated' | 'not_mitigated' {
    if (controls.length === 0) return 'not_mitigated';

    const effectiveControls = controls.filter((c) => c.currentEffectiveness === 'effective');

    if (effectiveControls.length > 0 && risk.withinAppetite) {
      return 'fully_mitigated';
    }

    if (effectiveControls.length > 0 || controls.some((c) => c.currentEffectiveness === 'partially_effective')) {
      return 'partially_mitigated';
    }

    return 'not_mitigated';
  }

  private calculateOverallCoverageScore(risks: Risk[], controls: Control[]): number {
    if (risks.length === 0) return 100;

    let score = 0;
    for (const risk of risks) {
      const riskControls = this.getControlsForRisk(risk.id);
      const status = this.getMitigationStatus(risk, riskControls);

      if (status === 'fully_mitigated') {
        score += 100;
      } else if (status === 'partially_mitigated') {
        score += 50;
      }
    }

    return Math.round(score / risks.length);
  }
}

export function createRCMService(config: RCMConfig): RiskControlMatrixService {
  return new RiskControlMatrixService(config);
}
