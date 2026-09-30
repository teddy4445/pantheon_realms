# S17 - Complete Settings Specification

**Status:** P. This extends the existing Settings screen into a real preferences system. Listing an option does not imply the backend or assets already exist. Unsupported options are omitted or disabled with a specific reason.

## Separation of concerns

User preferences control presentation and input, not the rules of the current match. Difficulty, resource multipliers, turn order, fog rules, unit prices, damage randomness, and victory conditions belong in scenario setup, not a settings toggle that can change a running game.

Settings have a committed state and an editable draft. **Apply** validates and commits supported changes; **Cancel** discards the draft. **Restore defaults** resets only the active tab's draft after confirmation; **Reset all preferences** is a separate explicit action and never deletes saves. A dirty-state prompt appears when leaving without applying.

Reversible previews such as font size, volume, or contrast may update live, but Cancel restores the committed state. Video-mode changes in a native build require **Keep changes** within 15 seconds or revert automatically. Platform-dependent options must not appear as working controls in a browser build that cannot support them.

## Tabs, defaults, and behavior

These are suggested defaults, not final accessibility certification or performance targets.

### 1. Gameplay presentation

| Preference | Default | Supported values | Contract |
| --- | --- | --- | --- |
| Adventure travel animation | Normal | Instant, Fast, Normal | Same movement cost and events at every speed |
| Battle animation speed | 1x | 0.5x, 1x, 1.5x, 2x, Instant | Does not change RNG, turns, damage, or cooldowns |
| Enemy movement presentation | Fast | Instant, Fast, Normal | Never reveals unseen enemies |
| Confirm end day with unused movement | On | On/Off | Only a warning; does not change legal actions |
| Confirm large purchases | On | On/Off; always confirm irreversible commitments | Threshold shown explicitly; no silent pledge/covenant replacement |
| Combat log detail | Standard | Compact, Standard, Detailed | Detailed view explains formula stages for known information |
| Tutorial hints | On | On/Off, reset dismissed hints | No gameplay advantage hidden behind hints |

Auto-combat is an explicit battle action, not an always-on setting that silently resolves fights. Instant animation can skip presentation frames only after actions have been computed by the normal rules.

### 2. Interface

| Preference | Default | Values |
| --- | --- | --- |
| UI scale | 100% | 80-160%, step 10%, subject to supported viewport |
| Text size | Standard | Standard, Large, Extra large |
| Tooltips | On, 500 ms delay | On/Off; delay 0-1,500 ms |
| Tactical hex overlay | On | Always, On hover, Off |
| Show move and attack previews | On | On/Off; committed-target confirmation remains |
| Resource labels | Icons plus text | Icons plus text, Text |
| Unit health/count labels | Both | Count, Health, Both |
| Minimap | On | On/Off |
| Codex autoplay | On when motion preference permits | On/Off |

Large text must reflow panels, not merely clip them or scale the game world. Hiding hex lines does not hide the selected reachable area or legal-target feedback necessary for a keyboard user. A tooltip is supplementary: prices, missing requirements, and confirmation consequences must remain available without hover.

### 3. Display and performance

Fullscreen/windowed, resolution, VSync, frame-rate limit, and quality presets are native/backend-dependent. Initial quality presets are Low, Medium, High; final rendering effects are not specified here. Browser fullscreen is a user gesture action, not a guaranteed saved window mode.

A texture/animation budget preference may reduce decoration or use static portraits but cannot substitute a different unit silhouette or hide gameplay-relevant state. Settings affecting resource reload show that they require restart/reload and do not pretend the change is already applied. Performance controls must not accelerate simulation ticks in this turn-based game.

### 4. Audio

Proposed controls: Master 80%, Music 60%, Effects 80%, Ambience 60%, Voice 80%, mute on focus loss On. Each ranges 0-100%. Mute is reversible and not equivalent to discarding the stored preferred volume.

No audio assets are requested by this document. If the current prototype is silent, display **Audio is not implemented in this review build** rather than playing fake test sounds. A preview button works only when a real accessible preview asset exists. Unit biography voice is optional and disabled until a voice track and synchronized transcript are provided.

### 5. Controls

Provide a searchable action list with current bindings, context, rebind, reset, and conflict feedback. Suggested defaults: Escape = back/pause; Enter = confirm focused action; Tab = next focus; arrows = UI navigation; Space = focused primary action; M = adventure map; H = hero; T = town; J = journal; B = bestiary; O = overview. In combat W = Wait and D = Defend. These are provisional and must respect platform/browser reserved shortcuts.

Bindings are context-aware. Typing in a search field must not trigger army movement. A rebind collision in the same active context offers Replace, Swap when safe, or Cancel. Required navigation actions cannot all be unbound without an alternative. Mouse-only dragging is never the sole route to splitting units, selecting quantities, or opening a unit page.

### 6. Accessibility

| Preference | Default | Behavior |
| --- | --- | --- |
| Motion policy | Follow system | System, Reduced, Full; explicit user choice wins |
| Camera shake | Off | Optional; always off in Reduced mode |
| Screen flashes | Reduced | Reduced or Standard; no essential signal depends on a flash |
| Color-independent ownership | On | Always pair faction color with icon/outline/text |
| High-contrast interface | Off | Changes contrast, not faction identity or stats |
| Subtitles/captions | On if audio exists | Captions include relevant non-speech information when authored |
| Hold/drag alternatives | On | Click/select/confirm equivalent operations |
| Unit preview death playback | Manual only | Never autoplays on page entry |

Reduced motion uses static unit portraits by default. Users may explicitly play an individual preview without enabling global motion; give an immediate Stop control. Settings labels and status changes must be exposed semantically to supported assistive technology. Final keyboard/screen-reader behavior requires testing in the selected technology; this documentation alone is not proof of conformance.

## Persistence and return behavior

Preferences have their own schema version and persist independently of any saved match. Loading a game does not revert the user's volume, text size, keybindings, or motion preference. Unsupported saved preference values fall back safely with a non-destructive migration. Save failure preserves the last committed values and explains what was not persisted.

Opening S17 from S01 returns to S01; from pause returns to pause; from a unit page returns to that same page, including its selected tab. No settings page changes world time. Applying animation speed during battle affects only subsequent presentation; an in-flight gameplay action still resolves once.

## Required checks

Cancel restores volume/UI preview; default reset does not delete saves; graphics rollback recovers an unusable mode; large text does not hide Apply/Cancel; no keybindings fire while editing text; two seeded battles produce identical results at Instant and 1x; reduced motion prevents autoplay; storage failure does not claim success; a hidden enemy never becomes visible because of a label or log setting.
