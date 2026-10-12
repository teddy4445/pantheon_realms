import {chromium} from 'file:///C:/Users/lazeb/Desktop/blannder_models/landing/node_modules/playwright/index.mjs';
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL,fileURLToPath} from 'node:url';import assert from 'node:assert/strict';
const d=path.dirname(fileURLToPath(import.meta.url));const b=await chromium.launch({channel:'chrome',headless:true});
const result={status:'pending',scope:'Asset gallery and independent HTML layering proof; not game integration',errors:[],viewports:[]};
try {
 const p=await b.newPage({viewport:{width:1600,height:1000}});p.on('pageerror',e=>result.errors.push(e.message));p.on('requestfailed',r=>result.errors.push(r.url()));
 await p.goto(pathToFileURL(path.join(d,'asset-kit.html')).href);
 await p.evaluate(()=>document.querySelectorAll('img').forEach(i=>i.loading='eager'));
 await p.waitForFunction(()=>[...document.images].every(i=>i.complete),null,{timeout:60000});
 const imgs=await p.evaluate(()=>[...document.images].map(i=>({src:i.getAttribute('src'),valid:i.naturalWidth>0})));
 assert(imgs.every(i=>i.valid),JSON.stringify(imgs.filter(i=>!i.valid)));result.loadedImages=imgs.length;
 for(const href of await p.locator('a').evaluateAll(a=>a.map(x=>x.getAttribute('href')))) {
  if(!href||href.startsWith('#')||href.includes('://'))continue;
  assert(fs.existsSync(path.resolve(d,decodeURIComponent(href.split('#')[0])))),href;
 }
 assert.equal(await p.locator('#creatures .pair img').count(),102);
 assert.equal(await p.locator('.banners img').count(),6);
 await p.locator('.title-proof').screenshot({path:path.join(d,'qa-kit-main-menu.png')});
 await p.locator('.banners').screenshot({path:path.join(d,'qa-kit-banners.png')});
 await p.locator('#icons').screenshot({path:path.join(d,'qa-kit-bindings.png')});
 for(const width of [1600,1366,390]) {
  await p.setViewportSize({width,height:900});
  result.viewports.push({width,overflow:await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
 }
 await p.locator('.title-proof').screenshot({path:path.join(d,'qa-kit-main-menu-mobile.png')});
 await p.getByRole('button',{name:'New Game',exact:true}).click();assert((await p.locator('#demo-feedback').textContent()).includes('no game action'));
 // Verify transparent art against both light and dark browser surfaces without altering image pixels.
 await p.setViewportSize({width:1600,height:1000});
 await p.evaluate(()=>{document.querySelectorAll('.tiny img').forEach(i=>i.style.background='#e8d9b9');});
 await p.locator('.banners').screenshot({path:path.join(d,'qa-kit-banners-light.png')});
 const data=JSON.parse(fs.readFileSync(path.resolve(d,'../../assets-runtime/frontend-kit-v1.1.0/manifest.json'),'utf8'));
 const keys=Object.keys(data.assets).filter(k=>k.includes('.icon.'));
 await p.setContent('<html><style>body{margin:30px;background:#112332;color:#f0d7a9;font:16px Georgia}.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:24px}article{padding:10px;border:1px solid #54606b}img{object-fit:contain;vertical-align:middle}span{display:block;margin:10px}</style><h1>Production icons at 32px / 48px / 96px</h1><div class="grid">'+keys.map(k=>{const u=pathToFileURL(path.resolve(d,'../../assets-runtime',data.assets[k].file)).href;return '<article>'+[32,48,96].map(s=>`<img src="${u}" width="${s}" height="${s}">`).join('')+`<span>${k.replace('frontendkit.icon.','')}</span></article>`}).join('')+'</div></html>');
 await p.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth));await p.screenshot({path:path.join(d,'qa-kit-icons-sizes.png'),fullPage:true});
 assert(result.viewports.every(v=>!v.overflow));assert.equal(result.errors.length,0);result.status='passed';
}catch(e){result.status='failed';result.error=String(e);process.exitCode=1;}finally{fs.writeFileSync(path.join(d,'kit-gallery-validation.json'),JSON.stringify(result,null,2));await b.close();}
console.log(JSON.stringify(result));
