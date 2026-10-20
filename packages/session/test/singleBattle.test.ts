import { exportSingleBattleReplay, validateSingleBattleReplay } from '../src/singleBattle';
import { describe, it, expect } from 'vitest';
import { GameDriver } from '@pr/testing';
import { createSingleBattle, defaultSingleBattle, defaultSingleArmy, parseSingleBattle, singleBattleIssues, type SingleBattleKind } from '@pr/rules';
import { GameSession } from '../src/session';
import { createEnvelope, checkEnvelope } from '../src/save';
const {catalog} = GameDriver.mission('skirmish_twin_harbors');
const seaId=Object.values(catalog.creatures).find(c=>catalog.families[c.familyId]?.availability==='sea_encounters' && c.stats)!.id;
describe('standalone Single Battle',()=>{
  for(const kind of ['land','siege','naval','sea'] as SingleBattleKind[]) it(`completes ${kind}, saves and leaves no adventure actors or rewards`,()=>{
    const spec=defaultSingleBattle(catalog);spec.kind=kind;
    spec.attacker.controller=spec.defender.controller='ai';
    spec.attacker.stacks=spec.attacker.stacks.slice(0,1);spec.defender.stacks=spec.defender.stacks.slice(0,1);
    if(kind==='sea')spec.defender.stacks=[{creatureId:seaId,count:3}];
    const session=GameSession.newSingleBattle(catalog,spec);
    expect(checkEnvelope(catalog,createEnvelope(catalog,session.snapshot(),{id:'single-test',kind:'manual',name:'Single',savedAt:'2026-10-19'})).status).toBe('ok');
    let steps=0;while(session.state.battle && steps++<1500){const before=session.state.revision;session.stepAI();expect(session.state.revision).toBeGreaterThan(before);}
    expect(session.state.battle).toBeNull();expect(session.state.lastBattleResult).not.toBeNull();
    expect(session.state.heroes).toEqual({});expect(session.state.towns).toEqual({});expect(session.state.lastBattleResult!.xpAwarded).toEqual([]);
    expect(session.needsAI()).toBe(false);
    const replay=exportSingleBattleReplay(session.state);expect(validateSingleBattleReplay(catalog,replay)).toEqual(replay);
    const playback=GameSession.fromBattleReplay(catalog,replay);while(playback.needsAI())playback.stepAI();expect(playback.state).toEqual(session.state);
    const bad={...replay,finalHash:'wrong'};expect(()=>validateSingleBattleReplay(catalog,bad)).toThrow(/checksum/);
    expect(createSingleBattle(catalog,spec)).toEqual(createSingleBattle(catalog,spec));
  },30000);
  it('supports all six pantheons and all fortification levels without commanders',()=>{
    for(const p of catalog.pantheonOrder.filter(p=>catalog.pantheons[p]?.playability==='playable')) for(const level of [0,1,2,3] as const){
      const spec=defaultSingleBattle(catalog);spec.kind='siege';spec.defender=defaultSingleArmy(catalog,p,'human');spec.fortification=level;
      const state=createSingleBattle(catalog,spec);expect(state.battle!.sides.defender.commander).toBeNull();expect(state.battle!.siege!.level).toBe(level);expect(state.battle!.phase).toBe('deployment');
    }
  });
  it('rejects corrupt quantities, incompatible creatures, blocked maps and overlapping placement',()=>{
    const spec=defaultSingleBattle(catalog);spec.attacker.stacks[0]!.count=Infinity;expect(singleBattleIssues(catalog,spec).length).toBeGreaterThan(0);
    spec.attacker.stacks[0]!.count=2;spec.attacker.stacks[0]!.creatureId=seaId;expect(()=>parseSingleBattle(catalog,JSON.stringify(spec))).toThrow();
    const good=defaultSingleBattle(catalog);good.obstacles=Array.from({length:11},(_,row)=>({col:7,row}));expect(()=>createSingleBattle(catalog,good)).toThrow(/block contact/);
    good.obstacles='none';good.attacker.stacks[0]!.anchor={col:0,row:4};good.attacker.stacks[1]!.anchor={col:0,row:4};expect(()=>createSingleBattle(catalog,good)).toThrow(/taken/);
  });
  it('fits seven base and upgraded stacks from every pantheon on land, fortresses and decks',()=>{
    for(const p of catalog.pantheonOrder.filter(p=>catalog.pantheons[p]?.playability==='playable'))for(const form of ['base','upgraded'])for(const kind of ['land','siege','naval'] as SingleBattleKind[]){
      const spec=defaultSingleBattle(catalog);spec.kind=kind;
      const stacks=Object.values(catalog.creatures).filter(c=>c.pantheonId===p&&c.form===form&&c.stats&&c.implementationStatus==='implemented').sort((a,b)=>a.tier-b.tier).slice(0,7).map(c=>({creatureId:c.id,count:5}));
      spec.attacker={pantheonId:p,controller:'human',stacks};spec.defender={pantheonId:p,controller:'human',stacks};
      const state=createSingleBattle(catalog,spec);expect(Object.keys(state.battle!.stacks)).toHaveLength(14);
    }
  });
  it('resumes a damaged siege deterministically and rejects adventure orders',()=>{
    const spec=defaultSingleBattle(catalog);spec.kind='siege';spec.rules='custom';spec.structures={gate:'destroyed',keep:'damaged',wall_1:'destroyed'};spec.attacker.controller=spec.defender.controller='ai';
    const original=GameSession.newSingleBattle(catalog,spec);for(let i=0;i<8;i++)original.stepAI();
    const resumed=GameSession.fromSnapshot(catalog,JSON.parse(JSON.stringify(original.snapshot())));
    expect(resumed.dispatch({kind:'EndTurn'}).ok).toBe(false);
    for(let i=0;i<1500&&original.needsAI();i++){original.stepAI();resumed.stepAI();}
    expect(original.state.battle).toBeNull();expect(resumed.state).toEqual(original.state);
  });
});
