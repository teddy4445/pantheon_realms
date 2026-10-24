import { defineConfig } from '@playwright/test';
import base from './playwright.greek-city.config';
export default defineConfig({ ...base, testMatch: 'landmarks.spec.ts' });
