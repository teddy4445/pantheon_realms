/**
 * Authoring kit for campaign content v2 (campaign expansion handoff,
 * 2026-10-15; docs/campaign-v2/design/mission-content.json).
 *
 * A chapter is written as its card describes it: a region map (regionMap.ts),
 * its sites in authoring positions [column, row], objectives with stable IDs,
 * evidence and remembered choices (mission flags carried as campaign facts),
 * announced timers, patrols with home camps, neutral hiring sites, story scenes
 * that read earlier facts (order-aware dialogue), and bounded entry bonuses
 * earned by earlier choices. The kit turns that into an ordinary
 * MissionDefinition — the rules know nothing about the kit.
 *
 * The player's town economy, hero profile and divine options come from the
 * content-v1 mission whose story this chapter carries first (`economyFrom`):
 * those values passed their headless journeys; v2 changes the map, the tasks and
 * the pacing, not the economy model. Everything is proposed and unplaytested.
 */
import { axialDistance, axialNeighbors, hexKey, armyToken, type AssetId, type BattlefieldArchetype, type CommanderSpec, type DialogueLine, type EntryBonusDefinition, type EvidenceDefinition, type HexCoord, type HostileHeroDefinition, type MapEventOptionDefinition, type MissionDefinition, type MissionTimerDefinition, type ObjectiveCondition, type ObjectiveDefinition, type RewardDefinition, type ResourceCost, type SiteDefinition, type StorySceneDefinition, type Terrain } from '@pr/rules';
import { compileRegionMap, toAxial, type RegionMapSpec, type RoadSpec, type SitePlacement, type XY } from './regionMap';

export type Army = readonly (readonly [string, number])[];
const stacks = (a: Army) => a.map(([creatureId, count]) => ({ creatureId, count }));

/** The writing context of one campaign. */
export interface V2Campaign {
  readonly id: string;
  readonly pantheonId: string;
  /** The content-v1 missions of this campaign (economy and hero profiles are reused from them). */
  readonly v1: (missionId: string) => MissionDefinition;
  /** Creature names for objective and guard texts. */
  readonly names: (creatureId: string) => { readonly name: string; readonly pluralName: string } | undefined;
}

/** A speaker of the existing cast (portraits by name, as the v1 campaigns use). */
export function voice(portraitAssetId: string, name: string) {
  return (text: string): DialogueLine => ({ speaker: name, portraitAssetId, text });
}

export interface GuardSpec {
  readonly label: string;
  readonly army: Army;
  readonly reward?: RewardDefinition;
  readonly battlefield: BattlefieldArchetype;
  readonly commander?: CommanderSpec;
  /** A required story fight: never joins or flees. */
  readonly required?: boolean;
}

export function guard(g: GuardSpec): NonNullable<SiteDefinition['guard']> {
  return {
    label: g.label,
    army: stacks(g.army),
    reward: g.reward ?? {},
    battlefield: g.battlefield,
    ...(g.commander ? { commander: g.commander } : {}),
    ...(g.required ? { required: true } : {}),
  };
}

/** A site written at an authoring position; `at` is converted when the chapter is built. */
export interface SiteSpec extends Omit<SiteDefinition, 'coord' | 'anchorId'> {
  readonly at: XY;
  /** Roads may run through it (bridges, cleared crossings, opened gates). */
  readonly passThrough?: boolean;
  /** A town: the cell its roads leave from. */
  readonly gate?: XY;
}

type K = SiteDefinition['kind'];
export const S = {
  town(id: string, townId: string, at: XY, name: string, description: string, gate?: XY): SiteSpec {
    return { id, at, name, description, kind: { type: 'town', townId }, ...(gate ? { gate } : {}) };
  },
  resource(id: string, at: XY, type: 'sawmill' | 'quarry' | 'gold_mine' | 'crystal_deposit', extra: Partial<SiteSpec> = {}): SiteSpec {
    const t = {
      sawmill: { name: 'Sawmill', resource: 'wood' as const, dailyYield: 2, description: 'An unowned timber camp. Capture for +2 Wood per day.' },
      quarry: { name: 'Quarry', resource: 'stone' as const, dailyYield: 2, description: 'An unowned quarry. Capture for +2 Stone per day.' },
      gold_mine: { name: 'Gold Mine', resource: 'gold' as const, dailyYield: 1000, description: 'An unowned mine. Capture for +1,000 Gold per day.' },
      crystal_deposit: { name: 'Crystal Deposit', resource: 'crystal' as const, dailyYield: 1, description: 'An unowned crystal outcrop. Capture for +1 Crystal per day.' },
    }[type];
    return { id, at, name: t.name, description: t.description, kind: { type: 'resource_site', siteType: type, resource: t.resource, dailyYield: t.dailyYield }, ...extra };
  },
  /** A one-use supply cache (the supply depot picture). */
  depot(id: string, at: XY, name: string, description: string, reward: RewardDefinition, extra: Partial<SiteSpec> = {}): SiteSpec {
    return { id, at, name, description, kind: { type: 'pickup', reward }, art: 'supply_depot', marker: 'supply', ...extra };
  },
  pickup(id: string, at: XY, name: string, description: string, reward: RewardDefinition, extra: Partial<SiteSpec> = {}): SiteSpec {
    return { id, at, name, description, kind: { type: 'pickup', reward }, ...extra };
  },
  /** A story or objective place held by a guard (a nest, a refuge, a cache, a grove). */
  landmark(id: string, at: XY, name: string, description: string, landmark: 'nest' | 'refuge' | 'quarry_cache' | 'grove', g: GuardSpec | null, extra: Partial<SiteSpec> = {}): SiteSpec {
    return { id, at, name, description, kind: { type: 'landmark', landmark }, ...(g ? { guard: guard(g) } : {}), ...extra };
  },
  /** A guarded crossing (bridge, causeway, pass): roads run through it once it is cleared. */
  crossing(id: string, at: XY, name: string, description: string, g: GuardSpec | null, extra: Partial<SiteSpec> = {}): SiteSpec {
    return { id, at, name, description, kind: { type: 'crossing' }, passThrough: true, ...(g ? { guard: guard(g) } : {}), ...extra };
  },
  /** A shortcut opened through play: blocked until every flag is set (a stair, a winch, a service landing). */
  shortcut(id: string, at: XY, name: string, description: string, openWhenFlags: readonly string[], extra: Partial<SiteSpec> = {}): SiteSpec {
    return { id, at, name, description, kind: { type: 'gate', openWhenFlags }, passThrough: true, ...extra };
  },
  activation(id: string, at: XY, name: string, description: string, a: { cost: ResourceCost; reward: RewardDefinition; requirements?: Extract<K, { type: 'activation' }>['requirements']; completesMission?: boolean; confirm: string; label?: 'beacon' | 'relay' }, g: GuardSpec | null, extra: Partial<SiteSpec> = {}): SiteSpec {
    return {
      id,
      at,
      name,
      description,
      kind: { type: 'activation', label: a.label ?? 'beacon', cost: a.cost, requirements: a.requirements ?? [], reward: a.reward, completesMission: a.completesMission ?? false, confirmText: a.confirm },
      ...(g ? { guard: guard(g) } : {}),
      ...extra,
    };
  },
  /** An authored choice: a short exchange and options with known costs and results, made once. */
  choice(id: string, at: XY, name: string, description: string, title: string, text: string, options: readonly MapEventOptionDefinition[], extra: Partial<SiteSpec> = {}): SiteSpec {
    return { id, at, name, description, kind: { type: 'map_event', title, text, options }, ...extra };
  },
  watchtower(id: string, at: XY, name: string, description: string, revealSiteIds: readonly string[], extra: Partial<SiteSpec> = {}): SiteSpec {
    return { id, at, name, description, kind: { type: 'watchtower', revealSiteIds }, ...extra };
  },
  /** An existing creature camp (centaurs, slingers, golems…): it grows each week. */
  camp(id: string, at: XY, name: string, description: string, creatureId: string, weeklyGrowth: number, initialStock: number, extra: Partial<SiteSpec> = {}): SiteSpec {
    return { id, at, name, description, kind: { type: 'creature_camp', creatureId, weeklyGrowth, initialStock }, ...extra };
  },
  /**
   * A hiring site of one of the six new neutrals: a finite stock each week (shared by
   * every player, never accumulating), optionally opened by a pact flag.
   */
  neutral(id: string, at: XY, name: string, description: string, creatureId: string, weeklyStock: number, pact?: { flag: string; reason: string }, extra: Partial<SiteSpec> = {}): SiteSpec {
    return {
      id,
      at,
      name,
      description,
      kind: { type: 'creature_camp', creatureId, weeklyGrowth: weeklyStock, initialStock: weeklyStock, restock: 'weekly', ...(pact ? { requiresFlag: pact.flag, lockedReason: pact.reason } : {}) },
      art: `neutral_dwelling.${creatureId}`,
      marker: 'pact',
      ...extra,
    };
  },
  /** One ferry landing of a pair (a route connector, never free movement over water). */
  ferry(id: string, at: XY, name: string, description: string, exitSiteId: string, requires?: { flag: string; reason: string }, extra: Partial<SiteSpec> = {}): SiteSpec {
    return { id, at, name, description, kind: { type: 'portal', exitSiteId, ferry: true, ...(requires ? { requiresFlag: requires.flag, lockedReason: requires.reason } : {}) }, art: 'ferry', ...extra };
  },
  sluice(id: string, at: XY, name: string, description: string, s: { channel: readonly XY[]; open: Terrain; closed: Terrain; startsOpen: boolean; openText: string; closeText: string; openFlag: string }, extra: Partial<SiteSpec> = {}): SiteSpec & { readonly channelXY: readonly XY[] } {
    // The channel is converted with the other positions (`channelXY`).
    return {
      id,
      at,
      name,
      description,
      kind: { type: 'sluice', channel: [], openTerrain: s.open, closedTerrain: s.closed, startsOpen: s.startsOpen, openText: s.openText, closeText: s.closeText, openFlag: s.openFlag },
      art: 'sluice',
      channelXY: s.channel,
      ...extra,
    };
  },
};

/** Objective helpers (stable IDs; text names places and troops, never typed counts of guards). */
export const O = {
  primary(id: string, title: string, description: string, condition: ObjectiveCondition, extra: Partial<ObjectiveDefinition> = {}): ObjectiveDefinition {
    return { id, title, description, category: 'primary', initialStatus: extra.requires?.length ? 'locked' : 'active', condition, ...extra };
  },
  optional(id: string, title: string, description: string, condition: ObjectiveCondition, extra: Partial<ObjectiveDefinition> = {}): ObjectiveDefinition {
    return { id, title, description, category: 'optional', initialStatus: 'active', condition, ...extra };
  },
};

export const C = {
  cleared: (siteId: string): ObjectiveCondition => ({ type: 'site_cleared', siteId }),
  activated: (siteId: string): ObjectiveCondition => ({ type: 'site_activated', siteId }),
  visited: (siteId: string): ObjectiveCondition => ({ type: 'site_visited', siteId }),
  flag: (flag: string): ObjectiveCondition => ({ type: 'flag', flag }),
  counter: (counter: string, value: number): ObjectiveCondition => ({ type: 'counter_at_least', counter, value }),
  defeated: (heroDefinitionId: string): ObjectiveCondition => ({ type: 'hero_defeated', heroDefinitionId }),
  owned: (townId: string): ObjectiveCondition => ({ type: 'town_owned', townId }),
  all: (...conditions: ObjectiveCondition[]): ObjectiveCondition => ({ type: 'all', conditions }),
  any: (...conditions: ObjectiveCondition[]): ObjectiveCondition => ({ type: 'any', conditions }),
  /** At least `n` of these conditions (written out as `any` of every n-combination; small n only). */
  atLeast(n: number, ...conditions: ObjectiveCondition[]): ObjectiveCondition {
    const combos: ObjectiveCondition[][] = [];
    const pick = (start: number, acc: ObjectiveCondition[]) => {
      if (acc.length === n) {
        combos.push(acc);
        return;
      }
      for (let i = start; i < conditions.length; i++) pick(i + 1, [...acc, conditions[i]!]);
    };
    pick(0, []);
    return { type: 'any', conditions: combos.map((c) => ({ type: 'all', conditions: c })) };
  },
};

export interface PatrolSpec {
  readonly commander: CommanderSpec;
  readonly start: XY;
  readonly waypoints: readonly XY[];
  readonly army: Army;
  /** The camp whose fall ends this patrol (finite pressure). */
  readonly home?: string;
  readonly purpose: string;
  /** Wandering radius around its start (default: free to roam its waypoints). */
  readonly radius?: number;
  readonly bounty?: ResourceCost;
  readonly monster?: boolean;
  readonly threshold?: readonly [number, number];
  /** An announced counterattack: waits in place until this flag is set, then marches its waypoints. */
  readonly dormantUntil?: string;
}

export interface ChapterSpec {
  readonly campaign: V2Campaign;
  /** Local chapter number (1-based) and the review card number. */
  readonly chapter: number;
  readonly card: number;
  readonly name: string;
  readonly summary: string;
  readonly playtime: string;
  readonly legacy: readonly string[];
  /** The content-v1 mission whose player setup, hero profile and divine options this chapter starts from. */
  readonly economyFrom: string;
  readonly soundscape: NonNullable<MissionDefinition['soundscape']>;
  readonly map: Omit<RegionMapSpec, 'id' | 'roads'> & { readonly roads: readonly RoadSpec[] };
  readonly town: { readonly siteId: string; readonly townId: string; readonly name: string };
  readonly sites: readonly SiteSpec[];
  readonly objectives: readonly ObjectiveDefinition[];
  readonly patrols?: readonly PatrolSpec[];
  readonly timers?: readonly MissionTimerDefinition[];
  readonly evidence?: readonly EvidenceDefinition[];
  /** Mission flags kept as campaign facts (evidence, choices) when the chapter is completed. */
  readonly carried?: readonly string[];
  readonly briefing: readonly DialogueLine[];
  readonly briefingVariants?: MissionDefinition['briefingVariants'];
  readonly victory: readonly DialogueLine[];
  readonly scenes?: readonly StorySceneDefinition[];
  readonly entryBonuses?: readonly EntryBonusDefinition[];
  readonly loss: readonly string[];
  readonly help?: MissionDefinition['helpTopics'];
  /** Changes to the reused setup (a capped expedition army, another wallet). */
  readonly player?: { readonly wallet?: ResourceCost; readonly army?: Army; readonly buildings?: readonly string[]; readonly population?: Readonly<Record<string, number>> };
  readonly purchasable?: readonly string[] | null;
  readonly hostileName?: string;
  /** The principal objective: the chapter's known task, reachable two independent ways. */
  readonly principal: string;
}

/** Build a chapter's MissionDefinition (and check its map compiles with every road). */
export function chapter(spec: ChapterSpec): MissionDefinition {
  const camp = spec.campaign;
  const id = `${camp.id}_v2_m${String(spec.chapter).padStart(2, '0')}`;
  const from = camp.v1(spec.economyFrom);
  const rows = spec.map.rows;
  const placements: SitePlacement[] = spec.sites.map((s) => ({ id: s.id, at: s.at, ...(s.passThrough ? { passThrough: true } : {}), ...(s.kind.type === 'town' ? { town: s.gate ? { gate: s.gate } : {} } : {}) }));
  const compiled = compileRegionMap({ ...spec.map, id: `${id}_map`, roads: spec.map.roads }, placements);
  const ax = (p: XY): HexCoord => toAxial(rows, p);
  const sites: SiteDefinition[] = spec.sites.map((s) => {
    const { at, passThrough, gate, ...rest } = s as SiteSpec & { channelXY?: readonly XY[] };
    void passThrough;
    void gate;
    const channelXY = (s as { channelXY?: readonly XY[] }).channelXY;
    const def = { ...rest, anchorId: s.id, coord: compiled.coords[s.id] ?? ax(at) } as SiteDefinition & { channelXY?: unknown };
    delete def.channelXY;
    if (def.kind.type === 'sluice' && channelXY) return { ...def, kind: { ...def.kind, channel: channelXY.map(ax) } };
    return def;
  });
  // Populate reachable side routes without moving authored gates or story landmarks.
  const occupied = new Set(sites.map(site => hexKey(site.coord)));
  const townCell = sites.find(site => site.kind.type === 'town')!.coord;
  const walkable = (c: HexCoord) => !['w','m','v'].includes(compiled.map.rows[c.r]?.[c.q] ?? 'v');
  const queue = [townCell], reached = new Set<string>();
  for (let n=0;n<queue.length;n++) {
    const c=queue[n]!; if(reached.has(hexKey(c)) || !walkable(c)) continue;
    reached.add(hexKey(c)); queue.push(...axialNeighbors(c));
  }
  const candidates = [...reached].map(key => { const [q,r]=key.split(',').map(Number); return {q:q!,r:r!}; })
    .filter(c => axialDistance(c,townCell)>=5 && !occupied.has(hexKey(c)))
    .sort((a,b) => ((a.q*71+a.r*31)%101)-((b.q*71+b.r*31)%101) || a.r-b.r || a.q-b.q);
  let extra=0;
  for(const coord of candidates) {
    if(extra>=6) break;
    if(sites.some(site => axialDistance(site.coord,coord)<3) || axialNeighbors(coord).filter(walkable).length < 6 || compiled.map.roads.some(edge => edge.split('|').includes(hexKey(coord)))) continue;
    const sid=`${id}_frontier_${extra}`;
    sites.push({id:sid,anchorId:sid,coord,name:extra%2?'Frontier supplies':'Guarded prospect',description:'An optional expedition to finance town development and fresh recruits.',
      kind:extra%2?{type:'pickup',reward:{resources:{gold:650,wood:2,stone:2}}}:{type:'resource_site',siteType:'gold_mine',resource:'gold',dailyYield:500},
      guard:{label:'Frontier defenders',army:[{creatureId:'brigand',count:8+spec.chapter*3+extra}],battlefield:'open_field',reward:{},required:false}});
    extra++;
  }
  const hostile: HostileHeroDefinition[] = (spec.patrols ?? []).map((p) => {
    const start = ax(p.start);
    return {
      commander: p.commander,
      ...(p.monster ? { monster: { bounty: p.bounty ?? {} } } : {}),
      ...(p.home ? { homeSiteId: p.home } : {}),
      ...(p.dormantUntil ? { dormantUntilFlag: p.dormantUntil } : {}),
      purpose: p.purpose,
      startCoord: start,
      army: stacks(p.army),
      ai: {
        profile: 'patrol',
        waypoints: p.waypoints.map(ax),
        regionMinQ: 0,
        regionMaxQ: 999,
        ...(p.radius !== undefined ? { regionCenter: start, regionRadius: p.radius } : {}),
        attackThreshold: { numerator: p.threshold?.[0] ?? 11, denominator: p.threshold?.[1] ?? 10 },
      },
    };
  });
  const player = from.player;
  const army = spec.player?.army ? stacks(spec.player.army) : player.hero.army;
  return {
    id,
    scenarioId: id,
    campaignId: camp.id,
    order: spec.chapter,
    name: spec.name,
    subtitle: `Chapter ${spec.chapter}`,
    summary: spec.summary,
    mapTemplateId: `${id}_map`,
    soundscape: spec.soundscape,
    targetPlaytime: `${spec.playtime} (target, unplaytested)`,
    newDecisions: from.newDecisions,
    xpCap: from.xpCap,
    xpCapLevel: from.xpCapLevel,
    briefing: spec.briefing,
    victory: spec.victory,
    storyScenes: spec.scenes ?? [],
    debriefPolicy: from.debriefPolicy,
    // City dedications (app 1.5.0): a new chapter plays them unless its v1 campaign turns them off
    // explicitly (The Three Beacons: `cityDedicationsV1: false`); never inferred from other flags.
    // Expedition kit (app 1.6.0): scouting intel and the targetable catapult the same way; caravans and
    // ships never in authored chapters (their routes are designed for land travel).
    features: {
      ...(from.features ?? {}),
      neutralReactions: false,
      mythicLibraryV2: from.features?.cityDedicationsV1 !== false,
      interventions: from.features?.cityDedicationsV1 !== false,
      cityDedicationsV1: from.features?.cityDedicationsV1 !== false,
      scoutingIntelV1: from.features?.scoutingIntelV1 !== false,
      targetableCatapultV1: from.features?.targetableCatapultV1 !== false,
      recruitmentCaravansV1: false,
      navalMovementV1: false,
    },
    ...(from.signatureMechanics !== undefined ? { signatureMechanics: from.signatureMechanics } : {}),
    player: {
      ...player,
      wallet: spec.player?.wallet ?? player.wallet,
      town: {
        ...player.town,
        townId: spec.town.townId,
        siteId: spec.town.siteId,
        name: spec.town.name,
        ...(spec.player?.buildings ? { buildings: spec.player.buildings } : {}),
        ...(spec.player?.population ? { population: spec.player.population } : {}),
      },
      hero: { ...player.hero, army, startTownId: spec.town.townId },
    },
    hostilePlayer: { playerId: 'hostile', name: spec.hostileName ?? from.hostilePlayer?.name ?? 'Hostile forces' },
    purchasableBuildingIds: spec.purchasable === undefined ? from.purchasableBuildingIds : spec.purchasable,
    ...(from.committableGodIds ? { committableGodIds: from.committableGodIds } : {}),
    heroHiringEnabled: false,
    heroHiringDisabledReason: from.heroHiringDisabledReason ?? 'Hero hiring is disabled in campaigns.',
    sites,
    objectives: spec.objectives,
    hostileHeroes: hostile,
    helpTopics: [...(spec.help ?? []), MANUAL_HELP],
    protectedHeroFailure: true,
    thumbnailAssetId: `mission.${camp.id}.${spec.legacy[0]!.slice(camp.id.length + 1)}.thumbnail`,
    contentVersion: 2,
    map: compiled.map,
    ...(spec.timers ? { timers: spec.timers } : {}),
    ...(spec.evidence ? { evidence: spec.evidence } : {}),
    ...(spec.carried ? { carriedFlags: spec.carried } : {}),
    ...(spec.briefingVariants ? { briefingVariants: spec.briefingVariants } : {}),
    ...(spec.entryBonuses ? { entryBonuses: spec.entryBonuses } : {}),
    lossConditions: spec.loss,
    principalObjectiveId: spec.principal,
    briefingArt: spec.legacy.map((l) => `mission.${camp.id}.${l.slice(camp.id.length + 1)}.briefing` as AssetId),
  };
}

const MANUAL_HELP = {
  id: 'manual_battles',
  title: 'Battles are fought by hand',
  text: 'Every campaign battle is fought on the battlefield: there is no quick battle or auto-combat for your army. Enemy turns, animation speed, retreat and surrender work as usual.',
};

/** An army token for objective texts (shown with names and difficulty-scaled counts by `missionText`). */
export function armyText(army: Army): string {
  return armyToken(stacks(army));
}

/** A creature's plural name (objective texts). */
export function plural(camp: V2Campaign, id: string): string {
  return camp.names(id)?.pluralName ?? id;
}
