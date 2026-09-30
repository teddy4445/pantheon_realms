/**
 * PantheonSystem: player-wide god commitments and town-bound covenant assignment.
 *
 * Gods are data. A commitment is irreversible in this profile, costs its Favor
 * once, and its benefits flow through the shared modifier resolver.
 */
import type { EntitlementId, GodId, PlayerId, TownId } from '../ids';
import { resources } from '../core/resources';
import { getEntitlement, getGod, type ContentCatalog } from '../definitions/catalog';
import type { MatchState } from '../state/match';
import { evaluateAll, missingRequirements } from '../resolvers/requirements';
import { playerTowns } from '../resolvers/town';
import { reject, type Tx } from '../engine/tx';
import { spend } from './economy';

export type GodSelectionState = 'selected' | 'available' | 'locked' | 'excluded' | 'undesigned' | 'unaffordable';

export interface GodQuote {
  readonly godId: GodId;
  readonly state: GodSelectionState;
  readonly legal: boolean;
  readonly reason: string | null;
  readonly missing: string[];
}

export function quoteGodSelection(catalog: ContentCatalog, state: MatchState, playerId: PlayerId, godId: GodId): GodQuote {
  const god = catalog.gods[godId];
  const player = state.players[playerId];
  const out = (st: GodSelectionState, reason: string | null, missing: string[] = []): GodQuote => ({
    godId,
    state: st,
    legal: st === 'available',
    reason,
    missing,
  });
  if (!god || !player) return out('locked', 'Unknown god');
  if (player.pantheon.patronGodId === godId || player.pantheon.minorGodIds.includes(godId)) return out('selected', 'Already committed');
  if (god.pantheonId !== player.pantheonId) return out('locked', 'Belongs to another pantheon');
  if (god.implementationStatus !== 'implemented' || god.role === 'undesigned') {
    return out('undesigned', 'Blessing not yet designed for this build');
  }
  if (god.role === 'patron') return out('locked', 'Patrons are chosen when the scenario starts');
  const allow = state.scenario.committableGodIds;
  if (allow && !allow.includes(godId)) return out('locked', 'Not available in this mission');
  if (god.exclusivityGroup) {
    const other = player.pantheon.minorGodIds.find((g) => catalog.gods[g]?.exclusivityGroup === god.exclusivityGroup);
    if (other) return out('excluded', `Excluded by your commitment to ${getGod(catalog, other).name}`);
  }
  // Requirements are evaluated against any owned town (e.g. "Temple II in an owned town").
  const towns = playerTowns(state, playerId);
  let bestMissing: string[] | null = null;
  for (const t of towns) {
    const res = evaluateAll(catalog, state, god.requirements, { playerId, townId: t.id });
    if (res.ok) {
      bestMissing = [];
      break;
    }
    const m = missingRequirements(catalog, state, god.requirements, { playerId, townId: t.id });
    if (!bestMissing || m.length < bestMissing.length) bestMissing = m;
  }
  if (towns.length === 0 && god.requirements.length > 0) bestMissing = ['Requires an owned town'];
  if (bestMissing && bestMissing.length > 0) return out('locked', bestMissing[0] ?? 'Locked', bestMissing);
  if (player.wallet.favor < god.favorCost) return out('unaffordable', `Requires ${god.favorCost} Favor`);
  return out('available', null);
}

export function commitSelectGod(tx: Tx, godId: GodId): void {
  const q = quoteGodSelection(tx.catalog, tx.state, tx.actorId, godId);
  if (!q.legal) reject(q.state === 'unaffordable' ? 'insufficient_resources' : 'missing_requirement', q.reason ?? 'Unavailable');
  const god = getGod(tx.catalog, godId);
  spend(tx, tx.actorId, resources({ favor: god.favorCost }), `Commitment to ${god.name}`);
  tx.state.players[tx.actorId]!.pantheon.minorGodIds.push(godId);
  tx.emit({ kind: 'GodSelected', playerId: tx.actorId, godId });
}

export function grantEntitlement(tx: Tx, playerId: PlayerId, entitlementId: EntitlementId): void {
  const player = tx.state.players[playerId];
  if (!player) return;
  if (!tx.applyOnce(`entitlement:${playerId}:${entitlementId}`)) return;
  const def = getEntitlement(tx.catalog, entitlementId);
  player.entitlements.push({ entitlementId, familyId: def.familyId, assignedTownId: null });
  tx.emit({ kind: 'EntitlementGranted', playerId, entitlementId });
}

export function quoteCovenantAssignment(catalog: ContentCatalog, state: MatchState, playerId: PlayerId, townId: TownId, entitlementId: EntitlementId) {
  const player = state.players[playerId];
  const town = state.towns[townId];
  const ent = player?.entitlements.find((e) => e.entitlementId === entitlementId);
  if (!player || !town) return { legal: false, reason: 'Unknown town' };
  if (!ent) return { legal: false, reason: 'You do not hold that covenant' };
  if (ent.assignedTownId) return { legal: false, reason: 'Already assigned' };
  if (town.ownerId !== playerId) return { legal: false, reason: 'You do not own this town' };
  const fam = catalog.families[ent.familyId];
  if (!fam) return { legal: false, reason: 'Unknown family' };
  if (fam.pantheonId !== town.pantheonId) return { legal: false, reason: 'This covenant belongs to another pantheon' };
  if (town.covenants.includes(ent.familyId)) return { legal: false, reason: `${town.name} already holds this covenant` };
  return { legal: true, reason: null };
}

export function commitAssignCovenant(tx: Tx, townId: TownId, entitlementId: EntitlementId): void {
  const q = quoteCovenantAssignment(tx.catalog, tx.state, tx.actorId, townId, entitlementId);
  if (!q.legal) reject('illegal_action', q.reason ?? 'Cannot assign');
  const player = tx.state.players[tx.actorId]!;
  const ent = player.entitlements.find((e) => e.entitlementId === entitlementId)!;
  ent.assignedTownId = townId;
  tx.state.towns[townId]!.covenants.push(ent.familyId);
  tx.emit({ kind: 'CovenantAssigned', townId, familyId: ent.familyId });
}
