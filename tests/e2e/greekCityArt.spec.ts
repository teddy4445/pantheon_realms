import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { loadCatalog } from '@pr/content';
import { createEnvelope, serializeEnvelope } from '@pr/session';
import { dedicationFixture } from './dedicationFixtures';
import { importAndLoad } from './fixtures';
import { waitFor } from './helpers';
import { usePrefs } from './momentFixtures';

const out=path.resolve('docs/greek-city-h3-prototype-v1/in-game');
mkdirSync(out,{recursive:true});
const catalog=loadCatalog();
const arch=catalog.townArchetypes['greek_polis']!;
for(const level of [1,2,3,4]){
 test(`Greek polis stage ${level}: art, interactions and save compatibility`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const buildings=Object.fromEntries(arch.slots.map(s=>[s.id,Math.min(level,s.chain.length)]));
  const f=dedicationFixture(`Greek City Art Stage ${level}`,{pantheon:'greek',buildings,wallet:{gold:100000,wood:100,stone:100,crystal:100}});
  copyFileSync(f.file,path.join(out,`greek-city-stage-${level}.prsave.json`));
  await usePrefs(page,{});
  await page.goto('/?e2e');
  await importAndLoad(page,f.file);
  await waitFor(page,s=>s.screen==='adventure'&&!s.busy&&s.overlays.length===0,'adventure');
  await page.getByTestId(`town-tab-${f.townId}`).click();
  const scene=page.getByTestId('town-scene');
  await expect(scene).toBeVisible();
  await expect(scene).toHaveCSS('background-image',new RegExp(`greek-city-h3-v1/background.l${level}.png`));
  await scene.locator('img.town-slot__art').evaluateAll(async imgs=>{await Promise.all(imgs.map(i=>(i as HTMLImageElement).decode()));});
  await expect(scene.locator('.town-slot.is-built')).toHaveCount(18);
  const ratio=await scene.evaluate(e=>{const r=e.getBoundingClientRect();return r.width/r.height});
  expect(ratio).toBeCloseTo(1.5,1);
  for(const s of arch.slots){
   const img=page.getByTestId(`slot-${s.id}`).locator('img');
   await expect(img).toHaveAttribute('src',/greek-city-h3-v1\/buildings\//);
   // Every structure remains reachable by keyboard even where foreground art overlaps.
   await page.getByTestId(`slot-${s.id}`).focus();
   await page.keyboard.press('Enter');
   await expect(page.getByTestId('building-popup')).toBeVisible();
   await page.keyboard.press('Escape');
   if(level===4){
    const point=await page.getByTestId(`slot-${s.id}`).evaluate(el=>{
     const r=el.getBoundingClientRect();
     for(const y of [.5,.7,.3,.9,.1])for(const x of [.5,.3,.7,.1,.9]){
      const px=r.x+r.width*x,py=r.y+r.height*y;
      if(document.elementFromPoint(px,py)?.closest('.town-slot')===el)return {x:px,y:py};
     }
     return null;
    });
    expect(point,`${s.id} has a reachable pointer target`).not.toBeNull();
    await page.mouse.click(point!.x,point!.y);
    await expect(page.getByTestId('building-popup')).toHaveAttribute('aria-label',s.label);
    await page.keyboard.press('Escape');
   }
  }
  await page.evaluate(()=>{(document.activeElement as HTMLElement)?.blur()});
  await page.mouse.move(2,2);await page.locator('body').click({position:{x:2,y:2}});
  await page.screenshot({path:path.join(out,`stage-${level}.png`)});
  if(level===1){
   await page.getByTestId('slot-civic_hall').click();
   await expect(page.getByTestId('build')).toBeEnabled();
   await page.getByTestId('build').click();
   await expect(scene).toHaveCSS('background-image',/background.l2.png/);
   await expect(page.getByTestId('slot-civic_hall').locator('img')).toHaveAttribute('src',/civic_hall.l2.png/);
  }
  if(level===4){
   await page.setViewportSize({width:1280,height:720});
   await page.screenshot({path:path.join(out,'stage-4-small.png')});
   const r=await scene.boundingBox();expect(r!.x).toBeGreaterThanOrEqual(0);expect(r!.x+r!.width).toBeLessThanOrEqual(1281);
  }
  expect(errors).toEqual([]);
 });
}

test('war-damaged Greek town keeps the new composition and repairs on upgrade',async({page})=>{
 const f=dedicationFixture('Greek City Recovery',{pantheon:'greek',buildings:{civic_hall:1,tavern:1}});
 (f.state.towns[f.townId]! as {warDamaged:boolean}).warDamaged=true;
 const file=path.join(out,'greek-city-recovery.prsave.json');
 writeFileSync(file,serializeEnvelope(createEnvelope(f.catalog,{match:f.state,campaign:null},{id:'manual-1',kind:'manual',name:'Greek City Recovery',savedAt:new Date(0).toISOString()})));
 await usePrefs(page,{});
 await page.goto('/?e2e');await importAndLoad(page,file);
 await waitFor(page,s=>s.screen==='adventure'&&!s.busy&&s.overlays.length===0,'adventure');
 await page.getByTestId(`town-tab-${f.townId}`).click();
 await expect(page.getByTestId('town-scene')).toHaveCSS('background-image',/greek-city-h3-v1\/background.damaged.png/);
 await page.getByTestId('slot-civic_hall').click();
 await page.getByTestId('build').click();
 await expect(page.getByTestId('town-scene')).toHaveCSS('background-image',/greek-city-h3-v1\/background.l2.png/);
});
