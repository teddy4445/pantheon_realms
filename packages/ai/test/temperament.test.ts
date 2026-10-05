import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import { deepClone, type CommandPayload, type MatchState } from '@pr/rules';
import {
  aiPersonality,
  aiPersonalityFor,
  aiTemperamentFor,
  buildingFocus,
  buildObservation,
  NEUTRAL_TEMPERAMENT,
  skillOfferValue,
  strategicCandidates,
} from '../src';
import { heroPower } from '../src/assessment';

const mission = (p: string, r: string) => (p === 'greek' && r === 'greek' ? 'skirmish_twin_harbors' : `skirmish_twin_harbors_${p}_vs_${r}`);
const PANTHEONS = ['greek', 'norse', 'egyptian', 'japanese', 'celtic', 'mesoamerican'] as const;

function withTemperaments(s: MatchState, on: boolean): MatchState {
  const c = deepClone(s);
  c.scenario = { ...c.scenario, features: { ...c.scenario.features!, aiTemperaments: on } };
  return c;
}

function rivalCandidates(d: GameDriver, s: MatchState): CommandPayload[] {
  return strategicCandidates(d.catalog, buildObservation(d.catalog, s, 'rival'));
}

/**
 * The rival's build order with a full treasury: each step takes the build the
 * planner proposes, applies it through the command processor and opens the next day's build.
 */
function buildOrder(rival: string, on: boolean, steps = 14): string[] {
  const d = GameDriver.mission(mission('greek', rival));
  d.state = withTemperaments(d.state, on);
  d.state.activePlayerId = 'rival';
  const town = Object.values(d.state.towns).find((t) => t.ownerId === 'rival')!;
  const out: string[] = [];
  for (let i = 0; i < steps; i++) {
    const w = d.state.players['rival']!.wallet;
    Object.assign(w, { gold: 200000, wood: 500, stone: 500, crystal: 500 });
    d.state.towns[town.id]!.buildUsedDay = -1;
    const b = rivalCandidates(d, d.state).find((c) => c.kind === 'BuildStructure');
    if (!b || b.kind !== 'BuildStructure') break;
    d.do(b, 'rival');
    out.push(b.buildingId);
  }
  return out;
}

/** Earliness of the favoured kind in the first `n` builds: n points for the first build, n − 1 for the second … */
const earlyCount = (order: readonly string[], test: (id: string) => boolean, n = 8) => order.slice(0, n).reduce((sum, id, i) => sum + (test(id) ? n - i : 0), 0);

describe('AI temperaments (content data)', () => {
  it('every playable pantheon has one; Greek is the neutral reference; skirmishes turn them on, campaigns keep them off', () => {
    const d = GameDriver.mission('skirmish_twin_harbors');
    expect(Object.keys(d.catalog.aiTemperaments ?? {}).sort()).toEqual([...PANTHEONS].sort());
    const greek = d.catalog.aiTemperaments!['greek']!;
    expect({ ...greek, id: 'neutral', name: NEUTRAL_TEMPERAMENT.name, summary: NEUTRAL_TEMPERAMENT.summary }).toEqual(NEUTRAL_TEMPERAMENT);
    expect(d.state.scenario.features?.aiTemperaments).toBe(true);
    const campaign = GameDriver.mission('three_beacons_m01');
    expect(campaign.state.scenario.features?.aiTemperaments).not.toBe(true);
    for (const p of Object.keys(campaign.state.players)) expect(aiTemperamentFor(campaign.catalog, campaign.state, p)).toBe(NEUTRAL_TEMPERAMENT);
  });

  it('scales the difficulty margins by boldness, never below 1, and adds the extra hero', () => {
    const d = GameDriver.mission(mission('greek', 'norse'));
    const base = aiPersonality(d.catalog, d.state);
    const norse = aiPersonalityFor(d.catalog, d.state, 'rival');
    expect(norse.heroAttackMargin).toBeLessThan(base.heroAttackMargin);
    expect(norse.heroAttackMargin).toBeGreaterThanOrEqual(1);
    expect(norse.targetHeroes).toBe(base.targetHeroes + 1);
    // The Greek player (neutral) keeps the difficulty's values.
    expect(aiPersonalityFor(d.catalog, d.state, 'player')).toEqual(base);
    // Off: the difficulty alone.
    expect(aiPersonalityFor(d.catalog, withTemperaments(d.state, false), 'rival')).toEqual(base);
    // Hard × Raiders would fall below 1: clamped.
    const hard = deepClone(d.state);
    hard.scenario = { ...hard.scenario, difficultyId: 'hard' };
    const p = aiPersonalityFor(d.catalog, hard, 'rival');
    for (const m of [p.heroAttackMargin, p.guardMargin, p.siegeMargin]) expect(m).toBeGreaterThanOrEqual(1);
    // Builders keep the difficulty's margins (boldness 1 since the 2026-10-05 balance pass); only their build order and raiding differ.
    const e = GameDriver.mission(mission('greek', 'egyptian'));
    expect(aiPersonalityFor(e.catalog, e.state, 'rival').siegeMargin).toBe(aiPersonality(e.catalog, e.state).siegeMargin);
  });

  it('classifies buildings by their effects and dwellings (data, not IDs)', () => {
    const d = GameDriver.mission('skirmish_twin_harbors');
    const kinds = (focus: string) => Object.keys(d.catalog.buildings).filter((b) => d.catalog.buildings[b]!.pantheonId === 'celtic' && buildingFocus(d.catalog, b).has(focus as never));
    for (const f of ['economy', 'military', 'elite', 'defense', 'magic', 'faith']) expect(kinds(f).length, f).toBeGreaterThan(0);
  });
});

describe('AI temperaments (choices)', () => {
  it('in its first eight builds each temperament raises what it favours earlier than an even rival of the same pantheon', () => {
    const d = GameDriver.mission('skirmish_twin_harbors');
    const is = (focus: string) => (id: string) => buildingFocus(d.catalog, id).has(focus as never);
    const compare = (rival: string, focus: string) => {
      const on = buildOrder(rival, true);
      const off = buildOrder(rival, false);
      return { on: earlyCount(on, is(focus)), off: earlyCount(off, is(focus)), orderOn: on, orderOff: off };
    };
    // (The Devout lean is in its offerings — see below — and only tips close build choices.)
    for (const [rival, focus] of [['celtic', 'magic'], ['egyptian', 'defense'], ['egyptian', 'economy'], ['japanese', 'elite'], ['norse', 'military']] as const) {
      const r = compare(rival, focus);
      expect(r.on, `${rival} ${focus}: ${JSON.stringify(r)}`).toBeGreaterThan(r.off);
    }
  });

  it('Raiders attack a hero they beat by a small margin that an even rival leaves alone', () => {
    const d = GameDriver.mission(mission('greek', 'norse'));
    const s = deepClone(d.state);
    for (const fog of Object.values(s.fog)) fog.explored = fog.explored.map(() => 1);
    const rivalHero = Object.values(s.heroes).find((h) => h.ownerId === 'rival')!;
    const playerHero = Object.values(s.heroes).find((h) => h.ownerId === 'player')!;
    const east = Object.values(s.towns).find((t) => t.ownerId === 'rival')!.coord;
    rivalHero.position = { q: east.q - 3, r: east.r + 1 };
    playerHero.position = { q: east.q - 5, r: east.r + 1 };
    s.activePlayerId = 'rival';
    // Size the player's army so the rival is stronger by a margin between the Raiders' and the even one.
    const even = aiPersonality(d.catalog, s).heroAttackMargin;
    const bold = aiPersonalityFor(d.catalog, s, 'rival').heroAttackMargin;
    const target = (even + bold) / 2;
    // A large rival army, so one hoplite more or less moves the ratio by well under the margin gap.
    for (const slot of rivalHero.army.slots) if (slot) slot.count *= 8;
    const mine = heroPower(d.catalog, s, rivalHero);
    const hoplites = (n: number) => [{ stackId: 'p0', creatureId: 'hoplite', count: n }, null, null, null, null, null, null];
    let n = 1;
    while (n < 4000) {
      playerHero.army.slots = hoplites(n + 1) as never;
      if (mine / heroPower(d.catalog, s, playerHero) < target) break;
      n++;
    }
    playerHero.army.slots = hoplites(n) as never;
    const ratio = mine / heroPower(d.catalog, s, playerHero);
    expect(ratio).toBeGreaterThanOrEqual(bold);
    expect(ratio).toBeLessThan(even);
    const attack = (c: CommandPayload) => c.kind === 'MoveHero' && c.heroId === rivalHero.id && c.destination.q === playerHero.position.q && c.destination.r === playerHero.position.r;
    expect(rivalCandidates(d, s).some(attack)).toBe(true);
    expect(rivalCandidates(d, withTemperaments(s, false)).some(attack)).toBe(false);
  });

  it('Devout keep making offerings once their gods are chosen; an even rival stops', () => {
    const d = GameDriver.mission(mission('greek', 'mesoamerican'));
    const s = deepClone(d.state);
    s.activePlayerId = 'rival';
    const town = Object.values(s.towns).find((t) => t.ownerId === 'rival')!;
    town.buildings['pantheon_temple'] = 1;
    town.garrison.slots = [{ stackId: 'g0', creatureId: 'mesoamerican_feathered_serpent', count: 30 }, null, null, null, null, null, null] as never;
    // Both god choices already made: no Favor is needed for gods.
    const groups = new Map<string, string>();
    for (const g of d.catalog.pantheons['mesoamerican']!.godIds) {
      const def = d.catalog.gods[g]!;
      if (def.role === 'minor' && def.exclusivityGroup && !groups.has(def.exclusivityGroup)) groups.set(def.exclusivityGroup, g);
    }
    s.players['rival']!.pantheon.minorGodIds = [...groups.values()];
    s.players['rival']!.wallet.favor = 0;
    expect(rivalCandidates(d, s).some((c) => c.kind === 'MakeOffering')).toBe(true);
    expect(rivalCandidates(d, withTemperaments(s, false)).some((c) => c.kind === 'MakeOffering')).toBe(false);
  });

  it('Mystics weigh Wisdom and magic skills higher; other skills keep their value', () => {
    const d = GameDriver.mission(mission('greek', 'celtic'));
    const hero = Object.values(d.state.heroes).find((h) => h.ownerId === 'rival')!;
    const caster = { ...hero, spellbook: true };
    const wisdom = { kind: 'new' as const, skillId: 'wisdom', toRank: 1 };
    const leadership = { kind: 'new' as const, skillId: 'leadership', toRank: 1 };
    const magic = d.catalog.aiTemperaments!['celtic']!.magic;
    expect(skillOfferValue(d.catalog, caster, wisdom, magic)).toBeGreaterThan(skillOfferValue(d.catalog, caster, wisdom));
    expect(skillOfferValue(d.catalog, caster, leadership, magic)).toBe(skillOfferValue(d.catalog, caster, leadership));
  });

  it('is deterministic and reads only the empire’s own pantheon', () => {
    const d = GameDriver.mission(mission('greek', 'norse'));
    const s = deepClone(d.state);
    s.activePlayerId = 'rival';
    const a = rivalCandidates(d, s);
    const b = rivalCandidates(d, deepClone(s));
    expect(b).toEqual(a);
    // The other empire's pantheon does not change the rival's temperament.
    const other = deepClone(s);
    other.players['player']!.pantheonId = 'celtic';
    expect(aiTemperamentFor(d.catalog, other, 'rival')).toBe(aiTemperamentFor(d.catalog, s, 'rival'));
  });
});
