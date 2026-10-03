/**
 * @pr/ui — the React interface for Pantheon Realms.
 *
 * bootstrap() wires the validated content catalog, the platform adapters and
 * the AppStore, then mounts <App/>. The same code runs in the browser build and
 * the Electron renderer.
 */
import { classifyGraphics, registerUnitModels } from '@pr/presentation/core';
import { fixtureUnitModels, menuBackground } from './assets/manifest';
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
import { probeGraphics } from './app/graphicsProbe';
import { inspectors, preloadPresentation, projectors } from './scene/SceneHost';
import { GameAudio } from './audio/gameAudio';

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
  // This run's opening background (random per start) also tints the menu screens behind their plates.
  const art = menuBackground();
  // Absolute URL: a relative one would resolve against the stylesheet that uses the variable.
  if (art.url) document.documentElement.style.setProperty('--app-art', `url("${new URL(art.url, document.baseURI).href}")`);
  if (error) store.toast(`Preferences could not be read: ${error}. Defaults are in use.`, 'error');
  // Sound: silent (never blocking) when the browser has no audio device.
  try {
    store.audio = new GameAudio(store);
    store.audio.attach(window);
  } catch (e) {
    store.audio = null;
    console.warn('[audio] disabled:', e);
  }
  root.render(createElement(App, { store }));
  void store.refreshContinue();
  // First start of this version: a quick graphics test picks Low, Medium or High
  // (changeable in Settings). Skipped in UI-test mode so test runs stay reproducible.
  const e2e = typeof location !== 'undefined' && new URLSearchParams(location.search).has('e2e');
  if (!prefs.graphicsTested && !e2e) {
    // When the menu is idle (the test takes up to ~0.6 s), before any 3D screen creates the engine.
    const test = () => {
      if (store.prefs.graphicsTested) return;
      const q = classifyGraphics(probeGraphics());
      void store.setPrefs({ ...store.prefs, graphicsQuality: q, graphicsTested: true }, true);
    };
    if (typeof requestIdleCallback === 'function') requestIdleCallback(test, { timeout: 1500 });
    else setTimeout(test, 200);
  }
  // The menu is up without the 3D engine; fetch it in the background for the first 3D screen.
  preloadPresentation();
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
          story: store.story.map((x) => x.key),
          moments: store.moments.map((m) => ({ ...m })),
          hints: [...store.hints],
          busy: store.presentationBusy,
          battleScreenOpens: store.battleScreenOpens,
          prepareWar: store.prepareWar,
          humanTurn: store.session?.isHumanTurn() ?? false,
          state: store.session?.state ?? null,
          campaign: store.session?.campaign ?? null,
          audio: store.audio?.status() ?? null,
        }),
      );
    g.__prProject = (kind, a, b) => projectors[kind]?.(a, b) ?? null;
    // Read-only: mounted-hero animation state and the adventure camera pose.
    (g as { __prHeroes?: () => unknown }).__prHeroes = () => inspectors.adventure?.heroes() ?? null;
    (g as { __prCamera?: () => unknown }).__prCamera = () => inspectors.adventure?.camera() ?? null;
    // Presentation-only test fixture: show the axis/scale calibration GLB in place of the
    // Hoplite so the model pipeline can be checked in a real browser. No game state changes.
    if (new URLSearchParams(location.search).get('e2e') === 'calibration') {
      registerUnitModels(fixtureUnitModels().map((e) => ({ ...e, manifest: { ...e.manifest, creatureId: 'hoplite' } })));
    }
  }
  return store;
}
