// ==========================================================================
// HEALTH ROUTES
// API health check endpoints
// ==========================================================================

import type { FastifyInstance } from 'fastify';

export async function healthRoutes(fastify: FastifyInstance) {
  // Basic health check
  fastify.get('/health', async () => {
    return {
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '0.1.0',
        service: 'veilvault-api',
      },
    };
  });

  // Detailed health check
  fastify.get('/health/detailed', async () => {
    // Check connections to dependencies
    const checks = {
      api: { status: 'healthy', latency: 0 },
      // veilchain: await checkVeilChain(),
      // database: await checkDatabase(),
    };

    const allHealthy = Object.values(checks).every(
      (c) => c.status === 'healthy'
    );

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      checks,
    };
  });

  // Readiness probe (for k8s)
  fastify.get('/ready', async () => {
    return { ready: true };
  });

  // Liveness probe (for k8s)
  fastify.get('/live', async () => {
    return { alive: true };
  });
}
