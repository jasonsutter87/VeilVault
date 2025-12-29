import { describe, it, expect, beforeEach } from 'vitest';
import { getTestServer } from '../setup.js';

describe('Organization Routes', () => {
  describe('POST /api/organizations', () => {
    it('should create a new organization', async () => {
      const server = getTestServer();

      const response = await server.inject({
        method: 'POST',
        url: '/api/organizations',
        payload: {
          name: 'Test Credit Union',
          type: 'credit_union',
          contactEmail: 'test@creditunion.com',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Test Credit Union');
      expect(body.data.type).toBe('credit_union');
      expect(body.data.status).toBe('trial');
      expect(body.data.slug).toBe('test-credit-union');
    });

    it('should create organization with specified tier', async () => {
      const server = getTestServer();

      const response = await server.inject({
        method: 'POST',
        url: '/api/organizations',
        payload: {
          name: 'Enterprise Bank',
          type: 'enterprise_bank',
          tier: 'enterprise',
          contactEmail: 'test@enterprise.com',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.subscription.tier).toBe('enterprise');
      expect(body.data.subscription.maxUsers).toBe(-1);
    });

    it('should reject invalid organization type', async () => {
      const server = getTestServer();

      const response = await server.inject({
        method: 'POST',
        url: '/api/organizations',
        payload: {
          name: 'Invalid Org',
          type: 'invalid_type',
          contactEmail: 'test@test.com',
        },
      });

      expect(response.statusCode).toBe(500);
    });

    it('should reject invalid email', async () => {
      const server = getTestServer();

      const response = await server.inject({
        method: 'POST',
        url: '/api/organizations',
        payload: {
          name: 'Test Org',
          type: 'credit_union',
          contactEmail: 'not-an-email',
        },
      });

      expect(response.statusCode).toBe(500);
    });
  });

  describe('GET /api/organizations/:id', () => {
    it('should return 404 for non-existent organization', async () => {
      const server = getTestServer();

      const response = await server.inject({
        method: 'GET',
        url: '/api/organizations/non-existent-id',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe(true);
      expect(body.message).toBe('Organization not found');
    });

    it('should return organization by ID', async () => {
      const server = getTestServer();

      // First create an org
      const createResponse = await server.inject({
        method: 'POST',
        url: '/api/organizations',
        payload: {
          name: 'Fetchable Org',
          type: 'regional_bank',
          contactEmail: 'fetch@test.com',
        },
      });

      const createBody = JSON.parse(createResponse.body);
      const orgId = createBody.data.id;

      // Then fetch it
      const getResponse = await server.inject({
        method: 'GET',
        url: `/api/organizations/${orgId}`,
      });

      expect(getResponse.statusCode).toBe(200);
      const getBody = JSON.parse(getResponse.body);
      expect(getBody.data.id).toBe(orgId);
      expect(getBody.data.name).toBe('Fetchable Org');
    });
  });

  describe('POST /api/organizations/:id/activate', () => {
    it('should activate a trial organization', async () => {
      const server = getTestServer();

      // Create org
      const createResponse = await server.inject({
        method: 'POST',
        url: '/api/organizations',
        payload: {
          name: 'Activation Test',
          type: 'credit_union',
          contactEmail: 'activate@test.com',
        },
      });

      const createBody = JSON.parse(createResponse.body);
      const orgId = createBody.data.id;
      expect(createBody.data.status).toBe('trial');

      // Activate
      const activateResponse = await server.inject({
        method: 'POST',
        url: `/api/organizations/${orgId}/activate`,
      });

      expect(activateResponse.statusCode).toBe(200);
      const activateBody = JSON.parse(activateResponse.body);
      expect(activateBody.data.status).toBe('active');
    });
  });

  describe('POST /api/organizations/:id/upgrade', () => {
    it('should upgrade organization tier', async () => {
      const server = getTestServer();

      // Create starter org
      const createResponse = await server.inject({
        method: 'POST',
        url: '/api/organizations',
        payload: {
          name: 'Upgrade Test',
          type: 'regional_bank',
          tier: 'starter',
          contactEmail: 'upgrade@test.com',
        },
      });

      const createBody = JSON.parse(createResponse.body);
      const orgId = createBody.data.id;
      expect(createBody.data.subscription.tier).toBe('starter');

      // Upgrade to professional
      const upgradeResponse = await server.inject({
        method: 'POST',
        url: `/api/organizations/${orgId}/upgrade`,
        payload: { tier: 'professional' },
      });

      expect(upgradeResponse.statusCode).toBe(200);
      const upgradeBody = JSON.parse(upgradeResponse.body);
      expect(upgradeBody.data.subscription.tier).toBe('professional');
      expect(upgradeBody.data.subscription.maxUsers).toBe(25);
    });

    it('should reject invalid tier', async () => {
      const server = getTestServer();

      const createResponse = await server.inject({
        method: 'POST',
        url: '/api/organizations',
        payload: {
          name: 'Invalid Tier Test',
          type: 'credit_union',
          contactEmail: 'invalid@test.com',
        },
      });

      const createBody = JSON.parse(createResponse.body);
      const orgId = createBody.data.id;

      const upgradeResponse = await server.inject({
        method: 'POST',
        url: `/api/organizations/${orgId}/upgrade`,
        payload: { tier: 'invalid_tier' },
      });

      expect(upgradeResponse.statusCode).toBe(400);
    });
  });

  describe('GET /api/organizations/:id/features/check', () => {
    it('should check if organization has feature', async () => {
      const server = getTestServer();

      const createResponse = await server.inject({
        method: 'POST',
        url: '/api/organizations',
        payload: {
          name: 'Feature Check',
          type: 'enterprise_bank',
          tier: 'enterprise',
          contactEmail: 'features@test.com',
        },
      });

      const createBody = JSON.parse(createResponse.body);
      const orgId = createBody.data.id;

      const checkResponse = await server.inject({
        method: 'GET',
        url: `/api/organizations/${orgId}/features/check?feature=zk_proofs`,
      });

      expect(checkResponse.statusCode).toBe(200);
      const checkBody = JSON.parse(checkResponse.body);
      expect(checkBody.data.feature).toBe('zk_proofs');
      expect(checkBody.data.enabled).toBe(true);
    });

    it('should return false for disabled features', async () => {
      const server = getTestServer();

      const createResponse = await server.inject({
        method: 'POST',
        url: '/api/organizations',
        payload: {
          name: 'Starter Org',
          type: 'credit_union',
          tier: 'starter',
          contactEmail: 'starter@test.com',
        },
      });

      const createBody = JSON.parse(createResponse.body);
      const orgId = createBody.data.id;

      const checkResponse = await server.inject({
        method: 'GET',
        url: `/api/organizations/${orgId}/features/check?feature=zk_proofs`,
      });

      expect(checkResponse.statusCode).toBe(200);
      const checkBody = JSON.parse(checkResponse.body);
      expect(checkBody.data.enabled).toBe(false);
    });
  });

  describe('GET /api/organizations/tiers', () => {
    it('should return all available tiers', async () => {
      const server = getTestServer();

      const response = await server.inject({
        method: 'GET',
        url: '/api/organizations/tiers',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(4);

      const tierNames = body.data.map((t: { tier: string }) => t.tier);
      expect(tierNames).toContain('starter');
      expect(tierNames).toContain('professional');
      expect(tierNames).toContain('enterprise');
      expect(tierNames).toContain('regulator');
    });
  });
});
