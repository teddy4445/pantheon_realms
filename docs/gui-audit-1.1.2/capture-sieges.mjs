import {chromium} from 'file:///C:/Users/lazeb/Desktop/blannder_models/landing/node_modules/playwright/index.mjs';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
const root=import.meta.dirname,b=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report=[];
try{for(const id of (process.env.PANTHEONS || 'greek,norse,egyptian,japanese,celtic,mesoamerican').split(',')){
 const ctx=await b.newContext({viewport:{width:1600,height:1000},reducedMotion:"reduce"}),p=await ctx.newPage();p.setDefaultTimeout(30000);p.on('pageerror',e=>console.log('UI error',e.message));
 await p.goto('http://127.0.0.1:5196/?e2e',{waitUntil:'networkidle'});await p.getByTestId('menu-load').click();const fc=p.waitForEvent('filechooser');await p.getByRole('button',{name:/Import/}).click();await(await fc).setFiles(path.join('C:/Users/lazeb/Desktop/blannder_models/siege-review-2026-10-10','siege-'+id+'.prsave.json'));await p.getByTestId('save-manual-1').getByText('(imported)').waitFor();await p.getByTestId('save-manual-1').click();await p.getByTestId('load-confirm').click();await p.waitForTimeout(300);if(await p.getByTestId('confirm-ok').isVisible())await p.getByTestId('confirm-ok').click();
 for(let i=0;i<15;i++){await p.waitForTimeout(250);if(await p.getByTestId('story-continue').isVisible()){await p.getByTestId('story-continue').click();continue;}break;}
 await p.waitForFunction(()=>globalThis.__prInspect?.().screen==='battle',{},{timeout:120000});await p.locator('.scene-loading').waitFor({state:'hidden',timeout:120000});
 await p.waitForFunction(()=>{const s=Object.values(globalThis.__prBattle?.()||{});return s.length>=6&&s.every(x=>x.drawn);},{},{timeout:120000});
 await p.waitForTimeout(3000);await p.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));});
 if(await p.getByRole('button',{name:'Turn off tips',exact:true}).isVisible())await p.getByRole('button',{name:'Turn off tips',exact:true}).click();
 const info=await p.evaluate(()=>({battle:globalThis.__prInspect().state.battle.siege,screen:globalThis.__prInspect().screen,drawn:globalThis.__prBattle()}));report.push({id,...info});
 await p.screenshot({path:path.join(root,'siege-after-'+id+'.png')});console.log('Captured',id);await ctx.close();
}}catch(e){console.error(e);process.exitCode=1;}finally{await writeFile(path.join(root,'capture-after-record.json'),JSON.stringify(report,null,2));await b.close();}



