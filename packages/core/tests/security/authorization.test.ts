// ==========================================================================
// AUTHORIZATION TESTS
// Comprehensive tests for Role-Based Access Control (RBAC)
// Critical for audit and banking applications with strict access controls
// ==========================================================================

import { describe, it, expect, beforeEach } from 'vitest';

// Permission definitions for audit/GRC application
type Permission =
  | 'ledger:read' | 'ledger:write' | 'ledger:delete' | 'ledger:verify'
  | 'audit:read' | 'audit:write' | 'audit:approve' | 'audit:sign'
  | 'control:read' | 'control:write' | 'control:test'
  | 'risk:read' | 'risk:write' | 'risk:approve'
  | 'report:read' | 'report:generate' | 'report:export'
  | 'user:read' | 'user:write' | 'user:delete'
  | 'org:read' | 'org:write' | 'org:admin'
  | 'settings:read' | 'settings:write'
  | 'evidence:read' | 'evidence:upload' | 'evidence:delete'
  | 'workpaper:read' | 'workpaper:write' | 'workpaper:review' | 'workpaper:approve'
  | 'finding:read' | 'finding:write' | 'finding:close'
  | 'certification:read' | 'certification:sign';

// Role definitions
interface Role {
  name: string;
  permissions: Permission[];
  inheritsFrom?: string[];
}

const roles: Record<string, Role> = {
  viewer: {
    name: 'Viewer',
    permissions: [
      'ledger:read',
      'audit:read',
      'control:read',
      'risk:read',
      'report:read',
      'evidence:read',
      'workpaper:read',
      'finding:read',
    ],
  },
  auditor: {
    name: 'Auditor',
    permissions: [
      'audit:write',
      'control:test',
      'workpaper:write',
      'workpaper:review',
      'evidence:upload',
      'finding:write',
      'report:generate',
    ],
    inheritsFrom: ['viewer'],
  },
  senior_auditor: {
    name: 'Senior Auditor',
    permissions: [
      'audit:approve',
      'workpaper:approve',
      'finding:close',
      'report:export',
    ],
    inheritsFrom: ['auditor'],
  },
  risk_manager: {
    name: 'Risk Manager',
    permissions: [
      'risk:write',
      'risk:approve',
      'control:write',
    ],
    inheritsFrom: ['viewer'],
  },
  compliance_officer: {
    name: 'Compliance Officer',
    permissions: [
      'audit:sign',
      'certification:read',
      'certification:sign',
      'report:export',
    ],
    inheritsFrom: ['senior_auditor'],
  },
  admin: {
    name: 'Administrator',
    permissions: [
      'user:read',
      'user:write',
      'user:delete',
      'org:read',
      'org:write',
      'org:admin',
      'settings:read',
      'settings:write',
      'evidence:delete',
      'ledger:write',
      'ledger:delete',
      'ledger:verify',
    ],
    inheritsFrom: ['compliance_officer'],
  },
};

// RBAC Engine
class RBACEngine {
  private roles: Record<string, Role>;
  private permissionCache: Map<string, Set<Permission>> = new Map();

  constructor(roles: Record<string, Role>) {
    this.roles = roles;
  }

  private getAllPermissions(roleName: string, visited: Set<string> = new Set()): Set<Permission> {
    // Check cache
    if (this.permissionCache.has(roleName)) {
      return this.permissionCache.get(roleName)!;
    }

    // Prevent circular inheritance
    if (visited.has(roleName)) {
      return new Set();
    }
    visited.add(roleName);

    const role = this.roles[roleName];
    if (!role) {
      return new Set();
    }

    const permissions = new Set<Permission>(role.permissions);

    // Inherit permissions from parent roles
    if (role.inheritsFrom) {
      for (const parentRole of role.inheritsFrom) {
        const parentPermissions = this.getAllPermissions(parentRole, visited);
        parentPermissions.forEach(p => permissions.add(p));
      }
    }

    // Cache the result
    this.permissionCache.set(roleName, permissions);

    return permissions;
  }

  hasPermission(roleName: string, permission: Permission): boolean {
    const permissions = this.getAllPermissions(roleName);
    return permissions.has(permission);
  }

  hasAnyPermission(roleName: string, permissions: Permission[]): boolean {
    return permissions.some(p => this.hasPermission(roleName, p));
  }

  hasAllPermissions(roleName: string, permissions: Permission[]): boolean {
    return permissions.every(p => this.hasPermission(roleName, p));
  }

  getPermissions(roleName: string): Permission[] {
    return Array.from(this.getAllPermissions(roleName));
  }

  getRoleHierarchy(roleName: string): string[] {
    const hierarchy: string[] = [];
    const visited = new Set<string>();

    const traverse = (name: string) => {
      if (visited.has(name)) return;
      visited.add(name);

      const role = this.roles[name];
      if (!role) return;

      hierarchy.push(name);

      if (role.inheritsFrom) {
        for (const parent of role.inheritsFrom) {
          traverse(parent);
        }
      }
    };

    traverse(roleName);
    return hierarchy;
  }
}

// Resource-based access control
interface Resource {
  id: string;
  type: string;
  organizationId: string;
  ownerId?: string;
  departmentId?: string;
  confidentialityLevel: 'public' | 'internal' | 'confidential' | 'restricted';
}

interface User {
  id: string;
  organizationId: string;
  departmentId: string;
  roles: string[];
}

class ResourceAccessControl {
  private rbac: RBACEngine;

  constructor(rbac: RBACEngine) {
    this.rbac = rbac;
  }

  canAccess(user: User, resource: Resource, action: Permission): boolean {
    // Multi-tenancy: User must belong to same organization
    if (user.organizationId !== resource.organizationId) {
      return false;
    }

    // Check if user has required permission through any role
    const hasPermission = user.roles.some(role =>
      this.rbac.hasPermission(role, action)
    );

    if (!hasPermission) {
      return false;
    }

    // Additional confidentiality checks
    if (resource.confidentialityLevel === 'restricted') {
      // Restricted resources require admin role or being the owner
      const isAdmin = user.roles.includes('admin');
      const isOwner = resource.ownerId === user.id;
      if (!isAdmin && !isOwner) {
        return false;
      }
    }

    return true;
  }

  getAccessibleResources(
    user: User,
    resources: Resource[],
    action: Permission
  ): Resource[] {
    return resources.filter(resource => this.canAccess(user, resource, action));
  }
}

// Audit trail for access decisions
interface AccessDecision {
  timestamp: Date;
  userId: string;
  resourceId: string;
  resourceType: string;
  action: Permission;
  decision: 'allowed' | 'denied';
  reason?: string;
}

class AuditedResourceAccessControl extends ResourceAccessControl {
  private accessLog: AccessDecision[] = [];

  canAccessWithAudit(user: User, resource: Resource, action: Permission): boolean {
    const decision = super.canAccess(user, resource, action);

    let reason: string | undefined;
    if (!decision) {
      if (user.organizationId !== resource.organizationId) {
        reason = 'Cross-organization access denied';
      } else if (resource.confidentialityLevel === 'restricted') {
        reason = 'Restricted resource - admin or owner required';
      } else {
        reason = 'Insufficient permissions';
      }
    }

    this.accessLog.push({
      timestamp: new Date(),
      userId: user.id,
      resourceId: resource.id,
      resourceType: resource.type,
      action,
      decision: decision ? 'allowed' : 'denied',
      reason,
    });

    return decision;
  }

  getAccessLog(): AccessDecision[] {
    return [...this.accessLog];
  }

  getAccessLogForUser(userId: string): AccessDecision[] {
    return this.accessLog.filter(log => log.userId === userId);
  }

  getAccessLogForResource(resourceId: string): AccessDecision[] {
    return this.accessLog.filter(log => log.resourceId === resourceId);
  }
}

describe('RBAC Engine', () => {
  let rbac: RBACEngine;

  beforeEach(() => {
    rbac = new RBACEngine(roles);
  });

  describe('Viewer role', () => {
    const role = 'viewer';

    it('should have read permissions', () => {
      expect(rbac.hasPermission(role, 'ledger:read')).toBe(true);
      expect(rbac.hasPermission(role, 'audit:read')).toBe(true);
      expect(rbac.hasPermission(role, 'control:read')).toBe(true);
      expect(rbac.hasPermission(role, 'risk:read')).toBe(true);
    });

    it('should not have write permissions', () => {
      expect(rbac.hasPermission(role, 'ledger:write')).toBe(false);
      expect(rbac.hasPermission(role, 'audit:write')).toBe(false);
      expect(rbac.hasPermission(role, 'control:write')).toBe(false);
      expect(rbac.hasPermission(role, 'risk:write')).toBe(false);
    });

    it('should not have admin permissions', () => {
      expect(rbac.hasPermission(role, 'user:write')).toBe(false);
      expect(rbac.hasPermission(role, 'org:admin')).toBe(false);
      expect(rbac.hasPermission(role, 'settings:write')).toBe(false);
    });

    it('should not have approval permissions', () => {
      expect(rbac.hasPermission(role, 'audit:approve')).toBe(false);
      expect(rbac.hasPermission(role, 'audit:sign')).toBe(false);
      expect(rbac.hasPermission(role, 'workpaper:approve')).toBe(false);
    });
  });

  describe('Auditor role', () => {
    const role = 'auditor';

    it('should inherit viewer permissions', () => {
      expect(rbac.hasPermission(role, 'ledger:read')).toBe(true);
      expect(rbac.hasPermission(role, 'audit:read')).toBe(true);
      expect(rbac.hasPermission(role, 'control:read')).toBe(true);
    });

    it('should have audit work permissions', () => {
      expect(rbac.hasPermission(role, 'audit:write')).toBe(true);
      expect(rbac.hasPermission(role, 'workpaper:write')).toBe(true);
      expect(rbac.hasPermission(role, 'workpaper:review')).toBe(true);
      expect(rbac.hasPermission(role, 'control:test')).toBe(true);
    });

    it('should have evidence upload but not delete', () => {
      expect(rbac.hasPermission(role, 'evidence:upload')).toBe(true);
      expect(rbac.hasPermission(role, 'evidence:delete')).toBe(false);
    });

    it('should not have approval permissions', () => {
      expect(rbac.hasPermission(role, 'audit:approve')).toBe(false);
      expect(rbac.hasPermission(role, 'workpaper:approve')).toBe(false);
    });
  });

  describe('Senior Auditor role', () => {
    const role = 'senior_auditor';

    it('should inherit auditor permissions', () => {
      expect(rbac.hasPermission(role, 'audit:write')).toBe(true);
      expect(rbac.hasPermission(role, 'workpaper:write')).toBe(true);
      expect(rbac.hasPermission(role, 'ledger:read')).toBe(true);
    });

    it('should have approval permissions', () => {
      expect(rbac.hasPermission(role, 'audit:approve')).toBe(true);
      expect(rbac.hasPermission(role, 'workpaper:approve')).toBe(true);
      expect(rbac.hasPermission(role, 'finding:close')).toBe(true);
    });

    it('should have report export', () => {
      expect(rbac.hasPermission(role, 'report:export')).toBe(true);
    });

    it('should not have signing permissions', () => {
      expect(rbac.hasPermission(role, 'audit:sign')).toBe(false);
      expect(rbac.hasPermission(role, 'certification:sign')).toBe(false);
    });
  });

  describe('Risk Manager role', () => {
    const role = 'risk_manager';

    it('should inherit viewer permissions', () => {
      expect(rbac.hasPermission(role, 'risk:read')).toBe(true);
      expect(rbac.hasPermission(role, 'control:read')).toBe(true);
    });

    it('should have risk management permissions', () => {
      expect(rbac.hasPermission(role, 'risk:write')).toBe(true);
      expect(rbac.hasPermission(role, 'risk:approve')).toBe(true);
      expect(rbac.hasPermission(role, 'control:write')).toBe(true);
    });

    it('should not have audit permissions', () => {
      expect(rbac.hasPermission(role, 'audit:write')).toBe(false);
      expect(rbac.hasPermission(role, 'audit:approve')).toBe(false);
    });
  });

  describe('Compliance Officer role', () => {
    const role = 'compliance_officer';

    it('should inherit senior auditor permissions', () => {
      expect(rbac.hasPermission(role, 'audit:approve')).toBe(true);
      expect(rbac.hasPermission(role, 'workpaper:approve')).toBe(true);
      expect(rbac.hasPermission(role, 'audit:write')).toBe(true);
    });

    it('should have signing permissions', () => {
      expect(rbac.hasPermission(role, 'audit:sign')).toBe(true);
      expect(rbac.hasPermission(role, 'certification:sign')).toBe(true);
    });

    it('should not have admin permissions', () => {
      expect(rbac.hasPermission(role, 'user:write')).toBe(false);
      expect(rbac.hasPermission(role, 'org:admin')).toBe(false);
    });
  });

  describe('Admin role', () => {
    const role = 'admin';

    it('should inherit all compliance officer permissions', () => {
      expect(rbac.hasPermission(role, 'audit:sign')).toBe(true);
      expect(rbac.hasPermission(role, 'certification:sign')).toBe(true);
      expect(rbac.hasPermission(role, 'audit:approve')).toBe(true);
    });

    it('should have user management permissions', () => {
      expect(rbac.hasPermission(role, 'user:read')).toBe(true);
      expect(rbac.hasPermission(role, 'user:write')).toBe(true);
      expect(rbac.hasPermission(role, 'user:delete')).toBe(true);
    });

    it('should have organization admin permissions', () => {
      expect(rbac.hasPermission(role, 'org:read')).toBe(true);
      expect(rbac.hasPermission(role, 'org:write')).toBe(true);
      expect(rbac.hasPermission(role, 'org:admin')).toBe(true);
    });

    it('should have system settings permissions', () => {
      expect(rbac.hasPermission(role, 'settings:read')).toBe(true);
      expect(rbac.hasPermission(role, 'settings:write')).toBe(true);
    });

    it('should have ledger management permissions', () => {
      expect(rbac.hasPermission(role, 'ledger:write')).toBe(true);
      expect(rbac.hasPermission(role, 'ledger:delete')).toBe(true);
      expect(rbac.hasPermission(role, 'ledger:verify')).toBe(true);
    });

    it('should have evidence delete permission', () => {
      expect(rbac.hasPermission(role, 'evidence:delete')).toBe(true);
    });
  });

  describe('Permission checking methods', () => {
    it('should check if role has any of multiple permissions', () => {
      expect(rbac.hasAnyPermission('viewer', ['ledger:read', 'ledger:write'])).toBe(true);
      expect(rbac.hasAnyPermission('viewer', ['ledger:write', 'user:write'])).toBe(false);
    });

    it('should check if role has all of multiple permissions', () => {
      expect(rbac.hasAllPermissions('viewer', ['ledger:read', 'audit:read'])).toBe(true);
      expect(rbac.hasAllPermissions('viewer', ['ledger:read', 'ledger:write'])).toBe(false);
    });

    it('should return all permissions for a role', () => {
      const viewerPermissions = rbac.getPermissions('viewer');
      expect(viewerPermissions).toContain('ledger:read');
      expect(viewerPermissions).toContain('audit:read');
      expect(viewerPermissions).not.toContain('ledger:write');
    });

    it('should return inherited permissions', () => {
      const auditorPermissions = rbac.getPermissions('auditor');
      // Direct permissions
      expect(auditorPermissions).toContain('audit:write');
      // Inherited from viewer
      expect(auditorPermissions).toContain('ledger:read');
    });
  });

  describe('Role hierarchy', () => {
    it('should return role hierarchy for viewer', () => {
      const hierarchy = rbac.getRoleHierarchy('viewer');
      expect(hierarchy).toEqual(['viewer']);
    });

    it('should return role hierarchy for auditor', () => {
      const hierarchy = rbac.getRoleHierarchy('auditor');
      expect(hierarchy).toContain('auditor');
      expect(hierarchy).toContain('viewer');
    });

    it('should return full hierarchy for admin', () => {
      const hierarchy = rbac.getRoleHierarchy('admin');
      expect(hierarchy).toContain('admin');
      expect(hierarchy).toContain('compliance_officer');
      expect(hierarchy).toContain('senior_auditor');
      expect(hierarchy).toContain('auditor');
      expect(hierarchy).toContain('viewer');
    });
  });

  describe('Unknown roles', () => {
    it('should return empty permissions for unknown role', () => {
      expect(rbac.getPermissions('nonexistent')).toEqual([]);
    });

    it('should deny all permissions for unknown role', () => {
      expect(rbac.hasPermission('nonexistent', 'ledger:read')).toBe(false);
    });
  });
});

describe('Resource Access Control', () => {
  let rbac: RBACEngine;
  let accessControl: ResourceAccessControl;

  const createUser = (overrides: Partial<User> = {}): User => ({
    id: 'user-1',
    organizationId: 'org-1',
    departmentId: 'dept-1',
    roles: ['viewer'],
    ...overrides,
  });

  const createResource = (overrides: Partial<Resource> = {}): Resource => ({
    id: 'resource-1',
    type: 'ledger',
    organizationId: 'org-1',
    confidentialityLevel: 'internal',
    ...overrides,
  });

  beforeEach(() => {
    rbac = new RBACEngine(roles);
    accessControl = new ResourceAccessControl(rbac);
  });

  describe('Multi-tenancy', () => {
    it('should allow access to resources in same organization', () => {
      const user = createUser({ roles: ['viewer'] });
      const resource = createResource();
      expect(accessControl.canAccess(user, resource, 'ledger:read')).toBe(true);
    });

    it('should deny access to resources in different organization', () => {
      const user = createUser({ organizationId: 'org-1' });
      const resource = createResource({ organizationId: 'org-2' });
      expect(accessControl.canAccess(user, resource, 'ledger:read')).toBe(false);
    });

    it('should deny access even for admin across organizations', () => {
      const user = createUser({ roles: ['admin'], organizationId: 'org-1' });
      const resource = createResource({ organizationId: 'org-2' });
      expect(accessControl.canAccess(user, resource, 'ledger:read')).toBe(false);
    });
  });

  describe('Permission-based access', () => {
    it('should allow viewer to read ledger', () => {
      const user = createUser({ roles: ['viewer'] });
      const resource = createResource({ type: 'ledger' });
      expect(accessControl.canAccess(user, resource, 'ledger:read')).toBe(true);
    });

    it('should deny viewer from writing to ledger', () => {
      const user = createUser({ roles: ['viewer'] });
      const resource = createResource({ type: 'ledger' });
      expect(accessControl.canAccess(user, resource, 'ledger:write')).toBe(false);
    });

    it('should allow admin to write to ledger', () => {
      const user = createUser({ roles: ['admin'] });
      const resource = createResource({ type: 'ledger' });
      expect(accessControl.canAccess(user, resource, 'ledger:write')).toBe(true);
    });

    it('should check permissions with multiple roles', () => {
      const user = createUser({ roles: ['viewer', 'risk_manager'] });
      expect(accessControl.canAccess(user, createResource(), 'risk:write')).toBe(true);
      expect(accessControl.canAccess(user, createResource(), 'audit:write')).toBe(false);
    });
  });

  describe('Confidentiality levels', () => {
    it('should allow access to public resources', () => {
      const user = createUser({ roles: ['viewer'] });
      const resource = createResource({ confidentialityLevel: 'public' });
      expect(accessControl.canAccess(user, resource, 'ledger:read')).toBe(true);
    });

    it('should allow access to internal resources', () => {
      const user = createUser({ roles: ['viewer'] });
      const resource = createResource({ confidentialityLevel: 'internal' });
      expect(accessControl.canAccess(user, resource, 'ledger:read')).toBe(true);
    });

    it('should allow access to confidential resources with permission', () => {
      const user = createUser({ roles: ['viewer'] });
      const resource = createResource({ confidentialityLevel: 'confidential' });
      expect(accessControl.canAccess(user, resource, 'ledger:read')).toBe(true);
    });

    it('should deny non-admin access to restricted resources', () => {
      const user = createUser({ roles: ['senior_auditor'] });
      const resource = createResource({ confidentialityLevel: 'restricted' });
      expect(accessControl.canAccess(user, resource, 'ledger:read')).toBe(false);
    });

    it('should allow admin access to restricted resources', () => {
      const user = createUser({ roles: ['admin'] });
      const resource = createResource({ confidentialityLevel: 'restricted' });
      expect(accessControl.canAccess(user, resource, 'ledger:read')).toBe(true);
    });

    it('should allow owner access to restricted resources', () => {
      const user = createUser({ id: 'user-owner', roles: ['auditor'] });
      const resource = createResource({
        confidentialityLevel: 'restricted',
        ownerId: 'user-owner',
      });
      expect(accessControl.canAccess(user, resource, 'audit:write')).toBe(true);
    });

    it('should deny non-owner access to restricted resources', () => {
      const user = createUser({ id: 'user-other', roles: ['auditor'] });
      const resource = createResource({
        confidentialityLevel: 'restricted',
        ownerId: 'user-owner',
      });
      expect(accessControl.canAccess(user, resource, 'audit:write')).toBe(false);
    });
  });

  describe('Resource filtering', () => {
    it('should filter accessible resources', () => {
      const user = createUser({ roles: ['viewer'] });
      const resources = [
        createResource({ id: '1', organizationId: 'org-1' }),
        createResource({ id: '2', organizationId: 'org-2' }),
        createResource({ id: '3', organizationId: 'org-1' }),
      ];

      const accessible = accessControl.getAccessibleResources(user, resources, 'ledger:read');
      expect(accessible.map(r => r.id)).toEqual(['1', '3']);
    });

    it('should filter by permission and organization', () => {
      const user = createUser({ roles: ['auditor'] });
      const resources = [
        createResource({ id: '1', type: 'audit' }),
        createResource({ id: '2', type: 'audit', organizationId: 'org-2' }),
        createResource({ id: '3', type: 'audit', confidentialityLevel: 'restricted' }),
      ];

      const accessible = accessControl.getAccessibleResources(user, resources, 'audit:write');
      expect(accessible.map(r => r.id)).toEqual(['1']);
    });
  });
});

describe('Audited Access Control', () => {
  let rbac: RBACEngine;
  let auditedAccessControl: AuditedResourceAccessControl;

  beforeEach(() => {
    rbac = new RBACEngine(roles);
    auditedAccessControl = new AuditedResourceAccessControl(rbac);
  });

  it('should log allowed access', () => {
    const user: User = {
      id: 'user-1',
      organizationId: 'org-1',
      departmentId: 'dept-1',
      roles: ['viewer'],
    };
    const resource: Resource = {
      id: 'ledger-1',
      type: 'ledger',
      organizationId: 'org-1',
      confidentialityLevel: 'internal',
    };

    auditedAccessControl.canAccessWithAudit(user, resource, 'ledger:read');

    const log = auditedAccessControl.getAccessLog();
    expect(log).toHaveLength(1);
    expect(log[0].decision).toBe('allowed');
    expect(log[0].userId).toBe('user-1');
    expect(log[0].resourceId).toBe('ledger-1');
  });

  it('should log denied access with reason', () => {
    const user: User = {
      id: 'user-1',
      organizationId: 'org-1',
      departmentId: 'dept-1',
      roles: ['viewer'],
    };
    const resource: Resource = {
      id: 'ledger-1',
      type: 'ledger',
      organizationId: 'org-2',
      confidentialityLevel: 'internal',
    };

    auditedAccessControl.canAccessWithAudit(user, resource, 'ledger:read');

    const log = auditedAccessControl.getAccessLog();
    expect(log).toHaveLength(1);
    expect(log[0].decision).toBe('denied');
    expect(log[0].reason).toBe('Cross-organization access denied');
  });

  it('should filter log by user', () => {
    const user1: User = { id: 'user-1', organizationId: 'org-1', departmentId: 'dept-1', roles: ['viewer'] };
    const user2: User = { id: 'user-2', organizationId: 'org-1', departmentId: 'dept-1', roles: ['viewer'] };
    const resource: Resource = { id: 'r-1', type: 'ledger', organizationId: 'org-1', confidentialityLevel: 'internal' };

    auditedAccessControl.canAccessWithAudit(user1, resource, 'ledger:read');
    auditedAccessControl.canAccessWithAudit(user2, resource, 'ledger:read');
    auditedAccessControl.canAccessWithAudit(user1, resource, 'audit:read');

    const user1Log = auditedAccessControl.getAccessLogForUser('user-1');
    expect(user1Log).toHaveLength(2);
    expect(user1Log.every(l => l.userId === 'user-1')).toBe(true);
  });

  it('should filter log by resource', () => {
    const user: User = { id: 'user-1', organizationId: 'org-1', departmentId: 'dept-1', roles: ['viewer'] };
    const resource1: Resource = { id: 'r-1', type: 'ledger', organizationId: 'org-1', confidentialityLevel: 'internal' };
    const resource2: Resource = { id: 'r-2', type: 'audit', organizationId: 'org-1', confidentialityLevel: 'internal' };

    auditedAccessControl.canAccessWithAudit(user, resource1, 'ledger:read');
    auditedAccessControl.canAccessWithAudit(user, resource2, 'audit:read');
    auditedAccessControl.canAccessWithAudit(user, resource1, 'ledger:read');

    const resource1Log = auditedAccessControl.getAccessLogForResource('r-1');
    expect(resource1Log).toHaveLength(2);
    expect(resource1Log.every(l => l.resourceId === 'r-1')).toBe(true);
  });

  it('should include timestamp in log', () => {
    const user: User = { id: 'user-1', organizationId: 'org-1', departmentId: 'dept-1', roles: ['viewer'] };
    const resource: Resource = { id: 'r-1', type: 'ledger', organizationId: 'org-1', confidentialityLevel: 'internal' };

    const before = new Date();
    auditedAccessControl.canAccessWithAudit(user, resource, 'ledger:read');
    const after = new Date();

    const log = auditedAccessControl.getAccessLog();
    expect(log[0].timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(log[0].timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});

describe('Segregation of Duties', () => {
  interface SoDRule {
    conflictingRoles: [string, string];
    description: string;
  }

  const sodRules: SoDRule[] = [
    {
      conflictingRoles: ['auditor', 'admin'],
      description: 'Auditors cannot be system administrators',
    },
    {
      conflictingRoles: ['risk_manager', 'admin'],
      description: 'Risk managers cannot be system administrators',
    },
  ];

  const hasSoDConflict = (userRoles: string[]): SoDRule[] => {
    const conflicts: SoDRule[] = [];

    for (const rule of sodRules) {
      const hasRole1 = userRoles.includes(rule.conflictingRoles[0]);
      const hasRole2 = userRoles.includes(rule.conflictingRoles[1]);

      if (hasRole1 && hasRole2) {
        conflicts.push(rule);
      }
    }

    return conflicts;
  };

  it('should detect no conflict for single role', () => {
    expect(hasSoDConflict(['auditor'])).toHaveLength(0);
    expect(hasSoDConflict(['admin'])).toHaveLength(0);
  });

  it('should detect no conflict for compatible roles', () => {
    expect(hasSoDConflict(['viewer', 'auditor'])).toHaveLength(0);
    expect(hasSoDConflict(['viewer', 'risk_manager'])).toHaveLength(0);
  });

  it('should detect conflict for auditor + admin', () => {
    const conflicts = hasSoDConflict(['auditor', 'admin']);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].description).toContain('Auditors cannot be system administrators');
  });

  it('should detect conflict for risk_manager + admin', () => {
    const conflicts = hasSoDConflict(['risk_manager', 'admin']);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].description).toContain('Risk managers cannot be system administrators');
  });

  it('should detect multiple conflicts', () => {
    const conflicts = hasSoDConflict(['auditor', 'risk_manager', 'admin']);
    expect(conflicts).toHaveLength(2);
  });
});
