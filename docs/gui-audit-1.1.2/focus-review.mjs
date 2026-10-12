import {chromium} from 'file:///C:/Users/lazeb/Desktop/blannder_models/landing/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
const root=import.meta.dirname,b=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const c=await b.newContext({viewport:{width:1600,height:1000},reducedMotion:'reduce'});
await c.route('**/packages/ui/src/index.ts',async r=>{const response=await r.fetch();await r.fulfill({response,body:(await response.text()).replace('const store = new AppStore(catalog, platform);','const store = new AppStore(catalog, platform); globalThis.__reviewStore=store;')});});
const p=await c.newPage();p.setDefaultTimeout(60000);p.setDefaultNavigationTimeout(120000);
await p.goto('http://127.0.0.1:5196/?e2e',{waitUntil:'networkidle'});
const findings={};
async function go(id,params={}){await p.evaluate(({id,params})=>{const s=__reviewStore;s.overlays=[];s.story=[];s.hints=[];s.moments=[];s.resetTo(id,params);},{id,params});await p.waitForTimeout(500);}
async function shot(id){await p.screenshot({path:root+'/screenshots/'+id+'.png',timeout:60000});console.log('Focus capture',id);}
await p.evaluate(()=>{const s=__reviewStore;s.startCampaign('three_beacons',s.catalog.campaigns.three_beacons.startingGodOptions[0]);s.disableHints();s.story=[];s.moments=[];s.notify();});
await shot('D01');await go('hero');await shot('S07');await go('journal');await p.waitForTimeout(2500);await shot('journal-confirmed');
findings.journal=await p.locator('.gui-folio,.gui-folio__page,.gui-folio-wrap').evaluateAll(es=>es.map(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return {class:e.className,rect:r.toJSON(),background:s.background,overflow:s.overflow,clipPath:s.clipPath,color:s.color,contain:s.contain,position:s.position};}));
await p.setViewportSize({width:540,height:700});await shot('journal-narrow');await p.setViewportSize({width:1600,height:1000});
await go('adventure');await p.evaluate(()=>__reviewStore.openOverlay({kind:'shortcuts'}));await shot('D05');
await go('adventure');await p.evaluate(()=>__reviewStore.openOverlay({kind:'save-load',mode:'load'}));await shot('D04');
await go('adventure');await p.evaluate(()=>{__reviewStore.session.state.outcome={status:'victory',reason:'Visual review',winnerIds:['player']};__reviewStore.openOverlay({kind:'debrief'});});await shot('D15');
await go('adventure');await p.evaluate(()=>{__reviewStore.session.state.outcome={status:'defeat',reason:'Visual review'};__reviewStore.openOverlay({kind:'mission-failed'});});await shot('D17');
await p.evaluate(()=>{const s=__reviewStore;s.startScenario('skirmish_twin_harbors');s.disableHints();s.overlays=[];s.story=[];s.moments=[];s.notify();});
for(const [id,status] of [['D18','victory'],['D19','defeat']]){await go('adventure');await p.evaluate(status=>{__reviewStore.session.state.outcome={status,reason:'Visual review',winnerIds:[status==='victory'?'player':'rival']};__reviewStore.openOverlay({kind:'game-over'});},status);await shot(id);}
await go('main-menu');await p.evaluate(()=>__reviewStore.resetSetup('campaign'));await go('scenario-select');findings.difficulty=await p.locator('.setting-block__label').evaluateAll(es=>es.map(e=>({text:e.textContent,color:getComputedStyle(e).color})));await shot('campaign-confirmed');
await fs.writeFile(root+'/focus-evidence.json',JSON.stringify(findings,null,2));await b.close();
