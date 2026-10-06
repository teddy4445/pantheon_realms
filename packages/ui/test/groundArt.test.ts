/**
 * Ground and sky art (Brief 2, delivery 2026-10-02): all 60 terrain textures,
 * 6 battlefield paintings (and, since 2026-10-04, their 54 climate variants) and 10 skies resolve through the game's own manifest
 * for every map climate; runtime files exist at the registered sizes; nothing was
 * upscaled; seams are not claimed (mirrored repeat until verified).
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCatalog } from '@pr/content';
import { TERRAIN_COLORS, battlefieldArt, skyArt, terrainArt } from '@pr/presentation/core';
import type { Terrain } from '@pr/rules';
import '../src/assets/manifest';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const runtime = path.join(root, 'assets-runtime');
type Entry = { file: string; kind: string; width: number; height: number; wrap?: string; source?: { width: number; height: number; file: string } };
const report = JSON.parse(readFileSync(path.join(root, 'assets-source/art/IMPORT_REPORT.json'), 'utf8')) as { assets: Record<string, Entry> };

const CLIMATES = ['temperate', 'high_pass', 'coast', 'storm_plateau', 'desert', 'tundra', 'jungle', 'moor', 'fjord', 'autumn'];
const GROUNDS: Terrain[] = ['plains', 'forest', 'rough', 'marsh', 'mountain', 'water'];
const FIELDS = ['open_field', 'coast_road', 'ridge_pass', 'grove', 'plateau', 'beacon_clearing'];

function webpSize(file: string): [number, number] {
  const b = readFileSync(file);
  expect(b.toString('latin1', 8, 12)).toBe('WEBP');
  const cc = b.toString('latin1', 12, 16);
  if (cc === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  if (cc === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  const bits = b.readUInt32LE(21);
  return [(bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1];
}

describe('ground and sky art', () => {
  it('every map climate has all six ground textures and a sky', () => {
    const catalog = buildCatalog();
    const used = new Set(Object.values(catalog.mapTemplates).map((t) => t.biome));
    for (const c of used) expect(CLIMATES, c).toContain(c);
    for (const c of CLIMATES) {
      for (const g of GROUNDS) {
        const a = terrainArt(c, g);
        expect(a, `${c}/${g}`).not.toBeNull();
        expect(a!.url).toBe(`./art/terrain/terrain.${c}.${g}.webp`);
        expect(a!.wrap, 'seams are not verified yet: mirrored repeat').toBe('mirror');
      }
      expect(skyArt(c)?.url).toBe(`./art/sky/sky.${c}.webp`);
    }
    // A climate without its own sky falls back to the temperate one.
    expect(skyArt('nowhere')?.url).toBe('./art/sky/sky.temperate.webp');
    expect(terrainArt('nowhere', 'plains')).toBeNull();
  });

  it('six battlefield paintings, each with a painting for every other climate (delivery 2026-10-04); temperate and unknown climates use the default', () => {
    for (const f of FIELDS) {
      expect(battlefieldArt(f)?.url).toBe(`./art/battle/battlefield.${f}.ground.webp`);
      expect(battlefieldArt(f, 'temperate')?.url).toBe(`./art/battle/battlefield.${f}.ground.webp`);
      expect(battlefieldArt(f, 'nowhere')?.url).toBe(`./art/battle/battlefield.${f}.ground.webp`);
      for (const c of CLIMATES.filter((x) => x !== 'temperate')) expect(battlefieldArt(f, c)?.url, `${f}/${c}`).toBe(`./art/battle/battlefield.${f}.ground.${c}.webp`);
    }
    expect(battlefieldArt('nowhere')).toBeNull();
  });

  it('the 54 climate paintings exist at their registered sizes, in the proportions of the 4096 × 3200 layout', () => {
    const art = JSON.parse(readFileSync(path.join(runtime, 'art/manifest.json'), 'utf8')) as { assets: Record<string, Entry> };
    const variants = Object.entries(art.assets).filter(([id]) => /^battlefield\.[a-z_]+\.ground\.[a-z_]+$/.test(id) && !id.startsWith('battlefield.siege.'));
    expect(variants).toHaveLength(54);
    for (const [id, a] of variants) {
      expect(a.kind, id).toBe('battlefield');
      const file = path.join(runtime, a.file);
      expect(existsSync(file), a.file).toBe(true);
      expect(webpSize(file), a.file).toEqual([a.width, a.height]);
      expect(Math.abs(a.width / a.height - 4096 / 3200), id).toBeLessThan(0.01);
    }
  });

  it('the six siege battlefields (Brief 15) are registered per pantheon, in the layout\'s proportions, never enlarged', () => {
    const art = JSON.parse(readFileSync(path.join(runtime, 'art/manifest.json'), 'utf8')) as { assets: Record<string, Entry> };
    for (const p of ['greek', 'norse', 'egyptian', 'japanese', 'celtic', 'mesoamerican']) {
      const id = `battlefield.siege.ground.${p}`;
      const a = art.assets[id];
      expect(a, id).toBeTruthy();
      expect(a!.kind).toBe('battlefield');
      expect(webpSize(path.join(runtime, a!.file)), a!.file).toEqual([a!.width, a!.height]);
      // Delivered below the brief's 4096 x 3200 (accepted resolution exception); the game stretches them over the same layout.
      expect(Math.abs(a!.width / a!.height - 4096 / 3200), id).toBeLessThan(0.01);
      expect(a!.width).toBeLessThanOrEqual(report.assets[id]!.source!.width);
    }
  });

  it('runtime files exist at their registered sizes, inside assets-runtime, never upscaled', () => {
    const entries = Object.entries(report.assets).filter(([, a]) => ['terrain', 'battlefield', 'sky'].includes(a.kind));
    // 60 terrains, 10 skies, 6 battlefields, their 54 climate variants and the 6 siege battlefields (Brief 15).
    expect(entries).toHaveLength(60 + 10 + 6 + 54 + 6);
    for (const [id, a] of entries) {
      expect(a.file.startsWith('art/'), id).toBe(true);
      const file = path.join(runtime, a.file);
      expect(existsSync(file), a.file).toBe(true);
      expect(webpSize(file), a.file).toEqual([a.width, a.height]);
      if (a.kind === 'terrain') expect([a.width, a.height]).toEqual([1024, 1024]);
      // Runtime files whose master is not in this checkout are listed without a source (the importer keeps them as they are).
      if (!a.source) continue;
      expect(a.width).toBeLessThanOrEqual(a.source!.width);
      expect(a.height).toBeLessThanOrEqual(a.source!.height);
      expect(Math.abs(a.width / a.height - a.source!.width / a.source!.height)).toBeLessThan(0.01);
      expect(a.source!.file.startsWith('assets-source/art/final/')).toBe(true);
    }
  });

  it('the minimap keeps the brief’s terrain colours', () => {
    // `void` (cells outside a square random map) is black, like the space around every map (2026-10-04).
    expect(TERRAIN_COLORS).toEqual({ plains: '#7f8f4f', forest: '#3f6136', rough: '#8c7b58', marsh: '#4d6b5c', mountain: '#6f6a64', water: '#2c5c86', void: '#000000' });
  });
});
