import {chromium} from 'file:///C:/Users/lazeb/Desktop/blannder_models/landing/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
const dir=path.dirname(fileURLToPath(import.meta.url));
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1600,height:1000}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const report={scope:'Standalone component/art preview only; not an integrated game test',errors,viewports:[],themes:[]};
await page.goto(pathToFileURL(path.join(dir,'component-preview.html')).href);
await page.waitForLoadState('load');
const manifest=JSON.parse(fs.readFileSync(path.join(dir,'../../assets-runtime/ui-v1.1.0/manifest.json'),'utf8'));
report.newImageDecode=await page.evaluate(async files=>Promise.all(files.map(src=>new Promise(resolve=>{let im=new Image();im.onload=()=>resolve({src,ok:true});im.onerror=()=>resolve({src,ok:false});im.src='../../assets-runtime/'+src;}))),Object.values(manifest.assets).map(a=>a.file));
report.initialConfirmDisabled=await page.locator('#confirm').isDisabled();
await page.locator('[name=reward][value=Gold]').check();
report.selectDoesNotConfirm=await page.evaluate(()=>window.demoConfirmCount===0);
await page.locator('#confirm').click();
await page.evaluate(()=>document.querySelector('#confirm').dispatchEvent(new MouseEvent('click')));
report.singleConfirmation=await page.evaluate(()=>window.demoConfirmCount===1);
await page.locator('#later').click();
report.resetNoSelection=await page.locator('[name=reward]:checked').count()===0;
for(const theme of ['greek','norse','egyptian','japanese','celtic','mesoamerican']){
 await page.locator('#theme').selectOption(theme);
 report.themes.push({theme,stage:await page.locator('#stage').evaluate(e=>getComputedStyle(e).backgroundImage),merchant:await page.locator('#merchant').getAttribute('src')});
}
await page.locator('#theme').selectOption('greek');
await page.screenshot({path:path.join(dir,'preview-desktop.png'),fullPage:false});
await page.locator('.folio').screenshot({path:path.join(dir,'preview-folio.png')});
await page.locator('#frames').screenshot({path:path.join(dir,'preview-frames.png')});
for(const [width,height] of [[1920,1080],[1600,1000],[1280,720],[390,844]]){
 await page.setViewportSize({width,height});
 report.viewports.push(await page.evaluate(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,horizontalOverflow:document.documentElement.scrollWidth>innerWidth,brokenImages:[...document.images].filter(im=>!im.complete||im.naturalWidth===0).map(im=>im.src)})));
}
await page.locator('#encounter').scrollIntoViewIfNeeded();
await page.screenshot({path:path.join(dir,'preview-small.png')});
await page.emulateMedia({reducedMotion:'reduce'});
report.reducedMotionTransitions=await page.locator('.pr-button').first().evaluate(e=>getComputedStyle(e).transitionDuration);
await page.goto(pathToFileURL(path.join(dir,'index.html')).href);
await page.evaluate(async()=>{const imgs=[...document.images];imgs.forEach(i=>i.loading='eager');await Promise.all(imgs.map(i=>i.decode().catch(()=>{})));});
report.gallery={cards:await page.locator('.asset').count(),brokenImages:await page.evaluate(()=>[...document.images].filter(i=>!i.naturalWidth).map(i=>i.src))};
report.pass=!errors.length&&report.newImageDecode.every(i=>i.ok)&&report.initialConfirmDisabled&&report.selectDoesNotConfirm&&report.singleConfirmation&&report.resetNoSelection&&report.viewports.every(v=>!v.horizontalOverflow&&!v.brokenImages.length)&&report.gallery.cards===36&&!report.gallery.brokenImages.length;
fs.writeFileSync(path.join(dir,'preview-validation.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
await browser.close();
if(!report.pass)process.exitCode=1;
