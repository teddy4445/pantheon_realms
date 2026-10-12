/** Connected fortifications and registered ground layers, drawn in the battle's coordinates. */
import { Container, Graphics, Texture, TilingSprite } from 'pixi.js';
import { groundShadow, stillSprite, stillTexture } from './staticSprites';
import { spriteManifest, type StaticSpriteDefinition } from './sprites';
import { SIEGE_HEX, SIEGE_ROW, siegePalette, siegeWallPoint } from './siegeLayout';

/** World-space texture phase keeps separate damageable cells joined, without stretching masonry or water. */
function tiledSurface(def: StaticSpriteDefinition, width: number, height: number, worldTop: number): TilingSprite {
  const sprite=new TilingSprite({texture:Texture.EMPTY,width,height});
  sprite.visible=false;
  void stillTexture(def).then(texture=>{
    if(sprite.destroyed)return;
    sprite.texture=texture;
    sprite.tileScale.set(width/def.width);
    sprite.tilePosition.set(0,-worldTop);
    sprite.visible=true;
  },()=>undefined);
  return sprite;
}

/** Each cell samples its part of one continuous painted strip; damage can still remove any section. */
export function paintedWall(def: StaticSpriteDefinition, row: number, shadows: boolean, extendNorth = false): Container {
  const root=new Container(), extra=extendNorth ? SIEGE_ROW/2 : 0;
  if(shadows){const shade=groundShadow(28,SIEGE_ROW*0.7,0.22);shade.x=3;root.addChild(shade);}
  const sprite=tiledSurface(def,55,SIEGE_ROW+extra+0.2,(row-0.5)*SIEGE_ROW-extra);
  sprite.position.set(-55/2-9,-SIEGE_ROW/2-extra);
  root.addChild(sprite);return root;
}

/** A wall's exposed west face, walkway and merlons share their exact end points with neighbours. */
export function connectedWall(pantheon: string | null | undefined, hp: number, maxHp: number, row: number, shadows: boolean): Container {
  const root = new Container(), g = new Graphics(), p = siegePalette(pantheon);
  const half = SIEGE_ROW / 2, damaged = hp < maxHp;
  if (shadows) { const s = groundShadow(25, half + 8, 0.24); s.x = 6; root.addChild(s); }
  if (hp <= 0) {
    for (let i = 0; i < 16; i++) {
      const x = ((i * 31 + row * 13) % 43) - 22, y = ((i * 17) % 43) - half;
      const w = 5 + (i % 4), h = 3 + (i % 3);
      g.poly([x-w,y,x,y-h,x+w,y+1,x+w-2,y+h,x-w,y+h]).fill({color:i%3 ? p.stone:p.light}).stroke({color:p.shade,width:0.7});
    }
    root.addChild(g); return root;
  }
  // The elevation has a westward component so the wall's face is readable from this fixed camera.
  const rise = damaged ? 20 : 27, lean = damaged ? 17 : 23;
  const front = -12, back = 12;
  g.poly([front,-half,front-lean,-half-rise,front-lean,half-rise,front,half]).fill(p.stone);
  g.poly([front-lean,-half-rise,back-lean,-half-rise,back-lean,half-rise,front-lean,half-rise]).fill(p.light);
  g.poly([back-lean,-half-rise,back,-half,back,half,back-lean,half-rise]).fill(p.shade);
  // Masonry courses continue through adjoining cells; no repeated end caps.
  for(let course=1;course<=3;course++) {
    const f=course/4, x=front-lean*f;
    g.moveTo(x,-half-rise*f).lineTo(x,half-rise*f).stroke({color:p.mortar,width:0.65,alpha:0.62});
    for(let j=0;j<3;j++) {
      const y=-half+j*SIEGE_ROW/2+(course%2)*SIEGE_ROW/4;
      if(y>=half)continue;
      g.moveTo(x,y-rise*f).lineTo(x-lean/4,y-rise*(f+0.25)).stroke({color:p.mortar,width:0.6,alpha:0.65});
    }
  }
  // A restrained faction band ties the span to the painted gate and towers.
  g.poly([front-lean*0.7,-half-rise*0.7,front-lean*0.84,-half-rise*0.84,front-lean*0.84,half-rise*0.84,front-lean*0.7,half-rise*0.7]).fill(p.trim);
  for(let i=0;i<2;i++) {
    if(damaged && (i+row)%2===0)continue;
    const y=-half+i*SIEGE_ROW/2+3, x=front-lean;
    g.poly([x,y-rise,x-2,y-rise-9,x+8,y-rise-9,x+10,y-rise,x+10,y-rise+7,x,y-rise+7]).fill(p.light).stroke({color:p.shade,width:0.65});
    g.poly([x-2,y-rise-9,x+8,y-rise-9,x+11,y-rise-6,x+1,y-rise-6]).fill(p.cap);
  }
  if(p.wood) for(let i=0;i<3;i++) {const y=-half+i*15;g.moveTo(front-lean,y-rise).lineTo(front,y).stroke({color:p.cap,width:3});}
  if(damaged)g.moveTo(front-lean, -rise+4).lineTo(front-lean*0.6,-rise*0.6+2).lineTo(front-lean*0.75,-rise*0.4+8).lineTo(front,17).stroke({color:p.mortar,width:2.1});
  root.addChild(g); return root;
}

/** Roads and ditch follow the gate row and moat cells, never an approximate painted crossing. */
export function siegeGroundLayer(pantheon: string | null | undefined, wallCol: number, rows: number, cols: number, moat: readonly {col:number;row:number}[], gateRow: number): Container {
  const root=new Container(), g=new Graphics(), p=siegePalette(pantheon);
  root.addChild(g);
  const ditchDef=spriteManifest().siege['ground.ditch'], bridgeDef=spriteManifest().siege['ground.bridge'];
  const wall=siegeWallPoint(wallCol,0).x, y0=-SIEGE_ROW*0.5, y1=(rows-0.5)*SIEGE_ROW, roadY=gateRow*SIEGE_ROW;
  const left=-SIEGE_HEX*0.4, right=SIEGE_HEX*(cols+1.5);
  // Soft shoulders: translucent broad bands preserve the painted ground underneath.
  g.rect(wall+18,y0-25,right-wall-18,y1-y0+50).fill({color:p.road,alpha:0.18});
  for(const [extra,alpha] of [[9,0.07],[5,0.12],[0,0.42]] as const)g.roundRect(left,roadY-18-extra,right-left,36+extra*2,12).fill({color:p.road,alpha});
  // Understated paving near the defended entrance, with no opaque rectangle over the scene.
  for(let y=y0;y<y1;y+=17)for(let x=wall+23+((Math.floor(y/17)&1)*13);x<right-12;x+=28){
    g.roundRect(x,y,24,13,2).fill({color:p.light,alpha:0.1}).stroke({color:p.shade,width:0.6,alpha:0.15});
  }
  if(moat.length) {
    const ditchX=wall-SIEGE_HEX, half= SIEGE_HEX*0.42;
    const occupied=new Set(moat.map(c=>c.row));
    let start=-1;
    for(let r=0;r<=rows;r++) {
      if(occupied.has(r)){if(start<0)start=r;continue;}
      if(start<0)continue;
      const from=(start-0.5)*SIEGE_ROW,to=(r-0.5)*SIEGE_ROW;
      if(ditchDef?.frame) {
        const width=half*2+16;
        const topDef=start===0 ? spriteManifest().siege['ground.ditch.top'] : undefined;
        const bottomDef=r===rows ? spriteManifest().siege['ground.ditch.bottom'] : undefined;
        const topHeight=topDef ? topDef.height*width/topDef.width : 0;
        const bottomHeight=bottomDef ? bottomDef.height*width/bottomDef.width : 0;
        const top=from-(start===0 ? 0 : 8), bottom=to+(r===rows ? 0 : 8);
        const s=tiledSurface(ditchDef,width,bottom-top-topHeight-bottomHeight+0.2,top+topHeight);
        s.position.set(ditchX-width/2,top+topHeight);root.addChild(s);
        for(const [def,anchorY,y] of [[topDef,0,top],[bottomDef,1,bottom]] as const) {
          if(!def)continue;
          const cap=stillSprite({...def,anchor:[.5,anchorY]},SIEGE_HEX);
          cap.scale.set(width/def.width);cap.position.set(ditchX,y);root.addChild(cap);
        }
        start=-1;continue;
      }
      g.roundRect(ditchX-half-8,from,half*2+16,to-from,6).fill({color:p.bank,alpha:0.75});
      g.roundRect(ditchX-half-3,from+2,half*2+6,to-from-4,4).fill(p.shade);
      g.roundRect(ditchX-half+3,from+4,half*2-6,to-from-8,3).fill({color:p.water,alpha:0.9});
      for(let y=from+9,i=0;y<to-8;y+=13,i++) {
        const wobble=Math.sin(i*2.7)*2;
        for(const side of [-1,1]) {
          const x=ditchX+side*(half+1)+wobble;
          g.poly([x-5,y-5,x+4,y-6,x+6,y+3,x+2,y+7,x-6,y+5]).fill({color:i%3===0?p.light:p.stone,alpha:0.75}).stroke({color:p.shade,width:0.6,alpha:0.6});
        }
        g.ellipse(ditchX+wobble*3,y,half-10,5).fill({color:p.shade,alpha:0.08});
        g.moveTo(ditchX-half+12,y).quadraticCurveTo(ditchX,y+2,ditchX+half-12,y-2).stroke({color:p.light,width:0.8,alpha:0.15});
      }
      start=-1;
    }
    // Actual bridge lies on the safe gate row, exactly between the two ditch runs.
    const bx=ditchX-half-11,bw=half*2+22;
    if(bridgeDef) {
      const bridge=stillSprite(bridgeDef,SIEGE_HEX);
      bridge.scale.set((bw+8)/bridgeDef.width,38/bridgeDef.height);
      bridge.position.set(ditchX,roadY);root.addChild(bridge);
    } else {
      g.roundRect(bx+2,roadY-17,bw,38,2).fill({color:0x211b11,alpha:0.2});
      g.rect(bx,roadY-18,bw,36).fill(p.road).stroke({color:p.shade,width:1});
      for(let x=bx+8;x<bx+bw;x+=11)g.moveTo(x,roadY-17).lineTo(x,roadY+17).stroke({color:p.shade,width:1,alpha:0.4});
      for(const y of [roadY-18,roadY+18])g.moveTo(bx,y).lineTo(bx+bw,y).stroke({color:p.light,width:3});
    }
  }
  return root;
}
