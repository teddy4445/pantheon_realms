# Testing and verification

Run commands from the repository root. Node 24 and `npm ci` are the normal starting point. No generated installer is required to test the simulation.

## Choose the right layer

| Change | Useful evidence |
| --- | --- |
| Gameplay rule, cost, targeting or reward | Unit tests for acceptance, rejection and persistence; integration scenario for its command path. |
| Content definition | Catalog validation and tests for references, availability and affected mechanics. |
| Campaign/map | Reachability, deterministic generation, objective progression, replay and simulator checks. |
| React screen or Pixi effect | Browser interaction plus screenshots, including relevant graphics/motion settings. |
| Texture loading or scenery optimization | Correctness tests plus measured timing/memory on a representative scene. |
| Electron/installer | Build, packaged asset verification and a desktop smoke test. |
| Documentation/site copy | Link and file checks; browser validation of layout and links. |

## Fast iteration

```bash
npm run lint:boundaries
npm run typecheck
npm test -- packages/rules/test/restorationTemples.test.ts --maxWorkers=2
```

Use the closest existing test as a fixture. [GameDriver](../../packages/testing/src/driver.ts) drives commands through validation rather than bypassing the processor. Deterministic seeds make failed scenarios reproducible. For rejected commands, verify that the original match and resources remain unchanged.

`npm run check` runs boundaries, type checks and the full unit suite. A smaller machine can run those steps separately and use `npm test -- --maxWorkers=2` for the suite.

## Browser coverage

```bash
npx playwright install chromium
npm run test:e2e
npx playwright test --config playwright.restoration.config.ts
```

The default [Playwright config](../../playwright.config.ts) builds the renderer and serves it on port 4173, with one worker and software WebGL by default. It can reuse an existing server: stop stale preview servers before validating a new build. Focused `playwright.*.config.ts` files cover features such as dragons, painted magic, cities, map scenery and temples; inspect each config for its server and output settings.

Avoid using fixed delays as proof that a scene is ready. Wait for the relevant UI/state, check for console errors and failed asset requests, and capture the rendered state. Do not equate a successful DOM assertion with a correct sprite anchor or readable popup.

## Balance and campaign simulations

`npm run balance` and `npm run campaign-sim` produce headless measurements. Use them to discover illegal transitions, stalled progression and extreme outcomes. Keep seed, difficulty and configuration with a report. Their results are not human playtesting or a guarantee of balance.

## Desktop release verification

On Windows, `npm run desktop:dist` builds the renderer, main/preload bundle, optimized renderer assets and NSIS installer. See [desktop guide](../../apps/desktop/README.md) and [performance guide](PERFORMANCE.md).

The repository has [packaged verification tooling](../../tools/verify-packaged.cjs) and [desktop smoke tooling](../../tools/desktop-smoke.mjs); inspect their arguments and environment settings before running them against a specific output directory. Report the exact installer size/hash and smoke-test result. A web build passing does not prove all desktop pack paths resolve.

## Keep evidence honest

List only checks actually run. Separate unit results, browser checks, manual visual review and prior release evidence. Dated logs under `docs/` describe those particular builds; they are not automatically a test result for a new commit.
