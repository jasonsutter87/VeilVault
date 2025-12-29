import { describe, it, expect } from 'vitest';
import { getTestServer } from '../setup.js';

describe('Health Routes', () => {
  describe('smoke: GET /api/health', () => {
    it('smoke: should return healthy status', async () => {
      const server = getTestServer();

      const response = await server.inject({
        method: 'GET',
        url: '/api/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('healthy');
    });

    it('smoke: should include timestamp', async () => {
      const server = getTestServer();

      const response = await server.inject({
        method: 'GET',
        url: '/api/health',
      });

      const body = JSON.parse(response.body);
      expect(body.data.timestamp).toBeDefined();
    });
  });
});
