/**
 * Boarding battles (expedition kit §07–§08, scenario feature `navalMovementV1`): the two-ship
 * board `boarding_two_ships_v1` and its legal-cell mask in every placement and movement rule
 * (deployment, ground steps for one- and two-hex creatures, flight landings, forced moves, the
 * bridge blocked by an enemy, ranged attacks across the water), and the map outcomes (victory,
 * defeat, retreat, surrender; the loser's hull removed; no ghost occupancy; save and reload).
 */
import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import {
  BOARDING_TWO_SHIPS_V1,
  battleCellLegal,
  boardZone,
  canonicalStateHash,
  cellKey,
  footprintCells,
  layoutZoneCells,
  legalActions,
  legalBattleCells,
  neutralAbilityOptions,
  previewShot,
  reachableAnchors,
  routeTo,
  shipInvariantIssues,
  sideStacks,
  stackCells,
  statsOf,
  type BattleCell,
  type BattleStackState,
  type BattleState,
  type MatchState,
} from '../src';
import { catalog, cellOf, navalDriver, slots } from '@pr/testing';

const P1 = 'player';
const P2 = 'p2';
const H1 = 'leader_1';
const H2 = 'leader_2';
type Army = [string, number][];

const SEVEN: Army = [['hoplite', 30], ['peltast', 20], ['griffin', 8], ['cavalry', 6], ['temple_adept', 5], ['minotaur', 3], ['cyclops', 1]];

interface BoardingOpts {
  attacker?: Army;
  defender?: Army;
  /** Extra ships (rectangle cells) around the attacker, e.g. to hem it in. */
  extraShips?: (doc: { height: number }) => { id: string; q: number; r: number; owner?: number }[];
}

/** H1 (aboard map_ship_a at rect 13,10) boards H2 (aboard map_ship_b at rect 14,10). */
function boarding(opts: BoardingOpts = {}): GameDriver {
  const d = navalDriver({
    ships: (doc) => [{ id: 'free', ...cellOf(doc, 10, 8) }, { id: 'a', ...cellOf(doc, 13, 10), owner: 0 }, { id: 'b', ...cellOf(doc, 14, 10), owner: 1 }, ...(opts.extraShips?.(doc) ?? [])],
  });
  const s = d.state;
  for (const [heroId, shipId, army] of [
    [H1, 'map_ship_a', opts.attacker ?? SEVEN],
    [H2, 'map_ship_b', opts.defender ?? SEVEN],
  ] as const) {
    const ship = s.world.ships![shipId]!;
    const hero = s.heroes[heroId]!;
    ship.heroId = heroId;
    ship.state = 'occupied';
    hero.position = { ...ship.coord };
    hero.army.slots = slots(army);
    hero.movementPoints = 1000;
  }
  expect(shipInvariantIssues(catalog, s)).toEqual([]);
  d.do({ kind: 'AttackShip', heroId: H1, targetShipId: 'map_ship_b' });
  return d;
}

const battleOf = (d: GameDriver): BattleState => d.state.battle!;
const deckOf = (side: 'attacker' | 'defender') => (side === 'attacker' ? 'attacker_deck' : 'defender_deck');

/** Give a stack enough speed to cross the whole board this activation (a fixture edit). */
function fast(stack: BattleStackState, amount = 30): void {
  stack.statuses.push({ sourceId: 'test:fast', label: 'Fast', kind: 'speed_bonus', amount, numerator: 1, denominator: 1, expiresAtRound: 999 });
}

/** Clear the board except the listed stacks, placed where asked (a fixture edit of a fresh battle). */
function only(battle: BattleState, placed: Record<string, BattleCell>): void {
  for (const st of Object.values(battle.stacks)) {
    if (placed[st.id]) st.anchor = placed[st.id]!;
    else st.totalHp = 0;
  }
  // The cleared stacks leave no corpses in the way.
  for (const id of Object.keys(battle.stacks)) if (!placed[id]) delete battle.stacks[id];
  battle.normalQueue = battle.normalQueue.filter((id) => !!placed[id]);
  battle.waitQueue = [];
}

const stackOf = (battle: BattleState, side: 'attacker' | 'defender', creatureId: string) => Object.values(battle.stacks).find((s) => s.side === side && s.creatureId === creatureId)!;

describe('the boarding board', () => {
  it('the layout is the delivered 102 legal cells: two 4 x 11 decks and one 7 x 2 bridge', () => {
    expect(layoutZoneCells(BOARDING_TWO_SHIPS_V1, 'attacker_deck')).toHaveLength(44);
    expect(layoutZoneCells(BOARDING_TWO_SHIPS_V1, 'defender_deck')).toHaveLength(44);
    const bridge = layoutZoneCells(BOARDING_TWO_SHIPS_V1, 'bridge');
    expect(bridge).toHaveLength(14);
    expect(bridge.every((c) => c.col >= 4 && c.col <= 10 && (c.row === 4 || c.row === 5))).toBe(true);
    expect(layoutZoneCells(BOARDING_TWO_SHIPS_V1, 'attacker_deck').every((c) => c.col <= 3)).toBe(true);
    expect(layoutZoneCells(BOARDING_TWO_SHIPS_V1, 'defender_deck').every((c) => c.col >= 11)).toBe(true);
  });

  it('AttackShip creates a naval_boarding battle on boarding_two_ships_v1 with the mask, both ships in battle, no obstacles', () => {
    const d = boarding();
    const b = battleOf(d);
    expect(b.encounter).toMatchObject({ kind: 'naval_boarding', attackerShipId: 'map_ship_a', defenderShipId: 'map_ship_b', attackerHeroId: H1, defenderHeroId: H2 });
    expect(b.encounter.destination).toEqual(d.state.world.ships!['map_ship_b']!.coord);
    expect(b.archetype).toBe('boarding_two_ships_v1');
    expect(b.board?.layoutId).toBe('boarding_two_ships_v1');
    expect(legalBattleCells(b)).toHaveLength(102);
    expect(b.obstacles).toEqual([]);
    expect(d.state.world.ships!['map_ship_a']!.state).toBe('in_battle');
    expect(d.state.world.ships!['map_ship_b']!.state).toBe('in_battle');
    const kinds = d.events.map((e) => e.kind);
    expect(kinds.indexOf('BoardingStarted')).toBeLessThan(kinds.indexOf('BattleStarted'));
    expect(shipInvariantIssues(catalog, d.state)).toEqual([]);
    // The boarding paid one sea edge.
    expect(d.state.heroes[H1]!.movementPoints).toBe(900);
  });

  it('seven stacks a side, two-hex creatures included, deploy on their own deck only', () => {
    const d = boarding();
    const b = battleOf(d);
    for (const side of ['attacker', 'defender'] as const) {
      const mine = sideStacks(b, side);
      expect(mine).toHaveLength(7);
      expect(mine.filter((s) => statsOf(catalog, s.creatureId).footprint === 2)).toHaveLength(4);
      const cells = mine.flatMap((s) => stackCells(catalog, s));
      expect(new Set(cells.map(cellKey)).size).toBe(cells.length);
      for (const c of cells) expect(boardZone(b, c)).toBe(deckOf(side));
    }
  });

  it('a one-hex and a two-hex walker cross by the bridge: both cells legal at every step and at the end; never a water anchor', () => {
    const d = boarding();
    const b = battleOf(d);
    for (const creature of ['hoplite', 'cavalry']) {
      const st = stackOf(b, 'attacker', creature);
      fast(st);
      const reach = reachableAnchors(catalog, b, st);
      for (const node of reach.values()) for (const c of footprintCells(node.cell, statsOf(catalog, st.creatureId).footprint, st.facing)) expect(battleCellLegal(b, c)).toBe(true);
      const far = [...reach.values()].filter((n) => boardZone(b, n.cell) === 'defender_deck').sort((x, y) => x.dist - y.dist)[0];
      expect(far, `${creature} reaches the defender deck`).toBeDefined();
      const route = routeTo(st, reach, far!.cell);
      expect(route.length).toBeGreaterThan(7);
      for (const step of route) for (const c of footprintCells(step, statsOf(catalog, st.creatureId).footprint, st.facing)) expect(battleCellLegal(b, c)).toBe(true);
      expect(route.some((c) => boardZone(b, c) === 'bridge')).toBe(true);
    }
  });

  it('flyers cross the water but land only on a complete legal unoccupied footprint', () => {
    const d = boarding();
    const b = battleOf(d);
    const griffin = stackOf(b, 'attacker', 'griffin');
    fast(griffin, 6);
    const reach = reachableAnchors(catalog, b, griffin);
    const cells = [...reach.values()].map((n) => n.cell);
    // Over open water: an anchor beyond the water with no ground route this short.
    expect(cells.some((c) => c.col >= 11)).toBe(true);
    for (const c of cells) for (const x of footprintCells(c, 2, griffin.facing)) expect(battleCellLegal(b, x)).toBe(true);
    expect(cells.some((c) => boardZone(b, c) === 'water')).toBe(false);
  });

  it('a forced pull that would end in the water fails (no drowning); the same pull on the deck works', () => {
    const d = boarding({ attacker: [['hoplite', 10]], defender: [['ahuitzotl', 10]] });
    const b = battleOf(d);
    const snarer = stackOf(b, 'defender', 'ahuitzotl');
    const target = stackOf(b, 'attacker', 'hoplite');
    // Straight two-hex line from the defender deck (11,2) to the bridge end (10,4): the middle (10,3) is water.
    only(b, { [snarer.id]: { col: 11, row: 2 }, [target.id]: { col: 10, row: 4 } });
    expect(battleCellLegal(b, { col: 10, row: 3 })).toBe(false);
    const options = neutralAbilityOptions(catalog, b, snarer).find((o) => catalog.abilities[o.abilityId]?.rule.type === 'tail_snare')!;
    expect(options.targets).toEqual([]);
    expect(options.reason).toBe('The pull would end in the water');
    b.activeStackId = snarer.id;
    b.phase = 'normal';
    const r = d.reject({ kind: 'BattleUseAbility', stackId: snarer.id, abilityId: options.abilityId, targetId: target.id }, P2);
    expect(r.code).toBe('illegal_target');
    // On the deck the pull is legal.
    target.anchor = { col: 13, row: 2 };
    snarer.anchor = { col: 11, row: 2 };
    const ok = neutralAbilityOptions(catalog, b, snarer).find((o) => o.abilityId === options.abilityId)!;
    expect(ok.targets).toEqual([target.id]);
  });

  it('an enemy holding both bridge cells of a column blocks every walker; flyers still pass', () => {
    const d = boarding({ attacker: [['hoplite', 10], ['griffin', 5]], defender: [['minotaur', 2], ['hoplite', 10], ['peltast', 5]] });
    const b = battleOf(d);
    const walker = stackOf(b, 'attacker', 'hoplite');
    const flyer = stackOf(b, 'attacker', 'griffin');
    const plugA = stackOf(b, 'defender', 'hoplite');
    const plugB = stackOf(b, 'defender', 'peltast');
    const far = stackOf(b, 'defender', 'minotaur');
    only(b, { [walker.id]: { col: 1, row: 4 }, [flyer.id]: { col: 1, row: 8 }, [plugA.id]: { col: 7, row: 4 }, [plugB.id]: { col: 7, row: 5 }, [far.id]: { col: 13, row: 8 } });
    fast(walker);
    fast(flyer);
    const walk = [...reachableAnchors(catalog, b, walker).values()];
    expect(walk.length).toBeGreaterThan(0);
    expect(walk.every((n) => n.cell.col < 7)).toBe(true);
    expect([...reachableAnchors(catalog, b, flyer).values()].some((n) => n.cell.col >= 11)).toBe(true);
  });

  it('ranged attacks cross the water normally (no wall penalty)', () => {
    const d = boarding({ attacker: [['peltast', 20]], defender: [['hoplite', 30]] });
    const b = battleOf(d);
    const shooter = stackOf(b, 'attacker', 'peltast');
    const target = stackOf(b, 'defender', 'hoplite');
    only(b, { [shooter.id]: { col: 3, row: 0 }, [target.id]: { col: 11, row: 0 } });
    b.activeStackId = shooter.id;
    b.phase = 'normal';
    const la = legalActions(catalog, d.state)!;
    expect(la.shootTargets).toEqual([target.id]);
    const preview = previewShot(catalog, d.state, shooter.id, target.id)!;
    expect(preview.notes.some((n) => /wall/i.test(n))).toBe(false);
    const before = target.totalHp;
    d.do({ kind: 'BattleShoot', stackId: shooter.id, targetId: target.id }, P1);
    expect(d.state.battle ? d.state.battle.stacks[target.id]!.totalHp : 0).toBeLessThan(before);
  });
});

describe('boarding outcomes on the map', () => {
  function finish(d: GameDriver): void {
    d.autoBattle(4000);
    expect(d.state.battle).toBe(null);
  }

  it('attacker victory: the defender is defeated, its hull removed, the attacker ship takes the contested hex', () => {
    const d = boarding({ attacker: [['minotaur', 40], ['cyclops', 6]], defender: [['hoplite', 2]] });
    const contested = { ...d.state.world.ships!['map_ship_b']!.coord };
    finish(d);
    expect(d.state.lastBattleResult?.winner).toBe('attacker');
    expect(d.state.heroes[H2]!.status).toBe('defeated');
    expect(d.state.world.ships!['map_ship_b']).toBeUndefined();
    expect(d.events.find((e) => e.kind === 'ShipWrecked')).toMatchObject({ shipId: 'map_ship_b', coord: contested, reason: 'boarding_defeat' });
    const a = d.state.world.ships!['map_ship_a']!;
    expect(a).toMatchObject({ coord: contested, heroId: H1, state: 'occupied' });
    expect(d.state.heroes[H1]!.position).toEqual(contested);
    expect(d.events.some((e) => e.kind === 'BoardingResolved')).toBe(true);
    expect(shipInvariantIssues(catalog, d.state)).toEqual([]);
  });

  it('defender victory: the attacker is defeated and its hull removed; the defender stays where it was', () => {
    const d = boarding({ attacker: [['hoplite', 2]], defender: [['minotaur', 40], ['cyclops', 6]] });
    const bCoord = { ...d.state.world.ships!['map_ship_b']!.coord };
    finish(d);
    expect(d.state.lastBattleResult?.winner).toBe('defender');
    expect(d.state.heroes[H1]!.status).toBe('defeated');
    expect(d.state.world.ships!['map_ship_a']).toBeUndefined();
    expect(d.state.world.ships!['map_ship_b']).toMatchObject({ coord: bCoord, heroId: H2, state: 'occupied' });
    expect(d.state.heroes[H2]!.position).toEqual(bCoord);
    expect(shipInvariantIssues(catalog, d.state)).toEqual([]);
  });

  /** Let the AI act until one of the attacker's stacks is active. */
  function untilAttackerActs(d: GameDriver): void {
    for (let i = 0; i < 40 && d.state.battle; i++) {
      const b = d.state.battle;
      if (b.activeStackId && b.stacks[b.activeStackId]!.side === 'attacker') return;
      d.autoBattleStep();
    }
  }

  it('retreat: the same ship withdraws to a vacant water hex with its hero aboard (the army is lost as on land); never a land teleport', () => {
    const d = boarding();
    const aCoord = { ...d.state.world.ships!['map_ship_a']!.coord };
    untilAttackerActs(d);
    const la = legalActions(catalog, d.state)!;
    expect(la.canRetreat).toBe(true);
    expect(la.withdrawalBlockedReason).toBe(null);
    d.do({ kind: 'BattleRetreat' }, P1);
    expect(d.state.battle).toBe(null);
    const a = d.state.world.ships!['map_ship_a']!;
    expect(a.heroId).toBe(H1);
    expect(a.coord).not.toEqual(aCoord);
    expect(d.state.heroes[H1]!.status).toBe('active');
    expect(d.state.heroes[H1]!.position).toEqual(a.coord);
    expect(d.state.heroes[H1]!.army.slots.every((x) => !x)).toBe(true);
    expect(d.events.find((e) => e.kind === 'ShipWithdrawn')).toMatchObject({ shipId: 'map_ship_a', heroId: H1, from: aCoord, to: a.coord });
    expect(d.events.some((e) => e.kind === 'HeroRetreated')).toBe(false);
    expect(d.state.world.ships!['map_ship_b']).toMatchObject({ heroId: H2, state: 'occupied' });
    expect(shipInvariantIssues(catalog, d.state)).toEqual([]);
  });

  it('surrender: the hero sails away with the survivors after paying; disabled with a reason when no open water is left', () => {
    const d = boarding({ attacker: [['hoplite', 10]], defender: [['hoplite', 40]] });
    untilAttackerActs(d);
    const gold = d.state.players[P1]!.wallet.gold;
    d.do({ kind: 'BattleSurrender' }, P1);
    expect(d.state.heroes[H1]!.status).toBe('active');
    expect(d.state.heroes[H1]!.army.slots.some((x) => x && x.count > 0)).toBe(true);
    expect(d.state.players[P1]!.wallet.gold).toBeLessThan(gold);
    expect(shipInvariantIssues(catalog, d.state)).toEqual([]);

    // Hemmed in: every other water neighbour of the attacker holds a ship.
    const hemmed = boarding({
      extraShips: (doc) => [
        { id: 'x1', ...cellOf(doc, 12, 10) },
        { id: 'x2', ...cellOf(doc, 12, 9) },
        { id: 'x3', ...cellOf(doc, 13, 9) },
        { id: 'x4', ...cellOf(doc, 12, 11) },
        { id: 'x5', ...cellOf(doc, 13, 11) },
        { id: 'x6', ...cellOf(doc, 14, 9) },
        { id: 'x7', ...cellOf(doc, 14, 11) },
      ],
    });
    untilAttackerActs(hemmed);
    const la = legalActions(catalog, hemmed.state)!;
    expect(la.canRetreat).toBe(false);
    expect(la.canSurrender).toBe(false);
    expect(la.withdrawalBlockedReason).toMatch(/No open water/);
    expect(hemmed.reject({ kind: 'BattleRetreat' }, P1).message).toMatch(/No open water/);
  });

  it('a boarding battle saved and reloaded mid-fight resolves exactly as without the reload', () => {
    const a = boarding();
    const b = boarding();
    for (let i = 0; i < 6; i++) {
      a.autoBattleStep();
      b.autoBattleStep();
    }
    b.state = JSON.parse(JSON.stringify(b.state)) as MatchState;
    expect(b.state.battle?.board).toEqual(a.state.battle?.board);
    finish(a);
    finish(b);
    expect(canonicalStateHash(b.state)).toBe(canonicalStateHash(a.state));
    expect(shipInvariantIssues(catalog, b.state)).toEqual([]);
  });
});

describe('land battles and sieges keep their board', () => {
  it('a land battle between two heroes on the same island has no mask: every cell is legal, obstacles as before', () => {
    const d = navalDriver();
    const s = d.state;
    const a = s.heroes[H1]!;
    const b = s.heroes[H2]!;
    a.position = cellOf(s.world.map, 4, 6);
    a.movementPoints = 1000;
    b.position = cellOf(s.world.map, 5, 6);
    d.do({ kind: 'MoveHero', heroId: H1, destination: b.position, confirmEncounter: true });
    const battle = d.state.battle!;
    expect(battle.encounter.kind).toBe('hero');
    expect(battle.archetype).not.toBe('boarding_two_ships_v1');
    expect(battle.board ?? null).toBe(null);
    expect(legalBattleCells(battle)).toHaveLength(battle.cols * battle.rows);
    for (const o of battle.obstacles) expect(battleCellLegal(battle, o)).toBe(true);
    d.autoBattle(4000);
    expect(shipInvariantIssues(catalog, d.state)).toEqual([]);
  });
});


describe('Mooring on either boarding side',()=>{
 it.each(['attacker','defender'] as const)('%s carries the blessing into its first sea battle, including after reload',side=>{
  const d=navalDriver({ships:doc=>[{id:'free',...cellOf(doc,10,8)},{id:'a',...cellOf(doc,13,10),owner:0},{id:'b',...cellOf(doc,14,10),owner:1}]});
  d.state.scenario.features={...d.state.scenario.features!,mythicLibraryV2:true,interventions:true};
  for(const [heroId,shipId] of [[H1,'map_ship_a'],[H2,'map_ship_b']]){const h=d.state.heroes[heroId!]!,ship=d.state.world.ships![shipId!]!;h.position={...ship.coord};ship.heroId=h.id;ship.state='occupied';h.movementPoints=1000;}
  const hero=d.state.heroes[side==='attacker'?H1:H2]!,p=d.state.players[hero.ownerId]!;
  p.pantheonId='greek';p.pantheon.patronGodId='poseidon';p.wallet.favor=100;
  d.state.activePlayerId=p.id;d.do({kind:'InvokeIntervention',interventionId:'blessing2_poseidons_mooring',heroId:hero.id});
  d.state=JSON.parse(JSON.stringify(d.state));d.state.activePlayerId=P1;
  d.do({kind:'AttackShip',heroId:H1,targetShipId:'map_ship_b'});
  expect(d.state.battle!.sides[side].effects!.library).toContainEqual({type:'library_displacement_guard'});
  expect(Object.values(d.state.world.ships!).every(ship=>!ship.mooring)).toBe(true);
 });
});
