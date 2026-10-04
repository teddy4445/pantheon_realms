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
    [4, 'large'],
    [5, 'large'],
    [6, 'large'],
    [6, 'huge'],
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
    for (const n of [2, 3, 4, 5, 6]) {
      const g = createRandomSkirmish(catalog, opts(n, n >= 4 ? 'large' : 'small', 5150 + n));
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

  it('refuses four or more empires on small and medium maps, fewer than two and more than six', () => {
    expect(() => createRandomSkirmish(catalog, opts(4, 'small', 1))).toThrow(/large or huge/);
    expect(() => createRandomSkirmish(catalog, opts(4, 'medium', 1))).toThrow(/large or huge/);
    expect(() => createRandomSkirmish(catalog, opts(5, 'medium', 1))).toThrow(/large or huge/);
    expect(() => createRandomSkirmish(catalog, { ...opts(2, 'small', 1), seats: seats(['greek']) })).toThrow(/2 to 6/);
    expect(() => createRandomSkirmish(catalog, { ...opts(6, 'huge', 1), seats: seats(['greek', 'norse', 'egyptian', 'japanese', 'celtic', 'mesoamerican', 'greek']) })).toThrow(/2 to 6/);
  });

  it('every size is square: as many rows as hexes per row, void outside the square, mountain wilds in its corners, no sea', () => {
    for (const size of ['small', 'medium', 'large', 'huge'] as const) {
      const g = createRandomSkirmish(catalog, opts(2, size, 7));
      const { width: w, height: h, terrain } = g.map;
      const rows = Array.from({ length: h }, (_, r) => terrain.slice(r * w, (r + 1) * w).replace(/v/g, ''));
      // Every row has 2·Rh+1 hexes (rows an odd number of rows from the centre, staggered, 2·Rh+2), and there are 2·Rh+1 rows.
      const mid = (h - 1) / 2;
      for (const [r, row] of rows.entries()) expect(row.length, `${size} row ${r}`).toBe((r - mid) % 2 === 0 ? h : h + 1);
      // Each row's own cells are contiguous (the square), with void only on either side.
      for (let r = 0; r < h; r++) expect(terrain.slice(r * w, (r + 1) * w)).toMatch(/^v*[^v]+v*$/);
      expect(terrain).toContain('v');
      expect(terrain).not.toContain('w'); // continental: no water at all, and none around the map
      const center = { q: (w - 1) / 2, r: (h - 1) / 2 };
      const Rh = (h - 1) / 2;
      for (let r = 0; r < h; r++)
        for (let q = 0; q < w; q++) {
          const code = terrain[r * w + q]!;
          if (code !== 'v' && axialDistance({ q, r }, center) > Rh) expect(code, `${size} corner ${q},${r}`).toBe('m');
        }
    }
  });

  it('five empires share the six-fold layout: five identical regions and one wild region with no sites', () => {
    const g = createRandomSkirmish(catalog, opts(5, 'large', 31));
    const towns = g.mission.sites.filter((s) => s.kind.type === 'town');
    expect(towns).toHaveLength(5);
    const counts = Array.from({ length: 5 }, (_, i) => g.mission.sites.filter((s) => s.id.endsWith(`_${i + 1}`) && s.kind.type !== 'town').length);
    expect(new Set(counts).size).toBe(1);
    // The wild sixth region holds only the portals that lead into it (every portal keeps its twin).
    expect(g.mission.sites.filter((s) => s.id.endsWith('_6')).every((s) => s.kind.type === 'portal')).toBe(true);
    expect(g.mission.rivals).toHaveLength(4);
    expect(new Set([g.mission.player.playerId, ...(g.mission.rivals ?? []).map((r) => r.color)]).size).toBe(5);
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

describe('generator 0.3: portals, roads to the center, neutral creatures', () => {
  const portalsOf = (g: ReturnType<typeof createRandomSkirmish>) => g.mission.sites.filter((s) => s.kind.type === 'portal');
  const exitOf = (s: { kind: unknown }) => (s.kind as { exitSiteId: string }).exitSiteId;

  it('two-way portals come in twin pairs, the same for every empire, each leading to another empire’s lands', () => {
    for (const [n, size, perEmpire] of [
      [2, 'small', 1],
      [3, 'medium', 2],
      [4, 'large', 1],
      [5, 'large', 2],
      [6, 'large', 2],
    ] as const) {
      for (const seed of [3, 17, 404]) {
        const g = createRandomSkirmish(catalog, opts(n, size, seed));
        const portals = portalsOf(g);
        // Five empires: the wild sixth region has its two portals as well.
        expect(portals.length, `${n} empires seed ${seed}`).toBe((n === 5 ? 6 : n) * perEmpire);
        for (const p of portals) {
          const exit = portals.find((x) => x.id === exitOf(p))!;
          expect(exit).toBeDefined();
          expect(exitOf(exit)).toBe(p.id);
          expect(exit.id.match(/_(\d+)$/)![1]).not.toBe(p.id.match(/_(\d+)$/)![1]);
        }
        // Symmetric: every empire's portal is the same distance from its town.
        const towns = g.mission.sites.filter((s) => s.kind.type === 'town');
        const d = towns.map((t, i) => portals.filter((p) => p.id.endsWith(`_${i + 1}`)).map((p) => axialDistance(p.coord, t.coord)).sort().join(','));
        expect(new Set(d).size).toBe(1);
        for (const c of g.checks) expect(c.pass, `${c.id}: ${c.detail}`).toBe(true);
        expect(validateGeneratedMission(catalog, g.mission).issues).toEqual([]);
      }
    }
    expect(portalsOf(createRandomSkirmish(catalog, opts(2, 'small', 3, { portals: false })))).toEqual([]);
  });

  it('full roads lead from every town to the contested center; sparse roads do not', () => {
    for (const n of [2, 3]) {
      const full = createRandomSkirmish(catalog, opts(n, 'medium', 52));
      const center = full.mission.sites.find((s) => s.id === 'center_gold')!.coord;
      const touches = (g: typeof full) => g.map.roads.filter((e) => e.split('|').some((k) => k === `${center.q},${center.r}`)).length;
      expect(touches(full)).toBeGreaterThanOrEqual(n);
      expect(touches(createRandomSkirmish(catalog, opts(n, 'medium', 52, { roads: 'sparse' })))).toBe(0);
    }
  });

  it('guards, camps and wandering monsters mix neutral creatures with pantheon creatures', () => {
    const ids = new Set<string>();
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const g = createRandomSkirmish(catalog, opts(2, 'medium', seed, { monsters: 'many' }));
      for (const s of g.mission.sites) {
        for (const a of s.guard?.army ?? []) ids.add(a.creatureId);
        if (s.kind.type === 'creature_camp') ids.add(s.kind.creatureId);
      }
      for (const h of g.mission.hostileHeroes) for (const a of h.army) ids.add(a.creatureId);
    }
    const neutral = [...ids].filter((id) => catalog.creatures[id]!.pantheonId === null);
    const roster = [...ids].filter((id) => catalog.creatures[id]!.pantheonId !== null);
    expect(neutral.length).toBeGreaterThanOrEqual(4);
    expect(roster.length).toBeGreaterThanOrEqual(4);
  });

  it('a hero who stops on a portal steps out of its twin; a hero on the twin blocks it', () => {
    const g = createRandomSkirmish(catalog, opts(2, 'small', 3, { monsters: 'none' }));
    const { match } = createGeneratedMatch(catalog, g, { matchId: 'test:portal' });
    const entry = g.mission.sites.find((s) => s.id === 'portal_1')!;
    const exit = g.mission.sites.find((s) => s.id === exitOf(entry))!;
    let st = structuredClone(match);
    const hero = Object.values(st.heroes).find((h) => h.ownerId === 'player' && h.status === 'active')!;
    // Stand next to the portal with a full day of movement.
    const next = [
      { q: entry.coord.q + 1, r: entry.coord.r },
      { q: entry.coord.q - 1, r: entry.coord.r },
      { q: entry.coord.q, r: entry.coord.r + 1 },
      { q: entry.coord.q, r: entry.coord.r - 1 },
    ].find((c) => !g.mission.sites.some((s) => s.coord.q === c.q && s.coord.r === c.r) && 'mw'.indexOf(g.map.terrain[c.r * g.map.width + c.q]!) < 0)!;
    hero.position = next;
    hero.movementPoints = 1000;
    const idx = (c: HexCoord) => c.r * g.map.width + c.q;
    st.fog.player!.explored[idx(next)] = 1;
    st.fog.player!.explored[idx(entry.coord)] = 1;
    expect(st.fog.player!.explored[idx(exit.coord)]).toBe(0);
    let n = 0;
    const run = (cmd: Record<string, unknown>) => processCommand({ catalog }, st, { ...cmd, commandId: `p${(n += 1)}`, expectedRevision: st.revision, actorPlayerId: 'player' } as GameCommand);
    let res = run({ kind: 'MoveHero', heroId: hero.id, destination: entry.coord });
    expect(res.ok ? '' : res.rejection.message).toBe('');
    if (!res.ok) return;
    st = res.state;
    expect(st.heroes[hero.id]!.position).toEqual(exit.coord);
    expect(res.events.some((e) => e.kind === 'HeroTeleported' && e.viaSiteId === entry.id)).toBe(true);
    expect(st.world.sites[exit.id]!.visitedBy).toContain('player');
    expect(st.fog.player!.explored[idx(exit.coord)]).toBe(1);
    // Back through: blocked while a rival hero stands on the far side.
    const rival = Object.values(st.heroes).find((h) => h.ownerId === 'p2' && h.status === 'active')!;
    rival.position = { ...entry.coord };
    const off = [
      { q: exit.coord.q + 1, r: exit.coord.r },
      { q: exit.coord.q - 1, r: exit.coord.r },
      { q: exit.coord.q, r: exit.coord.r + 1 },
      { q: exit.coord.q, r: exit.coord.r - 1 },
    ].find((c) => !g.mission.sites.some((s) => s.coord.q === c.q && s.coord.r === c.r) && 'mw'.indexOf(g.map.terrain[c.r * g.map.width + c.q]!) < 0)!;
    st.heroes[hero.id]!.position = off;
    st.heroes[hero.id]!.movementPoints = 1000;
    res = run({ kind: 'MoveHero', heroId: hero.id, destination: exit.coord });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.state.heroes[hero.id]!.position).toEqual(exit.coord);
    expect(res.events.some((e) => e.kind === 'PortalBlocked')).toBe(true);
  });
});

describe('rotating turn order (three or more empires)', () => {
  const firstOfEachDay = (turnOrder?: 'fixed' | 'rotating') => {
    const g = createRandomSkirmish(catalog, opts(3, 'small', 77, { monsters: 'none', ...(turnOrder ? { turnOrder } : {}) }));
    const { match } = createGeneratedMatch(catalog, g, { matchId: `test:order-${turnOrder ?? 'default'}` });
    let st = match;
    const firsts: string[] = [st.activePlayerId];
    let n = 0;
    while (firsts.length < 5) {
      const day = st.day;
      const res = processCommand({ catalog }, st, { kind: 'EndTurn', commandId: `o${(n += 1)}`, expectedRevision: st.revision, actorPlayerId: st.activePlayerId } as GameCommand);
      if (!res.ok) throw new Error(res.rejection.message);
      st = res.state;
      if (st.day !== day) firsts.push(st.activePlayerId);
    }
    return { mission: g.mission, firsts };
  };

  it('is the default with three empires: the day’s first empire moves last the next day', () => {
    const { mission, firsts } = firstOfEachDay();
    expect(mission.turnOrder).toBe('rotating');
    expect(firsts).toEqual(['player', 'p2', 'p3', 'player', 'p2']);
  });

  it('can be fixed; two empires keep a fixed order', () => {
    expect(firstOfEachDay('fixed').firsts).toEqual(['player', 'player', 'player', 'player', 'player']);
    expect(createRandomSkirmish(catalog, opts(2, 'small', 77)).mission.turnOrder).toBe('fixed');
  });
});

describe('random skirmish matches', () => {
  it('an all-AI three-empire match is played to a single winner, with statistics every day', () => {
    const g = createRandomSkirmish(catalog, opts(3, 'small', 2024));
    const { match } = createGeneratedMatch(catalog, g, { matchId: 'test:random3' });
    expect(match.customMission?.id).toBe(g.mission.id);
    expect(match.scenario.features).toEqual({ expandedContent: true, weeklyEvents: true, interventions: true, heroSpecialties: true, neutralReactions: true });
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
