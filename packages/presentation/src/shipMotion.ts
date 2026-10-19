/**
 * Hero ship motion (expedition kit `runtime/ship-motion.js` and `design/animation-contract.json`),
 * ported to TypeScript — presentation only, part of `@pr/presentation/core` (no PixiJS import).
 *
 * Every function is a pure function of presentation elapsed milliseconds: no RNG, no wall clock,
 * no rules state. The kit delivers directional painted bodies plus these runtime motions, not
 * frame strips: idle (subtle buoyancy and roll), sailing (stronger motion, wake, flag flutter),
 * embark / disembark (a 650 ms crossfade between the mounted avatar and the ship, played after the
 * command is committed), boarding (held while the tactical scene opens), hit (a short recoil cue,
 * no hull HP) and sinking (the old hull fades into the wreck, then is removed — after the logical
 * defeat, never delaying it). Map translation follows the committed waypoints separately (the
 * views tween `ShipMoved` paths); the pose is displacement around the ground point only.
 *
 * Direction comes from the PROJECTED travel delta (E / NE / SE pictures, mirrored for W / NW / SW;
 * the flat picture is never rotated to steer, which would tilt the mast). The owner flag is a
 * separate overlay at the kit's mast point, x → 1 − x when the hull is mirrored.
 */
import { AXIAL_DIRECTIONS } from '@pr/rules';
import { MAP_SQUASH, axialPoint } from './hexmath';
import { flagMount, mirroredAnchor, tokenHeading, type MapTokenFacing, type MapTokenHeading, type ResolvedMapToken } from './mapTokens';

export type ShipMotionState = 'idle' | 'sailing' | 'embark' | 'disembark' | 'boarding' | 'hit' | 'sinking';

export const SHIP_MOTION_STATES: readonly ShipMotionState[] = ['idle', 'sailing', 'embark', 'disembark', 'boarding', 'hit', 'sinking'];

/** The kit's states: duration and whether they loop (animation-contract.json `states`). */
export const SHIP_MOTION: Readonly<Record<ShipMotionState, { readonly durationMs: number; readonly loop: boolean }>> = {
  idle: { durationMs: 3200, loop: true },
  sailing: { durationMs: 1800, loop: true },
  embark: { durationMs: 650, loop: false },
  disembark: { durationMs: 650, loop: false },
  boarding: { durationMs: 2600, loop: true },
  hit: { durationMs: 420, loop: false },
  sinking: { durationMs: 1800, loop: false },
};

/** The kit's motion amplitudes (CSS pixels and degrees at its preview scale; the views apply them in map pixels at zoom 1). */
export const SHIP_MOTION_AMPLITUDE = {
  idle: { bobPx: 1.4, rollDeg: 0.65, periodS: 3.2 },
  sailing: { bobPx: 2, rollDeg: 1, bobPeriodS: 1.8, rollPeriodS: 2.3, wakeOpacity: 0.55 },
  boarding: { rollFactor: 0.4, wakeOpacity: 0.12 },
  hit: { shakePx: 4, rollDeg: 2 },
  sinking: { dropPx: 32, rollDeg: 8, wakeOpacity: 0.6 },
  transition: { liftPx: 2 },
  flag: { waveDeg: 2, rate: 5.4 },
} as const;

export interface ShipPose {
  /** Displacement of the hull around its ground point (map pixels; +y down). */
  readonly x: number;
  readonly y: number;
  /** Roll in degrees (about the ground point). */
  readonly rotation: number;
  /** The kit's opacity for this state (embark: 0 → 1, disembark: 1 → 0, sinking: 1 → 0). */
  readonly opacity: number;
  /** Opacity of the wake overlay. */
  readonly wakeOpacity: number;
  /** Flag flutter: a skew in degrees. */
  readonly flagWave: number;
  /** One-shot states: 0 → 1 over the duration (loops: the same clamp of the elapsed time). */
  readonly progress: number;
}

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

/**
 * The hull's pose `timeMs` after the state began (exact port of the kit's `shipPose`). Reduced motion:
 * no bob, roll, wake, shaking or flutter — only the readable state change (a disembarked crew is gone
 * at once; a sunk hull at the end).
 */
export function shipPose(state: ShipMotionState | string, timeMs: number, reducedMotion = false): ShipPose {
  const s: ShipMotionState = (SHIP_MOTION as Record<string, unknown>)[state] ? (state as ShipMotionState) : 'idle';
  const t = Math.max(0, timeMs) / 1000;
  const p = clamp(timeMs / SHIP_MOTION[s].durationMs, 0, 1);
  if (reducedMotion) return { x: 0, y: 0, rotation: 0, opacity: s === 'disembark' ? 0 : s === 'sinking' && p >= 1 ? 0 : 1, wakeOpacity: 0, flagWave: 0, progress: p };
  const A = SHIP_MOTION_AMPLITUDE;
  let y = Math.sin((t * Math.PI * 2) / A.idle.periodS) * A.idle.bobPx;
  let rotation = Math.sin((t * Math.PI * 2) / A.idle.periodS) * A.idle.rollDeg;
  let x = 0;
  let opacity = 1;
  let wakeOpacity = 0;
  if (s === 'sailing') {
    y = Math.sin((t * Math.PI * 2) / A.sailing.bobPeriodS) * A.sailing.bobPx;
    rotation = Math.sin((t * Math.PI * 2) / A.sailing.rollPeriodS) * A.sailing.rollDeg;
    wakeOpacity = A.sailing.wakeOpacity;
  }
  if (s === 'boarding') {
    rotation *= A.boarding.rollFactor;
    wakeOpacity = A.boarding.wakeOpacity;
  }
  if (s === 'hit') {
    x = Math.sin(t * 65) * A.hit.shakePx * (1 - p);
    rotation = Math.sin(t * 35) * A.hit.rollDeg * (1 - p);
  }
  if (s === 'embark' || s === 'disembark') {
    y += Math.sin(p * Math.PI) * A.transition.liftPx;
    opacity = s === 'embark' ? p : 1 - p;
  }
  if (s === 'sinking') {
    y += p * A.sinking.dropPx;
    rotation = p * A.sinking.rollDeg;
    opacity = 1 - p;
    wakeOpacity = Math.sin(p * Math.PI) * A.sinking.wakeOpacity;
  }
  return { x, y, rotation, opacity, wakeOpacity, flagWave: Math.sin(t * A.flag.rate) * A.flag.waveDeg, progress: p };
}

/** The kit's `direction(angle)`: the painted facing and mirror for a screen angle in degrees (0 = east, +y down). */
export function shipDirection(angleDeg: number): { readonly facing: MapTokenFacing; readonly flipX: boolean } {
  const a = ((((angleDeg + 180) % 360) + 360) % 360) - 180;
  const flipX = Math.abs(a) > 90;
  const local = flipX ? (a >= 0 ? 180 - a : -180 - a) : a;
  return { facing: local < -15 ? 'ne' : local > 15 ? 'se' : 'e', flipX };
}

/** The heading of a ship's rules facing (an `AXIAL_DIRECTIONS` index), from its PROJECTED screen direction on the map. */
export function facingHeading(facing: number, squash = MAP_SQUASH): MapTokenHeading {
  const d = AXIAL_DIRECTIONS[((Math.round(facing) % 6) + 6) % 6] ?? AXIAL_DIRECTIONS[0]!;
  const p = axialPoint(d, 1, squash);
  return tokenHeading(p.x, p.y);
}

/**
 * Sinking: the old hull fades into the wreck still, which then fades out as it goes down (the kit swaps
 * to `ship-wreck` past 65 %). Reduced motion: the hull until the middle, the wreck until the end (readable
 * state changes without the fade), then nothing.
 */
export function sinkingLayers(progress: number, reducedMotion = false): { readonly hull: number; readonly wreck: number } {
  const p = clamp(progress, 0, 1);
  if (reducedMotion) return p >= 1 ? { hull: 0, wreck: 0 } : p < 0.5 ? { hull: 1, wreck: 0 } : { hull: 0, wreck: 1 };
  const smooth = (a: number, b: number) => {
    const k = clamp((p - a) / (b - a), 0, 1);
    return k * k * (3 - 2 * k);
  };
  const into = smooth(0.3, 0.65);
  const out = 1 - smooth(0.8, 1);
  return { hull: 1 - into, wreck: into * out };
}

/**
 * Embark / disembark: the crossfade between the mounted avatar on the shore and the crewed ship (its
 * flag). The kit's pose opacity is the ship's (embark p, disembark 1 − p); the avatar takes the rest.
 * The empty hull stays drawn throughout — it is a world entity before and after. Reduced motion: the
 * end state at once.
 */
export function transitionLayers(kind: 'embark' | 'disembark', progress: number, reducedMotion = false): { readonly avatar: number; readonly crew: number } {
  const p = reducedMotion ? 1 : clamp(progress, 0, 1);
  const crew = kind === 'embark' ? p : 1 - p;
  return { avatar: 1 - crew, crew };
}

export interface ShipTokenLayout {
  /** Drawn pixels per source pixel (the visible hull spans `displayHexWidths` hexes; transparent margins excluded). */
  readonly scale: number;
  /** Mirrored horizontally (W, NW, SW). */
  readonly flipX: boolean;
  /** Sprite anchor as drawn (the ground point; x mirrored with the picture). */
  readonly anchor: readonly [number, number];
  /** The flag's mast point relative to the ground point (map pixels; x mirrored with the hull, never the flag itself). */
  readonly flag: { readonly x: number; readonly y: number } | null;
  /** Visible hull width and height (map pixels). */
  readonly visibleWidth: number;
  readonly visibleHeight: number;
}

/** Where a resolved ship picture is drawn around its ground point, and where its flag goes. */
export function shipTokenLayout(t: ResolvedMapToken, hexWidthPx: number): ShipTokenLayout {
  const pic = t.picture;
  const b = pic.visibleBounds;
  const visible = (b[2] - b[0]) * pic.width;
  const scale = visible > 0 ? (hexWidthPx * t.def.displayHexWidths) / visible : 0;
  const anchor = mirroredAnchor(pic, t.flipX);
  const mount = flagMount(t.def, t.flipX);
  return {
    scale,
    flipX: t.flipX,
    anchor,
    flag: mount ? { x: (mount[0] - anchor[0]) * pic.width * scale, y: (mount[1] - anchor[1]) * pic.height * scale } : null,
    visibleWidth: visible * scale,
    visibleHeight: (b[3] - b[1]) * pic.height * scale,
  };
}
