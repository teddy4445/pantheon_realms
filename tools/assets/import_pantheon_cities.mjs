import { readFile, writeFile, mkdir, copyFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = path.join(root, 'docs/pantheon-cities-h3-v1');
const runtime = path.join(root, 'assets-runtime/pantheon-cities-h3-v1');
const catalog = JSON.parse(await readFile(path.join(source, 'catalog.json'), 'utf8'));
const greek = JSON.parse(await readFile(path.join(root, 'docs/greek-city-h3-prototype-v1/manifest.json'), 'utf8'));
const assets = {}, layouts = {};
const previewHtml = await readFile(path.join(root, 'docs/greek-city-h3-prototype-v1/preview.html'), 'utf8');
const previewJs = await readFile(path.join(root, 'docs/greek-city-h3-prototype-v1/preview.js'), 'utf8');
const prepareOnly = process.argv.includes('--prepare');
const css = 'body{margin:30px;background:#16232a;color:#efe5cd;font:16px system-ui}a{color:#e5c782}h1,h2{font-family:Georgia}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px}article{background:#293c43;padding:16px;border-radius:8px}img{width:100%;object-fit:contain}p{line-height:1.5}';
for (const town of catalog) {
  const p = town.pantheonId, dir = path.join(source, p);
  await mkdir(path.join(dir, 'buildings'), { recursive: true });
  const buildings = town.slots.map(s => {
    const frame = greek.buildings.find(g => g.id === s.id);
    const variants = s.variants.map(v => ({ id: v.id, name: v.name, level: v.level, artAssetId: v.artAssetId, file: `buildings/${s.id}.l${v.level}.png` }));
    return { ...frame, y: Math.min(100, frame.y), name: s.label, variants, versionId: variants.at(-1).id, file: variants.at(-1).file };
  });
  const kit = { name: `${town.name} — Heroes III inspired city`, version: 1, aspectRatio: '3:2', background: 'background.l1.png', reference: 'full-city.png', anchor: 'center-bottom', totalVersions: buildings.reduce((n,b)=>n+b.variants.length,0), buildings };
  await writeFile(path.join(dir, 'manifest.json'), JSON.stringify(kit, null, 2)+'\n');
  await writeFile(path.join(dir, 'manifest.js'), 'window.CITY_MANIFEST='+JSON.stringify(kit)+';\n');
  await writeFile(path.join(dir, 'preview.html'), previewHtml.replaceAll('Greek Polis',town.name).replace('Greek city background',p+' city background').replace('src="background.png"','src="background.l1.png"'));
  await writeFile(path.join(dir, 'preview.js'), previewJs.replace('greek-city-placements.json',p+'-city-placements.json'));
  await writeFile(path.join(dir, 'versions.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><title>${town.name}: building versions</title><style>${css}article img{height:220px}</style><h1>${town.name}: all 33 building versions</h1><p><a href="preview.html">Interactive city</a> · <a href="../index.html">All cities</a></p><main>${buildings.flatMap(b=>b.variants.map(v=>`<article><img loading="lazy" src="${v.file}" alt="${v.name}"><h2>${v.name}</h2><p>${b.id} · Level ${v.level}</p></article>`)).join('')}</main></html>`);
  await writeFile(path.join(dir, 'backgrounds.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><title>${town.name}: development stages</title><style>${css}</style><h1>${town.name}: four development stages</h1><p><a href="preview.html">Interactive city</a> · <a href="../index.html">All cities</a></p><main>${[1,2,3,4].map(n=>`<article><img src="background.l${n}.png" alt="Stage ${n}"><h2>${['','Village','Town','City','Capital'][n]}</h2><a href="in-game/${p}-city-stage-${n}.prsave.json" download>Download playable save</a></article>`).join('')}</main></html>`);
  layouts[p] = Object.fromEntries(buildings.map(b=>[b.id,{x:b.x,y:b.y,width:b.width,height:+(b.width*1.5/b.frameAspectRatio).toFixed(3),layer:b.layer,artAspectRatio:b.frameAspectRatio}]));
  if (prepareOnly) continue;
  const files = buildings.flatMap(b=>b.variants.map(v=>[v.artAssetId,v.file]));
  for (const n of [1,2,3,4]) files.push([`town.${p}.background.l${n}`,`background.l${n}.png`]);
  files.push([`town.${p}.background.damaged`,'background.damaged.png']);
  // Validate every source before copying this town.
  for (const [,file] of files) await access(path.join(dir,file));
  await mkdir(path.join(runtime,p,'buildings'),{recursive:true});
  for (const [id,file] of files) {
    await copyFile(path.join(dir,file),path.join(runtime,p,file));
    assets[id]={file:`pantheon-cities-h3-v1/${p}/${file}`,provenance:`Original ${p} town artwork generated with built-in image_gen. Source PNGs and prompts: docs/pantheon-cities-h3-v1.`};
  }
  assets[`town.${p}.background`]=assets[`town.${p}.background.l1`];
}
await writeFile(path.join(source, 'index.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pantheon city workshop</title><style>${css}</style><h1>Pantheon city workshop</h1><p>Five complete city kits. Each includes 33 building versions, four development backgrounds and a recovery landscape. <a href="http://127.0.0.1:5173/">Open the game</a> and import a stage save from a city's background gallery to try it. <a href="backgrounds.html">Compare all 20 development backgrounds</a>.</p><main>${catalog.map(t=>`<article><a href="${t.pantheonId}/preview.html"><img src="${t.pantheonId}/full-city.png" alt="${t.name}"><h2>${t.name}</h2></a><p><a href="${t.pantheonId}/preview.html">Arrange city</a> · <a href="${t.pantheonId}/versions.html">All buildings</a> · <a href="${t.pantheonId}/backgrounds.html">Stages & saves</a></p></article>`).join('')}</main></html>`);
await writeFile(path.join(source, 'backgrounds.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>City development comparison</title><style>${css}main{grid-template-columns:repeat(4,1fr)}article{padding:8px}h2{margin:20px 0 10px}@media(max-width:900px){main{grid-template-columns:repeat(2,1fr)}}</style><h1>From village to capital</h1><p><a href="index.html">City workshop</a></p>${catalog.map(t=>`<section><h2>${t.name}</h2><main>${[1,2,3,4].map(n=>`<article><img src="${t.pantheonId}/background.l${n}.png" alt="${t.name} stage ${n}"><p>${n} · ${['','Village','Town','City','Capital'][n]}</p></article>`).join('')}</main></section>`).join('')}</html>`);
await writeFile(path.join(source,'layouts.json'),JSON.stringify(layouts,null,2)+'\n');
if (!prepareOnly) {
  await writeFile(path.join(runtime,'manifest.json'),JSON.stringify({assets},null,2)+'\n');
  await mkdir(path.join(root,'packages/content/src/townArt'),{recursive:true});
  await writeFile(path.join(root,'packages/content/src/townArt/h3Layouts.ts'),'// Generated by tools/assets/import_pantheon_cities.mjs from the editable city kits.\nexport const H3_CITY_LAYOUTS = '+JSON.stringify(layouts,null,2)+' as const;\n');
}
console.log(`${prepareOnly?'Prepared':'Imported'} ${catalog.length} city kits, ${Object.keys(assets).length} runtime entries.`);
