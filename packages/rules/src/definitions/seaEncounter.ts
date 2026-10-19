/**
 * The single-ship sea encounter (sea-creature delivery 2026-10-17, design/battlefield-layout.json;
 * scenario feature `seaEncountersV1`): one hero's ship against compatible sea creatures, on a
 * 16 x 11 odd-r board — the ship's deck in columns 0-7 (88 cells) and open water in columns 8-15
 * (88 cells). No second ship, gangplank, land, catapult or hull HP: the ship is terrain.
 *
 * Owns the layout data and its zone occupancy policy (which movement class may stand in which zone),
 * the deployment anchors of both sides, the range floor of the swimmers' innate shots on this board
 * and the Deck Harpoon numbers — all proposed values, not playtested. A battle copies them into
 * `BattleState.board` when it begins, so a saved battle never depends on a later edit of this file.
 * The rules read them through systems/battle/board.ts (the one occupancy validator).
 *
 * Does not own: the rules themselves (systems/battle/board.ts, seaBoard.ts, systems/seaEncounter.ts)
 * or the picture (`art`, `cells` are presentation data the rules never read: the delivered painting
 * and its per-cell projection, drawn through presentation/hexmath.ts).
 */
import type { BattlefieldLayoutDefinition, BoardZone } from './naval';

/** How a creature occupies the board: walking, swimming (the `swimmer` trait) or flying (`flight`). */
export type MovementClass = 'ground' | 'swim' | 'fly';
export const MOVEMENT_CLASSES: readonly MovementClass[] = ['ground', 'swim', 'fly'];

/**
 * A layout's zone occupancy policy: the zones each movement class may stand in. Every cell of a
 * footprint must be in an allowed zone and, with `singleZoneFootprint`, all in ONE zone (a two-hex
 * stack may cross the boundary while moving, never finish straddling it). Occupancy stays shared
 * in 2D: a flyer and a swimmer never hold the same cell at different heights.
 */
export interface BoardOccupancyPolicy {
  readonly ground: readonly BoardZone[];
  readonly swim: readonly BoardZone[];
  readonly fly: readonly BoardZone[];
  readonly singleZoneFootprint: boolean;
}

/** One deployment anchor (a two-hex stack extends behind its facing: column 0 on the ship, 15 at sea). */
export interface DeploymentAnchor {
  readonly col: number;
  readonly row: number;
}

/** Deck Harpoon (proposed balance safeguard, handoff §5): a weak contextual throw from the deck at an enemy in the water. */
export interface DeckHarpoonRules {
  readonly name: string;
  /** The thrower's whole footprint stands in this zone. */
  readonly fromZone: BoardZone;
  /** The target's whole footprint is in this zone (a hovering flyer included). */
  readonly targetZone: BoardZone;
  /** Range in hexes (nearest occupied cells), never changed by climate. */
  readonly range: number;
  /** Share of the stack's quantity that throws (35: 35 % of the normal base damage roll). */
  readonly percent: number;
}

/** The sea encounter's own rules of a layout (copied into the battle's board). */
export interface SeaEncounterBoardRules {
  /** The ship's deck zone and the water zone. */
  readonly shipZone: BoardZone;
  readonly seaZone: BoardZone;
  /** Seven anchors per side, in placement order (top to bottom). */
  readonly shipAnchors: readonly DeploymentAnchor[];
  readonly seaAnchors: readonly DeploymentAnchor[];
  /** Movement classes allowed in each side's army (sea side: swimmers and flyers only). */
  readonly shipClasses: readonly MovementClass[];
  readonly seaClasses: readonly MovementClass[];
  /** A swimmer's shots on this board reach at least this far, after climate and status changes. */
  readonly swimmerShotRangeFloor: number;
  readonly harpoon: DeckHarpoonRules;
}

/** One cell of the delivered per-cell projection (fractions of the painting): centre, width and height. Presentation only. */
export type NormalizedBoardCell = readonly [col: number, row: number, x: number, y: number, width: number, height: number];

const ROW = 'kkkkkkkk........';

/** Which stacks of an army go to which anchors, by army size (centred, then spread; seven fill every anchor). */
export const SEA_ANCHOR_SPREAD: Readonly<Record<number, readonly number[]>> = {
  1: [3],
  2: [2, 4],
  3: [1, 3, 5],
  4: [0, 2, 4, 6],
  5: [0, 1, 3, 5, 6],
  6: [0, 1, 2, 4, 5, 6],
  7: [0, 1, 2, 3, 4, 5, 6],
};

/** design/battlefield-layout.json `cells`: [col, row, x, y, width, height], row by row (176 cells). */
export const SINGLE_SHIP_SEA_CELLS: readonly NormalizedBoardCell[] = [
  [0, 0, 0.045, 0.15, 0.047, 0.06],
  [1, 0, 0.098, 0.15, 0.047, 0.06],
  [2, 0, 0.151, 0.15, 0.047, 0.06],
  [3, 0, 0.204, 0.15, 0.047, 0.06],
  [4, 0, 0.257, 0.15, 0.047, 0.06],
  [5, 0, 0.31, 0.15, 0.047, 0.06],
  [6, 0, 0.363, 0.15, 0.047, 0.06],
  [7, 0, 0.416, 0.15, 0.047, 0.06],
  [8, 0, 0.57, 0.15, 0.047, 0.06],
  [9, 0, 0.622, 0.15, 0.047, 0.06],
  [10, 0, 0.674, 0.15, 0.047, 0.06],
  [11, 0, 0.726, 0.15, 0.047, 0.06],
  [12, 0, 0.778, 0.15, 0.047, 0.06],
  [13, 0, 0.83, 0.15, 0.047, 0.06],
  [14, 0, 0.882, 0.15, 0.047, 0.06],
  [15, 0, 0.934, 0.15, 0.047, 0.06],
  [0, 1, 0.0715, 0.215, 0.047, 0.06],
  [1, 1, 0.1245, 0.215, 0.047, 0.06],
  [2, 1, 0.1775, 0.215, 0.047, 0.06],
  [3, 1, 0.2305, 0.215, 0.047, 0.06],
  [4, 1, 0.2835, 0.215, 0.047, 0.06],
  [5, 1, 0.3365, 0.215, 0.047, 0.06],
  [6, 1, 0.3895, 0.215, 0.047, 0.06],
  [7, 1, 0.4425, 0.215, 0.047, 0.06],
  [8, 1, 0.596, 0.215, 0.047, 0.06],
  [9, 1, 0.648, 0.215, 0.047, 0.06],
  [10, 1, 0.7, 0.215, 0.047, 0.06],
  [11, 1, 0.752, 0.215, 0.047, 0.06],
  [12, 1, 0.804, 0.215, 0.047, 0.06],
  [13, 1, 0.856, 0.215, 0.047, 0.06],
  [14, 1, 0.908, 0.215, 0.047, 0.06],
  [15, 1, 0.96, 0.215, 0.047, 0.06],
  [0, 2, 0.045, 0.28, 0.047, 0.06],
  [1, 2, 0.098, 0.28, 0.047, 0.06],
  [2, 2, 0.151, 0.28, 0.047, 0.06],
  [3, 2, 0.204, 0.28, 0.047, 0.06],
  [4, 2, 0.257, 0.28, 0.047, 0.06],
  [5, 2, 0.31, 0.28, 0.047, 0.06],
  [6, 2, 0.363, 0.28, 0.047, 0.06],
  [7, 2, 0.416, 0.28, 0.047, 0.06],
  [8, 2, 0.57, 0.28, 0.047, 0.06],
  [9, 2, 0.622, 0.28, 0.047, 0.06],
  [10, 2, 0.674, 0.28, 0.047, 0.06],
  [11, 2, 0.726, 0.28, 0.047, 0.06],
  [12, 2, 0.778, 0.28, 0.047, 0.06],
  [13, 2, 0.83, 0.28, 0.047, 0.06],
  [14, 2, 0.882, 0.28, 0.047, 0.06],
  [15, 2, 0.934, 0.28, 0.047, 0.06],
  [0, 3, 0.0715, 0.345, 0.047, 0.06],
  [1, 3, 0.1245, 0.345, 0.047, 0.06],
  [2, 3, 0.1775, 0.345, 0.047, 0.06],
  [3, 3, 0.2305, 0.345, 0.047, 0.06],
  [4, 3, 0.2835, 0.345, 0.047, 0.06],
  [5, 3, 0.3365, 0.345, 0.047, 0.06],
  [6, 3, 0.3895, 0.345, 0.047, 0.06],
  [7, 3, 0.4425, 0.345, 0.047, 0.06],
  [8, 3, 0.596, 0.345, 0.047, 0.06],
  [9, 3, 0.648, 0.345, 0.047, 0.06],
  [10, 3, 0.7, 0.345, 0.047, 0.06],
  [11, 3, 0.752, 0.345, 0.047, 0.06],
  [12, 3, 0.804, 0.345, 0.047, 0.06],
  [13, 3, 0.856, 0.345, 0.047, 0.06],
  [14, 3, 0.908, 0.345, 0.047, 0.06],
  [15, 3, 0.96, 0.345, 0.047, 0.06],
  [0, 4, 0.045, 0.41, 0.047, 0.06],
  [1, 4, 0.098, 0.41, 0.047, 0.06],
  [2, 4, 0.151, 0.41, 0.047, 0.06],
  [3, 4, 0.204, 0.41, 0.047, 0.06],
  [4, 4, 0.257, 0.41, 0.047, 0.06],
  [5, 4, 0.31, 0.41, 0.047, 0.06],
  [6, 4, 0.363, 0.41, 0.047, 0.06],
  [7, 4, 0.416, 0.41, 0.047, 0.06],
  [8, 4, 0.57, 0.41, 0.047, 0.06],
  [9, 4, 0.622, 0.41, 0.047, 0.06],
  [10, 4, 0.674, 0.41, 0.047, 0.06],
  [11, 4, 0.726, 0.41, 0.047, 0.06],
  [12, 4, 0.778, 0.41, 0.047, 0.06],
  [13, 4, 0.83, 0.41, 0.047, 0.06],
  [14, 4, 0.882, 0.41, 0.047, 0.06],
  [15, 4, 0.934, 0.41, 0.047, 0.06],
  [0, 5, 0.0715, 0.475, 0.047, 0.06],
  [1, 5, 0.1245, 0.475, 0.047, 0.06],
  [2, 5, 0.1775, 0.475, 0.047, 0.06],
  [3, 5, 0.2305, 0.475, 0.047, 0.06],
  [4, 5, 0.2835, 0.475, 0.047, 0.06],
  [5, 5, 0.3365, 0.475, 0.047, 0.06],
  [6, 5, 0.3895, 0.475, 0.047, 0.06],
  [7, 5, 0.4425, 0.475, 0.047, 0.06],
  [8, 5, 0.596, 0.475, 0.047, 0.06],
  [9, 5, 0.648, 0.475, 0.047, 0.06],
  [10, 5, 0.7, 0.475, 0.047, 0.06],
  [11, 5, 0.752, 0.475, 0.047, 0.06],
  [12, 5, 0.804, 0.475, 0.047, 0.06],
  [13, 5, 0.856, 0.475, 0.047, 0.06],
  [14, 5, 0.908, 0.475, 0.047, 0.06],
  [15, 5, 0.96, 0.475, 0.047, 0.06],
  [0, 6, 0.045, 0.54, 0.047, 0.06],
  [1, 6, 0.098, 0.54, 0.047, 0.06],
  [2, 6, 0.151, 0.54, 0.047, 0.06],
  [3, 6, 0.204, 0.54, 0.047, 0.06],
  [4, 6, 0.257, 0.54, 0.047, 0.06],
  [5, 6, 0.31, 0.54, 0.047, 0.06],
  [6, 6, 0.363, 0.54, 0.047, 0.06],
  [7, 6, 0.416, 0.54, 0.047, 0.06],
  [8, 6, 0.57, 0.54, 0.047, 0.06],
  [9, 6, 0.622, 0.54, 0.047, 0.06],
  [10, 6, 0.674, 0.54, 0.047, 0.06],
  [11, 6, 0.726, 0.54, 0.047, 0.06],
  [12, 6, 0.778, 0.54, 0.047, 0.06],
  [13, 6, 0.83, 0.54, 0.047, 0.06],
  [14, 6, 0.882, 0.54, 0.047, 0.06],
  [15, 6, 0.934, 0.54, 0.047, 0.06],
  [0, 7, 0.0715, 0.605, 0.047, 0.06],
  [1, 7, 0.1245, 0.605, 0.047, 0.06],
  [2, 7, 0.1775, 0.605, 0.047, 0.06],
  [3, 7, 0.2305, 0.605, 0.047, 0.06],
  [4, 7, 0.2835, 0.605, 0.047, 0.06],
  [5, 7, 0.3365, 0.605, 0.047, 0.06],
  [6, 7, 0.3895, 0.605, 0.047, 0.06],
  [7, 7, 0.4425, 0.605, 0.047, 0.06],
  [8, 7, 0.596, 0.605, 0.047, 0.06],
  [9, 7, 0.648, 0.605, 0.047, 0.06],
  [10, 7, 0.7, 0.605, 0.047, 0.06],
  [11, 7, 0.752, 0.605, 0.047, 0.06],
  [12, 7, 0.804, 0.605, 0.047, 0.06],
  [13, 7, 0.856, 0.605, 0.047, 0.06],
  [14, 7, 0.908, 0.605, 0.047, 0.06],
  [15, 7, 0.96, 0.605, 0.047, 0.06],
  [0, 8, 0.045, 0.67, 0.047, 0.06],
  [1, 8, 0.098, 0.67, 0.047, 0.06],
  [2, 8, 0.151, 0.67, 0.047, 0.06],
  [3, 8, 0.204, 0.67, 0.047, 0.06],
  [4, 8, 0.257, 0.67, 0.047, 0.06],
  [5, 8, 0.31, 0.67, 0.047, 0.06],
  [6, 8, 0.363, 0.67, 0.047, 0.06],
  [7, 8, 0.416, 0.67, 0.047, 0.06],
  [8, 8, 0.57, 0.67, 0.047, 0.06],
  [9, 8, 0.622, 0.67, 0.047, 0.06],
  [10, 8, 0.674, 0.67, 0.047, 0.06],
  [11, 8, 0.726, 0.67, 0.047, 0.06],
  [12, 8, 0.778, 0.67, 0.047, 0.06],
  [13, 8, 0.83, 0.67, 0.047, 0.06],
  [14, 8, 0.882, 0.67, 0.047, 0.06],
  [15, 8, 0.934, 0.67, 0.047, 0.06],
  [0, 9, 0.0715, 0.735, 0.047, 0.06],
  [1, 9, 0.1245, 0.735, 0.047, 0.06],
  [2, 9, 0.1775, 0.735, 0.047, 0.06],
  [3, 9, 0.2305, 0.735, 0.047, 0.06],
  [4, 9, 0.2835, 0.735, 0.047, 0.06],
  [5, 9, 0.3365, 0.735, 0.047, 0.06],
  [6, 9, 0.3895, 0.735, 0.047, 0.06],
  [7, 9, 0.4425, 0.735, 0.047, 0.06],
  [8, 9, 0.596, 0.735, 0.047, 0.06],
  [9, 9, 0.648, 0.735, 0.047, 0.06],
  [10, 9, 0.7, 0.735, 0.047, 0.06],
  [11, 9, 0.752, 0.735, 0.047, 0.06],
  [12, 9, 0.804, 0.735, 0.047, 0.06],
  [13, 9, 0.856, 0.735, 0.047, 0.06],
  [14, 9, 0.908, 0.735, 0.047, 0.06],
  [15, 9, 0.96, 0.735, 0.047, 0.06],
  [0, 10, 0.045, 0.8, 0.047, 0.06],
  [1, 10, 0.098, 0.8, 0.047, 0.06],
  [2, 10, 0.151, 0.8, 0.047, 0.06],
  [3, 10, 0.204, 0.8, 0.047, 0.06],
  [4, 10, 0.257, 0.8, 0.047, 0.06],
  [5, 10, 0.31, 0.8, 0.047, 0.06],
  [6, 10, 0.363, 0.8, 0.047, 0.06],
  [7, 10, 0.416, 0.8, 0.047, 0.06],
  [8, 10, 0.57, 0.8, 0.047, 0.06],
  [9, 10, 0.622, 0.8, 0.047, 0.06],
  [10, 10, 0.674, 0.8, 0.047, 0.06],
  [11, 10, 0.726, 0.8, 0.047, 0.06],
  [12, 10, 0.778, 0.8, 0.047, 0.06],
  [13, 10, 0.83, 0.8, 0.047, 0.06],
  [14, 10, 0.882, 0.8, 0.047, 0.06],
  [15, 10, 0.934, 0.8, 0.047, 0.06],
];

/**
 * `single_ship_sea_encounter_v2`: deck columns 0-7 ('k'), water columns 8-15 ('.'). Ground troops
 * stand on the deck, swimmers in the water, flyers on either (hovering over water); every footprint in
 * one zone. Deployment: the ship side on (1,1)…(1,7) facing the sea, the sea side on (14,1)…(14,7).
 */
export const SINGLE_SHIP_SEA_ENCOUNTER_V2: BattlefieldLayoutDefinition = {
  id: 'single_ship_sea_encounter_v2',
  cols: 16,
  rows: 11,
  coordinates: 'odd-r',
  rowsText: Array.from({ length: 11 }, () => ROW),
  deploymentWidth: 3,
  art: { assetId: 'seacreatures.battlefield.single-ship', width: 1672, height: 941 },
  // An affine stand-in for older readers of `projection` (the deck half); the piecewise `cells` table is authoritative.
  projection: { x0: 0.045, dx: 0.053, oddRowOffset: 0.0265, y0: 0.15, dy: 0.065, hexWidth: 0.047, hexHeight: 0.06 },
  cellTable: SINGLE_SHIP_SEA_CELLS,
  occupancy: { ground: ['deck'], swim: ['water'], fly: ['deck', 'water'], singleZoneFootprint: true },
  sea: {
    shipZone: 'deck',
    seaZone: 'water',
    shipAnchors: [1, 2, 3, 4, 5, 6, 7].map((row) => ({ col: 1, row })),
    seaAnchors: [1, 2, 3, 4, 5, 6, 7].map((row) => ({ col: 14, row })),
    shipClasses: ['ground', 'fly'],
    seaClasses: ['swim', 'fly'],
    swimmerShotRangeFloor: 8,
    harpoon: { name: 'Deck Harpoon', fromZone: 'deck', targetZone: 'water', range: 24, percent: 35 },
  },
};
