import {chromium} from 'file:///C:/Users/lazeb/Desktop/blannder_models/landing/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
const root=import.meta.dirname,old='C:/Users/lazeb/Desktop/blannder_models/gui-review-2026-10-10';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:1600,height:1000},reducedMotion:'reduce'});
// Isolated review context only: expose the already-created store for representative visual state staging.
// No project source is modified, and no user browser profile or saves are used.
await context.route('**/packages/ui/src/index.ts',async route=>{const response=await route.fetch();const body=(await response.text()).replace('const store = new AppStore(catalog, platform);','const store = new AppStore(catalog, platform); globalThis.__reviewStore = store;');await route.fulfill({response,body});});
const page=await context.newPage();page.setDefaultTimeout(60000);page.setDefaultNavigationTimeout(120000);
page.on('pageerror',e=>console.log('PAGE ERROR',e.message));
await page.goto('http://127.0.0.1:5196/?e2e',{waitUntil:'networkidle'});
await fs.mkdir(root+'/screenshots',{recursive:true});
let code=await fs.readFile(old+'/capture-base.js','utf8');
code=code.replaceAll('greek_hoplite','hoplite').replace("'three_beacons','greek_zeus'","'three_beacons',__reviewStore.catalog.campaigns.three_beacons.startingGodOptions[0]").replace("townId:'westharbor',heroId:'alexios'","townId:'asterion',heroId:'alexios'");
code=code.slice(0,code.indexOf("await snap('S01'"));
code=code.replace('await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})))',`const urls=new Set();for(const e of document.querySelectorAll('*')){const r=e.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight||r.width===0||r.height===0)continue;for(const m of getComputedStyle(e).backgroundImage.matchAll(/url\\("?(.*?)"?\\)/g))urls.add(m[1]);if(e instanceof HTMLImageElement){e.loading='eager';urls.add(e.currentSrc||e.src);}}await Promise.race([Promise.all([...urls].map(async url=>{const i=new Image();i.src=url;await i.decode().catch(()=>{});})),new Promise(r=>setTimeout(r,60000))]);`);

code+=`await page.evaluate(()=>{const s=__reviewStore;s.startScenario('skirmish_twin_harbors');s.disableHints();globalThis.__reviewSkirmish=s.session.snapshot();s.startCampaign('three_beacons',s.catalog.campaigns.three_beacons.startingGodOptions[0]);s.disableHints();globalThis.__reviewCampaign=s.session.snapshot();});`;
for(const name of ['repair-body.js','panels-body.js'])code+=(await fs.readFile(old+'/'+name,'utf8')).replace('return {count:records.length,errors};','').replace("root+'/../siege-review-2026-10-10/siege-greek.prsave.json'","'C:/Users/lazeb/Desktop/blannder_models/siege-review-2026-10-10/siege-greek.prsave.json'");

try{await new Function('page','context','browser','root','return (async()=>{'+code+'})()')(page,context,browser,root);}catch(e){console.error('Capture stopped:',e.stack);}
await fs.writeFile(root+'/capture-method.txt','Latest 1.1.2 source via fresh Vite server. Screens staged only in isolated browser context through an in-memory store exposure; not a traversal/functionality test. Separate Playwright tests exercise visible controls. No source implementation or user saves modified.');
await browser.close();

