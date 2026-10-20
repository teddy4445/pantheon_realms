import type { SingleBattleSpec, BattleResultRecord } from '@pr/rules';
const PRESETS='pantheon-single-battle-presets-v1',HISTORY='pantheon-single-battle-history-v1';
type Preset={id:string;spec:SingleBattleSpec};
type History={name:string;seed:string;winner:string;rounds:number;key:string};
export function readBattleLibrary():Preset[]{try{const a=JSON.parse(localStorage.getItem(PRESETS)??'[]');return Array.isArray(a)?a.filter(x=>x&&typeof x.id==='string'&&x.spec?.format==='pantheon-single-battle').slice(0,100):[];}catch{return [];}}
export function saveBattlePreset(spec:SingleBattleSpec){const a=readBattleLibrary();const old=a.find(p=>p.spec.name===spec.name);const p={id:old?.id??crypto.randomUUID(),spec:structuredClone(spec)};localStorage.setItem(PRESETS,JSON.stringify([p,...a.filter(x=>x.id!==p.id)].slice(0,100)));}
export function removeBattlePreset(id:string){localStorage.setItem(PRESETS,JSON.stringify(readBattleLibrary().filter(p=>p.id!==id)));}
export function readBattleHistory():History[]{try{const a=JSON.parse(localStorage.getItem(HISTORY)??'[]');return Array.isArray(a)?a.filter(x=>x&&typeof x.name==='string').slice(0,30):[];}catch{return [];}}
export function recordSingleBattle(spec:SingleBattleSpec,r:BattleResultRecord,key:string){const a=readBattleHistory();if(a.some(x=>x.key===key))return;localStorage.setItem(HISTORY,JSON.stringify([{name:spec.name,seed:spec.seed,winner:r.outcome==='stalemate'?'Stalemate':`${r.winner==='attacker'?'Attacker':'Defender'} wins`,rounds:r.rounds,key},...a].slice(0,30)));}
export function exportBattleFile(value:unknown,name:string){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name.replace(/[<>:"/\\|?*]/g,'-');a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}
