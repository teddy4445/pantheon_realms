/**
 * Recruitment-caravan fixtures (expedition kit §06, `recruitmentCaravansV1`): Twin Harbors
 * with both harbors the player's — Westharbor (the source: barracks, peltast range and griffin
 * tower built, stock waiting) and Eastharbor (the destination, 26 hexes east over open land,
 * a small garrison of its own). The rival keeps one hero, held to its corner as a patrol of
 * one waypoint so the computer's turn never wanders onto the road. Shipments are dispatched
 * and moved by the rules' own processor (DispatchCaravan, EndTurn); the file is an ordinary
 * save envelope brought in through Load → Import — no privileged hooks.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { GameDriver } from '@pr/testing';
import { createEnvelope, serializeEnvelope } from '@pr/session';
import { quoteCaravan, resources, type CreatureStackState, type ScenarioFeatures } from '@pr/rules';

export const ME = 'player';
export const FOE = 'rival';
export const FOE_HERO = 'rival_odysseus';
export const SOURCE = 'westharbor';
export const DEST = 'eastharbor';
export const START_GOLD = 30_000;

const slots = (army: [string, number][]): (CreatureStackState | null)[] => {
  const out: (CreatureStackState | null)[] = [null, null, null, null, null, null, null];
  army.forEach(([creatureId, count], i) => (out[i] = { stackId: `fx${i}`, creatureId, count }));
  return out;
};

export interface CaravanSetup {
  /** Dispatch this cargo in the fixture (by the rules), then let `days` whole days pass. */
  cargo?: { creatureId: string; count: number }[];
  days?: number;
  /** Instead of `days`: stop on the day before the quoted arrival. */
  arriveNext?: boolean;
  /** After the days: the destination falls to the rival (unseen until the caravan's next turn start). */
  loseDestination?: boolean;
  /** An old save: no caravan flag. */
  legacy?: boolean;
}

export interface CaravanFixture {
  file: string;
  driver: GameDriver;
  /** The quoted arrival day of the fixture's shipment (null: none dispatched). */
  etaDay: number | null;
}

export function caravanFixture(name: string, s: CaravanSetup = {}): CaravanFixture {
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId: `e2e-caravan-${name.replace(/\W+/g, '-')}` });
  const f: Partial<ScenarioFeatures> = { weeklyEvents: false, aiTemperaments: false };
  d.state.scenario = { ...d.state.scenario, features: { ...d.state.scenario.features!, ...f } };
  if (s.legacy) delete (d.state.scenario.features as Record<string, unknown>).recruitmentCaravansV1;
  for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
  d.player.wallet = resources({ gold: START_GOLD, wood: 40, stone: 40, crystal: 10 });
  const west = d.town(SOURCE);
  Object.assign(west.buildings, { dwelling_t1: 1, dwelling_t2: 1, dwelling_t3: 1 });
  west.population = { hoplite: 20, peltast: 12, griffin: 4 };
  const east = d.town(DEST);
  east.ownerId = ME;
  d.state.world.sites[east.siteId]!.owner = ME;
  east.garrison = { slots: slots([['hoplite', 20], ['peltast', 8]]) };
  // The rival's hero holds its corner (a patrol of one waypoint that never attacks).
  const foe = d.hero(FOE_HERO);
  foe.position = { q: 32, r: 2 };
  foe.army = { slots: slots([['peltast', 2]]) };
  foe.ai = { profile: 'patrol', waypoints: [{ q: 32, r: 2 }], waypointIndex: 0, regionMinQ: 31, regionMaxQ: 33, attackThreshold: { numerator: 1000, denominator: 1 } };
  // The player's hero waits at home, out of the road's way.
  d.hero('alexios').position = { q: 4, r: 10 };
  let etaDay: number | null = null;
  if (s.cargo) {
    etaDay = quoteCaravan(d.catalog, d.state, ME, SOURCE, DEST, s.cargo).etaDay;
    d.do({ kind: 'DispatchCaravan', sourceTownId: SOURCE, destinationTownId: DEST, items: s.cargo });
    // `arriveNext`: stop on the day before its arrival (the next End Day delivers it).
    const days = s.arriveNext && etaDay !== null ? etaDay - 2 : (s.days ?? 0);
    for (let i = 0; i < days; i++) {
      d.do({ kind: 'EndTurn' });
      d.do({ kind: 'EndTurn' }, FOE);
    }
  }
  if (s.loseDestination) {
    // Fresh records: every command copied the state.
    const lost = d.town(DEST);
    lost.ownerId = FOE;
    d.state.world.sites[lost.siteId]!.owner = FOE;
  }
  const env = createEnvelope(d.catalog, { match: d.state, campaign: null }, { id: 'manual-1', kind: 'manual', name, savedAt: new Date(0).toISOString() });
  const file = join(tmpdir(), `caravan-${name.replace(/\W+/g, '-')}.prsave.json`);
  writeFileSync(file, serializeEnvelope(env));
  return { file, driver: d, etaDay };
}
