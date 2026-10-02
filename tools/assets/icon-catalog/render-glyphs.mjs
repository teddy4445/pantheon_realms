/**
 * Icon catalog — thumbnail step (development tool; never packaged in the game).
 * Renders the SVG glyphs written by the inventory step to PNG
 * (assets-source/icons/current/glyph.<name>.png, 96 px) with Playwright's
 * Chromium, so the spreadsheet can embed them.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const DIR = join(ROOT, 'assets-source', 'icons', 'current');
const files = readdirSync(DIR).filter((f) => f.endsWith('.svg'));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 120, height: 120 }, deviceScaleFactor: 1 });
for (const f of files) {
  const svg = readFileSync(join(DIR, f), 'utf8');
  await page.setContent(`<!doctype html><html><body style="margin:0;background:transparent">${svg}</body></html>`);
  const el = await page.$('svg');
  await el.screenshot({ path: join(DIR, f.replace(/\.svg$/, '.png')), omitBackground: true });
}
await browser.close();
console.log(`rendered ${files.length} glyph thumbnails`);
