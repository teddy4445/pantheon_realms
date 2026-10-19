/**
 * Coastal sites and sea salvage (sea-map objects kit of 2026-10-17; docs/sea-sites-v1/): the terms in
 * force, as data. The values are the kit's proposed interaction contracts and are unplaytested; tune
 * them here, never in code. The rules read only the numbers stored on each generated or compiled
 * site, so changing a value here changes new maps only (a saved map keeps its own).
 *
 *  - coastal watchtower sight: 6 adventure hexes;
 *  - Explore at a wreck: 100 movement points (and needs at least that many);
 *  - floating salvage: 3–6 Wood, 3–6 Stone or 250–500 Gold, drawn once per pickup when the map is made;
 *  - wreck outcomes: 50 % abandoned cargo (500 Gold + 4 Wood), 40 % guarded salvage (1,000 Gold + 8 Wood;
 *    the kit's 14 Brigands + 4 Brigand Cutthroats at normal guard strength), 10 % rare cache (750 Gold +
 *    one existing minor artifact; Brigand Cutthroats and Sling Masters, twice the value) — guards scaled by
 *    the map's guard strength, existing humanoid neutrals only (no new art, no sea creatures).
 */
import { PROPOSED_SEA_SITE_POLICY, type SeaSitePolicy } from '@pr/rules';

export const SEA_SITE_POLICY: SeaSitePolicy = PROPOSED_SEA_SITE_POLICY;
