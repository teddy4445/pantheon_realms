/**
 * Recruitment caravan view models (expedition kit §06/§11, `recruitmentCaravansV1`): the words,
 * dates and lists the dispatch, tracker, arrival and blocked dialogs, the command sidebar, the
 * tile panel and the end-of-day summary show. Every number comes from the rules (quoteCaravan,
 * caravanEta, the committed events); another player's caravan is shown only through the scouting
 * projection (`caravanIntel`), never from its state — no hidden count, route or destination.
 */
import {
  activeCaravanPolicy,
  caravanEta,
  caravanIntel,
  caravanList,
  cargoCount,
  dayOfWeek,
  intelRangeText,
  intelStrengthLabel,
  weekOf,
  CARAVAN_ON_MAP,
  type CaravanState,
  type ContentCatalog,
  type GameEvent,
  type MatchState,
  type PlayerId,
} from '@pr/rules';
import { INTEL_STAGE_TITLE, type ArmyIntelView } from './intel';

/** The match plays with recruitment caravans (new skirmish and random maps; off in campaigns and older saves). */
export function caravansOn(catalog: ContentCatalog, state: MatchState): boolean {
  return activeCaravanPolicy(catalog, state) !== null;
}

/** The viewer's shipments on the map (and today's final ones), in the stable order. */
export function myCaravans(state: MatchState, playerId: PlayerId, includeFinal = false): CaravanState[] {
  return caravanList(state, playerId).filter((c) => includeFinal || CARAVAN_ON_MAP.has(c.status));
}

export const CARAVAN_STATUS_LABEL: Readonly<Record<CaravanState['status'], string>> = {
  queued: 'Leaves next turn',
  travelling: 'In transit',
  blocked: 'Held',
  intercepted: 'Under attack',
  awaiting_garrison: 'Waiting at the gate',
  delivered: 'Delivered',
  destroyed: 'Lost',
};

export function townName(state: MatchState, townId: string): string {
  return state.towns[townId]?.name ?? 'an unknown town';
}

export function dateLabel(day: number): string {
  return `Week ${weekOf(day)} · Day ${dayOfWeek(day)}`;
}

/** "Day 12 · 3 days" (arrival day and days from today), or why it has no date. */
export function etaText(state: MatchState, etaDay: number | null): string {
  if (etaDay === null) return 'Arrival unknown';
  const days = etaDay - state.day;
  return `Day ${etaDay} · ${days <= 0 ? 'today' : days === 1 ? 'tomorrow' : `${days} days`}`;
}

/** The tracker's one-line state: where it is going and when, or why it holds. */
export function caravanStateLine(catalog: ContentCatalog, state: MatchState, c: CaravanState): string {
  const to = townName(state, c.destinationTownId);
  switch (c.status) {
    case 'queued':
    case 'travelling':
      return `To ${to} · arrives ${etaText(state, caravanEta(catalog, state, c))}`;
    case 'blocked':
      return c.blockedReason === 'destination_lost' ? `Held: ${to} is no longer yours` : `Held on the way to ${to}`;
    case 'awaiting_garrison':
      return `Waiting at ${to}: no room in the garrison yet`;
    case 'intercepted':
      return `Under attack on the way to ${to}`;
    case 'delivered':
      return `Delivered to ${to}`;
    case 'destroyed':
      return `Lost on the way to ${to}`;
  }
}

const plural = (catalog: ContentCatalog, creatureId: string, n: number) => (n === 1 ? (catalog.creatures[creatureId]?.name ?? creatureId) : (catalog.creatures[creatureId]?.pluralName ?? creatureId));

/** "12 Hoplites, 8 Peltasts" — the owner's own cargo (exact). */
export function cargoText(catalog: ContentCatalog, cargo: readonly { creatureId: string; count: number }[]): string {
  return cargo.map((s) => `${s.count.toLocaleString('en-US')} ${plural(catalog, s.creatureId, s.count)}`).join(', ');
}

/**
 * The scouting panel for another player's caravan the viewer sees now (null: own, or not in
 * sight). Same view model as an enemy army's (ArmyIntelPanel): its stage, the owner's banner,
 * the strength band and the creature types or ranges the stage permits — never the destination.
 */
export function caravanIntelView(catalog: ContentCatalog, state: MatchState, viewerId: PlayerId, caravan: CaravanState): ArmyIntelView | null {
  if (caravan.ownerId === viewerId) return null;
  const r = caravanIntel(catalog, state, viewerId, caravan);
  if (!r || r.stage === 'full') return null;
  const owner = state.players[r.ownerId];
  const creatures = r.creatures ? r.creatures.map((c) => ({ creatureId: c.creatureId, name: catalog.creatures[c.creatureId]?.pluralName ?? c.creatureId, range: c.range ? intelRangeText(c.range) : null })) : null;
  const title = INTEL_STAGE_TITLE[r.stage];
  const strength = intelStrengthLabel(catalog, r.strengthBand);
  const ownerName = owner?.name ?? 'Unknown banner';
  const name = 'Supply caravan';
  const parts = [`${name}, ${ownerName}`, title, `strength: ${strength}`, creatures ? creatures.map((c) => (c.range ? `${c.name} ${c.range}` : `${c.name}, number unknown`)).join('; ') : 'cargo unknown'];
  return {
    targetId: caravan.id,
    mode: 'current',
    stage: r.stage,
    title,
    kind: 'hero',
    name,
    ownerName,
    ownerColor: owner?.color ?? null,
    figureCreatureId: null,
    strength,
    creatures,
    note: r.stage === 'sighting' ? 'Cargo unknown. Move closer to see what it carries.' : r.stage === 'identified' ? 'Cargo types known. Numbers still uncertain.' : 'Estimated numbers: scouting reveals ranges, not certainty.',
    observedDay: state.day,
    observed: 'Observed today',
    coord: r.coord,
    earlier: null,
    summary: parts.join('. '),
  };
}

/** Another player's caravan in sight, with full information (scouting intel off): its exact cargo (the legacy rule). */
export function caravanFullCargo(catalog: ContentCatalog, state: MatchState, viewerId: PlayerId, caravan: CaravanState): { creatureId: string; count: number }[] | null {
  const r = caravanIntel(catalog, state, viewerId, caravan);
  if (!r || r.stage !== 'full' || !r.creatures) return null;
  return r.creatures.map((c) => ({ creatureId: c.creatureId, count: c.count ?? 0 }));
}

/**
 * End-of-day lines for the viewer's own shipments, from the events between its End Day and its
 * next turn (the turn start moves them): moved, held, delivered, fought off an attack, lost.
 */
export function caravanSummaryLines(catalog: ContentCatalog, state: MatchState, events: readonly GameEvent[], viewerId: PlayerId): string[] {
  const out: string[] = [];
  const to = (id: string, fallback?: string) => townName(state, state.caravans?.[id]?.destinationTownId ?? fallback ?? '');
  const moved = new Map<string, number>();
  for (const e of events) {
    switch (e.kind) {
      case 'CaravanMoved':
        if (e.playerId === viewerId) moved.set(e.caravanId, (moved.get(e.caravanId) ?? 0) + e.path.length);
        break;
      case 'CaravanDelivered':
        if (e.playerId === viewerId) out.push(`Caravan from ${townName(state, e.sourceTownId)} delivered ${cargoText(catalog, e.cargo)} to ${townName(state, e.townId)}`);
        break;
      case 'CaravanBlocked':
        if (e.playerId === viewerId) out.push(`Caravan to ${to(e.caravanId)}: ${e.message}`);
        break;
      case 'CaravanInterceptionResolved':
        if (e.playerId === viewerId && e.survived) out.push(`Caravan to ${to(e.caravanId)} fought off an attack (${cargoCount(e.cargo)} troops left)`);
        break;
      case 'CaravanDestroyed':
        if (e.playerId === viewerId) out.push(`Caravan to ${to(e.caravanId)} was destroyed${e.byHeroId && state.heroes[e.byHeroId] ? ` by ${state.heroes[e.byHeroId]!.name}` : ''}: ${cargoText(catalog, e.lost)} lost`);
        break;
      default:
        break;
    }
  }
  for (const [id, tiles] of moved) {
    const c = state.caravans?.[id];
    if (!c || c.status === 'delivered') continue;
    const eta = caravanEta(catalog, state, c);
    out.unshift(`Caravan to ${to(id)} moved ${tiles} ${tiles === 1 ? 'tile' : 'tiles'}${eta !== null ? ` · arrives day ${eta}` : ''}`);
  }
  return out;
}
