import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import { HIRE_STARTING_TROOPS, heroHiredThisWeek, hireCandidates, hireOptions, quoteHireHero, townGate, weekOf, type MatchState } from '../src';

const aiTurn = (s: MatchState) => !!s.battle?.activeStackId && s.battle.sides[s.battle.stacks[s.battle.activeStackId]!.side].controller === 'ai';

const SKIRMISH = 'skirmish_twin_harbors';
const M01 = 'three_beacons_m01';

describe('hero hiring (Tavern)', () => {
  it('is disabled with the scenario reason in the campaign', () => {
    const d = GameDriver.mission(M01);
    const q = quoteHireHero(d.catalog, d.state, 'player', 'asterion', 'heracles');
    expect(q.legal).toBe(false);
    expect(q.code).toBe('not_in_scope');
  });

  it('hires a listed hero once, charges Gold, and requires an empty town tile', () => {
    const d = GameDriver.mission(SKIRMISH);
    const playerId = d.state.playerOrder[0]!;
    const town = Object.values(d.state.towns).find((t) => t.ownerId === playerId)!;
    const candidates = hireCandidates(d.catalog, d.state, town.id);
    expect(candidates.length).toBeGreaterThan(0);
    // The starting hero stands in town: hiring is blocked until they leave.
    const blocked = quoteHireHero(d.catalog, d.state, playerId, town.id, candidates[0]!);
    expect(blocked.code).toBe('not_present');
    const hero = Object.values(d.state.heroes).find((h) => h.ownerId === playerId)!;
    d.marchTo({ q: town.coord.q + 2, r: town.coord.r }, hero.id);
    const gold = d.player.wallet.gold;
    const events = d.do({ kind: 'HireHero', townId: town.id, heroDefinitionId: candidates[0]! });
    expect(events.some((e) => e.kind === 'HeroHired')).toBe(true);
    expect(d.player.wallet.gold).toBe(gold - d.catalog.rulesProfile.heroHireCost);
    const hired = Object.values(d.state.heroes).find((h) => h.definitionId === candidates[0]);
    // design/02: 10 of the town's tier-1 base creature (Hoplites for Greek).
    expect(hired?.army.slots[0]).toMatchObject({ creatureId: 'hoplite', count: HIRE_STARTING_TROOPS });
    expect(hired?.movementPoints).toBeGreaterThan(0);
    expect(hireCandidates(d.catalog, d.state, town.id)).not.toContain(candidates[0]);
  });

  it('rehires a retreated hero from the return roster without a fresh army and with no movement', () => {
    const d = GameDriver.mission(SKIRMISH);
    const playerId = d.state.playerOrder[0]!;
    const town = Object.values(d.state.towns).find((t) => t.ownerId === playerId)!;
    const hero = Object.values(d.state.heroes).find((h) => h.ownerId === playerId)!;
    // Walk next to the guarded gold mine, attack, then retreat on the first friendly activation.
    const mine = d.catalog.missions[SKIRMISH]!.sites.find((s) => s.id === 'sk_gold')!.coord;
    d.marchTo({ q: mine.q - 1, r: mine.r }, hero.id);
    d.do({ kind: 'MoveHero', heroId: hero.id, destination: mine, confirmEncounter: true });
    expect(d.state.battle).not.toBeNull();
    for (let i = 0; i < 20 && aiTurn(d.state); i++) d.autoBattleStep();
    d.do({ kind: 'BattleRetreat' });
    expect(d.state.heroes[hero.id]!.status).toBe('retreated');
    expect(d.state.heroes[hero.id]!.army.slots.every((s) => !s)).toBe(true);
    const options = hireOptions(d.catalog, d.state, playerId, town.id);
    expect(options[0]).toEqual({ definitionId: hero.definitionId, returningHeroId: hero.id });
    const gold = d.player.wallet.gold;
    d.do({ kind: 'HireHero', townId: town.id, heroDefinitionId: hero.definitionId });
    const back = d.state.heroes[hero.id]!;
    expect(back.status).toBe('active');
    expect(back.position).toEqual(townGate(d.catalog, d.state, town.id));
    expect(back.movementPoints).toBe(0);
    expect(back.army.slots[0]).toMatchObject({ creatureId: 'hoplite', count: 1 });
    expect(d.player.wallet.gold).toBe(gold - d.catalog.rulesProfile.heroHireCost);
  });

  it('allows one hire per player per week (owner request 2026-10-07)', () => {
    const d = GameDriver.mission(SKIRMISH);
    const playerId = d.state.playerOrder[0]!;
    const town = Object.values(d.state.towns).find((t) => t.ownerId === playerId)!;
    const hero = Object.values(d.state.heroes).find((h) => h.ownerId === playerId)!;
    d.marchTo({ q: town.coord.q + 2, r: town.coord.r }, hero.id);
    d.player.wallet.gold = 50_000;
    const [first, second] = hireCandidates(d.catalog, d.state, town.id);
    expect(second).toBeTruthy();
    d.do({ kind: 'HireHero', townId: town.id, heroDefinitionId: first! });
    expect(heroHiredThisWeek(d.catalog, d.state, playerId)).toBe(true);
    // Move the new hero off the town tile so only the weekly limit refuses the second hire.
    const hired = Object.values(d.state.heroes).find((h) => h.definitionId === first)!;
    d.marchTo({ q: town.coord.q + 1, r: town.coord.r + 1 }, hired.id);
    const q = quoteHireHero(d.catalog, d.state, playerId, town.id, second!);
    expect(q).toMatchObject({ legal: false, code: 'already_done', reason: 'One hero per week' });
    expect(d.reject({ kind: 'HireHero', townId: town.id, heroDefinitionId: second! }).code).toBe('already_done');
    // The next week the Tavern hires again.
    const week = weekOf(d.state.day, d.catalog.rulesProfile.daysPerWeek);
    while (weekOf(d.state.day, d.catalog.rulesProfile.daysPerWeek) === week) d.endDay();
    expect(heroHiredThisWeek(d.catalog, d.state, playerId)).toBe(false);
    expect(quoteHireHero(d.catalog, d.state, playerId, town.id, second!).code).not.toBe('already_done');
  });
});
