/**
 * Client entry: detects the host platform (browser or Electron preload bridge)
 * and mounts the shared application.
 */
import { createRoot } from 'react-dom/client';
import { detectPlatform } from '@pr/platform';
import { bootstrap } from '@pr/ui';

declare const __APP_VERSION__: string;

const platform = detectPlatform(__APP_VERSION__);
const root = createRoot(document.getElementById('root')!);
bootstrap(root, platform);
