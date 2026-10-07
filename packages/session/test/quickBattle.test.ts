/**
 * Quick battles from the encounter panel (2026-10-07): the preview on a copy of
 * the state is exactly the result the session commits; no battle is left open;
 * a battle against another human seat is not resolved quickly.
 */
import { describe, expect, it } from 'vitest';
import { loadCatalog } from '@pr/content';
import { axialNeighbors, canonicalStateHash, quoteMovement, type HexCoord, type MatchState } from '@pr/rules';
import { runQuickBattle, summarizeQuickBattle } from '@pr/ai';
import { GameSession } from '../src';

const catalog = loadCatalog();
const MISSION = 'skirmish_twin_harbors';

function approach(state: MatchState, heroId: string, c: HexCoord): HexCoord {
  const hero = state.heroes[heroId]!;
  const home = hero.position;
  for (const n of axialNeighbors(c)) {
    hero.position = n;
    const q = quoteMovement(catalog, state, heroId, c);
    if (q.reachable && q.path.length === 1) {
      hero.position = home;
      return n;
    }
  }
  hero.position = home;
  throw new Error('no approach tile');
}

function atGoldMine(matchId: string, army: [string, number][]) {
  const s = GameSession.newScenario(catalog, MISSION, matchId);
  const st = s.state;
  for (const fog of Object.values(st.fog)) fog.explored = fog.explored.map(() => 1);
  const hero = Object.values(st.heroes).find((h) => h.ownerId === 'player' && !h.monster)!;
  hero.army.slots = [...army.map(([creatureId, count], i) => ({ stackId: `q${i}`, creatureId, count })), ...Array(7 - army.length).fill(null)];
  const gold = catalog.missions[MISSION]!.sites.find((x) => x.id === 'sk_gold')!.coord;
  hero.position = approach(st, hero.id, gold);
  hero.movementPoints = 3000;
  return { s, hero, payload: { kind: 'MoveHero' as const, heroId: hero.id, destination: gold, confirmEncounter: true } };
}

describe('quick battles', () => {
  it('the preview is the result the session commits, and the battle is closed', () => {
    const { s, hero, payload } = atGoldMine('quick-a', [['hoplite', 60], ['peltast', 40]]);
    const before = canonicalStateHash(s.state);
    const preview = runQuickBattle(catalog, s.state, 'player', payload);
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    // The preview did not touch the session's state.
    expect(canonicalStateHash(s.state)).toBe(before);
    const kinds: string[] = [];
    s.onCheckpoint((k) => kinds.push(k));
    const res = s.quickBattle(payload);
    expect(res.ok).toBe(true);
    expect(kinds).toEqual(['pre_encounter']);
    expect(s.state.battle).toBeNull();
    expect(canonicalStateHash(s.state)).toBe(canonicalStateHash(preview.state));
    const sum = summarizeQuickBattle(s.state.lastBattleResult!, 'player', s.state);
    expect(sum.won).toBe(true);
    expect(sum.xp).toBeGreaterThan(0);
    // The losses shown are the creatures actually missing from the army.
    const count = (id: string) => s.state.heroes[hero.id]!.army.slots.filter((x) => x?.creatureId === id).reduce((n, x) => n + x!.count, 0);
    for (const l of sum.losses) expect(count(l.creatureId)).toBe(l.before - l.lost);
  });

  it('a hopeless fight is predicted as a defeat', () => {
    const { s, payload } = atGoldMine('quick-b', [['hoplite', 1]]);
    const run = runQuickBattle(catalog, s.state, 'player', payload);
    expect(run.ok).toBe(true);
    if (run.ok) expect(summarizeQuickBattle(run.result, 'player', run.state).won).toBe(false);
  });

  it('refuses a move without a battle and a battle against another human seat', () => {
    const { s, hero } = atGoldMine('quick-c', [['hoplite', 30]]);
    const empty = axialNeighbors(hero.position).find((n) => {
      const q = quoteMovement(catalog, s.state, hero.id, n);
      return q.reachable && !q.encounterLabel;
    })!;
    const none = runQuickBattle(catalog, s.state, 'player', { kind: 'MoveHero', heroId: hero.id, destination: empty, confirmEncounter: true });
    expect(none.ok).toBe(false);
    // Hot-seat: the rival is a human seat; its hero stands next to ours.
    const st = s.state;
    const rivalId = st.playerOrder.find((p) => p !== 'player' && st.players[p]!.role === 'rival')!;
    st.players[rivalId]!.controller = 'human';
    const rival = Object.values(st.heroes).find((h) => h.ownerId === rivalId && h.status === 'active')!;
    rival.position = empty;
    const run = runQuickBattle(catalog, st, 'player', { kind: 'MoveHero', heroId: hero.id, destination: empty, confirmEncounter: true });
    expect(run.ok).toBe(false);
    if (!run.ok) expect(run.reason).toMatch(/Another player/);
  });
});
