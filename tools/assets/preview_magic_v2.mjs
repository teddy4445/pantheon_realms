import { createRequire } from 'node:module';
import { readFile, mkdir } from 'node:fs/promises';
const sharp = createRequire(import.meta.url)(process.argv[2] || 'sharp');
const recipes = JSON.parse(await readFile('assets-runtime/expansion-magic-v2/manifest.json', 'utf8'));
await mkdir('assets-source/expansion-magic-v2/review', { recursive: true });
for (const pantheon of new Set(Object.values(recipes).map(r => r.pantheon))) {
  const entries = Object.values(recipes).filter(r => r.pantheon === pantheon);
  const cells = [];
  for (let y = 0; y < entries.length; y++) {
    const r = entries[y];
    const title = Buffer.from(`<svg width="900" height="30"><text x="10" y="21" font-family="Georgia" font-size="18" fill="#ead2a0">${r.name}${r.miracle ? ' · Miracle' : ''}</text></svg>`);
    cells.push({ input: title, left: 0, top: y * 175 });
    cells.push({ input: await sharp(`assets-runtime/${r.icon}`).resize(120,120).png().toBuffer(), left: 15, top: y*175+35 });
    for (const [j, frame] of [0,2,3,5,7].entries()) {
      const [left,top,width,height] = r.strip.regions[frame].rect;
      cells.push({ input: await sharp(`assets-runtime/${r.strip.file}`).extract({left,top,width,height}).resize(145,145).png().toBuffer(), left: 155+j*149, top:y*175+28 });
    }
  }
  await sharp({create:{width:900,height:entries.length*175,channels:4,background:'#28312f'}}).composite(cells).png().toFile(`assets-source/expansion-magic-v2/review/${pantheon}.png`);
}
console.log('Wrote seven art review contact sheets.');
