/**
 * The AI and sea encounters (sea-creature delivery 2026-10-17; `seaEncountersV1`): the tactical AI on
 * the single-ship board proposes only legal actions (every choice accepted by the rules, never a
 * fallback), swimmers move only through water toward firing positions, deck stacks harpoon or strike
 * across the rail, and the battles finish; the strategic AI aboard a ship attacks a beatable sea monster
 * through the same quotes and sails around one it cannot beat.
 */
import { describe, expect, it } from 'vitest';
import {
  boardZone,
  legalActions,
  processCommand,
  quoteMovement,
  stackCells,
  type CommandPayload,
  type MatchState,
} from '@pr/rules';
import { catalog, cellOf, navalMatch, slots } from '@pr/testing';
import { battleActor, chooseBattleAction, heroTargets, runAITurn } from '../src';

type Army = [string, number][];

function seaMatch(ship: Army, sea: Army, controllers: ('human' | 'ai')[] = ['human', 'ai']): MatchState {
  const s = navalMatch({
    controllers,
    ships: (doc) => [{ id: 'free', ...cellOf(doc, 10, 8) }, { id: 'a', ...cellOf(doc, 11, 10), owner: 0 }],
    sites: (doc) => [{ id: 'deep', kind: 'sea_monster', ...cellOf(doc, 13, 10), guard: { creatureId: sea[0]![0], count: sea[0]![1], more: sea.slice(1).map(([creatureId, count]) => ({ creatureId, count })) } }],
  });
  const shipState = s.world.ships!['map_ship_a']!;
  const hero = s.heroes['leader_1']!;
  shipState.heroId = hero.id;
  shipState.state = 'occupied';
  hero.position = { ...shipState.coord };
  hero.army.slots = slots(ship);
  hero.movementPoints = 2000;
  return s;
}

function attack(s: MatchState): MatchState {
  const res = processCommand({ catalog }, s, { kind: 'MoveHero', heroId: 'leader_1', destination: cellOf(s.world.map, 13, 10), confirmEncounter: true, commandId: 'go', expectedRevision: s.revision, actorPlayerId: 'player' } as never);
  if (!res.ok) throw new Error(res.rejection.message);
  return res.state;
}

/** Fight to the end with the tactical AI on both sides; every proposed command must be accepted as proposed. */
function fight(s: MatchState): { end: MatchState; kinds: Record<string, number>; swimmerSteps: number } {
  const kinds: Record<string, number> = {};
  let swimmerSteps = 0;
  for (let i = 0; i < 3000 && s.battle; i++) {
    const actor = battleActor(s)!;
    const payload = chooseBattleAction(catalog, s) as CommandPayload;
    expect(payload, `step ${i}`).toBeTruthy();
    const b = s.battle;
    const active = b.activeStackId ? b.stacks[b.activeStackId] : null;
    // Swimmers' moves stay in the water, every cell of the footprint.
    if (active && payload.kind === 'BattleMove' && catalog.creatures[active.creatureId]!.abilityIds.includes('swimmer')) {
      swimmerSteps++;
      for (const c of stackCells(catalog, active, payload.to)) expect(boardZone(b, c)).toBe('water');
    }
    if (active && payload.kind === 'BattleMove' && active.side === b.board?.shipSide && !catalog.creatures[active.creatureId]!.abilityIds.includes('flight')) {
      for (const c of stackCells(catalog, active, payload.to)) expect(boardZone(b, c)).toBe('deck');
    }
    kinds[payload.kind] = (kinds[payload.kind] ?? 0) + 1;
    const res = processCommand({ catalog }, s, { ...payload, commandId: `ai${i}`, expectedRevision: s.revision, actorPlayerId: actor } as never);
    if (!res.ok) throw new Error(`step ${i}: ${payload.kind} rejected: ${res.rejection.message} (${JSON.stringify(payload)})`);
    s = res.state;
  }
  expect(s.battle).toBeNull();
  return { end: s, kinds, swimmerSteps };
}

describe('tactical AI at sea', () => {
  it('a melee-only ship army harpoons the swimmers; the swimmers close in and shoot; no illegal command; the battle ends', () => {
    const s = attack(seaMatch([['hoplite', 60], ['cavalry', 8]], [['triton', 5], ['isonade', 2]]));
    const { end, kinds, swimmerSteps } = fight(s);
    expect(kinds['BattleHarpoon'] ?? 0).toBeGreaterThan(0);
    expect(kinds['BattleShoot'] ?? 0).toBeGreaterThan(0);
    expect(swimmerSteps).toBeGreaterThan(0);
    expect(end.lastBattleResult).toBeTruthy();
  });

  it('flyers on both sides and a boss: every choice legal, the battle ends (no round-limit stall from holding swimmers)', () => {
    const s = attack(seaMatch([['griffin', 12], ['peltast', 20], ['minotaur', 4]], [['hafgufa', 1], ['tempest_hippocampus', 6], ['cetus', 1]]));
    const { end } = fight(s);
    expect(end.lastBattleResult!.rounds).toBeLessThan(60);
  });

  it('deck stacks never order a harpoon while engaged on deck (only legal harpoon targets)', () => {
    let s = attack(seaMatch([['minotaur', 6]], [['hippocampus', 3]]));
    for (let i = 0; i < 400 && s.battle; i++) {
      const la = legalActions(catalog, s);
      const payload = chooseBattleAction(catalog, s)!;
      if (payload.kind === 'BattleHarpoon') expect(la!.harpoon!.targets).toContain(payload.targetId);
      const res = processCommand({ catalog }, s, { ...payload, commandId: `x${i}`, expectedRevision: s.revision, actorPlayerId: battleActor(s)! } as never);
      if (!res.ok) throw new Error(res.rejection.message);
      s = res.state;
    }
    expect(s.battle).toBeNull();
  });
});

describe('strategic AI at sea', () => {
  it('a hero aboard targets a beatable sea monster through the same quotes and fights it', () => {
    let s = seaMatch([['minotaur', 10], ['cyclops', 3], ['hoplite', 50]], [['triton', 2]], ['ai', 'human']);
    // The rival town across the water is its own already (no richer target than the sea monster).
    s.towns['town_2']!.ownerId = 'player';
    const hero = s.heroes['leader_1']!;
    const targets = heroTargets(catalog, s, 'player', hero);
    const coord = cellOf(s.world.map, 13, 10);
    expect(targets.some((t) => t.coord.q === coord.q && t.coord.r === coord.r && t.encounter)).toBe(true);
    expect(quoteMovement(catalog, s, hero.id, coord).endsInEncounter).toBe(true);
    s = runAITurn(catalog, s, {});
    // The AI's own battle is fought by the tactical AI inside its turn, or waits for us here.
    for (let i = 0; i < 3000 && s.battle; i++) {
      const payload = chooseBattleAction(catalog, s)!;
      const res = processCommand({ catalog }, s, { ...payload, commandId: `b${i}`, expectedRevision: s.revision, actorPlayerId: battleActor(s)! } as never);
      if (!res.ok) throw new Error(res.rejection.message);
      s = res.state;
    }
    // Fought, or the much weaker creatures fled (a neutral reaction; sea creatures never join): the water is clear.
    expect(s.world.sites['deep']!.cleared).toBe(true);
    expect(Object.values(s.heroes['leader_1']!.army.slots).some((x) => x?.creatureId === 'triton')).toBe(false);
  });

  it('a monster it cannot beat is no target and an obstacle: it is never the destination of a sail', () => {
    const s = seaMatch([['hoplite', 5]], [['abyssal_hafgufa', 2], ['crownfin_cetus', 3]], ['ai', 'human']);
    const hero = s.heroes['leader_1']!;
    const coord = cellOf(s.world.map, 13, 10);
    expect(heroTargets(catalog, s, 'player', hero).some((t) => t.coord.q === coord.q && t.coord.r === coord.r)).toBe(false);
    const after = runAITurn(catalog, s, {});
    expect(after.world.sites['deep']!.cleared).toBe(false);
    expect(after.heroes['leader_1']!.status).toBe('active');
    expect(after.lastBattleResult).toBeNull();
  });
});
