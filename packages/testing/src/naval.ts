/**
 * Test fixture for hero ships (scenario feature `navalMovementV1`): a small custom map with two
 * islands and a sea between them, compiled and started like any editor map (rules, AI and session
 * tests share it).
 *
 * Rectangle columns 0-9 are the west island, 10-19 the sea, 20-29 the east island (24 rows).
 * Empire 1 (Greek, human seat 'player', hero 'leader_1') has the coastal town at (9, 12); empire 2
 * (Greek, AI seat 'p2', hero 'leader_2') the coastal town at (20, 12). A neutral ship lies at
 * (10, 8) beside the west shore. The map starts revealed.
 */
import { loadCatalog } from '@pr/content';
import { GameDriver } from './driver';
import { compileCustomMap, createGeneratedMatch, customRowOffset, newCustomMap, type CustomMapDocument, type CustomSite } from '@pr/campaign';
import { TERRAIN_CODES, type CreatureStackState, type CustomShip, type HexCoord, type MatchState } from '@pr/rules';

export const catalog = loadCatalog();

export const SEA_FROM = 10;
export const SEA_TO = 19;

/** Axial cell of rectangle column x, row y. */
export const cellOf = (doc: Pick<CustomMapDocument, 'height'>, x: number, y: number): HexCoord => ({ q: x - Math.floor(y / 2) + customRowOffset(doc.height), r: y });

export function paint(doc: CustomMapDocument, cells: readonly HexCoord[], code: string): CustomMapDocument {
  const t = doc.terrain.split('');
  for (const c of cells) t[c.r * doc.width + c.q] = code;
  return { ...doc, terrain: t.join('') };
}

export interface NavalMapOptions {
  readonly ships?: (doc: CustomMapDocument) => CustomShip[];
  readonly sites?: (doc: CustomMapDocument) => CustomSite[];
  /** Extra terrain edits after the sea is painted. */
  readonly terrain?: (doc: CustomMapDocument) => CustomMapDocument;
  readonly revealMap?: boolean;
  readonly controllers?: readonly ('human' | 'ai')[];
}

export function navalDoc(opts: NavalMapOptions = {}): CustomMapDocument {
  let doc = newCustomMap(catalog, 'small', 'Two Isles');
  const sea: HexCoord[] = [];
  for (let y = 0; y < 24; y++) for (let x = SEA_FROM; x <= SEA_TO; x++) sea.push(cellOf(doc, x, y));
  doc = paint(doc, sea, TERRAIN_CODES.water);
  if (opts.terrain) doc = opts.terrain(doc);
  const at = (id: string, kind: CustomSite['kind'], x: number, y: number, extra: Partial<CustomSite> = {}): CustomSite => ({ id, kind, ...cellOf(doc, x, y), ...extra });
  return {
    ...doc,
    players: [{ pantheonId: 'greek' }, { pantheonId: 'greek' }],
    sites: [at('town_a', 'town', 9, 12, { owner: 0 }), at('town_b', 'town', 20, 12, { owner: 1 }), ...(opts.sites?.(doc) ?? [])],
    ships: opts.ships ? opts.ships(doc) : [{ id: 'free', ...cellOf(doc, 10, 8) }],
    ...(opts.revealMap === false ? {} : { revealMap: true }),
  };
}

export function navalMatch(opts: NavalMapOptions = {}): MatchState {
  const doc = navalDoc(opts);
  const controllers = opts.controllers ?? ['human', 'ai'];
  const compiled = compileCustomMap(catalog, doc, controllers.map((controller) => ({ controller })));
  return createGeneratedMatch(catalog, compiled, { matchId: 'naval-test' }).match;
}

export function navalDriver(opts: NavalMapOptions = {}): GameDriver {
  return new GameDriver(navalMatch(opts), catalog);
}

/** Seven army slots from [creatureId, count] pairs. */
export function slots(army: readonly [string, number][]): (CreatureStackState | null)[] {
  const out: (CreatureStackState | null)[] = [null, null, null, null, null, null, null];
  army.forEach(([creatureId, count], i) => (out[i] = { stackId: `t${i}`, creatureId, count }));
  return out;
}

/** The fixture's map cell of rectangle column x, row y for a state. */
export const cellIn = (s: MatchState, x: number, y: number): HexCoord => cellOf(s.world.map, x, y);
