import type { NatureAsset, NatureRole } from './nature';

/** Reuse each painting only in suitable climates; these additions are for adventure maps. */
const variants: readonly [string, NatureRole, readonly string[]][] = [
  ['mountain-alpine','mountain',['high_pass','fjord','tundra']],
  ['mountain-sandstone','mountain',['desert','coast']],
  ['mountain-basalt','mountain',['temperate','autumn','jungle','moor','storm_plateau']],
  ['rocks-granite','rock',['temperate','coast','high_pass','fjord','tundra','storm_plateau']],
  ['rocks-moss','rock',['temperate','autumn','jungle','moor']],
  ['rocks-obsidian','rock',['desert','high_pass','storm_plateau','jungle']],
  ['tree-oak','canopy',['temperate','autumn','moor']],
  ['tree-cedar','canopy',['temperate','high_pass','fjord','storm_plateau']],
  ['tree-palm','canopy',['desert','jungle','coast']],
  ['tree-blossom','canopy',['temperate','coast']],
  ['flowers-meadow','groundcover',['temperate','autumn','coast','moor']],
  ['deadwood-ferns','deadwood',['temperate','autumn','jungle','moor','fjord']],
];
export const MAP_SCENERY_VARIANTS: readonly NatureAsset[] = variants.flatMap(([id,role,climates]) => climates.map(climate => ({
  id:`scenery.${id}`,role,climate,variant:4,description:id.replaceAll('-',' '),blocking:false,battleUse:'none',waterKinds:[],minWaterArea:0,minWaterClearance:0,
})));
