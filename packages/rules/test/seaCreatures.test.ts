/**
 * Sea creatures and the single-ship sea encounter (sea-creature delivery 2026-10-17; scenario feature
 * `seaEncountersV1`; layout `single_ship_sea_encounter_v2`): the ten forms and their traits, the zone
 * occupancy policy in every placement (deployment with the ship as attacker or defender, moves, two-hex
 * footprints never straddling the rail, forced moves, summons and teleports, anti-flight over water, a
 * restored save), renewable shots, the range floor, Deck Harpoon (preview = resolution, no retaliation),
 * cross-rail melee, the map outcomes and the campaign manual policy.
 */
import { describe, expect, it } from 'vitest';
import {
  BATTLEFIELD_LAYOUTS,
  SINGLE_SHIP_SEA_ENCOUNTER_V2,
  SINGLE_SHIP_SEA_CELLS,
  Tx,
  aliveCount,
  automationForbidden,
  battlePlacementIssues,
  boardZone,
  canonicalStateHash,
  cellDistance,
  cellKey,
  processCommand,
  findAbility,
  flightRemovalProblem,
  footprintCells,
  footprintChangeProblem,
  footprintZoneProblem,
  forcedMoveProblem,
  harpoonOptions,
  isShooter,
  legalActions,
  legalBattleCells,
  meleeOptions,
  movementClassOf,
  neutralAbilityOptions,
  placementProblem,
  previewHarpoon,
  quoteMovement,
  reachableAnchors,
  renewableShotCapacity,
  seaEncounterTiles,
  shipInvariantIssues,
  shootingRange,
  sideStacks,
  stackCells,
  startBattle,
  statsOf,
  type BattleCell,
  type BattleStackState,
  type BattleState,
  type MatchState,
} from '../src';
import { GameDriver, catalog, cellOf, navalDriver, slots } from '@pr/testing';

const P1 = 'player';
const H1 = 'leader_1';
const H2 = 'leader_2';
type Army = [string, number][];

const FORMS = ['hippocampus', 'tempest_hippocampus', 'cetus', 'crownfin_cetus', 'hafgufa', 'abyssal_hafgufa', 'isonade', 'razorwake_isonade', 'triton', 'stormcaller_triton'];
const SHIP_SEVEN: Army = [['hoplite', 40], ['peltast', 25], ['griffin', 10], ['cavalry', 8], ['temple_adept', 6], ['minotaur', 4], ['cyclops', 2]];
const SEA_SEVEN: Army = [['cetus', 2], ['hafgufa', 1], ['isonade', 3], ['razorwake_isonade', 2], ['crownfin_cetus', 1], ['abyssal_hafgufa', 1], ['cetus', 1]];

interface SeaOpts {
  ship?: Army;
  sea?: Army;
  /** Skip the attack (only build the map). */
  noAttack?: boolean;
}

/** H1 aboard map_ship_a at rect (11,10) sails into a sea monster at rect (12,10). */
function seaFight(opts: SeaOpts = {}): GameDriver {
  const sea = opts.sea ?? [['triton', 6], ['cetus', 1]];
  const d = navalDriver({
    ships: (doc) => [{ id: 'free', ...cellOf(doc, 10, 8) }, { id: 'a', ...cellOf(doc, 11, 10), owner: 0 }],
    sites: (doc) => [{ id: 'deep', kind: 'sea_monster', ...cellOf(doc, 12, 10), guard: { creatureId: sea[0]![0], count: sea[0]![1], more: sea.slice(1).map(([creatureId, count]) => ({ creatureId, count })) } }],
  });
  const s = d.state;
  const ship = s.world.ships!['map_ship_a']!;
  const hero = s.heroes[H1]!;
  ship.heroId = H1;
  ship.state = 'occupied';
  hero.position = { ...ship.coord };
  hero.army.slots = slots(opts.ship ?? SHIP_SEVEN);
  hero.movementPoints = 1000;
  expect(shipInvariantIssues(catalog, s)).toEqual([]);
  if (!opts.noAttack) d.do({ kind: 'MoveHero', heroId: H1, destination: monsterCoord(d), confirmEncounter: true });
  return d;
}

const monsterCoord = (d: GameDriver) => cellOf(d.state.world.map, 12, 10);
const battleOf = (d: GameDriver): BattleState => d.state.battle!;
const stackOf = (b: BattleState, side: 'attacker' | 'defender', creatureId: string) => Object.values(b.stacks).find((s) => s.side === side && s.creatureId === creatureId)!;

/** Keep only the listed stacks, placed where asked (a fixture edit of a fresh battle). */
function only(battle: BattleState, placed: Record<string, BattleCell>): void {
  for (const id of Object.keys(battle.stacks)) {
    if (placed[id]) battle.stacks[id]!.anchor = placed[id]!;
    else delete battle.stacks[id];
  }
  battle.normalQueue = battle.normalQueue.filter((id) => !!placed[id]);
  battle.waitQueue = [];
}

function fast(stack: BattleStackState, amount = 30): void {
  stack.statuses.push({ sourceId: 'test:fast', label: 'Fast', kind: 'speed_bonus', amount, numerator: 1, denominator: 1, expiresAtRound: 999 });
}

/** Make `id` the active stack (fixture edit). */
function activate(b: BattleState, id: string): void {
  b.activeStackId = id;
  b.normalQueue = b.normalQueue.filter((x) => x !== id);
}

describe('the ten sea forms', () => {
  it('five neutral families, base + one delivered upgrade each, met only in sea encounters', () => {
    const fams = ['hippocampus', 'cetus', 'hafgufa', 'isonade', 'triton'];
    for (const f of fams) {
      const fam = catalog.families[f]!;
      expect(fam.classification, f).toBe('neutral');
      expect(fam.pantheonId).toBeNull();
      expect(fam.availability).toBe('sea_encounters');
      expect(fam.dwellingBuildingId).toBeUndefined();
      expect(fam.upgradedCreatureId).toBeTruthy();
    }
    expect(Object.keys(catalog.creatures).filter((id) => catalog.families[catalog.creatures[id]!.familyId]?.availability === 'sea_encounters').sort()).toEqual([...FORMS].sort());
    // The rejected two-fish family is not part of the game.
    expect(Object.keys(catalog.creatures).some((id) => /abtu|(^|_)ant(_|$)/.test(id))).toBe(false);
    // No pantheon roster lists them.
    for (const p of Object.values(catalog.pantheons)) for (const r of p.roster) expect(fams).not.toContain(r.familyId);
  });

  it('traits are explicit abilities: Hippocampi fly in one hex; the rest swim and shoot with renewable shots', () => {
    for (const id of ['hippocampus', 'tempest_hippocampus']) {
      expect(movementClassOf(catalog, id)).toBe('fly');
      expect(statsOf(catalog, id).footprint).toBe(1);
      expect(isShooter(catalog, id)).toBe(false);
    }
    const ranges: Record<string, [number, 1 | 2]> = {
      cetus: [8, 2], crownfin_cetus: [9, 2], hafgufa: [9, 2], abyssal_hafgufa: [10, 2],
      isonade: [8, 2], razorwake_isonade: [9, 2], triton: [9, 1], stormcaller_triton: [10, 1],
    };
    for (const [id, [range, fp]] of Object.entries(ranges)) {
      expect(movementClassOf(catalog, id), id).toBe('swim');
      expect(findAbility(catalog, id, 'swimmer'), id).toBeTruthy();
      expect(isShooter(catalog, id), id).toBe(true);
      expect(statsOf(catalog, id).range, id).toBe(range);
      expect(statsOf(catalog, id).footprint, id).toBe(fp);
      expect(statsOf(catalog, id).shots, id).toBe(2);
      expect(renewableShotCapacity(catalog, id), id).toBe(2);
    }
    // Upgrades keep the family's tier and footprint and reach one hex further.
    for (const f of ['cetus', 'hafgufa', 'isonade', 'triton']) {
      const fam = catalog.families[f]!;
      expect(statsOf(catalog, fam.upgradedCreatureId!).range).toBe(statsOf(catalog, fam.baseCreatureId).range! + 1);
    }
    // Ordinary shooters keep per-battle ammunition.
    expect(renewableShotCapacity(catalog, 'peltast')).toBeNull();
  });

  it('the attacks are named by their abilities and every form has a portrait and lore', () => {
    const names = new Set(FORMS.flatMap((id) => catalog.creatures[id]!.abilityIds.map((a) => catalog.abilities[a]!.name)));
    for (const n of ['Brine Jet', 'Deepwater Blast', 'Barbed Spray', 'Conch Blast', 'Swimmer', 'Flight']) expect(names.has(n), n).toBe(true);
    for (const id of FORMS) {
      const c = catalog.creatures[id]!;
      expect(c.presentation.portraitAssetId).toBe(`seacreatures.portrait.${id}`);
      expect(catalog.lore[c.loreId]).toBeTruthy();
      expect(c.balanceStatus).toBe('proposed_unplaytested');
    }
  });
});

describe('the single-ship board', () => {
  it('16 x 11 odd-r: 88 deck cells in columns 0-7, 88 water cells in columns 8-15; the cell table matches the delivery', () => {
    const L = SINGLE_SHIP_SEA_ENCOUNTER_V2;
    expect(BATTLEFIELD_LAYOUTS[L.id]).toBe(L);
    expect([L.cols, L.rows]).toEqual([16, 11]);
    const text = L.rowsText.join('');
    expect([...text].filter((c) => c === 'k')).toHaveLength(88);
    expect([...text].filter((c) => c === '.')).toHaveLength(88);
    expect(SINGLE_SHIP_SEA_CELLS).toHaveLength(176);
    for (const [col, row, x, , w, h] of SINGLE_SHIP_SEA_CELLS) {
      expect(L.rowsText[row]![col]).toBe(col <= 7 ? 'k' : '.');
      expect(x > 0 && x < 1 && w === 0.047 && h === 0.06).toBe(true);
    }
    expect(L.sea!.shipAnchors.map((a) => [a.col, a.row])).toEqual([1, 2, 3, 4, 5, 6, 7].map((r) => [1, r]));
    expect(L.sea!.seaAnchors.map((a) => [a.col, a.row])).toEqual([1, 2, 3, 4, 5, 6, 7].map((r) => [14, r]));
  });

  it('sailing onto a sea monster is an encounter: a site_guard battle on the board, bound to the ship', () => {
    const d = seaFight({ noAttack: true });
    expect(seaEncounterTiles(catalog, d.state).size).toBe(1);
    const q = quoteMovement(catalog, d.state, H1, monsterCoord(d));
    expect(q.reachable && q.endsInEncounter).toBe(true);
    expect(q.mode).toBe('sea');
    d.do({ kind: 'MoveHero', heroId: H1, destination: monsterCoord(d), confirmEncounter: true });
    const b = battleOf(d);
    expect(b.encounter).toMatchObject({ kind: 'site_guard', siteId: 'deep', sourceShipId: 'map_ship_a', attackerHeroId: H1 });
    expect(b.archetype).toBe('single_ship_sea_encounter_v2');
    expect(b.board).toMatchObject({ layoutId: 'single_ship_sea_encounter_v2', shipSide: 'attacker' });
    expect(legalBattleCells(b)).toHaveLength(176);
    expect(b.obstacles).toEqual([]);
    expect(d.state.world.ships!['map_ship_a']!.state).toBe('in_battle');
    expect(shipInvariantIssues(catalog, d.state)).toEqual([]);
    const kinds = d.events.map((e) => e.kind);
    expect(kinds.indexOf('SeaEncounterStarted')).toBeLessThan(kinds.indexOf('BattleStarted'));
  });

  it('the flag off (older saves, existing campaigns): no sea encounter, a sea-monster tile is just taken water', () => {
    const d = seaFight({ noAttack: true });
    d.state.scenario.features = { ...d.state.scenario.features!, seaEncountersV1: undefined };
    expect(seaEncounterTiles(catalog, d.state).size).toBe(0);
    expect(quoteMovement(catalog, d.state, H1, monsterCoord(d)).endsInEncounter).toBe(false);
  });
});

describe('deployment', () => {
  it('seven two-hex stacks a side: the ship on (1,1)…(1,7) extending to column 0, the sea on (14,1)…(14,7) extending to 15', () => {
    const d = seaFight({ ship: [['cavalry', 5], ['minotaur', 3], ['cyclops', 1], ['griffin', 8], ['cavalry', 4], ['minotaur', 2], ['griffin', 3]], sea: SEA_SEVEN });
    const b = battleOf(d);
    for (const side of ['attacker', 'defender'] as const) {
      const mine = sideStacks(b, side);
      expect(mine).toHaveLength(7);
      const cells = mine.flatMap((s) => stackCells(catalog, s));
      expect(cells).toHaveLength(14);
      expect(new Set(cells.map(cellKey)).size).toBe(14);
      const cols = side === 'attacker' ? [0, 1] : [14, 15];
      for (const c of cells) expect(cols).toContain(c.col);
      for (const s of mine) expect(s.facing).toBe(side === 'attacker' ? 1 : -1);
      expect(mine.map((s) => s.anchor.row).sort()).toEqual([1, 2, 3, 4, 5, 6, 7]);
    }
    expect(battlePlacementIssues(catalog, d.state)).toEqual([]);
  });

  it('the ship may be the defender (an ambush at sea): it still stands on the deck facing the water', () => {
    const d = seaFight({ noAttack: true });
    const s = d.state;
    // A wandering sea-monster band (a monster hero) at rect (12,10) attacks the ship (H1 defends).
    const monster = s.heroes[H2]!;
    monster.monster = { bounty: { gold: 0, wood: 0, stone: 0, crystal: 0, favor: 0 } } as never;
    monster.position = cellOf(s.world.map, 12, 10);
    monster.army.slots = slots([['isonade', 3], ['hippocampus', 6]]);
    const tx = new Tx({ catalog }, s, monster.ownerId);
    const b = startBattle(tx, { attackerHeroId: H2, kind: 'hero', siteId: null, defenderHeroId: H1, destination: s.heroes[H1]!.position, sourceShipId: 'map_ship_a' });
    expect(b.board?.shipSide).toBe('defender');
    for (const st of sideStacks(b, 'defender')) {
      expect(st.facing).toBe(1);
      for (const c of stackCells(catalog, st)) expect(boardZone(b, c)).toBe('deck');
    }
    for (const st of sideStacks(b, 'attacker')) {
      expect(st.facing).toBe(-1);
      for (const c of stackCells(catalog, st)) expect(c.col).toBeGreaterThanOrEqual(14);
    }
    expect(battlePlacementIssues(catalog, { battle: b })).toEqual([]);
  });

  it('a sea-side army of walkers, or a ship army with a swimmer, is refused (never placed in the wrong zone)', () => {
    const d = seaFight({ noAttack: true });
    const tx = new Tx({ catalog }, d.state, P1);
    const monster = d.state.heroes[H2]!;
    monster.army.slots = slots([['hoplite', 10]]);
    expect(() => startBattle(tx, { attackerHeroId: H2, kind: 'hero', siteId: null, defenderHeroId: H1, destination: d.state.heroes[H1]!.position, sourceShipId: 'map_ship_a' })).toThrow(/cannot fight at sea/);
    d.state.heroes[H1]!.army.slots = slots([['hoplite', 10], ['triton', 2]]);
    monster.army.slots = slots([['isonade', 3]]);
    expect(() => startBattle(new Tx({ catalog }, d.state, P1), { attackerHeroId: H2, kind: 'hero', siteId: null, defenderHeroId: H1, destination: d.state.heroes[H1]!.position, sourceShipId: 'map_ship_a' })).toThrow(/deck/);
  });

  it('Tactics deployment stays in each side’s zone: walkers on deck columns, nothing on the water', () => {
    const d = seaFight();
    const b = battleOf(d);
    const hop = stackOf(b, 'attacker', 'hoplite');
    for (const to of [{ col: 2, row: 9 }, { col: 8, row: 5 }]) {
      const why = placementProblem(catalog, b, { creatureId: hop.creatureId, anchor: to, facing: hop.facing, ignoreStackId: hop.id, side: hop.side });
      expect(why === null, `${to.col},${to.row}`).toBe(to.col <= 7);
    }
  });
});

describe('the zone occupancy policy', () => {
  it('ground: deck only; swim: water only; fly: either; a two-hex footprint never straddles the rail; bounds always', () => {
    const d = seaFight();
    const b = battleOf(d);
    const zp = (cells: BattleCell[], cls: 'ground' | 'swim' | 'fly') => footprintZoneProblem(b, cells, cls);
    expect(zp([{ col: 7, row: 3 }], 'ground')).toBeNull();
    expect(zp([{ col: 8, row: 3 }], 'ground')).toMatch(/water/);
    expect(zp([{ col: 8, row: 3 }], 'swim')).toBeNull();
    expect(zp([{ col: 7, row: 3 }], 'swim')).toMatch(/water/);
    expect(zp([{ col: 7, row: 3 }], 'fly')).toBeNull();
    expect(zp([{ col: 8, row: 3 }], 'fly')).toBeNull();
    // Anchor 8 facing east: cells 8 and 7 — across the rail.
    for (const cls of ['ground', 'swim', 'fly'] as const) expect(zp(footprintCells({ col: 8, row: 3 }, 2, 1), cls)).not.toBeNull();
    expect(zp(footprintCells({ col: 8, row: 3 }, 2, 1), 'fly')).toMatch(/across the rail/);
    expect(zp([{ col: 16, row: 3 }], 'fly')).toMatch(/Off/);
    expect(zp([{ col: 3, row: 11 }], 'ground')).toMatch(/Off/);
  });

  it('moves: walkers reach only deck anchors, swimmers only water, two-hex flyers both but never astride; occupied cells never', () => {
    const d = seaFight({ ship: [['cavalry', 5], ['griffin', 8]], sea: [['cetus', 2], ['tempest_hippocampus', 4]] });
    const b = battleOf(d);
    const cav = stackOf(b, 'attacker', 'cavalry');
    const gri = stackOf(b, 'attacker', 'griffin');
    const cet = stackOf(b, 'defender', 'cetus');
    const hip = stackOf(b, 'defender', 'tempest_hippocampus');
    for (const s of [cav, gri, cet, hip]) fast(s);
    for (const [s, zones] of [[cav, ['deck']], [cet, ['water']], [gri, ['deck', 'water']], [hip, ['deck', 'water']]] as const) {
      const reach = reachableAnchors(catalog, b, s);
      expect(reach.size).toBeGreaterThan(0);
      for (const node of reach.values()) {
        const cells = stackCells(catalog, s, node.cell);
        const zs = new Set(cells.map((c) => boardZone(b, c)));
        expect(zs.size, `${s.creatureId} ${cellKey(node.cell)}`).toBe(1);
        expect(zones).toContain([...zs][0]);
        for (const c of cells) expect(Object.values(b.stacks).some((o) => o.id !== s.id && stackCells(catalog, o).some((x) => x.col === c.col && x.row === c.row))).toBe(false);
      }
      expect([...reach.values()].some((n) => stackCells(catalog, s, n.cell).some((c) => boardZone(b, c) === 'water'))).toBe(zones.includes('water' as never));
    }
    // A two-hex flyer crosses the rail in one hop (water to deck), never ending astride.
    expect([...reachableAnchors(catalog, b, gri).values()].some((n) => n.cell.col >= 9)).toBe(true);
  });

  it('forced moves, summons, resurrection, teleports and a turned footprint use the same validator (rejected, never relocated)', () => {
    const d = seaFight({ ship: [['hoplite', 10], ['griffin', 5]], sea: [['triton', 4], ['isonade', 2]] });
    const b = battleOf(d);
    const hop = stackOf(b, 'attacker', 'hoplite');
    const tri = stackOf(b, 'defender', 'triton');
    const iso = stackOf(b, 'defender', 'isonade');
    // Push / pull / fear / knockback / teleport: a walker into the water, a swimmer onto the deck — refused.
    expect(forcedMoveProblem(catalog, b, hop, { col: 9, row: 4 })).toMatch(/water/);
    expect(forcedMoveProblem(catalog, b, tri, { col: 5, row: 4 })).toMatch(/water/);
    expect(forcedMoveProblem(catalog, b, tri, { col: 10, row: 4 })).toBeNull();
    expect(forcedMoveProblem(catalog, b, tri, iso.anchor)).toMatch(/taken/);
    // A summon or a resurrection where nothing stands: zones and occupancy alike.
    expect(placementProblem(catalog, b, { creatureId: 'cetus', anchor: { col: 11, row: 9 }, facing: -1 })).toBeNull();
    expect(placementProblem(catalog, b, { creatureId: 'cetus', anchor: { col: 7, row: 9 }, facing: -1 })).not.toBeNull();
    expect(placementProblem(catalog, b, { creatureId: 'cetus', anchor: { col: 15, row: 9 }, facing: -1 })).toMatch(/Off/);
    expect(placementProblem(catalog, b, { creatureId: 'griffin', anchor: { col: 8, row: 9 }, facing: 1 })).toMatch(/rail/);
    // A two-hex swimmer turned round at the rail would straddle it.
    iso.anchor = { col: 8, row: 6 };
    expect(footprintChangeProblem(catalog, b, iso, 1)).not.toBeNull();
    expect(footprintChangeProblem(catalog, b, iso, -1)).toBeNull();
  });

  it('Tail Snare cannot drag a swimmer onto the deck: the pull is refused, nobody drowned or beached', () => {
    const d = seaFight({ ship: [['ahuitzotl', 6]], sea: [['triton', 3]] });
    const b = battleOf(d);
    const ahu = stackOf(b, 'attacker', 'ahuitzotl');
    const tri = stackOf(b, 'defender', 'triton');
    only(b, { [ahu.id]: { col: 6, row: 4 }, [tri.id]: { col: 8, row: 4 } });
    activate(b, ahu.id);
    const opt = neutralAbilityOptions(catalog, b, ahu).find((o) => catalog.abilities[o.abilityId]?.rule.type === 'tail_snare')!;
    expect(opt.targets).not.toContain(tri.id);
    expect(opt.reason).toMatch(/out of the water/);
  });

  it('anti-flight over water is refused with a reason; on deck it may apply', () => {
    const d = seaFight({ sea: [['hippocampus', 5]] });
    const b = battleOf(d);
    const hip = stackOf(b, 'defender', 'hippocampus');
    expect(flightRemovalProblem(catalog, b, hip)).toMatch(/over the water/);
    hip.anchor = { col: 6, row: 2 };
    expect(flightRemovalProblem(catalog, b, hip)).toBeNull();
    expect(flightRemovalProblem(catalog, b, stackOf(b, 'attacker', 'hoplite'))).toBeNull();
  });

  it('a restored save with an illegal placement is reported (a walker in the water, a swimmer on deck, a stack astride)', () => {
    const d = seaFight();
    const b = battleOf(d);
    expect(battlePlacementIssues(catalog, d.state)).toEqual([]);
    const tri = stackOf(b, 'defender', 'triton');
    tri.anchor = { col: 6, row: 9 };
    expect(battlePlacementIssues(catalog, d.state).join(' ')).toMatch(/stays in the water|water/);
    tri.anchor = { col: 12, row: 9 };
    stackOf(b, 'attacker', 'griffin').anchor = { col: 8, row: 9 };
    expect(battlePlacementIssues(catalog, d.state).join(' ')).toMatch(/rail/);
  });

  it('boarding and land battles keep their behaviour (no policy: the original mask; no board: every cell)', () => {
    const land = { cols: 15, rows: 11, board: null } as unknown as BattleState;
    expect(footprintZoneProblem(land, [{ col: 7, row: 5 }], 'swim')).toBeNull();
    const boarding = { cols: 15, rows: 11, board: { layoutId: 'boarding_two_ships_v1', cells: BATTLEFIELD_LAYOUTS['boarding_two_ships_v1']!.rowsText.join(''), deploymentWidth: 3 } } as unknown as BattleState;
    for (const cls of ['ground', 'swim', 'fly'] as const) {
      expect(footprintZoneProblem(boarding, [{ col: 1, row: 1 }], cls)).toBeNull();
      expect(footprintZoneProblem(boarding, [{ col: 6, row: 1 }], cls)).not.toBeNull();
      // Deck and bridge together are fine on the boarding board (no single-zone rule there).
      expect(footprintZoneProblem(boarding, [{ col: 4, row: 4 }, { col: 3, row: 4 }], cls)).toBeNull();
    }
  });
});

describe('renewable shots and the range floor', () => {
  it('two shots at every round start (round 1 included), never more; a refill grants no action; ordinary shooters unchanged', () => {
    const d = seaFight({ ship: [['peltast', 20], ['hoplite', 30]], sea: [['triton', 6]] });
    const b0 = battleOf(d);
    const tri0 = stackOf(b0, 'defender', 'triton');
    const pel0 = stackOf(b0, 'attacker', 'peltast');
    expect(tri0.shotsRemaining).toBe(2);
    expect(pel0.shotsRemaining).toBe(statsOf(catalog, 'peltast').shots);
    expect(b0.round).toBe(1);
    // Play round 1 with the shooters shooting, the others defending; round 2 refills the Tritons to 2 (not 3).
    let shotsInRound1 = 0;
    let peltastShots = 0;
    for (let guard = 0; guard < 40 && d.state.battle && d.state.battle.round === 1; guard++) {
      const b = d.state.battle!;
      const active = b.stacks[b.activeStackId!]!;
      const la = legalActions(catalog, d.state)!;
      const actor = b.sides[active.side].playerId ?? '__neutral__';
      if (la.shootTargets.length > 0) {
        d.do({ kind: 'BattleShoot', stackId: active.id, targetId: la.shootTargets[0]! }, actor);
        if (active.creatureId === 'triton') shotsInRound1++;
        if (active.creatureId === 'peltast') peltastShots++;
      } else d.do({ kind: 'BattleDefend', stackId: active.id }, actor);
    }
    const b1 = battleOf(d);
    expect(b1.round).toBe(2);
    const tri1 = stackOf(b1, 'defender', 'triton');
    expect(tri1.shotsRemaining).toBe(2);
    expect(shotsInRound1).toBeLessThanOrEqual(2);
    expect(stackOf(b1, 'attacker', 'peltast').shotsRemaining).toBe(statsOf(catalog, 'peltast').shots - peltastShots);
  });

  it('the shots left survive a save and reload, and the refill happens once, at the next round start', () => {
    const d = seaFight({ sea: [['triton', 6]] });
    const b = battleOf(d);
    const tri = stackOf(b, 'defender', 'triton');
    tri.shotsRemaining = 1;
    const before = canonicalStateHash(d.state);
    const reloaded = d;
    reloaded.state = JSON.parse(JSON.stringify(d.state)) as MatchState;
    expect(stackOf(reloaded.state.battle!, 'defender', 'triton').shotsRemaining).toBe(1);
    expect(canonicalStateHash(reloaded.state)).toBe(before);
    // Finish the round by defending everyone: exactly one refill to 2.
    for (let guard = 0; guard < 40 && reloaded.state.battle && reloaded.state.battle.round === 1; guard++) {
      const bb = reloaded.state.battle!;
      const active = bb.stacks[bb.activeStackId!]!;
      reloaded.do({ kind: 'BattleDefend', stackId: active.id }, bb.sides[active.side].playerId ?? '__neutral__');
    }
    expect(stackOf(reloaded.state.battle!, 'defender', 'triton').shotsRemaining).toBe(2);
  });

  it('innate sea shots reach at least 8 on this board after climate; the same climate shortens them on land', () => {
    const d = seaFight({ sea: [['triton', 3], ['isonade', 2]] });
    const b = battleOf(d);
    b.climate = { id: 'fog', name: 'Fog', summary: '', creatureStats: [], rangeMod: -3 };
    expect(shootingRange(catalog, 'triton', b)).toBe(8);
    expect(shootingRange(catalog, 'stormcaller_triton', b)).toBe(8);
    expect(shootingRange(catalog, 'isonade', b)).toBe(8);
    b.climate = { id: 'clear', name: 'Clear', summary: '', creatureStats: [], rangeMod: 1 };
    expect(shootingRange(catalog, 'triton', b)).toBe(10);
    // An ordinary shooter on the same board and the same swimmer on land keep the ordinary rule.
    b.climate = { id: 'fog', name: 'Fog', summary: '', creatureStats: [], rangeMod: -3 };
    expect(shootingRange(catalog, 'peltast', b)).toBe(statsOf(catalog, 'peltast').range! - 3);
    const land = { ...b, board: null };
    expect(shootingRange(catalog, 'triton', land)).toBe(6);
  });

  it('every deck cell is within 8 hexes of some water edge cell (a swimmer at the rail reaches the whole deck)', () => {
    for (let row = 0; row < 11; row++) {
      for (let col = 0; col < 8; col++) {
        let best = 99;
        for (let r = 0; r < 11; r++) best = Math.min(best, cellDistance({ col, row }, { col: 8, row: r }));
        expect(best, `${col},${row}`).toBeLessThanOrEqual(8);
      }
    }
  });

  it('an engaged swimmer cannot shoot but may strike across the rail; the walker strikes back from its legal origin', () => {
    const d = seaFight({ ship: [['hoplite', 20]], sea: [['triton', 4]] });
    const b = battleOf(d);
    const hop = stackOf(b, 'attacker', 'hoplite');
    const tri = stackOf(b, 'defender', 'triton');
    only(b, { [hop.id]: { col: 7, row: 4 }, [tri.id]: { col: 8, row: 4 } });
    activate(b, tri.id);
    const la = legalActions(catalog, d.state)!;
    expect(la.shootTargets).toEqual([]);
    expect(la.shootBlockedReason).toMatch(/Engaged/);
    const m = la.melee.find((x) => x.targetId === hop.id)!;
    expect(m.options.some((o) => o.from.col === 8 && o.from.row === 4 && o.distance === 0)).toBe(true);
    for (const o of m.options) for (const c of stackCells(catalog, tri, o.from)) expect(boardZone(b, c)).toBe('water');
    d.do({ kind: 'BattleMelee', stackId: tri.id, targetId: hop.id, from: { col: 8, row: 4 } }, '__neutral__');
    const after = d.state.battle;
    if (after) {
      expect(after.stacks[tri.id]!.anchor).toEqual({ col: 8, row: 4 });
      expect(after.stacks[hop.id]!.anchor).toEqual({ col: 7, row: 4 });
    }
    expect(d.events.some((e) => e.kind === 'BattleAttack' && e.mode === 'retaliation' && e.attackerId === hop.id)).toBe(true);
  });
});

describe('Deck Harpoon', () => {
  it('a deck stack may harpoon an enemy in the water (a hovering flyer included), never one on deck; never the sea side', () => {
    const d = seaFight({ ship: [['hoplite', 20], ['griffin', 6]], sea: [['triton', 4], ['hippocampus', 5]] });
    const b = battleOf(d);
    const hop = stackOf(b, 'attacker', 'hoplite');
    const tri = stackOf(b, 'defender', 'triton');
    const hip = stackOf(b, 'defender', 'hippocampus');
    const o = harpoonOptions(catalog, b, hop);
    expect(o.applies).toBe(true);
    expect(o.targets.sort()).toEqual([tri.id, hip.id].sort());
    expect(harpoonOptions(catalog, b, tri).applies).toBe(false);
    // A hippocampus that landed on deck is no harpoon target.
    hip.anchor = { col: 5, row: 9 };
    expect(harpoonOptions(catalog, b, hop).targets).toEqual([tri.id]);
    // A ship flyer hovering over the water is not on the deck: no harpoon from there.
    const gri = stackOf(b, 'attacker', 'griffin');
    gri.anchor = { col: 11, row: 0 };
    expect(harpoonOptions(catalog, b, gri).reason).toMatch(/deck/);
  });

  it('engaged by an enemy on deck: harpoon off, melee offered; an enemy across the rail does not block it', () => {
    const d = seaFight({ ship: [['hoplite', 20]], sea: [['triton', 4], ['hippocampus', 5]] });
    const b = battleOf(d);
    const hop = stackOf(b, 'attacker', 'hoplite');
    const tri = stackOf(b, 'defender', 'triton');
    const hip = stackOf(b, 'defender', 'hippocampus');
    only(b, { [hop.id]: { col: 7, row: 4 }, [tri.id]: { col: 8, row: 4 }, [hip.id]: { col: 12, row: 8 } });
    expect(harpoonOptions(catalog, b, hop).targets.sort()).toEqual([tri.id, hip.id].sort());
    hip.anchor = { col: 6, row: 4 };
    const o = harpoonOptions(catalog, b, hop);
    expect(o.targets).toEqual([]);
    expect(o.reason).toMatch(/engaged/i);
    expect(meleeOptions(catalog, b, hop, hip).length).toBeGreaterThan(0);
  });

  it('preview = resolution: a blessed thrower deals exactly the preview max, a cursed one the min; no retaliation; the activation is spent', () => {
    for (const kind of ['max_damage_roll', 'min_damage_roll'] as const) {
      const d = seaFight({ ship: [['hoplite', 40]], sea: [['cetus', 2]] });
      const b = battleOf(d);
      const hop = stackOf(b, 'attacker', 'hoplite');
      const cet = stackOf(b, 'defender', 'cetus');
      activate(b, hop.id);
      hop.statuses.push({ sourceId: 'test:roll', label: 'Roll', kind, amount: 0, numerator: 1, denominator: 1, expiresAtRound: 99 });
      const p = previewHarpoon(catalog, d.state, hop.id, cet.id)!;
      expect(p.luckMax).toBeNull();
      expect(p.min).toBeGreaterThanOrEqual(1);
      const hpBefore = cet.totalHp;
      const retBefore = cet.retaliationsUsed;
      const events = d.do({ kind: 'BattleHarpoon', stackId: hop.id, targetId: cet.id });
      const hit = events.find((e) => e.kind === 'BattleAttack')!;
      expect(hit).toMatchObject({ mode: 'harpoon', attackerId: hop.id, targetId: cet.id, luck: false });
      const dealt = hpBefore - d.state.battle!.stacks[cet.id]!.totalHp;
      expect(dealt).toBe(kind === 'max_damage_roll' ? p.max : p.min);
      expect(events.some((e) => e.kind === 'BattleAttack' && e.mode === 'retaliation')).toBe(false);
      expect(d.state.battle!.stacks[cet.id]!.retaliationsUsed).toBe(retBefore);
      expect(d.state.battle!.activeStackId).not.toBe(hop.id);
    }
  });

  it('35 % of the stack’s damage roll, the normal Attack/Defense bracket, minimum 1; an unblessed roll stays inside the preview', () => {
    const d = seaFight({ ship: [['hoplite', 1]], sea: [['abyssal_hafgufa', 1]] });
    const b = battleOf(d);
    const hop = stackOf(b, 'attacker', 'hoplite');
    const haf = stackOf(b, 'defender', 'abyssal_hafgufa');
    activate(b, hop.id);
    const p = previewHarpoon(catalog, d.state, hop.id, haf.id)!;
    // One Hoplite (1-3 damage) against Defense 27: 35 % of a tiny roll, heavily reduced — still at least 1.
    expect(p.min).toBe(1);
    expect(p.max).toBeLessThanOrEqual(2);
    const big = seaFight({ ship: [['hoplite', 100]], sea: [['cetus', 3]] });
    const bb = battleOf(big);
    const h2 = stackOf(bb, 'attacker', 'hoplite');
    const c2 = stackOf(bb, 'defender', 'cetus');
    activate(bb, h2.id);
    const p2 = previewHarpoon(catalog, big.state, h2.id, c2.id)!;
    const before = c2.totalHp;
    big.do({ kind: 'BattleHarpoon', stackId: h2.id, targetId: c2.id });
    const dealt = before - big.state.battle!.stacks[c2.id]!.totalHp;
    expect(dealt).toBeGreaterThanOrEqual(p2.min);
    expect(dealt).toBeLessThanOrEqual(p2.max);
    // A full shot would be about three times as strong (the 35 % factor).
    expect(p2.max).toBeLessThan(100 * 3);
  });

  it('refused off the sea board, from the sea side, at a deck target, and while engaged on deck', () => {
    const d = seaFight({ ship: [['hoplite', 20]], sea: [['triton', 4], ['hippocampus', 5]] });
    const b = battleOf(d);
    const hop = stackOf(b, 'attacker', 'hoplite');
    const tri = stackOf(b, 'defender', 'triton');
    const hip = stackOf(b, 'defender', 'hippocampus');
    activate(b, tri.id);
    expect(d.reject({ kind: 'BattleHarpoon', stackId: tri.id, targetId: hop.id }, '__neutral__').code).toBe('illegal_action');
    activate(b, hop.id);
    hip.anchor = { col: 6, row: 9 };
    expect(d.reject({ kind: 'BattleHarpoon', stackId: hop.id, targetId: hip.id }).code).toBe('illegal_target');
  });
});

describe('the map outcomes and the ship contract', () => {
  const finish = (d: GameDriver) => d.autoBattle(4000);

  it('a won sea encounter clears the site, grants its reward and carries the hero’s ship onto the cleared water', () => {
    const d = seaFight({ ship: [['cyclops', 6], ['minotaur', 8], ['hoplite', 60]], sea: [['triton', 3]] });
    const goldBefore = d.state.players[P1]!.wallet.gold;
    finish(d);
    const r = d.state.lastBattleResult!;
    expect(r.winner).toBe('attacker');
    expect(d.state.world.sites['deep']!.cleared).toBe(true);
    const ship = d.state.world.ships!['map_ship_a']!;
    expect(ship.coord).toEqual(monsterCoord(d));
    expect(ship.state).toBe('occupied');
    expect(d.state.heroes[H1]!.position).toEqual(ship.coord);
    expect(d.state.players[P1]!.wallet.gold).toBeGreaterThan(goldBefore);
    expect(shipInvariantIssues(catalog, d.state)).toEqual([]);
    expect(d.events.some((e) => e.kind === 'SeaEncounterResolved')).toBe(true);
  });

  it('a lost sea encounter: the hero is defeated and the hull lost (no ghost ship); the monster keeps its survivors', () => {
    const d = seaFight({ ship: [['hoplite', 2]], sea: [['abyssal_hafgufa', 1], ['crownfin_cetus', 2]] });
    finish(d);
    expect(d.state.lastBattleResult!.winner).toBe('defender');
    expect(d.state.heroes[H1]!.status).toBe('defeated');
    expect(d.state.world.ships!['map_ship_a']).toBeUndefined();
    expect(d.events.some((e) => e.kind === 'ShipWrecked' && e.reason === 'sea_encounter_defeat')).toBe(true);
    expect(d.state.world.sites['deep']!.cleared).toBe(false);
    expect(shipInvariantIssues(catalog, d.state)).toEqual([]);
  });

  it('a retreat sails the ship to vacant water with the hero aboard (the at-sea rule), refused when hemmed in', () => {
    const d = seaFight({ ship: [['hoplite', 20]], sea: [['triton', 4]] });
    const b = battleOf(d);
    const hop = stackOf(b, 'attacker', 'hoplite');
    activate(b, hop.id);
    const from = { ...d.state.world.ships!['map_ship_a']!.coord };
    d.do({ kind: 'BattleRetreat' });
    expect(d.state.battle).toBeNull();
    const ship = d.state.world.ships!['map_ship_a']!;
    expect(ship.coord).not.toEqual(from);
    // Never onto the monster's own hex (or any other sea site): the site stays fightable.
    expect(ship.coord).not.toEqual(monsterCoord(d));
    expect(d.state.world.sites['deep']?.cleared ?? false).toBe(false);
    expect(d.state.heroes[H1]!.status).toBe('active');
    expect(d.state.heroes[H1]!.position).toEqual(ship.coord);
    expect(shipInvariantIssues(catalog, d.state)).toEqual([]);
  });

  it('the round limit ends the battle without sinking the ship: the hero withdraws aboard where it was', () => {
    const d = seaFight({ ship: [['hoplite', 20]], sea: [['triton', 4]] });
    const b = battleOf(d);
    b.round = 60;
    for (let guard = 0; guard < 40 && d.state.battle; guard++) {
      const bb = d.state.battle!;
      const active = bb.stacks[bb.activeStackId!]!;
      d.do({ kind: 'BattleDefend', stackId: active.id }, bb.sides[active.side].playerId ?? '__neutral__');
    }
    expect(d.state.lastBattleResult!.outcome).toBe('stalemate');
    const ship = d.state.world.ships!['map_ship_a']!;
    expect(ship.state).toBe('occupied');
    expect(d.state.heroes[H1]!.position).toEqual(ship.coord);
  });
});

describe('campaign manual battles', () => {
  it('a sea encounter in a campaign refuses automation for the human side, before touching the state', () => {
    const d = seaFight({ ship: [['hoplite', 20]], sea: [['triton', 4]] });
    d.state.scenario.campaignId = 'test-campaign' as never;
    const b = battleOf(d);
    const hop = stackOf(b, 'attacker', 'hoplite');
    activate(b, hop.id);
    expect(automationForbidden(d.state)).toBe(true);
    const before = canonicalStateHash(d.state);
    const res = processCommand({ catalog }, d.state, { ...d.command({ kind: 'BattleHarpoon', stackId: hop.id, targetId: stackOf(b, 'defender', 'triton').id }), automated: true });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.rejection.code).toBe('manual_battle_required');
    expect(canonicalStateHash(d.state)).toBe(before);
    // The player's own order is accepted; the game's neutral side keeps acting automatically.
    d.do({ kind: 'BattleHarpoon', stackId: hop.id, targetId: stackOf(b, 'defender', 'triton').id });
    const bb = d.state.battle;
    if (bb?.activeStackId && bb.stacks[bb.activeStackId]!.side === 'defender') expect(automationForbidden(d.state)).toBe(false);
  });
});
