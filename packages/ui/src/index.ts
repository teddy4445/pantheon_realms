/**
 * @pr/ui — the React interface for Pantheon Realms.
 *
 * bootstrap() wires the validated content catalog, the platform adapters and
 * the AppStore, then mounts <App/>. The same code runs in the browser build and
 * the Electron renderer.
 */
import { classifyGraphics } from '@pr/presentation/core';
import { menuBackground } from './assets/manifest';
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
import './styles/gui.css';
import './styles/frontend.css';
import './styles/encounters.css';
import './styles/adventure.css';
import './styles/neutral.css';
import './styles/chronicle.css';
import './styles/battlev2.css';
import './styles/inspection.css';
import './styles/catapult.css';
import './styles/editorv2.css';
import './styles/caravans.css';
import './styles/naval.css';
import './styles/seaSites.css';
import { NEUTRAL_THEME, installGuiStyles } from './assets/guiArt';

import { createElement } from 'react';
import type { Root } from 'react-dom/client';
import { loadCatalog } from '@pr/content';
import type { PlatformServices } from '@pr/platform';
import { App } from './app/App';
import { AppStore } from './app/store';
import { applyPreferences, loadPreferences } from './app/preferences';
import { probeGraphics } from './app/graphicsProbe';
import { engineFrameStats, inspectors, preloadPresentation, projectors } from './scene/SceneHost';
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
  // 1.1.0 interface materials: frames, surfaces, button, socket and book as CSS variables (absolute URLs).
  installGuiStyles(document);
  document.documentElement.dataset.guiTheme = NEUTRAL_THEME;
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
    // When the menu is idle (the test takes up to ~0.6 s), before the first map or battle creates the renderer.
    const test = () => {
      if (store.prefs.graphicsTested) return;
      const q = classifyGraphics(probeGraphics());
      void store.setPrefs({ ...store.prefs, graphicsQuality: q, graphicsTested: true }, true);
    };
    if (typeof requestIdleCallback === 'function') requestIdleCallback(test, { timeout: 1500 });
    else setTimeout(test, 200);
  }
  // The menu is up without the renderer; fetch the 2D layer in the background for the first map or battle.
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
          busy: store.presentationBusy || store.boardLoading,
          boardLoading: store.boardLoading,
          battleScreenOpens: store.battleScreenOpens,
          prepareWar: store.prepareWar,
          humanTurn: store.session?.isHumanTurn() ?? false,
          state: store.session?.state ?? null,
          campaign: store.session?.campaign ?? null,
          // The player's planned journeys (presentation intent saved with the game).
          journeys: store.session?.presentation.journeys ?? null,
          audio: store.audio?.status() ?? null,
        }),
      );
    g.__prProject = (kind, a, b) => projectors[kind]?.(a, b) ?? null;
    // Read-only: map avatar animation state and the adventure camera.
    (g as { __prHeroes?: () => unknown }).__prHeroes = () => inspectors.adventure?.heroes() ?? null;
    (g as { __prCamera?: () => unknown }).__prCamera = () => inspectors.adventure?.camera() ?? null;
    // Read-only: where each battle stack's sprite is drawn, its facing and animation.
    (g as { __prBattle?: () => unknown }).__prBattle = () => inspectors.battle?.stacks() ?? null;
    // Read-only: how the siege is drawn (gate picture and parts, wall rows) and whether the board's pictures are in.
    (g as { __prSiege?: () => unknown }).__prSiege = () => inspectors.battle?.siege?.() ?? null;
    // Read-only: the magic effects the views played most recently (asset ID prefixes).
    (g as { __prFx?: () => unknown }).__prFx = () => ({ battle: inspectors.battle?.fx() ?? null, adventure: inspectors.adventure?.fx() ?? null });
    // Read-only: how the map draws the borders between grounds (painted, softened or crisp).
    (g as { __prGround?: () => unknown }).__prGround = () => inspectors.adventure?.ground() ?? null;
    // Read-only: how the planned route is drawn (painted markers, counts, destination cue, day parchment).
    (g as { __prRoute?: () => unknown }).__prRoute = () => inspectors.adventure?.route?.() ?? null;
    // Scouting intel: the last-known markers the map draws (stale reports only; read-only).
    (g as { __prLastKnown?: () => unknown }).__prLastKnown = () => inspectors.adventure?.lastKnown?.() ?? null;
    // Recruitment caravans: the wagons the map draws (heading, mirror, picture state, position; read-only).
    (g as { __prCaravans?: () => unknown }).__prCaravans = () => inspectors.adventure?.caravans?.() ?? null;
    // Hero ships: the hulls the map draws (heading, mirror, flag, motion, position) and the boarding board's projection (read-only).
    (g as { __prShips?: () => unknown }).__prShips = () => inspectors.adventure?.ships?.() ?? null;
    (g as { __prBoard?: () => unknown }).__prBoard = () => inspectors.battle?.board?.() ?? null;
    // Coastal sites and sea salvage: the lookouts, salvage and wrecks the map draws (picture, size, flag, fade; read-only).
    (g as { __prSeaSites?: () => unknown }).__prSeaSites = () => inspectors.adventure?.seaSites?.() ?? null;
    // Read-only: the map's nature scenery (counts per role, IDs, water bodies) and the battle's obstacle stills.
    (g as { __prScenery?: () => unknown }).__prScenery = () => ({ map: inspectors.adventure?.scenery() ?? null, battle: inspectors.battle?.obstacles?.() ?? null });
    // Read-only: the renderer's frame timing (frame rate, slow frames since the view opened).
    (g as { __prFrames?: (since?: number) => unknown }).__prFrames = (since?: number) => engineFrameStats(since);
    // Read-only and light (no copy of the state): where play stands, for tests that poll while measuring frames.
    (g as { __prScreen?: () => unknown }).__prScreen = () => ({
      screen: store.screen.id,
      overlays: store.overlays.map((o) => o.kind),
      story: store.story.length,
      busy: store.presentationBusy || store.boardLoading,
      boardLoading: store.boardLoading,
      humanTurn: store.session?.isHumanTurn() ?? false,
      day: store.session?.state.day ?? 0,
      revision: store.session?.state.revision ?? 0,
      battle: !!store.session?.state.battle,
      battlePhase: store.session?.state.battle?.phase ?? null,
    });
  }
  return store;
}
