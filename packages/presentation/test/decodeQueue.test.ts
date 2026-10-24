import { expect, it } from 'vitest';
import { DecodeQueue } from '../src/decodeQueue';

it('bounds decodes, prioritizes pending animation work, and recovers after failure',async()=>{
  const q=new DecodeQueue(1),order:string[]=[];
  let release!:()=>void;
  const first=q.run(()=>new Promise<void>(done=>{order.push('first');release=done;}));
  const scenery=q.run(async()=>{order.push('scenery');return 3;});
  const action=q.run(async()=>{order.push('action');throw new Error('decode failed');},true);
  const failure=expect(action).rejects.toThrow('decode failed');
  await Promise.resolve();expect(order).toEqual(['first']);release();
  await Promise.all([first,failure,scenery]);expect(order).toEqual(['first','action','scenery']);
});

it('fills all available slots without exceeding the limit',async()=>{
  const q=new DecodeQueue(2);let active=0,peak=0;
  await Promise.all(Array.from({length:10},()=>q.run(async()=>{
    active++;peak=Math.max(peak,active);await new Promise(done=>setTimeout(done,1));active--;
  })));
  expect(peak).toBe(2);expect(active).toBe(0);
});
