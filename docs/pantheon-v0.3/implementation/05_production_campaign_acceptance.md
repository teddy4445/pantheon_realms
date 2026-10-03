# Production and Campaign Acceptance Plan

**Status:** P - future executable/manual acceptance tests. These 40 cases were specified, not run against a game in this documentation pass. Current document checks are recorded separately in [the validation report](06_documentation_validation_v0_3.md).

## Architecture and offline

| ID | Test | Expected evidence |
| --- | --- | --- |
| QA-01 | Cold offline launch | Install on a clean test profile, disconnect networking, open menu/settings/bestiary and start every mission; no required remote request. |
| QA-02 | Full offline campaign | Finish all missions against local AI, save, relaunch and continue with networking disabled. |
| QA-03 | Platform parity | Same rules/content/seed/commands yield the same canonical state in the browser and packaged desktop. |
| QA-04 | No forbidden dependencies | Rules/AI/mapgen/campaign imports contain no React, PixiJS, Electron or browser-storage code. |
| QA-05 | Privileged boundary | Reject unknown IPC, invalid sender, arbitrary OS paths and save path traversal; renderer has no direct Node access. |
| QA-06 | Worker revisions | Cancel AI/generation, change state, then receive old results; stale revision cannot commit. |
| QA-07 | Decoder locality | Exercise every runtime image (WebP strips, stills, paintings) from a clean cache; worker/font/audio files resolve locally. |
| QA-08 | Save interruption | Interrupt save replacement and campaign continuation; recover the previous-good snapshot or committed next entry, never half a reward. |
| QA-09 | Settings without match | Apply/Cancel preferences from Main Menu, including reduced motion and audio; they persist without inventing a game state. |
| QA-10 | Repeated scene lifecycle | Open/close town, battle and bestiary repeatedly; no duplicate loops, stale sounds or steadily leaked live instances. |

## Campaign and map

| ID | Test | Expected evidence |
| --- | --- | --- |
| QA-11 | M01 actual training | Recruit eight family members and train ten Hoplites locally; starting troops and transfers do not satisfy the counters. |
| QA-12 | M01 bridge gate | Before guard defeat, no alternative path crosses the river; after defeat a legal crossing exists. |
| QA-13 | M02 prerequisite chain | Temple II, Training Court, Aerie and upgraded Aerie each require normal costs and their own daily build opportunity. |
| QA-14 | M02 local recruitment | A remote Alexios cannot receive Windcrest Griffins; town return is required. |
| QA-15 | Both divine paths | Athena and Ares can each complete M02 and M03 with correctly preserved modifiers and learned-spell rules. |
| QA-16 | M03 route choice | Opening either initial crossing reaches both relays; opening neither does not. |
| QA-17 | M03 ward gate | Zero or one relay leaves the final region blocked; both open only the named gate. |
| QA-18 | Finite patrol | Scout Captain obeys vision, movement and region constraints; no real-time moves, respawns or hidden income. |
| QA-19 | Campaign carryover | Debrief shows preserved hero/equipment/god and replaced troops/wallet; repeated Continue creates one entry state. |
| QA-20 | Practice replay | An earlier mission replay cannot award XP/items/rewards to the canonical later campaign branch. |

## Creature pairs and rules

| ID | Test | Expected evidence |
| --- | --- | --- |
| QA-21 | Catalog pairs | Exactly eight base/upgrade pairs and sixteen unique form IDs; no branch, cycle or unpaired neutral family. |
| QA-22 | Shared population | Base and upgraded recruitment spend the same family pool; upgraded dwelling adds zero population. |
| QA-23 | Upgrade transaction | Full/partial upgrades conserve troops and charge only the resource difference; invalid capacity spends nothing. |
| QA-24 | All form contexts | Every form has consistent ID/name/stats in army, recruitment, combat and S18; no copied numerical UI table. |
| QA-25 | Griffin retaliation | Base two retaliations and upgrade unlimited-count policy follow the same alive/disabled rules; playback adds no extra attacks. |
| QA-26 | Seer family charge | Split a Seer army into stacks; there remains one shared Ward charge per army/battle. |
| QA-27 | Ranged roles | Peltast/Adept/Cyclops shoot while stationary; Centaurs never receive a bow or ranged command. |
| QA-28 | Apex boss identity | Melas uses stormforged_cyclops, not a third Cyclops ID; no invented storm area damage. |
| QA-29 | Combat playback parity | Normal, fast, Instant and animation interruption yield identical final HP, ammunition, casualties, rewards and RNG states. |
| QA-30 | Defeat checkpoint | Alexios defeat/retreat/surrender applies the clearly displayed mission failure policy and offers the correct prior checkpoint. |

## Assets and presentation

| ID | Test | Expected evidence |
| --- | --- | --- |
| QA-31 | Sprite import validation | Run `npm run sprites:import` on all delivered strips (transparency, frame grid, size); save the import report with tool versions and every manifest entry's `placeholder`/`final` status. |
| QA-32 | Anchor and scale calibration | Place a reference figure and one/two-hex footprint fixture on both boards; verify right facing, mirroring, anchors at the declared baseline, one hex = 240 px (battle) / 150 px (map heroes), and picking by hex transform, not sprite size. |
| QA-33 | Upgrade readability | Identify each pair at battle zoom in grayscale and with player colors changed; recolor alone fails. |
| QA-34 | Strip completeness | Every form supplies its required common and role-specific strips; all manifest names resolve; fallbacks used are reported. |
| QA-35 | Base/upgrade frame consistency | Check both forms in every required strip for baseline jitter, hand/weapon, saddle, horn, wing, hoof and armor continuity and frame-edge clipping. |
| QA-36 | Missing/loading assets | Text and stats remain usable; required production assets fail validation, development fallback is labeled. |
| QA-37 | Reduced motion | No automatic idle, camera sway or screen shake; a still frame is shown; explicit strip playback has an immediate Stop. |
| QA-38 | Fog and picking | Unseen live enemies are not displayed; decorative sprites cannot create or remove legal paths. |
| QA-39 | All building/screen states | Check the 32 building definitions and S01-S18 coverage against the package inventory; disabled mission content is honest. |
| QA-40 | Measured performance | Record hardware/backend and measure full fourteen-stack battle, town, map and bestiary; budgets are not accepted without evidence. |

## Map corpus and reporting

Add three golden-seed fixtures and at least 1,000 variation seeds per mission, plus boundary seeds 0/1/4294967295. Test every relevant gate-state combination, optional-encounter bypass, building dependency and save round trip. Connectivity tests are not victory simulations.

For each executed test record build commit, rules/content/campaign/generator versions, seed, platform, graphics backend, result and artifacts. A screenshot without state assertions does not prove a resource transaction or exactly-once reward. A headless pass does not prove animation or performance.

Use a small human review for readability, tutorial pacing, emotional continuity and loss tolerance after the headless/browser/native tests. Report actual completion times and balance outcomes rather than retaining the unmeasured target times as facts.
