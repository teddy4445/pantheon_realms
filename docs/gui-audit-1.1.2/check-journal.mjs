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
await go('journal');
findings.assets=await p.evaluate(async()=>{const urls=[getComputedStyle(document.querySelector('.gui-folio')).backgroundImage.match(/url\("?(.*?)"?\)/)[1],...Array.from(document.querySelectorAll('img')).map(i=>i.src)];return Promise.all(urls.map(async url=>{const im=new Image();im.src=url;try{await im.decode();return {url,width:im.naturalWidth,height:im.naturalHeight};}catch(e){return {url,error:String(e)};}}));});
await shot('journal-decoded');
await fs.writeFile(root+'/journal-asset-check.json',JSON.stringify(findings,null,2));await b.close();
