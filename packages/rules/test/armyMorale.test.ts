import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import { armyCompositionMorale } from '../src';

describe('army make-up and morale (2026-10-07)', () => {
  const d = GameDriver.mission('skirmish_twin_harbors');
  const c = d.catalog;
  const of = (pantheon: string | null) => Object.values(c.creatures).find((x) => x.implementationStatus === 'implemented' && x.form === 'base' && x.pantheonId === pantheon)!.id;
  it('one pantheon +1; each further pantheon −1, at most −2; neutral creatures never count', () => {
    expect(armyCompositionMorale(c, [of('greek'), of('greek')]).value).toBe(1);
    expect(armyCompositionMorale(c, [of('greek'), of(null)]).value).toBe(0);
    expect(armyCompositionMorale(c, [of('greek'), of('norse')]).value).toBe(-1);
    expect(armyCompositionMorale(c, [of('greek'), of('norse'), of(null)]).value).toBe(-1);
    expect(armyCompositionMorale(c, [of('greek'), of('norse'), of('celtic')]).value).toBe(-2);
    expect(armyCompositionMorale(c, [of('greek'), of('norse'), of('celtic'), of('egyptian')]).value).toBe(-2);
    expect(armyCompositionMorale(c, []).value).toBe(0);
  });
  it('a hero leading two pantheons fights with −1 morale from the army', () => {
    const g = GameDriver.mission('skirmish_twin_harbors', { matchId: 'army-morale' });
    const hero = Object.values(g.state.heroes).find((h) => h.ownerId === 'player')!;
    hero.army.slots = hero.army.slots.map((s, i) => (i === 0 ? { stackId: 'm1', creatureId: of('greek'), count: 40 } : i === 1 ? { stackId: 'm2', creatureId: of('norse'), count: 40 } : null));
    const mine = g.catalog.missions['skirmish_twin_harbors']!.sites.find((s) => s.id === 'sk_gold')!.coord;
    g.marchTo({ q: mine.q - 1, r: mine.r }, hero.id);
    g.do({ kind: 'MoveHero', heroId: hero.id, destination: mine, confirmEncounter: true });
    expect(g.state.battle?.sides.attacker.factionMorale).toBe(-1);
  });
});
