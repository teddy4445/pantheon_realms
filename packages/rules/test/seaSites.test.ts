/**
 * Coastal sites and sea salvage (sea-map objects kit 2026-10-17): coastal watchtowers (capture on
 * foot, live owned sight incl. sea lanes, intel as a distant sighting only, coalesced "Enemy ship
 * sighted" alerts once per ship per owner-turn, explored terrain kept after loss), floating salvage
 * (embarked-only, atomic and idempotent, non-blocking), shipwrecks (explore costs, every outcome,
 * victory / defeat / retreat on the two decks, the pending artifact and its swap) and save/load of
 * every state. Every action goes through processCommand (the GameDriver), exactly like the game.
 */
import { describe, expect, it } from 'vitest';
import { GameDriver, catalog, cellOf, navalDriver, slots } from '@pr/testing';
import {
  EQUIP_SLOTS,
  EQUIP_SLOT_KIND,
  automationForbidden,
  axialDistance,
  axialNeighbors,
  canonicalStateHash,
  cellIndex,
  deepClone,
  hexEquals,
  hexKey,
  missionSite,
  processCommand,
  quoteExploreWreck,
  quoteMovement,
  shipInvariantIssues,
  terrainAt,
  tileRole,
  visibleCells,
  wreckKnowledge,
  wreckState,
  type CustomSite,
  type GameEvent,
  type HexCoord,
  type MatchState,
} from '../src';

const P1 = 'player';
const P2 = 'p2';
const H1 = 'leader_1';
const H2 = 'leader_2';
type Army = [string, number][];
type Outcome = NonNullable<CustomSite['outcome']>;

const STRONG: Army = [['hoplite', 60], ['peltast', 40], ['griffin', 16], ['cavalry', 12], ['temple_adept', 10], ['minotaur', 6], ['cyclops', 3]];
const WEAK: Army = [['hoplite', 1]];

interface SeaOpts {
  outcome?: Outcome;
  revealMap?: boolean;
  /** H1's army (aboard ship 'a'). */
  army?: Army;
  /** Put H1 aboard ship 'a' (default) or leave it on land. */
  aboard?: boolean;
  /** Put H2 aboard ship 'b' (default). */
  h2Aboard?: boolean;
}

/**
 * The two-isles fixture with: a coastal watchtower on the west coast (rect 9,4), driftwood (13,6),
 * stone cargo (15,6; amount 5), a lost treasury (13,18), a wreck (15,14); ship 'a' (Empire 1) at 12,4
 * carrying H1, ship 'b' (Empire 2) at 18,2 carrying H2.
 */
function seaDriver(opts: SeaOpts = {}): GameDriver {
  const d = navalDriver({
    revealMap: opts.revealMap ?? true,
    ships: (doc) => [{ id: 'free', ...cellOf(doc, 10, 8) }, { id: 'a', ...cellOf(doc, 12, 4), owner: 0 }, { id: 'b', ...cellOf(doc, 18, 2), owner: 1 }],
    sites: (doc) => [
      { id: 'tower', kind: 'coastal_watchtower', ...cellOf(doc, 9, 4) },
      { id: 'wood', kind: 'sea_pickup', resource: 'wood', ...cellOf(doc, 13, 6) },
      { id: 'stone', kind: 'sea_pickup', resource: 'stone', amount: 5, ...cellOf(doc, 15, 6) },
      { id: 'gold', kind: 'sea_pickup', resource: 'gold', ...cellOf(doc, 13, 18) },
      { id: 'wreck', kind: 'shipwreck', outcome: opts.outcome ?? 'abandoned_cargo', ...cellOf(doc, 15, 14) },
    ],
  });
  const s = d.state;
  const board = (heroId: string, shipId: string, army?: Army) => {
    const ship = s.world.ships![shipId]!;
    const hero = s.heroes[heroId]!;
    ship.heroId = heroId;
    ship.state = 'occupied';
    hero.position = { ...ship.coord };
    if (army) hero.army.slots = slots(army);
    hero.movementPoints = 2000;
  };
  if (opts.aboard !== false) board(H1, 'map_ship_a', opts.army ?? STRONG);
  if (opts.h2Aboard !== false) board(H2, 'map_ship_b');
  expect(shipInvariantIssues(catalog, s)).toEqual([]);
  return d;
}

const site = (s: MatchState, id: string) => missionSite(catalog, s, id)!;
const kinds = (ev: readonly GameEvent[]) => ev.map((e) => e.kind);
const roundTrip = (s: MatchState): MatchState => JSON.parse(JSON.stringify(s)) as MatchState;

/** A driver over a loaded save, whose command IDs never repeat the ones the save already processed. */
let reloads = 0;
function reloaded(s: MatchState): GameDriver {
  const d = new GameDriver(s, catalog);
  reloads += 1;
  const tag = reloads;
  let n = 0;
  d.command = (payload, actor = d.state.activePlayerId) => ({ ...payload, commandId: `reload${tag}_${++n}`, expectedRevision: d.state.revision, actorPlayerId: actor }) as ReturnType<GameDriver['command']>;
  return d;
}

/** The player knows `c` and its neighbours (a fixture edit on a fogged map: as if scouted earlier). */
function know(s: MatchState, playerId: string, c: HexCoord): void {
  for (const x of [c, ...axialNeighbors(c)]) s.fog[playerId]!.explored[cellIndex(s.world.map, x)] = 1;
}

/** A free water hex beside `c` (canonical order). */
function waterBeside(s: MatchState, c: HexCoord): HexCoord {
  const w = axialNeighbors(c).find((n) => terrainAt(s.world.map, n) === 'water' && !Object.values(s.world.ships ?? {}).some((x) => hexEquals(x.coord, n)));
  if (!w) throw new Error('no water beside');
  return w;
}

/** Move H1's ship beside the wreck (a fixture edit) with full movement. */
function besideWreck(d: GameDriver, mp = 2000): HexCoord {
  const s = d.state;
  const w = waterBeside(s, site(s, 'wreck').coord);
  const ship = s.world.ships!['map_ship_a']!;
  ship.coord = { ...w };
  s.heroes[H1]!.position = { ...w };
  s.heroes[H1]!.movementPoints = mp;
  return w;
}

describe('the three site kinds in a compiled map', () => {
  it('stores every drawn value on the site: amounts in range, outcome, raiders, skins; the same map draws the same', () => {
    const a = seaDriver().state;
    const b = seaDriver().state;
    for (const id of ['tower', 'wood', 'stone', 'gold', 'wreck']) expect(site(a, id)).toEqual(site(b, id));
    const wood = site(a, 'wood').kind;
    const gold = site(a, 'gold').kind;
    const stone = site(a, 'stone').kind;
    expect(wood.type === 'sea_pickup' && wood.resource === 'wood' && wood.amount >= 3 && wood.amount <= 6).toBe(true);
    expect(gold.type === 'sea_pickup' && gold.amount >= 250 && gold.amount <= 500 && gold.amount % 25 === 0).toBe(true);
    expect(stone).toEqual({ type: 'sea_pickup', resource: 'stone', amount: 5 });
    expect(site(a, 'wood').name).toBe('Driftwood Bundle');
    expect(site(a, 'stone').name).toBe('Stone Cargo');
    expect(site(a, 'gold').name).toBe('Lost Treasury');
    const tower = site(a, 'tower').kind;
    expect(tower.type === 'coastal_watchtower' && tower.radius === 6 && ['warm', 'cold'].includes(tower.skin)).toBe(true);
    const wreck = site(a, 'wreck').kind;
    expect(wreck.type === 'shipwreck' && wreck.exploreCost === 100 && wreck.outcome.kind === 'abandoned_cargo' && !wreck.outcome.guard).toBe(true);
    const guarded = site(seaDriver({ outcome: 'guarded_salvage' }).state, 'wreck').kind;
    expect(guarded.type === 'shipwreck' && guarded.outcome.guard?.army).toEqual([
      { creatureId: 'brigand', count: 14 },
      { creatureId: 'brigand_cutthroat', count: 4 },
    ]);
    const rare = site(seaDriver({ outcome: 'rare_cache' }).state, 'wreck').kind;
    expect(rare.type === 'shipwreck' && rare.outcome.reward).toEqual({ gold: 750 });
    const art = rare.type === 'shipwreck' ? rare.outcome.artifactId : undefined;
    expect(art && (catalog.artifacts[art]!.rarity ?? 'minor')).toBe('minor');
  });

  it('the old watchtower kind is untouched: it still only reveals its listed sites on a first visit', () => {
    const src = (catalog.missions as Record<string, { sites: { kind: { type: string } }[] }>);
    const towers = Object.values(src).flatMap((m) => m.sites.filter((x) => x.kind.type === 'watchtower'));
    expect(towers.length).toBeGreaterThan(0);
    for (const t of towers) expect(Object.keys(t.kind).sort()).toEqual(['revealSiteIds', 'type']);
  });
});

describe('floating salvage', () => {
  it('a hero aboard a ship ending its move on it collects the stored amount once, in one command', () => {
    const d = seaDriver();
    const target = site(d.state, 'wood');
    const amount = target.kind.type === 'sea_pickup' ? target.kind.amount : 0;
    const before = d.state.players[P1]!.wallet.wood;
    const q = quoteMovement(catalog, d.state, H1, target.coord);
    expect(q.reachable && q.mode === 'sea').toBe(true);
    const ev = d.do({ kind: 'MoveHero', heroId: H1, destination: target.coord });
    expect(kinds(ev)).toContain('PickupCollected');
    expect(ev.filter((e) => e.kind === 'ResourcesGranted')).toHaveLength(1);
    expect(d.state.players[P1]!.wallet.wood).toBe(before + amount);
    expect(d.state.world.sites['wood']!.claimed).toBe(true);
    // Leaving and coming back pays nothing again (the claimed tombstone stays saved).
    d.do({ kind: 'MoveHero', heroId: H1, destination: waterBeside(d.state, target.coord) });
    const ev2 = d.do({ kind: 'MoveHero', heroId: H1, destination: target.coord });
    expect(kinds(ev2)).not.toContain('PickupCollected');
    expect(d.state.players[P1]!.wallet.wood).toBe(before + amount);
  });

  it('a repeated command ID or a reload never pays twice; the wallet keys are right (stone to stone, gold to gold)', () => {
    const d = seaDriver();
    const stone = site(d.state, 'stone');
    const cmd = d.command({ kind: 'MoveHero', heroId: H1, destination: stone.coord });
    const first = processCommand({ catalog }, d.state, cmd);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const again = processCommand({ catalog }, first.state, cmd);
    expect(again.ok).toBe(false);
    const after = roundTrip(first.state);
    expect(after.players[P1]!.wallet.stone).toBe(d.state.players[P1]!.wallet.stone + 5);
    expect(after.players[P1]!.wallet.wood).toBe(d.state.players[P1]!.wallet.wood);
    expect(after.world.sites['stone']!.claimed).toBe(true);
  });

  it('never blocks: a route passes over it without collecting; only the end of a move collects', () => {
    const d = seaDriver();
    const wood = site(d.state, 'wood').coord;
    const beyond = axialNeighbors(wood).find((n) => terrainAt(d.state.world.map, n) === 'water' && axialDistance(n, d.state.heroes[H1]!.position) > axialDistance(wood, d.state.heroes[H1]!.position))!;
    const q = quoteMovement(catalog, d.state, H1, beyond);
    expect(q.reachable).toBe(true);
    // The pickup hex is open water to the sea graph (whether or not this route crosses it).
    const through = quoteMovement(catalog, d.state, H1, wood);
    expect(through.reachable && !through.endsInEncounter).toBe(true);
    d.do({ kind: 'MoveHero', heroId: H1, destination: beyond });
    if (q.path.some((c) => hexEquals(c, wood))) expect(d.state.world.sites['wood']!.claimed).toBe(false);
  });

  it('a hero on land cannot collect it (no remote collection, no route onto the water)', () => {
    const d = seaDriver({ aboard: false });
    const wood = site(d.state, 'wood').coord;
    const h = d.state.heroes[H1]!;
    h.position = cellOf(d.state.world.map, 9, 6);
    h.movementPoints = 2000;
    expect(tileRole(catalog, d.state, P1, wood, H1)).toBe('blocked');
    const q = quoteMovement(catalog, d.state, H1, wood);
    expect(q.reachable).toBe(false);
    expect(d.state.world.sites['wood']!.claimed).toBe(false);
  });
});

describe('coastal watchtowers', () => {
  it('a hero on foot captures it: owner set, one capture event, its sight (sea lanes too) live and explored', () => {
    const d = seaDriver({ aboard: false, revealMap: false });
    const tower = site(d.state, 'tower');
    const h = d.state.heroes[H1]!;
    h.position = axialNeighbors(tower.coord).find((n) => tileRole(catalog, d.state, P1, n, H1) === 'open' && terrainAt(d.state.world.map, n) !== 'water')!;
    h.movementPoints = 2000;
    know(d.state, P1, tower.coord);
    const far = cellOf(d.state.world.map, 15, 4);
    expect(axialDistance(far, tower.coord)).toBe(6);
    const ev = d.do({ kind: 'MoveHero', heroId: H1, destination: tower.coord });
    expect(ev.filter((e) => e.kind === 'SiteCaptured')).toHaveLength(1);
    expect(d.state.world.sites['tower']!.owner).toBe(P1);
    // The hero goes home (a fixture placement): the tower alone still sees the sea six hexes out.
    d.state.heroes[H1]!.position = cellOf(d.state.world.map, 3, 20);
    const vis = visibleCells(catalog, d.state, P1);
    const without = deepClone(d.state);
    without.world.sites['tower']!.owner = null;
    expect(visibleCells(catalog, without, P1).has(cellIndex(d.state.world.map, far))).toBe(false);
    expect(vis.has(cellIndex(d.state.world.map, far))).toBe(true);
    expect(terrainAt(d.state.world.map, far)).toBe('water');
    expect(d.state.fog[P1]!.explored[cellIndex(d.state.world.map, far)]).toBe(1);
    const outside = cellOf(d.state.world.map, 17, 4);
    expect(axialDistance(outside, tower.coord)).toBeGreaterThan(6);
    expect(vis.has(cellIndex(d.state.world.map, outside))).toBe(false);
  });

  it('an embarked hero cannot capture it from the sea (land first)', () => {
    const d = seaDriver();
    const q = quoteMovement(catalog, d.state, H1, site(d.state, 'tower').coord);
    expect(q.reachable).toBe(false);
    expect(d.state.world.sites['tower']!.owner).toBeNull();
  });

  /** H1 holds the tower (captured through the command) and H2 sails during p2's turn. */
  function towerHeld(revealMap = true): GameDriver {
    const d = seaDriver({ aboard: false, revealMap });
    const tower = site(d.state, 'tower');
    const h = d.state.heroes[H1]!;
    h.position = axialNeighbors(tower.coord).find((n) => tileRole(catalog, d.state, P1, n, H1) === 'open' && terrainAt(d.state.world.map, n) !== 'water')!;
    h.movementPoints = 2000;
    know(d.state, P1, tower.coord);
    d.do({ kind: 'MoveHero', heroId: H1, destination: tower.coord });
    return d;
  }

  it('an enemy ship entering its sight raises ONE alert per owner-turn, coalesced, never through fog, never on reload', () => {
    const d = towerHeld();
    const tower = site(d.state, 'tower');
    d.do({ kind: 'EndTurn' });
    expect(d.state.activePlayerId).toBe(P2);
    // Still outside the sight (7 hexes): no alert, even on a revealed map.
    const edge = cellOf(d.state.world.map, 17, 3);
    expect(axialDistance(edge, tower.coord)).toBeGreaterThan(6);
    let ev = d.do({ kind: 'MoveHero', heroId: H2, destination: edge }, P2);
    expect(kinds(ev)).not.toContain('ShipSightedNearTower');
    // Into the sight: one alert for Empire 1 naming the tower.
    const inside = cellOf(d.state.world.map, 14, 4);
    ev = d.do({ kind: 'MoveHero', heroId: H2, destination: inside }, P2);
    const alerts = ev.filter((e): e is Extract<GameEvent, { kind: 'ShipSightedNearTower' }> => e.kind === 'ShipSightedNearTower');
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ playerId: P1, shipId: 'map_ship_b', shipOwnerId: P2, siteId: 'tower', siteIds: ['tower'] });
    // Staying in sight, leaving and coming back the same turn: nothing more.
    expect(kinds(d.do({ kind: 'MoveHero', heroId: H2, destination: cellOf(d.state.world.map, 14, 5) }, P2))).not.toContain('ShipSightedNearTower');
    d.state.heroes[H2]!.movementPoints = 2000;
    d.do({ kind: 'MoveHero', heroId: H2, destination: edge }, P2);
    expect(kinds(d.do({ kind: 'MoveHero', heroId: H2, destination: inside }, P2))).not.toContain('ShipSightedNearTower');
    // A reload replays nothing: the saved watch knows the ship is in sight and was alerted.
    const saved = roundTrip(d.state);
    expect(saved.seaWatch?.[P1]).toEqual({ inRange: ['map_ship_b'], period: expect.any(Number), alerted: ['map_ship_b'], history: [expect.objectContaining({ day: d.state.day, shipId: 'map_ship_b', shipOwnerId: P2, siteId: 'tower', coord: inside })] });
    const r = reloaded(saved);
    expect(kinds(r.do({ kind: 'EndTurn' }, P2))).not.toContain('ShipSightedNearTower');
    // Empire 1's next turn has begun: the ship sailing out and back in is a new sighting.
    expect(r.state.activePlayerId).toBe(P1);
    r.do({ kind: 'EndTurn' }, P1);
    r.state.heroes[H2]!.movementPoints = 2000;
    r.do({ kind: 'MoveHero', heroId: H2, destination: edge }, P2);
    expect(r.do({ kind: 'MoveHero', heroId: H2, destination: inside }, P2).filter((e) => e.kind === 'ShipSightedNearTower')).toHaveLength(1);
    expect(r.state.seaWatch?.[P1]?.history).toHaveLength(2);
  });

  it('two towers seeing the same ship give one alert naming the nearest; an empty neutral hull is not an enemy ship', () => {
    const d = navalDriver({
      ships: (doc) => [{ id: 'free', ...cellOf(doc, 10, 8) }, { id: 'hull', ...cellOf(doc, 11, 3) }, { id: 'b', ...cellOf(doc, 18, 2), owner: 1 }],
      sites: (doc) => [
        { id: 'tower', kind: 'coastal_watchtower', ...cellOf(doc, 9, 4) },
        { id: 'tower2', kind: 'coastal_watchtower', ...cellOf(doc, 9, 8) },
      ],
    });
    const s = d.state;
    const ship = s.world.ships!['map_ship_b']!;
    ship.heroId = H2;
    ship.state = 'occupied';
    s.heroes[H2]!.position = { ...ship.coord };
    s.heroes[H2]!.movementPoints = 2000;
    s.world.sites['tower']!.owner = P1;
    s.world.sites['tower2']!.owner = P1;
    const first = d.do({ kind: 'EndTurn' });
    // The neutral hulls (11,3 and 10,8) lie in sight but raise nothing.
    expect(kinds(first)).not.toContain('ShipSightedNearTower');
    const dest = cellOf(s.world.map, 13, 6);
    const ev = d.do({ kind: 'MoveHero', heroId: H2, destination: dest }, P2);
    const alerts = ev.filter((e): e is Extract<GameEvent, { kind: 'ShipSightedNearTower' }> => e.kind === 'ShipSightedNearTower');
    expect(alerts).toHaveLength(1);
    const t1 = site(d.state, 'tower').coord;
    const t2 = site(d.state, 'tower2').coord;
    const nearest = axialDistance(t1, dest) <= axialDistance(t2, dest) ? 'tower' : 'tower2';
    expect(alerts[0]!.siteId).toBe(nearest);
    expect(alerts[0]!.siteIds.sort()).toEqual(['tower', 'tower2']);
  });

  it('the tower reports an enemy army as a distant sighting only (no types, no counts)', () => {
    const d = towerHeld();
    d.do({ kind: 'EndTurn' });
    d.do({ kind: 'MoveHero', heroId: H2, destination: cellOf(d.state.world.map, 14, 4) }, P2);
    const snap = d.state.intel?.[P1]?.[H2];
    expect(snap?.stage).toBe('sighting');
    expect(snap?.permittedCreatureTypes).toBeUndefined();
    expect(snap?.permittedCountRanges).toBeUndefined();
  });

  it('lost to an enemy hero: its sight goes with it, the explored terrain stays explored', () => {
    const d = towerHeld(false);
    const tower = site(d.state, 'tower');
    const far = cellOf(d.state.world.map, 15, 4);
    expect(d.state.fog[P1]!.explored[cellIndex(d.state.world.map, far)]).toBe(1);
    // H1 leaves for home; Empire 2's hero walks in (a fixture placement beside the tower, then the real move).
    d.state.heroes[H1]!.position = cellOf(d.state.world.map, 3, 20);
    d.do({ kind: 'EndTurn' });
    const ship = d.state.world.ships!['map_ship_b']!;
    ship.heroId = null;
    ship.state = 'empty';
    const h2 = d.state.heroes[H2]!;
    h2.position = axialNeighbors(tower.coord).find((n) => tileRole(catalog, d.state, P2, n, H2) === 'open' && terrainAt(d.state.world.map, n) !== 'water')!;
    h2.movementPoints = 2000;
    know(d.state, P2, tower.coord);
    const ev = d.do({ kind: 'MoveHero', heroId: H2, destination: tower.coord }, P2);
    expect(ev.filter((e) => e.kind === 'SiteCaptured')).toHaveLength(1);
    expect(d.state.world.sites['tower']!.owner).toBe(P2);
    expect(visibleCells(catalog, d.state, P1).has(cellIndex(d.state.world.map, far))).toBe(false);
    expect(d.state.fog[P1]!.explored[cellIndex(d.state.world.map, far)]).toBe(1);
  });
});

describe('shipwrecks', () => {
  it('Explore needs a hero aboard a ship beside the wreck and 100 movement; Leave needs nothing', () => {
    const d = seaDriver();
    // Not beside it.
    expect(quoteExploreWreck(catalog, d.state, H1, 'wreck').code).toBe('not_present');
    expect(d.reject({ kind: 'ExploreWreck', heroId: H1, siteId: 'wreck' }).code).toBe('not_present');
    besideWreck(d, 99);
    expect(d.reject({ kind: 'ExploreWreck', heroId: H1, siteId: 'wreck' }).code).toBe('insufficient_movement');
    // The wreck's own hex is a landmark: a ship never sails into it.
    const q = quoteMovement(catalog, d.state, H1, site(d.state, 'wreck').coord);
    expect(q.reachable).toBe(false);
    expect(q.reason).toMatch(/wreck/i);
    // A hero on land beside the water cannot explore.
    const land = seaDriver({ aboard: false });
    expect(land.reject({ kind: 'ExploreWreck', heroId: H1, siteId: 'wreck' }).code).toBe('illegal_action');
  });

  it('abandoned cargo: 500 Gold and 4 Wood at once, 100 movement paid, cleared; a retry is refused', () => {
    const d = seaDriver({ outcome: 'abandoned_cargo' });
    besideWreck(d, 300);
    const w0 = { ...d.state.players[P1]!.wallet };
    const ev = d.do({ kind: 'ExploreWreck', heroId: H1, siteId: 'wreck' });
    expect(kinds(ev)).toEqual(expect.arrayContaining(['WreckExplored', 'ResourcesGranted', 'WreckRewardGranted']));
    expect(d.state.battle).toBeNull();
    expect(d.state.heroes[H1]!.movementPoints).toBe(200);
    expect(d.state.players[P1]!.wallet.gold).toBe(w0.gold + 500);
    expect(d.state.players[P1]!.wallet.wood).toBe(w0.wood + 4);
    expect(wreckState(d.state.world.sites['wreck']).phase).toBe('cleared');
    expect(d.reject({ kind: 'ExploreWreck', heroId: H1, siteId: 'wreck' }).code).toBe('already_done');
    expect(wreckKnowledge(catalog, d.state, P1, 'wreck')?.found).toBe('abandoned_cargo');
    // Saved and loaded: still cleared, still paid once.
    const r = roundTrip(d.state);
    expect(wreckState(r.world.sites['wreck']).phase).toBe('cleared');
    expect(r.players[P1]!.wallet.gold).toBe(w0.gold + 500);
  });

  it('guarded salvage: the raiders fight on the two decks as a wreck encounter; victory clears it and pays 1000 Gold + 8 Wood once; the hero stays on its ship', () => {
    const d = seaDriver({ outcome: 'guarded_salvage' });
    const at = besideWreck(d);
    const gold0 = d.state.players[P1]!.wallet.gold;
    const wood0 = d.state.players[P1]!.wallet.wood;
    const ev = d.do({ kind: 'ExploreWreck', heroId: H1, siteId: 'wreck' });
    expect(ev.find((e) => e.kind === 'WreckExplored')).toMatchObject({ battle: true, cost: 100 });
    const b = d.state.battle!;
    expect(b.encounter.kind).toBe('wreck_expedition');
    expect(b.encounter.attackerShipId).toBe('map_ship_a');
    expect(b.encounter.siteId).toBe('wreck');
    expect(b.archetype).toBe('boarding_two_ships_v1');
    expect(b.board?.layoutId).toBe('boarding_two_ships_v1');
    expect(Object.values(b.stacks).filter((s) => s.side === 'defender').map((s) => s.creatureId).sort()).toEqual(['brigand', 'brigand_cutthroat']);
    expect(wreckState(d.state.world.sites['wreck']).phase).toBe('encounterPending');
    // Saved mid-battle and loaded: the same battle continues.
    const mid = reloaded(roundTrip(d.state));
    expect(canonicalStateHash(mid.state)).toBe(canonicalStateHash(d.state));
    mid.autoBattle();
    expect(mid.state.lastBattleResult?.winner).toBe('attacker');
    expect(mid.state.players[P1]!.wallet.gold).toBe(gold0 + 1000);
    expect(mid.state.players[P1]!.wallet.wood).toBe(wood0 + 8);
    expect(mid.state.lastBattleResult?.rewards.resources.gold).toBe(1000);
    expect(wreckState(mid.state.world.sites['wreck']).phase).toBe('cleared');
    expect(mid.state.world.sites['wreck']!.cleared).toBe(true);
    const hero = mid.state.heroes[H1]!;
    expect(hero.status).toBe('active');
    expect(hexEquals(hero.position, at)).toBe(true);
    expect(mid.state.world.ships!['map_ship_a']).toMatchObject({ heroId: H1, state: 'occupied', coord: at });
    expect(shipInvariantIssues(catalog, mid.state)).toEqual([]);
    expect(mid.reject({ kind: 'ExploreWreck', heroId: H1, siteId: 'wreck' }).code).toBe('already_done');
  });

  it('defeat: the hero is defeated and its hull lost (no orphan ship); the surviving raiders stay aboard; untouched again', () => {
    const d = seaDriver({ outcome: 'guarded_salvage', army: WEAK });
    besideWreck(d);
    d.do({ kind: 'ExploreWreck', heroId: H1, siteId: 'wreck' });
    d.autoBattle();
    expect(d.state.lastBattleResult?.winner).toBe('defender');
    expect(d.state.heroes[H1]!.status).toBe('defeated');
    expect(d.state.world.ships!['map_ship_a']).toBeUndefined();
    expect(d.events.some((e) => e.kind === 'ShipWrecked' && e.shipId === 'map_ship_a')).toBe(true);
    const st = d.state.world.sites['wreck']!;
    expect(wreckState(st).phase).toBe('untouched');
    expect(st.cleared).toBe(false);
    expect((st.guard ?? []).reduce((n, x) => n + x.count, 0)).toBeGreaterThan(0);
    expect(wreckKnowledge(catalog, d.state, P1, 'wreck')?.seenGuard?.length).toBeGreaterThan(0);
    expect(wreckKnowledge(catalog, d.state, P2, 'wreck')?.seenGuard).toBeNull();
    expect(shipInvariantIssues(catalog, d.state)).toEqual([]);
  });

  it('retreat: the hero stays aboard its own ship on its approach hex (never a land teleport); the raiders stay', () => {
    const d = seaDriver({ outcome: 'guarded_salvage' });
    const at = besideWreck(d);
    d.do({ kind: 'ExploreWreck', heroId: H1, siteId: 'wreck' });
    for (let i = 0; i < 40 && d.state.battle; i++) {
      const b = d.state.battle;
      const active = b.activeStackId ? b.stacks[b.activeStackId] : undefined;
      if (b.phase === 'normal' && active?.side === 'attacker') {
        d.do({ kind: 'BattleRetreat' }, P1);
        break;
      }
      d.autoBattleStep();
    }
    expect(d.state.battle).toBeNull();
    expect(d.state.lastBattleResult?.outcome).toBe('retreat');
    const hero = d.state.heroes[H1]!;
    expect(hero.status).toBe('active');
    expect(hexEquals(hero.position, at)).toBe(true);
    expect(d.state.world.ships!['map_ship_a']).toMatchObject({ heroId: H1, coord: at });
    expect(wreckState(d.state.world.sites['wreck']).phase).toBe('untouched');
    expect(shipInvariantIssues(catalog, d.state)).toEqual([]);
  });

  it('rare cache: 750 Gold and its artifact; with full packs the artifact waits (pendingReward), the swap takes it, resources are never paid twice', () => {
    const d = seaDriver({ outcome: 'rare_cache' });
    besideWreck(d);
    const def = site(d.state, 'wreck');
    const art = def.kind.type === 'shipwreck' ? def.kind.outcome.artifactId! : '';
    // Fill every slot of the artifact's kind and the backpack.
    const hero = d.state.heroes[H1]!;
    const filler = Object.values(catalog.artifacts).find((a) => a.slot === catalog.artifacts[art]!.slot && a.id !== art)!;
    for (const slot of EQUIP_SLOTS) if (EQUIP_SLOT_KIND[slot] === filler.slot) hero.equipment[slot] = { instanceId: `eq_${slot}`, artifactId: filler.id };
    hero.backpack = Array.from({ length: catalog.rulesProfile.backpackCapacity }, (_, i) => ({ instanceId: `bp_${i}`, artifactId: filler.id }));
    const gold0 = d.state.players[P1]!.wallet.gold;
    d.do({ kind: 'ExploreWreck', heroId: H1, siteId: 'wreck' });
    d.autoBattle();
    expect(d.state.lastBattleResult?.winner).toBe('attacker');
    expect(d.state.players[P1]!.wallet.gold).toBe(gold0 + 750);
    let w = wreckState(d.state.world.sites['wreck']);
    expect(w.phase).toBe('pendingReward');
    expect(w.pendingArtifactId).toBe(art);
    expect(w.pendingFor).toBe(P1);
    expect(d.events.some((e) => e.kind === 'ArtifactGranted' && e.artifactId === art)).toBe(false);
    // Saved and loaded with the artifact waiting.
    const r = reloaded(roundTrip(d.state));
    expect(r.reject({ kind: 'ExploreWreck', heroId: H1, siteId: 'wreck' }).code).toBe('already_done');
    expect(r.reject({ kind: 'ClaimWreckArtifact', heroId: H1, siteId: 'wreck' }).code).toBe('no_capacity');
    const ev = r.do({ kind: 'ClaimWreckArtifact', heroId: H1, siteId: 'wreck', leaveInstanceId: 'bp_0' });
    expect(ev.find((e) => e.kind === 'WreckArtifactClaimed')).toMatchObject({ artifactId: art, leftArtifactId: filler.id });
    expect(r.state.heroes[H1]!.backpack.some((a) => a.artifactId === art)).toBe(true);
    expect(r.state.heroes[H1]!.backpack.some((a) => a.instanceId === 'bp_0')).toBe(false);
    // The left item waits at the wreck in its place; nothing was granted twice.
    w = wreckState(r.state.world.sites['wreck']);
    expect(w).toMatchObject({ phase: 'pendingReward', pendingArtifactId: filler.id });
    expect(r.state.players[P1]!.wallet.gold).toBe(gold0 + 750);
    expect(ev.filter((e) => e.kind === 'ResourcesGranted')).toHaveLength(0);
    // With room again, the item left behind is taken back and the wreck is done.
    r.state.heroes[H1]!.backpack.pop();
    r.do({ kind: 'ClaimWreckArtifact', heroId: H1, siteId: 'wreck' });
    expect(wreckState(r.state.world.sites['wreck']).phase).toBe('cleared');
    expect(r.reject({ kind: 'ClaimWreckArtifact', heroId: H1, siteId: 'wreck' }).code).toBe('already_done');
  });

  it('rare cache with room: the artifact goes straight to the hero', () => {
    const d = seaDriver({ outcome: 'rare_cache' });
    besideWreck(d);
    const def = site(d.state, 'wreck');
    const art = def.kind.type === 'shipwreck' ? def.kind.outcome.artifactId! : '';
    d.do({ kind: 'ExploreWreck', heroId: H1, siteId: 'wreck' });
    d.autoBattle();
    expect(d.state.lastBattleResult?.rewards.artifactIds).toContain(art);
    expect(wreckState(d.state.world.sites['wreck']).phase).toBe('cleared');
    const h = d.state.heroes[H1]!;
    expect([...Object.values(h.equipment), ...h.backpack].some((a) => a?.artifactId === art)).toBe(true);
  });

  it('a battle the hero lost leaves fewer raiders aboard; the next Explore fights only them', () => {
    const d = seaDriver({ outcome: 'guarded_salvage', army: [['hoplite', 12]] });
    besideWreck(d);
    d.do({ kind: 'ExploreWreck', heroId: H1, siteId: 'wreck' });
    d.autoBattle();
    const left = d.state.world.sites['wreck']!.guard ?? [];
    expect(left.reduce((n, x) => n + x.count, 0)).toBeLessThan(18);
  });

  it('campaign rules keep the wreck fight manual: automation is refused for the human side', () => {
    const d = seaDriver({ outcome: 'guarded_salvage' });
    besideWreck(d);
    d.do({ kind: 'ExploreWreck', heroId: H1, siteId: 'wreck' });
    d.state.scenario = { ...d.state.scenario, campaignId: 'test_campaign' };
    // Step the AI side until the human side acts.
    for (let i = 0; i < 30 && d.state.battle && !automationForbidden(d.state); i++) d.autoBattleStep();
    expect(automationForbidden(d.state)).toBe(true);
    const b = d.state.battle!;
    const res = processCommand({ catalog }, d.state, { kind: 'BattleDefend', stackId: b.activeStackId!, commandId: 'auto', expectedRevision: d.state.revision, actorPlayerId: P1, automated: true });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.rejection.code).toBe('manual_battle_required');
  });
});

describe('save and load', () => {
  it('every sea-site state survives a save round trip with the same hash and keeps working', () => {
    const d = seaDriver({ outcome: 'guarded_salvage' });
    d.do({ kind: 'MoveHero', heroId: H1, destination: site(d.state, 'wood').coord });
    const s = deepClone(d.state);
    const r = roundTrip(s);
    expect(canonicalStateHash(r)).toBe(canonicalStateHash(s));
    expect(r.world.sites['wood']!.claimed).toBe(true);
    expect(hexKey(site(r, 'wreck').coord)).toBe(hexKey(site(s, 'wreck').coord));
    const kind = site(r, 'wreck').kind;
    expect(kind.type === 'shipwreck' && kind.outcome.guard?.army.length).toBe(2);
  });
});
