import { defineConfig } from '@playwright/test';
import base from './playwright.restoration.config';
export default defineConfig({...base,testMatch:'worldPolish.spec.ts'});
