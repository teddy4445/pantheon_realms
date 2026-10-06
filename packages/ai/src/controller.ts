/**
 * AIPlayerController: drives AI turns and AI-controlled battle sides through the
 * NORMAL CommandProcessor. The AI never mutates state directly.
 *
 * `runAITurn` is synchronous and budgeted so automated tests are deterministic.
 * The application wraps it in a scheduler (and may move planning into a worker)
 * without changing the command interface.
 */
import {
  NEUTRAL_PLAYER_ID,
  processCommand,
  withSharedPaths,
  type CommandPayload,
  type ContentCatalog,
  type GameCommand,
  type GameEvent,
  type MatchState,
  type PlayerId,
  type RulesContext,
  type BattleSideId,
} from '@pr/rules';
import { buildObservation } from './observation';
import { strategicCandidates } from './strategic';
import { chooseBattleAction } from './tactical';

export interface AIStepResult {
  readonly state: MatchState;
  readonly events: readonly GameEvent[];
  readonly command: GameCommand | null;
}

/** Deterministic AI command identity: unique per (match, revision, attempt). */
export function aiCommandId(prefix: string, state: MatchState, attempt: number): string {
  return `${prefix}:${state.matchId}:${state.revision}:${attempt}`;
}

const attempts = new WeakMap<MatchState, number>();
function submit(ctx: RulesContext, state: MatchState, actor: PlayerId, payload: CommandPayload, prefix: string) {
  const n = (attempts.get(state) ?? 0) + 1;
  attempts.set(state, n);
  const command = { ...payload, commandId: aiCommandId(prefix, state, n), expectedRevision: state.revision, actorPlayerId: actor } as GameCommand;
  return { command, result: processCommand(ctx, state, command) };
}

/** The player who must act for the active battle stack (NEUTRAL for ownerless guards). */
/** The side that must act now: the defender choosing stacks, a side deploying, or the active stack's side. */
export function battleActingSide(state: MatchState): BattleSideId | null {
  const battle = state.battle;
  if (!battle || battle.status !== 'active') return null;
  if (battle.phase === 'selection') return 'defender';
  if (battle.phase === 'deployment') return battle.deployment?.pending[0] ?? null;
  if (!battle.activeStackId) return null;
  return battle.stacks[battle.activeStackId]?.side ?? null;
}

/** The player who must act in the battle now (NEUTRAL for ownerless guards). */
export function battleActor(state: MatchState): PlayerId | null {
  const side = battleActingSide(state);
  if (!side || !state.battle) return null;
  return state.battle.sides[side].playerId ?? NEUTRAL_PLAYER_ID;
}

export function isAiControlledBattleTurn(state: MatchState): boolean {
  const side = battleActingSide(state);
  return !!side && !!state.battle && state.battle.sides[side].controller === 'ai';
}

/** One tactical AI action for the active stack (used for AI sides and player auto-combat). */
export function stepBattleAI(catalog: ContentCatalog, state: MatchState): AIStepResult {
  const ctx = { catalog };
  const actor = battleActor(state);
  const payload = chooseBattleAction(catalog, state);
  if (!actor || !payload) return { state, events: [], command: null };
  const first = submit(ctx, state, actor, payload, 'ai-battle');
  if (first.result.ok) return { state: first.result.state, events: first.result.events, command: first.command };
  // Fallback: a legal Defend always exists for the active stack.
  const stackId = state.battle!.activeStackId;
  if (!stackId) throw new Error(`Tactical AI could not act: ${first.result.rejection.message}`);
  const fb = submit(ctx, state, actor, { kind: 'BattleDefend', stackId }, 'ai-battle');
  if (fb.result.ok) return { state: fb.result.state, events: fb.result.events, command: fb.command };
  throw new Error(`Tactical AI could not act: ${first.result.rejection.message}`);
}

/**
 * One strategic AI command for the active AI player. Returns the command that was
 * accepted (EndTurn when nothing else is legal).
 */
export function stepStrategicAI(catalog: ContentCatalog, state: MatchState, tried: Set<string>): AIStepResult {
  const ctx = { catalog };
  const playerId = state.activePlayerId;
  const obs = buildObservation(catalog, state, playerId);
  // One route search per hero for all the destinations it weighs (identical routes; the
  // observation is not changed while the candidates are built).
  const candidates = withSharedPaths(() => strategicCandidates(catalog, obs));
  for (const payload of candidates) {
    const key = JSON.stringify(payload);
    if (payload.kind !== 'EndTurn' && tried.has(key)) continue;
    tried.add(key);
    const { command, result } = submit(ctx, state, playerId, payload, 'ai');
    if (result.ok) return { state: result.state, events: result.events, command };
  }
  const { command, result } = submit(ctx, state, playerId, { kind: 'EndTurn' }, 'ai');
  if (result.ok) return { state: result.state, events: result.events, command };
  throw new Error(`AI could not end its turn: ${result.rejection.message}`);
}

export interface AITurnOptions {
  readonly maxCommands?: number;
  /** Resolve battles started during the AI turn with the tactical AI for AI sides; human sides stop the loop. */
  readonly onEvents?: (events: readonly GameEvent[]) => void;
}

/**
 * Run the active AI player's full turn (and any AI-only battles it starts).
 * Stops when a human must act (their turn, or a battle turn for a human side).
 */
export function runAITurn(catalog: ContentCatalog, initial: MatchState, opts: AITurnOptions = {}): MatchState {
  let state = initial;
  const max = opts.maxCommands ?? 400;
  const tried = new Set<string>();
  const turnOwner = state.activePlayerId;
  for (let i = 0; i < max; i++) {
    if (state.outcome.status !== 'running') return state;
    if (state.battle) {
      if (!isAiControlledBattleTurn(state)) return state;
      const r = stepBattleAI(catalog, state);
      opts.onEvents?.(r.events);
      state = r.state;
      continue;
    }
    const active = state.players[state.activePlayerId];
    if (!active || active.controller !== 'ai' || state.activePlayerId !== turnOwner) return state;
    const r = stepStrategicAI(catalog, state, tried);
    opts.onEvents?.(r.events);
    state = r.state;
    if (r.command?.kind === 'EndTurn') return state;
  }
  // Budget exhausted: end the turn legally.
  if (!state.battle && state.players[state.activePlayerId]?.controller === 'ai') {
    const { result } = submit({ catalog }, state, state.activePlayerId, { kind: 'EndTurn' }, 'ai');
    if (result.ok) return result.state;
  }
  return state;
}
