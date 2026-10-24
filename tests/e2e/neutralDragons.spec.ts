import {mkdirSync} from 'node:fs';
import {test,expect} from '@playwright/test';
import {buildCatalog} from '@pr/content';
import {usePrefs} from './momentFixtures';
import {neutralBattle} from './v2battleFixtures';
import {importAndLoad} from './fixtures';
import {inspect,waitFor} from './helpers';
const out='docs/neutral-dragons-integration-v1';mkdirSync(out,{recursive:true});
const pairs=[['neutral_rain_dragon','neutral_celestial_rain_dragon'],['neutral_zilant','neutral_crowned_zilant'],['neutral_cuelebre','neutral_ancient_cuelebre']];
const catalog=buildCatalog();
test('all six dragons have encyclopedia pages, final sprites, gameplay animations, lore and hiring information',async({page})=>{
  test.setTimeout(360000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const failed:string[]=[];page.on('response',r=>{if(r.url().includes('neutral-dragons-v1') && r.status()>=400)failed.push(r.url());});
  await usePrefs(page,{});
  await page.goto('/?e2e',{waitUntil:'networkidle'});
  await page.getByTestId('menu-encyclopedia').click();
  await page.getByTestId('codex-filter-neutral').click();
  for(const [base,up] of pairs){
    for(const id of [base!,up!]){
      const card=page.getByTestId('codex-'+id);
      await expect(card).toContainText(catalog.creatures[id]!.name);
      await expect(card.locator('img')).toHaveAttribute('src',new RegExp(`neutral-dragons-v1/${id}/portrait-320.webp`));
    }
    await page.getByTestId('codex-'+base).click();
    for(const id of [base!,up!]){
      await page.getByTestId('unit-form-'+id).click();
      await expect(page.getByTestId('unit-name')).toHaveText(catalog.creatures[id]!.name);
      await expect(page.getByTestId('unit-hiring')).toContainText('guarded dragon lairs');
      await expect(page.getByTestId('unit-forms-note')).toContainText('1,300 Gold');
      await expect(page.getByTestId('viewer-sprite-status')).toHaveAttribute('data-status','final',{timeout:60000});
      for(const anim of ['idle','move','attack','hit','defend','victory','takeoff','fly','landing','ability','death']){
        await expect(page.getByTestId('anim-'+anim)).toHaveAttribute('data-own','yes');

      }
      await page.getByTestId('anim-idle').click();
      await page.waitForTimeout(750);
      await page.screenshot({path:`${out}/${id}.png`});
    }
    await page.getByRole('button',{name:'Back',exact:true}).first().click();
    await waitFor(page,s=>s.screen==='encyclopedia','encyclopedia');
  }
  expect(failed).toEqual([]);expect(errors).toEqual([]);
});

test('Monsoon Ward selects two allies, commits once and plays the painted effect without missing assets',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const files:string[]=[];page.on('response',r=>{if(r.url().includes('neutral-dragons-v1')){expect(r.status()).toBeLessThan(400);files.push(r.url());}});
  const f=neutralBattle('dragon-ward',{player:[
    {key:'dragon',side:'attacker',creatureId:'neutral_celestial_rain_dragon',count:2,at:[3,4]},
    {key:'a',side:'attacker',creatureId:'neutral_crowned_zilant',count:2,at:[5,5]},
    {key:'b',side:'attacker',creatureId:'neutral_ancient_cuelebre',count:2,at:[4,2]},
  ],enemy:[{key:'e',side:'defender',creatureId:'neutral_rain_dragon',count:3,at:[11,4]}],order:['dragon','a','b','e']});
  await usePrefs(page,{battleSpeed:1});await page.goto('/?e2e',{waitUntil:'networkidle'});await importAndLoad(page,f.file);
  await waitFor(page,s=>s.screen==='battle'&&!s.busy,'battle ready',60000);
  await page.getByRole('button',{name:/Monsoon Ward/}).first().click();
  await expect(page.getByTestId('battle-ability-confirm')).toBeDisabled();
  await page.getByTestId('battle-ability-target-'+f.ids.a).click();
  await page.getByTestId('battle-ability-target-'+f.ids.b).click();
  await page.screenshot({path:`${out}/two-target-selection.png`});
  await page.getByTestId('battle-ability-confirm').click();
  await waitFor(page,s=>!s.busy && s.state.battle.stacks[f.ids.dragon!].abilityUses?.neutral_celestial_rain_dragon_special===1,'ward finished',60000);
  const s=await inspect(page);
  for(const key of ['a','b']) expect(s.state.battle.stacks[f.ids[key]!].statuses).toContainEqual(expect.objectContaining({kind:'damage_ward',amount:30}));
  expect(files.some(f=>f.endsWith('/special-fx.webp'))).toBe(true);
  await page.screenshot({path:`${out}/battle-dragons.png`});
  expect(errors).toEqual([]);
});
