/**
 * Hero ships in the interface (expedition kit §07/§11, scenario feature `navalMovementV1`): the
 * view models the adventure map, the ship inspector, the town's coastal launch service, the
 * travel preview and the event notices read. Every legality, price and route comes from the rules'
 * quotes (`quoteLaunchShip`, `quoteEmbark`, `quoteDisembark`, `quoteAttackShip`, `quoteTravel`,
 * `planVoyage`, `voyageDays`); the interface never decides one, and every action it offers is the
 * validated command those quotes describe. Another player's ship is shown only while its tile is in
 * the viewer's sight (as a hero is); a hidden army is never listed here.
 */
import {
  AXIAL_DIRECTIONS,
  BATTLEFIELD_LAYOUTS,
  axialDistance,
  cellIndex,
  claimableShips,
  facingBetween,
  freeLaunchCells,
  coastalWaterCells,
  heroShip,
  hexEquals,
  hexKey,
  landingCells,
  movementBudget,
  navalEnabled,
  navalRules,
  parseHexKey,
  quoteAttackShip,
  quoteDisembark,
  quoteEmbark,
  quoteLaunchShip,
  quoteTravel,
  reachableTiles,
  routeDays,
  routeStepDays,
  shipList,
  voyageDays,
  type CommandPayload,
  type ContentCatalog,
  type GameEvent,
  type HexCoord,
  type MatchState,
  type MovementQuote,
  type ResourceBundle,
  type ShipState,
  type VoyagePlan,
  type VoyageTransition,
  visibleCells as visibleCellsOf,
} from '@pr/rules';
import type { AdventurePathView, AdventureShipView, BattleBoardView, ShipMarksView } from '@pr/presentation';
import { expeditionArt, seaCreatureArt } from '../assets/manifest';

/** Ships are part of this match (new skirmish, random and editor maps; never campaigns or older saves). */
export function navalOn(state: MatchState): boolean {
  return navalEnabled(state);
}

/** The six hex directions as a player reads them on the map (AXIAL_DIRECTIONS order, projected). */
export const DIRECTION_NAMES = ['east', 'north-east', 'north-west', 'west', 'south-west', 'south-east'] as const;

/** "north-east" etc.: the direction from one tile to a neighbour (the nearest of the six otherwise). */
export function directionLabel(from: HexCoord, to: HexCoord): string {
  return DIRECTION_NAMES[facingBetween(from, to)] ?? 'east';
}

/** The owner's colour of a ship (the land banner's source), or null for a neutral ship. */
export function shipColor(state: MatchState, ship: Pick<ShipState, 'ownerId'>): string | null {
  return ship.ownerId ? (state.players[ship.ownerId]?.color ?? null) : null;
}

/** Whether the viewer may see a ship now: its own always, any other only while its tile is in sight. */
export function shipVisible(state: MatchState, viewerId: string, ship: ShipState, visible: ReadonlySet<number>): boolean {
  if (ship.ownerId === viewerId) return true;
  return visible.has(cellIndex(state.world.map, ship.coord));
}

/** The ships the adventure map draws for the viewer (fog and sight like heroes; flags from the owner's colour). */
export function shipViews(state: MatchState, viewerId: string, selectedHeroId: string | null, visible: ReadonlySet<number>): AdventureShipView[] {
  if (!navalOn(state)) return [];
  const out: AdventureShipView[] = [];
  for (const s of shipList(state)) {
    if (!shipVisible(state, viewerId, s, visible)) continue;
    out.push({
      id: s.shipId,
      coord: { q: s.coord.q, r: s.coord.r },
      facing: s.facing,
      color: shipColor(state, s),
      occupied: !!s.heroId,
      shown: true,
      selected: !!selectedHeroId && s.heroId === selectedHeroId,
      boarding: s.state === 'in_battle',
    });
  }
  return out;
}

/** The ship on a tile that the viewer may see (none in fog). */
export function visibleShipAt(state: MatchState, viewerId: string, c: HexCoord, visible: ReadonlySet<number>): ShipState | null {
  if (!navalOn(state)) return null;
  return shipList(state).find((s) => hexEquals(s.coord, c) && shipVisible(state, viewerId, s, visible)) ?? null;
}

// ---------------------------------------------------------------------------
// The ship inspector (ShipInspect)
// ---------------------------------------------------------------------------

export type ShipActionId = 'embark' | 'disembark' | 'attack' | 'route';

export interface ShipAction {
  readonly id: ShipActionId;
  readonly label: string;
  readonly enabled: boolean;
  /** Why it cannot be done now (the quote's reason); null when enabled. */
  readonly reason: string | null;
  /** The validated command it dispatches (absent for Disembark: the player picks a shore first; and for a route plan). */
  readonly command?: CommandPayload;
  /** A plain explanation of what it does (cost and consequence). */
  readonly detail?: string;
}

export interface LandingOption {
  readonly coord: HexCoord;
  /** "Land to the north-east". */
  readonly label: string;
  readonly command: CommandPayload;
}

export interface ShipInspectView {
  readonly shipId: string;
  readonly ownerName: string;
  /** The owner's colour (null: neutral). */
  readonly ownerColor: string | null;
  readonly mine: boolean;
  /** The hero aboard (visible ships only: their banner and name are public, like a hero on the map). */
  readonly hero: { readonly id: string; readonly name: string; readonly definitionId: string } | null;
  readonly stateLabel: string;
  /** Movement of the viewer's own hero aboard (another empire's movement is never shown). */
  readonly movement: { readonly left: number; readonly max: number } | null;
  readonly actions: readonly ShipAction[];
  /** Disembark targets of the viewer's own hero aboard (empty when it cannot land now). */
  readonly landing: readonly LandingOption[];
  readonly coord: HexCoord;
}

const STATE_LABEL: Readonly<Record<ShipState['state'], string>> = {
  empty: 'At anchor',
  occupied: 'Crewed',
  in_battle: 'In a boarding battle',
  wrecked: 'Wrecked',
};

/**
 * What the ship inspector shows for `shipId` and what the viewer may do with it, every legality from
 * the rules: Embark (the selected hero on the adjacent shore, `quoteEmbark`), Disembark (the viewer's
 * hero aboard, `landingCells` + `quoteDisembark`), Attack (from the selected hero's own adjacent ship,
 * `quoteAttackShip` — confirmed by the player before it is sent) and a route to it otherwise.
 */
export function shipInspectView(catalog: ContentCatalog, state: MatchState, viewerId: string, shipId: string, selectedHeroId: string | null, visible: ReadonlySet<number>): ShipInspectView | null {
  const ship = state.world.ships?.[shipId];
  if (!ship || ship.state === 'wrecked' || !shipVisible(state, viewerId, ship, visible)) return null;
  const mine = ship.ownerId === viewerId;
  const aboard = ship.heroId ? state.heroes[ship.heroId] : undefined;
  const hero = aboard ? { id: aboard.id, name: aboard.name, definitionId: aboard.definitionId } : null;
  const owner = ship.ownerId ? state.players[ship.ownerId] : undefined;
  const ownerName = owner ? (owner.id === viewerId ? `${owner.name} (you)` : owner.name) : 'Neutral';
  const movement = aboard && aboard.ownerId === viewerId ? { left: aboard.movementPoints, max: Math.max(aboard.movementPoints, movementBudget(catalog, state, aboard).total) } : null;
  const selected = selectedHeroId ? state.heroes[selectedHeroId] : undefined;
  const actions: ShipAction[] = [];
  let landing: LandingOption[] = [];
  if (aboard && aboard.ownerId === viewerId) {
    // The viewer's own hero aboard: go ashore on one of the shores beside the hull.
    const cells = landingCells(catalog, state, aboard.id);
    const probe = cells[0] ? quoteDisembark(catalog, state, aboard.id, cells[0]) : null;
    landing = probe?.legal ? cells.map((c) => ({ coord: c, label: `Land to the ${directionLabel(ship.coord, c)}`, command: { kind: 'DisembarkHero', heroId: aboard.id, landCoord: { q: c.q, r: c.r } } as CommandPayload })) : [];
    const reason = cells.length === 0 ? 'No free shore beside the ship to land on' : probe && !probe.legal ? probe.reason : null;
    actions.push({ id: 'disembark', label: 'Disembark', enabled: landing.length > 0, reason: landing.length > 0 ? null : (reason ?? 'Cannot land now'), detail: `Go ashore on a free tile beside the ship. ${probe?.remaining ? `Safe Landing preserves ${probe.remaining} movement points` : 'Uses all remaining movement'}; the empty ship stays here.` });
  } else if (!ship.heroId && selected && selected.ownerId === viewerId && !heroShip(state, selected.id)) {
    // An empty ship of the viewer's or neutral: the selected hero embarks from the adjacent shore.
    const q = quoteEmbark(catalog, state, selected.id, ship.shipId);
    const adjacent = axialDistance(selected.position, ship.coord) === 1;
    actions.push({
      id: 'embark',
      label: q.claims ? `Embark ${selected.name} (claims the ship)` : `Embark ${selected.name}`,
      enabled: q.legal,
      reason: q.legal ? null : q.reason,
      command: { kind: 'EmbarkHero', heroId: selected.id, shipId: ship.shipId },
      detail: q.keel ? `The keel costs ${q.minimum} movement and preserves ${q.remaining ?? 0} for sailing. Once per day.` : `Uses all remaining movement (at least ${q.minimum}).`,
    });
    if (!adjacent) {
      const t = quoteTravel(catalog, state, selected.id, ship.coord);
      actions.push({ id: 'route', label: 'Plan a route to this ship', enabled: t.reachable, reason: t.reachable ? null : (t.reason ?? 'No known route') });
    }
  } else if (ship.heroId && aboard && aboard.ownerId !== viewerId && selected && selected.ownerId === viewerId) {
    // A hostile crewed ship: boarded from the selected hero's own adjacent ship.
    const q = quoteAttackShip(catalog, state, selected.id, ship.shipId);
    actions.push({ id: 'attack', label: q.label ?? `Board ${aboard.name}'s ship`, enabled: q.legal, reason: q.legal ? null : q.reason, command: { kind: 'AttackShip', heroId: selected.id, targetShipId: ship.shipId }, detail: `A boarding battle on the two decks (${q.cost} movement).` });
    if (heroShip(state, selected.id) && axialDistance(selected.position, ship.coord) > 1) {
      const t = quoteTravel(catalog, state, selected.id, ship.coord);
      actions.push({ id: 'route', label: 'Plan a course to this ship', enabled: t.reachable, reason: t.reachable ? null : (t.reason ?? 'No known sea route') });
    }
  }
  return { shipId, ownerName, ownerColor: shipColor(state, ship), mine, hero, stateLabel: STATE_LABEL[ship.state], movement, actions, landing, coord: { q: ship.coord.q, r: ship.coord.r } };
}

/** The viewer's ships (sidebar list, keyboard selection), in stable ID order. */
export function myShips(state: MatchState, viewerId: string): ShipState[] {
  if (!navalOn(state)) return [];
  return shipList(state).filter((s) => s.ownerId === viewerId);
}

/** A ship's line in a list: who is aboard and where. */
export function shipListLabel(state: MatchState, ship: ShipState): string {
  const hero = ship.heroId ? state.heroes[ship.heroId] : undefined;
  return hero ? `${hero.name}'s ship` : 'Empty ship';
}

// ---------------------------------------------------------------------------
// The coastal launch service (CoastalLaunch)
// ---------------------------------------------------------------------------

export interface LaunchView {
  /** The service exists here: ships are on and the town touches water. */
  readonly offered: boolean;
  readonly legal: boolean;
  readonly reason: string | null;
  readonly cost: ResourceBundle;
  /** Free launch cells, labelled by direction (the first is the default). */
  readonly cells: readonly { readonly coord: HexCoord; readonly label: string }[];
  /** The command for the chosen cell (null when none is legal). */
  readonly command: CommandPayload | null;
}

/** The town's launch service for `playerId` with the chosen cell (null: the first free one), from `quoteLaunchShip`. */
export function launchView(catalog: ContentCatalog, state: MatchState, playerId: string, townId: string, chosen: HexCoord | null): LaunchView {
  const town = state.towns[townId];
  const offered = navalOn(state) && !!town && coastalWaterCells(state, townId).length > 0;
  const free = town ? freeLaunchCells(catalog, state, townId) : [];
  const cells = town ? free.map((c) => ({ coord: c, label: `Launch to the ${directionLabel(town.coord, c)}` })) : [];
  const target = chosen && free.some((c) => hexEquals(c, chosen)) ? chosen : (free[0] ?? null);
  const q = quoteLaunchShip(catalog, state, playerId, townId, target);
  return {
    offered,
    legal: q.legal && !!target,
    reason: q.legal ? null : q.reason,
    cost: q.cost,
    cells,
    command: q.legal && target ? { kind: 'LaunchShip', townId, waterCoord: { q: target.q, r: target.r } } : null,
  };
}

// ---------------------------------------------------------------------------
// Travel preview (quoteTravel: island destinations through embark / disembark steps)
// ---------------------------------------------------------------------------

/** The day each tile of a whole voyage is reached (today = 1), from the rules' `voyageDays` on each prefix. Null: not walkable. */
export function voyageStepDays(catalog: ContentCatalog, state: MatchState, heroId: string, plan: VoyagePlan): number[] | null {
  const out: number[] = [];
  for (let i = 0; i < plan.legs.length; i++) {
    const leg = plan.legs[i]!;
    const head = plan.legs.slice(0, i);
    if (i > 0) {
      const d = voyageDays(catalog, state, heroId, { ...plan, legs: [...head, { ...leg, path: [], stepCosts: [], cost: 0 }], transitions: plan.transitions.slice(0, i) });
      if (d === null) return null;
      out.push(d);
    }
    for (let j = 0; j < leg.path.length; j++) {
      const d = voyageDays(catalog, state, heroId, { ...plan, legs: [...head, { ...leg, path: leg.path.slice(0, j + 1), stepCosts: leg.stepCosts.slice(0, j + 1), cost: leg.stepCosts[j] ?? 0 }], transitions: plan.transitions.slice(0, i) });
      if (d === null) return null;
      out.push(d);
    }
  }
  return out;
}

export interface TravelRoute {
  readonly quote: MovementQuote;
  /** The route drawn on the map (null: nothing to draw). */
  readonly path: AdventurePathView | null;
  /** Embark / disembark steps on it. */
  readonly transitions: ShipMarksView['transitions'];
  /** The arrival day (today = 1) or null. */
  readonly days: number | null;
  /** The route ends at sea or crosses it (the destination ring marks where the ship goes). */
  readonly naval: boolean;
}

/** The whole route to `target` as MoveHero will follow it (`quoteTravel`), voyage legs and mode changes included. */
export function travelRoute(catalog: ContentCatalog, state: MatchState, heroId: string, target: HexCoord): TravelRoute {
  const q = quoteTravel(catalog, state, heroId, target);
  if (!q.reachable) return { quote: q, path: { steps: [], stopIndex: -1, encounter: false, blocked: true, destination: target }, transitions: [], days: null, naval: false };
  const plan = q.voyage ?? null;
  if (!plan) {
    if (q.path.length === 0) return { quote: q, path: null, transitions: [], days: null, naval: q.mode === 'sea' };
    const days = routeStepDays(catalog, state, heroId, q);
    return {
      quote: q,
      path: { steps: q.path, stopIndex: q.stopIndex, encounter: q.endsInEncounter, days, arrivalDay: days ? days[days.length - 1]! : null, destination: q.path[q.path.length - 1]! },
      transitions: [],
      days: q.reachesDestinationToday ? 1 : routeDays(catalog, state, heroId, q),
      naval: q.mode === 'sea',
    };
  }
  const steps: HexCoord[] = [];
  const transitions: { coord: HexCoord; kind: 'embark' | 'disembark' }[] = [];
  plan.legs.forEach((leg, i) => {
    if (i > 0) {
      const t = plan.transitions[i - 1]!;
      steps.push(leg.from);
      // The seal stands where the hero changes mode on land: the shore it embarks from, the shore it lands on
      // (a ship's own tile would hide it under the hull).
      transitions.push({ coord: t.kind === 'embark' ? t.shore : t.landCoord, kind: t.kind });
    }
    steps.push(...leg.path);
  });
  const stepDays = voyageStepDays(catalog, state, heroId, plan);
  let stopIndex = -1;
  if (stepDays) for (let k = 0; k < stepDays.length; k++) if (stepDays[k] === 1) stopIndex = k;
  const days = voyageDays(catalog, state, heroId, plan);
  return {
    quote: q,
    path: steps.length ? { steps, stopIndex, encounter: plan.endsInEncounter, days: stepDays, arrivalDay: days, destination: steps[steps.length - 1]! } : null,
    transitions,
    days,
    naval: true,
  };
}

/**
 * Today's reach (the map's highlight): the rules' `reachableTiles` (walking, or sailing while aboard),
 * plus the empty ships the selected hero can still embark today and the shores its ship can land on now.
 */
export function travelReach(catalog: ContentCatalog, state: MatchState, heroId: string): HexCoord[] {
  const base = reachableTiles(catalog, state, heroId);
  const out = [...base.keys()].map(parseHexKey);
  const hero = state.heroes[heroId];
  if (!hero || !navalOn(state)) return out;
  const seen = new Set(base.keys());
  if (heroShip(state, heroId)) {
    for (const c of landingCells(catalog, state, heroId)) {
      if (!seen.has(hexKey(c)) && quoteDisembark(catalog, state, heroId, c).legal) {
        seen.add(hexKey(c));
        out.push(c);
      }
    }
    return out;
  }
  for (const s of claimableShips(state, heroId)) {
    if (seen.has(hexKey(s.coord))) continue;
    const ok = AXIAL_DIRECTIONS.some((d) => {
      const shore = { q: s.coord.q + d.q, r: s.coord.r + d.r };
      if (hexEquals(shore, hero.position)) return quoteEmbark(catalog, state, heroId, s.shipId).legal;
      const cost = base.get(hexKey(shore));
      return cost !== undefined && hero.movementPoints - cost >= navalRules(catalog.rulesProfile).transitionMinimumMovement;
    });
    if (ok) {
      seen.add(hexKey(s.coord));
      out.push({ q: s.coord.q, r: s.coord.r });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// The explicit confirmation at a voyage's mode change
// ---------------------------------------------------------------------------

export interface TransitionPrompt {
  readonly kind: 'embark' | 'disembark';
  readonly title: string;
  readonly body: string;
  readonly confirmLabel: string;
  /** Legal now (the rules' quote); otherwise `reason` says why and nothing is offered. */
  readonly legal: boolean;
  readonly reason: string | null;
  readonly command: CommandPayload;
}

/** What the player confirms where a route reaches a ship or a shore (never sent without that confirmation). */
export function transitionPrompt(catalog: ContentCatalog, state: MatchState, heroId: string, t: VoyageTransition): TransitionPrompt {
  const hero = state.heroes[heroId];
  const name = hero?.name ?? 'The hero';
  const mp = hero?.movementPoints ?? 0;
  if (t.kind === 'embark') {
    const q = quoteEmbark(catalog, state, heroId, t.shipId);
    return {
      kind: 'embark',
      title: 'Embark on the ship? Uses all remaining movement.',
      body: `${name} boards the ship to the ${directionLabel(t.shore, t.shipCoord)}${q.claims ? ' and claims it for your empire' : ''}. Embarking uses all ${mp} remaining movement points; the voyage continues next turn.`,
      confirmLabel: 'Embark',
      legal: q.legal,
      reason: q.legal ? null : q.reason,
      command: { kind: 'EmbarkHero', heroId, shipId: t.shipId },
    };
  }
  const q = quoteDisembark(catalog, state, heroId, t.landCoord);
  return {
    kind: 'disembark',
    title: q.remaining ? 'Go ashore with Safe Landing?' : 'Go ashore? Uses all remaining movement.',
    body: `${name} lands to the ${directionLabel(t.water, t.landCoord)}, leaving the empty ship at anchor. ${q.remaining ? `Safe Landing preserves ${q.remaining} movement points; you can continue today.` : `Landing uses all ${mp} remaining movement points; the journey continues next turn.`}`,
    confirmLabel: 'Disembark',
    legal: q.legal,
    reason: q.legal ? null : q.reason,
    command: { kind: 'DisembarkHero', heroId, landCoord: { q: t.landCoord.q, r: t.landCoord.r } },
  };
}

/** Why a planned journey waits (session `JourneyIntent.reason`), in the player's words. */
export function journeyReasonText(reason: string | undefined): string | null {
  switch (reason) {
    case 'embark':
      return 'Waiting at the shore to embark — Continue to confirm';
    case 'disembark':
      return 'Waiting at the coast to go ashore — Continue to confirm';
    case 'no_ship':
      return 'The ship this journey waited for is gone';
    case 'no_route':
      return 'No route reaches the destination now';
    case 'interrupted':
      return 'Interrupted by a battle';
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Notices from committed events
// ---------------------------------------------------------------------------

/** Toast lines for the viewer from a batch of committed events (launches, boardings, wrecks). */
export function navalNotices(state: MatchState, events: readonly GameEvent[], viewerId: string, visible: ReadonlySet<number>): { text: string; tone: 'info' | 'success' | 'error' }[] {
  const out: { text: string; tone: 'info' | 'success' | 'error' }[] = [];
  const heroName = (id: string) => state.heroes[id]?.name ?? 'A hero';
  const seen = (c: HexCoord) => visible.has(cellIndex(state.world.map, c));
  for (const e of events) {
    if (e.kind === 'ShipLaunched' && e.playerId === viewerId) out.push({ text: `A ship is launched at ${state.towns[e.townId]?.name ?? 'the town'}: it waits on the water to the ${directionLabel(state.towns[e.townId]?.coord ?? e.coord, e.coord)}.`, tone: 'success' });
    else if (e.kind === 'BoardingResolved') {
      // The battle's own record names the sides (the loser's hull may already be gone).
      const r = state.lastBattleResult && state.lastBattleResult.battleId === e.battleId ? state.lastBattleResult : null;
      const won = r ? (r.winner === 'attacker' ? r.attacker : r.defender) : null;
      const mine = !!r && (r.attacker.playerId === viewerId || r.defender.playerId === viewerId);
      if (mine || seen(e.coord)) out.push({ text: `Boarding battle: ${won ? `${won.name} ${mine && won.playerId === viewerId ? '(you) ' : ''}holds the water` : `the ${e.winner === 'attacker' ? 'attackers' : 'defenders'} hold the water`}.`, tone: mine ? (won?.playerId === viewerId ? 'success' : 'error') : 'info' });
    } else if (e.kind === 'ShipWrecked' && (e.ownerId === viewerId || seen(e.coord))) out.push({ text: e.ownerId === viewerId ? 'Your ship was lost: its wreck sinks beneath the waves.' : `${e.ownerId ? (state.players[e.ownerId]?.name ?? 'An enemy') : 'A neutral'} ship is wrecked.`, tone: e.ownerId === viewerId ? 'error' : 'success' });
    else if (e.kind === 'ShipWithdrawn' && (state.heroes[e.heroId]?.ownerId === viewerId || seen(e.to))) out.push({ text: `${heroName(e.heroId)}'s ship withdraws to open water.`, tone: 'info' });
  }
  return out;
}

/** Map playback waiting for the adventure map (a boarding fought on the battlefield ends while the map is closed). */
export interface PendingNavalPlayback {
  readonly kind: 'wreck' | 'withdraw' | 'move';
  readonly shipId: string;
  readonly coord: HexCoord;
  readonly from?: HexCoord;
  readonly path?: readonly HexCoord[];
  readonly ownerColor: string | null;
  readonly ownerId: string | null;
  /** Wrecks: how the hull looked when its boarding began (heading and flag). */
  readonly facing?: number;
  readonly occupied?: boolean;
}

const pending = new Map<string, PendingNavalPlayback[]>();

/** Keep the map playback of a batch's naval aftermath (wrecks, withdrawals, the winner taking the hex) for the viewer. */
export function noteNavalPlayback(state: MatchState, events: readonly GameEvent[]): void {
  // A boarding begins: remember how both ships look (the loser's hull leaves the rules when it ends).
  for (const e of events) {
    if (e.kind !== 'BoardingStarted') continue;
    for (const id of [e.attackerShipId, e.defenderShipId]) {
      const s = state.world.ships?.[id];
      if (s) looks.set(`${state.matchId}|${id}`, { facing: s.facing, occupied: !!s.heroId });
    }
  }
  if (!events.some((e) => e.kind === 'BoardingResolved' || e.kind === 'ShipWrecked')) return;
  const list = pending.get(state.matchId) ?? [];
  for (const e of events) {
    if (e.kind === 'ShipWrecked') {
      const look = looks.get(`${state.matchId}|${e.shipId}`);
      list.push({ kind: 'wreck', shipId: e.shipId, coord: e.coord, ownerColor: e.ownerId ? (state.players[e.ownerId]?.color ?? null) : null, ownerId: e.ownerId, ...(look ? { facing: look.facing, occupied: look.occupied } : {}) });
      looks.delete(`${state.matchId}|${e.shipId}`);
    } else if (e.kind === 'ShipWithdrawn') list.push({ kind: 'withdraw', shipId: e.shipId, coord: e.to, from: e.from, ownerColor: null, ownerId: state.world.ships?.[e.shipId]?.ownerId ?? null });
    else if (e.kind === 'ShipMoved' && events.some((x) => x.kind === 'BoardingResolved')) {
      // The winner sails into the contested hex from the adjacent tile it boarded from (its new facing points there).
      const to = e.path[e.path.length - 1] ?? { q: 0, r: 0 };
      const d = AXIAL_DIRECTIONS[e.facing] ?? AXIAL_DIRECTIONS[0]!;
      list.push({ kind: 'move', shipId: e.shipId, coord: to, from: e.path.length > 1 ? e.path[e.path.length - 2] : { q: to.q - d.q, r: to.r - d.r }, path: e.path, ownerColor: null, ownerId: state.world.ships?.[e.shipId]?.ownerId ?? null });
    }
  }
  pending.set(state.matchId, list.slice(-12));
}

const looks = new Map<string, { facing: number; occupied: boolean }>();

/**
 * The store's step for every committed batch (`routeAfterUpdate`): notices for the viewing seat and
 * the boarding aftermath kept for the map. Reads the committed events only; never changes state.
 */
export function announceNavalEvents(
  store: { readonly catalog: ContentCatalog; readonly session: { readonly state: MatchState; readonly humanPlayerId: string } | null; toast(text: string, tone?: 'info' | 'success' | 'error'): void },
  events: readonly GameEvent[],
): void {
  const session = store.session;
  if (!session || !navalOn(session.state) || !events.some((e) => NAVAL_EVENTS.has(e.kind))) return;
  const state = session.state;
  noteNavalPlayback(state, events);
  if (state.players[session.humanPlayerId]?.controller !== 'human') return;
  for (const n of navalNotices(state, events, session.humanPlayerId, visibleCellsOf(store.catalog, state, session.humanPlayerId))) store.toast(n.text, n.tone);
}

const NAVAL_EVENTS = new Set(['ShipLaunched', 'BoardingStarted', 'BoardingResolved', 'ShipWrecked', 'ShipWithdrawn']);

/**
 * A boarding battle's board for the battle view (null on any other battle): the battle's own saved
 * cell letters (rules `BattleState.board`), the layout's measured projection and painting (presentation
 * data the rules never read) and each deck's live owner colour (the painting is shared by all pantheons).
 */
export function boardingBoardView(state: MatchState): BattleBoardView | null {
  const battle = state.battle;
  const board = battle?.board;
  if (!battle || !board) return null;
  const layout = BATTLEFIELD_LAYOUTS[board.layoutId];
  if (!layout) return null;
  if (board.sea || layout.sea) {
    // A sea encounter (one ship and open water): the delivered painting, its measured cell table and
    // the zone letters a figure may stand on (deck and water); one ship, so no deck colours.
    const sea = seaCreatureArt(layout.art.assetId);
    return {
      cells: board.cells,
      art: { url: sea?.url ?? null, width: sea?.width ?? layout.art.width, height: sea?.height ?? layout.art.height },
      projection: layout.projection,
      ...(layout.cellTable ? { cellTable: layout.cellTable } : {}),
      legalCodes: 'k.',
    };
  }
  const art = expeditionArt(layout.art.assetId);
  const color = (side: 'attacker' | 'defender') => {
    const pid = battle.sides[side].playerId;
    return (pid ? state.players[pid]?.color : null) ?? NEUTRAL_DECK;
  };
  return {
    cells: board.cells,
    art: { url: art?.url ?? null, width: art?.width ?? layout.art.width, height: art?.height ?? layout.art.height },
    projection: layout.projection,
    flags: { attacker: color('attacker'), defender: color('defender') },
  };
}

/** A deck without an empire (never on a boarding today; kept for safety): the neutral banner tone. */
const NEUTRAL_DECK = '#8a3b32';

/** Take (and forget) the map playback waiting for this match. */
export function takeNavalPlayback(matchId: string): PendingNavalPlayback[] {
  const list = pending.get(matchId) ?? [];
  pending.delete(matchId);
  return list;
}
