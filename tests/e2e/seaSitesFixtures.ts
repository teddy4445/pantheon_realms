/**
 * Coastal sites and sea salvage fixtures (sea-sites kit 2026-10-17) built from the two-isle test map
 * (`packages/testing/src/naval.ts`): two coastal watchtowers on the west coast (Gull Point in warm
 * timber, Grey Cairn in cold stone above a rocky shore), the three kinds of floating salvage and two
 * wrecks (broken mast and split hull) in the sea between the islands. The map document passes the
 * editor's own validator; every change after it is compiled is an ordinary fixture edit of the saved
 * match (positions, armies, owners, the rival held in place) — the file is a normal save envelope
 * brought in through Load → Import, never a privileged hook.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createEnvelope, serializeEnvelope } from '@pr/session';
import { compileCustomMap, createGeneratedMatch, createRandomSkirmish, validateCustomMap, type CustomMapDocument, type CustomSite, type SkirmishGenOptions } from '@pr/campaign';
import { TERRAIN_CODES, axialDistance, cellIndex, missionSite, resources, shipInvariantIssues, type MatchState } from '@pr/rules';
import { GameDriver, catalog, cellOf, navalDoc, paint, slots } from '@pr/testing';

export const ME = 'player';
export const FOE = 'p2';
export const HERO = 'leader_1';
export const FOE_HERO = 'leader_2';

type Army = [string, number][];
type Outcome = NonNullable<CustomSite['outcome']>;

export const STRONG: Army = [
  ['labyrinth_warden', 12],
  ['stormforged_cyclops', 10],
  ['griffin', 30],
  ['cavalry', 30],
  ['temple_adept', 40],
  ['peltast', 80],
  ['veteran_hoplite', 120],
];

/** Rectangle cells (column, row) of the fixture's sites. */
export const AT = {
  towerWarm: [9, 7],
  towerCold: [9, 17],
  drift: [13, 8],
  cargo: [14, 11],
  treasury: [13, 15],
  wreckMast: [16, 8],
  wreckHull: [16, 16],
} as const;

export interface SeaFixtureOptions {
  /** What the split-hull wreck holds (default guarded salvage); the broken-mast wreck holds abandoned cargo. */
  readonly hullOutcome?: Outcome;
  readonly revealMap?: boolean;
}

/** The map document (validated by the editor's own checks). */
export function seaDoc(opts: SeaFixtureOptions = {}): CustomMapDocument {
  const doc = navalDoc({
    revealMap: opts.revealMap ?? true,
    // A rocky shore under Grey Cairn (its cold stone picture); the rest of the west coast is plain.
    terrain: (d) => paint(d, [cellOf(d, 8, 16), cellOf(d, 8, 17), cellOf(d, 8, 18), cellOf(d, 9, 18)], TERRAIN_CODES.rough),
    ships: (d) => [{ id: 'free', ...cellOf(d, 10, 8) }, { id: 'a', ...cellOf(d, 12, 3), owner: 0 }, { id: 'b', ...cellOf(d, 18, 2), owner: 1 }],
    sites: (d) => {
      const at = (id: string, kind: CustomSite['kind'], [x, y]: readonly [number, number], extra: Partial<CustomSite> = {}): CustomSite => ({ id, kind, ...cellOf(d, x, y), ...extra });
      return [
        at('tower_warm', 'coastal_watchtower', AT.towerWarm, { name: 'Gull Point' }),
        at('tower_cold', 'coastal_watchtower', AT.towerCold, { name: 'Grey Cairn' }),
        at('drift', 'sea_pickup', AT.drift, { resource: 'wood', amount: 5 }),
        at('cargo', 'sea_pickup', AT.cargo, { resource: 'stone', amount: 4 }),
        at('treasury', 'sea_pickup', AT.treasury, { resource: 'gold', amount: 400 }),
        at('wreck_mast', 'shipwreck', AT.wreckMast, { name: 'The Gannet', outcome: 'abandoned_cargo', skin: 'broken_mast' }),
        at('wreck_hull', 'shipwreck', AT.wreckHull, { name: 'The Kestrel', outcome: opts.hullOutcome ?? 'guarded_salvage', skin: 'split_hull' }),
      ];
    },
  });
  const errors = validateCustomMap(catalog, doc).filter((i) => i.severity === 'error');
  if (errors.length) throw new Error(`sea fixture map: ${errors.map((e) => e.message).join('; ')}`);
  return doc;
}

/** Hold an AI hero where it stands (a patrol of one waypoint that never attacks), so a computer turn never interferes. */
function hold(s: MatchState, heroId: string): void {
  const h = s.heroes[heroId];
  if (!h) return;
  h.ai = { profile: 'patrol', waypoints: [{ ...h.position }], waypointIndex: 0, regionMinQ: h.position.q - 1, regionMaxQ: h.position.q + 1, attackThreshold: { numerator: 1000, denominator: 1 } } as typeof h.ai;
}

function save(s: MatchState, name: string): string {
  const issues = shipInvariantIssues(catalog, s);
  if (issues.length) throw new Error(`fixture ${name}: ${issues.join('; ')}`);
  const env = createEnvelope(catalog, { match: s, campaign: null }, { id: 'manual-1', kind: 'manual', name, savedAt: new Date(0).toISOString() });
  const file = join(tmpdir(), `sea-sites-${name.replace(/\W+/g, '-')}.prsave.json`);
  writeFileSync(file, serializeEnvelope(env));
  return file;
}

function start(name: string, opts: SeaFixtureOptions = {}): MatchState {
  const doc = seaDoc(opts);
  const compiled = compileCustomMap(catalog, doc, [{ controller: 'human' }, { controller: 'ai' }]);
  const s = createGeneratedMatch(catalog, compiled, { matchId: `e2e-sea-${name}` }).match;
  const f = s.scenario.features!;
  s.scenario = { ...s.scenario, features: { ...f, weeklyEvents: false, aiTemperaments: false } };
  s.players[ME]!.wallet = resources({ gold: 6000, wood: 40, stone: 20, crystal: 5 });
  const cold = missionSite(catalog, s, 'tower_cold')!.kind;
  const warm = missionSite(catalog, s, 'tower_warm')!.kind;
  if (cold.type !== 'coastal_watchtower' || cold.skin !== 'cold' || warm.type !== 'coastal_watchtower' || warm.skin !== 'warm') throw new Error('sea fixture: the two tower pictures are not warm and cold');
  hold(s, FOE_HERO);
  return s;
}

const cell = (s: MatchState, [x, y]: readonly [number, number]) => cellOf(s.world.map, x, y);

/** Put a hero aboard a ship moved to `at` (a fixture edit), with an army and a full day's movement. */
function aboard(s: MatchState, heroId: string, shipId: string, at: readonly [number, number], army?: Army): void {
  const ship = s.world.ships![shipId]!;
  const hero = s.heroes[heroId]!;
  ship.coord = cell(s, at);
  ship.heroId = heroId;
  ship.state = 'occupied';
  hero.position = { ...ship.coord };
  if (army) hero.army.slots = slots(army);
  hero.movementPoints = 2000;
}

/** Every site in view: the player's hero on foot beside its town. `owned`: both lookouts already the player's. */
export function galleryFixture(name = 'gallery', owned = false): { file: string; state: MatchState } {
  const s = start(name);
  s.heroes[HERO]!.position = cell(s, [8, 12]);
  if (owned) {
    for (const id of ['tower_warm', 'tower_cold']) {
      s.world.sites[id]!.owner = ME;
      s.world.sites[id]!.cleared = true;
    }
  }
  return { file: save(s, name), state: s };
}

/** The player's hero on foot a short walk from Gull Point; the rival's ship (its hero aboard) in the lookout's sight. */
export function towerFixture(name = 'tower'): { file: string; state: MatchState } {
  const s = start(name, { revealMap: false });
  s.heroes[HERO]!.position = cell(s, [6, 9]);
  s.heroes[HERO]!.movementPoints = 2000;
  aboard(s, FOE_HERO, 'map_ship_b', [13, 4]);
  hold(s, FOE_HERO);
  const tower = cell(s, AT.towerWarm);
  if (axialDistance(tower, s.world.ships!.map_ship_b!.coord) > 6) throw new Error('tower fixture: the rival ship is out of the lookout\'s sight');
  return { file: save(s, name), state: s };
}

/** The player's hero aboard its own ship two hexes from the driftwood. */
export function salvageFixture(name = 'salvage'): { file: string; state: MatchState } {
  const s = start(name);
  aboard(s, HERO, 'map_ship_a', [12, 6]);
  return { file: save(s, name), state: s };
}

/** The player's hero aboard its own ship beside The Kestrel (split hull, guarded salvage), with a strong army. */
export function wreckFixture(name = 'wreck', hullOutcome: Outcome = 'guarded_salvage'): { file: string; state: MatchState } {
  const s = start(name, { hullOutcome });
  aboard(s, HERO, 'map_ship_a', [15, 16], STRONG);
  return { file: save(s, name), state: s };
}

/**
 * A naval random map (The Shattered Crown, 2 empires, huge) started like Random Map → Create World,
 * with the land and sea around the player's home marked explored (as if scouted) for the picture.
 */
export function navalRandomFixture(name = 'naval-random', mapType: 'shattered_crown' | 'serpent_straits' = 'shattered_crown', seed = 101): { file: string; state: MatchState } {
  const g = createRandomSkirmish(catalog, {
    seed,
    size: 'huge',
    seats: [
      { pantheonId: 'greek', controller: 'human' },
      { pantheonId: 'norse', controller: 'ai' },
    ],
    victory: mapType === 'shattered_crown' ? { type: 'hold_relic', days: 7 } : { type: 'elimination' },
    monsters: 'few',
    mapType,
  } as SkirmishGenOptions);
  const s = createGeneratedMatch(catalog, g, { matchId: `e2e-sea-${name}` }).match;
  const f = s.scenario.features!;
  s.scenario = { ...s.scenario, features: { ...f, weeklyEvents: false } };
  const at = Object.values(s.heroes).find((h) => h.ownerId === ME && h.status === 'active')!.position;
  const map = s.world.map;
  for (let r = 0; r < map.height; r++)
    for (let q = 0; q < map.width; q++) if (axialDistance({ q, r }, at) <= 11) s.fog[ME]!.explored[cellIndex(map, { q, r })] = 1;
  return { file: save(s, name), state: s };
}
