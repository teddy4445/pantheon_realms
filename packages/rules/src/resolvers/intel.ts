/**
 * Scouting intel projection (expedition kit §05, scenario feature `scoutingIntelV1`):
 * what one player may know about an army on the adventure map, and nothing more.
 * A rules/view-model projection, not CSS hiding: the interface, accessible labels,
 * route and encounter summaries and the AI belief are built from it, never from the
 * enemy's state.
 *
 * Stages (policy `catalog.scoutingIntelPolicy`, data):
 *  - sighting   — the army's tile is in the viewer's current vision: owner banner and one
 *                 broad strength band (catalog Gold cost × living count);
 *  - identified — also within `identifiedWithinHexes` (3) of a friendly hero or town:
 *                 creature types, grouped by creature ID (base and upgraded forms apart),
 *                 no quantities;
 *  - scouted    — a friendly hero of Scouting rank 1/2/3 within 2/3/4 hexes: approximate
 *                 quantity ranges (1–4 … 320+). Rank 0 never gets counts by adjacency,
 *                 and a town never scouts.
 * Every stage needs CURRENT visibility (`visibleCells`); distance alone never sees
 * through fog. The best eligible observer decides. Adventure-spell vision (Divine
 * Sight) shows a tile but observes from nowhere: sighting only.
 *
 * Applies to enemy heroes and wandering monsters (both `HeroState`s). Own (and, were
 * there alliances, allied) armies keep their full information (stage `full`). Neutral
 * site guards keep today's full encounter information (their army is part of the map's
 * published content — mission texts name it with army tokens — and the encounter
 * previews and their tests rely on it); town garrisons keep the existing rule
 * (seen when the town is in view). Never exposed by a report: exact counts below
 * `full`, HP, artifacts, commander spells, the raw army value, or how many slots
 * hold one creature. With the feature off (absent flag: older saves, The Three
 * Beacons) every visible army is `full`, exactly as before.
 *
 * Pure functions over committed state; no RNG, no mutation.
 */
import type { ContentCatalog } from '../definitions/catalog';
import type { IntelCountRange, ScoutingIntelPolicy } from '../definitions/scoutingIntel';
import type { CreatureId, HeroId, PlayerId } from '../ids';
import { axialDistance, type HexCoord } from '../core/hex';
import type { HeroState, IntelSnapshot, MatchState } from '../state/match';
import { cellIndex, visibleCells } from './world';

/** Observation stages below full information, least detailed first. */
export type IntelStage = 'sighting' | 'identified' | 'scouted';
/** A projection's stage: `full` = own/allied armies, or every visible army with the feature off. */
export type ArmyIntelStage = IntelStage | 'full';

export const INTEL_STAGE_RANK: Readonly<Record<ArmyIntelStage, number>> = { sighting: 1, identified: 2, scouted: 3, full: 4 };

/** The scenario plays with scouting intel (absent flag = off: older saves keep full information about visible armies). */
export function scoutingIntelEnabled(state: Pick<MatchState, 'scenario'>): boolean {
  return state.scenario.features?.scoutingIntelV1 === true;
}

/** The policy in force, or null when the feature is off (or the catalog has no policy: then the legacy rule applies). */
export function activeIntelPolicy(catalog: ContentCatalog, state: Pick<MatchState, 'scenario'>): ScoutingIntelPolicy | null {
  return scoutingIntelEnabled(state) ? (catalog.scoutingIntelPolicy ?? null) : null;
}

/** Whether `ownerId`'s armies are friendly to `viewerId` (own armies; this build has no alliances). */
export function intelFriendly(state: Pick<MatchState, 'players'>, viewerId: PlayerId, ownerId: PlayerId | null | undefined): boolean {
  return !!ownerId && ownerId === viewerId;
}

/** A hero's Scouting rank (0–3): the highest rank of its skills whose rule is `scouting` (skills are data). */
export function scoutingRank(catalog: ContentCatalog, hero: Pick<HeroState, 'skills'>): number {
  let rank = 0;
  for (const s of hero.skills) if (catalog.skills[s.skillId]?.rule.type === 'scouting' && s.rank > rank) rank = s.rank;
  return rank;
}

/** The quantity range a count falls in (policy bins; the last bin may be open). */
export function intelCountRange(policy: ScoutingIntelPolicy, count: number): IntelCountRange {
  const bins = policy.quantityBins;
  for (const b of bins) if (count >= b.min && (b.max === null || count <= b.max)) return { min: b.min, max: b.max };
  return count < (bins[0]?.min ?? 1) ? { ...bins[0]! } : { ...bins[bins.length - 1]! };
}

/** Catalog Gold value of an army's living creatures (Gold cost × count; hero strength ignored). */
export function armyGoldValue(catalog: ContentCatalog, stacks: readonly ({ readonly creatureId: CreatureId; readonly count: number } | null)[]): number {
  let total = 0;
  for (const s of stacks) if (s && s.count > 0) total += (catalog.creatures[s.creatureId]?.cost?.gold ?? 0) * s.count;
  return total;
}

/** The strength band (index into `policy.strengthBands`) of a Gold value. */
export function intelStrengthBand(policy: ScoutingIntelPolicy, gold: number): number {
  const bands = policy.strengthBands;
  for (let i = 0; i < bands.length; i++) {
    const max = bands[i]!.maxExclusive;
    if (max === null || gold < max) return i;
  }
  return Math.max(0, bands.length - 1);
}

/** The words of a strength band ("Substantial force"); empty for an unknown band. */
export function intelStrengthLabel(catalog: ContentCatalog, band: number | null | undefined): string {
  if (band === null || band === undefined) return '';
  return catalog.scoutingIntelPolicy?.strengthBands[band]?.label ?? '';
}

/** "20–39", "320+": a range as a player reads it. */
export function intelRangeText(range: IntelCountRange): string {
  return range.max === null ? `${range.min}+` : `${range.min}–${range.max}`;
}

// ---------------------------------------------------------------------------
// The viewer's observers
// ---------------------------------------------------------------------------

/** One friendly observer: where it stands and within how many hexes it scouts (0: never). */
export interface IntelObserver {
  readonly coord: HexCoord;
  readonly detail: number;
}

/** What one player observes from right now (computed once, reused for every target). */
export interface IntelVision {
  readonly viewerId: PlayerId;
  readonly visible: ReadonlySet<number>;
  readonly observers: readonly IntelObserver[];
}

export function intelVision(catalog: ContentCatalog, state: MatchState, viewerId: PlayerId, visible?: ReadonlySet<number>): IntelVision {
  const policy = catalog.scoutingIntelPolicy;
  const observers: IntelObserver[] = [];
  for (const h of Object.values(state.heroes)) {
    if (h.status !== 'active' || !intelFriendly(state, viewerId, h.ownerId)) continue;
    observers.push({ coord: h.position, detail: policy?.detailedDistanceByRank[scoutingRank(catalog, h)] ?? 0 });
  }
  // Towns identify within the same distance but never write a scout report.
  for (const t of Object.values(state.towns)) if (intelFriendly(state, viewerId, t.ownerId)) observers.push({ coord: t.coord, detail: 0 });
  return { viewerId, visible: visible ?? visibleCells(catalog, state, viewerId), observers };
}

/** The stage at which `vision` observes `coord` now (null: not in current vision). */
export function observationStage(policy: ScoutingIntelPolicy, map: MatchState['world']['map'], vision: IntelVision, coord: HexCoord): IntelStage | null {
  if (!vision.visible.has(cellIndex(map, coord))) return null;
  let stage: IntelStage = 'sighting';
  for (const o of vision.observers) {
    const d = axialDistance(o.coord, coord);
    if (o.detail > 0 && d <= o.detail) return 'scouted';
    if (d <= policy.identifiedWithinHexes) stage = 'identified';
  }
  return stage;
}

// ---------------------------------------------------------------------------
// The projection
// ---------------------------------------------------------------------------

/** One creature line of a projected army. */
export interface ArmyIntelLine {
  readonly creatureId: CreatureId;
  /** Exact count: only at stage `full`. */
  readonly count?: number;
  /** Approximate quantity range: only at stage `scouted`. */
  readonly range?: IntelCountRange;
}

/** What the viewer knows about one army right now. */
export interface ArmyIntel {
  readonly targetId: HeroId;
  readonly kind: 'hero' | 'monster';
  readonly stage: ArmyIntelStage;
  /** Where it stands (it is in the viewer's vision). */
  readonly coord: HexCoord;
  /** The owner its banner shows (a wandering monster's: the wild creatures' player). */
  readonly ownerId: PlayerId;
  /** Strength band (index into the policy's bands); null with the feature off. */
  readonly strengthBand: number | null;
  /** The creature lines (null at sighting: types unknown). `full` lists the slots as they are; lower stages group by creature ID. */
  readonly creatures: readonly ArmyIntelLine[] | null;
  /** The creature a wandering monster band is drawn as on the map (its banner: public at every stage); null for heroes. */
  readonly figureCreatureId: CreatureId | null;
}

function figureOf(catalog: ContentCatalog, hero: HeroState): CreatureId | null {
  if (!hero.monster) return null;
  // The map draws a band as its strongest creature (Adventure view `monsterLead`).
  let best: { id: CreatureId; tier: number } | null = null;
  for (const s of hero.army.slots) {
    const c = s ? catalog.creatures[s.creatureId] : undefined;
    if (c && (!best || c.tier > best.tier)) best = { id: c.id, tier: c.tier };
  }
  return best?.id ?? hero.monster.creatureId ?? null;
}

/** Group an army's living creatures by creature ID, in a canonical order (tier, base before upgraded, ID) — never by slot. */
export function groupedCreatures(catalog: ContentCatalog, stacks: readonly ({ readonly creatureId: CreatureId; readonly count: number } | null)[]): { creatureId: CreatureId; count: number }[] {
  const totals = new Map<CreatureId, number>();
  for (const s of stacks) if (s && s.count > 0) totals.set(s.creatureId, (totals.get(s.creatureId) ?? 0) + s.count);
  const key = (id: CreatureId) => {
    const c = catalog.creatures[id];
    return [c?.tier ?? 99, c?.form === 'upgraded' ? 1 : 0] as const;
  };
  return [...totals.entries()]
    .map(([creatureId, count]) => ({ creatureId, count }))
    .sort((a, b) => {
      const ka = key(a.creatureId);
      const kb = key(b.creatureId);
      return ka[0] - kb[0] || ka[1] - kb[1] || (a.creatureId < b.creatureId ? -1 : a.creatureId > b.creatureId ? 1 : 0);
    });
}

function fullLines(hero: HeroState): ArmyIntelLine[] {
  return hero.army.slots.filter((s): s is NonNullable<typeof s> => !!s && s.count > 0).map((s) => ({ creatureId: s.creatureId, count: s.count }));
}

/** The projection of `hero`'s army at `stage` (the stage must be one the viewer reached). */
export function projectArmy(catalog: ContentCatalog, policy: ScoutingIntelPolicy | null, hero: HeroState, stage: ArmyIntelStage): ArmyIntel {
  const living = hero.army.slots;
  const band = policy ? intelStrengthBand(policy, armyGoldValue(catalog, living)) : null;
  let creatures: ArmyIntelLine[] | null;
  if (stage === 'full' || !policy) creatures = fullLines(hero);
  else if (stage === 'sighting') creatures = null;
  else {
    const grouped = groupedCreatures(catalog, living);
    creatures = stage === 'scouted' ? grouped.map((g) => ({ creatureId: g.creatureId, range: intelCountRange(policy, g.count) })) : grouped.map((g) => ({ creatureId: g.creatureId }));
  }
  return {
    targetId: hero.id,
    kind: hero.monster ? 'monster' : 'hero',
    stage,
    coord: { q: hero.position.q, r: hero.position.r },
    ownerId: hero.ownerId,
    strengthBand: band,
    creatures,
    figureCreatureId: figureOf(catalog, hero),
  };
}

/**
 * `armyIntel(catalog, state, viewerId, target)`: what `viewerId` may know right now about
 * the army of hero or wandering monster `target` — null when the viewer does not see it
 * now (its last-known snapshot, if any, is `lastKnownIntel`). Own armies: `full`. With
 * the feature off: `full` for every visible army (the legacy rule). Pass `vision` to reuse
 * one player's observers for many targets.
 */
export function armyIntel(catalog: ContentCatalog, state: MatchState, viewerId: PlayerId, target: HeroId | HeroState, vision?: IntelVision): ArmyIntel | null {
  const hero = typeof target === 'string' ? state.heroes[target] : target;
  if (!hero || hero.status !== 'active') return null;
  const policy = activeIntelPolicy(catalog, state);
  if (intelFriendly(state, viewerId, hero.ownerId)) return projectArmy(catalog, policy, hero, 'full');
  const v = vision ?? intelVision(catalog, state, viewerId);
  if (!policy) return v.visible.has(cellIndex(state.world.map, hero.position)) ? projectArmy(catalog, null, hero, 'full') : null;
  const stage = observationStage(policy, state.world.map, v, hero.position);
  return stage ? projectArmy(catalog, policy, hero, stage) : null;
}

/** The viewer's last-known report on `targetId` (its snapshot), when it has one. */
export function lastKnownIntel(state: Pick<MatchState, 'intel'>, viewerId: PlayerId, targetId: HeroId): IntelSnapshot | null {
  return state.intel?.[viewerId]?.[targetId] ?? null;
}

/**
 * The viewer's last-known reports whose army is NOT in its current vision (the map's
 * "last known" markers), in a stable order. Reports of armies seen now are current, not stale.
 */
export function staleIntelReports(catalog: ContentCatalog, state: MatchState, viewerId: PlayerId, visible?: ReadonlySet<number>): IntelSnapshot[] {
  const book = state.intel?.[viewerId];
  if (!book || !activeIntelPolicy(catalog, state)) return [];
  const seen = visible ?? visibleCells(catalog, state, viewerId);
  const map = state.world.map;
  const out: IntelSnapshot[] = [];
  for (const id of Object.keys(book).sort()) {
    const snap = book[id]!;
    const hero = state.heroes[id];
    const current = !!hero && hero.status === 'active' && seen.has(cellIndex(map, hero.position)) && !intelFriendly(state, viewerId, hero.ownerId);
    if (!current) out.push(snap);
  }
  return out;
}

/** The snapshot fields a current projection permits (the policy's `snapshotFields`). */
export function snapshotOf(intel: ArmyIntel, day: number): IntelSnapshot | null {
  if (intel.stage === 'full' || intel.strengthBand === null) return null;
  const snap: IntelSnapshot = {
    targetId: intel.targetId,
    lastSeenCoord: { q: intel.coord.q, r: intel.coord.r },
    observedDay: day,
    stage: intel.stage,
    knownOwner: intel.ownerId,
    strengthBand: intel.strengthBand,
  };
  if (intel.creatures) {
    snap.permittedCreatureTypes = intel.creatures.map((c) => c.creatureId);
    if (intel.stage === 'scouted') snap.permittedCountRanges = intel.creatures.map((c) => ({ ...c.range! }));
  }
  return snap;
}
