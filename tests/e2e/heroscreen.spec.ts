/**
 * The Heroes-3-style hero screen (paper doll, backpack, spellbook, mounted figure)
 * and the start of The Winter Oath, in the production build. The fixture is an
 * ordinary save file brought in through Load → Import; the page is only read
 * (__prInspect), never driven through hooks.
 */
import { expect, test, type Page } from '@playwright/test';
import { GameDriver } from '@pr/testing';
import { importAndLoad, writeSave } from './fixtures';
import { inspect, waitFor } from './helpers';

const HERO = 'hervor';

function heroFixture(): string {
  const d = GameDriver.mission('winter_oath_m01', { startingGodId: 'norse_odin', matchId: 'e2e-hero-screen' });
  const h = d.state.heroes[HERO]!;
  h.backpack.push(
    { instanceId: 'e2e_art_1', artifactId: 'rune_marked_sword' },
    { instanceId: 'e2e_art_2', artifactId: 'draupnir_echo' },
    { instanceId: 'e2e_art_3', artifactId: 'andvaris_ring' },
    { instanceId: 'e2e_art_4', artifactId: 'boar_crest_helm' },
  );
  return writeSave(d, 'e2e hero screen');
}

const equipment = async (page: Page): Promise<Record<string, string>> => {
  const s = await inspect(page);
  const eq = s.state.heroes[HERO].equipment as Record<string, { artifactId: string } | undefined>;
  return Object.fromEntries(Object.entries(eq).filter(([, v]) => !!v).map(([k, v]) => [k, v!.artifactId]));
};
const backpack = async (page: Page): Promise<string[]> => ((await inspect(page)).state.heroes[HERO].backpack as { artifactId: string }[]).map((b) => b.artifactId);

test('hero screen: equip by slot, refuse a wrong slot, unequip, read the spellbook, see the mounted figure', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, heroFixture());
  await waitFor(page, (s) => s.screen === 'adventure' && s.overlays.length === 0, 'adventure map');
  await page.getByTitle('Hero (H)').click();
  await waitFor(page, (s) => s.screen === 'hero', 'hero screen');

  // Heroes 3 layout: primary skills, secondary-skill slots, the doll with every slot, the backpack.
  await expect(page.getByTestId('hero-primary')).toBeVisible();
  await expect(page.getByTestId('hero-skills')).toBeVisible();
  for (const slot of ['head', 'neck', 'cape', 'weapon', 'shield', 'armor', 'ring_left', 'ring_right', 'feet', 'mount', 'misc_1', 'misc_5']) {
    await expect(page.getByTestId(`slot-${slot}`)).toBeVisible();
  }
  await expect(page.getByTestId('pack-rune_marked_sword')).toBeVisible();

  // Pick from the backpack, drop on the matching slot.
  await page.getByTestId('pack-rune_marked_sword').click();
  await page.getByTestId('slot-weapon').click();
  await expect.poll(() => equipment(page)).toMatchObject({ weapon: 'rune_marked_sword' });
  expect(await backpack(page)).not.toContain('rune_marked_sword');

  // Two rings, two ring slots.
  await page.getByTestId('pack-draupnir_echo').click();
  await page.getByTestId('slot-ring_right').click();
  await page.getByTestId('pack-andvaris_ring').click();
  await page.getByTestId('slot-ring_left').click();
  await expect.poll(() => equipment(page)).toMatchObject({ ring_right: 'draupnir_echo', ring_left: 'andvaris_ring' });

  // A helm does not go on the feet.
  await page.getByTestId('pack-boar_crest_helm').click();
  await page.getByTestId('slot-feet').click();
  expect((await equipment(page)).feet).toBeUndefined();
  expect(await backpack(page)).toContain('boar_crest_helm');

  // Pick the sword on the doll and take it off.
  await page.getByTestId('slot-weapon').click();
  await expect(page.getByTestId('artifact-card')).toContainText('Rune-marked Sword');
  await page.getByTestId('artifact-unequip').click();
  await expect.poll(async () => (await equipment(page)).weapon).toBeUndefined();
  expect(await backpack(page)).toContain('rune_marked_sword');

  // Spellbook: Hervor learned Kaldvik's Rune Circle (Rune of Tyr is the Norse tier-1 rune).
  await page.getByTestId('hero-spellbook').click();
  await waitFor(page, (s) => s.overlays.includes('spellbook'), 'spellbook');
  await expect(page.getByTestId('spell-rune_of_tyr')).toBeVisible();
  await page.keyboard.press('Escape');
  await waitFor(page, (s) => !s.overlays.includes('spellbook'), 'spellbook closed');

  // The mounted hero model is shown in the figure panel.
  await expect(page.getByTestId('hero-figure')).toHaveAttribute('data-status', 'ready', { timeout: 60_000 });
  expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
});

test('hero screen: drag items between the backpack and the doll, compare before wearing, set badges', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, heroFixture());
  await waitFor(page, (s) => s.screen === 'adventure' && s.overlays.length === 0, 'adventure map');
  await page.getByTitle('Hero (H)').click();
  await waitFor(page, (s) => s.screen === 'hero', 'hero screen');

  // Picking a backpack item compares it with what is worn (an empty weapon slot here).
  await page.getByTestId('pack-rune_marked_sword').click();
  await expect(page.getByTestId('artifact-compare')).toContainText('empty slot');
  await expect(page.getByTestId('artifact-compare')).toContainText('Attack +2');
  // The sword belongs to a set: its badge is shown in the backpack.
  await expect(page.getByTestId('pack-rune_marked_sword').getByTestId('set-badge-arms_of_the_einherjar')).toBeVisible();

  // Drag it onto the weapon slot.
  await page.getByTestId('pack-rune_marked_sword').dragTo(page.getByTestId('slot-weapon'));
  await expect.poll(() => equipment(page)).toMatchObject({ weapon: 'rune_marked_sword' });
  await expect(page.getByTestId('slot-weapon').getByTestId('set-badge-arms_of_the_einherjar')).toBeVisible();

  // Drag a ring onto the left ring slot, then move it to the right ring slot.
  await page.getByTestId('pack-andvaris_ring').dragTo(page.getByTestId('slot-ring_left'));
  await expect.poll(() => equipment(page)).toMatchObject({ ring_left: 'andvaris_ring' });
  await page.getByTestId('slot-ring_left').dragTo(page.getByTestId('slot-ring_right'));
  await expect.poll(async () => (await equipment(page)).ring_right).toBe('andvaris_ring');
  expect((await equipment(page)).ring_left).toBeUndefined();

  // A helm dragged onto the feet is refused; the comparison for the helm names the head slot.
  await page.getByTestId('pack-boar_crest_helm').dragTo(page.getByTestId('slot-feet'));
  expect((await equipment(page)).feet).toBeUndefined();
  await page.getByTestId('pack-boar_crest_helm').click();
  await expect(page.getByTestId('compare-head')).toBeVisible();

  // Drag the sword from the doll back into the backpack.
  await page.getByTestId('slot-weapon').dragTo(page.getByTestId('hero-backpack'));
  await expect.poll(async () => (await equipment(page)).weapon).toBeUndefined();
  expect(await backpack(page)).toContain('rune_marked_sword');
  expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
});

test('The Winter Oath is playable from New Game: seven Norse missions, Odin fixed, Kaldvik first', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-campaign').click();
  await page.getByTestId('scenario-winter_oath').click();
  await expect(page.locator('.setup-detail')).toContainText('Barrow Light');
  await expect(page.locator('.setup-detail')).toContainText('Oathbreaker’s Hall');
  await page.getByTestId('setup-next').click();
  await page.getByTestId('setup-next').click();
  await page.getByTestId('setup-begin').click();
  await waitFor(page, (s) => s.overlays.includes('briefing'), 'briefing');
  await expect(page.getByTestId('briefing')).toContainText('Barrow Light');
  await page.getByTestId('briefing-begin').click();
  const s = await waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0, 'adventure map');
  expect(s.state.scenario.missionId).toBe('winter_oath_m01');
  expect(s.state.players.player.pantheon.patronGodId).toBe('norse_odin');
  expect(s.state.heroes.hervor.definitionId).toBe('norse_hervor');
  expect(s.state.world.map.biome).toBe('fjord');
  expect(s.campaign.campaignId).toBe('winter_oath');
  expect(errors).toEqual([]);
});
