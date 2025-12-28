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
