/**
 * Campaign content v2 in the Journal, the introduction and the HUD (2026-10-15):
 * the view models read the saved timer days, list evidence only once found, mark
 * a patrol withdrawn when its home camp falls, carry entry bonuses and facts, and
 * pick event illustrations from the chapter's paintings. v1 missions get nothing.
 */
import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import { createMissionMatch } from '@pr/campaign';
import type { ContentCatalog, MatchState, MissionDefinition } from '@pr/rules';
import {
  carriedFromEarlier,
  daysLeftText,
  deadlineEntries,
  evidenceLedger,
  factInfo,
  humanizeFact,
  isV2Mission,
  knownThreats,
  missedBecause,
  missionIntro,
  objectiveStatusText,
  runningDeadlines,
  sceneIllustrationId,
} from '../src/app/missionLedger';

const M1 = 'three_beacons_v2_m01';
const M2 = 'three_beacons_v2_m02';
const catalog: ContentCatalog = GameDriver.mission('three_beacons_m01').catalog;

function start(missionId: string, facts: string[] = []): MatchState {
  return createMissionMatch(catalog, missionId, { matchId: `ledger:${missionId}`, carryover: null, startingGodId: 'zeus', facts }).match;
}
const mission = (id: string): MissionDefinition => catalog.missions[id]!;

describe('content version', () => {
  it('only v2 chapters are v2', () => {
    expect(isV2Mission(mission(M2))).toBe(true);
    expect(isV2Mission(mission('three_beacons_m03'))).toBe(false);
    expect(isV2Mission(undefined)).toBe(false);
  });

  it('a failed optional objective reads as missed, a failed required one as failed', () => {
    expect(objectiveStatusText({ category: 'optional' }, 'failed')).toBe('Missed');
    expect(objectiveStatusText({ category: 'primary' }, 'failed')).toBe('Failed');
    expect(objectiveStatusText({ category: 'optional' }, 'completed')).toBe('Completed');
  });
});

describe('deadlines', () => {
  it('a running timer shows its saved deadline, start day, days left and consequence', () => {
    const s = start(M2);
    const t = s.mission.timers!['tb2_fort']!;
    expect(t.status).toBe('running');
    const [d] = deadlineEntries(catalog, s);
    expect(d).toMatchObject({ id: 'tb2_fort', status: 'running', startedDay: t.startedDay, deadlineDay: t.deadlineDay, daysLeft: t.deadlineDay! - s.day });
    expect(d!.text).toBe(`Deadline: day ${t.deadlineDay} (started day ${t.startedDay}) · ${daysLeftText(t.deadlineDay! - s.day)}`);
    expect(d!.consequence).toMatch(/bonus for striking early/);
    // The saved days are the source of truth: a later day shortens the time left, never moves the deadline.
    const later = structuredClone(s);
    later.day = t.deadlineDay! - 1;
    expect(deadlineEntries(catalog, later)[0]!.text).toBe(`Deadline: day ${t.deadlineDay} (started day ${t.startedDay}) · 1 day left`);
    later.day = t.deadlineDay!;
    expect(deadlineEntries(catalog, later)[0]!.text).toMatch(/· last day$/);
    expect(runningDeadlines(catalog, later).map((x) => x.id)).toEqual(['tb2_fort']);
  });

  it('before it starts an announced timer shows only its announcement; an unannounced one is not listed', () => {
    const s = start(M2);
    s.mission.timers!['tb2_fort'] = { status: 'waiting' };
    const [d] = deadlineEntries(catalog, s);
    expect(d).toMatchObject({ status: 'announced', text: 'Melas is entrenching on the plateau.', deadlineDay: null, daysLeft: null });
    expect(runningDeadlines(catalog, s)).toEqual([]);
    const quiet: ContentCatalog = { ...catalog, missions: { ...catalog.missions, [M2]: { ...mission(M2), timers: mission(M2).timers!.map((x) => ({ ...x, announce: undefined })) } } };
    expect(deadlineEntries(quiet, s)).toEqual([]);
  });

  it('met and expired timers keep their day; an expired one names the missed optional objective', () => {
    const s = start(M2);
    s.mission.timers!['tb2_fort'] = { ...s.mission.timers!['tb2_fort']!, status: 'met', resolvedDay: 4 };
    expect(deadlineEntries(catalog, s)[0]).toMatchObject({ status: 'met', text: 'Met on day 4' });
    expect(missedBecause(catalog, s, 'tb2_strike')).toBeNull();
    s.mission.timers!['tb2_fort'] = { ...s.mission.timers!['tb2_fort']!, status: 'expired', resolvedDay: 10 };
    expect(deadlineEntries(catalog, s)[0]).toMatchObject({ status: 'expired', text: 'Expired on day 10' });
    expect(missedBecause(catalog, s, 'tb2_strike')).toEqual({ label: mission(M2).timers![0]!.label, day: 10 });
  });

  it('the rules fail the early-strike opportunity when the clock runs out (optional only)', () => {
    const d = new GameDriver(start(M2), catalog);
    const deadline = d.state.mission.timers!['tb2_fort']!.deadlineDay!;
    for (let i = 0; i < 20 && d.state.day <= deadline; i++) d.endDay();
    expect(d.state.mission.timers!['tb2_fort']!.status).toBe('expired');
    expect(d.state.mission.objectives['tb2_strike']!.status).toBe('failed');
    expect(objectiveStatusText(mission(M2).objectives.find((o) => o.id === 'tb2_strike')!, 'failed')).toBe('Missed');
    expect(missedBecause(catalog, d.state, 'tb2_strike')?.label).toBe(mission(M2).timers![0]!.label);
    expect(d.state.outcome.status).toBe('running');
  });

  it('days left reads naturally', () => {
    expect([daysLeftText(5), daysLeftText(1), daysLeftText(0)]).toEqual(['5 days left', '1 day left', 'last day']);
  });
});

describe('evidence & decisions', () => {
  it('lists only entries whose flag is set, in the chapter’s order', () => {
    const s = start(M2);
    expect(evidenceLedger(mission(M2), s.mission.flags)).toEqual([]);
    s.mission.flags['tb_network_local'] = true;
    s.mission.flags['tb2_lens'] = true;
    expect(evidenceLedger(mission(M2), s.mission.flags).map((e) => e.id)).toEqual(['tb2_ev_lens', 'tb2_ev_local']);
  });
});

describe('known threats', () => {
  it('names each patrol with its purpose; waiting, active, withdrawn when its camp falls, defeated', () => {
    const s = start(M2);
    const [t] = knownThreats(catalog, s, mission(M2));
    expect(t).toMatchObject({ name: 'Scout Captain', status: 'waiting', homeSiteId: 'tb2_scout_camp', homeFallen: false });
    expect(t!.purpose).toMatch(/Waits at his camp/);
    expect(t!.homeName).toBe(mission(M2).sites.find((x) => x.id === 'tb2_scout_camp')!.name);
    s.mission.flags['tb2_relay_lit'] = true;
    expect(knownThreats(catalog, s, mission(M2))[0]!.status).toBe('active');
    s.world.sites['tb2_scout_camp']!.cleared = true;
    expect(knownThreats(catalog, s, mission(M2))[0]).toMatchObject({ status: 'withdrawn', homeFallen: true });
    s.heroes[t!.id]!.status = 'defeated';
    expect(knownThreats(catalog, s, mission(M2))[0]!.status).toBe('defeated');
  });

  it('the rules withdraw the patrol when its home camp is taken', () => {
    const d = new GameDriver(start(M1), catalog);
    const [t] = knownThreats(catalog, d.state, mission(M1));
    expect(t).toMatchObject({ name: 'Raider Chief', status: 'active' });
    d.state.world.sites['tb1_raider_camp']!.cleared = true;
    d.endDay();
    expect(d.state.heroes[t!.id]!.status).toBe('retreated');
    expect(knownThreats(catalog, d.state, mission(M1))[0]).toMatchObject({ status: 'withdrawn', homeFallen: true });
  });
});

describe('carried from earlier chapters', () => {
  it('lists the entry bonus whose fact is set and the facts with their evidence titles', () => {
    const s = start(M2, ['tb1_hamlet_first']);
    const c = carriedFromEarlier(catalog, mission(M2), s.mission.flags);
    expect(c.bonuses).toEqual([{ fact: 'tb1_hamlet_first', label: mission(M2).entryBonuses![0]!.label }]);
    expect(c.facts).toEqual([{ flag: 'tb1_hamlet_first', title: 'The hamlet first', text: expect.stringMatching(/garrison/), icon: 'supply' }]);
    const none = carriedFromEarlier(catalog, mission(M2), start(M2, ['tb1_causeway_first']).mission.flags);
    expect(none.bonuses).toEqual([]);
    expect(none.facts.map((f) => f.title)).toEqual(['The causeway first']);
  });

  it('a fact without an evidence definition still reads as words', () => {
    expect(humanizeFact('so3_records')).toBe('Records');
    expect(humanizeFact('tb_network_local')).toBe('Network local');
    expect(factInfo(catalog, 'zz_unknown_fact', 'three_beacons')).toEqual({ flag: 'zz_unknown_fact', title: 'Unknown fact', text: null, icon: null });
  });
});

describe('mission introduction', () => {
  it('a v2 chapter: order-aware lines, cover, required tasks, loss conditions, deadline, bonus, manual battles', () => {
    const withFact = missionIntro(catalog, start(M2, ['tb1_hamlet_first']), mission(M2));
    const hamlet = /The hamlet kept its word/;
    expect(withFact.lines.some((l) => hamlet.test(l.text))).toBe(true);
    expect(withFact.lines.length).toBe(mission(M2).briefing.length + 1);
    expect(withFact).toMatchObject({ v2: true, coverAssetId: 'mission.three_beacons.m03.briefing', manualBattles: true, lossConditions: mission(M2).lossConditions });
    expect(withFact.entryBonuses).toEqual([mission(M2).entryBonuses![0]!.label]);
    expect(withFact.deadlines.map((d) => d.status)).toEqual(['running']);
    // Locked steps stay hidden; how many open later is counted.
    expect(withFact.requiredTasks.map((t) => t.id)).toEqual(['tb2_lens', 'tb2_relay']);
    expect(withFact.laterTasks).toBe(2);
    const without = missionIntro(catalog, start(M2, ['tb1_causeway_first']), mission(M2));
    expect(without.lines.some((l) => hamlet.test(l.text))).toBe(false);
    expect(without.entryBonuses).toEqual([]);
  });

  it('a v1 mission keeps its own briefing and nothing else', () => {
    const v1 = 'three_beacons_m03';
    const intro = missionIntro(catalog, GameDriver.mission(v1).state, mission(v1));
    expect(intro.lines).toEqual(mission(v1).briefing);
    expect(intro).toMatchObject({ v2: false, coverAssetId: null, requiredTasks: [], lossConditions: [], deadlines: [], entryBonuses: [], manualBattles: false });
  });
});

describe('event illustrations', () => {
  it('a chapter carrying two legacy chapters shows the second painting after the first required objective', () => {
    const s = start(M1);
    expect(mission(M1).briefingArt).toHaveLength(2);
    expect(sceneIllustrationId(mission(M1), s)).toBeNull();
    s.mission.objectives['tb1_watch']!.status = 'completed';
    expect(sceneIllustrationId(mission(M1), s)).toBe(mission(M1).briefingArt![1]);
  });

  it('one painting or a v1 mission: no illustration', () => {
    const s = start(M2);
    for (const o of Object.values(s.mission.objectives)) o.status = 'completed';
    expect(sceneIllustrationId(mission(M2), s)).toBeNull();
    const v1 = GameDriver.mission('three_beacons_m01').state;
    expect(sceneIllustrationId(mission('three_beacons_m01'), v1)).toBeNull();
    expect(sceneIllustrationId(undefined, v1)).toBeNull();
  });

  it('more paintings are spread over the required objectives', () => {
    const s = start(M1);
    const three = { ...mission(M1), briefingArt: ['a', 'b', 'c'] };
    const ids = ['tb1_watch', 'tb1_lighthouse_clear', 'tb1_lighthouse', 'tb1_nest', 'tb1_beacon'];
    const seen = ids.map((id) => {
      s.mission.objectives[id]!.status = 'completed';
      return sceneIllustrationId(three, s);
    });
    expect(seen).toEqual(['b', 'b', 'c', 'c', 'c']);
  });
});
