/**
 * Recruitment caravan view models (expedition kit §06/§11, `recruitmentCaravansV1`): another
 * player's caravan reaches the interface only through the scouting projection — its panel's
 * markup (text, aria labels, titles) holds no exact cargo count, route or destination — while
 * the owner's own tracker lines are exact; the night's summary lines are read from the
 * committed events; with the feature off there are no caravan controls.
 */
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { GameDriver } from '@pr/testing';
import { resources, type CreatureStackState, type GameEvent, type ScenarioFeatures } from '@pr/rules';
import { caravanIntelView, caravanStateLine, caravanSummaryLines, caravansOn, cargoText, etaText } from '../src/app/caravans';
import { ArmyIntelPanel } from '../src/components/armyIntel';

const ME = 'player';
const FOE = 'rival';

function game(o: { caravans?: boolean } = {}) {
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId: 'ui-caravans' });
  const f: Partial<ScenarioFeatures> = { weeklyEvents: false, recruitmentCaravansV1: o.caravans !== false };
  d.state.scenario = { ...d.state.scenario, features: { ...d.state.scenario.features!, ...f } };
  for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
  d.player.wallet = resources({ gold: 50_000 });
  const east = d.town('eastharbor');
  east.ownerId = ME;
  d.state.world.sites[east.siteId]!.owner = ME;
  d.town('westharbor').population = { hoplite: 40 };
  const foe = d.hero('rival_odysseus');
  foe.position = { q: 32, r: 2 };
  const army: (CreatureStackState | null)[] = [{ stackId: 'f0', creatureId: 'peltast', count: 2 }, null, null, null, null, null, null];
  foe.army = { slots: army };
  return d;
}

describe('caravan view models', () => {
  it('another player sees only the projected cargo: no exact count, route or destination in the markup', () => {
    const d = game();
    d.do({ kind: 'DispatchCaravan', sourceTownId: 'westharbor', destinationTownId: 'eastharbor', items: [{ creatureId: 'hoplite', count: 37 }] });
    const events: GameEvent[] = [...d.do({ kind: 'EndTurn' }), ...d.do({ kind: 'EndTurn' }, FOE)];
    const c = Object.values(d.state.caravans!)[0]!;
    // The rival's hero beside the wagon (identified at distance 1).
    d.hero('rival_odysseus').position = { q: c.coord.q, r: c.coord.r - 1 };
    const view = caravanIntelView(d.catalog, d.state, FOE, c)!;
    expect(view).not.toBeNull();
    expect(view.stage).not.toBe('scouted');
    const html = renderToStaticMarkup(<ArmyIntelPanel catalog={d.catalog} view={view} />);
    expect(html).not.toMatch(/(^|[^0-9])37([^0-9]|$)/);
    expect(html).not.toContain('Eastharbor');
    expect(html).toContain('Hoplites');
    // Out of sight: nothing at all.
    d.hero('rival_odysseus').position = { q: 32, r: 2 };
    expect(caravanIntelView(d.catalog, d.state, FOE, c)).toBeNull();
    // The owner's own lines are exact.
    expect(caravanIntelView(d.catalog, d.state, ME, c)).toBeNull();
    expect(cargoText(d.catalog, c.cargo)).toBe('37 Hoplites');
    expect(caravanStateLine(d.catalog, d.state, c)).toMatch(/^To Eastharbor · arrives Day \d+/);
    // The night's summary, from the committed events.
    const lines = caravanSummaryLines(d.catalog, d.state, events, ME);
    expect(lines[0]).toMatch(/^Caravan to Eastharbor moved \d+ tiles · arrives day \d+$/);
    expect(caravanSummaryLines(d.catalog, d.state, events, FOE)).toEqual([]);
  });

  it('dates and the feature switch', () => {
    const d = game();
    expect(etaText(d.state, d.state.day + 3)).toBe(`Day ${d.state.day + 3} · 3 days`);
    expect(etaText(d.state, d.state.day + 1)).toBe(`Day ${d.state.day + 1} · tomorrow`);
    expect(etaText(d.state, null)).toBe('Arrival unknown');
    expect(caravansOn(d.catalog, d.state)).toBe(true);
    expect(caravansOn(d.catalog, game({ caravans: false }).state)).toBe(false);
  });
});
