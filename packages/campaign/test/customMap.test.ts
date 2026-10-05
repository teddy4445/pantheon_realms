/**
 * Custom maps from the map editor (2026-10-05): the document format, its
 * validation, the compiler to an ordinary generated mission, and a short
 * all-AI match on a compiled map.
 */
import { describe, expect, it } from 'vitest';
import { buildCatalog, validateGeneratedMission } from '@pr/content';
import { runAITurn } from '@pr/ai';
import { TERRAIN_CODES, type HexCoord } from '@pr/rules';
import {
  compileCustomMap,
  createGeneratedMatch,
  customInRect,
  customRowOffset,
  newCustomMap,
  parseCustomMap,
  serializeCustomMap,
  toggleRoad,
  validateCustomMap,
  CUSTOM_MAP_SIZES,
  type CustomMapDocument,
  type CustomSite,
} from '../src';

const catalog = buildCatalog();

/** Axial cell of rectangle column x, row y. */
const cell = (doc: CustomMapDocument, x: number, y: number): HexCoord => ({ q: x - Math.floor(y / 2) + customRowOffset(doc.height), r: y });

function paint(doc: CustomMapDocument, cells: readonly HexCoord[], code: string): CustomMapDocument {
  const t = doc.terrain.split('');
  for (const c of cells) t[c.r * doc.width + c.q] = code;
  return { ...doc, terrain: t.join('') };
}

function sampleMap(): CustomMapDocument {
  const doc = newCustomMap(catalog, 'small', 'Test Valley');
  const at = (id: string, kind: CustomSite['kind'], x: number, y: number, extra: Partial<CustomSite> = {}): CustomSite => ({ id, kind, ...cell(doc, x, y), ...extra });
  return {
    ...doc,
    players: [{ pantheonId: 'greek' }, { pantheonId: 'norse' }],
    sites: [
      at('town_a', 'town', 4, 12, { owner: 0 }),
      at('town_b', 'town', 25, 12, { owner: 1 }),
      at('mine_a', 'gold_mine', 8, 8, { guard: { creatureId: 'centaur', count: 6 } }),
      at('chest', 'treasure_chest', 15, 12),
      at('portal_a', 'portal', 6, 20, { twinId: 'portal_b' }),
      at('portal_b', 'portal', 23, 4, { twinId: 'portal_a' }),
      at('wolves', 'monster', 15, 5, { guard: { creatureId: 'centaur', count: 10 } }),
      at('stone', 'learning_stone', 12, 16),
      at('camp', 'creature_camp', 18, 18, { creatureId: 'centaur' }),
    ],
  };
}

describe('custom maps', () => {
  it('a new map is a rectangle of plains in the stored axial array, with void padding', () => {
    const doc = newCustomMap(catalog, 'small');
    const { cols, rows } = CUSTOM_MAP_SIZES.small;
    expect(doc.height).toBe(rows);
    expect(doc.width).toBe(cols + customRowOffset(rows));
    const plains = [...doc.terrain].filter((c) => c === TERRAIN_CODES.plains).length;
    expect(plains).toBe(cols * rows);
    expect(customInRect(cols, rows, cell(doc, 0, 0))).toBe(true);
    expect(customInRect(cols, rows, cell(doc, cols - 1, rows - 1))).toBe(true);
    expect(customInRect(cols, rows, { q: 0, r: 0 })).toBe(false);
    // An empty map cannot be played yet: both empires lack a town.
    expect(validateCustomMap(catalog, doc).filter((i) => i.severity === 'error').map((i) => i.text)).toEqual(['Empire 1 has no town. Place one with the Town tool.', 'Empire 2 has no town. Place one with the Town tool.']);
  });

  it('a complete map validates and compiles to an ordinary mission that starts and plays', () => {
    const doc = sampleMap();
    expect(validateCustomMap(catalog, doc)).toEqual([]);
    const compiled = compileCustomMap(catalog, doc, [{ controller: 'ai' }, { controller: 'ai' }]);
    expect(validateGeneratedMission(catalog, compiled.mission).issues).toEqual([]);
    expect(compiled.mission.sites.filter((s) => s.kind.type === 'town')).toHaveLength(2);
    expect(compiled.mission.sites.find((s) => s.id === 'portal_a')?.kind).toEqual({ type: 'portal', exitSiteId: 'portal_b' });
    expect(compiled.mission.sites.find((s) => s.id === 'mine_a')?.guard?.army).toEqual([{ creatureId: 'centaur', count: 6 }]);
    const { match } = createGeneratedMatch(catalog, compiled, { matchId: 'custom-test' });
    let s = match;
    for (let i = 0; i < 40 && s.outcome.status === 'running' && s.day <= 6; i++) s = runAITurn(catalog, s, { maxCommands: 300 });
    expect(s.day).toBeGreaterThan(3);
  });

  it('the file round-trips; damaged or foreign files are refused', () => {
    const doc = sampleMap();
    const back = parseCustomMap(serializeCustomMap(doc));
    expect(back.ok && back.doc).toEqual(doc);
    expect(parseCustomMap('not json').ok).toBe(false);
    expect(parseCustomMap(JSON.stringify({ format: 'something-else' })).ok).toBe(false);
    expect(parseCustomMap(JSON.stringify({ ...doc, terrain: doc.terrain.slice(1) })).ok).toBe(false);
    expect(parseCustomMap(JSON.stringify({ ...doc, sites: [{ ...doc.sites[0], id: '../../x' }] })).ok).toBe(false);
  });

  it('validation names unreachable sites, sites on water, lone portals and a missing relic', () => {
    const doc = sampleMap();
    // A ring of water around the chest: nothing reaches it.
    const chest = doc.sites.find((s) => s.id === 'chest')!;
    const ring: HexCoord[] = [];
    for (let dq = -1; dq <= 1; dq++) for (let dr = -1; dr <= 1; dr++) if (Math.abs(dq + dr) <= 1 && (dq || dr)) ring.push({ q: chest.q + dq, r: chest.r + dr });
    const walled = paint(doc, ring, TERRAIN_CODES.water);
    expect(validateCustomMap(catalog, walled).map((i) => i.text)).toContain('Treasure Chest cannot be reached from Empire 1’s town.');
    const drowned = paint(doc, [{ q: chest.q, r: chest.r }], TERRAIN_CODES.water);
    expect(validateCustomMap(catalog, drowned).some((i) => i.siteId === 'chest' && /stands on water/.test(i.text))).toBe(true);
    const lone = { ...doc, sites: doc.sites.filter((s) => s.id !== 'portal_b') };
    expect(validateCustomMap(catalog, lone).some((i) => i.siteId === 'portal_a')).toBe(true);
    const hold = { ...doc, victory: { type: 'hold_relic' as const, days: 3 } };
    expect(validateCustomMap(catalog, hold).map((i) => i.text)).toContain('“Hold the shrine” needs exactly one Shrine of the First Flame on the map.');
    expect(() => compileCustomMap(catalog, hold, [{ controller: 'ai' }, { controller: 'ai' }])).toThrow();
  });

  it('the road tool toggles the road between two neighbouring cells only', () => {
    const a = { q: 5, r: 5 };
    const b = { q: 6, r: 5 };
    const once = toggleRoad([], a, b);
    expect(once).toHaveLength(1);
    expect(toggleRoad(once, b, a)).toEqual([]);
    expect(toggleRoad([], a, { q: 9, r: 9 })).toEqual([]);
  });
});
