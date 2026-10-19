import { describe, expect, it } from 'vitest';
import { navalDriver, cellIn, GameDriver } from '@pr/testing';
import { establishCoalition, allied, canonicalStateHash, tileRole, quoteRecruitment } from '../src';
function setup() { const d = navalDriver(); const ids = Object.keys(d.state.players).filter((id) => d.state.players[id]!.role !== 'neutral' && Object.values(d.state.heroes).some((h) => h.ownerId === id)); for (const id of ids) d.state.players[id]!.controller = 'human'; establishCoalition(d.state, ids); return { d, ids }; }
describe('shared campaign coalition', () => {
 it('pays each recruitment once and pools each native dawn income once', () => {
  const { d, ids } = setup();
  const before = d.state.coalition!.treasury.gold;
  const q = quoteRecruitment(d.catalog,d.state,ids[0]!,'town_1','hoplite',1,{kind:'garrison'});
  expect(q.legal).toBe(true);
  d.do({kind:'RecruitUnits',townId:'town_1',creatureId:'hoplite',quantity:1,destination:{kind:'garrison'}});
  const paid=d.state.coalition!.treasury.gold;
  expect(paid).toBe(before-q.totalCost.gold);
  for(const id of ids){d.do({kind:'SelectCoalitionSeat',playerId:id});expect(d.state.players[id]!.wallet.gold).toBe(paid);}
  const result=d.do({kind:'EndTurn'});
  const income=result.filter(e=>e.kind==='IncomeCollected').reduce((n,e)=>n+(e.kind==='IncomeCollected'?e.amount.gold:0),0);
  expect(income).toBeGreaterThan(0);
  expect(d.state.coalition!.treasury.gold).toBe(paid+income);
  for(const id of ids)expect(d.state.players[id]!.wallet.gold).toBe(paid+income);
 });
 it('switches native seats without refreshing movement or advancing the day; a shared end advances once', () => {
  const { d, ids } = setup(); const wallets = ids.map((id) => ({ ...d.state.players[id]!.wallet }));
  const h = d.state.heroes.leader_2!; h.movementPoints = 123;
  d.do({ kind: 'SelectCoalitionSeat', playerId: ids[1]! });
  expect(d.state.activePlayerId).toBe(ids[1]); expect(d.state.day).toBe(1); expect(d.state.heroes[h.id]!.movementPoints).toBe(123);
  expect(ids.map((id) => d.state.players[id]!.wallet)).toEqual(wallets);
  d.do({ kind: 'EndTurn' }); expect(d.state.day).toBe(2); expect(d.state.activePlayerId).toBe(ids[0]);
 });
 it('shares explored fog and blocks friendly combat without changing ownership or patron identity', () => {
  const { d, ids } = setup(); const h = d.state.heroes.leader_1!, other = d.state.heroes.leader_2!;
  other.position = cellIn(d.state, 7, 5); expect(allied(d.state, ids[0], ids[1])).toBe(true);
  expect(tileRole(d.catalog, d.state, h.ownerId, other.position, h.id)).toBe('blocked');
  expect(other.ownerId).not.toBe(h.ownerId); expect(d.state.fog[ids[0]!]!.explored).toEqual(d.state.fog[ids[1]!]!.explored);
  const before = canonicalStateHash(d.state); d.reject({ kind: 'SelectCoalitionSeat', playerId: 'not-in-coalition' }); expect(canonicalStateHash(d.state)).toBe(before);
  d.state = JSON.parse(JSON.stringify(d.state)); expect(d.state.coalition?.treasury).toEqual(d.state.players[ids[0]!]!.wallet);
 });
});

describe('Confluence finale commitments',()=>{
 it('delivers a chosen reserve to the named native hero, never to the visiting hero or twice',()=>{
  const d=GameDriver.mission('worlds_met_m07'),mission=d.catalog.missions.worlds_met_m07!;
  const site=mission.sites.find(s=>s.id.endsWith('reserve_0'))!;
  const visitor=d.state.heroes.cf_greek_hero!,recipient=d.state.heroes.cf_norse_hero!;
  visitor.position={...site.coord};const before=recipient.army.slots[0]!.count, own=visitor.army.slots[0]!.count;
  d.do({kind:'ResolveMapEvent',heroId:visitor.id,siteId:site.id,optionIndex:1});
  expect(d.state.heroes[recipient.id]!.army.slots[0]!.count).toBe(before+12);
  expect(d.state.heroes[visitor.id]!.army.slots[0]!.count).toBe(own);
  expect(d.state.mission.flags.cf_act_1).toBe(true);
  const hash=canonicalStateHash(d.state);d.reject({kind:'ResolveMapEvent',heroId:visitor.id,siteId:site.id,optionIndex:0});expect(canonicalStateHash(d.state)).toBe(hash);
 });
 it('requires three consecutive days of control and announces only the three finite counterattacks',()=>{
  const d=GameDriver.mission('ashes_accord_m07');const anchors=Object.keys(d.state.world.sites).filter(id=>id.includes('anchor_'));
  expect(anchors).toHaveLength(3);for(const id of anchors)d.state.world.sites[id]!.owner='cf_greek';d.state.towns.cf_council_town!.ownerId='cf_greek';
  d.state.mission.flags.cf_ritual_started=true;
  const tick=()=>d.do({kind:'SelectCoalitionSeat',playerId:'cf_greek'});
  tick();expect(d.state.mission.timers!.cf_stabilize_timer!.deadlineDay).toBe(4);
  d.state.day=3;for(const id of anchors.slice(0,2))d.state.world.sites[id]!.owner=null;tick();
  expect(d.state.mission.timers!.cf_stabilize_timer!.deadlineDay).toBe(6);
  for(const id of anchors)d.state.world.sites[id]!.owner='cf_greek';
  d.state=JSON.parse(JSON.stringify(d.state));d.state.day=5;tick();expect(d.state.mission.flags.cf_stabilized).not.toBe(true);
  d.state.day=6;tick();expect(d.state.mission.flags.cf_stabilized).toBe(true);
  expect(Object.values(d.state.heroes).filter(h=>h.ai?.dormantUntilFlag?.startsWith('cf_wave_'))).toHaveLength(3);
  for(let n=0;n<3;n++)expect(d.state.mission.flags[`cf_wave_${n}`]).toBe(true);
 });
});
