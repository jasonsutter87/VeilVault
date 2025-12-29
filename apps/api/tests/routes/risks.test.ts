import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Risks API Endpoint Tests
 *
 * Comprehensive tests for the risks API endpoints
 * including CRUD operations, scoring, and heat map generation.
 */

interface Risk {
  id: string;
  title: string;
  description: string;
  category: 'operational' | 'financial' | 'compliance' | 'strategic' | 'reputational' | 'technology' | 'legal';
  inherentLikelihood: number; // 1-5
  inherentImpact: number; // 1-5
  residualLikelihood: number; // 1-5
  residualImpact: number; // 1-5
  status: 'identified' | 'assessed' | 'mitigated' | 'accepted' | 'closed';
  ownerId: string;
  mitigatingControls: string[];
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class RisksApiHandler {
  private risks: Map<string, Risk> = new Map();
  private idCounter = 1;

  // GET /api/risks
  listRisks(params: {
    organizationId: string;
    page?: number;
    limit?: number;
    category?: string;
    status?: string;
    minScore?: number;
    maxScore?: number;
  }): ApiResponse<{ risks: Risk[]; total: number }> {
    let risks = [...this.risks.values()].filter(r => r.organizationId === params.organizationId);

    if (params.category) {
      risks = risks.filter(r => r.category === params.category);
    }

    if (params.status) {
      risks = risks.filter(r => r.status === params.status);
    }

    if (params.minScore !== undefined) {
      risks = risks.filter(r => this.calculateRiskScore(r) >= (params.minScore || 0));
    }

    if (params.maxScore !== undefined) {
      risks = risks.filter(r => this.calculateRiskScore(r) <= (params.maxScore || 25));
    }

    const page = params.page || 1;
    const limit = params.limit || 20;
    const start = (page - 1) * limit;
    const paged = risks.slice(start, start + limit);

    return { success: true, data: { risks: paged, total: risks.length } };
  }

  // GET /api/risks/:id
  getRisk(id: string, organizationId: string): ApiResponse<Risk> {
    const risk = this.risks.get(id);
    if (!risk) return { success: false, error: 'Risk not found' };
    if (risk.organizationId !== organizationId) return { success: false, error: 'Access denied' };
    return { success: true, data: risk };
  }

  // POST /api/risks
  createRisk(data: Omit<Risk, 'id' | 'createdAt' | 'updatedAt'>): ApiResponse<Risk> {
    if (!data.title) return { success: false, error: 'Title is required' };
    if (!data.category) return { success: false, error: 'Category is required' };
    if (!this.isValidScore(data.inherentLikelihood)) return { success: false, error: 'Invalid inherent likelihood' };
    if (!this.isValidScore(data.inherentImpact)) return { success: false, error: 'Invalid inherent impact' };

    const risk: Risk = {
      ...data,
      id: `risk-${this.idCounter++}`,
      residualLikelihood: data.residualLikelihood || data.inherentLikelihood,
      residualImpact: data.residualImpact || data.inherentImpact,
      status: data.status || 'identified',
      mitigatingControls: data.mitigatingControls || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.risks.set(risk.id, risk);
    return { success: true, data: risk };
  }

  // PUT /api/risks/:id
  updateRisk(id: string, data: Partial<Risk>, organizationId: string): ApiResponse<Risk> {
    const risk = this.risks.get(id);
    if (!risk) return { success: false, error: 'Risk not found' };
    if (risk.organizationId !== organizationId) return { success: false, error: 'Access denied' };

    if (data.inherentLikelihood !== undefined && !this.isValidScore(data.inherentLikelihood)) {
      return { success: false, error: 'Invalid inherent likelihood' };
    }
    if (data.inherentImpact !== undefined && !this.isValidScore(data.inherentImpact)) {
      return { success: false, error: 'Invalid inherent impact' };
    }
    if (data.residualLikelihood !== undefined && !this.isValidScore(data.residualLikelihood)) {
      return { success: false, error: 'Invalid residual likelihood' };
    }
    if (data.residualImpact !== undefined && !this.isValidScore(data.residualImpact)) {
      return { success: false, error: 'Invalid residual impact' };
    }

    const updated = { ...risk, ...data, id: risk.id, organizationId: risk.organizationId, updatedAt: new Date() };
    this.risks.set(id, updated);
    return { success: true, data: updated };
  }

  // DELETE /api/risks/:id
  deleteRisk(id: string, organizationId: string): ApiResponse<null> {
    const risk = this.risks.get(id);
    if (!risk) return { success: false, error: 'Risk not found' };
    if (risk.organizationId !== organizationId) return { success: false, error: 'Access denied' };
    this.risks.delete(id);
    return { success: true };
  }

  // GET /api/risks/heat-map
  getHeatMap(organizationId: string): ApiResponse<{
    matrix: number[][];
    risks: Array<{ id: string; title: string; likelihood: number; impact: number }>;
  }> {
    const risks = [...this.risks.values()].filter(r => r.organizationId === organizationId);

    // 5x5 matrix
    const matrix = Array(5).fill(null).map(() => Array(5).fill(0));

    const mappedRisks: Array<{ id: string; title: string; likelihood: number; impact: number }> = [];

    risks.forEach(r => {
      const likelihood = r.residualLikelihood - 1; // 0-indexed
      const impact = r.residualImpact - 1;
      matrix[likelihood][impact]++;
      mappedRisks.push({
        id: r.id,
        title: r.title,
        likelihood: r.residualLikelihood,
        impact: r.residualImpact,
      });
    });

    return { success: true, data: { matrix, risks: mappedRisks } };
  }

  // GET /api/risks/summary
  getSummary(organizationId: string): ApiResponse<{
    total: number;
    byCategory: Record<string, number>;
    byStatus: Record<string, number>;
    highRisks: number;
    averageScore: number;
  }> {
    const risks = [...this.risks.values()].filter(r => r.organizationId === organizationId);

    const byCategory: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let totalScore = 0;
    let highRisks = 0;

    risks.forEach(r => {
      byCategory[r.category] = (byCategory[r.category] || 0) + 1;
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      const score = this.calculateRiskScore(r);
      totalScore += score;
      if (score >= 15) highRisks++;
    });

    return {
      success: true,
      data: {
        total: risks.length,
        byCategory,
        byStatus,
        highRisks,
        averageScore: risks.length > 0 ? totalScore / risks.length : 0,
      },
    };
  }

  // POST /api/risks/:id/controls
  linkControl(riskId: string, controlId: string, organizationId: string): ApiResponse<Risk> {
    const risk = this.risks.get(riskId);
    if (!risk) return { success: false, error: 'Risk not found' };
    if (risk.organizationId !== organizationId) return { success: false, error: 'Access denied' };

    if (!risk.mitigatingControls.includes(controlId)) {
      risk.mitigatingControls.push(controlId);
      risk.updatedAt = new Date();
    }

    return { success: true, data: risk };
  }

  // DELETE /api/risks/:id/controls/:controlId
  unlinkControl(riskId: string, controlId: string, organizationId: string): ApiResponse<Risk> {
    const risk = this.risks.get(riskId);
    if (!risk) return { success: false, error: 'Risk not found' };
    if (risk.organizationId !== organizationId) return { success: false, error: 'Access denied' };

    risk.mitigatingControls = risk.mitigatingControls.filter(c => c !== controlId);
    risk.updatedAt = new Date();

    return { success: true, data: risk };
  }

  private isValidScore(score: number): boolean {
    return Number.isInteger(score) && score >= 1 && score <= 5;
  }

  private calculateRiskScore(risk: Risk): number {
    return risk.residualLikelihood * risk.residualImpact;
  }

  seedRisk(risk: Risk): void {
    this.risks.set(risk.id, risk);
  }
}

describe('Risks API', () => {
  let handler: RisksApiHandler;
  const orgId = 'org-123';

  beforeEach(() => {
    handler = new RisksApiHandler();
  });

  describe('GET /api/risks', () => {
    beforeEach(() => {
      for (let i = 1; i <= 20; i++) {
        handler.seedRisk({
          id: `risk-${i}`,
          title: `Risk ${i}`,
          description: `Description for risk ${i}`,
          category: ['operational', 'financial', 'compliance', 'technology'][i % 4] as Risk['category'],
          inherentLikelihood: ((i % 5) || 5) as 1 | 2 | 3 | 4 | 5,
          inherentImpact: (((i + 1) % 5) || 5) as 1 | 2 | 3 | 4 | 5,
          residualLikelihood: Math.max(1, ((i % 5) || 5) - 1) as 1 | 2 | 3 | 4 | 5,
          residualImpact: Math.max(1, (((i + 1) % 5) || 5) - 1) as 1 | 2 | 3 | 4 | 5,
          status: ['identified', 'assessed', 'mitigated'][i % 3] as Risk['status'],
          ownerId: `user-${(i % 3) + 1}`,
          mitigatingControls: [],
          organizationId: orgId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    });

    it('should list all risks', () => {
      const result = handler.listRisks({ organizationId: orgId });
      expect(result.success).toBe(true);
      expect(result.data?.total).toBe(20);
    });

    it('should paginate results', () => {
      const result = handler.listRisks({ organizationId: orgId, page: 1, limit: 5 });
      expect(result.data?.risks.length).toBe(5);
    });

    it('should filter by category', () => {
      const result = handler.listRisks({ organizationId: orgId, category: 'financial' });
      expect(result.data?.risks.every(r => r.category === 'financial')).toBe(true);
    });

    it('should filter by status', () => {
      const result = handler.listRisks({ organizationId: orgId, status: 'assessed' });
      expect(result.data?.risks.every(r => r.status === 'assessed')).toBe(true);
    });

    it('should filter by minimum risk score', () => {
      const result = handler.listRisks({ organizationId: orgId, minScore: 10 });
      result.data?.risks.forEach(r => {
        expect(r.residualLikelihood * r.residualImpact).toBeGreaterThanOrEqual(10);
      });
    });

    it('should filter by maximum risk score', () => {
      const result = handler.listRisks({ organizationId: orgId, maxScore: 10 });
      result.data?.risks.forEach(r => {
        expect(r.residualLikelihood * r.residualImpact).toBeLessThanOrEqual(10);
      });
    });
  });

  describe('GET /api/risks/:id', () => {
    beforeEach(() => {
      handler.seedRisk({
        id: 'risk-1',
        title: 'Test Risk',
        description: 'Test description',
        category: 'operational',
        inherentLikelihood: 4,
        inherentImpact: 5,
        residualLikelihood: 3,
        residualImpact: 4,
        status: 'assessed',
        ownerId: 'user-1',
        mitigatingControls: ['ctrl-1'],
        organizationId: orgId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it('should get risk by ID', () => {
      const result = handler.getRisk('risk-1', orgId);
      expect(result.success).toBe(true);
      expect(result.data?.title).toBe('Test Risk');
    });

    it('should return error for non-existent risk', () => {
      const result = handler.getRisk('non-existent', orgId);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Risk not found');
    });

    it('should deny access to risk from different organization', () => {
      const result = handler.getRisk('risk-1', 'other-org');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Access denied');
    });
  });

  describe('POST /api/risks', () => {
    it('should create a new risk', () => {
      const result = handler.createRisk({
        title: 'New Risk',
        description: 'Description',
        category: 'financial',
        inherentLikelihood: 3,
        inherentImpact: 4,
        residualLikelihood: 2,
        residualImpact: 3,
        status: 'identified',
        ownerId: 'user-1',
        mitigatingControls: [],
        organizationId: orgId,
      });

      expect(result.success).toBe(true);
      expect(result.data?.id).toBeDefined();
      expect(result.data?.title).toBe('New Risk');
    });

    it('should require title', () => {
      const result = handler.createRisk({
        title: '',
        description: 'Description',
        category: 'financial',
        inherentLikelihood: 3,
        inherentImpact: 4,
        residualLikelihood: 2,
        residualImpact: 3,
        status: 'identified',
        ownerId: 'user-1',
        mitigatingControls: [],
        organizationId: orgId,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Title is required');
    });

    it('should validate likelihood score (1-5)', () => {
      const invalidScores = [0, 6, -1, 10, 1.5];
      invalidScores.forEach(score => {
        const result = handler.createRisk({
          title: 'Test',
          description: 'Description',
          category: 'financial',
          inherentLikelihood: score as 1 | 2 | 3 | 4 | 5,
          inherentImpact: 3,
          residualLikelihood: 2,
          residualImpact: 3,
          status: 'identified',
          ownerId: 'user-1',
          mitigatingControls: [],
          organizationId: orgId,
        });
        expect(result.success).toBe(false);
      });
    });

    it('should validate impact score (1-5)', () => {
      const result = handler.createRisk({
        title: 'Test',
        description: 'Description',
        category: 'financial',
        inherentLikelihood: 3,
        inherentImpact: 10 as 1 | 2 | 3 | 4 | 5,
        residualLikelihood: 2,
        residualImpact: 3,
        status: 'identified',
        ownerId: 'user-1',
        mitigatingControls: [],
        organizationId: orgId,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid inherent impact');
    });

    it('should default residual scores to inherent scores', () => {
      const result = handler.createRisk({
        title: 'Test',
        description: 'Description',
        category: 'financial',
        inherentLikelihood: 4,
        inherentImpact: 5,
        residualLikelihood: 0 as unknown as 1 | 2 | 3 | 4 | 5,
        residualImpact: 0 as unknown as 1 | 2 | 3 | 4 | 5,
        status: 'identified',
        ownerId: 'user-1',
        mitigatingControls: [],
        organizationId: orgId,
      });

      expect(result.success).toBe(true);
      expect(result.data?.residualLikelihood).toBe(4);
      expect(result.data?.residualImpact).toBe(5);
    });
  });

  describe('PUT /api/risks/:id', () => {
    beforeEach(() => {
      handler.seedRisk({
        id: 'risk-1',
        title: 'Original Title',
        description: 'Original description',
        category: 'operational',
        inherentLikelihood: 3,
        inherentImpact: 3,
        residualLikelihood: 2,
        residualImpact: 2,
        status: 'identified',
        ownerId: 'user-1',
        mitigatingControls: [],
        organizationId: orgId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it('should update risk', () => {
      const result = handler.updateRisk('risk-1', { title: 'Updated Title' }, orgId);
      expect(result.success).toBe(true);
      expect(result.data?.title).toBe('Updated Title');
    });

    it('should update residual scores', () => {
      const result = handler.updateRisk('risk-1', {
        residualLikelihood: 1,
        residualImpact: 1,
      }, orgId);

      expect(result.success).toBe(true);
      expect(result.data?.residualLikelihood).toBe(1);
      expect(result.data?.residualImpact).toBe(1);
    });

    it('should validate updated scores', () => {
      const result = handler.updateRisk('risk-1', {
        residualLikelihood: 10 as 1 | 2 | 3 | 4 | 5,
      }, orgId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid residual likelihood');
    });

    it('should return error for non-existent risk', () => {
      const result = handler.updateRisk('non-existent', { title: 'Updated' }, orgId);
      expect(result.success).toBe(false);
    });

    it('should deny update from different organization', () => {
      const result = handler.updateRisk('risk-1', { title: 'Hacked' }, 'other-org');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Access denied');
    });
  });

  describe('DELETE /api/risks/:id', () => {
    beforeEach(() => {
      handler.seedRisk({
        id: 'risk-1',
        title: 'Test Risk',
        description: 'Description',
        category: 'operational',
        inherentLikelihood: 3,
        inherentImpact: 3,
        residualLikelihood: 2,
        residualImpact: 2,
        status: 'identified',
        ownerId: 'user-1',
        mitigatingControls: [],
        organizationId: orgId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it('should delete risk', () => {
      const result = handler.deleteRisk('risk-1', orgId);
      expect(result.success).toBe(true);

      const getResult = handler.getRisk('risk-1', orgId);
      expect(getResult.success).toBe(false);
    });

    it('should return error for non-existent risk', () => {
      const result = handler.deleteRisk('non-existent', orgId);
      expect(result.success).toBe(false);
    });

    it('should deny deletion from different organization', () => {
      const result = handler.deleteRisk('risk-1', 'other-org');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Access denied');
    });
  });

  describe('GET /api/risks/heat-map', () => {
    beforeEach(() => {
      // Create risks at various positions on the heat map
      const positions = [
        { likelihood: 1, impact: 1 },
        { likelihood: 1, impact: 5 },
        { likelihood: 5, impact: 1 },
        { likelihood: 5, impact: 5 },
        { likelihood: 3, impact: 3 },
        { likelihood: 3, impact: 3 }, // Same position, should stack
      ];

      positions.forEach((pos, i) => {
        handler.seedRisk({
          id: `risk-${i}`,
          title: `Risk ${i}`,
          description: 'Description',
          category: 'operational',
          inherentLikelihood: pos.likelihood as 1 | 2 | 3 | 4 | 5,
          inherentImpact: pos.impact as 1 | 2 | 3 | 4 | 5,
          residualLikelihood: pos.likelihood as 1 | 2 | 3 | 4 | 5,
          residualImpact: pos.impact as 1 | 2 | 3 | 4 | 5,
          status: 'assessed',
          ownerId: 'user-1',
          mitigatingControls: [],
          organizationId: orgId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });
    });

    it('should return 5x5 matrix', () => {
      const result = handler.getHeatMap(orgId);
      expect(result.success).toBe(true);
      expect(result.data?.matrix.length).toBe(5);
      expect(result.data?.matrix[0].length).toBe(5);
    });

    it('should count risks in each cell', () => {
      const result = handler.getHeatMap(orgId);
      const matrix = result.data?.matrix;

      // Position (3,3) should have 2 risks (0-indexed: [2][2])
      expect(matrix?.[2][2]).toBe(2);

      // Corner positions should have 1 each
      expect(matrix?.[0][0]).toBe(1); // (1,1)
      expect(matrix?.[0][4]).toBe(1); // (1,5)
      expect(matrix?.[4][0]).toBe(1); // (5,1)
      expect(matrix?.[4][4]).toBe(1); // (5,5)
    });

    it('should include risk details', () => {
      const result = handler.getHeatMap(orgId);
      expect(result.data?.risks.length).toBe(6);
      expect(result.data?.risks[0]).toHaveProperty('id');
      expect(result.data?.risks[0]).toHaveProperty('title');
      expect(result.data?.risks[0]).toHaveProperty('likelihood');
      expect(result.data?.risks[0]).toHaveProperty('impact');
    });
  });

  describe('GET /api/risks/summary', () => {
    beforeEach(() => {
      handler.seedRisk({
        id: 'risk-1',
        title: 'High Risk',
        description: 'Description',
        category: 'financial',
        inherentLikelihood: 5,
        inherentImpact: 5,
        residualLikelihood: 4,
        residualImpact: 4, // Score: 16 (high)
        status: 'identified',
        ownerId: 'user-1',
        mitigatingControls: [],
        organizationId: orgId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      handler.seedRisk({
        id: 'risk-2',
        title: 'Low Risk',
        description: 'Description',
        category: 'operational',
        inherentLikelihood: 2,
        inherentImpact: 2,
        residualLikelihood: 1,
        residualImpact: 1, // Score: 1 (low)
        status: 'mitigated',
        ownerId: 'user-1',
        mitigatingControls: ['ctrl-1'],
        organizationId: orgId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it('should return risk summary', () => {
      const result = handler.getSummary(orgId);

      expect(result.success).toBe(true);
      expect(result.data?.total).toBe(2);
    });

    it('should count by category', () => {
      const result = handler.getSummary(orgId);

      expect(result.data?.byCategory.financial).toBe(1);
      expect(result.data?.byCategory.operational).toBe(1);
    });

    it('should count by status', () => {
      const result = handler.getSummary(orgId);

      expect(result.data?.byStatus.identified).toBe(1);
      expect(result.data?.byStatus.mitigated).toBe(1);
    });

    it('should count high risks (score >= 15)', () => {
      const result = handler.getSummary(orgId);
      expect(result.data?.highRisks).toBe(1);
    });

    it('should calculate average score', () => {
      const result = handler.getSummary(orgId);
      // (16 + 1) / 2 = 8.5
      expect(result.data?.averageScore).toBe(8.5);
    });
  });

  describe('POST /api/risks/:id/controls', () => {
    beforeEach(() => {
      handler.seedRisk({
        id: 'risk-1',
        title: 'Test Risk',
        description: 'Description',
        category: 'operational',
        inherentLikelihood: 3,
        inherentImpact: 3,
        residualLikelihood: 3,
        residualImpact: 3,
        status: 'identified',
        ownerId: 'user-1',
        mitigatingControls: [],
        organizationId: orgId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it('should link control to risk', () => {
      const result = handler.linkControl('risk-1', 'ctrl-1', orgId);

      expect(result.success).toBe(true);
      expect(result.data?.mitigatingControls).toContain('ctrl-1');
    });

    it('should not duplicate control links', () => {
      handler.linkControl('risk-1', 'ctrl-1', orgId);
      handler.linkControl('risk-1', 'ctrl-1', orgId);

      const result = handler.getRisk('risk-1', orgId);
      expect(result.data?.mitigatingControls.filter(c => c === 'ctrl-1').length).toBe(1);
    });

    it('should link multiple controls', () => {
      handler.linkControl('risk-1', 'ctrl-1', orgId);
      handler.linkControl('risk-1', 'ctrl-2', orgId);
      handler.linkControl('risk-1', 'ctrl-3', orgId);

      const result = handler.getRisk('risk-1', orgId);
      expect(result.data?.mitigatingControls.length).toBe(3);
    });
  });

  describe('DELETE /api/risks/:id/controls/:controlId', () => {
    beforeEach(() => {
      handler.seedRisk({
        id: 'risk-1',
        title: 'Test Risk',
        description: 'Description',
        category: 'operational',
        inherentLikelihood: 3,
        inherentImpact: 3,
        residualLikelihood: 3,
        residualImpact: 3,
        status: 'identified',
        ownerId: 'user-1',
        mitigatingControls: ['ctrl-1', 'ctrl-2'],
        organizationId: orgId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it('should unlink control from risk', () => {
      const result = handler.unlinkControl('risk-1', 'ctrl-1', orgId);

      expect(result.success).toBe(true);
      expect(result.data?.mitigatingControls).not.toContain('ctrl-1');
      expect(result.data?.mitigatingControls).toContain('ctrl-2');
    });

    it('should handle unlinking non-existent control', () => {
      const result = handler.unlinkControl('risk-1', 'ctrl-999', orgId);
      expect(result.success).toBe(true);
    });
  });
});
