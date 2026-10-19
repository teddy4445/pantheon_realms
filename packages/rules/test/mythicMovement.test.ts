import { describe, expect, it } from 'vitest';
import { navalDriver, cellIn } from '@pr/testing';
import { canonicalStateHash, cellIndex, edgeKey, hexKey, quoteMovement, quoteTravel, quoteEmbark, reachableTiles, routeStepDays, type EquipSlot, type HexCoord } from '../src';
import { movementLedger, movementPricing, priceMovementPath } from '../src/resolvers/libraryMovement';

function setup(items: string[] = []) {
  const d = navalDriver(); d.state.scenario.features = { ...d.state.scenario.features!, mythicLibraryV2: true };
  const h = d.state.heroes.leader_1!; h.position = cellIn(d.state, 2, 5); h.movementPoints = 4000; h.mana = 100; h.attributes.knowledge = 20; h.spellbook = true;
  h.knownSpellIds = ['spell2_road_mending', 'spell2_hares_borrowed_path', 'spell2_silt_to_stone', 'spell2_aeolian_tack'];
  items.forEach((id, i) => { h.equipment[`misc_${i+1}` as EquipSlot] = { instanceId: `item-${i}`, artifactId: id }; });
  return { d, h };
}
function paint(d: ReturnType<typeof navalDriver>, cells: HexCoord[], code: string) {
  const map = d.state.world.map, terrain = map.terrain.split('');
  for (const c of cells) terrain[cellIndex(map, c)] = code;
  d.state.world.map = { ...map, terrain: terrain.join('') };
}

describe('bounded library movement', () => {
  it('quotes and commits the same rough-step exemptions, preserves quotas after reload/equipment transfer, and never waives base cost', () => {
    const { d, h } = setup(['relic2_ariadne_spool']);
    const steps = Array.from({ length: 5 }, (_, i) => cellIn(d.state, 3+i, 5));
    paint(d, steps, 'r');
    const before = canonicalStateHash(d.state), q = quoteMovement(d.catalog, d.state, h.id, steps[2]!);
    expect(q.totalCost).toBe(3 * d.catalog.rulesProfile.terrainCost.plains!);
    expect(reachableTiles(d.catalog, d.state, h.id).get(hexKey(steps[2]!))).toBe(q.totalCost);
    expect(canonicalStateHash(d.state)).toBe(before);
    d.do({ kind: 'MoveHero', heroId: h.id, destination: steps[2]! });
    expect(d.state.heroes[h.id]!.movementPoints).toBe(4000-q.totalCost);
    d.state = JSON.parse(JSON.stringify(d.state));
    const live = d.state.heroes[h.id]!;
    delete live.equipment.misc_1; live.equipment.misc_2 = { instanceId: 'replacement', artifactId: 'relic2_ariadne_spool' };
    expect(quoteMovement(d.catalog, d.state, h.id, steps[3]!).totalCost).toBe(d.catalog.rulesProfile.terrainCost.rough);
    expect(live.libraryAdventure!.movementLedger!.uses.relic2_ariadne_spool).toBe(3);
  });
  it('caps overlapping road percentages at 30 and expires magic at dawn without losing the destination quote', () => {
    const { d, h } = setup(['relic2_pilgrim_mileboots']);
    const steps = Array.from({ length: 5 }, (_, i) => cellIn(d.state, 3+i, 5));
    let from = h.position; const roads: string[] = [];
    for (const to of steps) { roads.push(edgeKey(from,to)); from=to; }
    d.state.world.map = { ...d.state.world.map, roads };
    d.do({ kind: 'CastAdventureSpell', heroId: h.id, spellId: 'spell2_road_mending', target: h.position });
    const live = d.state.heroes[h.id]!, per = Math.ceil(d.catalog.rulesProfile.roadCost * .7); live.movementPoints = per;
    const q = quoteMovement(d.catalog, d.state, h.id, steps[4]!);
    expect(q.stepCosts[0]).toBe(per); expect(q.totalCost).toBe(per*5);
    const days = routeStepDays(d.catalog, d.state, h.id, q)!;
    expect(days[0]).toBe(1); expect(days[1]).toBe(2);
    d.do({ kind: 'MoveHero', heroId: h.id, destination: steps[4]! });
    d.state = JSON.parse(JSON.stringify(d.state)); d.do({ kind: 'EndTurn' }); d.do({ kind: 'EndTurn' });
    const next = quoteMovement(d.catalog, d.state, h.id, steps[4]!);
    expect(next.totalCost).toBe(Math.ceil(d.catalog.rulesProfile.roadCost*.9)*4);
    d.do({ kind: 'MoveHero', heroId: h.id, destination: steps[4]! });
    expect(d.state.heroes[h.id]!.position).toEqual(steps[4]);
  });
  it('owned-ship keel spends one real land step, and a sailing spell applies only six discounted steps', () => {
    const { d, h } = setup(['relic2_skidbladnir_keel', 'relic2_aeolus_windbag']);
    h.position = cellIn(d.state, 9, 8); h.movementPoints = 1000;
    const ship = d.state.world.ships!.map_ship_free!;
    expect(quoteEmbark(d.catalog,d.state,h.id,ship.shipId).keel).not.toBe(true);
    ship.ownerId = h.ownerId;
    const q = quoteEmbark(d.catalog,d.state,h.id,ship.shipId);
    expect(q.remaining).toBe(1000-d.catalog.rulesProfile.terrainCost.plains!);
    d.do({ kind: 'EmbarkHero', heroId: h.id, shipId: ship.shipId });
    d.do({ kind: 'CastAdventureSpell', heroId: h.id, spellId: 'spell2_aeolian_tack', target: ship.coord });
    const route = quoteMovement(d.catalog,d.state,h.id,cellIn(d.state,17,8));
    expect(route.totalCost).toBe(6*70+85);
    const before = d.state.heroes[h.id]!.movementPoints;
    d.do({kind:'MoveHero',heroId:h.id,destination:cellIn(d.state,17,8)});
    expect(d.state.heroes[h.id]!.movementPoints).toBe(before-route.totalCost);
    expect(d.state.heroes[h.id]!.libraryAdventure!.movementLedger!.uses.spell2_aeolian_tack).toBe(6);
  });
  it('recognizes explicit logical desert cells without reading a decorative biome and shares the strongest surcharge waiver', () => {
    const {d,h}=setup(['relic2_wepwawet_sandals','relic2_ariadne_spool']);
    const to=cellIn(d.state,3,5); paint(d,[to],'r');
    d.state.world.map={...d.state.world.map,desertCells:[cellIndex(d.state.world.map,to)],biome:'temperate'};
    const q=priceMovementPath(movementPricing(d.catalog,d.state,h),movementLedger(h,d.state.day),h.position,[to],'land');
    expect(q.cost).toBe(d.catalog.rulesProfile.terrainCost.plains);
    expect(Object.values(q.ledger.saved).reduce((a,b)=>a+b,0)).toBe(d.catalog.rulesProfile.terrainCost.rough!-d.catalog.rulesProfile.terrainCost.plains!);
  });
  it('reprices the first leg of a mixed sea journey before the same path is committed', () => {
    const {d,h}=setup(['relic2_ariadne_spool']); h.position=cellIn(d.state,6,8);
    paint(d,[cellIn(d.state,7,8),cellIn(d.state,8,8),cellIn(d.state,9,8)],'r');
    const target=cellIn(d.state,24,8), q=quoteTravel(d.catalog,d.state,h.id,target);
    expect(q.reachable).toBe(true); expect(q.voyage).toBeTruthy();
    const before=h.movementPoints;
    d.do({kind:'MoveHero',heroId:h.id,destination:target});
    expect(d.state.heroes[h.id]!.movementPoints).toBe(before-q.totalCost);
  });
});
