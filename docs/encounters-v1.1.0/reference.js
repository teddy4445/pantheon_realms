const DATA=window.ENCOUNTER_DATA;
const objectiveHint=document.createElement('small');objectiveHint.className='objective-hint';objectiveHint.textContent='Scroll to read all objectives';document.querySelector('.objective-list').before(objectiveHint);
const url=id=>'../../assets-runtime/'+DATA.assets[id].file;
document.querySelectorAll('[data-art]').forEach(img=>img.src=url(img.dataset.art));
const feedback=document.querySelector('#feedback');
function report(text){feedback.textContent=text;}
let selection=null;
function setFaction(f){
 const sample=DATA.samples[f];selection=null;document.querySelector('.quantity').hidden=true;
 document.querySelector('#meeting').style.backgroundImage=`url("${url(sample.background)}")`;
 for(const [index,side] of ['left','right'].entries()){
  const hero=sample.heroes[index];const el=document.querySelector('#hero-'+side);el.src=url(hero.assetId);el.alt=hero.name;
  document.querySelector('#hero-name-'+side).textContent=hero.name;
  const army=document.querySelector('#army-'+side);army.replaceChildren();
  for(let slot=0;slot<7;slot++){
   const filled=slot<(side==='left'?3:2);const c=sample.creatures[side==='left'?slot:slot+1];const count=[20,12,4][slot]??0;
   const button=document.createElement('button');button.className='slot'+(filled?'':' empty');button.type='button';button.dataset.side=side;button.dataset.slot=slot;button.setAttribute('aria-pressed','false');button.setAttribute('aria-label',`${hero.name}, slot ${slot+1}: ${filled?count+' '+c.name:'empty'}`);
   if(filled){const img=document.createElement('img');img.src=url(c.portrait);img.alt='';button.append(img);const n=document.createElement('span');n.className='count';n.textContent=count;button.append(n);}
   button.addEventListener('click',()=>{
    if(!selection&&filled){selection={side,slot,count};button.setAttribute('aria-pressed','true');document.querySelector('.quantity').hidden=false;document.querySelector('#quantity').max=count;document.querySelector('#quantity').value=count;document.querySelector('#amount').value=count;document.querySelector('#transfer-hint').textContent='Choose how many to move, then a destination slot.';document.querySelectorAll('.slot').forEach(s=>s.classList.toggle('target',s!==button));}
    else if(selection){report(`Transfer layout preview: ${document.querySelector('#quantity').value} creatures to ${hero.name}, slot ${slot+1}. No game command ran; Claude must bind quoteTransfer and TransferStack.`);selection=null;document.querySelector('.quantity').hidden=true;document.querySelectorAll('.slot').forEach(s=>{s.setAttribute('aria-pressed','false');s.classList.remove('target');});document.querySelector('#transfer-hint').textContent='Select a creature stack, then a destination.';}
   });army.append(button);
  }
 }
}
document.querySelector('#quantity').addEventListener('input',e=>document.querySelector('#amount').value=e.target.value);
document.querySelector('#faction').addEventListener('change',e=>setFaction(e.target.value));setFaction('greek');
for(const kind of ['intro','reward'])document.querySelector('#'+kind).style.backgroundImage=`url("${url(kind==='intro'?'mission.three_beacons.m01.briefing':'encounterkit.meeting.greek')}")`;
function screen(name){document.querySelectorAll('.screen').forEach(el=>el.hidden=el.id!==name);document.querySelectorAll('[data-screen]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.screen===name)));document.querySelector('#faction-label').hidden=name!=='meeting';report('Reference controls only. Sample reward quantities are not promises of scenario rewards.');}
document.querySelectorAll('[data-screen]').forEach(b=>b.addEventListener('click',()=>screen(b.dataset.screen)));
document.querySelector('#meeting-done').addEventListener('click',()=>report('In the game, Done closes the meeting. Transfers already committed remain committed.'));
let line=0;document.querySelector('#dialogue-next').addEventListener('click',()=>{line=1-line;document.querySelector('#speaker').textContent=line?'Alexios':'Thaleia';document.querySelector('#dialogue-text').textContent=line?'First we reach the shore. Then we make sure the road stays open.':'The storm has passed. Our lighthouse is still dark. Open the road, train a guard we can trust, and bring its signal back.';document.querySelector('#dialogue-next').textContent=line?'Back':'Next';});
document.querySelector('#begin').addEventListener('click',()=>report('Briefing preview: Begin closes the existing briefing; it must not initialize a second game session.'));
document.querySelector('#reward-continue').addEventListener('click',()=>report('Reward receipt dismissed in the preview. Continue must never grant the displayed items a second time.'));
for(const [id,a] of Object.entries(DATA.assets).filter(([id])=>id.startsWith('encounterkit.'))){const fig=document.createElement('figure');const link=document.createElement('a');link.href=url(id);const img=document.createElement('img');img.src=url(id);img.alt=id;img.loading='lazy';link.append(img);fig.append(link);const caption=document.createElement('figcaption');caption.textContent=id+' · '+a.width+' × '+a.height;fig.append(caption);document.querySelector('#asset-gallery').append(fig);}
const query=new URLSearchParams(location.search).get('screen');if(['meeting','intro','reward'].includes(query))screen(query);
