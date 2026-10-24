import { Application, Container, Graphics, Sprite } from 'pixi.js';
import { FxPainter } from '../../packages/presentation/src/fx';
import { TweenPlayer } from '../../packages/presentation/src/tween';
import { EXPANSION_LOOKS } from '../../packages/presentation/src/expansionLooks';
import { PAINTED_MAGIC } from '../../packages/presentation/src/paintedMagicData';
import { takeUploads, markUploaded, loadFile, loadStrip } from '../../packages/presentation/src/textures';
import { setGraphicsQuality } from '../../packages/presentation/src/graphics';
import roster from '../../assets-runtime/expansion-magic-v1/roster.json';

const app = new Application();
await app.init({ width: 1100, height: 440, background: 0x28332d, antialias: true });
document.querySelector('#stage')!.appendChild(app.canvas);
const ground = new Graphics();
for (let y=0;y<6;y++) for(let x=0;x<12;x++) {
 const cx=x*96+(y%2)*48,cy=y*73;
 ground.poly([cx,cy-44,cx+46,cy-22,cx+46,cy+22,cx,cy+44,cx-46,cy+22,cx-46,cy-22]).fill({color:(x+y)%3?0x43513b:0x48553f,alpha:.35}).stroke({color:0xcbb682,alpha:.12,width:1});
}
app.stage.addChild(ground);
const target = new Graphics().ellipse(650,340,32,10).fill({color:0,alpha:.3})
 .roundRect(635,270,30,63,6).fill(0x8c9a9c).circle(650,258,13).fill(0xc3b08b)
 .poly([630,280,650,274,670,280,666,310,650,325,634,310]).fill(0x4f6280).stroke({color:0xbfa265,width:2});
app.stage.addChild(target);
const layer=new Container(),screen=new Container();
app.stage.addChild(layer,screen);
const tweens=new TweenPlayer(),painter=new FxPainter(layer,tweens,64,.65,{layer:screen,size:()=>({width:1100,height:440})});
app.ticker.add(t=>{for(const source of takeUploads(8)){app.renderer.texture.initSource(source);markUploaded(source);}tweens.tick(t.deltaMS);});
void loadFile('art/battle/battlefield.beacon_clearing.ground.webp').then(texture=>{
 const field=new Sprite(texture);field.width=1100;field.height=858;field.y=-220;field.alpha=.85;
 app.stage.addChildAt(field,0);ground.alpha=.3;
});
void loadStrip({file:'sprites/final/creatures/hoplite/idle.webp',frames:6,frameWidth:294,frameHeight:203,fps:3,loop:true,anchor:[.5,.8772]}).then(frames=>{
 const soldier=new Sprite(frames[0]);soldier.anchor.set(.5,.8772);soldier.scale.set(-.65,.65);soldier.position.set(650,340);
 app.stage.addChildAt(soldier,app.stage.getChildIndex(target));target.destroy();
});
const select=document.querySelector<HTMLSelectElement>('#spell')!;
const status=document.querySelector<HTMLElement>('#status')!;
const cards=document.querySelector<HTMLElement>('#cards')!;
const tour=document.querySelector<HTMLButtonElement>('#tour')!;
const titleCase=(s:string)=>s[0]!.toUpperCase()+s.slice(1);
let filter='all',tourToken=0,playing=false,castTask:Promise<void>|null=null,activeId=roster[0]!.id;
for(const item of roster){
 const option=document.createElement('option');option.value=item.id;
 option.textContent=`${titleCase(item.pantheon)} · ${item.miracle?'Miracle':'Tier '+item.tier} · ${item.name}`;select.appendChild(option);
 const card=document.createElement('button');card.className='card';card.dataset.effect=item.id;card.dataset.pantheon=item.pantheon;
 card.innerHTML=`<img src="./expansion-magic-v2/icons/${item.id}.webp" alt=""><span>${item.name}</span><small>${titleCase(item.pantheon)} · ${item.miracle?'Miracle':'Tier '+item.tier}</small>`;
 card.addEventListener('click',()=>{stopTour();void cast(item.id);});cards.appendChild(card);
}
function show(id:string){
 const item=roster.find(r=>r.id===id)!;activeId=id;select.value=id;
 document.querySelector('#title')!.textContent=item.name;
 document.querySelector('#category')!.textContent=`${titleCase(item.pantheon)} · ${item.miracle?'Miracle':'Tier '+item.tier}`;
 document.querySelector('#description')!.textContent=(PAINTED_MAGIC[id]?.sequence.split(';').slice(0,5).join(' → ')??'').replace(/^./,c=>c.toUpperCase())+'.';
 document.querySelector<HTMLImageElement>('#current-icon')!.src=`./expansion-magic-v2/icons/${id}.webp`;
 document.querySelector<HTMLImageElement>('#sheet')!.src=`./expansion-magic-v2/effects/${id}.webp`;
 for(const card of cards.querySelectorAll<HTMLElement>('.card'))card.setAttribute('aria-pressed',String(card.dataset.effect===id));
}
async function renderCast(id:string){
 if(!EXPANSION_LOOKS[id])throw Error('Unknown effect '+id);
 show(id);playing=true;status.textContent='Casting…';
 const look=EXPANSION_LOOKS[id]!,item=roster.find(r=>r.id===id)!;
 const assetId=`fx.${item.miracle?'miracle':'spell'}.${id}`;painter.preload(assetId);
 try{
  await painter.cast(look,{x:290,y:340},assetId+'.cast');
  await painter.travel(look,{x:290,y:300},{x:650,y:290},assetId+'.travel');
  await painter.impact(look,{x:650,y:340,height:85,width:1,facing:1},assetId+'.impact');
 }finally{playing=false;status.textContent='Ready';}
}
function cast(id=select.value):Promise<void>{
 const next=(castTask??Promise.resolve()).then(()=>renderCast(id));
 castTask=next;
 void next.finally(()=>{if(castTask===next)castTask=null;}).catch(()=>{});
 return next;
}
function stopTour(){tourToken++;tour.textContent=filter==='all'?'Play all 54':`Play ${roster.filter(r=>r.pantheon===filter).length} effects`;tour.setAttribute('aria-pressed','false');}
tour.addEventListener('click',async()=>{
 if(tour.getAttribute('aria-pressed')==='true'){stopTour();return;}
 const token=++tourToken;tour.textContent='Stop tour';tour.setAttribute('aria-pressed','true');
 const entries=roster.filter(r=>filter==='all'||r.pantheon===filter);
 for(const item of entries){if(token!==tourToken)break;await cast(item.id);if(token!==tourToken)break;await new Promise(r=>setTimeout(r,450));}
 if(token===tourToken)stopTour();
});
for(const key of ['all',...new Set(roster.map(r=>r.pantheon))]){
 const button=document.createElement('button');button.textContent=titleCase(key);button.setAttribute('aria-pressed',String(key===filter));
 button.addEventListener('click',()=>{
  filter=key;stopTour();
  for(const b of document.querySelectorAll('#filters button'))b.setAttribute('aria-pressed',String(b===button));
  for(const card of cards.querySelectorAll<HTMLElement>('.card'))card.hidden=filter!=='all'&&card.dataset.pantheon!==filter;
  // Explicit display override because the card layout is flex.
  for(const card of cards.querySelectorAll<HTMLElement>('.card'))card.style.display=card.hidden?'none':'';
 });
 document.querySelector('#filters')!.appendChild(button);
}
document.querySelector('#cast')!.addEventListener('click',()=>{stopTour();void cast();});
select.addEventListener('change',()=>{stopTour();void cast();});
document.querySelector<HTMLSelectElement>('#speed')!.addEventListener('change',e=>{tweens.speed=Number((e.target as HTMLSelectElement).value);});
show(activeId);
Object.assign(window,{magicPreview:{cast,ids:roster.map(r=>r.id),speed:(n:number)=>{tweens.speed=n;},busy:()=>playing,skip:()=>tweens.flush(),quality:setGraphicsQuality,activeEffectCount:()=>layer.children.length}});
void cast(activeId);
