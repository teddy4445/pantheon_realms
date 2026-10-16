/**
 * Fixtures for the missile and impact checks (battle FX delivery 2026-10-15; v2fx.spec.ts).
 * A fixture is an ordinary save: the player's leader, leading up to seven shooters, attacks the
 * gold mine's guards (or besieges Eastharbor), built headlessly with the same rules and processor
 * as the game and brought in through Load → Import. The field battle is laid out with each
 * shooter and its target on chosen cells (left, right, diagonal, near and far; one- and two-hex
 * targets; a target of one creature that falls to the shot), the player's shooters acting first
 * in the planned order. Every planned shot is played headlessly on a copy first, so a layout the
 * rules would refuse (out of range, engaged) fails here and not half-way through a browser run.
 * Nothing here is a hook into the running game.
 */
import { axialNeighbors, cellDistance, processCommand, quoteMovement, stackCells, type GameCommand, type MatchState } from '@pr/rules';
import { neutralBattle, type Placement } from './v2battleFixtures';
import { approachTile, skirmishDriver, slots, writeSave } from './fixtures';

export interface PlannedShot {
  /** Test key of the shooting stack (a player placement). */
  readonly shooter: string;
  /** Test key of the target (an enemy placement). */
  readonly target: string;
  /** What the shot shows (screenshot name part). */
  readonly label: string;
}

export interface FxBattleSpec {
  readonly name: string;
  readonly climate?: string;
  readonly archetype?: string;
  readonly player: readonly Placement[];
  readonly enemy: readonly Placement[];
  readonly counts?: Readonly<Record<string, number>>;
  readonly shots: readonly PlannedShot[];
}

export interface CheckedShot extends PlannedShot {
  readonly shooterId: string;
  readonly targetId: string;
  readonly creatureId: string;
  readonly targetCreatureId: string;
  /** Where the target's anchor stands (click it to shoot). */
  readonly targetCell: { col: number; row: number };
  readonly shooterCell: { col: number; row: number };
  /** +1 east, −1 west (from the shooter's cells to the target's, as the rules see the board). */
  readonly dir: 1 | -1;
  readonly distance: number;
  readonly targetFootprint: 1 | 2;
  /** The rules' outcome of the shot in the headless rehearsal (the browser run must show the same). */
  readonly killed: number;
  readonly targetFalls: boolean;
  /** The target's total HP after the shot (the rules' outcome; any playback speed ends there). */
  readonly targetHpAfter: number;
}

export interface FxBattle {
  readonly file: string;
  readonly ids: Record<string, string>;
  readonly shots: readonly CheckedShot[];
}

/** Build the battle save and rehearse its shots headlessly (each must be legal, in the planned order). */
export function fxBattle(spec: FxBattleSpec): FxBattle {
  const shooters = spec.shots.map((s) => s.shooter);
  const order = [...shooters, ...spec.player.map((p) => p.key).filter((k) => !shooters.includes(k)), ...spec.enemy.map((e) => e.key)];
  const nb = neutralBattle(spec.name, {
    ...(spec.climate ? { climate: spec.climate } : {}),
    ...(spec.archetype ? { archetype: spec.archetype } : {}),
    player: [...spec.player],
    enemy: [...spec.enemy],
    order,
    ...(spec.counts ? { counts: spec.counts } : {}),
  });
  return { file: nb.file, ids: nb.ids, shots: rehearse(spec.name, nb.d.catalog, nb.d.state, nb.ids, spec.shots) };
}

/**
 * Play the planned shots headlessly on a copy of `state` (the player's commands, in order): each
 * must be legal and be one shot event; returns what the browser run must show.
 */
export function rehearse(name: string, catalog: Parameters<typeof stackCells>[0], state: MatchState, ids: Readonly<Record<string, string>>, shots: readonly PlannedShot[]): CheckedShot[] {
  const cellsOf = (state: MatchState, id: string) => stackCells(catalog, state.battle!.stacks[id]!);
  let st = JSON.parse(JSON.stringify(state)) as MatchState;
  // No two stacks share a cell.
  const taken = new Map<string, string>();
  for (const id of Object.values(ids)) {
    for (const c of cellsOf(st, id)) {
      const k = `${c.col},${c.row}`;
      must(!taken.has(k), `${name}: ${id} and ${taken.get(k)} overlap at ${k}`);
      must(c.col >= 0 && c.col < st.battle!.cols && c.row >= 0 && c.row < st.battle!.rows, `${name}: ${id} on the board at ${k}`);
      taken.set(k, id);
    }
  }
  const out: CheckedShot[] = [];
  shots.forEach((s, i) => {
    const shooterId = ids[s.shooter]!;
    const targetId = ids[s.target]!;
    const b = st.battle!;
    must(b.activeStackId === shooterId, `${name}/${s.label}: ${s.shooter} acts next (not ${b.activeStackId})`);
    const sh = b.stacks[shooterId]!;
    const tg = b.stacks[targetId]!;
    const from = cellsOf(st, shooterId);
    const to = cellsOf(st, targetId);
    const mean = (cs: { col: number }[]) => cs.reduce((n, c) => n + c.col, 0) / cs.length;
    const cmd = { kind: 'BattleShoot', stackId: shooterId, targetId, commandId: `fx-rehearsal-${i}`, expectedRevision: st.revision, actorPlayerId: 'player' } as GameCommand;
    const r = processCommand({ catalog }, st, cmd);
    if (!r.ok) throw new Error(`${name}/${s.label}: the rules refuse the shot: ${r.rejection.message}`);
    const attack = r.events.find((e) => e.kind === 'BattleAttack' && e.attackerId === shooterId && e.mode === 'shot');
    must(!!attack, `${name}/${s.label}: a shot event`);
    must(r.events.filter((e) => e.kind === 'BattleAttack' && e.attackerId === shooterId).length === 1, `${name}/${s.label}: a shot is one event`);
    out.push({
      ...s,
      shooterId,
      targetId,
      creatureId: sh.creatureId,
      targetCreatureId: tg.creatureId,
      targetCell: { ...tg.anchor },
      shooterCell: { ...sh.anchor },
      dir: mean(to) >= mean(from) ? 1 : -1,
      distance: Math.min(...from.flatMap((x) => to.map((y) => cellDistance(x, y)))),
      targetFootprint: to.length === 2 ? 2 : 1,
      killed: attack && attack.kind === 'BattleAttack' ? attack.killed : 0,
      targetFalls: !!attack && attack.kind === 'BattleAttack' && attack.targetRemaining <= 0,
      targetHpAfter: r.state.battle!.stacks[targetId]!.totalHp,
    });
    st = r.state;
  });
  return out;
}

function must(ok: boolean, message: string): asserts ok {
  if (!ok) throw new Error(message);
}

// ------------------------------------------------------------------ the field battles

const P = (key: string, creatureId: string, col: number, row: number, count = 12): Placement => ({ key, side: 'attacker', creatureId, count, at: [col, row] });
const E = (key: string, creatureId: string, col: number, row: number, count = 20): Placement => ({ key, side: 'defender', creatureId, count, at: [col, row] });

/** Greek and Norse shooters on dark ground (jungle grove): long right and left, near, diagonal both ways, nearly straight down; a kill. */
export const DARK: FxBattleSpec = {
  name: 'v2fx-dark',
  climate: 'jungle',
  archetype: 'grove',
  player: [
    P('pel', 'peltast', 1, 1),
    P('vpel', 'veteran_peltast', 12, 3),
    P('ade', 'temple_adept', 4, 5),
    P('seer', 'temple_seer', 9, 8),
    P('cyc', 'cyclops', 2, 8, 3),
    P('scyc', 'stormforged_cyclops', 14, 9, 3),
    P('lind', 'norse_lindworm', 8, 3, 6),
  ],
  enemy: [
    E('t_far', 'hoplite', 13, 1),
    E('t_west', 'hoplite', 2, 3),
    E('t_one', 'hoplite', 6, 5),
    E('t_mino', 'minotaur', 3, 10, 4),
    E('t_mino2', 'minotaur', 11, 6, 4),
    E('t_cav', 'cavalry', 6, 0, 6),
    E('t_down', 'hoplite', 8, 10),
  ],
  counts: { t_one: 1 },
  shots: [
    { shooter: 'pel', target: 't_far', label: 'peltast-long-right' },
    { shooter: 'vpel', target: 't_west', label: 'veteran_peltast-long-left' },
    { shooter: 'ade', target: 't_one', label: 'temple_adept-short-right-kill' },
    { shooter: 'seer', target: 't_mino', label: 'temple_seer-diagonal-down-left-2hex' },
    { shooter: 'cyc', target: 't_mino2', label: 'cyclops-diagonal-up-right-2hex' },
    { shooter: 'scyc', target: 't_cav', label: 'stormforged_cyclops-diagonal-up-left-2hex' },
    { shooter: 'lind', target: 't_down', label: 'norse_lindworm-down' },
  ],
};

/** Norse, Egyptian and Japanese shooters on sand (desert coast road). */
export const SAND: FxBattleSpec = {
  name: 'v2fx-sand',
  climate: 'desert',
  archetype: 'coast_road',
  player: [
    P('slind', 'norse_storm_lindworm', 3, 1, 6),
    P('jack', 'egyptian_jackal_guardian', 13, 4),
    P('anu', 'egyptian_anubian_warden', 6, 7),
    P('dcol', 'egyptian_desert_colossus', 2, 9, 3),
    P('vcol', 'egyptian_divine_colossus', 12, 6, 3),
    P('kir', 'japanese_kirin', 6, 10, 4),
    P('ckir', 'japanese_celestial_kirin', 10, 1, 4),
  ],
  enemy: [
    E('t_e', 'hoplite', 12, 2),
    E('t_w', 'hoplite', 4, 4),
    E('t_mino', 'minotaur', 8, 7, 4),
    E('t_cav', 'cavalry', 12, 9, 6),
    E('t_ne', 'hoplite', 13, 0),
    E('t_one', 'hoplite', 5, 1),
  ],
  counts: { t_one: 1 },
  shots: [
    { shooter: 'slind', target: 't_e', label: 'norse_storm_lindworm-right' },
    { shooter: 'jack', target: 't_w', label: 'egyptian_jackal_guardian-long-left' },
    { shooter: 'anu', target: 't_mino', label: 'egyptian_anubian_warden-short-right-2hex' },
    { shooter: 'dcol', target: 't_cav', label: 'egyptian_desert_colossus-long-right-2hex' },
    { shooter: 'vcol', target: 't_w', label: 'egyptian_divine_colossus-left' },
    { shooter: 'kir', target: 't_ne', label: 'japanese_kirin-diagonal-up-right-long' },
    { shooter: 'ckir', target: 't_one', label: 'japanese_celestial_kirin-left-kill' },
  ],
};

/** Celtic, Mesoamerican and the hill slinger on snow (tundra open field). */
export const SNOW: FxBattleSpec = {
  name: 'v2fx-snow',
  climate: 'tundra',
  archetype: 'open_field',
  player: [
    P('ban', 'celtic_banshee', 2, 2),
    P('bban', 'celtic_battle_banshee', 12, 8),
    P('eag', 'mesoamerican_eagle_warrior_spirit', 3, 5),
    P('seag', 'mesoamerican_solar_eagle_warrior', 13, 2),
    P('xiu', 'mesoamerican_xiuhcoatl', 2, 10, 4),
    P('dxiu', 'mesoamerican_divine_xiuhcoatl', 9, 10, 4),
    P('sli', 'hill_slinger', 7, 0, 20),
  ],
  enemy: [
    E('t_e', 'hoplite', 8, 2),
    E('t_mino', 'minotaur', 5, 8, 4),
    E('t_one', 'hoplite', 5, 5),
    E('t_cav', 'cavalry', 10, 4, 6),
    E('t_w', 'hoplite', 3, 7),
  ],
  counts: { t_one: 1 },
  shots: [
    { shooter: 'ban', target: 't_e', label: 'celtic_banshee-right' },
    { shooter: 'bban', target: 't_mino', label: 'celtic_battle_banshee-left-2hex' },
    { shooter: 'eag', target: 't_one', label: 'mesoamerican_eagle_warrior_spirit-short-right-kill' },
    { shooter: 'seag', target: 't_e', label: 'mesoamerican_solar_eagle_warrior-left' },
    { shooter: 'xiu', target: 't_cav', label: 'mesoamerican_xiuhcoatl-diagonal-up-right-2hex' },
    { shooter: 'dxiu', target: 't_w', label: 'mesoamerican_divine_xiuhcoatl-diagonal-up-left' },
    { shooter: 'sli', target: 't_mino', label: 'hill_slinger-down-left-2hex' },
  ],
};

/**
 * The sling master at 1920 × 1080, then the moments around a shot: a peltast engaged by a hoplite
 * strikes it in melee (no missile), a veteran peltast's shot is skipped in the air, a seer's shot
 * after it plays normally.
 */
export const MOMENTS: FxBattleSpec = {
  name: 'v2fx-moments',
  archetype: 'plateau',
  player: [P('slm', 'sling_master', 1, 5, 20), P('pel', 'peltast', 7, 8), P('vpel', 'veteran_peltast', 2, 1), P('seer', 'temple_seer', 1, 9)],
  enemy: [E('t_one', 'hoplite', 11, 5), E('t_adj', 'hoplite', 8, 8), E('t_mino', 'minotaur', 12, 1, 4), E('t_far', 'hoplite', 13, 10)],
  counts: { t_one: 1 },
  // The engaged peltast's melee is played in the browser (it cannot shoot); the rehearsal covers the shots.
  shots: [
    { shooter: 'slm', target: 't_one', label: 'sling_master-long-right-kill' },
  ],
};

/** Three shooters for the speed change, leaving mid-flight and playing the same save again. */
export const REPLAY: FxBattleSpec = {
  name: 'v2fx-replay',
  archetype: 'ridge_pass',
  player: [P('pel', 'peltast', 1, 2), P('cyc', 'cyclops', 2, 8, 3), P('seer', 'temple_seer', 1, 5)],
  enemy: [E('t_a', 'hoplite', 12, 2), E('t_b', 'minotaur', 12, 8, 4), E('t_c', 'hoplite', 13, 5)],
  shots: [
    { shooter: 'pel', target: 't_a', label: 'speed2' },
    { shooter: 'cyc', target: 't_b', label: 'speed05' },
    { shooter: 'seer', target: 't_c', label: 'leave' },
  ],
};

// ------------------------------------------------------------------ the siege

export interface FxSiege {
  readonly file: string;
  /** Battle stack IDs: the Cyclops, the Divine Colossus (wall breakers), the peltasts; the town's hoplites. */
  readonly cyclops: string;
  readonly colossus: string;
  readonly peltast: string;
  readonly guard: string;
  readonly walls: readonly string[];
  readonly turrets: readonly string[];
}

/**
 * Alexios with a Cyclops, a Divine Colossus and peltasts before the rival's Eastharbor (walls,
 * gate, towers and keep): the two wall breakers batter walls with their own missiles, the
 * peltasts shoot over the wall, the town's hoplites answer; then round 2 opens with the
 * Catapult's stone and the towers' arrows.
 */
export function fxSiege(): FxSiege {
  const d = skirmishDriver();
  const east = d.state.towns['eastharbor']!;
  east.buildings['fortifications'] = 3;
  east.garrison.slots = slots([['hoplite', 6]]);
  d.state.heroes['rival_odysseus']!.status = 'retreated';
  const alexios = d.state.heroes['alexios']!;
  alexios.army.slots = slots([['cyclops', 3], ['egyptian_divine_colossus', 2], ['peltast', 10]]);
  const home = alexios.position;
  let approach = null as null | typeof home;
  for (const n of axialNeighbors(east.coord)) {
    alexios.position = n;
    const q = quoteMovement(d.catalog, d.state, alexios.id, east.coord);
    if (q.reachable && q.path.length === 1) {
      approach = n;
      break;
    }
  }
  must(!!approach, 'a tile before the gate');
  alexios.position = approach!;
  alexios.movementPoints = 2000;
  d.do({ kind: 'MoveHero', heroId: alexios.id, destination: east.coord, confirmEncounter: true });
  const b = d.state.battle!;
  must(!!b?.siege, 'a siege');
  must(b.phase === 'normal', `the siege starts in its normal phase (not ${b.phase})`);
  const find = (side: string, creatureId: string) => Object.values(b.stacks).find((s) => s.side === side && s.creatureId === creatureId)!.id;
  const cyclops = find('attacker', 'cyclops');
  const colossus = find('attacker', 'egyptian_divine_colossus');
  const peltast = find('attacker', 'peltast');
  const guard = find('defender', 'hoplite');
  b.activeStackId = cyclops;
  b.activeIsBonus = false;
  b.normalQueue = [colossus, peltast, guard];
  b.waitQueue = [];
  b.obstacles = [];
  for (const s of Object.values(b.stacks)) {
    s.moraleRolledThisRound = true;
    s.waited = false;
    s.defending = false;
  }
  for (const side of Object.values(b.sides)) {
    if (side.commander) side.commander = { ...side.commander, morale: 0, luck: 0 };
    side.factionMorale = 0;
  }
  const walls = b.siege!.structures.filter((s) => s.kind === 'wall' && s.hp > 0).map((s) => s.id);
  const turrets = b.siege!.structures.filter((s) => (s.kind === 'tower' || s.kind === 'keep') && s.hp > 0).map((s) => s.id);
  return { file: writeSave(d, 'v2fx-siege'), cyclops, colossus, peltast, guard, walls, turrets };
}

// ------------------------------------------------------------------ the human defends (mirrored board)

/**
 * The rival marches on Westharbor, where Alexios stands with peltasts, a Cyclops and temple seers:
 * the human defends against the computer, so the battle view draws the board mirrored (the
 * defender on the left). The defenders shoot first (west on the board, east on screen); after the
 * attackers' turn, round 2 opens with the town's towers and keep shooting.
 */
export function fxDefence(): FxBattle {
  const d = skirmishDriver();
  const alexios = d.state.heroes['alexios']!;
  const rival = d.state.heroes['rival_odysseus']!;
  alexios.army.slots = slots([['peltast', 12], ['cyclops', 3], ['temple_seer', 8]]);
  d.state.towns['westharbor']!.garrison.slots = slots([]);
  // Walls, gate, two towers and the keep (the towers and keep shoot at the start of each round).
  d.state.towns['westharbor']!.buildings['fortifications'] = 3;
  rival.army.slots = slots([['hoplite', 20], ['minotaur', 4], ['hoplite', 15]]);
  rival.position = approachTile(d, alexios.position, rival.id);
  rival.movementPoints = 3000;
  d.state.activePlayerId = 'rival';
  d.do({ kind: 'MoveHero', heroId: rival.id, destination: alexios.position, confirmEncounter: true }, 'rival');
  const b = d.state.battle!;
  must(!!b && b.sides.defender.controller === 'human' && b.sides.attacker.controller === 'ai', 'the human defends against the computer');
  must(b.phase === 'normal', `the defence starts in its normal phase (not ${b.phase})`);
  must((b.siege?.structures ?? []).some((x) => x.kind === 'tower' && x.hp > 0), 'the town has towers');
  const find = (side: string, creatureId: string, n = 0) => Object.values(b.stacks).filter((s) => s.side === side && s.creatureId === creatureId)[n]!.id;
  const ids: Record<string, string> = {
    pel: find('defender', 'peltast'),
    cyc: find('defender', 'cyclops'),
    seer: find('defender', 'temple_seer'),
    a_hop: find('attacker', 'hoplite', 0),
    a_mino: find('attacker', 'minotaur'),
    a_hop2: find('attacker', 'hoplite', 1),
  };
  b.activeStackId = ids['pel']!;
  b.activeIsBonus = false;
  b.normalQueue = [ids['seer']!, ids['cyc']!, ids['a_hop']!, ids['a_mino']!, ids['a_hop2']!];
  b.waitQueue = [];
  b.obstacles = [];
  for (const st of Object.values(b.stacks)) {
    st.moraleRolledThisRound = true;
    st.waited = false;
    st.defending = false;
  }
  for (const side of Object.values(b.sides)) {
    if (side.commander) side.commander = { ...side.commander, morale: 0, luck: 0 };
    side.factionMorale = 0;
  }
  const shots: PlannedShot[] = [
    { shooter: 'pel', target: 'a_hop', label: 'mirrored-peltast' },
    { shooter: 'seer', target: 'a_mino', label: 'mirrored-temple_seer-2hex' },
    { shooter: 'cyc', target: 'a_hop2', label: 'mirrored-cyclops' },
  ];
  return { file: writeSave(d, 'v2fx-defence'), ids, shots: rehearse('v2fx-defence', d.catalog, d.state, ids, shots) };
}
