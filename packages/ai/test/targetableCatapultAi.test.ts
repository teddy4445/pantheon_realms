/**
 * The tactical AI with the targetable siege catapult (scenario feature `targetableCatapultV1`): the
 * attacker fires only at intact structures — a route-opening gate first for ground troops, else the
 * most threatening tower or keep — and the defender may strike the engine as an ordinary target.
 */
import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import { axialNeighbors, legalActions, quoteMovement, sideStacks, SIEGE_ENGINE_ID, type BattleStackId, type CreatureStackState, type HexCoord } from '@pr/rules';
import { battleActingSide, chooseBattleAction, engineAimFor, stepBattleAI } from '../src';

const army = (a: [string, number][]): (CreatureStackState | null)[] => [...a.map(([creatureId, count]) => ({ creatureId, count })), ...Array(7 - a.length).fill(null)];

function besiege(attacker: [string, number][], level: 1 | 2 | 3 = 3, garrison: [string, number][] = [['hoplite', 10]]): GameDriver {
  const d = GameDriver.mission('skirmish_twin_harbors');
  const s = d.state;
  expect(s.scenario.features?.targetableCatapultV1).toBe(true);
  for (const fog of Object.values(s.fog)) fog.explored = fog.explored.map(() => 1);
  const east = s.towns['eastharbor']!;
  east.buildings['fortifications'] = level;
  east.garrison.slots = army(garrison);
  s.heroes['rival_odysseus']!.status = 'retreated';
  const hero = s.heroes['alexios']!;
  hero.army.slots = army(attacker);
  let from: HexCoord | null = null;
  for (const n of axialNeighbors(east.coord)) {
    hero.position = n;
    const q = quoteMovement(d.catalog, s, hero.id, east.coord);
    if (q.reachable && q.path.length === 1) {
      from = n;
      break;
    }
  }
  if (!from) throw new Error('no approach');
  hero.movementPoints = 2000;
  d.do({ kind: 'MoveHero', heroId: hero.id, destination: east.coord, confirmEncounter: true });
  return d;
}

/** Every stack defends until the engine phase opens. */
function toEnginePhase(d: GameDriver): void {
  for (let i = 0; i < 40 && d.state.battle!.phase !== 'engine'; i++) {
    const b = d.state.battle!;
    const st = b.stacks[b.activeStackId!]!;
    d.do({ kind: 'BattleDefend', stackId: st.id }, b.sides[st.side].playerId!);
  }
  expect(d.state.battle!.phase).toBe('engine');
}

describe('targetable catapult: attacker aim', () => {
  it('ground troops without a breach fire at the gate (it opens the road)', () => {
    const d = besiege([['hoplite', 30]]);
    expect(engineAimFor(d.catalog, d.state.battle!)).toBe('gate');
  });

  it('with a breach open (or no ground troops), the most threatening tower or keep comes first', () => {
    const d = besiege([['hoplite', 30], ['peltast', 20]]);
    const b = d.state.battle!;
    b.siege!.structures.find((s) => s.id === 'wall_2')!.hp = 0; // a breach: the road is open
    const aim = engineAimFor(d.catalog, b);
    expect(['keep', 'tower_n', 'tower_s']).toContain(aim);
    const air = besiege([['windcrest_griffin', 20]]);
    expect(['keep', 'tower_n', 'tower_s']).toContain(engineAimFor(air.catalog, air.state.battle!));
  });

  it('threat decides between turrets: the one whose shot would hurt this army most', () => {
    const d = besiege([['windcrest_griffin', 20], ['peltast', 30]]);
    const b = d.state.battle!;
    // The keep (20 damage) out-hurts a tower (10 damage) against the same army; the keep goes first while it stands.
    expect(engineAimFor(d.catalog, b)).toBe('keep');
    b.siege!.structures.find((s) => s.id === 'keep')!.hp = 0;
    expect(['tower_n', 'tower_s']).toContain(engineAimFor(d.catalog, b));
  });

  it('never a destroyed structure: with only walls left it fires at a wall; with nothing left it has no target', () => {
    const d = besiege([['windcrest_griffin', 20]], 1);
    const b = d.state.battle!;
    b.siege!.structures.find((s) => s.id === 'gate')!.hp = 0;
    const aim = engineAimFor(d.catalog, b)!;
    expect(b.siege!.structures.find((s) => s.id === aim)!.hp).toBeGreaterThan(0);
    for (const s of b.siege!.structures) s.hp = 0;
    expect(engineAimFor(d.catalog, b)).toBeNull();
  });

  it('in the engine phase the AI fires once (an explicit target and round); it never issues a free aim on creature turns', () => {
    const d = besiege([['hoplite', 30], ['peltast', 20]]);
    const first = chooseBattleAction(d.catalog, d.state);
    expect(first?.kind).not.toBe('BattleAimCatapult');
    toEnginePhase(d);
    expect(battleActingSide(d.state)).toBe('attacker');
    const pick = chooseBattleAction(d.catalog, d.state);
    expect(pick).toEqual({ kind: 'BattleFireCatapult', structureId: 'gate', expectedRound: 1 });
    const r = stepBattleAI(d.catalog, d.state, { playerSimulation: true });
    expect(r.command?.kind).toBe('BattleFireCatapult');
    expect(r.state.battle!.siege!.structures.find((s) => s.id === 'gate')!.hp).toBe(1);
    expect(r.state.battle!.round).toBe(2);
  });

  it('an automatic siege runs to the end with the engine phase each round', () => {
    const d = besiege([['windcrest_griffin', 30], ['hoplite', 40]], 2);
    d.autoBattle();
    expect(d.state.battle).toBeNull();
    expect(d.events.some((e) => e.kind === 'CatapultFired')).toBe(true);
    expect(d.events.some((e) => e.kind === 'SiegeCatapultAimed')).toBe(false);
  });
});

describe('targetable catapult: defender AI', () => {
  it('a defending shooter finishes a badly damaged engine (all in plain sight) rather than a modest shot at the troops', () => {
    const d = besiege([['hoplite', 20]], 1, [['peltast', 20]]);
    const b = d.state.battle!;
    const shooter = sideStacks(b, 'defender')[0]!;
    shooter.anchor = { col: 7, row: 0 };
    b.siege!.engine!.hp = 5;
    b.activeStackId = shooter.id as BattleStackId;
    const la = legalActions(d.catalog, d.state)!;
    expect(la.shootTargets.length).toBeGreaterThan(0); // the troops could be shot too
    expect(la.engine?.canShoot).toBe(true);
    expect(chooseBattleAction(d.catalog, d.state)).toEqual({ kind: 'BattleAttackEngine', stackId: shooter.id, engineId: SIEGE_ENGINE_ID, mode: 'shot' });
    // At full health, with the attacking troops close (no long-range penalty), it thins the troops instead.
    b.siege!.engine!.hp = 120;
    sideStacks(b, 'attacker')[0]!.anchor = { col: 5, row: 3 };
    expect(chooseBattleAction(d.catalog, d.state)?.kind).toBe('BattleShoot');
  });

  it('a defender beside a badly damaged engine finishes it rather than idling', () => {
    const d = besiege([['hoplite', 20]], 1, [['hoplite', 15]]);
    const b = d.state.battle!;
    const g = sideStacks(b, 'defender')[0]!;
    for (const s of sideStacks(b, 'attacker')) s.anchor = { col: 0, row: 10 };
    g.anchor = { col: 2, row: 0 };
    g.facing = -1;
    b.siege!.engine!.hp = 5;
    b.activeStackId = g.id as BattleStackId;
    const pick = chooseBattleAction(d.catalog, d.state);
    expect(pick).toMatchObject({ kind: 'BattleAttackEngine', stackId: g.id, engineId: SIEGE_ENGINE_ID, mode: 'melee' });
  });
});
