Painted city wagon icon — 23 October 2026

Generated with built-in ImageGen using the game's painted save and naval icons as style references.
Prompt and original generation path: prompt.json.
Source master: assets-source/ui/city-icons-v1/caravan.png.
Transparent runtime derivatives: assets-runtime/city-icons-v1/caravan-{64,128}.webp.
The manifest registers icon.ui.caravan, so the existing shared Icon component renders this art
in the city caravan button and the caravan dispatch controls without changing their behavior.
Explicit glyph-only consumers can still request the existing monochrome fallback.

Validation: TypeScript type checking passed. Opened a two-town review save through Load/Import,
verified the city's caravan button resolves to caravan-128.webp, visually reviewed it beside the
other city controls, and clicked it to open the Send reinforcements dialog successfully.
city-screen.png is the in-game screenshot. The preview save is named painted-wagon-preview.
