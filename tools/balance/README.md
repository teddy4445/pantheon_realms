# Balance tool (development only — never packaged in the game)

Reproducible AI-vs-AI measurements for the six pantheons. Every number comes
from the real rules and the shipped AI playing **both** sides; none of it is a
playtest verdict.

```
npm run balance                              # all suites (≈ 15–25 min on 2 cores)
npm run balance -- --quick                   # smoke run (a few minutes)
npm run balance -- random --matches 4        # random-map seat fairness only
npm run balance -- skirmish --matches 6      # one suite, more matches
npm run balance -- armies tiers --seeds 20 --jobs 4
npm run balance -- --pantheons greek,egyptian
npm run balance -- --no-signatures           # duels with troops only
npm run balance -- skirmish --matches 2 --legacy-gods   # the same matches with city dedications OFF
npm run balance -- skirmish --matches 2 --legacy-intel  # the same matches with scouting intel OFF (full information)
npm run balance -- --help
```

Reports land in `balance-reports/balance-<timestamp>.md` (readable) and `.json`
(raw results; git-ignored).

## Suites

| Suite | What it plays | Side-neutral because |
|---|---|---|
| `skirmish` | Whole Twin Harbors matches, both players run by the strategic AI, on point-symmetric maps (terrain varies per seed). Undecided matches at the day cap are scored on army strength (≥ 25% ahead wins, else a draw). | Every ordered pairing is played from both towns with both first movers. The report prints the west-town and first-mover scores as fairness checks. |
| `armies` | Full-roster armies (one stack per tier, weekly growth × 1 or 2 weeks), base and upgraded forms. | Each pairing fights in both directions (attacker/defender). |
| `starts` | The Twin Harbors starting escorts. | Both directions. |
| `tiers` | Same-tier single-stack duels at equal gold. | Both directions; use only to spot outliers (single stacks undervalue flyers and shooters). |
| `random` | Whole matches on generated random maps (small, 2 and 3 empires, few monsters), every seat the same pantheon, all seats AI. Reports wins by seat. | Mirror matches: only seat order and the map differ, so an even generator gives each seat 1/N of the wins. |

The duels are hero battles in the matching Twin Harbors pairing: both
commanders have zeroed attributes, skills and equipment and no hero specialty,
so only the troops and each side's **pantheon signature** count (Harmony, Berserk Fury, free
Shapeshift). Signatures that act after a battle (Afterlife, Glory) or on the
economy (Offering) show up only in the `skirmish` suite. Add
`--no-signatures` to measure troops alone (the neutral gold-mine guard is the
opponent, as in content 0.4).

## City dedications on and off

The whole-match suites (`skirmish`, `random`, `random1v1`, `maps`) play with city
dedications on, as new games do (app 1.5.0). `--legacy-gods` plays the very same
matches (same seeds and maps) with the feature off: no dedications, and the gods'
direct daily income and weekly growth as before. Every whole-match report has an
**Economy and city dedications** section per pantheon — Temple II and first
dedication rates and days, switches, weekly income (dawn income plus city gifts, in
Gold equivalent) and its resources, extra stock from dedications, army strength on
days 15 and 29, unrecruited town stock (growth never used), recruitment, the first
day of Town Hall III and the tier-6/7 dwellings — and a per-god table of
commitment rates and dedication picks. The raw per-seat records are in the JSON
(`econ` on each match). Compare an on and an off report of the same suite and size.

## Scouting intel on and off

The whole-match suites play with scouting intel on (`scoutingIntelV1`, expedition kit), as new games
do: the AI judges an enemy army in view only from what its observation stage permits (a strength-band
prior, the identified creature types, the middle of each scouted quantity range; `packages/ai/src/observation.ts`).
`--legacy-intel` plays the very same matches with the feature off — every visible enemy army known in full,
as before. Compare an on and an off report of the same suite and size.

## Debugging one match

```
W=greek E=norse FIRST=east SEED=3 MAPSEED=5003 DAYS=20 \
  npx vitest run --config tools/balance/vitest.config.ts tools/balance/trace.measure.ts
```

prints each day's heroes, armies and towns plus battles, hires and captures.

```
MAP=circle_of_gates SEATS=greek SEED=3 DAYS=30 EVERY=3 \
  npx vitest run --config tools/balance/vitest.config.ts tools/balance/mapTrace.measure.ts
```

traces one all-AI match on an authored skirmish map (every seat's heroes, towns,
battles, captures and knock-outs). The seat-fairness test of the authored maps
lives in `tools/maps` (`npm run maps:fairness`).
