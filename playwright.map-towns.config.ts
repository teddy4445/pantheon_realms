import { defineConfig } from '@playwright/test';
import base from './playwright.greek-city.config';
export default defineConfig({ ...base, testMatch: 'mapTownArt.spec.ts' });
