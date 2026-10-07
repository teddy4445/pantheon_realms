/**
 * Big moments (GPT6_BRIEF_3, delivery 2026-10-02): 14 miracle cards, 12
 * victory/defeat splashes, 6 level-up and 9 new-week banners resolve through
 * the game's own manifest; runtime files exist at their registered sizes, keep
 * their aspect ratio and transparency and were never upscaled; the moments come
 * only from committed events, once, and fall back when a picture is missing.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GameDriver } from '@pr/testing';
import type { GameEvent } from '@pr/rules';
import { levelUpBannerArt, miracleCardArt, newWeekBannerArt, resultSplashArt } from '../src/assets/momentArt';
import { momentHoldMs, momentsFromEvents, viewerWon } from '../src/app/moments';
import { DEFAULT_PREFERENCES } from '../src/app/preferences';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const runtime = path.join(root, 'assets-runtime');
type Entry = { file: string; kind: string; width: number; height: number; plaque?: number[]; plaqueMeasured?: boolean; source: { file: string; width: number; height: number } };
const report = JSON.parse(readFileSync(path.join(root, 'assets-source/art/IMPORT_REPORT.json'), 'utf8')) as { assets: Record<string, Entry> };
const PANTHEONS = ['greek', 'norse', 'egyptian', 'japanese', 'celtic', 'mesoamerican'];
const ev = (e: object) => e as GameEvent;

function webpInfo(file: string): { w: number; h: number; alpha: boolean } {
  const b = readFileSync(file);
  expect(b.toString('latin1', 8, 12)).toBe('WEBP');
  const cc = b.toString('latin1', 12, 16);
  if (cc === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3), alpha: (b[20]! & 0x10) !== 0 };
  if (cc === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff, alpha: false };
  const bits = b.readUInt32LE(21);
  return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1, alpha: ((bits >> 28) & 1) === 1 };
}

describe('big-moment runtime files', () => {
  const entries = Object.entries(report.assets).filter(([, a]) => ['miracle', 'splash', 'banner'].includes(a.kind));
  it('41 files: 14 cards, 12 splashes, 15 banners, inside assets-runtime, at their registered sizes', () => {
    expect(entries).toHaveLength(41);
    const count = (k: string) => entries.filter(([, a]) => a.kind === k).length;
    expect([count('miracle'), count('splash'), count('banner')]).toEqual([14, 12, 15]);
    for (const [id, a] of entries) {
      expect(a.file.startsWith('art/'), id).toBe(true);
      expect(a.file).not.toMatch(/\.\.|assets-source|\.codex|blannder|:\\|^\//i);
      expect(a.source.file).toBe(`assets-source/art/final/${id}.png`);
      const file = path.join(runtime, a.file);
      expect(existsSync(file), a.file).toBe(true);
      const info = webpInfo(file);
      expect([info.w, info.h], a.file).toEqual([a.width, a.height]);
      // Banners keep their transparency; the full paintings are opaque.
      expect(info.alpha, `${id} alpha`).toBe(a.kind === 'banner');
    }
  });

  it('never upscaled, aspect ratios kept (native sizes are below the brief for splashes and differ for banners)', () => {
    for (const [id, a] of entries) {
      expect(a.width, id).toBeLessThanOrEqual(a.source.width);
      expect(a.height, id).toBeLessThanOrEqual(a.source.height);
      expect(Math.abs(a.width / a.height - a.source.width / a.source.height), id).toBeLessThan(0.002);
      if (a.kind === 'miracle') expect([a.source.width, a.source.height, a.width, a.height]).toEqual([1024, 1536, 768, 1152]);
      if (a.kind === 'splash') {
        expect(a.source.width).toBe(1672);
        expect([940, 941]).toContain(a.source.height);
        expect([a.width, a.height]).toEqual([a.source.width, a.source.height]); // native: not enlarged to 1920 x 1080
      }
      if (a.kind === 'banner') expect([a.source.width, a.source.height, a.width, a.height]).toEqual([2172, 724, 1536, 512]);
    }
  });

  it('every banner has its own measured plaque: centred, about 60 % wide, in the lower middle', () => {
    for (const [id, a] of entries.filter(([, x]) => x.kind === 'banner')) {
      expect(a.plaqueMeasured, id).toBe(true);
      const [l, t, r, b] = a.plaque!;
      expect(r - l, id).toBeGreaterThan(0.5);
      expect(r - l, id).toBeLessThan(0.7);
      expect(Math.abs((l + r) / 2 - 0.5), id).toBeLessThan(0.01);
      expect(b - t, id).toBeGreaterThan(0.2);
      expect(t, `${id}: the top emblem stays above the text`).toBeGreaterThan(0.4);
    }
  });
});

describe('big-moment wiring', () => {
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId: 'moments-test' });
  it('every divine intervention has its painted card (not its 96 px icon)', () => {
    const ids = Object.keys(d.catalog.interventions ?? {});
    expect(ids).toHaveLength(14);
    for (const id of ids) {
      expect(miracleCardArt(id)?.kind, id).toBe('miracle');
      expect(miracleCardArt(id)?.url).toBe(`./art/miracles/intervention.${id}.card.webp`);
      expect(d.catalog.interventions[id]!.iconAssetId).toBe(`icon.intervention.${id}`);
    }
    expect(miracleCardArt('no_such_miracle')).toBeNull();
  });

  it('every pantheon has a victory and a defeat splash and a level-up banner', () => {
    expect(Object.keys(d.catalog.pantheons).sort()).toEqual([...PANTHEONS].sort());
    for (const p of PANTHEONS) {
      expect(resultSplashArt(p, true)?.url).toBe(`./art/splashes/splash.${p}.victory.webp`);
      expect(resultSplashArt(p, false)?.url).toBe(`./art/splashes/splash.${p}.defeat.webp`);
      expect(levelUpBannerArt(p)?.url).toBe(`./art/banners/banner.level_up.${p}.webp`);
    }
    expect(resultSplashArt(null, true)).toBeNull();
    expect(levelUpBannerArt('nowhere')).toBeNull();
  });

  it('a week shows exactly one banner: its event’s own, else the default', () => {
    const events = Object.keys(d.catalog.weeklyEvents ?? {});
    expect(events).toHaveLength(8);
    for (const e of events) expect(newWeekBannerArt(e)?.url).toBe(`./art/banners/banner.week.${e}.webp`);
    expect(newWeekBannerArt(null)?.url).toBe('./art/banners/banner.new_week.webp');
    expect(newWeekBannerArt('an_unknown_event')?.url).toBe('./art/banners/banner.new_week.webp');
  });
});

describe('moments from committed events', () => {
  it('the player’s own miracle shows its card once; the effect was applied once by the rules', () => {
    const d = GameDriver.mission('skirmish_twin_harbors', { matchId: 'moments-miracle' });
    d.player.wallet.favor = 30;
    const gold = d.player.wallet.gold;
    const events = d.do({ kind: 'InvokeIntervention', interventionId: 'tithe_of_the_faithful' });
    const moments = momentsFromEvents(d.catalog, d.state, 'player', events);
    expect(moments).toEqual([{ kind: 'miracle', interventionId: 'tithe_of_the_faithful', context: 'adventure', name: 'Tribute of Hera', summary: d.catalog.interventions['tithe_of_the_faithful']!.summary, invokedBy: null }]);
    // Building the moment again (a re-render, a replayed animation) changes nothing.
    const after = JSON.stringify(d.state);
    momentsFromEvents(d.catalog, d.state, 'player', events);
    expect(JSON.stringify(d.state)).toBe(after);
    expect(d.player.wallet.gold).toBe(gold + 1500);
    expect(d.player.wallet.favor).toBe(24);
  });

  it('another empire’s map miracle stays hidden; an opponent’s battle miracle in your battle is shown with its name', () => {
    const d = GameDriver.mission('skirmish_twin_harbors', { matchId: 'moments-others' });
    const rival = d.state.playerOrder.find((p) => p !== 'player')!;
    const map = [ev({ kind: 'InterventionInvoked', playerId: rival, interventionId: 'tithe_of_the_faithful', targetTownId: null, targetStackId: null })];
    expect(momentsFromEvents(d.catalog, d.state, 'player', map)).toEqual([]);
    const battle = [ev({ kind: 'InterventionInvoked', playerId: rival, interventionId: 'wrath_from_above', targetTownId: null, targetStackId: 's1' })];
    // Not in a battle: hidden.
    expect(momentsFromEvents(d.catalog, { ...d.state, battle: null, lastBattleResult: null }, 'player', battle)).toEqual([]);
    const fakeBattle = { ...d.state, battle: { sides: { attacker: { playerId: 'player' }, defender: { playerId: rival } } } } as unknown as typeof d.state;
    const shown = momentsFromEvents(d.catalog, fakeBattle, 'player', battle);
    expect(shown).toHaveLength(1);
    expect(shown[0]).toMatchObject({ kind: 'miracle', interventionId: 'wrath_from_above', context: 'battle', invokedBy: d.state.players[rival]!.name });
  });

  it('a new week (day 8, 15, …) shows one banner with its event; other days none', () => {
    const d = GameDriver.mission('skirmish_twin_harbors', { matchId: 'moments-week' });
    const withEvent = (id: string | null) => ({ ...d.state, world: { ...d.state.world, weeklyEventId: id } });
    // As published: the envelope's ID overwrites the payload's `eventId`, so the drawn event is read from the state.
    const drawn = (week: number) => ev({ kind: 'WeeklyEventStarted', week, eventId: `${week * 7}.1` });
    expect(momentsFromEvents(d.catalog, d.state, 'player', [ev({ kind: 'DayStarted', day: 3, week: 1, dayOfWeek: 3 })])).toEqual([]);
    expect(momentsFromEvents(d.catalog, withEvent('week_of_plenty'), 'player', [ev({ kind: 'DayStarted', day: 8, week: 2, dayOfWeek: 1 }), drawn(2)])).toEqual([
      { kind: 'new-week', week: 2, eventId: 'week_of_plenty', title: 'Week of Plenty', effect: d.catalog.weeklyEvents['week_of_plenty']!.summary },
    ]);
    // A week without a drawn event (The Three Beacons has none): the default banner and text.
    expect(momentsFromEvents(d.catalog, withEvent(null), 'player', [ev({ kind: 'DayStarted', day: 15, week: 3, dayOfWeek: 1 })])).toEqual([{ kind: 'new-week', week: 3, eventId: null, title: 'A new week', effect: 'Creatures grow in their dwellings.' }]);
    // An unknown event falls back to the default banner, with no invented title.
    expect(momentsFromEvents(d.catalog, withEvent('mystery'), 'player', [ev({ kind: 'DayStarted', day: 22, week: 4, dayOfWeek: 1 }), drawn(4)])[0]).toMatchObject({ eventId: null, title: 'A new week' });
  });

  it('the real dawn of week 2 in a skirmish yields exactly one banner', () => {
    const d = GameDriver.mission('skirmish_twin_harbors', { matchId: 'moments-dawn' });
    d.state.towns['westharbor']!.garrison.slots[0] = { stackId: 'test_guard', creatureId: 'cyclops', count: 40 };
    let found: ReturnType<typeof momentsFromEvents> = [];
    for (let i = 0; i < 60 && d.state.day < 8; i++) {
      const events = d.do({ kind: 'EndTurn' }, d.state.activePlayerId);
      const m = momentsFromEvents(d.catalog, d.state, 'player', events);
      if (m.length) found = [...found, ...m];
    }
    expect(d.state.day).toBe(8);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ kind: 'new-week', week: 2, eventId: d.state.world.weeklyEventId ?? null });
  });

  it('hold times follow the existing banner times and the chosen playback speed', () => {
    const miracle = { kind: 'miracle', interventionId: 'x', context: 'adventure', name: 'x', summary: 'x', invokedBy: null } as const;
    expect(momentHoldMs(DEFAULT_PREFERENCES, miracle)).toBe(3600);
    expect(momentHoldMs({ ...DEFAULT_PREFERENCES, adventureAnimation: 'fast' }, miracle)).toBeLessThan(3600);
    expect(momentHoldMs({ ...DEFAULT_PREFERENCES, battleSpeed: '2' }, { ...miracle, context: 'battle' })).toBeLessThan(3600);
    // Reduced motion takes away the motion, not the reading time.
    expect(momentHoldMs({ ...DEFAULT_PREFERENCES, motion: 'reduced' }, miracle)).toBe(3600);
    expect(momentHoldMs(DEFAULT_PREFERENCES, { kind: 'new-week', week: 2, eventId: null, title: '', effect: '' })).toBe(2200);
    expect(momentHoldMs(DEFAULT_PREFERENCES, { kind: 'new-week', week: 2, eventId: 'week_of_valor', title: '', effect: '' })).toBe(3600);
  });

  it('the viewer’s result picks the splash: winners named in a skirmish, the outcome in a campaign', () => {
    const d = GameDriver.mission('skirmish_twin_harbors', { matchId: 'moments-outcome' });
    expect(viewerWon(d.state, 'player')).toBeNull();
    expect(viewerWon({ ...d.state, outcome: { status: 'victory', reason: '', day: 9, winnerIds: ['player'] } }, 'player')).toBe(true);
    expect(viewerWon({ ...d.state, outcome: { status: 'victory', reason: '', day: 9, winnerIds: ['rival'] } }, 'player')).toBe(false);
    expect(viewerWon({ ...d.state, outcome: { status: 'defeat', reason: '', day: 9 } }, 'player')).toBe(false);
    expect(viewerWon({ ...d.state, outcome: { status: 'victory', reason: '', day: 9 } }, 'player')).toBe(true);
  });
});
