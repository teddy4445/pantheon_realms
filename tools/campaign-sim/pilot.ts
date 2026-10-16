/**
 * Mission autopilot for the campaign simulation (development tool; never
 * packaged in the game). It plays the player's seat of a campaign mission:
 * each command it tries first serves an active primary objective — recruit or
 * train the named creatures (building their dwelling first), commit a god,
 * claim, activate, walk to a site, defeat a hero, take a town, resolve the map
 * event that sets a needed flag — and otherwise it plays like the computer
 * empires (the shipped strategic AI: build, recruit, collect, fight).
 *
 * A guarded objective is attacked only when a quick battle on the current state
 * (the same function as the encounter panel) wins; otherwise the pilot keeps
 * building strength, and records the fight as what blocks it. An objective it
 * cannot path to with the map explored is recorded as blocked by a gate or the
 * terrain. Every command goes through the normal command processor.
 */
import {
  axialDistance,
  cellIndex,
  hexEquals,
  parseHexKey,
  processCommand,
  quoteActivation,
  quoteConstruction,
  quoteSluice,
  quoteCovenantAssignment,
  quoteGodSelection,
  quoteMovement,
  quoteRecruitment,
  quoteTrade,
  quoteTransfer,
  quoteUpgrade,
  reachableTiles,
  recruitableCreatureIds,
  requireScenarioMission,
  townSlots,
  heroInTown,
  movementTarget,
  type CommandPayload,
  type ContentCatalog,
  type GameCommand,
  type HexCoord,
  type MatchState,
  type ObjectiveCondition,
  type PlayerId,
} from '@pr/rules';
import { buildObservation, levelUpCandidates, runQuickBattle, stepBattleAI, strategicCandidates } from '@pr/ai';
import { fightingStrength, heroPower } from '@pr/ai';

export type BlockKind = 'fight' | 'unreachable' | 'resources' | 'building' | 'favor' | 'other';

export interface PilotBlock {
  readonly objectiveId: string;
  readonly kind: BlockKind;
  readonly detail: string;
  /** Strength of the hero ÷ strength of the army in the way (fights only). */
  readonly ratio?: number;
}

export interface PilotMemory {
  /** The latest reason each active objective could not be advanced, by objective. */
  readonly blocks: Map<string, PilotBlock>;
  readonly days: { battlesWon: number; battlesLost: number };
  /** Every battle of the player's: its label, whether it was won, and the share of the army's Gold value lost. */
  readonly battles: { label: string; won: boolean; lossShare: number; day: number }[];
  /** The town the main hero is walking back to for troops (after a fight it would lose), if any. */
  fetchTown?: string;
}

export function newPilotMemory(): PilotMemory {
  return { blocks: new Map(), days: { battlesWon: 0, battlesLost: 0 }, battles: [] };
}

interface Ctx {
  readonly catalog: ContentCatalog;
  readonly state: MatchState;
  readonly playerId: PlayerId;
  readonly heroId: string;
  readonly mem: PilotMemory;
  readonly out: Tagged[];
  readonly objectiveId: string;
  /** Resources an objective is waiting for (activation costs): not to be spent elsewhere. */
  readonly reserve: Record<string, number>;
}

export interface Tagged {
  readonly payload: CommandPayload;
  readonly objectiveId: string | null;
}

const push = (c: Ctx, payload: CommandPayload) => c.out.push({ payload, objectiveId: c.objectiveId });

const block = (c: Ctx, kind: BlockKind, detail: string, ratio?: number) => c.mem.blocks.set(c.objectiveId, { objectiveId: c.objectiveId, kind, detail, ...(ratio !== undefined ? { ratio } : {}) });

/** The protagonist: the mission's own hero if it is still in play, else the player's strongest hero. */
export function mainHeroOf(catalog: ContentCatalog, state: MatchState, playerId: PlayerId): string | null {
  const mission = requireScenarioMission(catalog, state);
  const own = mission.player.hero?.heroId;
  if (own && state.heroes[own]?.status === 'active') return own;
  let best: { id: string; s: number } | null = null;
  for (const h of Object.values(state.heroes)) {
    if (h.ownerId !== playerId || h.status !== 'active') continue;
    const s = heroPower(catalog, state, h);
    if (!best || s > best.s) best = { id: h.id, s };
  }
  return best?.id ?? null;
}

function myTowns(state: MatchState, playerId: PlayerId) {
  return Object.values(state.towns)
    .filter((t) => t.ownerId === playerId)
    .sort((a, b) => (a.id < b.id ? -1 : 1));
}

/** Build toward `buildingId` in the first town of the player that has its location: the next level, else a missing prerequisite (depth 3). */
function buildToward(c: Ctx, buildingId: string, depth = 0): boolean {
  const bd = c.catalog.buildings[buildingId];
  if (!bd || depth > 3) return false;
  for (const town of myTowns(c.state, c.playerId)) {
    const slot = townSlots(c.catalog, town).find((x) => x.id === bd.slotId && x.chain.includes(buildingId));
    if (!slot) continue;
    const level = town.buildings[slot.id] ?? 0;
    if (level >= bd.level) return false; // built
    const next = slot.chain[level]!;
    const q = quoteConstruction(c.catalog, c.state, c.playerId, town.id, next);
    if (q.legal) {
      push(c, { kind: 'BuildStructure', townId: town.id, buildingId: next });
      return true;
    }
    for (const r of c.catalog.buildings[next]?.requirements ?? []) if (r.type === 'has_building' && buildToward(c, r.buildingId, depth + 1)) return true;
    block(c, town.buildUsedDay === c.state.day ? 'building' : 'resources', `${q.reason ?? 'cannot build'} (${c.catalog.buildings[next]?.name ?? next})`);
    return false;
  }
  return false;
}

/** Build the next level of the dwelling that houses `creatureId` (its base, or its upgraded form). */
function buildDwellingFor(c: Ctx, creatureId: string): boolean {
  const def = c.catalog.creatures[creatureId];
  if (!def) return false;
  for (const town of myTowns(c.state, c.playerId)) {
    for (const slot of townSlots(c.catalog, town)) {
      const idx = slot.chain.findIndex((b) => {
        const bd = c.catalog.buildings[b];
        return !!bd?.dwelling && bd.dwelling.familyId === def.familyId && (def.form === 'upgraded' ? bd.dwelling.form === 'upgraded' : true);
      });
      if (idx < 0) continue;
      const level = town.buildings[slot.id] ?? 0;
      if (level > idx) continue; // already built
      const next = slot.chain[level];
      if (!next) continue;
      const q = quoteConstruction(c.catalog, c.state, c.playerId, town.id, next);
      if (q.legal) {
        push(c, { kind: 'BuildStructure', townId: town.id, buildingId: next });
        return true;
      }
      // A prerequisite elsewhere in the town: try every legal build that is a requirement of `next`.
      const reqs = (c.catalog.buildings[next]?.requirements ?? []).flatMap((r) => (r.type === 'has_building' ? [r.buildingId] : []));
      for (const rb of reqs) {
        const rdef = c.catalog.buildings[rb];
        if (!rdef) continue;
        const s2 = townSlots(c.catalog, town).find((x) => x.id === rdef.slotId);
        const lvl2 = s2 ? (town.buildings[s2.id] ?? 0) : 0;
        const nb = s2?.chain[lvl2];
        if (nb && quoteConstruction(c.catalog, c.state, c.playerId, town.id, nb).legal) {
          push(c, { kind: 'BuildStructure', townId: town.id, buildingId: nb });
          return true;
        }
      }
      block(c, town.buildUsedDay === c.state.day ? 'building' : 'resources', `${q.reason ?? 'cannot build'} (${c.catalog.buildings[next]?.name ?? next})`);
      return false;
    }
  }
  return false;
}

/** Recruit `creatureId` (into the main hero when it is in that town, else the garrison). */
function recruit(c: Ctx, creatureId: string, toHero: boolean): boolean {
  const hero = c.state.heroes[c.heroId];
  for (const town of myTowns(c.state, c.playerId)) {
    if (!recruitableCreatureIds(c.catalog, town).includes(creatureId)) continue;
    const inTown = !!hero && heroInTown(c.catalog, c.state, hero, town.id);
    if (toHero && !inTown) {
      goTo(c, town.coord, false);
      return true;
    }
    const dest = inTown ? { kind: 'hero' as const, heroId: c.heroId } : { kind: 'garrison' as const };
    const q = quoteRecruitment(c.catalog, c.state, c.playerId, town.id, creatureId, 1, dest);
    if (q.maxQuantity > 0) {
      push(c, { kind: 'RecruitUnits', townId: town.id, creatureId, quantity: q.maxQuantity, destination: dest });
      return true;
    }
    block(c, 'resources', `cannot recruit ${creatureId}: ${q.reason ?? 'none available'}`);
    return false;
  }
  return buildDwellingFor(c, creatureId);
}

/** Upgrade `baseId` creatures (in the main hero, in a town with the upgraded dwelling). */
function train(c: Ctx, baseId: string): boolean {
  const base = c.catalog.creatures[baseId];
  const upId = base?.upgradeId;
  if (!upId) return false;
  const hero = c.state.heroes[c.heroId];
  if (!hero) return false;
  const slot = hero.army.slots.findIndex((s) => s?.creatureId === baseId);
  for (const town of myTowns(c.state, c.playerId)) {
    if (!recruitableCreatureIds(c.catalog, town).includes(upId)) continue;
    if (slot < 0) return recruit(c, baseId, true);
    if (!heroInTown(c.catalog, c.state, hero, town.id)) {
      goTo(c, town.coord, false);
      return true;
    }
    const q = quoteUpgrade(c.catalog, c.state, c.playerId, town.id, { kind: 'hero', heroId: c.heroId }, slot, 1);
    if (q.maxQuantity > 0) {
      push(c, { kind: 'UpgradeStack', townId: town.id, army: { kind: 'hero', heroId: c.heroId }, slot, quantity: q.maxQuantity });
      return true;
    }
    block(c, 'resources', `cannot train ${baseId}: ${q.reason ?? 'not affordable'}`);
    return false;
  }
  return buildDwellingFor(c, upId);
}

/** Walk the main hero toward `dest`; fight there only when the quick battle wins. */
function goTo(c: Ctx, dest: HexCoord, fight: boolean): boolean {
  const hero = c.state.heroes[c.heroId];
  if (!hero || hero.movementPoints <= 0) return false;
  const target = movementTarget(c.catalog, c.state, dest);
  if (hexEquals(hero.position, target)) return false;
  const q = quoteMovement(c.catalog, c.state, c.heroId, target);
  if (!q.reachable) {
    // Content v2: a ferry landing whose far side is nearer the target (a route connector).
    const mission = requireScenarioMission(c.catalog, c.state);
    const here0 = axialDistance(hero.position, target);
    for (const s of mission.sites) {
      if (s.kind.type !== 'portal') continue;
      if (s.kind.requiresFlag && !c.state.mission.flags[s.kind.requiresFlag]) continue;
      const exit = mission.sites.find((x) => x.id === (s.kind as { exitSiteId: string }).exitSiteId);
      if (!exit || axialDistance(exit.coord, target) >= here0 - 1 || hexEquals(hero.position, s.coord)) continue;
      const pq = quoteMovement(c.catalog, c.state, c.heroId, s.coord);
      if (pq.reachable && pq.stopIndex >= 0 && !pq.endsInEncounter) {
        push(c, { kind: 'MoveHero', heroId: c.heroId, destination: s.coord });
        return true;
      }
    }
    const fog = c.state.fog[c.playerId];
    const known = !fog || fog.explored[cellIndex(c.state.world.map, target)] === 1;
    // Explore toward it: the reachable tile nearest to it with no fight on the way.
    const here = axialDistance(hero.position, target);
    const options = [...reachableTiles(c.catalog, c.state, c.heroId)]
      .map(([k, cost]) => ({ p: parseHexKey(k), sc: axialDistance(parseHexKey(k), target) + cost / 100000 }))
      .filter((o) => o.sc < here)
      .sort((a, b) => a.sc - b.sc);
    for (const o of options.slice(0, 10)) {
      const mq = quoteMovement(c.catalog, c.state, c.heroId, o.p);
      if (mq.reachable && !mq.endsInEncounter && mq.stopIndex >= 0) {
        push(c, { kind: 'MoveHero', heroId: c.heroId, destination: o.p });
        if (known) block(c, 'unreachable', `no path to ${target.q},${target.r} (explored)`);
        return true;
      }
    }
    block(c, 'unreachable', `no path to ${target.q},${target.r}${known ? '' : ' (unexplored)'}`);
    return false;
  }
  if (q.stopIndex < 0) return false;
  const arrivesInFight = q.endsInEncounter && q.stopIndex === q.path.length - 1;
  if (q.endsInEncounter && !arrivesInFight) {
    // Approach, stopping short of the fight; it is judged on arrival day.
    push(c, { kind: 'MoveHero', heroId: c.heroId, destination: target });
    return true;
  }
  if (arrivesInFight) {
    if (!fight) return false;
    const payload: CommandPayload = { kind: 'MoveHero', heroId: c.heroId, destination: target, confirmEncounter: true };
    const run = runQuickBattle(c.catalog, c.state, c.playerId, payload, undefined, { playerSimulation: true });
    if (run.ok && run.result.winner === (run.result.attacker.playerId === c.playerId ? 'attacker' : 'defender')) {
      push(c, payload);
      return true;
    }
    const mine = heroPower(c.catalog, c.state, hero);
    const enemy = run.ok ? run.result.defender.lines.reduce((n, l) => n + fightingStrength(c.catalog, [{ creatureId: l.creatureId, count: l.before }]), 0) : 0;
    block(c, 'fight', `${q.encounterLabel ?? 'a fight'} would be lost`, enemy > 0 ? mine / enemy : undefined);
    // As a person would: fetch the garrison and buy what the towns offer before trying again.
    return strengthen(c);
  }
  push(c, { kind: 'MoveHero', heroId: c.heroId, destination: target, confirmEncounter: q.endsInEncounter });
  return true;
}

/**
 * A fight the main hero would lose: gather the empire's strength in it first —
 * the town garrison (only when no rival empire could take the town) and every
 * creature its towns sell, the best first; walk home for them when away.
 */
function strengthen(c: Ctx): boolean {
  const hero = c.state.heroes[c.heroId];
  if (!hero) return false;
  const towns = myTowns(c.state, c.playerId);
  const rivals = (requireScenarioMission(c.catalog, c.state).rivals ?? []).length > 0;
  const toHero = { kind: 'hero' as const, heroId: c.heroId };
  const best = (ids: string[]) => [...ids].sort((a, b) => (c.catalog.creatures[b]?.tier ?? 0) - (c.catalog.creatures[a]?.tier ?? 0) || Number(c.catalog.creatures[b]?.form === 'upgraded') - Number(c.catalog.creatures[a]?.form === 'upgraded'));
  const buyable = (townId: string, dest: { kind: 'hero'; heroId: string } | { kind: 'garrison' }) =>
    best(recruitableCreatureIds(c.catalog, c.state.towns[townId]!)).find((id) => quoteRecruitment(c.catalog, c.state, c.playerId, townId, id, 1, dest).maxQuantity > 0);
  for (const town of towns) {
    if (!heroInTown(c.catalog, c.state, hero, town.id)) continue;
    if (!rivals) {
      for (let i = 0; i < town.garrison.slots.length; i++) {
        const st = town.garrison.slots[i];
        if (!st || st.count <= 0) continue;
        const same = hero.army.slots.findIndex((x) => x?.creatureId === st.creatureId);
        const slot = same >= 0 ? same : hero.army.slots.findIndex((x) => !x);
        if (slot < 0) break;
        const from = { kind: 'garrison' as const, townId: town.id };
        if (quoteTransfer(c.catalog, c.state, c.playerId, from, i, toHero, slot, st.count).legal) {
          push(c, { kind: 'TransferStack', from, fromSlot: i, to: toHero, toSlot: slot, quantity: st.count });
          return true;
        }
      }
    }
    const id = buyable(town.id, toHero);
    if (id) {
      push(c, { kind: 'RecruitUnits', townId: town.id, creatureId: id, quantity: quoteRecruitment(c.catalog, c.state, c.playerId, town.id, id, 1, toHero).maxQuantity, destination: toHero });
      return true;
    }
    return false;
  }
  for (const town of towns) {
    const garrison = !rivals && town.garrison.slots.some((x) => !!x && x.count > 0);
    if (garrison || buyable(town.id, { kind: 'garrison' })) {
      // Keep walking there until the troops are fetched (pilotCandidates), not back and forth.
      c.mem.fetchTown = town.id;
      return goTo(c, town.coord, false);
    }
  }
  return false;
}

/** Wait for, or buy at a market, what an activation costs; nothing else may spend it meanwhile. */
function gather(c: Ctx, cost: Partial<Record<string, number>>, what: string): boolean {
  const wallet = c.state.players[c.playerId]!.wallet as unknown as Record<string, number>;
  for (const [k, v] of Object.entries(cost)) c.reserve[k] = Math.max(c.reserve[k] ?? 0, v ?? 0);
  for (const [k, v] of Object.entries(cost)) {
    const lack = (v ?? 0) - (wallet[k] ?? 0);
    if (lack <= 0 || k === 'gold' || k === 'favor') continue;
    for (const town of myTowns(c.state, c.playerId)) {
      if (quoteTrade(c.catalog, c.state, c.playerId, town.id, 'gold', k as 'wood', lack).legal) {
        push(c, { kind: 'TradeResources', townId: town.id, sell: 'gold', buy: k as 'wood', amount: lack });
        return true;
      }
    }
  }
  const missing = Object.entries(cost).filter(([k, v]) => (wallet[k] ?? 0) < (v ?? 0)).map(([k, v]) => `${v} ${k} (have ${wallet[k] ?? 0})`);
  block(c, missing.some((m) => m.includes('favor')) ? 'favor' : 'resources', `${what}: needs ${missing.join(', ')}`);
  return false;
}

function siteCoord(c: Ctx, siteId: string): HexCoord | null {
  return requireScenarioMission(c.catalog, c.state).sites.find((s) => s.id === siteId)?.coord ?? null;
}

/**
 * Sites that set `flag`: an activation's reward or a map-event option (content v1), and
 * for content v2 a guard's reward (clear it), a pickup's reward (visit it), a sluice's
 * open flag (operate it) and a quest hut's reward.
 */
function flagSources(c: Ctx, flag: string): { siteId: string; option: number | null; how?: 'clear' | 'visit' | 'sluice' }[] {
  const out: { siteId: string; option: number | null; how?: 'clear' | 'visit' | 'sluice' }[] = [];
  const flags = c.state.mission.flags;
  for (const s of requireScenarioMission(c.catalog, c.state).sites) {
    if (s.kind.type === 'activation' && (s.kind.reward.flags ?? []).includes(flag)) out.push({ siteId: s.id, option: null });
    if (s.kind.type === 'map_event')
      s.kind.options.forEach((o, i) => (o.reward.flags ?? []).includes(flag) && (o.requiresFlags ?? []).every((f) => flags[f]) && out.push({ siteId: s.id, option: i }));
    if (s.guard && (s.guard.reward.flags ?? []).includes(flag)) out.push({ siteId: s.id, option: null, how: 'clear' });
    if ((s.kind.type === 'pickup' || s.kind.type === 'quest_hut') && (s.kind.reward.flags ?? []).includes(flag)) out.push({ siteId: s.id, option: null, how: 'visit' });
    if (s.kind.type === 'sluice' && s.kind.openFlag === flag) out.push({ siteId: s.id, option: null, how: 'sluice' });
  }
  return out;
}

/** Commands that advance `cond`; true when one was proposed. */
function pursue(c: Ctx, cond: ObjectiveCondition): boolean {
  const st = c.state;
  switch (cond.type) {
    case 'counter_at_least': {
      if ((st.mission.counters[cond.counter] ?? 0) >= cond.value) return false;
      const [what, creatureId] = cond.counter.split(':');
      if (what === 'recruited' && creatureId) return recruit(c, creatureId, false);
      if (what === 'trained' && creatureId) return train(c, creatureId);
      return false;
    }
    case 'site_cleared': {
      if (st.world.sites[cond.siteId]?.cleared) return false;
      const at = siteCoord(c, cond.siteId);
      return at ? goTo(c, at, true) : false;
    }
    case 'site_visited': {
      if ((st.world.sites[cond.siteId]?.visitedBy ?? []).includes(c.playerId)) return false;
      const at = siteCoord(c, cond.siteId);
      return at ? goTo(c, at, true) : false;
    }
    case 'site_activated': {
      if (st.world.sites[cond.siteId]?.activated) return false;
      const at = siteCoord(c, cond.siteId);
      if (!at) return false;
      const hero = st.heroes[c.heroId];
      if (hero && hexEquals(hero.position, at)) {
        const q = quoteActivation(c.catalog, st, c.heroId, cond.siteId);
        if (q.legal) {
          push(c, { kind: 'ActivateSite', heroId: c.heroId, siteId: cond.siteId });
          return true;
        }
        if (q.reason === 'Not enough resources') return gather(c, q.cost, `activate ${cond.siteId}`);
        block(c, 'other', `activate ${cond.siteId}: ${q.reason}`);
        return false;
      }
      // Keep what it will cost.
      const def = requireScenarioMission(c.catalog, st).sites.find((x) => x.id === cond.siteId);
      if (def?.kind.type === 'activation') for (const [k, v] of Object.entries(def.kind.cost)) c.reserve[k] = Math.max(c.reserve[k] ?? 0, v ?? 0);
      return goTo(c, at, true);
    }
    case 'hero_defeated': {
      const prey = Object.values(st.heroes).find((h) => h.definitionId === cond.heroDefinitionId && h.status === 'active');
      if (!prey) return false;
      // Hidden prey: walk to where it was last seen is not known to the player; use its position only when visible.
      return goTo(c, prey.position, true);
    }
    case 'town_owned': {
      const town = st.towns[cond.townId];
      if (!town || town.ownerId === c.playerId) return false;
      return goTo(c, town.coord, true);
    }
    case 'player_has_minor_god': {
      const player = st.players[c.playerId]!;
      if (player.pantheon.minorGodIds.length >= (cond.count ?? 1)) return false;
      const gods = (c.catalog.pantheons[player.pantheonId]?.godIds ?? []).filter((g) => g !== player.pantheon.patronGodId && !player.pantheon.minorGodIds.includes(g));
      const reasons: string[] = [];
      for (const g of gods) {
        const q = quoteGodSelection(c.catalog, st, c.playerId, g);
        if (q.legal) {
          push(c, { kind: 'SelectGod', godId: g });
          return true;
        }
        if (q.reason !== 'Not available in this mission') reasons.push(`${c.catalog.gods[g]?.name}: ${q.reason}`);
      }
      // Build what a committable god asks for (a temple level, usually).
      for (const g of gods) {
        if (quoteGodSelection(c.catalog, st, c.playerId, g).reason === 'Not available in this mission') continue;
        for (const r of c.catalog.gods[g]?.requirements ?? []) if (r.type === 'has_building' && buildToward(c, r.buildingId)) return true;
      }
      block(c, reasons.some((r) => /Favor/i.test(r)) ? 'favor' : 'other', `no god can be chosen yet (Favor ${player.wallet.favor}; ${reasons.join('; ')})`);
      return false;
    }
    case 'hero_army_contains': {
      const hero = st.heroes[cond.heroId];
      const have = hero?.army.slots.reduce((n, s) => n + (s?.creatureId === cond.creatureId ? s.count : 0), 0) ?? 0;
      if (have >= cond.count) return false;
      const base = Object.values(c.catalog.creatures).find((x) => x.upgradeId === cond.creatureId);
      if (base && !hero?.army.slots.some((s) => s?.creatureId === cond.creatureId) && hero?.army.slots.some((s) => s?.creatureId === base.id)) {
        if (train(c, base.id)) return true;
      }
      return recruit(c, cond.creatureId, true);
    }
    case 'flag': {
      if (st.mission.flags[cond.flag]) return false;
      for (const src of flagSources(c, cond.flag)) {
        const at = siteCoord(c, src.siteId);
        if (!at) continue;
        const hero = st.heroes[c.heroId];
        if (src.how === 'clear') {
          if (pursue(c, { type: 'site_cleared', siteId: src.siteId })) return true;
          continue;
        }
        if (src.how === 'visit') {
          if (!st.world.sites[src.siteId]?.claimed && goTo(c, at, true)) return true;
          continue;
        }
        if (src.how === 'sluice') {
          if (hero && hexEquals(hero.position, at)) {
            if (quoteSluice(c.catalog, st, c.heroId, src.siteId).legal) {
              push(c, { kind: 'OperateSluice', heroId: c.heroId, siteId: src.siteId });
              return true;
            }
            continue;
          }
          if (goTo(c, at, true)) return true;
          continue;
        }
        if (src.option !== null && hero && hexEquals(hero.position, at) && !st.world.sites[src.siteId]?.claimed) {
          push(c, { kind: 'ResolveMapEvent', heroId: c.heroId, siteId: src.siteId, optionIndex: src.option });
          return true;
        }
        if (src.option === null) {
          if (pursue(c, { type: 'site_activated', siteId: src.siteId })) return true;
        } else if (!st.world.sites[src.siteId]?.claimed && goTo(c, at, true)) return true;
      }
      return false;
    }
    case 'claim':
      return false; // handled up front
    case 'all':
      return cond.conditions.some((x) => pursue(c, x));
    case 'any': {
      // The first alternative that makes progress (map events and activations before fights).
      const order = [...cond.conditions].sort((a, b) => Number(a.type === 'site_cleared') - Number(b.type === 'site_cleared'));
      return order.some((x) => pursue(c, x));
    }
    default:
      return false;
  }
}

/** Objective commands for this step, most urgent first, and the resources to keep for them. */
export function pilotCandidates(catalog: ContentCatalog, state: MatchState, playerId: PlayerId, mem: PilotMemory): { cands: Tagged[]; reserve: Record<string, number> } {
  const heroId = mainHeroOf(catalog, state, playerId);
  const out: Tagged[] = [];
  const reserve: Record<string, number> = {};
  const mission = requireScenarioMission(catalog, state);
  // Claims and covenants first: they only help.
  for (const o of mission.objectives) {
    if (o.condition.type === 'claim' && ['active', 'available'].includes(state.mission.objectives[o.id]?.status ?? '')) out.push({ payload: { kind: 'ClaimObjective', objectiveId: o.id }, objectiveId: o.id });
  }
  const player = state.players[playerId]!;
  for (const e of player.entitlements) {
    if (e.assignedTownId) continue;
    for (const t of myTowns(state, playerId))
      if (quoteCovenantAssignment(catalog, state, playerId, t.id, e.entitlementId).legal) {
        out.push({ payload: { kind: 'AssignCovenant', townId: t.id, entitlementId: e.entitlementId }, objectiveId: null });
        break;
      }
  }
  if (!heroId) return { cands: out, reserve };
  // Walking home for troops after a fight it would lose: finish that first.
  if (mem.fetchTown) {
    const town = state.towns[mem.fetchTown];
    const hero = state.heroes[heroId]!;
    const c: Ctx = { catalog, state, playerId, heroId, mem, out, objectiveId: 'fetch', reserve };
    if (!town || town.ownerId !== playerId) mem.fetchTown = undefined;
    else if (heroInTown(catalog, state, hero, town.id)) {
      if (!strengthen(c)) mem.fetchTown = undefined;
      else return { cands: out, reserve };
    } else if (goTo(c, town.coord, false)) return { cands: out, reserve };
    else if (!quoteMovement(catalog, state, heroId, movementTarget(catalog, state, town.coord)).reachable) mem.fetchTown = undefined;
    // Otherwise it is out of movement for today: keep heading home tomorrow.
  }
  for (const o of mission.objectives) {
    if (o.category !== 'primary' || state.mission.objectives[o.id]?.status !== 'active') continue;
    const c: Ctx = { catalog, state, playerId, heroId, mem, out, objectiveId: o.id, reserve };
    const before = out.length;
    pursue(c, o.condition);
    if (out.length > before) mem.blocks.delete(o.id);
  }
  return { cands: out, reserve };
}

/** Commands that spend resources (held back while an objective waits for them). */
const SPENDING = new Set(['BuildStructure', 'RecruitUnits', 'UpgradeStack', 'BuyArtifact', 'TrainHero', 'HireHero', 'BuySpellbook', 'RecruitFromCamp', 'InvokeIntervention', 'ReceiveDivineGift', 'TradeResources', 'CompleteQuestHut']);

function winsQuickly(catalog: ContentCatalog, state: MatchState, playerId: PlayerId, payload: CommandPayload): boolean {
  const run = runQuickBattle(catalog, state, playerId, payload, undefined, { playerSimulation: true });
  if (!run.ok) return true; // no battle on arrival today (approach only)
  return run.result.winner === (run.result.attacker.playerId === playerId ? 'attacker' : 'defender');
}

const commandOf = (state: MatchState, playerId: PlayerId, payload: CommandPayload, n: number): GameCommand =>
  ({ ...payload, commandId: `pilot:${state.matchId}:${state.revision}:${n}`, expectedRevision: state.revision, actorPlayerId: playerId }) as GameCommand;

/** Resolve the current battle with the tactical AI on both sides. */
export function fightOut(catalog: ContentCatalog, state: MatchState, playerId: PlayerId, mem: PilotMemory): MatchState {
  let s = state;
  for (let i = 0; i < 4000 && s.battle; i++) {
    const r = stepBattleAI(catalog, s, { playerSimulation: true });
    if (r.state === s) break;
    s = r.state;
  }
  const res = s.lastBattleResult;
  if (res && !s.battle) {
    const mine = res.attacker.playerId === playerId ? 'attacker' : res.defender.playerId === playerId ? 'defender' : null;
    if (mine) {
      if (res.winner === mine) mem.days.battlesWon++;
      else mem.days.battlesLost++;
      const lines = res[mine].lines;
      const value = (n: (l: (typeof lines)[number]) => number) => lines.reduce((a, l) => a + (catalog.creatures[l.creatureId]?.cost?.gold ?? 100) * n(l), 0);
      const before = value((l) => l.before);
      mem.battles.push({ label: res.label, won: res.winner === mine, lossShare: before > 0 ? 1 - value((l) => l.after) / before : 0, day: s.day });
    }
  }
  return s;
}

/** Play the player's whole turn; returns the state after its End Turn (or when the mission ends). */
export function pilotTurn(catalog: ContentCatalog, initial: MatchState, playerId: PlayerId, mem: PilotMemory, budget = 300): MatchState {
  let state = initial;
  const tried = new Set<string>();
  let n = 0;
  for (let step = 0; step < budget; step++) {
    if (state.outcome.status !== 'running') return state;
    if (state.battle) {
      state = fightOut(catalog, state, playerId, mem);
      continue;
    }
    if (state.activePlayerId !== playerId) return state;
    const pending = state.pendingDecisions.some((d) => state.heroes[d.heroId]?.ownerId === playerId);
    let cands: Tagged[];
    if (pending) cands = levelUpCandidates(catalog, state, playerId).map((payload) => ({ payload, objectiveId: null }));
    else {
      const own = pilotCandidates(catalog, state, playerId, mem);
      const held = Object.entries(own.reserve).filter(([, v]) => v > 0);
      const wallet = state.players[playerId]!.wallet as unknown as Record<string, number>;
      const short = held.some(([k, v]) => (wallet[k] ?? 0) < v);
      const main = mainHeroOf(catalog, state, playerId);
      const ai = strategicCandidates(catalog, buildObservation(catalog, state, playerId))
        // While an objective waits for resources the empire does not spend them elsewhere.
        .filter((p) => !(short && SPENDING.has(p.kind)))
        // The protagonist fights only battles the quick battle says it wins (losing it ends the mission).
        .filter((p) => !(p.kind === 'MoveHero' && p.heroId === main && p.confirmEncounter && !winsQuickly(catalog, state, playerId, p)))
        .map((payload) => ({ payload, objectiveId: null }));
      cands = [...own.cands, ...ai];
    }
    let applied = false;
    for (const { payload: p, objectiveId } of cands) {
      const key = JSON.stringify(p);
      if (p.kind !== 'EndTurn' && p.kind !== 'ChooseLevelUp' && tried.has(key)) continue;
      tried.add(key);
      const r = processCommand({ catalog }, state, commandOf(state, playerId, p, n++));
      if (!r.ok) {
        if (objectiveId && !mem.blocks.has(objectiveId)) mem.blocks.set(objectiveId, { objectiveId, kind: 'other', detail: `${p.kind} refused: ${r.rejection.message}` });
        continue;
      }
      state = r.state;
      applied = true;
      if (p.kind === 'EndTurn') return state;
      break;
    }
    if (!applied) break;
  }
  if (!state.battle && state.activePlayerId === playerId && state.outcome.status === 'running') {
    const r = processCommand({ catalog }, state, commandOf(state, playerId, { kind: 'EndTurn' }, n++));
    if (r.ok) state = r.state;
  }
  return state;
}
