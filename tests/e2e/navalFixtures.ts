/**
 * Hero-ship fixtures (expedition kit §07/§08, `navalMovementV1`) built from the two-isle test map
 * (`packages/testing/src/naval.ts`): a west island with the player's coastal town and hero, a sea of
 * ten columns, an east island with the rival's town, and a neutral ship beside the west shore. Every
 * change after the map is compiled is an ordinary fixture edit of the saved match (positions, armies,
 * wallets, the rival held in its corner as a one-waypoint patrol) or a command through the rules'
 * processor; the file is a normal save envelope brought in through Load → Import — no privileged hooks.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createEnvelope, serializeEnvelope } from '@pr/session';
import { compileCustomMap, createGeneratedMatch } from '@pr/campaign';
import { axialNeighbors, resources, shipInvariantIssues, terrainAt, type MatchState } from '@pr/rules';
import { GameDriver, catalog, cellOf, navalDoc, navalDriver, slots } from '@pr/testing';

export const ME = 'player';
export const FOE = 'p2';
export const HERO = 'leader_1';
export const FOE_HERO = 'leader_2';

type Army = [string, number][];

export const STRONG: Army = [
  ['labyrinth_warden', 12],
  ['stormforged_cyclops', 10],
  ['griffin', 30],
  ['cavalry', 30],
  ['temple_adept', 40],
  ['peltast', 80],
  ['veteran_hoplite', 120],
];
export const WEAK7: Army = [
  ['hoplite', 1],
  ['peltast', 1],
  ['hoplite', 1],
  ['peltast', 1],
  ['hoplite', 1],
  ['peltast', 1],
  ['hoplite', 1],
];

/** Hold an AI hero where it stands (a patrol of one waypoint that never attacks), so a computer turn never interferes. */
function hold(s: MatchState, heroId: string): void {
  const h = s.heroes[heroId];
  if (!h) return;
  h.ai = { profile: 'patrol', waypoints: [{ ...h.position }], waypointIndex: 0, regionMinQ: h.position.q - 1, regionMaxQ: h.position.q + 1, attackThreshold: { numerator: 1000, denominator: 1 } } as typeof h.ai;
}

function save(d: { state: MatchState }, name: string): string {
  const issues = shipInvariantIssues(catalog, d.state);
  if (issues.length) throw new Error(`fixture ${name}: ${issues.join('; ')}`);
  const env = createEnvelope(catalog, { match: d.state, campaign: null }, { id: 'manual-1', kind: 'manual', name, savedAt: new Date(0).toISOString() });
  const file = join(tmpdir(), `naval-${name.replace(/\W+/g, '-')}.prsave.json`);
  writeFileSync(file, serializeEnvelope(env));
  return file;
}

function base(matchId: string): GameDriver {
  const d = navalDriver();
  d.state.matchId = matchId;
  const f = d.state.scenario.features!;
  d.state.scenario = { ...d.state.scenario, features: { ...f, weeklyEvents: false, aiTemperaments: false } };
  d.state.players[ME]!.wallet = resources({ gold: 6000, wood: 40, stone: 20, crystal: 5 });
  hold(d.state, FOE_HERO);
  return d;
}

/** The player's hero beside its town on the west island, the neutral ship by the shore; the voyage east is 4 days. */
export function voyageFixture(name = 'voyage'): { file: string; driver: GameDriver } {
  const d = base(`e2e-naval-${name}`);
  return { file: save(d, name), driver: d };
}

/** The player's coastal town with the Gold and Wood for a ship. */
export function launchFixture(name = 'launch'): { file: string; driver: GameDriver } {
  const d = base(`e2e-naval-${name}`);
  return { file: save(d, name), driver: d };
}

/**
 * Leader 1 aboard its own ship (rect 13,10) beside Leader 2 aboard the rival's (rect 14,10), mid-sea.
 * `attacker` / `defender`: the armies (default seven strong stacks against seven single creatures).
 */
export function boardingFixture(name = 'boarding', attacker: Army = STRONG, defender: Army = WEAK7, opts: { hemmed?: boolean } = {}): { file: string; driver: GameDriver } {
  const d0 = navalDriver({ ships: (doc) => [{ id: 'free', ...cellOf(doc, 10, 8) }, { id: 'a', ...cellOf(doc, 13, 10), owner: 0 }, { id: 'b', ...cellOf(doc, 14, 10), owner: 1 }] });
  d0.state.matchId = `e2e-naval-${name}`;
  const f = d0.state.scenario.features!;
  d0.state.scenario = { ...d0.state.scenario, features: { ...f, weeklyEvents: false, aiTemperaments: false } };
  const s = d0.state;
  for (const [heroId, shipId, army] of [
    [HERO, 'map_ship_a', attacker],
    [FOE_HERO, 'map_ship_b', defender],
  ] as const) {
    const ship = s.world.ships![shipId]!;
    const hero = s.heroes[heroId]!;
    ship.heroId = heroId;
    ship.state = 'occupied';
    hero.position = { ...ship.coord };
    hero.army.slots = slots(army);
    hero.movementPoints = 1000;
  }
  s.world.ships!.map_ship_a!.facing = 0;
  s.world.ships!.map_ship_b!.facing = 3;
  if (opts.hemmed) {
    // Empty hulls on every other water tile around the attacker's ship: no open water to withdraw to.
    const a = s.world.ships!.map_ship_a!;
    let n = 0;
    for (const c of axialNeighbors(a.coord)) {
      if (terrainAt(s.world.map, c) !== 'water' || Object.values(s.world.ships!).some((x) => x.coord.q === c.q && x.coord.r === c.r)) continue;
      const id = `map_ship_h${++n}`;
      s.world.ships![id] = { shipId: id, ownerId: null, coord: { ...c }, heroId: null, state: 'empty', facing: 0, lastActionTurn: 0 };
    }
  }
  hold(s, FOE_HERO);
  return { file: save(d0, name), driver: d0 };
}

const PANTHEONS = ['greek', 'norse', 'egyptian', 'japanese', 'celtic', 'mesoamerican'] as const;

/**
 * Six empires of six pantheons, each hero aboard its own ship in the player's sight, the six ships
 * facing the six hex directions (E, NE, NW, W, SW, SE), plus the neutral empty ship and an empty ship of
 * the player's: every heading (mirrors included), six owner colours independent of the pantheon.
 * `colours` swaps the empires' colours round (the same pantheons in other colours).
 */
export function fleetFixture(name = 'fleet', rotate = 0): { file: string; driver: GameDriver } {
  const doc0 = navalDoc();
  const towns: [number, number][] = [
    [9, 12],
    [3, 3],
    [3, 20],
    [6, 7],
    [6, 17],
    [1, 12],
  ];
  const fleet: [number, number][] = [
    [11, 9],
    [13, 10],
    [11, 12],
    [14, 12],
    [12, 14],
    [14, 14],
  ];
  const doc = {
    ...doc0,
    players: PANTHEONS.map((p, i) => ({ pantheonId: PANTHEONS[(i + rotate) % 6]! })),
    sites: towns.map(([x, y], i) => ({ id: `town_${String.fromCharCode(97 + i)}`, kind: 'town' as const, ...cellOf(doc0, x, y), owner: i })),
    ships: [{ id: 'free', ...cellOf(doc0, 10, 8) }, { id: 'spare', ...cellOf(doc0, 10, 15), owner: 0 }, ...fleet.map(([x, y], i) => ({ id: `e${i + 1}`, ...cellOf(doc0, x, y), owner: i }))],
  };
  const compiled = compileCustomMap(catalog, doc, doc.players.map((_, i) => ({ controller: i === 0 ? ('human' as const) : ('ai' as const) })));
  const s = createGeneratedMatch(catalog, compiled, { matchId: `e2e-naval-${name}` }).match;
  const f = s.scenario.features!;
  s.scenario = { ...s.scenario, features: { ...f, weeklyEvents: false, aiTemperaments: false } };
  const players = Object.values(s.players).sort((a, b) => (a.id < b.id ? -1 : 1));
  const order = Object.keys(s.players);
  void players;
  order.forEach((pid, i) => {
    const ship = s.world.ships![`map_ship_e${i + 1}`];
    const hero = Object.values(s.heroes).find((h) => h.ownerId === pid && h.status === 'active');
    if (!ship || !hero) return;
    ship.heroId = hero.id;
    ship.ownerId = pid;
    ship.state = 'occupied';
    ship.facing = i % 6;
    hero.position = { ...ship.coord };
    hold(s, hero.id);
  });
  return { file: save({ state: s }, name), driver: new GameDriver(s, catalog) };
}

/** The rival boards the player's ship (a boarding battle in progress, saved mid-battle): the player defends. */
export function defendFixture(name = 'defend'): { file: string; driver: GameDriver } {
  const f = boardingFixture(name, WEAK7, STRONG);
  const d = f.driver;
  d.state.activePlayerId = FOE;
  d.do({ kind: 'AttackShip', heroId: FOE_HERO, targetShipId: 'map_ship_a' }, FOE);
  if (!d.state.battle) throw new Error('no battle');
  return { file: save(d, name), driver: d };
}
