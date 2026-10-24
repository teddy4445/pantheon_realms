import { Container, Graphics } from 'pixi.js';
import { spriteManifest } from './sprites';
import { stillSprite } from './staticSprites';
import { mapFlagId } from './mapFlagStyle';

/** Painted cloth and finial stay readable but small, even above a tall town. */
export function paintedMapFlag(color:string,shape:'square'|'pennant',height:number):Container {
  const root=new Container(),id=mapFlagId(color,shape);root.label=id;
  const def=spriteManifest().decor[id];
  const paintedHeight=Math.min(height,44),extension=Math.max(0,height-paintedHeight);
  if(extension>0){
    const staff=new Graphics().moveTo(0,1).lineTo(0,-extension-2).stroke({width:2.6,color:0x50331b});
    staff.moveTo(-.6,0).lineTo(-.6,-extension-2).stroke({width:.8,color:0xc19a51});root.addChild(staff);
  }
  if(def){
    const sprite=stillSprite(def,paintedHeight*def.pixelsPerHex/def.height);sprite.y=-extension;root.addChild(sprite);
  }
  return root;
}
