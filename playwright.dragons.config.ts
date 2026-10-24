import {defineConfig} from '@playwright/test';
import base from './playwright.config';
export default defineConfig({...base,testMatch:'neutralDragons.spec.ts',use:{...base.use,baseURL:'http://127.0.0.1:5173/'},webServer:{command:'node node_modules/vite/bin/vite.js apps/client --host 127.0.0.1',url:'http://127.0.0.1:5173/',reuseExistingServer:true,timeout:120000}});
