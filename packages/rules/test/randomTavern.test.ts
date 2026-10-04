/**
 * Random-map taverns (owner request 2026-10-02): every hireable hero and the
 * campaign heroes can be hired, each in the towns of the hero's own pantheon;
 * the opponents written for the campaigns stay out. Authored skirmishes and
 * the campaigns keep their own rules.
 */
import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import { createGeneratedMatch, createRandomSkirmish, randomMapTavernPool } from '@pr/campaign';
import { hireOptions, imprisonedHeroIds, townHasEffect } from '../src';

const catalog = GameDriver.mission('skirmish_twin_harbors').catalog;
const CAMPAIGN_HEROES = ['alexios', 'egyptian_seshet', 'japanese_akane', 'celtic_orla', 'mesoamerican_itzel'];

function randomDriver(seed: number, pantheons: string[]): GameDriver {
  const g = createRandomSkirmish(catalog, {
    seed,
    size: 'medium',
    seats: pantheons.map((pantheonId, i) => ({ pantheonId, controller: i === 0 ? ('human' as const) : ('ai' as const) })),
    victory: { type: 'elimination' },
    monsters: 'none',
    revealMap: true,
  });
  return new GameDriver(createGeneratedMatch(catalog, g, { matchId: `test:tavern:${seed}`, startingGodId: null }).match, catalog);
}

describe('random-map taverns', () => {
  it('the pool is the 42 hireable heroes plus the 5 campaign heroes — no campaign opponents', () => {
    const pool = randomMapTavernPool(catalog);
    expect(pool).toHaveLength(47);
    expect(new Set(pool).size).toBe(47);
    for (const id of CAMPAIGN_HEROES) expect(pool, id).toContain(id);
    for (const id of pool) expect(['hireable', 'campaign']).toContain(catalog.heroes[id]!.availability);
    expect(Object.values(catalog.heroes).filter((h) => h.availability === 'enemy').some((h) => pool.includes(h.id))).toBe(false);
    // Five hireable heroes per pantheon (eight for the four newer ones since 2026-10-04), plus the campaign hero
    // (Norse: Hervor, the hero of The Winter Oath, is already hireable).
    const expected: Record<string, number> = { greek: 6, norse: 5, egyptian: 9, japanese: 9, celtic: 9, mesoamerican: 9 };
    for (const p of catalog.pantheonOrder) expect(pool.filter((id) => catalog.heroes[id]!.pantheonId === p), p).toHaveLength(expected[p]!);
  });

  it('a generated map lists them; each tavern offers its own pantheon’s heroes not already in play', () => {
    const d = randomDriver(4242, ['greek', 'celtic']);
    expect(d.state.scenario.heroHiringEnabled).toBe(true);
    const mission = d.state.customMission!;
    expect(mission.hireableHeroIds).toEqual(randomMapTavernPool(catalog));
    for (const [playerId, pantheonId] of [['player', 'greek'], ['p2', 'celtic']] as const) {
      const town = Object.values(d.state.towns).find((t) => t.ownerId === playerId)!;
      // Build the tavern if the town does not start with one.
      const tavern = catalog.townArchetypes[town.archetypeId]!.slots.find((x) => x.chain.some((b) => catalog.buildings[b]?.effects.some((e) => e.type === 'enables_hero_hiring')))!;
      if (!townHasEffect(catalog, town, 'enables_hero_hiring')) town.buildings[tavern.id] = 1;
      expect(townHasEffect(catalog, town, 'enables_hero_hiring')).toBe(true);
      const inPlay = new Set([...Object.values(d.state.heroes).map((h) => h.definitionId), ...imprisonedHeroIds(catalog, d.state)]);
      const expected = randomMapTavernPool(catalog).filter((id) => catalog.heroes[id]!.pantheonId === pantheonId && !inPlay.has(id));
      const offered = hireOptions(catalog, d.state, playerId, town.id).filter((c) => !c.returningHeroId).map((c) => c.definitionId);
      expect(offered).toEqual(expected);
      const campaignHero = CAMPAIGN_HEROES.find((id) => catalog.heroes[id]!.pantheonId === pantheonId)!;
      if (!inPlay.has(campaignHero)) expect(offered).toContain(campaignHero);
    }
  });

  it('a campaign hero can be hired on a random map', () => {
    let hired = 0;
    for (const heroId of CAMPAIGN_HEROES) {
      const pantheonId = catalog.heroes[heroId]!.pantheonId;
      const d = randomDriver(77, [pantheonId, 'norse']);
      const inPlay = new Set([...Object.values(d.state.heroes).map((h) => h.definitionId), ...imprisonedHeroIds(catalog, d.state)]);
      if (inPlay.has(heroId)) continue; // this map starts them as a leader or a captive
      const town = Object.values(d.state.towns).find((t) => t.ownerId === 'player')!;
      const tavern = catalog.townArchetypes[town.archetypeId]!.slots.find((x) => x.chain.some((b) => catalog.buildings[b]?.effects.some((e) => e.type === 'enables_hero_hiring')))!;
      if (!townHasEffect(catalog, town, 'enables_hero_hiring')) town.buildings[tavern.id] = 1;
      // The starting hero leaves the town tile first (hiring needs a free tile).
      for (const h of Object.values(d.state.heroes)) if (h.ownerId === 'player') h.position = { q: town.coord.q + 1, r: town.coord.r };
      d.player.wallet.gold = 10_000;
      const events = d.do({ kind: 'HireHero', townId: town.id, heroDefinitionId: heroId });
      expect(events.some((e) => e.kind === 'HeroHired'), heroId).toBe(true);
      expect(Object.values(d.state.heroes).some((h) => h.definitionId === heroId && h.ownerId === 'player' && h.status === 'active'), heroId).toBe(true);
      hired++;
    }
    expect(hired).toBeGreaterThanOrEqual(3);
  });

  it('authored skirmishes keep their pantheon’s hireable heroes only', () => {
    const d = GameDriver.mission('skirmish_twin_harbors');
    const town = Object.values(d.state.towns).find((t) => t.ownerId === 'player')!;
    const offered = hireOptions(catalog, d.state, 'player', town.id).map((c) => c.definitionId);
    expect(offered).not.toContain('alexios');
  });
});
