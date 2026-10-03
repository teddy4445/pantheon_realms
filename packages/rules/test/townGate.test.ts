/**
 * Town gates (owner request 2026-10-03): a hero never stands on a town's own
 * tile. It stands on the road tile in front of the town and visits, recruits,
 * defends, captures or besieges from there.
 */
import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import { findHeroPath, heroInTown, isTownTile, quoteMovement, settleHeroesAtTownGates, tileRole, townGate, townVisitor } from '../src';

describe('town gates', () => {
  it('every town has a walkable gate next to it on its road; Twin Harbors gates mirror each other', () => {
    const d = GameDriver.mission('skirmish_twin_harbors');
    const west = d.state.towns['westharbor']!;
    const east = d.state.towns['eastharbor']!;
    const gw = townGate(d.catalog, d.state, west.id);
    const ge = townGate(d.catalog, d.state, east.id);
    expect(gw).toEqual({ q: west.coord.q + 1, r: west.coord.r });
    // Point symmetry: the mirror of the west gate is the east gate.
    const { width, height } = d.state.world.map;
    expect(ge).toEqual({ q: width - 1 - gw.q, r: height - 1 - gw.r });
  });

  it('heroes start at the gate, the town tile is a building nobody enters, and walking "into" a town stops at its gate', () => {
    const d = GameDriver.mission('skirmish_twin_harbors');
    const west = d.state.towns['westharbor']!;
    const hero = d.hero();
    expect(heroInTown(d.catalog, d.state, hero, west.id)).toBe(true);
    expect(hero.position).not.toEqual(west.coord);
    expect(isTownTile(d.catalog, d.state, west.coord)).toBe(true);
    expect(tileRole(d.catalog, d.state, 'player', west.coord, hero.id)).toBe('blocked');
    // Leave, then come back by clicking the town itself.
    d.marchTo({ q: west.coord.q + 3, r: west.coord.r }, hero.id);
    expect(heroInTown(d.catalog, d.state, d.hero(), west.id)).toBe(false);
    const q = quoteMovement(d.catalog, d.state, hero.id, west.coord);
    expect(q.reachable).toBe(true);
    expect(q.path[q.path.length - 1]).toEqual(townGate(d.catalog, d.state, west.id));
    d.do({ kind: 'MoveHero', heroId: hero.id, destination: west.coord });
    expect(d.hero().position).toEqual(townGate(d.catalog, d.state, west.id));
    expect(townVisitor(d.catalog, d.state, west.id)?.id).toBe(hero.id);
    // Recruits go to the hero at the gate.
    expect(findHeroPath(d.catalog, d.state, hero.id, west.coord).reason).toBe('Already here');
  });

  it('an undefended enemy town is captured from its gate; the hero stays at the gate', () => {
    const d = GameDriver.mission('skirmish_twin_harbors');
    const east = d.state.towns['eastharbor']!;
    east.garrison.slots = east.garrison.slots.map(() => null);
    for (const h of Object.values(d.state.heroes)) if (h.ownerId === 'rival') h.status = 'defeated';
    for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
    const hero = d.hero();
    hero.movementPoints = 99999;
    d.do({ kind: 'MoveHero', heroId: hero.id, destination: east.coord });
    expect(d.state.towns['eastharbor']!.ownerId).toBe('player');
    expect(d.hero().position).toEqual(townGate(d.catalog, d.state, east.id));
  });

  it('older saves with a hero on the town tile are settled at the gate when loaded', () => {
    const d = GameDriver.mission('skirmish_twin_harbors');
    const west = d.state.towns['westharbor']!;
    d.hero().position = { ...west.coord };
    settleHeroesAtTownGates(d.catalog, d.state);
    expect(d.hero().position).toEqual(townGate(d.catalog, d.state, west.id));
  });
});
