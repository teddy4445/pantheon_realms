import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const sharp = createRequire(import.meta.url)(process.argv[2] || 'sharp');
const source = 'assets-source/ui/city-icons-v1';
const runtime = 'assets-runtime/city-icons-v1';
const info = JSON.parse(await readFile('docs/city-wagon-icon-v1/prompt.json', 'utf8'));
await mkdir(source, { recursive: true });
await mkdir(runtime, { recursive: true });
await copyFile(info.original, `${source}/caravan.png`);
const stats = await sharp(`${source}/caravan.png`).stats();
if (stats.isOpaque) throw new Error('Expected genuine transparent alpha');
for (const size of [64, 128]) {
  const margin = size / 16;
  await sharp(`${source}/caravan.png`).trim({ threshold: 8 })
    .resize(size - margin * 2, size - margin * 2, { fit: 'contain', background: '#00000000' })
    .extend({ top: margin, bottom: margin, left: margin, right: margin, background: '#00000000' })
    .webp({ quality: 95, alphaQuality: 100 }).toFile(`${runtime}/caravan-${size}.webp`);
}
await writeFile(`${runtime}/manifest.json`, JSON.stringify({ assets: {
  'icon.ui.caravan': {
    file: 'city-icons-v1/caravan-128.webp',
    provenance: 'Painted caravan icon generated with built-in ImageGen, 2026-10-23; master in assets-source/ui/city-icons-v1/caravan.png.',
  },
} }, null, 2) + '\n');
console.log('Packed transparent wagon icon at 64/128px and registered icon.ui.caravan.');
