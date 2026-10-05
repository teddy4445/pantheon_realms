/**
 * BattleActionGenerator + BattleActionValidator + BattleResolver.
 *
 * Human input, auto-combat and the tactical AI all use these exact functions.
 * Every action is validated against the active stack before any mutation.
 */
import type { BattleStackId, PlayerId, SpellId } from '../../ids';
import { cellEquals, cellKey, footprintDistance, type BattleCell } from '../../core/hex';
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
import { applyDamage, previewStrike, rollStrike, type DamagePreview } from './damage';
import { finishActivation, advanceActivation } from './flow';
import { resolveBattle } from './resolution';
import { applyMoatEntry, damageStructure, intactStructures } from './siege';
import { castingPower } from '../../resolvers/effects';

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
  readonly surrenderCost: number;
  readonly castAvailable: boolean;
}

export function sideController(state: MatchState, battle: BattleState, side: BattleSideId): PlayerId | null {
  return battle.sides[side].playerId ?? null;
}

export function commanderMana(state: MatchState, side: BattleSideState): number {
  const heroId = side.commander?.heroId;
  if (heroId && state.heroes[heroId]) return state.heroes[heroId]!.mana;
  return side.scriptedMana;
}

export function legalActions(catalog: ContentCatalog, state: MatchState): BattleLegalActions | null {
  const battle = state.battle;
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
    if (stack.shotsRemaining <= 0) shootBlockedReason = 'No ammunition left';
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
  let structureTargets: string[] = [];
  let structureBlockedReason: string | null = null;
  if (battle.siege && stack.side === 'attacker' && findAbility(catalog, stack.creatureId, 'wall_breaker')) {
    const intact = intactStructures(battle).map((s) => s.id).sort();
    if (intact.length === 0) structureBlockedReason = 'No intact structures remain';
    else if (stack.shotsRemaining <= 0) structureBlockedReason = 'No ammunition left';
    else if (isAdjacentToEnemy(catalog, battle, stack)) structureBlockedReason = 'Engaged by an adjacent enemy';
    else structureTargets = intact;
  }
  const spells = spellOptions(catalog, state, battle, stack.side);
  const opponent = battle.sides[opposing(stack.side)];
  const surrenderCost = surrenderPrice(catalog, battle, stack.side);
  const townDefender = battle.encounter.kind === 'town_siege' && stack.side === 'defender';
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
    canRetreat: side.commander?.heroId != null && !townDefender,
    canSurrender: canSurrenderTo(battle, stack.side) && !townDefender,
    surrenderCost,
    castAvailable: !side.castThisRound && !!side.commander?.spellbook,
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
    if (!spell || spell.context !== 'battle') continue;
    const targets =
      spell.target === 'enemy_stack' || spell.target === 'enemy_army'
        ? sideStacks(battle, opposing(sideId)).map((s) => s.id)
        : sideStacks(battle, sideId).map((s) => s.id);
    let reason: string | null = null;
    if (side.castThisRound) reason = 'Already cast a spell this round';
    else if (mana < spell.manaCost) reason = `Requires ${spell.manaCost} mana`;
    out.push({ spellId, name: spell.name, manaCost: spell.manaCost, targets, castable: reason === null, reason });
  }
  return out;
}

/** Surrender needs a hero on both sides; the town defender in a siege can neither retreat nor surrender. */
function canSurrenderTo(battle: BattleState, sideId: BattleSideId): boolean {
  const kind = battle.encounter.kind;
  if (kind !== 'hero' && kind !== 'town_siege') return false;
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

function strike(tx: Tx, battle: BattleState, attacker: BattleStackState, target: BattleStackState, mode: 'melee' | 'shot' | 'retaliation', chargeHexes: number): void {
  const { damage, luck } = rollStrike(tx.catalog, battle, attacker, target, { mode, chargeHexes }, tx.rng('combat'));
  const killed = applyDamage(tx, battle, target, damage);
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
}

function moveStack(tx: Tx, battle: BattleState, stack: BattleStackState, to: BattleCell): number {
  if (cellEquals(stack.anchor, to)) return 0;
  const reach = reachableAnchors(tx.catalog, battle, stack);
  const node = reach.get(cellKey(to));
  if (!node) reject('illegal_move', 'That hex is out of reach');
  const flying = !!findAbility(tx.catalog, stack.creatureId, 'flight');
  const path = routeTo(stack, reach, to);
  const before = stackCells(tx.catalog, stack);
  stack.anchor = to;
  tx.emit({ kind: 'BattleStackMoved', stackId: stack.id, path, flying });
  applyMoatEntry(tx, battle, stack, before);
  return node.dist;
}

export function commitBattleMove(tx: Tx, stackId: BattleStackId, to: BattleCell): void {
  const { battle, stack } = requireActive(tx, stackId);
  if (cellEquals(stack.anchor, to)) reject('illegal_move', 'Choose a different hex');
  moveStack(tx, battle, stack, to);
  finishActivation(tx, battle, stack, true);
}

export function commitBattleMelee(tx: Tx, stackId: BattleStackId, targetId: BattleStackId, from: BattleCell): void {
  const { battle, stack } = requireActive(tx, stackId);
  const target = battle.stacks[targetId];
  if (!target || !isAlive(target) || target.side === stack.side) reject('illegal_target', 'Choose a living enemy stack');
  const options = meleeOptions(tx.catalog, battle, stack, target);
  const option = options.find((o) => cellEquals(o.from, from));
  if (!option) reject('illegal_target', 'Cannot reach that enemy from there');
  const hexes = moveStack(tx, battle, stack, from);
  if (footprintDistance(stackCells(tx.catalog, stack), stackCells(tx.catalog, target)) !== 1) {
    reject('illegal_target', 'Not adjacent after moving');
  }
  strike(tx, battle, stack, target, 'melee', hexes);
  if (isAlive(target) && canRetaliate(tx.catalog, target) && isAlive(stack)) {
    target.retaliationsUsed += 1;
    strike(tx, battle, target, stack, 'retaliation', 0);
  }
  finishActivation(tx, battle, stack, true);
}

export function commitBattleShoot(tx: Tx, stackId: BattleStackId, targetId: BattleStackId): void {
  const { battle, stack } = requireActive(tx, stackId);
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

export function commitBattleAttackStructure(tx: Tx, stackId: BattleStackId, structureId: string): void {
  const { battle, stack } = requireActive(tx, stackId);
  const siege = battle.siege;
  if (!siege || siege.level === 0) reject('illegal_action', 'There are no fortifications in this battle');
  if (stack.side !== 'attacker') reject('illegal_action', 'Only the besieging army batters the walls');
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
  const def = tx.catalog.abilities[abilityId];
  if (!def || !(tx.catalog.creatures[stack.creatureId]?.abilityIds ?? []).includes(abilityId)) reject('illegal_action', 'This creature has no such ability');
  if (def.rule.type === 'shapeshift') return commitShapeshift(tx, battle, stack, def.rule, targetId);
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

export function applyStatus(stack: BattleStackState, status: BattleStackState['statuses'][number]): void {
  const existing = stack.statuses.findIndex((s) => s.sourceId === status.sourceId);
  if (existing >= 0) {
    const old = stack.statuses[existing]!;
    stack.statuses[existing] = {
      ...status,
      amount: Math.max(old.amount, status.amount),
      expiresAtRound: Math.max(old.expiresAtRound, status.expiresAtRound),
    };
  } else {
    stack.statuses.push(status);
  }
}

export function commitBattleCast(tx: Tx, spellId: SpellId, targetId: BattleStackId): void {
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
  const mana = commanderMana(tx.state, side);
  if (mana < spell.manaCost) reject('insufficient_resources', `Requires ${spell.manaCost} mana`);
  const target = battle.stacks[targetId];
  if (!target || !isAlive(target)) reject('illegal_target', 'Choose a living stack');
  const wantEnemy = spell.target === 'enemy_stack' || spell.target === 'enemy_army';
  if ((target.side !== active.side) !== wantEnemy) reject('illegal_target', wantEnemy ? 'Target an enemy stack' : 'Target a friendly stack');
  if (spell.target === 'known_tile' || spell.target === 'self') reject('illegal_action', 'Not a battle spell');
  // Pay mana, then resolve.
  const heroId = commander.heroId;
  if (heroId && tx.state.heroes[heroId]) tx.state.heroes[heroId]!.mana -= spell.manaCost;
  else side.scriptedMana -= spell.manaCost;
  side.castThisRound = true;
  const { damage, healed } = resolveSpell(tx, battle, spell, castingPower(side, spell.id), target, active.side);
  tx.emit({ kind: 'BattleSpellCast', side: active.side, spellId, targetId, damage, healed });
  // Casting does not consume the stack's action, but a kill may end the battle.
  battleEnded(tx, battle);
}

export function battleEnded(tx: Tx, battle: BattleState): boolean {
  const a = sideStacks(battle, 'attacker').length > 0;
  const d = sideStacks(battle, 'defender').length > 0;
  if (a && d) return false;
  resolveBattle(tx, battle, a ? 'attacker' : 'defender', a ? 'victory' : 'defeat');
  return true;
}

function resolveSpell(tx: Tx, battle: BattleState, spell: SpellDefinition, power: number, target: BattleStackState, sideId: BattleSideId): { damage: number; healed: number } {
  const e = spell.effect;
  const source = `spell:${spell.id}`;
  const bonusPct = battle.sides[sideId].effects?.spellDamagePercent ?? 0;
  const boosted = (n: number) => Math.floor((n * (100 + bonusPct)) / 100);
  switch (e.type) {
    case 'direct_damage': {
      const damage = boosted(e.base + e.perPower * power);
      applyDamage(tx, battle, target, damage);
      return { damage, healed: 0 };
    }
    case 'area_damage': {
      const damage = boosted(e.base + e.perPower * power);
      const victims = [target, ...adjacentEnemies(tx.catalog, battle, target)];
      for (const v of victims) if (isAlive(v)) applyDamage(tx, battle, v, damage);
      return { damage: damage * victims.length, healed: 0 };
    }
    case 'heal_front': {
      const hp = statsOf(tx.catalog, target.creatureId).hp;
      const missing = hp - frontHp(tx.catalog, target);
      const healed = Math.max(0, Math.min(missing, e.base + e.perPower * power));
      target.totalHp += healed;
      return { damage: 0, healed };
    }
    case 'max_damage_roll':
      applyStatus(target, { sourceId: source, label: spell.name, kind: 'max_damage_roll', amount: 0, numerator: 1, denominator: 1, expiresAtRound: battle.round + e.durationRounds });
      return { damage: 0, healed: 0 };
    case 'defense_bonus':
      applyStatus(target, { sourceId: source, label: spell.name, kind: 'defense_bonus', amount: e.amount, numerator: 1, denominator: 1, expiresAtRound: battle.round + e.durationRounds });
      return { damage: 0, healed: 0 };
    case 'attack_bonus':
      applyStatus(target, { sourceId: source, label: spell.name, kind: 'attack_bonus', amount: e.amount, numerator: 1, denominator: 1, expiresAtRound: battle.round + e.durationRounds });
      return { damage: 0, healed: 0 };
    case 'speed_bonus':
      applyStatus(target, { sourceId: source, label: spell.name, kind: 'speed_bonus', amount: e.amount, numerator: 1, denominator: 1, expiresAtRound: battle.round + e.durationRounds });
      return { damage: 0, healed: 0 };
    case 'mass_bonus': {
      const kind = e.stat === 'attack' ? 'attack_bonus' : e.stat === 'defense' ? 'defense_bonus' : 'speed_bonus';
      const side = spell.target === 'enemy_army' ? opposing(sideId) : sideId;
      for (const s of sideStacks(battle, side)) applyStatus(s, { sourceId: source, label: spell.name, kind, amount: e.amount, numerator: 1, denominator: 1, expiresAtRound: battle.round + e.durationRounds });
      return { damage: 0, healed: 0 };
    }
    case 'ranged_mitigation':
      applyStatus(target, { sourceId: source, label: spell.name, kind: 'ranged_mitigation', amount: 0, numerator: e.numerator, denominator: e.denominator, expiresAtRound: battle.round + e.durationRounds });
      return { damage: 0, healed: 0 };
    case 'melee_mitigation':
      applyStatus(target, { sourceId: source, label: spell.name, kind: 'melee_mitigation', amount: 0, numerator: e.numerator, denominator: e.denominator, expiresAtRound: battle.round + e.durationRounds });
      return { damage: 0, healed: 0 };
    case 'min_damage_roll':
      applyStatus(target, { sourceId: source, label: spell.name, kind: 'min_damage_roll', amount: 0, numerator: 1, denominator: 1, expiresAtRound: battle.round + e.durationRounds });
      return { damage: 0, healed: 0 };
    case 'mass_heal': {
      let healed = 0;
      for (const s of sideStacks(battle, sideId)) {
        const hp = statsOf(tx.catalog, s.creatureId).hp;
        const h = Math.max(0, Math.min(hp - frontHp(tx.catalog, s), e.base + e.perPower * power));
        s.totalHp += h;
        healed += h;
      }
      return { damage: 0, healed };
    }
    case 'mass_damage': {
      const damage = boosted(e.base + e.perPower * power);
      const victims = sideStacks(battle, opposing(sideId));
      for (const v of victims) if (isAlive(v)) applyDamage(tx, battle, v, damage);
      return { damage: damage * victims.length, healed: 0 };
    }
    case 'reveal_radius':
    case 'movement_bonus':
    case 'recall':
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
  if (!side.commander?.heroId) reject('illegal_action', 'Only a hero-led army can retreat');
  if (battle.encounter.kind === 'town_siege' && active.side === 'defender') reject('illegal_action', 'A town defender cannot retreat');
  side.retreated = true;
  resolveBattle(tx, battle, opposing(active.side), 'retreat');
}

export function commitBattleSurrender(tx: Tx): void {
  const battle = requireBattle(tx.state);
  const active = battle.activeStackId ? battle.stacks[battle.activeStackId] : undefined;
  if (!active) reject('illegal_action', 'Surrender is chosen on a friendly activation');
  requireControl(tx, battle, active.side);
  const opponent = battle.sides[opposing(active.side)];
  if (battle.encounter.kind === 'town_siege' && active.side === 'defender') reject('illegal_action', 'A town defender cannot surrender');
  if (!canSurrenderTo(battle, active.side) || !opponent.commander?.heroId) reject('illegal_action', 'Surrender is only possible against an enemy hero');
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
