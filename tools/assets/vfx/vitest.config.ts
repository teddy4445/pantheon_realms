import { defineConfig } from 'vitest/config';

/** The VFX list runs as a "test" so it shares the workspace resolution (development tool only). */
export default defineConfig({
  test: {
    include: ['tools/assets/vfx/**/*.measure.ts'],
    environment: 'node',
    testTimeout: 300_000,
    silent: false,
  },
});
