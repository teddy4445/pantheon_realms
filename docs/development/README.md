# Developer handbook

This is the current contributor entry point. Dated artwork reviews and earlier design proposals elsewhere in `docs/` are useful background, but can describe superseded plans.

| Question | Start here |
| --- | --- |
| How do I install, run or package the game? | [Root README](../../README.md#develop-locally) |
| Where does an action become a state change? | [Architecture walkthrough](ARCHITECTURE_WALKTHROUGH.md) |
| Where is a particular source file or exported symbol? | [Source atlas](SOURCE_INDEX.md) |
| How do I add a unit, spell, site or campaign? | [Extending the game](EXTENDING.md) |
| How do I test it? | [Testing](TESTING.md) |
| How do I keep it fast? | [Performance](PERFORMANCE.md) |
| Which content is implemented now? | [Validated content snapshot](content-snapshot.json) |
| How do I update this documentation or the website? | [Documentation tooling](../../tools/docs/README.md) |
| What are the contribution and media expectations? | [Contributing](../../CONTRIBUTING.md), [asset credits](../../ASSET_CREDITS.md) |

## Version vocabulary

The player-facing application version is **1.0.0**. The catalog also has rules, content, campaign, map-generator and save-schema versions. Those identifiers track different compatibility contracts and do not automatically match the app version. Asset folders such as `frontend-v1.1.0` name art deliveries, not the installed game's version. Do not rename all version strings as part of an application release.
