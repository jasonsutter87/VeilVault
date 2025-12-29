// ==========================================================================
// RISK ENTITY
// Risk assessment and scoring for GRC framework
// ==========================================================================

import { randomUUID } from '../utils/crypto.js';

export type RiskCategory =
  | 'strategic'
  | 'operational'
  | 'financial'
  | 'compliance'
  | 'technology'
  | 'reputational'
  | 'third_party'
  | 'fraud'
  | 'cyber';

export type RiskStatus = 'identified' | 'assessed' | 'mitigating' | 'accepted' | 'closed';
export type RiskTrend = 'increasing' | 'stable' | 'decreasing';

export type LikelihoodLevel = 1 | 2 | 3 | 4 | 5;
export type ImpactLevel = 1 | 2 | 3 | 4 | 5;

export interface Risk {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  category: RiskCategory;
  status: RiskStatus;

  // Risk Scoring
  inherentLikelihood: LikelihoodLevel;
  inherentImpact: ImpactLevel;
  inherentScore: number; // likelihood * impact

  residualLikelihood: LikelihoodLevel;
  residualImpact: ImpactLevel;
  residualScore: number;

  // Risk Appetite
  targetScore: number;
  riskAppetite: 'low' | 'medium' | 'high';
  withinAppetite: boolean;

  // Trend & KRIs
  trend: RiskTrend;
  keyRiskIndicators: KeyRiskIndicator[];

  // Ownership
  ownerId: string;
  ownerName: string;
  reviewerId?: string;
  reviewerName?: string;

  // Linked entities
  controlIds: string[]; // Linked controls that mitigate this risk
  issueIds: string[]; // Related issues

  // Metadata
  tags: string[];
  attachments: RiskAttachment[];
  lastAssessedAt?: Date;
  nextReviewDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface KeyRiskIndicator {
  id: string;
  name: string;
  description?: string;
  metric: string;
  currentValue: number;
  threshold: number;
  thresholdType: 'above' | 'below' | 'range';
  rangeMin?: number;
  rangeMax?: number;
  status: 'green' | 'yellow' | 'red';
  lastUpdatedAt: Date;
}

export interface RiskAttachment {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadedAt: Date;
  uploadedBy: string;
}

export interface CreateRiskInput {
  organizationId: string;
  name: string;
  description: string;
  category: RiskCategory;
  inherentLikelihood: LikelihoodLevel;
  inherentImpact: ImpactLevel;
  ownerId: string;
  ownerName: string;
  targetScore?: number;
  riskAppetite?: 'low' | 'medium' | 'high';
  tags?: string[];
}

export interface RiskAssessmentInput {
  residualLikelihood: LikelihoodLevel;
  residualImpact: ImpactLevel;
  reviewerId: string;
  reviewerName: string;
}

// Risk scoring constants
export const LIKELIHOOD_LABELS: Record<LikelihoodLevel, string> = {
  1: 'Rare',
  2: 'Unlikely',
  3: 'Possible',
  4: 'Likely',
  5: 'Almost Certain',
};

export const IMPACT_LABELS: Record<ImpactLevel, string> = {
  1: 'Insignificant',
  2: 'Minor',
  3: 'Moderate',
  4: 'Major',
  5: 'Catastrophic',
};

export const RISK_APPETITE_THRESHOLDS = {
  low: 6, // Score <= 6 is within appetite
  medium: 12, // Score <= 12 is within appetite
  high: 20, // Score <= 20 is within appetite
};

export function createRisk(input: CreateRiskInput): Risk {
  const now = new Date();
  const inherentScore = input.inherentLikelihood * input.inherentImpact;
  const riskAppetite = input.riskAppetite ?? 'medium';
  const targetScore = input.targetScore ?? RISK_APPETITE_THRESHOLDS[riskAppetite];

  return {
    id: randomUUID(),
    organizationId: input.organizationId,
    name: input.name,
    description: input.description,
    category: input.category,
    status: 'identified',

    inherentLikelihood: input.inherentLikelihood,
    inherentImpact: input.inherentImpact,
    inherentScore,

    // Initially residual = inherent (no controls yet)
    residualLikelihood: input.inherentLikelihood,
    residualImpact: input.inherentImpact,
    residualScore: inherentScore,

    targetScore,
    riskAppetite,
    withinAppetite: inherentScore <= targetScore,

    trend: 'stable',
    keyRiskIndicators: [],

    ownerId: input.ownerId,
    ownerName: input.ownerName,

    controlIds: [],
    issueIds: [],

    tags: input.tags ?? [],
    attachments: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function assessRisk(risk: Risk, input: RiskAssessmentInput): Risk {
  const now = new Date();
  const residualScore = input.residualLikelihood * input.residualImpact;

  // Determine trend based on score change
  let trend: RiskTrend = 'stable';
  if (residualScore > risk.residualScore) {
    trend = 'increasing';
  } else if (residualScore < risk.residualScore) {
    trend = 'decreasing';
  }

  return {
    ...risk,
    residualLikelihood: input.residualLikelihood,
    residualImpact: input.residualImpact,
    residualScore,
    withinAppetite: residualScore <= risk.targetScore,
    trend,
    status: 'assessed',
    reviewerId: input.reviewerId,
    reviewerName: input.reviewerName,
    lastAssessedAt: now,
    updatedAt: now,
  };
}

export function linkControlToRisk(risk: Risk, controlId: string): Risk {
  if (risk.controlIds.includes(controlId)) return risk;

  return {
    ...risk,
    controlIds: [...risk.controlIds, controlId],
    status: risk.status === 'assessed' ? 'mitigating' : risk.status,
    updatedAt: new Date(),
  };
}

export function unlinkControlFromRisk(risk: Risk, controlId: string): Risk {
  return {
    ...risk,
    controlIds: risk.controlIds.filter((id) => id !== controlId),
    updatedAt: new Date(),
  };
}

export function addKeyRiskIndicator(
  risk: Risk,
  kri: Omit<KeyRiskIndicator, 'id' | 'status' | 'lastUpdatedAt'>
): Risk {
  const now = new Date();
  const status = evaluateKRIStatus(kri);

  return {
    ...risk,
    keyRiskIndicators: [
      ...risk.keyRiskIndicators,
      {
        ...kri,
        id: randomUUID(),
        status,
        lastUpdatedAt: now,
      },
    ],
    updatedAt: now,
  };
}

export function updateKRIValue(risk: Risk, kriId: string, newValue: number): Risk {
  const now = new Date();

  return {
    ...risk,
    keyRiskIndicators: risk.keyRiskIndicators.map((kri) => {
      if (kri.id !== kriId) return kri;

      const status = evaluateKRIStatus({ ...kri, currentValue: newValue });
      return {
        ...kri,
        currentValue: newValue,
        status,
        lastUpdatedAt: now,
      };
    }),
    updatedAt: now,
  };
}

function evaluateKRIStatus(
  kri: Omit<KeyRiskIndicator, 'id' | 'status' | 'lastUpdatedAt'>
): 'green' | 'yellow' | 'red' {
  const { currentValue, threshold, thresholdType, rangeMin, rangeMax } = kri;

  if (thresholdType === 'above') {
    if (currentValue > threshold * 1.2) return 'red';
    if (currentValue > threshold) return 'yellow';
    return 'green';
  }

  if (thresholdType === 'below') {
    if (currentValue < threshold * 0.8) return 'red';
    if (currentValue < threshold) return 'yellow';
    return 'green';
  }

  // Range type
  if (rangeMin !== undefined && rangeMax !== undefined) {
    if (currentValue < rangeMin || currentValue > rangeMax) return 'red';
    const mid = (rangeMin + rangeMax) / 2;
    const tolerance = (rangeMax - rangeMin) * 0.2;
    if (currentValue < mid - tolerance || currentValue > mid + tolerance) return 'yellow';
    return 'green';
  }

  return 'green';
}

export function acceptRisk(risk: Risk, userId: string, userName: string): Risk {
  return {
    ...risk,
    status: 'accepted',
    reviewerId: userId,
    reviewerName: userName,
    updatedAt: new Date(),
  };
}

export function closeRisk(risk: Risk): Risk {
  return {
    ...risk,
    status: 'closed',
    updatedAt: new Date(),
  };
}

export function calculateRiskScore(likelihood: LikelihoodLevel, impact: ImpactLevel): number {
  return likelihood * impact;
}

export function getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score <= 4) return 'low';
  if (score <= 9) return 'medium';
  if (score <= 16) return 'high';
  return 'critical';
}

export function getRiskColor(score: number): 'green' | 'yellow' | 'orange' | 'red' {
  if (score <= 4) return 'green';
  if (score <= 9) return 'yellow';
  if (score <= 16) return 'orange';
  return 'red';
}

// Risk Heat Map generation
export interface RiskHeatMapCell {
  likelihood: LikelihoodLevel;
  impact: ImpactLevel;
  score: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  color: 'green' | 'yellow' | 'orange' | 'red';
  risks: Risk[];
}

export function generateRiskHeatMap(risks: Risk[]): RiskHeatMapCell[][] {
  const heatMap: RiskHeatMapCell[][] = [];

  for (let likelihood = 5; likelihood >= 1; likelihood--) {
    const row: RiskHeatMapCell[] = [];
    for (let impact = 1; impact <= 5; impact++) {
      const score = likelihood * impact;
      const cellRisks = risks.filter(
        (r) => r.residualLikelihood === likelihood && r.residualImpact === impact
      );

      row.push({
        likelihood: likelihood as LikelihoodLevel,
        impact: impact as ImpactLevel,
        score,
        level: getRiskLevel(score),
        color: getRiskColor(score),
        risks: cellRisks,
      });
    }
    heatMap.push(row);
  }

  return heatMap;
}

// Risk Summary
export interface RiskSummary {
  total: number;
  byStatus: Record<RiskStatus, number>;
  byCategory: Record<RiskCategory, number>;
  byLevel: Record<'low' | 'medium' | 'high' | 'critical', number>;
  withinAppetite: number;
  outsideAppetite: number;
  averageResidualScore: number;
  trendsIncreasing: number;
  kriAlerts: number;
}

export function calculateRiskSummary(risks: Risk[]): RiskSummary {
  const summary: RiskSummary = {
    total: risks.length,
    byStatus: { identified: 0, assessed: 0, mitigating: 0, accepted: 0, closed: 0 },
    byCategory: {
      strategic: 0,
      operational: 0,
      financial: 0,
      compliance: 0,
      technology: 0,
      reputational: 0,
      third_party: 0,
      fraud: 0,
      cyber: 0,
    },
    byLevel: { low: 0, medium: 0, high: 0, critical: 0 },
    withinAppetite: 0,
    outsideAppetite: 0,
    averageResidualScore: 0,
    trendsIncreasing: 0,
    kriAlerts: 0,
  };

  let totalResidualScore = 0;

  for (const risk of risks) {
    summary.byStatus[risk.status]++;
    summary.byCategory[risk.category]++;
    summary.byLevel[getRiskLevel(risk.residualScore)]++;

    if (risk.withinAppetite) {
      summary.withinAppetite++;
    } else {
      summary.outsideAppetite++;
    }

    totalResidualScore += risk.residualScore;

    if (risk.trend === 'increasing') {
      summary.trendsIncreasing++;
    }

    summary.kriAlerts += risk.keyRiskIndicators.filter((k) => k.status === 'red').length;
  }

  summary.averageResidualScore = risks.length > 0 ? totalResidualScore / risks.length : 0;

  return summary;
}
