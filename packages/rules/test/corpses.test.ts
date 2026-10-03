/**
 * The fallen stay on the battlefield (owner request 2026-10-03): a destroyed
 * stack's cells stay taken for the rest of the battle (ground stacks cannot end
 * there; flyers still pass over), except in a wall or gate opening.
 */
import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import { cellKey, legalActions, occupancy, reachableAnchors, stackCells, type BattleStackState } from '../src';

function battle() {
  const d = GameDriver.mission('skirmish_twin_harbors');
  for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
  const hero = d.hero();
  const mine = d.catalog.missions['skirmish_twin_harbors']!.sites.find((x) => x.id === 'sk_gold')!.coord;
  d.marchTo({ q: mine.q - 1, r: mine.r }, hero.id);
  d.do({ kind: 'MoveHero', heroId: hero.id, destination: mine, confirmEncounter: true });
  for (let i = 0; i < 30 && d.state.battle && legalActions(d.catalog, d.state) === null; i++) d.autoBattleStep();
  return d;
}

describe('corpses on the battlefield', () => {
  it("a destroyed stack's cells stay taken; ground stacks cannot end there", () => {
    const d = battle();
    const b = d.state.battle!;
    const la = legalActions(d.catalog, d.state)!;
    const me = b.stacks[la.stackId]!;
    // Kill a stack of the other side in place.
    const victim = Object.values(b.stacks).find((s) => s.side !== me.side && s.totalHp > 0) as BattleStackState;
    const cells = stackCells(d.catalog, victim);
    victim.totalHp = 0;
    victim.count = 0;
    const occ = occupancy(d.catalog, b);
    for (const c of cells) expect(occ.get(cellKey(c))).toBe(`corpse:${victim.id}`);
    const reach = reachableAnchors(d.catalog, b, me);
    for (const c of cells) expect(reach.has(cellKey(c))).toBe(false);
  });
});
