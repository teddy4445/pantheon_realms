const $=s=>document.querySelector(s), cache=new Map();let roster,manifest,family='yinglong',state='idle',elapsed=0,last=0,playing=true,rate=1,tour=false,loaded=[],familyToken=0;
const pretty=s=>s[0].toUpperCase()+s.slice(1), families={yinglong:['Yinglong','Chinese rain dragon'],zilant:['Zilant','Tatar / Kazan winged serpent'],cuelebre:['Cuélebre','Asturian guardian serpent']};
async function img(src){if(!cache.has(src))cache.set(src,new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(Error('Missing image '+src));i.src=src;}));return cache.get(src);}
let field=null;img('battlefield.webp').then(i=>field=i).catch(()=>{});
function duration(s){return s.frames/s.fps*1000;}
function frameAt(s,t){const d=duration(s);return Math.min(s.frames-1,Math.floor(Math.min(t,d-1)/d*s.frames));}
function drawPose(ctx,image,s,frame,x,y,size,alpha=1,mirror=false){const r=s.regions[frame],a=r.anchor;size*=r.sourceScale??1;ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);if(mirror)ctx.scale(-1,1);ctx.drawImage(image,...r.rect,-a[0]/r.rect[2]*size,-a[1]/r.rect[3]*size,size,size);ctx.restore();}
function backdrop(ctx){const mode=$('#backdrop').value;ctx.clearRect(0,0,600,420);
 if(mode==='field'&&field){ctx.drawImage(field,0,0,field.width,field.height,0,-90,600,560);ctx.fillStyle='#0a151522';ctx.fillRect(0,0,600,420);}
 else{ctx.fillStyle=mode==='light'?'#e2d7b9':mode==='checker'?'#26333b':'#1d2b30';ctx.fillRect(0,0,600,420);if(mode==='checker'){ctx.fillStyle='#34414a';for(let y=0;y<420;y+=20)for(let x=0;x<600;x+=20)if((x/20+y/20)%2)ctx.fillRect(x,y,20,20);}}
 ctx.fillStyle='#00000033';ctx.beginPath();ctx.ellipse(300,350,105,14,0,0,Math.PI*2);ctx.fill();
}
function particles(ctx,f,t){if(t<.3||t>.96)return;const k=(t-.3)/.66;ctx.save();ctx.globalAlpha=Math.sin(k*Math.PI)*.5;
 for(let i=0;i<15;i++){const q=i*2.399,r=75+(i%4)*17;if(f.familyId==='yinglong'){ctx.strokeStyle='#b9eef2';ctx.lineWidth=1.5;const x=300+Math.cos(q)*r,y=120+((k*200+i*17)%220);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-3,y+10);ctx.stroke();}
 else if(f.familyId==='zilant'){ctx.fillStyle=i%3?'#d35b48':'#ffd28b';ctx.beginPath();ctx.arc(300+Math.cos(q)*r*k,235+Math.sin(q)*r*k*.5,1.5,0,7);ctx.fill();}
 else{ctx.save();ctx.translate(300+Math.cos(q+k)*r,200+k*130+Math.sin(q)*30);ctx.rotate(q+k);ctx.fillStyle=i%2?'#e9dcc1':'#bf8b59';ctx.beginPath();ctx.ellipse(0,0,2,6,0,0,7);ctx.fill();ctx.restore();}}
 ctx.restore();
}
function render(now){const dt=last?Math.min(100,now-last):0;last=now;if(playing)elapsed+=dt*rate;
 let d=loaded[0]?duration(loaded[0].strip):3000;
 if(elapsed>d+900&&tour){const n=roster.animations.findIndex(a=>a.name===state);setState(roster.animations[(n+1)%roster.animations.length].name);}
 else if(!tour&&elapsed>d+(loaded[0]?.strip.loop?0:900)&&$('#repeat').checked)elapsed=0;
 for(const v of loaded){const {ctx,image,strip,f,fx,fxImage}=v;backdrop(ctx);const frame=frameAt(strip,elapsed);const frac=Math.min(elapsed,d-1)/d*strip.frames-frame;
 const mix=$('#blend').checked&&frame<strip.frames-1?Math.max(0,(frac-.78)/.22):0;
 const displaySize=384/manifest.creatures[f.id].pixelsPerHex*120;
 drawPose(ctx,image,strip,frame,300,350,displaySize,1-mix);
 if(mix)drawPose(ctx,image,strip,frame+1,300,350,displaySize,mix);
 if(state==='ability'&&$('#effects').checked&&fx&&fxImage){const t=elapsed/d;if(t>.2&&t<1){const ft=(t-.2)/.8;drawPose(ctx,fxImage,fx,Math.min(7,Math.floor(ft*8)),300,355,410,Math.sin(ft*Math.PI)*.85);particles(ctx,f,t);}}
 }
 if(loaded.length){const f=frameAt(loaded[0].strip,elapsed);$('#frame').value=f;$('#frame-number').value=(f+1)+' / 6';}
 requestAnimationFrame(render);
}
async function loadPair(){const token=++familyToken;loaded=[];$('#pair').innerHTML='';const forms=roster.forms.filter(f=>f.familyId===family);
 for(const f of forms){const c=manifest.creatures[f.id],s=c?.animations[state];if(!s)throw Error('Animation not prepared: '+f.name+' / '+state);
 const article=document.createElement('article');article.className='creature';article.dataset.form=f.id;
 article.innerHTML='<div class="card-head"><img src="assets/'+f.id+'/portrait-64.webp" alt=""><div><span class="tag">'+f.form+' · Tier 7 · Flying</span><h3>'+f.name+'</h3><span class="role">'+f.role+'</span></div></div><div class="stage"><canvas width="600" height="420" aria-label="'+f.name+' '+state+' animation"></canvas></div><div class="card-body"><div class="ability"><b>'+f.ability.name+'</b><p>'+f.ability.rule+'</p><p><i>Proposed ability · '+f.ability.usesPerBattle+' use per battle</i></p></div><p class="muted">'+f.habitat+'</p><h4>Small images at actual display sizes</h4><div class="miniatures">'+[48,64,96].map(n=>'<figure><img src="assets/'+f.id+'/portrait-'+n+'.webp" width="'+n+'" height="'+n+'" alt="'+f.name+' portrait"><figcaption>'+n+' px portrait</figcaption></figure>').join('')+[64,96].map(n=>'<figure><img class="map" src="assets/'+f.id+'/map-'+n+'.webp" width="'+n+'" height="'+n+'" alt="'+f.name+' map figure"><figcaption>'+n+' px figure</figcaption></figure>').join('')+'</div><details open><summary>Inspect all six '+state+' poses</summary><div class="frames"></div></details><details><summary>Portrait and character master</summary><div class="miniatures"><a href="assets/'+f.id+'/portrait-320.webp"><img src="assets/'+f.id+'/portrait-160.webp" width="160" height="160" alt="Large portrait"></a><a href="assets/'+f.id+'/stand.png"><img class="map" src="assets/'+f.id+'/stand.png" width="160" height="160" alt="Full-body master"></a></div></details><details><summary>Special-effect sheet</summary><a href="assets/'+f.id+'/special-fx.webp"><img src="assets/'+f.id+'/special-fx.webp" style="width:100%" alt="Eight stages of '+f.ability.name+'"></a></details><div class="links"><a href="'+s.file+'">Current source strip</a><a href="'+f.mythSource+'" target="_blank" rel="noreferrer">Myth reference</a></div></div>';
 $('#pair').appendChild(article);
 const [image,fxImage]=await Promise.all([img(s.file),manifest.effects[f.id]?img(manifest.effects[f.id].file):Promise.resolve(null)]);if(token!==familyToken)return;
 const ctx=article.querySelector('.stage canvas').getContext('2d');
 for(let n=0;n<6;n++){const cv=document.createElement('canvas');cv.width=192;cv.height=192;cv.title='Pose '+(n+1);drawPose(cv.getContext('2d'),image,s,n,96,162,205);article.querySelector('.frames').appendChild(cv);}
 loaded.push({f,image,strip:s,ctx,fx:manifest.effects[f.id],fxImage});
 }
 elapsed=0;$('#motion-note').textContent=pretty(state)+' · 6 poses · '+loaded[0].strip.fps+' fps · '+(loaded[0].strip.loop?'Loop':'One-shot; final pose holds');
}
function safeLoad(){loadPair().catch(e=>{$('#error').hidden=false;$('#error').textContent=e.message;});}
function setState(name){state=name;$('#state').value=name;elapsed=0;safeLoad();}
async function init(){[roster,manifest]=await Promise.all([fetch('design/roster.json').then(r=>r.json()),fetch('design/sprite-manifest.json').then(r=>r.json())]);
 for(const [key,[name,sub]]of Object.entries(families)){const b=document.createElement('button');b.innerHTML=name+'<small>'+sub+'</small>';b.dataset.family=key;b.setAttribute('aria-pressed',String(key===family));b.onclick=()=>{family=key;for(const x of $('#families').children)x.setAttribute('aria-pressed',String(x===b));safeLoad();};$('#families').appendChild(b);}
 for(const s of roster.animations){const o=document.createElement('option');o.value=s.name;o.textContent=pretty(s.name);$('#state').appendChild(o);}
 $('#stats').innerHTML='<thead><tr><th>Creature</th><th>Attack</th><th>Defense</th><th>HP</th><th>Damage</th><th>Speed</th><th>Gold</th><th>Crystal</th><th>Upgrade cost</th></tr></thead><tbody>'+roster.forms.map(f=>'<tr><td>'+f.name+'</td><td>'+f.stats.attack+'</td><td>'+f.stats.defense+'</td><td>'+f.stats.hp+'</td><td>'+f.stats.damageMin+'–'+f.stats.damageMax+'</td><td>'+f.stats.speed+'</td><td>'+f.cost.gold.toLocaleString()+'</td><td>'+f.cost.crystal+'</td><td>'+(f.upgradeCost?f.upgradeCost.gold.toLocaleString()+'g + '+f.upgradeCost.crystal+'c':'—')+'</td></tr>').join('')+'</tbody>';
 $('#balance-note').textContent=roster.policy.balance;
 $('#state').onchange=e=>{tour=false;$('#tour').textContent='Play all states';setState(e.target.value);};$('#play').onclick=()=>{playing=!playing;$('#play').textContent=playing?'Pause':'Play';};
 $('#restart').onclick=()=>{elapsed=0;playing=true;$('#play').textContent='Pause';};$('#speed').onchange=e=>rate=Number(e.target.value);
 $('#frame').oninput=e=>{playing=false;$('#play').textContent='Play';elapsed=Number(e.target.value)/6*duration(loaded[0].strip);};
 $('#tour').onclick=()=>{tour=!tour;$('#tour').textContent=tour?'Stop tour':'Play all states';playing=true;$('#play').textContent='Pause';elapsed=0;};
 await loadPair();requestAnimationFrame(render);
 window.dragonReview={ready:true,forms:roster.forms.map(f=>f.id),states:roster.animations.map(a=>a.name),manifest,select:async(fam,anim)=>{family=fam;state=anim;$('#state').value=anim;await loadPair();},pause:()=>playing=false};
}
init().catch(e=>{$('#error').hidden=false;$('#error').textContent=e.stack||e.message;});
