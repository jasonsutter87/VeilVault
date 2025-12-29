// ==========================================================================
// VEILVAULT API SERVER
// Fastify-based API gateway
// ==========================================================================

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';

import { ledgerRoutes } from './routes/ledgers.js';
import { transactionRoutes } from './routes/transactions.js';
import { auditRoutes } from './routes/audits.js';
import { verifyRoutes } from './routes/verify.js';
import { healthRoutes } from './routes/health.js';
import { userRoutes } from './routes/users.js';
import { organizationRoutes } from './routes/organizations.js';
import { taskRoutes } from './routes/tasks.js';
import { commentRoutes } from './routes/comments.js';
import { notificationRoutes } from './routes/notifications.js';
import { riskRoutes } from './routes/risks.js';
import { controlRoutes } from './routes/controls.js';
import { issueRoutes } from './routes/issues.js';
import { rcmRoutes } from './routes/rcm.js';
import { alertRoutes } from './routes/alerts.js';
import { soxRoutes } from './routes/sox.js';
import { reportRoutes } from './routes/reports.js';

const envToLogger: Record<string, object | boolean> = {
  development: {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
  production: true,
  test: false,
};

const env = process.env.NODE_ENV ?? 'development';

export async function buildServer() {
  const server = Fastify({
    logger: envToLogger[env] ?? true,
  });

  // Register plugins
  await server.register(cors, {
    origin: process.env.CORS_ORIGIN ?? '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  });

  await server.register(helmet, {
    contentSecurityPolicy: false, // Disable for API
  });

  await server.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  await server.register(websocket);

  // Register routes
  await server.register(healthRoutes, { prefix: '/api' });
  await server.register(ledgerRoutes, { prefix: '/api/ledgers' });
  await server.register(transactionRoutes, { prefix: '/api/transactions' });
  await server.register(auditRoutes, { prefix: '/api/audits' });
  await server.register(verifyRoutes, { prefix: '/api/verify' });
  await server.register(userRoutes, { prefix: '/api/users' });
  await server.register(organizationRoutes, { prefix: '/api/organizations' });
  await server.register(taskRoutes, { prefix: '/api/tasks' });
  await server.register(commentRoutes, { prefix: '/api/comments' });
  await server.register(notificationRoutes, { prefix: '/api/notifications' });
  await server.register(riskRoutes, { prefix: '/api/risks' });
  await server.register(controlRoutes, { prefix: '/api/controls' });
  await server.register(issueRoutes, { prefix: '/api/issues' });
  await server.register(rcmRoutes, { prefix: '/api/rcm' });
  await server.register(alertRoutes, { prefix: '/api/alerts' });
  await server.register(soxRoutes, { prefix: '/api/sox' });
  await server.register(reportRoutes, { prefix: '/api/reports' });

  // Error handler
  server.setErrorHandler((error, _request, reply) => {
    server.log.error(error);

    reply.status(error.statusCode ?? 500).send({
      error: true,
      message: error.message,
      code: error.code ?? 'INTERNAL_ERROR',
    });
  });

  return server;
}

async function start() {
  const server = await buildServer();

  const port = parseInt(process.env.PORT ?? '3001', 10);
  const host = process.env.HOST ?? '0.0.0.0';

  try {
    await server.listen({ port, host });
    console.log(`
    ╔═══════════════════════════════════════════╗
    ║           VEILVAULT API SERVER            ║
    ╠═══════════════════════════════════════════╣
    ║  "Prove your books are clean.             ║
    ║   Mathematically."                        ║
    ╠═══════════════════════════════════════════╣
    ║  Server running on http://${host}:${port}     ║
    ╚═══════════════════════════════════════════╝
    `);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();
