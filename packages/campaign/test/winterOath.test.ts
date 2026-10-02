/**
 * The Winter Oath (Norse campaign, proposed this build): data checks, ordered
 * steps, and a headless journey through all seven missions with carryover.
 * Battles are fought by the tactical AI on both sides (auto-combat), so the
 * journey also checks that every mission can be won with its own war-band.
 */
import { describe, expect, it } from 'vitest';
import { loadCatalog } from '@pr/content';
import { GameDriver } from '@pr/testing';
import { campaignEpilogueLines, hexEquals, quoteMovement, type HexCoord, type MatchState } from '@pr/rules';
import { recordCompletion, startCampaign, startNextMission, type CampaignState } from '../src';

const catalog = loadCatalog();
const HERO = 'hervor';
const camp = catalog.campaigns.winter_oath!;

function status(d: GameDriver, id: string) {
  return d.state.mission.objectives[id]?.status;
}

function march(d: GameDriver, to: HexCoord, maxDays = 12) {
  d.resolveLevelUps();
  d.marchTo(to, HERO, maxDays);
  d.resolveLevelUps();
}

/** Move onto a moving target (a wandering band) until it is beaten. */
function hunt(d: GameDriver, heroDefinitionId: string, maxDays = 10) {
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
}

/** Build on the first free day in the hold. */
function build(d: GameDriver, townId: string, buildingId: string) {
  if (d.town(townId).buildUsedDay === d.state.day) d.endDay();
  d.do({ kind: 'BuildStructure', townId, buildingId });
}

function army(d: GameDriver): string {
  return d
    .hero(HERO)
    .army.slots.filter((s) => s)
    .map((s) => `${s!.creatureId}×${s!.count}`)
    .join(', ');
}

function finish(d: GameDriver, siteId: string) {
  d.resolveLevelUps();
  d.do({ kind: 'ActivateSite', heroId: HERO, siteId });
  d.resolveLevelUps();
  expect(d.state.outcome.status).toBe('victory');
}

function next(c: CampaignState, d: GameDriver): { campaign: CampaignState; d: GameDriver } {
  const done = recordCompletion(catalog, c, d.state);
  const n = startNextMission(catalog, done);
  return { campaign: n.campaign, d: new GameDriver(n.start.match, catalog) };
}

// ---------------------------------------------------------------------------

describe('The Winter Oath — data', () => {
  it('is a playable seven-mission Norse campaign with Odin as the fixed patron', () => {
    expect(camp.status).toBe('playable');
    expect(camp.missionIds).toHaveLength(7);
    expect(camp.startingGodOptions).toEqual(['norse_odin']);
    camp.missionIds.forEach((id, i) => {
      const m = catalog.missions[id]!;
      expect(m.order).toBe(i + 1);
      expect(m.campaignId).toBe('winter_oath');
      expect(m.player.pantheonId).toBe('norse');
      expect(m.signatureMechanics).toBe(true);
      expect(m.features?.expandedContent).toBe(true);
      // Every primary step after the first waits for an earlier one (played in order).
      const primaries = m.objectives.filter((o) => o.category === 'primary');
      expect(primaries[0]!.initialStatus).toBe('active');
      for (const o of primaries.slice(1)) expect(o.requires?.length || (o.condition.type === 'claim' ? 1 : 0)).toBeGreaterThan(0);
    });
  });

  it('chooses the epilogue by the last choice', () => {
    const returned = campaignEpilogueLines(camp, { sword_returned: true }).map((l) => l.text).join(' ');
    const broken = campaignEpilogueLines(camp, { sword_broken: true }).map((l) => l.text).join(' ');
    expect(returned).toMatch(/oath is mine now/);
    expect(broken).toMatch(/dead are free/);
    expect(campaignEpilogueLines(camp, {})).toHaveLength(camp.epilogue!.length);
  });

  it('M01: a step done early counts when its turn comes', () => {
    const d = GameDriver.mission('winter_oath_m01', { startingGodId: 'norse_odin' });
    expect(status(d, 'm01_ford')).toBe('locked');
    march(d, { q: 10, r: 8 }); // clear the ford before raising the watch
    expect(d.state.world.sites.m01_ford!.cleared).toBe(true);
    expect(status(d, 'm01_ford')).toBe('locked');
    march(d, { q: 3, r: 7 });
    d.do({ kind: 'RecruitUnits', townId: 'kaldvik', creatureId: 'norse_draugr', quantity: 10, destination: { kind: 'hero', heroId: HERO } });
    build(d, 'kaldvik', 'norse_barrow_up');
    d.do({ kind: 'UpgradeStack', townId: 'kaldvik', army: { kind: 'hero', heroId: HERO }, slot: 0, quantity: 8 });
    expect(status(d, 'm01_train')).toBe('completed');
    expect(status(d, 'm01_ford')).toBe('completed'); // done early, completes when it opens
    expect(status(d, 'm01_barrow_guard')).toBe('active');
  });
});

describe('The Winter Oath — single missions', () => {
  it('M05 seats Jarl Ulfhild as a full AI rival with a garrisoned town', () => {
    const d = GameDriver.mission('winter_oath_m05', { startingGodId: 'norse_odin' });
    expect(d.state.players.hvitstrand).toMatchObject({ controller: 'ai', role: 'rival', pantheonId: 'norse' });
    expect(d.state.towns.hvitstrand!.garrison.slots.filter((x) => x).length).toBe(3);
    expect(d.state.heroes.ulfhild!.ai?.profile).toBe('strategic');
    expect(status(d, 'm05_take_town')).toBe('locked');
  });

  it('M07 played directly ends with the sword returned', { timeout: 300_000 }, () => {
    const d = GameDriver.mission('winter_oath_m07', { startingGodId: 'norse_odin' });
    march(d, { q: 10, r: 13 });
    march(d, { q: 15, r: 15 });
    d.do({ kind: 'ActivateSite', heroId: HERO, siteId: 'm07_stone_south' });
    march(d, { q: 15, r: 4 });
    d.do({ kind: 'ActivateSite', heroId: HERO, siteId: 'm07_stone_north' });
    march(d, { q: 27, r: 10 });
    expect(status(d, 'm07_jarl')).toBe('completed');
    // The seal refuses until the sword's fate is decided.
    march(d, { q: 29, r: 12 });
    expect(d.reject({ kind: 'ActivateSite', heroId: HERO, siteId: 'm07_oath_mound' }).code).toBe('missing_requirement');
    march(d, { q: 29, r: 8 });
    d.do({ kind: 'ResolveMapEvent', heroId: HERO, siteId: 'm07_barrow_door', optionIndex: 0 });
    march(d, { q: 29, r: 12 });
    finish(d, 'm07_oath_mound');
    expect(campaignEpilogueLines(camp, d.state.mission.flags).map((l) => l.text).join(' ')).toMatch(/oath is mine now/);
  });
});

describe('The Winter Oath — headless campaign journey', () => {
  it('plays all seven missions with carryover, to either ending', { timeout: 1_200_000 }, () => {
    const log: string[] = [];
    const note = (d: GameDriver, label: string) => log.push(`${label}: day ${d.state.day}, L${d.hero(HERO).level} ${d.hero(HERO).xp}xp, wallet ${JSON.stringify(d.player.wallet)} — ${army(d)}`);
    let { campaign, start } = startCampaign(catalog, 'winter_oath', { runId: 'wo1', startingGodId: 'norse_odin' });
    let d = new GameDriver(start.match, catalog);
    expect(d.player.pantheon.patronGodId).toBe('norse_odin');

    // --- M01 Barrow Light
    d.do({ kind: 'RecruitUnits', townId: 'kaldvik', creatureId: 'norse_draugr', quantity: 10, destination: { kind: 'hero', heroId: HERO } });
    d.do({ kind: 'BuildStructure', townId: 'kaldvik', buildingId: 'norse_barrow_up' });
    d.do({ kind: 'UpgradeStack', townId: 'kaldvik', army: { kind: 'hero', heroId: HERO }, slot: 0, quantity: 28 });
    march(d, { q: 7, r: 5 });
    d.do({ kind: 'ResolveMapEvent', heroId: HERO, siteId: 'm01_longship', optionIndex: 1 });
    march(d, { q: 10, r: 8 });
    march(d, { q: 16, r: 7 });
    expect(d.state.world.sites.m01_rune_stone!.cleared).toBe(true);
    expect(Object.values(d.hero(HERO).equipment).some((a) => a?.artifactId === 'rune_marked_sword')).toBe(true);
    note(d, 'M01 before rune');
    finish(d, 'm01_rune_stone');

    // --- M02 The White Pack
    ({ campaign, d } = next(campaign, d));
    expect(d.state.mission.missionId).toBe('winter_oath_m02');
    expect(Object.values(d.hero(HERO).equipment).some((a) => a?.artifactId === 'rune_marked_sword')).toBe(true); // carried
    d.do({ kind: 'BuildStructure', townId: 'birkaby', buildingId: 'norse_wolf_den' });
    d.do({ kind: 'RecruitUnits', townId: 'birkaby', creatureId: 'norse_frost_wolf', quantity: 8, destination: { kind: 'hero', heroId: HERO } });
    march(d, { q: 8, r: 5 });
    expect(d.state.mission.revealedSiteIds).toContain('m02_lair');
    march(d, { q: 12, r: 8 });
    expect(status(d, 'm02_bridge')).toBe('completed');
    hunt(d, 'norse_white_pack');
    expect(status(d, 'm02_pack')).toBe('completed');
    march(d, { q: 21, r: 8 });
    note(d, 'M02 before rune');
    finish(d, 'm02_rune_stone');

    // --- M03 The Valkyrie's Price
    ({ campaign, d } = next(campaign, d));
    d.do({ kind: 'BuildStructure', townId: 'fjallhof', buildingId: 'norse_hof_2' });
    march(d, { q: 13, r: 9 });
    march(d, { q: 17, r: 4 });
    expect(status(d, 'm03_aerie')).toBe('completed');
    march(d, { q: 15, r: 13 });
    d.do({ kind: 'ResolveMapEvent', heroId: HERO, siteId: 'm03_hearth', optionIndex: 0 });
    expect(status(d, 'm03_troll_oath')).toBe('completed');
    for (let i = 0; i < 6 && d.player.wallet.favor < 20; i++) d.endDay();
    d.do({ kind: 'SelectGod', godId: 'norse_tyr' });
    expect(status(d, 'm03_pantheon')).toBe('completed');
    d.do({ kind: 'AssignCovenant', townId: 'fjallhof', entitlementId: 'covenant.norse_frost_troll.wo3' });
    march(d, { q: 3, r: 9 });
    build(d, 'fjallhof', 'norse_valkyrie_aerie');
    build(d, 'fjallhof', 'norse_valkyrie_aerie_up');
    d.do({ kind: 'RecruitUnits', townId: 'fjallhof', creatureId: 'norse_battle_valkyrie', quantity: 2, destination: { kind: 'hero', heroId: HERO } });
    expect(status(d, 'm03_valkyries')).toBe('completed');
    march(d, { q: 20, r: 9 });
    march(d, { q: 23, r: 9 });
    note(d, 'M03 before rune');
    finish(d, 'm03_rune_stone');

    // --- M04 Ice on the Sound
    ({ campaign, d } = next(campaign, d));
    expect(d.player.pantheon.minorGodIds).toEqual(['norse_tyr']);
    d.do({ kind: 'BuildStructure', townId: 'skarvik', buildingId: 'norse_lindworm_roost' });
    d.do({ kind: 'RecruitUnits', townId: 'skarvik', creatureId: 'norse_lindworm', quantity: 3, destination: { kind: 'hero', heroId: HERO } });
    march(d, { q: 7, r: 3 });
    d.do({ kind: 'ResolveMapEvent', heroId: HERO, siteId: 'm04_wanderer', optionIndex: 0 });
    march(d, { q: 11, r: 9 });
    march(d, { q: 15, r: 4 });
    d.do({ kind: 'ActivateSite', heroId: HERO, siteId: 'm04_cairn_north' });
    march(d, { q: 15, r: 14 });
    d.do({ kind: 'ActivateSite', heroId: HERO, siteId: 'm04_cairn_south' });
    expect(status(d, 'm04_fog')).toBe('completed');
    march(d, { q: 24, r: 9 });
    note(d, 'M04 before well');
    finish(d, 'm04_well');

    // --- M05 The Jarl of Hvitstrand
    ({ campaign, d } = next(campaign, d));
    d.do({ kind: 'BuildStructure', townId: 'ravnholt', buildingId: 'norse_high_hall' });
    march(d, { q: 15, r: 6 });
    expect(status(d, 'm05_crossing')).toBe('completed');
    for (let i = 0; i < 6 && d.player.wallet.favor < 25; i++) d.endDay();
    d.do({ kind: 'SelectGod', godId: 'norse_heimdall' });
    expect(status(d, 'm05_second_god')).toBe('completed');
    march(d, { q: 26, r: 10 }, 16);
    expect(status(d, 'm05_take_town')).toBe('completed');
    const ulf = d.state.heroes.ulfhild!;
    log.push(`M05 Hvitstrand taken on day ${d.state.day}; Ulfhild ${ulf.status} at ${ulf.position.q},${ulf.position.r} with ${ulf.army.slots.filter((x) => x).map((x) => `${x!.creatureId}×${x!.count}`).join(', ')}`);
    march(d, { q: 26, r: 7 });
    note(d, 'M05 before stone');
    finish(d, 'm05_oath_stone');

    // --- M06 The Giants' Refuge
    ({ campaign, d } = next(campaign, d));
    expect(d.player.pantheon.minorGodIds).toEqual(['norse_tyr', 'norse_heimdall']);
    march(d, { q: 11, r: 6 });
    march(d, { q: 16, r: 10 });
    d.do({ kind: 'ClaimObjective', objectiveId: 'm06_claim' });
    d.do({ kind: 'AssignCovenant', townId: 'jokulsby', entitlementId: 'covenant.norse_jotunn.wo6' });
    march(d, { q: 3, r: 10 });
    build(d, 'jokulsby', 'norse_jotunn_camp');
    d.do({ kind: 'RecruitUnits', townId: 'jokulsby', creatureId: 'norse_jotunn', quantity: 2, destination: { kind: 'hero', heroId: HERO } });
    expect(status(d, 'm06_giants')).toBe('completed');
    march(d, { q: 22, r: 10 });
    expect(status(d, 'm06_hrafn')).toBe('completed');
    march(d, { q: 26, r: 10 });
    note(d, 'M06 before horn');
    finish(d, 'm06_horn');

    // --- M07 Oathbreaker's Hall
    ({ campaign, d } = next(campaign, d));
    const set = Object.values(d.hero(HERO).equipment).filter((a) => a && catalog.artifacts[a.artifactId]?.setId === 'arms_of_the_einherjar').length;
    log.push(`M07 entry: Arms of the Einherjar pieces worn ${set}`);
    march(d, { q: 10, r: 6 });
    march(d, { q: 15, r: 4 });
    d.do({ kind: 'ActivateSite', heroId: HERO, siteId: 'm07_stone_north' });
    march(d, { q: 15, r: 15 });
    d.do({ kind: 'ActivateSite', heroId: HERO, siteId: 'm07_stone_south' });
    expect(status(d, 'm07_gate')).toBe('completed');
    note(d, 'M07 before the Jarl');
    march(d, { q: 27, r: 10 });
    expect(status(d, 'm07_jarl')).toBe('completed');
    march(d, { q: 29, r: 8 });
    d.do({ kind: 'ResolveMapEvent', heroId: HERO, siteId: 'm07_barrow_door', optionIndex: 1 });
    expect(d.state.mission.flags.sword_broken).toBe(true);
    march(d, { q: 29, r: 12 });
    note(d, 'M07 before seal');
    finish(d, 'm07_oath_mound');
    const final = recordCompletion(catalog, campaign, d.state);
    expect(final.status).toBe('completed');
    expect(campaignEpilogueLines(camp, d.state.mission.flags).map((l) => l.text).join(' ')).toMatch(/dead are free/);

    console.log(log.join('\n'));
  });
});

export type { MatchState };
