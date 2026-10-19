import { describe, expect, it } from 'vitest';
import { navalDriver, cellIn, GameDriver } from '@pr/testing';
import { canonicalStateHash, courierPlan, quoteAdventureSpell, townGate, seedTownOptions, Tx } from '../src';
import { processSeedGrowth } from '../src/systems/libraryEconomy';

function setup() {
 const d=navalDriver(); d.state.scenario.features={...d.state.scenario.features!,mythicLibraryV2:true};
 const h=d.state.heroes.leader_1!; h.spellbook=true;h.knownSpellIds=['spell2_courier_sigil'];h.mana=50;h.attributes.knowledge=10;
 const towns=Object.values(d.state.towns); const source=towns.find(t=>t.ownerId===h.ownerId)!, dest=towns.find(t=>t.ownerId!==h.ownerId)!;
 dest.ownerId=h.ownerId;d.state.world.sites[dest.siteId]!.owner=h.ownerId;
 h.position=townGate(d.catalog,d.state,source.id);
 const recipient={...structuredClone(h),id:'recipient',name:'Recipient',position:townGate(d.catalog,d.state,dest.id)};d.state.heroes[recipient.id]=recipient;
 const artifact={instanceId:'parcel-item',artifactId:'relic2_ariadne_spool'};h.backpack=[artifact];
 const cast={kind:'CastAdventureSpell' as const,heroId:h.id,spellId:'spell2_courier_sigil',target:h.position,recipientHeroId:recipient.id,artifactInstanceId:artifact.instanceId};
 return {d,h,recipient,artifact,source,dest,cast};
}
const dawn=(d:ReturnType<typeof navalDriver>)=>{d.do({kind:'EndTurn'});d.do({kind:'EndTurn'});};

describe('Courier escrow and weekly seeds',()=>{
 it('escrows exactly one backpack item, survives reload and delivers once at dawn',()=>{
  const {d,h,recipient,artifact,cast}=setup();
  expect(courierPlan(d.catalog,d.state,h,cast).problem).toBeNull();
  d.do(cast);expect(d.state.heroes[h.id]!.backpack).toEqual([]);expect(d.state.heroes[recipient.id]!.backpack).toEqual([]);
  expect(d.state.players[h.ownerId]!.libraryEconomy!.parcel!.artifact).toEqual(artifact);
  const hash=canonicalStateHash(d.state);d.reject(cast);expect(canonicalStateHash(d.state)).toBe(hash);
  d.state=JSON.parse(JSON.stringify(d.state));dawn(d);
  expect(d.state.heroes[recipient.id]!.backpack).toEqual([artifact]);expect(d.state.players[h.ownerId]!.libraryEconomy!.parcel).toBeUndefined();
  dawn(d);expect(d.state.heroes[recipient.id]!.backpack).toHaveLength(1);
 });
 it('refuses quest-bound or unknown items before spending mana',()=>{
  const {d,h,cast}=setup(); h.backpack[0]!.questBound=true;
  const hash=canonicalStateHash(d.state);d.reject(cast);expect(canonicalStateHash(d.state)).toBe(hash);
  delete h.backpack[0]!.questBound;
  expect(quoteAdventureSpell(d.catalog,d.state,h.ownerId,h.id,cast.spellId,h.position,{...cast,artifactInstanceId:'not-owned'}).legal).toBe(false);
 });
 it('returns a failed delivery, and safely stashes it if neither hero can receive it',()=>{
  const {d,h,recipient,artifact,cast}=setup();d.do(cast);
  d.state.heroes[recipient.id]!.position=cellIn(d.state,25,5);dawn(d);
  expect(d.state.heroes[h.id]!.backpack).toEqual([artifact]);
  const second=setup();second.d.do(second.cast);
  second.d.state.heroes[second.h.id]!.status='defeated';second.d.state.heroes[second.recipient.id]!.status='defeated';dawn(second.d);
  const parcel=second.d.state.players[second.h.ownerId]!.libraryEconomy!.parcel!;expect(parcel.status).toBe('stash');
  second.d.state.heroes[second.h.id]!.status='active';second.d.state.heroes[second.h.id]!.position=townGate(second.d.catalog,second.d.state,parcel.stashTownId!);
  second.d.do({kind:'ClaimCourierParcel',heroId:second.h.id});expect(second.d.state.heroes[second.h.id]!.backpack).toEqual([second.artifact]);
  second.d.reject({kind:'ClaimCourierParcel',heroId:second.h.id});
 });
 it('requires an explored connection and never reveals a route through unknown water',()=>{
  const {d,h,cast}=setup();d.state.fog[h.ownerId]!.explored.fill(0);
  const hash=canonicalStateHash(d.state);d.reject(cast);expect(canonicalStateHash(d.state)).toBe(hash);
 });
 it('pays a selected Seed Ring town once per empire/week only with a prior-week visit and active dwelling',()=>{
  const d=GameDriver.mission('three_beacons_m01');d.state.scenario.features={...d.state.scenario.features!,mythicLibraryV2:true};
  const h=d.hero();h.equipment.ring_left={instanceId:'seed',artifactId:'relic2_quetzal_seed_ring'};
  expect(seedTownOptions(d.catalog,d.state,h.id).some(t=>t.id==='asterion')).toBe(true);
  d.do({kind:'SelectSeedTown',heroId:h.id,townId:'asterion'});
  d.state.day=8;const before=d.state.towns.asterion!.population.hoplite!;const tx=new Tx({catalog:d.catalog},d.state,'player');
  processSeedGrowth(tx,2);expect(d.state.towns.asterion!.population.hoplite).toBe(before+2);
  processSeedGrowth(tx,2);expect(d.state.towns.asterion!.population.hoplite).toBe(before+2);
  d.state.day=15;processSeedGrowth(tx,3);expect(d.state.towns.asterion!.population.hoplite).toBe(before+2);
 });
});
