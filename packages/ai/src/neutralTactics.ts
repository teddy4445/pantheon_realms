/**
 * The tactical AI's use of the six neutral creatures' active abilities
 * (campaign expansion handoff, 2026-10-15): Sheltering Wings, Distract, Devour
 * Dread, Reed Guard and Tail Snare (Long Reach is a passive attack option the
 * melee choices already include).
 *
 * Simple, documented scoring in the same unit as the planner's attacks (the
 * value of the hit points won or saved, by unit price): an ability is offered
 * only to a target the rules list as legal (`legalActions().abilities`, no
 * reason) and only when it plainly helps — a ward on an ally an enemy can still
 * strike before this stack acts again, a distraction on an enemy an ally is
 * about to attack, a cleanse of a real debuff, a pull that silences an enemy
 * shooter. Expected values from the shared damage preview; no RNG is drawn and
 * ties break by stable keys, so the choice is deterministic.
 */
import {
  aliveCount,
  canRetaliate,
  cleansableStatus,
  effectiveSpeed,
  footprintDistance,
  inShootingRange,
  isAdjacentToEnemy,
  isShooter,
  legalActions,
  opposing,
  previewStrike,
  sideStacks,
  stackCells,
  type BattleState,
  type BattleStackState,
  type BattleStatusState,
  type CommandPayload,
  type ContentCatalog,
  type DamagePreview,
} from '@pr/rules';
import { stackValue } from './evaluation';

export interface AbilityChoice {
  readonly score: number;
  readonly key: string;
  readonly payload: CommandPayload;
}

/** How much a ward or guard is believed to matter (the enemy may strike elsewhere). */
const PROTECT_WEIGHT = 0.9;
/** An ally that can reach the distracted enemy may still choose another target. */
const DISTRACT_WEIGHT = 0.6;
/** A silenced shooter may have had a weaker target in mind. */
const SNARE_WEIGHT = 0.8;
/** Removing a debuff: the same weight the planner gives casting one (`spell` debuffs, 0.1 of the stack's value). */
const CLEANSE_WEIGHT = 0.1;

const mean = (p: DamagePreview) => (p.min + p.max) / 2;

function hpPer(catalog: ContentCatalog, s: BattleStackState): number {
  return catalog.creatures[s.creatureId]?.stats?.hp ?? 10;
}

/** The value of `hp` hit points of a stack (its price per creature's worth of health, at most the whole stack). */
function hpValue(catalog: ContentCatalog, s: BattleStackState, hp: number): number {
  return stackValue(catalog, s.creatureId) * Math.min(aliveCount(catalog, s), Math.max(0, hp) / hpPer(catalog, s));
}

/** Stacks still to act in this round (they act before `stack`'s next activation). */
function stillToAct(battle: BattleState): Set<string> {
  return new Set([...battle.normalQueue, ...battle.waitQueue]);
}

/** How `enemy` could strike `ally` soon: a shot when it can shoot it now, else a melee blow when it can reach it. */
function blowOf(catalog: ContentCatalog, battle: BattleState, enemy: BattleStackState, ally: BattleStackState): { mode: 'shot' | 'melee'; charge: number } | null {
  if (isShooter(catalog, enemy.creatureId) && enemy.shotsRemaining > 0 && !isAdjacentToEnemy(catalog, battle, enemy)) {
    return inShootingRange(catalog, enemy, ally, battle) ? { mode: 'shot', charge: 0 } : null;
  }
  const gap = footprintDistance(stackCells(catalog, enemy), stackCells(catalog, ally));
  return gap - 1 <= effectiveSpeed(catalog, enemy, battle) ? { mode: 'melee', charge: Math.max(0, gap - 1) } : null;
}

/** The enemies that act before `user` acts again: those still to act this round, and the faster ones next round. */
function actingBefore(catalog: ContentCatalog, battle: BattleState, user: BattleStackState): BattleStackState[] {
  const queued = stillToAct(battle);
  const speed = effectiveSpeed(catalog, user, battle);
  return sideStacks(battle, opposing(user.side)).filter((e) => queued.has(e.id) || effectiveSpeed(catalog, e, battle) > speed);
}

/**
 * Hit points of `ally` saved by `extra` (a status it would gain) against the worst
 * blow one of `enemies` can deal it soon, by the shared damage preview.
 */
function savedBy(catalog: ContentCatalog, battle: BattleState, ally: BattleStackState, enemies: readonly BattleStackState[], extra: BattleStatusState): number {
  const guarded: BattleStackState = { ...ally, statuses: [...ally.statuses, extra] };
  let best = 0;
  for (const e of enemies) {
    const b = blowOf(catalog, battle, e, ally);
    if (!b) continue;
    const ctx = { mode: b.mode, chargeHexes: b.charge } as const;
    best = Math.max(best, mean(previewStrike(catalog, battle, e, ally, ctx)) - mean(previewStrike(catalog, battle, e, guarded, ctx)));
  }
  return best;
}

const status = (kind: BattleStatusState['kind'], amount: number, sourceId: string): BattleStatusState => ({ sourceId, label: 'AI estimate', kind, amount, numerator: 1, denominator: 1, expiresAtRound: Number.MAX_SAFE_INTEGER });

/**
 * Scored neutral-ability orders for the active stack (empty for creatures without
 * one, or when none plainly helps). Every order names a target the rules list
 * as legal for that ability right now.
 */
export function neutralAbilityChoices(catalog: ContentCatalog, battle: BattleState, stack: BattleStackState, actions: NonNullable<ReturnType<typeof legalActions>>): AbilityChoice[] {
  const out: AbilityChoice[] = [];
  const push = (abilityId: string, targetId: string, score: number) => {
    if (score > 0) out.push({ score, key: `ability:${abilityId}:${targetId}`, payload: { kind: 'BattleUseAbility', stackId: stack.id, abilityId, targetId } });
  };
  for (const ab of actions.abilities) {
    if (ab.reason || ab.targets.length === 0) continue;
    const rule = catalog.abilities[ab.abilityId]?.rule;
    if (!rule) continue;
    switch (rule.type) {
      case 'sheltering_wings': {
        const enemies = actingBefore(catalog, battle, stack);
        for (const tid of ab.targets) {
          const ally = battle.stacks[tid]!;
          if (ally.statuses.some((s) => s.kind === 'damage_ward')) continue;
          push(ab.abilityId, tid, hpValue(catalog, ally, savedBy(catalog, battle, ally, enemies, status('damage_ward', rule.reductionPercent, 'ai:ward'))) * PROTECT_WEIGHT);
        }
        break;
      }
      case 'reed_guard': {
        const enemies = actingBefore(catalog, battle, stack);
        for (const tid of ab.targets) {
          const ally = battle.stacks[tid]!;
          if (ally.statuses.some((s) => s.sourceId === `ability:${rule.type}`)) continue;
          push(ab.abilityId, tid, hpValue(catalog, ally, savedBy(catalog, battle, ally, enemies, status('defense_bonus', rule.defenseBonus, 'ai:guard'))) * PROTECT_WEIGHT);
        }
        break;
      }
      case 'distract': {
        // Allies still to act this round may attack the target before this stack's next turn ends the distraction.
        const queued = stillToAct(battle);
        const allies = sideStacks(battle, stack.side).filter((a) => a.id !== stack.id && queued.has(a.id) && !(isShooter(catalog, a.creatureId) && a.shotsRemaining > 0 && !isAdjacentToEnemy(catalog, battle, a)));
        for (const tid of ab.targets) {
          const foe = battle.stacks[tid]!;
          if (!canRetaliate(catalog, foe) || foe.statuses.some((s) => s.kind === 'retaliation_suppressed')) continue;
          let best = 0;
          for (const a of allies) {
            if (!blowOf(catalog, battle, a, foe)) continue;
            best = Math.max(best, hpValue(catalog, a, mean(previewStrike(catalog, battle, foe, a, { mode: 'retaliation', chargeHexes: 0 }))));
          }
          push(ab.abilityId, tid, best * DISTRACT_WEIGHT);
        }
        break;
      }
      case 'devour_dread': {
        for (const tid of ab.targets) {
          const ally = battle.stacks[tid]!;
          if (!cleansableStatus(ally)) continue;
          push(ab.abilityId, tid, stackValue(catalog, ally.creatureId) * aliveCount(catalog, ally) * CLEANSE_WEIGHT);
        }
        break;
      }
      case 'tail_snare': {
        // Pulled next to this stack, an enemy shooter is engaged and cannot shoot.
        const mine = sideStacks(battle, stack.side);
        for (const tid of ab.targets) {
          const foe = battle.stacks[tid]!;
          if (!isShooter(catalog, foe.creatureId) || foe.shotsRemaining <= 0 || isAdjacentToEnemy(catalog, battle, foe)) continue;
          let best = 0;
          for (const s of mine) {
            if (!inShootingRange(catalog, foe, s, battle)) continue;
            best = Math.max(best, hpValue(catalog, s, mean(previewStrike(catalog, battle, foe, s, { mode: 'shot', chargeHexes: 0 }))));
          }
          push(ab.abilityId, tid, best * SNARE_WEIGHT);
        }
        break;
      }
      default:
        break;
    }
  }
  // Combine independently scored legal targets for the upgraded dragons.
  for(const ab of actions.abilities){
    if((ab.maxTargets??1)<=1 && !ab.allTargets) continue;
    const choices=out.filter(c=>c.payload.kind==='BattleUseAbility' && c.payload.abilityId===ab.abilityId).sort((a,b)=>b.score-a.score||a.key.localeCompare(b.key));
    const picked=choices.slice(0,ab.allTargets?choices.length:ab.maxTargets);
    const first=picked[0];
    if(!first || first.payload.kind!=='BattleUseAbility' || picked.length<2) continue;
    const additional=picked.slice(1).flatMap(c=>c.payload.kind==='BattleUseAbility'?[c.payload.targetId]:[]);
    out.push({score:picked.reduce((sum,c)=>sum+c.score,0),key:first.key+':group',payload:{...first.payload,...(!ab.allTargets?{additionalTargetIds:additional}:{})}});
  }
  return out;
}
