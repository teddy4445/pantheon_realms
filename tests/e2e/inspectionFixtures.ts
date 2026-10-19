/**
 * Fixtures for the battle creature inspection tests (expedition kit 2026-10-17; battleInspection.spec.ts).
 * A fixture is an ordinary save: the player's leader attacks the gold mine's guards in the skirmish
 * Twin Harbors, built headlessly with the same rules and processor as the game (v2battleFixtures.ts),
 * then given the states the card has to show — a wounded shooter with shots spent, a Warcry its hero
 * cast (a modified Attack, a hero source), a Distract a stack used (an activation-based expiry, a stack
 * source) and a curse whose source no one recorded (unknown) — and written again as a save that the
 * test brings in through Load → Import. Nothing here is a hook into the running game.
 */
import { writeSave } from './fixtures';
import { neutralBattle, type Placement } from './v2battleFixtures';

export const PLAYER: Placement[] = [
  { key: 'hop', side: 'attacker', creatureId: 'hoplite', count: 30, at: [3, 6] },
  { key: 'pel', side: 'attacker', creatureId: 'peltast', count: 18, at: [2, 3] },
  { key: 'gri', side: 'attacker', creatureId: 'griffin', count: 6, at: [3, 9] },
  { key: 'rr', side: 'attacker', creatureId: 'root_runner', count: 12, at: [5, 1] },
];
export const ENEMY: Placement[] = [
  { key: 'e_sli', side: 'defender', creatureId: 'hill_slinger', count: 20, at: [13, 3] },
  { key: 'e_ser', side: 'defender', creatureId: 'serpopard', count: 8, at: [11, 7] },
];
export const ORDER = ['hop', 'pel', 'gri', 'rr', 'e_sli', 'e_ser'];

export interface InspectionBattle {
  readonly file: string;
  readonly ids: Record<string, string>;
  readonly heroName: string;
  /** The wounded Peltasts: creatures alive, front creature's HP, one creature's HP, shots left / max. */
  readonly peltasts: { count: number; front: number; hp: number; shots: number; maxShots: number; totalHp: number };
  /** The Hoplites' Attack: base and with the Warcry (+3). */
  readonly hoplites: { baseAttack: number };
}

export function inspectionBattle(name: string, opts: { climate?: string } = {}): InspectionBattle {
  const fx = neutralBattle(name, { player: PLAYER, enemy: ENEMY, order: ORDER, climate: opts.climate ?? 'desert' });
  const d = fx.d;
  const b = d.state.battle!;
  const id = fx.ids;
  const commander = b.sides.attacker.commander!;
  // The wounded shooter: 17 whole Peltasts and a front one with 3 HP; 7 shots spent.
  const pel = b.stacks[id['pel']!]!;
  const pStats = d.catalog.creatures['peltast']!.stats!;
  pel.totalHp = pStats.hp * 17 + 3;
  pel.shotsRemaining = pStats.shots - 7;
  // The hero's Warcry on the Hoplites (two more rounds): a modified Attack with a recorded hero source.
  b.stacks[id['hop']!]!.statuses = [
    { sourceId: 'spell:warcry', label: d.catalog.spells['warcry']!.name, kind: 'attack_bonus', amount: 3, numerator: 1, denominator: 1, expiresAtRound: b.round + 2, hostile: false, seq: 1, sourceHeroId: commander.heroId!, sourceSide: 'attacker' },
  ];
  // The Root-Runners' Distract on the Serpopards: until the Root-Runners' next activation.
  b.stacks[id['e_ser']!]!.statuses = [
    { sourceId: 'ability:distract', label: d.catalog.abilities['neutral_distract']!.name, kind: 'retaliation_suppressed', amount: 1, numerator: 1, denominator: 1, expiresAtRound: Number.MAX_SAFE_INTEGER, expiresOnActivationOf: id['rr']!, hostile: true, seq: 2, sourceStackId: id['rr']!, sourceSide: 'attacker' },
  ];
  // A curse on the Griffins whose caster was never recorded (an older save): the source is unknown.
  b.stacks[id['gri']!]!.statuses = [{ sourceId: 'spell:weakness', label: 'Weakness', kind: 'attack_bonus', amount: -2, numerator: 1, denominator: 1, expiresAtRound: b.round + 1, hostile: true, seq: 3 }];
  b.statusSeq = 3;
  return {
    file: writeSave(d, name),
    ids: id,
    heroName: commander.name,
    peltasts: { count: 18, front: 3, hp: pStats.hp, shots: pStats.shots - 7, maxShots: pStats.shots, totalHp: pStats.hp * 17 + 3 },
    hoplites: { baseAttack: d.catalog.creatures['hoplite']!.stats!.attack },
  };
}
