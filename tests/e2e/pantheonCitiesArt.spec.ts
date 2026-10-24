import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { loadCatalog } from '@pr/content';
import { createEnvelope, serializeEnvelope } from '@pr/session';
import { dedicationFixture } from './dedicationFixtures';
import { importAndLoad } from './fixtures';
import { waitFor } from './helpers';
import { usePrefs } from './momentFixtures';

const catalog = loadCatalog();
for (const p of ['norse', 'egyptian', 'japanese', 'celtic', 'mesoamerican']) {
  const arch = Object.values(catalog.townArchetypes).find(a => a.pantheonId === p)!;
  const out = path.resolve(`docs/pantheon-cities-h3-v1/${p}/in-game`);
  mkdirSync(out, { recursive: true });
  for (const level of [1, 2, 3, 4]) {
    test(`${p} stage ${level}: artwork, all locations, saved game and upgrade`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', e => errors.push(e.message));
      const buildings = Object.fromEntries(arch.slots.map(s => [s.id, Math.min(level, s.chain.length)]));
      const f = dedicationFixture(`${p} City Stage ${level}`, { pantheon: p, buildings, wallet: { gold: 100000, wood: 100, stone: 100, crystal: 100 } });
      copyFileSync(f.file, path.join(out, `${p}-city-stage-${level}.prsave.json`));
      await usePrefs(page, {});
      await page.goto('/?e2e');
      await importAndLoad(page, f.file);
      await waitFor(page, s => s.screen === 'adventure' && !s.busy && s.overlays.length === 0, 'adventure');
      await page.getByTestId(`town-tab-${f.townId}`).click();
      const scene = page.getByTestId('town-scene');
      await expect(scene).toHaveCSS('background-image', new RegExp(`pantheon-cities-h3-v1/${p}/background.l${level}.png`));
      await scene.locator('img.town-slot__art').evaluateAll(async imgs => {
        await Promise.all(imgs.map(i => (i as HTMLImageElement).decode()));
      });
      await expect(scene.locator('.town-slot.is-built')).toHaveCount(18);
      expect(await scene.evaluate(e => { const r = e.getBoundingClientRect(); return r.width / r.height; })).toBeCloseTo(1.5, 1);
      for (const s of arch.slots) {
        const button = page.getByTestId(`slot-${s.id}`);
        await expect(button.locator('img')).toHaveAttribute('src', new RegExp(`pantheon-cities-h3-v1/${p}/buildings/${s.id}.l${Math.min(level, s.chain.length)}.png`));
        if (level === 4) {
          // Exercise both input methods once per location, at the busiest stage.
          await button.focus();
          await page.keyboard.press('Enter');
          await expect(page.getByTestId('building-popup')).toBeVisible();
          await page.keyboard.press('Escape');
          const point = await button.evaluate(el => {
            const r = el.getBoundingClientRect();
            for (const y of [.5, .7, .3, .9, .1]) for (const x of [.5, .3, .7, .1, .9]) {
              const px = r.x + r.width * x, py = r.y + r.height * y;
              if (document.elementFromPoint(px, py)?.closest('.town-slot') === el) return { x: px, y: py };
            }
            return null;
          });
          expect(point, `${p}/${s.id} remains clickable`).not.toBeNull();
          await page.mouse.click(point!.x, point!.y);
          await expect(page.getByTestId('building-popup')).toHaveAttribute('aria-label', s.label);
          await page.keyboard.press('Escape');
        }
      }
      await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
      await page.mouse.move(2, 2);
      await page.screenshot({ path: path.join(out, `stage-${level}.png`) });
      if (level === 1) {
        await page.getByTestId('slot-civic_hall').click();
        await expect(page.getByTestId('build')).toBeEnabled();
        await page.getByTestId('build').click();
        await expect(scene).toHaveCSS('background-image', /background.l2.png/);
        await expect(page.getByTestId('slot-civic_hall').locator('img')).toHaveAttribute('src', /civic_hall.l2.png/);
      }
      if (level === 4) {
        await page.setViewportSize({ width: 1280, height: 720 });
        await page.screenshot({ path: path.join(out, 'stage-4-small.png') });
        const r = await scene.boundingBox();
        expect(r!.x).toBeGreaterThanOrEqual(0);
        expect(r!.x + r!.width).toBeLessThanOrEqual(1281);
      }
      expect(errors).toEqual([]);
    });
  }
  test(`${p}: war-damaged terrain repairs with the civic upgrade`, async ({ page }) => {
    const f = dedicationFixture(`${p} City Recovery`, { pantheon: p, buildings: { civic_hall: 1, tavern: 1 } });
    (f.state.towns[f.townId]! as { warDamaged: boolean }).warDamaged = true;
    const file = path.join(out, `${p}-city-recovery.prsave.json`);
    writeFileSync(file, serializeEnvelope(createEnvelope(f.catalog, { match: f.state, campaign: null }, { id: 'manual-1', kind: 'manual', name: `${p} City Recovery`, savedAt: new Date(0).toISOString() })));
    await usePrefs(page, {});
    await page.goto('/?e2e');
    await importAndLoad(page, file);
    await waitFor(page, s => s.screen === 'adventure' && !s.busy && s.overlays.length === 0, 'adventure');
    await page.getByTestId(`town-tab-${f.townId}`).click();
    await expect(page.getByTestId('town-scene')).toHaveCSS('background-image', new RegExp(`pantheon-cities-h3-v1/${p}/background.damaged.png`));
    await page.getByTestId('slot-civic_hall').click();
    await page.getByTestId('build').click();
    await expect(page.getByTestId('town-scene')).toHaveCSS('background-image', /background.l2.png/);
  });
}
