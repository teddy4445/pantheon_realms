import { test, expect } from '@playwright/test';
import { usePrefs } from './momentFixtures';
import { inspect, waitFor } from './helpers';

test('Single Battle setup, library, keyboard placement and all encounter boards',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await usePrefs(page,{graphicsTested:true,motion:'reduced',battleSpeed:'instant'});
  await page.goto('/?e2e');await page.getByTestId('menu-new').click();
  await expect(page.getByTestId('mode-single')).toBeVisible();
  await page.screenshot({path:'docs/single-battle-design/implemented-new-game.png'});
  await page.getByTestId('mode-single').click();await expect(page.getByTestId('single-battle-setup')).toBeVisible();
  await expect(page.getByRole('button',{name:'Deploy',exact:true})).toBeEnabled();
  await expect(page.getByTestId('single-battle-setup')).not.toContainText('Hero');
  await page.getByRole('button',{name:'Add attacker stack 4',exact:true}).click();
  await page.getByLabel('Search creatures').fill('hoplite');
  await page.getByTestId('single-creature-picker').locator('.sb-picker-grid button').first().click();
  await expect(page.locator('.sb-attacker .sb-stack')).toHaveCount(4);
  await page.getByRole('button',{name:'Undo',exact:true}).click();await expect(page.locator('.sb-attacker .sb-stack')).toHaveCount(3);
  await page.getByRole('button',{name:'Redo',exact:true}).click();await expect(page.locator('.sb-attacker .sb-stack')).toHaveCount(4);
  await page.getByRole('button',{name:'Undo',exact:true}).click();
  await page.getByRole('button',{name:'Save preset',exact:true}).click();await page.getByRole('button',{name:'Battle library',exact:true}).click();await expect(page.getByRole('button',{name:'Load',exact:true})).toBeVisible();await page.getByRole('button',{name:'Load',exact:true}).click();
  await page.screenshot({path:'docs/single-battle-design/implemented-land-setup.png'});
  for(const mode of ['Siege','Naval']){await page.getByRole('button',{name:mode,exact:true}).click();await expect(page.getByRole('button',{name:'Deploy',exact:true})).toBeEnabled();await page.screenshot({path:`docs/single-battle-design/implemented-${mode.toLowerCase()}-setup.png`});}
  await page.getByLabel('Layout',{exact:true}).selectOption('sea');await expect(page.getByRole('button',{name:'Deploy',exact:true})).toBeEnabled();
  await page.screenshot({path:'docs/single-battle-design/implemented-sea-setup.png'});
  expect(await page.locator('img').evaluateAll(imgs=>imgs.filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src))).toEqual([]);
  await page.setViewportSize({width:1024,height:768});expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  expect(errors).toEqual([]);
});

for(const mode of ['Land','Siege','Naval','Sea']) test(`${mode}: deploy, finish, rematch and replay`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await usePrefs(page,{graphicsTested:true,motion:'reduced',battleSpeed:'instant'});
  await page.goto('/?e2e');await page.getByTestId('menu-new').click();await page.getByTestId('mode-single').click();
  if(mode!=='Land')await page.getByRole('button',{name:mode==='Sea'?'Naval':mode,exact:true}).click();
  if(mode==='Sea')await page.getByLabel('Layout',{exact:true}).selectOption('sea');
  // Use two local players to inspect every phase without AI racing the UI.
  await page.locator('.sb-defender').getByRole('button',{name:'Player',exact:true}).click();
  await page.getByRole('button',{name:'Deploy',exact:true}).click();
  await page.getByTestId('deploy-confirm').click();await page.getByTestId('deploy-confirm').click();
  await waitFor(page,s=>!s.busy&&s.screen==='battle'&&s.state.battle?.round===1,'battle begins');
  const state=(await inspect(page)).state;expect(Object.keys(state.heroes)).toHaveLength(0);expect(state.battle.sides.attacker.commander).toBeNull();
  await page.screenshot({path:`docs/single-battle-design/implemented-${mode.toLowerCase()}-battle.png`});
  await page.getByTestId('battle-surrender').click();await page.getByTestId('confirm-ok').click();
  await expect(page.getByTestId('single-battle-result')).toBeVisible();
  const original=(await inspect(page)).state.standalone.spec;
  await page.getByRole('button',{name:'Watch replay',exact:true}).click();await expect(page.getByTestId('single-battle-result')).toBeVisible({timeout:60000});
  await page.getByRole('button',{name:'Rematch',exact:true}).click();await expect(page.getByTestId('deploy-confirm')).toBeVisible();
  expect((await inspect(page)).state.standalone.spec).toEqual(original);expect(errors).toEqual([]);
});

test('AI spectator battle completes and pause stops its orders',async({page})=>{
  await usePrefs(page,{graphicsTested:true,motion:'reduced',battleSpeed:'instant'});
  await page.goto('/?e2e');await page.getByTestId('menu-new').click();await page.getByTestId('mode-single').click();
  await page.locator('.sb-attacker').getByRole('button',{name:'AI',exact:true}).click();
  for(const input of await page.locator('.sb-defender input[type=number]').all())await input.fill('1');
  await page.getByRole('button',{name:'Deploy',exact:true}).click();
  await waitFor(page,s=>s.screen==='battle'&&!!s.state.battle,'spectator battlefield');
  await page.keyboard.press('Escape');await expect(page.getByTestId('pause')).toBeVisible();
  await waitFor(page,s=>!s.busy,'pause settles');const revision=(await inspect(page)).state.revision;
  await page.waitForTimeout(350);expect((await inspect(page)).state.revision).toBe(revision);
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await page.getByTestId('settings-back').click();
  await expect(page.getByTestId('single-battle-result')).toBeVisible({timeout:90000});
  expect((await inspect(page)).state.lastBattleResult.outcome).not.toBe('stalemate');
  await page.getByRole('button',{name:'Rematch',exact:true}).click();
  await expect(page.getByTestId('single-battle-result')).toBeVisible({timeout:90000});
});

test('unfinished sea battle saves and resumes with its board and armies intact',async({page})=>{
  await usePrefs(page,{graphicsTested:true,motion:'reduced',battleSpeed:'instant'});
  await page.goto('/?e2e');await page.getByTestId('menu-new').click();await page.getByTestId('mode-single').click();
  await page.getByRole('button',{name:'Naval',exact:true}).click();await page.getByLabel('Layout',{exact:true}).selectOption('sea');
  await page.getByRole('button',{name:'Deploy',exact:true}).click();await expect(page.getByTestId('deploy-confirm')).toBeVisible();
  const before=(await inspect(page)).state;
  await page.keyboard.press('Escape');await page.getByRole('button',{name:'Save Game',exact:true}).click();
  await page.getByTestId('save-manual-1').click();await page.locator('#save-name').fill('Single sea test');await page.getByTestId('save-confirm').click();
  await expect(page.getByTestId('save-manual-1')).toContainText('Single sea test');
  await page.getByRole('tab',{name:'Load',exact:true}).click();await page.getByTestId('load-confirm').click();await page.getByTestId('confirm-ok').click();
  await expect(page.getByTestId('deploy-confirm')).toBeVisible();
  const after=(await inspect(page)).state;expect(after.battle).toEqual(before.battle);expect(after.standalone).toEqual(before.standalone);expect(after.heroes).toEqual({});
});
