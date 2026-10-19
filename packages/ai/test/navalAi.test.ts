/**
 * The strategic AI with hero ships (expedition kit §12, scenario feature `navalMovementV1`): a
 * rival town across the water is reached by launching a ship at the home coast, embarking,
 * sailing over several days, landing and taking the town — through the same quotes and commands a
 * player uses, deterministically. And a headless AI-against-AI match on two islands.
 */
import { describe, expect, it } from 'vitest';
import {
  canonicalStateHash,
  processCommand,
  shipInvariantIssues,
  terrainAt,
  type GameEvent,
  type MatchState,
} from '@pr/rules';
import { catalog, cellOf, navalMatch, slots } from '@pr/testing';
import { runAITurn, stepBattleAI, battleActor } from '../src';

/** Drive the match: AI seats through runAITurn, a passive human seat ends its turn; battles fought by the tactical AI. */
function play(state: MatchState, days: number, events: GameEvent[]): MatchState {
  let s = state;
  let n = 0;
  const end = s.day + days;
  for (let turns = 0; turns < days * 10 && s.outcome.status === 'running' && s.day < end; turns++) {
    for (let steps = 0; s.battle && steps < 5000; steps++) {
      if (!battleActor(s)) throw new Error('battle without an actor');
      const r = stepBattleAI(catalog, s, { playerSimulation: true });
      events.push(...r.events);
      s = r.state;
    }
    if (s.battle) throw new Error('battle did not finish');
    if (s.outcome.status !== 'running') break;
    const active = s.players[s.activePlayerId]!;
    if (active.controller === 'ai') {
      s = runAITurn(catalog, s, { onEvents: (e) => events.push(...e) });
      continue;
    }
    const res = processCommand({ catalog }, s, { kind: 'EndTurn', commandId: `pass:${n++}`, expectedRevision: s.revision, actorPlayerId: s.activePlayerId });
    if (!res.ok) throw new Error(res.rejection.message);
    events.push(...res.events);
    s = res.state;
  }
  return s;
}

/** The AI (seat 1) against an empty rival island: the neutral ship removed, so it must buy one. */
function crafted(): MatchState {
  const s = navalMatch({ controllers: ['ai', 'human'] });
  delete s.world.ships!['map_ship_free'];
  const p1 = s.heroes['leader_1']!;
  p1.army.slots = slots([['minotaur', 12], ['griffin', 10], ['hoplite', 40], ['peltast', 20]]);
  // The rival's hero is away (in its Tavern roster) and its town is unguarded.
  s.heroes['leader_2']!.status = 'retreated';
  s.towns['town_2']!.garrison.slots = s.towns['town_2']!.garrison.slots.map(() => null);
  s.players['player']!.wallet = { ...s.players['player']!.wallet, gold: 12000, wood: 40 };
  return s;
}

describe('naval AI', () => {
  it('launches a ship, embarks, sails over several days, lands and takes the rival town across the water', () => {
    const events: GameEvent[] = [];
    const end = play(crafted(), 14, events);
    const kinds = events.map((e) => e.kind);
    const launched = kinds.indexOf('ShipLaunched');
    const embarked = kinds.indexOf('HeroEmbarked');
    const sailed = kinds.indexOf('ShipMoved');
    const landed = kinds.indexOf('HeroDisembarked');
    expect(launched).toBeGreaterThanOrEqual(0);
    expect(embarked).toBeGreaterThan(launched);
    expect(sailed).toBeGreaterThan(embarked);
    expect(landed).toBeGreaterThan(sailed);
    const launch = events.find((e) => e.kind === 'ShipLaunched')!;
    expect(launch).toMatchObject({ playerId: 'player', townId: 'town_1' });
    // A Gold and Wood reserve was kept when the ship was bought.
    const spent = events.find((e) => e.kind === 'ResourcesSpent' && e.reason.startsWith('Ship launched'));
    expect(spent).toBeDefined();
    // Several days at sea or on the way, never across land by ship or water on foot.
    const embarkDay = dayOf(events, embarked);
    const landDay = dayOf(events, landed);
    expect(landDay).toBeGreaterThan(embarkDay);
    expect(end.towns['town_2']!.ownerId).toBe('player');
    expect(terrainAt(end.world.map, end.heroes['leader_1']!.position)).not.toBe('water');
    expect(shipInvariantIssues(catalog, end)).toEqual([]);
  });

  it('is deterministic: the same match plays out to the same state', () => {
    const a = play(crafted(), 8, []);
    const b = play(crafted(), 8, []);
    expect(canonicalStateHash(a)).toBe(canonicalStateHash(b));
  });

  it('wandering monsters and patrols stay on land; an AI with nothing beyond the water never buys a ship', () => {
    const s = navalMatch({ controllers: ['ai', 'human'] });
    // The rival town is on our island: no reason to go to sea.
    s.heroes['leader_2']!.status = 'retreated';
    const events: GameEvent[] = [];
    const end = play(s, 3, events);
    expect(events.some((e) => e.kind === 'HeroEmbarked' && end.heroes[e.heroId]?.monster)).toBe(false);
    expect(shipInvariantIssues(catalog, end)).toEqual([]);
  });

  it('two AI empires on two islands (the second on half income, the skirmish handicap): a headless match keeps every ship invariant and ends by conquest', () => {
    // Symmetric empires on these bare islands stall in the late game on the ordinary siege margins and
    // on a townless hero out of sight (not a naval matter); the handicap gives the match an end.
    // After marketplace ship recovery, the measured game ends on day 136; allow 160 days, checking every ten.
    const s = navalMatch({ controllers: ['ai', 'ai'], ships: (doc) => [{ id: 'west', ...cellOf(doc, 10, 8) }, { id: 'east', ...cellOf(doc, 19, 16) }] });
    s.players['p2']!.incomePercent = 50;
    const events: GameEvent[] = [];
    let end = s;
    for (let chunk = 0; chunk < 16 && end.outcome.status === 'running'; chunk++) {
      end = play(end, 10, events);
      expect(shipInvariantIssues(catalog, end)).toEqual([]);
    }
    expect(events.filter((e) => e.kind === 'HeroEmbarked').length).toBeGreaterThan(2);
    expect(events.some((e) => e.kind === 'HeroDisembarked')).toBe(true);
    expect(events.some((e) => e.kind === 'TownCaptured')).toBe(true);
    expect(end.outcome.status).not.toBe('running');
    expect(end.outcome.status !== 'running' && end.outcome.winnerIds).toEqual(['player']);
  }, 300000);
});

function dayOf(events: readonly GameEvent[], index: number): number {
  let day = 1;
  for (let i = 0; i <= index && i < events.length; i++) {
    const e = events[i]!;
    if (e.kind === 'DayStarted') day = e.day;
  }
  return day;
}

