import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sharp=createRequire(import.meta.url)(process.argv[2]||'sharp');
const partial=process.argv.includes('--partial');
const plan=JSON.parse(await readFile(path.join(root,'design/roster.json'),'utf8'));
const jobs=JSON.parse(await readFile(path.join(root,'design/animation-prompts.json'),'utf8'));
const out=path.join(root,'assets'); await mkdir(out,{recursive:true});
const manifest={version:1,status:'review-only-not-integrated',creatures:{},effects:{}}, report=[];
function seam(data,w,h,axis,nominal,radius,lo,hi){
 let best=Math.round(nominal),score=Infinity;
 const max=axis==='x'?w:h;
 for(let p=Math.max(1,Math.floor(nominal-radius));p<Math.min(max-1,Math.ceil(nominal+radius));p++){
  let ink=Math.abs(p-nominal)/Math.max(1,radius)*.02;
  for(let q=lo;q<hi;q++)for(let d=-4;d<=4;d++){
   const x=axis==='x'?p+d:q,y=axis==='x'?q:p+d;
   if(x>=0&&x<w&&y>=0&&y<h)ink+=data[(y*w+x)*4+3]/255;
  }
  if(ink<score){score=ink;best=p;}
 }return best;
}
function bounds(data,w,h){let left=w,top=h,right=-1,bottom=-1,count=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(data[(y*w+x)*4+3]>24){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);count++;}
 return {left,top,right,bottom,count,width:right-left+1,height:bottom-top+1};
}
// Follow the transparent gutter when feather tips make a straight row cut unsafe.
function curvedRow(data,w,h,nominal,radius){
 const lo=Math.max(1,Math.floor(nominal-radius)),hi=Math.min(h-2,Math.ceil(nominal+radius)),n=hi-lo+1;
 let previous=new Float64Array(n),next=new Float64Array(n);const trace=new Int8Array(w*n);
 for(let x=0;x<w;x++){
  for(let k=0;k<n;k++){
   let best=previous[k],step=0;
   if(k>0&&previous[k-1]+.04<best){best=previous[k-1]+.04;step=-1;}
   if(k<n-1&&previous[k+1]+.04<best){best=previous[k+1]+.04;step=1;}
   const y=lo+k,a=data[(y*w+x)*4+3]+data[((y-1)*w+x)*4+3];
   next[k]=best+a*10+Math.abs(y-nominal)/radius*.003;trace[x*n+k]=step;
  }
  [previous,next]=[next,previous];
 }
 let k=0;for(let j=1;j<n;j++)if(previous[j]<previous[k])k=j;
 const cut=new Int32Array(w);for(let x=w-1;x>=0;x--){cut[x]=lo+k;k+=trace[x*n+k];}return cut;
}
for(const f of plan.forms){
 const dir=path.join(out,f.id);await mkdir(dir,{recursive:true});
 const master=path.join(root,'source',f.id+'-master.png'),portrait=path.join(root,'source',f.id+'-portrait.png');
 if(!existsSync(master)||!existsSync(portrait)){if(partial)continue;throw Error('Missing master/portrait '+f.id);}
 const raw=await sharp(master).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const b=bounds(raw.data,raw.info.width,raw.info.height);
 if(b.count/raw.info.width/raw.info.height>.92)throw Error('Master is not transparent: '+f.id);
 await sharp(master).trim({threshold:12}).resize(640,640,{fit:'contain',background:'#00000000'}).png().toFile(path.join(dir,'stand.png'));
 for(const size of [48,64,96,160,320])await sharp(portrait).resize(size,size).webp({quality:95}).toFile(path.join(dir,'portrait-'+size+'.webp'));
 for(const size of [64,96,160])await sharp(master).trim({threshold:12}).resize(size-8,size-8,{fit:'contain',background:'#00000000'}).extend({top:4,bottom:4,left:4,right:4,background:'#00000000'}).webp({quality:95,alphaQuality:100}).toFile(path.join(dir,'map-'+size+'.webp'));
 manifest.creatures[f.id]={status:'final',reviewApproved:false,provenance:'Built-in image_gen; prepared for review only. See design/*.json.',facing:'right',pixelsPerHex:384/2.2,animations:{},portraits:{small:'assets/'+f.id+'/portrait-64.webp',large:'assets/'+f.id+'/portrait-320.webp'},events:{attackContactFrame:2,shoot:{releaseFrame:3,sourcePoint:'mouth',socket:[.84,.4]},hover:{idleHex:0,travelHex:.55},death:{holdLastFrame:true,onWater:'sink-fade',sinkHex:.5,fadeMs:700}}};
}
for(const job of jobs){
 job.output=path.join(root,'source',path.basename(job.output));
 if(!existsSync(job.output)){if(partial)continue;throw Error('Missing sheet '+job.id);}
 const raw=await sharp(job.output).ensureAlpha().raw().toBuffer({resolveWithObject:true}),{width:w,height:h}=raw.info;
 const cols=job.columns,rows=job.rows,cw=w/cols,ch=h/rows,frame=384,pad=.4,extent=1+2*pad;
 const rowBounds=[0,...Array.from({length:rows-1},(_,r)=>seam(raw.data,w,h,'y',(r+1)*ch,ch*.3,0,w)),h];
 const curved=job.type==='effect'?null:[new Int32Array(w),...Array.from({length:rows-1},(_,r)=>curvedRow(raw.data,w,h,(r+1)*ch,ch*.3)),new Int32Array(w).fill(h)];
 const cells=[], metrics=[];
 for(let row=0;row<rows;row++){
  const y0=rowBounds[row],y1=rowBounds[row+1];
  const cb=[0,...Array.from({length:cols-1},(_,c)=>seam(raw.data,w,h,'x',(c+1)*cw,cw*.18,y0,y1)),w];
  for(let col=0;col<cols;col++){
   const top=curved?Math.min(...curved[row].slice(cb[col],cb[col+1])):y0;
   const bottom=curved?Math.max(...curved[row+1].slice(cb[col],cb[col+1])):y1;
   const rect={left:cb[col],top,width:cb[col+1]-cb[col],height:bottom-top};
   const crop=await sharp(job.output).extract(rect).ensureAlpha().raw().toBuffer({resolveWithObject:true});
   if(curved)for(let y=0;y<rect.height;y++)for(let x=0;x<rect.width;x++){
    const sx=rect.left+x,sy=rect.top+y;
    if(sy<curved[row][sx]||sy>=curved[row+1][sx])crop.data[(y*rect.width+x)*4+3]=0;
   }
   const b=bounds(crop.data,crop.info.width,crop.info.height),area=crop.info.width*crop.info.height;
   if(b.count<30||b.count/area>.9)throw Error('Empty/opaque frame '+job.id+' '+row+','+col);
   const canvasW=Math.ceil(cw*extent),canvasH=Math.ceil(ch*extent);
   const padded=await sharp({create:{width:canvasW,height:canvasH,channels:4,background:'#00000000'}}).composite([{input:await sharp(crop.data,{raw:crop.info}).png().toBuffer(),left:Math.round(rect.left-col*cw+cw*pad),top:Math.round(rect.top-row*ch+ch*pad)}]).png().toBuffer();
   const normalized=await sharp(padded).resize(frame,frame,{fit:'contain',background:'#00000000'}).png().toBuffer();
   cells.push({input:normalized,left:col*frame,top:row*frame});
   metrics.push({row,col,occupancy:Math.round(b.count/area*100),box:[b.left,b.top,b.width,b.height],ground:.5+(b.bottom+rect.top-row*ch-ch/2)/(Math.max(cw,ch)*extent)});
  }
 }
 const file='assets/'+job.form+'/'+(job.type==='effect'?'special-fx':job.id.split('-anim-')[1])+'.webp';
 await sharp({create:{width:cols*frame,height:rows*frame,channels:4,background:'#00000000'}}).composite(cells).webp({quality:93,alphaQuality:100}).toFile(path.join(root,file));
 const anchor=[.5,.5+(.86-.5)*ch/(Math.max(cw,ch)*extent)];
 const firstWidth=metrics[0].box[2]*frame/(Math.max(cw,ch)*extent);
 const referenceWidth=manifest.creatures[job.form]?.pixelsPerHex*2.2;
 const scale=job.type==='effect'||job.states?.includes('idle')?1:Math.min(1.3,Math.max(.65,referenceWidth/firstWidth));
 const region=(i,grounded=false)=>({rect:[(i%cols)*frame,Math.floor(i/cols)*frame,frame,frame],anchor:[frame*anchor[0],frame*(grounded?metrics[i].ground:anchor[1])],sourceScale:scale});
 if(job.type==='effect'){manifest.effects[job.form]={file,frames:8,frameWidth:frame,frameHeight:frame,regions:Array.from({length:8},(_,i)=>region(i)),anchor,fps:8,loop:false};}
 else if(manifest.creatures[job.form])job.states.forEach((state,n)=>{
  const spec=plan.animations.find(a=>a.name===state);
  manifest.creatures[job.form].animations[state]={file,frames:6,frameWidth:frame,frameHeight:frame,fps:spec.fps,loop:spec.loop,anchor,regions:Array.from({length:6},(_,i)=>region(n*6+i,!['takeoff','fly','landing'].includes(state))),status:'final'};
  if(state==='idle'){
   const widths=metrics.slice(n*6,n*6+6).map(m=>m.box[2]*frame/(Math.max(cw,ch)*extent)).sort((a,b)=>a-b);
   manifest.creatures[job.form].pixelsPerHex=Math.round(((widths[2]+widths[3])/2)/2.2*100)/100;
  }
 });
 report.push({id:job.id,file,sourceSize:[w,h],frames:cols*rows,metrics});
}
await writeFile(path.join(root,'design/sprite-manifest.json'),JSON.stringify(manifest,null,2));
await writeFile(path.join(root,'design/import-report.json'),JSON.stringify(report,null,2));
const merge=structuredClone(manifest);
delete merge.version;delete merge.status;
for(const c of Object.values(merge.creatures)){delete c.reviewApproved;delete c.portraits;for(const s of Object.values(c.animations))s.file=s.file.replace(/^assets\//,'neutral-dragons-v1/');}
for(const e of Object.values(merge.effects))e.file=e.file.replace(/^assets\//,'neutral-dragons-v1/');
await writeFile(path.join(root,'design/sprite-manifest-merge.json'),JSON.stringify(merge,null,2));
console.log(JSON.stringify({forms:Object.keys(manifest.creatures).length,animations:Object.values(manifest.creatures).reduce((n,c)=>n+Object.keys(c.animations).length,0),effects:Object.keys(manifest.effects).length,sheets:report.length}));

