const original=structuredClone(window.CITY_MANIFEST);
let data=structuredClone(original),selected=null,reference=false;
const stage=document.querySelector('#stage'),list=document.querySelector('#list');
function version(b){return b.variants.find(v=>v.id===b.versionId)??b.variants.at(-1);}
function update(){
 const civic=data.buildings.find(b=>b.id==='civic_hall');
 const stageLevel=civic?version(civic).level:1;
 data.background=`background.l${stageLevel}.png`;
 const background=document.querySelector('.background');
 if(background.getAttribute('src')!==data.background)background.src=data.background;
 document.querySelector('#background-stage').value=String(stageLevel);
 for(const b of data.buildings){
  const v=version(b),img=document.getElementById('art-'+b.id);
  b.file=v.file;
  if(img.getAttribute('src')!==v.file)img.src=v.file;
  img.alt=v.name;img.title=v.name;
  img.style.left=b.x+'%';img.style.top=b.y+'%';img.style.width=b.width+'%';
  img.style.height=(b.width*1.5/b.frameAspectRatio)+'%';
  img.style.objectFit='contain';img.style.objectPosition='center bottom';
  img.style.zIndex=b.layer;img.style.display=b.visible?'':'none';
  img.classList.toggle('selected',selected===b.id);
  document.getElementById('check-'+b.id).checked=b.visible;
  document.getElementById('version-'+b.id).value=b.versionId;
 }
 const b=data.buildings.find(b=>b.id===selected);
 document.querySelector('#name').textContent=b?version(b).name:'Select a building';
 document.querySelector('#width').disabled=!b;document.querySelector('#depth').disabled=!b;
 if(b){
  document.querySelector('#width').value=b.width;document.querySelector('#depth').value=b.layer;
  document.querySelector('#coordinates').textContent=`x ${b.x.toFixed(1)}% · y ${b.y.toFixed(1)}% · width ${b.width.toFixed(1)}% · depth ${b.layer}`;
 }
}
function select(id){selected=id;update();}
for(const b of data.buildings){
 const img=document.createElement('img');img.id='art-'+b.id;img.className='building';img.draggable=false;stage.append(img);
 const group=document.createElement('div');group.className='building-controls';
 const row=document.createElement('div');row.className='row';
 const check=document.createElement('input');check.type='checkbox';check.id='check-'+b.id;check.setAttribute('aria-label','Show '+b.name);
 check.onchange=()=>{data.buildings.find(v=>v.id===b.id).visible=check.checked;update()};
 const button=document.createElement('button');button.textContent=b.name;button.onclick=()=>select(b.id);
 row.append(check,button);
 const picker=document.createElement('select');picker.id='version-'+b.id;picker.setAttribute('aria-label',b.name+' version');
 for(const v of b.variants){const option=document.createElement('option');option.value=v.id;option.textContent=`${v.level}. ${v.name}`;picker.append(option);}
 picker.onchange=()=>{data.buildings.find(v=>v.id===b.id).versionId=picker.value;selected=b.id;update()};
 group.append(row,picker);list.append(group);
 img.onpointerdown=e=>{
  if(reference)return;e.preventDefault();select(b.id);
  const item=data.buildings.find(v=>v.id===b.id),rect=stage.getBoundingClientRect(),start={x:e.clientX,y:e.clientY,bx:item.x,by:item.y};
  img.setPointerCapture(e.pointerId);
  img.onpointermove=ev=>{item.x=Math.min(110,Math.max(-10,start.bx+100*(ev.clientX-start.x)/rect.width));item.y=Math.min(120,Math.max(0,start.by+100*(ev.clientY-start.y)/rect.height));update()};
  img.onpointerup=img.onpointercancel=()=>{img.onpointermove=null};
 };
}
document.querySelector('#all').onclick=()=>{data.buildings.forEach(b=>b.visible=true);update()};
document.querySelector('#background-stage').onchange=e=>{
 const b=data.buildings.find(b=>b.id==='civic_hall');
 b.versionId=b.variants.find(v=>v.level===+e.target.value).id;update();
};
document.querySelector('#none').onclick=()=>{data.buildings.forEach(b=>b.visible=false);update()};
document.querySelector('#base').onclick=()=>{data.buildings.forEach(b=>{b.visible=true;b.versionId=b.variants[0].id});update()};
document.querySelector('#maximum').onclick=()=>{data.buildings.forEach(b=>{b.visible=true;b.versionId=b.variants.at(-1).id});update()};
document.querySelector('#reference').onclick=e=>{reference=!reference;document.querySelector('#concept').style.display=reference?'block':'none';e.target.textContent=reference?'View assembled layers':'View concept'};
document.querySelector('#reset').onclick=()=>{data=structuredClone(original);update()};
document.querySelector('#width').oninput=e=>{const b=data.buildings.find(b=>b.id===selected);if(b){b.width=+e.target.value;update()}};
document.querySelector('#depth').oninput=e=>{const b=data.buildings.find(b=>b.id===selected);if(b){b.layer=+e.target.value;update()}};
document.querySelector('#export').onclick=()=>{
 const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download='celtic-city-placements.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
update();
