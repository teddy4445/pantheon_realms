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
  type WorldMapDefinition,
  type DifficultyDefinition,
  NO_SCENARIO_FEATURES,
  recordDayStats,
  projectedIncome,
  ensureStats,
  resources,
  heroVisionRadius,
  townVisionRadius,
  refreshTownShops,
  grantSpecialtySpell,
  settleHeroesAtTownGates,
  heroInTown,
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
  /** Skirmish difficulty (ignored outside skirmish scenarios). Default: 'normal' when the catalog defines it. */
  readonly difficultyId?: string | null;
  /** Override who controls each seat (hot-seat: several 'human' seats). */
  readonly controllers?: Readonly<Record<string, 'human' | 'ai'>>;
  /** Override seat names (hot-seat player names). */
  readonly playerNames?: Readonly<Record<string, string>>;
  /** Patron gods for rival seats played by humans (hot-seat). AI rivals start without a patron, as before. */
  readonly patronGodIds?: Readonly<Record<string, GodId>>;
}

/** A generated scenario: its definition and logical map (from @pr/mapgen's skirmish generator). */
export interface GeneratedScenario {
  readonly mission: MissionDefinition;
  readonly map: WorldMapDefinition;
  readonly decor: readonly DecorItem[];
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
  return buildMissionMatch(catalog, mission, gen.map, gen.decor, opts, false, seed);
}

/** Start a generated scenario; its definition travels inside the match (MatchState.customMission). */
export function createGeneratedMatch(catalog: ContentCatalog, generated: GeneratedScenario, opts: MissionStartOptions): MissionStart {
  return buildMissionMatch(catalog, generated.mission, generated.map, generated.decor, opts, true, generated.map.seed);
}

function scaleWallet(wallet: MissionDefinition['player']['wallet'], percent: number) {
  const scaled = resources(wallet);
  if (percent === 100) return scaled;
  return resources({
    gold: Math.floor((scaled.gold * percent) / 100),
    wood: Math.floor((scaled.wood * percent) / 100),
    stone: Math.floor((scaled.stone * percent) / 100),
    crystal: Math.floor((scaled.crystal * percent) / 100),
    favor: Math.floor((scaled.favor * percent) / 100),
  });
}

function buildMissionMatch(
  catalog: ContentCatalog,
  mission: MissionDefinition,
  map: WorldMapDefinition,
  decor: readonly DecorItem[],
  opts: MissionStartOptions,
  custom: boolean,
  seed: number,
): MissionStart {
  const gen = { map, decor };
  const carry = opts.carryover ?? null;
  const skirmish = (mission.initialFlags ?? []).includes('skirmish');
  const difficultyId = skirmish ? (opts.difficultyId === undefined ? (catalog.difficulties?.['normal'] ? 'normal' : null) : opts.difficultyId) : null;
  const difficulty: DifficultyDefinition | undefined = difficultyId ? catalog.difficulties?.[difficultyId] : undefined;
  const controllerOf = (id: string, fallback: 'human' | 'ai') => opts.controllers?.[id] ?? fallback;
  const startPercent = (controller: 'human' | 'ai') => (difficulty ? (controller === 'human' ? difficulty.humanStartPercent : difficulty.aiStartPercent) : 100);
  const incomePercent = (controller: 'human' | 'ai') => (difficulty && controller === 'ai' ? difficulty.aiIncomePercent : 100);
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
  const playerController = controllerOf(p.playerId, p.controller ?? 'human');
  addPlayer({
    id: p.playerId,
    name: opts.playerNames?.[p.playerId] ?? opts.playerName ?? p.name,
    controller: playerController,
    role: 'player',
    pantheonId: p.pantheonId,
    color: PLAYER_COLORS.player,
    wallet: scaleWallet(p.wallet, startPercent(playerController)),
    incomePercent: incomePercent(playerController),
    interventionWeek: 0,
    pantheon: {
      patronGodId: carry?.patronGodId ?? opts.startingGodId ?? null,
      minorGodIds: [...(carry?.minorGodIds ?? [])],
    },
    entitlements: [],
    eliminated: false,
  });
  for (const rival of mission.rivals ?? []) {
    const controller = controllerOf(rival.playerId, rival.controller ?? 'ai');
    addPlayer({
      id: rival.playerId,
      name: opts.playerNames?.[rival.playerId] ?? rival.name,
      controller,
      role: 'rival',
      pantheonId: rival.pantheonId,
      color: rival.color,
      wallet: scaleWallet(rival.wallet, startPercent(controller)),
      incomePercent: incomePercent(controller),
      interventionWeek: 0,
      pantheon: { patronGodId: controller === 'human' ? (opts.patronGodIds?.[rival.playerId] ?? null) : null, minorGodIds: [] },
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
  const addTown = (setup: MissionDefinition['player']['town'], ownerId: string | null) => {
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
      ...(setup.garrison ? { garrison: setup.garrison } : {}),
    });
  };
  addTown(p.town, p.playerId);
  for (const rival of mission.rivals ?? []) addTown(rival.town, rival.playerId);
  // Unowned towns: no owner and no hero; a neutral garrison may hold them (2026-10-07).
  for (const t of mission.neutralTowns ?? []) addTown(t, null);

  const heroes: Record<string, HeroState> = {};
  const playerHero = heroFromSetup(catalog, p.hero, p.playerId, towns[p.hero.startTownId]!.coord, carry);
  heroes[playerHero.id] = playerHero;
  for (const rival of mission.rivals ?? []) {
    const h = heroFromSetup(catalog, rival.hero, rival.playerId, towns[rival.hero.startTownId]!.coord, null);
    if (players[rival.playerId]?.controller === 'ai') {
      h.ai = { profile: 'strategic', waypoints: [], waypointIndex: 0, regionMinQ: 0, regionMaxQ: 999, attackThreshold: { numerator: 11, denominator: 10 } };
    }
    heroes[h.id] = h;
  }
  if (playerController === 'ai') {
    playerHero.ai = { profile: 'strategic', waypoints: [], waypointIndex: 0, regionMinQ: 0, regionMaxQ: 999, attackThreshold: { numerator: 11, denominator: 10 } };
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
      ...(hh.ai.regionCenter ? { regionCenter: { ...hh.ai.regionCenter } } : {}),
      ...(hh.ai.regionRadius !== undefined ? { regionRadius: hh.ai.regionRadius } : {}),
    };
    if (hh.monster) h.monster = { bounty: resources(hh.monster.bounty), creatureId: hh.army[0]?.creatureId ?? '' };
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
      ...(s.kind.type === 'creature_camp' ? { stock: s.kind.initialStock } : {}),
      ...(s.kind.type === 'relic' ? { heldDays: 0 } : {}),
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
      difficultyId,
      features: { ...NO_SCENARIO_FEATURES, ...(mission.features ?? {}) },
      xpCap: mission.xpCap,
      protectedHeroIds: mission.protectedHeroFailure ? [playerHero.id] : [],
    },
    ...(custom ? { customMission: mission } : {}),
    day: 1,
    activePlayerId: p.playerId,
    playerOrder,
    players,
    heroes,
    towns,
    world: { map: gen.map, sites },
    // Revealed-map option (random maps): terrain and sites start explored; heroes stay hidden by vision.
    fog: Object.fromEntries(playerOrder.map((id) => [id, { explored: new Array(gen.map.width * gen.map.height).fill(mission.startExplored ? 1 : 0) }])),
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
    stats: { timeline: [], totals: {} },
  };

  // Spell specialties: the hero knows its spell from the start (scenarios with specialties).
  for (const h of Object.values(state.heroes)) grantSpecialtySpell(catalog, state, h);
  // Heroes never stand on a town's own tile: those placed in a town start at its gate.
  settleHeroesAtTownGates(catalog, state);
  // Mission transition refill: full movement and mana; starting in town counts as a visit.
  for (const h of Object.values(state.heroes)) {
    h.movementPoints = movementBudget(catalog, state, h).total;
    h.mana = maxMana(catalog, state, h);
  }
  const tx = new Tx({ catalog }, state, p.playerId);
  for (const h of Object.values(state.heroes)) {
    const town = Object.values(state.towns).find((t) => t.ownerId === h.ownerId && heroInTown(catalog, state, h, t.id));
    if (town) learnSpellsAtTown(tx, h, town);
  }
  for (const town of Object.values(state.towns).sort((a, b) => (a.id < b.id ? -1 : 1))) refreshTownShops(tx, town);
  tx.finalize();
  revealInitial(catalog, state);
  ensureStats(state);
  recordDayStats(catalog, state, (id) => projectedIncome({ catalog, state }, id));
  return { match: state, decor: gen.decor, entryHash: hashValue(state) };
}
