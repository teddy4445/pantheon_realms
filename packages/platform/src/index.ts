/** @pr/platform — SaveRepository / PreferencesStore adapters for browser and desktop. */
export * from './contracts';
export * from './browser';
export * from './desktop';

import type { DesktopBridge, PlatformServices } from './contracts';
import { createBrowserPlatform } from './browser';
import { createDesktopPlatform } from './desktop';

/** Pick the adapter for the running host. */
export function detectPlatform(appVersion: string): PlatformServices {
  const bridge = (globalThis as { prDesktop?: DesktopBridge }).prDesktop;
  return bridge ? createDesktopPlatform(bridge) : createBrowserPlatform(appVersion);
}
