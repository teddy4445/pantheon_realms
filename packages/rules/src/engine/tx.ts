/**
 * Transaction context for one command.
 *
 * A Tx wraps a *draft* copy of MatchState. Systems validate first, then mutate
 * the draft and emit events. If anything throws a Rejection, the processor
 * discards the draft, so a failed command changes nothing.
 */
import type { PlayerId } from '../ids';
import { RngCursor } from '../core/rng';
import type { ContentCatalog } from '../definitions/catalog';
import type { RulesProfile } from '../definitions/rulesProfile';
import type { GameEventPayload } from '../events/events';
import type { MatchState } from '../state/match';

export type RejectionCode =
  | 'duplicate_command'
  | 'stale_revision'
  | 'match_over'
  | 'not_your_turn'
  | 'decision_pending'
  | 'battle_in_progress'
  | 'no_battle'
  | 'not_owner'
  | 'not_found'
  | 'not_in_scope'
  | 'planned_content'
  | 'missing_requirement'
  | 'insufficient_resources'
  | 'build_used_today'
  | 'already_built'
  | 'invalid_quantity'
  | 'no_population'
  | 'no_capacity'
  | 'not_present'
  | 'not_recruitable'
  | 'illegal_move'
  | 'insufficient_movement'
  | 'encounter_requires_confirmation'
  | 'illegal_target'
  | 'illegal_action'
  | 'not_active_stack'
  | 'already_done'
  | 'invalid_command'
  /** Automation tried to act for a human side of a campaign battle (fought by hand only). */
  | 'manual_battle_required'
  /** A planned mixed land/sea route stands at an embark or disembark step: confirm it with EmbarkHero / DisembarkHero. */
  | 'transition_required';

export interface Rejection {
  readonly code: RejectionCode;
  readonly message: string;
}

export class RejectionError extends Error {
  constructor(readonly rejection: Rejection) {
    super(rejection.message);
    this.name = 'RejectionError';
  }
}

export function reject(code: RejectionCode, message: string): never {
  throw new RejectionError({ code, message });
}

export interface RulesContext {
  readonly catalog: ContentCatalog;
}

export type RngStreamName = keyof MatchState['rng'];

export class Tx {
  readonly events: GameEventPayload[] = [];
  private readonly cursors = new Map<RngStreamName, RngCursor>();

  constructor(
    readonly ctx: RulesContext,
    readonly state: MatchState,
    readonly actorId: PlayerId,
  ) {}

  get catalog(): ContentCatalog {
    return this.ctx.catalog;
  }

  get profile(): RulesProfile {
    return this.ctx.catalog.rulesProfile;
  }

  emit(event: GameEventPayload): void {
    this.events.push(event);
  }

  /** Gameplay RNG stream cursor; its state is written back on finalize. */
  rng(stream: RngStreamName): RngCursor {
    let cursor = this.cursors.get(stream);
    if (!cursor) {
      cursor = new RngCursor(this.state.rng[stream]);
      this.cursors.set(stream, cursor);
    }
    return cursor;
  }

  /** Allocate a stable, deterministic identifier. */
  nextId(prefix: string): string {
    this.state.serial += 1;
    return `${prefix}_${this.state.serial}`;
  }

  /** Returns true the first time a key is applied; false if already applied. */
  applyOnce(key: string): boolean {
    if (this.state.appliedKeys.includes(key)) return false;
    this.state.appliedKeys.push(key);
    return true;
  }

  finalize(): void {
    for (const [stream, cursor] of this.cursors) this.state.rng[stream] = cursor.state;
  }
}
