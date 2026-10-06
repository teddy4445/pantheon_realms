import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import { loadCatalog } from '@pr/content';
import { createGeneratedMatch, createRandomSkirmish } from '@pr/campaign';
import { axialNeighbors, cellIndex, edgeCost, findHeroPath, heroOccupancy, hexKey, inMap, reachableTiles, tileRole, withSharedPaths, type ContentCatalog, type HexCoord, type MatchState } from '../src';

/**
 * The movement-range search (`reachableTiles`) settles tiles from a heap since
 * 2026-10-06 (frame-rate work: it runs after every command). The result —
 * every tile, its cost and the order of the entries — must equal the earlier
 * sorted-frontier search, kept here as the reference.
 */
function reference(catalog: ContentCatalog, state: MatchState, heroId: string): Map<string, number> {
  const hero = state.heroes[heroId]!;
  const out = new Map<string, number>();
  const map = state.world.map;
  const fog = state.fog[hero.ownerId];
  const occupancy = heroOccupancy(state, heroId);
  const startKey = hexKey(hero.position);
  const dist = new Map<string, number>([[startKey, 0]]);
  const coords = new Map<string, HexCoord>([[startKey, hero.position]]);
  const frontier: string[] = [startKey];
  while (frontier.length > 0) {
    frontier.sort((a, b) => dist.get(a)! - dist.get(b)! || (a < b ? -1 : 1));
    const key = frontier.shift()!;
    const cur = coords.get(key)!;
    const d = dist.get(key)!;
    if (key !== startKey && tileRole(catalog, state, hero.ownerId, cur, heroId, occupancy) !== 'open') continue;
    for (const n of axialNeighbors(cur)) {
      if (!inMap(map, n)) continue;
      if (fog && fog.explored[cellIndex(map, n)] !== 1) continue;
      if (tileRole(catalog, state, hero.ownerId, n, heroId, occupancy) === 'blocked') continue;
      const c = edgeCost(catalog, map, cur, n);
      if (c === null) continue;
      const nd = d + c;
      if (nd > hero.movementPoints) continue;
      const nk = hexKey(n);
      const old = dist.get(nk);
      if (old === undefined || nd < old) {
        dist.set(nk, nd);
        coords.set(nk, n);
        if (!frontier.includes(nk)) frontier.push(nk);
      }
    }
  }
  dist.delete(startKey);
  for (const [k, v] of dist) out.set(k, v);
  return out;
}

const same = (catalog: ContentCatalog, state: MatchState, heroId: string) => {
  const a = [...reachableTiles(catalog, state, heroId)];
  const b = [...reference(catalog, state, heroId)];
  expect(a).toEqual(b);
  return a.length;
};

describe('movement range search (heap) equals the sorted-frontier search', () => {
  it('Twin Harbors: both heroes, normal movement, a long reach, explored and fogged', () => {
    const d = GameDriver.mission('skirmish_twin_harbors', { matchId: 'reach-eq' });
    for (const id of Object.keys(d.state.heroes)) same(d.catalog, d.state, id);
    for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
    for (const h of Object.values(d.state.heroes)) h.movementPoints = 3000;
    for (const id of Object.keys(d.state.heroes)) expect(same(d.catalog, d.state, id)).toBeGreaterThan(100);
  });

  it('a huge random map with six empires, every hero with a long reach', () => {
    const c = loadCatalog();
    const g = createRandomSkirmish(c, { seed: 77, size: 'huge', seats: Array.from({ length: 6 }, () => ({ pantheonId: 'greek', controller: 'ai' as const })), victory: { type: 'elimination' }, monsters: 'few' });
    const { match } = createGeneratedMatch(c, g, { matchId: 'reach-eq-huge' });
    for (const fog of Object.values(match.fog)) fog.explored = fog.explored.map(() => 1);
    for (const h of Object.values(match.heroes)) h.movementPoints = 2500;
    for (const id of Object.keys(match.heroes)) same(c, match, id);
  });
});

describe('shared route searches (withSharedPaths) give the same routes as one search per destination', () => {
  /** Every route of every hero to every tile of the map, alone and shared. */
  const compare = (catalog: ContentCatalog, state: MatchState) => {
    const map = state.world.map;
    let reachable = 0;
    for (const heroId of Object.keys(state.heroes)) {
      const tiles: HexCoord[] = [];
      for (let r = 0; r < map.height; r++) for (let q = 0; q < map.width; q++) tiles.push({ q, r });
      const alone = tiles.map((c) => findHeroPath(catalog, state, heroId, c));
      const shared = withSharedPaths(() => tiles.map((c) => findHeroPath(catalog, state, heroId, c)));
      expect(shared).toEqual(alone);
      reachable += alone.filter((p) => p.reachable).length;
    }
    return reachable;
  };

  it('Twin Harbors at the start (fogged) and explored, with guards, sites and both heroes', () => {
    const d = GameDriver.mission('skirmish_twin_harbors', { matchId: 'paths-eq' });
    expect(compare(d.catalog, d.state)).toBeGreaterThan(20);
    for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
    expect(compare(d.catalog, d.state)).toBeGreaterThan(500);
  });

  it('a huge random map with six empires, explored', () => {
    const c = loadCatalog();
    const g = createRandomSkirmish(c, { seed: 77, size: 'huge', seats: Array.from({ length: 6 }, () => ({ pantheonId: 'greek', controller: 'ai' as const })), victory: { type: 'elimination' }, monsters: 'few' });
    const { match } = createGeneratedMatch(c, g, { matchId: 'paths-eq-huge' });
    for (const fog of Object.values(match.fog)) fog.explored = fog.explored.map(() => 1);
    // Two heroes keep the run short (each compares a search per tile of a huge map).
    const keep = Object.keys(match.heroes).slice(0, 2);
    const state = { ...match, heroes: Object.fromEntries(Object.entries(match.heroes).filter(([id]) => keep.includes(id))) } as MatchState;
    expect(compare(c, state)).toBeGreaterThan(1000);
  });
});
