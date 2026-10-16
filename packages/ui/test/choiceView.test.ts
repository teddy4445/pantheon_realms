/**
 * Story choice and negotiation (packages/ui/src/app/choiceView.ts; screen spec
 * `choice`, campaign expansion 2026-10-15): each option's exact cost and
 * consequence read from its definition and the mission's data (evidence it
 * records, guards that stand down, what it needs, with the evidence/pact icon),
 * and the states affordable / unaffordable (shortfall) / needs evidence /
 * already decided (what was chosen) / repeat visit — from committed state and
 * the rules' own quoteMapEvent.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import { missionSite } from '@pr/rules';
import { choiceView, noteChoiceDeferred, noteChoiceMade, resetChoiceMemory } from '../src/app/choiceView';

const PLAYER = 'player';

function at(missionId: string, siteId: string, matchId: string) {
  const d = GameDriver.mission(missionId, { matchId });
  const site = missionSite(d.catalog, d.state, siteId)!;
  d.hero().position = { ...site.coord };
  return { d, site };
}

const view = (d: GameDriver, siteId: string) => choiceView(d.catalog, d.state, PLAYER, 'alexios', siteId)!;

beforeEach(() => resetChoiceMemory());

describe('the market’s one deal (Silent Oracle, chapter 1)', () => {
  it('lists each option’s exact cost, the guards that stand down and what it records, in the mission’s words', () => {
    const { d, site } = at('silent_oracle_v2_m01', 'so1_market', 'test-ch-market');
    for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
    const v = view(d, 'so1_market');
    expect(v.location).toBe(site.name);
    expect(v.speaker?.speaker).toBe('Alexios');
    expect(v.committed).toBe(false);
    expect(v.repeat).toBe(false);
    const [shelter, ledger] = v.options;
    expect(shelter!.label).toBe('Shelter the pilgrims');
    expect(shelter!.state).toBe('available');
    expect(shelter!.cost).toMatchObject({ gold: 800, wood: 5 });
    // The evidence entry with its ledger icon, and the optional objective it completes.
    expect(shelter!.records).toEqual([
      { flag: 'so1_sheltered', kind: 'evidence', label: 'Pilgrims sheltered', icon: 'supply' },
      { flag: 'so1_sheltered', kind: 'objective', label: 'The market’s one deal', icon: null },
    ]);
    expect(shelter!.standsDown).toEqual([]);
    expect(ledger!.cost).toMatchObject({ gold: 1200 });
    const reserve = missionSite(d.catalog, d.state, 'so1_reserve')!;
    expect(ledger!.standsDown).toEqual([{ siteId: 'so1_reserve', name: reserve.name, guard: reserve.guard?.label ?? null, alreadyCleared: false }]);
    expect(ledger!.records[0]).toEqual({ flag: 'so1_ledger', kind: 'evidence', label: 'The captain’s ledger', icon: 'evidence' });
  });

  it('a guard the viewer has not found is not named', () => {
    const { d } = at('silent_oracle_v2_m01', 'so1_market', 'test-ch-fog');
    for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 0);
    const ledger = view(d, 'so1_market').options[1]!;
    expect(ledger.standsDown[0]).toMatchObject({ siteId: 'so1_reserve', name: null, guard: null });
  });

  it('unaffordable: the rules refuse it and the shortfall is named', () => {
    const { d } = at('silent_oracle_v2_m01', 'so1_market', 'test-ch-poor');
    (d.player.wallet as Record<string, number>).gold = 500;
    const [shelter, ledger] = view(d, 'so1_market').options;
    expect(shelter).toMatchObject({ legal: false, state: 'unaffordable', reason: 'Not enough resources: short 300 Gold' });
    expect(ledger).toMatchObject({ legal: false, state: 'unaffordable', reason: 'Not enough resources: short 700 Gold' });
  });

  it('decided once: the chosen option is shown (from the flags only it records), and it cannot be paid again', () => {
    const { d } = at('silent_oracle_v2_m01', 'so1_market', 'test-ch-done');
    const gold = d.player.wallet.gold;
    d.do({ kind: 'ResolveMapEvent', heroId: 'alexios', siteId: 'so1_market', optionIndex: 0 });
    expect(d.player.wallet.gold).toBe(gold - 800);
    const v = view(d, 'so1_market');
    expect(v.committed).toBe(true);
    expect(v.chosen).toMatchObject({ index: 0, label: 'Shelter the pilgrims' });
    expect(v.repeat).toBe(false);
    expect(d.reject({ kind: 'ResolveMapEvent', heroId: 'alexios', siteId: 'so1_market', optionIndex: 1 }).code).toBe('already_done');
    expect(d.player.wallet.gold).toBe(gold - 800);
  });

  it('a repeat visit after Decide later says so; nothing was paid', () => {
    const { d } = at('silent_oracle_v2_m01', 'so1_market', 'test-ch-repeat');
    expect(view(d, 'so1_market').repeat).toBe(false);
    noteChoiceDeferred('test-ch-repeat', 'so1_market');
    const v = view(d, 'so1_market');
    expect(v.repeat).toBe(true);
    expect(v.options.every((o) => o.legal)).toBe(true);
    // Another match keeps its own memory.
    expect(choiceDeferred2(d)).toBe(false);
  });
});

function choiceDeferred2(d: GameDriver): boolean {
  const other = GameDriver.mission('silent_oracle_v2_m01', { matchId: 'test-ch-other' });
  other.hero().position = { ...missionSite(d.catalog, d.state, 'so1_market')!.coord };
  return choiceView(other.catalog, other.state, PLAYER, 'alexios', 'so1_market')!.repeat;
}

describe('the Keeper of Aetos (Silent Oracle, chapter 2)', () => {
  it('an option that needs evidence from an earlier chapter wears its icon and says what is missing', () => {
    const { d } = at('silent_oracle_v2_m02', 'so2_keeper', 'test-ch-keeper');
    const [plain, shown] = view(d, 'so2_keeper').options;
    expect(plain!.state).toBe('available');
    expect(plain!.needs).toEqual([]);
    expect(shown!.state).toBe('needs');
    expect(shown!.legal).toBe(false);
    const evidence = d.catalog.missions['silent_oracle_v2_m03']!.evidence!.find((e) => e.flag === 'so3_records');
    // The requirement is named from the chapter that records it (its ledger entry, or the objective that sets it).
    expect(shown!.needs).toHaveLength(1);
    expect(shown!.needs[0]).toMatchObject({ flag: 'fact:so3_records', held: false, earlier: true });
    if (evidence) expect(shown!.needs[0]).toMatchObject({ label: evidence.title, icon: evidence.icon });
    else expect(shown!.needs[0]).toMatchObject({ label: 'Two of the three records', icon: 'evidence' });
    // The option wears its requirement's ledger icon.
    expect(shown!.icon).toBe('evidence');
    expect(shown!.reason).toBe(`Needs ${shown!.needs[0]!.label}`);
    // With the fact in hand, the cheaper negotiation opens.
    d.state.mission.flags['fact:so3_records'] = true;
    const after = view(d, 'so2_keeper').options[1]!;
    expect(after).toMatchObject({ legal: true, state: 'available' });
    expect(after.needs[0]!.held).toBe(true);
  });

  it('options gated by this chapter’s deeds name them (evidence with its icon, or the objective)', () => {
    const { d } = at('silent_oracle_v2_m02', 'so2_shrine', 'test-ch-shrine');
    const fields = view(d, 'so2_shrine').options[0]!;
    expect(fields.state).toBe('needs');
    const labels = fields.needs.map((n) => n.label);
    expect(labels[0]).toBe('The bull is broken');
    expect(fields.needs[0]!.icon).toBe('evidence');
    expect(fields.icon).toBe('evidence');
    expect(labels[1]).toBe('The eyrie’s cooperation');
    expect(fields.needs[1]!.icon).toBeNull();
  });
});

describe('ambiguous and session-known choices', () => {
  it('the rules record the option taken; in a save from before that, options recording the same flags are told apart only if this session saw the choice', () => {
    const d = GameDriver.mission('silent_oracle_v2_m05', { matchId: 'test-ch-witness' });
    const site = missionSite(d.catalog, d.state, 'so5_witness')!;
    d.hero().position = { ...site.coord };
    d.state.mission.flags['so5_y_e'] = true;
    d.do({ kind: 'ResolveMapEvent', heroId: 'alexios', siteId: 'so5_witness', optionIndex: 1 });
    expect(d.state.world.sites['so5_witness']!.chosenOption).toBe(1);
    expect(view(d, 'so5_witness')).toMatchObject({ committed: true, chosen: { index: 1 } });
    // As saved before 2026-10-15: no chosenOption.
    delete d.state.world.sites['so5_witness']!.chosenOption;
    expect(view(d, 'so5_witness')).toMatchObject({ committed: true, chosen: null });
    noteChoiceMade('test-ch-witness', 'so5_witness', 1);
    expect(view(d, 'so5_witness').chosen).toMatchObject({ index: 1 });
  });

  it('the exchange is the story scene that played on arriving at the site (its own speakers)', () => {
    const catalog = GameDriver.mission('silent_oracle_v2_m01').catalog;
    const found = Object.values(catalog.missions)
      .flatMap((m) => m.sites.filter((s) => s.kind.type === 'map_event').map((s) => ({ m, s, scene: (m.storyScenes ?? []).find((sc) => sc.trigger.type === 'site_visited' && sc.trigger.siteId === s.id && !sc.ifFlags?.length && !sc.unlessFlags?.length) })))
      .find((x) => x.scene && x.m.campaignId);
    expect(found).toBeTruthy();
    const d = GameDriver.mission(found!.m.id, { matchId: 'test-ch-scene' });
    const hero = Object.values(d.state.heroes).find((h) => h.ownerId === PLAYER)!;
    hero.position = { ...found!.s.coord };
    expect(choiceView(d.catalog, d.state, PLAYER, hero.id, found!.s.id)!.exchange).toEqual([]);
    d.state.mission.scenesPlayed = [...(d.state.mission.scenesPlayed ?? []), found!.scene!.id];
    expect(choiceView(d.catalog, d.state, PLAYER, hero.id, found!.s.id)!.exchange).toEqual(found!.scene!.lines);
  });
});
