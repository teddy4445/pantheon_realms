import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

// Run export-catalog.mjs first. An explicit destination prevents accidental edits
// to another checkout; all published image paths remain relative for GitHub Pages.
const game=process.cwd(),site=path.resolve(process.argv[2]??'../pantheon_realms_website');
const c=JSON.parse(await readFile(path.join(game,'test-results/docs-catalog/catalog.json'),'utf8'));
const prior=await readFile(path.join(site,'game-data.js'),'utf8');
const data=JSON.parse(prior.slice(prior.indexOf('window.REALMS_DATA =')+'window.REALMS_DATA ='.length).trim().replace(/;$/,''));
const manifests=['placeholders','ui','art','greek-city-h3-v1','pantheon-cities-h3-v1'];
let assets={};
for(const m of manifests)Object.assign(assets,JSON.parse(await readFile(path.join(game,'assets-runtime',m,'manifest.json'),'utf8')).assets);
Object.assign(assets,JSON.parse(await readFile(path.join(game,'assets-runtime/ui/final-manifest.json'),'utf8')).assets);
// Latest city art takes precedence over older generic UI records.
for(const m of ['greek-city-h3-v1','pantheon-cities-h3-v1'])Object.assign(assets,JSON.parse(await readFile(path.join(game,'assets-runtime',m,'manifest.json'),'utf8')).assets);
await mkdir(path.join(site,'images/current-cities'),{recursive:true});
const provenance={};
async function image(id,large=false){
  if(provenance[id])return provenance[id].url;
  const a=assets[id];if(!a)throw new Error(`Missing asset ${id}`);
  const url=`./images/current-cities/${id}.webp`;
  await sharp(path.join(game,'assets-runtime',a.file)).resize({width:large?1440:640,height:large?1440:640,fit:'inside',withoutEnlargement:true}).webp({quality:86,alphaQuality:100}).toFile(path.join(site,url));
  provenance[id]={source:`assets-runtime/${a.file}`,url};return url;
}
for(const p of data){
  const def=c.pantheons[p.id],town=c.townArchetypes[def.townArchetypeId];
  p.town.name=town.name;p.town.aspectRatio=town.sceneAspectRatio??1.5;
  p.town.backgrounds=await Promise.all([1,2,3,4].map(n=>image(`${town.backgroundAssetId}.l${n}`,true)));
  p.town.slots=[];
  for(const slot of town.slots){
    const levels=[];
    for(const id of slot.chain){const b=c.buildings[id];levels.push({id,name:b.name,image:await image(b.artAssetId)});}
    p.town.slots.push({id:slot.id,label:slot.label,placement:slot.placement,levels});
  }
  for(const step of p.town.steps)for(const [id,level] of Object.entries(step.buildings)){
    if(level>(p.town.slots.find(s=>s.id===id)?.levels.length??0))throw new Error(`Obsolete showcase step ${p.id}/${id}/${level}`);
  }
}
await writeFile(path.join(site,'game-data.js'),'/* Current game catalog and painted city art; refreshed 2026-10-24. */\nwindow.REALMS_DATA = '+JSON.stringify(data)+';\n');
await writeFile(path.join(site,'production/current-city-provenance.json'),JSON.stringify(provenance,null,2)+'\n');
console.log(`Updated ${data.length} city showcases; ${Object.keys(provenance).length} current art assets.`);
