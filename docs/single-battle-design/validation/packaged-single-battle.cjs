const { _electron: electron, expect } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os');
(async () => {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-180-smoke-'));
  const app = await electron.launch({ executablePath: path.resolve('apps/desktop/release/win-unpacked/Pantheon Realms.exe'), args: [`--user-data-dir=${userData}`, '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'], env: { ...process.env, PR_DEV_URL: 'https://example.invalid/' } });
  try {
    const page = await app.firstWindow(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.getByTestId('menu-new').waitFor({ timeout: 60000 });
    if (!page.url().startsWith('prgame://app/')) throw Error('Wrong origin');
    await page.evaluate(() => localStorage.setItem('pantheon-realms.preferences.v1', JSON.stringify({ graphicsTested:true, tutorialHints:false, motion:'reduced', battleSpeed:'instant' })));
    await page.goto('prgame://app/index.html?e2e');
    await page.getByTestId('menu-new').waitFor();
    if (!(await page.locator('.main-menu__footer').innerText()).includes('1.8.0')) throw Error('Wrong version');
    if (!(await page.evaluate(() => typeof window.prDesktop==='object' && typeof window.require==='undefined'))) throw Error('Invalid desktop bridge');
    await page.getByTestId('menu-new').click();await page.getByTestId('mode-single').click();
    for (const mode of ['Land','Siege','Naval','Sea']) {
      await page.getByRole('button',{name:mode==='Sea'?'Naval':mode,exact:true}).click();
      if(mode==='Sea')await page.getByLabel('Layout',{exact:true}).selectOption('sea');
      await page.locator('.sb-defender').getByRole('button',{name:'Player',exact:true}).click();
      await page.screenshot({path:`docs/single-battle-design/validation/packaged-${mode.toLowerCase()}-setup.png`});
      await page.getByRole('button',{name:'Deploy',exact:true}).click();
      await page.getByTestId('deploy-confirm').click();await page.getByTestId('deploy-confirm').click();
      await page.getByTestId('battle-surrender').waitFor();
      await page.screenshot({path:`docs/single-battle-design/validation/packaged-${mode.toLowerCase()}-battle.png`});
      await page.getByTestId('battle-surrender').click();await page.getByTestId('confirm-ok').click();
      await page.getByTestId('single-battle-result').waitFor();
      console.log(`PASS: packaged ${mode} setup, assets, deployment, battle and result`);
      await page.getByRole('button',{name:'Edit setup',exact:true}).click();
    }
    if(errors.length)throw Error(errors.join('\n'));
    console.log('PASS: version 1.8.0, packaged origin, desktop bridge, all four battle types; no JavaScript errors.');
  } finally { await app.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
