/**
 * The seven-mission campaign arc of The Winter Oath, made reusable (owner
 * request 2026-10-02: "The Winter Oath set-up can be reused, so each one is
 * mostly writing and map work").
 *
 * Each builder below is one mission shape — Restore, Hunt, Covenant, Seek,
 * Rival, Refuge, Finale — with the objective order, the site kinds, the war-band
 * and the economy of the matching Winter Oath mission. A campaign supplies the
 * writing (names, descriptions, briefings, scenes, map events), the creatures
 * of each guard and the map layout (positions, barriers, biome); the builder
 * derives the map template's anchors from the sites, so the two always agree.
 *
 * Everything built here is PROPOSED and unplaytested (values copied from the
 * Winter Oath, which passed its headless journey; the new campaigns' own
 * journeys are in packages/campaign/test/arcCampaigns.test.ts).
 */
import type {
  BattlefieldArchetype,
  CampaignDefinition,
  CommanderSpec,
  DialogueLine,
  EntitlementDefinition,
  HelpTopicDefinition,
  HeroDefinition,
  HexCoord,
  MapBarrierDefinition,
  MapEventOptionDefinition,
  MapTemplateDefinition,
  MissionDefinition,
  MissionRivalSetup,
  ObjectiveDefinition,
  RewardDefinition,
  ResourceCost,
  SiteDefinition,
  StackSpec,
  StorySceneDefinition,
  HostileHeroDefinition,
} from '@pr/rules';

type Biome = MapTemplateDefinition['biome'];
/** [creatureId, count] pairs. */
export type Army = readonly (readonly [string, number])[];
export type At = readonly [number, number];

const stacks = (a: Army): StackSpec[] => a.map(([creatureId, count]) => ({ creatureId, count }));

// ---------------------------------------------------------------------------
// The campaign context: pantheon, hero, gods, creatures and building names
// ---------------------------------------------------------------------------

export interface ArcCampaignContext {
  /** Campaign ID; mission IDs are `<id>_m01` … `<id>_m07`. */
  readonly id: string;
  readonly pantheonId: string;
  readonly archetypeId: string;
  readonly hero: { readonly heroId: string; readonly definitionId: string; readonly classId: string; readonly name: string };
  /** The patron (fixed) and the two minor-god groups, in content order. */
  readonly gods: { readonly patron: string; readonly first: readonly string[]; readonly second: readonly string[] };
  /** Base and upgraded creature IDs per tier (index 1–7). */
  readonly t: readonly { readonly base: string; readonly up: string }[];
  /** Family IDs of the covenant-gated dwellings: tier 3 (mission 3) and tier 6 (mission 6). */
  readonly covenantT3: string;
  readonly covenantT6: string;
  readonly covenantT7: string;
  /** The enemy host (hostile player of the wandering bands). */
  readonly hostName: string;
  readonly hiringReason: string;
  readonly debriefPolicy: readonly string[];
  /** Golden-seed base for the seven templates. */
  readonly seed: number;
  /** Creature names from the catalog (descriptions name the troops). */
  readonly names: (creatureId: string) => { readonly name: string; readonly pluralName: string } | undefined;
  /** Family of a creature (population pools are keyed by family). */
  readonly familyOf: (creatureId: string) => string;
}

/** Building ID of a town location level (kit naming: `<pantheon>_<slot>_l<n>`). */
export const bld = (ctx: ArcCampaignContext, slot: string, level = 1) => `${ctx.pantheonId}_${slot}_l${level}`;
const dw = (ctx: ArcCampaignContext, tier: number, level = 1) => bld(ctx, `dwelling_t${tier}`, level);

/** A dialogue-line maker for one speaker of a pantheon (placeholder portrait by name). */
export function speaker(pantheonId: string, name: string, slug = name.toLowerCase().replace(/^the /, '').replace(/[^a-z]+/g, '_')) {
  return (text: string): DialogueLine => ({ speaker: name, portraitAssetId: `hero.${pantheonId}.${slug}.portrait`, text });
}

/** Covenant entitlements granted in missions 3 and 6. */
export function arcEntitlements(ctx: ArcCampaignContext, names: { readonly t3: string; readonly t6: string }, summaries: { readonly t3: string; readonly t6: string }): EntitlementDefinition[] {
  return [
    { id: `covenant.${ctx.covenantT3}.${ctx.id}3`, name: names.t3, kind: 'covenant', familyId: ctx.covenantT3, summary: summaries.t3 },
    { id: `covenant.${ctx.covenantT6}.${ctx.id}6`, name: names.t6, kind: 'covenant', familyId: ctx.covenantT6, summary: summaries.t6 },
  ];
}

/** A campaign opponent (never hireable) or the campaign's own hero, as a catalog hero. */
export function arcHero(pantheonId: string, id: string, name: string, title: string, classId: string, biography: string, availability: 'enemy' | 'campaign'): HeroDefinition {
  return {
    id,
    pantheonId,
    name,
    title,
    classId,
    biography,
    portraitAssetId: `hero.${pantheonId}.${id.replace(`${pantheonId}_`, '')}.portrait`,
    availability,
    provenance: { source: 'proposed-this-build', note: 'Campaign character (owner request 2026-10-02: campaigns for the four remaining pantheons).' },
  };
}

/** Commander presets copied from The Winter Oath's opponents (mission 4 patrol, 6 gate, 7 patrol and boss). */
export type CommanderPreset = 'patrol4' | 'gate6' | 'patrol7' | 'boss7';
export function arcCommander(hero: HeroDefinition, preset: CommanderPreset, spellIds: readonly string[] = []): CommanderSpec {
  const p = {
    patrol4: { level: 3, attributes: { attack: 3, defense: 3, power: 1, knowledge: 1 }, skills: [{ skillId: 'offense', rank: 1 }, { skillId: 'armorer', rank: 1 }], mana: 10 },
    gate6: { level: 6, attributes: { attack: 5, defense: 4, power: 1, knowledge: 1 }, skills: [{ skillId: 'offense', rank: 2 }, { skillId: 'armorer', rank: 1 }, { skillId: 'tactics', rank: 1 }], mana: 10 },
    patrol7: { level: 4, attributes: { attack: 4, defense: 3, power: 1, knowledge: 1 }, skills: [{ skillId: 'offense', rank: 1 }, { skillId: 'armorer', rank: 1 }, { skillId: 'tactics', rank: 1 }], mana: 10 },
    boss7: { level: 7, attributes: { attack: 6, defense: 5, power: 2, knowledge: 2 }, skills: [{ skillId: 'offense', rank: 2 }, { skillId: 'armorer', rank: 2 }, { skillId: 'tactics', rank: 1 }], mana: 20 },
  }[preset];
  return { heroDefinitionId: hero.id, name: hero.name, classId: hero.classId, ...p, spellbook: spellIds.length > 0, spellIds, portraitAssetId: hero.portraitAssetId };
}

// ---------------------------------------------------------------------------
// Shared writing and site helpers
// ---------------------------------------------------------------------------

export interface Named {
  readonly name: string;
  readonly description: string;
}
export interface EventSpec extends Named {
  readonly title: string;
  readonly text: string;
  readonly options: readonly MapEventOptionDefinition[];
}
export interface GuardSpec {
  readonly label: string;
  readonly army: Army;
  readonly reward: RewardDefinition;
  readonly battlefield: BattlefieldArchetype;
  readonly commander?: CommanderSpec;
}
/** Writing shared by every mission. */
export interface MissionWriting {
  readonly name: string;
  readonly summary: string;
  readonly newDecisions: readonly string[];
  readonly briefing: readonly DialogueLine[];
  readonly victory: readonly DialogueLine[];
  readonly help?: readonly HelpTopicDefinition[];
  readonly town: Named & { readonly townId: string };
  readonly biome: Biome;
  readonly soundscape: 'coast' | 'high_pass' | 'storm_plateau';
}

interface Built {
  readonly template: MapTemplateDefinition;
  readonly mission: MissionDefinition;
}

const site = (id: string, at: At, n: Named, kind: SiteDefinition['kind'], extra: Partial<SiteDefinition> = {}): SiteDefinition => ({
  id,
  anchorId: id,
  coord: { q: at[0], r: at[1] },
  name: n.name,
  description: n.description,
  kind,
  ...extra,
});

const RES = {
  sawmill: { name: 'Sawmill', resource: 'wood' as const, dailyYield: 2, description: 'An unowned timber camp. Capture for +2 Wood per day.' },
  quarry: { name: 'Quarry', resource: 'stone' as const, dailyYield: 2, description: 'An unowned quarry. Capture for +2 Stone per day.' },
  gold_mine: { name: 'Gold Mine', resource: 'gold' as const, dailyYield: 1000, description: 'An unowned mine. Capture for +1,000 Gold per day.' },
  crystal_deposit: { name: 'Crystal Deposit', resource: 'crystal' as const, dailyYield: 1, description: 'An unowned crystal outcrop. Capture for +1 Crystal per day.' },
};
const res = (id: string, at: At, type: keyof typeof RES, guard?: GuardSpec): SiteDefinition =>
  site(id, at, RES[type], { type: 'resource_site', siteType: type, resource: RES[type].resource, dailyYield: RES[type].dailyYield }, guard ? { guard: g(guard) } : {});
const g = (s: GuardSpec) => ({ label: s.label, army: stacks(s.army), reward: s.reward, battlefield: s.battlefield, ...(s.commander ? { commander: s.commander } : {}) });
const event = (id: string, at: At, e: EventSpec, objectiveIds?: string[]): SiteDefinition =>
  site(id, at, e, { type: 'map_event', title: e.title, text: e.text, options: e.options }, objectiveIds ? { objectiveIds } : {});

/** Every site is an anchor of the template, so sites and template always agree. */
function template(ctx: ArcCampaignContext, n: number, size: readonly [number, number], barriers: readonly MapBarrierDefinition[], sites: readonly SiteDefinition[], roads: readonly (readonly [string, string])[], biome: Biome, patrolLoop?: readonly HexCoord[]): MapTemplateDefinition {
  return {
    id: `${ctx.id}_m0${n}_v1`,
    version: 1,
    width: size[0],
    height: size[1],
    goldenSeed: ctx.seed + n * 101,
    barriers,
    anchors: sites.map((s) => ({ id: s.anchorId, coord: s.coord })),
    roadEdges: roads,
    ...(patrolLoop ? { patrolLoop } : {}),
    biome,
  };
}

function missionBase(ctx: ArcCampaignContext, n: number, kind: string, w: MissionWriting, playtime: string, xpCap: number | null, xpCapLevel: number | null) {
  return {
    id: `${ctx.id}_m0${n}`,
    scenarioId: `${ctx.id}_m0${n}`,
    campaignId: ctx.id,
    order: n,
    name: w.name,
    subtitle: `Mission ${n} — ${kind}`,
    summary: w.summary,
    mapTemplateId: `${ctx.id}_m0${n}_v1`,
    soundscape: w.soundscape,
    targetPlaytime: playtime,
    newDecisions: w.newDecisions,
    xpCap,
    xpCapLevel,
    briefing: w.briefing,
    victory: w.victory,
    debriefPolicy: ctx.debriefPolicy,
    signatureMechanics: true,
    features: { expandedContent: true, heroSpecialties: true },
    heroHiringEnabled: false,
    heroHiringDisabledReason: ctx.hiringReason,
    protectedHeroFailure: true,
    thumbnailAssetId: `mission.${ctx.id}.m0${n}.thumbnail`,
  } as const;
}

function player(ctx: ArcCampaignContext, w: MissionWriting, siteId: string, wallet: ResourceCost, buildings: readonly string[], population: Record<string, number>, covenants: readonly string[], heroDefaults: MissionDefinition['player']['hero']['defaults'], army: Army): MissionDefinition['player'] {
  return {
    playerId: 'player',
    name: w.town.name,
    pantheonId: ctx.pantheonId,
    wallet,
    town: { townId: w.town.townId, siteId, name: w.town.name, archetypeId: ctx.archetypeId, buildings, population, covenants },
    hero: { heroId: ctx.hero.heroId, definitionId: ctx.hero.definitionId, classId: ctx.hero.classId, defaults: heroDefaults, army: stacks(army), startTownId: w.town.townId },
  };
}

const O = (o: ObjectiveDefinition) => o;
const locked = (id: string, title: string, description: string, requires: readonly string[], condition: ObjectiveDefinition['condition'], extra: Partial<ObjectiveDefinition> = {}): ObjectiveDefinition =>
  O({ id, title, description, category: 'primary', initialStatus: 'locked', requires, condition, ...extra });
const optional = (id: string, title: string, description: string, condition: ObjectiveDefinition['condition'], markerSiteId?: string): ObjectiveDefinition =>
  O({ id, title, description, category: 'optional', initialStatus: 'active', condition, ...(markerSiteId ? { markerSiteId } : {}) });

/** A monster band roaming around `home` (radius 3) through `waypoints`. */
function band(heroDefinitionId: string, name: string, portraitAssetId: string, home: At, waypoints: readonly At[], army: Army, bounty: ResourceCost, minQ: number, maxQ: number): HostileHeroDefinition {
  return {
    commander: { heroDefinitionId, name, classId: 'champion', level: 1, attributes: { attack: 0, defense: 0, power: 0, knowledge: 0 }, skills: [], spellbook: false, spellIds: [], mana: 0, portraitAssetId },
    monster: { bounty },
    startCoord: { q: home[0], r: home[1] },
    army: stacks(army),
    ai: { profile: 'patrol', waypoints: waypoints.map(([q, r]) => ({ q, r })), regionMinQ: minQ, regionMaxQ: maxQ, regionCenter: { q: home[0], r: home[1] }, regionRadius: 3, attackThreshold: { numerator: 3, denominator: 2 } },
  };
}

/** A commanded patrol (a hostile hero with skills) that keeps between two columns. */
function patrol(commander: CommanderSpec, start: At, waypoints: readonly At[], army: Army, minQ: number, maxQ: number): HostileHeroDefinition {
  return {
    commander,
    startCoord: { q: start[0], r: start[1] },
    army: stacks(army),
    ai: { profile: 'patrol', waypoints: waypoints.map(([q, r]) => ({ q, r })), regionMinQ: minQ, regionMaxQ: maxQ, attackThreshold: { numerator: 11, denominator: 10 } },
  };
}

const IN_ORDER: HelpTopicDefinition = { id: 'in_order', title: 'Steps in order', text: 'Each primary step opens after the one before it. Work done early still counts: a step whose goal is already met completes the moment it opens.' };

// ---------------------------------------------------------------------------
// Mission 1 — Restore
// ---------------------------------------------------------------------------

export interface RestoreSpec extends MissionWriting {
  readonly barrier: 'water' | 'mountain';
  readonly event: EventSpec;
  readonly camp: Named & { readonly creatureId: string };
  readonly crossing: Named & { readonly guard: GuardSpec };
  readonly cache: Named & { readonly reward: RewardDefinition };
  readonly monument: Named & { readonly guard: GuardSpec; readonly confirm: string };
  readonly objectives: { readonly recruit: string; readonly train: string; readonly crossing: string; readonly guard: string; readonly activate: string; readonly event: string };
  readonly scenes: (ids: { crossing: string; monument: string }) => readonly StorySceneDefinition[];
}

export function restoreMission(ctx: ArcCampaignContext, s: RestoreSpec): Built {
  const P = 'm01';
  const ids = { town: `${P}_town`, sawmill: `${P}_sawmill`, quarry: `${P}_quarry`, event: `${P}_event`, camp: `${P}_camp`, crossing: `${P}_crossing`, cache: `${P}_cache`, monument: `${P}_monument` };
  const t1 = ctx.t[1]!;
  const sites: SiteDefinition[] = [
    site(ids.town, [3, 7], s.town, { type: 'town', townId: s.town.townId }),
    res(ids.sawmill, [4, 3], 'sawmill'),
    res(ids.quarry, [5, 11], 'quarry'),
    event(ids.event, [7, 5], s.event, [`${P}_event`]),
    site(ids.camp, [8, 2], s.camp, { type: 'creature_camp', creatureId: s.camp.creatureId, weeklyGrowth: 3, initialStock: 5 }),
    site(ids.crossing, [10, 8], s.crossing, { type: 'crossing' }, { guard: g(s.crossing.guard), objectiveIds: [`${P}_crossing`] }),
    site(ids.cache, [14, 11], s.cache, { type: 'pickup', reward: s.cache.reward }),
    site(
      ids.monument,
      [16, 7],
      s.monument,
      {
        type: 'activation',
        label: 'beacon',
        cost: { gold: 300, stone: 3, crystal: 1 },
        requirements: [
          { type: 'objective_completed', objectiveId: `${P}_recruit` },
          { type: 'objective_completed', objectiveId: `${P}_train` },
        ],
        reward: { questXp: 900 },
        completesMission: true,
        confirmText: s.monument.confirm,
      },
      { guard: g(s.monument.guard), objectiveIds: [`${P}_guard`, `${P}_activate`] },
    ),
  ];
  const objectives: ObjectiveDefinition[] = [
    O({ id: `${P}_recruit`, title: s.objectives.recruit, description: '', category: 'primary', initialStatus: 'active', condition: { type: 'counter_at_least', counter: `recruited:${t1.base}`, value: 10 } }),
    locked(`${P}_train`, s.objectives.train, '', [`${P}_recruit`], { type: 'counter_at_least', counter: `trained:${t1.base}`, value: 8 }),
    locked(`${P}_crossing`, s.objectives.crossing, '', [`${P}_train`], { type: 'site_cleared', siteId: ids.crossing }, { markerSiteId: ids.crossing }),
    locked(`${P}_guard`, s.objectives.guard, '', [`${P}_crossing`], { type: 'site_cleared', siteId: ids.monument }, { markerSiteId: ids.monument }),
    locked(`${P}_activate`, s.objectives.activate, '', [`${P}_guard`], { type: 'site_activated', siteId: ids.monument }, { markerSiteId: ids.monument }),
    optional(`${P}_event`, s.objectives.event, s.event.description, { type: 'site_visited', siteId: ids.event }, ids.event),
  ];
  return {
    template: template(ctx, 1, [20, 14], [{ q: 10, terrain: s.barrier, openings: [{ q: 10, r: 8 }] }], sites, [
      [ids.town, ids.crossing],
      [ids.crossing, ids.monument],
      [ids.town, ids.sawmill],
      [ids.town, ids.quarry],
      [ids.town, ids.event],
      [ids.sawmill, ids.camp],
      [ids.monument, ids.cache],
    ], s.biome),
    mission: {
      ...missionBase(ctx, 1, 'Restore', s, '15–20 minutes (target, unmeasured)', 3199, 3),
      storyScenes: s.scenes({ crossing: ids.crossing, monument: ids.monument }),
      player: player(
        ctx,
        s,
        ids.town,
        { gold: 5000, wood: 12, stone: 18, crystal: 2, favor: 0 },
        [bld(ctx, 'civic_hall'), bld(ctx, 'tavern'), bld(ctx, 'fortifications'), dw(ctx, 1), bld(ctx, 'mage_guild')],
        { [familyOf(ctx, 1)]: 14 },
        [],
        { level: 1, xp: 0, attributes: { attack: 1, defense: 1, power: 2, knowledge: 2 }, skills: [{ skillId: 'wisdom', rank: 1 }], spellbook: true },
        [
          [t1.base, 18],
          [ctx.t[2]!.base, 6],
        ],
      ),
      purchasableBuildingIds: [dw(ctx, 1, 2), dw(ctx, 2), bld(ctx, 'civic_hall', 2), bld(ctx, 'marketplace'), bld(ctx, 'workshop'), bld(ctx, 'pantheon_temple')],
      committableGodIds: ctx.gods.first,
      sites,
      objectives: describe(objectives, {
        [`${P}_recruit`]: `Recruit at least 10 ${nameOf(ctx, t1.base)} in ${s.town.name}. Starting troops and creatures that join on the map do not count.`,
        [`${P}_train`]: `Build the upgraded dwelling, then train at least 8 ${nameOf(ctx, t1.base)} into ${nameOf(ctx, t1.up)}.`,
        [`${P}_crossing`]: `Defeat ${armyText(ctx, s.crossing.guard.army)} at ${s.crossing.name}.`,
        [`${P}_guard`]: `Defeat ${armyText(ctx, s.monument.guard.army)} at ${s.monument.name}.`,
        [`${P}_activate`]: `At ${s.monument.name}, with its guard broken and both muster steps met, pay 300 Gold, 3 Stone and 1 Crystal.`,
      }),
      hostileHeroes: [],
      helpTopics: [
        IN_ORDER,
        { id: 'upgrade_vs_training', title: 'Dwelling upgrade vs. troop training', text: 'Upgrading a dwelling unlocks the upgraded form. Training converts existing troops in town for the price difference and uses no population.' },
        { id: 'map_events', title: 'One-time choices', text: 'Some places offer a choice the first time a hero arrives. The result of each option is shown before you choose, and the choice cannot be taken back.' },
        ...(s.help ?? []),
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// Mission 2 — Hunt
// ---------------------------------------------------------------------------

export interface HuntSpec extends MissionWriting {
  readonly barrier: 'water' | 'mountain';
  readonly lookout: Named;
  readonly event: EventSpec;
  readonly camp: Named & { readonly creatureId: string };
  readonly bridge: Named & { readonly guard: GuardSpec };
  readonly lair: Named & { readonly guard: GuardSpec };
  readonly stone: Named & { readonly confirm: string };
  readonly prey: { readonly id: string; readonly name: string; readonly portraitAssetId: string; readonly army: Army; readonly bounty: ResourceCost };
  readonly objectives: { readonly recruit: string; readonly lookout: string; readonly bridge: string; readonly prey: string; readonly preyHint: string; readonly activate: string; readonly lair: string; readonly event: string };
  readonly scenes: (ids: { lookout: string; prey: string; preyObjective: string }) => readonly StorySceneDefinition[];
}

export function huntMission(ctx: ArcCampaignContext, s: HuntSpec): Built {
  const P = 'm02';
  const ids = { town: `${P}_town`, sawmill: `${P}_sawmill`, quarry: `${P}_quarry`, lookout: `${P}_lookout`, event: `${P}_event`, camp: `${P}_camp`, bridge: `${P}_bridge`, lair: `${P}_lair`, crystal: `${P}_crystal`, stone: `${P}_stone` };
  const t2 = ctx.t[2]!;
  const sites: SiteDefinition[] = [
    site(ids.town, [3, 8], s.town, { type: 'town', townId: s.town.townId }),
    res(ids.sawmill, [4, 4], 'sawmill'),
    res(ids.quarry, [5, 12], 'quarry'),
    site(ids.lookout, [8, 5], s.lookout, { type: 'watchtower', revealSiteIds: [ids.lair, ids.stone] }, { objectiveIds: [`${P}_lookout`] }),
    event(ids.event, [9, 2], s.event, [`${P}_event`]),
    site(ids.camp, [8, 12], s.camp, { type: 'creature_camp', creatureId: s.camp.creatureId, weeklyGrowth: 3, initialStock: 4 }),
    site(ids.bridge, [12, 8], s.bridge, { type: 'crossing' }, { guard: g(s.bridge.guard), objectiveIds: [`${P}_bridge`] }),
    site(ids.lair, [17, 3], s.lair, { type: 'landmark', landmark: 'refuge' }, { guard: g(s.lair.guard), markerHiddenUntilRevealed: true, objectiveIds: [`${P}_lair`] }),
    res(ids.crystal, [16, 13], 'crystal_deposit'),
    site(
      ids.stone,
      [21, 8],
      s.stone,
      {
        type: 'activation',
        label: 'beacon',
        cost: { gold: 400, stone: 4, crystal: 1 },
        requirements: [{ type: 'objective_completed', objectiveId: `${P}_prey` }],
        reward: { questXp: 1400 },
        completesMission: true,
        confirmText: s.stone.confirm,
      },
      { markerHiddenUntilRevealed: true, objectiveIds: [`${P}_activate`] },
    ),
  ];
  const objectives: ObjectiveDefinition[] = [
    O({ id: `${P}_recruit`, title: s.objectives.recruit, description: `Build the tier-2 dwelling in ${s.town.name} and recruit at least 8 ${nameOf(ctx, t2.base)}. Creatures bought at camps do not count.`, category: 'primary', initialStatus: 'active', condition: { type: 'counter_at_least', counter: `recruited:${t2.base}`, value: 8 } }),
    locked(`${P}_lookout`, s.objectives.lookout, `Climb ${s.lookout.name} to see the land beyond the river.`, [`${P}_recruit`], { type: 'site_visited', siteId: ids.lookout }, { markerSiteId: ids.lookout }),
    locked(`${P}_bridge`, s.objectives.bridge, `Defeat ${armyText(ctx, s.bridge.guard.army)} at ${s.bridge.name}.`, [`${P}_lookout`], { type: 'site_cleared', siteId: ids.bridge }, { markerSiteId: ids.bridge }),
    locked(`${P}_prey`, s.objectives.prey, `Catch and defeat ${s.prey.name} (${armyText(ctx, s.prey.army)}) beyond the river.`, [`${P}_bridge`], { type: 'hero_defeated', heroDefinitionId: s.prey.id }, { hint: s.objectives.preyHint }),
    locked(`${P}_activate`, s.objectives.activate, `With ${s.prey.name} broken, pay 400 Gold, 4 Stone and 1 Crystal at ${s.stone.name}.`, [`${P}_prey`], { type: 'site_activated', siteId: ids.stone }, { markerSiteId: ids.stone }),
    optional(`${P}_lair`, s.objectives.lair, `Defeat ${armyText(ctx, s.lair.guard.army)} at ${s.lair.name}.`, { type: 'site_cleared', siteId: ids.lair }, ids.lair),
    optional(`${P}_event`, s.objectives.event, s.event.description, { type: 'site_visited', siteId: ids.event }, ids.event),
  ];
  return {
    template: template(
      ctx,
      2,
      [24, 16],
      [{ q: 12, terrain: s.barrier, openings: [{ q: 12, r: 8 }] }],
      sites,
      [
        [ids.town, ids.bridge],
        [ids.bridge, ids.stone],
        [ids.town, ids.sawmill],
        [ids.town, ids.quarry],
        [ids.town, ids.lookout],
        [ids.lookout, ids.event],
        [ids.quarry, ids.camp],
        [ids.bridge, ids.lair],
        [ids.stone, ids.crystal],
      ],
      s.biome,
      [
        { q: 16, r: 7 },
        { q: 18, r: 8 },
        { q: 17, r: 10 },
        { q: 15, r: 9 },
      ],
    ),
    mission: {
      ...missionBase(ctx, 2, 'Hunt', s, '20–25 minutes (target, unmeasured)', 4599, 4),
      storyScenes: s.scenes({ lookout: ids.lookout, prey: s.prey.id, preyObjective: `${P}_prey` }),
      player: player(
        ctx,
        s,
        ids.town,
        { gold: 8000, wood: 20, stone: 25, crystal: 5, favor: 5 },
        [bld(ctx, 'civic_hall'), bld(ctx, 'tavern'), bld(ctx, 'marketplace'), bld(ctx, 'fortifications'), dw(ctx, 1), dw(ctx, 1, 2), bld(ctx, 'workshop'), bld(ctx, 'mage_guild'), bld(ctx, 'pantheon_temple')],
        { [familyOf(ctx, 1)]: 14 },
        [],
        { level: 2, xp: 1100, attributes: { attack: 1, defense: 1, power: 3, knowledge: 2 }, skills: [{ skillId: 'wisdom', rank: 1 }, { skillId: 'armorer', rank: 1 }], spellbook: true },
        [
          [ctx.t[1]!.base, 24],
          [ctx.t[1]!.up, 12],
          [t2.base, 8],
        ],
      ),
      hostilePlayer: { playerId: 'arc_host', name: ctx.hostName },
      purchasableBuildingIds: [dw(ctx, 2), dw(ctx, 2, 2), bld(ctx, 'civic_hall', 2), bld(ctx, 'resource_depot'), bld(ctx, 'mage_guild', 2), bld(ctx, 'training_academy')],
      committableGodIds: ctx.gods.first,
      sites,
      objectives,
      hostileHeroes: [band(s.prey.id, s.prey.name, s.prey.portraitAssetId, [17, 8], [[16, 7], [18, 8], [17, 10], [15, 9]], s.prey.army, s.prey.bounty, 13, 22)],
      helpTopics: [
        IN_ORDER,
        { id: 'wandering', title: 'Wandering bands', text: 'A wandering band stays near its hunting ground, moves after your turn and attacks only an army it judges clearly weaker. Move onto it to fight it.' },
        { id: 'lookout', title: 'Lookouts', text: 'Climbing a lookout marks distant sites on your map, so you can plan a route before you can see them.' },
        { id: 'camps', title: 'Creature camps', text: 'A camp sells its creatures to a visiting hero at their normal price. Its stock grows every week.' },
        ...(s.help ?? []),
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// Mission 3 — Covenant
// ---------------------------------------------------------------------------

export interface CovenantSpec extends MissionWriting {
  readonly cache: Named & { readonly reward: RewardDefinition };
  readonly pass: Named & { readonly guard: GuardSpec };
  readonly roost: Named & { readonly guard: GuardSpec };
  readonly hearth: Omit<EventSpec, 'options'> & { readonly price: ResourceCost; readonly payLabel: string; readonly refuseLabel: string };
  readonly home: Named & { readonly guard: GuardSpec };
  readonly bridge: Named & { readonly guard: GuardSpec };
  readonly stone: Named & { readonly confirm: string };
  readonly band: { readonly id: string; readonly name: string; readonly army: Army };
  readonly objectives: { readonly pass: string; readonly roost: string; readonly covenant: string; readonly covenantDescription: string; readonly god: string; readonly elite: string; readonly activate: string; readonly cache: string };
  readonly scenes: (ids: { roost: string; home: string; covenant: string; god: string }) => readonly StorySceneDefinition[];
}

export function covenantMission(ctx: ArcCampaignContext, s: CovenantSpec): Built {
  const P = 'm03';
  const ids = { town: `${P}_town`, sawmill: `${P}_sawmill`, quarry: `${P}_quarry`, cache: `${P}_cache`, pass: `${P}_pass`, roost: `${P}_roost`, crystal: `${P}_crystal`, hearth: `${P}_hearth`, home: `${P}_home`, bridge: `${P}_bridge`, stone: `${P}_stone` };
  const covenant = `covenant.${ctx.covenantT3}.${ctx.id}3`;
  const t4 = ctx.t[4]!;
  const sites: SiteDefinition[] = [
    site(ids.town, [3, 9], s.town, { type: 'town', townId: s.town.townId }),
    res(ids.sawmill, [5, 5], 'sawmill'),
    res(ids.quarry, [5, 13], 'quarry'),
    site(ids.cache, [8, 15], s.cache, { type: 'pickup', reward: s.cache.reward }, { objectiveIds: [`${P}_cache`] }),
    site(ids.pass, [13, 9], s.pass, { type: 'crossing' }, { guard: g(s.pass.guard), objectiveIds: [`${P}_pass`] }),
    site(ids.roost, [17, 4], s.roost, { type: 'creature_camp', creatureId: t4.base, weeklyGrowth: 2, initialStock: 3 }, { guard: g(s.roost.guard), objectiveIds: [`${P}_roost`] }),
    res(ids.crystal, [16, 9], 'crystal_deposit'),
    site(ids.hearth, [15, 13], s.hearth, {
      type: 'map_event',
      title: s.hearth.title,
      text: s.hearth.text,
      options: [
        { label: s.hearth.payLabel, summary: `Pay ${costText(s.hearth.price)}: gain the covenant.`, cost: s.hearth.price, reward: { entitlementIds: [covenant], flags: ['covenant_bargain'] } },
        { label: s.hearth.refuseLabel, summary: `Nothing is paid. The covenant must be won at ${s.home.name}.`, reward: {} },
      ],
    }),
    site(ids.home, [17, 15], s.home, { type: 'landmark', landmark: 'refuge' }, { guard: g({ ...s.home.guard, reward: { ...s.home.guard.reward, entitlementIds: [covenant] } }) }),
    site(ids.bridge, [20, 9], s.bridge, { type: 'crossing' }, { guard: g(s.bridge.guard) }),
    site(
      ids.stone,
      [23, 9],
      s.stone,
      {
        type: 'activation',
        label: 'beacon',
        cost: { gold: 500, crystal: 2 },
        requirements: [
          { type: 'objective_completed', objectiveId: `${P}_god` },
          { type: 'objective_completed', objectiveId: `${P}_elite` },
        ],
        reward: { questXp: 2000 },
        completesMission: true,
        confirmText: s.stone.confirm,
      },
      { objectiveIds: [`${P}_activate`] },
    ),
  ];
  const objectives: ObjectiveDefinition[] = [
    O({ id: `${P}_pass`, title: s.objectives.pass, description: `Defeat ${armyText(ctx, s.pass.guard.army)} at ${s.pass.name}.`, category: 'primary', initialStatus: 'active', condition: { type: 'site_cleared', siteId: ids.pass }, markerSiteId: ids.pass }),
    locked(`${P}_roost`, s.objectives.roost, `Drive ${armyText(ctx, s.roost.guard.army)} out of ${s.roost.name}.`, [`${P}_pass`], { type: 'site_cleared', siteId: ids.roost }, { markerSiteId: ids.roost }),
    locked(`${P}_covenant`, s.objectives.covenant, s.objectives.covenantDescription, [`${P}_roost`], { type: 'any', conditions: [{ type: 'flag', flag: 'covenant_bargain' }, { type: 'site_cleared', siteId: ids.home }] }, { hint: 'Both routes give the same covenant. The fight gives experience; the bargain saves troops. Assign the covenant to your town to build its dwelling.' }),
    locked(`${P}_god`, s.objectives.god, 'Build the Temple’s second level and commit to a first minor god (20 Favor, irreversible).', [`${P}_covenant`], { type: 'player_has_minor_god' }, { hint: 'Open the Pantheon screen once the Temple stands at its second level. A god chosen earlier counts as soon as this step opens.' }),
    locked(`${P}_elite`, s.objectives.elite, `Have at least 2 ${nameOf(ctx, t4.up)} in ${ctx.hero.name}’s army.`, [`${P}_god`], { type: 'hero_army_contains', heroId: ctx.hero.heroId, creatureId: t4.up, count: 2 }, { live: true, hint: 'Build the tier-4 dwelling and its upgrade, then recruit or train.' }),
    locked(`${P}_activate`, s.objectives.activate, `Cross ${s.bridge.name} and, with a god chosen and the elite in the army, pay 500 Gold and 2 Crystal at ${s.stone.name}.`, [`${P}_elite`], { type: 'site_activated', siteId: ids.stone }, { markerSiteId: ids.stone }),
    optional(`${P}_cache`, s.objectives.cache, s.cache.description, { type: 'site_visited', siteId: ids.cache }, ids.cache),
  ];
  return {
    template: template(
      ctx,
      3,
      [26, 18],
      [
        { q: 13, terrain: 'mountain', openings: [{ q: 13, r: 9 }] },
        { q: 20, terrain: 'water', openings: [{ q: 20, r: 9 }] },
      ],
      sites,
      [
        [ids.town, ids.pass],
        [ids.pass, ids.crystal],
        [ids.crystal, ids.bridge],
        [ids.bridge, ids.stone],
        [ids.pass, ids.roost],
        [ids.pass, ids.hearth],
        [ids.hearth, ids.home],
        [ids.town, ids.sawmill],
        [ids.town, ids.quarry],
        [ids.quarry, ids.cache],
      ],
      s.biome,
    ),
    mission: {
      ...missionBase(ctx, 3, 'Covenant', s, '25–30 minutes (target, unmeasured)', 6199, 5),
      storyScenes: s.scenes({ roost: ids.roost, home: ids.home, covenant: `${P}_covenant`, god: `${P}_god` }),
      player: player(
        ctx,
        s,
        ids.town,
        { gold: 11000, wood: 25, stone: 30, crystal: 8, favor: 15 },
        [bld(ctx, 'civic_hall'), bld(ctx, 'civic_hall', 2), bld(ctx, 'tavern'), bld(ctx, 'marketplace'), bld(ctx, 'fortifications'), dw(ctx, 1), dw(ctx, 1, 2), dw(ctx, 2), dw(ctx, 2, 2), bld(ctx, 'workshop'), bld(ctx, 'mage_guild'), bld(ctx, 'pantheon_temple')],
        { [familyOf(ctx, 1)]: 14, [familyOf(ctx, 2)]: 9 },
        [],
        { level: 3, xp: 2500, attributes: { attack: 1, defense: 2, power: 3, knowledge: 3 }, skills: [{ skillId: 'wisdom', rank: 1 }, { skillId: 'armorer', rank: 1 }, { skillId: 'leadership', rank: 1 }], spellbook: true },
        [
          [ctx.t[1]!.base, 20],
          [ctx.t[1]!.up, 18],
          [ctx.t[2]!.base, 8],
          [ctx.t[2]!.up, 4],
        ],
      ),
      hostilePlayer: { playerId: 'arc_host', name: ctx.hostName },
      purchasableBuildingIds: [bld(ctx, 'pantheon_temple', 2), dw(ctx, 4), dw(ctx, 4, 2), dw(ctx, 3), dw(ctx, 3, 2), bld(ctx, 'mage_guild', 2), bld(ctx, 'resource_depot'), bld(ctx, 'training_academy'), bld(ctx, 'fortifications', 2)],
      committableGodIds: ctx.gods.first,
      sites,
      objectives,
      hostileHeroes: [band(s.band.id, s.band.name, `creature.${ctx.pantheonId}.tier2.base.portrait`, [10, 4], [[9, 3], [11, 5], [10, 6]], s.band.army, { gold: 400 }, 7, 12)],
      helpTopics: [
        IN_ORDER,
        { id: 'covenant', title: 'Covenants', text: 'Some dwellings need a covenant. A covenant won in a mission is assigned to a town from the journal or the town screen; the dwelling can then be built there.' },
        { id: 'first_god', title: 'The first minor god', text: 'A first minor god needs the Temple’s second level and costs 20 Favor. The choice is permanent and carries into later missions.' },
        ...(s.help ?? []),
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// Mission 4 — Seek
// ---------------------------------------------------------------------------

export interface SeekSpec extends MissionWriting {
  readonly wanderer: EventSpec;
  readonly wreck: Named & { readonly reward: RewardDefinition };
  readonly landing: Named & { readonly guard: GuardSpec };
  readonly omen: EventSpec;
  readonly relays: { readonly north: Named; readonly south: Named; readonly cost: ResourceCost };
  readonly nest: Named & { readonly guard: GuardSpec };
  readonly gate: Named;
  readonly goal: Named & { readonly guard: GuardSpec; readonly confirm: string; readonly reward: RewardDefinition };
  readonly patrol: { readonly commander: CommanderSpec; readonly army: Army };
  readonly objectives: { readonly recruit: string; readonly landing: string; readonly north: string; readonly south: string; readonly gate: string; readonly goal: string; readonly nest: string; readonly wanderer: string };
  readonly scenes: (ids: { landing: string; omen: string; gate: string; goal: string }) => readonly StorySceneDefinition[];
}

export function seekMission(ctx: ArcCampaignContext, s: SeekSpec): Built {
  const P = 'm04';
  const ids = { town: `${P}_town`, sawmill: `${P}_sawmill`, quarry: `${P}_quarry`, wanderer: `${P}_wanderer`, wreck: `${P}_wreck`, landing: `${P}_landing`, omen: `${P}_omen`, north: `${P}_north`, south: `${P}_south`, nest: `${P}_nest`, gate: `${P}_gate`, goal: `${P}_goal` };
  const t5 = ctx.t[5]!;
  const relay = (id: string, at: At, n: Named, flag: string): SiteDefinition =>
    site(id, at, n, { type: 'activation', label: 'relay', cost: s.relays.cost, requirements: [], reward: { flags: [flag] }, completesMission: false, confirmText: `Light ${n.name}? Both together open ${s.gate.name}.` }, { objectiveIds: [id] });
  const sites: SiteDefinition[] = [
    site(ids.town, [3, 9], s.town, { type: 'town', townId: s.town.townId }),
    res(ids.sawmill, [5, 5], 'sawmill'),
    res(ids.quarry, [5, 13], 'quarry'),
    event(ids.wanderer, [7, 3], s.wanderer, [`${P}_wanderer`]),
    site(ids.wreck, [8, 15], s.wreck, { type: 'pickup', reward: s.wreck.reward }),
    site(ids.landing, [11, 9], s.landing, { type: 'crossing' }, { guard: g(s.landing.guard), objectiveIds: [`${P}_landing`] }),
    event(ids.omen, [14, 9], s.omen),
    relay(ids.north, [15, 4], s.relays.north, 'relay_north'),
    relay(ids.south, [15, 14], s.relays.south, 'relay_south'),
    site(ids.nest, [17, 16], s.nest, { type: 'landmark', landmark: 'nest' }, { guard: g(s.nest.guard), objectiveIds: [`${P}_nest`] }),
    site(ids.gate, [19, 9], s.gate, { type: 'gate', openWhenFlags: ['relay_north', 'relay_south'] }, { objectiveIds: [`${P}_gate`] }),
    site(
      ids.goal,
      [24, 9],
      s.goal,
      { type: 'activation', label: 'beacon', cost: { gold: 500, crystal: 3 }, requirements: [{ type: 'objective_completed', objectiveId: `${P}_gate` }], reward: s.goal.reward, completesMission: true, confirmText: s.goal.confirm },
      { guard: g(s.goal.guard), objectiveIds: [`${P}_goal`] },
    ),
  ];
  const objectives: ObjectiveDefinition[] = [
    O({ id: `${P}_recruit`, title: s.objectives.recruit, description: `Recruit at least 3 ${nameOf(ctx, t5.base)} in ${s.town.name} (build the tier-5 dwelling first).`, category: 'primary', initialStatus: 'active', condition: { type: 'counter_at_least', counter: `recruited:${t5.base}`, value: 3 }, hint: 'The tier-5 dwelling needs the tier-4 dwelling and the first level of the Mage Guild.' }),
    locked(`${P}_landing`, s.objectives.landing, `Defeat ${armyText(ctx, s.landing.guard.army)} at ${s.landing.name}.`, [`${P}_recruit`], { type: 'site_cleared', siteId: ids.landing }, { markerSiteId: ids.landing }),
    locked(`${P}_north`, s.objectives.north, `Light ${s.relays.north.name} (${costText(s.relays.cost)}).`, [`${P}_landing`], { type: 'site_activated', siteId: ids.north }, { markerSiteId: ids.north }),
    locked(`${P}_south`, s.objectives.south, `Light ${s.relays.south.name} (${costText(s.relays.cost)}).`, [`${P}_landing`], { type: 'site_activated', siteId: ids.south }, { markerSiteId: ids.south }),
    locked(`${P}_gate`, s.objectives.gate, `With both lit, ${s.gate.name} opens.`, [`${P}_north`, `${P}_south`], { type: 'all', conditions: [{ type: 'flag', flag: 'relay_north' }, { type: 'flag', flag: 'relay_south' }] }, { markerSiteId: ids.gate }),
    locked(`${P}_goal`, s.objectives.goal, `Defeat ${armyText(ctx, s.goal.guard.army)} at ${s.goal.name} and pay 500 Gold and 3 Crystal.`, [`${P}_gate`], { type: 'site_activated', siteId: ids.goal }, { markerSiteId: ids.goal }),
    optional(`${P}_nest`, s.objectives.nest, `Defeat ${armyText(ctx, s.nest.guard.army)} at ${s.nest.name}.`, { type: 'site_cleared', siteId: ids.nest }, ids.nest),
    optional(`${P}_wanderer`, s.objectives.wanderer, s.wanderer.description, { type: 'site_visited', siteId: ids.wanderer }, ids.wanderer),
  ];
  return {
    template: template(
      ctx,
      4,
      [28, 18],
      [
        { q: 11, terrain: 'water', openings: [{ q: 11, r: 9 }] },
        { q: 19, terrain: 'water', openings: [{ q: 19, r: 9 }] },
      ],
      sites,
      [
        [ids.town, ids.landing],
        [ids.landing, ids.omen],
        [ids.landing, ids.north],
        [ids.landing, ids.south],
        [ids.north, ids.gate],
        [ids.south, ids.gate],
        [ids.gate, ids.goal],
        [ids.south, ids.nest],
        [ids.town, ids.sawmill],
        [ids.town, ids.quarry],
        [ids.town, ids.wanderer],
        [ids.quarry, ids.wreck],
      ],
      s.biome,
      [
        { q: 13, r: 6 },
        { q: 17, r: 8 },
        { q: 13, r: 12 },
        { q: 16, r: 10 },
      ],
    ),
    mission: {
      ...missionBase(ctx, 4, 'Seek', s, '25–35 minutes (target, unmeasured)', 7999, 6),
      storyScenes: s.scenes({ landing: ids.landing, omen: ids.omen, gate: `${P}_gate`, goal: ids.goal }),
      player: player(
        ctx,
        s,
        ids.town,
        { gold: 12000, wood: 25, stone: 30, crystal: 12, favor: 10 },
        [bld(ctx, 'civic_hall'), bld(ctx, 'civic_hall', 2), bld(ctx, 'tavern'), bld(ctx, 'marketplace'), bld(ctx, 'fortifications'), dw(ctx, 1), dw(ctx, 1, 2), dw(ctx, 2), dw(ctx, 2, 2), dw(ctx, 4), dw(ctx, 4, 2), dw(ctx, 3), bld(ctx, 'workshop'), bld(ctx, 'mage_guild'), bld(ctx, 'pantheon_temple'), bld(ctx, 'pantheon_temple', 2)],
        { [familyOf(ctx, 1)]: 14, [familyOf(ctx, 2)]: 9, [familyOf(ctx, 3)]: 6, [familyOf(ctx, 4)]: 4 },
        [ctx.covenantT3],
        { level: 4, xp: 4000, attributes: { attack: 2, defense: 2, power: 4, knowledge: 3 }, skills: [{ skillId: 'wisdom', rank: 2 }, { skillId: 'armorer', rank: 1 }, { skillId: 'leadership', rank: 1 }], spellbook: true },
        [
          [ctx.t[1]!.up, 36],
          [ctx.t[2]!.up, 12],
          [ctx.t[3]!.base, 4],
          [ctx.t[4]!.up, 3],
        ],
      ),
      hostilePlayer: { playerId: 'arc_host', name: ctx.hostName },
      purchasableBuildingIds: [dw(ctx, 5), dw(ctx, 5, 2), dw(ctx, 3, 2), bld(ctx, 'mage_guild', 2), bld(ctx, 'mage_guild', 3), bld(ctx, 'civic_hall', 3), bld(ctx, 'resource_depot'), bld(ctx, 'watchtower'), bld(ctx, 'training_academy'), bld(ctx, 'artifact_merchant')],
      committableGodIds: ctx.gods.first,
      sites,
      objectives,
      hostileHeroes: [patrol(s.patrol.commander, [16, 9], [[13, 6], [17, 8], [13, 12], [16, 10]], s.patrol.army, 12, 18)],
      helpTopics: [
        IN_ORDER,
        { id: 'patrol', title: 'A commanded patrol', text: `${s.patrol.commander.name} takes one ordinary turn after yours each day, cannot see through fog and keeps to the land between the two waters.` },
        { id: 'relays', title: 'Two lights, one gate', text: `${s.gate.name} opens only when both lights burn. Either order works.` },
        ...(s.help ?? []),
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// Mission 5 — Rival
// ---------------------------------------------------------------------------

export interface RivalSpec extends MissionWriting {
  readonly gold: Named & { readonly guard: GuardSpec };
  readonly event: EventSpec;
  readonly north: Named & { readonly guard: GuardSpec };
  readonly south: Named & { readonly guard: GuardSpec };
  readonly stele: Named & { readonly confirm: string };
  readonly rival: {
    readonly playerId: string;
    readonly townId: string;
    readonly townName: string;
    readonly townDescription: string;
    readonly color: string;
    readonly hero: { readonly heroId: string; readonly definitionId: string; readonly classId: string; readonly name: string };
    readonly army: Army;
    readonly garrison: Army;
    readonly reward: RewardDefinition;
  };
  readonly objectives: { readonly crossing: string; readonly god: string; readonly town: string; readonly stele: string; readonly rival: string; readonly event: string };
  readonly scenes: (ids: { crossing: string; town: string; rival: string }) => readonly StorySceneDefinition[];
}

export function rivalMission(ctx: ArcCampaignContext, s: RivalSpec): Built {
  const P = 'm05';
  const ids = { town: `${P}_town`, sawmill: `${P}_sawmill`, quarry: `${P}_quarry`, gold: `${P}_gold`, event: `${P}_event`, north: `${P}_north_ford`, south: `${P}_south_ford`, crystal: `${P}_crystal`, rquarry: `${P}_rival_quarry`, stele: `${P}_stele`, rtown: `${P}_rival_town`, rsawmill: `${P}_rival_sawmill` };
  const sites: SiteDefinition[] = [
    site(ids.town, [3, 10], s.town, { type: 'town', townId: s.town.townId }),
    res(ids.sawmill, [5, 6], 'sawmill'),
    res(ids.quarry, [5, 14], 'quarry'),
    res(ids.gold, [8, 16], 'gold_mine', s.gold.guard),
    event(ids.event, [9, 3], s.event, [`${P}_event`]),
    site(ids.north, [15, 6], s.north, { type: 'crossing' }, { guard: g(s.north.guard) }),
    site(ids.south, [15, 13], s.south, { type: 'crossing' }, { guard: g(s.south.guard) }),
    res(ids.crystal, [20, 10], 'crystal_deposit'),
    res(ids.rquarry, [24, 5], 'quarry'),
    site(
      ids.stele,
      [26, 7],
      s.stele,
      { type: 'activation', label: 'beacon', cost: { gold: 500, crystal: 2 }, requirements: [{ type: 'objective_completed', objectiveId: `${P}_town` }], reward: { questXp: 2500 }, completesMission: true, confirmText: s.stele.confirm },
      { objectiveIds: [`${P}_stele`] },
    ),
    site(ids.rtown, [26, 10], { name: s.rival.townName, description: s.rival.townDescription }, { type: 'town', townId: s.rival.townId }, { objectiveIds: [`${P}_town`] }),
    res(ids.rsawmill, [24, 15], 'sawmill'),
  ];
  const r = s.rival;
  const t = (n: number) => ctx.t[n]!;
  const rival: MissionRivalSetup = {
    playerId: r.playerId,
    name: r.townName,
    controller: 'ai',
    pantheonId: ctx.pantheonId,
    color: r.color,
    wallet: { gold: 8000, wood: 20, stone: 20, crystal: 6, favor: 10 },
    town: {
      townId: r.townId,
      siteId: ids.rtown,
      name: r.townName,
      archetypeId: ctx.archetypeId,
      buildings: [bld(ctx, 'civic_hall'), bld(ctx, 'civic_hall', 2), bld(ctx, 'tavern'), bld(ctx, 'marketplace'), bld(ctx, 'fortifications'), bld(ctx, 'fortifications', 2), dw(ctx, 1), dw(ctx, 1, 2), dw(ctx, 2), dw(ctx, 2, 2), bld(ctx, 'workshop'), dw(ctx, 4), bld(ctx, 'pantheon_temple')],
      population: { [familyOf(ctx, 1)]: 14, [familyOf(ctx, 2)]: 9, [familyOf(ctx, 4)]: 4 },
      covenants: [],
      garrison: stacks(r.garrison),
    },
    hero: {
      heroId: r.hero.heroId,
      definitionId: r.hero.definitionId,
      classId: r.hero.classId,
      defaults: { level: 5, xp: 5000, attributes: { attack: 3, defense: 4, power: 1, knowledge: 2 }, skills: [{ skillId: 'leadership', rank: 2 }, { skillId: 'armorer', rank: 1 }, { skillId: 'tactics', rank: 1 }], spellbook: false },
      army: stacks(r.army),
      startTownId: r.townId,
    },
  };
  const objectives: ObjectiveDefinition[] = [
    O({
      id: `${P}_crossing`,
      title: s.objectives.crossing,
      description: `Clear either crossing: ${s.north.name} (${armyText(ctx, s.north.guard.army)}) or ${s.south.name} (${armyText(ctx, s.south.guard.army)}).`,
      category: 'primary',
      initialStatus: 'active',
      condition: { type: 'any', conditions: [{ type: 'site_cleared', siteId: ids.north }, { type: 'site_cleared', siteId: ids.south }] },
      hint: `Either crossing is enough. ${r.hero.name}’s army can use a cleared crossing too.`,
    }),
    locked(`${P}_god`, s.objectives.god, 'Raise the Civic Hall’s third level and commit to a second minor god (25 Favor, irreversible).', [`${P}_crossing`], { type: 'player_has_minor_god', count: 2 }, { hint: 'The second god needs the first, the Temple’s second level and the Civic Hall’s third level. A god chosen earlier counts as soon as this step opens.' }),
    locked(`${P}_town`, s.objectives.town, `Besiege and take ${r.townName}.`, [`${P}_god`], { type: 'town_owned', townId: r.townId }, { markerSiteId: ids.rtown, reward: r.reward, hint: `${r.hero.name} is a full empire run by the AI: it builds, recruits and may come for your town. Its town is garrisoned even when the hero rides out.` }),
    locked(`${P}_stele`, s.objectives.stele, `With ${r.townName} taken, pay 500 Gold and 2 Crystal at ${s.stele.name}.`, [`${P}_town`], { type: 'site_activated', siteId: ids.stele }, { markerSiteId: ids.stele }),
    optional(`${P}_rival`, s.objectives.rival, `Defeat ${r.hero.name}’s army in the field.`, { type: 'hero_defeated', heroDefinitionId: r.hero.definitionId }),
    optional(`${P}_event`, s.objectives.event, s.event.description, { type: 'site_visited', siteId: ids.event }, ids.event),
  ];
  return {
    template: template(
      ctx,
      5,
      [30, 20],
      [{ q: 15, terrain: 'water', openings: [{ q: 15, r: 6 }, { q: 15, r: 13 }] }],
      sites,
      [
        [ids.town, ids.north],
        [ids.town, ids.south],
        [ids.north, ids.rtown],
        [ids.south, ids.rtown],
        [ids.rtown, ids.stele],
        [ids.rtown, ids.rquarry],
        [ids.rtown, ids.rsawmill],
        [ids.north, ids.crystal],
        [ids.town, ids.sawmill],
        [ids.town, ids.quarry],
        [ids.quarry, ids.gold],
        [ids.sawmill, ids.event],
      ],
      s.biome,
    ),
    mission: {
      ...missionBase(ctx, 5, 'Rival', s, '35–50 minutes (target, unmeasured)', 9999, 7),
      storyScenes: s.scenes({ crossing: `${P}_crossing`, town: `${P}_town`, rival: r.hero.definitionId }),
      player: player(
        ctx,
        s,
        ids.town,
        { gold: 15000, wood: 30, stone: 35, crystal: 14, favor: 20 },
        [bld(ctx, 'civic_hall'), bld(ctx, 'civic_hall', 2), bld(ctx, 'tavern'), bld(ctx, 'marketplace'), bld(ctx, 'fortifications'), dw(ctx, 1), dw(ctx, 1, 2), dw(ctx, 2), dw(ctx, 2, 2), dw(ctx, 4), dw(ctx, 4, 2), dw(ctx, 3), dw(ctx, 3, 2), dw(ctx, 5), bld(ctx, 'workshop'), bld(ctx, 'mage_guild'), bld(ctx, 'mage_guild', 2), bld(ctx, 'pantheon_temple'), bld(ctx, 'pantheon_temple', 2)],
        { [familyOf(ctx, 1)]: 14, [familyOf(ctx, 2)]: 9, [familyOf(ctx, 3)]: 6, [familyOf(ctx, 4)]: 4, [familyOf(ctx, 5)]: 3 },
        [ctx.covenantT3],
        { level: 5, xp: 6200, attributes: { attack: 2, defense: 3, power: 4, knowledge: 4 }, skills: [{ skillId: 'wisdom', rank: 2 }, { skillId: 'armorer', rank: 1 }, { skillId: 'leadership', rank: 1 }, { skillId: 'offense', rank: 1 }], spellbook: true },
        [
          [t(1).up, 40],
          [t(2).up, 14],
          [t(3).up, 5],
          [t(4).up, 4],
          [t(5).base, 3],
        ],
      ),
      rivals: [rival],
      purchasableBuildingIds: [bld(ctx, 'civic_hall', 3), dw(ctx, 5, 2), bld(ctx, 'mage_guild', 3), bld(ctx, 'artifact_merchant'), bld(ctx, 'resource_depot'), bld(ctx, 'watchtower'), bld(ctx, 'training_academy'), bld(ctx, 'fortifications', 2)],
      committableGodIds: [...ctx.gods.first, ...ctx.gods.second],
      sites,
      objectives,
      hostileHeroes: [],
      helpTopics: [
        IN_ORDER,
        { id: 'rival', title: 'A rival empire', text: `${r.townName} is a full empire run by the AI with the same rules as yours: it builds, recruits, takes mines and may besiege ${s.town.name}. Losing ${s.town.name} does not end the mission; losing ${ctx.hero.name} does.` },
        { id: 'second_god', title: 'The second god', text: 'A second minor god needs the first, the Temple’s second level and the Civic Hall’s third level, and costs 25 Favor.' },
        { id: 'siege', title: 'Sieges', text: 'Entering an enemy town that has a garrison or a visiting hero starts a siege. Walls and towers favour the defender; shooters fire over them.' },
        ...(s.help ?? []),
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// Mission 6 — Refuge
// ---------------------------------------------------------------------------

export interface RefugeSpec extends MissionWriting {
  readonly north: Named & { readonly guard: GuardSpec };
  readonly south: Named & { readonly guard: GuardSpec };
  readonly event: EventSpec;
  readonly refuge: Named & { readonly guard: GuardSpec };
  readonly nest: Named & { readonly guard: GuardSpec };
  readonly gate: Named & { readonly guard: GuardSpec };
  readonly horn: Named & { readonly confirm: string };
  readonly band: { readonly id: string; readonly name: string; readonly army: Army };
  readonly objectives: { readonly approach: string; readonly refuge: string; readonly claim: string; readonly claimDescription: string; readonly elite: string; readonly gate: string; readonly horn: string; readonly event: string };
  readonly scenes: (ids: { refuge: string; claim: string; gate: string; gateObjective: string }) => readonly StorySceneDefinition[];
}

export function refugeMission(ctx: ArcCampaignContext, s: RefugeSpec): Built {
  const P = 'm06';
  const ids = { town: `${P}_town`, sawmill: `${P}_sawmill`, quarry: `${P}_quarry`, gold: `${P}_gold`, north: `${P}_north_crossing`, south: `${P}_south_crossing`, event: `${P}_event`, refuge: `${P}_refuge`, nest: `${P}_nest`, gate: `${P}_gate`, horn: `${P}_horn` };
  const covenant = `covenant.${ctx.covenantT6}.${ctx.id}6`;
  const t = (n: number) => ctx.t[n]!;
  const sites: SiteDefinition[] = [
    site(ids.town, [3, 10], s.town, { type: 'town', townId: s.town.townId }),
    res(ids.sawmill, [5, 6], 'sawmill'),
    res(ids.quarry, [5, 14], 'quarry'),
    res(ids.gold, [7, 16], 'gold_mine'),
    site(ids.north, [11, 6], s.north, { type: 'crossing' }, { guard: g(s.north.guard) }),
    site(ids.south, [11, 13], s.south, { type: 'crossing' }, { guard: g(s.south.guard) }),
    event(ids.event, [15, 3], s.event, [`${P}_event`]),
    site(ids.refuge, [16, 10], s.refuge, { type: 'landmark', landmark: 'refuge' }, { guard: g(s.refuge.guard), objectiveIds: [`${P}_refuge`] }),
    site(ids.nest, [17, 17], s.nest, { type: 'landmark', landmark: 'nest' }, { guard: g(s.nest.guard) }),
    site(ids.gate, [22, 10], s.gate, { type: 'crossing' }, { guard: g(s.gate.guard), objectiveIds: [`${P}_gate`] }),
    site(
      ids.horn,
      [26, 10],
      s.horn,
      { type: 'activation', label: 'beacon', cost: { gold: 500, favor: 10 }, requirements: [{ type: 'objective_completed', objectiveId: `${P}_gate` }], reward: { questXp: 2800 }, completesMission: true, confirmText: s.horn.confirm },
      { objectiveIds: [`${P}_horn`] },
    ),
  ];
  const objectives: ObjectiveDefinition[] = [
    O({
      id: `${P}_approach`,
      title: s.objectives.approach,
      description: `Clear either crossing: ${s.north.name} (${armyText(ctx, s.north.guard.army)}) or ${s.south.name} (${armyText(ctx, s.south.guard.army)}).`,
      category: 'primary',
      initialStatus: 'active',
      condition: { type: 'any', conditions: [{ type: 'site_cleared', siteId: ids.north }, { type: 'site_cleared', siteId: ids.south }] },
    }),
    locked(`${P}_refuge`, s.objectives.refuge, `Defeat ${armyText(ctx, s.refuge.guard.army)} at ${s.refuge.name}.`, [`${P}_approach`], { type: 'site_cleared', siteId: ids.refuge }, { markerSiteId: ids.refuge }),
    O({ id: `${P}_claim`, title: s.objectives.claim, description: s.objectives.claimDescription, category: 'primary', initialStatus: 'locked', condition: { type: 'claim', after: [`${P}_refuge`] }, reward: { entitlementIds: [covenant] } }),
    locked(`${P}_elite`, s.objectives.elite, `Assign the covenant, build the tier-6 dwelling and have at least 2 ${nameOf(ctx, t(6).base)} in ${ctx.hero.name}’s army.`, [`${P}_claim`], { type: 'hero_army_contains', heroId: ctx.hero.heroId, creatureId: t(6).base, count: 2 }, { live: true, hint: 'The tier-6 dwelling needs the Temple’s second level, the tier-4 dwelling and the assigned covenant.' }),
    locked(`${P}_gate`, s.objectives.gate, `Defeat ${s.gate.guard.commander?.name ?? 'the commander'} and the gate guard (${armyText(ctx, s.gate.guard.army)}).`, [`${P}_elite`], { type: 'site_cleared', siteId: ids.gate }, { markerSiteId: ids.gate }),
    locked(`${P}_horn`, s.objectives.horn, `With the gate open, pay 500 Gold and 10 Favor at ${s.horn.name}.`, [`${P}_gate`], { type: 'site_activated', siteId: ids.horn }, { markerSiteId: ids.horn }),
    optional(`${P}_event`, s.objectives.event, s.event.description, { type: 'site_visited', siteId: ids.event }, ids.event),
  ];
  return {
    template: template(
      ctx,
      6,
      [30, 20],
      [
        { q: 11, terrain: 'mountain', openings: [{ q: 11, r: 6 }, { q: 11, r: 13 }] },
        { q: 22, terrain: 'mountain', openings: [{ q: 22, r: 10 }] },
      ],
      sites,
      [
        [ids.town, ids.north],
        [ids.town, ids.south],
        [ids.north, ids.refuge],
        [ids.south, ids.refuge],
        [ids.refuge, ids.gate],
        [ids.gate, ids.horn],
        [ids.north, ids.event],
        [ids.south, ids.nest],
        [ids.town, ids.sawmill],
        [ids.town, ids.quarry],
        [ids.quarry, ids.gold],
      ],
      s.biome,
    ),
    mission: {
      ...missionBase(ctx, 6, 'Refuge', s, '35–45 minutes (target, unmeasured)', 12199, 8),
      storyScenes: s.scenes({ refuge: ids.refuge, claim: `${P}_claim`, gate: ids.gate, gateObjective: `${P}_gate` }),
      player: player(
        ctx,
        s,
        ids.town,
        { gold: 18000, wood: 30, stone: 35, crystal: 16, favor: 25 },
        [bld(ctx, 'civic_hall'), bld(ctx, 'civic_hall', 2), bld(ctx, 'civic_hall', 3), bld(ctx, 'tavern'), bld(ctx, 'marketplace'), bld(ctx, 'fortifications'), dw(ctx, 1), dw(ctx, 1, 2), dw(ctx, 2), dw(ctx, 2, 2), dw(ctx, 4), dw(ctx, 4, 2), dw(ctx, 3), dw(ctx, 3, 2), dw(ctx, 5), dw(ctx, 5, 2), bld(ctx, 'workshop'), bld(ctx, 'mage_guild'), bld(ctx, 'mage_guild', 2), bld(ctx, 'pantheon_temple'), bld(ctx, 'pantheon_temple', 2)],
        { [familyOf(ctx, 1)]: 14, [familyOf(ctx, 2)]: 9, [familyOf(ctx, 3)]: 6, [familyOf(ctx, 4)]: 4, [familyOf(ctx, 5)]: 3 },
        [ctx.covenantT3],
        { level: 6, xp: 8500, attributes: { attack: 2, defense: 3, power: 5, knowledge: 4 }, skills: [{ skillId: 'wisdom', rank: 2 }, { skillId: 'armorer', rank: 2 }, { skillId: 'leadership', rank: 1 }, { skillId: 'offense', rank: 1 }], spellbook: true },
        [
          [t(1).up, 44],
          [t(2).up, 16],
          [t(3).up, 6],
          [t(4).up, 6],
          [t(5).up, 3],
        ],
      ),
      hostilePlayer: { playerId: 'arc_host', name: ctx.hostName },
      purchasableBuildingIds: [dw(ctx, 6), dw(ctx, 6, 2), bld(ctx, 'mage_guild', 3), bld(ctx, 'fortifications', 2), bld(ctx, 'artifact_merchant'), bld(ctx, 'resource_depot'), bld(ctx, 'watchtower'), bld(ctx, 'training_academy'), bld(ctx, 'civic_hall', 4), bld(ctx, 'fortifications', 3)],
      committableGodIds: [...ctx.gods.first, ...ctx.gods.second],
      sites,
      objectives,
      hostileHeroes: [band(s.band.id, s.band.name, `creature.${ctx.pantheonId}.tier3.upgraded.portrait`, [19, 15], [[18, 14], [20, 15], [19, 17]], s.band.army, { gold: 900 }, 13, 21)],
      helpTopics: [
        IN_ORDER,
        { id: 'claim', title: 'Claiming a covenant', text: 'Some rewards wait in the journal until you accept them. Accept the covenant there, then assign it to a town.' },
        ...(s.help ?? []),
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// Mission 7 — Finale
// ---------------------------------------------------------------------------

export interface FinaleSpec extends MissionWriting {
  readonly north: Named & { readonly guard: GuardSpec };
  readonly south: Named & { readonly guard: GuardSpec };
  readonly stones: { readonly north: Named; readonly south: Named; readonly cost: ResourceCost };
  readonly nest: Named & { readonly guard: GuardSpec };
  readonly gate: Named;
  readonly cache: Named & { readonly reward: RewardDefinition };
  readonly hall: Named & { readonly guard: GuardSpec };
  readonly choice: Named & { readonly title: string; readonly text: string; readonly a: { readonly flag: string; readonly label: string; readonly summary: string }; readonly b: { readonly flag: string; readonly label: string; readonly summary: string } };
  readonly seal: Named & { readonly confirm: string };
  readonly patrol: { readonly commander: CommanderSpec; readonly army: Army };
  readonly objectives: { readonly approach: string; readonly north: string; readonly south: string; readonly gate: string; readonly boss: string; readonly choice: string; readonly seal: string };
  readonly scenes: (ids: { gate: string; hall: string; boss: string; choice: string }) => readonly StorySceneDefinition[];
}

export function finaleMission(ctx: ArcCampaignContext, s: FinaleSpec): Built {
  const P = 'm07';
  const ids = { town: `${P}_town`, sawmill: `${P}_sawmill`, quarry: `${P}_quarry`, north: `${P}_north_crossing`, south: `${P}_south_crossing`, sn: `${P}_stone_north`, ss: `${P}_stone_south`, nest: `${P}_nest`, gate: `${P}_gate`, cache: `${P}_cache`, hall: `${P}_hall`, choice: `${P}_choice`, seal: `${P}_seal` };
  const t = (n: number) => ctx.t[n]!;
  const stone = (id: string, at: At, n: Named, flag: string): SiteDefinition =>
    site(id, at, n, { type: 'activation', label: 'relay', cost: s.stones.cost, requirements: [], reward: { flags: [flag] }, completesMission: false, confirmText: `Use ${n.name}? Both together open ${s.gate.name}.` }, { objectiveIds: [id] });
  const sites: SiteDefinition[] = [
    site(ids.town, [3, 10], s.town, { type: 'town', townId: s.town.townId }),
    res(ids.sawmill, [5, 6], 'sawmill'),
    res(ids.quarry, [5, 14], 'quarry'),
    site(ids.north, [10, 6], s.north, { type: 'crossing' }, { guard: g(s.north.guard) }),
    site(ids.south, [10, 13], s.south, { type: 'crossing' }, { guard: g(s.south.guard) }),
    stone(ids.sn, [15, 4], s.stones.north, 'stone_north'),
    stone(ids.ss, [15, 15], s.stones.south, 'stone_south'),
    site(ids.nest, [18, 17], s.nest, { type: 'landmark', landmark: 'nest' }, { guard: g(s.nest.guard) }),
    site(ids.gate, [22, 10], s.gate, { type: 'gate', openWhenFlags: ['stone_north', 'stone_south'] }, { objectiveIds: [`${P}_gate`] }),
    site(ids.cache, [25, 6], s.cache, { type: 'pickup', reward: s.cache.reward }),
    site(ids.hall, [27, 10], s.hall, { type: 'crossing' }, { guard: g({ ...s.hall.guard, reward: { ...s.hall.guard.reward, flags: ['boss_defeated'] } }), objectiveIds: [`${P}_boss`] }),
    site(
      ids.choice,
      [29, 8],
      s.choice,
      {
        type: 'map_event',
        title: s.choice.title,
        text: s.choice.text,
        options: [
          { label: s.choice.a.label, summary: s.choice.a.summary, reward: { flags: [s.choice.a.flag], questXp: 500 } },
          { label: s.choice.b.label, summary: s.choice.b.summary, reward: { flags: [s.choice.b.flag], questXp: 500 } },
        ],
      },
      { objectiveIds: [`${P}_choice`] },
    ),
    site(
      ids.seal,
      [29, 12],
      s.seal,
      {
        type: 'activation',
        label: 'beacon',
        cost: { gold: 1000, crystal: 3, favor: 10 },
        requirements: [
          { type: 'mission_flag', flag: 'boss_defeated' },
          { type: 'any_of', requirements: [{ type: 'mission_flag', flag: s.choice.a.flag }, { type: 'mission_flag', flag: s.choice.b.flag }] },
        ],
        reward: { questXp: 3000 },
        completesMission: true,
        confirmText: s.seal.confirm,
      },
      { objectiveIds: [`${P}_seal`] },
    ),
  ];
  const objectives: ObjectiveDefinition[] = [
    O({
      id: `${P}_approach`,
      title: s.objectives.approach,
      description: `Clear either crossing: ${s.north.name} (${armyText(ctx, s.north.guard.army)}) or ${s.south.name} (${armyText(ctx, s.south.guard.army)}). One is enough to reach both stones.`,
      category: 'primary',
      initialStatus: 'active',
      condition: { type: 'any', conditions: [{ type: 'site_cleared', siteId: ids.north }, { type: 'site_cleared', siteId: ids.south }] },
    }),
    locked(`${P}_stone_north`, s.objectives.north, `Use ${s.stones.north.name} (${costText(s.stones.cost)}).`, [`${P}_approach`], { type: 'site_activated', siteId: ids.sn }, { markerSiteId: ids.sn }),
    locked(`${P}_stone_south`, s.objectives.south, `Use ${s.stones.south.name} (${costText(s.stones.cost)}).`, [`${P}_approach`], { type: 'site_activated', siteId: ids.ss }, { markerSiteId: ids.ss }),
    locked(`${P}_gate`, s.objectives.gate, `With both stones used, ${s.gate.name} opens.`, [`${P}_stone_north`, `${P}_stone_south`], { type: 'all', conditions: [{ type: 'flag', flag: 'stone_north' }, { type: 'flag', flag: 'stone_south' }] }, { markerSiteId: ids.gate }),
    locked(`${P}_boss`, s.objectives.boss, `Defeat ${s.hall.guard.commander?.name ?? 'the enemy'} at ${s.hall.name} (${armyText(ctx, s.hall.guard.army)}).`, [`${P}_gate`], { type: 'site_cleared', siteId: ids.hall }, { markerSiteId: ids.hall }),
    locked(`${P}_choice`, s.objectives.choice, `At ${s.choice.name}, decide.`, [`${P}_boss`], { type: 'any', conditions: [{ type: 'flag', flag: s.choice.a.flag }, { type: 'flag', flag: s.choice.b.flag }] }, { markerSiteId: ids.choice }),
    locked(`${P}_seal`, s.objectives.seal, `At ${s.seal.name}, pay 1,000 Gold, 3 Crystal and 10 Favor.`, [`${P}_choice`], { type: 'site_activated', siteId: ids.seal }, { markerSiteId: ids.seal }),
  ];
  return {
    template: template(
      ctx,
      7,
      [32, 20],
      [
        { q: 10, terrain: 'mountain', openings: [{ q: 10, r: 6 }, { q: 10, r: 13 }] },
        { q: 22, terrain: 'mountain', openings: [{ q: 22, r: 10 }] },
        { q: 27, terrain: 'mountain', openings: [{ q: 27, r: 10 }] },
      ],
      sites,
      [
        [ids.town, ids.north],
        [ids.town, ids.south],
        [ids.north, ids.sn],
        [ids.south, ids.ss],
        [ids.sn, ids.ss],
        [ids.sn, ids.gate],
        [ids.ss, ids.gate],
        [ids.gate, ids.hall],
        [ids.gate, ids.cache],
        [ids.hall, ids.choice],
        [ids.hall, ids.seal],
        [ids.ss, ids.nest],
        [ids.town, ids.sawmill],
        [ids.town, ids.quarry],
      ],
      s.biome,
      [
        { q: 13, r: 8 },
        { q: 18, r: 10 },
        { q: 13, r: 12 },
        { q: 16, r: 10 },
      ],
    ),
    mission: {
      ...missionBase(ctx, 7, 'Finale', s, '40–60 minutes (target, unmeasured)', null, null),
      storyScenes: s.scenes({ gate: `${P}_gate`, hall: ids.hall, boss: `${P}_boss`, choice: `${P}_choice` }),
      player: player(
        ctx,
        s,
        ids.town,
        { gold: 20000, wood: 30, stone: 35, crystal: 18, favor: 25 },
        [bld(ctx, 'civic_hall'), bld(ctx, 'civic_hall', 2), bld(ctx, 'civic_hall', 3), bld(ctx, 'tavern'), bld(ctx, 'marketplace'), bld(ctx, 'fortifications'), dw(ctx, 1), dw(ctx, 1, 2), dw(ctx, 2), dw(ctx, 2, 2), dw(ctx, 4), dw(ctx, 4, 2), dw(ctx, 3), dw(ctx, 3, 2), dw(ctx, 5), dw(ctx, 5, 2), dw(ctx, 6), bld(ctx, 'workshop'), bld(ctx, 'mage_guild'), bld(ctx, 'mage_guild', 2), bld(ctx, 'mage_guild', 3), bld(ctx, 'pantheon_temple'), bld(ctx, 'pantheon_temple', 2)],
        { [familyOf(ctx, 1)]: 14, [familyOf(ctx, 2)]: 9, [familyOf(ctx, 3)]: 6, [familyOf(ctx, 4)]: 4, [familyOf(ctx, 5)]: 3, [familyOf(ctx, 6)]: 2 },
        [ctx.covenantT3, ctx.covenantT6],
        { level: 7, xp: 11000, attributes: { attack: 3, defense: 3, power: 5, knowledge: 5 }, skills: [{ skillId: 'wisdom', rank: 2 }, { skillId: 'armorer', rank: 2 }, { skillId: 'leadership', rank: 2 }, { skillId: 'offense', rank: 1 }], spellbook: true },
        [
          [t(1).up, 48],
          [t(2).up, 18],
          [t(3).up, 8],
          [t(4).up, 8],
          [t(5).up, 4],
          [t(6).base, 2],
        ],
      ),
      hostilePlayer: { playerId: 'arc_host', name: ctx.hostName },
      purchasableBuildingIds: [dw(ctx, 6, 2), bld(ctx, 'artifact_merchant'), bld(ctx, 'fortifications', 2), bld(ctx, 'fortifications', 3), bld(ctx, 'resource_depot'), bld(ctx, 'watchtower'), bld(ctx, 'training_academy'), bld(ctx, 'civic_hall', 4)],
      committableGodIds: [...ctx.gods.first, ...ctx.gods.second],
      sites,
      objectives,
      hostileHeroes: [patrol(s.patrol.commander, [17, 10], [[13, 8], [18, 10], [13, 12], [16, 10]], s.patrol.army, 11, 21)],
      helpTopics: [
        IN_ORDER,
        { id: 'patrol', title: 'The patrol', text: `${s.patrol.commander.name} takes one ordinary turn after yours each day, cannot see through fog and never leaves the land between the crossings and the gate.` },
        { id: 'stones', title: 'The two stones', text: `Either crossing reaches both stones. Only both stones together open ${s.gate.name}.` },
        { id: 'last_choice', title: 'The last choice', text: 'The last choice changes the ending you see, not the reward: both complete the campaign.' },
        ...(s.help ?? []),
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// Campaign assembly
// ---------------------------------------------------------------------------

export interface ArcCampaignWriting {
  readonly name: string;
  readonly tagline: string;
  readonly summary: string;
  readonly startingGodNote: string;
  readonly epilogue: readonly DialogueLine[];
  readonly endings: readonly { readonly flag: string; readonly lines: readonly DialogueLine[] }[];
}

export function arcCampaign(ctx: ArcCampaignContext, w: ArcCampaignWriting, missions: readonly MissionDefinition[]): CampaignDefinition {
  return {
    id: ctx.id,
    name: w.name,
    tagline: w.tagline,
    summary: w.summary,
    pantheonId: ctx.pantheonId,
    startingGodOptions: [ctx.gods.patron],
    startingGodNote: w.startingGodNote,
    missionIds: missions.map((m) => m.id),
    heroDefinitionId: ctx.hero.definitionId,
    carryoverPolicy: [
      { category: 'Hero identity, XP, skills, primary growth', policy: 'Preserved (after the mission’s displayed XP cap)' },
      { category: 'Spellbook, spells, equipment, backpack', policy: 'Preserved' },
      { category: 'Patron and every minor-god commitment', policy: 'Preserved' },
      { category: 'Hero mana and movement', policy: 'Refilled to the new mission’s full budget' },
      { category: 'Army, wallet, towns, pools, mines', policy: 'Replaced by the next war-band manifest' },
      { category: 'Fog, local quest flags, enemies, day', policy: 'Reset to the mission’s initial state' },
    ],
    status: 'playable',
    thumbnailAssetId: `campaign.${ctx.id}.thumbnail`,
    epilogue: w.epilogue,
    epilogueVariants: w.endings,
  };
}

// ---------------------------------------------------------------------------
// Text helpers (catalog-free: creature names are passed in by `withNames`)
// ---------------------------------------------------------------------------

function nameOf(ctx: ArcCampaignContext, id: string, count = 2): string {
  const n = ctx.names(id);
  if (!n) return id;
  return count === 1 ? n.name : n.pluralName;
}

export function armyText(ctx: ArcCampaignContext, a: Army): string {
  const merged = new Map<string, number>();
  for (const [id, n] of a) merged.set(id, (merged.get(id) ?? 0) + n);
  return [...merged].map(([id, n]) => `${n} ${nameOf(ctx, id, n)}`).join(', ');
}

function costText(c: ResourceCost): string {
  return Object.entries(c)
    .filter(([, v]) => !!v)
    .map(([k, v]) => `${(v as number).toLocaleString('en-US')} ${k[0]!.toUpperCase()}${k.slice(1)}`)
    .join(', ');
}

function familyOf(ctx: ArcCampaignContext, tier: number): string {
  return ctx.familyOf(ctx.t[tier]!.base);
}

function describe(objs: ObjectiveDefinition[], text: Record<string, string>): ObjectiveDefinition[] {
  return objs.map((o) => (text[o.id] ? { ...o, description: text[o.id]! } : o));
}
