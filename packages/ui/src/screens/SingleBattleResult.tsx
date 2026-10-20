import { useEffect } from 'react';
import { exportSingleBattleReplay } from '@pr/session';
import { useStore } from '../app/context';
import { FrontendShell } from '../components/frontend';
import { CreaturePortrait } from '../components/art';
import { SingleBattleIcon } from '../components/SingleBattleIcon';
import { exportBattleFile, recordSingleBattle, saveBattlePreset } from '../app/singleBattleLibrary';

export function SingleBattleResultScreen(){
  const store=useStore(),session=store.session!,state=session.state,spec=state.standalone!.spec,r=state.lastBattleResult!;
  useEffect(()=>{try{recordSingleBattle(spec,r,`${session.sessionId}:${state.revision}`);}catch{store.toast('Battle history could not be saved.','error');}},[session,r,spec,state.revision,store]);
  const title=r.outcome==='stalemate'?'Stalemate':`${r.winner==='attacker'?'Attacker':'Defender'} wins`;
  return <FrontendShell backdrop="battle-room" title={title} className="sb-screen sb-result" testId="single-battle-result">
    <div className="sb-result-summary">{spec.name} · {r.rounds} rounds · Seed: {spec.seed}{r.outcome==='retreat'?' · Retreat':r.outcome==='surrender'?' · Surrender':''}</div>
    <div className="sb-result-armies">{(['attacker','defender'] as const).map(side=><section className="sb-panel" key={side}><h2>{side==='attacker'?'Attacker':'Defender'}</h2><p>Damage dealt: {state.standalone?.damage?.[side] ?? 0}</p><table><thead><tr><th>Army</th><th>Before</th><th>Lost</th><th>Survived</th></tr></thead><tbody>{r[side].lines.map((l,i)=><tr key={i}><td><span><CreaturePortrait catalog={store.catalog} creatureId={l.creatureId} size="2.5rem"/>{store.catalog.creatures[l.creatureId]!.pluralName}</span></td><td>{l.before}</td><td>{l.before-l.after}</td><td>{l.after}</td></tr>)}</tbody></table></section>)}</div>
    <div className="sb-result-actions"><button className="sb-primary" onClick={()=>store.startSingleBattle(spec)}><SingleBattleIcon name="reset"/>Rematch</button><button onClick={()=>store.editSingleBattle()}><SingleBattleIcon name="rules"/>Edit setup</button><button onClick={()=>{try{saveBattlePreset(spec);store.toast('Preset saved.');}catch{store.toast('Could not save the preset.','error');}}}><SingleBattleIcon name="save"/>Save preset</button><button onClick={()=>{store.singleBattleDraft=null;store.endSession();store.resetTo('single-battle');}}><SingleBattleIcon name="add"/>New battle</button><button onClick={()=>store.startBattleReplay(exportSingleBattleReplay(state))}><SingleBattleIcon name="land"/>Watch replay</button><button onClick={()=>exportBattleFile(exportSingleBattleReplay(state),`${spec.name}.replay.json`)}><SingleBattleIcon name="save"/>Export replay</button><button onClick={()=>{store.endSession();store.resetTo('main-menu');}}><SingleBattleIcon name="back"/>Main menu</button></div>
  </FrontendShell>;
}
