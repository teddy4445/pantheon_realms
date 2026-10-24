/** Pack the approved ImageGen masters, retaining alpha and consistent optical padding. */
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const sharp = createRequire(import.meta.url)(process.argv[2] || 'sharp');
const doc = 'docs/single-battle-icons-v1';
const source = 'assets-source/ui/single-battle-icons-v1';
const runtime = 'assets-runtime/single-battle-icons-v1';
const prompts = JSON.parse(await readFile(`${doc}/prompts.json`, 'utf8'));
const usage = JSON.parse(await readFile(`${doc}/icon-map.json`, 'utf8'));
const generated = JSON.parse(await readFile(`${doc}/generated-files.json`, 'utf8'));
await mkdir(source, { recursive: true });
await mkdir(runtime, { recursive: true });
const manifest = { version: 1, provenance: 'Built-in ImageGen, October 2026; style references from the game’s delivered painted icon set.', icons: {} };
const contact = [];
const keys = Object.keys(prompts.icons);
for (const [index, id] of keys.entries()) {
  if (!generated[id]) throw new Error(`Missing generated master: ${id}`);
  const master = `${source}/${id}.png`;
  await copyFile(generated[id], master);
  const { data, info } = await sharp(master).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, y0 = info.height, x1 = 0, y1 = 0, transparent = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const a = data[(y * info.width + x) * 4 + 3];
    if (a === 0) transparent++;
    if (a > 8) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  }
  if (transparent < info.width * info.height * .05 || x1 <= x0) throw new Error(`Expected transparent isolated artwork: ${id}`);
  // Include faint edge antialiasing around the visible silhouette.
  x0 = Math.max(0, x0 - 3); y0 = Math.max(0, y0 - 3);
  x1 = Math.min(info.width - 1, x1 + 3); y1 = Math.min(info.height - 1, y1 + 3);
  const crop = { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
  for (const size of [64, 128]) {
    const margin = size / 16;
    await sharp(master).extract(crop).resize(size - margin * 2, size - margin * 2, { fit: 'contain', background: '#00000000' })
      .extend({ top: margin, bottom: margin, left: margin, right: margin, background: '#00000000' })
      .webp({ quality: 95, alphaQuality: 100 }).toFile(`${runtime}/${id}-${size}.webp`);
  }
  manifest.icons[id] = { file: `single-battle-icons-v1/${id}-64.webp`, retina: `single-battle-icons-v1/${id}-128.webp`, source: `${source}/${id}.png`, width: 64, height: 64 };
  const x = (index % 8) * 180, y = Math.floor(index / 8) * 180;
  contact.push({ input: await sharp(`${runtime}/${id}-128.webp`).png().toBuffer(), left: x + 26, top: y + 10 });
  const label = Buffer.from(`<svg width="180" height="36"><text x="90" y="25" text-anchor="middle" font-family="Georgia" font-size="18" fill="#e8d49b">${id}</text></svg>`);
  contact.push({ input: label, left: x, top: y + 140 });
}
await writeFile(`${runtime}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
await sharp({ create: { width: 1440, height: Math.ceil(keys.length / 8) * 180, channels: 4, background: '#10232f' } }).composite(contact).png().toFile(`${doc}/icon-catalog.png`);
const escape = text => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const cards = keys.map(id => `<article><img class="master" src="../../${runtime}/${id}-128.webp" alt="${escape(id)}"><h2>${escape(id)}</h2><p>${escape(usage.icons[id])}</p><div class="sizes">${[20, 28, 32, 48].map(size => `<span><img src="../../${runtime}/${id}-64.webp" width="${size}" height="${size}" alt="">${size}px</span>`).join('')}</div></article>`).join('\n');
await writeFile(`${doc}/index.html`, `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Single Battle — painted icon catalog</title><style>body{margin:0;background:#0a1a24;color:#e8d49b;font:16px/1.5 Georgia,serif}main{max-width:1400px;margin:auto;padding:40px}h1{font-weight:normal;font-size:36px;margin:0}header{border-bottom:1px solid #8d7748;margin-bottom:24px}header p{color:#c4c1b0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px}article{background:linear-gradient(145deg,#1c3641,#0a1c25);border:1px solid #8d7748;padding:20px;text-align:center}article .master{width:128px;height:128px}h2{text-transform:capitalize;font-weight:normal;margin:8px 0}article p{font:14px/1.5 system-ui;color:#c4c1b0;min-height:45px}.sizes{display:flex;align-items:end;justify-content:space-around;border-top:1px solid #8d774855;padding-top:14px}.sizes span{display:flex;align-items:center;flex-direction:column;font:11px system-ui;color:#b4a78a;gap:8px}.sizes img{object-fit:contain}</style><main><header><h1>Single Battle · Painted Icons</h1><p>32 original icons, matched to the game’s gold, steel, parchment and enamel artwork. Each is shown below at interface sizes.</p></header><div class="grid">${cards}</div></main></html>`);
const entries = Object.fromEntries(keys.map(id => [id, `./single-battle-icons-v1/${id}`]));
await writeFile('packages/ui/src/assets/singleBattleIcons.ts', `// Generated by tools/assets/import_single_battle_icons.mjs.\nexport const SINGLE_BATTLE_ICONS = ${JSON.stringify(entries, null, 2)} as const;\nexport type SingleBattleArtName = keyof typeof SINGLE_BATTLE_ICONS;\n`);
console.log(`Imported ${keys.length} painted icons, 64/128px WebP, transparent alpha; generated catalog and typed registry.`);
