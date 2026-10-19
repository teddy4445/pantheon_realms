import { RESOURCE_KEYS, resources } from '../core/resources';
import type { MatchState } from '../state/match';
import type { Tx } from '../engine/tx';
import { reject } from '../engine/tx';
export function allied(state: Pick<MatchState, 'coalition'>, a: string | null | undefined, b: string | null | undefined): boolean {
  return !!a && !!b && (a === b || !!state.coalition?.playerIds.includes(a) && state.coalition.playerIds.includes(b));
}
/** Native seats retain gods, towns, quests and ownership. Only the displayed budget is mirrored. */
export function establishCoalition(state: MatchState, ids: readonly string[]): void {
  if (ids.length < 2 || new Set(ids).size !== ids.length || ids.some((id) => state.players[id]?.controller !== 'human')) throw new Error('A coalition needs distinct human seats');
  const treasury = { ...resources() };
  for (const id of ids) for (const key of RESOURCE_KEYS) treasury[key] += state.players[id]!.wallet[key];
  state.coalition = { playerIds: [...ids], treasury };
  for (const id of ids) state.players[id]!.wallet = { ...treasury };
  shareCoalitionFog(state);
}
/** Reconcile every committed wallet delta, including legacy reward paths, once per transaction. */
export function settleCoalition(before: MatchState, state: MatchState): void {
  const c = state.coalition; if (!c) return;
  for (const key of RESOURCE_KEYS) {
    let delta = 0;
    for (const id of c.playerIds) delta += state.players[id]!.wallet[key] - before.players[id]!.wallet[key];
    c.treasury = { ...c.treasury, [key]: c.treasury[key] + delta };
    if (c.treasury[key] < 0) reject('insufficient_resources', 'The coalition treasury cannot cover this action');
  }
  for (const id of c.playerIds) state.players[id]!.wallet = { ...c.treasury };
  shareCoalitionFog(state);
}
export function shareCoalitionFog(state: MatchState): void {
  const ids = state.coalition?.playerIds; if (!ids) return;
  const explored = new Array(state.world.map.width * state.world.map.height).fill(0);
  for (const id of ids) state.fog[id]?.explored.forEach((v, i) => { if (v) explored[i] = 1; });
  for (const id of ids) if (state.fog[id]) state.fog[id]!.explored = [...explored];
}
export function commitSelectCoalitionSeat(tx: Tx, id: string): void {
  if (!tx.state.coalition?.playerIds.includes(tx.actorId) || !allied(tx.state, id, tx.actorId) || tx.state.players[id]?.eliminated) reject('not_owner', 'Choose an active member of your coalition');
  tx.state.activePlayerId = id;
}
