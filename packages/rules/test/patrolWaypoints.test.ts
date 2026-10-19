/**
 * A patrol's place in its waypoint circuit (`HeroAiState.waypointIndex`, 2026-10-16):
 * the rules advance it when a MoveHero leaves or ends on the waypoint it points
 * at, wrapping round; stopping short or ending elsewhere leaves it alone. A
 * stateless circuit turned back on legs longer than a day and never reached a
 * waypoint listed between two copies of another (Acatl's route in The New Fire,
 * chapter 2). Crafted state: that chapter on open plains without roads (100
 * movement per hex), only the town and Acatl's home camp keep their sites.
 */
import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import { loadCatalog } from '@pr/content';
import { createMissionMatch } from '@pr/campaign';
import { deepClone, hexEquals, movementBudget, patrolWaypointIndex, type HexCoord, type MatchState } from '../src';

const catalog = loadCatalog();
const MISSION = 'new_fire_v2_m02';
const PATROL = 'mesoamerican_acatl_0';
const base = createMissionMatch(catalog, MISSION, { matchId: 'patrol-waypoints', difficultyId: 'campaign_normal' }).match;
const at = (q: number, r: number): HexCoord => ({ q, r });

function driver(start: HexCoord, waypoints: HexCoord[], index = 0): GameDriver {
  const s: MatchState = deepClone(base);
  const map = s.world.map;
  s.world.map = { ...map, terrain: 'p'.repeat(map.width * map.height), roads: [] };
  for (const def of catalog.missions[MISSION]!.sites) if (def.kind.type !== 'town' && def.id !== 'nf2_reserve') delete s.world.sites[def.id];
  for (const fog of Object.values(s.fog)) fog.explored = fog.explored.map(() => 1);
  s.activePlayerId = 'hostile';
  const p = s.heroes[PATROL]!;
  p.position = { ...start };
  p.ai!.waypoints = waypoints.map((w) => ({ ...w }));
  p.ai!.waypointIndex = index;
  s.heroes['itzel']!.position = at(1, 20);
  return new GameDriver(s, catalog);
}

const patrol = (d: GameDriver) => d.state.heroes[PATROL]!;
function moveTo(d: GameDriver, c: HexCoord, points?: number): void {
  patrol(d).movementPoints = points ?? movementBudget(d.catalog, d.state, patrol(d)).total;
  d.do({ kind: 'MoveHero', heroId: PATROL, destination: c }, 'hostile');
}

describe('patrol waypoint circuit (rules)', () => {
  const A = at(30, 13);
  const B = at(30, 9);
  const C = at(34, 9);

  it('advances on arrival at the waypoint it points at, wrapping round, without touching the RNG', () => {
    const d = driver(at(34, 13), [A, B, C]);
    const rng = { ...d.state.rng };
    moveTo(d, A);
    expect(hexEquals(patrol(d).position, A)).toBe(true);
    expect(patrol(d).ai!.waypointIndex).toBe(1);
    moveTo(d, B);
    expect(patrol(d).ai!.waypointIndex).toBe(2);
    moveTo(d, C);
    expect(patrol(d).ai!.waypointIndex).toBe(0);
    expect(d.state.rng).toEqual(rng);
  });

  it('does not advance when the move stops short or ends on another tile (a detour)', () => {
    const d = driver(A, [A, B, C], 1);
    // Two hexes of movement toward B, four hexes away: it stops short.
    moveTo(d, B, 200);
    expect(hexEquals(patrol(d).position, B)).toBe(false);
    expect(patrol(d).ai!.waypointIndex).toBe(1);
    // A detour to another waypoint (C) or to an open tile keeps the index.
    moveTo(d, C);
    expect(hexEquals(patrol(d).position, C)).toBe(true);
    expect(patrol(d).ai!.waypointIndex).toBe(1);
    moveTo(d, at(36, 11));
    expect(patrol(d).ai!.waypointIndex).toBe(1);
    // A rejected move changes nothing.
    patrol(d).movementPoints = 0;
    expect(d.reject({ kind: 'MoveHero', heroId: PATROL, destination: B }, 'hostile').code).toBe('insufficient_movement');
    expect(patrol(d).ai!.waypointIndex).toBe(1);
  });

  it('counts the waypoint it stands on as reached when it sets off (a patrol placed on its first waypoint)', () => {
    const d = driver(A, [A, B, C], 0);
    moveTo(d, at(32, 12));
    expect(patrol(d).ai!.waypointIndex).toBe(1);
    moveTo(d, B);
    expect(patrol(d).ai!.waypointIndex).toBe(2);
  });

  it('reads an index out of range modulo the circuit', () => {
    expect(patrolWaypointIndex({ waypoints: [A, B, C], waypointIndex: 7 })).toBe(1);
    expect(patrolWaypointIndex({ waypoints: [A, B, C], waypointIndex: -1 })).toBe(2);
    expect(patrolWaypointIndex({ waypoints: [A, B, C], waypointIndex: Number.NaN })).toBe(0);
    expect(patrolWaypointIndex({ waypoints: [], waypointIndex: 0 })).toBe(-1);
    expect(patrolWaypointIndex(undefined)).toBe(-1);
    const d = driver(at(34, 13), [A, B, C], 7);
    moveTo(d, B);
    expect(patrol(d).ai!.waypointIndex).toBe(2);
    const e = driver(at(34, 13), [A, B, C], -1);
    moveTo(e, C);
    expect(patrol(e).ai!.waypointIndex).toBe(0);
  });

  it('walks a route that lists the same tile twice through all of its points, in order', () => {
    // Acatl's own route: north depot, his start, the south dock, his start again.
    const route = base.heroes[PATROL]!.ai!.waypoints.map((w) => ({ ...w }));
    expect(route.length).toBe(4);
    expect(hexEquals(route[1]!, route[3]!)).toBe(true);
    const d = driver(base.heroes[PATROL]!.position, route, 0);
    const reached: HexCoord[] = [];
    for (let step = 0; step < 40 && reached.length < 5; step++) {
      const ai = patrol(d).ai!;
      let i = patrolWaypointIndex(ai);
      if (hexEquals(route[i]!, patrol(d).position)) i = (i + 1) % route.length;
      const before = ai.waypointIndex;
      moveTo(d, route[i]!);
      if (patrol(d).ai!.waypointIndex !== before) reached.push({ ...patrol(d).position });
    }
    expect(reached).toEqual([route[0], route[1], route[2], route[3], route[0]]);
  });
});
