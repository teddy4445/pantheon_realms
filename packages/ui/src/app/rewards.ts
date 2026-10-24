/**
 * Reward receipts (1.1.0 reward presentation) — presentation only. A receipt
 * is read from what the rules already committed for ONE command: the event
 * batch that command returned and the state before and after it. Nothing here
 * grants, re-dispatches or predicts anything, and nothing is parsed from toast
 * prose. Summary markers (ChestOpened, QuestHutCompleted, MapEventResolved)
 * only name the moment; the detailed grant events carry the items, so nothing
 * is counted twice.
 *
 * Receipts are made only from a live command's own result, never from the
 * saved history, so a reload never reopens one.
 */
import { RESOURCE_KEYS, RESOURCE_LABELS, resources, type ContentCatalog, type GameEvent, type MatchState, type ResourceBundle, type ResourceKey, type RewardDefinition } from '@pr/rules';

export type ReceiptItemKind = 'resource' | 'xp' | 'artifact' | 'creature' | 'attribute' | 'mana' | 'movement' | 'entitlement' | 'spell';

export interface ReceiptItem {
  readonly kind: ReceiptItemKind;
  /** Stable key within the receipt. */
  readonly key: string;
  /** Icon asset ID (resources, statistics, gift, spell); artifacts and creatures use their own pictures. */
  readonly iconId: string;
  /** "+1,000", "+3"; empty for an artifact, an entitlement or a spell. */
  readonly amount: string;
  /** What it is: "Gold", "Experience", the artifact's or creatures' name. */
  readonly label: string;
  /** Where it went or what limited it (artifact location, a cap). */
  readonly note?: string;
  readonly artifactId?: string;
  readonly creatureId?: string;
}

export interface RewardReceipt {
  /** Unique per receipt (the command batch), so a receipt is shown at most once. */
  readonly id: string;
  readonly title: string;
  /** The small line above the title ("Treasure chest", the site's name). */
  readonly source: string;
  readonly items: readonly ReceiptItem[];
  /** What the command cost (shown apart from the gains). */
  readonly costs: ResourceBundle | null;
  /** Caps and limits, in words (e.g. the mission's experience cap). */
  readonly notes: readonly string[];
  /** A larger, dismissible receipt (artifacts, creatures, quests, mixed rewards) rather than a passing notice. */
  readonly major: boolean;
}

const ATTRIBUTE_LABEL: Readonly<Record<string, string>> = { attack: 'Attack', defense: 'Defense', power: 'Power', knowledge: 'Knowledge' };
const fmt = (n: number) => n.toLocaleString('en-US');

let receiptSerial = 0;

/** Where a granted artifact went, in words (never assumed to be the backpack). */
export function artifactPlace(location: 'equipped' | 'backpack' | 'cache', heroName: string): string {
  return location === 'equipped' ? `Equipped by ${heroName}` : location === 'backpack' ? `In ${heroName}’s backpack` : 'Backpack full: set aside, not carried';
}

/** Resource items for a bundle (only positive amounts, in the game's resource order). */
export function resourceItems(bundle: Partial<Record<ResourceKey, number>>): ReceiptItem[] {
  return RESOURCE_KEYS.filter((k) => (bundle[k] ?? 0) > 0).map((k) => ({ kind: 'resource' as const, key: `res:${k}`, iconId: `icon.res.${k}`, amount: `+${fmt(bundle[k] ?? 0)}`, label: RESOURCE_LABELS[k] }));
}

/**
 * The receipt of one committed command for the viewer: gains to `playerId` and
 * to `heroId` (the hero who acted), costs paid by `playerId`.
 */
export function buildReceipt(
  catalog: ContentCatalog,
  before: MatchState,
  after: MatchState,
  events: readonly GameEvent[],
  playerId: string,
  heroId: string | null,
  meta: { readonly title: string; readonly source: string; readonly major?: boolean },
): RewardReceipt {
  const gained: Record<ResourceKey, number> = { ...resources() };
  const spent: Record<ResourceKey, number> = { ...resources() };
  const items: ReceiptItem[] = [];
  const notes: string[] = [];
  const heroName = (id: string) => after.heroes[id]?.name ?? before.heroes[id]?.name ?? 'Your hero';
  let xp = 0;
  let capped = false;
  for (const e of events) {
    switch (e.kind) {
      case 'ResourcesGranted':
        if (e.playerId === playerId) for (const k of RESOURCE_KEYS) gained[k] += e.amount[k] ?? 0;
        break;
      case 'ResourcesSpent':
        if (e.playerId === playerId) for (const k of RESOURCE_KEYS) spent[k] += e.amount[k] ?? 0;
        break;
      case 'ExperienceGranted':
        if (e.heroId === heroId) {
          xp += e.amount;
          capped = capped || e.capped;
        }
        break;
      case 'ArtifactGranted':
        if (e.heroId === heroId) {
          const a = catalog.artifacts[e.artifactId];
          items.push({ kind: 'artifact', key: `art:${e.artifactId}:${items.length}`, iconId: a?.iconAssetId ?? '', amount: '', label: a?.name ?? e.artifactId, note: artifactPlace(e.location, heroName(e.heroId)), artifactId: e.artifactId });
        }
        break;
      case 'CreaturesJoined':
        if (e.heroId === heroId) {
          const c = catalog.creatures[e.creatureId];
          items.push({ kind: 'creature', key: `cr:${e.creatureId}:${items.length}`, iconId: c?.presentation?.portraitAssetId ?? '', amount: `+${fmt(e.count)}`, label: (e.count === 1 ? c?.name : c?.pluralName) ?? e.creatureId, note: `Joined ${heroName(e.heroId)}`, creatureId: e.creatureId });
        }
        break;
      case 'AttributeGained':
        if (e.heroId === heroId && e.amount) items.push({ kind: 'attribute', key: `attr:${e.attribute}:${items.length}`, iconId: `icon.stat.${e.attribute}`, amount: `+${fmt(e.amount)}`, label: ATTRIBUTE_LABEL[e.attribute] ?? e.attribute });
        break;
      case 'EntitlementGranted':
        if (e.playerId === playerId) {
          const ent = catalog.entitlements[e.entitlementId];
          items.push({ kind: 'entitlement', key: `ent:${e.entitlementId}`, iconId: 'icon.ui.gift', amount: '', label: ent?.name ?? e.entitlementId, ...(ent?.summary ? { note: ent.summary } : {}) });
        }
        break;
      case 'SpellsLearned':
        if (e.heroId === heroId) for (const sp of e.spellIds) items.push({ kind: 'spell', key: `spell:${sp}`, iconId: catalog.spells[sp]?.iconAssetId ?? 'icon.action.spell', amount: '', label: catalog.spells[sp]?.name ?? sp, note: `Learned by ${heroName(e.heroId)}` });
        break;
      default:
        break;
    }
  }
  // Mana and movement rewards have no event of their own: the committed change of the acting hero.
  const h0 = heroId ? before.heroes[heroId] : undefined;
  const h1 = heroId ? after.heroes[heroId] : undefined;
  const mana = h0 && h1 ? h1.mana - h0.mana : 0;
  const move = h0 && h1 ? h1.movementPoints - h0.movementPoints : 0;
  const out: ReceiptItem[] = [...resourceItems(gained)];
  if (xp > 0) out.push({ kind: 'xp', key: 'xp', iconId: 'icon.stat.xp', amount: `+${fmt(xp)}`, label: 'Experience', ...(capped ? { note: 'Mission cap reached' } : {}) });
  if (capped) notes.push(xp > 0 ? `${heroId ? heroName(heroId) : 'The hero'} reached this mission’s experience cap: only ${fmt(xp)} experience counted.` : `${heroId ? heroName(heroId) : 'The hero'} is at this mission’s experience cap: no experience was gained.`);
  if (mana > 0) out.push({ kind: 'mana', key: 'mana', iconId: 'icon.stat.mana', amount: `+${fmt(mana)}`, label: 'Mana' });
  if (move > 0) out.push({ kind: 'movement', key: 'move', iconId: 'icon.stat.movement', amount: `+${fmt(move)}`, label: 'Movement today' });
  if (h1?.landmarkBlessing && !h0?.landmarkBlessing) {
    const attack = h1.landmarkBlessing.kind === 'courage';
    out.push({ kind: 'attribute', key: 'landmark-blessing', iconId: `icon.stat.${attack ? 'attack' : 'defense'}`, amount: '+2', label: attack ? 'Attack blessing' : 'Defense blessing', note: 'Next battle only. Consumed when battle begins.' });
  }
  out.push(...items);
  const costs: ResourceBundle | null = RESOURCE_KEYS.some((k) => spent[k] > 0) ? resources(spent) : null;
  const kinds = new Set(out.map((i) => i.kind));
  const major = !!meta.major || out.some((i) => i.kind === 'artifact' || i.kind === 'creature' || i.kind === 'entitlement' || i.kind === 'attribute' || i.kind === 'spell') || kinds.size >= 3;
  receiptSerial += 1;
  return { id: `receipt-${after.revision}-${receiptSerial}`, title: meta.title, source: meta.source, items: out, costs, notes, major };
}

/**
 * What a reward definition offers, as receipt items, for showing an offer
 * before it is taken (an event option, a quest's payment). Read from the
 * site's own definition; the receipt after the command is still built from
 * what was committed.
 */
export function rewardPreviewItems(catalog: ContentCatalog, r: RewardDefinition, heroName: string): ReceiptItem[] {
  const out: ReceiptItem[] = [...resourceItems(r.resources ?? {})];
  if (r.questXp) out.push({ kind: 'xp', key: 'xp', iconId: 'icon.stat.xp', amount: `+${fmt(r.questXp)}`, label: 'Experience' });
  if (r.mana) out.push({ kind: 'mana', key: 'mana', iconId: 'icon.stat.mana', amount: `+${fmt(r.mana)}`, label: 'Mana' });
  if (r.movement) out.push({ kind: 'movement', key: 'move', iconId: 'icon.stat.movement', amount: `+${fmt(r.movement)}`, label: 'Movement today' });
  for (const [k, v] of Object.entries(r.attributes ?? {})) if (v) out.push({ kind: 'attribute', key: `attr:${k}`, iconId: `icon.stat.${k}`, amount: `+${fmt(v)}`, label: ATTRIBUTE_LABEL[k] ?? k });
  for (const c of r.creatures ?? []) {
    const def = catalog.creatures[c.creatureId];
    out.push({ kind: 'creature', key: `cr:${c.creatureId}`, iconId: def?.presentation?.portraitAssetId ?? '', amount: `+${fmt(c.count)}`, label: (c.count === 1 ? def?.name : def?.pluralName) ?? c.creatureId, note: `Join ${heroName}`, creatureId: c.creatureId });
  }
  for (const a of r.artifactIds ?? []) {
    const def = catalog.artifacts[a];
    out.push({ kind: 'artifact', key: `art:${a}`, iconId: def?.iconAssetId ?? '', amount: '', label: def?.name ?? a, artifactId: a });
  }
  return out;
}
