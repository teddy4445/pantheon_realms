/**
 * Strategic AI for divine commitments and town services (proposed this build).
 *
 * All decisions go through the same read-only quotes the screens use; the
 * controller submits the resulting commands through the CommandProcessor and
 * falls through on rejection. Scores are documented heuristics, not proven
 * values.
 */
import {
  ARTIFACT_SLOTS,
  hexEquals,
  offeringRule,
  playerTowns,
  quoteArtifactPurchase,
  quoteGodSelection,
  quoteOffering,
  quoteTraining,
  type CommandPayload,
  type ContentCatalog,
  type EffectDefinition,
  type HeroState,
  type MatchState,
  type OfferingLine,
  type PlayerId,
} from '@pr/rules';

/** Rough value of a blessing for an AI empire (higher is better). */
export function effectScore(e: EffectDefinition): number {
  switch (e.type) {
    case 'commander_attribute':
      return e.attribute === 'attack' || e.attribute === 'defense' ? 10 * e.amount : 4 * e.amount;
    case 'morale':
    case 'luck':
      return 8 * e.amount;
    case 'movement_percent':
      return 0.6 * e.percent;
    case 'daily_income':
      return e.resource === 'gold' ? e.amount / 25 : 10 * e.amount;
    case 'weekly_growth_bonus':
      return 4 * e.amount * e.maxTier;
    case 'casualty_recovery':
      return 1.5 * e.percent;
    case 'creature_stat':
      return (e.stat === 'speed' ? 8 : 6) * e.amount * (e.ability || e.maxTier !== undefined || e.minTier !== undefined ? 0.6 : 1);
    case 'vision_radius':
      return 2 * e.amount;
    case 'offering':
      return 5;
    case 'spell_eligibility':
      return 2;
    default:
      return 1;
  }
}

/** Commit to the best legal god (any group), highest blessing score first. */
export function godCandidates(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId): CommandPayload[] {
  const player = belief.players[playerId];
  if (!player) return [];
  const gods = (catalog.pantheons[player.pantheonId]?.godIds ?? [])
    .filter((g) => quoteGodSelection(catalog, belief, playerId, g).legal)
    .map((g) => ({ g, score: catalog.gods[g]!.benefits.reduce((n, e) => n + effectScore(e), 0) }))
    .sort((a, b) => b.score - a.score || (a.g < b.g ? -1 : 1));
  return gods.slice(0, 1).map(({ g }) => ({ kind: 'SelectGod', godId: g }));
}

/** Favor still needed for the cheapest uncommitted designed god group (0 when none is left). */
function favorNeeded(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId): number {
  const player = belief.players[playerId]!;
  const committedGroups = new Set(player.pantheon.minorGodIds.map((g) => catalog.gods[g]?.exclusivityGroup));
  let need = 0;
  for (const g of catalog.pantheons[player.pantheonId]?.godIds ?? []) {
    const def = catalog.gods[g]!;
    if (def.role !== 'minor' || !def.exclusivityGroup || committedGroups.has(def.exclusivityGroup)) continue;
    const q = quoteGodSelection(catalog, belief, playerId, g);
    if (q.state === 'excluded' || q.state === 'undesigned') continue;
    need = Math.max(need, def.favorCost - player.wallet.favor);
  }
  return Math.max(0, need);
}

/**
 * Temple offering when Favor is still needed: the lowest-tier garrison stacks
 * first, then the visiting hero's lowest-tier stack (never its last creature),
 * only as many creatures as the weekly cap can use.
 */
export function offeringCandidates(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, threatened: ReadonlySet<string>): CommandPayload[] {
  const rule = offeringRule(catalog, belief, playerId);
  if (!rule) return [];
  const need = favorNeeded(catalog, belief, playerId);
  if (need <= 0) return [];
  const out: CommandPayload[] = [];
  for (const town of playerTowns(belief, playerId)) {
    if (threatened.has(town.id)) continue;
    const favorGoal = Math.min(rule.maxFavorPerWeek, need);
    let goldGoal = favorGoal * rule.goldPerFavor;
    const pool: { line: Omit<OfferingLine, 'quantity'>; count: number; unit: number; tier: number; keep: number }[] = [];
    town.garrison.slots.forEach((s, slot) => {
      if (!s) return;
      const c = catalog.creatures[s.creatureId]!;
      if (c.tier <= 3) pool.push({ line: { army: { kind: 'garrison', townId: town.id }, slot }, count: s.count, unit: c.cost?.gold ?? 0, tier: c.tier, keep: 0 });
    });
    const visitor = Object.values(belief.heroes).find((h) => h.ownerId === playerId && h.status === 'active' && hexEquals(h.position, town.coord));
    if (visitor) {
      visitor.army.slots.forEach((s, slot) => {
        if (!s) return;
        const c = catalog.creatures[s.creatureId]!;
        if (c.tier <= 2) pool.push({ line: { army: { kind: 'hero', heroId: visitor.id }, slot }, count: s.count, unit: c.cost?.gold ?? 0, tier: c.tier, keep: 1 });
      });
    }
    pool.sort((a, b) => a.tier - b.tier || a.unit - b.unit || (a.line.army.kind === 'garrison' ? -1 : 1));
    const lines: OfferingLine[] = [];
    for (const p of pool) {
      if (goldGoal <= 0 || p.unit <= 0) break;
      const avail = p.count - p.keep;
      if (avail <= 0) continue;
      const qty = Math.min(avail, Math.ceil(goldGoal / p.unit));
      lines.push({ ...p.line, quantity: qty });
      goldGoal -= qty * p.unit;
    }
    if (lines.length === 0) continue;
    const q = quoteOffering(catalog, belief, playerId, town.id, lines);
    // Only worth it when it yields at least half of the goal.
    if (q.legal && q.favor * 2 >= favorGoal) out.push({ kind: 'MakeOffering', townId: town.id, offerings: lines });
  }
  return out;
}

const TRAINING_RESERVE_GOLD = 2500;
const MERCHANT_RESERVE_GOLD = 4000;

/** Train visiting heroes at a Training Academy while keeping a Gold reserve. */
export function trainingCandidates(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, heroes: readonly HeroState[]): CommandPayload[] {
  const out: CommandPayload[] = [];
  const wallet = belief.players[playerId]!.wallet;
  for (const town of playerTowns(belief, playerId)) {
    for (const h of heroes) {
      if (!hexEquals(h.position, town.coord)) continue;
      const q = quoteTraining(catalog, belief, playerId, town.id, h.id);
      if (q.legal && wallet.gold - q.cost.gold >= TRAINING_RESERVE_GOLD) out.push({ kind: 'TrainHero', townId: town.id, heroId: h.id });
    }
  }
  return out;
}

/** Buy an artifact for an empty equipment slot of a visiting hero, the most expensive affordable first. */
export function merchantCandidates(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, heroes: readonly HeroState[]): CommandPayload[] {
  const out: CommandPayload[] = [];
  const wallet = belief.players[playerId]!.wallet;
  for (const town of playerTowns(belief, playerId)) {
    const stock = town.merchant?.stock ?? [];
    for (const h of heroes) {
      if (!hexEquals(h.position, town.coord)) continue;
      const options = stock
        .map((id, index) => ({ id, index }))
        .filter((x): x is { id: string; index: number } => !!x.id && !h.equipment[catalog.artifacts[x.id]!.slot])
        .map((x) => ({ ...x, q: quoteArtifactPurchase(catalog, belief, playerId, town.id, h.id, x.index) }))
        .filter((x) => x.q.legal && wallet.gold - x.q.cost.gold >= MERCHANT_RESERVE_GOLD)
        .sort((a, b) => b.q.cost.gold - a.q.cost.gold || a.index - b.index);
      if (options[0]) out.push({ kind: 'BuyArtifact', townId: town.id, heroId: h.id, index: options[0].index });
    }
  }
  return out;
}

/** Equip backpack items into empty slots (rewards and loot land in the backpack). */
export function equipCandidates(catalog: ContentCatalog, heroes: readonly HeroState[]): CommandPayload[] {
  const out: CommandPayload[] = [];
  for (const h of heroes) {
    const filled = new Set(ARTIFACT_SLOTS.filter((s) => !!h.equipment[s]));
    for (const inst of h.backpack) {
      const slot = catalog.artifacts[inst.artifactId]?.slot;
      if (slot && !filled.has(slot)) {
        filled.add(slot);
        out.push({ kind: 'EquipArtifact', heroId: h.id, instanceId: inst.instanceId });
      }
    }
  }
  return out;
}
