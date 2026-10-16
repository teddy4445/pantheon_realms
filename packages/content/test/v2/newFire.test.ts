/**
 * The New Fire, content v2 (handoff 2026-10-15; review cards 33–37): five
 * chapters carrying the seven legacy chapters, played 1 → 2 → {3, 4} → 5.
 * Chapters 3 and 4 read each other's facts only in dialogue, so neither order
 * names what has not happened; earlier choices give bounded entry bonuses;
 * Tecuani's deliveries are capped; the eruption begins only with the release;
 * the renewal's schedule is posted before launch; the final choice picks the
 * epilogue variant.
 */
import { describe, expect, it } from 'vitest';
import { createMissionMatch } from '@pr/campaign';
import { campaignEpilogueV2Lines, edgeKey, hexKey, missionBriefingLines, processCommand, type GameCommand, type MatchState, type MissionDefinition } from '@pr/rules';
import { buildNewFireV2 } from '../../src/campaign/v2/newFireV2';
import { catalogWith } from './harness';
import { checkV2Missions } from './checks';
import missionContent from '../../../../docs/campaign-v2/design/mission-content.json';
import campaignGraph from '../../../../docs/campaign-v2/design/campaign-graph.json';

const { catalog, built, issues } = catalogWith('new_fire', 'mesoamerican', buildNewFireV2);
const mission = (n: number) => catalog.missions[`new_fire_v2_m0${n}`]!;
const start = (n: number, facts: string[] = []) => createMissionMatch(catalog, `new_fire_v2_m0${n}`, { matchId: `nf-${n}-${facts.join('+') || 'plain'}`, facts }).match;
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
const cards = (missionContent as readonly Card[]).filter((c) => c.campaign === 'new_fire');
const graph = (campaignGraph as readonly { campaignId: string; nodes: { id: string; requiresAll: string[] }[] }[]).find((g) => g.campaignId === 'new_fire')!;

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

const endTurn = (state: MatchState): MatchState => {
  const r = processCommand({ catalog }, state, { kind: 'EndTurn', commandId: `nf-end-${state.revision}`, expectedRevision: state.revision, actorPlayerId: state.activePlayerId } as GameCommand);
  if (!r.ok) throw new Error(r.rejection.message);
  return r.state;
};
const untilDay = (state: MatchState, day: number): MatchState => {
  let s = state;
  for (let i = 0; i < 200 && s.day < day && s.outcome.status === 'running'; i++) s = endTurn(s);
  return s;
};

describe('The New Fire v2', () => {
  it('validates, follows the chapter graph and carries every legacy chapter exactly once (as the cards say)', () => {
    expect(issues.filter((i) => i.includes('new_fire'))).toEqual([]);
    expect(built.missions.map((m) => m.id)).toEqual(cards.map((c) => c.proposedMissionId));
    for (const card of cards) {
      const ch = built.chapters.find((c) => c.missionId === card.proposedMissionId)!;
      expect(ch.legacyMissionIds, card.proposedMissionId).toEqual(card.legacyMissionIds);
      expect(ch.requiresAll, card.proposedMissionId).toEqual(card.requiresAll);
      expect(ch.requiresAll, card.proposedMissionId).toEqual(graph.nodes.find((n) => n.id === card.proposedMissionId)!.requiresAll);
      expect(ch.briefingArt, card.proposedMissionId).toEqual(card.briefingArt.map((a) => a.replace(/^art\/missions\//, '').replace(/\.webp$/, '')));
    }
    // Card 33 carries m01+m02, card 34 m03+m04, then m05, m06 and m07 one each.
    expect(built.chapters.map((c) => c.legacyMissionIds)).toEqual([['new_fire_m01', 'new_fire_m02'], ['new_fire_m03', 'new_fire_m04'], ['new_fire_m05'], ['new_fire_m06'], ['new_fire_m07']]);
    const legacy = built.chapters.flatMap((c) => c.legacyMissionIds);
    expect([...legacy].sort()).toEqual(['new_fire_m01', 'new_fire_m02', 'new_fire_m03', 'new_fire_m04', 'new_fire_m05', 'new_fire_m06', 'new_fire_m07']);
    expect(new Set(legacy).size).toBe(7);
    // 1 → 2 → {3, 4} → 5.
    expect(built.chapters.map((c) => c.requiresAll)).toEqual([[], ['new_fire_v2_m01'], ['new_fire_v2_m02'], ['new_fire_v2_m02'], ['new_fire_v2_m03', 'new_fire_v2_m04']]);
    expect(catalog.campaigns['new_fire']!.finalChapterId).toBe('new_fire_v2_m05');
    checkV2Missions(catalog, built.missions);
  });

  it('region maps sized as the cards say, every one a jungle map with its own town', () => {
    const size = (m: MissionDefinition) => ({ cols: m.map!.width - Math.floor((m.map!.height - 1) / 2), rows: m.map!.height });
    // Medium ≈ 30–36 × 18–22; card 34 is medium/large; card 37 large ≈ 38–44 × 22–26.
    const bands: Record<number, [number, number, number, number]> = { 1: [30, 36, 18, 22], 2: [32, 40, 20, 24], 3: [30, 36, 18, 22], 4: [30, 36, 18, 22], 5: [38, 44, 22, 26] };
    for (let n = 1; n <= 5; n++) {
      const m = mission(n);
      const { cols, rows } = size(m);
      const [c0, c1, r0, r1] = bands[n]!;
      expect(cols >= c0 && cols <= c1 && rows >= r0 && rows <= r1, `${m.id}: ${cols} x ${rows}`).toBe(true);
      expect(m.map!.biome).toBe('jungle');
    }
    expect([1, 2, 3, 4, 5].map((n) => mission(n).player.town.townId)).toEqual(['xochitla', 'ocelotepec', 'tonalco', 'quetzaltepec', 'tlapallan']);
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
      }
      for (const t of m.timers ?? []) for (const id of t.onExpire.failObjectives ?? []) expect(m.objectives.find((o) => o.id === id)?.category).toBe('optional');
      expect(m.objectives.some((o) => o.completesMission) || m.sites.some((s) => s.kind.type === 'activation' && s.kind.completesMission), `${m.id}: ends through an objective or activation`).toBe(true);
      for (const f of m.carriedFlags ?? []) expect(flags.has(f), `${m.id}: carries ${f}, which nothing sets`).toBe(true);
      // Battles are fought by hand: no text offers a quick or automatic battle.
      const all = JSON.stringify([m.objectives, m.sites.map((s) => [s.name, s.description, s.kind]), m.helpTopics.filter((h) => h.id !== 'manual_battles'), m.briefing, m.storyScenes]);
      expect(all, m.id).not.toMatch(/quick battle|auto-?combat|auto-?battle|auto-?resolve/i);
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

  it('Itzcalli and the Fire Mountain are coherent in both orders, and neither needs the other’s reward (cards 35 and 36)', () => {
    // Itzcalli first: the mountain is still Mazatl's; after the mountain, the serpents fly over the lake.
    const plain3 = briefing(3);
    expect(plain3).toMatch(/Mazatl still holds the fire mountain/);
    expect(plain3).not.toMatch(/serpents fly|workshops|extraction works|Mazatl is (down|beaten)/);
    const after4 = briefing(3, ['nf4_mazatl_down', 'nf4_released', 'nf4_dismantled']);
    expect(after4).toMatch(/fire serpents fly over the lake/);
    expect(after4).toMatch(/extraction works are rubble/);
    expect(after4).not.toMatch(/Mazatl still holds/);
    expect(briefing(3, ['nf4_mazatl_down', 'nf4_workshops_saved'])).toMatch(/workshops still stand/);
    // The mountain first: Tecuani still holds the lake; after Itzcalli, his outcome is named — the right one.
    const plain4 = briefing(4);
    expect(plain4).toMatch(/Tecuani still holds Itzcalli/);
    expect(plain4).not.toMatch(/surrender|field army|siege|granaries/);
    expect(briefing(4, ['nf3_contracts', 'nf3_surrender'])).toMatch(/Tecuani surrendered/);
    expect(briefing(4, ['nf3_contracts', 'nf3_surrender'])).not.toMatch(/still holds Itzcalli|field army is broken/);
    expect(briefing(4, ['nf3_contracts', 'nf3_field_broken'])).toMatch(/field army is broken/);
    expect(briefing(4, ['nf3_contracts', 'nf3_city_taken'])).toMatch(/fell to a siege/);
    // Scenes are order-aware the same way: chapter 3 never names the mountain's outcome without its fact.
    for (const s of mission(3).storyScenes ?? []) if (!(s.ifFlags ?? []).some((f) => f.startsWith('fact:nf4_'))) expect(text(s.lines)).not.toMatch(/serpents fly|Mazatl is/);
    for (const s of mission(4).storyScenes ?? []) if (!(s.ifFlags ?? []).some((f) => f.startsWith('fact:nf3_'))) expect(text(s.lines)).not.toMatch(/surrender|Itzcalli/);
    // Neither chapter grants anything for the other's choices (dialogue only).
    expect((mission(3).entryBonuses ?? []).filter((b) => b.fact.startsWith('nf4_'))).toEqual([]);
    expect((mission(4).entryBonuses ?? []).filter((b) => b.fact.startsWith('nf3_'))).toEqual([]);
    expect(mission(3).carriedFlags).toEqual(expect.arrayContaining(['nf3_surrender', 'nf3_field_broken', 'nf3_city_taken', 'nf3_contracts', 'nf3_central_store', 'nf3_distributed']));
    expect(mission(4).carriedFlags).toEqual(expect.arrayContaining(['nf4_mazatl_down', 'nf4_workshops_saved', 'nf4_dismantled']));
  });

  it('earlier choices give bounded entry bonuses, and the briefing says so only then', () => {
    const gold = (n: number, s: MatchState) => s.players[mission(n).player.playerId]!.wallet.gold;
    const wallet = (n: number, s: MatchState) => s.players[mission(n).player.playerId]!.wallet;
    const heroCount = (s: MatchState, creatureId: string) => s.heroes['itzel']!.army.slots.reduce((n, x) => n + (x?.creatureId === creatureId ? x.count : 0), 0);
    const garrison = (s: MatchState, townId: string, creatureId: string) => s.towns[townId]!.garrison.slots.reduce((n, x) => n + (x?.creatureId === creatureId ? x.count : 0), 0);
    // Chapter 2: the first provisions of chapter 1 (growers or watch posts) and the saved shipment.
    const plain2 = start(2);
    expect(gold(2, start(2, ['nf1_growers'])) - gold(2, plain2)).toBe(1500);
    expect(garrison(start(2, ['nf1_watchposts']), 'ocelotepec', 'mesoamerican_jaguar_spirit') - garrison(plain2, 'ocelotepec', 'mesoamerican_jaguar_spirit')).toBe(10);
    expect(wallet(2, start(2, ['nf1_cargo_saved'])).crystal - wallet(2, plain2).crystal).toBe(3);
    expect(briefing(2)).not.toMatch(/growers|watch posts|embers came/);
    expect(briefing(2, ['nf1_growers'])).toMatch(/cacao growers/);
    // Chapter 3: one limited bonus against Tecuani from the calendar choice.
    const plain3 = start(3);
    expect(gold(3, start(3, ['nf2_published'])) - gold(3, plain3)).toBe(2000);
    expect(heroCount(start(3, ['nf2_keepers_pact']), 'mesoamerican_solar_eagle_warrior') - heroCount(plain3, 'mesoamerican_solar_eagle_warrior')).toBe(4);
    expect(briefing(3)).not.toMatch(/eagle calendar|eagle keepers kept/);
    // Chapter 5: the stores of Itzcalli, the workshops of the mountain and Tecuani's surrender.
    const plain5 = start(5);
    expect(gold(5, start(5, ['nf3_central_store'])) - gold(5, plain5)).toBe(2000);
    expect(garrison(start(5, ['nf3_distributed']), 'tlapallan', 'mesoamerican_celestial_feathered_serpent') - garrison(plain5, 'tlapallan', 'mesoamerican_celestial_feathered_serpent')).toBe(12);
    expect(wallet(5, start(5, ['nf4_workshops_saved'])).stone - wallet(5, plain5).stone).toBe(6);
    expect(heroCount(start(5, ['nf4_dismantled']), 'mesoamerican_xiuhcoatl') - heroCount(plain5, 'mesoamerican_xiuhcoatl')).toBe(2);
    expect(garrison(start(5, ['nf3_surrender']), 'tlapallan', 'mesoamerican_celestial_feathered_serpent') - garrison(plain5, 'tlapallan', 'mesoamerican_celestial_feathered_serpent')).toBe(10);
    // Neither stores choice removes final supplies: both give the last chapter something.
    const stores = mission(5).entryBonuses!.map((b) => b.fact);
    expect(stores).toEqual(expect.arrayContaining(['nf3_central_store', 'nf3_distributed', 'nf4_workshops_saved', 'nf4_dismantled']));
    for (const m of built.missions) expect((m.entryBonuses ?? []).length).toBeLessThanOrEqual(6);
    expect(mission(1).entryBonuses ?? []).toEqual([]);
  });

  it('the ember shipment deadline costs only the bonus cargo (card 33)', () => {
    const m1 = mission(1);
    const seizure = m1.timers!.find((t) => t.id === 'nf1_seizure')!;
    const s = untilDay(start(1), seizure.days + 2);
    expect(s.mission.flags['nf1_cargo_seized']).toBe(true);
    expect(s.mission.objectives['nf1_cargo']!.status).toBe('failed');
    for (const o of m1.objectives.filter((x) => x.category === 'primary')) expect(s.mission.objectives[o.id]!.status).not.toBe('failed');
    expect(s.outcome.status).toBe('running');
    // The ahuitzotl pact opens only once the cenote's water is protected; the boars are always for hire.
    const cenote = m1.sites.find((x) => x.id === 'nf1_cenote')!;
    expect(cenote.kind.type === 'creature_camp' && cenote.kind.creatureId === 'ahuitzotl' && cenote.kind.requiresFlag).toBe('nf1_spring_warded');
    const wallow = m1.sites.find((x) => x.id === 'nf1_wallow')!;
    expect(wallow.kind.type === 'creature_camp' && wallow.kind.creatureId === 'wild_boar' && !wallow.kind.requiresFlag).toBe(true);
  });

  it('Tecuani’s deliveries are posted, capped at two, delayed by a captured depot and never end the chapter (card 35)', () => {
    const m3 = mission(3);
    const levies = m3.hostileHeroes.filter((h) => h.dormantUntilFlag);
    expect(levies.map((h) => h.dormantUntilFlag).sort()).toEqual(['nf3_delivery_1', 'nf3_delivery_2']);
    expect(levies.map((h) => h.homeSiteId).sort()).toEqual(['nf3_reed_depot', 'nf3_stone_depot']);
    // Only the deliveries' flags, never a failed primary objective.
    for (const t of m3.timers ?? []) {
      expect(t.onExpire.failObjectives ?? []).toEqual([]);
      for (const f of t.onExpire.flags ?? []) expect(['nf3_delivery_1', 'nf3_delivery_2']).toContain(f);
    }
    expect(m3.timers!.find((t) => t.id === 'nf3_d1')!.announce).toMatch(/two convoys, no more/);
    // Untouched, both deliveries arrive (days 9 and 16) and the chapter goes on.
    let s = untilDay(start(3), 9);
    expect(s.mission.flags['nf3_delivery_1']).toBe(true);
    s = untilDay(s, 17);
    expect(s.mission.flags['nf3_delivery_2']).toBe(true);
    expect(s.outcome.status).toBe('running');
    for (const o of m3.objectives.filter((x) => x.category === 'primary')) expect(s.mission.objectives[o.id]!.status).not.toBe('failed');
    // A depot taken on day 1 holds the first delivery up and disperses the levy loading there.
    const s0 = start(3, []);
    const taken: MatchState = { ...s0, world: { ...s0.world, sites: { ...s0.world.sites, nf3_stone_depot: { ...s0.world.sites['nf3_stone_depot']!, cleared: true, guard: null } } } };
    let h = untilDay(endTurn(taken), 9);
    expect(h.mission.flags['nf3_delivery_1']).toBeFalsy();
    expect(Object.values(h.heroes).find((x) => x.definitionId === 'nf3_levy_first')!.status).not.toBe('active');
    h = untilDay(h, 11);
    expect(h.mission.flags['nf3_delivery_1']).toBe(true);
    // The surrender is an authored resolution: contracts and exposed hoarding, and the field army stands down.
    const audience = m3.sites.find((x) => x.id === 'nf3_audience')!;
    if (audience.kind.type !== 'map_event') throw new Error('audience');
    expect(audience.kind.options[0]!.requiresFlags).toEqual(['nf3_contracts', 'nf3_hoarding']);
    expect(audience.kind.options[0]!.clearsSiteIds).toEqual(['nf3_field_army']);
    const finish = m3.objectives.find((o) => o.id === 'nf3_monopoly')!;
    expect(finish.completesMission).toBe(true);
    expect(JSON.stringify(finish.condition)).toMatch(/nf3_surrender.*nf3_field_broken.*itzcalli/);
  });

  it('the eruption begins only with the release; it closes only the lava tube and opens the cooled flow (card 36)', () => {
    const m4 = mission(4);
    for (const t of m4.timers ?? []) expect(JSON.stringify(t.startWhen)).toContain('nf4_release_open');
    // Days pass without a release: no eruption, no counterattack.
    let s = untilDay(start(4), 6);
    expect(s.mission.timers?.['nf4_eruption']?.status ?? 'waiting').toBe('waiting');
    expect(s.mission.flags['nf4_counterattack']).toBeFalsy();
    // Start the release: Mazatl beaten at the gate, Itzel at the chains, the jailers beaten.
    const chains = m4.sites.find((x) => x.id === 'nf4_chains')!;
    if (chains.kind.type !== 'sluice') throw new Error('chains');
    const sites = { ...s.world.sites, nf4_crater_gate: { ...s.world.sites['nf4_crater_gate']!, cleared: true, guard: null }, nf4_chains: { ...s.world.sites['nf4_chains']!, cleared: true, guard: null } };
    s = { ...s, activePlayerId: m4.player.playerId, heroes: { ...s.heroes, itzel: { ...s.heroes['itzel']!, position: chains.coord } }, world: { ...s.world, sites } };
    const r = processCommand({ catalog }, s, { kind: 'OperateSluice', heroId: 'itzel', siteId: 'nf4_chains', commandId: 'nf4-release', expectedRevision: s.revision, actorPlayerId: m4.player.playerId } as GameCommand);
    if (!r.ok) throw new Error(r.rejection.message);
    const after = r.state;
    const map = after.world.map;
    for (const c of chains.kind.channel) expect(map.terrain[c.r * map.width + c.q]).toBe('m');
    expect(after.world.sites['nf4_cooled_flow']!.open).toBe(true);
    expect(after.mission.timers?.['nf4_eruption']?.status).toBe('running');
    expect(after.mission.objectives['nf4_release']!.status).toBe('completed');
    // The lava closes only the optional tube: no road runs through it, and the basin stays reachable by the outer road.
    const roadCells = new Set(m4.map!.roads.flatMap((k) => k.split('|')));
    for (const c of chains.kind.channel) expect(roadCells.has(hexKey(c))).toBe(false);
    void edgeKey;
    // One counterattack, on the announced day, from the reserve the ravine works feed.
    const ash = m4.hostileHeroes.find((h) => h.dormantUntilFlag === 'nf4_counterattack')!;
    expect(ash.homeSiteId).toBe('nf4_ravine_works');
    const later = untilDay(after, after.day + 3);
    expect(later.mission.flags['nf4_counterattack']).toBe(true);
    expect(later.outcome.status).toBe('running');
    // Both workshop choices need the works broken, and neither touches the release.
    const ws = m4.sites.find((x) => x.id === 'nf4_workshops')!;
    if (ws.kind.type !== 'map_event') throw new Error('workshops');
    expect(ws.kind.options.flatMap((o) => o.reward.flags ?? [])).toEqual(['nf4_workshops_saved', 'nf4_dismantled']);
    // No ahuitzotl on the mountain; clay men at the cooled quarry.
    expect(m4.sites.some((x) => x.kind.type === 'creature_camp' && x.kind.creatureId === 'ahuitzotl')).toBe(false);
    expect(m4.sites.some((x) => x.kind.type === 'creature_camp' && x.kind.creatureId === 'clay_golem')).toBe(true);
  });

  it('the renewal’s schedule is posted before launch, after the plan, with no hidden deadline (card 37)', () => {
    const m5 = mission(5);
    for (const t of m5.timers ?? []) expect(t.startWhen.type, t.id).toBe('flag');
    const ritual = m5.timers!.find((t) => t.id === 'nf5_ritual')!;
    expect(ritual.announce).toMatch(/two days/);
    expect(JSON.stringify(ritual.startWhen)).toContain('nf5_renewal_launched');
    const altar = m5.sites.find((x) => x.id === 'nf5_altar')!;
    if (altar.kind.type !== 'activation') throw new Error('altar');
    expect(altar.kind.requirements).toContainEqual({ type: 'objective_completed', objectiveId: 'nf5_plan' });
    expect(altar.kind.confirmText).toMatch(/two days/);
    // Exploration has no deadline: weeks pass and nothing starts or fails.
    const s = untilDay(start(5), 15);
    expect(Object.values(s.mission.timers ?? {}).every((t) => t.status === 'waiting')).toBe(true);
    expect(Object.values(s.mission.objectives).some((o) => o.status === 'failed')).toBe(false);
    // Three of four hearths, each with a different support; none opens another site.
    const hearths = m5.sites.filter((x) => x.id.startsWith('nf5_hearth_'));
    expect(hearths.length).toBe(4);
    const supports = hearths.map((h) => (h.kind.type === 'activation' ? JSON.stringify({ ...h.kind.reward, flags: [] }) : ''));
    expect(new Set(supports).size).toBe(4);
    const gateFlags = m5.sites.flatMap((x) => (x.kind.type === 'gate' ? x.kind.openWhenFlags : []));
    for (const h of hearths) if (h.kind.type === 'activation') for (const f of h.kind.reward.flags ?? []) expect(gateFlags).not.toContain(f);
    // The last caravan: one limited purchase, the ahuitzotl among them.
    const caravan = m5.sites.find((x) => x.id === 'nf5_caravan')!;
    expect(caravan.kind.type === 'map_event' && caravan.kind.options.some((o) => o.reward.creatures?.some((c) => c.creatureId === 'ahuitzotl'))).toBe(true);
  });

  it('the ahuitzotl appear where the cards put them, always optional', () => {
    const ahuitzotlSites = (m: MissionDefinition) => m.sites.filter((x) => x.kind.type === 'creature_camp' && x.kind.creatureId === 'ahuitzotl');
    expect([1, 2, 3, 4, 5].map((n) => ahuitzotlSites(mission(n)).length)).toEqual([1, 1, 1, 0, 0]);
    for (const m of built.missions) {
      for (const site of ahuitzotlSites(m)) {
        for (const o of m.objectives.filter((x) => x.category === 'primary')) expect(JSON.stringify(o.condition)).not.toContain(site.id);
      }
    }
  });

  it('the epilogue follows the final choice over the campaign cover, with only uncertain reports of other lands', () => {
    const camp = catalog.campaigns['new_fire']!;
    expect(camp.epilogueV2?.art).toBe('campaign.new_fire.cover');
    const local = text(campaignEpilogueV2Lines(camp, { nf_fire_local: true }));
    const central = text(campaignEpilogueV2Lines(camp, { nf_fire_central: true }));
    expect(local).toMatch(/keeps its own fire/);
    expect(local).not.toMatch(/One great hearth/);
    expect(central).toMatch(/One great hearth/);
    expect(central).not.toMatch(/keeps its own fire/);
    // The chronicle mentions other lands only as merchants' stories: no campaign, hero or decision named.
    expect(local).toMatch(/Merchants always bring stories/);
    expect(local + central).not.toMatch(/Alexios|Oracle|Melas|Theron|Asterion|Winter Oath|Kalliste/);
    // The final chapter's choice sets exactly these flags; the renewal completes the campaign.
    const fire = mission(5).sites.find((s) => s.id === 'nf5_old_fire')!;
    if (fire.kind.type !== 'map_event') throw new Error('old fire');
    expect(fire.kind.options.flatMap((o) => o.reward.flags ?? [])).toEqual(['nf_fire_local', 'nf_fire_central']);
    expect(mission(5).objectives.find((o) => o.id === 'nf5_renewal')?.completesMission).toBe(true);
    expect(mission(5).objectives.find((o) => o.id === 'nf5_launch')?.requires).toContain('nf5_plan');
    // The finale shows how earlier district promises affect trust.
    const trust = (mission(5).storyScenes ?? []).filter((s) => s.trigger.type === 'flag' && ['nf_fire_local', 'nf_fire_central'].includes(s.trigger.flag));
    expect(trust.map((s) => s.ifFlags).flat().sort()).toEqual(['fact:nf3_central_store', 'fact:nf3_central_store', 'fact:nf3_distributed', 'fact:nf3_distributed']);
  });
});
