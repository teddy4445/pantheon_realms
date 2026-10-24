/** Stable, world-space texture variation. No hex coordinate, game RNG, or mutable match data. */
export const GROUND_MOSAIC_SIZE = 1024;
export const GROUND_MOSAIC_REPEAT = 8;
export interface GroundPatch { x: number; y: number; radius: number; angle: number; mirror: boolean }
function random(seed: number, salt: string): () => number {
  let h=seed|0;
  for(const c of salt)h=Math.imul(h^c.charCodeAt(0),16777619);
  return ()=>{h+=0x6d2b79f5;let x=h;x=Math.imul(x^(x>>>15),x|1);x^=x+Math.imul(x^(x>>>7),x|61);return ((x^(x>>>14))>>>0)/4294967296;};
}
export function groundPatches(seed: number, terrain: string): GroundPatch[] {
  const next=random(seed,terrain),step=GROUND_MOSAIC_SIZE/8;
  return Array.from({length:64},(_,i)=>({x:((i%8)+next()*.65)*step,y:(Math.floor(i/8)+next()*.65)*step,radius:145+next()*55,angle:next()*Math.PI*2,mirror:next()>.5}));
}
/** Draw a brush across a torus: copies beyond an edge meet the opposite edge exactly. */
export function wrappedPatchCenters(p: GroundPatch): {x:number;y:number}[] {
  const out:{x:number;y:number}[]=[];
  for(const dx of [-GROUND_MOSAIC_SIZE,0,GROUND_MOSAIC_SIZE])for(const dy of [-GROUND_MOSAIC_SIZE,0,GROUND_MOSAIC_SIZE]){
    const x=p.x+dx,y=p.y+dy;
    if(x+p.radius>0&&y+p.radius>0&&x-p.radius<GROUND_MOSAIC_SIZE&&y-p.radius<GROUND_MOSAIC_SIZE)out.push({x,y});
  }
  return out;
}
