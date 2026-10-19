import { defineConfig } from 'vitest/config';

/** Naval random-map tools (seed sweeps, headless AI matches) run as "tests" for the workspace resolution (development tool only). */
export default defineConfig({
  test: {
    include: ['tools/naval-random/**/*.measure.ts'],
    environment: 'node',
    testTimeout: 3_600_000,
    silent: false,
  },
});
