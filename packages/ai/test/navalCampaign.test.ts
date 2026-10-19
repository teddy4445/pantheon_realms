/**
 * The AI on the naval random templates (navalCampaign.ts, 2026-10-17): it keeps the price of a ship
 * while it has none at its coasts, uses its free starting ship instead of buying one, explores by sea,
 * lands on other islands over several days and is deterministic; on maps without the naval-only travel
 * rule it proposes nothing (the existing naval planner and its tests are unchanged). The complete
 * headless matches are a development tool (tools/naval-random/matches.measure.ts) because they take
 * minutes; here a short, bounded run.
 */
import { describe, expect, it } from 'vitest';
import { buildCatalog } from '@pr/content';
import { canonicalStateHash, shipInvariantIssues, type GameEvent, type MatchState } from '@pr/rules';
import { createGeneratedMatch, createRandomSkirmish, type SkirmishGenOptions } from '@pr/campaign';
import { catalog as testCatalog, navalMatch } from '@pr/testing';
import { navalCampaignActive, navalCampaignCandidates, navalReserve, runAITurn, heroTargets } from '../src';

const catalog = buildCatalog();

function aiMatch(mapType: 'shattered_crown' | 'serpent_straits', seed: number): MatchState {
  const g = createRandomSkirmish(catalog, {
    seed,
    size: 'huge',
    seats: [
      { pantheonId: 'greek', controller: 'ai' },
      { pantheonId: 'norse', controller: 'ai' },
    ],
    victory: mapType === 'shattered_crown' ? { type: 'hold_relic', days: 7 } : { type: 'elimination' },
    monsters: 'few',
    mapType,
  } as SkirmishGenOptions);
  return createGeneratedMatch(catalog, g, { matchId: `ai-naval-${mapType}-${seed}` }).match;
}

function play(state: MatchState, days: number, events: GameEvent[] = []): MatchState {
  let s = state;
  const end = s.day + days;
  for (let guard = 0; guard < days * 8 && s.outcome.status === 'running' && s.day < end; guard++) {
    const before = s.day;
    s = runAITurn(catalog, s, { maxCommands: 400, onEvents: (e) => events.push(...e.map((x) => ({ ...x, day: s.day }) as GameEvent)) });
    void before;
  }
  return s;
}

describe('naval campaign AI', () => {
  it('is active only on maps with the naval-only travel rule', () => {
    expect(navalCampaignActive(catalog, aiMatch('serpent_straits', 3))).toBe(true);
    const plain = navalMatch({ controllers: ['ai', 'human'] });
    expect(navalCampaignActive(testCatalog, plain)).toBe(false);
    const hero = plain.heroes['leader_1']!;
    expect(navalCampaignCandidates(testCatalog, plain, 'player', hero, heroTargets(testCatalog, plain, 'player', hero), true)).toEqual({ first: [], last: [] });
    expect(navalReserve(testCatalog, plain, 'player')).toEqual({ gold: 0, wood: 0 });
  });

  it('keeps no ship reserve while its free ship lies at its coast, the price of a ship once it has none there', () => {
    const s = aiMatch('shattered_crown', 5);
    expect(navalReserve(catalog, s, 'player')).toEqual({ gold: 0, wood: 0 });
    const gone = structuredClone(s);
    delete gone.world.ships!['start_ship_1'];
    expect(navalReserve(catalog, gone, 'player')).toEqual({ gold: 1500, wood: 10 });
  });

  it('uses its free ship (no purchase on the first day), embarks, sails over several days and lands on another island; deterministic', () => {
    const events: (GameEvent & { day?: number })[] = [];
    const end = play(aiMatch('shattered_crown', 7), 12, events);
    const day1Launches = events.filter((e) => e.kind === 'ShipLaunched' && e.day === 1);
    expect(day1Launches).toEqual([]);
    const embarks = events.filter((e) => e.kind === 'HeroEmbarked');
    const lands = events.filter((e) => e.kind === 'HeroDisembarked');
    expect(embarks.length).toBeGreaterThan(0);
    expect(lands.length).toBeGreaterThan(0);
    // Sailing took more than one day for at least one voyage (embark day < landing day).
    expect(lands.some((l) => embarks.some((e) => e.kind === 'HeroEmbarked' && l.kind === 'HeroDisembarked' && e.heroId === l.heroId && (e.day ?? 0) < (l.day ?? 0)))).toBe(true);
    expect(shipInvariantIssues(catalog, end)).toEqual([]);
    const again = play(aiMatch('shattered_crown', 7), 12);
    expect(canonicalStateHash(again)).toBe(canonicalStateHash(end));
  }, 120_000);
});
