import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const source=await readFile(path.resolve(root,'../../packages/content/src/greek/town.ts'),'utf8');
const definitions=new Map([...source.matchAll(/\{ id: '([^']+)', name: '([^']+)', slot: '([^']*)', level: (\d+)/g)].map(m=>[m[1],{id:m[1],name:m[2],level:+m[4]}]));
const chains=new Map([...source.matchAll(/slot\('([^']+)', '(support|dwelling)', '[^']*', \[([^\]]+)\]/g)].map(m=>[m[1],{kind:m[2],ids:[...m[3].matchAll(/'([^']+)'/g)].map(x=>x[1])}]));
const manifest=JSON.parse((await readFile(path.join(root,'manifest.json'),'utf8')).replace(/^\uFEFF/,''));
manifest.version=2;
for(const b of manifest.buildings){
 const chain=chains.get(b.id);
 if(!chain)throw Error('Missing catalog slot '+b.id);
 b.variants=chain.ids.map((id,i)=>{
   const def=definitions.get(id);if(!def)throw Error('Missing definition '+id);
   return {...def,level:i+1,file:i===chain.ids.length-1?`buildings/${b.id}.png`:`buildings/${b.id}.l${i+1}.png`,
     artAssetId:chain.kind==='dwelling'?`town.greek.dwelling.tier${b.id.slice(-1)}.${i===0?'base':'upgraded'}`:`town.greek.support.${b.id}.l${i+1}`};
 });
 b.versionId=b.variants.at(-1).id;
 b.file=b.variants.at(-1).file;
 const png=await readFile(path.join(root,b.file));
 b.frameAspectRatio=png.readUInt32BE(16)/png.readUInt32BE(20);
}
manifest.totalVersions=manifest.buildings.reduce((n,b)=>n+b.variants.length,0);
if(manifest.totalVersions!==definitions.size||manifest.totalVersions!==33)throw Error('Catalog coverage mismatch');
await writeFile(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
await writeFile(path.join(root,'manifest.js'),'window.CITY_MANIFEST = '+JSON.stringify(manifest,null,2)+';\n');
console.log(JSON.stringify({slots:manifest.buildings.length,versions:manifest.totalVersions,newImages:manifest.totalVersions-manifest.buildings.length}));
