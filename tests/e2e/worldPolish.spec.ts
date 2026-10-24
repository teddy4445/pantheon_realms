import { mkdirSync,writeFileSync } from 'node:fs';
import path from 'node:path';
import { test,expect } from '@playwright/test';
import { createEnvelope,serializeEnvelope } from '@pr/session';
import { dedicationFixture,PANTHEONS } from './dedicationFixtures';
import { importAndLoad } from './fixtures';
import { waitFor,clickHex } from './helpers';
import { usePrefs } from './momentFixtures';
const out=path.resolve('docs/world-polish-v2/in-game');mkdirSync(out,{recursive:true});
const colors=['#3b73d9','#c0392b','#2e9e5b','#c98a1b','#8a4fc2','#1f9fa6'];
const colorNames=['blue','red','green','amber','purple','teal'];
const biomes=['autumn','fjord','desert','temperate','moor','jungle'] as const;
for(const [index,pantheon]of PANTHEONS.entries())test(`${pantheon}: painted banner, flags, diverse scenery and seamless ground`,async({page})=>{
 const f=dedicationFixture(`world polish ${pantheon}`,{pantheon});
 f.state.players.player!.color=colors[index]!;
 f.state.world.map={...f.state.world.map,biome:biomes[index]!};
 const site=f.state.world.restorationSites!.find(s=>s.kind.type==='map_event'&&s.kind.restoration?.pantheonId===pantheon&&s.kind.restoration.size==='small')!;
 f.state.heroes[f.heroId]!.position={...site.coord};
 writeFileSync(f.file,serializeEnvelope(createEnvelope(f.catalog,{match:f.state,campaign:null},{id:'manual-1',kind:'manual',name:`World polish ${pantheon}`,savedAt:new Date(0).toISOString()})));
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await usePrefs(page,{graphicsTested:true,motion:'reduced'});await page.goto('/?e2e');
 if(index===0){
  const count=await page.evaluate(async()=>{const m=await(await fetch('./world-polish-v2/manifest.json')).json();const entries=Object.values({...m.decor,...m.banners}) as {file:string}[];await Promise.all(entries.map(async a=>{const img=new Image();img.src='./'+a.file;await img.decode();}));return entries.length;});expect(count).toBe(70);
 }
 await importAndLoad(page,f.file);await waitFor(page,s=>s.screen==='adventure'&&!s.busy&&!s.overlays.length,'ready');
 await expect.poll(()=>page.evaluate(()=>(globalThis as any).__prScenery()?.map?.ids.filter((id:string)=>id.startsWith('scenery2.')).length??0)).toBeGreaterThan(5);
 await expect.poll(()=>page.evaluate(color=>(globalThis as any).__prScenery()?.map?.sites.some((s:any)=>s.flag===`map.flag.standard.${color}`&&s.flagLoaded),colorNames[index]),{timeout:60000}).toBe(true);
 await expect.poll(()=>page.evaluate(()=>(globalThis as any).__prGround()?.mosaicTextures??0),{timeout:60000}).toBe(6);
 await page.mouse.move(1550,850);await page.screenshot({path:path.join(out,`${pantheon}-map.png`)});
 const dialog=page.getByTestId('map-event');
 await expect(async()=>{if(!await dialog.isVisible())await clickHex(page,site.coord.q,site.coord.r);await expect(dialog).toBeVisible({timeout:1000});}).toPass({timeout:15000});
 const banner=page.getByTestId('temple-banner');await expect(banner).toBeVisible();
 await expect(banner).toHaveCSS('background-image',new RegExp(`banner-${pantheon}.webp`));
 await page.evaluate(async p=>{const img=new Image();img.src=`./world-polish-v2/banner-${p}.webp`;await img.decode();},pantheon);
 await page.screenshot({path:path.join(out,`${pantheon}-temple.png`)});
 expect(errors).toEqual([]);
});
