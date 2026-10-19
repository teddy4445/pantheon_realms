/**
 * Sea-encounter fixtures (sea-creature delivery 2026-10-17, `seaEncountersV1`) on the two-isle test map
 * (`packages/testing/src/naval.ts`): the player's hero aboard its own ship beside a sea-monster stack on
 * open water. Every change after the map is compiled is an ordinary fixture edit of the saved match or a
 * command through the rules' processor; the file is a normal save envelope brought in through Load →
 * Import — no privileged hooks.
 *
 * `renewFixture` is a battle in progress, saved mid-battle (as the boarding defence fixture is): the
 * neutral side is given Morale +3 (a fixture edit of its battle side) and the battle is played by the
 * tactical AI on both sides — every step through the processor — until a Triton has shot and won a
 * morale bonus activation in the same round. Saved right then, the Triton's second shot of the round is
 * the next thing the game plays (the tactical AI's own choice there is a shot).
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createEnvelope, serializeEnvelope } from '@pr/session';
import { battleActor, chooseBattleAction } from '@pr/ai';
import { NEUTRAL_PLAYER_ID, resources, shipInvariantIssues, type GameEvent, type MatchState } from '@pr/rules';
import { GameDriver, catalog, cellOf, navalDriver, slots } from '@pr/testing';

export const ME = 'player';
export const HERO = 'leader_1';
export const FOE_HERO = 'leader_2';
type Army = [string, number][];

/** The player's army: strong enough to win, with flyers and shooters for both zones. */
export const CREW: Army = [
  ['veteran_hoplite', 80],
  ['peltast', 60],
  ['griffin', 24],
  ['temple_adept', 30],
  ['cavalry', 20],
  ['labyrinth_warden', 8],
  ['stormforged_cyclops', 6],
];
/** The sea monster: Tritons (shooters with renewable shots), an Isonade and Hippocampi (flyers). */
export const MONSTER: Army = [
  ['triton', 6],
  ['isonade', 2],
  ['hippocampus', 6],
];

function hold(s: MatchState, heroId: string): void {
  const h = s.heroes[heroId];
  if (!h) return;
  h.ai = { profile: 'patrol', waypoints: [{ ...h.position }], waypointIndex: 0, regionMinQ: h.position.q - 1, regionMaxQ: h.position.q + 1, attackThreshold: { numerator: 1000, denominator: 1 } } as typeof h.ai;
}

function save(d: { state: MatchState }, name: string): string {
  const issues = shipInvariantIssues(catalog, d.state);
  if (issues.length) throw new Error(`fixture ${name}: ${issues.join('; ')}`);
  const env = createEnvelope(catalog, { match: d.state, campaign: null }, { id: 'manual-1', kind: 'manual', name, savedAt: new Date(0).toISOString() });
  const file = join(tmpdir(), `sea-${name.replace(/\W+/g, '-')}.prsave.json`);
  writeFileSync(file, serializeEnvelope(env));
  return file;
}

/** Leader 1 aboard its ship (rect 11,10) beside a sea monster (rect 12,10) on open water. */
export function seaFixture(name = 'sea', monster: Army = MONSTER, crew: Army = CREW, seed?: number): { file: string; driver: GameDriver; monster: { q: number; r: number } } {
  const d = navalDriver({
    ships: (doc) => [{ id: 'free', ...cellOf(doc, 10, 8) }, { id: 'a', ...cellOf(doc, 11, 10), owner: 0 }],
    sites: (doc) => [{ id: 'deep', kind: 'sea_monster', name: 'Troubled Waters', ...cellOf(doc, 12, 10), guard: { creatureId: monster[0]![0], count: monster[0]![1], more: monster.slice(1).map(([creatureId, count]) => ({ creatureId, count })) } }],
  });
  const s = d.state;
  s.matchId = `e2e-sea-${name}`;
  const f = s.scenario.features!;
  s.scenario = { ...s.scenario, features: { ...f, weeklyEvents: false, aiTemperaments: false } };
  s.players[ME]!.wallet = resources({ gold: 6000, wood: 40, stone: 20, crystal: 5 });
  const ship = s.world.ships!['map_ship_a']!;
  const hero = s.heroes[HERO]!;
  ship.heroId = HERO;
  ship.state = 'occupied';
  ship.facing = 0;
  hero.position = { ...ship.coord };
  hero.army.slots = slots(crew);
  hero.movementPoints = 1000;
  // Every hex of the test map explored (the sea monster in view).
  for (const fog of Object.values(s.fog)) fog.explored = fog.explored.map(() => 1);
  if (seed !== undefined) s.rng.combat = seed;
  hold(s, FOE_HERO);
  return { file: save(d, name), driver: d, monster: cellOf(s.world.map, 12, 10) };
}

const shotBy = (events: readonly GameEvent[], stackId: string) => events.some((e) => e.kind === 'BattleAttack' && e.mode === 'shot' && e.attackerId === stackId);
const bonusFor = (events: readonly GameEvent[], stackId: string) => events.some((e) => e.kind === 'BattleMorale' && e.positive && e.stackId === stackId);

/**
 * A sea battle in progress: a Triton has just shot (2 → 1 this round) and won a morale bonus activation;
 * the save is taken there, so its second shot of the round comes next. Seeds are tried in order until
 * the tactical AI's own play gives that moment (the first one found is used; deterministic).
 */
export function renewFixture(name = 'renew'): { file: string; driver: GameDriver; tritonId: string; round: number } {
  for (let seed = 1; seed < 400; seed++) {
    const f = seaFixture(`${name}-try`, [['triton', 8], ['hippocampus', 4]], [['veteran_hoplite', 40], ['peltast', 30], ['griffin', 12]], seed * 7919);
    const d = f.driver;
    d.do({ kind: 'MoveHero', heroId: HERO, destination: f.monster, confirmEncounter: true });
    const b0 = d.state.battle;
    if (!b0) throw new Error('no sea battle');
    // Fixture edit: the sea monster's side fights with Morale +3.
    b0.sides.defender.factionMorale = 3;
    for (let step = 0; step < 400 && d.state.battle; step++) {
      const s = d.state;
      const payload = chooseBattleAction(catalog, s);
      if (!payload) break;
      const actor = battleActor(s) ?? ME;
      const events = d.do(payload, actor === NEUTRAL_PLAYER_ID ? NEUTRAL_PLAYER_ID : actor);
      const b = d.state.battle;
      if (!b || b.round > 3) break;
      const active = b.activeStackId ? b.stacks[b.activeStackId] : undefined;
      if (active && active.creatureId === 'triton' && b.activeIsBonus && active.shotsRemaining === 1 && shotBy(events, active.id) && bonusFor(events, active.id) && Object.values(b.stacks).some((x) => x.side !== active.side && x.totalHp > 0) && chooseBattleAction(catalog, d.state)?.kind === 'BattleShoot') {
        return { file: save(d, name), driver: d, tritonId: active.id, round: b.round };
      }
    }
  }
  throw new Error('no seed gave a Triton a morale bonus after its first shot');
}
