/**
 * The map editor's coastal sites and sea salvage (packages/ui/src/app/editorSeaSites.ts, sea-sites kit
 * 2026-10-18): the palette (lookout, three kinds of salvage, wreck — each with its delivered picture),
 * the reason for every refused tile (the document validator's own rules), the fields a new site starts
 * with, the hover hint, dragging a placed site, and the editor's round trip: place → export → import →
 * validate → compile.
 */
import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCatalog } from '@pr/content';
import { TERRAIN_CODES, type CustomMapDocument, type CustomSite, type HexCoord } from '@pr/rules';
import { compileCustomMap, customRowOffset, newCustomMap, parseCustomMap, serializeCustomMap, validateCustomMap } from '@pr/session';
import { editorSeaPlacementProblem, seaPalette, seaSiteDefaults, seaToolHint } from '../src/app/editorSeaSites';
import { seaSiteArt } from '../src/assets/manifest';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const catalog = buildCatalog();
const cellOf = (doc: Pick<CustomMapDocument, 'height'>, x: number, y: number): HexCoord => ({ q: x - Math.floor(y / 2) + customRowOffset(doc.height), r: y });

/** Two islands (columns 0-9, 20-29) and a sea (10-19); towns at 9,12 and 20,12; a neutral ship at 10,8. */
function sea(): CustomMapDocument {
  let d = newCustomMap(catalog, 'small', 'Editor Sea');
  const t = d.terrain.split('');
  for (let y = 0; y < 24; y++)
    for (let x = 10; x <= 19; x++) {
      const c = cellOf(d, x, y);
      t[c.r * d.width + c.q] = TERRAIN_CODES.water;
    }
  d = { ...d, terrain: t.join('') };
  const town = (id: string, x: number, owner: number): CustomSite => ({ id, kind: 'town', ...cellOf(d, x, 12), owner });
  return { ...d, players: [{ pantheonId: 'greek' }, { pantheonId: 'norse' }], sites: [town('town_a', 9, 0), town('town_b', 20, 1)], ships: [{ id: 'free', ...cellOf(d, 10, 8) }] };
}

/** What the editor's place tool does on a legal tile (MapEditor.placeAt). */
function place(doc: CustomMapDocument, id: string, kind: CustomSite['kind'], c: HexCoord, resource?: 'wood' | 'stone' | 'gold'): CustomMapDocument {
  expect(editorSeaPlacementProblem(catalog, doc, c, kind), `${kind} at ${c.q},${c.r}`).toBeNull();
  return { ...doc, sites: [...doc.sites, { id, kind, q: c.q, r: c.r, ...seaSiteDefaults(catalog, kind, resource) }] };
}

describe('map editor: coastal sites and sea salvage', () => {
  it('the palette offers the lookout, the three kinds of salvage and the wreck, each with its delivered picture', () => {
    const p = seaPalette(catalog);
    expect(p.map((e) => `${e.kind}${e.resource ? `:${e.resource}` : ''}`)).toEqual(['coastal_watchtower', 'sea_pickup:wood', 'sea_pickup:stone', 'sea_pickup:gold', 'shipwreck']);
    expect(p.map((e) => e.label)).toEqual(['Coastal Watchtower', 'Driftwood Bundle', 'Stone Cargo', 'Lost Treasury', 'Shipwreck']);
    for (const e of p) {
      const art = seaSiteArt(e.assetId);
      expect(art, e.assetId).not.toBeNull();
      expect(existsSync(path.join(root, 'assets-runtime', art!.url!.replace(/^\.\//, ''))), art!.url!).toBe(true);
    }
    // The tooltips quote the policy's numbers (content data), never a typed copy.
    expect(p[0]!.title).toMatch(/6 hexes/);
    expect(p[1]!.title).toMatch(/3–6 Wood/);
    expect(p[3]!.title).toMatch(/250–500 Gold/);
    expect(p[4]!.title).toMatch(/100 movement/);
  });

  it('gives the reason for every refused tile and leaves land kinds to the open-ground check', () => {
    const d = sea();
    const why = (kind: CustomSite['kind'], x: number, y: number) => editorSeaPlacementProblem(catalog, d, cellOf(d, x, y), kind);
    expect(why('gold_mine', 5, 5)).toBeUndefined();
    expect(why('watchtower', 13, 5)).toBeUndefined();
    expect(why('coastal_watchtower', 13, 4)).toMatch(/^[A-Z].*not on the water/);
    expect(why('coastal_watchtower', 4, 4)).toMatch(/^[A-Z].*beside the sea/);
    expect(why('coastal_watchtower', 9, 4)).toBeNull();
    expect(why('sea_pickup', 5, 5)).toMatch(/^[A-Z].*on the water/);
    expect(why('sea_pickup', 10, 12)).toMatch(/harbor/);
    expect(why('sea_pickup', 10, 8)).toMatch(/ship/);
    expect(why('sea_pickup', 14, 5)).toBeNull();
    expect(why('shipwreck', 3, 3)).toMatch(/on the water/);
    expect(why('shipwreck', 15, 16)).toBeNull();
    // A tile with a site: the click selects it (no error).
    expect(why('shipwreck', 9, 12)).toBeNull();
    // Sea monsters: water only (the sea-creature delivery's own check).
    expect(why('sea_monster', 5, 5)).toMatch(/water/);
  });

  it('a new site starts with the chosen salvage; the hover hint says whether a tile fits', () => {
    expect(seaSiteDefaults(catalog, 'sea_pickup', 'stone')).toEqual({ resource: 'stone' });
    expect(seaSiteDefaults(catalog, 'sea_pickup', undefined)).toEqual({ resource: 'gold' });
    expect(seaSiteDefaults(catalog, 'shipwreck', undefined)).toEqual({});
    expect(seaSiteDefaults(catalog, 'coastal_watchtower', undefined)).toEqual({});
    const d = sea();
    expect(seaToolHint(catalog, d, cellOf(d, 14, 5), 'sea_pickup', 'salvage')).toEqual({ text: 'Place a salvage here', fits: true });
    expect(seaToolHint(catalog, d, cellOf(d, 5, 5), 'sea_pickup', 'salvage')?.fits).toBe(false);
    expect(seaToolHint(catalog, d, cellOf(d, 9, 12), 'sea_pickup', 'salvage')?.text).toMatch(/select/);
    expect(seaToolHint(catalog, d, cellOf(d, 5, 5), 'gold_mine', 'Gold Mine')).toBeNull();
  });

  it('dragging a placed site checks the new tile without counting the site itself', () => {
    let d = sea();
    d = place(d, 'wreck', 'shipwreck', cellOf(d, 15, 16));
    // One step along the same sea: its own old tile is no obstacle.
    expect(editorSeaPlacementProblem(catalog, d, cellOf(d, 15, 17), 'shipwreck', 'wreck')).toBeNull();
    expect(editorSeaPlacementProblem(catalog, d, cellOf(d, 5, 17), 'shipwreck', 'wreck')).toMatch(/water/);
  });

  it('round trip: placed sea sites survive export and import, validate, and compile into the mission', () => {
    let d = sea();
    d = place(d, 'tower', 'coastal_watchtower', cellOf(d, 9, 4));
    d = place(d, 'drift', 'sea_pickup', cellOf(d, 13, 5), 'wood');
    d = place(d, 'cargo', 'sea_pickup', cellOf(d, 14, 7), 'stone');
    d = place(d, 'treasury', 'sea_pickup', cellOf(d, 16, 5), 'gold');
    d = place(d, 'wreck', 'shipwreck', cellOf(d, 15, 16));
    d = { ...d, sites: d.sites.map((s) => (s.id === 'treasury' ? { ...s, amount: 450 } : s.id === 'wreck' ? { ...s, outcome: 'guarded_salvage', skin: 'broken_mast' } : s)) };
    expect(validateCustomMap(catalog, d).filter((i) => i.severity === 'error')).toEqual([]);
    const parsed = parseCustomMap(serializeCustomMap(d));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const sites = (doc: CustomMapDocument) => doc.sites.filter((s) => s.kind !== 'town');
    expect(sites(parsed.doc)).toEqual(sites(d));
    const mission = compileCustomMap(catalog, parsed.doc, [{ controller: 'human' }, { controller: 'ai' }]).mission;
    const kind = (id: string) => mission.sites.find((s) => s.id === id)!.kind;
    expect(kind('tower')).toMatchObject({ type: 'coastal_watchtower', radius: 6 });
    expect(kind('drift')).toMatchObject({ type: 'sea_pickup', resource: 'wood' });
    expect(kind('cargo')).toMatchObject({ type: 'sea_pickup', resource: 'stone' });
    expect(kind('treasury')).toEqual({ type: 'sea_pickup', resource: 'gold', amount: 450 });
    const w = kind('wreck');
    expect(w.type === 'shipwreck' && w.outcome.kind === 'guarded_salvage' && w.skin === 'broken_mast' && !!w.outcome.guard).toBe(true);
  });
});
