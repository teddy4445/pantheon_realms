import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import type { GameEvent } from '@pr/rules';
import { soundForCue, soundsForEvents, soundscapeFor, summaryCue } from '../src/audio/sounds';
import { DEFAULT_PREFERENCES, sanitizePreferences } from '../src/app/preferences';
import { levelsFrom } from '../src/audio/gameAudio';

const ev = (e: object) => e as GameEvent;

describe('music and ambience by context', () => {
  const base = { overlays: [] as string[], inSession: true, soundscape: 'high_pass' };
  it('menus play the menu theme, maps the default map music and their soundscape air, battles the battle loop', () => {
    expect(soundscapeFor({ ...base, screen: 'main-menu', inSession: false })).toEqual({ music: 'music.menu', ambience: null });
    expect(soundscapeFor({ ...base, screen: 'adventure' })).toEqual({ music: 'music.map.greek', ambience: 'amb.high_pass' });
    expect(soundscapeFor({ ...base, screen: 'town' }).music).toBe('music.map.greek');
    expect(soundscapeFor({ ...base, screen: 'battle' })).toEqual({ music: 'music.battle', ambience: 'amb.battlefield' });
    expect(soundscapeFor({ ...base, screen: 'battle-result' }).music).toBeNull();
    expect(soundscapeFor({ ...base, screen: 'adventure', soundscape: null }).ambience).toBe('amb.coast');
  });
  it('maps play the viewing player’s pantheon music where the manifest has it, else the default map music', () => {
    const has = (id: string) => id === 'music.map.norse';
    expect(soundscapeFor({ ...base, screen: 'adventure', pantheonId: 'norse', has })).toEqual({ music: 'music.map.norse', ambience: 'amb.high_pass' });
    expect(soundscapeFor({ ...base, screen: 'town', pantheonId: 'norse', has }).music).toBe('music.map.norse');
    // No entry for this pantheon: the default map music.
    expect(soundscapeFor({ ...base, screen: 'adventure', pantheonId: 'celtic', has }).music).toBe('music.map.greek');
    // Battles and menus keep their own music.
    expect(soundscapeFor({ ...base, screen: 'battle', pantheonId: 'norse', has }).music).toBe('music.battle');
    expect(soundscapeFor({ ...base, screen: 'main-menu', inSession: false, pantheonId: 'norse', has }).music).toBe('music.menu');
  });
  it('battles play the viewing player’s pantheon battle music, sieges the siege music, where the manifest has them', () => {
    const has = (id: string) => ['music.battle.norse', 'music.siege'].includes(id);
    expect(soundscapeFor({ ...base, screen: 'battle', pantheonId: 'norse', has })).toEqual({ music: 'music.battle.norse', ambience: 'amb.battlefield' });
    expect(soundscapeFor({ ...base, screen: 'battle', pantheonId: 'norse', has, siege: true }).music).toBe('music.siege');
    // No entry for this pantheon: the shared battle music.
    expect(soundscapeFor({ ...base, screen: 'battle', pantheonId: 'celtic', has }).music).toBe('music.battle');
    expect(soundscapeFor({ ...base, screen: 'battle', pantheonId: 'celtic', has: () => false, siege: true }).music).toBe('music.battle');
  });
  it('the debrief plays the resolution theme; a failed mission is silent', () => {
    expect(soundscapeFor({ ...base, screen: 'adventure', overlays: ['debrief'] }).music).toBe('music.resolution');
    expect(soundscapeFor({ ...base, screen: 'adventure', overlays: ['mission-failed'] })).toEqual({ music: null, ambience: null });
  });
});

describe('event sounds', () => {
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId: 'audio-test' });
  const me = 'player';
  const mine = Object.values(d.state.towns).find((t) => t.ownerId === me)!;
  const theirs = Object.values(d.state.towns).find((t) => t.ownerId && t.ownerId !== me)!;
  it('the player hears their own building, not the rival’s', () => {
    expect(soundsForEvents(d.catalog, d.state, me, [ev({ kind: 'BuildingConstructed', townId: mine.id, buildingId: 'x', level: 1 })])).toEqual(['ui.build']);
    expect(soundsForEvents(d.catalog, d.state, me, [ev({ kind: 'BuildingConstructed', townId: theirs.id, buildingId: 'x', level: 1 })])).toEqual([]);
  });
  it('a new week rings differently from a new day', () => {
    expect(soundsForEvents(d.catalog, { ...d.state, day: 8 }, me, [ev({ kind: 'DayStarted', day: 8, week: 2, dayOfWeek: 1 })])).toEqual(['ui.newweek']);
    expect(soundsForEvents(d.catalog, { ...d.state, day: 3 }, me, [ev({ kind: 'DayStarted', day: 3, week: 1, dayOfWeek: 3 })])).toEqual(['ui.newday']);
  });
  it('mission outcomes use the stingers, once per batch', () => {
    expect(soundsForEvents(d.catalog, d.state, me, [ev({ kind: 'MissionCompleted', reason: 'x' }), ev({ kind: 'MissionCompleted', reason: 'y' })])).toEqual(['stinger.victory']);
    expect(soundsForEvents(d.catalog, d.state, me, [ev({ kind: 'MissionFailed', reason: 'x' })])).toEqual(['stinger.defeat']);
  });
  it('relighting a beacon plays the beacon stinger instead of the victory one', () => {
    const b = GameDriver.mission('three_beacons_m01', { matchId: 'audio-beacon' });
    const hero = Object.values(b.state.heroes).find((h) => h.ownerId === 'player')!;
    const out = soundsForEvents(b.catalog, b.state, 'player', [ev({ kind: 'SiteActivated', siteId: 'm01_beacon', heroId: hero.id }), ev({ kind: 'MissionCompleted', reason: 'beacon' })]);
    expect(out).toEqual(['stinger.beacon']);
  });
});

describe('battle cues', () => {
  it('heavy blows use the heavy hit, and instant playback gets one sound per action', () => {
    expect(soundForCue({ kind: 'impact' })).toBe('combat.hit');
    expect(soundForCue({ kind: 'impact', heavy: true })).toBe('combat.hit_heavy');
    expect(soundForCue({ kind: 'breach' })).toBe('combat.breach');
    expect(summaryCue([ev({ kind: 'BattleStackMoved', stackId: 's', path: [], flying: false }), ev({ kind: 'BattleAttack', mode: 'melee', killed: 2 }), ev({ kind: 'BattleStackDestroyed', stackId: 't' })])).toBe('combat.death');
    expect(summaryCue([ev({ kind: 'BattleAttack', mode: 'shot', killed: 0 })])).toBe('combat.arrow_hit');
    expect(summaryCue([ev({ kind: 'TurnEnded', playerId: 'p' })])).toBeNull();
  });
});

describe('magic and Favor sounds', () => {
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId: 'audio-magic' });
  const me = 'player';
  const hero = Object.values(d.state.heroes).find((h) => h.ownerId === me)!;
  const town = Object.values(d.state.towns).find((t) => t.ownerId === me)!;
  it('a spell’s cue carries its look’s sound family; the cast gathers with its own sound', () => {
    expect(soundForCue({ kind: 'spell', magic: 'thunder' })).toBe('magic.thunder');
    expect(soundForCue({ kind: 'bless', magic: 'holy' })).toBe('magic.holy');
    expect(soundForCue({ kind: 'cast' })).toBe('magic.cast');
    expect(soundForCue({ kind: 'spell' })).toBe('combat.spell');
  });
  it('map spells sound like their look; gifts and offerings like what rises from the Temple', () => {
    expect(soundsForEvents(d.catalog, d.state, me, [ev({ kind: 'AdventureSpellCast', heroId: hero.id, spellId: 'far_sight', center: hero.position, radius: 2, untilDay: 2 })])).toEqual(['magic.reveal']);
    expect(soundsForEvents(d.catalog, d.state, me, [ev({ kind: 'AdventureSpellCast', heroId: hero.id, spellId: 'homecoming', center: hero.position, radius: 0, untilDay: 2 })])).toEqual(['magic.teleport']);
    expect(soundsForEvents(d.catalog, d.state, me, [ev({ kind: 'DivineGiftReceived', playerId: me, townId: town.id, giftId: 'temple_treasury', heroId: null, favor: 4, artifactId: null, xp: 0, recruits: 0 })])).toEqual(['magic.coins']);
    expect(soundsForEvents(d.catalog, d.state, me, [ev({ kind: 'DivineGiftReceived', playerId: me, townId: town.id, giftId: 'anointing', heroId: hero.id, favor: 4, artifactId: null, xp: 500, recruits: 0 })])).toEqual(['magic.bless']);
    expect(soundsForEvents(d.catalog, d.state, me, [ev({ kind: 'OfferingMade', playerId: me, townId: town.id, favor: 3, creatures: 5 })])).toEqual(['magic.holy']);
    expect(soundsForEvents(d.catalog, d.state, me, [ev({ kind: 'OfferingMade', playerId: 'someone-else', townId: town.id, favor: 3, creatures: 5 })])).toEqual([]);
  });
  it('every campaign after The Three Beacons has a soundscape of its own', () => {
    const scapes = new Map<string, Set<string>>();
    for (const m of Object.values(d.catalog.missions)) {
      const camp = Object.values(d.catalog.campaigns).find((c) => c.missionIds.includes(m.id));
      if (!camp || !m.soundscape) continue;
      scapes.set(camp.id, (scapes.get(camp.id) ?? new Set()).add(m.soundscape));
    }
    const own = [...scapes.entries()].map(([id, s]) => [id, [...s].filter((x) => !['coast', 'high_pass', 'storm_plateau'].includes(x))] as const);
    expect(own.filter(([, s]) => s.length > 0).length).toBeGreaterThanOrEqual(5);
    const three = [...scapes.entries()].find(([id]) => id.includes('beacon'));
    if (three) expect([...three[1]].every((x) => ['coast', 'high_pass', 'storm_plateau'].includes(x))).toBe(true);
  });
});

describe('audio preferences', () => {
  it('schema 1 "Effects" volume carries over to the interface and combat buses', () => {
    const p = sanitizePreferences({ schemaVersion: 1, masterVolume: 70, effectsVolume: 35 });
    expect(p.interfaceVolume).toBe(35);
    expect(p.combatVolume).toBe(35);
    expect(p.masterVolume).toBe(70);
    expect(p.schemaVersion).toBe(3);
    expect((p as unknown as Record<string, unknown>).effectsVolume).toBeUndefined();
  });
  it('schema 3: map tile lines move to the pointer only (an old "always" becomes "hover"; a later choice is kept)', () => {
    expect(sanitizePreferences({ schemaVersion: 2, hexOverlay: 'always' }).hexOverlay).toBe('hover');
    expect(sanitizePreferences({ schemaVersion: 2, hexOverlay: 'off' }).hexOverlay).toBe('off');
    expect(sanitizePreferences({ schemaVersion: 3, hexOverlay: 'always' }).hexOverlay).toBe('always');
    expect(sanitizePreferences({}).hexOverlay).toBe('hover');
  });
  it('clamps volumes and maps preferences onto mixer levels', () => {
    const p = sanitizePreferences({ musicVolume: 400, ambienceVolume: -3, muteAll: true, calmerSound: true });
    expect(p.musicVolume).toBe(100);
    expect(p.ambienceVolume).toBe(0);
    const l = levelsFrom(p);
    expect(l.muted).toBe(true);
    expect(l.reduced).toBe(true);
    expect(levelsFrom(DEFAULT_PREFERENCES).combat).toBe(80);
  });
});
