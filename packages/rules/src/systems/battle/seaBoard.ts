/**
 * The single-ship sea encounter on the battle board (sea-creature delivery 2026-10-17; scenario
 * feature `seaEncountersV1`; layout `single_ship_sea_encounter_v2`, definitions/seaEncounter.ts).
 *
 * Owns, for any board that carries sea-encounter rules (`BattleBoardState.sea`):
 *  - which half of the board a side stands on and which way it faces (the ship side is the deck,
 *    west, bound to the encounter's source ship — the ship may be the attacker OR the defender);
 *  - the deployment anchors and the army check (the sea side: swimmers and flyers only; the ship
 *    side: no swimmer);
 *  - the shared placement validator `placementProblem` (zones, single zone, bounds, occupancy) for
 *    every way a stack can come to stand somewhere — moves, deployment, summons, resurrection,
 *    teleports, forced moves (push, pull, fear), a changed footprint, the AI and a restored save —
 *    and the anti-flight guard `flightRemovalProblem` (never a hidden drowning);
 *  - Deck Harpoon: options, preview and commit through ONE damage function (the preview is the
 *    resolution's own min/max).
 *
 * Pure functions and validated commits only; the battle RNG is the only RNG drawn (the harpoon's
 * damage roll), and no new stream is created.
 */
import type { BattleStackId, CreatureId, HeroId, ShipId } from '../../ids';
import { cellDistance, cellKey, footprintCells, footprintDistance, type BattleCell, type Facing } from '../../core/hex';
import type { ContentCatalog } from '../../definitions/catalog';
import type { DeploymentAnchor, MovementClass, SeaEncounterBoardRules } from '../../definitions/seaEncounter';
import { BATTLEFIELD_LAYOUTS, navalRules, type BattlefieldLayoutDefinition, type BoardZone } from '../../definitions/naval';
import { SINGLE_SHIP_SEA_ENCOUNTER_V2 } from '../../definitions/seaEncounter';
import type { BattleBoardState, BattleSideId, BattleStackState, BattleState, MatchState } from '../../state/match';
import { reject, type Tx } from '../../engine/tx';
import { skillValue } from '../../resolvers/heroes';
import { boardFromLayout, boardZone, footprintZoneProblem } from './board';
import {
  aliveCount,
  resolveStackDamage,
  effectiveAttack,
  effectiveDefense,
  isAlive,
  killsFrom,
  movementClassOf,
  occupancy,
  opposing,
  requireBattle,
  sideStacks,
  stackCells,
  statsOf,
} from './common';
import { damageFor, type DamagePreview, type StrikeFactors } from './damage';
import { finishActivation } from './flow';
import { rejectEngineAsStack, requireControl } from './actions';
import { seaArmyProblem } from '../../resolvers/seaEncounter';
import { previewArmyBarrier, previewLastCreatureGuard } from './libraryRelics';

// ---------------------------------------------------------------------------
// Sides, facing and deployment
// ---------------------------------------------------------------------------

/** The sea-encounter rules of this battle's board (null on every other battle). */
export function seaRules(battle: Pick<BattleState, 'board'>): SeaEncounterBoardRules | null {
  return battle.board?.sea ?? null;
}

/** The side standing on the ship's deck in a sea encounter (null on other battles). */
export function shipSideOf(battle: Pick<BattleState, 'board'>): BattleSideId | null {
  return battle.board?.sea && battle.board.shipSide ? battle.board.shipSide : null;
}

/** A side stands on the west half: the ship side of a sea encounter, else the attacker. */
export function sideOnLeft(battle: Pick<BattleState, 'board'>, side: BattleSideId): boolean {
  const ship = shipSideOf(battle);
  return ship ? side === ship : side === 'attacker';
}

/** Which way a side's stacks face (west half faces east, +1). */
export function sideFacing(battle: Pick<BattleState, 'board'>, side: BattleSideId): Facing {
  return sideOnLeft(battle, side) ? 1 : -1;
}

/** The layout's deployment anchors of a side (null: not a sea encounter — the default formation applies). */
export function seaDeploymentAnchors(battle: Pick<BattleState, 'board'>, side: BattleSideId): readonly DeploymentAnchor[] | null {
  const rules = seaRules(battle);
  const ship = shipSideOf(battle);
  if (!rules || !ship) return null;
  return side === ship ? rules.shipAnchors : rules.seaAnchors;
}

/** The movement classes a side's army may hold in a sea encounter (null: no restriction). */
export function sideClasses(battle: Pick<BattleState, 'board'>, side: BattleSideId): readonly MovementClass[] | null {
  const rules = seaRules(battle);
  const ship = shipSideOf(battle);
  if (!rules || !ship) return null;
  return side === ship ? rules.shipClasses : rules.seaClasses;
}

// ---------------------------------------------------------------------------
// The one placement validator
// ---------------------------------------------------------------------------

export interface PlacementRequest {
  readonly creatureId: CreatureId;
  readonly anchor: BattleCell;
  readonly facing: Facing;
  /** The stack being moved (its own cells do not block it). */
  readonly ignoreStackId?: BattleStackId;
  /** Whose side asks (an intact gate opens for the defender, as everywhere). */
  readonly side?: BattleSideId;
}

/**
 * Why a stack may not come to stand at `anchor` (null: it may). The board's zones for the creature's
 * movement class, the single-zone rule, the bounds and shared 2D occupancy (stacks, the fallen,
 * obstacles, structures, the siege engine). Every placement — a move's end, deployment, a summon, a
 * resurrection, a teleport, a forced move, a changed footprint, the AI's plans and a restored save —
 * asks this; an illegal placement is refused, never relocated and never resolved by drowning.
 */
export function placementProblem(catalog: ContentCatalog, battle: BattleState, req: PlacementRequest): string | null {
  const cells = footprintCells(req.anchor, statsOf(catalog, req.creatureId).footprint, req.facing);
  const zone = footprintZoneProblem(battle, cells, movementClassOf(catalog, req.creatureId));
  if (zone) return zone;
  const occ = occupancy(catalog, battle, req.ignoreStackId, req.side);
  if (cells.some((c) => occ.has(cellKey(c)))) return 'That hex is taken';
  return null;
}

/** A forced move of `stack` (push, pull, fear, knockback, teleport) to `to`: the same validator. */
export function forcedMoveProblem(catalog: ContentCatalog, battle: BattleState, stack: BattleStackState, to: BattleCell): string | null {
  return placementProblem(catalog, battle, { creatureId: stack.creatureId, anchor: to, facing: stack.facing, ignoreStackId: stack.id, side: stack.side });
}

/** A changed footprint (the stack turned round in place): the same validator with the new facing. */
export function footprintChangeProblem(catalog: ContentCatalog, battle: BattleState, stack: BattleStackState, facing: Facing): string | null {
  return placementProblem(catalog, battle, { creatureId: stack.creatureId, anchor: stack.anchor, facing, ignoreStackId: stack.id, side: stack.side });
}

/**
 * Why an effect that takes flight away may not apply to `stack` now (null: it may). A flyer hovering
 * where it could not stand without flight (over water on a sea-encounter board) keeps its flight: the
 * effect is refused with this reason, never turned into a drowning. A speed change is not flight removal.
 */
export function flightRemovalProblem(catalog: ContentCatalog, battle: BattleState, stack: BattleStackState): string | null {
  if (movementClassOf(catalog, stack.creatureId) !== 'fly') return null;
  const without: MovementClass = catalog.creatures[stack.creatureId]?.abilityIds.some((id) => catalog.abilities[id]?.rule.type === 'swimmer') ? 'swim' : 'ground';
  const why = footprintZoneProblem(battle, stackCells(catalog, stack), without);
  return why ? `${catalog.creatures[stack.creatureId]?.pluralName ?? 'The flyers'} are over the water: they cannot be grounded there` : null;
}

/**
 * Every placement a saved battle breaks (empty: all hold). Read-only; the session refuses a save that
 * breaks one (a battle is reconstructed from its rules state, never repaired). Checks each living stack's
 * footprint against the board's zones and the others, the sea encounter's side armies and its ship side.
 */
export function battlePlacementIssues(catalog: ContentCatalog, state: Pick<MatchState, 'battle'>): string[] {
  const battle = state.battle;
  if (!battle || battle.status !== 'active') return [];
  const issues: string[] = [];
  const taken = new Map<string, string>();
  for (const s of Object.values(battle.stacks).sort((a, b) => (a.id < b.id ? -1 : 1))) {
    if (!catalog.creatures[s.creatureId]?.stats) {
      issues.push(`Stack ${s.id} is an unknown creature`);
      continue;
    }
    if (!isAlive(s)) continue;
    const cells = stackCells(catalog, s);
    const why = footprintZoneProblem(battle, cells, movementClassOf(catalog, s.creatureId));
    if (why) issues.push(`Stack ${s.id} stands where it may not: ${why}`);
    for (const c of cells) {
      const k = cellKey(c);
      const other = taken.get(k);
      if (other) issues.push(`Stacks ${other} and ${s.id} share a hex`);
      taken.set(k, s.id);
    }
  }
  const rules = seaRules(battle);
  if (battle.board?.sea || battle.board?.shipSide) {
    const ship = battle.board.shipSide;
    if (!rules || (ship !== 'attacker' && ship !== 'defender')) issues.push('The sea battle has no ship side');
    else if (!battle.standalone && !battle.encounter.sourceShipId) issues.push('The sea battle names no ship');
    else {
      for (const side of ['attacker', 'defender'] as const) {
        const why = seaArmyProblem(catalog, rules, side === ship, sideStacks(battle, side, false).map((s) => s.creatureId));
        if (why) issues.push(why);
      }
    }
  }
  return issues;
}

// ---------------------------------------------------------------------------
// Deck Harpoon
// ---------------------------------------------------------------------------

/** Every cell of a footprint lies in one zone. */
function wholly(battle: BattleState, cells: readonly BattleCell[], zone: BoardZone): boolean {
  return cells.every((c) => boardZone(battle, c) === zone);
}

/** The stack stands on the deck with an enemy adjacent that is also on the deck (harpoon off; melee instead). */
export function engagedOnDeck(catalog: ContentCatalog, battle: BattleState, stack: BattleStackState): boolean {
  const rules = seaRules(battle);
  if (!rules) return false;
  const mine = stackCells(catalog, stack);
  return sideStacks(battle, opposing(stack.side)).some((e) => {
    const theirs = stackCells(catalog, e);
    return footprintDistance(mine, theirs) === 1 && theirs.some((c) => boardZone(battle, c) === rules.shipZone);
  });
}

export interface HarpoonOptions {
  /** Enemies in the water the stack may harpoon now. */
  readonly targets: BattleStackId[];
  /** Why it may not harpoon now (null when it may, or when the harpoon does not apply to this stack). */
  readonly reason: string | null;
  /** The harpoon applies to this stack at all (a ship-side stack on a sea-encounter board). */
  readonly applies: boolean;
}

const NO_HARPOON: HarpoonOptions = { targets: [], reason: null, applies: false };

/** Deck Harpoon for `stack` now (read-only; the commit runs the same checks). */
export function harpoonOptions(catalog: ContentCatalog, battle: BattleState, stack: BattleStackState): HarpoonOptions {
  const rules = seaRules(battle);
  if (!rules || stack.summoned || !isAlive(stack) || stack.side !== shipSideOf(battle)) return NO_HARPOON;
  const h = rules.harpoon;
  if (!wholly(battle, stackCells(catalog, stack), h.fromZone)) return { targets: [], reason: `${h.name}: only from the deck`, applies: true };
  if (engagedOnDeck(catalog, battle, stack)) return { targets: [], reason: `${h.name}: engaged by an enemy on deck — fight it instead`, applies: true };
  const mine = stackCells(catalog, stack);
  const targets = sideStacks(battle, opposing(stack.side))
    .filter((e) => {
      const theirs = stackCells(catalog, e);
      return wholly(battle, theirs, h.targetZone) && footprintDistance(mine, theirs) <= h.range;
    })
    .map((e) => e.id);
  return { targets, reason: targets.length === 0 ? `${h.name}: no enemy in the water within ${h.range} hexes` : null, applies: true };
}

/**
 * The harpoon's damage factors: `percent` % of the stack's normal base damage roll, the normal
 * Attack/Defense bracket, Defend, the target's Armorer and its protection from missiles; never charge,
 * shooter penalties (far range, walls, melee), Archery, Offense, creature on-hit riders, splash or luck.
 * A blessing or curse of the thrower still sets its roll. The preview and the commit both use this.
 */
export function harpoonFactors(catalog: ContentCatalog, battle: BattleState, attacker: BattleStackState, target: BattleStackState): StrikeFactors {
  const rules = seaRules(battle);
  const percent = rules?.harpoon.percent ?? 35;
  const combat = catalog.rulesProfile.combat;
  const stats = statsOf(catalog, attacker.creatureId);
  const count = aliveCount(catalog, attacker);
  const atk = effectiveAttack(catalog, battle, attacker);
  let def = effectiveDefense(catalog, battle, target);
  const notes: string[] = [`${rules?.harpoon.name ?? 'Deck Harpoon'}: ${percent}% of the stack's damage, no retaliation`];
  if (target.defending) {
    def = Math.ceil((def * combat.defendMultiplier.numerator) / combat.defendMultiplier.denominator);
    notes.push('Target is defending (+20% Defense)');
  }
  const delta = atk - def;
  const attackBonus = Math.min(combat.attackBonusPerPoint * Math.max(delta, 0), combat.attackBonusCap);
  const defenseReduction = Math.min(combat.defenseReductionPerPoint * Math.max(-delta, 0), combat.defenseReductionCap);
  const multipliers: (readonly [number, number])[] = [[1000 - defenseReduction, 1000], [percent, 100]];
  const tc = battle.sides[target.side].commander;
  const armorer = tc ? skillValue(catalog, tc, 'armorer') : 0;
  if (armorer > 0) {
    multipliers.push([100 - armorer, 100]);
    notes.push(`Target Armorer -${armorer}%`);
  }
  for (const s of target.statuses) {
    if (s.kind === 'ranged_mitigation') {
      multipliers.push([s.numerator, s.denominator]);
      notes.push(`${s.label} (x${s.numerator}/${s.denominator} vs missiles)`);
    }
  }
  const blessed = attacker.statuses.some((s) => s.kind === 'max_damage_roll');
  const cursed = attacker.statuses.some((s) => s.kind === 'min_damage_roll');
  const guaranteedMax = blessed && !cursed;
  const guaranteedMin = cursed && !blessed;
  return {
    attackerCount: count,
    bMin: guaranteedMax ? count * stats.damageMax : count * stats.damageMin,
    bMax: guaranteedMin ? count * stats.damageMin : count * stats.damageMax,
    guaranteedMax,
    bracket: 1000 + attackBonus,
    luckBonus: 0,
    luckChance: null,
    multipliers,
    notes,
    effectiveAttack: atk,
    effectiveDefense: def,
  };
}

/** The harpoon's min/max preview (read-only; exactly the range the commit rolls in). */
export function previewHarpoon(catalog: ContentCatalog, state: Pick<MatchState, 'battle'>, stackId: BattleStackId, targetId: BattleStackId): DamagePreview | null {
  const battle = state.battle;
  const stack = battle?.stacks[stackId];
  const target = battle?.stacks[targetId];
  if (!battle || !stack || !target || !harpoonOptions(catalog, battle, stack).targets.includes(targetId)) return null;
  const f = harpoonFactors(catalog, battle, stack, target);
  const min = previewLastCreatureGuard(battle, target, previewArmyBarrier(battle, target.side, damageFor(f, f.bMin, false)));
  const max = previewLastCreatureGuard(battle, target, previewArmyBarrier(battle, target.side, damageFor(f, f.bMax, false)));
  return { min, max, killsMin: killsFrom(catalog, target, min), killsMax: killsFrom(catalog, target, max), luckMax: null, luckChance: null, notes: f.notes };
}

/**
 * `BattleHarpoon`: the active ship-side stack on the deck throws a harpoon at an enemy in the water.
 * Spends the whole activation (positive morale may follow, as after any action); unlimited throws;
 * no retaliation; the battle RNG rolls the damage between the preview's min and max.
 */
export function commitBattleHarpoon(tx: Tx, stackId: BattleStackId, targetId: BattleStackId): void {
  const battle = requireBattle(tx.state);
  if (battle.activeStackId !== stackId) reject('not_active_stack', 'That stack is not acting now');
  const stack = battle.stacks[stackId];
  if (!stack || !isAlive(stack)) reject('not_active_stack', 'That stack cannot act');
  requireControl(tx, battle, stack.side);
  rejectEngineAsStack(battle, targetId, 'harpoon creatures only');
  const target = battle.stacks[targetId];
  if (!target || !isAlive(target) || target.side === stack.side) reject('illegal_target', 'Choose a living enemy stack');
  const opts = harpoonOptions(tx.catalog, battle, stack);
  if (!opts.applies) reject('illegal_action', 'The harpoons are thrown from a ship’s deck in a sea battle');
  if (!opts.targets.includes(targetId)) reject('illegal_target', opts.reason ?? 'That enemy cannot be harpooned');
  const f = harpoonFactors(tx.catalog, battle, stack, target);
  const rng = tx.rng('combat');
  const b = f.guaranteedMax ? f.bMax : rng.nextRange(f.bMin, f.bMax);
  const { damage, killed } = resolveStackDamage(tx, battle, target, damageFor(f, b, false), true);
  tx.emit({ kind: 'BattleAttack', attackerId: stack.id, targetId: target.id, mode: 'harpoon', damage, killed, targetRemaining: aliveCount(tx.catalog, target), luck: false });
  finishActivation(tx, battle, stack, true);
}

/** Nearest occupied-cell distance (exported for the AI and the interface). */
export function stackGap(catalog: ContentCatalog, a: BattleStackState, b: BattleStackState): number {
  return Math.min(...stackCells(catalog, a).flatMap((x) => stackCells(catalog, b).map((y) => cellDistance(x, y))));
}

// ---------------------------------------------------------------------------
// The board of a new sea encounter (battle factory)
// ---------------------------------------------------------------------------

/**
 * The single-ship board of a sea encounter about to start: the layout of the rules profile, its ship
 * side bound to the side whose hero is aboard `sourceShipId` (the attacker that sailed in, or a
 * defender ambushed at sea), and both armies checked against their side (refused with a reason).
 */
export function seaEncounterBoard(
  tx: Tx,
  req: { readonly sourceShipId: ShipId; readonly attackerHeroId: HeroId; readonly defenderHeroId: HeroId | null },
  attackerCreatures: readonly CreatureId[],
  defenderCreatures: readonly CreatureId[],
): { readonly layout: BattlefieldLayoutDefinition; readonly board: BattleBoardState } {
  const layoutId = navalRules(tx.profile).seaEncounterLayoutId ?? SINGLE_SHIP_SEA_ENCOUNTER_V2.id;
  const layout = BATTLEFIELD_LAYOUTS[layoutId];
  if (!layout || !layout.sea || !layout.occupancy) reject('not_found', 'Unknown sea battlefield');
  const ship = tx.state.world.ships?.[req.sourceShipId];
  if (!ship || !ship.heroId) reject('illegal_move', 'The ship is lost');
  const shipSide: BattleSideId | null = ship.heroId === req.attackerHeroId ? 'attacker' : ship.heroId === req.defenderHeroId ? 'defender' : null;
  if (!shipSide) reject('illegal_move', 'That ship’s hero is not in this battle');
  const why =
    seaArmyProblem(tx.catalog, layout.sea, true, shipSide === 'attacker' ? attackerCreatures : defenderCreatures) ??
    seaArmyProblem(tx.catalog, layout.sea, false, shipSide === 'attacker' ? defenderCreatures : attackerCreatures);
  if (why) reject('illegal_move', why);
  return { layout, board: { ...boardFromLayout(layout), shipSide } };
}
