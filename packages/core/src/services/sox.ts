// ==========================================================================
// SOX 404 COMPLIANCE SERVICE
// Sarbanes-Oxley Act Section 404 compliance management
// ==========================================================================

import { randomUUID } from '../utils/crypto.js';
import type { Control, ControlTest, SoxAssertion } from '../entities/control.js';
import type { Issue } from '../entities/issue.js';
import type { Risk } from '../entities/risk.js';

// Re-export SoxAssertion for convenience
export type { SoxAssertion } from '../entities/control.js';

// ==========================================================================
// SOX CATEGORIES
// ==========================================================================

export type ControlCategory =
  | 'entity_level'       // Organization-wide controls (COSO)
  | 'process_level'      // Transaction/process controls
  | 'it_general'         // IT General Controls (ITGCs)
  | 'it_application'     // Application controls
  | 'management_review'; // Management review controls

export type FinancialStatementArea =
  | 'revenue'
  | 'accounts_receivable'
  | 'inventory'
  | 'fixed_assets'
  | 'accounts_payable'
  | 'payroll'
  | 'treasury'
  | 'financial_close'
  | 'income_taxes'
  | 'equity'
  | 'other';

// ==========================================================================
// SOX CONTROL CLASSIFICATION
// ==========================================================================

export interface SoxControlClassification {
  controlId: string;
  category: ControlCategory;
  assertions: SoxAssertion[];
  financialStatementAreas: FinancialStatementArea[];
  isKeyControl: boolean;
  significantAccount: boolean;
  relatedProcesses: string[];
  testingFrequency: 'quarterly' | 'semi-annual' | 'annual';
  lastTestDate?: Date;
  nextTestDate?: Date;
}

// ==========================================================================
// DEFICIENCY TYPES
// ==========================================================================

export type DeficiencyType =
  | 'control_deficiency'
  | 'significant_deficiency'
  | 'material_weakness';

export interface SoxDeficiency {
  id: string;
  organizationId: string;
  issueId: string; // Links to Issue entity
  deficiencyType: DeficiencyType;

  // Classification
  affectedAssertions: SoxAssertion[];
  affectedAccounts: FinancialStatementArea[];
  affectedControls: string[];

  // Impact assessment
  likelihood: 'remote' | 'reasonably_possible' | 'probable';
  magnitude: 'inconsequential' | 'more_than_inconsequential' | 'material';
  aggregationRisk: boolean;

  // Compensating controls
  compensatingControls: string[];
  compensatingControlsEffective: boolean;

  // Status tracking
  identifiedDate: Date;
  remediationTargetDate?: Date;
  remediatedDate?: Date;
  status: 'open' | 'remediation_in_progress' | 'pending_validation' | 'remediated' | 'accepted';

  // Audit trail
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==========================================================================
// MANAGEMENT ASSESSMENT
// ==========================================================================

export interface ManagementAssessment {
  id: string;
  organizationId: string;
  fiscalYear: number;
  periodEnd: Date;

  // Assessment scope
  scopedControls: string[];
  scopedProcesses: string[];
  scopedAccounts: FinancialStatementArea[];

  // Testing results
  totalControlsTested: number;
  controlsEffective: number;
  controlsIneffective: number;
  controlsNotTested: number;

  // Deficiency summary
  deficiencies: string[]; // Deficiency IDs
  materialWeaknesses: number;
  significantDeficiencies: number;
  controlDeficiencies: number;

  // Assessment conclusion
  conclusionDate?: Date;
  conclusion?: 'effective' | 'ineffective' | 'pending';
  conclusionNotes?: string;

  // Sign-offs
  preparedBy: string;
  preparedByName: string;
  preparedDate: Date;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedDate?: Date;
  approvedBy?: string;
  approvedByName?: string;
  approvedDate?: Date;

  // Metadata
  status: 'draft' | 'in_progress' | 'under_review' | 'approved' | 'filed';
  createdAt: Date;
  updatedAt: Date;
}

// ==========================================================================
// SOX CERTIFICATION
// ==========================================================================

export type CertificationType = 'sox_302' | 'sox_404' | 'sub_certification';

export interface SoxCertification {
  id: string;
  organizationId: string;
  assessmentId: string;
  type: CertificationType;
  fiscalYear: number;
  periodEnd: Date;

  // Certifier information
  certifierId: string;
  certifierName: string;
  certifierTitle: string;

  // Certification content
  certificationText: string;
  disclosures: CertificationDisclosure[];

  // Status
  status: 'pending' | 'signed' | 'filed';
  signedAt?: Date;
  filedAt?: Date;

  // Audit trail
  createdAt: Date;
  updatedAt: Date;
}

export interface CertificationDisclosure {
  id: string;
  type: 'material_weakness' | 'significant_deficiency' | 'change_in_icfr' | 'fraud' | 'other';
  description: string;
  deficiencyId?: string;
}

// ==========================================================================
// SOX TESTING PERIOD
// ==========================================================================

export interface SoxTestingPeriod {
  id: string;
  organizationId: string;
  fiscalYear: number;
  quarter: 1 | 2 | 3 | 4;
  startDate: Date;
  endDate: Date;

  // Controls in scope
  controlsInScope: string[];
  controlsTested: number;
  controlsPassed: number;
  controlsFailed: number;

  // Status
  status: 'planning' | 'in_progress' | 'review' | 'completed';
  completedDate?: Date;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// ==========================================================================
// CREATE FUNCTIONS
// ==========================================================================

export interface CreateDeficiencyInput {
  organizationId: string;
  issueId: string;
  deficiencyType: DeficiencyType;
  affectedAssertions: SoxAssertion[];
  affectedAccounts: FinancialStatementArea[];
  affectedControls: string[];
  likelihood: 'remote' | 'reasonably_possible' | 'probable';
  magnitude: 'inconsequential' | 'more_than_inconsequential' | 'material';
  aggregationRisk?: boolean;
  compensatingControls?: string[];
  remediationTargetDate?: Date;
  createdBy: string;
}

export function createSoxDeficiency(input: CreateDeficiencyInput): SoxDeficiency {
  const now = new Date();
  return {
    id: randomUUID(),
    organizationId: input.organizationId,
    issueId: input.issueId,
    deficiencyType: input.deficiencyType,
    affectedAssertions: input.affectedAssertions,
    affectedAccounts: input.affectedAccounts,
    affectedControls: input.affectedControls,
    likelihood: input.likelihood,
    magnitude: input.magnitude,
    aggregationRisk: input.aggregationRisk ?? false,
    compensatingControls: input.compensatingControls ?? [],
    compensatingControlsEffective: false,
    identifiedDate: now,
    remediationTargetDate: input.remediationTargetDate,
    status: 'open',
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  };
}

export interface CreateAssessmentInput {
  organizationId: string;
  fiscalYear: number;
  periodEnd: Date;
  preparedBy: string;
  preparedByName: string;
}

export function createManagementAssessment(input: CreateAssessmentInput): ManagementAssessment {
  const now = new Date();
  return {
    id: randomUUID(),
    organizationId: input.organizationId,
    fiscalYear: input.fiscalYear,
    periodEnd: input.periodEnd,
    scopedControls: [],
    scopedProcesses: [],
    scopedAccounts: [],
    totalControlsTested: 0,
    controlsEffective: 0,
    controlsIneffective: 0,
    controlsNotTested: 0,
    deficiencies: [],
    materialWeaknesses: 0,
    significantDeficiencies: 0,
    controlDeficiencies: 0,
    preparedBy: input.preparedBy,
    preparedByName: input.preparedByName,
    preparedDate: now,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  };
}

// ==========================================================================
// DEFICIENCY CLASSIFICATION
// ==========================================================================

/**
 * Evaluate deficiency type based on likelihood and magnitude
 * Per PCAOB AS 2201 / SEC guidance
 */
export function evaluateDeficiencyType(
  likelihood: 'remote' | 'reasonably_possible' | 'probable',
  magnitude: 'inconsequential' | 'more_than_inconsequential' | 'material'
): DeficiencyType {
  // Material weakness: probable likelihood + material magnitude
  // OR reasonably possible + material
  if (magnitude === 'material' && (likelihood === 'probable' || likelihood === 'reasonably_possible')) {
    return 'material_weakness';
  }

  // Significant deficiency: more than remote likelihood + more than inconsequential
  if (likelihood !== 'remote' && magnitude !== 'inconsequential') {
    return 'significant_deficiency';
  }

  return 'control_deficiency';
}

/**
 * Check if deficiency requires disclosure
 */
export function requiresDisclosure(deficiency: SoxDeficiency): boolean {
  return deficiency.deficiencyType === 'material_weakness' ||
         deficiency.deficiencyType === 'significant_deficiency';
}

// ==========================================================================
// ASSESSMENT FUNCTIONS
// ==========================================================================

export function addControlToScope(
  assessment: ManagementAssessment,
  controlId: string
): ManagementAssessment {
  if (assessment.scopedControls.includes(controlId)) return assessment;

  return {
    ...assessment,
    scopedControls: [...assessment.scopedControls, controlId],
    updatedAt: new Date(),
  };
}

export function addAccountToScope(
  assessment: ManagementAssessment,
  account: FinancialStatementArea
): ManagementAssessment {
  if (assessment.scopedAccounts.includes(account)) return assessment;

  return {
    ...assessment,
    scopedAccounts: [...assessment.scopedAccounts, account],
    updatedAt: new Date(),
  };
}

export function updateTestingResults(
  assessment: ManagementAssessment,
  results: {
    controlsTested: number;
    controlsEffective: number;
    controlsIneffective: number;
  }
): ManagementAssessment {
  return {
    ...assessment,
    totalControlsTested: results.controlsTested,
    controlsEffective: results.controlsEffective,
    controlsIneffective: results.controlsIneffective,
    controlsNotTested: assessment.scopedControls.length - results.controlsTested,
    updatedAt: new Date(),
  };
}

export function addDeficiencyToAssessment(
  assessment: ManagementAssessment,
  deficiency: SoxDeficiency
): ManagementAssessment {
  if (assessment.deficiencies.includes(deficiency.id)) return assessment;

  let materialWeaknesses = assessment.materialWeaknesses;
  let significantDeficiencies = assessment.significantDeficiencies;
  let controlDeficiencies = assessment.controlDeficiencies;

  switch (deficiency.deficiencyType) {
    case 'material_weakness':
      materialWeaknesses++;
      break;
    case 'significant_deficiency':
      significantDeficiencies++;
      break;
    case 'control_deficiency':
      controlDeficiencies++;
      break;
  }

  return {
    ...assessment,
    deficiencies: [...assessment.deficiencies, deficiency.id],
    materialWeaknesses,
    significantDeficiencies,
    controlDeficiencies,
    updatedAt: new Date(),
  };
}

export function concludeAssessment(
  assessment: ManagementAssessment,
  conclusion: 'effective' | 'ineffective',
  notes: string,
  approvedBy: string,
  approvedByName: string
): ManagementAssessment {
  const now = new Date();

  return {
    ...assessment,
    conclusion,
    conclusionDate: now,
    conclusionNotes: notes,
    approvedBy,
    approvedByName,
    approvedDate: now,
    status: 'approved',
    updatedAt: now,
  };
}

// ==========================================================================
// CERTIFICATION GENERATION
// ==========================================================================

export function generateSox302CertificationText(
  assessment: ManagementAssessment,
  certifierName: string,
  certifierTitle: string,
  companyName: string
): string {
  const conclusion = assessment.conclusion === 'effective'
    ? 'effective'
    : 'not effective due to the material weaknesses described below';

  return `SOX SECTION 302 CERTIFICATION

I, ${certifierName}, ${certifierTitle} of ${companyName}, certify that:

1. I have reviewed this annual report on Form 10-K for the fiscal year ended ${assessment.periodEnd.toISOString().split('T')[0]};

2. Based on my knowledge, this report does not contain any untrue statement of a material fact or omit to state a material fact necessary to make the statements made, in light of the circumstances under which such statements were made, not misleading;

3. Based on my knowledge, the financial statements, and other financial information included in this report, fairly present in all material respects the financial condition, results of operations and cash flows of the registrant;

4. The registrant's other certifying officer(s) and I are responsible for establishing and maintaining disclosure controls and procedures;

5. The registrant's other certifying officer(s) and I have:
   (a) Designed such disclosure controls and procedures to ensure material information is made known to us;
   (b) Designed such internal control over financial reporting to provide reasonable assurance;
   (c) Evaluated the effectiveness of disclosure controls and procedures;
   (d) Disclosed in this report any change in internal control over financial reporting that occurred during the most recent fiscal quarter;

6. The registrant's other certifying officer(s) and I have disclosed:
   (a) All significant deficiencies and material weaknesses in the design or operation of internal control over financial reporting which are reasonably likely to adversely affect the registrant's ability to record, process, summarize and report financial information;
   (b) Any fraud, whether or not material, that involves management or other employees who have a significant role in the registrant's internal control over financial reporting.

Management's assessment of internal control over financial reporting is ${conclusion}.

Date: ${new Date().toISOString().split('T')[0]}

/s/ ${certifierName}
${certifierName}
${certifierTitle}`;
}

export function generateSox404CertificationText(
  assessment: ManagementAssessment,
  certifierName: string,
  certifierTitle: string,
  companyName: string
): string {
  const materialWeaknessText = assessment.materialWeaknesses > 0
    ? `Management identified ${assessment.materialWeaknesses} material weakness(es) in internal control over financial reporting as of the evaluation date.`
    : 'No material weaknesses were identified as of the evaluation date.';

  return `MANAGEMENT'S REPORT ON INTERNAL CONTROL OVER FINANCIAL REPORTING

${companyName}'s management is responsible for establishing and maintaining adequate internal control over financial reporting. Internal control over financial reporting is defined in Rules 13a-15(f) and 15d-15(f) promulgated under the Securities Exchange Act of 1934 as a process designed by, or under the supervision of, the company's principal executive and principal financial officers and effected by the company's board of directors, management and other personnel, to provide reasonable assurance regarding the reliability of financial reporting and the preparation of financial statements for external purposes in accordance with generally accepted accounting principles.

${companyName}'s internal control over financial reporting includes those policies and procedures that (i) pertain to the maintenance of records that, in reasonable detail, accurately and fairly reflect the transactions and dispositions of the assets of the company; (ii) provide reasonable assurance that transactions are recorded as necessary to permit preparation of financial statements in accordance with generally accepted accounting principles, and that receipts and expenditures of the company are being made only in accordance with authorizations of management and directors of the company; and (iii) provide reasonable assurance regarding prevention or timely detection of unauthorized acquisition, use, or disposition of the company's assets that could have a material effect on the financial statements.

Because of its inherent limitations, internal control over financial reporting may not prevent or detect misstatements. Also, projections of any evaluation of the effectiveness of internal control over financial reporting to future periods are subject to the risk that the controls may become inadequate because of changes in conditions, or that the degree of compliance with the policies or procedures may deteriorate.

${companyName}'s management assessed the effectiveness of the company's internal control over financial reporting as of ${assessment.periodEnd.toISOString().split('T')[0]}. In making this assessment, management used the criteria set forth by the Committee of Sponsoring Organizations of the Treadway Commission (COSO) in Internal Control—Integrated Framework (2013).

Based on our assessment and those criteria, management concluded that, as of ${assessment.periodEnd.toISOString().split('T')[0]}, ${companyName}'s internal control over financial reporting was ${assessment.conclusion === 'effective' ? 'effective' : 'not effective'}.

${materialWeaknessText}

TESTING SUMMARY:
- Total Controls in Scope: ${assessment.scopedControls.length}
- Controls Tested: ${assessment.totalControlsTested}
- Controls Effective: ${assessment.controlsEffective}
- Controls Ineffective: ${assessment.controlsIneffective}

DEFICIENCY SUMMARY:
- Material Weaknesses: ${assessment.materialWeaknesses}
- Significant Deficiencies: ${assessment.significantDeficiencies}
- Control Deficiencies: ${assessment.controlDeficiencies}

Date: ${new Date().toISOString().split('T')[0]}

/s/ ${certifierName}
${certifierName}
${certifierTitle}`;
}

export function createSoxCertification(
  assessment: ManagementAssessment,
  type: CertificationType,
  certifierId: string,
  certifierName: string,
  certifierTitle: string,
  companyName: string
): SoxCertification {
  const now = new Date();

  const certificationText = type === 'sox_302'
    ? generateSox302CertificationText(assessment, certifierName, certifierTitle, companyName)
    : generateSox404CertificationText(assessment, certifierName, certifierTitle, companyName);

  // Generate disclosures from deficiencies
  const disclosures: CertificationDisclosure[] = [];

  if (assessment.materialWeaknesses > 0) {
    disclosures.push({
      id: randomUUID(),
      type: 'material_weakness',
      description: `${assessment.materialWeaknesses} material weakness(es) identified`,
    });
  }

  if (assessment.significantDeficiencies > 0) {
    disclosures.push({
      id: randomUUID(),
      type: 'significant_deficiency',
      description: `${assessment.significantDeficiencies} significant deficiency(ies) identified`,
    });
  }

  return {
    id: randomUUID(),
    organizationId: assessment.organizationId,
    assessmentId: assessment.id,
    type,
    fiscalYear: assessment.fiscalYear,
    periodEnd: assessment.periodEnd,
    certifierId,
    certifierName,
    certifierTitle,
    certificationText,
    disclosures,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };
}

export function signCertification(certification: SoxCertification): SoxCertification {
  return {
    ...certification,
    status: 'signed',
    signedAt: new Date(),
    updatedAt: new Date(),
  };
}

// ==========================================================================
// SOX SUMMARY & ANALYTICS
// ==========================================================================

export interface SoxSummary {
  fiscalYear: number;
  totalSoxControls: number;
  controlsByCategory: Record<ControlCategory, number>;
  controlsByAssertion: Record<SoxAssertion, number>;
  keyControls: number;
  testingProgress: {
    tested: number;
    passed: number;
    failed: number;
    pending: number;
  };
  deficiencies: {
    total: number;
    materialWeaknesses: number;
    significantDeficiencies: number;
    controlDeficiencies: number;
    remediated: number;
    open: number;
  };
  assessmentStatus?: 'draft' | 'in_progress' | 'under_review' | 'approved' | 'filed';
  certificationStatus?: 'pending' | 'signed' | 'filed';
}

export function calculateSoxSummary(
  controls: Control[],
  deficiencies: SoxDeficiency[],
  assessment?: ManagementAssessment,
  certification?: SoxCertification
): SoxSummary {
  const soxControls = controls.filter(c => c.isSoxRelevant);

  const controlsByCategory: Record<ControlCategory, number> = {
    entity_level: 0,
    process_level: 0,
    it_general: 0,
    it_application: 0,
    management_review: 0,
  };

  const controlsByAssertion: Record<SoxAssertion, number> = {
    existence: 0,
    completeness: 0,
    valuation: 0,
    rights_obligations: 0,
    presentation_disclosure: 0,
  };

  let keyControls = 0;
  let tested = 0;
  let passed = 0;
  let failed = 0;

  for (const control of soxControls) {
    // Count by effectiveness status
    if (control.lastTestedAt) {
      tested++;
      if (control.currentEffectiveness === 'effective') {
        passed++;
      } else if (control.currentEffectiveness === 'ineffective') {
        failed++;
      }
    }

    // Count assertions
    if (control.soxAssertion) {
      for (const assertion of control.soxAssertion) {
        controlsByAssertion[assertion as SoxAssertion]++;
      }
    }
  }

  // Deficiency counts
  let remediated = 0;
  let open = 0;

  for (const def of deficiencies) {
    if (def.status === 'remediated') {
      remediated++;
    } else if (def.status !== 'accepted') {
      open++;
    }
  }

  return {
    fiscalYear: assessment?.fiscalYear ?? new Date().getFullYear(),
    totalSoxControls: soxControls.length,
    controlsByCategory,
    controlsByAssertion,
    keyControls,
    testingProgress: {
      tested,
      passed,
      failed,
      pending: soxControls.length - tested,
    },
    deficiencies: {
      total: deficiencies.length,
      materialWeaknesses: deficiencies.filter(d => d.deficiencyType === 'material_weakness').length,
      significantDeficiencies: deficiencies.filter(d => d.deficiencyType === 'significant_deficiency').length,
      controlDeficiencies: deficiencies.filter(d => d.deficiencyType === 'control_deficiency').length,
      remediated,
      open,
    },
    assessmentStatus: assessment?.status,
    certificationStatus: certification?.status,
  };
}
