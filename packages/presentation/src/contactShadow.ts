/**
 * Soft contact shadows (graphics quality Medium and High): a dark, blurred
 * disc on the ground under each battle figure and obstacle. Cheap — one shared
 * mesh drawn as instances with one small gradient texture — and independent of
 * the sun, so troops sit on the board instead of floating over it.
 */
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Scene } from '@babylonjs/core/scene';

/** The hidden source mesh (1 × 1 world unit, lying flat); place instances of it under figures. */
export function contactShadowSource(scene: Scene, opacity = 0.6): Mesh {
  const tex = new DynamicTexture('contact-shadow-tex', { width: 64, height: 64 }, scene, true);
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 31);
  g.addColorStop(0, `rgba(0,0,0,${opacity})`);
  g.addColorStop(0.5, `rgba(0,0,0,${opacity * 0.75})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.clearRect(0, 0, 64, 64);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  tex.hasAlpha = true;
  tex.update();
  const mat = new StandardMaterial('contact-shadow', scene);
  // The gradient's alpha channel is the shadow's strength (black otherwise).
  mat.opacityTexture = tex;
  mat.emissiveColor = new Color3(0, 0, 0);
  mat.diffuseColor = new Color3(0, 0, 0);
  mat.specularColor = new Color3(0, 0, 0);
  mat.disableLighting = true;
  mat.backFaceCulling = false;
  // Drawn after the opaque board and before the figures' own transparency; never writes depth.
  mat.disableDepthWrite = true;
  const src = MeshBuilder.CreateGround('contact-shadow-src', { width: 1, height: 1 }, scene);
  src.material = mat;
  src.isPickable = false;
  src.isVisible = false;
  return src;
}
