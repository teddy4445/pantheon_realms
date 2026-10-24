import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const source=path.join(root,'docs/greek-city-h3-prototype-v1');
const runtime=path.join(root,'assets-runtime/greek-city-h3-v1');
const kit=JSON.parse((await readFile(path.join(source,'manifest.json'),'utf8')).replace(/^\uFEFF/,''));
await mkdir(path.join(runtime,'buildings'),{recursive:true});
const assets={};
const provenance='Greek polis art prototype, generated with built-in image_gen; source and prompts in docs/greek-city-h3-prototype-v1.';
for(const slot of kit.buildings)for(const variant of slot.variants){
 await copyFile(path.join(source,variant.file),path.join(runtime,variant.file));
 assets[variant.artAssetId]={file:'greek-city-h3-v1/'+variant.file,provenance};
}
for(let level=1;level<=4;level++){
 const file=`background.l${level}.png`;
 await copyFile(path.join(source,file),path.join(runtime,file));
 assets[`town.greek.background.l${level}`]={file:'greek-city-h3-v1/'+file,provenance};
}
assets['town.greek.background']=assets['town.greek.background.l1'];
await copyFile(path.join(source,'background.damaged.png'),path.join(runtime,'background.damaged.png'));
assets['town.greek.background.damaged']={file:'greek-city-h3-v1/background.damaged.png',provenance};
await writeFile(path.join(runtime,'manifest.json'),JSON.stringify({assets},null,2)+'\n');
// The composition changes visual placements only; building chains and rules stay intact.
const townPath=path.join(root,'packages/content/src/greek/town.ts');
let town=await readFile(townPath,'utf8');
if(!town.includes('sceneAspectRatio:'))town=town.replace("backgroundAssetId: 'town.greek.background',","backgroundAssetId: 'town.greek.background',\n  sceneAspectRatio: 3 / 2,");
if(!town.includes('damagedBackgroundAssetId:'))town=town.replace("backgroundAssetId: 'town.greek.background',","backgroundAssetId: 'town.greek.background',\n  damagedBackgroundAssetId: 'town.greek.background.damaged',");
for(const b of kit.buildings){
 const y=Math.min(100,b.y);
 const placement=`{ x: ${b.x}, y: ${y}, width: ${b.width}, height: ${+(b.width*1.5/b.frameAspectRatio).toFixed(3)}, layer: ${b.layer}, artAspectRatio: ${b.frameAspectRatio} }`;
 const re=new RegExp("(slot\\('"+b.id+"',[^\\n]+?\\], )\\{[^}]+\\}");
 if(!re.test(town))throw Error('Missing slot '+b.id);
 town=town.replace(re,(_,prefix)=>prefix+placement);
}
town=town.replace("// Sky and sea at the top left; Athena's statue stands at the top centre-right.","// Coastal polis composition: clear sea/sky at the top left.");
await writeFile(townPath,town);
console.log(`Imported ${Object.keys(assets).length} Greek assets and ${kit.buildings.length} placements.`);
