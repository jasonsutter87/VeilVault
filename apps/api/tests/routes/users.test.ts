import { describe, it, expect } from 'vitest';
import { getTestServer } from '../setup.js';

describe('User Routes', () => {
  describe('POST /api/users', () => {
    it('should create a new user', async () => {
      const server = getTestServer();

      const response = await server.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          email: 'newuser@example.com',
          name: 'New User',
          role: 'auditor',
          organizationId: 'org-123',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.email).toBe('newuser@example.com');
      expect(body.data.name).toBe('New User');
      expect(body.data.role).toBe('auditor');
      expect(body.data.status).toBe('invited');
    });

    it('should lowercase email addresses', async () => {
      const server = getTestServer();

      const response = await server.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          email: 'UPPERCASE@EXAMPLE.COM',
          name: 'Test User',
          role: 'viewer',
          organizationId: 'org-123',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.email).toBe('uppercase@example.com');
    });

    it('should create user with optional fields', async () => {
      const server = getTestServer();

      const response = await server.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          email: 'detailed@example.com',
          name: 'Detailed User',
          role: 'admin',
          organizationId: 'org-456',
          title: 'Senior Auditor',
          department: 'Internal Audit',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.title).toBe('Senior Auditor');
      expect(body.data.department).toBe('Internal Audit');
    });

    it('should reject invalid role', async () => {
      const server = getTestServer();

      const response = await server.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          email: 'invalid@example.com',
          name: 'Invalid Role User',
          role: 'superadmin',
          organizationId: 'org-123',
        },
      });

      expect(response.statusCode).toBe(500);
    });

    it('should reject invalid email', async () => {
      const server = getTestServer();

      const response = await server.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          email: 'not-an-email',
          name: 'Bad Email User',
          role: 'viewer',
          organizationId: 'org-123',
        },
      });

      expect(response.statusCode).toBe(500);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return 404 for non-existent user', async () => {
      const server = getTestServer();

      const response = await server.inject({
        method: 'GET',
        url: '/api/users/non-existent-user-id',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe(true);
      expect(body.message).toBe('User not found');
    });

    it('should return user by ID', async () => {
      const server = getTestServer();

      // Create user first
      const createResponse = await server.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          email: 'fetchable@example.com',
          name: 'Fetchable User',
          role: 'viewer',
          organizationId: 'org-789',
        },
      });

      const createBody = JSON.parse(createResponse.body);
      const userId = createBody.data.id;

      // Fetch user
      const getResponse = await server.inject({
        method: 'GET',
        url: `/api/users/${userId}`,
      });

      expect(getResponse.statusCode).toBe(200);
      const getBody = JSON.parse(getResponse.body);
      expect(getBody.data.id).toBe(userId);
      expect(getBody.data.email).toBe('fetchable@example.com');
    });
  });

  describe('POST /api/users/:id/activate', () => {
    it('should activate an invited user', async () => {
      const server = getTestServer();

      // Create user
      const createResponse = await server.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          email: 'toactivate@example.com',
          name: 'To Activate',
          role: 'auditor',
          organizationId: 'org-123',
        },
      });

      const createBody = JSON.parse(createResponse.body);
      const userId = createBody.data.id;
      expect(createBody.data.status).toBe('invited');

      // Activate
      const activateResponse = await server.inject({
        method: 'POST',
        url: `/api/users/${userId}/activate`,
      });

      expect(activateResponse.statusCode).toBe(200);
      const activateBody = JSON.parse(activateResponse.body);
      expect(activateBody.data.status).toBe('active');
    });
  });

  describe('GET /api/users/:id/permissions', () => {
    it('should return all permissions for admin', async () => {
      const server = getTestServer();

      const createResponse = await server.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'admin',
          organizationId: 'org-123',
        },
      });

      const createBody = JSON.parse(createResponse.body);
      const userId = createBody.data.id;

      const permResponse = await server.inject({
        method: 'GET',
        url: `/api/users/${userId}/permissions`,
      });

      expect(permResponse.statusCode).toBe(200);
      const permBody = JSON.parse(permResponse.body);
      expect(permBody.data.permissions).toContain('user:delete');
      expect(permBody.data.permissions).toContain('org:billing');
      expect(permBody.data.permissions).toContain('ledger:create');
    });

    it('should return limited permissions for viewer', async () => {
      const server = getTestServer();

      const createResponse = await server.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          email: 'viewer@example.com',
          name: 'Viewer User',
          role: 'viewer',
          organizationId: 'org-123',
        },
      });

      const createBody = JSON.parse(createResponse.body);
      const userId = createBody.data.id;

      const permResponse = await server.inject({
        method: 'GET',
        url: `/api/users/${userId}/permissions`,
      });

      expect(permResponse.statusCode).toBe(200);
      const permBody = JSON.parse(permResponse.body);
      expect(permBody.data.permissions).not.toContain('user:delete');
      expect(permBody.data.permissions).not.toContain('ledger:create');
      expect(permBody.data.permissions).toContain('ledger:read');
    });
  });

  describe('GET /api/users/:id/check-permission', () => {
    it('should return true for granted permission', async () => {
      const server = getTestServer();

      const createResponse = await server.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          email: 'permcheck@example.com',
          name: 'Perm Check',
          role: 'admin',
          organizationId: 'org-123',
        },
      });

      const createBody = JSON.parse(createResponse.body);
      const userId = createBody.data.id;

      const checkResponse = await server.inject({
        method: 'GET',
        url: `/api/users/${userId}/check-permission?permission=ledger:create`,
      });

      expect(checkResponse.statusCode).toBe(200);
      const checkBody = JSON.parse(checkResponse.body);
      expect(checkBody.data.granted).toBe(true);
    });

    it('should return false for denied permission', async () => {
      const server = getTestServer();

      const createResponse = await server.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          email: 'viewercheck@example.com',
          name: 'Viewer Check',
          role: 'viewer',
          organizationId: 'org-123',
        },
      });

      const createBody = JSON.parse(createResponse.body);
      const userId = createBody.data.id;

      const checkResponse = await server.inject({
        method: 'GET',
        url: `/api/users/${userId}/check-permission?permission=ledger:create`,
      });

      expect(checkResponse.statusCode).toBe(200);
      const checkBody = JSON.parse(checkResponse.body);
      expect(checkBody.data.granted).toBe(false);
    });
  });
});
