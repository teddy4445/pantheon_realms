import { describe, it, expect } from 'vitest';
import { GameDriver } from '@pr/testing';
import { installLandmarks, scenarioMission, quoteMapEvent, maxMana, effectiveAttributes, type SiteDefinition } from '../src';
import { createEnvelope, checkEnvelope } from '@pr/session';

function fixture() {
  const d = GameDriver.mission('skirmish_twin_harbors');
  const m = d.state.world.map;
  const width = Math.max(64, m.width), height = Math.max(48, m.height);
  const cells = Array(width * height).fill('p');
  for (let r = 5; r < height - 5; r++) { cells[r*width+25] = 'w'; cells[r*width+26] = 'm'; }
  d.state.world.map = { ...m, width, height, roads: [], terrain: cells.join('') };
  for (const s of d.state.world.landmarkSites ?? []) delete d.state.world.sites[s.id];
  delete d.state.world.landmarkSites;
  installLandmarks(d.catalog, d.state);
  const hero = Object.values(d.state.heroes).find(h => h.ownerId === d.state.activePlayerId && h.status === 'active')!;
  for (const f of Object.values(d.state.fog)) f.explored = cells.map(() => 1);
  const site = (kind: string) => d.state.world.landmarkSites!.find(s => s.kind.type === 'map_event' && s.kind.landmark === kind)!;
  const stand = (s: SiteDefinition) => { d.state.heroes[hero.id]!.position = { ...s.coord }; };
  const choose = (s: SiteDefinition, optionIndex = 0) => d.do({ kind: 'ResolveMapEvent', heroId: hero.id, siteId: s.id, optionIndex });
  return { d, heroId: hero.id, site, stand, choose };
}

describe('visitable landmarks', () => {
  it('places all four kinds on reachable land, saves definitions, and installs idempotently', () => {
    const {d,site} = fixture();
    for (const k of ['statue','waterfall','tree','ruins']) {
      const s = site(k); expect(s, k).toBeDefined();
      expect('pfrs').toContain(d.state.world.map.terrain[s.coord.r*d.state.world.map.width+s.coord.q]);
      expect(scenarioMission(d.catalog,d.state)!.sites.some(x=>x.id===s.id)).toBe(true);
    }
    const before = JSON.stringify(d.state);
    installLandmarks(d.catalog,d.state);
    expect(JSON.stringify(d.state)).toBe(before);
    const env = createEnvelope(d.catalog, {match:d.state,campaign:null}, {id:'landmarks',kind:'manual',name:'Landmarks',savedAt:new Date(0).toISOString()});
    expect(checkEnvelope(d.catalog,JSON.parse(JSON.stringify(env))).status).toBe('ok');
  });
  it('limits gifts per hero per week, persists through reload, prevents stacking, and consumes courage in battle', () => {
    const {d,heroId,site,stand,choose} = fixture();
    const statue = site('statue'); stand(statue); choose(statue);
    expect(d.state.heroes[heroId]!.landmarkBlessing?.kind).toBe('courage');
    d.state = JSON.parse(JSON.stringify(d.state));
    expect(quoteMapEvent(d.catalog,d.state,d.state.activePlayerId,heroId,statue.id,0).legal).toBe(false);
    const other = {...structuredClone(d.state.heroes[heroId]!), id:'second-visitor'}; delete other.landmarkBlessing;
    d.state.heroes[other.id]=other;
    expect(quoteMapEvent(d.catalog,d.state,other.ownerId,other.id,statue.id,0).legal).toBe(true);
    d.state.day += d.catalog.rulesProfile.daysPerWeek;
    expect(quoteMapEvent(d.catalog,d.state,d.state.activePlayerId,heroId,statue.id,0).reason).toContain('blessing');
    const attack = effectiveAttributes(d.catalog,d.state,d.state.heroes[heroId]!).attack.total;
    const ruins=site('ruins'); stand(ruins); choose(ruins);
    expect(d.state.battle!.sides.attacker.commander!.attack).toBe(attack+2);
    expect(d.state.heroes[heroId]!.landmarkBlessing).toBeUndefined();
    expect(d.state.world.sites[ruins.id]!.claimed).toBe(false);
  });
  it('water restores only missing mana and renews next week with a new reward key', () => {
    const {d,heroId,site,stand,choose}=fixture(); const s=site('waterfall'); stand(s);
    const maximum=maxMana(d.catalog,d.state,d.state.heroes[heroId]!);
    d.state.heroes[heroId]!.mana=maximum;
    expect(quoteMapEvent(d.catalog,d.state,d.state.activePlayerId,heroId,s.id,0).reason).toContain('full');
    d.state.heroes[heroId]!.mana=maximum-2; choose(s);
    expect(d.state.heroes[heroId]!.mana).toBe(maximum);
    d.state.day+=d.catalog.rulesProfile.daysPerWeek; d.state.heroes[heroId]!.mana=0; choose(s);
    expect(d.state.heroes[heroId]!.mana).toBe(Math.min(15,maximum));
  });
  it('tree charges only an affordable confirmed choice and blocks the second weekly gift', () => {
    const {d,heroId,site,stand,choose}=fixture(); const s=site('tree'); stand(s);
    const wallet=d.state.players[d.state.activePlayerId]!.wallet;
    wallet.crystal=0;
    d.reject({kind:'ResolveMapEvent',heroId,siteId:s.id,optionIndex:1});
    expect(d.state.world.sites[s.id]!.landmarkVisits).toBeUndefined();
    wallet.crystal=5; choose(s,1);
    expect(d.state.players[d.state.activePlayerId]!.wallet.crystal).toBe(2);
    expect(d.state.heroes[heroId]!.landmarkBlessing?.kind).toBe('protection');
    d.reject({kind:'ResolveMapEvent',heroId,siteId:s.id,optionIndex:0});
  });
  it('safe ruin reward is global and final; fighting pays only on victory', () => {
    let f=fixture(); let {d,heroId,site,stand,choose}=f; let s=site('ruins'); stand(s);
    let gold=d.state.players[d.state.activePlayerId]!.wallet.gold; choose(s,1);
    expect(d.state.players[d.state.activePlayerId]!.wallet.gold).toBe(gold+300);
    d.reject({kind:'ResolveMapEvent',heroId,siteId:s.id,optionIndex:0});
    f=fixture(); ({d,heroId,site,stand,choose}=f); s=site('ruins'); stand(s);
    d.state.heroes[heroId]!.army.slots.find(Boolean)!.count=500;
    gold=d.state.players[d.state.activePlayerId]!.wallet.gold; choose(s);
    expect(d.state.players[d.state.activePlayerId]!.wallet.gold).toBe(gold);
    d.autoBattle();
    expect(d.state.players[d.state.activePlayerId]!.wallet.gold).toBe(gold+1500);
    expect(d.state.world.sites[s.id]!.claimed).toBe(true);
  });
});

describe('landmark battle and cost boundaries', () => {
  it('protection applies to a defending hero and is consumed once', () => {
    const {d,heroId}=fixture();
    const attacker=d.state.heroes[heroId]!;
    const defender=Object.values(d.state.heroes).find(h=>h.ownerId!==attacker.ownerId&&h.status==='active')!;
    attacker.position={q:10,r:10}; attacker.movementPoints=5000;
    defender.position={q:11,r:10}; defender.landmarkBlessing={kind:'protection',source:'Sacred Tree'};
    const defense=effectiveAttributes(d.catalog,d.state,defender).defense.total;
    d.do({kind:'MoveHero',heroId,destination:defender.position,confirmEncounter:true});
    expect(d.state.battle!.sides.defender.commander!.defense).toBe(defense+2);
    expect(d.state.heroes[defender.id]!.landmarkBlessing).toBeUndefined();
  });
  it('retreat leaves guarded treasure unpaid and available to a future victor', () => {
    const {d,heroId,site,stand,choose}=fixture(); const s=site('ruins'); stand(s);
    const playerId=d.state.activePlayerId, gold=d.state.players[playerId]!.wallet.gold;
    choose(s);
    for(let i=0;i<40&&d.state.battle?.sides[d.state.battle.stacks[d.state.battle.activeStackId ?? '']?.side ?? 'attacker'].playerId!==playerId;i++) d.autoBattleStep();
    d.do({kind:'BattleRetreat'},playerId);
    expect(d.state.players[playerId]!.wallet.gold).toBe(gold);
    expect(d.state.world.sites[s.id]!.claimed).toBe(false);
    expect(d.state.world.sites[s.id]!.cleared).toBe(false);
    expect(d.state.world.sites[s.id]!.guard!.length).toBeGreaterThan(0);
  });
  it('tree experience is paid once, honors the cap, and rejects remote visits', () => {
    const {d,heroId,site,stand,choose}=fixture(); const s=site('tree');
    expect(quoteMapEvent(d.catalog,d.state,d.state.activePlayerId,heroId,s.id,0).code).toBe('not_present');
    stand(s); const h=d.state.heroes[heroId]!; const gold=d.state.players[h.ownerId]!.wallet.gold;
    h.xp=0; d.state.scenario.xpCap=100; choose(s);
    expect(d.state.heroes[heroId]!.xp).toBe(100);
    expect(d.state.players[h.ownerId]!.wallet.gold).toBe(gold-500);
    d.state.day+=d.catalog.rulesProfile.daysPerWeek;
    expect(quoteMapEvent(d.catalog,d.state,h.ownerId,heroId,s.id,0).reason).toContain('cap');
  });
});
