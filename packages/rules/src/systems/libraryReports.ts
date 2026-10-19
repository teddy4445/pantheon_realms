import { axialDistance, axialNeighbors, hexEquals, hexKey, type HexCoord } from '../core/hex';
import type { ContentCatalog } from '../definitions/catalog';
import type { SpellEffect } from '../definitions/pantheons';
import type { HeroState, MatchState } from '../state/match';
import { cellIndex, inMap, siteAt, terrainAt, visibleCells } from '../resolvers/world';
import { landingProblem, navalEnabled } from '../resolvers/naval';
import { armyGoldValue, intelStrengthBand, intelStrengthLabel } from '../resolvers/intel';
import { requireScenarioMission } from '../resolvers/scenario';
import { quoteNeutralReaction } from './sites';

type ReportEffect = Extract<SpellEffect, { type: 'adventure_report' }>;
type ReportEntry = { coord: HexCoord; label: string; detail: string };
/** A bounded, dated snapshot. It never grants vision or stores hidden counts/ownership. */
export function libraryReportPlan(catalog: ContentCatalog, state: MatchState, hero: HeroState, effect: ReportEffect, target: HexCoord | null): { problem: string | null; entries: ReportEntry[] } {
  const known = (c: HexCoord) => inMap(state.world.map, c) && state.fog[hero.ownerId]?.explored[cellIndex(state.world.map, c)] === 1;
  const within = (c: HexCoord) => known(c) && axialDistance(hero.position, c) <= effect.range;
  const visible = visibleCells(catalog, state, hero.ownerId);
  const mission = requireScenarioMission(catalog, state);
  const disclosed = (id: string, hidden?: boolean) => !hidden || state.mission.revealedSiteIds.includes(id);
  if (effect.kind === 'omen') {
    if (!catalog.scoutingIntelPolicy) return { problem: 'This scenario has no strength-band policy', entries: [] };
    if (!target) return { problem: null, entries: [] }; // Book: choose the target next.
    if (!within(target)) return { problem: `Choose a known neutral guard within ${effect.range} hexes`, entries: [] };
    const monster = Object.values(state.heroes).find((h) => h.status === 'active' && h.monster && h.ownerId !== hero.ownerId && hexEquals(h.position, target) && visible.has(cellIndex(state.world.map, target)));
    const site = siteAt(catalog, state, target);
    const guard = site && site.state.owner === null && !site.state.cleared && site.def.kind.type !== 'town' && !site.def.guard?.commander && disclosed(site.def.id, site.def.markerHiddenUntilRevealed) ? site.def.guard : undefined;
    if (!monster && !guard) return { problem: 'No known neutral guard here', entries: [] };
    const stacks = monster ? monster.army.slots : site!.state.guard ?? guard!.army;
    const band = intelStrengthLabel(catalog, intelStrengthBand(catalog.scoutingIntelPolicy, armyGoldValue(catalog, stacks)));
    const reaction = quoteNeutralReaction(catalog, state, hero.id, target);
    const disposition = reaction.kind === 'join' ? 'May join' : reaction.kind === 'flee' ? 'May flee' : 'Will stand and fight';
    return { problem: null, entries: [{ coord: { ...target }, label: monster?.name ?? site!.def.name, detail: `${band}. ${disposition} as of day ${state.day}; disposition may change with your army and the day.` }] };
  }
  if (effect.kind === 'sounding') {
    if (!navalEnabled(state)) return { problem: 'This scenario does not support sea travel', entries: [] };
    const entries: ReportEntry[] = [], seen = new Set<string>();
    // Terrain only outside current sight: an omitted hidden occupant must not leak through legality.
    for (let r = 0; r < state.world.map.height; r++) for (let q = 0; q < state.world.map.width; q++) {
      const water = { q, r };
      if (!within(water) || terrainAt(state.world.map, water) !== 'water') continue;
      for (const land of axialNeighbors(water)) {
        if (!within(land) || terrainAt(state.world.map, land) === 'water' || catalog.rulesProfile.terrainCost[terrainAt(state.world.map, land)] === null || seen.has(hexKey(land))) continue;
        const inSight = visible.has(cellIndex(state.world.map, land));
        if (inSight && landingProblem(catalog, state, hero, land)) continue;
        seen.add(hexKey(land));
        const hull = Object.values(state.world.ships ?? {}).find((s) => s.state === 'empty' && !s.heroId && (s.ownerId === null || s.ownerId === hero.ownerId) && within(s.coord) && axialDistance(s.coord, land) === 1);
        entries.push({ coord: land, label: inSight ? hull ? 'Embark / landing shore' : 'Landing shore' : 'Known coast', detail: inSight ? `Legal landing at the time of the survey (day ${state.day}); ${hull ? 'an available empty ship lies beside it. ' : ''}Check again on approach.` : 'Passable coastal terrain. Occupancy and access must be checked on approach.' });
      }
    }
    return { problem: null, entries };
  }
  const entries: ReportEntry[] = [];
  for (const site of mission.sites) {
    if (!within(site.coord) || !disclosed(site.id, site.markerHiddenUntilRevealed)) continue;
    if (effect.kind === 'resources' && site.kind.type === 'resource_site') entries.push({ coord: { ...site.coord }, label: site.kind.siteType.replaceAll('_', ' '), detail: 'Known resource location. This report does not track its owner or guards.' });
    if (effect.kind === 'leylines' && site.kind.type === 'spell_shrine') entries.push({ coord: { ...site.coord }, label: 'Spell-teaching shrine', detail: 'A known place of magical learning. Visit to discover its teaching and any guards.' });
  }
  return { problem: null, entries };
}
