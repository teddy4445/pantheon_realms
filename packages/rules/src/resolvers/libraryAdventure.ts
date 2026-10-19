/** Shared adventure quotes; all counters are persisted on the hero. */
import type { ContentCatalog } from '../definitions/catalog';
import type { HeroState, MatchState } from '../state/match';
import { heroEffects } from './heroes';
import { navalRules } from '../definitions/naval';

export function libraryAdventureCost(catalog: ContentCatalog, state: MatchState, hero: HeroState, base: number): number {
  const casts = hero.libraryAdventure?.casts;
  const count = casts?.day === state.day ? casts.count : 0;
  const discount = Math.max(0, ...heroEffects(catalog, hero, state).filter((e) => e.type === 'adventure_cast_discount' && count < e.casts).map((e) => e.type === 'adventure_cast_discount' ? e.amount : 0));
  return discount ? Math.max(1, base - discount) : base;
}

export function heroSailCost(catalog: ContentCatalog, state: MatchState, hero: HeroState): number {
  const discounts = heroEffects(catalog, hero, state).filter((e) => e.type === 'adventure_sailing_discount');
  const percent = Math.min(30, discounts.reduce((n, e) => n + (e.type === 'adventure_sailing_discount' ? e.percent : 0), 0));
  return Math.max(1, Math.ceil(navalRules(catalog.rulesProfile).sailCost * (100 - percent) / 100));
}
