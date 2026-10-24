import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../docs/pantheon-cities-h3-v1');
const partial = process.argv.includes('--partial');
const server = createServer(async (req, res) => {
  const target = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  if (!target.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  try {
    const data = await readFile(target);
    res.setHeader('Content-Type', target.endsWith('.png') ? 'image/png' : target.endsWith('.js') ? 'text/javascript' : 'text/html');
    res.end(data);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
const report = { partial, assets: [], cities: [] };
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1050 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(url + '/index.html');
  for (const p of ['norse', 'egyptian', 'japanese', 'celtic', 'mesoamerican']) {
    const kit = JSON.parse(await readFile(path.join(root, p, 'manifest.json'), 'utf8'));
    const variants = kit.buildings.flatMap(b => b.variants.map(v => ({ ...v, slot: b.id })));
    if (variants.length !== 33 || new Set(variants.map(v => v.id)).size !== 33) throw Error(`${p}: catalog coverage`);
    for (const v of variants) {
      try { await access(path.join(root, p, v.file)); } catch (e) { if (partial) continue; throw e; }
      const result = await page.evaluate(async ({ src, id }) => {
        const img = new Image(); img.src = src; await img.decode();
        const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
        const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
        const pixels = ctx.getImageData(0, 0, c.width, c.height).data;
        let transparent = 0, solid = 0;
        for (let i = 3; i < pixels.length; i += 4) {
          if (pixels[i] === 0) transparent++;
          if (pixels[i] >= 240) solid++;
        }
        return { id, width: c.width, height: c.height, transparent, solid, hasAlpha: transparent > pixels.length / 40 && solid > 0 };
      }, { src: `${url}/${p}/${v.file}`, id: v.artAssetId });
      report.assets.push(result);
    }
    if (partial) {
      const checked = new Set(report.assets.map(a => a.id));
      const ready = variants.filter(v => checked.has(v.artAssetId));
      if (ready.length) {
        await page.setContent(`<body style="background:#293c43;color:#efe5cd;font:16px system-ui"><h1>${p}: generated building review</h1><main style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px">${ready.map(v => `<article><img style="width:100%;height:160px;object-fit:contain" src="${url}/${p}/${v.file}"><p>${v.name}</p></article>`).join('')}</main></body>`);
        await page.evaluate(async () => { await Promise.all([...document.images].map(i => i.decode())); });
        await page.screenshot({ path: path.join(root, p, 'partial-contact.png'), fullPage: true });
      }
      continue;
    }
    await page.goto(`${url}/${p}/preview.html`);
    await page.evaluate(async () => { await Promise.all([...document.images].map(i => i.decode())); });
    await page.locator('#stage').screenshot({ path: path.join(root, p, 'assembled-preview.png') });
    await page.locator('#base').click();
    await page.evaluate(async () => { await Promise.all([...document.querySelectorAll('.building')].map(i => i.decode())); });
    await page.locator('#stage').screenshot({ path: path.join(root, p, 'base-city-preview.png') });
    for (const v of variants) {
      await page.locator(`#version-${v.slot}`).selectOption(v.id);
      const img = page.locator(`#art-${v.slot}`);
      await img.evaluate(i => i.decode());
      if (await img.getAttribute('src') !== v.file) throw Error(`${p}/${v.id}: selector`);
    }
    for (const n of [1, 2, 3, 4]) {
      await page.locator('#background-stage').selectOption(String(n));
      await page.locator('.background').evaluate(i => i.decode());
      if (await page.locator('.background').getAttribute('src') !== `background.l${n}.png`) throw Error(`${p}: stage ${n}`);
    }
    await page.locator('#none').click();
    if (await page.locator('.building:visible').count() !== 0) throw Error(`${p}: hide`);
    await page.locator('#all').click();
    if (await page.locator('.building:visible').count() !== 18) throw Error(`${p}: show`);
    const download = page.waitForEvent('download'); await page.locator('#export').click();
    if ((await download).suggestedFilename() !== `${p}-city-placements.json`) throw Error(`${p}: export`);
    // A compact contact sheet permits visual inspection of every supplied version.
    await page.goto(`${url}/${p}/versions.html`);
    await page.evaluate(async () => {
      document.querySelectorAll('img').forEach(i => i.loading = 'eager');
      await Promise.all([...document.images].map(i => i.decode()));
      document.querySelector('main').style.gridTemplateColumns = 'repeat(6,1fr)';
      document.querySelectorAll('article img').forEach(i => i.style.height = '135px');
      document.querySelectorAll('h2').forEach(e => e.style.fontSize = '16px');
    });
    await page.screenshot({ path: path.join(root, p, 'all-versions.png'), fullPage: true });
    report.cities.push({ pantheon: p, versions: variants.length, stages: 4 });
  }
  await writeFile(path.join(root, partial ? 'partial-validation.json' : 'validation.json'), JSON.stringify(report, null, 2));
  const invalid = report.assets.filter(a => !a.hasAlpha);
  if (invalid.length) throw Error('Invalid sprite transparency: ' + JSON.stringify(invalid));
  if (errors.length) throw Error(errors.join('\n'));
  console.log(JSON.stringify({ ok: true, partial, checkedSprites: report.assets.length, cities: report.cities }));
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
