/**
 * Development tool (never packaged): the computer plays one content-v2 campaign
 * — registered or still under construction — in both chapter orders with the
 * campaign-sim autopilot, and prints each chapter's result.
 *
 *   CAMPAIGN=silent_oracle PANTHEON=greek MODULE=silentOracleV2 EXPORT=buildSilentOracleV2 RUNS=2 \
 *     npx vitest run --config tools/campaign-v2/vitest.config.ts tools/campaign-v2/sim.measure.ts
 *
 * MODULE/EXPORT name a builder in packages/content/src/campaign/v2/ (omit them for a
 * registered campaign). Computer-played measurements, not playtests.
 */
import { it } from 'vitest';
import { loadCatalog } from '@pr/content';
import type { ContentCatalog } from '@pr/rules';
import { catalogWith } from '../../packages/content/test/v2/harness';
import { playJourneyV2 } from '../campaign-sim/sim';

it('campaign v2 simulation', async () => {
  const id = process.env.CAMPAIGN ?? 'three_beacons';
  const runs = Number(process.env.RUNS ?? 2);
  const maxDay = Number(process.env.MAX_DAY ?? 56);
  const level = process.env.LEVEL ?? null;
  let catalog: ContentCatalog;
  if (process.env.MODULE) {
    const mod = (await import(`../../packages/content/src/campaign/v2/${process.env.MODULE}.ts`)) as Record<string, unknown>;
    const build = mod[process.env.EXPORT ?? ''] as Parameters<typeof catalogWith>[2];
    const r = catalogWith(id, process.env.PANTHEON ?? 'greek', build);
    if (r.issues.length) console.log(`VALIDATION ISSUES:\n  ${r.issues.join('\n  ')}`);
    catalog = r.catalog;
  } else catalog = loadCatalog();
  for (let run = 0; run < runs; run++) {
    const order = run % 2 === 0 ? 'first' : 'last';
    const res = playJourneyV2(catalog, id, run, maxDay, level, order);
    console.log(`\n[${id}] run ${run} (${order} available chapter at each choice)`);
    for (const r of res) {
      console.log(`  ${r.missionId.padEnd(26)} ${r.outcome.padEnd(8)} day ${String(r.day).padStart(2)} · won ${r.battlesWon} lost ${r.battlesLost} · worst ${(r.worstLoss * 100).toFixed(0)}% ${r.worstBattle ?? ''}${r.reason ? ` · ${r.reason}` : ''}${r.open.length ? ` · open ${r.open.join(',')}` : ''}${r.blocks.length ? ` · ${r.blocks.map((b) => `${b.objectiveId}:${b.kind} ${b.detail}`).join('; ')}` : ''}`);
    }
  }
});
