/**
 * Naval random-map generator `pr-naval-templates-1` (naval random-maps kit, 2026-10-17;
 * assets-source/art/naval-random-v1/): The Shattered Crown and The Serpent Straits, through the same entry point
 * as every random map (`generateSkirmish` hands these two types here).
 *
 * Ships are the only first access between islands. Every island is its own land component, water
 * separates all of them, there are no portals, sandbars, bridges, ferries or sluices, and the
 * generated mission carries the naval-only travel policy (`MissionDefinition.navalPolicy`).
 *
 * Stages (each candidate):
 *   1. Terrain (own RNG stream per candidate): the reference skeleton — hexagonal discs and the
 *      Serpent Straits' crescent, re-expressed from the kit's design graphs — with bounded coast jitter
 *      on unreserved cells, applied in the first empire's region and copied by the template's
 *      rotation group (6-fold or 2-fold), the shared central island by whole orbits. The harbor
 *      (town tile, inward gate, launch water, embark beach, the starting ship's water) is reserved.
 *   2. Coast: cliffs (mountain) split every island's beaches into separated landing clusters;
 *      interior ground from smoothed noise (always passable).
 *   3. Content (own RNG stream for positions; identities from the content stream, the same for every
 *      candidate): towns, sites, unowned towns, wandering monsters and neutral hiring sites per island
 *      variant (player home, neutral home, inner island, crescent), copied to every slot.
 *   4. Roads on land only (never across water), then the mission, the map and production validation
 *      (naval/validate.ts). A candidate that fails any check is discarded.
 * Up to 32 candidates, then the reference-shaped topology (no jitter); if that fails too an explicit
 * `NavalGenerationError` — never a silent causeway, teleport or invalid map. Decoration has its own
 * stream and never blocks anything.
 */
import {
  NAVAL_ONLY_POLICY_ID,
  NAVAL_PORTAL_LOCK_REASON,
  RngCursor,
  TERRAIN_CODES,
  axialDistance,
  axialNeighbors,
  edgeKey,
  hashValue,
  hexKey,
  parseHexKey,
  seedFromLabel,
  type ContentCatalog,
  type HexCoord,
  type HostileHeroDefinition,
  type MissionDefinition,
  type MissionRivalSetup,
  type MissionShipSetup,
  type MissionTownSetup,
  type NavalTraversalPolicy,
  type ResourceCost,
  type ScenarioFeatures,
  type SiteDefinition,
  type Terrain,
  type WorldMapDefinition,
} from '@pr/rules';
import { buildDecor, deriveStreams } from '../generator';
import {
  GUARD_PERCENT,
  RANDOM_TEMPLATE_ID,
  SKIRMISH_NEUTRAL_SPECIES,
  SKIRMISH_PLAYER_COLORS,
  SKIRMISH_SIZE_RADIUS,
  SKIRMISH_START_WALLET,
  TREASURE_PERCENT,
  WEALTH_PERCENT,
  randomMapTavernPool,
  skirmishContent,
  type BuildCtx,
  type GeneratedSkirmish,
  type GuardStrength,
  type RoadDensity,
  type SkirmishGenOptions,
  type StartWealth,
  type TreasureLevel,
  type UnownedTowns,
} from '../skirmish';
import { UNOWNED_GARRISON_VALUE, otherPantheons, unownedTownGarrison, unownedTownSetup } from '../unownedTowns';
import { habitatVerdict, neutralSiteDefinition, neutralSpeciesForBiome, type GroundAt } from '../neutralSites';
import { add, angleFrom, byKey, centroid, components, dir, disc, flood, identityT, originDistance, rotN, type Transform } from './geometry';
import { NAVAL_GENERATOR_ID, NAVAL_MAX_CANDIDATES, NAVAL_STREAM_VERSION, NAVAL_TEMPLATE_VERSION, SHATTERED_CROWN_SLOTS, crescentCells, navalTemplate, type NavalMapType, type NavalTemplateInfo } from './templates';
import { validateNavalMap } from './validate';
import { placeNavalSeaSites, seaBusy } from './seaSites';

// The shared content helpers, looked up when called (skirmish.ts and this module import each other).
type SC = typeof skirmishContent;
const pickCreature: SC['pickCreature'] = (...a) => skirmishContent.pickCreature(...a);
const guard: SC['guard'] = (...a) => skirmishContent.guard(...a);
const loot: SC['loot'] = (...a) => skirmishContent.loot(...a);
const resourceSite: SC['resourceSite'] = (...a) => skirmishContent.resourceSite(...a);
const pickArtifact: SC['pickArtifact'] = (...a) => skirmishContent.pickArtifact(...a);
const withArtifact: SC['withArtifact'] = (...a) => skirmishContent.withArtifact(...a);
const eventSite: SC['eventSite'] = (...a) => skirmishContent.eventSite(...a);
const shrineSpell: SC['shrineSpell'] = (...a) => skirmishContent.shrineSpell(...a);
const trainerSkill: SC['trainerSkill'] = (...a) => skirmishContent.trainerSkill(...a);
const chestSite: SC['chestSite'] = (...a) => skirmishContent.chestSite(...a);
const scaleCost: SC['scaleCost'] = (...a) => skirmishContent.scaleCost(...a);

/**
 * A naval map that cannot be generated with these settings, or whose candidates and reference shape
 * all failed validation (an explicit error: never a silent causeway or an invalid map). Same family as
 * `SkirmishGenerationError` (name and message), kept separate so this module loads before skirmish.ts.
 */
export class NavalGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NavalGenerationError';
  }
}

/** A candidate that failed a stage or a check (the generator tries the next one). */
class CandidateRejected extends Error {}

type SiteBody = Omit<SiteDefinition, 'id' | 'anchorId' | 'coord'>;
type Variant = 'player' | 'neutral' | 'inner' | 'crescent';

/** The reserved harbor of every home island (region frame). */
export interface NavalHarbor {
  /** Town tile (coastal: exactly two water neighbours, the launch cells). */
  readonly town: HexCoord;
  /** Inward gate (land, joined to the town by the only road edge that touches it). */
  readonly gate: HexCoord;
  /** The beach where the hero embarks (beside the starting ship and the gate). */
  readonly embark: HexCoord;
  /** The other beach beside the second launch cell. */
  readonly beach: HexCoord;
  /** The town's remaining land neighbour. */
  readonly back: HexCoord;
  /** Water beside the town tile (LaunchShip cells). */
  readonly launch: readonly [HexCoord, HexCoord];
  /** The starting ship's water (beside the embark beach, not a launch cell). */
  readonly ship: HexCoord;
}

interface TownSpot {
  readonly town: HexCoord;
  readonly gate: HexCoord;
}

interface Geometry {
  readonly R: number;
  /** Rotation group of the terrain: slot s is the image of the first region under geom[s]. */
  readonly geom: readonly Transform[];
  /** Region-frame islands (copied to every slot). */
  readonly home: readonly HexCoord[];
  readonly outer: readonly HexCoord[];
  readonly outerKey: 'inner' | 'crescent';
  /** The shared central island (invariant under geom). */
  readonly objective: readonly HexCoord[];
  readonly harbor: NavalHarbor;
  /** A point near which a home-side unowned town prefers to stand on the outer island (Serpent: the near end). */
  readonly outerNear: HexCoord;
  readonly outerFar: HexCoord;
}

const HOME_CENTER_SC: HexCoord = { q: 18, r: 0 };
const HOME_CENTER_SS: HexCoord = { q: -18, r: 0 };

/** The harbor pattern at a home island's outer corner: the town beside the corner, the ship one hex beyond it. */
function harborFor(corner: HexCoord, out: number): NavalHarbor {
  const town = add(corner, dir(out + 2));
  return {
    town,
    gate: add(town, dir(out + 4)),
    embark: corner,
    beach: add(town, dir(out + 2)),
    back: add(town, dir(out + 3)),
    launch: [add(town, dir(out)), add(town, dir(out + 1))],
    ship: add(corner, dir(out)),
  };
}

function geometryOf(id: NavalMapType): Geometry {
  if (id === 'shattered_crown') {
    return {
      R: 25,
      geom: [0, 1, 2, 3, 4, 5].map((k) => rotN(k)),
      home: disc(HOME_CENTER_SC, 4),
      outer: disc({ q: 9, r: -3 }, 2),
      outerKey: 'inner',
      objective: disc({ q: 0, r: 0 }, 3),
      harbor: harborFor(add(HOME_CENTER_SC, dir(0), 4), 0),
      outerNear: { q: 11, r: -3 },
      outerFar: { q: 7, r: -3 },
    };
  }
  return {
    R: 25,
    geom: [identityT, rotN(3)],
    // The reference home disc without its two edges on the map rim, so a two-hex lane runs behind it.
    home: disc(HOME_CENTER_SS, 6).filter((c) => originDistance(c) <= 23),
    outer: crescentCells(),
    outerKey: 'crescent',
    objective: disc({ q: 0, r: 0 }, 3),
    harbor: harborFor({ q: -23, r: 0 }, 3),
    outerNear: { q: -11, r: 8 },
    outerFar: { q: 8, r: 6 },
  };
}

// ---------------------------------------------------------------------------
// Seats, slots and unowned-town hosting
// ---------------------------------------------------------------------------

interface SlotPlan {
  /** Slot of every seat. */
  readonly seatSlot: readonly number[];
  /** Seat of every slot (null: an unused slot, a neutral opportunity). */
  readonly slotSeat: readonly (number | null)[];
  /** Unowned towns hosted on each slot's island (home island for unused slots, or the outer island), in spot order. */
  readonly hosted: readonly { readonly kind: 'own' | 'other'; readonly seat: number }[][];
  /** Where unowned towns stand: on unused home islands (Shattered Crown 2-3 empires) or on the outer islands. */
  readonly townsOn: 'neutral_home' | 'outer' | 'none';
}

function slotPlan(id: NavalMapType, n: number, unowned: UnownedTowns, rng: RngCursor): SlotPlan {
  const slots = id === 'shattered_crown' ? 6 : 2;
  const base = id === 'shattered_crown' ? [...SHATTERED_CROWN_SLOTS[n]!] : [0, 1];
  const offset = rng.nextInt(slots);
  let seatSlot = base.map((s) => (s + offset) % slots);
  if (id === 'shattered_crown' && n === 6) {
    // Six empires: who neighbours whom is drawn too (every island is the same).
    const list = [...seatSlot];
    for (let i = list.length - 1; i > 0; i--) {
      const j = rng.nextInt(i + 1);
      [list[i], list[j]] = [list[j]!, list[i]!];
    }
    seatSlot = list;
  }
  const slotSeat: (number | null)[] = Array.from({ length: slots }, () => null);
  seatSlot.forEach((s, i) => (slotSeat[s] = i));
  const hosted: { kind: 'own' | 'other'; seat: number }[][] = Array.from({ length: slots }, () => []);
  const kinds: ('own' | 'other')[] = unowned === 'both' ? ['own', 'other'] : unowned === 'own' ? ['own'] : unowned === 'other' ? ['other'] : [];
  let townsOn: SlotPlan['townsOn'] = 'none';
  if (kinds.length > 0) {
    if (id === 'shattered_crown' && n < 6) {
      townsOn = 'neutral_home';
      // A seat's own-pantheon town on the unused island after its own (clockwise), the other on the one before.
      for (const kind of kinds) {
        seatSlot.forEach((s, seat) => {
          const host = kinds.length === 2 && kind === 'other' ? (s + slots - 1) % slots : (s + 1) % slots;
          hosted[host]!.push({ kind, seat });
        });
      }
      for (const h of hosted) h.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'own' ? -1 : 1));
    } else {
      townsOn = 'outer';
      for (const kind of kinds) seatSlot.forEach((s, seat) => hosted[s]!.push({ kind, seat }));
    }
  }
  return { seatSlot, slotSeat, hosted, townsOn };
}

/** Why a combination of settings cannot be generated (null: it can). The setup screen disables it with this reason. */
export function navalSettingsProblem(id: NavalMapType, size: string, empires: number, unowned: UnownedTowns = 'none'): string | null {
  const tpl = navalTemplate(id);
  if (!tpl.seats.includes(empires)) return tpl.seatReason;
  if (!tpl.sizes.includes(size as 'huge')) return tpl.sizeReason;
  if (id === 'shattered_crown' && empires === 6 && unowned === 'both') return 'Two unowned towns per empire do not fit six empires on The Shattered Crown: choose one kind, or fewer empires.';
  return null;
}

// ---------------------------------------------------------------------------
// Site specs
// ---------------------------------------------------------------------------

interface Spec {
  readonly key: string;
  /** Step distance from the island's anchor (the gate on a player home island, else the island's middle). */
  readonly band: readonly [number, number];
  readonly road: 'essential' | 'full' | 'none';
  readonly build: (ctx: BuildCtx) => SiteBody;
  /** Per-seat variant (the seat whose region the copy belongs to; null for neutral islands). */
  readonly localize?: (b: SiteBody, seat: number | null, rc: RegionCtx) => SiteBody;
}

interface RegionCtx {
  readonly catalog: ContentCatalog;
  readonly prisoners: readonly (string | null)[];
  readonly objectiveId: string;
  readonly townSiteIds: readonly string[];
}

const supplies = (ctx: BuildCtx): SiteBody => ({ name: 'Supply Cache', description: 'Shipwrecked stores washed ashore: gold, timber and stone.', kind: { type: 'pickup', reward: { resources: loot(ctx, { gold: 500 + 100 * ctx.rng.nextInt(4), wood: 4, stone: 3 }) } } });

function campSpec(key: string, minTier: number, maxTier: number, value: number, growth: number, stock: number, band: readonly [number, number]): Spec {
  return {
    key,
    band,
    road: 'none',
    build: (ctx) => {
      const c = pickCreature(ctx, minTier, maxTier);
      return {
        name: `${c.name} ${minTier >= 3 ? 'Lair' : 'Camp'}`,
        description: `${c.pluralName} ${minTier >= 3 ? 'keep a lair' : 'gather'} here and join a hero who pays their price.`,
        kind: { type: 'creature_camp', creatureId: c.id, weeklyGrowth: growth, initialStock: stock },
        guard: guard(ctx, `${c.name} ${minTier >= 3 ? 'lair' : 'camp'} guard`, value, c.tier, c.tier, { resources: loot(ctx, { gold: minTier >= 3 ? 500 : 300 }) }, minTier >= 3 ? 'grove' : 'coast_road'),
      };
    },
  };
}

function ruinSpec(key: string, band: readonly [number, number]): Spec {
  return {
    key,
    band,
    road: 'none',
    build: (ctx) => {
      const art = pickArtifact(ctx, ['minor']);
      return { name: 'Overgrown Ruin', description: 'Guardians lair in a ruin with an old treasure vault.', kind: { type: 'landmark', landmark: 'grove' }, guard: guard(ctx, 'Ruin guardians', 3200, 2, 4, withArtifact({ resources: loot(ctx, { gold: 800, crystal: 2 }) }, art), 'grove') };
    },
  };
}

const goldMineSpec = (key: string, band: readonly [number, number]): Spec => ({ key, band, road: 'full', build: (ctx) => ({ ...resourceSite('gold_mine', 500), guard: guard(ctx, 'Mine guards', 2600, 2, 3, { resources: loot(ctx, { gold: 500 }) }, 'open_field') }) });

const shrineSpec = (key: string, band: readonly [number, number]): Spec => ({
  key,
  band,
  road: 'none',
  build: (ctx) => {
    const spellId = shrineSpell(ctx);
    const sp = spellId ? ctx.catalog.spells[spellId] : undefined;
    if (!sp) return supplies(ctx);
    return { name: `Shrine of ${sp.name}`, description: `A wayside shrine. Every hero with a spellbook who prays here learns ${sp.name} (tier ${sp.tier}).`, kind: { type: 'spell_shrine', spellId: sp.id } };
  },
});

const trainerSpec = (key: string, band: readonly [number, number]): Spec => ({
  key,
  band,
  road: 'none',
  build: (ctx) => {
    const skillId = trainerSkill(ctx);
    const sk = skillId ? ctx.catalog.skills[skillId] : undefined;
    if (!sk) return supplies(ctx);
    return { name: `${sk.name} Trainer`, description: `An old master teaches ${sk.name} (Basic) to every hero who has a free skill slot and does not know it yet.`, kind: { type: 'skill_trainer', skillId: sk.id } };
  },
});

const vaultSpec = (key: string, band: readonly [number, number]): Spec => ({
  key,
  band,
  road: 'none',
  build: (ctx) => {
    const art = pickArtifact(ctx, ['major']);
    return { name: 'Sealed Vault', description: 'A sealed vault of a drowned kingdom, watched by its last soldiers.', kind: { type: 'landmark', landmark: 'quarry_cache' }, guard: guard(ctx, 'Vault wardens', 5200, 3, 5, withArtifact({ resources: loot(ctx, { gold: 1000, crystal: 3 }) }, art), 'grove', 2) };
  },
});

/** A player's home island: the guaranteed sawmill, quarry and supplies, renewable income and small finds. */
function homeSpecs(id: NavalMapType, treasure: TreasureLevel): Spec[] {
  const big = id === 'serpent_straits';
  const specs: Spec[] = [
    { key: 'sawmill', band: [2, 4], road: 'essential', build: () => resourceSite('sawmill', 2) },
    { key: 'quarry', band: [2, 4], road: 'essential', build: () => resourceSite('quarry', 2) },
    { key: 'cache', band: [2, 4], road: 'none', build: supplies },
    {
      key: 'windmill',
      band: [2, 6],
      road: 'full',
      build: (ctx) => {
        const options: ResourceCost[] = [{ wood: 3, stone: 3 }, { gold: 600, wood: 2 }, { wood: 4, crystal: 1 }];
        const weekly = loot(ctx, options[ctx.rng.nextInt(options.length)]!);
        const text = Object.entries(weekly)
          .filter(([, v]) => (v ?? 0) > 0)
          .map(([k, v]) => `${(v as number).toLocaleString('en-US')} ${k[0]!.toUpperCase() + k.slice(1)}`)
          .join(' and ');
        return { name: 'Windmill', description: `The millers pay the first hero who calls each week: ${text}.`, kind: { type: 'windmill', weekly } };
      },
    },
    { key: 'learning_stone', band: [2, 7], road: 'none', build: () => ({ name: 'Learning Stone', description: 'A standing stone carved with the deeds of old sea-kings. Every hero who stops to read it gains 1,000 experience, once.', kind: { type: 'learning_stone', xp: 1000 } }) },
    {
      key: 'trinket',
      band: [2, 7],
      road: 'none',
      build: (ctx) => {
        const art = pickArtifact(ctx, ['treasure']);
        const name = art ? ctx.catalog.artifacts[art]!.name : 'Trinket';
        return { name: 'Wayside Shrine', description: `An offering left at a cliff-top shrine: ${name}.`, kind: { type: 'pickup', reward: withArtifact({ resources: loot(ctx, { gold: 200 }) }, art) } };
      },
    },
    { key: 'chest_near', band: [2, 7], road: 'none', build: (ctx) => chestSite(ctx, 1000, 750) },
  ];
  if (big) specs.push({ key: 'event_near', band: [3, 9], road: 'none', build: (ctx) => eventSite(ctx, 'near') }, shrineSpec('spell_shrine_home', [3, 9]));
  if (treasure === 'rich') specs.push({ key: 'gold_small', band: [2, 7], road: 'essential', build: () => resourceSite('gold_mine', 250) });
  if (treasure === 'scarce') return specs.filter((s) => s.key !== 'trinket' && s.key !== 'chest_near' && s.key !== 'event_near');
  return specs;
}

/** An unused home island (Shattered Crown with 2 or 3 empires): an equally budgeted neutral opportunity. */
function neutralHomeSpecs(treasure: TreasureLevel, towns = 0): Spec[] {
  // Unowned harbor towns take room on the island: the smallest finds give way to them.
  const drop = new Set(towns >= 2 ? ['event_far', 'chest_far', 'skill_trainer'] : towns === 1 ? ['event_far'] : []);
  const all: Spec[] = [
    goldMineSpec('gold', [1, 5]),
    campSpec('camp_low', 1, 2, 1600, 4, 6, [1, 5]),
    ruinSpec('treasure', [1, 5]),
    shrineSpec('spell_shrine', [1, 5]),
    trainerSpec('skill_trainer', [1, 5]),
    { key: 'chest_far', band: [1, 5], road: 'none', build: (ctx) => chestSite(ctx, 1500, 1250) },
    campSpec('camp_high', 3, 4, 3800, 2, 3, [1, 5]),
    { key: 'event_far', band: [1, 5], road: 'none', build: (ctx) => eventSite(ctx, 'far') },
  ];
  if (treasure === 'rich') all.push(vaultSpec('vault', [1, 5]));
  const specs = all.filter((s) => !drop.has(s.key));
  if (treasure === 'scarce') return specs.filter((s) => s.key !== 'event_far' && s.key !== 'chest_far');
  return specs;
}

/**
 * A Shattered Crown inner island: one guarded rare-resource mine and (unless scarce) a guarded creature
 * camp — which gives way to the unowned harbor town when six empires host theirs here.
 */
function innerSpecs(treasure: TreasureLevel, withTown = false): Spec[] {
  const specs: Spec[] = [
    {
      key: 'rare',
      band: [0, 2],
      road: 'none',
      build: (ctx) => ({ ...resourceSite('crystal_deposit', 1), name: 'Crown Crystal Deposit', guard: guard(ctx, 'Deposit wardens', 2400, 2, 3, { resources: loot(ctx, { crystal: 2 }) }, 'coast_road') }),
    },
    campSpec('camp', 1, 2, 1600, 4, 6, [0, 2]),
  ];
  return treasure === 'scarce' || withTown ? specs.slice(0, 1) : specs;
}

/** A Serpent Straits curved island: income, a watchtower, recruits and treasures — optional staging, never a key. */
function crescentSpecs(treasure: TreasureLevel): Spec[] {
  const specs: Spec[] = [
    goldMineSpec('gold', [0, 12]),
    { key: 'crystal', band: [0, 12], road: 'none', build: (ctx) => ({ ...resourceSite('crystal_deposit', 1), guard: guard(ctx, 'Deposit wardens', 1800, 1, 3, { resources: loot(ctx, { crystal: 1 }) }, 'coast_road') }) },
    campSpec('camp_low', 1, 2, 1600, 4, 6, [0, 12]),
    campSpec('camp_high', 3, 4, 3800, 2, 3, [0, 12]),
    {
      key: 'watchtower',
      band: [0, 12],
      road: 'none',
      build: () => ({ name: 'Straits Watchtower', description: 'A lighthouse tower over the straits. The first visit shows the rival harbor and the central island.', kind: { type: 'watchtower', revealSiteIds: [] } }),
      localize: (b, seat, rc) => (b.kind.type === 'watchtower' ? { ...b, kind: { type: 'watchtower', revealSiteIds: [rc.objectiveId, ...rc.townSiteIds.filter((_, i) => i !== seat)] } } : b),
    },
    ruinSpec('treasure', [0, 12]),
    shrineSpec('spell_shrine', [0, 12]),
    trainerSpec('skill_trainer', [0, 12]),
    {
      key: 'quest_hut',
      band: [0, 12],
      road: 'none',
      build: (ctx) => {
        const art = pickArtifact(ctx, ['minor']);
        const asks: ResourceCost[] = [{ wood: 10, stone: 10 }, { crystal: 5 }, { wood: 6, stone: 6, crystal: 2 }];
        return { name: 'Quest Hut', description: 'A shipwright needs building supplies and pays well for them.', kind: { type: 'quest_hut', quest: { type: 'deliver', resources: asks[ctx.rng.nextInt(asks.length)]! }, reward: withArtifact({ resources: loot(ctx, { gold: 1500 }) }, art) } };
      },
    },
    {
      key: 'prison',
      band: [0, 12],
      road: 'none',
      build: () => ({ name: 'Prison', description: 'A hero languishes here.', kind: { type: 'prison', heroDefinitionId: '', level: 4 } }),
      localize: (b, seat, rc) => {
        const id = seat === null ? null : rc.prisoners[seat];
        const hero = id ? rc.catalog.heroes[id] : undefined;
        if (!hero || b.kind.type !== 'prison') return { name: 'Abandoned Prison', description: 'Empty cells and rusted chains. Somebody left supplies behind.', kind: { type: 'pickup', reward: { resources: { gold: 500 } } } };
        return { ...b, name: 'Prison', description: `${hero.name}, ${hero.title}, is held captive here. The first hero to stop here frees them; they join that empire at level ${b.kind.level}.`, kind: { ...b.kind, heroDefinitionId: hero.id } };
      },
    },
    { key: 'chest_far', band: [0, 12], road: 'none', build: (ctx) => chestSite(ctx, 1500, 1250) },
    { key: 'event_far', band: [0, 12], road: 'none', build: (ctx) => eventSite(ctx, 'far') },
  ];
  if (treasure === 'rich') specs.push(vaultSpec('vault', [0, 12]));
  if (treasure === 'scarce') return specs.filter((s) => s.key !== 'event_far' && s.key !== 'chest_far' && s.key !== 'crystal');
  return specs;
}

// ---------------------------------------------------------------------------
// Terrain stage
// ---------------------------------------------------------------------------

interface TerrainStage {
  /** Ground of every cell of the playable hexagon (relative coordinates). */
  readonly terrain: Map<string, Terrain>;
  /** Region-frame island cells after jitter. */
  readonly home: Set<string>;
  readonly outer: Set<string>;
  readonly objective: Set<string>;
}

function makeSet(cells: readonly HexCoord[]): Set<string> {
  return new Set(cells.map(hexKey));
}

/** Island label of every land cell of the whole map (every copy), for the gap checks of the jitter. */
function labelAll(g: Geometry, home: ReadonlySet<string>, outer: ReadonlySet<string>, objective: ReadonlySet<string>): Map<string, string> {
  const out = new Map<string, string>();
  g.geom.forEach((t, s) => {
    for (const k of home) out.set(hexKey(t(parseHexKey(k))), `home#${s}`);
    for (const k of outer) out.set(hexKey(t(parseHexKey(k))), `outer#${s}`);
  });
  for (const k of objective) out.set(k, 'objective');
  return out;
}

function connected(cells: ReadonlySet<string>): boolean {
  return components(cells).length === 1;
}

/** Bounded coast jitter (stage 1). Never touches reserved cells; keeps every channel and the rim lane. */
function jitter(tpl: NavalTemplateInfo, g: Geometry, rng: RngCursor, reservedLand: ReadonlySet<string>, reservedWater: ReadonlySet<string>): { home: Set<string>; outer: Set<string>; objective: Set<string> } {
  const home = makeSet(g.home);
  const outer = makeSet(g.outer);
  const objective = makeSet(g.objective);
  const minGap = tpl.minChannel + 1;
  // Home islands keep a lane of at least a channel's width behind them; outer islands the outer bypass.
  const rimOf = (key: 'home' | 'outer') => g.R - (key === 'outer' ? tpl.minOuterBypass : tpl.minChannel);
  const fits = (c: HexCoord, own: string, labels: ReadonlyMap<string, string>, rim: number): boolean => {
    if (originDistance(c) > rim) return false;
    for (let dq = -minGap; dq <= minGap; dq++) {
      for (let dr = Math.max(-minGap, -dq - minGap); dr <= Math.min(minGap, -dq + minGap); dr++) {
        if (dq === 0 && dr === 0) continue;
        const x = { q: c.q + dq, r: c.r + dr };
        const l = labels.get(hexKey(x));
        if (l && l !== own && axialDistance(c, x) < minGap) return false;
      }
    }
    return true;
  };
  const jitterIsland = (set: Set<string>, key: 'home' | 'outer', pRemove: number, pAdd: number, minSize: number) => {
    const own = `${key}#0`;
    // Notches: unreserved coast cells become water (the island stays one piece and big enough).
    const coast = [...set].map(parseHexKey).filter((c) => axialNeighbors(c).some((n) => !set.has(hexKey(n)))).sort(byKey);
    for (const c of coast) {
      const k = hexKey(c);
      if (reservedLand.has(k) || rng.nextInt(1000) >= pRemove * 1000) continue;
      if (set.size <= minSize) break;
      set.delete(k);
      if (!connected(set)) set.add(k);
    }
    // Bumps: water beside the coast becomes land where every channel stays wide enough.
    const labels = labelAll(g, key === 'home' ? set : home, key === 'outer' ? set : outer, objective);
    const ring = new Map<string, HexCoord>();
    for (const k of set) for (const n of axialNeighbors(parseHexKey(k))) if (!set.has(hexKey(n))) ring.set(hexKey(n), n);
    for (const c of [...ring.values()].sort(byKey)) {
      const k = hexKey(c);
      if (reservedWater.has(k) || rng.nextInt(1000) >= pAdd * 1000) continue;
      // The bump and all its copies must keep the gaps (the copies are other islands).
      let ok = true;
      for (let s = 0; s < g.geom.length && ok; s++) ok = fits(g.geom[s]!(c), key === 'home' ? `home#${s}` : `outer#${s}`, labels, rimOf(key));
      if (!ok) continue;
      set.add(k);
      for (let s = 0; s < g.geom.length; s++) labels.set(hexKey(g.geom[s]!(c)), key === 'home' ? `home#${s}` : `outer#${s}`);
    }
    void own;
  };
  jitterIsland(home, 'home', 0.14, 0.12, Math.floor(g.home.length * 0.85));
  jitterIsland(outer, 'outer', g.outerKey === 'inner' ? 0.06 : 0.12, g.outerKey === 'inner' ? 0.1 : 0.1, Math.floor(g.outer.length * 0.85));
  // The central island: whole orbits only, so it keeps the template's symmetry; its middle stays.
  const orbit = (c: HexCoord) => [...new Set(g.geom.map((t) => hexKey(t(c))))];
  const coastO = [...objective].map(parseHexKey).filter((c) => originDistance(c) >= 2 && axialNeighbors(c).some((n) => !objective.has(hexKey(n)))).sort(byKey);
  const doneO = new Set<string>();
  for (const c of coastO) {
    const ks = orbit(c);
    if (ks.some((k) => doneO.has(k))) continue;
    ks.forEach((k) => doneO.add(k));
    if (rng.nextInt(1000) < 120) {
      ks.forEach((k) => objective.delete(k));
      if (!connected(objective)) ks.forEach((k) => objective.add(k));
    }
  }
  const labels = labelAll(g, home, outer, objective);
  const ringO = new Map<string, HexCoord>();
  for (const k of objective) for (const n of axialNeighbors(parseHexKey(k))) if (!objective.has(hexKey(n))) ringO.set(hexKey(n), n);
  const doneR = new Set<string>();
  for (const c of [...ringO.values()].sort(byKey)) {
    const ks = orbit(c);
    if (ks.some((k) => doneR.has(k))) continue;
    ks.forEach((k) => doneR.add(k));
    if (rng.nextInt(1000) >= 90) continue;
    if (ks.every((k) => fits(parseHexKey(k), 'objective', labels, g.R - 3))) ks.forEach((k) => objective.add(k));
  }
  return { home, outer, objective };
}

/** The cells a hex keeps clear around its harbor (never jittered, never a cliff or a site). */
function harborReserve(h: NavalHarbor): { land: Set<string>; water: Set<string> } {
  const land = new Set([h.town, h.gate, h.embark, h.beach, h.back].map(hexKey));
  const water = new Set<string>();
  for (const c of [h.ship, ...h.launch]) {
    water.add(hexKey(c));
    for (const n of axialNeighbors(c)) if (!land.has(hexKey(n))) water.add(hexKey(n));
  }
  return { land, water };
}

/** Smoothed per-cell noise from a stream (drawn in a fixed cell order, so the same stream gives the same field). */
function noiseField(cells: readonly HexCoord[], rng: RngCursor): (c: HexCoord) => number {
  const raw = new Map<string, number>();
  for (const c of [...cells].sort(byKey)) raw.set(hexKey(c), rng.nextInt(10000) / 10000);
  return (c) => {
    const ns = [c, ...axialNeighbors(c)];
    let sum = 0;
    let n = 0;
    for (const x of ns) {
      const v = raw.get(hexKey(x));
      if (v !== undefined) {
        sum += v;
        n++;
      }
    }
    return n ? sum / n : 0.5;
  };
}

/** Cliff cells cutting an island's coast into `cuts` separated beach runs (angles evenly spaced from a random start). */
function cliffCuts(island: ReadonlySet<string>, cuts: number, protectedCells: ReadonlySet<string>, rng: RngCursor, orbit?: (c: HexCoord) => string[]): Set<string> {
  const cells = [...island].map(parseHexKey);
  const mid = centroid(cells);
  const coast = cells.filter((c) => axialNeighbors(c).some((n) => !island.has(hexKey(n)))).sort(byKey);
  const out = new Set<string>();
  if (coast.length === 0 || cuts <= 0) return out;
  const start = rng.nextInt(360);
  const eligible = coast.filter((c) => !protectedCells.has(hexKey(c)));
  for (let j = 0; j < cuts; j++) {
    const target = (start + (j * 360) / cuts) % 360;
    let best: HexCoord | null = null;
    let bestD = Infinity;
    for (const c of eligible) {
      const k = hexKey(c);
      if (out.has(k) || axialNeighbors(c).some((n) => out.has(hexKey(n)))) continue;
      const a = angleFrom(mid, c);
      const d = Math.min(Math.abs(a - target), 360 - Math.abs(a - target));
      if (d < bestD - 1e-9) {
        bestD = d;
        best = c;
      }
    }
    if (!best) continue;
    for (const k of orbit ? orbit(best) : [hexKey(best)]) out.add(k);
  }
  return out;
}

function buildTerrain(tpl: NavalTemplateInfo, g: Geometry, rng: RngCursor, useJitter: boolean): TerrainStage {
  const reserve = harborReserve(g.harbor);
  const shaped = useJitter ? jitter(tpl, g, rng, reserve.land, reserve.water) : { home: makeSet(g.home), outer: makeSet(g.outer), objective: makeSet(g.objective) };
  const terrain = new Map<string, Terrain>();
  for (const c of disc({ q: 0, r: 0 }, g.R)) terrain.set(hexKey(c), 'water');
  const regionLand = [...shaped.home, ...shaped.outer].map(parseHexKey);
  // Coast cliffs (stage 2): the harbor and the beaches beside it are never cut.
  const protectHome = new Set<string>([...reserve.land]);
  for (const k of reserve.water) for (const n of axialNeighbors(parseHexKey(k))) if (shaped.home.has(hexKey(n))) protectHome.add(hexKey(n));
  for (const n of axialNeighbors(g.harbor.town)) protectHome.add(hexKey(n));
  const cliffs = new Set<string>([
    ...cliffCuts(shaped.home, tpl.landing.home + 1, protectHome, rng),
    ...cliffCuts(shaped.outer, g.outerKey === 'inner' ? tpl.landing.outer : tpl.landing.outer + 2, new Set(), rng),
  ]);
  const orbit = (c: HexCoord) => [...new Set(g.geom.map((t) => hexKey(t(c))))];
  const objCuts = g.geom.length === 6 ? 1 : 2;
  const objCliffs = cliffCuts(shaped.objective, objCuts, new Set(), rng, orbit);
  // Interior ground: passable everywhere (forest, rough, marsh and plains by smoothed noise).
  const veg = noiseField(regionLand, rng);
  const wet = noiseField(regionLand, rng);
  const fjord = tpl.biome === 'fjord';
  const groundAt = (c: HexCoord, island: ReadonlySet<string>): Terrain => {
    const coast = axialNeighbors(c).some((n) => !island.has(hexKey(n)));
    if (coast) return 'plains';
    const v = veg(c);
    const w = wet(c);
    if (v > (fjord ? 0.6 : 0.64)) return 'forest';
    if (v < (fjord ? 0.38 : 0.33)) return 'rough';
    return w > 0.7 ? 'marsh' : 'plains';
  };
  g.geom.forEach((t) => {
    for (const k of shaped.home) {
      const c = parseHexKey(k);
      terrain.set(hexKey(t(c)), cliffs.has(k) ? 'mountain' : groundAt(c, shaped.home));
    }
    for (const k of shaped.outer) {
      const c = parseHexKey(k);
      terrain.set(hexKey(t(c)), cliffs.has(k) ? 'mountain' : groundAt(c, shaped.outer));
    }
  });
  for (const k of shaped.objective) {
    const c = parseHexKey(k);
    const coast = axialNeighbors(c).some((n) => !shaped.objective.has(hexKey(n)));
    terrain.set(k, objCliffs.has(k) ? 'mountain' : coast || originDistance(c) <= 1 ? 'plains' : 'rough');
  }
  return { terrain, home: shaped.home, outer: shaped.outer, objective: shaped.objective };
}

// ---------------------------------------------------------------------------
// Content stage
// ---------------------------------------------------------------------------

interface Placed {
  readonly spec: Spec;
  readonly pos: HexCoord;
}

interface VariantLayout {
  readonly sites: Placed[];
  readonly towns: TownSpot[];
  readonly monsters: { home: HexCoord; way: HexCoord[] }[];
  readonly neutrals: { creatureId: string; pos: HexCoord }[];
  /** Road edges (region frame, relative coordinates). */
  readonly roads: Set<string>;
}

const passableT = (t: Terrain | undefined): boolean => !!t && t !== 'water' && t !== 'mountain' && t !== 'void';

/** Coastal town spots on an island: exactly two consecutive water neighbours, a beach beside each, an inward gate. */
function townSpots(island: ReadonlySet<string>, terrainAt: (c: HexCoord) => Terrain | undefined): TownSpot[] {
  const out: TownSpot[] = [];
  const isCoast = (c: HexCoord) => axialNeighbors(c).some((n) => terrainAt(n) === 'water');
  for (const k of [...island].sort((a, b) => byKey(parseHexKey(a), parseHexKey(b)))) {
    const c = parseHexKey(k);
    if (!passableT(terrainAt(c))) continue;
    const water = [0, 1, 2, 3, 4, 5].filter((i) => terrainAt(add(c, dir(i))) === 'water');
    if (water.length !== 2) continue;
    const w0 = water.find((i) => water.includes((i + 1) % 6));
    if (w0 === undefined) continue;
    const land = [2, 3, 4, 5].map((j) => add(c, dir(w0 + j)));
    if (!land.every((x) => passableT(terrainAt(x)) && island.has(hexKey(x)))) continue;
    // Beaches beside both launch cells (w0 - 1 and w0 + 2) must be landable coast; the gate is inland.
    const gate = add(c, dir(w0 + 4));
    if (isCoast(gate)) continue;
    out.push({ town: c, gate });
  }
  return out;
}

function islandAnchor(island: ReadonlySet<string>): HexCoord {
  const cells = [...island].map(parseHexKey);
  const mid = centroid(cells);
  let best = cells[0]!;
  let bestD = Infinity;
  for (const c of cells.sort(byKey)) {
    const x = c.q + c.r / 2 - mid.x;
    const y = (c.r * Math.sqrt(3)) / 2 - mid.y;
    const d = x * x + y * y;
    if (d < bestD - 1e-9) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

interface LayoutInput {
  readonly island: ReadonlySet<string>;
  readonly terrainAt: (c: HexCoord) => Terrain | undefined;
  readonly specs: readonly Spec[];
  /** Cells no site may take (harbor, town spots and their gates, water). */
  readonly reserved: ReadonlySet<string>;
  /** Distance bands are measured from here. */
  readonly anchor: HexCoord;
  /** Sites must be reachable from these cells (the gate, or every beach). */
  readonly from: readonly HexCoord[];
  readonly towns: readonly TownSpot[];
  readonly monsters: number;
  readonly rng: RngCursor;
}

/** Sites, monsters on one island (region frame), re-drawn a few times until every site and beach connects. */
function layoutIsland(inp: LayoutInput): { sites: Placed[]; monsters: { home: HexCoord; way: HexCoord[] }[] } | null {
  const { island, terrainAt, rng } = inp;
  const isCoast = (c: HexCoord) => axialNeighbors(c).some((n) => !island.has(hexKey(n)) || terrainAt(n) === 'water');
  const interior = [...island]
    .map(parseHexKey)
    .filter((c) => passableT(terrainAt(c)) && !isCoast(c) && !inp.reserved.has(hexKey(c)))
    .sort(byKey);
  const townCells = inp.towns.flatMap((t) => [t.town, t.gate]);
  for (let attempt = 0; attempt < 14; attempt++) {
    const chosen: Placed[] = [];
    let failed = false;
    for (const spec of inp.specs) {
      let [lo, hi] = spec.band;
      let pick: HexCoord | null = null;
      for (let widen = 0; widen < 4 && !pick; widen++) {
        const cands = interior.filter((c) => {
          const d = axialDistance(c, inp.anchor);
          if (d < lo || d > hi) return false;
          if (chosen.some((x) => axialDistance(x.pos, c) < 2)) return false;
          if (townCells.some((t) => axialDistance(t, c) < 2)) return false;
          return inp.from.every((f) => axialDistance(f, c) >= 2 || inp.from.length > 2);
        });
        if (cands.length) pick = cands[rng.nextInt(cands.length)]!;
        lo = Math.max(0, lo - 1);
        hi += 2;
      }
      if (!pick) {
        failed = true;
        break;
      }
      chosen.push({ spec, pos: pick });
    }
    if (failed) continue;
    // Wandering monsters: inland, away from towns, gates, sites and every other monster.
    const monsters: { home: HexCoord; way: HexCoord[] }[] = [];
    for (let m = 0; m < inp.monsters; m++) {
      const cands = interior.filter((c) => !chosen.some((x) => axialDistance(x.pos, c) < 2) && townCells.every((t) => axialDistance(t, c) >= 3) && monsters.every((h) => axialDistance(h.home, c) >= 3));
      if (!cands.length) break;
      const home = cands[rng.nextInt(cands.length)]!;
      const ring = interior.filter((c) => axialDistance(c, home) === 2 && !chosen.some((x) => axialDistance(x.pos, c) < 1));
      const way: HexCoord[] = [home];
      for (let w = 0; w < 2 && ring.length; w++) way.push(ring.splice(rng.nextInt(ring.length), 1)[0]!);
      monsters.push({ home, way });
    }
    // Every site and every beach connects to the anchor cells (sites are destinations, never passed through).
    const blocked = new Set([...chosen.map((x) => hexKey(x.pos)), ...inp.towns.map((t) => hexKey(t.town))]);
    const walk = (k: string) => island.has(k) && passableT(terrainAt(parseHexKey(k))) && !blocked.has(k);
    const reach = flood(inp.from.map(hexKey).filter(walk), walk);
    const reachable = (c: HexCoord) => reach.has(hexKey(c)) || axialNeighbors(c).some((n) => reach.has(hexKey(n)));
    if (!chosen.every((x) => reachable(x.pos))) continue;
    const beaches = [...island].map(parseHexKey).filter((c) => passableT(terrainAt(c)) && isCoast(c) && !blocked.has(hexKey(c)));
    if (!beaches.every((c) => reach.has(hexKey(c)))) continue;
    return { sites: chosen, monsters };
  }
  return null;
}

/** Roads from `from` to each target on land (sites are never crossed; the target itself is entered). */
function routeRoads(island: ReadonlySet<string>, terrainAt: (c: HexCoord) => Terrain | undefined, blocked: ReadonlySet<string>, from: HexCoord, targets: readonly HexCoord[]): Set<string> {
  const edges = new Set<string>();
  const cost = (t: Terrain | undefined) => (t === 'plains' ? 4 : t === 'marsh' ? 7 : 5);
  for (const to of targets) {
    const goal = hexKey(to);
    const dist = new Map<string, number>([[hexKey(from), 0]]);
    const prev = new Map<string, string>();
    const open: { k: string; d: number }[] = [{ k: hexKey(from), d: 0 }];
    while (open.length) {
      open.sort((a, b) => a.d - b.d || (a.k < b.k ? -1 : a.k > b.k ? 1 : 0));
      const cur = open.shift()!;
      if (cur.k === goal) break;
      if (cur.d > (dist.get(cur.k) ?? Infinity)) continue;
      for (const n of axialNeighbors(parseHexKey(cur.k))) {
        const nk = hexKey(n);
        if (!island.has(nk) || !passableT(terrainAt(n))) continue;
        if (blocked.has(nk) && nk !== goal) continue;
        const onRoad = edges.has(edgeKey(parseHexKey(cur.k), n));
        const nd = cur.d + (onRoad ? cost(terrainAt(n)) * 0.4 : cost(terrainAt(n)));
        if (nd < (dist.get(nk) ?? Infinity)) {
          dist.set(nk, nd);
          prev.set(nk, cur.k);
          open.push({ k: nk, d: nd });
        }
      }
    }
    if (!prev.has(goal)) continue;
    for (let k = goal; prev.has(k); k = prev.get(k)!) edges.add(edgeKey(parseHexKey(prev.get(k)!), parseHexKey(k)));
  }
  return edges;
}

// ---------------------------------------------------------------------------
// The generator
// ---------------------------------------------------------------------------

export interface NavalGenOptions extends SkirmishGenOptions {
  readonly mapType: NavalMapType;
}

export function generateNavalSkirmish(catalog: ContentCatalog, opts: NavalGenOptions): GeneratedSkirmish {
  const tpl = navalTemplate(opts.mapType);
  const n = opts.seats.length;
  const unowned: UnownedTowns = opts.unownedTowns ?? 'none';
  const problem = navalSettingsProblem(tpl.id, opts.size, n, unowned);
  if (problem) throw new NavalGenerationError(`${tpl.label}: ${problem}`);
  if (opts.portals === true) throw new NavalGenerationError(`${tpl.label}: portals stay off — ${NAVAL_PORTAL_LOCK_REASON}`);
  const features: ScenarioFeatures = opts.features ?? { expandedContent: true, weeklyEvents: true, interventions: true, heroSpecialties: true, neutralReactions: true, climateRules: opts.climateRules ?? true, aiTemperaments: opts.aiTemperaments ?? true, cityDedicationsV1: true, scoutingIntelV1: true, targetableCatapultV1: true, recruitmentCaravansV1: true, navalMovementV1: true, seaEncountersV1: true };
  if (features.navalMovementV1 !== true) throw new NavalGenerationError(`${tpl.label} needs hero ships (navalMovementV1): ships are the only way between its islands`);
  for (const s of opts.seats) if (!catalog.skirmishKits?.[s.pantheonId]) throw new NavalGenerationError(`No skirmish kit for ${s.pantheonId}`);
  if (SKIRMISH_SIZE_RADIUS[opts.size] !== 25) throw new NavalGenerationError(`${tpl.label}: ${tpl.sizeReason}`);
  const seed = opts.seed >>> 0;
  const guards: GuardStrength = opts.guards ?? 'normal';
  const treasure: TreasureLevel = opts.treasure ?? 'normal';
  const wealth: StartWealth = opts.startWealth ?? 'normal';
  const roadsSetting: RoadDensity = opts.roads ?? 'full';
  const victory = opts.victory;
  const settings = [
    tpl.id,
    `${n}p`,
    guards,
    treasure,
    wealth,
    roadsSetting,
    opts.revealMap ? 'revealed' : 'fog',
    victory.type === 'hold_relic' ? `hold${victory.days}` : 'elimination',
    `monsters-${opts.monsters}`,
    ...(opts.turnOrder && opts.turnOrder !== (n >= 3 ? 'rotating' : 'fixed') ? [opts.turnOrder] : []),
    ...(unowned !== 'none' ? [`free${unowned}`] : []),
    ...(opts.neutralSites ? ['neutrals'] : []),
    ...(features.climateRules === false ? ['noclimate'] : []),
    ...(features.aiTemperaments === false ? ['notemperaments'] : []),
  ].join('-');
  // Stream labels keep the first release's version: template v2 adds the sea sites on the same islands (NAVAL_STREAM_VERSION).
  const label = (stream: string, k?: number) => `${NAVAL_GENERATOR_ID}|${tpl.id}|v${NAVAL_STREAM_VERSION}|${seed}|${stream}${k === undefined ? '' : `|${k}`}`;
  const g = geometryOf(tpl.id);
  const plan = slotPlan(tpl.id, n, unowned, new RngCursor(seedFromLabel(label('seats'))));
  const reasons: string[] = [];
  for (let k = 0; k <= NAVAL_MAX_CANDIDATES; k++) {
    const fallback = k === NAVAL_MAX_CANDIDATES;
    try {
      return attempt(k, fallback);
    } catch (e) {
      if (!(e instanceof CandidateRejected)) throw e;
      reasons.push(`#${k}: ${e.message}`);
    }
  }
  throw new NavalGenerationError(`${tpl.label} (seed ${seed}) could not be laid out: no candidate and not the reference shape passed every check (${reasons.slice(-3).join(' | ')})`);

  function attempt(k: number, fallback: boolean): GeneratedSkirmish {
    // --- Stage 1-2: terrain -------------------------------------------------------
    const stage = buildTerrain(tpl, g, new RngCursor(seedFromLabel(label('terrain', k))), !fallback);
    const terrain = stage.terrain;
    const tAt = (c: HexCoord) => terrain.get(hexKey(c));
    // --- Stage 3: content (identities from the content stream, positions from the layout stream) ---
    const crng = new RngCursor(seedFromLabel(label('content')));
    const lrng = new RngCursor(seedFromLabel(label('layout', k)));
    const ctx: BuildCtx = { rng: crng, catalog, guardPct: GUARD_PERCENT[guards], treasurePct: TREASURE_PERCENT[treasure], scope: features };
    const kits = opts.seats.map((s) => catalog.skirmishKits[s.pantheonId]!);
    const h = g.harbor;
    const unusedSlots = plan.slotSeat.map((s, i) => (s === null ? i : -1)).filter((i) => i >= 0);
    const hasNeutralHomes = unusedSlots.length > 0;
    const monsterCount = opts.monsters === 'none' ? 0 : opts.monsters === 'few' ? 1 : 2;
    const maxHosted = Math.max(0, ...plan.hosted.map((x) => x.length));

    // Variant layouts in the region frame.
    const homeLayout = (() => {
      const reserved = new Set([hexKey(h.town), hexKey(h.gate), hexKey(h.embark), hexKey(h.beach), hexKey(h.back)]);
      const out = layoutIsland({ island: stage.home, terrainAt: tAt, specs: homeSpecs(tpl.id, treasure), reserved, anchor: h.gate, from: [h.gate], towns: [{ town: h.town, gate: h.gate }], monsters: 0, rng: lrng });
      if (!out) throw new CandidateRejected('the home island has no room for its sites');
      return out;
    })();
    const spotsFor = (island: ReadonlySet<string>, count: number, prefer: readonly HexCoord[], avoid: readonly HexCoord[]): TownSpot[] => {
      if (count === 0) return [];
      const all = townSpots(island, tAt);
      const picked: TownSpot[] = [];
      for (let i = 0; i < count; i++) {
        const target = prefer[i] ?? prefer[0]!;
        const cands = all
          .filter((s) => picked.every((p) => axialDistance(p.town, s.town) >= 5) && avoid.every((a) => axialDistance(a, s.town) >= 3))
          .sort((a, b) => axialDistance(a.town, target) - axialDistance(b.town, target) || byKey(a.town, b.town));
        if (!cands.length) throw new CandidateRejected('no coastal spot for an unowned town');
        picked.push(cands[0]!);
      }
      return picked;
    };
    let neutralLayout: VariantLayout | null = null;
    if (hasNeutralHomes) {
      // An unused home island: up to two unowned-town spots (the first is the harbor a capital would have).
      const towns: TownSpot[] = [];
      if (plan.townsOn === 'neutral_home') {
        towns.push({ town: h.town, gate: h.gate });
        if (maxHosted > 1) {
          // The second spot: the coastal spot farthest from the harbor (stable tie-break).
          const more = townSpots(stage.home, tAt).filter((s) => axialDistance(s.town, h.town) >= 5).sort((a, b) => axialDistance(b.town, h.town) - axialDistance(a.town, h.town) || byKey(a.town, b.town));
          if (!more.length) throw new CandidateRejected('an unused island has no room for two unowned towns');
          towns.push(more[0]!);
        }
      }
      const reserved = new Set([...towns.flatMap((t) => [hexKey(t.town), hexKey(t.gate)])]);
      const anchor = islandAnchor(stage.home);
      const coastFrom = [...stage.home].map(parseHexKey).filter((c) => passableT(tAt(c)) && axialNeighbors(c).some((x) => tAt(x) === 'water') && !reserved.has(hexKey(c)));
      const out = layoutIsland({ island: stage.home, terrainAt: tAt, specs: neutralHomeSpecs(treasure, towns.length), reserved, anchor, from: coastFrom, towns, monsters: monsterCount, rng: lrng });
      if (!out) throw new CandidateRejected('an unused island has no room for its neutral sites');
      neutralLayout = { sites: out.sites, towns, monsters: out.monsters, neutrals: [], roads: new Set() };
    }
    const outerLayout = (() => {
      const hostedCount = plan.townsOn === 'outer' ? maxHosted : 0;
      const towns = hostedCount ? spotsFor(stage.outer, hostedCount, [g.outerNear, g.outerFar], []) : [];
      const reserved = new Set(towns.flatMap((t) => [hexKey(t.town), hexKey(t.gate)]));
      const anchor = islandAnchor(stage.outer);
      const coastFrom = [...stage.outer].map(parseHexKey).filter((c) => passableT(tAt(c)) && axialNeighbors(c).some((x) => tAt(x) === 'water') && !reserved.has(hexKey(c)));
      const specs = g.outerKey === 'inner' ? innerSpecs(treasure, hostedCount > 0) : crescentSpecs(treasure);
      const out = layoutIsland({ island: stage.outer, terrainAt: tAt, specs, reserved, anchor, from: coastFrom, towns, monsters: g.outerKey === 'crescent' ? monsterCount : 0, rng: lrng });
      if (!out) throw new CandidateRejected(`the ${g.outerKey === 'inner' ? 'inner' : 'curved'} island has no room for its sites`);
      return { sites: out.sites, towns, monsters: out.monsters, neutrals: [] as { creatureId: string; pos: HexCoord }[], roads: new Set<string>() };
    })();

    // Neutral hiring sites (setup option): one species per island kind where the ground fits its habitat.
    const neutralTable = opts.neutralSites;
    if (neutralTable) {
      const nrng = new RngCursor(seedFromLabel(label('neutrals', k)));
      const species = neutralSpeciesForBiome(catalog, neutralTable, tpl.biome);
      for (let i = species.length - 1; i > 0; i--) {
        const j = nrng.nextInt(i + 1);
        [species[i], species[j]] = [species[j]!, species[i]!];
      }
      const groundRel: GroundAt = (c) => tAt(c) ?? 'void';
      const targets: { island: ReadonlySet<string>; layout: { sites: Placed[]; towns: TownSpot[]; neutrals: { creatureId: string; pos: HexCoord }[] }; extraBusy: HexCoord[] }[] = [
        { island: stage.outer, layout: outerLayout, extraBusy: [] },
        ...(neutralLayout ? [{ island: stage.home as ReadonlySet<string>, layout: neutralLayout, extraBusy: [] as HexCoord[] }] : []),
      ];
      let placed = 0;
      for (const id of species) {
        if (placed >= SKIRMISH_NEUTRAL_SPECIES[opts.size]) break;
        const habitat = neutralTable.habitats[id]!;
        const plural = catalog.creatures[id]!.pluralName;
        for (const t of targets) {
          if (t.layout.neutrals.length > 0) continue;
          const busy = [...t.layout.sites.map((x) => x.pos), ...t.layout.towns.flatMap((x) => [x.town, x.gate])];
          const cands = [...t.island]
            .map(parseHexKey)
            .filter((c) => passableT(tAt(c)) && !axialNeighbors(c).some((x) => tAt(x) === 'water') && busy.every((b) => axialDistance(b, c) >= 2) && habitatVerdict(habitat, plural, tpl.biome, groundRel, c).fits)
            .sort(byKey);
          if (!cands.length) continue;
          t.layout.neutrals.push({ creatureId: id, pos: cands[nrng.nextInt(cands.length)]! });
          placed++;
          break;
        }
      }
    }

    // Roads (land only): the gate to the essential sites (and, with full roads, to the rest of the home island).
    const homeBlocked = new Set([hexKey(h.town), ...homeLayout.sites.map((x) => hexKey(x.pos))]);
    const homeTargets = homeLayout.sites.filter((x) => x.spec.road === 'essential' || (roadsSetting === 'full' && x.spec.road === 'full')).map((x) => x.pos);
    const homeRoads = routeRoads(stage.home, tAt, homeBlocked, h.gate, [h.embark, ...homeTargets]);
    homeRoads.add(edgeKey(h.town, h.gate));
    if (neutralLayout) for (const t of neutralLayout.towns) neutralLayout.roads.add(edgeKey(t.town, t.gate));
    for (const t of outerLayout.towns) outerLayout.roads.add(edgeKey(t.town, t.gate));
    // Sites and towns stand on open ground.
    const clear = (c: HexCoord) => {
      const kk = hexKey(c);
      if (terrain.get(kk) !== 'mountain' && terrain.get(kk) !== 'water') terrain.set(kk, 'plains');
    };
    const slotTransform = (s: number) => g.geom[s]!;
    g.geom.forEach((t, s) => {
      const seat = plan.slotSeat[s] ?? null;
      clear(t(h.town));
      clear(t(h.gate));
      const homeL = seat === null ? neutralLayout! : null;
      for (const p of seat === null ? homeL!.sites : homeLayout.sites) clear(t(p.pos));
      for (const p of outerLayout.sites) clear(t(p.pos));
      for (const p of outerLayout.towns) {
        clear(t(p.town));
        clear(t(p.gate));
      }
      if (seat === null) for (const p of homeL!.towns) clear(t(p.town));
    });
    // Coastal sites and sea salvage (template v2; naval/seaSites.ts): first-region frame, copied to every slot.
    const seaPlaced = placeNavalSeaSites({
      catalog,
      tpl,
      geom: g.geom,
      R: g.R,
      terrainAt: tAt,
      home: stage.home,
      outer: stage.outer,
      outerKey: g.outerKey,
      harbor: h,
      busy: seaBusy(h, [homeLayout, outerLayout, ...(neutralLayout ? [neutralLayout] : [])]),
      guardPct: ctx.guardPct,
      expanded: features.expandedContent,
      layout: new RngCursor(seedFromLabel(label('sea-layout', k))),
      content: new RngCursor(seedFromLabel(label('sea-content'))),
    });
    if (typeof seaPlaced === 'string') throw new CandidateRejected(`sea sites: ${seaPlaced}`);

    // --- Mission ---------------------------------------------------------------------
    const center: HexCoord = { q: 38, r: 25 };
    const abs = (c: HexCoord): HexCoord => ({ q: c.q + center.q, r: c.r + center.r });
    const sites: SiteDefinition[] = [];
    const usedNames = new Map<string, number>();
    const townIds = opts.seats.map((_, i) => `town_${i + 1}`);
    const townSiteIds = townIds.map((t) => `site_${t}`);
    const playerIds = opts.seats.map((_, i) => (i === 0 ? 'player' : `p${i + 1}`));
    const townNames = kits.map((kit) => {
      const used = usedNames.get(kit.pantheonId) ?? 0;
      usedNames.set(kit.pantheonId, used + 1);
      return kit.townNames[used % kit.townNames.length] ?? `Harbor ${used + 1}`;
    });
    opts.seats.forEach((seat, i) => {
      const t = slotTransform(plan.seatSlot[i]!);
      sites.push({ id: townSiteIds[i]!, anchorId: townSiteIds[i]!, coord: abs(t(h.town)), name: townNames[i]!, description: `${seat.name ?? townNames[i]}’s harbor town.`, kind: { type: 'town', townId: townIds[i]! } });
    });
    const objectiveId = victory.type === 'hold_relic' ? 'relic' : 'center_gold';
    const leaderIds = (() => {
      const used = new Map<string, number>();
      return kits.map((kit) => {
        const c = used.get(kit.pantheonId) ?? 0;
        used.set(kit.pantheonId, c + 1);
        return kit.leaders[c % kit.leaders.length]!.definitionId;
      });
    })();
    const prisoners: (string | null)[] = [];
    for (const seat of opts.seats) {
      const pool = (catalog.pantheons[seat.pantheonId]?.heroIds ?? []).filter((id) => catalog.heroes[id]?.availability === 'hireable' && !leaderIds.includes(id) && !prisoners.includes(id)).sort();
      prisoners.push(pool.length ? pool[crng.nextInt(pool.length)]! : null);
    }
    const rc: RegionCtx = { catalog, prisoners, objectiveId, townSiteIds };
    // Build every spec's content once, in a fixed order (the same identities for every candidate and slot).
    const builtCache = new Map<string, SiteBody>();
    const built = (variant: Variant, spec: Spec): SiteBody => {
      const key = `${variant}:${spec.key}`;
      if (!builtCache.has(key)) builtCache.set(key, spec.build(ctx));
      return builtCache.get(key)!;
    };
    for (const spec of homeSpecs(tpl.id, treasure)) built('player', spec);
    if (hasNeutralHomes) for (const spec of neutralHomeSpecs(treasure)) built('neutral', spec);
    for (const spec of g.outerKey === 'inner' ? innerSpecs(treasure) : crescentSpecs(treasure)) built(g.outerKey === 'inner' ? 'inner' : 'crescent', spec);
    const suffixOf = (slot: number) => {
      const seat = plan.slotSeat[slot] ?? null;
      return seat === null ? `x${slot + 1}` : String(seat + 1);
    };
    const pushSites = (variant: Variant, layout: { sites: Placed[] }, slot: number, prefix: string) => {
      const t = slotTransform(slot);
      const seat = plan.slotSeat[slot] ?? null;
      for (const p of layout.sites) {
        const id = `${prefix}${p.spec.key}_${suffixOf(slot)}`;
        const body = built(variant, p.spec);
        const local = p.spec.localize ? p.spec.localize(body, seat, rc) : body;
        sites.push({ id, anchorId: id, coord: abs(t(p.pos)), ...local });
      }
    };
    g.geom.forEach((_, s) => {
      if (plan.slotSeat[s] === null) pushSites('neutral', neutralLayout!, s, '');
      else pushSites('player', homeLayout, s, '');
      pushSites(g.outerKey === 'inner' ? 'inner' : 'crescent', outerLayout, s, g.outerKey === 'inner' ? 'inner_' : '');
    });
    // Lookouts, wrecks and salvage: the same in every slot (ids end with the slot's suffix, like the islands' sites).
    g.geom.forEach((_, s) => {
      for (const x of seaPlaced) sites.push({ id: `${x.key}_${suffixOf(s)}`, anchorId: `${x.key}_${suffixOf(s)}`, coord: abs(slotTransform(s)(x.pos)), ...x.body });
    });
    // The central objective: the shrine (hold the relic) or the guarded central gold mine (elimination).
    const centerRelic = treasure === 'rich' ? pickArtifact(ctx, ['relic']) : null;
    if (victory.type === 'hold_relic') {
      sites.push({ id: 'relic', anchorId: 'relic', coord: abs({ q: 0, r: 0 }), name: 'Shrine of the Broken Crown', description: `Hold the shrine at ${victory.days} dawns in a row to win.`, kind: { type: 'relic' }, guard: guard(ctx, 'Crown wardens', 9000, 4, 6, withArtifact({ resources: loot(ctx, { gold: 1500 }) }, centerRelic), 'beacon_clearing', 2) });
    } else {
      sites.push({ id: 'center_gold', anchorId: 'center_gold', coord: abs({ q: 0, r: 0 }), ...resourceSite('gold_mine', 1000), name: 'Crown Gold Mine', guard: guard(ctx, 'Mine guards', 8000, 4, 6, withArtifact({ resources: loot(ctx, { gold: 1000, crystal: 2 }) }, centerRelic), 'open_field', 2) });
    }
    // Neutral hiring sites.
    const neutralNames: string[] = [];
    const pushNeutrals = (layout: { neutrals: { creatureId: string; pos: HexCoord }[] }, slot: number, tag: string) => {
      for (const p of layout.neutrals) {
        const body = neutralSiteDefinition(catalog, neutralTable, p.creatureId);
        const id = `neutral_${tag}${p.creatureId}_${suffixOf(slot)}`;
        sites.push({ id, anchorId: id, coord: abs(slotTransform(slot)(p.pos)), ...body });
        const name = catalog.creatures[p.creatureId]!.pluralName;
        if (!neutralNames.includes(name)) neutralNames.push(name);
      }
    };
    g.geom.forEach((_, s) => {
      pushNeutrals(outerLayout, s, '');
      if (plan.slotSeat[s] === null && neutralLayout) pushNeutrals(neutralLayout, s, 'home_');
    });
    // Unowned towns: the hosted list of each slot fills its spots in order.
    const neutralTowns: MissionTownSetup[] = [];
    g.geom.forEach((_, s) => {
      const list = plan.hosted[s]!;
      const spots = plan.townsOn === 'neutral_home' ? (neutralLayout?.towns ?? []) : outerLayout.towns;
      list.forEach((entry, idx) => {
        const spot = spots[idx];
        if (!spot) throw new CandidateRejected('an unowned town has no spot');
        const own = kits[entry.seat]!.pantheonId;
        const others = otherPantheons(catalog, own);
        const pantheonId = entry.kind === 'own' || others.length === 0 ? own : others[crng.nextInt(others.length)]!;
        const kit = catalog.skirmishKits[pantheonId]!;
        const used = usedNames.get(pantheonId) ?? 0;
        usedNames.set(pantheonId, used + 1);
        const name = kit.townNames[used % kit.townNames.length] ?? `Free Harbor ${idx + 1}`;
        const townId = `free_${entry.kind}_${entry.seat + 1}`;
        const siteId = `site_${townId}`;
        sites.push({ id: siteId, anchorId: siteId, coord: abs(slotTransform(s)(spot.town)), name, description: `A ${kit.adjective} harbor town without a lord, held by its own militia. Take it to build, recruit and launch ships there.`, kind: { type: 'town', townId } });
        neutralTowns.push(unownedTownSetup(catalog, pantheonId, townId, siteId, name, unownedTownGarrison(catalog, pantheonId, (UNOWNED_GARRISON_VALUE * ctx.guardPct) / 100)));
      });
    });
    // Wandering monsters: on unused home islands and curved islands only (never on a home island).
    const hostileHeroes: HostileHeroDefinition[] = [];
    const monsterCreatures = [0, 1].map(() => pickCreature(ctx, 2, 4));
    const pushMonsters = (layout: { monsters: { home: HexCoord; way: HexCoord[] }[] }, slot: number) => {
      layout.monsters.forEach((m, mi) => {
        const creature = monsterCreatures[mi]!;
        const t = slotTransform(slot);
        const start = abs(t(m.home));
        hostileHeroes.push({
          commander: { heroDefinitionId: `monster_${creature.id}`, name: `Wandering ${creature.pluralName}`, classId: 'champion', level: 1, attributes: { attack: 0, defense: 0, power: 0, knowledge: 0 }, skills: [], spellbook: false, spellIds: [], mana: 0, portraitAssetId: creature.presentation.portraitAssetId },
          monster: { bounty: loot(ctx, { gold: mi === 0 ? 600 : 900 }) },
          startCoord: start,
          army: [{ creatureId: creature.id, count: Math.max(1, Math.round(((mi === 0 ? 2200 : 3600) * ctx.guardPct) / 100 / (creature.cost?.gold ?? 100))) }],
          ai: { profile: 'patrol', waypoints: m.way.map((w) => abs(t(w))), regionMinQ: 0, regionMaxQ: 999, regionCenter: start, regionRadius: 3, attackThreshold: { numerator: 3, denominator: 2 } },
        });
      });
    };
    g.geom.forEach((_, s) => {
      if (plan.slotSeat[s] === null && neutralLayout) pushMonsters(neutralLayout, s);
      if (g.outerKey === 'crescent') pushMonsters(outerLayout, s);
    });
    // Starting ships: one empty owned ship per empire beside its embark beach (a scenario grant, never sold).
    const ships: MissionShipSetup[] = opts.seats.map((_, i) => {
      const t = slotTransform(plan.seatSlot[i]!);
      const coord = t(h.ship);
      const from = t(h.embark);
      const d = { q: coord.q - from.q, r: coord.r - from.r };
      const facing = [0, 1, 2, 3, 4, 5].find((j) => dir(j).q === d.q && dir(j).r === d.r) ?? 0;
      return { shipId: `start_ship_${i + 1}`, coord: abs(coord), ownerId: playerIds[i]!, facing };
    });
    // Players.
    const wallet = scaleCost(SKIRMISH_START_WALLET, WEALTH_PERCENT[wealth]);
    const leaderUse = new Map<string, number>();
    const setupFor = (i: number) => {
      const kit = kits[i]!;
      const c = leaderUse.get(kit.pantheonId) ?? 0;
      leaderUse.set(kit.pantheonId, c + 1);
      const leader = kit.leaders[c % kit.leaders.length]!;
      const townId = townIds[i]!;
      return {
        town: { townId, siteId: townSiteIds[i]!, name: townNames[i]!, archetypeId: kit.archetypeId, buildings: kit.buildings, population: kit.population, covenants: kit.covenants },
        hero: { heroId: `leader_${i + 1}`, definitionId: leader.definitionId, classId: leader.classId, defaults: { level: 1, xp: 0, attributes: kit.leaderAttributes, skills: kit.leaderSkills, spellbook: false }, army: kit.army, startTownId: townId },
      };
    };
    const seat0 = setupFor(0);
    const rivals: MissionRivalSetup[] = opts.seats.slice(1).map((seat, j) => {
      const i = j + 1;
      const s = setupFor(i);
      return { playerId: playerIds[i]!, name: seat.name ?? townNames[i]!, pantheonId: seat.pantheonId, color: SKIRMISH_PLAYER_COLORS[i % SKIRMISH_PLAYER_COLORS.length]!, wallet, controller: seat.controller, town: s.town, hero: s.hero };
    });
    // Roads of every slot (region-frame edges copied by the slot's rotation).
    const roadEdges = new Set<string>();
    const copyRoads = (edges: ReadonlySet<string>, slot: number) => {
      const t = slotTransform(slot);
      for (const e of edges) {
        const [a, b] = e.split('|').map(parseHexKey);
        roadEdges.add(edgeKey(abs(t(a!)), abs(t(b!))));
      }
    };
    g.geom.forEach((_, s) => {
      if (plan.slotSeat[s] === null) copyRoads(neutralLayout!.roads, s);
      else copyRoads(homeRoads, s);
      copyRoads(outerLayout.roads, s);
    });
    // --- Map ---------------------------------------------------------------------------
    const W = 77;
    const H = 51;
    let terrainStr = '';
    for (let r = 0; r < H; r++) {
      for (let q = 0; q < W; q++) {
        const rel = { q: q - center.q, r: r - center.r };
        terrainStr += TERRAIN_CODES[originDistance(rel) <= g.R ? (terrain.get(hexKey(rel)) ?? 'water') : 'void'];
      }
    }
    const roads = [...roadEdges].sort();
    const stamp = { id: tpl.id, version: NAVAL_TEMPLATE_VERSION, generator: NAVAL_GENERATOR_ID, seed, settings, candidate: k, fallback };
    const map: WorldMapDefinition = {
      templateId: RANDOM_TEMPLATE_ID,
      templateVersion: NAVAL_TEMPLATE_VERSION,
      generatorVersion: NAVAL_GENERATOR_ID,
      seed,
      attempt: k,
      mode: fallback ? 'golden_fallback' : 'variation',
      width: W,
      height: H,
      terrain: terrainStr,
      roads,
      logicalHash: hashValue({ templateId: RANDOM_TEMPLATE_ID, generator: NAVAL_GENERATOR_ID, navalTemplate: tpl.id, templateVersion: NAVAL_TEMPLATE_VERSION, seed, settings, width: W, height: H, terrain: terrainStr, roads }),
      biome: tpl.biome,
    };
    const policy: NavalTraversalPolicy = { id: NAVAL_ONLY_POLICY_ID, interIslandTravel: 'ships_only', portals: false, requiredFeature: 'navalMovementV1', reason: NAVAL_PORTAL_LOCK_REASON, template: stamp };
    const id = `random_huge_${n}p_${seed}_${settings}`;
    const holdText = victory.type === 'hold_relic' ? `Win by holding the Shrine of the Broken Crown on the central island at ${victory.days} dawns in a row, or by defeating every rival.` : 'Win by defeating every rival empire.';
    const freeText = neutralTowns.length ? ` ${neutralTowns.length / n === 1 ? 'One unowned harbor town' : 'Two unowned harbor towns'} per empire wait on the remote islands.` : '';
    const mission: MissionDefinition = {
      id,
      scenarioId: id,
      campaignId: null,
      order: 1,
      name: `Random Map — ${tpl.label}`,
      subtitle: `Huge · ${n} empires · seed ${seed}`,
      summary: `A generated huge naval map for ${n} empires. ${tpl.summary} ${holdText} Ships are the only way between the islands: each empire starts with an empty ship beside its harbor and can launch more at an owned coastal town (1,500 Gold and 10 Wood). Portals are off. Every empire gets the same island, the same sea routes and the same treasures (symmetric map${hasNeutralHomes ? '; the unused home islands hold equally budgeted neutral sites' : ''}). Guards ${guards}, treasure ${treasure}, starting wealth ${wealth}.${freeText}${neutralNames.length ? ` New neutral creatures hire out on the islands: ${neutralNames.join(' and ')}.` : ''} Proposed feature; values unplaytested.`,
      mapTemplateId: RANDOM_TEMPLATE_ID,
      soundscape: 'coast',
      targetPlaytime: n === 2 ? '45–90 minutes (unmeasured)' : '60–120 minutes (unmeasured)',
      newDecisions: ['Random map', tpl.label, `${n} empires`, 'Ships required', victory.type === 'hold_relic' ? 'Hold the relic' : 'Conquest'],
      xpCap: null,
      xpCapLevel: null,
      briefing: [{ speaker: 'Herald', portraitAssetId: 'story.herald.portrait', text: victory.type === 'hold_relic' ? `The broken Crown waits on its island at the heart of the sea. Whoever holds its shrine for ${victory.days} days will rule every shore. Your ship is ready in the harbor.` : 'Rival harbors wake across the straits. Only one fleet will remain. Your ship is ready in the harbor.' }],
      victory: [{ speaker: 'Herald', portraitAssetId: 'story.herald.portrait', text: 'Every shore is yours.' }],
      debriefPolicy: [],
      player: { playerId: 'player', name: opts.seats[0]!.name ?? townNames[0]!, controller: opts.seats[0]!.controller, pantheonId: opts.seats[0]!.pantheonId, wallet, town: seat0.town, hero: seat0.hero },
      rivals,
      ...(neutralTowns.length > 0 ? { neutralTowns } : {}),
      ...(hostileHeroes.length > 0 ? { hostilePlayer: { playerId: 'monsters', name: 'Wild creatures' } } : {}),
      ships,
      navalPolicy: policy,
      initialFlags: ['skirmish'],
      features,
      ...(opts.revealMap ? { startExplored: true } : {}),
      turnOrder: opts.turnOrder ?? (n >= 3 ? 'rotating' : 'fixed'),
      victoryCondition: victory.type === 'hold_relic' ? { type: 'hold_site', siteId: 'relic', days: victory.days } : { type: 'elimination' },
      purchasableBuildingIds: null,
      heroHiringEnabled: true,
      hireableHeroIds: randomMapTavernPool(catalog),
      sites,
      objectives: [
        victory.type === 'hold_relic'
          ? { id: 'victory', title: 'Hold the Broken Crown', description: `Own the Shrine of the Broken Crown at ${victory.days} dawns in a row — or defeat every rival empire.`, category: 'primary', initialStatus: 'active', condition: { type: 'flag', flag: 'rivals_eliminated' }, markerSiteId: 'relic' }
          : { id: 'victory', title: 'Conquer every shore', description: 'Defeat every rival hero and take every rival town — by sea.', category: 'primary', initialStatus: 'active', condition: { type: 'flag', flag: 'rivals_eliminated' } },
        ...(victory.type === 'elimination' ? [{ id: 'center_gold', title: 'Take the Crown gold mine', description: 'Land on the central island, defeat the mine guards and hold the gold mine.', category: 'optional' as const, initialStatus: 'active' as const, condition: { type: 'site_cleared' as const, siteId: 'center_gold' }, markerSiteId: 'center_gold' }] : []),
      ],
      hostileHeroes,
      helpTopics: [
        { id: 'naval_maps', title: 'Ships connect these islands', text: `${tpl.label}: water separates every island, so ships are the only way across. Walk to your empty ship beside the harbor and embark (it needs 100 movement and uses the rest of the day), sail 100 movement per sea hex over as many days as it takes, then land on a beach beside the ship (again the rest of the day). Launch more ships at an owned coastal town for 1,500 Gold and 10 Wood. A ship carrying a hero can board an enemy ship beside it: a battle on two decks joined by a bridge. Portals are off on these maps, and Recall only returns to a town you already own. Proposed; values unplaytested.` },
        { id: 'random_maps', title: 'Random maps', text: `Random maps are symmetric: every empire has the same island, sea routes, mines and treasures, so no starting position is favored. ${tpl.description}` },
        { id: 'sieges', title: 'Sieges', text: 'Entering an enemy town that has a garrison or a visiting hero starts a siege. Land first: troops never fight a town from a ship. The Fort gives walls and a gate, the Citadel adds a keep and a moat, the Castle stronger walls and two towers. Values are proposed.' },
        ...(neutralTowns.length ? [{ id: 'unowned_towns', title: 'Unowned towns', text: 'Unowned harbor towns start without a lord or a hero; their own militia holds them. Land, defeat it (a siege) and the town is yours: build, recruit, hire and launch ships there. Proposed; values unplaytested.' }] : []),
      ],
      protectedHeroFailure: false,
      thumbnailAssetId: tpl.artId,
    };
    const decor = buildDecor(map, deriveStreams(seed, `naval:${tpl.id}`, k));
    const checks = validateNavalMap(catalog, map, mission, tpl, decor);
    const failed = checks.filter((c) => !c.pass);
    if (failed.length > 0) throw new CandidateRejected(failed.map((c) => `${c.id} ${c.detail}`).join('; '));
    return { mission, map, decor, checks };
  }
}
