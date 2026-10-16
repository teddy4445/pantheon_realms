/**
 * Campaign content v2 sites as the map describes them (packages/ui/src/app/siteInfo.ts):
 * the known state and the legal interaction of sluices, supply depots, ferry
 * landings and neutral hiring sites, the notices for a sluice operated and a
 * ferry that does not run, and the quest markers of open objectives — from
 * committed state and the rules' own quotes, never revealing what the viewer has
 * not explored.
 */
import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import { authoredWorldMap, createGeneratedMatch } from '@pr/campaign';
import { cellIndex, type GameEvent, type MissionDefinition, type SiteDefinition } from '@pr/rules';
import { isV2Site, portalBlockedText, questMarkerIcon, questMarkerSites, siteStatus, sluiceOperatedText } from '../src/app/siteInfo';
import { siteArchetype, siteKindLabel } from '../src/app/view';

/** The Three Beacons' first v2 chapter with a sluice on the bay's east shore: closed, the bay's lower half is water; open, salt marsh. */
function sluiceDriver(): { d: GameDriver; sluice: SiteDefinition } {
  const catalog = GameDriver.mission('three_beacons_v2_m01').catalog;
  const m = catalog.missions['three_beacons_v2_m01']!;
  const sluice: SiteDefinition = {
    id: 'test_bay_sluice',
    anchorId: 'test_bay_sluice',
    coord: { q: 19, r: 11 },
    name: 'Bay Sluice',
    description: 'An old tide sluice on the east shore of the bay.',
    kind: {
      type: 'sluice',
      channel: [...[12, 13, 14, 15, 16, 17, 18].map((q) => ({ q, r: 11 })), ...[11, 12, 13, 14, 15, 16, 17].map((q) => ({ q, r: 12 }))],
      openTerrain: 'marsh',
      closedTerrain: 'water',
      startsOpen: false,
      openText: 'The lower bay drains to salt marsh: heroes can wade across it.',
      closeText: 'The lower bay floods again: its marsh becomes open water.',
      openFlag: 'test_bay_drained',
    },
    art: 'sluice',
  };
  const mission: MissionDefinition = { ...m, id: 'test_sluice_bay', sites: [...m.sites, sluice] };
  const map = authoredWorldMap(m.map!);
  const { match } = createGeneratedMatch(catalog, { mission, map, decor: [] }, { matchId: 'test-sluice', startingGodId: 'zeus', carryover: null });
  return { d: new GameDriver(match, catalog), sluice };
}

const ev = (e: Record<string, unknown>): Extract<GameEvent, { kind: 'SluiceOperated' }> => ({ ...e, eventId: '1.0', revision: 1 }) as unknown as Extract<GameEvent, { kind: 'SluiceOperated' }>;

describe('sluice', () => {
  it('is a sluice on the map, closed at the start, with its channel under water', () => {
    const { d, sluice } = sluiceDriver();
    expect(siteArchetype(sluice)).toBe('sluice');
    expect(siteKindLabel(sluice)).toBe('Sluice');
    expect(isV2Site(sluice)).toBe(true);
    expect(d.state.world.sites[sluice.id]!.open).toBe(false);
    expect(d.state.world.map.terrain[cellIndex(d.state.world.map, { q: 14, r: 12 })]).toBe('w');
  });

  it('says what a hero standing there can do, with the rules’ text, and what one elsewhere could', () => {
    const { d, sluice } = sluiceDriver();
    const away = siteStatus(d.catalog, d.state, 'player', sluice.id, 'alexios')!;
    expect(away.state).toBe('Closed');
    expect(away.actionable).toBe(false);
    expect(away.action).toContain('A hero standing here can open it');
    expect(away.action).toContain('drains to salt marsh');
    d.hero().position = { ...sluice.coord };
    const here = siteStatus(d.catalog, d.state, 'player', sluice.id, 'alexios')!;
    expect(here.actionable).toBe(true);
    expect(here.action).toBe(`${d.hero().name} can open it: ${(sluice.kind as { openText: string }).openText}`);
  });

  it('after OperateSluice the channel is marsh and the description says open; closing is refused while a hero stands in the channel', () => {
    const { d, sluice } = sluiceDriver();
    d.hero().position = { ...sluice.coord };
    const before = d.state.world.map;
    const events = d.do({ kind: 'OperateSluice', heroId: 'alexios', siteId: sluice.id });
    expect(events.some((e) => e.kind === 'SluiceOperated')).toBe(true);
    expect(d.state.world.map).not.toBe(before);
    expect(d.state.world.map.logicalHash).toBe(before.logicalHash);
    expect(d.state.world.map.terrain[cellIndex(d.state.world.map, { q: 14, r: 12 })]).toBe('s');
    expect(siteStatus(d.catalog, d.state, 'player', sluice.id, 'alexios')!.state).toBe('Open');
    // The notice names the hero and what changed.
    expect(sluiceOperatedText(d.catalog, d.state, 'player', ev({ kind: 'SluiceOperated', siteId: sluice.id, heroId: 'alexios', open: true }))).toBe(`${d.hero().name} opened Bay Sluice. ${(sluice.kind as { openText: string }).openText}`);
    // Another hero waits in the drained channel: flooding it would cut them off, and the reason is shown.
    const other = Object.values(d.state.heroes).find((h) => h.id !== 'alexios' && h.status === 'active')!;
    other.position = { q: 14, r: 12 };
    const refused = siteStatus(d.catalog, d.state, 'player', sluice.id, 'alexios')!;
    expect(refused.actionable).toBe(false);
    expect(refused.refused).toBe(true);
    expect(refused.action).toContain('cannot close it');
    expect(refused.action).toContain('stands in the channel');
  });

  it('a sluice operated by another hand out of sight gives no notice', () => {
    const { d, sluice } = sluiceDriver();
    for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 0);
    // The viewer's hero far from the sluice (the map's west end), the rival out of sight too.
    d.hero().position = { q: 3, r: 3 };
    const rival = Object.values(d.state.heroes).find((h) => h.ownerId !== 'player')!;
    rival.position = { q: 30, r: 1 };
    expect(sluiceOperatedText(d.catalog, d.state, 'player', ev({ kind: 'SluiceOperated', siteId: sluice.id, heroId: rival.id, open: true }))).toBeNull();
  });
});

describe('ferry landings, supply depots and neutral hiring sites', () => {
  it('a ferry that does not run gives its locked reason; a running one names the far landing only once known', () => {
    const d = GameDriver.mission('silent_oracle_v2_m03');
    const sites = d.catalog.missions['silent_oracle_v2_m03']!.sites;
    const quay = sites.find((s) => s.id === 'so3_chain_quay')!;
    const reason = (quay.kind as { lockedReason: string }).lockedReason;
    expect(siteKindLabel(quay)).toBe('Ferry landing');
    const locked = siteStatus(d.catalog, d.state, 'player', quay.id, null)!;
    expect(locked).toMatchObject({ state: reason, locked: true });
    expect(portalBlockedText(d.catalog, d.state, quay.id)).toBe(reason);
    const north = sites.find((s) => s.id === 'so3_north_ferry')!;
    const exit = sites.find((s) => s.id === 'so3_north_landing')!;
    for (const fog of Object.values(d.state.fog)) fog.explored[cellIndex(d.state.world.map, exit.coord)] = 0;
    const running = siteStatus(d.catalog, d.state, 'player', north.id, null)!;
    expect(running.state).toBe('Running');
    expect(running.action).toContain('the far landing');
    expect(running.action).not.toContain(exit.name);
    d.state.fog['player']!.explored[cellIndex(d.state.world.map, exit.coord)] = 1;
    expect(siteStatus(d.catalog, d.state, 'player', north.id, null)!.action).toContain(exit.name);
    // Once the flag is set the ferry runs; a blocked landing then names a hero on the far side.
    d.state.mission.flags[(quay.kind as { requiresFlag: string }).requiresFlag] = true;
    expect(siteStatus(d.catalog, d.state, 'player', quay.id, null)!.locked).toBe(false);
    expect(portalBlockedText(d.catalog, d.state, quay.id)).toMatch(/far landing is blocked/);
  });

  it('a supply depot says whether it was taken', () => {
    const d = GameDriver.mission('silent_oracle_v2_m03');
    const depot = d.catalog.missions['silent_oracle_v2_m03']!.sites.find((s) => s.id === 'so3_salt_cache')!;
    expect(siteKindLabel(depot)).toBe('Supply depot');
    expect(siteStatus(d.catalog, d.state, 'player', depot.id, null)!.state).toBe('Not taken yet');
    d.state.world.sites[depot.id]!.claimed = true;
    expect(siteStatus(d.catalog, d.state, 'player', depot.id, null)!.state).toMatch(/^Taken/);
  });

  it('a neutral hiring site shows this week’s stock and its pact lock', () => {
    const d = GameDriver.mission('silent_oracle_v2_m02');
    const meadow = d.catalog.missions['silent_oracle_v2_m02']!.sites.find((s) => s.id === 'so2_pegasus')!;
    const k = meadow.kind as { weeklyGrowth: number; requiresFlag: string; lockedReason: string };
    expect(siteKindLabel(meadow)).toBe('Hiring site');
    const locked = siteStatus(d.catalog, d.state, 'player', meadow.id, null)!;
    expect(locked.locked).toBe(true);
    expect(locked.state).toBe(`${k.weeklyGrowth} Pegasi this week (up to ${k.weeklyGrowth} each week; unhired ones do not stay)`.replace('Pegasi', d.catalog.creatures['pegasus']!.pluralName));
    expect(locked.action).toBe(`Not hiring yet: ${k.lockedReason}`);
    expect(locked.refused).toBe(true);
    d.state.mission.flags[k.requiresFlag] = true;
    const open = siteStatus(d.catalog, d.state, 'player', meadow.id, null)!;
    expect(open.locked).toBe(false);
    expect(open.action).toMatch(/hire them at their normal price/);
    d.state.world.sites[meadow.id]!.stock = 0;
    expect(siteStatus(d.catalog, d.state, 'player', meadow.id, null)!.action).toMatch(/next week/);
  });

  it('ordinary sites are left to the map’s own lines', () => {
    const d = GameDriver.mission('silent_oracle_v2_m02');
    const pasture = d.catalog.missions['silent_oracle_v2_m02']!.sites.find((s) => s.id === 'so2_pasture')!;
    expect(siteStatus(d.catalog, d.state, 'player', pasture.id, null)).toBeNull();
  });
});

describe('quest markers', () => {
  it('a campaign objective site shows its own icon; other objective sites the generic marker', () => {
    expect(questMarkerIcon({ marker: 'evidence' })).toEqual({ id: 'campaignv2.icon.evidence', label: 'Evidence objective', generic: false });
    expect(questMarkerIcon({ marker: 'pact' }).id).toBe('campaignv2.icon.pact');
    expect(questMarkerIcon({ marker: 'supply' }).id).toBe('campaignv2.icon.supply');
    expect(questMarkerIcon({ marker: 'evacuation' }).id).toBe('campaignv2.icon.evacuation');
    expect(questMarkerIcon({})).toEqual({ id: 'icon.marker.quest', label: 'Objective', generic: true });
  });

  it('only open objectives carry a marker, and a hidden site none until the viewer knows it', () => {
    const d = GameDriver.mission('silent_oracle_v2_m01');
    const defs = d.catalog.missions['silent_oracle_v2_m01']!.objectives.filter((o) => o.markerSiteId);
    for (const o of defs) d.state.mission.objectives[o.id]!.status = 'active';
    const all = questMarkerSites(d.catalog, d.state, 'player');
    expect(all.get('so1_post')?.id).toBe('campaignv2.icon.evidence');
    expect(all.get('so1_market')?.id).toBe('campaignv2.icon.pact');
    expect(all.get('so1_olive_stores')?.id).toBe('campaignv2.icon.supply');
    expect(all.get('so1_west_shelter')?.id).toBe('campaignv2.icon.evacuation');
    const done = defs.find((o) => o.markerSiteId === 'so1_post')!;
    d.state.mission.objectives[done.id]!.status = 'completed';
    expect(questMarkerSites(d.catalog, d.state, 'player').has('so1_post')).toBe(defs.some((o) => o !== done && o.markerSiteId === 'so1_post'));
    // A hidden site's marker waits until the viewer has explored or been shown it.
    const sites = d.catalog.missions['silent_oracle_v2_m01']!.sites;
    const hidden = sites.find((s) => s.markerHiddenUntilRevealed && defs.some((o) => o.markerSiteId === s.id));
    if (hidden) {
      d.state.fog['player']!.explored[cellIndex(d.state.world.map, hidden.coord)] = 0;
      d.state.mission.revealedSiteIds = d.state.mission.revealedSiteIds.filter((x) => x !== hidden.id);
      expect(questMarkerSites(d.catalog, d.state, 'player').has(hidden.id)).toBe(false);
    }
  });
});
