import { beforeAll, afterAll, beforeEach } from 'vitest';
import { buildServer } from '../src/server.js';
import type { FastifyInstance } from 'fastify';

let server: FastifyInstance;

export function getTestServer() {
  return server;
}

beforeAll(async () => {
  server = await buildServer();
  await server.ready();
});

afterAll(async () => {
  await server.close();
});

beforeEach(() => {
  // Reset any test state between tests
});
