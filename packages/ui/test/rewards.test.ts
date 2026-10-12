import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import type { GameEvent, MatchState } from '@pr/rules';
import { artifactPlace, buildReceipt } from '../src/app/rewards';

/**
 * Reward receipts are read from one command's committed events and the state
 * before and after it — never from text, never from history.
 */
const d = GameDriver.mission('skirmish_twin_harbors', { matchId: 'unit-rewards' });
const catalog = d.catalog;
const before = d.state;
const hero = Object.values(before.heroes).find((h) => h.ownerId === 'player' && h.status === 'active' && !h.monster)!;
const ev = (e: object) => e as GameEvent;
const meta = { title: 'Test', source: 'Somewhere' };
const zero = { gold: 0, wood: 0, stone: 0, crystal: 0, favor: 0 };
const anArtifact = Object.keys(catalog.artifacts)[0]!;
const aCreature = Object.keys(catalog.creatures)[0]!;
const after = (patch: (s: MatchState) => void): MatchState => {
  const s = structuredClone(before) as MatchState;
  patch(s);
  return s;
};

describe('reward receipts', () => {
  it('lists granted resources once, in resource order, and keeps costs apart', () => {
    const events = [
      ev({ kind: 'ResourcesSpent', playerId: 'player', amount: { ...zero, wood: 5 }, reason: 'x' }),
      ev({ kind: 'MapEventResolved', siteId: 's', heroId: hero.id, optionIndex: 0, label: 'Trade' }),
      ev({ kind: 'ResourcesGranted', playerId: 'player', amount: { ...zero, gold: 1000, crystal: 2 }, reason: 'x' }),
      // Another player's gain is not the viewer's.
      ev({ kind: 'ResourcesGranted', playerId: 'rival', amount: { ...zero, gold: 999 }, reason: 'x' }),
    ];
    const r = buildReceipt(catalog, before, before, events, 'player', hero.id, meta);
    expect(r.items.map((i) => [i.key, i.amount])).toEqual([
      ['res:gold', '+1,000'],
      ['res:crystal', '+2'],
    ]);
    expect(r.costs?.wood).toBe(5);
    expect(r.major).toBe(false);
  });

  it('shows the experience actually granted and the cap, and nothing celebratory when the cap leaves nothing', () => {
    const capped = buildReceipt(catalog, before, before, [ev({ kind: 'ExperienceGranted', heroId: hero.id, amount: 120, capped: true, total: 900 })], 'player', hero.id, meta);
    expect(capped.items).toEqual([expect.objectContaining({ kind: 'xp', amount: '+120', note: 'Mission cap reached' })]);
    expect(capped.notes[0]).toContain('120');
    const none = buildReceipt(catalog, before, before, [ev({ kind: 'ExperienceGranted', heroId: hero.id, amount: 0, capped: true, total: 900 })], 'player', hero.id, meta);
    expect(none.items).toEqual([]);
    expect(none.notes[0]).toContain('no experience');
  });

  it('says where an artifact went — never assuming the backpack', () => {
    for (const location of ['equipped', 'backpack', 'cache'] as const) {
      const r = buildReceipt(catalog, before, before, [ev({ kind: 'ArtifactGranted', heroId: hero.id, artifactId: anArtifact, location })], 'player', hero.id, meta);
      expect(r.items[0]).toMatchObject({ kind: 'artifact', artifactId: anArtifact, note: artifactPlace(location, hero.name) });
      expect(r.major).toBe(true);
    }
    expect(artifactPlace('cache', 'X')).not.toContain('backpack’s');
  });

  it('creatures that joined, attributes, entitlements; mana and movement from the committed state', () => {
    const s1 = after((s) => {
      s.heroes[hero.id]!.mana = before.heroes[hero.id]!.mana + 5;
      s.heroes[hero.id]!.movementPoints = before.heroes[hero.id]!.movementPoints + 300;
    });
    const r = buildReceipt(
      catalog,
      before,
      s1,
      [ev({ kind: 'CreaturesJoined', heroId: hero.id, creatureId: aCreature, count: 4 }), ev({ kind: 'AttributeGained', heroId: hero.id, attribute: 'attack', amount: 1 })],
      'player',
      hero.id,
      meta,
    );
    expect(r.items.map((i) => i.kind)).toEqual(['mana', 'movement', 'creature', 'attribute']);
    expect(r.items.find((i) => i.kind === 'creature')).toMatchObject({ amount: '+4', creatureId: aCreature });
    expect(r.items.find((i) => i.kind === 'movement')?.amount).toBe('+300');
    expect(r.major).toBe(true);
  });

  it('a summary marker alone is not a reward; another hero’s gains are not this hero’s', () => {
    const r = buildReceipt(catalog, before, before, [ev({ kind: 'QuestHutCompleted', siteId: 's', heroId: hero.id }), ev({ kind: 'ExperienceGranted', heroId: 'someone_else', amount: 500, capped: false, total: 500 })], 'player', hero.id, meta);
    expect(r.items).toEqual([]);
  });

  it('gives every receipt its own id', () => {
    const a = buildReceipt(catalog, before, before, [], 'player', hero.id, meta);
    const b = buildReceipt(catalog, before, before, [], 'player', hero.id, meta);
    expect(a.id).not.toBe(b.id);
  });
});
