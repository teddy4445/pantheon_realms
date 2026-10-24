import sharp from 'sharp';
import { mkdir,copyFile,writeFile } from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd(),site=path.resolve(process.argv[2]??'../pantheon_realms_website');
const output=path.join(root,'docs/images');await mkdir(output,{recursive:true});
const images={
  'cover.webp':path.join(site,'images/new/hero-six-realms.png'),
  'logo.webp':path.join(site,'images/full-logo.webp'),
  'adventure.webp':'docs/world-polish-v2/in-game/greek-map.png',
  'city.webp':'docs/greek-city-h3-prototype-v1/in-game/stage-4.png',
  'dragons.webp':'docs/neutral-dragons-integration-v1/battle-dragons.png',
  'temple.webp':'docs/world-polish-v2/in-game/egyptian-temple.png',
  'battle-setup.webp':'docs/single-battle-icons-v1/land-setup.png',
};
const provenance={};
await mkdir(path.join(site,'images/release-1.0'),{recursive:true});
for(const [name,file]of Object.entries(images)){
  const source=path.isAbsolute(file)?file:path.join(root,file);
  await sharp(source).resize({width:name==='logo.webp'?640:1440,withoutEnlargement:true}).webp({quality:86}).toFile(path.join(output,name));
  if(!['cover.webp','logo.webp'].includes(name))await copyFile(path.join(output,name),path.join(site,'images/release-1.0',name));
  provenance[name]={source:file.startsWith(root)?path.relative(root,file).replaceAll('\\','/'):file.startsWith(site)?'website/'+path.relative(site,file).replaceAll('\\','/'):file,kind:name==='cover.webp'||name==='logo.webp'?'promotional artwork':'in-game screenshot'};
}
await writeFile(path.join(output,'provenance.json'),JSON.stringify(provenance,null,2)+'\n');
console.log('Prepared seven lightweight README images and five current website screenshots.');
