import { axialNeighbors, hexKey } from '../core/hex';
import type { ContentCatalog } from '../definitions/catalog';
import type { ArtifactInstanceState, HeroState, MatchState, PlayerState } from '../state/match';
import { heroOccupancy, heroInTown, inMap, cellIndex, terrainAt, tileRole } from '../resolvers/world';
import { navalEnabled, shipOccupancy, seaTileRole } from '../resolvers/naval';
import { seaSiteBlockedCells } from '../resolvers/seaSites';
import { seaEncounterTiles } from '../resolvers/seaEncounter';
import { reject, type Tx } from '../engine/tx';

export interface CourierChoice { recipientHeroId?: string; artifactInstanceId?: string }
function ownedTown(catalog: ContentCatalog, state: MatchState, hero: HeroState) {
  return Object.values(state.towns).find((t) => t.ownerId === hero.ownerId && heroInTown(catalog, state, hero, t.id));
}
/** Arcane parcel route: explored, traversable land/water only; no walls, guards or occupied straits. */
function connected(catalog: ContentCatalog, state: MatchState, sender: HeroState, recipient: HeroState): boolean {
  const heroes = heroOccupancy(state, sender.id); heroes.delete(hexKey(recipient.position));
  const ships = shipOccupancy(state), wrecks = seaSiteBlockedCells(catalog, state), foes = seaEncounterTiles(catalog, state);
  const start = hexKey(sender.position), goal = hexKey(recipient.position), seen = new Set([start]), queue = [sender.position];
  for (let i = 0; i < queue.length; i++) {
    const c = queue[i]!;
    if (hexKey(c) === goal) return true;
    for (const n of axialNeighbors(c)) {
      const key = hexKey(n);
      if (seen.has(key) || !inMap(state.world.map, n) || state.fog[sender.ownerId]?.explored[cellIndex(state.world.map, n)] !== 1) continue;
      const water = terrainAt(state.world.map, n) === 'water';
      if (water) {
        if (!navalEnabled(state) || seaTileRole(state, sender.ownerId, n, sender.id, ships, heroes, wrecks, foes) !== 'open') continue;
      } else {
        const role = tileRole(catalog, state, sender.ownerId, n, sender.id, heroes);
        if (role !== 'open' && !(key === goal && role === 'destination_only')) continue;
      }
      seen.add(key); queue.push(n);
    }
  }
  return false;
}
export function courierPlan(catalog: ContentCatalog, state: MatchState, hero: HeroState, choice: CourierChoice = {}) {
  const fail = (problem: string) => ({ problem, artifact: null, recipient: null, townId: null });
  if (state.players[hero.ownerId]?.libraryEconomy?.parcel) return fail('Your empire already has a parcel in transit or awaiting collection');
  if (!ownedTown(catalog, state, hero)) return fail('The sender must stand in an owned town');
  const items = hero.backpack.filter((a) => !a.questBound && (!choice.artifactInstanceId || a.instanceId === choice.artifactInstanceId));
  if (!items.length) return fail('Choose a non-quest artifact from this hero’s backpack');
  const recipients = Object.values(state.heroes).filter((h) => h.id !== hero.id && h.ownerId === hero.ownerId && h.status === 'active' && (!choice.recipientHeroId || h.id === choice.recipientHeroId)).sort((a,b) => a.id.localeCompare(b.id));
  for (const recipient of recipients) {
    const town = ownedTown(catalog, state, recipient);
    if (!town || recipient.backpack.length >= catalog.rulesProfile.backpackCapacity || !connected(catalog, state, hero, recipient)) continue;
    return { problem: null, artifact: items[0]!, recipient, townId: town.id };
  }
  return fail('Choose another owned hero in an owned town, with backpack space and an explored, open land/sea connection');
}
function record(player: PlayerState, day: number, artifact: ArtifactInstanceState, message: string) {
  const economy = player.libraryEconomy ??= {};
  economy.courierHistory = [...(economy.courierHistory ?? []), { day, artifactId: artifact.artifactId, message }].slice(-30);
}
export function sendCourier(tx: Tx, hero: HeroState, choice: CourierChoice): void {
  if (!choice.artifactInstanceId || !choice.recipientHeroId) reject('illegal_target', 'Choose the artifact and recipient before sending');
  const plan = courierPlan(tx.catalog, tx.state, hero, choice);
  if (plan.problem || !plan.artifact || !plan.recipient || !plan.townId) reject('illegal_target', plan.problem ?? 'Cannot send');
  const player = tx.state.players[hero.ownerId]!;
  hero.backpack = hero.backpack.filter((a) => a.instanceId !== plan.artifact!.instanceId);
  (player.libraryEconomy ??= {}).parcel = { artifact: plan.artifact, senderId: hero.id, recipientId: plan.recipient.id, destinationTownId: plan.townId, sentDay: tx.state.day, arrivesDay: tx.state.day + 1, status: 'in_transit' };
  record(player, tx.state.day, plan.artifact, `Sent from ${hero.name} to ${plan.recipient.name}; delivery at next dawn.`);
}
export function processCourierDawn(tx: Tx): void {
  for (const player of Object.values(tx.state.players)) {
    const parcel = player.libraryEconomy?.parcel;
    if (!parcel || parcel.arrivesDay > tx.state.day) continue;
    const recipient = tx.state.heroes[parcel.recipientId], sender = tx.state.heroes[parcel.senderId], town = tx.state.towns[parcel.destinationTownId];
    const space = (h: HeroState | undefined) => h?.status === 'active' && h.ownerId === player.id && h.backpack.length < tx.profile.backpackCapacity;
    if (parcel.status === 'in_transit' && space(recipient) && town?.ownerId === player.id && heroInTown(tx.catalog, tx.state, recipient!, town.id)) {
      recipient!.backpack.push(parcel.artifact); record(player, tx.state.day, parcel.artifact, `Delivered to ${recipient!.name} at ${town.name}.`); delete player.libraryEconomy!.parcel;
    } else if (parcel.status === 'in_transit' && space(sender)) {
      sender!.backpack.push(parcel.artifact); record(player, tx.state.day, parcel.artifact, `Delivery failed; returned to ${sender!.name}.`); delete player.libraryEconomy!.parcel;
    } else {
      const stash = Object.values(tx.state.towns).filter((t) => t.ownerId === player.id).sort((a,b) => a.id.localeCompare(b.id))[0];
      if (parcel.status !== 'stash' || parcel.stashTownId !== stash?.id) record(player, tx.state.day, parcel.artifact, stash ? `Held safely at ${stash.name}; collect with an owned hero.` : 'Held in empire escrow until an owned town becomes available.');
      parcel.status = 'stash'; parcel.stashTownId = stash?.id;
    }
  }
}
export function commitClaimCourierParcel(tx: Tx, heroId: string): void {
  const player = tx.state.players[tx.actorId]!, parcel = player.libraryEconomy?.parcel, hero = tx.state.heroes[heroId];
  if (!tx.state.scenario.features?.mythicLibraryV2 || !parcel || parcel.status !== 'stash' || !parcel.stashTownId) reject('illegal_action', 'No parcel is awaiting collection');
  const town = tx.state.towns[parcel.stashTownId];
  if (!hero || hero.ownerId !== tx.actorId || hero.status !== 'active' || town?.ownerId !== tx.actorId || !heroInTown(tx.catalog, tx.state, hero, town.id)) reject('not_present', 'An owned hero must stand in the town holding the parcel');
  if (hero.backpack.length >= tx.profile.backpackCapacity) reject('no_capacity', 'Make room in the backpack first');
  hero.backpack.push(parcel.artifact); record(player, tx.state.day, parcel.artifact, `Collected by ${hero.name} at ${town.name}.`); delete player.libraryEconomy!.parcel;
}
