/**
 * routeDays (owner request 2026-10-14: the map shows how many days a far destination takes):
 * today is day 1 with the hero's remaining points; each later day starts with the full budget.
 */
import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import { movementBudget, quoteMovement, routeDays, routeStepDays } from '../src';

describe('routeDays', () => {
  const d = GameDriver.mission('skirmish_twin_harbors');
  for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
  const hero = Object.values(d.state.heroes).find((h) => h.ownerId === 'player' && h.status === 'active')!;
  /** Only the route is under test: the other empires pass their turns (no rival walks into the hero). */
  const nextDay = () => {
    d.do({ kind: 'EndTurn' });
    for (let i = 0; i < 8 && d.state.activePlayerId !== 'player'; i++) d.do({ kind: 'EndTurn' }, d.state.activePlayerId);
  };

  it('is 1 for a destination reached today and grows with the distance', () => {
    const far = { q: d.state.world.map.width - 3, r: Math.floor(d.state.world.map.height / 2) };
    let q = quoteMovement(d.catalog, d.state, hero.id, far);
    expect(q.reachable).toBe(true);
    const full = routeDays(d.catalog, d.state, hero.id, q)!;
    expect(full).toBeGreaterThan(1);
    // The same route walked in days by the rules: the hero arrives on that day.
    const budget = movementBudget(d.catalog, d.state, d.state.heroes[hero.id]!).total;
    let day = 1;
    for (let guard = 0; guard < 20; guard++) {
      q = quoteMovement(d.catalog, d.state, hero.id, far);
      if (!q.reachable) break;
      if (q.reachesDestinationToday) {
        expect(routeDays(d.catalog, d.state, hero.id, q)).toBe(1);
        break;
      }
      expect(routeDays(d.catalog, d.state, hero.id, q)).toBe(full - day + 1);
      d.do({ kind: 'MoveHero', heroId: hero.id, destination: far, confirmEncounter: true });
      if (d.state.battle) break;
      nextDay();
      expect(d.state.heroes[hero.id]!.movementPoints).toBe(budget);
      day++;
    }
    expect(day).toBe(full);
  });

  it('starts counting tomorrow when no point is left today', () => {
    const far = { q: hero.position.q + 3, r: hero.position.r };
    const saved = hero.movementPoints;
    hero.movementPoints = 0;
    const q = quoteMovement(d.catalog, d.state, hero.id, far);
    if (q.reachable) expect(routeDays(d.catalog, d.state, hero.id, q)).toBeGreaterThanOrEqual(2);
    hero.movementPoints = saved;
  });
  it('gives the day of every step: today’s steps are day 1, later days follow without gaps, the last is routeDays', () => {
    const f = GameDriver.mission('skirmish_twin_harbors');
    for (const fog of Object.values(f.state.fog)) fog.explored = fog.explored.map(() => 1);
    const far = { q: f.state.world.map.width - 3, r: Math.floor(f.state.world.map.height / 2) };
    const q = quoteMovement(f.catalog, f.state, hero.id, far);
    expect(q.reachable).toBe(true);
    const days = routeStepDays(f.catalog, f.state, hero.id, q)!;
    expect(days[days.length - 1]).toBeGreaterThan(2);
    expect(days).toHaveLength(q.path.length);
    days.forEach((n, i) => {
      if (i <= q.stopIndex) expect(n).toBe(1);
      else expect(n).toBeGreaterThan(1);
      if (i > 0) expect(n - days[i - 1]!).toBeGreaterThanOrEqual(0);
      if (i > 0) expect(n - days[i - 1]!).toBeLessThanOrEqual(1);
    });
    expect(days[days.length - 1]).toBe(routeDays(f.catalog, f.state, hero.id, q));
  });
});
