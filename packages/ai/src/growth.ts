/**
 * Hero development for the strategic AI (owner request 2026-10-02: "AI uses
 * more of the game"): level-up skill choices judged by what the hero and its
 * army can use, artifact loadouts that plan around sets (equip, swap, buy),
 * and adventure spells (movement, scouting, recall).
 *
 * Every number here is a documented heuristic on one scale — about 10 points
 * for one point of commander Attack — not a proven value. All decisions read
 * the belief state and go through the same quotes the screens use.
 */
import {
  EQUIP_SLOTS,
  adventureSpellsOf,
  cellIndex,
  equipSlotsFor,
  hexEquals,
  maxMana,
  playerTowns,
  quoteAdventureSpell,
  quoteArtifactPurchase,
  recallTown,
  visibleCells,
  axialDistance,
  cellsWithin,
  type ArtifactInstanceState,
  type CommandPayload,
  type ContentCatalog,
  type EffectDefinition,
  type EquipSlot,
  type HeroState,
  type MatchState,
  type PlayerId,
  type SkillOffer,
  type SpellDefinition,
  type HexCoord, heroInTown, townGate,
} from '@pr/rules';
import { armyStrength } from './evaluation';

// ---------------------------------------------------------------------------
// Effect values (shared by skills, artifacts and set bonuses)
// ---------------------------------------------------------------------------

/** Rough value of one effect for an AI hero (≈10 per point of commander Attack). */
export function effectValue(e: EffectDefinition, ctx: { spellbook: boolean } = { spellbook: true }): number {
  switch (e.type) {
    case 'commander_attribute':
      return e.attribute === 'attack' || e.attribute === 'defense' ? 10 * e.amount : (ctx.spellbook ? 6 : 2) * e.amount;
    case 'morale':
    case 'luck':
      return 8 * e.amount;
    case 'movement_percent':
      return 0.8 * e.percent;
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
    case 'battle_xp_percent':
      return 0.2 * e.percent;
    case 'mana_regen':
      return (ctx.spellbook ? 2 : 0.3) * e.amount;
    case 'spell_damage_percent':
      return (ctx.spellbook ? 0.4 : 0.05) * e.percent;
    case 'offering':
      return 5;
    case 'spell_eligibility':
      return ctx.spellbook ? 4 : 1;
    case 'spell_power_bonus':
      return (ctx.spellbook ? 3 : 0) * e.amount;
    case 'wounded_fury':
      return 6 * e.attack;
    default:
      return 1;
  }
}

const sumEffects = (effects: readonly EffectDefinition[], ctx: { spellbook: boolean }) => effects.reduce((n, e) => n + effectValue(e, ctx), 0);

/**
 * How much the AI wants a Tavern candidate for its specialty (heuristic): a
 * creature specialty for a family of its own roster by tier, a spell specialty,
 * or a daily income. Equal values keep the roster order.
 */
export function specialtyHireValue(catalog: ContentCatalog, definitionId: string, pantheonId: string): number {
  const sp = catalog.heroes[definitionId]?.specialty;
  if (!sp) return 0;
  if (sp.kind === 'creature') {
    const fam = sp.familyId ? catalog.families[sp.familyId] : undefined;
    return fam && fam.pantheonId === pantheonId ? 4 + fam.tier : 2;
  }
  if (sp.kind === 'spell') return 7;
  const income = sp.effects.find((e) => e.type === 'daily_income');
  if (!income || income.type !== 'daily_income') return 0;
  return income.resource === 'gold' ? income.amount / 25 : income.resource === 'crystal' ? 9 * income.amount : 4 * income.amount;
}

// ---------------------------------------------------------------------------
// Level-up skill choices
// ---------------------------------------------------------------------------

/** Share of the hero's army strength in shooters (0–1). */
function shooterShare(catalog: ContentCatalog, hero: HeroState): number {
  const stacks = hero.army.slots.filter((s): s is NonNullable<typeof s> => !!s && s.count > 0);
  const total = armyStrength(catalog, stacks.map((s) => ({ creatureId: s.creatureId, count: s.count })));
  if (total <= 0) return 0;
  const shooters = armyStrength(
    catalog,
    stacks.filter((s) => (catalog.creatures[s.creatureId]?.stats?.shots ?? 0) > 0).map((s) => ({ creatureId: s.creatureId, count: s.count })),
  );
  return Math.max(0, Math.min(1, shooters / total));
}

/**
 * Value of taking a level-up offer for this hero: the gain from its current rank
 * to the offered rank, judged against the hero's army (archery is worth more with
 * shooters, offense with melee troops) and its magic (wisdom and mana need a
 * spellbook).
 */
export function skillOfferValue(catalog: ContentCatalog, hero: HeroState, offer: SkillOffer): number {
  const skill = catalog.skills[offer.skillId];
  if (!skill) return 0;
  const from = offer.kind === 'upgrade' ? offer.fromRank : 0;
  const to = offer.toRank;
  const at = (arr: readonly number[], rank: number) => (rank <= 0 ? 0 : (arr[rank - 1] ?? arr[arr.length - 1] ?? 0));
  const gain = (arr: readonly number[]) => at(arr, to) - at(arr, from);
  const ranged = shooterShare(catalog, hero);
  const spellbook = hero.spellbook;
  const r = skill.rule;
  let v: number;
  switch (r.type) {
    case 'offense':
      v = 2 * gain(r.percentByRank) * (1 - ranged * 0.7);
      break;
    case 'archery':
      v = 2 * gain(r.percentByRank) * ranged;
      break;
    case 'armorer':
      v = 2 * gain(r.reductionPercentByRank);
      break;
    case 'logistics':
      v = 0.9 * gain(r.percentByRank);
      break;
    case 'leadership':
      v = 8 * gain(r.moraleByRank);
      break;
    case 'fortune':
      v = 8 * gain(r.luckByRank);
      break;
    case 'wisdom':
      v = (spellbook ? 10 : 2) * gain(r.maxSpellTierByRank);
      break;
    case 'scouting':
      v = 3 * gain(r.radiusByRank);
      break;
    case 'tactics':
      v = 5 * gain(r.columnsByRank);
      break;
    case 'effects': {
      const ctx = { spellbook };
      const now = from > 0 ? sumEffects(r.effectsByRank[from - 1] ?? [], ctx) : 0;
      v = sumEffects(r.effectsByRank[to - 1] ?? [], ctx) - now;
      break;
    }
  }
  // A new skill takes one of the limited skill slots: a small premium for upgrades.
  return v + (offer.kind === 'upgrade' ? 1 : 0);
}

/** Pending level-ups of this empire's heroes, each answered with its best-valued offer. */
export function levelUpCandidates(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId): CommandPayload[] {
  const out: CommandPayload[] = [];
  for (const d of belief.pendingDecisions) {
    const hero = belief.heroes[d.heroId];
    if (!hero || hero.ownerId !== playerId) continue;
    if (d.offers.length === 0) {
      out.push({ kind: 'ChooseLevelUp', decisionId: d.decisionId, offerIndex: null });
      continue;
    }
    let best = 0;
    let bestV = -Infinity;
    d.offers.forEach((o, i) => {
      const v = skillOfferValue(catalog, hero, o);
      if (v > bestV) {
        bestV = v;
        best = i;
      }
    });
    out.push({ kind: 'ChooseLevelUp', decisionId: d.decisionId, offerIndex: best });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Artifacts and sets
// ---------------------------------------------------------------------------

/** Value of one artifact on its own (its effects; its price when the effects say little). */
export function artifactValue(catalog: ContentCatalog, artifactId: string, spellbook = true): number {
  const a = catalog.artifacts[artifactId];
  if (!a) return 0;
  return Math.max(sumEffects(a.effects, { spellbook }), (a.merchantPrice?.gold ?? 0) / 300);
}

/**
 * Value of a whole loadout: every item, every set bonus it meets, and a share of
 * the next set bonus for a set that is under way (so the AI keeps collecting a
 * set instead of swapping its pieces for slightly better loose items).
 */
export function loadoutValue(catalog: ContentCatalog, equipped: readonly string[], spellbook = true): number {
  const ctx = { spellbook };
  let v = 0;
  const bySet = new Map<string, number>();
  for (const id of equipped) {
    v += artifactValue(catalog, id, spellbook);
    const setId = catalog.artifacts[id]?.setId;
    if (setId) bySet.set(setId, (bySet.get(setId) ?? 0) + 1);
  }
  for (const [setId, n] of bySet) {
    const set = catalog.artifactSets[setId];
    if (!set) continue;
    for (const b of set.bonuses) {
      if (b.pieces <= n) v += sumEffects(b.effects, ctx);
      else {
        // Progress toward the next bonus: half its value, scaled by how close we are.
        v += 0.5 * sumEffects(b.effects, ctx) * (n / b.pieces);
        break;
      }
    }
  }
  return v;
}

const equippedIds = (eq: Partial<Record<EquipSlot, ArtifactInstanceState | undefined>>) =>
  EQUIP_SLOTS.map((s) => eq[s]?.artifactId).filter((x): x is string => !!x);

/** The best single equip (into an empty slot, or a swap) for a hero, if it improves the loadout. */
function bestEquip(catalog: ContentCatalog, hero: HeroState): { instanceId: string; slot: EquipSlot; gain: number } | null {
  const base = loadoutValue(catalog, equippedIds(hero.equipment), hero.spellbook);
  let best: { instanceId: string; slot: EquipSlot; gain: number } | null = null;
  for (const inst of hero.backpack) {
    const def = catalog.artifacts[inst.artifactId];
    if (!def) continue;
    for (const slot of equipSlotsFor(def.slot)) {
      const next = { ...hero.equipment, [slot]: inst };
      const gain = loadoutValue(catalog, equippedIds(next), hero.spellbook) - base;
      if (gain > 0.5 && (!best || gain > best.gain)) best = { instanceId: inst.instanceId, slot, gain };
    }
  }
  return best;
}

/**
 * Equip from the backpack when it improves the loadout — an empty slot, or a swap
 * when the new piece (with its set) is worth more than the worn one. One equip per
 * hero per plan; the controller re-plans after each command.
 */
export function equipCandidates(catalog: ContentCatalog, heroes: readonly HeroState[]): CommandPayload[] {
  const out: CommandPayload[] = [];
  for (const h of heroes) {
    const b = bestEquip(catalog, h);
    if (b) out.push({ kind: 'EquipArtifact', heroId: h.id, instanceId: b.instanceId, slot: b.slot });
  }
  return out;
}

const MERCHANT_RESERVE_GOLD = 4000;

/**
 * Buy at an Artifact Merchant for a visiting hero: the piece that raises the
 * loadout most per Gold (set pieces count their set), keeping a reserve.
 */
export function merchantCandidates(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, heroes: readonly HeroState[]): CommandPayload[] {
  const out: CommandPayload[] = [];
  const wallet = belief.players[playerId]!.wallet;
  for (const town of playerTowns(belief, playerId)) {
    const stock = town.merchant?.stock ?? [];
    for (const h of heroes) {
      if (!heroInTown(catalog, belief, h, town.id)) continue;
      const base = loadoutValue(catalog, equippedIds(h.equipment), h.spellbook);
      let pick: { index: number; perGold: number; cost: number } | null = null;
      stock.forEach((id, index) => {
        const def = id ? catalog.artifacts[id] : undefined;
        if (!id || !def) return;
        const q = quoteArtifactPurchase(catalog, belief, playerId, town.id, h.id, index);
        if (!q.legal || wallet.gold - q.cost.gold < MERCHANT_RESERVE_GOLD) return;
        let gain = 0;
        for (const slot of equipSlotsFor(def.slot)) {
          const next = { ...h.equipment, [slot]: { instanceId: 'probe', artifactId: id } };
          gain = Math.max(gain, loadoutValue(catalog, equippedIds(next), h.spellbook) - base);
        }
        if (gain <= 2) return;
        const perGold = gain / Math.max(1, q.cost.gold);
        if (!pick || perGold > pick.perGold || (perGold === pick.perGold && q.cost.gold > pick.cost)) pick = { index, perGold, cost: q.cost.gold };
      });
      if (pick) out.push({ kind: 'BuyArtifact', townId: town.id, heroId: h.id, index: (pick as { index: number }).index });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Adventure spells
// ---------------------------------------------------------------------------

function knownAdventureSpell(catalog: ContentCatalog, belief: MatchState, hero: HeroState, type: SpellDefinition['effect']['type']): SpellDefinition | null {
  const spells = adventureSpellsOf(catalog, belief, hero.id).filter((s) => s.effect.type === type);
  // The strongest first (bigger radius or bonus), then the cheapest.
  spells.sort((a, b) => {
    const pa = a.effect.type === 'movement_bonus' ? a.effect.points : a.effect.type === 'reveal_radius' ? a.effect.radius : 0;
    const pb = b.effect.type === 'movement_bonus' ? b.effect.points : b.effect.type === 'reveal_radius' ? b.effect.radius : 0;
    return pb - pa || a.manaCost - b.manaCost;
  });
  return spells[0] ?? null;
}

/** Mana a hero keeps for battle when it knows battle spells (half its maximum). */
function battleReserve(catalog: ContentCatalog, belief: MatchState, hero: HeroState): number {
  const battle = hero.knownSpellIds.some((id) => catalog.spells[id]?.context === 'battle');
  return battle ? Math.floor(maxMana(catalog, belief, hero) / 2) : 0;
}

/**
 * Movement spell: cast when the hero's chosen move falls short of its destination
 * today and the bonus would carry it there (or at least a day's worth closer when
 * the trip is long), keeping a battle reserve of mana.
 */
export function movementSpellCandidate(
  catalog: ContentCatalog,
  belief: MatchState,
  playerId: PlayerId,
  hero: HeroState,
  plannedMove: { readonly destination: HexCoord; readonly totalCost: number; readonly reachesToday: boolean } | null,
): CommandPayload | null {
  if (!plannedMove || plannedMove.reachesToday) return null;
  const spell = knownAdventureSpell(catalog, belief, hero, 'movement_bonus');
  if (!spell || spell.effect.type !== 'movement_bonus') return null;
  if (hero.mana - spell.manaCost < battleReserve(catalog, belief, hero)) return null;
  const short = plannedMove.totalCost - hero.movementPoints;
  if (short > spell.effect.points * 1.5) return null; // the bonus would not change when it arrives
  if (!quoteAdventureSpell(catalog, belief, playerId, hero.id, spell.id, hero.position).legal) return null;
  return { kind: 'CastAdventureSpell', heroId: hero.id, spellId: spell.id, target: hero.position };
}

/**
 * Scouting spell: look at an unseen rival town within two days' march before
 * deciding whether to besiege it (target: the explored tile nearest the town
 * whose reveal covers it).
 */
export function scoutingSpellCandidate(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, hero: HeroState): CommandPayload | null {
  const spell = knownAdventureSpell(catalog, belief, hero, 'reveal_radius');
  if (!spell || spell.effect.type !== 'reveal_radius') return null;
  if (hero.mana - spell.manaCost < battleReserve(catalog, belief, hero)) return null;
  const fog = belief.fog[playerId];
  if (!fog) return null;
  const map = belief.world.map;
  const visible = visibleCells(catalog, belief, playerId);
  const radius = spell.effect.radius;
  const towns = Object.values(belief.towns)
    .filter((t) => t.ownerId && t.ownerId !== playerId && !visible.has(cellIndex(map, t.coord)) && axialDistance(t.coord, hero.position) <= 16)
    .sort((a, b) => axialDistance(a.coord, hero.position) - axialDistance(b.coord, hero.position) || (a.id < b.id ? -1 : 1));
  for (const t of towns) {
    const target = cellsWithin(map, t.coord, radius)
      .filter((c) => fog.explored[cellIndex(map, c)] === 1)
      .sort((a, b) => axialDistance(a, t.coord) - axialDistance(b, t.coord) || a.q - b.q || a.r - b.r)[0];
    if (!target) continue;
    if (quoteAdventureSpell(catalog, belief, playerId, hero.id, spell.id, target).legal) return { kind: 'CastAdventureSpell', heroId: hero.id, spellId: spell.id, target };
  }
  return null;
}

/**
 * Recall: return to a threatened town that has no hero inside when that town is
 * the one the spell leads to and walking there would take more than today.
 */
export function recallSpellCandidate(
  catalog: ContentCatalog,
  belief: MatchState,
  playerId: PlayerId,
  hero: HeroState,
  threatenedTownIds: ReadonlySet<string>,
  walkReachesToday: (townCoord: HexCoord) => boolean,
): CommandPayload | null {
  if (threatenedTownIds.size === 0) return null;
  const spell = knownAdventureSpell(catalog, belief, hero, 'recall');
  if (!spell) return null;
  const town = recallTown(belief, hero);
  if (!town || !threatenedTownIds.has(town.id)) return null;
  if (Object.values(belief.heroes).some((h) => h.status === 'active' && h.ownerId === playerId && heroInTown(catalog, belief, h, town.id))) return null;
  if (walkReachesToday(townGate(catalog, belief, town.id))) return null;
  if (!quoteAdventureSpell(catalog, belief, playerId, hero.id, spell.id, hero.position).legal) return null;
  return { kind: 'CastAdventureSpell', heroId: hero.id, spellId: spell.id, target: hero.position };
}

