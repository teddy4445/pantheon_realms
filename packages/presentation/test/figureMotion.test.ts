import { describe,it,expect,vi } from 'vitest';
import { Texture } from 'pixi.js';
import type { SpriteSetDefinition,SpriteStrip } from '../src/sprites';
const tracking=vi.hoisted(()=>({requested:[] as string[],owners:new Map<string,number>()}));
vi.mock('../src/textures',()=>{
  const frames=new Map<string,Texture[]>();
  return {
    loadStrip:async(s:SpriteStrip)=>{tracking.requested.push(s.file);if(!frames.has(s.file))frames.set(s.file,Array.from({length:s.frames},()=>new Texture({source:Texture.EMPTY.source})));return frames.get(s.file)!;},
    stripFrames:(s:SpriteStrip)=>frames.get(s.file)??null,
    retainFigureStrip:(s:SpriteStrip)=>tracking.owners.set(s.file,(tracking.owners.get(s.file)??0)+1),
    releaseFigureStrip:(s:SpriteStrip)=>tracking.owners.set(s.file,(tracking.owners.get(s.file)??0)-1),
    trimFigureTextures:()=>{},
  };
});
import { SpriteFigure } from '../src/figure';
import { TweenPlayer } from '../src/tween';
function set(key:string):SpriteSetDefinition {
  const animations=Object.fromEntries(['idle','move','attack','death'].map(name=>[name,{file:`${key}/${name}`,frames:6,frameWidth:100,frameHeight:100,fps:name==='idle'?3:name==='move'?8:6,loop:['idle','move'].includes(name),anchor:[.5,.9] as const}]));
  return {status:'final',provenance:'test',facing:'right',pixelsPerHex:100,animations};
}
describe('creature figure playback',()=>{
  it('plays impact poses on the shared clock and finishes normally or instantly',async()=>{
    const f=new SpriteFigure({set:set('contact'),hexWidth:100,phaseKey:'one'});await f.loaded;
    const tweens=new TweenPlayer();let done=f.playOnce('attack',tweens,{minMs:560});
    tweens.tick(319);expect(f.motionDebug().frame).toBe(2);
    tweens.tick(1);expect(f.motionDebug().frame).toBe(f.contactFrame());
    tweens.tick(340);await done;expect(f.current?.drawn).toBe('idle');
    tweens.speed=0;done=f.playOnce('attack',tweens);await done;expect(f.current?.drawn).toBe('idle');
    f.destroy();
  });
  it('uses distance for gait, preserves direction phase, and freezes idle motion',async()=>{
    const f=new SpriteFigure({set:set('walk'),hexWidth:100,phaseKey:'two'});await f.loaded;
    f.setLoop('move');f.beginTravel();f.travelTo(125);
    const half=f.motionDebug().phase;expect(half).toBe(375);
    f.tick(100);expect(f.motionDebug().phase).toBe(half);
    f.face('w');expect(f.motionDebug().phase).toBe(half);
    f.travelTo(250);expect(f.motionDebug().frame).toBe(0);
    f.endTravel();f.setLoop('idle');f.tick(80,1,true);f.tick(80,1,true);
    expect(f.body.scale.y).not.toBe(1);
    f.tick(16,0,false);const pose=f.motionDebug();f.tick(1000,0,false);
    expect(f.motionDebug()).toEqual(pose);expect(f.body.scale.y).toBe(1);expect(f.body.y).toBe(0);
    f.destroy();
  });
  it('loads guard idle only, requests an action on demand and releases each shared image exactly once',async()=>{
    const art=set('guard-only');
    const a=new SpriteFigure({set:art,hexWidth:100,context:'guard'}), b=new SpriteFigure({set:art,hexWidth:100,context:'guard'});
    await Promise.all([a.loaded,b.loaded]);
    expect(tracking.requested.filter(f=>f.startsWith('guard-only/')).every(f=>f.endsWith('/idle'))).toBe(true);
    expect(tracking.owners.get('guard-only/idle')).toBe(2);
    const tw=new TweenPlayer();tw.speed=0;await a.playOnce('attack',tw);
    expect(tracking.owners.get('guard-only/attack')).toBe(1);
    a.destroy();expect(tracking.owners.get('guard-only/idle')).toBe(1);
    b.destroy();expect(tracking.owners.get('guard-only/idle')).toBe(0);expect(tracking.owners.get('guard-only/attack')).toBe(0);
    expect(await a.playOnce('attack',tw)).toBeNull();expect(a.holdLast('death')).toBeNull();
  });
});
