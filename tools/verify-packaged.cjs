const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const asar = require('@electron/asar');
const { _electron, expect: baseExpect } = require('@playwright/test');
const expect=baseExpect.configure({timeout:60000});

(async () => {
  const release = path.resolve(process.argv[2]);
  const archive = path.join(release, 'win-unpacked/resources/app.asar');
  const version = require('../apps/desktop/package.json').version;
  const packaged = JSON.parse(asar.extractFile(archive, 'package.json'));
  assert.equal(packaged.version, version);
  const dist = path.resolve('apps/client/dist');
  assert.deepEqual(asar.extractFile(archive, path.join('renderer', 'index.html')), fs.readFileSync(path.join(dist, 'index.html')));
  for (const name of fs.readdirSync(path.join(dist, 'assets')).filter(n => /\.(js|css)$/.test(n))) {
    assert.deepEqual(asar.extractFile(archive, path.join('renderer', 'assets', name)), fs.readFileSync(path.join(dist, 'assets', name)), name);
  }
  const entries = asar.listPackage(archive).join('\n');
  for (const asset of ['greek-city-h3-v1', 'pantheon-cities-h3-v1', 'map-town-development-v1', 'map-landmarks-v1', 'map-life-v1', 'expansion-magic-v2', 'neutral-dragons-v1', 'world-expansion-v1', 'world-polish-v2']) assert.ok(entries.includes(asset), asset);
  const optimized=JSON.parse(asar.extractFile(archive,'renderer/optimized-assets.json'));
  assert.ok(optimized.report.converted>0);
  for(const file of new Set(Object.values(optimized.assets))) {
    assert.deepEqual(asar.extractFile(archive,path.join('renderer',file)),fs.readFileSync(path.resolve('apps/desktop/renderer',file)),file);
  }
  const icons = require('../assets-runtime/expansion-magic-v2/icons.json');
  assert.equal(Object.keys(icons).length, 54);
  const effects = require('../assets-runtime/expansion-magic-v2/manifest.json');
  assert.equal(Object.keys(effects).length, 54);
  for (const effect of Object.values(effects)) assert.equal(effect.strip.frames, 8);
  for (const file of [...Object.values(icons), ...Object.values(effects).map(effect => effect.strip.file)]) {
    assert.deepEqual(asar.extractFile(archive, path.join('renderer', ...file.split('/'))), fs.readFileSync(path.resolve('assets-runtime', file)), file);
  }
  console.log('Packaged version, assets and exact JS/CSS comparison passed.');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-release-check-'));
  const app = await _electron.launch({
    executablePath: path.join(release, 'win-unpacked', 'Pantheon Realms.exe'),
    args: [`--user-data-dir=${profile}`, '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    env: { ...process.env, PR_DEV_URL: 'http://127.0.0.1:1' },
    timeout: 60000,
  });
  app.process().stderr.on('data', data => process.stderr.write(data));
  app.process().on('exit', (code, signal) => console.log('Packaged process exit:', code, signal));
  try {
    // Keep this automated smoke check out of the user's foreground workspace.
    await app.evaluate(({ app: electronApp, BrowserWindow }) => {
      const hide = win => {
        win.webContents.setBackgroundThrottling(false);
        win.on('show', () => win.hide());
        win.hide();
      };
      electronApp.on('browser-window-created', (_event, win) => hide(win));
      BrowserWindow.getAllWindows().forEach(hide);
    });
    const page = await app.firstWindow();
    const capture=async(name)=>{
      const png=await app.evaluate(async({BrowserWindow})=>(await BrowserWindow.getAllWindows()[0].webContents.capturePage(undefined,{stayHidden:true,stayAwake:true})).toPNG().toString('base64'));
      fs.writeFileSync(path.join(release,name),Buffer.from(png,'base64'));
    };
    page.on('crash', () => console.error('Packaged renderer crashed.'));
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await expect(page.getByTestId('menu-new')).toBeVisible({ timeout: 60000 });
    console.log('Packaged main menu visible.');
    assert.ok(page.url().startsWith('prgame://app'));
    assert.equal(await page.evaluate(() => window.prDesktop.appVersion), version);
    assert.equal(await page.evaluate(() => typeof window.require), 'undefined');
    await expect(page.locator('body')).toContainText(version);
    // Exercise every stable PNG URL through the packaged protocol, which must
    // serve its WebP derivative with the correct MIME type and preserve alpha.
    const decoded=await page.evaluate(async()=>{
      const manifest=await(await fetch('./optimized-assets.json')).json();
      const files=Object.keys(manifest.assets),bad=[];let cursor=0;
      async function worker(){while(cursor<files.length){const file=files[cursor++];try{
        const response=await fetch('./'+file);
        if(!response.ok||!response.headers.get('content-type')?.includes('image/webp'))throw new Error('response');
        const bitmap=await createImageBitmap(await response.blob());
        if(bitmap.width<1)throw new Error('empty');bitmap.close();
      }catch{bad.push(file);}}}
      await Promise.all([worker(),worker()]);return {count:files.length,bad};
    });
    assert.deepEqual(decoded.bad,[]);console.log(`All ${decoded.count} optimized artwork URLs decoded in packaged Electron.`);
    await page.getByTestId('menu-new').click();
    await expect(page.getByText('Campaign', { exact: true }).first()).toBeVisible();
    await capture('packaged-new-game.png');
    assert.deepEqual(errors, []);
    console.log(`Packaged ${version} launch and New Game passed.`);
    await page.evaluate(()=>window.prDesktop.writePreferences(JSON.stringify({graphicsTested:true,graphicsQuality:'high',tutorialHints:false,motion:'reduced',battleSpeed:'instant'})));
    await page.goto('prgame://app/index.html?e2e');
    await page.getByTestId('menu-new').click();await page.getByTestId('mode-single').click();
    for(const mode of ['Land','Siege','Naval']) {
      await page.getByRole('button',{name:mode,exact:true}).click();
      await page.locator('.sb-defender').getByRole('button',{name:'Player',exact:true}).click();
      await page.getByRole('button',{name:'Deploy',exact:true}).click();
      await page.getByTestId('deploy-confirm').click();await page.getByTestId('deploy-confirm').click();
      await expect(page.getByTestId('battle-surrender')).toBeVisible({timeout:60000});
      await expect.poll(()=>page.evaluate(()=>{
        const stacks=Object.values(globalThis.__prBattle?.()??{});
        return stacks.length>0&&stacks.every(s=>s.sprite==='ready');
      })).toBe(true);
      await expect(page.locator('.scene-error')).toHaveCount(0);
      await page.getByTestId('battle-surrender').click();await page.getByTestId('confirm-ok').click();
      await expect(page.getByTestId('single-battle-result')).toBeVisible();
      await page.getByRole('button',{name:'Edit setup',exact:true}).click();
      console.log(`Packaged ${mode} deployment, battle and results passed.`);
    }
    await page.goto('prgame://app/index.html?e2e');
    await page.getByTestId('menu-new').click();await page.getByTestId('mode-campaign').click();
    await page.getByTestId('scenario-three_beacons').click();await page.getByTestId('setup-begin').click();
    await page.getByTestId('briefing-begin').click();
    await expect(page.locator('.scene-viewport canvas')).toBeVisible({timeout:60000});
    for(let i=0;i<20;i++){
      if(await page.getByTestId('story-continue').isVisible())await page.getByTestId('story-continue').click();
      else break;
    }
    await expect.poll(()=>page.evaluate(()=>globalThis.__prGround?.()?.cache?.covering??false),{timeout:60000}).toBe(true);
    await expect(page.locator('.scene-error')).toHaveCount(0);
    await page.keyboard.press('Escape');await page.getByText('Save Game',{exact:true}).click();
    await page.getByTestId('save-manual-1').click();await page.getByTestId('save-confirm').click();
    await expect.poll(()=>fs.existsSync(path.join(profile,'saves/manual-1.json'))).toBe(true);
    assert.deepEqual(errors,[]);
    console.log('Packaged campaign map and manual save passed; no JavaScript errors.');
  } finally {
    await app.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
