/**
 * The Twelfth Hour, content v2 (handoff 2026-10-15; review cards 15–20): six
 * chapters carrying the seven legacy chapters, played 1 → {2, 3} → 4 → 5 → 6.
 * The farmland inquiry (2) and the library expedition (3) read each other's facts
 * so that neither order names an inquiry that has not happened; the canal lock
 * (chapter 1) and the Weir of Thoth (chapter 3) are sluices whose channel terrain
 * and open flag change together; earlier choices give bounded entry bonuses; the
 * calendar choice picks the epilogue variant.
 */
import { describe, expect, it } from 'vitest';
import { createMissionMatch } from '@pr/campaign';
import { campaignEpilogueV2Lines, campLockedReason, missionBriefingLines, processCommand, quoteActivation, type GameCommand, type HexCoord, type MatchState, type MissionDefinition } from '@pr/rules';
import { buildTwelfthHourV2 } from '../../src/campaign/v2/twelfthHourV2';
import { catalogWith } from './harness';
import { checkV2Missions } from './checks';
import missionContent from '../../../../docs/campaign-v2/design/mission-content.json';
import campaignGraph from '../../../../docs/campaign-v2/design/campaign-graph.json';

const { catalog, built, issues } = catalogWith('twelfth_hour', 'egyptian', buildTwelfthHourV2);
const mission = (n: number) => catalog.missions[`twelfth_hour_v2_m0${n}`]!;
const start = (n: number, facts: string[] = []) => createMissionMatch(catalog, `twelfth_hour_v2_m0${n}`, { matchId: `th-${n}-${facts.join('+') || 'plain'}`, facts }).match;
const text = (lines: readonly { text: string }[]) => lines.map((l) => l.text).join(' ');

interface Card {
  readonly n: number;
  readonly campaign: string;
  readonly proposedMissionId: string;
  readonly requiresAll: readonly string[];
  readonly legacyMissionIds: readonly string[];
  readonly briefingArt: readonly string[];
}
const cards = (missionContent as readonly Card[]).filter((c) => c.campaign === 'twelfth_hour');
const graph = (campaignGraph as readonly { campaignId: string; nodes: { id: string; requiresAll: string[] }[] }[]).find((g) => g.campaignId === 'twelfth_hour')!;

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

const terrainAt = (s: MatchState, c: HexCoord) => s.world.map.terrain[c.r * s.world.map.width + c.q];
const command = (s: MatchState, payload: Record<string, unknown>): GameCommand => ({ ...payload, commandId: `th-test-${s.revision}-${String(payload.kind)}`, expectedRevision: s.revision, actorPlayerId: s.activePlayerId }) as GameCommand;
const siteOf = (m: MissionDefinition, id: string) => m.sites.find((s) => s.id === id)!;
/** A deep copy of a match state (plain serialisable data, as saves are) to set positions on directly. */
const clone = (s: MatchState): MatchState => JSON.parse(JSON.stringify(s)) as MatchState;

describe('The Twelfth Hour v2', () => {
  it('validates, follows the chapter graph and carries every legacy chapter exactly once (as the cards say)', () => {
    expect(issues.filter((i) => i.includes('twelfth_hour'))).toEqual([]);
    expect(built.missions.map((m) => m.id)).toEqual(cards.map((c) => c.proposedMissionId));
    for (const card of cards) {
      const ch = built.chapters.find((c) => c.missionId === card.proposedMissionId)!;
      expect(ch.legacyMissionIds, card.proposedMissionId).toEqual(card.legacyMissionIds);
      expect(ch.requiresAll, card.proposedMissionId).toEqual(card.requiresAll);
      expect(ch.requiresAll, card.proposedMissionId).toEqual(graph.nodes.find((n) => n.id === card.proposedMissionId)!.requiresAll);
      expect(ch.briefingArt, card.proposedMissionId).toEqual(card.briefingArt.map((a) => a.replace(/^art\/missions\//, '').replace(/\.webp$/, '')));
    }
    const legacy = built.chapters.flatMap((c) => c.legacyMissionIds);
    expect([...legacy].sort()).toEqual(['twelfth_hour_m01', 'twelfth_hour_m02', 'twelfth_hour_m03', 'twelfth_hour_m04', 'twelfth_hour_m05', 'twelfth_hour_m06', 'twelfth_hour_m07']);
    expect(new Set(legacy).size).toBe(7);
    // The library expedition carries two legacy chapters (the sculptor's price and the drowned library).
    expect(built.chapters.find((c) => c.missionId === 'twelfth_hour_v2_m03')!.legacyMissionIds).toEqual(['twelfth_hour_m03', 'twelfth_hour_m04']);
    expect(catalog.campaigns['twelfth_hour']!.finalChapterId).toBe('twelfth_hour_v2_m06');
    for (const m of built.missions) expect(m.player.hero.heroId).toBe('seshet');
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
      }
      for (const t of m.timers ?? []) for (const id of t.onExpire.failObjectives ?? []) expect(m.objectives.find((o) => o.id === id)?.category).toBe('optional');
      expect(m.objectives.some((o) => o.completesMission) || m.sites.some((s) => s.kind.type === 'activation' && s.kind.completesMission), `${m.id}: ends through an objective or activation`).toBe(true);
      for (const f of m.carriedFlags ?? []) expect(flags.has(f), `${m.id}: carries ${f}, which nothing sets`).toBe(true);
      // No objective text types a guard count (armies are army tokens).
      for (const o of m.objectives) expect(o.description, `${m.id}/${o.id}`).not.toMatch(/\b\d+ (?:Brigands|Boars|Scarabs|Golems)\b/);
      // Campaign battles are manual: no chapter text promises an automatic battle (the kit's own manual-battles topic says so).
      const all = JSON.stringify([m.objectives, (m.helpTopics ?? []).filter((h) => h.id !== 'manual_battles'), m.briefing, m.storyScenes, m.sites.map((x) => [x.name, x.description, x.kind])]);
      expect(all, m.id).not.toMatch(/auto[- ]?(?:battle|combat|resolve)|quick battle/i);
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

  it('the farmland inquiry and the library expedition are coherent in both orders (cards 16 and 17)', () => {
    const m2 = mission(2);
    const m3 = mission(3);
    // Chapter 2 first: nobody mentions the library's records; after chapter 3 the flood register is named.
    const plain2 = start(2);
    const after3 = start(2, ['th3_records', 'th3_fraud_exposed']);
    expect(text(missionBriefingLines(m2, plain2.mission.flags))).not.toMatch(/flood register|Per-Djehuty|quarry contracts/);
    expect(text(missionBriefingLines(m2, after3.mission.flags))).toMatch(/flood registers we carried out of Per-Djehuty/);
    expect(text(missionBriefingLines(m2, after3.mission.flags))).toMatch(/forged quarry contracts/);
    const bookScenes = (m2.storyScenes ?? []).filter((s) => s.trigger.type === 'objective_completed' && s.trigger.objectiveId === 'th2_book');
    expect(bookScenes.map((s) => [s.ifFlags ?? [], s.unlessFlags ?? []])).toEqual([[['fact:th3_records'], []], [[], ['fact:th3_records']]]);
    for (const s of bookScenes) if (!s.ifFlags) expect(text(s.lines)).not.toMatch(/flood register|we carried/);
    // The flood register lowers the dam crew's price, and only once it has been recovered.
    const dam = siteOf(m2, 'th2_dam');
    if (dam.kind.type !== 'map_event') throw new Error('dam');
    const offered2 = (state: MatchState) => dam.kind.type === 'map_event' && dam.kind.options.filter((o) => (o.requiresFlags ?? []).every((f) => state.mission.flags[f])).length;
    expect(offered2(plain2)).toBe(1);
    expect(offered2(after3)).toBe(2);
    expect((dam.kind.options[1]!.cost?.gold ?? 0) < (dam.kind.options[0]!.cost?.gold ?? 0)).toBe(true);
    // No combat snowball between the pair: neither chapter grants troops or resources for the other's facts.
    expect((m2.entryBonuses ?? []).filter((b) => b.fact.startsWith('th3_'))).toEqual([]);
    expect((m3.entryBonuses ?? []).filter((b) => b.fact.startsWith('th2_'))).toEqual([]);
    // Chapter 3 first: no account book; after chapter 2 the collector's book names the river captain.
    const plain3 = start(3);
    const after2 = start(3, ['th2_book', 'th2_water_restored']);
    expect(text(missionBriefingLines(m3, plain3.mission.flags))).not.toMatch(/account book|Nekheb/);
    expect(text(missionBriefingLines(m3, after2.mission.flags))).toMatch(/collector’s account book from Nekheb/);
    const contractScenes = (m3.storyScenes ?? []).filter((s) => s.trigger.type === 'site_cleared' && s.trigger.siteId === 'th3_depot');
    expect(contractScenes.map((s) => [s.ifFlags ?? [], s.unlessFlags ?? []])).toEqual([[['fact:th2_book'], []], [[], ['fact:th2_book']]]);
    for (const s of contractScenes) if (!s.ifFlags) expect(text(s.lines)).not.toMatch(/account book|Nekheb/);
    // The account book lowers the sculptor's price, and only with the book in hand.
    const sculptor = siteOf(m3, 'th3_sculptor');
    if (sculptor.kind.type !== 'map_event') throw new Error('sculptor');
    const offered3 = (state: MatchState) => sculptor.kind.type === 'map_event' && sculptor.kind.options.filter((o) => (o.requiresFlags ?? []).every((f) => state.mission.flags[f])).length;
    expect(offered3(plain3)).toBe(1);
    expect(offered3(after2)).toBe(2);
    expect(offered3({ ...after2, mission: { ...after2.mission, flags: { ...after2.mission.flags, th3_contracts: true } } })).toBe(3);
    // Each chapter carries the facts the other reads.
    expect(m2.carriedFlags).toEqual(expect.arrayContaining(['th2_book', 'th2_water_restored']));
    expect(m3.carriedFlags).toEqual(expect.arrayContaining(['th3_records', 'th3_fraud_exposed']));
  });

  it('the canal lock (chapter 1) switches its channel and its open flag together, and refuses to strand a hero', () => {
    const m1 = mission(1);
    const lock = siteOf(m1, 'th1_lock');
    if (lock.kind.type !== 'sluice') throw new Error('lock');
    const channel = lock.kind.channel;
    let s = start(1);
    expect(channel.every((c) => terrainAt(s, c) === 's')).toBe(true);
    expect(s.mission.flags['th1_lock_open']).toBeFalsy();
    // Seshet at the lock: refused while the boars hold it.
    s = clone(s);
    s.heroes['seshet']!.position = { ...lock.coord };
    const guarded = processCommand({ catalog }, s, command(s, { kind: 'OperateSluice', heroId: 'seshet', siteId: 'th1_lock' }));
    expect(guarded.ok).toBe(false);
    s.world.sites['th1_lock']!.cleared = true;
    s.world.sites['th1_lock']!.guard = null;
    // Refused while a hero stands in the branch bed that would flood.
    const raider = Object.values(s.heroes).find((h) => h.definitionId === 'th1_raiders_band')!;
    const home = { ...raider.position };
    raider.position = { ...channel[4]! };
    const stranded = processCommand({ catalog }, s, command(s, { kind: 'OperateSluice', heroId: 'seshet', siteId: 'th1_lock' }));
    expect(stranded.ok).toBe(false);
    if (!stranded.ok) expect(stranded.rejection.message).toMatch(/channel/);
    raider.position = home;
    const opened = processCommand({ catalog }, s, command(s, { kind: 'OperateSluice', heroId: 'seshet', siteId: 'th1_lock' }));
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    s = opened.state;
    expect(channel.every((c) => terrainAt(s, c) === 'w')).toBe(true);
    expect(s.mission.flags['th1_lock_open']).toBe(true);
    // The objective completes and its reward makes the branch permanent; the raiders wake.
    expect(s.mission.objectives['th1_lock']!.status).toBe('completed');
    expect(s.mission.flags['th1_branch_farms']).toBe(true);
    const closed = processCommand({ catalog }, s, command(s, { kind: 'OperateSluice', heroId: 'seshet', siteId: 'th1_lock' }));
    expect(closed.ok).toBe(true);
    if (!closed.ok) return;
    expect(channel.every((c) => terrainAt(closed.state, c) === 's')).toBe(true);
    expect(closed.state.mission.flags['th1_lock_open']).toBeFalsy();
    expect(closed.state.mission.objectives['th1_lock']!.status).toBe('completed');
    expect(closed.state.mission.flags['th1_branch_farms']).toBe(true);
  });

  it('the Weir of Thoth (chapter 3) drains the library — its records can be lifted — while the tail-race floods the scribes’ causeway', () => {
    const m3 = mission(3);
    const weir = siteOf(m3, 'th3_weir');
    if (weir.kind.type !== 'sluice') throw new Error('weir');
    const channel = weir.kind.channel;
    let s = clone(start(3));
    expect(channel.every((c) => terrainAt(s, c) === 's')).toBe(true);
    // A record in the flooded lower archive cannot be lifted before the weir is opened.
    const archive = siteOf(m3, 'th3_rec_hours');
    s.heroes['seshet']!.position = { ...archive.coord };
    expect(quoteActivation(catalog, s, 'seshet', 'th3_rec_hours').legal).toBe(false);
    // The weir terrace is the staging area: secured first, then the weir can be opened.
    s.heroes['seshet']!.position = { ...weir.coord };
    expect(processCommand({ catalog }, s, command(s, { kind: 'OperateSluice', heroId: 'seshet', siteId: 'th3_weir' })).ok).toBe(false);
    s.world.sites['th3_weir']!.cleared = true;
    s.world.sites['th3_weir']!.guard = null;
    // Refused while anyone stands in the tail-race.
    const ankhwen = Object.values(s.heroes).find((h) => h.definitionId === 'egyptian_ankhwen')!;
    const home = { ...ankhwen.position };
    ankhwen.position = { ...channel[2]! };
    expect(processCommand({ catalog }, s, command(s, { kind: 'OperateSluice', heroId: 'seshet', siteId: 'th3_weir' })).ok).toBe(false);
    ankhwen.position = home;
    const r = processCommand({ catalog }, s, command(s, { kind: 'OperateSluice', heroId: 'seshet', siteId: 'th3_weir' }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    s = clone(r.state);
    expect(channel.every((c) => terrainAt(s, c) === 'w')).toBe(true);
    expect(s.mission.flags['th3_drained']).toBe(true);
    s.heroes['seshet']!.position = { ...archive.coord };
    expect(quoteActivation(catalog, s, 'seshet', 'th3_rec_hours').legal).toBe(true);
    // Never the only route: the library and both banks stay reachable with the tail-race flooded (checkV2Missions);
    // the shallows are not part of the weir's channel.
    const shallows = siteOf(m3, 'th3_shallows');
    expect(channel.some((c) => c.q === shallows.coord.q && c.r === shallows.coord.r)).toBe(false);
  });

  it('restoring the safe marsh route ends the herd crisis without a battle and opens the serpopard den (card 16)', () => {
    const m2 = mission(2);
    let s = clone(start(2));
    expect(campLockedReason(catalog, s, 'th2_den')).toMatch(/water returns/);
    s.heroes['seshet']!.position = { ...siteOf(m2, 'th2_dam').coord };
    const r = processCommand({ catalog }, s, command(s, { kind: 'ResolveMapEvent', heroId: 'seshet', siteId: 'th2_dam', optionIndex: 0 }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    s = r.state;
    expect(s.mission.flags['th2_water_restored']).toBe(true);
    expect(s.world.sites['th2_pen']!.cleared).toBe(true);
    expect(Object.values(s.heroes).find((h) => h.definitionId === 'egyptian_black_boar')?.status).toBe('retreated');
    expect(s.mission.objectives['th2_herd']!.status).toBe('completed');
    expect(campLockedReason(catalog, s, 'th2_den')).toBeNull();
    // The den is a finite weekly hiring site of the new neutral, never a requirement.
    const den = siteOf(m2, 'th2_den');
    expect(den.kind.type === 'creature_camp' && den.kind.creatureId).toBe('serpopard');
    expect(den.kind.type === 'creature_camp' && den.kind.restock).toBe('weekly');
    for (const m of built.missions) for (const o of m.objectives.filter((x) => x.category === 'primary')) expect(JSON.stringify(o.condition), `${m.id}/${o.id}`).not.toMatch(/serpopard/);
  });

  it('earlier choices give bounded entry bonuses', () => {
    const wallet = (n: number, st: MatchState) => st.players[mission(n).player.playerId]!.wallet;
    const garrison = (st: MatchState, townId: string, creatureId: string) => st.towns[townId]!.garrison.slots.reduce((k, x) => k + (x?.creatureId === creatureId ? x.count : 0), 0);
    // Chapter 2: Abedju's lower farms.
    expect(wallet(2, start(2, ['th1_farms_first'])).gold - wallet(2, start(2)).gold).toBe(1500);
    // Chapter 3: Abedju's boat channel runs the southern ferry from the first day.
    expect(start(3).mission.flags['th3_ferry_running']).toBeFalsy();
    const boats = start(3, ['th1_channel_first']);
    expect(boats.mission.flags['th3_ferry_running']).toBe(true);
    expect(wallet(3, boats).wood - wallet(3, start(3)).wood).toBe(5);
    // Chapter 4: the account book, Nekheb's grain choice and Edfu's workers.
    const plain4 = start(4);
    expect(plain4.mission.flags['th4_accounts']).toBeFalsy();
    expect(start(4, ['th2_book']).mission.flags['th4_accounts']).toBe(true);
    expect(wallet(4, start(4, ['th2_seed_tools'])).gold - wallet(4, plain4).gold).toBe(2000);
    expect(start(4, ['th2_grain_returned']).mission.flags['th4_nekheb_word']).toBe(true);
    expect(garrison(start(4, ['th3_fraud_exposed']), 'tjebu', 'egyptian_ushabti') - garrison(plain4, 'tjebu', 'egyptian_ushabti')).toBe(6);
    expect(garrison(start(4, ['th3_debt_paid']), 'tjebu', 'egyptian_ushabti') - garrison(plain4, 'tjebu', 'egyptian_ushabti')).toBe(0);
    // Chapter 5: the public levy funds the rescue.
    expect(wallet(5, start(5, ['th4_levy_accounted'])).gold - wallet(5, start(5)).gold).toBe(2500);
    expect(wallet(5, start(5, ['th4_levy_abolished'])).gold - wallet(5, start(5)).gold).toBe(0);
    // Chapter 6: Iunu's reserve or the river towns' volunteers.
    const plain6 = start(6);
    expect(garrison(start(6, ['th5_fire_homes']), 'abu', 'egyptian_royal_ushabti') - garrison(plain6, 'abu', 'egyptian_royal_ushabti')).toBe(6);
    expect(garrison(start(6, ['th5_fire_homes']), 'abu', 'egyptian_radiant_bennu') - garrison(plain6, 'abu', 'egyptian_radiant_bennu')).toBe(1);
    expect(garrison(start(6, ['th4_levy_abolished']), 'abu', 'egyptian_anubian_warden') - garrison(plain6, 'abu', 'egyptian_anubian_warden')).toBe(12);
    // The preserved bennu fire breaks one formation in the final chapter, and only if it was preserved.
    const bowl = siteOf(mission(6), 'th6_bennu_bowl');
    if (bowl.kind.type !== 'map_event') throw new Error('bowl');
    expect(bowl.kind.options[0]!.requiresFlags).toEqual(['fact:th5_fire_rite']);
    expect(bowl.kind.options[0]!.clearsSiteIds).toEqual(['th6_serpent']);
    for (const m of built.missions) expect((m.entryBonuses ?? []).length).toBeLessThanOrEqual(4);
  });

  it('announced deadlines: the collector moves his book but it stays recoverable; the final rite waits for the launch', () => {
    const m2 = mission(2);
    const removal = m2.timers!.find((t) => t.id === 'th2_removal')!;
    let s = start(2);
    const end = (st: MatchState): GameCommand => ({ kind: 'EndTurn', commandId: `th-end-${st.revision}`, expectedRevision: st.revision, actorPlayerId: st.activePlayerId }) as GameCommand;
    for (let i = 0; i < 80 && s.day <= removal.days + 1; i++) {
      const r = processCommand({ catalog }, s, end(s));
      if (!r.ok) throw new Error(r.rejection.message);
      s = r.state;
    }
    expect(s.mission.flags['th2_book_moving']).toBe(true);
    expect(s.mission.objectives['th2_book_early']!.status).toBe('failed');
    expect(s.mission.objectives['th2_book']!.status).toBe('active');
    expect(Object.values(s.heroes).find((h) => h.definitionId === 'th2_collector')?.status).toBe('active');
    for (const o of m2.objectives.filter((x) => x.category === 'primary')) expect(s.mission.objectives[o.id]!.status).not.toBe('failed');
    expect(s.outcome.status).toBe('running');
    // Chapter 6: ten days of exploration never start the rite.
    let t = start(6);
    for (let i = 0; i < 80 && t.day <= 10; i++) {
      const r = processCommand({ catalog }, t, end(t));
      if (!r.ok) throw new Error(r.rejection.message);
      t = r.state;
    }
    expect(t.mission.timers?.['th6_rite']?.status ?? 'waiting').toBe('waiting');
    expect(t.mission.timers?.['th6_midnight']?.status ?? 'waiting').toBe('waiting');
    const rite = mission(6).timers!.find((x) => x.id === 'th6_rite')!;
    expect(rite.startWhen).toEqual({ type: 'flag', flag: 'th6_launched' });
    const slip = siteOf(mission(6), 'th6_slip');
    expect(slip.kind.type === 'activation' && slip.kind.reward.flags).toEqual(['th6_launched']);
  });

  it('the epilogue follows the calendar choice over the campaign cover', () => {
    const camp = catalog.campaigns['twelfth_hour']!;
    expect(camp.epilogueV2?.art).toBe('campaign.twelfth_hour.cover');
    expect(text(campaignEpilogueV2Lines(camp, { th_calendar_council: true }))).toMatch(/Every river town has its copy/);
    expect(text(campaignEpilogueV2Lines(camp, { th_calendar_council: true }))).not.toMatch(/Office of the Hours/);
    expect(text(campaignEpilogueV2Lines(camp, { th_calendar_office: true }))).toMatch(/Office of the Hours opened at Per-Wadjet/);
    expect(text(campaignEpilogueV2Lines(camp, { th_calendar_office: true }))).not.toMatch(/Every river town has its copy/);
    const calendar = siteOf(mission(6), 'th6_calendar');
    if (calendar.kind.type !== 'map_event') throw new Error('calendar');
    expect(calendar.kind.options.flatMap((o) => o.reward.flags ?? [])).toEqual(['th_calendar_council', 'th_calendar_office']);
    expect(mission(6).objectives.find((o) => o.id === 'th6_calendar')?.completesMission).toBe(true);
    expect(mission(6).carriedFlags).toEqual(['th_calendar_council', 'th_calendar_office']);
  });
});
