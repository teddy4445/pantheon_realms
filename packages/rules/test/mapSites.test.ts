/**
 * Proposed 2026-10-02: hero specialties, the new random-map sites (learning
 * stones, spell shrines, skill trainers, quest huts, key tents and gates,
 * windmills, treasure chests, prisons) and neutral reactions (much weaker
 * neutrals join for free or flee). Campaign rules stay as they were: The Three
 * Beacons has none of it.
 */
import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import { createGeneratedMatch, createRandomSkirmish, type SkirmishGenOptions } from '@pr/campaign';
import {
  castingPower,
  findHeroPath,
  freeSpotNear,
  heroEffects,
  hireOptions,
  imprisonedHeroIds,
  projectedIncome,
  quoteNeutralReaction,
  quoteOpenChest,
  specialtiesEnabled,
  specialtyEffects,
  tileRole,
  type HeroState,
  type MatchState,
  type SiteDefinition,
} from '../src';

const base = GameDriver.mission('skirmish_twin_harbors');
const catalog = base.catalog;

function genOpts(seed: number, extra: Partial<SkirmishGenOptions> = {}): SkirmishGenOptions {
  return {
    seed,
    size: 'small',
    seats: [
      { pantheonId: 'greek', controller: 'human' },
      { pantheonId: 'norse', controller: 'ai' },
    ],
    victory: { type: 'elimination' },
    monsters: 'none',
    revealMap: true,
    ...extra,
  };
}

function driverFor(seed: number, extra: Partial<SkirmishGenOptions> = {}): GameDriver {
  const g = createRandomSkirmish(catalog, genOpts(seed, extra));
  return new GameDriver(createGeneratedMatch(catalog, g, { matchId: `test:sites:${seed}`, startingGodId: 'zeus' }).match, catalog);
}

const NEW_KINDS = ['learning_stone', 'spell_shrine', 'skill_trainer', 'quest_hut', 'key_tent', 'key_gate', 'windmill', 'treasure_chest', 'prison'] as const;

/** The first seed whose small map has every new site kind in the player's region. */
const FULL_SEED = (() => {
  for (let seed = 1; seed < 80; seed++) {
    const g = createRandomSkirmish(catalog, genOpts(seed));
    const mine = g.mission.sites.filter((s) => s.id.endsWith('_1'));
    if (NEW_KINDS.every((k) => mine.some((s) => s.kind.type === k))) return seed;
  }
  throw new Error('no seed with every new site');
})();

function mission(d: GameDriver) {
  return d.state.customMission!;
}

function siteOf(d: GameDriver, type: SiteDefinition['kind']['type'], suffix = '_1'): SiteDefinition {
  const s = mission(d).sites.find((x) => x.kind.type === type && x.id.endsWith(suffix));
  if (!s) throw new Error(`no ${type}${suffix}`);
  return s;
}

function leader(state: MatchState, playerId = 'player'): HeroState {
  return Object.values(state.heroes).find((h) => h.ownerId === playerId && h.status === 'active' && !h.monster)!;
}

/** Put the hero on a free tile beside `c` with plenty of movement (test setup only). */
function standBeside(d: GameDriver, hero: HeroState, c: { q: number; r: number }): void {
  const h = d.state.heroes[hero.id]!;
  h.position = { q: c.q, r: c.r };
  const spot = freeSpotNear(catalog, d.state, c);
  if (!spot) throw new Error('no free spot');
  h.position = spot;
  h.movementPoints = 5000;
}

function visit(d: GameDriver, hero: HeroState, site: SiteDefinition) {
  standBeside(d, hero, site.coord);
  return d.do({ kind: 'MoveHero', heroId: hero.id, destination: site.coord });
}

function stepOffAndBack(d: GameDriver, hero: HeroState, site: SiteDefinition) {
  const spot = freeSpotNear(catalog, d.state, site.coord)!;
  d.state.heroes[hero.id]!.movementPoints = 5000;
  d.do({ kind: 'MoveHero', heroId: hero.id, destination: spot });
  return d.do({ kind: 'MoveHero', heroId: hero.id, destination: site.coord });
}

describe('hero specialties', () => {
  it('every one of the 62 heroes has a specialty of one of the three kinds, with exact rule text', () => {
    const heroes = Object.values(catalog.heroes);
    expect(heroes).toHaveLength(62);
    const kinds = new Map<string, number>();
    for (const h of heroes) {
      expect(h.specialty, h.id).toBeDefined();
      expect(h.specialty!.summary.length).toBeGreaterThan(20);
      kinds.set(h.specialty!.kind, (kinds.get(h.specialty!.kind) ?? 0) + 1);
    }
    expect([...kinds.keys()].sort()).toEqual(['creature', 'resource', 'spell']);
    expect([...kinds.values()].reduce((a, b) => a + b, 0)).toBe(62);
  });

  it('creature specialties grow at levels 4 and 8 and only touch their own family', () => {
    const d = driverFor(FULL_SEED);
    const h = { ...leader(d.state), definitionId: 'alexios', level: 1 };
    const attack = (level: number) =>
      specialtyEffects(catalog, d.state, { ...h, level })
        .filter((e) => e.type === 'creature_stat' && e.stat === 'attack')
        .reduce((n, e) => n + (e.type === 'creature_stat' ? e.amount : 0), 0);
    expect(attack(1)).toBe(1);
    expect(attack(3)).toBe(1);
    expect(attack(4)).toBe(2);
    expect(attack(8)).toBe(3);
    const fx = specialtyEffects(catalog, d.state, h);
    expect(fx.every((e) => e.type === 'creature_stat' && e.familyId === 'hoplite')).toBe(true);
  });

  it('spell specialists know their spell from the start and cast it with extra Power', () => {
    const d = driverFor(FULL_SEED);
    const town = Object.values(d.state.towns).find((t) => t.ownerId === 'player')!;
    const perseus = catalog.heroes['perseus']!;
    expect(perseus.specialty?.kind).toBe('spell');
    // Hire Perseus whenever the tavern offers him; otherwise check the rule on the leader.
    const offered = hireOptions(catalog, d.state, 'player', town.id).some((c) => c.definitionId === 'perseus');
    const fx = specialtyEffects(catalog, d.state, { definitionId: 'perseus', level: 6 });
    expect(fx).toEqual([
      { type: 'spell_power_bonus', spellId: 'lightning', amount: 1 },
      { type: 'spell_power_bonus', spellId: 'lightning', amount: 1 },
      { type: 'spell_power_bonus', spellId: 'lightning', amount: 1 },
    ]);
    if (offered) {
      d.player.wallet.gold = 99999;
      d.do({ kind: 'HireHero', townId: town.id, heroDefinitionId: 'perseus' });
      const hired = Object.values(d.state.heroes).find((x) => x.definitionId === 'perseus')!;
      expect(hired.knownSpellIds).toContain('lightning');
    }
    const side = { commander: { power: 3 }, effects: { spellPowerBonus: { lightning: 2 } } } as unknown as Parameters<typeof castingPower>[0];
    expect(castingPower(side, 'lightning')).toBe(5);
    expect(castingPower(side, 'ward')).toBe(3);
  });

  it('resource specialists add their daily income while in play', () => {
    const d = driverFor(FULL_SEED);
    const h = d.state.heroes[leader(d.state).id]!;
    const before = projectedIncome({ catalog, state: d.state }, 'player').gold;
    h.definitionId = 'odysseus';
    expect(projectedIncome({ catalog, state: d.state }, 'player').gold).toBe(before + 250);
  });

  it('are off in The Three Beacons (documented rules unchanged)', () => {
    const tb = GameDriver.mission('three_beacons_m01');
    expect(specialtiesEnabled(tb.state)).toBe(false);
    const alexios = tb.hero('alexios');
    expect(specialtyEffects(catalog, tb.state, alexios)).toEqual([]);
    expect(heroEffects(catalog, alexios, tb.state).some((e) => e.type === 'creature_stat' && e.familyId)).toBe(false);
  });
});

describe('new random-map sites (generator 0.4)', () => {
  it('every empire gets the same new sites; the maps stay valid and deterministic', () => {
    const g = createRandomSkirmish(catalog, genOpts(FULL_SEED));
    for (const k of NEW_KINDS) {
      const per = [1, 2].map((i) => g.mission.sites.filter((s) => s.kind.type === k && s.id.endsWith(`_${i}`)).length);
      expect(per[0], k).toBe(per[1]);
    }
    for (const c of g.checks) expect(c.pass, `${c.id}: ${c.detail}`).toBe(true);
    expect(JSON.stringify(createRandomSkirmish(catalog, genOpts(FULL_SEED)).mission)).toBe(JSON.stringify(g.mission));
  });

  it('a learning stone teaches each hero once', () => {
    const d = driverFor(FULL_SEED);
    const hero = leader(d.state);
    const stone = siteOf(d, 'learning_stone');
    const xp = d.state.heroes[hero.id]!.xp;
    const ev = visit(d, hero, stone);
    const used = ev.find((e) => e.kind === 'LearningStoneUsed');
    expect(used).toBeDefined();
    expect(d.state.heroes[hero.id]!.xp).toBeGreaterThan(xp);
    d.resolveLevelUps();
    const again = stepOffAndBack(d, hero, stone);
    expect(again.some((e) => e.kind === 'SiteRefused')).toBe(true);
    expect(again.some((e) => e.kind === 'LearningStoneUsed')).toBe(false);
  });

  it('a spell shrine teaches its spell to a hero with a spellbook, and refuses one without', () => {
    const d = driverFor(FULL_SEED);
    const hero = leader(d.state);
    const shrine = siteOf(d, 'spell_shrine');
    const spellId = (shrine.kind as { spellId: string }).spellId;
    const h = d.state.heroes[hero.id]!;
    h.knownSpellIds = h.knownSpellIds.filter((s) => s !== spellId);
    h.spellbook = false;
    expect(visit(d, hero, shrine).some((e) => e.kind === 'SiteRefused')).toBe(true);
    d.state.heroes[hero.id]!.spellbook = true;
    const ev = stepOffAndBack(d, hero, shrine);
    expect(ev.some((e) => e.kind === 'ShrineSpellLearned')).toBe(true);
    expect(d.state.heroes[hero.id]!.knownSpellIds).toContain(spellId);
  });

  it('a skill trainer teaches its skill at Basic rank once', () => {
    const d = driverFor(FULL_SEED);
    const hero = leader(d.state);
    const trainer = siteOf(d, 'skill_trainer');
    const skillId = (trainer.kind as { skillId: string }).skillId;
    const h = d.state.heroes[hero.id]!;
    h.skills = h.skills.filter((s) => s.skillId !== skillId).slice(0, 2);
    visit(d, hero, trainer);
    expect(d.state.heroes[hero.id]!.skills.find((s) => s.skillId === skillId)?.rank).toBe(1);
    expect(stepOffAndBack(d, hero, trainer).some((e) => e.kind === 'SiteRefused')).toBe(true);
  });

  it('a windmill pays once a week', () => {
    const d = driverFor(FULL_SEED);
    const hero = leader(d.state);
    const mill = siteOf(d, 'windmill');
    const before = { ...d.player.wallet };
    const ev = visit(d, hero, mill);
    const got = ev.find((e) => e.kind === 'WindmillCollected');
    expect(got).toBeDefined();
    const gained = Object.entries(d.player.wallet).some(([k, v]) => v > before[k as keyof typeof before]);
    expect(gained).toBe(true);
    expect(stepOffAndBack(d, hero, mill).some((e) => e.kind === 'SiteRefused')).toBe(true);
    d.state.day += 7; // next week (test shortcut; the AI turns are not needed here)
    expect(stepOffAndBack(d, hero, mill).some((e) => e.kind === 'WindmillCollected')).toBe(true);
  });

  it('a treasure chest gives gold or experience, once', () => {
    const d = driverFor(FULL_SEED);
    const hero = leader(d.state);
    const chest = siteOf(d, 'treasure_chest');
    expect(quoteOpenChest(catalog, d.state, 'player', hero.id, chest.id).code).toBe('not_present');
    visit(d, hero, chest);
    const q = quoteOpenChest(catalog, d.state, 'player', hero.id, chest.id);
    expect(q.legal).toBe(true);
    const gold = d.player.wallet.gold;
    d.do({ kind: 'OpenChest', heroId: hero.id, siteId: chest.id, choice: 'gold' });
    expect(d.player.wallet.gold).toBe(gold + q.gold);
    expect(d.reject({ kind: 'OpenChest', heroId: hero.id, siteId: chest.id, choice: 'xp' }).code).toBe('already_done');

    const d2 = driverFor(FULL_SEED);
    const h2 = leader(d2.state);
    visit(d2, h2, siteOf(d2, 'treasure_chest'));
    const xp = d2.state.heroes[h2.id]!.xp;
    const g2 = d2.player.wallet.gold;
    d2.do({ kind: 'OpenChest', heroId: h2.id, siteId: chest.id, choice: 'xp' });
    expect(d2.state.heroes[h2.id]!.xp).toBeGreaterThan(xp);
    expect(d2.player.wallet.gold).toBe(g2);
  });

  it('a quest hut pays once its quest is met (deliver resources or defeat the named guard)', () => {
    let delivered = false;
    let defeated = false;
    for (let seed = FULL_SEED; seed < FULL_SEED + 30 && !(delivered && defeated); seed++) {
      const d = driverFor(seed);
      const hut = mission(d).sites.find((s) => s.kind.type === 'quest_hut' && s.id.endsWith('_1'));
      if (!hut || hut.kind.type !== 'quest_hut') continue;
      const quest = hut.kind.quest;
      const hero = leader(d.state);
      visit(d, hero, hut);
      if (quest.type === 'deliver' && !delivered) {
        for (const k of Object.keys(d.player.wallet) as (keyof typeof d.player.wallet)[]) d.player.wallet[k] = 0;
        expect(d.reject({ kind: 'CompleteQuestHut', heroId: hero.id, siteId: hut.id }).code).toBe('insufficient_resources');
        for (const [k, v] of Object.entries(quest.resources)) d.player.wallet[k as keyof typeof d.player.wallet] = (v ?? 0) + 5;
        const ev = d.do({ kind: 'CompleteQuestHut', heroId: hero.id, siteId: hut.id });
        expect(ev.some((e) => e.kind === 'QuestHutCompleted')).toBe(true);
        for (const [k, v] of Object.entries(quest.resources)) {
          if ((v ?? 0) > 0 && k !== 'gold') expect(d.player.wallet[k as keyof typeof d.player.wallet]).toBe(5);
        }
        expect(d.reject({ kind: 'CompleteQuestHut', heroId: hero.id, siteId: hut.id }).code).toBe('already_done');
        delivered = true;
      } else if (quest.type === 'defeat' && !defeated) {
        expect(d.reject({ kind: 'CompleteQuestHut', heroId: hero.id, siteId: hut.id }).code).toBe('missing_requirement');
        // Cleared by the rival does not count; cleared by the player does.
        const target = d.state.world.sites[quest.siteId]!;
        target.cleared = true;
        target.clearedBy = d.state.playerOrder[1]!;
        expect(d.reject({ kind: 'CompleteQuestHut', heroId: hero.id, siteId: hut.id }).code).toBe('missing_requirement');
        target.clearedBy = 'player';
        expect(d.do({ kind: 'CompleteQuestHut', heroId: hero.id, siteId: hut.id }).some((e) => e.kind === 'QuestHutCompleted')).toBe(true);
        defeated = true;
      }
    }
    expect(delivered).toBe(true);
    expect(defeated).toBe(true);
  });

  it('a key tent gives its colour; the matching gate opens for that player only', () => {
    const d = driverFor(FULL_SEED);
    const hero = leader(d.state);
    const tent = siteOf(d, 'key_tent');
    const gate = siteOf(d, 'key_gate');
    const color = (tent.kind as { color: string }).color;
    expect((gate.kind as { color: string }).color).toBe(color);
    const rival = d.state.playerOrder[1]!;
    expect(tileRole(catalog, d.state, 'player', gate.coord, hero.id)).toBe('blocked');
    const treasury = mission(d).sites.find((s) => s.id === gate.id.replace('key_gate', 'treasury'))!;
    expect(treasury).toBeDefined();
    standBeside(d, hero, gate.coord);
    expect(findHeroPath(catalog, d.state, hero.id, treasury.coord).reachable).toBe(false);
    const ev = visit(d, hero, tent);
    expect(ev.some((e) => e.kind === 'KeyObtained')).toBe(true);
    expect(d.player.keys).toContain(color);
    expect(tileRole(catalog, d.state, 'player', gate.coord, hero.id)).toBe('open');
    expect(tileRole(catalog, d.state, rival, gate.coord, leader(d.state, rival).id)).toBe('blocked');
    standBeside(d, hero, gate.coord);
    expect(findHeroPath(catalog, d.state, hero.id, treasury.coord).reachable).toBe(true);
  });

  it('a prison frees its captive hero, who is not for hire until then', () => {
    const d = driverFor(FULL_SEED);
    const hero = leader(d.state);
    const prison = siteOf(d, 'prison');
    const captive = (prison.kind as { heroDefinitionId: string; level: number }).heroDefinitionId;
    expect(imprisonedHeroIds(catalog, d.state).has(captive)).toBe(true);
    for (const t of Object.values(d.state.towns).filter((x) => x.ownerId === 'player')) {
      expect(hireOptions(catalog, d.state, 'player', t.id).some((c) => c.definitionId === captive)).toBe(false);
    }
    const ev = visit(d, hero, prison);
    const freed = ev.find((e) => e.kind === 'PrisonerFreed');
    expect(freed).toBeDefined();
    const newHero = Object.values(d.state.heroes).find((h) => h.definitionId === captive)!;
    expect(newHero.ownerId).toBe('player');
    expect(newHero.army.slots.some((s) => s && s.count > 0)).toBe(true);
    d.resolveLevelUps();
    expect(d.state.heroes[newHero.id]!.level).toBeGreaterThanOrEqual((prison.kind as { level: number }).level);
    expect(imprisonedHeroIds(catalog, d.state).has(captive)).toBe(false);
    expect(stepOffAndBack(d, hero, prison).some((e) => e.kind === 'PrisonerFreed')).toBe(false);
  });
});

describe('neutral reactions', () => {
  function guarded(d: GameDriver): SiteDefinition {
    const s = mission(d).sites.find((x) => x.guard && !x.guard.commander && x.kind.type !== 'town' && x.id.endsWith('_1') && x.guard.army.length > 0);
    if (!s) throw new Error('no guarded site');
    return s;
  }

  function armHero(d: GameDriver, hero: HeroState, count: number, creatureId = 'cyclops'): void {
    const h = d.state.heroes[hero.id]!;
    h.army.slots = h.army.slots.map((_, i) => (i === 0 ? { stackId: 'test_stack', creatureId, count } : null));
  }

  it('much weaker neutrals offer to join for free: no battle, no experience, the reward is kept', () => {
    const d = driverFor(FULL_SEED);
    const hero = leader(d.state);
    const site = guarded(d);
    armHero(d, hero, 400);
    standBeside(d, hero, site.coord);
    const r = quoteNeutralReaction(catalog, d.state, hero.id, site.coord);
    expect(r.kind).toBe('join');
    expect(r.ratio).toBeGreaterThanOrEqual(3);
    const xp = d.state.heroes[hero.id]!.xp;
    const joining = r.stacks.reduce((n, s) => n + s.count, 0);
    const before = d.state.heroes[hero.id]!.army.slots.reduce((n, s) => n + (s?.count ?? 0), 0);
    const ev = d.do({ kind: 'MoveHero', heroId: hero.id, destination: site.coord, confirmEncounter: true, encounterChoice: 'join' });
    expect(ev.some((e) => e.kind === 'NeutralsJoined')).toBe(true);
    expect(d.state.battle).toBeFalsy();
    expect(d.state.world.sites[site.id]!.cleared).toBe(true);
    expect(d.state.world.sites[site.id]!.clearedBy).toBe('player');
    expect(d.state.heroes[hero.id]!.xp).toBe(xp);
    expect(d.state.heroes[hero.id]!.army.slots.reduce((n, s) => n + (s?.count ?? 0), 0)).toBe(before + joining);
    expect(d.state.heroes[hero.id]!.position).toEqual(site.coord);
  });

  it('they may be let go instead, or fought anyway; weaker armies cannot scare them', () => {
    const d = driverFor(FULL_SEED);
    const hero = leader(d.state);
    const site = guarded(d);
    armHero(d, hero, 400);
    standBeside(d, hero, site.coord);
    const ev = d.do({ kind: 'MoveHero', heroId: hero.id, destination: site.coord, confirmEncounter: true, encounterChoice: 'release' });
    expect(ev.some((e) => e.kind === 'NeutralsFled')).toBe(true);
    expect(d.state.battle).toBeFalsy();

    const f = driverFor(FULL_SEED);
    const fh = leader(f.state);
    armHero(f, fh, 400);
    standBeside(f, fh, site.coord);
    f.do({ kind: 'MoveHero', heroId: fh.id, destination: site.coord, confirmEncounter: true });
    expect(f.state.battle).toBeTruthy();

    const w = driverFor(FULL_SEED);
    const wh = leader(w.state);
    armHero(w, wh, 1);
    standBeside(w, wh, site.coord);
    expect(quoteNeutralReaction(catalog, w.state, wh.id, site.coord).kind).toBeNull();
    expect(w.reject({ kind: 'MoveHero', heroId: wh.id, destination: site.coord, confirmEncounter: true, encounterChoice: 'join' }).code).toBe('illegal_action');
    expect(w.reject({ kind: 'MoveHero', heroId: wh.id, destination: site.coord, confirmEncounter: true, encounterChoice: 'release' }).code).toBe('illegal_action');
  });

  it('between half and a third of the strength they only flee, and they never react in campaigns without the feature', () => {
    const d = driverFor(FULL_SEED);
    const hero = leader(d.state);
    const site = guarded(d);
    standBeside(d, hero, site.coord);
    // Find an army size whose ratio lands in [2, 3).
    let found = false;
    for (let n = 1; n < 2000 && !found; n++) {
      armHero(d, hero, n, 'hoplite');
      const r = quoteNeutralReaction(catalog, d.state, hero.id, site.coord);
      if (r.ratio >= 2 && r.ratio < 3) {
        expect(r.kind).toBe('flee');
        expect(d.reject({ kind: 'MoveHero', heroId: hero.id, destination: site.coord, confirmEncounter: true, encounterChoice: 'join' }).code).toBe('illegal_action');
        found = true;
      }
    }
    expect(found).toBe(true);
    const tb = GameDriver.mission('three_beacons_m01');
    expect(tb.state.scenario.features?.neutralReactions).not.toBe(true);
    const anyGuard = Object.keys(tb.state.world.sites)
      .map((id) => tb.state.customMission?.sites.find((s) => s.id === id) ?? catalog.missions['three_beacons_m01']!.sites.find((s) => s.id === id))
      .find((s) => s?.guard);
    if (anyGuard) expect(quoteNeutralReaction(catalog, tb.state, 'alexios', anyGuard.coord).kind).toBeNull();
  });
});
