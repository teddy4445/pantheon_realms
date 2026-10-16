/**
 * Neutral recruitment (packages/ui/src/app/neutralRecruit.ts; screen spec
 * `neutral-recruit`, campaign expansion 2026-10-15): the hiring dialog's view
 * model — the kit portrait and background for the six expansion neutrals,
 * exact statistics and ability rules from the definitions, the shared stock and
 * restock rule, the rules' price and legal maximum, the seven slots with the
 * destination, and every state with its reason (pact not made, no stock, army
 * full, not enough resources, not present) — from committed state and the
 * rules' own quote. An ordinary two-form camp keeps its idle-strip stage.
 *
 * Neutral upgrades (2026-10-15): the base / upgraded selector (each form's own
 * portrait, statistics, price; one shared stock) and the training action (only
 * with an eligible base stack; quantity, price difference, destination, reasons).
 */
import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import { NEUTRAL_V2_HABITATS } from '@pr/content';
import { missionSite, type MissionDefinition, type SiteDefinition } from '@pr/rules';
import { campaignV2Art, creatureIdleStrip, neutralUpgradeArt } from '../src/assets/manifest';
import { campForm, campQuantity, creatureHabitat, creaturePicture, hasKitPortrait, neutralRecruitView, rememberCampForm, rememberCampQuantity } from '../src/app/neutralRecruit';

const PLAYER = 'player';

/** Hervor standing at the Root-Runner Grove of The Winter Oath, chapter 2 (no pact needed). */
function grove() {
  const d = GameDriver.mission('winter_oath_v2_m02', { matchId: 'test-nr-grove' });
  const site = missionSite(d.catalog, d.state, 'wo2_root_runners')!;
  const hero = d.hero('hervor');
  hero.position = { ...site.coord };
  return { d, site, hero };
}

const view = (d: GameDriver, heroId: string, siteId: string, qty = 1) => neutralRecruitView(d.catalog, d.state, PLAYER, heroId, siteId, qty)!;

describe('a neutral hiring site (Root-Runner Grove)', () => {
  it('shows the kit portrait over the neutral recruitment background, the base form first, habitat, exact stats and ability rule', () => {
    const { d, hero } = grove();
    const v = view(d, hero.id, 'wo2_root_runners');
    const def = d.catalog.creatures['root_runner']!;
    expect(v.siteKind).toBe('Hiring site');
    expect(v.kit).toBe(true);
    expect(v.singleForm).toBe(false);
    expect(v.formChoice).toBe(true);
    expect(v.form).toBe('base');
    expect(v.creatureId).toBe('root_runner');
    expect(v.portrait!.url).toBe(campaignV2Art('campaignv2.portrait.root_runner')!.nativeUrl);
    expect([v.portrait!.width, v.portrait!.height]).toEqual([1254, 1254]);
    expect(v.portrait!.alt).toBe(def.presentation.portraitAlt);
    expect(v.background).toBe(campaignV2Art('campaignv2.background.neutral.recruitment')!.nativeUrl);
    expect(v.habitat).toBe(NEUTRAL_V2_HABITATS['root_runner']!.habitat);
    const s = def.stats!;
    expect(Object.fromEntries(v.stats.map((r) => [r.id, r.value]))).toEqual({ attack: String(s.attack), defense: String(s.defense), damage: `${s.damageMin}–${s.damageMax}`, hp: String(s.hp), speed: String(s.speed), size: '1 hex' });
    expect(v.abilities.map((a) => a.id)).toEqual(def.abilityIds);
    expect(v.abilities[0]!.exactRule).toBe(d.catalog.abilities['neutral_distract']!.exactRule);
    expect(v.abilities[0]!.restriction).toBe(d.catalog.abilities['neutral_distract']!.restriction);
    expect(v.lore).toBe(d.catalog.lore[def.loreId]!.gameLore);
  });

  it('prices, stock and the legal maximum come from the rules’ quote; the quantity is clamped to it', () => {
    const { d, hero } = grove();
    const v = view(d, hero.id, 'wo2_root_runners', 3);
    expect(v.stock).toBe(8);
    expect(v.restock).toBe('weekly');
    expect(v.stockText).toBe('8 Root-Runners this week');
    expect(v.restockText).toBe('Up to 8 each week; unhired ones do not stay');
    expect(v.unitCost.gold).toBe(110);
    expect(v.max).toBe(8);
    expect(v.quantity).toBe(3);
    expect(v.recruit).toMatchObject({ quantity: 3, legal: true, reason: null });
    expect(v.recruit.totalCost.gold).toBe(330);
    expect(v.recruitAll).toMatchObject({ quantity: 8, legal: true });
    expect(v.recruitAll.totalCost.gold).toBe(880);
    expect(v.issues).toEqual([]);
    expect(view(d, hero.id, 'wo2_root_runners', 50).quantity).toBe(8);
    expect(view(d, hero.id, 'wo2_root_runners', 0).quantity).toBe(1);
    expect(view(d, hero.id, 'wo2_root_runners', Number.NaN).quantity).toBe(1);
  });

  it('shows the seven slots and where the recruits go: a free slot, or a merge with the same creature', () => {
    const { d, hero } = grove();
    let v = view(d, hero.id, 'wo2_root_runners', 2);
    expect(v.slots).toHaveLength(7);
    expect(v.targetSlot).toBe(3);
    expect(v.slots.filter((s) => s.target).map((s) => s.index)).toEqual([3]);
    expect(v.destinationText).toBe('Slot 4 — a free slot: a new stack of 2.');
    hero.army.slots[1] = { stackId: 'st-rr', creatureId: 'root_runner', count: 4 };
    v = view(d, hero.id, 'wo2_root_runners', 2);
    expect(v.targetSlot).toBe(1);
    expect(v.destinationText).toBe('Slot 2 — joins the 4 Root-Runners already there (6 after).');
  });

  it('Recruit all affordable is one legal command for the whole maximum; the stock is then empty and says when more come', () => {
    const { d, hero } = grove();
    const before = d.player.wallet.gold;
    const all = view(d, hero.id, 'wo2_root_runners').recruitAll;
    d.do({ kind: 'RecruitFromCamp', heroId: hero.id, siteId: 'wo2_root_runners', quantity: all.quantity });
    expect(d.player.wallet.gold).toBe(before - all.totalCost.gold);
    expect(d.hero('hervor').army.slots[3]).toMatchObject({ creatureId: 'root_runner', count: 8 });
    const v = view(d, hero.id, 'wo2_root_runners');
    expect(v.stock).toBe(0);
    expect(v.max).toBe(0);
    expect(v.quantity).toBe(0);
    expect(v.issues.map((i) => i.kind)).toEqual(['empty']);
    expect(v.issues[0]!.text).toBe('None left this week. Up to 8 come when the next week begins; unhired ones do not stay.');
    expect(v.recruit.legal).toBe(false);
    expect(v.recruit.reason).toBe(v.issues[0]!.text);
    expect(v.recruitAll).toMatchObject({ quantity: 0, legal: false });
    // A stale request is refused by the rules too.
    expect(d.reject({ kind: 'RecruitFromCamp', heroId: hero.id, siteId: 'wo2_root_runners', quantity: 1 }).code).toBe('no_population');
  });

  it('a full army: no slot takes them, and the reason says so', () => {
    const { d, hero } = grove();
    for (let i = 0; i < 7; i++) hero.army.slots[i] = { stackId: `s${i}`, creatureId: i % 2 ? 'norse_draugr' : 'norse_frost_wolf', count: 2 + i };
    hero.army.slots[5] = { stackId: 's5', creatureId: 'norse_deathless_draugr', count: 3 };
    const v = view(d, hero.id, 'wo2_root_runners');
    expect(v.targetSlot).toBeNull();
    expect(v.issues.map((i) => i.kind)).toEqual(['full']);
    expect(v.issues[0]!.text).toBe('Hervor’s seven slots hold other creatures: free a slot to hire Root-Runners.');
    expect(v.destinationText).toBe('No slot in Hervor’s army can take Root-Runners.');
    expect(v.max).toBe(0);
    expect(v.recruit.legal).toBe(false);
  });

  it('not enough resources: the shortfall for one, and nothing can be hired', () => {
    const { d, hero } = grove();
    (d.player.wallet as Record<string, number>).gold = 50;
    const v = view(d, hero.id, 'wo2_root_runners');
    expect(v.issues.map((i) => i.kind)).toEqual(['poor']);
    expect(v.issues[0]!.text).toBe('One Root-Runner costs 110 Gold: short 60 Gold.');
    expect(v.recruit).toMatchObject({ legal: false, quantity: 0 });
    expect(v.recruitAll.legal).toBe(false);
  });

  it('several states at once are all listed; a hero elsewhere gets the rules’ reason first', () => {
    const { d, hero, site } = grove();
    (d.player.wallet as Record<string, number>).gold = 0;
    d.state.world.sites['wo2_root_runners']!.stock = 0;
    hero.position = { q: site.coord.q + 1, r: site.coord.r };
    const v = view(d, hero.id, 'wo2_root_runners');
    expect(v.issues.map((i) => i.kind)).toEqual(['unavailable', 'empty', 'poor']);
    expect(v.issues[0]!.text).toBe(`Hervor must stand at ${site.name}`);
  });

  it('keeps the chosen quantity across a look at the creature card (presentation memory)', () => {
    expect(campQuantity('m', 's')).toBe(1);
    rememberCampQuantity('m', 's', 4);
    expect(campQuantity('m', 's')).toBe(4);
    expect(campQuantity('m', 'other')).toBe(1);
  });
});

describe('a pact not yet made (Pegasus Meadow)', () => {
  it('is locked with the content’s reason; nothing can be hired, the facts stay readable', () => {
    const d = GameDriver.mission('silent_oracle_v2_m02', { matchId: 'test-nr-pact' });
    const site = missionSite(d.catalog, d.state, 'so2_pegasus')!;
    const reason = (site.kind as { lockedReason: string }).lockedReason;
    d.hero().position = { ...site.coord };
    let v = view(d, 'alexios', 'so2_pegasus');
    expect(v.lockedReason).toBe(reason);
    expect(v.issues.map((i) => i.kind)).toEqual(['locked']);
    expect(v.issues[0]!.text).toBe(reason);
    expect(v.max).toBe(0);
    expect(v.recruit).toMatchObject({ legal: false, reason });
    expect(v.recruitAll).toMatchObject({ legal: false, quantity: 0 });
    expect(v.stats.length).toBe(6);
    expect(v.abilities.map((a) => a.id)).toEqual(['flight', 'neutral_sheltering_wings']);
    expect(v.singleForm).toBe(false);
    expect(v.forms.map((f) => f.creatureId)).toEqual(['pegasus', 'dawncrest_pegasus']);
    // The upgraded form is locked by the same pact.
    const vu = neutralRecruitView(d.catalog, d.state, PLAYER, 'alexios', 'so2_pegasus', 1, { form: 'dawncrest_pegasus' })!;
    expect(vu.issues.map((i) => i.kind)).toEqual(['locked']);
    expect(vu.recruit).toMatchObject({ legal: false, reason });
    // The pact made: hiring opens.
    d.state.mission.flags['so2_bull_down'] = true;
    v = view(d, 'alexios', 'so2_pegasus');
    expect(v.issues).toEqual([]);
    expect(v.recruit.legal).toBe(true);
    expect(v.max).toBe(5);
  });
});

describe('an ordinary creature camp', () => {
  it('keeps the idle-strip stage and its landscape: no kit portrait, no single-form note, growth restock', () => {
    const d = GameDriver.mission('winter_oath_v2_m02', { matchId: 'test-nr-camp' });
    const m = d.catalog.missions['winter_oath_v2_m02']!;
    const at = missionSite(d.catalog, d.state, 'wo2_root_runners')!.coord;
    const camp: SiteDefinition = { id: 'test_centaur_camp', anchorId: 'test_centaur_camp', coord: { q: at.q, r: at.r + 1 }, name: 'Centaur Camp', description: 'Centaurs sell their service.', kind: { type: 'creature_camp', creatureId: 'centaur', weeklyGrowth: 4, initialStock: 6 } };
    d.state.customMission = { ...m, sites: [...m.sites, camp] } as MissionDefinition;
    d.state.world.sites[camp.id] = { siteId: camp.id, owner: null, cleared: true, claimed: false, activated: false, visitedBy: [], open: false, guard: null };
    d.hero('hervor').position = { ...camp.coord };
    const v = view(d, 'hervor', camp.id, 2);
    expect(v.siteKind).toBe('Creature camp');
    expect(v.kit).toBe(false);
    expect(v.background).toBeNull();
    expect(v.singleForm).toBe(false);
    expect(v.habitat).toBeNull();
    expect(creatureIdleStrip('centaur')).not.toBeNull();
    expect(v.restockText).toBe('+4 each week');
    expect(v.stockText).toBe('6 Centaurs available'.replace('Centaurs', d.catalog.creatures['centaur']!.pluralName));
    expect(v.recruit.legal).toBe(true);
    expect(v.recruit.totalCost.gold).toBe((d.catalog.creatures['centaur']!.cost!.gold ?? 0) * 2);
    // Its portrait is the ordinary one (no native size claimed).
    const pic = creaturePicture(d.catalog, 'centaur');
    expect(pic?.width ?? null).toBeNull();
  });
});

describe('neutral upgrades at a hiring site (Root-Runner Grove)', () => {
  it('offers the base and the upgraded form; the selected form brings its own portrait, statistics, price and lore', () => {
    const { d, hero } = grove();
    const v = view(d, hero.id, 'wo2_root_runners');
    expect(v.forms.map((f) => [f.creatureId, f.form, f.label, f.selected, f.unitCost.gold])).toEqual([
      ['root_runner', 'base', 'Base', true, 110],
      ['crownroot_runner', 'upgraded', 'Upgraded', false, 145],
    ]);
    const u = neutralRecruitView(d.catalog, d.state, PLAYER, hero.id, 'wo2_root_runners', 2, { form: 'crownroot_runner' })!;
    const def = d.catalog.creatures['crownroot_runner']!;
    expect(u.form).toBe('upgraded');
    expect(u.creatureId).toBe('crownroot_runner');
    expect(u.name).toBe('Crownroot Runner');
    expect(u.forms.map((f) => f.selected)).toEqual([false, true]);
    expect(u.kit).toBe(true);
    expect(u.portrait!.url).toBe(neutralUpgradeArt('neutralupgrade.portrait.crownroot_runner')!.url);
    expect([u.portrait!.width, u.portrait!.height]).toEqual([1254, 1254]);
    expect(u.portrait!.alt).toBe(def.presentation.portraitAlt);
    expect(u.background).toBe(v.background);
    // Habitat by family: the same as the base form's.
    expect(u.habitat).toBe(v.habitat);
    const st = def.stats!;
    expect(Object.fromEntries(u.stats.map((r) => [r.id, r.value]))).toEqual({ attack: String(st.attack), defense: String(st.defense), damage: `${st.damageMin}–${st.damageMax}`, hp: String(st.hp), speed: String(st.speed), size: '1 hex' });
    // Same ability, same rule.
    expect(u.abilities).toEqual(v.abilities);
    expect(u.lore).toBe(d.catalog.lore[def.loreId]!.upgradeLore);
    // Its own price, the site's one stock (counted in the family's base name).
    expect(u.unitCost.gold).toBe(145);
    expect(u.recruit).toMatchObject({ quantity: 2, legal: true });
    expect(u.recruit.totalCost.gold).toBe(290);
    expect(u.stock).toBe(8);
    expect(u.stockText).toBe('8 Root-Runners this week');
    expect(u.recruitAll.quantity).toBe(8);
    // An unknown or foreign form falls back to the listed creature (the rules refuse it anyway).
    expect(neutralRecruitView(d.catalog, d.state, PLAYER, hero.id, 'wo2_root_runners', 1, { form: 'dawncrest_pegasus' })!.creatureId).toBe('root_runner');
  });

  it('hiring the upgraded form, then the base form, draws on one stock and makes two stacks', () => {
    const { d, hero } = grove();
    const u = neutralRecruitView(d.catalog, d.state, PLAYER, hero.id, 'wo2_root_runners', 3, { form: 'crownroot_runner' })!;
    d.do({ kind: 'RecruitFromCamp', heroId: hero.id, siteId: 'wo2_root_runners', quantity: u.recruit.quantity, creatureId: u.creatureId });
    const b = view(d, hero.id, 'wo2_root_runners', 50);
    expect(b.stock).toBe(5);
    expect(b.max).toBe(5);
    expect(b.destinationText).toBe('Slot 5 — a free slot: a new stack of 5.');
    const after = neutralRecruitView(d.catalog, d.state, PLAYER, hero.id, 'wo2_root_runners', 1, { form: 'crownroot_runner' })!;
    expect(after.destinationText).toBe('Slot 4 — joins the 3 Crownroot Runners already there (4 after).');
  });

  it('shows no training without a base stack of the family; with one, quotes the price difference and the destination', () => {
    const { d, hero } = grove();
    expect(view(d, hero.id, 'wo2_root_runners').training).toBeNull();
    hero.army.slots[1] = { stackId: 'st-rr', creatureId: 'root_runner', count: 4 };
    let t = neutralRecruitView(d.catalog, d.state, PLAYER, hero.id, 'wo2_root_runners', 1, { train: 4 })!.training!;
    expect(t).toMatchObject({ fromId: 'root_runner', toId: 'crownroot_runner', slot: 1, stackCount: 4, quantity: 4, min: 1, max: 4, targetSlot: 1, reason: null });
    expect(t.unitCost.gold).toBe(35);
    expect(t.train).toMatchObject({ quantity: 4, legal: true, reason: null });
    expect(t.train.totalCost.gold).toBe(140);
    expect(t.destinationText).toBe('Slot 2 — all 4 become Crownroot Runners.');
    // The same training with the upgraded tab selected (the action does not depend on the tab).
    expect(neutralRecruitView(d.catalog, d.state, PLAYER, hero.id, 'wo2_root_runners', 1, { form: 'crownroot_runner', train: 4 })!.training).toEqual(t);
    t = neutralRecruitView(d.catalog, d.state, PLAYER, hero.id, 'wo2_root_runners', 1, { train: 2 })!.training!;
    expect(t.targetSlot).toBe(3);
    expect(t.destinationText).toBe('Slot 4 — a free slot: a new stack of 2 Crownroot Runners. 2 Root-Runners stay in slot 2.');
    d.do({ kind: 'TrainAtCamp', heroId: hero.id, siteId: 'wo2_root_runners', fromCreatureId: t.fromId, quantity: t.train.quantity, slot: t.slot });
    t = neutralRecruitView(d.catalog, d.state, PLAYER, hero.id, 'wo2_root_runners', 1, { train: 1 })!.training!;
    expect(t.destinationText).toBe('Slot 4 — joins the 2 Crownroot Runners already there (3 after). 1 Root-Runner stays in slot 2.');
    // The stock is untouched by training.
    expect(view(d, hero.id, 'wo2_root_runners').stock).toBe(8);
  });

  it('training refused: not enough gold for one names the shortfall; a full army allows only the whole stack', () => {
    const { d, hero } = grove();
    hero.army.slots[1] = { stackId: 'st-rr', creatureId: 'root_runner', count: 4 };
    (d.player.wallet as Record<string, number>).gold = 20;
    let t = view(d, hero.id, 'wo2_root_runners').training!;
    expect(t.max).toBe(0);
    expect(t.reason).toBe('Training one Root-Runner costs 35 Gold: short 15 Gold.');
    expect(t.train).toMatchObject({ legal: false, quantity: 0, reason: t.reason });
    // 100 Gold and every slot full: two cannot be split off; all four cost 140.
    (d.player.wallet as Record<string, number>).gold = 100;
    for (let i = 0; i < 7; i++) if (i !== 1) hero.army.slots[i] = { stackId: `f${i}`, creatureId: 'norse_draugr', count: 1 + i };
    t = view(d, hero.id, 'wo2_root_runners').training!;
    expect(t.max).toBe(0);
    expect(t.reason).toBe('Training all 4 costs 140 Gold: short 40 Gold. A partial training needs a free slot or an existing stack of Crownroot Runners.');
    // Enough for the whole stack: it trains in place, a part of it is refused with the rules' reason.
    (d.player.wallet as Record<string, number>).gold = 1000;
    t = neutralRecruitView(d.catalog, d.state, PLAYER, hero.id, 'wo2_root_runners', 1, { train: 2 })!.training!;
    expect(t.max).toBe(4);
    expect(t.train).toMatchObject({ legal: false, reason: 'A partial training needs a free slot or an existing stack of Crownroot Runners' });
    t = neutralRecruitView(d.catalog, d.state, PLAYER, hero.id, 'wo2_root_runners', 1, { train: 4 })!.training!;
    expect(t.train.legal).toBe(true);
  });

  it('training waits for the pact like hiring', () => {
    const d = GameDriver.mission('silent_oracle_v2_m02', { matchId: 'test-nr-pact-train' });
    const site = missionSite(d.catalog, d.state, 'so2_pegasus')!;
    d.hero().position = { ...site.coord };
    d.hero().army.slots[6] = { stackId: 'p', creatureId: 'pegasus', count: 2 };
    const t = view(d, 'alexios', 'so2_pegasus').training!;
    expect(t.max).toBe(0);
    expect(t.reason).toBe((site.kind as { lockedReason: string }).lockedReason);
  });

  it('kit portraits and habitat resolve for both forms of the six; the chosen form is presentation memory', () => {
    const { d } = grove();
    for (const [b, u] of [['pegasus', 'dawncrest_pegasus'], ['root_runner', 'crownroot_runner'], ['serpopard', 'crested_serpopard'], ['baku', 'dreamtusk_baku'], ['afanc', 'ridgeback_afanc'], ['ahuitzotl', 'crownfin_ahuitzotl']]) {
      expect(hasKitPortrait(d.catalog, b!), b).toBe(true);
      expect(hasKitPortrait(d.catalog, u!), u).toBe(true);
      expect(creatureHabitat(d.catalog, u!)).toBe(NEUTRAL_V2_HABITATS[b!]!.habitat);
    }
    expect(creatureHabitat(d.catalog, 'centaur_sentinel')).toBeNull();
    expect(campForm('m', 's')).toBeNull();
    rememberCampForm('m', 's', 'crownroot_runner');
    expect(campForm('m', 's')).toBe('crownroot_runner');
    rememberCampForm('m', 's', null);
    expect(campForm('m', 's')).toBeNull();
  });
});
