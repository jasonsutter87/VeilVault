// ==========================================================================
// ROLE-BASED ACCESS CONTROL (RBAC)
// Permissions and role management for GRC platform
// ==========================================================================

import { randomUUID } from '../utils/crypto.js';

// ==========================================================================
// RESOURCE TYPES
// ==========================================================================

export type Resource =
  | 'organization'
  | 'user'
  | 'role'
  | 'ledger'
  | 'transaction'
  | 'audit_package'
  | 'verification'
  | 'risk'
  | 'control'
  | 'control_test'
  | 'issue'
  | 'task'
  | 'comment'
  | 'notification'
  | 'alert'
  | 'alert_rule'
  | 'report'
  | 'report_template'
  | 'sox_assessment'
  | 'certification'
  | 'anomaly'
  | 'audit_log'
  | 'settings';

export type Action =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'list'
  | 'approve'
  | 'reject'
  | 'assign'
  | 'export'
  | 'import'
  | 'execute'
  | 'manage';

// ==========================================================================
// PERMISSION TYPES
// ==========================================================================

export interface RbacPermission {
  resource: Resource;
  actions: Action[];
  conditions?: PermissionCondition[];
}

export interface PermissionCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'contains';
  value: unknown;
}

export interface PermissionCheck {
  resource: Resource;
  action: Action;
  resourceId?: string;
  context?: Record<string, unknown>;
}

// ==========================================================================
// ROLE TYPES
// ==========================================================================

export type RoleType = 'system' | 'organization' | 'custom';

export interface Role {
  id: string;
  organizationId?: string; // null for system roles
  name: string;
  description: string;
  type: RoleType;
  permissions: RbacPermission[];
  inherits?: string[]; // Role IDs to inherit from
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRoleInput {
  organizationId?: string;
  name: string;
  description: string;
  type?: RoleType;
  permissions: RbacPermission[];
  inherits?: string[];
  isDefault?: boolean;
}

// ==========================================================================
// ROLE ASSIGNMENT
// ==========================================================================

export interface RoleAssignment {
  id: string;
  userId: string;
  roleId: string;
  organizationId: string;
  scope?: RoleScope;
  assignedBy: string;
  assignedAt: Date;
  expiresAt?: Date;
}

export interface RoleScope {
  // Limit role to specific entities
  riskIds?: string[];
  controlIds?: string[];
  issueIds?: string[];
  ledgerIds?: string[];
  // Limit by category/type
  riskCategories?: string[];
  controlTypes?: string[];
}

// ==========================================================================
// BUILT-IN ROLES
// ==========================================================================

export const SYSTEM_ROLES: Record<string, Omit<Role, 'id' | 'createdAt' | 'updatedAt'>> = {
  // Super Admin - full access to everything
  super_admin: {
    name: 'Super Admin',
    description: 'Full system access with all permissions',
    type: 'system',
    permissions: [
      { resource: 'organization', actions: ['create', 'read', 'update', 'delete', 'list', 'manage'] },
      { resource: 'user', actions: ['create', 'read', 'update', 'delete', 'list', 'manage'] },
      { resource: 'role', actions: ['create', 'read', 'update', 'delete', 'list', 'manage'] },
      { resource: 'ledger', actions: ['create', 'read', 'update', 'delete', 'list', 'manage'] },
      { resource: 'transaction', actions: ['create', 'read', 'update', 'delete', 'list'] },
      { resource: 'audit_package', actions: ['create', 'read', 'update', 'delete', 'list', 'export'] },
      { resource: 'verification', actions: ['create', 'read', 'list', 'execute'] },
      { resource: 'risk', actions: ['create', 'read', 'update', 'delete', 'list', 'approve'] },
      { resource: 'control', actions: ['create', 'read', 'update', 'delete', 'list', 'approve'] },
      { resource: 'control_test', actions: ['create', 'read', 'update', 'delete', 'list', 'approve'] },
      { resource: 'issue', actions: ['create', 'read', 'update', 'delete', 'list', 'approve', 'assign'] },
      { resource: 'task', actions: ['create', 'read', 'update', 'delete', 'list', 'assign'] },
      { resource: 'comment', actions: ['create', 'read', 'update', 'delete', 'list'] },
      { resource: 'notification', actions: ['create', 'read', 'update', 'delete', 'list'] },
      { resource: 'alert', actions: ['create', 'read', 'update', 'delete', 'list'] },
      { resource: 'alert_rule', actions: ['create', 'read', 'update', 'delete', 'list', 'manage'] },
      { resource: 'report', actions: ['create', 'read', 'update', 'delete', 'list', 'export'] },
      { resource: 'report_template', actions: ['create', 'read', 'update', 'delete', 'list', 'manage'] },
      { resource: 'sox_assessment', actions: ['create', 'read', 'update', 'delete', 'list', 'approve'] },
      { resource: 'certification', actions: ['create', 'read', 'update', 'delete', 'list', 'approve'] },
      { resource: 'anomaly', actions: ['read', 'list', 'update'] },
      { resource: 'audit_log', actions: ['read', 'list', 'export'] },
      { resource: 'settings', actions: ['read', 'update', 'manage'] },
    ],
  },

  // Organization Admin
  org_admin: {
    name: 'Organization Admin',
    description: 'Full access within an organization',
    type: 'system',
    permissions: [
      { resource: 'user', actions: ['create', 'read', 'update', 'delete', 'list'] },
      { resource: 'role', actions: ['create', 'read', 'update', 'delete', 'list'] },
      { resource: 'ledger', actions: ['create', 'read', 'update', 'delete', 'list', 'manage'] },
      { resource: 'transaction', actions: ['create', 'read', 'update', 'delete', 'list'] },
      { resource: 'audit_package', actions: ['create', 'read', 'update', 'delete', 'list', 'export'] },
      { resource: 'verification', actions: ['create', 'read', 'list', 'execute'] },
      { resource: 'risk', actions: ['create', 'read', 'update', 'delete', 'list', 'approve'] },
      { resource: 'control', actions: ['create', 'read', 'update', 'delete', 'list', 'approve'] },
      { resource: 'control_test', actions: ['create', 'read', 'update', 'delete', 'list', 'approve'] },
      { resource: 'issue', actions: ['create', 'read', 'update', 'delete', 'list', 'approve', 'assign'] },
      { resource: 'task', actions: ['create', 'read', 'update', 'delete', 'list', 'assign'] },
      { resource: 'comment', actions: ['create', 'read', 'update', 'delete', 'list'] },
      { resource: 'notification', actions: ['create', 'read', 'update', 'delete', 'list'] },
      { resource: 'alert', actions: ['create', 'read', 'update', 'delete', 'list'] },
      { resource: 'alert_rule', actions: ['create', 'read', 'update', 'delete', 'list', 'manage'] },
      { resource: 'report', actions: ['create', 'read', 'update', 'delete', 'list', 'export'] },
      { resource: 'report_template', actions: ['create', 'read', 'update', 'delete', 'list', 'manage'] },
      { resource: 'sox_assessment', actions: ['create', 'read', 'update', 'delete', 'list', 'approve'] },
      { resource: 'certification', actions: ['create', 'read', 'update', 'delete', 'list', 'approve'] },
      { resource: 'anomaly', actions: ['read', 'list', 'update'] },
      { resource: 'audit_log', actions: ['read', 'list'] },
      { resource: 'settings', actions: ['read', 'update'] },
    ],
  },

  // GRC Manager
  grc_manager: {
    name: 'GRC Manager',
    description: 'Manages risks, controls, and compliance activities',
    type: 'system',
    permissions: [
      { resource: 'risk', actions: ['create', 'read', 'update', 'delete', 'list', 'approve'] },
      { resource: 'control', actions: ['create', 'read', 'update', 'delete', 'list', 'approve'] },
      { resource: 'control_test', actions: ['create', 'read', 'update', 'delete', 'list', 'approve'] },
      { resource: 'issue', actions: ['create', 'read', 'update', 'delete', 'list', 'approve', 'assign'] },
      { resource: 'task', actions: ['create', 'read', 'update', 'delete', 'list', 'assign'] },
      { resource: 'comment', actions: ['create', 'read', 'update', 'delete', 'list'] },
      { resource: 'report', actions: ['create', 'read', 'list', 'export'] },
      { resource: 'report_template', actions: ['create', 'read', 'update', 'list'] },
      { resource: 'sox_assessment', actions: ['create', 'read', 'update', 'list', 'approve'] },
      { resource: 'certification', actions: ['create', 'read', 'update', 'list'] },
      { resource: 'anomaly', actions: ['read', 'list', 'update'] },
      { resource: 'alert', actions: ['read', 'list', 'update'] },
      { resource: 'alert_rule', actions: ['create', 'read', 'update', 'list'] },
      { resource: 'notification', actions: ['read', 'list', 'update'] },
    ],
  },

  // Internal Auditor
  internal_auditor: {
    name: 'Internal Auditor',
    description: 'Conducts internal audits and control testing',
    type: 'system',
    permissions: [
      { resource: 'risk', actions: ['read', 'list'] },
      { resource: 'control', actions: ['read', 'list'] },
      { resource: 'control_test', actions: ['create', 'read', 'update', 'list'] },
      { resource: 'issue', actions: ['create', 'read', 'update', 'list'] },
      { resource: 'task', actions: ['read', 'update', 'list'] },
      { resource: 'comment', actions: ['create', 'read', 'list'] },
      { resource: 'audit_package', actions: ['create', 'read', 'list', 'export'] },
      { resource: 'report', actions: ['read', 'list', 'export'] },
      { resource: 'sox_assessment', actions: ['read', 'list'] },
      { resource: 'notification', actions: ['read', 'list'] },
      { resource: 'ledger', actions: ['read', 'list'] },
      { resource: 'transaction', actions: ['read', 'list'] },
      { resource: 'verification', actions: ['create', 'read', 'list', 'execute'] },
    ],
  },

  // External Auditor (read-only with verification)
  external_auditor: {
    name: 'External Auditor',
    description: 'External auditor with read access and verification capabilities',
    type: 'system',
    permissions: [
      { resource: 'risk', actions: ['read', 'list'] },
      { resource: 'control', actions: ['read', 'list'] },
      { resource: 'control_test', actions: ['read', 'list'] },
      { resource: 'issue', actions: ['read', 'list'] },
      { resource: 'audit_package', actions: ['read', 'list', 'export'] },
      { resource: 'report', actions: ['read', 'list', 'export'] },
      { resource: 'sox_assessment', actions: ['read', 'list'] },
      { resource: 'certification', actions: ['read', 'list'] },
      { resource: 'verification', actions: ['read', 'list', 'execute'] },
      { resource: 'ledger', actions: ['read', 'list'] },
      { resource: 'transaction', actions: ['read', 'list'] },
    ],
  },

  // Control Owner
  control_owner: {
    name: 'Control Owner',
    description: 'Owns and maintains assigned controls',
    type: 'system',
    permissions: [
      { resource: 'control', actions: ['read', 'update', 'list'] },
      { resource: 'control_test', actions: ['read', 'list'] },
      { resource: 'issue', actions: ['read', 'update', 'list'] },
      { resource: 'task', actions: ['read', 'update', 'list'] },
      { resource: 'comment', actions: ['create', 'read', 'list'] },
      { resource: 'notification', actions: ['read', 'list'] },
    ],
  },

  // Risk Owner
  risk_owner: {
    name: 'Risk Owner',
    description: 'Owns and manages assigned risks',
    type: 'system',
    permissions: [
      { resource: 'risk', actions: ['read', 'update', 'list'] },
      { resource: 'control', actions: ['read', 'list'] },
      { resource: 'issue', actions: ['read', 'list'] },
      { resource: 'task', actions: ['read', 'update', 'list'] },
      { resource: 'comment', actions: ['create', 'read', 'list'] },
      { resource: 'notification', actions: ['read', 'list'] },
    ],
  },

  // Viewer (read-only)
  viewer: {
    name: 'Viewer',
    description: 'Read-only access to view GRC data',
    type: 'system',
    permissions: [
      { resource: 'risk', actions: ['read', 'list'] },
      { resource: 'control', actions: ['read', 'list'] },
      { resource: 'control_test', actions: ['read', 'list'] },
      { resource: 'issue', actions: ['read', 'list'] },
      { resource: 'task', actions: ['read', 'list'] },
      { resource: 'comment', actions: ['read', 'list'] },
      { resource: 'report', actions: ['read', 'list'] },
      { resource: 'notification', actions: ['read', 'list'] },
    ],
  },
};

// ==========================================================================
// ROLE FUNCTIONS
// ==========================================================================

export function createRole(input: CreateRoleInput): Role {
  const now = new Date();
  return {
    id: randomUUID(),
    organizationId: input.organizationId,
    name: input.name,
    description: input.description,
    type: input.type ?? 'custom',
    permissions: input.permissions,
    inherits: input.inherits,
    isDefault: input.isDefault,
    createdAt: now,
    updatedAt: now,
  };
}

export function initializeSystemRoles(): Role[] {
  const now = new Date();
  return Object.entries(SYSTEM_ROLES).map(([key, role]) => ({
    id: key,
    ...role,
    createdAt: now,
    updatedAt: now,
  }));
}

export function assignRole(
  userId: string,
  roleId: string,
  organizationId: string,
  assignedBy: string,
  options: { scope?: RoleScope; expiresAt?: Date } = {}
): RoleAssignment {
  return {
    id: randomUUID(),
    userId,
    roleId,
    organizationId,
    scope: options.scope,
    assignedBy,
    assignedAt: new Date(),
    expiresAt: options.expiresAt,
  };
}

// ==========================================================================
// PERMISSION CHECKING
// ==========================================================================

export function checkRbacPermission(
  role: Role,
  check: PermissionCheck,
  allRoles?: Map<string, Role>
): boolean {
  // Check direct permissions
  for (const permission of role.permissions) {
    if (permission.resource === check.resource && permission.actions.includes(check.action)) {
      // Check conditions if any
      if (permission.conditions && check.context) {
        const conditionsMet = permission.conditions.every(cond =>
          evaluateCondition(cond, check.context!)
        );
        if (!conditionsMet) continue;
      }
      return true;
    }
  }

  // Check inherited roles
  if (role.inherits && allRoles) {
    for (const inheritedRoleId of role.inherits) {
      const inheritedRole = allRoles.get(inheritedRoleId);
      if (inheritedRole && checkRbacPermission(inheritedRole, check, allRoles)) {
        return true;
      }
    }
  }

  return false;
}

export function checkAnyRbacPermission(
  role: Role,
  checks: PermissionCheck[],
  allRoles?: Map<string, Role>
): boolean {
  return checks.some(check => checkRbacPermission(role, check, allRoles));
}

export function checkAllRbacPermissions(
  role: Role,
  checks: PermissionCheck[],
  allRoles?: Map<string, Role>
): boolean {
  return checks.every(check => checkRbacPermission(role, check, allRoles));
}

function evaluateCondition(condition: PermissionCondition, context: Record<string, unknown>): boolean {
  const value = context[condition.field];

  switch (condition.operator) {
    case 'equals':
      return value === condition.value;
    case 'not_equals':
      return value !== condition.value;
    case 'in':
      return Array.isArray(condition.value) && condition.value.includes(value);
    case 'not_in':
      return Array.isArray(condition.value) && !condition.value.includes(value);
    case 'contains':
      return typeof value === 'string' && typeof condition.value === 'string' &&
        value.includes(condition.value);
    default:
      return false;
  }
}

// ==========================================================================
// USER PERMISSION AGGREGATION
// ==========================================================================

export interface UserPermissions {
  userId: string;
  organizationId: string;
  roles: Role[];
  effectivePermissions: RbacPermission[];
  scopes: RoleScope[];
}

export function aggregateUserPermissions(
  assignments: RoleAssignment[],
  allRoles: Map<string, Role>,
  organizationId: string
): UserPermissions | null {
  const orgAssignments = assignments.filter(a =>
    a.organizationId === organizationId &&
    (!a.expiresAt || a.expiresAt > new Date())
  );

  if (orgAssignments.length === 0) return null;

  const roles: Role[] = [];
  const scopes: RoleScope[] = [];
  const permissionMap = new Map<string, Set<Action>>();

  for (const assignment of orgAssignments) {
    const role = allRoles.get(assignment.roleId);
    if (!role) continue;

    roles.push(role);
    if (assignment.scope) {
      scopes.push(assignment.scope);
    }

    // Collect all permissions including inherited
    collectPermissions(role, allRoles, permissionMap);
  }

  // Convert to RbacPermission array
  const effectivePermissions: RbacPermission[] = [];
  for (const [resource, actions] of permissionMap) {
    effectivePermissions.push({
      resource: resource as Resource,
      actions: Array.from(actions),
    });
  }

  return {
    userId: orgAssignments[0]!.userId,
    organizationId,
    roles,
    effectivePermissions,
    scopes,
  };
}

function collectPermissions(
  role: Role,
  allRoles: Map<string, Role>,
  permissionMap: Map<string, Set<Action>>
): void {
  // Add direct permissions
  for (const permission of role.permissions) {
    const existing = permissionMap.get(permission.resource) || new Set();
    for (const action of permission.actions) {
      existing.add(action);
    }
    permissionMap.set(permission.resource, existing);
  }

  // Add inherited permissions
  if (role.inherits) {
    for (const inheritedRoleId of role.inherits) {
      const inheritedRole = allRoles.get(inheritedRoleId);
      if (inheritedRole) {
        collectPermissions(inheritedRole, allRoles, permissionMap);
      }
    }
  }
}

// ==========================================================================
// SCOPE CHECKING
// ==========================================================================

export function isInScope(
  entityType: 'risk' | 'control' | 'issue' | 'ledger',
  entityId: string,
  entity: { category?: string; type?: string },
  scopes: RoleScope[]
): boolean {
  // No scopes means full access
  if (scopes.length === 0) return true;

  for (const scope of scopes) {
    // Check entity ID scope
    switch (entityType) {
      case 'risk':
        if (scope.riskIds?.includes(entityId)) return true;
        if (scope.riskCategories?.includes(entity.category ?? '')) return true;
        break;
      case 'control':
        if (scope.controlIds?.includes(entityId)) return true;
        if (scope.controlTypes?.includes(entity.type ?? '')) return true;
        break;
      case 'issue':
        if (scope.issueIds?.includes(entityId)) return true;
        break;
      case 'ledger':
        if (scope.ledgerIds?.includes(entityId)) return true;
        break;
    }
  }

  return false;
}
