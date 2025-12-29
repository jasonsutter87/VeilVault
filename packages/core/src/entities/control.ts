// ==========================================================================
// CONTROL ENTITY
// Internal controls and testing framework for SOX/compliance
// ==========================================================================

import { randomUUID } from '../utils/crypto.js';

export type ControlType = 'preventive' | 'detective' | 'corrective' | 'directive';
export type ControlNature = 'manual' | 'automated' | 'hybrid';
export type ControlFrequency = 'continuous' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually' | 'ad_hoc';
export type ControlStatus = 'draft' | 'active' | 'inactive' | 'deprecated';
export type ControlEffectiveness = 'effective' | 'partially_effective' | 'ineffective' | 'not_tested';

export interface Control {
  id: string;
  organizationId: string;
  controlId: string; // User-defined control ID (e.g., "FIN-001")
  name: string;
  description: string;
  objective: string;

  // Classification
  type: ControlType;
  nature: ControlNature;
  frequency: ControlFrequency;
  status: ControlStatus;

  // SOX relevance
  isSoxRelevant: boolean;
  soxAssertion?: SoxAssertion[];
  financialStatementArea?: string;

  // Ownership
  ownerId: string;
  ownerName: string;
  performerId?: string;
  performerName?: string;

  // Effectiveness
  currentEffectiveness: ControlEffectiveness;
  lastTestedAt?: Date;
  nextTestDate?: Date;

  // Testing
  testingProcedure: string;
  sampleSize?: number;
  evidenceRequired: string[];

  // Linked entities
  riskIds: string[]; // Risks this control mitigates
  processId?: string;

  // Metadata
  tags: string[];
  attachments: ControlAttachment[];
  createdAt: Date;
  updatedAt: Date;
}

export type SoxAssertion =
  | 'existence'
  | 'completeness'
  | 'valuation'
  | 'rights_obligations'
  | 'presentation_disclosure';

export interface ControlAttachment {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadedAt: Date;
  uploadedBy: string;
}

export interface CreateControlInput {
  organizationId: string;
  controlId: string;
  name: string;
  description: string;
  objective: string;
  type: ControlType;
  nature: ControlNature;
  frequency: ControlFrequency;
  ownerId: string;
  ownerName: string;
  testingProcedure: string;
  isSoxRelevant?: boolean;
  soxAssertion?: SoxAssertion[];
  financialStatementArea?: string;
  evidenceRequired?: string[];
  tags?: string[];
}

// ==========================================================================
// CONTROL TEST
// Individual control test execution and results
// ==========================================================================

export type TestResult = 'pass' | 'fail' | 'pass_with_exceptions' | 'not_applicable';
export type TestType = 'design' | 'operating';

export interface ControlTest {
  id: string;
  controlId: string;
  organizationId: string;
  testType: TestType;
  testPeriodStart: Date;
  testPeriodEnd: Date;

  // Execution
  testerId: string;
  testerName: string;
  executedAt: Date;
  completedAt?: Date;

  // Sampling
  populationSize: number;
  sampleSize: number;
  samplesSelected: string[];
  samplesTested: number;

  // Results
  result?: TestResult;
  exceptionsFound: number;
  exceptionsDetails?: ControlException[];

  // Evidence
  evidenceCollected: TestEvidence[];
  workpaperRef?: string;

  // Sign-off
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: Date;
  reviewNotes?: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface ControlException {
  id: string;
  sampleRef: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  rootCause?: string;
  issueId?: string; // Link to Issue entity
}

export interface TestEvidence {
  id: string;
  type: 'screenshot' | 'document' | 'export' | 'log' | 'other';
  name: string;
  description?: string;
  url: string;
  uploadedAt: Date;
  uploadedBy: string;
}

export interface CreateControlTestInput {
  controlId: string;
  organizationId: string;
  testType: TestType;
  testPeriodStart: Date;
  testPeriodEnd: Date;
  testerId: string;
  testerName: string;
  populationSize: number;
  sampleSize: number;
}

// ==========================================================================
// CONTROL FUNCTIONS
// ==========================================================================

export function createControl(input: CreateControlInput): Control {
  const now = new Date();

  return {
    id: randomUUID(),
    organizationId: input.organizationId,
    controlId: input.controlId,
    name: input.name,
    description: input.description,
    objective: input.objective,
    type: input.type,
    nature: input.nature,
    frequency: input.frequency,
    status: 'draft',

    isSoxRelevant: input.isSoxRelevant ?? false,
    soxAssertion: input.soxAssertion,
    financialStatementArea: input.financialStatementArea,

    ownerId: input.ownerId,
    ownerName: input.ownerName,

    currentEffectiveness: 'not_tested',

    testingProcedure: input.testingProcedure,
    evidenceRequired: input.evidenceRequired ?? [],

    riskIds: [],

    tags: input.tags ?? [],
    attachments: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function activateControl(control: Control): Control {
  return {
    ...control,
    status: 'active',
    updatedAt: new Date(),
  };
}

export function linkRiskToControl(control: Control, riskId: string): Control {
  if (control.riskIds.includes(riskId)) return control;

  return {
    ...control,
    riskIds: [...control.riskIds, riskId],
    updatedAt: new Date(),
  };
}

export function unlinkRiskFromControl(control: Control, riskId: string): Control {
  return {
    ...control,
    riskIds: control.riskIds.filter((id) => id !== riskId),
    updatedAt: new Date(),
  };
}

export function updateControlEffectiveness(
  control: Control,
  effectiveness: ControlEffectiveness
): Control {
  return {
    ...control,
    currentEffectiveness: effectiveness,
    lastTestedAt: new Date(),
    updatedAt: new Date(),
  };
}

export function scheduleControlTest(control: Control, nextTestDate: Date): Control {
  return {
    ...control,
    nextTestDate,
    updatedAt: new Date(),
  };
}

// ==========================================================================
// CONTROL TEST FUNCTIONS
// ==========================================================================

export function createControlTest(input: CreateControlTestInput): ControlTest {
  const now = new Date();

  return {
    id: randomUUID(),
    controlId: input.controlId,
    organizationId: input.organizationId,
    testType: input.testType,
    testPeriodStart: input.testPeriodStart,
    testPeriodEnd: input.testPeriodEnd,
    testerId: input.testerId,
    testerName: input.testerName,
    executedAt: now,
    populationSize: input.populationSize,
    sampleSize: input.sampleSize,
    samplesSelected: [],
    samplesTested: 0,
    exceptionsFound: 0,
    evidenceCollected: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function selectSamples(test: ControlTest, sampleIds: string[]): ControlTest {
  return {
    ...test,
    samplesSelected: sampleIds,
    updatedAt: new Date(),
  };
}

export function recordTestResult(
  test: ControlTest,
  result: TestResult,
  exceptions: ControlException[]
): ControlTest {
  return {
    ...test,
    result,
    exceptionsFound: exceptions.length,
    exceptionsDetails: exceptions,
    samplesTested: test.samplesSelected.length,
    completedAt: new Date(),
    updatedAt: new Date(),
  };
}

export function addTestEvidence(test: ControlTest, evidence: Omit<TestEvidence, 'id'>): ControlTest {
  return {
    ...test,
    evidenceCollected: [
      ...test.evidenceCollected,
      {
        ...evidence,
        id: randomUUID(),
      },
    ],
    updatedAt: new Date(),
  };
}

export function reviewTest(
  test: ControlTest,
  reviewerId: string,
  reviewerName: string,
  notes?: string
): ControlTest {
  return {
    ...test,
    reviewedBy: reviewerId,
    reviewedByName: reviewerName,
    reviewedAt: new Date(),
    reviewNotes: notes,
    updatedAt: new Date(),
  };
}

// ==========================================================================
// CONTROL SUMMARY
// ==========================================================================

export interface ControlSummary {
  total: number;
  byStatus: Record<ControlStatus, number>;
  byType: Record<ControlType, number>;
  byNature: Record<ControlNature, number>;
  byEffectiveness: Record<ControlEffectiveness, number>;
  soxRelevant: number;
  testingDue: number;
  overdueTesting: number;
}

export function calculateControlSummary(controls: Control[]): ControlSummary {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const summary: ControlSummary = {
    total: controls.length,
    byStatus: { draft: 0, active: 0, inactive: 0, deprecated: 0 },
    byType: { preventive: 0, detective: 0, corrective: 0, directive: 0 },
    byNature: { manual: 0, automated: 0, hybrid: 0 },
    byEffectiveness: { effective: 0, partially_effective: 0, ineffective: 0, not_tested: 0 },
    soxRelevant: 0,
    testingDue: 0,
    overdueTesting: 0,
  };

  for (const control of controls) {
    summary.byStatus[control.status]++;
    summary.byType[control.type]++;
    summary.byNature[control.nature]++;
    summary.byEffectiveness[control.currentEffectiveness]++;

    if (control.isSoxRelevant) {
      summary.soxRelevant++;
    }

    if (control.nextTestDate) {
      if (control.nextTestDate <= now) {
        summary.overdueTesting++;
      } else if (control.nextTestDate <= thirtyDaysFromNow) {
        summary.testingDue++;
      }
    }
  }

  return summary;
}

// Calculate recommended sample size based on frequency
export function getRecommendedSampleSize(
  frequency: ControlFrequency,
  populationSize: number
): number {
  const sampleRates: Record<ControlFrequency, number> = {
    continuous: 25, // Test 25 samples
    daily: 25,
    weekly: 10,
    monthly: 3,
    quarterly: 2,
    annually: 1,
    ad_hoc: 1,
  };

  const recommended = sampleRates[frequency];
  return Math.min(recommended, populationSize);
}
