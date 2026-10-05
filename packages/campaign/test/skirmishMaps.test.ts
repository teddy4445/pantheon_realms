/**
 * The six authored skirmish maps (2026-10-05): every map validates, compiles to
 * an ordinary generated mission for any pantheons, keeps its promises (key gates
 * shut the Frostgate pass, prisons hold heroes of the right people, quest huts
 * name real guards) and survives the first days of an all-AI game.
 */
import { describe, expect, it } from 'vitest';
import { buildCatalog, validateGeneratedMission } from '@pr/content';
import { runAITurn } from '@pr/ai';
import { quoteMovement, townGate, type MatchState } from '@pr/rules';
import { compileSkirmishMap, createGeneratedMatch, parseCustomMap, serializeCustomMap, validateCustomMap, type SkirmishMapSeat } from '../src';

const catalog = buildCatalog();
const maps = Object.values(catalog.skirmishMaps ?? {}).sort((a, b) => a.order - b.order);
const PANTHEONS = ['greek', 'norse', 'egyptian', 'japanese', 'celtic', 'mesoamerican'];

function seats(n: number, offset = 0, controller: 'human' | 'ai' = 'ai'): SkirmishMapSeat[] {
  return Array.from({ length: n }, (_, i) => ({ pantheonId: PANTHEONS[(i + offset) % PANTHEONS.length]!, controller }));
}

describe('authored skirmish maps', () => {
  it('six maps for 2, 4, 3, 2, 2 and 6 empires, in order', () => {
    expect(maps.map((m) => [m.id, m.map.players.length])).toEqual([
      ['frostgate', 2],
      ['burning_oasis', 4],
      ['circle_of_gates', 3],
      ['barrows', 2],
      ['golden_fords', 2],
      ['six_thrones', 6],
    ]);
  });

  for (const m of maps) {
    it(`${m.name}: validates, round-trips as a map file and compiles for every pantheon in every seat`, () => {
      expect(validateCustomMap(catalog, m.map).filter((i) => i.severity === 'error')).toEqual([]);
      const back = parseCustomMap(serializeCustomMap(m.map));
      expect(back.ok && back.doc).toEqual(m.map);
      const n = m.map.players.length;
      for (let offset = 0; offset < PANTHEONS.length; offset++) {
        const compiled = compileSkirmishMap(catalog, m.id, seats(n, offset));
        expect(validateGeneratedMission(catalog, compiled.mission).issues, `${m.id} offset ${offset}`).toEqual([]);
        expect(compiled.mission.thumbnailAssetId).toBe(m.thumbnailAssetId);
        expect(compiled.mission.scenarioId).toBe(`skirmish_map_${m.id}`);
        expect(compiled.mission.sites.filter((s) => s.kind.type === 'town')).toHaveLength(n);
        expect([compiled.mission.player.pantheonId, ...(compiled.mission.rivals ?? []).map((r) => r.pantheonId)]).toEqual(seats(n, offset).map((s) => s.pantheonId));
      }
    });
  }

  it('refuses a seat count other than the map’s', () => {
    expect(() => compileSkirmishMap(catalog, 'frostgate', seats(3))).toThrow(/2 empires/);
    expect(() => compileSkirmishMap(catalog, 'no_such_map', seats(2))).toThrow();
  });

  it('Frostgate: the pass is shut until an empire holds the crimson key', () => {
    const start = createGeneratedMatch(catalog, compileSkirmishMap(catalog, 'frostgate', seats(2)), { matchId: 'frostgate-keys' }).match;
    // The whole map known (routes never use unexplored tiles).
    const match: MatchState = { ...start, fog: Object.fromEntries(Object.entries(start.fog).map(([k, f]) => [k, { ...f, explored: f.explored.map(() => 1) }])) as MatchState['fog'] };
    const hero = Object.values(match.heroes).find((h) => h.ownerId === 'player' && h.status === 'active')!;
    const rivalTown = Object.values(match.towns).find((t) => t.ownerId && t.ownerId !== 'player')!;
    const dest = townGate(catalog, match, rivalTown.id);
    expect(quoteMovement(catalog, match, hero.id, dest).reachable).toBe(false);
    const keyed: MatchState = { ...match, players: { ...match.players, player: { ...match.players.player!, keys: ['crimson'] } } };
    expect(quoteMovement(catalog, keyed, hero.id, dest).reachable).toBe(true);
  });

  it('Barrows: each empire’s near barrow holds a hireable hero of its own pantheon; quest huts name real guards', () => {
    const compiled = compileSkirmishMap(catalog, 'barrows', [
      { pantheonId: 'celtic', controller: 'ai' },
      { pantheonId: 'egyptian', controller: 'ai' },
    ]);
    const prison = (id: string) => compiled.mission.sites.find((s) => s.id === id)!.kind;
    const p1 = prison('barrow_1');
    const p2 = prison('barrow_2');
    expect(p1.type === 'prison' && catalog.heroes[p1.heroDefinitionId]?.pantheonId).toBe('celtic');
    expect(p2.type === 'prison' && catalog.heroes[p2.heroDefinitionId]?.pantheonId).toBe('egyptian');
    const leaders = [compiled.mission.player.hero.definitionId, ...(compiled.mission.rivals ?? []).map((r) => r.hero.definitionId)];
    for (const k of [p1, p2]) if (k.type === 'prison') expect(leaders).not.toContain(k.heroDefinitionId);
    for (const s of compiled.mission.sites) {
      if (s.kind.type !== 'quest_hut' || s.kind.quest.type !== 'defeat') continue;
      const target = s.kind.quest.siteId;
      expect(compiled.mission.sites.find((x) => x.id === target)?.guard, `${s.id} → ${target}`).toBeTruthy();
    }
    // Amber for empire 1, violet for empire 2: each colour has its tent and its gate.
    for (const color of ['amber', 'violet']) {
      expect(compiled.mission.sites.filter((s) => s.kind.type === 'key_tent' && s.kind.color === color)).toHaveLength(1);
      expect(compiled.mission.sites.filter((s) => s.kind.type === 'key_gate' && s.kind.color === color)).toHaveLength(1);
    }
  });

  it('The Circle of Gates: each home portal leads behind the next empire’s town, each back portal to the previous home', () => {
    const compiled = compileSkirmishMap(catalog, 'circle_of_gates', seats(3));
    const exit = (id: string) => {
      const k = compiled.mission.sites.find((s) => s.id === id)!.kind;
      return k.type === 'portal' ? k.exitSiteId : null;
    };
    expect([exit('home_portal_1'), exit('home_portal_2'), exit('home_portal_3')]).toEqual(['back_portal_2', 'back_portal_3', 'back_portal_1']);
    expect([exit('back_portal_1'), exit('back_portal_2'), exit('back_portal_3')]).toEqual(['home_portal_3', 'home_portal_1', 'home_portal_2']);
  });

  it('hold-the-shrine maps hold for 7 (Burning Oasis) and 10 days (Six Thrones)', () => {
    expect(compileSkirmishMap(catalog, 'burning_oasis', seats(4)).mission.victoryCondition).toEqual({ type: 'hold_site', siteId: 'relic', days: 7 });
    expect(compileSkirmishMap(catalog, 'six_thrones', seats(6)).mission.victoryCondition).toEqual({ type: 'hold_site', siteId: 'relic', days: 10 });
    expect(compileSkirmishMap(catalog, 'golden_fords', seats(2)).mission.startExplored).toBe(true);
  });

  for (const m of maps) {
    it(`${m.name}: an all-AI game plays its first days`, () => {
      const { match } = createGeneratedMatch(catalog, compileSkirmishMap(catalog, m.id, seats(m.map.players.length, 1)), { matchId: `smoke-${m.id}` });
      let s = match;
      const days = m.map.players.length >= 4 ? 3 : 5;
      for (let i = 0; i < 80 && s.outcome.status === 'running' && s.day <= days; i++) s = runAITurn(catalog, s, { maxCommands: 300 });
      expect(s.day).toBeGreaterThan(days);
    }, 120_000);
  }
});
