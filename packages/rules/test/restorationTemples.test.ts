import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import { createEnvelope, checkEnvelope } from '@pr/session';
import { installRestorationTemples, restorationTemple, RESTORATION_PANTHEONS, quoteMapEvent, scenarioMission } from '../src';

function fixture(pantheon='greek', size:'small'|'large'='small') {
  const d=GameDriver.mission('skirmish_twin_harbors');
  const id=d.state.activePlayerId;
  const heroId=Object.values(d.state.heroes).find(h=>h.ownerId===id && h.status==='active')!.id;
  const site=restorationTemple(d.catalog,pantheon,size,{q:10,r:10},'test-restoration');
  (d.state.world.restorationSites??=[]).push(site);
  d.state.world.sites[site.id]={siteId:site.id,owner:null,cleared:true,claimed:false,activated:false,visitedBy:[],open:false,guard:null};
  const hero=()=>d.state.heroes[heroId]!;
  hero().position={...site.coord}; hero().spellbook=true; hero().knownSpellIds=[];
  d.state.players[id]!.wallet.favor=100;
  const quote=(optionIndex:number)=>quoteMapEvent(d.catalog,d.state,id,heroId,site.id,optionIndex);
  const choose=(optionIndex:number)=>d.do({kind:'ResolveMapEvent',heroId,siteId:site.id,optionIndex});
  return {d,id,heroId,hero,site,quote,choose};
}

describe('restorable pantheon temples',()=>{
  it('offers resources, native creatures and implemented magic for all twelve templates',()=>{
    const d=GameDriver.mission('skirmish_twin_harbors');
    for(const pantheon of RESTORATION_PANTHEONS) for(const size of ['small','large'] as const){
      const site=restorationTemple(d.catalog,pantheon,size,{q:1,r:1},`${pantheon}-${size}`);
      if(site.kind.type!=='map_event')throw new Error('Expected event');
      expect(site.kind.options).toHaveLength(3);
      expect(site.kind.restoration).toEqual({pantheonId:pantheon,size});
      for(const option of site.kind.options)expect(option.cost?.favor).toBe(size==='small'?8:20);
      expect(d.catalog.creatures[site.kind.options[1]!.reward.creatures![0]!.creatureId]!.pantheonId).toBe(pantheon);
      expect(d.catalog.spells[site.kind.options[2]!.teachSpellId!]!.implementationStatus).toBe('implemented');
    }
  });
  it('charges once, grants the selected supplies and persists restored state through save/load',()=>{
    const {d,id,site,choose,quote}=fixture(); const gold=d.state.players[id]!.wallet.gold;
    choose(0);
    expect(d.state.players[id]!.wallet.favor).toBe(92);
    expect(d.state.players[id]!.wallet.gold).toBe(gold+700);
    expect(d.state.world.sites[site.id]).toMatchObject({claimed:true,open:true,chosenOption:0});
    d.state=JSON.parse(JSON.stringify(d.state));
    const before=JSON.stringify(d.state);
    expect(quote(1).legal).toBe(false);
    d.reject({kind:'ResolveMapEvent',heroId:Object.values(d.state.heroes).find(h=>h.ownerId===id)!.id,siteId:site.id,optionIndex:0});
    expect(JSON.stringify(d.state)).toBe(before);
    d.state.day+=14;
    expect(quote(0).legal).toBe(false);
    const env=createEnvelope(d.catalog,{match:d.state,campaign:null},{id:'restored',kind:'manual',name:'Restored',savedAt:new Date(0).toISOString()});
    expect(checkEnvelope(d.catalog,JSON.parse(JSON.stringify(env))).status).toBe('ok');
    expect(scenarioMission(d.catalog,d.state)!.sites.some(s=>s.id===site.id)).toBe(true);
  });
  it('rejects insufficient Favor and remote visits without paying or changing the ruin',()=>{
    const {d,id,hero,heroId,site,quote}=fixture();
    d.state.players[id]!.wallet.favor=7;
    const before=JSON.stringify(d.state);
    expect(quote(0).code).toBe('insufficient_resources');
    d.reject({kind:'ResolveMapEvent',heroId,siteId:site.id,optionIndex:0});
    expect(JSON.stringify(d.state)).toBe(before);
    d.state.players[id]!.wallet.favor=100;hero().position={q:0,r:0};
    expect(quote(0).code).toBe('not_present');
  });
  it('blocks full armies and delivers only the chosen guardians when space exists',()=>{
    const {d,id,site,hero,quote,choose}=fixture('egyptian','large');
    if(site.kind.type!=='map_event')throw new Error('Expected event');
    const gift=site.kind.options[1]!.reward.creatures![0]!;
    hero().army.slots=Array.from({length:7},(_,i)=>({stackId:`full-${i}`,creatureId:'hoplite',count:1}));
    expect(quote(1).code).toBe('no_capacity');
    expect(d.state.players[id]!.wallet.favor).toBe(100);
    hero().army.slots[6]=null;const gold=d.state.players[id]!.wallet.gold;
    choose(1);
    expect(hero().army.slots[6]).toMatchObject({creatureId:gift.creatureId,count:4});
    expect(d.state.players[id]!.wallet.gold).toBe(gold);
    expect(d.state.players[id]!.wallet.favor).toBe(80);
  });
  it('requires a spellbook, rejects known spells, and teaches exactly once',()=>{
    const {d,id,site,hero,quote,choose}=fixture('japanese');
    if(site.kind.type!=='map_event')throw new Error('Expected event');
    const spell=site.kind.options[2]!.teachSpellId!;
    hero().spellbook=false;expect(quote(2).reason).toContain('spellbook');
    hero().spellbook=true;hero().knownSpellIds=[spell];expect(quote(2).reason).toContain('already knows');
    hero().knownSpellIds=[];choose(2);
    expect(hero().knownSpellIds).toEqual([spell]);
    expect(d.state.players[id]!.wallet.favor).toBe(92);
    expect(quote(2).legal).toBe(false);
  });
  it('requires Wisdom for a tier-three large-temple teaching and does not consume its other offers',()=>{
    const {site,hero,quote}=fixture('greek','large');
    if(site.kind.type!=='map_event')throw new Error('Expected event');
    hero().skills=[];
    expect(quote(2).reason).toContain('Wisdom');
    expect(quote(0).legal).toBe(true);
    hero().skills=[{skillId:'wisdom',rank:1}];
    expect(quote(2).legal).toBe(true);
  });
  it('places both sizes for a map pantheon on clear reachable land and installs idempotently',()=>{
    const d=GameDriver.mission('skirmish_twin_harbors');
    const sites=d.state.world.restorationSites!;
    expect(sites.length).toBeGreaterThanOrEqual(2);
    expect(new Set(sites.map(s=>s.kind.type==='map_event'?s.kind.restoration?.size:null))).toEqual(new Set(['small','large']));
    for(const s of sites){
      expect('pfrs').toContain(d.state.world.map.terrain[s.coord.r*d.state.world.map.width+s.coord.q]);
      expect(d.state.world.map.roads.some(r=>r.split('|').includes(`${s.coord.q},${s.coord.r}`))).toBe(false);
      expect(scenarioMission(d.catalog,d.state)!.sites.filter(x=>x.coord.q===s.coord.q&&x.coord.r===s.coord.r)).toHaveLength(1);
    }
    const before=JSON.stringify(d.state);installRestorationTemples(d.catalog,d.state);expect(JSON.stringify(d.state)).toBe(before);
  });
});
