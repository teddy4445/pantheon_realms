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
// SwiftShader flags let the WebGL 2D views render under Xvfb (test-only; not used by the app).
// PR_SMOKE_EXE=<packaged executable> checks an installed-layout build (app.isPackaged true)
// instead of the development layout in apps/desktop.
// Local Windows acceptance can use the same hardware renderer as the installed game.
const flags = [...(process.env.PR_SMOKE_HARDWARE === '1' ? [] : ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']), `--user-data-dir=${userData}`];
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
  // 2D sprites (creature strips, map avatars and figures, map sites, decoration, obstacles,
  // siege pieces, projectiles, effects): every file in the sprite manifest is served by the
  // app protocol and decodes; no 3D model file is shipped.
  const sprites = await win.evaluate(async () => {
    const m = await (await fetch('./sprites/manifest.json')).json();
    const files = new Set();
    const add = (d) => {
      if (d && typeof d.file === 'string') files.add(d.file);
      for (const v of Object.values(d?.directions ?? {})) add(v);
    };
    for (const section of ['creatures', 'heroes']) {
      for (const set of Object.values(m[section])) {
        for (const a of Object.values(set.animations)) add(a);
        if (set.figure) add(set.figure);
      }
    }
    for (const section of ['sites', 'decor', 'obstacles', 'siege', 'projectiles', 'effects']) for (const d of Object.values(m[section])) add(d);
    const bad = [];
    for (const f of files) {
      try {
        const res = await fetch(`./${f}`);
        const bmp = await createImageBitmap(await res.blob());
        if (!res.ok || bmp.width < 4) bad.push(f);
        bmp.close();
      } catch {
        bad.push(f);
      }
    }
    return { files: files.size, creatures: Object.keys(m.creatures).length, heroes: Object.keys(m.heroes).length, bad };
  });
  if (sprites.files < 100 || sprites.creatures < 102 || sprites.heroes < 7 || sprites.bad.length) fail(`2D sprites not served or not decodable: ${JSON.stringify({ ...sprites, bad: sprites.bad.slice(0, 5) })}`);
  const models = (await readdir('apps/desktop/renderer', { recursive: true }).catch(() => [])).filter((f) => /\.(glb|gltf|blend)$/i.test(String(f)));
  if (models.length) fail(`3D model files shipped: ${models.slice(0, 5).join(', ')}`);
  // Painted art (story, ground and sky, big moments): every file in the art manifest is
  // served by the app protocol and decodes at its registered size.
  const art = await win.evaluate(async () => {
    const m = await (await fetch('./art/manifest.json')).json();
    const bad = [];
    let n = 0;
    for (const a of Object.values(m.assets)) {
      n += 1;
      try {
        const res = await fetch(`./${a.file}`);
        const bmp = await createImageBitmap(await res.blob());
        if (!res.ok || bmp.width !== a.width || bmp.height !== a.height) bad.push(a.file);
        bmp.close();
      } catch {
        bad.push(a.file);
      }
    }
    return { files: n, bad };
  });
  if (art.files < 1 || art.bad.length) fail(`painted art not served or not decodable: ${JSON.stringify(art.bad.slice(0, 5))}`);
  // The additive packs use their own native atlas manifests, outside art/manifest.json.
  const expansion = await win.evaluate(async () => {
    const library = await (await fetch('./mythic-library-v2/manifest.json')).json();
    const twins = await (await fetch('./twin-campaigns-v1/manifest.json')).json();
    const files = new Map();
    for (const f of Object.values(library.frames)) files.set(`mythic-library-v2/${f.file}`, [f.imageWidth, f.imageHeight]);
    for (const a of twins.assets) files.set(a.runtime.replace(/^assets-runtime\//, ''), [a.width, a.height]);
    const bad = [];
    for (const [file, size] of files) {
      try {
        const res = await fetch(`./${file}`);
        const bmp = await createImageBitmap(await res.blob());
        if (!res.ok || bmp.width !== size[0] || bmp.height !== size[1]) bad.push(file);
        bmp.close();
      } catch { bad.push(file); }
    }
    return { files: files.size, bad };
  });
  if (expansion.files !== 40 || expansion.bad.length) fail(`expansion artwork unavailable: ${JSON.stringify(expansion)}`);
  // Mouse cursors (1x and 2x) and the final icons (emblems among them) are served by the
  // app protocol and decode; the interface cursor variable points at the delivered arrow.
  const ui = await win.evaluate(async () => {
    const bad = [];
    const cur = await (await fetch('./ui/cursors/manifest.json')).json();
    const files = Object.values(cur.assets).flatMap((a) => [a.file, a.file2x]);
    const fin = await (await fetch('./ui/final-manifest.json')).json();
    for (const a of Object.values(fin.assets)) files.push(a.file);
    for (const f of files) {
      try {
        const res = await fetch(`./${f}`);
        const bmp = await createImageBitmap(await res.blob());
        if (!res.ok || bmp.width < 16) bad.push(f);
        bmp.close();
      } catch {
        bad.push(f);
      }
    }
    return { files: files.length, bad, cursorVar: getComputedStyle(document.documentElement).getPropertyValue('--cur-default') };
  });
  if (ui.files < 1 || ui.bad.length || !ui.cursorVar.includes('prgame://') && !ui.cursorVar.includes('ui/cursors/cursor.ui.default')) fail(`cursors or icons not served: ${JSON.stringify(ui.bad.slice(0, 5))} ${ui.cursorVar.slice(0, 120)}`);
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
  // New Game → Campaign → The Three Beacons → briefing (no pantheon or patron step since 2026-10-03).
  await win.click('[data-testid=menu-new]');
  await win.click('[data-testid=mode-campaign]');
  await win.click('[data-testid=scenario-three_beacons]');
  await win.click('[data-testid=setup-begin]');
  await win.click('[data-testid=briefing-begin]');
  // The 2D adventure map renders offline (PixiJS on WebGL, local files only).
  await win.waitForSelector('.scene-viewport canvas', { timeout: 30000 });
  await win.waitForTimeout(1500);
  const mapView = await win.evaluate(() => {
    const c = document.querySelector('.scene-viewport canvas');
    return { error: !!document.querySelector('.scene-error'), w: c?.width ?? 0, h: c?.height ?? 0, gl: !!(c && (c.getContext('webgl2') || c.getContext('webgl'))) };
  });
  if (mapView.error || mapView.w < 100 || mapView.h < 100) fail(`2D map view did not render: ${JSON.stringify(mapView)}`);
  await win.screenshot({ path: path.join(process.env.PR_SMOKE_OUT ?? '.', 'desktop-map.png') });
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
  if (!process.exitCode) console.log('DESKTOP SMOKE OK', { url, saves: files, records: 'records.json', sprites: sprites.files, map: mapView, art: art.files, expansionImages: expansion.files, uiImages: ui.files, cursor: ui.cursorVar.slice(0, 60), audio, ...(packaged ? { packaged } : {}) });
} catch (e) {
  fail(e instanceof Error ? e.message : String(e));
} finally {
  await app.close();
}
