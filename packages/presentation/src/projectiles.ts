/**
 * Shooter missiles and their impacts (battle FX delivery 2026-10-15,
 * `docs/battle-fx-neutral-upgrades-v1`, handoff §4–6): which profile a shot
 * event flies, how its path, flight time and facing are worked out, where it
 * leaves the shooter and where it lands, and how a frame-region effect strip is
 * placed frame by frame. Pure functions only — no PixiJS, no game state, no
 * random draws — so they are part of `@pr/presentation/core` and unit-tested.
 *
 * Presentation only: a missile never decides a hit, a range, a damage value or
 * a casualty; the rules committed all of that before playback starts. The same
 * events always give the same picture (no random variation, so no visual seed is
 * needed), and instant playback shows none of it.
 */
import type { GameEvent } from '@pr/rules';
import type { ProjectileProfile, SpriteFrameRegion, SpriteStrip } from './sprites';

/** The two siege actors of the delivery (rows 0–1 and 2–3 of `fx-siege.png`): different actors, not a creature pair. */
export const SIEGE_PROFILE_IDS: readonly string[] = ['siege_turret', 'catapult'];

/** The missile a shot event shows: a delivered profile, or the generic still of the old renderer. */
export type MissileChoice =
  | { readonly kind: 'profile'; readonly profileId: string; readonly profile: ProjectileProfile }
  | { readonly kind: 'fallback'; readonly still: 'arrow' | 'stone' };

type Profiles = Readonly<Record<string, ProjectileProfile>> | null | undefined;

/** A creature's own profile by its creature ID (never a siege actor's). */
export function profileForCreature(profiles: Profiles, creatureId: string | null | undefined): { readonly id: string; readonly profile: ProjectileProfile } | null {
  if (!creatureId || SIEGE_PROFILE_IDS.includes(creatureId)) return null;
  const p = profiles?.[creatureId];
  return p ? { id: creatureId, profile: p } : null;
}

function profileOr(profiles: Profiles, id: string, still: 'arrow' | 'stone'): MissileChoice {
  const p = profiles?.[id];
  return p ? { kind: 'profile', profileId: id, profile: p } : { kind: 'fallback', still };
}

/**
 * What flies for a committed event, or null when nothing does:
 *
 *  - `BattleAttack` with mode `shot`: the attacking stack's creature profile, else the old arrow
 *    (an unknown future shooter); melee and retaliation blows — a shooter's too — fly nothing;
 *  - `SiegeTurretShot`: the tower arrow (`siege_turret`), else the old arrow;
 *  - `SiegeStructureDamaged` from the Catapult: the siege stone (`catapult`), else the old stone;
 *    from a creature (a wall breaker): that creature's OWN profile (Cyclops boulder, Colossus
 *    granite), else the old stone — never the Catapult's stone.
 */
export function missileFor(ev: GameEvent, creatureOf: (stackId: string) => string | null | undefined, profiles: Profiles): MissileChoice | null {
  switch (ev.kind) {
    case 'BattleAttack': {
      if (ev.mode !== 'shot') return null;
      const own = profileForCreature(profiles, creatureOf(ev.attackerId));
      return own ? { kind: 'profile', profileId: own.id, profile: own.profile } : { kind: 'fallback', still: 'arrow' };
    }
    case 'SiegeTurretShot':
      return profileOr(profiles, 'siege_turret', 'arrow');
    case 'SiegeStructureDamaged': {
      if (ev.source === 'catapult') return profileOr(profiles, 'catapult', 'stone');
      const own = profileForCreature(profiles, ev.attackerId ? creatureOf(ev.attackerId) : null);
      return own ? { kind: 'profile', profileId: own.id, profile: own.profile } : { kind: 'fallback', still: 'stone' };
    }
    default:
      return null;
  }
}

// ------------------------------------------------------------------ path, time, facing

/** A path kind; `legacy` is the old renderer's one arc for every missile (the generic fallback). */
export type MissilePath = ProjectileProfile['path'] | 'legacy';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Peak height of the arc above the straight line, in board pixels, for a flight of `distance`
 * board pixels on a board whose hexes are `hexW` wide: none for magic, breath, wails and fire
 * (`direct`), a low lob for javelins, darts, arrows and sling stones (`shallow-ballistic`: 12 % of
 * the range, 0.12–0.9 hex), a high lob for boulders, granite and siege stones (`high-ballistic`:
 * 34 % of the range, 0.55–2.6 hexes). `legacy`: the old 18 % up to 2.4 hex radii.
 */
export function arcHeight(path: MissilePath, distance: number, hexW: number): number {
  const d = Math.max(0, distance);
  switch (path) {
    case 'direct':
      return 0;
    case 'shallow-ballistic':
      return clamp(d * 0.12, hexW * 0.12, hexW * 0.9);
    case 'high-ballistic':
      return clamp(d * 0.34, hexW * 0.55, hexW * 2.6);
    default:
      return Math.min((hexW / Math.sqrt(3)) * 2.4, d * 0.18);
  }
}

export interface PathSample {
  readonly x: number;
  readonly y: number;
  /** Direction of travel (radians, screen axes: +x right, +y down): the tangent of the path. */
  readonly angle: number;
}

/**
 * The point at `t` (0 launch … 1 contact) of a flight from `from` to `to` lifted by `arc` at its
 * middle: a parabola (constant speed across the ground, like a thrown body), and its tangent.
 * t = 0 is exactly `from` and t = 1 exactly `to`.
 */
export function samplePath(from: { x: number; y: number }, to: { x: number; y: number }, t: number, arc: number): PathSample {
  const k = clamp(t, 0, 1);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const x = from.x + dx * k;
  const y = from.y + dy * k - 4 * arc * k * (1 - k);
  const vx = dx;
  const vy = dy - 4 * arc * (1 - 2 * k);
  const angle = Math.abs(vx) < 1e-9 && Math.abs(vy) < 1e-9 ? 0 : Math.atan2(vy, vx);
  return { x, y, angle };
}

/** The highest point (smallest y) of a flight lifted by `arc`. */
export function apexY(from: { x: number; y: number }, to: { x: number; y: number }, arc: number): number {
  if (arc <= 0) return Math.min(from.y, to.y);
  const t = clamp((4 * arc - (to.y - from.y)) / (8 * arc), 0, 1);
  return samplePath(from, to, t, arc).y;
}

/**
 * The arc lowered (never raised) so the flight stays on the visible board: its apex no higher
 * than `ceilingY` (the top of the board's frame — above it the battle HUD covers the field), or
 * than the higher of its two ends when that one already stands above the frame (a tower's top).
 */
export function fitArc(from: { x: number; y: number }, to: { x: number; y: number }, arc: number, ceilingY: number): number {
  const ceiling = Math.min(ceilingY, Math.min(from.y, to.y));
  if (arc <= 0 || apexY(from, to, arc) >= ceiling - 1e-9) return Math.max(0, arc);
  let lo = 0;
  let hi = arc;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (apexY(from, to, mid) >= ceiling) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** Flights shorter than this (hexes) take the shortest time of their range, longer than `FLIGHT_FAR_HEX` the longest. */
export const FLIGHT_NEAR_HEX = 1;
export const FLIGHT_FAR_HEX = 12;

/**
 * Nominal flight time (ms at normal battle speed; the tween clock then scales it by the battle
 * speed): grows with the distance and stays inside the profile's `durationMsRange`.
 */
export function flightMs(range: readonly [number, number], distance: number, hexW: number): number {
  const [lo, hi] = range[0] <= range[1] ? range : [range[1], range[0]];
  const hexes = Math.max(0, distance) / Math.max(1e-6, hexW);
  const k = clamp((hexes - FLIGHT_NEAR_HEX) / (FLIGHT_FAR_HEX - FLIGHT_NEAR_HEX), 0, 1);
  return Math.round(lo + (hi - lo) * k);
}

/** The old renderer's flight time for the generic fallback (45 ms per hex radius, at least 220 ms). */
export function legacyFlightMs(distance: number, hexW: number): number {
  return Math.max(220, (Math.max(0, distance) / (hexW / Math.sqrt(3))) * 45);
}

/**
 * How the travel sprite is turned: along the tangent, and — on a board drawn mirrored (the
 * defender on the left) — flipped vertically once, which exactly cancels the board's own mirror
 * (M·R(θ)·flipY = R(π − θ)): the painted missile then shows as painted, turned only by its own
 * direction on screen. It is never mirrored a second time.
 */
export function missileTransform(angle: number, boardMirrored: boolean): { readonly rotation: number; readonly scaleYSign: 1 | -1 } {
  return { rotation: angle, scaleYSign: boardMirrored ? -1 : 1 };
}

/** The travel pose shown after `elapsedMs` of flight: the first pose for physical missiles, the four poses looping for magic. */
export function travelFrame(playback: ProjectileProfile['travelPlayback'], elapsedMs: number, fps: number, frames: number): number {
  if (playback !== 'loop' || frames <= 1) return 0;
  const i = Math.floor((Math.max(0, elapsedMs) * Math.max(0, fps)) / 1000);
  return ((i % frames) + frames) % frames;
}

// ------------------------------------------------------------------ impact timing

/** An impact's length: its frames at its own rate, played once. */
export function impactDurationMs(frames: number, fps: number): number {
  return (Math.max(1, frames) / Math.max(1, fps)) * 1000;
}

/** The impact frame after `elapsedMs` (never loops: the last frame holds until the end). */
export function impactFrame(elapsedMs: number, frames: number, fps: number): number {
  return clamp(Math.floor((Math.max(0, elapsedMs) * Math.max(1, fps)) / 1000), 0, Math.max(1, frames) - 1);
}

/** Opacity of an impact: full, then fading to nothing over its last `fadeLastMs` (no hard pop). */
export function impactAlpha(elapsedMs: number, totalMs: number, fadeLastMs: number): number {
  if (fadeLastMs <= 0) return elapsedMs >= totalMs ? 0 : 1;
  const left = totalMs - elapsedMs;
  return clamp(left / Math.min(fadeLastMs, Math.max(1e-6, totalMs)), 0, 1);
}

/** Reduced effects (graphics Low, reduced motion): the impact's first frame only, faded out over this time. */
export const REDUCED_IMPACT_MS = 180;

// ------------------------------------------------------------------ frame-region placement

/** A region's pixel anchor as fractions of its own rectangle (the sprite anchor for that frame). */
export function regionAnchor(r: SpriteFrameRegion): [number, number] {
  return [r.anchor[0] / Math.max(1, r.rect[2]), r.anchor[1] / Math.max(1, r.rect[3])];
}

/** A region's drawn scale: `hexW / pixelsPerHex` (the full source cell spans its size in hexes) × its `sourceScale` × `scale`. */
export function regionScale(hexW: number, pixelsPerHex: number, r: SpriteFrameRegion, scale = 1): number {
  return (hexW / Math.max(1e-6, pixelsPerHex)) * r.sourceScale * scale;
}

/**
 * How frame `index` of an effect strip is placed: a frame-region strip takes each region's own
 * pixel anchor and source scale (so the impact never jumps between frames or sits below the
 * target); a strip without regions keeps its one anchor and scale (unchanged behaviour).
 */
export function effectFrameTransform(def: Pick<SpriteStrip, 'anchor' | 'regions'> & { readonly pixelsPerHex: number }, index: number, hexW: number, scale = 1): { readonly anchor: [number, number]; readonly scale: number } {
  const r = def.regions?.[index];
  if (r) return { anchor: regionAnchor(r), scale: regionScale(hexW, def.pixelsPerHex, r, scale) };
  return { anchor: [def.anchor[0], def.anchor[1]], scale: (hexW / Math.max(1e-6, def.pixelsPerHex)) * scale };
}

/** Source pixels per hex of a profile's travel art: one full source cell (transparent margin included) spans `sizeHex` hexes. */
export function travelPixelsPerHex(p: ProjectileProfile): number {
  const cell = p.travel[0]?.rect[2] ?? 1;
  return cell / Math.max(1e-6, p.sizeHex);
}

/** The travel poses as a frame-region strip (loaded and cut like any other strip; the PNG is never cut on disk). */
export function travelStrip(p: ProjectileProfile): SpriteStrip & { readonly pixelsPerHex: number } {
  return {
    file: p.file,
    frames: p.travel.length,
    frameWidth: Math.max(1, ...p.travel.map((r) => r.rect[2])),
    frameHeight: Math.max(1, ...p.travel.map((r) => r.rect[3])),
    fps: p.travelFps,
    loop: p.travelPlayback === 'loop',
    anchor: [0.5, 0.5],
    regions: p.travel,
    pixelsPerHex: travelPixelsPerHex(p),
  };
}

// ------------------------------------------------------------------ release and contact points

/**
 * Where a shooter lets its missile go, measured on its delivered `shoot` strip (six frames at 6 fps,
 * each frame drawn at the strip's `pixelsPerHex`): `frame` is the first frame without the missile
 * in hand (the release moment), `x` / `y` the throwing hand, staff head, sling pouch or mouth in
 * hexes forward of and above the sprite anchor (the feet; for two-hex units the middle of both
 * cells). Mirrored with the figure for left-facing stacks. Calibrated 2026-10-16 on the strips in
 * `assets-runtime/sprites/final/creatures/<id>/shoot.webp` (release frames with the socket
 * marked); slingers let go one frame later (the stone is still in the pouch in frame 2).
 */
export interface ReleaseSocket {
  readonly frame: number;
  readonly x: number;
  readonly y: number;
}

export const RELEASE_SOCKETS: Readonly<Record<string, ReleaseSocket>> = {
  // Throwing hand at the end of the cast (javelins, darts).
  peltast: { frame: 2, x: 0.7, y: 0.78 },
  veteran_peltast: { frame: 2, x: 0.77, y: 0.84 },
  egyptian_anubian_warden: { frame: 2, x: 0.66, y: 0.82 },
  mesoamerican_eagle_warrior_spirit: { frame: 2, x: 0.48, y: 0.82 },
  mesoamerican_solar_eagle_warrior: { frame: 2, x: 0.52, y: 0.88 },
  // The Jackal Guardian carries its javelin in its jaws (frame 1) and flings it with a toss of the head.
  egyptian_jackal_guardian: { frame: 2, x: 0.62, y: 0.76 },
  // Staff head (the glow in frame 2).
  temple_adept: { frame: 2, x: 0.74, y: 0.82 },
  temple_seer: { frame: 2, x: 0.78, y: 0.88 },
  // Heavy throwers (two-hex): the open hand high in front after the overarm throw.
  cyclops: { frame: 2, x: 1.32, y: 1.9 },
  stormforged_cyclops: { frame: 2, x: 1.36, y: 1.97 },
  egyptian_desert_colossus: { frame: 2, x: 1.0, y: 1.5 },
  egyptian_divine_colossus: { frame: 2, x: 1.12, y: 1.57 },
  // Mouths (breath, holy fire, serpent fire, the wail).
  norse_lindworm: { frame: 2, x: 0.67, y: 1.0 },
  norse_storm_lindworm: { frame: 2, x: 0.68, y: 1.0 },
  japanese_kirin: { frame: 2, x: 0.46, y: 0.62 },
  japanese_celestial_kirin: { frame: 2, x: 0.52, y: 0.7 },
  celtic_banshee: { frame: 2, x: 0.33, y: 1.02 },
  celtic_battle_banshee: { frame: 2, x: 0.35, y: 1.06 },
  mesoamerican_xiuhcoatl: { frame: 2, x: 0.66, y: 0.95 },
  mesoamerican_divine_xiuhcoatl: { frame: 2, x: 0.72, y: 1.08 },
  // Sling pouch at the end of the whip (frame 2); released as frame 3 starts.
  hill_slinger: { frame: 3, x: 0.74, y: 0.9 },
  sling_master: { frame: 3, x: 0.76, y: 0.93 },
};

/** Share of a creature frame's height above the feet that its painted figure fills (median of the delivered idle strips, 0.78). */
export const FIGURE_FILL = 0.78;

/**
 * The release socket of a shooter: the calibrated one when its own `shoot` strip is drawn, else a
 * rule from the profile's logical `sourcePoint` and the figure's size (`heightHex`: the drawn
 * frame's height above the feet, in hexes): a mouth high on the front of the body, a hand a
 * little lower; further forward for two-hex bodies. Released a third of the way into the strip.
 */
export function releaseSocket(creatureId: string | null | undefined, opts: { readonly sourcePoint?: string; readonly heightHex: number; readonly footprint: 1 | 2; readonly ownShootStrip: boolean; readonly frames?: number }): ReleaseSocket & { readonly calibrated: boolean } {
  const own = creatureId ? RELEASE_SOCKETS[creatureId] : undefined;
  if (own && opts.ownShootStrip) return { ...own, calibrated: true };
  const visible = Math.max(0.3, opts.heightHex) * FIGURE_FILL;
  const mouth = opts.sourcePoint === 'mouth';
  const wide = opts.footprint === 2;
  const frame = Math.round(Math.max(1, opts.frames ?? 6) / 3);
  return { frame, x: (mouth ? 0.42 : 0.4) + (wide ? 0.3 : 0), y: visible * (mouth ? 0.82 : 0.66), calibrated: false };
}

/** The old renderer let every missile go 260 ms into the attack (used when no strip timing is known). */
export const LEGACY_RELEASE_MS = 260;

/**
 * When, after the shoot strip starts, the missile leaves: the start of the release frame of the
 * strip actually drawn (`SpriteFigure.playOnce` spreads `frames` over max(`minMs`, frames / fps)).
 */
export function releaseDelayMs(strip: { readonly frames: number; readonly fps: number } | null | undefined, minMs: number, frame: number): number {
  if (!strip || strip.frames <= 0) return LEGACY_RELEASE_MS;
  const total = Math.max(minMs, (strip.frames / Math.max(1, strip.fps)) * 1000);
  return (total * clamp(Math.round(frame), 0, strip.frames - 1)) / strip.frames;
}

/**
 * The board point a socket stands at: the stack's sprite anchor (`anchor`, plus the pose's own
 * offset — the small recoil of the throw), `x` hexes in the direction the figure faces and `y`
 * hexes up. A left-facing figure is mirrored around its anchor, and so is its socket.
 */
export function releasePoint(anchor: { x: number; y: number }, socket: { readonly x: number; readonly y: number }, facing: 1 | -1, hexW: number, pose: { x: number; y: number } = { x: 0, y: 0 }): { x: number; y: number } {
  return { x: anchor.x + pose.x + facing * socket.x * hexW, y: anchor.y + pose.y - socket.y * hexW };
}

/**
 * Where a missile meets its target: the middle of the painted body (`heightPx`: the drawn frame's
 * height above the feet; a frame-region figure is measured tightly, a strip frame carries a margin
 * — `FIGURE_FILL`), a little toward the shooter: on the near half of a two-hex body.
 */
export function contactPoint(target: { x: number; y: number }, opts: { readonly heightPx: number; readonly tight: boolean; readonly footprint: 1 | 2; readonly fromX: number; readonly hexW: number }): { x: number; y: number } {
  const body = opts.heightPx * (opts.tight ? 1 : FIGURE_FILL);
  const up = Math.max(opts.hexW * 0.25, body * 0.5);
  const toward = Math.sign(opts.fromX - target.x);
  return { x: target.x + toward * (opts.footprint === 2 ? 0.3 : 0.08) * opts.hexW, y: target.y - up };
}
