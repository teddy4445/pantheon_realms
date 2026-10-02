/**
 * Hero development for the strategic AI (owner request 2026-10-02): level-up
 * choices that fit the army and the hero's magic, artifact loadouts that plan
 * around sets, and adventure spells (movement, scouting, recall).
 */
import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import type { MatchState, SkillOffer } from '@pr/rules';
import { buildObservation, levelUpCandidates, loadoutValue, movementSpellCandidate, skillOfferValue, strategicCandidates } from '../src';

const SKIRMISH = 'skirmish_twin_harbors';
const clone = <T>(x: T): T => structuredClone(x);
const army = (stacks: [string, number][]) => [...stacks.map(([creatureId, count], i) => ({ stackId: `t${i}`, creatureId, count })), ...Array(7 - stacks.length).fill(null)];

describe('AI level-up choices', () => {
  it('takes Archery for an army of shooters and Offense for a melee army', () => {
    const d = GameDriver.mission(SKIRMISH);
    const hero = clone(d.state.heroes['alexios']!);
    const archery: SkillOffer = { kind: 'new', skillId: 'archery', toRank: 1 };
    const offense: SkillOffer = { kind: 'new', skillId: 'offense', toRank: 1 };
    hero.army.slots = army([['peltast', 30]]);
    expect(skillOfferValue(d.catalog, hero, archery)).toBeGreaterThan(skillOfferValue(d.catalog, hero, offense));
    hero.army.slots = army([['hoplite', 40]]);
    expect(skillOfferValue(d.catalog, hero, offense)).toBeGreaterThan(skillOfferValue(d.catalog, hero, archery));
  });

  it('values Wisdom only with a spellbook, and answers a pending level-up with the best offer', () => {
    const d = GameDriver.mission(SKIRMISH);
    const s: MatchState = clone(d.state);
    const hero = s.heroes['alexios']!;
    hero.army.slots = army([['hoplite', 40]]);
    const wisdom: SkillOffer = { kind: 'new', skillId: 'wisdom', toRank: 1 };
    const leadership: SkillOffer = { kind: 'new', skillId: 'leadership', toRank: 1 };
    hero.spellbook = false;
    expect(skillOfferValue(d.catalog, hero, leadership)).toBeGreaterThan(skillOfferValue(d.catalog, hero, wisdom));
    s.pendingDecisions = [{ decisionId: 'lv1', kind: 'level_up', heroId: hero.id, newLevel: 2, primaryGain: 'attack', offers: [wisdom, leadership] }];
    expect(levelUpCandidates(d.catalog, s, 'player')).toEqual([{ kind: 'ChooseLevelUp', decisionId: 'lv1', offerIndex: 1 }]);
  });
});

describe('AI artifacts and sets', () => {
  it('a second set piece is worth more than a slightly stronger loose item', () => {
    const d = GameDriver.mission(SKIRMISH);
    const withLoose = loadoutValue(d.catalog, ['harpe_of_perseus', 'einherjar_mail']);
    const withSet = loadoutValue(d.catalog, ['rune_marked_sword', 'einherjar_mail']);
    expect(withSet).toBeGreaterThan(withLoose);
  });

  it('swaps a worn weapon for the piece that completes a set bonus, and equips into empty slots', () => {
    const d = GameDriver.mission(SKIRMISH);
    const s: MatchState = clone(d.state);
    const hero = s.heroes['alexios']!;
    hero.equipment = { weapon: { instanceId: 'i1', artifactId: 'harpe_of_perseus' }, armor: { instanceId: 'i2', artifactId: 'einherjar_mail' } };
    hero.backpack = [{ instanceId: 'i3', artifactId: 'rune_marked_sword' }, { instanceId: 'i4', artifactId: 'boar_crest_helm' }];
    const c = strategicCandidates(d.catalog, buildObservation(d.catalog, s, 'player'));
    const equips = c.filter((x) => x.kind === 'EquipArtifact');
    expect(equips[0]).toMatchObject({ heroId: 'alexios' });
    // Apply the AI's equips one by one (it re-plans after each) and read the final loadout.
    const drv = new GameDriver(s, d.catalog);
    for (let i = 0; i < 4; i++) {
      const next = strategicCandidates(d.catalog, buildObservation(d.catalog, drv.state, 'player')).find((x) => x.kind === 'EquipArtifact');
      if (!next) break;
      drv.do(next, 'player');
    }
    const eq = drv.state.heroes['alexios']!.equipment;
    expect(eq.weapon?.artifactId).toBe('rune_marked_sword');
    expect(eq.head?.artifactId).toBe('boar_crest_helm');
    expect(drv.state.heroes['alexios']!.backpack.map((b) => b.artifactId)).toEqual(['harpe_of_perseus']);
  });
});

describe('AI adventure spells', () => {
  it('casts a movement spell when the planned move falls just short today, keeping a battle reserve', () => {
    const d = GameDriver.mission(SKIRMISH);
    const s: MatchState = clone(d.state);
    const hero = s.heroes['alexios']!;
    hero.spellbook = true;
    hero.knownSpellIds = ['fleet_foot'];
    hero.mana = 20;
    hero.movementPoints = 500;
    const dest = { q: hero.position.q + 3, r: hero.position.r };
    expect(movementSpellCandidate(d.catalog, s, 'player', hero, { destination: dest, totalCost: 650, reachesToday: false })).toEqual({ kind: 'CastAdventureSpell', heroId: 'alexios', spellId: 'fleet_foot', target: hero.position });
    // Too far for the bonus to matter, or already arriving: no cast.
    expect(movementSpellCandidate(d.catalog, s, 'player', hero, { destination: dest, totalCost: 2000, reachesToday: false })).toBeNull();
    expect(movementSpellCandidate(d.catalog, s, 'player', hero, { destination: dest, totalCost: 300, reachesToday: true })).toBeNull();
    // A hero who also knows battle spells keeps half its mana for battle.
    hero.knownSpellIds = ['fleet_foot', ...Object.values(d.catalog.spells).filter((x) => x.context === 'battle').slice(0, 1).map((x) => x.id)];
    hero.mana = 8;
    expect(movementSpellCandidate(d.catalog, s, 'player', hero, { destination: dest, totalCost: 650, reachesToday: false })).toBeNull();
  });

  it('recalls to a threatened town with no hero inside when walking would take longer than today', () => {
    const d = GameDriver.mission(SKIRMISH);
    const s: MatchState = clone(d.state);
    for (const fog of Object.values(s.fog)) fog.explored = fog.explored.map(() => 1);
    const west = s.towns['westharbor']!.coord;
    const hero = s.heroes['alexios']!;
    hero.position = { q: west.q + 12, r: west.r };
    hero.movementPoints = 300;
    hero.spellbook = true;
    hero.knownSpellIds = ['homecoming'];
    hero.mana = 30;
    hero.army.slots = army([['hoplite', 10]]);
    // A strong rival hero stands three tiles from the empty town.
    const rival = s.heroes['rival_odysseus']!;
    rival.position = { q: west.q + 3, r: west.r };
    rival.army.slots = army([['hoplite', 120]]);
    const c = strategicCandidates(d.catalog, buildObservation(d.catalog, s, 'player'));
    expect(c).toContainEqual({ kind: 'CastAdventureSpell', heroId: 'alexios', spellId: 'homecoming', target: hero.position });
  });
});
