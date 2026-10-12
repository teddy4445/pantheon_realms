import {chromium} from 'file:///C:/Users/lazeb/Desktop/blannder_models/landing/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));await fs.mkdir(path.join(dir,'previews'),{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1600,height:1150},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(pathToFileURL(path.join(dir,'index.html')).href);
async function imgs(){await page.evaluate(async()=>{await Promise.all([...document.images].map(i=>{i.loading='eager';return i.decode().catch(()=>{});}));});const bad=await page.evaluate(()=>[...document.images].filter(i=>!i.naturalWidth).map(i=>i.src));if(bad.length)throw Error('Broken images '+JSON.stringify(bad));}
const factions=['greek','norse','egyptian','japanese','celtic','mesoamerican'],screens=['tavern','recruitment','market','levelup','spellbook','encounter'];const variants=[];
for(const faction of factions){await page.selectOption('#faction',faction);for(const screen of screens){await page.locator(`[data-screen="${screen}"]`).click();await imgs();await page.locator('#stage').screenshot({path:path.join(dir,'previews',`${faction}-${screen}.png`)});variants.push({faction,screen,loaded:true});}}
await page.locator('[data-screen="recruitment"]').click();let forms=0;
for(const faction of factions){await page.selectOption('#faction',faction);for(let tier=1;tier<=7;tier++){await page.locator(`[data-tier="${tier}"]`).click();for(const form of ['base','upgraded']){await page.locator(`[data-form="${form}"]`).click();await imgs();forms++;}}}
await page.locator('#recruit-quantity').fill('4');await page.locator('#recruit-quantity').dispatchEvent('input');if(await page.locator('#recruit-count').inputValue()!=='4')throw Error('Recruit slider');
await page.locator('[data-screen="tavern"]').click();await page.locator('[data-candidate="1"]').click();if(await page.locator('[data-candidate="1"]').getAttribute('aria-pressed')!=='true')throw Error('Candidate selection');
await page.locator('[data-screen="market"]').click();await page.locator('[data-mode="buy"]').click();await page.locator('[data-resource="crystal"]').click();await imgs();
await page.locator('[data-screen="spellbook"]').click();for(const id of ['spark','blessing','ward','warcry','lightning','mend']){await page.locator(`[data-spell="${id}"]`).click();await imgs();}
await page.locator('[data-screen="encounter"]').click();for(const b of ['temperate','alpine','desert','woodland','jungle','volcanic']){await page.selectOption('#biome',b);await imgs();}
const responsive=[];
for(const width of [1366,768,390]){await page.setViewportSize({width,height:1100});await page.selectOption('#faction','greek');for(const screen of screens){await page.locator(`[data-screen="${screen}"]`).click();await imgs();const d=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));responsive.push({screen,...d});if(d.scroll>d.width)throw Error('Horizontal overflow '+screen+' '+width);if(width===390)await page.locator('#stage').screenshot({path:path.join(dir,'previews',`mobile-${screen}.png`)});}}
if(errors.length)throw Error(JSON.stringify(errors));
await fs.writeFile(path.join(dir,'preview-validation.json'),JSON.stringify({status:'passed',scope:'Standalone composition preview only, not integrated game',variants,creatureFormsChecked:forms,biomesChecked:6,spellChoicesChecked:6,responsive,errors},null,2));console.log(JSON.stringify({status:'passed',variants:variants.length,creatureForms:forms,screenshots:42}));await browser.close();
