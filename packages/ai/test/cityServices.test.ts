/**
 * City dedication services and the computer (CITY DEDICATIONS handoff §06/§11): the AI
 * plays through the same quotes, so a dedicated AI town recruits and trains at the
 * discounted per-unit prices the rules charge — no AI-owned prices.
 */
import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import { dedicationGoldPrice, deepClone, resources, townGate, type GameEvent, type MatchState, type ScenarioFeatures } from '@pr/rules';
import { runAITurn } from '../src';

/** The rival's Eastharbor honors `godId` (Temple II, the god committed); its hero waits at the gate; the human hero far away. */
function rivalTown(godId: string, build: Record<string, number>, gold: number): { d: GameDriver; s: MatchState } {
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId: `ai-city-${godId}` });
  const s: MatchState = deepClone(d.state);
  (s.scenario as { features: ScenarioFeatures }).features = { ...s.scenario.features, cityDedicationsV1: true };
  for (const fog of Object.values(s.fog)) fog.explored = fog.explored.map(() => 1);
  const pantheon = s.players['rival']!.pantheon as { patronGodId: string | null; minorGodIds: string[] };
  pantheon.patronGodId = 'zeus';
  pantheon.minorGodIds = [godId];
  const town = s.towns['eastharbor']!;
  Object.assign(town.buildings, { pantheon_temple: 2, ...build });
  town.dedication = { activeGodId: godId, ownerId: 'rival', growthCredits: {}, lastProcessedWeek: 0 };
  town.buildUsedDay = s.day; // no construction this turn: the Gold is for the service under test
  s.heroes['rival_odysseus']!.position = townGate(d.catalog, s, town.id);
  s.heroes['rival_odysseus']!.movementPoints = 0;
  s.heroes['alexios']!.position = { q: 2, r: 2 };
  s.players['rival']!.wallet = resources({ gold, wood: 20, stone: 20, crystal: 10, favor: 0 });
  s.activePlayerId = 'rival';
  return { d, s };
}

describe('AI and city dedication services', () => {
  it('recruits the favored family at the discounted per-unit price (Demeter: Hoplites 60 → 57)', () => {
    const { d, s } = rivalTown('demeter', { dwelling_t1: 1 }, 3000);
    s.towns['eastharbor']!.population = { hoplite: 13 };
    const events: GameEvent[] = [];
    runAITurn(d.catalog, s, { onEvents: (e) => events.push(...e) });
    const recruits = events.filter((e): e is Extract<GameEvent, { kind: 'UnitsRecruited' }> => e.kind === 'UnitsRecruited' && e.townId === 'eastharbor');
    expect(recruits.length).toBeGreaterThan(0);
    for (const r of recruits) {
      const i = events.indexOf(r);
      const paid = events.slice(0, i).reverse().find((e): e is Extract<GameEvent, { kind: 'ResourcesSpent' }> => e.kind === 'ResourcesSpent')!;
      expect(r.creatureId).toBe('hoplite');
      expect(paid.amount.gold).toBe(dedicationGoldPrice(60, 5) * r.quantity);
    }
    expect(recruits.reduce((n, r) => n + r.quantity, 0)).toBe(13);
  });

  it('trains a visiting hero at the discounted academy price (Athena: 1000 → 800)', () => {
    // 3300 Gold: the AI keeps 2500 back, so only the discounted session fits.
    const { d, s } = rivalTown('athena', { training_academy: 1, dwelling_t1: 1 }, 3300);
    s.towns['eastharbor']!.population = {};
    const events: GameEvent[] = [];
    runAITurn(d.catalog, s, { onEvents: (e) => events.push(...e) });
    const trained = events.find((e): e is Extract<GameEvent, { kind: 'HeroTrained' }> => e.kind === 'HeroTrained');
    expect(trained).toBeDefined();
    expect(trained!.gold).toBe(800);
  });
});
