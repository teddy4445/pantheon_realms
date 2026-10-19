/**
 * Planned journeys (owner request 2026-10-14: "When a hero moves over a few days to a
 * location, keep the path so the user can continue without marking it again").
 *
 * A journey is a player's private INTENT for one hero — where it is going — not a rules
 * mutation: movement still happens only through validated MoveHero commands. Only the
 * destination is kept; the route is quoted again from the hero's current position, with
 * the current terrain, obstacles and movement points, whenever it is shown or followed.
 *
 * Journeys travel with the session (SaveSnapshot.presentation, version 1), scoped by
 * match, player and hero. Older saves have none and load with an empty set.
 */
import { hexEquals, movementTarget, quoteTravel, type ContentCatalog, type HexCoord, type MatchState } from '@pr/rules';

export const JOURNEYS_VERSION = 1;

/** planned: on its way; paused: interrupted (a battle or an event) and kept; blocked: no legal route right now (kept). */
export type JourneyStatus = 'planned' | 'paused' | 'blocked';

/**
 * Why a journey is paused or blocked (hero ships, navalMovementV1; absent on older saves and on a
 * planned journey): `interrupted` a battle or being carried elsewhere; `embark` / `disembark` the
 * route stands at a mode change the player confirms (Embark / Disembark — never automatic);
 * `no_ship` the ship it was waiting for is gone; `no_route` nothing reaches the destination now.
 */
export type JourneyReason = 'interrupted' | 'embark' | 'disembark' | 'no_ship' | 'no_route';
const JOURNEY_REASONS: readonly JourneyReason[] = ['interrupted', 'embark', 'disembark', 'no_ship', 'no_route'];

export interface JourneyIntent {
  readonly version: 1;
  readonly matchId: string;
  readonly playerId: string;
  readonly heroId: string;
  /** The tile the player chose (a town's own tile resolves to its gate through the rules). */
  readonly target: HexCoord;
  /** The site at the target when it was chosen, kept for its name and identity. */
  readonly targetSiteId?: string;
  readonly status: JourneyStatus;
  /** Why it is paused or blocked (see JourneyReason); absent when planned. */
  readonly reason?: JourneyReason;
}

/** Per player, per hero. */
export type JourneyBook = Readonly<Record<string, Readonly<Record<string, JourneyIntent>>>>;

export interface SessionPresentation {
  readonly version: 1;
  readonly journeys: JourneyBook;
}

export const EMPTY_PRESENTATION: SessionPresentation = { version: 1, journeys: {} };

const isCoord = (c: unknown): c is HexCoord => !!c && typeof c === 'object' && Number.isInteger((c as HexCoord).q) && Number.isInteger((c as HexCoord).r);

/**
 * Accept only well-formed journeys of this match, for heroes the player still commands.
 * Anything else (an older or newer version, another match, a lost hero) is dropped quietly.
 */
export function sanitizePresentation(raw: unknown, match: MatchState): SessionPresentation {
  const p = raw as Partial<SessionPresentation> | undefined;
  if (!p || p.version !== 1 || !p.journeys || typeof p.journeys !== 'object') return EMPTY_PRESENTATION;
  const out: Record<string, Record<string, JourneyIntent>> = {};
  for (const [playerId, byHero] of Object.entries(p.journeys)) {
    if (!match.players[playerId] || !byHero || typeof byHero !== 'object') continue;
    for (const [heroId, j] of Object.entries(byHero)) {
      if (!j || j.version !== 1 || j.matchId !== match.matchId || j.playerId !== playerId || j.heroId !== heroId || !isCoord(j.target)) continue;
      const hero = match.heroes[heroId];
      if (!hero || hero.ownerId !== playerId || hero.status !== 'active') continue;
      const status: JourneyStatus = j.status === 'paused' || j.status === 'blocked' ? j.status : 'planned';
      (out[playerId] ??= {})[heroId] = {
        version: 1,
        matchId: match.matchId,
        playerId,
        heroId,
        target: { q: j.target.q, r: j.target.r },
        ...(typeof j.targetSiteId === 'string' ? { targetSiteId: j.targetSiteId } : {}),
        status,
        ...(status !== 'planned' && JOURNEY_REASONS.includes(j.reason as JourneyReason) ? { reason: j.reason } : {}),
      };
    }
  }
  return { version: 1, journeys: out };
}

export function journeyOf(p: SessionPresentation, playerId: string, heroId: string): JourneyIntent | null {
  return p.journeys[playerId]?.[heroId] ?? null;
}

export function withJourney(p: SessionPresentation, j: JourneyIntent): SessionPresentation {
  return { version: 1, journeys: { ...p.journeys, [j.playerId]: { ...(p.journeys[j.playerId] ?? {}), [j.heroId]: j } } };
}

export function withoutJourney(p: SessionPresentation, playerId: string, heroId: string): SessionPresentation {
  const mine = p.journeys[playerId];
  if (!mine || !mine[heroId]) return p;
  const { [heroId]: _gone, ...rest } = mine;
  return { version: 1, journeys: { ...p.journeys, [playerId]: rest } };
}

/** The hero has arrived: it stands on the (resolved) destination. */
export function journeyArrived(catalog: ContentCatalog, state: MatchState, j: JourneyIntent): boolean {
  const hero = state.heroes[j.heroId];
  return !!hero && hexEquals(hero.position, movementTarget(catalog, state, j.target));
}

/**
 * Keep the journeys consistent with the state after a command (any player's): drop the
 * ones whose hero is gone, captured or arrived, or that belong to another match; mark the
 * ones without a legal route as blocked (kept — the destination is not forgotten), and a
 * blocked one with a route again as planned. `interrupted` heroes (a battle started) are
 * marked paused. Routes are the commit's own quote (`quoteTravel`), so a destination beyond
 * the water survives the days: a journey standing at an embark or landing step pauses with
 * that reason until the player confirms it, and plans on once the hero has changed mode. Pure.
 */
export function reconcileJourneys(
  catalog: ContentCatalog,
  state: MatchState,
  p: SessionPresentation,
  interrupted: ReadonlySet<string> = new Set(),
): SessionPresentation {
  let changed = false;
  const out: Record<string, Record<string, JourneyIntent>> = {};
  for (const [playerId, byHero] of Object.entries(p.journeys)) {
    for (const [heroId, j] of Object.entries(byHero)) {
      const hero = state.heroes[heroId];
      if (j.matchId !== state.matchId || !hero || hero.status !== 'active' || hero.ownerId !== playerId || journeyArrived(catalog, state, j)) {
        changed = true;
        continue;
      }
      let status = j.status;
      let reason: JourneyReason | undefined = j.reason;
      if (interrupted.has(heroId)) {
        status = 'paused';
        reason = 'interrupted';
      } else {
        const q = quoteTravel(catalog, state, heroId, j.target);
        if (!q.reachable) {
          status = 'blocked';
          // Waiting to embark and the ship is gone (taken, sunk): say so.
          reason = j.reason === 'embark' || j.reason === 'no_ship' ? 'no_ship' : 'no_route';
        } else if (q.transition && q.path.length === 0) {
          status = 'paused';
          reason = q.transition.kind;
        } else if (status === 'blocked' || (status === 'paused' && (reason === 'embark' || reason === 'disembark'))) {
          status = 'planned';
          reason = undefined;
        }
      }
      if (status === 'planned') reason = undefined;
      if (status !== j.status || reason !== j.reason) changed = true;
      if (status === j.status && reason === j.reason) (out[playerId] ??= {})[heroId] = j;
      else {
        const { reason: _old, ...rest } = j;
        (out[playerId] ??= {})[heroId] = { ...rest, status, ...(reason ? { reason } : {}) };
      }
    }
  }
  return changed ? { version: 1, journeys: out } : p;
}
