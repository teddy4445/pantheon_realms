/**
 * The battle board's legal-cell mask (expedition kit §08): the one shared rule every placement
 * and movement reads — deployment, ground steps (both cells of a two-hex footprint at every step
 * and at the end), flight landings, forced moves, path previews, the tactical AI and a restored
 * save. A battle without a `board` (land battles, sieges) has every cols x rows cell legal, so
 * their behaviour is unchanged.
 *
 * Water on a masked board is forbidden occupancy, not an obstacle: a flyer may cross it but
 * never land on it, ranged attacks cross it normally, and nothing is ever drowned (an illegal
 * forced move simply fails).
 *
 * Zone occupancy policy (sea-creature delivery 2026-10-17): a board may carry its layout's policy
 * (`BattleBoardState.occupancy`) — which zones each movement class (ground, swim, fly) may stand in,
 * and whether a footprint must end inside one zone. The single-ship sea encounter puts ground troops
 * on the deck, swimmers in the water and flyers on either, never straddling the rail. Without a
 * policy the original mask applies to every creature alike (boarding battles, older saves), and
 * without a board every cell is open (land battles, sieges). `placementProblem` is the one validator
 * every placement goes through: moves, deployment, forced moves, summons, resurrection, teleports,
 * footprint changes, the AI and a restored save. It rejects; it never relocates or drowns.
 */
import { inBattleBounds, type BattleCell } from '../../core/hex';
import { BOARD_ZONE_BY_CODE, layoutCells, type BattlefieldLayoutDefinition, type BoardZone } from '../../definitions/naval';
import type { MovementClass } from '../../definitions/seaEncounter';
import type { BattleBoardState, BattleState } from '../../state/match';

/** The board state a battle copies from its layout (saved with the battle). */
export function boardFromLayout(layout: BattlefieldLayoutDefinition): BattleBoardState {
  return {
    layoutId: layout.id,
    cells: layoutCells(layout),
    deploymentWidth: layout.deploymentWidth,
    ...(layout.occupancy ? { occupancy: layout.occupancy } : {}),
    ...(layout.sea ? { sea: layout.sea } : {}),
  };
}

type BoardOf = Pick<BattleState, 'cols' | 'rows' | 'board'>;

/** The zones `cls` may stand in on this board; null: no mask at all (every in-bounds cell is open). */
export function zonesFor(battle: BoardOf, cls: MovementClass): readonly BoardZone[] | null {
  const board = battle.board;
  if (!board) return null;
  return board.occupancy ? board.occupancy[cls] : LEGACY_ZONES;
}

/** The boarding mask, for boards without a policy: every zone but water, for every movement class. */
const LEGACY_ZONES: readonly BoardZone[] = ['attacker_deck', 'defender_deck', 'bridge', 'deck'];

/** A cell `cls` may stand on: on the board and in one of its zones. */
export function cellLegalFor(battle: BoardOf, c: BattleCell, cls: MovementClass): boolean {
  if (!inBattleBounds(c, battle.cols, battle.rows)) return false;
  const zones = zonesFor(battle, cls);
  if (!zones) return true;
  const z = boardZone(battle, c);
  return z !== 'open' && zones.includes(z);
}

/**
 * Why a footprint may not stand where it is asked to by the board alone (null: it may): a cell off the
 * board, a cell outside the mover's zones (water for walkers, the deck for swimmers), or — with a
 * single-zone policy — a two-hex footprint straddling two zones. Occupancy is checked by the caller.
 */
export function footprintZoneProblem(battle: BoardOf, cells: readonly BattleCell[], cls: MovementClass): string | null {
  if (cells.some((c) => !inBattleBounds(c, battle.cols, battle.rows))) return 'Off the battlefield';
  const zones = zonesFor(battle, cls);
  if (!zones) return null;
  const seen = new Set<string>();
  for (const c of cells) {
    const z = boardZone(battle, c);
    if (z === 'open' || !zones.includes(z)) return zoneRefusal(cls, z);
    seen.add(z);
  }
  if (seen.size > 1 && battle.board?.occupancy?.singleZoneFootprint) return 'A creature must stand wholly on the deck or wholly in the water, never across the rail';
  return null;
}

/** Every cell of the footprint is legal for `cls` (zones and the single-zone rule). */
export function footprintLegalFor(battle: BoardOf, cells: readonly BattleCell[], cls: MovementClass): boolean {
  return footprintZoneProblem(battle, cells, cls) === null;
}

function zoneRefusal(cls: MovementClass, zone: BoardZone | 'open'): string {
  if (cls === 'swim') return 'Sea creatures stay in the water';
  if (zone === 'water') return cls === 'fly' ? 'Flyers cannot stand over this water' : 'Only swimmers and flyers can be in the water';
  return 'That hex cannot be stood on';
}

/** The zone of a cell (off the board: water). Boards without a mask: every cell is 'open'. */
export function boardZone(battle: Pick<BattleState, 'cols' | 'rows' | 'board'>, c: BattleCell): BoardZone | 'open' {
  if (!inBattleBounds(c, battle.cols, battle.rows)) return 'water';
  const board = battle.board;
  if (!board) return 'open';
  return BOARD_ZONE_BY_CODE[board.cells[c.row * battle.cols + c.col] ?? '.'] ?? 'water';
}

/**
 * A cell SOME creature may occupy: on the board and, on a masked board, in a zone of the policy
 * (without a policy: not water). Movement-aware checks use `cellLegalFor` / `footprintZoneProblem`.
 */
export function battleCellLegal(battle: Pick<BattleState, 'cols' | 'rows' | 'board'>, c: BattleCell): boolean {
  if (!inBattleBounds(c, battle.cols, battle.rows)) return false;
  const board = battle.board;
  if (!board) return true;
  const code = board.cells[c.row * battle.cols + c.col];
  if (code === undefined) return false;
  const policy = board.occupancy;
  if (!policy) return code !== '.';
  const z = BOARD_ZONE_BY_CODE[code];
  return !!z && (policy.ground.includes(z) || policy.swim.includes(z) || policy.fly.includes(z));
}

/** Every cell of a footprint is legal (two-hex creatures: both cells). */
export function footprintLegal(battle: Pick<BattleState, 'cols' | 'rows' | 'board'>, cells: readonly BattleCell[]): boolean {
  return cells.every((c) => battleCellLegal(battle, c));
}

/** The legal cells of the battle (row by row; read-only, for previews and tests). */
export function legalBattleCells(battle: Pick<BattleState, 'cols' | 'rows' | 'board'>): BattleCell[] {
  const out: BattleCell[] = [];
  for (let row = 0; row < battle.rows; row++) for (let col = 0; col < battle.cols; col++) if (battleCellLegal(battle, { col, row })) out.push({ col, row });
  return out;
}
