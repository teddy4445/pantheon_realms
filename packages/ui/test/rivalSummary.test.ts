/**
 * The rivals' turns in a few lines (2026-10-07): only what the viewer could see
 * or what touched it; town captures are public; one line per empire.
 */
import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import { cellIndex, visibleCells, type GameEvent, type MatchState } from '@pr/rules';
import { approachNotes, heroesInView, rivalNotes, summarizeRivalNotes } from '../src/app/rivalSummary';

const ev = (e: Record<string, unknown>, i: number): GameEvent => ({ ...e, eventId: `1.${i}`, revision: 1 }) as unknown as GameEvent;

function setup() {
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId: 'rivals' });
  const s = d.state;
  const mission = d.catalog.missions['skirmish_twin_harbors']!;
  const seen = visibleCells(d.catalog, s, 'player');
  const inView = mission.sites.find((x) => x.kind.type === 'resource_site' && seen.has(cellIndex(s.world.map, x.coord)))!;
  const hidden = mission.sites.find((x) => x.kind.type === 'resource_site' && !seen.has(cellIndex(s.world.map, x.coord)))!;
  return { d, s, inView, hidden };
}

describe('rival turn summary', () => {
  it('reports a capture in view or of the viewer’s own mine, not one out of sight', () => {
    const { d, s, inView, hidden } = setup();
    const before: MatchState = structuredClone(s);
    const events = [ev({ kind: 'SiteCaptured', siteId: inView.id, playerId: 'rival' }, 0), ev({ kind: 'SiteCaptured', siteId: hidden.id, playerId: 'rival' }, 1)];
    const notes = rivalNotes(d.catalog, before, s, events, 'player');
    expect(notes.map((n) => n.key)).toEqual([`site:${inView.id}`]);
    // The hidden mine was the viewer's: now it is reported, as "from you".
    before.world.sites[hidden.id]!.owner = 'player';
    const again = rivalNotes(d.catalog, before, s, events, 'player');
    expect(again.find((n) => n.key === `site:${hidden.id}`)?.text).toBe(`took the ${hidden.name} from you`);
  });

  it('recruiting is reported only for a town in view; captures always; one line per empire', () => {
    const { d, s, inView } = setup();
    const east = s.towns['eastharbor']!;
    const seesEast = visibleCells(d.catalog, s, 'player').has(cellIndex(s.world.map, east.coord));
    const events = [
      ev({ kind: 'UnitsRecruited', townId: east.id, creatureId: 'hoplite', quantity: 5, destination: 'garrison' }, 0),
      ev({ kind: 'UnitsRecruited', townId: east.id, creatureId: 'peltast', quantity: 5, destination: 'garrison' }, 1),
      ev({ kind: 'SiteCaptured', siteId: inView.id, playerId: 'rival' }, 2),
      ev({ kind: 'TownCaptured', townId: 'westharbor', playerId: 'rival', fromPlayerId: 'player' }, 3),
    ];
    const notes = rivalNotes(d.catalog, s, s, events, 'player');
    expect(notes.some((n) => n.key === `recruit:${east.id}`)).toBe(seesEast);
    const lines = summarizeRivalNotes(s, notes);
    expect(lines).toHaveLength(1);
    // What touched the viewer comes first.
    expect(lines[0]!.text.startsWith('captured Westharbor from you')).toBe(true);
    expect(lines[0]!.text).toContain(`took the ${inView.name}`);
    expect(lines[0]!.mine).toBe(true);
    expect(lines[0]!.who).toBe(s.players['rival']!.pantheonId === s.players['player']!.pantheonId ? s.players['rival']!.name : expect.any(String));
  });

  it('an enemy hero that came into view near the viewer’s town is reported', () => {
    const { d, s } = setup();
    const rival = s.heroes['rival_odysseus']!;
    const west = s.towns['westharbor']!;
    const seenBefore = heroesInView(d.catalog, s, 'player');
    rival.position = { q: west.coord.q + 2, r: west.coord.r };
    const notes = approachNotes(d.catalog, s, 'player', seenBefore.filter((x) => x !== rival.id));
    expect(notes.map((n) => n.key)).toContain(`near:${rival.id}`);
  });
});
