/**
 * The strategic AI with coastal sites and sea salvage (sea-sites kit 2026-10-17): it sails onto
 * floating salvage, walks into a coastal watchtower, explores a wreck beside its ship only when strong
 * enough by the public outcome table (never the wreck's hidden outcome), and takes a waiting artifact
 * — through the same quotes and commands a player uses, deterministically.
 */
import { describe, expect, it } from 'vitest';
import { processCommand, shipInvariantIssues, type CustomSite, type GameEvent, type MatchState } from '@pr/rules';
import { catalog, cellOf, navalMatch, slots } from '@pr/testing';
import { battleActor, buildObservation, runAITurn, seaSiteCandidates, stepBattleAI, strategicCandidates, wreckThreatPrior } from '../src';

const AI = 'player';
const H = 'leader_1';

function match(outcome: NonNullable<CustomSite['outcome']> = 'guarded_salvage', aboard = true, army: [string, number][] = [['minotaur', 12], ['griffin', 10], ['hoplite', 40], ['peltast', 20]]): MatchState {
  const s = navalMatch({
    controllers: ['ai', 'human'],
    ships: (doc) => [{ id: 'free', ...cellOf(doc, 10, 8) }, { id: 'a', ...cellOf(doc, 12, 10), owner: 0 }],
    sites: (doc) => [
      { id: 'tower', kind: 'coastal_watchtower', ...cellOf(doc, 9, 4) },
      { id: 'wood', kind: 'sea_pickup', resource: 'wood', amount: 5, ...cellOf(doc, 13, 6) },
      { id: 'wreck', kind: 'shipwreck', outcome, ...cellOf(doc, 15, 16) },
    ],
  });
  const h = s.heroes[H]!;
  h.army.slots = slots(army);
  if (aboard) {
    const ship = s.world.ships!['map_ship_a']!;
    ship.heroId = H;
    ship.state = 'occupied';
    h.position = { ...ship.coord };
    h.movementPoints = 1500;
  }
  // The rival stays home (no interference) behind a garrison the AI will not besiege.
  s.heroes['leader_2']!.status = 'retreated';
  s.towns['town_2']!.garrison.slots = slots([['cyclops', 30], ['minotaur', 40], ['griffin', 60]]);
  return s;
}

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
    if (s.outcome.status !== 'running') break;
    if (s.players[s.activePlayerId]!.controller === 'ai') {
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

describe('strategic AI and sea sites', () => {
  it('sails onto salvage, takes the coastal watchtower and explores the wreck when strong enough, over a few days', () => {
    const events: GameEvent[] = [];
    const end = play(match('guarded_salvage'), 8, events);
    expect(end.world.sites['wood']!.claimed).toBe(true);
    expect(end.world.sites['tower']!.owner).toBe(AI);
    expect(events.some((e) => e.kind === 'WreckExplored' && e.playerId === AI)).toBe(true);
    expect(end.world.sites['wreck']!.wreck?.phase).toBe('cleared');
    expect(shipInvariantIssues(catalog, end)).toEqual([]);
  });

  it('does not explore a wreck it cannot beat by the public table, whatever is really aboard', () => {
    const weak: [string, number][] = [['hoplite', 2]];
    for (const outcome of ['abandoned_cargo', 'guarded_salvage', 'rare_cache'] as const) {
      const s = match(outcome, true, weak);
      const ship = s.world.ships!['map_ship_a']!;
      // Beside the wreck.
      ship.coord = cellOf(s.world.map, 15, 15);
      s.heroes[H]!.position = { ...ship.coord };
      const obs = buildObservation(catalog, s, AI);
      expect(seaSiteCandidates(catalog, obs.belief, AI, [obs.belief.heroes[H]!], 1.3)).toEqual([]);
    }
  });

  it('its plan does not depend on the wreck’s hidden outcome', () => {
    const plan = (outcome: NonNullable<CustomSite['outcome']>) => {
      const s = match(outcome);
      const ship = s.world.ships!['map_ship_a']!;
      ship.coord = cellOf(s.world.map, 15, 15);
      s.heroes[H]!.position = { ...ship.coord };
      return strategicCandidates(catalog, buildObservation(catalog, s, AI));
    };
    const a = plan('abandoned_cargo');
    expect(a).toEqual(plan('guarded_salvage'));
    expect(a).toEqual(plan('rare_cache'));
    expect(a.some((c) => c.kind === 'ExploreWreck')).toBe(true);
    expect(wreckThreatPrior(catalog)).toBeGreaterThan(0);
  });

  it('is deterministic: the same state gives the same turn', () => {
    const e1: GameEvent[] = [];
    const e2: GameEvent[] = [];
    const a = play(match('rare_cache'), 3, e1);
    const b = play(match('rare_cache'), 3, e2);
    expect(e1.map((e) => e.kind)).toEqual(e2.map((e) => e.kind));
    expect(a.revision).toBe(b.revision);
  });
});
