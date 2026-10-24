import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCatalog } from '@pr/content';
import { restorationTemple, RESTORATION_PANTHEONS } from '@pr/rules';
import { pickSiteSprite, siteSpriteCandidates } from '@pr/presentation/core';
import { v2SiteSpriteUrl } from '../src/app/editorV2Sites';
import { compileCustomMap, customMapFromGenerated, newCustomMap, customRowOffset, validateCustomMap } from '@pr/mapgen';

const catalog=buildCatalog();
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
describe('restoration temple art and editor',()=>{
  it('every temple switches to a different real image without changing its size or ground anchor',()=>{
    const files=new Set<string>();
    for(const pantheon of RESTORATION_PANTHEONS) for(const size of ['small','large'] as const){
      const site=restorationTemple(catalog,pantheon,size,{q:0,r:0},'temple');
      const ruined=pickSiteSprite(siteSpriteCandidates(site,{claimed:false}),'map_event');
      const built=pickSiteSprite(siteSpriteCandidates(site,{claimed:true}),'map_event');
      expect(ruined.id).toBe(`map.site.temple.${pantheon}.${size}.ruined`);
      expect(built.id).toBe(`map.site.temple.${pantheon}.${size}.built`);
      expect(built.def!.anchor).toEqual(ruined.def!.anchor);
      expect(built.def!.pixelsPerHex).toBe(ruined.def!.pixelsPerHex);
      for(const a of [ruined,built]){expect(existsSync(path.join(root,'assets-runtime',a.def!.file))).toBe(true);files.add(a.def!.file);}
      expect(v2SiteSpriteUrl({kind:size==='small'?'restoration_shrine':'restoration_temple',pantheon})).toContain(`${pantheon}-${size}-ruined.webp`);
    }
    expect(files.size).toBe(24);
  });
  it('all twelve editor templates compile and survive export/import with their pantheon and rewards',()=>{
    const base=newCustomMap(catalog,'small','Temple garden');
    const coord=(x:number,y:number)=>({q:x-Math.floor(y/2)+customRowOffset(base.height),r:y});
    const temples=RESTORATION_PANTHEONS.flatMap((pantheon,i)=>(['small','large'] as const).map((size,j)=>({id:`${pantheon}_${size}`,kind:size==='small'?'restoration_shrine' as const:'restoration_temple' as const,pantheon,...coord(3+i*4,4+j*14)})));
    const doc={...base,players:[{pantheonId:'greek'},{pantheonId:'norse'}],sites:[{id:'town_a',kind:'town' as const,owner:0,...coord(4,12)},{id:'town_b',kind:'town' as const,owner:1,...coord(25,12)},...temples]};
    expect(validateCustomMap(catalog,doc).filter(x=>x.severity==='error')).toEqual([]);
    const seats=[{controller:'human' as const},{controller:'ai' as const}];
    const generated=compileCustomMap(catalog,doc,seats);
    const back=customMapFromGenerated(catalog,generated,'Reopened').doc;
    expect(back.sites.filter(x=>x.kind==='restoration_shrine'||x.kind==='restoration_temple')).toHaveLength(12);
    const again=compileCustomMap(catalog,back,seats);
    for(const t of temples){
      const s=again.mission.sites.find(s=>s.id===t.id)!;
      expect(s.kind).toMatchObject({type:'map_event',restoration:{pantheonId:t.pantheon,size:t.kind==='restoration_shrine'?'small':'large'}});
      if(s.kind.type==='map_event')expect(s.kind.options).toHaveLength(3);
    }
  });
});
