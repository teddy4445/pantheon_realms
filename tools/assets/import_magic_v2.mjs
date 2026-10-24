import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
const sharp = createRequire(import.meta.url)(process.argv[2] || 'sharp');
const source = 'assets-source/expansion-magic-v2';
const runtime = 'assets-runtime/expansion-magic-v2';
const plans = JSON.parse(await readFile(`${source}/plan.json`, 'utf8'));
const partial = process.argv.includes('--partial');
await mkdir(`${runtime}/icons`, { recursive: true });
await mkdir(`${runtime}/effects`, { recursive: true });
const icons = {}, recipes = {}, report = [];
const atlasCache = new Map();
// Generated sheets follow a grid but their actual gutters can be a few pixels off.
// Find the transparent seam, then retain the nominal origin in a larger fixed canvas.
// This avoids taking the bottom of one pose into the next pose, without recentering it.
function seam(raw, info, axis, nominal, radius, lo, hi) {
  let best = Math.round(nominal), score = Infinity;
  const limit = axis === 'x' ? info.width : info.height;
  for (let p = Math.max(1, Math.floor(nominal-radius)); p <= Math.min(limit-1, Math.ceil(nominal+radius)); p++) {
    let ink = Math.abs(p-nominal)/radius*.01;
    for (let q = lo; q < hi; q++) {
      const x = axis === 'x' ? p : q, y = axis === 'x' ? q : p;
      const a = raw[(y*info.width+x)*4+3];
      if (a > 24) ink += a/255;
    }
    if (ink < score) { score = ink; best = p; }
  }
  return best;
}
for (const item of plans) {
  const atlasPath = `${source}/${item.pantheon}-icons.png`;
  if (!atlasCache.has(atlasPath)) atlasCache.set(atlasPath, await sharp(atlasPath).metadata());
  const meta = atlasCache.get(atlasPath);
  const cell = item.index + (item.miracle ? 6 : 0);
  const rect = { left: Math.round(cell % 4 * meta.width / 4), top: Math.round(Math.floor(cell / 4) * meta.height / 2), width: Math.floor(meta.width / 4), height: Math.floor(meta.height / 2) };
  const icon = await sharp(atlasPath).extract(rect).resize(144, 144, { fit: 'contain' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const transparent = icon.data.filter((a, i) => i % 4 === 3 && a < 16).length / (144 * 144);
  if (transparent < .12) throw Error(`${item.id}: icon missing transparency (${transparent})`);
  const iconFile = `expansion-magic-v2/icons/${item.id}.webp`;
  await sharp(icon.data, { raw: icon.info }).extend({ top: 8, bottom: 8, left: 8, right: 8, background: '#00000000' }).webp({ quality: 95, alphaQuality: 100 }).toFile(`assets-runtime/${iconFile}`);
  icons[`icon.${item.miracle ? 'intervention' : 'spell'}.${item.id}`] = iconFile;
  const input = `${source}/${item.id}.png`;
  if (partial && !existsSync(input)) continue;
  const sheet = await sharp(input).metadata();
  if (!sheet.hasAlpha) throw Error(`${item.id}: animation has no alpha channel`);
  const rawSheet = await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const cw = sheet.width/4, ch = sheet.height/2;
  const middle = seam(rawSheet.data, rawSheet.info, 'y', ch, ch*.1, 0, sheet.width);
  const rowBounds = [0, middle, sheet.height];
  const colBounds = [0,1].map(row => [0,...[1,2,3].map(c => seam(rawSheet.data, rawSheet.info, 'x', c*cw, cw*.22, rowBounds[row], rowBounds[row+1])),sheet.width]);
  const size = item.miracle ? 256 : 192;
  const cells = [], occupancy = [], edge = [];
  for (let i = 0; i < 8; i++) {
    const col = i%4, row = Math.floor(i/4), left = colBounds[row][col], right = colBounds[row][col+1];
    const split = seam(rawSheet.data, rawSheet.info, 'y', ch, ch*.1, left, right);
    const rect = {left,top:row===0?0:split,width:right-left,height:row===0?split:sheet.height-split};
    const extracted = await sharp(input).extract(rect).png().toBuffer();
    const normalized = await sharp({create:{width:Math.ceil(cw*1.48),height:Math.ceil(ch*1.48),channels:4,background:'#00000000'}})
      .composite([{input:extracted,left:Math.round(rect.left-col*cw+cw*.24),top:Math.round(rect.top-row*ch+ch*.24)}]).png().toBuffer();
    const { data, info } = await sharp(normalized).resize(size - 16, size - 16, { fit: 'fill' }).extend({ top: 8, bottom: 8, left: 8, right: 8, background: '#00000000' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let solid = 0, clear = 0, border = 0;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const a = data[(y * size + x) * 4 + 3];
      if (a > 32) { solid++; if (x === 8 || y === 8 || x === size - 9 || y === size - 9) border++; }
      if (a < 16) clear++;
    }
    if (clear / (size * size) < .15 || solid < 8) throw Error(`${item.id}: invalid alpha/empty frame ${i}`);
    occupancy.push(Math.round(solid / (size * size) * 100));
    edge.push(border);
    cells.push({ input: await sharp(data, { raw: info }).png().toBuffer(), left: (i % 4) * size, top: Math.floor(i / 4) * size });
  }
  const file = `expansion-magic-v2/effects/${item.id}.webp`;
  await sharp({ create: { width: size * 4, height: size * 2, channels: 4, background: '#00000000' } }).composite(cells).webp({ quality: 90, alphaQuality: 100 }).toFile(`assets-runtime/${file}`);
  const anchorY = (8 + (size-16) * 1.14/1.48)/size;
  const regions = Array.from({ length: 8 }, (_, i) => ({ rect: [(i % 4) * size, Math.floor(i / 4) * size, size, size], anchor: [size * .5, size * anchorY], sourceScale: 1 }));
  recipes[item.id] = { icon: iconFile, particle: item.particle, school: item.school, durationMs: item.durationMs, size: item.size*1.48, miracle: item.miracle, name: item.name, pantheon: item.pantheon, tier: item.tier, sequence: item.sequence, strip: { file, frames: 8, frameWidth: size, frameHeight: size, fps: 8, loop: false, anchor: [.5, anchorY], regions, pixelsPerHex: size / (item.size*1.48), status: 'final', provenance: 'Built-in imagegen; prompts and original sheets in assets-source/expansion-magic-v2.' } };
  report.push({ id: item.id, occupancy, borderPixels: edge, bytes: (await sharp(`assets-runtime/${file}`).metadata()).size ?? null });
}
await writeFile(`${runtime}/icons.json`, JSON.stringify(icons, null, 2) + '\n');
await writeFile(`${runtime}/manifest.json`, JSON.stringify(recipes, null, 2) + '\n');
await writeFile(`${source}/import-report.json`, JSON.stringify(report, null, 2) + '\n');
// Typed data stays within the presentation package; no content/rules dependency.
await writeFile('packages/presentation/src/paintedMagicData.ts', `// Generated by tools/assets/import_magic_v2.mjs. Do not edit by hand.\nimport type { PaintedMagicRecipe } from './paintedMagicTypes';\nexport const PAINTED_MAGIC: Readonly<Record<string, PaintedMagicRecipe>> = ${JSON.stringify(recipes, null, 2)};\n`);
console.log(`Imported ${Object.keys(icons).length} painted icons and ${Object.keys(recipes).length} eight-frame sequences.`);
