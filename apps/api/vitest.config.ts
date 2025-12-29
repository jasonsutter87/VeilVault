import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'api',
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts', 'tests/**/*.{test,spec}.ts'],
    setupFiles: ['./tests/setup.ts'],
  },
});
