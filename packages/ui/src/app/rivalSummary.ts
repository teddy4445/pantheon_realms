/**
 * The rivals' turns in a few lines (owner request 2026-10-07): "Norse took the
 * Sawmill; Egyptians recruited at Thebes". Built from the events of the other
 * empires' turns, as seen by one human seat: only what that player could see
 * (the place was in its view when it happened) or what affected it (its own
 * towns, mines, heroes and battles). Town captures and eliminations are public.
 * Pure functions over committed states and events; nothing here changes a rule.
 */
import {
  cellIndex,
  scenarioMission,
  visibleCells,
  type ContentCatalog,
  type GameEvent,
  type HexCoord,
  type MatchState,
  type PlayerId,
} from '@pr/rules';

export interface RivalNote {
  /** The empire that acted. */
  readonly playerId: string;
  /** Merge key: one line per key (e.g. one "recruited at Thebes" however many recruits). */
  readonly key: string;
  readonly text: string;
  /** It touched the viewer (its town, mine, hero or battle). */
  readonly mine: boolean;
}

export interface RivalSummaryLine {
  readonly playerId: string;
  readonly who: string;
  readonly text: string;
  readonly mine: boolean;
}

const PEOPLE: Readonly<Record<string, string>> = {
  greek: 'Greeks',
  norse: 'Norse',
  egyptian: 'Egyptians',
  japanese: 'Japanese',
  celtic: 'Celts',
  mesoamerican: 'Mesoamericans',
};

/** How the viewer calls an empire: its people ("Norse"), or its name when two empires share a pantheon. */
export function empireLabel(state: MatchState, playerId: string): string {
  const p = state.players[playerId];
  if (!p) return 'Someone';
  const shared = Object.values(state.players).filter((x) => x.pantheonId === p.pantheonId && x.role !== 'scripted_hostile').length > 1;
  return shared ? p.name : (PEOPLE[p.pantheonId] ?? p.name);
}

function rivalOf(state: MatchState, playerId: string | null | undefined, viewerId: string): playerId is string {
  if (!playerId || playerId === viewerId) return false;
  const p = state.players[playerId];
  return !!p && p.role !== 'scripted_hostile';
}

/** Notes for `viewerId` from one committed batch (`before` → `after`) of other empires' actions. */
export function rivalNotes(catalog: ContentCatalog, before: MatchState, after: MatchState, events: readonly GameEvent[], viewerId: PlayerId): RivalNote[] {
  const relevant = events.some((e) =>
    ['SiteCaptured', 'TownCaptured', 'UnitsRecruited', 'HeroHired', 'BuildingConstructed', 'BattleEnded', 'PlayerEliminated'].includes(e.kind),
  );
  if (!relevant) return [];
  const map = after.world.map;
  let seen: Set<number> | null = null;
  const sees = (c: HexCoord) => (seen ??= visibleCells(catalog, after, viewerId)).has(cellIndex(map, c));
  const mission = scenarioMission(catalog, after);
  const siteDef = (id: string) => mission?.sites.find((s) => s.id === id);
  const townIds = new Set(Object.values(after.towns).map((t) => t.siteId as string));
  const out: RivalNote[] = [];
  for (const e of events) {
    switch (e.kind) {
      case 'TownCaptured': {
        if (!rivalOf(after, e.playerId, viewerId)) break;
        const town = after.towns[e.townId];
        const from = e.fromPlayerId ?? before.towns[e.townId]?.ownerId ?? null;
        const fromText = from === viewerId ? ' from you' : from ? ` from the ${empireLabel(after, from)}` : '';
        out.push({ playerId: e.playerId, key: `town:${e.townId}`, text: `captured ${town?.name ?? 'a town'}${fromText}`, mine: from === viewerId });
        break;
      }
      case 'SiteCaptured': {
        if (!rivalOf(after, e.playerId, viewerId) || townIds.has(e.siteId)) break;
        const def = siteDef(e.siteId);
        if (!def) break;
        const wasMine = before.world.sites[e.siteId]?.owner === viewerId;
        if (!wasMine && !sees(def.coord)) break;
        out.push({ playerId: e.playerId, key: `site:${e.siteId}`, text: `took the ${def.name}${wasMine ? ' from you' : ''}`, mine: wasMine });
        break;
      }
      case 'UnitsRecruited':
      case 'HeroHired':
      case 'BuildingConstructed': {
        const town = after.towns[e.townId];
        if (!town || !rivalOf(after, town.ownerId, viewerId) || !sees(town.coord)) break;
        if (e.kind === 'UnitsRecruited') out.push({ playerId: town.ownerId!, key: `recruit:${town.id}`, text: `recruited at ${town.name}`, mine: false });
        else if (e.kind === 'HeroHired') out.push({ playerId: town.ownerId!, key: `hire:${town.id}`, text: `hired a hero at ${town.name}`, mine: false });
        else {
          const name = catalog.buildings[e.buildingId]?.name ?? 'a building';
          out.push({ playerId: town.ownerId!, key: `build:${town.id}:${e.buildingId}`, text: `built ${name} at ${town.name}`, mine: false });
        }
        break;
      }
      case 'BattleEnded': {
        const r = after.lastBattleResult;
        if (!r || r.battleId !== e.battleId) break;
        const mySide = r.attacker.playerId === viewerId ? 'attacker' : r.defender.playerId === viewerId ? 'defender' : null;
        if (!mySide) break;
        const foe = mySide === 'attacker' ? r.defender.playerId : r.attacker.playerId;
        if (!rivalOf(after, foe, viewerId)) break;
        const won = r.winner === mySide;
        const what = mySide === 'defender' ? `attacked you (${r.label})` : `fought you (${r.label})`;
        out.push({ playerId: foe, key: `battle:${r.battleId}`, text: `${what} — ${won ? 'you won' : 'you lost'}`, mine: true });
        break;
      }
      case 'PlayerEliminated': {
        if (e.playerId === viewerId || !after.players[e.playerId]) break;
        out.push({ playerId: e.playerId, key: `out:${e.playerId}`, text: 'were eliminated', mine: false });
        break;
      }
      default:
        break;
    }
  }
  return out;
}

/** Enemy (non-monster) heroes the viewer can see now. */
export function heroesInView(catalog: ContentCatalog, state: MatchState, viewerId: PlayerId): string[] {
  const seen = visibleCells(catalog, state, viewerId);
  return Object.values(state.heroes)
    .filter((h) => h.status === 'active' && !h.monster && rivalOf(state, h.ownerId, viewerId) && seen.has(cellIndex(state.world.map, h.position)))
    .map((h) => h.id)
    .sort();
}

/** Within this many hexes of one of the viewer's towns, a hero that came into view is reported. */
const NEAR_TOWN = 10;

/** Heroes that came into view near the viewer's towns since the turn ended. */
export function approachNotes(catalog: ContentCatalog, state: MatchState, viewerId: PlayerId, seenBefore: readonly string[]): RivalNote[] {
  const before = new Set(seenBefore);
  const mine = Object.values(state.towns).filter((t) => t.ownerId === viewerId);
  const out: RivalNote[] = [];
  for (const id of heroesInView(catalog, state, viewerId)) {
    if (before.has(id)) continue;
    const h = state.heroes[id]!;
    let near: { name: string; d: number } | null = null;
    for (const t of mine) {
      const d = (Math.abs(t.coord.q - h.position.q) + Math.abs(t.coord.r - h.position.r) + Math.abs(t.coord.q + t.coord.r - h.position.q - h.position.r)) / 2;
      if (d <= NEAR_TOWN && (!near || d < near.d)) near = { name: t.name, d };
    }
    if (near) out.push({ playerId: h.ownerId, key: `near:${id}`, text: `${h.name} is in view near ${near.name}`, mine: true });
  }
  return out;
}

/** One line per empire, its notes merged ("Norse took the Sawmill and recruited at Thebes"), the ones that touched the viewer first. */
export function summarizeRivalNotes(state: MatchState, notes: readonly RivalNote[]): RivalSummaryLine[] {
  const byPlayer = new Map<string, RivalNote[]>();
  for (const n of notes) {
    const list = byPlayer.get(n.playerId) ?? [];
    if (!list.some((x) => x.key === n.key)) list.push(n);
    byPlayer.set(n.playerId, list);
  }
  const order = state.playerOrder.filter((p) => byPlayer.has(p));
  return order.map((p) => {
    const list = [...byPlayer.get(p)!].sort((a, b) => Number(b.mine) - Number(a.mine));
    const parts = list.map((n) => n.text);
    const text = parts.length <= 1 ? parts.join('') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
    return { playerId: p, who: empireLabel(state, p), text, mine: list.some((n) => n.mine) };
  });
}
