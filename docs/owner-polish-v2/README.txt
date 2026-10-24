Owner visual and interaction fixes - 20 October 2026

- Illustrated sailboat and catapult icons, drawn as scalable layered SVGs.
- Walk cycles cover 2.5 hex widths instead of 1.3; map travel takes 560ms per
  step instead of 360ms, before the player's speed setting.
- Idle cycles play at 32% of their previous speed. Breathing, sway and walk
  bobbing are smaller and slower; no extra sprite frames.
- Empty ships accept route planning on first click and travel on second click.
  Existing embark confirmation and movement validation remain in effect.
- When the Worlds Met follows The Three Beacons in Campaign Chronicles.
  Start chapter replaces the verbose launch label. Both Confluence campaigns
  are labelled Six realms instead of Greek.
- Briefing scrolls are centered. Playtime/battle-count/map-size/difficulty
  metadata is removed from the top-right heading.
- Eleven new gameplay cheats, plus alohomora. The latter unlocks a book of
  19 entries, four per page, with three on the last page. Preparing a phrase
  does not execute it. Reduced motion skips the unlocking sequence.
- Map heroes use 85% of their original size, matching smaller creatures. Tree canopies are 45% larger;
  shrubs, rocks and their edge scenery are 25% larger.
- Camera tracking follows the animated hero and ignores focus requests for
  committed destinations during travel. Camera interpolation is frame-rate
  independent and has a gentler response.

Road alignment findings and the recommended next pass are in road-plan.txt.
The road artwork itself is unchanged.

Images: grimoire.png, unlock.png, briefing.png, map-scale.png.
Cheat reference: ../single-battle-design/cheats.txt.
Browser checks: tests/e2e/ownerPolish.spec.ts.
Unit checks: ownerFixes.test.ts, figureMotion.test.ts, animationTiming.test.ts.

These changes are included in the replacement Windows x64 installer built
20 October 2026: installer/Pantheon-Realms-Setup-1.0.0-x64.exe.
Packaged launch and exact bundled JavaScript/CSS comparison passed.

Release follow-up:
- Map creatures are 15% smaller.
- Entirely unseen enemy journeys leave the camera unchanged.
- Shoreline depth, foam and small shore details vary by location.
- Battlefield obstacles have smaller footprints and aligned contact shadows.
- Release and desktop versions reset to 1.0.0 for distribution.
