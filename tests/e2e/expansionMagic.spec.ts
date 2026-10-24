import {test,expect} from '@playwright/test';
test('all 54 painted effects load their own sheets, finish, and clean up',async({page})=>{
 const errors:string[]=[],sheets=new Set<string>();
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.url().includes('/expansion-magic-v2/')){if(r.status()>=400)errors.push(r.url()+': '+r.status());else if(r.url().includes('/effects/'))sheets.add(r.url());}});
 await page.goto('/magic-preview.html');await page.waitForFunction(()=>!!(window as any).magicPreview);
 await expect(page.locator('#spell option')).toHaveCount(54);
 await expect(page.locator('.card')).toHaveCount(54);
 await page.evaluate(()=>{(window as any).magicPreview.speed(.05);});
 await page.evaluate(async()=>{const p=(window as any).magicPreview;for(const id of p.ids)await p.cast(id);});
 expect(errors).toEqual([]);expect(sheets.size).toBe(54);
 expect(await page.evaluate(()=>(window as any).magicPreview.activeEffectCount())).toBe(0);
 await page.evaluate(async()=>{const p=(window as any).magicPreview;p.quality('low');for(const id of p.ids)await p.cast(id);p.quality('high');p.speed(0);for(const id of p.ids)await p.cast(id);});
 expect(await page.evaluate(()=>(window as any).magicPreview.activeEffectCount())).toBe(0);
 expect(errors).toEqual([]);
});

test('gallery filters, replays and stops its tour',async({page})=>{
 await page.goto('/magic-preview.html');await page.waitForFunction(()=>!!(window as any).magicPreview);
 await page.evaluate(()=>{(window as any).magicPreview.speed(.1);});
 await page.getByRole('button',{name:'Japanese',exact:true}).click();
 await expect(page.locator('.card:visible')).toHaveCount(8);
 await page.locator('[data-effect="exp_japanese_paper_blade"]').click();
 await expect(page.locator('#title')).toHaveText('Paper Blade');
 await page.getByRole('button',{name:'Play 8 effects',exact:true}).click();
 await expect(page.getByRole('button',{name:'Stop tour',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Stop tour',exact:true}).click();
 await expect(page.locator('#tour')).toHaveAttribute('aria-pressed','false');
 await page.waitForFunction(()=>!(window as any).magicPreview.busy());
 await page.evaluate(async()=>{const p=(window as any).magicPreview;p.speed(.01);await p.cast('exp_egyptian_judgment_of_anubis');p.speed(2);void p.cast('exp_egyptian_judgment_of_anubis');});
 await page.waitForTimeout(1300);
 await page.screenshot({path:'test-results/painted-magic-anubis.png',fullPage:true});
 await page.evaluate(()=>{(window as any).magicPreview.skip();});
 await page.waitForFunction(()=>!(window as any).magicPreview.busy());
 expect(await page.evaluate(()=>(window as any).magicPreview.activeEffectCount())).toBe(0);
});
