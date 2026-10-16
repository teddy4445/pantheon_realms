/**
 * The Lantern Road, content v2 (handoff 2026-10-15; review cards 21–26): six
 * chapters carrying the seven legacy chapters, played 1 → 2 → {3, 4} → 5 → 6.
 * The Spirit Sea and the Iron Daimyo read each other's facts so that neither
 * order names an investigation that has not happened; earlier choices give
 * bounded entry bonuses; the final choice picks the epilogue variant.
 */
import { describe, expect, it } from 'vitest';
import { createMissionMatch } from '@pr/campaign';
import { campaignEpilogueV2Lines, hexKey, missionBriefingLines, processCommand, type GameCommand, type MatchState, type MissionDefinition } from '@pr/rules';
import { buildLanternRoadV2 } from '../../src/campaign/v2/lanternRoadV2';
import { mapGraph, reachableFrom } from '../../src/campaign/v2/regionMap';
import { catalogWith } from './harness';
import { blockers, checkV2Missions, gateOf, withSluices } from './checks';
import missionContent from '../../../../docs/campaign-v2/design/mission-content.json';
import campaignGraph from '../../../../docs/campaign-v2/design/campaign-graph.json';

const { catalog, built, issues } = catalogWith('lantern_road', 'japanese', buildLanternRoadV2);
const mission = (n: number) => catalog.missions[`lantern_road_v2_m0${n}`]!;
const start = (n: number, facts: string[] = []) => createMissionMatch(catalog, `lantern_road_v2_m0${n}`, { matchId: `lr-${n}-${facts.join('+') || 'plain'}`, facts }).match;
const text = (lines: readonly { text: string }[]) => lines.map((l) => l.text).join(' ');
const briefing = (n: number, facts: string[] = []) => text(missionBriefingLines(mission(n), start(n, facts).mission.flags));

interface Card {
  readonly n: number;
  readonly campaign: string;
  readonly proposedMissionId: string;
  readonly requiresAll: readonly string[];
  readonly legacyMissionIds: readonly string[];
  readonly briefingArt: readonly string[];
}
const cards = (missionContent as readonly Card[]).filter((c) => c.campaign === 'lantern_road');
const graph = (campaignGraph as readonly { campaignId: string; nodes: { id: string; requiresAll: string[] }[] }[]).find((g) => g.campaignId === 'lantern_road')!;

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

/** End turns (every player in turn) until `day` has begun. */
function endTurnsUntil(s0: MatchState, day: number): MatchState {
  let s = s0;
  const command = (state: MatchState, actor: string): GameCommand => ({ kind: 'EndTurn', commandId: `lr-end-${state.revision}`, expectedRevision: state.revision, actorPlayerId: actor }) as GameCommand;
  for (let i = 0; i < 200 && s.day < day; i++) {
    const r = processCommand({ catalog }, s, command(s, s.activePlayerId));
    if (!r.ok) throw new Error(r.rejection.message);
    s = r.state;
  }
  return s;
}

const heroCount = (s: MatchState, creatureId: string) => s.heroes['akane']!.army.slots.reduce((n, x) => n + (x?.creatureId === creatureId ? x.count : 0), 0);
const garrison = (s: MatchState, townId: string, creatureId: string) => s.towns[townId]!.garrison.slots.reduce((n, x) => n + (x?.creatureId === creatureId ? x.count : 0), 0);
const wallet = (s: MatchState, n: number) => s.players[mission(n).player.playerId]!.wallet;

describe('The Lantern Road v2', () => {
  it('validates, follows the chapter graph and carries every legacy chapter exactly once (as the cards say)', () => {
    expect(issues.filter((i) => i.includes('lantern_road'))).toEqual([]);
    expect(built.missions.map((m) => m.id)).toEqual(cards.map((c) => c.proposedMissionId));
    for (const card of cards) {
      const ch = built.chapters.find((c) => c.missionId === card.proposedMissionId)!;
      expect(ch.legacyMissionIds, card.proposedMissionId).toEqual(card.legacyMissionIds);
      expect(ch.requiresAll, card.proposedMissionId).toEqual(card.requiresAll);
      expect(ch.requiresAll, card.proposedMissionId).toEqual(graph.nodes.find((n) => n.id === card.proposedMissionId)!.requiresAll);
      expect(ch.briefingArt, card.proposedMissionId).toEqual(card.briefingArt.map((a) => a.replace(/^art\/missions\//, '').replace(/\.webp$/, '')));
    }
    const legacy = built.chapters.flatMap((c) => c.legacyMissionIds);
    expect([...legacy].sort()).toEqual(['lantern_road_m01', 'lantern_road_m02', 'lantern_road_m03', 'lantern_road_m04', 'lantern_road_m05', 'lantern_road_m06', 'lantern_road_m07']);
    expect(new Set(legacy).size).toBe(7);
    // Chapter 2 carries two legacy chapters (the Boar Lord and the Crow Monastery); the others one each.
    expect(built.chapters.map((c) => c.legacyMissionIds.length)).toEqual([1, 2, 1, 1, 1, 1]);
    expect(catalog.campaigns['lantern_road']!.finalChapterId).toBe('lantern_road_v2_m06');
    checkV2Missions(catalog, built.missions);
  });

  it('every chapter has a shortcut opened through play, finite signalled pressure and deadlines that cost only optional objectives', () => {
    for (const m of built.missions) {
      const flags = settableFlags(m);
      const gates = m.sites.filter((s) => s.kind.type === 'gate');
      expect(gates.length, `${m.id}: a shortcut`).toBeGreaterThan(0);
      for (const g of gates) for (const f of g.kind.type === 'gate' ? g.kind.openWhenFlags : []) expect(flags.has(f), `${m.id}/${g.id}: nothing sets ${f}`).toBe(true);
      // At least one shortcut opens through this chapter's own play (not only through an earlier choice).
      const fromPlay = gates.filter((g) => g.kind.type === 'gate' && g.kind.openWhenFlags.every((f) => !(m.entryBonuses ?? []).some((b) => b.flags?.includes(f))));
      expect(fromPlay.length, `${m.id}: a shortcut opened through play`).toBeGreaterThan(0);
      for (const h of m.hostileHeroes) {
        expect(h.homeSiteId || h.dormantUntilFlag, `${m.id}: ${h.commander.name} needs a home camp or an announced trigger`).toBeTruthy();
        if (h.dormantUntilFlag) expect(flags.has(h.dormantUntilFlag), `${m.id}: nothing wakes ${h.commander.name}`).toBe(true);
      }
      for (const t of m.timers ?? []) for (const id of t.onExpire.failObjectives ?? []) expect(m.objectives.find((o) => o.id === id)?.category).toBe('optional');
      expect(m.objectives.some((o) => o.completesMission) || m.sites.some((s) => s.kind.type === 'activation' && s.kind.completesMission), `${m.id}: ends through an objective or activation`).toBe(true);
      for (const f of m.carriedFlags ?? []) expect(flags.has(f), `${m.id}: carries ${f}, which nothing sets`).toBe(true);
      // Battles are fought by hand: no text offers an automatic resolution.
      const texts = [...m.objectives.map((o) => o.description), ...m.helpTopics.filter((h) => h.id !== 'manual_battles').map((h) => h.text), m.summary];
      for (const t of texts) expect(t, m.id).not.toMatch(/auto[- ]?(battle|combat|resolve)|quick battle/i);
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

  it('the Spirit Sea and the Iron Daimyo are coherent in both orders (cards 23 and 24)', () => {
    const m3 = mission(3);
    const m4 = mission(4);
    expect(m3.carriedFlags).toEqual(expect.arrayContaining(['lr3_mirrors_seen', 'lr3_two_registers', 'lr3_registers_returned', 'lr3_names_published']));
    expect(m4.carriedFlags).toEqual(expect.arrayContaining(['lr4_kurogane_down', 'lr4_workshops_kept', 'lr4_foundry_dismantled']));
    // The Spirit Sea first: nobody says the Lantern of Oaths is out; after the Iron Daimyo, Shiro does.
    expect(briefing(3)).not.toMatch(/Lantern of Oaths|went out/);
    expect(briefing(3)).toMatch(/Kurogane’s contract/);
    expect(briefing(3, ['lr4_kurogane_down'])).toMatch(/Lantern of Oaths went out/);
    expect(briefing(3, ['lr4_kurogane_down'])).not.toMatch(/Kurogane’s contract named a buyer/);
    const mirrorScenes = (m3.storyScenes ?? []).filter((s) => s.trigger.type === 'flag' && s.trigger.flag === 'lr3_mirrors_seen');
    expect(mirrorScenes.map((s) => [s.ifFlags ?? [], s.unlessFlags ?? []])).toEqual([[['fact:lr4_kurogane_down'], []], [[], ['fact:lr4_kurogane_down']]]);
    // The Iron Daimyo first: nobody names the Hall of Mirrors or Gonryō's registers; after the Spirit Sea, Akane does.
    expect(briefing(4)).not.toMatch(/Hall of Mirrors|Gonryō|registers/);
    expect(briefing(4, ['lr3_mirrors_seen'])).toMatch(/Hall of Mirrors/);
    expect(briefing(4, ['lr3_mirrors_seen', 'lr3_names_published'])).toMatch(/Gonryō’s registers/);
    const barracks = (m4.storyScenes ?? []).filter((s) => s.trigger.type === 'site_cleared' && s.trigger.siteId === 'lr4_barracks');
    expect(barracks.map((s) => [s.ifFlags ?? [], s.unlessFlags ?? []])).toEqual([[['fact:lr3_two_registers'], []], [[], ['fact:lr3_two_registers']]]);
    for (const s of barracks) if (!s.ifFlags) expect(text(s.lines)).not.toMatch(/register|Gonryō/);
    // Published names weaken Kurogane only when the castle is still ahead: the rice-store ronin can be talked down.
    const riceGate = m4.sites.find((s) => s.id === 'lr4_rice_gate')!;
    if (riceGate.kind.type !== 'map_event') throw new Error('rice gate');
    expect(riceGate.kind.options[0]!.requiresFlags).toEqual(['lr4_names_read']);
    expect(riceGate.kind.options[0]!.clearsSiteIds).toEqual(['lr4_rice']);
    expect(start(4).mission.flags['lr4_names_read']).toBeFalsy();
    expect(start(4, ['lr3_names_published']).mission.flags['lr4_names_read']).toBe(true);
    // The Iron Daimyo first: the kept workshops fit out Shiogama's boats.
    expect(wallet(start(3, ['lr4_workshops_kept']), 3).wood - wallet(start(3), 3).wood).toBe(10);
  });

  it('earlier choices give bounded entry bonuses', () => {
    // Chapter 2: Yomogi's lantern lit for all.
    expect(wallet(start(2, ['lr1_lit_public']), 2).gold - wallet(start(2), 2).gold).toBe(1500);
    // Chapter 4: Yomogi's hidden route, the freed oni, the published names.
    const plain4 = start(4);
    expect(plain4.mission.flags['lr4_hidden_path']).toBeFalsy();
    expect(start(4, ['lr1_hidden_route']).mission.flags['lr4_hidden_path']).toBe(true);
    expect(heroCount(start(4, ['lr2_oni_freed']), 'japanese_oni') - heroCount(plain4, 'japanese_oni')).toBe(3);
    // Chapter 5: the tengu's word, the returned registers.
    const plain5 = start(5);
    expect(heroCount(start(5, ['lr2_tengu_pact']), 'japanese_great_tengu') - heroCount(plain5, 'japanese_great_tengu')).toBe(4);
    expect(heroCount(start(5, ['lr2_bell_seized']), 'japanese_great_tengu')).toBe(heroCount(plain5, 'japanese_great_tengu'));
    expect(wallet(start(5, ['lr3_registers_returned']), 5).gold - wallet(plain5, 5).gold).toBe(1500);
    // Chapter 6: the registers, the foundry, the border policy.
    const plain6 = start(6);
    expect(garrison(start(6, ['lr3_registers_returned']), 'hikari', 'japanese_river_elder_kappa') - garrison(plain6, 'hikari', 'japanese_river_elder_kappa')).toBe(10);
    expect(wallet(start(6, ['lr3_names_published']), 6).favor - wallet(plain6, 6).favor).toBe(10);
    expect(start(6, ['lr4_foundry_dismantled']).mission.flags['lr6_safe_road']).toBe(true);
    expect(start(6, ['lr4_workshops_kept']).mission.flags['lr6_smiths']).toBe(true);
    expect(garrison(start(6, ['lr5_narrow_crossing']), 'hikari', 'japanese_celestial_kirin') - garrison(plain6, 'hikari', 'japanese_celestial_kirin')).toBe(2);
    expect(wallet(start(6, ['lr5_local_paths']), 6).gold - wallet(plain6, 6).gold).toBe(3000);
    for (const m of built.missions) expect((m.entryBonuses ?? []).length).toBeLessThanOrEqual(6);
  });

  it('the collectors’ round costs only Yomogi’s bonus store (card 21)', () => {
    const m1 = mission(1);
    const round = m1.timers!.find((t) => t.id === 'lr1_round')!;
    const s = endTurnsUntil(start(1), round.days + 2);
    expect(s.mission.flags['lr1_rice_taken']).toBe(true);
    expect(s.mission.objectives['lr1_full_rice']!.status).toBe('failed');
    for (const o of m1.objectives.filter((x) => x.category === 'primary')) expect(s.mission.objectives[o.id]!.status).not.toBe('failed');
    expect(s.outcome.status).toBe('running');
    // The patrol has a home camp that can be taken.
    expect(m1.hostileHeroes[0]!.homeSiteId).toBe('lr1_wagons');
  });

  it('the water gate changes only the low shortcut; the upper circuit stays open (card 22)', () => {
    const m2 = mission(2);
    const sluice = m2.sites.find((s) => s.kind.type === 'sluice')!;
    if (sluice.kind.type !== 'sluice') throw new Error('sluice');
    expect(sluice.kind.startsOpen).toBe(false);
    expect(sluice.kind.closedTerrain).toBe('water');
    const gate = gateOf(m2);
    const site = (id: string) => m2.sites.find((s) => s.id === id)!.coord;
    for (const open of [true, false]) {
      const reach = reachableFrom(mapGraph(withSluices(m2, open).map!, blockers(m2, [site('lr2_gate')])), gate);
      for (const id of ['lr2_west_stair', 'lr2_east_stair', 'lr2_gate']) expect(reach.has(hexKey(site(id))), `${id} with the gate ${open ? 'open' : 'closed'}`).toBe(true);
    }
    // The dike is the channel: under water while the gate is shut.
    const closed = withSluices(m2, false).map!;
    for (const c of sluice.kind.channel) expect(closed.rows[c.r]![c.q]).toBe('w');
    // Earned or seized, the essential evidence (Kurogane's contract) comes either way.
    const abbot = m2.sites.find((s) => s.id === 'lr2_abbot')!;
    const hall = m2.sites.find((s) => s.id === 'lr2_crow_hall')!;
    if (abbot.kind.type !== 'map_event') throw new Error('abbot');
    expect(abbot.kind.options[0]!.reward.flags).toEqual(expect.arrayContaining(['lr2_contract', 'lr2_bell_access']));
    expect(abbot.kind.options[0]!.clearsSiteIds).toEqual(['lr2_crow_hall']);
    expect(hall.guard!.reward.flags).toEqual(expect.arrayContaining(['lr2_contract', 'lr2_bell_access']));
  });

  it('the spring tide only ever opens the causeway (card 23)', () => {
    const m3 = mission(3);
    const tide = m3.timers!.find((t) => t.id === 'lr3_tide')!;
    expect(tide.onExpire.failObjectives ?? []).toEqual([]);
    const causeway = m3.sites.find((s) => s.id === 'lr3_causeway')!;
    expect(causeway.kind).toEqual({ type: 'gate', openWhenFlags: ['lr3_low_tide'] });
    const before = endTurnsUntil(start(3), tide.days);
    expect(before.mission.flags['lr3_low_tide']).toBeFalsy();
    expect(before.world.sites['lr3_causeway']?.open).toBeFalsy();
    // The ebb is announced from day 1 with its deadline; once the flag is set the gate opens with the next command and stays open.
    expect(before.mission.timers?.['lr3_tide']?.deadlineDay).toBe(1 + tide.days);
    const after = endTurnsUntil(before, tide.days + 3);
    expect(after.mission.flags['lr3_low_tide']).toBe(true);
    expect(after.world.sites['lr3_causeway']?.open).toBe(true);
  });

  it('the evacuation is a planned withdrawal: no forced battle, a late departure costs only the store (card 24)', () => {
    const m4 = mission(4);
    // Two safe camps, both unowned towns; the column waits until the announced day.
    expect((m4.neutralTowns ?? []).map((t) => t.townId)).toEqual(['tsurugi', 'kawabe']);
    for (const t of m4.neutralTowns ?? []) expect(t.garrison ?? []).toEqual([]);
    const column = m4.hostileHeroes.find((h) => h.commander.heroDefinitionId === 'lr4_column')!;
    expect(column.dormantUntilFlag).toBe('lr4_column_marches');
    expect(column.homeSiteId).toBe('lr4_barracks');
    const s = endTurnsUntil(start(4), 6);
    expect(s.mission.flags['lr4_column_marches']).toBe(true);
    expect(s.mission.objectives['lr4_store']!.status).toBe('failed');
    for (const o of m4.objectives.filter((x) => x.category === 'primary')) expect(s.mission.objectives[o.id]!.status).not.toBe('failed');
    expect(s.outcome.status).toBe('running');
    // The recapture comes once, after the first bond; the second threat needs a standing depot.
    expect(m4.hostileHeroes.find((h) => h.commander.heroDefinitionId === 'lr4_recapture')!.dormantUntilFlag).toBe('lr4_first_bond');
    expect(m4.hostileHeroes.filter((h) => h.dormantUntilFlag === 'lr4_second_bond').map((h) => h.homeSiteId)).toEqual(['lr4_depot_n', 'lr4_depot_w']);
  });

  it('the binding rite starts only when the rescue begins (card 25)', () => {
    const m5 = mission(5);
    const rite = m5.timers!.find((t) => t.id === 'lr5_rite')!;
    expect(rite.startWhen).toEqual({ type: 'flag', flag: 'lr5_rite_begun' });
    expect(rite.onExpire.failObjectives ?? []).toEqual([]);
    // Days pass without opening the pens: the rite never starts.
    const idle = endTurnsUntil(start(5), 8);
    expect(idle.mission.timers?.['lr5_rite']?.status ?? 'waiting').toBe('waiting');
    expect(idle.mission.flags['lr5_host_arrives']).toBeFalsy();
    // Only the pens' explicit choice sets the trigger, and only once the sanctuary and a corridor are ready.
    const pens = m5.sites.find((s) => s.id === 'lr5_pens')!;
    if (pens.kind.type !== 'map_event') throw new Error('pens');
    expect(pens.kind.options.map((o) => o.reward.flags)).toEqual([['lr5_rite_begun']]);
    expect(pens.kind.options[0]!.requiresFlags).toEqual(['lr5_sanctuary', 'lr5_corridor']);
    expect([...settableFlags(m5)].filter((f) => f === 'lr5_rite_begun')).toEqual(['lr5_rite_begun']);
    // Once begun, the deadline is saved and the host's haze opens three days later.
    const begun: MatchState = { ...idle, mission: { ...idle.mission, flags: { ...idle.mission.flags, lr5_rite_begun: true } } };
    const later = endTurnsUntil(begun, idle.day + rite.days + 2);
    expect(later.mission.timers?.['lr5_rite']?.status).toBe('expired');
    expect(later.mission.flags['lr5_host_arrives']).toBe(true);
    expect(later.outcome.status).toBe('running');
  });

  it('a dimmed district loses its reinforcements, never its progress (card 26)', () => {
    const m6 = mission(6);
    expect(m6.timers!.map((t) => t.id)).toEqual(['lr6_dimming_fox', 'lr6_dimming_minori', 'lr6_dimming_grave', 'lr6_dimming_kawa']);
    // Only the first district is named at the start; the next waits for it.
    expect(m6.timers![0]!.startWhen).toEqual({ type: 'all', conditions: [] });
    const s = endTurnsUntil(start(6), 9);
    expect(s.mission.flags['lr6_dim_fox']).toBe(true);
    expect(s.mission.objectives['lr6_reinf_fox']!.status).toBe('failed');
    expect(s.mission.timers?.['lr6_dimming_minori']?.status).toBe('running');
    expect(s.mission.timers?.['lr6_dimming_grave']?.status ?? 'waiting').toBe('waiting');
    for (const o of m6.objectives.filter((x) => x.category === 'primary')) expect(s.mission.objectives[o.id]!.status).not.toBe('failed');
    // The Fox Shrine's names can still be read after the dimming (no requirement on its activation).
    const fox = m6.sites.find((x) => x.id === 'lr6_fox')!;
    if (fox.kind.type !== 'activation') throw new Error('fox');
    expect(fox.kind.requirements).toEqual([]);
    // A safer spirit road (the foundry dismantled) spares the first district.
    const safe = endTurnsUntil(start(6, ['lr4_foundry_dismantled']), 9);
    expect(safe.mission.flags['lr6_dim_fox']).toBeFalsy();
    expect(safe.mission.timers?.['lr6_dimming_fox']?.status).toBe('met');
  });

  it('the epilogue follows the final choice over the campaign cover', () => {
    const camp = catalog.campaigns['lantern_road']!;
    expect(camp.epilogueV2?.art).toBe('campaign.lantern_road.cover');
    expect(text(campaignEpilogueV2Lines(camp, { lr_passages_supervised: true }))).toMatch(/open, every night of the year/);
    expect(text(campaignEpilogueV2Lines(camp, { lr_passages_supervised: true }))).toMatch(/first watch/);
    expect(text(campaignEpilogueV2Lines(camp, { lr_openings_seasonal: true }))).toMatch(/festival nights/);
    expect(text(campaignEpilogueV2Lines(camp, { lr_openings_seasonal: true }))).not.toMatch(/first watch/);
    const torii = mission(6).sites.find((s) => s.id === 'lr6_torii')!;
    if (torii.kind.type !== 'map_event') throw new Error('torii');
    expect(torii.kind.options.flatMap((o) => o.reward.flags ?? [])).toEqual(['lr_passages_supervised', 'lr_openings_seasonal']);
    expect(mission(6).objectives.find((o) => o.id === 'lr6_choice')?.completesMission).toBe(true);
  });
});
