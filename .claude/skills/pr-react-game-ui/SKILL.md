---
name: pr-react-game-ui
description: "Implement or review the React interface for Pantheon Realms, including main menu, settings, hero and town management, recruitment, the encyclopedia, S18 animated unit detail and contextual inspectors. Use for screen navigation, accessibility, empty/error states, stat consistency and browser testing. Preserve a game interface rather than replacing it with a generic dashboard or marketing page."
---

# React Game Interface

Read [project-contract.md](references/project-contract.md) and the current `screens/` contracts under `docs/pantheon-v0.3/`. Use the existing screen IDs; S01, S17 and S18 are not duplicate new menu pages.

## Workflow

1. Identify entry, data context, legal actions, consequences, return destination, empty state and disabled reasons.
2. Build selectors/view models from the shared state and quote resolvers. Never maintain UI-owned prices, wallets or damage formulas.
3. Keep React responsible for accessible controls and lifecycle, not per-frame sprite/particle updates. Preserve one explicit PixiJS canvas host boundary: take values only from `@pr/presentation/core` and load the views lazily through `packages/ui/src/scene/SceneHost.tsx`.
4. Implement focus, keyboard navigation, visible labels, sensible tab order, dialogs and text alternatives. A right-click-only action is insufficient.
5. Test normal flows and failure states through visible controls. Add stable semantic selectors only where needed; do not create privileged action hooks exposed in production.

## Screen invariants

- S01: valid Continue metadata; real new/load/settings/bestiary paths; no account requirement or fake multiplayer.
- S17: draft/apply/cancel, persisted preferences, safe rollback, reduced motion and platform-dependent controls. Settings never modify match rules.
- S18: base mode works without a match; contextual mode uses a legitimate stack; per-creature and stack HP/damage are distinct; base and upgrade compare the same fields.
- Preserve the calling hero, town, recruitment quantity and battle target when closing inspection.
- Both creature forms use shared definitions. Missing animation leaves stats/lore usable.
- Animation preview does not dispatch commands or consume RNG, ammo, mana or family charges.

## MCP testing

Use Playwright DOM snapshots for semantic UI, screenshots/vision for the PixiJS canvas, and checked-in TypeScript tests for reproducibility. The isolated MCP browser does not preserve storage after its context closes. Test durable saves with an explicit persistent test profile or Electron harness, never a personal signed-in browser. Browser checks do not validate native packaging.

Output implemented screen states, navigation contract, screenshots, accessibility interactions checked, test commands and known failures. An attractive static screen is not a completed gameplay flow.
