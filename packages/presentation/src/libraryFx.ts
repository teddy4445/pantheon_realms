/** Data-only material recipes; raster sheets contain independent elements, not frames. */
export interface LibraryFxMaterial { readonly url: string; readonly rect: readonly [number, number, number, number] }
export interface LibraryFxRecipe { readonly materials: readonly LibraryFxMaterial[]; readonly durationMs: number; readonly maxParticles: number }
let recipes: Readonly<Record<string, LibraryFxRecipe>> = {};
export function installLibraryFx(value: Readonly<Record<string, LibraryFxRecipe>>): void { recipes = value; }
export function libraryFxRecipe(assetId?: string): LibraryFxRecipe | null {
  const match = assetId?.match(/^fx\.(?:spell|miracle|artifact)\.(.+?)(?:\.(cast|travel|impact|area|screen|arrive|depart))?$/);
  return match ? recipes[match[1]!] ?? null : null;
}
