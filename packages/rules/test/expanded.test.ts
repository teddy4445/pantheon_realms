/**
 * Proposed 0.4 features in the rules: divine interventions, creature camps,
 * map events, weekly events, artifact sets, expanded skills and spells,
 * difficulty, statistics and story scenes — and that The Three Beacons keeps
 * every one of the gameplay features switched off.
 */
import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import { createGeneratedMatch, createMissionMatch, createRandomSkirmish } from '@pr/campaign';
import {
  artifactEffects,
  artifactSetStatus,
  campStock,
  ensureStats,
  interventionsFor,
  matchScore,
  offerableSkillIds,
  playerEffects,
  quoteAdventureSpell,
  quoteIntervention,
  type MatchState,
  townGate,
} from '../src';

const twin = () => GameDriver.mission('skirmish_twin_harbors');

/**
 * An idle player's town needs defenders to see out a week: since 2026-10-02 the AI
 * rival's leader marches with free joiners (neutral reactions) and reaches an
 * undefended Westharbor by day 6.
 */
function holdWestharbor(d: GameDriver): GameDriver {
  d.state.towns['westharbor']!.garrison.slots[0] = { stackId: 'test_guard', creatureId: 'cyclops', count: 40 };
  return d;
}

function randomDriver(seed = 77): GameDriver {
  const d = twin();
  const g = createRandomSkirmish(d.catalog, { seed, size: 'small', seats: [{ pantheonId: 'greek', controller: 'human' }, { pantheonId: 'norse', controller: 'ai' }], victory: { type: 'elimination' }, monsters: 'none' });
  return new GameDriver(createGeneratedMatch(d.catalog, g, { matchId: `test:rand:${seed}`, startingGodId: 'zeus' }).match, d.catalog);
}

function leader(state: MatchState, playerId = 'player') {
  return Object.values(state.heroes).find((h) => h.ownerId === playerId && h.status === 'active')!;
}

describe('divine interventions', () => {
  it('cost Favor, work once per week and never in The Three Beacons', () => {
    const d = holdWestharbor(twin());
    d.player.wallet.favor = 30;
    const gold = d.player.wallet.gold;
    d.do({ kind: 'InvokeIntervention', interventionId: 'tithe_of_the_faithful' });
    expect(d.player.wallet.gold).toBe(gold + 1500);
    expect(d.player.wallet.favor).toBe(24);
    expect(d.reject({ kind: 'InvokeIntervention', interventionId: 'inspiration' }).code).toBe('already_done');
    // Next week the gods answer again.
    for (let i = 0; i < 7; i++) d.endDay();
    expect(quoteIntervention(d.catalog, d.state, 'player', 'inspiration').legal).toBe(true);

    const camp = GameDriver.mission('three_beacons_m01');
    camp.player.wallet.favor = 50;
    expect(interventionsFor(camp.catalog, camp.state, 'player')).toEqual([]);
    expect(camp.reject({ kind: 'InvokeIntervention', interventionId: 'tithe_of_the_faithful' }).code).toBe('not_in_scope');
  });

  it('pantheon interventions are offered only to their pantheon', () => {
    const greek = twin();
    const ids = interventionsFor(greek.catalog, greek.state, 'player').map((x) => x.id);
    expect(ids).toContain('thunderbolt_of_zeus');
    expect(ids).not.toContain('ride_of_the_valkyries');
    const norse = GameDriver.mission('skirmish_twin_harbors_norse_vs_greek');
    expect(interventionsFor(norse.catalog, norse.state, 'player').map((x) => x.id)).toContain('ride_of_the_valkyries');
  });

  it('town growth adds recruits to tier 1–3 families of the chosen town', () => {
    const d = twin();
    d.player.wallet.favor = 20;
    const town = d.state.towns['westharbor']!;
    const before = { ...town.population };
    d.do({ kind: 'InvokeIntervention', interventionId: 'bountiful_harvest', townId: 'westharbor' });
    for (const [fam, n] of Object.entries(d.state.towns['westharbor']!.population)) {
      const tier = d.catalog.families[fam]!.tier;
      expect(n - (before[fam] ?? 0)).toBe(tier <= 3 ? 4 : 0);
    }
  });
});

describe('creature camps and map events', () => {
  it('a camp sells its creature at the normal price from a weekly-growing stock', () => {
    const d = randomDriver(78);
    const camp = d.state.customMission!.sites.find((s) => s.kind.type === 'creature_camp')!;
    if (camp.kind.type !== 'creature_camp') throw new Error('no camp');
    const hero = leader(d.state);
    hero.position = { ...camp.coord };
    d.state.world.sites[camp.id]!.cleared = true;
    const stock = campStock(d.catalog, d.state, camp.id);
    expect(stock).toBe(camp.kind.initialStock);
    const price = d.catalog.creatures[camp.kind.creatureId]!.cost.gold ?? 0;
    const gold = d.player.wallet.gold;
    d.do({ kind: 'RecruitFromCamp', heroId: hero.id, siteId: camp.id, quantity: 2 });
    expect(d.player.wallet.gold).toBe(gold - 2 * price);
    expect(campStock(d.catalog, d.state, camp.id)).toBe(stock - 2);
    expect(leader(d.state).army.slots.some((s) => s?.creatureId === camp.kind.creatureId && s.count >= 2)).toBe(true);
    expect(d.reject({ kind: 'RecruitFromCamp', heroId: hero.id, siteId: camp.id, quantity: stock }).code).toBe('no_population');
    // A new week restocks the camp. Every seat only ends its turns, so no AI hero
    // visits the camp in the meantime.
    for (let i = 0; i < 40 && d.state.day < 8; i++) d.do({ kind: 'EndTurn' }, d.state.activePlayerId);
    expect(d.state.day).toBe(8);
    expect(campStock(d.catalog, d.state, camp.id)).toBe(stock - 2 + camp.kind.weeklyGrowth);
  });

  it('a map event happens once and grants exactly its shown result', () => {
    const d = randomDriver(79);
    const ev = d.state.customMission!.sites.find((s) => s.kind.type === 'map_event' && !s.guard)!;
    if (ev.kind.type !== 'map_event') throw new Error('no event');
    const hero = leader(d.state);
    hero.position = { ...ev.coord };
    const option = ev.kind.options.findIndex((o) => !o.cost && !o.reward.creatures);
    d.player.wallet.gold += 5000;
    const before = structuredClone(d.state);
    d.do({ kind: 'ResolveMapEvent', heroId: hero.id, siteId: ev.id, optionIndex: Math.max(0, option) });
    expect(d.state.world.sites[ev.id]!.claimed).toBe(true);
    expect(d.state).not.toEqual(before);
    expect(d.reject({ kind: 'ResolveMapEvent', heroId: hero.id, siteId: ev.id, optionIndex: 0 }).code).toBe('already_done');
  });
});

describe('weekly events', () => {
  it('a new week draws an event from the catalog in skirmish, never in the campaign', () => {
    const d = holdWestharbor(twin());
    expect(d.state.world.weeklyEventId ?? null).toBeNull();
    for (let i = 0; i < 7; i++) d.endDay();
    const id = d.state.world.weeklyEventId;
    expect(id && d.catalog.weeklyEvents[id]).toBeTruthy();
    expect(d.events.some((e) => e.kind === 'WeeklyEventStarted')).toBe(true);

    const c = GameDriver.mission('three_beacons_m01');
    c.state.world.weeklyEventId = 'week_of_merchants';
    expect(playerEffects(c.catalog, c.state, 'player').some((e) => e.type === 'daily_income')).toBe(false);
  });

  it('the weekly event reaches every empire through the shared effects', () => {
    const d = twin();
    d.state.world.weeklyEventId = 'week_of_merchants';
    for (const p of ['player', 'rival']) expect(playerEffects(d.catalog, d.state, p)).toContainEqual({ type: 'daily_income', resource: 'gold', amount: 300 });
  });
});

describe('artifact sets, skills and spells', () => {
  it('two and three pieces of a set add their bonuses', () => {
    const d = twin();
    const hero = { equipment: {} as Record<string, { instanceId: string; artifactId: string }> };
    hero.equipment.weapon = { instanceId: 'a', artifactId: 'phalanx_spear' };
    expect(artifactSetStatus(d.catalog, hero)[0]).toMatchObject({ equipped: 1, total: 3, active: [] });
    hero.equipment.shield = { instanceId: 'b', artifactId: 'phalanx_aspis' };
    expect(artifactEffects(d.catalog, hero)).toContainEqual({ type: 'morale', amount: 1 });
    hero.equipment.head = { instanceId: 'c', artifactId: 'phalanx_helm' };
    expect(artifactEffects(d.catalog, hero)).toContainEqual({ type: 'creature_stat', stat: 'defense', amount: 2 });
    expect(artifactSetStatus(d.catalog, hero)[0]!.active.length).toBe(2);
  });

  it('pantheon skills are offered only to their pantheon, expanded skills never in the campaign', () => {
    const greek = twin();
    const offered = offerableSkillIds(greek.catalog, greek.state, greek.hero());
    expect(offered).toContain('phalanx_drill');
    expect(offered).toContain('estates');
    expect(offered).not.toContain('skaldic_lore');
    const camp = GameDriver.mission('three_beacons_m01');
    const campOffered = offerableSkillIds(camp.catalog, camp.state, camp.hero());
    expect(campOffered).not.toContain('estates');
    expect(campOffered).not.toContain('phalanx_drill');
  });

  it('Fleet Foot adds movement and Homecoming returns the hero to the nearest town', () => {
    const d = twin();
    const hero = d.hero();
    hero.spellbook = true;
    hero.knownSpellIds = ['fleet_foot', 'homecoming'];
    hero.mana = 40;
    const mp = hero.movementPoints;
    d.do({ kind: 'CastAdventureSpell', heroId: hero.id, spellId: 'fleet_foot', target: hero.position });
    expect(d.hero().movementPoints).toBe(mp + 200);
    expect(quoteAdventureSpell(d.catalog, d.state, 'player', hero.id, 'homecoming', null).reason).toMatch(/already in/);
    d.hero().position = { q: d.hero().position.q + 3, r: d.hero().position.r };
    d.do({ kind: 'CastAdventureSpell', heroId: hero.id, spellId: 'homecoming', target: d.hero().position });
    const town = d.state.towns['westharbor']!;
    expect(d.hero().position).toEqual(townGate(d.catalog, d.state, town.id));
    expect(d.hero().movementPoints).toBe(0);
  });
});

describe('difficulty and statistics', () => {
  it('Easy and Hard change only resources, income and AI margins; the campaign ignores difficulty', () => {
    const c = twin().catalog;
    const normal = createMissionMatch(c, 'skirmish_twin_harbors', { matchId: 'n', difficultyId: 'normal' }).match;
    const easy = createMissionMatch(c, 'skirmish_twin_harbors', { matchId: 'e', difficultyId: 'easy' }).match;
    const hard = createMissionMatch(c, 'skirmish_twin_harbors', { matchId: 'h', difficultyId: 'hard' }).match;
    expect(easy.players.player!.wallet.gold).toBe(Math.floor(normal.players.player!.wallet.gold * 1.25));
    expect(easy.players.rival!.wallet.gold).toBe(Math.floor(normal.players.rival!.wallet.gold * 0.75));
    expect(hard.players.rival!.wallet.gold).toBe(Math.floor(normal.players.rival!.wallet.gold * 1.3));
    expect(easy.players.rival!.incomePercent).toBe(75);
    expect(hard.players.rival!.incomePercent).toBe(125);
    expect(normal.players.rival!.incomePercent ?? 100).toBe(100);
    // Creature statistics are content, not match state: identical armies.
    expect(easy.heroes['rival_odysseus']!.army).toEqual(normal.heroes['rival_odysseus']!.army);
    const campaign = createMissionMatch(c, 'three_beacons_m01', { matchId: 'c', difficultyId: 'hard' }).match;
    expect(campaign.scenario.difficultyId ?? null).toBeNull();
  });

  it('statistics are recorded at the start and every dawn; the score follows the documented formula', () => {
    const d = twin();
    expect(ensureStats(d.state).timeline.map((r) => r.day)).toEqual([1]);
    d.endDay();
    d.endDay();
    const timeline = ensureStats(d.state).timeline;
    expect(timeline.map((r) => r.day)).toEqual([1, 2, 3]);
    expect(timeline[2]!.players.player!.towns).toBe(1);
    const score = matchScore(d.catalog, d.state, 'player');
    expect(score.lines[0]).toEqual({ label: 'No victory', points: 0 });
    expect(score.total).toBe(score.lines.reduce((n, l) => n + l.points, 0));
  });
});

describe('story scenes', () => {
  it('The Three Beacons plays the bridge scene once, when the bridge guard falls', () => {
    const d = GameDriver.mission('three_beacons_m01');
    d.marchTo({ q: 10, r: 7 });
    const scenes = d.events.filter((e) => e.kind === 'StoryScene').map((e) => (e.kind === 'StoryScene' ? e.sceneId : ''));
    expect(d.state.world.sites['m01_ford']?.cleared).toBe(true);
    expect(scenes.filter((s) => s === 'm01_bridge_open')).toHaveLength(1);
    expect(d.state.mission.scenesPlayed).toContain('m01_bridge_open');
    // Further commands never replay it.
    d.endDay();
    expect(d.events.filter((e) => e.kind === 'StoryScene' && e.sceneId === 'm01_bridge_open')).toHaveLength(1);
  });

  it('the god scene follows the Athena or Ares commitment', () => {
    const d = GameDriver.mission('three_beacons_m02');
    const town = Object.values(d.state.towns).find((t) => t.ownerId === 'player')!;
    town.buildings['pantheon_temple'] = 2;
    d.player.wallet.favor = 20;
    d.do({ kind: 'SelectGod', godId: 'athena' });
    expect(d.state.mission.scenesPlayed).toContain('m02_athena');
    expect(d.state.mission.scenesPlayed).not.toContain('m02_ares');
  });
});
