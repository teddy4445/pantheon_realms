import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {usePrefs} from './momentFixtures';
import {importAndLoad,skirmishDriver,writeSave} from './fixtures';
import {clickHex,inspect,waitFor} from './helpers';
import {voyageFixture,HERO} from './navalFixtures';
const out='docs/owner-polish-v2';
mkdirSync(out,{recursive:true});

test('alohomora unlocks the illustrated book; all invocations can be paged and prepared',async({page})=>{
  await usePrefs(page,{motion:'full'});
  await page.goto('/?e2e');
  await importAndLoad(page,writeSave(skirmishDriver(),'grimoire'));
  await waitFor(page,s=>s.screen==='adventure'&&!s.busy&&!s.overlays.length,'adventure');
  await page.keyboard.press('Backquote');
  await page.locator('#oracle-words').fill(' ALOHOMORA ');
  await page.getByRole('button',{name:'Send',exact:true}).click();
  await expect(page.getByLabel('Unlocking the grimoire')).toBeVisible();
  await page.screenshot({path:`${out}/unlock.png`});
  await expect(page.getByTestId('cheat-page')).toBeVisible();
  await expect(page.locator('.grimoire__entry')).toHaveCount(4);
  await page.screenshot({path:`${out}/grimoire.png`});
  const phrases:string[]=[];
  for(let i=0;i<5;i++){
    phrases.push(...await page.locator('.grimoire__entry code').allTextContents());
    if(i<4)await page.getByRole('button',{name:'Next page',exact:true}).click();
  }
  expect(new Set(phrases).size).toBe(19);
  await expect(page.getByRole('button',{name:'Next page',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:/Prepare invocation/}).first().click();
  await expect(page.locator('#oracle-words')).toHaveValue('echoes of the legion');
  await page.getByRole('button',{name:'Send',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Your will is granted.');
});

test('chronicles ordering, campaign labels and centered briefing',async({page})=>{
  await usePrefs(page,{});
  await page.goto('/?e2e');
  await page.getByTestId('menu-new').click();
  await page.getByTestId('mode-campaign').click();
  const rows=page.locator('.fe-campaign-row');
  await expect(rows.nth(0)).toContainText('The Three Beacons');
  await expect(rows.nth(1)).toContainText('When the Worlds Met');
  for(const name of ['When the Worlds Met','The Ashes of the Accord']){
    const row=rows.filter({hasText:name});
    await expect(row).not.toContainText('Greek');
    await row.click();
    await expect(page.locator('.fe-chronicle__kicker')).not.toContainText('Greek');
  }
  await rows.filter({hasText:'The Silent Oracle'}).click();
  await expect(page.getByTestId('setup-begin')).toHaveText('Start chapter');
  await page.getByTestId('setup-begin').click();
  await expect(page.getByTestId('briefing')).toBeVisible({timeout:60000});
  await expect(page.getByTestId('briefing-facts')).toHaveCount(0);
  const rect=await page.locator('.brief__scroll').boundingBox();
  const viewport=page.viewportSize()!;
  expect(Math.abs(rect!.x+rect!.width/2-viewport.width/2)).toBeLessThan(3);
  expect(Math.abs(rect!.y+rect!.height/2-viewport.height/2)).toBeLessThan(3);
  await page.screenshot({path:`${out}/briefing.png`});
});

test('two clicks on an empty ship move the selected hero toward boarding',async({page})=>{
  await usePrefs(page,{motion:'full',adventureAnimation:'normal'});
  const f=voyageFixture('double-click');
  await page.goto('/?e2e');await importAndLoad(page,f.file);
  await waitFor(page,s=>s.screen==='adventure'&&!s.busy&&!s.overlays.length,'map');
  const ship=f.driver.state.world.ships!.map_ship_free!;
  const before={...f.driver.state.heroes[HERO]!.position};
  await expect.poll(()=>page.evaluate(()=>(globalThis as any).__prHeroes()?.leader_1?.sprite),{timeout:60000}).toBe('ready');
  await expect.poll(()=>page.evaluate(()=>(globalThis as any).__prScenery()?.map?.drawn ?? 0),{timeout:60000}).toBeGreaterThan(0);
  await page.screenshot({path:`${out}/map-scale.png`});
  await clickHex(page,ship.coord.q,ship.coord.r);
  await expect(page.getByTestId('journey-status')).toBeVisible();
  await clickHex(page,ship.coord.q,ship.coord.r);
  await expect.poll(()=>page.evaluate(()=>(globalThis as any).__prHeroes()?.leader_1?.cameraFollowing),{timeout:10000}).toBe(true);
  const moving=await page.evaluate(()=>(globalThis as any).__prHeroes().leader_1);
  await expect.poll(async()=>{
    const next=await page.evaluate(()=>(globalThis as any).__prHeroes().leader_1);
    return Math.hypot(next.x-moving.x,next.y-moving.y);
  },{timeout:10000}).toBeGreaterThan(0);
  await expect.poll(async()=>{
    const s=await inspect(page);
    const h=s.state?.heroes[HERO];
    return !!h && (h.position.q!==before.q || h.position.r!==before.r || s.overlays.includes('confirm'));
  },{timeout:30000}).toBe(true);
});
