/**
 * City dedications (app 1.5.0): where the scenario feature `cityDedicationsV1` is on.
 * New skirmishes, random and authored/editor maps and new campaign starts play with it;
 * The Three Beacons (its v1 missions and v2 chapters) turns it off EXPLICITLY. Every
 * authored mission states the flag (never inferred, e.g. from `signatureMechanics`).
 */
import { describe, expect, it } from 'vitest';
import { buildCatalog } from '@pr/content';
import { compileSkirmishMap, createMissionMatch, startCampaign } from '../src';

const catalog = buildCatalog();

describe('the city dedication flag in new games', () => {
  it('every authored mission states it: off for The Three Beacons (v1 and v2), on for every other campaign and skirmish', () => {
    const missions = Object.values(catalog.missions);
    expect(missions.length).toBeGreaterThan(50);
    for (const m of missions) {
      const expected = m.campaignId !== 'three_beacons';
      expect(m.features?.cityDedicationsV1, m.id).toBe(expected);
    }
    const tb = missions.filter((m) => m.campaignId === 'three_beacons').map((m) => m.id);
    expect(tb).toEqual(expect.arrayContaining(['three_beacons_m01', 'three_beacons_m02', 'three_beacons_m03']));
    expect(tb.some((id) => id.includes('_v2_'))).toBe(true);
    // The tutorial keeps the old rule profile otherwise (no expanded content), as before.
    for (const id of tb) expect(catalog.missions[id]!.features?.expandedContent ?? false, id).toBe(false);
  });

  it('matches created from missions and new campaign runs carry the flag', () => {
    const flag = (missionId: string) => createMissionMatch(catalog, missionId, { matchId: `flag:${missionId}`, startingGodId: null }).match.scenario.features?.cityDedicationsV1;
    expect(flag('three_beacons_m01')).toBe(false);
    expect(flag('skirmish_twin_harbors')).toBe(true);
    expect(flag('winter_oath_m01')).toBe(true);
    expect(flag('silent_oracle_m01')).toBe(true);
    for (const campaignId of Object.keys(catalog.campaigns)) {
      const c = catalog.campaigns[campaignId]!;
      if (!c.missionIds?.length && !c.chapters?.length) continue;
      const { start } = startCampaign(catalog, campaignId, { runId: `flag-${campaignId}`, startingGodId: null });
      expect(start.match.scenario.features?.cityDedicationsV1, campaignId).toBe(campaignId !== 'three_beacons');
    }
  });

  it('authored skirmish maps compile with the flag on', () => {
    for (const def of Object.values(catalog.skirmishMaps ?? {})) {
      const seats = def.map.players.map((p) => ({ pantheonId: p.pantheonId, controller: 'ai' as const }));
      expect(compileSkirmishMap(catalog, def.id, seats).mission.features?.cityDedicationsV1, def.id).toBe(true);
    }
  });
});
