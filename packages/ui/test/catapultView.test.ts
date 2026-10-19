/**
 * The battle screen's view of the targetable siege catapult (targetableCatapultV1): a click on the
 * board and a choice in the catapult panel send the same validated orders; creature-only choices
 * that land on the engine get a clear reason; the combat log tells every engine event.
 */
import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import { axialNeighbors, legalActions, quoteMovement, sideStacks, SIEGE_ENGINE_ID, type BattleStackId, type CreatureStackState } from '@pr/rules';
import { catapultBoardClick, engineCommandable, engineSiegeView, engineTargetCells, keepClick } from '../src/app/catapultView';
import { battleLogLines, recordBattleEvents } from '../src/app/battleLog';

const army = (a: [string, number][]): (CreatureStackState | null)[] => [...a.map(([creatureId, count]) => ({ creatureId, count })), ...Array(7 - a.length).fill(null)];

function besiege(level: 1 | 2 | 3 = 2): GameDriver {
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId: `unit:catapult-${level}` });
  const s = d.state;
  for (const fog of Object.values(s.fog)) fog.explored = fog.explored.map(() => 1);
  const east = s.towns['eastharbor']!;
  east.buildings['fortifications'] = level;
  east.garrison.slots = army([['peltast', 12]]);
  s.heroes['rival_odysseus']!.status = 'retreated';
  const hero = s.heroes['alexios']!;
  hero.army.slots = army([['hoplite', 20], ['peltast', 10]]);
  for (const n of axialNeighbors(east.coord)) {
    hero.position = n;
    const q = quoteMovement(d.catalog, s, hero.id, east.coord);
    if (q.reachable && q.path.length === 1) break;
  }
  hero.movementPoints = 2000;
  d.do({ kind: 'MoveHero', heroId: hero.id, destination: east.coord, confirmEncounter: true });
  return d;
}

function toEnginePhase(d: GameDriver): void {
  for (let i = 0; i < 40 && d.state.battle!.phase !== 'engine'; i++) {
    const b = d.state.battle!;
    const st = b.stacks[b.activeStackId!]!;
    d.do({ kind: 'BattleDefend', stackId: st.id }, b.sides[st.side].playerId!);
  }
}

const normal = { kind: 'normal' };
const at = (col: number, row: number) => ({ cell: { col, row }, offset: { x: 0, y: 0 } });

describe('catapult view', () => {
  it('the board view carries the engine; its phase is commandable only by its human side', () => {
    const d = besiege();
    expect(engineSiegeView(d.state.battle!)).toEqual({ id: SIEGE_ENGINE_ID, side: 'attacker', cells: [{ col: 0, row: 0 }, { col: 1, row: 0 }], hp: 120, maxHp: 120 });
    expect(engineCommandable(d.state, true, false)).toBe(false);
    toEnginePhase(d);
    expect(engineCommandable(d.state, true, false)).toBe(true);
    expect(engineCommandable(d.state, true, true)).toBe(false); // a playback is running
  });

  it('in the engine phase, a click on a wall, the gate, a tower cell or the keep aims; the same order as the list', () => {
    const d = besiege(3);
    toEnginePhase(d);
    const click = (col: number, row: number) => catapultBoardClick(d.catalog, d.state, null, normal, { col, row }, at(col, row), true);
    expect(click(10, 5)).toEqual({ kind: 'command', payload: { kind: 'BattleAimCatapult', structureId: 'gate' } });
    expect(click(10, 0)).toEqual({ kind: 'command', payload: { kind: 'BattleAimCatapult', structureId: 'tower_n' } });
    expect(click(10, 3)).toEqual({ kind: 'command', payload: { kind: 'BattleAimCatapult', structureId: 'wall_2' } });
    expect(keepClick(d.state, 'keep', true)).toEqual({ kind: 'command', payload: { kind: 'BattleAimCatapult', structureId: 'keep' } });
    expect(click(5, 5)).toMatchObject({ kind: 'toast' });
    d.state.battle!.siege!.structures.find((s) => s.id === 'gate')!.hp = 0;
    expect(click(10, 5)).toEqual({ kind: 'toast', message: 'Gate is already destroyed: choose another target' });
    expect(keepClick(d.state, 'keep', false)).toBeNull();
  });

  it('on a defender turn the engine cells are a target: shot or strike, a damage spell, never an ability', () => {
    const d = besiege(1);
    const b = d.state.battle!;
    const shooter = sideStacks(b, 'defender')[0]!;
    shooter.anchor = { col: 7, row: 1 };
    b.activeStackId = shooter.id as BattleStackId;
    const la = legalActions(d.catalog, d.state)!;
    expect(engineTargetCells(b, la, normal)).toEqual(b.siege!.engine!.cells);
    expect(catapultBoardClick(d.catalog, d.state, la, normal, { col: 0, row: 0 }, at(0, 0), false)).toEqual({ kind: 'command', payload: { kind: 'BattleAttackEngine', stackId: shooter.id, engineId: SIEGE_ENGINE_ID, mode: 'shot' } });
    expect(catapultBoardClick(d.catalog, d.state, la, { kind: 'ability', abilityId: 'family_ward' }, { col: 1, row: 0 }, at(1, 0), false)).toEqual({ kind: 'toast', message: 'Ward works only on creatures: the catapult is a siege engine' });
    // A cell elsewhere is not about the engine: the screen's own click handling goes on.
    expect(catapultBoardClick(d.catalog, d.state, la, normal, { col: 5, row: 5 }, at(5, 5), false)).toBeNull();
  });

  it('the combat log tells the engine phase, the shot, a skip and the engine’s damage', () => {
    const d = besiege(2);
    toEnginePhase(d);
    const id = d.state.battle!.battleId;
    const r1 = d.do({ kind: 'BattleFireCatapult', structureId: 'keep', expectedRound: 1 }, 'player');
    recordBattleEvents(d.catalog, d.state, d.events.filter((e) => e.kind === 'CatapultPhaseStarted'), 'full');
    recordBattleEvents(d.catalog, d.state, r1, 'full');
    toEnginePhase(d);
    recordBattleEvents(d.catalog, d.state, d.do({ kind: 'BattleSkipCatapult', expectedRound: 2 }, 'player'), 'full');
    const log = battleLogLines(id).join('\n');
    expect(log).toMatch(/Catapult phase: choose a target/);
    expect(log).toMatch(/The catapult fires at the keep/);
    expect(log).toMatch(/Catapult strikes the keep \(1 left\)/);
    expect(log).toMatch(/holds its fire/);
  });
});
