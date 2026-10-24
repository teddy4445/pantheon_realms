import { copyFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { dedicationFixture } from './dedicationFixtures';
import { importAndLoad } from './fixtures';
import { waitFor } from './helpers';
import { usePrefs } from './momentFixtures';

const out = path.resolve('docs/map-landmarks-v1/in-game');
mkdirSync(out, { recursive: true });
for (const pantheon of ['greek', 'egyptian', 'japanese']) test(`${pantheon}: landmarks load on an ordinary map and survive reopening`, async ({ page }) => {
  const f = dedicationFixture(`${pantheon} landmark preview`, { pantheon, buildings: { civic_hall: 3 } });
  copyFileSync(f.file, path.join(out, `${pantheon}.prsave.json`));
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await usePrefs(page, {});
  await page.goto('/?e2e');
  if (pantheon === 'greek') {
    const count = await page.evaluate(async () => {
      const manifest = await (await fetch('./map-landmarks-v1/manifest.json')).json();
      const files = Object.values(manifest.decor) as { file: string }[];
      await Promise.all(files.map(async entry => { const image = new Image(); image.src = './' + entry.file; await image.decode(); }));
      return files.length;
    });
    expect(count).toBe(12);
  }
  await importAndLoad(page, f.file);
  await waitFor(page, s => s.screen === 'adventure' && !s.busy && !s.overlays.length, 'map');
  const landmarks = () => page.evaluate(() => (globalThis as any).__prScenery()?.map?.landmarks ?? []);
  await expect.poll(async () => (await landmarks()).filter((l: any) => l.loaded && l.shown).length, { timeout: 60_000 }).toBeGreaterThan(0);
  const before = await landmarks();
  const first = before.find((l: any) => l.loaded && l.shown);
  for (let i = 0; i < 5; i++) {
    const p = await page.evaluate(c => (globalThis as any).__prProject('adventure', c.q, c.r), first);
    if (!p || Math.abs(p.x - 670) + Math.abs(p.y - 480) < 20) break;
    await page.mouse.move(670, 480);
    await page.mouse.down();
    await page.mouse.move(670 + Math.max(-450, Math.min(450, 670 - p.x)), 480 + Math.max(-300, Math.min(300, 480 - p.y)), { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(200);
  }
  await page.mouse.move(1300, 850);
  await page.screenshot({ path: path.join(out, `${pantheon}.png`) });
  await page.getByTestId(`town-tab-${f.townId}`).click();
  await page.keyboard.press('Escape');
  await waitFor(page, s => s.screen === 'adventure', 'reopen map');
  await expect.poll(async () => (await landmarks()).length).toBe(before.length);
  expect((await landmarks()).map(({ id, q, r }: any) => ({ id, q, r }))).toEqual(before.map(({ id, q, r }: any) => ({ id, q, r })));
  expect(errors).toEqual([]);
});
import { writeFileSync } from 'node:fs';
import { createEnvelope, serializeEnvelope } from '@pr/session';
import { clickHex, inspect } from './helpers';
import { installLandmarks } from '@pr/rules';

for (const kind of ['statue', 'tree', 'waterfall', 'ruins']) test(`${kind}: illustrated visit and reward through real map input`, async ({ page }) => {
  const f = dedicationFixture(`interactive ${kind}`, { pantheon: 'greek' });
  if (kind === 'waterfall') {
    // Golden Fords has no walkable cliff beside water: author a small cascade for this UI fixture.
    const c = f.state.world.landmarkSites![0]!.coord;
    const map = f.state.world.map, cells = map.terrain.split('');
    cells[c.r * map.width + c.q] = 'm'; cells[c.r * map.width + c.q + 1] = 'w';
    f.state.world.map = { ...map, terrain: cells.join('') };
    for (const s of f.state.world.landmarkSites!) delete f.state.world.sites[s.id];
    delete f.state.world.landmarkSites;
    installLandmarks(f.catalog, f.state);
  }
  const site = f.state.world.landmarkSites?.find(s => s.kind.type === 'map_event' && s.kind.landmark === kind);
  expect(site, `generated ${kind}`).toBeTruthy();
  f.state.heroes[f.heroId]!.position = { ...site!.coord };
  f.state.heroes[f.heroId]!.mana = 0;
  const env = createEnvelope(f.catalog, {match:f.state,campaign:null}, {id:'manual-1',kind:'manual',name:`Visit ${kind}`,savedAt:new Date(0).toISOString()});
  writeFileSync(f.file, serializeEnvelope(env));
  copyFileSync(f.file,path.join(out,`visit-${kind}.prsave.json`));
  await usePrefs(page, {}); await page.goto('/?e2e'); await importAndLoad(page,f.file);
  await waitFor(page,s=>s.screen==='adventure'&&!s.busy&&!s.overlays.length,'map ready');
  await expect.poll(() => page.evaluate(id => (globalThis as any).__prScenery()?.map?.sites.find((s:any)=>s.id===id)?.loaded,site!.id)).toBe(true);
  const dialog=page.getByTestId('map-event');
  await expect(async()=>{ if(!await dialog.isVisible()) await clickHex(page,site!.coord.q,site!.coord.r); await expect(dialog).toBeVisible({timeout:1000}); }).toPass({timeout:15000});
  await expect(dialog.locator('img').first()).toBeVisible();
  await dialog.locator('img').evaluateAll(images => Promise.all(images.map(i => (i as HTMLImageElement).decode())));
  await page.screenshot({path:path.join(out,`visit-${kind}.png`)});
  const choice=kind==='ruins'?1:kind==='tree'?1:0;
  await page.getByTestId(`event-option-${choice}`).click();
  await page.getByTestId('event-confirm').click();
  await expect.poll(async()=>{
    const s=(await inspect(page)).state;
    return kind==='ruins'?s.world.sites[site!.id].claimed:!!s.world.sites[site!.id].landmarkVisits?.[f.heroId];
  }).toBe(true);
  if(kind==='statue'||kind==='tree') expect((await inspect(page)).state.heroes[f.heroId].landmarkBlessing.kind).toBe(kind==='statue'?'courage':'protection');
  await page.screenshot({path:path.join(out,`reward-${kind}.png`)});
});

test('ruins: challenging guardians opens the battlefield without a reward or lingering choice dialog', async ({page})=>{
  const f=dedicationFixture('ruins challenge',{pantheon:'greek'});
  const site=f.state.world.landmarkSites!.find(s=>s.kind.type==='map_event'&&s.kind.landmark==='ruins')!;
  f.state.heroes[f.heroId]!.position={...site.coord};
  const gold=f.state.players.player!.wallet.gold;
  writeFileSync(f.file,serializeEnvelope(createEnvelope(f.catalog,{match:f.state,campaign:null},{id:'manual-1',kind:'manual',name:'Ruins challenge',savedAt:new Date(0).toISOString()})));
  await usePrefs(page,{}); await page.goto('/?e2e'); await importAndLoad(page,f.file);
  await waitFor(page,s=>s.screen==='adventure'&&!s.busy&&!s.overlays.length,'map');
  await expect.poll(()=>page.evaluate(id=>(globalThis as any).__prScenery()?.map?.sites.find((s:any)=>s.id===id)?.loaded,site.id)).toBe(true);
  const dialog=page.getByTestId('map-event');
  await expect(async()=>{if(!await dialog.isVisible()) await clickHex(page,site.coord.q,site.coord.r);await expect(dialog).toBeVisible({timeout:1000});}).toPass({timeout:15000});
  await page.getByTestId('event-option-0').click(); await page.getByTestId('event-confirm').click();
  const result=await waitFor(page,s=>s.screen==='battle'&&!!s.state.battle,'guardian battle');
  expect(result.overlays).not.toContain('map-event');
  expect(result.state.players.player.wallet.gold).toBe(gold);
  expect(result.state.world.sites[site.id].claimed).toBe(false);
});
