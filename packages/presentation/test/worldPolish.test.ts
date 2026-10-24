import { describe,expect,it } from 'vitest';
import { MAP_FLAG_COLORS,mapFlagId } from '../src/mapFlagStyle';
import { groundPatches,wrappedPatchCenters,GROUND_MOSAIC_SIZE } from '../src/groundVariation';
import { makeNatureSelector,MAP_NATURE_POLICY } from '../src/nature';
import { SCENERY_EXPANSION } from '../src/sceneryExpansion';
describe('world art expansion',()=>{
 it('has 48 distinct placeable scenery paintings with climate and terrain roles',()=>{
  expect(new Set(SCENERY_EXPANSION.map(a=>a.id)).size).toBe(48);
  for(const a of SCENERY_EXPANSION){expect(a.blocking).toBe(false);expect(a.battleUse).toBe('none');}
 });
 it('never puts coastal jetties or freshwater banks on inland boundaries, or mixes fresh and salt plants',()=>{
  const sel=makeNatureSelector(MAP_NATURE_POLICY);
  const used=new Set<string>();
  for(const climate of MAP_NATURE_POLICY.climates)for(let i=0;i<250;i++){
   for(const [a,b,waterKind]of [['rough','plains',null],['forest','marsh',null],['plains','water','sea'],['plains','water','river'],['plains','water','lake']] as const){
    const e=sel.edge({climate,a,b,waterKind,seed:5,q:i,r:8});if(!e)continue;
    if(e.asset.shoreOnly){expect(waterKind).not.toBeNull();expect(e.asset.waterKinds).toContain(waterKind);used.add(e.asset.id);}
   }
  }
  expect(used.has('scenery2.coast.old-jetty')).toBe(true);
  expect(used.has('scenery2.freshwater.cattails')).toBe(true);
 });
 it('maps every player colour and campaign shade to readable standard and forked flags',()=>{
  for(const [name,color]of Object.entries(MAP_FLAG_COLORS)){
   expect(mapFlagId(color,'square')).toBe(`map.flag.standard.${name}`);
   expect(mapFlagId(color,'pennant')).toBe(`map.flag.pennant.${name}`);
  }
  expect(mapFlagId('#b0413e','pennant')).toBe('map.flag.pennant.red');
  expect(mapFlagId('#d9a21b','pennant')).toBe('map.flag.pennant.amber');
 });
 it('makes stable non-grid-aligned overlapping patches and wraps each seam',()=>{
  const p=groundPatches(42,'temperate:plains');expect(p).toEqual(groundPatches(42,'temperate:plains'));
  expect(p).not.toEqual(groundPatches(43,'temperate:plains'));
  expect(new Set(p.map(x=>x.angle)).size).toBe(p.length);
  const corner={x:5,y:6,radius:100,angle:0,mirror:false};
  expect(wrappedPatchCenters(corner)).toEqual(expect.arrayContaining([{x:5,y:6},{x:5+GROUND_MOSAIC_SIZE,y:6},{x:5,y:6+GROUND_MOSAIC_SIZE},{x:5+GROUND_MOSAIC_SIZE,y:6+GROUND_MOSAIC_SIZE}]));
 });
});
