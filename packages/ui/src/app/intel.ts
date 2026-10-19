/**
 * Scouting intel view models (expedition kit §05/§11, `scoutingIntelV1`): what the
 * adventure panels, the hover tooltip, the encounter summary and the map's last-known
 * markers show about an enemy army. Built ONLY from the rules' projection
 * (`armyIntel`) and the viewer's snapshots (`lastKnownIntel`) — never from the enemy's
 * state — so no hidden count can reach the DOM, an accessible label or a tooltip. The
 * stage comes from the rules; the interface never chooses its own knowledge stage.
 */
import {
  activeIntelPolicy,
  armyIntel,
  dayOfWeek,
  intelRangeText,
  intelStrengthLabel,
  intelVision,
  lastKnownIntel,
  staleIntelReports,
  weekOf,
  type ArmyIntel,
  type ContentCatalog,
  type HexCoord,
  type IntelSnapshot,
  type MatchState,
  type PlayerId,
} from '@pr/rules';

export type IntelViewStage = 'sighting' | 'identified' | 'scouted';

export interface IntelCreatureView {
  readonly creatureId: string;
  /** The plural name (a report never says how many). */
  readonly name: string;
  /** Scouted: "20–39"; otherwise null (unknown). */
  readonly range: string | null;
}

export interface IntelEarlierView {
  readonly stage: 'identified' | 'scouted';
  readonly title: string;
  readonly observed: string;
  readonly creatures: readonly IntelCreatureView[];
}

export interface ArmyIntelView {
  readonly targetId: string;
  /** In sight now, or the last report from outside vision. */
  readonly mode: 'current' | 'last_known';
  readonly stage: IntelViewStage;
  readonly title: string;
  readonly kind: 'hero' | 'monster';
  /** The army's name as its banner tells it ("Odysseus", "Wandering Wolves"). */
  readonly name: string;
  /** The owner its banner showed. */
  readonly ownerName: string;
  readonly ownerColor: string | null;
  /** A wandering monster band's map figure (its banner); null for heroes. */
  readonly figureCreatureId: string | null;
  readonly strength: string;
  /** Null at a sighting: the creatures are unknown. */
  readonly creatures: readonly IntelCreatureView[] | null;
  readonly note: string;
  readonly observedDay: number;
  readonly observed: string;
  readonly coord: HexCoord;
  readonly earlier: IntelEarlierView | null;
  /** The accessible summary: permitted knowledge only. */
  readonly summary: string;
}

export const INTEL_STAGE_TITLE: Readonly<Record<IntelViewStage, string>> = {
  sighting: 'Distant sighting',
  identified: 'Troops identified',
  scouted: 'Scout report',
};

const STAGE_NOTE: Readonly<Record<IntelViewStage, string>> = {
  sighting: 'Creatures unknown. Move closer to identify the troops.',
  identified: 'Creature types known. Numbers still uncertain.',
  scouted: 'Estimated numbers: scouting reveals ranges, not certainty.',
};

/** Scouting intel is in force for this match (new games; off in older saves and The Three Beacons). */
export function intelOn(catalog: ContentCatalog, state: MatchState): boolean {
  return activeIntelPolicy(catalog, state) !== null;
}

function dateText(day: number): string {
  return `Week ${weekOf(day)} · Day ${dayOfWeek(day)}`;
}

function observedText(state: MatchState, day: number, current: boolean): string {
  if (current) return 'Observed today';
  const ago = state.day - day;
  return `Last known ${dateText(day)}${ago <= 0 ? ' (today)' : ago === 1 ? ' (yesterday)' : ` (${ago} days ago)`}`;
}

function creatureViews(catalog: ContentCatalog, ids: readonly string[], ranges?: readonly { min: number; max: number | null }[]): IntelCreatureView[] {
  return ids.map((id, i) => {
    const r = ranges?.[i];
    return { creatureId: id, name: catalog.creatures[id]?.pluralName ?? id, range: r ? intelRangeText(r) : null };
  });
}

function ownerOf(state: MatchState, ownerId: PlayerId | null): { name: string; color: string | null } {
  const p = ownerId ? state.players[ownerId] : undefined;
  return { name: p?.name ?? 'Unknown banner', color: p?.color ?? null };
}

function summaryOf(v: Omit<ArmyIntelView, 'summary'>): string {
  const parts = [`${v.name}, ${v.ownerName}`, v.mode === 'current' ? v.title : `${v.title}, ${v.observed}`, `strength: ${v.strength}`];
  if (v.creatures) parts.push(v.creatures.map((c) => (c.range ? `${c.name} ${c.range}` : `${c.name}, number unknown`)).join('; '));
  else parts.push('creatures unknown');
  return parts.join('. ');
}

function finish(v: Omit<ArmyIntelView, 'summary'>): ArmyIntelView {
  return { ...v, summary: summaryOf(v) };
}

/** The panel for an army the viewer sees now (null: full information — own armies, or the feature off — or not in sight). */
export function currentIntelView(catalog: ContentCatalog, state: MatchState, viewerId: PlayerId, targetId: string, intel?: ArmyIntel | null): ArmyIntelView | null {
  const r = intel === undefined ? armyIntel(catalog, state, viewerId, targetId) : intel;
  if (!r || r.stage === 'full') return null;
  const hero = state.heroes[r.targetId];
  const owner = ownerOf(state, r.ownerId);
  const snap = lastKnownIntel(state, viewerId, r.targetId);
  // An earlier, more detailed report stays apart (dated), never as the current estimate.
  const earlier = snap?.earlier
    ? {
        stage: snap.earlier.stage,
        title: INTEL_STAGE_TITLE[snap.earlier.stage],
        observed: `Earlier report, ${dateText(snap.earlier.observedDay)}`,
        creatures: creatureViews(catalog, snap.earlier.permittedCreatureTypes, snap.earlier.permittedCountRanges),
      }
    : null;
  return finish({
    targetId: r.targetId,
    mode: 'current',
    stage: r.stage,
    title: INTEL_STAGE_TITLE[r.stage],
    kind: r.kind,
    name: hero?.name ?? 'Army',
    ownerName: owner.name,
    ownerColor: owner.color,
    figureCreatureId: r.figureCreatureId,
    strength: intelStrengthLabel(catalog, r.strengthBand),
    creatures: r.creatures ? creatureViews(catalog, r.creatures.map((c) => c.creatureId), r.stage === 'scouted' ? r.creatures.map((c) => c.range!) : undefined) : null,
    note: STAGE_NOTE[r.stage],
    observedDay: state.day,
    observed: observedText(state, state.day, true),
    coord: r.coord,
    earlier,
  });
}

/** The panel for a last-known report (outside current vision): its stage, owner, band and date as observed. */
export function lastKnownView(catalog: ContentCatalog, state: MatchState, snap: IntelSnapshot): ArmyIntelView {
  const hero = state.heroes[snap.targetId];
  const owner = ownerOf(state, snap.knownOwner);
  const earlier = snap.earlier
    ? {
        stage: snap.earlier.stage,
        title: INTEL_STAGE_TITLE[snap.earlier.stage],
        observed: `Earlier report, ${dateText(snap.earlier.observedDay)}`,
        creatures: creatureViews(catalog, snap.earlier.permittedCreatureTypes, snap.earlier.permittedCountRanges),
      }
    : null;
  return finish({
    targetId: snap.targetId,
    mode: 'last_known',
    stage: snap.stage,
    title: INTEL_STAGE_TITLE[snap.stage],
    kind: hero?.monster ? 'monster' : 'hero',
    name: hero?.name ?? 'Army',
    ownerName: owner.name,
    ownerColor: owner.color,
    // A band's figure is its banner (the creature it is named and drawn as).
    figureCreatureId: hero?.monster?.creatureId ?? null,
    strength: intelStrengthLabel(catalog, snap.strengthBand),
    creatures: snap.permittedCreatureTypes ? creatureViews(catalog, snap.permittedCreatureTypes, snap.permittedCountRanges) : null,
    note: 'Reports do not update through fog: this is what was seen then.',
    observedDay: snap.observedDay,
    observed: observedText(state, snap.observedDay, false),
    coord: snap.lastSeenCoord,
    earlier,
  });
}

/** The viewer's last-known report standing on `c` (outside its vision), if any. */
export function lastKnownAt(catalog: ContentCatalog, state: MatchState, viewerId: PlayerId, c: HexCoord, visible?: ReadonlySet<number>): IntelSnapshot | null {
  return staleIntelReports(catalog, state, viewerId, visible).find((s) => s.lastSeenCoord.q === c.q && s.lastSeenCoord.r === c.r) ?? null;
}

/** The map's last-known markers (presentation view model): where, whose banner colour, and when. */
export function lastKnownMarkers(catalog: ContentCatalog, state: MatchState, viewerId: PlayerId, visible?: ReadonlySet<number>): { id: string; coord: HexCoord; color: string; day: number; monster: boolean }[] {
  return staleIntelReports(catalog, state, viewerId, visible).map((s) => ({
    id: s.targetId,
    coord: { q: s.lastSeenCoord.q, r: s.lastSeenCoord.r },
    color: ownerOf(state, s.knownOwner).color ?? '#9a9a9a',
    day: s.observedDay,
    monster: !!state.heroes[s.targetId]?.monster,
  }));
}

/** Projections for several targets with one vision (encounter and route summaries). */
export function intelFor(catalog: ContentCatalog, state: MatchState, viewerId: PlayerId, targetIds: readonly string[]): Map<string, ArmyIntel | null> {
  const vision = intelVision(catalog, state, viewerId);
  return new Map(targetIds.map((id) => [id, armyIntel(catalog, state, viewerId, id, vision)]));
}
