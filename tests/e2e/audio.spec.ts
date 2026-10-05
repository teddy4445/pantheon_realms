import { expect, test } from '@playwright/test';
import { inspect, startCampaign, waitFor } from './helpers';
import { approachTile, importAndLoad, slots, writeSave } from './fixtures';
import { GameDriver } from '@pr/testing';

/**
 * Sound through the real screens: the placeholder files decode in the browser,
 * music follows the screen, Settings volumes and mute reach the mixer, and
 * battle playback produces combat sounds. The read-only ?e2e inspector reports
 * the mixer's status; nothing here can play or change anything.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const audio = async (page: import('@playwright/test').Page): Promise<any> => (await inspect(page) as unknown as { audio: unknown }).audio;

test('menu music starts after the first click and every sound file decodes', async ({ page }) => {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  const before = await audio(page);
  expect(before.available).toBe(true);
  // Browsers keep audio suspended until the player interacts.
  await page.getByTestId('menu-settings').click();
  await waitFor(page, (s) => (s as unknown as { audio: { state: string; music: string | null } }).audio.state === 'running', 'audio running');
  const a = await audio(page);
  expect(a.music).toBe('music.menu');
  // Default levels: master 80%, music 60% (perceptual curve).
  expect(a.busGains.music).toBeCloseTo(0.8 ** 2 * 0.6 ** 2, 3);
  expect(a.recent).toContain('ui.click');
  // Decode every file in this browser (the director reports any that fail); the map playlists'
  // long tracks are streamed in the game, so they are checked the same way (a media element
  // reads their length) instead of being decoded whole.
  const failed = await page.evaluate(async () => {
    const m = await (await fetch('./audio/manifest.json')).json();
    const ctx = new AudioContext();
    const bad: string[] = [];
    for (const s of m.sounds)
      for (const f of s.files) {
        try {
          if (s.playlist) {
            const el = new Audio();
            el.preload = 'metadata';
            const d = await new Promise<number>((ok, fail) => {
              el.addEventListener('loadedmetadata', () => ok(el.duration));
              el.addEventListener('error', () => fail(new Error('stream')));
              el.src = `./${f}`;
            });
            if (!(d > 60)) bad.push(`${f} (${d} s)`);
            el.removeAttribute('src');
            el.load();
          } else await ctx.decodeAudioData(await (await fetch(`./${f}`)).arrayBuffer());
        } catch {
          bad.push(f);
        }
      }
    await ctx.close();
    return bad;
  });
  expect(failed).toEqual([]);
});

test('Settings: volumes preview live, Mute all silences every bus, leaving restores', async ({ page }) => {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-settings').click();
  await page.getByRole('tab', { name: 'Audio' }).click();
  await expect(page.getByTestId('audio-status-note')).toContainText('The map music is final');
  await page.getByLabel('Music volume').fill('100');
  await waitFor(page, (s) => Math.abs((s as unknown as { audio: { busGains: { music: number } } }).audio.busGains.music - 0.64) < 0.01, 'music preview at 100%');
  await page.getByRole('switch', { name: 'Mute all' }).click();
  const muted = await audio(page);
  expect(Object.values(muted.busGains).every((g) => g === 0)).toBe(true);
  await page.screenshot({ path: 'test-results/audio-settings.png' });
  // Leave without applying: the committed levels come back.
  await page.getByRole('button', { name: 'Back', exact: true }).first().click();
  if ((await inspect(page)).overlays.includes('confirm')) await page.getByTestId('confirm-ok').click();
  const restored = await waitFor(page, (s) => (s as unknown as { audio: { busGains: { music: number } } }).audio.busGains.music > 0.2, 'levels restored');
  expect((restored as unknown as { audio: { busGains: { music: number } } }).audio.busGains.music).toBeCloseTo(0.2304, 3);
});

test('the campaign map plays the Greek playlist, streamed, over the mission soundscape’s ambience', async ({ page }) => {
  await startCampaign(page);
  await page.mouse.click(5, 5);
  const s = await waitFor(page, (x) => (x as unknown as { audio: { music: string | null; musicFile: string | null } }).audio.music === 'music.map.greek', 'Greek map music', 30_000);
  const a = (s as unknown as { audio: { ambience: string; musicFile: string; failed: string[] } }).audio;
  expect(a.ambience).toBe('amb.coast');
  expect(a.musicFile).toMatch(/^audio\/music\/greek\/.+\.ogg$/);
  expect(a.failed.filter((f) => f.startsWith('audio/music/'))).toEqual([]);
});

test('battle: war horn, battle music, and combat sounds follow the playback', async ({ page }) => {
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId: 'e2e-audio-battle' });
  for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
  const hero = d.state.heroes['alexios']!;
  hero.army.slots = slots([['hoplite', 30], ['peltast', 20]]);
  hero.movementPoints = 2000;
  const rival = d.state.heroes['rival_odysseus']!;
  rival.army.slots = slots([['hoplite', 12]]);
  rival.position = { q: 12, r: 8 };
  hero.position = approachTile(d, rival.position, hero.id);
  d.do({ kind: 'MoveHero', heroId: hero.id, destination: rival.position, confirmEncounter: true });
  const file = writeSave(d, 'audio-battle');
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, file);
  await waitFor(page, (x) => x.screen === 'battle', 'battle screen');
  await page.mouse.click(5, 5); // a click lets the browser start audio
  await waitFor(page, (x) => (x as unknown as { audio: { music: string | null } }).audio.music === 'music.battle', 'battle music');
  // Let auto-combat play a few actions at normal speed.
  await page.getByTestId('battle-auto').click();
  const s = await waitFor(
    page,
    (x) => {
      const r: string[] = (x as unknown as { audio: { recent: string[] } }).audio.recent;
      return r.some((id) => id === 'combat.hit' || id === 'combat.hit_heavy' || id === 'combat.arrow_hit');
    },
    'combat sounds',
    60_000,
  );
  const recent: string[] = (s as unknown as { audio: { recent: string[] } }).audio.recent;
  expect(recent.some((id) => id.startsWith('combat.'))).toBe(true);
});
