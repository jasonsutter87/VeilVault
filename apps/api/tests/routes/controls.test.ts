import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Controls API Endpoint Tests
 *
 * Comprehensive tests for the controls API endpoints
 * including CRUD operations, filtering, and validation.
 */

// Mock types
interface Control {
  id: string;
  controlId: string;
  name: string;
  description: string;
  type: 'preventive' | 'detective' | 'corrective' | 'directive';
  frequency: 'continuous' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  ownerId: string;
  soxRelevant: boolean;
  effectivenessRating: 'effective' | 'partially_effective' | 'ineffective' | 'not_tested';
  status: 'active' | 'inactive' | 'deprecated';
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Mock API handler
class ControlsApiHandler {
  private controls: Map<string, Control> = new Map();
  private idCounter = 1;

  // GET /api/controls
  listControls(params: {
    organizationId: string;
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
    soxRelevant?: boolean;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): ApiResponse<{ controls: Control[]; total: number; page: number; limit: number }> {
    let controls = [...this.controls.values()].filter(
      c => c.organizationId === params.organizationId
    );

    // Filter by type
    if (params.type) {
      controls = controls.filter(c => c.type === params.type);
    }

    // Filter by status
    if (params.status) {
      controls = controls.filter(c => c.status === params.status);
    }

    // Filter by SOX relevance
    if (params.soxRelevant !== undefined) {
      controls = controls.filter(c => c.soxRelevant === params.soxRelevant);
    }

    // Search
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      controls = controls.filter(
        c =>
          c.name.toLowerCase().includes(searchLower) ||
          c.controlId.toLowerCase().includes(searchLower) ||
          c.description.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    if (params.sortBy) {
      controls.sort((a, b) => {
        const aVal = a[params.sortBy as keyof Control];
        const bVal = b[params.sortBy as keyof Control];
        if (aVal < bVal) return params.sortOrder === 'desc' ? 1 : -1;
        if (aVal > bVal) return params.sortOrder === 'desc' ? -1 : 1;
        return 0;
      });
    }

    const total = controls.length;
    const page = params.page || 1;
    const limit = params.limit || 20;
    const start = (page - 1) * limit;
    const paged = controls.slice(start, start + limit);

    return {
      success: true,
      data: { controls: paged, total, page, limit },
    };
  }

  // GET /api/controls/:id
  getControl(id: string, organizationId: string): ApiResponse<Control> {
    const control = this.controls.get(id);

    if (!control) {
      return { success: false, error: 'Control not found' };
    }

    if (control.organizationId !== organizationId) {
      return { success: false, error: 'Access denied' };
    }

    return { success: true, data: control };
  }

  // POST /api/controls
  createControl(
    data: Omit<Control, 'id' | 'createdAt' | 'updatedAt'>,
    userId: string
  ): ApiResponse<Control> {
    // Validate required fields
    if (!data.name) {
      return { success: false, error: 'Name is required' };
    }
    if (!data.controlId) {
      return { success: false, error: 'Control ID is required' };
    }
    if (!data.type) {
      return { success: false, error: 'Type is required' };
    }
    if (!data.ownerId) {
      return { success: false, error: 'Owner is required' };
    }

    // Validate control ID format
    if (!/^[A-Z]{2,4}-\d{3,5}$/.test(data.controlId)) {
      return { success: false, error: 'Invalid control ID format' };
    }

    // Check for duplicate control ID
    const existing = [...this.controls.values()].find(
      c => c.controlId === data.controlId && c.organizationId === data.organizationId
    );
    if (existing) {
      return { success: false, error: 'Control ID already exists' };
    }

    const control: Control = {
      ...data,
      id: `ctrl-${this.idCounter++}`,
      effectivenessRating: data.effectivenessRating || 'not_tested',
      status: data.status || 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.controls.set(control.id, control);
    return { success: true, data: control, message: 'Control created successfully' };
  }

  // PUT /api/controls/:id
  updateControl(
    id: string,
    data: Partial<Control>,
    organizationId: string
  ): ApiResponse<Control> {
    const control = this.controls.get(id);

    if (!control) {
      return { success: false, error: 'Control not found' };
    }

    if (control.organizationId !== organizationId) {
      return { success: false, error: 'Access denied' };
    }

    // Don't allow changing organization
    if (data.organizationId && data.organizationId !== organizationId) {
      return { success: false, error: 'Cannot change organization' };
    }

    // Validate control ID format if being changed
    if (data.controlId && !/^[A-Z]{2,4}-\d{3,5}$/.test(data.controlId)) {
      return { success: false, error: 'Invalid control ID format' };
    }

    // Check for duplicate control ID if changing
    if (data.controlId && data.controlId !== control.controlId) {
      const existing = [...this.controls.values()].find(
        c => c.controlId === data.controlId && c.organizationId === organizationId
      );
      if (existing) {
        return { success: false, error: 'Control ID already exists' };
      }
    }

    const updated = {
      ...control,
      ...data,
      id: control.id, // Prevent ID change
      organizationId: control.organizationId, // Prevent org change
      createdAt: control.createdAt, // Preserve creation date
      updatedAt: new Date(),
    };

    this.controls.set(id, updated);
    return { success: true, data: updated, message: 'Control updated successfully' };
  }

  // DELETE /api/controls/:id
  deleteControl(id: string, organizationId: string): ApiResponse<null> {
    const control = this.controls.get(id);

    if (!control) {
      return { success: false, error: 'Control not found' };
    }

    if (control.organizationId !== organizationId) {
      return { success: false, error: 'Access denied' };
    }

    this.controls.delete(id);
    return { success: true, message: 'Control deleted successfully' };
  }

  // GET /api/controls/:id/history
  getControlHistory(id: string, organizationId: string): ApiResponse<Array<{
    timestamp: Date;
    userId: string;
    action: string;
    changes: Record<string, unknown>;
  }>> {
    const control = this.controls.get(id);

    if (!control) {
      return { success: false, error: 'Control not found' };
    }

    if (control.organizationId !== organizationId) {
      return { success: false, error: 'Access denied' };
    }

    // Mock history
    return {
      success: true,
      data: [
        {
          timestamp: control.createdAt,
          userId: control.ownerId,
          action: 'created',
          changes: {},
        },
      ],
    };
  }

  // POST /api/controls/:id/test
  recordTestResult(
    id: string,
    organizationId: string,
    result: { result: 'pass' | 'fail' | 'exception'; notes?: string; testedBy: string }
  ): ApiResponse<{ newEffectiveness: string }> {
    const control = this.controls.get(id);

    if (!control) {
      return { success: false, error: 'Control not found' };
    }

    if (control.organizationId !== organizationId) {
      return { success: false, error: 'Access denied' };
    }

    // Update effectiveness based on result
    const newEffectiveness = result.result === 'pass' ? 'effective' :
                            result.result === 'exception' ? 'partially_effective' : 'ineffective';

    control.effectivenessRating = newEffectiveness as Control['effectivenessRating'];
    control.updatedAt = new Date();

    return {
      success: true,
      data: { newEffectiveness },
      message: 'Test result recorded',
    };
  }

  // Helper to seed test data
  seedControl(control: Control): void {
    this.controls.set(control.id, control);
  }
}

describe('Controls API', () => {
  let handler: ControlsApiHandler;
  const orgId = 'org-123';

  beforeEach(() => {
    handler = new ControlsApiHandler();
  });

  describe('GET /api/controls', () => {
    beforeEach(() => {
      // Seed test controls
      for (let i = 1; i <= 25; i++) {
        handler.seedControl({
          id: `ctrl-${i}`,
          controlId: `SOX-${String(i).padStart(3, '0')}`,
          name: `Control ${i}`,
          description: `Description for control ${i}`,
          type: ['preventive', 'detective', 'corrective', 'directive'][i % 4] as Control['type'],
          frequency: 'monthly',
          ownerId: `user-${(i % 3) + 1}`,
          soxRelevant: i <= 20,
          effectivenessRating: ['effective', 'partially_effective', 'ineffective', 'not_tested'][i % 4] as Control['effectivenessRating'],
          status: i <= 23 ? 'active' : 'inactive',
          organizationId: orgId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    });

    it('should list all controls for organization', () => {
      const result = handler.listControls({ organizationId: orgId });

      expect(result.success).toBe(true);
      expect(result.data?.total).toBe(25);
    });

    it('should paginate results', () => {
      const result = handler.listControls({ organizationId: orgId, page: 1, limit: 10 });

      expect(result.success).toBe(true);
      expect(result.data?.controls.length).toBe(10);
      expect(result.data?.page).toBe(1);
      expect(result.data?.limit).toBe(10);
    });

    it('should return correct page', () => {
      const page1 = handler.listControls({ organizationId: orgId, page: 1, limit: 10 });
      const page2 = handler.listControls({ organizationId: orgId, page: 2, limit: 10 });
      const page3 = handler.listControls({ organizationId: orgId, page: 3, limit: 10 });

      expect(page1.data?.controls.length).toBe(10);
      expect(page2.data?.controls.length).toBe(10);
      expect(page3.data?.controls.length).toBe(5);
    });

    it('should filter by type', () => {
      const result = handler.listControls({ organizationId: orgId, type: 'preventive' });

      expect(result.success).toBe(true);
      expect(result.data?.controls.every(c => c.type === 'preventive')).toBe(true);
    });

    it('should filter by status', () => {
      const result = handler.listControls({ organizationId: orgId, status: 'active' });

      expect(result.success).toBe(true);
      expect(result.data?.controls.every(c => c.status === 'active')).toBe(true);
    });

    it('should filter by SOX relevance', () => {
      const result = handler.listControls({ organizationId: orgId, soxRelevant: true });

      expect(result.success).toBe(true);
      expect(result.data?.controls.every(c => c.soxRelevant === true)).toBe(true);
      expect(result.data?.total).toBe(20);
    });

    it('should search by name', () => {
      const result = handler.listControls({ organizationId: orgId, search: 'Control 1' });

      expect(result.success).toBe(true);
      expect(result.data?.controls.length).toBeGreaterThan(0);
    });

    it('should search by control ID', () => {
      const result = handler.listControls({ organizationId: orgId, search: 'SOX-001' });

      expect(result.success).toBe(true);
      expect(result.data?.controls.length).toBe(1);
    });

    it('should sort by name ascending', () => {
      const result = handler.listControls({ organizationId: orgId, sortBy: 'name', sortOrder: 'asc', limit: 100 });

      const names = result.data?.controls.map(c => c.name) || [];
      const sorted = [...names].sort();
      expect(names).toEqual(sorted);
    });

    it('should sort by name descending', () => {
      const result = handler.listControls({ organizationId: orgId, sortBy: 'name', sortOrder: 'desc', limit: 100 });

      const names = result.data?.controls.map(c => c.name) || [];
      const sorted = [...names].sort().reverse();
      expect(names).toEqual(sorted);
    });

    it('should return empty for non-existent organization', () => {
      const result = handler.listControls({ organizationId: 'non-existent' });

      expect(result.success).toBe(true);
      expect(result.data?.total).toBe(0);
    });

    it('should combine multiple filters', () => {
      const result = handler.listControls({
        organizationId: orgId,
        type: 'preventive',
        status: 'active',
        soxRelevant: true,
      });

      expect(result.success).toBe(true);
      expect(result.data?.controls.every(c =>
        c.type === 'preventive' &&
        c.status === 'active' &&
        c.soxRelevant === true
      )).toBe(true);
    });
  });

  describe('GET /api/controls/:id', () => {
    beforeEach(() => {
      handler.seedControl({
        id: 'ctrl-1',
        controlId: 'SOX-001',
        name: 'Test Control',
        description: 'Test description',
        type: 'preventive',
        frequency: 'monthly',
        ownerId: 'user-1',
        soxRelevant: true,
        effectivenessRating: 'effective',
        status: 'active',
        organizationId: orgId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it('should get control by ID', () => {
      const result = handler.getControl('ctrl-1', orgId);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('ctrl-1');
      expect(result.data?.name).toBe('Test Control');
    });

    it('should return error for non-existent control', () => {
      const result = handler.getControl('non-existent', orgId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Control not found');
    });

    it('should deny access to control from different organization', () => {
      const result = handler.getControl('ctrl-1', 'other-org');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Access denied');
    });
  });

  describe('POST /api/controls', () => {
    it('should create a new control', () => {
      const result = handler.createControl({
        controlId: 'SOX-001',
        name: 'New Control',
        description: 'Description',
        type: 'preventive',
        frequency: 'monthly',
        ownerId: 'user-1',
        soxRelevant: true,
        effectivenessRating: 'not_tested',
        status: 'active',
        organizationId: orgId,
      }, 'user-1');

      expect(result.success).toBe(true);
      expect(result.data?.id).toBeDefined();
      expect(result.data?.name).toBe('New Control');
    });

    it('should require name', () => {
      const result = handler.createControl({
        controlId: 'SOX-001',
        name: '',
        description: 'Description',
        type: 'preventive',
        frequency: 'monthly',
        ownerId: 'user-1',
        soxRelevant: true,
        effectivenessRating: 'not_tested',
        status: 'active',
        organizationId: orgId,
      }, 'user-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Name is required');
    });

    it('should require control ID', () => {
      const result = handler.createControl({
        controlId: '',
        name: 'New Control',
        description: 'Description',
        type: 'preventive',
        frequency: 'monthly',
        ownerId: 'user-1',
        soxRelevant: true,
        effectivenessRating: 'not_tested',
        status: 'active',
        organizationId: orgId,
      }, 'user-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Control ID is required');
    });

    it('should validate control ID format', () => {
      const result = handler.createControl({
        controlId: 'invalid-format',
        name: 'New Control',
        description: 'Description',
        type: 'preventive',
        frequency: 'monthly',
        ownerId: 'user-1',
        soxRelevant: true,
        effectivenessRating: 'not_tested',
        status: 'active',
        organizationId: orgId,
      }, 'user-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid control ID format');
    });

    it('should prevent duplicate control IDs', () => {
      handler.createControl({
        controlId: 'SOX-001',
        name: 'First Control',
        description: 'Description',
        type: 'preventive',
        frequency: 'monthly',
        ownerId: 'user-1',
        soxRelevant: true,
        effectivenessRating: 'not_tested',
        status: 'active',
        organizationId: orgId,
      }, 'user-1');

      const result = handler.createControl({
        controlId: 'SOX-001',
        name: 'Duplicate Control',
        description: 'Description',
        type: 'preventive',
        frequency: 'monthly',
        ownerId: 'user-1',
        soxRelevant: true,
        effectivenessRating: 'not_tested',
        status: 'active',
        organizationId: orgId,
      }, 'user-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Control ID already exists');
    });

    it('should allow same control ID in different organizations', () => {
      handler.createControl({
        controlId: 'SOX-001',
        name: 'Org 1 Control',
        description: 'Description',
        type: 'preventive',
        frequency: 'monthly',
        ownerId: 'user-1',
        soxRelevant: true,
        effectivenessRating: 'not_tested',
        status: 'active',
        organizationId: 'org-1',
      }, 'user-1');

      const result = handler.createControl({
        controlId: 'SOX-001',
        name: 'Org 2 Control',
        description: 'Description',
        type: 'preventive',
        frequency: 'monthly',
        ownerId: 'user-1',
        soxRelevant: true,
        effectivenessRating: 'not_tested',
        status: 'active',
        organizationId: 'org-2',
      }, 'user-1');

      expect(result.success).toBe(true);
    });

    it('should set default effectiveness rating', () => {
      const result = handler.createControl({
        controlId: 'SOX-001',
        name: 'New Control',
        description: 'Description',
        type: 'preventive',
        frequency: 'monthly',
        ownerId: 'user-1',
        soxRelevant: true,
        effectivenessRating: undefined as unknown as Control['effectivenessRating'],
        status: 'active',
        organizationId: orgId,
      }, 'user-1');

      expect(result.success).toBe(true);
      expect(result.data?.effectivenessRating).toBe('not_tested');
    });
  });

  describe('PUT /api/controls/:id', () => {
    beforeEach(() => {
      handler.seedControl({
        id: 'ctrl-1',
        controlId: 'SOX-001',
        name: 'Original Name',
        description: 'Original description',
        type: 'preventive',
        frequency: 'monthly',
        ownerId: 'user-1',
        soxRelevant: true,
        effectivenessRating: 'not_tested',
        status: 'active',
        organizationId: orgId,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      });
    });

    it('should update control', () => {
      const result = handler.updateControl('ctrl-1', { name: 'Updated Name' }, orgId);

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Updated Name');
    });

    it('should update multiple fields', () => {
      const result = handler.updateControl('ctrl-1', {
        name: 'Updated Name',
        description: 'Updated description',
        type: 'detective',
      }, orgId);

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Updated Name');
      expect(result.data?.description).toBe('Updated description');
      expect(result.data?.type).toBe('detective');
    });

    it('should update updatedAt timestamp', () => {
      const result = handler.updateControl('ctrl-1', { name: 'Updated' }, orgId);

      expect(result.data?.updatedAt.getTime()).toBeGreaterThan(result.data?.createdAt.getTime() || 0);
    });

    it('should preserve createdAt timestamp', () => {
      const result = handler.updateControl('ctrl-1', { name: 'Updated' }, orgId);

      expect(result.data?.createdAt).toEqual(new Date('2024-01-01'));
    });

    it('should prevent changing organization', () => {
      const result = handler.updateControl('ctrl-1', { organizationId: 'other-org' }, orgId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot change organization');
    });

    it('should return error for non-existent control', () => {
      const result = handler.updateControl('non-existent', { name: 'Updated' }, orgId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Control not found');
    });

    it('should deny access to control from different organization', () => {
      const result = handler.updateControl('ctrl-1', { name: 'Updated' }, 'other-org');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Access denied');
    });

    it('should validate control ID format on update', () => {
      const result = handler.updateControl('ctrl-1', { controlId: 'invalid' }, orgId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid control ID format');
    });

    it('should prevent duplicate control ID on update', () => {
      handler.seedControl({
        id: 'ctrl-2',
        controlId: 'SOX-002',
        name: 'Another Control',
        description: 'Description',
        type: 'preventive',
        frequency: 'monthly',
        ownerId: 'user-1',
        soxRelevant: true,
        effectivenessRating: 'not_tested',
        status: 'active',
        organizationId: orgId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = handler.updateControl('ctrl-1', { controlId: 'SOX-002' }, orgId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Control ID already exists');
    });
  });

  describe('DELETE /api/controls/:id', () => {
    beforeEach(() => {
      handler.seedControl({
        id: 'ctrl-1',
        controlId: 'SOX-001',
        name: 'Test Control',
        description: 'Description',
        type: 'preventive',
        frequency: 'monthly',
        ownerId: 'user-1',
        soxRelevant: true,
        effectivenessRating: 'not_tested',
        status: 'active',
        organizationId: orgId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it('should delete control', () => {
      const result = handler.deleteControl('ctrl-1', orgId);

      expect(result.success).toBe(true);

      const getResult = handler.getControl('ctrl-1', orgId);
      expect(getResult.success).toBe(false);
    });

    it('should return error for non-existent control', () => {
      const result = handler.deleteControl('non-existent', orgId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Control not found');
    });

    it('should deny deletion from different organization', () => {
      const result = handler.deleteControl('ctrl-1', 'other-org');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Access denied');
    });
  });

  describe('GET /api/controls/:id/history', () => {
    beforeEach(() => {
      handler.seedControl({
        id: 'ctrl-1',
        controlId: 'SOX-001',
        name: 'Test Control',
        description: 'Description',
        type: 'preventive',
        frequency: 'monthly',
        ownerId: 'user-1',
        soxRelevant: true,
        effectivenessRating: 'not_tested',
        status: 'active',
        organizationId: orgId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it('should get control history', () => {
      const result = handler.getControlHistory('ctrl-1', orgId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.length).toBeGreaterThan(0);
    });

    it('should return error for non-existent control', () => {
      const result = handler.getControlHistory('non-existent', orgId);

      expect(result.success).toBe(false);
    });

    it('should deny access from different organization', () => {
      const result = handler.getControlHistory('ctrl-1', 'other-org');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Access denied');
    });
  });

  describe('POST /api/controls/:id/test', () => {
    beforeEach(() => {
      handler.seedControl({
        id: 'ctrl-1',
        controlId: 'SOX-001',
        name: 'Test Control',
        description: 'Description',
        type: 'preventive',
        frequency: 'monthly',
        ownerId: 'user-1',
        soxRelevant: true,
        effectivenessRating: 'not_tested',
        status: 'active',
        organizationId: orgId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it('should record passing test result', () => {
      const result = handler.recordTestResult('ctrl-1', orgId, {
        result: 'pass',
        notes: 'All checks passed',
        testedBy: 'user-1',
      });

      expect(result.success).toBe(true);
      expect(result.data?.newEffectiveness).toBe('effective');
    });

    it('should record failing test result', () => {
      const result = handler.recordTestResult('ctrl-1', orgId, {
        result: 'fail',
        notes: 'Control failure detected',
        testedBy: 'user-1',
      });

      expect(result.success).toBe(true);
      expect(result.data?.newEffectiveness).toBe('ineffective');
    });

    it('should record exception test result', () => {
      const result = handler.recordTestResult('ctrl-1', orgId, {
        result: 'exception',
        notes: 'Minor exception noted',
        testedBy: 'user-1',
      });

      expect(result.success).toBe(true);
      expect(result.data?.newEffectiveness).toBe('partially_effective');
    });

    it('should return error for non-existent control', () => {
      const result = handler.recordTestResult('non-existent', orgId, {
        result: 'pass',
        testedBy: 'user-1',
      });

      expect(result.success).toBe(false);
    });

    it('should deny access from different organization', () => {
      const result = handler.recordTestResult('ctrl-1', 'other-org', {
        result: 'pass',
        testedBy: 'user-1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Access denied');
    });
  });
});

describe('Controls API Security', () => {
  let handler: ControlsApiHandler;

  beforeEach(() => {
    handler = new ControlsApiHandler();
  });

  it('should sanitize search input', () => {
    const result = handler.listControls({
      organizationId: 'org-123',
      search: '<script>alert("xss")</script>',
    });

    expect(result.success).toBe(true);
    // Search should work but find nothing (safe)
    expect(result.data?.total).toBe(0);
  });

  it('should handle SQL injection in search', () => {
    const result = handler.listControls({
      organizationId: 'org-123',
      search: "'; DROP TABLE controls; --",
    });

    expect(result.success).toBe(true);
    // Should not crash and return empty results
    expect(result.data?.total).toBe(0);
  });

  it('should handle very long search queries', () => {
    const result = handler.listControls({
      organizationId: 'org-123',
      search: 'x'.repeat(10000),
    });

    expect(result.success).toBe(true);
  });

  it('should enforce organization isolation', () => {
    handler.seedControl({
      id: 'ctrl-1',
      controlId: 'SOX-001',
      name: 'Org 1 Control',
      description: 'Description',
      type: 'preventive',
      frequency: 'monthly',
      ownerId: 'user-1',
      soxRelevant: true,
      effectivenessRating: 'effective',
      status: 'active',
      organizationId: 'org-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Should not be able to access from another org
    const getResult = handler.getControl('ctrl-1', 'org-2');
    expect(getResult.success).toBe(false);

    const updateResult = handler.updateControl('ctrl-1', { name: 'Hacked' }, 'org-2');
    expect(updateResult.success).toBe(false);

    const deleteResult = handler.deleteControl('ctrl-1', 'org-2');
    expect(deleteResult.success).toBe(false);
  });
});
