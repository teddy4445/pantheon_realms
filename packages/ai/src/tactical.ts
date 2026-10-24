/**
 * TacticalPlanner: chooses one legal battle action for the active stack.
 *
 * Uses the shared legal-action generator and the same DamageResolver preview as
 * the UI (expected values only; the planner never draws from gameplay RNG).
 * Deterministic: ties break by stable action keys.
 */
import {
  aliveCount,
  canRetaliate,
  activeRelics,
  quoteActiveRelic,
  relicDispelChoices,
  spatialSpellOptions,
  fieldSpellProblem,
  fieldCells,
  fieldVictims,
  illusionDestinations,
  dispellableStatuses,
  castingPower,
  cellDistance,
  cellKey,
  effectiveSpeed,
  legalActions,
  opposing,
  previewStrike,
  sideStacks,
  stackCells,
  footprintDistance,
  autoDefenderPicks,
  cellNeighbors,
  hasFlight,
  inShootingRange,
  isShooter,
  shootingRange,
  SIEGE_GATE_ROW,
  catapultTarget,
  catapultStatus,
  catapultTargets,
  previewEngineStrike,
  turretTarget,
  turretTargetValue,
  adjacentEnemies,
  cellLegalFor,
  movementClassOf,
  previewHarpoon,
  interventionsFor,
  interventionUsedThisWeek,
  quoteIntervention,
  type BattleCell,
  type BattleState,
  type BattleStackState,
  type CommandPayload,
  type ContentCatalog,
  type MatchState,
} from '@pr/rules';
import { stackValue } from './evaluation';
import { neutralAbilityChoices } from './neutralTactics';
import { favorSpare } from './services';

interface Scored {
  readonly score: number;
  readonly key: string;
  readonly payload: CommandPayload;
}

function best(options: Scored[]): CommandPayload | null {
  if (options.length === 0) return null;
  options.sort((a, b) => b.score - a.score || (a.key < b.key ? -1 : 1));
  return options[0]!.payload;
}

function avg(a: number, b: number) {
  return (a + b) / 2;
}

/** Value of killing `kills` creatures of a stack (weighted by unit price). */
function killValue(catalog: ContentCatalog, target: BattleStackState, dmg: number, kills: number): number {
  const hp = catalog.creatures[target.creatureId]?.stats?.hp ?? 10;
  return stackValue(catalog, target.creatureId) * (kills + Math.min(1, (dmg % hp) / hp) * 0.3);
}

/** Scored main actions (shots, melee, Ward, neutral abilities, wall battering) for the active stack in `battle`. */
function mainOptions(catalog: ContentCatalog, battle: BattleState, stack: BattleStackState, actions: NonNullable<ReturnType<typeof legalActions>>): Scored[] {
  const options: Scored[] = [];
  const myValue = stackValue(catalog, stack.creatureId);

  // 2. Shots.
  for (const tid of actions.shootTargets) {
    const t = battle.stacks[tid]!;
    const p = previewStrike(catalog, battle, stack, t, { mode: 'shot', chargeHexes: 0 });
    const dmg = avg(p.min, p.max);
    options.push({ score: killValue(catalog, t, dmg, avg(p.killsMin, p.killsMax)) + 50, key: `shoot:${tid}`, payload: { kind: 'BattleShoot', stackId: stack.id, targetId: tid } });
  }

  // 2b. Deck Harpoon (single-ship sea encounter): a weak throw at an enemy in the water, never answered.
  // Below a real shot (+50) and below a profitable melee blow; above standing idle while the sea fires.
  for (const tid of actions.harpoon?.targets ?? []) {
    const t = battle.stacks[tid]!;
    const p = previewHarpoon(catalog, { battle }, stack.id, tid);
    if (!p) continue;
    const dmg = avg(p.min, p.max);
    options.push({ score: killValue(catalog, t, dmg, avg(p.killsMin, p.killsMax)) + 20, key: `harpoon:${tid}`, payload: { kind: 'BattleHarpoon', stackId: stack.id, targetId: tid } });
  }

  // 3. Melee (with retaliation estimate).
  for (const m of actions.melee) {
    const t = battle.stacks[m.targetId]!;
    for (const opt of m.options) {
      const p = previewStrike(catalog, battle, stack, t, { mode: 'melee', chargeHexes: opt.distance });
      const dmg = avg(p.min, p.max);
      const kills = avg(p.killsMin, p.killsMax);
      let retaliationCost = 0;
      if (kills < aliveCount(catalog, t)) {
        const tAfter = { ...t, totalHp: Math.max(1, t.totalHp - dmg) };
        const r = previewStrike(catalog, battle, tAfter, { ...stack, anchor: opt.from }, { mode: 'retaliation', chargeHexes: 0 });
        const hp = catalog.creatures[stack.creatureId]!.stats!.hp;
        retaliationCost = (avg(r.min, r.max) / hp) * myValue * 0.6;
      }
      const shooterPenalty = actions.shootTargets.length > 0 ? 200 : 0;
      options.push({
        score: killValue(catalog, t, dmg, kills) - retaliationCost - shooterPenalty,
        key: `melee:${m.targetId}:${cellKey(opt.from)}`,
        payload: { kind: 'BattleMelee', stackId: stack.id, targetId: m.targetId, from: opt.from },
      });
    }
  }

  // 4. Seer ward on a valuable ally when not shooting profitably.
  for (const ab of actions.abilities) {
    if (catalog.abilities[ab.abilityId]?.rule.type !== 'family_ward') continue;
    for (const tid of ab.targets) {
      const a = battle.stacks[tid]!;
      const v = stackValue(catalog, a.creatureId) * aliveCount(catalog, a) * 0.05;
      options.push({ score: v, key: `ability:${ab.abilityId}:${tid}`, payload: { kind: 'BattleUseAbility', stackId: stack.id, abilityId: ab.abilityId, targetId: tid } });
    }
  }

  // 4b. The neutral creatures' active abilities (handoff 2026-10-15): only a legal target, only when plainly useful.
  options.push(...neutralAbilityChoices(catalog, battle, stack, actions));

  // 5. Siege: a wall breaker batters the walls while no shot is worth more.
  if (actions.structureTargets.length > 0) {
    const target = preferredStructure(battle, actions.structureTargets);
    options.push({ score: 120, key: `structure:${target}`, payload: { kind: 'BattleAttackStructure', stackId: stack.id, structureId: target } });
  }

  // 6. The enemy siege engine (targetableCatapultV1): a legitimate target in plain sight on the board,
  // worth the structure damage it can still do (no hidden information: its HP is shown to both sides).
  const engine = actions.engine ? battle.siege?.engine : null;
  if (actions.engine && engine && engine.hp > 0) {
    const worth = engineWorth(battle);
    const value = (p: { min: number; max: number }) => {
      const dmg = avg(p.min, p.max);
      return worth * Math.min(1, dmg / engine.hp) + (p.min >= engine.hp ? ENGINE_KILL_BONUS : 0);
    };
    if (actions.engine.canShoot) {
      const p = previewEngineStrike(catalog, battle, stack, engine, { mode: 'shot', chargeHexes: 0 });
      options.push({ score: value(p) + 50, key: `engine-shot:${engine.id}`, payload: { kind: 'BattleAttackEngine', stackId: stack.id, engineId: engine.id, mode: 'shot' } });
    }
    const shooterPenalty = actions.shootTargets.length > 0 || actions.engine.canShoot ? 200 : 0;
    for (const opt of actions.engine.melee) {
      const p = previewEngineStrike(catalog, battle, stack, engine, { mode: 'melee', chargeHexes: opt.distance, reach: !!opt.reach });
      options.push({ score: value(p) - shooterPenalty, key: `engine-melee:${engine.id}:${cellKey(opt.from)}`, payload: { kind: 'BattleAttackEngine', stackId: stack.id, engineId: engine.id, mode: 'melee', from: opt.from } });
    }
  }

  return options;
}

/** Gold-equivalent worth of the enemy siege engine: the structure HP it can still remove (capped), plus a base. */
const ENGINE_BASE_WORTH = 100;
const ENGINE_WORTH_PER_STRUCTURE_HP = 50;
const ENGINE_WORTH_CAP_HP = 8;
/** Destroying the engine outright (the weakest possible blow suffices) is worth this much more. */
const ENGINE_KILL_BONUS = 200;

export function engineWorth(battle: BattleState): number {
  const hp = catapultTargets(battle).reduce((n, s) => n + s.hp, 0);
  return ENGINE_BASE_WORTH + ENGINE_WORTH_PER_STRUCTURE_HP * Math.min(ENGINE_WORTH_CAP_HP, hp);
}

/**
 * Where the attacker's targetable catapult fires (targetableCatapultV1): only intact structures.
 * 1. A route-opening gate: ground troops that must get in, and no breach yet.
 * 2. The most threatening tower or keep: the one whose shot would hurt this army most now (the
 *    turrets' own targeting value), then the weakest, then the lowest ID.
 * 3. Otherwise the gate, else the wall section nearest the gate row (another way in), else any.
 * Deterministic; never a creature, never a destroyed structure.
 */
export function engineAimFor(catalog: ContentCatalog, battle: BattleState): string | null {
  const siege = battle.siege;
  if (!siege || siege.level === 0) return null;
  const intact = catapultTargets(battle);
  if (intact.length === 0) return null;
  const attackers = sideStacks(battle, 'attacker');
  const groundMelee = attackers.some((a) => !hasFlight(catalog, a.creatureId) && !(isShooter(catalog, a.creatureId) && a.shotsRemaining > 0));
  const breached = siege.structures.some((s) => (s.kind === 'wall' || s.kind === 'gate') && s.hp <= 0);
  const gate = intact.find((s) => s.kind === 'gate');
  if (groundMelee && !breached && gate) return gate.id;
  const cfg = catalog.rulesProfile.combat.siege;
  const turrets = intact
    .filter((s) => s.kind === 'keep' || s.kind === 'tower')
    .map((t) => {
      const damage = t.kind === 'keep' ? cfg.keepDamage : cfg.towerDamage;
      const victim = turretTarget(catalog, battle, t, damage);
      return { t, threat: victim ? Math.round(turretTargetValue(catalog, victim, damage) * 1000) : 0 };
    })
    .sort((a, b) => b.threat - a.threat || a.t.hp - b.t.hp || (a.t.id < b.t.id ? -1 : 1));
  if (turrets[0]) return turrets[0].t.id;
  if (gate) return gate.id;
  return preferredStructure(battle, intact.map((s) => s.id));
}

/** The attacker's engine phase: fire at the chosen structure, or skip when nothing can be aimed at. */
function enginePhaseAction(catalog: ContentCatalog, battle: BattleState): CommandPayload | null {
  const status = catapultStatus(battle);
  if (!status || !status.phaseActive) return null;
  const target = engineAimFor(catalog, battle);
  return target ? { kind: 'BattleFireCatapult', structureId: target, expectedRound: battle.round } : { kind: 'BattleSkipCatapult', expectedRound: battle.round };
}

/**
 * Where a siege attacker wants the Catapult (2026-10-07): the gate while it has
 * ground troops that must get in; an army that flies or shoots over the walls
 * silences the turrets instead (the weakest keep or tower first).
 */
export function catapultAimFor(catalog: ContentCatalog, battle: BattleState): string | null {
  const siege = battle.siege;
  if (!siege || siege.level === 0) return null;
  const intact = siege.structures.filter((s) => s.hp > 0);
  if (intact.length === 0) return null;
  const attackers = sideStacks(battle, 'attacker');
  const groundMelee = attackers.some((a) => !hasFlight(catalog, a.creatureId) && !(isShooter(catalog, a.creatureId) && a.shotsRemaining > 0));
  const gate = intact.find((s) => s.kind === 'gate');
  if (groundMelee && gate) return gate.id;
  const turrets = intact.filter((s) => s.kind === 'keep' || s.kind === 'tower').sort((a, b) => a.hp - b.hp || (a.id < b.id ? -1 : 1));
  if (turrets[0]) return turrets[0].id;
  return gate?.id ?? null;
}

const SHIFT_MARGIN = 5;
/** Progress (in cells) a lone advance gives up per enemy melee stack that could strike it next. */
/** Base score of a shooter's move that brings an enemy into range (see step 5). */
const IN_RANGE_MOVE = 100;
const LONE_PENALTY = 2;

function topScore(options: readonly Scored[]): number {
  return options.reduce((m, o) => Math.max(m, o.score), 0);
}

export function chooseBattleAction(catalog: ContentCatalog, state: MatchState): CommandPayload | null {
  const battle = state.battle;
  if (!battle || battle.status !== 'active') return null;
  if (battle.shadowChoice) return { kind: 'BattleResolveShadow', to: battle.shadowChoice.options[0]! };
  // Pre-battle phases: automatic choices keep the default formation.
  if (battle.phase === 'selection' && battle.selection) {
    // Combine identical stacks first (2026-10-07), then keep the most valuable seven.
    const ids = battle.selection.candidates.map((c) => c.creatureId);
    if (new Set(ids).size < ids.length) return { kind: 'BattleMergeDefenders' };
    return { kind: 'BattleSelectDefenders', picks: autoDefenderPicks(catalog, battle.selection) };
  }
  if (battle.phase === 'deployment') return { kind: 'BattleConfirmDeployment' };
  if (battle.phase === 'engine') return enginePhaseAction(catalog, battle);
  if (!battle.activeStackId) return null;
  const actions = legalActions(catalog, state);
  if (!actions) return null;
  const stack = battle.stacks[battle.activeStackId]!;
  const enemies = sideStacks(battle, opposing(stack.side));
  if (enemies.length === 0) return { kind: 'BattleDefend', stackId: stack.id };
  // Siege attacker (legacy automatic Catapult): aim it where it helps this army most (a free choice).
  // A targetable catapult is aimed by its own Fire order in the engine phase.
  if (stack.side === 'attacker' && !battle.siege?.engine) {
    const aim = catapultAimFor(catalog, battle);
    if (aim && aim !== catapultTarget(battle)?.id) return { kind: 'BattleAimCatapult', structureId: aim };
  }

  // 0. AI empires may call a battle intervention (Favor, once a week) in a fight that matters.
  const miracle = interventionChoice(catalog, state, battle, stack);
  if (miracle) return miracle;
  const relicChoices: Scored[] = [];
  for (const { item, action } of activeRelics(catalog, state, stack.side)) {
    for (const target of Object.values(battle.stacks)) {
      if (!quoteActiveRelic(catalog, state, item.id, target.id).legal) continue;
      if (action === 'bind' && (isShooter(catalog, target.creatureId) || adjacentEnemies(catalog, battle, target).length > 0)) continue;
      const status = relicDispelChoices(target, action)[0];
      relicChoices.push({ score: aliveCount(catalog, target) * stackValue(catalog, target.creatureId) * 0.15, key: `relic:${item.id}:${target.id}`, payload: { kind: 'BattleActivateArtifact', artifactId: item.id, targetId: target.id, ...(status ? { statusSourceId: status.sourceId } : {}) } });
    }
  }
  const relic = best(relicChoices.filter((x) => x.score >= 300));
  if (relic) return relic;

  // 1. Commander spell at the start of the activation (does not consume the action).
  if (actions.castAvailable) {
    const spellChoices: Scored[] = [];
    for (const sp of actions.spells) {
      if (!sp.castable) continue;
      const def = catalog.spells[sp.spellId];
      if (!def) continue;
      const power = castingPower(battle.sides[stack.side], sp.spellId);
      const pct = battle.sides[stack.side].effects?.spellDamagePercent ?? 0;
      const e = def.effect;
      const fresh = (a: BattleStackState) => !a.statuses.some((s) => s.sourceId === `spell:${sp.spellId}`);
      const strikeValue = (t: BattleStackState, dmg: number) => {
        const hp = catalog.creatures[t.creatureId]!.stats!.hp;
        return killValue(catalog, t, dmg, Math.min(aliveCount(catalog, t), Math.floor(dmg / hp)));
      };
      if (e.type === 'battle_field') {
        for (const t of Object.values(battle.stacks).filter((s) => s.totalHp > 0)) {
          const shapes = e.kind === 'glass' ? cellNeighbors(t.anchor,battle.cols,battle.rows).flatMap((n)=>cellNeighbors(n,battle.cols,battle.rows).map((end)=>[n,end])) : e.kind === 'frost' ? cellNeighbors(t.anchor,battle.cols,battle.rows).map((n)=>[n]) : e.kind === 'wind_line' ? cellNeighbors(t.anchor, battle.cols, battle.rows).flatMap((n) => cellNeighbors(n, battle.cols, battle.rows).map((end) => [t.anchor, n, end])) : [[t.anchor]];
          for (const cells of shapes) {
            if (fieldSpellProblem(catalog, battle, e, cells)) continue;
            const victims = fieldVictims(catalog, battle, fieldCells(battle, e, cells));
            let score = 0;
            if ((e.kind === 'glass' || e.kind === 'frost') && t.side !== stack.side && movementClassOf(catalog,t.creatureId)==='ground' && !battle.spellFields?.some((f)=>f.spellId===sp.spellId&&f.side===stack.side)) {
              const friends=Object.values(battle.stacks).filter((s)=>s.side===stack.side&&s.totalHp>0);
              const threatened=friends.filter((s)=>isShooter(catalog,s.creatureId)||s.totalHp<catalog.creatures[s.creatureId]!.stats!.hp*3);
              const goal=(e.kind==='glass'?threatened:friends).sort((a,b)=>cellDistance(a.anchor,t.anchor)-cellDistance(b.anchor,t.anchor))[0];
              if(goal&&cells.every((c)=>cellDistance(c,goal.anchor)<cellDistance(t.anchor,goal.anchor))&&cells.every((c)=>cellDistance(c,t.anchor)<=2)) score=e.kind==='frost'?strikeValue(t,(e.base??0)+(e.perPower??0)*power)*.6:stackValue(catalog,goal.creatureId)*aliveCount(catalog,goal)*.04;
            }
            for (const v of victims) {
              const own = v.side === stack.side, value = stackValue(catalog, v.creatureId) * aliveCount(catalog, v);
              if (e.kind === 'wind_line') score += strikeValue(v, (e.base ?? 0) + (e.perPower ?? 0) * power) * (own ? -1.5 : 1);
              if (e.kind === 'sanctuary' && own && !battle.spellFields?.some((f) => f.kind === 'sanctuary' && f.side === stack.side)) score += value * 0.06;
              if (e.kind === 'eclipse' && isShooter(catalog, v.creatureId)) score += value * (own ? -0.1 : 0.1);
            }
            if (score > 0) spellChoices.push({ score, key: `spell:${sp.spellId}:${cells.map(cellKey).join(';')}`, payload: { kind: 'BattleCastSpell', spellId: sp.spellId, targetId: stack.id, cells } });
          }
        }
      } else if (e.type === 'illusion_copy') {
        for (const tid of sp.targets) {
          const t = battle.stacks[tid]!, destination = illusionDestinations(catalog, battle, t)[0];
          if (destination) spellChoices.push({ score: stackValue(catalog, t.creatureId) * aliveCount(catalog, t) * 0.08, key: `spell:${sp.spellId}:${tid}`, payload: { kind: 'BattleCastSpell', spellId: sp.spellId, targetId: tid, destination } });
        }
      } else if (e.type === 'temporary_restore') {
        for (const tid of sp.targets) {
          const t = battle.stacks[tid]!, hp = catalog.creatures[t.creatureId]!.stats!.hp;
          const amount = Math.min(e.base + e.perPower * power, t.startingCount * hp - t.totalHp);
          if (amount > 0) spellChoices.push({ score: amount / hp * stackValue(catalog, t.creatureId) * 0.5, key: `spell:${sp.spellId}:${tid}`, payload: { kind: 'BattleCastSpell', spellId: sp.spellId, targetId: tid } });
        }
      } else if (e.type === 'banish_summon') {
        for (const tid of sp.targets) {
          const t = battle.stacks[tid]!;
          spellChoices.push({ score: stackValue(catalog, t.creatureId) * (t.summoned?.sourceCount ?? aliveCount(catalog, t)) * 0.25, key: `spell:${sp.spellId}:${tid}`, payload: { kind: 'BattleCastSpell', spellId: sp.spellId, targetId: tid } });
        }
      } else if (e.type === 'spatial_move') {
        for (const tid of sp.targets) {
          const t = battle.stacks[tid]!;
          const opponents = sideStacks(battle, opposing(t.side));
          const distance = (c: BattleCell) => Math.min(...opponents.map((x) => cellDistance(c, x.anchor)));
          const desired = isShooter(catalog, t.creatureId) ? 1 : -1;
          for (const option of spatialSpellOptions(catalog, battle, t, e)) {
            const change = (distance(option.destination) - distance(t.anchor)) * desired * (t.side === stack.side ? 1 : -1);
            if (change <= 0) continue;
            const score = stackValue(catalog, t.creatureId) * aliveCount(catalog, t) * Math.min(0.15, change * 0.04);
            spellChoices.push({ score, key: `spell:${sp.spellId}:${tid}:${cellKey(option.destination)}`, payload: { kind: 'BattleCastSpell', spellId: sp.spellId, targetId: tid, ...option } });
          }
        }
      } else if (e.type === 'direct_damage' || e.type === 'area_damage') {
        const dmg = Math.floor(((e.base + e.perPower * power) * (100 + pct)) / 100);
        for (const tid of sp.targets) {
          const t = battle.stacks[tid]!;
          let score = strikeValue(t, dmg);
          if (e.type === 'area_damage') for (const n of adjacentEnemies(catalog, battle, t)) score += strikeValue(n, dmg);
          spellChoices.push({ score, key: `spell:${sp.spellId}:${tid}`, payload: { kind: 'BattleCastSpell', spellId: sp.spellId, targetId: tid } });
        }
      } else if (e.type === 'mass_damage') {
        const dmg = Math.floor(((e.base + e.perPower * power) * (100 + pct)) / 100);
        const enemies = sp.targets.map((tid) => battle.stacks[tid]!);
        const score = enemies.reduce((n, t) => n + strikeValue(t, dmg), 0);
        if (enemies[0]) spellChoices.push({ score, key: `spell:${sp.spellId}`, payload: { kind: 'BattleCastSpell', spellId: sp.spellId, targetId: enemies[0].id } });
      } else if (e.type === 'mass_heal') {
        const allies = sideStacks(battle, stack.side);
        const amount = e.base + e.perPower * power;
        let v = 0;
        for (const a of allies) {
          const hp = catalog.creatures[a.creatureId]!.stats!.hp;
          const missing = hp - (a.totalHp - (aliveCount(catalog, a) - 1) * hp);
          v += (Math.min(Math.max(0, missing), amount) / hp) * stackValue(catalog, a.creatureId);
        }
        if (v > 0 && allies[0]) spellChoices.push({ score: v, key: `spell:${sp.spellId}`, payload: { kind: 'BattleCastSpell', spellId: sp.spellId, targetId: allies[0].id } });
      } else if (e.type === 'mass_bonus') {
        const group = def.target === 'enemy_army' ? sp.targets.map((tid) => battle.stacks[tid]!) : sideStacks(battle, stack.side);
        if (group.length > 0 && group.every((a) => fresh(a))) {
          const v = group.reduce((n, a) => n + stackValue(catalog, a.creatureId) * aliveCount(catalog, a), 0) * 0.08;
          spellChoices.push({ score: v, key: `spell:${sp.spellId}`, payload: { kind: 'BattleCastSpell', spellId: sp.spellId, targetId: group[0]!.id } });
        }
      } else if (e.type === 'tactical_status' || e.type === 'group_mind_cleanse') {
        for (const tid of sp.targets) {
          const t = battle.stacks[tid]!;
          if (!fresh(t)) continue;
          if (e.type === 'tactical_status' && e.status === 'temporary_flight') continue; // Save mana until a route needs it.
          const weight = e.type === 'group_mind_cleanse' ? 0.16 : e.status === 'ranged_lock' ? 0.22 : 0.08;
          const score = stackValue(catalog, t.creatureId) * aliveCount(catalog, t) * weight;
          spellChoices.push({ score, key: `spell:${sp.spellId}:${tid}`, payload: { kind: 'BattleCastSpell', spellId: sp.spellId, targetId: tid } });
        }
      } else if (e.type === 'dispel_status') {
        for (const tid of sp.targets) {
          const target = battle.stacks[tid]!;
          for (const status of dispellableStatuses(target, e.polarity)) {
            const score = stackValue(catalog, target.creatureId) * aliveCount(catalog, target) * Math.min(0.25, 0.05 + Math.abs(status.amount) * 0.02);
            spellChoices.push({ score, key: `spell:${sp.spellId}:${tid}:${status.sourceId}`,
              payload: { kind: 'BattleCastSpell', spellId: sp.spellId, targetId: tid, statusSourceId: status.sourceId } });
          }
        }
      } else if (e.type === 'restore_shots' || e.type === 'retaliation_restore') {
        for (const tid of sp.targets) {
          const t = battle.stacks[tid]!;
          // Save ammunition recovery for a nearly empty quiver; retaliation matters only in contact.
          const relevant = e.type === 'restore_shots' ? t.shotsRemaining <= 1 : adjacentEnemies(catalog, battle, t).length > 0;
          if (!relevant) continue;
          const score = stackValue(catalog, t.creatureId) * aliveCount(catalog, t) * (e.type === 'restore_shots' ? 0.2 : 0.08);
          spellChoices.push({ score, key: `spell:${sp.spellId}:${tid}`, payload: { kind: 'BattleCastSpell', spellId: sp.spellId, targetId: tid } });
        }
      } else if (e.type === 'enemy_mana_drain') {
        // Legal options already guarantee a living enemy hero and unused side quota.
        const tid = sp.targets[0];
        if (tid) spellChoices.push({ score: Math.min(e.cap, e.base + Math.floor(power / e.powerDivisor)) * 20,
          key: `spell:${sp.spellId}:${tid}`, payload: { kind: 'BattleCastSpell', spellId: sp.spellId, targetId: tid } });
      } else if (def.target === 'enemy_stack') {
        // Debuffs (negative Attack, Defense or Speed) on the most valuable fresh enemy.
        for (const tid of sp.targets) {
          const t = battle.stacks[tid]!;
          if (!fresh(t)) continue;
          const v = stackValue(catalog, t.creatureId) * aliveCount(catalog, t) * 0.1;
          spellChoices.push({ score: v, key: `spell:${sp.spellId}:${tid}`, payload: { kind: 'BattleCastSpell', spellId: sp.spellId, targetId: tid } });
        }
      } else if (e.type === 'attack_bonus' || e.type === 'max_damage_roll' || e.type === 'defense_bonus' || e.type === 'speed_bonus' || e.type === 'melee_mitigation' || e.type === 'ranged_mitigation') {
        const allies = sideStacks(battle, stack.side).filter(fresh);
        for (const a of allies) {
          const v = stackValue(catalog, a.creatureId) * aliveCount(catalog, a) * 0.12;
          spellChoices.push({ score: v, key: `spell:${sp.spellId}:${a.id}`, payload: { kind: 'BattleCastSpell', spellId: sp.spellId, targetId: a.id } });
        }
      }
    }
    const spell = best(spellChoices);
    if (spell) return spell;
  }

  // 2. Free Shapeshift: change aspect when the other aspect has a clearly better best action.
  const shift = actions.abilities.find((a) => a.free && catalog.abilities[a.abilityId]?.rule.type === 'shapeshift');
  if (shift) {
    const now = topScore(mainOptions(catalog, battle, stack, actions));
    const other = { ...stack, aspect: !stack.aspect };
    const otherState: MatchState = { ...state, battle: { ...battle, stacks: { ...battle.stacks, [stack.id]: other } } };
    const otherActions = legalActions(catalog, otherState);
    const then = otherActions ? topScore(mainOptions(catalog, otherState.battle!, other, otherActions)) : Number.NEGATIVE_INFINITY;
    if (then > now + SHIFT_MARGIN) return { kind: 'BattleUseAbility', stackId: stack.id, abilityId: shift.abilityId, targetId: stack.id };
  }

  const options = mainOptions(catalog, battle, stack, actions);

  const attack = best(options);
  if (attack && options.some((o) => o.score > 0)) return attack;
  // Engaged with no profitable trade: strike in place anyway rather than side-step
  // around the enemy (side-stepping stalls battles into the round limit).
  const inPlace = options.filter((o) => o.payload.kind === 'BattleMelee' && cellKey(o.payload.from) === cellKey(stack.anchor));
  if (inPlace.length > 0) return best(inPlace);

  // 5. Advance toward the nearest enemy (shooters hold position if they could shoot later).
  if (actions.moves.length > 0 && !(actions.shootTargets.length > 0)) {
    const moveChoices: Scored[] = [];
    // In a siege, measure ground distance around intact walls; on a masked board (boarding) around the
    // water, over the bridge (flyers go straight over).
    // Swimmers measure straight across the open water (their zone has no walls); walkers around them.
    const cls = movementClassOf(catalog, stack.creatureId);
    let field = ((battle.siege && battle.siege.level > 0) || battle.board) && cls === 'ground' ? groundDistanceField(catalog, battle, stack, enemies) : null;
    if (field && battle.siege && !stackCells(catalog, stack).some((c) => field!.has(cellKey(c)))) {
      // No road in yet: wait by the gate (outside the moat) for the Catapult to open a breach.
      field = gateApproachField(battle);
    }
    // Do not advance alone: a cell that more enemy melee stacks can reach next than
    // allies stand beside costs LONE_PENALTY cells of progress per extra attacker
    // (fast flyers used to land in the middle of the enemy line and be surrounded).
    const allies = sideStacks(battle, stack.side).filter((a) => a.id !== stack.id);
    const melee = enemies.filter((e) => (catalog.creatures[e.creatureId]?.stats?.shots ?? 0) === 0);
    const enemyCells = new Map(melee.map((e) => [e.id, stackCells(catalog, e)] as const));
    const allyCells = allies.map((a) => stackCells(catalog, a));
    const reach = new Map(melee.map((e) => [e.id, effectiveSpeed(catalog, e, battle) + 1] as const));
    // A shooter with ammunition but no enemy in range steps only as far as it must
    // to bring one into range, away from enemy reach, never into contact; when no
    // cell in range can be reached this turn it holds while enemy troops approach.
    const range = isShooter(catalog, stack.creatureId) && stack.shotsRemaining > 0 ? shootingRange(catalog, stack.creatureId, battle) : 0;
    for (const to of actions.moves) {
      const cells = stackCells(catalog, stack, to);
      let nearest = Number.POSITIVE_INFINITY;
      if (field) for (const c of cells) nearest = Math.min(nearest, field.get(cellKey(c)) ?? 999);
      else for (const e of enemies) nearest = Math.min(nearest, footprintDistance(cells, stackCells(catalog, e)));
      const speed = effectiveSpeed(catalog, stack, battle);
      const threats = melee.filter((e) => footprintDistance(cells, enemyCells.get(e.id)!) <= reach.get(e.id)!).length;
      const support = allyCells.filter((a) => footprintDistance(cells, a) <= 2).length;
      const lonely = Math.max(0, threats - support);
      let score = -nearest - cellDistance(stack.anchor, to) / (speed * 10) - lonely * LONE_PENALTY;
      if (range > 0) {
        let gap = Number.POSITIVE_INFINITY;
        for (const e of enemies) gap = Math.min(gap, footprintDistance(cells, stackCells(catalog, e)));
        if (gap <= 1) score = -1000 - lonely * LONE_PENALTY;
        else if (gap <= range) score = IN_RANGE_MOVE - (range - gap) * 0.5 - threats * 10 - lonely * LONE_PENALTY;
      }
      moveChoices.push({ score, key: `move:${cellKey(to)}`, payload: { kind: 'BattleMove', stackId: stack.id, to } });
    }
    const mv = best(moveChoices);
    // Hold only while no enemy shooter can hit this stack where it stands.
    const underFire = enemies.some((e) => isShooter(catalog, e.creatureId) && e.shotsRemaining > 0 && inShootingRange(catalog, e, stack, battle));
    // (Never at sea: the deck's walkers cannot come into the water, so a sea shooter always closes the range.)
    if (mv && range > 0 && moveChoices[0]!.score < IN_RANGE_MOVE - 50 && melee.length > 0 && !field && !underFire && !battle.board?.sea) return { kind: 'BattleDefend', stackId: stack.id };
    if (mv) return mv;
  }
  if (attack) return attack;
  // A sea shooter boxed in with no target in range waits for the way to clear (it acts again later this round).
  if (battle.board?.sea && actions.canWait && isShooter(catalog, stack.creatureId) && stack.shotsRemaining > 0 && actions.shootTargets.length === 0 && actions.moves.length === 0) return { kind: 'BattleWait', stackId: stack.id };
  return { kind: 'BattleDefend', stackId: stack.id };
}

/** Gate first (it opens the shortest road), then the wall section nearest the gate row. */
function preferredStructure(battle: BattleState, ids: readonly string[]): string {
  const order = (id: string) => {
    if (id === 'gate') return 0;
    const s = battle.siege?.structures.find((x) => x.id === id);
    const row = s?.cells[0]?.row;
    return row === undefined ? 50 : 1 + Math.abs(row - SIEGE_GATE_ROW);
  };
  return [...ids].sort((a, b) => order(a) - order(b) || (a < b ? -1 : 1))[0]!;
}

/** Distance to the dry approach in front of the gate. */
function gateApproachField(battle: BattleState): Map<string, number> {
  const target = { col: (battle.siege?.wallCol ?? battle.cols) - 1, row: SIEGE_GATE_ROW };
  const out = new Map<string, number>();
  for (let col = 0; col < battle.cols; col++) for (let row = 0; row < battle.rows; row++) out.set(cellKey({ col, row }), cellDistance({ col, row }, target));
  return out;
}

/** BFS hex distance from enemy-adjacent cells over cells not blocked by intact structures (units ignored). */
function groundDistanceField(catalog: ContentCatalog, battle: BattleState, stack: BattleStackState, enemies: readonly BattleStackState[]): Map<string, number> {
  // The board's zones for this mover (a sea encounter's deck for walkers).
  const cls = movementClassOf(catalog, stack.creatureId);
  const blocked = new Set<string>();
  for (const s of battle.siege?.structures ?? []) {
    if (s.hp <= 0 || (s.kind === 'gate' && stack.side === 'defender')) continue;
    for (const c of s.cells) blocked.add(cellKey(c));
  }
  for (const o of battle.obstacles) blocked.add(cellKey(o));
  const dist = new Map<string, number>();
  let frontier: BattleCell[] = [];
  for (const e of enemies) {
    for (const c of stackCells(catalog, e)) {
      const k = cellKey(c);
      if (!dist.has(k)) {
        dist.set(k, 0);
        frontier.push(c);
      }
    }
  }
  for (let d = 1; frontier.length > 0 && d < 60; d++) {
    const next: BattleCell[] = [];
    for (const cur of frontier) {
      for (const n of cellNeighbors(cur, battle.cols, battle.rows)) {
        const k = cellKey(n);
        if (dist.has(k) || blocked.has(k) || !cellLegalFor(battle, n, cls)) continue;
        dist.set(k, d);
        next.push(n);
      }
    }
    frontier = next;
  }
  return dist;
}

/**
 * Battle interventions for AI-controlled empires (never for a human side on
 * auto-combat). The weekly miracle is kept for the battle that decides
 * something (2026-10-07): a siege, a fight against another empire's hero, or a
 * close fight — not a walkover, and not a lost cause unless the town itself is
 * at stake. Early rounds only, while it still changes the outcome.
 */
function interventionChoice(catalog: ContentCatalog, state: MatchState, battle: BattleState, stack: BattleStackState): CommandPayload | null {
  const side = battle.sides[stack.side];
  const playerId = side.playerId;
  if (!playerId || side.controller !== 'ai' || battle.round > 4) return null;
  if (state.players[playerId]?.role === 'scripted_hostile') return null;
  if (interventionUsedThisWeek(catalog, state, playerId)) return null;
  const spare = favorSpare(catalog, state, playerId);
  const armyValue = (sideId: BattleStackState['side']) => sideStacks(battle, sideId).reduce((n, s) => n + stackValue(catalog, s.creatureId) * aliveCount(catalog, s), 0);
  const mine = armyValue(stack.side);
  const theirs = armyValue(opposing(stack.side));
  if (theirs < 3000) return null;
  const foe = battle.sides[opposing(stack.side)];
  const siege = battle.encounter.kind === 'town_siege';
  const rivalHero = !!foe.playerId && !!foe.commander?.heroId;
  const ratio = mine / Math.max(1, theirs);
  if (ratio > 3) return null; // a walkover: keep the miracle
  if (!siege && !rivalHero && ratio > 1.6) return null; // an easy fight against neutrals
  if (ratio < 0.3 && !(siege && stack.side === 'defender')) return null; // beyond help
  const options: Scored[] = [];
  for (const d of interventionsFor(catalog, state, playerId)) {
    if (d.context !== 'battle' || d.favorCost > spare) continue;
    const e = d.effect;
    if (e.type === 'battle_smite') {
      for (const t of sideStacks(battle, opposing(stack.side))) {
        const hp = catalog.creatures[t.creatureId]!.stats!.hp;
        const damage = Math.max(e.damage, Math.floor(t.totalHp * (e.percent ?? 0) / 100));
        const v = killValue(catalog, t, damage, Math.min(aliveCount(catalog, t), Math.floor(damage / hp)));
        if (v >= 600 && quoteIntervention(catalog, state, playerId, d.id, { stackId: t.id }).legal) options.push({ score: v, key: `miracle:${d.id}:${t.id}`, payload: { kind: 'BattleInvokeIntervention', interventionId: d.id, targetId: t.id } });
      }
    } else if (e.type === 'battle_status') {
      const v = mine * 0.02 * e.amount * e.durationRounds;
      if (mine >= 5000 && v >= 500 && quoteIntervention(catalog, state, playerId, d.id).legal) options.push({ score: v, key: `miracle:${d.id}`, payload: { kind: 'BattleInvokeIntervention', interventionId: d.id } });
    } else if (e.type === 'library_battle_status') {
      for (const t of sideStacks(battle, stack.side)) {
        if (!quoteIntervention(catalog, state, playerId, d.id, { stackId: t.id }).legal) continue;
        if (e.status === 'retaliation_bonus' && !canRetaliate(catalog, t)) continue;
        const value = stackValue(catalog, t.creatureId) * aliveCount(catalog, t);
        const score = value * (e.status === 'last_creature_guard' ? 0.18 : 0.12);
        if (score >= 500) options.push({ score, key: `miracle:${d.id}:${t.id}`, payload: { kind: 'BattleInvokeIntervention', interventionId: d.id, targetId: t.id } });
      }
    } else if (e.type === 'library_engine_repair') {
      const engine = battle.siege?.engine;
      if (engine && engine.hp < engine.maxHp && quoteIntervention(catalog, state, playerId, d.id).legal) options.push({ score: 700, key: `miracle:${d.id}`, payload: { kind: 'BattleInvokeIntervention', interventionId: d.id } });
    } else if (e.type === 'library_spell_credit') {
      const hero = side.commander?.heroId ? state.heroes[side.commander.heroId] : undefined;
      if (hero && hero.mana < 10 && side.commander?.knownSpellIds.length && quoteIntervention(catalog, state, playerId, d.id).legal) options.push({ score: 550, key: `miracle:${d.id}`, payload: { kind: 'BattleInvokeIntervention', interventionId: d.id } });
    }
  }
  return best(options);
}
