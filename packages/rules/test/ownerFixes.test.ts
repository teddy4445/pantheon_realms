import { describe, it, expect } from 'vitest';
import { GameDriver } from '@pr/testing';
import { heroStartingArmy, weeklyGrowthFor } from '../src';

describe('personal starting armies and first gods', () => {
  it('gives every specialist their creature and larger lower-tier escorts', () => {
    const { catalog } = GameDriver.mission('skirmish_twin_harbors');
    for (const hero of Object.values(catalog.heroes)) {
      const army = heroStartingArmy(catalog, hero.id);
      if (!army.length) continue;
      expect(army.length).toBeLessThanOrEqual(7);
      expect(army.every(s => s.count > 0)).toBe(true);
      const specialty = hero.specialty?.familyId;
      if (specialty) expect(army.some(s => catalog.creatures[s.creatureId]!.familyId === specialty)).toBe(true);
      for (const a of army) for (const b of army) if (catalog.creatures[a.creatureId]!.tier < catalog.creatures[b.creatureId]!.tier) expect(a.count).toBeGreaterThanOrEqual(b.count);
    }
    for (const pantheon of Object.values(catalog.pantheons)) {
      const armies = pantheon.heroIds.map(id => JSON.stringify(heroStartingArmy(catalog, id)));
      expect(new Set(armies).size).toBe(armies.length);
    }
    for (const god of Object.values(catalog.gods).filter(g => g.exclusivityGroup === 'first_minor')) {
      const building = god.requirements.find(r => r.type === 'has_building');
      expect(building?.type === 'has_building' && catalog.buildings[building.buildingId]?.level).toBe(1);
    }
  });
});

describe('hidden invocations', () => {
  it('applies the eleven new gifts exactly, without changing opponents', () => {
    const d = GameDriver.mission('skirmish_twin_harbors');
    const owner = d.state.activePlayerId;
    const foreign = () => JSON.stringify({
      heroes:Object.values(d.state.heroes).filter(h=>h.ownerId!==owner),
      towns:Object.values(d.state.towns).filter(t=>t.ownerId!==owner),
      players:Object.values(d.state.players).filter(p=>p.id!==owner),
    });
    const enemy = foreign();
    const wallet = {...d.player.wallet};
    for(const effect of ['gold','wood','stone','crystal','favor'] as const) d.do({kind:'InvokeCheat',effect});
    expect(d.player.wallet).toEqual({gold:wallet.gold+50000,wood:wallet.wood+250,stone:wallet.stone+250,crystal:wallet.crystal+100,favor:wallet.favor+100});
    const hero = Object.values(d.state.heroes).find(h=>h.ownerId===owner && h.status==='active')!;
    const attrs = {...hero.attributes};
    for(const effect of ['attack','defense','power','knowledge'] as const) d.do({kind:'InvokeCheat',effect});
    for(const key of ['attack','defense','power','knowledge'] as const) expect(d.state.heroes[hero.id]!.attributes[key]).toBe(attrs[key]+5);
    const counts = d.state.heroes[hero.id]!.army.slots.map(s=>s?.count);
    d.do({kind:'InvokeCheat',effect:'reinforcements'});
    d.state.heroes[hero.id]!.army.slots.forEach((s,i)=>expect(s?.count).toBe(counts[i]===undefined?undefined:counts[i]!+25));
    const town = Object.values(d.state.towns).find(t=>t.ownerId===owner)!;
    const pop = {...town.population};
    d.do({kind:'InvokeCheat',effect:'population'});
    for(const key of Object.keys(pop)) expect(d.state.towns[town.id]!.population[key]).toBe(pop[key]!+25);
    expect(foreign()).toBe(enemy);
  });
  it('grants exact resources, movement and mana only to the acting player', () => {
    const d = GameDriver.mission('skirmish_twin_harbors');
    const before = { ...d.player.wallet };
    const enemy = JSON.stringify(Object.values(d.state.heroes).filter(h => h.ownerId !== d.state.activePlayerId));
    d.do({ kind: 'InvokeCheat', effect: 'resources' });
    expect(d.player.wallet).toEqual({ gold: before.gold+10000, wood: before.wood+50, stone: before.stone+50, crystal: before.crystal+25, favor: before.favor+25 });
    d.do({ kind: 'InvokeCheat', effect: 'movement' });
    for (const h of Object.values(d.state.heroes).filter(h => h.ownerId === d.state.activePlayerId)) expect(h.movementPoints).toBe(10000);
    d.do({ kind: 'InvokeCheat', effect: 'mana' });
    expect(JSON.stringify(Object.values(d.state.heroes).filter(h => h.ownerId !== d.state.activePlayerId))).toBe(enemy);
  });
  it('maxes only owned towns and adds matching weekly troops while replacing foreign creatures', () => {
    const d = GameDriver.mission('skirmish_twin_harbors');
    const townId = Object.values(d.state.towns).find(t => t.ownerId === d.state.activePlayerId)!.id;
    const enemy = JSON.stringify(Object.values(d.state.towns).filter(t => t.ownerId !== d.state.activePlayerId));
    d.do({ kind: 'InvokeCheat', effect: 'buildings' });
    let town = d.state.towns[townId]!;
    for (const slot of d.catalog.townArchetypes[town.archetypeId]!.slots) expect(town.buildings[slot.id]).toBe(d.catalog.buildings[slot.chain.at(-1)!]!.level);
    d.do({ kind: 'InvokeCheat', effect: 'creatures' });
    town = d.state.towns[townId]!;
    expect(town.garrison.slots.filter(Boolean)).toHaveLength(7);
    const first = town.garrison.slots.map(s => s!.count);
    d.do({ kind: 'InvokeCheat', effect: 'creatures' });
    town = d.state.towns[townId]!;
    town.garrison.slots.forEach((s,i) => expect(s!.count).toBe(first[i]! + weeklyGrowthFor(d.catalog, town, d.catalog.creatures[s!.creatureId]!.familyId, d.state)));
    expect(JSON.stringify(Object.values(d.state.towns).filter(t => t.ownerId !== d.state.activePlayerId))).toBe(enemy);
    d.do({ kind: 'InvokeCheat', effect: 'explore' });
    expect(d.state.fog[d.state.activePlayerId]!.explored.every(n => n === 1)).toBe(true);
    d.do({ kind: 'InvokeCheat', effect: 'upgrades' });
  });
});
