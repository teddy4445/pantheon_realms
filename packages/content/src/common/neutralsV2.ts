/**
 * The six neutral creature families of the campaign expansion (handoff
 * 2026-10-15, docs/campaign-v2/design/neutral-content.json): Pegasus,
 * Root-Runner, Serpopard, Baku, Afanc and Ahuitzotl.
 *
 * Unaffiliated: recruitable by every pantheon at their own hiring sites
 * (`neutral_dwelling` sites, finite weekly stock), never part of a town roster.
 * Optional sidegrades: no mandatory objective needs them.
 *
 * Upgrades (owner request, battle FX & neutral upgrades delivery 2026-10-15,
 * docs/battle-fx-neutral-upgrades-v1/design/neutral-upgrades.json; supersedes the
 * earlier single-form instruction): each family is now base + exactly one
 * upgraded form — Dawncrest Pegasus, Crownroot Runner, Crested Serpopard,
 * Dreamtusk Baku, Ridgeback Afanc, Crownfin Ahuitzotl. The base forms, family
 * IDs, tier, footprint, body and abilities are unchanged (Pegasus alone flies;
 * no ammunition); the builder sets `upgradedCreatureId`. Both forms are hired at
 * the family's existing hiring site from its ONE shared weekly stock, and a base
 * stack trains there for the price difference (packages/rules/src/systems/world.ts).
 * Portraits: `neutralupgrade.portrait.<id>` (assets-runtime/battle-fx-neutral-upgrades-v1).
 *
 * Statistics, prices and stock are the kits' starting values: proposed and
 * unplaytested. Their abilities are new rule types (packages/rules/src/systems/battle/neutralAbilities.ts);
 * a reused icon never grants the old ability it was drawn for.
 */
import type { AbilityDefinition, LoreDefinition } from '@pr/rules';
import { s, type FamilySpec } from '../greek/creatures';
import { DRAGON_HABITATS, DRAGON_SITE_STOCK } from './neutralDragons';

const MYTH = 'Mythological inspiration only; the game creature, its numbers and its story are an original adaptation without faction allegiance.';

export const NEUTRAL_V2_ABILITIES: readonly AbilityDefinition[] = [
  {
    id: 'neutral_sheltering_wings',
    name: 'Sheltering Wings',
    activation: 'active',
    summary: 'Spreads its wings over an adjacent ally: the next blow it takes is softened.',
    exactRule:
      'Once per battle per stack; spends the action. One adjacent allied living stack (not itself) takes 25% less from its next direct melee or ranged creature attack (the reduction rounded down) before the start of this stack’s next turn. Copies do not stack.',
    restriction: 'Does not reduce spell, siege-structure or environmental damage. Flight still needs a legal landing.',
    rule: { type: 'sheltering_wings', reductionPercent: 25, usesPerBattle: 1 },
    implementationStatus: 'implemented',
  },
  {
    id: 'neutral_distract',
    name: 'Distract',
    activation: 'active',
    summary: 'A darting feint: the enemy’s next answer to an attack never comes.',
    exactRule:
      'Once per battle per stack; spends the action. One visible hostile living stack within 2 hexes in a clear line has its next otherwise-legal retaliation suppressed until the start of this stack’s next turn; the suppressed retaliation counts as used.',
    restriction: 'No damage, movement or stun; the target still acts normally. Copies do not stack; unlimited retaliation loses only one answer.',
    rule: { type: 'distract', range: 2, usesPerBattle: 1 },
    implementationStatus: 'implemented',
  },
  {
    id: 'neutral_long_reach',
    name: 'Long Reach',
    activation: 'passive',
    summary: 'Its long neck strikes across one open hex.',
    exactRule:
      'Besides ordinary adjacent melee, may strike an enemy exactly 2 hexes away along a straight line whose middle hex is clear of stacks, the fallen, obstacles and intact structures, for 75% of normal melee damage (at least 1).',
    restriction: 'A melee strike, not a shot: no ammunition. The target retaliates only if it can reach back the same way. Never through intact walls or a closed gate.',
    rule: { type: 'long_reach', distance: 2, damagePercent: 75 },
    implementationStatus: 'implemented',
  },
  {
    id: 'neutral_devour_dread',
    name: 'Devour Dread',
    activation: 'active',
    summary: 'Eats the bad dream: removes one temporary hostile debuff.',
    exactRule:
      'Once per battle per stack; spends the action. One allied living stack within 2 hexes in a clear line (itself included) loses exactly one temporary hostile debuff — a negative Attack, Defense or Speed bonus, or a hostile curse to minimum damage — the earliest applied first.',
    restriction: 'Never removes a blessing, equipment, army morale or a mission state. Unavailable (no use spent) when no ally in reach has such a debuff.',
    rule: { type: 'devour_dread', range: 2, usesPerBattle: 1 },
    implementationStatus: 'implemented',
  },
  {
    id: 'neutral_reed_guard',
    name: 'Reed Guard',
    activation: 'active',
    summary: 'Braces in the reeds and shields a neighbour.',
    exactRule:
      'Once per battle per stack; spends the action and this stack defends. One adjacent allied living stack (not itself) gains +2 Defense and immunity to one forced pull, both until the start of this stack’s next turn. A stopped pull spends only the immunity.',
    restriction: 'Copies from several stacks do not stack. Creates no water and grants no extra attack.',
    rule: { type: 'reed_guard', defenseBonus: 2, usesPerBattle: 1 },
    implementationStatus: 'implemented',
  },
  {
    id: 'neutral_tail_snare',
    name: 'Tail Snare',
    activation: 'active',
    summary: 'The hand at the tail’s tip drags a small enemy one hex closer.',
    exactRule:
      'Once per battle per stack; spends the action. A visible hostile living one-hex stack exactly 2 hexes away along a clear straight line is pulled one hex toward this stack, if that hex is empty, on the board and not a hazard.',
    restriction: 'No damage, attack or retaliation. Not through walls, gates, occupied hexes or the moat; never a two-hex stack; a stack protected from pulls cannot be chosen.',
    rule: { type: 'tail_snare', distance: 2, usesPerBattle: 1 },
    implementationStatus: 'implemented',
  },
];

/** Weekly stock of one hiring site (the kit's `weeklySiteStock`). */
export const NEUTRAL_V2_SITE_STOCK: Readonly<Record<string, number>> = { pegasus: 5, root_runner: 8, serpopard: 5, baku: 5, afanc: 5, ahuitzotl: 5, ...DRAGON_SITE_STOCK };

/** Habitat tags (map editor and placement checks): where a hiring site may stand, and where never. */
export const NEUTRAL_V2_HABITATS: Readonly<Record<string, { readonly habitat: string; readonly tags: readonly string[]; readonly forbidden: readonly string[]; readonly biomes: readonly string[] }>> = {
  ...DRAGON_HABITATS,
  pegasus: { habitat: 'High meadows and pale limestone uplands with a spring.', tags: ['upland_meadow', 'limestone_hills'], forbidden: ['open_water', 'bare_dunes', 'lava'], biomes: ['coast', 'high_pass', 'storm_plateau', 'temperate'] },
  root_runner: { habitat: 'Ancient knotted tree-root hollows among mossy forest boulders.', tags: ['temperate_forest', 'conifer_edge', 'mossy_grove'], forbidden: ['bare_dunes', 'open_water', 'lava'], biomes: ['temperate', 'tundra', 'fjord', 'autumn', 'moor'] },
  serpopard: { habitat: 'Shaded sandstone dens where dry desert meets a river.', tags: ['sandstone_riverbank', 'dry_oasis', 'arid_scrub'], forbidden: ['deep_snow', 'open_water', 'lava'], biomes: ['desert'] },
  baku: { habitat: 'Quiet misty cedar groves with moss-covered stones.', tags: ['mist_forest', 'cedar_grove', 'wooded_sanctuary'], forbidden: ['bare_dunes', 'open_water', 'lava'], biomes: ['autumn', 'temperate'] },
  afanc: { habitat: 'Freshwater reed pools, lake banks and river pools.', tags: ['freshwater_reeds', 'lake_bank', 'river_pool'], forbidden: ['open_ocean', 'bare_dunes', 'lava'], biomes: ['moor', 'temperate', 'fjord'] },
  ahuitzotl: { habitat: 'Warm freshwater cenotes and jungle banks.', tags: ['tropical_cenote', 'jungle_freshwater_bank', 'warm_marsh'], forbidden: ['open_ocean', 'deep_snow', 'bare_dunes', 'lava'], biomes: ['jungle'] },
};

const portrait = (id: string) => ({ portraitAssetId: `campaignv2.portrait.${id}` });
/** The upgraded form's delivered portrait (battle FX & neutral upgrades, 2026-10-15). */
const upgradePortrait = (id: string) => ({ portraitAssetId: `neutralupgrade.portrait.${id}` });

export const NEUTRAL_V2_FAMILY_SPECS: readonly FamilySpec[] = [
  {
    familyId: 'pegasus',
    name: 'Pegasi',
    pantheonId: null,
    tier: 3,
    growth: NEUTRAL_V2_SITE_STOCK['pegasus']!,
    role: 'flying_interceptor',
    roleLabel: 'Flying escort (neutral)',
    body: 'griffin',
    base: {
      id: 'pegasus',
      name: 'Pegasus',
      plural: 'Pegasi',
      stats: s(7, 8, 25, [3, 5], 8, 0, 2),
      cost: { gold: 250 },
      abilities: ['flight', 'neutral_sheltering_wings'],
      summary: 'Ivory-winged horses of the high meadows. They escort, they shelter, they do not carry riders.',
      portraitAlt: 'An ivory-white winged horse with a short silver mane and pale-gold feather tips, standing in a high meadow.',
      ...portrait('pegasus'),
    },
    upgraded: {
      id: 'dawncrest_pegasus',
      name: 'Dawncrest Pegasus',
      plural: 'Dawncrest Pegasi',
      stats: s(9, 10, 30, [4, 6], 9, 0, 2),
      cost: { gold: 325 },
      abilities: ['flight', 'neutral_sheltering_wings'],
      summary: 'Herd leaders of the dawn meadows, crowned with a swept crest of pale-gold feathers. Steadier wings, the same shelter.',
      portraitAlt: 'An ivory winged horse with a tall backward-swept crest of pale-gold feathers over its mane and broad gold-tipped wings, in a limestone meadow at dawn.',
      ...upgradePortrait('dawncrest_pegasus'),
    },
  },
  {
    familyId: 'root_runner',
    name: 'Root-Runners',
    pantheonId: null,
    tier: 2,
    growth: NEUTRAL_V2_SITE_STOCK['root_runner']!,
    role: 'skirmisher',
    roleLabel: 'Scout and distraction (neutral)',
    body: 'beast',
    base: {
      id: 'root_runner',
      name: 'Root-Runner',
      plural: 'Root-Runners',
      stats: s(5, 4, 14, [2, 4], 8, 0, 1),
      cost: { gold: 110 },
      abilities: ['neutral_distract'],
      summary: 'Great russet squirrels of the old roots: quick, loud and very hard to ignore.',
      portraitAlt: 'A large russet-red squirrel with tufted ears, amber eyes and a magnificent curled tail among mossy roots.',
      ...portrait('root_runner'),
    },
    upgraded: {
      id: 'crownroot_runner',
      name: 'Crownroot Runner',
      plural: 'Crownroot Runners',
      stats: s(7, 5, 18, [3, 4], 9, 0, 1),
      cost: { gold: 145 },
      abilities: ['neutral_distract'],
      summary: 'Old runners of the deepest roots, crowned with branching ear tufts and a great three-lobed tail. Louder, quicker, harder still to ignore.',
      portraitAlt: 'A large russet squirrel with branching three-pronged ear tufts, a cream shoulder ruff and an enormous upright three-lobed tail, among ancient mossy roots.',
      ...upgradePortrait('crownroot_runner'),
    },
  },
  {
    familyId: 'serpopard',
    name: 'Serpopards',
    pantheonId: null,
    tier: 3,
    growth: NEUTRAL_V2_SITE_STOCK['serpopard']!,
    role: 'fast_melee',
    roleLabel: 'Long-reach predator (neutral)',
    body: 'beast',
    base: {
      id: 'serpopard',
      name: 'Serpopard',
      plural: 'Serpopards',
      stats: s(8, 5, 24, [4, 6], 6, 0, 2),
      cost: { gold: 230 },
      abilities: ['neutral_long_reach'],
      summary: 'Spotted river-edge hunters whose sinuous necks strike from beyond a spear’s length.',
      portraitAlt: 'An ochre-spotted leopard-like animal with an extraordinarily long sinuous neck and teal eyes, by a sandstone den.',
      ...portrait('serpopard'),
    },
    upgraded: {
      id: 'crested_serpopard',
      name: 'Crested Serpopard',
      plural: 'Crested Serpopards',
      stats: s(10, 7, 30, [5, 7], 7, 0, 2),
      cost: { gold: 300 },
      abilities: ['neutral_long_reach'],
      summary: 'Den-mothers of the river edge, a turquoise and ochre frill fanned behind the head. The same long strike, from a heavier hunter.',
      portraitAlt: 'A spotted leopard-like animal with a long sinuous neck and a broad turquoise and ochre fan-shaped frill behind its head, by a sandstone den.',
      ...upgradePortrait('crested_serpopard'),
    },
  },
  {
    familyId: 'baku',
    name: 'Baku',
    pantheonId: null,
    tier: 3,
    growth: NEUTRAL_V2_SITE_STOCK['baku']!,
    role: 'heavy_melee',
    roleLabel: 'Protective support (neutral)',
    body: 'beast',
    base: {
      id: 'baku',
      name: 'Baku',
      plural: 'Baku',
      stats: s(5, 9, 28, [2, 4], 5, 0, 2),
      cost: { gold: 240 },
      abilities: ['neutral_devour_dread'],
      summary: 'Sleepy, sturdy dream-eaters of the cedar groves. They take the dread out of a battle line.',
      portraitAlt: 'A tapir-like beast with a short curved trunk, a shaggy indigo coat and cream mane, in a misty cedar grove.',
      ...portrait('baku'),
    },
    upgraded: {
      id: 'dreamtusk_baku',
      name: 'Dreamtusk Baku',
      plural: 'Dreamtusk Baku',
      stats: s(6, 11, 35, [3, 5], 6, 0, 2),
      cost: { gold: 310 },
      abilities: ['neutral_devour_dread'],
      summary: 'Elder dream-eaters with upward-curled ivory tusks and a high cream crest. Sturdier guardians of a frightened line.',
      portraitAlt: 'A deep-indigo tapir-like beast with two large upward-curled ivory tusks beside a short trunk, a high swept-back cream mane and gold streaks, in a misty cedar grove.',
      ...upgradePortrait('dreamtusk_baku'),
    },
  },
  {
    familyId: 'afanc',
    name: 'Afancs',
    pantheonId: null,
    tier: 3,
    growth: NEUTRAL_V2_SITE_STOCK['afanc']!,
    role: 'heavy_melee',
    roleLabel: 'Slow defensive guard (neutral)',
    body: 'beast',
    base: {
      id: 'afanc',
      name: 'Afanc',
      plural: 'Afancs',
      stats: s(7, 10, 32, [3, 5], 4, 0, 2),
      cost: { gold: 230 },
      abilities: ['neutral_reed_guard'],
      summary: 'Low, heavy beasts of the reed pools. Slow to move and slower to give ground.',
      portraitAlt: 'A low heavy freshwater beast with a broad beaver-like muzzle, mossy fur and a ridged reptilian back, by a reed pool.',
      ...portrait('afanc'),
    },
    upgraded: {
      id: 'ridgeback_afanc',
      name: 'Ridgeback Afanc',
      plural: 'Ridgeback Afancs',
      stats: s(9, 12, 40, [4, 6], 4, 0, 2),
      cost: { gold: 300 },
      abilities: ['neutral_reed_guard'],
      summary: 'Old bulls of the reed pools with a stepped ridge of bony plates along the back. Slower to move than ever, and harder to shift.',
      portraitAlt: 'A low heavy moss-brown beaver-like beast with a tall stepped ridge of slate-green bony plates on its back, cream whiskers and a wide paddle tail, by a reed pool.',
      ...upgradePortrait('ridgeback_afanc'),
    },
  },
  {
    familyId: 'ahuitzotl',
    name: 'Ahuitzotls',
    pantheonId: null,
    tier: 3,
    growth: NEUTRAL_V2_SITE_STOCK['ahuitzotl']!,
    role: 'skirmisher',
    roleLabel: 'Ambush and pull (neutral)',
    body: 'beast',
    base: {
      id: 'ahuitzotl',
      name: 'Ahuitzotl',
      plural: 'Ahuitzotls',
      stats: s(8, 6, 24, [3, 6], 6, 0, 1),
      cost: { gold: 250 },
      abilities: ['neutral_tail_snare'],
      summary: 'Sleek cenote hunters whose tails end in a small grasping hand.',
      portraitAlt: 'A sleek dark teal otter-like animal with webbed paws and a long tail ending in a small five-fingered hand, by a cenote.',
      ...portrait('ahuitzotl'),
    },
    upgraded: {
      id: 'crownfin_ahuitzotl',
      name: 'Crownfin Ahuitzotl',
      plural: 'Crownfin Ahuitzotls',
      stats: s(10, 8, 30, [4, 7], 7, 0, 1),
      cost: { gold: 325 },
      abilities: ['neutral_tail_snare'],
      summary: 'Cenote elders with a swept turquoise fin crest and a larger webbed hand at the tail’s tip. The same pull, from a stronger hunter.',
      portraitAlt: 'A sleek dark teal otter-like animal with a large swept turquoise fin crest and a long tail ending in a big webbed five-fingered hand, by a tropical cenote.',
      ...upgradePortrait('crownfin_ahuitzotl'),
    },
  },
];

export const NEUTRAL_V2_LORE: readonly LoreDefinition[] = [
  {
    id: 'lore.pegasus',
    sourceNote: `Pegasus is the winged horse of Greek myth, born of Medusa and tamed with Athena’s bridle. ${MYTH}`,
    sourceRefs: ['Hesiod, Theogony (the birth of Pegasus)', 'Pindar, Olympian 13 (Bellerophon and the bridle)'],
    sourceStatus: 'draft_requires_review',
    gameLore:
      'Herds of winged horses graze the limestone meadows above the springs. They answer no god’s banner since the worlds collided; they follow an army only when they judge its cause worth the sky.',
    upgradeLore: 'The dawncrest leads a herd: when the first light strikes its feathered crest, the others lift into the sky behind it.',
  },
  {
    id: 'lore.root_runner',
    sourceNote: `Inspired by Ratatoskr, the squirrel who runs up and down the world-tree carrying insults in Norse myth (Grímnismál). This is an animal of the old roots, not the named messenger. ${MYTH}`,
    sourceRefs: ['Poetic Edda, Grímnismál 32'],
    sourceStatus: 'draft_requires_review',
    gameLore: 'Root-Runners live where tree roots knot over boulders. They chatter, they dart, and an enemy who turns to swat one has already lost the moment it needed.',
    upgradeLore: 'A crownroot has run the same roots for longer than the oldest forester remembers; even other root-runners stop to listen when it chatters.',
  },
  {
    id: 'lore.serpopard',
    sourceNote: `Serpopards — long-necked felines — appear on Egyptian ceremonial palettes of the late fourth millennium BCE (the Narmer Palette). ${MYTH}`,
    sourceRefs: ['The Narmer Palette (Egyptian Museum, Cairo)'],
    sourceStatus: 'draft_requires_review',
    gameLore: 'They den in shaded sandstone where the desert meets the river and strike at whatever comes to drink, from a distance no spear expects.',
    upgradeLore: 'The crested ones keep the best dens, where the river is deepest in the dry season. The frill rises before the strike — the last thing a careless drinker sees.',
  },
  {
    id: 'lore.baku',
    sourceNote: `The baku is the nightmare-eating creature of Japanese folklore, drawn as a tapir-like chimera. ${MYTH}`,
    sourceRefs: ['General reference — the baku in Japanese folklore'],
    sourceStatus: 'draft_requires_review',
    gameLore: 'Shrine-keepers leave incense in the cedar groves for the baku. Soldiers who march beside one sleep without dreaming of the last battle, and stand straighter in the next.',
    upgradeLore: 'A dreamtusk eats the nightmares of a whole village and still walks the grove at dawn. Shrine-keepers say its tusks curl one turn for every century.',
  },
  {
    id: 'lore.afanc',
    sourceNote: `The afanc is a lake monster of Welsh legend, dragged from its pool by oxen in some tellings. ${MYTH}`,
    sourceRefs: ['General reference — the afanc in Welsh folklore'],
    sourceStatus: 'draft_requires_review',
    gameLore: 'Afancs gnaw driftwood into dams and sleep in the reeds behind them. Push one and it will not move; push its neighbour and it will lean across to hold them both.',
    upgradeLore: 'The ridgebacks build the oldest dams. Their plates are grown, not forged; the reeds grow through the gaps between them.',
  },
  {
    id: 'lore.ahuitzotl',
    sourceNote: `The ahuitzotl is a water creature of Aztec lore with a hand at the end of its tail, described in the Florentine Codex. ${MYTH}`,
    sourceRefs: ['Bernardino de Sahagún, Florentine Codex, book 11'],
    sourceStatus: 'draft_requires_review',
    gameLore: 'In the clear cenotes the ahuitzotl waits under the ferns. The hand at its tail’s tip reaches out and pulls; by the time the victim looks down, it is already a step closer.',
    upgradeLore: 'A crownfin’s fin crest breaks the cenote’s surface only once — when its tail-hand has already closed.',
  },
];
