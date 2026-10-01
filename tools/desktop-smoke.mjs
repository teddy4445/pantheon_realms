// Desktop smoke test: launches the packaged-layout Electron app (apps/desktop
// with dist/ + renderer/), checks the renderer loads from prgame://app/, the
// desktop bridge is present, Quit is offered, a manual save round-trips to
// disk, sounds decode and may start without a click, and no navigation escapes the app origin.
//
// Usage: npm run build && npm run desktop:build && xvfb-run -a node tools/desktop-smoke.mjs
// Packaged: PR_SMOKE_EXE=apps/desktop/release/linux-unpacked/pantheon-realms xvfb-run -a node tools/desktop-smoke.mjs
// (the packaged run also sets PR_DEV_URL, which an installed build must ignore).
// (--no-sandbox is passed only because CI containers run as root.)
import { _electron as electron } from '@playwright/test';
import { mkdtemp, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const userData = await mkdtemp(path.join(tmpdir(), 'pr-desktop-'));
const env = { ...process.env };
delete env.PR_DEV_URL;
// SwiftShader flags let the WebGL scene render under Xvfb (test-only; not used by the app).
// PR_SMOKE_EXE=<packaged executable> checks an installed-layout build (app.isPackaged true)
// instead of the development layout in apps/desktop.
const flags = ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', `--user-data-dir=${userData}`];
const exe = process.env.PR_SMOKE_EXE;
const app = exe ? await electron.launch({ executablePath: exe, args: flags, env: { ...env, PR_DEV_URL: 'https://example.invalid/' } }) : await electron.launch({ args: [...flags, 'apps/desktop'], env });
const fail = (m) => {
  console.error('DESKTOP SMOKE FAIL:', m);
  process.exitCode = 1;
};
try {
  const win = await app.firstWindow();
  await win.waitForSelector('[data-testid=menu-new]', { timeout: 30000 });
  const url = win.url();
  if (!url.startsWith('prgame://app/')) fail(`unexpected origin ${url}`);
  const bridge = await win.evaluate(() => typeof window.prDesktop === 'object' && typeof window.require === 'undefined' && typeof window.process === 'undefined');
  if (!bridge) fail('desktop bridge missing or Node exposed to the renderer');
  if ((await win.locator('[data-testid=menu-quit]').count()) !== 1) fail('Quit is not offered on desktop');
  const footer = await win.locator('.main-menu__footer').innerText();
  if (!footer.includes('Desktop build')) fail('platform not detected as desktop');
  await win.screenshot({ path: path.join(process.env.PR_SMOKE_OUT ?? '.', 'desktop-menu.png') });
  // Bundled GLB models are served by the app protocol under the CSP (binary intact).
  const glbs = (await readdir('apps/desktop/renderer/assets').catch(() => [])).filter((f) => f.endsWith('.glb'));
  if (glbs.length === 0) fail('no bundled GLB in the renderer build');
  for (const g of glbs) {
    const magic = await win.evaluate(async (name) => {
      const res = await fetch(`./assets/${name}`);
      const b = new Uint8Array(await res.arrayBuffer());
      return String.fromCharCode(b[0], b[1], b[2], b[3]);
    }, g);
    if (magic !== 'glTF') fail(`GLB ${g} not served intact (magic "${magic}")`);
  }
  // Mounted adventure-map heroes: the six GLBs come from the app's own heroes/ folder.
  const heroGlbs = await win.evaluate(async () => {
    const m = await (await fetch('./heroes/animation_manifest.json')).json();
    const out = [];
    for (const a of m.assets) {
      const res = await fetch(`./heroes/${a.runtime}`);
      const b = new Uint8Array(await res.arrayBuffer());
      out.push({ runtime: a.runtime, ok: res.ok && b.length === a.runtime_bytes, magic: String.fromCharCode(b[0], b[1], b[2], b[3]) });
    }
    return out;
  });
  if (heroGlbs.length !== 6 || heroGlbs.some((h) => !h.ok || h.magic !== 'glTF')) fail(`mounted hero GLBs not served intact: ${JSON.stringify(heroGlbs)}`);
  // Sound: the app protocol serves the Ogg files intact, they decode, and audio may start
  // without a click (the desktop app sets the autoplay policy; browsers wait for a click).
  const audio = await win.evaluate(async () => {
    const m = await (await fetch('./audio/manifest.json')).json();
    const ctx = new AudioContext();
    let decoded = 0;
    for (const s of m.sounds.slice(0, 6)) {
      const buf = await (await fetch(`./${s.files[0]}`)).arrayBuffer();
      await ctx.decodeAudioData(buf);
      decoded++;
    }
    const state = ctx.state;
    await ctx.close();
    return { sounds: m.sounds.length, decoded, state };
  });
  if (audio.decoded !== 6) fail('sound files did not decode');
  if (audio.state !== 'running') fail(`audio did not start without a click (state ${audio.state})`);
  // Start a campaign and save into slot 1 through the UI.
  await win.click('[data-testid=menu-campaign]');
  await win.click('[data-testid=setup-next]');
  await win.click('[data-testid=setup-next]');
  await win.click('[data-testid=setup-begin]');
  await win.click('[data-testid=briefing-begin]');
  await win.waitForTimeout(1500);
  await win.keyboard.press('Escape');
  await win.click('text=Save Game');
  await win.click('[data-testid=save-manual-1]');
  await win.click('[data-testid=save-confirm]');
  await win.waitForTimeout(800);
  const files = await readdir(path.join(userData, 'saves')).catch(() => []);
  if (!files.includes('manual-1.json')) fail(`save file not written (found: ${files.join(', ')})`);
  await win.screenshot({ path: path.join(process.env.PR_SMOKE_OUT ?? '.', 'desktop-save.png') });
  // High scores live in their own records file next to the preferences, never in saves/.
  const records = await win.evaluate(async () => {
    await window.prDesktop.writeRecords(JSON.stringify({ schemaVersion: 1, entries: [] }));
    return window.prDesktop.readRecords();
  });
  if (!records || !records.includes('schemaVersion')) fail('records store not written');
  const recordFiles = await readdir(userData).catch(() => []);
  if (!recordFiles.includes('records.json')) fail(`records.json not written (found: ${recordFiles.join(', ')})`);
  if ((await readdir(path.join(userData, 'saves')).catch(() => [])).some((f) => f.startsWith('records'))) fail('records leaked into saves/');
  // Navigation away from the app origin is blocked.
  await win.evaluate(() => {
    window.location.href = 'https://example.com/';
  });
  await win.waitForTimeout(800);
  if (!win.url().startsWith('prgame://app/')) fail(`navigation escaped to ${win.url()}`);
  let packaged = null;
  if (exe) {
    // Installed layout: packaged flag set, PR_DEV_URL ignored (checked above via the origin), no DevTools.
    packaged = await app.evaluate(async ({ app: a, BrowserWindow }) => {
      const w = BrowserWindow.getAllWindows()[0];
      w.webContents.openDevTools();
      await new Promise((r) => setTimeout(r, 500));
      return { isPackaged: a.isPackaged, name: a.getName(), devTools: w.webContents.isDevToolsOpened() };
    });
    if (!packaged.isPackaged) fail('executable is not a packaged build');
    if (packaged.devTools) fail('DevTools opened in the packaged build');
    if (packaged.name !== 'Pantheon Realms') fail(`unexpected app name ${packaged.name}`);
  }
  if (!process.exitCode) console.log('DESKTOP SMOKE OK', { url, saves: files, records: 'records.json', glbs, heroGlbs: heroGlbs.length, audio, ...(packaged ? { packaged } : {}) });
} catch (e) {
  fail(e instanceof Error ? e.message : String(e));
} finally {
  await app.close();
}
