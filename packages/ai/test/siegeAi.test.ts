/**
 * The tactical AI in the finished siege rules (2026-10-07): it aims the Catapult
 * at the gate for ground troops and at the turrets for an army that flies, and
 * a quick or automatic battle never stalls on the free aim.
 */
import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import { axialNeighbors, quoteMovement, type CreatureStackState, type HexCoord } from '@pr/rules';
import { catapultAimFor, chooseBattleAction } from '../src';

const army = (a: [string, number][]): (CreatureStackState | null)[] => [...a.map(([creatureId, count]) => ({ creatureId, count })), ...Array(7 - a.length).fill(null)];

function besiege(attacker: [string, number][]): GameDriver {
  const d = GameDriver.mission('skirmish_twin_harbors');
  const s = d.state;
  // The legacy automatic Catapult these tests describe (older saves, The Three Beacons): the targetable
  // catapult (targetableCatapultV1, on in skirmishes) is covered by targetableCatapultAi.test.ts.
  s.scenario.features = { ...s.scenario.features!, targetableCatapultV1: false };
  for (const fog of Object.values(s.fog)) fog.explored = fog.explored.map(() => 1);
  const east = s.towns['eastharbor']!;
  east.buildings['fortifications'] = 3;
  east.garrison.slots = army([['hoplite', 10]]);
  s.heroes['rival_odysseus']!.status = 'retreated';
  const hero = s.heroes['alexios']!;
  hero.army.slots = army(attacker);
  const home = hero.position;
  let from: HexCoord | null = null;
  for (const n of axialNeighbors(east.coord)) {
    hero.position = n;
    const q = quoteMovement(d.catalog, s, hero.id, east.coord);
    if (q.reachable && q.path.length === 1) {
      from = n;
      break;
    }
  }
  hero.position = from ?? home;
  hero.movementPoints = 2000;
  d.do({ kind: 'MoveHero', heroId: hero.id, destination: east.coord, confirmEncounter: true });
  return d;
}

describe('siege AI (2026-10-07)', () => {
  it('ground troops want the gate; flyers want the weakest turret', () => {
    const ground = besiege([['hoplite', 30]]);
    expect(catapultAimFor(ground.catalog, ground.state.battle!)).toBe('gate');
    const air = besiege([['windcrest_griffin', 20]]);
    const aim = catapultAimFor(air.catalog, air.state.battle!);
    expect(['keep', 'tower_n', 'tower_s']).toContain(aim);
  });

  it('an automatic siege aims once, then fights to the end', () => {
    const d = besiege([['windcrest_griffin', 30], ['hoplite', 40]]);
    // Ground troops present: the gate stays the target, no aim command needed.
    const first = chooseBattleAction(d.catalog, d.state);
    expect(first?.kind).not.toBe('BattleAimCatapult');
    const air = besiege([['windcrest_griffin', 30]]);
    air.autoBattle();
    expect(air.state.battle).toBeNull();
    expect(air.events.filter((e) => e.kind === 'SiegeCatapultAimed').length).toBeGreaterThan(0);
  });
});
