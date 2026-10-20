/**
 * Preferences (S17): presentation and input choices, versioned and persisted
 * separately from match saves. Never changes match rules.
 */
import type { PreferencesStore } from '@pr/platform';
import { setAdaptiveResolution, setGraphicsQuality } from '@pr/presentation/core';
import { applyInterfaceCursors } from '../assets/cursors';

export const PREFERENCES_SCHEMA_VERSION = 5;

export type AnimSpeed = 'instant' | 'fast' | 'normal';
export type BattleSpeed = '0.5' | '1' | '1.5' | '2' | 'instant';

export interface Preferences {
  readonly schemaVersion: number;
  // Gameplay presentation
  readonly adventureAnimation: AnimSpeed;
  readonly battleSpeed: BattleSpeed;
  readonly enemyMovement: AnimSpeed;
  readonly confirmEndDayWithMovement: boolean;
  readonly combatLogDetail: 'compact' | 'standard' | 'detailed';
  readonly tutorialHints: boolean;
  readonly dismissedHints: readonly string[];
  /** Rebound keyboard shortcuts as "action=key" (only those that differ from the defaults; see app/keys.ts). */
  readonly keyBindings: readonly string[];
  // Interface
  readonly uiScale: number;
  readonly textSize: 'standard' | 'large' | 'xlarge';
  readonly tooltips: boolean;
  readonly tooltipDelay: number;
  readonly hexOverlay: 'always' | 'hover' | 'off';
  readonly showPreviews: boolean;
  readonly mapLabels: boolean;
  readonly minimap: boolean;
  readonly unitLabels: 'count' | 'health' | 'both';
  readonly codexAutoplay: boolean;
  // Display
  readonly windowMode: 'windowed' | 'fullscreen';
  /** Low / Medium / High preset (`@pr/presentation/core` graphics.ts). */
  readonly graphicsQuality: 'low' | 'medium' | 'high';
  /** The quick graphics test has picked the preset once (first start); Settings can run it again. */
  readonly graphicsTested: boolean;
  /** Context mouse cursors (the game's own; off: the system pointer). */
  readonly gameCursors: boolean;
  /** A small frame-rate readout over the map and battle (frames per second, slow frames). */
  readonly showFrameRate: boolean;
  /** Draw fewer pixels while frames run slow (graphics.ts `adaptiveResolution`). */
  readonly adaptiveResolution: boolean;
  // Audio (temporary generated sounds in this build; production/04 §7 buses)
  readonly masterVolume: number;
  readonly musicVolume: number;
  readonly ambienceVolume: number;
  readonly interfaceVolume: number;
  readonly combatVolume: number;
  readonly voiceVolume: number;
  /** Mute everything; the volumes above are kept (settings §4). */
  readonly muteAll: boolean;
  readonly muteOnFocusLoss: boolean;
  /** "Calmer sound": softer thunder, crashes and stingers; fewer overlapping copies. */
  readonly calmerSound: boolean;
  // Accessibility
  readonly motion: 'system' | 'reduced' | 'full';
  readonly cameraShake: boolean;
  readonly screenFlashes: 'reduced' | 'standard';
  readonly highContrast: boolean;
  readonly colorIndependentOwnership: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  schemaVersion: PREFERENCES_SCHEMA_VERSION,
  adventureAnimation: 'normal',
  battleSpeed: '1',
  enemyMovement: 'normal',
  confirmEndDayWithMovement: true,
  combatLogDetail: 'standard',
  tutorialHints: true,
  dismissedHints: [],
  keyBindings: [],
  uiScale: 1,
  textSize: 'standard',
  tooltips: true,
  tooltipDelay: 500,
  hexOverlay: 'hover',
  showPreviews: true,
  mapLabels: true,
  minimap: true,
  // 1.1.0 (concept 08): counts stay on the board; health shows on the hovered and the active stack.
  unitLabels: 'count',
  codexAutoplay: true,
  windowMode: 'windowed',
  graphicsQuality: 'high',
  graphicsTested: false,
  gameCursors: true,
  showFrameRate: false,
  adaptiveResolution: true,
  masterVolume: 80,
  musicVolume: 60,
  ambienceVolume: 60,
  interfaceVolume: 80,
  combatVolume: 80,
  voiceVolume: 80,
  muteAll: false,
  muteOnFocusLoss: true,
  calmerSound: false,
  motion: 'system',
  cameraShake: false,
  screenFlashes: 'reduced',
  highContrast: false,
  colorIndependentOwnership: true,
};

/** Non-destructive migration: unknown or invalid values fall back to defaults. */
export function sanitizePreferences(raw: unknown): Preferences {
  if (!raw || typeof raw !== 'object') return DEFAULT_PREFERENCES;
  const r = raw as Record<string, unknown>;
  const out: Record<string, unknown> = { ...DEFAULT_PREFERENCES };
  for (const key of Object.keys(DEFAULT_PREFERENCES) as (keyof Preferences)[]) {
    const def = DEFAULT_PREFERENCES[key];
    const v = r[key];
    if (v === undefined) continue;
    if (typeof def === 'number' && typeof v === 'number' && Number.isFinite(v)) out[key] = v;
    else if (typeof def === 'boolean' && typeof v === 'boolean') out[key] = v;
    else if (typeof def === 'string' && typeof v === 'string') out[key] = v;
    else if (Array.isArray(def) && Array.isArray(v)) out[key] = v.filter((x) => typeof x === 'string');
  }
  // Schema 1 had one "Effects" volume; it now feeds both the interface and combat buses.
  if (typeof r.effectsVolume === 'number' && Number.isFinite(r.effectsVolume)) {
    if (r.interfaceVolume === undefined) out.interfaceVolume = r.effectsVolume;
    if (r.combatVolume === undefined) out.combatVolume = r.effectsVolume;
  }
  for (const k of ['masterVolume', 'musicVolume', 'ambienceVolume', 'interfaceVolume', 'combatVolume', 'voiceVolume'] as const) out[k] = Math.min(100, Math.max(0, out[k] as number));
  // Schema 3 (owner request 2026-10-04): no lines between map tiles — the outline follows the pointer.
  if ((typeof r.schemaVersion === 'number' ? r.schemaVersion : 0) < 3 && out.hexOverlay === 'always') out.hexOverlay = 'hover';
  // Schema 4 (1.1.0 battle interface, concept 08): the old default "Count and health" becomes "Count" once
  // (health on hover and for the active stack); "Count and health" stays available as the persistent option.
  if ((typeof r.schemaVersion === 'number' ? r.schemaVersion : 0) < 4 && out.unitLabels === 'both') out.unitLabels = 'count';
  if ((typeof r.schemaVersion === 'number' ? r.schemaVersion : 0) < 5) out.enemyMovement = 'normal';
  out.schemaVersion = PREFERENCES_SCHEMA_VERSION;
  out.uiScale = Math.min(1.6, Math.max(0.8, out.uiScale as number));
  if (!['low', 'medium', 'high'].includes(out.graphicsQuality as string)) out.graphicsQuality = DEFAULT_PREFERENCES.graphicsQuality;
  return out as unknown as Preferences;
}

export function reducedMotion(p: Preferences): boolean {
  if (p.motion === 'reduced') return true;
  if (p.motion === 'full') return false;
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

/** Apply presentation preferences to the document (CSS variables and data attributes). */
export function applyPreferences(p: Preferences): void {
  const root = document.documentElement;
  root.style.setProperty('--ui-scale', String(p.uiScale));
  root.style.setProperty('--text-scale', p.textSize === 'xlarge' ? '1.3' : p.textSize === 'large' ? '1.15' : '1');
  root.dataset.motion = p.motion;
  root.dataset.contrast = p.highContrast ? 'high' : 'normal';
  applyInterfaceCursors(p.gameCursors);
  setGraphicsQuality(p.graphicsQuality);
  setAdaptiveResolution(p.adaptiveResolution);
}

export async function loadPreferences(store: PreferencesStore): Promise<{ prefs: Preferences; error: string | null }> {
  try {
    const text = await store.load();
    return { prefs: text ? sanitizePreferences(JSON.parse(text)) : DEFAULT_PREFERENCES, error: null };
  } catch (e) {
    return { prefs: DEFAULT_PREFERENCES, error: e instanceof Error ? e.message : 'Could not read preferences' };
  }
}

export async function savePreferences(store: PreferencesStore, p: Preferences): Promise<string | null> {
  try {
    await store.save(JSON.stringify(p));
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : 'Could not save preferences';
  }
}

/** Presentation delay multiplier (ms per nominal second) for battle playback. */
export function battlePlaybackFactor(p: Preferences): number {
  if (p.battleSpeed === 'instant' || reducedMotion(p)) return 0;
  return 1 / Number(p.battleSpeed);
}

export function adventurePlaybackFactor(p: Preferences, enemy = false): number {
  const s = enemy ? p.enemyMovement : p.adventureAnimation;
  if (s === 'instant' || reducedMotion(p)) return 0;
  return s === 'fast' ? 0.45 : 1;
}
