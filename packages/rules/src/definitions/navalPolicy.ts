/**
 * Naval-only inter-island travel (naval random templates, 2026-10-17; assets-source/art/naval-random-v1/):
 * a scenario-level traversal policy that The Shattered Crown and The Serpent Straits carry in
 * their generated mission. A generated mission travels inside the match (`MatchState.customMission`),
 * so every save carries the policy too, and a reload can never bring back portals or play the map
 * without ships.
 *
 * What it means (audited 2026-10-17; the rules core has no other way across water):
 *  - ships are the only first access between islands: no portals, ferries (portal pairs), sluices
 *    that drain a channel into land, sandbars or bridges; the generator places none and the checks
 *    below refuse a mission or save that holds one, or whose policy claims `portals: true`;
 *  - hero ships must be on (`navalMovementV1`), so the AI plans voyages instead of land-only moves;
 *  - adventure spells: Divine Sight reveals information only; movement bonuses add points only;
 *    Recall returns to an OWNED town, never from a ship (resolvers in systems/magic.ts) — every owned
 *    town lies on an island the empire already reached (its start, or a town it captured by standing
 *    at the gate), so Recall never gives first access to a new island;
 *  - flying armies never fly on the adventure map (movement is by terrain; water is impassable on
 *    foot) — flight only matters inside battles;
 *  - a revealed map changes information, never passability; recruitment caravans travel by land.
 * Allied heroes and the AI obey the same rules: every move is an ordinary command.
 *
 * Owns: the policy record and its read-only checks. Does not own: generation (@pr/mapgen naval
 * templates) or ship rules (resolvers/naval.ts, systems/naval.ts).
 */
import type { SiteDefinition } from './world';

export const NAVAL_ONLY_POLICY_ID = 'naval_only_v1';

/** The reason shown wherever portals are locked for these maps. */
export const NAVAL_PORTAL_LOCK_REASON = 'Ships connect these islands.';

/** Site kinds that would move a hero across water or turn water into land (refused under the policy). */
export const NAVAL_POLICY_FORBIDDEN_SITE_KINDS: readonly SiteDefinition['kind']['type'][] = ['portal', 'sluice'];

/** Which generated template, version, seed and settings made the map (also part of the map hash). */
export interface NavalTemplateStamp {
  /** Random-map type ID (`shattered_crown`, `serpent_straits`). */
  readonly id: string;
  readonly version: number;
  /** Generator identity (`pr-naval-templates-1`). */
  readonly generator: string;
  readonly seed: number;
  /** Every setting that changes the map, in a stable order. */
  readonly settings: string;
  /** Which deterministic candidate passed (0-31; 32 = the reference-shaped fallback). */
  readonly candidate: number;
  /** True when the reference-shaped fallback topology was used. */
  readonly fallback: boolean;
}

export interface NavalTraversalPolicy {
  readonly id: typeof NAVAL_ONLY_POLICY_ID;
  /** Islands are first reached only by ship. */
  readonly interIslandTravel: 'ships_only';
  /** Portals are always off (a persisted `true` is refused, never silently accepted). */
  readonly portals: false;
  /** The scenario feature the map needs. */
  readonly requiredFeature: 'navalMovementV1';
  /** Shown with the locked portal option and in the help text. */
  readonly reason: string;
  readonly template: NavalTemplateStamp;
}

/**
 * Every way a mission (and the match's scenario features) breaks the naval-only policy, in plain
 * words (empty: none, or the mission carries no policy). Used by the generator's validation and by
 * the session before a save is loaded.
 */
export function navalPolicyIssues(
  mission: { readonly navalPolicy?: unknown; readonly sites: readonly SiteDefinition[] },
  features: { readonly navalMovementV1?: boolean } | undefined,
): string[] {
  const raw = mission.navalPolicy as Partial<Record<keyof NavalTraversalPolicy, unknown>> | undefined;
  if (raw === undefined) return [];
  const issues: string[] = [];
  if (!raw || typeof raw !== 'object') return ['The naval travel rule is damaged'];
  if (raw.id !== NAVAL_ONLY_POLICY_ID) issues.push(`Unknown naval travel rule ${String(raw.id)}`);
  if (raw.portals !== false) issues.push('Portals must stay off on a naval map: ships connect these islands');
  if (raw.interIslandTravel !== 'ships_only') issues.push('Islands must be reached by ship only');
  if (raw.requiredFeature !== 'navalMovementV1') issues.push('The naval travel rule must require hero ships');
  const t = raw.template as Partial<NavalTemplateStamp> | undefined;
  if (!t || typeof t !== 'object' || typeof t.id !== 'string' || typeof t.seed !== 'number' || typeof t.version !== 'number' || typeof t.generator !== 'string') issues.push('The naval map stamp is damaged');
  if (features?.navalMovementV1 !== true) issues.push('Hero ships are off, but this map is crossed by ship only');
  for (const s of mission.sites) {
    if (NAVAL_POLICY_FORBIDDEN_SITE_KINDS.includes(s.kind.type)) issues.push(`${s.name} (${s.kind.type}) would cross the sea without a ship`);
  }
  return issues;
}
