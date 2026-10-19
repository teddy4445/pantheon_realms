/**
 * Hero ships and boarding battles (expedition kit, scenario feature `navalMovementV1`;
 * docs/expedition-v1/, design/naval-policy.json and design/boarding-layout.json).
 *
 * Owns: the naval numbers (proposed, not playtested; the rules profile carries them as
 * data) and the boarding battlefield layout `boarding_two_ships_v1` — a 15 x 11 odd-r
 * board of which only 102 cells are legal: the attacker's deck (columns 0-3), the
 * defender's deck (columns 11-14) and one narrow bridge (columns 4-10 on rows 4-5).
 * Every other cell is water: forbidden occupancy, not an obstacle (flyers cross it but
 * never land on it). The layout is plain data; a battle copies its cell string into
 * `BattleState.board`, so a saved battle never depends on a later edit of this file.
 *
 * Does not own: rules (resolvers/naval.ts, systems/naval.ts) or the picture
 * (presentation: `projection` is the measured drawing of the delivered painting and is
 * never read by the rules).
 */
import type { ResourceCost } from '../core/resources';
import type { BoardOccupancyPolicy, NormalizedBoardCell, SeaEncounterBoardRules } from './seaEncounter';
import { SINGLE_SHIP_SEA_ENCOUNTER_V2 } from './seaEncounter';

/** Naval numbers of a rules profile (proposed starting balance; verify by playtesting). */
export interface NavalRules {
  /** LaunchShip at an owned coastal town: a service, not a building (design/naval-policy.json `shipCost`). */
  readonly shipCost: ResourceCost;
  /** Movement points per water-to-water edge for an embarked hero (no road bonus). */
  readonly sailCost: number;
  /** Embarking or disembarking needs at least this many movement points and uses all that remain. */
  readonly transitionMinimumMovement: number;
  /** The battlefield layout of ship-to-ship boarding battles. */
  readonly boardingLayoutId: string;
  /** The battlefield of a ship against sea creatures (`seaEncountersV1`; absent in older profiles: `single_ship_sea_encounter_v2`). */
  readonly seaEncounterLayoutId?: string;
}

/** The proposed naval numbers (design/naval-policy.json): 1500 Gold + 10 Wood a ship, 100 per sea hex, 100 to embark or land. */
export const PROPOSED_NAVAL_RULES: NavalRules = {
  shipCost: { gold: 1500, wood: 10 },
  sailCost: 100,
  transitionMinimumMovement: 100,
  boardingLayoutId: 'boarding_two_ships_v1',
  seaEncounterLayoutId: 'single_ship_sea_encounter_v2',
};

/** The profile's naval numbers (older profiles without them: the proposed ones). */
export function navalRules(profile: { readonly naval?: NavalRules }): NavalRules {
  return profile.naval ?? PROPOSED_NAVAL_RULES;
}

/**
 * Zone of a board cell: attacker deck, defender deck, bridge, water, or the one ship deck of a sea
 * encounter. Which movement class may stand in a zone is the layout's occupancy policy; a board
 * without one (boarding) keeps the original mask: every zone but water, for every creature.
 */
export type BoardZone = 'attacker_deck' | 'defender_deck' | 'bridge' | 'water' | 'deck';

/** One letter per zone in a board's cell string (row-major, index = row * cols + col). */
export const BOARD_ZONE_CODES: Readonly<Record<BoardZone, string>> = {
  attacker_deck: 'a',
  defender_deck: 'd',
  bridge: 'b',
  water: '.',
  deck: 'k',
};

export const BOARD_ZONE_BY_CODE: Readonly<Record<string, BoardZone>> = {
  a: 'attacker_deck',
  d: 'defender_deck',
  b: 'bridge',
  '.': 'water',
  k: 'deck',
};

/** A battlefield whose legal cells are a fixed mask (boarding). */
export interface BattlefieldLayoutDefinition {
  readonly id: string;
  readonly cols: number;
  readonly rows: number;
  readonly coordinates: 'odd-r';
  /** One string per row, one zone letter per column (BOARD_ZONE_CODES). */
  readonly rowsText: readonly string[];
  /** Deployment columns from each side's edge (with or without Tactics, never beyond the deck). */
  readonly deploymentWidth: number;
  /** Presentation only (never read by the rules): the delivered painting and its measured cell projection. */
  readonly art: { readonly assetId: string; readonly width: number; readonly height: number };
  readonly projection: {
    readonly x0: number;
    readonly dx: number;
    readonly oddRowOffset: number;
    readonly y0: number;
    readonly dy: number;
    readonly hexWidth: number;
    readonly hexHeight: number;
  };
  /** Presentation only: the delivered per-cell projection (a piecewise board, e.g. the sea encounter); authoritative over `projection` when present. */
  readonly cellTable?: readonly NormalizedBoardCell[];
  /** Zone occupancy policy (absent: the boarding mask — every zone but water, for every movement class). */
  readonly occupancy?: BoardOccupancyPolicy;
  /** Single-ship sea encounter rules (deployment anchors, swimmer range floor, Deck Harpoon); absent elsewhere. */
  readonly sea?: SeaEncounterBoardRules;
}

const DECKS = 'aaaa.......dddd';
const BRIDGE = 'aaaabbbbbbbdddd';

/**
 * Boarding battle between two ships joined by one wooden bridge (design/boarding-layout.json,
 * 102 legal cells: 44 + 44 deck cells and the 14 bridge cells). No random obstacles, rails or
 * masts on the decks; the bridge is indestructible in this version.
 */
export const BOARDING_TWO_SHIPS_V1: BattlefieldLayoutDefinition = {
  id: 'boarding_two_ships_v1',
  cols: 15,
  rows: 11,
  coordinates: 'odd-r',
  rowsText: [DECKS, DECKS, DECKS, DECKS, BRIDGE, BRIDGE, DECKS, DECKS, DECKS, DECKS, DECKS],
  deploymentWidth: 3,
  art: { assetId: 'expedition.boarding-battle', width: 1672, height: 941 },
  projection: { x0: 0.17, dx: 0.045, oddRowOffset: 0.0225, y0: 0.22, dy: 0.048, hexWidth: 0.043, hexHeight: 0.045 },
};

/** Battlefield layouts by ID. */
export const BATTLEFIELD_LAYOUTS: Readonly<Record<string, BattlefieldLayoutDefinition>> = {
  [BOARDING_TWO_SHIPS_V1.id]: BOARDING_TWO_SHIPS_V1,
  [SINGLE_SHIP_SEA_ENCOUNTER_V2.id]: SINGLE_SHIP_SEA_ENCOUNTER_V2,
};

/** The layout's cell string (row-major zone letters), as a battle stores it. */
export function layoutCells(layout: BattlefieldLayoutDefinition): string {
  return layout.rowsText.join('');
}

/** The cells of a layout in one zone (row by row, column by column). */
export function layoutZoneCells(layout: BattlefieldLayoutDefinition, zone: BoardZone): { col: number; row: number }[] {
  const out: { col: number; row: number }[] = [];
  const code = BOARD_ZONE_CODES[zone];
  layout.rowsText.forEach((line, row) => {
    for (let col = 0; col < line.length; col++) if (line[col] === code) out.push({ col, row });
  });
  return out;
}
