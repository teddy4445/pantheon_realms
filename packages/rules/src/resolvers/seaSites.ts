/**
 * Coastal sites and sea salvage — read-only resolvers (sea-map objects kit 2026-10-17;
 * definitions/seaSites.ts). Pure and deterministic: quotes for Explore and the wreck's waiting
 * artifact (the commits in systems/seaSites.ts run the same checks), the water hexes wrecks block,
 * the live sight of owned coastal watchtowers, the hostile ships a tower owner sees, and the shared
 * placement rules the map generator, the custom-map checks and the editor all use.
 *
 * Information policy: a wreck's outcome is site data the viewer never reads before it is explored.
 * `wreckKnowledge` says what the viewer may know (its guards only once its own heroes fought them,
 * the cache only once taken); a tower's sight is ordinary vision (`visibleCells`) and never an intel
 * observer (towers never identify or count an army: resolvers/intel.ts sees a distant sighting).
 */
import type { ArtifactId, ArtifactInstanceId, HeroId, PlayerId, SiteId } from '../ids';
import { axialDistance, axialNeighbors, hexKey, type HexCoord } from '../core/hex';
import type { ContentCatalog } from '../definitions/catalog';
import { freeEquipSlot } from '../definitions/pantheons';
import type { SiteDefinition, StackSpec, Terrain } from '../definitions/world';
import type { WreckOutcomeKind, WreckPhase, WreckSiteState } from '../definitions/seaSites';
import type { RejectionCode } from '../engine/tx';
import type { HeroState, MatchState, ShipState, SiteState } from '../state/match';
import { scenarioMission } from './scenario';
import { cellIndex, inMap, missionSite, terrainAt } from './world';
import { heroShip, navalEnabled, shipList } from './naval';

// ---------------------------------------------------------------------------
// Sites of the three kinds
// ---------------------------------------------------------------------------

export type SeaSiteKindId = 'coastal_watchtower' | 'sea_pickup' | 'shipwreck';
export const SEA_SITE_KINDS: readonly SeaSiteKindId[] = ['coastal_watchtower', 'sea_pickup', 'shipwreck'];

export function isSeaSiteKind(type: string): type is SeaSiteKindId {
  return type === 'coastal_watchtower' || type === 'sea_pickup' || type === 'shipwreck';
}

/** Sea-site kinds that stand on water (the rest of the game's sites stand on land). */
export function isWaterSiteKind(type: string): boolean {
  return type === 'sea_pickup' || type === 'shipwreck';
}

interface SeaSiteCache {
  readonly mission: unknown;
  readonly towers: readonly SiteDefinition[];
  readonly wrecks: readonly SiteDefinition[];
  readonly pickups: readonly SiteDefinition[];
  readonly blocked: ReadonlySet<string>;
}
const cache = new WeakMap<object, SeaSiteCache>();

/** The mission's sea sites by kind (cached per mission; the set of sites never changes in a match). */
function seaSites(catalog: ContentCatalog, state: Pick<MatchState, 'customMission' | 'mission'>): SeaSiteCache {
  const mission = scenarioMission(catalog, state);
  const key = (mission ?? catalog) as object;
  const hit = cache.get(key);
  if (hit && hit.mission === mission) return hit;
  const towers: SiteDefinition[] = [];
  const wrecks: SiteDefinition[] = [];
  const pickups: SiteDefinition[] = [];
  for (const s of mission?.sites ?? []) {
    if (s.kind.type === 'coastal_watchtower') towers.push(s);
    else if (s.kind.type === 'shipwreck') wrecks.push(s);
    else if (s.kind.type === 'sea_pickup') pickups.push(s);
  }
  const out: SeaSiteCache = { mission, towers, wrecks, pickups, blocked: new Set(wrecks.map((w) => hexKey(w.coord))) };
  cache.set(key, out);
  return out;
}

export function coastalTowers(catalog: ContentCatalog, state: Pick<MatchState, 'customMission' | 'mission'>): readonly SiteDefinition[] {
  return seaSites(catalog, state).towers;
}

export function shipwrecks(catalog: ContentCatalog, state: Pick<MatchState, 'customMission' | 'mission'>): readonly SiteDefinition[] {
  return seaSites(catalog, state).wrecks;
}

export function seaPickups(catalog: ContentCatalog, state: Pick<MatchState, 'customMission' | 'mission'>): readonly SiteDefinition[] {
  return seaSites(catalog, state).pickups;
}

/**
 * Water hexes no ship may enter: every shipwreck's hex (a landmark; a ship explores it from a
 * neighbouring approach hex). Floating salvage never blocks. The sea graph (resolvers/naval.ts) reads it.
 */
export function seaSiteBlockedCells(catalog: ContentCatalog, state: Pick<MatchState, 'customMission' | 'mission'>): ReadonlySet<string> {
  return seaSites(catalog, state).blocked;
}

// ---------------------------------------------------------------------------
// Coastal watchtowers: owned sight
// ---------------------------------------------------------------------------

/** Every coastal watchtower `playerId` owns now: where it stands and how far it sees. */
export function ownedTowerSight(catalog: ContentCatalog, state: MatchState, playerId: PlayerId): { readonly siteId: SiteId; readonly coord: HexCoord; readonly radius: number }[] {
  const out: { siteId: SiteId; coord: HexCoord; radius: number }[] = [];
  for (const def of seaSites(catalog, state).towers) {
    if (def.kind.type !== 'coastal_watchtower') continue;
    if (state.world.sites[def.id]?.owner !== playerId) continue;
    out.push({ siteId: def.id, coord: def.coord, radius: def.kind.radius });
  }
  return out;
}

/** A ship another empire owns (its hero's empire when crewed): an enemy ship to `playerId`. Neutral hulls are not. */
export function hostileShipFor(state: Pick<MatchState, 'heroes'>, ship: ShipState, playerId: PlayerId): boolean {
  if (ship.heroId) {
    const h = state.heroes[ship.heroId];
    if (h && h.status === 'active') return h.ownerId !== playerId;
  }
  return ship.ownerId !== null && ship.ownerId !== playerId;
}

/**
 * The hostile ships `playerId`'s towers see now, each with the towers that see it (nearest first,
 * then ID): a ship counts only when its hex is in the player's current vision (`visible`) and within
 * an owned tower's radius — never through fog.
 */
export function shipsInTowerSight(catalog: ContentCatalog, state: MatchState, playerId: PlayerId, visible: ReadonlySet<number>): { readonly ship: ShipState; readonly towers: SiteId[] }[] {
  const towers = ownedTowerSight(catalog, state, playerId);
  if (towers.length === 0) return [];
  const map = state.world.map;
  const out: { ship: ShipState; towers: SiteId[] }[] = [];
  for (const ship of shipList(state)) {
    if (!hostileShipFor(state, ship, playerId) || !visible.has(cellIndex(map, ship.coord))) continue;
    const seeing = towers
      .map((t) => ({ id: t.siteId, d: axialDistance(t.coord, ship.coord), r: t.radius }))
      .filter((t) => t.d <= t.r)
      .sort((a, b) => a.d - b.d || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    if (seeing.length > 0) out.push({ ship, towers: seeing.map((t) => t.id) });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Shipwrecks
// ---------------------------------------------------------------------------

/** A wreck's saved state, or the untouched one (absent until first touched). */
export function wreckState(st: Pick<SiteState, 'wreck'> | undefined): WreckSiteState {
  return st?.wreck ?? { phase: 'untouched', battleId: null, heroId: null, guardSeenBy: [] };
}

/** The raiders still aboard a wreck (none: unguarded, or beaten). */
export function liveWreckGuard(def: SiteDefinition, st: SiteState | undefined): StackSpec[] {
  // The wreck's own phase decides (a site without an ordinary `guard` starts `cleared` in the generic record).
  const phase = wreckState(st).phase;
  if (def.kind.type !== 'shipwreck' || !def.kind.outcome.guard || phase === 'cleared' || phase === 'pendingReward') return [];
  return (st?.guard ?? def.kind.outcome.guard.army).filter((s) => s.count > 0).map((s) => ({ creatureId: s.creatureId, count: s.count }));
}

/** An artifact fits a hero's packs now: a free slot of its kind, or room in the backpack. */
export function artifactFits(catalog: ContentCatalog, hero: Pick<HeroState, 'equipment' | 'backpack'>, artifactId: ArtifactId): boolean {
  const def = catalog.artifacts[artifactId];
  if (!def) return false;
  return !!freeEquipSlot(hero.equipment, def.slot) || hero.backpack.length < catalog.rulesProfile.backpackCapacity;
}

export interface SeaSiteQuote {
  readonly legal: boolean;
  readonly code: RejectionCode | null;
  readonly reason: string | null;
}

export interface ExploreWreckQuote extends SeaSiteQuote {
  /** Movement points Explore costs (and needs). */
  readonly cost: number;
  readonly phase: WreckPhase;
}

const NAVAL_OFF = 'Ships are not part of this scenario';

/** The checks every wreck action shares: the hero aboard a ship beside the wreck. */
function besideWreck(catalog: ContentCatalog, state: MatchState, heroId: HeroId, siteId: SiteId): { fail: SeaSiteQuote | null; def: SiteDefinition | null; hero: HeroState | null } {
  const no = (code: RejectionCode, reason: string) => ({ fail: { legal: false, code, reason }, def: null, hero: null });
  if (!navalEnabled(state)) return no('not_in_scope', NAVAL_OFF);
  const def = missionSite(catalog, state, siteId);
  if (!def || def.kind.type !== 'shipwreck' || !state.world.sites[siteId]) return no('not_found', 'Unknown wreck');
  const hero = state.heroes[heroId];
  if (!hero) return no('not_found', 'Unknown hero');
  if (hero.status !== 'active') return no('illegal_action', `${hero.name} cannot act`);
  const ship = heroShip(state, heroId);
  if (!ship) return no('illegal_action', 'Only a hero aboard a ship can reach a wreck: embark first');
  if (axialDistance(ship.coord, def.coord) !== 1) return no('not_present', `Sail beside ${def.name} first`);
  const fog = state.fog[hero.ownerId];
  if (fog && fog.explored[cellIndex(state.world.map, def.coord)] !== 1) return no('illegal_target', 'Unexplored');
  return { fail: null, def, hero };
}

/** ExploreWreck (read-only quote; the commit runs the same checks). */
export function quoteExploreWreck(catalog: ContentCatalog, state: MatchState, heroId: HeroId, siteId: SiteId): ExploreWreckQuote {
  const def0 = missionSite(catalog, state, siteId);
  const cost = def0?.kind.type === 'shipwreck' ? def0.kind.exploreCost : 0;
  const phase = wreckState(state.world.sites[siteId]).phase;
  const base = besideWreck(catalog, state, heroId, siteId);
  if (base.fail) return { ...base.fail, cost, phase };
  const def = base.def!;
  const hero = base.hero!;
  const fail = (code: RejectionCode, reason: string): ExploreWreckQuote => ({ legal: false, code, reason, cost, phase });
  if (phase === 'cleared') return fail('already_done', `${def.name} has nothing left aboard`);
  if (phase === 'pendingReward') return fail('already_done', `${def.name} is cleared; its treasure waits to be taken`);
  if (phase === 'encounterPending') return fail('illegal_action', 'A fight at the wreck is already under way');
  if (hero.movementPoints < cost) return fail('insufficient_movement', `Exploring needs ${cost} movement points (${hero.name} has ${hero.movementPoints})`);
  return { legal: true, code: null, reason: null, cost, phase };
}

export interface ClaimWreckArtifactQuote extends SeaSiteQuote {
  readonly artifactId: ArtifactId | null;
  /** The artifact fits the hero's packs as they are (no swap needed). */
  readonly fits: boolean;
}

/**
 * ClaimWreckArtifact (read-only quote): take the artifact waiting at a cleared wreck — at once when it
 * fits, or by leaving one backpack item at the wreck in its place (`leaveInstanceId`, the swap).
 */
export function quoteClaimWreckArtifact(catalog: ContentCatalog, state: MatchState, heroId: HeroId, siteId: SiteId, leaveInstanceId?: ArtifactInstanceId | null): ClaimWreckArtifactQuote {
  const w = wreckState(state.world.sites[siteId]);
  const artifactId = (w.pendingArtifactId ?? null) as ArtifactId | null;
  const base = besideWreck(catalog, state, heroId, siteId);
  if (base.fail) return { ...base.fail, artifactId, fits: false };
  const hero = base.hero!;
  const def = base.def!;
  const fail = (code: RejectionCode, reason: string, fits = false): ClaimWreckArtifactQuote => ({ legal: false, code, reason, artifactId, fits });
  if (w.phase !== 'pendingReward' || !artifactId) return fail('already_done', `Nothing waits at ${def.name}`);
  if (w.pendingFor && w.pendingFor !== hero.ownerId) return fail('not_owner', `${def.name}'s treasure was won by another empire`);
  const fits = artifactFits(catalog, hero, artifactId);
  if (fits) return { legal: true, code: null, reason: null, artifactId, fits };
  if (!leaveInstanceId) return fail('no_capacity', `${hero.name}'s packs are full: leave an item from the backpack here to take it`);
  if (!hero.backpack.some((a) => a.instanceId === leaveInstanceId)) return fail('not_found', 'That item is not in the backpack');
  return { legal: true, code: null, reason: null, artifactId, fits };
}

/** What a viewer may know about a wreck (never its hidden outcome before it is explored and fought). */
export interface WreckKnowledge {
  readonly phase: WreckPhase;
  /** The raiders aboard as the viewer saw them in its own fight (null: never fought, or none left). */
  readonly seenGuard: StackSpec[] | null;
  /** The viewer's empire cleared it: the outcome it found. */
  readonly found: WreckOutcomeKind | null;
  /** The artifact waiting for the viewer's heroes (pendingReward for this viewer). */
  readonly waitingArtifactId: ArtifactId | null;
}

export function wreckKnowledge(catalog: ContentCatalog, state: MatchState, viewerId: PlayerId, siteId: SiteId): WreckKnowledge | null {
  const def = missionSite(catalog, state, siteId);
  const st = state.world.sites[siteId];
  if (!def || def.kind.type !== 'shipwreck' || !st) return null;
  const w = wreckState(st);
  const seen = w.guardSeenBy.includes(viewerId);
  const guard = liveWreckGuard(def, st);
  const mine = st.clearedBy === viewerId;
  return {
    phase: w.phase,
    seenGuard: seen && guard.length > 0 ? guard : null,
    found: mine && (w.phase === 'cleared' || w.phase === 'pendingReward') ? def.kind.outcome.kind : null,
    waitingArtifactId: w.phase === 'pendingReward' && w.pendingFor === viewerId ? ((w.pendingArtifactId ?? null) as ArtifactId | null) : null,
  };
}

// ---------------------------------------------------------------------------
// Placement rules (shared by the generator, the custom-map checks and the editor)
// ---------------------------------------------------------------------------

/** What placement reads: the ground of a cell (off the map: 'void'). */
export interface SeaPlacementGround {
  terrainAt(c: HexCoord): Terrain;
}

/** What else stands on the map (keys `hexKey`): other sites, ships, towns (and their launch cells and gates). */
export interface SeaPlacementContext {
  /** Every other site's hex. */
  readonly sites: ReadonlySet<string>;
  /** Ships' hexes. */
  readonly ships: ReadonlySet<string>;
  /** Town tiles (their water neighbours are launch cells; their gates and beaches the harbor). */
  readonly towns: readonly HexCoord[];
  /** Other wrecks' hexes (their water neighbours are interaction rings). */
  readonly wrecks: ReadonlySet<string>;
  /** Extra reserved water (a generator's harbor reserve); optional. */
  readonly reservedWater?: ReadonlySet<string>;
}

const landPassable = (t: Terrain) => t !== 'water' && t !== 'mountain' && t !== 'void';

/** Water hexes beside a town tile (where a launched ship appears) and beside its land neighbours' shore (the harbor landings). */
function harborWater(ground: SeaPlacementGround, towns: readonly HexCoord[]): Set<string> {
  const out = new Set<string>();
  for (const t of towns) {
    for (const n of axialNeighbors(t)) {
      if (ground.terrainAt(n) === 'water') out.add(hexKey(n));
    }
  }
  return out;
}

/** Water hexes connected to `c` (4-step breadth limit avoided: the whole body), as keys. */
function waterBody(ground: SeaPlacementGround, c: HexCoord, cap = 4000): Set<string> {
  const seen = new Set<string>([hexKey(c)]);
  const queue = [c];
  while (queue.length > 0 && seen.size < cap) {
    const cur = queue.pop()!;
    for (const n of axialNeighbors(cur)) {
      const k = hexKey(n);
      if (seen.has(k) || ground.terrainAt(n) !== 'water') continue;
      seen.add(k);
      queue.push(n);
    }
  }
  return seen;
}

/** A sea big enough to sail: at least this many connected water hexes beside a coastal watchtower. */
export const NAVIGABLE_WATER_MIN = 6;

/**
 * Why a coastal watchtower cannot stand at `c` (null: it can): passable coastal land beside navigable
 * water, with a land approach (a free passable land neighbour) and a beach within two hexes (a free
 * passable shore hex where a ship can land, other than the tower's own hex).
 */
export function coastalTowerPlacementProblem(ground: SeaPlacementGround, c: HexCoord, ctx: SeaPlacementContext): string | null {
  const t = ground.terrainAt(c);
  if (t === 'water') return 'A coastal watchtower stands on land, beside the sea — not on the water';
  if (!landPassable(t)) return t === 'void' ? 'No ground here' : 'A watchtower cannot stand on a mountain';
  if (ctx.sites.has(hexKey(c))) return 'Another site stands here';
  const water = axialNeighbors(c).filter((n) => ground.terrainAt(n) === 'water');
  if (water.length === 0) return 'A coastal watchtower must stand beside the sea';
  if (!water.some((w) => waterBody(ground, w, NAVIGABLE_WATER_MIN + 1).size >= NAVIGABLE_WATER_MIN)) return 'The water beside it is too small to sail';
  const approach = axialNeighbors(c).filter((n) => landPassable(ground.terrainAt(n)) && !ctx.sites.has(hexKey(n)));
  if (approach.length === 0) return 'No land approach: a hero must be able to walk up to the tower';
  let beach = false;
  for (let dq = -2; dq <= 2 && !beach; dq++) {
    for (let dr = Math.max(-2, -dq - 2); dr <= Math.min(2, -dq + 2) && !beach; dr++) {
      if (dq === 0 && dr === 0) continue;
      const x = { q: c.q + dq, r: c.r + dr };
      if (!landPassable(ground.terrainAt(x)) || ctx.sites.has(hexKey(x))) continue;
      if (axialNeighbors(x).some((n) => ground.terrainAt(n) === 'water')) beach = true;
    }
  }
  if (!beach) return 'No beach nearby where a ship could land';
  return null;
}

/** Why floating salvage cannot float at `c` (null: it can): water, free, never on a ship, launch, harbor-landing or wreck-ring hex. */
export function seaPickupPlacementProblem(ground: SeaPlacementGround, c: HexCoord, ctx: SeaPlacementContext): string | null {
  const t = ground.terrainAt(c);
  if (t !== 'water') return 'Floating salvage lies on the water';
  const k = hexKey(c);
  if (ctx.sites.has(k)) return 'Another site is here';
  if (ctx.ships.has(k)) return 'A ship lies here';
  if (harborWater(ground, ctx.towns).has(k)) return 'Keep the harbor clear: ships launch and land here';
  if (ctx.reservedWater?.has(k)) return 'Keep the harbor clear: ships launch and land here';
  if (axialNeighbors(c).some((n) => ctx.wrecks.has(hexKey(n)))) return 'Too close to a wreck: its approach must stay clear';
  if (waterBody(ground, c, NAVIGABLE_WATER_MIN + 1).size < NAVIGABLE_WATER_MIN) return 'This water is too small to sail';
  return null;
}

/**
 * Why a shipwreck cannot lie at `c` (null: it can): water, free, at least two free water neighbours to
 * approach from, two hexes from any launch cell and ship, never on the harbor, and never cutting the
 * sea it lies in (every other hex of that water stays connected without the wreck's hex).
 */
export function shipwreckPlacementProblem(ground: SeaPlacementGround, c: HexCoord, ctx: SeaPlacementContext): string | null {
  const t = ground.terrainAt(c);
  if (t !== 'water') return 'A wreck lies on the water';
  const k = hexKey(c);
  if (ctx.sites.has(k)) return 'Another site is here';
  if (ctx.ships.has(k)) return 'A ship lies here';
  const harbor = harborWater(ground, ctx.towns);
  if (harbor.has(k) || ctx.reservedWater?.has(k)) return 'Keep the harbor clear: ships launch and land here';
  const near = (set: ReadonlySet<string>) => [c, ...axialNeighbors(c)].some((x) => set.has(hexKey(x)));
  if (near(harbor)) return 'Too close to a harbor: keep two hexes from where ships launch';
  if (near(ctx.ships)) return 'Too close to a ship';
  if (axialNeighbors(c).some((n) => ctx.wrecks.has(hexKey(n)))) return 'Too close to another wreck';
  const approach = axialNeighbors(c).filter((n) => ground.terrainAt(n) === 'water' && !ctx.sites.has(hexKey(n)) && !ctx.ships.has(hexKey(n)) && !ctx.wrecks.has(hexKey(n)));
  if (approach.length < 2) return 'A wreck needs at least two free water hexes beside it to approach from';
  if (cutsWater(ground, c, ctx.wrecks)) return 'It would cut the sea in two: another route must stay open';
  return null;
}

/** Removing `c` (and the other wrecks) splits the water `c` lies in (its water neighbours no longer all reach each other). */
function cutsWater(ground: SeaPlacementGround, c: HexCoord, wrecks: ReadonlySet<string>): boolean {
  const k = hexKey(c);
  const open = (x: HexCoord) => ground.terrainAt(x) === 'water' && hexKey(x) !== k && !wrecks.has(hexKey(x));
  const starts = axialNeighbors(c).filter(open);
  if (starts.length <= 1) return false;
  const seen = new Set<string>([hexKey(starts[0]!)]);
  const queue = [starts[0]!];
  const want = new Set(starts.map(hexKey));
  let found = 1;
  while (queue.length > 0 && found < want.size) {
    const cur = queue.pop()!;
    for (const n of axialNeighbors(cur)) {
      const nk = hexKey(n);
      if (seen.has(nk) || !open(n)) continue;
      seen.add(nk);
      if (want.has(nk)) found++;
      queue.push(n);
    }
  }
  return found < want.size;
}

/** The placement context of a mission and map (for checks of a generated or compiled mission). */
export function seaPlacementContextOf(mission: { readonly sites: readonly SiteDefinition[]; readonly ships?: readonly { readonly coord: HexCoord }[] }, exceptSiteId: string | null): SeaPlacementContext {
  const sites = new Set<string>();
  const wrecks = new Set<string>();
  const towns: HexCoord[] = [];
  for (const s of mission.sites) {
    if (s.kind.type === 'town') towns.push(s.coord);
    if (s.id === exceptSiteId) continue;
    sites.add(hexKey(s.coord));
    if (s.kind.type === 'shipwreck') wrecks.add(hexKey(s.coord));
  }
  return { sites, wrecks, towns, ships: new Set((mission.ships ?? []).map((s) => hexKey(s.coord))) };
}

/** Ground of a logical map for placement checks. */
export function mapGround(map: MatchState['world']['map']): SeaPlacementGround {
  return { terrainAt: (c) => (inMap(map, c) ? terrainAt(map, c) : 'void') };
}
