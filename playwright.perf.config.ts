/**
 * Frame-rate measurements (tests/perf), run on demand — not part of `npm run test:e2e`:
 *   npx playwright test --config playwright.perf.config.ts
 * PERF_DPR sets the device-pixel ratio (default 1), PERF_GPU=1 times the GPU per frame
 * (`?gputime`, which waits for it and so lowers the frame rate), PERF_LABEL names the report
 * written to test-results/perf/<label>.json. In this container the GPU is SwiftShader (the CPU),
 * so the numbers compare versions and layers; the owner's laptop gives the real frame rate.
 */
import { defineConfig } from '@playwright/test';

const dpr = Number(process.env.PERF_DPR ?? 1);

export default defineConfig({
  testDir: 'tests/perf',
  timeout: 600_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  outputDir: 'test-results/perf-output',
  use: {
    baseURL: 'http://localhost:4173/',
    viewport: { width: Number(process.env.PERF_W ?? 1280), height: Number(process.env.PERF_H ?? 720) },
    deviceScaleFactor: dpr,
    // PERF_CHANNEL=chromium: the full browser in its new headless mode instead of the headless shell.
    ...(process.env.PERF_CHANNEL ? { channel: process.env.PERF_CHANNEL } : {}),
    // No display rate (the game's own frame cap paces the frames). PERF_VSYNC=1 keeps headless Chrome's
    // synthetic display rate, which in software rendering here measured far slower (1.7 fps idle).
    launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', ...(process.env.PERF_VSYNC === '1' ? [] : ['--disable-gpu-vsync', '--disable-frame-rate-limit'])] },
  },
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173/',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
