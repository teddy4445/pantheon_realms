/**
 * How a battle is shown (presentation only; owner request 2026-10-14): the human player's army
 * stands on the left of the battlefield and is drawn in blue, also when a computer hero attacks
 * the player. Then the board is shown mirrored — the rules keep their sides, cells and facings.
 * With two human sides (hot seat) or none, the attacker stays on the left in blue.
 */
import type { BattleState } from '@pr/rules';

export type BattleSideId = 'attacker' | 'defender';

export interface BattleOrientation {
  /** The board is drawn mirrored: the defender on the left. */
  readonly mirrored: boolean;
  /** The side drawn in blue (markers, badges, turn order). */
  readonly blueSide: BattleSideId;
  /** The side shown on the left of the header. */
  readonly leftSide: BattleSideId;
  readonly rightSide: BattleSideId;
}

export function battleOrientation(battle: Pick<BattleState, 'sides'> & { readonly board?: BattleState['board'] }): BattleOrientation {
  const humanAttacker = battle.sides.attacker.controller === 'human';
  const humanDefender = battle.sides.defender.controller === 'human';
  // A sea encounter's painting has the ship on the left (deck columns 0–7): never mirrored; the ship's
  // side stands on the left whether it attacked or was attacked, and the human's side is blue.
  const shipSide = battle.board?.shipSide;
  if (shipSide) {
    const other: BattleSideId = shipSide === 'attacker' ? 'defender' : 'attacker';
    const blueSide: BattleSideId = humanAttacker !== humanDefender ? (humanAttacker ? 'attacker' : 'defender') : shipSide;
    return { mirrored: false, blueSide, leftSide: shipSide, rightSide: other };
  }
  const mirrored = humanDefender && !humanAttacker;
  return mirrored
    ? { mirrored, blueSide: 'defender', leftSide: 'defender', rightSide: 'attacker' }
    : { mirrored, blueSide: 'attacker', leftSide: 'attacker', rightSide: 'defender' };
}

/** The colour tone of a side: blue for `blueSide`, red for the other. */
export function sideTone(o: BattleOrientation, side: BattleSideId): 'blue' | 'red' {
  return side === o.blueSide ? 'blue' : 'red';
}
