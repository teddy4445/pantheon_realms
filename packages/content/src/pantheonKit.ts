/**
 * PantheonKit: builds a complete playable pantheon from a compact spec.
 *
 * Used for the Egyptian, Japanese, Celtic and Mesoamerican pantheons (added
 * with PROPOSED values). The town is a structural mirror of the Greek
 * design/03 tree: every one of the 18 locations keeps the Greek chain length,
 * costs, prerequisite structure and effects, with the pantheon's own names and
 * creatures substituted. Gods mirror the Greek structure (a patron with no
 * bonus, an exclusive first-minor choice unlocked by Temple I for 20 Favor —
 * the Ares/Athena mirrors plus two gods added 2026-10-02).
 * Hero classes mirror the three existing classes' numbers under local names.
 *
 * Nothing here is rule code: the output is plain definitions that go through
 * the same validators as every other pantheon.
 */
import type {
  BuildingDefinition,
  BuildingSlotDefinition,
  CreatureDefinition,
  CreatureFamilyDefinition,
  EffectDefinition,
  GodDefinition,
  HeroClassDefinition,
  HeroDefinition,
  LoreDefinition,
  PantheonDefinition,
  RequirementDefinition,
  TownArchetypeDefinition,
} from '@pr/rules';
import { GREEK_FAMILY_SPECS, buildFamilies, type FamilySpec } from './greek/creatures';
import { GREEK_BUILDINGS, GREEK_TOWN } from './greek/town';
import { HERO_CLASSES } from './common/heroesMagic';
import { firstMinorGod, secondMinorGod } from './common/gods';
import { SIGNATURES } from './common/signatures';
import { withH3CityArt } from './townArt/h3City';

export const slug = (name: string): string =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

type SupportSlot =
  | 'civic_hall'
  | 'tavern'
  | 'marketplace'
  | 'resource_depot'
  | 'workshop'
  | 'mage_guild'
  | 'pantheon_temple'
  | 'fortifications'
  | 'training_academy'
  | 'watchtower'
  | 'artifact_merchant';

export interface Placement {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly layer: number;
}

export interface KitFamily extends Omit<FamilySpec, 'pantheonId' | 'dwelling' | 'dwellingUp'> {
  /** [base dwelling name, upgraded dwelling name]. */
  readonly dwellingNames: readonly [string, string];
  readonly lore: { readonly sourceNote: string; readonly sourceRefs: readonly string[]; readonly gameLore: string; readonly upgradeLore: string };
}

export interface KitGod {
  readonly name: string;
  readonly domain: string;
  readonly quote?: string;
}

export interface KitMinor extends KitGod {
  /** Mirrors Ares (attack + War Cry) or Athena (defense + Ward). */
  readonly mirrors: 'attack' | 'defense';
}

export interface KitSecondMinor extends KitGod {
  readonly blessing: { readonly benefits: readonly EffectDefinition[]; readonly benefitSummary: readonly string[] };
}

export interface KitClass {
  readonly id: string;
  readonly name: string;
  readonly mirrors: 'champion' | 'strategos' | 'oracle';
  readonly summary: string;
}

export interface KitHero {
  readonly name: string;
  readonly title: string;
  readonly classId: string;
  readonly biography: string;
  /** Added by proposal rather than from the owner's concept board (2026-10-04: more heroes). */
  readonly proposed?: boolean;
}

export interface PantheonKitSpec {
  readonly id: string;
  readonly name: string;
  readonly epithet: string;
  readonly summary: string;
  readonly accent: string;
  readonly accentSoft: string;
  readonly town: {
    readonly archetypeId: string;
    readonly name: string;
    /** Building names per support location, one per chain level (same length as the Greek chain). */
    readonly names: Readonly<Record<SupportSlot, readonly string[]>>;
    /** Slot labels shown when empty (defaults to generic role labels). */
    readonly labels?: Partial<Readonly<Record<SupportSlot, string>>>;
    readonly placements: Readonly<Record<SupportSlot | `dwelling_t${1 | 2 | 3 | 4 | 5 | 6 | 7}`, Placement>>;
    /** Where the town screen's economy bar sits on the painting's top edge (TownArchetypeDefinition.hudAnchor). */
    readonly hudAnchor?: 'left' | 'center' | 'right' | number;
  };
  readonly families: readonly KitFamily[];
  readonly patron: KitGod;
  readonly minors: readonly [KitMinor, KitMinor];
  /** Two more first-choice gods (added 2026-10-02, owner answer "Split 2 + 2"; common/gods.ts). */
  readonly extraFirstMinors: readonly [KitSecondMinor, KitSecondMinor];
  /** The proposed second minor-god choice (five gods since 2026-10-02; common/gods.ts). */
  readonly secondMinors: readonly KitSecondMinor[];
  readonly classes: readonly [KitClass, KitClass, KitClass];
  readonly heroes: readonly KitHero[];
}

export interface PantheonContent {
  readonly pantheon: PantheonDefinition;
  readonly families: CreatureFamilyDefinition[];
  readonly creatures: CreatureDefinition[];
  readonly buildings: BuildingDefinition[];
  readonly town: TownArchetypeDefinition;
  readonly gods: GodDefinition[];
  readonly heroes: HeroDefinition[];
  readonly classes: HeroClassDefinition[];
  readonly lore: LoreDefinition[];
}

const DEFAULT_LABELS: Record<SupportSlot, string> = {
  civic_hall: 'Civic Hall',
  tavern: 'Tavern / Heroes’ Lodge',
  marketplace: 'Marketplace',
  resource_depot: 'Resource Depot',
  workshop: 'Workshop',
  mage_guild: 'Mage Guild / Sanctum',
  pantheon_temple: 'Pantheon Temple',
  fortifications: 'Fortifications / Gatehouse',
  training_academy: 'Training Academy',
  watchtower: 'Watchtower / Observatory',
  artifact_merchant: 'Artifact Merchant',
};

/** Greek creature ID -> [tier, form]. */
const GREEK_FORMS = new Map<string, [number, 'base' | 'upgraded']>();
const GREEK_FAMILY_TIER = new Map<string, number>();
for (const f of GREEK_FAMILY_SPECS) {
  if (!f.pantheonId) continue;
  GREEK_FORMS.set(f.base.id, [f.tier, 'base']);
  if (f.upgraded) GREEK_FORMS.set(f.upgraded.id, [f.tier, 'upgraded']);
  GREEK_FAMILY_TIER.set(f.familyId, f.tier);
}

const PROVENANCE: CreatureDefinition['provenance'] = {
  source: 'proposed-this-build',
  note: 'Names from the owner pantheon board; all numbers proposed on the Greek design/06 curve (unplaytested).',
};

export function buildPantheonKit(spec: PantheonKitSpec): PantheonContent {
  const p = spec.id;
  if (spec.families.length !== 7) throw new Error(`${p}: a pantheon needs exactly seven families`);
  const familyByTier = new Map(spec.families.map((f) => [f.tier as number, f]));

  // --- Building ID mapping from the Greek tree (slot + level) ---
  const idFor = (slotId: string, level: number) => `${p}_${slotId}_l${level}`;
  const greekToLocal = new Map<string, string>();
  for (const b of GREEK_BUILDINGS) greekToLocal.set(b.id, idFor(b.slotId, b.level));
  const mapFamily = (greekFamilyId: string) => {
    const tier = GREEK_FAMILY_TIER.get(greekFamilyId);
    const f = tier ? familyByTier.get(tier) : undefined;
    if (!f) throw new Error(`${p}: no family for Greek ${greekFamilyId}`);
    return f;
  };
  const mapCreature = (greekCreatureId: string) => {
    const hit = GREEK_FORMS.get(greekCreatureId);
    if (!hit) throw new Error(`${p}: unknown Greek creature ${greekCreatureId}`);
    const f = familyByTier.get(hit[0])!;
    return hit[1] === 'base' || !f.upgraded ? f.base.id : f.upgraded.id;
  };
  const mapReq = (r: RequirementDefinition): RequirementDefinition => {
    switch (r.type) {
      case 'has_building':
        return { type: 'has_building', buildingId: greekToLocal.get(r.buildingId) ?? r.buildingId };
      case 'unique_per_player':
        return { type: 'unique_per_player', buildingId: greekToLocal.get(r.buildingId) ?? r.buildingId };
      case 'town_has_covenant':
        return { type: 'town_has_covenant', familyId: mapFamily(r.familyId).familyId };
      case 'all_of':
      case 'any_of':
        return { ...r, requirements: r.requirements.map(mapReq) };
      default:
        return r;
    }
  };
  const mapFx = (e: EffectDefinition): EffectDefinition => (e.type === 'recruit_access' ? { type: 'recruit_access', creatureId: mapCreature(e.creatureId) } : e);

  // --- Names and summaries ---
  const names = spec.town.names;
  const nameOf = (slotId: string, level: number): string => {
    if (slotId.startsWith('dwelling_t')) {
      const tier = Number(slotId.slice('dwelling_t'.length));
      return familyByTier.get(tier)!.dwellingNames[level - 1]!;
    }
    const list = names[slotId as SupportSlot];
    const n = list?.[level - 1];
    if (!n) throw new Error(`${p}: missing name for ${slotId} level ${level}`);
    return n;
  };
  const t4 = familyByTier.get(4)!;
  const summaryOf = (g: BuildingDefinition): string => {
    const lvl = g.level;
    if (g.implementationStatus === 'planned') return 'Planned support building. No mechanics are approved yet.';
    if (g.dwelling) {
      const tier = GREEK_FAMILY_TIER.get(g.dwelling.familyId)!;
      const f = familyByTier.get(tier)!;
      if (g.dwelling.form === 'upgraded' && f.upgraded) return `Also recruit and train ${f.upgraded.plural}. Shares the ${f.base.name} pool.`;
      const gated = g.requirements.some((r) => r.type === 'town_has_covenant');
      return `Recruit ${f.base.plural}. ${f.growth} per week.${gated ? ` Requires an assigned ${f.base.name} covenant.` : ''}`;
    }
    switch (g.slotId) {
      case 'civic_hall':
        return [
          'Starting civic building. 500 Gold per day.',
          `1,000 Gold per day in total (replaces ${nameOf('civic_hall', 1)} income).`,
          '2,000 Gold per day in total.',
          '4,000 Gold per day in total. One per player.',
        ][lvl - 1]!;
      case 'tavern':
        return `Hire eligible heroes. Prerequisite for the ${nameOf('civic_hall', 2)}.`;
      case 'marketplace':
        return 'Sell resources for Gold or buy them with Gold.';
      case 'resource_depot':
        return '+1 Wood and +1 Stone per day.';
      case 'workshop':
        return `Military prerequisite (${t4.dwellingNames[0]}, ${nameOf('civic_hall', 3)}). Sells four tier-1 items each week where the scenario has them; each one once a week.`;
      case 'mage_guild':
        return ['Tier-1 spells; sells spellbooks (500 Gold).', 'Tier-2 spells.', 'Tier-3 spells (Wisdom required to learn).'][lvl - 1]!;
      case 'pantheon_temple':
        return ['1 Favor per day; unlocks the first minor-god choice.', '2 Favor per day in total; required for the second minor-god choice.'][lvl - 1]!;
      case 'fortifications':
        return ['Perimeter walls and gate; military prerequisite.', '1.5× base weekly growth; keep and moat.', '2× base weekly growth; stronger walls and towers.'][lvl - 1]!;
      case 'training_academy':
      case 'watchtower':
      case 'artifact_merchant':
        return g.summary;
      default:
        return g.summary;
    }
  };

  const buildings: BuildingDefinition[] = GREEK_BUILDINGS.map((g) => {
    const tier = g.dwelling ? GREEK_FAMILY_TIER.get(g.dwelling.familyId)! : 0;
    const role = GREEK_TOWN.slots.find((s) => s.id === g.slotId)?.role;
    const art = g.dwelling ? `town.${p}.dwelling.tier${tier}.${g.dwelling.form}` : `town.${p}.support.${role ?? g.slotId}.l${g.level}`;
    return {
      id: idFor(g.slotId, g.level),
      pantheonId: p,
      name: nameOf(g.slotId, g.level),
      slotId: g.slotId,
      level: g.level,
      cost: g.cost,
      requirements: g.requirements.map(mapReq),
      effects: g.effects.map(mapFx),
      ...(g.dwelling ? { dwelling: { ...g.dwelling, familyId: familyByTier.get(tier)!.familyId } } : {}),
      summary: summaryOf(g),
      implementationStatus: g.implementationStatus,
      artAssetId: art,
      provenance:
        g.implementationStatus === 'planned'
          ? { source: 'owner-architecture', note: 'Location from the owner architecture; mechanics not yet designed.' }
          : { source: 'proposed-this-build', note: `${spec.name} names; cost and prerequisites mirror the Greek design/03 location (P).` },
    };
  });

  const slots: BuildingSlotDefinition[] = GREEK_TOWN.slots.map((s) => {
    const placement = spec.town.placements[s.id as keyof PantheonKitSpec['town']['placements']];
    if (!placement) throw new Error(`${p}: no placement for ${s.id}`);
    const label = s.kind === 'dwelling' ? `Tier ${s.tier} — ${nameOf(s.id, 1)}` : (spec.town.labels?.[s.id as SupportSlot] ?? DEFAULT_LABELS[s.id as SupportSlot]);
    return {
      ...s,
      label,
      chain: s.chain.map((gid) => greekToLocal.get(gid)!),
      placement: { x: placement.x, y: placement.y, width: placement.width, height: placement.width, layer: placement.layer },
    };
  });

  const town: TownArchetypeDefinition = withH3CityArt({
    id: spec.town.archetypeId,
    pantheonId: p,
    name: spec.town.name,
    backgroundAssetId: `town.${p}.background`,
    ...(spec.town.hudAnchor ? { hudAnchor: spec.town.hudAnchor } : {}),
    slots,
  });

  // --- Creatures (dwelling IDs follow the mirrored tree) ---
  const familySpecs: FamilySpec[] = spec.families.map((f) => ({
    familyId: f.familyId,
    name: f.name,
    pantheonId: p,
    tier: f.tier,
    growth: f.growth,
    role: f.role,
    roleLabel: f.roleLabel,
    body: f.body,
    dwelling: idFor(`dwelling_t${f.tier}`, 1),
    dwellingUp: idFor(`dwelling_t${f.tier}`, 2),
    base: f.base,
    upgraded: f.upgraded,
  }));
  const { families, creatures } = buildFamilies(familySpecs, PROVENANCE);

  const lore: LoreDefinition[] = spec.families.map((f) => ({
    id: `lore.${f.familyId}`,
    sourceNote: f.lore.sourceNote,
    sourceRefs: f.lore.sourceRefs,
    sourceStatus: 'draft_requires_review',
    gameLore: f.lore.gameLore,
    upgradeLore: f.lore.upgradeLore,
  }));

  // --- Gods ---
  const godId = (name: string) => `${p}_${slug(name)}`;
  const gods: GodDefinition[] = [
    {
      id: godId(spec.patron.name),
      pantheonId: p,
      name: spec.patron.name,
      domain: spec.patron.domain,
      role: 'patron',
      requirements: [],
      favorCost: 0,
      benefits: [],
      benefitSummary: [`Patron of the ${spec.name} skirmish armies.`, 'No mechanical bonus in rule profile pr-0.2-candidate (mirrors Zeus; proposed).'],
      ...(spec.patron.quote ? { quote: spec.patron.quote } : {}),
      portraitAssetId: `god.${p}.${slug(spec.patron.name)}.portrait`,
      implementationStatus: 'implemented',
      provenance: { source: 'proposed-this-build', note: 'Patron role mirrors Zeus; no bonus.' },
    },
    ...spec.minors.map((m): GodDefinition => ({
      id: godId(m.name),
      pantheonId: p,
      name: m.name,
      domain: m.domain,
      role: 'minor',
      exclusivityGroup: 'first_minor',
      requirements: [{ type: 'has_building', buildingId: idFor('pantheon_temple', 1) }],
      favorCost: 20,
      benefits:
        m.mirrors === 'attack'
          ? [
              { type: 'commander_attribute', attribute: 'attack', amount: 1 },
              { type: 'spell_eligibility', spellId: 'warcry' },
            ]
          : [
              { type: 'commander_attribute', attribute: 'defense', amount: 1 },
              { type: 'spell_eligibility', spellId: 'ward' },
            ],
      benefitSummary:
        m.mirrors === 'attack'
          ? ['+1 Attack for your commanders.', `War Cry becomes learnable at a later ${nameOf('mage_guild', 1).replace(/ I$/, '')} visit.`]
          : ['+1 Defense for your commanders.', `Ward becomes learnable at a later ${nameOf('mage_guild', 1).replace(/ I$/, '')} visit.`],
      ...(m.quote ? { quote: m.quote } : {}),
      portraitAssetId: `god.${p}.${slug(m.name)}.portrait`,
      implementationStatus: 'implemented',
      provenance: { source: 'proposed-this-build', note: m.mirrors === 'attack' ? 'Mirrors Ares (P).' : 'Mirrors Athena (P).' },
    })),
    ...spec.extraFirstMinors.map((g) =>
      firstMinorGod({
        id: godId(g.name),
        pantheonId: p,
        name: g.name,
        domain: g.domain,
        ...(g.quote ? { quote: g.quote } : {}),
        benefits: g.blessing.benefits,
        benefitSummary: g.blessing.benefitSummary,
        portraitAssetId: `god.${p}.${slug(g.name)}.portrait`,
        templeId: idFor('pantheon_temple', 1),
      }),
    ),
    ...spec.secondMinors.map((g) =>
      secondMinorGod({
        id: godId(g.name),
        pantheonId: p,
        name: g.name,
        domain: g.domain,
        ...(g.quote ? { quote: g.quote } : {}),
        benefits: g.blessing.benefits,
        benefitSummary: g.blessing.benefitSummary,
        portraitAssetId: `god.${p}.${slug(g.name)}.portrait`,
        templeId: idFor('pantheon_temple', 2),
        civicHallId: idFor('civic_hall', 3),
      }),
    ),
  ];

  // --- Classes (numbers mirror the shared classes) and heroes ---
  const classes: HeroClassDefinition[] = spec.classes.map((c) => {
    const base = HERO_CLASSES.find((h) => h.id === c.mirrors)!;
    return { ...base, id: c.id, name: c.name, summary: `${c.summary} (mirrors ${base.name}; proposed).` };
  });
  const heroes: HeroDefinition[] = spec.heroes.map((h) => ({
    id: `${p}_${slug(h.name)}`,
    pantheonId: p,
    name: h.name,
    title: h.title,
    classId: h.classId,
    biography: h.biography,
    portraitAssetId: `hero.${p}.${slug(h.name)}.portrait`,
    availability: 'hireable',
    provenance: h.proposed
      ? { source: 'proposed-this-build', note: `Owner request 2026-10-04: more ${spec.name} heroes. Name, title, class, story and specialty proposed (unplaytested).` }
      : { source: 'concept-board', note: `Name and title from the owner ${spec.name} board; class assignment proposed.` },
  }));

  const pantheon: PantheonDefinition = {
    id: p,
    name: spec.name,
    epithet: spec.epithet,
    summary: spec.summary,
    ...(SIGNATURES[p] ? { signature: SIGNATURES[p] } : {}),
    playability: 'playable',
    roster: spec.families.map((f) => ({ tier: f.tier, familyId: f.familyId })),
    heroIds: heroes.map((h) => h.id),
    godIds: gods.map((g) => g.id),
    townArchetypeId: town.id,
    theme: { accent: spec.accent, accentSoft: spec.accentSoft, emblemAssetId: `emblem.${p}`, musicThemeId: `music.${p}.theme` },
    provenance: { source: 'proposed-this-build', note: 'Owner request: every pantheon playable; Claude proposes every number; labelled proposed.' },
  };

  return { pantheon, families, creatures, buildings, town, gods, heroes, classes, lore };
}

/** Building ID for a location/level of a kit-built pantheon (for scenarios and tests). */
export function kitBuildingId(pantheonId: string, slotId: string, level: number): string {
  return `${pantheonId}_${slotId}_l${level}`;
}
