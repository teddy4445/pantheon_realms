import { heroStartingArmy } from './startingArmies';
/**
 * Adventure-map sites added 2026-10-02 (owner request; PROPOSED values, placed by
 * the random-map generator): learning stones, spell shrines, skill trainers,
 * quest huts, key tents and key gates, windmills, treasure chests and prisons —
 * and the neutral reactions (much weaker neutral guards and wandering monsters
 * join a hero for free or flee instead of fighting).
 *
 * Every site is an ordinary SiteDefinition kind; nothing here names a pantheon,
 * hero or creature. Arrival effects run from AdventureSystem.arriveAt; the chest
 * and the quest hut are decided by their own commands.
 */
import type { HeroId, PlayerId, SiteId } from '../ids';
import { axialNeighbors, hexEquals, type HexCoord } from '../core/hex';
import { canAfford, resources } from '../core/resources';
import { RngCursor, seedFromLabel } from '../core/rng';
import type { ContentCatalog } from '../definitions/catalog';
import type { QuestHutQuest, SiteDefinition, StackSpec } from '../definitions/world';
import type { HeroState, MatchState, SiteState } from '../state/match';
import { armyStrength, armyStacks, placementPlan } from '../resolvers/army';
import { effectiveAttributes, maxSpellTierLearnable } from '../resolvers/heroes';
import { heroAt, inMap, missionSite, siteAt, terrainAt } from '../resolvers/world';
import { reject, type RejectionCode, type Tx } from '../engine/tx';
import { clampMovement, grant, spend } from './economy';
import { createRecruitedHero, grantExperience } from './heroes';
import { grantReward } from './quests';
import { bumpTotal } from './stats';
import { worldWeek } from './services';

type Kind<T extends SiteDefinition['kind']['type']> = Extract<SiteDefinition['kind'], { type: T }>;

function refuse(tx: Tx, siteId: SiteId, heroId: HeroId, reason: string): void {
  tx.emit({ kind: 'SiteRefused', siteId, heroId, reason });
}

function markUsed(st: SiteState, heroId: HeroId): void {
  st.usedBy = [...(st.usedBy ?? []), heroId];
}

/** Arrival effects of the new site kinds (no-op for every other kind). */
export function visitWorldSite(tx: Tx, hero: HeroState, def: SiteDefinition, st: SiteState): void {
  const { catalog, state } = tx;
  const k = def.kind;
  switch (k.type) {
    case 'learning_stone': {
      if (st.usedBy?.includes(hero.id)) return refuse(tx, def.id, hero.id, `${hero.name} has already studied at ${def.name}`);
      markUsed(st, hero.id);
      const res = grantExperience(tx, hero.id, k.xp);
      tx.emit({ kind: 'LearningStoneUsed', siteId: def.id, heroId: hero.id, xp: res.granted });
      return;
    }
    case 'spell_shrine': {
      const spell = catalog.spells[k.spellId];
      if (!spell) return;
      if (!hero.spellbook) return refuse(tx, def.id, hero.id, `${hero.name} needs a spellbook to learn ${spell.name}`);
      if (hero.knownSpellIds.includes(spell.id)) return refuse(tx, def.id, hero.id, `${hero.name} already knows ${spell.name}`);
      if (spell.tier > maxSpellTierLearnable(catalog, hero)) return refuse(tx, def.id, hero.id, `${spell.name} is a tier-${spell.tier} spell: ${hero.name} needs more Wisdom`);
      hero.knownSpellIds.push(spell.id);
      markUsed(st, hero.id);
      tx.emit({ kind: 'ShrineSpellLearned', siteId: def.id, heroId: hero.id, spellId: spell.id });
      return;
    }
    case 'skill_trainer': {
      const skill = catalog.skills[k.skillId];
      if (!skill) return;
      if (hero.skills.some((s) => s.skillId === skill.id)) return refuse(tx, def.id, hero.id, `${hero.name} already knows ${skill.name}`);
      if (hero.skills.length >= tx.profile.maxSecondarySkills) return refuse(tx, def.id, hero.id, `${hero.name} has no free skill slot for ${skill.name}`);
      hero.skills.push({ skillId: skill.id, rank: 1 });
      markUsed(st, hero.id);
      tx.emit({ kind: 'SkillTrained', siteId: def.id, heroId: hero.id, skillId: skill.id });
      return;
    }
    case 'key_tent': {
      const player = state.players[hero.ownerId];
      if (!player) return;
      if (player.keys?.includes(k.color)) return;
      player.keys = [...(player.keys ?? []), k.color];
      tx.emit({ kind: 'KeyObtained', siteId: def.id, playerId: hero.ownerId, color: k.color });
      return;
    }
    case 'windmill': {
      const week = worldWeek(state, tx.profile.daysPerWeek);
      if ((st.lastCollectedWeek ?? 0) >= week) return refuse(tx, def.id, hero.id, `${def.name} has already been emptied this week; it turns again next week`);
      st.lastCollectedWeek = week;
      const amount = resources(k.weekly);
      grant(tx, hero.ownerId, amount, def.name);
      tx.emit({ kind: 'WindmillCollected', siteId: def.id, heroId: hero.id, amount, week });
      return;
    }
    case 'prison':
      if (!st.claimed) freePrisoner(tx, hero, def, k, st);
      return;
    default:
      return;
  }
}

// ---------------------------------------------------------------------------
// Prison
// ---------------------------------------------------------------------------


/** The first free passable neighbour of `c` (canonical order) where a freed hero can stand. */
export function freeSpotNear(catalog: ContentCatalog, state: MatchState, c: HexCoord): HexCoord | null {
  const map = state.world.map;
  for (const n of axialNeighbors(c)) {
    if (!inMap(map, n)) continue;
    if (catalog.rulesProfile.terrainCost[terrainAt(map, n)] === null) continue;
    if (heroAt(state, n) || siteAt(catalog, state, n)) continue;
    return n;
  }
  return null;
}

function freePrisoner(tx: Tx, hero: HeroState, def: SiteDefinition, k: Kind<'prison'>, st: SiteState): void {
  const { catalog, state } = tx;
  const prisoner = catalog.heroes[k.heroDefinitionId];
  if (!prisoner) return;
  const owned = Object.values(state.heroes).filter((h) => h.ownerId === hero.ownerId && h.status === 'active').length;
  if (owned >= tx.profile.maxHeroesPerPlayer) return refuse(tx, def.id, hero.id, `${prisoner.name} cannot join: you already lead ${tx.profile.maxHeroesPerPlayer} heroes`);
  if (Object.values(state.heroes).some((h) => h.definitionId === prisoner.id && h.status !== 'defeated')) {
    st.claimed = true;
    return refuse(tx, def.id, hero.id, `${prisoner.name} is already free`);
  }
  const spot = freeSpotNear(catalog, state, def.coord);
  if (!spot) return refuse(tx, def.id, hero.id, `There is no room beside ${def.name} for ${prisoner.name} to stand — clear a neighbouring tile`);
  const escort = heroStartingArmy(catalog, prisoner.id);
  const slots: HeroState['army']['slots'] = Array.from({ length: tx.profile.armySlots }, (_, i) =>
    escort[i] ? { ...escort[i]!, stackId: tx.nextId('stack') } : null,
  );
  const freed = createRecruitedHero(tx, prisoner.id, hero.ownerId, spot, slots);
  freed.movementPoints = 0;
  st.claimed = true;
  tx.emit({ kind: 'PrisonerFreed', siteId: def.id, heroId: freed.id, byHeroId: hero.id });
  // Levels earned in captivity are chosen through the usual level-up decisions.
  const xp = tx.profile.xpThresholds[Math.max(0, Math.min(k.level, tx.profile.xpThresholds.length) - 1)] ?? 0;
  if (xp > 0) grantExperience(tx, freed.id, xp);
}

// ---------------------------------------------------------------------------
// Treasure chest (gold or experience)
// ---------------------------------------------------------------------------

export interface ChestQuote {
  readonly legal: boolean;
  readonly code: RejectionCode | null;
  readonly reason: string | null;
  readonly gold: number;
  readonly xp: number;
}

function standingAt(state: MatchState, playerId: PlayerId, heroId: HeroId, def: SiteDefinition, st: SiteState | undefined): { code: RejectionCode; reason: string } | null {
  const hero = state.heroes[heroId];
  if (!hero || hero.ownerId !== playerId || hero.status !== 'active') return { code: 'not_owner', reason: 'Not your hero' };
  if (!hexEquals(hero.position, def.coord)) return { code: 'not_present', reason: `${hero.name} must stand at ${def.name}` };
  if (!st) return { code: 'not_found', reason: 'Unknown site' };
  if (def.guard && !st.cleared) return { code: 'missing_requirement', reason: 'Its guards still hold the site' };
  if (state.pendingDecisions.some((d) => d.heroId === heroId)) return { code: 'decision_pending', reason: 'Resolve the pending level-up first' };
  return null;
}

export function quoteOpenChest(catalog: ContentCatalog, state: MatchState, playerId: PlayerId, heroId: HeroId, siteId: SiteId): ChestQuote {
  const def = missionSite(catalog, state, siteId);
  const st = state.world.sites[siteId];
  const k = def?.kind.type === 'treasure_chest' ? def.kind : null;
  const base = { gold: k?.gold ?? 0, xp: k?.xp ?? 0 };
  if (!def || !k) return { legal: false, code: 'not_found', reason: 'No treasure chest here', ...base };
  const bad = standingAt(state, playerId, heroId, def, st);
  if (bad) return { legal: false, ...bad, ...base };
  if (st!.claimed) return { legal: false, code: 'already_done', reason: 'The chest is empty', ...base };
  return { legal: true, code: null, reason: null, ...base };
}

export function commitOpenChest(tx: Tx, heroId: HeroId, siteId: SiteId, choice: 'gold' | 'xp'): void {
  const q = quoteOpenChest(tx.catalog, tx.state, tx.actorId, heroId, siteId);
  if (!q.legal) reject(q.code ?? 'illegal_action', q.reason ?? 'Cannot open the chest');
  if (choice !== 'gold' && choice !== 'xp') reject('invalid_command', 'Choose gold or experience');
  const def = missionSite(tx.catalog, tx.state, siteId)!;
  tx.state.world.sites[siteId]!.claimed = true;
  let amount = 0;
  if (choice === 'gold') {
    amount = q.gold;
    grant(tx, tx.actorId, resources({ gold: q.gold }), def.name);
  } else {
    amount = grantExperience(tx, heroId, q.xp).granted;
  }
  tx.emit({ kind: 'ChestOpened', siteId, heroId, choice, amount });
}

// ---------------------------------------------------------------------------
// Quest hut
// ---------------------------------------------------------------------------

/** Whether a player meets a quest hut's quest, with the line shown to players. */
export function questHutProgress(catalog: ContentCatalog, state: MatchState, playerId: PlayerId, quest: QuestHutQuest): { met: boolean; text: string } {
  if (quest.type === 'deliver') {
    const wallet = state.players[playerId]?.wallet ?? resources();
    return { met: canAfford(wallet, resources(quest.resources)), text: 'Bring the resources when you come' };
  }
  const st = state.world.sites[quest.siteId];
  const def = missionSite(catalog, state, quest.siteId);
  const done = !!st?.cleared && st.clearedBy === playerId;
  return { met: done, text: done ? `${quest.label} defeated` : `Defeat the ${quest.label} at ${def?.name ?? 'the marked site'}` };
}

export interface QuestHutQuote {
  readonly legal: boolean;
  readonly code: RejectionCode | null;
  readonly reason: string | null;
}

export function quoteCompleteQuestHut(catalog: ContentCatalog, state: MatchState, playerId: PlayerId, heroId: HeroId, siteId: SiteId): QuestHutQuote {
  const def = missionSite(catalog, state, siteId);
  const st = state.world.sites[siteId];
  if (!def || def.kind.type !== 'quest_hut') return { legal: false, code: 'not_found', reason: 'No quest hut here' };
  const bad = standingAt(state, playerId, heroId, def, st);
  if (bad) return { legal: false, ...bad };
  if (st!.claimed) return { legal: false, code: 'already_done', reason: 'This quest has been fulfilled' };
  const p = questHutProgress(catalog, state, playerId, def.kind.quest);
  if (!p.met) return { legal: false, code: def.kind.quest.type === 'deliver' ? 'insufficient_resources' : 'missing_requirement', reason: def.kind.quest.type === 'deliver' ? 'Not enough resources' : p.text };
  return { legal: true, code: null, reason: null };
}

export function commitCompleteQuestHut(tx: Tx, heroId: HeroId, siteId: SiteId): void {
  const q = quoteCompleteQuestHut(tx.catalog, tx.state, tx.actorId, heroId, siteId);
  if (!q.legal) reject(q.code ?? 'illegal_action', q.reason ?? 'The quest is not fulfilled');
  const def = missionSite(tx.catalog, tx.state, siteId)!;
  const k = def.kind as Kind<'quest_hut'>;
  if (k.quest.type === 'deliver') spend(tx, tx.actorId, resources(k.quest.resources), def.name);
  tx.state.world.sites[siteId]!.claimed = true;
  tx.emit({ kind: 'QuestHutCompleted', siteId, heroId });
  grantReward(tx, tx.actorId, heroId, k.reward, `quest_hut:${siteId}`, def.name);
}

// ---------------------------------------------------------------------------
// Neutral reactions (proposed 2026-10-02; owner answer "Join free or flee")
// ---------------------------------------------------------------------------

/** Neutrals at most 1/2 as strong as the hero's army may not fight unless attacked. */
export const NEUTRAL_FLEE_RATIO = 2;
/** At most 1/3 as strong, they may offer to join for free (when every stack fits the army). */
export const NEUTRAL_JOIN_RATIO = 3;
/**
 * Chances (owner request 2026-10-04: joining a quarter as likely as before,
 * fleeing a third): neutrals who could join offer to with this chance…
 */
export const NEUTRAL_JOIN_CHANCE = 1 / 4;
/** …and neutrals who could flee (or could join but do not) run with this chance; otherwise they fight. */
export const NEUTRAL_FLEE_CHANCE = 1 / 3;

/**
 * The day's draw for one group of neutrals meeting one hero, in [0, 1): a pure
 * function of match, group, hero and day (no RNG state is consumed), so the
 * encounter panel, the AI's estimate and the move itself agree, and asking
 * again the same day gives the same answer.
 */
export function neutralReactionRoll(state: Pick<MatchState, 'matchId' | 'day'>, heroId: HeroId, groupKey: string): number {
  const rng = new RngCursor(seedFromLabel(`neutral|${state.matchId}|${groupKey}|${heroId}|${state.day}`));
  return rng.nextUint32() / 4294967296;
}

export interface NeutralReaction {
  /** 'join': they offer to join (or may be let go); 'flee': they will run; null: they fight. */
  readonly kind: 'join' | 'flee' | null;
  /** Hero strength / their strength (strength heuristic, resolvers/army.ts). */
  readonly ratio: number;
  readonly stacks: StackSpec[];
  readonly siteId: SiteId | null;
  readonly monsterHeroId: HeroId | null;
  readonly reason: string | null;
}

/** The hero's battle strength with its effective Attack and Defense. */
export function heroArmyStrength(catalog: ContentCatalog, state: MatchState, hero: HeroState): number {
  const eff = effectiveAttributes(catalog, state, hero);
  return armyStrength(catalog, armyStacks(hero.army).map((s) => ({ creatureId: s.creatureId, count: s.count })), { attack: eff.attack.total, defense: eff.defense.total });
}

/** How the neutrals at `dest` react to `heroId` (scenario feature `neutralReactions`). */
export function quoteNeutralReaction(catalog: ContentCatalog, state: MatchState, heroId: HeroId, dest: HexCoord): NeutralReaction {
  const none = (reason: string, ratio = 0, stacks: StackSpec[] = [], siteId: SiteId | null = null, monsterHeroId: HeroId | null = null): NeutralReaction => ({ kind: null, ratio, stacks, siteId, monsterHeroId, reason });
  if (state.scenario.features?.neutralReactions !== true) return none('Neutral creatures always fight in this scenario');
  const hero = state.heroes[heroId];
  if (!hero || hero.status !== 'active') return none('Unknown hero');
  const enemy = heroAt(state, dest, heroId);
  let stacks: StackSpec[];
  let siteId: SiteId | null = null;
  let monsterHeroId: HeroId | null = null;
  if (enemy) {
    if (!enemy.monster || enemy.ownerId === hero.ownerId) return none('Only neutral creatures can be scared off');
    stacks = armyStacks(enemy.army).map((s) => ({ creatureId: s.creatureId, count: s.count }));
    monsterHeroId = enemy.id;
  } else {
    const site = siteAt(catalog, state, dest);
    if (!site || !site.def.guard || site.state.cleared || site.def.kind.type === 'town' || site.def.guard.commander) return none('Only neutral creatures can be scared off');
    // A required story fight never disappears through a join or flee (campaign v2).
    if (site.def.guard.required) return none('A story fight: they will not stand aside');
    stacks = (site.state.guard ?? site.def.guard.army).filter((s) => s.count > 0).map((s) => ({ creatureId: s.creatureId, count: s.count }));
    siteId = site.def.id;
  }
  if (stacks.length === 0) return none('Nobody is left to fight', 0, stacks, siteId, monsterHeroId);
  const theirs = armyStrength(catalog, stacks);
  const ratio = theirs > 0 ? heroArmyStrength(catalog, state, hero) / theirs : Number.POSITIVE_INFINITY;
  if (ratio < NEUTRAL_FLEE_RATIO) return none('They are not afraid of your army', ratio, stacks, siteId, monsterHeroId);
  // Sea creatures (`availability: 'sea_encounters'`) never join an army: they may only flee.
  const fits = placementPlan(hero.army, stacks).every((s) => s !== null) && stacks.every((s) => catalog.families[catalog.creatures[s.creatureId]?.familyId ?? '']?.availability !== 'sea_encounters');
  const roll = neutralReactionRoll(state, hero.id, siteId ?? monsterHeroId ?? `${dest.q},${dest.r}`);
  let kind: 'join' | 'flee' | null;
  if (ratio >= NEUTRAL_JOIN_RATIO && fits) kind = roll < NEUTRAL_JOIN_CHANCE ? 'join' : roll < NEUTRAL_JOIN_CHANCE + (1 - NEUTRAL_JOIN_CHANCE) * NEUTRAL_FLEE_CHANCE ? 'flee' : null;
  else kind = roll < NEUTRAL_FLEE_CHANCE ? 'flee' : null;
  if (!kind) return none('They stand their ground today', ratio, stacks, siteId, monsterHeroId);
  return { kind, ratio, stacks, siteId, monsterHeroId, reason: null };
}

/**
 * The neutrals join or flee: the guard is gone (its reward stays for the hero;
 * a monster's bounty too), no battle and no experience. The hero then steps
 * onto the tile as after a won battle.
 */
export function resolveNeutralReaction(tx: Tx, hero: HeroState, dest: HexCoord, r: NeutralReaction, join: boolean): void {
  const { state, catalog } = tx;
  if (r.siteId) {
    const st = state.world.sites[r.siteId]!;
    const def = missionSite(catalog, state, r.siteId)!;
    st.cleared = true;
    st.guard = null;
    st.clearedBy = hero.ownerId;
    if (def.guard) grantReward(tx, hero.ownerId, hero.id, def.guard.reward, `guard:${def.id}`, def.guard.label);
  }
  if (r.monsterHeroId) {
    const m = state.heroes[r.monsterHeroId]!;
    m.status = 'defeated';
    m.army.slots = m.army.slots.map(() => null);
    if (m.monster && tx.applyOnce(`bounty:${m.id}`)) {
      const bounty = resources(m.monster.bounty);
      if (Object.values(bounty).some((v) => v > 0)) grant(tx, hero.ownerId, bounty, `${m.name} fled`);
    }
  }
  if (join) {
    const plan = placementPlan(hero.army, r.stacks);
    r.stacks.forEach((s, i) => {
      const slot = plan[i];
      if (slot === null || slot === undefined) return;
      const existing = hero.army.slots[slot];
      if (existing) existing.count += s.count;
      else hero.army.slots[slot] = { stackId: tx.nextId('stack'), creatureId: s.creatureId, count: s.count };
    });
    bumpTotal(state, hero.ownerId, 'creaturesRecruited', r.stacks.reduce((n, s) => n + s.count, 0));
    tx.emit({ kind: 'NeutralsJoined', heroId: hero.id, siteId: r.siteId, monsterHeroId: r.monsterHeroId, stacks: r.stacks.map((s) => ({ ...s })) });
    clampMovement(tx, hero.id);
  } else {
    tx.emit({ kind: 'NeutralsFled', heroId: hero.id, siteId: r.siteId, monsterHeroId: r.monsterHeroId });
  }
}
