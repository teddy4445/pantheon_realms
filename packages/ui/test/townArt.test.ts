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
import { resolveAsset, resolveBuildingArt } from '../src/assets/manifest';

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
