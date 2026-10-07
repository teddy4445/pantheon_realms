/**
 * The six authored skirmish maps (owner request 2026-10-05), designed for
 * empire 1 and copied to the others by `MapBuilder` (exact symmetry). Values are
 * proposed; the guards follow the random-map scale (Gold worth of the army:
 * passes 1,500–2,200, mines 2,600, vaults 5,200+, the centre 9,000).
 *
 * Run `npm run maps:build` to write `packages/content/src/skirmish/maps/*.prmap.json`.
 */
import type { CustomMapDocument, CustomSite, HexCoord, KeyColor } from '@pr/rules';
import { MapBuilder, angleDiff, angleOf, at, dist, noise, polar, segDist, type Pt } from './lib';

export interface AuthoredMap {
  readonly id: string;
  readonly doc: CustomMapDocument;
  /** Cells that must stay walls for the design to work (key gates etc.), for the checks. */
  readonly builder: MapBuilder;
}

const guard = (creatureId: string, count: number, label?: string, more?: { creatureId: string; count: number }[]): Partial<CustomSite> => ({
  guard: { creatureId, count, ...(more ? { more } : {}), ...(label ? { label } : {}) },
});

/** Plains under and around every site of empire 1's design (so no site stands in a wood or on a dune by accident). */
function clearings(b: MapBuilder, points: readonly Pt[], radius = 0.6): void {
  b.layer('plains', (p) => points.some((q) => dist(p, q) <= radius));
}

// ---------------------------------------------------------------------------------
// 1. Frostgate — two fjord valleys, one pass, twin crimson gates.
// ---------------------------------------------------------------------------------
export function frostgate(): AuthoredMap {
  const b = new MapBuilder(38, 30, 2, 'water');
  b.scatter('forest', (p) => noise(p, 3.2, 11) > 0.64 && Math.abs(p.x) > 6);
  b.scatter('rough', (p) => noise(p, 2.6, 12) > 0.75 && Math.abs(p.x) > 6);
  // The spine: a ridge down the middle, cut by the fjord from north and south.
  b.layer('mountain', (p) => Math.abs(p.x) <= 4.6);
  b.layer('water', (p) => Math.abs(p.y) >= 4.2 && Math.abs(p.x) <= 2.6 + Math.max(0, Math.abs(p.y) - 4) * 0.55 + (noise(p, 2, 13) - 0.5) * 1.2);
  // Empire 1's glacier islet in the north arm of the fjord.
  const islet = at(-2.5, -11);
  b.layer('water', (p) => dist(p, islet) <= 3.4);
  b.layer('plains', (p) => dist(p, islet) <= 1.8);
  b.scatter('rough', (p) => dist(p, islet) > 1.1 && dist(p, islet) <= 1.8 && noise(p, 1, 14) > 0.5);
  // Woods by the sawmill, stone by the quarry.
  b.layer('forest', (p) => dist(p, at(-16.5, -7.5)) <= 1.9);
  b.layer('rough', (p) => dist(p, at(-15.5, 7.5)) <= 1.7);
  // The pass: one corridor through the ridge on the middle row.
  b.layer('plains', (p) => Math.abs(p.y) < 0.1 && Math.abs(p.x) <= 4.6);

  const town = at(-13, 0);
  const S = {
    sawmill: at(-15, -6),
    quarry: at(-14, 6),
    windmill: at(-10, -3),
    stone: at(-9, 4),
    camp: at(-16, 2),
    gold: at(-8, -9),
    crystal: at(-7, 8),
    shrine: at(-16, -12),
    trainer: at(-12.5, -9),
    chest: at(-16, 11),
    cache: at(-11, 11),
    portal: at(-11.5, -13),
    tower: at(-6.5, 3),
    isletPortal: at(-3.5, -11),
    tent: at(-1.5, -11),
    isletChest: at(-2, -12),
  };
  clearings(b, [town, ...Object.values(S)]);
  b.layer('plains', (p) => dist(p, town) <= 1.8);
  b.sealEdges();

  b.site({ id: 'town', kind: 'town', at: town, extra: (k) => ({ owner: k }) });
  b.site({ id: 'sawmill', kind: 'sawmill', at: S.sawmill });
  b.site({ id: 'quarry', kind: 'quarry', at: S.quarry });
  b.site({ id: 'windmill', kind: 'windmill', at: S.windmill });
  b.site({ id: 'stone', kind: 'learning_stone', at: S.stone });
  b.site({ id: 'camp', kind: 'creature_camp', at: S.camp, extra: () => ({ creatureId: 'norse_frost_wolf', name: 'Wolf Den' }) });
  b.site({ id: 'gold', kind: 'gold_mine', at: S.gold, extra: () => guard('ogre', 6, 'Mine ogres') });
  b.site({ id: 'crystal', kind: 'crystal_deposit', at: S.crystal, extra: () => guard('hill_slinger', 16, 'Ice-cave slingers') });
  b.site({ id: 'shrine', kind: 'spell_shrine', at: S.shrine, extra: () => ({ spellId: 'lightning' }) });
  b.site({ id: 'trainer', kind: 'skill_trainer', at: S.trainer, extra: () => ({ skillId: 'logistics' }) });
  b.site({ id: 'chest', kind: 'treasure_chest', at: S.chest, extra: () => guard('wild_boar', 10, 'Snow boars') });
  b.site({ id: 'cache', kind: 'resource_cache', at: S.cache });
  b.site({ id: 'tower', kind: 'watchtower', at: S.tower, extra: () => ({ radius: 9, name: 'Ridge Watchtower' }) });
  b.site({ id: 'portal', kind: 'portal', at: S.portal, extra: (k) => ({ twinId: `islet_portal_${k + 1}`, name: 'Glacier Portal' }) });
  b.site({ id: 'islet_portal', kind: 'portal', at: S.isletPortal, extra: (k) => ({ twinId: `portal_${k + 1}`, name: 'Glacier Portal' }) });
  b.site({
    id: 'tent',
    kind: 'key_tent',
    at: S.tent,
    extra: () => ({ color: 'crimson', ...guard('wyvern', 8, 'Glacier wyverns'), text: 'The keymaster of the frozen pass keeps the crimson key on this glacier, where wyverns nest on the ice beside his tent.' }),
  });
  b.site({ id: 'islet_chest', kind: 'treasure_chest', at: S.isletChest });
  // The twin gates in the pass (both crimson).
  b.site({ id: 'gate', kind: 'key_gate', at: at(-2, 0), extra: () => ({ color: 'crimson', name: 'Frostgate', text: 'One of the twin gates of the frozen pass. It opens for an empire holding the crimson key, kept on the glacier islands of the fjord.' }) });

  const gate = b.townGate('town', at(0, 0));
  b.road(gate, 'sawmill_1').road(gate, 'quarry_1').road(gate, 'windmill_1').road(gate, 'gold_1').road(gate, 'crystal_1').road(gate, 'portal_1').road(gate, b.cell(at(-5, 0)));
  // Through the pass: from the mouth to the far mouth (the gates stand on the road).
  const pass: HexCoord[] = [];
  for (let x = -5; x <= 5; x++) pass.push(b.cell(at(x, 0)));
  b.roadCells(pass);
  b.road(gate, 'camp_1');

  // An unowned town per empire (2026-10-07; used only when the setup asks for them).
  b.unownedTown(gate, [6, 10]);
  return {
    id: 'frostgate',
    builder: b,
    doc: b.document({
      name: 'Frostgate',
      description: 'Two fjord valleys and one pass between them, barred by twin crimson gates. The crimson key lies on the glacier islands of the fjord, reached only by portal — and guarded.',
      biome: 'fjord',
      players: [{ pantheonId: 'norse' }, { pantheonId: 'celtic' }],
      victory: { type: 'elimination' },
      startWealth: 'normal',
    }),
  };
}

// ---------------------------------------------------------------------------------
// 2. The Burning Oasis — four corners of a desert, four oases, a shrine in the middle.
// ---------------------------------------------------------------------------------
export function burningOasis(): AuthoredMap {
  const b = new MapBuilder(46, 36, 4, 'mountain');
  const home = at(-12, -12);
  const homeAngle = angleOf(home);
  b.homeAngle = homeAngle;
  const oasisN = at(0, -12);
  const oasisW = at(-18, 0);
  b.scatter('rough', (p) => noise(p, 3, 21) > 0.67);
  b.scatter('mountain', (p) => noise(p, 2.2, 22) > 0.83 && dist(p) > 9);
  // The burning ring around the shrine, open toward each empire.
  b.layer('mountain', (p) => dist(p) >= 5.2 && dist(p) <= 7.6);
  b.layer('plains', (p) => dist(p) < 5.2);
  b.scatter('rough', (p) => dist(p) < 4.6 && dist(p) > 2.2 && noise(p, 1.4, 23) > 0.62);
  b.layer('plains', (p) => dist(p) >= 4.8 && dist(p) <= 8 && angleDiff(angleOf(p), homeAngle) < 9);
  // Oases: a pond, palms, open sand around.
  for (const o of [oasisN, oasisW]) {
    b.layer('plains', (p) => dist(p, o) <= 4.2);
    b.scatter('forest', (p) => dist(p, o) > 1.2 && dist(p, o) <= 2.4 && noise(p, 1.2, 24) > 0.42);
    b.layer('water', (p) => dist(p, o) <= 1.1);
  }
  const S = {
    sawmill: at(-18, -12),
    quarry: at(-6.5, -15),
    windmill: at(-9, -9),
    stone: at(-15, -8),
    chest: at(-19, -16),
    shrine: at(-6.5, -11),
    trainer: at(-14.5, -5),
    cache: at(-20, -8),
    art: at(-9, -5),
    goldN: at(-2.5, -11),
    campN: at(0, -14),
    crystalW: at(-17.5, -3),
    campW: at(-20, 0),
  };
  clearings(b, [home, ...Object.values(S)]);
  b.layer('plains', (p) => dist(p, home) <= 2);
  b.layer('forest', (p) => dist(p, at(-20, -13)) <= 1.5 && dist(p, S.sawmill) > 0.6);
  b.sealEdges();

  b.site({ id: 'town', kind: 'town', at: home, extra: (k) => ({ owner: k }) });
  b.site({ id: 'sawmill', kind: 'sawmill', at: S.sawmill });
  b.site({ id: 'quarry', kind: 'quarry', at: S.quarry });
  b.site({ id: 'windmill', kind: 'windmill', at: S.windmill });
  b.site({ id: 'stone', kind: 'learning_stone', at: S.stone });
  b.site({ id: 'chest', kind: 'treasure_chest', at: S.chest });
  b.site({ id: 'shrine', kind: 'spell_shrine', at: S.shrine, extra: () => ({ spellId: 'veil' }) });
  b.site({ id: 'trainer', kind: 'skill_trainer', at: S.trainer, extra: () => ({ skillId: 'logistics' }) });
  b.site({ id: 'cache', kind: 'resource_cache', at: S.cache });
  b.site({ id: 'art', kind: 'artifact', at: S.art, extra: () => ({ reward: { artifactId: 'winged_sandals' }, ...guard('clay_golem', 8, 'Sand golems') }) });
  b.site({ id: 'oasis_gold', kind: 'gold_mine', at: S.goldN, extra: () => ({ name: 'Oasis Gold Mine', ...guard('egyptian_ushabti', 11, 'Oasis wardens') }) });
  b.site({ id: 'oasis_camp_n', kind: 'creature_camp', at: S.campN, extra: () => ({ creatureId: 'wyvern', name: 'Wyvern Roost' }) });
  b.site({ id: 'oasis_crystal', kind: 'crystal_deposit', at: S.crystalW, extra: () => ({ name: 'Oasis Crystal', ...guard('hill_slinger', 14, 'Oasis raiders') }) });
  b.site({ id: 'oasis_camp_w', kind: 'creature_camp', at: S.campW, extra: () => ({ creatureId: 'centaur', name: 'Centaur Camp' }) });
  // The Shrine of the First Flame on the burning plateau (one tile, every copy).
  b.site({ id: 'relic', kind: 'relic', at: at(0, 0), extra: () => ({ name: 'The Burning Shrine', ...guard('basilisk', 5, 'Shrine wardens', [{ creatureId: 'ogre', count: 8 }]) }) });

  const gate = b.townGate('town', at(0, 0));
  b.road(gate, 'sawmill_1').road(gate, 'quarry_1').road(gate, 'windmill_1').road(gate, 'oasis_gold_1').road(gate, 'oasis_crystal_1').road(gate, 'relic');
  b.road(gate, 'oasis_camp_n_1').road(gate, 'oasis_camp_w_1');
  // An unowned town per empire (2026-10-07; used only when the setup asks for them).
  b.unownedTown(gate, [6, 10]);
  return {
    id: 'burning_oasis',
    builder: b,
    doc: b.document({
      name: 'The Burning Oasis',
      description: 'Four empires in the corners of a burning desert. Between each pair of neighbours lies an oasis with gold or crystal and a creature camp; in the middle, ringed by red rock, the Burning Shrine. Hold it seven days, or conquer.',
      biome: 'desert',
      players: [{ pantheonId: 'egyptian' }, { pantheonId: 'mesoamerican' }, { pantheonId: 'greek' }, { pantheonId: 'norse' }],
      victory: { type: 'hold_relic', days: 7 },
      startWealth: 'normal',
    }),
  };
}

// ---------------------------------------------------------------------------------
// 3. The Circle of Gates — three valleys round a high sanctum, linked by a ring of portals.
// ---------------------------------------------------------------------------------
export function circleOfGates(): AuthoredMap {
  const b = new MapBuilder(54, 42, 3, 'mountain');
  const town = at(0, -14);
  b.homeAngle = -90;
  b.scatter('forest', (p) => noise(p, 2.8, 31) > 0.63);
  b.scatter('rough', (p) => noise(p, 2.4, 32) > 0.7);
  b.layer('mountain', (p) => dist(p) > 17.6 + (noise(p, 2, 33) - 0.5) * 1.6);
  b.scatter('mountain', (p) => noise(p, 1.5, 34) > 0.86 && dist(p) > 8.5);
  // The peaks and the high sanctum, entered by one guarded path per empire.
  b.layer('mountain', (p) => dist(p) < 7.4);
  b.layer('plains', (p) => dist(p) < 3.1);
  b.layer('plains', (p) => segDist(p, { x: 0, y: -2 }, { x: 0, y: -8 }) < 0.55);
  // Ridges between neighbours (along −30°, 90° and 210°), each with one guarded crossing.
  b.layer('mountain', (p) => segDist(p, polar(7, -30), polar(21, -30)) < 1.35);
  const passCell = b.cell(polar(12.4, -30));
  const crossing = [-2, -1, 0, 1, 2].map((n) => b.step(passCell, 1, n));
  b.cells('plains', crossing);

  const S = {
    sawmill: polar(15, -121),
    quarry: polar(12.6, -44),
    gold: polar(10.2, -112),
    crystal: polar(10.2, -68),
    windmill: polar(15.6, -104),
    stone: polar(15.4, -81),
    camp: polar(12.6, -136),
    chest: polar(15.4, -90),
    homePortal: polar(9.6, -128),
    backPortal: polar(15.2, -64),
    trainer: polar(9, -50),
    cache: polar(16, -134),
  };
  clearings(b, [town, ...Object.values(S)]);
  b.layer('plains', (p) => dist(p, town) <= 1.8);
  // The back gate's terrace: a ring of rock with one opening toward the town.
  const backCell = b.cell(S.backPortal);
  const terraceExit = b.step(backCell, 2, 2);
  b.cells('plains', [backCell, ...b.ring(backCell, 1), terraceExit, b.step(backCell, 2, 3), b.step(backCell, 2, 4)]);
  b.cells('mountain', b.ring(backCell, 2).filter((c) => c.q !== terraceExit.q || c.r !== terraceExit.r));
  b.sealEdges();

  b.site({ id: 'town', kind: 'town', at: town, extra: (k) => ({ owner: k }) });
  b.site({ id: 'sawmill', kind: 'sawmill', at: S.sawmill });
  b.site({ id: 'quarry', kind: 'quarry', at: S.quarry });
  b.site({ id: 'gold', kind: 'gold_mine', at: S.gold, extra: () => guard('wild_boar', 22, 'Mountain boars') });
  b.site({ id: 'crystal', kind: 'crystal_deposit', at: S.crystal, extra: () => guard('hill_slinger', 14, 'Cliff slingers') });
  b.site({ id: 'windmill', kind: 'windmill', at: S.windmill });
  b.site({ id: 'stone', kind: 'learning_stone', at: S.stone });
  b.site({ id: 'camp', kind: 'creature_camp', at: S.camp, extra: () => ({ creatureId: 'centaur', name: 'Centaur Camp' }) });
  b.site({ id: 'chest', kind: 'treasure_chest', at: S.chest });
  b.site({ id: 'trainer', kind: 'skill_trainer', at: S.trainer, extra: () => ({ skillId: 'scouting' }) });
  b.site({ id: 'cache', kind: 'resource_cache', at: S.cache });
  // The ring of gates: each home portal opens behind the next empire's town; each back portal leads to the previous empire's home.
  b.site({ id: 'home_portal', kind: 'portal', at: S.homePortal, extra: (k) => ({ twinId: `back_portal_${((k + 1) % 3) + 1}`, name: 'Gate of the Circle' }) });
  b.site({ id: 'back_portal', kind: 'portal', at: S.backPortal, extra: (k) => ({ twinId: `home_portal_${((k + 2) % 3) + 1}`, name: 'Gate of the Circle' }) });
  // The back gate stands on a walled terrace: whoever comes through it (or goes to it) first beats its wardens.
  b.site({ id: 'terrace_guard', kind: 'monster', at: b.pt(terraceExit), extra: () => ({ name: 'Gate Terrace', ...guard('centaur', 13, 'Gate wardens') }) });
  // The sanctum: three spell shrines and a guarded artifact on the summit.
  const SPELLS = ['divine_sight', 'mend', 'veil'];
  b.site({ id: 'sanctum_shrine', kind: 'spell_shrine', at: polar(2, -30), extra: (k) => ({ spellId: SPELLS[k]! }) });
  b.site({ id: 'summit', kind: 'artifact', at: at(0, 0), extra: () => ({ name: 'Crown of the Summit', reward: { artifactId: 'crown_of_counsel', gold: 1500 }, text: 'An ancient crown left on the summit stone, where the three paths meet.' }) });
  // Guards: the sanctum paths and the ridge crossings.
  b.site({ id: 'path_guard', kind: 'monster', at: at(0, -6), extra: () => ({ name: 'Summit Path', ...guard('wyvern', 7, 'Summit wyverns', [{ creatureId: 'centaur', count: 6 }]) }) });
  b.site({ id: 'ridge_guard', kind: 'monster', at: b.pt(passCell), extra: () => ({ name: 'Ridge Crossing', ...guard('ogre', 6, 'Ridge ogres') }) });

  const gate = b.townGate('town', at(0, 0));
  b.road(gate, 'sawmill_1').road(gate, 'quarry_1').road(gate, 'gold_1').road(gate, 'crystal_1').road(gate, 'home_portal_1').road(gate, 'path_guard_1');
  b.road(gate, 'windmill_1').road(gate, 'stone_1').road(gate, b.step(terraceExit, 2));
  b.roadCells([b.step(terraceExit, 2), terraceExit, b.step(backCell, 2), backCell]);
  b.road(gate, b.step(passCell, 1, -3));
  b.roadCells([b.step(passCell, 1, -3), ...crossing, b.step(passCell, 1, 3)]);
  // An unowned town per empire (2026-10-07; used only when the setup asks for them).
  b.unownedTown(gate, [6, 10]);
  return {
    id: 'circle_of_gates',
    builder: b,
    doc: b.document({
      name: 'The Circle of Gates',
      description: 'Three high valleys round a peak sanctum. A ring of portals links them: each home gate opens behind the next empire’s town, so every rival is one step from your back door — and you from theirs.',
      biome: 'high_pass',
      players: [{ pantheonId: 'japanese' }, { pantheonId: 'greek' }, { pantheonId: 'celtic' }],
      victory: { type: 'elimination' },
      startWealth: 'normal',
    }),
  };
}

// ---------------------------------------------------------------------------------
// 4. Barrows of the Lost Kings — a fog moor of burial mounds, prisons and key vaults.
// ---------------------------------------------------------------------------------
export function barrows(): AuthoredMap {
  const b = new MapBuilder(38, 30, 2, 'mountain');
  const town = at(-12, -8);
  b.homeAngle = angleOf(town);
  b.scatter('rough', (p) => noise(p, 2.5, 41) > 0.55);
  b.scatter('marsh', (p) => noise(p, 3, 42) > 0.64);
  b.scatter('forest', (p) => noise(p, 2, 43) > 0.72);
  b.scatter('water', (p) => noise(p, 3.5, 44) > 0.8 && dist(p) > 3);
  b.scatter('mountain', (p) => noise(p, 1.6, 45) > 0.86);
  // Barrow mounds: rough ground round each prison.
  const barrowNear = at(-5, -1);
  const barrowKing = at(1, -6);
  for (const m of [barrowNear, barrowKing]) b.layer('rough', (p) => dist(p, m) <= 2.2);
  const S = {
    sawmill: at(-16, -4),
    quarry: at(-8, -12),
    windmill: at(-14, -1),
    stone: at(-8, -5),
    camp: at(-11, 1),
    crystal: at(-16, 3),
    gold: at(-4, -11),
    shrine: at(-14, 6),
    chest: at(-16.5, -11),
    cache: at(-3.5, 5),
    tower: at(-6.5, 3),
    tent: at(-17, -7),
    hutDefeat: at(-9, 4),
    hutDeliver: at(-4, -7),
    near: barrowNear,
    king: barrowKing,
  };
  clearings(b, [town, ...Object.values(S)]);
  b.layer('plains', (p) => dist(p, town) <= 1.8);
  // The vault of empire 1's key (amber): a ring of rock with one gate on its south-west side.
  const vault = b.cell(at(5, -10));
  const ring = b.ring(vault, 2);
  const gateCell = b.step(vault, 2, 2);
  const inside = [vault, ...b.ring(vault, 1)];
  b.cells('mountain', ring.filter((c) => c.q !== gateCell.q || c.r !== gateCell.r));
  b.cells('plains', [...inside, gateCell, b.step(vault, 2, 3), b.step(vault, 2, 4)]);
  b.layer('plains', (p) => dist(p) <= 1.2);
  b.sealEdges();

  const keyOf = (k: number): KeyColor => (k === 0 ? 'amber' : 'violet');
  b.site({ id: 'town', kind: 'town', at: town, extra: (k) => ({ owner: k }) });
  b.site({ id: 'sawmill', kind: 'sawmill', at: S.sawmill });
  b.site({ id: 'quarry', kind: 'quarry', at: S.quarry });
  b.site({ id: 'windmill', kind: 'windmill', at: S.windmill });
  b.site({ id: 'stone', kind: 'learning_stone', at: S.stone });
  b.site({ id: 'camp', kind: 'creature_camp', at: S.camp, extra: () => ({ creatureId: 'celtic_cu_sith', name: 'Hound Kennels' }) });
  b.site({ id: 'crystal', kind: 'crystal_deposit', at: S.crystal, extra: () => guard('brigand', 22, 'Bog brigands') });
  b.site({ id: 'gold', kind: 'gold_mine', at: S.gold, extra: () => ({ name: 'Barrow Gold Mine', ...guard('ogre', 7, 'Mound ogres') }) });
  b.site({ id: 'shrine', kind: 'spell_shrine', at: S.shrine, extra: () => ({ spellId: 'veil' }) });
  b.site({ id: 'chest', kind: 'treasure_chest', at: S.chest });
  b.site({ id: 'cache', kind: 'resource_cache', at: S.cache });
  b.site({ id: 'tower', kind: 'watchtower', at: S.tower, extra: () => ({ radius: 10, name: 'Tor Watchtower', text: 'From the tor the fog thins: every site within 10 hexes shows on your map.' }) });
  b.site({ id: 'tent', kind: 'key_tent', at: S.tent, extra: (k) => ({ color: keyOf(k) }) });
  b.site({
    id: 'barrow',
    kind: 'prison',
    at: S.near,
    extra: (k) => ({ owner: k, level: 5, name: 'Barrow of the Lost Thane', ...guard('norse_draugr', 26, 'Barrow-wights'), text: 'A captive hero of your own people is held in the barrow. Beat the wights, free them; they join you at level 5.' }),
  });
  b.site({
    id: 'king',
    kind: 'prison',
    at: S.king,
    extra: () => ({ level: 7, name: 'Barrow of the Lost King', ...guard('norse_deathless_draugr', 30, 'The king’s deathless guard', [{ creatureId: 'celtic_banshee', count: 4 }]) }),
  });
  b.site({ id: 'hut_defeat', kind: 'quest_hut', at: S.hutDefeat, extra: (k) => ({ name: 'Mourner’s Hut', quest: { type: 'defeat', siteId: `barrow_${k + 1}` }, reward: { artifactId: 'band_of_insight', xp: 1000 } }) });
  b.site({ id: 'hut_deliver', kind: 'quest_hut', at: S.hutDeliver, extra: () => ({ name: 'Grave-digger’s Hut', quest: { type: 'deliver', wood: 8, stone: 8 }, reward: { gold: 2500 } }) });
  b.site({ id: 'vault_gate', kind: 'key_gate', at: b.pt(gateCell), extra: (k) => ({ color: keyOf(k), name: `${k === 0 ? 'Amber' : 'Violet'} Barrow Gate` }) });
  b.site({ id: 'vault_art', kind: 'artifact', at: b.pt(vault), extra: () => ({ name: 'The Lost King’s Hoard', reward: { artifactRarity: 'major', gold: 2000 }, ...guard('basilisk', 3, 'Hoard basilisks') }) });
  b.site({ id: 'vault_chest', kind: 'treasure_chest', at: b.pt(b.step(vault, 0)) });
  b.site({ id: 'crown', kind: 'artifact', at: at(0, 0), extra: () => ({ name: 'Crown of the Barrow King', reward: { artifactRarity: 'relic' }, ...guard('basilisk', 5, 'The Barrow King’s court', [{ creatureId: 'norse_draugr', count: 20 }]) }) });

  const gate = b.townGate('town', at(0, 0));
  b.road(gate, 'sawmill_1').road(gate, 'quarry_1').road(gate, 'windmill_1').road(gate, 'camp_1').road(gate, 'gold_1').road(gate, 'crystal_1').road(gate, 'barrow_1').road(gate, 'crown');
  // An unowned town per empire (2026-10-07; used only when the setup asks for them).
  b.unownedTown(gate, [6, 10]);
  return {
    id: 'barrows',
    builder: b,
    doc: b.document({
      name: 'Barrows of the Lost Kings',
      description: 'A fog-bound moor of burial mounds. Captive heroes wait in the barrows, hermits pay for deeds, and two sealed hoards open only for the amber and the violet keys. Gold is scarce: each side has one mine.',
      biome: 'moor',
      players: [{ pantheonId: 'celtic' }, { pantheonId: 'norse' }],
      victory: { type: 'elimination' },
      startWealth: 'normal',
    }),
  };
}

// ---------------------------------------------------------------------------------
// 5. The Golden Fords — a rich valley between two rivers, three fords on each.
// ---------------------------------------------------------------------------------
export function goldenFords(): AuthoredMap {
  const b = new MapBuilder(38, 30, 2, 'mountain');
  const town = at(-13, 0);
  const riverX = (y: number) => -6 + 0.9 * Math.sin(y * 0.45);
  b.scatter('forest', (p) => noise(p, 2.6, 51) > 0.64);
  b.scatter('rough', (p) => noise(p, 2.2, 52) > 0.74 && Math.abs(p.x) > 7.5);
  b.layer('water', (p) => Math.abs(p.x - riverX(p.y)) < 1.05);
  // Three fords on empire 1's river (rows −8, 0, 8).
  const fords: HexCoord[][] = [-8, 0, 8].map((row) => {
    const out: HexCoord[] = [];
    for (let x = -10; x <= -2; x++) {
      const c = b.cell(at(x, row));
      if (Math.abs(b.pt(c).x - riverX(b.pt(c).y)) < 1.6) out.push(c);
    }
    return out;
  });
  for (const f of fords) b.cells('plains', f);
  const S = {
    sawmill: at(-15.5, -7),
    quarry: at(-15.5, 7),
    gold: at(-10, -10),
    crystal: at(-10, 10),
    windmill: at(-9, -4),
    stone: at(-9.5, 5),
    camp: at(-16, 3),
    shrine: at(-17, -3),
    chest: at(-16, 11),
    midGold: at(-2, -6),
    midCrystal: at(-2.5, 9),
    midSawmill: at(-3, 3),
    midCamp: at(-3, -2),
    midMill: at(-2.5, -11),
    midStone: at(2, -10),
    midChest: at(1.5, 5),
  };
  clearings(b, [town, ...Object.values(S)]);
  b.layer('plains', (p) => dist(p, town) <= 1.8 || dist(p) <= 1.2);
  b.sealEdges();

  b.site({ id: 'town', kind: 'town', at: town, extra: (k) => ({ owner: k }) });
  b.site({ id: 'sawmill', kind: 'sawmill', at: S.sawmill });
  b.site({ id: 'quarry', kind: 'quarry', at: S.quarry });
  b.site({ id: 'gold', kind: 'gold_mine', at: S.gold });
  b.site({ id: 'crystal', kind: 'crystal_deposit', at: S.crystal, extra: () => guard('brigand', 20, 'Hedge brigands') });
  b.site({ id: 'windmill', kind: 'windmill', at: S.windmill });
  b.site({ id: 'stone', kind: 'learning_stone', at: S.stone });
  b.site({ id: 'camp', kind: 'creature_camp', at: S.camp, extra: () => ({ creatureId: 'hill_slinger', name: 'Slingers’ Lodge' }) });
  b.site({ id: 'shrine', kind: 'spell_shrine', at: S.shrine, extra: () => ({ spellId: 'blessing' }) });
  b.site({ id: 'chest', kind: 'treasure_chest', at: S.chest });
  b.site({ id: 'mid_gold', kind: 'gold_mine', at: S.midGold, extra: () => ({ name: 'Golden Mine', ...guard('ogre', 7, 'Mine ogres') }) });
  b.site({ id: 'mid_crystal', kind: 'crystal_deposit', at: S.midCrystal, extra: () => guard('clay_golem', 9, 'Clay golems') });
  b.site({ id: 'mid_sawmill', kind: 'sawmill', at: S.midSawmill });
  b.site({ id: 'mid_camp', kind: 'creature_camp', at: S.midCamp, extra: () => ({ creatureId: 'centaur', name: 'Centaur Camp' }) });
  b.site({ id: 'mid_mill', kind: 'windmill', at: S.midMill, extra: () => ({ name: 'Golden Mill' }) });
  b.site({ id: 'mid_stone', kind: 'learning_stone', at: S.midStone });
  b.site({ id: 'mid_chest', kind: 'treasure_chest', at: S.midChest, extra: () => guard('wild_boar', 12, 'Orchard boars') });
  b.site({ id: 'horn', kind: 'artifact', at: at(0, 0), extra: () => ({ name: 'The Horn of Plenty', reward: { artifactId: 'cornucopia' }, ...guard('basilisk', 4, 'Keepers of the Horn', [{ creatureId: 'ogre', count: 6 }]), text: 'The Horn of Plenty rests on the harvest altar between the rivers, watched by its keepers.' }) });
  // Ford guards.
  const fordGuards: [string, Partial<CustomSite>][] = [
    ['ford_n', { name: 'North Ford', ...guard('brigand', 40, 'Ford brigands') }],
    ['ford_c', { name: 'Golden Ford', ...guard('centaur', 13, 'Ford keepers') }],
    ['ford_s', { name: 'South Ford', ...guard('wild_boar', 22, 'River boars') }],
  ];
  fords.forEach((f, i) => {
    const mid = [...f].sort((a, c) => Math.abs(b.pt(a).x - riverX(b.pt(a).y)) - Math.abs(b.pt(c).x - riverX(b.pt(c).y)))[0]!;
    b.site({ id: fordGuards[i]![0], kind: 'monster', at: b.pt(mid), extra: () => fordGuards[i]![1] });
  });

  const gate = b.townGate('town', at(0, 0));
  b.road(gate, 'sawmill_1').road(gate, 'quarry_1').road(gate, 'gold_1').road(gate, 'crystal_1').road(gate, 'windmill_1');
  for (const f of fords) {
    const west = f[0]!;
    const east = f[f.length - 1]!;
    b.road(gate, b.step(west, 3));
    b.roadCells([b.step(west, 3), ...f, b.step(east, 0)]);
  }
  b.road(b.step(fords[1]![fords[1]!.length - 1]!, 0), 'mid_camp_1');
  b.road(b.step(fords[0]![fords[0]!.length - 1]!, 0), 'mid_gold_1');
  b.road(b.step(fords[1]![fords[1]!.length - 1]!, 0), 'horn');
  // An unowned town per empire (2026-10-07; used only when the setup asks for them).
  b.unownedTown(gate, [6, 10]);
  return {
    id: 'golden_fords',
    builder: b,
    doc: b.document({
      name: 'The Golden Fords',
      description: 'A rich autumn valley between two rivers. Three guarded fords cross each river into the fields between them, full of mines and mills. Twice the usual treasury and a revealed map: a fast, open game.',
      biome: 'autumn',
      players: [{ pantheonId: 'greek' }, { pantheonId: 'egyptian' }],
      victory: { type: 'elimination' },
      startWealth: 'high',
      revealMap: true,
    }),
  };
}

// ---------------------------------------------------------------------------------
// 6. The Six Thrones — six wedges of one island round a shrine.
// ---------------------------------------------------------------------------------
export function sixThrones(): AuthoredMap {
  const b = new MapBuilder(68, 56, 6, 'water');
  const town = polar(17, -90);
  b.homeAngle = -90;
  b.scatter('forest', (p) => noise(p, 2.6, 61) > 0.62);
  b.scatter('rough', (p) => noise(p, 2.2, 62) > 0.68);
  b.scatter('mountain', (p) => noise(p, 1.4, 64) > 0.87 && dist(p) > 9.5 && dist(p) < 22);
  // The ring round the shrine, one guarded path per throne.
  b.layer('mountain', (p) => dist(p) >= 5 && dist(p) <= 7.6);
  b.layer('plains', (p) => dist(p) < 5);
  b.layer('plains', (p) => segDist(p, { x: 0, y: -4 }, { x: 0, y: -8.2 }) < 0.55);
  // Ridges between thrones (along −60°) down to the sea, each with one guarded crossing (a row).
  b.layer('mountain', (p) => segDist(p, polar(6.5, -60), polar(27, -60)) < 1.3);
  b.layer('water', (p) => dist(p) > 23.2 + (noise(p, 2.4, 63) - 0.5) * 1.6);
  const passCell = b.cell(polar(14.5, -60));
  const crossing = [-2, -1, 0, 1, 2].map((n) => b.step(passCell, 0, n));
  b.cells('plains', crossing);
  const S = {
    sawmill: polar(20, -104),
    quarry: polar(20, -76),
    gold: polar(12.6, -105),
    crystal: polar(12.6, -75),
    windmill: polar(15, -111),
    stone: polar(15, -69),
    camp: polar(19, -112),
    chest: polar(20.8, -90),
    shrine: polar(10.2, -100),
    trainer: polar(10.2, -80),
    cache: polar(19, -68),
  };
  clearings(b, [town, ...Object.values(S)]);
  b.layer('plains', (p) => dist(p, town) <= 1.8);
  b.sealEdges();

  b.site({ id: 'town', kind: 'town', at: town, extra: (k) => ({ owner: k }) });
  b.site({ id: 'sawmill', kind: 'sawmill', at: S.sawmill });
  b.site({ id: 'quarry', kind: 'quarry', at: S.quarry });
  b.site({ id: 'gold', kind: 'gold_mine', at: S.gold, extra: () => guard('wild_boar', 24, 'Highland boars') });
  b.site({ id: 'crystal', kind: 'crystal_deposit', at: S.crystal, extra: () => guard('hill_slinger', 14, 'Cave slingers') });
  b.site({ id: 'windmill', kind: 'windmill', at: S.windmill });
  b.site({ id: 'stone', kind: 'learning_stone', at: S.stone });
  b.site({ id: 'camp', kind: 'creature_camp', at: S.camp, extra: () => ({ creatureId: 'centaur', name: 'Centaur Camp' }) });
  b.site({ id: 'chest', kind: 'treasure_chest', at: S.chest });
  b.site({ id: 'shrine', kind: 'spell_shrine', at: S.shrine, extra: () => ({ spellId: 'mend' }) });
  b.site({ id: 'trainer', kind: 'skill_trainer', at: S.trainer, extra: () => ({ skillId: 'leadership' }) });
  b.site({ id: 'cache', kind: 'resource_cache', at: S.cache });
  b.site({ id: 'path_guard', kind: 'monster', at: at(0, -8), extra: () => ({ name: 'Throne Path', ...guard('wyvern', 6, 'Shrine-path wyverns') }) });
  b.site({ id: 'ridge_guard', kind: 'monster', at: b.pt(passCell), extra: () => ({ name: 'Ridge Pass', ...guard('ogre', 6, 'Pass ogres') }) });
  b.site({ id: 'relic', kind: 'relic', at: at(0, 0), extra: () => ({ name: 'The Shrine of Six Thrones', ...guard('basilisk', 6, 'Shrine wardens', [{ creatureId: 'wyvern', count: 8 }]) }) });

  const gate = b.townGate('town', at(0, 0));
  b.road(gate, 'sawmill_1').road(gate, 'quarry_1').road(gate, 'gold_1').road(gate, 'crystal_1').road(gate, 'path_guard_1').road(gate, 'windmill_1').road(gate, 'stone_1');
  b.road(gate, b.step(passCell, 0, -3));
  b.roadCells([b.step(passCell, 0, -3), ...crossing, b.step(passCell, 0, 3)]);
  // An unowned town per empire (2026-10-07; used only when the setup asks for them).
  b.unownedTown(gate, [6, 10]);
  return {
    id: 'six_thrones',
    builder: b,
    doc: b.document({
      name: 'The Six Thrones',
      description: 'One island, six thrones. Each empire holds a wedge of land between two ridges, with one guarded pass to each neighbour and one guarded path to the Shrine at the heart of the island. Hold the Shrine ten days, or conquer.',
      biome: 'coast',
      players: [{ pantheonId: 'greek' }, { pantheonId: 'norse' }, { pantheonId: 'egyptian' }, { pantheonId: 'japanese' }, { pantheonId: 'celtic' }, { pantheonId: 'mesoamerican' }],
      victory: { type: 'hold_relic', days: 10 },
      startWealth: 'normal',
    }),
  };
}

export const AUTHORED_MAPS = [frostgate, burningOasis, circleOfGates, barrows, goldenFords, sixThrones] as const;
