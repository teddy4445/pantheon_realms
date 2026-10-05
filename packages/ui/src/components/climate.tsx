/**
 * The battle climate chip (scenario feature `climateRules`, proposed 2026-10-04):
 * the weather's name with its icon (`icon.climate.<biome>`, a glyph until
 * delivered); the exact rule is the tooltip and the screen-reader text.
 */
import type { ClimateRuleDefinition } from '@pr/rules';
import { resolveAsset } from '../assets/manifest';
import { Icon, type IconName } from '../assets/icons';

const GLYPH: Record<string, IconName> = { moor: 'eye', coast: 'bow', jungle: 'bow', high_pass: 'bow', desert: 'speed', storm_plateau: 'speed', autumn: 'speed', fjord: 'defense', tundra: 'attack' };

export function ClimateChip({ climate, testId = 'battle-climate' }: { climate: Pick<ClimateRuleDefinition, 'id' | 'name' | 'summary'>; testId?: string }) {
  const url = resolveAsset(`icon.climate.${climate.id}`).url;
  return (
    <span className="chip chip--info climate-chip" title={climate.summary} tabIndex={0} data-testid={testId} data-climate={climate.id}>
      {url ? <img className="climate-chip__icon" src={url} alt="" draggable={false} /> : <Icon name={GLYPH[climate.id] ?? 'map'} className="climate-chip__icon" />}
      <span aria-hidden="true">{climate.name}</span>
      <span className="sr-only">{climate.summary}</span>
    </span>
  );
}
