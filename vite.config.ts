import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/country-search/',
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    passWithNoTests: true,
    coverage: {
      include: ['src/**/*.ts'],
      exclude: ['src/main.ts'],
    },
  },
});
