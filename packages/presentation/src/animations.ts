/**
 * Placeholder animation vocabulary for creature proxies:
 * idle, move, melee, ranged, defend, hit, defeat, victory.
 *
 * Procedural transforms on primitive proxies, or — when a figure carries a GLB
 * rig — the manifest-bound animation group for the same state name (missing
 * clips fall back to the procedural motion on the model root). Playback happens
 * AFTER the rules have committed a result and never reports back into game
 * state, so a skipped or instant playback leaves the outcome identical.
 */
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { CreatureProxy } from './proxies';
import type { ModelRig } from './models';
import { easeOut, linear, type TweenPlayer } from './tween';

export const ANIMATION_STATES = ['idle', 'move', 'melee', 'ranged', 'defend', 'hit', 'defeat', 'victory'] as const;
export type AnimationState = (typeof ANIMATION_STATES)[number];

export interface Figure {
  readonly proxy: CreatureProxy;
  /** GLB rig when a model replaced the proxy (proxy.root is then the rig root). */
  readonly rig?: ModelRig;
  /** Rest local position inside its stack group. */
  readonly base: { x: number; y: number; z: number };
  seed: number;
}

function setVisibility(f: Figure, v: number): void {
  for (const m of f.proxy.meshes) m.visibility = v;
}

function resetFigure(f: Figure): void {
  f.rig?.loop('idle');
  const r = f.proxy.root;
  r.position.set(f.base.x, f.base.y, f.base.z);
  r.rotation.x = 0;
  r.rotation.z = 0;
  r.scaling.set(1, 1, 1);
  f.proxy.strike.rotation.set(0, 0, 0);
  if (f.proxy.shield) f.proxy.shield.rotation.set(0, 0, 0);
  setVisibility(f, 1);
}

/** Continuous idle breathing, applied every frame by the owning controller. */
export function applyIdle(f: Figure, timeMs: number): void {
  if (f.rig?.has('idle')) return; // the idle clip loops on its own
  const t = timeMs / 1000 + f.seed;
  f.proxy.root.position.y = f.base.y + Math.sin(t * 2.1) * 0.015;
  f.proxy.strike.rotation.z = Math.sin(t * 1.3) * 0.04;
}

/**
 * Play one state on a set of figures. `forward` is +1 when the group faces +X in
 * world space, −1 when it faces −X (the figures are children of a rotated group,
 * so local +X is always "forward").
 */
export async function playState(tw: TweenPlayer, figures: readonly Figure[], state: AnimationState, nominalMs = 1): Promise<void> {
  const clipped = figures.filter((f) => f.rig?.has(state));
  const rest = figures.filter((f) => !f.rig?.has(state));
  const jobs: Promise<void>[] = clipped.map(async (f) => {
    await f.rig!.playOnce(state, tw, nominalMs);
    if (state !== 'defeat') f.rig!.loop('idle');
  });
  if (rest.length > 0 || clipped.length === 0) jobs.push(proceduralState(tw, rest, state, nominalMs));
  await Promise.all(jobs);
}

async function proceduralState(tw: TweenPlayer, figures: readonly Figure[], state: AnimationState, nominalMs: number): Promise<void> {
  const k = nominalMs;
  switch (state) {
    case 'idle':
      await tw.wait(600 * k);
      return;
    case 'move':
      await tw.tween(
        520 * k,
        (t) => {
          for (const f of figures) {
            f.proxy.root.position.y = f.base.y + Math.abs(Math.sin(t * Math.PI * 3)) * 0.12;
            f.proxy.root.rotation.z = Math.sin(t * Math.PI * 6) * 0.05;
          }
        },
        linear,
      );
      figures.forEach(resetFigure);
      return;
    case 'melee':
      await tw.tween(200 * k, (t) => {
        for (const f of figures) {
          f.proxy.root.position.x = f.base.x + t * 0.32;
          f.proxy.strike.rotation.z = t * 1.1;
        }
      });
      await tw.tween(
        140 * k,
        (t) => {
          for (const f of figures) f.proxy.strike.rotation.z = 1.1 - t * 2.2;
        },
        easeOut,
      );
      await tw.tween(220 * k, (t) => {
        for (const f of figures) {
          f.proxy.root.position.x = f.base.x + 0.32 * (1 - t);
          f.proxy.strike.rotation.z = -1.1 * (1 - t);
        }
      });
      figures.forEach(resetFigure);
      return;
    case 'ranged':
      await tw.tween(260 * k, (t) => {
        for (const f of figures) {
          f.proxy.strike.rotation.z = t * 1.4;
          f.proxy.root.position.x = f.base.x - t * 0.06;
        }
      });
      await tw.tween(
        160 * k,
        (t) => {
          for (const f of figures) f.proxy.strike.rotation.z = 1.4 - t * 2.0;
        },
        easeOut,
      );
      await tw.tween(200 * k, (t) => {
        for (const f of figures) {
          f.proxy.strike.rotation.z = -0.6 * (1 - t);
          f.proxy.root.position.x = f.base.x - 0.06 * (1 - t);
        }
      });
      figures.forEach(resetFigure);
      return;
    case 'defend':
      await tw.tween(260 * k, (t) => {
        for (const f of figures) {
          f.proxy.root.scaling.y = 1 - t * 0.08;
          if (f.proxy.shield) f.proxy.shield.rotation.y = -t * 0.5;
          f.proxy.root.position.x = f.base.x - t * 0.05;
        }
      });
      await tw.wait(360 * k);
      await tw.tween(220 * k, (t) => {
        for (const f of figures) {
          f.proxy.root.scaling.y = 0.92 + t * 0.08;
          if (f.proxy.shield) f.proxy.shield.rotation.y = -0.5 * (1 - t);
          f.proxy.root.position.x = f.base.x - 0.05 * (1 - t);
        }
      });
      figures.forEach(resetFigure);
      return;
    case 'hit':
      await tw.tween(
        320 * k,
        (t) => {
          const kick = Math.sin(t * Math.PI);
          for (const f of figures) {
            f.proxy.root.position.x = f.base.x - kick * 0.14;
            f.proxy.root.rotation.z = kick * 0.18;
            setVisibility(f, t < 0.5 ? (Math.floor(t * 12) % 2 === 0 ? 0.35 : 1) : 1);
          }
        },
        linear,
      );
      figures.forEach(resetFigure);
      return;
    case 'defeat':
      await tw.tween(620 * k, (t) => {
        for (const f of figures) {
          f.proxy.root.rotation.z = t * (Math.PI / 2.1);
          f.proxy.root.position.y = f.base.y - t * 0.25;
          setVisibility(f, 1 - t * 0.85);
        }
      });
      return;
    case 'victory':
      await tw.tween(
        700 * k,
        (t) => {
          for (const f of figures) {
            f.proxy.root.position.y = f.base.y + Math.abs(Math.sin(t * Math.PI * 2)) * 0.22;
            f.proxy.strike.rotation.z = Math.sin(t * Math.PI) * 1.6;
          }
        },
        linear,
      );
      figures.forEach(resetFigure);
      return;
  }
}

/** Restore a figure after an interrupted or looping playback. */
export function restFigure(f: Figure): void {
  resetFigure(f);
}

/** Face a group toward +X (1) or −X (−1). */
export function faceGroup(group: TransformNode, facing: 1 | -1): void {
  group.rotation.y = facing === 1 ? 0 : Math.PI;
}
