/**
 * Shooter missiles and impacts (battle FX delivery 2026-10-15, handoff §4–6 and §10.1–2):
 * every catalog shooter resolves to its own delivered profile, travel row and impact row; the
 * tower arrow and the Catapult's stone are separate siege actors; a wall breaker throws its own
 * missile, never the Catapult's; an unknown shooter flies the old arrow; a melee blow flies
 * nothing. The path, flight time, facing, release and contact maths and the frame-region
 * placement of impacts are checked here; the live picture in tests/e2e/v2fx.spec.ts.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCatalog } from '@pr/content';
import type { GameEvent } from '@pr/rules';
import {
  FLIGHT_FAR_HEX,
  FLIGHT_NEAR_HEX,
  LEGACY_RELEASE_MS,
  RELEASE_SOCKETS,
  SIEGE_PROFILE_IDS,
  apexY,
  arcHeight,
  contactPoint,
  effectFrameTransform,
  fitArc,
  flightMs,
  impactAlpha,
  impactDurationMs,
  impactFrame,
  missileFor,
  missileTransform,
  profileForCreature,
  regionAnchor,
  regionScale,
  releaseDelayMs,
  releasePoint,
  releaseSocket,
  samplePath,
  travelFrame,
  travelPixelsPerHex,
  travelStrip,
  type EffectDefinition,
  type ProjectileProfile,
  type SpriteManifest,
  type StaticSpriteDefinition,
} from '../src/core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const runtime = path.join(root, 'assets-runtime');
const base = JSON.parse(readFileSync(path.join(runtime, 'sprites/manifest.json'), 'utf8')) as SpriteManifest;
const fx = JSON.parse(readFileSync(path.join(runtime, 'battle-fx-neutral-upgrades-v1/manifest.json'), 'utf8')) as {
  effects: Record<string, EffectDefinition>;
  projectiles: Record<string, StaticSpriteDefinition>;
  projectileProfiles: Record<string, ProjectileProfile>;
};
/** Merged as the interface merges it (ui/src/assets/manifest.ts): the delivery adds to the base manifest. */
const effects: Record<string, EffectDefinition> = { ...base.effects, ...fx.effects };
const stills: Record<string, StaticSpriteDefinition> = { ...base.projectiles, ...fx.projectiles };
const profiles = fx.projectileProfiles;
const catalog = buildCatalog();
const HEX_W = Math.sqrt(3) * 40;

/** The handoff's §4 mapping: sheet, zero-based travel and impact rows, path. */
const INTENDED: Record<string, { file: string; travel: number; impact: number; path: ProjectileProfile['path'] }> = {
  peltast: { file: 'fx-greek-javelin.png', travel: 0, impact: 1, path: 'shallow-ballistic' },
  veteran_peltast: { file: 'fx-greek-javelin.png', travel: 2, impact: 3, path: 'shallow-ballistic' },
  temple_adept: { file: 'fx-arcane-bolt.png', travel: 0, impact: 1, path: 'direct' },
  temple_seer: { file: 'fx-arcane-bolt.png', travel: 2, impact: 3, path: 'direct' },
  cyclops: { file: 'fx-cyclops-boulder.png', travel: 0, impact: 1, path: 'high-ballistic' },
  stormforged_cyclops: { file: 'fx-cyclops-boulder.png', travel: 2, impact: 3, path: 'high-ballistic' },
  norse_lindworm: { file: 'fx-frost-breath.png', travel: 0, impact: 1, path: 'direct' },
  norse_storm_lindworm: { file: 'fx-frost-breath.png', travel: 2, impact: 3, path: 'direct' },
  egyptian_jackal_guardian: { file: 'fx-egyptian-javelin-v2.png', travel: 0, impact: 1, path: 'shallow-ballistic' },
  egyptian_anubian_warden: { file: 'fx-egyptian-javelin-v2.png', travel: 2, impact: 3, path: 'shallow-ballistic' },
  egyptian_desert_colossus: { file: 'fx-granite-block-v2.png', travel: 0, impact: 1, path: 'high-ballistic' },
  egyptian_divine_colossus: { file: 'fx-granite-block-v2.png', travel: 2, impact: 3, path: 'high-ballistic' },
  japanese_kirin: { file: 'fx-holy-fire.png', travel: 0, impact: 1, path: 'direct' },
  japanese_celestial_kirin: { file: 'fx-holy-fire.png', travel: 2, impact: 3, path: 'direct' },
  celtic_banshee: { file: 'fx-spectral-wail.png', travel: 0, impact: 1, path: 'direct' },
  celtic_battle_banshee: { file: 'fx-spectral-wail.png', travel: 2, impact: 3, path: 'direct' },
  mesoamerican_eagle_warrior_spirit: { file: 'fx-atlatl-dart.png', travel: 0, impact: 1, path: 'shallow-ballistic' },
  mesoamerican_solar_eagle_warrior: { file: 'fx-atlatl-dart.png', travel: 2, impact: 3, path: 'shallow-ballistic' },
  mesoamerican_xiuhcoatl: { file: 'fx-serpent-fire.png', travel: 0, impact: 1, path: 'direct' },
  mesoamerican_divine_xiuhcoatl: { file: 'fx-serpent-fire.png', travel: 2, impact: 3, path: 'direct' },
  hill_slinger: { file: 'fx-sling-ammunition.png', travel: 0, impact: 1, path: 'shallow-ballistic' },
  sling_master: { file: 'fx-sling-ammunition.png', travel: 2, impact: 3, path: 'shallow-ballistic' },
  siege_turret: { file: 'fx-siege.png', travel: 0, impact: 1, path: 'shallow-ballistic' },
  catapult: { file: 'fx-siege.png', travel: 2, impact: 3, path: 'high-ballistic' },
};

const shooters = Object.values(catalog.creatures)
  .filter((d) => (d.stats?.shots ?? 0) > 0)
  .map((d) => d.id)
  .sort();
const wallBreakers = Object.values(catalog.creatures)
  .filter((d) => d.abilityIds.some((a) => catalog.abilities[a]?.rule.type === 'wall_breaker'))
  .map((d) => d.id)
  .sort();

/** A battle with stacks s<n> of the given creatures (the view's `creatureOf`). */
const creatureOf = (ids: Record<string, string>) => (stackId: string) => ids[stackId] ?? null;
const shot = (attackerId: string, mode: 'shot' | 'melee' | 'retaliation' = 'shot'): GameEvent => ({ kind: 'BattleAttack', attackerId, targetId: 't', mode, damage: 5, killed: 0, targetRemaining: 3, luck: false });

function pngSize(file: string): [number, number] {
  const b = readFileSync(file);
  expect(b.toString('latin1', 1, 4)).toBe('PNG');
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

describe('profile coverage', () => {
  it('the catalog has the 22 shooter forms the delivery painted, plus the two siege actors', () => {
    expect(shooters).toHaveLength(22);
    expect(shooters).toEqual(Object.keys(INTENDED).filter((k) => !SIEGE_PROFILE_IDS.includes(k)).sort());
    expect(Object.keys(profiles).sort()).toEqual(Object.keys(INTENDED).sort());
  });

  it.each(shooters)('%s shoots its own travel row and lands its own impact row', (id) => {
    const want = INTENDED[id]!;
    const choice = missileFor(shot('s1'), creatureOf({ s1: id }), profiles);
    expect(choice?.kind).toBe('profile');
    if (choice?.kind !== 'profile') return;
    expect(choice.profileId).toBe(id);
    const p = choice.profile;
    expect(p.file).toBe(`battle-fx-neutral-upgrades-v1/${want.file}`);
    expect(p.path).toBe(want.path);
    expect(p.travel).toHaveLength(4);
    for (const r of p.travel) expect(r.sourceCell?.[0]).toBe(want.travel);
    // The impact strip is registered with frame regions of the impact row, on the same sheet; played once.
    const hit = effects[p.impactEffectId]!;
    expect(p.impactEffectId).toBe(`battlefx.${id}.hit`);
    expect(hit.file).toBe(p.file);
    expect(hit.loop).toBe(false);
    expect(hit.additive ?? false).toBe(false);
    expect(hit.regions).toHaveLength(4);
    for (const r of hit.regions!) expect(r.sourceCell?.[0]).toBe(want.impact);
    expect(stills[p.projectileId]?.file).toBe(p.file);
    // Physical missiles move their first pose; magic, breath, wails and fire loop their four.
    expect(p.travelPlayback).toBe(want.path === 'direct' ? 'loop' : 'static');
    // Upgrades use rows 2 and 3, base forms rows 0 and 1 (never each other's art).
    const upgraded = Object.values(catalog.families).some((f) => f.upgradedCreatureId === id);
    expect(Object.values(catalog.families).some((f) => f.baseCreatureId === id || f.upgradedCreatureId === id)).toBe(true);
    expect(want.travel).toBe(upgraded ? 2 : 0);
    expect(p.variant).toBe(upgraded ? 'upgraded' : 'base');
  });

  it('every region lies inside its delivered sheet', () => {
    for (const [id, p] of Object.entries(profiles)) {
      const [w, h] = pngSize(path.join(runtime, p.file));
      for (const r of [...p.travel, ...effects[p.impactEffectId]!.regions!]) {
        expect(r.rect[0] >= 0 && r.rect[1] >= 0 && r.rect[0] + r.rect[2] <= w && r.rect[1] + r.rect[3] <= h, `${id} ${r.rect.join(',')}`).toBe(true);
      }
    }
  });

  it('no known shooter falls back to the generic arrow; an unknown one does', () => {
    for (const id of shooters) expect(missileFor(shot('s1'), creatureOf({ s1: id }), profiles)).not.toEqual({ kind: 'fallback', still: 'arrow' });
    expect(missileFor(shot('s1'), creatureOf({ s1: 'future_archer' }), profiles)).toEqual({ kind: 'fallback', still: 'arrow' });
    expect(missileFor(shot('s1'), creatureOf({}), profiles)).toEqual({ kind: 'fallback', still: 'arrow' });
    // Without the delivery (an older manifest) every shot keeps the old arrow.
    expect(missileFor(shot('s1'), creatureOf({ s1: 'peltast' }), undefined)).toEqual({ kind: 'fallback', still: 'arrow' });
  });

  it('a melee or retaliation blow — a shooter’s too — flies nothing', () => {
    for (const id of shooters) {
      expect(missileFor(shot('s1', 'melee'), creatureOf({ s1: id }), profiles)).toBeNull();
      expect(missileFor(shot('s1', 'retaliation'), creatureOf({ s1: id }), profiles)).toBeNull();
    }
    const others: GameEvent[] = [
      { kind: 'BattleStackDefended', stackId: 's1' },
      { kind: 'SiegeMoatDamage', stackId: 's1', damage: 3, killed: 0, targetRemaining: 2 },
    ];
    for (const ev of others) expect(missileFor(ev, creatureOf({ s1: 'peltast' }), profiles)).toBeNull();
  });
});

describe('siege actors', () => {
  it('a tower shot flies the tower arrow, the Catapult its stone: different rows of the siege sheet', () => {
    const tower = missileFor({ kind: 'SiegeTurretShot', structureId: 'tower_n', targetId: 's1', damage: 6, killed: 1, targetRemaining: 4 }, creatureOf({ s1: 'hoplite' }), profiles);
    const stone = missileFor({ kind: 'SiegeStructureDamaged', structureId: 'gate', source: 'catapult', hp: 1, attackerId: null }, creatureOf({}), profiles);
    expect(tower?.kind === 'profile' && tower.profileId).toBe('siege_turret');
    expect(stone?.kind === 'profile' && stone.profileId).toBe('catapult');
    if (tower?.kind !== 'profile' || stone?.kind !== 'profile') return;
    expect(tower.profile.travel[0]!.sourceCell?.[0]).toBe(0);
    expect(stone.profile.travel[0]!.sourceCell?.[0]).toBe(2);
    expect(tower.profile.impactEffectId).not.toBe(stone.profile.impactEffectId);
    // Without the delivery: the old arrow and the old stone.
    expect(missileFor({ kind: 'SiegeTurretShot', structureId: 'keep', targetId: 's1', damage: 6, killed: 0, targetRemaining: 4 }, creatureOf({}), {})).toEqual({ kind: 'fallback', still: 'arrow' });
    expect(missileFor({ kind: 'SiegeStructureDamaged', structureId: 'gate', source: 'catapult', hp: 1, attackerId: null }, creatureOf({}), {})).toEqual({ kind: 'fallback', still: 'stone' });
  });

  it('a wall breaker throws its own missile at a wall, never the Catapult’s stone', () => {
    expect(wallBreakers).toEqual(['cyclops', 'egyptian_desert_colossus', 'egyptian_divine_colossus', 'stormforged_cyclops']);
    for (const id of wallBreakers) {
      const c = missileFor({ kind: 'SiegeStructureDamaged', structureId: 'wall_2', source: 'creature', hp: 1, attackerId: 's1' }, creatureOf({ s1: id }), profiles);
      expect(c?.kind === 'profile' && c.profileId).toBe(id);
    }
    // A melee wall breaker without a missile of its own keeps the old generic stone — not the Catapult's.
    const melee = missileFor({ kind: 'SiegeStructureDamaged', structureId: 'wall_2', source: 'creature', hp: 1, attackerId: 's1' }, creatureOf({ s1: 'ram_golem' }), profiles);
    expect(melee).toEqual({ kind: 'fallback', still: 'stone' });
    expect(missileFor({ kind: 'SiegeStructureDamaged', structureId: 'wall_2', source: 'creature', hp: 1, attackerId: null }, creatureOf({}), profiles)).toEqual({ kind: 'fallback', still: 'stone' });
    // A creature can never take a siege actor's profile, even under that name.
    expect(profileForCreature(profiles, 'catapult')).toBeNull();
    expect(profileForCreature(profiles, 'siege_turret')).toBeNull();
    expect(missileFor(shot('s1'), creatureOf({ s1: 'catapult' }), profiles)).toEqual({ kind: 'fallback', still: 'arrow' });
  });
});

describe('path, flight time and facing', () => {
  const from = { x: 100, y: 300 };
  const to = { x: 700, y: 300 };

  it('starts at the release point and ends exactly at the contact point', () => {
    for (const p of ['direct', 'shallow-ballistic', 'high-ballistic', 'legacy'] as const) {
      const arc = arcHeight(p, 600, HEX_W);
      expect(samplePath(from, to, 0, arc)).toMatchObject(from);
      expect(samplePath(from, to, 1, arc)).toMatchObject(to);
    }
  });

  it('magic flies straight; javelins lob low; heavy stones lob high', () => {
    const d = 600;
    expect(arcHeight('direct', d, HEX_W)).toBe(0);
    expect(arcHeight('shallow-ballistic', d, HEX_W)).toBeGreaterThan(0);
    expect(arcHeight('high-ballistic', d, HEX_W)).toBeGreaterThan(arcHeight('shallow-ballistic', d, HEX_W) * 2);
    // A direct flight stays on the line between the points (a diagonal one too).
    const diag = { x: 520, y: 120 };
    for (const t of [0.2, 0.5, 0.8]) {
      const s = samplePath(from, diag, t, 0);
      expect(s.y - from.y).toBeCloseTo(((diag.y - from.y) / (diag.x - from.x)) * (s.x - from.x), 6);
      expect(s.angle).toBeCloseTo(Math.atan2(diag.y - from.y, diag.x - from.x), 9);
    }
    // Even a very short heavy throw lifts; a very long one stays below 2.6 hexes.
    expect(arcHeight('high-ballistic', HEX_W, HEX_W)).toBeGreaterThanOrEqual(HEX_W * 0.55);
    expect(arcHeight('high-ballistic', HEX_W * 20, HEX_W)).toBeLessThanOrEqual(HEX_W * 2.6);
    expect(arcHeight('shallow-ballistic', HEX_W * 20, HEX_W)).toBeLessThanOrEqual(HEX_W * 0.9);
  });

  it('a lob peaks halfway, rises then falls, and its tangent turns from up to down', () => {
    const arc = arcHeight('high-ballistic', 600, HEX_W);
    const mid = samplePath(from, to, 0.5, arc);
    expect(mid.y).toBeCloseTo(from.y - arc, 6);
    expect(mid.angle).toBeCloseTo(0, 9);
    const a0 = samplePath(from, to, 0, arc).angle;
    const a1 = samplePath(from, to, 1, arc).angle;
    expect(a0).toBeLessThan(0);
    expect(a1).toBeCloseTo(-a0, 9);
    // Shot to the left: the art (facing +X) turns about half a turn; upside-down is the rotation, not a mirror.
    const left = samplePath(to, from, 0.5, arc);
    expect(Math.abs(left.angle)).toBeCloseTo(Math.PI, 9);
  });

  it('a lob never rises above the board’s frame (under the HUD); it is only ever lowered', () => {
    const arc = arcHeight('high-ballistic', 600, HEX_W);
    // Plenty of room: unchanged.
    expect(fitArc(from, to, arc, -1000)).toBe(arc);
    // The apex found in closed form is the lowest y along the path.
    const ys = Array.from({ length: 101 }, (_, i) => samplePath(from, { x: 700, y: 420 }, i / 100, arc).y);
    expect(apexY(from, { x: 700, y: 420 }, arc)).toBeCloseTo(Math.min(...ys), 1);
    // Near the top: lowered until the apex touches the ceiling.
    const ceiling = from.y - 40;
    const fitted = fitArc(from, to, arc, ceiling);
    expect(fitted).toBeLessThan(arc);
    expect(fitted).toBeGreaterThan(0);
    expect(apexY(from, to, fitted)).toBeGreaterThanOrEqual(ceiling - 1e-6);
    expect(apexY(from, to, fitted)).toBeCloseTo(ceiling, 3);
    // An end already above the frame (a tower's top): the flight does not rise above that end.
    const tower = { x: 700, y: -60 };
    const down = fitArc(tower, { x: 300, y: 200 }, arc, 0);
    expect(apexY(tower, { x: 300, y: 200 }, down)).toBeGreaterThanOrEqual(tower.y - 1e-6);
    expect(fitArc(from, to, 0, ceiling)).toBe(0);
  });

  it('flight time grows with distance and stays inside the profile range', () => {
    for (const p of Object.values(profiles)) {
      const [lo, hi] = p.durationMsRange;
      const times = [0, 0.5, 1, 2, 4, 8, 12, 20, 40].map((h) => flightMs(p.durationMsRange, h * HEX_W, HEX_W));
      for (const t of times) expect(t >= lo && t <= hi).toBe(true);
      for (let i = 1; i < times.length; i++) expect(times[i]!).toBeGreaterThanOrEqual(times[i - 1]!);
      expect(flightMs(p.durationMsRange, FLIGHT_NEAR_HEX * HEX_W, HEX_W)).toBe(lo);
      expect(flightMs(p.durationMsRange, FLIGHT_FAR_HEX * HEX_W, HEX_W)).toBe(hi);
    }
    expect(profiles['catapult']!.durationMsRange).toEqual([320, 650]);
    expect(profiles['peltast']!.durationMsRange).toEqual([220, 500]);
  });

  it('on a mirrored board the travel art is flipped once, which exactly cancels the board’s mirror', () => {
    expect(missileTransform(0.3, false)).toEqual({ rotation: 0.3, scaleYSign: 1 });
    for (const theta of [0, 0.4, -1.1, 2.5, Math.PI]) {
      const m = missileTransform(theta, true);
      // Board mirror M = diag(-1, 1), sprite R(θ)·diag(1, σ): M·R(θ)·diag(1, σ) = [[-c, s·σ], [s, c·σ]].
      const c = Math.cos(m.rotation);
      const s = Math.sin(m.rotation);
      const composed = [-c, s * m.scaleYSign, s, c * m.scaleYSign];
      // On screen: a plain rotation by the screen direction π − θ, with no mirror left in it.
      const want = [Math.cos(Math.PI - theta), -Math.sin(Math.PI - theta), Math.sin(Math.PI - theta), Math.cos(Math.PI - theta)];
      for (let i = 0; i < 4; i++) expect(composed[i]!).toBeCloseTo(want[i]!, 9);
    }
  });

  it('physical missiles keep their first pose; magic loops its four poses at its rate', () => {
    for (const ms of [0, 50, 120, 333, 499]) expect(travelFrame('static', ms, 10, 4)).toBe(0);
    expect([0, 99, 100, 250, 399, 400, 1050].map((ms) => travelFrame('loop', ms, 10, 4))).toEqual([0, 0, 1, 2, 3, 0, 2]);
  });
});

describe('impact timing and placement', () => {
  it('four frames at the impact rate, once, fading over the last 100 ms', () => {
    const p = profiles['peltast']!;
    const total = impactDurationMs(4, p.impactFps);
    expect(total).toBeCloseTo(333.33, 1);
    expect(impactDurationMs(4, profiles['catapult']!.impactFps)).toBe(400);
    expect([0, 83, 84, 170, 260, 333, 500, 10_000].map((ms) => impactFrame(ms, 4, 12))).toEqual([0, 0, 1, 2, 3, 3, 3, 3]);
    expect(impactAlpha(0, total, 100)).toBe(1);
    expect(impactAlpha(total - 100, total, 100)).toBe(1);
    expect(impactAlpha(total - 50, total, 100)).toBeCloseTo(0.5, 6);
    expect(impactAlpha(total, total, 100)).toBe(0);
    for (const q of Object.values(profiles)) expect(q.impactFadeLastMs).toBe(100);
  });

  it('a frame-region impact takes each region’s pixel anchor and source scale on every frame', () => {
    for (const p of Object.values(profiles)) {
      const def = effects[p.impactEffectId]!;
      def.regions!.forEach((r, i) => {
        const tr = effectFrameTransform(def, i, HEX_W, 1.5);
        expect(tr.anchor[0]).toBeCloseTo(r.anchor[0] / r.rect[2], 12);
        expect(tr.anchor[1]).toBeCloseTo(r.anchor[1] / r.rect[3], 12);
        expect(tr.anchor).toEqual(regionAnchor(r));
        expect(tr.scale).toBeCloseTo((HEX_W / def.pixelsPerHex) * r.sourceScale * 1.5, 12);
        expect(tr.scale).toBeCloseTo(regionScale(HEX_W, def.pixelsPerHex, r, 1.5), 12);
        // The full source cell spans the profile's impactSizeHex (never fitted to its visible pixels).
        expect((effectFrameTransform(def, i, HEX_W).scale * def.regions![0]!.rect[2]) / HEX_W).toBeCloseTo(p.impactSizeHex, 2);
      });
      // The pixel anchors differ between frames (so one strip-level anchor would make the burst jump).
      const anchors = new Set(def.regions!.map((r) => regionAnchor(r).map((v) => v.toFixed(3)).join(',')));
      expect(anchors.size).toBeGreaterThan(1);
    }
  });

  it('a strip without regions keeps its one anchor and scale', () => {
    const impact = base.effects['impact']!;
    for (const i of [0, 3, 5]) expect(effectFrameTransform(impact, i, HEX_W, 2)).toEqual({ anchor: [impact.anchor[0], impact.anchor[1]], scale: (HEX_W / impact.pixelsPerHex) * 2 });
  });

  it('a travel cell spans the profile’s sizeHex, as the delivery’s still does', () => {
    for (const p of Object.values(profiles)) {
      const strip = travelStrip(p);
      expect(strip.regions).toBe(p.travel);
      expect(strip.pixelsPerHex).toBeCloseTo(stills[p.projectileId]!.pixelsPerHex, 0);
      expect(travelPixelsPerHex(p)).toBeCloseTo(p.travel[0]!.rect[2] / p.sizeHex, 9);
      const tr = effectFrameTransform(strip, 0, HEX_W);
      expect((tr.scale * p.travel[0]!.rect[2]) / HEX_W).toBeCloseTo(p.sizeHex, 9);
    }
  });
});

describe('release and contact points', () => {
  const sprites = base.creatures;

  it.each(shooters)('%s lets go from a calibrated socket inside its shoot frame, at its release frame', (id) => {
    const socket = releaseSocket(id, { heightHex: 1.6, footprint: 1, ownShootStrip: true, sourcePoint: profiles[id]!.sourcePoint });
    expect(socket.calibrated).toBe(true);
    expect(socket).toMatchObject(RELEASE_SOCKETS[id]!);
    const shoot = sprites[id]?.animations['shoot'];
    expect(shoot, `${id} has its own shoot strip`).toBeTruthy();
    const ppx = shoot!.pixelsPerHex ?? sprites[id]!.pixelsPerHex;
    expect(socket.frame).toBeGreaterThanOrEqual(1);
    expect(socket.frame).toBeLessThan(shoot!.frames);
    // Inside the frame: forward of the feet within the frame's right half, below its top.
    expect(socket.x).toBeGreaterThan(0);
    expect(socket.x * ppx).toBeLessThan(shoot!.frameWidth * (1 - shoot!.anchor[0]));
    expect(socket.y).toBeGreaterThan(0.3);
    expect(socket.y * ppx).toBeLessThan(shoot!.frameHeight * shoot!.anchor[1]);
    // Released at the start of that frame of the 6-frame, 6 fps strip (1 s with the 560 ms minimum).
    expect(releaseDelayMs({ frames: shoot!.frames, fps: shoot!.fps }, 560, socket.frame)).toBeCloseTo((1000 * socket.frame) / 6, 6);
  });

  it('slingers let go one frame later than throwers (the stone is still in the pouch)', () => {
    expect(releaseDelayMs({ frames: 6, fps: 6 }, 560, RELEASE_SOCKETS['hill_slinger']!.frame)).toBe(500);
    expect(releaseDelayMs({ frames: 6, fps: 6 }, 560, RELEASE_SOCKETS['peltast']!.frame)).toBeCloseTo(333.33, 1);
    expect(releaseDelayMs(null, 560, 2)).toBe(LEGACY_RELEASE_MS);
    // A longer minimum stretches the strip, and the release with it.
    expect(releaseDelayMs({ frames: 6, fps: 12 }, 1200, 3)).toBe(600);
  });

  it('a stack drawn without its own shoot strip uses a rule from the source point and its size', () => {
    const mouth = releaseSocket('norse_lindworm', { heightHex: 2, footprint: 2, ownShootStrip: false, sourcePoint: 'mouth' });
    const hand = releaseSocket('future_archer', { heightHex: 2, footprint: 1, ownShootStrip: true, sourcePoint: 'throwing-hand-or-weapon' });
    expect(mouth.calibrated).toBe(false);
    expect(hand.calibrated).toBe(false);
    expect(mouth.y).toBeGreaterThan(hand.y);
    expect(mouth.x).toBeGreaterThan(hand.x);
    expect(hand.frame).toBe(2);
  });

  it('a socket is mirrored with the figure around its anchor (one- and two-hex units alike)', () => {
    const anchor = { x: 400, y: 500 };
    const s = RELEASE_SOCKETS['cyclops']!;
    const right = releasePoint(anchor, s, 1, HEX_W);
    const left = releasePoint(anchor, s, -1, HEX_W);
    expect(right.x - anchor.x).toBeCloseTo(s.x * HEX_W, 9);
    expect(anchor.x - left.x).toBeCloseTo(s.x * HEX_W, 9);
    expect(right.y).toBe(left.y);
    expect(anchor.y - right.y).toBeCloseTo(s.y * HEX_W, 9);
    // The throw's recoil moves the socket with the pose.
    expect(releasePoint(anchor, s, -1, HEX_W, { x: 4, y: -2 })).toEqual({ x: left.x + 4, y: left.y - 2 });
  });

  it('a missile meets the middle of the body, on the near half of a two-hex target', () => {
    const t = { x: 600, y: 400 };
    const one = contactPoint(t, { heightPx: 150, tight: false, footprint: 1, fromX: 200, hexW: HEX_W });
    const twoFromWest = contactPoint(t, { heightPx: 150, tight: false, footprint: 2, fromX: 200, hexW: HEX_W });
    const twoFromEast = contactPoint(t, { heightPx: 150, tight: false, footprint: 2, fromX: 900, hexW: HEX_W });
    expect(one.y).toBeCloseTo(400 - 150 * 0.78 * 0.5, 9);
    expect(Math.abs(one.x - t.x)).toBeLessThan(HEX_W * 0.1);
    expect(twoFromWest.x).toBeLessThan(t.x);
    expect(twoFromEast.x).toBeGreaterThan(t.x);
    expect(twoFromWest.x - t.x).toBeCloseTo(-(twoFromEast.x - t.x), 9);
    // A tightly measured frame-region figure (the campaign neutrals): half its height.
    expect(contactPoint(t, { heightPx: 150, tight: true, footprint: 1, fromX: 200, hexW: HEX_W }).y).toBeCloseTo(325, 9);
    // Never at the feet.
    expect(contactPoint(t, { heightPx: 4, tight: true, footprint: 1, fromX: 200, hexW: HEX_W }).y).toBeLessThanOrEqual(t.y - HEX_W * 0.25);
  });

  it('the same event gives the same picture every time (no random draws)', () => {
    const ev = shot('s1');
    const a = missileFor(ev, creatureOf({ s1: 'cyclops' }), profiles);
    const b = missileFor(ev, creatureOf({ s1: 'cyclops' }), profiles);
    expect(a).toEqual(b);
    const arc = arcHeight('high-ballistic', 500, HEX_W);
    expect(samplePath({ x: 0, y: 0 }, { x: 500, y: 40 }, 0.37, arc)).toEqual(samplePath({ x: 0, y: 0 }, { x: 500, y: 40 }, 0.37, arc));
  });
});
