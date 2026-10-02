/**
 * Random skirmish maps (proposed this build): generator fairness, determinism,
 * validation, AI-only matches to a winner, and hot-seat seat setup.
 */
import { describe, expect, it } from 'vitest';
import { buildCatalog, validateGeneratedMission } from '@pr/content';
import { runAITurn } from '@pr/ai';
import { axialDistance, contenderIds, ensureStats, matchScore, processCommand, type GameCommand, type HexCoord, type MatchState } from '@pr/rules';
import { createGeneratedMatch, createRandomSkirmish, SKIRMISH_MAP_TYPES, type SkirmishGenOptions, type SkirmishMapSize } from '../src';

const catalog = buildCatalog();

const seats = (pantheons: string[], controller: 'ai' | 'human' = 'ai') => pantheons.map((pantheonId) => ({ pantheonId, controller }));

function opts(n: number, size: SkirmishMapSize, seed: number, extra: Partial<SkirmishGenOptions> = {}): SkirmishGenOptions {
  const pool = ['greek', 'norse', 'egyptian', 'japanese', 'celtic', 'mesoamerican'];
  return { seed, size, seats: seats(pool.slice(0, n)), victory: { type: 'elimination' }, monsters: 'few', ...extra };
}

/** Play an all-AI match until it ends (or the day cap). */
function playOut(state: MatchState, maxDays = 60): MatchState {
  let s = state;
  for (let guard = 0; guard < maxDays * 8 && s.outcome.status === 'running' && s.day <= maxDays; guard++) {
    s = runAITurn(catalog, s, { maxCommands: 300 });
  }
  return s;
}

describe('random skirmish generator', () => {
  for (const [n, size] of [
    [2, 'small'],
    [2, 'large'],
    [3, 'small'],
    [3, 'medium'],
    [4, 'medium'],
    [4, 'large'],
  ] as const) {
    it(`${n} empires on a ${size} map: every fairness check passes and the mission validates`, () => {
      for (const seed of [1, 42, 90210]) {
        const g = createRandomSkirmish(catalog, opts(n, size, seed));
        expect(g.checks.length).toBeGreaterThanOrEqual(5);
        for (const c of g.checks) expect(c.pass, `${c.id}: ${c.detail}`).toBe(true);
        const report = validateGeneratedMission(catalog, g.mission);
        expect(report.issues).toEqual([]);
        expect((g.mission.rivals ?? []).length).toBe(n - 1);
      }
    });
  }

  it('is deterministic: the same options give the same map; another seed gives another map', () => {
    const a = createRandomSkirmish(catalog, opts(3, 'medium', 777));
    const b = createRandomSkirmish(catalog, opts(3, 'medium', 777));
    const c = createRandomSkirmish(catalog, opts(3, 'medium', 778));
    expect(JSON.stringify(a.map)).toBe(JSON.stringify(b.map));
    expect(JSON.stringify(a.mission)).toBe(JSON.stringify(b.mission));
    expect(a.map.terrain).not.toBe(c.map.terrain);
  });

  it('gives every empire the same distances from its town to the center and the same kinds of sites', () => {
    for (const n of [2, 3, 4]) {
      const g = createRandomSkirmish(catalog, opts(n, n === 4 ? 'medium' : 'small', 5150 + n));
      const center: HexCoord = { q: (g.map.width - 1) / 2, r: (g.map.height - 1) / 2 };
      const towns = g.mission.sites.filter((s) => s.kind.type === 'town');
      expect(towns.length).toBe(n);
      const d = towns.map((t) => axialDistance(t.coord, center));
      expect(new Set(d).size).toBe(1);
      // Region sites are suffixed with the empire number (1…n) and come in equal numbers.
      const counts = Array.from({ length: n }, (_, i) => g.mission.sites.filter((s) => s.id.endsWith(`_${i + 1}`) && s.kind.type !== 'town').length);
      expect(new Set(counts).size).toBe(1);
      expect(counts[0]).toBeGreaterThan(5);
    }
  });

  it('places camps, events and monsters; "none" places no monsters', () => {
    const g = createRandomSkirmish(catalog, opts(2, 'medium', 31, { monsters: 'many' }));
    expect(g.mission.sites.some((s) => s.kind.type === 'creature_camp')).toBe(true);
    expect(g.mission.sites.some((s) => s.kind.type === 'map_event')).toBe(true);
    expect(g.mission.hostileHeroes.length).toBe(4);
    const none = createRandomSkirmish(catalog, opts(2, 'medium', 31, { monsters: 'none' }));
    expect(none.mission.hostileHeroes.length).toBe(0);
    expect(none.mission.hostilePlayer).toBeUndefined();
  });

  it('a hold-the-relic map has the relic shrine at the center and the hold_site victory', () => {
    const g = createRandomSkirmish(catalog, opts(3, 'medium', 12, { victory: { type: 'hold_relic', days: 5 } }));
    const relic = g.mission.sites.find((s) => s.kind.type === 'relic');
    expect(relic).toBeDefined();
    expect(g.mission.victoryCondition).toEqual({ type: 'hold_site', siteId: relic!.id, days: 5 });
  });

  it('refuses four empires on a small map and fewer than two empires', () => {
    expect(() => createRandomSkirmish(catalog, opts(4, 'small', 1))).toThrow(/medium or large/);
    expect(() => createRandomSkirmish(catalog, { ...opts(2, 'small', 1), seats: seats(['greek']) })).toThrow(/2 to 4/);
  });
});

describe('random map types and settings (generator 0.2)', () => {
  const armyTotal = (g: ReturnType<typeof createRandomSkirmish>) =>
    g.mission.sites.reduce((n, site) => n + (site.guard?.army.reduce((m, a) => m + a.count, 0) ?? 0), 0);

  for (const t of SKIRMISH_MAP_TYPES) {
    it(`${t.label}: fair, valid maps for two, three and four empires`, () => {
      for (const [n, size, seed] of [
        [2, 'small', 3],
        [3, 'medium', 11],
        [4, 'large', 29],
      ] as const) {
        const g = createRandomSkirmish(catalog, opts(n, size, seed, { mapType: t.id }));
        for (const c of g.checks) expect(c.pass, `${t.id} ${n}/${size}: ${c.id}: ${c.detail}`).toBe(true);
        expect(validateGeneratedMission(catalog, g.mission).issues).toEqual([]);
        expect(g.mission.sites.filter((s) => s.kind.type === 'town')).toHaveLength(n);
      }
    });
  }

  it('highlands and crossroads keep the center behind guarded openings (SKM-6)', () => {
    for (const mapType of ['highlands', 'crossroads'] as const) {
      const g = createRandomSkirmish(catalog, opts(2, 'medium', 8, { mapType }));
      const skm6 = g.checks.find((c) => c.id === 'SKM-6');
      expect(skm6?.pass, skm6?.detail).toBe(true);
      expect(g.mission.sites.some((s) => s.kind.type === 'crossing' && !!s.guard)).toBe(true);
    }
  });

  it('guard strength scales every guard; treasure changes the sites; wealth scales the wallets', () => {
    const base = { mapType: 'continental' as const };
    const weak = armyTotal(createRandomSkirmish(catalog, opts(2, 'medium', 77, { ...base, guards: 'weak' })));
    const normal = armyTotal(createRandomSkirmish(catalog, opts(2, 'medium', 77, base)));
    const strong = armyTotal(createRandomSkirmish(catalog, opts(2, 'medium', 77, { ...base, guards: 'strong' })));
    expect(weak).toBeLessThan(normal);
    expect(strong).toBeGreaterThan(normal);

    const keys = (o: Partial<SkirmishGenOptions>) => new Set(createRandomSkirmish(catalog, opts(2, 'medium', 77, o)).mission.sites.map((s) => s.id.replace(/_\d+$/, '')));
    const scarce = keys({ treasure: 'scarce' });
    const rich = keys({ treasure: 'rich' });
    expect(scarce.has('trinket')).toBe(false);
    expect(keys({}).has('trinket')).toBe(true);
    expect(rich.has('vault')).toBe(true);
    expect(rich.has('gold_small')).toBe(true);

    const gold = (w: 'low' | 'normal' | 'high') => createRandomSkirmish(catalog, opts(2, 'small', 5, { startWealth: w })).mission.player.wallet.gold ?? 0;
    expect(gold('low')).toBe(gold('normal') / 2);
    expect(gold('high')).toBe(gold('normal') * 2);
  });

  it('sparse roads carve fewer roads; a revealed map starts explored; settings change the map id', () => {
    const full = createRandomSkirmish(catalog, opts(2, 'medium', 61));
    const sparse = createRandomSkirmish(catalog, opts(2, 'medium', 61, { roads: 'sparse' }));
    expect(sparse.map.roads.length).toBeLessThan(full.map.roads.length);
    expect(sparse.mission.id).not.toBe(full.mission.id);

    const shown = createRandomSkirmish(catalog, opts(2, 'small', 61, { revealMap: true }));
    expect(shown.mission.startExplored).toBe(true);
    const { match } = createGeneratedMatch(catalog, shown, { matchId: 'test:revealed' });
    expect(match.fog.player!.explored.every((x) => x === 1)).toBe(true);
    const hidden = createGeneratedMatch(catalog, full, { matchId: 'test:hidden' }).match;
    expect(hidden.fog.player!.explored.some((x) => x === 0)).toBe(true);
  });

  it('huge maps take four empires and stay deterministic per setting', () => {
    const o = opts(4, 'huge', 123, { mapType: 'wild_forest', guards: 'strong', treasure: 'rich' });
    const a = createRandomSkirmish(catalog, o);
    const b = createRandomSkirmish(catalog, o);
    expect(JSON.stringify(a.map)).toBe(JSON.stringify(b.map));
    expect(JSON.stringify(a.mission)).toBe(JSON.stringify(b.mission));
    for (const c of a.checks) expect(c.pass, `${c.id}: ${c.detail}`).toBe(true);
  });
});

describe('random skirmish matches', () => {
  it('an all-AI three-empire match is played to a single winner, with statistics every day', () => {
    const g = createRandomSkirmish(catalog, opts(3, 'small', 2024));
    const { match } = createGeneratedMatch(catalog, g, { matchId: 'test:random3' });
    expect(match.customMission?.id).toBe(g.mission.id);
    expect(match.scenario.features).toEqual({ expandedContent: true, weeklyEvents: true, interventions: true });
    const end = playOut(match);
    expect(end.outcome.status).not.toBe('running');
    expect(end.outcome.winnerIds?.length).toBe(1);
    const winner = end.outcome.winnerIds![0]!;
    expect(contenderIds(end)).toContain(winner);
    const stats = ensureStats(end);
    expect(stats.timeline.length).toBeGreaterThanOrEqual(Math.min(end.day, 2));
    expect(stats.timeline[0]!.day).toBe(1);
    expect(matchScore(catalog, end, winner).lines[0]!.points).toBe(2000);
  }, 120_000);

  it('holding the relic shrine at enough dawns wins the match', () => {
    const g = createRandomSkirmish(catalog, opts(2, 'small', 4040, { victory: { type: 'hold_relic', days: 3 }, monsters: 'none' }));
    const { match } = createGeneratedMatch(catalog, g, { matchId: 'test:relic' });
    const relic = g.mission.sites.find((x) => x.kind.type === 'relic')!;
    // Hand the shrine to the second empire, then only end turns.
    let st = structuredClone(match);
    st.world.sites[relic.id]!.owner = 'p2';
    st.world.sites[relic.id]!.cleared = true;
    st.world.sites[relic.id]!.heldDays = 0;
    let n = 0;
    for (let i = 0; i < 20 && st.outcome.status === 'running'; i++) {
      const res = processCommand({ catalog }, st, { kind: 'EndTurn', commandId: `e${(n += 1)}`, expectedRevision: st.revision, actorPlayerId: st.activePlayerId } as GameCommand);
      if (!res.ok) throw new Error(res.rejection.message);
      st = res.state;
    }
    expect(st.outcome.status).not.toBe('running');
    expect(st.outcome.winnerIds).toEqual(['p2']);
    expect(st.outcome.reason).toMatch(/held .* for 3 days/);
    expect(st.day).toBe(4);
  });

  it('hot-seat: seats can be people, each with a name and a patron; AI seats keep no patron', () => {
    const g = createRandomSkirmish(catalog, {
      seed: 9,
      size: 'small',
      seats: [
        { pantheonId: 'greek', controller: 'human' },
        { pantheonId: 'norse', controller: 'human' },
        { pantheonId: 'celtic', controller: 'ai' },
      ],
      victory: { type: 'elimination' },
      monsters: 'none',
    });
    const { match } = createGeneratedMatch(catalog, g, {
      matchId: 'test:hotseat',
      startingGodId: 'zeus',
      playerNames: { player: 'Ann', p2: 'Bo' },
      patronGodIds: { p2: 'norse_odin', p3: 'celtic_dagda' },
    });
    expect(match.players.player).toMatchObject({ controller: 'human', name: 'Ann' });
    expect(match.players.player!.pantheon.patronGodId).toBe('zeus');
    expect(match.players.p2).toMatchObject({ controller: 'human', name: 'Bo' });
    expect(match.players.p2!.pantheon.patronGodId).toBe('norse_odin');
    expect(match.players.p3!.controller).toBe('ai');
    expect(match.players.p3!.pantheon.patronGodId).toBeNull();
  });
});
