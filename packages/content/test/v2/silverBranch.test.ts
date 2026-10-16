/**
 * The Silver Branch, content v2 (handoff 2026-10-15; review cards 27–32): six
 * chapters carrying the seven legacy chapters, played 1 → 2 → {3, 4} → 5 → 6.
 * Chapters 3 and 4 read each other's facts: played after the High Seat, the
 * charters test the settlement already made; played before, they inform the
 * succession. Earlier choices give bounded entry bonuses; the final choice picks
 * the epilogue variant.
 */
import { describe, expect, it } from 'vitest';
import { createMissionMatch } from '@pr/campaign';
import { campaignEpilogueV2Lines, hexKey, missionBriefingLines, processCommand, type GameCommand, type MatchState, type MissionDefinition } from '@pr/rules';
import { buildSilverBranchV2 } from '../../src/campaign/v2/silverBranchV2';
import { independentApproaches, mapGraph } from '../../src/campaign/v2/regionMap';
import { catalogWith } from './harness';
import { blockers, checkV2Missions, gateOf, reachWithFerries, withSluices } from './checks';
import missionContent from '../../../../docs/campaign-v2/design/mission-content.json';
import campaignGraph from '../../../../docs/campaign-v2/design/campaign-graph.json';

const { catalog, built, issues } = catalogWith('silver_branch', 'celtic', buildSilverBranchV2);
const mission = (n: number) => catalog.missions[`silver_branch_v2_m0${n}`]!;
const start = (n: number, facts: string[] = []) => createMissionMatch(catalog, `silver_branch_v2_m0${n}`, { matchId: `sb-${n}-${facts.join('+') || 'plain'}`, facts }).match;
const text = (lines: readonly { text: string }[]) => lines.map((l) => l.text).join(' ');
const site = (n: number, id: string) => mission(n).sites.find((s) => s.id === id)!;

interface Card {
  readonly n: number;
  readonly campaign: string;
  readonly proposedMissionId: string;
  readonly requiresAll: readonly string[];
  readonly legacyMissionIds: readonly string[];
  readonly briefingArt: readonly string[];
}
const cards = (missionContent as readonly Card[]).filter((c) => c.campaign === 'silver_branch');
const graph = (campaignGraph as readonly { campaignId: string; nodes: { id: string; requiresAll: string[] }[] }[]).find((g) => g.campaignId === 'silver_branch')!;

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

const endTurns = (s0: MatchState, untilDay: number, tag: string): MatchState => {
  let s = s0;
  for (let i = 0; i < 80 && s.day <= untilDay; i++) {
    const r = processCommand({ catalog }, s, { kind: 'EndTurn', commandId: `${tag}-${s.revision}`, expectedRevision: s.revision, actorPlayerId: s.activePlayerId } as GameCommand);
    if (!r.ok) throw new Error(r.rejection.message);
    s = r.state;
  }
  return s;
};
const wallet = (n: number, s: MatchState) => s.players[mission(n).player.playerId]!.wallet;
const heroCount = (s: MatchState, creatureId: string) => s.heroes['orla']!.army.slots.reduce((k, x) => k + (x?.creatureId === creatureId ? x.count : 0), 0);
const garrison = (s: MatchState, townId: string, creatureId: string) => s.towns[townId]!.garrison.slots.reduce((k, x) => k + (x?.creatureId === creatureId ? x.count : 0), 0);

describe('The Silver Branch v2', () => {
  it('validates, follows the chapter graph and carries every legacy chapter exactly once (as the cards say)', () => {
    expect(issues.filter((i) => i.includes('silver_branch'))).toEqual([]);
    expect(built.missions.map((m) => m.id)).toEqual(cards.map((c) => c.proposedMissionId));
    expect(cards.map((c) => c.n)).toEqual([27, 28, 29, 30, 31, 32]);
    for (const card of cards) {
      const ch = built.chapters.find((c) => c.missionId === card.proposedMissionId)!;
      expect(ch.legacyMissionIds, card.proposedMissionId).toEqual(card.legacyMissionIds);
      expect(ch.requiresAll, card.proposedMissionId).toEqual(card.requiresAll);
      expect(ch.requiresAll, card.proposedMissionId).toEqual(graph.nodes.find((n) => n.id === card.proposedMissionId)!.requiresAll);
      expect(ch.briefingArt, card.proposedMissionId).toEqual(card.briefingArt.map((a) => a.replace(/^art\/missions\//, '').replace(/\.webp$/, '')));
    }
    const legacy = built.chapters.flatMap((c) => c.legacyMissionIds);
    expect([...legacy].sort()).toEqual(['silver_branch_m01', 'silver_branch_m02', 'silver_branch_m03', 'silver_branch_m04', 'silver_branch_m05', 'silver_branch_m06', 'silver_branch_m07']);
    expect(new Set(legacy).size).toBe(7);
    // Chapter 2 carries two legacy chapters (the boar and the water-horse bargain); the rest one each.
    expect(built.chapters.find((c) => c.chapter === 2)!.legacyMissionIds).toEqual(['silver_branch_m02', 'silver_branch_m03']);
    expect(catalog.campaigns['silver_branch']!.finalChapterId).toBe('silver_branch_v2_m06');
    checkV2Missions(catalog, built.missions);
  });

  it('keeps the legacy economies, cast and Celtic war-bands (no new heroes, auto battles or typed guard counts)', () => {
    const economy = ['silver_branch_m01', 'silver_branch_m02', 'silver_branch_m04', 'silver_branch_m05', 'silver_branch_m06', 'silver_branch_m07'];
    built.missions.forEach((m, i) => {
      const v1 = catalog.missions[economy[i]!]!;
      expect(m.player.hero.definitionId, m.id).toBe('celtic_orla');
      expect(m.heroHiringEnabled, m.id).toBe(false);
      // The expedition (chapter 3) overrides the wallet-carrying setup only with its fixed war-band.
      expect(m.player.wallet, m.id).toEqual(v1.player.wallet);
      const speakers = new Set([...m.briefing, ...m.victory, ...(m.storyScenes ?? []).flatMap((s) => s.lines), ...(m.briefingVariants ?? []).flatMap((v) => v.lines)].map((l) => l.speaker));
      for (const sp of speakers) expect(['Orla', 'Cathal', 'Sadb', 'Fiachra', 'Corc', 'Tadhg the Grey', 'Ciar', 'Dubhghall'], `${m.id}: ${sp}`).toContain(sp);
      const prose = JSON.stringify([m.objectives, m.sites.map((s) => [s.name, s.description, s.kind.type === 'map_event' ? [s.kind.text, s.kind.options] : null]), m.helpTopics.filter((h) => h.id !== 'manual_battles')]);
      expect(prose, m.id).not.toMatch(/auto-?battle|quick battle|auto-?combat/i);
      expect(m.helpTopics.some((h) => h.id === 'manual_battles'), m.id).toBe(true);
    });
    // Objective texts name guards with army tokens, never typed counts.
    for (const m of built.missions) for (const o of m.objectives) expect(o.description, `${m.id}/${o.id}`).not.toMatch(/\b\d+ (Brigands|Boars|Pooka|Cairn-men|Selkies)\b/);
  });

  it('every chapter has a shortcut opened through play, finite signalled pressure and deadlines that cost only optional objectives', () => {
    for (const m of built.missions) {
      const flags = settableFlags(m);
      const gates = m.sites.filter((s) => s.kind.type === 'gate');
      expect(gates.length, `${m.id}: a shortcut`).toBeGreaterThan(0);
      for (const g of gates) for (const f of g.kind.type === 'gate' ? g.kind.openWhenFlags : []) expect(flags.has(f), `${m.id}/${g.id}: nothing sets ${f}`).toBe(true);
      for (const h of m.hostileHeroes) {
        // The Iron-Bristled Boar is the chapter's quarry (its defeat is the objective), not a pressure wave.
        if (h.commander.heroDefinitionId === 'celtic_iron_boar') continue;
        expect(h.homeSiteId || h.dormantUntilFlag, `${m.id}: ${h.commander.name} needs a home camp or an announced trigger`).toBeTruthy();
        if (h.dormantUntilFlag) expect(flags.has(h.dormantUntilFlag), `${m.id}: nothing wakes ${h.commander.name}`).toBe(true);
      }
      for (const t of m.timers ?? []) for (const id of t.onExpire.failObjectives ?? []) expect(m.objectives.find((o) => o.id === id)?.category).toBe('optional');
      expect(m.objectives.some((o) => o.completesMission), `${m.id}: ends through an objective`).toBe(true);
      for (const f of m.carriedFlags ?? []) expect(flags.has(f), `${m.id}: carries ${f}, which nothing sets`).toBe(true);
      for (const f of m.carriedFlags ?? []) expect((m.evidence ?? []).some((e) => e.flag === f) || f === 'sb4_settled', `${m.id}: ${f} is in the ledger`).toBe(true);
      // Required story fights never join or flee.
      expect(m.sites.some((s) => s.guard?.required), `${m.id}: a required story fight`).toBe(true);
    }
  });

  it('scenes fire on real sites, objectives and foes; every paid choice states its cost; evidence is settable', () => {
    for (const m of built.missions) {
      const siteIds = new Set(m.sites.map((s) => s.id));
      const objIds = new Set(m.objectives.map((o) => o.id));
      const foes = new Set([...m.hostileHeroes.map((h) => h.commander.heroDefinitionId), ...m.sites.flatMap((s) => (s.guard?.commander ? [s.guard.commander.heroDefinitionId] : []))]);
      const flags = settableFlags(m);
      for (const sc of m.storyScenes ?? []) {
        const t = sc.trigger;
        if ('siteId' in t && t.siteId) expect(siteIds.has(t.siteId), `${m.id}/${sc.id}`).toBe(true);
        if (t.type === 'objective_completed') expect(objIds.has(t.objectiveId), `${m.id}/${sc.id}`).toBe(true);
        if (t.type === 'battle_started' && t.heroDefinitionId) expect(foes.has(t.heroDefinitionId), `${m.id}/${sc.id}`).toBe(true);
        if (t.type === 'flag') expect(flags.has(t.flag), `${m.id}/${sc.id}: nothing sets ${t.flag}`).toBe(true);
      }
      for (const s of m.sites) {
        if (s.kind.type !== 'map_event') continue;
        for (const o of s.kind.options) if (o.cost && Object.values(o.cost).some((v) => (v ?? 0) > 0)) expect(o.summary, `${m.id}/${s.id}: ${o.label}`).toMatch(/Costs|Pay /);
      }
      for (const e of m.evidence ?? []) expect(flags.has(e.flag), `${m.id}/${e.id}`).toBe(true);
    }
  });

  it('chapters read only facts that an earlier (or parallel) chapter can carry', () => {
    for (const m of built.missions) {
      const earlier = possiblyEarlier(m.id);
      const carriable = new Set(built.missions.filter((x) => earlier.has(x.id)).flatMap((x) => x.carriedFlags ?? []));
      for (const f of factsRead(m)) expect(carriable.has(f), `${m.id} reads fact ${f}`).toBe(true);
    }
    expect(factsRead(mission(1))).toEqual([]);
  });

  it('the Hall Beneath the Waves and the High Seat are coherent in both orders (cards 29 and 30)', () => {
    const m3 = mission(3);
    const m4 = mission(4);
    expect(m3.carriedFlags).toContain('sb3_charters');
    expect(m4.carriedFlags).toEqual(expect.arrayContaining(['sb4_settled', 'sb4_governor', 'sb4_removed']));
    // The hall first: the charters inform the succession; nobody mentions duties already written.
    const plain3 = text(missionBriefingLines(m3, start(3).mission.flags));
    expect(plain3).toMatch(/before anyone decides who sits there next/);
    expect(plain3).not.toMatch(/duties we wrote|governs at the High Seat|took the High Seat/);
    // After the High Seat: the charters test the settlement already made.
    const governed = text(missionBriefingLines(m3, start(3, ['sb4_governor', 'sb4_settled']).mission.flags));
    expect(governed).toMatch(/duties we wrote for him/);
    expect(governed).not.toMatch(/before anyone decides who sits there next/);
    const removed = text(missionBriefingLines(m3, start(3, ['sb4_removed', 'sb4_settled']).mission.flags));
    expect(removed).toMatch(/took the High Seat from Fiachra/);
    const hallScenes = (m3.storyScenes ?? []).filter((s) => s.trigger.type === 'site_cleared' && s.trigger.siteId === 'sb3_hall');
    expect(hallScenes.map((s) => [s.ifFlags ?? [], s.unlessFlags ?? []])).toEqual([[['fact:sb4_settled'], []], [[], ['fact:sb4_settled']]]);
    expect(text(hallScenes[0]!.lines)).toMatch(/settlement holds up/);
    expect(text(hallScenes[1]!.lines)).toMatch(/Whoever sits there after Fiachra/);
    for (const flag of ['sb3_published', 'sb3_reconciled']) {
      const final = (m3.storyScenes ?? []).filter((s) => s.trigger.type === 'flag' && s.trigger.flag === flag);
      expect(final.map((s) => [s.ifFlags ?? [], s.unlessFlags ?? []]), flag).toEqual([[['fact:sb4_settled'], []], [[], ['fact:sb4_settled']]]);
    }
    // The High Seat first: no word of the drowned hall; after the hall, the charters reach the assembly.
    const plain4 = start(4);
    expect(text(missionBriefingLines(m4, plain4.mission.flags))).not.toMatch(/charter|drowned|Hall Beneath/i);
    expect(text(missionBriefingLines(m4, start(4, ['sb3_charters']).mission.flags))).toMatch(/drowned charters/);
    const assembly = site(4, 'sb4_assembly');
    if (assembly.kind.type !== 'map_event') throw new Error('assembly');
    const [call, read] = assembly.kind.options;
    expect(call!.requiresFlags).toEqual(['sb4_two_districts']);
    expect(read!.requiresFlags).toEqual(['sb4_two_districts', 'fact:sb3_charters']);
    expect(call!.clearsSiteIds).toEqual(read!.clearsSiteIds);
    expect((read!.cost?.gold ?? 0) < (call!.cost?.gold ?? 0)).toBe(true);
    const factsOffered = (s: MatchState) => assembly.kind.type === 'map_event' && assembly.kind.options.filter((o) => (o.requiresFlags ?? []).filter((f) => f.startsWith('fact:')).every((f) => s.mission.flags[f])).length;
    expect(factsOffered(plain4)).toBe(1);
    expect(factsOffered(start(4, ['sb3_charters']))).toBe(2);
    const assemblyScenes = (m4.storyScenes ?? []).filter((s) => s.trigger.type === 'flag' && s.trigger.flag === 'sb4_assembly');
    expect(assemblyScenes.map((s) => [s.ifFlags ?? [], s.unlessFlags ?? []])).toEqual([[['fact:sb3_charters'], []], [[], ['fact:sb3_charters']]]);
    expect(text(assemblyScenes[1]!.lines)).not.toMatch(/charter|parchment of the kings/i);
    // No snowball between the parallel pair: neither grants the other troops or resources.
    expect((m3.entryBonuses ?? []).filter((b) => b.fact.startsWith('sb4_'))).toEqual([]);
    expect((m4.entryBonuses ?? []).filter((b) => b.fact.startsWith('sb3_'))).toEqual([]);
  });

  it('the assembly resolves the High Seat without a battle; removing Fiachra needs a manual confrontation', () => {
    const assembly = site(4, 'sb4_assembly');
    const stone = site(4, 'sb4_stone');
    if (assembly.kind.type !== 'map_event' || stone.kind.type !== 'map_event') throw new Error('events');
    for (const o of assembly.kind.options) expect(o.clearsSiteIds).toEqual(['sb4_seat', 'sb4_reserve_camp']);
    expect(site(4, 'sb4_seat').guard?.required).toBe(true);
    expect(site(4, 'sb4_seat').guard?.reward.flags).toContain('sb4_fiachra_beaten');
    const [keep, remove] = stone.kind.options;
    expect(keep!.requiresFlags).toEqual(['sb4_seat_won']);
    expect(remove!.requiresFlags).toEqual(['sb4_fiachra_beaten']);
    // The reserve is visible, announced and finite: dormant until a district turns, homed at its camp.
    const reserve = mission(4).hostileHeroes.find((h) => h.commander.heroDefinitionId === 'sb4_reserve')!;
    expect(reserve.dormantUntilFlag).toBe('sb4_first_support');
    expect(reserve.homeSiteId).toBe('sb4_reserve_camp');
    const timer = mission(4).timers!.find((t) => t.id === 'sb4_reserve_march')!;
    expect(timer.startWhen).toEqual({ type: 'flag', flag: 'sb4_first_support' });
    // Three districts with distinct local outcomes (a fight, a delivery, a rescue).
    expect(site(4, 'sb4_levy_house').guard).toBeDefined();
    expect(site(4, 'sb4_drovers').kind.type).toBe('activation');
    expect(site(4, 'sb4_stockade').guard).toBeDefined();
  });

  it('earlier choices give bounded entry bonuses', () => {
    // Chapter 2: the first supplies of chapter 1.
    const plain2 = start(2);
    expect(garrison(start(2, ['sb1_feast']), 'dun_bera', 'celtic_cu_sith') - garrison(plain2, 'dun_bera', 'celtic_cu_sith')).toBe(8);
    expect(wallet(2, start(2, ['sb1_road'])).gold - wallet(2, plain2).gold).toBe(1500);
    expect(text(missionBriefingLines(mission(2), plain2.mission.flags))).not.toMatch(/feast|outer road/);
    expect(text(missionBriefingLines(mission(2), start(2, ['sb1_feast']).mission.flags))).toMatch(/after the feast/);
    // Chapter 3: the kelpie pact; chapter 4: the separate channel's harvest.
    expect(wallet(3, start(3, ['sb2_kelpie_pact'])).favor - wallet(3, start(3)).favor).toBe(5);
    expect(wallet(4, start(4, ['sb2_channel'])).gold - wallet(4, start(4)).gold).toBe(2000);
    // Chapter 5: the forest district and the charters' two paths.
    const plain5 = start(5);
    expect(wallet(5, start(5, ['sb4_forest'])).wood - wallet(5, plain5).wood).toBe(8);
    expect(wallet(5, start(5, ['sb3_reconciled'])).crystal - wallet(5, plain5).crystal).toBe(3);
    expect(wallet(5, start(5, ['sb3_published'])).favor - wallet(5, plain5).favor).toBe(10);
    // Chapter 6: the written duties decide which district aids the finale; the loch, the coast and the wood.
    const plain6 = start(6);
    expect(wallet(6, start(6, ['sb4_market'])).gold - wallet(6, plain6).gold).toBe(2500);
    expect(garrison(start(6, ['sb4_pasture']), 'dun_brugh', 'celtic_great_cu_sith') - garrison(plain6, 'dun_brugh', 'celtic_great_cu_sith')).toBe(10);
    expect(garrison(start(6, ['sb4_forest']), 'dun_brugh', 'celtic_elder_pooka') - garrison(plain6, 'dun_brugh', 'celtic_elder_pooka')).toBe(16);
    expect(heroCount(start(6, ['sb2_farms_moved']), 'celtic_dread_kelpie') - heroCount(plain6, 'celtic_dread_kelpie')).toBe(3);
    expect(heroCount(start(6, ['sb3_reconciled']), 'celtic_storm_selkie') - heroCount(plain6, 'celtic_storm_selkie')).toBe(4);
    expect(heroCount(start(6, ['sb5_regrowth']), 'celtic_great_stag_spirit') - heroCount(plain6, 'celtic_great_stag_spirit')).toBe(2);
    // The orchard refuge renews the plain's refuge without cost; regrowth calls off the bound stags.
    const glen = site(6, 'sb6_glen');
    const stags = site(6, 'sb6_stags');
    if (glen.kind.type !== 'map_event' || stags.kind.type !== 'map_event') throw new Error('events');
    expect(glen.kind.options[1]!.requiresFlags).toEqual(['fact:sb5_orchard_refuge']);
    expect(glen.kind.options[1]!.cost).toBeUndefined();
    expect(stags.kind.options[0]!.requiresFlags).toEqual(['fact:sb5_regrowth']);
    expect(stags.kind.options[0]!.clearsSiteIds).toEqual(['sb6_south_road']);
    for (const m of built.missions) expect((m.entryBonuses ?? []).length).toBeLessThanOrEqual(6);
    for (const m of built.missions) for (const b of m.entryBonuses ?? []) expect([...(b.heroArmy ?? []), ...(b.garrison ?? [])].every((s) => s.count <= 16), `${m.id}/${b.fact}`).toBe(true);
  });

  it('the water route: opening the weir floods the farm ford, keeps the causeway and opens the kelpies’ landing (card 28)', () => {
    const m2 = mission(2);
    const weir = site(2, 'sb2_weir');
    if (weir.kind.type !== 'sluice') throw new Error('weir');
    const causeway = site(2, 'sb2_causeway').coord;
    const cell = (mm: MissionDefinition, c: { q: number; r: number }) => mm.map!.rows[c.r]![c.q];
    for (const c of weir.kind.channel) {
      expect(cell(withSluices(m2, false), c)).toBe('s');
      expect(cell(withSluices(m2, true), c)).toBe('w');
    }
    expect(weir.kind.channel.some((c) => hexKey(c) === hexKey(causeway))).toBe(false);
    for (const id of ['sb2_kelpie_slip', 'sb2_hill_slip']) {
      const k = site(2, id).kind;
      expect(k.type === 'portal' && k.requiresFlag).toBe(weir.kind.openFlag);
    }
    // The collectors at the weir stand down once the dispute is settled (either way); the afancs come with the settlement.
    const moot = site(2, 'sb2_moot');
    if (moot.kind.type !== 'map_event') throw new Error('moot');
    for (const o of moot.kind.options) expect(o.clearsSiteIds).toContain('sb2_weir');
    expect(moot.kind.options.map((o) => o.reward.flags)).toEqual([['sb2_settled', 'sb2_farms_moved'], ['sb2_settled', 'sb2_channel']]);
    const afanc = site(2, 'sb2_afanc').kind;
    expect(afanc.type === 'creature_camp' && afanc.requiresFlag).toBe('sb2_settled');
    // The kelpie pact is a route advantage, not a creature: nothing in the chapter hands out kelpies.
    const rewards = JSON.stringify(m2.sites.flatMap((s) => (s.kind.type === 'map_event' ? s.kind.options.map((o) => o.reward) : [])));
    expect(rewards).not.toMatch(/celtic_kelpie|celtic_dread_kelpie/);
    // The witness is reachable both ways round the loch, with the weir open or shut.
    for (const open of [true, false]) {
      const g = mapGraph(withSluices(m2, open).map!, blockers(m2, [site(2, 'sb2_keening').coord]));
      expect(independentApproaches(g, gateOf(m2), site(2, 'sb2_keening').coord, 2), `weir open=${open}`).toBe(2);
    }
  });

  it('the Stags’ Wood: each release previews its change, the outer road and both cross-paths never close (card 31)', () => {
    const m5 = mission(5);
    const stones = m5.sites.filter((s) => s.kind.type === 'sluice');
    expect(stones.map((s) => s.id)).toEqual(['sb5_spring_stone', 'sb5_autumn_stone', 'sb5_winter_stone']);
    const roadCells = new Set(m5.map!.roads.flatMap((k) => k.split('|')));
    for (const s of stones) {
      if (s.kind.type !== 'sluice') continue;
      expect(s.kind.openText, s.id).toMatch(/opens|closes/);
      // No channel cell lies on any road (the outer road and the cross-paths are permanent).
      for (const c of s.kind.channel) expect(roadCells.has(hexKey(c)), `${s.id} channel on a road`).toBe(false);
    }
    // The binding stones answer only once Tadhg's host is broken (their thorn gates).
    for (const id of ['sb5_spring_gate', 'sb5_autumn_gate', 'sb5_winter_gate']) {
      const g = site(5, id).kind;
      expect(g.type === 'gate' && g.openWhenFlags).toEqual(['sb5_tadhg_down']);
    }
    for (const id of ['sb5_spring', 'sb5_autumn', 'sb5_winter']) expect(m5.objectives.find((o) => o.id === id)!.requires).toEqual(['sb5_tadhg']);
    // Every combination of released glades keeps two independent ways to the heart of the wood, and every glade reachable.
    const heart = site(5, 'sb5_heart').coord;
    const variants = [0, 1, 2, 3, 4, 5, 6, 7].map((mask) => {
      const rows = m5.map!.rows.map((r) => r.split(''));
      stones.forEach((s, i) => {
        if (s.kind.type !== 'sluice') return;
        const code = { plains: 'p', forest: 'f', rough: 'r', marsh: 's', mountain: 'm', water: 'w', void: 'v' }[mask & (1 << i) ? s.kind.openTerrain : s.kind.closedTerrain];
        for (const c of s.kind.channel) rows[c.r]![c.q] = code;
      });
      return { ...m5, map: { ...m5.map!, rows: rows.map((r) => r.join('')) } };
    });
    for (const v of variants) {
      expect(independentApproaches(mapGraph(v.map!, blockers(v, [heart])), gateOf(v), heart, 2)).toBe(2);
      const reach = reachWithFerries(v, gateOf(v), false);
      for (const id of ['sb5_lodge', 'sb5_bell', 'sb5_orchard', 'sb5_spring_stone', 'sb5_autumn_stone', 'sb5_winter_stone']) {
        const c = site(5, id).coord;
        const near = [c, ...[[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]].map(([dq, dr]) => ({ q: c.q + dq!, r: c.r + dr! }))].some((n) => reach.has(hexKey(n)));
        expect(near, id).toBe(true);
      }
    }
    // One announced defensive encounter after the last release; Tadhg's host is finite.
    const binder = m5.hostileHeroes.find((h) => h.commander.heroDefinitionId === 'sb5_last_binder')!;
    expect(binder.dormantUntilFlag).toBe('sb5_glades_free');
    expect(m5.hostileHeroes).toHaveLength(1);
    expect(site(5, 'sb5_heart').guard?.required).toBe(true);
  });

  it('the expedition to the drowned hall: a fixed war-band, two resupply caches, two landings and a return shortcut (card 29)', () => {
    const m3 = mission(3);
    expect(m3.purchasableBuildingIds).toEqual([]);
    expect(m3.player.town.buildings.some((b) => b.includes('dwelling'))).toBe(false);
    const caches = m3.sites.filter((s) => s.kind.type === 'pickup' && s.art === 'supply_depot');
    expect(caches).toHaveLength(2);
    for (const c of caches) expect(c.kind.type === 'pickup' && (c.kind.reward.creatures ?? []).length).toBeGreaterThan(0);
    const seadoor = site(3, 'sb3_seadoor').kind;
    expect(seadoor.type === 'gate' && seadoor.openWhenFlags).toEqual(['sb3_landing_open']);
    for (const id of ['sb3_north_landing', 'sb3_south_landing']) expect(site(3, id).guard?.reward.flags).toContain('sb3_landing_open');
    const mooring = site(3, 'sb3_corc_mooring');
    if (mooring.kind.type !== 'map_event') throw new Error('mooring');
    expect(mooring.kind.options[0]!.clearsSiteIds).toEqual(['sb3_north_landing']);
    expect(mooring.kind.options[0]!.reward.flags).toContain('sb3_landing_open');
    expect(mooring.kind.options[0]!.requiresFlags).toEqual(['sb3_stores_taken']);
    // Corc holds the richest landing (no patrol of his own); his longships go home when their storehouses fall.
    expect(site(3, 'sb3_north_landing').guard?.commander?.heroDefinitionId).toBe('celtic_corc');
    expect(m3.hostileHeroes.map((h) => h.homeSiteId).sort()).toEqual(['sb3_store_n', 'sb3_store_s']);
    // Afancs in the freshwater lagoon, brigands at the outer inlet.
    expect(m3.sites.filter((s) => s.kind.type === 'creature_camp').map((s) => (s.kind.type === 'creature_camp' ? s.kind.creatureId : '')).sort()).toEqual(['afanc', 'brigand']);
  });

  it('the announced raid on the drovers’ store costs only an optional bonus; the chapter can still be won', () => {
    const m1 = mission(1);
    const raid = m1.timers!.find((t) => t.id === 'sb1_raid')!;
    const s = endTurns(start(1), raid.days + 1, 'sb1-end');
    expect(s.mission.flags['sb1_store_raided']).toBe(true);
    expect(s.mission.objectives['sb1_full_store']!.status).toBe('failed');
    for (const o of m1.objectives.filter((x) => x.category === 'primary')) expect(s.mission.objectives[o.id]!.status).not.toBe('failed');
    expect(s.outcome.status).toBe('running');
  });

  it('the finale: three of four obligations, two barrow-roads, and the epilogue follows the final choice over the campaign cover', () => {
    const m6 = mission(6);
    const obligations = m6.objectives.find((o) => o.id === 'sb6_obligations')!;
    expect(JSON.stringify(obligations.condition)).toContain('sb6_refuge');
    // Two approaches to the mound: the northern and southern barrow-roads (crossings into its two doors).
    expect(m6.sites.filter((s) => s.id.endsWith('_road') && s.kind.type === 'crossing').map((s) => s.id).sort()).toEqual(['sb6_north_road', 'sb6_south_road']);
    // The mixed refuge: one band from one finite budget, opened by renewing the refuge.
    const band = site(6, 'sb6_refuge_band');
    if (band.kind.type !== 'map_event') throw new Error('band');
    expect(band.kind.options.map((o) => o.reward.creatures?.[0]?.creatureId)).toEqual(['afanc', 'root_runner', 'centaur_sentinel']);
    for (const o of band.kind.options) expect(o.requiresFlags).toEqual(['sb6_refuge']);
    // Ciar's tribute route: announced, homed at the Tribute Post.
    const ciar = m6.hostileHeroes.find((h) => h.commander.heroDefinitionId === 'celtic_ciar')!;
    expect(ciar.homeSiteId).toBe('sb6_tribute_post');
    expect(m6.timers!.map((t) => t.id)).toEqual(['sb6_tribute_day']);
    // The epilogue.
    const camp = catalog.campaigns['silver_branch']!;
    expect(camp.epilogueV2?.art).toBe('campaign.silver_branch.cover');
    expect(text(campaignEpilogueV2Lines(camp, { sb_limited_seat: true }))).toMatch(/High Seat again/);
    expect(text(campaignEpilogueV2Lines(camp, { sb_limited_seat: true }))).not.toMatch(/No seat at all/);
    expect(text(campaignEpilogueV2Lines(camp, { sb_keepers_compact: true }))).toMatch(/No seat at all/);
    expect(text(campaignEpilogueV2Lines(camp, { sb_keepers_compact: true }))).not.toMatch(/High Seat again/);
    const branch = site(6, 'sb6_branch');
    if (branch.kind.type !== 'map_event') throw new Error('branch');
    expect(branch.kind.options.flatMap((o) => o.reward.flags ?? [])).toEqual(['sb_limited_seat', 'sb_keepers_compact']);
    expect(m6.objectives.find((o) => o.id === 'sb6_choice')?.completesMission).toBe(true);
    // Who accepts the arrangement follows the High Seat outcome; the recovering places follow earlier choices.
    const seatScenes = (m6.storyScenes ?? []).filter((s) => s.trigger.type === 'flag' && (s.trigger.flag === 'sb_limited_seat' || s.trigger.flag === 'sb_keepers_compact'));
    expect(seatScenes.map((s) => s.ifFlags?.[0]).sort()).toEqual(['fact:sb4_governor', 'fact:sb4_governor', 'fact:sb4_removed', 'fact:sb4_removed']);
    const recovering = (m6.storyScenes ?? []).filter((s) => s.trigger.type === 'objective_completed' && s.trigger.objectiveId === 'sb6_choice');
    expect(recovering.map((s) => s.ifFlags?.[0]).sort()).toEqual(['fact:sb1_feast', 'fact:sb1_road', 'fact:sb2_channel', 'fact:sb2_farms_moved', 'fact:sb5_orchard_refuge', 'fact:sb5_regrowth']);
  });
});
