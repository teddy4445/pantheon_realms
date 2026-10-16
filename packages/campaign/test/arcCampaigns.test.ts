/**
 * The campaigns built on the Winter Oath arc: Egyptian, Japanese, Celtic and
 * Mesoamerican (owner request 2026-10-02) and The Silent Oracle, the second Greek
 * campaign (owner request 2026-10-14), seven missions each. Data checks,
 * map generation, and a headless journey through all seven missions of each
 * with carryover. Battles are fought by the tactical AI on both sides
 * (auto-combat), so every journey also checks that each mission can be won with
 * its own war-band. The walkthrough is the same for every arc campaign (same
 * mission shapes and positions); only troops, buildings and gods differ.
 */
import { describe, expect, it } from 'vitest';
import { loadCatalog } from '@pr/content';
import { generateMap } from '@pr/mapgen';
import { GameDriver } from '@pr/testing';
import { campaignEpilogueLines, hexEquals, missionText, quoteMovement, quoteRecruitment, recruitableCreatureIds, type HexCoord } from '@pr/rules';
import { recordCompletion, startCampaign, startNextMission, type CampaignState } from '../src';

const catalog = loadCatalog();

interface ArcCase {
  readonly campaignId: string;
  readonly pantheonId: string;
  readonly heroId: string;
  readonly patron: string;
  readonly firstGod: string;
  readonly secondGod: string;
  readonly towns: readonly string[];
  readonly endingFlags: readonly [string, string];
  /** Mission 3's elite recruits (default 2, the objective's count): Greek Companion Cavalry are few and fragile, so the journey brings the week's four. */
  readonly elites?: number;
}

const CASES: readonly ArcCase[] = [
  { campaignId: 'silent_oracle', pantheonId: 'greek', heroId: 'alexios', patron: 'zeus', firstGod: 'athena', secondGod: 'hermes', towns: ['elaia', 'thymbra', 'aetos', 'halia', 'akte', 'kerata', 'kalliste'], endingFlags: ['oracle_speaks', 'cities_decide'], elites: 4 },
  { campaignId: 'twelfth_hour', pantheonId: 'egyptian', heroId: 'seshet', patron: 'egyptian_ra', firstGod: 'egyptian_isis', secondGod: 'egyptian_thoth', towns: ['abedju', 'nekheb', 'edfu', 'per_djehuty', 'tjebu', 'iunu', 'abu'], endingFlags: ['coil_bound', 'coil_cut'] },
  { campaignId: 'lantern_road', pantheonId: 'japanese', heroId: 'akane', patron: 'japanese_amaterasu', firstGod: 'japanese_hachiman', secondGod: 'japanese_inari', towns: ['kagaribi', 'mizuhara', 'kumoyama', 'shiogama', 'akashi', 'takamori', 'hikari'], endingFlags: ['lanterns_lit', 'road_open'] },
  { campaignId: 'silver_branch', pantheonId: 'celtic', heroId: 'orla', patron: 'celtic_dagda', firstGod: 'celtic_brigid', secondGod: 'celtic_lugh', towns: ['dun_caill', 'dun_bera', 'rath_eala', 'inis_ron', 'dun_ard', 'coill_dubh', 'dun_brugh'], endingFlags: ['branch_mended', 'branch_planted'] },
  { campaignId: 'new_fire', pantheonId: 'mesoamerican', heroId: 'itzel', patron: 'mesoamerican_quetzalcoatl', firstGod: 'mesoamerican_coatlicue', secondGod: 'mesoamerican_tlaloc', towns: ['xochitla', 'tepeyolo', 'ocelotepec', 'acalco', 'tonalco', 'quetzaltepec', 'tlapallan'], endingFlags: ['old_sun', 'new_sun'] },
];

function rosterOf(pantheonId: string) {
  const p = catalog.pantheons[pantheonId]!;
  return [null, ...p.roster.map((r) => catalog.families[r.familyId]!)];
}

for (const c of CASES) {
  const camp = catalog.campaigns[c.campaignId]!;
  const HERO = c.heroId;
  const fam = rosterOf(c.pantheonId);
  const base = (tier: number) => fam[tier]!.baseCreatureId;
  const up = (tier: number) => fam[tier]!.upgradedCreatureId;
  // A town location's level: the archetype's own chain (kit towns `<pantheon>_<slot>_l<n>`, the Greek polis its own names).
  const archetype = catalog.townArchetypes[catalog.pantheons[c.pantheonId]!.townArchetypeId]!;
  const b = (slot: string, level = 1) => archetype.slots.find((s) => s.id === slot)!.chain[level - 1]!;

  const status = (d: GameDriver, id: string) => d.state.mission.objectives[id]?.status;
  const march = (d: GameDriver, to: HexCoord, maxDays = 14) => {
    d.resolveLevelUps();
    d.marchTo(to, HERO, maxDays);
    d.resolveLevelUps();
  };
  /** Recruit what the town has and the treasury pays for into the hero (highest tier first), when the hero is there. */
  const muster = (d: GameDriver, townId: string) => {
    const town = d.state.towns[townId]!;
    if (!hexEquals(d.hero(HERO).position, town.coord)) return;
    const ids = recruitableCreatureIds(d.catalog, town).sort((a, b) => d.catalog.creatures[b]!.tier - d.catalog.creatures[a]!.tier);
    for (const id of ids) {
      const q = quoteRecruitment(d.catalog, d.state, 'player', townId, id, 1, { kind: 'hero', heroId: HERO });
      if (!q.legal || q.maxQuantity <= 0) continue;
      d.do({ kind: 'RecruitUnits', townId, creatureId: id, quantity: q.maxQuantity, destination: { kind: 'hero', heroId: HERO } });
    }
  };
  const hunt = (d: GameDriver, heroDefinitionId: string, maxDays = 12) => {
    for (let day = 0; day < maxDays; day++) {
      for (let step = 0; step < 6; step++) {
        const prey = Object.values(d.state.heroes).find((h) => h.definitionId === heroDefinitionId);
        if (!prey || prey.status !== 'active') return;
        const q = quoteMovement(d.catalog, d.state, HERO, prey.position);
        if (!q.reachable || q.stopIndex < 0) break;
        d.do({ kind: 'MoveHero', heroId: HERO, destination: prey.position, confirmEncounter: true });
        if (d.state.battle) d.autoBattle();
        d.resolveLevelUps();
        if (hexEquals(d.hero(HERO).position, prey.position)) break;
      }
      const prey = Object.values(d.state.heroes).find((h) => h.definitionId === heroDefinitionId);
      if (!prey || prey.status !== 'active') return;
      d.endDay();
      d.resolveLevelUps();
    }
    throw new Error(`${heroDefinitionId} was not caught`);
  };
  const build = (d: GameDriver, townId: string, buildingId: string) => {
    if (d.town(townId).buildUsedDay === d.state.day) d.endDay();
    d.do({ kind: 'BuildStructure', townId, buildingId });
  };
  const finish = (d: GameDriver, siteId: string) => {
    d.resolveLevelUps();
    d.do({ kind: 'ActivateSite', heroId: HERO, siteId });
    d.resolveLevelUps();
    expect(d.state.outcome.status).toBe('victory');
  };
  const next = (cs: CampaignState, d: GameDriver): { campaign: CampaignState; d: GameDriver } => {
    const done = recordCompletion(catalog, cs, d.state);
    const n = startNextMission(catalog, done);
    return { campaign: n.campaign, d: new GameDriver(n.start.match, catalog) };
  };
  const army = (d: GameDriver) =>
    d
      .hero(HERO)
      .army.slots.filter((s) => s)
      .map((s) => `${s!.creatureId}×${s!.count}`)
      .join(', ');

  describe(`${camp?.name ?? c.campaignId} — data`, () => {
    it(`is a playable seven-mission ${c.pantheonId} campaign with a fixed patron, played in order`, () => {
      expect(camp.status).toBe('playable');
      expect(camp.missionIds).toHaveLength(7);
      expect(camp.startingGodOptions).toEqual([c.patron]);
      camp.missionIds.forEach((id, i) => {
        const m = catalog.missions[id]!;
        expect(m.order).toBe(i + 1);
        expect(m.campaignId).toBe(c.campaignId);
        expect(m.player.pantheonId).toBe(c.pantheonId);
        expect(m.player.town.townId).toBe(c.towns[i]);
        const primaries = m.objectives.filter((o) => o.category === 'primary');
        expect(primaries[0]!.initialStatus).toBe('active');
        for (const o of primaries.slice(1)) expect(o.requires?.length || (o.condition.type === 'claim' ? 1 : 0)).toBeGreaterThan(0);
        // Every objective names its troops once written out (no raw IDs or tokens left in the text).
        for (const o of m.objectives) expect(missionText(catalog, null, o.description), `${id}/${o.id}`).not.toMatch(/[a-z]+_[a-z_]+|[{}]/);
      });
    });

    it('every map generates and validates', () => {
      for (const id of camp.missionIds) {
        const res = generateMap(catalog.mapTemplates[catalog.missions[id]!.mapTemplateId]!);
        expect(res.report.valid, id).toBe(true);
      }
    });

    it('chooses the epilogue by the last choice', () => {
      const a = campaignEpilogueLines(camp, { [c.endingFlags[0]]: true }).map((l) => l.text).join(' ');
      const z = campaignEpilogueLines(camp, { [c.endingFlags[1]]: true }).map((l) => l.text).join(' ');
      expect(a).not.toBe(z);
      expect(campaignEpilogueLines(camp, {})).toHaveLength(camp.epilogue!.length);
    });
  });

  describe(`${camp?.name ?? c.campaignId} — headless campaign journey`, () => {
    it('plays all seven missions with carryover', { timeout: 1_500_000 }, () => {
      const log: string[] = [];
      const note = (d: GameDriver, label: string) => log.push(`${label}: day ${d.state.day}, L${d.hero(HERO).level} ${d.hero(HERO).xp}xp — ${army(d)}`);
      let { campaign, start } = startCampaign(catalog, c.campaignId, { runId: `${c.campaignId}-1`, startingGodId: c.patron, contentVersion: 1 });
      let d = new GameDriver(start.match, catalog);
      expect(d.player.pantheon.patronGodId).toBe(c.patron);

      // --- M01 Restore
      const t1 = c.towns[0]!;
      d.do({ kind: 'RecruitUnits', townId: t1, creatureId: base(1), quantity: 10, destination: { kind: 'hero', heroId: HERO } });
      d.do({ kind: 'BuildStructure', townId: t1, buildingId: b('dwelling_t1', 2) });
      const slot = d.hero(HERO).army.slots.findIndex((s) => s?.creatureId === base(1));
      d.do({ kind: 'UpgradeStack', townId: t1, army: { kind: 'hero', heroId: HERO }, slot, quantity: d.hero(HERO).army.slots[slot]!.count });
      march(d, { q: 7, r: 5 });
      d.do({ kind: 'ResolveMapEvent', heroId: HERO, siteId: 'm01_event', optionIndex: 1 });
      march(d, { q: 10, r: 8 });
      march(d, { q: 16, r: 7 });
      expect(d.state.world.sites.m01_monument!.cleared).toBe(true);
      note(d, 'M01');
      finish(d, 'm01_monument');

      // --- M02 Hunt
      ({ campaign, d } = next(campaign, d));
      const t2 = c.towns[1]!;
      d.do({ kind: 'BuildStructure', townId: t2, buildingId: b('dwelling_t2') });
      d.do({ kind: 'RecruitUnits', townId: t2, creatureId: base(2), quantity: 8, destination: { kind: 'hero', heroId: HERO } });
      march(d, { q: 8, r: 5 });
      expect(d.state.mission.revealedSiteIds).toContain('m02_lair');
      march(d, { q: 12, r: 8 });
      expect(status(d, 'm02_bridge')).toBe('completed');
      const prey = catalog.missions[`${c.campaignId}_m02`]!.hostileHeroes[0]!.commander.heroDefinitionId;
      hunt(d, prey);
      expect(status(d, 'm02_prey')).toBe('completed');
      march(d, { q: 21, r: 8 });
      note(d, 'M02');
      finish(d, 'm02_stone');

      // --- M03 Covenant
      ({ campaign, d } = next(campaign, d));
      const t3 = c.towns[2]!;
      d.do({ kind: 'BuildStructure', townId: t3, buildingId: b('pantheon_temple', 2) });
      march(d, { q: 13, r: 9 });
      march(d, { q: 17, r: 4 });
      expect(status(d, 'm03_roost')).toBe('completed');
      march(d, { q: 15, r: 13 });
      d.do({ kind: 'ResolveMapEvent', heroId: HERO, siteId: 'm03_hearth', optionIndex: 0 });
      expect(status(d, 'm03_covenant')).toBe('completed');
      for (let i = 0; i < 8 && d.player.wallet.favor < 20; i++) d.endDay();
      d.do({ kind: 'SelectGod', godId: c.firstGod });
      expect(status(d, 'm03_god')).toBe('completed');
      const cov3 = catalog.missions[`${c.campaignId}_m03`]!.sites.find((s) => s.id === 'm03_home')!.guard!.reward.entitlementIds![0]!;
      d.do({ kind: 'AssignCovenant', townId: t3, entitlementId: cov3 });
      march(d, { q: 3, r: 9 });
      build(d, t3, b('dwelling_t4'));
      build(d, t3, b('dwelling_t4', 2));
      d.do({ kind: 'RecruitUnits', townId: t3, creatureId: up(4), quantity: c.elites ?? 2, destination: { kind: 'hero', heroId: HERO } });
      expect(status(d, 'm03_elite')).toBe('completed');
      march(d, { q: 20, r: 9 });
      march(d, { q: 23, r: 9 });
      note(d, 'M03');
      finish(d, 'm03_stone');

      // --- M04 Seek
      ({ campaign, d } = next(campaign, d));
      expect(d.player.pantheon.minorGodIds).toEqual([c.firstGod]);
      const t4 = c.towns[3]!;
      d.do({ kind: 'BuildStructure', townId: t4, buildingId: b('dwelling_t5') });
      d.do({ kind: 'RecruitUnits', townId: t4, creatureId: base(5), quantity: 3, destination: { kind: 'hero', heroId: HERO } });
      march(d, { q: 7, r: 3 });
      d.do({ kind: 'ResolveMapEvent', heroId: HERO, siteId: 'm04_wanderer', optionIndex: 0 });
      march(d, { q: 11, r: 9 });
      march(d, { q: 15, r: 4 });
      d.do({ kind: 'ActivateSite', heroId: HERO, siteId: 'm04_north' });
      march(d, { q: 15, r: 14 });
      d.do({ kind: 'ActivateSite', heroId: HERO, siteId: 'm04_south' });
      expect(status(d, 'm04_gate')).toBe('completed');
      march(d, { q: 24, r: 9 });
      note(d, 'M04');
      finish(d, 'm04_goal');

      // --- M05 Rival
      ({ campaign, d } = next(campaign, d));
      const t5 = c.towns[4]!;
      d.do({ kind: 'BuildStructure', townId: t5, buildingId: b('civic_hall', 3) });
      // The rival AI weighs skills and upgrades since 2026-10-03 and stays behind its
      // walls against a stronger war-band: bring every recruit the town offers.
      muster(d, t5);
      march(d, { q: 15, r: 6 });
      expect(status(d, 'm05_crossing')).toBe('completed');
      for (let i = 0; i < 8 && d.player.wallet.favor < 25; i++) d.endDay();
      d.do({ kind: 'SelectGod', godId: c.secondGod });
      expect(status(d, 'm05_god')).toBe('completed');
      const rival = catalog.missions[`${c.campaignId}_m05`]!.rivals![0]!;
      march(d, { q: 26, r: 10 }, 18);
      expect(status(d, 'm05_town')).toBe('completed');
      const rh = d.state.heroes[rival.hero.heroId]!;
      log.push(`M05 ${rival.name} taken on day ${d.state.day}; rival hero ${rh.status}`);
      march(d, { q: 26, r: 7 });
      note(d, 'M05');
      finish(d, 'm05_stele');

      // --- M06 Refuge
      ({ campaign, d } = next(campaign, d));
      expect(d.player.pantheon.minorGodIds).toEqual([c.firstGod, c.secondGod]);
      const t6 = c.towns[5]!;
      march(d, { q: 11, r: 6 });
      march(d, { q: 16, r: 10 });
      d.do({ kind: 'ClaimObjective', objectiveId: 'm06_claim' });
      const cov6 = catalog.missions[`${c.campaignId}_m06`]!.objectives.find((o) => o.id === 'm06_claim')!.reward!.entitlementIds![0]!;
      d.do({ kind: 'AssignCovenant', townId: t6, entitlementId: cov6 });
      march(d, { q: 3, r: 10 });
      build(d, t6, b('dwelling_t6'));
      d.do({ kind: 'RecruitUnits', townId: t6, creatureId: base(6), quantity: 2, destination: { kind: 'hero', heroId: HERO } });
      expect(status(d, 'm06_elite')).toBe('completed');
      march(d, { q: 22, r: 10 });
      expect(status(d, 'm06_gate')).toBe('completed');
      march(d, { q: 26, r: 10 });
      note(d, 'M06');
      finish(d, 'm06_horn');

      // --- M07 Finale
      ({ campaign, d } = next(campaign, d));
      march(d, { q: 10, r: 6 });
      march(d, { q: 15, r: 4 });
      d.do({ kind: 'ActivateSite', heroId: HERO, siteId: 'm07_stone_north' });
      march(d, { q: 15, r: 15 });
      d.do({ kind: 'ActivateSite', heroId: HERO, siteId: 'm07_stone_south' });
      expect(status(d, 'm07_gate')).toBe('completed');
      note(d, 'M07 before the boss');
      march(d, { q: 27, r: 10 });
      expect(status(d, 'm07_boss')).toBe('completed');
      march(d, { q: 29, r: 8 });
      d.do({ kind: 'ResolveMapEvent', heroId: HERO, siteId: 'm07_choice', optionIndex: 1 });
      expect(d.state.mission.flags[c.endingFlags[1]]).toBe(true);
      march(d, { q: 29, r: 12 });
      note(d, 'M07 before the seal');
      finish(d, 'm07_seal');
      const final = recordCompletion(catalog, campaign, d.state);
      expect(final.status).toBe('completed');
      console.log(`${c.campaignId}\n${log.join('\n')}`);
    });
  });
}
