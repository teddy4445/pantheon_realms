/**
 * The map editor's ship tool (expedition kit §07 "Editor/scenarios can place neutral or owned empty
 * ships"; scenario feature `navalMovementV1`, on for every editor map): place and remove empty ships
 * on water tiles of a `CustomMapDocument` (`ships`, kept by save, export, import and play-test). Pure
 * document edits with a reason for every refused tile; the document validator (`validateCustomMap`)
 * repeats the same checks and its reachability check counts the placed ships.
 */
import { terrainAt, type CustomMapDocument } from '@pr/session';
import { hexKey, type CustomShip, type HexCoord } from '@pr/rules';

/** The ship on a tile of the document, if any. */
export function docShipAt(doc: Pick<CustomMapDocument, 'ships'>, c: HexCoord): CustomShip | null {
  return (doc.ships ?? []).find((s) => s.q === c.q && s.r === c.r) ?? null;
}

/** Why a ship cannot be placed on a tile (null: it can). */
export function shipPlacementProblem(doc: CustomMapDocument, c: HexCoord): string | null {
  const t = terrainAt(doc, c);
  if (t === 'void') return 'That tile is off the map';
  if (t !== 'water') return 'Ships are placed on water only';
  const channel = doc.sites.some((s) => s.kind === 'sluice' && (s.channel ?? []).some((x) => x.q === c.q && x.r === c.r));
  if (channel) return 'Not in a sluice channel: the ship would run aground when it drains';
  if (doc.sites.some((s) => s.q === c.q && s.r === c.r)) return 'A site stands on that tile';
  if (docShipAt(doc, c)) return 'A ship already lies there (click it with Erase to remove it)';
  return null;
}

function newShipId(doc: Pick<CustomMapDocument, 'ships'>): string {
  const taken = new Set((doc.ships ?? []).map((s) => s.id));
  let i = (doc.ships ?? []).length + 1;
  while (taken.has(`ship_${i}`)) i++;
  return `ship_${i}`;
}

/** Place an empty ship (`owner`: an empire slot, or -1 for a neutral ship any hero may claim). */
export function placeShip(doc: CustomMapDocument, c: HexCoord, owner: number): { doc: CustomMapDocument; error: string | null } {
  const problem = shipPlacementProblem(doc, c);
  if (problem) return { doc, error: problem };
  if (owner >= doc.players.length) return { doc, error: `There is no empire ${owner + 1} on this map` };
  const ship: CustomShip = { id: newShipId(doc), q: c.q, r: c.r, ...(owner >= 0 ? { owner } : {}) };
  return { doc: { ...doc, ships: [...(doc.ships ?? []), ship] }, error: null };
}

/** Remove the ship on a tile (unchanged when there is none). */
export function removeShipAt(doc: CustomMapDocument, c: HexCoord): CustomMapDocument {
  const k = hexKey(c);
  const left = (doc.ships ?? []).filter((s) => hexKey({ q: s.q, r: s.r }) !== k);
  if (left.length === (doc.ships ?? []).length) return doc;
  const { ships: _old, ...rest } = doc;
  return left.length ? { ...doc, ships: left } : (rest as CustomMapDocument);
}

/** The ship tool's click: an empty water tile gets a ship; a tile with one of the same owner loses it (a toggle). */
export function applyShipTool(doc: CustomMapDocument, c: HexCoord, owner: number): { doc: CustomMapDocument; error: string | null; removed: boolean } {
  const there = docShipAt(doc, c);
  if (there && (there.owner ?? -1) === owner) return { doc: removeShipAt(doc, c), error: null, removed: true };
  if (there) {
    // Another owner's ship: give it to the chosen owner.
    const ships = (doc.ships ?? []).map((s) => (s.id === there.id ? (owner >= 0 ? { id: s.id, q: s.q, r: s.r, owner } : { id: s.id, q: s.q, r: s.r }) : s));
    return { doc: { ...doc, ships }, error: null, removed: false };
  }
  return { ...placeShip(doc, c, owner), removed: false };
}

/** The editor's word for a ship's owner. */
export function shipOwnerLabel(doc: Pick<CustomMapDocument, 'players'>, owner: number | undefined): string {
  return owner === undefined || owner < 0 ? 'Neutral' : `Empire ${owner + 1}`;
}
