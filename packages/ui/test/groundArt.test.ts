/**
 * Ground and sky art (Brief 2, delivery 2026-10-02): all 60 terrain textures,
 * 6 battlefield paintings and 10 skies resolve through the game's own manifest
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

  it('six battlefield paintings, the defaults for every climate (no variants delivered)', () => {
    for (const f of FIELDS) {
      expect(battlefieldArt(f)?.url).toBe(`./art/battle/battlefield.${f}.ground.webp`);
      expect(battlefieldArt(f, 'desert')?.url).toBe(`./art/battle/battlefield.${f}.ground.webp`);
    }
    expect(battlefieldArt('nowhere')).toBeNull();
  });

  it('runtime files exist at their registered sizes, inside assets-runtime, never upscaled', () => {
    const entries = Object.entries(report.assets).filter(([, a]) => ['terrain', 'battlefield', 'sky'].includes(a.kind));
    expect(entries).toHaveLength(76);
    for (const [id, a] of entries) {
      expect(a.file.startsWith('art/'), id).toBe(true);
      const file = path.join(runtime, a.file);
      expect(existsSync(file), a.file).toBe(true);
      expect(webpSize(file), a.file).toEqual([a.width, a.height]);
      expect(a.width).toBeLessThanOrEqual(a.source!.width);
      expect(a.height).toBeLessThanOrEqual(a.source!.height);
      expect(Math.abs(a.width / a.height - a.source!.width / a.source!.height)).toBeLessThan(0.01);
      expect(a.source!.file.startsWith('assets-source/art/final/')).toBe(true);
      if (a.kind === 'terrain') expect([a.width, a.height]).toEqual([1024, 1024]);
    }
  });

  it('the minimap keeps the brief’s terrain colours', () => {
    expect(TERRAIN_COLORS).toEqual({ plains: '#7f8f4f', forest: '#3f6136', rough: '#8c7b58', marsh: '#4d6b5c', mountain: '#6f6a64', water: '#2c5c86' });
  });
});
