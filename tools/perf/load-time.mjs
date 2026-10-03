// Load-time measurement for the browser build (development tool; never packaged).
//
// Usage: npm run build && node tools/perf/load-time.mjs [distDir] [--runs 7] [--json out.json]
//
// Serves the build from a local static server (gzip, like a normal web host) and
// opens it in headless Chromium with a fresh profile per run. Reports medians of:
//   menu       navigation start -> the main menu's New Game button is in the page
//   scene      Begin on the mission briefing -> the first 2D map view is built and has drawn a
//              frame (so moving code out of the start-up bundle is not hidden by a slower first
//              scene). Measured twice: clicking straight through the menus (worst case), and
//              after a 3-second pause on the main menu, as a person would take.
//   settled    Begin -> the end of the last long main-thread task in the next 3 s (scene
//              building, texture uploads): steadier than "scene" in software-GPU runs.
//   startup JS script files the page requested before the menu appeared (raw and gzip)
// Two profiles: "local" (no throttling: parse, compile and execution dominate, as in
// the desktop app) and "web" (Chrome DevTools network emulation: 20 Mbit/s down, 40 ms RTT).
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : dflt;
};
const positional = args.filter((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
const dist = path.resolve(positional[0] ?? 'apps/client/dist');
const runs = Number(flag('--runs', '7'));
const jsonOut = flag('--json', null);

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ogg': 'audio/ogg', '.wav': 'audio/wav' };
const gzCache = new Map();
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    let file = path.join(dist, decodeURIComponent(url.pathname));
    if (!file.startsWith(dist)) throw new Error('outside');
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    const ext = path.extname(file);
    let body = await readFile(file);
    const headers = { 'Content-Type': TYPES[ext] ?? 'application/octet-stream', 'Cache-Control': 'no-store' };
    if (['.html', '.js', '.css', '.json'].includes(ext) && /gzip/.test(req.headers['accept-encoding'] ?? '')) {
      if (!gzCache.has(file)) gzCache.set(file, gzipSync(body));
      body = gzCache.get(file);
      headers['Content-Encoding'] = 'gzip';
    }
    res.writeHead(200, headers).end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;

// Records when the menu button and the first scene canvas first appear (page clock).
const observer = () => {
  const marks = (window.__prMarks = {});
  // Long main-thread tasks (> 50 ms): building the first view, decoding textures.
  const long = (window.__prLong = []);
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) long.push([e.startTime, e.startTime + e.duration]);
    }).observe({ type: 'longtask', buffered: true });
  } catch {
    /* not supported */
  }
  new MutationObserver(() => {
    if (marks.menu === undefined && document.querySelector('[data-testid=menu-new]')) marks.menu = performance.now();
    if (marks.begin !== undefined && marks.canvas === undefined && document.querySelector('.scene-viewport canvas')) {
      marks.canvas = performance.now();
      // Two animation frames after the canvas is mounted: the scene has been built and drawn once.
      requestAnimationFrame(() => requestAnimationFrame(() => (marks.scene = performance.now())));
    }
  }).observe(document, { childList: true, subtree: true });
};

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
async function once(profile, pause = 0) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  if (profile === 'web') {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 40, downloadThroughput: (20e6 / 8), uploadThroughput: (5e6 / 8) });
  }
  await page.addInitScript(observer);
  await page.goto(`${origin}/index.html`);
  await page.waitForSelector('[data-testid=menu-new]', { timeout: 120000 });
  const menu = await page.evaluate(() => window.__prMarks.menu);
  // Scripts whose request started before the menu appeared (the page's own clock).
  const scripts = await page.evaluate((t) => performance.getEntriesByType('resource').filter((e) => e.initiatorType === 'script' || /\.js$/.test(e.name)).filter((e) => e.startTime <= t).map((e) => new URL(e.name).pathname), menu);
  if (pause) await page.waitForTimeout(pause);
  for (const id of ['menu-campaign', 'setup-next', 'setup-next', 'setup-begin']) await page.click(`[data-testid=${id}]`);
  await page.waitForSelector('[data-testid=briefing-begin]');
  await page.evaluate(() => {
    window.__prMarks.begin = performance.now();
    document.querySelector('[data-testid=briefing-begin]').click();
  });
  await page.waitForFunction(() => window.__prMarks.scene !== undefined, null, { timeout: 120000 });
  // Settled: the end of the last long task in the 3 s after Begin (or the drawn frame if later).
  await page.waitForTimeout(3000);
  const { begin, scene, settled } = await page.evaluate(() => {
    const m = window.__prMarks;
    const ends = window.__prLong.filter(([st]) => st >= m.begin && st <= m.begin + 3000).map(([, en]) => en);
    return { ...m, settled: Math.max(m.scene, ...ends) };
  });
  let raw = 0;
  let gz = 0;
  for (const p of scripts) {
    const b = await readFile(path.join(dist, decodeURIComponent(p)));
    raw += b.length;
    gz += gzipSync(b).length;
  }
  await context.close();
  return { menu, scene: scene - begin, settled: settled - begin, files: scripts.length, raw, gz };
}

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const out = { dist, runs, profiles: {} };
for (const profile of ['local', 'web']) {
  const rs = [];
  const paused = [];
  await once(profile); // warm-up (OS file cache, shader compiler)
  for (let i = 0; i < runs; i++) rs.push(await once(profile));
  for (let i = 0; i < runs; i++) paused.push(await once(profile, 3000));
  out.profiles[profile] = {
    menuMs: Math.round(median(rs.map((r) => r.menu))),
    sceneMs: Math.round(median(rs.map((r) => r.scene))),
    scenePausedMs: Math.round(median(paused.map((r) => r.scene))),
    settledMs: Math.round(median(rs.map((r) => r.settled))),
    settledPausedMs: Math.round(median(paused.map((r) => r.settled))),
    startupScripts: rs[0].files,
    startupJsBytes: rs[0].raw,
    startupJsGzipBytes: rs[0].gz,
    menuSamples: rs.map((r) => Math.round(r.menu)),
    sceneSamples: rs.map((r) => Math.round(r.scene)),
    scenePausedSamples: paused.map((r) => Math.round(r.scene)),
    settledSamples: rs.map((r) => Math.round(r.settled)),
    settledPausedSamples: paused.map((r) => Math.round(r.settled)),
  };
}
await browser.close();
server.close();
const mb = (n) => (n / 1e6).toFixed(2) + ' MB';
for (const [name, p] of Object.entries(out.profiles)) {
  console.log(`${name.padEnd(5)}  menu ${p.menuMs} ms  first scene ${p.sceneMs} ms (after a 3 s pause: ${p.scenePausedMs} ms)  settled ${p.settledMs} ms (${p.settledPausedMs} ms)  start-up JS ${p.startupScripts} files, ${mb(p.startupJsBytes)} (${mb(p.startupJsGzipBytes)} gzip)`);
}
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(out, null, 2));
