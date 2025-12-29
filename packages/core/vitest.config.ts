import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'core',
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts', 'tests/**/*.{test,spec}.ts'],
  },
});
