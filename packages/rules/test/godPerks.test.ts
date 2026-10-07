/**
 * The gods' gifts at hero levels 10 and 15 (owner request 2026-10-07): two
 * exclusive gifts from the gods the empire committed to, part of the expanded
 * rules only, applied through the hero's effects.
 */
import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import { buildGodPerks, PERK_THEMES } from '@pr/content';
import { Tx, effectiveAttributes, godPerksEnabled, grantExperience, perkCandidates, xpForLevel, type MatchState } from '../src';

const SKIRMISH = 'skirmish_twin_harbors';

/** Raise a hero to just below `level` and grant the last point of experience. */
function levelTo(d: GameDriver, heroId: string, level: number): MatchState {
  const s = d.state;
  const h = s.heroes[heroId]!;
  h.level = level - 1;
  h.pendingLevels = 0;
  h.xp = xpForLevel(d.catalog.rulesProfile, level) - 1;
  s.pendingDecisions = [];
  const tx = new Tx({ catalog: d.catalog }, s, h.ownerId);
  grantExperience(tx, heroId as never, 1);
  return s;
}

describe('the gods’ gifts (content)', () => {
  it('every designed god gives two gifts of two different themes, each theme defined', () => {
    const d = GameDriver.mission(SKIRMISH);
    const gods = Object.values(d.catalog.gods).filter((g) => g.implementationStatus === 'implemented' && g.role !== 'undesigned');
    const perks = buildGodPerks(gods);
    expect(perks.length).toBe(gods.length * 2);
    expect(Object.keys(d.catalog.godPerks ?? {}).length).toBe(perks.length);
    for (const g of gods) {
      const mine = perks.filter((p) => p.godId === g.id);
      expect(mine.length, g.id).toBe(2);
      expect(mine[0]!.theme, g.id).not.toBe(mine[1]!.theme);
      for (const p of mine) {
        expect(PERK_THEMES[p.theme], p.id).toBeTruthy();
        expect(p.name.startsWith(g.name), p.id).toBe(true);
        expect(p.effects.length, p.id).toBeGreaterThan(0);
      }
    }
  });
});

describe('the gods’ gifts (rules)', () => {
  it('levels 10 and 15 offer two gifts from two committed gods; level 9 offers none', () => {
    const d = GameDriver.mission(SKIRMISH, { matchId: 'perks-a' });
    const player = d.state.players['player']!;
    const minor = Object.values(d.catalog.gods).find((g) => g.pantheonId === player.pantheonId && g.id !== player.pantheon.patronGodId && g.role !== 'undesigned' && g.implementationStatus === 'implemented')!;
    player.pantheon.minorGodIds = [minor.id];
    const hero = Object.values(d.state.heroes).find((h) => h.ownerId === 'player')!;
    expect(levelTo(d, hero.id, 9).pendingDecisions[0]!.perkOffers).toBeUndefined();
    for (const level of [10, 15]) {
      const s = levelTo(d, hero.id, level);
      const offers = s.pendingDecisions[0]!.perkOffers!;
      expect(offers.length, `level ${level}`).toBe(2);
      const gods = offers.map((id) => d.catalog.godPerks![id]!.godId);
      expect(new Set(gods).size).toBe(2);
      for (const g of gods) expect([player.pantheon.patronGodId, minor.id]).toContain(g);
    }
  });

  it('the pick is exclusive and required; the gift’s effects apply', () => {
    const d = GameDriver.mission(SKIRMISH, { matchId: 'perks-b' });
    const hero = Object.values(d.state.heroes).find((h) => h.ownerId === 'player')!;
    const s = levelTo(d, hero.id, 10);
    const decision = s.pendingDecisions[0]!;
    const offers = decision.perkOffers!;
    expect(offers.length).toBeGreaterThan(0);
    // No gift chosen: refused.
    const refused = d.reject({ kind: 'ChooseLevelUp', decisionId: decision.decisionId, offerIndex: decision.offers.length ? 0 : null }, 'player');
    expect(refused.message).toMatch(/gods’ gifts/);
    const before = effectiveAttributes(d.catalog, d.state, d.state.heroes[hero.id]!);
    d.do({ kind: 'ChooseLevelUp', decisionId: decision.decisionId, offerIndex: decision.offers.length ? 0 : null, perkIndex: 0 });
    const h = d.state.heroes[hero.id]!;
    expect(h.perks).toEqual([offers[0]]);
    expect(h.level).toBe(10);
    // The gift's commander attributes show as divine.
    const perk = d.catalog.godPerks![offers[0]!]!;
    const after = effectiveAttributes(d.catalog, d.state, h);
    for (const e of perk.effects) {
      if (e.type === 'commander_attribute') expect(after[e.attribute].divine - before[e.attribute].divine).toBe(e.amount);
    }
    // A gift taken is never offered again.
    const later = levelTo(d, hero.id, 15).pendingDecisions[0]!.perkOffers ?? [];
    expect(later).not.toContain(offers[0]);
  });

  it('campaign missions without the expanded rules offer no gifts', () => {
    const d = GameDriver.mission('three_beacons_m01', { matchId: 'perks-c' });
    const hero = Object.values(d.state.heroes).find((h) => h.ownerId === 'player')!;
    // (Mission 1 also caps the hero's level, so check the rule directly.)
    expect(godPerksEnabled(d.state)).toBe(false);
    expect(perkCandidates(d.catalog, d.state, hero)).toEqual([]);
  });
});
