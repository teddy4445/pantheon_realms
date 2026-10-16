/**
 * Fixtures for the neutral-creature battle tests (campaign expansion handoff,
 * 2026-10-15; v2battle.spec.ts). A fixture is an ordinary save: a skirmish in
 * which the player's leader, leading the six neutrals, attacks the gold mine's
 * guards (the guards are neutrals too), built headlessly with the same rules
 * and processor as the game, and brought in through Load → Import. The battle is
 * then laid out for the test — stacks on chosen cells, no obstacles, the
 * order of play fixed, morale and luck at zero — so each ability has its
 * target. Nothing here is a hook into the running game.
 */
import { expect } from '@playwright/test';
import { GameDriver } from '@pr/testing';
import type { BattleSideId, BattleStackState } from '@pr/rules';
import { approachTile, slots, writeSave } from './fixtures';

export interface Placement {
  /** Test name of the stack (also the order key). */
  readonly key: string;
  readonly side: BattleSideId;
  readonly creatureId: string;
  readonly count: number;
  readonly at: readonly [number, number];
}

/**
 * The player's six neutrals plus a line of Hoplites, and the guards' six neutrals plus slingers.
 * Laid out so that each ability has a target: the Pegasus beside the Hoplites (Sheltering Wings),
 * the Root-Runner two hexes from the enemy Serpopard (Distract), the Ahuitzotl two hexes from the
 * slingers in a clear line (Tail Snare), the Baku beside the Hoplites (who carry a curse: Devour
 * Dread) and the Afanc beside the Serpopard (Reed Guard).
 */
export const PLAYER: Placement[] = [
  { key: 'peg', side: 'attacker', creatureId: 'pegasus', count: 8, at: [3, 4] },
  { key: 'hop', side: 'attacker', creatureId: 'hoplite', count: 30, at: [3, 5] },
  { key: 'rr', side: 'attacker', creatureId: 'root_runner', count: 14, at: [6, 2] },
  { key: 'ahu', side: 'attacker', creatureId: 'ahuitzotl', count: 9, at: [5, 7] },
  { key: 'bk', side: 'attacker', creatureId: 'baku', count: 7, at: [2, 6] },
  { key: 'ser', side: 'attacker', creatureId: 'serpopard', count: 8, at: [3, 8] },
  { key: 'af', side: 'attacker', creatureId: 'afanc', count: 7, at: [3, 9] },
];
export const ENEMY: Placement[] = [
  { key: 'e_sli', side: 'defender', creatureId: 'hill_slinger', count: 25, at: [7, 7] },
  { key: 'e_ser', side: 'defender', creatureId: 'serpopard', count: 6, at: [8, 2] },
  { key: 'e_peg', side: 'defender', creatureId: 'pegasus', count: 6, at: [12, 4] },
  { key: 'e_rr', side: 'defender', creatureId: 'root_runner', count: 10, at: [12, 6] },
  { key: 'e_bk', side: 'defender', creatureId: 'baku', count: 5, at: [12, 8] },
  { key: 'e_af', side: 'defender', creatureId: 'afanc', count: 5, at: [12, 10] },
  { key: 'e_ahu', side: 'defender', creatureId: 'ahuitzotl', count: 6, at: [11, 1] },
];

/** The order of play laid out for the ability walk-through (the player's five ability users first). */
export const ORDER = ['peg', 'rr', 'ahu', 'bk', 'af', 'hop', 'ser', 'e_sli', 'e_ser', 'e_peg', 'e_rr', 'e_bk', 'e_af', 'e_ahu'];

export interface NeutralBattle {
  readonly d: GameDriver;
  readonly file: string;
  /** Test key → battle stack ID. */
  readonly ids: Record<string, string>;
}

/**
 * Build the battle save. `climate` picks the battlefield painting's climate (light `desert`, dark
 * `jungle`; presentation only), `curse` puts a hostile −3 Attack on the Hoplites (Devour Dread's target).
 */
export interface NeutralBattleOptions {
  /** Map climate (picks the battlefield painting's variant): `desert` is light, `jungle` dark. */
  readonly climate?: string;
  readonly archetype?: string;
  /** A hostile −3 Attack on the Hoplites (Devour Dread's target). */
  readonly curse?: boolean;
  /** Order of play (test keys); default `ORDER`. */
  readonly order?: readonly string[];
  /** Stacks (test keys) whose once-per-battle ability is already spent. */
  readonly used?: readonly string[];
  /** Other line-ups (default PLAYER and ENEMY). */
  readonly player?: readonly Placement[];
  readonly enemy?: readonly Placement[];
  /** Creatures left in these stacks once the battle has begun (the guards still fight at full strength). */
  readonly counts?: Readonly<Record<string, number>>;
}

/**
 * The visual check's line-ups: each of the player's neutrals faces its enemy twin across one hex
 * edge. `strike`: the guards are single creatures (each falls to one blow: hit, then death; the
 * player's side then celebrates). `brace`: both sides at strength (the guards strike first).
 */
export function faceOff(kind: 'strike' | 'brace'): { player: Placement[]; enemy: Placement[]; order: string[]; counts: Record<string, number> } {
  // Strong enough that one blow fells a single creature of the same kind (its lowest damage roll included).
  const rows: [string, string, number, number][] = [
    ['peg', 'pegasus', 1, 16],
    ['rr', 'root_runner', 3, 14],
    ['ser', 'serpopard', 5, 10],
    ['bk', 'baku', 7, 16],
    ['af', 'afanc', 9, 14],
    ['ahu', 'ahuitzotl', 10, 12],
  ];
  const player: Placement[] = rows.map(([k, c, row, n]) => ({ key: k, side: 'attacker', creatureId: c, count: n, at: [6, row] }));
  player.push({ key: 'hop', side: 'attacker', creatureId: 'hoplite', count: 30, at: [1, 5] });
  const enemy: Placement[] = rows.map(([k, c, row, n]) => ({ key: `e_${k}`, side: 'defender', creatureId: c, count: Math.max(4, n - 2), at: [7, row] }));
  const mine = rows.map(([k]) => k);
  const theirs = rows.map(([k]) => `e_${k}`);
  const counts: Record<string, number> = kind === 'strike' ? Object.fromEntries(theirs.map((k) => [k, 1])) : {};
  return { player, enemy, order: kind === 'strike' ? [...mine, 'hop', ...theirs] : [...theirs, ...mine, 'hop'], counts };
}

export function neutralBattle(name: string, opts: NeutralBattleOptions = {}): NeutralBattle {
  const PLAYER_ = opts.player ?? PLAYER;
  const ENEMY_ = opts.enemy ?? ENEMY;
  const missionId = 'skirmish_twin_harbors';
  const d = GameDriver.mission(missionId, { matchId: `e2e-${name}` });
  for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
  if (opts.climate) d.state.world.map = { ...d.state.world.map, biome: opts.climate } as typeof d.state.world.map;
  const gold = d.catalog.missions[missionId]!.sites.find((x) => x.id === 'sk_gold')!;
  d.state.world.sites[gold.id]!.guard = ENEMY_.map((p) => ({ creatureId: p.creatureId, count: p.count }));
  const hero = Object.values(d.state.heroes).find((h) => h.ownerId === 'player' && h.status === 'active')!;
  hero.army.slots = slots(PLAYER_.map((p) => [p.creatureId, p.count] as [string, number]));
  hero.position = approachTile(d, gold.coord, hero.id);
  hero.movementPoints = 3000;
  d.do({ kind: 'MoveHero', heroId: hero.id, destination: gold.coord, confirmEncounter: true });
  const b = d.state.battle;
  expect(b, 'the guards fight').toBeTruthy();
  const battle = b!;
  const ids: Record<string, string> = {};
  const all = [...PLAYER_, ...ENEMY_];
  for (const s of Object.values(battle.stacks)) {
    const p = all.find((x) => x.side === s.side && x.creatureId === s.creatureId && !ids[x.key]);
    if (!p) continue;
    ids[p.key] = s.id;
    const stack: BattleStackState = s;
    stack.anchor = { col: p.at[0], row: p.at[1] };
    stack.facing = p.side === 'attacker' ? 1 : -1;
    stack.moraleRolledThisRound = true;
    stack.statuses = [];
    stack.waited = false;
    stack.defending = false;
  }
  expect(Object.keys(ids).sort()).toEqual(all.map((p) => p.key).sort());
  if (opts.curse) {
    battle.stacks[ids['hop']!]!.statuses.push({ sourceId: 'spell:weakness', label: 'Weakness', kind: 'attack_bonus', amount: -3, numerator: 1, denominator: 1, expiresAtRound: battle.round + 3, hostile: true, seq: 1 });
    battle.statusSeq = 1;
  }
  for (const [k, n] of Object.entries(opts.counts ?? {})) {
    const st = battle.stacks[ids[k]!]!;
    st.startingCount = n;
    st.totalHp = d.catalog.creatures[st.creatureId]!.stats!.hp * n;
  }
  for (const k of opts.used ?? []) {
    const st = battle.stacks[ids[k]!]!;
    const ability = d.catalog.creatures[st.creatureId]!.abilityIds.find((a) => d.catalog.abilities[a]?.activation === 'active');
    if (ability) st.abilityUses = { ...(st.abilityUses ?? {}), [ability]: 1 };
  }
  if (opts.archetype) battle.archetype = opts.archetype as typeof battle.archetype;
  battle.obstacles = [];
  battle.phase = 'normal';
  battle.deployment = null;
  battle.selection = null;
  const order = (opts.order ?? ORDER).map((k) => ids[k]!);
  battle.activeStackId = order[0]!;
  battle.activeIsBonus = false;
  battle.normalQueue = order.slice(1);
  battle.waitQueue = [];
  for (const side of Object.values(battle.sides)) {
    if (side.commander) side.commander = { ...side.commander, morale: 0, luck: 0 };
    side.factionMorale = 0;
  }
  return { d, file: writeSave(d, name), ids };
}
