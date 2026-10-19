import type { SpellDefinition } from '@pr/rules';
/** Deliberate content tags, not a heuristic based on a spell's title or artwork. */
const TAGS: Readonly<Record<string, Pick<SpellDefinition, 'element' | 'delivery'>>> = {
  spark: { element: 'arcane', delivery: 'projectile' },
  lightning: { element: 'lightning', delivery: 'direct' },
  apollos_arrow: { element: 'solar', delivery: 'projectile' },
  ember_burst: { element: 'fire', delivery: 'area' },
  kitsune_fire: { element: 'fire', delivery: 'projectile' },
  wrath_of_sekhmet: { element: 'fire', delivery: 'direct' },
  thunderclap: { element: 'lightning', delivery: 'area' },
  raijin_drums: { element: 'lightning', delivery: 'area' },
  frost_breath: { element: 'cold', delivery: 'direct' },
  rain_of_tlaloc: { element: 'water', delivery: 'area' },
};
export function withSpellSemantics(spells: readonly SpellDefinition[]): SpellDefinition[] {
  return spells.map((s) => TAGS[s.id] ? { ...s, ...TAGS[s.id] } : s);
}
