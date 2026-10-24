import { Container, Graphics } from 'pixi.js';
import type { HexCoord, WorldMapDefinition } from '@pr/rules';
import { planShoreLife, shoreLifeVisible, type ShoreLife } from './mapLifePlan';

type Moving = { node: Container; x: number; y: number; phase: number };
const supported = new Set(['windmill', 'sawmill', 'gold_mine', 'quarry', 'crystal_deposit']);

/** Small reusable geometry, built once. Frame updates only change transforms and opacity. */
export class SiteLife {
  readonly root = new Container();
  private readonly motes: Moving[] = [];
  private rotor: Container | null = null;
  private worker: Container | null = null;
  private arm: Container | null = null;
  private time = 0;
  constructor(readonly kind: string, parent: Container, scale: number) {
    parent.addChild(this.root);
    this.root.eventMode = 'none';
    this.root.scale.set(scale);
    if (kind === 'windmill') {
      const rotor = new Container();
      rotor.position.set(0, -96);
      for (let i = 0; i < 4; i++) {
        const blade = new Graphics().rect(-2, 0, 4, 64).fill(0x694524)
          .poly([2, 14, 14, 18, 14, 61, 2, 61]).fill(0xe0d0a0).stroke({ color: 0x715331, width: 1.4 });
        for (let y = 23; y < 62; y += 9) blade.moveTo(2, y).lineTo(14, y).stroke({ color: 0x967442, width: 1 });
        blade.rotation = i * Math.PI / 2;
        rotor.addChild(blade);
      }
      rotor.addChild(new Graphics().circle(0, 0, 5).fill(0x6d4825).circle(-1, -1, 2).fill(0xc7a366));
      this.root.addChild(rotor);
      this.rotor = rotor;
    }
    if (kind === 'sawmill') {
      this.root.addChild(new Graphics().rect(23, -114, 9, 17).fill(0x6c6353).rect(21, -116, 13, 4).fill(0x96876a));
      for (let i = 0; i < 5; i++) {
        const node = new Graphics().circle(0, 0, 5).fill({ color: 0xc3b9a6, alpha: .3 })
          .circle(2, -2, 3).fill({ color: 0xd4ccbb, alpha: .18 });
        this.root.addChild(node);
        this.motes.push({ node, x: 28, y: -119, phase: i / 5 });
      }
    }
    if (kind === 'crystal_deposit') {
      for (const [i, x, y] of [[0, -32, -83], [1, -4, -115], [2, 24, -67], [3, 43, -100]]) {
        const node = new Graphics().poly([0, -5, 1, -1, 5, 0, 1, 1, 0, 5, -1, 1, -5, 0, -1, -1]).fill(0xd9ffff);
        this.root.addChild(node);
        this.motes.push({ node, x: x!, y: y!, phase: i! / 4 });
      }
    }
    if (kind === 'gold_mine' || kind === 'quarry') {
      const worker = new Container();
      worker.addChild(new Graphics().ellipse(0, 1, 5, 2).fill({ color: 0x161b18, alpha: .25 })
        .rect(-3, -10, 6, 7).fill(0x725f42).rect(-3, -3, 2, 4).fill(0x373a35).rect(1, -3, 2, 4).fill(0x373a35)
        .circle(0, -13, 3).fill(0xc29b70).ellipse(0, -15, 4, 2).fill(0x988452));
      const arm = new Graphics().moveTo(0, 0).lineTo(6, -3).stroke({ color: 0xa48a65, width: 2 })
        .moveTo(6, 0).lineTo(6, -13).stroke({ color: 0x755738, width: 1.5 })
        .moveTo(2, -12).lineTo(10, -14).stroke({ color: 0xa4a6a1, width: 2 });
      arm.position.set(2, -9);
      worker.addChild(arm);
      this.root.addChild(worker);
      this.worker = worker;
      this.arm = arm;
    }
    this.tick(0, false);
  }
  static supports(kind: string): boolean { return supported.has(kind); }
  debug(): { phase: number; rotor: number | null; visible: boolean } {
    return { phase: this.time, rotor: this.rotor?.rotation ?? null, visible: this.root.visible };
  }
  tick(dt: number, motion: boolean): void {
    if (motion) this.time += Math.min(dt, 100);
    const t = motion ? this.time / 1000 : 0;
    if (this.rotor) this.rotor.rotation = -.4 + t * .18;
    for (const m of this.motes) {
      if (this.kind === 'sawmill') {
        const f = (t / 5 + m.phase) % 1;
        m.node.position.set(m.x + f * 14 + Math.sin(f * 5) * 2, m.y - f * 40);
        m.node.scale.set(.6 + f * 1.4);
        m.node.alpha = motion ? Math.sin(f * Math.PI) * .65 : 0;
      } else {
        const a = Math.max(0, Math.sin(t * 1.7 + m.phase * Math.PI * 2));
        m.node.position.set(m.x, m.y);
        m.node.alpha = motion ? a * a * .7 : .2;
        m.node.scale.set(.5 + a * .5);
      }
    }
    if (this.worker) {
      this.worker.position.set(-22 + Math.sin(t * .35) * 9, -8 + Math.cos(t * .35) * 2);
      if (this.arm) this.arm.rotation = -.25 + Math.sin(t * 1.6) * .3;
    }
  }
}

interface CoastEntry { root: Container; wave: Graphics; reeds: Container; bird: Graphics | null; plan: ShoreLife; phase: number }
export class CoastLife {
  private entries: CoastEntry[] = [];
  private time = 0;
  private width = 0;
  constructor(private parent: Container, private point: (c: HexCoord) => { x: number; y: number }) {}
  rebuild(map: WorldMapDefinition, towns: readonly HexCoord[]): void {
    this.clear();
    this.width = map.width;
    for (const plan of planShoreLife(map, towns)) {
      const a = this.point(plan.land), b = this.point(plan.water);
      const root = new Container();
      root.position.set(a.x * .47 + b.x * .53, a.y * .47 + b.y * .53);
      root.zIndex = root.y;
      root.eventMode = 'none';
      root.visible = false;
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      const span = 5 + plan.seed % 11;
      const wave = new Graphics().moveTo(-span, 0).quadraticCurveTo(-2, 1 + plan.seed % 4, span, 0).stroke({ color: 0xb6d8d3, alpha: .35, width: .6 });
      wave.rotation = angle + Math.PI / 2;
      // A second broken wash gives longer beaches a different rhythm.
      if(plan.seed % 4 === 0) wave.moveTo(-span*.6,4).quadraticCurveTo(0,6,span*.5,4).stroke({color:0xa0cbc9,alpha:.18,width:.55});
      root.addChild(wave);
      if (!plan.dock) {
        const detail = new Graphics();
        detail.rotation = angle;
        // All shapes are seeded and remain inside this revealed land/water pair.
        const style = (plan.seed >>> 4) % 4;
        if(style === 0) {
          for(let i=0;i<4;i++) {
            const px=-3+(i%2)*4, py=(i-1.5)*4;
            detail.ellipse(px+1,py+1,3.5,1.8).fill({color:0x223a35,alpha:.25});
            detail.poly([px-3,py,px-2,py-2,px+1,py-3,px+3,py,px+1,py+1]).fill(i%2?0x777e6b:0x93947c);
            detail.moveTo(px-2,py-1).lineTo(px+1,py-2).stroke({color:0xc2bda0,alpha:.6,width:.6});
          }
        } else if(style === 1) {
          detail.moveTo(-4,-7).quadraticCurveTo(-2,0,-5,8).stroke({color:0x66543d,width:2.3,cap:'round'});
          detail.moveTo(-4,-6).lineTo(-3,5).stroke({color:0xb6a07a,width:.7});
          detail.moveTo(-3,0).lineTo(-7,-3).stroke({color:0x766044,width:1});
        } else if(style === 2) {
          detail.ellipse(-3,0,4,10).fill({color:0xb9aa78,alpha:.25});
          for(let i=0;i<7;i++) detail.circle(-4+(i%3)*1.8,(i-3)*2, .5+(i%2)*.3).fill({color:0xd0c19a,alpha:.6});
        } else {
          detail.ellipse(2,0,4,8).fill({color:0x3a8c8a,alpha:.22});
          detail.ellipse(-3,-4,2,4).fill({color:0x6f804c,alpha:.35});
          detail.ellipse(-4,5,3,2).fill({color:0x84915b,alpha:.3});
        }
        root.addChild(detail);
      }
      const reeds = new Container();
      reeds.position.set((a.x - b.x) * .12, (a.y - b.y) * .12);
      if (plan.reeds) {
        const g = new Graphics();
        for (let i = 0; i < 5; i++) {
          const x = i * 1.3 - 3, h = 4 + (i * 3) % 5;
          g.moveTo(x, 1).quadraticCurveTo(x - 2, -h / 2, x - 1, -h).stroke({ color: i % 2 ? 0x6c7944 : 0x879358, width: .7 });
          if (i % 2) g.moveTo(x - 1, -h).lineTo(x - 1, -h - 2).stroke({ color: 0x796344, width: 1.2 });
        }
        reeds.addChild(g);
      }
      root.addChild(reeds);
      if (plan.dock) {
        const dock = new Graphics();
        for (let i = 0; i < 7; i++) dock.rect(-7 + i * 2.6, -4, 2.3, 8).fill(i % 2 ? 0x88714b : 0x9e8055);
        for (const x of [-6, 9]) for (const y of [-4, 4]) dock.circle(x, y, 1.2).fill(0x4f4230);
        dock.rotation = angle;
        root.addChild(dock);
      }
      const bird = plan.birds ? new Graphics().moveTo(-3, 0).quadraticCurveTo(-1, -2, 0, 0).quadraticCurveTo(1, -2, 3, 0).stroke({ color: 0xe1dfcc, width: 1 }) : null;
      if (bird) root.addChild(bird);
      this.parent.addChild(root);
      this.entries.push({ root, wave, reeds, bird, plan, phase: (plan.seed % 100) / 100 * Math.PI * 2 });
    }
  }
  visibility(visible: ReadonlySet<number>): void {
    for (const e of this.entries) e.root.visible = shoreLifeVisible(e.plan, this.width, visible);
  }
  tick(dt: number, motion: boolean, inView: (x: number, y: number) => boolean): void {
    if (motion) this.time += Math.min(dt, 100);
    const t = motion ? this.time / 1000 : 0;
    for (const e of this.entries) {
      if (!e.root.visible || !inView(e.root.x, e.root.y)) continue;
      e.wave.alpha = motion ? .45 + Math.sin(t * .7 + e.phase) * .25 : .5;
      e.wave.scale.set(1 + (motion ? Math.sin(t * .7 + e.phase) * .08 : 0));
      e.reeds.skew.x = motion ? Math.sin(t * .8 + e.phase) * .035 : 0;
      if (e.bird) {
        // Short, infrequent passes confined to the revealed shore pair.
        const cycle = (t + e.phase * 3) % 24;
        e.bird.visible = motion && cycle < 5;
        e.bird.position.set(-8 + cycle * 3.2, -7 - Math.sin(cycle * .6) * 3);
        e.bird.scale.y = .7 + Math.sin(t * 5) * .25;
      }
    }
  }
  debug(): { shores: number; visible: number; docks: number; reeds: number; birds: number; phase: number } {
    return { shores: this.entries.length, visible: this.entries.filter(e => e.root.visible).length,
      docks: this.entries.filter(e => e.plan.dock).length, reeds: this.entries.filter(e => e.plan.reeds).length, birds: this.entries.filter(e => e.plan.birds).length, phase: this.time };
  }
  clear(): void { for (const e of this.entries) e.root.destroy({ children: true }); this.entries = []; }
}
