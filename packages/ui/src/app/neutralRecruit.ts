/**
 * Neutral recruitment (campaign expansion handoff 2026-10-15, screen spec
 * `neutral-recruit`): what the hiring dialog of a creature camp shows, as a
 * read-only view model built on every render from committed state.
 *
 * Every price, stock, quantity limit and destination slot comes from the rules'
 * own quotes (`quoteCampRecruitment`, `quoteCampTraining`, `campForms`,
 * `campStock`, `campLockedReason`); the creature's statistics, ability rules,
 * habitat and lore come from content data. Nothing here owns a price or decides
 * legality: a stale view is refused by the rules on dispatch. The same model
 * serves an ordinary creature camp (its listed creature, idle strip) and a hiring
 * site of one of the six expansion neutrals (the kit's large portrait over the
 * neutral recruitment background).
 *
 * Neutral upgrades (battle FX & neutral upgrades, 2026-10-15): a hiring site that
 * hires both forms of its family offers a base / upgraded selector (both from the
 * site's one shared stock) and, when the visiting hero has a base stack of that
 * family, a separate training action (the price difference, no stock used).
 *
 * Weekly training allowance (owner decision 2026-10-16): the training action shows
 * how many of the site's weekly allowance (shared by every empire) are left this
 * week, its quantity limit never exceeds it (the rules' `maxQuantity`), and when
 * none are left the rules' reason is the action's disabled state.
 */
import {
  campForms,
  campLockedReason,
  campTrainingLimitText,
  canAfford,
  isSingleForm,
  missionSite,
  quoteCampRecruitment,
  quoteCampTraining,
  resources,
  scaleResources,
  shortfall,
  RESOURCE_KEYS,
  RESOURCE_LABELS,
  type ContentCatalog,
  type CreatureDefinition,
  type MatchState,
  type ResourceBundle,
} from '@pr/rules';
import { NEUTRAL_V2_HABITATS } from '@pr/content';
import { campaignV2Art, neutralUpgradeArt, resolveAsset } from '../assets/manifest';
import { siteKindLabel } from './view';

/** The kit's quiet hiring background (a broad creature stage at the left, a panel area at the right). */
export const NEUTRAL_RECRUIT_BACKGROUND = 'campaignv2.background.neutral.recruitment';

export interface CreaturePicture {
  readonly url: string;
  /** Native size when known (the picture is never shown larger than this). */
  readonly width: number | null;
  readonly height: number | null;
  readonly alt: string;
  readonly assetId: string;
}

/**
 * A delivered native portrait of a neutral form: the campaign kit's
 * (`campaignv2.portrait.*`, the six base forms) or the neutral-upgrade
 * delivery's (`neutralupgrade.portrait.*`, their six upgrades). Null otherwise.
 */
function kitPortrait(assetId: string): { url: string; width: number; height: number } | null {
  const kit = campaignV2Art(assetId);
  if (kit && kit.kind === 'portrait') return { url: kit.nativeUrl, width: kit.width, height: kit.height };
  const up = neutralUpgradeArt(assetId);
  return up ? { url: up.url, width: up.width, height: up.height } : null;
}

/**
 * The creature's portrait as a large picture: the kit's native portrait when
 * the creature has one (`campaignv2.portrait.*`, `neutralupgrade.portrait.*`),
 * else its ordinary portrait. Null when no picture resolves.
 */
export function creaturePicture(catalog: ContentCatalog, creatureId: string): CreaturePicture | null {
  const def = catalog.creatures[creatureId];
  if (!def) return null;
  const id = def.presentation.portraitAssetId;
  const kit = kitPortrait(id);
  if (kit) return { url: kit.url, width: kit.width, height: kit.height, alt: def.presentation.portraitAlt, assetId: id };
  const rec = resolveAsset(id);
  return rec.url ? { url: rec.url, width: null, height: null, alt: def.presentation.portraitAlt, assetId: id } : null;
}

/** True when the creature has a kit's large native portrait (the neutral hiring layout), base or upgraded form. */
export function hasKitPortrait(catalog: ContentCatalog, creatureId: string): boolean {
  const def = catalog.creatures[creatureId];
  return !!def && kitPortrait(def.presentation.portraitAssetId) !== null;
}

/**
 * Where a neutral species lives (content data), or null for a creature without a
 * habitat entry. Resolved by the family's base form, so both forms share it (the
 * table is keyed by family/base ID; an upgrade never gets a biome entry of its own).
 */
export function creatureHabitat(catalog: ContentCatalog, creatureId: string): string | null {
  const def = catalog.creatures[creatureId];
  const baseId = (def && catalog.families[def.familyId]?.baseCreatureId) ?? creatureId;
  return NEUTRAL_V2_HABITATS[baseId]?.habitat ?? NEUTRAL_V2_HABITATS[creatureId]?.habitat ?? null;
}

export interface StatRow {
  readonly id: 'attack' | 'defense' | 'damage' | 'hp' | 'speed' | 'size' | 'shots' | 'range';
  readonly label: string;
  readonly value: string;
}

export function creatureStatRows(def: CreatureDefinition): StatRow[] {
  const s = def.stats;
  if (!s) return [];
  const rows: StatRow[] = [
    { id: 'attack', label: 'Attack', value: String(s.attack) },
    { id: 'defense', label: 'Defense', value: String(s.defense) },
    { id: 'damage', label: 'Damage', value: `${s.damageMin}–${s.damageMax}` },
    { id: 'hp', label: 'Health', value: String(s.hp) },
    { id: 'speed', label: 'Speed', value: String(s.speed) },
    { id: 'size', label: 'Size', value: s.footprint === 2 ? '2 hexes' : '1 hex' },
  ];
  if (s.shots > 0) rows.push({ id: 'shots', label: 'Shots', value: String(s.shots) });
  if (s.shots > 0 && s.range) rows.push({ id: 'range', label: 'Range', value: `${s.range} hexes` });
  return rows;
}

export interface AbilityRow {
  readonly id: string;
  readonly name: string;
  readonly activation: 'active' | 'passive';
  readonly summary: string;
  /** The ability's exact rule text from its definition (never retyped). */
  readonly exactRule: string;
  readonly restriction: string | null;
}

export function creatureAbilityRows(catalog: ContentCatalog, def: CreatureDefinition): AbilityRow[] {
  return def.abilityIds.flatMap((id) => {
    const a = catalog.abilities[id];
    return a ? [{ id, name: a.name, activation: a.activation === 'active' ? 'active' : 'passive', summary: a.summary, exactRule: a.exactRule, restriction: a.restriction ?? null } as AbilityRow] : [];
  });
}

/** "300 Gold, 2 Wood" — the non-zero amounts of a bundle, in resource order. */
export function resourceText(b: Partial<ResourceBundle>): string {
  const parts = RESOURCE_KEYS.filter((k) => (b[k] ?? 0) > 0).map((k) => `${(b[k] ?? 0).toLocaleString('en-US')} ${RESOURCE_LABELS[k]}`);
  return parts.join(', ');
}

export type RecruitIssueKind = 'unavailable' | 'locked' | 'empty' | 'full' | 'poor';

/** A reason the camp cannot hire now, shown as text (several can hold at once). */
export interface RecruitIssue {
  readonly kind: RecruitIssueKind;
  readonly title: string;
  readonly text: string;
}

export interface SlotView {
  readonly index: number;
  readonly creatureId: string | null;
  readonly count: number;
  /** The recruits would go here. */
  readonly target: boolean;
}

export interface RecruitAction {
  readonly quantity: number;
  readonly legal: boolean;
  /** Why not (the rules' reason, or the first issue), null when legal. */
  readonly reason: string | null;
  readonly totalCost: ResourceBundle;
}

/** One of the forms a site hires (the base / upgraded selector). */
export interface FormOption {
  readonly creatureId: string;
  readonly name: string;
  readonly pluralName: string;
  readonly form: 'base' | 'upgraded';
  /** 'Base' or 'Upgraded'. */
  readonly label: string;
  readonly selected: boolean;
  /** The rules' price of one (each form has its own). */
  readonly unitCost: ResourceBundle;
}

/** Training the visiting hero's base stack into the upgraded form at this site. */
export interface TrainView {
  readonly fromId: string;
  readonly fromName: string;
  readonly fromPlural: string;
  readonly toId: string;
  readonly toName: string;
  readonly toPlural: string;
  /** The hero's stack that trains (slot index) and its size. */
  readonly slot: number;
  readonly stackCount: number;
  /** The price difference per creature (the rules' quote). */
  readonly unitCost: ResourceBundle;
  /** Quantity selector: the chosen amount clamped to [min, max]; max is the rules' legal maximum now (never more than is left this week). */
  readonly quantity: number;
  readonly min: number;
  readonly max: number;
  /** The site's weekly training allowance, shared by every empire, and how many of it are left this week (the rules' quote). */
  readonly weeklyAllowance: number;
  readonly leftThisWeek: number;
  /** "6 of 8 left this week". */
  readonly allowanceText: string;
  readonly targetSlot: number | null;
  /** "Slot 2 — all 4 become Dawncrest Pegasi." */
  readonly destinationText: string;
  /** Why nothing can be trained now (null when it can). */
  readonly reason: string | null;
  readonly train: RecruitAction;
}

export interface NeutralRecruitView {
  readonly siteName: string;
  /** 'Hiring site' (a finite weekly stock) or 'Creature camp'. */
  readonly siteKind: string;
  readonly description: string;
  readonly creatureId: string;
  readonly name: string;
  readonly pluralName: string;
  readonly tier: number;
  readonly roleLabel: string;
  readonly summary: string;
  /** The family has no upgraded form (no upgrade tab, nothing to train into). */
  readonly singleForm: boolean;
  /** The forms this site hires (`campForms`), the selected one marked; one entry at an ordinary camp. */
  readonly forms: readonly FormOption[];
  /** The site hires more than one form: the base / upgraded selector is shown. */
  readonly formChoice: boolean;
  /** 'base' or 'upgraded': the selected form. */
  readonly form: 'base' | 'upgraded';
  /** Training here, when the visiting hero has a base stack this site can train; else null (no Train action). */
  readonly training: TrainView | null;
  /** The kit's large portrait and the neutral recruitment background (the six campaign neutrals). */
  readonly kit: boolean;
  readonly portrait: CreaturePicture | null;
  readonly background: string | null;
  readonly habitat: string | null;
  readonly stats: readonly StatRow[];
  readonly abilities: readonly AbilityRow[];
  readonly lore: string | null;
  readonly stock: number;
  readonly restock: 'growth' | 'weekly' | 'none';
  readonly stockText: string;
  readonly restockText: string;
  readonly unitCost: ResourceBundle;
  readonly wallet: ResourceBundle;
  /** Quantity selector: the chosen amount clamped to [min, max]; max is the rules' legal maximum now. */
  readonly quantity: number;
  readonly min: number;
  readonly max: number;
  readonly heroName: string;
  readonly slots: readonly SlotView[];
  readonly targetSlot: number | null;
  /** Where the recruits go: "Slot 3 — joins the 4 Pegasi already there (8 after)". */
  readonly destinationText: string;
  readonly lockedReason: string | null;
  readonly issues: readonly RecruitIssue[];
  readonly recruit: RecruitAction;
  readonly recruitAll: RecruitAction;
}

const plural = (n: number, def: CreatureDefinition) => (n === 1 ? def.name : def.pluralName);

// The quantity chosen at a camp survives a look at the creature's card (the dialog is
// replaced while the card is open). Presentation memory only: never saved or read by the rules.
const chosenQuantity = new Map<string, number>();

export function campQuantity(matchId: string, siteId: string): number {
  return chosenQuantity.get(`${matchId}|${siteId}`) ?? 1;
}

export function rememberCampQuantity(matchId: string, siteId: string, n: number): void {
  chosenQuantity.set(`${matchId}|${siteId}`, n);
}

// The form chosen at a hiring site, kept the same way (presentation memory only; the rules re-check it).
const chosenForm = new Map<string, string>();

export function campForm(matchId: string, siteId: string): string | null {
  return chosenForm.get(`${matchId}|${siteId}`) ?? null;
}

export function rememberCampForm(matchId: string, siteId: string, creatureId: string | null): void {
  if (creatureId) chosenForm.set(`${matchId}|${siteId}`, creatureId);
  else chosenForm.delete(`${matchId}|${siteId}`);
}

export interface RecruitViewOptions {
  /** The selected form (a creature ID); anything the site does not hire falls back to its listed creature. */
  readonly form?: string | null;
  /** The requested training quantity. */
  readonly train?: number;
}

/**
 * The hiring dialog of camp `siteId` for `heroId` (the visiting hero) with the
 * player's requested quantity, selected form and training quantity. Null when
 * the site is not a creature camp or its creature is unknown.
 */
export function neutralRecruitView(catalog: ContentCatalog, state: MatchState, playerId: string, heroId: string, siteId: string, requested: number, opts: RecruitViewOptions = {}): NeutralRecruitView | null {
  const def = missionSite(catalog, state, siteId);
  if (!def || def.kind.type !== 'creature_camp') return null;
  const kind = def.kind;
  const formIds = campForms(catalog, state, siteId);
  const selectedId = opts.form && formIds.includes(opts.form) ? opts.form : (formIds[0] ?? kind.creatureId);
  const creature = catalog.creatures[selectedId];
  if (!creature) return null;
  const fam = catalog.families[creature.familyId];
  const hero = state.heroes[heroId];
  const heroName = hero?.name ?? 'Your hero';
  const wallet = resources(state.players[playerId]?.wallet ?? {});

  // The rules' quote for one creature of the selected form: unit cost, stock, the slot the recruits would take and the legal maximum.
  const probe = quoteCampRecruitment(catalog, state, playerId, heroId, siteId, 1, creature.id);
  // Nothing can be hired while even one is refused (no pact, guards, another hero's turn…).
  const max = probe.legal ? Math.max(0, probe.maxQuantity) : 0;
  const min = max < 1 ? 0 : 1;
  const want = Number.isFinite(requested) ? Math.floor(requested) : 1;
  const quantity = max < 1 ? 0 : Math.min(max, Math.max(1, want));
  const stock = probe.available;
  const restock = kind.restock ?? 'growth';
  const each = kind.weeklyGrowth;

  // Every reason that holds now, each with its own text (the rules' first refusal comes first when it is none of these).
  const locked = campLockedReason(catalog, state, siteId);
  const issues: RecruitIssue[] = [];
  if (locked) issues.push({ kind: 'locked', title: 'No pact yet', text: locked });
  if (stock < 1) {
    const text =
      restock === 'weekly'
        ? `None left this week. Up to ${each} come when the next week begins; unhired ones do not stay.`
        : restock === 'none'
          ? 'None left, and no more will come.'
          : `None left. ${each} more come when the next week begins.`;
    issues.push({ kind: 'empty', title: 'No stock', text });
  }
  if (hero && probe.slot === null) issues.push({ kind: 'full', title: 'Army full', text: `${heroName}’s seven slots hold other creatures: free a slot to hire ${creature.pluralName}.` });
  if (!canAfford(wallet, probe.totalCost)) {
    const short = resourceText(shortfall(wallet, probe.totalCost));
    issues.push({ kind: 'poor', title: 'Not enough resources', text: `One ${creature.name} costs ${resourceText(probe.totalCost)}: short ${short}.` });
  }
  const explained: Record<string, RecruitIssueKind | undefined> = { no_population: 'empty', no_capacity: 'full', insufficient_resources: 'poor' };
  if (!probe.legal && probe.reason && probe.code !== 'invalid_quantity') {
    const k = probe.code ? explained[probe.code] : undefined;
    const covered = (k && issues.some((i) => i.kind === k)) || (locked !== null && probe.reason === locked);
    if (!covered) issues.unshift({ kind: 'unavailable', title: 'Cannot hire now', text: probe.reason });
  }

  const action = (n: number): RecruitAction => {
    if (n < 1) return { quantity: 0, legal: false, reason: issues[0]?.text ?? probe.reason ?? 'Nobody to hire now', totalCost: resources() };
    const q = quoteCampRecruitment(catalog, state, playerId, heroId, siteId, n, creature.id);
    return { quantity: n, legal: q.legal, reason: q.legal ? null : (q.reason ?? issues[0]?.text ?? 'Cannot hire now'), totalCost: q.totalCost };
  };
  const recruit = action(quantity);
  // Recruit all affordable: the rules' legal maximum (stock, wallet and a slot), one command.
  const recruitAll = action(max);

  const army = hero?.army.slots ?? [];
  const target = hero ? probe.slot : null;
  const slots: SlotView[] = Array.from({ length: 7 }, (_, i) => {
    const s = army[i] ?? null;
    return { index: i, creatureId: s?.creatureId ?? null, count: s?.count ?? 0, target: target === i };
  });
  let destinationText: string;
  if (!hero) destinationText = 'No hero is here to take them.';
  else if (target === null) destinationText = `No slot in ${heroName}’s army can take ${creature.pluralName}.`;
  else {
    const there = slots[target]!;
    const n = quantity;
    if (there.creatureId === creature.id)
      destinationText = n > 0 ? `Slot ${target + 1} — joins the ${there.count} ${plural(there.count, creature)} already there (${there.count + n} after).` : `Slot ${target + 1} — would join the ${there.count} ${plural(there.count, creature)} already there.`;
    else destinationText = n > 0 ? `Slot ${target + 1} — a free slot: a new stack of ${n}.` : `Slot ${target + 1} — a free slot would take them.`;
  }

  // The stock is the site's, shared by every form: it is counted in the listed creature's name when both forms are hired.
  const listed = catalog.creatures[formIds[0] ?? kind.creatureId] ?? creature;
  const counted = formIds.length > 1 ? listed : creature;
  const stockText = restock === 'weekly' ? `${stock} ${plural(stock, counted)} this week` : `${stock} ${plural(stock, counted)} available`;
  const restockText = restock === 'weekly' ? `Up to ${each} each week; unhired ones do not stay` : restock === 'none' ? 'No more will come' : `+${each} each week`;
  const kit = hasKitPortrait(catalog, creature.id);
  const forms: FormOption[] = formIds.flatMap((id) => {
    const c = catalog.creatures[id];
    if (!c) return [];
    const unit = id === creature.id ? probe.unitCost : quoteCampRecruitment(catalog, state, playerId, heroId, siteId, 1, id).unitCost;
    return [{ creatureId: id, name: c.name, pluralName: c.pluralName, form: c.form, label: c.form === 'upgraded' ? 'Upgraded' : 'Base', selected: id === creature.id, unitCost: unit }];
  });
  const training = hero ? trainView(catalog, state, playerId, heroId, siteId, formIds, opts.train ?? 1) : null;
  const lore = catalog.lore[creature.loreId];
  return {
    siteName: def.name,
    siteKind: siteKindLabel(def),
    description: def.description,
    creatureId: creature.id,
    name: creature.name,
    pluralName: creature.pluralName,
    tier: creature.tier,
    roleLabel: creature.roleLabel,
    summary: creature.summary,
    singleForm: !!fam && isSingleForm(fam),
    forms,
    formChoice: forms.length > 1,
    form: creature.form,
    training,
    kit,
    portrait: creaturePicture(catalog, creature.id),
    background: kit ? (campaignV2Art(NEUTRAL_RECRUIT_BACKGROUND)?.nativeUrl ?? null) : null,
    habitat: creatureHabitat(catalog, creature.id),
    stats: creatureStatRows(creature),
    abilities: creatureAbilityRows(catalog, creature),
    // The upgraded form reads its own lore line when the family has one.
    lore: (creature.form === 'upgraded' ? lore?.upgradeLore : undefined) ?? lore?.gameLore ?? null,
    stock,
    restock,
    stockText,
    restockText,
    unitCost: probe.unitCost,
    wallet,
    quantity,
    min,
    max,
    heroName,
    slots,
    targetSlot: target,
    destinationText,
    lockedReason: locked,
    issues,
    recruit,
    recruitAll,
  };
}

/**
 * The training action of the dialog: the hero's first stack of a base form this
 * site trains (its upgrade is hired here too), quoted by the rules. Null when the
 * site trains nothing or the hero has no such stack (the action is not shown).
 */
function trainView(catalog: ContentCatalog, state: MatchState, playerId: string, heroId: string, siteId: string, formIds: readonly string[], requested: number): TrainView | null {
  const hero = state.heroes[heroId];
  if (!hero) return null;
  const from = formIds.map((id) => catalog.creatures[id]).find((c) => !!c && c.form === 'base' && !!c.upgradeId && formIds.includes(c.upgradeId));
  const to = from?.upgradeId ? catalog.creatures[from.upgradeId] : undefined;
  if (!from || !to) return null;
  const slot = hero.army.slots.findIndex((x) => x?.creatureId === from.id);
  if (slot < 0) return null;
  const probe = quoteCampTraining(catalog, state, playerId, heroId, siteId, from.id, 1, slot);
  // A site whose content trains nobody (weeklyTraining 0) shows no training action.
  if (probe.weeklyAllowance < 1) return null;
  const wallet = resources(state.players[playerId]?.wallet ?? {});
  // Nothing trains while a refusal other than gold or space holds (no pact, guards, another hero's turn,
  // none left of the week's allowance…).
  const blocked = probe.code !== null && probe.code !== 'insufficient_resources' && probe.code !== 'no_capacity';
  const max = blocked ? 0 : Math.max(0, probe.maxQuantity);
  const min = max < 1 ? 0 : 1;
  const want = Number.isFinite(requested) ? Math.floor(requested) : 1;
  const quantity = max < 1 ? 0 : Math.min(max, Math.max(1, want));
  const count = probe.stackCount;
  const allowance = probe.weeklyAllowance;
  const left = probe.leftThisWeek;
  // Why nothing can be trained now: the rules' first refusal (a shortfall named for one creature).
  let reason: string | null = null;
  if (max < 1) {
    if (blocked) reason = left < 1 && probe.code === 'no_population' ? `${probe.reason}. More can train when the next week begins.` : (probe.reason ?? 'Cannot train now');
    else if (!canAfford(wallet, probe.unitCost)) reason = `Training one ${from.name} costs ${resourceText(probe.unitCost)}: short ${resourceText(shortfall(wallet, probe.unitCost))}.`;
    else {
      // Not the whole stack (the week's allowance, or the Gold), and nowhere to put a part of it.
      const all = scaleResources(probe.unitCost, count);
      const why: string[] = [];
      if (count > left) why.push(`${campTrainingLimitText(left, allowance)}: not all ${count}.`);
      if (!canAfford(wallet, all)) why.push(`Training all ${count} costs ${resourceText(all)}: short ${resourceText(shortfall(wallet, all))}.`);
      why.push(`A partial training needs a free slot or an existing stack of ${to.pluralName}.`);
      reason = why.join(' ');
    }
  }
  const q = quantity > 0 ? quoteCampTraining(catalog, state, playerId, heroId, siteId, from.id, quantity, slot) : null;
  const train: RecruitAction = q
    ? { quantity, legal: q.legal, reason: q.legal ? null : (q.reason ?? 'Cannot train now'), totalCost: q.totalCost }
    : { quantity: 0, legal: false, reason: reason ?? 'Cannot train now', totalCost: resources() };
  const targetSlot = q?.targetSlot ?? null;
  const n = quantity;
  let destinationText: string;
  if (targetSlot === null) destinationText = q?.reason ?? reason ?? `No slot in ${hero.name}’s army can take ${to.pluralName}.`;
  else if (targetSlot === slot) destinationText = `Slot ${slot + 1} — all ${count} become ${count === 1 ? to.name : to.pluralName}.`;
  else {
    const there = hero.army.slots[targetSlot];
    const stay = count - n;
    const rest = stay > 0 ? ` ${stay} ${stay === 1 ? `${from.name} stays` : `${from.pluralName} stay`} in slot ${slot + 1}.` : '';
    destinationText = there
      ? `Slot ${targetSlot + 1} — joins the ${there.count} ${there.count === 1 ? to.name : to.pluralName} already there (${there.count + n} after).${rest}`
      : `Slot ${targetSlot + 1} — a free slot: a new stack of ${n} ${n === 1 ? to.name : to.pluralName}.${rest}`;
  }
  return {
    fromId: from.id,
    fromName: from.name,
    fromPlural: from.pluralName,
    toId: to.id,
    toName: to.name,
    toPlural: to.pluralName,
    slot,
    stackCount: count,
    unitCost: probe.unitCost,
    quantity,
    min,
    max,
    weeklyAllowance: allowance,
    leftThisWeek: left,
    allowanceText: `${left} of ${allowance} left this week`,
    targetSlot,
    destinationText,
    reason,
    train,
  };
}
