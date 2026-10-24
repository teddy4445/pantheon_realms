import { expect,it } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { templeBanner } from '../src/assets/manifest';
import { spriteManifest } from '@pr/presentation/core';
import { SCENERY_EXPANSION } from '../../presentation/src/sceneryExpansion';
import { mapFlagId,MAP_FLAG_COLORS } from '../../presentation/src/mapFlagStyle';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
it('registers every delivered cutout and every temple banner as a local runtime asset',()=>{
 const ids=[...new Set(SCENERY_EXPANSION.map(a=>a.id)),...Object.values(MAP_FLAG_COLORS).flatMap(c=>[mapFlagId(c,'square'),mapFlagId(c,'pennant')])];
 expect(ids).toHaveLength(64);
 for(const id of ids){const def=spriteManifest().decor[id]!;expect(def,id).toBeTruthy();expect(existsSync(path.join(root,'assets-runtime',def.file))).toBe(true);expect(def.anchor[1]).toBeGreaterThan(.9);}
 for(const p of ['greek','norse','egyptian','japanese','celtic','mesoamerican'])expect(existsSync(path.join(root,'assets-runtime',templeBanner(p)!.slice(2)))).toBe(true);
});
