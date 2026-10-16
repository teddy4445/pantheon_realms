/**
 * The Silent Oracle, content v2 (handoff 2026-10-15; review cards 3–8): six
 * chapters carrying the seven legacy chapters, played 1 → {2, 3} → {4, 5} → 6.
 * The parallel pairs read each other's facts so that neither order names an
 * investigation that has not happened; earlier choices give bounded entry
 * bonuses; the final choice picks the epilogue variant.
 */
import { describe, expect, it } from 'vitest';
import { createMissionMatch } from '@pr/campaign';
import { campaignEpilogueV2Lines, missionBriefingLines, processCommand, type GameCommand, type MatchState, type MissionDefinition } from '@pr/rules';
import { buildSilentOracleV2 } from '../../src/campaign/v2/silentOracleV2';
import { catalogWith } from './harness';
import { checkV2Missions } from './checks';
import missionContent from '../../../../docs/campaign-v2/design/mission-content.json';
import campaignGraph from '../../../../docs/campaign-v2/design/campaign-graph.json';

const { catalog, built, issues } = catalogWith('silent_oracle', 'greek', buildSilentOracleV2);
const mission = (n: number) => catalog.missions[`silent_oracle_v2_m0${n}`]!;
const start = (n: number, facts: string[] = []) => createMissionMatch(catalog, `silent_oracle_v2_m0${n}`, { matchId: `so-${n}-${facts.join('+') || 'plain'}`, facts }).match;
const text = (lines: readonly { text: string }[]) => lines.map((l) => l.text).join(' ');

interface Card {
  readonly n: number;
  readonly campaign: string;
  readonly proposedMissionId: string;
  readonly requiresAll: readonly string[];
  readonly legacyMissionIds: readonly string[];
  readonly briefingArt: readonly string[];
}
const cards = (missionContent as readonly Card[]).filter((c) => c.campaign === 'silent_oracle');
const graph = (campaignGraph as readonly { campaignId: string; nodes: { id: string; requiresAll: string[] }[] }[]).find((g) => g.campaignId === 'silent_oracle')!;

/** Chapters that can be completed before `id`: its ancestors and the other chapter of its parallel pair. */
function possiblyEarlier(id: string): Set<string> {
  const byId = new Map(built.chapters.map((c) => [c.missionId, c]));
  const ancestors = new Set<string>();
  const walk = (m: string) => {
    for (const r of byId.get(m)?.requiresAll ?? []) if (!ancestors.has(r)) (ancestors.add(r), walk(r));
  };
  walk(id);
  const own = byId.get(id)!;
  const siblings = built.chapters.filter((c) => c.missionId !== id && c.requiresAll.join() === own.requiresAll.join()).map((c) => c.missionId);
  return new Set([...ancestors, ...siblings]);
}

/** Every `fact:<flag>` a mission reads (dialogue conditions, choice requirements) and every entry-bonus fact. */
function factsRead(m: MissionDefinition): string[] {
  const out: string[] = [];
  const add = (flags: readonly string[] | undefined) => flags?.forEach((f) => f.startsWith('fact:') && out.push(f.slice(5)));
  for (const v of m.briefingVariants ?? []) (add(v.ifFlags), add(v.unlessFlags));
  for (const s of m.storyScenes ?? []) (add(s.ifFlags), add(s.unlessFlags));
  for (const s of m.sites) if (s.kind.type === 'map_event') for (const o of s.kind.options) add(o.requiresFlags);
  for (const b of m.entryBonuses ?? []) out.push(b.fact);
  return out;
}

/** Flags something in the mission can set (guards, pickups, activations, choices, objectives, sluices, timers, entry bonuses). */
function settableFlags(m: MissionDefinition): Set<string> {
  const out = new Set<string>();
  const add = (flags: readonly string[] | undefined) => flags?.forEach((f) => out.add(f));
  for (const s of m.sites) {
    add(s.guard?.reward.flags);
    if (s.kind.type === 'pickup' || s.kind.type === 'activation') add(s.kind.reward.flags);
    if (s.kind.type === 'map_event') for (const o of s.kind.options) add(o.reward.flags);
    if (s.kind.type === 'sluice') out.add(s.kind.openFlag);
  }
  for (const o of m.objectives) add(o.reward?.flags);
  for (const t of m.timers ?? []) add(t.onExpire.flags);
  for (const b of m.entryBonuses ?? []) add(b.flags);
  return out;
}

describe('The Silent Oracle v2', () => {
  it('validates, follows the chapter graph and carries every legacy chapter exactly once (as the cards say)', () => {
    expect(issues.filter((i) => i.includes('silent_oracle'))).toEqual([]);
    expect(built.missions.map((m) => m.id)).toEqual(cards.map((c) => c.proposedMissionId));
    for (const card of cards) {
      const ch = built.chapters.find((c) => c.missionId === card.proposedMissionId)!;
      expect(ch.legacyMissionIds, card.proposedMissionId).toEqual(card.legacyMissionIds);
      expect(ch.requiresAll, card.proposedMissionId).toEqual(card.requiresAll);
      expect(ch.requiresAll, card.proposedMissionId).toEqual(graph.nodes.find((n) => n.id === card.proposedMissionId)!.requiresAll);
      expect(ch.briefingArt, card.proposedMissionId).toEqual(card.briefingArt.map((a) => a.replace(/^art\/missions\//, '').replace(/\.webp$/, '')));
    }
    const legacy = built.chapters.flatMap((c) => c.legacyMissionIds);
    expect([...legacy].sort()).toEqual(['silent_oracle_m01', 'silent_oracle_m02', 'silent_oracle_m03', 'silent_oracle_m04', 'silent_oracle_m05', 'silent_oracle_m06', 'silent_oracle_m07']);
    expect(new Set(legacy).size).toBe(7);
    expect(catalog.campaigns['silent_oracle']!.finalChapterId).toBe('silent_oracle_v2_m06');
    checkV2Missions(catalog, built.missions);
  });

  it('every chapter has a shortcut opened through play, finite signalled pressure and deadlines that cost only optional objectives', () => {
    for (const m of built.missions) {
      const flags = settableFlags(m);
      const gates = m.sites.filter((s) => s.kind.type === 'gate');
      expect(gates.length, `${m.id}: a shortcut`).toBeGreaterThan(0);
      for (const g of gates) for (const f of g.kind.type === 'gate' ? g.kind.openWhenFlags : []) expect(flags.has(f), `${m.id}/${g.id}: nothing sets ${f}`).toBe(true);
      for (const h of m.hostileHeroes) {
        // The bronze bull is the chapter's quarry (its defeat is the objective), not a pressure wave.
        if (h.commander.heroDefinitionId === 'greek_bronze_bull') continue;
        expect(h.homeSiteId || h.dormantUntilFlag, `${m.id}: ${h.commander.name} needs a home camp or an announced trigger`).toBeTruthy();
        if (h.dormantUntilFlag) expect(flags.has(h.dormantUntilFlag), `${m.id}: nothing wakes ${h.commander.name}`).toBe(true);
      }
      for (const t of m.timers ?? []) for (const id of t.onExpire.failObjectives ?? []) expect(m.objectives.find((o) => o.id === id)?.category).toBe('optional');
      expect(m.objectives.some((o) => o.completesMission) || m.sites.some((s) => s.kind.type === 'activation' && s.kind.completesMission), `${m.id}: ends through an objective or activation`).toBe(true);
      // Choice and evidence flags are recorded in the ledger and carried as campaign facts.
      for (const f of m.carriedFlags ?? []) expect(flags.has(f), `${m.id}: carries ${f}, which nothing sets`).toBe(true);
    }
  });

  it('chapters read only facts that an earlier (or parallel) chapter can carry', () => {
    for (const m of built.missions) {
      const earlier = possiblyEarlier(m.id);
      const carriable = new Set(built.missions.filter((x) => earlier.has(x.id)).flatMap((x) => x.carriedFlags ?? []));
      for (const f of factsRead(m)) expect(carriable.has(f), `${m.id} reads fact ${f}`).toBe(true);
    }
    // The opening chapter reads none.
    expect(factsRead(mission(1))).toEqual([]);
  });

  it('the countryside and the archive are coherent in both orders (cards 4 and 5)', () => {
    const m2 = mission(2);
    const m3 = mission(3);
    // Chapter 3 carries its records as a fact.
    expect(m3.carriedFlags).toContain('so3_records');
    // Chapter 2 first: nobody mentions the Hall of Echoes; chapter 3 first: Ione brings its records to the keeper.
    const plain2 = start(2);
    const after3 = start(2, ['so3_records']);
    expect(text(missionBriefingLines(m2, plain2.mission.flags))).not.toMatch(/Hall of Echoes|records/);
    expect(text(missionBriefingLines(m2, after3.mission.flags))).toMatch(/Hall of Echoes records/);
    const keeperScenes = (m2.storyScenes ?? []).filter((s) => s.trigger.type === 'site_visited' && s.trigger.siteId === 'so2_keeper');
    expect(keeperScenes.map((s) => [s.ifFlags ?? [], s.unlessFlags ?? []])).toEqual([[['fact:so3_records'], []], [[], ['fact:so3_records']]]);
    for (const s of keeperScenes) if (!s.ifFlags) expect(text(s.lines)).not.toMatch(/Hall of Echoes|archive/);
    // One negotiation discount, only with the archive's evidence in hand.
    const keeper = m2.sites.find((s) => s.id === 'so2_keeper')!;
    if (keeper.kind.type !== 'map_event') throw new Error('keeper');
    const [full, discount] = keeper.kind.options;
    expect(full!.requiresFlags ?? []).toEqual([]);
    expect(discount!.requiresFlags).toEqual(['fact:so3_records']);
    expect((discount!.cost?.gold ?? 0) < (full!.cost?.gold ?? 0)).toBe(true);
    expect(discount!.clearsSiteIds).toEqual(full!.clearsSiteIds);
    const offered = (state: MatchState) => keeper.kind.type === 'map_event' && keeper.kind.options.filter((o) => (o.requiresFlags ?? []).every((f) => state.mission.flags[f])).length;
    expect(offered(plain2)).toBe(1);
    expect(offered(after3)).toBe(2);
    // No combat snowball: the archive's facts give chapter 2 no troops or resources.
    expect((m2.entryBonuses ?? []).filter((b) => b.fact.startsWith('so3_'))).toEqual([]);
    // Chapter 3 first: no bull, smith or eyrie in the briefing; after chapter 2 the accounts are linked.
    const plain3 = start(3);
    const after2 = start(3, ['so2_bull_down', 'so2_aerie_won']);
    expect(text(missionBriefingLines(m3, plain3.mission.flags))).not.toMatch(/bronze-smith|keeper|bull/);
    expect(text(missionBriefingLines(m3, after2.mission.flags))).toMatch(/bronze-smith of Thymbra/);
    const ledger = (m3.storyScenes ?? []).filter((s) => s.trigger.type === 'site_cleared' && s.trigger.siteId === 'so3_scriptorium');
    expect(ledger.map((s) => [s.ifFlags ?? [], s.unlessFlags ?? []])).toEqual([[['fact:so2_bull_down'], []], [[], ['fact:so2_bull_down']]]);
  });

  it('Pyrgos and Kerata are coherent in both orders (cards 6 and 7)', () => {
    const m4 = mission(4);
    const m5 = mission(5);
    // Pyrgos first: no word of Kerata or Doros; Kerata first: Melas's men have heard of the freed minotaurs.
    expect(text(missionBriefingLines(m4, start(4).mission.flags))).not.toMatch(/Kerata|minotaur|Doros/);
    expect(text(missionBriefingLines(m4, start(4, ['so5_freed']).mission.flags))).toMatch(/freed minotaurs of Kerata/);
    // Kerata first: no word of Pyrgos or Melas; Pyrgos first: its outcome sends the names of Doros's recruits.
    const plain5 = text(missionBriefingLines(m5, start(5).mission.flags));
    expect(plain5).not.toMatch(/Pyrgos|Melas|council/);
    expect(text(missionBriefingLines(m5, start(5, ['so4_surrender']).mission.flags))).toMatch(/Melas sent word/);
    expect(text(missionBriefingLines(m5, start(5, ['so4_council']).mission.flags))).toMatch(/new council/);
    expect(m4.carriedFlags).toEqual(expect.arrayContaining(['so4_surrender', 'so4_council']));
    expect(m5.carriedFlags).toEqual(expect.arrayContaining(['so5_freed', 'so5_escorted', 'so5_armed', 'so5_testimony']));
  });

  it('earlier choices give bounded entry bonuses', () => {
    const gold = (s: MatchState) => s.players[mission(4).player.playerId]!.wallet.gold;
    const heroCount = (s: MatchState, creatureId: string) => s.heroes['alexios']!.army.slots.reduce((n, x) => n + (x?.creatureId === creatureId ? x.count : 0), 0);
    const garrison = (s: MatchState, townId: string, creatureId: string) => s.towns[townId]!.garrison.slots.reduce((n, x) => n + (x?.creatureId === creatureId ? x.count : 0), 0);
    // Chapter 4 (Pyrgos): the reconstruction choice of chapter 2 and the archive of chapter 3.
    const plain4 = start(4);
    expect(gold(start(4, ['so2_fields'])) - gold(plain4)).toBe(2500);
    expect(heroCount(start(4, ['so2_trade']), 'windcrest_griffin') - heroCount(plain4, 'windcrest_griffin')).toBe(4);
    expect(plain4.mission.flags['so4_forgeries']).toBeFalsy();
    expect(start(4, ['so3_records']).mission.flags['so4_forgeries']).toBe(true);
    expect(garrison(start(4, ['so3_expose']), 'akte', 'veteran_peltast') - garrison(plain4, 'akte', 'veteran_peltast')).toBe(8);
    // Chapter 6 (Kalliste): the shelter of chapter 1, the archive, Melas's outcome and the first freed group.
    const plain6 = start(6);
    const wallet6 = (s: MatchState) => s.players[mission(6).player.playerId]!.wallet;
    expect(garrison(start(6, ['so1_sheltered']), 'kalliste', 'veteran_hoplite') - garrison(plain6, 'kalliste', 'veteran_hoplite')).toBe(12);
    expect(wallet6(start(6, ['so3_preserve'])).crystal - wallet6(plain6).crystal).toBe(4);
    expect(garrison(start(6, ['so4_surrender']), 'kalliste', 'cavalry') - garrison(plain6, 'kalliste', 'cavalry')).toBe(3);
    expect(wallet6(start(6, ['so4_council'])).gold - wallet6(plain6).gold).toBe(2000);
    expect(heroCount(start(6, ['so5_armed']), 'minotaur') - heroCount(plain6, 'minotaur')).toBe(2);
    // Bonuses are bounded: no chapter grants more than a handful, and none grants a hero.
    for (const m of built.missions) expect((m.entryBonuses ?? []).length).toBeLessThanOrEqual(6);
  });

  it('the announced archive seizure moves one record to the fort; the chapter can still be won', () => {
    const m3 = mission(3);
    const seizure = m3.timers!.find((t) => t.id === 'so3_seizure')!;
    let s = start(3);
    const command = (state: MatchState, actor: string): GameCommand => ({ kind: 'EndTurn', commandId: `so3-end-${state.revision}`, expectedRevision: state.revision, actorPlayerId: actor }) as GameCommand;
    for (let i = 0; i < 80 && s.day <= seizure.days + 1; i++) {
      const r = processCommand({ catalog }, s, command(s, s.activePlayerId));
      if (!r.ok) throw new Error(r.rejection.message);
      s = r.state;
    }
    expect(s.mission.flags['so3_seal_moved']).toBe(true);
    expect(s.mission.objectives['so3_seal_early']!.status).toBe('failed');
    expect(s.mission.objectives['so3_seal_fort']!.status).toBe('active');
    for (const o of m3.objectives.filter((x) => x.category === 'primary')) expect(s.mission.objectives[o.id]!.status).not.toBe('failed');
    expect(s.outcome.status).toBe('running');
  });

  it('the epilogue follows the final choice over the campaign cover', () => {
    const camp = catalog.campaigns['silent_oracle']!;
    expect(camp.epilogueV2?.art).toBe('campaign.silent_oracle.cover');
    expect(text(campaignEpilogueV2Lines(camp, { so_oracle_adviser: true }))).toMatch(/whoever climbs the road/);
    expect(text(campaignEpilogueV2Lines(camp, { so_spring_council: true }))).toMatch(/keep the spring together/);
    expect(text(campaignEpilogueV2Lines(camp, { so_spring_council: true }))).not.toMatch(/whoever climbs the road/);
    // The final chapter's choice sets exactly these flags and completes the campaign.
    const spring = mission(6).sites.find((s) => s.id === 'so6_spring')!;
    if (spring.kind.type !== 'map_event') throw new Error('spring');
    expect(spring.kind.options.flatMap((o) => o.reward.flags ?? [])).toEqual(['so_oracle_adviser', 'so_spring_council']);
    expect(mission(6).objectives.find((o) => o.id === 'so6_choice')?.completesMission).toBe(true);
  });
});
