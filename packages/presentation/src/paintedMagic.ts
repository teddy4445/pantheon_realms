/** Generated painted poses carry the action; small material particles extend the aftermath. */
import { Container, Graphics, Sprite } from 'pixi.js';
import { PAINTED_MAGIC } from './paintedMagicData';
import { FX_PALETTE } from './fxLooks';
import { loadFile, loadStrip } from './textures';
import { graphicsProfile } from './graphics';
import { linear, type TweenPlayer } from './tween';
import { magicPoseAt, type MagicParticle, type PaintedMagicRecipe } from './paintedMagicTypes';

interface Point { readonly x: number; readonly y: number }
interface Target extends Point { readonly width: number; readonly height: number; readonly facing: 1 | -1 }
const TAU = Math.PI * 2;

/** Look up a content ID; undefined lets the caller use its standard FX fallback. */
export function paintedMagicRecipe(id: string | undefined): PaintedMagicRecipe | undefined {
  return id ? PAINTED_MAGIC[id] : undefined;
}
/** Best-effort warmup accepts either a content ID or an fx.spell/fx.miracle key.
 * Missing optional artwork must not interrupt a command or battle playback. */
export function preloadPaintedMagic(id: string): void {
  const key = id.replace(/^fx\.(spell|miracle)\./, '');
  const recipe = PAINTED_MAGIC[key];
  if (recipe && graphicsProfile().effects !== 'simple') {
    void loadStrip(recipe.strip).catch(() => null);
    void loadFile(recipe.icon, { urgent: true }).catch(() => null);
  }
}

const physicalColors: Partial<Record<MagicParticle, readonly number[]>> = {
  metal: [0xd4a947, 0xffe7a0, 0x876238], stone: [0x8f8272, 0xc2b298, 0x675b4c],
  wood: [0x775134, 0xb18b50, 0x543c2c], leaf: [0x7e9b3a, 0xb9b756, 0x577131],
  feather: [0x6c5b84, 0xb1a0c1, 0x383341], paper: [0xf3dfaf, 0xd1ba8d, 0xa74a3d],
  sand: [0xc99e5e, 0xf1d292, 0x927344], snow: [0xe1ebed, 0xb1d7e1, 0xffffff],
};
const floating = new Set<MagicParticle>(['feather', 'paper', 'leaf', 'snow']);
const glowing = new Set<MagicParticle>(['electric', 'ember', 'lava', 'star', 'wisp']);

/** Unit-space paths make material behavior independent of frame rate and battle scale. */
export function magicParticlePosition(kind: MagicParticle, k: number, i: number): Point {
  const phase = (i * .61803398875 % 1) * TAU;
  const force = .45 + (i * .381966 % 1) * .8;
  if (kind === 'gravity') {
    const r = (1 - k) * 1.25;
    return { x: Math.cos(phase + k * 5) * r, y: -.65 + Math.sin(phase + k * 5) * r * .5 };
  }
  if (floating.has(kind)) return { x: Math.cos(phase) * .55 + Math.sin(k * 5 + phase) * .35, y: -1.3 + k * 1.5 };
  if (kind === 'wisp' || kind === 'star') return { x: Math.cos(phase + k * 4) * (.3 + k * .65), y: -.5 - k * 1.2 + Math.sin(phase + k * 4) * .2 };
  if (kind === 'electric') return { x: Math.cos(phase) * k * 1.35, y: -.45 + Math.sin(phase) * k * .7 };
  if (kind === 'ember') return { x: Math.cos(phase) * .5 + Math.sin(k * 4 + phase) * .25, y: -.15 - k * 1.4 * force };
  if (kind === 'frost') return { x: -1 + k * 2.2, y: -.8 + Math.sin(phase + k * 3) * .35 + k * .4 };
  return { x: Math.cos(phase) * k * force * 1.4, y: -.15 - Math.sin(Math.PI * k) * force + k * k * .25 };
}

function particleShape(kind: MagicParticle, color: number): Graphics {
  const g = new Graphics();
  switch (kind) {
    case 'feather':
      g.ellipse(0, 0, 1.7, 5).fill(color).moveTo(0, -5).lineTo(.5, 5).stroke({ color: 0xdfd3d4, width: .5, alpha: .6 }); break;
    case 'leaf':
      g.poly([0, -4, 2.5, -1, 1, 3, -2, 1]).fill(color); break;
    case 'paper':
      g.poly([-2, -3, 3, -1, 1, 4, -2, 2]).fill(color); break;
    case 'electric':
      g.moveTo(-1, -5).lineTo(1, -1).lineTo(-1, 1).lineTo(2, 5).stroke({ color, width: 1 }); break;
    case 'splash': case 'venom':
      g.ellipse(0, 0, 1.5, 2.8).fill({ color, alpha: .8 }).circle(-.4, -1, .6).fill(0xffffff); break;
    case 'glass': case 'frost': case 'metal':
      g.poly([0, -4, 2, 0, 0, 3, -1.5, 1]).fill(color).moveTo(0, -4).lineTo(0, 3).stroke({ color: 0xffffff, width: .55, alpha: .7 }); break;
    case 'wood':
      g.poly([-1, -4, 2, -3, 1, 4, -1, 2]).fill(color); break;
    case 'stone': case 'gravity': case 'lava':
      g.poly([-2, -2, 1, -3, 3, 0, 1, 2, -2, 1]).fill(color); break;
    case 'star':
      g.poly([0, -4, 1, -1, 4, 0, 1, 1, 0, 4, -1, 1, -4, 0, -1, -1]).fill(color); break;
    default: g.circle(0, 0, kind === 'sand' ? 1 : 1.8).fill(color);
  }
  if (glowing.has(kind)) g.blendMode = 'add';
  return g;
}

/** A restrained painted crest appears at the caster; the target sheet owns all attack motion. */
export async function playPaintedMagicCast(recipe: PaintedMagicRecipe, at: Point, layer: Container, tweens: TweenPlayer, u: number): Promise<void> {
  if (layer.destroyed || tweens.speed === 0) return;
  const texture = await loadFile(recipe.icon, { urgent: true }).catch(() => null);
  if (!texture || layer.destroyed || tweens.speed === 0) return;
  const s = new Sprite(texture);
  s.anchor.set(.5, .8);
  s.scale.set(u * 1.05 / texture.width);
  layer.addChild(s);
  try {
    await tweens.tween(320, t => {
      if (s.destroyed) return;
      s.position.set(at.x, at.y - u * .25 * t);
      s.alpha = Math.min(1, t * 6) * Math.min(1, (1 - t) * 4) * .88;
    }, linear);
  } finally { if (!s.destroyed) s.destroy(); }
}

/**
 * Play one state-independent impact. `at` is a scene-space anchor and `u` is the
 * scene's unit scale; recipe sizes and particle paths are normalized to it.
 * Full effects crossfade adjacent painted poses. Simple effects use a short
 * fixed pose with no particle pool. Disposal after awaits and in finally keeps
 * interrupted scene transitions safe; combat results were already decided.
 */
export async function playPaintedMagic(recipe: PaintedMagicRecipe, at: Target, layer: Container, tweens: TweenPlayer, u: number): Promise<void> {
  if (layer.destroyed || tweens.speed === 0) return;
  const frames = await loadStrip(recipe.strip).catch(() => null);
  if (!frames?.length || layer.destroyed || tweens.speed === 0) return;
  const simple = graphicsProfile().effects === 'simple';
  const holder = new Container();
  holder.label = 'painted-magic:' + recipe.name;
  holder.position.set(at.x, at.y);
  const scale = u * recipe.size * Math.min(1.35, at.width) / recipe.strip.frameWidth;
  const a = new Sprite(frames[0]), b = new Sprite(frames[0]);
  for (const s of [a, b]) { s.anchor.set(recipe.strip.anchor[0], recipe.strip.anchor[1]); s.scale.set(scale); }
  // Normal alpha preserves painted dark rock, feathers and shadows instead of bleaching them out.
  const shadow = new Graphics().ellipse(0, 1, u * .6, u * .17).fill({ color: 0x191811, alpha: .2 });
  holder.addChild(shadow, a, b);
  const count = simple ? 0 : graphicsProfile().quality === 'high' ? (recipe.miracle ? 28 : 18) : 10;
  const colors = physicalColors[recipe.particle] ?? FX_PALETTE[recipe.school];
  const particles = Array.from({ length: count }, (_, i) => {
    const g = particleShape(recipe.particle, colors[i % colors.length]!);
    g.visible = false;
    holder.addChild(g);
    return g;
  });
  layer.addChild(holder);
  try {
    await tweens.tween(simple ? 360 : recipe.durationMs, t => {
      if (holder.destroyed) return;
      const pose = simple ? { frame: 3, next: 3, mix: 0 } : magicPoseAt(t);
      a.texture = frames[pose.frame]!; b.texture = frames[pose.next]!;
      const envelope = Math.min(1, t * 12) * Math.min(1, (1 - t) * 7);
      a.alpha = (1 - pose.mix) * envelope; b.alpha = pose.mix * envelope;
      shadow.alpha = Math.sin(t * Math.PI) * (recipe.particle === 'gravity' ? .8 : .45);
      particles.forEach((g, i) => {
        const delay = recipe.particle === 'gravity' ? .05 : .37 + (i % 5) * .035;
        const k = (t - delay) / (1 - delay);
        g.visible = k > 0 && k < 1;
        if (!g.visible) return;
        const p = magicParticlePosition(recipe.particle, k, i);
        const range = u * (recipe.miracle ? 1.45 : 1);
        g.position.set(p.x * range, p.y * range);
        g.alpha = Math.min(1, k * 9) * (1 - k) * .8;
        g.rotation = floating.has(recipe.particle) ? Math.sin(k * 6 + i) * .8 : k * (i % 2 ? 4 : -4);
        const s = u / 55 * (recipe.miracle ? 1.2 : 1);
        g.scale.set(s * (floating.has(recipe.particle) ? .3 + .7 * Math.abs(Math.cos(k * 5 + i)) : 1), s);
      });
    }, linear);
  } finally { if (!holder.destroyed) holder.destroy({ children: true }); }
}
