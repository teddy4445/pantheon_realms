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
import { cellDistance } from '../../core/hex';
import type { RngCursor } from '../../core/rng';
import type { ContentCatalog } from '../../definitions/catalog';
import type { BattleStackState, BattleState } from '../../state/match';
import { skillValue } from '../../resolvers/heroes';
import {
  aliveCount,
  effectiveAttack,
  effectiveDefense,
  effectiveLuck,
  findAbility,
  isShooter,
  killsFrom,
  stackCells,
  statsOf,
} from './common';
import { wallPenaltyApplies } from './siege';

export { applyDamage, killsFrom } from './common';

export type StrikeMode = 'melee' | 'shot' | 'retaliation';

export interface StrikeContext {
  readonly mode: StrikeMode;
  /** Traversed hexes on the approach (melee only). */
  readonly chargeHexes: number;
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

export function strikeFactors(
  catalog: ContentCatalog,
  battle: BattleState,
  attacker: BattleStackState,
  target: BattleStackState,
  ctx: StrikeContext,
): StrikeFactors {
  const combat = catalog.rulesProfile.combat;
  const aStats = statsOf(catalog, attacker.creatureId);
  const count = aliveCount(catalog, attacker);
  const notes: string[] = [];
  const atk = effectiveAttack(catalog, battle, attacker);
  let def = effectiveDefense(catalog, battle, target);
  if (target.defending) {
    def = Math.ceil((def * combat.defendMultiplier.numerator) / combat.defendMultiplier.denominator);
    notes.push('Target is defending (+20% Defense)');
  }
  const delta = atk - def;
  const attackBonus = Math.min(combat.attackBonusPerPoint * Math.max(delta, 0), combat.attackBonusCap);
  const defenseReduction = Math.min(combat.defenseReductionPerPoint * Math.max(-delta, 0), combat.defenseReductionCap);
  const attackerCommander = battle.sides[attacker.side].commander;
  const targetCommander = battle.sides[target.side].commander;
  const skillPct = attackerCommander
    ? ctx.mode === 'shot'
      ? skillValue(catalog, attackerCommander, 'archery')
      : skillValue(catalog, attackerCommander, 'offense')
    : 0;
  if (skillPct > 0) notes.push(`${ctx.mode === 'shot' ? 'Archery' : 'Offense'} +${skillPct}%`);
  let charge = 0;
  if (ctx.mode === 'melee') {
    const ability = findAbility(catalog, attacker.creatureId, 'charge');
    if (ability && ctx.chargeHexes > 0) {
      if (findAbility(catalog, target.creatureId, 'charge_guard')) {
        notes.push('Charge negated by the target (charge guard)');
      } else {
        charge = Math.min(ability.perHexPercent * ctx.chargeHexes, ability.capPercent) * 10;
        notes.push(`Charge +${charge / 10}% (${ctx.chargeHexes} hexes)`);
      }
    }
  }
  const bracket = 1000 + attackBonus + skillPct * 10 + charge;
  const multipliers: (readonly [number, number])[] = [[1000 - defenseReduction, 1000]];
  const armorerPct = targetCommander ? skillValue(catalog, targetCommander, 'armorer') : 0;
  if (armorerPct > 0) {
    multipliers.push([100 - armorerPct, 100]);
    notes.push(`Target Armorer -${armorerPct}%`);
  }
  if (ctx.mode === 'shot') {
    const dist = Math.min(...stackCells(catalog, attacker).flatMap((a) => stackCells(catalog, target).map((b) => cellDistance(a, b))));
    if (dist > combat.longRangeDistance) {
      multipliers.push([combat.longRangeFactor.numerator, combat.longRangeFactor.denominator]);
      notes.push('Long range (x0.5)');
    }
    if (wallPenaltyApplies(catalog, battle, attacker, target)) {
      multipliers.push([combat.wallFactor.numerator, combat.wallFactor.denominator]);
      notes.push(`Behind the walls (x${combat.wallFactor.numerator}/${combat.wallFactor.denominator})`);
    }
    for (const s of target.statuses) {
      if (s.kind === 'ranged_mitigation') {
        multipliers.push([s.numerator, s.denominator]);
        notes.push(`${s.label} (x${s.numerator}/${s.denominator} vs shots)`);
      }
    }
  } else if (isShooter(catalog, attacker.creatureId) && !findAbility(catalog, attacker.creatureId, 'no_melee_penalty')) {
    multipliers.push([combat.meleePenaltyFactor.numerator, combat.meleePenaltyFactor.denominator]);
    notes.push('Shooter in melee (x0.5)');
  }
  const luck = effectiveLuck(catalog, battle, attacker);
  const guaranteedMax = attacker.statuses.some((s) => s.kind === 'max_damage_roll');
  return {
    attackerCount: count,
    bMin: guaranteedMax ? count * aStats.damageMax : count * aStats.damageMin,
    bMax: count * aStats.damageMax,
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
  const min = damageFor(f, f.bMin, false);
  const max = damageFor(f, f.bMax, false);
  const luckMax = f.luckChance ? damageFor(f, f.bMax, true) : null;
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
  const f = strikeFactors(catalog, battle, attacker, target, ctx);
  const luck = f.luckChance ? rng.chance(f.luckChance.numerator, f.luckChance.denominator) : false;
  const b = f.guaranteedMax ? f.bMax : rng.nextRange(f.bMin, f.bMax);
  return { damage: damageFor(f, b, luck), luck };
}

