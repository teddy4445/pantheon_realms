import {chromium} from 'file:///C:/Users/lazeb/Desktop/blannder_models/landing/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const root=import.meta.dirname;
const rows=JSON.parse(await fs.readFile(root+'/catalog.json','utf8')).sort((a,b)=>a.id.localeCompare(b.id));
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
const page=await browser.newPage({viewport:{width:1920,height:1035}});
for(let n=0;n<rows.length;n+=12){
 const group=rows.slice(n,n+12),i=n/12+1;
 const html=`<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#142233;color:#eee;font:15px system-ui}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}figure{margin:0}figcaption{height:31px;padding:4px;box-sizing:border-box}img{width:100%;height:298px;object-fit:contain;display:block;background:#050a10}</style><div class="grid">`+group.map(x=>`<figure><figcaption>${esc(x.id+' · '+x.name)}</figcaption><img src="${esc(x.screenshot)}"></figure>`).join('')+'</div>';
 const file=root+'/contact-sheet-'+i+'.html';await fs.writeFile(file,html);
 await page.goto(pathToFileURL(file).href);await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
 await page.screenshot({path:root+'/contact-sheet-'+i+'.png',timeout:60000});console.log('Contact sheet',i);
}
}finally{await browser.close();}
