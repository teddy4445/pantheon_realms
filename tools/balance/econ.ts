/**
 * Economy and city-dedication measurements for the balance tool (development only).
 *
 * Collects, per seat, from the events the real rules emit during an all-AI match:
 * divine commitments, city dedications (first and switches), weekly city gifts and
 * extra stock, dawn income, recruitment, the first day of the important buildings,
 * and end-of-match army strength and unrecruited town stock. Reads events and the
 * state only; changes nothing.
 */
import { armyStrength } from '@pr/ai';
import { goldEquivalent, type ContentCatalog, type GameEvent, type MatchState, type PlayerId } from '@pr/rules';

/** First day each important building was reached by a seat (any of its towns). */
export type MilestoneId = 'temple2' | 'civic2' | 'civic3' | 'fort' | 'mage1' | 'dwelling6' | 'dwelling7';
export const MILESTONES: readonly MilestoneId[] = ['temple2', 'civic2', 'civic3', 'fort', 'mage1', 'dwelling6', 'dwelling7'];

export interface SeatEcon {
  readonly playerId: PlayerId;
  readonly pantheon: string;
  readonly patron: string | null;
  /** Committed minor gods with the day (GodSelected). */
  readonly gods: { godId: string; day: number }[];
  /** City dedications: free first ones and paid switches (scheduled), with the day. */
  readonly dedications: { townId: string; godId: string; day: number; kind: 'first' | 'switch' }[];
  /** Weekly city gifts received (resource totals) and their Gold equivalent. */
  readonly gifts: Record<string, number>;
  giftGoldEq: number;
  /** Extra creatures from the favored-family growth, and their base Gold price. */
  devotionAdded: number;
  devotionGold: number;
  /** Dawn income collected (resource totals) and the number of dawns. */
  readonly income: Record<string, number>;
  incomeDays: number;
  /** Creatures recruited in towns: count and catalog Gold value. */
  recruited: number;
  recruitedGold: number;
  readonly milestones: Partial<Record<MilestoneId, number>>;
  /** Army strength and unrecruited town stock on the morning of day 15, day 29 and at the end. */
  readonly snapshots: { tag: string; day: number; army: number; stock: number; stockGold: number; towns: number; dedicatedTowns: number }[];
}

export interface MatchEcon {
  readonly feature: boolean;
  readonly day: number;
  readonly seats: readonly SeatEcon[];
}

const add = (into: Record<string, number>, amount: Readonly<Record<string, number>>) => {
  for (const [k, v] of Object.entries(amount)) if (v) into[k] = (into[k] ?? 0) + v;
};

function milestoneOf(catalog: ContentCatalog, state: MatchState, townId: string, buildingId: string): MilestoneId | null {
  const town = state.towns[townId];
  const def = catalog.buildings[buildingId];
  const slot = town && def ? catalog.townArchetypes[town.archetypeId]?.slots.find((s) => s.id === def.slotId) : undefined;
  if (!def || !slot) return null;
  if (slot.kind === 'dwelling') return def.dwelling?.form === 'base' && slot.tier === 6 ? 'dwelling6' : def.dwelling?.form === 'base' && slot.tier === 7 ? 'dwelling7' : null;
  if (slot.role === 'pantheon_temple' && def.level >= 2) return 'temple2';
  if (slot.role === 'civic_hall') return def.level === 2 ? 'civic2' : def.level === 3 ? 'civic3' : null;
  if (slot.role === 'fortifications' && def.level === 1) return 'fort';
  if (slot.role === 'mage_guild' && def.level === 1) return 'mage1';
  return null;
}

const stacks = (slots: readonly ({ creatureId: string; count: number } | null)[]) => slots.map((x) => (x ? { creatureId: x.creatureId, count: x.count } : null));

export class EconTracker {
  readonly seats: Map<PlayerId, SeatEcon>;
  private readonly marks = new Set<number>();

  constructor(
    private readonly catalog: ContentCatalog,
    state: MatchState,
    seatIds: readonly PlayerId[],
    private readonly snapshotDays: readonly number[] = [15, 29],
  ) {
    this.seats = new Map(
      seatIds.map((id) => {
        const p = state.players[id]!;
        const seat: SeatEcon = { playerId: id, pantheon: p.pantheonId, patron: p.pantheon.patronGodId, gods: [], dedications: [], gifts: {}, giftGoldEq: 0, devotionAdded: 0, devotionGold: 0, income: {}, incomeDays: 0, recruited: 0, recruitedGold: 0, milestones: {}, snapshots: [] };
        return [id, seat];
      }),
    );
  }

  /**
   * Events of one AI turn of `actor` (the turn owner) that began on `startDay`, read
   * against the state after the turn (a dawn inside the turn moves the day on).
   */
  onEvents(events: readonly GameEvent[], actor: PlayerId, startDay: number, state: MatchState): void {
    let day = startDay;
    for (const e of events) {
      switch (e.kind) {
        case 'DayStarted':
          day = e.day;
          break;
        case 'IncomeCollected': {
          const s = this.seats.get(e.playerId);
          if (s) {
            add(s.income, e.amount);
            s.incomeDays++;
          }
          break;
        }
        case 'CityGiftGranted': {
          const s = this.seats.get(e.playerId);
          if (s) {
            add(s.gifts, e.amount);
            s.giftGoldEq += goldEquivalent(e.amount);
          }
          break;
        }
        case 'CityDevotionGrowthApplied': {
          const s = this.seats.get(e.playerId);
          const fam = this.catalog.families[e.familyId];
          if (s && e.added > 0) {
            s.devotionAdded += e.added;
            s.devotionGold += e.added * (fam ? (this.catalog.creatures[fam.baseCreatureId]?.cost?.gold ?? 0) : 0);
          }
          break;
        }
        case 'GodSelected':
          this.seats.get(e.playerId)?.gods.push({ godId: e.godId, day });
          break;
        case 'TownDedicated':
          this.seats.get(e.playerId)?.dedications.push({ townId: e.townId, godId: e.godId, day, kind: 'first' });
          break;
        case 'TownRededicationScheduled':
          this.seats.get(e.playerId)?.dedications.push({ townId: e.townId, godId: e.godId, day, kind: 'switch' });
          break;
        case 'BuildingConstructed': {
          const s = this.seats.get(actor);
          const m = s ? milestoneOf(this.catalog, state, e.townId, e.buildingId) : null;
          if (s && m && s.milestones[m] === undefined) s.milestones[m] = day;
          break;
        }
        case 'UnitsRecruited': {
          const s = this.seats.get(actor);
          if (s) {
            s.recruited += e.quantity;
            s.recruitedGold += e.quantity * (this.catalog.creatures[e.creatureId]?.cost?.gold ?? 0);
          }
          break;
        }
        default:
          break;
      }
    }
  }

  /** Call once per loop step with the current state: takes the morning snapshots. */
  tick(state: MatchState): void {
    for (const day of this.snapshotDays) {
      if (state.day >= day && !this.marks.has(day)) {
        this.marks.add(day);
        this.snapshot(state, `d${day}`);
      }
    }
  }

  snapshot(state: MatchState, tag: string): void {
    for (const s of this.seats.values()) s.snapshots.push({ tag, ...seatSnapshot(this.catalog, state, s.playerId) });
  }

  result(state: MatchState): MatchEcon {
    this.snapshot(state, 'end');
    return { feature: state.scenario.features?.cityDedicationsV1 === true, day: state.day, seats: [...this.seats.values()] };
  }
}

/** Army strength (heroes and garrisons), unrecruited town stock (creatures, base Gold value), towns and dedicated towns. */
export function seatSnapshot(catalog: ContentCatalog, state: MatchState, playerId: PlayerId): Omit<SeatEcon['snapshots'][number], 'tag'> {
  let army = 0;
  let stock = 0;
  let stockGold = 0;
  let towns = 0;
  let dedicatedTowns = 0;
  for (const h of Object.values(state.heroes)) if (h.ownerId === playerId && h.status === 'active') army += armyStrength(catalog, stacks(h.army.slots));
  for (const t of Object.values(state.towns)) {
    if (t.ownerId !== playerId) continue;
    towns++;
    if (t.dedication?.activeGodId && t.dedication.ownerId === playerId) dedicatedTowns++;
    army += armyStrength(catalog, stacks(t.garrison.slots));
    for (const [familyId, n] of Object.entries(t.population)) {
      if (n <= 0) continue;
      const fam = catalog.families[familyId];
      stock += n;
      stockGold += n * (fam ? (catalog.creatures[fam.baseCreatureId]?.cost?.gold ?? 0) : 0);
    }
  }
  return { day: state.day, army: Math.round(army), stock, stockGold, towns, dedicatedTowns };
}
