import type { TownArchetypeDefinition, TownSlotPlacement } from '@pr/rules';
import { H3_CITY_LAYOUTS } from './h3Layouts';

/** Placement-only art update: retain every logical slot, chain and gameplay rule. */
export function withH3CityArt(town: TownArchetypeDefinition): TownArchetypeDefinition {
  const placement = (H3_CITY_LAYOUTS as Record<string, Record<string, TownSlotPlacement>>)[town.pantheonId];
  if (!placement) return town;
  return {
    ...town,
    sceneAspectRatio: 3 / 2,
    damagedBackgroundAssetId: `town.${town.pantheonId}.background.damaged`,
    hudAnchor: 'left',
    slots: town.slots.map(slot => {
      const frame = placement[slot.id];
      if (!frame) throw new Error(`Missing town art placement: ${town.pantheonId}/${slot.id}`);
      return { ...slot, placement: frame };
    }),
  };
}
