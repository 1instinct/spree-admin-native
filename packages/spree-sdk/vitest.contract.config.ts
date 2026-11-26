import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['contract/**/*.contract.ts'],
    testTimeout: 60_000,
    hookTimeout: 120_000,
    fileParallelism: false,
  },
});
