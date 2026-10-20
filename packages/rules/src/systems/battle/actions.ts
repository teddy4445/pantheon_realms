/**
 * BattleActionGenerator + BattleActionValidator + BattleResolver.
 *
 * Human input, auto-combat and the tactical AI all use these exact functions.
 * Every action is validated against the active stack before any mutation.
 */
import type { BattleStackId, PlayerId, SpellId } from '../../ids';
import { cellDistance, cellEquals, cellKey, footprintDistance, type BattleCell } from '../../core/hex';
import { getSpell, type ContentCatalog } from '../../definitions/catalog';
import type { SpellDefinition } from '../../definitions/pantheons';
import type { BattleSideId, BattleSideState, BattleStackState, BattleState, MatchState } from '../../state/match';
import { reject, type Tx } from '../../engine/tx';
import {
  aliveCount,
  canRetaliate,
  findAbility,
  frontHp,
  isAlive,
  inShootingRange,
  isShooter,
  shootingRange,
  opposing,
  requireBattle,
  shapeshiftRule,
  sideStacks,
  stackCells,
  statsOf,
} from './common';
import { isAdjacentToEnemy, meleeOptions, reachableAnchors, routeTo, type MeleeOption } from './geometry';
import { previewEngineStrike, previewStrike, rollEngineStrike, rollStrike, type DamagePreview } from './damage';
import { finishActivation, advanceActivation } from './flow';
import { resolveBattle } from './resolution';
import { applyMoatEntry, damageStructure, intactStructures } from './siege';
import { castingPower } from '../../resolvers/effects';
import { commitNeutralAbility, neutralAbilityOptions, nextStatusSeq, reachLine, reachLineToCells, suppressRetaliation, wardedDamage } from './neutralAbilities';
import { damageEngine, engineBeside, engineMeleeOptions, engineShotBlocked, enemyEngine, siegeEngine, stacksBesideEngine } from './engine';
import { boardingWithdrawalBlocked } from '../naval';
import { harpoonOptions } from './seaBoard';
import { scopeAllowed } from '../../resolvers/scenario';
import { applyUtilitySpell, dispellableStatuses, mindCleanseEligible, utilitySpellReason } from './libraryUtility';
import { afterLibraryCleanse, afterRelicSpellPayment, consumeMindGuard, relicHealAmount, relicSpellCost, relicSpellDamage, relicSpellOutgoing, spendOriginalUse } from './libraryRelics';
import { applyFieldSpell, applyFrostEntry, fieldCells, fieldSpellProblem } from './libraryFields';
import { createIllusion, permanentHp, restoreTemporaryLife } from './libraryLife';
import { applySpatialSpell, spatialSpellOptions } from './librarySpatial';
import { resolveStackDamage } from './common';

/** Actor ID used by the game when it commands neutral (ownerless) battle sides. */
export const NEUTRAL_PLAYER_ID: PlayerId = '__neutral__';

// ---------------------------------------------------------------------------
// Legal action generation (read-only)
// ---------------------------------------------------------------------------

export interface SpellOption {
  readonly spellId: SpellId;
  readonly name: string;
  readonly manaCost: number;
  readonly targets: BattleStackId[];
  readonly castable: boolean;
  readonly reason: string | null;
  /** The enemy siege engine can be this spell's target (direct or area damage; `targetableCatapultV1`). */
  readonly engineTarget?: boolean;
}

/** The enemy siege engine as a target of the active stack (`targetableCatapultV1`). */
export interface EngineTargetActions {
  readonly engineId: string;
  /** Landings from which the stack can strike it this activation (empty when it cannot). */
  readonly melee: MeleeOption[];
  readonly canShoot: boolean;
  /** Why it can be neither struck nor shot now (null when one of them is possible). */
  readonly reason: string | null;
}

export interface BattleLegalActions {
  readonly stackId: BattleStackId;
  readonly side: BattleSideId;
  readonly moves: BattleCell[];
  readonly melee: { targetId: BattleStackId; options: MeleeOption[] }[];
  readonly shootTargets: BattleStackId[];
  readonly shootBlockedReason: string | null;
  readonly abilities: {
    abilityId: string;
    name: string;
    targets: BattleStackId[];
    reason: string | null;
    /** Does not spend the activation (e.g. Shapeshift with free_shapeshift). */
    free?: boolean;
    /** Player-facing action label (e.g. "Take Hare aspect"). */
    label?: string;
  }[];
  /** Siege structures a wall breaker may batter this activation (empty when not applicable). */
  readonly structureTargets: string[];
  /** Why a wall breaker cannot batter now (null when it can, or when it is not a wall breaker in a siege). */
  readonly structureBlockedReason: string | null;
  readonly spells: SpellOption[];
  readonly canWait: boolean;
  readonly canDefend: boolean;
  readonly canRetreat: boolean;
  readonly canSurrender: boolean;
  /**
   * Why a boarding battle's retreat and surrender are refused now (navalMovementV1: the ship needs a
   * vacant water hex to withdraw to); null when not refused for that reason (absent on other battles).
   */
  readonly withdrawalBlockedReason?: string | null;
  readonly surrenderCost: number;
  readonly castAvailable: boolean;
  /** The enemy siege engine, when one stands (null otherwise; the attacker never targets its own). */
  readonly engine: EngineTargetActions | null;
  /**
   * Deck Harpoon (single-ship sea encounter, ship-side stacks only; absent elsewhere): the enemies in the
   * water it may harpoon now, or why not (engaged on deck, not on the deck, nobody in reach).
   */
  readonly harpoon?: { readonly targets: BattleStackId[]; readonly reason: string | null };
}

export function commanderMana(state: MatchState, side: BattleSideState): number {
  const heroId = side.commander?.heroId;
  if (heroId && state.heroes[heroId]) return state.heroes[heroId]!.mana;
  return side.scriptedMana;
}

export function legalActions(catalog: ContentCatalog, state: MatchState): BattleLegalActions | null {
  const battle = state.battle;
  if (battle?.shadowChoice) return null;
  if (!battle || battle.status !== 'active' || !battle.activeStackId) return null;
  const stack = battle.stacks[battle.activeStackId];
  if (!stack) return null;
  const reach = reachableAnchors(catalog, battle, stack);
  const enemies = sideStacks(battle, opposing(stack.side));
  const allies = sideStacks(battle, stack.side);
  const melee = enemies
    .map((e) => ({ targetId: e.id, options: meleeOptions(catalog, battle, stack, e, reach) }))
    .filter((m) => m.options.length > 0);
  let shootTargets: BattleStackId[] = [];
  let shootBlockedReason: string | null = null;
  if (isShooter(catalog, stack.creatureId)) {
    if (stack.statuses.some((s) => s.kind === 'ranged_lock')) shootBlockedReason = 'Ranged attacks are sealed for this activation';
    else if (stack.shotsRemaining <= 0) shootBlockedReason = 'No ammunition left';
    else if (isAdjacentToEnemy(catalog, battle, stack)) shootBlockedReason = 'Engaged by an adjacent enemy';
    else {
      shootTargets = enemies.filter((e) => inShootingRange(catalog, stack, e, battle)).map((e) => e.id);
      if (shootTargets.length === 0) shootBlockedReason = `No enemy within range (${shootingRange(catalog, stack.creatureId, battle)} hexes)`;
    }
  }
  const side = battle.sides[stack.side];
  const abilities: BattleLegalActions['abilities'] = [];
  const ward = findAbility(catalog, stack.creatureId, 'family_ward');
  if (ward) {
    const familyId = catalog.creatures[stack.creatureId]!.familyId;
    const used = side.familyChargesUsed[familyId] ?? 0;
    const reason = used >= ward.chargesPerBattle ? 'Ward already used by this army' : null;
    abilities.push({ abilityId: 'family_ward', name: 'Ward', targets: reason ? [] : allies.map((a) => a.id), reason });
  }
  // The neutral creatures' active abilities (handoff 2026-10-15): once per battle per stack.
  for (const o of neutralAbilityOptions(catalog, battle, stack)) abilities.push({ abilityId: o.abilityId, name: o.name, targets: o.targets, reason: o.reason });
  const shiftId = shapeshiftAbilityId(catalog, stack.creatureId);
  const shift = shiftId ? shapeshiftRule(catalog, stack.creatureId) : null;
  if (shiftId && shift) {
    const free = !!side.effects?.freeShapeshift && !battle.freeShiftUsed;
    abilities.push({
      abilityId: shiftId,
      name: catalog.abilities[shiftId]?.name ?? 'Shapeshift',
      targets: [stack.id],
      reason: null,
      free,
      label: stack.aspect ? 'Return to normal aspect' : `Take ${shift.aspect} aspect`,
    });
  }
  if (stack.statuses.some((s) => s.kind === 'spell_lock')) {
    for (const option of abilities) if (catalog.abilities[option.abilityId]?.spellcasting) {
      const i = abilities.indexOf(option);
      abilities[i] = { ...option, targets: [], reason: 'Creature spellcasting is sealed for this activation' };
    }
  }
  if (stack.summoned?.kind === 'illusion') abilities.splice(0);
  let structureTargets: string[] = [];
  let structureBlockedReason: string | null = null;
  if (battle.siege && stack.side === 'attacker' && !stack.summoned && findAbility(catalog, stack.creatureId, 'wall_breaker')) {
    const intact = intactStructures(battle).map((s) => s.id).sort();
    if (intact.length === 0) structureBlockedReason = 'No intact structures remain';
    else if (stack.statuses.some((s) => s.kind === 'ranged_lock')) structureBlockedReason = 'Ranged attacks are sealed for this activation';
    else if (stack.shotsRemaining <= 0) structureBlockedReason = 'No ammunition left';
    else if (isAdjacentToEnemy(catalog, battle, stack)) structureBlockedReason = 'Engaged by an adjacent enemy';
    else structureTargets = intact;
  }
  const spells = spellOptions(catalog, state, battle, stack.side);
  const surrenderCost = surrenderPrice(catalog, battle, stack.side);
  const townDefender = battle.encounter.kind === 'town_siege' && stack.side === 'defender';
  // Boarding: retreat and surrender sail the hero's own ship to open water, or are refused.
  const seaBlocked = boardingWithdrawalBlocked(catalog, state, battle, stack.side);
  // The enemy siege engine (targetableCatapultV1): struck from an adjacent landing or shot like a stack.
  const foeEngine = enemyEngine(battle, stack.side);
  let engine: EngineTargetActions | null = null;
  if (foeEngine) {
    const engineMelee = engineMeleeOptions(catalog, battle, stack, reach, (anchor, cells) => reachLineToCells(catalog, battle, stack, anchor, cells));
    const shotBlocked = isShooter(catalog, stack.creatureId) ? engineShotBlocked(catalog, battle, stack) : null;
    const canShoot = isShooter(catalog, stack.creatureId) && shotBlocked === null;
    const reason = engineMelee.length > 0 || canShoot ? null : (shotBlocked ?? 'The siege engine cannot be reached this turn');
    engine = { engineId: foeEngine.id, melee: engineMelee, canShoot, reason };
  }
  // Deck Harpoon (sea encounters): a weak contextual throw from the deck at an enemy in the water.
  const harpoon = harpoonOptions(catalog, battle, stack);
  return {
    stackId: stack.id,
    side: stack.side,
    moves: [...reach.values()].map((n) => n.cell),
    melee,
    shootTargets,
    shootBlockedReason,
    abilities,
    structureTargets,
    structureBlockedReason,
    spells,
    canWait: battle.phase === 'normal' && !stack.waited && !battle.activeIsBonus,
    canDefend: true,
    canRetreat: !!battle.standalone || (side.commander?.heroId != null && !townDefender && !seaBlocked),
    canSurrender: !!battle.standalone || (canSurrenderTo(battle, stack.side) && !townDefender && !seaBlocked),
    ...(battle.encounter.kind === 'naval_boarding' || battle.encounter.sourceShipId ? { withdrawalBlockedReason: seaBlocked } : {}),
    surrenderCost,
    castAvailable: !side.castThisRound && !!side.commander?.spellbook,
    engine,
    ...(harpoon.applies ? { harpoon: { targets: harpoon.targets, reason: harpoon.reason } } : {}),
  };
}

function spellOptions(catalog: ContentCatalog, state: MatchState, battle: BattleState, sideId: BattleSideId): SpellOption[] {
  const side = battle.sides[sideId];
  const commander = side.commander;
  if (!commander || !commander.spellbook) return [];
  const mana = commanderMana(state, side);
  const out: SpellOption[] = [];
  for (const spellId of commander.knownSpellIds) {
    const spell = catalog.spells[spellId];
    if (!spell || spell.context !== 'battle' || spell.implementationStatus !== 'implemented' || !scopeAllowed(state, spell.scope)) continue;
    const targets =
      spell.target === 'enemy_stack' || spell.target === 'enemy_army'
        ? sideStacks(battle, opposing(sideId)).map((s) => s.id)
        : sideStacks(battle, sideId, spell.effect.type !== 'temporary_restore').map((s) => s.id);
    const eligibleTargets = targets.filter((id) => !utilitySpellReason(catalog, state, battle, sideId, spell.effect, battle.stacks[id]!));
    let reason: string | null = null;
    if (side.castThisRound) reason = 'Already cast a spell this round';
    else if (mana < relicSpellCost(battle, sideId, spell.manaCost)) reason = `Requires ${relicSpellCost(battle, sideId, spell.manaCost)} mana`;
    const engineTarget = spellHitsEngine(spell) && !!enemyEngine(battle, sideId);
    if (!reason && !eligibleTargets.length && !engineTarget) reason = targets.length ? utilitySpellReason(catalog, state, battle, sideId, spell.effect, battle.stacks[targets[0]!]!) : 'No legal target';
    out.push({ spellId, name: spell.name, manaCost: relicSpellCost(battle, sideId, spell.manaCost), targets: eligibleTargets, castable: reason === null, reason, ...(engineTarget ? { engineTarget } : {}) });
  }
  return out;
}

/** Surrender needs a hero on both sides; the town defender in a siege can neither retreat nor surrender. */
function canSurrenderTo(battle: BattleState, sideId: BattleSideId): boolean {
  const kind = battle.encounter.kind;
  if (kind !== 'hero' && kind !== 'town_siege' && kind !== 'naval_boarding') return false;
  if (kind === 'town_siege' && sideId === 'defender') return false;
  return battle.sides[opposing(sideId)].commander?.heroId != null && battle.sides[sideId].commander?.heroId != null;
}

export function surrenderPrice(catalog: ContentCatalog, battle: BattleState, sideId: BattleSideId): number {
  let total = 0;
  for (const s of sideStacks(battle, sideId)) total += aliveCount(catalog, s) * (catalog.creatures[s.creatureId]?.cost?.gold ?? 0);
  return Math.ceil(total / 2);
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function requireActive(tx: Tx, stackId: BattleStackId): { battle: BattleState; stack: BattleStackState } {
  const battle = requireBattle(tx.state);
  if (battle.activeStackId !== stackId) reject('not_active_stack', 'That stack is not acting now');
  const stack = battle.stacks[stackId];
  if (!stack || !isAlive(stack)) reject('not_active_stack', 'That stack cannot act');
  requireControl(tx, battle, stack.side);
  return { battle, stack };
}

export function requireControl(tx: Tx, battle: BattleState, side: BattleSideId): void {
  const owner = battle.sides[side].playerId;
  if (owner !== null) {
    if (owner !== tx.actorId) reject('not_owner', 'You do not command this side');
  } else if (battle.sides[side].controller !== 'ai' || tx.actorId !== NEUTRAL_PLAYER_ID) {
    reject('not_owner', 'Neutral forces are commanded by the game');
  }
}

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

/**
 * The siege engine is a battle object, not a creature stack: an order that names it where a stack is
 * expected (a creature-only ability, a stack spell or miracle) is refused with a clear reason.
 */
export function rejectEngineAsStack(battle: BattleState, targetId: string, what: string): void {
  const engine = siegeEngine(battle);
  if (engine && targetId === engine.id) reject('illegal_target', `The catapult is a siege engine, not a creature: ${what}`);
}

function strike(tx: Tx, battle: BattleState, attacker: BattleStackState, target: BattleStackState, mode: 'melee' | 'shot' | 'retaliation', chargeHexes: number, reach = false): void {
  const rolled = rollStrike(tx.catalog, battle, attacker, target, { mode, chargeHexes, reach }, tx.rng('combat'));
  if (!attacker.summoned && battle.sides[attacker.side].effects?.library?.length && (mode === 'shot' || mode === 'retaliation')) spendOriginalUse(battle, attacker, mode);
  if (mode === 'retaliation') {
    for (const s of attacker.statuses) if ((s.kind === 'retaliation_weaken' || s.kind === 'retaliation_bonus') && (s.charges ?? 0) > 0) s.charges!--;
    attacker.statuses = attacker.statuses.filter((s) => (s.kind !== 'retaliation_weaken' && s.kind !== 'retaliation_bonus') || (s.charges ?? 0) > 0);
  }
  if (mode === 'melee') attacker.statuses = attacker.statuses.filter((s) => s.kind !== 'pierce_borrowed_defense');
  const luck = rolled.luck;
  // A direct creature blow: Sheltering Wings reduces it (and is spent).
  const { damage, killed } = resolveStackDamage(tx, battle, target, wardedDamage(tx, target, rolled.damage), true);
  if (mode === 'shot' && rolled.damage > 0 && battle.sides[target.side].effects?.library?.length) spendOriginalUse(battle, target, 'firstRangedHit');
  tx.emit({
    kind: 'BattleAttack',
    attackerId: attacker.id,
    targetId: target.id,
    mode,
    damage,
    killed,
    targetRemaining: aliveCount(tx.catalog, target),
    luck,
  });
  if (!attacker.summoned && mode !== 'shot' && rolled.damage > 0 && attacker.side !== target.side) {
    const thorns = target.statuses.find((s) => s.kind === 'one_hit_thorns');
    if (thorns) {
      target.statuses = target.statuses.filter((s) => s !== thorns);
      const receipt = resolveStackDamage(tx, battle, attacker, thorns.amount); // Secondary damage never calls strike or triggers another thorn.
      tx.emit({ kind: 'BattleSpellCast', side: target.side, spellId: thorns.sourceId.slice(6), targetId: attacker.id, damage: receipt.damage, healed: 0 });
    }
  }
}

function moveStack(tx: Tx, battle: BattleState, stack: BattleStackState, to: BattleCell): number {
  if (cellEquals(stack.anchor, to)) return 0;
  const reach = reachableAnchors(tx.catalog, battle, stack);
  const node = reach.get(cellKey(to));
  if (!node) reject('illegal_move', 'That hex is out of reach');
  const flying = !!findAbility(tx.catalog, stack.creatureId, 'flight') || stack.statuses.some((s) => s.kind === 'temporary_flight');
  const path = routeTo(stack, reach, to);
  const before = stackCells(tx.catalog, stack);
  const travelled: BattleCell[] = [];
  if (flying) {
    const from = stack.anchor;
    stack.anchor = to; travelled.push(...path);
    applyFrostEntry(tx, battle, stack, from, to);
  } else for (const step of path) {
    const from = stack.anchor;
    stack.anchor = step; travelled.push(step);
    applyFrostEntry(tx, battle, stack, from, step);
    if (!isAlive(stack)) break;
  }
  tx.emit({ kind: 'BattleStackMoved', stackId: stack.id, path: travelled, flying });
  if (isAlive(stack)) applyMoatEntry(tx, battle, stack, before);
  return flying ? cellDistance(before[0]!, to) : travelled.length;
}

export function commitBattleMove(tx: Tx, stackId: BattleStackId, to: BattleCell): void {
  const { battle, stack } = requireActive(tx, stackId);
  if (cellEquals(stack.anchor, to)) reject('illegal_move', 'Choose a different hex');
  moveStack(tx, battle, stack, to);
  finishActivation(tx, battle, stack, true);
}

export function commitBattleMelee(tx: Tx, stackId: BattleStackId, targetId: BattleStackId, from: BattleCell): void {
  const { battle, stack } = requireActive(tx, stackId);
  rejectEngineAsStack(battle, targetId, 'strike it with an engine attack');
  const target = battle.stacks[targetId];
  if (!target || !isAlive(target) || target.side === stack.side) reject('illegal_target', 'Choose a living enemy stack');
  const options = meleeOptions(tx.catalog, battle, stack, target);
  const option = options.find((o) => cellEquals(o.from, from));
  if (!option) reject('illegal_target', 'Cannot reach that enemy from there');
  const hexes = moveStack(tx, battle, stack, from);
  if (!isAlive(stack)) return finishActivation(tx, battle, stack, false);
  const adjacentNow = footprintDistance(stackCells(tx.catalog, stack), stackCells(tx.catalog, target)) === 1;
  // Long Reach: a strike across one clear hex (handoff 2026-10-15).
  const reach = !adjacentNow && !!option.reach && reachLine(tx.catalog, battle, stack, stack.anchor, target);
  if (!adjacentNow && !reach) reject('illegal_target', 'Not adjacent after moving');
  strike(tx, battle, stack, target, 'melee', hexes, reach);
  // The target answers only if it can reach back the same way (an adjacent-only creature cannot jump the gap).
  const canAnswer = adjacentNow || reachLine(tx.catalog, battle, target, target.anchor, stack);
  if (isAlive(target) && canAnswer && canRetaliate(tx.catalog, target) && isAlive(stack)) {
    // Distract: this retaliation is suppressed (and counts as used).
    if (!suppressRetaliation(tx, target)) {
      target.retaliationsUsed += 1;
      strike(tx, battle, target, stack, 'retaliation', 0, !adjacentNow);
    }
  }
  finishActivation(tx, battle, stack, true);
}

export function commitBattleShoot(tx: Tx, stackId: BattleStackId, targetId: BattleStackId): void {
  const { battle, stack } = requireActive(tx, stackId);
  if (stack.statuses.some((s) => s.kind === 'ranged_lock')) reject('illegal_action', 'Ranged attacks are sealed for this activation');
  rejectEngineAsStack(battle, targetId, 'shoot it with an engine attack');
  const target = battle.stacks[targetId];
  if (!target || !isAlive(target) || target.side === stack.side) reject('illegal_target', 'Choose a living enemy stack');
  if (!isShooter(tx.catalog, stack.creatureId)) reject('illegal_action', 'This creature cannot shoot');
  if (stack.shotsRemaining <= 0) reject('illegal_action', 'No ammunition left');
  if (isAdjacentToEnemy(tx.catalog, battle, stack)) reject('illegal_action', 'Cannot shoot while engaged by an adjacent enemy');
  if (!inShootingRange(tx.catalog, stack, target, battle)) reject('illegal_target', `Out of range: this creature shoots up to ${shootingRange(tx.catalog, stack.creatureId, battle)} hexes`);
  stack.shotsRemaining -= 1;
  strike(tx, battle, stack, target, 'shot', 0);
  finishActivation(tx, battle, stack, true);
}

/**
 * `BattleAttackEngine`: the active stack strikes (from a legal landing, Long Reach included) or shoots
 * the enemy siege engine with the normal damage pipeline against the engine's Defense and HP. The
 * engine never retaliates; the blow counts as an ordinary action (positive morale may follow).
 */
export function commitBattleAttackEngine(tx: Tx, stackId: BattleStackId, engineId: string, mode: 'melee' | 'shot', from: BattleCell | null): void {
  const { battle, stack } = requireActive(tx, stackId);
  const engine = enemyEngine(battle, stack.side);
  if (!engine || engine.id !== engineId) {
    const own = siegeEngine(battle);
    reject('illegal_target', own && own.id === engineId ? (own.hp <= 0 ? 'The catapult is already destroyed' : 'You cannot attack your own siege engine') : 'There is no such siege engine');
  }
  if (mode === 'shot') {
    const blocked = engineShotBlocked(tx.catalog, battle, stack);
    if (blocked) reject(blocked.startsWith('Out of range') ? 'illegal_target' : 'illegal_action', blocked);
    stack.shotsRemaining -= 1;
    const rolled = rollEngineStrike(tx.catalog, battle, stack, engine, { mode: 'shot', chargeHexes: 0 }, tx.rng('combat'));
    if (battle.sides[stack.side].effects?.library?.length) spendOriginalUse(battle, stack, 'shot');
    damageEngine(tx, battle, engine, rolled.damage, { attackerId: stack.id, source: 'shot', luck: rolled.luck });
    finishActivation(tx, battle, stack, true);
    return;
  }
  if (mode !== 'melee' || !from) reject('invalid_command', 'Choose where to strike the siege engine from');
  const reachLineTo = (anchor: BattleCell, cells: readonly BattleCell[]) => reachLineToCells(tx.catalog, battle, stack, anchor, cells);
  const option = engineMeleeOptions(tx.catalog, battle, stack, reachableAnchors(tx.catalog, battle, stack), reachLineTo).find((o) => cellEquals(o.from, from));
  if (!option) reject('illegal_target', 'Cannot reach the siege engine from there');
  const hexes = moveStack(tx, battle, stack, from);
  if (!isAlive(stack)) return finishActivation(tx, battle, stack, false);
  const adjacentNow = footprintDistance(stackCells(tx.catalog, stack), engine.cells) === 1;
  const reach = !adjacentNow && !!option.reach && reachLineTo(stack.anchor, engine.cells);
  if (!adjacentNow && !reach) reject('illegal_target', 'Not adjacent after moving');
  const rolled = rollEngineStrike(tx.catalog, battle, stack, engine, { mode: 'melee', chargeHexes: hexes, reach }, tx.rng('combat'));
  stack.statuses = stack.statuses.filter((s) => s.kind !== 'pierce_borrowed_defense');
  damageEngine(tx, battle, engine, rolled.damage, { attackerId: stack.id, source: 'melee', luck: rolled.luck });
  finishActivation(tx, battle, stack, true);
}

export function commitBattleAttackStructure(tx: Tx, stackId: BattleStackId, structureId: string): void {
  const { battle, stack } = requireActive(tx, stackId);
  if (stack.statuses.some((s) => s.kind === 'ranged_lock')) reject('illegal_action', 'Ranged attacks are sealed for this activation');
  const siege = battle.siege;
  if (!siege || siege.level === 0) reject('illegal_action', 'There are no fortifications in this battle');
  if (stack.side !== 'attacker') reject('illegal_action', 'Only the besieging army batters the walls');
  if (stack.summoned) reject('illegal_action', 'Illusions cannot use siege abilities');
  if (!findAbility(tx.catalog, stack.creatureId, 'wall_breaker')) reject('illegal_action', 'This creature cannot damage structures');
  if (stack.shotsRemaining <= 0) reject('illegal_action', 'No ammunition left');
  if (isAdjacentToEnemy(tx.catalog, battle, stack)) reject('illegal_action', 'Cannot throw while engaged by an adjacent enemy');
  const structure = siege.structures.find((s) => s.id === structureId && s.hp > 0);
  if (!structure) reject('illegal_target', 'Choose an intact structure');
  stack.shotsRemaining -= 1;
  damageStructure(tx, structure, tx.profile.combat.siege.wallBreakerDamage, 'creature', stack.id);
  finishActivation(tx, battle, stack, true);
}

export function commitBattleDefend(tx: Tx, stackId: BattleStackId): void {
  const { battle, stack } = requireActive(tx, stackId);
  stack.defending = true;
  tx.emit({ kind: 'BattleStackDefended', stackId });
  finishActivation(tx, battle, stack, true);
}

export function commitBattleWait(tx: Tx, stackId: BattleStackId): void {
  const { battle, stack } = requireActive(tx, stackId);
  if (battle.phase !== 'normal' || stack.waited || battle.activeIsBonus) reject('illegal_action', 'This stack cannot wait now');
  stack.waited = true;
  battle.sides[stack.side].actedInBattle = true;
  battle.waitQueue.push(stack.id);
  battle.activeStackId = null;
  tx.emit({ kind: 'BattleStackWaited', stackId });
  advanceActivation(tx, battle);
}

/** The ability ID of this creature's Shapeshift (abilities are data; the rule type identifies it). */
export function shapeshiftAbilityId(catalog: ContentCatalog, creatureId: string): string | null {
  for (const id of catalog.creatures[creatureId]?.abilityIds ?? []) if (catalog.abilities[id]?.rule.type === 'shapeshift') return id;
  return null;
}

export function commitBattleAbility(tx: Tx, stackId: BattleStackId, abilityId: string, targetId: BattleStackId): void {
  const { battle, stack } = requireActive(tx, stackId);
  rejectEngineAsStack(battle, targetId, `${tx.catalog.abilities[abilityId]?.name ?? 'this ability'} works only on creatures`);
  const def = tx.catalog.abilities[abilityId];
  if (!def || !(tx.catalog.creatures[stack.creatureId]?.abilityIds ?? []).includes(abilityId)) reject('illegal_action', 'This creature has no such ability');
  if (stack.summoned?.kind === 'illusion') reject('illegal_action', 'Illusions cannot use abilities');
  if (def.spellcasting && stack.statuses.some((s) => s.kind === 'spell_lock')) reject('illegal_action', 'Creature spellcasting is sealed for this activation');
  if (def.rule.type === 'shapeshift') return commitShapeshift(tx, battle, stack, def.rule, targetId);
  if (commitNeutralAbility(tx, battle, stack, abilityId, targetId)) return finishActivation(tx, battle, stack, true);
  if (def.rule.type !== 'family_ward') reject('illegal_action', 'That ability is not an action');
  const ward = findAbility(tx.catalog, stack.creatureId, 'family_ward');
  if (!ward) reject('illegal_action', 'This creature has no Ward');
  const target = battle.stacks[targetId];
  if (!target || !isAlive(target) || target.side !== stack.side) reject('illegal_target', 'Choose a friendly stack');
  const side = battle.sides[stack.side];
  const familyId = tx.catalog.creatures[stack.creatureId]!.familyId;
  if ((side.familyChargesUsed[familyId] ?? 0) >= ward.chargesPerBattle) reject('illegal_action', 'Ward already used by this army');
  side.familyChargesUsed[familyId] = (side.familyChargesUsed[familyId] ?? 0) + 1;
  applyStatus(target, {
    sourceId: 'ability:family_ward',
    label: tx.catalog.abilities[abilityId]?.name ?? 'Ward',
    kind: 'defense_bonus',
    amount: ward.defenseBonus,
    numerator: 1,
    denominator: 1,
    expiresAtRound: battle.round + ward.durationRounds,
    sourceStackId: stack.id,
    sourceSide: stack.side,
  });
  tx.emit({ kind: 'BattleAbilityUsed', stackId, abilityId, targetId });
  finishActivation(tx, battle, stack, true);
}

function commitShapeshift(tx: Tx, battle: BattleState, stack: BattleStackState, rule: { aspect: string }, targetId: BattleStackId): void {
  if (targetId !== stack.id) reject('illegal_target', 'A creature can only change its own aspect');
  const free = !!battle.sides[stack.side].effects?.freeShapeshift && !battle.freeShiftUsed;
  stack.aspect = !stack.aspect;
  tx.emit({ kind: 'BattleStackShapeshifted', stackId: stack.id, aspect: stack.aspect ? rule.aspect : null, free });
  if (free) {
    battle.freeShiftUsed = true; // the activation continues
    return;
  }
  finishActivation(tx, battle, stack, true);
}

/**
 * Apply or refresh a status by its source. With `opts`, the status records its application
 * order and whether the opposing side applied it (Devour Dread removes only hostile ones), and who
 * applied it (`sourceSide`, and `sourceHeroId` for a hero commander's spell; inspection only).
 */
export function applyStatus(
  stack: BattleStackState,
  status: BattleStackState['statuses'][number],
  opts?: { battle?: BattleState; casterSide?: BattleSideId; casterHeroId?: BattleStackState['statuses'][number]['sourceHeroId'] | null },
): void {
  const by = opts?.casterSide ? { sourceSide: status.sourceSide ?? opts.casterSide, ...(opts.casterHeroId && !status.sourceHeroId ? { sourceHeroId: opts.casterHeroId } : {}) } : {};
  const tagged = opts?.casterSide ? { ...status, ...by, hostile: opts.casterSide !== stack.side } : status;
  const hostile = tagged.hostile ?? (tagged.amount < 0 || tagged.kind === 'min_damage_roll');
  if (hostile && tagged.sourceId.startsWith('spell:') && tagged.dispellable !== false) {
    if (tagged.kind === 'fear' || tagged.kind === 'blind') {
      const guard = stack.statuses.find((s) => s.kind === 'mind_control_ward');
      if (guard) { stack.statuses = stack.statuses.filter((s) => s !== guard); return; }
    }
    if (tagged.mind && opts?.battle && consumeMindGuard(opts.battle, stack)) return;
    const ward = stack.statuses.filter((s) => s.kind === 'debuff_ward').sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))[0];
    if (ward) { stack.statuses = stack.statuses.filter((s) => s !== ward); return; }
  }
  const existing = stack.statuses.findIndex((s) => s.sourceId === status.sourceId);
  if (existing >= 0) {
    const old = stack.statuses[existing]!;
    stack.statuses[existing] = {
      ...tagged,
      amount: Math.max(old.amount, status.amount),
      expiresAtRound: Math.max(old.expiresAtRound, status.expiresAtRound),
      ...(old.seq !== undefined ? { seq: old.seq } : {}),
    };
  } else {
    stack.statuses.push(opts?.battle ? { ...tagged, seq: nextStatusSeq(opts.battle) } : tagged);
  }
}

export function commitBattleCast(tx: Tx, spellId: SpellId, targetId: BattleStackId, statusSourceId?: string, destination?: BattleCell, secondTargetId?: string, cells?: BattleCell[]): void {
  const battle = requireBattle(tx.state);
  const active = battle.activeStackId ? battle.stacks[battle.activeStackId] : undefined;
  if (!active) reject('illegal_action', 'Spells are cast at the start of a friendly activation');
  requireControl(tx, battle, active.side);
  const side = battle.sides[active.side];
  const commander = side.commander;
  if (!commander || !commander.spellbook) reject('illegal_action', 'No commander with a spellbook');
  if (side.castThisRound) reject('already_done', 'Your commander already cast a spell this round');
  if (!commander.knownSpellIds.includes(spellId)) reject('illegal_action', 'Spell not known');
  const spell = getSpell(tx.catalog, spellId);
  if (spell.context !== 'battle') reject('illegal_action', 'Not a battle spell');
  if (spell.implementationStatus !== 'implemented' || !scopeAllowed(tx.state, spell.scope)) reject('illegal_action', 'This spell is not enabled in this scenario');
  const mana = commanderMana(tx.state, side);
  const cost = relicSpellCost(battle, active.side, spell.manaCost);
  if (mana < cost) reject('insufficient_resources', `Requires ${cost} mana`);
  rejectEngineAsStack(battle, targetId, spellHitsEngine(spell) ? `cast ${spell.name} at it as an engine target` : `${spell.name} works only on creatures`);
  const target = battle.stacks[targetId];
  if (!target || (!isAlive(target) && spell.effect.type !== 'temporary_restore')) reject('illegal_target', 'Choose a living stack');
  const wantEnemy = spell.target === 'enemy_stack' || spell.target === 'enemy_army';
  if (spell.effect.type !== 'battle_field' && (target.side !== active.side) !== wantEnemy) reject('illegal_target', wantEnemy ? 'Target an enemy stack' : 'Target a friendly stack');
  if (spell.target === 'known_tile' || spell.target === 'self') reject('illegal_action', 'Not a battle spell');
  const utilityReason = utilitySpellReason(tx.catalog, tx.state, battle, active.side, spell.effect, target);
  if (utilityReason) reject('illegal_target', utilityReason);
  if (spell.effect.type === 'dispel_status') {
    const options = dispellableStatuses(target, spell.effect.polarity);
    if (statusSourceId ? !options.some((s) => s.sourceId === statusSourceId) : options.length !== 1) reject('illegal_target', 'Choose the spell status to remove');
  } else if (statusSourceId !== undefined) reject('illegal_target', 'This spell does not select a status');
  const spatial = (spell.effect.type === 'spatial_move' || spell.effect.type === 'illusion_copy') ? spatialSpellOptions(tx.catalog, battle, target, spell.effect).find((o) => destination && cellEquals(o.destination, destination) && o.secondTargetId === secondTargetId) : undefined;
  if ((spell.effect.type === 'spatial_move' || spell.effect.type === 'illusion_copy') && !spatial) reject('illegal_target', 'Choose a highlighted legal destination');
  if (spell.effect.type !== 'spatial_move' && spell.effect.type !== 'illusion_copy' && (destination || secondTargetId)) reject('illegal_target', 'This spell does not move a stack');
  if (spell.effect.type === 'battle_field') {
    const problem = fieldSpellProblem(tx.catalog, battle, spell.effect, cells ?? []);
    if (problem) reject('illegal_target', problem);
  } else if (cells) reject('illegal_target', 'This spell does not select battlefield hexes');
  // Pay mana, then resolve.
  const heroId = commander.heroId;
  if (heroId && tx.state.heroes[heroId]) tx.state.heroes[heroId]!.mana -= cost;
  else side.scriptedMana -= cost;
  afterRelicSpellPayment(tx.catalog, tx.state, battle, active.side, cost);
  side.castThisRound = true;
  const { damage, healed } = spell.effect.type === 'spatial_move' && spatial
    ? (applySpatialSpell(tx, battle, target, spell.effect, spatial), { damage: 0, healed: 0 })
    : spell.effect.type === 'illusion_copy' && spatial
      ? (createIllusion(tx, battle, target, spatial.destination, spell.effect.durationRounds), { damage: 0, healed: 0 })
      : spell.effect.type === 'battle_field' ? applyFieldSpell(tx, battle, spell, spell.effect, active.side, cells!, castingPower(side, spell.id))
      : resolveSpell(tx, battle, spell, castingPower(side, spell.id), target, active.side, statusSourceId);
  tx.emit({ kind: 'BattleSpellCast', side: active.side, spellId, targetId, damage, healed, ...(spell.effect.type === 'battle_field' ? { cells: fieldCells(battle, spell.effect, cells!) } : {}) });
  // Casting does not consume the stack's action, but a kill may end the battle.
  battleEnded(tx, battle);
}

/** A direct or area damage spell aimed at one enemy: it may target the enemy siege engine. */
export function spellHitsEngine(spell: SpellDefinition): boolean {
  return spell.context === 'battle' && spell.target === 'enemy_stack' && (spell.effect.type === 'direct_damage' || spell.effect.type === 'area_damage');
}

/**
 * `BattleCastAtEngine`: the commander casts a direct or area damage spell at the enemy siege engine
 * (its HP; never a structure's). Area damage also hits the engine side's stacks beside it, each once.
 * Mind, life, poison, healing and stat spells cannot target it.
 */
export function commitBattleCastAtEngine(tx: Tx, spellId: SpellId, engineId: string): void {
  const battle = requireBattle(tx.state);
  const active = battle.activeStackId ? battle.stacks[battle.activeStackId] : undefined;
  if (!active) reject('illegal_action', 'Spells are cast at the start of a friendly activation');
  requireControl(tx, battle, active.side);
  const side = battle.sides[active.side];
  const commander = side.commander;
  if (!commander || !commander.spellbook) reject('illegal_action', 'No commander with a spellbook');
  if (side.castThisRound) reject('already_done', 'Your commander already cast a spell this round');
  if (!commander.knownSpellIds.includes(spellId)) reject('illegal_action', 'Spell not known');
  const spell = getSpell(tx.catalog, spellId);
  if (spell.context !== 'battle') reject('illegal_action', 'Not a battle spell');
  if (!spellHitsEngine(spell)) reject('illegal_target', `${spell.name} cannot target the siege engine: only damage spells aimed at one enemy can`);
  if (spell.implementationStatus !== 'implemented' || !scopeAllowed(tx.state, spell.scope)) reject('illegal_action', 'This spell is not enabled in this scenario');
  const engine = enemyEngine(battle, active.side);
  if (!engine || engine.id !== engineId) reject('illegal_target', 'There is no enemy siege engine to target');
  const mana = commanderMana(tx.state, side);
  const cost = relicSpellCost(battle, active.side, spell.manaCost);
  if (mana < cost) reject('insufficient_resources', `Requires ${cost} mana`);
  const heroId = commander.heroId;
  if (heroId && tx.state.heroes[heroId]) tx.state.heroes[heroId]!.mana -= cost;
  else side.scriptedMana -= cost;
  afterRelicSpellPayment(tx.catalog, tx.state, battle, active.side, cost);
  side.castThisRound = true;
  const e = spell.effect as Extract<SpellDefinition['effect'], { type: 'direct_damage' | 'area_damage' }>;
  const bonusPct = side.effects?.spellDamagePercent ?? 0;
  const damage = relicSpellOutgoing(battle, spell, active.side, Math.floor(((e.base + e.perPower * castingPower(side, spell.id)) * (100 + bonusPct)) / 100));
  // Area damage: the stacks beside the engine (its own side) are hit once each, after the engine.
  const beside = e.type === 'area_damage' ? stacksBesideEngine(tx.catalog, battle, engine, engine.side) : [];
  damageEngine(tx, battle, engine, damage, { attackerId: null, source: 'spell', spellId });
  let total = 0;
  for (const v of beside.sort((a, b) => a.id < b.id ? -1 : 1)) if (isAlive(v)) { const hit = relicSpellDamage(battle, spell, active.side, v, damage); total += resolveStackDamage(tx, battle, v, hit).damage; }
  tx.emit({ kind: 'BattleSpellCast', side: active.side, spellId, targetId: engine.id as BattleStackId, damage: total, healed: 0, targetEngineId: engine.id });
  battleEnded(tx, battle);
}

export function battleEnded(tx: Tx, battle: BattleState): boolean {
  const a = sideStacks(battle, 'attacker').some((s) => permanentHp(s) > 0);
  const d = sideStacks(battle, 'defender').some((s) => permanentHp(s) > 0);
  if (a && d) return false;
  resolveBattle(tx, battle, a ? 'attacker' : 'defender', a ? 'victory' : 'defeat');
  return true;
}

function resolveSpell(tx: Tx, battle: BattleState, spell: SpellDefinition, power: number, target: BattleStackState, sideId: BattleSideId, statusSourceId?: string): { damage: number; healed: number } {
  const e = spell.effect;
  if (applyUtilitySpell(tx.catalog, tx.state, battle, sideId, e, target, power, statusSourceId)) return { damage: 0, healed: 0 };
  const source = `spell:${spell.id}`;
  // Who cast it (inspection): the side, and the commander's hero when the commander is one.
  const by = { battle, casterSide: sideId, casterHeroId: battle.sides[sideId].commander?.heroId ?? null };
  const bonusPct = battle.sides[sideId].effects?.spellDamagePercent ?? 0;
  const boosted = (n: number) => Math.floor((n * (100 + bonusPct)) / 100);
  switch (e.type) {
    case 'projectile_spell_ward':
      applyStatus(target, { sourceId: source, label: spell.name, kind: 'projectile_spell_ward', amount: e.percent, capHp: e.cap, numerator: 1, denominator: 1, expiresAtRound: battle.round + e.durationRounds }, by);
      return { damage: 0, healed: 0 };
    case 'one_hit_thorns':
      applyStatus(target, { sourceId: source, label: spell.name, kind: 'one_hit_thorns', amount: e.base + e.perPower * power, numerator: 1, denominator: 1, expiresAtRound: battle.round + e.durationRounds }, by);
      return { damage: 0, healed: 0 };
    case 'tactical_status':
      applyStatus(target, { sourceId: source, label: spell.name, kind: e.status, amount: e.amount, numerator: 1, denominator: 1,
        expiresAtRound: e.duration === 'next_activation' ? Number.MAX_SAFE_INTEGER : battle.round + e.duration,
        ...(e.duration === 'next_activation' ? { expiresAfterActivation: true, nextActivationStarted: false } : {}),
        ...(e.charges !== undefined ? { charges: e.charges } : {}), ...(e.mind ? { mind: true } : {}), dispellable: true }, by);
      return { damage: 0, healed: 0 };
    case 'group_mind_cleanse':
      for (const s of sideStacks(battle, sideId).sort((a, b) => a.id < b.id ? -1 : 1)) {
        const old = s.statuses.length;
        s.statuses = s.statuses.filter((st) => !mindCleanseEligible(st));
        if (s.statuses.length < old) afterLibraryCleanse(battle, sideId, s);
      }
      return { damage: 0, healed: 0 };
    case 'battle_field':
    case 'illusion_copy':
    case 'spatial_move':
    case 'restore_shots':
    case 'dispel_status':
    case 'retaliation_restore':
    case 'enemy_mana_drain':
      throw new Error('Utility spell dispatch failed');
    case 'temporary_restore': return { damage: 0, healed: restoreTemporaryLife(tx.catalog, battle, target, e.base + e.perPower * power, e.durationRounds) };
    case 'banish_summon': {
      const { damage } = resolveStackDamage(tx, battle, target, target.summoned?.kind === 'illusion' ? 1 : relicSpellDamage(battle, spell, sideId, target, boosted(e.base + e.perPower * power)));
      return { damage, healed: 0 };
    }
    case 'direct_damage': {
      const { damage } = resolveStackDamage(tx, battle, target, relicSpellDamage(battle, spell, sideId, target, boosted(e.base + e.perPower * power)));
      return { damage, healed: 0 };
    }
    case 'area_damage': {
      const damage = boosted(e.base + e.perPower * power);
      const victims = [target, ...adjacentEnemies(tx.catalog, battle, target)];
      let total = 0;
      for (const v of victims.sort((a, b) => a.id < b.id ? -1 : 1)) if (isAlive(v)) { const hit = relicSpellDamage(battle, spell, sideId, v, damage); total += resolveStackDamage(tx, battle, v, hit).damage; }
      // A siege engine beside the target is hit once by the same blast (never once per cell).
      const engineHit = engineBeside(tx.catalog, battle, target);
      if (engineHit) damageEngine(tx, battle, engineHit, damage, { attackerId: null, source: 'spell', spellId: spell.id });
      return { damage: total, healed: 0 };
    }
    case 'heal_front': {
      const hp = statsOf(tx.catalog, target.creatureId).hp;
      const missing = hp - frontHp(tx.catalog, target);
      const healed = Math.max(0, Math.min(missing, relicHealAmount(battle, sideId, e.base + e.perPower * power, target, spell)));
      target.totalHp += healed;
      return { damage: 0, healed };
    }
    case 'max_damage_roll':
      applyStatus(target, { sourceId: source, label: spell.name, kind: 'max_damage_roll', amount: 0, numerator: 1, denominator: 1, expiresAtRound: battle.round + e.durationRounds }, by);
      return { damage: 0, healed: 0 };
    case 'defense_bonus':
      applyStatus(target, { sourceId: source, label: spell.name, kind: 'defense_bonus', amount: e.amount, numerator: 1, denominator: 1, expiresAtRound: battle.round + e.durationRounds }, by);
      return { damage: 0, healed: 0 };
    case 'attack_bonus':
      applyStatus(target, { sourceId: source, label: spell.name, kind: 'attack_bonus', amount: e.amount, numerator: 1, denominator: 1, expiresAtRound: battle.round + e.durationRounds }, by);
      return { damage: 0, healed: 0 };
    case 'speed_bonus':
      applyStatus(target, { sourceId: source, label: spell.name, kind: 'speed_bonus', amount: e.amount, numerator: 1, denominator: 1, expiresAtRound: battle.round + e.durationRounds }, by);
      return { damage: 0, healed: 0 };
    case 'mass_bonus': {
      const kind = e.stat === 'attack' ? 'attack_bonus' : e.stat === 'defense' ? 'defense_bonus' : 'speed_bonus';
      const side = spell.target === 'enemy_army' ? opposing(sideId) : sideId;
      for (const s of sideStacks(battle, side)) applyStatus(s, { sourceId: source, label: spell.name, kind, amount: e.amount, numerator: 1, denominator: 1, expiresAtRound: battle.round + e.durationRounds }, by);
      return { damage: 0, healed: 0 };
    }
    case 'ranged_mitigation':
      applyStatus(target, { sourceId: source, label: spell.name, kind: 'ranged_mitigation', amount: 0, numerator: e.numerator, denominator: e.denominator, expiresAtRound: battle.round + e.durationRounds }, by);
      return { damage: 0, healed: 0 };
    case 'melee_mitigation':
      applyStatus(target, { sourceId: source, label: spell.name, kind: 'melee_mitigation', amount: 0, numerator: e.numerator, denominator: e.denominator, expiresAtRound: battle.round + e.durationRounds }, by);
      return { damage: 0, healed: 0 };
    case 'min_damage_roll':
      applyStatus(target, { sourceId: source, label: spell.name, kind: 'min_damage_roll', amount: 0, numerator: 1, denominator: 1, expiresAtRound: battle.round + e.durationRounds }, by);
      return { damage: 0, healed: 0 };
    case 'mass_heal': {
      let healed = 0;
      for (const s of sideStacks(battle, sideId)) {
        if (s.summoned) continue;
        const hp = statsOf(tx.catalog, s.creatureId).hp;
        const h = Math.max(0, Math.min(hp - frontHp(tx.catalog, s), relicHealAmount(battle, sideId, e.base + e.perPower * power, s, spell)));
        s.totalHp += h;
        healed += h;
      }
      return { damage: 0, healed };
    }
    case 'mass_damage': {
      const damage = boosted(e.base + e.perPower * power);
      const victims = sideStacks(battle, opposing(sideId));
      let total = 0;
      for (const v of victims.sort((a, b) => a.id < b.id ? -1 : 1)) if (isAlive(v)) { const hit = relicSpellDamage(battle, spell, sideId, v, damage); total += resolveStackDamage(tx, battle, v, hit).damage; }
      // The enemy's siege engine stands in the storm too: hit once.
      const engineHit = enemyEngine(battle, sideId);
      if (engineHit) damageEngine(tx, battle, engineHit, damage, { attackerId: null, source: 'spell', spellId: spell.id });
      return { damage: total, healed: 0 };
    }
    case 'reveal_radius':
    case 'movement_bonus':
    case 'recall':
    case 'adventure_camp':
    case 'adventure_anchor':
    case 'adventure_boatcall':
    case 'adventure_compact':
    case 'adventure_report':
    case 'adventure_decoy':
    case 'adventure_courier':
    case 'adventure_travel_buff':
      reject('illegal_action', 'Adventure spell');
  }
}

/** Enemy stacks (of the target's side) whose footprint touches the target's footprint. */
export function adjacentEnemies(catalog: ContentCatalog, battle: BattleState, target: BattleStackState): BattleStackState[] {
  return sideStacks(battle, target.side).filter((s) => s.id !== target.id && footprintDistance(stackCells(catalog, s), stackCells(catalog, target)) === 1);
}

export function commitBattleRetreat(tx: Tx): void {
  const battle = requireBattle(tx.state);
  const active = battle.activeStackId ? battle.stacks[battle.activeStackId] : undefined;
  if (!active) reject('illegal_action', 'Retreat is chosen on a friendly activation');
  requireControl(tx, battle, active.side);
  const side = battle.sides[active.side];
  if (battle.standalone) { side.retreated = true; resolveBattle(tx, battle, opposing(active.side), 'retreat'); return; }
  if (!side.commander?.heroId) reject('illegal_action', 'Only a hero-led army can retreat');
  if (battle.encounter.kind === 'town_siege' && active.side === 'defender') reject('illegal_action', 'A town defender cannot retreat');
  const seaBlocked = boardingWithdrawalBlocked(tx.catalog, tx.state, battle, active.side);
  if (seaBlocked) reject('illegal_action', seaBlocked);
  side.retreated = true;
  resolveBattle(tx, battle, opposing(active.side), 'retreat');
}

export function commitBattleSurrender(tx: Tx): void {
  const battle = requireBattle(tx.state);
  const active = battle.activeStackId ? battle.stacks[battle.activeStackId] : undefined;
  if (!active) reject('illegal_action', 'Surrender is chosen on a friendly activation');
  requireControl(tx, battle, active.side);
  const opponent = battle.sides[opposing(active.side)];
  if (battle.standalone) { battle.sides[active.side].surrendered = true; resolveBattle(tx, battle, opposing(active.side), 'surrender'); return; }
  if (battle.encounter.kind === 'town_siege' && active.side === 'defender') reject('illegal_action', 'A town defender cannot surrender');
  if (!canSurrenderTo(battle, active.side) || !opponent.commander?.heroId) reject('illegal_action', 'Surrender is only possible against an enemy hero');
  const seaBlocked = boardingWithdrawalBlocked(tx.catalog, tx.state, battle, active.side);
  if (seaBlocked) reject('illegal_action', seaBlocked);
  const cost = surrenderPrice(tx.catalog, battle, active.side);
  const side = battle.sides[active.side];
  const player = side.playerId ? tx.state.players[side.playerId] : undefined;
  if (!player || player.wallet.gold < cost) reject('insufficient_resources', `Surrender costs ${cost} Gold`);
  player.wallet = { ...player.wallet, gold: player.wallet.gold - cost };
  tx.emit({ kind: 'ResourcesSpent', playerId: player.id, amount: { gold: cost, wood: 0, stone: 0, crystal: 0, favor: 0 }, reason: 'Surrender' });
  const winnerPlayer = opponent.playerId ? tx.state.players[opponent.playerId] : undefined;
  if (winnerPlayer) winnerPlayer.wallet = { ...winnerPlayer.wallet, gold: winnerPlayer.wallet.gold + cost };
  side.surrendered = true;
  resolveBattle(tx, battle, opposing(active.side), 'surrender');
}

// ---------------------------------------------------------------------------
// Read-only previews for UI and AI
// ---------------------------------------------------------------------------

export function previewMelee(catalog: ContentCatalog, state: MatchState, stackId: BattleStackId, targetId: BattleStackId, from: BattleCell): DamagePreview | null {
  const battle = state.battle;
  if (!battle) return null;
  const stack = battle.stacks[stackId];
  const target = battle.stacks[targetId];
  if (!stack || !target) return null;
  const option = meleeOptions(catalog, battle, stack, target).find((o) => cellEquals(o.from, from));
  if (!option) return null;
  return previewStrike(catalog, battle, stack, target, { mode: 'melee', chargeHexes: option.distance });
}

export function previewShot(catalog: ContentCatalog, state: MatchState, stackId: BattleStackId, targetId: BattleStackId): DamagePreview | null {
  const battle = state.battle;
  if (!battle) return null;
  const stack = battle.stacks[stackId];
  const target = battle.stacks[targetId];
  if (!stack || !target) return null;
  return previewStrike(catalog, battle, stack, target, { mode: 'shot', chargeHexes: 0 });
}

export function previewRetaliation(catalog: ContentCatalog, state: MatchState, stackId: BattleStackId, targetId: BattleStackId): DamagePreview | null {
  const battle = state.battle;
  if (!battle) return null;
  const stack = battle.stacks[stackId];
  const target = battle.stacks[targetId];
  if (!stack || !target || !canRetaliate(catalog, target)) return null;
  return previewStrike(catalog, battle, target, stack, { mode: 'retaliation', chargeHexes: 0 });
}

/** Preview of a blow at the enemy siege engine (read-only; the same pipeline as the commit). */
export function previewEngineAttack(catalog: ContentCatalog, state: MatchState, stackId: BattleStackId, mode: 'melee' | 'shot', from?: BattleCell | null): DamagePreview | null {
  const battle = state.battle;
  if (!battle) return null;
  const stack = battle.stacks[stackId];
  if (!stack) return null;
  const engine = enemyEngine(battle, stack.side);
  if (!engine) return null;
  if (mode === 'shot') return previewEngineStrike(catalog, battle, stack, engine, { mode: 'shot', chargeHexes: 0 });
  if (!from) return null;
  const option = engineMeleeOptions(catalog, battle, stack, reachableAnchors(catalog, battle, stack), (anchor, cells) => reachLineToCells(catalog, battle, stack, anchor, cells)).find((o) => cellEquals(o.from, from));
  if (!option) return null;
  return previewEngineStrike(catalog, battle, stack, engine, { mode: 'melee', chargeHexes: option.distance, reach: !!option.reach });
}
