/**
 * Campaign difficulty levels (proposed 2026-10-07): Story / Normal / Hard scale
 * the creatures in a mission's guards and hostile armies, the computer rivals'
 * purse and the computer's nerve; the level is kept for the whole run; the
 * objective texts show the counts the match really has; skirmish levels never
 * leak into campaigns or the other way round.
 */
import { describe, expect, it } from 'vitest';
import { loadCatalog } from '@pr/content';
import { DEFAULT_CAMPAIGN_DIFFICULTY, difficultyLevels, matchScore, missionText, scaleStackCount, type MatchState } from '@pr/rules';
import { aiPersonality } from '@pr/ai';
import { createMissionMatch, recordCompletion, restartCurrentMission, startCampaign, startNextMission, startPracticeReplay } from '../src';

const catalog = loadCatalog();
const guardCounts = (s: MatchState) => Object.fromEntries(Object.entries(s.world.sites).map(([id, x]) => [id, (x.guard ?? []).map((g) => g.count)]));

describe('campaign difficulty levels', () => {
  it('three campaign levels beside the three skirmish ones; Normal is the default', () => {
    expect(difficultyLevels(catalog, 'campaign').map((d) => d.name)).toEqual(['Story', 'Normal', 'Hard']);
    expect(difficultyLevels(catalog, 'skirmish').map((d) => d.id)).toEqual(['easy', 'normal', 'hard']);
    expect(catalog.difficulties[DEFAULT_CAMPAIGN_DIFFICULTY]?.scope).toBe('campaign');
    const [story, normal, hard] = difficultyLevels(catalog, 'campaign');
    // Each level is harder than the one before on every scale it has.
    expect(story!.guardPercent!).toBeLessThan(normal!.guardPercent!);
    expect(normal!.guardPercent!).toBeLessThan(hard!.guardPercent!);
    expect(story!.aiStartPercent).toBeLessThanOrEqual(normal!.aiStartPercent);
    expect(normal!.aiStartPercent).toBeLessThanOrEqual(hard!.aiStartPercent);
    expect(story!.ai.heroAttackMargin).toBeGreaterThan(hard!.ai.heroAttackMargin);
    // The setup lines are written from the same numbers.
    for (const d of [story!, normal!, hard!]) expect(d.details.join(' ')).toContain(d.guardPercent === 100 ? 'as written' : `${d.guardPercent}%`);
  });

  it('scales guards, hostile armies and hostile nerve; the rivals’ purse and income; never creature statistics', () => {
    const id = 'winter_oath_m05';
    const written = createMissionMatch(catalog, id, { matchId: 'w' }).match;
    const hard = createMissionMatch(catalog, id, { matchId: 'w', difficultyId: 'campaign_hard' }).match;
    const story = createMissionMatch(catalog, id, { matchId: 'w', difficultyId: 'campaign_story' }).match;
    const H = catalog.difficulties['campaign_hard']!;
    const S = catalog.difficulties['campaign_story']!;
    expect(written.scenario.difficultyId).toBeNull();
    expect(hard.scenario.difficultyId).toBe('campaign_hard');
    const w = guardCounts(written);
    for (const [site, counts] of Object.entries(guardCounts(hard))) expect(counts, site).toEqual(w[site]!.map((n) => scaleStackCount(n, H.guardPercent!)));
    for (const [site, counts] of Object.entries(guardCounts(story))) expect(counts, site).toEqual(w[site]!.map((n) => scaleStackCount(n, S.guardPercent!)));
    // The rival's starting purse and income.
    const rival = catalog.missions[id]!.rivals![0]!.playerId;
    expect(hard.players[rival]!.wallet.gold).toBe(Math.floor((written.players[rival]!.wallet.gold * H.aiStartPercent) / 100));
    expect(hard.players[rival]!.incomePercent).toBe(H.aiIncomePercent);
    // The rival's starting army and town garrison, at the level's own share.
    const rivalCounts = (s: MatchState) => [
      ...Object.values(s.heroes).filter((h) => h.ownerId === rival).flatMap((h) => h.army.slots.filter(Boolean).map((x) => x!.count)),
      ...Object.values(s.towns).filter((t) => t.ownerId === rival).flatMap((t) => t.garrison.slots.filter(Boolean).map((x) => x!.count)),
    ];
    expect(rivalCounts(hard)).toEqual(rivalCounts(written).map((n) => scaleStackCount(n, H.rivalArmyPercent!)));
    // The player's purse and hero are as written.
    expect(hard.players['player']!.wallet).toEqual(written.players['player']!.wallet);
    const heroOf = (s: MatchState) => Object.values(s.heroes).find((h) => h.ownerId === 'player')!;
    expect(heroOf(hard).army).toEqual(heroOf(written).army);
    // The computer's margins come from the level.
    expect(aiPersonality(catalog, hard)).toEqual(H.ai);
  });

  it('hostile heroes: armies scaled, attack threshold scaled but never below even strength', () => {
    const id = 'winter_oath_m02';
    const def = catalog.missions[id]!.hostileHeroes[0]!;
    const written = createMissionMatch(catalog, id, { matchId: 'h' }).match;
    const story = createMissionMatch(catalog, id, { matchId: 'h', difficultyId: 'campaign_story' }).match;
    const hard = createMissionMatch(catalog, id, { matchId: 'h', difficultyId: 'campaign_hard' }).match;
    const hostile = (s: MatchState) => Object.values(s.heroes).find((h) => h.definitionId === def.commander.heroDefinitionId)!;
    const ratio = (s: MatchState) => hostile(s).ai!.attackThreshold.numerator / hostile(s).ai!.attackThreshold.denominator;
    expect(ratio(written)).toBeCloseTo(def.ai.attackThreshold.numerator / def.ai.attackThreshold.denominator);
    expect(ratio(story)).toBeGreaterThan(ratio(written));
    expect(ratio(hard)).toBeLessThanOrEqual(ratio(written));
    expect(ratio(hard)).toBeGreaterThanOrEqual(1);
    const counts = (s: MatchState) => hostile(s).army.slots.filter(Boolean).map((x) => x!.count);
    expect(counts(hard)).toEqual(def.army.map((a) => scaleStackCount(a.count, catalog.difficulties['campaign_hard']!.guardPercent!)));
  });

  it('the objective texts show the counts the match started with', () => {
    for (const level of ['campaign_story', 'campaign_normal', 'campaign_hard', null]) {
      const s = createMissionMatch(catalog, 'winter_oath_m01', { matchId: 't', difficultyId: level }).match;
      const o = catalog.missions['winter_oath_m01']!.objectives.find((x) => x.id === 'm01_barrow_guard')!;
      const [draugr, deathless] = s.world.sites['m01_rune_stone']!.guard!.map((g) => g.count);
      expect(missionText(catalog, s, o.description)).toBe(`Defeat the ${draugr} Draugar and ${deathless} Deathless Draugar standing around the Rune Stone.`);
    }
    // An arc campaign's generated text too.
    const s = createMissionMatch(catalog, 'new_fire_m01', { matchId: 't', difficultyId: 'campaign_hard' }).match;
    for (const o of catalog.missions['new_fire_m01']!.objectives) expect(missionText(catalog, s, o.description)).not.toMatch(/[{}]/);
  });

  it('the level is kept for the whole run: next mission, restart and practice replay', () => {
    const { campaign, start } = startCampaign(catalog, 'winter_oath', { runId: 'r', startingGodId: null, difficultyId: 'campaign_hard' });
    expect(campaign.difficultyId).toBe('campaign_hard');
    expect(start.match.scenario.difficultyId).toBe('campaign_hard');
    expect(restartCurrentMission(catalog, campaign).entryHash).toBe(campaign.currentEntryHash);
    // Complete mission 1 by fiat and move on: the next mission is Hard too.
    const won: MatchState = { ...start.match, outcome: { status: 'victory', day: 5, winnerIds: ['player'] } as MatchState['outcome'] };
    const next = startNextMission(catalog, recordCompletion(catalog, campaign, won));
    expect(next.start.match.scenario.difficultyId).toBe('campaign_hard');
    expect(restartCurrentMission(catalog, next.campaign).entryHash).toBe(next.campaign.currentEntryHash);
    const practice = startPracticeReplay(catalog, next.campaign, 'winter_oath_m01');
    expect(practice.start.match.scenario.difficultyId).toBe('campaign_hard');
  });

  it('a run from an older build (no level) keeps the missions as written and its entry hash', () => {
    const { campaign } = startCampaign(catalog, 'winter_oath', { runId: 'old', startingGodId: null });
    const old = { ...campaign } as Record<string, unknown>;
    delete old['difficultyId'];
    const restarted = restartCurrentMission(catalog, old as never);
    expect(restarted.match.scenario.difficultyId).toBeNull();
    expect(restarted.entryHash).toBe(campaign.currentEntryHash);
  });

  it('levels never cross scopes; the score multiplier applies to campaign missions', () => {
    expect(() => startCampaign(catalog, 'winter_oath', { runId: 'x', startingGodId: null, difficultyId: 'hard' })).toThrow(/not a campaign difficulty/);
    expect(createMissionMatch(catalog, 'skirmish_twin_harbors', { matchId: 's', difficultyId: 'campaign_hard' }).match.scenario.difficultyId).toBeNull();
    expect(createMissionMatch(catalog, 'winter_oath_m01', { matchId: 'c', difficultyId: 'hard' }).match.scenario.difficultyId).toBeNull();
    const s = createMissionMatch(catalog, 'winter_oath_m01', { matchId: 'c', difficultyId: 'campaign_story' }).match;
    expect(matchScore(catalog, s, 'player').difficultyPercent).toBe(catalog.difficulties['campaign_story']!.scorePercent);
  });
});

describe('army counts in mission texts', () => {
  it('every army written into a campaign text is one of that mission’s armies, stack for stack', () => {
    const token = /\{army:([a-z0-9_]+=\d+(?:,[a-z0-9_]+=\d+)*)\}/g;
    const key = (army: readonly { creatureId: string; count: number }[]) => army.map((s) => `${s.creatureId}=${s.count}`).join(',');
    let checked = 0;
    for (const camp of Object.values(catalog.campaigns)) {
      for (const id of camp.missionIds) {
        const m = catalog.missions[id]!;
        const armies = new Set([
          ...m.sites.flatMap((s) => (s.guard ? [key(s.guard.army)] : [])),
          ...m.hostileHeroes.map((h) => key(h.army)),
          ...(m.rivals ?? []).flatMap((r) => [key(r.hero.army), ...(r.town.garrison ? [key(r.town.garrison)] : [])]),
        ]);
        const texts = [m.summary, ...m.objectives.flatMap((o) => [o.description, o.hint ?? ''])];
        for (const t of texts)
          for (const [, spec] of t.matchAll(token)) {
            expect(armies.has(spec!), `${id}: {army:${spec}} is not an army of this mission`).toBe(true);
            checked++;
          }
      }
    }
    expect(checked).toBeGreaterThan(60);
  });
});
