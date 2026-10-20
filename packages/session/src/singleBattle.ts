import { createSingleBattle, processCommand, canonicalJson, hashString, singleBattleIssues, type ContentCatalog, type GameCommand, type MatchState, type SingleBattleSpec } from '@pr/rules';

export interface SingleBattleReplay {
  format:'pantheon-battle-replay';
  version:1;
  rulesVersion:string;
  spec:SingleBattleSpec;
  commands:GameCommand[];
  finalHash:string;
}
export function exportSingleBattleReplay(state:MatchState):SingleBattleReplay {
  if(!state.standalone)throw new Error('This is not a Single Battle.');
  return {format:'pantheon-battle-replay',version:1,rulesVersion:state.versions.rulesVersion,spec:state.standalone.spec,commands:state.standalone.commands,finalHash:hashString(canonicalJson(state))};
}

/** Imports are replayed through the rules before being accepted, including legality and final checksum. */
export function validateSingleBattleReplay(catalog:ContentCatalog,value:unknown):SingleBattleReplay {
  if(!value||typeof value!=='object')throw new Error('Invalid replay.');
  const r=value as SingleBattleReplay;
  if(r.format!=='pantheon-battle-replay'||r.version!==1||r.rulesVersion!==catalog.versions.rulesVersion)throw new Error('Incompatible replay format or rules version.');
  const issues=singleBattleIssues(catalog,r.spec);if(issues.length)throw new Error(issues.join('\n'));
  if(!Array.isArray(r.commands)||r.commands.length>20000)throw new Error('Replay exceeds the 20,000 order limit.');
  let state=createSingleBattle(catalog,r.spec);
  for(const command of r.commands){
    if(!command||typeof command.kind!=='string'||!command.kind.startsWith('Battle'))throw new Error('Replay contains an invalid order.');
    const result=processCommand({catalog},state,command);
    if(!result.ok)throw new Error(`Invalid replay order ${state.revision+1}: ${result.rejection.message}`);
    state=result.state;
  }
  if(hashString(canonicalJson(state))!==r.finalHash)throw new Error('Replay checksum mismatch.');
  return r;
}
