import { expect, test } from '@playwright/test';
import { GameDriver } from '@pr/testing';
import { importAndLoad, writeSave } from './fixtures';
import { usePrefs } from './momentFixtures';
import { inspect, waitFor } from './helpers';

test('hidden Oracle applies all commands and leaves enemy armies and towns alone', async ({ page }) => {
  await usePrefs(page, { graphicsTested: true, motion: 'reduced' });
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId: 'oracle-e2e' });
  const before = { ...d.player.wallet };
  await page.goto('/?e2e');
  await importAndLoad(page, writeSave(d, 'oracle-e2e'));
  await waitFor(page, s => s.screen === 'adventure' && !s.busy && s.overlays.length === 0, 'adventure');
  await page.keyboard.press('Backquote');
  const dialog = page.getByTestId('oracle');
  await expect(dialog).toBeVisible();
  await expect(dialog).not.toContainText('blessed by the gods');
  const input = page.getByLabel('Speak your will');
  await input.fill('nothing happens');
  await input.press('Enter');
  await expect(dialog.getByRole('status')).toContainText('silence');
  await input.fill('  BLESSED   by the gods  ');
  await input.press('Enter');
  await expect(dialog.getByRole('status')).toContainText('granted');
  expect((await inspect(page)).state.players.player.wallet.gold).toBe(before.gold + 10000);
  await dialog.screenshot({ path: 'docs/single-battle-design/oracle.png' });
  for (const words of ['hermes wings', 'atlantis', 'I am a monster', 'eyes of olympus', 'ambrosia', 'age of heroes']) {
    await waitFor(page, s => !s.busy, 'settled');
    await input.fill(words);
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(dialog.getByRole('status')).toContainText('granted');
  }
  const state = (await inspect(page)).state;
  expect(state.heroes.alexios.movementPoints).toBe(10000);
  expect(state.towns.westharbor.garrison.slots.filter(Boolean)).toHaveLength(7);
  expect(state.towns.eastharbor.buildings).toEqual(d.state.towns.eastharbor!.buildings);
  await input.press('Escape');
  await expect(dialog).toHaveCount(0);
});

test('visible enemy movement plays the walking clip before returning control', async ({ page }) => {
  await usePrefs(page, { schemaVersion: 5, graphicsTested: true, motion: 'full', enemyMovement: 'normal', confirmEndDayWithMovement: false });
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId: 'enemy-movement-e2e' });
  d.state.heroes.alexios!.position = { q: 15, r: 7 };
  const foe = d.state.heroes.rival_odysseus!;
  foe.position = { q: 20, r: 7 };
  foe.movementPoints = 200;
  d.state.world.map = { ...d.state.world.map, terrain: 'p'.repeat(d.state.world.map.width * d.state.world.map.height), roads: [] };
  for (const fog of Object.values(d.state.fog)) fog.explored.fill(1);
  foe.army.slots[0]!.count = 1000;
  foe.ai = { profile: 'patrol', waypoints: [{ q: 18, r: 7 }], waypointIndex: 0, regionMinQ: 17, regionMaxQ: 25, attackThreshold: { numerator: 11, denominator: 10 } };
  await page.goto('/?e2e');
  await importAndLoad(page, writeSave(d, 'enemy-movement-e2e'));
  await waitFor(page, s => s.screen === 'adventure' && !s.busy && s.overlays.length === 0, 'adventure');
  await page.evaluate(() => {
    const g = globalThis as unknown as { __prHeroes: () => Record<string,{clip:string;visible:boolean}>; movementSamples: {clip:string;visible:boolean}[]; sampleMovement:boolean };
    g.movementSamples = []; g.sampleMovement = true;
    const poll = () => { if (!g.sampleMovement) return; const h = g.__prHeroes()?.rival_odysseus; if(h) g.movementSamples.push({...h}); requestAnimationFrame(poll); }; poll();
  });
  await page.getByTestId('end-day').click();
  await expect.poll(() => page.evaluate(() => (globalThis as unknown as { movementSamples:{clip:string;visible:boolean}[] }).movementSamples.filter(h => h.clip === 'walk' && h.visible).length), { timeout: 60000 }).toBeGreaterThan(2);
  const samples = await page.evaluate(() => { const g=globalThis as unknown as { sampleMovement:boolean;movementSamples:{clip:string;visible:boolean}[] };g.sampleMovement=false;return g.movementSamples; });
  expect(samples.filter(h => h.clip === 'walk' && h.visible).length).toBeGreaterThan(2);
});

