import { describe, expect, it } from 'vitest';
import { loadCatalog } from '@pr/content';
import { GameDriver } from '@pr/testing';
import { canonicalStateHash, findHeroPath, deepClone, objectiveDoneEarly, quoteMovement, type MatchState } from '@pr/rules';
import { recordCompletion, startCampaign, startNextMission, restartCurrentMission, startPracticeReplay } from '../src';

const catalog = loadCatalog();

/** All-gates-open reference route cost between two coordinates (campaign/02 §6 ceilings). */
function routeCost(state: MatchState, from: { q: number; r: number }, to: { q: number; r: number }): number {
  const s = deepClone(state);
  for (const site of Object.values(s.world.sites)) {
    site.cleared = true;
    site.open = true;
  }
  for (const fog of Object.values(s.fog)) fog.explored.fill(1);
  s.heroes.alexios!.position = from;
  for (const h of Object.values(s.heroes)) if (h.id !== 'alexios') h.status = 'defeated';
  const p = findHeroPath(catalog, s, 'alexios', to);
  if (!p.reachable) throw new Error(`no route ${JSON.stringify(from)} -> ${JSON.stringify(to)}: ${p.reason}`);
  return p.totalCost;
}

// Since 2026-10-03 (owner request) heroes stand at a town's gate — the road tile in
// front of it — not on the town's own tile, so routes start one road step out of town:
// each reference cost from implementation/06 (measured from the town tile) is one road
// edge (ROAD) shorter from the gate. Routes back to a town end at its gate.
const ROAD = 75;
describe('reference route costs (implementation/06, from the town gate)', () => {
  it('M01 town -> ford -> beacon: 975 MP from the town tile, 900 from its gate', () => {
    const d = GameDriver.mission('three_beacons_m01');
    expect(routeCost(d.state, { q: 4, r: 7 }, { q: 10, r: 7 }) + routeCost(d.state, { q: 10, r: 7 }, { q: 16, r: 7 })).toBe(975 - ROAD);
  });
  it('M02 town -> pass -> nest is 1,275 MP and the return is 1,275 MP', () => {
    const d = GameDriver.mission('three_beacons_m02');
    const out = routeCost(d.state, { q: 4, r: 8 }, { q: 13, r: 8 }) + routeCost(d.state, { q: 13, r: 8 }, { q: 20, r: 6 });
    expect(out).toBe(1275 - ROAD);
    expect(routeCost(d.state, { q: 20, r: 6 }, { q: 3, r: 8 })).toBe(1275 - ROAD);
  });
  it('M03 via the north crossing and both relays is 2,400 MP; via the south 3,025 MP', () => {
    const d = GameDriver.mission('three_beacons_m03');
    const legs = (pts: { q: number; r: number }[]) => pts.slice(1).reduce((n, p, i) => n + routeCost(d.state, pts[i]!, p), 0);
    const town = { q: 4, r: 10 };
    const rn = { q: 16, r: 5 };
    const rs = { q: 16, r: 14 };
    const gate = { q: 21, r: 10 };
    const beacon = { q: 26, r: 10 };
    expect(legs([town, { q: 12, r: 6 }, rn, rs, gate, beacon])).toBe(2400 - ROAD);
    expect(legs([town, { q: 12, r: 13 }, rn, rs, gate, beacon])).toBe(3025 - ROAD);
  });
});

describe('The Three Beacons — headless campaign journey', () => {
  it('plays M01 end-to-end, carries the hero into M02, and continues idempotently', () => {
    const { campaign, start } = startCampaign(catalog, 'three_beacons', { runId: 'run1', startingGodId: 'zeus' });
    const d = new GameDriver(start.match, catalog);
    expect(d.player.pantheon.patronGodId).toBe('zeus');

    // Asterion: build the Veteran Barracks, recruit 8, train at least 10.
    d.do({ kind: 'BuildStructure', townId: 'asterion', buildingId: 'barracks_up' });
    d.do({ kind: 'RecruitUnits', townId: 'asterion', creatureId: 'hoplite', quantity: 8, destination: { kind: 'hero', heroId: 'alexios' } });
    d.do({ kind: 'UpgradeStack', townId: 'asterion', army: { kind: 'hero', heroId: 'alexios' }, slot: 0, quantity: 28 });
    expect(d.state.mission.objectives.m01_recruit!.status).toBe('completed');
    expect(d.state.mission.objectives.m01_upgrade!.status).toBe('completed');

    // Restoration is refused before the guards fall.
    d.marchTo({ q: 10, r: 7 });
    expect(d.state.world.sites.m01_ford!.cleared).toBe(true);
    d.marchTo({ q: 16, r: 7 });
    expect(d.state.world.sites.m01_beacon!.cleared).toBe(true);
    d.resolveLevelUps();
    d.do({ kind: 'ActivateSite', heroId: 'alexios', siteId: 'm01_beacon' });
    d.resolveLevelUps();
    expect(d.state.outcome.status).toBe('victory');
    expect(d.hero().xp).toBeLessThanOrEqual(3199);
    expect(d.hero().level).toBeGreaterThanOrEqual(2);

    const done = recordCompletion(catalog, campaign, d.state);
    expect(done.completions).toHaveLength(1);
    expect(recordCompletion(catalog, done, d.state)).toBe(done); // exactly once

    const a = startNextMission(catalog, done);
    const b = startNextMission(catalog, done);
    expect(a.start.entryHash).toBe(b.start.entryHash); // Continue twice -> same entry, no duplicate army
    const m2 = a.start.match;
    expect(m2.mission.missionId).toBe('three_beacons_m02');
    expect(m2.heroes.alexios!.level).toBe(d.hero().level);
    expect(m2.heroes.alexios!.xp).toBe(d.hero().xp);
    expect(m2.players.player!.wallet.gold).toBe(9500); // wallet replaced by the expedition manifest
    expect(m2.heroes.alexios!.army.slots[0]).toMatchObject({ creatureId: 'hoplite', count: 32 });
    expect(m2.players.player!.pantheon.patronGodId).toBe('zeus');

    // Restart reproduces the exact entry state.
    expect(restartCurrentMission(catalog, a.campaign).entryHash).toBe(a.start.entryHash);
    // Practice replays never touch the primary run.
    const practice = startPracticeReplay(catalog, a.campaign, 'three_beacons_m01');
    expect(practice.campaign.branch).toBe('practice');
    expect(a.campaign.completions).toHaveLength(1);
  });

  it('plays M02 with the Griffin covenant chain and a divine choice', () => {
    const { campaign, start } = startCampaign(catalog, 'three_beacons', { runId: 'run2', startingGodId: 'zeus' });
    void campaign;
    void start;
    const d = GameDriver.mission('three_beacons_m02');
    d.do({ kind: 'BuildStructure', townId: 'passhaven', buildingId: 'temple_2' });
    d.endDay();
    d.do({ kind: 'BuildStructure', townId: 'passhaven', buildingId: 'training_court' });
    d.marchTo({ q: 8, r: 5 }); // Old Watchtower reveals the nest
    expect(d.state.mission.revealedSiteIds).toContain('m02_nest_guard');
    d.marchTo({ q: 13, r: 8 });
    expect(d.state.world.sites.m02_pass_guard!.cleared).toBe(true);
    d.marchTo({ q: 20, r: 6 });
    expect(d.state.world.sites.m02_nest_guard!.cleared).toBe(true);
    expect(d.state.mission.objectives.m02_claim_covenant!.status).toBe('available');
    d.do({ kind: 'ClaimObjective', objectiveId: 'm02_claim_covenant' });
    expect(d.reject({ kind: 'ClaimObjective', objectiveId: 'm02_claim_covenant' }).code).toBe('already_done');
    d.do({ kind: 'AssignCovenant', townId: 'passhaven', entitlementId: 'covenant.griffin.m02' });
    d.do({ kind: 'SelectGod', godId: 'athena' });
    expect(d.reject({ kind: 'SelectGod', godId: 'ares' }).code).toBe('missing_requirement');
    // Build the Aerie chain on separate days while returning home.
    d.do({ kind: 'BuildStructure', townId: 'passhaven', buildingId: 'griffin_aerie' });
    d.marchTo({ q: 3, r: 8 });
    if (d.town('passhaven').buildUsedDay === d.state.day) d.endDay();
    d.do({ kind: 'BuildStructure', townId: 'passhaven', buildingId: 'griffin_aerie_up' });
    // Windcrest objective is live: recruit 2 into Alexios (must be in town).
    d.do({ kind: 'RecruitUnits', townId: 'passhaven', creatureId: 'windcrest_griffin', quantity: 2, destination: { kind: 'hero', heroId: 'alexios' } });
    expect(d.state.mission.objectives.m02_windcrest!.status).toBe('completed');
    d.marchTo({ q: 22, r: 10 });
    d.do({ kind: 'ActivateSite', heroId: 'alexios', siteId: 'm02_beacon' });
    d.resolveLevelUps();
    expect(d.state.outcome.status).toBe('victory');
    expect(d.player.pantheon.minorGodIds).toEqual(['athena']);
  });

  it('M02 is played in order: the ridge blocks the far side until the pass falls, and steps open one after another', () => {
    const d = GameDriver.mission('three_beacons_m02');
    for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
    d.hero().movementPoints = 99999;
    const status = (id: string) => d.state.mission.objectives[id]!.status;
    // Beyond the ridge nothing can be reached before the pass is broken.
    for (const c of [{ q: 20, r: 6 }, { q: 22, r: 10 }, { q: 19, r: 13 }]) expect(quoteMovement(d.catalog, d.state, 'alexios', c).reachable).toBe(false);
    expect(status('m02_pass_guard')).toBe('active');
    for (const id of ['m02_nest_guard', 'm02_claim_covenant', 'm02_pantheon', 'm02_windcrest', 'm02_restore']) expect(status(id)).toBe('locked');
    d.hero().movementPoints = 1560;
    d.marchTo({ q: 13, r: 8 });
    expect(status('m02_pass_guard')).toBe('completed');
    expect(status('m02_nest_guard')).toBe('active');
    expect(status('m02_pantheon')).toBe('locked');
    d.hero().movementPoints = 99999;
    for (const c of [{ q: 20, r: 6 }, { q: 22, r: 10 }]) expect(quoteMovement(d.catalog, d.state, 'alexios', c).reachable).toBe(true);
  });

  it('M02: a god chosen ahead of its step counts the moment the step opens', () => {
    const d = GameDriver.mission('three_beacons_m02');
    d.player.wallet.favor = 40;
    d.do({ kind: 'BuildStructure', townId: 'passhaven', buildingId: 'temple_2' });
    d.do({ kind: 'SelectGod', godId: 'ares' });
    const def = d.catalog.missions.three_beacons_m02!.objectives.find((o) => o.id === 'm02_pantheon')!;
    expect(d.state.mission.objectives.m02_pantheon!.status).toBe('locked');
    expect(objectiveDoneEarly(d.catalog, d.state, def)).toBe(true);
    d.marchTo({ q: 13, r: 8 });
    d.marchTo({ q: 20, r: 6 });
    const events = d.do({ kind: 'ClaimObjective', objectiveId: 'm02_claim_covenant' });
    // Claiming opens the god step, which is already satisfied: completed in the same command.
    expect(d.state.mission.objectives.m02_pantheon!.status).toBe('completed');
    expect(d.state.mission.objectives.m02_windcrest!.status).toBe('active');
    expect(events.filter((e) => e.kind === 'ObjectiveChanged' && e.objectiveId === 'm02_pantheon').map((e) => (e as { status: string }).status)).toEqual(['active', 'completed']);
    expect(objectiveDoneEarly(d.catalog, d.state, def)).toBe(false);
  });

  it('M03: either crossing reaches both relays; both relays open the ward gate; the patrol stays in its region', () => {
    const d = GameDriver.mission('three_beacons_m03');
    const scout = Object.values(d.state.heroes).find((h) => h.definitionId === 'scout_captain')!;
    // Spend the expedition wallet on Highwatch's available stock before marching.
    const toHero = { kind: 'hero' as const, heroId: 'alexios' };
    for (const [creatureId, quantity] of [['windcrest_griffin', 7], ['temple_adept', 3], ['cavalry', 4], ['veteran_hoplite', 14], ['veteran_peltast', 9]] as const) {
      d.do({ kind: 'RecruitUnits', townId: 'highwatch', creatureId, quantity, destination: toHero });
    }
    d.marchTo({ q: 12, r: 6 });
    expect(d.state.world.sites.m03_north_guard!.cleared).toBe(true);
    d.marchTo({ q: 16, r: 5 });
    d.do({ kind: 'ActivateSite', heroId: 'alexios', siteId: 'm03_relay_north' });
    expect(d.state.world.sites.m03_ward_gate!.open).toBe(false);
    d.marchTo({ q: 16, r: 14 });
    d.do({ kind: 'ActivateSite', heroId: 'alexios', siteId: 'm03_relay_south' });
    expect(d.state.world.sites.m03_ward_gate!.open).toBe(true);
    const s = d.state.heroes[scout.id]!;
    if (s.status === 'active') {
      expect(s.position.q).toBeGreaterThanOrEqual(13);
      expect(s.position.q).toBeLessThanOrEqual(20);
    }
    d.marchTo({ q: 26, r: 10 });
    expect(d.state.world.sites.m03_beacon!.cleared).toBe(true);
    expect(d.state.mission.flags.lens_recovered).toBe(true);
    d.do({ kind: 'ActivateSite', heroId: 'alexios', siteId: 'm03_beacon' });
    d.resolveLevelUps();
    expect(d.state.outcome.status).toBe('victory');
  });

  it('is deterministic across identical scripted runs', () => {
    const run = () => {
      const d = GameDriver.mission('three_beacons_m01');
      d.do({ kind: 'BuildStructure', townId: 'asterion', buildingId: 'barracks_up' });
      d.marchTo({ q: 10, r: 7 });
      return canonicalStateHash(d.state);
    };
    expect(run()).toBe(run());
  });
});
