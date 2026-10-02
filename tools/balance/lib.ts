/**
 * Balance measurement library (development tool — never packaged in the game).
 *
 * Every function drives the real rules through the headless GameDriver and the
 * shipped tactical/strategic AI; nothing here changes a rule. Results are
 * AI-vs-AI measurements, not playtest verdicts.
 */
import { GameDriver } from '@pr/testing';
import { armyStrength, runAITurn } from '@pr/ai';
import { createGeneratedMatch, createMissionMatch, createRandomSkirmish } from '@pr/campaign';
import type { ContentCatalog, MatchState } from '@pr/rules';

export type Army = { creatureId: string; count: number }[];

/** Patron god per pantheon (the implemented patron in the catalog). */
export function patronOf(catalog: ContentCatalog, pantheonId: string): string {
  const p = catalog.pantheons[pantheonId]!;
  return p.godIds.find((g) => catalog.gods[g]?.role === 'patron' && catalog.gods[g]?.implementationStatus === 'implemented')!;
}

export function skirmishMission(player: string, rival: string): string {
  return player === 'greek' && rival === 'greek' ? 'skirmish_twin_harbors' : `skirmish_twin_harbors_${player}_vs_${rival}`;
}

// ---------------------------------------------------------------------------
// Army duels (a hero with zeroed attributes attacks the gold-mine guard)
// ---------------------------------------------------------------------------

/** Which pantheons field the two armies (their signatures and the battle map); omitted = troops only. */
export interface DuelSides {
  readonly a: string;
  readonly b: string;
}

/** Duels measure troops (and signatures): hero specialties are switched off like the rest of the commander. */
const troopsOnly = (s: MatchState) => {
  (s.scenario as { features?: Record<string, unknown> }).features = { ...(s.scenario.features ?? {}), heroSpecialties: false };
};

const zeroed = (h: MatchState['heroes'][string], army: Army) => {
  h.army.slots = [...army.map((x) => ({ stackId: `${h.id}-${x.creatureId}`, ...x })), ...Array<null>(Math.max(0, 7 - army.length)).fill(null)];
  h.attributes = { attack: 0, defense: 0, power: 0, knowledge: 0 };
  h.skills = [];
  h.spellbook = false;
  h.knownSpellIds = [];
  h.equipment = {};
};

/**
 * One auto-battle between army `a` (attacker) and army `b`, both led by
 * commanders with zeroed attributes and skills so only the troops count.
 *
 * Without `sides`: `a` attacks the neutral gold-mine guard `b` (troops only,
 * no pantheon signature on either side). With `sides`: a hero battle in the
 * `sides.a` vs `sides.b` skirmish, so each side carries its own pantheon
 * signature (Harmony, Fury, free Shapeshift, creature blessings). Signatures
 * that act after a battle (Afterlife, Glory) do not change a single duel.
 */
export function duel(a: Army, b: Army, seed: number, sides?: DuelSides): 'A' | 'B' {
  if (!sides) {
    const d = GameDriver.mission('skirmish_twin_harbors', { matchId: `duel-${seed}` });
    const s: MatchState = structuredClone(d.state);
    troopsOnly(s);
    const h = s.heroes['alexios']!;
    zeroed(h, a);
    const gold = d.catalog.missions['skirmish_twin_harbors']!.sites.find((x) => x.id === 'sk_gold')!.coord;
    h.position = { q: gold.q - 1, r: gold.r };
    h.movementPoints = 5000;
    s.world.sites['sk_gold']!.guard = b.map((x) => ({ ...x }));
    for (const f of Object.values(s.fog)) f.explored = f.explored.map(() => 1);
    d.state = s;
    d.do({ kind: 'MoveHero', heroId: 'alexios', destination: gold, confirmEncounter: true });
    if (!d.state.battle) throw new Error('duel: no battle started');
    d.autoBattle(5000);
    const hero = d.state.heroes['alexios'];
    const alive = !!hero && hero.status === 'active' && hero.army.slots.some((x) => x && x.count > 0);
    const guard = d.state.world.sites['sk_gold']!.guard;
    const cleared = !guard || guard.every((x) => x.count <= 0);
    return alive && cleared ? 'A' : 'B';
  }
  const missionId = skirmishMission(sides.a, sides.b);
  const d = GameDriver.mission(missionId, { matchId: `duel-${sides.a}-${sides.b}-${seed}` });
  const s: MatchState = structuredClone(d.state);
  troopsOnly(s);
  const m = d.catalog.missions[missionId]!;
  const ha = s.heroes[m.player.hero.heroId]!;
  const hb = s.heroes[m.rivals![0]!.hero.heroId]!;
  zeroed(ha, a);
  zeroed(hb, b);
  for (const f of Object.values(s.fog)) f.explored = f.explored.map(() => 1);
  // Meet in the open field west of the gold mine.
  const gold = m.sites.find((x) => x.id === 'sk_gold')!.coord;
  hb.position = { q: gold.q - 4, r: gold.r };
  ha.position = { q: gold.q - 5, r: gold.r };
  ha.movementPoints = 5000;
  d.state = s;
  d.do({ kind: 'MoveHero', heroId: ha.id, destination: hb.position, confirmEncounter: true });
  if (!d.state.battle) throw new Error('duel: no battle started');
  d.autoBattle(5000);
  const A = d.state.heroes[ha.id]!;
  const B = d.state.heroes[hb.id]!;
  return A.status === 'active' && B.status !== 'active' ? 'A' : 'B';
}

/** Share of `n` seeded duels won by `a` attacking `b`. */
export function attackRate(a: Army, b: Army, n: number, offset = 0, sides?: DuelSides): number {
  let w = 0;
  for (let i = 0; i < n; i++) if (duel(a, b, i + offset, sides) === 'A') w++;
  return w / n;
}

/**
 * Side-neutral score of `a` against `b`: the mean of `a` attacking and `a`
 * defending, which cancels the attacker's round-1 tie priority.
 */
export function symmetricScore(a: Army, b: Army, n: number, sides?: DuelSides): number {
  const back = sides ? { a: sides.b, b: sides.a } : undefined;
  return (attackRate(a, b, n, 7, sides) + 1 - attackRate(b, a, n, 300, back)) / 2;
}

/** One stack per tier, counts = weekly growth × weeks. */
export function rosterArmy(catalog: ContentCatalog, pantheonId: string, form: 'base' | 'upgraded', weeks: number): Army {
  return catalog.pantheons[pantheonId]!.roster.map((r) => {
    const f = catalog.families[r.familyId]!;
    return { creatureId: form === 'base' ? f.baseCreatureId : f.upgradedCreatureId, count: f.baseGrowth * weeks };
  });
}

/** The starting escort of a pantheon's Twin Harbors leader. */
export function startingArmy(catalog: ContentCatalog, pantheonId: string): Army {
  const m = catalog.missions[skirmishMission(pantheonId, pantheonId)]!;
  return m.player.hero.army.map((s) => ({ creatureId: s.creatureId, count: s.count }));
}

// ---------------------------------------------------------------------------
// Whole skirmishes, both sides played by the strategic AI
// ---------------------------------------------------------------------------

export interface SkirmishOptions {
  /** Pantheon in the west town / east town. */
  readonly west: string;
  readonly east: string;
  readonly seed: number;
  /**
   * Terrain variation: when set, the map is generated in 'variation' mode from
   * this seed (Twin Harbors stays point-symmetric); otherwise the golden map.
   */
  readonly mapSeed?: number;
  /** Which town's owner takes the first turn of every day. Default: west. */
  readonly firstMover?: 'west' | 'east';
  readonly maxDay?: number;
}

export interface SkirmishResult {
  readonly west: string;
  readonly east: string;
  readonly seed: number;
  /** Decisive result (elimination) or 'none' when the day cap was reached. */
  readonly winner: 'west' | 'east' | 'none';
  /**
   * Undecided matches are scored on points: the side with at least 25% more
   * total army strength (heroes + garrisons) at the cap; otherwise a draw.
   */
  readonly pointsWinner: 'west' | 'east' | 'draw' | null;
  readonly day: number;
  readonly firstMover: 'west' | 'east';
  /** Towns captured during the match (either side). */
  readonly captures: number;
  readonly battles: number;
  readonly strength: { readonly west: number; readonly east: number };
}

/**
 * Plays one Twin Harbors match with both players AI-controlled. The mission's
 * "player" always holds the west town; `firstMover: 'east'` reorders the day so
 * the east player acts first (this is how side and turn order are separated).
 */
export function playSkirmish(catalog: ContentCatalog, o: SkirmishOptions): SkirmishResult {
  const { match } = createMissionMatch(catalog, skirmishMission(o.west, o.east), {
    matchId: `ava-${o.seed}`,
    startingGodId: patronOf(catalog, o.west),
    ...(o.mapSeed !== undefined ? { seed: o.mapSeed, mode: 'variation' as const } : {}),
  });
  const d = new GameDriver(match, catalog);
  const s: MatchState = structuredClone(d.state);
  for (const p of Object.values(s.players)) if (p.controller === 'human') p.controller = 'ai';
  const eastId = s.towns['eastharbor']!.ownerId!;
  const firstMover = o.firstMover ?? 'west';
  if (firstMover === 'east') {
    s.playerOrder = [eastId, ...s.playerOrder.filter((p) => p !== eastId)];
    s.activePlayerId = eastId;
  }
  d.state = s;
  const maxDay = o.maxDay ?? 40;
  let captures = 0;
  let battles = 0;
  const onEvents = (events: readonly { kind: string; label?: string }[]) => {
    for (const e of events) {
      if (e.kind === 'BattleStarted') battles++;
      if (e.kind === 'TownCaptured') captures++;
    }
  };
  for (let i = 0; i < 2000 && d.state.outcome.status === 'running' && d.state.day <= maxDay; i++) {
    d.state = runAITurn(catalog, d.state, { onEvents });
    if (d.state.battle) d.autoBattle(8000);
  }
  const out = d.state.outcome;
  const westId = s.playerOrder.find((p) => p !== eastId)!;
  // Both seats are AI here, so read the winner from the outcome (its status is
  // written from a human seat's point of view, and no seat is human).
  let winner: SkirmishResult['winner'] = 'none';
  if (out.status !== 'running') {
    const w = out.winnerIds?.[0];
    if (w === westId) winner = 'west';
    else if (w === eastId) winner = 'east';
  }
  const strengthOf = (playerId: string) => {
    let total = 0;
    for (const h of Object.values(d.state.heroes)) {
      if (h.ownerId === playerId && h.status === 'active') total += armyStrength(catalog, h.army.slots.map((x) => (x ? { creatureId: x.creatureId, count: x.count } : null)));
    }
    for (const t of Object.values(d.state.towns)) {
      if (t.ownerId === playerId) total += armyStrength(catalog, t.garrison.slots.map((x) => (x ? { creatureId: x.creatureId, count: x.count } : null)));
    }
    return Math.round(total);
  };
  const strength = { west: strengthOf(westId), east: strengthOf(eastId) };
  let pointsWinner: SkirmishResult['pointsWinner'] = null;
  if (winner === 'none') {
    pointsWinner = strength.west >= strength.east * 1.25 ? 'west' : strength.east >= strength.west * 1.25 ? 'east' : 'draw';
  }
  return { west: o.west, east: o.east, seed: o.seed, winner, pointsWinner, day: d.state.day, firstMover, captures, battles, strength };
}

export interface SeriesSummary {
  readonly runs: number;
  readonly west: number;
  readonly east: number;
  readonly none: number;
  readonly firstMoverWins: number;
  readonly meanDay: number;
}

export function summarize(results: readonly SkirmishResult[]): SeriesSummary {
  const decided = results.filter((r) => r.winner !== 'none');
  return {
    runs: results.length,
    west: results.filter((r) => r.winner === 'west').length,
    east: results.filter((r) => r.winner === 'east').length,
    none: results.filter((r) => r.winner === 'none').length,
    firstMoverWins: results.filter((r) => r.winner !== 'none' && r.winner === r.firstMover).length,
    meanDay: decided.length ? decided.reduce((a, r) => a + r.day, 0) / decided.length : 0,
  };
}

// ---------------------------------------------------------------------------
// Random skirmish maps (proposed this build): seat fairness of the generator
// ---------------------------------------------------------------------------

export interface RandomOptions {
  /** Pantheon for every seat (mirror matches isolate the map and turn order). */
  readonly pantheon: string;
  readonly empires: 2 | 3;
  readonly seed: number;
  readonly maxDay?: number;
}

export interface RandomResult {
  readonly pantheon: string;
  readonly empires: number;
  readonly seed: number;
  /** Seat index (0 = first to move) of the winner, or null at the day cap. */
  readonly winnerSeat: number | null;
  /** At the day cap: the seat with at least 25% more army strength than every other seat, else null (a draw). */
  readonly pointsSeat: number | null;
  /** Seats in the order they were knocked out (no town and no hero), with the day. */
  readonly knockedOut: readonly { readonly seat: number; readonly day: number }[];
  readonly day: number;
  readonly battles: number;
}

/** One all-AI match on a generated symmetric map (small, few monsters, last empire standing). */
export function playRandom(catalog: ContentCatalog, o: RandomOptions): RandomResult {
  const g = createRandomSkirmish(catalog, {
    seed: 8000 + o.seed,
    size: 'small',
    seats: Array.from({ length: o.empires }, () => ({ pantheonId: o.pantheon, controller: 'ai' as const })),
    victory: { type: 'elimination' },
    monsters: 'few',
  });
  const { match } = createGeneratedMatch(catalog, g, { matchId: `rand-${o.pantheon}-${o.empires}-${o.seed}` });
  const d = new GameDriver(match, catalog);
  const maxDay = o.maxDay ?? 40;
  let battles = 0;
  const onEvents = (events: readonly { kind: string }[]) => {
    for (const e of events) if (e.kind === 'BattleStarted') battles++;
  };
  const seats = [g.mission.player.playerId, ...(g.mission.rivals ?? []).map((r) => r.playerId)];
  const knockedOut: { seat: number; day: number }[] = [];
  const present = (id: string) => Object.values(d.state.towns).some((t) => t.ownerId === id) || Object.values(d.state.heroes).some((h) => h.ownerId === id && h.status === 'active');
  for (let i = 0; i < 4000 && d.state.outcome.status === 'running' && d.state.day <= maxDay; i++) {
    d.state = runAITurn(catalog, d.state, { onEvents });
    if (d.state.battle) d.autoBattle(8000);
    seats.forEach((id, s) => {
      if (!knockedOut.some((k) => k.seat === s) && !present(id)) knockedOut.push({ seat: s, day: d.state.day });
    });
  }
  const w = d.state.outcome.status !== 'running' ? (d.state.outcome.winnerIds?.[0] ?? null) : null;
  let pointsSeat: number | null = null;
  if (!w) {
    const strength = seats.map((id) => {
      let total = 0;
      for (const h of Object.values(d.state.heroes)) if (h.ownerId === id && h.status === 'active') total += armyStrength(catalog, h.army.slots.map((x) => (x ? { creatureId: x.creatureId, count: x.count } : null)));
      for (const t of Object.values(d.state.towns)) if (t.ownerId === id) total += armyStrength(catalog, t.garrison.slots.map((x) => (x ? { creatureId: x.creatureId, count: x.count } : null)));
      return total;
    });
    const order = strength.map((v, i) => [v, i] as const).sort((a, b) => b[0] - a[0]);
    if (order.length > 1 && order[0]![0] >= order[1]![0] * 1.25) pointsSeat = order[0]![1];
  }
  return { pantheon: o.pantheon, empires: o.empires, seed: o.seed, winnerSeat: w ? seats.indexOf(w) : null, pointsSeat, knockedOut, day: d.state.day, battles };
}
