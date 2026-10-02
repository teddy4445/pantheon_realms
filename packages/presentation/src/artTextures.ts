/**
 * Painted ground and sky textures (Brief 2) for the 3D scenes. Loaded from the
 * game's own runtime files (`assets-runtime/art/`), mipmapped with trilinear and
 * anisotropic filtering so the fixed angled camera does not shimmer.
 */
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import type { Scene } from '@babylonjs/core/scene';
import type { EnvironmentArt } from './environmentArt';

export type ArtWrap = 'repeat' | 'mirror' | 'clamp';

const ADDRESS: Record<ArtWrap, number> = {
  repeat: Texture.WRAP_ADDRESSMODE,
  mirror: Texture.MIRROR_ADDRESSMODE,
  clamp: Texture.CLAMP_ADDRESSMODE,
};

/**
 * Start loading a painted texture; `onReady` runs once it has decoded (the scene
 * keeps its procedural colours until then, and for good if it fails).
 */
export function loadArtTexture(scene: Scene, art: EnvironmentArt, wrapU: ArtWrap, wrapV: ArtWrap, onReady: (t: Texture) => void): Texture {
  let tex: Texture | null = null;
  tex = new Texture(
    art.url,
    scene,
    false,
    true,
    Texture.TRILINEAR_SAMPLINGMODE,
    () => {
      if (tex && !scene.isDisposed) onReady(tex);
    },
    () => {
      // Missing or undecodable file: keep the procedural look.
    },
  );
  tex.wrapU = ADDRESS[wrapU];
  tex.wrapV = ADDRESS[wrapV];
  tex.anisotropicFilteringLevel = 8;
  return tex;
}

/** A lit ground material: the texture multiplied by the mesh's vertex colours (fog of war, tints). */
export function groundMaterial(name: string, scene: Scene, tex: Texture): StandardMaterial {
  const m = new StandardMaterial(name, scene);
  m.diffuseTexture = tex;
  m.specularColor = new Color3(0.04, 0.04, 0.04);
  m.backFaceCulling = false;
  return m;
}

/** An unlit backdrop material (sky): shows the painting's own light. */
export function backdropMaterial(name: string, scene: Scene, tex: Texture): StandardMaterial {
  const m = new StandardMaterial(name, scene);
  m.emissiveTexture = tex;
  m.diffuseColor = new Color3(0, 0, 0);
  m.specularColor = new Color3(0, 0, 0);
  m.disableLighting = true;
  m.backFaceCulling = true;
  return m;
}
