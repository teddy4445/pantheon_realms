import { defineConfig } from 'vitest/config';

/** The art briefs run as a "test" so they share the workspace resolution (development tool only). */
export default defineConfig({
  test: {
    include: ['tools/assets/briefs/**/*.measure.ts'],
    environment: 'node',
    testTimeout: 300_000,
    silent: false,
  },
});
