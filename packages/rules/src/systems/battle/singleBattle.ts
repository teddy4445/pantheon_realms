/** Standalone combat: no adventure actors, rewards, progression or invisible commanders. */
import type { ContentCatalog } from '../../definitions/catalog';
import type { BattlefieldArchetype } from '../../definitions/world';
import type { BattleCell } from '../../core/hex';
import { cellKey, footprintCells } from '../../core/hex';
import { deepClone } from '../../core/clone';
import { seedFromLabel } from '../../core/rng';
import { resources } from '../../core/resources';
import { Tx } from '../../engine/tx';
import type { BattleSideId, BattleSideState, BattleState, MatchState } from '../../state/match';
import { BATTLEFIELD_LAYOUTS } from '../../definitions/naval';
import { SINGLE_SHIP_SEA_ENCOUNTER_V2 } from '../../definitions/seaEncounter';
import { boardFromLayout } from './board';
import { buildSiege } from './siege';
import { buildSiegeEngine } from './engine';
import { finishSetup, placeStacks, deploymentZone } from './deployment';
import { generateObstacles, connected } from './factory';
import { battleClimate } from './climate';
import { placementProblem } from './seaBoard';
import { movementClassOf } from './common';
import { armyCompositionMorale } from '../../resolvers/heroes';

export const SINGLE_BATTLE_FORMAT = 'pantheon-single-battle';
export const LAND_BATTLEFIELDS = ['open_field', 'coast_road', 'ridge_pass', 'grove', 'plateau', 'beacon_clearing'] as const;
export type SingleBattleKind = 'land' | 'siege' | 'naval' | 'sea';
export interface SingleArmy {
  pantheonId: string;
  controller: 'human' | 'ai';
  stacks: { creatureId: string; count: number; anchor?: BattleCell; facing?: 1 | -1 }[];
}
export interface SingleBattleSpec {
  format: typeof SINGLE_BATTLE_FORMAT;
  version: 1;
  contentVersion: string;
  name: string;
  seed: string;
  kind: SingleBattleKind;
  terrain: typeof LAND_BATTLEFIELDS[number];
  climate: string;
  rules: 'standard' | 'custom';
  obstacles: 'none' | 'few' | 'many' | BattleCell[];
  fortification: 0 | 1 | 2 | 3;
  structures: Record<string, 'intact' | 'damaged' | 'destroyed'>;
  attacker: SingleArmy;
  defender: SingleArmy;
}

export function singleCreatureAllowed(catalog: ContentCatalog, spec: Pick<SingleBattleSpec, 'kind' | 'rules'>, army: SingleArmy, side: BattleSideId, id: string): boolean {
  const c = catalog.creatures[id];
  if (!c?.stats || c.implementationStatus !== 'implemented') return false;
  const seaOnly = catalog.families[c.familyId]?.availability === 'sea_encounters';
  const movement = movementClassOf(catalog, id);
  if (spec.kind === 'sea' && side === 'defender') return movement !== 'ground';
  if (seaOnly || movement === 'swim') return false;
  return spec.rules === 'custom' || c.pantheonId === army.pantheonId || c.pantheonId === null;
}

export function defaultSingleArmy(catalog: ContentCatalog, pantheonId: string, controller: 'human' | 'ai'): SingleArmy {
  return { pantheonId, controller, stacks: Object.values(catalog.creatures).filter(c => c.pantheonId === pantheonId && c.form === 'base' && c.tier <= 3 && c.stats && c.implementationStatus === 'implemented').sort((a,b) => a.tier-b.tier).slice(0,3).map(c => ({creatureId:c.id,count:[35,24,8][c.tier-1] ?? 8})) };
}

export function defaultSingleBattle(catalog: ContentCatalog): SingleBattleSpec {
  const p = catalog.pantheonOrder.filter(id => catalog.pantheons[id]?.playability === 'playable');
  return { format:SINGLE_BATTLE_FORMAT,version:1,contentVersion:catalog.versions.contentVersion,name:'Single Battle',seed:'ASTERION-42',kind:'land',terrain:'open_field',climate:'temperate',rules:'standard',obstacles:'few',fortification:3,structures:{},attacker:defaultSingleArmy(catalog,p[0]!,'human'),defender:defaultSingleArmy(catalog,p[1] ?? p[0]!,'ai') };
}

/** Validate untrusted imports before any property is used by the factory. */
export function singleBattleIssues(catalog: ContentCatalog, value: unknown): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ['Choose a Single Battle document.'];
  const s = value as SingleBattleSpec;
  const issues: string[] = [];
  if(s.format!==SINGLE_BATTLE_FORMAT || s.version!==1) issues.push('Unsupported battle format or version.');
  if(s.contentVersion!==catalog.versions.contentVersion) issues.push('This preset uses a different content version.');
  if(typeof s.name!=='string' || !s.name.trim() || s.name.length>80) issues.push('Name must contain 1–80 characters.');
  if(typeof s.seed!=='string' || !s.seed.trim() || s.seed.length>128) issues.push('Seed must contain 1–128 characters.');
  if(!['land','siege','naval','sea'].includes(s.kind)) issues.push('Unknown battle type.');
  if(!LAND_BATTLEFIELDS.includes(s.terrain)) issues.push('Unknown terrain.');
  if(s.climate!=='temperate' && !catalog.climates?.[s.climate]) issues.push('Unknown climate.');
  if(!['standard','custom'].includes(s.rules)) issues.push('Unknown rules.');
  if(![0,1,2,3].includes(s.fortification)) issues.push('Unknown fortification level.');
  if(!s.structures || typeof s.structures!=='object' || Array.isArray(s.structures) || Object.entries(s.structures).some(([k,v])=> !['gate','keep','tower_n','tower_s','wall_1','wall_2','wall_3','wall_4'].includes(k) || !['intact','damaged','destroyed'].includes(v))) issues.push('Invalid structure states.');
  if(s.rules==='standard' && s.structures && Object.values(s.structures).some(v=>v!=='intact')) issues.push('Choose Custom rules to change structures.');
  if(Array.isArray(s.obstacles)) {
    if(s.kind!=='land' || s.obstacles.length>60 || s.obstacles.some(c=>!c || !Number.isInteger(c.col)||!Number.isInteger(c.row)||c.col<3||c.col>catalog.rulesProfile.combat.cols-4||c.row<0||c.row>=catalog.rulesProfile.combat.rows) || new Set(s.obstacles.map(c=>c && cellKey(c))).size!==s.obstacles.length) issues.push('Obstacles must be unique central land hexes (maximum 60).');
  } else if(!['none','few','many'].includes(s.obstacles)) issues.push('Invalid obstacles.');
  for(const side of ['attacker','defender'] as const){
    const a=s[side];
    if(!a || typeof a!=='object'){issues.push(`${side}: missing army.`);continue;}
    if(!catalog.pantheons[a.pantheonId] || catalog.pantheons[a.pantheonId]?.playability!=='playable') issues.push(`${side}: choose a playable pantheon.`);
    if(!['human','ai'].includes(a.controller)) issues.push(`${side}: invalid controller.`);
    if(!Array.isArray(a.stacks)||a.stacks.length<1||a.stacks.length>7){issues.push(`${side}: choose 1–7 stacks.`);continue;}
    for(const u of a.stacks){
      if(!u || typeof u!=='object'){issues.push(`${side}: invalid stack.`);continue;}
      if(!singleCreatureAllowed(catalog,s,a,side,u.creatureId)) issues.push(`${side}: ${catalog.creatures[u.creatureId]?.name ?? 'Unknown creature'} is incompatible with this army or battlefield.`);
      if(!Number.isInteger(u.count)||u.count<1||u.count>9999) issues.push(`${side}: quantities must be 1–9999.`);
      if(u.facing!==undefined && u.facing!==1 && u.facing!==-1) issues.push(`${side}: invalid facing.`);
      if(u.anchor && (!Number.isInteger(u.anchor.col)||!Number.isInteger(u.anchor.row))) issues.push(`${side}: invalid placement.`);
    }
  }
  return issues;
}

export function parseSingleBattle(catalog:ContentCatalog,text:string):SingleBattleSpec {
  if(text.length>100000) throw new Error('Preset is too large.');
  const value:unknown=JSON.parse(text);const issues=singleBattleIssues(catalog,value);
  if(issues.length)throw new Error(issues.join('\n'));
  const spec=value as SingleBattleSpec;
  createSingleBattle(catalog,spec); // Geometry, occupancy and connectivity validation too.
  return deepClone(spec);
}

/** A minimal empty world keeps the existing MatchState contract; no adventure scenario is fabricated. */
export function createSingleBattle(catalog:ContentCatalog,input:SingleBattleSpec,preview=false):MatchState {
  const issues=singleBattleIssues(catalog,input);if(issues.length)throw new Error(issues.join('\n'));
  const spec=deepClone(input);
  const state:MatchState={kind:'match',matchId:`single-${seedFromLabel(spec.seed)}`,revision:0,versions:{...catalog.versions},
    standalone:{spec,commands:[]},scenario:{scenarioId:'single-battle',missionId:'single-battle',campaignId:null,name:spec.name,heroHiringEnabled:false,heroHiringDisabledReason:null,purchasableBuildingIds:[],committableGodIds:[],signatureMechanics:false,xpCap:0,protectedHeroIds:[],features:{weeklyEvents:false,interventions:false,expandedContent:true,mythicLibraryV2:true,targetableCatapultV1:true,climateRules:true,seaEncountersV1:true}},
    day:1,activePlayerId:'attacker',playerOrder:['attacker','defender'],players:{},heroes:{},towns:{},
    world:{map:{templateId:'single-battle',templateVersion:1,generatorVersion:'1',seed:0,attempt:0,mode:'golden',width:0,height:0,terrain:'',roads:[],logicalHash:'standalone',biome:spec.climate as MatchState['world']['map']['biome']},sites:{}},
    fog:{attacker:{explored:[]},defender:{explored:[]}},mission:{missionId:'single-battle',campaignId:null,objectives:{},flags:{},counters:{},revealedSiteIds:[]},battle:null,pendingDecisions:[],lastBattleResult:null,processedCommandIds:[],appliedKeys:[],rng:{combat:seedFromLabel(spec.seed+':combat'),layout:seedFromLabel(spec.seed+':layout'),progression:seedFromLabel(spec.seed+':progression')},serial:0,outcome:{status:'running'}};
  const makeSide=(side:BattleSideId):BattleSideState=>{
    const army=spec[side];state.players[side]={id:side,name:side==='attacker'?'Attacker':'Defender',controller:army.controller,role:side==='attacker'?'player':'rival',pantheonId:army.pantheonId,color:side==='attacker'?'#78c8dc':'#dc8c76',wallet:resources(),pantheon:{patronGodId:null,minorGodIds:[]},entitlements:[],eliminated:false};
    return {sideId:side,playerId:side,controller:army.controller,commander:null,scriptedMana:0,castThisRound:false,familyChargesUsed:{},factionMorale:armyCompositionMorale(catalog,army.stacks.map(s=>s.creatureId)).value,retreated:false,surrendered:false,effects:null};
  };
  const layout=spec.kind==='naval'?BATTLEFIELD_LAYOUTS.boarding_two_ships_v1:spec.kind==='sea'?SINGLE_SHIP_SEA_ENCOUNTER_V2:null;
  const battle:BattleState={standalone:true,battleId:'single-battle',encounter:{kind:'standalone',siteId:null,defenderHeroId:null,attackerHeroId:'',destination:{q:0,r:0},label:spec.name},archetype:layout?.id as BattlefieldArchetype ?? spec.terrain,cols:layout?.cols ?? catalog.rulesProfile.combat.cols,rows:layout?.rows ?? catalog.rulesProfile.combat.rows,obstacles:[],sides:{attacker:makeSide('attacker'),defender:makeSide('defender')},stacks:{},round:0,phase:'normal',normalQueue:[],waitQueue:[],activeStackId:null,activeIsBonus:false,status:'active',layoutSeed:state.rng.layout,climate:battleClimate(catalog,state)};
  const tx=new Tx({catalog},state,'attacker');state.battle=battle;
  if(layout)battle.board={...boardFromLayout(layout),...(spec.kind==='sea'?{shipSide:'attacker' as const}:{})};
  else if(spec.kind==='siege'){
    battle.siege=buildSiege(catalog,battle.rows,'single-battle',spec.fortification);
    if(spec.fortification>0)battle.siege.engine=buildSiegeEngine(catalog.rulesProfile);
    for(const s of battle.siege.structures){const v=spec.structures[s.id];if(v==='destroyed')s.hp=0;else if(v==='damaged')s.hp=Math.max(1,s.maxHp-1);}
  } else {
    battle.obstacles=Array.isArray(spec.obstacles)?deepClone(spec.obstacles):spec.obstacles==='none'?[]:generateObstacles(tx,battle);
    if(spec.obstacles==='many'){const more=generateObstacles(tx,battle);battle.obstacles=[...new Map([...battle.obstacles,...more].map(c=>[cellKey(c),c])).values()];}
    if(!connected(battle,new Set(battle.obstacles.map(cellKey))))throw new Error('Obstacles block contact between the armies. Leave a path wide enough for large creatures.');
  }
  for(const side of ['attacker','defender'] as const)placeStacks(tx,battle,side,spec[side].stacks.map((s,slot)=>({spec:s,slot,source:'hero'})));
  // Apply all authored positions together, then validate (allows intentional swaps).
  for(const s of Object.values(battle.stacks)){const u=spec[s.side].stacks[s.sourceSlot]!;if(u.anchor)s.anchor={...u.anchor};if(u.facing)s.facing=u.facing;}
  for(const s of Object.values(battle.stacks)){
    const zone=deploymentZone(catalog,battle,s.side),fp=catalog.creatures[s.creatureId]!.stats!.footprint;
    if(footprintCells(s.anchor,fp,s.facing).some(c=>c.col<zone.minCol||c.col>zone.maxCol))throw new Error(`${s.side}: stay inside the deployment zone.`);
    const why=placementProblem(catalog,battle,{creatureId:s.creatureId,anchor:s.anchor,facing:s.facing,ignoreStackId:s.id,side:s.side});if(why)throw new Error(`${catalog.creatures[s.creatureId]!.name}: ${why}`);
  }
  if(!preview)finishSetup(tx,battle);
  tx.finalize();return state;
}
