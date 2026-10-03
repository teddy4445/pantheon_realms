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
  SITE_ARCHETYPES,
  axialPoint,
  cellPoint,
  directionOf,
  directionalStrip,
  pointAxial,
  pointCell,
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
const manifest = JSON.parse(readFileSync(path.join(runtime, 'sprites/manifest.json'), 'utf8')) as SpriteManifest;
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

function checkStrip(where: string, s: SpriteStrip): void {
  const file = path.join(runtime, s.file);
  expect(existsSync(file), `${where}: ${s.file}`).toBe(true);
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
    expect(forms.length).toBe(102);
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

  it('six pantheon map avatars and a neutral one, each with idle and walk; pantheon avatars have a hero-screen figure', () => {
    for (const p of ['greek', 'norse', 'egyptian', 'japanese', 'celtic', 'mesoamerican', 'neutral']) {
      const h = manifest.heroes[p];
      expect(h, p).toBeDefined();
      checkSet(`hero ${p}`, h!);
      expect(h!.animations['walk'], p).toBeDefined();
      if (p !== 'neutral') expect(existsSync(path.join(runtime, h!.figure!.file)), p).toBe(true);
    }
  });

  it('every map location kind has a sprite; towns have one per pantheon, pickups one per resource', () => {
    for (const k of SITE_ARCHETYPES) expect(siteSprite(k), k).not.toBeNull();
    for (const p of Object.keys(catalog.pantheons)) expect(siteSprite('town', p), p).toBe(manifest.sites[`map.site.town.${p}`]);
    for (const r of ['gold', 'wood', 'stone', 'crystal', 'favor', 'artifact']) expect(manifest.sites[`map.site.pickup.${r}`], r).toBeDefined();
    for (const section of ['sites', 'decor', 'obstacles', 'siege', 'projectiles'] as const) {
      for (const [k, d] of Object.entries(manifest[section])) {
        const [w, h] = webpSize(path.join(runtime, d.file));
        expect([w, h], `${section} ${k}`).toEqual([d.width, d.height]);
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
