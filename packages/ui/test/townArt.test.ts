/**
 * Town presentation after the 2D migration (directive §11, Phase 6): every
 * pantheon's town keeps its 2D background and exactly 18 logical building
 * locations (7 creature dwellings + 11 support buildings); every location has
 * building art on disk; a dwelling's base and upgraded images are different
 * pictures drawn at the same location (the upgrade replaces the base in place).
 */
import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCatalog } from '@pr/content';
import { resolveAsset, resolveBuildingArt, townBackground, type AssetRecord } from '../src/assets/manifest';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const catalog = buildCatalog();
const onDisk = (url: string | null) => !!url && existsSync(path.join(root, 'assets-runtime', url.replace(/^\.\//, '')));

describe('town presentation (2D background + building overlays)', () => {
  const archetypes = Object.values(catalog.townArchetypes);

  it('six pantheon towns, each with its background and exactly 18 locations: 7 dwellings and 11 support', () => {
    expect(new Set(archetypes.map((a) => a.pantheonId))).toEqual(new Set(['greek', 'norse', 'egyptian', 'japanese', 'celtic', 'mesoamerican']));
    for (const a of archetypes) {
      expect(a.slots, a.id).toHaveLength(18);
      expect(a.slots.filter((s) => s.kind === 'dwelling'), a.id).toHaveLength(7);
      expect(a.slots.filter((s) => s.kind === 'support'), a.id).toHaveLength(11);
      expect(new Set(a.slots.filter((s) => s.kind === 'dwelling').map((s) => s.tier))).toEqual(new Set([1, 2, 3, 4, 5, 6, 7]));
      expect(onDisk(resolveAsset(a.backgroundAssetId).url), a.backgroundAssetId).toBe(true);
      for (const s of a.slots) {
        const p = s.placement;
        expect(p.x >= 0 && p.x <= 100 && p.y >= 0 && p.y <= 100 && p.width > 0, `${a.id} ${s.id}`).toBe(true);
      }
    }
  });

  it('every building of every location has art on disk; base and upgraded dwellings are different pictures at one location', () => {
    for (const a of archetypes) {
      for (const s of a.slots) {
        const chain = s.chain.map((id) => catalog.buildings[id]!);
        expect(chain.length, `${a.id} ${s.id}`).toBeGreaterThan(0);
        for (const b of chain) expect(onDisk(resolveBuildingArt(b.artAssetId).url), `${a.id} ${b.id}`).toBe(true);
        if (s.kind === 'dwelling') {
          const base = chain.find((b) => b.dwelling?.form === 'base');
          const up = chain.find((b) => b.dwelling?.form === 'upgraded');
          expect(base && up, `${a.id} ${s.id} base and upgraded dwelling`).toBeTruthy();
          // Same location (one slot, one placement), two different images.
          expect(resolveBuildingArt(base!.artAssetId).url).not.toBe(resolveBuildingArt(up!.artAssetId).url);
        }
      }
    }
  });
});

describe('town painting by town hall level (Brief 17, 2026-10-06)', () => {
  const archetypes = Object.values(catalog.townArchetypes);

  it('every pantheon has its four stages on disk; levels 0–1 show the first, 2–4 their own, above 4 the fourth', () => {
    for (const a of archetypes) {
      const stage = (lv: number | undefined) => townBackground(a.backgroundAssetId, lv).id;
      for (const n of [1, 2, 3, 4]) expect(onDisk(resolveAsset(`${a.backgroundAssetId}.l${n}`).url), `${a.backgroundAssetId}.l${n}`).toBe(true);
      expect(stage(undefined)).toBe(`${a.backgroundAssetId}.l1`);
      expect(stage(0)).toBe(`${a.backgroundAssetId}.l1`);
      expect(stage(1)).toBe(`${a.backgroundAssetId}.l1`);
      expect(stage(2)).toBe(`${a.backgroundAssetId}.l2`);
      expect(stage(3)).toBe(`${a.backgroundAssetId}.l3`);
      expect(stage(4)).toBe(`${a.backgroundAssetId}.l4`);
      expect(stage(7)).toBe(`${a.backgroundAssetId}.l4`);
    }
  });

  it('a stage not delivered falls back to the first stage, then to the single painting', () => {
    const rec = (id: string, url: string | null): AssetRecord => ({ id, status: url ? 'final' : 'procedural', url, provenance: '' });
    const only = (ids: string[]) => (id: string) => rec(id, ids.includes(id) ? `./${id}.webp` : null);
    expect(townBackground('town.x.background', 3, only(['town.x.background.l1', 'town.x.background'])).id).toBe('town.x.background.l1');
    expect(townBackground('town.x.background', 3, only(['town.x.background'])).id).toBe('town.x.background');
    expect(townBackground('town.x.background', 2, only(['town.x.background.l2', 'town.x.background.l1'])).id).toBe('town.x.background.l2');
  });
});

describe('Greek coastal polis artwork', () => {
  it('keeps the accepted Greek composition and all 33 catalog variants', () => {
    const greek = catalog.townArchetypes['greek_polis']!;
    expect(greek.sceneAspectRatio).toBe(1.5);
    const buildings = greek.slots.flatMap((s) => s.chain.map((id) => catalog.buildings[id]!));
    expect(buildings).toHaveLength(33);
    for (const b of buildings) expect(resolveBuildingArt(b.artAssetId).url).toMatch(/^\.\/greek-city-h3-v1\/buildings\//);
    for (const s of greek.slots) expect(s.placement.artAspectRatio).toBeGreaterThan(0);
    for (const level of [1, 2, 3, 4]) expect(townBackground(greek.backgroundAssetId, level).url).toBe(`./greek-city-h3-v1/background.l${level}.png`);
  });
});

describe('Heroes III inspired pantheon cities', () => {
  it.each(['norse', 'egyptian', 'japanese', 'celtic', 'mesoamerican'])('%s has its complete independent art set', (p) => {
    const town = Object.values(catalog.townArchetypes).find(a => a.pantheonId === p)!;
    expect(town.sceneAspectRatio).toBe(1.5);
    const prefix = `./pantheon-cities-h3-v1/${p}/`;
    const buildings = town.slots.flatMap(s => s.chain.map(id => catalog.buildings[id]!));
    expect(buildings).toHaveLength(33);
    const files = buildings.map(b => resolveBuildingArt(b.artAssetId).url);
    expect(new Set(files).size).toBe(33);
    for (const file of files) {
      expect(file?.startsWith(prefix + 'buildings/')).toBe(true);
      expect(onDisk(file)).toBe(true);
    }
    for (const s of town.slots) expect(s.placement.artAspectRatio).toBeGreaterThan(0);
    for (const level of [1, 2, 3, 4]) {
      expect(townBackground(town.backgroundAssetId, level).url).toBe(`${prefix}background.l${level}.png`);
    }
    expect(town.damagedBackgroundAssetId).toBe(`town.${p}.background.damaged`);
    expect(resolveAsset(town.damagedBackgroundAssetId!).url).toBe(`${prefix}background.damaged.png`);
    expect(onDisk(resolveAsset(town.damagedBackgroundAssetId!).url)).toBe(true);
  });
});
