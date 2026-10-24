import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { createEnvelope, serializeEnvelope } from '@pr/session';
import { dedicationFixture, PANTHEONS } from './dedicationFixtures';
import { importAndLoad } from './fixtures';
import { clickHex, inspect, waitFor } from './helpers';
import { usePrefs } from './momentFixtures';

const out=path.resolve('docs/restoration-temples-v1/in-game');
mkdirSync(out,{recursive:true});
for (const [index,pantheon] of PANTHEONS.entries()) test(`${pantheon}: restore a sanctuary through the real map`,async({page,browser})=>{
  const f=dedicationFixture(`restore ${pantheon}`,{pantheon});
  const size=index%2?'large':'small', choice=index%3;
  const site=f.state.world.restorationSites!.find(s=>s.kind.type==='map_event'&&s.kind.restoration?.pantheonId===pantheon&&s.kind.restoration.size===size)!;
  expect(site,`generated ${pantheon} ${size}`).toBeTruthy();
  if(site.kind.type!=='map_event')throw new Error('Not a temple');
  const hero=f.state.heroes[f.heroId]!;
  hero.position={...site.coord};hero.spellbook=true;hero.knownSpellIds=[];hero.skills=[{skillId:'wisdom',rank:3}];
  const gift=site.kind.options[choice]!;
  const beforeGold=f.state.players.player!.wallet.gold;
  const save=()=>serializeEnvelope(createEnvelope(f.catalog,{match:f.state,campaign:null},{id:'manual-1',kind:'manual',name:`Restore ${pantheon}`,savedAt:new Date(0).toISOString()}));
  writeFileSync(f.file,save());
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await usePrefs(page,{graphicsTested:true,motion:'reduced'});
  await page.goto('/?e2e');
  if(index===0){
    const count=await page.evaluate(async()=>{
      const manifest=await(await fetch('./world-expansion-v1/manifest.json')).json();
      const entries=Object.values({...manifest.sites,...manifest.decor}) as {file:string}[];
      await Promise.all(entries.map(async a=>{const img=new Image();img.src='./'+a.file;await img.decode();}));
      return entries.length;
    });expect(count).toBe(36);
  }
  await importAndLoad(page,f.file);
  await waitFor(page,s=>s.screen==='adventure'&&!s.busy&&!s.overlays.length,'map ready');
  await expect.poll(()=>page.evaluate(id=>(globalThis as any).__prScenery()?.map?.sites.find((s:any)=>s.id===id),site.id),{timeout:60000}).toMatchObject({loaded:true,sprite:`map.site.temple.${pantheon}.${size}.ruined`});
  await page.screenshot({path:path.join(out,`${pantheon}-ruined-map.png`)});
  const dialog=page.getByTestId('map-event');
  await expect(async()=>{if(!await dialog.isVisible())await clickHex(page,site.coord.q,site.coord.r);await expect(dialog).toBeVisible({timeout:1000});}).toPass({timeout:15000});
  await expect(dialog.locator('figure img')).toHaveAttribute('src',new RegExp(`${pantheon}-${size}-ruined`));
  await page.getByTestId(`event-option-${choice}`).click();
  await expect(page.getByTestId('event-confirm')).toBeEnabled();
  await dialog.locator('img').evaluateAll(images=>Promise.all(images.map(i=>(i as HTMLImageElement).decode())));
  await page.screenshot({path:path.join(out,`${pantheon}-offering.png`)});
  await page.getByTestId('event-confirm').click();
  await expect.poll(async()=>(await inspect(page)).state.world.sites[site.id].claimed).toBe(true);
  const s=(await inspect(page)).state;
  expect(s.players.player.wallet.favor).toBe(100-(size==='small'?8:20));
  expect(s.world.sites[site.id].open).toBe(true);
  if(choice===0)expect(s.players.player.wallet.gold).toBe(beforeGold+(size==='small'?700:2000));
  if(choice===1)expect(s.heroes[f.heroId].army.slots.some((x:any)=>x?.creatureId===gift.reward.creatures![0]!.creatureId&&x.count>=gift.reward.creatures![0]!.count)).toBe(true);
  if(choice===2)expect(s.heroes[f.heroId].knownSpellIds).toContain(gift.teachSpellId);
  await page.screenshot({path:path.join(out,`${pantheon}-reward.png`)});
  await page.getByTestId('reward-continue').click();
  await expect.poll(()=>page.evaluate(id=>(globalThis as any).__prScenery()?.map?.sites.find((x:any)=>x.id===id),site.id),{timeout:60000}).toMatchObject({loaded:true,sprite:`map.site.temple.${pantheon}.${size}.built`});
  expect((await inspect(page)).state.world.sites[site.id].claimed).toBe(true);
  await page.screenshot({path:path.join(out,`${pantheon}-restored-map.png`)});
  if(index===0){
    // A fresh storage context avoids selecting the earlier imported slot with the same ID.
    f.state=s;writeFileSync(f.file,save());await page.close();
    const fresh=await browser.newPage({viewport:{width:1600,height:900}});
    await usePrefs(fresh,{graphicsTested:true,motion:'reduced'});await fresh.goto('http://127.0.0.1:5173/?e2e');
    await importAndLoad(fresh,f.file);
    await waitFor(fresh,x=>x.screen==='adventure'&&!x.busy&&!x.overlays.length,'restored reload');
    expect((await inspect(fresh)).state.world.sites[site.id].claimed).toBe(true);
    await expect.poll(()=>fresh.evaluate(id=>(globalThis as any).__prScenery()?.map?.sites.find((x:any)=>x.id===id),site.id),{timeout:60000}).toMatchObject({loaded:true,sprite:`map.site.temple.${pantheon}.${size}.built`});
    await fresh.close();
  }
  expect(errors).toEqual([]);
});
