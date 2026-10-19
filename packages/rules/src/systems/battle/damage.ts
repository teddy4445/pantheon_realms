/**
 * DamageResolver: the one physical damage pipeline (design/04 §3).
 *
 *   raw = B * (1 + attackBonus + skillBonus + luckBonus + chargeBonus)
 *           * (1 - defenseReduction) * armorer * range * wall * meleePenalty * mitigation
 *   damage = max(1, floor(raw))
 *
 * All factors are exact integers/rationals evaluated with BigInt, then floored once.
 * Preview evaluates the same pipeline at the B endpoints and never draws RNG.
 */
import type { RngCursor } from '../../core/rng';
import type { ContentCatalog } from '../../definitions/catalog';
import type { BattleSideId, BattleStackState, BattleState, BattleStatusState, SiegeEngineState } from '../../state/match';
import { footprintDistance, type BattleCell } from '../../core/hex';
import { skillValue } from '../../resolvers/heroes';
import {
  aliveCount,
  effectiveAttack,
  effectiveDefense,
  effectiveLuck,
  findAbility,
  isShooter,
  shootingRange,
  killsFrom,
  stackCells,
  statsOf,
} from './common';
import { wallPenaltyApplies } from './siege';
import { previewWarded, reachFactor } from './neutralAbilities';
import { libraryEffects, originalUse, previewArmyBarrier, previewLastCreatureGuard } from './libraryRelics';
import { originalStackKey } from './libraryUtility';
import { previewEngineDamage } from './engine';
import { fieldRangedModifier } from './libraryFields';

export { applyDamage, killsFrom } from './common';

export type StrikeMode = 'melee' | 'shot' | 'retaliation';

export interface StrikeContext {
  readonly mode: StrikeMode;
  /** Traversed hexes on the approach (melee only). */
  readonly chargeHexes: number;
  /** A Long Reach strike from two hexes away (its damage factor applies). */
  readonly reach?: boolean;
}

export interface StrikeFactors {
  readonly attackerCount: number;
  readonly bMin: number;
  readonly bMax: number;
  readonly guaranteedMax: boolean;
  /** Additive bracket without luck, per mille (1000 = +0%). */
  readonly bracket: number;
  readonly luckBonus: number;
  readonly luckChance: { numerator: number; denominator: number } | null;
  /** Multiplicative factors as [numerator, denominator]. */
  readonly multipliers: readonly (readonly [number, number])[];
  readonly notes: readonly string[];
  readonly effectiveAttack: number;
  readonly effectiveDefense: number;
}

/**
 * What a strike meets: a creature stack, or the siege engine (`targetableCatapultV1`), which is hit
 * with the same pipeline against its own Defense (no commander, statuses, Defend or Armorer).
 */
export interface StrikeTarget {
  readonly creature?: boolean;
  readonly stackId?: string;
  readonly originalKey?: string;
  readonly borrowedDefense?: number;
  readonly side: BattleSideId;
  readonly cells: readonly BattleCell[];
  /** Defense before the Defend multiplier. */
  readonly defense: number;
  readonly defending: boolean;
  readonly statuses: readonly BattleStatusState[];
  /** The target side commander's Armorer percent (0 for the engine). */
  readonly armorerPct: number;
  readonly chargeGuard: boolean;
  /** An attacking shooter outside the walls fires across an intact wall section at it. */
  readonly wallPenalty: boolean;
}

/** A creature stack as a strike target (the values the pipeline always read from it). */
export function stackStrikeTarget(catalog: ContentCatalog, battle: BattleState, attacker: BattleStackState, target: BattleStackState): StrikeTarget {
  const targetCommander = battle.sides[target.side].commander;
  return {
    side: target.side,
    creature: true,
    stackId: target.id,
    originalKey: originalStackKey(target),
    borrowedDefense: Math.max(0, targetCommander?.defenseWithoutArtifacts ?? 0) + target.statuses.filter((s) => s.sourceId.startsWith('spell:') && s.kind === 'defense_bonus' && s.amount > 0).reduce((n, s) => n + s.amount, 0),
    cells: stackCells(catalog, target),
    defense: effectiveDefense(catalog, battle, target),
    defending: target.defending,
    statuses: target.statuses,
    armorerPct: targetCommander ? skillValue(catalog, targetCommander, 'armorer') : 0,
    chargeGuard: !!findAbility(catalog, target.creatureId, 'charge_guard'),
    wallPenalty: wallPenaltyApplies(catalog, battle, attacker, target),
  };
}

/** The siege engine as a strike target: its Defense, its cells; nothing else modifies a blow at it. */
export function engineStrikeTarget(engine: SiegeEngineState): StrikeTarget {
  return { side: engine.side, cells: engine.cells, defense: engine.defense, defending: false, statuses: [], armorerPct: 0, chargeGuard: false, wallPenalty: false };
}

export function strikeFactors(
  catalog: ContentCatalog,
  battle: BattleState,
  attacker: BattleStackState,
  target: BattleStackState,
  ctx: StrikeContext,
): StrikeFactors {
  return strikeFactorsVs(catalog, battle, attacker, stackStrikeTarget(catalog, battle, attacker, target), ctx);
}

/** The damage pipeline against any strike target (stacks and the siege engine alike). */
export function strikeFactorsVs(
  catalog: ContentCatalog,
  battle: BattleState,
  attacker: BattleStackState,
  target: StrikeTarget,
  ctx: StrikeContext,
): StrikeFactors {
  const combat = catalog.rulesProfile.combat;
  const aStats = statsOf(catalog, attacker.creatureId);
  const count = attacker.summoned?.kind === 'illusion' ? attacker.summoned.sourceCount : aliveCount(catalog, attacker);
  const notes: string[] = [];
  const atk = effectiveAttack(catalog, battle, attacker);
  let def = target.defense;
  if (ctx.mode === 'melee' && target.creature) {
    const pierce = Math.min(target.borrowedDefense ?? 0, Math.max(0, ...attacker.statuses.filter((s) => s.kind === 'pierce_borrowed_defense').map((s) => s.amount)));
    if (pierce) { def = Math.max(0, def - pierce); notes.push(`Ignores ${pierce} borrowed Defense`); }
  }
  if (target.defending) {
    def = Math.ceil((def * combat.defendMultiplier.numerator) / combat.defendMultiplier.denominator);
    notes.push('Target is defending (+20% Defense)');
  }
  const delta = atk - def;
  const attackBonus = Math.min(combat.attackBonusPerPoint * Math.max(delta, 0), combat.attackBonusCap);
  const defenseReduction = Math.min(combat.defenseReductionPerPoint * Math.max(-delta, 0), combat.defenseReductionCap);
  const attackerCommander = battle.sides[attacker.side].commander;
  const skillPct = attackerCommander
    ? ctx.mode === 'shot'
      ? skillValue(catalog, attackerCommander, 'archery')
      : skillValue(catalog, attackerCommander, 'offense')
    : 0;
  if (skillPct > 0) notes.push(`${ctx.mode === 'shot' ? 'Archery' : 'Offense'} +${skillPct}%`);
  let charge = 0;
  if (ctx.mode === 'melee' && !attacker.summoned) {
    const ability = findAbility(catalog, attacker.creatureId, 'charge');
    if (ability && ctx.chargeHexes > 0) {
      if (target.chargeGuard) {
        notes.push('Charge negated by the target (charge guard)');
      } else {
        charge = Math.min(ability.perHexPercent * ctx.chargeHexes, ability.capPercent) * 10;
        notes.push(`Charge +${charge / 10}% (${ctx.chargeHexes} hexes)`);
      }
    }
  }
  const bracket = 1000 + attackBonus + skillPct * 10 + charge;
  const multipliers: (readonly [number, number])[] = [[1000 - defenseReduction, 1000]];
  const largeBonus = ctx.mode === 'shot' && target.cells.length === 2 && target.creature ? Math.max(0, ...libraryEffects(battle, attacker.side, 'library_large_target_damage').map((e) => e.percent)) : 0;
  const retaliationBonus = ctx.mode === 'retaliation' && !isShooter(catalog, attacker.creatureId) && !originalUse(battle, attacker, 'retaliation') ? Math.max(0, ...libraryEffects(battle, attacker.side, 'library_first_retaliation').map((e) => e.percent)) : 0;
  const blessingBonus = ctx.mode === 'retaliation' ? Math.max(0, ...attacker.statuses.filter((s) => s.kind === 'retaliation_bonus' && (s.charges ?? 0) > 0).map((s) => s.amount)) : 0;
  const markedBonus = target.stackId && target.stackId === battle.sides[attacker.side].markedUndeadId ? Math.max(0, ...libraryEffects(battle, attacker.side, 'library_undead_mark').map((e) => e.percent)) : 0;
  const relicBonus = attacker.summoned ? 0 : Math.min(30, largeBonus + retaliationBonus + blessingBonus + markedBonus);
  if (relicBonus) { multipliers.push([100 + relicBonus, 100]); notes.push(`Relic damage +${relicBonus}%`); }
  if (ctx.mode === 'retaliation') {
    const weaken = Math.max(0, ...attacker.statuses.filter((s) => s.kind === 'retaliation_weaken' && (s.charges ?? 0) > 0).map((s) => s.amount));
    if (weaken) { multipliers.push([100 - weaken, 100]); notes.push(`Retaliation weakened by ${weaken}%`); }
  }
  if (attacker.summoned?.kind === 'illusion') { multipliers.push([1, 4]); notes.push('Illusion: one HP, 25% physical damage, no retaliation or ability'); }
  const armorerPct = target.armorerPct;
  if (armorerPct > 0) {
    multipliers.push([100 - armorerPct, 100]);
    notes.push(`Target Armorer -${armorerPct}%`);
  }
  if (ctx.mode === 'shot') {
    const dist = footprintDistance(stackCells(catalog, attacker), target.cells);
    const range = shootingRange(catalog, attacker.creatureId, battle);
    const trueRange = !attacker.summoned && libraryEffects(battle, attacker.side, 'library_first_shot_range').length > 0 && !originalUse(battle, attacker, 'shot');
    if (trueRange) notes.push('First shot ignores distance penalty');
    if (dist * 2 > range && !trueRange) {
      multipliers.push([combat.longRangeFactor.numerator, combat.longRangeFactor.denominator]);
      notes.push(`Far half of range ${range} (x${combat.longRangeFactor.numerator}/${combat.longRangeFactor.denominator})`);
    }
    if (target.wallPenalty) {
      multipliers.push([combat.wallFactor.numerator, combat.wallFactor.denominator]);
      notes.push(`Behind the walls (x${combat.wallFactor.numerator}/${combat.wallFactor.denominator})`);
    }
    const zoneWard = Math.min(40, fieldRangedModifier(battle, target.side, target.cells, 'sanctuary'));
    const eclipse = fieldRangedModifier(battle, attacker.side, stackCells(catalog, attacker), 'eclipse');
    if (eclipse) { multipliers.push([100 - eclipse, 100]); notes.push(`Obsidian Eclipse: outgoing shots -${eclipse}%`); }
    const firstHit = target.originalKey && !battle.sides[target.side].effectUses?.[`firstRangedHit:${target.originalKey}`]
      ? Math.min(40, Math.max(0, ...libraryEffects(battle, target.side, 'library_first_ranged_resist').map((e) => e.percent))) : 0;
    if (firstHit || zoneWard) {
      let factor: readonly [number, number] = [100 - Math.max(firstHit, zoneWard), 100];
      for (const s of target.statuses) if (s.kind === 'ranged_mitigation' && s.numerator * factor[1] < factor[0] * s.denominator) factor = [s.numerator, s.denominator];
      multipliers.push(factor);
      notes.push(`Missile protection: strongest ward (x${factor[0]}/${factor[1]})`);
    } else for (const s of target.statuses) {
      if (s.kind === 'ranged_mitigation') { multipliers.push([s.numerator, s.denominator]); notes.push(`${s.label} (x${s.numerator}/${s.denominator} vs shots)`); }
    }
  } else if (isShooter(catalog, attacker.creatureId) && !findAbility(catalog, attacker.creatureId, 'no_melee_penalty')) {
    multipliers.push([combat.meleePenaltyFactor.numerator, combat.meleePenaltyFactor.denominator]);
    notes.push('Shooter in melee (x0.5)');
  }
  if (ctx.reach && ctx.mode !== 'shot') {
    const [n, d] = reachFactor(catalog, attacker.creatureId);
    if (n !== d) {
      multipliers.push([n, d]);
      notes.push(`Long Reach (x${n}/${d})`);
    }
  }
  if (target.statuses.some((s) => s.kind === 'damage_ward')) {
    const w = target.statuses.find((s) => s.kind === 'damage_ward')!;
    notes.push(`${w.label}: −${w.amount}% from this blow`);
  }
  if (ctx.mode !== 'shot') {
    for (const s of target.statuses) {
      if (s.kind === 'melee_mitigation') {
        multipliers.push([s.numerator, s.denominator]);
        notes.push(`${s.label} (x${s.numerator}/${s.denominator} vs melee)`);
      }
    }
  }
  const luck = attacker.summoned ? 0 : effectiveLuck(catalog, battle, attacker);
  const blessed = attacker.statuses.some((s) => s.kind === 'max_damage_roll');
  const cursed = attacker.statuses.some((s) => s.kind === 'min_damage_roll');
  // A blessing and a curse cancel out (normal range).
  const guaranteedMax = blessed && !cursed;
  const guaranteedMin = cursed && !blessed;
  if (guaranteedMin) notes.push('Cursed (minimum damage)');
  return {
    attackerCount: count,
    bMin: guaranteedMax ? count * aStats.damageMax : count * aStats.damageMin,
    bMax: guaranteedMin ? count * aStats.damageMin : count * aStats.damageMax,
    guaranteedMax,
    bracket,
    luckBonus: combat.luckBonus,
    luckChance: luck > 0 ? { numerator: luck, denominator: combat.luckDenominator } : null,
    multipliers,
    notes,
    effectiveAttack: atk,
    effectiveDefense: def,
  };
}

export function damageFor(f: StrikeFactors, b: number, luck: boolean): number {
  if (b <= 0 || f.attackerCount <= 0) return 0;
  let num = BigInt(b) * BigInt(f.bracket + (luck ? f.luckBonus : 0));
  let den = 1000n;
  for (const [n, d] of f.multipliers) {
    num *= BigInt(n);
    den *= BigInt(d);
  }
  const floored = Number(num / den);
  return Math.max(1, floored);
}

export interface DamagePreview {
  readonly min: number;
  readonly max: number;
  readonly killsMin: number;
  readonly killsMax: number;
  readonly luckMax: number | null;
  readonly luckChance: { numerator: number; denominator: number } | null;
  readonly notes: readonly string[];
}


export function previewStrike(
  catalog: ContentCatalog,
  battle: BattleState,
  attacker: BattleStackState,
  target: BattleStackState,
  ctx: StrikeContext,
): DamagePreview {
  const f = strikeFactors(catalog, battle, attacker, target, ctx);
  // Sheltering Wings takes its share after the blow is rolled (the reduction rounded down).
  const quote = (raw: number) => target.summoned?.kind === 'illusion' && raw > 0 ? 1 : previewLastCreatureGuard(battle, target, previewArmyBarrier(battle, target.side, previewWarded(target, raw)));
  const min = quote(damageFor(f, f.bMin, false));
  const max = quote(damageFor(f, f.bMax, false));
  const luckMax = f.luckChance ? quote(damageFor(f, f.bMax, true)) : null;
  return {
    min,
    max,
    killsMin: killsFrom(catalog, target, min),
    killsMax: killsFrom(catalog, target, max),
    luckMax,
    luckChance: f.luckChance,
    notes: f.notes,
  };
}

/** Execute one strike with the combat stream. Draw order: luck roll (if luck > 0), then damage roll. */
export function rollStrike(
  catalog: ContentCatalog,
  battle: BattleState,
  attacker: BattleStackState,
  target: BattleStackState,
  ctx: StrikeContext,
  rng: RngCursor,
): { damage: number; luck: boolean } {
  return rollFactors(strikeFactors(catalog, battle, attacker, target, ctx), rng);
}

function rollFactors(f: StrikeFactors, rng: RngCursor): { damage: number; luck: boolean } {
  const luck = f.luckChance ? rng.chance(f.luckChance.numerator, f.luckChance.denominator) : false;
  const b = f.guaranteedMax ? f.bMax : rng.nextRange(f.bMin, f.bMax);
  return { damage: damageFor(f, b, luck), luck };
}

/**
 * A blow at the siege engine (`targetableCatapultV1`): the same pipeline and draw order as a blow
 * at a stack, against the engine's Defense. Its "kills" are 1 when the blow would destroy it.
 */
export function previewEngineStrike(catalog: ContentCatalog, battle: BattleState, attacker: BattleStackState, engine: SiegeEngineState, ctx: StrikeContext): DamagePreview {
  const f = strikeFactorsVs(catalog, battle, attacker, engineStrikeTarget(engine), ctx);
  const min = previewEngineDamage(battle, engine, damageFor(f, f.bMin, false));
  const max = previewEngineDamage(battle, engine, damageFor(f, f.bMax, false));
  const luckMax = f.luckChance ? previewEngineDamage(battle, engine, damageFor(f, f.bMax, true)) : null;
  const destroys = (d: number) => (engine.hp > 0 && d >= engine.hp ? 1 : 0);
  return { min, max, killsMin: destroys(min), killsMax: destroys(max), luckMax, luckChance: f.luckChance, notes: [...f.notes, `Siege engine: Defense ${engine.defense}, ${engine.hp}/${engine.maxHp} HP`] };
}

export function rollEngineStrike(catalog: ContentCatalog, battle: BattleState, attacker: BattleStackState, engine: SiegeEngineState, ctx: StrikeContext, rng: RngCursor): { damage: number; luck: boolean } {
  return rollFactors(strikeFactorsVs(catalog, battle, attacker, engineStrikeTarget(engine), ctx), rng);
}
