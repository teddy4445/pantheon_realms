/**
 * Five-resource ledger (rule profile pr-0.2-candidate).
 *
 * Owns: the ResourceBundle value type and pure arithmetic on it.
 * Does not own: wallets (PlayerState owns the only wallet) or prices
 * (content definitions own costs).
 *
 * Values are non-negative integers. The canonical display order is fixed.
 */
export const RESOURCE_KEYS = ['gold', 'wood', 'stone', 'crystal', 'favor'] as const;
export type ResourceKey = (typeof RESOURCE_KEYS)[number];

export type ResourceBundle = Readonly<Record<ResourceKey, number>>;
export type ResourceCost = Readonly<Partial<Record<ResourceKey, number>>>;

export const RESOURCE_LABELS: Readonly<Record<ResourceKey, string>> = {
  gold: 'Gold',
  wood: 'Wood',
  stone: 'Stone',
  crystal: 'Crystal',
  favor: 'Favor',
};

export const EMPTY_RESOURCES: ResourceBundle = { gold: 0, wood: 0, stone: 0, crystal: 0, favor: 0 };

export function resources(partial: ResourceCost = {}): ResourceBundle {
  return {
    gold: partial.gold ?? 0,
    wood: partial.wood ?? 0,
    stone: partial.stone ?? 0,
    crystal: partial.crystal ?? 0,
    favor: partial.favor ?? 0,
  };
}

export function addResources(a: ResourceCost, b: ResourceCost): ResourceBundle {
  const ra = resources(a);
  const rb = resources(b);
  return {
    gold: ra.gold + rb.gold,
    wood: ra.wood + rb.wood,
    stone: ra.stone + rb.stone,
    crystal: ra.crystal + rb.crystal,
    favor: ra.favor + rb.favor,
  };
}

export function subtractResources(a: ResourceCost, b: ResourceCost): ResourceBundle {
  const ra = resources(a);
  const rb = resources(b);
  return {
    gold: ra.gold - rb.gold,
    wood: ra.wood - rb.wood,
    stone: ra.stone - rb.stone,
    crystal: ra.crystal - rb.crystal,
    favor: ra.favor - rb.favor,
  };
}

export function scaleResources(a: ResourceCost, factor: number): ResourceBundle {
  if (!Number.isInteger(factor)) throw new Error('resource scale factor must be an integer');
  const ra = resources(a);
  return {
    gold: ra.gold * factor,
    wood: ra.wood * factor,
    stone: ra.stone * factor,
    crystal: ra.crystal * factor,
    favor: ra.favor * factor,
  };
}

export function canAfford(wallet: ResourceCost, cost: ResourceCost): boolean {
  const w = resources(wallet);
  const c = resources(cost);
  return RESOURCE_KEYS.every((k) => w[k] >= c[k]);
}

/** Resources that are short, as positive amounts. */
export function shortfall(wallet: ResourceCost, cost: ResourceCost): ResourceBundle {
  const w = resources(wallet);
  const c = resources(cost);
  return {
    gold: Math.max(0, c.gold - w.gold),
    wood: Math.max(0, c.wood - w.wood),
    stone: Math.max(0, c.stone - w.stone),
    crystal: Math.max(0, c.crystal - w.crystal),
    favor: Math.max(0, c.favor - w.favor),
  };
}

export function isZeroResources(a: ResourceCost): boolean {
  const r = resources(a);
  return RESOURCE_KEYS.every((k) => r[k] === 0);
}

/** Largest integer n such that n * unit is affordable (unit must be non-zero somewhere). */
export function maxAffordable(wallet: ResourceCost, unit: ResourceCost): number {
  const w = resources(wallet);
  const u = resources(unit);
  let best = Number.POSITIVE_INFINITY;
  for (const k of RESOURCE_KEYS) {
    if (u[k] > 0) best = Math.min(best, Math.floor(w[k] / u[k]));
  }
  return best === Number.POSITIVE_INFINITY ? Number.MAX_SAFE_INTEGER : best;
}

export function formatResources(a: ResourceCost): string {
  const r = resources(a);
  const parts = RESOURCE_KEYS.filter((k) => r[k] !== 0).map((k) => `${r[k].toLocaleString('en-US')} ${RESOURCE_LABELS[k]}`);
  return parts.length === 0 ? 'Free' : parts.join(', ');
}
