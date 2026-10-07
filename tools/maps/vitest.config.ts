import { defineConfig } from 'vitest/config';

/** The skirmish-map authoring script and the fairness test run as "tests" so they share the workspace resolution (development tools only). */
export default defineConfig({
  test: {
    include: ['tools/maps/**/*.author.ts', 'tools/maps/**/*.measure.ts'],
    environment: 'node',
    testTimeout: 3_600_000,
    silent: false,
  },
});
