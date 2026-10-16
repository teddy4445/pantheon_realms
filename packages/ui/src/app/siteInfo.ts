/**
 * What the adventure map tells the player about the sites of campaign content v2
 * (2026-10-15): sluices, supply depots, ferry landings and neutral hiring sites —
 * their known state and the interaction a hero can have there — and the quest
 * markers of open objectives. Read-only view models from committed state and the
 * rules' own quote functions; nothing here decides legality or reveals what the
 * viewer has not explored (a ferry's far landing is named only once known).
 */
import {
  campLockedReason,
  campStock,
  cellIndex,
  missionObjectiveDefs,
  missionSite,
  quoteSluice,
  visibleCells,
  type ContentCatalog,
  type GameEvent,
  type MatchState,
  type ObjectiveDefinition,
  type SiteDefinition,
} from '@pr/rules';

/** The known state of a v2 site and what a hero can do there. */
export interface SiteStatusView {
  /** The state in words: open or closed, taken or waiting, running or why not, this week's stock. */
  readonly state: string;
  /** The site is closed to the viewer for now (a ferry not running, hiring not open yet); the reason is in `state` or a refused `action`. */
  readonly locked: boolean;
  /** The interaction a hero can have here (or why it is refused), if any. */
  readonly action: string | null;
  /** A hero standing here can act now (e.g. operate the sluice). */
  readonly actionable: boolean;
  /** The action line is a refusal (guards in the way, a pact not made, a hero in the channel): shown as a warning. */
  readonly refused: boolean;
}

/** Whether a site is one the campaign v2 description covers (sluice, supply depot, ferry, neutral hiring site). */
export function isV2Site(def: SiteDefinition): boolean {
  const k = def.kind;
  if (k.type === 'sluice') return true;
  if (k.type === 'pickup') return def.art === 'supply_depot' || def.marker === 'supply';
  if (k.type === 'portal') return !!k.ferry || !!k.requiresFlag;
  if (k.type === 'creature_camp') return !!k.restock || !!k.requiresFlag || !!def.art;
  return false;
}

/** The viewer knows this site: its tile explored, revealed by the story, or visited by one of its heroes. */
export function siteKnown(state: MatchState, playerId: string, def: SiteDefinition): boolean {
  const map = state.world.map;
  if (state.fog[playerId]?.explored[cellIndex(map, def.coord)] === 1) return true;
  if (state.mission.revealedSiteIds.includes(def.id)) return true;
  return (state.world.sites[def.id]?.visitedBy ?? []).includes(playerId);
}

/**
 * The known state and the legal interaction of a v2 site for the viewer (`heroId`:
 * the selected hero, whose position decides what it can do now). Null for any
 * other site (the map's ordinary lines describe it).
 */
export function siteStatus(catalog: ContentCatalog, state: MatchState, playerId: string, siteId: string, heroId: string | null): SiteStatusView | null {
  const def = missionSite(catalog, state, siteId);
  const st = state.world.sites[siteId];
  if (!def || !st || !isV2Site(def)) return null;
  const hero = heroId ? state.heroes[heroId] : undefined;
  const here = !!hero && hero.status === 'active' && hero.ownerId === playerId && hero.position.q === def.coord.q && hero.position.r === def.coord.r;
  const k = def.kind;
  switch (k.type) {
    case 'sluice': {
      const open = !!st.open;
      const verb = open ? 'close' : 'open';
      if (here) {
        const q = quoteSluice(catalog, state, hero!.id, siteId);
        return {
          state: open ? 'Open' : 'Closed',
          locked: false,
          action: q.legal ? `${hero!.name} can ${verb} it: ${q.text}` : `${hero!.name} cannot ${verb} it: ${q.reason ?? 'not now'}`,
          actionable: q.legal,
          refused: !q.legal,
        };
      }
      const guarded = !!def.guard && !st.cleared;
      return {
        state: open ? 'Open' : 'Closed',
        locked: false,
        action: guarded ? `Its guards still hold it. Once they are beaten, a hero standing here can ${verb} it: ${open ? k.closeText : k.openText}` : `A hero standing here can ${verb} it: ${open ? k.closeText : k.openText}`,
        actionable: false,
        refused: guarded,
      };
    }
    case 'pickup':
      return st.claimed
        ? { state: 'Taken: the supplies are gone', locked: false, action: null, actionable: false, refused: false }
        : { state: 'Not taken yet', locked: false, action: 'The first hero to stop here collects the supplies.', actionable: false, refused: false };
    case 'portal': {
      const blocked = !!k.requiresFlag && !state.mission.flags[k.requiresFlag];
      if (blocked) return { state: k.lockedReason ?? (k.ferry ? 'The ferry is not running yet' : 'The crossing is closed'), locked: true, action: null, actionable: false, refused: false };
      const exit = missionSite(catalog, state, k.exitSiteId);
      const far = exit && siteKnown(state, playerId, exit) ? exit.name : k.ferry ? 'the far landing' : 'its twin';
      return {
        state: k.ferry ? 'Running' : 'Open',
        locked: false,
        action: `Stop on ${k.ferry ? 'the landing' : 'it'} to cross to ${far} at once, at no movement cost. Not while a hero stands on the far side.`,
        actionable: false,
        refused: false,
      };
    }
    case 'creature_camp': {
      const creature = catalog.creatures[k.creatureId];
      const stock = campStock(catalog, state, siteId);
      const names = stock === 1 ? (creature?.name ?? k.creatureId) : (creature?.pluralName ?? k.creatureId);
      const mode = k.restock ?? 'growth';
      const stockText = mode === 'weekly' ? `${stock} ${names} this week (up to ${k.weeklyGrowth} each week; unhired ones do not stay)` : mode === 'none' ? `${stock} ${names} left (no more will come)` : `${stock} ${names} willing to join · +${k.weeklyGrowth} each week`;
      const lock = campLockedReason(catalog, state, siteId);
      if (lock) return { state: stockText, locked: true, action: `Not hiring yet: ${lock}`, actionable: false, refused: true };
      const guarded = !!def.guard && !st.cleared;
      return {
        state: stockText,
        locked: false,
        action: guarded ? 'Its guards must be beaten before anyone hires here.' : stock > 0 ? 'A visiting hero can hire them at their normal price.' : mode === 'none' ? 'Nobody is left to hire.' : 'Nobody left to hire this week; more come when the next week begins.',
        actionable: !guarded && stock > 0 && here,
        refused: guarded,
      };
    }
    default:
      return null;
  }
}

/** Accessible names of the campaign quest-marker icons. */
export const QUEST_MARKER_LABEL: Readonly<Record<NonNullable<SiteDefinition['marker']>, string>> = {
  evidence: 'Evidence',
  supply: 'Supplies',
  evacuation: 'Evacuation',
  pact: 'Pact',
};

/** The generic quest marker (objective sites without a campaign marker). */
export const GENERIC_QUEST_MARKER = 'icon.marker.quest';

/** The quest-marker icon of a site: its campaign marker (`campaignv2.icon.<marker>`) or the generic one, with its name. */
export function questMarkerIcon(def: Pick<SiteDefinition, 'marker'> | undefined): { id: string; label: string; generic: boolean } {
  const m = def?.marker;
  return m ? { id: `campaignv2.icon.${m}`, label: `${QUEST_MARKER_LABEL[m]} objective`, generic: false } : { id: GENERIC_QUEST_MARKER, label: 'Objective', generic: true };
}

/** An objective still to do (active, or ready to claim): the journal shows its marker. */
function openObjective(state: MatchState, o: ObjectiveDefinition): boolean {
  const s = state.mission.objectives[o.id]?.status;
  return s === 'active' || s === 'available';
}

/**
 * The sites that carry a quest marker on the map: the marker sites of open
 * objectives (journal state), each with its icon. A hidden site (`markerHiddenUntilRevealed`)
 * gets none until the viewer knows it; the map draws a marker only on a site it shows.
 */
export function questMarkerSites(catalog: ContentCatalog, state: MatchState, playerId: string): Map<string, { id: string; label: string; generic: boolean }> {
  const out = new Map<string, { id: string; label: string; generic: boolean }>();
  for (const o of missionObjectiveDefs(catalog, state)) {
    if (!o.markerSiteId || !openObjective(state, o) || out.has(o.markerSiteId)) continue;
    const def = missionSite(catalog, state, o.markerSiteId);
    if (!def) continue;
    if (def.markerHiddenUntilRevealed && !siteKnown(state, playerId, def)) continue;
    out.set(def.id, questMarkerIcon(def));
  }
  return out;
}

/**
 * The notice for a hero that stopped on a portal or ferry landing and stayed:
 * a ferry that does not run yet gives its own reason (`lockedReason`); otherwise
 * a hero stands on the far side.
 */
export function portalBlockedText(catalog: ContentCatalog, state: MatchState, siteId: string): string {
  const def = missionSite(catalog, state, siteId);
  const k = def?.kind;
  if (k?.type === 'portal') {
    if (k.requiresFlag && !state.mission.flags[k.requiresFlag]) return k.lockedReason ?? (k.ferry ? 'The ferry is not running yet.' : 'The crossing is closed.');
    if (k.ferry) return 'The far landing is blocked: a hero stands on it.';
  }
  return 'The far side of the portal is blocked: a hero stands on its twin.';
}

/**
 * The notice for a sluice operated (`SluiceOperated`): by the viewer's hero, what
 * changed; by another hand, only when the viewer sees the sluice. Null: no notice.
 */
export function sluiceOperatedText(catalog: ContentCatalog, state: MatchState, playerId: string, e: Extract<GameEvent, { kind: 'SluiceOperated' }>): string | null {
  const def = missionSite(catalog, state, e.siteId);
  if (!def || def.kind.type !== 'sluice') return null;
  const hero = state.heroes[e.heroId];
  const what = e.open ? def.kind.openText : def.kind.closeText;
  if (hero?.ownerId === playerId) return `${hero.name} ${e.open ? 'opened' : 'closed'} ${def.name}. ${what}`;
  if (!visibleCells(catalog, state, playerId).has(cellIndex(state.world.map, def.coord))) return null;
  return `${def.name} was ${e.open ? 'opened' : 'closed'}. ${what}`;
}
