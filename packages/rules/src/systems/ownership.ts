/**
 * Town ownership changes (2026-10-07): one place records who lost which town
 * (public information the computer players use to counterattack, and the rival
 * turn summary reports), whether it was taken by siege or walked into.
 */
import type { PlayerId } from '../ids';
import type { TownState } from '../state/match';
import type { Tx } from '../engine/tx';

export function changeTownOwner(tx: Tx, town: TownState, newOwnerId: PlayerId): void {
  const from = town.ownerId;
  if (from === newOwnerId) return;
  town.ownerId = newOwnerId;
  const site = tx.state.world.sites[town.siteId];
  if (site) site.owner = newOwnerId;
  const loser = from ? tx.state.players[from] : undefined;
  if (loser) loser.lostTowns = [...(loser.lostTowns ?? []).filter((x) => x.townId !== town.id), { townId: town.id, day: tx.state.day }];
  const winner = tx.state.players[newOwnerId];
  if (winner?.lostTowns?.some((x) => x.townId === town.id)) winner.lostTowns = winner.lostTowns.filter((x) => x.townId !== town.id);
  tx.emit({ kind: 'TownCaptured', townId: town.id, playerId: newOwnerId, fromPlayerId: from });
}
