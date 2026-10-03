/**
 * Context mouse cursors (GPT6_BRIEF_7_CURSORS.md). Every cursor is named by its
 * asset ID. Delivered art (`npm run cursors:import` → assets-runtime/ui/cursors/)
 * takes precedence; until then the game uses stand-ins: the system cursor where
 * one says the same thing (arrow, hand, grab, wait, not-allowed), and a small
 * drawn glyph for the game-specific ones. Presentation only.
 */
import cursorManifest from '../../../../assets-runtime/ui/cursors/manifest.json';

export type CursorId =
  | 'cursor.ui.default'
  | 'cursor.ui.pointer'
  | 'cursor.ui.grab'
  | 'cursor.ui.grabbing'
  | 'cursor.ui.busy'
  | 'cursor.blocked'
  | 'cursor.map.hero'
  | 'cursor.map.town'
  | 'cursor.map.move'
  | 'cursor.map.move_later'
  | 'cursor.map.attack'
  | 'cursor.map.siege'
  | 'cursor.map.visit'
  | 'cursor.map.meet'
  | 'cursor.map.portal'
  | 'cursor.battle.move'
  | 'cursor.battle.fly'
  | 'cursor.battle.melee'
  | 'cursor.battle.shoot'
  | 'cursor.battle.shoot_weak'
  | 'cursor.battle.structure'
  | 'cursor.battle.ability'
  | 'cursor.battle.info'
  | 'cursor.spell';

/** The 24 cursor IDs of the brief, in its order. */
export const CURSOR_IDS: readonly CursorId[] = [
  'cursor.ui.default',
  'cursor.ui.pointer',
  'cursor.ui.grab',
  'cursor.ui.grabbing',
  'cursor.ui.busy',
  'cursor.blocked',
  'cursor.map.hero',
  'cursor.map.town',
  'cursor.map.move',
  'cursor.map.move_later',
  'cursor.map.attack',
  'cursor.map.siege',
  'cursor.map.visit',
  'cursor.map.meet',
  'cursor.map.portal',
  'cursor.battle.move',
  'cursor.battle.fly',
  'cursor.battle.melee',
  'cursor.battle.shoot',
  'cursor.battle.shoot_weak',
  'cursor.battle.structure',
  'cursor.battle.ability',
  'cursor.battle.info',
  'cursor.spell',
];

/** The six sides a melee strike can come from (the sword's angle on screen, degrees clockwise from "points right"). */
export const MELEE_ANGLES = [0, 60, 120, 180, 240, 300] as const;
export type MeleeAngle = (typeof MELEE_ANGLES)[number];

interface DeliveredCursor {
  /** 1x raster (32 px for most cursors; the turned swords are larger so the blade is not clipped). */
  readonly file: string;
  /** 2x raster for high-density screens (Chromium picks it through image-set). */
  readonly file2x?: string;
  readonly size?: readonly [number, number];
  /** Hotspot in 1x CSS pixels. */
  readonly hotspot: readonly [number, number];
}
const DELIVERED = (cursorManifest as unknown as { assets: Record<string, DeliveredCursor> }).assets;

/** System cursors that already say what the game means. */
const SYSTEM: Partial<Record<CursorId, string>> = {
  'cursor.ui.default': 'default',
  'cursor.ui.pointer': 'pointer',
  'cursor.ui.grab': 'grab',
  'cursor.ui.grabbing': 'grabbing',
  'cursor.ui.busy': 'progress',
  'cursor.blocked': 'not-allowed',
};

const GOLD = '#f0cf7a';
const INK = '#1b1206';
const RED = '#b3262b';
const line = (d: string, w = 3, color = GOLD) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w + 3}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const shape = (d: string, fill = GOLD) => `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>`;
const SWORD = shape('M8 14.4H26.5L30.5 16L26.5 17.6H8Z') + shape('M6.5 10H9.5V22H6.5Z', RED) + shape('M1.5 14.8H6.5V17.2H1.5Z', '#7a5a26');
const HOURGLASS_BADGE = shape('M21 20H30L25.5 25L30 30H21L25.5 25Z', GOLD);

/** Drawn stand-ins (32 × 32) and their hotspots, for cursors with no system equivalent. */
const STANDIN: Partial<Record<CursorId, { svg: string; hot: readonly [number, number] }>> = {
  'cursor.map.hero': { svg: shape('M7 19C7 9 25 9 25 19V26H20V20H12V26H7Z') + line('M9 10C13 3 22 3 26 8', 2.5, RED), hot: [16, 16] },
  'cursor.map.town': { svg: shape('M4 28V11L7.5 7.5L11 11V14H21V11L24.5 7.5L28 11V28H19.5V22A3.5 3.5 0 0 0 12.5 22V28Z'), hot: [16, 16] },
  'cursor.map.move': { svg: shape('M9 5C2 14 5 28 16 28C27 28 30 14 23 5L18.5 6.5C23 14 21 23.5 16 23.5C11 23.5 9 14 13.5 6.5Z'), hot: [16, 16] },
  'cursor.map.move_later': { svg: shape('M9 5C2 14 5 28 16 28C27 28 30 14 23 5L18.5 6.5C23 14 21 23.5 16 23.5C11 23.5 9 14 13.5 6.5Z', '#9aa3ad') + HOURGLASS_BADGE, hot: [16, 16] },
  'cursor.map.attack': { svg: line('M6 6L24 24M26 6L8 24', 3) + line('M18 25L25 18M14 25L7 18', 2.5, RED), hot: [16, 16] },
  'cursor.map.siege': { svg: shape('M9 29V12H7V6H10.5V8.5H14V6H18V8.5H21.5V6H25V12H23V29Z') + line('M5 27L27 5', 2.5, RED), hot: [16, 16] },
  'cursor.map.visit': { svg: line('M9 29V4', 2.5) + shape('M10.5 5H26L21.5 10.5L26 16H10.5Z', RED), hot: [16, 16] },
  'cursor.map.meet': { svg: shape('M4 9H19V4.5L28 11L19 17.5V13H4Z') + shape('M28 19H13V14.5L4 21L13 27.5V23H28Z'), hot: [16, 16] },
  'cursor.map.portal': { svg: `<circle cx="16" cy="16" r="11" fill="none" stroke="${INK}" stroke-width="7"/><circle cx="16" cy="16" r="11" fill="none" stroke="#a78bfa" stroke-width="4"/>` + line('M16 9A7 7 0 1 1 9.5 18', 2, GOLD), hot: [16, 16] },
  'cursor.spell': { svg: shape('M16 1.5L19.2 12.8L30.5 16L19.2 19.2L16 30.5L12.8 19.2L1.5 16L12.8 12.8Z', '#b8c4ff'), hot: [16, 16] },
  'cursor.battle.move': { svg: shape('M10 3H18.5V18L27.5 21.5V28H8.5Z', '#c79a5a'), hot: [16, 16] },
  'cursor.battle.fly': { svg: shape('M3 23C9 8 21 3 29.5 4C25.5 8.5 24.5 11.5 20.5 13.5C24.5 13.5 26.5 15 27.5 17C22.5 19 18.5 20 14.5 20C16.5 22 17.5 24.5 17.5 28C12 27 7.5 25 3 23Z', '#f4f1e8'), hot: [16, 16] },
  'cursor.battle.shoot': { svg: line('M8 5C21 5 27 11 27 24', 2.5, '#c79a5a') + line('M4 28L25 7', 2) + shape('M27 5L19.5 6L26 12.5Z'), hot: [16, 16] },
  'cursor.battle.shoot_weak': { svg: line('M4 28L13 19', 2, '#9aa3ad') + line('M17 15L25 7', 2, '#9aa3ad') + shape('M27 5L19.5 6L26 12.5Z', '#9aa3ad'), hot: [16, 16] },
  'cursor.battle.structure': { svg: shape('M3 9H29V27H3Z', '#a39a8c') + line('M3 15H29M3 21H29M11 9V15M21 9V15M7 15V21M16 15V21M25 15V21M11 21V27M21 21V27', 1.2, '#5c5448') + line('M15 9L18 15L14 20L17 27', 2, RED), hot: [16, 16] },
  'cursor.battle.ability': { svg: `<circle cx="16" cy="16" r="14" fill="#1d3557" stroke="${INK}" stroke-width="2"/>` + shape(starPath(8, 12.5, 5.5)), hot: [16, 16] },
  'cursor.battle.info': { svg: `<circle cx="13" cy="13" r="9" fill="#1d3557" fill-opacity="0.35" stroke="${INK}" stroke-width="6"/><circle cx="13" cy="13" r="9" fill="none" stroke="${GOLD}" stroke-width="3"/>` + line('M20 20L28 28', 3.5), hot: [13, 13] },
};

function starPath(points: number, outer: number, inner: number): string {
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? inner : outer;
    const a = (Math.PI * i) / points - Math.PI / 2;
    pts.push(`${(16 + r * Math.cos(a)).toFixed(1)} ${(16 + r * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join('L')}Z`;
}

const svgUrl = (svg: string) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">${svg}</svg>`)}")`;

function meleeStandin(angle: number): string {
  const a = (angle * Math.PI) / 180;
  const hx = Math.round(Math.min(31, Math.max(0, 16 + 14.5 * Math.cos(a))));
  const hy = Math.round(Math.min(31, Math.max(0, 16 + 14.5 * Math.sin(a))));
  return `${svgUrl(`<g transform="rotate(${angle} 16 16)">${SWORD}</g>`)} ${hx} ${hy}, crosshair`;
}

/** Nearest of the six sword angles for a strike direction on screen (dx right, dy down). */
export function meleeAngle(dx: number, dy: number): MeleeAngle {
  const deg = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
  return MELEE_ANGLES[Math.round(deg / 60) % 6]!;
}

/**
 * The CSS `cursor` value for a cursor ID: the delivered art when present, else
 * the stand-in. `enabled: false` (Settings → Game cursors off) gives the plain
 * system cursor for the same meaning.
 */
export function cursorCss(id: CursorId, opts: { angle?: number; enabled?: boolean } = {}): string {
  const enabled = opts.enabled ?? true;
  const plain = SYSTEM[id] ?? (id === 'cursor.battle.info' ? 'help' : id.startsWith('cursor.battle.') || id === 'cursor.spell' ? 'crosshair' : 'pointer');
  if (!enabled) return plain;
  const key = id === 'cursor.battle.melee' ? `${id}@${opts.angle ?? 0}` : id;
  const art = DELIVERED[key];
  if (art) {
    const one = `url("${runtimeUrl(art.file)}")`;
    const img = art.file2x ? `image-set(${one} 1x, url("${runtimeUrl(art.file2x)}") 2x)` : one;
    return `${img} ${art.hotspot[0]} ${art.hotspot[1]}, ${plain}`;
  }
  if (id === 'cursor.battle.melee') return meleeStandin(opts.angle ?? 0);
  const s = STANDIN[id];
  return s ? `${svgUrl(s.svg)} ${s.hot[0]} ${s.hot[1]}, ${plain}` : plain;
}

/**
 * Absolute URL of a runtime file: cursor values also go into CSS variables, and a
 * relative URL there would resolve against whichever stylesheet uses the variable.
 */
function runtimeUrl(file: string): string {
  try {
    if (typeof document !== 'undefined' && document.baseURI) return new URL(`./${file}`, document.baseURI).href;
  } catch {
    /* fall through */
  }
  return `./${file}`;
}

let preloaded = false;
/** Fetch the delivered cursor images once, so a cursor change never shows a blank frame (the system cursor shows until then). */
function preloadCursors(): void {
  if (preloaded || typeof Image === 'undefined') return;
  preloaded = true;
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  for (const a of Object.values(DELIVERED)) {
    const img = new Image();
    img.src = runtimeUrl(dpr > 1 && a.file2x ? a.file2x : a.file);
  }
}

/** Is there delivered art for this cursor (for the catalog and tests)? */
export function cursorDelivered(id: CursorId): boolean {
  return !!DELIVERED[id === 'cursor.battle.melee' ? `${id}@0` : id];
}

/**
 * The interface-wide cursors as CSS variables (`--cur-default`, `--cur-pointer`,
 * `--cur-grab`, `--cur-grabbing`, `--cur-busy`, `--cur-blocked`), used by the
 * stylesheets for buttons, draggable items and disabled controls.
 */
export function applyInterfaceCursors(enabled: boolean): void {
  if (typeof document === 'undefined') return;
  if (enabled) preloadCursors();
  const root = document.documentElement.style;
  const set = (name: string, id: CursorId) => root.setProperty(name, cursorCss(id, { enabled }));
  set('--cur-default', 'cursor.ui.default');
  set('--cur-pointer', 'cursor.ui.pointer');
  set('--cur-grab', 'cursor.ui.grab');
  set('--cur-grabbing', 'cursor.ui.grabbing');
  set('--cur-busy', 'cursor.ui.busy');
  set('--cur-blocked', 'cursor.blocked');
}
