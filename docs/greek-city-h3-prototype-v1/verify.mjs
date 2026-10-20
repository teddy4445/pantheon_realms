import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=path.dirname(fileURLToPath(import.meta.url));
const server=createServer(async(req,res)=>{
  const target=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return}
  try { const body=await readFile(target);res.setHeader('Content-Type',target.endsWith('.png')?'image/png':target.endsWith('.js')?'text/javascript':'text/html');res.end(body);}
  catch{res.writeHead(404);res.end()}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1600,height:1050},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(url+'/preview.html');
 await page.evaluate(async()=>{await Promise.all([...document.images].map(i=>i.decode()))});
 const assets=await page.evaluate(()=>{
   return [...document.querySelectorAll('.building')].map(img=>{
     const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
     const ctx=c.getContext('2d');ctx.drawImage(img,0,0);
     const a=ctx.getImageData(0,0,c.width,c.height).data;let transparent=0,solid=0,partial=0,maxAlpha=0;
     for(let i=3;i<a.length;i+=4){maxAlpha=Math.max(maxAlpha,a[i]);if(a[i]===0)transparent++;else if(a[i]>=240)solid++;else partial++}
     return {name:img.alt,width:c.width,height:c.height,transparent,solid,partial,maxAlpha,hasAlpha:transparent>0&&solid>0};
   });
 });
 if(assets.length!==18||assets.some(a=>!a.hasAlpha))throw Error('Missing building or invalid transparency: '+JSON.stringify(assets));
 await page.locator('#stage').screenshot({path:path.join(root,'assembled-preview.png')});
 await page.locator('#none').click();
 if(await page.locator('.building:visible').count()!==0)throw Error('Background toggle failed');
 await page.locator('#all').click();
 if(await page.locator('.building:visible').count()!==18)throw Error('Show all failed');
 await page.locator('#list button').first().click();
 await page.locator('#width').fill('30');
 await page.locator('#width').dispatchEvent('input');
 if(await page.locator('.building').first().evaluate(i=>i.style.width)!=='30%')throw Error('Resize failed');
 const download=page.waitForEvent('download');await page.locator('#export').click();
 if((await download).suggestedFilename()!=='greek-city-placements.json')throw Error('Export failed');
 await page.locator('#reset').click();
 await page.locator('#base').click();
 await page.evaluate(async()=>{await Promise.all([...document.querySelectorAll('.building')].map(i=>i.decode()))});
 const baseSources=await page.evaluate(()=>CITY_MANIFEST.buildings.every(b=>document.getElementById('art-'+b.id).getAttribute('src')===b.variants[0].file));
 if(!baseSources)throw Error('Base preset failed');
 await page.locator('#stage').screenshot({path:path.join(root,'base-city-preview.png')});
 const variants=await page.evaluate(()=>CITY_MANIFEST.buildings.flatMap(b=>b.variants.map(v=>({...v,slot:b.id}))));
 if(variants.length!==33||new Set(variants.map(v=>v.id)).size!==33)throw Error('Expected 33 unique catalog versions');
 for(const v of variants){
  await page.locator('#version-'+v.slot).selectOption(v.id);
  const img=page.locator('#art-'+v.slot);
  await img.evaluate(i=>i.decode());
  if(await img.getAttribute('src')!==v.file||await img.getAttribute('alt')!==v.name)throw Error('Version switch failed: '+v.id);
 }
 await page.locator('#maximum').click();
 await page.evaluate(async()=>{await Promise.all([...document.querySelectorAll('.building')].map(i=>i.decode()))});
 await page.locator('#stage').screenshot({path:path.join(root,'assembled-preview.png')});
 await page.locator('#reference').click();
 if(!await page.locator('#concept').isVisible())throw Error('Concept toggle failed');
 await page.goto(url+'/contact-sheet.html');await page.evaluate(async()=>{await Promise.all([...document.images].map(i=>i.decode()))});
 await page.screenshot({path:path.join(root,'contact-sheet.png'),fullPage:true});
 await page.goto(url+'/versions.html');
 await page.evaluate(async()=>{await Promise.all([...document.images].map(i=>i.decode()))});
 const versionAssets=await page.evaluate(()=>[...document.images].map(img=>{
  const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
  const ctx=c.getContext('2d');ctx.drawImage(img,0,0);
  const pixels=ctx.getImageData(0,0,c.width,c.height).data;let transparent=0,solid=0;
  for(let i=3;i<pixels.length;i+=4){if(pixels[i]===0)transparent++;if(pixels[i]>=240)solid++;}
  return {id:img.dataset.buildingId,name:img.alt,width:c.width,height:c.height,transparent,solid,hasAlpha:transparent>0&&solid>0};
 }));
 if(versionAssets.length!==33||versionAssets.some(a=>!a.hasAlpha))throw Error('Version transparency failed: '+JSON.stringify(versionAssets));
 await page.screenshot({path:path.join(root,'all-versions.png'),fullPage:true});
 for(const id of ['civic_hall','mage_guild','fortifications'])await page.locator('#'+id).screenshot({path:path.join(root,id+'-progression.png')});
 if(errors.length)throw Error(errors.join('\n'));
 await writeFile(path.join(root,'validation.json'),JSON.stringify({assets,versionAssets,checks:['33 unique catalog versions load','transparent backgrounds for all versions','all 33 version selectors','base and maximum presets','hide/show all','resize','export JSON','reset','concept toggle','no JavaScript errors']},null,2));
 console.log(JSON.stringify({ok:true,slots:assets.length,versions:versionAssets.length,root}));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
