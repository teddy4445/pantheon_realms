import {defineConfig} from '@playwright/test';
import base from './playwright.greek-city.config';
export default defineConfig({...base,testMatch:['livingMapV2.spec.ts','sprites2d.spec.ts']});
