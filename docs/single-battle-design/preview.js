const root='../../assets-runtime/';
let mode='land';
const paths={
 land:'M5 3l13 13m-2-1l-3 3m6-16L6 15m2-1l3 3M3 18l3 3m12-3l3 3M3 3l2 7 5-5zM21 3l-2 7-5-5z',
 siege:'M4 21V8H2V3h4v3h4V3h4v3h4V3h4v5h-2v13M9 21v-7a3 3 0 016 0v7M3 21h18',
 naval:'M12 3v13M12 4l7 8h-7M9 6l-4 7h4M3 16h18l-4 5H7zM2 23q3-3 6 0 3-3 6 0 3-3 8 0',
 campaign:'M4 3h7q2 0 2 2v16q-2-2-4-2H3V3zM13 5q1-2 3-2h5v16h-5q-2 0-3 2',
 random:'M3 5l6-3 6 3 6-3v17l-6 3-6-3-6 3zM9 2v17M15 5v17',
 editor:'M3 17l13-13 4 4L7 21H3zM13 7l4 4',
 back:'M20 12H4m7-7l-7 7 7 7',
 plan:'M6 2h9l4 4v16H6zM14 2v5h5M9 11h7M9 15h7M9 19h4',
 attacker:'M12 2l5 5-3 2v11h-4V9L7 7zM7 18h10',
 defender:'M12 2l9 4v7q-3 6-9 9-6-3-9-9V6z',
 player:'M8 7a4 4 0 108 0 4 4 0 00-8 0M4 22v-4a8 8 0 0116 0v4',
 ai:'M5 6h14v14H5zM8 10h1m6 0h1M9 16h6M12 2v4M2 10h3m14 0h3M2 16h3m14 0h3',
 local:'M3 8a3 3 0 106 0 3 3 0 00-6 0M15 8a3 3 0 106 0 3 3 0 00-6 0M1 21v-4q5-5 10 0v4m2 0v-4q5-5 10 0v4',
 add:'M12 5v14M5 12h14', close:'M6 6l12 12M6 18L18 6',
 upgrade:'M5 14l7-8 7 8M5 20l7-8 7 8',
 fly:'M12 18Q4 17 2 4q8 3 10 10Q14 7 22 4q-2 13-10 14',
 ground:'M5 21l2-8h8l4 8M8 13l-2-9h6l3 9M3 21h18',
 terrain:'M2 21L9 5l5 11 3-6 5 11zM6 12l3 2 3-2',
 obstacles:'M3 21v-6l6-3 5 4v5zM14 11V5l5-3 3 5v6M14 16l8-3v8',
 climate:'M12 2v3M3 12h3m12 0h3M5 5l2 2m10 0l2-2M8 12a4 4 0 118 0M4 20h15a3 3 0 000-6 5 5 0 00-9 0 3 3 0 00-6 6',
 rules:'M4 5h16M4 12h16M4 19h16M8 2v6m8 1v6m-6 1v6',
 seed:'M12 22V12Q2 13 3 3q10 0 9 9Q12 3 22 3q0 10-10 9',
 dice:'M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2M7 7h.01M17 7h.01M12 12h.01M7 17h.01M17 17h.01',
 reset:'M3 10a9 9 0 111 8M3 3v7h7',
 save:'M3 3h15l3 3v15H3zM7 3v6h9V3M7 21v-8h10v8',
 library:'M3 4h5v17H3zM10 4h5v17h-5zM17 5l4-1 3 16-4 1z',
 deploy:'M4 22V2m0 1h15l-3 5 3 5H4M9 21h12m-4-4l4 4-4 4',
 check:'M4 12l5 5L21 5',
};
function icon(name){return `<svg class="glyph" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name]||paths.rules}"/></svg>`}
function iconButton(name,label,action){return `<button class="icon-button" title="${label}" aria-label="${label}" onclick="${action}">${icon(name)}</button>`}
const units=[
 {id:'hoplite',name:'Veteran Hoplites',tier:1,pantheon:'greek',form:'upgraded'},
 {id:'peltast',name:'Peltasts',tier:2,pantheon:'greek',form:'base'},
 {id:'griffin',name:'Griffins',tier:3,pantheon:'greek',form:'base',fly:true},
 {id:'draugr',name:'Deathless Draugar',tier:1,pantheon:'norse',form:'upgraded'},
 {id:'wolf',name:'Frost Wolves',tier:2,pantheon:'norse',form:'base'},
 {id:'valkyrie',name:'Valkyries',tier:4,pantheon:'norse',form:'base',fly:true},
];
const defaultSides=()=>({left:{pantheon:'greek',control:'player',stacks:[{id:'hoplite',count:35},{id:'peltast',count:24},{id:'griffin',count:6}]},right:{pantheon:'norse',control:'ai',stacks:[{id:'draugr',count:38},{id:'wolf',count:22},{id:'valkyrie',count:5}]}});
let sides=defaultSides();let picking='left';
const portrait=u=>`${root}ui/icons/final/creature.${u.pantheon}.tier${u.tier}.${u.form}.portrait.webp`;
document.getElementById('navigation').innerHTML=iconButton('back','New Game',"show('menu')")+`<a class="icon-button" href="plan.html" title="Development plan" aria-label="Development plan">${icon('plan')}</a>`;
const modes=[['Campaign','campaign','mode-campaign.png'],['Skirmish','defender','mode-skirmish.png'],['Random Map','random','mode-random-map.png'],['Single Battle','land','single-battle-card.png'],['Map Editor','editor','mode-map-editor.png']];
document.getElementById('modes').innerHTML=modes.map(([name,glyph,img],i)=>`<button class="mode ${i===3?'selected':''}" aria-label="${name}" onclick="${i===3?"show('land')":"notice('This preview focuses on Single Battle.')"}"><img src="${i===3?img:root+'frontend-v1.1.0/'+img}" alt=""><div class="copy">${icon(glyph)}<h2>${name}</h2></div></button>`).join('');
document.getElementById('steps').innerHTML=['land','siege','naval'].map(t=>`<button class="tab" onclick="show('${t}')" data-type="${t}" title="${t==='land'?'Land battle':t==='siege'?'Town siege':'Naval battle'}">${icon(t)}${t[0].toUpperCase()+t.slice(1)}</button>`).join('')+`<div class="tools">${iconButton('reset','Reset setup','resetSetup()')}${iconButton('save','Save setup','saveSetup()')}${iconButton('library','Load setup','loadSetup()')}</div>`;
document.getElementById('back').innerHTML=icon('back')+'Back';document.getElementById('back').onclick=()=>show('menu');
document.getElementById('deploy').innerHTML=icon('deploy')+'Deploy';document.getElementById('deploy').onclick=()=>notice('Deployment is the next development step. This is a setup preview.');
document.getElementById('reroll').innerHTML=icon('dice');document.getElementById('reroll').onclick=()=>{randomSeed();document.getElementById('map').innerHTML=board()};
document.getElementById('seed-label').innerHTML=icon('seed')+'Seed';document.getElementById('new-seed').innerHTML=icon('dice');document.getElementById('new-seed').onclick=randomSeed;
document.getElementById('close-picker').innerHTML=icon('close');document.getElementById('close-picker').onclick=()=>document.getElementById('picker').close();
function notice(text){document.getElementById('notice-text').textContent=text;document.getElementById('notice').showModal()}
function randomSeed(){document.getElementById('seed').value='BATTLE-'+Math.floor(Math.random()*99999).toString().padStart(5,'0')}
function army(side){const s=sides[side],attack=side==='left';return `<div class="army-title ${attack?'':'enemy'}">${icon(attack?'attacker':'defender')}<h2>${attack?'Attacker':'Defender'}</h2><small>${s.stacks.length} / 7</small></div><div class="faction"><img src="${root}ui/icons/final/emblem.${s.pantheon}.png" alt="${s.pantheon} emblem"><label>Pantheon<select aria-label="${attack?'Attacker':'Defender'} pantheon" onchange="setFaction('${side}',this.value)">${['greek','norse'].map(p=>`<option value="${p}" ${p===s.pantheon?'selected':''}>${p[0].toUpperCase()+p.slice(1)}</option>`).join('')}</select></label></div><div class="control">${[['player','Player'],['ai','AI'],['local','Local']].map(([c,l])=>`<button class="quiet" title="${c==='local'?'Second player on this computer':l+' control'}" aria-pressed="${s.control===c}" onclick="sides.${side}.control='${c}';renderArmies()">${icon(c)}${l}</button>`).join('')}</div>${s.stacks.map((stack,i)=>{const u=units.find(u=>u.id===stack.id);return `<div class="unit"><img src="${portrait(u)}" alt="${u.name}"><div class="name">${u.name}<div class="meta"><span>T${u.tier}</span><span title="${u.fly?'Flying':'Ground'}">${icon(u.fly?'fly':'ground')}</span>${u.form==='upgraded'?`<span title="Upgraded">${icon('upgrade')}</span>`:''}</div></div><input type="number" min="1" max="9999" value="${stack.count}" aria-label="${attack?'Attacker':'Defender'} ${u.name} quantity" onchange="sides.${side}.stacks[${i}].count=Math.max(1,Math.min(9999,Number(this.value)||1));this.value=sides.${side}.stacks[${i}].count"><button class="remove" title="Remove ${u.name}" aria-label="Remove ${u.name}" onclick="sides.${side}.stacks.splice(${i},1);renderArmies()">${icon('close')}</button></div>`}).join('')}<div class="empty-slots">${Array.from({length:7-s.stacks.length},(_,i)=>`<button class="empty-slot" title="Add creature" aria-label="Add ${attack?'attacker':'defender'} stack ${s.stacks.length+i+1}" onclick="openPicker('${side}')">${icon('add')}</button>`).join('')}</div>`}
function renderArmies(){for(const side of ['left','right'])document.getElementById(side).innerHTML=army(side);const valid=sides.left.stacks.length>0&&sides.right.stacks.length>0;document.getElementById('valid').innerHTML=icon('check')+(valid?'Ready':'Add creatures');document.getElementById('deploy').disabled=!valid}
function setFaction(side,p){sides[side].pantheon=p;sides[side].stacks=units.filter(u=>u.pantheon===p).map((u,i)=>({id:u.id,count:[35,24,6][i]}));renderArmies()}
function openPicker(side){picking=side;document.getElementById('creature-options').innerHTML=units.map(u=>`<button class="quiet" onclick="addUnit('${u.id}')"><img src="${portrait(u)}" alt=""><span>${u.name}</span></button>`).join('');document.getElementById('picker').showModal()}
function addUnit(id){if(sides[picking].stacks.length<7)sides[picking].stacks.push({id,count:1});document.getElementById('picker').close();renderArmies()}
function field(label,glyph,options){return `<label><span class="field-title">${icon(glyph)}${label}</span><select aria-label="${label}">${options.map(o=>`<option>${o}</option>`).join('')}</select></label>`}
function resetSetup(){sides=defaultSides();document.getElementById('seed').value='ASTERION-42';show(mode)}
function saveSetup(){try{localStorage.setItem('single-battle-design-v2',JSON.stringify({sides,mode,seed:document.getElementById('seed').value}));notice('Setup saved in this preview.')}catch{notice('This browser cannot save the preview.')}}
function loadSetup(){try{const saved=JSON.parse(localStorage.getItem('single-battle-design-v2'));if(!saved)return notice('No saved setup.');sides=saved.sides;show(saved.mode);document.getElementById('seed').value=saved.seed}catch{notice('No compatible setup found.')}}
function show(type){const menu=type==='menu';document.getElementById('menu').hidden=!menu;document.getElementById('editor').hidden=menu;document.getElementById('title').textContent=menu?'New Game':'Single Battle';location.hash=menu?'':type;if(menu)return;mode=type;document.querySelectorAll('[data-type]').forEach(e=>{e.classList.toggle('active',e.dataset.type===type);e.setAttribute('aria-pressed',String(e.dataset.type===type))});renderArmies();document.getElementById('map').innerHTML=board();document.getElementById('arena-title').textContent=type==='land'?'Battlefield':type==='siege'?'Fortress':'Boarding';document.getElementById('settings').innerHTML='<div class="fields">'+(type==='siege'?field('Town','siege',['Norse','Greek','Egyptian','Japanese','Celtic','Mesoamerican'])+field('Defenses','defender',['Citadel','Castle','Fort']):type==='naval'?field('Layout','naval',['Two ships','Ship & sea creatures'])+field('Weather','climate',['Calm','Storm']):field('Terrain','terrain',['Open field','Grove','Ridge pass','Coast road'])+field('Obstacles','obstacles',['Few','None','Many']))+field('Rules','rules',['Standard','Custom'])+field('AI','ai',['Normal','Easy','Hard'])+'</div>'}
