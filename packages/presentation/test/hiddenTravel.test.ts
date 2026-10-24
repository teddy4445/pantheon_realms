import {describe,it,expect,vi} from 'vitest';
import {Container} from 'pixi.js';
import {AdventureSceneController} from '../src/adventure';

describe('enemy camera visibility during movement',()=>{
  const run = async (visible:(c:{q:number;r:number})=>boolean) => {
    const root=new Container();
    const e={root,coord:{q:3,r:0},prevCoord:{q:0,r:0},locked:0,snapIn:0,shown:false,embarked:false,clip:'idle',
      figure:{pose:{y:0},resolve:()=>({fallback:false}),beginTravel:vi.fn(),travelTo:vi.fn(),endTravel:vi.fn()}};
    const goals:unknown[]=[];
    const scene:any={
      heroes:new Map([['enemy',e]]),followingHero:null,camGoal:null,
      placeHero:(entry:any,c:any)=>entry.root.position.set(c.q*60,c.r*40),
      setClip:(entry:any,clip:string)=>entry.clip=clip,
      faceToward:vi.fn(),releaseArrival:vi.fn(),
      hexCenter:(c:any)=>({x:c.q*60,y:c.r*40}),
      tweens:{speed:1,tween:async(_ms:number,fn:(t:number)=>void)=>{
        goals.push(scene.camGoal && {...scene.camGoal});
        fn(.5);goals.push(scene.camGoal && {...scene.camGoal});
        fn(1);goals.push(scene.camGoal && {...scene.camGoal});
      }},
    };
    await AdventureSceneController.prototype.playHeroMove.call(scene,'enemy',[{q:1,r:0},{q:2,r:0},{q:3,r:0}],1,true,undefined,false,visible);
    root.destroy();
    return goals;
  };
  it('never starts tracking a route entirely outside the player sight',async()=>{
    expect((await run(()=>false)).every(g=>g===null)).toBe(true);
  });
  it('does not jump to a hidden starting point when an enemy later enters sight',async()=>{
    const goals=await run(c=>c.q>=2);
    expect(goals.slice(0,4)).toEqual([null,null,null,null]);
    expect(goals.some(g=>g!==null)).toBe(true);
  });
  it('still follows visible movement',async()=>{
    const goals=await run(()=>true);
    expect(goals[0]).toEqual({x:0,y:0});
    expect(goals.at(-1)).toEqual({x:180,y:0});
  });
});
