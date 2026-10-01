/**
 * Keyboard shortcuts: the list of bindable actions, their default keys, and
 * the player's rebinding (stored in Preferences as "action=key" strings).
 *
 * Presentation/input only — a key press still goes through the same buttons
 * and commands as a click. Escape (pause/back/cancel), F1 (this help) and the
 * arrow keys (camera) are fixed so the player can never lock themselves out.
 */
import type { Preferences } from './preferences';

export type KeyContext = 'map' | 'adventure' | 'battle';

export interface KeyAction {
  readonly id: string;
  readonly label: string;
  readonly context: KeyContext;
  readonly defaultKey: string;
}

/** `map` = adventure-map screen navigation; `adventure` = adventure-map play; `battle` = tactical battle. */
export const KEY_ACTIONS: readonly KeyAction[] = [
  { id: 'open_hero', label: 'Hero screen', context: 'map', defaultKey: 'h' },
  { id: 'open_town', label: 'Town screen', context: 'map', defaultKey: 't' },
  { id: 'open_journal', label: 'Journal', context: 'map', defaultKey: 'j' },
  { id: 'open_overview', label: 'Kingdom overview', context: 'map', defaultKey: 'o' },
  { id: 'open_encyclopedia', label: 'Encyclopedia', context: 'map', defaultKey: 'b' },
  { id: 'open_pantheon', label: 'Pantheon screen', context: 'map', defaultKey: 'p' },
  { id: 'shortcuts', label: 'Keyboard shortcuts (this list)', context: 'map', defaultKey: '?' },
  { id: 'end_day', label: 'End day', context: 'adventure', defaultKey: 'Enter' },
  { id: 'continue_move', label: 'Continue along the planned route', context: 'adventure', defaultKey: 'Space' },
  { id: 'next_hero', label: 'Next hero', context: 'adventure', defaultKey: 'Tab' },
  { id: 'center_hero', label: 'Center on selected hero', context: 'adventure', defaultKey: 'Home' },
  { id: 'pan_left', label: 'Pan camera left (also ←)', context: 'adventure', defaultKey: 'a' },
  { id: 'pan_right', label: 'Pan camera right (also →)', context: 'adventure', defaultKey: 'd' },
  { id: 'pan_up', label: 'Pan camera up (also ↑)', context: 'adventure', defaultKey: 'w' },
  { id: 'pan_down', label: 'Pan camera down (also ↓)', context: 'adventure', defaultKey: 's' },
  { id: 'zoom_in', label: 'Zoom in', context: 'adventure', defaultKey: '+' },
  { id: 'zoom_out', label: 'Zoom out', context: 'adventure', defaultKey: '-' },
  { id: 'interventions', label: 'Divine interventions', context: 'adventure', defaultKey: 'i' },
  { id: 'battle_wait', label: 'Wait', context: 'battle', defaultKey: 'w' },
  { id: 'battle_defend', label: 'Defend', context: 'battle', defaultKey: 'd' },
  { id: 'battle_spell', label: 'Cast a spell', context: 'battle', defaultKey: 's' },
  { id: 'battle_skip', label: 'Skip the current animation', context: 'battle', defaultKey: 'Space' },
  { id: 'battle_auto', label: 'Toggle auto-combat', context: 'battle', defaultKey: 'q' },
  { id: 'battle_log', label: 'Show or hide the combat log', context: 'battle', defaultKey: 'l' },
];

export const FIXED_KEYS: readonly { keys: string; label: string }[] = [
  { keys: 'Esc', label: 'Pause menu · back · cancel targeting' },
  { keys: 'F1', label: 'Keyboard shortcuts' },
  { keys: '← → ↑ ↓', label: 'Pan the adventure camera' },
  { keys: 'Mouse wheel', label: 'Zoom' },
  { keys: 'Right-click', label: 'Inspect a tile or creature' },
];

export const CONTEXT_LABEL: Record<KeyContext, string> = { map: 'Adventure map — screens', adventure: 'Adventure map — play', battle: 'Battle' };

const RESERVED = new Set(['Escape', 'F1', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);

/** Normalize a KeyboardEvent key to the stored form ('h', 'Enter', 'Space', 'F2'…). */
export function normalizeKey(key: string): string {
  if (key === ' ' || key === 'Spacebar') return 'Space';
  if (key === '=') return '+';
  if (key === '_') return '-';
  return key.length === 1 ? key.toLowerCase() : key;
}

export function isReservedKey(key: string): boolean {
  return RESERVED.has(key) || key === 'Shift' || key === 'Control' || key === 'Alt' || key === 'Meta' || key === 'Dead' || key === 'Unidentified';
}

export function keyLabel(key: string | null | undefined): string {
  if (!key) return '—';
  if (key.length === 1) return key.toUpperCase();
  return key;
}

/** Contexts that are active at the same time and so may not share a key. */
function overlaps(a: KeyContext, b: KeyContext): boolean {
  if (a === b) return true;
  return (a === 'map' && b === 'adventure') || (a === 'adventure' && b === 'map');
}

export function bindingMap(prefs: Preferences): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const a of KEY_ACTIONS) out[a.id] = a.defaultKey;
  for (const entry of prefs.keyBindings ?? []) {
    const i = entry.indexOf('=');
    if (i <= 0) continue;
    const id = entry.slice(0, i);
    const key = entry.slice(i + 1);
    if (!(id in out)) continue;
    out[id] = key === '' ? null : key;
  }
  return out;
}

export function keyFor(prefs: Preferences, actionId: string): string | null {
  return bindingMap(prefs)[actionId] ?? null;
}

/** True when this keyboard event (already normalized) triggers the action. */
export function matches(prefs: Preferences, actionId: string, eventKey: string): boolean {
  const k = keyFor(prefs, actionId);
  return !!k && k === normalizeKey(eventKey);
}

export interface RebindResult {
  readonly bindings: readonly string[];
  /** The action that lost this key, if any. */
  readonly displaced: KeyAction | null;
}

/** Bind `key` to `actionId`; an overlapping action that used the key becomes unbound. */
export function rebind(prefs: Preferences, actionId: string, key: string): RebindResult {
  const map = bindingMap(prefs);
  const action = KEY_ACTIONS.find((a) => a.id === actionId);
  let displaced: KeyAction | null = null;
  if (action) {
    for (const other of KEY_ACTIONS) {
      if (other.id === actionId || !overlaps(other.context, action.context)) continue;
      if (map[other.id] === key) {
        map[other.id] = null;
        displaced = other;
      }
    }
    map[actionId] = key;
  }
  return { bindings: serialize(map), displaced };
}

export function serialize(map: Record<string, string | null>): string[] {
  const out: string[] = [];
  for (const a of KEY_ACTIONS) {
    const k = map[a.id] ?? null;
    if (k !== a.defaultKey) out.push(`${a.id}=${k ?? ''}`);
  }
  return out;
}
