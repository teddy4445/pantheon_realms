/**
 * The Three Beacons, content v2 (handoff 2026-10-15): two chapters carrying the
 * three legacy chapters; the hamlet choice of chapter 1 gives chapter 2's town a
 * bounded garrison; the network choice of chapter 2 picks the epilogue variant.
 */
import { describe, expect, it } from 'vitest';
import { createMissionMatch } from '@pr/campaign';
import { campaignEpilogueV2Lines, missionBriefingLines } from '@pr/rules';
import { buildThreeBeaconsV2 } from '../../src/campaign/v2/threeBeaconsV2';
import { catalogWith } from './harness';
import { checkV2Missions } from './checks';

const { catalog, built, issues } = catalogWith('three_beacons', 'greek', buildThreeBeaconsV2);

describe('The Three Beacons v2', () => {
  it('validates, and maps legacy m01+m02 → chapter 1, m03 → chapter 2', () => {
    expect(issues).toEqual([]);
    expect(built.chapters.map((c) => c.legacyMissionIds)).toEqual([['three_beacons_m01', 'three_beacons_m02'], ['three_beacons_m03']]);
    checkV2Missions(catalog, built.missions);
  });

  it('the hamlet choice gives chapter 2 a garrison; the briefing says so only then', () => {
    const plain = createMissionMatch(catalog, 'three_beacons_v2_m02', { matchId: 't-plain', facts: [] }).match;
    const hamlet = createMissionMatch(catalog, 'three_beacons_v2_m02', { matchId: 't-hamlet', facts: ['tb1_hamlet_first'] }).match;
    const hoplites = (s: typeof plain) => s.towns['highwatch']!.garrison.slots.reduce((n, x) => n + (x?.creatureId === 'hoplite' ? x.count : 0), 0);
    expect(hoplites(hamlet) - hoplites(plain)).toBe(6);
    const m2 = catalog.missions['three_beacons_v2_m02']!;
    expect(missionBriefingLines(m2, plain.mission.flags).length).toBe(m2.briefing.length);
    expect(missionBriefingLines(m2, hamlet.mission.flags).some((l) => /hamlet/.test(l.text))).toBe(true);
  });

  it('the epilogue follows the network choice', () => {
    const camp = catalog.campaigns['three_beacons']!;
    expect(campaignEpilogueV2Lines(camp, { tb_network_local: true }).some((l) => /village/.test(l.text))).toBe(true);
    expect(campaignEpilogueV2Lines(camp, { tb_network_military: true }).some((l) => /Highwatch answers/.test(l.text))).toBe(true);
  });
});
