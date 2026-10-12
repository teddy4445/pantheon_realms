import {chromium} from 'file:///C:/Users/lazeb/Desktop/blannder_models/landing/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1600,height:1100},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(pathToFileURL(path.join(dir,'index.html')).href);
async function images(){await page.evaluate(async()=>{await Promise.all([...document.images].map(i=>{i.loading='eager';return i.decode().catch(()=>{});}));});return page.evaluate(()=>[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src));}
const checks=[];
for(const faction of ['greek','norse','egyptian','japanese','celtic','mesoamerican']){await page.selectOption('#faction',faction);checks.push({faction,broken:await images(),portraits:await page.locator('.hero').evaluateAll(els=>els.map(e=>e.alt)),slots:await page.locator('.slot').count()});}
await page.selectOption('#faction','greek');await images();
await page.locator('#army-left .slot').first().click();
await page.locator('#quantity').fill('5');await page.locator('#quantity').dispatchEvent('input');
if(await page.locator('#amount').inputValue()!=='5')throw Error('Quantity control');
await page.locator('#army-right .slot').nth(3).click();
if(!(await page.locator('#feedback').textContent()).includes('5 creatures'))throw Error('Transfer feedback');
const names={meeting:'hero-meeting',intro:'scenario-introduction',reward:'reward-presentation'};
for(const [screen,name] of Object.entries(names)){await page.locator(`[data-screen="${screen}"]`).click();await images();await page.locator('#'+screen).screenshot({path:path.join(dir,'concept-'+name+'.png')});}
await page.locator('[data-screen="intro"]').click();await page.locator('#dialogue-next').click();
if(await page.locator('#speaker').textContent()!=='Alexios')throw Error('Dialogue next');
await page.locator('#dialogue-next').click();if(await page.locator('#speaker').textContent()!=='Thaleia')throw Error('Dialogue back');
await page.locator('#begin').click();if(!(await page.locator('#feedback').textContent()).includes('second game session'))throw Error('Begin');
await page.locator('[data-screen="reward"]').click();await page.locator('#reward-continue').click();if(!(await page.locator('#feedback').textContent()).includes('second time'))throw Error('Reward');
const responsive=[];
for(const width of [1366,768,390]){await page.setViewportSize({width,height:1100});for(const [screen,name] of Object.entries(names)){await page.locator(`[data-screen="${screen}"]`).click();await images();const sizes=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:innerWidth}));responsive.push({width,screen,...sizes});if(sizes.scroll>sizes.viewport)throw Error('Horizontal overflow '+screen+' '+width);if(width===390)await page.locator('#'+screen).screenshot({path:path.join(dir,'mobile-'+name+'.png')});}}
const broken=await images();if(errors.length||broken.length||checks.some(c=>c.broken.length))throw Error(JSON.stringify({errors,broken,checks}));
const links=await page.locator('a').evaluateAll(els=>els.map(a=>a.href).filter(h=>h.startsWith('file:')));
for(const link of links){const u=new URL(link);u.hash='';await fs.access(fileURLToPath(u));}
const result={status:'passed',generatedAt:new Date().toISOString(),scope:'Static assembled reference preview only; game integration not implemented or tested',runtimeErrors:errors,brokenImages:broken,factions:checks,responsive,controls:['troop quantity and destination feedback','dialogue next/back','begin briefing feedback','reward dismiss feedback'],screenshots:3,mobileScreenshots:3,localLinksVerified:links.length};
await fs.writeFile(path.join(dir,'preview-validation.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));await browser.close();
