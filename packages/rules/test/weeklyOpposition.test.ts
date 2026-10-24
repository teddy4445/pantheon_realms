import {expect,it} from 'vitest';
import {growWorldOpposition} from '../src/systems/world';
import type {Tx} from '../src/engine/tx';
it('grows surviving opposition once weekly, without growing player armies or reviving cleared guards',()=>{
 const guard={count:100},cleared={count:100},enemy={count:10},mine={count:100},garrison={count:50};
 const keys=new Set<string>();
 const tx={state:{world:{sites:{open:{cleared:false,guard:[guard]},done:{cleared:true,guard:[cleared]}}},players:{me:{controller:'human'},enemy:{controller:'ai'}},heroes:{me:{ownerId:'me',status:'active',army:{slots:[mine]}},enemy:{ownerId:'enemy',status:'active',army:{slots:[enemy]}}},towns:{neutral:{ownerId:null,garrison:{slots:[garrison]}}}},applyOnce:(key:string)=>{if(keys.has(key))return false;keys.add(key);return true;}} as unknown as Tx;
 growWorldOpposition(tx,1);expect(guard.count).toBe(100);
 growWorldOpposition(tx,2);expect([guard.count,enemy.count,garrison.count]).toEqual([112,11,56]);
 growWorldOpposition(tx,2);expect(guard.count).toBe(112);
 growWorldOpposition(tx,3);expect(guard.count).toBe(125);
 expect(mine.count).toBe(100);expect(cleared.count).toBe(100);
});
