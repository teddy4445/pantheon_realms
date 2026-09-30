/**
 * MissionRuntimeFactory: builds the starting MatchState of a scenario from its
 * content manifest, a generated logical map and (for later campaign missions) the
 * hero carryover.
 *
 * Starting state is LOADED, not replayed: no construction events, no initial
 * dwelling grants, no dawn payout. Day 1 initializes exactly once.
 */
import {
  Tx,
  cellsWithin,
  cellIndex,
  createHeroState,
  createTownState,
  getMapTemplate,
  getMission,
  hashValue,
  learnSpellsAtTown,
  maxMana,
  movementBudget,
  seedFromLabel,
  type ArtifactInstanceState,
  type ContentCatalog,
  type GodId,
  type HeroAttribute,
  type HeroSkillState,
  type HeroState,
  type MatchState,
  type MissionDefinition,
  type MissionHeroSetup,
  type PlayerState,
  type SiteState,
  type TownState,
  resources,
  heroVisionRadius,
  townVisionRadius,
  refreshMerchantStock,
} from '@pr/rules';
import { generateMap, type DecorItem, type GenerationMode } from '@pr/mapgen';

/** What persists for the campaign hero between missions (campaign/01 §4). */
export interface HeroCarryover {
  readonly definitionId: string;
  readonly name: string;
  readonly classId: string;
  readonly level: number;
  readonly xp: number;
  readonly attributes: Readonly<Record<HeroAttribute, number>>;
  readonly skills: readonly HeroSkillState[];
  readonly spellbook: boolean;
  readonly knownSpellIds: readonly string[];
  readonly equipment: Readonly<Record<string, ArtifactInstanceState>>;
  readonly backpack: readonly ArtifactInstanceState[];
  readonly patronGodId: GodId | null;
  readonly minorGodIds: readonly GodId[];
}

export interface MissionStartOptions {
  readonly matchId: string;
  readonly seed?: number;
  readonly mode?: GenerationMode;
  readonly carryover?: HeroCarryover | null;
  readonly startingGodId?: GodId | null;
  readonly playerName?: string;
}

export interface MissionStart {
  readonly match: MatchState;
  readonly decor: readonly DecorItem[];
  readonly entryHash: string;
}

const PLAYER_COLORS = { player: '#3b73d9', hostile: '#b0413e' };

export function carryoverFromHero(state: MatchState, hero: HeroState): HeroCarryover {
  const player = state.players[hero.ownerId];
  return {
    definitionId: hero.definitionId,
    name: hero.name,
    classId: hero.classId,
    level: hero.level,
    xp: hero.xp,
    attributes: { ...hero.attributes },
    skills: hero.skills.map((s) => ({ ...s })),
    spellbook: hero.spellbook,
    knownSpellIds: [...hero.knownSpellIds],
    equipment: Object.fromEntries(Object.entries(hero.equipment).filter(([, v]) => !!v)) as Record<string, ArtifactInstanceState>,
    backpack: hero.backpack.map((a) => ({ ...a })),
    patronGodId: player?.pantheon.patronGodId ?? null,
    minorGodIds: [...(player?.pantheon.minorGodIds ?? [])],
  };
}

function heroFromSetup(
  catalog: ContentCatalog,
  setup: MissionHeroSetup,
  ownerId: string,
  position: { q: number; r: number },
  carry: HeroCarryover | null,
): HeroState {
  const def = catalog.heroes[setup.definitionId];
  const base = carry ?? {
    definitionId: setup.definitionId,
    name: def?.name ?? setup.heroId,
    classId: setup.classId,
    level: setup.defaults.level,
    xp: setup.defaults.xp,
    attributes: setup.defaults.attributes,
    skills: setup.defaults.skills,
    spellbook: setup.defaults.spellbook || (catalog.heroClasses[setup.classId]?.startsWithSpellbook ?? false),
    knownSpellIds: [],
    equipment: {},
    backpack: [],
    patronGodId: null,
    minorGodIds: [],
  };
  const hero = createHeroState(catalog, {
    id: setup.heroId,
    definitionId: base.definitionId,
    name: base.name,
    ownerId,
    classId: base.classId,
    portraitAssetId: def?.portraitAssetId ?? `hero.${setup.definitionId}.portrait`,
    level: base.level,
    xp: base.xp,
    attributes: base.attributes,
    skills: base.skills,
    spellbook: base.spellbook,
    knownSpellIds: base.knownSpellIds,
    position,
    army: setup.army,
  });
  hero.equipment = { ...(base.equipment as HeroState['equipment']) };
  hero.backpack = base.backpack.map((a) => ({ ...a }));
  return hero;
}

function revealInitial(catalog: ContentCatalog, state: MatchState): void {
  const map = state.world.map;
  for (const playerId of state.playerOrder) {
    const fog = state.fog[playerId]!;
    for (const h of Object.values(state.heroes)) {
      if (h.ownerId !== playerId) continue;
      for (const c of cellsWithin(map, h.position, heroVisionRadius(catalog, h, state))) fog.explored[cellIndex(map, c)] = 1;
    }
    for (const t of Object.values(state.towns)) {
      if (t.ownerId !== playerId) continue;
      for (const c of cellsWithin(map, t.coord, townVisionRadius(catalog, t))) fog.explored[cellIndex(map, c)] = 1;
    }
  }
}

export function createMissionMatch(catalog: ContentCatalog, missionId: string, opts: MissionStartOptions): MissionStart {
  const mission: MissionDefinition = getMission(catalog, missionId);
  const template = getMapTemplate(catalog, mission.mapTemplateId);
  const seed = opts.seed ?? template.goldenSeed;
  const gen = generateMap(template, seed, opts.mode ?? 'golden');
  const carry = opts.carryover ?? null;
  const p = mission.player;
  const siteCoord = (siteId: string) => {
    const s = mission.sites.find((x) => x.id === siteId);
    if (!s) throw new Error(`${mission.id}: unknown site ${siteId}`);
    return s.coord;
  };

  const players: Record<string, PlayerState> = {};
  const playerOrder: string[] = [];
  const addPlayer = (pl: PlayerState) => {
    players[pl.id] = pl;
    playerOrder.push(pl.id);
  };
  addPlayer({
    id: p.playerId,
    name: opts.playerName ?? p.name,
    controller: 'human',
    role: 'player',
    pantheonId: p.pantheonId,
    color: PLAYER_COLORS.player,
    wallet: resources(p.wallet),
    pantheon: {
      patronGodId: carry?.patronGodId ?? opts.startingGodId ?? null,
      minorGodIds: [...(carry?.minorGodIds ?? [])],
    },
    entitlements: [],
    eliminated: false,
  });
  for (const rival of mission.rivals ?? []) {
    addPlayer({
      id: rival.playerId,
      name: rival.name,
      controller: 'ai',
      role: 'rival',
      pantheonId: rival.pantheonId,
      color: rival.color,
      wallet: resources(rival.wallet),
      pantheon: { patronGodId: null, minorGodIds: [] },
      entitlements: [],
      eliminated: false,
    });
  }
  if (mission.hostilePlayer) {
    addPlayer({
      id: mission.hostilePlayer.playerId,
      name: mission.hostilePlayer.name,
      controller: 'ai',
      role: 'scripted_hostile',
      pantheonId: p.pantheonId,
      color: PLAYER_COLORS.hostile,
      wallet: resources(),
      pantheon: { patronGodId: null, minorGodIds: [] },
      entitlements: [],
      eliminated: false,
    });
  }

  const towns: Record<string, TownState> = {};
  const addTown = (setup: MissionDefinition['player']['town'], ownerId: string) => {
    towns[setup.townId] = createTownState(catalog, {
      id: setup.townId,
      name: setup.name,
      ownerId,
      archetypeId: setup.archetypeId,
      siteId: setup.siteId,
      coord: siteCoord(setup.siteId),
      buildings: setup.buildings,
      population: setup.population,
      covenants: setup.covenants,
    });
  };
  addTown(p.town, p.playerId);
  for (const rival of mission.rivals ?? []) addTown(rival.town, rival.playerId);

  const heroes: Record<string, HeroState> = {};
  const playerHero = heroFromSetup(catalog, p.hero, p.playerId, towns[p.hero.startTownId]!.coord, carry);
  heroes[playerHero.id] = playerHero;
  for (const rival of mission.rivals ?? []) {
    const h = heroFromSetup(catalog, rival.hero, rival.playerId, towns[rival.hero.startTownId]!.coord, null);
    h.ai = { profile: 'strategic', waypoints: [], waypointIndex: 0, regionMinQ: 0, regionMaxQ: 999, attackThreshold: { numerator: 11, denominator: 10 } };
    heroes[h.id] = h;
  }
  mission.hostileHeroes.forEach((hh, i) => {
    const id = `${hh.commander.heroDefinitionId}_${i}`;
    const h = createHeroState(catalog, {
      id,
      definitionId: hh.commander.heroDefinitionId,
      name: hh.commander.name,
      ownerId: mission.hostilePlayer?.playerId ?? 'hostile',
      classId: hh.commander.classId,
      portraitAssetId: hh.commander.portraitAssetId,
      level: hh.commander.level,
      xp: 0,
      attributes: hh.commander.attributes,
      skills: hh.commander.skills,
      spellbook: hh.commander.spellbook,
      knownSpellIds: hh.commander.spellIds,
      position: hh.startCoord,
      army: hh.army,
    });
    h.ai = {
      profile: hh.ai.profile,
      waypoints: hh.ai.waypoints.map((w) => ({ ...w })),
      waypointIndex: 0,
      regionMinQ: hh.ai.regionMinQ,
      regionMaxQ: hh.ai.regionMaxQ,
      attackThreshold: { ...hh.ai.attackThreshold },
    };
    heroes[id] = h;
  });

  const sites: Record<string, SiteState> = {};
  for (const s of mission.sites) {
    const townOwner = s.kind.type === 'town' ? (towns[s.kind.townId]?.ownerId ?? null) : null;
    sites[s.id] = {
      siteId: s.id,
      owner: townOwner,
      cleared: !s.guard,
      claimed: false,
      activated: false,
      visitedBy: [],
      open: false,
      guard: s.guard ? s.guard.army.map((a) => ({ ...a })) : null,
    };
  }

  const objectives: MatchState['mission']['objectives'] = {};
  for (const o of mission.objectives) objectives[o.id] = { status: o.initialStatus, completedOnDay: null, rewardGranted: false };
  const flags: Record<string, true> = {};
  for (const f of mission.initialFlags ?? []) flags[f] = true;

  const baseSeed = `pr-rules|${mission.id}|${seed}|${opts.matchId}`;
  const state: MatchState = {
    kind: 'match',
    matchId: opts.matchId,
    revision: 0,
    versions: catalog.versions,
    scenario: {
      scenarioId: mission.scenarioId,
      missionId: mission.id,
      campaignId: mission.campaignId,
      name: mission.name,
      heroHiringEnabled: mission.heroHiringEnabled,
      heroHiringDisabledReason: mission.heroHiringDisabledReason ?? null,
      purchasableBuildingIds: mission.purchasableBuildingIds ? [...mission.purchasableBuildingIds] : null,
      committableGodIds: mission.committableGodIds ? [...mission.committableGodIds] : null,
      signatureMechanics: mission.signatureMechanics ?? true,
      xpCap: mission.xpCap,
      protectedHeroIds: mission.protectedHeroFailure ? [playerHero.id] : [],
    },
    day: 1,
    activePlayerId: p.playerId,
    playerOrder,
    players,
    heroes,
    towns,
    world: { map: gen.map, sites },
    fog: Object.fromEntries(playerOrder.map((id) => [id, { explored: new Array(gen.map.width * gen.map.height).fill(0) }])),
    mission: { missionId: mission.id, campaignId: mission.campaignId, objectives, flags, counters: {}, revealedSiteIds: [] },
    battle: null,
    pendingDecisions: [],
    lastBattleResult: null,
    processedCommandIds: [],
    appliedKeys: [],
    rng: {
      combat: seedFromLabel(`${baseSeed}|combat`),
      progression: seedFromLabel(`${baseSeed}|progression`),
      layout: seedFromLabel(`${baseSeed}|tactical_layout`),
    },
    serial: 0,
    outcome: { status: 'running' },
  };

  // Mission transition refill: full movement and mana; starting in town counts as a visit.
  for (const h of Object.values(state.heroes)) {
    h.movementPoints = movementBudget(catalog, state, h).total;
    h.mana = maxMana(catalog, state, h);
  }
  const tx = new Tx({ catalog }, state, p.playerId);
  for (const h of Object.values(state.heroes)) {
    const town = Object.values(state.towns).find((t) => t.ownerId === h.ownerId && t.coord.q === h.position.q && t.coord.r === h.position.r);
    if (town) learnSpellsAtTown(tx, h, town);
  }
  for (const town of Object.values(state.towns).sort((a, b) => (a.id < b.id ? -1 : 1))) refreshMerchantStock(tx, town);
  tx.finalize();
  revealInitial(catalog, state);
  return { match: state, decor: gen.decor, entryHash: hashValue(state) };
}
