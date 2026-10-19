# Mythic Library II — shared rules
Design baseline: audited local game 1.6.0 on 2026-10-18. All new numbers are proposed and unplaytested. This document takes precedence over shorthand descriptions in the catalog.

## Costs, timing and access
- P = existing effective commander casting Power, clamped >= 0. Percent changes aggregate before one final floor; movement costs round up, minimum 1.
- Battle spells require the existing spellbook, knowledge and tier prerequisites. Active artifacts and these blessings require a live commander but no spellbook. All NEW battle activations check and consume side.castThisRound. A creature ability still uses its normal action.
- These 12 blessings are Favor interventions, not new gods or permanent dedication perks. Share player.interventionWeek: ONE intervention per player per world week across old and new miracles. Respect scenario.features.interventions. Additional listed per-battle/cooldown limits do not create extra allowances.
- Unlock a blessing only if requiredGodId matches player.pantheon.patronGodId or a committed minorGodIds entry, and pantheon matches. A town's dedication alone does not unlock it. Existing intervention behavior remains unless separately reviewed; do not silently change all old miracles' action costs.
- Quote, validate, pay and mutate atomically. Invalid targets/cancelled previews spend nothing. Server/rules revalidate after the UI quote.
- An N-round effect cast in R expires after end-of-round effects of R+N-1. 'Next activation' means the next activation begun after application: waiting does not consume it; defending or losing that activation to a disable does. 'End of following round' = end of R+1.
- Adventure durations expire before the stated dawn's income/refresh. Daily counters reset at dawn, weekly counters at the actual world-week boundary. Persist all of them across saves.

## Restrictions and combinations
- Mind restrictions respect mind immunity. Root, ranged-lock and creature-spell silence are separate typed restrictions. After enduring an activation under one, grant immunity to that SAME category through the end of the next activation. Do not refresh-chain it. Silence affects spell-tagged creature abilities, not commanders or physical abilities.
- Movement: apply ONE strongest surcharge exemption for a step, then aggregate applicable percentage discounts, capped at 30%. Never remove base cost with a surcharge waiver. Final cost >= 1. Individual daily caps/quotas still apply. No equip/transfer reset. No new movement on equip.
- Preserve planned routes between days. Requote the next step after costs or terrain change. Stop with a reason if invalid; retain the destination. No fog bypass, free embark, closed-gate crossing, chapter-mask bypass or illegal water landing.
- Total elemental spell reduction including existing effects: cap 50%; ranged physical: cap 40%; generic: cap 40%. If categories overlap use the strongest applicable percent, not multiplication. Then barriers absorb remaining damage, oldest application first. Typed barriers only absorb matching damage.
- If the current game already enforces a stricter cap, keep that cap and update tooltip values. Do not raise global caps implicitly.
- This pack's extra physical damage percentages cap at +30% per hit. Spell/heal amplification from this pack caps at +30%, followed by listed per-source HP caps. Same-hook stat buffs use strongest value, not sum. Reflected/secondary damage cannot recursively proc this pack.
- Front-creature healing cannot resurrect. Post-battle recovery combines with existing recovery but caps at 15% of eligible original living losses, floored, or the existing lower cap. Require at least one permanent survivor. Exclude undead, constructs, summons, illusions, retreat and surrender.
- Battle quotas bind to original stack lineage and the hero, not equipped item instance. Splitting/merging/loading/transferring cannot refill charges. Duplicate artifacts never stack the same effect. Per-player gold-savings and ring-growth quotas persist separately.
- Strongest-undead target ties: total HP descending, then stable stack ID ascending. Simultaneous army-wide barrier damage resolves in stable stack ID order. No client order dependence.

## Complex effects: required implementation contracts
### Door of the Duat
Track temporary returned HP/bodies separately from permanent survivors. Damage consumes temporary HP first. At expiry remove only remaining temporary HP and its bodies, never permanent survivors. A stack with no permanent survivors vanishes. No temporary-body XP, death rewards, recovery or resurrection chains. Returning an entirely destroyed stack requires its original footprint to be free and legal. Permanent-army defeat resolves immediately; temporary bodies cannot prolong a lost battle.

### Xolotl's Twin
Use existing source-creature artwork with cyan translucency and an ILLUSION badge. Snapshot source creature/type and physical attack at cast. Total HP 1; 25% physical damage; no retaliation, creature abilities, artifact proc chains, casualties, ownership, loot or XP. One active per side. Remove at expiry, dispel or battle end. Reuse existing art; no additional creature sheet is needed.

### Repositioning and barriers
Validate full footprints, occupancy, rooted/anchored status, terrain eligibility, deployment zones and authored partitions. Aether Step cannot cross a closed siege-wall or quest partition. Temporary flight does not permit ending on water or occupied walls. Swap must validate BOTH destinations before either unit moves.
Glass Bulwark: reject placement disconnecting any previously mutually reachable opposing ground pair or sealing a mandatory lane/sole boarding bridge. Rebuild pathfinding on creation/expiry. Flyers pass over but cannot land. The sprite does not define collision.

### Reservations, deliveries and ship calls
A dwelling reservation reserves stock, not payment or army capacity. Release on expiry, hero death, owner loss or capture. Never increase stock.
Courier Sigil escrows one non-quest backpack artifact at commit; no equipped artifact. Deliver at next dawn only if recipient hero and destination town are still active/owned. Otherwise return to active sender backpack; if unavailable use an owned-town delivery stash and explicit log. If no owned town remains, keep escrow attached to player until elimination resolution; never duplicate or silently destroy.
Boatcall moves an actual owned empty boat along a fully known legal water path <=8 steps. It cannot create a vessel, carry troops, cross land, relocate an enemy ship or evade a blocked channel.
Safe Landing leaves min(pre-disembark movement, 25% daily budget), so it never creates movement. It cannot override a hostile or invalid landing.

## Learning, loot and scope
- Five new spells per pantheon enter native tier-appropriate Sanctum pools. Ten general spells enter shared pools. Cross-pantheon faction learning only through explicitly authored rare scrolls.
- Add 40 artifacts to loot/shop/reward pools; don't replace old IDs. Pantheon is an artifact's lore identity, not an equip restriction. Use existing slot and rarity enums. goldValue is indicative shop value, not an unconditional sell/refund promise.
- Start proposed relative loot weights: treasure 8, minor 5, major 2, relic 1. Rare relics must not be guaranteed starting gear. Keep authored campaign rewards/progression unless deliberately updated.
- Enable new content through a proposed mythicLibraryV2 scenario/content flag. Preserve old saves with optional state defaults. Do not silently substitute generic buffs for unsupported hooks.
- Campaign battles remain manual: NO automatic battle resolution. No movement, scouting or spell may bypass chapter bounds, keys, gated encounters or story events.

## UI and effects
- Use committed rules events for VFX. Cosmetics cannot change combat outcome, path costs, timing or replay state.
- Effects last 0.35–0.9 seconds; no forced camera rotation or shaking. Reduced motion shows a static icon/outline for <=0.25 seconds and no trails.
- Show precise costs, duration, charges, target and incompatibilities in tooltips. No hidden discounts or failure after payment.
- Balance-test pick rates, travel saved, losses prevented, resource savings and battle length. Art completion is not proof of balance or engine integration.

