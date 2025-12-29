import { test, expect } from '@playwright/test';

test.describe('API Integration', () => {
  const API_BASE = 'http://localhost:3001/api';

  test('should fetch health status from API', async ({ request }) => {
    const response = await request.get(`${API_BASE}/health`);

    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('healthy');
  });

  test('should create and fetch organization', async ({ request }) => {
    // Create organization
    const createResponse = await request.post(`${API_BASE}/organizations`, {
      data: {
        name: 'E2E Test Bank',
        type: 'regional_bank',
        contactEmail: 'e2e@testbank.com',
      },
    });

    expect(createResponse.ok()).toBe(true);
    const createBody = await createResponse.json();
    expect(createBody.data.name).toBe('E2E Test Bank');

    const orgId = createBody.data.id;

    // Fetch organization
    const fetchResponse = await request.get(`${API_BASE}/organizations/${orgId}`);
    expect(fetchResponse.ok()).toBe(true);
    const fetchBody = await fetchResponse.json();
    expect(fetchBody.data.id).toBe(orgId);
  });

  test('should create and fetch user', async ({ request }) => {
    const email = `e2e-${Date.now()}@test.com`;

    // Create user
    const createResponse = await request.post(`${API_BASE}/users`, {
      data: {
        email,
        name: 'E2E Test User',
        role: 'auditor',
        organizationId: 'org-e2e-test',
      },
    });

    expect(createResponse.ok()).toBe(true);
    const createBody = await createResponse.json();
    expect(createBody.data.email).toBe(email.toLowerCase());

    const userId = createBody.data.id;

    // Fetch user
    const fetchResponse = await request.get(`${API_BASE}/users/${userId}`);
    expect(fetchResponse.ok()).toBe(true);
  });

  test('should get available subscription tiers', async ({ request }) => {
    const response = await request.get(`${API_BASE}/organizations/tiers`);

    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body.data.length).toBe(4);

    const tierNames = body.data.map((t: { tier: string }) => t.tier);
    expect(tierNames).toContain('starter');
    expect(tierNames).toContain('enterprise');
  });

  test('should enforce rate limiting', async ({ request }) => {
    const requests = [];

    // Send many requests quickly
    for (let i = 0; i < 150; i++) {
      requests.push(request.get(`${API_BASE}/health`));
    }

    const responses = await Promise.all(requests);
    const rateLimited = responses.filter((r) => r.status() === 429);

    // Some requests should be rate limited
    expect(rateLimited.length).toBeGreaterThan(0);
  });

  test('should validate input on user creation', async ({ request }) => {
    const response = await request.post(`${API_BASE}/users`, {
      data: {
        email: 'not-an-email',
        name: 'Bad User',
        role: 'invalid_role',
        organizationId: 'org-123',
      },
    });

    expect(response.ok()).toBe(false);
  });

  test('should return 404 for non-existent resources', async ({ request }) => {
    const response = await request.get(`${API_BASE}/users/non-existent-id`);
    expect(response.status()).toBe(404);
  });
});
