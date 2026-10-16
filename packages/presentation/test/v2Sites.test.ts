/**
 * Campaign content v2 on the adventure map (2026-10-15), the parts that need no
 * renderer: which picture a site asks for (its `art`, a sluice's state, a ferry
 * landing, a neutral hiring site — from data, never from a site ID), which one
 * is drawn with the manifests the game registers (the sprite manifest plus the
 * campaign-v2 sites), and that the map's scenery is planned again when a sluice
 * changes the ground.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCatalog } from '@pr/content';
import type { SiteDefinition, WorldMapDefinition } from '@pr/rules';
import { STATE_SITE_ARCHETYPES, pickSiteSprite, registerSpriteManifest, siteSprite, siteSpriteCandidates, type SpriteManifest, type StaticSpriteDefinition } from '../src/core';
import { planNatureSceneryCached } from '../src/nature';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const runtime = path.join(root, 'assets-runtime');
const base = JSON.parse(readFileSync(path.join(runtime, 'sprites/manifest.json'), 'utf8')) as SpriteManifest;
const v2 = JSON.parse(readFileSync(path.join(runtime, 'campaign-v2/manifest.json'), 'utf8')) as { sites: Record<string, StaticSpriteDefinition> };
/** The manifest the game registers at start-up (packages/ui/src/assets/manifest.ts): campaign-v2 sites merged in. */
const merged: SpriteManifest = { ...base, sites: { ...base.sites, ...v2.sites } };
const catalog = buildCatalog();

/** The six new neutral creatures of the expansion kit (each with a hiring-site picture). */
const NEUTRALS = ['pegasus', 'root_runner', 'serpopard', 'baku', 'afanc', 'ahuitzotl'];

const site = (kind: SiteDefinition['kind'], extra: Partial<SiteDefinition> = {}): SiteDefinition => ({ id: 'x', anchorId: 'x', coord: { q: 0, r: 0 }, name: 'X', description: '', kind, ...extra });
const sluice = (art?: string) =>
  site({ type: 'sluice', channel: [{ q: 1, r: 0 }], openTerrain: 'marsh', closedTerrain: 'water', startsOpen: false, openText: 'drains', closeText: 'floods', openFlag: 'f' }, art ? { art } : {});

describe('campaign v2 site pictures', () => {
  beforeAll(() => registerSpriteManifest(merged));
  afterAll(() => registerSpriteManifest(base));

  it('a kind painted per state has every state picture in the kit', () => {
    for (const [kind, states] of Object.entries(STATE_SITE_ARCHETYPES)) for (const s of states ?? []) expect(siteSprite(kind, s), `${kind}.${s}`).toBe(merged.sites[`map.site.${kind}.${s}`]);
  });

  it('a sluice asks for its state picture, which switches when it is operated', () => {
    expect(siteSpriteCandidates(sluice('sluice'), { open: false })[0]).toBe('map.site.sluice.closed');
    expect(pickSiteSprite(siteSpriteCandidates(sluice('sluice'), { open: false }), 'sluice').id).toBe('map.site.sluice.closed');
    expect(pickSiteSprite(siteSpriteCandidates(sluice('sluice'), { open: true }), 'sluice').id).toBe('map.site.sluice.open');
    // Without `art` the state picture is still found; open and closed share one ground anchor and size.
    expect(pickSiteSprite(siteSpriteCandidates(sluice(), { open: true }), 'sluice').id).toBe('map.site.sluice.open');
    const [o, c] = [merged.sites['map.site.sluice.open']!, merged.sites['map.site.sluice.closed']!];
    expect([o.anchor, o.width, o.height, o.pixelsPerHex]).toEqual([c.anchor, c.width, c.height, c.pixelsPerHex]);
  });

  it('a site with art draws `map.site.<art>`; a ferry landing draws the ferry even without art', () => {
    const depot = site({ type: 'pickup', reward: { resources: { gold: 300 } } }, { art: 'supply_depot' });
    expect(pickSiteSprite(siteSpriteCandidates(depot), 'pickup', 'gold').id).toBe('map.site.supply_depot');
    const ferry = site({ type: 'portal', exitSiteId: 'y', ferry: true });
    expect(pickSiteSprite(siteSpriteCandidates(ferry), 'portal').id).toBe('map.site.ferry');
    expect(pickSiteSprite(siteSpriteCandidates({ ...ferry, art: 'ferry' }), 'portal').id).toBe('map.site.ferry');
    // An ordinary two-way portal keeps its own picture.
    expect(pickSiteSprite(siteSpriteCandidates(site({ type: 'portal', exitSiteId: 'y' })), 'portal').id).toBe('map.site.portal');
  });

  it('a camp of one of the six new neutrals draws its hiring site even without art; other camps keep the camp', () => {
    for (const c of NEUTRALS) {
      expect(catalog.creatures[c], c).toBeDefined();
      const camp = site({ type: 'creature_camp', creatureId: c, weeklyGrowth: 4, initialStock: 4, restock: 'weekly' });
      expect(pickSiteSprite(siteSpriteCandidates(camp), 'camp').id, c).toBe(`map.site.neutral_dwelling.${c}`);
    }
    const centaurs = site({ type: 'creature_camp', creatureId: 'centaur', weeklyGrowth: 2, initialStock: 3 });
    expect(pickSiteSprite(siteSpriteCandidates(centaurs), 'camp').id).toBe('map.site.camp');
    // Any site may borrow a hiring-site picture by its art (e.g. a refuge choice drawn as the pegasus meadow).
    const refuge = site({ type: 'map_event', title: 't', text: 't', options: [] }, { art: 'neutral_dwelling.pegasus' });
    expect(pickSiteSprite(siteSpriteCandidates(refuge), 'event_site').id).toBe('map.site.neutral_dwelling.pegasus');
  });

  it('art the manifest lacks falls back to the kind and variant picture', () => {
    const odd = site({ type: 'pickup', reward: { resources: { wood: 5 } } }, { art: 'no_such_picture' });
    expect(pickSiteSprite(siteSpriteCandidates(odd), 'pickup', 'wood').id).toBe('map.site.pickup.wood');
    expect(pickSiteSprite(siteSpriteCandidates(odd), 'pickup', 'nothing').id).toBe('map.site.pickup');
    // Without the campaign-v2 sites (a build without the kit) a sluice has no picture at all, never a wrong one.
    registerSpriteManifest(base);
    expect(pickSiteSprite(siteSpriteCandidates(sluice('sluice'), { open: true }), 'sluice')).toEqual({ id: null, def: null });
    registerSpriteManifest(merged);
  });

  it('every v2 mission site with art finds its picture', () => {
    const missions = Object.values(catalog.missions).filter((m) => m.id.includes('_v2_'));
    expect(missions.length).toBeGreaterThan(0);
    let checked = 0;
    for (const m of missions) {
      for (const s of m.sites) {
        if (!s.art && !(s.kind.type === 'portal' && s.kind.ferry)) continue;
        const states = s.kind.type === 'sluice' ? [{ open: false }, { open: true }] : [{ open: false }];
        for (const st of states) {
          const pick = pickSiteSprite(siteSpriteCandidates(s, st), s.kind.type);
          expect(pick.id, `${m.id} ${s.id}`).toBe(siteSpriteCandidates(s, st)[0]);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
});

describe('a sluice changes the ground: the scenery is planned again', () => {
  it('the cached nature plan follows the terrain, not only the map ID', () => {
    const rows: string[] = [];
    for (let r = 0; r < 16; r++) {
      let row = '';
      for (let q = 0; q < 20; q++) row += r >= 6 && r <= 9 && q >= 4 && q <= 15 ? 'w' : (q + r) % 9 === 0 ? 'f' : 'p';
      rows.push(row);
    }
    const map: WorldMapDefinition = {
      templateId: 'test' as WorldMapDefinition['templateId'],
      templateVersion: 1,
      generatorVersion: 'test',
      seed: 5,
      attempt: 0,
      mode: 'golden',
      width: 20,
      height: 16,
      terrain: rows.join(''),
      roads: [],
      logicalHash: 'same-hash',
      biome: 'coast',
    };
    const opts = { available: () => true, decor: 'all' as const };
    const wet = planNatureSceneryCached(map, opts);
    // The channel (the lake's middle rows) drained to marsh: the same map ID and hash, new ground.
    const chars = map.terrain.split('');
    for (let q = 4; q <= 15; q++) for (const r of [7, 8]) chars[r * 20 + q] = 's';
    const drained = { ...map, terrain: chars.join('') };
    const dry = planNatureSceneryCached(drained, opts);
    expect(dry).not.toBe(wet);
    expect(dry.water.components.length).not.toBe(0);
    // No water scenery stays on a drained cell.
    for (const it of dry.items.filter((x) => x.kind === 'water')) expect(drained.terrain[it.tile], `tile ${it.tile}`).toBe('w');
    // And back: the flooded map is planned as before (deterministic).
    expect(planNatureSceneryCached({ ...map }, opts).items).toEqual(wet.items);
  });
});
