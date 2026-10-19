/**
 * Scouting-intel fixtures (expedition kit §05, `scoutingIntelV1`): Twin Harbors with the
 * player's hero on open plains (row 7) and the rival's hero at a chosen distance, its army
 * made of counts that appear nowhere else on screen (so a test can prove none of them reaches
 * the DOM). Snapshots are written by the rules' own processor (MoveHero, EndTurn). Saved as an
 * ordinary save envelope and brought in through Load → Import — no privileged hooks.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { GameDriver } from '@pr/testing';
import { createEnvelope, serializeEnvelope } from '@pr/session';
import type { CreatureStackState, HexCoord, ScenarioFeatures } from '@pr/rules';

export const ROW = 7;
export const at = (q: number): HexCoord => ({ q, r: ROW });
export const ME = 'alexios';
export const FOE = 'rival_odysseus';
/** The rival's real army: counts no panel, date, range or band ever shows by itself. */
export const HIDDEN_ARMY: [string, number][] = [
  ['hoplite', 23],
  ['peltast', 11],
  ['hoplite', 13],
  ['veteran_hoplite', 6],
];
/** Numbers that must never appear in the page: each stack, each creature's total, and the grown army of the last-known fixture. */
export const HIDDEN_NUMBERS = [23, 11, 13, 6, 36, 311];

export interface IntelSetup {
  /** My hero's column (row 7). */
  me: number;
  /** The rival hero's column (row 7). */
  foe: number;
  scouting?: number;
  /** An old save: no scouting-intel flag (today's full information). */
  legacy?: boolean;
  /** Walk my hero through these columns (real MoveHero commands: the snapshots follow). */
  walk?: number[];
  /** After the walk, while out of sight: the rival moves here and its army grows (never seen). */
  hiddenMove?: number;
  /** Then this many whole days pass (EndTurn for both seats). */
  days?: number;
}

export interface IntelFixture {
  file: string;
  driver: GameDriver;
}

export function intelFixture(name: string, s: IntelSetup): IntelFixture {
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId: `e2e-intel-${name.replace(/\W+/g, '-')}` });
  const f: Partial<ScenarioFeatures> = { weeklyEvents: false };
  d.state.scenario = { ...d.state.scenario, features: { ...d.state.scenario.features!, ...f } };
  if (s.legacy) delete (d.state.scenario.features as Record<string, unknown>).scoutingIntelV1;
  for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
  const me = d.state.heroes[ME]!;
  me.position = at(s.me);
  me.movementPoints = 5000;
  me.skills = s.scouting ? [{ skillId: 'scouting', rank: s.scouting }] : [];
  const foe = d.state.heroes[FOE]!;
  foe.position = at(s.foe);
  const slots: (CreatureStackState | null)[] = [null, null, null, null, null, null, null];
  HIDDEN_ARMY.forEach(([creatureId, count], i) => (slots[i] = { stackId: `fx${i}`, creatureId, count }));
  foe.army = { slots };
  for (const q of s.walk ?? []) {
    d.state.heroes[ME]!.movementPoints = 5000;
    d.do({ kind: 'MoveHero', heroId: ME, destination: at(q) });
  }
  if (s.hiddenMove !== undefined) {
    const f2 = d.state.heroes[FOE]!;
    f2.position = at(s.hiddenMove);
    f2.army.slots[0]!.count = 311;
  }
  for (let i = 0; i < (s.days ?? 0); i++) {
    d.do({ kind: 'EndTurn' });
    d.do({ kind: 'EndTurn' }, 'rival');
  }
  d.state.heroes[ME]!.movementPoints = 5000;
  const env = createEnvelope(d.catalog, { match: d.state, campaign: null }, { id: 'manual-1', kind: 'manual', name, savedAt: new Date(0).toISOString() });
  const file = join(tmpdir(), `intel-${name.replace(/\W+/g, '-')}.prsave.json`);
  writeFileSync(file, serializeEnvelope(env));
  return { file, driver: d };
}
