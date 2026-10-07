/**
 * Debug aid (development only): trace one all-AI match on an authored skirmish
 * map day by day — each empire's heroes, towns and battles, captures and
 * knock-outs. See tools/balance/README.md.
 *
 *   MAP=circle_of_gates SEATS=greek,greek,greek SEED=3 DAYS=30 \
 *     npx vitest run --config tools/balance/vitest.config.ts tools/balance/mapTrace.measure.ts
 */
import { it } from 'vitest';
import { loadCatalog } from '@pr/content';
import { GameDriver } from '@pr/testing';
import { runAITurn } from '@pr/ai';
import { compileSkirmishMap, createGeneratedMatch } from '@pr/campaign';
import { builtBuildingIds } from '@pr/rules';

it('map trace', () => {
  const c = loadCatalog();
  const mapId = process.env.MAP ?? 'circle_of_gates';
  const n = c.skirmishMaps![mapId]!.map.players.length;
  const seats = (process.env.SEATS ?? '').split(',').filter(Boolean);
  const pantheons = Array.from({ length: n }, (_, i) => seats[i] ?? seats[0] ?? 'greek');
  const g = compileSkirmishMap(c, mapId, pantheons.map((pantheonId) => ({ pantheonId, controller: 'ai' as const })));
  const { match } = createGeneratedMatch(c, g, { matchId: `trace-${mapId}-${pantheons.join('-')}-${process.env.SEED ?? 0}` });
  const d = new GameDriver(match, c);
  const onEvents = (evs: readonly { kind: string }[]) => {
    for (const e of evs)
      if (['BattleEnded', 'TownCaptured', 'HeroDefeated', 'PlayerEliminated', 'HeroHired'].includes(e.kind)) console.log(`   d${d.state.day} ${d.state.activePlayerId}: ${e.kind} ${JSON.stringify(e).slice(0, 220)}`);
  };
  let lastDay = 0;
  for (let i = 0; i < 4000 && d.state.outcome.status === 'running' && d.state.day <= Number(process.env.DAYS ?? 30); i++) {
    if (d.state.day !== lastDay && (d.state.day % Number(process.env.EVERY ?? 3) === 1 || d.state.day <= 2)) {
      lastDay = d.state.day;
      const lines = d.state.playerOrder.map((p) => {
        const heroes = Object.values(d.state.heroes)
          .filter((h) => h.ownerId === p && h.status === 'active')
          .map((h) => `${h.id}@${h.position.q},${h.position.r}[${h.army.slots.filter(Boolean).map((x) => `${x!.creatureId.slice(0, 8)}${x!.count}`).join(',')}]`);
        const towns = Object.values(d.state.towns)
          .filter((t) => t.ownerId === p)
          .map((t) => `${t.id}(b${builtBuildingIds(c, t).length} g${t.garrison.slots.reduce((a, x) => a + (x?.count ?? 0), 0)})`);
        return `  ${p} gold=${d.state.players[p]!.wallet.gold} ${towns.join(' ')} | ${heroes.join(' ')}`;
      });
      console.log(`DAY ${d.state.day}\n${lines.join('\n')}`);
    }
    d.state = runAITurn(c, d.state, { onEvents });
    if (d.state.battle) d.autoBattle(8000);
  }
  console.log('OUTCOME', JSON.stringify(d.state.outcome));
});
