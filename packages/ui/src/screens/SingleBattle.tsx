import { useMemo, useRef, useState } from 'react';
import { createSingleBattle, defaultSingleBattle, defaultSingleArmy, parseSingleBattle, singleCreatureAllowed, LAND_BATTLEFIELDS, boardZone, cellKey, footprintCells, type SingleBattleSpec, type SingleBattleKind, type BattleSideId, type BattleCell, type BattleState } from '@pr/rules';
import { useStore } from '../app/context';
import { FrontendShell } from '../components/frontend';
import { CreaturePortrait, Emblem } from '../components/art';
import { Modal } from '../components/kit';
import { BattleIconButton, SingleBattleIcon } from '../components/SingleBattleIcon';
import { resolveAsset } from '../assets/manifest';
import { readBattleLibrary, saveBattlePreset, removeBattlePreset, exportBattleFile, readBattleHistory } from '../app/singleBattleLibrary';

const labels:Record<SingleBattleKind,string>={land:'Land',siege:'Siege',naval:'Naval',sea:'Sea creatures'};
const title=(s:string)=>s.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
export function SingleBattleScreen(){
  const store=useStore(),catalog=store.catalog;
  const [spec,setSpec]=useState<SingleBattleSpec>(()=>structuredClone(store.singleBattleDraft ?? defaultSingleBattle(catalog)));
  const [past,setPast]=useState<SingleBattleSpec[]>([]),[future,setFuture]=useState<SingleBattleSpec[]>([]);
  const [picker,setPicker]=useState<BattleSideId|null>(null),[search,setSearch]=useState(''),[tier,setTier]=useState('all'),[form,setForm]=useState('all');
  const [library,setLibrary]=useState(false),[advanced,setAdvanced]=useState(false),[help,setHelp]=useState(false),[notice,setNotice]=useState('');
  const [refresh,setRefresh]=useState(0),[tool,setTool]=useState<'select'|'obstacle'>('select'),[selected,setSelected]=useState<string|null>(null);
  const file=useRef<HTMLInputElement>(null);
  const commit=(next:SingleBattleSpec)=>{setPast(p=>[...p.slice(-49),spec]);setFuture([]);setSpec(next);store.singleBattleDraft=structuredClone(next);setNotice('');};
  const change=(fn:(d:SingleBattleSpec)=>void)=>{const d=structuredClone(spec);fn(d);commit(d);};
  const undo=()=>{const prev=past.at(-1);if(!prev)return;setFuture(f=>[spec,...f]);setPast(p=>p.slice(0,-1));setSpec(prev);store.singleBattleDraft=prev;};
  const redo=()=>{const next=future[0];if(!next)return;setPast(p=>[...p,spec]);setFuture(f=>f.slice(1));setSpec(next);store.singleBattleDraft=next;};
  const preview=useMemo(()=>{try{return {state:createSingleBattle(catalog,spec,true),error:''};}catch(e){return {state:null,error:e instanceof Error?e.message:String(e)};}},[catalog,spec]);
  const board=preview.state?.battle;
  const pantheons=catalog.pantheonOrder.filter(p=>catalog.pantheons[p]?.playability==='playable');
  const resetPositions=(d:SingleBattleSpec)=>{for(const side of ['attacker','defender'] as const)for(const u of d[side].stacks){delete u.anchor;delete u.facing;}};
  const kind=(k:SingleBattleKind)=>change(d=>{
    d.kind=k;d.obstacles='few';resetPositions(d);setSelected(null);setTool('select');
    for(const side of ['attacker','defender'] as const){
      d[side].stacks=d[side].stacks.filter(u=>singleCreatureAllowed(catalog,d,d[side],side,u.creatureId));
      if(!d[side].stacks.length){
        if(k==='sea'&&side==='defender')d[side].stacks=Object.values(catalog.creatures).filter(c=>catalog.families[c.familyId]?.availability==='sea_encounters'&&c.form==='base'&&singleCreatureAllowed(catalog,d,d[side],side,c.id)).slice(0,3).map(c=>({creatureId:c.id,count:4}));
        else d[side].stacks=defaultSingleArmy(catalog,d[side].pantheonId,d[side].controller).stacks;
      }
    }
  });
  const tryGeometry=(d:SingleBattleSpec)=>{try{createSingleBattle(catalog,d,true);commit(d);}catch(e){setNotice(e instanceof Error?e.message:String(e));}};
  const clickCell=(cell:BattleCell,sourceId?:string)=>{
    if(!board)return;
    const occupant=Object.values(board.stacks).find(s=>footprintCells(s.anchor,catalog.creatures[s.creatureId]!.stats!.footprint,s.facing).some(c=>cellKey(c)===cellKey(cell)));
    if(tool==='obstacle'&&spec.kind==='land'){
      const d=structuredClone(spec),key=cellKey(cell);d.obstacles=board.obstacles.some(c=>cellKey(c)===key)?board.obstacles.filter(c=>cellKey(c)!==key):[...board.obstacles,cell];tryGeometry(d);return;
    }
    const stack=(sourceId??selected)?board.stacks[(sourceId??selected)!]:null;
    if(stack && occupant?.id!==stack.id){
      if(occupant && occupant.side!==stack.side){setSelected(occupant.id);return;}
      const d=structuredClone(spec);d[stack.side].stacks[stack.sourceSlot]!.anchor={...cell};
      if(occupant)d[occupant.side].stacks[occupant.sourceSlot]!.anchor={...stack.anchor};
      tryGeometry(d);
    }else setSelected(occupant?.id ?? null);
  };
  const rotate=()=>{if(!board||!selected)return;const s=board.stacks[selected];if(!s)return;const d=structuredClone(spec);d[s.side].stacks[s.sourceSlot]!.facing=s.facing===1?-1:1;d[s.side].stacks[s.sourceSlot]!.anchor={...s.anchor};tryGeometry(d);};
  const save=()=>{try{parseSingleBattle(catalog,JSON.stringify(spec));saveBattlePreset(spec);setNotice('Preset saved.');setRefresh(n=>n+1);}catch(e){setNotice(String(e));}};
  const libraryItems=useMemo(()=>readBattleLibrary(),[refresh,library]);
  const army=(side:BattleSideId)=>{
    const a=spec[side];return <aside className={`sb-panel sb-army sb-${side}`} aria-label={title(side)}>
      <div className="sb-heading"><SingleBattleIcon name={side}/><h2>{title(side)}</h2><small>{a.stacks.length} / 7</small></div>
      <div className="sb-faction"><Emblem catalog={catalog} pantheonId={a.pantheonId} size="3.7rem"/><label>Pantheon<select aria-label={`${title(side)} pantheon`} value={a.pantheonId} onChange={e=>change(d=>{d[side]=defaultSingleArmy(catalog,e.target.value,a.controller);if(d.kind==='sea'&&side==='defender')d[side].stacks=a.stacks;})}>{pantheons.map(p=><option key={p} value={p}>{catalog.pantheons[p]!.name}</option>)}</select></label></div>
      <div className="sb-controls">{(['human','ai'] as const).map(c=><button key={c} aria-pressed={a.controller===c} onClick={()=>change(d=>{d[side].controller=c;})}><SingleBattleIcon name={c==='ai'?'ai':'player'}/>{c==='ai'?'AI':'Player'}</button>)}</div>
      <div className="sb-stacks">{a.stacks.map((u,i)=>{const c=catalog.creatures[u.creatureId];if(!c)return null;const stackId=`${side==='attacker'?'a':'d'}${i}`;return <div className={`sb-stack ${selected===stackId?'selected':''}`} key={`${i}:${u.creatureId}`}>
        <button className="sb-portrait-button" title={`Place ${c.name}`} aria-label={`Place ${side} ${c.name}`} onClick={()=>{setSelected(stackId);setTool('select');}}><CreaturePortrait catalog={catalog} creatureId={c.id} size="3.4rem"/></button>
        <div className="sb-unit-name">{c.pluralName}<small>T{c.tier} · {c.stats?.footprint===2?'2 hexes':'1 hex'} <span title={c.roleLabel}>{c.roleLabel}</span></small></div>
        <input type="number" min={1} max={9999} aria-label={`${title(side)} ${c.name} quantity`} value={u.count} onChange={e=>change(d=>{d[side].stacks[i]!.count=Math.max(1,Math.min(9999,Math.floor(Number(e.target.value)||1)));})}/>
        <div className="sb-unit-actions">{(c.upgradeId||c.baseId)?<BattleIconButton icon="upgrade" label={c.upgradeId?`Upgrade ${c.name}`:`Base form of ${c.name}`} aria-pressed={c.form==='upgraded'} onClick={()=>change(d=>{d[side].stacks[i]!.creatureId=(c.upgradeId??c.baseId)!;resetPositions(d);})}/>:null}<BattleIconButton icon="close" label={`Remove ${side} ${c.name}`} onClick={()=>change(d=>{d[side].stacks.splice(i,1);resetPositions(d);setSelected(null);})}/></div>
      </div>})}</div>
      <div className="sb-empty">{Array.from({length:7-a.stacks.length},(_,i)=><button key={i} title="Add creature" aria-label={`Add ${side} stack ${a.stacks.length+i+1}`} onClick={()=>{setSearch('');setPicker(side);}}><SingleBattleIcon name="add"/></button>)}</div>
    </aside>;
  };
  return <FrontendShell backdrop="battle-room" title="Single Battle" className="sb-screen" testId="single-battle-setup" onBack={()=>store.back()} right={<BattleIconButton icon="plan" label="Help" onClick={()=>setHelp(true)}/>} footer={<div className="sb-footer"><button onClick={()=>store.back()}><SingleBattleIcon name="back"/>Back</button><span role="status" className={preview.error?'sb-error':''}>{preview.error || notice || 'Ready'}</span><button className="sb-primary" disabled={!!preview.error} onClick={()=>{try{store.startSingleBattle(spec);}catch(e){setNotice(String(e));}}}><SingleBattleIcon name="deploy"/>Deploy</button></div>}>
    <div className="sb-toolbar"><div className="sb-tabs" aria-label="Battle type">{(['land','siege','naval'] as const).map(k=><button key={k} aria-pressed={spec.kind===k || k==='naval'&&spec.kind==='sea'} onClick={()=>kind(k)}><SingleBattleIcon name={k}/>{labels[k]}</button>)}</div><div className="sb-tools"><BattleIconButton icon="undo" label="Undo" disabled={!past.length} onClick={undo}/><BattleIconButton icon="redo" label="Redo" disabled={!future.length} onClick={redo}/><BattleIconButton icon="reset" label="Reset setup" onClick={()=>commit(defaultSingleBattle(catalog))}/><BattleIconButton icon="save" label="Save preset" onClick={save}/><BattleIconButton icon="library" label="Battle library" onClick={()=>setLibrary(true)}/></div></div>
    <div className="sb-layout">{army('attacker')}<section className="sb-panel sb-center"><div className="sb-heading"><h2>{spec.kind==='siege'?'Fortress':spec.kind==='naval'?'Boarding':spec.kind==='sea'?'Open sea':'Battlefield'}</h2><BattleIconButton icon="dice" label="New seed" onClick={()=>change(d=>{d.seed=crypto.randomUUID().slice(0,8);resetPositions(d);})}/></div>
      {board?<BattleSetupBoard battle={board} selected={selected} onCell={clickCell}/>:<div className="sb-board-empty">{preview.error}</div>}
      <div className="sb-board-tools"><span className="sb-legend">● Attacker <b>● Defender</b></span><BattleIconButton icon="player" label="Select and place stacks" aria-pressed={tool==='select'} onClick={()=>setTool('select')}/>{spec.kind==='land'?<BattleIconButton icon="obstacles" label="Paint obstacles" aria-pressed={tool==='obstacle'} onClick={()=>{setTool('obstacle');setSelected(null);}}/>:null}<BattleIconButton icon="rotate" label="Rotate selected stack" disabled={!selected} onClick={rotate}/><BattleIconButton icon="deploy" label="Automatic deployment" onClick={()=>change(resetPositions)}/></div>
      <div className="sb-fields">
      {spec.kind==='land'?<><label><SingleBattleIcon name="terrain"/>Terrain<select aria-label="Terrain" value={spec.terrain} onChange={e=>change(d=>{d.terrain=e.target.value as SingleBattleSpec['terrain'];})}>{LAND_BATTLEFIELDS.map(t=><option key={t} value={t}>{title(t)}</option>)}</select></label><label><SingleBattleIcon name="obstacles"/>Obstacles<select value={Array.isArray(spec.obstacles)?'custom':spec.obstacles} onChange={e=>change(d=>{d.obstacles=e.target.value as 'none'|'few'|'many';})}><option value="none">None</option><option value="few">Few</option><option value="many">Many</option>{Array.isArray(spec.obstacles)?<option value="custom">Custom</option>:null}</select></label></>:null}
      {spec.kind==='siege'?<><label><SingleBattleIcon name="siege"/>Defenses<select aria-label="Defenses" value={spec.fortification} onChange={e=>change(d=>{d.fortification=Number(e.target.value) as 0|1|2|3;d.structures={};resetPositions(d);})}>{['None','Fort','Citadel','Castle'].map((s,i)=><option key={s} value={i}>{s}</option>)}</select></label><label><SingleBattleIcon name="defender"/>Town<select aria-label="Town theme" value={spec.defender.pantheonId} onChange={e=>change(d=>{d.defender=defaultSingleArmy(catalog,e.target.value,d.defender.controller);})}>{pantheons.map(p=><option key={p} value={p}>{catalog.pantheons[p]!.name}</option>)}</select></label></>:null}
      {spec.kind==='naval'||spec.kind==='sea'?<label><SingleBattleIcon name="naval"/>Layout<select aria-label="Layout" value={spec.kind} onChange={e=>kind(e.target.value as SingleBattleKind)}><option value="naval">Two ships</option><option value="sea">Ship & sea creatures</option></select></label>:null}
      <label><SingleBattleIcon name="climate"/>Climate<select aria-label="Climate" value={spec.climate} onChange={e=>change(d=>{d.climate=e.target.value;})}><option value="temperate">Clear</option>{Object.entries(catalog.climates??{}).filter(([id])=>id!=='temperate').map(([id,c])=><option key={id} value={id}>{c.name}</option>)}</select></label>
      <label><SingleBattleIcon name="rules"/>Rules<select aria-label="Rules" value={spec.rules} onChange={e=>change(d=>{d.rules=e.target.value as 'standard'|'custom';if(d.rules==='standard')d.structures={};})}><option value="standard">Standard</option><option value="custom">Custom</option></select></label>
      </div>{board?.climate?<small className="sb-climate">{board.climate.summary}</small>:null}
      <div className="sb-seed"><label htmlFor="sb-seed"><SingleBattleIcon name="seed"/>Seed</label><input id="sb-seed" maxLength={128} value={spec.seed} onChange={e=>change(d=>{d.seed=e.target.value;})}/><BattleIconButton icon="settings" label="Advanced settings" onClick={()=>setAdvanced(true)}/></div>
    </section>{army('defender')}</div>
    {picker?<Modal title="Creatures" onClose={()=>setPicker(null)} width="58rem" testId="single-creature-picker"><div className="sb-picker-filters"><input autoFocus placeholder="Search creatures" aria-label="Search creatures" value={search} onChange={e=>setSearch(e.target.value)}/><select aria-label="Tier" value={tier} onChange={e=>setTier(e.target.value)}><option value="all">All tiers</option>{[1,2,3,4,5,6,7].map(t=><option key={t}>{t}</option>)}</select><select aria-label="Form" value={form} onChange={e=>setForm(e.target.value)}><option value="all">Both forms</option><option value="base">Base</option><option value="upgraded">Upgraded</option></select></div><div className="sb-picker-grid">{Object.values(catalog.creatures).filter(c=>singleCreatureAllowed(catalog,spec,spec[picker],picker,c.id)&&(tier==='all'||c.tier===Number(tier))&&(form==='all'||c.form===form)&&`${c.name} ${c.pluralName}`.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>a.tier-b.tier||a.name.localeCompare(b.name)).map(c=><button key={c.id} onClick={()=>{change(d=>{if(d[picker].stacks.length<7)d[picker].stacks.push({creatureId:c.id,count:1});resetPositions(d);});setPicker(null);}}><CreaturePortrait catalog={catalog} creatureId={c.id} size="4rem"/><span>{c.name}<small>T{c.tier} · {c.form==='upgraded'?'↑ ':''}{c.roleLabel}</small></span></button>)}</div></Modal>:null}
    {advanced?<Modal title="Settings" width="32rem" onClose={()=>setAdvanced(false)}><div className="sb-advanced"><label>Preset name<input value={spec.name} maxLength={80} onChange={e=>change(d=>{d.name=e.target.value;})}/></label>{board?.siege?.structures.map(s=><label key={s.id}>{title(s.id)}<select disabled={spec.rules!=='custom'} value={spec.structures[s.id]??'intact'} onChange={e=>change(d=>{d.structures[s.id]=e.target.value as 'intact'|'damaged'|'destroyed';})}><option value="intact">Intact</option>{s.maxHp>1?<option value="damaged">Damaged</option>:null}<option value="destroyed">Destroyed</option></select></label>)}{spec.kind==='siege'&&spec.rules!=='custom'?<small>Custom rules unlock structure states.</small>:null}<button onClick={()=>{exportBattleFile(spec,`${spec.name}.battle.json`);}}><SingleBattleIcon name="export"/>Export preset</button><button onClick={()=>file.current?.click()}><SingleBattleIcon name="import"/>Import preset / replay</button></div></Modal>:null}
    <input ref={file} type="file" hidden accept=".json" onChange={async e=>{const f=e.target.files?.[0];e.target.value='';if(!f)return;try{if(f.size>10000000)throw new Error('Preset is too large.');const text=await f.text();const value=JSON.parse(text);if(value?.format==='pantheon-battle-replay'){store.startBattleReplay(value);}else commit(parseSingleBattle(catalog,text));setAdvanced(false);setLibrary(false);}catch(err){setNotice(String(err));setAdvanced(false);}}}/>
    {library?<Modal title="Battle library" width="48rem" onClose={()=>setLibrary(false)}><div className="sb-library"><button onClick={save}><SingleBattleIcon name="save"/>Save current setup</button><button onClick={()=>file.current?.click()}><SingleBattleIcon name="import"/>Import preset / replay</button>{libraryItems.length===0?<p>No saved presets yet.</p>:libraryItems.map(p=><div key={p.id}><span>{p.spec.name}<small>{labels[p.spec.kind]} · {p.spec.seed}</small></span><button onClick={()=>{try{commit(parseSingleBattle(catalog,JSON.stringify(p.spec)));setLibrary(false);}catch(e){setNotice(String(e));setLibrary(false);}}}><SingleBattleIcon name="load"/>Load</button><BattleIconButton icon="export" label={`Export ${p.spec.name}`} onClick={()=>exportBattleFile(p.spec,`${p.spec.name}.battle.json`)}/><BattleIconButton icon="delete" label={`Delete ${p.spec.name}`} onClick={()=>{removeBattlePreset(p.id);setRefresh(n=>n+1);}}/></div>)}<h3>Recent battles</h3>{readBattleHistory().map((r,i)=><div key={i}><span>{r.name}<small>{r.winner} · {r.rounds} rounds · {r.seed}</small></span></div>)}</div></Modal>:null}
    {help?<Modal title="Single Battle" onClose={()=>setHelp(false)} width="35rem"><p>Choose Land, Siege, or Naval. Each side can be controlled by a player on this computer or by the AI. Set both sides to AI to watch a battle.</p><p>Add up to seven creature stacks. Select a portrait, then click a starting hex on the board to place it. Click a friendly stack to swap. Dragging on the board works too. Rotate changes a large creature’s facing; automatic deployment restores the default formation. Undo and Redo apply to setup edits.</p><p>Paint obstacles on central land hexes. Custom rules allow mixed pantheons and damaged fortifications. Sea creatures are restricted to compatible encounters. Blue is the attacker; coral is the defender.</p><p>Deploy opens the battlefield for final placement. Save presets in the library; save an ongoing fight through Pause → Save Game. Results offer Rematch, Edit setup, and replay export.</p></Modal>:null}
  </FrontendShell>;
}

function BattleSetupBoard({battle,selected,onCell}:{battle:BattleState;selected:string|null;onCell:(c:BattleCell,sourceId?:string)=>void}){
  const {catalog}=useStore();const drag=useRef<BattleCell|null>(null);
  const hex=(col:number,row:number)=>({x:24+col*31+(row%2)*15.5,y:22+row*27});
  const points=(x:number,y:number)=>Array.from({length:6},(_,i)=>{const a=(i*60+30)*Math.PI/180;return `${x+17*Math.cos(a)},${y+17*Math.sin(a)}`;}).join(' ');
  const stacks=Object.values(battle.stacks),obs=new Set(battle.obstacles.map(cellKey));
  return <svg className="sb-board" viewBox={`0 0 ${battle.cols*31+35} ${battle.rows*27+20}`} aria-label="Battlefield deployment editor">
    {Array.from({length:battle.cols*battle.rows},(_,i)=>{const c={col:i%battle.cols,row:Math.floor(i/battle.cols)},p=hex(c.col,c.row),key=cellKey(c);const stack=stacks.find(s=>footprintCells(s.anchor,catalog.creatures[s.creatureId]!.stats!.footprint,s.facing).some(x=>cellKey(x)===key));const zone=boardZone(battle,c);const structure=battle.siege?.structures.find(s=>s.hp>0&&s.cells.some(x=>cellKey(x)===key));const engine=battle.siege?.engine?.cells.some(x=>cellKey(x)===key);const moat=battle.siege?.moat.some(x=>cellKey(x)===key);const fill=structure?'#b0a082':engine?'#d8ab60':obs.has(key)?'#353d34':moat?'#477785':zone==='water'?'#193b50':zone==='bridge'?'#be985a':zone?.includes('deck')?'#665139':'#334f49';
      return <g key={key} role="button" tabIndex={0} aria-label={`Hex ${c.col+1}, ${c.row+1}${stack?`: ${catalog.creatures[stack.creatureId]!.name}`:''}${obs.has(key)?', obstacle':''}${structure?', '+structure.kind:''}`} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onCell(c);}}} onPointerDown={()=>{drag.current=stack?c:null;}} onPointerUp={()=>{if(drag.current&&cellKey(drag.current)!==key){const source=stacks.find(s=>footprintCells(s.anchor,catalog.creatures[s.creatureId]!.stats!.footprint,s.facing).some(x=>cellKey(x)===cellKey(drag.current!)));onCell(c,source?.id);}else onCell(c);drag.current=null;}}>
        <polygon points={points(p.x,p.y)} fill={fill} stroke={stack?(stack.side==='attacker'?'#83d5e5':'#efad8f'):'#68817b'} strokeWidth={selected===stack?.id?3:0.7}/>
        {stack&&cellKey(stack.anchor)===key?<><image href={resolveAsset(catalog.creatures[stack.creatureId]!.presentation.portraitAssetId).url??''} x={p.x-12} y={p.y-12} width={24} height={24} pointerEvents="none"/><text x={p.x+9} y={p.y+14} textAnchor="end" fill="white" stroke="#111" strokeWidth="0.6" paintOrder="stroke" fontSize="9" pointerEvents="none">{stack.startingCount}</text></>:null}
        <title>{stack?catalog.creatures[stack.creatureId]!.name:structure?title(structure.kind):obs.has(key)?'Obstacle':zone??'Ground'}</title>
      </g>;
    })}
  </svg>;
}
