/**
 * The hero screen's equipment figure (owner delivery 2026-10-06: the simpler
 * schematic, `ui/hero-equipment-schematic-v2.png`) at the supported window
 * sizes, with an empty and a fully equipped hero: the picture sits behind the
 * slots at 4:5, decorative and click-through; every one of the fifteen slots
 * and the spellbook stays whole inside the stage without touching another;
 * equipping, unequipping and backpack transfers still work by click, drag and
 * keyboard. Screenshots for review: test-results/hero-schematic-*.
 */
import { expect, test, type Page } from '@playwright/test';
import { GameDriver } from '@pr/testing';
import { EQUIP_SLOTS, EQUIP_SLOT_KIND, type EquipSlot } from '@pr/rules';
import { importAndLoad, writeSave } from './fixtures';
import { inspect, waitFor } from './helpers';

const HERO = 'hervor';

/** Hervor with an empty doll and four items in the backpack, or with every slot worn. */
function fixture(full: boolean): string {
  const d = GameDriver.mission('winter_oath_m01', { startingGodId: 'norse_odin', matchId: `e2e-hero-schematic-${full ? 'full' : 'empty'}` });
  const h = d.state.heroes[HERO]!;
  const eq = h.equipment as Partial<Record<EquipSlot, { instanceId: string; artifactId: string }>>;
  for (const s of EQUIP_SLOTS) delete eq[s];
  h.backpack.length = 0;
  h.backpack.push(
    { instanceId: 'e2e_art_1', artifactId: 'rune_marked_sword' },
    { instanceId: 'e2e_art_2', artifactId: 'draupnir_echo' },
    { instanceId: 'e2e_art_3', artifactId: 'andvaris_ring' },
    { instanceId: 'e2e_art_4', artifactId: 'boar_crest_helm' },
  );
  if (full) {
    const used = new Set(h.backpack.map((b) => b.artifactId));
    for (const slot of EQUIP_SLOTS) {
      const kind = EQUIP_SLOT_KIND[slot];
      const art = Object.values(d.catalog.artifacts).find((a) => a.slot === kind && !used.has(a.id));
      if (!art) continue;
      used.add(art.id);
      eq[slot] = { instanceId: `e2e_eq_${slot}`, artifactId: art.id };
    }
  }
  return writeSave(d, `e2e hero schematic ${full ? 'full' : 'empty'}`);
}

const equipment = async (page: Page): Promise<Record<string, string>> => {
  const s = await inspect(page);
  const eq = s.state.heroes[HERO].equipment as Record<string, { artifactId: string } | null | undefined>;
  return Object.fromEntries(Object.entries(eq).filter(([, v]) => !!v).map(([k, v]) => [k, v!.artifactId]));
};

async function openHero(page: Page, file: string) {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.evaluate(() => new Promise<void>((done) => {
    const req = indexedDB.deleteDatabase('pantheon-realms');
    req.onsuccess = req.onerror = req.onblocked = () => done();
  }));
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, file);
  await waitFor(page, (s) => s.screen === 'adventure' && s.overlays.length === 0, 'adventure map');
  await page.getByTitle('Hero (H)').click();
  await waitFor(page, (s) => s.screen === 'hero', 'hero screen');
}

/** The stage, the picture and every control on it, as page rectangles. */
async function layout(page: Page) {
  return page.evaluate(() => {
    const stage = document.querySelector('.h3-doll__stage') as HTMLElement;
    const img = stage.querySelector('img.h3-body') as HTMLImageElement;
    const r = (el: Element) => {
      const b = el.getBoundingClientRect();
      return { x: b.left, y: b.top, w: b.width, h: b.height };
    };
    const controls = [...stage.querySelectorAll('button.h3-slot')].map((el) => {
      const b = r(el);
      const hit = document.elementFromPoint(b.x + b.w / 2, b.y + b.h / 2);
      return { id: el.getAttribute('data-testid') ?? '', ...b, hitSelf: !!hit && (hit === el || el.contains(hit)) };
    });
    const cs = getComputedStyle(img);
    return {
      stage: r(stage),
      img: { ...r(img), alt: img.getAttribute('alt'), hidden: img.getAttribute('aria-hidden'), pointer: cs.pointerEvents, draggable: img.draggable, natural: [img.naturalWidth, img.naturalHeight], src: img.getAttribute('src') },
      controls,
      viewport: { w: innerWidth, h: innerHeight },
    };
  });
}

const SIZES: [number, number][] = [
  [1280, 720],
  [1366, 768],
  [1600, 900],
  [1920, 1080],
  [1024, 768],
];

for (const full of [false, true]) {
  test(`the schematic figure behind the slots at every supported size (${full ? 'every slot worn' : 'empty doll'})`, async ({ page }) => {
    test.setTimeout(300_000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.setViewportSize({ width: 1280, height: 720 });
    await openHero(page, fixture(full));
    if (full) for (const s of EQUIP_SLOTS) await expect(page.getByTestId(`slot-${s}`)).toHaveAttribute('aria-label', /: (?!empty)/);
    for (const [w, h] of SIZES) {
      await page.setViewportSize({ width: w, height: h });
      await page.waitForTimeout(400);
      await page.locator('.h3-doll__stage').scrollIntoViewIfNeeded();
      await expect.poll(() => page.locator('img.h3-body').evaluate((i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0)).toBe(true);
      const l = await layout(page);
      // The picture: the delivered file, decorative, never catching the pointer, filling the 4:5 stage.
      expect(l.img.src).toBe('./ui/hero-equipment-schematic-v2.png');
      expect(l.img.alt).toBe('');
      expect(l.img.hidden).toBe('true');
      expect(l.img.pointer).toBe('none');
      expect(l.img.draggable).toBe(false);
      expect(l.img.natural).toEqual([1122, 1402]);
      expect(Math.abs(l.stage.w / l.stage.h - 0.8), `${w}×${h} stage ${l.stage.w}×${l.stage.h}`).toBeLessThan(0.01);
      expect(Math.abs(l.img.w - l.stage.w)).toBeLessThan(3);
      expect(Math.abs(l.img.h - l.stage.h)).toBeLessThan(3);
      // Fifteen slots and the spellbook: whole inside the stage, clear of each other, each the target of its own centre.
      expect(l.controls.map((c) => c.id).sort()).toEqual([...EQUIP_SLOTS.map((s) => `slot-${s}`), 'hero-spellbook'].sort());
      for (const c of l.controls) {
        expect(c.x, `${w}×${h} ${c.id} left`).toBeGreaterThanOrEqual(l.stage.x - 0.5);
        expect(c.y, `${w}×${h} ${c.id} top`).toBeGreaterThanOrEqual(l.stage.y - 0.5);
        expect(c.x + c.w, `${w}×${h} ${c.id} right`).toBeLessThanOrEqual(l.stage.x + l.stage.w + 0.5);
        expect(c.y + c.h, `${w}×${h} ${c.id} bottom`).toBeLessThanOrEqual(l.stage.y + l.stage.h + 0.5);
        expect(c.w).toBeGreaterThanOrEqual(36);
        expect(c.hitSelf, `${w}×${h} ${c.id} takes its own clicks`).toBe(true);
      }
      for (let i = 0; i < l.controls.length; i++)
        for (let j = i + 1; j < l.controls.length; j++) {
          const a = l.controls[i]!;
          const b = l.controls[j]!;
          const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
          expect(overlap, `${w}×${h}: ${a.id} overlaps ${b.id}`).toBe(false);
        }
      await page.screenshot({ path: `test-results/hero-schematic-${full ? 'full' : 'empty'}-${w}x${h}.png` });
    }
    expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
  });
}

test('equip, unequip and move items over the new figure: click, drag and keyboard', async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  await openHero(page, fixture(false));
  // Click a backpack item, then its slot.
  await page.getByTestId('pack-rune_marked_sword').click();
  await page.getByTestId('slot-weapon').click();
  await expect.poll(() => equipment(page)).toMatchObject({ weapon: 'rune_marked_sword' });
  // Double-click a worn item: back to the backpack.
  await page.getByTestId('slot-weapon').dblclick();
  await expect.poll(async () => (await equipment(page)).weapon).toBeUndefined();
  // Drag from the backpack to a ring slot, between the two ring slots, and back to the backpack.
  await page.getByTestId('pack-andvaris_ring').dragTo(page.getByTestId('slot-ring_left'));
  await expect.poll(() => equipment(page)).toMatchObject({ ring_left: 'andvaris_ring' });
  await page.getByTestId('slot-ring_left').dragTo(page.getByTestId('slot-ring_right'));
  await expect.poll(async () => (await equipment(page)).ring_right).toBe('andvaris_ring');
  await page.getByTestId('slot-ring_right').dragTo(page.getByTestId('hero-backpack'));
  await expect.poll(async () => (await equipment(page)).ring_right).toBeUndefined();
  // Dropping on the picture's figure (between slots) does nothing; the backpack keeps the helm.
  const stage = await page.locator('.h3-doll__stage').boundingBox();
  await page.getByTestId('pack-boar_crest_helm').dragTo(page.locator('.h3-doll__stage'), { targetPosition: { x: stage!.width * 0.5, y: stage!.height * 0.62 } });
  expect((await equipment(page)).head).toBeUndefined();
  // Keyboard: focus the helm, Enter picks it; focus the head slot, Enter wears it; the focus ring is visible.
  await page.getByTestId('pack-boar_crest_helm').focus();
  await page.keyboard.press('Enter');
  await page.getByTestId('slot-head').focus();
  const ring = await page.getByTestId('slot-head').evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(ring).not.toBe('none');
  await page.keyboard.press('Enter');
  await expect.poll(() => equipment(page)).toMatchObject({ head: 'boar_crest_helm' });
  await page.screenshot({ path: 'test-results/hero-schematic-after-equip.png' });
  // The spellbook button still opens the book.
  await page.getByTestId('hero-spellbook').click();
  await waitFor(page, (s) => s.overlays.includes('spellbook'), 'spellbook');
});
