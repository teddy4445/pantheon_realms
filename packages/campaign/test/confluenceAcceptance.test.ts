import { describe, it, expect } from 'vitest';
import { loadCatalog } from '@pr/content';
import { createMissionMatch, startCampaign, startNextMission, recordCompletion, restartCurrentMission } from '../src';
import { shipInvariantIssues, terrainAt, canonicalStateHash, axialNeighbors, hexKey } from '@pr/rules';
const catalog=loadCatalog();
describe('Confluence shipped campaigns',()=>{
 it('starts all fourteen chapters at Story, Normal and Hard with six unique natives, valid land sites and recoverable vessels',()=>{
  for(const id of ['worlds_met','ashes_accord']) for(const mid of catalog.campaigns[id]!.missionIds) for(const difficultyId of ['campaign_story','campaign_normal','campaign_hard']){
   const m=catalog.missions[mid]!, s=createMissionMatch(catalog,mid,{matchId:mid,difficultyId}).match;
   expect(shipInvariantIssues(catalog,s),mid).toEqual([]);
   expect(s.scenario.features?.mythicLibraryV2).toBe(true);
   expect(new Set(m.sites.map((x)=>hexKey(x.coord))).size,mid).toBe(m.sites.length);
   for(const site of m.sites) expect(['void','mountain','water'].includes(terrainAt(s.world.map,site.coord)),`${mid}:${site.id}`).toBe(false);
   if(m.coalitionPlayerIds){expect(s.coalition?.playerIds).toHaveLength(6);expect(new Set(m.coalitionPlayerIds.map((p)=>s.players[p]!.pantheonId)).size).toBe(6);}
  }
 });
 it('every required site can be reached by land or the chapter’s connected sea, with alternate local approaches',()=>{
  for(const id of ['worlds_met','ashes_accord']) for(const mid of catalog.campaigns[id]!.missionIds){
   const m=catalog.missions[mid]!, s=createMissionMatch(catalog,mid,{matchId:mid}).match;
   const seen=new Set<string>(),queue=[s.heroes[m.player.hero.heroId]!.position];
   for(let i=0;i<queue.length;i++) {const c=queue[i]!; const k=hexKey(c); if(seen.has(k)||['void','mountain'].includes(terrainAt(s.world.map,c))) continue; seen.add(k);queue.push(...axialNeighbors(c));}
   for(const site of m.sites){expect(seen.has(hexKey(site.coord)),`${mid}:${site.id} disconnected`).toBe(true);expect(axialNeighbors(site.coord).filter(c=>!['void','mountain','water'].includes(terrainAt(s.world.map,c))).length,`${mid}:${site.id} approaches`).toBeGreaterThanOrEqual(2);}
  }
 });
 it.each(['worlds_met','ashes_accord'])('restores %s snapshots exactly once, without off-screen income, regrowth or clock refresh',id=>{
  let run=startCampaign(catalog,id,{runId:`restore:${id}`,startingGodId:'zeus'});
  let treasury=0;
  const savedCounts:Record<string,number>={};
  for(let chapter=0;chapter<6;chapter++){
   const s=run.start.match,m=catalog.missions[s.mission.missionId]!,h=s.heroes[m.player.hero.heroId]!,p=s.players[h.ownerId]!;
   s.day=20+chapter*3;h.army.slots[0]!.count=61+chapter;h.movementPoints=137;h.mana=2;p.wallet.gold=5001+chapter;treasury+=p.wallet.gold;
   const ship=Object.values(s.world.ships!)[0]!;h.position={...ship.coord};ship.heroId=h.id;ship.state='occupied';ship.lastActionTurn=s.day;
   const site=s.world.sites[`cf_${p.pantheonId}_witness_0`]!;site.cleared=true;site.claimed=true;site.guard=null;
   s.towns[m.player.town.townId]!.population[m.player.hero.army[0]!.creatureId]=0;
   s.mission.flags[`cf_${p.pantheonId}_choice_0`]=true;
   savedCounts[h.id]=h.army.slots[0]!.count+8;
   s.outcome={status:'victory',day:s.day};
   run.campaign=recordCompletion(catalog,run.campaign,s,[{heroId:h.id,playerId:p.id,target:catalog.missions[s.mission.missionId]!.sites[0]!.coord}]);
   run=startNextMission(catalog,JSON.parse(JSON.stringify(run.campaign)));
  }
  const s=run.start.match;
  expect(s.coalition?.treasury.gold).toBe(treasury);
  expect(shipInvariantIssues(catalog,s)).toEqual([]);
  for(const [id,n] of Object.entries(savedCounts)){expect(s.heroes[id]!.army.slots[0]!.count).toBe(n);expect(s.heroes[id]!.movementPoints).toBe(137);expect(s.heroes[id]!.mana).toBe(2);}
  expect(Object.values(s.world.ships!)).toHaveLength(6);
  expect(Object.values(s.world.ships!).every((x)=>x.lastActionTurn===1)).toBe(true);
  const restart=restartCurrentMission(catalog,run.campaign);expect(restart.entryHash).toBe(run.start.entryHash);
  expect(canonicalStateHash(restart.match)).toBe(canonicalStateHash(s));
  expect(run.campaign.currentEntryRegions!.every((r)=>r.journeys?.length===1)).toBe(true);
 });
});
