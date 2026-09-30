/**
 * Preferences (S17): presentation and input choices, versioned and persisted
 * separately from match saves. Never changes match rules.
 */
import type { PreferencesStore } from '@pr/platform';

export const PREFERENCES_SCHEMA_VERSION = 1;

export type AnimSpeed = 'instant' | 'fast' | 'normal';
export type BattleSpeed = '0.5' | '1' | '1.5' | '2' | 'instant';

export interface Preferences {
  readonly schemaVersion: number;
  // Gameplay presentation
  readonly adventureAnimation: AnimSpeed;
  readonly battleSpeed: BattleSpeed;
  readonly enemyMovement: AnimSpeed;
  readonly confirmEndDayWithMovement: boolean;
  readonly confirmLargePurchases: boolean;
  readonly largePurchaseThreshold: number;
  readonly combatLogDetail: 'compact' | 'standard' | 'detailed';
  readonly tutorialHints: boolean;
  readonly dismissedHints: readonly string[];
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
  readonly graphicsQuality: 'low' | 'medium' | 'high';
  // Audio (no audio assets in this build)
  readonly masterVolume: number;
  readonly musicVolume: number;
  readonly effectsVolume: number;
  readonly ambienceVolume: number;
  readonly voiceVolume: number;
  readonly muteOnFocusLoss: boolean;
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
  enemyMovement: 'fast',
  confirmEndDayWithMovement: true,
  confirmLargePurchases: true,
  largePurchaseThreshold: 2000,
  combatLogDetail: 'standard',
  tutorialHints: true,
  dismissedHints: [],
  uiScale: 1,
  textSize: 'standard',
  tooltips: true,
  tooltipDelay: 500,
  hexOverlay: 'always',
  showPreviews: true,
  mapLabels: true,
  minimap: true,
  unitLabels: 'both',
  codexAutoplay: true,
  windowMode: 'windowed',
  graphicsQuality: 'high',
  masterVolume: 80,
  musicVolume: 60,
  effectsVolume: 80,
  ambienceVolume: 60,
  voiceVolume: 80,
  muteOnFocusLoss: true,
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
  out.schemaVersion = PREFERENCES_SCHEMA_VERSION;
  out.uiScale = Math.min(1.6, Math.max(0.8, out.uiScale as number));
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
