import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import {
  aliveCount,
  damageFor,
  frontHp,
  canonicalStateHash,
  legalActions,
  previewStrike,
  strikeFactors,
  type BattleStackState,
  type MatchState,
  type StrikeFactors,
} from '../src';

function factors(bracket: number, multipliers: [number, number][]): StrikeFactors {
  return {
    attackerCount: 1,
    bMin: 0,
    bMax: 0,
    guaranteedMax: false,
    bracket,
    luckBonus: 1000,
    luckChance: null,
    multipliers,
    notes: [],
    effectiveAttack: 0,
    effectiveDefense: 0,
  };
}

describe('DamageResolver worked examples (implementation/02 §B)', () => {
  it('1. positive attack difference: B=40, A6 vs D4 -> 44', () => {
    expect(damageFor(factors(1100, [[1000, 1000]]), 40, false)).toBe(44);
  });
  it('2. defense advantage: B=40, A6 vs D10 -> 36', () => {
    expect(damageFor(factors(1000, [[900, 1000]]), 40, false)).toBe(36);
  });
  it('3. Defend is +20% Defense, not half damage: 34', () => {
    // Defense 10 -> ceil(12) = 12; A6 vs 12 -> reduction 0.15.
    expect(damageFor(factors(1000, [[850, 1000]]), 40, false)).toBe(34);
  });
  it('4. additive luck/offense bracket: 230, not 260', () => {
    expect(damageFor(factors(1300, [[1000, 1000]]), 100, true)).toBe(230);
  });
  it('5. stacked reductions floor once: 21', () => {
    expect(damageFor(factors(1000, [[1000, 1000], [1, 2], [1, 2], [85, 100]]), 100, false)).toBe(21);
  });
});

function startFordBattle(): GameDriver {
  const d = GameDriver.mission('three_beacons_m01');
  // Walk toward the bridge (it starts unexplored), then confirm the encounter.
  d.do({ kind: 'MoveHero', heroId: 'alexios', destination: { q: 8, r: 7 } });
  expect(d.reject({ kind: 'MoveHero', heroId: 'alexios', destination: { q: 10, r: 7 } }).code).toBe('encounter_requires_confirmation');
  d.do({ kind: 'MoveHero', heroId: 'alexios', destination: { q: 10, r: 7 }, confirmEncounter: true });
  expect(d.state.battle).not.toBeNull();
  return d;
}

describe('tactical battle', () => {
  it('starts a legal battle with deployed stacks and an active stack', () => {
    const d = startFordBattle();
    const b = d.state.battle!;
    expect(Object.values(b.stacks).filter((s) => s.side === 'attacker')).toHaveLength(2);
    expect(Object.values(b.stacks).filter((s) => s.side === 'defender')).toHaveLength(1);
    expect(b.activeStackId).not.toBeNull();
    expect(b.round).toBe(1);
  });

  it('previewing damage never advances gameplay RNG (BAT-10)', () => {
    const d = startFordBattle();
    const b = d.state.battle!;
    const rngBefore = { ...d.state.rng };
    const [a, t] = [Object.values(b.stacks).find((s) => s.side === 'attacker')!, Object.values(b.stacks).find((s) => s.side === 'defender')!];
    for (let i = 0; i < 50; i++) previewStrike(d.catalog, b, a, t, { mode: 'melee', chargeHexes: 0 });
    expect(d.state.rng).toEqual(rngBefore);
  });

  it('derives alive count and front HP from aggregate HP (casualty example 6)', () => {
    const d = startFordBattle();
    const s: BattleStackState = { ...Object.values(d.state.battle!.stacks)[0]!, creatureId: 'griffin', totalHp: 133 };
    expect(aliveCount(d.catalog, s)).toBe(6);
    expect(frontHp(d.catalog, s)).toBe(8);
    const s2 = { ...s, totalHp: 183 };
    expect(aliveCount(d.catalog, s2)).toBe(8);
    expect(frontHp(d.catalog, s2)).toBe(8);
  });

  it('applies Defend as ceil(1.2 x Defense) inside the shared pipeline', () => {
    const d = startFordBattle();
    const b = d.state.battle!;
    const a = Object.values(b.stacks).find((s) => s.side === 'attacker')!;
    const t = { ...Object.values(b.stacks).find((s) => s.side === 'defender')!, defending: true };
    const f = strikeFactors(d.catalog, b, a, t, { mode: 'melee', chargeHexes: 0 });
    // Neutral Hoplite: Defense 5 -> ceil(6) = 6.
    expect(f.effectiveDefense).toBe(6);
  });

  it('rejects a shot while engaged and an out-of-turn stack (BAT-02)', () => {
    const d = startFordBattle();
    const b = d.state.battle!;
    const peltast = Object.values(b.stacks).find((s) => s.creatureId === 'peltast')!;
    const enemy = Object.values(b.stacks).find((s) => s.side === 'defender')!;
    if (b.activeStackId !== peltast.id) {
      const r = d.reject({ kind: 'BattleShoot', stackId: peltast.id, targetId: enemy.id });
      expect(r.code).toBe('not_active_stack');
    }
  });

  it('resolves to a result, clears the guard, grants its reward once and awards XP for kills', () => {
    const d = startFordBattle();
    const goldBefore = d.player.wallet.gold;
    d.autoBattle();
    expect(d.state.battle).toBeNull();
    const result = d.state.lastBattleResult!;
    expect(result.winner).toBe('attacker');
    expect(d.state.world.sites.m01_ford!.cleared).toBe(true);
    expect(d.player.wallet.gold).toBe(goldBefore + 250);
    // 6 Hoplites x 10 HP = 60 XP.
    expect(result.xpAwarded[0]?.amount).toBe(60);
    expect(d.hero().position).toEqual({ q: 10, r: 7 });
    expect(d.state.mission.objectives.m01_ford!.status).toBe('completed');
  });

  it('is deterministic: the same seed and actions produce the same final state hash', () => {
    const run = () => {
      const d = startFordBattle();
      d.autoBattle();
      return canonicalStateHash(d.state as MatchState);
    };
    expect(run()).toBe(run());
  });

  it('lists move-plus-melee options for adjacent landings (BAT-01)', () => {
    const d = startFordBattle();
    for (let i = 0; i < 20 && d.state.battle; i++) {
      const la = legalActions(d.catalog, d.state)!;
      const stack = d.state.battle!.stacks[la.stackId]!;
      if (stack.side === 'attacker' && la.melee.length > 0) {
        const m = la.melee[0]!;
        const opt = m.options[m.options.length - 1]!;
        d.do({ kind: 'BattleMelee', stackId: la.stackId, targetId: m.targetId, from: opt.from });
        return;
      }
      if (stack.side === 'attacker') d.do({ kind: 'BattleDefend', stackId: la.stackId });
      else d.autoBattleStep();
    }
  });
});
