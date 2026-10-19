import { test, expect } from '@playwright/test';
import { GameDriver } from '@pr/testing';
import { importAndLoad,writeSave } from './fixtures';
import { usePrefs } from './momentFixtures';
import { inspect,waitFor } from './helpers';
for(const id of ['worlds_met','ashes_accord']) test(`${id}: six native seats and towns remain controllable`,async({page},info)=>{
 test.setTimeout(480000);
 const d=GameDriver.mission(`${id}_m07`,{matchId:`e2e-${id}`});

 const failures:string[]=[];page.on('pageerror',e=>failures.push(e.message));
 await usePrefs(page,{graphicsTested:true,graphicsQuality:'low',uiScale:1,battleSpeed:'instant'});
 await page.goto('/?e2e',{waitUntil:'networkidle'});await importAndLoad(page,writeSave(d,`coalition-${id}`));
 if(await page.getByTestId('briefing-begin').isVisible())await page.getByTestId('briefing-begin').click();
 await waitFor(page,s=>s.screen==='adventure'&&!s.overlays.length,'coalition map');
 await expect(page.locator('.adv-command__towns .town-tab')).toHaveCount(6);
 const first=await inspect(page);const gold=first.state.coalition.treasury.gold;
 for(const p of ['norse','egyptian','japanese','celtic','mesoamerican','greek']){
  await page.getByTestId(`town-tab-cf_${p}_town`).click();
  await waitFor(page,s=>s.screen==='town'&&s.state.activePlayerId===`cf_${p}`,'native town');
  expect((await inspect(page)).state.coalition.treasury.gold).toBe(gold);
  await page.screenshot({path:info.outputPath(`${p}-town.png`),animations:'disabled'});
  // The town's back button follows the ordinary screen navigation.
  await page.getByRole('button',{name:'Back',exact:true}).click();
  await waitFor(page,s=>s.screen==='adventure','return to map');
 }
 await page.screenshot({path:info.outputPath('coalition-map.png')});
 expect(failures).toEqual([]);
});
