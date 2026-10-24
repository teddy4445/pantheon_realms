import {expect,it} from 'vitest';
import {buildCatalog} from '../src';
import {EXPANSION_SPELLS,EXPANSION_MIRACLES} from '../src/common/expansionMagic';
import {EXPANSION_LOOKS} from '../../presentation/src/expansionLooks';
import {axialNeighbors,hexKey} from '@pr/rules';
import {CONFLUENCE_TOWNS,confluenceCoord,type ConfluenceRegion} from '../src/campaign/confluence/world';
const catalog=buildCatalog();
it('delivers 42 attacks in seven equal schools and three equal tiers, plus 12 native miracles with distinct visuals',()=>{
 expect(EXPANSION_SPELLS).toHaveLength(42);expect(EXPANSION_MIRACLES).toHaveLength(12);
 for(const p of ['greek','norse','egyptian','japanese','celtic','mesoamerican',undefined]) {
  const spells=EXPANSION_SPELLS.filter(s=>s.pantheonId===p); expect(spells).toHaveLength(6);
  for(const tier of [1,2,3]) expect(spells.filter(s=>s.tier===tier)).toHaveLength(2);
  if(p) expect(EXPANSION_MIRACLES.filter(m=>m.pantheonIds?.includes(p))).toHaveLength(2);
 }
 expect(new Set(Object.values(EXPANSION_LOOKS).map(l=>JSON.stringify(l))).size).toBe(54);
 for(const spell of EXPANSION_SPELLS) expect(catalog.spells[spell.id]).toBeDefined();
});
it('all Confluence regions have two announced patrols, ten optional sites and a reachable boarding shore',()=>{
 for(const m of Object.values(catalog.missions).filter(m=>['worlds_met','ashes_accord'].includes(m.campaignId??'')&&m.order<7)) {
  expect(m.hostileHeroes.length,m.id).toBeGreaterThanOrEqual(2);
  expect(m.timers?.some(t=>t.id==='frontier_muster'),m.id).toBe(true);
  expect(m.sites.filter(s=>s.id.includes('_expedition_')),m.id).toHaveLength(10);
  const blocked=new Set(m.sites.map(s=>hexKey(s.coord)));
  const gate=confluenceCoord(CONFLUENCE_TOWNS[m.player.pantheonId as ConfluenceRegion].gate);
  const walk=(c:{q:number;r:number})=>!['v','m','w'].includes(m.map!.rows[c.r]?.[c.q]??'v')&&!blocked.has(hexKey(c));
  const queue=[gate],seen=new Set<string>();
  for(let n=0;n<queue.length;n++){const c=queue[n]!;if(seen.has(hexKey(c))||!walk(c))continue;seen.add(hexKey(c));queue.push(...axialNeighbors(c));}
  for(const ship of m.ships??[]) expect(axialNeighbors(ship.coord).some(c=>seen.has(hexKey(c))),m.id+' boarding shore').toBe(true);
 }
});
