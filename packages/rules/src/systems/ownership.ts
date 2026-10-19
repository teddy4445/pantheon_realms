/**
 * Town ownership changes (2026-10-07): one place records who lost which town
 * (public information the computer players use to counterattack, and the rival
 * turn summary reports), whether it was taken by siege or walked into.
 *
 * Every change of a town's owner goes through `changeTownOwner` — captures,
 * liberations, a loss to a neutral or scripted owner — so the city dedication
 * clearing hook (`clearTownDedication`, app 1.5.0) runs for all of them. A future
 * ownership path (e.g. a story script) must call `changeTownOwner`, never assign
 * `town.ownerId` directly.
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
  clearTownDedication(tx, town);
}

/**
 * City dedications (handoff §03): an ownership change clears the town's honored god, its
 * pending switch (its fee is not refunded) and every growth credit — the new owner inherits
 * no gift or service and may make a fresh dedication; a recapture restores nothing. The
 * town's `lastProcessedWeek` stamp is kept, so no week is ever paid twice. Pays nothing.
 */
export function clearTownDedication(tx: Tx, town: TownState): void {
  const rec = town.dedication;
  if (!rec) return;
  const had = rec.activeGodId !== null || rec.pending !== undefined || Object.values(rec.growthCredits).some((v) => v > 0);
  town.dedication = { activeGodId: null, ownerId: null, growthCredits: {}, lastProcessedWeek: rec.lastProcessedWeek };
  if (had) {
    tx.emit({
      kind: 'TownDedicationCleared',
      townId: town.id,
      playerId: rec.ownerId ?? rec.pending?.requestedBy ?? null,
      godId: rec.activeGodId,
      pendingGodId: rec.pending?.godId ?? null,
      reason: 'owner_changed',
    });
  }
}
