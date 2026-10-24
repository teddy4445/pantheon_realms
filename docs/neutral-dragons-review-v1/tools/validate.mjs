import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sharp=createRequire(import.meta.url)(process.argv[2]||'sharp');
const plan=JSON.parse(await readFile(path.join(root,'design/roster.json'),'utf8'));
const manifest=JSON.parse(await readFile(path.join(root,'design/sprite-manifest.json'),'utf8'));
assert.equal(manifest.status,'review-only-not-integrated');
assert.equal(plan.forms.length,6);assert.equal(plan.animations.length,13);
const checks=[],files=new Set(),qa=path.join(root,'qa');await mkdir(qa,{recursive:true});
async function checkImage(file,width,height,transparent=false){
 const buf=await readFile(path.join(root,file)),meta=await sharp(buf).metadata();
 if(width)assert.equal(meta.width,width,file+' width');if(height)assert.equal(meta.height,height,file+' height');
 if(transparent){assert.ok(meta.hasAlpha,file+' alpha');const {data,info}=await sharp(buf).ensureAlpha().raw().toBuffer({resolveWithObject:true});let empty=0,ink=0;
 for(let i=3;i<data.length;i+=4){if(data[i]<8)empty++;if(data[i]>64)ink++;}
 assert.ok(empty>info.width*info.height*.1,file+' transparent surround');assert.ok(ink>100,file+' visible content');}
 files.add(file);return meta;
}
for(const form of plan.forms){
 const c=manifest.creatures[form.id];assert.ok(c,form.id);assert.equal(c.reviewApproved,false);
 assert.equal(form.stats.shots,0);assert.equal(form.ability.implementationStatus,'proposed-not-implemented');
 assert.deepEqual(Object.keys(c.animations).sort(),plan.animations.map(a=>a.name).sort());
 for(const n of [48,64,96,160,320])await checkImage(`assets/${form.id}/portrait-${n}.webp`,n,n);
 for(const n of [64,96,160])await checkImage(`assets/${form.id}/map-${n}.webp`,n,n,true);
 await checkImage(`assets/${form.id}/stand.png`,640,640,true);
 const tiles=[];
 for(const [row,spec]of plan.animations.entries()){
  const s=c.animations[spec.name];assert.equal(s.frames,6);assert.equal(s.regions.length,6);assert.equal(s.fps,spec.fps);assert.equal(s.loop,spec.loop);
  const meta=await checkImage(s.file,null,null,true),hashes=[];
  for(const r of s.regions){const [x,y,w,h]=r.rect;assert.ok(x>=0&&y>=0&&x+w<=meta.width&&y+h<=meta.height,s.file+' region');assert.ok(r.anchor[0]>=0&&r.anchor[0]<=w&&r.anchor[1]>=0&&r.anchor[1]<=h);
   const b=await sharp(path.join(root,s.file)).extract({left:x,top:y,width:w,height:h}).png().toBuffer();hashes.push(createHash('sha256').update(b).digest('hex'));}
  assert.ok(new Set(hashes).size>=4,form.id+' '+spec.name+' distinct poses');
  for(const [col,n]of [0,2,5].entries()) {const [left,top,width,height]=s.regions[n].rect;tiles.push({input:await sharp(path.join(root,s.file)).extract({left,top,width,height}).resize(256,256).png().toBuffer(),left:col*256,top:row*256});}
 }
 const fx=manifest.effects[form.id];assert.equal(fx.frames,8);assert.equal(fx.regions.length,8);await checkImage(fx.file,1536,768,true);
 await sharp({create:{width:768,height:13*256,channels:4,background:'#b9b5a6'}}).composite(tiles).webp({quality:92}).toFile(path.join(qa,form.id+'-motions.webp'));
 checks.push({id:form.id,states:13,poses:78,effectFrames:8,smallImages:8});
}
const overview=[];
for(const [i,f]of plan.forms.entries())overview.push({input:await sharp(path.join(root,`assets/${f.id}/stand.png`)).resize(480,480).png().toBuffer(),left:(i%2)*480,top:Math.floor(i/2)*480});
await sharp({create:{width:960,height:1440,channels:4,background:'#253238'}}).composite(overview).png().toFile(path.join(qa,'six-forms.png'));
const portraits=[];for(const [i,f]of plan.forms.entries())portraits.push({input:await sharp(path.join(root,`assets/${f.id}/portrait-320.webp`)).png().toBuffer(),left:(i%2)*320,top:Math.floor(i/2)*320});
await sharp({create:{width:640,height:960,channels:4,background:'#253238'}}).composite(portraits).png().toFile(path.join(qa,'six-portraits.png'));
const hashes=[];for(const file of [...files].sort())hashes.push({file,sha256:createHash('sha256').update(await readFile(path.join(root,file))).digest('hex')});
const report={status:'passed',checks,totals:{forms:6,animations:78,creaturePoses:468,effectPoses:48,smallImages:48,assetFiles:files.size},note:'Structural validation only. Artwork and animation still require human review; balance is unplaytested.'};
await writeFile(path.join(root,'design/validation-report.json'),JSON.stringify(report,null,2));await writeFile(path.join(root,'design/asset-checksums.json'),JSON.stringify(hashes,null,2));console.log(JSON.stringify(report));
