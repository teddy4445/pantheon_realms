/**
 * Fixtures for the neutral recruitment, story choice and encyclopedia UI tests
 * (campaign expansion 2026-10-15): a registered content-v2 chapter with the
 * player's hero standing ON a hiring site or a choice site (so selecting the
 * hero's own tile opens it), the map explored, and the treasury, army, stock or
 * flags set for the state under test. An ordinary save envelope, brought in
 * through Load → Import (no privileged hooks).
 */
import { GameDriver } from '@pr/testing';
import { missionSite, type CreatureStackState, type HexCoord, type MissionDefinition, type SiteDefinition } from '@pr/rules';
import { writeSave } from './fixtures';

export interface SiteFixture {
  readonly file: string;
  /** The save's name (the import lists it as "<name> (imported)"). */
  readonly saveName: string;
  readonly heroId: string;
  readonly siteId: string;
  readonly coord: HexCoord;
  readonly d: GameDriver;
}

export interface SiteSetup {
  readonly name: string;
  readonly missionId: string;
  readonly siteId: string;
  /** Treasury amounts to set (the rest kept). */
  readonly wallet?: Partial<Record<'gold' | 'wood' | 'stone' | 'crystal' | 'favor', number>>;
  /** The hero's seven slots (creature ID and count per slot, null empty). */
  readonly army?: ([string, number] | null)[];
  /** The camp's current stock. */
  readonly stock?: number;
  /** Mission flags to set (a pact made, evidence in hand). */
  readonly flags?: readonly string[];
  /** Story scenes already played (e.g. the one that plays on arriving at the site). */
  readonly scenes?: readonly string[];
  /** A site added to the chapter (an ordinary creature camp beside the hero). */
  readonly extraSite?: (d: GameDriver) => SiteDefinition;
}

export function siteFixture(s: SiteSetup): SiteFixture {
  const d = GameDriver.mission(s.missionId, { matchId: `e2e-v2n-${s.name}` });
  for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
  let siteId = s.siteId;
  if (s.extraSite) {
    const site = s.extraSite(d);
    const m = d.catalog.missions[s.missionId]!;
    d.state.customMission = { ...m, sites: [...m.sites, site] } as MissionDefinition;
    d.state.world.sites[site.id] = { siteId: site.id, owner: null, cleared: true, claimed: false, activated: false, visitedBy: [], open: false, guard: null };
    siteId = site.id;
  }
  const site = missionSite(d.catalog, d.state, siteId)!;
  const hero = Object.values(d.state.heroes).find((h) => h.ownerId === d.state.playerOrder[0] && h.status === 'active')!;
  hero.position = { ...site.coord };
  hero.movementPoints = 3000;
  if (s.wallet) Object.assign(d.player.wallet as Record<string, number>, s.wallet);
  if (s.army) {
    const slots: (CreatureStackState | null)[] = s.army.map((x, i) => (x ? { stackId: `e2e-st-${i}`, creatureId: x[0], count: x[1] } : null));
    (hero.army as { slots: (CreatureStackState | null)[] }).slots = slots;
  }
  if (s.stock !== undefined) d.state.world.sites[siteId]!.stock = s.stock;
  for (const f of s.flags ?? []) d.state.mission.flags[f] = true;
  if (s.scenes) d.state.mission.scenesPlayed = [...(d.state.mission.scenesPlayed ?? []), ...s.scenes];
  const saveName = `v2n-${s.name}`;
  return { file: writeSave(d, saveName), saveName, heroId: hero.id, siteId, coord: site.coord, d };
}
