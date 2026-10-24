import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
const sharp = createRequire(import.meta.url)(process.argv[2] || 'sharp');
const input = 'docs/map-life-v1/windmill-body.png';
const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let left = info.width, top = info.height, right = 0, bottom = 0;
for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] > 8) {
  left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
}
const body = await sharp(input).extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
  .resize(144, 128, { fit: 'inside' }).png().toBuffer({ resolveWithObject: true });
await sharp({ create: { width: 162, height: 166, channels: 4, background: '#00000000' } })
  .composite([{ input: body.data, left: Math.round((162 - body.info.width) / 2), top: 160 - body.info.height }])
  .webp({ lossless: true }).toFile('assets-runtime/map-life-v1/windmill-body.webp');
await writeFile('assets-runtime/map-life-v1/manifest.json', JSON.stringify({ sites: {
  'map.site.windmill': { file: 'map-life-v1/windmill-body.webp', anchor: [.5, .9172], pixelsPerHex: 140,
    width: 162, height: 166, status: 'final', provenance: 'Built-in imagegen stationary windmill; separate animated sails in mapLife.ts.' },
} }, null, 2) + '\n');
