/**
 * Climate rules (proposed 2026-10-04): the map's climate changes battles a
 * little, for both sides alike, only where the scenario turns `climateRules` on.
 */
import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import { climateRuleFor, effectiveAttack, effectiveDefense, effectiveSpeed, legalActions, shootingRange, statsOf, type BattleStackState, type MatchState } from '@pr/rules';

type Army = [string, number][];
const slots = (army: Army) => [...army.map(([creatureId, count], i) => ({ stackId: `s${i}`, creatureId, count })), ...Array(7 - army.length).fill(null)];

/** Alexios (Twin Harbors skirmish) attacks the gold-mine guard under `biome`. */
function battleIn(biome: string | null, army: Army, guard: Army, opts: { climateRules?: boolean; matchId?: string } = {}) {
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId: opts.matchId ?? `climate-${biome}` });
  const s: MatchState = d.state;
  if (biome) (s.world.map as { biome: string }).biome = biome;
  if (opts.climateRules !== undefined) (s.scenario as { features: Record<string, unknown> }).features = { ...s.scenario.features, climateRules: opts.climateRules };
  for (const f of Object.values(s.fog)) f.explored = f.explored.map(() => 1);
  const h = s.heroes['alexios']!;
  h.army.slots = slots(army);
  h.attributes = { attack: 0, defense: 0, power: 0, knowledge: 0 };
  h.skills = [];
  const gold = d.catalog.missions['skirmish_twin_harbors']!.sites.find((x) => x.id === 'sk_gold')!.coord;
  h.position = { q: gold.q - 1, r: gold.r };
  h.movementPoints = 5000;
  s.world.sites['sk_gold']!.guard = guard.map(([creatureId, count]) => ({ creatureId, count }));
  d.do({ kind: 'MoveHero', heroId: 'alexios', destination: gold, confirmEncounter: true });
  expect(d.state.battle).not.toBeNull();
  return d;
}
const stackOf = (d: GameDriver, creatureId: string, side: 'attacker' | 'defender' = 'attacker'): BattleStackState =>
  Object.values(d.state.battle!.stacks).find((s) => s.creatureId === creatureId && s.side === side)!;

describe('climate rules', () => {
  it('every map climate but temperate has one small rule, opening with its name', () => {
    const d = GameDriver.mission('skirmish_twin_harbors');
    const ids = Object.keys(d.catalog.climates ?? {}).sort();
    expect(ids).toEqual(['autumn', 'coast', 'desert', 'fjord', 'high_pass', 'jungle', 'moor', 'storm_plateau', 'tundra']);
    for (const r of Object.values(d.catalog.climates!)) {
      expect(r.effects.length).toBeGreaterThan(0);
      expect(r.summary.startsWith(`${r.name}:`)).toBe(true);
      expect(r.iconAssetId).toBe(`icon.climate.${r.id}`);
    }
  });

  it('skirmishes and random maps have it on; The Three Beacons and the campaigns keep it off', () => {
    const sk = GameDriver.mission('skirmish_twin_harbors');
    expect(sk.state.scenario.features?.climateRules).toBe(true);
    for (const m of Object.values(sk.catalog.missions)) {
      if (m.id.startsWith('skirmish_')) continue;
      expect(m.features?.climateRules ?? false, m.id).toBe(false);
    }
  });

  it('fog shortens every shot for both sides; a feature switched off or temperate changes nothing', () => {
    const fog = battleIn('moor', [['peltast', 20]], [['peltast', 20]]);
    const b = fog.state.battle!;
    expect(b.climate).toMatchObject({ id: 'moor', name: 'Fog', rangeMod: -6 });
    const base = statsOf(fog.catalog, 'peltast').range!;
    expect(shootingRange(fog.catalog, 'peltast', b)).toBe(Math.max(1, base - 6));
    expect(shootingRange(fog.catalog, 'peltast')).toBe(base);
    // Both sides alike.
    expect(shootingRange(fog.catalog, stackOf(fog, 'peltast', 'defender').creatureId, b)).toBe(shootingRange(fog.catalog, stackOf(fog, 'peltast').creatureId, b));
    // Non-shooters keep range 0.
    expect(shootingRange(fog.catalog, 'hoplite', b)).toBe(0);
    expect(climateRuleFor(fog.catalog, fog.state)?.id).toBe('moor');

    const off = battleIn('moor', [['peltast', 20]], [['peltast', 20]], { climateRules: false, matchId: 'climate-off' });
    expect(off.state.battle!.climate ?? null).toBeNull();
    expect(shootingRange(off.catalog, 'peltast', off.state.battle!)).toBe(base);
    const mild = battleIn('temperate', [['peltast', 20]], [['peltast', 20]], { matchId: 'climate-temperate' });
    expect(mild.state.battle!.climate ?? null).toBeNull();
  });

  it('fog: a shooter whose target is beyond the shortened range cannot shoot it', () => {
    const d = battleIn('moor', [['peltast', 20]], [['hoplite', 5]]);
    // Opening positions are a whole board apart: every peltast shot is out of the fog range.
    for (let i = 0; i < 20 && d.state.battle; i++) {
      const b = d.state.battle;
      const active = b.activeStackId ? b.stacks[b.activeStackId] : null;
      if (active?.side === 'attacker' && active.creatureId === 'peltast') break;
      if (active?.side === 'defender' || !active) d.autoBattleStep();
      else d.do({ kind: 'BattleDefend', stackId: active.id });
    }
    const la = legalActions(d.catalog, d.state)!;
    const b = d.state.battle!;
    const me = b.stacks[la.stackId]!;
    const foe = stackOf(d, 'hoplite', 'defender');
    const range = shootingRange(d.catalog, 'peltast', b);
    const dist = Math.abs(me.anchor.col - foe.anchor.col);
    expect(dist, 'the guard stands beyond the fog range').toBeGreaterThan(range);
    expect(dist, 'but within the clear-weather range').toBeLessThanOrEqual(statsOf(d.catalog, 'peltast').range!);
    expect(la.shootTargets).not.toContain(foe.id);
    expect(la.shootBlockedReason).toMatch(new RegExp(`\\(${range} hexes\\)`));
  });

  it('desert slows the ground troops only; a storm grounds the flyers; tundra and fjord touch every creature', () => {
    // Each value against the same battle without its climate (other modifiers stay as they are).
    const bare = (d: GameDriver) => ({ ...d.state.battle!, climate: null });
    const desert = battleIn('desert', [['hoplite', 10], ['griffin', 5]], [['hoplite', 10], ['griffin', 5]]);
    const db = desert.state.battle!;
    const hop = stackOf(desert, 'hoplite');
    const gri = stackOf(desert, 'griffin');
    expect(effectiveSpeed(desert.catalog, hop, db)).toBe(Math.max(1, effectiveSpeed(desert.catalog, hop, bare(desert)) - 1));
    expect(effectiveSpeed(desert.catalog, gri, db)).toBe(effectiveSpeed(desert.catalog, gri, bare(desert)));
    expect(effectiveSpeed(desert.catalog, stackOf(desert, 'hoplite', 'defender'), db)).toBe(Math.max(1, effectiveSpeed(desert.catalog, stackOf(desert, 'hoplite', 'defender'), bare(desert)) - 1));

    const storm = battleIn('storm_plateau', [['hoplite', 10], ['griffin', 5]], [['hoplite', 10]], { matchId: 'climate-storm' });
    const sb = storm.state.battle!;
    expect(effectiveSpeed(storm.catalog, stackOf(storm, 'griffin'), sb)).toBe(Math.max(1, effectiveSpeed(storm.catalog, stackOf(storm, 'griffin'), bare(storm)) - 2));
    expect(effectiveSpeed(storm.catalog, stackOf(storm, 'hoplite'), sb)).toBe(effectiveSpeed(storm.catalog, stackOf(storm, 'hoplite'), bare(storm)));

    const cold = battleIn('tundra', [['hoplite', 10]], [['hoplite', 10]], { matchId: 'climate-tundra' });
    for (const side of ['attacker', 'defender'] as const) {
      const st = stackOf(cold, 'hoplite', side);
      expect(effectiveAttack(cold.catalog, cold.state.battle!, st)).toBe(Math.max(0, effectiveAttack(cold.catalog, bare(cold), st) - 1));
    }
    const spray = battleIn('fjord', [['hoplite', 10]], [['hoplite', 10]], { matchId: 'climate-fjord' });
    const sp = stackOf(spray, 'hoplite');
    expect(effectiveDefense(spray.catalog, spray.state.battle!, sp)).toBe(Math.max(0, effectiveDefense(spray.catalog, bare(spray), sp) - 1));
  });

  it('the battle keeps the rule it began with (saved with the battle), and the same commands give the same result', () => {
    const a = battleIn('jungle', [['peltast', 20], ['hoplite', 20]], [['hoplite', 25]], { matchId: 'climate-replay' });
    const b = battleIn('jungle', [['peltast', 20], ['hoplite', 20]], [['hoplite', 25]], { matchId: 'climate-replay' });
    expect(JSON.parse(JSON.stringify(a.state.battle!.climate))).toEqual(a.state.battle!.climate);
    (a.state.world.map as { biome: string }).biome = 'temperate';
    expect(a.state.battle!.climate?.id).toBe('jungle');
    for (let i = 0; i < 40 && a.state.battle && b.state.battle; i++) {
      a.autoBattleStep();
      b.autoBattleStep();
    }
    expect(JSON.stringify(a.state.battle ?? a.state.lastBattleResult)).toBe(JSON.stringify(b.state.battle ?? b.state.lastBattleResult));
  });
});
