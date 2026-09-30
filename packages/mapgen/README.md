# @pr/mapgen — logical map generation

`generateMap(template, seed, mode)` → `WorldMapDefinition` (terrain codes, road edges,
logical hash). Barriers, anchor reservation, canonical road carving, validation
checks (MAP-01..03, gate closed/open), 16 attempts then golden fallback.
`buildDecor` draws cosmetic decor from its own stream; decor never affects rules.
