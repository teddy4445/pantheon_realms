/**
 * Hero ships (expedition kit §07, scenario feature `navalMovementV1`): ship entities and their
 * invariants, launching, embarking, disembarking, sailing on the water-only graph, mixed-mode
 * quotes that stop at a mode change, and the flag / old-save behaviour. Every action goes
 * through processCommand (the GameDriver), exactly like the game.
 */
import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import {
  axialDistance,
  axialNeighbors,
  canonicalStateHash,
  claimableShips,
  deepClone,
  freeLaunchCells,
  hexEquals,
  hexKey,
  landingCells,
  movementBudget,
  quoteDisembark,
  quoteEmbark,
  quoteLaunchShip,
  quoteAdventureSpell,
  quoteMovement,
  quoteTravel,
  reachableTiles,
  shipAt,
  shipInvariantIssues,
  terrainAt,
  tileRole,
  voyageDays,
  type HexCoord,
  type MatchState,
  type ShipState,
} from '../src';
import { catalog, cellIn, navalDriver, navalMatch, paint, cellOf, slots } from '@pr/testing';
import { TERRAIN_CODES } from '../src';

const P1 = 'player';
const P2 = 'p2';
const H1 = 'leader_1';
const H2 = 'leader_2';

const ships = (s: MatchState) => s.world.ships ?? {};
const issues = (s: MatchState) => shipInvariantIssues(catalog, s);

/** A land tile beside `c` that a walking hero of `playerId` may stand on (open), in canonical order. */
function shoreBeside(s: MatchState, c: HexCoord, heroId = H1, playerId = P1): HexCoord {
  const spot = axialNeighbors(c).find((n) => terrainAt(s.world.map, n) !== 'water' && tileRole(catalog, s, playerId, n, heroId) === 'open');
  if (!spot) throw new Error('no shore');
  return spot;
}

/** Put a hero on a tile with movement (a fixture edit before the commands). */
function place(d: GameDriver, heroId: string, c: HexCoord, mp = 1000): void {
  const h = d.state.heroes[heroId]!;
  h.position = { q: c.q, r: c.r };
  h.movementPoints = mp;
}

/** Put `heroId` aboard the ship `shipId` through the real command (from a shore beside it). */
function embark(d: GameDriver, heroId: string, shipId: string, actor = P1): void {
  const ship = ships(d.state)[shipId]!;
  const owner = d.state.heroes[heroId]!.ownerId;
  place(d, heroId, shoreBeside(d.state, ship.coord, heroId, owner));
  d.do({ kind: 'EmbarkHero', heroId, shipId }, actor);
}

describe('ships as world entities', () => {
  it('a custom map places its neutral ship; the scenario has ships; the invariants hold', () => {
    const s = navalMatch();
    expect(s.scenario.features?.navalMovementV1).toBe(true);
    const all = Object.values(ships(s));
    expect(all).toHaveLength(1);
    const ship = all[0]!;
    expect(ship).toMatchObject({ shipId: 'map_ship_free', ownerId: null, heroId: null, state: 'empty', facing: 0, lastActionTurn: 0 });
    expect(terrainAt(s.world.map, ship.coord)).toBe('water');
    expect(issues(s)).toEqual([]);
  });

  it('owned ships keep their empire; a placement off the water or on a taken tile is refused by the editor checks', () => {
    const s = navalMatch({ ships: (doc) => [{ id: 'mine', ...cellOf(doc, 10, 3), owner: 0 }, { id: 'theirs', ...cellOf(doc, 19, 3), owner: 1 }] });
    expect(ships(s)['map_ship_mine']!.ownerId).toBe(P1);
    expect(ships(s)['map_ship_theirs']!.ownerId).toBe(P2);
    expect(() => navalMatch({ ships: (doc) => [{ id: 'dry', ...cellOf(doc, 5, 5) }] })).toThrow(/not on water/);
    expect(() => navalMatch({ ships: (doc) => [{ id: 'a', ...cellOf(doc, 12, 5) }, { id: 'b', ...cellOf(doc, 12, 5) }] })).toThrow(/shares its tile/);
  });

  it('the invariant check names duplicate tiles, a hero aboard two ships, a hero on water without a ship and a hero away from its ship', () => {
    const s = navalMatch();
    const base = ships(s)['map_ship_free']!;
    const twin: ShipState = { ...base, shipId: 'twin' };
    s.world.ships!['twin'] = twin;
    expect(issues(s).some((x) => /share a tile/.test(x))).toBe(true);
    delete s.world.ships!['twin'];
    const h = s.heroes[H1]!;
    h.position = { ...base.coord };
    expect(issues(s)).toContain(`Hero ${H1} stands on water without a ship`);
    base.heroId = H1;
    base.ownerId = P1;
    base.state = 'occupied';
    expect(issues(s)).toEqual([]);
    const other = cellIn(s, 12, 2);
    s.world.ships!['two'] = { ...base, shipId: 'two', coord: other };
    expect(issues(s).some((x) => /aboard two ships/.test(x))).toBe(true);
    delete s.world.ships!['two'];
    h.position = cellIn(s, 5, 5);
    expect(issues(s).some((x) => /not on the tile of ship/.test(x))).toBe(true);
  });

  it('with the feature off (older saves, campaign chapters) there are no ships and every naval command is refused', () => {
    const d = navalDriver();
    d.state.scenario.features = { ...d.state.scenario.features!, navalMovementV1: false };
    const r = d.reject({ kind: 'LaunchShip', townId: 'town_1', waterCoord: freeLaunchCells(catalog, d.state, 'town_1')[0]! });
    expect(r.code).toBe('not_in_scope');
    expect(d.reject({ kind: 'EmbarkHero', heroId: H1, shipId: 'map_ship_free' }).code).toBe('not_in_scope');
    // A campaign chapter never creates the record.
    const campaign = GameDriver.mission('skirmish_twin_harbors').state;
    expect(campaign.scenario.features?.navalMovementV1 === true ? campaign.world.ships !== undefined : campaign.world.ships === undefined).toBe(true);
  });
});

describe('launching a ship', () => {
  it('an owned coastal town launches an empty ship onto a free water neighbour for 1500 Gold and 10 Wood', () => {
    const d = navalDriver();
    const cells = freeLaunchCells(catalog, d.state, 'town_1');
    expect(cells.length).toBeGreaterThan(0);
    const before = { ...d.state.players[P1]!.wallet };
    const events = d.do({ kind: 'LaunchShip', townId: 'town_1', waterCoord: cells[0]! });
    const after = d.state.players[P1]!.wallet;
    expect(before.gold - after.gold).toBe(1500);
    expect(before.wood - after.wood).toBe(10);
    const launched = events.find((e) => e.kind === 'ShipLaunched');
    expect(launched).toMatchObject({ kind: 'ShipLaunched', townId: 'town_1', playerId: P1, coord: cells[0] });
    const ship = shipAt(d.state, cells[0]!)!;
    expect(ship).toMatchObject({ ownerId: P1, heroId: null, state: 'empty', lastActionTurn: d.state.day });
    expect(axialDistance(ship.coord, d.state.towns['town_1']!.coord)).toBe(1);
    expect(issues(d.state)).toEqual([]);
  });

  it('refuses an inland town, a taken or distant water tile, a full coast, a rival town and an empty purse', () => {
    // Inland: the sea moved away from the west town (columns 10-11 are land again).
    const inland = navalDriver({ terrain: (doc) => paint(doc, Array.from({ length: 24 }, (_, y) => [cellOf(doc, 10, y), cellOf(doc, 11, y)]).flat(), TERRAIN_CODES.plains), ships: (doc) => [{ id: 'free', ...cellOf(doc, 12, 8) }] });
    const r1 = inland.reject({ kind: 'LaunchShip', townId: 'town_1', waterCoord: cellIn(inland.state, 12, 12) });
    expect(r1.code).toBe('missing_requirement');
    expect(r1.message).toMatch(/not on the coast/);

    const d = navalDriver();
    const cells = freeLaunchCells(catalog, d.state, 'town_1');
    expect(d.reject({ kind: 'LaunchShip', townId: 'town_1', waterCoord: cellIn(d.state, 15, 12) }).code).toBe('illegal_target');
    expect(d.reject({ kind: 'LaunchShip', townId: 'town_2', waterCoord: freeLaunchCells(catalog, d.state, 'town_2')[0]! }).code).toBe('not_owner');
    // Every free cell taken: two ships never share a tile.
    for (const c of cells) d.do({ kind: 'LaunchShip', townId: 'town_1', waterCoord: c });
    expect(freeLaunchCells(catalog, d.state, 'town_1')).toEqual([]);
    expect(quoteLaunchShip(catalog, d.state, P1, 'town_1', null).code).toBe('no_capacity');
    expect(d.reject({ kind: 'LaunchShip', townId: 'town_1', waterCoord: cells[0]! }).message).toMatch(/taken/);
    expect(issues(d.state)).toEqual([]);

    const poor = navalDriver();
    poor.state.players[P1]!.wallet = { ...poor.state.players[P1]!.wallet, wood: 9 };
    expect(poor.reject({ kind: 'LaunchShip', townId: 'town_1', waterCoord: freeLaunchCells(catalog, poor.state, 'town_1')[0]! }).code).toBe('insufficient_resources');
  });
});

describe('embarking and disembarking', () => {
  it('embarks from an adjacent shore onto the neutral ship (claiming it), using all remaining movement', () => {
    const d = navalDriver();
    const ship = ships(d.state)['map_ship_free']!;
    place(d, H1, shoreBeside(d.state, ship.coord), 640);
    const from = { ...d.state.heroes[H1]!.position };
    expect(quoteEmbark(catalog, d.state, H1, ship.shipId)).toMatchObject({ legal: true, claims: true, minimum: 100 });
    const ev = d.do({ kind: 'EmbarkHero', heroId: H1, shipId: ship.shipId });
    expect(ev.find((e) => e.kind === 'HeroEmbarked')).toMatchObject({ heroId: H1, shipId: ship.shipId, from, to: ship.coord, claimed: true });
    const after = ships(d.state)[ship.shipId]!;
    expect(after).toMatchObject({ heroId: H1, ownerId: P1, state: 'occupied' });
    expect(d.state.heroes[H1]!.position).toEqual(ship.coord);
    expect(d.state.heroes[H1]!.movementPoints).toBe(0);
    expect(issues(d.state)).toEqual([]);
    // Already aboard: no second embarkation.
    d.state.heroes[H1]!.movementPoints = 500;
    expect(d.reject({ kind: 'EmbarkHero', heroId: H1, shipId: ship.shipId }).message).toMatch(/already aboard/);
  });

  it('refuses fewer than 100 movement points, a ship out of reach, an enemy ship and an occupied ship of our own', () => {
    const d = navalDriver({ ships: (doc) => [{ id: 'free', ...cellOf(doc, 10, 8) }, { id: 'rival', ...cellOf(doc, 10, 16), owner: 1 }, { id: 'own', ...cellOf(doc, 10, 4), owner: 0 }] });
    const free = ships(d.state)['map_ship_free']!;
    place(d, H1, shoreBeside(d.state, free.coord), 99);
    const low = d.reject({ kind: 'EmbarkHero', heroId: H1, shipId: free.shipId });
    expect(low.code).toBe('insufficient_movement');
    place(d, H1, cellIn(d.state, 5, 8), 1000);
    expect(d.reject({ kind: 'EmbarkHero', heroId: H1, shipId: free.shipId }).code).toBe('not_present');
    const rival = ships(d.state)['map_ship_rival']!;
    place(d, H1, shoreBeside(d.state, rival.coord), 1000);
    expect(d.reject({ kind: 'EmbarkHero', heroId: H1, shipId: rival.shipId }).code).toBe('not_owner');
    // Our own ship already carries a hero: boarding it is not embarking.
    const own = ships(d.state)['map_ship_own']!;
    own.heroId = 'ghost_check';
    expect(quoteEmbark(catalog, d.state, H1, own.shipId).legal).toBe(false);
    own.heroId = null;
    const second = Object.values(d.state.heroes).find((h) => h.ownerId === P1 && h.id !== H1);
    expect(second).toBeUndefined();
  });

  it('disembarks onto a vacant shore beside the ship, leaving the empty owned hull; refuses water, mountains, sites, enemy shores and low movement', () => {
    const d = navalDriver({
      terrain: (doc) => paint(doc, [cellOf(doc, 9, 7)], TERRAIN_CODES.mountain),
      sites: (doc) => [{ id: 'mine', kind: 'gold_mine', ...cellOf(doc, 9, 9) }],
    });
    embark(d, H1, 'map_ship_free');
    const ship = ships(d.state)['map_ship_free']!;
    d.endDay();
    expect(d.state.heroes[H1]!.movementPoints).toBe(movementBudget(catalog, d.state, d.state.heroes[H1]!).total);
    const water = axialNeighbors(ship.coord).find((n) => terrainAt(d.state.world.map, n) === 'water')!;
    expect(d.reject({ kind: 'DisembarkHero', heroId: H1, landCoord: water }).message).toMatch(/water/);
    const mountain = cellIn(d.state, 9, 7);
    expect(axialDistance(mountain, ship.coord)).toBe(1);
    expect(d.reject({ kind: 'DisembarkHero', heroId: H1, landCoord: mountain }).message).toMatch(/Mountains/);
    const mine = cellIn(d.state, 9, 9);
    expect(axialDistance(mine, ship.coord)).toBe(1);
    expect(d.reject({ kind: 'DisembarkHero', heroId: H1, landCoord: mine }).message).toMatch(/empty shore/);
    expect(d.reject({ kind: 'DisembarkHero', heroId: H1, landCoord: cellIn(d.state, 5, 8) }).message).toMatch(/beside the ship/);
    // An enemy hero on the shore.
    const shores = landingCells(catalog, d.state, H1);
    expect(shores.length).toBeGreaterThan(0);
    const enemy = d.state.heroes[H2]!;
    const enemyHome = { ...enemy.position };
    enemy.position = { ...shores[0]! };
    expect(d.reject({ kind: 'DisembarkHero', heroId: H1, landCoord: shores[0]! }).message).toMatch(/enemy/);
    enemy.position = enemyHome;
    d.state.heroes[H1]!.movementPoints = 99;
    expect(d.reject({ kind: 'DisembarkHero', heroId: H1, landCoord: shores[0]! }).code).toBe('insufficient_movement');
    d.state.heroes[H1]!.movementPoints = 300;
    const ev = d.do({ kind: 'DisembarkHero', heroId: H1, landCoord: shores[0]! });
    expect(ev.find((e) => e.kind === 'HeroDisembarked')).toMatchObject({ heroId: H1, shipId: 'map_ship_free', from: ship.coord, to: shores[0] });
    expect(d.state.heroes[H1]!.position).toEqual(shores[0]);
    expect(d.state.heroes[H1]!.movementPoints).toBe(0);
    expect(ships(d.state)['map_ship_free']).toMatchObject({ heroId: null, state: 'empty', ownerId: P1, coord: ship.coord });
    expect(issues(d.state)).toEqual([]);
    // The hull is ours now: a rival may not take it.
    expect(quoteEmbark(catalog, d.state, H2, 'map_ship_free').code).not.toBe(null);
    expect(claimableShips(d.state, H2).map((s) => s.shipId)).not.toContain('map_ship_free');
  });
});

describe('sailing on the water-only graph', () => {
  it('an embarked hero sails 100 per water edge with its normal daily budget; the ship follows; land is never entered', () => {
    const d = navalDriver();
    embark(d, H1, 'map_ship_free');
    d.endDay();
    const hero = d.state.heroes[H1]!;
    const budget = movementBudget(catalog, d.state, hero).total;
    expect(hero.movementPoints).toBe(budget);
    const dest = cellIn(d.state, 15, 8);
    const q = quoteMovement(catalog, d.state, H1, dest);
    expect(q.reachable).toBe(true);
    expect(q.mode).toBe('sea');
    expect(q.stepCosts).toEqual(q.path.map((_, i) => (i + 1) * 100));
    expect(q.path.every((c) => terrainAt(d.state.world.map, c) === 'water')).toBe(true);
    const ev = d.do({ kind: 'MoveHero', heroId: H1, destination: dest });
    const moved = ev.find((e) => e.kind === 'ShipMoved');
    expect(moved).toMatchObject({ shipId: 'map_ship_free', heroId: H1 });
    expect(ships(d.state)['map_ship_free']!.coord).toEqual(dest);
    expect(d.state.heroes[H1]!.position).toEqual(dest);
    expect(d.state.heroes[H1]!.movementPoints).toBe(budget - q.totalCost);
    // Land is not part of the sea graph; the range overlay is water only.
    const shore = cellIn(d.state, 9, 8);
    expect(quoteMovement(catalog, d.state, H1, shore).reachable).toBe(false);
    expect([...reachableTiles(catalog, d.state, H1).keys()].every((k) => {
      const [q2, r2] = k.split(',').map(Number);
      return terrainAt(d.state.world.map, { q: q2!, r: r2! }) === 'water';
    })).toBe(true);
    expect(issues(d.state)).toEqual([]);
  });

  it('a walking hero never enters water, and mode changes never refill the budget', () => {
    const d = navalDriver();
    const water = cellIn(d.state, 12, 12);
    expect(quoteMovement(catalog, d.state, H1, water).reachable).toBe(false);
    const ship = ships(d.state)['map_ship_free']!;
    place(d, H1, shoreBeside(d.state, ship.coord), 450);
    d.do({ kind: 'EmbarkHero', heroId: H1, shipId: ship.shipId });
    expect(d.state.heroes[H1]!.movementPoints).toBe(0);
    // Nothing more today: the ship cannot move, and landing needs 100 points.
    expect(d.reject({ kind: 'MoveHero', heroId: H1, destination: cellIn(d.state, 12, 8) }).code).toBe('insufficient_movement');
    expect(d.reject({ kind: 'DisembarkHero', heroId: H1, landCoord: landingCells(catalog, d.state, H1)[0]! }).code).toBe('insufficient_movement');
  });

  it('two ships never share a tile: an own empty hull blocks the way, an enemy hull too', () => {
    const d = navalDriver({ ships: (doc) => [{ id: 'free', ...cellOf(doc, 10, 8) }, { id: 'hull', ...cellOf(doc, 12, 8), owner: 0 }] });
    embark(d, H1, 'map_ship_free');
    d.endDay();
    const hull = ships(d.state)['map_ship_hull']!;
    const q = quoteMovement(catalog, d.state, H1, hull.coord);
    expect(q.reachable).toBe(false);
    expect(q.reason).toMatch(/taken/);
    const beyond = cellIn(d.state, 14, 8);
    const route = quoteMovement(catalog, d.state, H1, beyond);
    expect(route.reachable).toBe(true);
    expect(route.path.some((c) => hexEquals(c, hull.coord))).toBe(false);
  });

  it('an embarked hero cannot claim an inland site or town from the water: it must land first', () => {
    const d = navalDriver({ sites: (doc) => [{ id: 'mine', kind: 'gold_mine', ...cellOf(doc, 22, 6) }] });
    embark(d, H1, 'map_ship_free');
    d.endDay();
    const mine = cellIn(d.state, 22, 6);
    const single = quoteMovement(catalog, d.state, H1, mine);
    expect(single.reachable).toBe(false);
    const travel = quoteTravel(catalog, d.state, H1, mine);
    expect(travel.reachable).toBe(true);
    expect(travel.transition?.kind).toBe('disembark');
    expect(travel.reachesDestinationToday).toBe(false);
    // Sailing as far as the landing never touches the mine.
    for (let i = 0; i < 4 && !d.state.battle; i++) {
      const q = quoteTravel(catalog, d.state, H1, mine);
      if (q.transition && q.path.length === 0) break;
      d.do({ kind: 'MoveHero', heroId: H1, destination: mine });
      d.endDay();
    }
    expect(d.state.world.sites['mine']!.owner).not.toBe(P1);
    expect(terrainAt(d.state.world.map, d.state.heroes[H1]!.position)).toBe('water');
    expect(d.reject({ kind: 'MoveHero', heroId: H1, destination: mine }).code).toBe('transition_required');
  });
});

describe('mixed-mode routes stop at every mode change', () => {
  it('a walk-sail-walk journey to the rival island: the quote reports the transitions; each commit stops there until Embark / Disembark is confirmed', () => {
    const d = navalDriver();
    const target = d.state.towns['town_2']!.coord;
    place(d, H1, cellIn(d.state, 6, 8), 1000);
    expect(quoteMovement(catalog, d.state, H1, target).reachable).toBe(false);
    const q = quoteTravel(catalog, d.state, H1, target);
    expect(q.reachable).toBe(true);
    expect(q.voyage!.legs.map((l) => l.mode)).toEqual(['land', 'sea', 'land']);
    expect(q.voyage!.transitions.map((t) => t.kind)).toEqual(['embark', 'disembark']);
    expect(q.transition).toMatchObject({ kind: 'embark', shipId: 'map_ship_free' });
    const days = voyageDays(catalog, d.state, H1, q.voyage!);
    expect(days).toBeGreaterThanOrEqual(3);
    // The same planner, the same answer.
    expect(quoteTravel(catalog, d.state, H1, target)).toEqual(q);

    // 1. Walk to the shore: the commit stops at the embark step (never embarks by itself).
    d.do({ kind: 'MoveHero', heroId: H1, destination: target });
    const shore = q.transition!.kind === 'embark' ? q.transition!.shore : null;
    expect(d.state.heroes[H1]!.position).toEqual(shore);
    expect(ships(d.state)['map_ship_free']!.heroId).toBe(null);
    const again = d.reject({ kind: 'MoveHero', heroId: H1, destination: target });
    expect(again.code).toBe('transition_required');
    expect(again.message).toMatch(/Embark/);
    // 2. Confirm the embark.
    d.do({ kind: 'EmbarkHero', heroId: H1, shipId: 'map_ship_free' });
    d.endDay();
    // 3. Sail (over one or more days) until the landing step.
    for (let i = 0; i < 6; i++) {
      const leg = quoteTravel(catalog, d.state, H1, target);
      if (leg.transition?.kind === 'disembark' && leg.path.length === 0) break;
      expect(leg.mode).toBe('sea');
      d.do({ kind: 'MoveHero', heroId: H1, destination: target });
      d.endDay();
    }
    const landing = quoteTravel(catalog, d.state, H1, target);
    expect(landing.transition?.kind).toBe('disembark');
    expect(d.reject({ kind: 'MoveHero', heroId: H1, destination: target }).message).toMatch(/Disembark/);
    // 4. Land and walk on: an ordinary land route now.
    const landCoord = landing.transition!.kind === 'disembark' ? landing.transition!.landCoord : null!;
    d.do({ kind: 'DisembarkHero', heroId: H1, landCoord });
    expect(terrainAt(d.state.world.map, d.state.heroes[H1]!.position)).not.toBe('water');
    d.endDay();
    const walk = quoteTravel(catalog, d.state, H1, target);
    expect(walk.reachable).toBe(true);
    expect(walk.transition ?? null).toBe(null);
    expect(issues(d.state)).toEqual([]);
  });

  it('is deterministic: the same commands give the same state hash', () => {
    const run = () => {
      const d = navalDriver();
      place(d, H1, cellIn(d.state, 6, 8), 1000);
      const target = d.state.towns['town_2']!.coord;
      d.do({ kind: 'MoveHero', heroId: H1, destination: target });
      d.do({ kind: 'EmbarkHero', heroId: H1, shipId: 'map_ship_free' });
      d.endDay();
      d.do({ kind: 'MoveHero', heroId: H1, destination: target });
      return canonicalStateHash(d.state);
    };
    expect(run()).toBe(run());
  });

  it('a save taken at sea loads and sails on (plain JSON round trip)', () => {
    const d = navalDriver();
    embark(d, H1, 'map_ship_free');
    const restored = JSON.parse(JSON.stringify(d.state)) as MatchState;
    expect(restored).toEqual(d.state);
    expect(issues(restored)).toEqual([]);
    // The same driver (its command IDs continue) on the restored state.
    d.state = restored;
    const e = d;
    e.endDay();
    const dest = cellIn(e.state, 14, 10);
    e.do({ kind: 'MoveHero', heroId: H1, destination: dest });
    expect(ships(e.state)['map_ship_free']!.coord).toEqual(dest);
    expect(e.state.heroes[H1]!.position).toEqual(dest);
  });
});

describe('scripted relocation and other rules meet ships', () => {
  it('a hero carried off its ship (a scripted relocation) leaves an empty hull behind; the guard never moves a hero', () => {
    const d = navalDriver();
    embark(d, H1, 'map_ship_free');
    // A script moves the hero ashore (as a portal or a story event would), then any command runs.
    d.state.heroes[H1]!.position = cellIn(d.state, 5, 5);
    d.do({ kind: 'EndTurn' });
    expect(ships(d.state)['map_ship_free']).toMatchObject({ heroId: null, state: 'empty', ownerId: P1 });
    expect(d.state.heroes[H1]!.position).toEqual(cellIn(d.state, 5, 5));
  });

  it('Recall is never cast from a ship (no land teleport from the sea)', () => {
    const d = navalDriver();
    embark(d, H1, 'map_ship_free');
    const hero = d.state.heroes[H1]!;
    hero.spellbook = true;
    hero.knownSpellIds = [...hero.knownSpellIds, 'homecoming'];
    hero.mana = 100;
    const q = quoteAdventureSpell(catalog, d.state, P1, H1, 'homecoming', hero.position);
    expect(q.legal).toBe(false);
    expect(q.reason).toMatch(/at sea/);
  });

  it('a sluice never drains its channel under a ship (it would run aground)', () => {
    const d = navalDriver({ sites: (doc) => [{ id: 'gate', kind: 'sluice', ...cellOf(doc, 9, 4), channel: [cellOf(doc, 10, 4)], openTerrain: 'marsh', closedTerrain: 'water' }] });
    const ship = ships(d.state)['map_ship_free']!;
    ship.coord = cellIn(d.state, 10, 4);
    place(d, H1, cellIn(d.state, 9, 4), 500);
    const r = d.reject({ kind: 'OperateSluice', heroId: H1, siteId: 'gate' });
    expect(r.message).toMatch(/aground/);
    ship.coord = cellIn(d.state, 10, 8);
    d.do({ kind: 'OperateSluice', heroId: H1, siteId: 'gate' });
    expect(terrainAt(d.state.world.map, cellIn(d.state, 10, 4))).toBe('marsh');
  });

  it('a hero at sea exchanges troops only with another ship, never with a hero on the shore', () => {
    const d = navalDriver();
    embark(d, H1, 'map_ship_free');
    // A second hero of ours on the shore beside the ship.
    const ship = ships(d.state)['map_ship_free']!;
    const shore = shoreBeside(d.state, ship.coord);
    const other = { ...deepClone(d.state.heroes[H1]!), id: 'second', position: shore, army: { slots: slots([['hoplite', 5]]) } };
    d.state.heroes['second'] = other;
    const r = d.reject({ kind: 'TransferStack', from: { kind: 'hero', heroId: 'second' }, fromSlot: 0, to: { kind: 'hero', heroId: H1 }, toSlot: 6, quantity: 1 });
    expect(r.message).toMatch(/at sea/);
  });

  it('quotes leave the state untouched and a rejected naval command changes nothing', () => {
    const d = navalDriver();
    const before = deepClone(d.state);
    quoteTravel(catalog, d.state, H1, d.state.towns['town_2']!.coord);
    quoteLaunchShip(catalog, d.state, P1, 'town_1', null);
    quoteDisembark(catalog, d.state, H1, cellIn(d.state, 9, 8));
    expect(d.state).toEqual(before);
    d.reject({ kind: 'AttackShip', heroId: H1, targetShipId: 'map_ship_free' });
    expect(d.state).toEqual(before);
    expect(hexKey(d.state.heroes[H1]!.position)).toBe(hexKey(before.heroes[H1]!.position));
  });
});
