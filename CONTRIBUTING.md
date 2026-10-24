# Contributing to Pantheon Realms

A useful contribution can be a reproducible bug report, a balance observation, clearer writing, a focused feature or an improvement to art, performance or accessibility.

## Start here

1. Follow the [root setup guide](README.md#develop-locally): Node 24, `npm ci`, `npm run dev`.
2. Read the README for the package you will change and the [architecture walkthrough](docs/development/ARCHITECTURE_WALKTHROUGH.md).
3. Make a focused branch. Explain the player-facing problem and expected behavior before introducing a new system.
4. Run relevant tests, TypeScript and the boundary checker. Include the exact commands and results with your change.

## Report a problem

Include the game version, operating system, browser or desktop build, steps to reproduce, expected result and actual result. For maps and battles, include the seed, pantheons, difficulty, day, mission/chapter and involved unit/spell IDs when available. Attach a screenshot or a minimal save after checking that it contains no personal information. For performance issues, include map size, graphics settings and the action that triggers the slowdown.

Balance feedback is most useful with starting armies, losses, spell use and difficulty. A single win or loss is not sufficient to establish a balance regression.

## Code conventions and boundaries

- Keep `rules`, `content`, `mapgen`, `campaign`, `ai` and `session` independent of DOM/browser/Node APIs. `npm run lint:boundaries` enforces dependencies; the core TypeScript configuration also omits the DOM library.
- Change gameplay through validated commands. Quotes/previews must not mutate the live match. UI, AI, effects and animation callbacks must not apply damage or rewards directly.
- Preserve stable content IDs and serializable state. Document migrations when a save shape changes. Do not silently reinterpret an existing ID for a different mechanic.
- Use explicit seeded gameplay RNG. Cosmetic hashes and animation clocks must not consume gameplay RNG.
- Keep startup imports Pixi-free. Use `@pr/presentation/core` for lightweight helpers and `SceneHost` to load the renderer.
- Comment invariants, units, ownership, persistence, rejection behavior and non-obvious choices. Explain *why*, instead of paraphrasing each line.
- Match nearby formatting; avoid repository-wide formatting changes in a functional patch.

## Verify the change

```bash
npm run lint:boundaries
npm run typecheck
npm test -- --maxWorkers=2
```

For focused iteration, pass a test path to `npm test -- path/to/file.test.ts`. Run the appropriate browser scenario when changing interaction, layout, sprites or packaging. See [TESTING.md](docs/development/TESTING.md) for unit tests, browser checks, simulation and installer verification.

Add regression tests for new rules, save transitions and discovered bugs. Pure copy changes do not need artificial unit tests. Visual changes need screenshots at relevant sizes, including reduced-motion or lower-effects settings when applicable.

## Content and artwork

Use [EXTENDING.md](docs/development/EXTENDING.md) before adding a unit, spell, site or campaign. Explain where new content becomes available; a catalog entry is not automatically available in every mission.

Keep source material and provenance in `assets-source/`, publish derivatives to `assets-runtime/`, and register stable asset IDs in manifests. Do not embed local filesystem paths in new runtime metadata. Preserve license records and source links for media; see [ASSET_CREDITS.md](ASSET_CREDITS.md). Do not commit generated installers, personal saves, caches or `node_modules/`.

## Documentation and pull requests

Update the relevant package README when its responsibilities or public contract change. Update the extension guide when adding a required step. Refresh the source atlas with `node tools/docs/source-index.mjs` and the catalog snapshot with `node tools/docs/export-catalog.mjs` when appropriate.

A useful pull request states the concrete problem, resulting behavior, affected systems and validation performed. Note save compatibility, asset provenance and measured performance changes when relevant. Avoid claiming a balance improvement solely from automated tests.

## Website

The landing page lives in [teddy4445/pantheon_realms_website](https://github.com/teddy4445/pantheon_realms_website). It is maintained separately and has its own preview instructions. Changes in this repository do not publish the website automatically.
