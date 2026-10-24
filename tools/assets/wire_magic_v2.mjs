import { readFile, writeFile } from 'node:fs/promises';
const plans = JSON.parse(await readFile('assets-source/expansion-magic-v2/plan.json', 'utf8'));
const lookPath = 'packages/presentation/src/expansionLooks.ts';
const old = await readFile(lookPath, 'utf8');
const looks = JSON.parse(old.slice(old.indexOf('= {') + 2).trim().replace(/;$/, ''));
const sounds = { water: 'water', frost: 'frost', shadow: 'shadow', sun: 'holy', swarm: 'swarm', earth: 'smite', nature: 'nature', fire: 'fire', rage: 'fire', bless: 'bless', silver: 'strike', fae: 'reveal', jade: 'nature', obsidian: 'fire', foxfire: 'fire' };
for (const p of plans) {
  const look = looks[p.id];
  delete look.signature;
  Object.assign(look, { magicArt: p.id, school: p.school, travel: 'none', screen: 'none', sound: sounds[p.school] ?? look.sound });
}
await writeFile(lookPath, `import type { FxLook } from './fxLooks';\nexport const EXPANSION_LOOKS: Readonly<Record<string, FxLook>> = ${JSON.stringify(looks, null, 2)};\n`);
async function edit(path, fn) { const before = await readFile(path, 'utf8'); await writeFile(path, fn(before)); }
await edit('packages/presentation/src/fxLooks.ts', s => s.replace('readonly signature?: number;', 'readonly magicArt?: string;'));
await edit('packages/presentation/src/fx.ts', s => {
  if (!s.includes("from './paintedMagic'")) s = s.replace("import { libraryFxRecipe }", "import { paintedMagicRecipe, preloadPaintedMagic, playPaintedMagicCast, playPaintedMagic } from './paintedMagic';\nimport { libraryFxRecipe }");
  if (!s.includes('preloadPaintedMagic(id);')) s = s.replace("    for (const p of phases) {", "    preloadPaintedMagic(id);\n    for (const p of phases) {");
  if (!s.includes('playPaintedMagicCast(recipe')) s = s.replace('async cast(look: FxLook, at: Pt, id?: string): Promise<void> {', 'async cast(look: FxLook, at: Pt, id?: string): Promise<void> {\n    const recipe = paintedMagicRecipe(look.magicArt);\n    if (recipe) return playPaintedMagicCast(recipe, at, this.layer, this.tweens, this.u);');
  const begin = s.indexOf('    if (look.signature) {');
  if (begin >= 0) { const end = s.indexOf('    if (await this.painted(id, at, at.width))', begin); if (end < 0) throw Error('Cannot locate old signature block'); s = s.slice(0, begin) + s.slice(end); }
  if (!s.includes('playPaintedMagic(recipe')) s = s.replace('async impact(look: FxLook, at: FxTarget, id?: string): Promise<void> {', 'async impact(look: FxLook, at: FxTarget, id?: string): Promise<void> {\n    const recipe = paintedMagicRecipe(look.magicArt);\n    if (recipe) return playPaintedMagic(recipe, at, this.layer, this.tweens, this.u);');
  return s;
});
await edit('packages/ui/src/assets/manifest.ts', s => s.replace('expansion-magic-v1/icons.json', 'expansion-magic-v2/icons.json').replace('Procedural spell sigils, October 2026', 'Painted magic icons generated with built-in imagegen, October 2026'));
await edit('tools/check-boundaries.mjs', s => s.replace('expansion-magic-v1/icons.json', 'expansion-magic-v2/icons.json'));
console.log('Wired painted icons and distinct animation sheets into existing spell/miracle playback.');
