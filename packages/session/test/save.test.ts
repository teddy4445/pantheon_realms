import { describe, expect, it } from 'vitest';
import { loadCatalog } from '@pr/content';
import { GameSession, createEnvelope, parseEnvelope, serializeEnvelope } from '../src';
import { canonicalStateHash } from '@pr/rules';

const catalog = loadCatalog();

describe('save / load', () => {
  it('round-trips a campaign session exactly and rejects damaged files', () => {
    const s = GameSession.newCampaign(catalog, 'three_beacons', 'zeus', 'run-save', null, 1);
    s.dispatch({ kind: 'BuildStructure', townId: 'asterion', buildingId: 'barracks_up' });
    s.dispatch({ kind: 'MoveHero', heroId: 'alexios', destination: { q: 8, r: 7 } });
    const env = createEnvelope(catalog, s.snapshot(), { id: 'slot1', kind: 'manual', name: 'Test', savedAt: '2026-09-29T12:00:00Z' });
    const text = serializeEnvelope(env);
    const parsed = parseEnvelope(catalog, text);
    expect(parsed.compatibility.status).toBe('ok');
    const restored = GameSession.fromSnapshot(catalog, parsed.envelope!.snapshot);
    expect(canonicalStateHash(restored.state)).toBe(canonicalStateHash(s.state));
    expect(restored.campaign).toEqual(s.campaign);
    expect(env.metadata.heroName).toBe('Alexios');
    expect(env.metadata.day).toBe(1);
    // Continue from the restored copy: identical results.
    const a = s.dispatch({ kind: 'EndTurn' });
    const b = restored.dispatch({ kind: 'EndTurn' });
    expect(a.ok && b.ok).toBe(true);
    expect(canonicalStateHash(restored.state)).toBe(canonicalStateHash(s.state));
    // Damage one byte in the snapshot: checksum fails, file reported corrupt.
    const obj = JSON.parse(text);
    obj.snapshot.match.players.player.wallet.gold = 99999;
    const damaged = JSON.stringify(obj);
    expect(parseEnvelope(catalog, damaged).compatibility.status).toBe('corrupt');
    expect(parseEnvelope(catalog, 'not json').compatibility.status).toBe('corrupt');
    const wrongRules = text.replace(/"rulesVersion":"pr-0.2-candidate"/g, '"rulesVersion":"pr-0.1-demo"');
    expect(parseEnvelope(catalog, wrongRules).compatibility.status).not.toBe('ok');
  });

  it('emits a pre-encounter checkpoint before a battle starts', () => {
    const s = GameSession.newCampaign(catalog, 'three_beacons', 'zeus', 'run-cp', null, 1);
    const kinds: string[] = [];
    s.onCheckpoint((k, snap) => {
      kinds.push(k);
      expect(snap.match.battle).toBeNull();
    });
    s.dispatch({ kind: 'MoveHero', heroId: 'alexios', destination: { q: 8, r: 7 } });
    const r = s.dispatch({ kind: 'MoveHero', heroId: 'alexios', destination: { q: 10, r: 7 }, confirmEncounter: true });
    expect(r.ok).toBe(true);
    expect(kinds).toContain('pre_encounter');
    expect(s.state.battle).not.toBeNull();
  });

  it('a content v2 run round-trips its version and facts; a v1 run stays v1 after loading', () => {
    const v2 = GameSession.newCampaign(catalog, 'winter_oath', null, 'run-v2');
    expect(v2.campaign?.contentVersion).toBe(2);
    expect(v2.state.mission.missionId).toBe('winter_oath_v2_m01');
    const env2 = createEnvelope(catalog, v2.snapshot(), { id: 'slot2', kind: 'manual', name: 'v2', savedAt: '2026-10-15T12:00:00Z' });
    const back2 = parseEnvelope(catalog, serializeEnvelope(env2));
    expect(back2.compatibility.status).toBe('ok');
    const r2 = GameSession.fromSnapshot(catalog, back2.envelope!.snapshot);
    expect(r2.campaign).toEqual(v2.campaign);
    expect(canonicalStateHash(r2.state)).toBe(canonicalStateHash(v2.state));

    const v1 = GameSession.newCampaign(catalog, 'winter_oath', null, 'run-v1', null, 1);
    const snap = v1.snapshot();
    // As written by a build from before content v2: no contentVersion on the run.
    const old = JSON.parse(JSON.stringify(snap));
    delete old.campaign.contentVersion;
    const env1 = createEnvelope(catalog, old, { id: 'slot3', kind: 'manual', name: 'v1', savedAt: '2026-10-01T12:00:00Z' });
    const back1 = parseEnvelope(catalog, serializeEnvelope(env1));
    expect(back1.compatibility.status).toBe('ok');
    const r1 = GameSession.fromSnapshot(catalog, back1.envelope!.snapshot);
    expect(r1.state.mission.missionId).toBe('winter_oath_m01');
    expect(r1.campaign?.contentVersion).toBeUndefined();
    expect(r1.availableChapters()).toEqual([]);
  });
});
