/**
 * Battle playback order (presentation only): the rules report a stack's
 * destruction while applying the damage, before the blow that dealt it; the
 * battle view shows the blow first, so the fallen stack plays its hit and death
 * strips instead of lying down before it is struck. Same events, same end.
 */
import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import { NEUTRAL_PLAYER_ID, type BattleStackState, type GameEvent } from '@pr/rules';
import { battlePlaybackOrder } from '@pr/presentation';

function killingBlow(): readonly GameEvent[] {
  const missionId = 'skirmish_twin_harbors';
  const d = GameDriver.mission(missionId, { matchId: 'unit:playback-order' });
  for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
  const hero = d.hero();
  const mine = d.catalog.missions[missionId]!.sites.find((x) => x.id === 'sk_gold')!.coord;
  d.marchTo({ q: mine.q - 1, r: mine.r }, hero.id);
  d.do({ kind: 'MoveHero', heroId: hero.id, destination: mine, confirmEncounter: true });
  const b = d.state.battle!;
  const tmpl = Object.values(b.stacks)[0]!;
  const make = (id: string, side: 'attacker' | 'defender', creatureId: string, count: number, col: number): BattleStackState => ({
    ...structuredClone(tmpl),
    id,
    side,
    creatureId,
    anchor: { col, row: 5 },
    facing: side === 'attacker' ? 1 : -1,
    startingCount: count,
    totalHp: d.catalog.creatures[creatureId]!.stats!.hp * count,
    shotsRemaining: 0,
    retaliationsUsed: 0,
    waited: false,
    defending: false,
    moraleRolledThisRound: true,
    statuses: [],
    abilityUses: {},
  });
  b.stacks = { a: make('a', 'attacker', 'serpopard', 20, 6), z: make('z', 'defender', 'root_runner', 1, 7) };
  b.obstacles = [];
  b.siege = null;
  b.phase = 'normal';
  b.deployment = null;
  b.activeStackId = 'a';
  b.normalQueue = ['z'];
  b.waitQueue = [];
  const actor = b.sides.attacker.playerId ?? NEUTRAL_PLAYER_ID;
  return d.do({ kind: 'BattleMelee', stackId: 'a', targetId: 'z', from: { col: 6, row: 5 } }, actor);
}

describe('battle playback order', () => {
  it('shows a killing blow before the destruction it causes (the rules report the destruction first)', () => {
    const events = killingBlow();
    const kinds = events.map((e) => e.kind);
    expect(kinds.indexOf('BattleStackDestroyed')).toBeLessThan(kinds.indexOf('BattleAttack'));
    const shown = battlePlaybackOrder(events);
    const order = shown.map((e) => e.kind);
    expect(order.indexOf('BattleAttack')).toBe(order.indexOf('BattleStackDestroyed') - 1);
    // The same events, nothing lost or added.
    expect([...shown].sort((x, y) => x.eventId.localeCompare(y.eventId))).toEqual([...events].sort((x, y) => x.eventId.localeCompare(y.eventId)));
  });

  it('leaves a batch alone when nothing in it fell, and a destruction with no blow after it where it is', () => {
    const plain: GameEvent[] = [
      { kind: 'BattleStackDefended', stackId: 'a', eventId: '1.0', revision: 1 } as GameEvent,
      { kind: 'BattleStackDestroyed', stackId: 'b', eventId: '1.1', revision: 1 } as GameEvent,
      { kind: 'BattleRoundStarted', round: 2, eventId: '1.2', revision: 1 } as GameEvent,
    ];
    expect(battlePlaybackOrder(plain)).toEqual(plain);
  });
});
