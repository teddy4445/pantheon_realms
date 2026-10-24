/** Extract the eight isolated subjects, retaining spill beyond nominal atlas cells.
 * Connected alpha islands are assigned to the nearest main subject, so leaves or
 * roots crossing a grid line never get cut off or leak into the neighbouring sprite. */
export function splitAlphaSheet(data,width,height){
  const count=width*height,labels=new Int32Array(count).fill(-1),queue=new Int32Array(count),parts=[];
  for(let start=0;start<count;start++){
    if(labels[start]>=0||data[start*4+3]<=8)continue;
    const id=parts.length;let head=0,tail=1;queue[0]=start;labels[start]=id;
    const p={id,n:0,x0:width,y0:height,x1:0,y1:0,sx:0,sy:0};
    while(head<tail){const i=queue[head++],x=i%width,y=Math.floor(i/width);p.n++;p.sx+=x;p.sy+=y;p.x0=Math.min(p.x0,x);p.x1=Math.max(p.x1,x);p.y0=Math.min(p.y0,y);p.y1=Math.max(p.y1,y);
      for(const dy of [-1,0,1])for(const dx of [-1,0,1]){if(!dx&&!dy)continue;const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=width||ny>=height)continue;const j=ny*width+nx;if(labels[j]<0&&data[j*4+3]>8){labels[j]=id;queue[tail++]=j;}}
    }parts.push({...p,cx:p.sx/p.n,cy:p.sy/p.n});
  }
  const mains=[...parts].sort((a,b)=>b.n-a.n).slice(0,8);
  const ordered=Array(8);
  for(const p of mains){const i=Math.min(3,Math.floor(p.cx/(width/4)))+4*Math.min(1,Math.floor(p.cy/(height/2)));if(ordered[i])throw new Error(`Overlapping subject centres in cell ${i}`);ordered[i]=p;}
  if(ordered.some(x=>!x)||mains.length!==8)throw new Error('Expected eight separate subjects');
  const belongs=parts.map(p=>{
    const mainIndex=ordered.findIndex(m=>m.id===p.id);if(mainIndex>=0)return mainIndex;
    if(p.n<3)return -1;
    const ranked=ordered.map((m,i)=>{const dx=Math.max(m.x0-p.cx,0,p.cx-m.x1),dy=Math.max(m.y0-p.cy,0,p.cy-m.y1);return {i,edge:Math.hypot(dx,dy),d:dx*dx+dy*dy+.015*((p.cx-m.cx)**2+(p.cy-m.cy)**2)};}).sort((a,b)=>a.d-b.d);
    return ranked[0].edge<=48?ranked[0].i:-1;
  });
  const owners=new Int8Array(count).fill(-1);
  for(let i=0;i<count;i++)if(labels[i]>=0)owners[i]=belongs[labels[i]];
  // Preserve faint anti-alias pixels attached to a subject's edge.
  for(let i=0;i<count;i++)if(owners[i]<0&&data[i*4+3]>0&&data[i*4+3]<=8){const x=i%width,y=Math.floor(i/width);for(const [dx,dy]of [[-1,0],[1,0],[0,-1],[0,1]]){const nx=x+dx,ny=y+dy,j=ny*width+nx;if(nx>=0&&ny>=0&&nx<width&&ny<height&&labels[j]>=0&&belongs[labels[j]]>=0){owners[i]=belongs[labels[j]];break;}}}
  return ordered.map((m,k)=>{
    let x0=width,y0=height,x1=0,y1=0;
    for(let i=0;i<count;i++)if(owners[i]===k){const x=i%width,y=Math.floor(i/width);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
    const w=x1-x0+1,h=y1-y0+1,out=Buffer.alloc(w*h*4);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y+y0)*width+x+x0;if(owners[i]===k)data.copy(out,(y*w+x)*4,i*4,i*4+4);}
    return {data:out,width:w,height:h,origin:[x0,y0],mainPixels:m.n};
  });
}
