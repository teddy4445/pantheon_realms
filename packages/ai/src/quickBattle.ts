/**
 * Quick battles (owner request 2026-10-07): an encounter resolved without the
 * battlefield. The tactical AI commands both sides — exactly the auto-combat a
 * player can switch on in battle — through the normal command processor.
 *
 * The encounter panel runs this on the current state to show the expected
 * result; the session runs the same function on the same state when the player
 * confirms. The rules are deterministic (seeded RNG streams travel in the
 * state, command identities are derived from the state), so the preview is the
 * result the player gets, not an estimate.
 */
import { processCommand, type BattleCasualtyLine, type BattleResultRecord, type CommandPayload, type ContentCatalog, type GameCommand, type GameEvent, type MatchState, type PlayerId } from '@pr/rules';
import { battleActor, stepBattleAI } from './controller';

export type QuickBattleRun =
  | { readonly ok: true; readonly state: MatchState; readonly events: readonly GameEvent[]; readonly result: BattleResultRecord; readonly steps: number }
  | { readonly ok: false; readonly reason: string };

/** Command identity of the move that starts a quick battle (stable for a given state). */
export function quickBattleCommandId(state: MatchState): string {
  return `quick:${state.matchId}:${state.revision}`;
}

/**
 * Submit `payload` (a MoveHero that confirms the encounter) for `actor` and fight
 * the battle it starts to the end with the tactical AI on both sides. Refuses
 * when no battle starts, or when another human seat commands the other side
 * (hot-seat: that player fights their own battle).
 */
export function runQuickBattle(catalog: ContentCatalog, state: MatchState, actor: PlayerId, payload: CommandPayload, maxSteps = 4000): QuickBattleRun {
  if (state.battle) return { ok: false, reason: 'A battle is already in progress' };
  const command = { ...payload, commandId: quickBattleCommandId(state), expectedRevision: state.revision, actorPlayerId: actor } as GameCommand;
  const first = processCommand({ catalog }, state, command);
  if (!first.ok) return { ok: false, reason: first.rejection.message };
  if (!first.events.some((e) => e.kind === 'BattleStarted') || !first.state.battle) return { ok: false, reason: 'No battle takes place there' };
  const sides = Object.values(first.state.battle.sides);
  if (sides.some((side) => side.controller === 'human' && side.playerId !== actor)) {
    return { ok: false, reason: 'Another player commands the other army: fight this battle on the battlefield' };
  }
  let s = first.state;
  const events: GameEvent[] = [...first.events];
  let steps = 0;
  for (; steps < maxSteps && s.battle; steps++) {
    if (!battleActor(s)) break;
    const r = stepBattleAI(catalog, s);
    if (r.state === s) break;
    s = r.state;
    events.push(...r.events);
  }
  if (s.battle || !s.lastBattleResult) return { ok: false, reason: 'This battle cannot be resolved quickly' };
  return { ok: true, state: s, events, result: s.lastBattleResult, steps };
}

export interface QuickBattleLoss {
  readonly creatureId: string;
  readonly before: number;
  readonly lost: number;
}

export interface QuickBattleSummary {
  readonly won: boolean;
  readonly outcome: BattleResultRecord['outcome'];
  readonly rounds: number;
  /** The player's losses, largest first (creatures returned by recovery are not lost). */
  readonly losses: readonly QuickBattleLoss[];
  readonly lostCreatures: number;
  readonly armyBefore: number;
  readonly foeLosses: readonly QuickBattleLoss[];
  readonly foeWiped: boolean;
  readonly xp: number;
}

function lossesOf(lines: readonly BattleCasualtyLine[]): QuickBattleLoss[] {
  return lines
    .map((l) => ({ creatureId: l.creatureId, before: l.before, lost: Math.max(0, l.before - l.after) }))
    .filter((l) => l.lost > 0)
    .sort((a, b) => b.lost - a.lost || (a.creatureId < b.creatureId ? -1 : 1));
}

/** The result seen from `playerId`'s side. */
export function summarizeQuickBattle(result: BattleResultRecord, playerId: PlayerId, after?: MatchState): QuickBattleSummary {
  const mine = result.attacker.playerId === playerId ? 'attacker' : result.defender.playerId === playerId ? 'defender' : (result.playerSide ?? 'attacker');
  const own = result[mine];
  const foe = result[mine === 'attacker' ? 'defender' : 'attacker'];
  const losses = lossesOf(own.lines);
  const foeLosses = lossesOf(foe.lines);
  return {
    won: result.winner === mine,
    outcome: result.outcome,
    rounds: result.rounds,
    losses,
    lostCreatures: losses.reduce((n, l) => n + l.lost, 0),
    armyBefore: own.lines.reduce((n, l) => n + l.before, 0),
    foeLosses,
    foeWiped: foe.lines.every((l) => l.after === 0),
    xp: result.xpAwarded.filter((x) => !after || after.heroes[x.heroId]?.ownerId === playerId).reduce((n, x) => n + x.amount, 0),
  };
}
