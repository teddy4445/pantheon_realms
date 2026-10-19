/**
 * Manual battles in campaigns (campaign expansion handoff, 2026-10-15): every battle
 * a human campaign side takes part in is fought on the battlefield, order by order.
 * No automation may choose a human campaign side's actions — not auto-combat, not
 * a quick battle, not an instant finish. AI sides keep acting automatically, and
 * skirmishes and random maps keep their own policy.
 *
 * Commands that automation issues carry `automated: true` (the tactical AI marks
 * its own commands); `processCommand` refuses such a command for a human side of
 * a campaign battle before touching the state, so the state and its RNG streams
 * stay exactly as they were.
 */
import type { BattleSideId, MatchState } from '../../state/match';

/** Battles involving a human side must be fought by hand in this match (every campaign mission). */
export function manualBattlesRequired(state: MatchState): boolean {
  return !!state.scenario.campaignId;
}

/** The battle side that must act now: the defender choosing stacks, a side deploying, or the active stack's side. */
export function battleSideToAct(state: MatchState): BattleSideId | null {
  const battle = state.battle;
  if (!battle || battle.status !== 'active') return null;
  if (battle.shadowChoice) return battle.stacks[battle.shadowChoice.stackId]?.side ?? null;
  if (battle.phase === 'selection') return 'defender';
  if (battle.phase === 'deployment') return battle.deployment?.pending[0] ?? null;
  // The siege engine's phase (targetableCatapultV1): its side fires or skips — by hand in a campaign.
  if (battle.phase === 'engine') return battle.siege?.engine?.side ?? null;
  if (!battle.activeStackId) return null;
  return battle.stacks[battle.activeStackId]?.side ?? null;
}

/** Automation may not act for this battle's acting side (a human side of a campaign battle). */
export function automationForbidden(state: MatchState): boolean {
  if (!state.battle || !manualBattlesRequired(state)) return false;
  const side = battleSideToAct(state);
  return !!side && state.battle.sides[side].controller === 'human';
}

/** A battle about to start between `sides` would have to be fought by hand (quick resolution refused). */
export const MANUAL_BATTLE_MESSAGE = 'Campaign battles are fought on the battlefield: give your orders yourself';
