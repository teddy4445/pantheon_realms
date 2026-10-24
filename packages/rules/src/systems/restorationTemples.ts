/**
 * Restoration-site definitions and deterministic new-match installation.
 * Definitions reuse map-event choices; world.ts owns payment, eligibility and
 * the one-time claim. Artwork derives its ruined/built state from that claim.
 * Generated definitions are saved so a load never rerolls a sanctuary's position.
 */
import { AXIAL_DIRECTIONS, type HexCoord } from '../core/hex';
import type { ContentCatalog } from '../definitions/catalog';
import type { MapEventOptionDefinition, SiteDefinition } from '../definitions/world';
import type { MatchState } from '../state/match';
import { scenarioMission } from '../resolvers/scenario';
import { landmarkDistance } from './landmarkPlan';

export const RESTORATION_PANTHEONS = ['greek', 'norse', 'egyptian', 'japanese', 'celtic', 'mesoamerican'] as const;
export const RESTORATION_COST = { small: 8, large: 20 } as const;
const TITLES: Record<string, readonly [string, string]> = {
  greek: ['Olive Shrine', 'Temple of the Dawn'], norse: ['Runestone Shrine', 'Hall of the Ancestors'],
  egyptian: ['Lotus Shrine', 'Temple of the Sun'], japanese: ['Wayside Kami Shrine', 'Sanctuary of the Sacred Gate'],
  celtic: ['Oakroot Shrine', 'Hall of the Sacred Grove'], mesoamerican: ['Jade Altar', 'Temple of the Feathered Serpent'],
};
function hash(text: string): number {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

/**
 * Build an authored/editor/generated site without changing match state.
 * The first confirmed offer selects one gift for all players, not one gift per
 * hero. Stable sorting keeps guardian/spell selection independent of catalog
 * insertion order. Availability is checked again by the map-event rules.
 */
export function restorationTemple(catalog: ContentCatalog, pantheonId: string, size: 'small' | 'large', coord: HexCoord, id: string): SiteDefinition {
  const large = size === 'large', favor = RESTORATION_COST[size];
  const name = TITLES[pantheonId]?.[large ? 1 : 0] ?? `${pantheonId} ${large ? 'Temple' : 'Shrine'}`;
  const tier = large ? 4 : 2;
  const creature = Object.values(catalog.creatures).filter(c => c.pantheonId === pantheonId && c.tier === tier && !c.baseId && c.stats).sort((a,b) => a.id.localeCompare(b.id))[0];
  const spellPool = Object.values(catalog.spells).filter(s => s.implementationStatus === 'implemented' && (s.scope ?? 'core') === 'core' && s.access !== 'god_eligibility');
  const native = spellPool.filter(s => s.pantheonId === pantheonId);
  const spell = (native.length ? native : spellPool.filter(s => !s.pantheonId)).sort((a,b) => Math.abs(a.tier - (large ? 3 : 2)) - Math.abs(b.tier - (large ? 3 : 2)) || a.id.localeCompare(b.id))[0];
  const options: MapEventOptionDefinition[] = [{
    label: 'Restore and receive supplies', cost: { favor },
    summary: large ? 'Spend 20 Favor to restore this temple and receive 2,000 Gold, 8 Stone and 5 Crystal.' : 'Spend 8 Favor to restore this shrine and receive 700 Gold, 4 Wood and 3 Stone.',
    reward: { resources: large ? { gold: 2000, stone: 8, crystal: 5 } : { gold: 700, wood: 4, stone: 3 } },
  }];
  if (creature) options.push({ label: 'Restore and welcome guardians', cost: { favor }, summary: `Spend ${favor} Favor to restore this ${large ? 'temple' : 'shrine'}; ${large ? 4 : 8} ${creature.pluralName} join this hero. A matching army stack or free slot is required.`, reward: { creatures: [{ creatureId: creature.id, count: large ? 4 : 8 }] } });
  if (spell) options.push({ label: 'Restore and study its magic', cost: { favor }, summary: `Spend ${favor} Favor to restore this ${large ? 'temple' : 'shrine'} and learn ${spell.name} (tier ${spell.tier}). Requires a spellbook${spell.tier > 2 ? ' and sufficient Wisdom' : ''}; already-known spells cannot be chosen.`, reward: {}, teachSpellId: spell.id });
  const text = `Weather and neglect have broken this ${catalog.pantheons[pantheonId]?.name ?? pantheonId} sanctuary. Offer ${favor} Favor to rebuild it and choose one gift: supplies, guardians, or magical teaching. The restoration and chosen gift belong to the first hero who confirms an offer. Each site can be restored only once, for all heroes and empires.`;
  return { id, anchorId: id, coord, name, description: text, art: `temple.${pantheonId}.${size}`, kind: { type: 'map_event', restoration: { pantheonId, size }, title: name, text, options } };
}

/**
 * Mutate a newly constructed match to add reachable sanctuaries near each native
 * town region. An existing restorationSites array (including []) is the saved
 * installation marker; never regenerate on load. Authored sites take priority,
 * and a missing safe candidate is allowed rather than forcing an unreachable site.
 */
export function installRestorationTemples(catalog: ContentCatalog, state: MatchState): void {
  if (state.world.restorationSites) return;
  const mission = scenarioMission(catalog, state);
  if (!mission) return;
  state.world.restorationSites = [];
  const map = state.world.map, occupied = [...mission.sites];
  const towns = mission.sites.filter(s => s.kind.type === 'town').map(s => ({ coord: s.coord, pantheon: s.kind.type === 'town' ? state.towns[s.kind.townId]?.pantheonId : undefined }));
  const reach = new Set<number>();
  const queue = [...Object.values(state.heroes).filter(h => h.status === 'active').map(h => h.position), ...towns.map(t => t.coord)];
  for (let i=0; i<queue.length; i++) {
    const c=queue[i]!;
    if (c.q<0 || c.r<0 || c.q>=map.width || c.r>=map.height) continue;
    const index=c.r*map.width+c.q;
    if (reach.has(index) || !'pfrs'.includes(map.terrain[index]!)) continue;
    reach.add(index);
    for (const d of AXIAL_DIRECTIONS) queue.push({q:c.q+d.q,r:c.r+d.r});
  }
  const roads = new Set(map.roads.flatMap(edge => edge.split('|')));
  const pantheons = [...new Set(towns.map(t=>t.pantheon).filter((p): p is string => !!p && RESTORATION_PANTHEONS.some(id=>id===p)))].sort();
  for (const pantheon of pantheons) for (const size of ['small','large'] as const) {
    if (mission.sites.some(s=>s.kind.type==='map_event' && s.kind.restoration?.pantheonId===pantheon && s.kind.restoration.size===size)) continue;
    const anchors=towns.filter(t=>t.pantheon===pantheon);
    const target=size==='small'?7:12;
    const candidates: {coord:HexCoord;score:number}[]=[];
    for (const tile of reach) {
      const coord={q:tile%map.width,r:Math.floor(tile/map.width)};
      if (coord.q<2 || coord.r<2 || coord.q>=map.width-2 || coord.r>=map.height-2 || roads.has(`${coord.q},${coord.r}`)) continue;
      if (occupied.some(s=>landmarkDistance(coord,s.coord)<3)) continue;
      if (state.world.restorationSites.some(s=>landmarkDistance(coord,s.coord)<6)) continue;
      const distance=Math.min(...anchors.map(t=>landmarkDistance(coord,t.coord)));
      if (distance < (size==='small'?5:8)) continue;
      const near=[...towns].sort((a,b)=>landmarkDistance(coord,a.coord)-landmarkDistance(coord,b.coord))[0];
      if (near?.pantheon!==pantheon) continue;
      if (Object.values(state.heroes).some(h=>landmarkDistance(coord,h.position)<2)) continue;
      candidates.push({coord,score:Math.abs(distance-target)*1000+hash(`${map.seed}|${pantheon}|${size}|${tile}`)%1000});
    }
    candidates.sort((a,b)=>a.score-b.score || a.coord.r-b.coord.r || a.coord.q-b.coord.q);
    const coord=candidates[0]?.coord;
    if (!coord) continue;
    const id=`restoration:${pantheon}:${size}:${coord.q}:${coord.r}`;
    const def=restorationTemple(catalog,pantheon,size,coord,id);
    state.world.restorationSites.push(def); occupied.push(def);
    state.world.sites[id]={siteId:id,owner:null,cleared:true,claimed:false,activated:false,visitedBy:[],open:false,guard:null};
  }
}
