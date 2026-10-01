/**
 * SkirmishMapGenerator (proposed this build): random skirmish maps for two to
 * four empires.
 *
 * Fairness by construction: the playable area is a hexagon, the empires' towns
 * sit at hex-symmetric positions around the center, and everything — terrain,
 * roads, sites, guards, rewards, wandering monsters — is generated once for the
 * first empire's region and copied to every other empire by the exact hex
 * isometry (rotation or reflection) that carries the first town onto theirs.
 * Each empire therefore sees the same distances, costs and treasures. The
 * center is shared and contested.
 *
 * Output is DATA: a WorldMapDefinition and a full MissionDefinition (which the
 * match embeds), plus cosmetic decor and a validation report. Content (kits,
 * creatures, events) comes from the catalog; nothing here names a pantheon.
 */
import {
  RngCursor,
  TERRAIN_CODES,
  axialDistance,
  axialNeighbors,
  edgeKey,
  hashValue,
  hexKey,
  seedFromLabel,
  type ContentCatalog,
  type CreatureDefinition,
  type GuardDefinition,
  type HexCoord,
  type HostileHeroDefinition,
  type MissionDefinition,
  type MissionRivalSetup,
  type ResourceCost,
  type ScenarioFeatures,
  type SiteDefinition,
  type StackSpec,
  type Terrain,
  type WorldMapDefinition,
} from '@pr/rules';
import { buildDecor, deriveStreams, type DecorItem, type MapCheck } from './generator';

export const SKIRMISH_GENERATOR_VERSION = 'pr-skirmishgen-0.1';
export const RANDOM_TEMPLATE_ID = 'random_skirmish';

export type SkirmishMapSize = 'small' | 'medium' | 'large';

/** Hexagon radius of the playable area per size. */
export const SKIRMISH_SIZE_RADIUS: Readonly<Record<SkirmishMapSize, number>> = { small: 14, medium: 17, large: 21 };
export const SKIRMISH_SIZE_LABEL: Readonly<Record<SkirmishMapSize, string>> = { small: 'Small', medium: 'Medium', large: 'Large' };

export interface SkirmishSeat {
  readonly pantheonId: string;
  readonly controller: 'human' | 'ai';
  readonly name?: string;
}

export type SkirmishVictory = { readonly type: 'elimination' } | { readonly type: 'hold_relic'; readonly days: number };

export interface SkirmishGenOptions {
  readonly seed: number;
  readonly size: SkirmishMapSize;
  /** Two to four empires; the first seat is the scenario's "player" seat. */
  readonly seats: readonly SkirmishSeat[];
  readonly victory: SkirmishVictory;
  readonly monsters: 'none' | 'few' | 'many';
  /** Scenario features (default: all on, as in other skirmishes). */
  readonly features?: ScenarioFeatures;
}

export interface GeneratedSkirmish {
  readonly mission: MissionDefinition;
  readonly map: WorldMapDefinition;
  readonly decor: readonly DecorItem[];
  readonly checks: readonly MapCheck[];
}

export class SkirmishGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SkirmishGenerationError';
  }
}

/** Four empires need at least a medium map (their nearest neighbour sits one radius away). */
export function skirmishSizeAllows(size: SkirmishMapSize, empires: number): boolean {
  return empires <= 3 || size !== 'small';
}

// ---------------------------------------------------------------------------
// Hex isometries about the map center (relative axial coordinates)
// ---------------------------------------------------------------------------

type Transform = (c: HexCoord) => HexCoord;

/** 60° rotation: cube (x, y, z) -> (−z, −x, −y), i.e. axial (q, r) -> (−r, q + r). */
const rot1: Transform = (c) => ({ q: -c.r, r: c.q + c.r });
const rotN = (n: number): Transform => (c) => {
  let x = c;
  for (let i = 0; i < n; i++) x = rot1(x);
  return x;
};
/** Reflection across the axis of direction (1, −1): (q, r) -> (−r, −q). */
const mirror: Transform = (c) => ({ q: -c.r, r: -c.q });
const identity: Transform = (c) => ({ q: c.q, r: c.r });
const compose = (outer: Transform, inner: Transform): Transform => (c) => outer(inner(c));

/**
 * The symmetry group for N empires, in seat order: element i carries the first
 * town (direction 0) onto town i. 2: 180° rotation; 3: 120° rotations;
 * 4: towns at directions 0, 2, 3, 5 with the 180° rotation and a reflection.
 */
function symmetryGroup(n: number): Transform[] {
  if (n === 2) return [identity, rotN(3)];
  if (n === 3) return [identity, rotN(4), rotN(2)];
  if (n === 4) return [identity, mirror, rotN(3), compose(mirror, rotN(3))];
  throw new SkirmishGenerationError(`Random maps support 2 to 4 empires, not ${n}`);
}

const relDist = (c: HexCoord) => axialDistance(c, { q: 0, r: 0 });

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

interface SiteSpec {
  readonly key: string;
  readonly band: readonly [number, number];
  readonly build: (pos: HexCoord, ctx: BuildCtx) => Omit<SiteDefinition, 'id' | 'anchorId' | 'coord'>;
}

interface BuildCtx {
  readonly rng: RngCursor;
  readonly catalog: ContentCatalog;
}

const PALETTE = ['#3b73d9', '#c0392b', '#2e9e5b', '#c98a1b'];
const START_WALLET: ResourceCost = { gold: 10000, wood: 20, stone: 20, crystal: 10, favor: 10 };

/** Base-form creatures the generator may use for guards, camps and monsters (stable order). */
function candidateCreatures(catalog: ContentCatalog, minTier: number, maxTier: number): CreatureDefinition[] {
  return Object.values(catalog.creatures)
    .filter((c) => c.form === 'base' && c.implementationStatus === 'implemented' && !!c.stats && !!c.cost && (c.cost.gold ?? 0) > 0 && c.tier >= minTier && c.tier <= maxTier)
    .sort((a, b) => (a.id < b.id ? -1 : 1));
}

function pickCreature(ctx: BuildCtx, minTier: number, maxTier: number): CreatureDefinition {
  const pool = candidateCreatures(ctx.catalog, minTier, maxTier);
  if (pool.length === 0) throw new SkirmishGenerationError(`No creature of tier ${minTier}-${maxTier}`);
  return pool[ctx.rng.nextInt(pool.length)]!;
}

/** An army worth about `value` Gold of one creature (at least one creature). */
function armyOf(creature: CreatureDefinition, value: number): StackSpec {
  return { creatureId: creature.id, count: Math.max(1, Math.round(value / (creature.cost?.gold ?? 100))) };
}

function guard(ctx: BuildCtx, label: string, value: number, minTier: number, maxTier: number, reward: GuardDefinition['reward'], battlefield: GuardDefinition['battlefield'], stacks = 1): GuardDefinition {
  const army: StackSpec[] = [];
  for (let i = 0; i < stacks; i++) army.push(armyOf(pickCreature(ctx, minTier, maxTier), value / stacks));
  return { label, army, reward, battlefield };
}

function resourceSite(t: 'sawmill' | 'quarry' | 'gold_mine' | 'crystal_deposit', dailyYield: number): Pick<SiteDefinition, 'name' | 'description' | 'kind'> {
  const info = { sawmill: ['Sawmill', 'wood'], quarry: ['Quarry', 'stone'], gold_mine: ['Gold Mine', 'gold'], crystal_deposit: ['Crystal Deposit', 'crystal'] } as const;
  const [name, resource] = info[t];
  return { name, description: `Capture for +${dailyYield} ${resource} per day.`, kind: { type: 'resource_site', siteType: t, resource, dailyYield } };
}

function setPieces(catalog: ContentCatalog): string[] {
  return Object.values(catalog.artifacts)
    .filter((a) => !!a.setId)
    .map((a) => a.id)
    .sort();
}

function eventSite(ctx: BuildCtx, band: 'near' | 'far'): Pick<SiteDefinition, 'name' | 'description' | 'kind'> {
  const pool = Object.values(ctx.catalog.mapEventTemplates ?? {})
    .filter((e) => e.band === band)
    .sort((a, b) => (a.id < b.id ? -1 : 1));
  if (pool.length === 0) return { name: 'Supply Cache', description: 'Abandoned supplies.', kind: { type: 'pickup', reward: { resources: { gold: 500 } } } };
  const t = pool[ctx.rng.nextInt(pool.length)]!;
  return { name: t.title, description: t.text, kind: { type: 'map_event', title: t.title, text: t.text, options: t.options } };
}

/** The per-empire site list, generated once for the first empire's region. */
function regionSpecs(R: number): SiteSpec[] {
  const far = Math.max(9, R);
  return [
    { key: 'sawmill', band: [3, 5], build: () => resourceSite('sawmill', 2) },
    { key: 'quarry', band: [3, 5], build: () => resourceSite('quarry', 2) },
    {
      key: 'cache',
      band: [3, 6],
      build: (_p, ctx) => ({ name: 'Supply Cache', description: 'Abandoned supplies.', kind: { type: 'pickup', reward: { resources: { gold: 400 + 100 * ctx.rng.nextInt(4), wood: 2, stone: 2 } } } }),
    },
    { key: 'crystal', band: [5, 8], build: () => resourceSite('crystal_deposit', 1) },
    { key: 'event_near', band: [4, 7], build: (_p, ctx) => eventSite(ctx, 'near') },
    {
      key: 'camp_low',
      band: [5, 8],
      build: (_p, ctx) => {
        const c = pickCreature(ctx, 1, 2);
        return {
          name: `${c.name} Camp`,
          description: `${c.pluralName} gather here and will join a hero who pays their price.`,
          kind: { type: 'creature_camp', creatureId: c.id, weeklyGrowth: 4, initialStock: 6 },
          guard: { label: `${c.name} camp guard`, army: [armyOf(c, 1600)], reward: { resources: { gold: 300 } }, battlefield: 'open_field' },
        };
      },
    },
    {
      key: 'treasure',
      band: [6, 9],
      build: (_p, ctx) => {
        const pieces = setPieces(ctx.catalog);
        const art = pieces.length ? pieces[ctx.rng.nextInt(pieces.length)]! : null;
        return {
          name: 'Overgrown Ruin',
          description: 'Guardians lair in a ruin with an old treasure vault.',
          kind: { type: 'landmark', landmark: 'grove' },
          guard: guard(ctx, 'Ruin guardians', 3200, 2, 4, { resources: { gold: 800, crystal: 2 }, ...(art ? { artifactIds: [art] } : {}) }, 'grove'),
        };
      },
    },
    { key: 'event_far', band: [8, far], build: (_p, ctx) => eventSite(ctx, 'far') },
    {
      key: 'gold',
      band: [8, Math.max(9, R - 1)],
      build: (_p, ctx) => ({ ...resourceSite('gold_mine', 500), guard: guard(ctx, 'Mine guards', 2600, 2, 3, { resources: { gold: 500 } }, 'open_field') }),
    },
    {
      key: 'camp_high',
      band: [Math.max(6, R - 4), Math.max(8, R + 1)],
      build: (_p, ctx) => {
        const c = pickCreature(ctx, 3, 4);
        return {
          name: `${c.name} Lair`,
          description: `${c.pluralName} keep a lair here and join a hero who pays their price.`,
          kind: { type: 'creature_camp', creatureId: c.id, weeklyGrowth: 2, initialStock: 3 },
          guard: { label: `${c.name} lair guard`, army: [armyOf(c, 3800)], reward: { resources: { gold: 500 } }, battlefield: 'grove' },
        };
      },
    },
  ];
}

export function generateSkirmish(catalog: ContentCatalog, opts: SkirmishGenOptions): GeneratedSkirmish {
  const n = opts.seats.length;
  if (n < 2 || n > 4) throw new SkirmishGenerationError(`Random maps support 2 to 4 empires, not ${n}`);
  if (!skirmishSizeAllows(opts.size, n)) throw new SkirmishGenerationError('Four empires need a medium or large map');
  for (const s of opts.seats) if (!catalog.skirmishKits?.[s.pantheonId]) throw new SkirmishGenerationError(`No skirmish kit for ${s.pantheonId}`);
  const seed = opts.seed >>> 0;
  const Rh = SKIRMISH_SIZE_RADIUS[opts.size];
  const W = 2 * Rh + 3;
  const H = W;
  const center: HexCoord = { q: Rh + 1, r: Rh + 1 };
  const abs = (c: HexCoord): HexCoord => ({ q: c.q + center.q, r: c.r + center.r });
  const rel = (c: HexCoord): HexCoord => ({ q: c.q - center.q, r: c.r - center.r });
  const group = symmetryGroup(n);
  const R = Math.round(Rh * 0.76);
  const A: HexCoord = { q: R, r: 0 };
  const townsRel = group.map((g) => g(A));
  const inside = (c: HexCoord) => relDist(c) <= Rh;

  // --- Terrain: symmetric value noise (one sample per symmetry orbit) -------
  const orbitKey = (c: HexCoord) => group.map((g) => hexKey(g(c))).sort()[0]!;
  const noise = (c: HexCoord, channel: string) => seedFromLabel(`${SKIRMISH_GENERATOR_VERSION}|${seed}|${channel}|${orbitKey(c)}`) / 4294967296;
  const cellsRel: HexCoord[] = [];
  for (let r = 0; r < H; r++) for (let q = 0; q < W; q++) cellsRel.push(rel({ q, r }));
  const smooth = (c: HexCoord, channel: string) => {
    const ns = [c, ...axialNeighbors(c)];
    return ns.reduce((sum, x) => sum + noise(x, channel), 0) / ns.length;
  };
  const terrain = new Map<string, Terrain>();
  for (const c of cellsRel) {
    if (!inside(c)) {
      terrain.set(hexKey(c), 'water');
      continue;
    }
    const v = smooth(c, 'veg');
    const m = noise(c, 'mtn');
    const w = smooth(c, 'wet');
    let t: Terrain = 'plains';
    if (relDist(c) <= Rh - 1 && m > 0.93) t = 'mountain';
    else if (v > 0.62) t = 'forest';
    else if (v < 0.36) t = 'rough';
    else if (w > 0.66) t = 'marsh';
    terrain.set(hexKey(c), t);
  }
  const passable = (c: HexCoord) => {
    const t = terrain.get(hexKey(c));
    return !!t && t !== 'water' && t !== 'mountain';
  };
  const setOrbit = (c: HexCoord, t: Terrain) => {
    for (const g of group) terrain.set(hexKey(g(c)), t);
  };
  // Clear the towns and the center.
  for (const c of cellsRel) {
    if (!inside(c)) continue;
    if (relDist(c) <= 2 || axialDistance(c, A) <= 2) setOrbit(c, 'plains');
  }

  // --- Sites: chosen in the first empire's Voronoi region, copied by symmetry ----
  const rng = new RngCursor(seedFromLabel(`${SKIRMISH_GENERATOR_VERSION}|${seed}|sites`));
  const ctx: BuildCtx = { rng, catalog };
  const inRegionA = (c: HexCoord) => inside(c) && relDist(c) >= 3 && townsRel.every((t, i) => i === 0 || axialDistance(c, A) < axialDistance(c, t));
  const regionA = cellsRel.filter(inRegionA).sort((a, b) => (hexKey(a) < hexKey(b) ? -1 : 1));
  const chosen: { spec: SiteSpec; pos: HexCoord }[] = [];
  const taken = (c: HexCoord, gap: number) => chosen.some((x) => axialDistance(x.pos, c) < gap) || axialDistance(c, A) < 3;
  for (const spec of regionSpecs(R)) {
    let [lo, hi] = spec.band;
    let picked: HexCoord | null = null;
    for (let widen = 0; widen < 4 && !picked; widen++) {
      const cands = regionA.filter((c) => {
        const d = axialDistance(c, A);
        return d >= lo && d <= hi && !taken(c, 2) && relDist(c) <= Rh - 1;
      });
      if (cands.length > 0) picked = cands[rng.nextInt(cands.length)]!;
      lo = Math.max(2, lo - 1);
      hi += 2;
    }
    if (picked) chosen.push({ spec, pos: picked });
  }
  // Wandering monsters' homes (also in region A).
  const monsterCount = opts.monsters === 'none' ? 0 : opts.monsters === 'few' ? 1 : 2;
  const monsterHomes: HexCoord[] = [];
  for (let i = 0; i < monsterCount; i++) {
    const cands = regionA.filter((c) => {
      const d = axialDistance(c, A);
      return d >= 6 && d <= R + 1 && !taken(c, 3) && !monsterHomes.some((h) => axialDistance(h, c) < 4) && relDist(c) >= 4;
    });
    if (cands.length > 0) monsterHomes.push(cands[rng.nextInt(cands.length)]!);
  }
  for (const s of chosen) for (const c of [s.pos, ...axialNeighbors(s.pos)]) if (inside(c)) setOrbit(c, terrain.get(hexKey(c)) === 'mountain' || terrain.get(hexKey(c)) === 'water' ? 'plains' : terrain.get(hexKey(c))!);
  for (const h of monsterHomes) setOrbit(h, 'plains');

  // --- Roads: first empire's town to the center and to its sites, then copied ----
  const roadEdges = new Set<string>();
  const route = (from: HexCoord, to: HexCoord): HexCoord[] | null => {
    // Dijkstra over relative coords; mountains cost a lot (opened later), water is impassable.
    const cost = (c: HexCoord) => {
      const t = terrain.get(hexKey(c));
      if (!t || t === 'water' || !inside(c)) return null;
      if (t === 'mountain') return 40;
      return t === 'plains' ? 4 : 5 + (noise(c, 'road') > 0.5 ? 1 : 0);
    };
    const dist = new Map<string, number>([[hexKey(from), 0]]);
    const prev = new Map<string, string>();
    const open: { k: string; c: HexCoord; d: number }[] = [{ k: hexKey(from), c: from, d: 0 }];
    while (open.length) {
      open.sort((a, b) => a.d - b.d || (a.k < b.k ? -1 : 1));
      const cur = open.shift()!;
      if (cur.d > (dist.get(cur.k) ?? Infinity)) continue;
      if (cur.k === hexKey(to)) break;
      for (const nb of axialNeighbors(cur.c)) {
        const step = cost(nb);
        if (step === null) continue;
        const nd = cur.d + step;
        const nk = hexKey(nb);
        if (nd < (dist.get(nk) ?? Infinity)) {
          dist.set(nk, nd);
          prev.set(nk, cur.k);
          open.push({ k: nk, c: nb, d: nd });
        }
      }
    }
    if (!dist.has(hexKey(to))) return null;
    const path: HexCoord[] = [];
    let k: string | undefined = hexKey(to);
    while (k) {
      const [q, r] = k.split(',').map(Number);
      path.unshift({ q: q!, r: r! });
      k = prev.get(k);
    }
    return path;
  };
  const addRoad = (path: HexCoord[]) => {
    for (let i = 1; i < path.length; i++) {
      for (const g of group) roadEdges.add(edgeKey(abs(g(path[i - 1]!)), abs(g(path[i]!))));
    }
    for (const c of path) if (terrain.get(hexKey(c)) === 'mountain') setOrbit(c, 'rough');
  };
  // No road to the contested center: it is reached across country (about a day's march),
  // so rival towns are well over a day apart (Twin Harbors lesson: one-day reach decides games).
  const toCenter = route(A, { q: 0, r: 0 });
  if (!toCenter) throw new SkirmishGenerationError('No route from a town to the center');
  for (const c of toCenter) if (terrain.get(hexKey(c)) === 'mountain') setOrbit(c, 'rough');
  for (const s of chosen) {
    if (s.spec.key === 'event_far' || s.spec.key === 'cache') continue; // tracks, not roads
    const p = route(A, s.pos);
    if (p) addRoad(p);
  }

  // --- Mission content ---------------------------------------------------------
  const sites: SiteDefinition[] = [];
  const kits = opts.seats.map((s) => catalog.skirmishKits[s.pantheonId]!);
  const usedNames = new Map<string, number>();
  const leaderUse = new Map<string, number>();
  const townIds = opts.seats.map((_, i) => `town_${i + 1}`);
  const playerIds = opts.seats.map((_, i) => (i === 0 ? 'player' : `p${i + 1}`));
  const townNames = kits.map((k) => {
    const used = usedNames.get(k.pantheonId) ?? 0;
    usedNames.set(k.pantheonId, used + 1);
    return k.townNames[used % k.townNames.length] ?? `Town ${used + 1}`;
  });
  townsRel.forEach((t, i) => {
    sites.push({ id: `site_${townIds[i]}`, anchorId: `site_${townIds[i]}`, coord: abs(t), name: townNames[i]!, description: `${opts.seats[i]!.name ?? townNames[i]}’s home town.`, kind: { type: 'town', townId: townIds[i]! } });
  });
  // Region sites: build once (same creature, reward and text for every empire), place in every region.
  for (const s of chosen) {
    const built = s.spec.build(s.pos, ctx);
    group.forEach((g, i) => {
      const id = `${s.spec.key}_${i + 1}`;
      sites.push({ id, anchorId: id, coord: abs(g(s.pos)), ...built });
    });
  }
  // Contested center.
  const victory = opts.victory;
  if (victory.type === 'hold_relic') {
    sites.push({
      id: 'relic',
      anchorId: 'relic',
      coord: abs({ q: 0, r: 0 }),
      name: 'Shrine of the First Flame',
      description: `Hold the shrine at ${victory.days} dawns in a row to win.`,
      kind: { type: 'relic' },
      guard: guard(ctx, 'Shrine wardens', 9000, 4, 6, { resources: { gold: 1500 } }, 'beacon_clearing', 2),
    });
  } else {
    sites.push({
      id: 'center_gold',
      anchorId: 'center_gold',
      coord: abs({ q: 0, r: 0 }),
      ...resourceSite('gold_mine', 1000),
      guard: guard(ctx, 'Mine guards', 8000, 4, 6, { resources: { gold: 1000, crystal: 2 } }, 'open_field', 2),
    });
  }

  // Wandering monsters: one army per home, copied to every region.
  const hostileHeroes: HostileHeroDefinition[] = [];
  monsterHomes.forEach((home, mi) => {
    const creature = pickCreature(ctx, 2, 4);
    const army = [armyOf(creature, mi === 0 ? 2200 : 3600)];
    const loopRel = regionA.filter((c) => axialDistance(c, home) === 2 && passable(c)).sort((a, b) => (hexKey(a) < hexKey(b) ? -1 : 1));
    const way: HexCoord[] = [home];
    for (let k = 0; k < 2 && loopRel.length > 0; k++) way.push(loopRel.splice(rng.nextInt(loopRel.length), 1)[0]!);
    group.forEach((g, i) => {
      const start = abs(g(home));
      hostileHeroes.push({
        commander: {
          heroDefinitionId: `monster_${creature.id}`,
          name: `Wandering ${creature.pluralName}`,
          classId: 'champion',
          level: 1,
          attributes: { attack: 0, defense: 0, power: 0, knowledge: 0 },
          skills: [],
          spellbook: false,
          spellIds: [],
          mana: 0,
          portraitAssetId: creature.presentation.portraitAssetId,
        },
        monster: { bounty: { gold: mi === 0 ? 600 : 900 } },
        startCoord: start,
        army,
        ai: {
          profile: 'patrol',
          waypoints: way.map((w) => abs(g(w))),
          regionMinQ: 0,
          regionMaxQ: 999,
          regionCenter: start,
          regionRadius: 3,
          attackThreshold: { numerator: 3, denominator: 2 },
        },
      });
      void i;
    });
  });

  // Players: seat 0 is the scenario's player seat; the others are rival seats (human or AI).
  const setupFor = (i: number) => {
    const kit = kits[i]!;
    const k = leaderUse.get(kit.pantheonId) ?? 0;
    leaderUse.set(kit.pantheonId, k + 1);
    const leader = kit.leaders[k % kit.leaders.length]!;
    const def = catalog.heroes[leader.definitionId];
    const townId = townIds[i]!;
    return {
      town: { townId, siteId: `site_${townId}`, name: townNames[i]!, archetypeId: kit.archetypeId, buildings: kit.buildings, population: kit.population, covenants: kit.covenants },
      hero: {
        heroId: `leader_${i + 1}`,
        definitionId: leader.definitionId,
        classId: leader.classId,
        defaults: { level: 1, xp: 0, attributes: kit.leaderAttributes, skills: kit.leaderSkills, spellbook: false },
        army: kit.army,
        startTownId: townId,
      },
      portrait: def?.portraitAssetId ?? leader.portraitAssetId,
    };
  };
  const seat0 = setupFor(0);
  const rivals: MissionRivalSetup[] = opts.seats.slice(1).map((seat, j) => {
    const i = j + 1;
    const s = setupFor(i);
    return {
      playerId: playerIds[i]!,
      name: seat.name ?? townNames[i]!,
      pantheonId: seat.pantheonId,
      color: PALETTE[i % PALETTE.length]!,
      wallet: START_WALLET,
      controller: seat.controller,
      town: s.town,
      hero: s.hero,
    };
  });
  const sizeLabel = SKIRMISH_SIZE_LABEL[opts.size];
  const id = `random_${opts.size}_${n}p_${seed}`;
  const relicSite = sites.find((s) => s.id === 'relic');
  const mission: MissionDefinition = {
    id,
    scenarioId: id,
    campaignId: null,
    order: 1,
    name: 'Random Map',
    subtitle: `${sizeLabel} · ${n} empires · seed ${seed}`,
    summary: `A generated ${sizeLabel.toLowerCase()} map for ${n} empires. ${victory.type === 'hold_relic' ? `Win by holding the central shrine for ${victory.days} days, or by defeating every rival.` : 'Win by defeating every rival empire.'} Every empire gets the same terrain, roads and treasures around its town (symmetric map). Proposed feature; values unplaytested.`,
    mapTemplateId: RANDOM_TEMPLATE_ID,
    soundscape: 'coast',
    targetPlaytime: n === 2 ? '30–60 minutes (unmeasured)' : '45–90 minutes (unmeasured)',
    newDecisions: ['Random map', `${n} empires`, victory.type === 'hold_relic' ? 'Hold the relic' : 'Conquest'],
    xpCap: null,
    xpCapLevel: null,
    briefing: [{ speaker: 'Herald', portraitAssetId: seat0.portrait, text: victory.type === 'hold_relic' ? `The Shrine of the First Flame burns at the heart of these lands. Whoever holds it for ${victory.days} days will rule them all.` : 'Rival empires wake across the land. Only one will remain.' }],
    victory: [{ speaker: 'Herald', portraitAssetId: seat0.portrait, text: 'The realm is yours.' }],
    debriefPolicy: [],
    player: {
      playerId: 'player',
      name: opts.seats[0]!.name ?? townNames[0]!,
      controller: opts.seats[0]!.controller,
      pantheonId: opts.seats[0]!.pantheonId,
      wallet: START_WALLET,
      town: seat0.town,
      hero: seat0.hero,
    },
    rivals,
    ...(monsterCount > 0 ? { hostilePlayer: { playerId: 'monsters', name: 'Wild creatures' } } : {}),
    initialFlags: ['skirmish'],
    features: opts.features ?? { expandedContent: true, weeklyEvents: true, interventions: true },
    victoryCondition: victory.type === 'hold_relic' && relicSite ? { type: 'hold_site', siteId: relicSite.id, days: victory.days } : { type: 'elimination' },
    purchasableBuildingIds: null,
    heroHiringEnabled: true,
    sites,
    objectives: [
      victory.type === 'hold_relic'
        ? { id: 'victory', title: 'Hold the Shrine', description: `Own the Shrine of the First Flame at ${victory.days} dawns in a row — or defeat every rival empire.`, category: 'primary', initialStatus: 'active', condition: { type: 'flag', flag: 'rivals_eliminated' }, markerSiteId: 'relic' }
        : { id: 'victory', title: 'Conquer the realm', description: 'Defeat every rival hero and take every rival town.', category: 'primary', initialStatus: 'active', condition: { type: 'flag', flag: 'rivals_eliminated' } },
      ...(victory.type === 'elimination' ? [{ id: 'center_gold', title: 'Take the central gold mine', description: 'Defeat the mine guards and hold the gold mine at the heart of the map.', category: 'optional' as const, initialStatus: 'active' as const, condition: { type: 'site_cleared' as const, siteId: 'center_gold' }, markerSiteId: 'center_gold' }] : []),
    ],
    hostileHeroes,
    helpTopics: [
      { id: 'random_maps', title: 'Random maps', text: 'Random maps are symmetric: every empire has the same terrain, roads, mines, camps and treasures around its town, so no starting position is favored. Creature camps sell creatures to a visiting hero; map events happen once, to the first hero who arrives. Wandering monsters roam near their lair and attack heroes they can beat.' },
      { id: 'sieges', title: 'Sieges', text: 'Entering an enemy town that has a garrison or a visiting hero starts a siege. The Fort gives walls and a gate, the Citadel adds a keep and a moat, the Castle stronger walls and two towers. Temporary siege model; values are proposed.' },
    ],
    protectedHeroFailure: false,
    thumbnailAssetId: 'mission.skirmish.random.thumbnail',
  };

  // --- Logical map -------------------------------------------------------------
  let terrainStr = '';
  for (let r = 0; r < H; r++) for (let q = 0; q < W; q++) terrainStr += TERRAIN_CODES[terrain.get(hexKey(rel({ q, r }))) ?? 'water'];
  const roads = [...roadEdges].sort();
  const map: WorldMapDefinition = {
    templateId: RANDOM_TEMPLATE_ID,
    templateVersion: 1,
    generatorVersion: SKIRMISH_GENERATOR_VERSION,
    seed,
    attempt: 0,
    mode: 'variation',
    width: W,
    height: H,
    terrain: terrainStr,
    roads,
    logicalHash: hashValue({ templateId: RANDOM_TEMPLATE_ID, width: W, height: H, terrain: terrainStr, roads }),
    biome: 'temperate',
  };
  const checks = validateSkirmishMap(map, mission);
  const failed = checks.filter((c) => !c.pass);
  if (failed.length > 0) throw new SkirmishGenerationError(`Generated map failed validation: ${failed.map((c) => `${c.id} ${c.detail}`).join('; ')}`);
  const decor = buildDecor(map, deriveStreams(seed, RANDOM_TEMPLATE_ID, 0));
  return { mission, map, decor, checks };
}

// ---------------------------------------------------------------------------
// Validation (also used by tests): reachability, placement and fairness
// ---------------------------------------------------------------------------

function terrainOf(map: WorldMapDefinition, c: HexCoord): string {
  if (c.q < 0 || c.r < 0 || c.q >= map.width || c.r >= map.height) return 'w';
  return map.terrain[c.r * map.width + c.q] ?? 'w';
}

/** Road-aware travel costs from `from` (75 on a road, terrain cost otherwise; mountains/water impassable). */
export function travelCosts(map: WorldMapDefinition, from: HexCoord): Map<string, number> {
  const cost: Record<string, number | null> = { p: 100, f: 125, r: 125, s: 150, m: null, w: null };
  const roadSet = new Set(map.roads);
  const dist = new Map<string, number>([[hexKey(from), 0]]);
  const open: { c: HexCoord; d: number }[] = [{ c: from, d: 0 }];
  while (open.length) {
    open.sort((a, b) => a.d - b.d || (hexKey(a.c) < hexKey(b.c) ? -1 : 1));
    const cur = open.shift()!;
    if (cur.d > (dist.get(hexKey(cur.c)) ?? Infinity)) continue;
    for (const nb of axialNeighbors(cur.c)) {
      const base = cost[terrainOf(map, nb)];
      if (base === null || base === undefined) continue;
      const step = roadSet.has(edgeKey(cur.c, nb)) ? 75 : base;
      const nd = cur.d + step;
      if (nd < (dist.get(hexKey(nb)) ?? Infinity)) {
        dist.set(hexKey(nb), nd);
        open.push({ c: nb, d: nd });
      }
    }
  }
  return dist;
}

export function validateSkirmishMap(map: WorldMapDefinition, mission: MissionDefinition): MapCheck[] {
  const checks: MapCheck[] = [];
  const towns = mission.sites.filter((s) => s.kind.type === 'town');
  const fromFirst = travelCosts(map, towns[0]!.coord);
  const unreachable = mission.sites.filter((s) => !fromFirst.has(hexKey(s.coord)));
  checks.push({ id: 'SKM-1', pass: unreachable.length === 0, detail: unreachable.length ? `unreachable: ${unreachable.map((s) => s.id).join(', ')}` : 'every site is reachable' });
  const badGround = mission.sites.filter((s) => terrainOf(map, s.coord) === 'm' || terrainOf(map, s.coord) === 'w');
  checks.push({ id: 'SKM-2', pass: badGround.length === 0, detail: badGround.length ? `on impassable terrain: ${badGround.map((s) => s.id).join(', ')}` : 'no site on impassable terrain' });
  const keys = mission.sites.map((s) => hexKey(s.coord));
  checks.push({ id: 'SKM-3', pass: new Set(keys).size === keys.length, detail: 'one site per tile' });
  // Fairness: every town is the same travel cost from the center and from its own sites.
  const centerSite = mission.sites.find((s) => s.id === 'relic' || s.id === 'center_gold');
  if (centerSite) {
    const costs = towns.map((t) => travelCosts(map, t.coord).get(hexKey(centerSite.coord)) ?? -1);
    checks.push({ id: 'SKM-4', pass: costs.every((c) => c === costs[0] && c > 0), detail: `town → center costs ${costs.join(' / ')}` });
  }
  const local = (suffix: string) => mission.sites.filter((s) => s.id.endsWith(`_${suffix}`) && s.kind.type !== 'town');
  const ownCosts = towns.map((t, i) => {
    const d = travelCosts(map, t.coord);
    return local(String(i + 1))
      .map((s) => d.get(hexKey(s.coord)) ?? -1)
      .sort((a, b) => a - b)
      .join(',');
  });
  checks.push({ id: 'SKM-5', pass: ownCosts.every((c) => c === ownCosts[0]), detail: 'every empire’s own sites cost the same to reach' });
  return checks;
}
