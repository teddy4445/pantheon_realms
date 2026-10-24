import { Texture } from 'pixi.js';
import { GROUND_MOSAIC_SIZE, groundPatches, wrappedPatchCenters } from './groundVariation';

/** Bake the existing painting into a larger, seamless ground fill once when a map opens.
 * Soft overlapping rotations break the small repeated motif without visible hex-sized patches.
 * Kept in the existing ground cache; never runs in the animation/frame loop.
 * Returns null when canvas/source support is unavailable, allowing the caller's
 * original-texture fallback. The caller/cache owns the newly created texture. */
export function groundMosaic(source: Texture, seed: number, terrain: string): Texture | null {
  if(typeof document==='undefined')return null;
  const image=source.source.resource as CanvasImageSource|undefined;
  if(!image)return null;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=GROUND_MOSAIC_SIZE;
  const ctx=canvas.getContext('2d');
  const brush=document.createElement('canvas');brush.width=brush.height=384;
  const b=brush.getContext('2d');
  if(!ctx||!b)return null;
  // A uniform mean-colour undercoat avoids a seam in the original image leaking through the blend.
  const mean=document.createElement('canvas');mean.width=mean.height=1;
  const m=mean.getContext('2d');if(!m)return null;
  m.drawImage(image,0,0,1,1);const rgb=m.getImageData(0,0,1,1).data;
  ctx.fillStyle=`rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;ctx.fillRect(0,0,canvas.width,canvas.height);
  for(const p of groundPatches(seed,terrain)){
    b.clearRect(0,0,384,384);b.save();b.translate(192,192);b.rotate(p.angle);b.scale(p.mirror?-1:1,1);
    b.drawImage(image,-192,-192,384,384);b.restore();
    b.globalCompositeOperation='destination-in';
    const mask=b.createRadialGradient(192,192,45,192,192,185);
    mask.addColorStop(0,'rgba(0,0,0,1)');mask.addColorStop(.45,'rgba(0,0,0,.92)');mask.addColorStop(1,'rgba(0,0,0,0)');
    b.fillStyle=mask;b.fillRect(0,0,384,384);b.globalCompositeOperation='source-over';
    for(const c of wrappedPatchCenters(p))ctx.drawImage(brush,c.x-p.radius,c.y-p.radius,p.radius*2,p.radius*2);
  }
  const tex=Texture.from(canvas);tex.source.autoGenerateMipmaps=true;
  tex.source.label=`ground-mosaic:${terrain}`;
  tex.source.style.addressModeU=tex.source.style.addressModeV='repeat';tex.source.style.update();
  return tex;
}
