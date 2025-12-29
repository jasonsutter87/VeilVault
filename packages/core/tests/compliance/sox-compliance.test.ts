import { describe, it, expect, beforeEach } from 'vitest';

/**
 * SOX Compliance Tests
 *
 * Comprehensive tests for Sarbanes-Oxley compliance requirements
 * including Section 302, 404, and 906 certifications.
 */

// Control effectiveness enum
enum ControlEffectiveness {
  EFFECTIVE = 'effective',
  PARTIALLY_EFFECTIVE = 'partially_effective',
  INEFFECTIVE = 'ineffective',
  NOT_TESTED = 'not_tested',
}

// Control deficiency types
enum DeficiencyType {
  MATERIAL_WEAKNESS = 'material_weakness',
  SIGNIFICANT_DEFICIENCY = 'significant_deficiency',
  DEFICIENCY = 'deficiency',
}

interface Control {
  id: string;
  name: string;
  type: 'key' | 'non-key';
  effectiveness: ControlEffectiveness;
  soxRelevant: boolean;
  lastTested?: Date;
  testResults?: Array<{
    date: Date;
    result: 'pass' | 'fail' | 'exception';
    notes?: string;
  }>;
  deficiency?: DeficiencyType;
}

interface Certification {
  id: string;
  type: '302' | '404' | '906';
  period: string;
  certifier: string;
  certifierTitle: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  assertions: string[];
  materialWeaknesses: string[];
  significantDeficiencies: string[];
  certifiedAt?: Date;
}

// Mock SOX compliance service
class SOXComplianceService {
  private controls: Map<string, Control> = new Map();
  private certifications: Map<string, Certification> = new Map();

  // Control management
  addControl(control: Control): void {
    this.controls.set(control.id, control);
  }

  getControl(id: string): Control | undefined {
    return this.controls.get(id);
  }

  getAllControls(): Control[] {
    return [...this.controls.values()];
  }

  getSoxRelevantControls(): Control[] {
    return [...this.controls.values()].filter(c => c.soxRelevant);
  }

  getKeyControls(): Control[] {
    return [...this.controls.values()].filter(c => c.type === 'key');
  }

  // Testing status
  getControlTestingStatus(): {
    total: number;
    tested: number;
    untested: number;
    effective: number;
    ineffective: number;
    partiallyEffective: number;
  } {
    const soxControls = this.getSoxRelevantControls();
    return {
      total: soxControls.length,
      tested: soxControls.filter(c => c.effectiveness !== ControlEffectiveness.NOT_TESTED).length,
      untested: soxControls.filter(c => c.effectiveness === ControlEffectiveness.NOT_TESTED).length,
      effective: soxControls.filter(c => c.effectiveness === ControlEffectiveness.EFFECTIVE).length,
      ineffective: soxControls.filter(c => c.effectiveness === ControlEffectiveness.INEFFECTIVE).length,
      partiallyEffective: soxControls.filter(c => c.effectiveness === ControlEffectiveness.PARTIALLY_EFFECTIVE).length,
    };
  }

  // Deficiency classification
  classifyDeficiency(control: Control): DeficiencyType | null {
    if (control.effectiveness === ControlEffectiveness.EFFECTIVE) {
      return null;
    }

    // Key controls that are ineffective = material weakness
    if (control.type === 'key' && control.effectiveness === ControlEffectiveness.INEFFECTIVE) {
      return DeficiencyType.MATERIAL_WEAKNESS;
    }

    // Key controls partially effective = significant deficiency
    if (control.type === 'key' && control.effectiveness === ControlEffectiveness.PARTIALLY_EFFECTIVE) {
      return DeficiencyType.SIGNIFICANT_DEFICIENCY;
    }

    // Non-key controls that are ineffective = significant deficiency or deficiency
    if (control.type === 'non-key' && control.effectiveness === ControlEffectiveness.INEFFECTIVE) {
      return DeficiencyType.SIGNIFICANT_DEFICIENCY;
    }

    if (control.effectiveness === ControlEffectiveness.PARTIALLY_EFFECTIVE) {
      return DeficiencyType.DEFICIENCY;
    }

    return null;
  }

  getMaterialWeaknesses(): Control[] {
    return this.getSoxRelevantControls().filter(
      c => this.classifyDeficiency(c) === DeficiencyType.MATERIAL_WEAKNESS
    );
  }

  getSignificantDeficiencies(): Control[] {
    return this.getSoxRelevantControls().filter(
      c => this.classifyDeficiency(c) === DeficiencyType.SIGNIFICANT_DEFICIENCY
    );
  }

  // Certification management
  createCertification(cert: Certification): void {
    this.certifications.set(cert.id, cert);
  }

  getCertification(id: string): Certification | undefined {
    return this.certifications.get(id);
  }

  // Section 302 certification
  generate302Certification(period: string, certifier: string, certifierTitle: string): Certification {
    const materialWeaknesses = this.getMaterialWeaknesses();
    const significantDeficiencies = this.getSignificantDeficiencies();

    const cert: Certification = {
      id: `302-${period}-${Date.now()}`,
      type: '302',
      period,
      certifier,
      certifierTitle,
      status: 'draft',
      assertions: [
        'I have reviewed this report',
        'Based on my knowledge, this report does not contain any untrue statement of a material fact',
        'Based on my knowledge, the financial statements fairly present in all material respects the financial condition',
        'I am responsible for establishing and maintaining internal controls',
        'I have designed such internal controls to ensure material information is made known to me',
        'I have evaluated the effectiveness of internal controls within 90 days prior to this report',
        'I have disclosed any changes in internal controls that could significantly affect internal controls',
      ],
      materialWeaknesses: materialWeaknesses.map(c => c.id),
      significantDeficiencies: significantDeficiencies.map(c => c.id),
    };

    this.certifications.set(cert.id, cert);
    return cert;
  }

  // Section 404 certification
  generate404Certification(period: string, managementAssessment: string): Certification {
    const testingStatus = this.getControlTestingStatus();
    const materialWeaknesses = this.getMaterialWeaknesses();
    const significantDeficiencies = this.getSignificantDeficiencies();

    const cert: Certification = {
      id: `404-${period}-${Date.now()}`,
      type: '404',
      period,
      certifier: 'Management',
      certifierTitle: 'Management Assessment',
      status: 'draft',
      assertions: [
        'Management is responsible for establishing and maintaining adequate internal control over financial reporting',
        `Management has assessed the effectiveness of internal controls as of ${period}`,
        `Total controls tested: ${testingStatus.tested} of ${testingStatus.total}`,
        `Controls rated effective: ${testingStatus.effective}`,
        `Controls rated ineffective: ${testingStatus.ineffective}`,
        managementAssessment,
      ],
      materialWeaknesses: materialWeaknesses.map(c => c.id),
      significantDeficiencies: significantDeficiencies.map(c => c.id),
    };

    this.certifications.set(cert.id, cert);
    return cert;
  }

  // Section 906 certification
  generate906Certification(period: string, certifier: string, certifierTitle: string): Certification {
    const cert: Certification = {
      id: `906-${period}-${Date.now()}`,
      type: '906',
      period,
      certifier,
      certifierTitle,
      status: 'draft',
      assertions: [
        'The periodic report containing financial statements fully complies with the requirements of Section 13(a) or 15(d) of the Securities Exchange Act of 1934',
        'Information contained in the periodic report fairly presents, in all material respects, the financial condition and results of operations of the company',
      ],
      materialWeaknesses: [],
      significantDeficiencies: [],
    };

    this.certifications.set(cert.id, cert);
    return cert;
  }

  // Certification approval workflow
  submitForApproval(certId: string): boolean {
    const cert = this.certifications.get(certId);
    if (!cert || cert.status !== 'draft') return false;
    cert.status = 'pending';
    return true;
  }

  approveCertification(certId: string): boolean {
    const cert = this.certifications.get(certId);
    if (!cert || cert.status !== 'pending') return false;
    cert.status = 'approved';
    cert.certifiedAt = new Date();
    return true;
  }

  rejectCertification(certId: string): boolean {
    const cert = this.certifications.get(certId);
    if (!cert || cert.status !== 'pending') return false;
    cert.status = 'rejected';
    return true;
  }

  // Compliance validation
  canIssueCertification(type: '302' | '404' | '906'): { canIssue: boolean; blockers: string[] } {
    const blockers: string[] = [];
    const testingStatus = this.getControlTestingStatus();

    // All SOX controls must be tested
    if (testingStatus.untested > 0) {
      blockers.push(`${testingStatus.untested} controls have not been tested`);
    }

    // For 404, need significant testing coverage
    if (type === '404') {
      const coveragePercent = (testingStatus.tested / testingStatus.total) * 100;
      if (coveragePercent < 95) {
        blockers.push(`Testing coverage is ${coveragePercent.toFixed(1)}%, minimum 95% required`);
      }
    }

    // Check for material weaknesses
    const materialWeaknesses = this.getMaterialWeaknesses();
    if (materialWeaknesses.length > 0 && type === '302') {
      blockers.push(`${materialWeaknesses.length} material weakness(es) must be disclosed`);
    }

    return { canIssue: blockers.length === 0, blockers };
  }

  // Reporting period validation
  isValidReportingPeriod(period: string): boolean {
    return /^\d{4}-Q[1-4]$/.test(period);
  }

  // Evidence of testing
  recordTestResult(controlId: string, result: 'pass' | 'fail' | 'exception', notes?: string): boolean {
    const control = this.controls.get(controlId);
    if (!control) return false;

    if (!control.testResults) {
      control.testResults = [];
    }

    control.testResults.push({
      date: new Date(),
      result,
      notes,
    });

    control.lastTested = new Date();

    // Update effectiveness based on results
    const recentResults = control.testResults.slice(-5); // Last 5 tests
    const passRate = recentResults.filter(r => r.result === 'pass').length / recentResults.length;

    if (passRate >= 0.9) {
      control.effectiveness = ControlEffectiveness.EFFECTIVE;
    } else if (passRate >= 0.6) {
      control.effectiveness = ControlEffectiveness.PARTIALLY_EFFECTIVE;
    } else {
      control.effectiveness = ControlEffectiveness.INEFFECTIVE;
    }

    return true;
  }
}

describe('SOX Compliance', () => {
  let soxService: SOXComplianceService;

  beforeEach(() => {
    soxService = new SOXComplianceService();
  });

  describe('Control Management', () => {
    it('should add and retrieve controls', () => {
      const control: Control = {
        id: 'ctrl-001',
        name: 'Revenue Recognition',
        type: 'key',
        effectiveness: ControlEffectiveness.EFFECTIVE,
        soxRelevant: true,
      };

      soxService.addControl(control);
      const retrieved = soxService.getControl('ctrl-001');

      expect(retrieved).toEqual(control);
    });

    it('should filter SOX-relevant controls', () => {
      soxService.addControl({
        id: 'sox-001',
        name: 'Financial Control',
        type: 'key',
        effectiveness: ControlEffectiveness.EFFECTIVE,
        soxRelevant: true,
      });
      soxService.addControl({
        id: 'non-sox-001',
        name: 'Operational Control',
        type: 'non-key',
        effectiveness: ControlEffectiveness.EFFECTIVE,
        soxRelevant: false,
      });

      const soxControls = soxService.getSoxRelevantControls();
      expect(soxControls.length).toBe(1);
      expect(soxControls[0].id).toBe('sox-001');
    });

    it('should filter key controls', () => {
      soxService.addControl({
        id: 'key-001',
        name: 'Key Control',
        type: 'key',
        effectiveness: ControlEffectiveness.EFFECTIVE,
        soxRelevant: true,
      });
      soxService.addControl({
        id: 'nonkey-001',
        name: 'Non-Key Control',
        type: 'non-key',
        effectiveness: ControlEffectiveness.EFFECTIVE,
        soxRelevant: true,
      });

      const keyControls = soxService.getKeyControls();
      expect(keyControls.length).toBe(1);
      expect(keyControls[0].type).toBe('key');
    });
  });

  describe('Testing Status', () => {
    beforeEach(() => {
      // Add sample controls
      soxService.addControl({
        id: 'ctrl-001',
        name: 'Control 1',
        type: 'key',
        effectiveness: ControlEffectiveness.EFFECTIVE,
        soxRelevant: true,
      });
      soxService.addControl({
        id: 'ctrl-002',
        name: 'Control 2',
        type: 'key',
        effectiveness: ControlEffectiveness.INEFFECTIVE,
        soxRelevant: true,
      });
      soxService.addControl({
        id: 'ctrl-003',
        name: 'Control 3',
        type: 'non-key',
        effectiveness: ControlEffectiveness.NOT_TESTED,
        soxRelevant: true,
      });
      soxService.addControl({
        id: 'ctrl-004',
        name: 'Control 4',
        type: 'non-key',
        effectiveness: ControlEffectiveness.PARTIALLY_EFFECTIVE,
        soxRelevant: true,
      });
    });

    it('should calculate testing status correctly', () => {
      const status = soxService.getControlTestingStatus();

      expect(status.total).toBe(4);
      expect(status.tested).toBe(3); // All except NOT_TESTED
      expect(status.untested).toBe(1);
      expect(status.effective).toBe(1);
      expect(status.ineffective).toBe(1);
      expect(status.partiallyEffective).toBe(1);
    });
  });

  describe('Deficiency Classification', () => {
    it('should classify ineffective key control as material weakness', () => {
      const control: Control = {
        id: 'ctrl-001',
        name: 'Key Control',
        type: 'key',
        effectiveness: ControlEffectiveness.INEFFECTIVE,
        soxRelevant: true,
      };

      soxService.addControl(control);
      const deficiency = soxService.classifyDeficiency(control);

      expect(deficiency).toBe(DeficiencyType.MATERIAL_WEAKNESS);
    });

    it('should classify partially effective key control as significant deficiency', () => {
      const control: Control = {
        id: 'ctrl-002',
        name: 'Key Control',
        type: 'key',
        effectiveness: ControlEffectiveness.PARTIALLY_EFFECTIVE,
        soxRelevant: true,
      };

      soxService.addControl(control);
      const deficiency = soxService.classifyDeficiency(control);

      expect(deficiency).toBe(DeficiencyType.SIGNIFICANT_DEFICIENCY);
    });

    it('should classify ineffective non-key control as significant deficiency', () => {
      const control: Control = {
        id: 'ctrl-003',
        name: 'Non-Key Control',
        type: 'non-key',
        effectiveness: ControlEffectiveness.INEFFECTIVE,
        soxRelevant: true,
      };

      soxService.addControl(control);
      const deficiency = soxService.classifyDeficiency(control);

      expect(deficiency).toBe(DeficiencyType.SIGNIFICANT_DEFICIENCY);
    });

    it('should classify partially effective non-key control as deficiency', () => {
      const control: Control = {
        id: 'ctrl-004',
        name: 'Non-Key Control',
        type: 'non-key',
        effectiveness: ControlEffectiveness.PARTIALLY_EFFECTIVE,
        soxRelevant: true,
      };

      soxService.addControl(control);
      const deficiency = soxService.classifyDeficiency(control);

      expect(deficiency).toBe(DeficiencyType.DEFICIENCY);
    });

    it('should return null for effective controls', () => {
      const control: Control = {
        id: 'ctrl-005',
        name: 'Effective Control',
        type: 'key',
        effectiveness: ControlEffectiveness.EFFECTIVE,
        soxRelevant: true,
      };

      soxService.addControl(control);
      const deficiency = soxService.classifyDeficiency(control);

      expect(deficiency).toBeNull();
    });

    it('should identify all material weaknesses', () => {
      soxService.addControl({
        id: 'mw-001',
        name: 'Material Weakness 1',
        type: 'key',
        effectiveness: ControlEffectiveness.INEFFECTIVE,
        soxRelevant: true,
      });
      soxService.addControl({
        id: 'mw-002',
        name: 'Material Weakness 2',
        type: 'key',
        effectiveness: ControlEffectiveness.INEFFECTIVE,
        soxRelevant: true,
      });
      soxService.addControl({
        id: 'effective',
        name: 'Effective Control',
        type: 'key',
        effectiveness: ControlEffectiveness.EFFECTIVE,
        soxRelevant: true,
      });

      const materialWeaknesses = soxService.getMaterialWeaknesses();
      expect(materialWeaknesses.length).toBe(2);
    });
  });

  describe('Section 302 Certification', () => {
    beforeEach(() => {
      soxService.addControl({
        id: 'ctrl-001',
        name: 'Control 1',
        type: 'key',
        effectiveness: ControlEffectiveness.EFFECTIVE,
        soxRelevant: true,
      });
    });

    it('should generate 302 certification', () => {
      const cert = soxService.generate302Certification('2024-Q1', 'John Doe', 'CEO');

      expect(cert.type).toBe('302');
      expect(cert.period).toBe('2024-Q1');
      expect(cert.certifier).toBe('John Doe');
      expect(cert.certifierTitle).toBe('CEO');
      expect(cert.status).toBe('draft');
    });

    it('should include required 302 assertions', () => {
      const cert = soxService.generate302Certification('2024-Q1', 'John Doe', 'CEO');

      expect(cert.assertions).toContain('I have reviewed this report');
      expect(cert.assertions.some(a => a.includes('untrue statement'))).toBe(true);
      expect(cert.assertions.some(a => a.includes('internal controls'))).toBe(true);
    });

    it('should include material weaknesses in certification', () => {
      soxService.addControl({
        id: 'mw-001',
        name: 'Material Weakness',
        type: 'key',
        effectiveness: ControlEffectiveness.INEFFECTIVE,
        soxRelevant: true,
      });

      const cert = soxService.generate302Certification('2024-Q1', 'John Doe', 'CEO');

      expect(cert.materialWeaknesses).toContain('mw-001');
    });

    it('should include significant deficiencies in certification', () => {
      soxService.addControl({
        id: 'sd-001',
        name: 'Significant Deficiency',
        type: 'key',
        effectiveness: ControlEffectiveness.PARTIALLY_EFFECTIVE,
        soxRelevant: true,
      });

      const cert = soxService.generate302Certification('2024-Q1', 'John Doe', 'CEO');

      expect(cert.significantDeficiencies).toContain('sd-001');
    });
  });

  describe('Section 404 Certification', () => {
    beforeEach(() => {
      // Add enough controls to test 404 requirements
      for (let i = 0; i < 10; i++) {
        soxService.addControl({
          id: `ctrl-${i}`,
          name: `Control ${i}`,
          type: i < 5 ? 'key' : 'non-key',
          effectiveness: ControlEffectiveness.EFFECTIVE,
          soxRelevant: true,
        });
      }
    });

    it('should generate 404 certification', () => {
      const assessment = 'Internal controls are effective as of reporting date';
      const cert = soxService.generate404Certification('2024-Q1', assessment);

      expect(cert.type).toBe('404');
      expect(cert.certifier).toBe('Management');
    });

    it('should include testing metrics in 404 certification', () => {
      const cert = soxService.generate404Certification('2024-Q1', 'Controls are effective');

      expect(cert.assertions.some(a => a.includes('Total controls tested'))).toBe(true);
      expect(cert.assertions.some(a => a.includes('Controls rated effective'))).toBe(true);
    });

    it('should include management responsibility assertion', () => {
      const cert = soxService.generate404Certification('2024-Q1', 'Controls are effective');

      expect(cert.assertions.some(a => a.includes('Management is responsible'))).toBe(true);
    });
  });

  describe('Section 906 Certification', () => {
    it('should generate 906 certification', () => {
      const cert = soxService.generate906Certification('2024-Q1', 'Jane Smith', 'CFO');

      expect(cert.type).toBe('906');
      expect(cert.certifier).toBe('Jane Smith');
      expect(cert.certifierTitle).toBe('CFO');
    });

    it('should include required 906 assertions', () => {
      const cert = soxService.generate906Certification('2024-Q1', 'Jane Smith', 'CFO');

      expect(cert.assertions.some(a => a.includes('Securities Exchange Act'))).toBe(true);
      expect(cert.assertions.some(a => a.includes('fairly presents'))).toBe(true);
    });
  });

  describe('Certification Workflow', () => {
    let certId: string;

    beforeEach(() => {
      soxService.addControl({
        id: 'ctrl-001',
        name: 'Test Control',
        type: 'key',
        effectiveness: ControlEffectiveness.EFFECTIVE,
        soxRelevant: true,
      });

      const cert = soxService.generate302Certification('2024-Q1', 'John Doe', 'CEO');
      certId = cert.id;
    });

    it('should submit certification for approval', () => {
      expect(soxService.submitForApproval(certId)).toBe(true);

      const cert = soxService.getCertification(certId);
      expect(cert?.status).toBe('pending');
    });

    it('should not allow double submission', () => {
      soxService.submitForApproval(certId);
      expect(soxService.submitForApproval(certId)).toBe(false);
    });

    it('should approve certification', () => {
      soxService.submitForApproval(certId);
      expect(soxService.approveCertification(certId)).toBe(true);

      const cert = soxService.getCertification(certId);
      expect(cert?.status).toBe('approved');
      expect(cert?.certifiedAt).toBeDefined();
    });

    it('should reject certification', () => {
      soxService.submitForApproval(certId);
      expect(soxService.rejectCertification(certId)).toBe(true);

      const cert = soxService.getCertification(certId);
      expect(cert?.status).toBe('rejected');
    });

    it('should not approve draft certification', () => {
      expect(soxService.approveCertification(certId)).toBe(false);
    });

    it('should not reject draft certification', () => {
      expect(soxService.rejectCertification(certId)).toBe(false);
    });
  });

  describe('Compliance Validation', () => {
    it('should block certification when controls are untested', () => {
      soxService.addControl({
        id: 'untested',
        name: 'Untested Control',
        type: 'key',
        effectiveness: ControlEffectiveness.NOT_TESTED,
        soxRelevant: true,
      });

      const result = soxService.canIssueCertification('302');
      expect(result.canIssue).toBe(false);
      expect(result.blockers.some(b => b.includes('not been tested'))).toBe(true);
    });

    it('should allow certification when all controls tested', () => {
      soxService.addControl({
        id: 'tested',
        name: 'Tested Control',
        type: 'key',
        effectiveness: ControlEffectiveness.EFFECTIVE,
        soxRelevant: true,
      });

      const result = soxService.canIssueCertification('302');
      expect(result.canIssue).toBe(true);
      expect(result.blockers.length).toBe(0);
    });

    it('should require disclosure of material weaknesses for 302', () => {
      soxService.addControl({
        id: 'mw-001',
        name: 'Material Weakness',
        type: 'key',
        effectiveness: ControlEffectiveness.INEFFECTIVE,
        soxRelevant: true,
      });

      const result = soxService.canIssueCertification('302');
      expect(result.blockers.some(b => b.includes('material weakness'))).toBe(true);
    });
  });

  describe('Reporting Period Validation', () => {
    it('should accept valid reporting periods', () => {
      expect(soxService.isValidReportingPeriod('2024-Q1')).toBe(true);
      expect(soxService.isValidReportingPeriod('2024-Q2')).toBe(true);
      expect(soxService.isValidReportingPeriod('2024-Q3')).toBe(true);
      expect(soxService.isValidReportingPeriod('2024-Q4')).toBe(true);
      expect(soxService.isValidReportingPeriod('2023-Q1')).toBe(true);
    });

    it('should reject invalid reporting periods', () => {
      expect(soxService.isValidReportingPeriod('2024Q1')).toBe(false);
      expect(soxService.isValidReportingPeriod('2024-Q5')).toBe(false);
      expect(soxService.isValidReportingPeriod('Q1-2024')).toBe(false);
      expect(soxService.isValidReportingPeriod('24-Q1')).toBe(false);
    });
  });

  describe('Test Result Recording', () => {
    beforeEach(() => {
      soxService.addControl({
        id: 'ctrl-001',
        name: 'Test Control',
        type: 'key',
        effectiveness: ControlEffectiveness.NOT_TESTED,
        soxRelevant: true,
      });
    });

    it('should record test results', () => {
      expect(soxService.recordTestResult('ctrl-001', 'pass', 'Test notes')).toBe(true);

      const control = soxService.getControl('ctrl-001');
      expect(control?.testResults).toHaveLength(1);
      expect(control?.testResults?.[0].result).toBe('pass');
      expect(control?.testResults?.[0].notes).toBe('Test notes');
      expect(control?.lastTested).toBeDefined();
    });

    it('should update effectiveness based on test results', () => {
      // Record 5 passing tests
      for (let i = 0; i < 5; i++) {
        soxService.recordTestResult('ctrl-001', 'pass');
      }

      const control = soxService.getControl('ctrl-001');
      expect(control?.effectiveness).toBe(ControlEffectiveness.EFFECTIVE);
    });

    it('should mark as ineffective with mostly failing tests', () => {
      // Record 5 failing tests
      for (let i = 0; i < 5; i++) {
        soxService.recordTestResult('ctrl-001', 'fail');
      }

      const control = soxService.getControl('ctrl-001');
      expect(control?.effectiveness).toBe(ControlEffectiveness.INEFFECTIVE);
    });

    it('should mark as partially effective with mixed results', () => {
      // 4 pass, 1 fail = 80% pass rate
      for (let i = 0; i < 4; i++) {
        soxService.recordTestResult('ctrl-001', 'pass');
      }
      soxService.recordTestResult('ctrl-001', 'fail');

      const control = soxService.getControl('ctrl-001');
      expect(control?.effectiveness).toBe(ControlEffectiveness.PARTIALLY_EFFECTIVE);
    });

    it('should fail to record for non-existent control', () => {
      expect(soxService.recordTestResult('non-existent', 'pass')).toBe(false);
    });
  });
});

describe('SOX Compliance Edge Cases', () => {
  let soxService: SOXComplianceService;

  beforeEach(() => {
    soxService = new SOXComplianceService();
  });

  it('should handle empty control set', () => {
    const status = soxService.getControlTestingStatus();

    expect(status.total).toBe(0);
    expect(status.tested).toBe(0);
    expect(status.untested).toBe(0);
  });

  it('should handle certification for non-existent ID', () => {
    expect(soxService.submitForApproval('non-existent')).toBe(false);
    expect(soxService.approveCertification('non-existent')).toBe(false);
    expect(soxService.rejectCertification('non-existent')).toBe(false);
  });

  it('should generate unique certification IDs', () => {
    soxService.addControl({
      id: 'ctrl-001',
      name: 'Control',
      type: 'key',
      effectiveness: ControlEffectiveness.EFFECTIVE,
      soxRelevant: true,
    });

    const cert1 = soxService.generate302Certification('2024-Q1', 'CEO', 'CEO');
    const cert2 = soxService.generate302Certification('2024-Q1', 'CEO', 'CEO');

    expect(cert1.id).not.toBe(cert2.id);
  });

  it('should track multiple certifications per period', () => {
    soxService.addControl({
      id: 'ctrl-001',
      name: 'Control',
      type: 'key',
      effectiveness: ControlEffectiveness.EFFECTIVE,
      soxRelevant: true,
    });

    const cert302 = soxService.generate302Certification('2024-Q1', 'CEO', 'CEO');
    const cert404 = soxService.generate404Certification('2024-Q1', 'Effective');
    const cert906 = soxService.generate906Certification('2024-Q1', 'CFO', 'CFO');

    expect(soxService.getCertification(cert302.id)).toBeDefined();
    expect(soxService.getCertification(cert404.id)).toBeDefined();
    expect(soxService.getCertification(cert906.id)).toBeDefined();
  });
});
