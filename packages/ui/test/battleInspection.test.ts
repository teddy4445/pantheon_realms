/**
 * The battle creature inspection card (expedition kit 2026-10-17, handoff §04): its model reads the
 * rules' own resolvers — front-creature HP ((totalHp − 1) mod H) + 1 (0 when destroyed) apart from the
 * count and the stack's HP, retaliations left (one, two, unlimited, suppressed), ammunition or "not a
 * shooter", effective values with their base and parts, every effect's expiry (rounds or the next
 * activation) and its recorded source (hero, commander, stack, miracle, unknown). Building it changes
 * nothing.
 */
import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import { attackBreakdown, canonicalStateHash, frontHp, type BattleSideId, type BattleStackState, type BattleStatusState } from '@pr/rules';
import { ammunitionView, effectExpiry, effectSource, inspectableOrder, inspectionModel, retaliationView } from '../src/app/battleInspection';

const MISSION = 'skirmish_twin_harbors';

function started(): GameDriver {
  const d = GameDriver.mission(MISSION, { matchId: 'unit:battle-inspection' });
  for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
  const hero = d.hero();
  const mine = d.catalog.missions[MISSION]!.sites.find((x) => x.id === 'sk_gold')!.coord;
  d.marchTo({ q: mine.q - 1, r: mine.r }, hero.id);
  d.do({ kind: 'MoveHero', heroId: hero.id, destination: mine, confirmEncounter: true });
  return d;
}

interface Piece {
  readonly id: string;
  readonly side: BattleSideId;
  readonly creatureId: string;
  readonly count: number;
  readonly at: readonly [number, number];
}

function arena(pieces: readonly Piece[], active: string): GameDriver {
  const d = started();
  const b = d.state.battle!;
  const tmpl = Object.values(b.stacks)[0]!;
  b.stacks = {};
  pieces.forEach((p, i) => {
    const st = d.catalog.creatures[p.creatureId]!.stats!;
    const stack: BattleStackState = {
      ...structuredClone(tmpl),
      id: p.id,
      side: p.side,
      sourceSlot: i,
      creatureId: p.creatureId,
      anchor: { col: p.at[0], row: p.at[1] },
      facing: p.side === 'attacker' ? 1 : -1,
      startingCount: p.count,
      totalHp: st.hp * p.count,
      shotsRemaining: st.shots,
      retaliationsUsed: 0,
      waited: false,
      defending: false,
      moraleRolledThisRound: true,
      statuses: [],
      killedByEnemy: 0,
      abilityUses: {},
    };
    b.stacks[p.id] = stack;
  });
  b.obstacles = [];
  b.siege = null;
  b.phase = 'normal';
  b.deployment = null;
  b.selection = null;
  b.activeStackId = active;
  b.normalQueue = pieces.map((p) => p.id).filter((id) => id !== active);
  b.waitQueue = [];
  b.round = 3;
  for (const side of Object.values(b.sides)) {
    if (side.commander) side.commander = { ...side.commander, morale: 0, luck: 0 };
    side.factionMorale = 0;
  }
  return d;
}

const PIECES: Piece[] = [
  { id: 'hop', side: 'attacker', creatureId: 'hoplite', count: 30, at: [3, 4] },
  { id: 'pel', side: 'attacker', creatureId: 'peltast', count: 18, at: [2, 6] },
  { id: 'gri', side: 'attacker', creatureId: 'griffin', count: 6, at: [3, 8] },
  { id: 'wgr', side: 'attacker', creatureId: 'windcrest_griffin', count: 5, at: [3, 10] },
  { id: 'rr', side: 'attacker', creatureId: 'root_runner', count: 12, at: [5, 2] },
  { id: 'foe', side: 'defender', creatureId: 'brigand', count: 20, at: [10, 5] },
];
const st = (over: Partial<BattleStatusState>): BattleStatusState => ({ sourceId: 'spell:warcry', label: 'Warcry', kind: 'attack_bonus', amount: 3, numerator: 1, denominator: 1, expiresAtRound: 5, ...over });
const stat = (m: NonNullable<ReturnType<typeof inspectionModel>>, key: string) => m.stats.find((s) => s.key === key)!;

describe('front creature HP', () => {
  it('is ((totalHp − 1) mod H) + 1 for a living stack and 0 when destroyed, apart from count and total', () => {
    const d = arena(PIECES, 'hop');
    const s = d.state.battle!.stacks['pel']!;
    const H = d.catalog.creatures['peltast']!.stats!.hp;
    for (let total = -3; total <= H * 18; total++) {
      s.totalHp = total;
      const expected = total <= 0 ? 0 : ((total - 1) % H) + 1;
      expect(frontHp(d.catalog, s), `total ${total}`).toBe(expected);
      const m = inspectionModel(d.catalog, d.state, 'pel', 'attacker')!;
      expect(m.frontHp).toBe(expected);
      expect(m.maxHp).toBe(H);
      expect(m.totalHp).toBe(Math.max(0, total));
      expect(m.count).toBe(total <= 0 ? 0 : Math.ceil(total / H));
      expect(m.alive).toBe(total > 0);
    }
  });

  it('a damaged shooter: front creature wounded, count and stack HP separate', () => {
    const d = arena(PIECES, 'hop');
    const s = d.state.battle!.stacks['pel']!;
    const H = d.catalog.creatures['peltast']!.stats!.hp;
    s.totalHp = H * 17 + 3;
    s.shotsRemaining = 5;
    const m = inspectionModel(d.catalog, d.state, 'pel', 'attacker')!;
    expect([m.count, m.frontHp, m.totalHp, m.startingCount]).toEqual([18, 3, H * 17 + 3, 18]);
    expect(stat(m, 'ammo').value).toBe(`5/${d.catalog.creatures['peltast']!.stats!.shots}`);
  });
});

describe('retaliations left', () => {
  it('counts one, two and unlimited retaliations as the rules allow, and a suppressed one', () => {
    const d = arena(PIECES, 'hop');
    const b = d.state.battle!;
    expect(retaliationView(d.catalog, b.stacks['hop']!)).toMatchObject({ allowance: 1, left: 1, text: '1/1' });
    b.stacks['hop']!.retaliationsUsed = 1;
    expect(retaliationView(d.catalog, b.stacks['hop']!)).toMatchObject({ left: 0, canRetaliate: false, text: '0/1' });
    expect(retaliationView(d.catalog, b.stacks['gri']!)).toMatchObject({ allowance: 2, left: 2, text: '2/2' });
    b.stacks['gri']!.retaliationsUsed = 1;
    expect(retaliationView(d.catalog, b.stacks['gri']!)).toMatchObject({ left: 1, canRetaliate: true, text: '1/2' });
    b.stacks['wgr']!.retaliationsUsed = 7;
    expect(retaliationView(d.catalog, b.stacks['wgr']!)).toMatchObject({ allowance: 'unlimited', left: 'unlimited', canRetaliate: true, text: 'Unlimited' });
    // Distract: the next retaliation that would happen is suppressed.
    b.stacks['foe']!.statuses = [st({ sourceId: 'ability:distract', label: 'Distract', kind: 'retaliation_suppressed', amount: 1, expiresAtRound: Number.MAX_SAFE_INTEGER, expiresOnActivationOf: 'rr', sourceStackId: 'rr', sourceSide: 'attacker', hostile: true })];
    const sup = retaliationView(d.catalog, b.stacks['foe']!);
    expect(sup).toMatchObject({ allowance: 1, left: 1, suppressed: true, suppressedBy: 'Distract', text: '1/1 (next suppressed)' });
    const m = inspectionModel(d.catalog, d.state, 'foe', 'attacker')!;
    expect(stat(m, 'retaliation')).toMatchObject({ value: '1/1', note: 'next suppressed' });
    expect(stat(m, 'retaliation').breakdown).toContain('Distract: the next retaliation is suppressed');
    expect(stat(inspectionModel(d.catalog, d.state, 'wgr', 'attacker')!, 'retaliation')).toMatchObject({ value: '∞', note: 'unlimited' });
    expect(stat(inspectionModel(d.catalog, d.state, 'gri', 'attacker')!, 'retaliation')).toMatchObject({ value: '1/2', note: 'this round' });
    // A destroyed stack retaliates no more.
    b.stacks['foe']!.totalHp = 0;
    expect(retaliationView(d.catalog, b.stacks['foe']!).text).toBe('—');
  });
});

describe('ammunition', () => {
  it('a shooter shows shots left of its maximum; a non-shooter says it does not apply', () => {
    const d = arena(PIECES, 'hop');
    const b = d.state.battle!;
    const max = d.catalog.creatures['peltast']!.stats!.shots;
    expect(ammunitionView(d.catalog, b.stacks['pel']!)).toEqual({ shooter: true, left: max, max, text: `${max}/${max}`, renews: null });
    expect(ammunitionView(d.catalog, b.stacks['hop']!)).toEqual({ shooter: false, left: 0, max: 0, text: 'Not a shooter', renews: null });
    const m = inspectionModel(d.catalog, d.state, 'hop', 'attacker')!;
    expect(stat(m, 'ammo')).toMatchObject({ value: '—', note: 'not a shooter', base: null });
  });
});

describe('effective values', () => {
  it('a modified Attack shows its base, the change and the parts from attackBreakdown', () => {
    const d = arena(PIECES, 'hop');
    const b = d.state.battle!;
    const hop = b.stacks['hop']!;
    const base = attackBreakdown(d.catalog, b, hop);
    hop.statuses = [st({})];
    const m = inspectionModel(d.catalog, d.state, 'hop', 'attacker')!;
    const a = stat(m, 'attack');
    expect(a.value).toBe(String(base.total + 3));
    expect(a.base).toBe(String(d.catalog.creatures['hoplite']!.stats!.attack));
    expect(a.change).toBe('up');
    expect(a.breakdown).toContain('spells/abilities +3');
    // A curse lowers it, said with a shape and a word (the card's ▼ / "lowered"), not colour alone.
    hop.statuses = [st({ amount: -20, label: 'Weakness', sourceId: 'spell:weakness', hostile: true })];
    const low = stat(inspectionModel(d.catalog, d.state, 'hop', 'attacker')!, 'attack');
    expect(low.change).toBe('down');
    expect(Number(low.value)).toBe(Math.max(0, base.total - 20));
  });

  it('damage per creature follows the damage pipeline: a blessing rolls the highest, a curse the lowest', () => {
    const d = arena(PIECES, 'hop');
    const hop = d.state.battle!.stacks['hop']!;
    const s = d.catalog.creatures['hoplite']!.stats!;
    expect(stat(inspectionModel(d.catalog, d.state, 'hop', null)!, 'damage').value).toBe(s.damageMin === s.damageMax ? String(s.damageMin) : `${s.damageMin}–${s.damageMax}`);
    hop.statuses = [st({ kind: 'max_damage_roll', amount: 0, label: 'Blessing', sourceId: 'spell:blessing' })];
    const blessed = stat(inspectionModel(d.catalog, d.state, 'hop', null)!, 'damage');
    expect(blessed.value).toBe(String(s.damageMax));
    expect(blessed.breakdown).toContain('Blessing: always deals its highest damage');
    hop.statuses = [st({ kind: 'min_damage_roll', amount: 0, label: 'Ill Omen', sourceId: 'spell:ill_omen' })];
    expect(stat(inspectionModel(d.catalog, d.state, 'hop', null)!, 'damage').value).toBe(String(s.damageMin));
  });

  it('a defending stack names the Defense its blows meet; speed shows base and parts', () => {
    const d = arena(PIECES, 'hop');
    const hop = d.state.battle!.stacks['hop']!;
    hop.defending = true;
    hop.statuses = [st({ kind: 'speed_bonus', amount: 2, label: 'Swiftness', sourceId: 'spell:swiftness' })];
    const m = inspectionModel(d.catalog, d.state, 'hop', 'attacker')!;
    expect(stat(m, 'defense').breakdown).toMatch(/defending: blows meet Defense \d+ \(\+20%\)/);
    expect(m.states.some((t) => t.startsWith('Defending'))).toBe(true);
    const sp = stat(m, 'speed');
    expect(sp.value).toBe(String(d.catalog.creatures['hoplite']!.stats!.speed + 2));
    expect(sp.breakdown).toContain('Swiftness +2');
  });
});

describe('effect expiry', () => {
  it('round-based: the rounds left and the round it ends at', () => {
    const d = arena(PIECES, 'hop');
    const b = d.state.battle!;
    expect(effectExpiry(d.catalog, b, b.stacks['hop']!, { expiresAtRound: 5 })).toEqual({ expiry: 'rounds', remaining: '2 rounds left', ends: 'Ends at the start of round 5.' });
    expect(effectExpiry(d.catalog, b, b.stacks['hop']!, { expiresAtRound: 4 }).remaining).toBe('1 round left');
  });

  it('activation-based: until this stack’s or its user’s next activation; a fallen user keeps it to the end', () => {
    const d = arena(PIECES, 'hop');
    const b = d.state.battle!;
    const hop = b.stacks['hop']!;
    const forever = Number.MAX_SAFE_INTEGER;
    expect(effectExpiry(d.catalog, b, hop, { expiresAtRound: forever, expiresOnActivationOf: 'hop' })).toMatchObject({ expiry: 'activation', remaining: 'Until its next activation' });
    expect(effectExpiry(d.catalog, b, hop, { expiresAtRound: forever, expiresOnActivationOf: 'rr' })).toMatchObject({ expiry: 'activation', remaining: 'Until the Root-Runners’ next activation' });
    b.stacks['rr']!.totalHp = 0;
    expect(effectExpiry(d.catalog, b, hop, { expiresAtRound: forever, expiresOnActivationOf: 'rr' })).toMatchObject({ expiry: 'battle', remaining: 'Until the battle ends' });
    expect(effectExpiry(d.catalog, b, hop, { expiresAtRound: forever })).toMatchObject({ expiry: 'battle' });
  });
});

describe('effect sources', () => {
  it('names the recorded hero, commander, stack or miracle, and says unknown otherwise', () => {
    const d = arena(PIECES, 'hop');
    const b = d.state.battle!;
    const heroId = b.sides.attacker.commander!.heroId!;
    const heroName = b.sides.attacker.commander!.name;
    expect(effectSource(d.catalog, d.state, b, st({ sourceHeroId: heroId, sourceSide: 'attacker' }))).toEqual({ kind: 'hero', text: `${heroName} (attacker commander)`, stackId: null });
    expect(effectSource(d.catalog, d.state, b, st({ sourceStackId: 'rr', sourceSide: 'attacker' }))).toEqual({ kind: 'stack', text: '12 Root-Runners (attacker)', stackId: 'rr' });
    // A commander without a hero (a guard captain) cast it: its side's commander, by the recorded side.
    b.sides.defender.commander = { ...b.sides.attacker.commander!, heroId: null, name: 'Doros' };
    expect(effectSource(d.catalog, d.state, b, st({ sourceSide: 'defender' }))).toMatchObject({ kind: 'commander', text: 'Doros (defender commander)' });
    const playerName = d.state.players[b.sides.attacker.playerId!]!.name;
    expect(effectSource(d.catalog, d.state, b, st({ sourceId: 'intervention:shield_of_the_gods', sourceSide: 'attacker' }))).toEqual({ kind: 'miracle', text: `Divine intervention of ${playerName} (attacker)`, stackId: null });
    // Nothing recorded (an older save, a battle set up with it): unknown — never guessed from the label.
    expect(effectSource(d.catalog, d.state, b, st({ label: `${heroName}’s Warcry` }))).toEqual({ kind: 'unknown', text: 'Unknown', stackId: null });
    // A hero who commands neither side is never named.
    expect(effectSource(d.catalog, d.state, b, st({ sourceHeroId: 'someone_else' })).kind).toBe('unknown');
    // A fallen source stack is named without a board highlight.
    b.stacks['rr']!.totalHp = 0;
    expect(effectSource(d.catalog, d.state, b, st({ sourceStackId: 'rr', sourceSide: 'attacker' }))).toEqual({ kind: 'stack', text: 'Root-Runners (attacker, fallen)', stackId: null });
  });

  it('lists effects with icon, what they do, expiry and source in application order', () => {
    const d = arena(PIECES, 'hop');
    const b = d.state.battle!;
    b.stacks['foe']!.statuses = [
      st({ sourceId: 'ability:distract', label: 'Distract', kind: 'retaliation_suppressed', amount: 1, expiresAtRound: Number.MAX_SAFE_INTEGER, expiresOnActivationOf: 'rr', sourceStackId: 'rr', sourceSide: 'attacker', hostile: true, seq: 2 }),
      st({ sourceId: 'spell:sapping_touch', label: 'Sapping Touch', kind: 'attack_bonus', amount: -3, expiresAtRound: 4, sourceHeroId: b.sides.attacker.commander!.heroId!, sourceSide: 'attacker', hostile: true, seq: 1 }),
    ];
    const m = inspectionModel(d.catalog, d.state, 'foe', 'attacker')!;
    expect(m.allegiance).toBe('enemy');
    expect(m.effects.map((e) => [e.label, e.effect, e.remaining, e.source.kind, e.hostile])).toEqual([
      ['Sapping Touch', 'Attack −3', '1 round left', 'hero', true],
      ['Distract', 'its next retaliation is suppressed', 'Until the Root-Runners’ next activation', 'stack', true],
    ]);
    expect(m.effects.every((e) => !!e.icon)).toBe(true);
  });
});

describe('read-only', () => {
  it('building the card changes nothing and draws no random number', () => {
    const d = arena(PIECES, 'hop');
    const b = d.state.battle!;
    b.stacks['hop']!.statuses = [st({ sourceHeroId: b.sides.attacker.commander!.heroId!, sourceSide: 'attacker' })];
    const before = canonicalStateHash(d.state);
    const rng = JSON.stringify(d.state.rng);
    for (const id of Object.keys(b.stacks)) inspectionModel(d.catalog, d.state, id, 'attacker');
    expect(canonicalStateHash(d.state)).toBe(before);
    expect(JSON.stringify(d.state.rng)).toBe(rng);
    expect(d.state.battle!.activeStackId).toBe('hop');
  });

  it('steps through the living stacks in the turn order shown', () => {
    const d = arena(PIECES, 'hop');
    const b = d.state.battle!;
    b.stacks['gri']!.totalHp = 0;
    const order = inspectableOrder({ current: ['hop', 'pel', 'gri'], next: ['foe', 'hop'] }, b);
    expect(order.slice(0, 3)).toEqual(['hop', 'pel', 'foe']);
    expect(order).not.toContain('gri');
    expect(new Set(order).size).toBe(order.length);
    expect(order.sort()).toEqual(['foe', 'hop', 'pel', 'rr', 'wgr']);
  });
});
