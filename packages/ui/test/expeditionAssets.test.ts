/**
 * The expedition, naval & siege kit of 2026-10-17 (`npm run expedition:import`): the 13 new pictures,
 * 3 overlays and 28 controls are registered under their kit IDs (`expedition.*`) with relative files
 * that exist at their native size and delivered bytes; the ship and wagon reach the presentation's
 * sprite manifest as map tokens with six headings (E/NE/SE painted, W/NW/SW mirrored); the controls
 * are Icon glyphs drawn from the kit's own paths without replacing an existing icon; and every one of
 * the kit's 405 reused IDs (reuse-manifest.json) already resolves through the game's existing
 * registrations — none is registered a second time. Files and registrations only.
 */
import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MAP_TOKEN_HEADINGS, mapTokenPicture, mapTokenScale, mirroredAnchor, flagMount, spriteManifest, tokenHeading, headingFromMapDirection, cellPoint } from '@pr/presentation/core';
import { expeditionArt, expeditionIds, resolveAsset, resolveEnvironmentArt } from '../src/assets/manifest';
import { guiArt } from '../src/assets/guiArt';
import { EXPEDITION_ICONS, ICON_ART, ICON_NAMES, Icon, iconArt, type IconName } from '../src/assets/icons';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const runtime = path.join(root, 'assets-runtime');
const source = path.join(root, 'assets-source/expedition-v1');
const read = <T,>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T;
const sha = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex');
const png = (file: string) => {
  const d = readFileSync(file);
  expect(d.subarray(1, 4).toString('latin1'), file).toBe('PNG');
  return { w: d.readUInt32BE(16), h: d.readUInt32BE(20), colorType: d[25]! };
};

interface KitAsset { id: string; file: string; width: number; height: number; sha256: string; alphaRange: [number, number]; visibleBoundsNormalized: number[]; groundAnchor?: number[] }
const kit = read<{ assets: KitAsset[] }>(path.join(source, 'asset-manifest.json')).assets;
const kitIcons = read<{ icons: { id: string; file: string }[] }>(path.join(source, 'design/icon-manifest.json')).icons;
const runtimeManifest = read<{ assets: Record<string, { file: string; kind: string; width: number; height: number; iconName?: string }>; mapTokens: Record<string, unknown> }>(path.join(runtime, 'expedition-v1/manifest.json'));

describe('expedition kit: new pictures', () => {
  it('registers the 13 pictures by kit ID: relative files at native size, the delivered bytes, alpha kept', () => {
    expect(kit).toHaveLength(13);
    for (const a of kit) {
      const art = expeditionArt(a.id);
      expect(art, a.id).not.toBeNull();
      expect(art!.url).toBe(`./expedition-v1/${path.basename(a.file)}`);
      expect(art!.url).not.toMatch(/[a-z]:|\\|\.\.|blannder/i);
      const file = path.join(runtime, art!.url.slice(2));
      expect(existsSync(file), file).toBe(true);
      const s = png(file);
      expect([s.w, s.h], a.id).toEqual([a.width, a.height]);
      expect([art!.width, art!.height]).toEqual([a.width, a.height]);
      expect(sha(file), `${a.id} is the delivered file`).toBe(a.sha256);
      if (a.alphaRange[0] < 255) expect([4, 6], `${a.id} keeps its alpha channel`).toContain(s.colorType);
      expect(art!.visibleBounds).toEqual(a.visibleBoundsNormalized);
      if (a.groundAnchor) expect(art!.groundAnchor).toEqual(a.groundAnchor);
      const rec = resolveAsset(a.id);
      expect(rec.status).toBe('final');
      expect(rec.url).toBe(art!.url);
      // The source master sits beside it, byte for byte.
      expect(sha(path.join(source, a.file))).toBe(a.sha256);
    }
    // The boarding painting stays at its native 1672 × 941 (below full HD; never enlarged).
    expect(expeditionArt('expedition.boarding-battle')).toMatchObject({ width: 1672, height: 941, kind: 'battlefield' });
    expect(expeditionArt('expedition.catapult-damaged')!.kind).toBe('siege-variant');
    expect(expeditionArt('expedition.catapult-destroyed')!.groundAnchor).not.toBeNull();
  });

  it('registers the 3 overlays and the 28 controls, and nothing else; the runtime folder holds no reference material', () => {
    const ids = expeditionIds().sort();
    const expected = [...kit.map((a) => a.id), ...kitIcons.map((i) => i.id), 'expedition.overlay.flag-template', 'expedition.overlay.wake', 'expedition.overlay.destination-ring'].sort();
    expect(ids).toEqual(expected);
    for (const id of ids) {
      const a = expeditionArt(id)!;
      expect(existsSync(path.join(runtime, a.url.slice(2))), id).toBe(true);
      expect(id.startsWith('expedition.')).toBe(true);
    }
    const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(path.join(dir, e.name)).map((f) => `${e.name}/${f}`) : [e.name]));
    const present = files(path.join(runtime, 'expedition-v1')).sort();
    expect(present.filter((f) => /reuse|reference|preview|index\.html/i.test(f))).toEqual([]);
    expect(present).toHaveLength(13 + 3 + 28 + 1);
  });

  it('adds no ID any other manifest already registers', () => {
    const others = ['ui/manifest.json', 'ui/final-manifest.json', 'art/manifest.json', 'sprites/manifest.json', 'placeholders/manifest.json', 'campaign-v2/manifest.json', 'battle-fx-neutral-upgrades-v1/manifest.json', 'recruitment-route-v1/manifest.json'];
    for (const m of others) expect(readFileSync(path.join(runtime, m), 'utf8').includes('"expedition.'), m).toBe(false);
  });
});

describe('expedition kit: map tokens in the sprite manifest', () => {
  it('the ship and the wagon draw all six headings: E/NE/SE painted, W/NW/SW the same pictures mirrored', () => {
    const tokens = spriteManifest().mapTokens ?? {};
    expect(Object.keys(tokens).sort()).toEqual(['ship', 'ship-wreck', 'wagon']);
    for (const kind of ['ship', 'wagon'] as const) {
      for (const h of MAP_TOKEN_HEADINGS) {
        const t = mapTokenPicture(kind, h)!;
        expect(t, `${kind} ${h}`).not.toBeNull();
        const painted = h.replace(/^w$/, 'e').replace(/^nw$/, 'ne').replace(/^sw$/, 'se');
        expect(t.picture.assetId).toBe(`expedition.${kind}-${painted}`);
        expect(t.flipX).toBe(h.includes('w'));
        expect(t.url).toBe(`./expedition-v1/${kind}-${painted}.png`);
        expect(existsSync(path.join(runtime, t.url.slice(2)))).toBe(true);
        const [x] = mirroredAnchor(t.picture, t.flipX);
        expect(x).toBeCloseTo(t.flipX ? 1 - t.picture.groundAnchor[0] : t.picture.groundAnchor[0]);
        // Sized by what shows: the visible part spans the display width (≈ 1.2 hexes), not the canvas.
        const scale = mapTokenScale(t.picture, 100, t.def.displayHexWidths);
        expect((t.picture.visibleBounds[2] - t.picture.visibleBounds[0]) * t.picture.width * scale).toBeCloseTo(120, 5);
      }
    }
    const wreck = mapTokenPicture('ship-wreck', 'w')!;
    expect(wreck.picture.assetId).toBe('expedition.ship-wreck');
    expect(wreck.flipX).toBe(true);
    // The flag mount follows a mirrored hull (x → 1 − x); the flag itself is never mirrored.
    const ship = mapTokenPicture('ship', 'e')!.def;
    expect(flagMount(ship, false)).toEqual([0.52, 0.08]);
    expect(flagMount(ship, true)![0]).toBeCloseTo(0.48);
  });

  it('picks the heading from the projected travel between neighbouring hexes', () => {
    // Pointy-top neighbours of an even row, on the board's own transform (+y down).
    const at = (col: number, row: number) => cellPoint({ col, row }, 1);
    const from = at(5, 4);
    const go = (col: number, row: number) => tokenHeading(at(col, row).x - from.x, at(col, row).y - from.y);
    expect(go(6, 4)).toBe('e');
    expect(go(4, 4)).toBe('w');
    expect(go(5, 3)).toBe('ne');
    expect(go(4, 3)).toBe('nw');
    expect(go(5, 5)).toBe('se');
    expect(go(4, 5)).toBe('sw');
    expect(tokenHeading(0, 0, 'nw')).toBe('nw');
    expect(headingFromMapDirection('n', 'w')).toBe('nw');
    expect(headingFromMapDirection('s')).toBe('se');
  });
});

describe('expedition kit: the 28 controls in the Icon component', () => {
  it('draws each control from the kit’s own path, as a glyph in the current colour', () => {
    expect(Object.keys(EXPEDITION_ICONS)).toHaveLength(28);
    const names = Object.keys(EXPEDITION_ICONS) as IconName[];
    expect(names.sort()).toEqual(
      ['inspect', 'pin', 'source', 'remaining', 'sighting', 'identified', 'scouted', 'staleReport', 'caravan', 'dispatch', 'arrival', 'cargo', 'route', 'blocked', 'intercept', 'garrison', 'ship', 'embark', 'disembark', 'boarding', 'anchor', 'catapult', 'aim', 'fire', 'skip', 'wreck', 'ownerFlag', 'water'].sort(),
    );
    for (const name of names) {
      const id = EXPEDITION_ICONS[name]!;
      expect(ICON_NAMES).toContain(name);
      expect(runtimeManifest.assets[id]!.iconName).toBe(name);
      const svg = readFileSync(path.join(runtime, runtimeManifest.assets[id]!.file), 'utf8');
      const d = /\sd="([^"]+)"/.exec(svg)![1]!;
      const html = renderToStaticMarkup(createElement(Icon, { name }));
      expect(html, name).toContain(`d="${d}"`);
      expect(html).toContain('stroke="currentColor"');
      expect(html).toContain('viewBox="0 0 24 24"');
      expect(iconArt(name), `${name} has no icon art over its glyph`).toBeNull();
      expect(ICON_ART[name]).toBeUndefined();
    }
  });

  it('leaves the existing icons as they were (stat icons keep their art; `flag` stays the objective flag)', () => {
    for (const [name, id] of [['attack', 'icon.stat.attack'], ['defense', 'icon.stat.defense'], ['damage', 'icon.stat.damage'], ['speed', 'icon.stat.speed'], ['shots', 'icon.stat.shots'], ['hp', 'icon.stat.hp']] as const) {
      expect(ICON_ART[name]).toBe(id);
      expect(iconArt(name)).toBe(resolveAsset(id).url);
    }
    expect(iconArt('flag')).toBe(resolveAsset('icon.ui.flag').url);
    expect(iconArt('flag')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The kit's reused IDs: each resolves through the registration the game already has.
// ---------------------------------------------------------------------------

interface Reused { assetId: string; runtimeFile: string }
const reuse = read<{ assets: Reused[] }>(path.join(source, 'reuse-manifest.json')).assets;
const siegeV2 = read<{ ground: Record<string, { file: string }>; siege: Record<string, { file: string }> }>(path.join(runtime, 'siege-v2/manifest.json'));
const sounds = read<{ sounds: { id: string; files: string[] }[] }>(path.join(runtime, 'audio/manifest.json')).sounds;

/** The runtime file the game's existing registration gives a reused ID (null: it does not resolve). */
function registeredFile(id: string): string | null {
  const strip = (url: string | null | undefined) => (url ? url.replace(/^\.\//, '') : null);
  const m = spriteManifest();
  if (id.startsWith('gui.frame.')) return strip(guiArt(id)?.url);
  if (id.startsWith('siege-v2.battlefield.')) return strip(resolveEnvironmentArt(id.slice('siege-v2.'.length))?.url);
  if (id.startsWith('siege-v2.')) {
    const key = id.slice('siege-v2.'.length);
    // The v2 registration stands; the gate keys are drawn from siege-gates-v3 over it (registered last).
    const own = siegeV2.siege[key]?.file ?? null;
    if (own && !key.startsWith('gate.')) expect(m.siege[key]?.file, `${key} drawn from siege-v2`).toBe(own);
    return own;
  }
  if (id.startsWith('siege-gates-v3.')) return m.siege[id.slice('siege-gates-v3.'.length)]?.file ?? null;
  if (id.startsWith('siege.')) return m.siege[id.slice('siege.'.length)]?.file ?? null;
  if (id.startsWith('projectiles.')) return m.projectiles[id.slice('projectiles.'.length)]?.file ?? null;
  if (id.startsWith('effects.')) return m.effects[id.slice('effects.'.length)]?.file ?? null;
  if (id.startsWith('creature.sprite.')) {
    const [, , creature, anim] = id.split('.');
    return m.creatures[creature!]?.animations[anim!]?.file ?? null;
  }
  if (id.startsWith('hero.sprite.')) {
    const [, , pantheon, anim] = id.split('.');
    const a = m.heroes[pantheon!]?.animations[anim!];
    return a?.directions?.e?.file ?? a?.file ?? null;
  }
  if (id.startsWith('audio.')) return sounds.find((s) => s.id === id.slice('audio.'.length).replace('_', '.'))?.files[0] ?? null;
  // Interface art: the final icon manifest, story art, or the owner-supplied UI art manifest (whose
  // older stat icons are listed as `placeholder` status but are delivered files).
  return strip(resolveAsset(id).url);
}

describe('expedition kit: reused registrations', () => {
  it('every one of the 405 reused IDs already resolves to its runtime file (never registered again)', () => {
    expect(reuse).toHaveLength(405);
    const missing: string[] = [];
    for (const r of reuse) {
      const f = registeredFile(r.assetId);
      if (f !== r.runtimeFile || !existsSync(path.join(runtime, r.runtimeFile))) missing.push(`${r.assetId} → ${f ?? 'unresolved'} (kit: ${r.runtimeFile})`);
      expect(expeditionArt(r.assetId)).toBeNull();
    }
    expect(missing).toEqual([]);
  });

  it('every current hero and creature form has its portrait', async () => {
    const { loadCatalog } = await import('@pr/content');
    const catalog = loadCatalog();
    for (const c of Object.values(catalog.creatures)) expect(resolveAsset(c.presentation.portraitAssetId).url, c.id).not.toBeNull();
    for (const h of Object.values(catalog.heroes)) expect(resolveAsset(h.portraitAssetId).url, h.id).not.toBeNull();
  });
});
