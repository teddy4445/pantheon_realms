/**
 * Manual battles in campaigns (campaign expansion handoff, 2026-10-15): every
 * battle with a human campaign side is fought by hand. The guard sits in the
 * command processor — an automated order for a human side is refused there —
 * and a refused order leaves the state (and its RNG streams) untouched. AI
 * sides still act on their own, skirmishes keep auto-combat and quick battles.
 */
import { describe, expect, it } from 'vitest';
import { loadCatalog } from '@pr/content';
import {
  axialNeighbors,
  automationForbidden,
  canonicalStateHash,
  manualBattlesRequired,
  processCommand,
  quoteMovement,
  type GameCommand,
  type HexCoord,
  type MatchState,
} from '@pr/rules';
import { battleActor, chooseBattleAction, isAiControlledBattleTurn, runQuickBattle, stepBattleAI } from '@pr/ai';
import { GameSession } from '../src';

const catalog = loadCatalog();

function approach(state: MatchState, heroId: string, c: HexCoord): HexCoord | null {
  const hero = state.heroes[heroId]!;
  const home = hero.position;
  for (const n of axialNeighbors(c)) {
    hero.position = n;
    const q = quoteMovement(catalog, state, heroId, c);
    if (q.reachable && q.path.length === 1 && q.encounterLabel) {
      hero.position = home;
      return n;
    }
  }
  hero.position = home;
  return null;
}

/** A session next to a guarded site, with a strong army so the fight runs a few rounds. */
function nextToGuard(s: GameSession) {
  const st = s.state;
  for (const fog of Object.values(st.fog)) fog.explored = fog.explored.map(() => 1);
  const hero = Object.values(st.heroes).find((h) => h.ownerId === s.humanPlayerId && !h.monster && h.status === 'active')!;
  const unit = Object.values(catalog.creatures).find((c) => c.pantheonId === st.players[s.humanPlayerId]!.pantheonId && c.tier === 1 && c.form === 'base' && !!c.stats)!;
  hero.army.slots = [{ stackId: 'mb0', creatureId: unit.id, count: 40 }, { stackId: 'mb1', creatureId: unit.id, count: 40 }, null, null, null, null, null];
  hero.movementPoints = 3000;
  const sites = catalog.missions[st.mission.missionId]!.sites;
  for (const site of sites) {
    const guard = st.world.sites[site.id]?.guard ?? site.guard?.army;
    if (!guard || guard.length === 0) continue;
    const tile = approach(st, hero.id, site.coord);
    if (!tile) continue;
    hero.position = tile;
    return { hero, payload: { kind: 'MoveHero' as const, heroId: hero.id, destination: site.coord, confirmEncounter: true, encounterChoice: 'fight' as const } };
  }
  throw new Error('no guarded site with an approach tile');
}

/** Start the battle by hand and play on (AI sides, deployment) until a human stack must act. */
function toHumanStack(s: GameSession, payload: Parameters<GameSession['dispatch']>[0]): void {
  const r = s.dispatch(payload);
  expect(r.ok, r.ok ? '' : r.rejection.message).toBe(true);
  expect(s.state.battle).not.toBeNull();
  for (let i = 0; i < 200 && s.state.battle; i++) {
    const b = s.state.battle;
    if (s.needsAI()) {
      expect(s.stepAI().ok).toBe(true);
      continue;
    }
    if (b.phase === 'deployment') {
      expect(s.dispatch({ kind: 'BattleConfirmDeployment' }).ok).toBe(true);
      continue;
    }
    if (b.phase === 'selection') {
      expect(s.dispatch({ kind: 'BattleSelectDefenders', picks: b.selection!.candidates.slice(0, b.selection!.max).map((_, i) => i) }).ok).toBe(true);
      continue;
    }
    return;
  }
  throw new Error('no human stack to act');
}

describe('manual battles in campaigns', () => {
  it('a campaign match requires manual battles; a skirmish does not', () => {
    const camp = GameSession.newCampaign(catalog, 'three_beacons', 'zeus', 'mb-flag');
    expect(manualBattlesRequired(camp.state)).toBe(true);
    expect(camp.manualBattlesOnly).toBe(true);
    const sk = GameSession.newScenario(catalog, 'skirmish_twin_harbors', 'mb-flag-sk');
    expect(manualBattlesRequired(sk.state)).toBe(false);
    expect(sk.manualBattlesOnly).toBe(false);
  });

  it('auto-combat for the human side is refused by the rules, leaving state and RNG unchanged', () => {
    const s = GameSession.newCampaign(catalog, 'three_beacons', 'zeus', 'mb-auto');
    const { payload } = nextToGuard(s);
    toHumanStack(s, payload);
    expect(automationForbidden(s.state)).toBe(true);
    const before = s.state;
    const hash = canonicalStateHash(before);
    const rng = JSON.stringify(before.rng);
    const published: unknown[] = [];
    s.subscribe((u) => published.push(u));
    // The session's auto-combat step.
    const res = s.autoBattleStep();
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.rejection.code).toBe('manual_battle_required');
    expect(s.state).toBe(before);
    expect(canonicalStateHash(s.state)).toBe(hash);
    expect(JSON.stringify(s.state.rng)).toBe(rng);
    expect(published).toHaveLength(0);
    // The same order, marked automated, straight at the command processor.
    const order = chooseBattleAction(catalog, before)!;
    const actor = battleActor(before)!;
    const cmd = { ...order, commandId: 'mb-direct', expectedRevision: before.revision, actorPlayerId: actor, automated: true } as GameCommand;
    const direct = processCommand({ catalog }, before, cmd);
    expect(direct.ok).toBe(false);
    if (!direct.ok) expect(direct.rejection.code).toBe('manual_battle_required');
    expect(canonicalStateHash(before)).toBe(hash);
    // The tactical AI does not even propose an order for the human side.
    const step = stepBattleAI(catalog, before);
    expect(step.command).toBeNull();
    expect(step.state).toBe(before);
    // The player's own order (not automated) is accepted.
    const manual = s.dispatch(order);
    expect(manual.ok, manual.ok ? '' : manual.rejection.message).toBe(true);
    expect(s.state.revision).toBe(before.revision + 1);
  });

  it('enemy AI sides still take their own turns in a campaign battle', () => {
    const s = GameSession.newCampaign(catalog, 'three_beacons', 'zeus', 'mb-ai');
    const { payload } = nextToGuard(s);
    toHumanStack(s, payload);
    let aiTurns = 0;
    for (let i = 0; i < 400 && s.state.battle; i++) {
      if (s.needsAI()) {
        expect(isAiControlledBattleTurn(s.state)).toBe(true);
        expect(automationForbidden(s.state)).toBe(false);
        expect(s.stepAI().ok).toBe(true);
        aiTurns++;
        continue;
      }
      const order = chooseBattleAction(catalog, s.state)!;
      expect(s.dispatch(order).ok).toBe(true); // the player's hand, one order at a time
    }
    expect(aiTurns).toBeGreaterThan(0);
    expect(s.state.battle).toBeNull();
    expect(s.state.lastBattleResult).not.toBeNull();
  });

  it('quick battle is refused in a campaign before anything is processed', () => {
    const s = GameSession.newCampaign(catalog, 'three_beacons', 'zeus', 'mb-quick');
    const { payload } = nextToGuard(s);
    const before = s.state;
    const hash = canonicalStateHash(before);
    const kinds: string[] = [];
    s.onCheckpoint((k) => kinds.push(k));
    const res = s.quickBattle(payload);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.rejection.code).toBe('manual_battle_required');
    expect(s.state).toBe(before);
    expect(canonicalStateHash(s.state)).toBe(hash);
    expect(kinds).toEqual([]);
    const run = runQuickBattle(catalog, before, s.humanPlayerId, payload);
    expect(run.ok).toBe(false);
    expect(canonicalStateHash(before)).toBe(hash);
  });

  it('skirmish keeps auto-combat for the human side', () => {
    const s = GameSession.newScenario(catalog, 'skirmish_twin_harbors', 'mb-skirmish');
    const { payload } = nextToGuard(s);
    toHumanStack(s, payload);
    expect(automationForbidden(s.state)).toBe(false);
    const rev = s.state.revision;
    expect(s.autoBattleStep().ok).toBe(true);
    expect(s.state.revision).toBeGreaterThan(rev);
  });

  it('test drivers that stand in for the player may still script a campaign battle', () => {
    const s = GameSession.newCampaign(catalog, 'three_beacons', 'zeus', 'mb-sim');
    const { payload } = nextToGuard(s);
    const run = runQuickBattle(catalog, s.state, s.humanPlayerId, payload, undefined, { playerSimulation: true });
    expect(run.ok).toBe(true);
  });
});
