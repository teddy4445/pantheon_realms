import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { splitAlphaSheet } from './split_alpha_sheet.mjs';
const sharp=createRequire(import.meta.url)(process.argv[2]||'sharp');
const docs='docs/world-polish-v2',runtime='assets-runtime/world-polish-v2',source='assets-source/world-polish-v2';
const files=JSON.parse(await readFile(`${docs}/generated-files.json`,'utf8'));
const sheets=JSON.parse(await readFile(`${docs}/sheets.json`,'utf8'));
await mkdir(runtime,{recursive:true});await mkdir(source,{recursive:true});
const manifest={decor:{},banners:{},provenance:'Built-in ImageGen, October 2026; original panels and prompts: docs/world-polish-v2.'};
const colors=['blue','red','green','amber','purple','teal','ivory','black'];
const previews=[];
for(const [sheet,file] of Object.entries(files)){
  await copyFile(file,`${source}/${sheet}.png`);
  if(sheet.startsWith('banner-')){
    const pantheon=sheet.slice(7),dest=`${runtime}/${sheet}.webp`;
    await sharp(file).resize(1440,480,{fit:'cover'}).webp({quality:90}).toFile(dest);
    manifest.banners[pantheon]={file:`world-polish-v2/${sheet}.webp`,width:1440,height:480};continue;
  }
  const metadata=await sharp(file).metadata();if(!metadata.hasAlpha)throw new Error(`No alpha: ${sheet}`);
  const raw=await sharp(file).ensureAlpha().raw().toBuffer();
  const cells=splitAlphaSheet(raw,metadata.width,metadata.height);
  for(let i=0;i<8;i++){
    const {data:cell,width:w,height:h}=cells[i];
    let x0=w,y0=h,x1=0,y1=0;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(cell[(y*w+x)*4+3]>8){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
    if(x1<=x0||y1<=y0)throw new Error(`Empty cell ${sheet}/${i}`);
    x0=Math.max(0,x0-2);y0=Math.max(0,y0-2);x1=Math.min(w-1,x1+2);y1=Math.min(h-1,y1+2);
    const cw=x1-x0+1,ch=y1-y0+1;
    const cut=await sharp(cell,{raw:{width:w,height:h,channels:4}}).extract({left:x0,top:y0,width:cw,height:ch}).png().toBuffer();
    const flag=sheet.startsWith('flags-');
    const id=flag?`map.flag.${sheet.slice(6)}.${colors[i]}`:`scenery2.${sheet}.${sheets[sheet][i]}`;
    const name=id.replaceAll('.','-'),dest=`${runtime}/${name}.webp`;
    let sprite;
    if(flag){
      // Bottom of the staff is the anchor, not the centre of the billowing cloth.
      const columns=Array(w).fill(0);
      for(let y=Math.max(y0,Math.floor(y1-ch*.14));y<=y1;y++)for(let x=x0;x<=x1;x++)if(cell[(y*w+x)*4+3]>80)columns[x]++;
      const max=Math.max(...columns),xs=columns.flatMap((n,x)=>n>=max*.8&&n>0?[x]:[]);
      const pole=xs.reduce((a,b)=>a+b,0)/xs.length;
      const width=Math.round(cw*256/ch);
      await sharp(cut).resize(width,256).webp({quality:95,alphaQuality:100}).toFile(dest);
      sprite={file:`world-polish-v2/${name}.webp`,width,height:256,pixelsPerHex:256,anchor:[(pole-x0)/cw,1],status:'final'};
    }else{
      const normalized=await sharp(cut).resize(300,300,{fit:'inside'}).png().toBuffer();const m=await sharp(normalized).metadata();
      await sharp({create:{width:320,height:320,channels:4,background:'#00000000'}}).composite([{input:normalized,left:Math.round((320-m.width)/2),top:310-m.height}]).webp({quality:92,alphaQuality:100}).toFile(dest);
      sprite={file:`world-polish-v2/${name}.webp`,width:320,height:320,pixelsPerHex:sheet==='mountains'?260:sheet==='forest'?340:sheet==='details'?540:480,anchor:[.5,310/320],status:'final'};
    }
    manifest.decor[id]=sprite;
    previews.push({id,file:dest});
  }
}
await writeFile(`${runtime}/manifest.json`,JSON.stringify(manifest,null,2)+'\n');
const contact=[];for(const [i,item]of previews.entries()){
  const x=i%8*180,y=Math.floor(i/8)*210;
  contact.push({input:await sharp(item.file).resize(164,175,{fit:'contain',background:'#00000000'}).png().toBuffer(),left:x+8,top:y});
  contact.push({input:Buffer.from(`<svg width="180" height="32"><text x="90" y="18" text-anchor="middle" font-family="Georgia" font-size="12" fill="#eddba4">${item.id.split('.').slice(-1)[0]}</text></svg>`),left:x,top:y+175});
}
await sharp({create:{width:1440,height:Math.ceil(previews.length/8)*210,channels:4,background:'#223b38'}}).composite(contact).png().toFile(`${docs}/asset-catalog.png`);
const bannerContact=[];let i=0;for(const [p,b]of Object.entries(manifest.banners)){
  bannerContact.push({input:await sharp(`${runtime}/${b.file.split('/').pop()}`).resize(720,240).png().toBuffer(),left:i%2*720,top:Math.floor(i/2)*266});
  bannerContact.push({input:Buffer.from(`<svg width="720" height="26"><text x="360" y="19" text-anchor="middle" font-family="Georgia" font-size="16" fill="#eddba4">${p}</text></svg>`),left:i%2*720,top:Math.floor(i/2)*266+240});i++;
}
await sharp({create:{width:1440,height:798,channels:4,background:'#223b38'}}).composite(bannerContact).png().toFile(`${docs}/banner-catalog.png`);
console.log(`Imported ${previews.length} cutout sprites and ${i} temple banners.`);
