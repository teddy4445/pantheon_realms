/**
 * The 2D sprite manifest and its lookup (sprites.ts, hexmath.ts): every
 * creature form, map avatar, map location, decoration, obstacle, siege piece,
 * projectile and effect the views draw is registered with a status and
 * provenance; every file exists at the size its strip declares; anchors are
 * explicit; the animations a creature needs follow its gameplay content; a
 * missing optional animation falls back gracefully; and the hex transforms
 * round-trip, so sprite sizes cannot change which hex a click selects.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCatalog } from '@pr/content';
import {
  ANIMATION_FALLBACK,
  BASE_ANIMATIONS,
  FIGURE_SITE_ARCHETYPES,
  SITE_ARCHETYPES,
  STATE_SITE_ARCHETYPES,
  axialPoint,
  cellPoint,
  directionOf,
  directionalStrip,
  pointAxial,
  pointCell,
  regionsInside,
  registerSpriteManifest,
  requiredAnimations,
  resolveAnimation,
  siteSprite,
  type SpriteManifest,
  type SpriteSetDefinition,
  type SpriteStrip,
} from '../src/core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const runtime = path.join(root, 'assets-runtime');
const baseManifest = JSON.parse(readFileSync(path.join(runtime, 'sprites/manifest.json'), 'utf8')) as SpriteManifest;
/** The campaign expansion kit (2026-10-15) adds the six new neutrals' frame-region atlases, merged as the UI does (ui/src/assets/manifest.ts). */
const kit = JSON.parse(readFileSync(path.join(runtime, 'campaign-v2/manifest.json'), 'utf8')) as { creatures: SpriteManifest['creatures'] };
/** The battle FX & neutral upgrades delivery (2026-10-15) adds the six upgraded neutrals' sets, merged the same way. */
const upgrades = JSON.parse(readFileSync(path.join(runtime, 'battle-fx-neutral-upgrades-v1/manifest.json'), 'utf8')) as { creatures: SpriteManifest['creatures'] };
const manifest: SpriteManifest = { ...baseManifest, creatures: { ...baseManifest.creatures, ...kit.creatures, ...upgrades.creatures } };
registerSpriteManifest(manifest);
const catalog = buildCatalog();

function webpSize(file: string): [number, number] {
  const b = readFileSync(file);
  expect(b.toString('latin1', 8, 12)).toBe('WEBP');
  const cc = b.toString('latin1', 12, 16);
  if (cc === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  if (cc === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  const bits = b.readUInt32LE(21);
  return [(bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1];
}

function pngSize(file: string): [number, number] {
  const b = readFileSync(file);
  expect(b.toString('latin1', 1, 4)).toBe('PNG');
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

function checkStrip(where: string, s: SpriteStrip): void {
  const file = path.join(runtime, s.file);
  expect(existsSync(file), `${where}: ${s.file}`).toBe(true);
  if (s.regions) {
    // A frame-region atlas (campaign expansion kit): measured rectangles inside the native atlas, never a grid.
    const [aw, ah] = file.endsWith('.png') ? pngSize(file) : webpSize(file);
    expect(regionsInside(s, aw, ah), `${where} regions inside ${aw}x${ah}`).toBe(true);
    expect(s.regions.length, where).toBe(s.frames);
    for (const r of s.regions) {
      // The pixel anchor (ground point) lies within its rectangle; one scale per animation (never per frame).
      expect(r.anchor[0] >= 0 && r.anchor[0] <= r.rect[2] && r.anchor[1] >= 0 && r.anchor[1] <= r.rect[3], `${where} anchor`).toBe(true);
      expect(r.sourceScale, where).toBe(s.regions[0]!.sourceScale);
    }
    expect(s.fps, where).toBeGreaterThan(0);
    return;
  }
  const [w, h] = webpSize(file);
  expect(w, `${where} width`).toBe(s.frames * s.frameWidth);
  expect(h, `${where} height`).toBe(s.frameHeight);
  expect(s.frames, where).toBeGreaterThanOrEqual(1);
  expect(s.fps, where).toBeGreaterThan(0);
  for (const a of s.anchor) expect(a >= 0 && a <= 1, `${where} anchor`).toBe(true);
}

function checkSet(where: string, set: SpriteSetDefinition): void {
  expect(['final', 'placeholder'], where).toContain(set.status);
  expect(set.provenance.length, where).toBeGreaterThan(10);
  expect(set.facing).toBe('right');
  expect(set.pixelsPerHex, where).toBeGreaterThan(0);
  expect(set.animations['idle'], `${where} idle`).toBeDefined();
  for (const [name, a] of Object.entries(set.animations)) {
    checkStrip(`${where}.${name}`, a!);
    for (const [dir, d] of Object.entries(a!.directions ?? {})) checkStrip(`${where}.${name}.${dir}`, d!);
  }
}

describe('sprite manifest', () => {
  it('every creature form of the catalog has a sprite set whose required animations all resolve', () => {
    const forms = Object.values(catalog.creatures).filter((c) => !!c.stats);
    // 102 pantheon and legacy neutral forms, plus the six expansion neutrals and their six upgrades (2026-10-15),
    // plus the ten sea forms (sea-creature delivery 2026-10-17).
    expect(forms.length).toBe(124);
    for (const c of forms) {
      const set = manifest.creatures[c.id];
      expect(set, c.id).toBeDefined();
      checkSet(c.id, set!);
      // Every animation draws a strip (own or stand-in); without a death strip the view lays the figure down itself.
      for (const a of requiredAnimations(catalog, c)) if (a !== 'death' || set!.animations['death']) expect(resolveAnimation(set!, a), `${c.id} ${a}`).not.toBeNull();
      // A placeholder never claims to be final, and a final set carries every animation its content needs.
      if (set!.status === 'final') for (const a of requiredAnimations(catalog, c)) expect(set!.animations[a], `${c.id} final ${a}`).toBeDefined();
    }
  });

  it('the six new neutrals draw their native atlases by measured regions; Pegasus flies without the clipped takeoff pose', () => {
    for (const id of ['pegasus', 'root_runner', 'serpopard', 'baku', 'afanc', 'ahuitzotl']) {
      const set = manifest.creatures[id]!;
      expect(set.status, id).toBe('final');
      for (const name of ['idle', 'move', 'attack', 'defend', 'hit', 'death']) {
        const a = set.animations[name as keyof typeof set.animations]!;
        expect(a.regions?.length, `${id} ${name}`).toBe(4);
        expect(a.file.startsWith('campaign-v2/'), id).toBe(true);
      }
      // Victory and ability are aliases of authored core poses (same atlas rectangles), not new frames.
      const rects = (n: string) => set.animations[n as keyof typeof set.animations]!.regions!.map((r) => r.rect.join(','));
      expect(rects('victory'), `${id} victory`).toEqual(rects('idle'));
      // Ability aliases defend for Pegasus, Baku and Afanc and attack for the others (kit animation-manifest.json).
      expect(rects('ability'), `${id} ability`).toEqual(rects(['pegasus', 'baku', 'afanc'].includes(id) ? 'defend' : 'attack'));
    }
    const peg = manifest.creatures['pegasus']!;
    const cells = (n: string) => peg.animations[n as keyof typeof peg.animations]!.regions!.map((r) => r.sourceCell!.join(','));
    // 3 takeoff + 4 fly + 4 landing: the top-row third flight pose [0,2] is excluded (handoff: clipped wing).
    expect(cells('takeoff')).toEqual(['0,0', '0,1', '0,3']);
    expect(cells('fly')).toHaveLength(4);
    expect(cells('landing')).toHaveLength(4);
    // The flight atlas is drawn at its starting visual match (.62) to the core atlas, constant across the three phases.
    for (const n of ['takeoff', 'fly', 'landing']) for (const r of peg.animations[n as keyof typeof peg.animations]!.regions!) expect(r.sourceScale).toBeCloseTo(0.62);
  });

  it('the six upgraded neutrals draw their delivered atlases by measured regions at the base body scale; Dawncrest flight keeps one scale', () => {
    const pairs: Record<string, string> = { pegasus: 'dawncrest_pegasus', root_runner: 'crownroot_runner', serpopard: 'crested_serpopard', baku: 'dreamtusk_baku', afanc: 'ridgeback_afanc', ahuitzotl: 'crownfin_ahuitzotl' };
    for (const [baseId, id] of Object.entries(pairs)) {
      const def = catalog.creatures[id]!;
      expect(def.form, id).toBe('upgraded');
      expect(def.baseId, id).toBe(baseId);
      const set = manifest.creatures[id]!;
      expect(set.status, id).toBe('final');
      for (const name of ['idle', 'move', 'attack', 'defend', 'hit', 'death']) {
        const a = set.animations[name as keyof typeof set.animations]!;
        expect(a.regions?.length, `${id} ${name}`).toBe(4);
        expect(a.file.startsWith('battle-fx-neutral-upgrades-v1/atlas-'), id).toBe(true);
        // One scale for the whole core atlas: no per-frame normalisation (no size pulsing).
        for (const r of a.regions!) expect(r.sourceScale, `${id} ${name}`).toBe(1);
      }
      // The corrected Ahuitzotl sheet only (the first one was rejected).
      if (id === 'crownfin_ahuitzotl') expect(set.animations.idle!.file).toBe('battle-fx-neutral-upgrades-v1/atlas-crownfin_ahuitzotl-v2.png');
      const rects = (n: string) => set.animations[n as keyof typeof set.animations]!.regions!.map((r) => r.rect.join(','));
      expect(rects('victory'), `${id} victory`).toEqual(rects('idle'));
      expect(rects('ability'), `${id} ability`).toEqual(rects(['pegasus', 'baku', 'afanc'].includes(baseId) ? 'defend' : 'attack'));
      // The starting body scale: 82 % of the native art relative to the base registration (pixels per hex / 0.82),
      // except the two bodies calibrated in game (2026-10-16, tools/assets/import_battle_fx_upgrades.py CALIBRATION).
      const calibrated: Record<string, number> = { dawncrest_pegasus: 130, dreamtusk_baku: 128 };
      if (calibrated[id]) expect(set.pixelsPerHex, id).toBe(calibrated[id]);
      else expect(set.pixelsPerHex / manifest.creatures[baseId]!.pixelsPerHex, id).toBeCloseTo(1 / 0.82, 2);
    }
    const peg = manifest.creatures['dawncrest_pegasus']!;
    for (const n of ['takeoff', 'fly', 'landing']) {
      const a = peg.animations[n as keyof typeof peg.animations]!;
      expect(a.file).toBe('battle-fx-neutral-upgrades-v1/atlas-dawncrest_pegasus-flight.png');
      // Delivered at 0.65; calibrated in game to 0.78 so the body keeps its ground-pose size in flight.
      for (const r of a.regions!) expect(r.sourceScale, n).toBeCloseTo(0.78);
    }
    expect(peg.animations.fly!.loop).toBe(true);
    expect(peg.animations.takeoff!.loop).toBe(false);
    expect(peg.animations.landing!.loop).toBe(false);
    // Only the Pegasus pair flies.
    for (const id of Object.values(pairs)) expect(requiredAnimations(catalog, catalog.creatures[id]!).includes('fly'), id).toBe(id === 'dawncrest_pegasus');
  });

  it('six pantheon map avatars and a neutral one, each with idle and walk; pantheon avatars have a hero-screen figure', () => {
    for (const p of ['greek', 'norse', 'egyptian', 'japanese', 'celtic', 'mesoamerican', 'neutral']) {
      const h = manifest.heroes[p];
      expect(h, p).toBeDefined();
      checkSet(`hero ${p}`, h!);
      expect(h!.animations['walk'], p).toBeDefined();
      if (p !== 'neutral') expect(existsSync(path.join(runtime, h!.figure!.file)), p).toBe(true);
    }
  });

  it('Brief 11: every pantheon avatar has prepare and cast, five drawn directions, 6 frames at 6 fps played once; the west mirrors the east on the same ground anchor', () => {
    for (const p of ['greek', 'norse', 'egyptian', 'japanese', 'celtic', 'mesoamerican']) {
      const h = manifest.heroes[p]!;
      const idle = h.animations['idle']!;
      for (const name of ['prepare', 'cast']) {
        const a = h.animations[name];
        expect(a, `${p} ${name}`).toBeDefined();
        expect(Object.keys(a!.directions ?? {}).sort(), `${p} ${name}`).toEqual(['e', 'n', 'ne', 's', 'se']);
        for (const d of Object.values(a!.directions!)) {
          expect(d!.frames, `${p} ${name}`).toBe(6);
          expect(d!.fps, `${p} ${name}`).toBe(6);
          expect(d!.loop, `${p} ${name}`).toBe(false);
          // Its own frame size and scale (not the idle strip's), calibrated to the same pixels per hex.
          expect(d!.pixelsPerHex ?? a!.pixelsPerHex ?? h.pixelsPerHex, `${p} ${name}`).toBe(idle.pixelsPerHex ?? h.pixelsPerHex);
          expect(d!.anchor[1], `${p} ${name}`).toBeGreaterThan(0.75);
        }
        for (const [w, e] of [['w', 'e'], ['nw', 'ne'], ['sw', 'se']] as const) {
          const m = directionalStrip(a!, w);
          expect(m.mirror, `${p} ${name} ${w}`).toBe(true);
          expect(m.strip, `${p} ${name} ${w}`).toBe(a!.directions![e]);
        }
        expect(directionalStrip(a!, 'n')).toEqual({ strip: a!.directions!.n, mirror: false });
      }
    }
  });

  it('every map location kind has a sprite; towns have one per pantheon, pickups one per resource', () => {
    // A kind painted only per state (the campaign-v2 sluice) is checked in v2Sites.test.ts with the kit's manifest.
    for (const k of SITE_ARCHETYPES) if (!STATE_SITE_ARCHETYPES[k] && !FIGURE_SITE_ARCHETYPES.includes(k)) expect(siteSprite(k), k).not.toBeNull();
    for (const p of Object.keys(catalog.pantheons)) expect(siteSprite('town', p), p).toBe(manifest.sites[`map.site.town.${p}`]);
    for (const r of ['gold', 'wood', 'stone', 'crystal', 'favor', 'artifact']) expect(manifest.sites[`map.site.pickup.${r}`], r).toBeDefined();
    for (const section of ['sites', 'decor', 'obstacles', 'siege', 'projectiles'] as const) {
      for (const [k, d] of Object.entries(manifest[section])) {
        // The sea-creature delivery's missile stills are its native PNG atlases (never re-encoded).
        const [w, h] = d.file.endsWith('.png') ? pngSize(path.join(runtime, d.file)) : webpSize(path.join(runtime, d.file));
        // A still cut from an atlas by its rectangle (`frame`): the rectangle lies inside and is the declared size.
        if (d.frame) {
          expect(d.frame[0] + d.frame[2] <= w && d.frame[1] + d.frame[3] <= h, `${section} ${k} frame inside`).toBe(true);
          expect([d.frame[2], d.frame[3]], `${section} ${k}`).toEqual([d.width, d.height]);
        } else expect([w, h], `${section} ${k}`).toEqual([d.width, d.height]);
        expect(d.pixelsPerHex, k).toBeGreaterThan(0);
        expect(['final', 'placeholder'], k).toContain(d.status);
      }
    }
  });

  it('decoration, obstacles, siege pieces, projectiles and effects the views draw are all registered', () => {
    for (const k of ['pine', 'tree', 'rock', 'shrub', 'grass', 'mountain']) expect(manifest.decor[k], k).toBeDefined();
    for (const k of ['rock', 'boulder', 'log', 'tree', 'stump', 'column', 'stone_circle']) expect(manifest.obstacles[k], k).toBeDefined();
    for (const kind of ['wall', 'gate', 'tower', 'keep']) for (const st of ['intact', 'damaged', 'rubble']) expect(manifest.siege[`${kind}.${st}`], `${kind}.${st}`).toBeDefined();
    for (const k of ['arrow', 'stone']) expect(manifest.projectiles[k], k).toBeDefined();
    for (const k of ['impact', 'spell.damage', 'spell.area', 'spell.heal', 'spell.buff', 'spell.curse', 'ward', 'morale.up', 'morale.down']) {
      expect(manifest.effects[k], k).toBeDefined();
      checkStrip(k, manifest.effects[k]!);
    }
  });
});

describe('animation vocabulary', () => {
  it('requirements follow gameplay content: shoot for shooters, take-off/fly/land for Flight, ability for an active ability, never cast', () => {
    const peltast = requiredAnimations(catalog, catalog.creatures['peltast']!);
    expect(peltast).toEqual(['idle', 'move', 'attack', 'shoot', 'defend', 'hit', 'death', 'victory']);
    const griffin = requiredAnimations(catalog, catalog.creatures['griffin']!);
    expect(griffin).toEqual([...BASE_ANIMATIONS, 'takeoff', 'fly', 'landing']);
    expect(requiredAnimations(catalog, catalog.creatures['hoplite']!)).toEqual([...BASE_ANIMATIONS]);
    for (const c of Object.values(catalog.creatures)) {
      if (!c.stats) continue;
      const req = requiredAnimations(catalog, c);
      expect(req.includes('shoot'), c.id).toBe(c.stats.shots > 0);
      expect(req).not.toContain('cast');
      const active = c.abilityIds.some((id) => catalog.abilities[id]?.activation === 'active');
      expect(req.includes('ability'), c.id).toBe(active);
    }
  });

  it('a missing optional animation falls back gracefully; nothing to draw is reported as null', () => {
    const strip = (file: string): SpriteStrip => ({ file, frames: 1, frameWidth: 10, frameHeight: 10, fps: 4, loop: true, anchor: [0.5, 0.9] });
    const set: SpriteSetDefinition = { status: 'placeholder', provenance: 'test fixture set', facing: 'right', pixelsPerHex: 10, animations: { idle: strip('i'), attack: strip('a') } };
    expect(resolveAnimation(set, 'shoot')).toMatchObject({ name: 'attack', fallback: true });
    expect(resolveAnimation(set, 'ability')).toMatchObject({ name: 'attack', fallback: true });
    expect(resolveAnimation(set, 'fly')).toMatchObject({ name: 'idle', fallback: true });
    expect(resolveAnimation(set, 'attack')).toMatchObject({ name: 'attack', fallback: false });
    expect(resolveAnimation(set, 'death')).toBeNull(); // the view lays the figure down itself
    expect(resolveAnimation({ ...set, animations: {} }, 'idle')).toBeNull();
    expect(resolveAnimation(null, 'idle')).toBeNull();
    for (const chain of Object.values(ANIMATION_FALLBACK)) for (const n of chain) expect(Object.keys(ANIMATION_FALLBACK)).toContain(n);
  });

  it('map avatars: a direction strip when delivered, else the right-facing strip mirrored for the west', () => {
    const s = (file: string): SpriteStrip => ({ file, frames: 4, frameWidth: 10, frameHeight: 10, fps: 8, loop: true, anchor: [0.5, 0.95] });
    const side = { ...s('side') };
    expect(directionalStrip(side, 'e')).toEqual({ strip: side, mirror: false });
    expect(directionalStrip(side, 'w').mirror).toBe(true);
    expect(directionalStrip(side, 'nw').mirror).toBe(true);
    expect(directionalStrip(side, 'n').mirror).toBe(false);
    const eight = { ...s('base'), directions: { e: s('e'), ne: s('ne'), n: s('n'), s: s('s'), se: s('se') } };
    expect(directionalStrip(eight, 'n').strip.file).toBe('n');
    expect(directionalStrip(eight, 'w')).toEqual({ strip: eight.directions.e, mirror: true });
    expect(directionalStrip(eight, 'nw')).toEqual({ strip: eight.directions.ne, mirror: true });
  });
});

describe('hex transforms', () => {
  it('map hexes and battle cells round-trip through the screen plane (picking never depends on sprite size)', () => {
    for (let q = 0; q < 30; q++) for (let r = 0; r < 30; r++) {
      const p = axialPoint({ q, r }, 36);
      expect(pointAxial(p.x, p.y, 36)).toEqual({ q, r });
      expect(pointAxial(p.x + 12, p.y - 9, 36)).toEqual({ q, r }); // inside the hex
    }
    for (let col = 0; col < 15; col++) for (let row = 0; row < 11; row++) {
      const p = cellPoint({ col, row }, 40);
      expect(pointCell(p.x, p.y, 40)).toEqual({ col, row });
    }
    // Odd battle rows are shifted half a hex to the right; rows go down the screen.
    expect(cellPoint({ col: 3, row: 1 }).x).toBeGreaterThan(cellPoint({ col: 3, row: 0 }).x);
    expect(cellPoint({ col: 3, row: 1 }).y).toBeGreaterThan(cellPoint({ col: 3, row: 0 }).y);
  });

  it('map directions follow the screen (east right, north up)', () => {
    expect(directionOf(1, 0)).toBe('e');
    expect(directionOf(-1, 0)).toBe('w');
    expect(directionOf(0, -1)).toBe('n');
    expect(directionOf(0, 1)).toBe('s');
    expect(directionOf(1, -1)).toBe('ne');
    expect(directionOf(-1, 1)).toBe('sw');
  });
});
