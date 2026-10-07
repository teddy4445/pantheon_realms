/**
 * The late-game computer player (owner request 2026-10-07): secondary heroes
 * hand their armies to the main hero from week three, the weekly miracle is kept
 * for a battle that matters, and a lost town is counterattacked.
 */
import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import { axialNeighbors, quoteMovement, type CreatureStackState, type HeroState, type MatchState } from '@pr/rules';
import { buildObservation, handOffTransfer, mainHero, recentlyLostTowns, strategicCandidates } from '../src';
import { decisiveBattleNear, interventionCandidates } from '../src/services';

const SKIRMISH = 'skirmish_twin_harbors';
const army = (a: [string, number][]): (CreatureStackState | null)[] => [...a.map(([creatureId, count], i) => ({ stackId: `s${i}`, creatureId, count })), ...Array(7 - a.length).fill(null)];

/** The rival (computer) with a second hero standing next to its first, on `day`. */
function twoRivalHeroes(day: number, main: [string, number][], courier: [string, number][]) {
  const d = GameDriver.mission(SKIRMISH, { matchId: `late-${day}` });
  const s = d.state;
  s.day = day;
  for (const fog of Object.values(s.fog)) fog.explored = fog.explored.map(() => 1);
  const lead = s.heroes['rival_odysseus']!;
  lead.army.slots = army(main);
  // Out in the field (three steps from its town, on no site), away from the human hero.
  s.heroes['alexios']!.position = { q: 1, r: 1 };
  const east = s.towns['eastharbor']!;
  const sites = new Set((d.catalog.missions[SKIRMISH]!.sites ?? []).map((x) => `${x.coord.q},${x.coord.r}`));
  const field = [...Array(7).keys()].flatMap((dq) => [...Array(7).keys()].map((dr) => ({ q: east.coord.q + dq - 3, r: east.coord.r + dr - 3 }))).find((c) => {
    if (sites.has(`${c.q},${c.r}`) || Math.abs(c.q - east.coord.q) + Math.abs(c.r - east.coord.r) + Math.abs(c.q + c.r - east.coord.q - east.coord.r) < 6) return false;
    const q = quoteMovement(d.catalog, s, lead.id, c);
    return q.reachable && !q.endsInEncounter;
  })!;
  lead.position = field;
  const def = Object.values(d.catalog.heroes).find((h) => h.pantheonId === lead.definitionId.split('_')[0] || (h.pantheonId === s.players['rival']!.pantheonId && h.id !== lead.definitionId))!;
  const second: HeroState = { ...structuredClone(lead), id: 'rival_second' as HeroState['id'], definitionId: def.id as HeroState['definitionId'], name: 'Second' };
  second.army.slots = army(courier);
  const free = axialNeighbors(lead.position).find((n) => quoteMovement(d.catalog, s, lead.id, n).reachable && !Object.values(s.heroes).some((h) => h.position.q === n.q && h.position.r === n.r))!;
  second.position = free;
  s.heroes[second.id] = second;
  s.activePlayerId = 'rival';
  return { d, s, lead, second };
}

describe('late-game hand-offs', () => {
  it('from week three a secondary hero next to the main army hands over its most valuable stack, keeping one creature', () => {
    const { d, s } = twoRivalHeroes(15, [['hoplite', 80], ['cyclops', 6]], [['minotaur', 12], ['hoplite', 20]]);
    const cands = strategicCandidates(d.catalog, buildObservation(d.catalog, s, 'rival'));
    const give = cands.find((c) => c.kind === 'TransferStack');
    expect(give).toMatchObject({ from: { kind: 'hero', heroId: 'rival_second' }, to: { kind: 'hero', heroId: 'rival_odysseus' } });
    // Apply hand-offs until none is left: the main army holds everything but one creature.
    const drv = new GameDriver(s, d.catalog);
    for (let i = 0; i < 6; i++) {
      const st = drv.state;
      const main = mainHero(d.catalog, st, [st.heroes['rival_odysseus']!, st.heroes['rival_second']!])!;
      const t = handOffTransfer(d.catalog, st, 'rival', st.heroes['rival_second']!, main.hero);
      if (!t) break;
      drv.do(t, 'rival');
    }
    const left = drv.state.heroes['rival_second']!.army.slots.reduce((n, x) => n + (x?.count ?? 0), 0);
    expect(left).toBe(1);
    const lead = drv.state.heroes['rival_odysseus']!.army.slots;
    expect(lead.some((x) => x?.creatureId === 'minotaur' && x.count === 12)).toBe(true);
  });

  it('not before week three', () => {
    const { d, s } = twoRivalHeroes(8, [['hoplite', 80], ['cyclops', 6]], [['minotaur', 12], ['hoplite', 20]]);
    const cands = strategicCandidates(d.catalog, buildObservation(d.catalog, s, 'rival'));
    expect(cands.some((c) => c.kind === 'TransferStack' && c.from.kind === 'hero' && c.to.kind === 'hero')).toBe(false);
  });
});

describe('the weekly miracle is kept for a battle that matters', () => {
  function withFavor(day: number, near: boolean): { d: GameDriver; s: MatchState } {
    const d = GameDriver.mission(SKIRMISH, { matchId: `miracle-${day}-${near}` });
    const s = d.state;
    s.day = day;
    s.players['rival']!.wallet.favor = 200;
    s.players['rival']!.pantheon.minorGodIds = ['x', 'y'];
    const lead = s.heroes['rival_odysseus']!;
    s.heroes['alexios']!.position = near ? { q: lead.position.q - 3, r: lead.position.r } : { q: lead.position.q - 60, r: lead.position.r };
    return { d, s };
  }
  it('mid-week with an enemy army near: no adventure miracle; at the end of the week: spent', () => {
    const near = withFavor(3, true);
    const heroes = [near.s.heroes['rival_odysseus']!];
    expect(decisiveBattleNear(near.s, 'rival', heroes)).toBe(true);
    expect(interventionCandidates(near.d.catalog, near.s, 'rival', heroes)).toEqual([]);
    const late = withFavor(6, true);
    expect(interventionCandidates(late.d.catalog, late.s, 'rival', [late.s.heroes['rival_odysseus']!]).length).toBeGreaterThan(0);
  });
});

describe('counterattack after losing a town', () => {
  it('records the loss for the loser and clears it when the town is retaken', () => {
    const d = GameDriver.mission(SKIRMISH, { matchId: 'lost-town' });
    const s = d.state;
    for (const fog of Object.values(s.fog)) fog.explored = fog.explored.map(() => 1);
    const east = s.towns['eastharbor']!;
    east.garrison.slots = army([]);
    s.heroes['rival_odysseus']!.status = 'retreated';
    const alexios = s.heroes['alexios']!;
    const from = axialNeighbors(east.coord).find((n) => {
      alexios.position = n;
      const q = quoteMovement(d.catalog, s, alexios.id, east.coord);
      return q.reachable && q.path.length === 1;
    })!;
    alexios.position = from;
    alexios.movementPoints = 2000;
    const events = d.do({ kind: 'MoveHero', heroId: alexios.id, destination: east.coord });
    expect(events.find((e) => e.kind === 'TownCaptured')).toMatchObject({ townId: 'eastharbor', playerId: 'player', fromPlayerId: 'rival' });
    expect(d.state.players['rival']!.lostTowns).toEqual([{ townId: 'eastharbor', day: d.state.day }]);
    expect([...recentlyLostTowns(d.state, 'rival')]).toEqual(['eastharbor']);
    // Three weeks later the urge to retake it has passed.
    expect([...recentlyLostTowns({ ...d.state, day: d.state.day + 22 }, 'rival')]).toEqual([]);
  });

  it('a town just lost is besieged at closer odds than an ordinary one', () => {
    // For some garrison size the rival attacks its lost town, but would not attack it as an ordinary enemy town.
    let found = false;
    for (const n of [4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40]) {
      const d = GameDriver.mission(SKIRMISH, { matchId: `retake-${n}` });
      const s = d.state;
      for (const fog of Object.values(s.fog)) fog.explored = fog.explored.map(() => 1);
      const west = s.towns['westharbor']!;
      west.ownerId = 'player';
      west.garrison.slots = army([['hoplite', n]]);
      s.heroes['alexios']!.position = { q: 1, r: 1 };
      const rival = s.heroes['rival_odysseus']!;
      rival.army.slots = army([['hoplite', 30]]);
      rival.position = axialNeighbors(west.coord).find((c) => {
        rival.position = c;
        const q = quoteMovement(d.catalog, s, rival.id, west.coord);
        return q.reachable && q.path.length === 1;
      })!;
      rival.movementPoints = 2000;
      s.activePlayerId = 'rival';
      const attacks = (st: MatchState) => strategicCandidates(d.catalog, buildObservation(d.catalog, st, 'rival')).some((c) => c.kind === 'MoveHero' && c.heroId === rival.id && c.destination.q === west.coord.q && c.destination.r === west.coord.r);
      const plain = attacks(s);
      s.players['rival']!.lostTowns = [{ townId: west.id as never, day: s.day }];
      const retake = attacks(s);
      if (retake && !plain) found = true;
      // Never the other way round.
      expect(plain && !retake).toBe(false);
    }
    expect(found).toBe(true);
  });
});
