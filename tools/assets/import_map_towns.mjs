import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Pass the installed sharp package path when it is supplied by the desktop runtime.
const require = createRequire(import.meta.url);
const sharp = require(process.argv[2] || 'sharp');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = path.join(root, 'docs/map-town-development-v1');
const output = path.join(root, 'assets-runtime/map-town-development-v1');
const original = JSON.parse(await readFile(path.join(root, 'assets-runtime/sprites/manifest.json'), 'utf8'));
const pantheons = ['greek', 'norse', 'egyptian', 'japanese', 'celtic', 'mesoamerican'];
await mkdir(output, { recursive: true });
const sites = {};
const report = [];
for (const p of pantheons) {
  for (let level = 1; level <= 4; level++) {
    const id = `map.site.town.${p}.l${level}`;
    if (level === 4) {
      const old = original.sites[`map.site.town.${p}`];
      sites[id] = { ...old, provenance: 'Existing mature map town retained as development level 4.' };
      await copyFile(path.join(root, 'assets-runtime', old.file), path.join(source, `${p}.l4.webp`));
      continue;
    }
    const input = path.join(source, `${p}.l${level}.png`);
    if (process.argv.includes('--partial') && !existsSync(input)) continue;
    const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let left = info.width, top = info.height, right = 0, bottom = 0, transparent = 0;
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
      const a = data[(y * info.width + x) * 4 + 3];
      if (a === 0) transparent++;
      if (a > 8) { left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y); }
    }
    if (transparent / (info.width * info.height) < .1 || right <= left) throw Error(`${id}: invalid transparency`);
    // Normalize the contact point and footprint; early settlements stay slightly smaller.
    const extent = [0, 180, 194, 208][level];
    const resized = await sharp(input).extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
      .resize(extent, extent, { fit: 'inside' }).png().toBuffer({ resolveWithObject: true });
    const width = 240, height = 224;
    const x = Math.round((width - resized.info.width) / 2);
    const y = 208 - resized.info.height;
    const filename = `${p}.l${level}.webp`;
    await sharp({ create: { width, height, channels: 4, background: '#00000000' } })
      .composite([{ input: resized.data, left: x, top: y }]).webp({ lossless: true }).toFile(path.join(output, filename));
    sites[id] = { file: `map-town-development-v1/${filename}`, width, height,
      anchor: [.5, 196 / height], pixelsPerHex: 140, status: 'final',
      provenance: 'Built-in imagegen; transparent source in docs/map-town-development-v1. Normalized for map placement.' };
    report.push({ id, transparentFraction: transparent / (info.width * info.height), sourceWidth: info.width, sourceHeight: info.height });
  }
}
await writeFile(path.join(output, 'manifest.json'), JSON.stringify({ sites }, null, 2) + '\n');
await writeFile(path.join(source, 'validation.json'), JSON.stringify(report, null, 2) + '\n');
const cards = pantheons.map(p => `<section><h2>${p}</h2><div class="row">${[1,2,3,4].map(n => {
  const s = sites[`map.site.town.${p}.l${n}`];
  if (!s) return `<figure><figcaption>Level ${n}: generating</figcaption></figure>`;
  return `<figure><img src="../../assets-runtime/${s.file}" style="width:${s.width}px;height:${s.height}px"><figcaption>Level ${n}</figcaption></figure>`;
}).join('')}</div></section>`).join('');
await writeFile(path.join(source, 'index.html'), `<!doctype html><meta charset="utf-8"><title>Map town development</title><style>body{margin:32px;background:#17251f;color:#e9dfc5;font:16px system-ui}h1{margin-bottom:8px}h2{text-transform:capitalize}.row{display:flex;gap:12px}figure{margin:0;width:250px;height:262px;display:flex;flex-direction:column;justify-content:end;align-items:center;background:#304237;border:1px solid #7d7c55;border-radius:8px}img{object-fit:contain;image-rendering:auto}figcaption{padding:10px}</style><h1>Map settlement development</h1><p>All six pantheons · civic hall levels 1–4 · final map scale</p>${cards}`);
console.log(`Imported ${report.length} new sprites, retained 6 mature cities, wrote ${Object.keys(sites).length} bindings and review gallery.`);
