/**
 * Ships on custom maps (expedition kit, scenario feature `navalMovementV1`): the editor document
 * keeps them through every export and import, the checks refuse a ship off the water, two ships on
 * one tile or a bad owner, sea crossings by a placed ship count for reachability, and the compiler
 * hands them to the mission (owners mapped to the seats) so a new match starts with them.
 */
import { describe, expect, it } from 'vitest';
import { buildCatalog } from '@pr/content';
import { TERRAIN_CODES, type HexCoord } from '@pr/rules';
import { compileCustomMap, createGeneratedMatch, customRowOffset, newCustomMap, parseCustomMap, serializeCustomMap, validateCustomMap, type CustomMapDocument, type CustomSite } from '../src';

const catalog = buildCatalog();
const cell = (doc: Pick<CustomMapDocument, 'height'>, x: number, y: number): HexCoord => ({ q: x - Math.floor(y / 2) + customRowOffset(doc.height), r: y });

/** Two islands (rectangle columns 0-9 and 20-29) and the sea between them. */
function islands(ships: (doc: CustomMapDocument) => CustomMapDocument['ships']): CustomMapDocument {
  let doc = newCustomMap(catalog, 'small', 'Isles');
  const t = doc.terrain.split('');
  for (let y = 0; y < 24; y++) for (let x = 10; x <= 19; x++) {
    const c = cell(doc, x, y);
    t[c.r * doc.width + c.q] = TERRAIN_CODES.water;
  }
  doc = { ...doc, terrain: t.join('') };
  const at = (id: string, kind: CustomSite['kind'], x: number, y: number, extra: Partial<CustomSite> = {}): CustomSite => ({ id, kind, ...cell(doc, x, y), ...extra });
  return { ...doc, players: [{ pantheonId: 'greek' }, { pantheonId: 'norse' }], sites: [at('town_a', 'town', 9, 12, { owner: 0 }), at('town_b', 'town', 20, 12, { owner: 1 })], ...(ships ? { ships: ships(doc) } : {}) };
}

const errors = (doc: CustomMapDocument) => validateCustomMap(catalog, doc).filter((i) => i.severity === 'error').map((i) => i.text);

describe('ships on custom maps', () => {
  it('export and import keep the ships exactly; a map without ships stays without', () => {
    const doc = islands((d) => [{ id: 'free', ...cell(d, 10, 8) }, { id: 'mine', ...cell(d, 10, 14), owner: 0 }]);
    const back = parseCustomMap(serializeCustomMap(doc));
    expect(back.ok).toBe(true);
    if (back.ok) expect(back.doc.ships).toEqual(doc.ships);
    const none = islands(() => undefined);
    const noneBack = parseCustomMap(serializeCustomMap(none));
    expect(noneBack.ok && noneBack.doc.ships).toBeUndefined();
    const raw = JSON.parse(serializeCustomMap(doc)) as { ships: Record<string, unknown>[] };
    raw.ships[0]!.id = '../x';
    expect(parseCustomMap(JSON.stringify(raw))).toEqual({ ok: false, error: 'A ship is damaged.' });
    raw.ships[0]!.id = 'free';
    raw.ships[0]!.owner = 9;
    expect(parseCustomMap(JSON.stringify(raw))).toEqual({ ok: false, error: 'The owner of ship free is damaged.' });
  });

  it('the checks refuse a ship on land, two ships on one tile and an owner without an empire', () => {
    const dry = islands((d) => [{ id: 'free', ...cell(d, 10, 8) }, { id: 'dry', ...cell(d, 5, 5) }]);
    expect(errors(dry)).toContain('Ship dry is not on water.');
    const twins = islands((d) => [{ id: 'a', ...cell(d, 10, 8) }, { id: 'b', ...cell(d, 10, 8) }]);
    expect(errors(twins)).toContain('Ship b shares its tile with another ship.');
    const lost = islands((d) => [{ id: 'free', ...cell(d, 10, 8) }, { id: 'odd', ...cell(d, 12, 8), owner: 4 }]);
    expect(errors(lost)).toContain('Ship odd belongs to no empire 5.');
  });

  it('a placed neutral (or own) ship beside the home shore makes the far island reachable; a rival ship does not', () => {
    expect(errors(islands(() => undefined))).toContain('Town cannot be reached from Empire 1’s town.');
    expect(errors(islands((d) => [{ id: 'free', ...cell(d, 10, 8) }]))).toEqual([]);
    expect(errors(islands((d) => [{ id: 'own', ...cell(d, 10, 8), owner: 0 }]))).toEqual([]);
    expect(errors(islands((d) => [{ id: 'rival', ...cell(d, 10, 8), owner: 1 }]))).toContain('Town cannot be reached from Empire 1’s town.');
    // A ship in mid-sea with no shore near the home island carries nobody.
    expect(errors(islands((d) => [{ id: 'far', ...cell(d, 15, 8) }]))).toContain('Town cannot be reached from Empire 1’s town.');
  });

  it('the compiler hands the ships to the mission and a new match starts with them (owners mapped to the seats)', () => {
    const doc = islands((d) => [{ id: 'free', ...cell(d, 10, 8) }, { id: 'theirs', ...cell(d, 19, 8), owner: 1 }]);
    const compiled = compileCustomMap(catalog, doc, [{ controller: 'human' }, { controller: 'ai' }]);
    expect(compiled.mission.ships).toEqual([
      { shipId: 'map_ship_free', coord: cell(doc, 10, 8) },
      { shipId: 'map_ship_theirs', coord: cell(doc, 19, 8), ownerId: 'p2' },
    ]);
    const { match } = createGeneratedMatch(catalog, compiled, { matchId: 'ships-1' });
    expect(Object.keys(match.world.ships ?? {}).sort()).toEqual(['map_ship_free', 'map_ship_theirs']);
    expect(match.world.ships!['map_ship_theirs']).toMatchObject({ ownerId: 'p2', heroId: null, state: 'empty' });
    // With ships switched off, the same mission starts with none.
    const off = createGeneratedMatch(catalog, { ...compiled, mission: { ...compiled.mission, features: { ...compiled.mission.features, navalMovementV1: false } } }, { matchId: 'ships-2' }).match;
    expect(off.world.ships).toBeUndefined();
  });
});
