/**
 * Read-only view helpers shared by screens. Everything here derives display
 * data from committed MatchState and content; nothing mutates state or decides
 * legality (legality always comes from the rules' quote functions).
 */
import {
  RESOURCE_KEYS,
  addResources,
  dayOfWeek,
  heroAt,
  missionSite,
  playerTowns,
  resources,
  terrainAt,
  townDailyIncome,
  weekOf,
  type ContentCatalog,
  type HeroState,
  type HexCoord,
  type MatchState,
  type PlayerState,
  type ResourceBundle,
  type SiteDefinition,
  type TownState, scenarioMission,
} from '@pr/rules';
import { armyStrength } from '@pr/ai';
import { viewerPlayerId } from '@pr/session';
import type { SiteArchetype } from '@pr/presentation';

/**
 * The seat whose view is shown: the active human (hot-seat games have
 * several), otherwise the human who played most recently in turn order.
 */
export function humanPlayer(state: MatchState): PlayerState {
  return state.players[viewerPlayerId(state)]!;
}

export function dayLabel(state: MatchState): { day: number; week: number; dow: number; text: string } {
  const week = weekOf(state.day);
  const dow = dayOfWeek(state.day);
  return { day: state.day, week, dow, text: `Week ${week} · Day ${dow}` };
}

export function playerHeroes(state: MatchState, playerId: string): HeroState[] {
  return Object.values(state.heroes).filter((h) => h.ownerId === playerId && h.status === 'active');
}

export function townAtHero(state: MatchState, hero: HeroState): TownState | null {
  return Object.values(state.towns).find((t) => t.coord.q === hero.position.q && t.coord.r === hero.position.r) ?? null;
}

export function heroesInTown(state: MatchState, town: TownState): HeroState[] {
  return Object.values(state.heroes).filter((h) => h.status === 'active' && h.position.q === town.coord.q && h.position.r === town.coord.r);
}

export function siteArchetype(def: SiteDefinition): SiteArchetype {
  const k = def.kind;
  switch (k.type) {
    case 'town':
      return 'town';
    case 'resource_site':
      return k.siteType;
    case 'pickup':
      return 'pickup';
    case 'watchtower':
      return 'watchtower';
    case 'crossing':
      return def.name.toLowerCase().includes('pass') ? 'crossing_pass' : 'crossing_bridge';
    case 'landmark':
      return k.landmark;
    case 'activation':
      return k.label;
    case 'gate':
      return 'gate';
    case 'creature_camp':
      return 'camp';
    case 'map_event':
      return 'event_site';
    case 'relic':
      return 'relic';
  }
}

export function siteKindLabel(def: SiteDefinition): string {
  const k = def.kind;
  switch (k.type) {
    case 'town':
      return 'Town';
    case 'resource_site':
      return `${k.siteType === 'gold_mine' ? 'Gold mine' : k.siteType === 'crystal_deposit' ? 'Crystal deposit' : k.siteType === 'sawmill' ? 'Sawmill' : 'Quarry'} · +${k.dailyYield} ${k.resource}/day`;
    case 'pickup':
      return 'Resource cache';
    case 'watchtower':
      return 'Watchtower';
    case 'crossing':
      return 'Guarded crossing';
    case 'landmark':
      return 'Landmark';
    case 'activation':
      return k.label === 'beacon' ? 'Beacon' : 'Signal relay';
    case 'gate':
      return 'Ward gate';
    case 'creature_camp':
      return 'Creature camp';
    case 'map_event':
      return k.title;
    case 'relic':
      return 'Relic shrine';
  }
}

export const TERRAIN_LABEL: Record<string, string> = {
  plains: 'Plains',
  forest: 'Forest',
  rough: 'Rough ground',
  marsh: 'Marsh',
  mountain: 'Mountains (impassable)',
  water: 'Water (impassable)',
};

export function terrainLabel(state: MatchState, c: HexCoord): string {
  return TERRAIN_LABEL[terrainAt(state.world.map, c)] ?? 'Unknown';
}

/** Coarse, clearly-labeled estimate (heuristic, not a battle prediction). */
export function threatLabel(catalog: ContentCatalog, mine: number, theirs: number): { text: string; tone: 'ok' | 'warn' | 'bad' | 'info' } {
  if (theirs <= 0) return { text: 'No resistance', tone: 'ok' };
  const r = mine / theirs;
  void catalog;
  if (r >= 2) return { text: 'Weak opposition', tone: 'ok' };
  if (r >= 1.2) return { text: 'You look stronger', tone: 'ok' };
  if (r >= 0.85) return { text: 'Even match', tone: 'warn' };
  if (r >= 0.5) return { text: 'Stronger than you', tone: 'bad' };
  return { text: 'Deadly', tone: 'bad' };
}

export function heroStrength(catalog: ContentCatalog, hero: HeroState): number {
  return armyStrength(catalog, hero.army.slots.map((s) => (s ? { creatureId: s.creatureId, count: s.count } : null)), {
    attack: hero.attributes.attack,
    defense: hero.attributes.defense,
  });
}

export function guardStrength(catalog: ContentCatalog, state: MatchState, siteId: string): number {
  const def = missionSite(catalog, state, siteId);
  const st = state.world.sites[siteId];
  const army = st?.guard ?? def?.guard?.army ?? [];
  const cmd = def?.guard?.commander;
  return armyStrength(catalog, army, cmd ? { attack: cmd.attributes.attack, defense: cmd.attributes.defense } : { attack: 0, defense: 0 });
}

/** Rough defender strength of a besieged town: garrison, visiting hero, and a wall factor (display heuristic). */
export function siegeStrength(catalog: ContentCatalog, town: TownState, visitor: HeroState | undefined, level: number): number {
  const garrison = armyStrength(catalog, town.garrison.slots.map((s) => (s ? { creatureId: s.creatureId, count: s.count } : null)));
  return (garrison + (visitor ? heroStrength(catalog, visitor) : 0)) * (1 + 0.25 * level);
}

/** Income per day shown in the top bar (towns + owned resource sites). Display only. */
export function dailyIncome(catalog: ContentCatalog, state: MatchState, playerId: string): ResourceBundle {
  let total = resources();
  for (const t of playerTowns(state, playerId)) total = addResources(total, townDailyIncome(catalog, t));
  const mission = scenarioMission(catalog, state);
  for (const def of mission?.sites ?? []) {
    if (def.kind.type !== 'resource_site') continue;
    if (state.world.sites[def.id]?.owner !== playerId) continue;
    total = addResources(total, { [def.kind.resource]: def.kind.dailyYield });
  }
  return total;
}

export function hasAnyResources(b: ResourceBundle): boolean {
  return RESOURCE_KEYS.some((k) => b[k] !== 0);
}

export function heroOnTile(state: MatchState, c: HexCoord): HeroState | undefined {
  return heroAt(state, c);
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

export function relativeTime(iso: string | null): string {
  if (!iso) return 'unknown time';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'unknown time';
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
