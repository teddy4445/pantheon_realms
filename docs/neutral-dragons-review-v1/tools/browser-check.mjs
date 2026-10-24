import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
await mkdir(path.join(root,'qa'),{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().includes('favicon'))errors.push(r.status()+' '+r.url());});
await page.goto('http://127.0.0.1:4182/');await page.waitForFunction(()=>window.dragonReview?.ready,{timeout:30000});
const states=await page.evaluate(()=>window.dragonReview.states),visited=[];
for(const family of ['yinglong','zilant','cuelebre']){
 await page.locator(`[data-family="${family}"]`).click();
 for(const state of states){
  await page.evaluate(async({family,state})=>{await window.dragonReview.select(family,state);window.dragonReview.pause();},{family,state});
  assert.equal(await page.locator('#pair article').count(),2);assert.equal(await page.locator('.frames canvas').count(),12);
  await page.locator('#frame').evaluate((el,n)=>{el.value=String(n);el.dispatchEvent(new Event('input',{bubbles:true}));},state==='death'?5:2);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert.equal(await page.locator('#error').isVisible(),false);
  visited.push({family,state});
  if(['idle','fly','ability','death'].includes(state)){
   await page.screenshot({path:path.join(root,'qa',family+'-'+state+'.png')});
  }
 }
}
await page.evaluate(()=>window.dragonReview.select('yinglong','idle'));
await page.locator('#speed').selectOption('1.5');await page.locator('#tour').click();
await page.waitForFunction(()=>document.querySelector('#state').value==='move',{timeout:10000});
await page.locator('#tour').click();
await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(root,'qa','mobile.png'),fullPage:true});
const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
assert.equal(overflow,false,'mobile horizontal overflow');assert.deepEqual(errors,[]);
await writeFile(path.join(root,'design/browser-check.json'),JSON.stringify({status:'passed',visited,checks:['39 family/state selections','12 visible pose thumbnails per selection','no missing resources or script errors','tour advances through looping state','mobile has no page overflow'],errors},null,2));
await browser.close();console.log(JSON.stringify({status:'passed',states:visited.length,errors}));
