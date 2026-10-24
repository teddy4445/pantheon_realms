import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const sharp=createRequire(import.meta.url)(process.argv[2]||'sharp');
const doc='docs/restoration-temples-v1', runtime='assets-runtime/world-expansion-v1', source='assets-source/world-expansion-v1';
const files=JSON.parse(await readFile(`${doc}/generated-files.json`,'utf8'));
await mkdir(source,{recursive:true}); await mkdir(runtime,{recursive:true});
const manifest={sites:{},decor:{},provenance:'Built-in ImageGen, October 2026. Prompts and catalog in docs/restoration-temples-v1.'};
const contact=[]; let i=0;
for(const [id,file]of Object.entries(files).sort(([a],[b])=>a.localeCompare(b))){
  await copyFile(file,`${source}/${id}.png`);
  const stats=await sharp(file).stats(); if(stats.isOpaque)throw new Error(`Opaque sprite: ${id}`);
  const temple=id.startsWith('temple-'), size=temple?512:320;
  // Keep the complete canvas for both temple states: cropping ruins would enlarge the surviving walls.
  await sharp(file).resize(size,size,{fit:'contain',background:'#00000000'}).webp({quality:92,alphaQuality:100}).toFile(`${runtime}/${id}.webp`);
  const sprite={file:`world-expansion-v1/${id}.webp`,width:size,height:size,pixelsPerHex:temple?(id.includes('-small-')?480:340):id.startsWith('mountain')?250:id.startsWith('tree')?340:480,anchor:[.5,.91],status:'final',provenance:manifest.provenance};
  if(temple){const [,p,s,state]=id.split('-');manifest.sites[`map.site.temple.${p}.${s}.${state}`]=sprite;}
  else manifest.decor[`scenery.${id}`]=sprite;
  const x=(i%6)*220,y=Math.floor(i/6)*240;i++;
  contact.push({input:await sharp(`${runtime}/${id}.webp`).resize(204,204).png().toBuffer(),left:x+8,top:y});
  contact.push({input:Buffer.from(`<svg width="220" height="32"><text x="110" y="20" text-anchor="middle" font-family="Georgia" font-size="12" fill="#e8d49b">${id}</text></svg>`),left:x,top:y+204});
}
await writeFile(`${runtime}/manifest.json`,JSON.stringify(manifest,null,2)+'\n');
await sharp({create:{width:1320,height:Math.ceil(i/6)*240,channels:4,background:'#142a2d'}}).composite(contact).png().toFile(`${doc}/asset-catalog.png`);
console.log(`Packed ${i} transparent sprites: ${Object.keys(manifest.sites).length} temple states and ${Object.keys(manifest.decor).length} scenery variants.`);
