import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
const sharp = createRequire(import.meta.url)(process.argv[2] || 'sharp');
const jobs = JSON.parse(await readFile('docs/map-landmarks-v1/prompts.json', 'utf8'));
const decor = {};
const report = [];
for (const { id } of jobs) {
  const input = `docs/map-landmarks-v1/${id}.png`;
  if (process.argv.includes('--partial') && !existsSync(input)) continue;
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width, top = info.height, right = 0, bottom = 0, transparent = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const a = data[(y * info.width + x) * 4 + 3];
    if (a === 0) transparent++;
    if (a > 8) { left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y); }
  }
  if (transparent / (info.width * info.height) < .1) throw Error(`${id}: missing transparency`);
  const body = await sharp(input).extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
    .resize(400, 440, { fit: 'inside' }).png().toBuffer({ resolveWithObject: true });
  await sharp({ create: { width: 420, height: 460, channels: 4, background: '#00000000' } })
    .composite([{ input: body.data, left: Math.round((420 - body.info.width) / 2), top: 448 - body.info.height }])
    .webp({ lossless: true }).toFile(`assets-runtime/map-landmarks-v1/${id}.webp`);
  decor[`landmark.${id}`] = { file: `map-landmarks-v1/${id}.webp`, width: 420, height: 460, pixelsPerHex: 260,
    anchor: [.5, 430 / 460], status: 'final', provenance: 'Built-in imagegen; source and prompt in docs/map-landmarks-v1.' };
  report.push({ id, transparent: transparent / (info.width * info.height) });
}
await writeFile('assets-runtime/map-landmarks-v1/manifest.json', JSON.stringify({ decor }, null, 2) + '\n');
await writeFile('docs/map-landmarks-v1/validation.json', JSON.stringify(report, null, 2) + '\n');
await writeFile('docs/map-landmarks-v1/index.html', `<!doctype html><meta charset="utf-8"><title>Map landmarks</title><style>body{background:#192820;color:#e6dbbd;font:16px system-ui;margin:32px}main{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}figure{margin:0;padding:14px;text-align:center;background:#304337;border-radius:10px}img{width:210px;height:230px;object-fit:contain}figcaption{text-transform:capitalize;padding:10px}a{color:#d7bd73}</style><h1>Landmarks of the realms</h1><p>Rare scenic landmarks for the adventure map. <a href="http://127.0.0.1:5173/">Play the game</a></p><main>${Object.entries(decor).map(([id, d]) => `<figure><img src="../../assets-runtime/${d.file}"><figcaption>${id.replace('landmark.', '').replaceAll('-', ' ')}</figcaption></figure>`).join('')}</main>`);
console.log(`Imported ${report.length} landmarks.`);
