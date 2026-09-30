/** Debug aid: trace one AI-vs-AI Twin Harbors match day by day (see tools/balance/README.md). */
import { it } from 'vitest';
import { loadCatalog } from '@pr/content';
import { GameDriver } from '@pr/testing';
import { runAITurn } from '@pr/ai';
import { createMissionMatch } from '@pr/campaign';
import { builtBuildingIds, type MatchState } from '@pr/rules';
it('trace', () => {
  const c = loadCatalog();
  const west = process.env.W ?? 'greek', east = process.env.E ?? 'greek';
  const id = west === 'greek' && east === 'greek' ? 'skirmish_twin_harbors' : `skirmish_twin_harbors_${west}_vs_${east}`;
  const { match } = createMissionMatch(c, id, { matchId: `ava-${process.env.SEED ?? 0}`, startingGodId: c.pantheons[west]!.godIds.find((g) => c.gods[g]!.role === 'patron')!, ...(process.env.MAPSEED ? { seed: Number(process.env.MAPSEED), mode: 'variation' as const } : {}) });
  const d = new GameDriver(match, c);
  const s: MatchState = structuredClone(d.state);
  for (const p of Object.values(s.players)) if (p.controller === 'human') p.controller = 'ai';
  if (process.env.FIRST === 'east') {
    s.playerOrder = ['rival', 'player'];
    s.activePlayerId = 'rival';
  }
  d.state = s;
  const onEvents = (evs: readonly any[]) => {
    for (const e of evs) {
      if (['BattleStarted', 'BattleEnded', 'TownCaptured', 'HeroHired', 'HeroDefeated', 'SiteCaptured', 'HeroRetreated'].includes(e.kind)) console.log(`   d${d.state.day} ${d.state.activePlayerId}: ${e.kind} ${JSON.stringify(e).slice(0, 160)}`);
    }
  };
  let lastDay = 0;
  for (let i = 0; i < 400 && d.state.outcome.status === 'running' && d.state.day <= Number(process.env.DAYS ?? 20); i++) {
    if (d.state.day !== lastDay) {
      lastDay = d.state.day;
      const heroes = Object.values(d.state.heroes).filter((h) => h.status === 'active').map((h) => `${h.ownerId[0]}:${h.id}@${h.position.q},${h.position.r}[${h.army.slots.filter(Boolean).map((x) => `${x!.creatureId.slice(0, 6)}${x!.count}`).join(',')}]`);
      const towns = Object.values(d.state.towns).map((t) => `${t.id}:${t.ownerId} g=${t.garrison.slots.filter(Boolean).map((x) => `${x!.creatureId.slice(0, 6)}${x!.count}`).join(',')} b=${builtBuildingIds(c, t).length}`);
      console.log(`DAY ${d.state.day} gold p=${d.state.players['player']!.wallet.gold} r=${d.state.players['rival']!.wallet.gold} | ${heroes.join(' ')} | ${towns.join(' ')}`);
    }
    d.state = runAITurn(c, d.state, { onEvents });
  }
  console.log('OUTCOME', JSON.stringify(d.state.outcome));
});
