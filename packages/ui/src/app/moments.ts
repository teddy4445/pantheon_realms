/**
 * Big moments (GPT6_BRIEF_3): the painted miracle card when a divine
 * intervention is invoked and the painted banner at the dawn of a new week.
 * Presentation only — built from events the rules already committed, so a
 * moment never applies or repeats an effect, and nothing is shown again on
 * load, restart or a later re-render (loads and match starts publish no
 * moments; each committed update is presented once).
 */
import { interventionOf, type ContentCatalog, type GameEvent, type MatchState } from '@pr/rules';
import { miracleCardArt, newWeekBannerArt } from '../assets/momentArt';
import type { Preferences } from './preferences';

export interface MiracleMoment {
  readonly kind: 'miracle';
  readonly interventionId: string;
  readonly context: 'adventure' | 'battle';
  readonly name: string;
  readonly summary: string;
  /** Another player's miracle in the viewer's battle: that player's name (null: the viewer's own). */
  readonly invokedBy: string | null;
}

export interface NewWeekMoment {
  readonly kind: 'new-week';
  readonly week: number;
  readonly eventId: string | null;
  readonly title: string;
  readonly effect: string;
}

export type MomentDraft = MiracleMoment | NewWeekMoment;
export type Moment = MomentDraft & { readonly key: string };

/**
 * The weekly event drawn at this dawn (null: none drawn, e.g. The Three
 * Beacons). Read from the committed state: the published WeeklyEventStarted
 * event's own `eventId` field is overwritten by the event envelope's ID
 * (processor.ts), so it does not carry the weekly event's ID.
 */
export function weeklyEventOf(state: MatchState, events: readonly GameEvent[], week: number): string | null {
  const drawn = events.some((x) => x.kind === 'WeeklyEventStarted' && x.week === week);
  return drawn ? (state.world.weeklyEventId ?? null) : null;
}

/** Is the viewer one of the sides of the battle in progress (or of the one this update ended)? */
function inBattle(state: MatchState, viewerId: string): boolean {
  if (state.battle) return Object.values(state.battle.sides).some((s) => s.playerId === viewerId);
  const r = state.lastBattleResult;
  return !!r && (r.attacker.playerId === viewerId || r.defender.playerId === viewerId);
}

/**
 * The moments to show for one committed update, seen by `viewerId`:
 * - a miracle card for each intervention the viewer invoked, and for an
 *   opponent's battle miracle in the viewer's own battle (map miracles of other
 *   empires stay hidden, as before);
 * - one new-week banner when a new week dawns (day 8, 15, …): the weekly
 *   event's own banner if it has one, else the default one.
 * Moments without delivered art are left out (the game keeps its earlier
 * feedback: the toast for miracles, the text day banner for weeks).
 */
export function momentsFromEvents(catalog: ContentCatalog, state: MatchState, viewerId: string, events: readonly GameEvent[]): MomentDraft[] {
  const out: MomentDraft[] = [];
  for (const e of events) {
    if (e.kind === 'InterventionInvoked') {
      // Named as the invoking empire's pantheon calls it (owner request 2026-10-07).
      const def = interventionOf(catalog, state, e.playerId, e.interventionId);
      if (!def || !miracleCardArt(def.id)) continue;
      const own = e.playerId === viewerId;
      if (!own && !(def.context === 'battle' && inBattle(state, viewerId))) continue;
      out.push({ kind: 'miracle', interventionId: def.id, context: def.context, name: def.name, summary: def.summary, invokedBy: own ? null : (state.players[e.playerId]?.name ?? 'The enemy') });
    } else if (e.kind === 'DayStarted' && e.dayOfWeek === 1 && e.day > 1) {
      const eventId = weeklyEventOf(state, events, e.week);
      if (!newWeekBannerArt(eventId)) continue;
      const def = eventId ? catalog.weeklyEvents?.[eventId] : undefined;
      out.push({ kind: 'new-week', week: e.week, eventId: def ? def.id : null, title: def?.name ?? 'A new week', effect: def?.summary ?? 'Creatures grow in their dwellings.' });
    }
  }
  return out;
}

/**
 * How long a moment stays before it fades (it can always be dismissed at once
 * with a click or Esc). The base times are the game's existing banner times
 * (the day banner: 2.2 s, 3.6 s with a weekly event); the playback speed the
 * player chose for that context shortens or lengthens them. The moment layer
 * counts this as time on screen (frames drawn). Reduced motion removes the
 * rise and fade (CSS motion tokens), not the reading time.
 */
export function momentHoldMs(prefs: Preferences, m: MomentDraft): number {
  const base = m.kind === 'new-week' && !m.eventId ? 2200 : 3600;
  let factor = 1;
  if (m.kind === 'miracle' && m.context === 'battle') {
    factor = ({ '0.5': 1.4, '1': 1, '1.5': 0.8, '2': 0.65, instant: 0.45 } as const)[prefs.battleSpeed] ?? 1;
  } else {
    factor = ({ normal: 1, fast: 0.65, instant: 0.45 } as const)[prefs.adventureAnimation] ?? 1;
  }
  return Math.round(base * factor);
}

/**
 * Did the viewer win the finished match? Skirmish outcomes name their winners;
 * campaign outcomes are the player's victory or defeat. Null while running.
 */
export function viewerWon(state: MatchState, viewerId: string): boolean | null {
  const o = state.outcome;
  if (o.status === 'running') return null;
  return o.winnerIds?.length ? o.winnerIds.includes(viewerId) : o.status === 'victory';
}
