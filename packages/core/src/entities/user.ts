// ==========================================================================
// USER ENTITY
// User model with role-based access control
// ==========================================================================

import { randomUUID } from '../utils/crypto.js';

export type UserRole = 'admin' | 'auditor' | 'viewer' | 'customer';
export type UserStatus = 'active' | 'invited' | 'suspended' | 'deactivated';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  organizationId: string;
  avatar?: string;
  title?: string;
  department?: string;
  phone?: string;
  timezone?: string;
  preferences: UserPreferences;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  emailNotifications: boolean;
  inAppNotifications: boolean;
  digestFrequency: 'realtime' | 'daily' | 'weekly' | 'none';
  theme: 'light' | 'dark' | 'system';
}

export interface CreateUserInput {
  email: string;
  name: string;
  role: UserRole;
  organizationId: string;
  title?: string;
  department?: string;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  emailNotifications: true,
  inAppNotifications: true,
  digestFrequency: 'realtime',
  theme: 'system',
};

export function createUser(input: CreateUserInput): User {
  const now = new Date();
  return {
    id: randomUUID(),
    email: input.email.toLowerCase(),
    name: input.name,
    role: input.role,
    status: 'invited',
    organizationId: input.organizationId,
    title: input.title,
    department: input.department,
    preferences: { ...DEFAULT_PREFERENCES },
    createdAt: now,
    updatedAt: now,
  };
}

export function activateUser(user: User): User {
  return {
    ...user,
    status: 'active',
    updatedAt: new Date(),
  };
}

export function updateUserLogin(user: User): User {
  return {
    ...user,
    lastLoginAt: new Date(),
    updatedAt: new Date(),
  };
}

// ==========================================================================
// PERMISSIONS
// ==========================================================================

export type Permission =
  // Ledger permissions
  | 'ledger:create'
  | 'ledger:read'
  | 'ledger:update'
  | 'ledger:delete'
  | 'ledger:archive'
  // Transaction permissions
  | 'transaction:create'
  | 'transaction:read'
  | 'transaction:export'
  // Audit permissions
  | 'audit:create'
  | 'audit:read'
  | 'audit:verify'
  | 'audit:export'
  | 'audit:revoke'
  // Verification permissions
  | 'verify:execute'
  | 'verify:read'
  // Report permissions
  | 'report:create'
  | 'report:read'
  | 'report:export'
  // User management permissions
  | 'user:create'
  | 'user:read'
  | 'user:update'
  | 'user:delete'
  | 'user:invite'
  // Organization permissions
  | 'org:read'
  | 'org:update'
  | 'org:billing'
  // Comment permissions
  | 'comment:create'
  | 'comment:read'
  | 'comment:update'
  | 'comment:delete'
  // Task permissions
  | 'task:create'
  | 'task:read'
  | 'task:update'
  | 'task:assign'
  | 'task:complete'
  // Settings permissions
  | 'settings:read'
  | 'settings:update';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    // All ledger permissions
    'ledger:create', 'ledger:read', 'ledger:update', 'ledger:delete', 'ledger:archive',
    // All transaction permissions
    'transaction:create', 'transaction:read', 'transaction:export',
    // All audit permissions
    'audit:create', 'audit:read', 'audit:verify', 'audit:export', 'audit:revoke',
    // All verification permissions
    'verify:execute', 'verify:read',
    // All report permissions
    'report:create', 'report:read', 'report:export',
    // All user management permissions
    'user:create', 'user:read', 'user:update', 'user:delete', 'user:invite',
    // All organization permissions
    'org:read', 'org:update', 'org:billing',
    // All comment permissions
    'comment:create', 'comment:read', 'comment:update', 'comment:delete',
    // All task permissions
    'task:create', 'task:read', 'task:update', 'task:assign', 'task:complete',
    // All settings permissions
    'settings:read', 'settings:update',
  ],
  auditor: [
    // Limited ledger permissions
    'ledger:read',
    // Transaction permissions
    'transaction:read', 'transaction:export',
    // Audit permissions (can't revoke)
    'audit:create', 'audit:read', 'audit:verify', 'audit:export',
    // Verification permissions
    'verify:execute', 'verify:read',
    // Report permissions
    'report:create', 'report:read', 'report:export',
    // Limited user permissions
    'user:read',
    // Organization permissions
    'org:read',
    // Comment permissions
    'comment:create', 'comment:read', 'comment:update',
    // Task permissions
    'task:create', 'task:read', 'task:update', 'task:complete',
    // Settings permissions
    'settings:read',
  ],
  viewer: [
    // Read-only ledger
    'ledger:read',
    // Read-only transactions
    'transaction:read',
    // Read-only audits
    'audit:read', 'audit:verify',
    // Read-only verification
    'verify:read',
    // Read-only reports
    'report:read',
    // Read-only users
    'user:read',
    // Read-only organization
    'org:read',
    // Read-only comments
    'comment:read',
    // Read-only tasks
    'task:read',
  ],
  customer: [
    // Can only read own data and verify
    'ledger:read',
    'transaction:read',
    'verify:execute', 'verify:read',
    'comment:read',
  ],
};

export function hasPermission(user: User, permission: Permission): boolean {
  return ROLE_PERMISSIONS[user.role]?.includes(permission) ?? false;
}

export function hasAnyPermission(user: User, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(user, p));
}

export function hasAllPermissions(user: User, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(user, p));
}

export function getUserPermissions(user: User): Permission[] {
  return ROLE_PERMISSIONS[user.role] ?? [];
}
