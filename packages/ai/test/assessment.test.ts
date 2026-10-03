/**
 * The AI's fuller strength judgement and weekly-event plan (assessment.ts):
 * skills, morale/luck and pantheon/god/set creature bonuses raise a hero's
 * judged power; the week's event lowers the reserves the planner keeps.
 */
import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import { armyStrength, effectiveAttributes } from '@pr/rules';
import { buildReserve, heroPower, hireReserve, weekPlan } from '../src/assessment';

function setup() {
  const d = GameDriver.mission('skirmish_twin_harbors');
  const hero = Object.values(d.state.heroes).find((h) => h.ownerId === 'player' && h.status === 'active')!;
  hero.skills = hero.skills.filter((s) => !['offense', 'archery', 'armorer', 'leadership', 'fortune'].includes(d.catalog.skills[s.skillId]?.rule.type ?? ''));
  hero.spellbook = false;
  d.state.world.weeklyEventId = 'quiet_week';
  return { d, hero };
}

describe('AI assessment', () => {
  it('without skills, magic or bonuses the judged power is close to the plain heuristic', () => {
    const { d, hero } = setup();
    const eff = effectiveAttributes(d.catalog, d.state, hero);
    const plain = armyStrength(d.catalog, hero.army.slots.map((s) => (s ? { creatureId: s.creatureId, count: s.count } : null)), { attack: eff.attack.total, defense: eff.defense.total });
    const power = heroPower(d.catalog, d.state, hero);
    expect(power).toBeGreaterThanOrEqual(plain * 0.85);
    expect(power).toBeLessThanOrEqual(plain * 1.4);
  });

  it('Offense, Armorer and a week of valor each raise the judged power', () => {
    const { d, hero } = setup();
    const base = heroPower(d.catalog, d.state, hero);
    const offense = Object.values(d.catalog.skills).find((s) => s.rule.type === 'offense')!;
    hero.skills = [...hero.skills, { skillId: offense.id, rank: 3 }];
    const withOffense = heroPower(d.catalog, d.state, hero);
    expect(withOffense).toBeGreaterThan(base * 1.05);
    const armorer = Object.values(d.catalog.skills).find((s) => s.rule.type === 'armorer')!;
    hero.skills = [...hero.skills, { skillId: armorer.id, rank: 3 }];
    const withArmorer = heroPower(d.catalog, d.state, hero);
    expect(withArmorer).toBeGreaterThan(withOffense);
    d.state.world.weeklyEventId = 'week_of_valor';
    expect(heroPower(d.catalog, d.state, hero)).toBeGreaterThan(withArmorer);
  });

  it('the week plan reads the event from its effects and lowers the reserves in an income week', () => {
    const { d } = setup();
    expect(weekPlan(d.catalog, d.state, 'player')).toEqual({ growthBonus: 0, goldIncome: 0, materialIncome: 0, movementPercent: 0, manaRegen: 0 });
    d.state.world.weeklyEventId = 'week_of_plenty';
    expect(weekPlan(d.catalog, d.state, 'player').growthBonus).toBe(3);
    d.state.world.weeklyEventId = 'week_of_merchants';
    const plan = weekPlan(d.catalog, d.state, 'player');
    expect(plan.goldIncome).toBe(300);
    expect(buildReserve(plan, 1500)).toBeLessThan(1500);
    expect(hireReserve(plan, 3000)).toBeLessThan(3000);
    expect(buildReserve(weekPlan(d.catalog, d.state, 'nobody'), 1500)).toBe(1500);
  });
});
