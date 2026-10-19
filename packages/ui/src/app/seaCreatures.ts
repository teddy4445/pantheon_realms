/**
 * What the interface says about a sea creature (sea-creature delivery 2026-10-17): the encounter card
 * on the map, the encyclopedia's sea section and its upgrade comparison. Every fact is read from
 * content data and the rules' resolvers (`creatureMovementClass`, `renewableShotCapacity`, `statsOf`,
 * the sea board's `swimmerShotRangeFloor`), worded for players — never an enum value or an ID on
 * screen. Read-only; no state, no random number.
 */
import {
  SINGLE_SHIP_SEA_ENCOUNTER_V2,
  creatureMovementClass,
  renewableShotCapacity,
  statsOf,
  type ContentCatalog,
  type CreatureDefinition,
  type CreatureFamilyDefinition,
} from '@pr/rules';

export interface SeaCreatureFacts {
  readonly creatureId: string;
  readonly name: string;
  readonly pluralName: string;
  readonly tier: number;
  readonly form: 'Base form' | 'Upgraded form';
  /** Where it comes from, in words. */
  readonly origin: string;
  readonly footprint: string;
  /** "Swims" / "Flies". */
  readonly movement: string;
  /** What that means on the sea board. */
  readonly movementText: string;
  /** The attack's own name (an innate sea attack) or "Melee". */
  readonly attack: string;
  readonly attackText: string;
  /** Range in hexes, null for melee creatures. */
  readonly range: number | null;
  readonly rangeText: string | null;
  /** The renewable-shot rule in words, null when the creature has none. */
  readonly renewable: string | null;
}

/** The family is met only in sea encounters. */
export function isSeaFamily(f: Pick<CreatureFamilyDefinition, 'availability'> | undefined): boolean {
  return f?.availability === 'sea_encounters';
}

/** The creature belongs to a sea family. */
export function isSeaCreature(catalog: ContentCatalog, creatureId: string): boolean {
  const c = catalog.creatures[creatureId];
  return !!c && isSeaFamily(catalog.families[c.familyId]);
}

/** The sea families, weakest tier first. */
export function seaFamilies(catalog: ContentCatalog): CreatureFamilyDefinition[] {
  return Object.values(catalog.families)
    .filter((f) => isSeaFamily(f))
    .sort((a, b) => a.tier - b.tier || (a.name < b.name ? -1 : 1));
}

function renewableAbility(catalog: ContentCatalog, c: CreatureDefinition) {
  return c.abilityIds.map((id) => catalog.abilities[id]).find((a) => a?.rule?.type === 'renewable_shots') ?? null;
}

/** The card facts of one sea creature (null for any other creature). */
export function seaCreatureFacts(catalog: ContentCatalog, creatureId: string): SeaCreatureFacts | null {
  const c = catalog.creatures[creatureId];
  if (!c || !isSeaCreature(catalog, creatureId) || !c.stats) return null;
  const stats = statsOf(catalog, creatureId);
  const cls = creatureMovementClass(catalog, creatureId);
  const shot = renewableAbility(catalog, c);
  const capacity = renewableShotCapacity(catalog, creatureId);
  const floor = SINGLE_SHIP_SEA_ENCOUNTER_V2.sea?.swimmerShotRangeFloor ?? 8;
  const range = stats.range ?? 0;
  const ranged = !!shot && range > 0;
  return {
    creatureId,
    name: c.name,
    pluralName: c.pluralName,
    tier: c.tier,
    form: c.form === 'upgraded' ? 'Upgraded form' : 'Base form',
    origin: 'Neutral sea creature: met only at sea, never recruited, never joins an army.',
    footprint: stats.footprint === 2 ? 'Two hexes' : 'One hex',
    movement: cls === 'fly' ? 'Flies' : cls === 'swim' ? 'Swims' : 'Walks',
    movementText:
      cls === 'fly'
        ? 'Flies over the water and may land on a ship’s deck.'
        : cls === 'swim'
          ? 'Stays in the water: it never comes on deck, and strikes across the rail only at enemies right beside it.'
          : 'Walks on the deck.',
    attack: shot?.name ?? 'Melee',
    attackText: shot ? shot.summary : 'Strikes an adjacent enemy; flies onto the deck to reach the crew.',
    range: ranged ? range : null,
    rangeText: ranged ? `${range} hexes; at least ${floor} at sea whatever the climate. Cannot shoot with an enemy beside it.` : null,
    renewable: capacity !== null ? `${capacity} shots, back to ${capacity} at the start of every round (round 1 too). Each shot is the stack’s whole action; the refill is free.` : null,
  };
}

export interface UpgradeDelta {
  readonly label: string;
  readonly base: string;
  readonly upgraded: string;
  readonly change: 'up' | 'down' | 'same';
}

/** Base versus upgraded form, stat by stat (the encyclopedia's comparison). */
export function seaUpgradeComparison(catalog: ContentCatalog, family: CreatureFamilyDefinition): UpgradeDelta[] {
  const a = catalog.creatures[family.baseCreatureId]?.stats;
  const b = family.upgradedCreatureId ? catalog.creatures[family.upgradedCreatureId]?.stats : undefined;
  if (!a || !b) return [];
  const row = (label: string, x: number, y: number, fmt = (n: number) => String(n)): UpgradeDelta => ({ label, base: fmt(x), upgraded: fmt(y), change: y > x ? 'up' : y < x ? 'down' : 'same' });
  const out = [row('Attack', a.attack, b.attack), row('Defense', a.defense, b.defense), row('Health', a.hp, b.hp)];
  out.push({ label: 'Damage', base: `${a.damageMin}–${a.damageMax}`, upgraded: `${b.damageMin}–${b.damageMax}`, change: b.damageMin + b.damageMax > a.damageMin + a.damageMax ? 'up' : b.damageMin + b.damageMax < a.damageMin + a.damageMax ? 'down' : 'same' });
  out.push(row('Speed', a.speed, b.speed));
  if (a.range || b.range) out.push(row('Range', a.range ?? 0, b.range ?? 0));
  return out;
}
