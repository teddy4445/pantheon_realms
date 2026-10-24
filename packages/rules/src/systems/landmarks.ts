/** Deterministic, saved adventure encounters. Added when a new map is created. */
import { AXIAL_DIRECTIONS } from '../core/hex';
import type { ContentCatalog } from '../definitions/catalog';
import type { SiteDefinition, MapEventOptionDefinition } from '../definitions/world';
import type { MatchState } from '../state/match';
import { scenarioMission } from '../resolvers/scenario';
import { planLandmarks, landmarkDistance } from './landmarkPlan';
import { worldWeek } from './services';

/** Return this hero's current-week visit only; old records remain saved but no
 * longer consume the weekly allowance. The shared rules profile defines a week. */
export function landmarkVisit(catalog: ContentCatalog, state: MatchState, heroId: string, siteId: string) {
  const visit = state.world.sites[siteId]?.landmarkVisits?.[heroId];
  return visit?.week === worldWeek(state, catalog.rulesProfile.daysPerWeek) ? visit : null;
}

/** Install deterministic definitions on a fresh match, preserving authored maps.
 * The saved landmarkSites array is the idempotency marker. Waterfall artwork may
 * stand on water, but its actionable site coordinate must have a land approach. */
export function installLandmarks(catalog: ContentCatalog, state: MatchState): void {
  const mission = scenarioMission(catalog, state);
  if (state.world.landmarkSites) return;
  if (!mission || mission.sites.some(s => s.kind.type === 'map_event' && s.kind.landmark)) return;
  const map = state.world.map;
  const sites = mission.sites.map(s => ({ coord: s.coord, archetype: s.kind.type,
    variant: s.kind.type === 'town' ? catalog.townArchetypes[state.towns[s.kind.townId]?.archetypeId ?? '']?.pantheonId : null }));
  const added: SiteDefinition[] = [];
  // Only offer landmarks on the land component reachable from an existing town/hero.
  const reachable = new Set<number>();
  const queue = [...Object.values(state.heroes).map(h => h.position), ...sites.filter(s => s.archetype === 'town').map(s => s.coord)];
  for (let i = 0; i < queue.length; i++) {
    const c = queue[i]!;
    if (c.q < 0 || c.r < 0 || c.q >= map.width || c.r >= map.height) continue;
    const tile = c.r * map.width + c.q;
    if (reachable.has(tile) || !'pfrs'.includes(map.terrain[tile]!)) continue;
    reachable.add(tile);
    for (const d of AXIAL_DIRECTIONS) queue.push({ q: c.q + d.q, r: c.r + d.r });
  }
  const approach = (c: {q: number; r: number}) => AXIAL_DIRECTIONS.map(d => ({ q: c.q + d.q, r: c.r + d.r })).find(c => reachable.has(c.r * map.width + c.q) && sites.every(s => landmarkDistance(c, s.coord) >= 3));
  const planned = planLandmarks(map, sites, () => true, l => l.id.includes('waterfall') ? !!approach(l.coord) : reachable.has(l.coord.r * map.width + l.coord.q));
  for (const l of planned) {
    const kind = l.id.includes('waterfall') ? 'waterfall' : l.id.includes('tree-') ? 'tree' : l.id.includes('ruins-') ? 'ruins' : 'statue';
    const coord = kind === 'waterfall' ? approach(l.coord) : l.coord;
    if (!coord || !reachable.has(coord.r * map.width + coord.q)) continue;
    const id = `landmark:${kind}:${coord.q}:${coord.r}`;
    const name = kind === 'statue' ? 'Sanctuary of Courage' : kind === 'tree' ? 'Sacred Tree' : kind === 'waterfall' ? 'Waters of Renewal' : 'Forgotten Ruins';
    let options: MapEventOptionDefinition[];
    let guard: SiteDefinition['guard'];
    if (kind === 'statue') options = [{ label: 'Receive the blessing', summary: '+2 Attack for your next battle. One active landmark blessing; once per hero each week.', reward: {}, landmarkAction: 'courage' }];
    else if (kind === 'waterfall') options = [{ label: 'Rest beside the falls', summary: 'Restore up to 15 mana, without exceeding your maximum. Once per hero each week.', reward: { mana: 15 } }];
    else if (kind === 'tree') options = [
      { label: 'Learn from the ancient roots', summary: 'Pay 500 gold for up to 500 experience (scenario cap applies). Choose one gift per hero each week.', cost: { gold: 500 }, reward: { questXp: 500 } },
      { label: 'Ask for protection', summary: 'Pay 3 crystal for +2 Defense in your next battle. One active landmark blessing; choose one gift per hero each week.', cost: { crystal: 3 }, reward: {}, landmarkAction: 'protection' },
    ];
    else {
      const pantheon = [...sites].filter(s => s.variant).sort((a,b) => landmarkDistance(coord, a.coord) - landmarkDistance(coord, b.coord))[0]?.variant;
      const creature = Object.values(catalog.creatures).filter(c => c.stats && c.tier === 2 && !c.baseId && (!pantheon || c.pantheonId === pantheon)).sort((a,b) => a.id.localeCompare(b.id))[0];
      if (!creature) continue;
      guard = { army: [{ creatureId: creature.id, count: 12 }], label: 'Ancient guardians', battlefield: 'grove', required: true, reward: { resources: { gold: 1500, crystal: 3 } } };
      options = [
        { label: 'Challenge the guardians', summary: `Fight 12 ${creature.pluralName} for 1,500 gold and 3 crystal. Treasure is awarded only after victory.`, reward: {}, landmarkAction: 'battle' },
        { label: 'Search the outer courtyard', summary: 'Take 300 gold safely. This exhausts the ruins and forfeits the guarded treasure.', reward: { resources: { gold: 300 } } },
      ];
    }
    const text = kind === 'statue' ? 'An ancient guardian watches over this land. Kneel before the monument and carry its courage into battle.' : kind === 'waterfall' ? 'Cool mist quiets your thoughts. The living waters can replenish the magic spent on your journey.' : kind === 'tree' ? 'The roots remember centuries of heroes. Offer a gift for their wisdom or shelter.' : 'Beyond the quiet courtyard, ancient guardians still protect a sealed treasury. Choose how far to venture.';
    added.push({ id, anchorId: id, coord, name, description: text, art: l.id, kind: { type: 'map_event', landmark: kind, title: name, text, options }, ...(guard ? { guard } : {}) });
    state.world.sites[id] = { siteId: id, owner: null, cleared: true, claimed: false, activated: false, visitedBy: [], open: false, guard: guard ? guard.army.map(s => ({ ...s })) : null };
  }
  state.world.landmarkSites = added;
}
