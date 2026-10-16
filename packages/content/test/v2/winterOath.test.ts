/**
 * The Winter Oath, content v2 (handoff 2026-10-15; review cards 9–14): six
 * chapters carrying the seven legacy chapters, played 1 → 2 → {3, 4} → 5 → 6.
 * Chapters 3 (Ice on the Sound) and 4 (The Jarl of Hvitstrand) read each other's
 * facts so that neither order names an investigation that has not happened;
 * earlier choices give bounded entry bonuses; the final rite picks the epilogue.
 */
import { describe, expect, it } from 'vitest';
import { createMissionMatch } from '@pr/campaign';
import { campaignEpilogueV2Lines, missionBriefingLines, processCommand, type GameCommand, type MatchState, type MissionDefinition } from '@pr/rules';
import { buildWinterOathV2 } from '../../src/campaign/v2/winterOathV2';
import { catalogWith } from './harness';
import { checkV2Missions } from './checks';
import missionContent from '../../../../docs/campaign-v2/design/mission-content.json';
import campaignGraph from '../../../../docs/campaign-v2/design/campaign-graph.json';

const { catalog, built, issues } = catalogWith('winter_oath', 'norse', buildWinterOathV2);
const mission = (n: number) => catalog.missions[`winter_oath_v2_m0${n}`]!;
const start = (n: number, facts: string[] = []) => createMissionMatch(catalog, `winter_oath_v2_m0${n}`, { matchId: `wo-${n}-${facts.join('+') || 'plain'}`, facts }).match;
const text = (lines: readonly { text: string }[]) => lines.map((l) => l.text).join(' ');

interface Card {
  readonly n: number;
  readonly campaign: string;
  readonly proposedMissionId: string;
  readonly requiresAll: readonly string[];
  readonly legacyMissionIds: readonly string[];
  readonly briefingArt: readonly string[];
}
const cards = (missionContent as readonly Card[]).filter((c) => c.campaign === 'winter_oath');
const graph = (campaignGraph as readonly { campaignId: string; nodes: { id: string; requiresAll: string[] }[] }[]).find((g) => g.campaignId === 'winter_oath')!;

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

const endTurn = (state: MatchState): GameCommand => ({ kind: 'EndTurn', commandId: `wo-end-${state.revision}`, expectedRevision: state.revision, actorPlayerId: state.activePlayerId }) as GameCommand;
/** End turns (every seat) until the day passes `day`. */
function waitUntil(s0: MatchState, day: number): MatchState {
  let s = s0;
  for (let i = 0; i < 200 && s.day <= day; i++) {
    const r = processCommand({ catalog }, s, endTurn(s));
    if (!r.ok) throw new Error(r.rejection.message);
    s = r.state;
  }
  // One more command: gates and objectives follow the flags a deadline set.
  const r = processCommand({ catalog }, s, endTurn(s));
  if (!r.ok) throw new Error(r.rejection.message);
  return r.state;
}

describe('The Winter Oath v2', () => {
  it('validates, follows the chapter graph and carries every legacy chapter exactly once (as the cards say)', () => {
    expect(issues.filter((i) => i.includes('winter_oath'))).toEqual([]);
    expect(built.missions.map((m) => m.id)).toEqual(cards.map((c) => c.proposedMissionId));
    for (const card of cards) {
      const ch = built.chapters.find((c) => c.missionId === card.proposedMissionId)!;
      expect(ch.legacyMissionIds, card.proposedMissionId).toEqual(card.legacyMissionIds);
      expect(ch.requiresAll, card.proposedMissionId).toEqual(card.requiresAll);
      expect(ch.requiresAll, card.proposedMissionId).toEqual(graph.nodes.find((n) => n.id === card.proposedMissionId)!.requiresAll);
      expect(ch.briefingArt, card.proposedMissionId).toEqual(card.briefingArt.map((a) => a.replace(/^art\/missions\//, '').replace(/\.webp$/, '')));
    }
    const legacy = built.chapters.flatMap((c) => c.legacyMissionIds);
    expect([...legacy].sort()).toEqual(['winter_oath_m01', 'winter_oath_m02', 'winter_oath_m03', 'winter_oath_m04', 'winter_oath_m05', 'winter_oath_m06', 'winter_oath_m07']);
    expect(new Set(legacy).size).toBe(7);
    // The merged chapter carries both of its source chapters, in order.
    expect(built.chapters.find((c) => c.missionId === 'winter_oath_v2_m02')!.legacyMissionIds).toEqual(['winter_oath_m02', 'winter_oath_m03']);
    expect(catalog.campaigns['winter_oath']!.finalChapterId).toBe('winter_oath_v2_m06');
    checkV2Missions(catalog, built.missions);
  });

  it('every chapter has a shortcut opened through play, finite signalled pressure and deadlines that cost only optional objectives', () => {
    for (const m of built.missions) {
      const flags = settableFlags(m);
      const gates = m.sites.filter((s) => s.kind.type === 'gate');
      expect(gates.length, `${m.id}: a shortcut`).toBeGreaterThan(0);
      for (const g of gates) for (const f of g.kind.type === 'gate' ? g.kind.openWhenFlags : []) expect(flags.has(f), `${m.id}/${g.id}: nothing sets ${f}`).toBe(true);
      for (const h of m.hostileHeroes) {
        expect(h.homeSiteId || h.dormantUntilFlag, `${m.id}: ${h.commander.name} needs a home camp or an announced trigger`).toBeTruthy();
        if (h.dormantUntilFlag) expect(flags.has(h.dormantUntilFlag), `${m.id}: nothing wakes ${h.commander.name}`).toBe(true);
        if (h.homeSiteId) expect(m.sites.find((s) => s.id === h.homeSiteId)?.guard, `${m.id}: ${h.commander.name}'s home needs a guard`).toBeTruthy();
      }
      for (const t of m.timers ?? []) {
        for (const id of t.onExpire.failObjectives ?? []) expect(m.objectives.find((o) => o.id === id)?.category).toBe('optional');
        expect(t.announce, `${m.id}/${t.id}: announced`).toBeTruthy();
      }
      expect(m.objectives.some((o) => o.completesMission) || m.sites.some((s) => s.kind.type === 'activation' && s.kind.completesMission), `${m.id}: ends through an objective or activation`).toBe(true);
      for (const f of m.carriedFlags ?? []) expect(flags.has(f), `${m.id}: carries ${f}, which nothing sets`).toBe(true);
      // Required story fights never join or flee; no text offers a quick battle.
      expect(m.sites.some((s) => s.guard?.required), `${m.id}: a required story fight`).toBe(true);
      const all = JSON.stringify([m.briefing, m.victory, m.objectives, m.sites.map((s) => [s.name, s.description, s.kind]), m.helpTopics.filter((h) => h.id !== 'manual_battles')]);
      expect(all).not.toMatch(/auto-?battle|quick battle|auto-combat/i);
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

  it('Ice on the Sound is coherent in both orders: Hvitstrand’s merchants supply an extra landing only once Hvitstrand is opened (card 11)', () => {
    const m3 = mission(3);
    expect(mission(4).carriedFlags).toContain('wo4_harbour_open');
    const plain = start(3);
    const after4 = start(3, ['wo4_harbour_open']);
    // Chapter 3 first: no merchants' knarr; the expedition establishes the merchant landing itself.
    expect(text(missionBriefingLines(m3, plain.mission.flags))).not.toMatch(/merchants sent|knarr ahead|ours already/);
    expect(text(missionBriefingLines(m3, plain.mission.flags))).toMatch(/pay his dues, or we make our own landings/);
    expect(plain.mission.flags['wo3_merchant_landing']).toBeFalsy();
    // Chapter 4 first: the merchants' landing is established from the start (an extra landing, no troops or coin).
    expect(text(missionBriefingLines(m3, after4.mission.flags))).toMatch(/Hvitstrand’s merchants sent a knarr/);
    expect(text(missionBriefingLines(m3, after4.mission.flags))).not.toMatch(/pay his dues/);
    expect(after4.mission.flags['wo3_merchant_landing']).toBe(true);
    const quay = m3.sites.find((s) => s.id === 'wo3_skarvik_quay')!;
    expect(quay.kind.type === 'portal' && quay.kind.requiresFlag).toBe('wo3_merchant_landing');
    for (const b of (m3.entryBonuses ?? []).filter((x) => x.fact.startsWith('wo4_'))) expect([b.wallet, b.heroArmy, b.garrison]).toEqual([undefined, undefined, undefined]);
    const reeve = (m3.storyScenes ?? []).filter((s) => s.trigger.type === 'site_visited' && s.trigger.siteId === 'wo3_reeve');
    expect(reeve.map((s) => [s.ifFlags ?? [], s.unlessFlags ?? []])).toEqual([[['fact:wo4_harbour_open'], []], [[], ['fact:wo4_harbour_open']]]);
    // Either way two of the three landings are needed; the merchants only make one of them free.
    const landings = m3.objectives.find((o) => o.id === 'wo3_landings')!;
    expect(JSON.stringify(landings.condition)).toContain('wo3_merchant_landing');
  });

  it('The Jarl of Hvitstrand is coherent in both orders: the ledger strengthens the settlement only once recovered (card 12)', () => {
    const m4 = mission(4);
    expect(mission(3).carriedFlags).toContain('wo3_ledger');
    const plain = start(4);
    const after3 = start(4, ['wo3_ledger']);
    expect(text(missionBriefingLines(m4, plain.mission.flags))).not.toMatch(/ledger|Bone-Helm/);
    expect(text(missionBriefingLines(m4, after3.mission.flags))).toMatch(/Bone-Helm’s ledger/);
    const parley = m4.sites.find((s) => s.id === 'wo4_parley')!;
    if (parley.kind.type !== 'map_event') throw new Error('parley');
    const [settle, withLedger] = parley.kind.options;
    // The settlement is backed by the exposed toll accounts either way; the ledger is never required.
    expect(settle!.requiresFlags).toEqual(['wo4_toll_accounts', 'wo4_provisioned']);
    expect(withLedger!.requiresFlags).toEqual(['wo4_toll_accounts', 'wo4_provisioned', 'fact:wo3_ledger']);
    expect((withLedger!.cost?.gold ?? 0) < (settle!.cost?.gold ?? 0)).toBe(true);
    expect(withLedger!.clearsSiteIds).toEqual(settle!.clearsSiteIds);
    const offered = (state: MatchState) => parley.kind.type === 'map_event' && parley.kind.options.filter((o) => (o.requiresFlags ?? []).every((f) => f.startsWith('wo4_') || state.mission.flags[f])).length;
    expect(offered(plain)).toBe(1);
    expect(offered(after3)).toBe(2);
    const scenes = (m4.storyScenes ?? []).filter((s) => s.trigger.type === 'site_visited' && s.trigger.siteId === 'wo4_parley');
    expect(scenes.map((s) => [s.ifFlags ?? [], s.unlessFlags ?? []])).toEqual([[['fact:wo3_ledger'], []], [[], ['fact:wo3_ledger']]]);
    for (const s of scenes) if (!s.ifFlags) expect(text(s.lines)).not.toMatch(/ledger|Bone-Helm/);
    // No combat snowball from the parallel chapter.
    expect((m4.entryBonuses ?? []).filter((b) => b.fact.startsWith('wo3_'))).toEqual([]);
    // She yields to a settlement or to a siege fought by hand; either ends the blockade.
    const blockade = m4.objectives.find((o) => o.id === 'wo4_blockade')!;
    expect(JSON.stringify(blockade.condition)).toContain('wo4_settlement');
    expect(JSON.stringify(blockade.condition)).toContain('hvitstrand');
    expect(m4.neutralTowns?.[0]?.garrison?.length).toBeGreaterThan(0);
  });

  it('earlier choices give bounded entry bonuses', () => {
    const wallet = (s: MatchState, n: number) => s.players[mission(n).player.playerId]!.wallet;
    const heroCount = (s: MatchState, creatureId: string) => s.heroes['hervor']!.army.slots.reduce((n, x) => n + (x?.creatureId === creatureId ? x.count : 0), 0);
    const garrison = (s: MatchState, townId: string, creatureId: string) => s.towns[townId]!.garrison.slots.reduce((n, x) => n + (x?.creatureId === creatureId ? x.count : 0), 0);
    // Chapter 3: the refuge's grain (chapter 2) buys one valkyrie flight.
    expect(heroCount(start(3, ['wo2_grain_refuge']), 'norse_battle_valkyrie') - heroCount(start(3), 'norse_battle_valkyrie')).toBe(3);
    // Chapter 4: the families sent to the coast (chapter 1) and the villages' grain (chapter 2).
    const plain4 = start(4);
    expect(wallet(start(4, ['wo1_to_coast']), 4).gold - wallet(plain4, 4).gold).toBe(1500);
    expect(wallet(start(4, ['wo2_grain_villages']), 4).gold - wallet(plain4, 4).gold).toBe(2000);
    // Chapter 5: the merchant trade secured first on the sound.
    const plain5 = start(5);
    expect(wallet(start(5, ['wo3_trade_first']), 5).gold - wallet(plain5, 5).gold).toBe(2000);
    expect(wallet(start(5, ['wo3_trade_first']), 5).crystal - wallet(plain5, 5).crystal).toBe(2);
    // Chapter 6: allied garrisons and guarded settlements from earlier chapters.
    const plain6 = start(6);
    expect(garrison(start(6, ['wo1_sheltered']), 'isafold', 'norse_deathless_draugr') - garrison(plain6, 'isafold', 'norse_deathless_draugr')).toBe(16);
    expect(garrison(start(6, ['wo4_harbour_guard']), 'isafold', 'norse_ancient_frost_troll') - garrison(plain6, 'isafold', 'norse_ancient_frost_troll')).toBe(4);
    const dues = start(6, ['wo4_dues_returned']);
    expect(dues.mission.flags['wo6_kolby_guarded']).toBe(true);
    expect(plain6.mission.flags['wo6_kolby_guarded']).toBeFalsy();
    expect(heroCount(dues, 'norse_fenrir_wolf') - heroCount(plain6, 'norse_fenrir_wolf')).toBe(8);
    expect(start(6, ['wo2_pack_pact']).mission.flags['wo6_snaevik_guarded']).toBe(true);
    expect(start(6, ['wo5_downhill']).mission.flags['wo6_hrimby_guarded']).toBe(true);
    expect(heroCount(start(6, ['wo5_high_refuge']), 'norse_jotunn') - heroCount(plain6, 'norse_jotunn')).toBe(2);
    // Bounded: a handful per chapter, never a hero.
    for (const m of built.missions) expect((m.entryBonuses ?? []).length).toBeLessThanOrEqual(6);
    // The opening chapters start plain.
    expect(mission(1).entryBonuses ?? []).toEqual([]);
    expect(mission(2).entryBonuses ?? []).toEqual([]);
  });

  it('the announced night raid costs only a farm’s bonus provisions; the chapter can still be won', () => {
    const m1 = mission(1);
    const raid = m1.timers!.find((t) => t.id === 'wo1_raid_west')!;
    // A stockade held by Kaldvik (or the raiders' camp taken) meets the deadline: Hervor need not stand on the road.
    expect(JSON.stringify(raid.metWhen)).toContain('wo1_west_post');
    const s = waitUntil(start(1), raid.days + 1);
    expect(s.mission.flags['wo1_west_raid']).toBe(true);
    expect(s.mission.objectives['wo1_west_provisions']!.status).toBe('failed');
    for (const o of m1.objectives.filter((x) => x.category === 'primary')) expect(s.mission.objectives[o.id]!.status).not.toBe('failed');
    expect(s.outcome.status).toBe('running');
    // The raid wakes only its own band, which withdraws when its camp is taken.
    const band = m1.hostileHeroes.find((h) => h.dormantUntilFlag === 'wo1_west_raid')!;
    expect(band.homeSiteId).toBe('wo1_grave_camp');
  });

  it('the ice on the sound bears on its announced day and never closes; the thaw opens its gully', () => {
    const m3 = mission(3);
    const ice = m3.timers!.find((t) => t.id === 'wo3_ice')!;
    let s = start(3);
    expect(s.world.sites['wo3_ice_road']!.open).toBeFalsy();
    s = waitUntil(s, ice.days + 1);
    expect(s.mission.flags['wo3_ice_bears']).toBe(true);
    expect(s.world.sites['wo3_ice_road']!.open).toBe(true);
    for (const o of m3.objectives.filter((x) => x.category === 'primary')) expect(s.mission.objectives[o.id]!.status).not.toBe('failed');
    // The ice road is never the only way: the skerry route and the ferries reach the same places.
    expect(m3.timers!.every((t) => !(t.onExpire.failObjectives ?? []).some((id) => m3.objectives.find((o) => o.id === id)?.category === 'primary'))).toBe(true);
    const m5 = mission(5);
    const thaw = m5.timers!.find((t) => t.id === 'wo5_thaw')!;
    const t = waitUntil(start(5), thaw.days + 1);
    expect(t.world.sites['wo5_gully']!.open).toBe(true);
    expect(t.mission.objectives['wo5_low_road']!.status).toBe('failed');
    expect(t.outcome.status).toBe('running');
  });

  it('Hrafn is fought at whichever rime-altar remains; the column and the reserves are finite', () => {
    const m5 = mission(5);
    const jokul = m5.sites.find((s) => s.id === 'wo5_jokul')!;
    if (jokul.kind.type !== 'map_event') throw new Error('jokul');
    expect(jokul.kind.options.map((o) => o.clearsSiteIds)).toEqual([['wo5_altar_w'], ['wo5_altar_e']]);
    // Defeating Hrafn needs a battle at an altar: an altar stood down by the giants gives no victory flag.
    for (const id of ['wo5_altar_w', 'wo5_altar_e']) expect(m5.sites.find((s) => s.id === id)!.guard!.reward.flags).toEqual(['wo5_hrafn_beaten']);
    expect(m5.objectives.find((o) => o.id === 'wo5_hrafn')!.condition).toEqual({ type: 'flag', flag: 'wo5_hrafn_beaten' });
    const column = m5.hostileHeroes.find((h) => h.commander.heroDefinitionId === 'wo5_column')!;
    expect(column.dormantUntilFlag).toBe('wo5_refuge_secured');
    expect(column.homeSiteId).toBe('wo5_muster');
    // Chapter 6: each stronghold keeps its own reserve, which it recalls when it falls.
    const m6 = mission(6);
    const reserves = m6.hostileHeroes.filter((h) => h.dormantUntilFlag === 'wo6_hall_open');
    expect(reserves.map((h) => h.homeSiteId).sort()).toEqual(['wo6_east_hold', 'wo6_north_hold', 'wo6_west_hold']);
    // The named prisoners of chapter 3 can break one stronghold without a battle.
    const witnesses = m6.sites.find((s) => s.id === 'wo6_witnesses')!;
    if (witnesses.kind.type !== 'map_event') throw new Error('witnesses');
    expect(witnesses.kind.options[0]!.requiresFlags).toEqual(['fact:wo3_prisoners']);
    expect(witnesses.kind.options[0]!.clearsSiteIds).toEqual(['wo6_west_hold']);
  });

  it('the epilogue follows the rite over a campaign painting that implies neither ending', () => {
    const camp = catalog.campaigns['winter_oath']!;
    expect(camp.epilogueV2?.art).toBe('mission.winter_oath.m01.briefing');
    expect(camp.epilogueV2?.art).not.toMatch(/^ending\./);
    const dispersed = text(campaignEpilogueV2Lines(camp, { wo_oath_dispersed: true }));
    const rebound = text(campaignEpilogueV2Lines(camp, { wo_oath_rebound: true }));
    expect(dispersed).toMatch(/The dead are free/);
    expect(dispersed).not.toMatch(/I only witness it/);
    expect(rebound).toMatch(/I only witness it/);
    expect(rebound).not.toMatch(/The dead are free/);
    // People returning, not a conquest banner, in either ending.
    for (const t of [dispersed, rebound]) expect(t).toMatch(/sledges are coming back/);
    // The final chapter's rite sets exactly these flags (both always open) and completes the campaign.
    const rite = mission(6).sites.find((s) => s.id === 'wo6_rite')!;
    if (rite.kind.type !== 'map_event') throw new Error('rite');
    expect(rite.kind.options.flatMap((o) => o.reward.flags ?? [])).toEqual(['wo_oath_dispersed', 'wo_oath_rebound']);
    expect(rite.kind.options.map((o) => o.requiresFlags)).toEqual([['wo6_jarl_down'], ['wo6_jarl_down']]);
    expect(mission(6).objectives.find((o) => o.id === 'wo6_sword')?.completesMission).toBe(true);
  });
});
