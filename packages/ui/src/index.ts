/**
 * @pr/ui — the React interface for Pantheon Realms.
 *
 * bootstrap() wires the validated content catalog, the platform adapters and
 * the AppStore, then mounts <App/>. The same code runs in the browser build and
 * the Electron renderer.
 */
import { registerUnitModels } from '@pr/presentation';
import { fixtureUnitModels } from './assets/manifest';
import '@fontsource/cinzel/500.css';
import '@fontsource/cinzel/600.css';
import '@fontsource/cinzel/700.css';
import '@fontsource/eb-garamond/400.css';
import '@fontsource/eb-garamond/500.css';
import '@fontsource/eb-garamond/400-italic.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/screens.css';

import { createElement } from 'react';
import type { Root } from 'react-dom/client';
import { loadCatalog } from '@pr/content';
import type { PlatformServices } from '@pr/platform';
import { App } from './app/App';
import { AppStore } from './app/store';
import { applyPreferences, loadPreferences } from './app/preferences';
import { projectors } from './scene/SceneHost';

export { AppStore } from './app/store';

export async function bootstrap(root: Root, platform: PlatformServices): Promise<AppStore> {
  let catalog;
  try {
    catalog = loadCatalog();
  } catch (e) {
    root.render(createElement('pre', { style: { color: '#f2c3b8', padding: '2rem', whiteSpace: 'pre-wrap' } }, `Content validation failed.\n\n${e instanceof Error ? e.message : String(e)}`));
    throw e;
  }
  const store = new AppStore(catalog, platform);
  const { prefs, error } = await loadPreferences(platform.preferences);
  store.prefs = prefs;
  applyPreferences(prefs);
  if (error) store.toast(`Preferences could not be read: ${error}. Defaults are in use.`, 'error');
  root.render(createElement(App, { store }));
  void store.refreshContinue();
  // Automated UI tests may read (never write) a deep copy of the state and
  // project map coordinates to the page when explicitly requested. No command
  // or state mutation is exposed.
  if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('e2e')) {
    const g = globalThis as { __prInspect?: () => unknown; __prProject?: (kind: 'adventure' | 'battle', a: number, b: number) => { x: number; y: number } | null };
    g.__prInspect = () =>
      JSON.parse(
        JSON.stringify({
          screen: store.screen.id,
          overlays: store.overlays.map((o) => o.kind),
          busy: store.presentationBusy,
          humanTurn: store.session?.isHumanTurn() ?? false,
          state: store.session?.state ?? null,
          campaign: store.session?.campaign ?? null,
        }),
      );
    g.__prProject = (kind, a, b) => projectors[kind]?.(a, b) ?? null;
    // Presentation-only test fixture: show the axis/scale calibration GLB in place of the
    // Hoplite so the model pipeline can be checked in a real browser. No game state changes.
    if (new URLSearchParams(location.search).get('e2e') === 'calibration') {
      registerUnitModels(fixtureUnitModels().map((e) => ({ ...e, manifest: { ...e.manifest, creatureId: 'hoplite' } })));
    }
  }
  return store;
}
