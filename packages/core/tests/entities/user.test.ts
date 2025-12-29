import { describe, it, expect, beforeEach } from 'vitest';
import {
  createUser,
  activateUser,
  updateUserLogin,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getUserPermissions,
  ROLE_PERMISSIONS,
  DEFAULT_PREFERENCES,
  type User,
  type CreateUserInput,
} from '../../src/entities/user.js';

describe('User Entity', () => {
  describe('createUser', () => {
    it('should create a user with valid input', () => {
      const input: CreateUserInput = {
        email: 'test@example.com',
        name: 'Test User',
        role: 'auditor',
        organizationId: 'org-123',
      };

      const user = createUser(input);

      expect(user.id).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.name).toBe('Test User');
      expect(user.role).toBe('auditor');
      expect(user.status).toBe('invited');
      expect(user.organizationId).toBe('org-123');
    });

    it('should lowercase email addresses', () => {
      const input: CreateUserInput = {
        email: 'TEST@EXAMPLE.COM',
        name: 'Test User',
        role: 'viewer',
        organizationId: 'org-123',
      };

      const user = createUser(input);

      expect(user.email).toBe('test@example.com');
    });

    it('should set default preferences', () => {
      const input: CreateUserInput = {
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin',
        organizationId: 'org-123',
      };

      const user = createUser(input);

      expect(user.preferences).toEqual(DEFAULT_PREFERENCES);
      expect(user.preferences.emailNotifications).toBe(true);
      expect(user.preferences.theme).toBe('system');
    });

    it('should set timestamps on creation', () => {
      const beforeCreate = new Date();
      const user = createUser({
        email: 'test@example.com',
        name: 'Test',
        role: 'viewer',
        organizationId: 'org-123',
      });
      const afterCreate = new Date();

      expect(user.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(user.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
      expect(user.updatedAt.getTime()).toEqual(user.createdAt.getTime());
    });

    it('should include optional fields when provided', () => {
      const input: CreateUserInput = {
        email: 'test@example.com',
        name: 'Test User',
        role: 'auditor',
        organizationId: 'org-123',
        title: 'Senior Auditor',
        department: 'Internal Audit',
      };

      const user = createUser(input);

      expect(user.title).toBe('Senior Auditor');
      expect(user.department).toBe('Internal Audit');
    });
  });

  describe('activateUser', () => {
    it('should activate an invited user', () => {
      const user = createUser({
        email: 'test@example.com',
        name: 'Test',
        role: 'viewer',
        organizationId: 'org-123',
      });

      expect(user.status).toBe('invited');

      const activated = activateUser(user);

      expect(activated.status).toBe('active');
      expect(activated.updatedAt.getTime()).toBeGreaterThanOrEqual(user.createdAt.getTime());
    });

    it('should preserve all other fields', () => {
      const user = createUser({
        email: 'test@example.com',
        name: 'Test',
        role: 'auditor',
        organizationId: 'org-123',
      });

      const activated = activateUser(user);

      expect(activated.id).toBe(user.id);
      expect(activated.email).toBe(user.email);
      expect(activated.name).toBe(user.name);
      expect(activated.role).toBe(user.role);
    });
  });

  describe('updateUserLogin', () => {
    it('should update lastLoginAt timestamp', () => {
      const user = createUser({
        email: 'test@example.com',
        name: 'Test',
        role: 'viewer',
        organizationId: 'org-123',
      });

      expect(user.lastLoginAt).toBeUndefined();

      const loggedIn = updateUserLogin(user);

      expect(loggedIn.lastLoginAt).toBeDefined();
      expect(loggedIn.lastLoginAt instanceof Date).toBe(true);
    });
  });

  describe('Permissions', () => {
    let adminUser: User;
    let auditorUser: User;
    let viewerUser: User;
    let customerUser: User;

    beforeEach(() => {
      adminUser = createUser({ email: 'admin@test.com', name: 'Admin', role: 'admin', organizationId: 'org-1' });
      auditorUser = createUser({ email: 'auditor@test.com', name: 'Auditor', role: 'auditor', organizationId: 'org-1' });
      viewerUser = createUser({ email: 'viewer@test.com', name: 'Viewer', role: 'viewer', organizationId: 'org-1' });
      customerUser = createUser({ email: 'customer@test.com', name: 'Customer', role: 'customer', organizationId: 'org-1' });
    });

    describe('hasPermission', () => {
      it('should grant admin all permissions', () => {
        expect(hasPermission(adminUser, 'ledger:create')).toBe(true);
        expect(hasPermission(adminUser, 'ledger:delete')).toBe(true);
        expect(hasPermission(adminUser, 'user:create')).toBe(true);
        expect(hasPermission(adminUser, 'user:delete')).toBe(true);
        expect(hasPermission(adminUser, 'org:billing')).toBe(true);
        expect(hasPermission(adminUser, 'audit:revoke')).toBe(true);
      });

      it('should restrict auditor permissions appropriately', () => {
        expect(hasPermission(auditorUser, 'ledger:read')).toBe(true);
        expect(hasPermission(auditorUser, 'audit:create')).toBe(true);
        expect(hasPermission(auditorUser, 'audit:verify')).toBe(true);
        expect(hasPermission(auditorUser, 'ledger:create')).toBe(false);
        expect(hasPermission(auditorUser, 'ledger:delete')).toBe(false);
        expect(hasPermission(auditorUser, 'user:create')).toBe(false);
        expect(hasPermission(auditorUser, 'audit:revoke')).toBe(false);
      });

      it('should restrict viewer to read-only', () => {
        expect(hasPermission(viewerUser, 'ledger:read')).toBe(true);
        expect(hasPermission(viewerUser, 'transaction:read')).toBe(true);
        expect(hasPermission(viewerUser, 'audit:read')).toBe(true);
        expect(hasPermission(viewerUser, 'ledger:create')).toBe(false);
        expect(hasPermission(viewerUser, 'transaction:create')).toBe(false);
        expect(hasPermission(viewerUser, 'audit:create')).toBe(false);
        expect(hasPermission(viewerUser, 'comment:create')).toBe(false);
      });

      it('should severely restrict customer permissions', () => {
        expect(hasPermission(customerUser, 'ledger:read')).toBe(true);
        expect(hasPermission(customerUser, 'verify:execute')).toBe(true);
        expect(hasPermission(customerUser, 'transaction:create')).toBe(false);
        expect(hasPermission(customerUser, 'audit:create')).toBe(false);
        expect(hasPermission(customerUser, 'user:read')).toBe(false);
      });
    });

    describe('hasAnyPermission', () => {
      it('should return true if user has any of the permissions', () => {
        expect(hasAnyPermission(viewerUser, ['ledger:create', 'ledger:read'])).toBe(true);
        expect(hasAnyPermission(viewerUser, ['ledger:create', 'ledger:delete'])).toBe(false);
      });
    });

    describe('hasAllPermissions', () => {
      it('should return true only if user has all permissions', () => {
        expect(hasAllPermissions(adminUser, ['ledger:create', 'ledger:read', 'ledger:delete'])).toBe(true);
        expect(hasAllPermissions(viewerUser, ['ledger:read', 'ledger:create'])).toBe(false);
      });
    });

    describe('getUserPermissions', () => {
      it('should return all permissions for a role', () => {
        const adminPerms = getUserPermissions(adminUser);
        const viewerPerms = getUserPermissions(viewerUser);

        expect(adminPerms.length).toBeGreaterThan(viewerPerms.length);
        expect(adminPerms).toContain('user:delete');
        expect(viewerPerms).not.toContain('user:delete');
      });
    });

    describe('ROLE_PERMISSIONS security', () => {
      it('should not allow admin role to be modified', () => {
        const originalAdminPerms = [...ROLE_PERMISSIONS.admin];
        expect(ROLE_PERMISSIONS.admin).toEqual(originalAdminPerms);
      });

      it('should ensure viewer cannot create anything', () => {
        const viewerPerms = ROLE_PERMISSIONS.viewer;
        const createPerms = viewerPerms.filter(p => p.includes(':create'));
        expect(createPerms).toHaveLength(0);
      });

      it('should ensure viewer cannot delete anything', () => {
        const viewerPerms = ROLE_PERMISSIONS.viewer;
        const deletePerms = viewerPerms.filter(p => p.includes(':delete'));
        expect(deletePerms).toHaveLength(0);
      });

      it('should ensure customer has minimal permissions', () => {
        const customerPerms = ROLE_PERMISSIONS.customer;
        expect(customerPerms.length).toBeLessThan(10);
      });
    });
  });
});
