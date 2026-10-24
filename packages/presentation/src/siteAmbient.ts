import { Container, Graphics } from 'pixi.js';
import { stableAnimationPhase } from './animationTiming';
import { siteAmbientEffects, type AmbientEffect } from './siteAmbientPlan';

type Particle = { root: Container; effect: AmbientEffect; i: number; count: number };
const counts: Partial<Record<AmbientEffect, number>> = {
  'town-pennants': 2, 'town-windows': 3, 'tower-birds': 2, 'camp-embers': 5,
  'shrine-rays': 3, 'shrine-motes': 5, 'stone-runes': 3, 'portal-spiral': 5,
  'portal-rings': 2, 'tree-leaves': 5, 'tree-butterflies': 2, 'waterfall-stream': 4,
  'waterfall-mist': 4, 'waterfall-foam': 3, 'ruins-dust': 5, 'ruins-fireflies': 3,
  'sluice-drips': 3, 'quarry-dust': 4, 'statue-votives': 2,
};
/** Small bounded pools. No new geometry, textures or allocations in the animation loop. */
export class SiteAmbient {
  readonly root = new Container();
  readonly effects: readonly AmbientEffect[];
  private readonly particles: Particle[] = [];
  private time = 0;
  private readonly phase: number;
  constructor(parent: Container, kind: string, art: string, key: string, height: number) {
    this.effects = siteAmbientEffects(kind, art);
    this.phase = stableAnimationPhase(key) * Math.PI * 2;
    this.root.eventMode = 'none';
    this.root.visible = false;
    this.root.scale.set(Math.min(1.35,Math.max(.3,height/100)));
    parent.addChild(this.root);
    for (const effect of this.effects) for(let i=0;i<(counts[effect]??1);i++) {
      const root = new Container();
      const g = new Graphics();
      root.addChild(g); this.root.addChild(root);
      switch(effect) {
        case 'town-pennants': case 'tent-cloth':
          g.moveTo(0,0).lineTo(0,-12).stroke({color:0x725d39,width:.7});
          g.poly([0,-12,9,-10,6,-7,0,-8]).fill(effect==='tent-cloth'?0xbdad71:0xabb6bd); break;
        case 'town-windows': g.rect(-1,-1,2,2).fill(0xffd185); break;
        case 'tower-beacon': case 'camp-flame': case 'statue-votives':
          g.ellipse(0,0,4,1.6).fill({color:0xb47c37,alpha:.16});
          g.poly([-1.8,0,-1,-3,0,-7,1,-4,2,0]).fill({color:0xffbd63,alpha:.75});
          g.poly([-.8,0,0,-4,1,0]).fill(0xffe3a2); break;
        case 'tower-birds':
          g.moveTo(-3,0).quadraticCurveTo(-1,-2,0,0).quadraticCurveTo(1,-2,3,0).stroke({color:0x393f3c,width:.7}); break;
        case 'camp-embers': g.circle(0,0,.65).fill(0xf5b65c); break;
        case 'shrine-rays':
          g.poly([-1,0,-5,-24,5,-24,1,0]).fill({color:0xffe2a3,alpha:.09}); break;
        case 'shrine-motes': case 'portal-spiral':
          g.circle(0,0,1).fill(effect==='portal-spiral'?0xb4a7fa:0xffe4a5); break;
        case 'stone-runes':
          g.moveTo(-2,2).lineTo(0,-3).lineTo(2,2).moveTo(-1,0).lineTo(2,-1).stroke({color:0xbddbd9,width:.6}); break;
        case 'hut-lantern':
          g.moveTo(0,0).lineTo(0,4).stroke({color:0x655539,width:.6});
          g.roundRect(-1.5,4,3,4,.5).fill(0xeac481).stroke({color:0x665439,width:.6}); break;
        case 'portal-rings': case 'relic-halo':
          g.ellipse(0,0,12,4).stroke({color:effect==='portal-rings'?0xbca9ed:0xffe0a1,width:.65,alpha:.5}); break;
        case 'chest-glint':
          g.poly([0,-4,.6,-.6,4,0,.6,.6,0,4,-.6,.6,-4,0,-.6,-.6]).fill(0xffe7b6); break;
        case 'tree-leaves':
          g.ellipse(0,0,1.7,.8).fill(art.includes('blossom')?0xe4b0be:0xa6ac62); break;
        case 'tree-butterflies':
          g.ellipse(-1.4,0,1.5,2).ellipse(1.4,0,1.5,2).fill({color:0xd9c8a0,alpha:.85});
          g.moveTo(0,-1).lineTo(0,1).stroke({color:0x575845,width:.5}); break;
        case 'waterfall-stream':
          g.moveTo(0,-5).quadraticCurveTo(1,0,0,5).stroke({color:0xd7f0e6,width:.7,alpha:.6}); break;
        case 'waterfall-mist':
          g.ellipse(0,0,6,2.5).fill({color:0xe4ede0,alpha:.13}); break;
        case 'waterfall-foam':
          g.ellipse(0,0,4,1.2).stroke({color:0xd2e9df,width:.6,alpha:.4}); break;
        case 'ruins-dust': case 'quarry-dust':
          g.circle(0,0,effect==='quarry-dust'?1.6:.7).fill({color:0xc8bc9e,alpha:.45}); break;
        case 'ruins-fireflies':
          g.circle(0,0,2.2).fill({color:0xd9c887,alpha:.08}).circle(0,0,.6).fill(0xe1d4a6); break;
        case 'sluice-drips':
          g.ellipse(0,0,.6,1.3).fill({color:0xbddde2,alpha:.65}); break;
        case 'mine-cart':
          g.poly([-4,0,-5,-4,5,-4,4,0]).fill(0x887458);
          g.circle(-3,1,1.3).circle(3,1,1.3).fill(0x474742);
          g.poly([-4,-4,-2,-6,1,-5,3,-6,5,-4]).fill(0x9a9376); break;
      }
      this.particles.push({root,effect,i,count:counts[effect]??1});
    }
  }
  get particleCount(): number { return this.particles.length; }
  debug() { return {effects:this.effects,particles:this.particles.length,phase:this.time,visible:this.root.visible}; }
  tick(dt: number, active: boolean): void {
    this.root.visible = active;
    if(!active) return;
    this.time += Math.min(Math.max(dt,0),100);
    const t = this.time/1000 + this.phase;
    for(const {root:p,effect,i,count} of this.particles) {
      const phase=i/count, a=t+phase*Math.PI*2, f=(t/5+phase)%1;
      switch(effect) {
        case 'town-pennants': p.position.set(i?-17:16,i?-46:-62); p.skew.x=Math.sin(a*1.7)*.08; p.scale.x=.95+Math.sin(a*1.7)*.05; break;
        case 'town-windows': p.position.set((i-1)*13,-18-i*5); p.alpha=.18+Math.pow(Math.max(0,Math.sin(a*.43)),4)*.32; break;
        case 'tower-beacon': p.position.set(0,-82); p.scale.set(.9+Math.sin(a*5)*.07,1+Math.sin(a*7)*.13); break;
        case 'tower-birds': p.position.set(Math.cos(a*.3)*26,-87+Math.sin(a*.3)*7); p.scale.y=.7+Math.sin(a*8)*.25; p.alpha=.6; break;
        case 'camp-flame': p.position.set(12,-7); p.scale.set(1+Math.sin(a*7)*.1,1+Math.cos(a*9)*.15); break;
        case 'camp-embers': p.position.set(12+Math.sin(a*1.4)*f*5,-10-f*18); p.alpha=Math.sin(f*Math.PI)*.65; break;
        case 'shrine-rays': p.position.set((i-1)*6,-28); p.rotation=Math.sin(a*.4)*.1; p.alpha=.3+Math.sin(a*.7)*.25; break;
        case 'shrine-motes': p.position.set(Math.sin(a*.5)*12,-24-f*26); p.alpha=Math.sin(f*Math.PI)*.55; break;
        case 'stone-runes': p.position.set(Math.cos(a*.45)*13,-32+Math.sin(a*.45)*5); p.alpha=.25+Math.max(0,Math.sin(a*.45))*.35; break;
        case 'hut-lantern': p.position.set(14,-31); p.rotation=Math.sin(a*1.4)*.1; p.alpha=.7+Math.sin(a*3)*.12; break;
        case 'tent-cloth': p.position.set(-6,-49); p.skew.x=Math.sin(a*2)*.11; p.scale.x=.85+Math.sin(a*2)*.12; break;
        case 'portal-spiral': p.position.set(Math.cos(a*1.1)*11,-22-f*33); p.alpha=Math.sin(f*Math.PI)*.6; break;
        case 'portal-rings': p.position.set(0,-9); p.scale.set(.7+f*.7); p.alpha=Math.sin(f*Math.PI)*.3; break;
        case 'relic-halo': p.position.set(0,-49+Math.sin(a*.8)*2); p.scale.x=1+Math.sin(a*.6)*.12; p.alpha=.35+Math.sin(a)*.15; break;
        case 'chest-glint': p.position.set(3,-27); p.rotation=a*.25; p.alpha=Math.pow(Math.max(0,Math.sin(a*.7)),12)*.7; p.scale.set(.7+p.alpha*.4); break;
        case 'statue-votives': p.position.set(i?14:-14,-7); p.scale.y=.9+Math.sin(a*8)*.15; p.alpha=.7; break;
        case 'tree-leaves': p.position.set((phase-.5)*40+Math.sin(f*8+phase)*7,-64+f*58); p.rotation=f*8+i; p.scale.x=.4+Math.abs(Math.sin(a))*.6; p.alpha=Math.sin(f*Math.PI)*.7; break;
        case 'tree-butterflies': p.position.set(Math.sin(a*.43)*24,-25+Math.cos(a*.63)*8); p.scale.x=.2+Math.abs(Math.sin(a*9))*.8; p.rotation=Math.sin(a*.43)*.2; break;
        case 'waterfall-stream': p.position.set((i-1.5)*2,-63+f*48); p.alpha=Math.sin(f*Math.PI)*.55; break;
        case 'waterfall-mist': p.position.set((phase-.5)*18+f*7,-10-f*8); p.scale.set(.5+f*1.4); p.alpha=Math.sin(f*Math.PI)*.65; break;
        case 'waterfall-foam': p.position.set((phase-.5)*16,-4+f*4); p.scale.set(.4+f*1.8); p.alpha=(1-f)*.5; break;
        case 'ruins-dust': p.position.set((phase-.5)*24+Math.sin(a*.4)*3,-15-f*22); p.alpha=Math.sin(f*Math.PI)*.35; break;
        case 'ruins-fireflies': p.position.set(Math.sin(a*.31)*19,-23+Math.cos(a*.73)*8); p.alpha=Math.pow(Math.max(0,Math.sin(a*1.3)),3)*.7; break;
        case 'sluice-drips': p.position.set((i-1)*7,-22+f*f*21); p.scale.y=.7+f; p.alpha=Math.sin(f*Math.PI)*.5; break;
        case 'mine-cart': {const cycle=(t%16)/16; p.position.set(-10+Math.sin(cycle*Math.PI*2)*12,-5); p.alpha=.7; break;}
        case 'quarry-dust': p.position.set(-20+phase*10+f*4,-5-f*8); p.scale.set(.3+f); p.alpha=Math.sin(f*Math.PI)*.18; break;
      }
    }
  }
}
