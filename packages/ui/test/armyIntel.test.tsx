/**
 * ArmyIntelPanel and its view models (expedition kit §05/§11, `scoutingIntelV1`): the panel
 * is built from the rules' projection only, so its markup — text, aria labels and titles —
 * never holds a hidden count; sighting, identified, scouted and LAST KNOWN read as the
 * references do (stage, banner, strength band, portraits, ranges, date); an earlier detailed
 * report is labelled as such; with the feature off nothing changes (no panel, full army).
 */
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { GameDriver } from '@pr/testing';
import { lastKnownIntel, type CreatureStackState, type HexCoord, type ScenarioFeatures } from '@pr/rules';
import { currentIntelView, intelOn, lastKnownAt, lastKnownMarkers, lastKnownView } from '../src/app/intel';
import { ArmyIntelPanel } from '../src/components/armyIntel';

const at = (q: number): HexCoord => ({ q, r: 7 });
const ME = 'player';
const FOE = 'rival_odysseus';
/** Counts that appear nowhere else in a panel (no day, range bound or band number uses them). */
const HIDDEN: [string, number][] = [
  ['hoplite', 23],
  ['peltast', 11],
  ['hoplite', 13],
  ['veteran_hoplite', 6],
];

function game(o: { foe: number; scouting?: number; intel?: boolean }) {
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId: 'ui-intel' });
  const f: Partial<ScenarioFeatures> = { weeklyEvents: false, scoutingIntelV1: o.intel !== false };
  d.state.scenario = { ...d.state.scenario, features: { ...d.state.scenario.features!, ...f } };
  for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
  const me = d.state.heroes['alexios']!;
  me.position = at(16);
  me.movementPoints = 5000;
  me.skills = o.scouting ? [{ skillId: 'scouting', rank: o.scouting }] : [];
  const foe = d.state.heroes[FOE]!;
  foe.position = at(o.foe);
  const slots: (CreatureStackState | null)[] = [null, null, null, null, null, null, null];
  HIDDEN.forEach(([creatureId, count], i) => (slots[i] = { stackId: `h${i}`, creatureId, count }));
  foe.army = { slots };
  return d;
}

const decode = (s: string) => s.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&');
/**
 * No exact hidden quantity anywhere in the markup a player or a screen reader meets: text,
 * aria-label, title, alt and data attributes (icon path data and picture file names, which
 * hold digits of their own, are left out).
 */
function expectNoHiddenCount(html: string): void {
  const readable = html.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/\s(src|href)="[^"]*"/g, '');
  for (const n of [23, 11, 13, 6, 36, 1150]) expect(readable, `hidden count ${n}`).not.toMatch(new RegExp(`(^|[^0-9–])${n}([^0-9–]|$)`));
}

describe('ArmyIntelPanel', () => {
  it('sighting: banner, strength band and "Creatures unknown" — no types, no counts', () => {
    const d = game({ foe: 21 });
    const v = currentIntelView(d.catalog, d.state, ME, FOE)!;
    expect(v).toMatchObject({ stage: 'sighting', mode: 'current', title: 'Distant sighting', creatures: null, observed: 'Observed today' });
    const html = decode(renderToStaticMarkup(<ArmyIntelPanel catalog={d.catalog} view={v} />));
    expect(html).toContain('Creatures unknown');
    expect(html).toContain(`Strength: <strong>${v.strength}</strong>`);
    expect(html).toContain('data-stage="sighting"');
    expect(html).not.toMatch(/Hoplite|Peltast/);
    expectNoHiddenCount(html);
  });

  it('identified: one portrait per creature type (forms apart, duplicates grouped), "?" for every number', () => {
    const d = game({ foe: 19 });
    const v = currentIntelView(d.catalog, d.state, ME, FOE)!;
    expect(v.creatures!.map((c) => [c.creatureId, c.range])).toEqual([
      ['hoplite', null],
      ['veteran_hoplite', null],
      ['peltast', null],
    ]);
    const html = decode(renderToStaticMarkup(<ArmyIntelPanel catalog={d.catalog} view={v} />));
    expect(html.match(/data-creature=/g)?.length).toBe(3);
    expect(html).toContain('Hoplites: number unknown');
    expect(html).toContain('Troops identified');
    expectNoHiddenCount(html);
  });

  it('scouted: quantity ranges of the grouped totals, never exact', () => {
    const d = game({ foe: 18, scouting: 1 });
    const v = currentIntelView(d.catalog, d.state, ME, FOE)!;
    expect(v.creatures!.map((c) => c.range)).toEqual(['20–39', '5–9', '10–19']);
    const html = decode(renderToStaticMarkup(<ArmyIntelPanel catalog={d.catalog} view={v} />));
    expect(html).toContain('Hoplites: about 20–39');
    expect(html).toContain('Scout report');
    expect(v.summary).toContain('Hoplites 20–39');
    expectNoHiddenCount(html);
    expectNoHiddenCount(v.summary);
  });

  it('LAST KNOWN with its date outside vision, and an earlier scout report kept apart', () => {
    const d = game({ foe: 22, scouting: 1 });
    d.do({ kind: 'MoveHero', heroId: 'alexios', destination: at(20) });
    d.do({ kind: 'MoveHero', heroId: 'alexios', destination: at(12) });
    d.do({ kind: 'EndTurn' });
    d.do({ kind: 'EndTurn' }, 'rival');
    d.do({ kind: 'EndTurn' });
    d.do({ kind: 'EndTurn' }, 'rival');
    const snap = lastKnownAt(d.catalog, d.state, ME, at(22))!;
    expect(snap).toEqual(lastKnownIntel(d.state, ME, FOE));
    const v = lastKnownView(d.catalog, d.state, snap);
    expect(v).toMatchObject({ mode: 'last_known', stage: 'scouted', observed: 'Last known Week 1 · Day 1 (2 days ago)' });
    const html = decode(renderToStaticMarkup(<ArmyIntelPanel catalog={d.catalog} view={v} />));
    expect(html).toContain('Last known · Scout report');
    expect(html).toContain('data-mode="last_known"');
    expectNoHiddenCount(html);
    expect(lastKnownMarkers(d.catalog, d.state, ME)).toEqual([{ id: FOE, coord: at(22), color: d.state.players['rival']!.color, day: 1, monster: false }]);
    // Seen again from afar (rank 0): a current sighting, the earlier report beside it, dated.
    d.state.heroes['alexios']!.skills = [];
    d.state.heroes['alexios']!.movementPoints = 5000;
    d.do({ kind: 'MoveHero', heroId: 'alexios', destination: at(17) });
    const now = currentIntelView(d.catalog, d.state, ME, FOE)!;
    expect(now.stage).toBe('sighting');
    expect(now.creatures).toBeNull();
    expect(now.earlier).toMatchObject({ stage: 'scouted', observed: 'Earlier report, Week 1 · Day 1' });
    const html2 = decode(renderToStaticMarkup(<ArmyIntelPanel catalog={d.catalog} view={now} />));
    expect(html2).toContain('(not a current estimate)');
    expect(html2).toContain('Creatures unknown');
    expectNoHiddenCount(html2);
  });

  it('feature off: no intel view (the legacy full army is shown instead)', () => {
    const d = game({ foe: 20, intel: false });
    expect(intelOn(d.catalog, d.state)).toBe(false);
    expect(currentIntelView(d.catalog, d.state, ME, FOE)).toBeNull();
    expect(lastKnownMarkers(d.catalog, d.state, ME)).toEqual([]);
  });
});
