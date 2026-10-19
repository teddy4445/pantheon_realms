/**
 * Sea encounters in the battle screen (sea-creature delivery 2026-10-17): the Deck Harpoon button,
 * its tooltip and its preview, the visible round limit and the retreat wording. Every legality and
 * number comes from the rules' quotes (`legalActions(...).harpoon`, `previewHarpoon`, `seaRules`,
 * `rulesProfile.combat.roundLimit`); the screen never decides one and only sends the validated
 * `BattleHarpoon` command. Building these models changes nothing and draws no random number.
 */
import {
  previewHarpoon,
  seaRules,
  type BattleLegalActions,
  type BattleState,
  type ContentCatalog,
  type DamagePreview,
  type MatchState,
} from '@pr/rules';

export interface HarpoonButtonView {
  /** The action's name as the rules call it ("Deck Harpoon"). */
  readonly name: string;
  readonly available: boolean;
  /** Why it cannot be thrown now (the rules' reason), null when it can. */
  readonly reason: string | null;
  /** The button's tooltip: what the harpoon does, from the board's own numbers. */
  readonly tooltip: string;
  readonly targets: readonly string[];
}

/** The Deck Harpoon button for the acting stack (null when the harpoon does not apply to it). */
export function harpoonButton(battle: Pick<BattleState, 'board'>, la: BattleLegalActions | null): HarpoonButtonView | null {
  const rules = seaRules(battle);
  if (!la || !rules || !la.harpoon) return null;
  const h = rules.harpoon;
  const tooltip =
    `${h.name}: from the deck, strike one enemy in the water up to ${h.range} hexes away (climate does not shorten it). ` +
    `Deals ${h.percent}% of this stack's normal damage roll through the usual Attack, Defense and reductions (at least 1). ` +
    `Spends the whole activation; no retaliation; unlimited throws. Not while an enemy on the deck is beside the stack.`;
  return { name: h.name, available: la.harpoon.targets.length > 0, reason: la.harpoon.reason, tooltip, targets: la.harpoon.targets };
}

/** The harpoon's preview against one target: exactly the range the commit rolls in (rules `previewHarpoon`). */
export function harpoonPreview(catalog: ContentCatalog, state: Pick<MatchState, 'battle'>, stackId: string, targetId: string): DamagePreview | null {
  return previewHarpoon(catalog, state, stackId, targetId);
}

/** The round counter of a sea encounter: the round limit is shown, with what reaching it means. */
export function seaRoundLimit(catalog: ContentCatalog, battle: Pick<BattleState, 'board' | 'round'>): { readonly text: string; readonly title: string } | null {
  if (!seaRules(battle)) return null;
  const limit = catalog.rulesProfile.combat.roundLimit;
  return { text: `of ${limit}`, title: `Round limit ${limit}: if both sides still stand after round ${limit}, the defender holds and the battle ends.` };
}

/** The retreat confirmation for a ship-side commander in a sea encounter (null otherwise). */
export function seaRetreatText(battle: Pick<BattleState, 'board' | 'encounter'>, side: 'attacker' | 'defender'): string | null {
  if (!battle.encounter.sourceShipId || battle.board?.shipSide !== side) return null;
  return 'Your hero’s ship pulls away to open water with no army. The surviving troops are lost; the sea creatures stay where they are.';
}

/** What stands where on a sea board (the battle header's legend; null on any other board). */
export function seaBoardLegend(battle: Pick<BattleState, 'board'>): string | null {
  return seaRules(battle) ? 'Deck: troops on foot and flyers · Water: sea creatures and flyers' : null;
}
