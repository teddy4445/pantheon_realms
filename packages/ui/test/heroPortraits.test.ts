/**
 * The complete hero character portraits (owner delivery 2026-10-10,
 * `docs/hero-portraits-complete`): every hero of the current catalog resolves
 * its own square portrait and its own bust through the documented
 * `.portrait → .bust` route (never a name-guessed file), the pack's files are
 * native PNGs with transparency, the existing story busts keep precedence, and
 * the art-only identities of the delivery map stay out of the catalog.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCatalog } from '@pr/content';
import { speakerBust } from '../src/assets/storyArt';
import { resolveArt, resolveAsset } from '../src/assets/manifest';
import { awaitingPortrait } from './awaitingArt';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const runtime = path.join(root, 'assets-runtime');
type Entry = { file: string; kind: string; width: number; height: number; alphaBox?: number[]; sha256?: string };
const pack = JSON.parse(readFileSync(path.join(runtime, 'hero-portraits-complete/manifest.json'), 'utf8')) as { assets: Record<string, Entry> };
const story = JSON.parse(readFileSync(path.join(runtime, 'art/manifest.json'), 'utf8')) as { assets: Record<string, Entry> };
const heroMap = JSON.parse(readFileSync(path.join(root, 'docs/hero-portraits-complete/hero-map.json'), 'utf8')) as { heroes: { heroId: string | null; portraitAssetId: string; inCurrentCatalog: boolean }[] };
const catalog = buildCatalog();

/** Width, height and colour type from a PNG header (colour type 6 = RGBA, 4 = grey + alpha). */
function pngInfo(file: string): { w: number; h: number; colorType: number } {
  const b = readFileSync(file);
  expect(b.subarray(1, 4).toString('latin1')).toBe('PNG');
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), colorType: b[25]! };
}

describe('hero character portraits', () => {
  it('every catalog hero resolves its own portrait and its own bust (portrait ID → bust ID)', () => {
    const heroes = Object.values(catalog.heroes);
    expect(heroes.length).toBeGreaterThanOrEqual(74);
    // Art still awaited from a brief (awaitingArt.ts; none since Brief 18 was imported on 2026-10-14): a generated square stands in, no bust.
    for (const h of heroes.filter((x) => awaitingPortrait(x.portraitAssetId))) {
      expect(resolveAsset(h.portraitAssetId).status, `${h.id}: delivered — empty AWAITING_BRIEF_18`).toBe('procedural');
      expect(speakerBust({ portraitAssetId: h.portraitAssetId })).toBeNull();
    }
    for (const h of heroes.filter((x) => !awaitingPortrait(x.portraitAssetId))) {
      expect(resolveAsset(h.portraitAssetId).url, `${h.id} portrait`).toBeTruthy();
      const bust = speakerBust({ portraitAssetId: h.portraitAssetId });
      expect(bust, `${h.id} bust`).not.toBeNull();
      expect(bust!.id).toBe(`${h.portraitAssetId.slice(0, -'.portrait'.length)}.bust`);
      expect(bust!.url.startsWith('./'), `${h.id}: relative URL`).toBe(true);
      expect(existsSync(path.join(runtime, bust!.url.slice(2))), `${bust!.url} exists`).toBe(true);
    }
  });

  it('the pack adds 54 busts, all native PNGs with transparency at their registered size and hash', () => {
    const ids = Object.keys(pack.assets);
    expect(ids).toHaveLength(54);
    for (const [id, a] of Object.entries(pack.assets)) {
      expect(a.kind).toBe('bust');
      expect(a.file.startsWith('hero-portraits-complete/'), `${id}: inside the pack`).toBe(true);
      expect(/^[a-z]:|^[\\/]/i.test(a.file), `${id}: no absolute path`).toBe(false);
      const info = pngInfo(path.join(runtime, a.file));
      expect([info.w, info.h], `${id} size`).toEqual([a.width, a.height]);
      expect([4, 6], `${id} keeps its alpha channel`).toContain(info.colorType);
      expect(resolveArt(id)?.url).toBe(`./${a.file}`);
    }
    // The chosen Abe no Seimei cut is the manifest's file (bust-v2), under the logical .bust ID.
    expect(pack.assets['hero.japanese.abe_no_seimei.bust']?.file).toMatch(/abe_no_seimei\.bust-v2\.png$/);
  });

  it('the story-art busts keep precedence: the pack never replaces a delivered bust', () => {
    for (const id of Object.keys(pack.assets)) expect(story.assets[id], `${id} was missing before`).toBeUndefined();
    const existing = Object.keys(story.assets).filter((k) => story.assets[k]!.kind === 'bust');
    for (const id of existing) expect(resolveArt(id)?.url).toBe(`./${story.assets[id]!.file}`);
  });

  it('art-only identities of the delivery map are not catalog heroes (nothing becomes hireable because art exists)', () => {
    const artOnly = heroMap.heroes.filter((h) => !h.inCurrentCatalog);
    expect(artOnly.length).toBeGreaterThan(0);
    for (const h of artOnly) {
      expect(h.heroId).toBeNull();
      expect(Object.values(catalog.heroes).some((d) => d.portraitAssetId === h.portraitAssetId), `${h.portraitAssetId} not a catalog hero`).toBe(false);
    }
  });
});
