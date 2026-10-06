import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import { armyStrength, deepClone, townFortificationLevel, townGate, type MatchState } from '@pr/rules';
import { buildObservation, fewCreaturesFactor, fightingStrength, homeGuardShare, runAITurn, strategicCandidates } from '../src';
import { heroPower } from '../src/assessment';

const SKIRMISH = 'skirmish_twin_harbors';
const slot = (creatureId: string, count: number) => ({ stackId: `t-${creatureId}-${count}`, creatureId, count });
const plain = (d: GameDriver, slots: readonly ({ creatureId: string; count: number } | null)[]) => armyStrength(d.catalog, slots.filter((x): x is { creatureId: string; count: number } => !!x && x.count > 0));

describe('AI strength: few big creatures (2026-10-06)', () => {
  it('judges a lone big creature at twice the shared heuristic, big stacks about as before', () => {
    const d = GameDriver.mission(SKIRMISH);
    expect(fewCreaturesFactor(1)).toBe(2);
    expect(fewCreaturesFactor(2)).toBe(1.5);
    expect(fewCreaturesFactor(40)).toBeCloseTo(1.025);
    const one = [{ creatureId: 'cyclops', count: 1 }];
    expect(fightingStrength(d.catalog, one)).toBeCloseTo(2 * armyStrength(d.catalog, one));
    const many = [{ creatureId: 'hoplite', count: 60 }];
    expect(fightingStrength(d.catalog, many) / armyStrength(d.catalog, many)).toBeLessThan(1.02);
  });

  it('no longer attacks a lone tier-7 guard with an army of 1.5× its plain strength, still does with 3×', () => {
    const d = GameDriver.mission(SKIRMISH);
    const gold = d.catalog.missions[SKIRMISH]!.sites.find((x) => x.id === 'sk_gold')!.coord;
    const plan = (k: number) => {
      const s: MatchState = deepClone(d.state);
      for (const fog of Object.values(s.fog)) fog.explored = fog.explored.map(() => 1);
      s.world.sites['sk_gold']!.guard = [{ creatureId: 'cyclops', count: 1 }];
      const hero = s.heroes['alexios']!;
      hero.position = { q: 9, r: 3 };
      const rival = s.heroes['rival_odysseus']!;
      rival.position = { q: gold.q + 2, r: gold.r };
      rival.movementPoints = 2000;
      rival.attributes = { attack: 0, defense: 0, power: 0, knowledge: 0 };
      rival.skills = [];
      rival.equipment = {};
      const per = armyStrength(d.catalog, [{ creatureId: 'hoplite', count: 1 }]);
      const n = Math.round((k * armyStrength(d.catalog, [{ creatureId: 'cyclops', count: 1 }])) / per);
      rival.army.slots = [slot('hoplite', Math.ceil(n / 2)), slot('hoplite', Math.floor(n / 2)), null, null, null, null, null].map((x, i) => (i === 1 && x ? { ...x, creatureId: 'peltast', count: Math.round((Math.floor(n / 2) * per) / armyStrength(d.catalog, [{ creatureId: 'peltast', count: 1 }])) } : x));
      s.activePlayerId = 'rival';
      return strategicCandidates(d.catalog, buildObservation(d.catalog, s, 'rival'));
    };
    const attacks = (cs: ReturnType<typeof strategicCandidates>) => cs.some((c) => c.kind === 'MoveHero' && c.heroId === 'rival_odysseus' && c.destination.q === gold.q && c.destination.r === gold.r);
    expect(attacks(plan(1.5))).toBe(false);
    expect(attacks(plan(3.2))).toBe(true);
  });
});

describe('AI home guard (2026-10-06)', () => {
  /** The rival's hero inside Eastharbor with a garrison, the human hero far away, on `day`. */
  function visit(day: number): { d: GameDriver; s: MatchState } {
    const d = GameDriver.mission(SKIRMISH, { matchId: `home-guard-${day}` });
    const s: MatchState = deepClone(d.state);
    for (const fog of Object.values(s.fog)) fog.explored = fog.explored.map(() => 1);
    s.day = day;
    const town = s.towns['eastharbor']!;
    const hero = s.heroes['rival_odysseus']!;
    hero.position = townGate(d.catalog, s, town.id);
    hero.movementPoints = 0; // stays: only the army moves this turn
    hero.army.slots = [slot('hoplite', 10), null, null, null, null, null, null];
    town.garrison.slots = [slot('hoplite', 30), slot('peltast', 20), slot('cyclops', 2), null, null, null, null];
    s.players['rival']!.wallet.gold = 0; // no recruits this turn
    s.heroes['alexios']!.position = { q: 2, r: 2 };
    s.activePlayerId = 'rival';
    return { d, s };
  }

  it('keeps a share of the strength in the garrison from the second week, the lowest tiers first', () => {
    const { d, s } = visit(10);
    const share = homeGuardShare(d.catalog, s, 'rival');
    expect(share).toBeGreaterThanOrEqual(0.1);
    const before = plain(d, [...s.heroes['rival_odysseus']!.army.slots, ...s.towns['eastharbor']!.garrison.slots]);
    const after = runAITurn(d.catalog, s);
    const g = plain(d, after.towns['eastharbor']!.garrison.slots);
    const h = plain(d, after.heroes['rival_odysseus']!.army.slots);
    expect(g + h).toBeCloseTo(before);
    expect(g).toBeGreaterThanOrEqual(share * before - 1e-6);
    // Not much more than the guard: the hero takes the rest.
    expect(g).toBeLessThan(share * before + armyStrength(d.catalog, [{ creatureId: 'cyclops', count: 1 }]));
    // The cyclopes (highest tier) went to the hero; the guard is hoplites/peltasts.
    expect(after.heroes['rival_odysseus']!.army.slots.some((x) => x?.creatureId === 'cyclops' && x.count === 2)).toBe(true);
    expect(after.towns['eastharbor']!.garrison.slots.every((x) => !x || x.creatureId !== 'cyclops' || x.count === 0)).toBe(true);
  });

  it('takes the whole garrison in the first three days, half the guard stays in the rest of week 1', () => {
    const { d, s } = visit(3);
    expect(homeGuardShare(d.catalog, s, 'rival')).toBe(0);
    const after = runAITurn(d.catalog, s);
    expect(plain(d, after.towns['eastharbor']!.garrison.slots)).toBe(0);
    const late = visit(5);
    expect(homeGuardShare(late.d.catalog, late.s, 'rival')).toBeCloseTo(homeGuardShare(d.catalog, visit(10).s, 'rival') / 2);
  });

  it('leaves the lowest tier behind when the garrison is empty', () => {
    const { d, s } = visit(12);
    const town = s.towns['eastharbor']!;
    town.garrison.slots = [null, null, null, null, null, null, null];
    s.heroes['rival_odysseus']!.army.slots = [slot('cyclops', 3), slot('hoplite', 40), slot('peltast', 20), null, null, null, null];
    const share = homeGuardShare(d.catalog, s, 'rival');
    const total = plain(d, s.heroes['rival_odysseus']!.army.slots);
    const after = runAITurn(d.catalog, s);
    const left = after.towns['eastharbor']!.garrison.slots.filter((x) => x && x.count > 0);
    expect(plain(d, left)).toBeGreaterThanOrEqual(share * total - 1e-6);
    expect(left.every((x) => x!.creatureId === 'hoplite' || x!.creatureId === 'peltast')).toBe(true);
  });

  it('keeps enough at home to hold the walls against a visible enemy hero the visitor goes out to meet', () => {
    const { d, s } = visit(10);
    const town = s.towns['eastharbor']!;
    const enemy = s.heroes['alexios']!;
    enemy.position = { q: town.coord.q - 5, r: town.coord.r };
    enemy.army.slots = [slot('hoplite', 20), slot('peltast', 12), null, null, null, null, null];
    const before = plain(d, [...s.heroes['rival_odysseus']!.army.slots, ...town.garrison.slots]);
    const threat = heroPower(d.catalog, s, enemy);
    // The visitor and the garrison together beat it in the field, so the town is not held (no "threatened" freeze)...
    expect(threat * 1.2).toBeLessThan(fightingStrength(d.catalog, [...s.heroes['rival_odysseus']!.army.slots, ...town.garrison.slots]));
    const after = runAITurn(d.catalog, s);
    const g = plain(d, after.towns['eastharbor']!.garrison.slots);
    // ...but what stays behind holds the walls against that hero alone.
    const walls = 1 + 0.25 * townFortificationLevel(d.catalog, town);
    expect(g).toBeGreaterThanOrEqual(Math.min(0.6 * before, threat / walls) - 1e-6);
    expect(g).toBeGreaterThan(homeGuardShare(d.catalog, s, 'rival') * before);
  });
});
