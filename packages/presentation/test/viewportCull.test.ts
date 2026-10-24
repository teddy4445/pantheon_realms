import { describe, expect, it } from 'vitest';
import { Container, Graphics } from 'pixi.js';
import { cullMapObjects } from '../src/viewportCull';

const view = { left: 0, top: 0, right: 100, bottom: 100 };
function object(x:number,y:number) {
  const root = new Container(); root.position.set(x,y);
  root.addChild(new Graphics().rect(-10,-40,20,40).fill(0xffffff));
  return root;
}
describe('map drawing culling',()=>{
  it('keeps tall artwork crossing the edge and restores objects after panning',()=>{
    const tree=object(50,130),far=object(300,50);
    expect(cullMapObjects([tree,far],view)).toBe(1);
    expect(tree.renderable).toBe(true);expect(far.renderable).toBe(false);
    expect(far.visible).toBe(true);
    cullMapObjects([tree,far],{left:250,top:0,right:350,bottom:100});
    expect(far.renderable).toBe(true);expect(tree.renderable).toBe(false);
  });
  it('accounts for rotation, negative scales and art arriving after an empty root',()=>{
    const root=new Container();root.position.set(150,50);
    cullMapObjects([root],view);expect(root.renderable).toBe(false);
    root.addChild(new Graphics().rect(0,0,80,20).fill(0xffffff));root.scale.x=-1;
    cullMapObjects([root],view);expect(root.renderable).toBe(true);
    root.rotation=Math.PI/2;cullMapObjects([root],view);expect(root.renderable).toBe(false);
  });
  it('never reveals fog-hidden objects and checks them again when revealed',()=>{
    const root=object(50,50);root.visible=false;root.renderable=false;
    cullMapObjects([root],view);expect(root.visible).toBe(false);expect(root.renderable).toBe(false);
    root.visible=true;cullMapObjects([root],view);expect(root.renderable).toBe(true);
  });
});
