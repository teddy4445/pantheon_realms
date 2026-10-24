import { mkdirSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { dedicationFixture, PANTHEONS } from './dedicationFixtures';
import { importAndLoad } from './fixtures';
import { waitFor } from './helpers';
import { usePrefs } from './momentFixtures';

const out = path.resolve('docs/map-town-development-v1/in-game');
mkdirSync(out, { recursive: true });
for (const p of PANTHEONS) {
  for (const level of [1, 2, 3, 4]) test(`${p}: map town stage ${level}`, async ({ page }) => {
    test.setTimeout(300_000);
    const failures: string[] = [];
    page.on('pageerror', e => failures.push(e.message));
    await usePrefs(page, {});
      const f = dedicationFixture(`${p} map stage ${level}`, { pantheon: p, buildings: { civic_hall: level }, wallet: { gold: 100000, wood: 100, stone: 100, crystal: 100 } });
      copyFileSync(f.file, path.join(out, `${p}.l${level}.prsave.json`));
      await page.goto('/?e2e');
      await importAndLoad(page, f.file);
      await waitFor(page, s => s.screen === 'adventure' && !s.busy && s.overlays.length === 0, 'map');
      const sprite = `map.site.town.${p}.l${level}`;
      await expect.poll(() => page.evaluate((id) => {
        const g = globalThis as unknown as { __prScenery: () => { map: { sites: { sprite: string; shown: boolean; loaded: boolean }[] } | null } };
        return g.__prScenery()?.map?.sites.some(s => s.sprite === id && s.shown && s.loaded) ?? false;
      }, sprite), { timeout: 60_000 }).toBe(true);
      // Confirm the runtime picture really decodes, not just the selected asset ID.
      await page.evaluate(async ({ p, level }) => {
        const manifest = await (await fetch('./map-town-development-v1/manifest.json')).json();
        const img = new Image();
        img.src = './' + manifest.sites[`map.site.town.${p}.l${level}`].file;
        await img.decode();
      }, { p, level });
      await page.getByTestId(`town-tab-${f.townId}`).click({ button: 'right' });
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(out, `${p}.l${level}.png`) });
      if (level === 1) {
        await page.getByTestId(`town-tab-${f.townId}`).click();
        await page.getByTestId('slot-civic_hall').click();
        await page.getByTestId('build').click();
        await page.keyboard.press('Escape');
        await page.keyboard.press('Escape');
        await waitFor(page, s => s.screen === 'adventure', 'return after upgrade');
        await expect.poll(() => page.evaluate((id) => {
          const g = globalThis as unknown as { __prScenery: () => { map: { sites: { sprite: string }[] } | null } };
          return g.__prScenery()?.map?.sites.some(s => s.sprite === id) ?? false;
        }, `map.site.town.${p}.l2`)).toBe(true);
      }
    expect(failures).toEqual([]);
  });
}
