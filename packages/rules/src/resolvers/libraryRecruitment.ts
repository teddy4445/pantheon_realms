import type { ContentCatalog } from '../definitions/catalog';
import type { MatchState } from '../state/match';
import { canAfford, type ResourceBundle, scaleResources } from '../core/resources';
import { heroEffects } from './heroes';
import { heroInTown } from './world';

export interface LibraryRecruitSaving { percent: number; cap: number }
export function townRelicRecruitment(catalog: ContentCatalog, state: MatchState, playerId: string, townId: string, creatureId: string): LibraryRecruitSaving | undefined {
  if (state.players[playerId]?.libraryEconomy?.recruitPurchaseDay === state.day) return;
  const tier = catalog.families[catalog.creatures[creatureId]?.familyId ?? '']?.tier ?? 99;
  const offers = Object.values(state.heroes).filter((h) => h.ownerId === playerId && h.status === 'active' && heroInTown(catalog, state, h, townId)).flatMap((h) => heroEffects(catalog, h, state)).filter((e) => e.type === 'adventure_recruit_discount' && tier <= e.maxTier);
  const best = offers.filter((e) => e.type === 'adventure_recruit_discount').sort((a, b) => b.percent - a.percent || b.cap - a.cap)[0];
  return best ? { percent: best.percent, cap: best.cap } : undefined;
}
export function discountedRecruitTotal(unit: ResourceBundle, qty: number, saving?: LibraryRecruitSaving): ResourceBundle {
  const total = scaleResources(unit, qty);
  return saving ? { ...total, gold: total.gold - Math.min(saving.cap, Math.floor(total.gold * saving.percent / 100)) } : total;
}
/** A capped order discount is nonlinear: unit-price division cannot quote MAX correctly. */
export function maxDiscountedRecruit(wallet: ResourceBundle, unit: ResourceBundle, available: number, saving?: LibraryRecruitSaving): number {
  let lo = 0, hi = Math.max(0, Math.floor(available));
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (canAfford(wallet, discountedRecruitTotal(unit, mid, saving))) lo = mid; else hi = mid - 1;
  }
  return lo;
}
