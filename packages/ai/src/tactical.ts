/**
 * TacticalPlanner: chooses one legal battle action for the active stack.
 *
 * Uses the shared legal-action generator and the same DamageResolver preview as
 * the UI (expected values only; the planner never draws from gameplay RNG).
 * Deterministic: ties break by stable action keys.
 */
import {
  aliveCount,
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
  adjacentEnemies,
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

/** Scored main actions (shots, melee, Ward, wall battering) for the active stack in `battle`. */
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

  // 5. Siege: a wall breaker batters the walls while no shot is worth more.
  if (actions.structureTargets.length > 0) {
    const target = preferredStructure(battle, actions.structureTargets);
    options.push({ score: 120, key: `structure:${target}`, payload: { kind: 'BattleAttackStructure', stackId: stack.id, structureId: target } });
  }

  return options;
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
  // Pre-battle phases: automatic choices keep the default formation.
  if (battle.phase === 'selection' && battle.selection) return { kind: 'BattleSelectDefenders', picks: autoDefenderPicks(catalog, battle.selection) };
  if (battle.phase === 'deployment') return { kind: 'BattleConfirmDeployment' };
  if (!battle.activeStackId) return null;
  const actions = legalActions(catalog, state);
  if (!actions) return null;
  const stack = battle.stacks[battle.activeStackId]!;
  const enemies = sideStacks(battle, opposing(stack.side));
  if (enemies.length === 0) return { kind: 'BattleDefend', stackId: stack.id };

  // 0. AI empires may call a battle intervention (Favor, once a week) in a fight that matters.
  const miracle = interventionChoice(catalog, state, battle, stack);
  if (miracle) return miracle;

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
      if (e.type === 'direct_damage' || e.type === 'area_damage') {
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
    // In a siege, measure ground distance around intact walls (flyers go straight over).
    let field = battle.siege && battle.siege.level > 0 && !hasFlight(catalog, stack.creatureId) ? groundDistanceField(catalog, battle, stack, enemies) : null;
    if (field && !stackCells(catalog, stack).some((c) => field!.has(cellKey(c)))) {
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
    if (mv && range > 0 && moveChoices[0]!.score < IN_RANGE_MOVE - 50 && melee.length > 0 && !field && !underFire) return { kind: 'BattleDefend', stackId: stack.id };
    if (mv) return mv;
  }
  if (attack) return attack;
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
        if (dist.has(k) || blocked.has(k)) continue;
        dist.set(k, d);
        next.push(n);
      }
    }
    frontier = next;
  }
  return dist;
}

/** Battle interventions for AI-controlled empires (never for a human side on auto-combat). */
function interventionChoice(catalog: ContentCatalog, state: MatchState, battle: BattleState, stack: BattleStackState): CommandPayload | null {
  const side = battle.sides[stack.side];
  const playerId = side.playerId;
  if (!playerId || side.controller !== 'ai' || battle.round > 3) return null;
  if (state.players[playerId]?.role === 'scripted_hostile') return null;
  if (interventionUsedThisWeek(catalog, state, playerId)) return null;
  const spare = favorSpare(catalog, state, playerId);
  const armyValue = (sideId: BattleStackState['side']) => sideStacks(battle, sideId).reduce((n, s) => n + stackValue(catalog, s.creatureId) * aliveCount(catalog, s), 0);
  const mine = armyValue(stack.side);
  const theirs = armyValue(opposing(stack.side));
  if (theirs < 3000) return null;
  const options: Scored[] = [];
  for (const d of interventionsFor(catalog, state, playerId)) {
    if (d.context !== 'battle' || d.favorCost > spare) continue;
    const e = d.effect;
    if (e.type === 'battle_smite') {
      for (const t of sideStacks(battle, opposing(stack.side))) {
        const hp = catalog.creatures[t.creatureId]!.stats!.hp;
        const v = killValue(catalog, t, e.damage, Math.min(aliveCount(catalog, t), Math.floor(e.damage / hp)));
        if (v >= 600 && quoteIntervention(catalog, state, playerId, d.id, { stackId: t.id }).legal) options.push({ score: v, key: `miracle:${d.id}:${t.id}`, payload: { kind: 'BattleInvokeIntervention', interventionId: d.id, targetId: t.id } });
      }
    } else if (e.type === 'battle_status') {
      const v = mine * 0.02 * e.amount * e.durationRounds;
      if (mine >= 5000 && v >= 500 && quoteIntervention(catalog, state, playerId, d.id).legal) options.push({ score: v, key: `miracle:${d.id}`, payload: { kind: 'BattleInvokeIntervention', interventionId: d.id } });
    }
  }
  return best(options);
}
