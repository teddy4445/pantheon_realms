/**
 * Hero progression: experience, level-up decisions, spellbooks, spell learning, equipment.
 *
 * Level-ups are real pending decisions (PendingDecision). Offers are rolled once
 * from the saved progression stream and persisted, so reopening never rerolls.
 */
import type { ArtifactId, ArtifactInstanceId, DecisionId, HeroId, SkillId, TownId } from '../ids';
import { type HexCoord } from '../core/hex';
import { resources } from '../core/resources';
import { getArtifact, getHeroClass, type ContentCatalog } from '../definitions/catalog';
import { levelForXp } from '../definitions/rulesProfile';
import { EQUIP_SLOT_KIND, equipSlotsFor, freeEquipSlot, type EquipSlot } from '../definitions/pantheons';
import type { HeroState, LevelUpDecision, MatchState, SkillOffer, TownState } from '../state/match';
import { maxMana, maxSpellTierLearnable, movementBudget, specialtiesEnabled } from '../resolvers/heroes';
import { divineEffects } from '../resolvers/heroes';
import { townHasEffect, townLibrarySpells, townSpellLibraryTier } from '../resolvers/town';
import { reject, type RejectionCode, type Tx } from '../engine/tx';
import { spend } from './economy';
import { scenarioMission, scopeAllowed } from '../resolvers/scenario';
import { imprisonedHeroIds, heroInTown, townVisitor, townGate } from '../resolvers/world';

// ---------------------------------------------------------------------------
// Experience
// ---------------------------------------------------------------------------

/** Grant XP, apply the scenario cap visibly, and queue level-up decisions. */
export function grantExperience(tx: Tx, heroId: HeroId, amount: number): { granted: number; capped: boolean } {
  const hero = tx.state.heroes[heroId];
  if (!hero || amount <= 0) return { granted: 0, capped: false };
  const cap = tx.state.scenario.xpCap;
  let next = hero.xp + amount;
  let capped = false;
  if (cap !== null && next > cap) {
    next = Math.max(hero.xp, cap);
    capped = true;
  }
  const granted = next - hero.xp;
  hero.xp = next;
  tx.emit({ kind: 'ExperienceGranted', heroId, amount: granted, capped, total: hero.xp });
  const earnedLevel = levelForXp(tx.profile, hero.xp);
  const known = hero.level + hero.pendingLevels;
  if (earnedLevel > known) {
    hero.pendingLevels += earnedLevel - known;
    tx.emit({ kind: 'LevelUpPending', heroId, newLevel: earnedLevel });
    ensureLevelUpDecision(tx, hero);
  }
  return { granted, capped };
}

/** Create the next level-up decision for a hero if one is owed and none is open. */
export function ensureLevelUpDecision(tx: Tx, hero: HeroState): void {
  if (hero.pendingLevels <= 0) return;
  if (tx.state.pendingDecisions.some((d) => d.heroId === hero.id)) return;
  const newLevel = hero.level + 1;
  const cls = getHeroClass(tx.catalog, hero.classId);
  const cycle = cls.primaryGainCycle;
  const primaryGain = cycle[(newLevel - 2) % cycle.length] ?? 'attack';
  const offers = rollSkillOffers(tx, hero);
  const decision: LevelUpDecision = {
    decisionId: tx.nextId('decision') as DecisionId,
    kind: 'level_up',
    heroId: hero.id,
    newLevel,
    primaryGain,
    offers,
  };
  tx.state.pendingDecisions.push(decision);
}

/** Skills a hero may be offered: core skills, plus expanded ones of its own pantheon where the scenario allows. */
export function offerableSkillIds(catalog: ContentCatalog, state: MatchState, hero: HeroState): string[] {
  const pantheonId = catalog.heroes[hero.definitionId]?.pantheonId ?? state.players[hero.ownerId]?.pantheonId ?? null;
  return Object.values(catalog.skills)
    .filter((d) => scopeAllowed(state, d.scope) && (!d.pantheonId || d.pantheonId === pantheonId))
    .map((d) => d.id)
    .sort();
}

function rollSkillOffers(tx: Tx, hero: HeroState): SkillOffer[] {
  const profile = tx.profile;
  const skillIds = offerableSkillIds(tx.catalog, tx.state, hero);
  const upgrades: SkillOffer[] = hero.skills
    .filter((s) => s.rank < profile.maxSkillRank)
    .map((s) => ({ kind: 'upgrade' as const, skillId: s.skillId, fromRank: s.rank, toRank: s.rank + 1 }))
    .sort((a, b) => (a.skillId < b.skillId ? -1 : 1));
  const canLearnNew = hero.skills.length < profile.maxSecondarySkills;
  const news: SkillOffer[] = canLearnNew
    ? skillIds
        .filter((id) => !hero.skills.some((s) => s.skillId === id))
        .map((id) => ({ kind: 'new' as const, skillId: id as SkillId, toRank: 1 as const }))
    : [];
  const rng = tx.rng('progression');
  const pick = (pool: SkillOffer[]): SkillOffer | null => {
    if (pool.length === 0) return null;
    const idx = rng.nextInt(pool.length);
    const [chosen] = pool.splice(idx, 1);
    return chosen ?? null;
  };
  const out: SkillOffer[] = [];
  if (upgrades.length > 0 && news.length > 0) {
    out.push(pick(upgrades)!, pick(news)!);
  } else {
    const pool = upgrades.length > 0 ? upgrades : news;
    const a = pick(pool);
    if (a) out.push(a);
    const b = pick(pool);
    if (b) out.push(b);
  }
  return out;
}

export function commitLevelUpChoice(tx: Tx, decisionId: DecisionId, offerIndex: number | null): void {
  const idx = tx.state.pendingDecisions.findIndex((d) => d.decisionId === decisionId);
  const decision = tx.state.pendingDecisions[idx];
  if (!decision) reject('not_found', 'That decision is no longer pending');
  const hero = tx.state.heroes[decision.heroId];
  if (!hero || hero.ownerId !== tx.actorId) reject('not_owner', 'Not your hero');
  let offer: SkillOffer | null = null;
  if (decision.offers.length > 0) {
    if (offerIndex === null || !decision.offers[offerIndex]) reject('invalid_command', 'Choose one of the offered skills');
    offer = decision.offers[offerIndex]!;
  } else if (offerIndex !== null) {
    reject('invalid_command', 'There is no skill choice for this level');
  }
  hero.level = decision.newLevel;
  hero.pendingLevels = Math.max(0, hero.pendingLevels - 1);
  hero.attributes[decision.primaryGain] += 1;
  if (offer) {
    const existing = hero.skills.find((s) => s.skillId === offer!.skillId);
    if (existing) existing.rank = offer.toRank;
    else hero.skills.push({ skillId: offer.skillId, rank: offer.toRank });
  }
  tx.state.pendingDecisions.splice(idx, 1);
  tx.emit({
    kind: 'HeroLeveled',
    heroId: hero.id,
    level: hero.level,
    primaryGain: decision.primaryGain,
    skillId: offer?.skillId ?? null,
    rank: offer?.toRank ?? null,
  });
  ensureLevelUpDecision(tx, hero);
}

// ---------------------------------------------------------------------------
// Spellbooks and spell learning
// ---------------------------------------------------------------------------

export function quoteSpellbook(catalog: ContentCatalog, state: MatchState, heroId: HeroId, townId: TownId) {
  const hero = state.heroes[heroId];
  const town = state.towns[townId];
  const cost = resources({ gold: catalog.rulesProfile.spellbookCost });
  if (!hero || !town) return { legal: false, reason: 'Unknown hero or town', cost };
  if (hero.spellbook) return { legal: false, reason: `${hero.name} already carries a spellbook`, cost };
  if (town.ownerId !== hero.ownerId) return { legal: false, reason: 'Not your town', cost };
  if (!heroInTown(catalog, state, hero, town.id)) return { legal: false, reason: `${hero.name} must be in ${town.name}`, cost };
  if (!townHasEffect(catalog, town, 'enables_spellbook_purchase')) return { legal: false, reason: 'Requires a Sanctum', cost };
  const wallet = state.players[hero.ownerId]?.wallet;
  if (!wallet || wallet.gold < cost.gold) return { legal: false, reason: 'Not enough Gold', cost };
  return { legal: true, reason: null, cost };
}

export function commitBuySpellbook(tx: Tx, heroId: HeroId, townId: TownId): void {
  const hero = tx.state.heroes[heroId];
  if (!hero || hero.ownerId !== tx.actorId) reject('not_owner', 'Not your hero');
  const q = quoteSpellbook(tx.catalog, tx.state, heroId, townId);
  if (!q.legal) reject('illegal_action', q.reason ?? 'Cannot buy a spellbook');
  spend(tx, tx.actorId, q.cost, 'Spellbook');
  hero.spellbook = true;
  tx.emit({ kind: 'SpellbookPurchased', heroId });
  learnSpellsAtTown(tx, hero, tx.state.towns[townId]!);
}

/** One-time known-spell update on an eligible Sanctum visit (free with a spellbook). */
export function learnSpellsAtTown(tx: Tx, hero: HeroState, town: TownState): void {
  if (!hero.spellbook || town.ownerId !== hero.ownerId) return;
  const libraryTier = townSpellLibraryTier(tx.catalog, town);
  if (libraryTier <= 0) return;
  const maxTier = Math.min(libraryTier, maxSpellTierLearnable(tx.catalog, hero));
  const eligibility = new Set(
    divineEffects(tx.catalog, tx.state, hero)
      .filter((e) => e.type === 'spell_eligibility')
      .map((e) => (e.type === 'spell_eligibility' ? e.spellId : '')),
  );
  const learned: string[] = [];
  const library = new Set(townLibrarySpells(tx.catalog, tx.state, town));
  for (const spell of Object.values(tx.catalog.spells).sort((a, b) => (a.id < b.id ? -1 : 1))) {
    if (spell.implementationStatus !== 'implemented') continue;
    if (hero.knownSpellIds.includes(spell.id)) continue;
    if (spell.tier > maxTier) continue;
    if (spell.access === 'god_eligibility' ? !eligibility.has(spell.id) : !library.has(spell.id)) continue;
    if (!scopeAllowed(tx.state, spell.scope)) continue;
    if (spell.pantheonId && spell.pantheonId !== town.pantheonId) continue;
    hero.knownSpellIds.push(spell.id);
    learned.push(spell.id);
  }
  if (learned.length > 0) tx.emit({ kind: 'SpellsLearned', heroId: hero.id, spellIds: learned });
}

// ---------------------------------------------------------------------------
// Artifacts
// ---------------------------------------------------------------------------

/** Grant an artifact: equip into an empty slot, else backpack, else a labeled one-time cache flag. */
export function grantArtifact(tx: Tx, heroId: HeroId, artifactId: ArtifactId): void {
  const hero = tx.state.heroes[heroId];
  if (!hero) return;
  const def = getArtifact(tx.catalog, artifactId);
  const instance = { instanceId: tx.nextId('artifact') as ArtifactInstanceId, artifactId };
  const free = freeEquipSlot(hero.equipment, def.slot);
  if (free) {
    hero.equipment[free] = instance;
    tx.emit({ kind: 'ArtifactGranted', heroId, artifactId, location: 'equipped' });
  } else if (hero.backpack.length < tx.profile.backpackCapacity) {
    hero.backpack.push(instance);
    tx.emit({ kind: 'ArtifactGranted', heroId, artifactId, location: 'backpack' });
  } else {
    tx.state.mission.flags[`cache:${artifactId}`] = true;
    tx.emit({ kind: 'ArtifactGranted', heroId, artifactId, location: 'cache' });
  }
}

/**
 * Equip from the backpack. `slot` picks the paper-doll position (it must hold this
 * kind of artifact); without one the first empty position is used, else the first
 * position of that kind, whose item goes to the backpack (a swap).
 */
export function commitEquip(tx: Tx, heroId: HeroId, instanceId: ArtifactInstanceId, slot?: EquipSlot): void {
  const hero = tx.state.heroes[heroId];
  if (!hero || hero.ownerId !== tx.actorId) reject('not_owner', 'Not your hero');
  const idx = hero.backpack.findIndex((a) => a.instanceId === instanceId);
  const inst = hero.backpack[idx];
  if (!inst) reject('not_found', 'That item is not in the backpack');
  const def = getArtifact(tx.catalog, inst.artifactId);
  if (slot !== undefined && EQUIP_SLOT_KIND[slot] !== def.slot) reject('illegal_action', `${def.name} cannot be worn there`);
  const target = slot ?? freeEquipSlot(hero.equipment, def.slot) ?? equipSlotsFor(def.slot)[0]!;
  const current = hero.equipment[target];
  hero.backpack.splice(idx, 1);
  if (current) hero.backpack.push(current);
  hero.equipment[target] = inst;
  tx.emit({ kind: 'ArtifactEquipped', heroId, artifactId: inst.artifactId });
}

export function commitUnequip(tx: Tx, heroId: HeroId, slot: EquipSlot): void {
  const hero = tx.state.heroes[heroId];
  if (!hero || hero.ownerId !== tx.actorId) reject('not_owner', 'Not your hero');
  if (!(slot in EQUIP_SLOT_KIND)) reject('illegal_action', 'Unknown equipment slot');
  const inst = hero.equipment[slot];
  if (!inst) reject('not_found', 'Nothing equipped in that slot');
  if (hero.backpack.length >= tx.profile.backpackCapacity) reject('no_capacity', 'The backpack is full');
  delete hero.equipment[slot];
  hero.backpack.push(inst);
  tx.emit({ kind: 'ArtifactUnequipped', heroId, artifactId: inst.artifactId });
}

// ---------------------------------------------------------------------------
// Hero hiring (Tavern / Heroes' Lodge)
// ---------------------------------------------------------------------------

/** design/02: a new hero receives 10 of the town pantheon's tier-1 base creature (10 Hoplites for Greek). */
export const HIRE_STARTING_TROOPS = 10;
/** design/04 §9: a retreated hero returns with one tier-1 creature so they can travel. */
export const REHIRE_RETREAT_TROOPS = 1;

export interface HireQuote {
  readonly legal: boolean;
  readonly reason: string | null;
  readonly code: RejectionCode | null;
  readonly cost: ReturnType<typeof resources>;
}

export interface HireCandidate {
  readonly definitionId: string;
  /** Existing retreated/surrendered hero returning from the roster, or null for a new hire. */
  readonly returningHeroId: string | null;
}

/** Tier-1 base creature of a town's archetype (the hiring escort). */
export function townTierOneBase(catalog: ContentCatalog, town: TownState): string | null {
  const archetype = catalog.townArchetypes[town.archetypeId];
  const t1 = archetype?.slots.find((s) => s.kind === 'dwelling' && s.tier === 1);
  const family = t1 ? catalog.buildings[t1.chain[0] ?? '']?.dwelling?.familyId : undefined;
  return family ? (catalog.families[family]?.baseCreatureId ?? null) : null;
}

/**
 * Heroes available at a town's Tavern for `playerId`: scenario-defined new
 * candidates of the town's pantheon that are not already in the match, plus the
 * player's own retreated/surrendered heroes waiting in the return roster.
 */
export function hireOptions(catalog: ContentCatalog, state: MatchState, playerId: string, townId: TownId): HireCandidate[] {
  const town = state.towns[townId];
  if (!town) return [];
  const mission = scenarioMission(catalog, state);
  const pool = mission?.hireableHeroIds ?? catalog.pantheons[town.pantheonId]?.heroIds.filter((id) => catalog.heroes[id]?.availability === 'hireable') ?? [];
  // A defeated hero's name returns to the tavern pool as a new recruit (proposed
  // 2026-10-02; heroless empires used to stall long games once a pool ran dry).
  const inMatch = new Set(Object.values(state.heroes).filter((h) => h.status !== 'defeated').map((h) => h.definitionId));
  // Heroes waiting in a prison on the map are not for hire (random maps).
  for (const id of imprisonedHeroIds(catalog, state)) inMatch.add(id);
  const fresh = pool.filter((id) => catalog.heroes[id]?.pantheonId === town.pantheonId && !inMatch.has(id)).map((id) => ({ definitionId: id, returningHeroId: null }));
  const returning = Object.values(state.heroes)
    .filter((h) => h.ownerId === playerId && h.status === 'retreated')
    .map((h) => ({ definitionId: h.definitionId, returningHeroId: h.id }));
  return [...returning, ...fresh];
}

/** Definition IDs of new (not returning) candidates — kept for UI lists and tests. */
export function hireCandidates(catalog: ContentCatalog, state: MatchState, townId: TownId): string[] {
  const town = state.towns[townId];
  if (!town || !town.ownerId) return [];
  return hireOptions(catalog, state, town.ownerId, townId).filter((c) => !c.returningHeroId).map((c) => c.definitionId);
}

export function quoteHireHero(catalog: ContentCatalog, state: MatchState, playerId: string, townId: TownId, definitionId: string): HireQuote {
  const cost = resources({ gold: catalog.rulesProfile.heroHireCost });
  const fail = (code: RejectionCode, reason: string): HireQuote => ({ legal: false, reason, code, cost });
  const town = state.towns[townId];
  const player = state.players[playerId];
  const def = catalog.heroes[definitionId];
  if (!town || !player || !def) return fail('not_found', 'Unknown town or hero');
  if (!state.scenario.heroHiringEnabled) return fail('not_in_scope', state.scenario.heroHiringDisabledReason ?? 'Hero hiring is not available in this scenario');
  if (town.ownerId !== playerId) return fail('not_owner', 'You do not own this town');
  if (!townHasEffect(catalog, town, 'enables_hero_hiring')) return fail('missing_requirement', 'Requires a Tavern');
  if (!hireOptions(catalog, state, playerId, townId).some((c) => c.definitionId === definitionId)) return fail('illegal_action', `${def.name} is not available for hire`);
  const owned = Object.values(state.heroes).filter((h) => h.ownerId === playerId && h.status === 'active').length;
  if (owned >= catalog.rulesProfile.maxHeroesPerPlayer) return fail('no_capacity', `At most ${catalog.rulesProfile.maxHeroesPerPlayer} heroes`);
  if (townVisitor(catalog, state, town.id)) {
    return fail('not_present', 'The visitor position is occupied — move that hero out first');
  }
  if (player.wallet.gold < cost.gold) return fail('insufficient_resources', 'Not enough Gold');
  return { legal: true, reason: null, code: null, cost };
}

export function commitHireHero(tx: Tx, townId: TownId, definitionId: string): void {
  const q = quoteHireHero(tx.catalog, tx.state, tx.actorId, townId, definitionId);
  if (!q.legal) reject(q.code ?? 'illegal_action', q.reason ?? 'Cannot hire');
  const town = tx.state.towns[townId]!;
  const def = tx.catalog.heroes[definitionId]!;
  const option = hireOptions(tx.catalog, tx.state, tx.actorId, townId).find((c) => c.definitionId === definitionId)!;
  const escortId = townTierOneBase(tx.catalog, town);
  spend(tx, tx.actorId, q.cost, `Hire ${def.name}`);
  const slots = (count: number) =>
    Array.from({ length: tx.profile.armySlots }, (_, i) => (i === 0 && escortId && count > 0 ? { stackId: tx.nextId('stack'), creatureId: escortId, count } : null));

  if (option.returningHeroId) {
    // Return roster: no fresh starting army; the hero starts with zero movement (design/04 §9).
    const hero = tx.state.heroes[option.returningHeroId]!;
    hero.status = 'active';
    hero.position = { ...townGate(tx.catalog, tx.state, town.id) };
    if (!hero.army.slots.some((s) => s && s.count > 0)) hero.army = { slots: slots(REHIRE_RETREAT_TROOPS) };
    hero.movementPoints = 0;
    hero.mana = Math.min(hero.mana, maxMana(tx.catalog, tx.state, hero));
    tx.emit({ kind: 'HeroHired', heroId: hero.id, definitionId, townId });
    learnSpellsAtTown(tx, hero, town);
    return;
  }

  const hero = createRecruitedHero(tx, definitionId, tx.actorId, { ...townGate(tx.catalog, tx.state, town.id) }, slots(HIRE_STARTING_TROOPS));
  tx.emit({ kind: 'HeroHired', heroId: hero.id, definitionId, townId });
  learnSpellsAtTown(tx, hero, town);
}

/**
 * A new level-1 hero of a definition (Tavern hire, freed prisoner): class
 * attributes, skills and spellbook, its specialty spell, full mana and movement.
 */
export function createRecruitedHero(tx: Tx, definitionId: string, ownerId: string, position: HexCoord, army: HeroState['army']['slots']): HeroState {
  const def = tx.catalog.heroes[definitionId]!;
  const cls = getHeroClass(tx.catalog, def.classId);
  const heroId = tx.nextId('hero');
  const hero: HeroState = {
    id: heroId,
    definitionId,
    name: def.name,
    ownerId,
    classId: def.classId,
    portraitAssetId: def.portraitAssetId,
    level: 1,
    xp: 0,
    attributes: { ...cls.startingAttributes },
    skills: cls.startingSkills.map((s) => ({ ...s })),
    spellbook: cls.startsWithSpellbook,
    knownSpellIds: [],
    mana: 0,
    movementPoints: 0,
    position: { q: position.q, r: position.r },
    army: { slots: army },
    equipment: {},
    backpack: [],
    status: 'active',
    pendingLevels: 0,
    lastTrainedWeek: 0,
  };
  tx.state.heroes[heroId] = hero;
  grantSpecialtySpell(tx.catalog, tx.state, hero);
  hero.mana = maxMana(tx.catalog, tx.state, hero);
  hero.movementPoints = movementBudget(tx.catalog, tx.state, hero).total;
  return hero;
}

/** A spell-specialty hero knows its spell from the start when it has a spellbook (idempotent). */
export function grantSpecialtySpell(catalog: ContentCatalog, state: Pick<MatchState, 'scenario'>, hero: HeroState): void {
  if (!specialtiesEnabled(state)) return;
  const spellId = catalog.heroes[hero.definitionId]?.specialty?.spellId;
  if (!spellId || !hero.spellbook || hero.knownSpellIds.includes(spellId) || !catalog.spells[spellId]) return;
  hero.knownSpellIds.push(spellId);
}
