import { defineConfig } from '@playwright/test';
import base from './playwright.config';
export default defineConfig({
  ...base,
  testMatch: 'restorationTemples.spec.ts',
  use: { ...base.use, baseURL: 'http://127.0.0.1:5173/' },
  webServer: { command: 'npm run dev -- --host 127.0.0.1', url: 'http://127.0.0.1:5173/', reuseExistingServer: true },
});
