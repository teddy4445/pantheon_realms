import { describe,it,expect } from 'vitest';
import { Container } from 'pixi.js';
import { SiteAmbient } from '../src/siteAmbient';
import { AMBIENT_EFFECTS,siteAmbientEffects,ambientVisible } from '../src/siteAmbientPlan';
const sites=[['town',''],['watchtower',''],['camp',''],['spell_shrine',''],['learning_stone',''],['quest_hut',''],['key_tent',''],['portal',''],['relic',''],['treasure_chest',''],['event_site','map.site.landmark.statue-greek'],['event_site','map.site.landmark.tree-sacred-oak'],['event_site','map.site.landmark.waterfall-temperate'],['event_site','map.site.landmark.ruins-marble'],['sluice',''],['gold_mine',''],['quarry','']];
describe('living map ambient effects',()=>{
  it('connects all 26 new effects to existing map elements, not just unused definitions',()=>{
    const used=new Set(sites.flatMap(([kind,art])=>siteAmbientEffects(kind!,art)));
    expect(used).toEqual(new Set(AMBIENT_EFFECTS));
    expect(used.size).toBeGreaterThanOrEqual(18);
    expect(siteAmbientEffects('sea_monster')).toEqual([]);
    expect(siteAmbientEffects('event_site','map.site.landmark.statue-norse')).toEqual(['statue-votives']);
  });
  it('animates every pool without allocating children; hides and freezes in reduced motion',()=>{
    for(const [kind,art] of sites){
      const parent=new Container(), life=new SiteAmbient(parent,kind!,art!,kind!,100);
      life.tick(16,true);
      const sample=()=>life.root.children.map(c=>[c.x,c.y,c.rotation,c.alpha,c.scale.x,c.scale.y,c.skew.x]);
      const before=sample(), count=life.root.children.length;
      for(let i=0;i<60;i++)life.tick(16,true);
      expect(sample(),kind).not.toEqual(before);
      expect(life.root.children.length).toBe(count);
      expect(life.particleCount).toBeLessThanOrEqual(12);
      life.tick(16,false);const frozen=life.debug().phase;
      life.tick(1000,false);expect(life.debug().phase).toBe(frozen);expect(life.root.visible).toBe(false);
      for(const c of life.root.children)expect([c.x,c.y,c.rotation,c.alpha,c.scale.x,c.scale.y].every(Number.isFinite)).toBe(true);
      parent.destroy({children:true});
    }
  });
  it('requires current visibility, a loaded sprite, viewport inclusion and enabled motion',()=>{
    expect(ambientVisible(true,true,true,true,true)).toBe(true);
    for(let i=0;i<5;i++){const flags=[true,true,true,true,true];flags[i]=false;expect(ambientVisible(flags[0]!,flags[1]!,flags[2]!,flags[3]!,flags[4]!)).toBe(false);}
  });
});
