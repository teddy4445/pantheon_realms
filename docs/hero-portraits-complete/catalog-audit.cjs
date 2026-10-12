// ../pantheon_realms/packages/content/src/common/godPerks.ts
var PERK_THEMES = {
  might: { label: "Might", summary: "+2 Attack", effects: [{ type: "commander_attribute", attribute: "attack", amount: 2 }] },
  guard: { label: "Guard", summary: "+2 Defense", effects: [{ type: "commander_attribute", attribute: "defense", amount: 2 }] },
  sorcery: { label: "Sorcery", summary: "+2 Spell Power", effects: [{ type: "commander_attribute", attribute: "power", amount: 2 }] },
  lore: { label: "Lore", summary: "+2 Knowledge", effects: [{ type: "commander_attribute", attribute: "knowledge", amount: 2 }] },
  strategy: {
    label: "Strategy",
    summary: "+1 Attack and +1 Defense",
    effects: [
      { type: "commander_attribute", attribute: "attack", amount: 1 },
      { type: "commander_attribute", attribute: "defense", amount: 1 }
    ]
  },
  glory: { label: "Glory", summary: "+25 % experience from battles this hero wins", effects: [{ type: "battle_xp_percent", percent: 25 }] },
  fortune: { label: "Fortune", summary: "+1 Luck", effects: [{ type: "luck", amount: 1 }] },
  majesty: { label: "Majesty", summary: "+1 Morale", effects: [{ type: "morale", amount: 1 }] },
  watch: { label: "Watch", summary: "+3 hexes of vision", effects: [{ type: "vision_radius", amount: 3 }] },
  plenty: { label: "Plenty", summary: "+350 Gold a day", effects: [{ type: "daily_income", resource: "gold", amount: 350 }] },
  healing: { label: "Healing", summary: "After a won battle, 15 % of the army\u2019s losses return", effects: [{ type: "casualty_recovery", percent: 15 }] },
  renewal: { label: "Renewal", summary: "+4 mana every dawn", effects: [{ type: "mana_regen", amount: 4 }] },
  travel: { label: "Travel", summary: "+15 % movement on land", effects: [{ type: "movement_percent", percent: 15 }] },
  horizon: {
    label: "Horizon",
    summary: "+10 % movement on land and +1 hex of vision",
    effects: [
      { type: "movement_percent", percent: 10 },
      { type: "vision_radius", amount: 1 }
    ]
  },
  hunt: { label: "Hunt", summary: "Shooting creatures +2 Attack in battle", effects: [{ type: "creature_stat", stat: "attack", amount: 2, ability: "shooter" }] },
  swift: { label: "Swiftness", summary: "Every creature +1 Speed in battle", effects: [{ type: "creature_stat", stat: "speed", amount: 1 }] },
  storm: { label: "Storm", summary: "+20 % damage from this hero\u2019s spells", effects: [{ type: "spell_damage_percent", percent: 20 }] },
  afterlife: { label: "Afterlife", summary: "A stack reduced to a third of its creatures fights with +3 Attack", effects: [{ type: "wounded_fury", attack: 3, numerator: 1, denominator: 3 }] }
};
var DOMAIN_THEME = {
  Lightning: "storm",
  Storms: "storm",
  Thunder: "storm",
  Fire: "storm",
  Power: "might",
  War: "might",
  Strength: "might",
  Conquest: "glory",
  Honor: "glory",
  Dominion: "glory",
  Knowledge: "lore",
  Inspiration: "lore",
  Skill: "lore",
  Insight: "lore",
  Strategy: "strategy",
  Magic: "sorcery",
  Night: "sorcery",
  Shadow: "sorcery",
  Prophecy: "sorcery",
  Wisdom: "sorcery",
  Control: "sorcery",
  Transformation: "sorcery",
  "the Otherworld": "sorcery",
  Change: "sorcery",
  Foresight: "fortune",
  Trickery: "fortune",
  Chaos: "fortune",
  Grace: "fortune",
  Fate: "fortune",
  Mists: "fortune",
  Protection: "guard",
  "Funerary Protection": "guard",
  Guardianship: "guard",
  Vigilance: "guard",
  Family: "guard",
  Justice: "guard",
  "the Land": "guard",
  Earth: "guard",
  Alertness: "watch",
  Sun: "majesty",
  Light: "majesty",
  Kingship: "majesty",
  Authority: "majesty",
  Law: "majesty",
  Ancestry: "majesty",
  Joy: "majesty",
  Love: "majesty",
  Arts: "majesty",
  Hearth: "majesty",
  Abundance: "plenty",
  Prosperity: "plenty",
  Bounty: "plenty",
  Fertility: "plenty",
  Trade: "plenty",
  Healing: "healing",
  Harvest: "healing",
  Purity: "healing",
  Vitality: "healing",
  Rebirth: "healing",
  Survival: "healing",
  Renewal: "healing",
  Creation: "renewal",
  Eternity: "renewal",
  Transition: "renewal",
  Rain: "renewal",
  Movement: "travel",
  Journeys: "travel",
  Journey: "travel",
  Wilderness: "travel",
  Sea: "horizon",
  Seas: "horizon",
  Waters: "horizon",
  "River Power": "horizon",
  Wind: "horizon",
  Hunt: "hunt",
  Wilds: "hunt",
  Horses: "swift",
  Underworld: "afterlife",
  Death: "afterlife",
  "Underworld Guidance": "afterlife"
};
var NEIGHBOUR = {
  might: "glory",
  guard: "afterlife",
  sorcery: "lore",
  lore: "sorcery",
  strategy: "might",
  glory: "might",
  fortune: "sorcery",
  majesty: "guard",
  watch: "guard",
  plenty: "healing",
  healing: "renewal",
  renewal: "healing",
  travel: "horizon",
  horizon: "travel",
  hunt: "travel",
  swift: "travel",
  storm: "might",
  afterlife: "sorcery"
};
var possessive = (name) => name.endsWith("s") ? `${name}\u2019` : `${name}\u2019s`;
function godPerksOf(god) {
  const words = god.domain.split(/\s*&\s*/).map((w) => w.trim()).filter(Boolean);
  const themes = words.map((w) => {
    const t = DOMAIN_THEME[w];
    if (!t) throw new Error(`No gift theme for "${w}" (${god.name})`);
    return t;
  });
  const first = themes[0];
  const second = themes[1] && themes[1] !== first ? themes[1] : NEIGHBOUR[first];
  const secondWord = themes[1] && themes[1] !== first ? words[1] : null;
  return [
    { theme: first, word: words[0] },
    { theme: second, word: secondWord }
  ].map(({ theme, word }, i) => {
    const t = PERK_THEMES[theme];
    const name = `${possessive(god.name)} ${word && !word.startsWith("the ") ? word : t.label}`;
    return { id: `${god.id}.gift${i + 1}`, godId: god.id, theme, name, summary: t.summary, effects: t.effects };
  });
}
function buildGodPerks(gods) {
  return gods.filter((g2) => g2.implementationStatus === "implemented" && g2.role !== "undesigned").flatMap(godPerksOf);
}

// ../pantheon_realms/packages/rules/src/core/clone.ts
function deepFreeze(value) {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
}

// ../pantheon_realms/packages/rules/src/definitions/rulesProfile.ts
var PR_02_CANDIDATE = {
  id: "pr-0.2-candidate",
  daysPerWeek: 7,
  armySlots: 7,
  xpThresholds: [0, 1e3, 2e3, 3200, 4600, 6200, 8e3, 1e4, 12200, 14700],
  // Daily hero movement by the army's slowest Speed. Owner decision 2026-10-02:
  // about 8 open-ground hexes a day (plains cost 100), half of the earlier
  // 1,500–2,000 table. This is the one place to change the pace of the map.
  movementBySlowestSpeed: [
    { speed: 3, points: 750 },
    { speed: 4, points: 780 },
    { speed: 5, points: 815 },
    { speed: 6, points: 850 },
    { speed: 7, points: 880 },
    { speed: 8, points: 915 },
    { speed: 9, points: 950 },
    { speed: 10, points: 980 },
    { speed: 11, points: 1e3 }
  ],
  minimumMovement: 750,
  maximumMovement: 1e3,
  terrainCost: { plains: 100, forest: 125, rough: 125, marsh: 150, mountain: null, water: null, void: null },
  roadCost: 75,
  heroVisionRadius: 5,
  townVisionRadius: 3,
  maxSecondarySkills: 8,
  maxSkillRank: 3,
  manaPerKnowledge: 10,
  dawnManaRegen: 1,
  spellbookCost: 500,
  heroHireCost: 2500,
  maxHeroesPerPlayer: 8,
  backpackCapacity: 30,
  librarySpellsPerTier: [6, 5, 4],
  market: [
    { minMarkets: 1, buyCommon: 500, sellCommon: 50, buyCrystal: 1e3, sellCrystal: 100 },
    { minMarkets: 2, buyCommon: 450, sellCommon: 60, buyCrystal: 900, sellCrystal: 120 },
    { minMarkets: 3, buyCommon: 400, sellCommon: 75, buyCrystal: 800, sellCrystal: 150 }
  ],
  minorGodFavorCost: 20,
  combat: {
    cols: 15,
    rows: 11,
    deploymentColumns: 2,
    maxStacksPerSide: 7,
    attackBonusPerPoint: 50,
    attackBonusCap: 3e3,
    defenseReductionPerPoint: 25,
    defenseReductionCap: 700,
    defendMultiplier: { numerator: 6, denominator: 5 },
    longRangeFactor: { numerator: 1, denominator: 2 },
    wallFactor: { numerator: 1, denominator: 2 },
    meleePenaltyFactor: { numerator: 1, denominator: 2 },
    sameFactionMorale: 1,
    mixedPantheonMorale: 1,
    mixedPantheonMoraleCap: 2,
    negativeMoraleDenominator: 12,
    positiveMoraleDenominator: 24,
    luckDenominator: 24,
    luckBonus: 1e3,
    moraleClamp: 3,
    luckClamp: 3,
    retreatRehireCost: 2500,
    roundLimit: 60,
    siege: {
      wallCol: 10,
      wallHpByLevel: [2, 2, 3],
      gateHp: 2,
      towerHp: 2,
      keepHp: 2,
      catapultDamage: 1,
      wallBreakerDamage: 1,
      keepDamage: 20,
      towerDamage: 10,
      moatDamage: 10
    }
  }
};

// ../pantheon_realms/packages/rules/src/systems/sites.ts
var NEUTRAL_JOIN_CHANCE = 1 / 4;
var NEUTRAL_FLEE_CHANCE = 1 / 3;

// ../pantheon_realms/packages/rules/src/systems/missionText.ts
function armyToken(army) {
  return `{army:${army.map((s3) => `${s3.creatureId}=${s3.count}`).join(",")}}`;
}

// ../pantheon_realms/packages/content/src/common/abilities.ts
var ABILITIES = [
  {
    id: "charge_guard",
    name: "Charge Guard",
    activation: "passive",
    summary: "Braced shields blunt a cavalry charge.",
    exactRule: "Ignore the attacker's charge bonus against this stack.",
    restriction: "Does not negate the underlying melee strike or Offense.",
    rule: { type: "charge_guard" },
    implementationStatus: "implemented"
  },
  {
    id: "shooter",
    name: "Shooter",
    activation: "passive",
    summary: "Can make stationary ranged attacks.",
    exactRule: "Enables the stationary Shoot action; one ammunition per shot.",
    restriction: "Cannot shoot while adjacent to an enemy or at a target beyond its range; half damage in the far half of its range; half damage in melee unless No Melee Penalty.",
    rule: { type: "shooter" },
    implementationStatus: "implemented"
  },
  {
    id: "flight",
    name: "Flight",
    activation: "passive",
    summary: "Flies over obstacles and other stacks.",
    exactRule: "May cross blocked or occupied cells within its Speed.",
    restriction: "Requires a legal whole-footprint landing; no travel beyond Speed.",
    rule: { type: "flight" },
    implementationStatus: "implemented"
  },
  {
    id: "retaliation_2",
    name: "Double Retaliation",
    activation: "passive",
    summary: "Answers two melee attacks each round.",
    exactRule: "Two eligible retaliations each round.",
    restriction: "Reset only at round start; a destroyed stack cannot retaliate.",
    rule: { type: "retaliations", perRound: 2 },
    implementationStatus: "implemented"
  },
  {
    id: "retaliation_unlimited",
    name: "Unlimited Retaliation",
    activation: "passive",
    summary: "Answers every melee attack.",
    exactRule: "No retaliation-count limit.",
    restriction: "Dead or disabled stacks still cannot retaliate; no retaliation chains.",
    rule: { type: "retaliations", perRound: "unlimited" },
    implementationStatus: "implemented"
  },
  {
    id: "charge",
    name: "Charge",
    activation: "passive",
    summary: "Hits harder after a long approach.",
    exactRule: "+5% damage per hex traversed on the shortest legal approach, capped at +25%.",
    restriction: "Melee activation only; no charge on retaliation; detours cannot farm distance; negated by Charge Guard.",
    rule: { type: "charge", perHexPercent: 5, capPercent: 25 },
    implementationStatus: "implemented"
  },
  {
    id: "family_ward",
    name: "Ward",
    activation: "active",
    summary: "Places a protective ward on a friendly stack.",
    exactRule: "Spend the activation: a friendly stack gains +3 Defense through the current and next round.",
    restriction: "One charge shared by the whole Temple Adept family per army per battle; no hero mana.",
    rule: { type: "family_ward", defenseBonus: 3, durationRounds: 2, chargesPerBattle: 1 },
    implementationStatus: "implemented"
  },
  {
    id: "unyielding",
    name: "Unyielding",
    activation: "passive",
    summary: "Steady under pressure.",
    exactRule: "Effective morale is at least +1, before the +3 cap.",
    restriction: "Does not create an extra roll, grant immunity, or affect allies.",
    rule: { type: "unyielding", minimumMorale: 1 },
    implementationStatus: "implemented"
  },
  {
    id: "wall_breaker",
    name: "Wall Breaker",
    activation: "active",
    summary: "Can target fortifications in a siege.",
    exactRule: "Attacking a town: spend the activation and one shot to remove 1 structure HP from an intact wall, gate, tower or keep. No troop attack that activation.",
    restriction: "Besieging side only; not while engaged by an adjacent enemy; no effect in open-field battles.",
    rule: { type: "wall_breaker" },
    implementationStatus: "implemented"
  },
  // --- Shapeshift aspects (PROPOSED this build; battle statuses, not creature forms) ---
  ...[
    ["shapeshift_hare", "Hare", 0, -1, 2, "Slips into a hare\u2019s shape to outrun the line."],
    ["shapeshift_waterhorse", "Water-horse", 2, -2, 0, "Becomes the drowning horse of the loch."],
    ["shapeshift_sealskin", "Seal-skin", 0, 3, -2, "Pulls on the seal-skin and sets like a rock."],
    ["shapeshift_rut", "Rut", 3, -3, 0, "The antlers lower; the forest charges."]
  ].map(([id, aspect, attack, defense, speed, summary]) => {
    const parts = [attack && `${attack > 0 ? "+" : ""}${attack} Attack`, defense && `${defense > 0 ? "+" : ""}${defense} Defense`, speed && `${speed > 0 ? "+" : ""}${speed} Speed`].filter(Boolean).join(", ");
    return {
      id,
      name: `Shapeshift (${aspect})`,
      activation: "active",
      summary,
      exactRule: `Spend the activation to take the ${aspect} aspect (${parts}) or return to the normal aspect. With the Shapeshifting rite the change is free at the start of the activation, once per activation.`,
      restriction: "Only the stack itself; lasts until it changes back or the battle ends. Speed changes affect movement at once and turn order from the next round; never adventure travel.",
      rule: { type: "shapeshift", aspect, attack, defense, speed },
      implementationStatus: "implemented"
    };
  }),
  {
    id: "no_melee_penalty",
    name: "No Melee Penalty",
    activation: "passive",
    summary: "Fights at full strength up close.",
    exactRule: "Do not apply the shooter's 0.5 melee penalty.",
    restriction: "Ordinary ranged distance and wall limits still apply.",
    rule: { type: "no_melee_penalty" },
    implementationStatus: "implemented"
  }
];

// ../pantheon_realms/packages/content/src/common/heroesMagic.ts
var HERO_CLASSES = [
  {
    id: "champion",
    name: "Champion",
    startingAttributes: { attack: 2, defense: 2, power: 1, knowledge: 1 },
    startingSkills: [{ skillId: "offense", rank: 1 }],
    primaryGainCycle: ["attack", "defense", "attack", "knowledge"],
    startsWithSpellbook: false,
    summary: "A front-line commander who sharpens the army\u2019s strikes."
  },
  {
    id: "strategos",
    name: "Strategos",
    startingAttributes: { attack: 1, defense: 2, power: 1, knowledge: 2 },
    startingSkills: [{ skillId: "leadership", rank: 1 }],
    primaryGainCycle: ["defense", "attack", "knowledge", "power"],
    startsWithSpellbook: false,
    summary: "A disciplined general whose steadiness keeps a line together."
  },
  {
    id: "oracle",
    name: "Oracle",
    startingAttributes: { attack: 0, defense: 0, power: 3, knowledge: 3 },
    startingSkills: [{ skillId: "wisdom", rank: 1 }],
    primaryGainCycle: ["power", "knowledge", "power", "defense"],
    startsWithSpellbook: true,
    summary: "A seer-commander who leads through divine insight and spellcraft."
  }
];
var skill = (id, name, rankSummaries, rule) => ({ id, name, rankSummaries, rule, iconAssetId: `icon.skill.${id}` });
var SKILLS = [
  skill("offense", "Offense", ["+10% melee damage", "+20% melee damage", "+30% melee damage"], { type: "offense", percentByRank: [10, 20, 30] }),
  skill("archery", "Archery", ["+10% ranged damage", "+25% ranged damage", "+50% ranged damage"], { type: "archery", percentByRank: [10, 25, 50] }),
  skill("armorer", "Armorer", ["-5% physical damage taken", "-10% physical damage taken", "-15% physical damage taken"], { type: "armorer", reductionPercentByRank: [5, 10, 15] }),
  skill("logistics", "Logistics", ["+10% land movement", "+20% land movement", "+30% land movement"], { type: "logistics", percentByRank: [10, 20, 30] }),
  skill("leadership", "Leadership", ["+1 morale", "+2 morale", "+3 morale"], { type: "leadership", moraleByRank: [1, 2, 3] }),
  skill("fortune", "Fortune", ["+1 luck", "+2 luck", "+3 luck"], { type: "fortune", luckByRank: [1, 2, 3] }),
  skill("wisdom", "Wisdom", ["Learn spells through tier 3", "Learn spells through tier 4", "Learn spells through tier 5"], { type: "wisdom", maxSpellTierByRank: [3, 4, 5] }),
  skill("scouting", "Scouting", ["+1 hex adventure vision", "+2 hexes adventure vision", "+3 hexes adventure vision"], { type: "scouting", radiusByRank: [1, 2, 3] }),
  skill("tactics", "Tactics", ["Deployment zone +1 column", "Deployment zone +2 columns", "Deployment zone +3 columns"], { type: "tactics", columnsByRank: [1, 2, 3] })
];
var SPELLS = [
  {
    id: "spark",
    name: "Spark",
    tier: 1,
    manaCost: 4,
    context: "battle",
    target: "enemy_stack",
    effect: { type: "direct_damage", base: 10, perPower: 5 },
    summary: "Enemy stack takes 10 + 5 \xD7 Power direct damage.",
    access: "sanctum",
    iconAssetId: "icon.spell.spark",
    implementationStatus: "implemented"
  },
  {
    id: "blessing",
    name: "Blessing",
    tier: 1,
    manaCost: 4,
    context: "battle",
    target: "ally_stack",
    effect: { type: "max_damage_roll", durationRounds: 2 },
    summary: "Ally rolls its maximum damage through the current and next round.",
    access: "sanctum",
    iconAssetId: "icon.spell.blessing",
    implementationStatus: "implemented"
  },
  {
    id: "ward",
    name: "Ward",
    tier: 1,
    manaCost: 4,
    context: "battle",
    target: "ally_stack",
    effect: { type: "defense_bonus", amount: 3, durationRounds: 2 },
    summary: "Ally +3 Defense through the current and next round.",
    access: "god_eligibility",
    iconAssetId: "icon.spell.ward",
    implementationStatus: "implemented"
  },
  {
    id: "warcry",
    name: "War Cry",
    tier: 1,
    manaCost: 4,
    context: "battle",
    target: "ally_stack",
    effect: { type: "attack_bonus", amount: 3, durationRounds: 2 },
    summary: "Ally +3 Attack through the current and next round.",
    access: "god_eligibility",
    iconAssetId: "icon.spell.warcry",
    implementationStatus: "implemented"
  },
  {
    id: "lightning",
    name: "Lightning",
    tier: 2,
    manaCost: 6,
    context: "battle",
    target: "enemy_stack",
    effect: { type: "direct_damage", base: 25, perPower: 10 },
    summary: "Enemy stack takes 25 + 10 \xD7 Power direct damage.",
    access: "sanctum",
    iconAssetId: "icon.spell.lightning",
    implementationStatus: "implemented"
  },
  {
    id: "mend",
    name: "Mend",
    tier: 2,
    manaCost: 5,
    context: "battle",
    target: "ally_stack",
    effect: { type: "heal_front", base: 20, perPower: 5 },
    summary: "Heal up to 20 + 5 \xD7 Power of the front creature\u2019s missing HP; no resurrection.",
    access: "sanctum",
    iconAssetId: "icon.spell.mend",
    implementationStatus: "implemented"
  },
  {
    id: "veil",
    name: "Veil",
    tier: 2,
    manaCost: 6,
    context: "battle",
    target: "ally_stack",
    effect: { type: "ranged_mitigation", numerator: 3, denominator: 4, durationRounds: 2 },
    summary: "Ally takes \xD70.75 damage from ranged strikes through the current and next round.",
    access: "sanctum",
    iconAssetId: "icon.spell.veil",
    implementationStatus: "implemented"
  },
  {
    id: "divine_sight",
    name: "Divine Sight",
    tier: 3,
    manaCost: 10,
    context: "adventure",
    target: "known_tile",
    effect: { type: "reveal_radius", radius: 3 },
    summary: "Adventure only: reveal radius 3 around a known tile until next dawn.",
    access: "sanctum",
    iconAssetId: "icon.spell.divine_sight",
    implementationStatus: "implemented"
  }
];
var ARTIFACTS = [
  {
    id: "warding_token",
    name: "Warding Token",
    slot: "ring",
    effects: [{ type: "commander_attribute", attribute: "defense", amount: 1 }],
    summary: "+1 commander Defense. A token recovered from the centaur cache.",
    iconAssetId: "icon.artifact.warding_token",
    unique: true,
    provenance: { source: "v0.3-campaign" }
  },
  {
    id: "bronze_standard",
    name: "Bronze Standard",
    slot: "misc",
    effects: [{ type: "morale", amount: 1 }],
    summary: "+1 morale for the army.",
    iconAssetId: "icon.artifact.bronze_standard",
    unique: false,
    merchantPrice: { gold: 2e3 },
    provenance: { source: "v0.2-candidate-rules", note: "Merchant price proposed this build." }
  },
  {
    id: "winged_sandals",
    name: "Winged Sandals",
    slot: "feet",
    effects: [{ type: "movement_percent", percent: 10 }],
    summary: "+10% daily land movement.",
    iconAssetId: "icon.artifact.winged_sandals",
    unique: false,
    merchantPrice: { gold: 2e3 },
    provenance: { source: "v0.2-candidate-rules", note: "Merchant price proposed this build." }
  },
  // --- Artifact Merchant stock (PROPOSED this build; original candidate items, unplaytested) ---
  ...[
    ["bronze_spear", "Bronze Spear", "weapon", [{ type: "commander_attribute", attribute: "attack", amount: 1 }], "+1 commander Attack.", { gold: 1500 }],
    ["storm_iron_blade", "Storm-iron Blade", "weapon", [{ type: "commander_attribute", attribute: "attack", amount: 2 }], "+2 commander Attack.", { gold: 3500, crystal: 1 }],
    ["linen_cuirass", "Linen Cuirass", "armor", [{ type: "commander_attribute", attribute: "defense", amount: 1 }], "+1 commander Defense.", { gold: 1500 }],
    ["scale_hauberk", "Scale Hauberk", "armor", [{ type: "commander_attribute", attribute: "defense", amount: 2 }], "+2 commander Defense.", { gold: 3500, crystal: 1 }],
    ["seers_circlet", "Seer\u2019s Circlet", "head", [{ type: "commander_attribute", attribute: "power", amount: 1 }], "+1 commander Spell Power.", { gold: 1500 }],
    ["crown_of_counsel", "Crown of Counsel", "head", [{ type: "commander_attribute", attribute: "power", amount: 1 }, { type: "commander_attribute", attribute: "knowledge", amount: 1 }], "+1 commander Spell Power and +1 Knowledge.", { gold: 3e3, crystal: 1 }],
    ["knucklebone_charm", "Knucklebone Charm", "misc", [{ type: "luck", amount: 1 }], "+1 Luck for the army.", { gold: 2e3 }],
    ["band_of_insight", "Band of Insight", "ring", [{ type: "commander_attribute", attribute: "knowledge", amount: 1 }], "+1 commander Knowledge.", { gold: 1500 }],
    ["watchers_ring", "Watcher\u2019s Ring", "ring", [{ type: "vision_radius", amount: 2 }], "+2 hexes of adventure vision.", { gold: 1200 }],
    ["swift_saddle", "Swift Saddle", "mount", [{ type: "movement_percent", percent: 15 }], "+15% daily land movement.", { gold: 3e3, crystal: 1 }]
  ].map(([id, name, slot3, effects, summary, price]) => ({
    id,
    name,
    slot: slot3,
    effects,
    summary,
    iconAssetId: `icon.artifact.${id}`,
    unique: false,
    merchantPrice: price,
    provenance: { source: "proposed-this-build", note: "Artifact Merchant item (P)." }
  }))
];

// ../pantheon_realms/packages/content/src/common/specialties.ts
var c = (familyId) => ({ kind: "creature", familyId });
var s = (spellId) => ({ kind: "spell", spellId });
var r = (resource, amount) => ({ kind: "resource", resource, amount });
var HERO_SPECIALTY_SPECS = {
  // --- Greek ---
  alexios: c("hoplite"),
  melas: c("peltast"),
  scout_captain: c("griffin"),
  heracles: c("minotaur"),
  achilles: c("cavalry"),
  odysseus: r("gold", 250),
  atalanta: r("wood", 2),
  perseus: s("lightning"),
  // --- Norse ---
  norse_sigurd: c("norse_lindworm"),
  norse_brynhild: c("norse_valkyrie"),
  norse_ragnar: r("gold", 250),
  norse_lagertha: c("norse_frost_wolf"),
  norse_hervor: s("spark"),
  norse_grey_jarl: c("norse_draugr"),
  norse_ulfhild: c("norse_frost_troll"),
  norse_hrafn: c("norse_jotunn"),
  norse_bone_helm: c("norse_nidhogg_wyrm"),
  norse_barrow_captain: c("norse_draugr"),
  // --- Egyptian ---
  egyptian_imhotep: r("stone", 2),
  egyptian_hatshepsut: r("gold", 250),
  egyptian_ramses: c("egyptian_sphinx"),
  egyptian_cleopatra: r("crystal", 1),
  egyptian_nefertiti: s("ankh_of_renewal"),
  egyptian_ahmose: c("egyptian_jackal_guardian"),
  egyptian_tiye: r("wood", 2),
  egyptian_peseshet: s("mend"),
  egyptian_seshet: s("wrath_of_sekhmet"),
  egyptian_djedkhonsu: s("scarab_swarm"),
  egyptian_paser: c("egyptian_ushabti"),
  egyptian_ankhwen: c("egyptian_crocodile_beast"),
  egyptian_hekaib: c("egyptian_jackal_guardian"),
  egyptian_iti: c("egyptian_bennu"),
  // --- Japanese ---
  japanese_momotaro: c("japanese_kitsune"),
  japanese_yamato_takeru: r("gold", 250),
  japanese_tomoe_gozen: c("japanese_kirin"),
  japanese_benkei: c("japanese_oni"),
  japanese_yoshitsune: c("japanese_tengu"),
  japanese_kusunoki_masashige: r("stone", 2),
  japanese_abe_no_seimei: s("kitsune_fire"),
  japanese_hangaku_gozen: c("japanese_kappa"),
  japanese_akane: s("kitsune_fire"),
  japanese_yamikage: s("raijin_drums"),
  japanese_kurogane: c("japanese_jorogumo"),
  japanese_gonryo: c("japanese_kappa"),
  japanese_oboro: c("japanese_orochi"),
  japanese_kagero: c("japanese_tengu"),
  // --- Celtic ---
  celtic_cu_chulainn: c("celtic_cu_sith"),
  celtic_fionn_mac_cumhaill: c("celtic_horned_stag_spirit"),
  celtic_scathach: c("celtic_kelpie"),
  celtic_deirdre: s("cauldron_of_dagda"),
  celtic_boudicca: r("favor", 1),
  celtic_medb: r("gold", 250),
  celtic_amergin: s("wild_hunt"),
  celtic_fergus_mac_roich: c("celtic_banshee"),
  celtic_orla: s("wild_hunt"),
  celtic_dubhghall: c("celtic_banshee"),
  celtic_fiachra: c("celtic_fomorian_giant"),
  celtic_corc: c("celtic_selkie"),
  celtic_tadhg: c("celtic_pooka"),
  celtic_ciar: c("celtic_banshee"),
  // --- Mesoamerican ---
  mesoamerican_hunahpu: c("mesoamerican_camazotz"),
  mesoamerican_xbalanque: c("mesoamerican_jaguar_spirit"),
  mesoamerican_nezahualcoyotl: r("gold", 250),
  mesoamerican_topiltzin_quetzalcoatl: s("rain_of_tlaloc"),
  mesoamerican_eight_deer_jaguar_claw: c("mesoamerican_eagle_warrior_spirit"),
  mesoamerican_moctezuma_ilhuicamina: r("stone", 2),
  mesoamerican_lady_six_sky: c("mesoamerican_cenote_crocodile"),
  mesoamerican_chilam_balam: s("obsidian_rain"),
  mesoamerican_itzel: s("obsidian_rain"),
  mesoamerican_itztli: s("ember_burst"),
  mesoamerican_tecuani: c("mesoamerican_xiuhcoatl"),
  mesoamerican_acatl: c("mesoamerican_cenote_crocodile"),
  mesoamerican_mazatl: c("mesoamerican_stone_colossus"),
  mesoamerican_tlacatl: c("mesoamerican_feathered_serpent")
};
var CREATURE_STEP = 4;
var SPELL_STEP = 3;
var RESOURCE_LABEL = { gold: "Gold", wood: "Wood", stone: "Stone", crystal: "Crystal", favor: "Favor" };
function buildSpecialty(spec, lk) {
  switch (spec.kind) {
    case "creature": {
      const fam = lk.families[spec.familyId];
      if (!fam) throw new Error(`specialty: unknown family ${spec.familyId}`);
      const base = lk.creatures[fam.baseCreatureId];
      const up = lk.creatures[fam.upgradedCreatureId];
      const plural = base?.pluralName ?? fam.name;
      const both = up ? `${plural} and ${up.pluralName}` : plural;
      const fx = [
        { type: "creature_stat", stat: "attack", amount: 1, familyId: fam.id },
        { type: "creature_stat", stat: "defense", amount: 1, familyId: fam.id }
      ];
      return {
        kind: "creature",
        name: plural,
        summary: `${both} in this hero\u2019s army: +1 Attack and +1 Defense in battle, one more of each at hero levels ${CREATURE_STEP} and ${CREATURE_STEP * 2}.`,
        effects: fx,
        growth: { everyLevels: CREATURE_STEP, effects: fx },
        familyId: fam.id
      };
    }
    case "spell": {
      const sp = lk.spells[spec.spellId];
      if (!sp) throw new Error(`specialty: unknown spell ${spec.spellId}`);
      const fx = [{ type: "spell_power_bonus", spellId: sp.id, amount: 1 }];
      return {
        kind: "spell",
        name: sp.name,
        summary: `Knows ${sp.name} from the start and casts it with +1 Spell Power, one more at hero levels ${SPELL_STEP}, ${SPELL_STEP * 2} and ${SPELL_STEP * 3}.`,
        effects: fx,
        growth: { everyLevels: SPELL_STEP, effects: fx },
        spellId: sp.id
      };
    }
    case "resource":
      return {
        kind: "resource",
        name: RESOURCE_LABEL[spec.resource],
        summary: `+${spec.amount.toLocaleString("en-US")} ${RESOURCE_LABEL[spec.resource]} per day while this hero is in play.`,
        effects: [{ type: "daily_income", resource: spec.resource, amount: spec.amount }]
      };
  }
}
function withSpecialties(heroes, lk) {
  return heroes.map((h) => {
    const spec = HERO_SPECIALTY_SPECS[h.id];
    return spec ? { ...h, specialty: buildSpecialty(spec, lk) } : h;
  });
}

// ../pantheon_realms/packages/content/src/greek/creatures.ts
var s2 = (attack, defense, hp, dmg, speed, shots, footprint, range) => ({
  attack,
  defense,
  hp,
  damageMin: dmg[0],
  damageMax: dmg[1],
  speed,
  shots,
  footprint,
  ...range !== void 0 ? { range } : {}
});
var GREEK_FAMILY_SPECS = [
  {
    familyId: "hoplite",
    name: "Hoplites",
    pantheonId: "greek",
    tier: 1,
    growth: 14,
    role: "line_infantry",
    roleLabel: "Line infantry",
    body: "humanoid_spear",
    dwelling: "barracks",
    dwellingUp: "barracks_up",
    base: {
      id: "hoplite",
      name: "Hoplite",
      plural: "Hoplites",
      stats: s2(4, 5, 10, [1, 3], 4, 0, 1),
      cost: { gold: 60 },
      abilities: ["charge_guard"],
      summary: "Shield-forward spear infantry that holds narrow ground and blunts cavalry charges.",
      portraitAlt: "A spear-and-shield soldier in a bronze helmet and pale linen tunic."
    },
    upgraded: {
      id: "veteran_hoplite",
      name: "Veteran Hoplite",
      plural: "Veteran Hoplites",
      stats: s2(6, 5, 10, [2, 3], 5, 0, 1),
      cost: { gold: 75 },
      abilities: ["charge_guard"],
      summary: "Seasoned shield-bearers with crested helmets and practiced steadiness.",
      portraitAlt: "A crested-helmet spear soldier with reinforced shoulder armor and a command sash."
    }
  },
  {
    familyId: "peltast",
    name: "Peltasts",
    pantheonId: "greek",
    tier: 2,
    growth: 9,
    role: "skirmisher",
    roleLabel: "Javelin skirmisher",
    body: "humanoid_thrower",
    dwelling: "peltast_range",
    dwellingUp: "peltast_range_up",
    base: {
      id: "peltast",
      name: "Peltast",
      plural: "Peltasts",
      stats: s2(6, 3, 10, [2, 3], 5, 12, 1, 16),
      cost: { gold: 100 },
      abilities: ["shooter"],
      summary: "Light javelin throwers who strike from range and need protection up close.",
      portraitAlt: "A lightly armored skirmisher with a crescent shield and a bundle of javelins."
    },
    upgraded: {
      id: "veteran_peltast",
      name: "Veteran Peltast",
      plural: "Veteran Peltasts",
      stats: s2(7, 4, 12, [3, 4], 6, 16, 1, 17),
      cost: { gold: 150 },
      abilities: ["shooter"],
      summary: "Experienced skirmishers who choose their own firing ground and carry more javelins.",
      portraitAlt: "A skirmisher with a reinforced helmet, braced throwing arm and a tidy javelin harness."
    }
  },
  {
    familyId: "griffin",
    name: "Griffins",
    pantheonId: "greek",
    tier: 3,
    growth: 7,
    role: "flying_interceptor",
    roleLabel: "Flying interceptor",
    body: "griffin",
    dwelling: "griffin_aerie",
    dwellingUp: "griffin_aerie_up",
    base: {
      id: "griffin",
      name: "Griffin",
      plural: "Griffins",
      stats: s2(8, 8, 25, [3, 6], 7, 0, 2),
      cost: { gold: 240 },
      abilities: ["flight", "retaliation_2"],
      summary: "Winged guardians that bypass the front line and answer two attacks each round.",
      portraitAlt: "An eagle-headed, winged lion-bodied creature with tawny fur and pale head feathers."
    },
    upgraded: {
      id: "windcrest_griffin",
      name: "Windcrest Griffin",
      plural: "Windcrest Griffins",
      stats: s2(9, 9, 30, [3, 6], 9, 0, 2),
      cost: { gold: 300 },
      abilities: ["flight", "retaliation_unlimited"],
      summary: "Guardians of the highest nests whose retaliation has no count limit.",
      portraitAlt: "A griffin with a swept feather crest, long primary feathers and pale-blue accents."
    }
  },
  {
    familyId: "cavalry",
    name: "Cavalry",
    pantheonId: "greek",
    tier: 4,
    growth: 4,
    role: "mounted_shock",
    roleLabel: "Mounted shock troops",
    body: "rider",
    dwelling: "training_court",
    dwellingUp: "training_court_up",
    base: {
      id: "cavalry",
      name: "Cavalry",
      plural: "Cavalry",
      stats: s2(10, 10, 35, [6, 9], 7, 0, 2),
      cost: { gold: 350 },
      abilities: ["charge"],
      summary: "Lance riders whose charge grows stronger over open ground.",
      portraitAlt: "A lance-bearing rider with a shield on a compact warhorse with a saddle blanket."
    },
    upgraded: {
      id: "companion_cavalry",
      name: "Companion Cavalry",
      plural: "Companion Cavalry",
      stats: s2(12, 12, 40, [7, 10], 8, 0, 2),
      cost: { gold: 450 },
      abilities: ["charge"],
      summary: "Trusted riders in layered armor who train together until signals are almost unnecessary.",
      portraitAlt: "A crested rider on a horse with layered neck and chest protection."
    }
  },
  {
    familyId: "temple_adept",
    name: "Temple Adepts",
    pantheonId: "greek",
    tier: 5,
    growth: 3,
    role: "ranged_support",
    roleLabel: "Ranged support",
    body: "humanoid_caster",
    dwelling: "adept_house",
    dwellingUp: "adept_house_up",
    base: {
      id: "temple_adept",
      name: "Temple Adept",
      plural: "Temple Adepts",
      stats: s2(11, 7, 30, [9, 12], 5, 12, 1, 18),
      cost: { gold: 400 },
      abilities: ["shooter"],
      summary: "Ritual scholars who hurl focused energy bolts from the back line.",
      portraitAlt: "A robed scholar with a staff topped by a geometric bronze focus."
    },
    upgraded: {
      id: "temple_seer",
      name: "Temple Seer",
      plural: "Temple Seers",
      stats: s2(12, 10, 35, [10, 13], 6, 16, 1, 19),
      cost: { gold: 500 },
      abilities: ["shooter", "family_ward"],
      summary: "Seers who can place one shared protective ward per battle.",
      portraitAlt: "A robed seer with a sculpted headpiece, layered mantle and a larger staff focus."
    }
  },
  {
    familyId: "minotaur",
    name: "Minotaurs",
    pantheonId: "greek",
    tier: 6,
    growth: 2,
    role: "heavy_melee",
    roleLabel: "Heavy melee",
    body: "bull_biped",
    dwelling: "labyrinth",
    dwellingUp: "labyrinth_up",
    base: {
      id: "minotaur",
      name: "Minotaur",
      plural: "Minotaurs",
      // 2026-10-07 balance: damage 16–22 like the other tier-6 creatures (was 16–24).
      stats: s2(15, 14, 95, [16, 22], 6, 0, 2),
      cost: { gold: 1e3 },
      abilities: ["unyielding"],
      summary: "Bull-headed axe fighters with reliable morale.",
      portraitAlt: "A bull-headed biped with powerful shoulders, chest straps and a heavy axe."
    },
    upgraded: {
      id: "labyrinth_warden",
      name: "Labyrinth Warden",
      plural: "Labyrinth Wardens",
      stats: s2(17, 16, 110, [20, 25], 7, 0, 2),
      // 2026-10-07 balance: the tier-6 upgraded price of the other pantheons (was 1,200).
      cost: { gold: 1250 },
      abilities: ["unyielding"],
      summary: "Wardens entrusted with the passages others must not lose.",
      portraitAlt: "A minotaur in patterned chest armor with horn fittings and a heavier axe."
    }
  },
  {
    familyId: "cyclops",
    name: "Cyclopes",
    pantheonId: "greek",
    tier: 7,
    growth: 1,
    role: "apex_ranged",
    roleLabel: "Apex ranged giant",
    body: "giant",
    dwelling: "thunder_quarry",
    dwellingUp: "thunder_quarry_up",
    base: {
      id: "cyclops",
      name: "Cyclops",
      plural: "Cyclopes",
      stats: s2(22, 22, 200, [40, 50], 7, 8, 2, 18),
      cost: { gold: 3e3, crystal: 1 },
      abilities: ["shooter", "wall_breaker", "no_melee_penalty"],
      summary: "One-eyed giants who hurl shaped boulders and strike hard up close.",
      portraitAlt: "A one-eyed giant with a stone satchel and simple bracers."
    },
    upgraded: {
      id: "stormforged_cyclops",
      name: "Stormforged Cyclops",
      plural: "Stormforged Cyclopes",
      stats: s2(25, 25, 250, [45, 55], 8, 12, 2, 19),
      cost: { gold: 4500, crystal: 2 },
      abilities: ["shooter", "wall_breaker", "no_melee_penalty"],
      summary: "Cyclopes bearing forge-marked stones; the name adds no lightning damage.",
      portraitAlt: "A cyclops with forged bronze bracers, engraved seams and a faintly luminous boulder."
    }
  },
  // Neutral paired family (not part of any pantheon roster).
  {
    familyId: "centaur",
    name: "Centaurs",
    pantheonId: null,
    tier: 3,
    growth: 7,
    role: "fast_melee",
    roleLabel: "Fast ground melee (neutral)",
    body: "centaur",
    base: {
      id: "centaur",
      name: "Centaur",
      plural: "Centaurs",
      stats: s2(8, 6, 22, [4, 6], 7, 0, 2),
      cost: { gold: 200 },
      abilities: [],
      summary: "Grove-dwelling spear fighters bound by old boundary agreements. Not archers.",
      portraitAlt: "A centaur with a chestnut coat, simple chest protection and a melee spear."
    },
    upgraded: {
      id: "centaur_sentinel",
      name: "Centaur Sentinel",
      plural: "Centaur Sentinels",
      stats: s2(9, 7, 25, [4, 7], 8, 0, 2),
      cost: { gold: 250 },
      abilities: [],
      summary: "Seasoned grove guardians who lead the first response on old boundary routes.",
      portraitAlt: "A centaur with foreleg protection, a tied crest and a reinforced spearhead."
    }
  }
];
function assetBase(spec, form) {
  return spec.pantheonId ? `creature.${spec.pantheonId}.tier${spec.tier}.${form}` : `creature.neutral.${spec.familyId}.${form}`;
}
var GREEK_PROVENANCE = { source: "v0.3-catalog", note: "design/06 candidate values; production/03 \xA710 ability mapping (P)" };
function buildFamilies(specs, provenance = GREEK_PROVENANCE) {
  const families = [];
  const creatures = [];
  for (const f of specs) {
    const fam = {
      id: f.familyId,
      name: f.name,
      pantheonId: f.pantheonId,
      classification: f.pantheonId ? "pantheon_roster" : "neutral",
      tier: f.tier,
      baseCreatureId: f.base.id,
      upgradedCreatureId: f.upgraded.id,
      baseGrowth: f.growth,
      ...f.dwelling ? { dwellingBuildingId: f.dwelling } : {},
      ...f.dwellingUp ? { upgradedDwellingBuildingId: f.dwellingUp } : {},
      implementationStatus: "implemented"
    };
    families.push(fam);
    for (const form of ["base", "upgraded"]) {
      const spec = form === "base" ? f.base : f.upgraded;
      const asset = assetBase(f, form);
      creatures.push({
        id: spec.id,
        familyId: f.familyId,
        pantheonId: f.pantheonId,
        tier: f.tier,
        form,
        ...form === "base" ? { upgradeId: f.upgraded.id } : { baseId: f.base.id },
        name: spec.name,
        pluralName: spec.plural,
        role: f.role,
        roleLabel: f.roleLabel,
        stats: spec.stats,
        cost: spec.cost,
        abilityIds: spec.abilities,
        summary: spec.summary,
        loreId: `lore.${f.familyId}`,
        presentation: {
          bodyProfile: f.body,
          portraitAssetId: `${asset}.portrait`,
          spriteAssetId: `${asset}.sprites`,
          animationProfileId: `anim.${f.body}`,
          portraitAlt: spec.portraitAlt
        },
        implementationStatus: "implemented",
        balanceStatus: "proposed_unplaytested",
        provenance
      });
    }
  }
  return { families, creatures };
}

// ../pantheon_realms/packages/content/src/greek/lore.ts
var GREEK_LORE = [
  {
    id: "lore.hoplite",
    sourceNote: "Greek hoplites are associated with armored infantry, a spear and shield, and fighting in close formation. Equipment and practice varied by place and period. This note does not establish troop price, formation bonus or recruitment speed.",
    sourceRefs: ["L01 \u2014 museum scholarship on Greek hoplite equipment"],
    sourceStatus: "draft_requires_review",
    gameLore: "The road to Asterion is lined with shields bearing names rather than royal crests. Each belongs to a household that promised someone would stand when the warning bells rang. Hoplites learn to hold a narrow path together, trusting the shield beside them as much as their own spear.",
    upgradeLore: "Veteran Hoplites teach the pause before a charge reaches the line. Their distinction is practiced steadiness, not a divine transformation."
  },
  {
    id: "lore.peltast",
    sourceNote: "Xenophon's Hellenica discusses Iphicrates and his peltasts in the Lechaeum campaign context. This supports an ancient light-troop tradition as inspiration; not every peltast fought identically or wore one uniform.",
    sourceRefs: ["L06 \u2014 Xenophon, Hellenica"],
    sourceStatus: "draft_requires_review",
    gameLore: "Peltasts learn the hills before they learn the parade ground. They carry only what lets them cross a dry riverbed, find a gap between shields, and return before a heavier enemy can close. The best return with useful news and an unused last weapon.",
    upgradeLore: "Veteran Peltasts choose their own firing ground and carry additional ammunition \u2014 represented by the upgrade statistics, not an extra action."
  },
  {
    id: "lore.centaur",
    sourceNote: "Ancient accounts include named centaurs such as Pholus and Chiron as well as hostile centaur encounters (Apollodorus, Library 2.5.4). Our grove-dwelling family is a fictional adaptation.",
    sourceRefs: ["L03 \u2014 Apollodorus, Library 2.5.4"],
    sourceStatus: "draft_requires_review",
    gameLore: "The grove's covenant is written on neither parchment nor stone. Its terms are paths left open, springs left clean, and warnings answered before smoke reaches the canopy. Centaurs who ride with the polis follow an agreement between neighbors.",
    upgradeLore: "Sentinels know the old boundary routes and lead the first response when a covenant\u2019s roads are threatened."
  },
  {
    id: "lore.griffin",
    sourceNote: "Greek literary sources, including passages of Herodotus, tell of griffins associated with guarded gold. Griffin imagery is not exclusively Greek. The winged battlefield ally is a game interpretation.",
    sourceRefs: ["L05 \u2014 Herodotus"],
    sourceStatus: "draft_requires_review",
    gameLore: "Above Griffin Pass, the nests face the first light. The first envoys brought gold and were driven from the cliffs; the next brought food and waited. The covenant began when a wounded fledgling was returned without chains.",
    upgradeLore: "Windcrest Griffins are experienced guardians of the highest nests. Their persistence is expressed by the retaliation rule, not invulnerability."
  },
  {
    id: "lore.cavalry",
    sourceNote: "Xenophon's Cavalry Commander discusses horsemanship, terrain practice, supplies and command. It inspires trained mounted troops, not our exact charge modifier. 'Companion Cavalry' is a fictional upgrade name here.",
    sourceRefs: ["L07 \u2014 Xenophon, Cavalry Commander"],
    sourceStatus: "draft_requires_review",
    gameLore: "The court measures a rider by the condition of the horse at the journey\u2019s end. Young cavalry learn patience before speed: which track will hold after rain, where a line can be approached, and when a charge would spend lives for nothing.",
    upgradeLore: "Companion riders train together until the commander\u2019s signal is almost unnecessary."
  },
  {
    id: "lore.temple_adept",
    sourceNote: "This magical combat profession and its institution are original Pantheon Realms fiction. It is not a historical Greek military class, and no ancient source is claimed.",
    sourceRefs: [],
    sourceStatus: "original_invention",
    gameLore: "Temple Adepts keep the records that armies would rather forget: every promise made before a march and every name missing afterward. The light they carry into battle belongs to this world\u2019s living gods.",
    upgradeLore: "Seers learn to place a brief ward over their companions. The rite is shared by the whole company \u2014 one family-wide charge."
  },
  {
    id: "lore.minotaur",
    sourceNote: "Apollodorus describes the Minotaur in the story of Pasiphae and the Labyrinth. That named being is not a historical account of a recruitable species; our Minotaur people are a deliberate fantasy expansion.",
    sourceRefs: ["L02 \u2014 Apollodorus"],
    sourceStatus: "draft_requires_review",
    gameLore: "The wardens of the lower labyrinth remember a time when every corridor ended in a locked gate. They now carve their own signs into the stone, choosing who may enter and what may leave. Their loyalty is an agreement, not a property of their horns.",
    upgradeLore: "A Labyrinth Warden is entrusted with the passages others must not lose. Its steadiness is the minimum-morale rule; it does not make the whole army fearless."
  },
  {
    id: "lore.cyclops",
    sourceNote: "Hesiod's Theogony associates named Cyclopes with Zeus' thunder weapon, while Odyssey 9 presents Polyphemus in a different setting. Our siege specialist combines selected motifs as original fiction.",
    sourceRefs: ["L04 \u2014 Hesiod, Theogony; Homer, Odyssey 9"],
    sourceStatus: "draft_requires_review",
    gameLore: "Thunder Quarry is less a mine than a negotiation with the mountain. A Cyclops may spend a day shaping a single stone until it sits correctly in one vast hand. In battle, the same patience becomes a frightening economy of movement.",
    upgradeLore: "Stormforged Cyclopes carry stones marked by the forge\u2019s rites. The name adds no lightning damage."
  }
];

// ../pantheon_realms/packages/content/src/common/neutrals.ts
var NEUTRAL_FAMILY_SPECS = [
  {
    familyId: "brigand",
    name: "Brigands",
    pantheonId: null,
    tier: 1,
    growth: 14,
    role: "line_infantry",
    roleLabel: "Line infantry (neutral)",
    body: "humanoid_spear",
    base: {
      id: "brigand",
      name: "Brigand",
      plural: "Brigands",
      stats: s2(4, 3, 10, [1, 3], 5, 0, 1),
      cost: { gold: 55 },
      abilities: [],
      summary: "Road robbers with boar-spears and stolen shields. Quick to hire, quick to run.",
      portraitAlt: "A ragged fighter with a hooded cloak, a short spear and a mismatched shield."
    },
    upgraded: {
      id: "brigand_cutthroat",
      name: "Brigand Cutthroat",
      plural: "Brigand Cutthroats",
      stats: s2(6, 4, 11, [2, 3], 6, 0, 1),
      cost: { gold: 70 },
      abilities: [],
      summary: "Seasoned outlaws who have learned which caravans fight back.",
      portraitAlt: "A lean outlaw in a dark scarf with a notched spear and a dented round shield."
    }
  },
  {
    familyId: "hill_slinger",
    name: "Hill Slingers",
    pantheonId: null,
    tier: 2,
    growth: 9,
    role: "ranged_support",
    roleLabel: "Short-range shooters (neutral)",
    body: "humanoid_thrower",
    base: {
      id: "hill_slinger",
      name: "Hill Slinger",
      plural: "Hill Slingers",
      stats: s2(5, 3, 9, [2, 3], 5, 10, 1, 9),
      cost: { gold: 90 },
      abilities: ["shooter"],
      summary: "Shepherds who drive off wolves with a sling. Short range, steady aim.",
      portraitAlt: "A shepherd in a wool cloak whirling a leather sling, a pouch of stones at the belt."
    },
    upgraded: {
      id: "sling_master",
      name: "Sling Master",
      plural: "Sling Masters",
      stats: s2(6, 4, 10, [2, 4], 6, 14, 1, 10),
      cost: { gold: 130 },
      abilities: ["shooter"],
      summary: "Hill folk who cast shaped lead bullets farther and harder than any stone.",
      portraitAlt: "A slinger with a braided double sling and a bag of lead shot."
    }
  },
  {
    familyId: "wild_boar",
    name: "Wild Boars",
    pantheonId: null,
    tier: 2,
    growth: 9,
    role: "fast_melee",
    roleLabel: "Charging beasts (neutral)",
    body: "beast",
    base: {
      id: "wild_boar",
      name: "Wild Boar",
      plural: "Wild Boars",
      stats: s2(6, 4, 12, [2, 4], 6, 0, 1),
      cost: { gold: 100 },
      abilities: ["charge"],
      summary: "Forest boars that answer any intruder with a running charge.",
      portraitAlt: "A bristling dark boar with curved tusks, head lowered to charge."
    },
    upgraded: {
      id: "tusked_boar",
      name: "Great Tusked Boar",
      plural: "Great Tusked Boars",
      stats: s2(7, 5, 14, [3, 4], 7, 0, 1),
      cost: { gold: 140 },
      abilities: ["charge"],
      summary: "Old boars as heavy as a pony, scarred by every hunt that failed.",
      portraitAlt: "A huge scarred boar with long ivory tusks and a ridge of grey bristles."
    }
  },
  {
    familyId: "clay_golem",
    name: "Clay Golems",
    pantheonId: null,
    tier: 3,
    growth: 6,
    role: "heavy_melee",
    roleLabel: "Slow guardians (neutral)",
    body: "construct",
    base: {
      id: "clay_golem",
      name: "Clay Golem",
      plural: "Clay Golems",
      stats: s2(7, 10, 30, [3, 5], 4, 0, 1),
      cost: { gold: 230 },
      abilities: ["unyielding"],
      summary: "Fired-clay guardians that keep the last order they were given. Slow, tireless, fearless.",
      portraitAlt: "A heavy figure of red fired clay with a blank face and a sigil pressed into its chest."
    },
    upgraded: {
      id: "bronze_golem",
      name: "Bronze Golem",
      plural: "Bronze Golems",
      stats: s2(8, 12, 35, [4, 6], 5, 0, 1),
      cost: { gold: 290 },
      abilities: ["unyielding", "charge_guard"],
      summary: "Golems sheathed in bronze plates; a charge breaks against them.",
      portraitAlt: "A clay golem plated in green-patinated bronze, with riveted shoulders."
    }
  },
  {
    familyId: "wyvern",
    name: "Wyverns",
    pantheonId: null,
    tier: 4,
    growth: 4,
    role: "flying_interceptor",
    roleLabel: "Flying hunters (neutral)",
    body: "griffin",
    base: {
      id: "wyvern",
      name: "Wyvern",
      plural: "Wyverns",
      stats: s2(11, 9, 36, [6, 9], 8, 0, 2),
      cost: { gold: 360 },
      abilities: ["flight"],
      summary: "Two-legged winged drakes of the cliffs; they drop on prey from above.",
      portraitAlt: "A lean two-legged winged dragon with leathery wings and a barbed tail."
    },
    upgraded: {
      id: "wyvern_matriarch",
      name: "Wyvern Matriarch",
      plural: "Wyvern Matriarchs",
      stats: s2(12, 11, 42, [7, 10], 9, 0, 2),
      cost: { gold: 460 },
      abilities: ["flight", "retaliation_2"],
      summary: "Nest-mothers that turn on every attacker, twice if they must.",
      portraitAlt: "A larger wyvern with a frilled crest and torn, battle-scarred wings."
    }
  },
  {
    familyId: "ogre",
    name: "Ogres",
    pantheonId: null,
    tier: 5,
    growth: 3,
    role: "heavy_melee",
    roleLabel: "Brutes (neutral)",
    body: "giant",
    base: {
      id: "ogre",
      name: "Ogre",
      plural: "Ogres",
      stats: s2(12, 9, 42, [8, 12], 5, 0, 2),
      cost: { gold: 400 },
      abilities: [],
      summary: "Hulking hill brutes with tree-trunk clubs. They fight for food and for gold.",
      portraitAlt: "A towering brute in hides with a knotted club over one shoulder."
    },
    upgraded: {
      id: "ogre_chieftain",
      name: "Ogre Chieftain",
      plural: "Ogre Chieftains",
      stats: s2(14, 10, 48, [9, 13], 6, 0, 2),
      cost: { gold: 500 },
      abilities: ["retaliation_2"],
      summary: "Ogres who rule a valley by beating every challenger; they hit back twice.",
      portraitAlt: "A scarred ogre wearing a crown of bent iron and a cloak of bear fur."
    }
  },
  {
    familyId: "basilisk",
    name: "Basilisks",
    pantheonId: null,
    tier: 6,
    growth: 2,
    role: "apex_melee",
    roleLabel: "Armoured serpents (neutral)",
    body: "serpent",
    base: {
      id: "basilisk",
      name: "Basilisk",
      plural: "Basilisks",
      stats: s2(15, 15, 95, [15, 21], 6, 0, 2),
      cost: { gold: 1e3 },
      abilities: ["retaliation_2"],
      summary: "Crowned desert serpents with plated hides. Their stare is legend; their bite is real.",
      portraitAlt: "A great scaled serpent with a crest like a crown and pale, staring eyes."
    },
    upgraded: {
      id: "greater_basilisk",
      name: "Greater Basilisk",
      plural: "Greater Basilisks",
      stats: s2(17, 17, 110, [17, 24], 7, 0, 2),
      cost: { gold: 1250 },
      abilities: ["retaliation_2", "charge_guard"],
      summary: "Ancient basilisks whose hides turn spears; charges stall in front of them.",
      portraitAlt: "A larger basilisk with stone-grey scales and a ring of horns around its crown."
    }
  },
  {
    familyId: "elder_drake",
    name: "Elder Drakes",
    pantheonId: null,
    tier: 7,
    growth: 1,
    role: "apex_melee",
    roleLabel: "Ancient dragons (neutral)",
    body: "griffin",
    base: {
      id: "elder_drake",
      name: "Elder Drake",
      plural: "Elder Drakes",
      stats: s2(24, 22, 240, [40, 50], 8, 0, 2),
      cost: { gold: 3e3, crystal: 1 },
      abilities: ["flight", "retaliation_2"],
      summary: "Old dragons that sleep on hoards older than any kingdom. Few heroes wake one twice.",
      portraitAlt: "A massive four-legged dragon with bronze scales and folded wings over a heap of coins."
    },
    upgraded: {
      id: "ancient_drake",
      name: "Ancient Drake",
      plural: "Ancient Drakes",
      stats: s2(27, 25, 280, [45, 55], 9, 0, 2),
      cost: { gold: 4500, crystal: 2 },
      abilities: ["flight", "retaliation_unlimited"],
      summary: "The oldest drakes; every blow against them is answered.",
      portraitAlt: "An immense dragon with horn-crowned head and scales dulled to dark gold by age."
    }
  }
];
var FOLK = "Folklore inspiration only; the game creature, its numbers and its story are an original adaptation.";
var NEUTRAL_LORE = [
  {
    id: "lore.brigand",
    sourceNote: "Bandits on trade roads are a common figure in many cultures; no single tradition is adapted.",
    sourceRefs: [],
    sourceStatus: "original_invention",
    gameLore: "Where kingdoms quarrel, roads go unwatched. Brigands are deserters, debtors and the hungry, holding a ford or a pass until someone pays. They answer to whoever paid last.",
    upgradeLore: "Cutthroats are the brigands who lived long enough to choose their ambushes."
  },
  {
    id: "lore.hill_slinger",
    sourceNote: `Ancient writers describe slingers from the Balearic Islands and other hill peoples serving as hired troops. ${FOLK}`,
    sourceRefs: ["Diodorus Siculus, Library of History, book 5 (the Balearic slingers)"],
    sourceStatus: "draft_requires_review",
    gameLore: "In the hill country every child learns the sling before the plough: wolves do not wait for a soldier. The flocks are thin in winter, and a war band pays in silver.",
    upgradeLore: "Sling Masters cast shaped lead bullets that fly farther than stones and land harder."
  },
  {
    id: "lore.wild_boar",
    sourceNote: `Wild boars are dangerous game in many hunting traditions. ${FOLK}`,
    sourceRefs: [],
    sourceStatus: "original_invention",
    gameLore: "The oak woods belong to the boars. A herd defends its ground with a running charge, and a sounder can scatter a column of spearmen.",
    upgradeLore: "The great tuskers are old boars that have outlived every hunt sent for them."
  },
  {
    id: "lore.clay_golem",
    sourceNote: `Jewish folklore tells of the golem, a figure of clay brought to life to serve and protect, best known from later legends set in Prague. ${FOLK}`,
    sourceRefs: ["General folklore reference \u2014 golem legends"],
    sourceStatus: "draft_requires_review",
    gameLore: "Some forgotten workshop pressed a sigil into wet clay and fired it in a kiln. The figures still keep the last order they were given \u2014 guard the door \u2014 long after the door has fallen.",
    upgradeLore: "Bronze Golems were sheathed by a later smith who wanted his treasury safe from charges."
  },
  {
    id: "lore.wyvern",
    sourceNote: `The wyvern \u2014 a two-legged winged dragon \u2014 is a figure of European heraldry. ${FOLK}`,
    sourceRefs: ["General reference \u2014 the wyvern in European heraldry"],
    sourceStatus: "draft_requires_review",
    gameLore: "Wyverns nest on sea cliffs and quarry walls. They hunt goats, sheep and the occasional shepherd, and they do not share a sky with griffins.",
    upgradeLore: "Matriarchs guard the egg ledges and answer every attack on the nest."
  },
  {
    id: "lore.ogre",
    sourceNote: `Ogres are man-eating giants of European fairy tales. ${FOLK}`,
    sourceRefs: ["General reference \u2014 the ogre in European fairy tales"],
    sourceStatus: "draft_requires_review",
    gameLore: "Ogres keep to the high valleys and come down when the herds fail. They fight for whoever feeds them and walk away when the meat runs out.",
    upgradeLore: "A chieftain rules by beating every challenger; it has learned to hit back before the second blow lands."
  },
  {
    id: "lore.basilisk",
    sourceNote: `Pliny the Elder describes the basilisk as a small, deadly crowned serpent; medieval bestiaries made it a king of serpents. ${FOLK}`,
    sourceRefs: ["Pliny the Elder, Natural History, book 8 (the basilisk)"],
    sourceStatus: "draft_requires_review",
    gameLore: "The stories say a basilisk kills with a look. The truth is plainer: its hide turns blades and its bite is enough. Desert caravans pay guides to steer wide of their dens.",
    upgradeLore: "The greater basilisks are old enough that spears break on them and charges stall."
  },
  {
    id: "lore.elder_drake",
    sourceNote: `The hoard-guarding dragon is old in northern European poetry (the dragon of Beowulf). ${FOLK}`,
    sourceRefs: ["Beowulf (the dragon episode)"],
    sourceStatus: "draft_requires_review",
    gameLore: "Elder Drakes sleep on gold that was minted by kingdoms nobody remembers. A drake that wakes takes a season to sleep again, and the country around it burns in the meantime.",
    upgradeLore: "The ancient ones answer every blow; no hero has struck one twice unanswered."
  }
];

// ../pantheon_realms/packages/content/src/greek/town.ts
var has = (buildingId) => ({ type: "has_building", buildingId });
var covenant = (familyId) => ({ type: "town_has_covenant", familyId });
var G = "greek";
var SUPPORT = [
  { id: "village_hall", name: "Village Hall", slot: "civic_hall", level: 1, cost: {}, fx: [{ type: "daily_income", resource: "gold", amount: 500 }], summary: "Starting civic building. 500 Gold per day.", art: "town.greek.support.civic_hall.l1" },
  { id: "town_hall", name: "Town Hall", slot: "civic_hall", level: 2, cost: { gold: 2500 }, req: [has("tavern")], fx: [{ type: "daily_income", resource: "gold", amount: 1e3 }], summary: "1,000 Gold per day in total (replaces Village Hall income).", art: "town.greek.support.civic_hall.l2" },
  { id: "city_hall", name: "City Hall", slot: "civic_hall", level: 3, cost: { gold: 5e3 }, req: [has("workshop"), has("market"), has("sanctum_1")], fx: [{ type: "daily_income", resource: "gold", amount: 2e3 }], summary: "2,000 Gold per day in total.", art: "town.greek.support.civic_hall.l3" },
  { id: "capitol", name: "Capitol", slot: "civic_hall", level: 4, cost: { gold: 1e4 }, req: [has("castle"), { type: "unique_per_player", buildingId: "capitol" }], fx: [{ type: "daily_income", resource: "gold", amount: 4e3 }], summary: "4,000 Gold per day in total. One Capitol per player.", art: "town.greek.support.civic_hall.l4" },
  { id: "tavern", name: "Tavern", slot: "tavern", level: 1, cost: { gold: 500, wood: 5 }, req: [has("village_hall")], fx: [{ type: "enables_hero_hiring" }], summary: "Hire eligible heroes. Prerequisite for the Town Hall.", art: "town.greek.support.tavern.l1" },
  { id: "market", name: "Marketplace", slot: "marketplace", level: 1, cost: { gold: 500, wood: 5 }, req: [has("village_hall")], fx: [{ type: "enables_market" }], summary: "Sell resources for Gold or buy them with Gold.", art: "town.greek.support.marketplace.l1" },
  { id: "supply_depot", name: "Resource Depot", slot: "resource_depot", level: 1, cost: { gold: 5e3, stone: 5 }, req: [has("market")], fx: [{ type: "daily_income", resource: "wood", amount: 1 }, { type: "daily_income", resource: "stone", amount: 1 }], summary: "+1 Wood and +1 Stone per day.", art: "town.greek.support.resource_depot.l1" },
  { id: "workshop", name: "Workshop", slot: "workshop", level: 1, cost: { gold: 1e3, wood: 5 }, req: [has("village_hall")], fx: [{ type: "enables_workshop", stockSize: 4, rarities: ["treasure"] }], summary: "Military prerequisite (Training Court, City Hall). Sells four tier-1 items each week where the scenario has them; each one once a week.", art: "town.greek.support.workshop.l1" },
  { id: "sanctum_1", name: "Sanctum I", slot: "mage_guild", level: 1, cost: { gold: 2e3, wood: 5, stone: 5 }, req: [has("village_hall")], fx: [{ type: "spell_library", maxTier: 1 }, { type: "enables_spellbook_purchase" }], summary: "Tier-1 spells; sells spellbooks (500 Gold).", art: "town.greek.support.mage_guild.l1" },
  { id: "sanctum_2", name: "Sanctum II", slot: "mage_guild", level: 2, cost: { gold: 1e3, wood: 5, stone: 5, crystal: 4 }, fx: [{ type: "spell_library", maxTier: 2 }, { type: "enables_spellbook_purchase" }], summary: "Tier-2 spells.", art: "town.greek.support.mage_guild.l2" },
  { id: "sanctum_3", name: "Sanctum III", slot: "mage_guild", level: 3, cost: { gold: 1e3, wood: 5, stone: 5, crystal: 6 }, fx: [{ type: "spell_library", maxTier: 3 }, { type: "enables_spellbook_purchase" }], summary: "Tier-3 spells (Wisdom required to learn).", art: "town.greek.support.mage_guild.l3" },
  { id: "temple_1", name: "Temple I", slot: "pantheon_temple", level: 1, cost: { gold: 1e3, stone: 5 }, req: [has("village_hall")], fx: [{ type: "daily_income", resource: "favor", amount: 1 }], summary: "1 Favor per day.", art: "town.greek.support.pantheon_temple.l1" },
  { id: "temple_2", name: "Temple II", slot: "pantheon_temple", level: 2, cost: { gold: 2e3, wood: 5, stone: 10, crystal: 3 }, req: [has("town_hall")], fx: [{ type: "daily_income", resource: "favor", amount: 2 }], summary: "2 Favor per day in total; enables a minor-god commitment.", art: "town.greek.support.pantheon_temple.l2" },
  { id: "fort", name: "Fort", slot: "fortifications", level: 1, cost: { gold: 5e3, wood: 20, stone: 20 }, req: [has("village_hall")], fx: [{ type: "siege_fortification", level: 1 }], summary: "Perimeter walls and gate; military prerequisite.", art: "town.greek.support.fortifications.l1" },
  { id: "citadel", name: "Citadel", slot: "fortifications", level: 2, cost: { gold: 2500, stone: 5 }, fx: [{ type: "growth_multiplier", numerator: 3, denominator: 2 }, { type: "siege_fortification", level: 2 }], summary: "1.5\xD7 base weekly growth; keep and moat.", art: "town.greek.support.fortifications.l2" },
  { id: "castle", name: "Castle", slot: "fortifications", level: 3, cost: { gold: 5e3, wood: 10, stone: 10 }, fx: [{ type: "growth_multiplier", numerator: 2, denominator: 1 }, { type: "siege_fortification", level: 3 }], summary: "2\xD7 base weekly growth; stronger walls and towers.", art: "town.greek.support.fortifications.l3" },
  { id: "training_academy", name: "Training Academy", slot: "training_academy", level: 1, cost: { gold: 2e3, wood: 5, stone: 5 }, req: [has("tavern"), has("barracks")], fx: [{ type: "enables_hero_training", xp: 500, gold: 1e3 }], summary: "Once per week, each visiting hero may train: 1,000 Gold for 500 experience.", proposed: true, art: "town.greek.support.training_academy.l1" },
  { id: "watchtower", name: "Watchtower", slot: "watchtower", level: 1, cost: { gold: 1500, wood: 5, stone: 5 }, req: [has("fort")], fx: [{ type: "town_vision_radius", radius: 8 }], summary: "The town sees 8 hexes around it (3 without a Watchtower).", proposed: true, art: "town.greek.support.watchtower.l1" },
  { id: "artifact_merchant", name: "Artifact Merchant", slot: "artifact_merchant", level: 1, cost: { gold: 3e3, wood: 5, stone: 5, crystal: 2 }, req: [has("market"), has("town_hall")], fx: [{ type: "enables_artifact_merchant", stockSize: 4 }], summary: "Sells four artifacts to visiting heroes; the stock changes every week.", proposed: true, art: "town.greek.support.artifact_merchant.l1" }
];
var dwell = (tier, familyId, base, up) => [base, up].map((b, i) => ({
  ...b,
  slot: `dwelling_t${tier}`,
  level: i + 1,
  dwelling: { familyId, form: i === 0 ? "base" : "upgraded" },
  art: `town.greek.dwelling.tier${tier}.${i === 0 ? "base" : "upgraded"}`
}));
var DWELLINGS = [
  ...dwell(
    1,
    "hoplite",
    { id: "barracks", name: "Barracks", slot: "", level: 1, cost: { gold: 500, stone: 10 }, req: [has("fort")], fx: [{ type: "recruit_access", creatureId: "hoplite" }], summary: "Recruit Hoplites. 14 per week.", art: "" },
    { id: "barracks_up", name: "Veteran Barracks", slot: "", level: 2, cost: { gold: 1e3, stone: 5 }, fx: [{ type: "recruit_access", creatureId: "hoplite" }, { type: "recruit_access", creatureId: "veteran_hoplite" }], summary: "Also recruit and train Veteran Hoplites. Shares the Hoplite pool.", art: "" }
  ),
  ...dwell(
    2,
    "peltast",
    { id: "peltast_range", name: "Peltast Range", slot: "", level: 1, cost: { gold: 1e3, wood: 5, stone: 5 }, req: [has("barracks")], fx: [{ type: "recruit_access", creatureId: "peltast" }], summary: "Recruit Peltasts. 9 per week.", art: "" },
    { id: "peltast_range_up", name: "Veteran Range", slot: "", level: 2, cost: { gold: 1e3, wood: 5, stone: 5 }, fx: [{ type: "recruit_access", creatureId: "peltast" }, { type: "recruit_access", creatureId: "veteran_peltast" }], summary: "Also recruit and train Veteran Peltasts.", art: "" }
  ),
  ...dwell(
    3,
    "griffin",
    { id: "griffin_aerie", name: "Griffin Aerie", slot: "", level: 1, cost: { gold: 2e3, wood: 5, stone: 5 }, req: [has("peltast_range"), has("temple_1"), covenant("griffin")], fx: [{ type: "recruit_access", creatureId: "griffin" }], summary: "Recruit Griffins. 7 per week. Requires an assigned Griffin covenant.", art: "" },
    { id: "griffin_aerie_up", name: "Windcrest Aerie", slot: "", level: 2, cost: { gold: 1500, stone: 5, crystal: 1 }, fx: [{ type: "recruit_access", creatureId: "griffin" }, { type: "recruit_access", creatureId: "windcrest_griffin" }], summary: "Also recruit and train Windcrest Griffins.", art: "" }
  ),
  ...dwell(
    4,
    "cavalry",
    { id: "training_court", name: "Training Court", slot: "", level: 1, cost: { gold: 2e3, wood: 5, stone: 5 }, req: [has("barracks"), has("workshop")], fx: [{ type: "recruit_access", creatureId: "cavalry" }], summary: "Recruit Cavalry. 4 per week.", art: "" },
    { id: "training_court_up", name: "Companion Court", slot: "", level: 2, cost: { gold: 2e3, stone: 5, crystal: 2 }, fx: [{ type: "recruit_access", creatureId: "cavalry" }, { type: "recruit_access", creatureId: "companion_cavalry" }], summary: "Also recruit and train Companion Cavalry.", art: "" }
  ),
  ...dwell(
    5,
    "temple_adept",
    { id: "adept_house", name: "House of Adepts", slot: "", level: 1, cost: { gold: 3e3, wood: 5, stone: 5, crystal: 4 }, req: [has("training_court"), has("sanctum_1")], fx: [{ type: "recruit_access", creatureId: "temple_adept" }], summary: "Recruit Temple Adepts. 3 per week.", art: "" },
    { id: "adept_house_up", name: "House of Seers", slot: "", level: 2, cost: { gold: 1500, wood: 2, stone: 2, crystal: 2 }, fx: [{ type: "recruit_access", creatureId: "temple_adept" }, { type: "recruit_access", creatureId: "temple_seer" }], summary: "Also recruit and train Temple Seers.", art: "" }
  ),
  ...dwell(
    6,
    "minotaur",
    { id: "labyrinth", name: "Labyrinth", slot: "", level: 1, cost: { gold: 5e3, wood: 10, stone: 10, crystal: 5 }, req: [has("temple_2"), has("training_court"), covenant("minotaur")], fx: [{ type: "recruit_access", creatureId: "minotaur" }], summary: "Recruit Minotaurs. 2 per week. Requires an assigned Minotaur covenant.", art: "" },
    { id: "labyrinth_up", name: "Warden Labyrinth", slot: "", level: 2, cost: { gold: 3e3, stone: 5, crystal: 3 }, fx: [{ type: "recruit_access", creatureId: "minotaur" }, { type: "recruit_access", creatureId: "labyrinth_warden" }], summary: "Also recruit and train Labyrinth Wardens.", art: "" }
  ),
  ...dwell(
    7,
    "cyclops",
    { id: "thunder_quarry", name: "Thunder Quarry", slot: "", level: 1, cost: { gold: 15e3, wood: 10, stone: 15, crystal: 12 }, req: [has("temple_2"), has("adept_house"), has("citadel"), covenant("cyclops")], fx: [{ type: "recruit_access", creatureId: "cyclops" }], summary: "Recruit Cyclopes. 1 per week. Requires an assigned Cyclops covenant.", art: "" },
    { id: "thunder_quarry_up", name: "Storm Forge", slot: "", level: 2, cost: { gold: 15e3, stone: 10, crystal: 12 }, fx: [{ type: "recruit_access", creatureId: "cyclops" }, { type: "recruit_access", creatureId: "stormforged_cyclops" }], summary: "Also recruit and train Stormforged Cyclopes.", art: "" }
  )
];
var GREEK_BUILDINGS = [...SUPPORT, ...DWELLINGS].map((b) => ({
  id: b.id,
  pantheonId: G,
  name: b.name,
  slotId: b.slot,
  level: b.level,
  cost: b.cost,
  requirements: b.req ?? [],
  effects: b.fx ?? [],
  ...b.dwelling ? { dwelling: { familyId: b.dwelling.familyId, form: b.dwelling.form, grantsInitialPopulation: b.dwelling.form === "base" } } : {},
  summary: b.summary,
  implementationStatus: b.planned ? "planned" : "implemented",
  artAssetId: b.art,
  provenance: b.planned ? { source: "owner-architecture", note: "Location from the owner architecture; mechanics not yet designed." } : b.proposed ? { source: "proposed-this-build", note: "Location from the owner architecture; mechanics, cost and prerequisites proposed this build (P)." } : { source: "v0.3-catalog", note: "design/03 candidate cost and prerequisites (P)" }
}));
var slot = (id, kind, label, chain, placement, extra = {}) => ({ id, kind, label, chain, placement, ...extra });
var GREEK_TOWN = {
  id: "greek_polis",
  pantheonId: G,
  name: "Greek Polis",
  backgroundAssetId: "town.greek.background",
  // Sky and sea at the top left; Athena's statue stands at the top centre-right.
  hudAnchor: "left",
  slots: [
    slot("civic_hall", "support", "Civic Hall", ["village_hall", "town_hall", "city_hall", "capitol"], { x: 51, y: 38, width: 18, height: 18, layer: 4 }, { role: "civic_hall" }),
    slot("pantheon_temple", "support", "Pantheon Temple", ["temple_1", "temple_2"], { x: 47.5, y: 23, width: 14, height: 14, layer: 2 }, { role: "pantheon_temple" }),
    slot("mage_guild", "support", "Mage Guild / Sanctum", ["sanctum_1", "sanctum_2", "sanctum_3"], { x: 63.5, y: 29, width: 13, height: 13, layer: 2 }, { role: "mage_guild" }),
    slot("watchtower", "support", "Watchtower / Observatory", ["watchtower"], { x: 92, y: 27, width: 8, height: 8, layer: 2 }, { role: "watchtower" }),
    slot("artifact_merchant", "support", "Artifact Merchant", ["artifact_merchant"], { x: 75, y: 39, width: 13, height: 13, layer: 4 }, { role: "artifact_merchant" }),
    slot("tavern", "support", "Tavern / Heroes\u2019 Lodge", ["tavern"], { x: 30, y: 43.5, width: 12, height: 12, layer: 4 }, { role: "tavern" }),
    slot("marketplace", "support", "Marketplace", ["market"], { x: 51, y: 75, width: 14, height: 14, layer: 7 }, { role: "marketplace" }),
    slot("training_academy", "support", "Training Academy", ["training_academy"], { x: 78, y: 57.5, width: 14, height: 14, layer: 5 }, { role: "training_academy" }),
    slot("workshop", "support", "Workshop", ["workshop"], { x: 21, y: 74.5, width: 13, height: 13, layer: 7 }, { role: "workshop" }),
    slot("resource_depot", "support", "Resource Depot", ["supply_depot"], { x: 33, y: 75.5, width: 11, height: 11, layer: 7 }, { role: "resource_depot" }),
    slot("fortifications", "support", "Fortifications / Gatehouse", ["fort", "citadel", "castle"], { x: 51, y: 98, width: 22, height: 22, layer: 9 }, { role: "fortifications" }),
    slot("dwelling_t1", "dwelling", "Tier 1 \u2014 Barracks", ["barracks", "barracks_up"], { x: 67, y: 74.5, width: 13, height: 13, layer: 7 }, { tier: 1 }),
    slot("dwelling_t2", "dwelling", "Tier 2 \u2014 Peltast Range", ["peltast_range", "peltast_range_up"], { x: 82, y: 74.5, width: 13, height: 13, layer: 7 }, { tier: 2 }),
    slot("dwelling_t3", "dwelling", "Tier 3 \u2014 Griffin Aerie", ["griffin_aerie", "griffin_aerie_up"], { x: 89, y: 46, width: 12, height: 12, layer: 4 }, { tier: 3 }),
    slot("dwelling_t4", "dwelling", "Tier 4 \u2014 Training Court", ["training_court", "training_court_up"], { x: 26, y: 34, width: 13, height: 13, layer: 3 }, { tier: 4 }),
    slot("dwelling_t5", "dwelling", "Tier 5 \u2014 House of Adepts", ["adept_house", "adept_house_up"], { x: 19.5, y: 56, width: 12, height: 12, layer: 5 }, { tier: 5 }),
    slot("dwelling_t6", "dwelling", "Tier 6 \u2014 Labyrinth", ["labyrinth", "labyrinth_up"], { x: 90.5, y: 64, width: 11, height: 11, layer: 6 }, { tier: 6 }),
    slot("dwelling_t7", "dwelling", "Tier 7 \u2014 Thunder Quarry", ["thunder_quarry", "thunder_quarry_up"], { x: 8, y: 67, width: 12, height: 12, layer: 6 }, { tier: 7 })
  ]
};

// ../pantheon_realms/packages/content/src/common/gods.ts
var FIRST_MINOR_GROUP = "first_minor";
var FIRST_MINOR_FAVOR_COST = 20;
var SECOND_MINOR_GROUP = "second_minor";
var SECOND_MINOR_FAVOR_COST = 25;
function secondMinorGod(s3) {
  return {
    id: s3.id,
    pantheonId: s3.pantheonId,
    name: s3.name,
    domain: s3.domain,
    role: "minor",
    exclusivityGroup: SECOND_MINOR_GROUP,
    requirements: [
      { type: "has_god_in_group", group: "first_minor" },
      { type: "has_building", buildingId: s3.templeId },
      { type: "has_building", buildingId: s3.civicHallId }
    ],
    favorCost: SECOND_MINOR_FAVOR_COST,
    benefits: s3.benefits,
    benefitSummary: s3.benefitSummary,
    ...s3.quote ? { quote: s3.quote } : {},
    portraitAssetId: s3.portraitAssetId,
    implementationStatus: "implemented",
    provenance: { source: "proposed-this-build", note: "Second minor-god choice (P, unplaytested)." }
  };
}
function firstMinorGod(s3) {
  return {
    id: s3.id,
    pantheonId: s3.pantheonId,
    name: s3.name,
    domain: s3.domain,
    role: "minor",
    exclusivityGroup: FIRST_MINOR_GROUP,
    requirements: [{ type: "has_building", buildingId: s3.templeId }],
    favorCost: FIRST_MINOR_FAVOR_COST,
    benefits: s3.benefits,
    benefitSummary: s3.benefitSummary,
    ...s3.quote ? { quote: s3.quote } : {},
    portraitAssetId: s3.portraitAssetId,
    implementationStatus: "implemented",
    provenance: { source: "proposed-this-build", note: "First minor-god choice, added 2026-10-02 (P, unplaytested)." }
  };
}
var BLESSINGS = {
  movement: (percent) => ({ fx: { type: "movement_percent", percent }, text: `+${percent}% land movement for your heroes.` }),
  growth: (amount, maxTier) => ({
    fx: { type: "weekly_growth_bonus", amount, maxTier },
    text: `+${amount} weekly growth for every creature family of tiers 1\u2013${maxTier} in your towns.`
  }),
  recovery: (percent) => ({
    fx: { type: "casualty_recovery", percent },
    text: `After a battle you win, each stack regains ${percent}% of its losses (rounded down; adds to other recovery).`
  }),
  income: (resource, amount) => ({
    fx: { type: "daily_income", resource, amount },
    text: `+${amount} ${resource === "gold" ? "Gold" : resource[0].toUpperCase() + resource.slice(1)} per day while you own a town.`
  }),
  attribute: (attribute, amount) => ({
    fx: { type: "commander_attribute", attribute, amount },
    text: `+${amount} ${attribute === "power" ? "Spell Power" : attribute[0].toUpperCase() + attribute.slice(1)} for your commanders.`
  }),
  luck: (amount) => ({ fx: { type: "luck", amount }, text: `+${amount} Luck for your armies.` }),
  morale: (amount) => ({ fx: { type: "morale", amount }, text: `+${amount} morale for your armies.` }),
  vision: (amount) => ({ fx: { type: "vision_radius", amount }, text: `+${amount} ${amount === 1 ? "hex" : "hexes"} of adventure vision for your heroes.` }),
  creatures: (stat, amount, filter) => ({
    fx: {
      type: "creature_stat",
      stat,
      amount,
      ...filter.minTier !== void 0 ? { minTier: filter.minTier } : {},
      ...filter.maxTier !== void 0 ? { maxTier: filter.maxTier } : {},
      ...filter.ability !== void 0 ? { ability: filter.ability } : {}
    },
    text: `${filter.label}: +${amount} ${stat[0].toUpperCase() + stat.slice(1)} in battle.`
  }),
  manaRegen: (amount) => ({ fx: { type: "mana_regen", amount }, text: `+${amount} mana for your heroes at every dawn.` }),
  fury: (attack) => ({
    fx: { type: "wounded_fury", attack, numerator: 1, denominator: 2 },
    text: `Your stacks at half strength or less: +${attack} Attack in battle (does not add to other fury).`
  }),
  offering: (goldPerFavor, maxFavorPerWeek) => ({
    fx: { type: "offering", goldPerFavor, maxFavorPerWeek },
    text: `Offerings yield 1 Favor per ${goldPerFavor} Gold, at most ${maxFavorPerWeek} per offering.`
  })
};
function blessing(...parts) {
  return { benefits: parts.map((p) => p.fx), benefitSummary: parts.map((p) => p.text) };
}

// ../pantheon_realms/packages/content/src/common/signatures.ts
var SIGNATURES = {
  greek: {
    name: "Glory",
    summary: "Champions grow through victory.",
    rules: ["Your heroes gain 25% more experience from battles they win (rounded down)."],
    effects: [{ type: "battle_xp_percent", percent: 25 }]
  },
  norse: {
    name: "Berserk Fury",
    summary: "The fewer who stand, the harder they strike.",
    rules: ["In battle, a stack of yours with at most half of its starting creatures alive gains +2 Attack."],
    effects: [{ type: "wounded_fury", attack: 2, numerator: 1, denominator: 2 }]
  },
  egyptian: {
    name: "Afterlife",
    summary: "The fallen are called back from the west bank.",
    rules: [
      "After a battle you win, each of your stacks regains 20% of the creatures it lost in that battle (rounded down).",
      "Never more than the stack lost; grants no experience, rewards or kills."
    ],
    effects: [{ type: "casualty_recovery", percent: 20 }]
  },
  japanese: {
    name: "Harmony",
    summary: "Many spirits, one purpose.",
    rules: ["Counted when a battle starts: with 3 or more different creature families in your army, every stack gains +1 Defense."],
    effects: [{ type: "army_harmony", families: 3, attack: 0, defense: 1 }]
  },
  celtic: {
    name: "Shapeshifting",
    summary: "The old folk wear more than one skin.",
    rules: [
      "Creatures with Shapeshift (Pooka, Kelpie, Selkie, Horned Stag Spirit) change aspect at the start of their activation without spending it, once per activation.",
      "Without this rite, Shapeshift spends the activation."
    ],
    effects: [{ type: "free_shapeshift" }]
  },
  mesoamerican: {
    name: "Offering",
    summary: "The sun is fed so that it rises.",
    rules: [
      "Once per week in each town with a Temple, offer creatures from the garrison or the visiting hero.",
      "Gain 1 Favor per 125 Gold of their recruitment price (rounded down), at most 10 Favor per offering.",
      "A hero cannot offer its last creature."
    ],
    // 2026-10-07 balance: 125 Gold per Favor (was 150; Mesoamerican 0.42 on random maps).
    effects: [{ type: "offering", goldPerFavor: 125, maxFavorPerWeek: 10 }]
  }
};

// ../pantheon_realms/packages/content/src/greek/pantheon.ts
var GREEK_GODS = [
  {
    id: "zeus",
    pantheonId: "greek",
    name: "Zeus",
    domain: "Lightning & Power",
    role: "patron",
    requirements: [],
    favorCost: 0,
    benefits: [],
    benefitSummary: ["Fixed patron of The Three Beacons.", "No mechanical bonus is defined in rule profile pr-0.2-candidate."],
    quote: "The storm answers to the one who keeps the lights.",
    portraitAssetId: "god.greek.zeus.portrait",
    implementationStatus: "implemented",
    provenance: { source: "v0.3-campaign" }
  },
  {
    id: "athena",
    pantheonId: "greek",
    name: "Athena",
    domain: "Knowledge & Strategy",
    role: "minor",
    exclusivityGroup: "first_minor",
    requirements: [{ type: "has_building", buildingId: "temple_2" }],
    favorCost: 20,
    benefits: [
      { type: "commander_attribute", attribute: "defense", amount: 1 },
      { type: "spell_eligibility", spellId: "ward" }
    ],
    benefitSummary: ["+1 Defense for your commanders.", "Ward becomes learnable at a later Sanctum visit."],
    quote: "Hold the road together.",
    portraitAssetId: "god.greek.athena.portrait",
    implementationStatus: "implemented",
    provenance: { source: "v0.2-candidate-rules" }
  },
  {
    id: "ares",
    pantheonId: "greek",
    name: "Ares",
    domain: "War & Conquest",
    role: "minor",
    exclusivityGroup: "first_minor",
    requirements: [{ type: "has_building", buildingId: "temple_2" }],
    favorCost: 20,
    benefits: [
      { type: "commander_attribute", attribute: "attack", amount: 1 },
      { type: "spell_eligibility", spellId: "warcry" }
    ],
    benefitSummary: ["+1 Attack for your commanders.", "War Cry becomes learnable at a later Sanctum visit."],
    quote: "Break the force that bars the road.",
    portraitAssetId: "god.greek.ares.portrait",
    implementationStatus: "implemented",
    provenance: { source: "v0.2-candidate-rules" }
  },
  // Added 2026-10-02 (owner answer "Split 2 + 2"): Apollo and Artemis join the first
  // choice, Poseidon and Hera the second. Proposed; not available in The Three Beacons.
  ...[
    ["apollo", "Apollo", "Sun & Inspiration", "Sing before the battle, and the battle sings back.", blessing(BLESSINGS.attribute("power", 1), BLESSINGS.morale(1))],
    ["artemis", "Artemis", "Hunt & Wilderness", "Wait for the wind. Then loose.", blessing(BLESSINGS.creatures("attack", 2, { ability: "shooter", label: "Your shooters" }), BLESSINGS.vision(1))]
  ].map(([id, name, domain, quote, b]) => firstMinorGod({ id, pantheonId: "greek", name, domain, quote, ...b, portraitAssetId: `god.greek.${id}.portrait`, templeId: "temple_2" })),
  // Second minor-god choice (proposed this build; not available in The Three Beacons).
  ...[
    ["hermes", "Hermes", "Trade & Movement", "A road walked quickly is a road walked twice.", blessing(BLESSINGS.movement(15), BLESSINGS.income("gold", 250))],
    ["demeter", "Demeter", "Harvest & Abundance", "Feed the valley and the valley will march for you.", blessing(BLESSINGS.growth(2, 3))],
    ["hades", "Hades", "Underworld & Control", "Not every shade has to stay below.", blessing(BLESSINGS.recovery(15))]
  ].map(
    ([id, name, domain, quote, b]) => secondMinorGod({ id, pantheonId: "greek", name, domain, quote, ...b, portraitAssetId: `god.greek.${id}.portrait`, templeId: "temple_2", civicHallId: "city_hall" })
  ),
  ...[
    ["poseidon", "Poseidon", "Sea & Dominion", "The tide does not ask the shore.", blessing(BLESSINGS.movement(10), BLESSINGS.creatures("attack", 1, { minTier: 4, label: "Your tier 4\u20137 creatures" }))],
    ["hera", "Hera", "Authority & Family", "A city is a household. Keep it full.", blessing(BLESSINGS.growth(1, 4), BLESSINGS.morale(1))]
  ].map(
    ([id, name, domain, quote, b]) => secondMinorGod({ id, pantheonId: "greek", name, domain, quote, ...b, portraitAssetId: `god.greek.${id}.portrait`, templeId: "temple_2", civicHallId: "city_hall" })
  )
];
var hero = (id, name, title, classId, availability, biography, source) => ({
  id,
  pantheonId: "greek",
  name,
  title,
  classId,
  biography,
  portraitAssetId: `hero.greek.${id}.portrait`,
  availability,
  provenance: { source }
});
var GREEK_HEROES = [
  hero("alexios", "Alexios", "Strategos of Asterion", "strategos", "campaign", "The expedition commander sent to relight the three beacons of the Asterion coast. His command portrait, skills and artifacts persist through The Three Beacons.", "v0.3-campaign"),
  hero("melas", "Melas", "Former Coastal Commander", "champion", "enemy", "A former coastal commander who carried the great beacon\u2019s lens to the storm plateau, believing one light should command the whole coast.", "v0.3-campaign"),
  hero("scout_captain", "Scout Captain", "Plateau Patrol", "champion", "enemy", "Leader of the patrol that sweeps the middle plateau between the first crossings and the ward gate.", "v0.3-campaign"),
  hero("heracles", "Heracles", "Hero of Labors", "champion", "hireable", "Concept-board hero. Class assignment is provisional. A son of Zeus who finished twelve impossible labours and still walks the roads looking for a thirteenth. Hireable in skirmish; not part of The Three Beacons.", "concept-board"),
  hero("achilles", "Achilles", "Swift Champion", "champion", "hireable", "Concept-board hero. Class assignment is provisional. The fastest spear of his generation, whose charge breaks a line before it has finished forming. Hireable in skirmish; not part of The Three Beacons.", "concept-board"),
  hero("odysseus", "Odysseus", "Cunning Voyager", "strategos", "hireable", "Concept-board hero. Class assignment is provisional. A king of a small rocky island who took ten years to sail home and outwitted everyone who tried to stop him. Hireable in skirmish; not part of The Three Beacons.", "concept-board"),
  hero("atalanta", "Atalanta", "Huntress of Arcadia", "strategos", "hireable", "Concept-board hero. Class assignment is provisional. Raised by the bears of Arcadia, she outruns every hunter and never misses the first shot. Hireable in skirmish; not part of The Three Beacons.", "concept-board"),
  hero("perseus", "Perseus", "Slayer of the Gorgon", "oracle", "hireable", "Concept-board hero. Class assignment is provisional. He cut off the Gorgon\u2019s head with a borrowed sword and a polished shield, and keeps both close. Hireable in skirmish; not part of The Three Beacons.", "concept-board")
];
var GREEK_PANTHEON = {
  id: "greek",
  name: "Greek",
  epithet: "Glory & Champions",
  signature: SIGNATURES.greek,
  summary: "Disciplined hoplites, sky-borne griffins and the one-eyed giants of Thunder Quarry. The faction of The Three Beacons campaign; playable in skirmish too.",
  playability: "playable",
  roster: [
    { tier: 1, familyId: "hoplite" },
    { tier: 2, familyId: "peltast" },
    { tier: 3, familyId: "griffin" },
    { tier: 4, familyId: "cavalry" },
    { tier: 5, familyId: "temple_adept" },
    { tier: 6, familyId: "minotaur" },
    { tier: 7, familyId: "cyclops" }
  ],
  heroIds: GREEK_HEROES.map((h) => h.id),
  godIds: GREEK_GODS.map((g2) => g2.id),
  townArchetypeId: "greek_polis",
  theme: { accent: "#3b73d9", accentSoft: "#1b2f57", emblemAssetId: "emblem.greek", musicThemeId: "music.greek.theme" },
  provenance: { source: "v0.3-catalog", note: "Roster provisionally reduced to one family per tier (Griffin at tier 3)." }
};

// ../pantheon_realms/packages/content/src/pantheonKit.ts
var slug = (name) => name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
var DEFAULT_LABELS = {
  civic_hall: "Civic Hall",
  tavern: "Tavern / Heroes\u2019 Lodge",
  marketplace: "Marketplace",
  resource_depot: "Resource Depot",
  workshop: "Workshop",
  mage_guild: "Mage Guild / Sanctum",
  pantheon_temple: "Pantheon Temple",
  fortifications: "Fortifications / Gatehouse",
  training_academy: "Training Academy",
  watchtower: "Watchtower / Observatory",
  artifact_merchant: "Artifact Merchant"
};
var GREEK_FORMS = /* @__PURE__ */ new Map();
var GREEK_FAMILY_TIER = /* @__PURE__ */ new Map();
for (const f of GREEK_FAMILY_SPECS) {
  if (!f.pantheonId) continue;
  GREEK_FORMS.set(f.base.id, [f.tier, "base"]);
  GREEK_FORMS.set(f.upgraded.id, [f.tier, "upgraded"]);
  GREEK_FAMILY_TIER.set(f.familyId, f.tier);
}
var PROVENANCE = {
  source: "proposed-this-build",
  note: "Names from the owner pantheon board; all numbers proposed on the Greek design/06 curve (unplaytested)."
};
function buildPantheonKit(spec) {
  const p = spec.id;
  if (spec.families.length !== 7) throw new Error(`${p}: a pantheon needs exactly seven families`);
  const familyByTier = new Map(spec.families.map((f) => [f.tier, f]));
  const idFor = (slotId, level) => `${p}_${slotId}_l${level}`;
  const greekToLocal = /* @__PURE__ */ new Map();
  for (const b of GREEK_BUILDINGS) greekToLocal.set(b.id, idFor(b.slotId, b.level));
  const mapFamily = (greekFamilyId) => {
    const tier = GREEK_FAMILY_TIER.get(greekFamilyId);
    const f = tier ? familyByTier.get(tier) : void 0;
    if (!f) throw new Error(`${p}: no family for Greek ${greekFamilyId}`);
    return f;
  };
  const mapCreature = (greekCreatureId) => {
    const hit = GREEK_FORMS.get(greekCreatureId);
    if (!hit) throw new Error(`${p}: unknown Greek creature ${greekCreatureId}`);
    const f = familyByTier.get(hit[0]);
    return hit[1] === "base" ? f.base.id : f.upgraded.id;
  };
  const mapReq = (r2) => {
    switch (r2.type) {
      case "has_building":
        return { type: "has_building", buildingId: greekToLocal.get(r2.buildingId) ?? r2.buildingId };
      case "unique_per_player":
        return { type: "unique_per_player", buildingId: greekToLocal.get(r2.buildingId) ?? r2.buildingId };
      case "town_has_covenant":
        return { type: "town_has_covenant", familyId: mapFamily(r2.familyId).familyId };
      case "all_of":
      case "any_of":
        return { ...r2, requirements: r2.requirements.map(mapReq) };
      default:
        return r2;
    }
  };
  const mapFx = (e) => e.type === "recruit_access" ? { type: "recruit_access", creatureId: mapCreature(e.creatureId) } : e;
  const names = spec.town.names;
  const nameOf2 = (slotId, level) => {
    if (slotId.startsWith("dwelling_t")) {
      const tier = Number(slotId.slice("dwelling_t".length));
      return familyByTier.get(tier).dwellingNames[level - 1];
    }
    const list = names[slotId];
    const n = list?.[level - 1];
    if (!n) throw new Error(`${p}: missing name for ${slotId} level ${level}`);
    return n;
  };
  const t4 = familyByTier.get(4);
  const summaryOf = (g2) => {
    const lvl = g2.level;
    if (g2.implementationStatus === "planned") return "Planned support building. No mechanics are approved yet.";
    if (g2.dwelling) {
      const tier = GREEK_FAMILY_TIER.get(g2.dwelling.familyId);
      const f = familyByTier.get(tier);
      if (g2.dwelling.form === "upgraded") return `Also recruit and train ${f.upgraded.plural}. Shares the ${f.base.name} pool.`;
      const gated = g2.requirements.some((r2) => r2.type === "town_has_covenant");
      return `Recruit ${f.base.plural}. ${f.growth} per week.${gated ? ` Requires an assigned ${f.base.name} covenant.` : ""}`;
    }
    switch (g2.slotId) {
      case "civic_hall":
        return [
          "Starting civic building. 500 Gold per day.",
          `1,000 Gold per day in total (replaces ${nameOf2("civic_hall", 1)} income).`,
          "2,000 Gold per day in total.",
          "4,000 Gold per day in total. One per player."
        ][lvl - 1];
      case "tavern":
        return `Hire eligible heroes. Prerequisite for the ${nameOf2("civic_hall", 2)}.`;
      case "marketplace":
        return "Sell resources for Gold or buy them with Gold.";
      case "resource_depot":
        return "+1 Wood and +1 Stone per day.";
      case "workshop":
        return `Military prerequisite (${t4.dwellingNames[0]}, ${nameOf2("civic_hall", 3)}). Sells four tier-1 items each week where the scenario has them; each one once a week.`;
      case "mage_guild":
        return ["Tier-1 spells; sells spellbooks (500 Gold).", "Tier-2 spells.", "Tier-3 spells (Wisdom required to learn)."][lvl - 1];
      case "pantheon_temple":
        return ["1 Favor per day.", "2 Favor per day in total; enables a minor-god commitment."][lvl - 1];
      case "fortifications":
        return ["Perimeter walls and gate; military prerequisite.", "1.5\xD7 base weekly growth; keep and moat.", "2\xD7 base weekly growth; stronger walls and towers."][lvl - 1];
      case "training_academy":
      case "watchtower":
      case "artifact_merchant":
        return g2.summary;
      default:
        return g2.summary;
    }
  };
  const buildings = GREEK_BUILDINGS.map((g2) => {
    const tier = g2.dwelling ? GREEK_FAMILY_TIER.get(g2.dwelling.familyId) : 0;
    const role = GREEK_TOWN.slots.find((s3) => s3.id === g2.slotId)?.role;
    const art2 = g2.dwelling ? `town.${p}.dwelling.tier${tier}.${g2.dwelling.form}` : `town.${p}.support.${role ?? g2.slotId}.l${g2.level}`;
    return {
      id: idFor(g2.slotId, g2.level),
      pantheonId: p,
      name: nameOf2(g2.slotId, g2.level),
      slotId: g2.slotId,
      level: g2.level,
      cost: g2.cost,
      requirements: g2.requirements.map(mapReq),
      effects: g2.effects.map(mapFx),
      ...g2.dwelling ? { dwelling: { ...g2.dwelling, familyId: familyByTier.get(tier).familyId } } : {},
      summary: summaryOf(g2),
      implementationStatus: g2.implementationStatus,
      artAssetId: art2,
      provenance: g2.implementationStatus === "planned" ? { source: "owner-architecture", note: "Location from the owner architecture; mechanics not yet designed." } : { source: "proposed-this-build", note: `${spec.name} names; cost and prerequisites mirror the Greek design/03 location (P).` }
    };
  });
  const slots = GREEK_TOWN.slots.map((s3) => {
    const placement = spec.town.placements[s3.id];
    if (!placement) throw new Error(`${p}: no placement for ${s3.id}`);
    const label = s3.kind === "dwelling" ? `Tier ${s3.tier} \u2014 ${nameOf2(s3.id, 1)}` : spec.town.labels?.[s3.id] ?? DEFAULT_LABELS[s3.id];
    return {
      ...s3,
      label,
      chain: s3.chain.map((gid) => greekToLocal.get(gid)),
      placement: { x: placement.x, y: placement.y, width: placement.width, height: placement.width, layer: placement.layer }
    };
  });
  const town = {
    id: spec.town.archetypeId,
    pantheonId: p,
    name: spec.town.name,
    backgroundAssetId: `town.${p}.background`,
    ...spec.town.hudAnchor ? { hudAnchor: spec.town.hudAnchor } : {},
    slots
  };
  const familySpecs = spec.families.map((f) => ({
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
    upgraded: f.upgraded
  }));
  const { families, creatures } = buildFamilies(familySpecs, PROVENANCE);
  const lore = spec.families.map((f) => ({
    id: `lore.${f.familyId}`,
    sourceNote: f.lore.sourceNote,
    sourceRefs: f.lore.sourceRefs,
    sourceStatus: "draft_requires_review",
    gameLore: f.lore.gameLore,
    upgradeLore: f.lore.upgradeLore
  }));
  const godId = (name) => `${p}_${slug(name)}`;
  const gods = [
    {
      id: godId(spec.patron.name),
      pantheonId: p,
      name: spec.patron.name,
      domain: spec.patron.domain,
      role: "patron",
      requirements: [],
      favorCost: 0,
      benefits: [],
      benefitSummary: [`Patron of the ${spec.name} skirmish armies.`, "No mechanical bonus in rule profile pr-0.2-candidate (mirrors Zeus; proposed)."],
      ...spec.patron.quote ? { quote: spec.patron.quote } : {},
      portraitAssetId: `god.${p}.${slug(spec.patron.name)}.portrait`,
      implementationStatus: "implemented",
      provenance: { source: "proposed-this-build", note: "Patron role mirrors Zeus; no bonus." }
    },
    ...spec.minors.map((m) => ({
      id: godId(m.name),
      pantheonId: p,
      name: m.name,
      domain: m.domain,
      role: "minor",
      exclusivityGroup: "first_minor",
      requirements: [{ type: "has_building", buildingId: idFor("pantheon_temple", 2) }],
      favorCost: 20,
      benefits: m.mirrors === "attack" ? [
        { type: "commander_attribute", attribute: "attack", amount: 1 },
        { type: "spell_eligibility", spellId: "warcry" }
      ] : [
        { type: "commander_attribute", attribute: "defense", amount: 1 },
        { type: "spell_eligibility", spellId: "ward" }
      ],
      benefitSummary: m.mirrors === "attack" ? ["+1 Attack for your commanders.", `War Cry becomes learnable at a later ${nameOf2("mage_guild", 1).replace(/ I$/, "")} visit.`] : ["+1 Defense for your commanders.", `Ward becomes learnable at a later ${nameOf2("mage_guild", 1).replace(/ I$/, "")} visit.`],
      ...m.quote ? { quote: m.quote } : {},
      portraitAssetId: `god.${p}.${slug(m.name)}.portrait`,
      implementationStatus: "implemented",
      provenance: { source: "proposed-this-build", note: m.mirrors === "attack" ? "Mirrors Ares (P)." : "Mirrors Athena (P)." }
    })),
    ...spec.extraFirstMinors.map(
      (g2) => firstMinorGod({
        id: godId(g2.name),
        pantheonId: p,
        name: g2.name,
        domain: g2.domain,
        ...g2.quote ? { quote: g2.quote } : {},
        benefits: g2.blessing.benefits,
        benefitSummary: g2.blessing.benefitSummary,
        portraitAssetId: `god.${p}.${slug(g2.name)}.portrait`,
        templeId: idFor("pantheon_temple", 2)
      })
    ),
    ...spec.secondMinors.map(
      (g2) => secondMinorGod({
        id: godId(g2.name),
        pantheonId: p,
        name: g2.name,
        domain: g2.domain,
        ...g2.quote ? { quote: g2.quote } : {},
        benefits: g2.blessing.benefits,
        benefitSummary: g2.blessing.benefitSummary,
        portraitAssetId: `god.${p}.${slug(g2.name)}.portrait`,
        templeId: idFor("pantheon_temple", 2),
        civicHallId: idFor("civic_hall", 3)
      })
    )
  ];
  const classes = spec.classes.map((c3) => {
    const base = HERO_CLASSES.find((h) => h.id === c3.mirrors);
    return { ...base, id: c3.id, name: c3.name, summary: `${c3.summary} (mirrors ${base.name}; proposed).` };
  });
  const heroes = spec.heroes.map((h) => ({
    id: `${p}_${slug(h.name)}`,
    pantheonId: p,
    name: h.name,
    title: h.title,
    classId: h.classId,
    biography: h.biography,
    portraitAssetId: `hero.${p}.${slug(h.name)}.portrait`,
    availability: "hireable",
    provenance: h.proposed ? { source: "proposed-this-build", note: `Owner request 2026-10-04: more ${spec.name} heroes. Name, title, class, story and specialty proposed (unplaytested).` } : { source: "concept-board", note: `Name and title from the owner ${spec.name} board; class assignment proposed.` }
  }));
  const pantheon = {
    id: p,
    name: spec.name,
    epithet: spec.epithet,
    summary: spec.summary,
    ...SIGNATURES[p] ? { signature: SIGNATURES[p] } : {},
    playability: "playable",
    roster: spec.families.map((f) => ({ tier: f.tier, familyId: f.familyId })),
    heroIds: heroes.map((h) => h.id),
    godIds: gods.map((g2) => g2.id),
    townArchetypeId: town.id,
    theme: { accent: spec.accent, accentSoft: spec.accentSoft, emblemAssetId: `emblem.${p}`, musicThemeId: `music.${p}.theme` },
    provenance: { source: "proposed-this-build", note: "Owner request: every pantheon playable; Claude proposes every number; labelled proposed." }
  };
  return { pantheon, families, creatures, buildings, town, gods, heroes, classes, lore };
}
function kitBuildingId(pantheonId, slotId, level) {
  return `${pantheonId}_${slotId}_l${level}`;
}

// ../pantheon_realms/packages/content/src/egyptian/pantheon.ts
var EGYPTIAN_SPEC = {
  id: "egyptian",
  name: "Egyptian",
  epithet: "Afterlife & Resurrection",
  summary: "Sun-scarabs, jackal wardens, tireless ushabti and sphinxes of the river kingdoms. Playable in skirmish with proposed, unplaytested values.",
  accent: "#2aa3a8",
  accentSoft: "#1b4a4d",
  town: {
    archetypeId: "egyptian_city",
    // Open sky at the top left; the pyramids rise at the top centre.
    hudAnchor: "left",
    name: "Egyptian City",
    names: {
      civic_hall: ["Nome House", "Governor's Palace", "Vizier's Palace", "Pharaoh's Palace"],
      tavern: ["Caravan House"],
      marketplace: ["Bazaar"],
      resource_depot: ["Granary"],
      workshop: ["Workshop"],
      mage_guild: ["House of Life I", "House of Life II", "House of Life III"],
      pantheon_temple: ["Temple of the Sun I", "Temple of the Sun II"],
      fortifications: ["Enclosure Wall", "Fortress", "Great Fortress"],
      training_academy: ["Training Grounds"],
      watchtower: ["Obelisk Watch"],
      artifact_merchant: ["Treasury Merchant"]
    },
    labels: {
      tavern: "Caravan House / Heroes\u2019 Lodge",
      marketplace: "Bazaar",
      resource_depot: "Granary",
      workshop: "Workshop",
      mage_guild: "House of Life",
      pantheon_temple: "Pantheon Temple (Temple of the Sun)"
    },
    placements: {
      civic_hall: { x: 53, y: 56, width: 17, layer: 6 },
      pantheon_temple: { x: 55, y: 27, width: 13, layer: 2 },
      mage_guild: { x: 83, y: 18.5, width: 11, layer: 1 },
      watchtower: { x: 85, y: 31, width: 9, layer: 3 },
      artifact_merchant: { x: 89, y: 42, width: 11, layer: 4 },
      tavern: { x: 32, y: 50, width: 12, layer: 5 },
      marketplace: { x: 53, y: 42, width: 13, layer: 4 },
      training_academy: { x: 76, y: 50, width: 12, layer: 5 },
      workshop: { x: 16, y: 35.5, width: 12, layer: 3 },
      resource_depot: { x: 9, y: 44.5, width: 11, layer: 4 },
      fortifications: { x: 52, y: 88, width: 22, layer: 9 },
      dwelling_t1: { x: 8, y: 56, width: 11, layer: 6 },
      dwelling_t2: { x: 18, y: 80, width: 14, layer: 8 },
      dwelling_t3: { x: 84, y: 81, width: 14, layer: 8 },
      dwelling_t4: { x: 91, y: 59, width: 11, layer: 6 },
      dwelling_t5: { x: 32, y: 26, width: 12, layer: 2 },
      dwelling_t6: { x: 75, y: 63, width: 11, layer: 7 },
      dwelling_t7: { x: 27, y: 63, width: 11, layer: 7 }
    }
  },
  families: [
    {
      familyId: "egyptian_sacred_scarab",
      name: "Sacred Scarabs",
      tier: 1,
      growth: 14,
      role: "line_infantry",
      roleLabel: "Armored swarm",
      body: "beast",
      dwellingNames: ["Scarab Burrow", "Solar Burrow"],
      base: {
        id: "egyptian_sacred_scarab",
        name: "Sacred Scarab",
        plural: "Sacred Scarabs",
        stats: s2(3, 6, 10, [1, 3], 5, 0, 1),
        cost: { gold: 60 },
        abilities: ["charge_guard"],
        summary: "Dog-sized beetles with shells like bronze; slow, stubborn and hard to break through.",
        portraitAlt: "A large dark-green scarab beetle with a gleaming carapace and forelegs raised."
      },
      upgraded: {
        id: "egyptian_solar_scarab",
        name: "Solar Scarab",
        plural: "Solar Scarabs",
        stats: s2(5, 6, 12, [2, 3], 5, 0, 1),
        cost: { gold: 80 },
        abilities: ["charge_guard"],
        summary: "Scarabs that have carried the sun-disc; their gilded shells turn charges aside.",
        portraitAlt: "A golden scarab holding a glowing sun-disc between its forelegs."
      },
      lore: {
        sourceNote: "The scarab (kheper) was a symbol of the rising sun and of renewal; the god Khepri was depicted as a scarab pushing the sun across the sky.",
        sourceRefs: ["Egyptian amulet traditions; Khepri iconography \u2014 to be verified"],
        gameLore: "Every morning the temple keepers count the scarabs that come up out of the sand. Every evening there are more of them than there were.",
        upgradeLore: "Solar Scarabs have rolled the sun-disc once. The keepers say its warmth never quite leaves their shells."
      }
    },
    {
      familyId: "egyptian_jackal_guardian",
      name: "Jackal Guardians",
      tier: 2,
      growth: 9,
      role: "skirmisher",
      roleLabel: "Javelin guard",
      body: "humanoid_thrower",
      dwellingNames: ["Jackal Kennels", "Hall of Anubis"],
      base: {
        id: "egyptian_jackal_guardian",
        name: "Jackal Guardian",
        plural: "Jackal Guardians",
        stats: s2(6, 3, 10, [2, 3], 5, 10, 1, 16),
        cost: { gold: 100 },
        abilities: ["shooter"],
        summary: "Jackal-headed guards of the necropolis who hurl javelins at intruders.",
        portraitAlt: "A jackal-headed warrior in a striped headdress with a bundle of javelins."
      },
      upgraded: {
        id: "egyptian_anubian_warden",
        name: "Anubian Warden",
        plural: "Anubian Wardens",
        stats: s2(7, 4, 11, [3, 4], 6, 8, 1, 17),
        cost: { gold: 150 },
        abilities: ["shooter", "no_melee_penalty"],
        summary: "Senior wardens of the tomb gates, as dangerous with a spear in hand as with a thrown one.",
        portraitAlt: "A black-furred jackal warrior in gold-banded armor with a javelin raised to throw."
      },
      lore: {
        sourceNote: "Anubis, the jackal-headed god, was associated with embalming and the protection of the dead; jackals were linked with cemeteries on the desert edge.",
        sourceRefs: ["Egyptian funerary texts and tomb iconography \u2014 to be verified"],
        gameLore: "The Guardians were given jackal faces so the dead would know them at a glance. The living find the faces less reassuring.",
        upgradeLore: "An Anubian Warden has guarded a king\u2019s door for a lifetime. It no longer matters to him how close the thief gets."
      }
    },
    {
      familyId: "egyptian_ushabti",
      name: "Ushabti",
      tier: 3,
      growth: 7,
      role: "heavy_melee",
      roleLabel: "Tireless construct",
      body: "construct",
      dwellingNames: ["Ushabti Workshop", "Royal Tomb Workshop"],
      base: {
        id: "egyptian_ushabti",
        name: "Ushabti",
        plural: "Ushabti",
        stats: s2(8, 9, 28, [3, 5], 5, 0, 1),
        cost: { gold: 240 },
        abilities: ["unyielding"],
        summary: "Faience servant-figures brought to life; they never tire and never falter.",
        portraitAlt: "A mummiform blue-glazed figure holding a hoe and a basket, eyes painted wide."
      },
      upgraded: {
        id: "egyptian_royal_ushabti",
        name: "Royal Ushabti",
        plural: "Royal Ushabti",
        stats: s2(9, 11, 32, [3, 6], 6, 0, 1),
        cost: { gold: 300 },
        abilities: ["unyielding", "charge_guard"],
        summary: "Figures made for a pharaoh\u2019s tomb, carved larger and inscribed with stronger spells.",
        portraitAlt: "A tall gilded ushabti with a royal headdress and rows of hieroglyphs on its body."
      },
      lore: {
        sourceNote: "Ushabti (shabti) were small funerary figurines placed in tombs to perform work for the deceased in the afterlife.",
        sourceRefs: ["Book of the Dead, spell 6 \u2014 to be verified"],
        gameLore: "Somebody has to answer when the call comes for labour in the next world. The ushabti answer in this one too, if the right words are painted on them.",
        upgradeLore: "Royal Ushabti were made by the hundred for a single king. They have never been told he is gone."
      }
    },
    {
      familyId: "egyptian_sphinx",
      name: "Sphinxes",
      tier: 4,
      growth: 4,
      role: "heavy_melee",
      roleLabel: "Guardian beast",
      body: "beast",
      dwellingNames: ["Sphinx Terrace", "Sphinx Bastion"],
      base: {
        id: "egyptian_sphinx",
        name: "Sphinx",
        plural: "Sphinxes",
        stats: s2(10, 11, 39, [6, 9], 7, 0, 2),
        cost: { gold: 350 },
        abilities: ["retaliation_2"],
        summary: "Lion-bodied guardians with human faces that turn on every attacker.",
        portraitAlt: "A lion with a human face and a striped royal headdress, crouched to spring."
      },
      upgraded: {
        id: "egyptian_great_sphinx",
        name: "Great Sphinx",
        plural: "Great Sphinxes",
        stats: s2(12, 13, 45, [7, 10], 8, 0, 2),
        cost: { gold: 450 },
        abilities: ["retaliation_2", "flight"],
        summary: "Winged sphinxes of the royal terraces who strike from above and still answer twice.",
        portraitAlt: "A great sphinx with falcon wings spread, sandstone-coloured fur and a golden beard."
      },
      lore: {
        sourceNote: "Egyptian sphinxes \u2014 lions with the head of a king \u2014 were guardian figures at temples and tombs, the best known being the Great Sphinx of Giza.",
        sourceRefs: ["Giza plateau; temple avenue sphinxes \u2014 to be verified"],
        gameLore: "The sphinxes on the terrace were stone once. Nobody in the city is old enough to say when that stopped being true.",
        upgradeLore: "The Great Sphinxes are the ones that grew wings. They still prefer to wait, but they no longer have to."
      }
    },
    {
      familyId: "egyptian_crocodile_beast",
      name: "Crocodile Beasts",
      tier: 5,
      growth: 3,
      role: "mounted_shock",
      roleLabel: "River shock beast",
      body: "beast",
      dwellingNames: ["Crocodile Pens", "Temple of Sobek"],
      base: {
        id: "egyptian_crocodile_beast",
        name: "Crocodile Beast",
        plural: "Crocodile Beasts",
        stats: s2(11, 9, 34, [9, 12], 6, 0, 2),
        cost: { gold: 400 },
        abilities: ["charge"],
        summary: "Temple-raised river crocodiles that hit harder the farther they lunge.",
        portraitAlt: "A huge Nile crocodile with bronze rings on its forelegs, jaws half open."
      },
      upgraded: {
        id: "egyptian_sobek_warbeast",
        name: "Sobek Warbeast",
        plural: "Sobek Warbeasts",
        stats: s2(13, 10, 41, [10, 13], 7, 0, 2),
        cost: { gold: 500 },
        abilities: ["charge", "retaliation_2"],
        summary: "Crocodiles consecrated to Sobek, armored in bronze scales and quick to turn.",
        portraitAlt: "A crocodile in a bronze-scale harness with a sun-disc crest between its eyes."
      },
      lore: {
        sourceNote: "Sobek was a crocodile god linked with the Nile and its fertility; crocodiles were kept and mummified at his temples, for example at Kom Ombo.",
        sourceRefs: ["Kom Ombo temple; animal mummy finds \u2014 to be verified"],
        gameLore: "The river gives and the river takes. The pens are where the city keeps the part of the river that takes.",
        upgradeLore: "A Sobek Warbeast wears its god\u2019s sun-disc. The priests say that is why it never has to look where it is going."
      }
    },
    {
      familyId: "egyptian_bennu",
      name: "Bennu",
      tier: 6,
      growth: 2,
      role: "flying_interceptor",
      roleLabel: "Flying striker",
      body: "griffin",
      dwellingNames: ["Bennu Aerie", "Radiant Aerie"],
      base: {
        id: "egyptian_bennu",
        name: "Bennu",
        plural: "Bennu",
        stats: s2(15, 13, 100, [16, 22], 9, 0, 2),
        cost: { gold: 1e3 },
        abilities: ["flight"],
        summary: "Great heron-winged firebirds that strike anywhere on the field.",
        portraitAlt: "A huge grey-gold heron-like bird with a two-feathered crest and ember-lit wings."
      },
      upgraded: {
        id: "egyptian_radiant_bennu",
        name: "Radiant Bennu",
        plural: "Radiant Bennu",
        stats: s2(17, 15, 116, [18, 25], 10, 0, 2),
        cost: { gold: 1250 },
        abilities: ["flight", "unyielding"],
        summary: "Bennu that have burned and risen again; nothing on the field shakes them.",
        portraitAlt: "A blazing golden bird with sun-rays in its crest and wings trailing light."
      },
      lore: {
        sourceNote: "The Bennu was a heron-like bird associated with the sun, creation and rebirth, venerated at Heliopolis; Greek writers later linked it with the phoenix.",
        sourceRefs: ["Heliopolitan tradition; Herodotus II.73 (phoenix) \u2014 to be verified"],
        gameLore: "The Bennu nests on the highest pillar in the city and leaves at dawn. The watchers on the walls have learned to follow where it flies.",
        upgradeLore: "A Radiant Bennu has already died once in fire. It sees no reason to be afraid of anything smaller."
      }
    },
    {
      familyId: "egyptian_desert_colossus",
      name: "Desert Colossi",
      tier: 7,
      growth: 1,
      role: "apex_ranged",
      roleLabel: "Apex siege construct",
      body: "construct",
      dwellingNames: ["Colossus Quarry", "Divine Foundry"],
      base: {
        id: "egyptian_desert_colossus",
        name: "Desert Colossus",
        plural: "Desert Colossi",
        stats: s2(22, 24, 214, [38, 48], 6, 8, 2, 16),
        cost: { gold: 3e3, crystal: 1 },
        abilities: ["shooter", "wall_breaker", "no_melee_penalty"],
        summary: "Walking statues of red granite that hurl stone blocks and batter walls.",
        portraitAlt: "A towering seated-king statue of red granite, now standing, with sand pouring from its joints."
      },
      upgraded: {
        id: "egyptian_divine_colossus",
        name: "Divine Colossus",
        plural: "Divine Colossi",
        stats: s2(25, 27, 260, [44, 54], 7, 12, 2, 17),
        cost: { gold: 4500, crystal: 2 },
        abilities: ["shooter", "wall_breaker", "no_melee_penalty"],
        summary: "Colossi inlaid with gold and faience, carrying more stones and striking harder.",
        portraitAlt: "A colossal statue with a gold-inlaid headdress and eyes of lapis, a stone block in each hand."
      },
      lore: {
        sourceNote: "Colossal royal statues such as the Colossi of Memnon and those of Ramesses II at Abu Simbel stood at temple entrances as images of the king.",
        sourceRefs: ["Colossi of Memnon; Abu Simbel \u2014 to be verified"],
        gameLore: "The quarrymen cut the statue first and the prayers second. When both are finished, the statue stands up by itself.",
        upgradeLore: "The Divine Colossi carry gold in their joints. It is said to be what lets them lift a whole doorway and throw it."
      }
    }
  ],
  patron: { name: "Ra", domain: "Sun & Vitality", quote: "Each dawn I cross the sky; each dawn the city rises with me." },
  minors: [
    { name: "Set", domain: "Chaos & Strength", mirrors: "attack", quote: "Storms clear the ground for the strong." },
    { name: "Isis", domain: "Magic & Healing", mirrors: "defense", quote: "What is loved is put back together." }
  ],
  extraFirstMinors: [
    { name: "Anubis", domain: "Funerary Protection", quote: "I weigh every heart. Yours may stay a while.", blessing: blessing(BLESSINGS.attribute("knowledge", 1), BLESSINGS.recovery(10)) },
    { name: "Bastet", domain: "Grace & Protection", quote: "Soft paws, sharp claws, a home well kept.", blessing: blessing(BLESSINGS.luck(1), BLESSINGS.creatures("defense", 1, { maxTier: 3, label: "Your tier 1\u20133 creatures" })) }
  ],
  secondMinors: [
    { name: "Osiris", domain: "Rebirth & Eternity", quote: "I was scattered once. I know the way back.", blessing: blessing(BLESSINGS.recovery(15)) },
    { name: "Thoth", domain: "Knowledge & Wisdom", quote: "Write it down, and it is yours forever.", blessing: blessing(BLESSINGS.attribute("power", 1), BLESSINGS.attribute("knowledge", 1)) },
    { name: "Horus", domain: "Kingship & Dominion", quote: "Whatever flies, flies for the throne.", blessing: blessing(BLESSINGS.creatures("attack", 1, { ability: "flight", label: "Your flying creatures" }), BLESSINGS.creatures("speed", 1, { ability: "flight", label: "Your flying creatures" })) },
    { name: "Hathor", domain: "Joy & Prosperity", quote: "Music in the hall, gold in the treasury.", blessing: blessing(BLESSINGS.income("gold", 250), BLESSINGS.morale(1)) },
    { name: "Sobek", domain: "River Power & Fertility", quote: "The flood takes, and the flood gives more.", blessing: blessing(BLESSINGS.growth(2, 3), BLESSINGS.income("stone", 1)) }
  ],
  classes: [
    { id: "medjay", name: "Medjay", mirrors: "champion", summary: "A desert scout-warrior of the royal guard who leads from the front" },
    { id: "vizier", name: "Vizier", mirrors: "strategos", summary: "A royal administrator who keeps armies supplied and steady" },
    { id: "lector_priest", name: "Lector Priest", mirrors: "oracle", summary: "A reader of sacred texts whose words work as spells" }
  ],
  heroes: [
    { name: "Imhotep", title: "Master Architect", classId: "lector_priest", biography: "Concept-board hero. Builder, physician and scholar; the city was raised on his measurements. Hireable in skirmish." },
    { name: "Hatshepsut", title: "Visionary Pharaoh", classId: "vizier", biography: "Concept-board hero. She rules by planning, trade and patience, and her expeditions come home rich. Hireable in skirmish." },
    { name: "Ramses", title: "Conquering King", classId: "medjay", biography: "Concept-board hero. A warrior-king who carves his victories in stone before the dust has settled. Hireable in skirmish." },
    { name: "Cleopatra", title: "Diplomat & Strategist", classId: "vizier", biography: "Concept-board hero. Speaks every language at her court and wins most battles before they begin. Hireable in skirmish." },
    { name: "Nefertiti", title: "Culture & Unity", classId: "lector_priest", biography: "Concept-board hero. A queen of the sun-cult whose hymns steady armies and open sealed doors. Hireable in skirmish." },
    { name: "Ahmose", title: "Liberator of the Two Lands", classId: "medjay", proposed: true, biography: "Proposed hero. A young prince who took up his fallen father\u2019s war and drove the foreign kings out of the delta. His jackal-masked guard marched at his side. Hireable in skirmish." },
    { name: "Tiye", title: "Great Royal Wife", classId: "vizier", proposed: true, biography: "Proposed hero. A commoner\u2019s daughter who became the most trusted voice at court; foreign kings wrote their letters to her. Cedar from distant ports arrives where she sends for it. Hireable in skirmish." },
    { name: "Peseshet", title: "Overseer of Physicians", classId: "lector_priest", proposed: true, biography: "Proposed hero. She led the women physicians of the old kingdom and taught the midwives of Sais. Her words close wounds as surely as her needle. Hireable in skirmish." }
  ]
};

// ../pantheon_realms/packages/content/src/japanese/pantheon.ts
var JAPANESE_SPEC = {
  id: "japanese",
  name: "Japanese",
  epithet: "Spirits & Harmony",
  summary: "Fox spirits, river kappa, mountain tengu and the eight-headed Orochi of shrine and castle country. Playable in skirmish with proposed, unplaytested values.",
  accent: "#d0453f",
  accentSoft: "#4f1d1f",
  town: {
    archetypeId: "japanese_castle_town",
    // Hills under the evening sky between the left torii gate and Mount Fuji.
    hudAnchor: 45,
    name: "Japanese Castle Town",
    names: {
      civic_hall: ["Headman's House", "Magistrate's Hall", "Daimyo's Hall", "Shogun's Palace"],
      tavern: ["Teahouse"],
      marketplace: ["Market Street"],
      resource_depot: ["Storehouse"],
      workshop: ["Workshop"],
      mage_guild: ["Onmy\u014D Hall I", "Onmy\u014D Hall II", "Onmy\u014D Hall III"],
      pantheon_temple: ["Shrine", "Grand Shrine"],
      fortifications: ["Stockade", "Castle Walls", "Great Castle"],
      training_academy: ["Dojo"],
      watchtower: ["Watch Pagoda"],
      artifact_merchant: ["Curio Shop"]
    },
    labels: {
      tavern: "Teahouse / Heroes\u2019 Lodge",
      marketplace: "Market Street",
      resource_depot: "Storehouse",
      workshop: "Workshop",
      mage_guild: "Onmy\u014D Hall",
      pantheon_temple: "Pantheon Temple (Shrine)"
    },
    placements: {
      civic_hall: { x: 51, y: 62, width: 17, layer: 6 },
      pantheon_temple: { x: 20, y: 24, width: 13, layer: 1 },
      mage_guild: { x: 91, y: 32, width: 11, layer: 2 },
      watchtower: { x: 37, y: 30.5, width: 8, layer: 2 },
      artifact_merchant: { x: 90, y: 50, width: 11, layer: 4 },
      tavern: { x: 26, y: 52, width: 12, layer: 5 },
      marketplace: { x: 57, y: 44, width: 13, layer: 3 },
      training_academy: { x: 69, y: 49, width: 12, layer: 4 },
      workshop: { x: 33, y: 40, width: 11, layer: 3 },
      resource_depot: { x: 12, y: 40, width: 11, layer: 3 },
      fortifications: { x: 54, y: 80, width: 17, layer: 8 },
      dwelling_t1: { x: 13, y: 61, width: 11, layer: 6 },
      dwelling_t2: { x: 30, y: 76, width: 13, layer: 7 },
      dwelling_t3: { x: 85, y: 65, width: 12, layer: 6 },
      dwelling_t4: { x: 81, y: 77.5, width: 13, layer: 7 },
      dwelling_t5: { x: 77, y: 89, width: 13, layer: 9 },
      dwelling_t6: { x: 67, y: 34, width: 10, layer: 2 },
      dwelling_t7: { x: 40, y: 95, width: 14, layer: 9 }
    }
  },
  families: [
    {
      familyId: "japanese_kitsune",
      name: "Kitsune",
      tier: 1,
      growth: 14,
      role: "fast_melee",
      roleLabel: "Fox skirmisher",
      body: "beast",
      dwellingNames: ["Kitsune Grove", "Nine-Tail Shrine"],
      base: {
        id: "japanese_kitsune",
        name: "Kitsune",
        plural: "Kitsune",
        stats: s2(5, 4, 10, [1, 3], 6, 0, 1),
        cost: { gold: 60 },
        abilities: [],
        summary: "Quick fox spirits that dart into gaps in the enemy line.",
        portraitAlt: "A russet fox with two tails and a faint blue flame floating beside it."
      },
      upgraded: {
        id: "japanese_nine_tailed_kitsune",
        name: "Nine-Tailed Kitsune",
        plural: "Nine-Tailed Kitsune",
        stats: s2(6, 4, 10, [2, 4], 7, 0, 1),
        cost: { gold: 80 },
        abilities: ["family_ward"],
        summary: "Old white foxes that can ward one ally per battle with fox-fire.",
        portraitAlt: "A white fox with nine fanned tails and a ring of pale fox-fire."
      },
      lore: {
        sourceNote: "Kitsune are fox spirits of Japanese folklore, associated with Inari shrines; tales credit old foxes with more tails, wisdom and magic.",
        sourceRefs: ["Inari shrine traditions; Konjaku Monogatari fox tales \u2014 to be verified"],
        gameLore: "The foxes of the grove bring rice to the shrine steps in good years. In bad years they bring the soldiers instead.",
        upgradeLore: "A fox that has grown nine tails remembers every favour it has ever owed, and pays them at the worst moment for its enemies."
      }
    },
    {
      familyId: "japanese_kappa",
      name: "Kappa",
      tier: 2,
      growth: 9,
      role: "line_infantry",
      roleLabel: "River guard",
      body: "beast",
      dwellingNames: ["Kappa Pond", "Elder's Pond"],
      base: {
        id: "japanese_kappa",
        name: "Kappa",
        plural: "Kappa",
        stats: s2(5, 6, 12, [2, 3], 5, 0, 1),
        cost: { gold: 100 },
        abilities: ["charge_guard"],
        summary: "Shell-backed river imps who brace against charges and refuse to give ground.",
        portraitAlt: "A green turtle-shelled creature with a water-filled dish on its head and webbed hands."
      },
      upgraded: {
        id: "japanese_river_elder_kappa",
        name: "River Elder Kappa",
        plural: "River Elder Kappa",
        stats: s2(7, 8, 16, [2, 4], 6, 0, 1),
        cost: { gold: 150 },
        abilities: ["charge_guard", "retaliation_2"],
        summary: "Moss-shelled elders of the deep pools who answer two attackers each round.",
        portraitAlt: "A large mossy-shelled kappa with a white beard and a bamboo staff."
      },
      lore: {
        sourceNote: "The kappa is a water creature of Japanese folklore, often described with a shell and a water-filled hollow on its head; tales say it keeps its word once a promise is made.",
        sourceRefs: ["Edo-period y\u014Dkai compendia (e.g. Toriyama Sekien) \u2014 to be verified"],
        gameLore: "The kappa agreed to guard the town\u2019s river crossings in return for cucumbers and courtesy. Travellers still bow to the water before they wade in.",
        upgradeLore: "The River Elders made that agreement themselves. They are very strict about the bowing."
      }
    },
    {
      familyId: "japanese_tengu",
      name: "Tengu",
      tier: 3,
      growth: 7,
      role: "flying_interceptor",
      roleLabel: "Mountain flyer",
      body: "winged_humanoid",
      dwellingNames: ["Tengu Nest", "Great Tengu Peak"],
      base: {
        id: "japanese_tengu",
        name: "Tengu",
        plural: "Tengu",
        stats: s2(9, 7, 28, [3, 5], 8, 0, 1),
        cost: { gold: 240 },
        abilities: ["flight"],
        summary: "Winged mountain warriors who drop on the enemy\u2019s rear line.",
        portraitAlt: "A crow-winged warrior with a red long-nosed mask and a short sword."
      },
      upgraded: {
        id: "japanese_great_tengu",
        name: "Great Tengu",
        plural: "Great Tengu",
        stats: s2(10, 9, 30, [4, 6], 9, 0, 1),
        cost: { gold: 300 },
        abilities: ["flight", "retaliation_2"],
        summary: "Masters of the mountain schools, quick enough to answer two attackers.",
        portraitAlt: "A tengu in monk\u2019s robes with great black wings and a feather fan."
      },
      lore: {
        sourceNote: "Tengu are mountain spirits of Japanese folklore, pictured as bird-like or long-nosed winged beings; legends tell of tengu teaching swordsmanship to heroes.",
        sourceRefs: ["Legends of Mount Kurama and Minamoto no Yoshitsune \u2014 to be verified"],
        gameLore: "The tengu train anyone who can climb to their nest. Few can. The ones who manage it come down very quickly.",
        upgradeLore: "Great Tengu taught the teachers. They still correct the stance of anyone who fights near them."
      }
    },
    {
      familyId: "japanese_oni",
      name: "Oni",
      tier: 4,
      growth: 4,
      role: "heavy_melee",
      roleLabel: "Brute",
      body: "giant",
      dwellingNames: ["Oni Quarry", "Warlord's Fortress"],
      base: {
        id: "japanese_oni",
        name: "Oni",
        plural: "Oni",
        stats: s2(12, 10, 39, [6, 9], 5, 0, 2),
        cost: { gold: 350 },
        abilities: ["unyielding"],
        summary: "Horned ogres with iron clubs who fear nothing on the field.",
        portraitAlt: "A red-skinned horned ogre in a tiger-skin wrap carrying a studded iron club."
      },
      upgraded: {
        id: "japanese_oni_warlord",
        name: "Oni Warlord",
        plural: "Oni Warlords",
        stats: s2(14, 12, 42, [7, 10], 6, 0, 2),
        cost: { gold: 450 },
        abilities: ["unyielding", "charge_guard"],
        summary: "Armored oni chieftains that stop a charge dead.",
        portraitAlt: "A blue-skinned oni in lacquered samurai armor with a huge kanab\u014D."
      },
      lore: {
        sourceNote: "Oni are ogre-like beings of Japanese folklore, often shown horned and carrying an iron club (kanab\u014D); the Momotar\u014D tale ends on an island of oni.",
        sourceRefs: ["Momotar\u014D folktale; y\u014Dkai picture scrolls \u2014 to be verified"],
        gameLore: "The oni of the quarry were defeated long ago, and they have never forgotten that the victor fed them afterwards. They work for rice and a good fight.",
        upgradeLore: "An Oni Warlord wears the armor of the general who beat him. He considers it a compliment to them both."
      }
    },
    {
      familyId: "japanese_jorogumo",
      name: "Jorogumo",
      tier: 5,
      growth: 3,
      role: "heavy_melee",
      roleLabel: "Spider spirit",
      body: "spirit",
      dwellingNames: ["Spider Hollow", "Queen's Web"],
      base: {
        id: "japanese_jorogumo",
        name: "Jorogumo",
        plural: "Jorogumo",
        stats: s2(12, 10, 38, [9, 12], 6, 0, 1),
        cost: { gold: 400 },
        abilities: ["retaliation_2"],
        summary: "Spider spirits that catch attackers in silk and bite back twice.",
        portraitAlt: "A pale woman in a web-patterned kimono whose shadow has eight spider legs."
      },
      upgraded: {
        id: "japanese_queen_jorogumo",
        name: "Queen Jorogumo",
        plural: "Queen Jorogumo",
        stats: s2(13, 12, 44, [10, 13], 7, 0, 1),
        cost: { gold: 500 },
        abilities: ["retaliation_2", "family_ward"],
        summary: "Ancient spider queens who shield one ally per battle in a cocoon of silk.",
        portraitAlt: "A spider-bodied woman in a gold-threaded kimono, webs glittering behind her."
      },
      lore: {
        sourceNote: "The jor\u014Dgumo is a spider y\u014Dkai of Japanese folklore said to take the form of a woman; the name is also that of a real orb-weaving spider.",
        sourceRefs: ["Edo-period tales (e.g. Taihei-Hyakumonogatari) \u2014 to be verified"],
        gameLore: "The hollow behind the castle is thick with silk. The castle pays its rent there in lantern oil and does not send anyone to collect.",
        upgradeLore: "The Queen has spun for four hundred years. Her silk can hold a falling wall."
      }
    },
    {
      familyId: "japanese_kirin",
      name: "Kirin",
      tier: 6,
      growth: 2,
      role: "ranged_support",
      roleLabel: "Holy beast (ranged)",
      body: "beast",
      dwellingNames: ["Kirin Pavilion", "Celestial Pavilion"],
      base: {
        id: "japanese_kirin",
        name: "Kirin",
        plural: "Kirin",
        stats: s2(13, 12, 90, [14, 20], 8, 8, 2, 16),
        cost: { gold: 1e3 },
        abilities: ["shooter", "no_melee_penalty"],
        summary: "Scaled, antlered holy beasts that cast holy fire and strike just as hard up close.",
        portraitAlt: "A deer-like beast with dragon scales, a single antler and flames at its hooves."
      },
      upgraded: {
        id: "japanese_celestial_kirin",
        name: "Celestial Kirin",
        plural: "Celestial Kirin",
        stats: s2(15, 14, 104, [16, 22], 9, 12, 2, 17),
        cost: { gold: 1250 },
        abilities: ["shooter", "no_melee_penalty"],
        summary: "Kirin that walk on clouds; more fire and more reach.",
        portraitAlt: "A golden-scaled kirin walking on clouds, mane of white fire streaming."
      },
      lore: {
        sourceNote: "The kirin (Chinese qilin) is an auspicious hooved chimera said to appear in the reign of a just ruler; Japanese art often gives it scales and flames.",
        sourceRefs: ["East Asian qilin tradition; Japanese shrine carvings \u2014 to be verified"],
        gameLore: "A kirin never steps on a living blade of grass. The castle built it a pavilion of stone so it would have somewhere to stand.",
        upgradeLore: "The Celestial Kirin came down from the clouds when a fair lord took the castle. It has not decided yet whether to stay."
      }
    },
    {
      familyId: "japanese_orochi",
      name: "Orochi",
      tier: 7,
      growth: 1,
      role: "apex_melee",
      roleLabel: "Apex serpent",
      body: "serpent",
      dwellingNames: ["Orochi Sanctuary", "Imperial Sanctuary"],
      base: {
        id: "japanese_orochi",
        name: "Orochi",
        plural: "Orochi",
        stats: s2(25, 21, 262, [43, 53], 7, 0, 2),
        cost: { gold: 3e3, crystal: 1 },
        abilities: ["retaliation_unlimited"],
        summary: "Many-headed serpents with a head for every attacker.",
        portraitAlt: "A vast serpent with many heads rising from one coiled body, eyes red as lanterns."
      },
      upgraded: {
        id: "japanese_imperial_orochi",
        name: "Imperial Orochi",
        plural: "Imperial Orochi",
        stats: s2(28, 24, 302, [49, 59], 8, 0, 2),
        cost: { gold: 4500, crystal: 2 },
        abilities: ["retaliation_unlimited", "unyielding"],
        summary: "Orochi crowned with gold who never lose their nerve.",
        portraitAlt: "An eight-headed serpent with gold scales and a golden crest on every head."
      },
      lore: {
        sourceNote: "Yamata no Orochi is the eight-headed, eight-tailed serpent slain by the storm god Susanoo in the Kojiki and Nihon Shoki; the sword Kusanagi was found in one of its tails.",
        sourceRefs: ["Kojiki; Nihon Shoki \u2014 to be verified"],
        gameLore: "The sanctuary keeps eight vats of rice wine filled. Nobody asks what happens if one of them runs dry.",
        upgradeLore: "The Imperial Orochi are older than the story. They consider it slander."
      }
    }
  ],
  patron: { name: "Amaterasu", domain: "Light & Prosperity", quote: "Open the cave door, and the world is bright again." },
  minors: [
    { name: "Hachiman", domain: "War & Guardianship", mirrors: "attack", quote: "Draw the bow to its full length." },
    { name: "Susanoo", domain: "Storms & Protection", mirrors: "defense", quote: "The storm that breaks the wave also shelters the bay." }
  ],
  extraFirstMinors: [
    { name: "Tsukuyomi", domain: "Night & Insight", quote: "What the sun hides, the moon shows.", blessing: blessing(BLESSINGS.attribute("power", 1), BLESSINGS.vision(1)) },
    { name: "Benzaiten", domain: "Arts & Inspiration", quote: "Play one true note and the river answers.", blessing: blessing(BLESSINGS.attribute("knowledge", 1), BLESSINGS.manaRegen(2)) }
  ],
  secondMinors: [
    { name: "Inari", domain: "Prosperity & Bounty", quote: "Leave rice at the shrine; find more in the storehouse.", blessing: blessing(BLESSINGS.income("gold", 300), BLESSINGS.income("wood", 1)) },
    { name: "Fujin", domain: "Wind & Movement", quote: "Open the bag. Let the road come to you.", blessing: blessing(BLESSINGS.movement(20)) },
    { name: "Raijin", domain: "Thunder & Power", quote: "Every arrow carries a little of the storm.", blessing: blessing(BLESSINGS.attribute("power", 1), BLESSINGS.creatures("attack", 2, { ability: "shooter", label: "Your shooters" })) },
    { name: "Izanagi", domain: "Creation & Renewal", quote: "Stir the sea again; new islands will rise.", blessing: blessing(BLESSINGS.growth(1, 4), BLESSINGS.manaRegen(2)) },
    { name: "Izanami", domain: "Death & Rebirth", quote: "Do not look back at me. Just come home.", blessing: blessing(BLESSINGS.recovery(20)) }
  ],
  classes: [
    { id: "samurai", name: "Samurai", mirrors: "champion", summary: "A sworn swordsman who leads from the front rank" },
    { id: "daimyo", name: "Daimyo", mirrors: "strategos", summary: "A domain lord who keeps a disciplined army together" },
    { id: "onmyoji", name: "Onmy\u014Dji", mirrors: "oracle", summary: "A diviner of yin and yang who casts spells in battle" }
  ],
  heroes: [
    { name: "Momotaro", title: "People's Hero", classId: "onmyoji", biography: "Concept-board hero. Born from a peach, raised by farmers, and followed by a dog, a monkey and a pheasant who all give advice. Hireable in skirmish." },
    { name: "Yamato Takeru", title: "Imperial Explorer", classId: "samurai", biography: "Concept-board hero. A prince sent to every edge of the map, who keeps coming back from it. Hireable in skirmish." },
    { name: "Tomoe Gozen", title: "Legendary Archer", classId: "samurai", biography: "Concept-board hero. A mounted warrior famed with bow and blade, first into every breach. Hireable in skirmish." },
    { name: "Benkei", title: "Devoted Guardian", classId: "daimyo", biography: "Concept-board hero. A warrior-monk who once held a bridge alone and now holds armies together. Hireable in skirmish." },
    { name: "Yoshitsune", title: "Brilliant Strategist", classId: "daimyo", biography: "Concept-board hero. Trained by mountain tengu; his marches arrive where no one expects them. Hireable in skirmish." },
    { name: "Kusunoki Masashige", title: "Loyal Defender", classId: "daimyo", proposed: true, biography: "Proposed hero. He held a mountain fortress with a few hundred men against an army, rolling logs and stones down on every assault. Walls rise wherever he camps. Hireable in skirmish." },
    { name: "Abe no Seimei", title: "Master of Onmy\u014D", classId: "onmyoji", proposed: true, biography: "Proposed hero. The court\u2019s greatest diviner, said to be the son of a fox-woman. Fox-fire answers him before he finishes the charm. Hireable in skirmish." },
    { name: "Hangaku Gozen", title: "Archer of Torisaka", classId: "samurai", proposed: true, biography: "Proposed hero. She held the walls of Torisaka from the gate-tower with her bow until an arrow found her. The river-folk of her northern home fight beside her. Hireable in skirmish." }
  ]
};

// ../pantheon_realms/packages/content/src/celtic/pantheon.ts
var CELTIC_SPEC = {
  id: "celtic",
  name: "Celtic",
  epithet: "Nature & Transformation",
  summary: "Shape-shifting pooka, otherworld hounds, loch kelpies and the sea-giants of the hillforts. Playable in skirmish with proposed, unplaytested values.",
  accent: "#4f9f5c",
  accentSoft: "#1f3d25",
  town: {
    archetypeId: "celtic_hillfort",
    // Mountains at the top right; the great tree and the stone arch stand at the top left and centre.
    hudAnchor: "right",
    name: "Celtic Hillfort",
    names: {
      civic_hall: ["Roundhouse", "Chieftain's Hall", "High King's Hall", "Hall of Tara"],
      tavern: ["Mead House"],
      marketplace: ["Fair Green"],
      resource_depot: ["Stores"],
      workshop: ["Workshop"],
      mage_guild: ["Druid Grove I", "Druid Grove II", "Druid Grove III"],
      pantheon_temple: ["Nemeton I", "Nemeton II"],
      fortifications: ["Palisade", "Ringfort", "Hillfort"],
      training_academy: ["Fianna Camp"],
      watchtower: ["Beacon Hill"],
      artifact_merchant: ["Torc Trader"]
    },
    labels: {
      tavern: "Mead House / Heroes\u2019 Lodge",
      marketplace: "Fair Green",
      resource_depot: "Stores",
      workshop: "Workshop",
      mage_guild: "Druid Grove",
      pantheon_temple: "Pantheon Temple (Nemeton)"
    },
    placements: {
      civic_hall: { x: 51, y: 81, width: 17, layer: 7 },
      pantheon_temple: { x: 52, y: 52, width: 13, layer: 4 },
      mage_guild: { x: 13, y: 28, width: 11, layer: 1 },
      watchtower: { x: 89, y: 29, width: 8, layer: 1 },
      artifact_merchant: { x: 92, y: 47, width: 10, layer: 3 },
      tavern: { x: 26, y: 55, width: 12, layer: 5 },
      marketplace: { x: 33, y: 43, width: 12, layer: 3 },
      training_academy: { x: 79, y: 56, width: 12, layer: 5 },
      workshop: { x: 12, y: 44, width: 11, layer: 3 },
      resource_depot: { x: 36, y: 28, width: 10, layer: 1 },
      fortifications: { x: 52, y: 99, width: 20, layer: 9 },
      dwelling_t1: { x: 27, y: 70, width: 12, layer: 6 },
      dwelling_t2: { x: 11, y: 70, width: 12, layer: 6 },
      dwelling_t3: { x: 74, y: 70, width: 12, layer: 6 },
      dwelling_t4: { x: 82, y: 42, width: 11, layer: 3 },
      dwelling_t5: { x: 89, y: 70, width: 11, layer: 6 },
      dwelling_t6: { x: 65, y: 36, width: 9, layer: 2 },
      dwelling_t7: { x: 86, y: 93, width: 14, layer: 9 }
    }
  },
  families: [
    {
      familyId: "celtic_pooka",
      name: "Pooka",
      tier: 1,
      growth: 14,
      role: "fast_melee",
      roleLabel: "Shape-shifter",
      body: "beast",
      dwellingNames: ["Pooka Warren", "Elder Warren"],
      base: {
        id: "celtic_pooka",
        name: "Pooka",
        plural: "Pooka",
        stats: s2(4, 4, 10, [1, 3], 6, 0, 1),
        cost: { gold: 60 },
        abilities: ["shapeshift_hare"],
        summary: "Mischievous shape-shifters, usually a black goat or hare, quick across open ground.",
        portraitAlt: "A black long-eared creature, half hare and half goat, with golden eyes."
      },
      upgraded: {
        id: "celtic_elder_pooka",
        name: "Elder Pooka",
        plural: "Elder Pooka",
        stats: s2(5, 5, 11, [2, 3], 7, 0, 1),
        cost: { gold: 75 },
        abilities: ["charge_guard", "shapeshift_hare"],
        summary: "Old pooka that turn into something too big to charge through at the last moment.",
        portraitAlt: "A great dark horse-goat with curling horns and a shaggy mane."
      },
      lore: {
        sourceNote: "The p\xFAca is a shape-changing spirit of Irish folklore, often appearing as a dark horse, goat or hare; it can bring either fortune or trouble.",
        sourceRefs: ["Irish folklore collections (e.g. Crofton Croker, Yeats) \u2014 to be verified"],
        gameLore: "Nobody invites the pooka to the muster. They arrive anyway, in whatever shape suits the weather, and nobody has ever dared send them home.",
        upgradeLore: "An Elder Pooka has been a horse, a goat, an eagle and once, briefly, a cart. It knows which shape a spear hates most."
      }
    },
    {
      familyId: "celtic_cu_sith",
      name: "Cu Sith",
      tier: 2,
      growth: 9,
      role: "fast_melee",
      roleLabel: "Otherworld hound",
      body: "beast",
      dwellingNames: ["Hound Kennel", "Great Hound Kennel"],
      base: {
        id: "celtic_cu_sith",
        name: "Cu Sith",
        plural: "Cu Sith",
        stats: s2(6, 4, 11, [2, 4], 7, 0, 1),
        cost: { gold: 110 },
        abilities: ["charge"],
        summary: "Huge green-furred hounds of the otherworld that strike harder after a long run.",
        portraitAlt: "A shaggy dark-green hound the size of a calf with a braided tail."
      },
      upgraded: {
        id: "celtic_great_cu_sith",
        name: "Great Cu Sith",
        plural: "Great Cu Sith",
        stats: s2(8, 5, 13, [3, 4], 8, 0, 1),
        cost: { gold: 150 },
        abilities: ["charge"],
        summary: "Pack leaders whose bay carries across three hills.",
        portraitAlt: "A massive green hound with glowing eyes and a silver torc collar."
      },
      lore: {
        sourceNote: "The c\xF9-s\xECth is a large otherworldly hound of Scottish Highland folklore, often described as dark green; its baying was taken as an omen.",
        sourceRefs: ["Scottish Highland folklore collections \u2014 to be verified"],
        gameLore: "The hounds hunt the hill paths at night. Travellers who hear them bay three times are advised to be inside by the third.",
        upgradeLore: "The Great Hounds answer only to whoever holds the hall. They have outlived eleven chieftains so far."
      }
    },
    {
      familyId: "celtic_kelpie",
      name: "Kelpies",
      tier: 3,
      growth: 7,
      role: "mounted_shock",
      roleLabel: "Water horse",
      body: "beast",
      dwellingNames: ["Kelpie Loch", "Dread Loch"],
      base: {
        id: "celtic_kelpie",
        name: "Kelpie",
        plural: "Kelpies",
        stats: s2(8, 6, 24, [3, 6], 8, 0, 2),
        cost: { gold: 250 },
        abilities: ["charge", "shapeshift_waterhorse"],
        summary: "Water-horses from the lochs that crash into the line at full gallop.",
        portraitAlt: "A grey horse with a dripping weed-tangled mane and hooves turned backwards."
      },
      upgraded: {
        id: "celtic_dread_kelpie",
        name: "Dread Kelpie",
        plural: "Dread Kelpies",
        stats: s2(10, 8, 31, [4, 6], 9, 0, 2),
        cost: { gold: 310 },
        abilities: ["charge", "charge_guard", "shapeshift_waterhorse"],
        summary: "Black loch-horses that no charge can knock aside.",
        portraitAlt: "A black water-horse with sea-green eyes and a mane like streaming kelp."
      },
      lore: {
        sourceNote: "The kelpie is a shape-shifting water horse of Scottish folklore said to haunt rivers and lochs and lure riders into the water.",
        sourceRefs: ["Scottish folklore; the Kelpies sculpture (Falkirk) as a modern reference \u2014 to be verified"],
        gameLore: "Nobody rides a kelpie. The fort\u2019s warriors run alongside them into battle, and let go of the mane before the water.",
        upgradeLore: "Dread Kelpies come from the loch that has no bottom. They do not stop for anything, including walls."
      }
    },
    {
      familyId: "celtic_banshee",
      name: "Banshees",
      tier: 4,
      growth: 4,
      role: "ranged_support",
      roleLabel: "Keening spirit (ranged)",
      body: "spirit",
      dwellingNames: ["Banshee Cairn", "Keening Cairn"],
      base: {
        id: "celtic_banshee",
        name: "Banshee",
        plural: "Banshees",
        stats: s2(10, 8, 30, [6, 9], 6, 8, 1, 9),
        cost: { gold: 380 },
        abilities: ["shooter", "no_melee_penalty"],
        summary: "Keening spirits whose wail strikes from across the field.",
        portraitAlt: "A pale grey-cloaked woman with long silver hair, mouth open in a cry."
      },
      upgraded: {
        id: "celtic_battle_banshee",
        name: "Battle Banshee",
        plural: "Battle Banshees",
        stats: s2(12, 10, 38, [7, 10], 7, 12, 1, 10),
        cost: { gold: 480 },
        abilities: ["shooter", "no_melee_penalty"],
        summary: "Banshees who follow the war-bands and keen for the enemy instead.",
        portraitAlt: "A banshee in torn battle-red wrappings, hair streaming like smoke."
      },
      lore: {
        sourceNote: 'The bean s\xEDdhe ("woman of the fairy mound") of Irish folklore is a spirit whose keening foretells a death in certain families.',
        sourceRefs: ["Irish folklore collections \u2014 to be verified"],
        gameLore: "The cairn women keen for the fort\u2019s dead. In war they keen for the enemy\u2019s, a little early.",
        upgradeLore: "A Battle Banshee has cried for so many warriors that she knows exactly where the next one will fall."
      }
    },
    {
      familyId: "celtic_selkie",
      name: "Selkies",
      tier: 5,
      growth: 3,
      role: "heavy_melee",
      roleLabel: "Sea guardian",
      body: "beast",
      dwellingNames: ["Selkie Cove", "Storm Cove"],
      base: {
        id: "celtic_selkie",
        name: "Selkie",
        plural: "Selkies",
        stats: s2(12, 10, 40, [8, 11], 5, 0, 2),
        cost: { gold: 400 },
        abilities: ["retaliation_2", "shapeshift_sealskin"],
        summary: "Seal-folk warriors who come ashore in grey sealskin and fight like the tide.",
        portraitAlt: "A great grey seal with a human gaze, rising from surf onto rocks."
      },
      upgraded: {
        id: "celtic_storm_selkie",
        name: "Storm Selkie",
        plural: "Storm Selkies",
        stats: s2(13, 12, 46, [9, 12], 6, 0, 2),
        cost: { gold: 500 },
        abilities: ["retaliation_2", "family_ward", "shapeshift_sealskin"],
        summary: "Selkies of the winter sea who can wrap one ally in sea-mist once per battle.",
        portraitAlt: "A dark storm-grey selkie with a mantle of spray and sea-glass eyes."
      },
      lore: {
        sourceNote: "Selkies are seal-folk of Scottish, Irish and Faroese folklore who shed their sealskins to walk on land.",
        sourceRefs: ["Orkney and Shetland tales; Faroese K\xF3pakonan legend \u2014 to be verified"],
        gameLore: "The cove folk keep their skins hidden under the stones. The fort keeps the stones guarded, and the selkies keep the coast.",
        upgradeLore: "Storm Selkies come in only when the winter sea is at its worst. They bring a little of it with them."
      }
    },
    {
      familyId: "celtic_horned_stag_spirit",
      name: "Horned Stag Spirits",
      tier: 6,
      growth: 2,
      role: "mounted_shock",
      roleLabel: "Forest charger",
      body: "beast",
      dwellingNames: ["Stag Grove", "Great Stag Grove"],
      base: {
        id: "celtic_horned_stag_spirit",
        name: "Horned Stag Spirit",
        plural: "Horned Stag Spirits",
        stats: s2(15, 13, 90, [16, 22], 9, 0, 2),
        cost: { gold: 1e3 },
        abilities: ["charge", "shapeshift_rut"],
        summary: "White forest stags with antlers like oak crowns that break lines with their charge.",
        portraitAlt: "A huge white stag with moss-hung antlers and a faint green glow."
      },
      upgraded: {
        id: "celtic_great_stag_spirit",
        name: "Great Stag Spirit",
        plural: "Great Stag Spirits",
        stats: s2(17, 15, 110, [18, 25], 10, 0, 2),
        cost: { gold: 1250 },
        abilities: ["charge", "unyielding", "shapeshift_rut"],
        summary: "The lord of the grove; its courage never breaks.",
        portraitAlt: "A stag of pale gold with an antler crown hung with leaves and stars."
      },
      lore: {
        sourceNote: "An antlered figure appears in Celtic art, most famously on the Gundestrup cauldron; he is often identified with Cernunnos, and white stags lead heroes into the otherworld in many tales.",
        sourceRefs: ["Gundestrup cauldron; Pillar of the Boatmen inscription \u2014 to be verified"],
        gameLore: "The stags of the grove choose which hunters may enter the wood. The chosen ones come back with antler-shaped scars and very few words.",
        upgradeLore: "The Great Stag has never been hunted. It has, however, hunted."
      }
    },
    {
      familyId: "celtic_fomorian_giant",
      name: "Fomorian Giants",
      tier: 7,
      growth: 1,
      role: "apex_melee",
      roleLabel: "Apex giant",
      body: "giant",
      dwellingNames: ["Fomorian Hold", "Ancient Hold"],
      base: {
        id: "celtic_fomorian_giant",
        name: "Fomorian Giant",
        plural: "Fomorian Giants",
        stats: s2(25, 22, 260, [42, 52], 7, 0, 2),
        cost: { gold: 3e3, crystal: 1 },
        abilities: ["unyielding", "charge_guard"],
        summary: "Sea-giants of the old enemy race; nothing frightens them and no charge moves them.",
        portraitAlt: "A towering giant with barnacled skin, a single great eye and a driftwood club."
      },
      upgraded: {
        id: "celtic_ancient_fomorian",
        name: "Ancient Fomorian",
        plural: "Ancient Fomorians",
        stats: s2(28, 24, 312, [48, 58], 8, 0, 2),
        cost: { gold: 4500, crystal: 2 },
        abilities: ["unyielding", "charge_guard", "retaliation_2"],
        summary: "The oldest Fomorians, who swat two attackers in a round.",
        portraitAlt: "An ancient sea-giant crowned with coral, a whale-jaw club over one shoulder."
      },
      lore: {
        sourceNote: "The Fomorians (Fom\xF3ire) are a hostile supernatural race of Irish myth, enemies of the Tuatha D\xE9 Danann in the Lebor Gab\xE1la \xC9renn and the Cath Maige Tuired; Balor of the Evil Eye was their leader.",
        sourceRefs: ["Lebor Gab\xE1la \xC9renn; Cath Maige Tuired \u2014 to be verified"],
        gameLore: "The Fomorians lost their war with the gods and went back to the sea. Some of them came back out when the fort offered them a hill of their own.",
        upgradeLore: "The Ancient Fomorians remember the war. They fight as if it never ended."
      }
    }
  ],
  patron: { name: "Dagda", domain: "Abundance & Prosperity", quote: "The cauldron is never empty for those who share it." },
  minors: [
    { name: "Morrigan", domain: "War & Prophecy", mirrors: "attack", quote: "I have seen how this battle ends. Hurry." },
    { name: "Brigid", domain: "Hearth & Healing", mirrors: "defense", quote: "Keep the fire lit and the door will hold." }
  ],
  extraFirstMinors: [
    { name: "Nuada", domain: "Kingship & Justice", quote: "A king stands in front. Stand with me.", blessing: blessing(BLESSINGS.morale(1), BLESSINGS.creatures("defense", 1, { minTier: 4, label: "Your tier 4\u20137 creatures" })) },
    { name: "Danu", domain: "Ancestry & the Land", quote: "The land remembers every child it fed.", blessing: blessing(BLESSINGS.attribute("power", 1), BLESSINGS.growth(1, 2)) }
  ],
  secondMinors: [
    { name: "Cernunnos", domain: "Wilds & Transformation", quote: "The small ones of the wood are fiercer than they look.", blessing: blessing(BLESSINGS.creatures("attack", 1, { maxTier: 3, label: "Your tier 1\u20133 creatures" }), BLESSINGS.creatures("defense", 1, { maxTier: 3, label: "Your tier 1\u20133 creatures" })) },
    { name: "Epona", domain: "Horses & Journeys", quote: "Saddle up. The long road is shorter with me.", blessing: blessing(BLESSINGS.movement(20)) },
    { name: "Lugh", domain: "Light & Skill", quote: "Master one craft and I will teach you the rest.", blessing: blessing(BLESSINGS.luck(1), BLESSINGS.morale(1)) },
    { name: "Arawn", domain: "Underworld & the Otherworld", quote: "My hounds bring back what the field takes.", blessing: blessing(BLESSINGS.recovery(15), BLESSINGS.luck(1)) },
    { name: "Manannan", domain: "Seas & Mists", quote: "Step into the mist; step out where you meant to be.", blessing: blessing(BLESSINGS.vision(2), BLESSINGS.movement(15)) }
  ],
  classes: [
    { id: "fian", name: "Fian", mirrors: "champion", summary: "A warrior of the wandering war-bands who leads the charge" },
    { id: "chieftain", name: "Chieftain", mirrors: "strategos", summary: "A clan leader whose presence holds the war-band together" },
    { id: "druid", name: "Druid", mirrors: "oracle", summary: "A keeper of lore and the old words that work as spells" }
  ],
  heroes: [
    { name: "Cu Chulainn", title: "Hound of Ulster", classId: "fian", biography: "Concept-board hero. A young champion whose battle-fury is legendary and whose speed is worse. Hireable in skirmish." },
    { name: "Fionn mac Cumhaill", title: "Leader of the Fianna", classId: "chieftain", biography: "Concept-board hero. He tasted the salmon of knowledge once and has been hard to surprise ever since. Hireable in skirmish." },
    { name: "Scathach", title: "Warrior Teacher", classId: "fian", biography: "Concept-board hero. She trained the best warriors of her age on an island of shadow and still takes students. Hireable in skirmish." },
    { name: "Deirdre", title: "Sorrow & Resolve", classId: "druid", biography: "Concept-board hero. Foretold at her birth to bring sorrow, she learned the old words to answer the prophecy. Hireable in skirmish." },
    { name: "Boudicca", title: "Rebel Queen", classId: "chieftain", biography: "Concept-board hero. A queen who raised a whole country behind her chariot. Hireable in skirmish." },
    { name: "Medb", title: "Queen of Connacht", classId: "chieftain", proposed: true, biography: "Proposed hero. She went to war over a bull so that her wealth would equal her husband\u2019s, and her treasury has never stopped growing. Hireable in skirmish." },
    { name: "Amergin", title: "Poet of the Landing", classId: "druid", proposed: true, biography: "Proposed hero. The bard who sang the land into accepting his people as they stepped ashore. When he chants, the hunt of the Otherworld rides. Hireable in skirmish." },
    { name: "Fergus mac Roich", title: "Exiled King of Ulster", classId: "fian", proposed: true, biography: "Proposed hero. A giant of a man who lost his throne by a trick and fought the war that followed on the other side. The keening women follow his host. Hireable in skirmish." }
  ]
};

// ../pantheon_realms/packages/content/src/mesoamerican/pantheon.ts
var MESOAMERICAN_SPEC = {
  id: "mesoamerican",
  name: "Mesoamerican",
  epithet: "Ritual & Sacrifice",
  summary: "Feathered serpents, jaguar spirits, eagle warriors and fire serpents of the temple cities. Playable in skirmish with proposed, unplaytested values.",
  accent: "#d9772f",
  accentSoft: "#4d2a12",
  town: {
    archetypeId: "mesoamerican_city",
    // Mountains at the top right; the sun disc crowns the top centre.
    hudAnchor: "right",
    name: "Mesoamerican Temple City",
    names: {
      civic_hall: ["Calpulli House", "Tecpan", "Great Palace", "Palace of the Sun"],
      tavern: ["Traveller's House"],
      marketplace: ["Tianguis Market"],
      resource_depot: ["Storehouse"],
      workshop: ["Workshop"],
      mage_guild: ["House of the Codex I", "House of the Codex II", "House of the Codex III"],
      pantheon_temple: ["Temple Pyramid", "Great Pyramid"],
      fortifications: ["Stone Walls", "Fortified Precinct", "Great Precinct"],
      training_academy: ["Warrior House"],
      watchtower: ["Observatory"],
      artifact_merchant: ["Jade Merchant"]
    },
    labels: {
      tavern: "Traveller\u2019s House / Heroes\u2019 Lodge",
      marketplace: "Tianguis Market",
      resource_depot: "Storehouse",
      workshop: "Workshop",
      mage_guild: "House of the Codex",
      pantheon_temple: "Pantheon Temple (Pyramid)"
    },
    placements: {
      civic_hall: { x: 51, y: 59, width: 17, layer: 6 },
      pantheon_temple: { x: 50, y: 33.5, width: 12, layer: 2 },
      mage_guild: { x: 91, y: 24, width: 10, layer: 1 },
      watchtower: { x: 12, y: 21, width: 8, layer: 1 },
      artifact_merchant: { x: 86, y: 42, width: 11, layer: 3 },
      tavern: { x: 28, y: 51, width: 12, layer: 4 },
      marketplace: { x: 72, y: 51, width: 13, layer: 4 },
      training_academy: { x: 86, y: 61, width: 12, layer: 5 },
      workshop: { x: 15, y: 41, width: 12, layer: 3 },
      resource_depot: { x: 24, y: 31, width: 11, layer: 2 },
      fortifications: { x: 51, y: 99, width: 20, layer: 9 },
      dwelling_t1: { x: 78, y: 32, width: 11, layer: 2 },
      dwelling_t2: { x: 15, y: 61, width: 12, layer: 5 },
      dwelling_t3: { x: 19, y: 83, width: 13, layer: 8 },
      dwelling_t4: { x: 82, y: 84, width: 13, layer: 8 },
      dwelling_t5: { x: 51, y: 82, width: 14, layer: 8 },
      dwelling_t6: { x: 31, y: 73, width: 10, layer: 7 },
      dwelling_t7: { x: 70, y: 73, width: 11, layer: 7 }
    }
  },
  families: [
    {
      familyId: "mesoamerican_feathered_serpent",
      name: "Feathered Serpents",
      tier: 1,
      growth: 14,
      role: "line_infantry",
      roleLabel: "Serpent swarm",
      body: "serpent",
      dwellingNames: ["Serpent Nest", "Celestial Nest"],
      base: {
        id: "mesoamerican_feathered_serpent",
        name: "Feathered Serpent",
        plural: "Feathered Serpents",
        stats: s2(5, 4, 10, [1, 3], 5, 0, 1),
        cost: { gold: 60 },
        abilities: [],
        summary: "Small plumed serpents that coil around the temple steps and strike quickly.",
        portraitAlt: "A green serpent with a ruff of quetzal feathers around its head."
      },
      upgraded: {
        id: "mesoamerican_celestial_feathered_serpent",
        name: "Celestial Feathered Serpent",
        plural: "Celestial Feathered Serpents",
        stats: s2(6, 5, 12, [2, 3], 7, 0, 1),
        cost: { gold: 80 },
        abilities: ["flight"],
        summary: "Serpents whose plumes have grown into wings; they cross the field in a single glide.",
        portraitAlt: "A turquoise serpent with long feathered wings spread against a gold sky."
      },
      lore: {
        sourceNote: "The feathered serpent is a deity and motif found across Mesoamerica \u2014 Quetzalcoatl among the Nahua, Kukulkan among the Maya \u2014 shown on temples such as Teotihuacan\u2019s Temple of the Feathered Serpent.",
        sourceRefs: ["Temple of the Feathered Serpent, Teotihuacan; Chichen Itza \u2014 to be verified"],
        gameLore: "The serpents nest in the temple eaves. The priests count them at each new moon and plan the year by the number.",
        upgradeLore: "Celestial serpents are the ones that learned to fly. The priests say they are practising to become something larger."
      }
    },
    {
      familyId: "mesoamerican_jaguar_spirit",
      name: "Jaguar Spirits",
      tier: 2,
      growth: 9,
      role: "fast_melee",
      roleLabel: "Pouncing predator",
      body: "beast",
      dwellingNames: ["Jaguar Prowl", "Sun Jaguar Temple"],
      base: {
        id: "mesoamerican_jaguar_spirit",
        name: "Jaguar Spirit",
        plural: "Jaguar Spirits",
        stats: s2(7, 3, 11, [2, 4], 7, 0, 1),
        cost: { gold: 110 },
        abilities: ["charge"],
        summary: "Spotted spirit-cats that pounce from a distance and hit hard.",
        portraitAlt: "A black-spotted golden jaguar with jade eyes, crouched to spring."
      },
      upgraded: {
        id: "mesoamerican_sun_jaguar",
        name: "Sun Jaguar",
        plural: "Sun Jaguars",
        stats: s2(8, 4, 13, [3, 4], 8, 0, 1),
        cost: { gold: 150 },
        abilities: ["charge", "retaliation_2"],
        summary: "Jaguars that hunt by day, gold-furred and quick to turn on two attackers.",
        portraitAlt: "A bright-gold jaguar with a sun-disc pattern across its shoulders."
      },
      lore: {
        sourceNote: "The jaguar was a symbol of power, night and rulership across Mesoamerica; Aztec jaguar warriors (ocelomeh) were an elite military order.",
        sourceRefs: ["Florentine Codex; Maya royal iconography \u2014 to be verified"],
        gameLore: "The jaguars of the prowl choose their own warriors. The warriors wear the spotted skin afterwards, and the jaguars seem to find that funny.",
        upgradeLore: "Sun Jaguars hunt when the others sleep. They do not need the dark to be unseen."
      }
    },
    {
      familyId: "mesoamerican_eagle_warrior_spirit",
      name: "Eagle Warrior Spirits",
      tier: 3,
      growth: 7,
      role: "skirmisher",
      roleLabel: "Dart thrower",
      body: "humanoid_thrower",
      dwellingNames: ["Eagle Aerie", "Solar Eagle House"],
      base: {
        id: "mesoamerican_eagle_warrior_spirit",
        name: "Eagle Warrior Spirit",
        plural: "Eagle Warrior Spirits",
        stats: s2(9, 8, 28, [3, 6], 7, 8, 1, 14),
        cost: { gold: 250 },
        abilities: ["shooter"],
        summary: "Spirit warriors in eagle helms who hurl atlatl darts from the back line.",
        portraitAlt: "A warrior in a feathered eagle-head helmet holding an atlatl and darts."
      },
      upgraded: {
        id: "mesoamerican_solar_eagle_warrior",
        name: "Solar Eagle Warrior",
        plural: "Solar Eagle Warriors",
        stats: s2(10, 9, 34, [4, 6], 8, 12, 1, 15),
        cost: { gold: 310 },
        abilities: ["shooter"],
        summary: "Eagle warriors of the sun\u2019s house, with more darts and longer arms.",
        portraitAlt: "An eagle warrior in golden feathers with a sun-ray shield and a bundle of darts."
      },
      lore: {
        sourceNote: "Eagle warriors (cuauhtli) were, with the jaguar warriors, one of the elite military orders of the Aztec state, associated with the sun.",
        sourceRefs: ["House of the Eagles, Templo Mayor; Florentine Codex \u2014 to be verified"],
        gameLore: "An eagle warrior who dies facing the sun is said to fly with it for four years. The spirits in the aerie are the ones who came back early to help.",
        upgradeLore: "Solar Eagle Warriors finished their four years and chose to return anyway."
      }
    },
    {
      familyId: "mesoamerican_cenote_crocodile",
      name: "Cenote Crocodiles",
      tier: 4,
      growth: 4,
      role: "heavy_melee",
      roleLabel: "Temple guardian",
      body: "beast",
      dwellingNames: ["Cenote Pool", "Temple Cenote"],
      base: {
        id: "mesoamerican_cenote_crocodile",
        name: "Cenote Crocodile",
        plural: "Cenote Crocodiles",
        stats: s2(10, 12, 42, [6, 8], 5, 0, 2),
        cost: { gold: 350 },
        abilities: ["charge_guard"],
        summary: "Armored crocodiles from the sacred sinkholes that brace against any charge.",
        portraitAlt: "A dark crocodile with jade-green scutes emerging from still blue water."
      },
      upgraded: {
        id: "mesoamerican_temple_crocodile",
        name: "Temple Crocodile",
        plural: "Temple Crocodiles",
        stats: s2(12, 14, 44, [7, 9], 6, 0, 2),
        cost: { gold: 450 },
        abilities: ["charge_guard", "retaliation_2"],
        summary: "Crocodiles raised in the temple cenote, answering two attackers each round.",
        portraitAlt: "A great crocodile with carved jade plates bound to its back."
      },
      lore: {
        sourceNote: "Cenotes are natural sinkholes of the Yucat\xE1n, some of them sacred (e.g. the Sacred Cenote at Chichen Itza); in Maya myth the earth itself was sometimes pictured as a great crocodile.",
        sourceRefs: ["Sacred Cenote, Chichen Itza; Maya cosmology studies \u2014 to be verified"],
        gameLore: "The cenote under the city goes down to the underworld, and something down there keeps the water clean. The priests feed it so it will keep doing so.",
        upgradeLore: "A Temple Crocodile has lived in the temple pool since before the temple. It thinks of the priests as its keepers, not the other way round."
      }
    },
    {
      familyId: "mesoamerican_camazotz",
      name: "Camazotz",
      tier: 5,
      growth: 3,
      role: "flying_interceptor",
      roleLabel: "Bat raider",
      body: "winged_humanoid",
      dwellingNames: ["Bat Cave", "Blood Moon Cave"],
      base: {
        id: "mesoamerican_camazotz",
        name: "Camazotz",
        plural: "Camazotz",
        stats: s2(12, 9, 36, [9, 12], 8, 0, 1),
        cost: { gold: 400 },
        abilities: ["flight"],
        summary: "Bat-winged cave spirits that dive on the enemy from anywhere on the field.",
        portraitAlt: "A tall bat-headed figure with leathery wings and an obsidian blade."
      },
      upgraded: {
        id: "mesoamerican_blood_moon_camazotz",
        name: "Blood Moon Camazotz",
        plural: "Blood Moon Camazotz",
        stats: s2(14, 11, 41, [10, 13], 9, 0, 1),
        cost: { gold: 500 },
        abilities: ["flight", "retaliation_2"],
        summary: "Camazotz of the blood moon, who strike back at two attackers each round.",
        portraitAlt: "A crimson-winged bat spirit silhouetted against a red moon."
      },
      lore: {
        sourceNote: 'Camazotz ("death bat") appears in the K\u2019iche\u2019 Maya Popol Vuh, where the Hero Twins must survive the House of Bats in Xibalba.',
        sourceRefs: ["Popol Vuh \u2014 to be verified"],
        gameLore: "The bat cave is the one place in the city where no lamp is ever lit. The Camazotz like it that way, and they guard the city at night in return.",
        upgradeLore: "On a blood moon the Camazotz fly higher and come back later. The city stays indoors."
      }
    },
    {
      familyId: "mesoamerican_xiuhcoatl",
      name: "Xiuhcoatl",
      tier: 6,
      growth: 2,
      role: "ranged_support",
      roleLabel: "Fire serpent (ranged)",
      body: "serpent",
      dwellingNames: ["Fire Serpent Sanctum", "Divine Sanctum"],
      base: {
        id: "mesoamerican_xiuhcoatl",
        name: "Xiuhcoatl",
        plural: "Xiuhcoatl",
        stats: s2(14, 12, 84, [14, 20], 7, 6, 2, 16),
        cost: { gold: 1e3 },
        abilities: ["shooter", "no_melee_penalty"],
        summary: "Turquoise fire serpents that spit flame across the field and bite just as hard.",
        portraitAlt: "A turquoise serpent with a flaming, segmented tail and a snout curling upward."
      },
      upgraded: {
        id: "mesoamerican_divine_xiuhcoatl",
        name: "Divine Xiuhcoatl",
        plural: "Divine Xiuhcoatl",
        stats: s2(16, 14, 98, [16, 22], 8, 8, 2, 17),
        cost: { gold: 1250 },
        abilities: ["shooter", "no_melee_penalty"],
        summary: "Fire serpents of the sun\u2019s own weapon; more flame and a hotter bite.",
        portraitAlt: "A blazing blue-and-gold serpent wreathed in a corona of fire."
      },
      lore: {
        sourceNote: 'Xiuhcoatl, the "turquoise" or "fire serpent", was the weapon of Huitzilopochtli in Aztec myth and a common motif on the Sun Stone.',
        sourceRefs: ["Aztec Calendar Stone; Florentine Codex \u2014 to be verified"],
        gameLore: "The fire serpents sleep coiled around the new-fire altar. When the city lights its fires every fifty-two years, the serpents are the first to wake.",
        upgradeLore: "A Divine Xiuhcoatl has been thrown by a god. It remembers the arc, and it still enjoys it."
      }
    },
    {
      familyId: "mesoamerican_stone_colossus",
      name: "Stone Colossi",
      tier: 7,
      growth: 1,
      role: "apex_melee",
      roleLabel: "Apex guardian",
      body: "construct",
      dwellingNames: ["Colossus Quarry", "Sun Colossus Altar"],
      base: {
        id: "mesoamerican_stone_colossus",
        name: "Stone Colossus",
        plural: "Stone Colossi",
        stats: s2(23, 25, 255, [40, 50], 6, 0, 2),
        cost: { gold: 3e3, crystal: 1 },
        abilities: ["unyielding", "charge_guard"],
        summary: "Temple-guardian statues of basalt that nothing frightens and nothing moves.",
        portraitAlt: "A towering basalt warrior statue with a feathered headdress and a stone shield."
      },
      upgraded: {
        id: "mesoamerican_sun_colossus",
        name: "Sun Colossus",
        plural: "Sun Colossi",
        stats: s2(26, 28, 298, [46, 56], 7, 0, 2),
        cost: { gold: 4500, crystal: 2 },
        abilities: ["unyielding", "charge_guard", "retaliation_unlimited"],
        summary: "Colossi lit from within by the sun; they answer every blow.",
        portraitAlt: "A colossal statue with glowing gold glyphs and a sun-disc on its chest."
      },
      lore: {
        sourceNote: "Monumental stone warrior columns such as the Atlantes of Tula (Toltec) stood atop temple platforms; Olmec colossal heads are older examples of monumental sculpture.",
        sourceRefs: ["Atlantes of Tula; Olmec colossal heads \u2014 to be verified"],
        gameLore: "The colossi stood on the pyramid roof holding it up. When the city needed them, the priests built new columns first.",
        upgradeLore: "A Sun Colossus has the day\u2019s light sealed inside it. It is warm to the touch, even at midnight."
      }
    }
  ],
  patron: { name: "Quetzalcoatl", domain: "Wind & Wisdom", quote: "The wind goes before the rain; wisdom goes before the harvest." },
  minors: [
    { name: "Huitzilopochtli", domain: "War & Power", mirrors: "attack", quote: "The sun must fight to rise. So must you." },
    { name: "Coatlicue", domain: "Earth & Creation", mirrors: "defense", quote: "The earth holds everything, and lets nothing fall." }
  ],
  extraFirstMinors: [
    { name: "Mixcoatl", domain: "Hunt & Survival", quote: "Follow the deer; the deer knows the way.", blessing: blessing(BLESSINGS.creatures("attack", 2, { ability: "shooter", label: "Your shooters" }), BLESSINGS.vision(1)) },
    { name: "Xolotl", domain: "Journey & Underworld Guidance", quote: "I have walked every road below. This one is short.", blessing: blessing(BLESSINGS.attribute("knowledge", 1), BLESSINGS.movement(10)) }
  ],
  secondMinors: [
    { name: "Tlaloc", domain: "Rain & Fertility", quote: "The rain comes to those who remember it.", blessing: blessing(BLESSINGS.growth(2, 3)) },
    { name: "Tezcatlipoca", domain: "Shadow & Fate", quote: "Look in the smoking mirror. See who wins.", blessing: blessing(BLESSINGS.luck(2)) },
    { name: "Xiuhtecuhtli", domain: "Fire & Renewal", quote: "Feed the new fire, and it gives back more.", blessing: blessing(BLESSINGS.offering(100, 15)) },
    { name: "Chalchiuhtlicue", domain: "Waters & Healing", quote: "The river washes the wound and fills the field.", blessing: blessing(BLESSINGS.recovery(10), BLESSINGS.growth(1, 4)) },
    { name: "Mictlantecuhtli", domain: "Death & Transformation", quote: "The nearer to me, the harder they fight.", blessing: blessing(BLESSINGS.fury(2), BLESSINGS.luck(1)) }
  ],
  classes: [
    { id: "jaguar_knight", name: "Jaguar Knight", mirrors: "champion", summary: "An elite warrior of the jaguar order who leads from the front" },
    { id: "tlatoani", name: "Tlatoani", mirrors: "strategos", summary: 'A city ruler \u2014 "the one who speaks" \u2014 who keeps the host in order' },
    { id: "day_keeper", name: "Day Keeper", mirrors: "oracle", summary: "A calendar priest who reads the days and casts spells in battle" }
  ],
  heroes: [
    { name: "Hunahpu", title: "Trickster & Resilience", classId: "jaguar_knight", biography: "Concept-board hero. One of the Hero Twins who outplayed the lords of the underworld at their own game. Hireable in skirmish." },
    { name: "Xbalanque", title: "Skill & Opportunity", classId: "jaguar_knight", biography: "Concept-board hero. The other Hero Twin, patient and exact, who finishes what his brother starts. Hireable in skirmish." },
    { name: "Nezahualcoyotl", title: "Poet King & Harmony", classId: "tlatoani", biography: "Concept-board hero. A ruler, engineer and poet whose aqueducts and verses both outlived him. Hireable in skirmish." },
    { name: "Topiltzin Quetzalcoatl", title: "Reform & Enlightenment", classId: "day_keeper", biography: "Concept-board hero. A priest-king who took the feathered serpent\u2019s name and its teachings with it. Hireable in skirmish." },
    { name: "Eight Deer Jaguar Claw", title: "Tactics & Divine Right", classId: "tlatoani", biography: "Concept-board hero. A Mixtec lord whose campaigns fill whole painted books. Hireable in skirmish." },
    { name: "Moctezuma Ilhuicamina", title: "Archer of the Sky", classId: "tlatoani", proposed: true, biography: "Proposed hero. A ruler who built dikes across the lake and stone causeways into his city. Quarries work day and night under his stewards. Hireable in skirmish." },
    { name: "Lady Six Sky", title: "Warrior Queen of Naranjo", classId: "jaguar_knight", proposed: true, biography: "Proposed hero. She came to a broken city as a bride and ruled it as a conqueror, carved on its monuments standing on a captive. The beasts of the cenotes answer her. Hireable in skirmish." },
    { name: "Chilam Balam", title: "Jaguar Prophet", classId: "day_keeper", proposed: true, biography: "Proposed hero. The jaguar-priest whose prophecies were copied for centuries. He reads the count of days and calls down black glass from the sky. Hireable in skirmish." }
  ]
};

// ../pantheon_realms/packages/content/src/norse/creatures.ts
var NORSE_FAMILY_SPECS = [
  {
    familyId: "norse_draugr",
    name: "Draugar",
    pantheonId: "norse",
    tier: 1,
    growth: 14,
    role: "line_infantry",
    roleLabel: "Line infantry",
    body: "spirit",
    dwelling: "norse_barrow",
    dwellingUp: "norse_barrow_up",
    base: {
      id: "norse_draugr",
      name: "Draugr",
      plural: "Draugar",
      stats: s2(5, 4, 11, [1, 3], 4, 0, 1),
      cost: { gold: 60 },
      abilities: [],
      summary: "Barrow-risen warriors in rusted mail who hold the front line without complaint.",
      portraitAlt: "A gaunt warrior in corroded mail and a frost-rimed helmet, holding an axe and round shield."
    },
    upgraded: {
      id: "norse_deathless_draugr",
      name: "Deathless Draugr",
      plural: "Deathless Draugar",
      stats: s2(6, 5, 12, [2, 3], 5, 0, 1),
      cost: { gold: 80 },
      abilities: ["unyielding"],
      summary: "Older dead bound by a sworn oath; their resolve never wavers.",
      portraitAlt: "A draugr with rune-etched armor plates, glowing blue eyes and a notched longaxe."
    }
  },
  {
    familyId: "norse_frost_wolf",
    name: "Frost Wolves",
    pantheonId: "norse",
    tier: 2,
    growth: 9,
    role: "fast_melee",
    roleLabel: "Fast flanker",
    body: "beast",
    dwelling: "norse_wolf_den",
    dwellingUp: "norse_wolf_den_up",
    base: {
      id: "norse_frost_wolf",
      name: "Frost Wolf",
      plural: "Frost Wolves",
      stats: s2(6, 4, 11, [2, 3], 7, 0, 1),
      cost: { gold: 110 },
      abilities: ["charge"],
      summary: "Pale wolves that cross open snow fast and strike harder the farther they run.",
      portraitAlt: "A large white-grey wolf with frost on its muzzle and pale blue eyes."
    },
    upgraded: {
      id: "norse_fenrir_wolf",
      name: "Fenrir Wolf",
      plural: "Fenrir Wolves",
      stats: s2(8, 4, 13, [3, 4], 8, 0, 1),
      cost: { gold: 150 },
      abilities: ["charge"],
      summary: "Named for the bound wolf of legend; bigger, faster and harder to turn aside.",
      portraitAlt: "A massive dark-grey wolf with a broken chain collar and a scarred muzzle."
    }
  },
  {
    familyId: "norse_frost_troll",
    name: "Frost Trolls",
    pantheonId: "norse",
    tier: 3,
    growth: 6,
    role: "heavy_melee",
    roleLabel: "Bruiser",
    body: "giant",
    dwelling: "norse_troll_cave",
    dwellingUp: "norse_troll_cave_up",
    base: {
      id: "norse_frost_troll",
      name: "Frost Troll",
      plural: "Frost Trolls",
      stats: s2(9, 8, 27, [3, 5], 5, 0, 2),
      cost: { gold: 250 },
      abilities: ["charge_guard"],
      summary: "Slow, thick-hided brutes that shrug off charges and soak up punishment.",
      portraitAlt: "A hulking blue-grey troll with icicles in its beard and a stone club."
    },
    upgraded: {
      id: "norse_ancient_frost_troll",
      name: "Ancient Frost Troll",
      plural: "Ancient Frost Trolls",
      stats: s2(9, 10, 31, [4, 6], 6, 0, 2),
      cost: { gold: 310 },
      abilities: ["charge_guard"],
      summary: "Trolls old enough to have moss turned to ice on their shoulders.",
      portraitAlt: "A towering troll with a crust of blue ice across its back and a boulder-headed club."
    }
  },
  {
    familyId: "norse_valkyrie",
    name: "Valkyries",
    pantheonId: "norse",
    tier: 4,
    growth: 4,
    role: "flying_interceptor",
    roleLabel: "Flying lancer",
    body: "winged_humanoid",
    dwelling: "norse_valkyrie_aerie",
    dwellingUp: "norse_valkyrie_aerie_up",
    base: {
      id: "norse_valkyrie",
      name: "Valkyrie",
      plural: "Valkyries",
      stats: s2(11, 10, 38, [7, 9], 8, 0, 1),
      cost: { gold: 370 },
      abilities: ["flight"],
      summary: "Winged shieldmaidens who choose where the battle breaks and land there.",
      portraitAlt: "A winged warrior woman in a silver helm with a spear and round shield."
    },
    upgraded: {
      id: "norse_battle_valkyrie",
      name: "Battle Valkyrie",
      plural: "Battle Valkyries",
      stats: s2(13, 12, 43, [8, 10], 9, 0, 1),
      cost: { gold: 470 },
      abilities: ["flight", "retaliation_2"],
      summary: "Veteran choosers of the slain who answer two attacks each round.",
      portraitAlt: "A valkyrie in blue-enamelled scale armor with broad white wings and a long spear."
    }
  },
  {
    familyId: "norse_lindworm",
    name: "Lindworms",
    pantheonId: "norse",
    tier: 5,
    growth: 3,
    role: "ranged_support",
    roleLabel: "Ranged breath",
    body: "serpent",
    dwelling: "norse_lindworm_roost",
    dwellingUp: "norse_lindworm_roost_up",
    base: {
      id: "norse_lindworm",
      name: "Lindworm",
      plural: "Lindworms",
      stats: s2(11, 9, 34, [8, 11], 5, 10, 2, 16),
      cost: { gold: 420 },
      abilities: ["shooter"],
      summary: "Two-legged wyrms that spit freezing breath from the back line.",
      portraitAlt: "A long wingless serpent-dragon with two clawed forelegs and frost on its scales."
    },
    upgraded: {
      id: "norse_storm_lindworm",
      name: "Storm Lindworm",
      plural: "Storm Lindworms",
      stats: s2(12, 10, 37, [9, 12], 6, 14, 2, 17),
      cost: { gold: 520 },
      abilities: ["shooter", "no_melee_penalty"],
      summary: "Storm-coloured lindworms that bite as hard as they breathe.",
      portraitAlt: "A slate-blue lindworm with crackling pale markings and a raised crest."
    }
  },
  {
    familyId: "norse_jotunn",
    name: "Jotnar",
    pantheonId: "norse",
    tier: 6,
    growth: 2,
    role: "heavy_melee",
    roleLabel: "Giant warrior",
    body: "giant",
    dwelling: "norse_jotunn_camp",
    dwellingUp: "norse_jotunn_camp_up",
    base: {
      id: "norse_jotunn",
      name: "Jotunn",
      plural: "Jotnar",
      stats: s2(16, 13, 96, [16, 22], 5, 0, 2),
      cost: { gold: 1e3 },
      abilities: ["retaliation_2"],
      summary: "Frost giants whose reach lets them answer two attackers every round.",
      portraitAlt: "A towering giant in furs and iron bands with a frost-covered greataxe."
    },
    upgraded: {
      id: "norse_runic_jotunn",
      name: "Runic Jotunn",
      plural: "Runic Jotnar",
      stats: s2(18, 15, 110, [18, 25], 6, 0, 2),
      cost: { gold: 1250 },
      abilities: ["retaliation_2", "family_ward"],
      summary: "Giants carved with protective runes who can ward one ally per battle.",
      portraitAlt: "A giant with glowing blue runes cut into stone bracers and a rune-marked hammer."
    }
  },
  {
    familyId: "norse_nidhogg_wyrm",
    name: "Nidhogg Wyrms",
    pantheonId: "norse",
    tier: 7,
    growth: 1,
    role: "apex_melee",
    roleLabel: "Apex wyrm",
    body: "serpent",
    dwelling: "norse_serpent_lair",
    dwellingUp: "norse_serpent_lair_up",
    base: {
      id: "norse_nidhogg_wyrm",
      name: "Nidhogg Wyrm",
      plural: "Nidhogg Wyrms",
      stats: s2(25, 22, 258, [41, 52], 7, 0, 2),
      cost: { gold: 3e3, crystal: 1 },
      abilities: ["unyielding", "retaliation_unlimited"],
      summary: "Root-gnawing wyrms that answer every blow and never lose their nerve.",
      portraitAlt: "A huge dark serpent-dragon coiled around ice-covered roots, jaws open."
    },
    upgraded: {
      id: "norse_world_serpent_wyrm",
      name: "World-Serpent Wyrm",
      plural: "World-Serpent Wyrms",
      stats: s2(28, 24, 308, [47, 58], 8, 0, 2),
      cost: { gold: 4500, crystal: 2 },
      abilities: ["unyielding", "retaliation_unlimited", "charge_guard"],
      summary: "Sea-green wyrms of the world-coil; no charge moves them.",
      portraitAlt: "A vast sea-green serpent with barnacled scales and glowing rune-like markings."
    }
  }
];
var NORSE_PROVENANCE = {
  source: "proposed-this-build",
  note: "Names from the owner Norse board; all numbers proposed on the Greek design/06 curve (unplaytested)."
};
function buildNorseFamilies() {
  return buildFamilies(NORSE_FAMILY_SPECS, NORSE_PROVENANCE);
}

// ../pantheon_realms/packages/content/src/norse/lore.ts
var entry = (id, sourceNote, sourceRefs, gameLore, upgradeLore) => ({
  id,
  sourceNote,
  sourceRefs,
  sourceStatus: "draft_requires_review",
  gameLore,
  upgradeLore
});
var NORSE_LORE = [
  entry(
    "lore.norse_draugr",
    "The draugr is the restless dead of Old Norse saga literature, a corpse that keeps to its burial mound and is dangerous to the living. Accounts differ from saga to saga.",
    ["Icelandic family sagas (e.g. Grettis saga) \u2014 to be verified"],
    "The barrows above Frosthold were raised for warriors who died owing a debt. Some of them still stand guard over it. The living leave mead at the mound doors and do not ask what drinks it.",
    "The Deathless keep an oath older than the hold itself; nothing on a battlefield is frightening enough to break it."
  ),
  entry(
    "lore.norse_frost_wolf",
    "Wolves are prominent in Norse myth; the great wolf Fenrir, bound by the gods, is described in the Prose Edda. Our frost wolves are an original adaptation.",
    ["Snorri Sturluson, Prose Edda (Gylfaginning) \u2014 to be verified"],
    "The wolves of the white valleys run beside the hold\u2019s riders rather than under them. They are paid in the first share of every hunt, and they remember who pays.",
    "Fenrir Wolves wear a broken link of chain as a collar. Nobody in the hold remembers who first put it there."
  ),
  entry(
    "lore.norse_frost_troll",
    "Trolls appear widely in Scandinavian folklore as large, dangerous beings of the mountains and wilds; the frost variety here is our invention.",
    ["Scandinavian folklore collections \u2014 to be verified"],
    "Frost trolls sleep through summer in caves that never thaw. The hold wakes them in autumn with drums and fresh meat, and sends them home before the thaw.",
    "The ancient trolls have ice grown into their skin like armor, and they are slower to anger and far slower to stop."
  ),
  entry(
    "lore.norse_valkyrie",
    'Valkyries \u2014 "choosers of the slain" \u2014 appear in Eddic and skaldic poetry as figures who decide who falls in battle and bring the chosen to Valhalla.',
    ["Poetic Edda; Prose Edda \u2014 to be verified"],
    "The hold\u2019s valkyries are not goddesses; they are the women who survived the choosing and came back with wings. They fight where the line is about to break.",
    "Battle Valkyries have chosen before. They turn to meet a second attacker without looking."
  ),
  entry(
    "lore.norse_lindworm",
    "The lindworm is a serpentine dragon of Scandinavian and wider Germanic folklore; the Sigurd legend (F\xE1fnir) is carved on the Ramsund rock in Sweden.",
    ["Ramsund carving; V\xF6lsunga saga \u2014 to be verified"],
    "Lindworms nest on the sea-cliffs where the spray freezes. A lindworm that has been fed from a hand will breathe frost for that hand, and for no one else.",
    "Storm Lindworms are the ones that survived lightning; they bite as readily as they breathe."
  ),
  entry(
    "lore.norse_jotunn",
    "The j\xF6tnar are the giants of Norse myth, frequently in conflict with the gods yet also kin to them; they are named throughout the Eddas.",
    ["Poetic Edda; Prose Edda \u2014 to be verified"],
    "A jotunn does not serve the hold. It keeps an agreement with it, renewed each winter by a gift the giants choose. This year it was a bell.",
    "Runic Jotnar cut protections into their own stone bracers and will lend one to an ally who asks politely."
  ),
  entry(
    "lore.norse_nidhogg_wyrm",
    "N\xED\xF0h\xF6ggr is the dragon that gnaws at the roots of the world-tree Yggdrasil in Eddic poetry; J\xF6rmungandr is the world-serpent. Our wyrms borrow both names.",
    ["V\xF6lusp\xE1; Gr\xEDmnism\xE1l \u2014 to be verified"],
    "Beneath the hold the roots of an old tree go down into warm dark water, and something down there gnaws. The priests call it a blessing that it has not yet finished.",
    "World-Serpent Wyrms are sea-green and barnacled. Nothing moves them that they do not wish to be moved by."
  )
];

// ../pantheon_realms/packages/content/src/norse/town.ts
var has2 = (buildingId) => ({ type: "has_building", buildingId });
var covenant2 = (familyId) => ({ type: "town_has_covenant", familyId });
var N = "norse";
var SUPPORT2 = [
  { id: "norse_longhouse", name: "Longhouse", slot: "civic_hall", level: 1, cost: {}, fx: [{ type: "daily_income", resource: "gold", amount: 500 }], summary: "Starting civic building. 500 Gold per day.", art: "town.norse.support.civic_hall.l1" },
  { id: "norse_jarls_hall", name: "Jarl\u2019s Hall", slot: "civic_hall", level: 2, cost: { gold: 2500 }, req: [has2("norse_mead_hall")], fx: [{ type: "daily_income", resource: "gold", amount: 1e3 }], summary: "1,000 Gold per day in total (replaces Longhouse income).", art: "town.norse.support.civic_hall.l2" },
  { id: "norse_high_hall", name: "High Hall", slot: "civic_hall", level: 3, cost: { gold: 5e3 }, req: [has2("norse_smithy"), has2("norse_trading_post"), has2("norse_rune_circle_1")], fx: [{ type: "daily_income", resource: "gold", amount: 2e3 }], summary: "2,000 Gold per day in total.", art: "town.norse.support.civic_hall.l3" },
  { id: "norse_hall_of_kings", name: "Hall of Kings", slot: "civic_hall", level: 4, cost: { gold: 1e4 }, req: [has2("norse_fortress"), { type: "unique_per_player", buildingId: "norse_hall_of_kings" }], fx: [{ type: "daily_income", resource: "gold", amount: 4e3 }], summary: "4,000 Gold per day in total. One per player.", art: "town.norse.support.civic_hall.l4" },
  { id: "norse_mead_hall", name: "Mead Hall", slot: "tavern", level: 1, cost: { gold: 500, wood: 5 }, req: [has2("norse_longhouse")], fx: [{ type: "enables_hero_hiring" }], summary: "Hire eligible heroes. Prerequisite for the Jarl\u2019s Hall.", art: "town.norse.support.tavern.l1" },
  { id: "norse_trading_post", name: "Trading Post", slot: "marketplace", level: 1, cost: { gold: 500, wood: 5 }, req: [has2("norse_longhouse")], fx: [{ type: "enables_market" }], summary: "Sell resources for Gold or buy them with Gold.", art: "town.norse.support.marketplace.l1" },
  { id: "norse_storehouse", name: "Storehouse", slot: "resource_depot", level: 1, cost: { gold: 5e3, stone: 5 }, req: [has2("norse_trading_post")], fx: [{ type: "daily_income", resource: "wood", amount: 1 }, { type: "daily_income", resource: "stone", amount: 1 }], summary: "+1 Wood and +1 Stone per day.", art: "town.norse.support.resource_depot.l1" },
  { id: "norse_smithy", name: "Workshop", slot: "workshop", level: 1, cost: { gold: 1e3, wood: 5 }, req: [has2("norse_longhouse")], fx: [{ type: "enables_workshop", stockSize: 4, rarities: ["treasure"] }], summary: "Military prerequisite (Valkyrie Aerie, High Hall). Sells four tier-1 items each week where the scenario has them; each one once a week.", art: "town.norse.support.workshop.l1" },
  { id: "norse_rune_circle_1", name: "Rune Circle I", slot: "mage_guild", level: 1, cost: { gold: 2e3, wood: 5, stone: 5 }, req: [has2("norse_longhouse")], fx: [{ type: "spell_library", maxTier: 1 }, { type: "enables_spellbook_purchase" }], summary: "Tier-1 spells; sells spellbooks (500 Gold).", art: "town.norse.support.mage_guild.l1" },
  { id: "norse_rune_circle_2", name: "Rune Circle II", slot: "mage_guild", level: 2, cost: { gold: 1e3, wood: 5, stone: 5, crystal: 4 }, fx: [{ type: "spell_library", maxTier: 2 }, { type: "enables_spellbook_purchase" }], summary: "Tier-2 spells.", art: "town.norse.support.mage_guild.l2" },
  { id: "norse_rune_circle_3", name: "Rune Circle III", slot: "mage_guild", level: 3, cost: { gold: 1e3, wood: 5, stone: 5, crystal: 6 }, fx: [{ type: "spell_library", maxTier: 3 }, { type: "enables_spellbook_purchase" }], summary: "Tier-3 spells (Wisdom required to learn).", art: "town.norse.support.mage_guild.l3" },
  { id: "norse_hof_1", name: "Hof I", slot: "pantheon_temple", level: 1, cost: { gold: 1e3, stone: 5 }, req: [has2("norse_longhouse")], fx: [{ type: "daily_income", resource: "favor", amount: 1 }], summary: "1 Favor per day.", art: "town.norse.support.pantheon_temple.l1" },
  { id: "norse_hof_2", name: "Hof II", slot: "pantheon_temple", level: 2, cost: { gold: 2e3, wood: 5, stone: 10, crystal: 3 }, req: [has2("norse_jarls_hall")], fx: [{ type: "daily_income", resource: "favor", amount: 2 }], summary: "2 Favor per day in total; enables a minor-god commitment.", art: "town.norse.support.pantheon_temple.l2" },
  { id: "norse_palisade", name: "Palisade", slot: "fortifications", level: 1, cost: { gold: 5e3, wood: 20, stone: 20 }, req: [has2("norse_longhouse")], fx: [{ type: "siege_fortification", level: 1 }], summary: "Perimeter walls and gate; military prerequisite.", art: "town.norse.support.fortifications.l1" },
  { id: "norse_stronghold", name: "Stronghold", slot: "fortifications", level: 2, cost: { gold: 2500, stone: 5 }, fx: [{ type: "growth_multiplier", numerator: 3, denominator: 2 }, { type: "siege_fortification", level: 2 }], summary: "1.5\xD7 base weekly growth; keep and moat.", art: "town.norse.support.fortifications.l2" },
  { id: "norse_fortress", name: "Fortress", slot: "fortifications", level: 3, cost: { gold: 5e3, wood: 10, stone: 10 }, fx: [{ type: "growth_multiplier", numerator: 2, denominator: 1 }, { type: "siege_fortification", level: 3 }], summary: "2\xD7 base weekly growth; stronger walls and towers.", art: "town.norse.support.fortifications.l3" },
  { id: "norse_training_ground", name: "Training Ground", slot: "training_academy", level: 1, cost: { gold: 2e3, wood: 5, stone: 5 }, req: [has2("norse_mead_hall"), has2("norse_barrow")], fx: [{ type: "enables_hero_training", xp: 500, gold: 1e3 }], summary: "Once per week, each visiting hero may train: 1,000 Gold for 500 experience.", proposed: true, art: "town.norse.support.training_academy.l1" },
  { id: "norse_watchtower", name: "Watchtower", slot: "watchtower", level: 1, cost: { gold: 1500, wood: 5, stone: 5 }, req: [has2("norse_palisade")], fx: [{ type: "town_vision_radius", radius: 8 }], summary: "The town sees 8 hexes around it (3 without a Watchtower).", proposed: true, art: "town.norse.support.watchtower.l1" },
  { id: "norse_rune_merchant", name: "Rune Merchant", slot: "artifact_merchant", level: 1, cost: { gold: 3e3, wood: 5, stone: 5, crystal: 2 }, req: [has2("norse_trading_post"), has2("norse_jarls_hall")], fx: [{ type: "enables_artifact_merchant", stockSize: 4 }], summary: "Sells four artifacts to visiting heroes; the stock changes every week.", proposed: true, art: "town.norse.support.artifact_merchant.l1" }
];
var dwell2 = (tier, familyId, base, up) => [base, up].map((b, i) => ({
  ...b,
  slot: `dwelling_t${tier}`,
  level: i + 1,
  dwelling: { familyId, form: i === 0 ? "base" : "upgraded" },
  art: `town.norse.dwelling.tier${tier}.${i === 0 ? "base" : "upgraded"}`
}));
var access = (...ids) => ids.map((creatureId) => ({ type: "recruit_access", creatureId }));
var DWELLINGS2 = [
  ...dwell2(
    1,
    "norse_draugr",
    { id: "norse_barrow", name: "Draugr Barrow", slot: "", level: 1, cost: { gold: 500, stone: 10 }, req: [has2("norse_palisade")], fx: access("norse_draugr"), summary: "Recruit Draugar. 14 per week.", art: "" },
    { id: "norse_barrow_up", name: "Deathless Barrow", slot: "", level: 2, cost: { gold: 1e3, stone: 5 }, fx: access("norse_draugr", "norse_deathless_draugr"), summary: "Also recruit and train Deathless Draugar. Shares the Draugr pool.", art: "" }
  ),
  ...dwell2(
    2,
    "norse_frost_wolf",
    { id: "norse_wolf_den", name: "Wolf Den", slot: "", level: 1, cost: { gold: 1e3, wood: 5, stone: 5 }, req: [has2("norse_barrow")], fx: access("norse_frost_wolf"), summary: "Recruit Frost Wolves. 9 per week.", art: "" },
    { id: "norse_wolf_den_up", name: "Fenrir Den", slot: "", level: 2, cost: { gold: 1e3, wood: 5, stone: 5 }, fx: access("norse_frost_wolf", "norse_fenrir_wolf"), summary: "Also recruit and train Fenrir Wolves.", art: "" }
  ),
  ...dwell2(
    3,
    "norse_frost_troll",
    { id: "norse_troll_cave", name: "Troll Cave", slot: "", level: 1, cost: { gold: 2e3, wood: 5, stone: 5 }, req: [has2("norse_wolf_den"), has2("norse_hof_1"), covenant2("norse_frost_troll")], fx: access("norse_frost_troll"), summary: "Recruit Frost Trolls. 6 per week. Requires an assigned Frost Troll covenant.", art: "" },
    { id: "norse_troll_cave_up", name: "Ancient Troll Cave", slot: "", level: 2, cost: { gold: 1500, stone: 5, crystal: 1 }, fx: access("norse_frost_troll", "norse_ancient_frost_troll"), summary: "Also recruit and train Ancient Frost Trolls.", art: "" }
  ),
  ...dwell2(
    4,
    "norse_valkyrie",
    { id: "norse_valkyrie_aerie", name: "Valkyrie Aerie", slot: "", level: 1, cost: { gold: 2e3, wood: 5, stone: 5 }, req: [has2("norse_barrow"), has2("norse_smithy")], fx: access("norse_valkyrie"), summary: "Recruit Valkyries. 4 per week.", art: "" },
    { id: "norse_valkyrie_aerie_up", name: "Hall of the Chosen", slot: "", level: 2, cost: { gold: 2e3, stone: 5, crystal: 2 }, fx: access("norse_valkyrie", "norse_battle_valkyrie"), summary: "Also recruit and train Battle Valkyries.", art: "" }
  ),
  ...dwell2(
    5,
    "norse_lindworm",
    { id: "norse_lindworm_roost", name: "Lindworm Roost", slot: "", level: 1, cost: { gold: 3e3, wood: 5, stone: 5, crystal: 4 }, req: [has2("norse_valkyrie_aerie"), has2("norse_rune_circle_1")], fx: access("norse_lindworm"), summary: "Recruit Lindworms. 3 per week.", art: "" },
    { id: "norse_lindworm_roost_up", name: "Storm Roost", slot: "", level: 2, cost: { gold: 1500, wood: 2, stone: 2, crystal: 2 }, fx: access("norse_lindworm", "norse_storm_lindworm"), summary: "Also recruit and train Storm Lindworms.", art: "" }
  ),
  ...dwell2(
    6,
    "norse_jotunn",
    { id: "norse_jotunn_camp", name: "Jotunn Camp", slot: "", level: 1, cost: { gold: 5e3, wood: 10, stone: 10, crystal: 5 }, req: [has2("norse_hof_2"), has2("norse_valkyrie_aerie"), covenant2("norse_jotunn")], fx: access("norse_jotunn"), summary: "Recruit Jotnar. 2 per week. Requires an assigned Jotunn covenant.", art: "" },
    { id: "norse_jotunn_camp_up", name: "Rune Hall of the Giants", slot: "", level: 2, cost: { gold: 3e3, stone: 5, crystal: 3 }, fx: access("norse_jotunn", "norse_runic_jotunn"), summary: "Also recruit and train Runic Jotnar.", art: "" }
  ),
  ...dwell2(
    7,
    "norse_nidhogg_wyrm",
    { id: "norse_serpent_lair", name: "Serpent Lair", slot: "", level: 1, cost: { gold: 15e3, wood: 10, stone: 15, crystal: 12 }, req: [has2("norse_hof_2"), has2("norse_lindworm_roost"), has2("norse_stronghold"), covenant2("norse_nidhogg_wyrm")], fx: access("norse_nidhogg_wyrm"), summary: "Recruit Nidhogg Wyrms. 1 per week. Requires an assigned Nidhogg Wyrm covenant.", art: "" },
    { id: "norse_serpent_lair_up", name: "World-Serpent Lair", slot: "", level: 2, cost: { gold: 15e3, stone: 10, crystal: 12 }, fx: access("norse_nidhogg_wyrm", "norse_world_serpent_wyrm"), summary: "Also recruit and train World-Serpent Wyrms.", art: "" }
  )
];
var NORSE_BUILDINGS = [...SUPPORT2, ...DWELLINGS2].map((b) => ({
  id: b.id,
  pantheonId: N,
  name: b.name,
  slotId: b.slot,
  level: b.level,
  cost: b.cost,
  requirements: b.req ?? [],
  effects: b.fx ?? [],
  ...b.dwelling ? { dwelling: { familyId: b.dwelling.familyId, form: b.dwelling.form, grantsInitialPopulation: b.dwelling.form === "base" } } : {},
  summary: b.summary,
  implementationStatus: b.planned ? "planned" : "implemented",
  artAssetId: b.art,
  provenance: b.planned ? { source: "owner-architecture", note: "Location from the owner architecture; mechanics not yet designed." } : { source: "proposed-this-build", note: "Norse names; cost and prerequisites mirror the Greek design/03 location (P)." }
}));
var slot2 = (id, kind, label, chain, placement, extra = {}) => ({ id, kind, label, chain, placement, ...extra });
var NORSE_TOWN = {
  id: "norse_hold",
  pantheonId: N,
  name: "Norse Hold",
  backgroundAssetId: "town.norse.background",
  // Aurora over the peaks at the top centre; the giant's statue stands at the top left, the great hall at the top right.
  hudAnchor: "center",
  slots: [
    slot2("civic_hall", "support", "Civic Hall", ["norse_longhouse", "norse_jarls_hall", "norse_high_hall", "norse_hall_of_kings"], { x: 55, y: 47, width: 17, height: 17, layer: 4 }, { role: "civic_hall" }),
    slot2("pantheon_temple", "support", "Pantheon Temple (Hof)", ["norse_hof_1", "norse_hof_2"], { x: 60, y: 21.5, width: 13, height: 13, layer: 2 }, { role: "pantheon_temple" }),
    slot2("mage_guild", "support", "Rune Circle", ["norse_rune_circle_1", "norse_rune_circle_2", "norse_rune_circle_3"], { x: 82, y: 21, width: 11, height: 11, layer: 2 }, { role: "mage_guild" }),
    slot2("watchtower", "support", "Watchtower / Observatory", ["norse_watchtower"], { x: 33, y: 35.5, width: 8, height: 8, layer: 3 }, { role: "watchtower" }),
    slot2("artifact_merchant", "support", "Artifact Merchant", ["norse_rune_merchant"], { x: 82, y: 31, width: 12, height: 12, layer: 3 }, { role: "artifact_merchant" }),
    slot2("tavern", "support", "Mead Hall / Heroes\u2019 Lodge", ["norse_mead_hall"], { x: 36, y: 42, width: 12, height: 12, layer: 4 }, { role: "tavern" }),
    slot2("marketplace", "support", "Trading Post", ["norse_trading_post"], { x: 52, y: 71, width: 14, height: 14, layer: 7 }, { role: "marketplace" }),
    slot2("training_academy", "support", "Training Ground", ["norse_training_ground"], { x: 71, y: 43, width: 11, height: 11, layer: 4 }, { role: "training_academy" }),
    slot2("workshop", "support", "Workshop", ["norse_smithy"], { x: 40, y: 55.5, width: 12, height: 12, layer: 5 }, { role: "workshop" }),
    slot2("resource_depot", "support", "Storehouse", ["norse_storehouse"], { x: 22.5, y: 55.5, width: 13, height: 13, layer: 5 }, { role: "resource_depot" }),
    slot2("fortifications", "support", "Fortifications / Gatehouse", ["norse_palisade", "norse_stronghold", "norse_fortress"], { x: 52, y: 97, width: 22, height: 22, layer: 9 }, { role: "fortifications" }),
    slot2("dwelling_t1", "dwelling", "Tier 1 \u2014 Draugr Barrow", ["norse_barrow", "norse_barrow_up"], { x: 26, y: 72, width: 14, height: 14, layer: 7 }, { tier: 1 }),
    slot2("dwelling_t2", "dwelling", "Tier 2 \u2014 Wolf Den", ["norse_wolf_den", "norse_wolf_den_up"], { x: 78, y: 72, width: 14, height: 14, layer: 7 }, { tier: 2 }),
    slot2("dwelling_t3", "dwelling", "Tier 3 \u2014 Troll Cave", ["norse_troll_cave", "norse_troll_cave_up"], { x: 66, y: 56.5, width: 12, height: 12, layer: 5 }, { tier: 3 }),
    slot2("dwelling_t4", "dwelling", "Tier 4 \u2014 Valkyrie Aerie", ["norse_valkyrie_aerie", "norse_valkyrie_aerie_up"], { x: 51, y: 31, width: 12, height: 12, layer: 3 }, { tier: 4 }),
    slot2("dwelling_t5", "dwelling", "Tier 5 \u2014 Lindworm Roost", ["norse_lindworm_roost", "norse_lindworm_roost_up"], { x: 86, y: 53.5, width: 13, height: 13, layer: 5 }, { tier: 5 }),
    slot2("dwelling_t6", "dwelling", "Tier 6 \u2014 Jotunn Camp", ["norse_jotunn_camp", "norse_jotunn_camp_up"], { x: 11, y: 47, width: 12, height: 12, layer: 4 }, { tier: 6 }),
    slot2("dwelling_t7", "dwelling", "Tier 7 \u2014 Serpent Lair", ["norse_serpent_lair", "norse_serpent_lair_up"], { x: 88, y: 93, width: 14, height: 14, layer: 8 }, { tier: 7 })
  ]
};

// ../pantheon_realms/packages/content/src/norse/pantheon.ts
var NORSE_GODS = [
  {
    id: "norse_odin",
    pantheonId: "norse",
    name: "Odin",
    domain: "Wisdom & Knowledge",
    role: "patron",
    requirements: [],
    favorCost: 0,
    benefits: [],
    benefitSummary: ["Patron of the Norse skirmish armies.", "No mechanical bonus in rule profile pr-0.2-candidate (mirrors Zeus; proposed)."],
    quote: "Every road north is paid for in wisdom.",
    portraitAssetId: "god.norse.odin.portrait",
    implementationStatus: "implemented",
    provenance: { source: "proposed-this-build", note: "Patron role mirrors Zeus; no bonus." }
  },
  {
    id: "norse_thor",
    pantheonId: "norse",
    name: "Thor",
    domain: "Strength & Storms",
    role: "minor",
    exclusivityGroup: "first_minor",
    requirements: [{ type: "has_building", buildingId: "norse_hof_2" }],
    favorCost: 20,
    benefits: [
      { type: "commander_attribute", attribute: "attack", amount: 1 },
      { type: "spell_eligibility", spellId: "warcry" }
    ],
    benefitSummary: ["+1 Attack for your commanders.", "War Cry becomes learnable at a later Rune Circle visit."],
    quote: "Swing first, and swing true.",
    portraitAssetId: "god.norse.thor.portrait",
    implementationStatus: "implemented",
    provenance: { source: "proposed-this-build", note: "Mirrors Ares (P)." }
  },
  {
    id: "norse_tyr",
    pantheonId: "norse",
    name: "Tyr",
    domain: "Law & Honor",
    role: "minor",
    exclusivityGroup: "first_minor",
    requirements: [{ type: "has_building", buildingId: "norse_hof_2" }],
    favorCost: 20,
    benefits: [
      { type: "commander_attribute", attribute: "defense", amount: 1 },
      { type: "spell_eligibility", spellId: "ward" }
    ],
    benefitSummary: ["+1 Defense for your commanders.", "Ward becomes learnable at a later Rune Circle visit."],
    quote: "An oath holds the line longer than a shield.",
    portraitAssetId: "god.norse.tyr.portrait",
    implementationStatus: "implemented",
    provenance: { source: "proposed-this-build", note: "Mirrors Athena (P)." }
  },
  // Added 2026-10-02 (owner answer "Split 2 + 2"): Frigg and Baldr join the first choice,
  // Loki and Njord the second. Proposed values.
  ...[
    ["norse_frigg", "Frigg", "Foresight & Protection", "I know how this ends. Walk where I point.", blessing(BLESSINGS.attribute("knowledge", 1), BLESSINGS.vision(2))],
    ["norse_baldr", "Baldr", "Light & Purity", "Even the long night has a morning in it.", blessing(BLESSINGS.attribute("power", 1), BLESSINGS.manaRegen(2))]
  ].map(([id, name, domain, quote, b]) => firstMinorGod({ id, pantheonId: "norse", name, domain, quote, ...b, portraitAssetId: `god.norse.${id.replace(/^norse_/, "")}.portrait`, templeId: "norse_hof_2" })),
  // Second minor-god choice (proposed this build).
  ...[
    ["norse_freyja", "Freyja", "Love & Fertility", "Every hall fills again by spring.", blessing(BLESSINGS.growth(1, 5))],
    ["norse_heimdall", "Heimdall", "Vigilance & Alertness", "I hear the grass grow. I heard you coming.", blessing(BLESSINGS.vision(2), BLESSINGS.creatures("defense", 1, { label: "All your creatures" }))],
    ["norse_hel", "Hel", "Death & Transition", "Half of what falls is mine. I may lend it back.", blessing(BLESSINGS.recovery(15))]
  ].map(
    ([id, name, domain, quote, b]) => secondMinorGod({ id, pantheonId: "norse", name, domain, quote, ...b, portraitAssetId: `god.norse.${id.replace(/^norse_/, "")}.portrait`, templeId: "norse_hof_2", civicHallId: "norse_high_hall" })
  ),
  ...[
    ["norse_loki", "Loki", "Trickery & Change", "Rules are for people who lose.", blessing(BLESSINGS.luck(2), BLESSINGS.movement(10))],
    ["norse_njord", "Njord", "Sea & Prosperity", "Fair wind, full nets, heavy purses.", blessing(BLESSINGS.income("gold", 200), BLESSINGS.income("crystal", 1))]
  ].map(
    ([id, name, domain, quote, b]) => secondMinorGod({ id, pantheonId: "norse", name, domain, quote, ...b, portraitAssetId: `god.norse.${id.replace(/^norse_/, "")}.portrait`, templeId: "norse_hof_2", civicHallId: "norse_high_hall" })
  )
];
var NORSE_HERO_CLASSES = [
  {
    id: "huscarl",
    name: "Huscarl",
    startingAttributes: { attack: 2, defense: 2, power: 1, knowledge: 1 },
    startingSkills: [{ skillId: "offense", rank: 1 }],
    primaryGainCycle: ["attack", "defense", "attack", "knowledge"],
    startsWithSpellbook: false,
    summary: "A sworn household warrior who leads from the shield wall (mirrors Champion; proposed)."
  },
  {
    id: "jarl",
    name: "Jarl",
    startingAttributes: { attack: 1, defense: 2, power: 1, knowledge: 2 },
    startingSkills: [{ skillId: "leadership", rank: 1 }],
    primaryGainCycle: ["defense", "attack", "knowledge", "power"],
    startsWithSpellbook: false,
    summary: "A war-leader whose word keeps the host together (mirrors Strategos; proposed)."
  },
  {
    id: "volva",
    name: "V\xF6lva",
    startingAttributes: { attack: 0, defense: 0, power: 3, knowledge: 3 },
    startingSkills: [{ skillId: "wisdom", rank: 1 }],
    primaryGainCycle: ["power", "knowledge", "power", "defense"],
    startsWithSpellbook: true,
    summary: "A seeress who reads the runes and casts them in battle (mirrors Oracle; proposed)."
  }
];
var hero2 = (id, name, title, classId, biography) => ({
  id,
  pantheonId: "norse",
  name,
  title,
  classId,
  biography,
  portraitAssetId: `hero.norse.${id.replace(/^norse_/, "")}.portrait`,
  availability: "hireable",
  provenance: { source: "concept-board", note: "Name and title from the owner Norse board; class assignment proposed." }
});
var foe = (id, name, title, classId, biography) => ({
  ...hero2(id, name, title, classId, biography),
  availability: "enemy",
  provenance: { source: "proposed-this-build", note: "The Winter Oath campaign character (owner decision 2026-10-01: build the campaign)." }
});
var NORSE_HEROES = [
  hero2("norse_sigurd", "Sigurd", "Dragonslayer & Destiny", "huscarl", "Concept-board hero. A wanderer who once stood against a wyrm and now leads others against worse. Hireable in skirmish."),
  hero2("norse_brynhild", "Brynhild", "Valkyrie & Devotion", "huscarl", "Concept-board hero. A shieldmaiden bound by an oath she chose herself. Hireable in skirmish."),
  hero2("norse_ragnar", "Ragnar", "Conquest & Glory", "jarl", "Concept-board hero. A raider-king who measures a season by the harbors that answer to him. Hireable in skirmish."),
  hero2("norse_lagertha", "Lagertha", "Leadership & Resilience", "jarl", "Concept-board hero. A war-leader who has never lost a retreat she ordered. Hireable in skirmish."),
  hero2("norse_hervor", "Hervor", "Ancestral Power & Vengeance", "volva", "Concept-board hero. She woke a grave to claim a sword; the runes have answered her since. The hero of The Winter Oath; hireable in skirmish."),
  foe("norse_grey_jarl", "The Grey Jarl", "Barrow-king of the Long Winter", "huscarl", "Hrolf, a king of a thousand winters ago, swore to hold the winter under his mound in exchange for a kingdom when it ended. The winter never ended. Final opponent of The Winter Oath."),
  foe("norse_ulfhild", "Ulfhild", "Jarl of Hvitstrand", "jarl", "A living jarl who swore to keep the Grey Jarl\u2019s winter for a frozen sea that keeps her rivals\u2019 ships in harbour. Rival empire in The Winter Oath, mission 5."),
  foe("norse_hrafn", "Hrafn the Hollow", "Oathless Einherjar", "huscarl", "Chosen by the Valkyries once, he walked out of their hall for the Grey Jarl\u2019s promise of a war that never ends. Holds the Glacier Gate in The Winter Oath, mission 6."),
  foe("norse_bone_helm", "Bone-Helm", "Captain of the Nail-ship", "huscarl", "Draugr captain of the ship of nails, who walks the frozen sound with his crew. Patrol in The Winter Oath, mission 4."),
  foe("norse_barrow_captain", "Barrow Captain", "Warden of the Glacier Plateau", "huscarl", "The Grey Jarl\u2019s oldest captain, who sweeps the plateau before the barrow-gate. Patrol in The Winter Oath, mission 7.")
];
var NORSE_PANTHEON = {
  id: "norse",
  name: "Norse",
  epithet: "Fate & Battle",
  signature: SIGNATURES.norse,
  summary: "Barrow-risen Draugar, frost wolves, valkyries and the root-gnawing wyrms of the deep north. Playable in skirmish with proposed, unplaytested values.",
  playability: "playable",
  roster: [
    { tier: 1, familyId: "norse_draugr" },
    { tier: 2, familyId: "norse_frost_wolf" },
    { tier: 3, familyId: "norse_frost_troll" },
    { tier: 4, familyId: "norse_valkyrie" },
    { tier: 5, familyId: "norse_lindworm" },
    { tier: 6, familyId: "norse_jotunn" },
    { tier: 7, familyId: "norse_nidhogg_wyrm" }
  ],
  heroIds: NORSE_HEROES.map((h) => h.id),
  godIds: NORSE_GODS.map((g2) => g2.id),
  townArchetypeId: "norse_hold",
  theme: { accent: "#7fb3d9", accentSoft: "#27435a", emblemAssetId: "emblem.norse", musicThemeId: "music.norse.theme" },
  provenance: { source: "proposed-this-build", note: "Owner decision: Claude proposes every Norse number; labelled proposed." }
};

// ../pantheon_realms/packages/content/src/campaign/threeBeacons.ts
var TEMPLATES = [
  {
    id: "three_beacons_m01_v1",
    version: 1,
    width: 20,
    height: 14,
    goldenSeed: 170101,
    barriers: [{ q: 10, terrain: "water", openings: [{ q: 10, r: 7 }] }],
    anchors: [
      { id: "m01_town", coord: { q: 3, r: 7 } },
      { id: "m01_sawmill", coord: { q: 3, r: 3 } },
      { id: "m01_quarry", coord: { q: 6, r: 10 } },
      { id: "m01_cache", coord: { q: 7, r: 5 } },
      { id: "m01_centaur_cache", coord: { q: 6, r: 2 } },
      { id: "m01_ford", coord: { q: 10, r: 7 } },
      { id: "m01_beacon", coord: { q: 16, r: 7 } }
    ],
    roadEdges: [
      ["m01_town", "m01_ford"],
      ["m01_ford", "m01_beacon"],
      ["m01_town", "m01_sawmill"],
      ["m01_town", "m01_quarry"],
      ["m01_sawmill", "m01_centaur_cache"],
      ["m01_town", "m01_cache"]
    ],
    biome: "coast"
  },
  {
    id: "three_beacons_m02_v1",
    version: 1,
    width: 26,
    height: 18,
    goldenSeed: 170202,
    barriers: [{ q: 13, terrain: "mountain", openings: [{ q: 13, r: 8 }] }],
    anchors: [
      { id: "m02_town", coord: { q: 3, r: 8 } },
      { id: "m02_sawmill", coord: { q: 5, r: 4 } },
      { id: "m02_quarry", coord: { q: 6, r: 12 } },
      { id: "m02_cache", coord: { q: 8, r: 11 } },
      { id: "m02_watchtower", coord: { q: 8, r: 5 } },
      { id: "m02_sentinel_cache", coord: { q: 7, r: 3 } },
      { id: "m02_pass_guard", coord: { q: 13, r: 8 } },
      { id: "m02_nest_guard", coord: { q: 20, r: 6 } },
      { id: "m02_beacon", coord: { q: 22, r: 10 } },
      { id: "m02_crystal", coord: { q: 19, r: 13 } }
    ],
    roadEdges: [
      ["m02_town", "m02_pass_guard"],
      ["m02_pass_guard", "m02_nest_guard"],
      ["m02_pass_guard", "m02_beacon"],
      ["m02_town", "m02_sawmill"],
      ["m02_town", "m02_quarry"],
      ["m02_town", "m02_cache"],
      ["m02_town", "m02_watchtower"],
      ["m02_watchtower", "m02_sentinel_cache"],
      ["m02_beacon", "m02_crystal"]
    ],
    biome: "high_pass"
  },
  {
    id: "three_beacons_m03_v1",
    version: 1,
    width: 30,
    height: 20,
    goldenSeed: 170303,
    barriers: [
      { q: 12, terrain: "mountain", openings: [{ q: 12, r: 6 }, { q: 12, r: 13 }] },
      { q: 21, terrain: "mountain", openings: [{ q: 21, r: 10 }] }
    ],
    anchors: [
      { id: "m03_town", coord: { q: 3, r: 10 } },
      { id: "m03_sawmill", coord: { q: 5, r: 6 } },
      { id: "m03_quarry", coord: { q: 6, r: 15 } },
      { id: "m03_gold_mine", coord: { q: 7, r: 15 } },
      { id: "m03_watchtower", coord: { q: 9, r: 4 } },
      { id: "m03_north_guard", coord: { q: 12, r: 6 } },
      { id: "m03_south_guard", coord: { q: 12, r: 13 } },
      { id: "m03_relay_north", coord: { q: 16, r: 5 } },
      { id: "m03_relay_south", coord: { q: 16, r: 14 } },
      { id: "m03_scout_spawn", coord: { q: 17, r: 10 } },
      { id: "m03_labyrinth", coord: { q: 17, r: 2 } },
      { id: "m03_cyclops_cache", coord: { q: 18, r: 17 } },
      { id: "m03_ward_gate", coord: { q: 21, r: 10 } },
      { id: "m03_beacon", coord: { q: 26, r: 10 } }
    ],
    roadEdges: [
      ["m03_town", "m03_north_guard"],
      ["m03_town", "m03_south_guard"],
      ["m03_north_guard", "m03_relay_north"],
      ["m03_south_guard", "m03_relay_south"],
      ["m03_relay_north", "m03_relay_south"],
      ["m03_relay_north", "m03_ward_gate"],
      ["m03_relay_south", "m03_ward_gate"],
      ["m03_ward_gate", "m03_beacon"],
      ["m03_town", "m03_sawmill"],
      ["m03_town", "m03_quarry"],
      ["m03_quarry", "m03_gold_mine"],
      ["m03_town", "m03_watchtower"],
      ["m03_relay_north", "m03_labyrinth"],
      ["m03_relay_south", "m03_cyclops_cache"]
    ],
    patrolLoop: [
      { q: 15, r: 8 },
      { q: 18, r: 10 },
      { q: 15, r: 12 },
      { q: 17, r: 10 }
    ],
    biome: "storm_plateau"
  }
];
var ENTITLEMENTS = [
  { id: "covenant.griffin.m02", name: "Griffin Covenant", kind: "covenant", familyId: "griffin", summary: "The freed nesting ground allows a Griffin Aerie to be built in one town." },
  { id: "covenant.minotaur.m03", name: "Minotaur Covenant", kind: "covenant", familyId: "minotaur", summary: "The labyrinth refuge allows a Labyrinth to be built in one town." }
];
var P = (speaker2, text) => ({
  speaker: speaker2,
  portraitAssetId: `hero.greek.${speaker2.toLowerCase()}.portrait`,
  text
});
var resSite = (id, anchorId, q, r2, siteType) => {
  const table = {
    sawmill: { name: "Sawmill", resource: "wood", dailyYield: 2, description: "Unowned timber works. Capture for +2 Wood per day." },
    quarry: { name: "Quarry", resource: "stone", dailyYield: 2, description: "Unowned quarry. Capture for +2 Stone per day." },
    gold_mine: { name: "Gold Mine", resource: "gold", dailyYield: 1e3, description: "Unowned mine. Capture for +1,000 Gold per day." },
    crystal_deposit: { name: "Crystal Deposit", resource: "crystal", dailyYield: 1, description: "Unowned crystal outcrop. Capture for +1 Crystal per day." }
  }[siteType];
  return {
    id,
    anchorId,
    coord: { q, r: r2 },
    name: table.name,
    description: table.description,
    kind: { type: "resource_site", siteType, resource: table.resource, dailyYield: table.dailyYield }
  };
};
var DEBRIEF_POLICY = [
  "Alexios keeps his level, experience (up to the displayed cap), skills, spellbook, spells and equipment.",
  "Zeus and any Athena/Ares commitment carry into the next mission.",
  "Troops, resources, towns, mines and recruitment pools stay behind to defend the restored region.",
  "The next mission begins with its declared expedition force and wallet."
];
var M01_OBJECTIVES = [
  { id: "m01_recruit", title: "Raise the watch", description: "Recruit at least 8 Hoplite-family creatures during this mission. Starting troops and transfers do not count.", category: "primary", initialStatus: "active", condition: { type: "counter_at_least", counter: "recruited:hoplite", value: 8 }, hint: "Visit Asterion and open Recruitment at the Barracks." },
  { id: "m01_upgrade", title: "Train a trusted guard", description: "Train at least 10 Hoplites into Veteran Hoplites through paid local upgrades.", category: "primary", initialStatus: "active", condition: { type: "counter_at_least", counter: "trained:hoplite", value: 10 }, hint: "Build the Veteran Barracks, then train Hoplites in Asterion. Training costs the price difference and uses no population." },
  { id: "m01_ford", title: "Open the bridge", description: "Defeat the {army:hoplite=6} guarding the bridge at the river.", category: "primary", initialStatus: "active", condition: { type: "site_cleared", siteId: "m01_ford" }, markerSiteId: "m01_ford" },
  { id: "m01_beacon_guard", title: "Clear the lighthouse", description: "Defeat the beacon garrison of {army:hoplite=8,peltast=4}.", category: "primary", initialStatus: "active", condition: { type: "site_cleared", siteId: "m01_beacon" }, markerSiteId: "m01_beacon" },
  { id: "m01_restore", title: "Relight the lighthouse", description: "At the beacon, with its guards defeated and both training objectives met, pay 250 Gold, 3 Wood and 3 Stone to light it.", category: "primary", initialStatus: "active", condition: { type: "site_activated", siteId: "m01_beacon" }, markerSiteId: "m01_beacon" },
  { id: "m01_centaur_cache", title: "The grove cache (optional)", description: "Defeat the {army:centaur=3} at the grove cache for a Warding Token (+1 commander Defense).", category: "optional", initialStatus: "active", condition: { type: "site_cleared", siteId: "m01_centaur_cache" }, markerSiteId: "m01_centaur_cache" }
];
var M01_SITES = [
  { id: "m01_town", anchorId: "m01_town", coord: { q: 3, r: 7 }, name: "Asterion", description: "Your coastal town.", kind: { type: "town", townId: "asterion" } },
  resSite("m01_sawmill", "m01_sawmill", 3, 3, "sawmill"),
  resSite("m01_quarry", "m01_quarry", 6, 10, "quarry"),
  { id: "m01_cache", anchorId: "m01_cache", coord: { q: 7, r: 5 }, name: "Wreck Cache", description: "Storm wreckage with salvageable coin.", kind: { type: "pickup", reward: { resources: { gold: 300 } } } },
  {
    id: "m01_centaur_cache",
    anchorId: "m01_centaur_cache",
    coord: { q: 6, r: 2 },
    name: "Grove Cache",
    description: "A grove where wary centaurs guard an old warding token.",
    kind: { type: "landmark", landmark: "grove" },
    guard: { label: "Grove centaurs", army: [{ creatureId: "centaur", count: 3 }], reward: { artifactIds: ["warding_token"] }, battlefield: "grove" },
    objectiveIds: ["m01_centaur_cache"]
  },
  {
    id: "m01_ford",
    anchorId: "m01_ford",
    coord: { q: 10, r: 7 },
    name: "Tidal Bridge",
    description: "The only crossing of the tidal river.",
    kind: { type: "crossing" },
    guard: { label: "Bridge garrison", army: [{ creatureId: "hoplite", count: 6 }], reward: { resources: { gold: 250, wood: 3, stone: 3 } }, battlefield: "coast_road" },
    objectiveIds: ["m01_ford"]
  },
  {
    id: "m01_beacon",
    anchorId: "m01_beacon",
    coord: { q: 16, r: 7 },
    name: "Outer Lighthouse",
    description: "The damaged first beacon of the coast.",
    kind: {
      type: "activation",
      label: "beacon",
      cost: { gold: 250, wood: 3, stone: 3 },
      requirements: [
        { type: "objective_completed", objectiveId: "m01_recruit" },
        { type: "objective_completed", objectiveId: "m01_upgrade" }
      ],
      reward: { questXp: 900 },
      completesMission: true,
      confirmText: "Relight the Outer Lighthouse? This completes The Silent Shore."
    },
    guard: {
      label: "Lighthouse garrison",
      army: [
        { creatureId: "hoplite", count: 8 },
        { creatureId: "peltast", count: 4 }
      ],
      reward: { resources: { gold: 500 } },
      battlefield: "beacon_clearing"
    },
    objectiveIds: ["m01_beacon_guard", "m01_restore"]
  }
];
var M01 = {
  id: "three_beacons_m01",
  scenarioId: "three_beacons_m01",
  campaignId: "three_beacons",
  order: 1,
  name: "The Silent Shore",
  subtitle: "Mission 1 \u2014 Restore",
  summary: "The storm has passed, but the Outer Lighthouse is dark. Open the tidal bridge, raise and train a trusted guard, and relight the first beacon.",
  mapTemplateId: "three_beacons_m01_v1",
  soundscape: "coast",
  targetPlaytime: "10\u201315 minutes (target, unmeasured)",
  newDecisions: ["Explore", "Recruit", "Train the first upgrade", "Resolve losses"],
  xpCap: 3199,
  xpCapLevel: 3,
  briefing: [
    P("Thaleia", "The storm has passed. Our lighthouse is still dark. Open the road, train a guard we can trust, and bring its signal back."),
    P("Alexios", "First we reach the shore. Then we make sure the road stays open.")
  ],
  victory: [P("Thaleia", "One light is enough to tell the coast we have not abandoned it. The next signal lies above the pass.")],
  storyScenes: [
    {
      id: "m01_bridge_open",
      trigger: { type: "site_cleared", siteId: "m01_ford" },
      lines: [
        P("Alexios", "The bridge is ours. Whoever held it wanted the shore cut off, not plundered."),
        P("Thaleia", "Then they will be back. Keep the road watched when you march on.")
      ]
    },
    {
      id: "m01_lighthouse_battle",
      trigger: { type: "battle_started", siteId: "m01_beacon" },
      lines: [P("Alexios", "They are holding the lighthouse itself. Whoever sent them knew what its light means to this coast.")]
    },
    {
      id: "m01_losses",
      trigger: { type: "casualties", minLost: 4 },
      lines: [
        P("Thaleia", "Every shield that falls is a family in Asterion waiting at the door. Win if you must \u2014 but bring them home when you can."),
        P("Alexios", "I hear you. We fight smarter, or we wait until we are stronger.")
      ]
    }
  ],
  debriefPolicy: DEBRIEF_POLICY,
  player: {
    playerId: "player",
    name: "Asterion",
    pantheonId: "greek",
    wallet: { gold: 5e3, wood: 12, stone: 18, crystal: 2, favor: 0 },
    town: {
      townId: "asterion",
      siteId: "m01_town",
      name: "Asterion",
      archetypeId: "greek_polis",
      buildings: ["village_hall", "tavern", "fort", "barracks"],
      population: { hoplite: 14 },
      covenants: []
    },
    hero: {
      heroId: "alexios",
      definitionId: "alexios",
      classId: "strategos",
      defaults: {
        level: 1,
        xp: 0,
        attributes: { attack: 1, defense: 2, power: 1, knowledge: 2 },
        skills: [{ skillId: "leadership", rank: 1 }],
        spellbook: false
      },
      army: [
        { creatureId: "hoplite", count: 20 },
        { creatureId: "peltast", count: 8 }
      ],
      startTownId: "asterion"
    }
  },
  purchasableBuildingIds: ["town_hall", "market", "barracks_up", "peltast_range", "peltast_range_up"],
  // Documented campaign rules: no pantheon signatures, first minor choice only (Athena OR Ares).
  signatureMechanics: false,
  committableGodIds: ["athena", "ares"],
  heroHiringEnabled: false,
  heroHiringDisabledReason: "Alexios leads this expedition alone. Hero hiring is disabled in The Three Beacons.",
  sites: M01_SITES,
  objectives: M01_OBJECTIVES,
  hostileHeroes: [],
  helpTopics: [
    { id: "route_preview", title: "Route preview", text: "Select a destination to preview the route. Solid markers are reachable today; faded markers need future days. Click again to march." },
    { id: "guarded_route", title: "Guarded routes", text: "A guarded site blocks its tile. Moving onto it asks for confirmation and starts a battle; you pay the final step as combat begins." },
    { id: "family_population", title: "Family population", text: "Base and upgraded forms share one weekly population pool. Building the upgraded dwelling adds no extra recruits." },
    { id: "upgrade_vs_training", title: "Dwelling upgrade vs. troop training", text: "Upgrading a dwelling unlocks the upgraded form. Training converts existing troops in town for the price difference and uses no population." },
    { id: "stack_hp", title: "Creature HP vs. stack HP", text: "HP is per creature. A stack stores total HP; the front creature may be wounded. Survivors heal after battle; the dead stay dead." },
    { id: "casualties", title: "Battle casualties", text: "Losses are permanent. Recruit replacements in town or recover resources from mines." }
  ],
  protectedHeroFailure: true,
  thumbnailAssetId: "mission.three_beacons.m01.thumbnail"
};
var M02_OBJECTIVES = [
  { id: "m02_watchtower", title: "The Old Watchtower (optional)", description: "Visit the Old Watchtower to learn where the Griffin nesting ground lies.", category: "optional", initialStatus: "active", condition: { type: "site_visited", siteId: "m02_watchtower" }, markerSiteId: "m02_watchtower" },
  { id: "m02_pass_guard", title: "Break the pass", description: "Defeat the {army:hoplite=10,peltast=6} holding the ridge pass.", category: "primary", initialStatus: "active", condition: { type: "site_cleared", siteId: "m02_pass_guard" }, markerSiteId: "m02_pass_guard" },
  { id: "m02_nest_guard", title: "Free the nesting ground", description: "Defeat the raiders ({army:peltast=4,cavalry=2}) occupying the Griffin nesting ground.", category: "primary", initialStatus: "locked", requires: ["m02_pass_guard"], condition: { type: "site_cleared", siteId: "m02_nest_guard" }, markerSiteId: "m02_nest_guard" },
  { id: "m02_claim_covenant", title: "Claim the Griffin covenant", description: "Claim the freed nest\u2019s covenant in the journal. It can then be assigned to Passhaven.", category: "primary", initialStatus: "locked", condition: { type: "claim", after: ["m02_nest_guard"] }, reward: { entitlementIds: ["covenant.griffin.m02"] } },
  { id: "m02_pantheon", title: "Choose a patron\u2019s ally", description: "Build Temple II and commit to Athena or Ares (20 Favor, irreversible).", category: "primary", initialStatus: "locked", requires: ["m02_claim_covenant"], condition: { type: "player_has_minor_god" }, hint: "Open the Pantheon screen once Temple II stands in Passhaven. A god chosen earlier counts as soon as this step opens." },
  { id: "m02_windcrest", title: "Wings for the road", description: "Assign the Griffin covenant, build the Aerie and Windcrest Aerie, and have at least 2 Windcrest Griffins in Alexios\u2019s army.", category: "primary", initialStatus: "locked", requires: ["m02_pantheon"], condition: { type: "hero_army_contains", heroId: "alexios", creatureId: "windcrest_griffin", count: 2 }, live: true, hint: "Windcrest Griffins must be recruited or trained in Passhaven with Alexios present." },
  { id: "m02_restore", title: "Light the second beacon", description: "At the second beacon, with a god chosen and Windcrest Griffins in the army, pay 250 Gold and 1 Crystal.", category: "primary", initialStatus: "locked", requires: ["m02_windcrest"], condition: { type: "site_activated", siteId: "m02_beacon" }, markerSiteId: "m02_beacon" },
  { id: "m02_sentinel_cache", title: "Sentinel cache (optional)", description: "Defeat the {army:centaur_sentinel=3} for 750 Gold and 5 Wood.", category: "optional", initialStatus: "active", condition: { type: "site_cleared", siteId: "m02_sentinel_cache" }, markerSiteId: "m02_sentinel_cache" }
];
var M02_SITES = [
  { id: "m02_town", anchorId: "m02_town", coord: { q: 3, r: 8 }, name: "Passhaven", description: "A mountain town below the ridge.", kind: { type: "town", townId: "passhaven" } },
  resSite("m02_sawmill", "m02_sawmill", 5, 4, "sawmill"),
  resSite("m02_quarry", "m02_quarry", 6, 12, "quarry"),
  resSite("m02_crystal", "m02_crystal", 19, 13, "crystal_deposit"),
  { id: "m02_cache", anchorId: "m02_cache", coord: { q: 8, r: 11 }, name: "Traveler\u2019s Cache", description: "An abandoned supply cache.", kind: { type: "pickup", reward: { resources: { gold: 500 } } } },
  { id: "m02_watchtower", anchorId: "m02_watchtower", coord: { q: 8, r: 5 }, name: "Old Watchtower", description: "From its top, the nesting ground can be marked on the map.", kind: { type: "watchtower", revealSiteIds: ["m02_nest_guard"] }, objectiveIds: ["m02_watchtower"] },
  {
    id: "m02_sentinel_cache",
    anchorId: "m02_sentinel_cache",
    coord: { q: 7, r: 3 },
    name: "Sentinel Grove",
    description: "Centaur Sentinels guard a forgotten store.",
    kind: { type: "landmark", landmark: "grove" },
    guard: { label: "Centaur Sentinels", army: [{ creatureId: "centaur_sentinel", count: 3 }], reward: { resources: { gold: 750, wood: 5 } }, battlefield: "grove" },
    objectiveIds: ["m02_sentinel_cache"]
  },
  {
    id: "m02_pass_guard",
    anchorId: "m02_pass_guard",
    coord: { q: 13, r: 8 },
    name: "Ridge Pass",
    description: "The only way over the ridge.",
    kind: { type: "crossing" },
    guard: {
      label: "Pass raiders",
      army: [
        { creatureId: "hoplite", count: 10 },
        { creatureId: "peltast", count: 6 }
      ],
      reward: { resources: { gold: 750, favor: 5 } },
      battlefield: "ridge_pass"
    },
    objectiveIds: ["m02_pass_guard"]
  },
  {
    id: "m02_nest_guard",
    anchorId: "m02_nest_guard",
    coord: { q: 20, r: 6 },
    name: "Griffin Nesting Ground",
    description: "Raiders have occupied the cliff ledges where the Griffins nest.",
    kind: { type: "landmark", landmark: "nest" },
    guard: {
      label: "Nest raiders",
      army: [
        { creatureId: "peltast", count: 4 },
        { creatureId: "cavalry", count: 2 }
      ],
      reward: { resources: { favor: 10 } },
      battlefield: "plateau"
    },
    markerHiddenUntilRevealed: true,
    objectiveIds: ["m02_nest_guard"]
  },
  {
    id: "m02_beacon",
    anchorId: "m02_beacon",
    coord: { q: 22, r: 10 },
    name: "Pass Beacon",
    description: "The second beacon, high above the pass.",
    kind: {
      type: "activation",
      label: "beacon",
      cost: { gold: 250, crystal: 1 },
      requirements: [
        { type: "objective_completed", objectiveId: "m02_pantheon" },
        { type: "objective_completed", objectiveId: "m02_windcrest" }
      ],
      reward: { questXp: 2e3 },
      completesMission: true,
      confirmText: "Light the Pass Beacon? This completes Wings over the Pass."
    },
    objectiveIds: ["m02_restore"]
  }
];
var M02 = {
  id: "three_beacons_m02",
  scenarioId: "three_beacons_m02",
  campaignId: "three_beacons",
  order: 2,
  name: "Wings over the Pass",
  subtitle: "Mission 2 \u2014 Ally",
  summary: "The second beacon stands beyond the raiders. Free the Griffins\u2019 nesting ground, choose Athena or Ares, and raise Windcrest Griffins to light the pass.",
  mapTemplateId: "three_beacons_m02_v1",
  soundscape: "high_pass",
  targetPlaytime: "15\u201325 minutes (target, unmeasured)",
  newDecisions: ["Build prerequisites", "Choose a god", "Obtain and upgrade Griffins"],
  xpCap: 6199,
  xpCapLevel: 5,
  briefing: [
    P("Ione", "The second beacon stands beyond the raiders. The Griffins once kept that road safe. Free their nesting ground, and they may stand with us again."),
    P("Alexios", "An alliance, not a trophy. Show us what they need.")
  ],
  victory: [P("Ione", "The lights can speak again. But the great beacon has no lens. Melas carried it to the storm plateau.")],
  storyScenes: [
    {
      id: "m02_griffin_shrine",
      trigger: { type: "site_cleared", siteId: "m02_nest_guard" },
      lines: [
        P("Ione", "This is the Griffins\u2019 shrine \u2014 older than Passhaven, older than the road. The raiders camped on it as if it were only stone."),
        P("Ione", "Griffins do not serve. They keep oaths. Claim their covenant in your journal, and Passhaven may raise an aerie where they will be welcome."),
        P("Alexios", "Then we will keep our side of it.")
      ]
    },
    {
      id: "m02_athena",
      trigger: { type: "god_committed", godId: "athena" },
      lines: [P("Ione", "Athena, then. She favours those who plan before they strike. The Griffins will understand that.")]
    },
    {
      id: "m02_ares",
      trigger: { type: "god_committed", godId: "ares" },
      lines: [P("Ione", "Ares answers. Be careful \u2014 his gifts are paid for in courage, and courage can run out.")]
    },
    {
      id: "m02_losses",
      trigger: { type: "casualties", minLost: 6 },
      lines: [
        P("Thaleia", "A courier from Asterion, Alexios: the names of the fallen reached us before your report did. We count every soldier who does not come back."),
        P("Alexios", "Tell her I count them too.")
      ]
    }
  ],
  debriefPolicy: DEBRIEF_POLICY,
  player: {
    playerId: "player",
    name: "Passhaven",
    pantheonId: "greek",
    wallet: { gold: 9500, wood: 25, stone: 30, crystal: 8, favor: 15 },
    town: {
      townId: "passhaven",
      siteId: "m02_town",
      name: "Passhaven",
      archetypeId: "greek_polis",
      buildings: ["village_hall", "town_hall", "tavern", "fort", "barracks", "peltast_range", "market", "workshop", "temple_1", "sanctum_1"],
      population: { hoplite: 14, peltast: 9 },
      covenants: []
    },
    hero: {
      heroId: "alexios",
      definitionId: "alexios",
      classId: "strategos",
      defaults: { level: 2, xp: 1080, attributes: { attack: 1, defense: 3, power: 1, knowledge: 2 }, skills: [{ skillId: "leadership", rank: 1 }, { skillId: "offense", rank: 1 }], spellbook: false },
      army: [
        { creatureId: "hoplite", count: 32 },
        { creatureId: "peltast", count: 12 },
        { creatureId: "cavalry", count: 4 }
      ],
      startTownId: "passhaven"
    }
  },
  purchasableBuildingIds: ["barracks_up", "peltast_range_up", "training_court", "training_court_up", "temple_2", "griffin_aerie", "griffin_aerie_up", "sanctum_2", "citadel"],
  // Documented campaign rules: no pantheon signatures, first minor choice only (Athena OR Ares).
  signatureMechanics: false,
  committableGodIds: ["athena", "ares"],
  heroHiringEnabled: false,
  heroHiringDisabledReason: "Alexios leads this expedition alone. Hero hiring is disabled in The Three Beacons.",
  sites: M02_SITES,
  objectives: M02_OBJECTIVES,
  hostileHeroes: [],
  helpTopics: [
    { id: "covenants", title: "Covenants", text: "A covenant is a one-time entitlement. Assign it permanently to a town, then build and pay for the dwelling it unlocks." },
    { id: "gods", title: "Divine commitments", text: "Committing to a god is player-wide and irreversible. Athena and Ares exclude each other." },
    { id: "local_recruitment", title: "Local recruitment", text: "Recruits and training reach a hero only when the hero stands in the town." }
  ],
  protectedHeroFailure: true,
  thumbnailAssetId: "mission.three_beacons.m02.thumbnail"
};
var M03_OBJECTIVES = [
  // proposed-this-build: "either crossing" primary wrapper around the two stable guard IDs.
  { id: "m03_approach", title: "Open an approach", description: "Clear either the northern or the southern crossing. One is enough to reach both relays.", category: "primary", initialStatus: "active", condition: { type: "any", conditions: [{ type: "site_cleared", siteId: "m03_north_guard" }, { type: "site_cleared", siteId: "m03_south_guard" }] } },
  { id: "m03_north_guard", title: "Northern crossing", description: "Defeat {army:peltast=6,cavalry=4} at the northern crossing (500 Gold).", category: "optional", initialStatus: "active", condition: { type: "site_cleared", siteId: "m03_north_guard" }, markerSiteId: "m03_north_guard" },
  { id: "m03_south_guard", title: "Southern crossing", description: "Defeat {army:minotaur=1,hoplite=6} at the southern crossing (500 Gold).", category: "optional", initialStatus: "active", condition: { type: "site_cleared", siteId: "m03_south_guard" }, markerSiteId: "m03_south_guard" },
  { id: "m03_relay_north", title: "Northern relay", description: "Activate the northern relay (250 Gold, 3 Stone).", category: "primary", initialStatus: "active", condition: { type: "site_activated", siteId: "m03_relay_north" }, markerSiteId: "m03_relay_north" },
  { id: "m03_relay_south", title: "Southern relay", description: "Activate the southern relay (250 Gold, 3 Stone).", category: "primary", initialStatus: "active", condition: { type: "site_activated", siteId: "m03_relay_south" }, markerSiteId: "m03_relay_south" },
  { id: "m03_ward_gate", title: "Unseal the ward gate", description: "With both relays active, the ward gate opens.", category: "primary", initialStatus: "active", condition: { type: "all", conditions: [{ type: "flag", flag: "relay_north" }, { type: "flag", flag: "relay_south" }] }, markerSiteId: "m03_ward_gate" },
  { id: "m03_melas", title: "Defeat Melas", description: "Defeat Melas and his guard ({army:stormforged_cyclops=1,labyrinth_warden=2,veteran_peltast=6}) to recover the lens.", category: "primary", initialStatus: "active", condition: { type: "site_cleared", siteId: "m03_beacon" }, markerSiteId: "m03_beacon" },
  { id: "m03_restore", title: "Light the Storm Beacon", description: "With both relays active, Melas defeated and the lens recovered, pay 500 Gold, 3 Crystal and 5 Favor.", category: "primary", initialStatus: "active", condition: { type: "site_activated", siteId: "m03_beacon" }, markerSiteId: "m03_beacon" },
  { id: "m03_labyrinth", title: "Labyrinth refuge (optional)", description: "Defeat {army:minotaur=2,labyrinth_warden=1} for 1,500 Gold and a Minotaur covenant.", category: "optional", initialStatus: "active", condition: { type: "site_cleared", siteId: "m03_labyrinth" }, markerSiteId: "m03_labyrinth" },
  { id: "m03_cyclops_cache", title: "Cyclops quarry (optional)", description: "Defeat the Cyclops at the quarry cache for 4 Crystal.", category: "optional", initialStatus: "active", condition: { type: "site_cleared", siteId: "m03_cyclops_cache" }, markerSiteId: "m03_cyclops_cache" }
];
var relay = (id, q, r2, flag, name) => ({
  id,
  anchorId: id,
  coord: { q, r: r2 },
  name,
  description: "A signal relay that feeds the ward gate.",
  kind: {
    type: "activation",
    label: "relay",
    cost: { gold: 250, stone: 3 },
    requirements: [],
    reward: { flags: [flag] },
    completesMission: false,
    confirmText: `Activate the ${name}? Both relays open the ward gate.`
  },
  markerHiddenUntilRevealed: true,
  objectiveIds: [id]
});
var M03_SITES = [
  { id: "m03_town", anchorId: "m03_town", coord: { q: 3, r: 10 }, name: "Highwatch", description: "The last town below the storm plateau.", kind: { type: "town", townId: "highwatch" } },
  resSite("m03_sawmill", "m03_sawmill", 5, 6, "sawmill"),
  resSite("m03_quarry", "m03_quarry", 6, 15, "quarry"),
  resSite("m03_gold_mine", "m03_gold_mine", 7, 15, "gold_mine"),
  { id: "m03_watchtower", anchorId: "m03_watchtower", coord: { q: 9, r: 4 }, name: "Old Watchtower", description: "Marks both relay coordinates as remembered sites.", kind: { type: "watchtower", revealSiteIds: ["m03_relay_north", "m03_relay_south"] } },
  {
    id: "m03_north_guard",
    anchorId: "m03_north_guard",
    coord: { q: 12, r: 6 },
    name: "Northern Crossing",
    description: "A guarded gap in the western ridge.",
    kind: { type: "crossing" },
    guard: { label: "Northern crossing guard", army: [{ creatureId: "peltast", count: 6 }, { creatureId: "cavalry", count: 4 }], reward: { resources: { gold: 500 } }, battlefield: "ridge_pass" },
    objectiveIds: ["m03_north_guard"]
  },
  {
    id: "m03_south_guard",
    anchorId: "m03_south_guard",
    coord: { q: 12, r: 13 },
    name: "Southern Crossing",
    description: "A guarded gap in the western ridge.",
    kind: { type: "crossing" },
    guard: { label: "Southern crossing guard", army: [{ creatureId: "minotaur", count: 1 }, { creatureId: "hoplite", count: 6 }], reward: { resources: { gold: 500 } }, battlefield: "ridge_pass" },
    objectiveIds: ["m03_south_guard"]
  },
  relay("m03_relay_north", 16, 5, "relay_north", "Northern Relay"),
  relay("m03_relay_south", 16, 14, "relay_south", "Southern Relay"),
  {
    id: "m03_labyrinth",
    anchorId: "m03_labyrinth",
    coord: { q: 17, r: 2 },
    name: "Labyrinth Refuge",
    description: "A maze-marked doorway where Minotaur wardens shelter.",
    kind: { type: "landmark", landmark: "refuge" },
    guard: { label: "Refuge wardens", army: [{ creatureId: "minotaur", count: 2 }, { creatureId: "labyrinth_warden", count: 1 }], reward: { resources: { gold: 1500 }, entitlementIds: ["covenant.minotaur.m03"] }, battlefield: "plateau" },
    objectiveIds: ["m03_labyrinth"]
  },
  {
    id: "m03_cyclops_cache",
    anchorId: "m03_cyclops_cache",
    coord: { q: 18, r: 17 },
    name: "Cyclops Quarry",
    description: "A boulder-strewn quarry held by a lone Cyclops.",
    kind: { type: "landmark", landmark: "quarry_cache" },
    guard: { label: "Quarry Cyclops", army: [{ creatureId: "cyclops", count: 1 }], reward: { resources: { crystal: 4 } }, battlefield: "plateau" },
    objectiveIds: ["m03_cyclops_cache"]
  },
  { id: "m03_ward_gate", anchorId: "m03_ward_gate", coord: { q: 21, r: 10 }, name: "Ward Gate", description: "A sealed rock arch. Both relays must be active to open it.", kind: { type: "gate", openWhenFlags: ["relay_north", "relay_south"] }, objectiveIds: ["m03_ward_gate"] },
  {
    id: "m03_beacon",
    anchorId: "m03_beacon",
    coord: { q: 26, r: 10 },
    name: "Storm Beacon",
    description: "The great beacon in an open ceremonial clearing. Its lens is missing.",
    kind: {
      type: "activation",
      label: "beacon",
      cost: { gold: 500, crystal: 3, favor: 5 },
      requirements: [
        { type: "mission_flag", flag: "relay_north" },
        { type: "mission_flag", flag: "relay_south" },
        { type: "mission_flag", flag: "lens_recovered" }
      ],
      reward: { questXp: 2500 },
      completesMission: true,
      confirmText: "Light the Storm Beacon? This completes The Three Beacons."
    },
    guard: {
      label: "Melas and the storm guard",
      army: [
        { creatureId: "stormforged_cyclops", count: 1 },
        { creatureId: "labyrinth_warden", count: 2 },
        { creatureId: "veteran_peltast", count: 6 }
      ],
      commander: {
        heroDefinitionId: "melas",
        name: "Melas",
        classId: "champion",
        level: 4,
        attributes: { attack: 4, defense: 3, power: 1, knowledge: 1 },
        skills: [
          { skillId: "offense", rank: 2 },
          { skillId: "tactics", rank: 1 },
          { skillId: "fortune", rank: 1 }
        ],
        spellbook: true,
        spellIds: ["spark"],
        mana: 10,
        portraitAssetId: "hero.greek.melas.portrait"
      },
      reward: { flags: ["lens_recovered"] },
      battlefield: "beacon_clearing"
    },
    objectiveIds: ["m03_melas", "m03_restore"]
  }
];
var M03 = {
  id: "three_beacons_m03",
  scenarioId: "three_beacons_m03",
  campaignId: "three_beacons",
  order: 3,
  name: "The Storm Beacon",
  subtitle: "Mission 3 \u2014 Reclaim",
  summary: "Melas holds the great beacon\u2019s lens on the storm plateau. Choose a crossing, activate both relays to unseal the ward gate, defeat Melas and light the last beacon.",
  mapTemplateId: "three_beacons_m03_v1",
  soundscape: "storm_plateau",
  targetPlaytime: "20\u201330 minutes (target, unmeasured)",
  newDecisions: ["Navigate a hostile patrol", "Activate two relays", "Combine unit roles"],
  xpCap: 9999,
  xpCapLevel: 7,
  briefing: [
    P("Melas", "A single beacon can command an entire coast. Why should I give that power back?"),
    P("Alexios", "Because it was built to guide people home, not make them kneel.")
  ],
  victory: [P("Thaleia", "Three lights. One coast. We can build the rest together.")],
  storyScenes: [
    {
      id: "m03_approach_open",
      trigger: { type: "objective_completed", objectiveId: "m03_approach" },
      lines: [
        P("Alexios", "The crossing is open. Both relays are within reach now."),
        P("Ione", "Light them both. The ward gate answers only to the whole signal.")
      ]
    },
    {
      id: "m03_gate_open",
      trigger: { type: "objective_completed", objectiveId: "m03_ward_gate" },
      lines: [P("Melas", "So the gate opens for you. Come up, then. The storm has been waiting.")]
    },
    {
      id: "m03_melas_threat",
      trigger: { type: "battle_started", siteId: "m03_beacon" },
      lines: [
        P("Melas", "You lit two little fires and think the coast is yours. I kept this beacon when the council fled."),
        P("Melas", "Turn back now and you keep your soldiers. Take one more step and the storm takes them."),
        P("Alexios", "The light was never yours to keep, Melas.")
      ]
    },
    {
      id: "m03_lens",
      trigger: { type: "site_cleared", siteId: "m03_beacon" },
      lines: [
        P("Melas", "Take the lens, then. See how long the coast remembers who lit it."),
        P("Alexios", "Long enough to build something better.")
      ]
    },
    {
      id: "m03_losses",
      trigger: { type: "casualties", minLost: 8 },
      lines: [P("Thaleia", "Highwatch\u2019s healers are full, Alexios. The beacon matters \u2014 but so do the people carrying it there.")]
    }
  ],
  debriefPolicy: ["The Three Beacons is complete. Replays run in a separate practice branch and cannot change this campaign record."],
  player: {
    playerId: "player",
    name: "Highwatch",
    pantheonId: "greek",
    wallet: { gold: 15e3, wood: 30, stone: 35, crystal: 12, favor: 10 },
    town: {
      townId: "highwatch",
      siteId: "m03_town",
      name: "Highwatch",
      archetypeId: "greek_polis",
      buildings: [
        "village_hall",
        "town_hall",
        "tavern",
        "fort",
        "citadel",
        "barracks",
        "barracks_up",
        "peltast_range",
        "peltast_range_up",
        "market",
        "workshop",
        "training_court",
        "temple_1",
        "temple_2",
        "sanctum_1",
        "sanctum_2",
        "griffin_aerie",
        "griffin_aerie_up",
        "adept_house"
      ],
      population: { hoplite: 14, peltast: 9, cavalry: 4, griffin: 7, temple_adept: 3 },
      covenants: ["griffin"]
    },
    hero: {
      heroId: "alexios",
      definitionId: "alexios",
      classId: "strategos",
      defaults: { level: 4, xp: 3400, attributes: { attack: 2, defense: 3, power: 1, knowledge: 3 }, skills: [{ skillId: "leadership", rank: 1 }, { skillId: "offense", rank: 1 }, { skillId: "armorer", rank: 1 }], spellbook: false },
      army: [
        { creatureId: "veteran_hoplite", count: 40 },
        { creatureId: "veteran_peltast", count: 16 },
        { creatureId: "cavalry", count: 4 },
        { creatureId: "windcrest_griffin", count: 2 },
        { creatureId: "temple_adept", count: 2 }
      ],
      startTownId: "highwatch"
    }
  },
  hostilePlayer: { playerId: "melas_raiders", name: "Melas\u2019s Raiders" },
  purchasableBuildingIds: ["training_court_up", "adept_house_up", "labyrinth", "labyrinth_up", "sanctum_3"],
  // Documented campaign rules: no pantheon signatures, first minor choice only (Athena OR Ares).
  signatureMechanics: false,
  committableGodIds: ["athena", "ares"],
  heroHiringEnabled: false,
  heroHiringDisabledReason: "Alexios leads this expedition alone. Hero hiring is disabled in The Three Beacons.",
  sites: M03_SITES,
  objectives: M03_OBJECTIVES,
  hostileHeroes: [
    {
      commander: {
        heroDefinitionId: "scout_captain",
        name: "Scout Captain",
        classId: "champion",
        level: 2,
        attributes: { attack: 3, defense: 2, power: 1, knowledge: 1 },
        skills: [
          { skillId: "offense", rank: 1 },
          { skillId: "tactics", rank: 1 }
        ],
        spellbook: false,
        spellIds: [],
        mana: 10,
        portraitAssetId: "hero.greek.scout_captain.portrait"
      },
      startCoord: { q: 17, r: 10 },
      army: [
        { creatureId: "hoplite", count: 12 },
        { creatureId: "peltast", count: 6 },
        { creatureId: "cavalry", count: 2 }
      ],
      ai: {
        profile: "patrol",
        waypoints: [
          { q: 15, r: 8 },
          { q: 18, r: 10 },
          { q: 15, r: 12 },
          { q: 17, r: 10 }
        ],
        regionMinQ: 13,
        regionMaxQ: 20,
        attackThreshold: { numerator: 11, denominator: 10 }
      }
    }
  ],
  helpTopics: [
    { id: "patrol", title: "The plateau patrol", text: "The Scout Captain takes one ordinary turn after yours each day, cannot see through fog and never leaves the middle plateau." },
    { id: "relays", title: "Relays and the ward gate", text: "Either crossing reaches both relays. Only both relays together open the ward gate." }
  ],
  protectedHeroFailure: true,
  thumbnailAssetId: "mission.three_beacons.m03.thumbnail"
};
var THREE_BEACONS_MISSIONS = [M01, M02, M03];
var THREE_BEACONS = {
  id: "three_beacons",
  name: "The Three Beacons",
  tagline: "Restore. Ally. Reclaim.",
  summary: "A storm has extinguished the three signal beacons protecting the coast of Asterion. Lead Alexios through three short linked missions to reconnect the coast before its settlements abandon one another.",
  pantheonId: "greek",
  startingGodOptions: ["zeus"],
  startingGodNote: "Zeus is the fixed patron of this campaign. Your first minor-god choice \u2014 Athena or Ares \u2014 comes in Mission 2.",
  missionIds: [M01.id, M02.id, M03.id],
  heroDefinitionId: "alexios",
  carryoverPolicy: [
    { category: "Hero identity, XP, skills, primary growth", policy: "Preserved (after the mission\u2019s displayed XP cap)" },
    { category: "Spellbook, spells, equipment, backpack", policy: "Preserved" },
    { category: "Zeus and Athena/Ares commitment", policy: "Preserved" },
    { category: "Hero mana and movement", policy: "Refilled to the new mission\u2019s full budget" },
    { category: "Army, wallet, towns, pools, mines", policy: "Replaced by the next expedition manifest" },
    { category: "Fog, local quest flags, enemies, day", policy: "Reset to the mission\u2019s initial state" }
  ],
  status: "playable",
  thumbnailAssetId: "campaign.three_beacons.thumbnail",
  epilogue: [
    P("Thaleia", "From the Outer Lighthouse to the storm plateau, the coast can see itself again. Tonight the first ships since the storm came into Asterion."),
    P("Ione", "The Griffins circled the pass beacon at dusk. They have not done that in a generation."),
    P("Alexios", "Then the work begins. A light only shows the way \u2014 people still have to walk it."),
    P("Thaleia", "Then we walk it together.")
  ]
};
var COMING_SOON_CAMPAIGNS = [];

// ../pantheon_realms/packages/content/src/campaign/winterOath.ts
var a = (id, q, r2) => ({ id, coord: { q, r: r2 } });
var WINTER_OATH_TEMPLATES = [
  {
    id: "winter_oath_m01_v1",
    version: 1,
    width: 20,
    height: 14,
    goldenSeed: 270101,
    barriers: [{ q: 10, terrain: "water", openings: [{ q: 10, r: 8 }] }],
    anchors: [
      a("m01_town", 3, 7),
      a("m01_sawmill", 4, 3),
      a("m01_quarry", 5, 11),
      a("m01_longship", 7, 5),
      a("m01_wolf_camp", 8, 2),
      a("m01_ford", 10, 8),
      a("m01_cairn", 14, 11),
      a("m01_rune_stone", 16, 7)
    ],
    roadEdges: [
      ["m01_town", "m01_ford"],
      ["m01_ford", "m01_rune_stone"],
      ["m01_town", "m01_sawmill"],
      ["m01_town", "m01_quarry"],
      ["m01_town", "m01_longship"],
      ["m01_sawmill", "m01_wolf_camp"],
      ["m01_rune_stone", "m01_cairn"]
    ],
    biome: "fjord"
  },
  {
    id: "winter_oath_m02_v1",
    version: 1,
    width: 24,
    height: 16,
    goldenSeed: 270202,
    barriers: [{ q: 12, terrain: "water", openings: [{ q: 12, r: 8 }] }],
    anchors: [
      a("m02_town", 3, 8),
      a("m02_sawmill", 4, 4),
      a("m02_quarry", 5, 12),
      a("m02_watch_hill", 8, 5),
      a("m02_lodge", 9, 2),
      a("m02_wolf_camp", 8, 12),
      a("m02_bridge", 12, 8),
      a("m02_lair", 17, 3),
      a("m02_crystal", 16, 13),
      a("m02_rune_stone", 21, 8)
    ],
    roadEdges: [
      ["m02_town", "m02_bridge"],
      ["m02_bridge", "m02_rune_stone"],
      ["m02_town", "m02_sawmill"],
      ["m02_town", "m02_quarry"],
      ["m02_town", "m02_watch_hill"],
      ["m02_watch_hill", "m02_lodge"],
      ["m02_quarry", "m02_wolf_camp"],
      ["m02_bridge", "m02_lair"],
      ["m02_rune_stone", "m02_crystal"]
    ],
    // The White Pack's hunting ground east of the river.
    patrolLoop: [
      { q: 16, r: 7 },
      { q: 18, r: 8 },
      { q: 17, r: 10 },
      { q: 15, r: 9 }
    ],
    biome: "tundra"
  },
  {
    id: "winter_oath_m03_v1",
    version: 1,
    width: 26,
    height: 18,
    goldenSeed: 270303,
    barriers: [
      { q: 13, terrain: "mountain", openings: [{ q: 13, r: 9 }] },
      { q: 20, terrain: "water", openings: [{ q: 20, r: 9 }] }
    ],
    anchors: [
      a("m03_town", 3, 9),
      a("m03_sawmill", 5, 5),
      a("m03_quarry", 5, 13),
      a("m03_cache", 8, 15),
      a("m03_pass", 13, 9),
      a("m03_aerie", 17, 4),
      a("m03_crystal", 16, 9),
      a("m03_hearth", 15, 13),
      a("m03_troll_home", 17, 15),
      a("m03_bridge", 20, 9),
      a("m03_rune_stone", 23, 9)
    ],
    roadEdges: [
      ["m03_town", "m03_pass"],
      ["m03_pass", "m03_crystal"],
      ["m03_crystal", "m03_bridge"],
      ["m03_bridge", "m03_rune_stone"],
      ["m03_pass", "m03_aerie"],
      ["m03_pass", "m03_hearth"],
      ["m03_hearth", "m03_troll_home"],
      ["m03_town", "m03_sawmill"],
      ["m03_town", "m03_quarry"],
      ["m03_quarry", "m03_cache"]
    ],
    biome: "tundra"
  },
  {
    id: "winter_oath_m04_v1",
    version: 1,
    width: 28,
    height: 18,
    goldenSeed: 270404,
    barriers: [
      { q: 11, terrain: "water", openings: [{ q: 11, r: 9 }] },
      { q: 19, terrain: "water", openings: [{ q: 19, r: 9 }] }
    ],
    anchors: [
      a("m04_town", 3, 9),
      a("m04_sawmill", 5, 5),
      a("m04_quarry", 5, 13),
      a("m04_wanderer", 7, 3),
      a("m04_knarr", 8, 15),
      a("m04_landing", 11, 9),
      a("m04_nail_ship", 14, 9),
      a("m04_cairn_north", 15, 4),
      a("m04_cairn_south", 15, 14),
      a("m04_nest", 17, 16),
      a("m04_fog_gate", 19, 9),
      a("m04_well", 24, 9)
    ],
    roadEdges: [
      ["m04_town", "m04_landing"],
      ["m04_landing", "m04_nail_ship"],
      ["m04_landing", "m04_cairn_north"],
      ["m04_landing", "m04_cairn_south"],
      ["m04_cairn_north", "m04_fog_gate"],
      ["m04_cairn_south", "m04_fog_gate"],
      ["m04_fog_gate", "m04_well"],
      ["m04_cairn_south", "m04_nest"],
      ["m04_town", "m04_sawmill"],
      ["m04_town", "m04_quarry"],
      ["m04_town", "m04_wanderer"],
      ["m04_quarry", "m04_knarr"]
    ],
    patrolLoop: [
      { q: 13, r: 6 },
      { q: 17, r: 8 },
      { q: 13, r: 12 },
      { q: 16, r: 10 }
    ],
    biome: "fjord"
  },
  {
    id: "winter_oath_m05_v1",
    version: 1,
    width: 30,
    height: 20,
    goldenSeed: 270505,
    barriers: [{ q: 15, terrain: "water", openings: [{ q: 15, r: 6 }, { q: 15, r: 13 }] }],
    anchors: [
      a("m05_town", 3, 10),
      a("m05_sawmill", 5, 6),
      a("m05_quarry", 5, 14),
      a("m05_gold", 8, 16),
      a("m05_andvari", 9, 3),
      a("m05_north_ford", 15, 6),
      a("m05_south_ford", 15, 13),
      a("m05_crystal", 20, 10),
      a("m05_rival_quarry", 24, 5),
      a("m05_oath_stone", 26, 7),
      a("m05_rival_town", 26, 10),
      a("m05_rival_sawmill", 24, 15)
    ],
    roadEdges: [
      ["m05_town", "m05_north_ford"],
      ["m05_town", "m05_south_ford"],
      ["m05_north_ford", "m05_rival_town"],
      ["m05_south_ford", "m05_rival_town"],
      ["m05_rival_town", "m05_oath_stone"],
      ["m05_rival_town", "m05_rival_quarry"],
      ["m05_rival_town", "m05_rival_sawmill"],
      ["m05_north_ford", "m05_crystal"],
      ["m05_town", "m05_sawmill"],
      ["m05_town", "m05_quarry"],
      ["m05_quarry", "m05_gold"],
      ["m05_sawmill", "m05_andvari"]
    ],
    biome: "tundra"
  },
  {
    id: "winter_oath_m06_v1",
    version: 1,
    width: 30,
    height: 20,
    goldenSeed: 270606,
    barriers: [
      { q: 11, terrain: "mountain", openings: [{ q: 11, r: 6 }, { q: 11, r: 13 }] },
      { q: 22, terrain: "mountain", openings: [{ q: 22, r: 10 }] }
    ],
    anchors: [
      a("m06_town", 3, 10),
      a("m06_sawmill", 5, 6),
      a("m06_quarry", 5, 14),
      a("m06_gold", 7, 16),
      a("m06_north_crossing", 11, 6),
      a("m06_south_crossing", 11, 13),
      a("m06_frozen_child", 15, 3),
      a("m06_refuge", 16, 10),
      a("m06_nest", 17, 17),
      a("m06_glacier_gate", 22, 10),
      a("m06_horn", 26, 10)
    ],
    roadEdges: [
      ["m06_town", "m06_north_crossing"],
      ["m06_town", "m06_south_crossing"],
      ["m06_north_crossing", "m06_refuge"],
      ["m06_south_crossing", "m06_refuge"],
      ["m06_refuge", "m06_glacier_gate"],
      ["m06_glacier_gate", "m06_horn"],
      ["m06_north_crossing", "m06_frozen_child"],
      ["m06_south_crossing", "m06_nest"],
      ["m06_town", "m06_sawmill"],
      ["m06_town", "m06_quarry"],
      ["m06_quarry", "m06_gold"]
    ],
    biome: "tundra"
  },
  {
    id: "winter_oath_m07_v1",
    version: 1,
    width: 32,
    height: 20,
    goldenSeed: 270707,
    barriers: [
      { q: 10, terrain: "mountain", openings: [{ q: 10, r: 6 }, { q: 10, r: 13 }] },
      { q: 22, terrain: "mountain", openings: [{ q: 22, r: 10 }] },
      { q: 27, terrain: "mountain", openings: [{ q: 27, r: 10 }] }
    ],
    anchors: [
      a("m07_town", 3, 10),
      a("m07_sawmill", 5, 6),
      a("m07_quarry", 5, 14),
      a("m07_north_crossing", 10, 6),
      a("m07_south_crossing", 10, 13),
      a("m07_stone_north", 15, 4),
      a("m07_stone_south", 15, 15),
      a("m07_nest", 18, 17),
      a("m07_barrow_gate", 22, 10),
      a("m07_cairn", 25, 6),
      a("m07_jarl_hall", 27, 10),
      a("m07_barrow_door", 29, 8),
      a("m07_oath_mound", 29, 12)
    ],
    roadEdges: [
      ["m07_town", "m07_north_crossing"],
      ["m07_town", "m07_south_crossing"],
      ["m07_north_crossing", "m07_stone_north"],
      ["m07_south_crossing", "m07_stone_south"],
      ["m07_stone_north", "m07_stone_south"],
      ["m07_stone_north", "m07_barrow_gate"],
      ["m07_stone_south", "m07_barrow_gate"],
      ["m07_barrow_gate", "m07_jarl_hall"],
      ["m07_barrow_gate", "m07_cairn"],
      ["m07_jarl_hall", "m07_barrow_door"],
      ["m07_jarl_hall", "m07_oath_mound"],
      ["m07_stone_south", "m07_nest"],
      ["m07_town", "m07_sawmill"],
      ["m07_town", "m07_quarry"]
    ],
    patrolLoop: [
      { q: 13, r: 8 },
      { q: 18, r: 10 },
      { q: 13, r: 12 },
      { q: 16, r: 10 }
    ],
    biome: "tundra"
  }
];
var WINTER_OATH_ENTITLEMENTS = [
  { id: "covenant.norse_frost_troll.wo3", name: "Frost Troll Covenant", kind: "covenant", familyId: "norse_frost_troll", summary: "The troll-oath of Troll-Home allows a Troll Cave to be built in one town." },
  { id: "covenant.norse_jotunn.wo6", name: "Jotunn Covenant", kind: "covenant", familyId: "norse_jotunn", summary: "The freed giants of Hrimgard allow a Jotunn Camp to be built in one town." }
];
var P2 = (speaker2, text, slug2 = speaker2.toLowerCase().replace(/^the /, "").replace(/[^a-z]+/g, "_")) => ({
  speaker: speaker2,
  portraitAssetId: `hero.norse.${slug2}.portrait`,
  text
});
var HERVOR = (t) => P2("Hervor", t);
var EYDIS = (t) => P2("Eydis", t);
var SKEGGI = (t) => P2("Skeggi", t);
var JARL = (t) => P2("The Grey Jarl", t, "grey_jarl");
var resSite2 = (id, q, r2, siteType, name) => {
  const table = {
    sawmill: { name: "Sawmill", resource: "wood", dailyYield: 2, description: "An unowned timber camp. Capture for +2 Wood per day." },
    quarry: { name: "Quarry", resource: "stone", dailyYield: 2, description: "An unowned quarry. Capture for +2 Stone per day." },
    gold_mine: { name: "Gold Mine", resource: "gold", dailyYield: 1e3, description: "An unowned mine. Capture for +1,000 Gold per day." },
    crystal_deposit: { name: "Crystal Deposit", resource: "crystal", dailyYield: 1, description: "An unowned crystal outcrop. Capture for +1 Crystal per day." }
  }[siteType];
  return { id, anchorId: id, coord: { q, r: r2 }, name: name ?? table.name, description: table.description, kind: { type: "resource_site", siteType, resource: table.resource, dailyYield: table.dailyYield } };
};
var hervor = (defaults, army, startTownId) => ({
  heroId: "hervor",
  definitionId: "norse_hervor",
  classId: "volva",
  defaults,
  army,
  startTownId
});
var DEBRIEF_POLICY2 = [
  "Hervor keeps her level, experience (up to the displayed cap), skills, spellbook, spells and equipment.",
  "Odin and every god she has committed to carry into the next mission.",
  "Troops, resources, towns, mines and recruitment pools stay behind to hold the north.",
  "The next mission begins with its declared war-band and wallet."
];
var COMMON = {
  campaignId: "winter_oath",
  signatureMechanics: true,
  features: { expandedContent: true, heroSpecialties: true },
  heroHiringEnabled: false,
  heroHiringDisabledReason: "Hervor carries the oath alone. Hero hiring is disabled in The Winter Oath.",
  protectedHeroFailure: true
};
var FIRST_GODS = ["norse_thor", "norse_tyr"];
var ALL_GODS = ["norse_thor", "norse_tyr", "norse_freyja", "norse_heimdall", "norse_hel"];
var M01_OBJECTIVES2 = [
  { id: "m01_recruit", title: "Raise the barrow-watch", description: "Recruit at least 10 Draugar during this mission. Starting troops and creatures that join on the map do not count.", category: "primary", initialStatus: "active", condition: { type: "counter_at_least", counter: "recruited:norse_draugr", value: 10 }, hint: "Visit Kaldvik and open Recruitment at the Draugr Barrow." },
  { id: "m01_train", title: "Bind a deathless guard", description: "Train at least 8 Draugar into Deathless Draugar.", category: "primary", initialStatus: "locked", requires: ["m01_recruit"], condition: { type: "counter_at_least", counter: "trained:norse_draugr", value: 8 }, hint: "Build the Deathless Barrow, then train Draugar in Kaldvik. Training costs the price difference and uses no population." },
  { id: "m01_ford", title: "Clear the frozen ford", description: "Drive off the {army:norse_frost_wolf=8} that hold the only ford over the river.", category: "primary", initialStatus: "locked", requires: ["m01_train"], condition: { type: "site_cleared", siteId: "m01_ford" }, markerSiteId: "m01_ford" },
  { id: "m01_barrow_guard", title: "Break the barrow-guard", description: "Defeat the {army:norse_draugr=14,norse_deathless_draugr=4} standing around the Rune Stone.", category: "primary", initialStatus: "locked", requires: ["m01_ford"], condition: { type: "site_cleared", siteId: "m01_rune_stone" }, markerSiteId: "m01_rune_stone" },
  { id: "m01_recut", title: "Re-cut the rune", description: "At the Rune Stone, with its guard broken and both muster objectives met, pay 300 Gold, 3 Stone and 1 Crystal to cut the rune again.", category: "primary", initialStatus: "locked", requires: ["m01_barrow_guard"], condition: { type: "site_activated", siteId: "m01_rune_stone" }, markerSiteId: "m01_rune_stone" },
  { id: "m01_longship", title: "The frozen longship (optional)", description: "Visit the longship caught in the fjord ice.", category: "optional", initialStatus: "active", condition: { type: "site_visited", siteId: "m01_longship" }, markerSiteId: "m01_longship" }
];
var M01_SITES2 = [
  { id: "m01_town", anchorId: "m01_town", coord: { q: 3, r: 7 }, name: "Kaldvik", description: "Hervor\u2019s fjord-hold, below its own barrow.", kind: { type: "town", townId: "kaldvik" } },
  resSite2("m01_sawmill", 4, 3, "sawmill"),
  resSite2("m01_quarry", 5, 11, "quarry"),
  {
    id: "m01_longship",
    anchorId: "m01_longship",
    coord: { q: 7, r: 5 },
    name: "Frozen Longship",
    description: "A longship caught in the fjord ice since autumn. Its crew never came ashore.",
    kind: {
      type: "map_event",
      title: "The Frozen Longship",
      text: "The ice has the ship to the rails. In the hold: barrels of salt fish, a chest of trade silver \u2014 and four drowned oarsmen still at their benches, eyes open, waiting for a word.",
      options: [
        { label: "Salvage the cargo", summary: "+600 Gold and +4 Wood.", reward: { resources: { gold: 600, wood: 4 } } },
        { label: "Speak the rune-word to the crew", summary: "4 Draugar join Hervor\u2019s army.", reward: { creatures: [{ creatureId: "norse_draugr", count: 4 }] } }
      ]
    },
    objectiveIds: ["m01_longship"]
  },
  { id: "m01_wolf_camp", anchorId: "m01_wolf_camp", coord: { q: 8, r: 2 }, name: "Birchwood Wolf Camp", description: "Half-tame frost wolves that follow a hold which feeds them.", kind: { type: "creature_camp", creatureId: "norse_frost_wolf", weeklyGrowth: 3, initialStock: 5 } },
  {
    id: "m01_ford",
    anchorId: "m01_ford",
    coord: { q: 10, r: 8 },
    name: "Frozen Ford",
    description: "The only crossing of the river. Frost wolves have made it their den.",
    kind: { type: "crossing" },
    guard: { label: "Ford wolves", army: [{ creatureId: "norse_frost_wolf", count: 8 }], reward: { resources: { gold: 300, wood: 3, stone: 3 } }, battlefield: "coast_road" },
    objectiveIds: ["m01_ford"]
  },
  { id: "m01_cairn", anchorId: "m01_cairn", coord: { q: 14, r: 11 }, name: "Snowed-in Cairn", description: "A hunter\u2019s cairn with a cache under the stones.", kind: { type: "pickup", reward: { resources: { gold: 400, crystal: 1 } } } },
  {
    id: "m01_rune_stone",
    anchorId: "m01_rune_stone",
    coord: { q: 16, r: 7 },
    name: "Rune Stone of Kaldvik",
    description: "The headland stone whose rune kept the hold\u2019s dead asleep. The rune has worn smooth.",
    kind: {
      type: "activation",
      label: "beacon",
      cost: { gold: 300, stone: 3, crystal: 1 },
      requirements: [
        { type: "objective_completed", objectiveId: "m01_recruit" },
        { type: "objective_completed", objectiveId: "m01_train" }
      ],
      reward: { questXp: 900 },
      completesMission: true,
      confirmText: "Cut the rune on the Rune Stone of Kaldvik? This completes Barrow Light."
    },
    guard: {
      label: "Barrow-guard",
      army: [
        { creatureId: "norse_draugr", count: 14 },
        { creatureId: "norse_deathless_draugr", count: 4 }
      ],
      reward: { resources: { gold: 500 }, artifactIds: ["rune_marked_sword"] },
      battlefield: "beacon_clearing"
    },
    objectiveIds: ["m01_barrow_guard", "m01_recut"]
  }
];
var M012 = {
  ...COMMON,
  id: "winter_oath_m01",
  scenarioId: "winter_oath_m01",
  order: 1,
  name: "Barrow Light",
  subtitle: "Mission 1 \u2014 Restore",
  summary: "Spring is two months late and Kaldvik\u2019s barrow has cracked open. Raise and bind a watch from the barrow, clear the frozen ford and cut the headland rune again.",
  mapTemplateId: "winter_oath_m01_v1",
  soundscape: "fjord",
  targetPlaytime: "15\u201320 minutes (target, unmeasured)",
  newDecisions: ["Recruit and train", "Berserk Fury", "Learn runes at the Rune Circle", "A one-time choice"],
  xpCap: 3199,
  xpCapLevel: 3,
  briefing: [
    EYDIS("Spring is two months late. The fjord is still ice to the skerries, and last night the hold\u2019s own barrow cracked open. The dead in it are standing up."),
    HERVOR("Then the rune on the headland has failed. The dead answer whoever holds a rune-oath \u2014 raise a watch from the barrow, and I will cut the rune again."),
    SKEGGI("Mind the ford on the way. Something has been crossing it at night, and it does not leave a man\u2019s tracks.")
  ],
  victory: [EYDIS("The rune holds. For tonight the dead in our hill sleep. The others \u2014 the ones walking south from the mountains \u2014 do not.")],
  storyScenes: [
    {
      id: "m01_ford_open",
      trigger: { type: "site_cleared", siteId: "m01_ford" },
      lines: [
        SKEGGI("Those wolves were not hunting. They were herding \u2014 keeping the hold away from the stone."),
        HERVOR("Then someone wants the stone left alone. Good. That tells me where to go.")
      ]
    },
    {
      id: "m01_barrow_battle",
      trigger: { type: "battle_started", siteId: "m01_rune_stone" },
      lines: [
        JARL("Little seeress. What you buried under that stone is mine. My dead will carry it home."),
        HERVOR("Your dead can try. Mine are standing in front of them.")
      ]
    },
    {
      id: "m01_sword",
      trigger: { type: "site_cleared", siteId: "m01_rune_stone" },
      lines: [
        HERVOR("Nine winters ago I took this sword from a mound in the north and hid it here, under the rune, so it would sleep. It is awake."),
        JARL("You carry what is mine. Every step you take with it, my winter follows."),
        SKEGGI("Cut the rune again, Hervor. Quickly \u2014 and keep the blade close.")
      ]
    },
    {
      id: "m01_losses",
      trigger: { type: "casualties", minLost: 4 },
      lines: [
        EYDIS("I count the living and I count the dead, Hervor. Tonight the second list grew. Bring more of them home."),
        HERVOR("I hear you, Eydis. Even the dead deserve a better captain than a careless one.")
      ]
    }
  ],
  debriefPolicy: DEBRIEF_POLICY2,
  player: {
    playerId: "player",
    name: "Kaldvik",
    pantheonId: "norse",
    wallet: { gold: 5e3, wood: 12, stone: 18, crystal: 2, favor: 0 },
    town: {
      townId: "kaldvik",
      siteId: "m01_town",
      name: "Kaldvik",
      archetypeId: "norse_hold",
      buildings: ["norse_longhouse", "norse_mead_hall", "norse_palisade", "norse_barrow", "norse_rune_circle_1"],
      population: { norse_draugr: 14 },
      covenants: []
    },
    hero: hervor(
      { level: 1, xp: 0, attributes: { attack: 1, defense: 1, power: 2, knowledge: 2 }, skills: [{ skillId: "wisdom", rank: 1 }], spellbook: true },
      [
        { creatureId: "norse_draugr", count: 18 },
        { creatureId: "norse_frost_wolf", count: 6 }
      ],
      "kaldvik"
    )
  },
  purchasableBuildingIds: ["norse_jarls_hall", "norse_trading_post", "norse_barrow_up", "norse_wolf_den", "norse_smithy", "norse_hof_1"],
  committableGodIds: FIRST_GODS,
  sites: M01_SITES2,
  objectives: M01_OBJECTIVES2,
  hostileHeroes: [],
  helpTopics: [
    { id: "in_order", title: "Steps in order", text: "Each primary step opens after the one before it. Work done early still counts: a step whose goal is already met completes the moment it opens." },
    { id: "berserk_fury", title: "Berserk Fury", text: "The Norse signature: a stack of yours with at most half of its starting creatures alive gains +2 Attack. A battered stack is not a beaten one." },
    { id: "rune_circle", title: "The Rune Circle", text: "A v\xF6lva learns every spell of the Rune Circle\u2019s library when she visits the hold. The Rune Circle\u2019s runes change from hold to hold." },
    { id: "upgrade_vs_training", title: "Dwelling upgrade vs. troop training", text: "Upgrading a dwelling unlocks the upgraded form. Training converts existing troops in town for the price difference and uses no population." },
    { id: "map_events", title: "One-time choices", text: "Some places offer a choice the first time a hero arrives. The result of each option is shown before you choose, and the choice cannot be taken back." }
  ],
  thumbnailAssetId: "mission.winter_oath.m01.thumbnail"
};
var M02_OBJECTIVES2 = [
  { id: "m02_den", title: "Wolves of our own", description: "Recruit at least 8 Frost Wolves in Birkaby (build the Wolf Den first).", category: "primary", initialStatus: "active", condition: { type: "counter_at_least", counter: "recruited:norse_frost_wolf", value: 8 }, hint: "Build the Wolf Den in Birkaby, then recruit. Wolves bought at the camp do not count." },
  { id: "m02_trail", title: "Find the pack\u2019s trail", description: "Climb the Watch-hill to see where the White Pack dens.", category: "primary", initialStatus: "locked", requires: ["m02_den"], condition: { type: "site_visited", siteId: "m02_watch_hill" }, markerSiteId: "m02_watch_hill" },
  { id: "m02_bridge", title: "Take the ice bridge", description: "Defeat the {army:norse_draugr=16,norse_deathless_draugr=6} holding the ice bridge over the Varg-river.", category: "primary", initialStatus: "locked", requires: ["m02_trail"], condition: { type: "site_cleared", siteId: "m02_bridge" }, markerSiteId: "m02_bridge" },
  { id: "m02_pack", title: "Hunt the White Pack", description: "Catch and defeat the White Pack ({army:norse_fenrir_wolf=6,norse_frost_wolf=12}) in the Varg-wood beyond the river.", category: "primary", initialStatus: "locked", requires: ["m02_bridge"], condition: { type: "hero_defeated", heroDefinitionId: "norse_white_pack" }, hint: "The pack roams near the wood\u2019s middle and only attacks a war-band it is sure it can beat. Corner it: move onto it to fight." },
  { id: "m02_recut", title: "Re-cut the Varg-wood rune", description: "With the pack broken, pay 400 Gold, 4 Stone and 1 Crystal at the Varg-wood Rune Stone.", category: "primary", initialStatus: "locked", requires: ["m02_pack"], condition: { type: "site_activated", siteId: "m02_rune_stone" }, markerSiteId: "m02_rune_stone" },
  { id: "m02_lair", title: "The wolf-mother\u2019s lair (optional)", description: "Defeat the {army:norse_fenrir_wolf=4,norse_frost_wolf=6} at the lair for 500 Gold and a Boar-crested Helm.", category: "optional", initialStatus: "active", condition: { type: "site_cleared", siteId: "m02_lair" }, markerSiteId: "m02_lair" },
  { id: "m02_lodge", title: "The hunter\u2019s lodge (optional)", description: "Visit the old hunter in the north woods.", category: "optional", initialStatus: "active", condition: { type: "site_visited", siteId: "m02_lodge" }, markerSiteId: "m02_lodge" }
];
var M02_SITES2 = [
  { id: "m02_town", anchorId: "m02_town", coord: { q: 3, r: 8 }, name: "Birkaby", description: "A grain-hold on the south road. Its jarl died in the first frost.", kind: { type: "town", townId: "birkaby" } },
  resSite2("m02_sawmill", 4, 4, "sawmill"),
  resSite2("m02_quarry", 5, 12, "quarry"),
  { id: "m02_watch_hill", anchorId: "m02_watch_hill", coord: { q: 8, r: 5 }, name: "Watch-hill", description: "From the top, the Varg-wood beyond the river lies open.", kind: { type: "watchtower", revealSiteIds: ["m02_lair", "m02_rune_stone"] }, objectiveIds: ["m02_trail"] },
  {
    id: "m02_lodge",
    anchorId: "m02_lodge",
    coord: { q: 9, r: 2 },
    name: "Hunter\u2019s Lodge",
    description: "An old hunter who has outlived three jarls lives here with his dogs.",
    kind: {
      type: "map_event",
      title: "The Hunter\u2019s Lodge",
      text: "The old man has hunted the Varg-wood for fifty winters. \u201CThat pack is not hungry,\u201D he says. \u201CIt is obedient. Something tells it where to run.\u201D On the wall hang a pair of birch skis, oiled and sound.",
      options: [
        { label: "Buy the hunter\u2019s skis", summary: "Pay 2,000 Gold for the Skis of Ullr (+15% daily land movement).", cost: { gold: 2e3 }, reward: { artifactIds: ["skis_of_ullr"] } },
        { label: "Share his fire and his hunt-lore", summary: "Hervor gains +1 Knowledge.", reward: { attributes: { knowledge: 1 } } }
      ]
    },
    objectiveIds: ["m02_lodge"]
  },
  { id: "m02_wolf_camp", anchorId: "m02_wolf_camp", coord: { q: 8, r: 12 }, name: "Southmoor Wolf Camp", description: "Frost wolves that have not joined the White Pack.", kind: { type: "creature_camp", creatureId: "norse_frost_wolf", weeklyGrowth: 3, initialStock: 4 } },
  {
    id: "m02_bridge",
    anchorId: "m02_bridge",
    coord: { q: 12, r: 8 },
    name: "Ice Bridge",
    description: "A bridge of river-ice thick enough for a war-band. The Jarl\u2019s dead keep it.",
    kind: { type: "crossing" },
    guard: {
      label: "Bridge-dead",
      army: [
        { creatureId: "norse_draugr", count: 16 },
        { creatureId: "norse_deathless_draugr", count: 6 }
      ],
      reward: { resources: { gold: 600, favor: 3 } },
      battlefield: "ridge_pass"
    },
    objectiveIds: ["m02_bridge"]
  },
  {
    id: "m02_lair",
    anchorId: "m02_lair",
    coord: { q: 17, r: 3 },
    name: "Wolf-mother\u2019s Lair",
    description: "A den under a fallen spruce, littered with the bones of reindeer \u2014 and a helm.",
    kind: { type: "landmark", landmark: "refuge" },
    guard: {
      label: "Lair wolves",
      army: [
        { creatureId: "norse_fenrir_wolf", count: 4 },
        { creatureId: "norse_frost_wolf", count: 6 }
      ],
      reward: { resources: { gold: 500 }, artifactIds: ["boar_crest_helm"] },
      battlefield: "grove"
    },
    markerHiddenUntilRevealed: true,
    objectiveIds: ["m02_lair"]
  },
  resSite2("m02_crystal", 16, 13, "crystal_deposit"),
  {
    id: "m02_rune_stone",
    anchorId: "m02_rune_stone",
    coord: { q: 21, r: 8 },
    name: "Varg-wood Rune Stone",
    description: "The rune that kept the wolves of the wood from the south road.",
    kind: {
      type: "activation",
      label: "beacon",
      cost: { gold: 400, stone: 4, crystal: 1 },
      requirements: [{ type: "objective_completed", objectiveId: "m02_pack" }],
      reward: { questXp: 1400 },
      completesMission: true,
      confirmText: "Cut the rune on the Varg-wood Rune Stone? This completes The White Pack."
    },
    markerHiddenUntilRevealed: true,
    objectiveIds: ["m02_recut"]
  }
];
var M022 = {
  ...COMMON,
  id: "winter_oath_m02",
  scenarioId: "winter_oath_m02",
  order: 2,
  name: "The White Pack",
  subtitle: "Mission 2 \u2014 Hunt",
  summary: "A pack of white wolves cuts the south road to Birkaby, and it runs where the Grey Jarl tells it. Raise wolves of your own, cross the Varg-river, hunt the pack down and cut the wood\u2019s rune.",
  mapTemplateId: "winter_oath_m02_v1",
  soundscape: "fjord",
  targetPlaytime: "20\u201325 minutes (target, unmeasured)",
  newDecisions: ["Hunt a wandering pack", "Use a lookout", "Buy or bargain on the road"],
  xpCap: 4599,
  xpCapLevel: 4,
  briefing: [
    EYDIS("Birkaby\u2019s grain is the only grain between here and the mountains, and no sledge has come up the south road in a month. The drivers say white wolves."),
    SKEGGI("Wolves do not cut roads. Wolves eat what they catch and move on. These wait for the next sledge."),
    HERVOR("Then they are someone\u2019s wolves. We will raise our own, find their trail, and teach them whose road it is.")
  ],
  victory: [SKEGGI("Two runes cut. Now listen, Hervor \u2014 the third stone stands high in the fells, where the Valkyries used to nest. Nobody has seen a Valkyrie there since the first frost.")],
  storyScenes: [
    {
      id: "m02_trail_found",
      trigger: { type: "site_visited", siteId: "m02_watch_hill" },
      lines: [
        HERVOR("There \u2014 past the river. The snow is trodden flat in a ring around the old stone, the way a pack walks a fold."),
        SKEGGI("They are guarding it. Which means the stone still matters.")
      ]
    },
    {
      id: "m02_pack_battle",
      trigger: { type: "battle_started", heroDefinitionId: "norse_white_pack" },
      lines: [JARL("Run, my wolves. Run her ragged. Winter is long and she is only one woman.")]
    },
    {
      id: "m02_pack_broken",
      trigger: { type: "objective_completed", objectiveId: "m02_pack" },
      lines: [
        HERVOR("The pack is broken. The ones that lived are running north \u2014 home, wherever that is for them."),
        EYDIS("Then the sledges can run south. I will send word to Birkaby\u2019s granary tonight.")
      ]
    },
    {
      id: "m02_losses",
      trigger: { type: "casualties", minLost: 6 },
      lines: [EYDIS("The wolves took more than grain from us this time, Hervor. Count them with me when you are home.")]
    }
  ],
  debriefPolicy: DEBRIEF_POLICY2,
  player: {
    playerId: "player",
    name: "Birkaby",
    pantheonId: "norse",
    wallet: { gold: 8e3, wood: 20, stone: 25, crystal: 5, favor: 5 },
    town: {
      townId: "birkaby",
      siteId: "m02_town",
      name: "Birkaby",
      archetypeId: "norse_hold",
      buildings: ["norse_longhouse", "norse_mead_hall", "norse_trading_post", "norse_palisade", "norse_barrow", "norse_barrow_up", "norse_smithy", "norse_rune_circle_1", "norse_hof_1"],
      population: { norse_draugr: 14 },
      covenants: []
    },
    hero: hervor(
      { level: 2, xp: 1100, attributes: { attack: 1, defense: 1, power: 3, knowledge: 2 }, skills: [{ skillId: "wisdom", rank: 1 }, { skillId: "armorer", rank: 1 }], spellbook: true },
      [
        { creatureId: "norse_draugr", count: 24 },
        { creatureId: "norse_deathless_draugr", count: 12 },
        { creatureId: "norse_frost_wolf", count: 8 }
      ],
      "birkaby"
    )
  },
  hostilePlayer: { playerId: "winter_host", name: "The Winter Host" },
  purchasableBuildingIds: ["norse_wolf_den", "norse_wolf_den_up", "norse_jarls_hall", "norse_storehouse", "norse_rune_circle_2", "norse_training_ground"],
  committableGodIds: FIRST_GODS,
  sites: M02_SITES2,
  objectives: M02_OBJECTIVES2,
  hostileHeroes: [
    {
      commander: {
        heroDefinitionId: "norse_white_pack",
        name: "The White Pack",
        classId: "huscarl",
        level: 1,
        attributes: { attack: 0, defense: 0, power: 0, knowledge: 0 },
        skills: [],
        spellbook: false,
        spellIds: [],
        mana: 0,
        portraitAssetId: "creature.norse.tier2.upgraded.portrait"
      },
      monster: { bounty: { gold: 800 } },
      startCoord: { q: 17, r: 8 },
      army: [
        { creatureId: "norse_fenrir_wolf", count: 6 },
        { creatureId: "norse_frost_wolf", count: 12 }
      ],
      ai: {
        profile: "patrol",
        waypoints: [
          { q: 16, r: 7 },
          { q: 18, r: 8 },
          { q: 17, r: 10 },
          { q: 15, r: 9 }
        ],
        regionMinQ: 13,
        regionMaxQ: 22,
        regionCenter: { q: 17, r: 8 },
        regionRadius: 3,
        attackThreshold: { numerator: 3, denominator: 2 }
      }
    }
  ],
  helpTopics: [
    { id: "wandering", title: "Wandering packs", text: "A wandering band stays near its hunting ground, moves after your turn and attacks only an army it judges clearly weaker. Move onto it to fight it." },
    { id: "lookout", title: "Lookouts", text: "Climbing a lookout marks distant sites on your map, so you can plan a route before you can see them." },
    { id: "camps", title: "Creature camps", text: "A camp sells its creatures to a visiting hero at their normal price. Its stock grows every week." }
  ],
  thumbnailAssetId: "mission.winter_oath.m02.thumbnail"
};
var M03_OBJECTIVES2 = [
  { id: "m03_pass", title: "Break the ice-pass", description: "Defeat the {army:norse_draugr=16,norse_deathless_draugr=6} holding the pass into the high fells.", category: "primary", initialStatus: "active", condition: { type: "site_cleared", siteId: "m03_pass" }, markerSiteId: "m03_pass" },
  { id: "m03_aerie", title: "Free the Valkyrie aerie", description: "Drive the {army:norse_frost_troll=5} out of the Valkyries\u2019 cliff-hall.", category: "primary", initialStatus: "locked", requires: ["m03_pass"], condition: { type: "site_cleared", siteId: "m03_aerie" }, markerSiteId: "m03_aerie" },
  {
    id: "m03_troll_oath",
    title: "The troll-oath",
    description: "Win the Frost Troll covenant: pay the troll-wife\u2019s blood-price at her hearth, or beat her sons at Troll-Home.",
    category: "primary",
    initialStatus: "locked",
    requires: ["m03_aerie"],
    condition: { type: "any", conditions: [{ type: "flag", flag: "troll_pact" }, { type: "site_cleared", siteId: "m03_troll_home" }] },
    hint: "Both routes give the same covenant. The fight gives experience; the bargain saves troops. Assign the covenant to Fjallhof to build a Troll Cave."
  },
  { id: "m03_pantheon", title: "A god for the fells", description: "Build Hof II and commit to Thor or Tyr (20 Favor, irreversible).", category: "primary", initialStatus: "locked", requires: ["m03_troll_oath"], condition: { type: "player_has_minor_god" }, hint: "Open the Pantheon screen once Hof II stands in Fjallhof. A god chosen earlier counts as soon as this step opens." },
  { id: "m03_valkyries", title: "Choosers on the wing", description: "Have at least 2 Battle Valkyries in Hervor\u2019s army.", category: "primary", initialStatus: "locked", requires: ["m03_pantheon"], condition: { type: "hero_army_contains", heroId: "hervor", creatureId: "norse_battle_valkyrie", count: 2 }, live: true, hint: "Build the Valkyrie Aerie and the Hall of the Chosen in Fjallhof; recruit or train Battle Valkyries with Hervor in town." },
  { id: "m03_recut", title: "Cut the high rune", description: "Cross the ice bridge and, with a god chosen and Battle Valkyries in the army, pay 500 Gold and 2 Crystal at the High Rune Stone.", category: "primary", initialStatus: "locked", requires: ["m03_valkyries"], condition: { type: "site_activated", siteId: "m03_rune_stone" }, markerSiteId: "m03_rune_stone" },
  { id: "m03_cache", title: "Herders\u2019 cache (optional)", description: "Pick up the cache the herders left when they fled.", category: "optional", initialStatus: "active", condition: { type: "site_visited", siteId: "m03_cache" }, markerSiteId: "m03_cache" }
];
var M03_SITES2 = [
  { id: "m03_town", anchorId: "m03_town", coord: { q: 3, r: 9 }, name: "Fjallhof", description: "The last hold below the high fells.", kind: { type: "town", townId: "fjallhof" } },
  resSite2("m03_sawmill", 5, 5, "sawmill"),
  resSite2("m03_quarry", 5, 13, "quarry"),
  { id: "m03_cache", anchorId: "m03_cache", coord: { q: 8, r: 15 }, name: "Herders\u2019 Cache", description: "Supplies left behind by herders who fled the trolls.", kind: { type: "pickup", reward: { resources: { gold: 700, wood: 5 } } }, objectiveIds: ["m03_cache"] },
  {
    id: "m03_pass",
    anchorId: "m03_pass",
    coord: { q: 13, r: 9 },
    name: "Ice-pass",
    description: "The only way through the fell-wall. The Jarl\u2019s dead stand in it like a door.",
    kind: { type: "crossing" },
    guard: {
      label: "Pass-dead",
      army: [
        { creatureId: "norse_draugr", count: 16 },
        { creatureId: "norse_deathless_draugr", count: 6 }
      ],
      reward: { resources: { gold: 750, favor: 5 } },
      battlefield: "ridge_pass"
    },
    objectiveIds: ["m03_pass"]
  },
  {
    id: "m03_aerie",
    anchorId: "m03_aerie",
    coord: { q: 17, r: 4 },
    name: "Valkyrie Aerie",
    description: "A cliff-hall of the Valkyries. Frost trolls have taken it; the Valkyries circle above and will not land.",
    kind: { type: "creature_camp", creatureId: "norse_valkyrie", weeklyGrowth: 1, initialStock: 2 },
    guard: {
      label: "Aerie trolls",
      army: [{ creatureId: "norse_frost_troll", count: 5 }],
      reward: { resources: { favor: 5 }, artifactIds: ["shieldmaiden_round_shield"] },
      battlefield: "plateau"
    },
    objectiveIds: ["m03_aerie"]
  },
  resSite2("m03_crystal", 16, 9, "crystal_deposit"),
  {
    id: "m03_hearth",
    anchorId: "m03_hearth",
    coord: { q: 15, r: 13 },
    name: "The Troll-wife\u2019s Hearth",
    description: "A fire in a ring of boulders. An old troll-wife tends it and watches the road.",
    kind: {
      type: "map_event",
      title: "The Troll-wife\u2019s Hearth",
      text: "\u201CYou threw my sons off the Valkyries\u2019 cliff,\u201D the troll-wife says, without getting up. \u201CThey took what was not theirs, so I will not ask for their blood. I will ask for gold, and for wood for my fire. Pay, and my kin will keep an oath with your hold. Or go to Troll-Home and take it from them \u2014 they would like that better.\u201D",
      options: [
        { label: "Pay the blood-price", summary: "Pay 1,500 Gold and 10 Wood: gain the Frost Troll covenant.", cost: { gold: 1500, wood: 10 }, reward: { entitlementIds: ["covenant.norse_frost_troll.wo3"], flags: ["troll_pact"] } },
        { label: "Refuse \u2014 settle it at Troll-Home", summary: "Nothing is paid. The covenant must be won at Troll-Home.", reward: {} }
      ]
    }
  },
  {
    id: "m03_troll_home",
    anchorId: "m03_troll_home",
    coord: { q: 17, r: 15 },
    name: "Troll-Home",
    description: "A cave-mouth hung with antlers. The troll-wife\u2019s sons live here.",
    kind: { type: "landmark", landmark: "refuge" },
    guard: {
      label: "The troll-wife\u2019s sons",
      army: [
        { creatureId: "norse_frost_troll", count: 4 },
        { creatureId: "norse_ancient_frost_troll", count: 1 }
      ],
      reward: { resources: { gold: 1e3 }, entitlementIds: ["covenant.norse_frost_troll.wo3"] },
      battlefield: "plateau"
    }
  },
  {
    id: "m03_bridge",
    anchorId: "m03_bridge",
    coord: { q: 20, r: 9 },
    name: "Ice Bridge",
    description: "A frozen waterfall wide enough to walk. The Jarl\u2019s bridge-watch holds the far end.",
    kind: { type: "crossing" },
    guard: {
      label: "Bridge-watch",
      army: [
        { creatureId: "norse_deathless_draugr", count: 12 },
        { creatureId: "norse_fenrir_wolf", count: 4 }
      ],
      reward: { resources: { gold: 800 } },
      battlefield: "ridge_pass"
    }
  },
  {
    id: "m03_rune_stone",
    anchorId: "m03_rune_stone",
    coord: { q: 23, r: 9 },
    name: "High Rune Stone",
    description: "The third stone of the oath, on the roof of the fells.",
    kind: {
      type: "activation",
      label: "beacon",
      cost: { gold: 500, crystal: 2 },
      requirements: [
        { type: "objective_completed", objectiveId: "m03_pantheon" },
        { type: "objective_completed", objectiveId: "m03_valkyries" }
      ],
      reward: { questXp: 2e3 },
      completesMission: true,
      confirmText: "Cut the rune on the High Rune Stone? This completes The Valkyrie\u2019s Price."
    },
    objectiveIds: ["m03_recut"]
  }
];
var M032 = {
  ...COMMON,
  id: "winter_oath_m03",
  scenarioId: "winter_oath_m03",
  order: 3,
  name: "The Valkyrie\u2019s Price",
  subtitle: "Mission 3 \u2014 Ally",
  summary: "Frost trolls hold the Valkyries\u2019 aerie in the high fells. Break the ice-pass, free the aerie, win the trolls\u2019 oath by gold or by force, choose Thor or Tyr and carry Battle Valkyries to the third rune.",
  mapTemplateId: "winter_oath_m03_v1",
  soundscape: "fjord",
  targetPlaytime: "25\u201330 minutes (target, unmeasured)",
  newDecisions: ["Choose a god", "Bargain or fight for a covenant", "Raise Battle Valkyries"],
  xpCap: 6199,
  xpCapLevel: 5,
  briefing: [
    SKEGGI("The Valkyries choose the slain for the hall of the gods. If they will not land on their own cliff, then the dead of this winter are being chosen by someone else."),
    HERVOR("By the Grey Jarl. Every one of his draugar was a warrior once."),
    SKEGGI("Then give the Valkyries their cliff back and ask them to choose for us. And talk to the trolls before you kill them. Trolls keep oaths longer than men do.")
  ],
  victory: [SKEGGI("Three runes. The winter has stopped spreading \u2014 but it has not gone. Something holds it here. Not something: someone. We need his name.")],
  storyScenes: [
    {
      id: "m03_aerie_freed",
      trigger: { type: "site_cleared", siteId: "m03_aerie" },
      lines: [
        P2("Svanhild", "You cleared our hall with draugar at your back, seeress. That is a strange gift \u2014 but the Valkyries remember gifts."),
        P2("Svanhild", "Take this shield. A shieldmaiden carried it until she was chosen. Our hall will sell you wings while the fells stay free."),
        HERVOR("Then stay free with us.")
      ]
    },
    {
      id: "m03_troll_pact",
      trigger: { type: "flag", flag: "troll_pact" },
      lines: [P2("The Troll-wife", "Paid in full. My sons will grumble, and then they will keep the oath. That is how trolls are.", "troll_wife")]
    },
    {
      id: "m03_thor",
      trigger: { type: "god_committed", godId: "norse_thor" },
      lines: [SKEGGI("Thor, then. He likes a fight in the open and a loud one. The trolls will respect that \u2014 they have felt his hammer before.")]
    },
    {
      id: "m03_tyr",
      trigger: { type: "god_committed", godId: "norse_tyr" },
      lines: [SKEGGI("Tyr. The god who put his hand in the wolf\u2019s mouth to keep an oath. Fitting, for a woman chasing one.")]
    },
    {
      id: "m03_losses",
      trigger: { type: "casualties", minLost: 8 },
      lines: [EYDIS("A sledge from Kaldvik with a list of names, Hervor. I will not read it to you. I will leave it by your door.")]
    }
  ],
  debriefPolicy: DEBRIEF_POLICY2,
  player: {
    playerId: "player",
    name: "Fjallhof",
    pantheonId: "norse",
    wallet: { gold: 11e3, wood: 25, stone: 30, crystal: 8, favor: 15 },
    town: {
      townId: "fjallhof",
      siteId: "m03_town",
      name: "Fjallhof",
      archetypeId: "norse_hold",
      buildings: ["norse_longhouse", "norse_jarls_hall", "norse_mead_hall", "norse_trading_post", "norse_palisade", "norse_barrow", "norse_barrow_up", "norse_wolf_den", "norse_wolf_den_up", "norse_smithy", "norse_rune_circle_1", "norse_hof_1"],
      population: { norse_draugr: 14, norse_frost_wolf: 9 },
      covenants: []
    },
    hero: hervor(
      { level: 3, xp: 2400, attributes: { attack: 1, defense: 2, power: 3, knowledge: 3 }, skills: [{ skillId: "wisdom", rank: 1 }, { skillId: "armorer", rank: 1 }, { skillId: "leadership", rank: 1 }], spellbook: true },
      [
        { creatureId: "norse_draugr", count: 20 },
        { creatureId: "norse_deathless_draugr", count: 18 },
        { creatureId: "norse_frost_wolf", count: 8 },
        { creatureId: "norse_fenrir_wolf", count: 4 }
      ],
      "fjallhof"
    )
  },
  hostilePlayer: { playerId: "winter_host", name: "The Winter Host" },
  purchasableBuildingIds: ["norse_hof_2", "norse_valkyrie_aerie", "norse_valkyrie_aerie_up", "norse_troll_cave", "norse_troll_cave_up", "norse_stronghold", "norse_rune_circle_2", "norse_storehouse", "norse_training_ground", "norse_watchtower"],
  committableGodIds: FIRST_GODS,
  sites: M03_SITES2,
  objectives: M03_OBJECTIVES2,
  hostileHeroes: [
    {
      commander: {
        heroDefinitionId: "norse_fell_wolves",
        name: "Fell Wolves",
        classId: "huscarl",
        level: 1,
        attributes: { attack: 0, defense: 0, power: 0, knowledge: 0 },
        skills: [],
        spellbook: false,
        spellIds: [],
        mana: 0,
        portraitAssetId: "creature.norse.tier2.base.portrait"
      },
      monster: { bounty: { gold: 400 } },
      startCoord: { q: 9, r: 3 },
      army: [{ creatureId: "norse_frost_wolf", count: 6 }],
      ai: {
        profile: "patrol",
        waypoints: [
          { q: 9, r: 3 },
          { q: 10, r: 5 },
          { q: 8, r: 4 }
        ],
        regionMinQ: 6,
        regionMaxQ: 12,
        regionCenter: { q: 9, r: 3 },
        regionRadius: 2,
        attackThreshold: { numerator: 3, denominator: 2 }
      }
    }
  ],
  helpTopics: [
    { id: "covenants", title: "Covenants", text: "A covenant is a one-time entitlement. Assign it permanently to a town, then build and pay for the dwelling it unlocks." },
    { id: "gods", title: "Divine commitments", text: "Committing to a god is player-wide and irreversible. Thor and Tyr exclude each other." },
    { id: "guarded_camp", title: "Guarded camps", text: "A camp with a guard sells nothing until its guard is defeated." }
  ],
  thumbnailAssetId: "mission.winter_oath.m03.thumbnail"
};
var cairn = (id, q, r2, flag, name) => ({
  id,
  anchorId: id,
  coord: { q, r: r2 },
  name,
  description: "A way-cairn on the sea-ice. Lit, it burns through the fog-wall.",
  kind: {
    type: "activation",
    label: "relay",
    cost: { gold: 250, stone: 3 },
    requirements: [],
    reward: { flags: [flag] },
    completesMission: false,
    confirmText: `Light the ${name}? Both cairns burn through the fog-wall.`
  },
  objectiveIds: [id]
});
var M04_OBJECTIVES = [
  { id: "m04_roost", title: "Wings over the ice", description: "Recruit at least 3 Lindworms in Skarvik (build the Lindworm Roost first).", category: "primary", initialStatus: "active", condition: { type: "counter_at_least", counter: "recruited:norse_lindworm", value: 3 }, hint: "The Lindworm Roost needs the Valkyrie Aerie and Rune Circle I. Lindworms are the Norse shooters." },
  { id: "m04_landing", title: "Take the ice-landing", description: "Defeat the {army:norse_draugr=30,norse_deathless_draugr=12} of the nail-ship\u2019s crew at the landing.", category: "primary", initialStatus: "locked", requires: ["m04_roost"], condition: { type: "site_cleared", siteId: "m04_landing" }, markerSiteId: "m04_landing" },
  { id: "m04_cairn_north", title: "Northern way-cairn", description: "Light the northern way-cairn (250 Gold, 3 Stone).", category: "primary", initialStatus: "locked", requires: ["m04_landing"], condition: { type: "site_activated", siteId: "m04_cairn_north" }, markerSiteId: "m04_cairn_north" },
  { id: "m04_cairn_south", title: "Southern way-cairn", description: "Light the southern way-cairn (250 Gold, 3 Stone).", category: "primary", initialStatus: "locked", requires: ["m04_landing"], condition: { type: "site_activated", siteId: "m04_cairn_south" }, markerSiteId: "m04_cairn_south" },
  { id: "m04_fog", title: "Burn through the fog-wall", description: "With both cairns lit, the fog-wall parts.", category: "primary", initialStatus: "locked", requires: ["m04_cairn_north", "m04_cairn_south"], condition: { type: "all", conditions: [{ type: "flag", flag: "cairn_north" }, { type: "flag", flag: "cairn_south" }] }, markerSiteId: "m04_fog_gate" },
  { id: "m04_well", title: "The Norns\u2019 Well", description: "Defeat the wyrm brood at the Well ({army:norse_lindworm=4,norse_storm_lindworm=2}) and pay 500 Gold and 3 Crystal to read the water.", category: "primary", initialStatus: "locked", requires: ["m04_fog"], condition: { type: "site_activated", siteId: "m04_well" }, markerSiteId: "m04_well" },
  { id: "m04_nest", title: "Lindworm crags (optional)", description: "Defeat the {army:norse_lindworm=2} on the crags for 5 Crystal.", category: "optional", initialStatus: "active", condition: { type: "site_cleared", siteId: "m04_nest" }, markerSiteId: "m04_nest" },
  { id: "m04_wanderer", title: "A grey wanderer (optional)", description: "Someone has made a fire on the north shore.", category: "optional", initialStatus: "active", condition: { type: "site_visited", siteId: "m04_wanderer" }, markerSiteId: "m04_wanderer" }
];
var M04_SITES = [
  { id: "m04_town", anchorId: "m04_town", coord: { q: 3, r: 9 }, name: "Skarvik", description: "A harbour-hold whose harbour is ice.", kind: { type: "town", townId: "skarvik" } },
  resSite2("m04_sawmill", 5, 5, "sawmill"),
  resSite2("m04_quarry", 5, 13, "quarry"),
  {
    id: "m04_wanderer",
    anchorId: "m04_wanderer",
    coord: { q: 7, r: 3 },
    name: "A Fire on the Shore",
    description: "A traveller in a broad hat and a grey cloak sits by a small fire.",
    kind: {
      type: "map_event",
      title: "The Grey Wanderer",
      text: "He has one eye and two ravens, and he knows your name before you say it. \u201CYou are going to the Well,\u201D he says. \u201CGood. Ask it the right question. And it is cold out on the ice \u2014 I have a spare cloak, if you have a spare seat by my fire.\u201D",
      options: [
        { label: "Give him your seat by the fire", summary: "Hervor receives the Wanderer\u2019s Grey Cloak (+2 vision, +5% daily land movement).", reward: { artifactIds: ["wanderers_grey_cloak"] } },
        { label: "Trade him mead for a rune", summary: "Hervor gains +1 Spell Power.", reward: { attributes: { power: 1 } } }
      ]
    },
    objectiveIds: ["m04_wanderer"]
  },
  { id: "m04_knarr", anchorId: "m04_knarr", coord: { q: 8, r: 15 }, name: "Frozen Knarr", description: "A merchant ship caught by the ice with its cargo aboard.", kind: { type: "pickup", reward: { resources: { gold: 1e3, wood: 5 } } } },
  {
    id: "m04_landing",
    anchorId: "m04_landing",
    coord: { q: 11, r: 9 },
    name: "Ice-landing",
    description: "The one place where the shore ice is thick enough to carry an army onto the sound.",
    kind: { type: "crossing" },
    guard: {
      label: "Nail-ship crew",
      army: [
        { creatureId: "norse_draugr", count: 30 },
        { creatureId: "norse_deathless_draugr", count: 12 }
      ],
      reward: { resources: { gold: 800, favor: 3 } },
      battlefield: "coast_road"
    },
    objectiveIds: ["m04_landing"]
  },
  {
    id: "m04_nail_ship",
    anchorId: "m04_nail_ship",
    coord: { q: 14, r: 9 },
    name: "Ship of Nails",
    description: "A ship built from the uncut nails of the dead, frozen into the sound.",
    kind: {
      type: "map_event",
      title: "The Ship of Nails",
      text: "Close up it is worse: every plank is nails, packed and grey. The draugr crew sailed it here and left it to wait for the thaw. Burn it, and it will never carry the dead anywhere. Or strip its iron \u2014 the smiths of Skarvik would pay well.",
      options: [
        { label: "Burn it", summary: "+5 Favor; Hervor gains 500 experience.", reward: { resources: { favor: 5 }, questXp: 500 } },
        { label: "Strip its iron", summary: "+1,200 Gold and +5 Stone.", reward: { resources: { gold: 1200, stone: 5 } } }
      ]
    }
  },
  cairn("m04_cairn_north", 15, 4, "cairn_north", "Northern Way-cairn"),
  cairn("m04_cairn_south", 15, 14, "cairn_south", "Southern Way-cairn"),
  {
    id: "m04_nest",
    anchorId: "m04_nest",
    coord: { q: 17, r: 16 },
    name: "Lindworm Crags",
    description: "Wingless dragons sun themselves on black crags, on beds of crystal.",
    kind: { type: "landmark", landmark: "quarry_cache" },
    guard: { label: "Crag lindworms", army: [{ creatureId: "norse_lindworm", count: 2 }], reward: { resources: { crystal: 5 } }, battlefield: "plateau" },
    objectiveIds: ["m04_nest"]
  },
  { id: "m04_fog_gate", anchorId: "m04_fog_gate", coord: { q: 19, r: 9 }, name: "Fog-wall", description: "A wall of freezing fog across the sound. Both way-cairns must burn to part it.", kind: { type: "gate", openWhenFlags: ["cairn_north", "cairn_south"] }, objectiveIds: ["m04_fog"] },
  {
    id: "m04_well",
    anchorId: "m04_well",
    coord: { q: 24, r: 9 },
    name: "The Norns\u2019 Well",
    description: "A spring that does not freeze, on an island at the end of the sound.",
    kind: {
      type: "activation",
      label: "beacon",
      cost: { gold: 500, crystal: 3 },
      requirements: [
        { type: "mission_flag", flag: "cairn_north" },
        { type: "mission_flag", flag: "cairn_south" }
      ],
      reward: { questXp: 2200, artifactIds: ["brisingamen_link"] },
      completesMission: true,
      confirmText: "Read the water of the Norns\u2019 Well? This completes Ice on the Sound."
    },
    guard: {
      label: "Wyrm brood",
      army: [
        { creatureId: "norse_lindworm", count: 4 },
        { creatureId: "norse_storm_lindworm", count: 2 }
      ],
      reward: { resources: { gold: 1e3 } },
      battlefield: "beacon_clearing"
    },
    objectiveIds: ["m04_well"]
  }
];
var M04 = {
  ...COMMON,
  id: "winter_oath_m04",
  scenarioId: "winter_oath_m04",
  order: 4,
  name: "Ice on the Sound",
  subtitle: "Mission 4 \u2014 Seek",
  summary: "Only the Norns know the Grey Jarl\u2019s oath. Raise Lindworms, take the ice-landing, light both way-cairns through the fog and read the water of the Norns\u2019 Well \u2014 while a draugr crew walks the ice.",
  mapTemplateId: "winter_oath_m04_v1",
  soundscape: "fjord",
  targetPlaytime: "25\u201330 minutes (target, unmeasured)",
  newDecisions: ["Avoid or fight a patrol", "Light two cairns", "Shooters in a Norse army"],
  xpCap: 7999,
  xpCapLevel: 6,
  briefing: [
    SKEGGI("Every oath ever sworn is a thread at the Norns\u2019 well. If we want the Jarl\u2019s, we go where the threads are."),
    HERVOR("The well is at the end of the sound. The sound is ice, the ice has a fog on it, and the fog has a ship in it full of his dead."),
    EYDIS("Then take the Lindworms. They see through fog. And come back before the ice does something unkind.")
  ],
  victory: [
    HERVOR("His name was Hrolf. He was a king, a thousand winters ago, and he swore to hold the winter under his mound in exchange for a kingdom when it ended."),
    SKEGGI("And the winter never ended, so the kingdom never came. He has been keeping a bargain nobody else remembers."),
    HERVOR("Someone remembers. The water showed me a jarl in a white hall who swore to help him. Ulfhild of Hvitstrand.")
  ],
  storyScenes: [
    {
      id: "m04_patrol",
      trigger: { type: "battle_started", heroDefinitionId: "norse_bone_helm" },
      lines: [P2("Bone-Helm", "The sound is ours until the thaw, seeress. And there will be no thaw.", "bone_helm")]
    },
    {
      id: "m04_fog_parts",
      trigger: { type: "objective_completed", objectiveId: "m04_fog" },
      lines: [
        SKEGGI("There \u2014 the island. And steam on the water. The well is still warm."),
        HERVOR("Of course it is. The Norns do not care whose winter it is.")
      ]
    },
    {
      id: "m04_cloak",
      trigger: { type: "site_visited", siteId: "m04_wanderer" },
      lines: [SKEGGI("One eye, two ravens and a grey cloak. You know who that was, Hervor. Do not tell me you do not.")]
    },
    {
      id: "m04_losses",
      trigger: { type: "casualties", minLost: 10 },
      lines: [EYDIS("The ice took some of them through the cracks before the enemy did. I am writing them down anyway.")]
    }
  ],
  debriefPolicy: DEBRIEF_POLICY2,
  player: {
    playerId: "player",
    name: "Skarvik",
    pantheonId: "norse",
    wallet: { gold: 12e3, wood: 25, stone: 30, crystal: 12, favor: 10 },
    town: {
      townId: "skarvik",
      siteId: "m04_town",
      name: "Skarvik",
      archetypeId: "norse_hold",
      buildings: [
        "norse_longhouse",
        "norse_jarls_hall",
        "norse_mead_hall",
        "norse_trading_post",
        "norse_palisade",
        "norse_stronghold",
        "norse_barrow",
        "norse_barrow_up",
        "norse_wolf_den",
        "norse_wolf_den_up",
        "norse_smithy",
        "norse_rune_circle_1",
        "norse_hof_1",
        "norse_hof_2",
        "norse_valkyrie_aerie",
        "norse_valkyrie_aerie_up",
        "norse_troll_cave"
      ],
      population: { norse_draugr: 14, norse_frost_wolf: 9, norse_frost_troll: 6, norse_valkyrie: 4 },
      covenants: ["norse_frost_troll"]
    },
    hero: hervor(
      { level: 4, xp: 3600, attributes: { attack: 2, defense: 2, power: 4, knowledge: 3 }, skills: [{ skillId: "wisdom", rank: 2 }, { skillId: "armorer", rank: 1 }, { skillId: "leadership", rank: 1 }], spellbook: true },
      [
        { creatureId: "norse_deathless_draugr", count: 36 },
        { creatureId: "norse_fenrir_wolf", count: 12 },
        { creatureId: "norse_frost_troll", count: 4 },
        { creatureId: "norse_battle_valkyrie", count: 3 }
      ],
      "skarvik"
    )
  },
  hostilePlayer: { playerId: "winter_host", name: "The Winter Host" },
  purchasableBuildingIds: ["norse_lindworm_roost", "norse_lindworm_roost_up", "norse_troll_cave_up", "norse_rune_circle_2", "norse_rune_circle_3", "norse_rune_merchant", "norse_high_hall", "norse_storehouse", "norse_watchtower", "norse_training_ground"],
  committableGodIds: FIRST_GODS,
  sites: M04_SITES,
  objectives: M04_OBJECTIVES,
  hostileHeroes: [
    {
      commander: {
        heroDefinitionId: "norse_bone_helm",
        name: "Bone-Helm",
        classId: "huscarl",
        level: 3,
        attributes: { attack: 3, defense: 3, power: 1, knowledge: 1 },
        skills: [
          { skillId: "offense", rank: 1 },
          { skillId: "armorer", rank: 1 }
        ],
        spellbook: false,
        spellIds: [],
        mana: 10,
        portraitAssetId: "hero.norse.bone_helm.portrait"
      },
      startCoord: { q: 16, r: 10 },
      army: [
        { creatureId: "norse_deathless_draugr", count: 16 },
        { creatureId: "norse_fenrir_wolf", count: 6 }
      ],
      ai: {
        profile: "patrol",
        waypoints: [
          { q: 13, r: 6 },
          { q: 17, r: 8 },
          { q: 13, r: 12 },
          { q: 16, r: 10 }
        ],
        regionMinQ: 12,
        regionMaxQ: 18,
        attackThreshold: { numerator: 11, denominator: 10 }
      }
    }
  ],
  helpTopics: [
    { id: "patrol", title: "The ice patrol", text: "Bone-Helm\u2019s crew takes one ordinary turn after yours each day, cannot see through fog and never leaves the sound between the landing and the fog-wall." },
    { id: "cairns", title: "Cairns and the fog-wall", text: "The landing reaches both cairns. Only both cairns together part the fog-wall." },
    { id: "shooters", title: "Lindworms", text: "Lindworms are the only Norse shooters. Keep them behind the draugr line and let the wolves deal with enemy archers." }
  ],
  thumbnailAssetId: "mission.winter_oath.m04.thumbnail"
};
var M05_OBJECTIVES = [
  {
    id: "m05_crossing",
    title: "Cross the Hvita",
    description: "Clear either ford over the frozen Hvita: the north ford ({army:norse_frost_troll=8}) or the south ford ({army:norse_draugr=24,norse_deathless_draugr=10}).",
    category: "primary",
    initialStatus: "active",
    condition: { type: "any", conditions: [{ type: "site_cleared", siteId: "m05_north_ford" }, { type: "site_cleared", siteId: "m05_south_ford" }] },
    hint: "Either ford is enough. Ulfhild\u2019s war-band can use a cleared ford too."
  },
  { id: "m05_second_god", title: "A second god", description: "Raise the High Hall and commit to Freyja, Heimdall or Hel (25 Favor, irreversible).", category: "primary", initialStatus: "locked", requires: ["m05_crossing"], condition: { type: "player_has_minor_god", count: 2 }, hint: "The second god needs Hof II and the High Hall in Ravnholt. A god chosen earlier counts as soon as this step opens." },
  { id: "m05_take_town", title: "Take Hvitstrand", description: "Besiege and take Jarl Ulfhild\u2019s town of Hvitstrand.", category: "primary", initialStatus: "locked", requires: ["m05_second_god"], condition: { type: "town_owned", townId: "hvitstrand" }, markerSiteId: "m05_rival_town", reward: { artifactIds: ["valkyries_horn"] }, hint: "Ulfhild is a full empire run by the AI: she builds, recruits and may come for Ravnholt. Leave a garrison at home." },
  { id: "m05_oath_stone", title: "Break Ulfhild\u2019s oath", description: "With Hvitstrand taken, pay 500 Gold and 2 Crystal to cut the counter-rune on her oath-stone.", category: "primary", initialStatus: "locked", requires: ["m05_take_town"], condition: { type: "site_activated", siteId: "m05_oath_stone" }, markerSiteId: "m05_oath_stone" },
  { id: "m05_ulfhild", title: "Defeat Ulfhild (optional)", description: "Defeat Jarl Ulfhild\u2019s war-band in the field.", category: "optional", initialStatus: "active", condition: { type: "hero_defeated", heroDefinitionId: "norse_ulfhild" } },
  { id: "m05_andvari", title: "Andvari\u2019s pool (optional)", description: "Something glints at the bottom of a pool that never freezes.", category: "optional", initialStatus: "active", condition: { type: "site_visited", siteId: "m05_andvari" }, markerSiteId: "m05_andvari" }
];
var M05_SITES = [
  { id: "m05_town", anchorId: "m05_town", coord: { q: 3, r: 10 }, name: "Ravnholt", description: "A hold on the west bank of the Hvita that refused Ulfhild\u2019s oath.", kind: { type: "town", townId: "ravnholt" } },
  resSite2("m05_sawmill", 5, 6, "sawmill"),
  resSite2("m05_quarry", 5, 14, "quarry"),
  { ...resSite2("m05_gold", 8, 16, "gold_mine"), guard: { label: "Mine squatters", army: [{ creatureId: "norse_fenrir_wolf", count: 10 }], reward: { resources: { gold: 500 } }, battlefield: "open_field" } },
  {
    id: "m05_andvari",
    anchorId: "m05_andvari",
    coord: { q: 9, r: 3 },
    name: "Andvari\u2019s Pool",
    description: "A pool under a waterfall that has never frozen. A ring lies on the bottom.",
    kind: {
      type: "map_event",
      title: "Andvari\u2019s Pool",
      text: "The ring is gold and heavy, and the water around it is warm. Skeggi will not go near it. \u201CA dwarf cursed that ring,\u201D he says. \u201CIt brings gold to whoever wears it, and ruin with the gold. Many have decided the gold is worth it.\u201D",
      options: [
        { label: "Take the ring", summary: "Hervor receives Andvari\u2019s Ring (+500 Gold per day, \u22121 Luck).", reward: { artifactIds: ["andvaris_ring"] } },
        { label: "Leave it to its curse", summary: "+5 Favor; Hervor gains 300 experience.", reward: { resources: { favor: 5 }, questXp: 300 } }
      ]
    },
    objectiveIds: ["m05_andvari"]
  },
  {
    id: "m05_north_ford",
    anchorId: "m05_north_ford",
    coord: { q: 15, r: 6 },
    name: "North Ford",
    description: "A ford where the Hvita runs shallow under the ice. Trolls take a toll here.",
    kind: { type: "crossing" },
    guard: { label: "Ford trolls", army: [{ creatureId: "norse_frost_troll", count: 8 }], reward: { resources: { gold: 800 } }, battlefield: "ridge_pass" }
  },
  {
    id: "m05_south_ford",
    anchorId: "m05_south_ford",
    coord: { q: 15, r: 13 },
    name: "South Ford",
    description: "The sledge-ford. The Grey Jarl\u2019s dead keep it for Ulfhild.",
    kind: { type: "crossing" },
    guard: {
      label: "Ford-dead",
      army: [
        { creatureId: "norse_draugr", count: 24 },
        { creatureId: "norse_deathless_draugr", count: 10 }
      ],
      reward: { resources: { gold: 800 } },
      battlefield: "ridge_pass"
    }
  },
  resSite2("m05_crystal", 20, 10, "crystal_deposit"),
  resSite2("m05_rival_quarry", 24, 5, "quarry"),
  resSite2("m05_rival_sawmill", 24, 15, "sawmill"),
  { id: "m05_rival_town", anchorId: "m05_rival_town", coord: { q: 26, r: 10 }, name: "Hvitstrand", description: "Jarl Ulfhild\u2019s white hall above the frozen river-mouth.", kind: { type: "town", townId: "hvitstrand" }, objectiveIds: ["m05_take_town"] },
  {
    id: "m05_oath_stone",
    anchorId: "m05_oath_stone",
    coord: { q: 26, r: 7 },
    name: "Ulfhild\u2019s Oath-stone",
    description: "The stone on which Ulfhild swore to keep the Grey Jarl\u2019s winter.",
    kind: {
      type: "activation",
      label: "beacon",
      cost: { gold: 500, crystal: 2 },
      requirements: [{ type: "objective_completed", objectiveId: "m05_take_town" }],
      reward: { questXp: 2500 },
      completesMission: true,
      confirmText: "Cut the counter-rune on Ulfhild\u2019s oath-stone? This completes The Jarl of Hvitstrand."
    },
    objectiveIds: ["m05_oath_stone"]
  }
];
var M05 = {
  ...COMMON,
  id: "winter_oath_m05",
  scenarioId: "winter_oath_m05",
  order: 5,
  name: "The Jarl of Hvitstrand",
  subtitle: "Mission 5 \u2014 Contest",
  summary: "Jarl Ulfhild swore to keep the Grey Jarl\u2019s winter for a frozen sea that keeps her rivals\u2019 ships in harbour. Cross the Hvita, win a second god, take Hvitstrand from a living rival and break her oath.",
  mapTemplateId: "winter_oath_m05_v1",
  soundscape: "storm_plateau",
  targetPlaytime: "30\u201340 minutes (target, unmeasured)",
  newDecisions: ["A rival empire", "A second god", "Defend and besiege"],
  xpCap: 9999,
  xpCapLevel: 7,
  briefing: [
    P2("Ulfhild", "Hervor of Kaldvik. You are cutting runes all over my north. Every sea-lane you open lets my rivals\u2019 ships out of harbour."),
    HERVOR("It is not your north, Ulfhild. And people are starving behind those frozen harbours."),
    P2("Ulfhild", "People are always starving somewhere. I keep my hall full. Come and take it, if you think the gods prefer you.")
  ],
  victory: [
    HERVOR("The oath-stone is cut. Ulfhild\u2019s word holds nothing for the Grey Jarl now."),
    SKEGGI("Then he has only his own dead left \u2014 and the giants he froze into the glacier to guard his road.")
  ],
  storyScenes: [
    {
      id: "m05_crossed",
      trigger: { type: "objective_completed", objectiveId: "m05_crossing" },
      lines: [EYDIS("The ford is open \u2014 both ways. Ulfhild\u2019s riders will know it by nightfall. I am putting every spear we have on the walls.")]
    },
    {
      id: "m05_freyja",
      trigger: { type: "god_committed", godId: "norse_freyja" },
      lines: [SKEGGI("Freyja. Half the slain go to her hall, they say. She will want the living to fill holds again by spring.")]
    },
    {
      id: "m05_heimdall",
      trigger: { type: "god_committed", godId: "norse_heimdall" },
      lines: [SKEGGI("Heimdall, who hears the grass grow. Ulfhild will not move a sledge without our knowing.")]
    },
    {
      id: "m05_hel",
      trigger: { type: "god_committed", godId: "norse_hel" },
      lines: [SKEGGI("Hel. A hard choice, and an honest one. She knows the dead better than the Grey Jarl ever will.")]
    },
    {
      id: "m05_ulfhild_battle",
      trigger: { type: "battle_started", heroDefinitionId: "norse_ulfhild" },
      lines: [
        P2("Ulfhild", "You should have stayed in your fjord, seeress."),
        HERVOR("I tried. The winter would not let me.")
      ]
    },
    {
      id: "m05_town_taken",
      trigger: { type: "objective_completed", objectiveId: "m05_take_town" },
      lines: [
        HERVOR("Hvitstrand is ours. Hang her horn in the hall \u2014 no, give it to me. A Valkyrie\u2019s horn should not hang on a wall."),
        EYDIS("Her people are asking what happens to them now."),
        HERVOR("The same as ours: they eat, and the ships go out in spring.")
      ]
    },
    {
      id: "m05_losses",
      trigger: { type: "casualties", minLost: 12 },
      lines: [EYDIS("This is the first time we have fought the living, Hervor. Their dead will not stand up again, and neither will ours.")]
    }
  ],
  debriefPolicy: DEBRIEF_POLICY2,
  player: {
    playerId: "player",
    name: "Ravnholt",
    pantheonId: "norse",
    wallet: { gold: 15e3, wood: 30, stone: 35, crystal: 14, favor: 20 },
    town: {
      townId: "ravnholt",
      siteId: "m05_town",
      name: "Ravnholt",
      archetypeId: "norse_hold",
      buildings: [
        "norse_longhouse",
        "norse_jarls_hall",
        "norse_mead_hall",
        "norse_trading_post",
        "norse_palisade",
        "norse_stronghold",
        "norse_barrow",
        "norse_barrow_up",
        "norse_wolf_den",
        "norse_wolf_den_up",
        "norse_smithy",
        "norse_rune_circle_1",
        "norse_rune_circle_2",
        "norse_hof_1",
        "norse_hof_2",
        "norse_valkyrie_aerie",
        "norse_valkyrie_aerie_up",
        "norse_troll_cave",
        "norse_troll_cave_up",
        "norse_lindworm_roost"
      ],
      population: { norse_draugr: 14, norse_frost_wolf: 9, norse_frost_troll: 6, norse_valkyrie: 4, norse_lindworm: 3 },
      covenants: ["norse_frost_troll"]
    },
    hero: hervor(
      { level: 5, xp: 5e3, attributes: { attack: 2, defense: 3, power: 4, knowledge: 4 }, skills: [{ skillId: "wisdom", rank: 2 }, { skillId: "armorer", rank: 1 }, { skillId: "leadership", rank: 1 }, { skillId: "offense", rank: 1 }], spellbook: true },
      [
        { creatureId: "norse_deathless_draugr", count: 40 },
        { creatureId: "norse_fenrir_wolf", count: 14 },
        { creatureId: "norse_ancient_frost_troll", count: 5 },
        { creatureId: "norse_battle_valkyrie", count: 4 },
        { creatureId: "norse_lindworm", count: 3 }
      ],
      "ravnholt"
    )
  },
  rivals: [
    {
      playerId: "hvitstrand",
      name: "Hvitstrand",
      controller: "ai",
      pantheonId: "norse",
      color: "#c9ced6",
      wallet: { gold: 8e3, wood: 20, stone: 20, crystal: 6, favor: 10 },
      town: {
        townId: "hvitstrand",
        siteId: "m05_rival_town",
        name: "Hvitstrand",
        archetypeId: "norse_hold",
        buildings: ["norse_longhouse", "norse_jarls_hall", "norse_mead_hall", "norse_trading_post", "norse_palisade", "norse_stronghold", "norse_barrow", "norse_barrow_up", "norse_wolf_den", "norse_wolf_den_up", "norse_smithy", "norse_valkyrie_aerie", "norse_hof_1"],
        population: { norse_draugr: 14, norse_frost_wolf: 9, norse_valkyrie: 4 },
        covenants: [],
        // Ulfhild's hall-guard: the town is held even when she rides out.
        garrison: [
          { creatureId: "norse_deathless_draugr", count: 24 },
          { creatureId: "norse_fenrir_wolf", count: 8 },
          { creatureId: "norse_valkyrie", count: 2 }
        ]
      },
      hero: {
        heroId: "ulfhild",
        definitionId: "norse_ulfhild",
        classId: "jarl",
        defaults: { level: 5, xp: 5e3, attributes: { attack: 3, defense: 4, power: 1, knowledge: 2 }, skills: [{ skillId: "leadership", rank: 2 }, { skillId: "armorer", rank: 1 }, { skillId: "tactics", rank: 1 }], spellbook: false },
        army: [
          { creatureId: "norse_deathless_draugr", count: 26 },
          { creatureId: "norse_fenrir_wolf", count: 10 },
          { creatureId: "norse_valkyrie", count: 3 }
        ],
        startTownId: "hvitstrand"
      }
    }
  ],
  purchasableBuildingIds: ["norse_high_hall", "norse_valkyrie_aerie_up", "norse_lindworm_roost_up", "norse_rune_circle_3", "norse_rune_merchant", "norse_storehouse", "norse_watchtower", "norse_training_ground", "norse_fortress"],
  committableGodIds: ALL_GODS,
  sites: M05_SITES,
  objectives: M05_OBJECTIVES,
  hostileHeroes: [],
  helpTopics: [
    { id: "rival", title: "A rival empire", text: "Hvitstrand is a full empire run by the AI with the same rules as yours: it builds, recruits, takes mines and may besiege Ravnholt. Losing Ravnholt does not end the mission; losing Hervor does." },
    { id: "second_god", title: "The second god", text: "A second minor god (Freyja, Heimdall or Hel) needs your first god, Hof II and the High Hall, and costs 25 Favor." },
    { id: "siege", title: "Sieges", text: "Entering an enemy town that has a garrison or a visiting hero starts a siege. Walls and towers favour the defender; Lindworms shoot over them." }
  ],
  thumbnailAssetId: "mission.winter_oath.m05.thumbnail"
};
var M06_OBJECTIVES = [
  {
    id: "m06_approach",
    title: "Climb onto the glacier",
    description: "Clear either crossing of the glacier wall: north ({army:norse_frost_troll=8,norse_ancient_frost_troll=2}) or south ({army:norse_deathless_draugr=24,norse_fenrir_wolf=6}).",
    category: "primary",
    initialStatus: "active",
    condition: { type: "any", conditions: [{ type: "site_cleared", siteId: "m06_north_crossing" }, { type: "site_cleared", siteId: "m06_south_crossing" }] }
  },
  { id: "m06_refuge", title: "Break the ice-wardens", description: "Defeat the Jarl\u2019s wardens at Hrimgard ({army:norse_deathless_draugr=30,norse_ancient_frost_troll=3,norse_storm_lindworm=2}) and free the frozen giants.", category: "primary", initialStatus: "locked", requires: ["m06_approach"], condition: { type: "site_cleared", siteId: "m06_refuge" }, markerSiteId: "m06_refuge" },
  { id: "m06_claim", title: "Claim the Jotunn covenant", description: "Accept the giants\u2019 oath in the journal. It can then be assigned to Jokulsby.", category: "primary", initialStatus: "locked", condition: { type: "claim", after: ["m06_refuge"] }, reward: { entitlementIds: ["covenant.norse_jotunn.wo6"] } },
  { id: "m06_giants", title: "Giants in the war-band", description: "Assign the covenant, build the Jotunn Camp and have at least 2 Jotnar in Hervor\u2019s army.", category: "primary", initialStatus: "locked", requires: ["m06_claim"], condition: { type: "hero_army_contains", heroId: "hervor", creatureId: "norse_jotunn", count: 2 }, live: true, hint: "The Jotunn Camp needs Hof II, the Valkyrie Aerie and the assigned covenant. Recruit with Hervor in town." },
  { id: "m06_hrafn", title: "Hrafn the Hollow", description: "Defeat Hrafn and the glacier-gate guard ({army:norse_deathless_draugr=30,norse_fenrir_wolf=10,norse_ancient_frost_troll=4,norse_battle_valkyrie=3}).", category: "primary", initialStatus: "locked", requires: ["m06_giants"], condition: { type: "site_cleared", siteId: "m06_glacier_gate" }, markerSiteId: "m06_glacier_gate" },
  { id: "m06_horn", title: "Sound the giants\u2019 horn", description: "With the gate open, pay 500 Gold and 10 Favor to sound the horn of Hrimgard and wake the road to the Jarl\u2019s hall.", category: "primary", initialStatus: "locked", requires: ["m06_hrafn"], condition: { type: "site_activated", siteId: "m06_horn" }, markerSiteId: "m06_horn" },
  { id: "m06_child", title: "The ice-bound child (optional)", description: "A small shape in the ice near the north crossing.", category: "optional", initialStatus: "active", condition: { type: "site_visited", siteId: "m06_frozen_child" }, markerSiteId: "m06_frozen_child" },
  { id: "m06_nest", title: "Storm crags (optional)", description: "Defeat the {army:norse_storm_lindworm=2} on the crags for 6 Crystal.", category: "optional", initialStatus: "active", condition: { type: "site_cleared", siteId: "m06_nest" }, markerSiteId: "m06_nest" }
];
var M06_SITES = [
  { id: "m06_town", anchorId: "m06_town", coord: { q: 3, r: 10 }, name: "Jokulsby", description: "A shepherds\u2019 hold under the glacier wall.", kind: { type: "town", townId: "jokulsby" } },
  resSite2("m06_sawmill", 5, 6, "sawmill"),
  resSite2("m06_quarry", 5, 14, "quarry"),
  resSite2("m06_gold", 7, 16, "gold_mine"),
  {
    id: "m06_north_crossing",
    anchorId: "m06_north_crossing",
    coord: { q: 11, r: 6 },
    name: "North Crossing",
    description: "An ice-ramp up the glacier wall, held by trolls in the Jarl\u2019s pay.",
    kind: { type: "crossing" },
    guard: {
      label: "Ramp trolls",
      army: [
        { creatureId: "norse_frost_troll", count: 8 },
        { creatureId: "norse_ancient_frost_troll", count: 2 }
      ],
      reward: { resources: { gold: 1e3 } },
      battlefield: "ridge_pass"
    }
  },
  {
    id: "m06_south_crossing",
    anchorId: "m06_south_crossing",
    coord: { q: 11, r: 13 },
    name: "South Crossing",
    description: "A cleft in the glacier wall full of the Jarl\u2019s dead.",
    kind: { type: "crossing" },
    guard: {
      label: "Cleft-dead",
      army: [
        { creatureId: "norse_deathless_draugr", count: 24 },
        { creatureId: "norse_fenrir_wolf", count: 6 }
      ],
      reward: { resources: { gold: 1e3 } },
      battlefield: "ridge_pass"
    }
  },
  {
    id: "m06_frozen_child",
    anchorId: "m06_frozen_child",
    coord: { q: 15, r: 3 },
    name: "The Ice-bound Child",
    description: "A giant\u2019s child, taller than a horse, frozen in a block of blue ice next to a cairn of offerings.",
    kind: {
      type: "map_event",
      title: "The Ice-bound Child",
      text: "Someone has been leaving offerings at the child\u2019s feet \u2014 coins, a comb, a carved horse. The ice is old, but it is only ice. With fire and patience, it would come off.",
      options: [
        { label: "Thaw the child", summary: "+10 Favor; Hervor gains 600 experience.", reward: { resources: { favor: 10 }, questXp: 600 } },
        { label: "Take the offerings and go on", summary: "+1,500 Gold.", reward: { resources: { gold: 1500 } } }
      ]
    },
    objectiveIds: ["m06_child"]
  },
  {
    id: "m06_refuge",
    anchorId: "m06_refuge",
    coord: { q: 16, r: 10 },
    name: "Hrimgard",
    description: "The giants\u2019 old hall, sealed in glacier ice. The Jarl\u2019s wardens keep the ice whole.",
    kind: { type: "landmark", landmark: "refuge" },
    guard: {
      label: "Ice-wardens",
      army: [
        { creatureId: "norse_deathless_draugr", count: 30 },
        { creatureId: "norse_ancient_frost_troll", count: 3 },
        { creatureId: "norse_storm_lindworm", count: 2 }
      ],
      reward: { resources: { gold: 1500 } },
      battlefield: "plateau"
    },
    objectiveIds: ["m06_refuge"]
  },
  {
    id: "m06_nest",
    anchorId: "m06_nest",
    coord: { q: 17, r: 17 },
    name: "Storm Crags",
    description: "Storm Lindworms nest where the glacier calves into the sea.",
    kind: { type: "landmark", landmark: "quarry_cache" },
    guard: { label: "Storm lindworms", army: [{ creatureId: "norse_storm_lindworm", count: 2 }], reward: { resources: { crystal: 6 } }, battlefield: "plateau" },
    objectiveIds: ["m06_nest"]
  },
  {
    id: "m06_glacier_gate",
    anchorId: "m06_glacier_gate",
    coord: { q: 22, r: 10 },
    name: "Glacier Gate",
    description: "An arch of black ice on the road north. Hrafn the Hollow holds it.",
    kind: { type: "crossing" },
    guard: {
      label: "Hrafn and the gate-guard",
      army: [
        { creatureId: "norse_deathless_draugr", count: 30 },
        { creatureId: "norse_fenrir_wolf", count: 10 },
        { creatureId: "norse_ancient_frost_troll", count: 4 },
        { creatureId: "norse_battle_valkyrie", count: 3 }
      ],
      commander: {
        heroDefinitionId: "norse_hrafn",
        name: "Hrafn the Hollow",
        classId: "huscarl",
        level: 6,
        attributes: { attack: 5, defense: 4, power: 1, knowledge: 1 },
        skills: [
          { skillId: "offense", rank: 2 },
          { skillId: "armorer", rank: 1 },
          { skillId: "tactics", rank: 1 }
        ],
        spellbook: false,
        spellIds: [],
        mana: 10,
        portraitAssetId: "hero.norse.hrafn.portrait"
      },
      reward: { resources: { gold: 1500 }, artifactIds: ["einherjar_mail"] },
      battlefield: "ridge_pass"
    },
    objectiveIds: ["m06_hrafn"]
  },
  {
    id: "m06_horn",
    anchorId: "m06_horn",
    coord: { q: 26, r: 10 },
    name: "Horn of Hrimgard",
    description: "A horn as long as a longship, hung in an ice-arch. Its note carries to the end of the world.",
    kind: {
      type: "activation",
      label: "beacon",
      cost: { gold: 500, favor: 10 },
      requirements: [{ type: "objective_completed", objectiveId: "m06_hrafn" }],
      reward: { questXp: 2800 },
      completesMission: true,
      confirmText: "Sound the Horn of Hrimgard? This completes The Giants\u2019 Refuge."
    },
    objectiveIds: ["m06_horn"]
  }
];
var M06 = {
  ...COMMON,
  id: "winter_oath_m06",
  scenarioId: "winter_oath_m06",
  order: 6,
  name: "The Giants\u2019 Refuge",
  subtitle: "Mission 6 \u2014 Bind",
  summary: "The Grey Jarl froze the giants of Hrimgard into the glacier to guard his road. Climb the glacier wall, break the ice-wardens, win the Jotnar\u2019s oath and defeat Hrafn the Hollow at the Glacier Gate.",
  mapTemplateId: "winter_oath_m06_v1",
  soundscape: "storm_plateau",
  targetPlaytime: "30\u201335 minutes (target, unmeasured)",
  newDecisions: ["Choose a crossing", "Raise giants", "Defeat a commander"],
  xpCap: 12199,
  xpCapLevel: 8,
  briefing: [
    SKEGGI("Long before the Jarl, the giants of Hrimgard kept the winter on the glacier where it belonged. He froze them in their own hall and set his dead to watch the ice."),
    HERVOR("So the winter\u2019s old keepers are its prisoners now. Then we free them, and ask what they think of the Jarl."),
    EYDIS("Ask politely. A giant\u2019s handshake has broken better arms than yours.")
  ],
  victory: [
    P2("J\xF6kul", "The horn has not sounded in a thousand winters, small seeress. Now the Jarl knows you are coming. So do we. We will walk with you to his door.", "jokul"),
    HERVOR("Then the road is open. One hall left.")
  ],
  storyScenes: [
    {
      id: "m06_freed",
      trigger: { type: "site_cleared", siteId: "m06_refuge" },
      lines: [
        P2("J\xF6kul", "Warm hands. I had forgotten. Who are you, to break the Jarl\u2019s ice?", "jokul"),
        HERVOR("The one who woke his sword. I am trying to put it back to sleep."),
        P2("J\xF6kul", "Then the Jotnar will swear to your hold. Claim our oath, and raise a camp where my kin can stand.", "jokul")
      ]
    },
    {
      id: "m06_child_thawed",
      trigger: { type: "site_visited", siteId: "m06_frozen_child" },
      lines: [SKEGGI("Whatever you chose there, the giants will hear of it. Giants hear everything that happens on the ice.")]
    },
    {
      id: "m06_hrafn_battle",
      trigger: { type: "battle_started", siteId: "m06_glacier_gate" },
      lines: [
        P2("Hrafn", "The Valkyries chose me once. I walked out of their hall because the Jarl promised me a war that never ends. Do you know how rare that is?", "hrafn"),
        HERVOR("A war that never ends is only a winter with weapons, Hrafn.")
      ]
    },
    {
      id: "m06_mail",
      trigger: { type: "site_cleared", siteId: "m06_glacier_gate" },
      lines: [HERVOR("The mail he wore came from the hall of the chosen. Sword, shield, horn \u2014 and now the mail. The Valkyries are dressing me for something.")]
    },
    {
      id: "m06_losses",
      trigger: { type: "casualties", minLost: 14 },
      lines: [EYDIS("The glacier keeps our dead better than any barrow. I will come back for their names when it is over.")]
    }
  ],
  debriefPolicy: DEBRIEF_POLICY2,
  player: {
    playerId: "player",
    name: "Jokulsby",
    pantheonId: "norse",
    wallet: { gold: 18e3, wood: 30, stone: 35, crystal: 16, favor: 25 },
    town: {
      townId: "jokulsby",
      siteId: "m06_town",
      name: "Jokulsby",
      archetypeId: "norse_hold",
      buildings: [
        "norse_longhouse",
        "norse_jarls_hall",
        "norse_high_hall",
        "norse_mead_hall",
        "norse_trading_post",
        "norse_palisade",
        "norse_stronghold",
        "norse_barrow",
        "norse_barrow_up",
        "norse_wolf_den",
        "norse_wolf_den_up",
        "norse_smithy",
        "norse_rune_circle_1",
        "norse_rune_circle_2",
        "norse_hof_1",
        "norse_hof_2",
        "norse_valkyrie_aerie",
        "norse_valkyrie_aerie_up",
        "norse_troll_cave",
        "norse_troll_cave_up",
        "norse_lindworm_roost",
        "norse_lindworm_roost_up"
      ],
      population: { norse_draugr: 14, norse_frost_wolf: 9, norse_frost_troll: 6, norse_valkyrie: 4, norse_lindworm: 3 },
      covenants: ["norse_frost_troll"]
    },
    hero: hervor(
      { level: 6, xp: 6600, attributes: { attack: 2, defense: 3, power: 5, knowledge: 4 }, skills: [{ skillId: "wisdom", rank: 2 }, { skillId: "armorer", rank: 2 }, { skillId: "leadership", rank: 1 }, { skillId: "offense", rank: 1 }], spellbook: true },
      [
        { creatureId: "norse_deathless_draugr", count: 44 },
        { creatureId: "norse_fenrir_wolf", count: 16 },
        { creatureId: "norse_ancient_frost_troll", count: 6 },
        { creatureId: "norse_battle_valkyrie", count: 6 },
        { creatureId: "norse_storm_lindworm", count: 3 }
      ],
      "jokulsby"
    )
  },
  hostilePlayer: { playerId: "winter_host", name: "The Winter Host" },
  purchasableBuildingIds: ["norse_jotunn_camp", "norse_jotunn_camp_up", "norse_rune_circle_3", "norse_rune_merchant", "norse_fortress", "norse_storehouse", "norse_watchtower", "norse_training_ground", "norse_hall_of_kings"],
  committableGodIds: ALL_GODS,
  sites: M06_SITES,
  objectives: M06_OBJECTIVES,
  hostileHeroes: [
    {
      commander: {
        heroDefinitionId: "norse_glacier_trolls",
        name: "Glacier Trolls",
        classId: "huscarl",
        level: 1,
        attributes: { attack: 0, defense: 0, power: 0, knowledge: 0 },
        skills: [],
        spellbook: false,
        spellIds: [],
        mana: 0,
        portraitAssetId: "creature.norse.tier3.upgraded.portrait"
      },
      monster: { bounty: { gold: 900, crystal: 1 } },
      startCoord: { q: 18, r: 6 },
      army: [{ creatureId: "norse_ancient_frost_troll", count: 6 }],
      ai: {
        profile: "patrol",
        waypoints: [
          { q: 18, r: 6 },
          { q: 19, r: 8 },
          { q: 17, r: 7 }
        ],
        regionMinQ: 12,
        regionMaxQ: 21,
        regionCenter: { q: 18, r: 6 },
        regionRadius: 3,
        attackThreshold: { numerator: 3, denominator: 2 }
      }
    }
  ],
  helpTopics: [
    { id: "claim", title: "Claiming an oath", text: "Some rewards wait in the journal until you claim them. A claimed covenant is assigned to a town on the Town screen." },
    { id: "jotnar", title: "Jotnar", text: "Jotnar are slow, enormous and hard to kill. Two of them change a battle; protect them from shooters with Valkyries or wolves." },
    { id: "commander", title: "Guard commanders", text: "A guard led by a commander fights with that commander\u2019s attack, defense and skills, like a hero." }
  ],
  thumbnailAssetId: "mission.winter_oath.m06.thumbnail"
};
var stone = (id, q, r2, flag, name) => ({
  id,
  anchorId: id,
  coord: { q, r: r2 },
  name,
  description: "One of the two stones that seal the barrow-gate.",
  kind: {
    type: "activation",
    label: "relay",
    cost: { gold: 300, stone: 3 },
    requirements: [],
    reward: { flags: [flag] },
    completesMission: false,
    confirmText: `Cut the counter-rune on the ${name}? Both stones open the barrow-gate.`
  },
  markerHiddenUntilRevealed: false,
  objectiveIds: [id]
});
var M07_OBJECTIVES = [
  {
    id: "m07_approach",
    title: "Onto the plateau",
    description: "Clear either crossing of the plateau wall. One is enough to reach both rune-stones.",
    category: "primary",
    initialStatus: "active",
    condition: { type: "any", conditions: [{ type: "site_cleared", siteId: "m07_north_crossing" }, { type: "site_cleared", siteId: "m07_south_crossing" }] }
  },
  { id: "m07_stone_north", title: "The north stone", description: "Cut the counter-rune on the north stone (300 Gold, 3 Stone).", category: "primary", initialStatus: "locked", requires: ["m07_approach"], condition: { type: "site_activated", siteId: "m07_stone_north" }, markerSiteId: "m07_stone_north" },
  { id: "m07_stone_south", title: "The south stone", description: "Cut the counter-rune on the south stone (300 Gold, 3 Stone).", category: "primary", initialStatus: "locked", requires: ["m07_approach"], condition: { type: "site_activated", siteId: "m07_stone_south" }, markerSiteId: "m07_stone_south" },
  { id: "m07_gate", title: "Open the barrow-gate", description: "With both stones cut, the barrow-gate opens.", category: "primary", initialStatus: "locked", requires: ["m07_stone_north", "m07_stone_south"], condition: { type: "all", conditions: [{ type: "flag", flag: "stone_north" }, { type: "flag", flag: "stone_south" }] }, markerSiteId: "m07_barrow_gate" },
  { id: "m07_jarl", title: "The Grey Jarl", description: "Defeat the Grey Jarl in his hall ({army:norse_ancient_frost_troll=2,norse_deathless_draugr=20,norse_deathless_draugr=20,norse_fenrir_wolf=12,norse_runic_jotunn=2,norse_storm_lindworm=2}).", category: "primary", initialStatus: "locked", requires: ["m07_gate"], condition: { type: "site_cleared", siteId: "m07_jarl_hall" }, markerSiteId: "m07_jarl_hall" },
  { id: "m07_choice", title: "The sword", description: "At the barrow-door, decide what becomes of the sword.", category: "primary", initialStatus: "locked", requires: ["m07_jarl"], condition: { type: "any", conditions: [{ type: "flag", flag: "sword_returned" }, { type: "flag", flag: "sword_broken" }] }, markerSiteId: "m07_barrow_door" },
  { id: "m07_seal", title: "Seal the oath", description: "At the oath-mound, pay 1,000 Gold, 3 Crystal and 10 Favor to seal the oath and end the long winter.", category: "primary", initialStatus: "locked", requires: ["m07_choice"], condition: { type: "site_activated", siteId: "m07_oath_mound" }, markerSiteId: "m07_oath_mound" },
  { id: "m07_nest", title: "Wyrm crags (optional)", description: "Defeat the {army:norse_storm_lindworm=3} on the crags for 6 Crystal.", category: "optional", initialStatus: "active", condition: { type: "site_cleared", siteId: "m07_nest" }, markerSiteId: "m07_nest" }
];
var M07_SITES = [
  { id: "m07_town", anchorId: "m07_town", coord: { q: 3, r: 10 }, name: "Isafold", description: "A hunters\u2019 hold at the edge of the glacier plateau \u2014 the last one before the Jarl\u2019s mound.", kind: { type: "town", townId: "isafold" } },
  resSite2("m07_sawmill", 5, 6, "sawmill"),
  resSite2("m07_quarry", 5, 14, "quarry"),
  {
    id: "m07_north_crossing",
    anchorId: "m07_north_crossing",
    coord: { q: 10, r: 6 },
    name: "North Ice-stair",
    description: "Steps cut in the ice by the Jarl\u2019s dead.",
    kind: { type: "crossing" },
    guard: {
      label: "Stair-dead",
      army: [
        { creatureId: "norse_deathless_draugr", count: 30 },
        { creatureId: "norse_fenrir_wolf", count: 6 }
      ],
      reward: { resources: { gold: 1e3 } },
      battlefield: "ridge_pass"
    }
  },
  {
    id: "m07_south_crossing",
    anchorId: "m07_south_crossing",
    coord: { q: 10, r: 13 },
    name: "South Ice-stair",
    description: "Two giants who never woke, bound to the Jarl by a rune on their brows.",
    kind: { type: "crossing" },
    guard: {
      label: "Rune-bound giants",
      army: [
        { creatureId: "norse_jotunn", count: 2 },
        { creatureId: "norse_deathless_draugr", count: 12 }
      ],
      reward: { resources: { gold: 1e3 } },
      battlefield: "ridge_pass"
    }
  },
  stone("m07_stone_north", 15, 4, "stone_north", "North Stone"),
  stone("m07_stone_south", 15, 15, "stone_south", "South Stone"),
  {
    id: "m07_nest",
    anchorId: "m07_nest",
    coord: { q: 18, r: 17 },
    name: "Wyrm Crags",
    description: "Storm Lindworms circle a crag of blue crystal.",
    kind: { type: "landmark", landmark: "quarry_cache" },
    guard: { label: "Crag wyrms", army: [{ creatureId: "norse_storm_lindworm", count: 3 }], reward: { resources: { crystal: 6 } }, battlefield: "plateau" },
    objectiveIds: ["m07_nest"]
  },
  { id: "m07_barrow_gate", anchorId: "m07_barrow_gate", coord: { q: 22, r: 10 }, name: "Barrow-gate", description: "A door of turf and iron in the glacier. Both stones must be cut to open it.", kind: { type: "gate", openWhenFlags: ["stone_north", "stone_south"] }, objectiveIds: ["m07_gate"] },
  { id: "m07_cairn", anchorId: "m07_cairn", coord: { q: 25, r: 6 }, name: "Grave-goods", description: "Tribute the Jarl\u2019s dead brought to his door.", kind: { type: "pickup", reward: { resources: { gold: 1500, crystal: 3 } } } },
  {
    id: "m07_jarl_hall",
    anchorId: "m07_jarl_hall",
    coord: { q: 27, r: 10 },
    name: "Oathbreaker\u2019s Hall",
    description: "The Grey Jarl\u2019s hall, built on the mound where he swore his oath.",
    kind: { type: "crossing" },
    guard: {
      label: "The Grey Jarl and his hall",
      army: [
        { creatureId: "norse_ancient_frost_troll", count: 2 },
        { creatureId: "norse_deathless_draugr", count: 20 },
        { creatureId: "norse_deathless_draugr", count: 20 },
        { creatureId: "norse_fenrir_wolf", count: 12 },
        { creatureId: "norse_runic_jotunn", count: 2 },
        { creatureId: "norse_storm_lindworm", count: 2 }
      ],
      commander: {
        heroDefinitionId: "norse_grey_jarl",
        name: "The Grey Jarl",
        classId: "huscarl",
        level: 7,
        attributes: { attack: 6, defense: 5, power: 2, knowledge: 2 },
        skills: [
          { skillId: "offense", rank: 2 },
          { skillId: "armorer", rank: 2 },
          { skillId: "tactics", rank: 1 }
        ],
        spellbook: true,
        spellIds: ["frost_breath"],
        mana: 20,
        portraitAssetId: "hero.norse.grey_jarl.portrait"
      },
      reward: { resources: { gold: 2e3 }, flags: ["jarl_defeated"] },
      battlefield: "beacon_clearing"
    },
    objectiveIds: ["m07_jarl"]
  },
  {
    id: "m07_barrow_door",
    anchorId: "m07_barrow_door",
    coord: { q: 29, r: 8 },
    name: "The Barrow-door",
    description: "The door of the Jarl\u2019s mound. Inside, his grave-bed is empty, with a sword-shaped hollow in the stone.",
    kind: {
      type: "map_event",
      title: "The Sword and the Mound",
      text: "The Grey Jarl is gone, but his oath is not: it lives in the sword. Laid back in its hollow, it will keep the winter under the mound again \u2014 with a new keeper to watch it. Broken on the mound-stone, the oath ends forever, and every dead that ever answered it is free.",
      options: [
        { label: "Return the sword", summary: "The oath is renewed with Hervor as its keeper. Hervor gains 500 experience.", reward: { flags: ["sword_returned"], questXp: 500 } },
        { label: "Break the sword", summary: "The oath ends forever and the barrow-dead are free. Hervor gains 500 experience.", reward: { flags: ["sword_broken"], questXp: 500 } }
      ]
    },
    objectiveIds: ["m07_choice"]
  },
  {
    id: "m07_oath_mound",
    anchorId: "m07_oath_mound",
    coord: { q: 29, r: 12 },
    name: "The Oath-mound",
    description: "Where the oath was sworn, a thousand winters ago.",
    kind: {
      type: "activation",
      label: "beacon",
      cost: { gold: 1e3, crystal: 3, favor: 10 },
      requirements: [
        { type: "mission_flag", flag: "jarl_defeated" },
        { type: "any_of", requirements: [{ type: "mission_flag", flag: "sword_returned" }, { type: "mission_flag", flag: "sword_broken" }] }
      ],
      reward: { questXp: 3e3 },
      completesMission: true,
      confirmText: "Seal the oath at the mound? This completes The Winter Oath."
    },
    objectiveIds: ["m07_seal"]
  }
];
var M07 = {
  ...COMMON,
  id: "winter_oath_m07",
  scenarioId: "winter_oath_m07",
  order: 7,
  name: "Oathbreaker\u2019s Hall",
  subtitle: "Mission 7 \u2014 Endure",
  summary: "The Grey Jarl waits in his hall on the oath-mound. Climb the plateau, cut both stones to open the barrow-gate, defeat the Jarl, decide the sword\u2019s fate and seal the oath.",
  mapTemplateId: "winter_oath_m07_v1",
  soundscape: "storm_plateau",
  targetPlaytime: "35\u201345 minutes (target, unmeasured)",
  newDecisions: ["Navigate a hostile patrol", "The final battle", "The last choice"],
  xpCap: null,
  xpCapLevel: null,
  briefing: [
    JARL("A thousand winters I have kept my word, seeress. A thousand. Do you know what the world was like when I swore it? Do you know what it will be like when I stop?"),
    HERVOR("Warmer, Hrolf."),
    JARL("Do not use that name. Nobody has used it since my kingdom died. Come to my hall, then, and we will see whose oath is stronger.")
  ],
  victory: [EYDIS("Hervor. The fjord is cracking. All the way to the skerries, I can hear it from the hall.")],
  storyScenes: [
    {
      id: "m07_patrol",
      trigger: { type: "battle_started", heroDefinitionId: "norse_barrow_captain" },
      lines: [P2("Barrow Captain", "The plateau is the Jarl\u2019s. So is everything that dies on it.", "barrow_captain")]
    },
    {
      id: "m07_gate_open",
      trigger: { type: "objective_completed", objectiveId: "m07_gate" },
      lines: [
        SKEGGI("The barrow-gate is open. I have sung about this door for forty years, and I never thought I would see it."),
        HERVOR("Then keep your eyes open, skald. You will have to sing the rest.")
      ]
    },
    {
      id: "m07_jarl_battle",
      trigger: { type: "battle_started", siteId: "m07_jarl_hall" },
      lines: [
        JARL("You brought my sword home. That was kind. Now kneel, and carry my winter after me."),
        HERVOR("I brought your sword to end it. Draugar \u2014 stand with me one more time.")
      ]
    },
    {
      id: "m07_jarl_falls",
      trigger: { type: "site_cleared", siteId: "m07_jarl_hall" },
      lines: [
        JARL("A kingdom\u2026 they promised me a kingdom when the winter ended. And the winter never ended."),
        HERVOR("It ends now. I am sorry it was not the kingdom you wanted.")
      ]
    },
    {
      id: "m07_returned",
      trigger: { type: "flag", flag: "sword_returned" },
      lines: [
        HERVOR("Back in its bed. The oath holds \u2014 and I hold it now. Someone has to keep the dead asleep."),
        SKEGGI("A v\xF6lva keeping a king\u2019s oath. That will make a song.")
      ]
    },
    {
      id: "m07_broken",
      trigger: { type: "flag", flag: "sword_broken" },
      lines: [
        HERVOR("There. No oath, no keeper, no winter held under a mound. Whatever comes now comes honestly."),
        SKEGGI("And the dead? Every draugr in the north just heard that blade break."),
        HERVOR("They are free. Let them decide what to do with it.")
      ]
    },
    {
      id: "m07_losses",
      trigger: { type: "casualties", minLost: 16 },
      lines: [EYDIS("So many, Hervor. When this is over I will cut every name into a stone of its own. A good rune, this time.")]
    }
  ],
  debriefPolicy: ["The Winter Oath is complete. Replays run in a separate practice branch and cannot change this campaign record."],
  player: {
    playerId: "player",
    name: "Isafold",
    pantheonId: "norse",
    wallet: { gold: 2e4, wood: 30, stone: 35, crystal: 18, favor: 25 },
    town: {
      townId: "isafold",
      siteId: "m07_town",
      name: "Isafold",
      archetypeId: "norse_hold",
      buildings: [
        "norse_longhouse",
        "norse_jarls_hall",
        "norse_high_hall",
        "norse_mead_hall",
        "norse_trading_post",
        "norse_palisade",
        "norse_stronghold",
        "norse_barrow",
        "norse_barrow_up",
        "norse_wolf_den",
        "norse_wolf_den_up",
        "norse_smithy",
        "norse_rune_circle_1",
        "norse_rune_circle_2",
        "norse_rune_circle_3",
        "norse_hof_1",
        "norse_hof_2",
        "norse_valkyrie_aerie",
        "norse_valkyrie_aerie_up",
        "norse_troll_cave",
        "norse_troll_cave_up",
        "norse_lindworm_roost",
        "norse_lindworm_roost_up",
        "norse_jotunn_camp"
      ],
      population: { norse_draugr: 14, norse_frost_wolf: 9, norse_frost_troll: 6, norse_valkyrie: 4, norse_lindworm: 3, norse_jotunn: 2 },
      covenants: ["norse_frost_troll", "norse_jotunn"]
    },
    hero: hervor(
      { level: 7, xp: 8400, attributes: { attack: 3, defense: 3, power: 5, knowledge: 5 }, skills: [{ skillId: "wisdom", rank: 2 }, { skillId: "armorer", rank: 2 }, { skillId: "leadership", rank: 2 }, { skillId: "offense", rank: 1 }], spellbook: true },
      [
        { creatureId: "norse_deathless_draugr", count: 48 },
        { creatureId: "norse_fenrir_wolf", count: 18 },
        { creatureId: "norse_ancient_frost_troll", count: 8 },
        { creatureId: "norse_battle_valkyrie", count: 8 },
        { creatureId: "norse_storm_lindworm", count: 4 },
        { creatureId: "norse_jotunn", count: 2 }
      ],
      "isafold"
    )
  },
  hostilePlayer: { playerId: "winter_host", name: "The Winter Host" },
  purchasableBuildingIds: ["norse_jotunn_camp_up", "norse_rune_merchant", "norse_fortress", "norse_storehouse", "norse_watchtower", "norse_training_ground", "norse_hall_of_kings"],
  committableGodIds: ALL_GODS,
  sites: M07_SITES,
  objectives: M07_OBJECTIVES,
  hostileHeroes: [
    {
      commander: {
        heroDefinitionId: "norse_barrow_captain",
        name: "Barrow Captain",
        classId: "huscarl",
        level: 4,
        attributes: { attack: 4, defense: 3, power: 1, knowledge: 1 },
        skills: [
          { skillId: "offense", rank: 1 },
          { skillId: "armorer", rank: 1 },
          { skillId: "tactics", rank: 1 }
        ],
        spellbook: false,
        spellIds: [],
        mana: 10,
        portraitAssetId: "hero.norse.barrow_captain.portrait"
      },
      startCoord: { q: 17, r: 10 },
      army: [
        { creatureId: "norse_deathless_draugr", count: 24 },
        { creatureId: "norse_fenrir_wolf", count: 8 },
        { creatureId: "norse_ancient_frost_troll", count: 2 }
      ],
      ai: {
        profile: "patrol",
        waypoints: [
          { q: 13, r: 8 },
          { q: 18, r: 10 },
          { q: 13, r: 12 },
          { q: 16, r: 10 }
        ],
        regionMinQ: 11,
        regionMaxQ: 21,
        attackThreshold: { numerator: 11, denominator: 10 }
      }
    }
  ],
  helpTopics: [
    { id: "patrol", title: "The plateau patrol", text: "The Barrow Captain takes one ordinary turn after yours each day, cannot see through fog and never leaves the plateau between the ice-stairs and the barrow-gate." },
    { id: "stones", title: "The two stones", text: "Either ice-stair reaches both stones. Only both stones together open the barrow-gate." },
    { id: "last_choice", title: "The last choice", text: "The sword\u2019s fate changes the ending you see, not the reward: both choices complete the campaign." }
  ],
  thumbnailAssetId: "mission.winter_oath.m07.thumbnail"
};
var WINTER_OATH_MISSIONS = [M012, M022, M032, M04, M05, M06, M07];
var WINTER_OATH = {
  id: "winter_oath",
  name: "The Winter Oath",
  tagline: "Wake. Bind. Endure.",
  summary: "The winter did not end. Kaldvik\u2019s barrow has opened, white wolves cut the roads and the Grey Jarl wants back the sword the seeress Hervor took from his mound. Lead Hervor through seven linked missions to bind the long winter \u2014 and decide what becomes of the oath.",
  pantheonId: "norse",
  startingGodOptions: ["norse_odin"],
  startingGodNote: "Odin is the fixed patron of this campaign. Thor or Tyr comes in Mission 3; a second god (Freyja, Heimdall or Hel) in Mission 5.",
  missionIds: WINTER_OATH_MISSIONS.map((m) => m.id),
  heroDefinitionId: "norse_hervor",
  carryoverPolicy: [
    { category: "Hero identity, XP, skills, primary growth", policy: "Preserved (after the mission\u2019s displayed XP cap)" },
    { category: "Spellbook, spells, equipment, backpack", policy: "Preserved" },
    { category: "Odin and every minor-god commitment", policy: "Preserved" },
    { category: "Hero mana and movement", policy: "Refilled to the new mission\u2019s full budget" },
    { category: "Army, wallet, towns, pools, mines", policy: "Replaced by the next war-band manifest" },
    { category: "Fog, local quest flags, enemies, day", policy: "Reset to the mission\u2019s initial state" }
  ],
  status: "playable",
  thumbnailAssetId: "campaign.winter_oath.thumbnail",
  epilogue: [
    EYDIS("The ice on the fjord broke this morning. The boats are already arguing about who goes first."),
    SKEGGI("Seven runes, a pack of wolves, a jarl, a giant\u2019s horn and a king\u2019s oath. I will need a longer song.")
  ],
  epilogueVariants: [
    {
      flag: "sword_returned",
      lines: [
        HERVOR("The oath is mine now. Every winter, I will walk north to the mound and make sure it stays asleep."),
        EYDIS("Then I will count one more name every winter: yours, coming home.")
      ]
    },
    {
      flag: "sword_broken",
      lines: [
        HERVOR("No more oaths under mounds. The dead are free, and the winter will come and go as winters should."),
        EYDIS("Some of the draugar came down to the hold last night. They only stood at the edge of the firelight, watching the boats. Then they walked away into the hills."),
        HERVOR("Let them go. They have kept enough promises.")
      ]
    }
  ]
};

// ../pantheon_realms/packages/content/src/campaign/arc.ts
var stacks = (a2) => a2.map(([creatureId, count]) => ({ creatureId, count }));
var bld = (ctx, slot3, level = 1) => `${ctx.pantheonId}_${slot3}_l${level}`;
var dw = (ctx, tier, level = 1) => bld(ctx, `dwelling_t${tier}`, level);
function speaker(pantheonId, name, slug2 = name.toLowerCase().replace(/^the /, "").replace(/[^a-z]+/g, "_")) {
  return (text) => ({ speaker: name, portraitAssetId: `hero.${pantheonId}.${slug2}.portrait`, text });
}
function arcEntitlements(ctx, names, summaries) {
  return [
    { id: `covenant.${ctx.covenantT3}.${ctx.id}3`, name: names.t3, kind: "covenant", familyId: ctx.covenantT3, summary: summaries.t3 },
    { id: `covenant.${ctx.covenantT6}.${ctx.id}6`, name: names.t6, kind: "covenant", familyId: ctx.covenantT6, summary: summaries.t6 }
  ];
}
function arcHero(pantheonId, id, name, title, classId, biography, availability) {
  return {
    id,
    pantheonId,
    name,
    title,
    classId,
    biography,
    portraitAssetId: `hero.${pantheonId}.${id.replace(`${pantheonId}_`, "")}.portrait`,
    availability,
    provenance: { source: "proposed-this-build", note: "Campaign character (owner request 2026-10-02: campaigns for the four remaining pantheons)." }
  };
}
function arcCommander(hero4, preset, spellIds = []) {
  const p = {
    patrol4: { level: 3, attributes: { attack: 3, defense: 3, power: 1, knowledge: 1 }, skills: [{ skillId: "offense", rank: 1 }, { skillId: "armorer", rank: 1 }], mana: 10 },
    gate6: { level: 6, attributes: { attack: 5, defense: 4, power: 1, knowledge: 1 }, skills: [{ skillId: "offense", rank: 2 }, { skillId: "armorer", rank: 1 }, { skillId: "tactics", rank: 1 }], mana: 10 },
    patrol7: { level: 4, attributes: { attack: 4, defense: 3, power: 1, knowledge: 1 }, skills: [{ skillId: "offense", rank: 1 }, { skillId: "armorer", rank: 1 }, { skillId: "tactics", rank: 1 }], mana: 10 },
    boss7: { level: 7, attributes: { attack: 6, defense: 5, power: 2, knowledge: 2 }, skills: [{ skillId: "offense", rank: 2 }, { skillId: "armorer", rank: 2 }, { skillId: "tactics", rank: 1 }], mana: 20 }
  }[preset];
  return { heroDefinitionId: hero4.id, name: hero4.name, classId: hero4.classId, ...p, spellbook: spellIds.length > 0, spellIds, portraitAssetId: hero4.portraitAssetId };
}
var site = (id, at, n, kind, extra = {}) => ({
  id,
  anchorId: id,
  coord: { q: at[0], r: at[1] },
  name: n.name,
  description: n.description,
  kind,
  ...extra
});
var RES = {
  sawmill: { name: "Sawmill", resource: "wood", dailyYield: 2, description: "An unowned timber camp. Capture for +2 Wood per day." },
  quarry: { name: "Quarry", resource: "stone", dailyYield: 2, description: "An unowned quarry. Capture for +2 Stone per day." },
  gold_mine: { name: "Gold Mine", resource: "gold", dailyYield: 1e3, description: "An unowned mine. Capture for +1,000 Gold per day." },
  crystal_deposit: { name: "Crystal Deposit", resource: "crystal", dailyYield: 1, description: "An unowned crystal outcrop. Capture for +1 Crystal per day." }
};
var res = (id, at, type, guard) => site(id, at, RES[type], { type: "resource_site", siteType: type, resource: RES[type].resource, dailyYield: RES[type].dailyYield }, guard ? { guard: g(guard) } : {});
var g = (s3) => ({ label: s3.label, army: stacks(s3.army), reward: s3.reward, battlefield: s3.battlefield, ...s3.commander ? { commander: s3.commander } : {} });
var event = (id, at, e, objectiveIds) => site(id, at, e, { type: "map_event", title: e.title, text: e.text, options: e.options }, objectiveIds ? { objectiveIds } : {});
function template(ctx, n, size, barriers, sites, roads, biome, patrolLoop) {
  return {
    id: `${ctx.id}_m0${n}_v1`,
    version: 1,
    width: size[0],
    height: size[1],
    goldenSeed: ctx.seed + n * 101,
    barriers,
    anchors: sites.map((s3) => ({ id: s3.anchorId, coord: s3.coord })),
    roadEdges: roads,
    ...patrolLoop ? { patrolLoop } : {},
    biome
  };
}
function missionBase(ctx, n, kind, w, playtime, xpCap, xpCapLevel) {
  return {
    id: `${ctx.id}_m0${n}`,
    scenarioId: `${ctx.id}_m0${n}`,
    campaignId: ctx.id,
    order: n,
    name: w.name,
    subtitle: `Mission ${n} \u2014 ${kind}`,
    summary: w.summary,
    mapTemplateId: `${ctx.id}_m0${n}_v1`,
    soundscape: w.soundscape,
    targetPlaytime: playtime,
    newDecisions: w.newDecisions,
    xpCap,
    xpCapLevel,
    briefing: w.briefing,
    victory: w.victory,
    debriefPolicy: ctx.debriefPolicy,
    signatureMechanics: true,
    features: { expandedContent: true, heroSpecialties: true },
    heroHiringEnabled: false,
    heroHiringDisabledReason: ctx.hiringReason,
    protectedHeroFailure: true,
    thumbnailAssetId: `mission.${ctx.id}.m0${n}.thumbnail`
  };
}
function player(ctx, w, siteId, wallet, buildings, population, covenants, heroDefaults, army) {
  return {
    playerId: "player",
    name: w.town.name,
    pantheonId: ctx.pantheonId,
    wallet,
    town: { townId: w.town.townId, siteId, name: w.town.name, archetypeId: ctx.archetypeId, buildings, population, covenants },
    hero: { heroId: ctx.hero.heroId, definitionId: ctx.hero.definitionId, classId: ctx.hero.classId, defaults: heroDefaults, army: stacks(army), startTownId: w.town.townId }
  };
}
var O = (o) => o;
var locked = (id, title, description, requires, condition, extra = {}) => O({ id, title, description, category: "primary", initialStatus: "locked", requires, condition, ...extra });
var optional = (id, title, description, condition, markerSiteId) => O({ id, title, description, category: "optional", initialStatus: "active", condition, ...markerSiteId ? { markerSiteId } : {} });
function band(heroDefinitionId, name, portraitAssetId, home, waypoints, army, bounty, minQ, maxQ) {
  return {
    commander: { heroDefinitionId, name, classId: "champion", level: 1, attributes: { attack: 0, defense: 0, power: 0, knowledge: 0 }, skills: [], spellbook: false, spellIds: [], mana: 0, portraitAssetId },
    monster: { bounty },
    startCoord: { q: home[0], r: home[1] },
    army: stacks(army),
    ai: { profile: "patrol", waypoints: waypoints.map(([q, r2]) => ({ q, r: r2 })), regionMinQ: minQ, regionMaxQ: maxQ, regionCenter: { q: home[0], r: home[1] }, regionRadius: 3, attackThreshold: { numerator: 3, denominator: 2 } }
  };
}
function patrol(commander, start, waypoints, army, minQ, maxQ) {
  return {
    commander,
    startCoord: { q: start[0], r: start[1] },
    army: stacks(army),
    ai: { profile: "patrol", waypoints: waypoints.map(([q, r2]) => ({ q, r: r2 })), regionMinQ: minQ, regionMaxQ: maxQ, attackThreshold: { numerator: 11, denominator: 10 } }
  };
}
var IN_ORDER = { id: "in_order", title: "Steps in order", text: "Each primary step opens after the one before it. Work done early still counts: a step whose goal is already met completes the moment it opens." };
function restoreMission(ctx, s3) {
  const P7 = "m01";
  const ids = { town: `${P7}_town`, sawmill: `${P7}_sawmill`, quarry: `${P7}_quarry`, event: `${P7}_event`, camp: `${P7}_camp`, crossing: `${P7}_crossing`, cache: `${P7}_cache`, monument: `${P7}_monument` };
  const t1 = ctx.t[1];
  const sites = [
    site(ids.town, [3, 7], s3.town, { type: "town", townId: s3.town.townId }),
    res(ids.sawmill, [4, 3], "sawmill"),
    res(ids.quarry, [5, 11], "quarry"),
    event(ids.event, [7, 5], s3.event, [`${P7}_event`]),
    site(ids.camp, [8, 2], s3.camp, { type: "creature_camp", creatureId: s3.camp.creatureId, weeklyGrowth: 3, initialStock: 5 }),
    site(ids.crossing, [10, 8], s3.crossing, { type: "crossing" }, { guard: g(s3.crossing.guard), objectiveIds: [`${P7}_crossing`] }),
    site(ids.cache, [14, 11], s3.cache, { type: "pickup", reward: s3.cache.reward }),
    site(
      ids.monument,
      [16, 7],
      s3.monument,
      {
        type: "activation",
        label: "beacon",
        cost: { gold: 300, stone: 3, crystal: 1 },
        requirements: [
          { type: "objective_completed", objectiveId: `${P7}_recruit` },
          { type: "objective_completed", objectiveId: `${P7}_train` }
        ],
        reward: { questXp: 900 },
        completesMission: true,
        confirmText: s3.monument.confirm
      },
      { guard: g(s3.monument.guard), objectiveIds: [`${P7}_guard`, `${P7}_activate`] }
    )
  ];
  const objectives = [
    O({ id: `${P7}_recruit`, title: s3.objectives.recruit, description: "", category: "primary", initialStatus: "active", condition: { type: "counter_at_least", counter: `recruited:${t1.base}`, value: 10 } }),
    locked(`${P7}_train`, s3.objectives.train, "", [`${P7}_recruit`], { type: "counter_at_least", counter: `trained:${t1.base}`, value: 8 }),
    locked(`${P7}_crossing`, s3.objectives.crossing, "", [`${P7}_train`], { type: "site_cleared", siteId: ids.crossing }, { markerSiteId: ids.crossing }),
    locked(`${P7}_guard`, s3.objectives.guard, "", [`${P7}_crossing`], { type: "site_cleared", siteId: ids.monument }, { markerSiteId: ids.monument }),
    locked(`${P7}_activate`, s3.objectives.activate, "", [`${P7}_guard`], { type: "site_activated", siteId: ids.monument }, { markerSiteId: ids.monument }),
    optional(`${P7}_event`, s3.objectives.event, s3.event.description, { type: "site_visited", siteId: ids.event }, ids.event)
  ];
  return {
    template: template(ctx, 1, [20, 14], [{ q: 10, terrain: s3.barrier, openings: [{ q: 10, r: 8 }] }], sites, [
      [ids.town, ids.crossing],
      [ids.crossing, ids.monument],
      [ids.town, ids.sawmill],
      [ids.town, ids.quarry],
      [ids.town, ids.event],
      [ids.sawmill, ids.camp],
      [ids.monument, ids.cache]
    ], s3.biome),
    mission: {
      ...missionBase(ctx, 1, "Restore", s3, "15\u201320 minutes (target, unmeasured)", 3199, 3),
      storyScenes: s3.scenes({ crossing: ids.crossing, monument: ids.monument }),
      player: player(
        ctx,
        s3,
        ids.town,
        { gold: 5e3, wood: 12, stone: 18, crystal: 2, favor: 0 },
        [bld(ctx, "civic_hall"), bld(ctx, "tavern"), bld(ctx, "fortifications"), dw(ctx, 1), bld(ctx, "mage_guild")],
        { [familyOf(ctx, 1)]: 14 },
        [],
        { level: 1, xp: 0, attributes: { attack: 1, defense: 1, power: 2, knowledge: 2 }, skills: [{ skillId: "wisdom", rank: 1 }], spellbook: true },
        [
          [t1.base, 18],
          [ctx.t[2].base, 6]
        ]
      ),
      purchasableBuildingIds: [dw(ctx, 1, 2), dw(ctx, 2), bld(ctx, "civic_hall", 2), bld(ctx, "marketplace"), bld(ctx, "workshop"), bld(ctx, "pantheon_temple")],
      committableGodIds: ctx.gods.first,
      sites,
      objectives: describe(objectives, {
        [`${P7}_recruit`]: `Recruit at least 10 ${nameOf(ctx, t1.base)} in ${s3.town.name}. Starting troops and creatures that join on the map do not count.`,
        [`${P7}_train`]: `Build the upgraded dwelling, then train at least 8 ${nameOf(ctx, t1.base)} into ${nameOf(ctx, t1.up)}.`,
        [`${P7}_crossing`]: `Defeat ${armyText(ctx, s3.crossing.guard.army)} at ${s3.crossing.name}.`,
        [`${P7}_guard`]: `Defeat ${armyText(ctx, s3.monument.guard.army)} at ${s3.monument.name}.`,
        [`${P7}_activate`]: `At ${s3.monument.name}, with its guard broken and both muster steps met, pay 300 Gold, 3 Stone and 1 Crystal.`
      }),
      hostileHeroes: [],
      helpTopics: [
        IN_ORDER,
        { id: "upgrade_vs_training", title: "Dwelling upgrade vs. troop training", text: "Upgrading a dwelling unlocks the upgraded form. Training converts existing troops in town for the price difference and uses no population." },
        { id: "map_events", title: "One-time choices", text: "Some places offer a choice the first time a hero arrives. The result of each option is shown before you choose, and the choice cannot be taken back." },
        ...s3.help ?? []
      ]
    }
  };
}
function huntMission(ctx, s3) {
  const P7 = "m02";
  const ids = { town: `${P7}_town`, sawmill: `${P7}_sawmill`, quarry: `${P7}_quarry`, lookout: `${P7}_lookout`, event: `${P7}_event`, camp: `${P7}_camp`, bridge: `${P7}_bridge`, lair: `${P7}_lair`, crystal: `${P7}_crystal`, stone: `${P7}_stone` };
  const t2 = ctx.t[2];
  const sites = [
    site(ids.town, [3, 8], s3.town, { type: "town", townId: s3.town.townId }),
    res(ids.sawmill, [4, 4], "sawmill"),
    res(ids.quarry, [5, 12], "quarry"),
    site(ids.lookout, [8, 5], s3.lookout, { type: "watchtower", revealSiteIds: [ids.lair, ids.stone] }, { objectiveIds: [`${P7}_lookout`] }),
    event(ids.event, [9, 2], s3.event, [`${P7}_event`]),
    site(ids.camp, [8, 12], s3.camp, { type: "creature_camp", creatureId: s3.camp.creatureId, weeklyGrowth: 3, initialStock: 4 }),
    site(ids.bridge, [12, 8], s3.bridge, { type: "crossing" }, { guard: g(s3.bridge.guard), objectiveIds: [`${P7}_bridge`] }),
    site(ids.lair, [17, 3], s3.lair, { type: "landmark", landmark: "refuge" }, { guard: g(s3.lair.guard), markerHiddenUntilRevealed: true, objectiveIds: [`${P7}_lair`] }),
    res(ids.crystal, [16, 13], "crystal_deposit"),
    site(
      ids.stone,
      [21, 8],
      s3.stone,
      {
        type: "activation",
        label: "beacon",
        cost: { gold: 400, stone: 4, crystal: 1 },
        requirements: [{ type: "objective_completed", objectiveId: `${P7}_prey` }],
        reward: { questXp: 1400 },
        completesMission: true,
        confirmText: s3.stone.confirm
      },
      { markerHiddenUntilRevealed: true, objectiveIds: [`${P7}_activate`] }
    )
  ];
  const objectives = [
    O({ id: `${P7}_recruit`, title: s3.objectives.recruit, description: `Build the tier-2 dwelling in ${s3.town.name} and recruit at least 8 ${nameOf(ctx, t2.base)}. Creatures bought at camps do not count.`, category: "primary", initialStatus: "active", condition: { type: "counter_at_least", counter: `recruited:${t2.base}`, value: 8 } }),
    locked(`${P7}_lookout`, s3.objectives.lookout, `Climb ${s3.lookout.name} to see the land beyond the river.`, [`${P7}_recruit`], { type: "site_visited", siteId: ids.lookout }, { markerSiteId: ids.lookout }),
    locked(`${P7}_bridge`, s3.objectives.bridge, `Defeat ${armyText(ctx, s3.bridge.guard.army)} at ${s3.bridge.name}.`, [`${P7}_lookout`], { type: "site_cleared", siteId: ids.bridge }, { markerSiteId: ids.bridge }),
    locked(`${P7}_prey`, s3.objectives.prey, `Catch and defeat ${s3.prey.name} (${armyText(ctx, s3.prey.army)}) beyond the river.`, [`${P7}_bridge`], { type: "hero_defeated", heroDefinitionId: s3.prey.id }, { hint: s3.objectives.preyHint }),
    locked(`${P7}_activate`, s3.objectives.activate, `With ${s3.prey.name} broken, pay 400 Gold, 4 Stone and 1 Crystal at ${s3.stone.name}.`, [`${P7}_prey`], { type: "site_activated", siteId: ids.stone }, { markerSiteId: ids.stone }),
    optional(`${P7}_lair`, s3.objectives.lair, `Defeat ${armyText(ctx, s3.lair.guard.army)} at ${s3.lair.name}.`, { type: "site_cleared", siteId: ids.lair }, ids.lair),
    optional(`${P7}_event`, s3.objectives.event, s3.event.description, { type: "site_visited", siteId: ids.event }, ids.event)
  ];
  return {
    template: template(
      ctx,
      2,
      [24, 16],
      [{ q: 12, terrain: s3.barrier, openings: [{ q: 12, r: 8 }] }],
      sites,
      [
        [ids.town, ids.bridge],
        [ids.bridge, ids.stone],
        [ids.town, ids.sawmill],
        [ids.town, ids.quarry],
        [ids.town, ids.lookout],
        [ids.lookout, ids.event],
        [ids.quarry, ids.camp],
        [ids.bridge, ids.lair],
        [ids.stone, ids.crystal]
      ],
      s3.biome,
      [
        { q: 16, r: 7 },
        { q: 18, r: 8 },
        { q: 17, r: 10 },
        { q: 15, r: 9 }
      ]
    ),
    mission: {
      ...missionBase(ctx, 2, "Hunt", s3, "20\u201325 minutes (target, unmeasured)", 4599, 4),
      storyScenes: s3.scenes({ lookout: ids.lookout, prey: s3.prey.id, preyObjective: `${P7}_prey` }),
      player: player(
        ctx,
        s3,
        ids.town,
        { gold: 8e3, wood: 20, stone: 25, crystal: 5, favor: 5 },
        [bld(ctx, "civic_hall"), bld(ctx, "tavern"), bld(ctx, "marketplace"), bld(ctx, "fortifications"), dw(ctx, 1), dw(ctx, 1, 2), bld(ctx, "workshop"), bld(ctx, "mage_guild"), bld(ctx, "pantheon_temple")],
        { [familyOf(ctx, 1)]: 14 },
        [],
        { level: 2, xp: 1100, attributes: { attack: 1, defense: 1, power: 3, knowledge: 2 }, skills: [{ skillId: "wisdom", rank: 1 }, { skillId: "armorer", rank: 1 }], spellbook: true },
        [
          [ctx.t[1].base, 24],
          [ctx.t[1].up, 12],
          [t2.base, 8]
        ]
      ),
      hostilePlayer: { playerId: "arc_host", name: ctx.hostName },
      purchasableBuildingIds: [dw(ctx, 2), dw(ctx, 2, 2), bld(ctx, "civic_hall", 2), bld(ctx, "resource_depot"), bld(ctx, "mage_guild", 2), bld(ctx, "training_academy")],
      committableGodIds: ctx.gods.first,
      sites,
      objectives,
      hostileHeroes: [band(s3.prey.id, s3.prey.name, s3.prey.portraitAssetId, [17, 8], [[16, 7], [18, 8], [17, 10], [15, 9]], s3.prey.army, s3.prey.bounty, 13, 22)],
      helpTopics: [
        IN_ORDER,
        { id: "wandering", title: "Wandering bands", text: "A wandering band stays near its hunting ground, moves after your turn and attacks only an army it judges clearly weaker. Move onto it to fight it." },
        { id: "lookout", title: "Lookouts", text: "Climbing a lookout marks distant sites on your map, so you can plan a route before you can see them." },
        { id: "camps", title: "Creature camps", text: "A camp sells its creatures to a visiting hero at their normal price. Its stock grows every week." },
        ...s3.help ?? []
      ]
    }
  };
}
function covenantMission(ctx, s3) {
  const P7 = "m03";
  const ids = { town: `${P7}_town`, sawmill: `${P7}_sawmill`, quarry: `${P7}_quarry`, cache: `${P7}_cache`, pass: `${P7}_pass`, roost: `${P7}_roost`, crystal: `${P7}_crystal`, hearth: `${P7}_hearth`, home: `${P7}_home`, bridge: `${P7}_bridge`, stone: `${P7}_stone` };
  const covenant3 = `covenant.${ctx.covenantT3}.${ctx.id}3`;
  const t4 = ctx.t[4];
  const sites = [
    site(ids.town, [3, 9], s3.town, { type: "town", townId: s3.town.townId }),
    res(ids.sawmill, [5, 5], "sawmill"),
    res(ids.quarry, [5, 13], "quarry"),
    site(ids.cache, [8, 15], s3.cache, { type: "pickup", reward: s3.cache.reward }, { objectiveIds: [`${P7}_cache`] }),
    site(ids.pass, [13, 9], s3.pass, { type: "crossing" }, { guard: g(s3.pass.guard), objectiveIds: [`${P7}_pass`] }),
    site(ids.roost, [17, 4], s3.roost, { type: "creature_camp", creatureId: t4.base, weeklyGrowth: 2, initialStock: 3 }, { guard: g(s3.roost.guard), objectiveIds: [`${P7}_roost`] }),
    res(ids.crystal, [16, 9], "crystal_deposit"),
    site(ids.hearth, [15, 13], s3.hearth, {
      type: "map_event",
      title: s3.hearth.title,
      text: s3.hearth.text,
      options: [
        { label: s3.hearth.payLabel, summary: `Pay ${costText(s3.hearth.price)}: gain the covenant.`, cost: s3.hearth.price, reward: { entitlementIds: [covenant3], flags: ["covenant_bargain"] } },
        { label: s3.hearth.refuseLabel, summary: `Nothing is paid. The covenant must be won at ${s3.home.name}.`, reward: {} }
      ]
    }),
    site(ids.home, [17, 15], s3.home, { type: "landmark", landmark: "refuge" }, { guard: g({ ...s3.home.guard, reward: { ...s3.home.guard.reward, entitlementIds: [covenant3] } }) }),
    site(ids.bridge, [20, 9], s3.bridge, { type: "crossing" }, { guard: g(s3.bridge.guard) }),
    site(
      ids.stone,
      [23, 9],
      s3.stone,
      {
        type: "activation",
        label: "beacon",
        cost: { gold: 500, crystal: 2 },
        requirements: [
          { type: "objective_completed", objectiveId: `${P7}_god` },
          { type: "objective_completed", objectiveId: `${P7}_elite` }
        ],
        reward: { questXp: 2e3 },
        completesMission: true,
        confirmText: s3.stone.confirm
      },
      { objectiveIds: [`${P7}_activate`] }
    )
  ];
  const objectives = [
    O({ id: `${P7}_pass`, title: s3.objectives.pass, description: `Defeat ${armyText(ctx, s3.pass.guard.army)} at ${s3.pass.name}.`, category: "primary", initialStatus: "active", condition: { type: "site_cleared", siteId: ids.pass }, markerSiteId: ids.pass }),
    locked(`${P7}_roost`, s3.objectives.roost, `Drive ${armyText(ctx, s3.roost.guard.army)} out of ${s3.roost.name}.`, [`${P7}_pass`], { type: "site_cleared", siteId: ids.roost }, { markerSiteId: ids.roost }),
    locked(`${P7}_covenant`, s3.objectives.covenant, s3.objectives.covenantDescription, [`${P7}_roost`], { type: "any", conditions: [{ type: "flag", flag: "covenant_bargain" }, { type: "site_cleared", siteId: ids.home }] }, { hint: "Both routes give the same covenant. The fight gives experience; the bargain saves troops. Assign the covenant to your town to build its dwelling." }),
    locked(`${P7}_god`, s3.objectives.god, "Build the Temple\u2019s second level and commit to a first minor god (20 Favor, irreversible).", [`${P7}_covenant`], { type: "player_has_minor_god" }, { hint: "Open the Pantheon screen once the Temple stands at its second level. A god chosen earlier counts as soon as this step opens." }),
    locked(`${P7}_elite`, s3.objectives.elite, `Have at least 2 ${nameOf(ctx, t4.up)} in ${ctx.hero.name}\u2019s army.`, [`${P7}_god`], { type: "hero_army_contains", heroId: ctx.hero.heroId, creatureId: t4.up, count: 2 }, { live: true, hint: "Build the tier-4 dwelling and its upgrade, then recruit or train." }),
    locked(`${P7}_activate`, s3.objectives.activate, `Cross ${s3.bridge.name} and, with a god chosen and the elite in the army, pay 500 Gold and 2 Crystal at ${s3.stone.name}.`, [`${P7}_elite`], { type: "site_activated", siteId: ids.stone }, { markerSiteId: ids.stone }),
    optional(`${P7}_cache`, s3.objectives.cache, s3.cache.description, { type: "site_visited", siteId: ids.cache }, ids.cache)
  ];
  return {
    template: template(
      ctx,
      3,
      [26, 18],
      [
        { q: 13, terrain: "mountain", openings: [{ q: 13, r: 9 }] },
        { q: 20, terrain: "water", openings: [{ q: 20, r: 9 }] }
      ],
      sites,
      [
        [ids.town, ids.pass],
        [ids.pass, ids.crystal],
        [ids.crystal, ids.bridge],
        [ids.bridge, ids.stone],
        [ids.pass, ids.roost],
        [ids.pass, ids.hearth],
        [ids.hearth, ids.home],
        [ids.town, ids.sawmill],
        [ids.town, ids.quarry],
        [ids.quarry, ids.cache]
      ],
      s3.biome
    ),
    mission: {
      ...missionBase(ctx, 3, "Covenant", s3, "25\u201330 minutes (target, unmeasured)", 6199, 5),
      storyScenes: s3.scenes({ roost: ids.roost, home: ids.home, covenant: `${P7}_covenant`, god: `${P7}_god` }),
      player: player(
        ctx,
        s3,
        ids.town,
        { gold: 11e3, wood: 25, stone: 30, crystal: 8, favor: 15 },
        [bld(ctx, "civic_hall"), bld(ctx, "civic_hall", 2), bld(ctx, "tavern"), bld(ctx, "marketplace"), bld(ctx, "fortifications"), dw(ctx, 1), dw(ctx, 1, 2), dw(ctx, 2), dw(ctx, 2, 2), bld(ctx, "workshop"), bld(ctx, "mage_guild"), bld(ctx, "pantheon_temple")],
        { [familyOf(ctx, 1)]: 14, [familyOf(ctx, 2)]: 9 },
        [],
        { level: 3, xp: 2500, attributes: { attack: 1, defense: 2, power: 3, knowledge: 3 }, skills: [{ skillId: "wisdom", rank: 1 }, { skillId: "armorer", rank: 1 }, { skillId: "leadership", rank: 1 }], spellbook: true },
        [
          [ctx.t[1].base, 20],
          [ctx.t[1].up, 18],
          [ctx.t[2].base, 8],
          [ctx.t[2].up, 4]
        ]
      ),
      hostilePlayer: { playerId: "arc_host", name: ctx.hostName },
      purchasableBuildingIds: [bld(ctx, "pantheon_temple", 2), dw(ctx, 4), dw(ctx, 4, 2), dw(ctx, 3), dw(ctx, 3, 2), bld(ctx, "mage_guild", 2), bld(ctx, "resource_depot"), bld(ctx, "training_academy"), bld(ctx, "fortifications", 2)],
      committableGodIds: ctx.gods.first,
      sites,
      objectives,
      hostileHeroes: [band(s3.band.id, s3.band.name, `creature.${ctx.pantheonId}.tier2.base.portrait`, [10, 4], [[9, 3], [11, 5], [10, 6]], s3.band.army, { gold: 400 }, 7, 12)],
      helpTopics: [
        IN_ORDER,
        { id: "covenant", title: "Covenants", text: "Some dwellings need a covenant. A covenant won in a mission is assigned to a town from the journal or the town screen; the dwelling can then be built there." },
        { id: "first_god", title: "The first minor god", text: "A first minor god needs the Temple\u2019s second level and costs 20 Favor. The choice is permanent and carries into later missions." },
        ...s3.help ?? []
      ]
    }
  };
}
function seekMission(ctx, s3) {
  const P7 = "m04";
  const ids = { town: `${P7}_town`, sawmill: `${P7}_sawmill`, quarry: `${P7}_quarry`, wanderer: `${P7}_wanderer`, wreck: `${P7}_wreck`, landing: `${P7}_landing`, omen: `${P7}_omen`, north: `${P7}_north`, south: `${P7}_south`, nest: `${P7}_nest`, gate: `${P7}_gate`, goal: `${P7}_goal` };
  const t5 = ctx.t[5];
  const relay2 = (id, at, n, flag) => site(id, at, n, { type: "activation", label: "relay", cost: s3.relays.cost, requirements: [], reward: { flags: [flag] }, completesMission: false, confirmText: `Light ${n.name}? Both together open ${s3.gate.name}.` }, { objectiveIds: [id] });
  const sites = [
    site(ids.town, [3, 9], s3.town, { type: "town", townId: s3.town.townId }),
    res(ids.sawmill, [5, 5], "sawmill"),
    res(ids.quarry, [5, 13], "quarry"),
    event(ids.wanderer, [7, 3], s3.wanderer, [`${P7}_wanderer`]),
    site(ids.wreck, [8, 15], s3.wreck, { type: "pickup", reward: s3.wreck.reward }),
    site(ids.landing, [11, 9], s3.landing, { type: "crossing" }, { guard: g(s3.landing.guard), objectiveIds: [`${P7}_landing`] }),
    event(ids.omen, [14, 9], s3.omen),
    relay2(ids.north, [15, 4], s3.relays.north, "relay_north"),
    relay2(ids.south, [15, 14], s3.relays.south, "relay_south"),
    site(ids.nest, [17, 16], s3.nest, { type: "landmark", landmark: "nest" }, { guard: g(s3.nest.guard), objectiveIds: [`${P7}_nest`] }),
    site(ids.gate, [19, 9], s3.gate, { type: "gate", openWhenFlags: ["relay_north", "relay_south"] }, { objectiveIds: [`${P7}_gate`] }),
    site(
      ids.goal,
      [24, 9],
      s3.goal,
      { type: "activation", label: "beacon", cost: { gold: 500, crystal: 3 }, requirements: [{ type: "objective_completed", objectiveId: `${P7}_gate` }], reward: s3.goal.reward, completesMission: true, confirmText: s3.goal.confirm },
      { guard: g(s3.goal.guard), objectiveIds: [`${P7}_goal`] }
    )
  ];
  const objectives = [
    O({ id: `${P7}_recruit`, title: s3.objectives.recruit, description: `Recruit at least 3 ${nameOf(ctx, t5.base)} in ${s3.town.name} (build the tier-5 dwelling first).`, category: "primary", initialStatus: "active", condition: { type: "counter_at_least", counter: `recruited:${t5.base}`, value: 3 }, hint: "The tier-5 dwelling needs the tier-4 dwelling and the first level of the Mage Guild." }),
    locked(`${P7}_landing`, s3.objectives.landing, `Defeat ${armyText(ctx, s3.landing.guard.army)} at ${s3.landing.name}.`, [`${P7}_recruit`], { type: "site_cleared", siteId: ids.landing }, { markerSiteId: ids.landing }),
    locked(`${P7}_north`, s3.objectives.north, `Light ${s3.relays.north.name} (${costText(s3.relays.cost)}).`, [`${P7}_landing`], { type: "site_activated", siteId: ids.north }, { markerSiteId: ids.north }),
    locked(`${P7}_south`, s3.objectives.south, `Light ${s3.relays.south.name} (${costText(s3.relays.cost)}).`, [`${P7}_landing`], { type: "site_activated", siteId: ids.south }, { markerSiteId: ids.south }),
    locked(`${P7}_gate`, s3.objectives.gate, `With both lit, ${s3.gate.name} opens.`, [`${P7}_north`, `${P7}_south`], { type: "all", conditions: [{ type: "flag", flag: "relay_north" }, { type: "flag", flag: "relay_south" }] }, { markerSiteId: ids.gate }),
    locked(`${P7}_goal`, s3.objectives.goal, `Defeat ${armyText(ctx, s3.goal.guard.army)} at ${s3.goal.name} and pay 500 Gold and 3 Crystal.`, [`${P7}_gate`], { type: "site_activated", siteId: ids.goal }, { markerSiteId: ids.goal }),
    optional(`${P7}_nest`, s3.objectives.nest, `Defeat ${armyText(ctx, s3.nest.guard.army)} at ${s3.nest.name}.`, { type: "site_cleared", siteId: ids.nest }, ids.nest),
    optional(`${P7}_wanderer`, s3.objectives.wanderer, s3.wanderer.description, { type: "site_visited", siteId: ids.wanderer }, ids.wanderer)
  ];
  return {
    template: template(
      ctx,
      4,
      [28, 18],
      [
        { q: 11, terrain: "water", openings: [{ q: 11, r: 9 }] },
        { q: 19, terrain: "water", openings: [{ q: 19, r: 9 }] }
      ],
      sites,
      [
        [ids.town, ids.landing],
        [ids.landing, ids.omen],
        [ids.landing, ids.north],
        [ids.landing, ids.south],
        [ids.north, ids.gate],
        [ids.south, ids.gate],
        [ids.gate, ids.goal],
        [ids.south, ids.nest],
        [ids.town, ids.sawmill],
        [ids.town, ids.quarry],
        [ids.town, ids.wanderer],
        [ids.quarry, ids.wreck]
      ],
      s3.biome,
      [
        { q: 13, r: 6 },
        { q: 17, r: 8 },
        { q: 13, r: 12 },
        { q: 16, r: 10 }
      ]
    ),
    mission: {
      ...missionBase(ctx, 4, "Seek", s3, "25\u201335 minutes (target, unmeasured)", 7999, 6),
      storyScenes: s3.scenes({ landing: ids.landing, omen: ids.omen, gate: `${P7}_gate`, goal: ids.goal }),
      player: player(
        ctx,
        s3,
        ids.town,
        { gold: 12e3, wood: 25, stone: 30, crystal: 12, favor: 10 },
        [bld(ctx, "civic_hall"), bld(ctx, "civic_hall", 2), bld(ctx, "tavern"), bld(ctx, "marketplace"), bld(ctx, "fortifications"), dw(ctx, 1), dw(ctx, 1, 2), dw(ctx, 2), dw(ctx, 2, 2), dw(ctx, 4), dw(ctx, 4, 2), dw(ctx, 3), bld(ctx, "workshop"), bld(ctx, "mage_guild"), bld(ctx, "pantheon_temple"), bld(ctx, "pantheon_temple", 2)],
        { [familyOf(ctx, 1)]: 14, [familyOf(ctx, 2)]: 9, [familyOf(ctx, 3)]: 6, [familyOf(ctx, 4)]: 4 },
        [ctx.covenantT3],
        { level: 4, xp: 4e3, attributes: { attack: 2, defense: 2, power: 4, knowledge: 3 }, skills: [{ skillId: "wisdom", rank: 2 }, { skillId: "armorer", rank: 1 }, { skillId: "leadership", rank: 1 }], spellbook: true },
        [
          [ctx.t[1].up, 36],
          [ctx.t[2].up, 12],
          [ctx.t[3].base, 4],
          [ctx.t[4].up, 3]
        ]
      ),
      hostilePlayer: { playerId: "arc_host", name: ctx.hostName },
      purchasableBuildingIds: [dw(ctx, 5), dw(ctx, 5, 2), dw(ctx, 3, 2), bld(ctx, "mage_guild", 2), bld(ctx, "mage_guild", 3), bld(ctx, "civic_hall", 3), bld(ctx, "resource_depot"), bld(ctx, "watchtower"), bld(ctx, "training_academy"), bld(ctx, "artifact_merchant")],
      committableGodIds: ctx.gods.first,
      sites,
      objectives,
      hostileHeroes: [patrol(s3.patrol.commander, [16, 9], [[13, 6], [17, 8], [13, 12], [16, 10]], s3.patrol.army, 12, 18)],
      helpTopics: [
        IN_ORDER,
        { id: "patrol", title: "A commanded patrol", text: `${s3.patrol.commander.name} takes one ordinary turn after yours each day, cannot see through fog and keeps to the land between the two waters.` },
        { id: "relays", title: "Two lights, one gate", text: `${s3.gate.name} opens only when both lights burn. Either order works.` },
        ...s3.help ?? []
      ]
    }
  };
}
function rivalMission(ctx, s3) {
  const P7 = "m05";
  const ids = { town: `${P7}_town`, sawmill: `${P7}_sawmill`, quarry: `${P7}_quarry`, gold: `${P7}_gold`, event: `${P7}_event`, north: `${P7}_north_ford`, south: `${P7}_south_ford`, crystal: `${P7}_crystal`, rquarry: `${P7}_rival_quarry`, stele: `${P7}_stele`, rtown: `${P7}_rival_town`, rsawmill: `${P7}_rival_sawmill` };
  const sites = [
    site(ids.town, [3, 10], s3.town, { type: "town", townId: s3.town.townId }),
    res(ids.sawmill, [5, 6], "sawmill"),
    res(ids.quarry, [5, 14], "quarry"),
    res(ids.gold, [8, 16], "gold_mine", s3.gold.guard),
    event(ids.event, [9, 3], s3.event, [`${P7}_event`]),
    site(ids.north, [15, 6], s3.north, { type: "crossing" }, { guard: g(s3.north.guard) }),
    site(ids.south, [15, 13], s3.south, { type: "crossing" }, { guard: g(s3.south.guard) }),
    res(ids.crystal, [20, 10], "crystal_deposit"),
    res(ids.rquarry, [24, 5], "quarry"),
    site(
      ids.stele,
      [26, 7],
      s3.stele,
      { type: "activation", label: "beacon", cost: { gold: 500, crystal: 2 }, requirements: [{ type: "objective_completed", objectiveId: `${P7}_town` }], reward: { questXp: 2500 }, completesMission: true, confirmText: s3.stele.confirm },
      { objectiveIds: [`${P7}_stele`] }
    ),
    site(ids.rtown, [26, 10], { name: s3.rival.townName, description: s3.rival.townDescription }, { type: "town", townId: s3.rival.townId }, { objectiveIds: [`${P7}_town`] }),
    res(ids.rsawmill, [24, 15], "sawmill")
  ];
  const r2 = s3.rival;
  const t = (n) => ctx.t[n];
  const rival = {
    playerId: r2.playerId,
    name: r2.townName,
    controller: "ai",
    pantheonId: ctx.pantheonId,
    color: r2.color,
    wallet: { gold: 8e3, wood: 20, stone: 20, crystal: 6, favor: 10 },
    town: {
      townId: r2.townId,
      siteId: ids.rtown,
      name: r2.townName,
      archetypeId: ctx.archetypeId,
      buildings: [bld(ctx, "civic_hall"), bld(ctx, "civic_hall", 2), bld(ctx, "tavern"), bld(ctx, "marketplace"), bld(ctx, "fortifications"), bld(ctx, "fortifications", 2), dw(ctx, 1), dw(ctx, 1, 2), dw(ctx, 2), dw(ctx, 2, 2), bld(ctx, "workshop"), dw(ctx, 4), bld(ctx, "pantheon_temple")],
      population: { [familyOf(ctx, 1)]: 14, [familyOf(ctx, 2)]: 9, [familyOf(ctx, 4)]: 4 },
      covenants: [],
      garrison: stacks(r2.garrison)
    },
    hero: {
      heroId: r2.hero.heroId,
      definitionId: r2.hero.definitionId,
      classId: r2.hero.classId,
      defaults: { level: 5, xp: 5e3, attributes: { attack: 3, defense: 4, power: 1, knowledge: 2 }, skills: [{ skillId: "leadership", rank: 2 }, { skillId: "armorer", rank: 1 }, { skillId: "tactics", rank: 1 }], spellbook: false },
      army: stacks(r2.army),
      startTownId: r2.townId
    }
  };
  const objectives = [
    O({
      id: `${P7}_crossing`,
      title: s3.objectives.crossing,
      description: `Clear either crossing: ${s3.north.name} (${armyText(ctx, s3.north.guard.army)}) or ${s3.south.name} (${armyText(ctx, s3.south.guard.army)}).`,
      category: "primary",
      initialStatus: "active",
      condition: { type: "any", conditions: [{ type: "site_cleared", siteId: ids.north }, { type: "site_cleared", siteId: ids.south }] },
      hint: `Either crossing is enough. ${r2.hero.name}\u2019s army can use a cleared crossing too.`
    }),
    locked(`${P7}_god`, s3.objectives.god, "Raise the Civic Hall\u2019s third level and commit to a second minor god (25 Favor, irreversible).", [`${P7}_crossing`], { type: "player_has_minor_god", count: 2 }, { hint: "The second god needs the first, the Temple\u2019s second level and the Civic Hall\u2019s third level. A god chosen earlier counts as soon as this step opens." }),
    locked(`${P7}_town`, s3.objectives.town, `Besiege and take ${r2.townName}.`, [`${P7}_god`], { type: "town_owned", townId: r2.townId }, { markerSiteId: ids.rtown, reward: r2.reward, hint: `${r2.hero.name} is a full empire run by the AI: it builds, recruits and may come for your town. Its town is garrisoned even when the hero rides out.` }),
    locked(`${P7}_stele`, s3.objectives.stele, `With ${r2.townName} taken, pay 500 Gold and 2 Crystal at ${s3.stele.name}.`, [`${P7}_town`], { type: "site_activated", siteId: ids.stele }, { markerSiteId: ids.stele }),
    optional(`${P7}_rival`, s3.objectives.rival, `Defeat ${r2.hero.name}\u2019s army in the field.`, { type: "hero_defeated", heroDefinitionId: r2.hero.definitionId }),
    optional(`${P7}_event`, s3.objectives.event, s3.event.description, { type: "site_visited", siteId: ids.event }, ids.event)
  ];
  return {
    template: template(
      ctx,
      5,
      [30, 20],
      [{ q: 15, terrain: "water", openings: [{ q: 15, r: 6 }, { q: 15, r: 13 }] }],
      sites,
      [
        [ids.town, ids.north],
        [ids.town, ids.south],
        [ids.north, ids.rtown],
        [ids.south, ids.rtown],
        [ids.rtown, ids.stele],
        [ids.rtown, ids.rquarry],
        [ids.rtown, ids.rsawmill],
        [ids.north, ids.crystal],
        [ids.town, ids.sawmill],
        [ids.town, ids.quarry],
        [ids.quarry, ids.gold],
        [ids.sawmill, ids.event]
      ],
      s3.biome
    ),
    mission: {
      ...missionBase(ctx, 5, "Rival", s3, "35\u201350 minutes (target, unmeasured)", 9999, 7),
      storyScenes: s3.scenes({ crossing: `${P7}_crossing`, town: `${P7}_town`, rival: r2.hero.definitionId }),
      player: player(
        ctx,
        s3,
        ids.town,
        { gold: 15e3, wood: 30, stone: 35, crystal: 14, favor: 20 },
        [bld(ctx, "civic_hall"), bld(ctx, "civic_hall", 2), bld(ctx, "tavern"), bld(ctx, "marketplace"), bld(ctx, "fortifications"), dw(ctx, 1), dw(ctx, 1, 2), dw(ctx, 2), dw(ctx, 2, 2), dw(ctx, 4), dw(ctx, 4, 2), dw(ctx, 3), dw(ctx, 3, 2), dw(ctx, 5), bld(ctx, "workshop"), bld(ctx, "mage_guild"), bld(ctx, "mage_guild", 2), bld(ctx, "pantheon_temple"), bld(ctx, "pantheon_temple", 2)],
        { [familyOf(ctx, 1)]: 14, [familyOf(ctx, 2)]: 9, [familyOf(ctx, 3)]: 6, [familyOf(ctx, 4)]: 4, [familyOf(ctx, 5)]: 3 },
        [ctx.covenantT3],
        { level: 5, xp: 6200, attributes: { attack: 2, defense: 3, power: 4, knowledge: 4 }, skills: [{ skillId: "wisdom", rank: 2 }, { skillId: "armorer", rank: 1 }, { skillId: "leadership", rank: 1 }, { skillId: "offense", rank: 1 }], spellbook: true },
        [
          [t(1).up, 40],
          [t(2).up, 14],
          [t(3).up, 5],
          [t(4).up, 4],
          [t(5).base, 3]
        ]
      ),
      rivals: [rival],
      purchasableBuildingIds: [bld(ctx, "civic_hall", 3), dw(ctx, 5, 2), bld(ctx, "mage_guild", 3), bld(ctx, "artifact_merchant"), bld(ctx, "resource_depot"), bld(ctx, "watchtower"), bld(ctx, "training_academy"), bld(ctx, "fortifications", 2)],
      committableGodIds: [...ctx.gods.first, ...ctx.gods.second],
      sites,
      objectives,
      hostileHeroes: [],
      helpTopics: [
        IN_ORDER,
        { id: "rival", title: "A rival empire", text: `${r2.townName} is a full empire run by the AI with the same rules as yours: it builds, recruits, takes mines and may besiege ${s3.town.name}. Losing ${s3.town.name} does not end the mission; losing ${ctx.hero.name} does.` },
        { id: "second_god", title: "The second god", text: "A second minor god needs the first, the Temple\u2019s second level and the Civic Hall\u2019s third level, and costs 25 Favor." },
        { id: "siege", title: "Sieges", text: "Entering an enemy town that has a garrison or a visiting hero starts a siege. Walls and towers favour the defender; shooters fire over them." },
        ...s3.help ?? []
      ]
    }
  };
}
function refugeMission(ctx, s3) {
  const P7 = "m06";
  const ids = { town: `${P7}_town`, sawmill: `${P7}_sawmill`, quarry: `${P7}_quarry`, gold: `${P7}_gold`, north: `${P7}_north_crossing`, south: `${P7}_south_crossing`, event: `${P7}_event`, refuge: `${P7}_refuge`, nest: `${P7}_nest`, gate: `${P7}_gate`, horn: `${P7}_horn` };
  const covenant3 = `covenant.${ctx.covenantT6}.${ctx.id}6`;
  const t = (n) => ctx.t[n];
  const sites = [
    site(ids.town, [3, 10], s3.town, { type: "town", townId: s3.town.townId }),
    res(ids.sawmill, [5, 6], "sawmill"),
    res(ids.quarry, [5, 14], "quarry"),
    res(ids.gold, [7, 16], "gold_mine"),
    site(ids.north, [11, 6], s3.north, { type: "crossing" }, { guard: g(s3.north.guard) }),
    site(ids.south, [11, 13], s3.south, { type: "crossing" }, { guard: g(s3.south.guard) }),
    event(ids.event, [15, 3], s3.event, [`${P7}_event`]),
    site(ids.refuge, [16, 10], s3.refuge, { type: "landmark", landmark: "refuge" }, { guard: g(s3.refuge.guard), objectiveIds: [`${P7}_refuge`] }),
    site(ids.nest, [17, 17], s3.nest, { type: "landmark", landmark: "nest" }, { guard: g(s3.nest.guard) }),
    site(ids.gate, [22, 10], s3.gate, { type: "crossing" }, { guard: g(s3.gate.guard), objectiveIds: [`${P7}_gate`] }),
    site(
      ids.horn,
      [26, 10],
      s3.horn,
      { type: "activation", label: "beacon", cost: { gold: 500, favor: 10 }, requirements: [{ type: "objective_completed", objectiveId: `${P7}_gate` }], reward: { questXp: 2800 }, completesMission: true, confirmText: s3.horn.confirm },
      { objectiveIds: [`${P7}_horn`] }
    )
  ];
  const objectives = [
    O({
      id: `${P7}_approach`,
      title: s3.objectives.approach,
      description: `Clear either crossing: ${s3.north.name} (${armyText(ctx, s3.north.guard.army)}) or ${s3.south.name} (${armyText(ctx, s3.south.guard.army)}).`,
      category: "primary",
      initialStatus: "active",
      condition: { type: "any", conditions: [{ type: "site_cleared", siteId: ids.north }, { type: "site_cleared", siteId: ids.south }] }
    }),
    locked(`${P7}_refuge`, s3.objectives.refuge, `Defeat ${armyText(ctx, s3.refuge.guard.army)} at ${s3.refuge.name}.`, [`${P7}_approach`], { type: "site_cleared", siteId: ids.refuge }, { markerSiteId: ids.refuge }),
    O({ id: `${P7}_claim`, title: s3.objectives.claim, description: s3.objectives.claimDescription, category: "primary", initialStatus: "locked", condition: { type: "claim", after: [`${P7}_refuge`] }, reward: { entitlementIds: [covenant3] } }),
    locked(`${P7}_elite`, s3.objectives.elite, `Assign the covenant, build the tier-6 dwelling and have at least 2 ${nameOf(ctx, t(6).base)} in ${ctx.hero.name}\u2019s army.`, [`${P7}_claim`], { type: "hero_army_contains", heroId: ctx.hero.heroId, creatureId: t(6).base, count: 2 }, { live: true, hint: "The tier-6 dwelling needs the Temple\u2019s second level, the tier-4 dwelling and the assigned covenant." }),
    locked(`${P7}_gate`, s3.objectives.gate, `Defeat ${s3.gate.guard.commander?.name ?? "the commander"} and the gate guard (${armyText(ctx, s3.gate.guard.army)}).`, [`${P7}_elite`], { type: "site_cleared", siteId: ids.gate }, { markerSiteId: ids.gate }),
    locked(`${P7}_horn`, s3.objectives.horn, `With the gate open, pay 500 Gold and 10 Favor at ${s3.horn.name}.`, [`${P7}_gate`], { type: "site_activated", siteId: ids.horn }, { markerSiteId: ids.horn }),
    optional(`${P7}_event`, s3.objectives.event, s3.event.description, { type: "site_visited", siteId: ids.event }, ids.event)
  ];
  return {
    template: template(
      ctx,
      6,
      [30, 20],
      [
        { q: 11, terrain: "mountain", openings: [{ q: 11, r: 6 }, { q: 11, r: 13 }] },
        { q: 22, terrain: "mountain", openings: [{ q: 22, r: 10 }] }
      ],
      sites,
      [
        [ids.town, ids.north],
        [ids.town, ids.south],
        [ids.north, ids.refuge],
        [ids.south, ids.refuge],
        [ids.refuge, ids.gate],
        [ids.gate, ids.horn],
        [ids.north, ids.event],
        [ids.south, ids.nest],
        [ids.town, ids.sawmill],
        [ids.town, ids.quarry],
        [ids.quarry, ids.gold]
      ],
      s3.biome
    ),
    mission: {
      ...missionBase(ctx, 6, "Refuge", s3, "35\u201345 minutes (target, unmeasured)", 12199, 8),
      storyScenes: s3.scenes({ refuge: ids.refuge, claim: `${P7}_claim`, gate: ids.gate, gateObjective: `${P7}_gate` }),
      player: player(
        ctx,
        s3,
        ids.town,
        { gold: 18e3, wood: 30, stone: 35, crystal: 16, favor: 25 },
        [bld(ctx, "civic_hall"), bld(ctx, "civic_hall", 2), bld(ctx, "civic_hall", 3), bld(ctx, "tavern"), bld(ctx, "marketplace"), bld(ctx, "fortifications"), dw(ctx, 1), dw(ctx, 1, 2), dw(ctx, 2), dw(ctx, 2, 2), dw(ctx, 4), dw(ctx, 4, 2), dw(ctx, 3), dw(ctx, 3, 2), dw(ctx, 5), dw(ctx, 5, 2), bld(ctx, "workshop"), bld(ctx, "mage_guild"), bld(ctx, "mage_guild", 2), bld(ctx, "pantheon_temple"), bld(ctx, "pantheon_temple", 2)],
        { [familyOf(ctx, 1)]: 14, [familyOf(ctx, 2)]: 9, [familyOf(ctx, 3)]: 6, [familyOf(ctx, 4)]: 4, [familyOf(ctx, 5)]: 3 },
        [ctx.covenantT3],
        { level: 6, xp: 8500, attributes: { attack: 2, defense: 3, power: 5, knowledge: 4 }, skills: [{ skillId: "wisdom", rank: 2 }, { skillId: "armorer", rank: 2 }, { skillId: "leadership", rank: 1 }, { skillId: "offense", rank: 1 }], spellbook: true },
        [
          [t(1).up, 44],
          [t(2).up, 16],
          [t(3).up, 6],
          [t(4).up, 6],
          [t(5).up, 3]
        ]
      ),
      hostilePlayer: { playerId: "arc_host", name: ctx.hostName },
      purchasableBuildingIds: [dw(ctx, 6), dw(ctx, 6, 2), bld(ctx, "mage_guild", 3), bld(ctx, "fortifications", 2), bld(ctx, "artifact_merchant"), bld(ctx, "resource_depot"), bld(ctx, "watchtower"), bld(ctx, "training_academy"), bld(ctx, "civic_hall", 4), bld(ctx, "fortifications", 3)],
      committableGodIds: [...ctx.gods.first, ...ctx.gods.second],
      sites,
      objectives,
      hostileHeroes: [band(s3.band.id, s3.band.name, `creature.${ctx.pantheonId}.tier3.upgraded.portrait`, [19, 15], [[18, 14], [20, 15], [19, 17]], s3.band.army, { gold: 900 }, 13, 21)],
      helpTopics: [
        IN_ORDER,
        { id: "claim", title: "Claiming a covenant", text: "Some rewards wait in the journal until you accept them. Accept the covenant there, then assign it to a town." },
        ...s3.help ?? []
      ]
    }
  };
}
function finaleMission(ctx, s3) {
  const P7 = "m07";
  const ids = { town: `${P7}_town`, sawmill: `${P7}_sawmill`, quarry: `${P7}_quarry`, north: `${P7}_north_crossing`, south: `${P7}_south_crossing`, sn: `${P7}_stone_north`, ss: `${P7}_stone_south`, nest: `${P7}_nest`, gate: `${P7}_gate`, cache: `${P7}_cache`, hall: `${P7}_hall`, choice: `${P7}_choice`, seal: `${P7}_seal` };
  const t = (n) => ctx.t[n];
  const stone2 = (id, at, n, flag) => site(id, at, n, { type: "activation", label: "relay", cost: s3.stones.cost, requirements: [], reward: { flags: [flag] }, completesMission: false, confirmText: `Use ${n.name}? Both together open ${s3.gate.name}.` }, { objectiveIds: [id] });
  const sites = [
    site(ids.town, [3, 10], s3.town, { type: "town", townId: s3.town.townId }),
    res(ids.sawmill, [5, 6], "sawmill"),
    res(ids.quarry, [5, 14], "quarry"),
    site(ids.north, [10, 6], s3.north, { type: "crossing" }, { guard: g(s3.north.guard) }),
    site(ids.south, [10, 13], s3.south, { type: "crossing" }, { guard: g(s3.south.guard) }),
    stone2(ids.sn, [15, 4], s3.stones.north, "stone_north"),
    stone2(ids.ss, [15, 15], s3.stones.south, "stone_south"),
    site(ids.nest, [18, 17], s3.nest, { type: "landmark", landmark: "nest" }, { guard: g(s3.nest.guard) }),
    site(ids.gate, [22, 10], s3.gate, { type: "gate", openWhenFlags: ["stone_north", "stone_south"] }, { objectiveIds: [`${P7}_gate`] }),
    site(ids.cache, [25, 6], s3.cache, { type: "pickup", reward: s3.cache.reward }),
    site(ids.hall, [27, 10], s3.hall, { type: "crossing" }, { guard: g({ ...s3.hall.guard, reward: { ...s3.hall.guard.reward, flags: ["boss_defeated"] } }), objectiveIds: [`${P7}_boss`] }),
    site(
      ids.choice,
      [29, 8],
      s3.choice,
      {
        type: "map_event",
        title: s3.choice.title,
        text: s3.choice.text,
        options: [
          { label: s3.choice.a.label, summary: s3.choice.a.summary, reward: { flags: [s3.choice.a.flag], questXp: 500 } },
          { label: s3.choice.b.label, summary: s3.choice.b.summary, reward: { flags: [s3.choice.b.flag], questXp: 500 } }
        ]
      },
      { objectiveIds: [`${P7}_choice`] }
    ),
    site(
      ids.seal,
      [29, 12],
      s3.seal,
      {
        type: "activation",
        label: "beacon",
        cost: { gold: 1e3, crystal: 3, favor: 10 },
        requirements: [
          { type: "mission_flag", flag: "boss_defeated" },
          { type: "any_of", requirements: [{ type: "mission_flag", flag: s3.choice.a.flag }, { type: "mission_flag", flag: s3.choice.b.flag }] }
        ],
        reward: { questXp: 3e3 },
        completesMission: true,
        confirmText: s3.seal.confirm
      },
      { objectiveIds: [`${P7}_seal`] }
    )
  ];
  const objectives = [
    O({
      id: `${P7}_approach`,
      title: s3.objectives.approach,
      description: `Clear either crossing: ${s3.north.name} (${armyText(ctx, s3.north.guard.army)}) or ${s3.south.name} (${armyText(ctx, s3.south.guard.army)}). One is enough to reach both stones.`,
      category: "primary",
      initialStatus: "active",
      condition: { type: "any", conditions: [{ type: "site_cleared", siteId: ids.north }, { type: "site_cleared", siteId: ids.south }] }
    }),
    locked(`${P7}_stone_north`, s3.objectives.north, `Use ${s3.stones.north.name} (${costText(s3.stones.cost)}).`, [`${P7}_approach`], { type: "site_activated", siteId: ids.sn }, { markerSiteId: ids.sn }),
    locked(`${P7}_stone_south`, s3.objectives.south, `Use ${s3.stones.south.name} (${costText(s3.stones.cost)}).`, [`${P7}_approach`], { type: "site_activated", siteId: ids.ss }, { markerSiteId: ids.ss }),
    locked(`${P7}_gate`, s3.objectives.gate, `With both stones used, ${s3.gate.name} opens.`, [`${P7}_stone_north`, `${P7}_stone_south`], { type: "all", conditions: [{ type: "flag", flag: "stone_north" }, { type: "flag", flag: "stone_south" }] }, { markerSiteId: ids.gate }),
    locked(`${P7}_boss`, s3.objectives.boss, `Defeat ${s3.hall.guard.commander?.name ?? "the enemy"} at ${s3.hall.name} (${armyText(ctx, s3.hall.guard.army)}).`, [`${P7}_gate`], { type: "site_cleared", siteId: ids.hall }, { markerSiteId: ids.hall }),
    locked(`${P7}_choice`, s3.objectives.choice, `At ${s3.choice.name}, decide.`, [`${P7}_boss`], { type: "any", conditions: [{ type: "flag", flag: s3.choice.a.flag }, { type: "flag", flag: s3.choice.b.flag }] }, { markerSiteId: ids.choice }),
    locked(`${P7}_seal`, s3.objectives.seal, `At ${s3.seal.name}, pay 1,000 Gold, 3 Crystal and 10 Favor.`, [`${P7}_choice`], { type: "site_activated", siteId: ids.seal }, { markerSiteId: ids.seal })
  ];
  return {
    template: template(
      ctx,
      7,
      [32, 20],
      [
        { q: 10, terrain: "mountain", openings: [{ q: 10, r: 6 }, { q: 10, r: 13 }] },
        { q: 22, terrain: "mountain", openings: [{ q: 22, r: 10 }] },
        { q: 27, terrain: "mountain", openings: [{ q: 27, r: 10 }] }
      ],
      sites,
      [
        [ids.town, ids.north],
        [ids.town, ids.south],
        [ids.north, ids.sn],
        [ids.south, ids.ss],
        [ids.sn, ids.ss],
        [ids.sn, ids.gate],
        [ids.ss, ids.gate],
        [ids.gate, ids.hall],
        [ids.gate, ids.cache],
        [ids.hall, ids.choice],
        [ids.hall, ids.seal],
        [ids.ss, ids.nest],
        [ids.town, ids.sawmill],
        [ids.town, ids.quarry]
      ],
      s3.biome,
      [
        { q: 13, r: 8 },
        { q: 18, r: 10 },
        { q: 13, r: 12 },
        { q: 16, r: 10 }
      ]
    ),
    mission: {
      ...missionBase(ctx, 7, "Finale", s3, "40\u201360 minutes (target, unmeasured)", null, null),
      storyScenes: s3.scenes({ gate: `${P7}_gate`, hall: ids.hall, boss: `${P7}_boss`, choice: `${P7}_choice` }),
      player: player(
        ctx,
        s3,
        ids.town,
        { gold: 2e4, wood: 30, stone: 35, crystal: 18, favor: 25 },
        [bld(ctx, "civic_hall"), bld(ctx, "civic_hall", 2), bld(ctx, "civic_hall", 3), bld(ctx, "tavern"), bld(ctx, "marketplace"), bld(ctx, "fortifications"), dw(ctx, 1), dw(ctx, 1, 2), dw(ctx, 2), dw(ctx, 2, 2), dw(ctx, 4), dw(ctx, 4, 2), dw(ctx, 3), dw(ctx, 3, 2), dw(ctx, 5), dw(ctx, 5, 2), dw(ctx, 6), bld(ctx, "workshop"), bld(ctx, "mage_guild"), bld(ctx, "mage_guild", 2), bld(ctx, "mage_guild", 3), bld(ctx, "pantheon_temple"), bld(ctx, "pantheon_temple", 2)],
        { [familyOf(ctx, 1)]: 14, [familyOf(ctx, 2)]: 9, [familyOf(ctx, 3)]: 6, [familyOf(ctx, 4)]: 4, [familyOf(ctx, 5)]: 3, [familyOf(ctx, 6)]: 2 },
        [ctx.covenantT3, ctx.covenantT6],
        { level: 7, xp: 11e3, attributes: { attack: 3, defense: 3, power: 5, knowledge: 5 }, skills: [{ skillId: "wisdom", rank: 2 }, { skillId: "armorer", rank: 2 }, { skillId: "leadership", rank: 2 }, { skillId: "offense", rank: 1 }], spellbook: true },
        [
          [t(1).up, 48],
          [t(2).up, 18],
          [t(3).up, 8],
          [t(4).up, 8],
          [t(5).up, 4],
          [t(6).base, 2]
        ]
      ),
      hostilePlayer: { playerId: "arc_host", name: ctx.hostName },
      purchasableBuildingIds: [dw(ctx, 6, 2), bld(ctx, "artifact_merchant"), bld(ctx, "fortifications", 2), bld(ctx, "fortifications", 3), bld(ctx, "resource_depot"), bld(ctx, "watchtower"), bld(ctx, "training_academy"), bld(ctx, "civic_hall", 4)],
      committableGodIds: [...ctx.gods.first, ...ctx.gods.second],
      sites,
      objectives,
      hostileHeroes: [patrol(s3.patrol.commander, [17, 10], [[13, 8], [18, 10], [13, 12], [16, 10]], s3.patrol.army, 11, 21)],
      helpTopics: [
        IN_ORDER,
        { id: "patrol", title: "The patrol", text: `${s3.patrol.commander.name} takes one ordinary turn after yours each day, cannot see through fog and never leaves the land between the crossings and the gate.` },
        { id: "stones", title: "The two stones", text: `Either crossing reaches both stones. Only both stones together open ${s3.gate.name}.` },
        { id: "last_choice", title: "The last choice", text: "The last choice changes the ending you see, not the reward: both complete the campaign." },
        ...s3.help ?? []
      ]
    }
  };
}
function arcCampaign(ctx, w, missions) {
  return {
    id: ctx.id,
    name: w.name,
    tagline: w.tagline,
    summary: w.summary,
    pantheonId: ctx.pantheonId,
    startingGodOptions: [ctx.gods.patron],
    startingGodNote: w.startingGodNote,
    missionIds: missions.map((m) => m.id),
    heroDefinitionId: ctx.hero.definitionId,
    carryoverPolicy: [
      { category: "Hero identity, XP, skills, primary growth", policy: "Preserved (after the mission\u2019s displayed XP cap)" },
      { category: "Spellbook, spells, equipment, backpack", policy: "Preserved" },
      { category: "Patron and every minor-god commitment", policy: "Preserved" },
      { category: "Hero mana and movement", policy: "Refilled to the new mission\u2019s full budget" },
      { category: "Army, wallet, towns, pools, mines", policy: "Replaced by the next war-band manifest" },
      { category: "Fog, local quest flags, enemies, day", policy: "Reset to the mission\u2019s initial state" }
    ],
    status: "playable",
    thumbnailAssetId: `campaign.${ctx.id}.thumbnail`,
    epilogue: w.epilogue,
    epilogueVariants: w.endings
  };
}
function nameOf(ctx, id, count = 2) {
  const n = ctx.names(id);
  if (!n) return id;
  return count === 1 ? n.name : n.pluralName;
}
function armyText(_ctx, a2) {
  return armyToken(a2.map(([creatureId, count]) => ({ creatureId, count })));
}
function costText(c3) {
  return Object.entries(c3).filter(([, v]) => !!v).map(([k, v]) => `${v.toLocaleString("en-US")} ${k[0].toUpperCase()}${k.slice(1)}`).join(", ");
}
function familyOf(ctx, tier) {
  return ctx.familyOf(ctx.t[tier].base);
}
function describe(objs, text) {
  return objs.map((o) => text[o.id] ? { ...o, description: text[o.id] } : o);
}

// ../pantheon_realms/packages/content/src/campaign/twelfthHour.ts
var P3 = "egyptian";
var SESHET = speaker(P3, "Seshet");
var NEBET = speaker(P3, "Nebet");
var PAWAH = speaker(P3, "Pawah");
var DJED = speaker(P3, "Djedkhonsu");
var PASER = speaker(P3, "Paser");
var TWELFTH_HOUR_HEROES = [
  arcHero(P3, "egyptian_seshet", "Seshet", "Lector of the House of Life", "lector_priest", "A lector priestess of Abedju who reads the hymns that send the sun through the night. The hero of The Twelfth Hour.", "campaign"),
  arcHero(P3, "egyptian_djedkhonsu", "Djedkhonsu", "The Hollow Lector", "lector_priest", "Once the highest reader of the House of Life, he learned the name of the coiled dark and bargained with it for an endless dusk to rule. Final opponent of The Twelfth Hour.", "enemy"),
  arcHero(P3, "egyptian_paser", "Paser", "The Red Vizier", "vizier", "A vizier who crowned himself in the dusk and calls Djedkhonsu his priest. Rival empire in The Twelfth Hour, mission 5.", "enemy"),
  arcHero(P3, "egyptian_ankhwen", "Ankhwen", "Captain of the Drowned Barge", "medjay", "A river captain who drowned in the first dark morning and came back hungry for orders. Patrol in The Twelfth Hour, mission 4.", "enemy"),
  arcHero(P3, "egyptian_hekaib", "Hekaib", "Sword of the Hollow Lector", "medjay", "Djedkhonsu\u2019s champion, who holds the rookery gate. The Twelfth Hour, mission 6.", "enemy"),
  arcHero(P3, "egyptian_iti", "Iti", "Warden of the Horizon", "medjay", "Keeper of the road between the two horizon-stones. Patrol in The Twelfth Hour, mission 7.", "enemy")
];
var H = Object.fromEntries(TWELFTH_HOUR_HEROES.map((h) => [h.id, h]));
function buildTwelfthHour(names, familyOf2) {
  const ctx = {
    id: "twelfth_hour",
    pantheonId: P3,
    archetypeId: "egyptian_city",
    hero: { heroId: "seshet", definitionId: "egyptian_seshet", classId: "lector_priest", name: "Seshet" },
    gods: { patron: "egyptian_ra", first: ["egyptian_set", "egyptian_isis"], second: ["egyptian_osiris", "egyptian_thoth", "egyptian_horus"] },
    t: [
      { base: "", up: "" },
      { base: "egyptian_sacred_scarab", up: "egyptian_solar_scarab" },
      { base: "egyptian_jackal_guardian", up: "egyptian_anubian_warden" },
      { base: "egyptian_ushabti", up: "egyptian_royal_ushabti" },
      { base: "egyptian_sphinx", up: "egyptian_great_sphinx" },
      { base: "egyptian_crocodile_beast", up: "egyptian_sobek_warbeast" },
      { base: "egyptian_bennu", up: "egyptian_radiant_bennu" },
      { base: "egyptian_desert_colossus", up: "egyptian_divine_colossus" }
    ],
    covenantT3: "egyptian_ushabti",
    covenantT6: "egyptian_bennu",
    covenantT7: "egyptian_desert_colossus",
    hostName: "The Hollow Lector\u2019s Host",
    hiringReason: "Seshet walks the night road with her own escort. Hero hiring is disabled in The Twelfth Hour.",
    debriefPolicy: [
      "Seshet keeps her level, experience (up to the displayed cap), skills, spellbook, spells and equipment.",
      "Ra and every god she has committed to carry into the next mission.",
      "Troops, resources, towns, mines and recruitment pools stay behind to hold the river.",
      "The next mission begins with its declared escort and treasury."
    ],
    seed: 41e4,
    names,
    familyOf: familyOf2
  };
  const m1 = restoreMission(ctx, {
    name: "The Ember Dawn",
    summary: "For nine mornings the sun has risen red and low and gone down again within the hour. Raise a temple guard in Abedju, clear the canal lock and sing the morning hymn at the Obelisk of the East.",
    newDecisions: ["Recruit and train", "Afterlife", "Learn spells at the Mage Guild", "A one-time choice"],
    briefing: [
      NEBET("Nine mornings, priestess. The sun climbs a hand\u2019s breadth over the eastern hills, red as a coal, and sinks again. The fields are cold. The children have stopped asking why."),
      SESHET("The morning hymn is sung at the Obelisk of the East. If the hymn is not being sung, someone has stopped the singers. Raise a guard from the temple, captain \u2014 the scarab-keepers will answer."),
      PAWAH("Mind the canal lock on the way. Men with hidden faces have taken it. They do not rob the barges. They turn them back.")
    ],
    victory: [SESHET("The hymn is sung. The sun stood a little higher today \u2014 not enough. Somewhere in the night, the barque that carries it has run aground.")],
    town: { townId: "abedju", name: "Abedju", description: "Seshet\u2019s temple-town, where the House of Life keeps the hymns of the hours." },
    biome: "desert",
    soundscape: "desert",
    barrier: "water",
    event: {
      name: "Broken Shrine of Ra",
      description: "A wayside shrine whose offering table has been overturned.",
      title: "The Broken Shrine",
      text: "Someone has smashed the little shrine on the canal road: the offering table lies in pieces, the bread is trodden into the sand. Under the table, four bronze scarabs the size of a fist still turn slowly toward the east, waiting for a sun that does not come.",
      options: [
        { label: "Take the shrine\u2019s silver", summary: "+600 Gold and +4 Wood.", reward: { resources: { gold: 600, wood: 4 } } },
        { label: "Read the morning verse over the scarabs", summary: "4 Sacred Scarabs join Seshet\u2019s escort.", reward: { creatures: [{ creatureId: "egyptian_sacred_scarab", count: 4 }] } }
      ]
    },
    camp: { name: "Jackal Kennels", description: "Temple jackals that follow whoever feeds them and keeps the old words.", creatureId: "egyptian_jackal_guardian" },
    crossing: {
      name: "Canal Lock",
      description: "The lock that lets the barges into Abedju. Boars of the marsh, driven mad by the cold, have made it their wallow.",
      guard: { label: "Marsh boars", army: [["wild_boar", 8]], reward: { resources: { gold: 300, wood: 3, stone: 3 } }, battlefield: "coast_road" }
    },
    cache: { name: "Abandoned Barge", description: "A grain barge left at the bank when its crew fled the dark mornings.", reward: { resources: { gold: 400, crystal: 1 } } },
    monument: {
      name: "Obelisk of the East",
      description: "The needle of stone where the morning hymn greets the sun. Masked men stand around it.",
      guard: {
        label: "Masked hirelings",
        army: [
          ["brigand", 20],
          ["brigand_cutthroat", 6]
        ],
        reward: { resources: { gold: 500 }, artifactIds: ["khopesh_of_set"] },
        battlefield: "beacon_clearing"
      },
      confirm: "Sing the morning hymn at the Obelisk of the East? This completes The Ember Dawn."
    },
    objectives: { recruit: "Raise the temple guard", train: "Gild the scarabs", crossing: "Open the canal lock", guard: "Drive off the masked men", activate: "Sing the morning hymn", event: "The broken shrine (optional)" },
    scenes: (ids) => [
      { id: "m01_lock_open", trigger: { type: "site_cleared", siteId: ids.crossing }, lines: [PAWAH("Those boars were penned there. Somebody fed them at the lock and left the gate open behind them."), SESHET("Then somebody wanted the barges kept away from the obelisk. That tells us where to go.")] },
      { id: "m01_obelisk_battle", trigger: { type: "battle_started", siteId: ids.monument }, lines: [DJED("Little reader. The hymn you came to sing is an old habit. Night has better songs."), SESHET("Then let it sing them to someone who is listening.")] },
      { id: "m01_khopesh", trigger: { type: "site_cleared", siteId: ids.monument }, lines: [NEBET("Their leader carried this \u2014 a temple khopesh, the sacred kind. It was stolen from the treasury at Iunu."), SESHET("Keep it close. Whoever gives temple blades to hirelings has been inside the temples.")] },
      { id: "m01_losses", trigger: { type: "casualties", minLost: 4 }, lines: [NEBET("We buried six on the canal bank today, priestess. The scarab-keepers will rise for us \u2014 but not forever."), SESHET("I know. We will spend them like silver, not like sand.")] }
    ],
    help: [{ id: "afterlife", title: "Afterlife", text: "The Egyptian signature: after a battle you win, each of your stacks regains a fifth of the creatures it lost in that battle." }]
  });
  const m2 = huntMission(ctx, {
    name: "The Black Boar",
    summary: "A herd of black boars, fed and driven by the Hollow Lector\u2019s men, roots up the west-bank fields of Nekheb. Raise jackals of your own, cross the river, hunt the herd down and reopen the Shrine of the Western Gate.",
    newDecisions: ["Hunt a wandering herd", "Use a lookout", "Buy or bargain on the road"],
    briefing: [
      PAWAH("The west bank of Nekheb is the land of the dead \u2014 tombs, shrines, the gate the sun goes through at evening. Now a black boar runs there with its herd, and the shrine of the gate is dark."),
      SESHET("The black boar is an old sign. It is the shape the enemy of the sun likes best. Somebody is making signs for us to read."),
      NEBET("Then we read them with jackals. Build the kennels, priestess. Jackals hunt pigs better than priests do.")
    ],
    victory: [PAWAH("The western gate is lit again. But listen \u2014 the sun did not come back through it tonight. It has gone further in than any gate we can light from this side.")],
    town: { townId: "nekheb", name: "Nekheb", description: "A river town whose west bank is all tombs and shrines." },
    biome: "desert",
    soundscape: "desert",
    barrier: "water",
    lookout: { name: "Vulture Crag", description: "From the top, the west bank lies open from the river to the cliffs." },
    event: {
      name: "Amulet-maker\u2019s Stall",
      description: "An old amulet-maker who has not closed her stall in forty years.",
      title: "The Amulet-maker",
      text: "\u201CForty years I have sold hearts of stone to people who were afraid of the scales,\u201D the old woman says. \u201CThis year they buy them for the living.\u201D She holds out a green stone scarab, warm as a hand. \u201COr sit, and I will tell you what the boar is, and why it wants the gate.\u201D",
      options: [
        { label: "Buy the heart scarab", summary: "Pay 2,000 Gold for the Heart Scarab (+2 mana at dawn).", cost: { gold: 2e3 }, reward: { artifactIds: ["heart_scarab"] } },
        { label: "Sit and listen", summary: "Seshet gains +1 Knowledge.", reward: { attributes: { knowledge: 1 } } }
      ]
    },
    camp: { name: "Desert Kennels", description: "Jackals that have not joined the black herd\u2019s masters.", creatureId: "egyptian_jackal_guardian" },
    bridge: {
      name: "Ferry Landing",
      description: "The ferry to the west bank. The Lector\u2019s hirelings hold the landing.",
      guard: {
        label: "Landing hirelings",
        army: [
          ["brigand", 16],
          ["brigand_cutthroat", 6]
        ],
        reward: { resources: { gold: 600, favor: 3 } },
        battlefield: "coast_road"
      }
    },
    lair: {
      name: "Tomb of the Forgotten King",
      description: "An opened tomb used as a sty. Something gold glints in the dirt.",
      guard: {
        label: "Sty boars",
        army: [
          ["tusked_boar", 4],
          ["wild_boar", 6]
        ],
        reward: { resources: { gold: 500 }, artifactIds: ["nemes_of_ra"] },
        battlefield: "grove"
      }
    },
    stone: { name: "Shrine of the Western Gate", description: "The shrine where the evening sun is sung into the west.", confirm: "Relight the Shrine of the Western Gate? This completes The Black Boar." },
    prey: {
      id: "egyptian_black_boar",
      name: "The Black Boar",
      portraitAssetId: "creature.neutral.wild_boar.upgraded.portrait",
      army: [
        ["tusked_boar", 6],
        ["wild_boar", 12]
      ],
      bounty: { gold: 800 }
    },
    objectives: {
      recruit: "Jackals of our own",
      lookout: "Read the land from the crag",
      bridge: "Take the ferry landing",
      prey: "Hunt the Black Boar",
      preyHint: "The herd roams near the middle of the west bank and only charges an escort it is sure it can beat. Move onto it to fight.",
      activate: "Relight the western gate",
      lair: "The forgotten king\u2019s tomb (optional)",
      event: "The amulet-maker (optional)"
    },
    scenes: (ids) => [
      { id: "m02_crag", trigger: { type: "site_visited", siteId: ids.lookout }, lines: [SESHET("There, below the cliffs \u2014 the fields are rooted up in a ring around the shrine. They are not eating. They are guarding."), NEBET("Then the shrine still matters to someone. Good.")] },
      { id: "m02_boar_battle", trigger: { type: "battle_started", heroDefinitionId: ids.prey }, lines: [DJED("Run, black one. Run her into the sand. The night is long and she is only one reader.")] },
      { id: "m02_boar_broken", trigger: { type: "objective_completed", objectiveId: ids.preyObjective }, lines: [NEBET("The herd is broken. The survivors ran for the cliffs."), SESHET("Let them. A sign that has been read is only a pig.")] }
    ]
  });
  const m3 = covenantMission(ctx, {
    name: "The Sculptor\u2019s Price",
    summary: "In the quarries above Edfu the tomb-servants have stopped working. Break the hired guard on the cliff road, free the sphinxes\u2019 terrace, win the ushabti covenant \u2014 by the sculptor\u2019s price or by force \u2014 and take a god for the long night ahead.",
    newDecisions: ["A covenant: pay or fight", "Your first minor god", "Elite troops in the army"],
    briefing: [
      PAWAH("The sun\u2019s road goes under the cliffs at Edfu. The old sculptor there still makes ushabti \u2014 the little servants who work for the dead. He says they have stopped answering."),
      SESHET("Ushabti answer the one who holds the covenant. If they have stopped, someone else holds it now."),
      NEBET("And the sphinxes on the terrace have gone quiet too. Things are quiet all along the road, priestess. I do not like it.")
    ],
    victory: [SESHET("The covenant holds, a god walks with us and the cliff stone is sung. The road goes down from here \u2014 into the hours where the sun is.")],
    town: { townId: "edfu", name: "Edfu", description: "A quarry town under the great cliffs." },
    biome: "desert",
    soundscape: "desert",
    cache: { name: "Quarrymen\u2019s Cache", description: "Tools and silver left when the quarrymen fled.", reward: { resources: { gold: 700, wood: 5 }, artifactIds: ["scribes_papyrus_sandals"] } },
    pass: {
      name: "Cliff Road",
      description: "The only road up the cliffs, held by the Lector\u2019s hirelings.",
      guard: {
        label: "Cliff-road hirelings",
        army: [
          ["brigand", 24],
          ["brigand_cutthroat", 10]
        ],
        reward: { resources: { gold: 750, favor: 5 } },
        battlefield: "ridge_pass"
      }
    },
    roost: {
      name: "Terrace of the Sphinxes",
      description: "A terrace of resting sphinxes. Clay golems stand among them like jailers.",
      guard: { label: "Terrace golems", army: [["clay_golem", 5]], reward: { resources: { favor: 5 }, artifactIds: ["shield_of_the_medjay"] }, battlefield: "ridge_pass" }
    },
    hearth: {
      name: "The Sculptor\u2019s Workshop",
      description: "An old sculptor at his bench, surrounded by unfinished servants.",
      title: "The Sculptor\u2019s Workshop",
      text: "\u201CThe covenant was sold,\u201D the old sculptor says, carving. \u201CNot by me \u2014 by the man who paid my masters more than I could. Pay me what he paid, and I will carve your name into every servant on this bench. Or go to the Sealed Workshop and take it back from his servants. They are clay; they will not mind.\u201D",
      price: { gold: 1500, wood: 10 },
      payLabel: "Pay the sculptor\u2019s price",
      refuseLabel: "Refuse \u2014 take it at the Sealed Workshop"
    },
    home: {
      name: "Sealed Workshop",
      description: "A workshop sealed with the Lector\u2019s mark. Inside, the ushabti stand guard.",
      guard: {
        label: "Sealed servants",
        army: [
          ["egyptian_ushabti", 4],
          ["egyptian_royal_ushabti", 1]
        ],
        reward: { resources: { gold: 1e3 } },
        battlefield: "grove"
      }
    },
    bridge: {
      name: "Stone Causeway",
      description: "A causeway over the flooded quarry, held by the Lector\u2019s cutthroats and their boars.",
      guard: {
        label: "Causeway guard",
        army: [
          ["brigand_cutthroat", 12],
          ["tusked_boar", 4]
        ],
        reward: { resources: { gold: 800 } },
        battlefield: "ridge_pass"
      }
    },
    stone: { name: "Cliff Stela", description: "The stela where the sun\u2019s road enters the cliff.", confirm: "Sing the hymn at the Cliff Stela? This completes The Sculptor\u2019s Price." },
    band: { id: "egyptian_quarry_boars", name: "Quarry Boars", army: [["wild_boar", 6]] },
    objectives: {
      pass: "Take the cliff road",
      roost: "Free the sphinxes\u2019 terrace",
      covenant: "The ushabti covenant",
      covenantDescription: "Win the ushabti covenant: pay the sculptor\u2019s price at his workshop, or break the servants at the Sealed Workshop.",
      god: "A god for the night road",
      elite: "Great Sphinxes in the escort",
      activate: "Sing the cliff stela",
      cache: "The quarrymen\u2019s cache (optional)"
    },
    scenes: (ids) => [
      { id: "m03_terrace", trigger: { type: "site_cleared", siteId: ids.roost }, lines: [NEBET("The sphinxes are waking. They watched the golems the whole time \u2014 they could not move while the clay stood among them."), SESHET("Then they will remember who moved the clay.")] },
      { id: "m03_workshop", trigger: { type: "site_cleared", siteId: ids.home }, lines: [PAWAH("The seal on the door \u2014 it is the Lector\u2019s own. Djedkhonsu, the old High Lector. He taught me my letters."), SESHET("He taught me mine too. Whatever he teaches now, I will not learn it.")] },
      { id: "m03_god", trigger: { type: "objective_completed", objectiveId: ids.god }, lines: [SESHET("A god walks with us now. Whatever waits in the hours below, we do not meet it alone.")] }
    ]
  });
  const m4 = seekMission(ctx, {
    name: "The Drowned Library",
    summary: "The House of Records at Per-Djehuty lies beyond the flooded marsh, behind a veil of grey mist. Raise river beasts, take the landing, light both pylon-fires to burn away the mist and read what the records say about the sun.",
    newDecisions: ["Light two fires to open a way", "A commanded patrol", "River beasts"],
    briefing: [
      SESHET("Every barque the sun has ever ridden is written down at Per-Djehuty \u2014 its crew, its road, its enemies. If anyone knows where the barque ran aground, the records do."),
      PAWAH("The marsh has flooded over the road and a mist has come up that does not lift. The boatmen say a drowned captain walks the islands with a drowned crew."),
      NEBET("Then we go by the pylons. Light their fires and the mist burns away \u2014 the old priests built them for that.")
    ],
    victory: [SESHET("The records are clear: the barque is held at the eleventh hour, in a hall the Lector has built inside the night. And he has a king \u2014 a vizier who crowned himself in the dusk.")],
    town: { townId: "per_djehuty", name: "Per-Djehuty", description: "A marsh town of scribes on the edge of the flood." },
    biome: "jungle",
    soundscape: "desert",
    wanderer: {
      name: "A Scribe on a Reed Boat",
      description: "A scribe with an ibis-headed staff poles a reed boat along the bank.",
      title: "The Ibis Scribe",
      text: "He writes as he poles, and he does not look up. \u201CYou are going to the House of Records,\u201D he says. \u201CGood. Read the eleventh page twice. And take this \u2014 the night is long, and a priestess should not walk it with nothing but hymns.\u201D",
      options: [
        { label: "Take the Djed amulet", summary: "The Djed Amulet joins Seshet\u2019s backpack.", reward: { artifactIds: ["djed_amulet"] } },
        { label: "Ask him to teach you", summary: "Seshet gains +1 Spell Power and +1 Knowledge.", reward: { attributes: { power: 1, knowledge: 1 } } }
      ]
    },
    wreck: { name: "Sunken Grain Barge", description: "A grain barge sunk in the shallows; its strongbox is still above water.", reward: { resources: { gold: 900, wood: 4 } } },
    landing: {
      name: "Reed Landing",
      description: "The landing on the marsh islands, held by the drowned captain\u2019s crew.",
      guard: {
        label: "Drowned crew",
        army: [
          ["brigand", 36],
          ["brigand_cutthroat", 14]
        ],
        reward: { resources: { gold: 800, favor: 3 } },
        battlefield: "coast_road"
      }
    },
    omen: {
      name: "The Drowned Barge",
      description: "The drowned captain\u2019s barge, beached and empty.",
      title: "The Drowned Barge",
      text: "The barge is dry inside, though it lies in the water. On the captain\u2019s chair is a ledger: every barge he turned back, every crew he took. The last page has your name on it. Under the chair, a chest \u2014 and a crate of temple arrows the crew never used.",
      options: [
        { label: "Take the chest", summary: "+800 Gold and +2 Crystal.", reward: { resources: { gold: 800, crystal: 2 } } },
        { label: "Arm the jackals", summary: "6 Anubian Wardens join Seshet\u2019s escort.", reward: { creatures: [{ creatureId: "egyptian_anubian_warden", count: 6 }] } }
      ]
    },
    relays: { north: { name: "North Pylon", description: "A pylon-fire on the northern island." }, south: { name: "South Pylon", description: "A pylon-fire on the southern island." }, cost: { gold: 250, stone: 3 } },
    nest: { name: "Ogres\u2019 Reed-hall", description: "Two ogres have built a hall of reeds and stolen grain.", guard: { label: "Reed-hall ogres", army: [["ogre", 2]], reward: { resources: { crystal: 5 } }, battlefield: "grove" } },
    gate: { name: "Veil of Grey Mist", description: "A wall of mist that does not move with the wind. Both pylon-fires must burn to part it." },
    goal: {
      name: "House of Records",
      description: "The archive of every voyage of the sun, half under water. River beasts guard its steps.",
      guard: {
        label: "Turned river beasts",
        army: [
          ["egyptian_crocodile_beast", 4],
          ["egyptian_sobek_warbeast", 2]
        ],
        reward: { resources: { gold: 1e3 } },
        battlefield: "coast_road"
      },
      reward: { questXp: 2200, artifactIds: ["solar_chariot_harness"] },
      confirm: "Read the records of the barque? This completes The Drowned Library."
    },
    patrol: {
      commander: arcCommander(H["egyptian_ankhwen"], "patrol4"),
      army: [
        ["egyptian_solar_scarab", 16],
        ["egyptian_anubian_warden", 6]
      ]
    },
    objectives: { recruit: "River beasts of our own", landing: "Take the reed landing", north: "The north pylon", south: "The south pylon", gate: "Burn away the mist", goal: "Read the records", nest: "The ogres\u2019 reed-hall (optional)", wanderer: "The ibis scribe (optional)" },
    scenes: (ids) => [
      { id: "m04_landing", trigger: { type: "site_cleared", siteId: ids.landing }, lines: [NEBET("They did not bleed, priestess. They poured out water."), SESHET("Then their captain is close. Keep the escort together.")] },
      { id: "m04_mist", trigger: { type: "objective_completed", objectiveId: ids.gate }, lines: [PAWAH("Look \u2014 the mist is burning off like morning fog. The old priests knew what they were doing."), SESHET("They always did. That is why he wants their hymns forgotten.")] },
      { id: "m04_records", trigger: { type: "battle_started", siteId: ids.goal }, lines: [DJED("You read well, little lector. Read this: no one comes back from the eleventh hour.")] }
    ]
  });
  const m5 = rivalMission(ctx, {
    name: "The Red Vizier",
    summary: "Paser, a vizier who crowned himself in the dusk, holds Per-Wadjet and the stela of the throne. Cross the river, take a second god, besiege his town and break the stela that names him king.",
    newDecisions: ["A rival empire", "A second minor god", "A siege"],
    briefing: [
      NEBET("Paser was the vizier of the north. When the sun stopped, he told the people he had stopped it \u2014 that the dusk was his, and the dark lector his priest. Half the north believed him."),
      SESHET("The throne-stela in Per-Wadjet names him king. As long as it stands, every hymn we sing is sung to his sun."),
      PASER("Turn back, priestess. A kingdom of dusk is still a kingdom. I will rule it well.")
    ],
    victory: [SESHET("The stela is broken and the north is free of his crown. Paser has nothing left but the Lector\u2019s promises. Neither do we \u2014 except that we know where the barque is.")],
    town: { townId: "tjebu", name: "Tjebu", description: "A town on the river road north, loyal to the old hymns." },
    biome: "desert",
    soundscape: "desert",
    gold: { name: "Gold Mine", description: "An unowned mine.", guard: { label: "Mine boars", army: [["tusked_boar", 10]], reward: { resources: { gold: 500 } }, battlefield: "open_field" } },
    event: {
      name: "Oasis of the Old Well",
      description: "An oasis whose well never runs dry.",
      title: "The Old Well",
      text: "At the bottom of the well something gleams \u2014 a coin, a ring, a cup \u2014 and a voice from the water says: \u201CTake one, or leave them all and drink.\u201D",
      options: [
        { label: "Take the gleam", summary: "+1,500 Gold.", reward: { resources: { gold: 1500 } } },
        { label: "Leave it and drink", summary: "Seshet gains +1 Defense and +1 Knowledge.", reward: { attributes: { defense: 1, knowledge: 1 } } }
      ]
    },
    north: { name: "Golem Ford", description: "The northern ford, held by clay golems on Paser\u2019s orders.", guard: { label: "Ford golems", army: [["clay_golem", 8]], reward: { resources: { gold: 800 } }, battlefield: "coast_road" } },
    south: {
      name: "Hireling Ford",
      description: "The southern ford, held by Paser\u2019s hired swords.",
      guard: {
        label: "Ford hirelings",
        army: [
          ["brigand", 24],
          ["brigand_cutthroat", 10]
        ],
        reward: { resources: { gold: 800 } },
        battlefield: "coast_road"
      }
    },
    stele: { name: "Throne Stela", description: "The stela that names Paser king of the dusk.", confirm: "Break the Throne Stela? This completes The Red Vizier." },
    rival: {
      playerId: "per_wadjet",
      townId: "per_wadjet",
      townName: "Per-Wadjet",
      townDescription: "Paser\u2019s capital, its walls painted red.",
      color: "#b8433a",
      hero: { heroId: "paser", definitionId: "egyptian_paser", classId: "vizier", name: "Paser" },
      army: [
        ["egyptian_solar_scarab", 26],
        ["egyptian_anubian_warden", 10],
        ["egyptian_sphinx", 3]
      ],
      garrison: [
        ["egyptian_solar_scarab", 24],
        ["egyptian_anubian_warden", 8],
        ["egyptian_sphinx", 2]
      ],
      reward: { artifactIds: ["boots_of_the_long_road"] }
    },
    objectives: { crossing: "Cross the river", god: "A second god", town: "Take Per-Wadjet", stele: "Break the throne stela", rival: "Defeat Paser (optional)", event: "The old well (optional)" },
    scenes: (ids) => [
      { id: "m05_crossed", trigger: { type: "objective_completed", objectiveId: ids.crossing }, lines: [NEBET("We are over. Paser will know by tonight."), SESHET("Let him. A king who has to be told he is king is already afraid.")] },
      { id: "m05_paser", trigger: { type: "battle_started", heroDefinitionId: ids.rival }, lines: [PASER("You fight for a sun that has left you. I fight for the people who are still here."), SESHET("Then you should have asked them.")] },
      { id: "m05_taken", trigger: { type: "objective_completed", objectiveId: ids.town }, lines: [SESHET("Per-Wadjet is ours. Break the stela, and the north sings our hymn again.")] }
    ]
  });
  const m6 = refugeMission(ctx, {
    name: "The Phoenix Rookery",
    summary: "The bennu birds, whose rising is the sun\u2019s own, are caged in their rookery under the cliffs of Iunu. Break the jailers, accept the bennu covenant, raise firebirds of your own and defeat Hekaib at the rookery gate.",
    newDecisions: ["Claim a covenant from the journal", "Firebirds in the escort", "A gate captain"],
    briefing: [
      PAWAH("Every dawn the bennu bird rises from the fire at Iunu, and the sun follows it. Every dawn \u2014 until the Lector caged the birds."),
      SESHET("Free them, and the sun has wings again. Then we can follow it down."),
      NEBET("His sword holds the rookery gate. Hekaib. I trained with him, priestess. He does not lose.")
    ],
    victory: [SESHET("The bennu fly. Tonight the sun went down in a blaze, and I saw the road it takes \u2014 down, through the hours, to the hall where the barque is held.")],
    town: { townId: "iunu", name: "Iunu", description: "The sun\u2019s own city, dark for the first time in its history." },
    biome: "desert",
    soundscape: "desert",
    north: {
      name: "Golem Steps",
      description: "The northern steps up to the rookery, held by golems.",
      guard: {
        label: "Step golems",
        army: [
          ["clay_golem", 8],
          ["bronze_golem", 2]
        ],
        reward: { resources: { gold: 1e3 } },
        battlefield: "ridge_pass"
      }
    },
    south: {
      name: "Cutthroat Stair",
      description: "The southern stair, held by cutthroats and their boars.",
      guard: {
        label: "Stair cutthroats",
        army: [
          ["brigand_cutthroat", 24],
          ["tusked_boar", 6]
        ],
        reward: { resources: { gold: 1e3 } },
        battlefield: "ridge_pass"
      }
    },
    event: {
      name: "An Egg in the Ashes",
      description: "An egg of myrrh, warm in a bed of cold ash.",
      title: "The Egg of Myrrh",
      text: "The egg is myrrh, the shape of the bennu\u2019s own, and it is warm. Carried, it will keep warm for a month. Burned, its smoke will tell you the names of the hours.",
      options: [
        { label: "Carry it", summary: "+2 Crystal and +10 Favor.", reward: { resources: { crystal: 2, favor: 10 } } },
        { label: "Burn it and learn the hours", summary: "Seshet gains 1,000 experience.", reward: { questXp: 1e3 } }
      ]
    },
    refuge: {
      name: "The Rookery",
      description: "The bennu cages, under the Lector\u2019s jailers.",
      guard: {
        label: "Rookery jailers",
        army: [
          ["egyptian_solar_scarab", 30],
          ["bronze_golem", 3],
          ["egyptian_sobek_warbeast", 2]
        ],
        reward: { resources: { gold: 1500 } },
        battlefield: "grove"
      }
    },
    nest: { name: "Ogre Den", description: "Two ogre chieftains in a cave of stolen offerings.", guard: { label: "Ogre chieftains", army: [["ogre_chieftain", 2]], reward: { resources: { crystal: 6 } }, battlefield: "grove" } },
    gate: {
      name: "Rookery Gate",
      description: "The gate to the sun\u2019s road, held by Hekaib.",
      guard: {
        label: "Hekaib and the gate guard",
        army: [
          ["egyptian_solar_scarab", 30],
          ["egyptian_anubian_warden", 10],
          ["egyptian_royal_ushabti", 4],
          ["egyptian_great_sphinx", 3]
        ],
        commander: arcCommander(H["egyptian_hekaib"], "gate6"),
        reward: { resources: { gold: 1500 }, artifactIds: ["scarab_scale_corselet"] },
        battlefield: "ridge_pass"
      }
    },
    horn: { name: "Altar of the Rising", description: "The altar where the bennu\u2019s fire is lit.", confirm: "Light the fire of the rising? This completes The Phoenix Rookery." },
    band: { id: "egyptian_bronze_guardians", name: "Bronze Guardians", army: [["bronze_golem", 6]] },
    objectives: {
      approach: "Climb to the rookery",
      refuge: "Break the jailers",
      claim: "Accept the bennu covenant",
      claimDescription: "Accept the bennu\u2019s covenant in the journal. It can then be assigned to Iunu.",
      elite: "Firebirds in the escort",
      gate: "Hekaib at the gate",
      horn: "Light the fire of the rising",
      event: "The egg of myrrh (optional)"
    },
    scenes: (ids) => [
      { id: "m06_freed", trigger: { type: "site_cleared", siteId: ids.refuge }, lines: [SESHET("The cages are open. They will not come out until they choose to \u2014 the bennu answer covenants, not keys."), PAWAH("Then ask them, priestess. Politely.")] },
      { id: "m06_hekaib", trigger: { type: "battle_started", siteId: ids.gate }, lines: [NEBET("Hekaib! We stood on the same wall at Abu. Stand aside."), DJED("He stands where I put him, captain. As you will, soon.")] },
      { id: "m06_gate", trigger: { type: "objective_completed", objectiveId: ids.gateObjective }, lines: [NEBET("He fought well. He always did. I will bury him at Abu, when this is over.")] }
    ]
  });
  const m7 = finaleMission(ctx, {
    name: "The Twelfth Hour",
    summary: "The barque of the sun is held in the Hall of the Coil, at the bottom of the night. Cross into the hours, open the gate with both horizon-stones, defeat Djedkhonsu and decide what becomes of the coiled dark.",
    newDecisions: ["Two stones, one gate", "The Hollow Lector", "The last choice"],
    briefing: [
      SESHET("The twelfth hour. Every night the sun passes it, and every night the old priests sang it through. Djedkhonsu has built a hall across the road \u2014 and in it, something coiled, holding the barque."),
      PAWAH("Two horizon-stones open the last gate, one on each side of the road. Iti the warden walks between them."),
      DJED("Come down, then, reader. I have saved you a place in the dark.")
    ],
    victory: [SESHET("The barque moves. I felt it \u2014 like a held breath let go.")],
    town: { townId: "abu", name: "Abu", description: "The southernmost town of the river, at the edge of the night road." },
    biome: "desert",
    soundscape: "storm_plateau",
    north: {
      name: "Western Descent",
      description: "The northern way down into the hours.",
      guard: {
        label: "Descent guard",
        army: [
          ["egyptian_solar_scarab", 30],
          ["egyptian_anubian_warden", 6]
        ],
        reward: { resources: { gold: 1e3 } },
        battlefield: "ridge_pass"
      }
    },
    south: {
      name: "Serpent Stair",
      description: "The southern way down, where the coil\u2019s children sleep.",
      guard: {
        label: "Coil\u2019s children",
        army: [
          ["basilisk", 2],
          ["egyptian_solar_scarab", 12]
        ],
        reward: { resources: { gold: 1e3 } },
        battlefield: "ridge_pass"
      }
    },
    stones: { north: { name: "Stone of the Western Horizon", description: "The horizon where the sun sets." }, south: { name: "Stone of the Eastern Horizon", description: "The horizon where the sun rises." }, cost: { gold: 300, stone: 3 } },
    nest: { name: "Wyvern Ledge", description: "Wyverns roost on a ledge of the night.", guard: { label: "Night wyverns", army: [["wyvern_matriarch", 3]], reward: { resources: { crystal: 6 } }, battlefield: "grove" } },
    gate: { name: "Gate of the Twelfth Hour", description: "The last gate of the night. Both horizon-stones must be sung to open it." },
    cache: { name: "Offerings of the Hours", description: "Offerings left by the old priests at each hour.", reward: { resources: { gold: 1500, crystal: 3 } } },
    hall: {
      name: "Hall of the Coil",
      description: "Djedkhonsu\u2019s hall, built across the sun\u2019s road. Something vast is coiled in its dark.",
      guard: {
        label: "Djedkhonsu and the coil\u2019s court",
        army: [
          ["bronze_golem", 2],
          ["egyptian_solar_scarab", 20],
          ["egyptian_solar_scarab", 20],
          ["egyptian_anubian_warden", 12],
          ["greater_basilisk", 2],
          ["egyptian_sobek_warbeast", 2]
        ],
        commander: arcCommander(H["egyptian_djedkhonsu"], "boss7", ["wrath_of_sekhmet"]),
        reward: { resources: { gold: 2e3 } },
        battlefield: "beacon_clearing"
      }
    },
    choice: {
      name: "The Barque of the Sun",
      description: "The sun\u2019s barque, aground on a coil of the dark.",
      title: "The Coil and the Barque",
      text: "With the Lector fallen, only the coil holds the barque: a loop of the dark as thick as a temple column. Sung down, it can be bound under the hall again \u2014 the old way, with a priestess to renew the binding every year. Cut, it will never hold anything again; but the night will be a little wilder ever after, without its old enemy to fight.",
      a: { flag: "coil_bound", label: "Bind the coil", summary: "The coil is bound under the hall, with Seshet as its keeper. Seshet gains 500 experience." },
      b: { flag: "coil_cut", label: "Cut the coil", summary: "The coil is cut and gone forever; the night grows wilder. Seshet gains 500 experience." }
    },
    seal: { name: "The Twelfth Gate", description: "The doorway of the dawn.", confirm: "Sing the barque through the twelfth gate? This completes The Twelfth Hour." },
    patrol: {
      commander: arcCommander(H["egyptian_iti"], "patrol7"),
      army: [
        ["egyptian_solar_scarab", 24],
        ["egyptian_anubian_warden", 8],
        ["egyptian_royal_ushabti", 2]
      ]
    },
    objectives: { approach: "Down into the hours", north: "The western horizon", south: "The eastern horizon", gate: "Open the twelfth gate", boss: "The Hollow Lector", choice: "The coil", seal: "Sing the barque home" },
    scenes: (ids) => [
      { id: "m07_gate", trigger: { type: "objective_completed", objectiveId: ids.gate }, lines: [PAWAH("Both horizons. I have ferried the dead for fifty years, priestess, and I never thought to see both at once.")] },
      { id: "m07_djed", trigger: { type: "battle_started", siteId: ids.hall }, lines: [DJED("I gave them a dusk that never ends. No scales, no judgement, no morning to fear. They should thank me."), SESHET("They wanted a morning. You never asked.")] },
      { id: "m07_fallen", trigger: { type: "objective_completed", objectiveId: ids.boss }, lines: [SESHET("He is gone. But the coil still holds the barque. One last thing to decide.")] }
    ]
  });
  const built = [m1, m2, m3, m4, m5, m6, m7];
  const missions = built.map((b) => b.mission);
  return {
    templates: built.map((b) => b.template),
    missions,
    entitlements: arcEntitlements(ctx, { t3: "Ushabti Covenant", t6: "Bennu Covenant" }, { t3: "The sculptor\u2019s covenant allows an Ushabti workshop to be built in one town.", t6: "The freed bennu allow a Bennu rookery to be built in one town." }),
    campaign: arcCampaign(
      ctx,
      {
        name: "The Twelfth Hour",
        tagline: "Sing. Descend. Rise.",
        summary: "The sun has stopped below the horizon. Lead the lector priestess Seshet through seven linked missions \u2014 from the red dawns of Abedju down through the hours of the night \u2014 to free the barque of the sun from the Hollow Lector and the coiled dark.",
        startingGodNote: "Ra is the fixed patron of this campaign. Set or Isis comes in Mission 3; a second god (Osiris, Thoth or Horus) in Mission 5.",
        epilogue: [
          NEBET("The sun came up white this morning. Not red \u2014 white, the way it should. The fields are steaming."),
          PAWAH("Twelve hours, a black boar, a red vizier, a library under water and a flock of firebirds. The children will want the story every night.")
        ],
        endings: [
          { flag: "coil_bound", lines: [SESHET("The coil sleeps under the hall, and I hold the binding. Every year I will go down and sing it again."), NEBET("Then every year I will go with you, priestess.")] },
          { flag: "coil_cut", lines: [SESHET("The coil is gone. The night will be wilder now \u2014 storms, strange stars, a darker dark between the hours."), PAWAH("Wilder nights, but every one of them ends. I will take that bargain.")] }
        ]
      },
      missions
    )
  };
}

// ../pantheon_realms/packages/content/src/campaign/lanternRoad.ts
var P4 = "japanese";
var AKANE = speaker(P4, "Akane");
var SHIRO = speaker(P4, "Shiro");
var GENZO = speaker(P4, "Genzo");
var YAMIKAGE = speaker(P4, "Yamikage");
var KUROGANE = speaker(P4, "Kurogane");
var LANTERN_ROAD_HEROES = [
  arcHero(P4, "japanese_akane", "Akane", "Diviner of the Western Shrine", "onmyoji", "A shrine diviner who reads the lantern-smoke at the festival of the dead. The hero of The Lantern Road.", "campaign"),
  arcHero(P4, "japanese_yamikage", "Yamikage", "The Lantern-Eater", "onmyoji", "A spirit of the borderlands who learned to swallow light, and swallowed the lanterns of seven provinces. Final opponent of The Lantern Road.", "enemy"),
  arcHero(P4, "japanese_kurogane", "Kurogane", "The Iron Daimyo", "daimyo", "A lord who fences the wandering dead into his army and calls them loyal. Rival empire in The Lantern Road, mission 5.", "enemy"),
  arcHero(P4, "japanese_gonryo", "Gonry\u014D", "Captain of the Fog Fleet", "samurai", "A sea captain whose ships sail out of the fog and never into port. Patrol in The Lantern Road, mission 4.", "enemy"),
  arcHero(P4, "japanese_oboro", "Oboro", "General of the Hazy Moon", "samurai", "Yamikage\u2019s general, who holds the kirin meadow\u2019s gate. The Lantern Road, mission 6.", "enemy"),
  arcHero(P4, "japanese_kagero", "Kager\u014D", "Warden of the Last Torii", "samurai", "A warden who walks the road between the sun stone and the moon stone. Patrol in The Lantern Road, mission 7.", "enemy")
];
var H2 = Object.fromEntries(LANTERN_ROAD_HEROES.map((h) => [h.id, h]));
function buildLanternRoad(names, familyOf2) {
  const ctx = {
    id: "lantern_road",
    pantheonId: P4,
    archetypeId: "japanese_castle_town",
    hero: { heroId: "akane", definitionId: "japanese_akane", classId: "onmyoji", name: "Akane" },
    gods: { patron: "japanese_amaterasu", first: ["japanese_hachiman", "japanese_susanoo"], second: ["japanese_inari", "japanese_fujin", "japanese_raijin"] },
    t: [
      { base: "", up: "" },
      { base: "japanese_kitsune", up: "japanese_nine_tailed_kitsune" },
      { base: "japanese_kappa", up: "japanese_river_elder_kappa" },
      { base: "japanese_tengu", up: "japanese_great_tengu" },
      { base: "japanese_oni", up: "japanese_oni_warlord" },
      { base: "japanese_jorogumo", up: "japanese_queen_jorogumo" },
      { base: "japanese_kirin", up: "japanese_celestial_kirin" },
      { base: "japanese_orochi", up: "japanese_imperial_orochi" }
    ],
    covenantT3: "japanese_tengu",
    covenantT6: "japanese_kirin",
    covenantT7: "japanese_orochi",
    hostName: "The Lantern-Eater\u2019s Procession",
    hiringReason: "Akane walks the lantern road with her own retinue. Hero hiring is disabled in The Lantern Road.",
    debriefPolicy: [
      "Akane keeps her level, experience (up to the displayed cap), skills, spellbook, spells and equipment.",
      "Amaterasu and every kami she has committed to carry into the next mission.",
      "Troops, resources, towns, mines and recruitment pools stay behind to guard the road.",
      "The next mission begins with its declared retinue and treasury."
    ],
    seed: 42e4,
    names,
    familyOf: familyOf2
  };
  const m1 = restoreMission(ctx, {
    name: "The Unlit Lantern",
    summary: "On the night of the festival of the dead, not one lantern in Kagaribi would light. Raise a fox retinue, clear the bamboo bridge and relight the great stone lantern on the pass.",
    newDecisions: ["Recruit and train", "Harmony", "Learn spells at the Mage Guild", "A one-time choice"],
    briefing: [
      SHIRO("Every lantern, priestess. The paper ones, the stone ones, the ones in the river. The dead came down the mountain to find their way home and found nothing but dark."),
      AKANE("Then they are still out there, wandering. The great lantern on the pass lights all the others. If it is dark, someone put it out."),
      GENZO("Men with straw hats and long blades have been seen on the pass road. And the boars have taken the bamboo bridge. I would not go alone.")
    ],
    victory: [AKANE("The great lantern burns, and one by one the little ones are catching. But only here. Beyond the mountains the road is still dark.")],
    town: { townId: "kagaribi", name: "Kagaribi", description: "Akane\u2019s shrine-town, famous for its festival lanterns." },
    biome: "autumn",
    soundscape: "shrine",
    barrier: "water",
    event: {
      name: "Abandoned Tea House",
      description: "A roadside tea house whose keeper fled in the night.",
      title: "The Abandoned Tea House",
      text: "The kettle is still warm. The keeper left in such a hurry that the till is full \u2014 and four small foxes sit in a row on the veranda, as if waiting for someone to tell them where to go.",
      options: [
        { label: "Take the till", summary: "+600 Gold and +4 Wood.", reward: { resources: { gold: 600, wood: 4 } } },
        { label: "Ask the foxes to follow you", summary: "4 Kitsune join Akane\u2019s retinue.", reward: { creatures: [{ creatureId: "japanese_kitsune", count: 4 }] } }
      ]
    },
    camp: { name: "Kappa Pool", description: "River kappa who will serve anyone polite enough to bow first.", creatureId: "japanese_kappa" },
    crossing: {
      name: "Bamboo Bridge",
      description: "The bridge to the pass road. Wild boars, maddened by the dark nights, hold it.",
      guard: { label: "Bridge boars", army: [["wild_boar", 8]], reward: { resources: { gold: 300, wood: 3, stone: 3 } }, battlefield: "coast_road" }
    },
    cache: { name: "Pilgrim\u2019s Shelter", description: "A shelter where pilgrims left offerings for the road.", reward: { resources: { gold: 400, crystal: 1 } } },
    monument: {
      name: "Great Lantern of the Pass",
      description: "The stone lantern that lights the spirits\u2019 road. Ronin in straw hats stand around it.",
      guard: {
        label: "Straw-hat ronin",
        army: [
          ["brigand", 14],
          ["brigand_cutthroat", 4]
        ],
        reward: { resources: { gold: 500 }, artifactIds: ["dragon_kabuto"] },
        battlefield: "beacon_clearing"
      },
      confirm: "Relight the Great Lantern of the Pass? This completes The Unlit Lantern."
    },
    objectives: { recruit: "Gather the fox retinue", train: "Teach the foxes their tails", crossing: "Clear the bamboo bridge", guard: "Drive off the ronin", activate: "Relight the great lantern", event: "The abandoned tea house (optional)" },
    scenes: (ids) => [
      { id: "m01_bridge", trigger: { type: "site_cleared", siteId: ids.crossing }, lines: [GENZO("Those boars were tied to the bridge posts. Someone wanted the road closed."), AKANE("Then someone is afraid of what the lantern shows.")] },
      { id: "m01_lantern_battle", trigger: { type: "battle_started", siteId: ids.monument }, lines: [YAMIKAGE("Little diviner. Light is a meal, and I am very hungry. Leave the lantern to me."), AKANE("Go hungry, then.")] },
      { id: "m01_kabuto", trigger: { type: "site_cleared", siteId: ids.monument }, lines: [SHIRO("Their leader wore this \u2014 a dragon helm from the Kumoyama shrine treasury."), AKANE("Stolen from a shrine and worn by a bandit. Whoever pays these men has been inside our shrines.")] },
      { id: "m01_losses", trigger: { type: "casualties", minLost: 4 }, lines: [SHIRO("We lost foxes today, priestess. Foxes remember."), AKANE("So do I. We will be more careful.")] }
    ],
    help: [{ id: "harmony", title: "Harmony", text: "The Japanese signature: with creatures of three or more different families in the army, every stack gains +1 Defense when a battle starts." }]
  });
  const m2 = huntMission(ctx, {
    name: "The Boar Lord",
    summary: "A giant boar and its herd run the rice terraces of Mizuhara and keep the spirits from the river lantern. Raise kappa of your own, cross the river, hunt the Boar Lord and relight the lantern of the mountain road.",
    newDecisions: ["Hunt a wandering herd", "Use a lookout", "Buy or bargain on the road"],
    briefing: [
      GENZO("Mizuhara\u2019s terraces are ruined. A boar as big as an ox runs there with a herd at its back, and it does not eat the rice. It tramples it."),
      AKANE("A beast that wastes food is a beast someone has sent. The river lantern is beyond the terraces \u2014 and it is dark."),
      SHIRO("Kappa, priestess. Kappa know the river, and boars do not swim.")
    ],
    victory: [GENZO("Two lanterns lit. Now the old monks say the Crow Monastery on the high pass has stopped ringing its bell. That is where the road climbs next.")],
    town: { townId: "mizuhara", name: "Mizuhara", description: "A village of rice terraces on the river." },
    biome: "autumn",
    soundscape: "shrine",
    barrier: "water",
    lookout: { name: "Pagoda of Five Roofs", description: "From its top roof, the land beyond the river lies open." },
    event: {
      name: "Clog-maker\u2019s Workshop",
      description: "A clog-maker who once made shoes for a tengu.",
      title: "The Clog-maker",
      text: "\u201CA tengu came to me once for shoes,\u201D the old man says. \u201CHe paid in feathers. I kept one pair for myself \u2014 one tooth, very tall. Walk in them and the road is shorter.\u201D He sets them on the bench. \u201COr sit, and I will tell you what the tengu told me about boars.\u201D",
      options: [
        { label: "Buy the tengu clogs", summary: "Pay 2,000 Gold for the Tengu Geta.", cost: { gold: 2e3 }, reward: { artifactIds: ["tengu_geta"] } },
        { label: "Sit and listen", summary: "Akane gains +1 Knowledge.", reward: { attributes: { knowledge: 1 } } }
      ]
    },
    camp: { name: "Reed Pool", description: "Kappa who have not fled the boars.", creatureId: "japanese_kappa" },
    bridge: {
      name: "Plank Bridge",
      description: "The bridge over the river, held by ronin.",
      guard: {
        label: "Bridge ronin",
        army: [
          ["brigand", 16],
          ["brigand_cutthroat", 6]
        ],
        reward: { resources: { gold: 600, favor: 3 } },
        battlefield: "coast_road"
      }
    },
    lair: {
      name: "Boar Wallow",
      description: "A muddy hollow under the cedars, where something bright lies trampled into the mud.",
      guard: {
        label: "Wallow boars",
        army: [
          ["tusked_boar", 4],
          ["wild_boar", 6]
        ],
        reward: { resources: { gold: 500 }, artifactIds: ["magatama_string"] },
        battlefield: "grove"
      }
    },
    stone: { name: "River Lantern", description: "The lantern of the mountain road, standing in the river shallows.", confirm: "Relight the River Lantern? This completes The Boar Lord." },
    prey: {
      id: "japanese_boar_lord",
      name: "The Boar Lord",
      portraitAssetId: "creature.neutral.wild_boar.upgraded.portrait",
      army: [
        ["tusked_boar", 6],
        ["wild_boar", 12]
      ],
      bounty: { gold: 800 }
    },
    objectives: {
      recruit: "Kappa of our own",
      lookout: "Climb the pagoda",
      bridge: "Take the plank bridge",
      prey: "Hunt the Boar Lord",
      preyHint: "The herd roams the terraces beyond the river and only charges a retinue it is sure it can beat. Move onto it to fight.",
      activate: "Relight the river lantern",
      lair: "The boar wallow (optional)",
      event: "The clog-maker (optional)"
    },
    scenes: (ids) => [
      { id: "m02_pagoda", trigger: { type: "site_visited", siteId: ids.lookout }, lines: [AKANE("There \u2014 the terraces are trampled in a ring around the river lantern. They are not feeding. They are guarding it."), SHIRO("Then it still matters to somebody.")] },
      { id: "m02_boar_battle", trigger: { type: "battle_started", heroDefinitionId: ids.prey }, lines: [YAMIKAGE("Trample her, great one. Trample her into the mud with the rice.")] },
      { id: "m02_boar_broken", trigger: { type: "objective_completed", objectiveId: ids.preyObjective }, lines: [GENZO("The Boar Lord is down. The herd is scattering into the cedars."), AKANE("Let them go. Without their lord they are only pigs.")] }
    ]
  });
  const m3 = covenantMission(ctx, {
    name: "The Crow Monastery",
    summary: "The bell of the Crow Monastery on Kumoyama has stopped. Break the ronin on the mountain road, free the oni of the red hall from their clay jailers, win the tengu covenant \u2014 by the abbot\u2019s price or by force \u2014 and take a kami for the road ahead.",
    newDecisions: ["A covenant: pay or fight", "Your first minor god", "Elite troops in the army"],
    briefing: [
      GENZO("The tengu of Kumoyama keep the bell that wakes the mountain road. The bell has been silent for a month."),
      AKANE("Tengu ring for whoever holds their covenant. If the bell is silent, someone else holds it."),
      SHIRO("And the red oni in the old hall have stopped coming down to drink. Oni always come down to drink.")
    ],
    victory: [AKANE("The bell rings, a kami walks with us and the mountain road is lit. From here the road goes down to the sea.")],
    town: { townId: "kumoyama", name: "Kumoyama", description: "A mountain town below the Crow Monastery." },
    biome: "high_pass",
    soundscape: "shrine",
    cache: { name: "Pilgrims\u2019 Storehouse", description: "Rice and silver left by pilgrims who turned back.", reward: { resources: { gold: 700, wood: 5 }, artifactIds: ["omamori_charm"] } },
    pass: {
      name: "Mountain Road",
      description: "The only road up the mountain, held by ronin.",
      guard: {
        label: "Mountain ronin",
        army: [
          ["brigand", 16],
          ["brigand_cutthroat", 6]
        ],
        reward: { resources: { gold: 750, favor: 5 } },
        battlefield: "ridge_pass"
      }
    },
    roost: {
      name: "Hall of the Red Oni",
      description: "An old hall where oni drink and sleep. Haniwa \u2014 clay tomb-figures \u2014 stand at its doors like jailers.",
      guard: { label: "Haniwa jailers", army: [["clay_golem", 5]], reward: { resources: { favor: 5 }, artifactIds: ["bronze_buckler"] }, battlefield: "ridge_pass" }
    },
    hearth: {
      name: "The Abbot\u2019s Gate",
      description: "The tengu abbot sits on the monastery gate, long-nosed and patient.",
      title: "The Tengu Abbot",
      text: "\u201COur covenant was bought,\u201D the abbot says, \u201Cby a man with a lantern for a face. Bought, not won \u2014 so it can be bought back. Pay what he paid, and the bell is yours. Or climb to the Crow Hall and take it from my monks. They have been bored since the bell stopped.\u201D",
      price: { gold: 1500, wood: 10 },
      payLabel: "Pay the abbot\u2019s price",
      refuseLabel: "Refuse \u2014 take it at the Crow Hall"
    },
    home: {
      name: "Crow Hall",
      description: "The tengu monks\u2019 hall, where the bought covenant hangs on the wall.",
      guard: {
        label: "Tengu monks",
        army: [
          ["japanese_tengu", 4],
          ["japanese_great_tengu", 1]
        ],
        reward: { resources: { gold: 1e3 } },
        battlefield: "grove"
      }
    },
    bridge: {
      name: "Rope Bridge",
      description: "A rope bridge over the gorge, held by ronin and their boars.",
      guard: {
        label: "Gorge ronin",
        army: [
          ["brigand_cutthroat", 12],
          ["tusked_boar", 4]
        ],
        reward: { resources: { gold: 800 } },
        battlefield: "ridge_pass"
      }
    },
    stone: { name: "Mountain Lantern", description: "The lantern where the spirits\u2019 road crosses the summit.", confirm: "Relight the Mountain Lantern? This completes The Crow Monastery." },
    band: { id: "japanese_cedar_boars", name: "Cedar Boars", army: [["wild_boar", 6]] },
    objectives: {
      pass: "Take the mountain road",
      roost: "Free the red oni",
      covenant: "The tengu covenant",
      covenantDescription: "Win the tengu covenant: pay the abbot\u2019s price at the gate, or beat his monks at the Crow Hall.",
      god: "A kami for the road",
      elite: "Oni warlords in the retinue",
      activate: "Relight the mountain lantern",
      cache: "The pilgrims\u2019 storehouse (optional)"
    },
    scenes: (ids) => [
      { id: "m03_oni", trigger: { type: "site_cleared", siteId: ids.roost }, lines: [SHIRO("The oni are awake and very thirsty. They say they will remember who broke the clay."), AKANE("Good. I want them to remember.")] },
      { id: "m03_crow_hall", trigger: { type: "site_cleared", siteId: ids.home }, lines: [GENZO("The paper on the wall \u2014 the covenant. It is signed with a lantern, burned through the middle."), AKANE("A lantern with its light eaten out. I know that mark now.")] },
      { id: "m03_god", trigger: { type: "objective_completed", objectiveId: ids.god }, lines: [AKANE("A kami walks with us. Whatever eats the light, it will not find us alone in the dark.")] }
    ]
  });
  const m4 = seekMission(ctx, {
    name: "The Spirit Sea",
    summary: "The Hall of Mirrors stands on an island in the Spirit Sea, behind a fog that eats boats. Raise spider-women of your own, take the landing, ring both shrine bells to clear the fog and look into the mirrors for the Lantern-Eater\u2019s home.",
    newDecisions: ["Ring two bells to open a way", "A commanded patrol", "Spider-women"],
    briefing: [
      AKANE("The Hall of Mirrors shows what has been hidden. If anything knows where the Lantern-Eater sleeps, the mirrors do."),
      GENZO("The fog came in when the lanterns went out, and a fleet sails in it \u2014 ships with no lights. Their captain walks the islands."),
      SHIRO("Two shrine bells, one on each island. Ring them both and the fog has to listen.")
    ],
    victory: [AKANE("The mirrors showed me: a palace at the end of the road, where the last torii stands. And a lord of iron between here and there, who fences the wandering dead into his army.")],
    town: { townId: "shiogama", name: "Shiogama", description: "A salt-makers\u2019 harbour on the Spirit Sea." },
    biome: "coast",
    soundscape: "shrine",
    wanderer: {
      name: "A Wandering Monk",
      description: "A monk in a basket hat, playing a flute on the shore.",
      title: "The Flute-playing Monk",
      text: "He stops playing when you come near. \u201CYou are going to the mirrors,\u201D he says. \u201CLook twice \u2014 the first look shows you what you want to see.\u201D He holds out a travelling cloak, salt-stiff. \u201CThe sea wind is cold. Or sit, and I will teach you a tune that fog does not like.\u201D",
      options: [
        { label: "Take the cloak", summary: "The Wayfarer\u2019s Cloak joins Akane\u2019s backpack.", reward: { artifactIds: ["wayfarer_cloak"] } },
        { label: "Learn the tune", summary: "Akane gains +1 Spell Power and +1 Knowledge.", reward: { attributes: { power: 1, knowledge: 1 } } }
      ]
    },
    wreck: { name: "Beached Salt Boat", description: "A salt boat driven ashore by the fog; its strongbox is dry.", reward: { resources: { gold: 900, wood: 4 } } },
    landing: {
      name: "Island Landing",
      description: "The landing on the near island, held by the fog fleet\u2019s raiders.",
      guard: {
        label: "Fog-fleet raiders",
        army: [
          ["brigand", 36],
          ["brigand_cutthroat", 14]
        ],
        reward: { resources: { gold: 800, favor: 3 } },
        battlefield: "coast_road"
      }
    },
    omen: {
      name: "The Lightless Ship",
      description: "A ship of the fog fleet, aground and empty.",
      title: "The Lightless Ship",
      text: "Every lamp on the ship has been emptied \u2014 the oil drunk, not spilled. In the captain\u2019s cabin, a chest of silver and a rack of kappa-skin raincoats.",
      options: [
        { label: "Take the silver", summary: "+800 Gold and +2 Crystal.", reward: { resources: { gold: 800, crystal: 2 } } },
        { label: "Give the raincoats to the kappa", summary: "6 River Elder Kappa join Akane\u2019s retinue.", reward: { creatures: [{ creatureId: "japanese_river_elder_kappa", count: 6 }] } }
      ]
    },
    relays: { north: { name: "North Shrine Bell", description: "A shrine bell on the northern island." }, south: { name: "South Shrine Bell", description: "A shrine bell on the southern island." }, cost: { gold: 250, stone: 3 } },
    nest: { name: "Ogre Grotto", description: "Two ogres sleep in a sea cave full of stolen nets.", guard: { label: "Grotto ogres", army: [["ogre", 2]], reward: { resources: { crystal: 5 } }, battlefield: "grove" } },
    gate: { name: "Wall of Fog", description: "A wall of fog that eats boats. Both shrine bells must ring to clear it." },
    goal: {
      name: "Hall of Mirrors",
      description: "A hall of bronze mirrors on the far island. Spider-women weave over its doors.",
      guard: {
        label: "Mirror-weavers",
        army: [
          ["japanese_jorogumo", 4],
          ["japanese_queen_jorogumo", 2]
        ],
        reward: { resources: { gold: 1e3 } },
        battlefield: "coast_road"
      },
      reward: { questXp: 2200, artifactIds: ["storm_gods_tachi"] },
      confirm: "Look into the mirrors? This completes The Spirit Sea."
    },
    patrol: {
      commander: arcCommander(H2["japanese_gonryo"], "patrol4"),
      army: [
        ["japanese_nine_tailed_kitsune", 16],
        ["japanese_river_elder_kappa", 6]
      ]
    },
    objectives: { recruit: "Spider-women of our own", landing: "Take the island landing", north: "The north bell", south: "The south bell", gate: "Clear the fog", goal: "Look into the mirrors", nest: "The ogre grotto (optional)", wanderer: "The flute-playing monk (optional)" },
    scenes: (ids) => [
      { id: "m04_landing", trigger: { type: "site_cleared", siteId: ids.landing }, lines: [GENZO("No lamps on any of their boats. They sail by smell."), AKANE("Then their captain is close. Keep the retinue together.")] },
      { id: "m04_fog", trigger: { type: "objective_completed", objectiveId: ids.gate }, lines: [SHIRO("Listen \u2014 the fog is leaving like a guest who was told the party is over.")] },
      { id: "m04_mirrors", trigger: { type: "battle_started", siteId: ids.goal }, lines: [YAMIKAGE("Look into my mirrors, diviner. You will see the dark \u2014 and the dark will see you.")] }
    ]
  });
  const m5 = rivalMission(ctx, {
    name: "The Iron Daimyo",
    summary: "Lord Kurogane fences the wandering dead into his army and holds the Iron Castle and the Lantern of Oaths. Cross the river, take a second kami, besiege his castle and break the lantern that binds the dead to him.",
    newDecisions: ["A rival empire", "A second minor god", "A siege"],
    briefing: [
      SHIRO("Kurogane rounds up the wandering dead like stray horses and puts them in his army. He says they are loyal. They are only lost."),
      AKANE("The Lantern of Oaths in his castle binds them to him. While it burns, every spirit he catches is his."),
      KUROGANE("Turn back, diviner. The dead need a lord as much as the living do. I am a good one.")
    ],
    victory: [AKANE("The Lantern of Oaths is out and the dead he bound are walking home. Kurogane has nothing left but the Lantern-Eater\u2019s promises.")],
    town: { townId: "akashi", name: "Akashi", description: "A river town on the road north, loyal to the shrines." },
    biome: "temperate",
    soundscape: "shrine",
    gold: { name: "Gold Mine", description: "An unowned mine.", guard: { label: "Mine boars", army: [["tusked_boar", 10]], reward: { resources: { gold: 500 } }, battlefield: "open_field" } },
    event: {
      name: "Hot Spring",
      description: "A hot spring with a little shrine above it.",
      title: "The Hot Spring",
      text: "A monkey sits in the spring and watches you over the steam. On the shrine shelf lie a purse of offerings \u2014 and a cup, for whoever will drink from the spring instead.",
      options: [
        { label: "Take the offerings", summary: "+1,500 Gold.", reward: { resources: { gold: 1500 } } },
        { label: "Drink from the spring", summary: "Akane gains +1 Defense and +1 Knowledge.", reward: { attributes: { defense: 1, knowledge: 1 } } }
      ]
    },
    north: { name: "Haniwa Ford", description: "The northern ford, held by clay figures on Kurogane\u2019s orders.", guard: { label: "Ford haniwa", army: [["clay_golem", 8]], reward: { resources: { gold: 800 } }, battlefield: "coast_road" } },
    south: {
      name: "Ronin Ford",
      description: "The southern ford, held by Kurogane\u2019s ronin.",
      guard: {
        label: "Ford ronin",
        army: [
          ["brigand", 24],
          ["brigand_cutthroat", 10]
        ],
        reward: { resources: { gold: 800 } },
        battlefield: "coast_road"
      }
    },
    stele: { name: "Lantern of Oaths", description: "The lantern that binds the wandering dead to Kurogane.", confirm: "Put out the Lantern of Oaths? This completes The Iron Daimyo." },
    rival: {
      playerId: "iron_castle",
      townId: "iron_castle",
      townName: "Iron Castle",
      townDescription: "Kurogane\u2019s castle, roofed in black iron.",
      color: "#5d6470",
      hero: { heroId: "kurogane", definitionId: "japanese_kurogane", classId: "daimyo", name: "Kurogane" },
      army: [
        ["japanese_nine_tailed_kitsune", 26],
        ["japanese_river_elder_kappa", 10],
        ["japanese_oni", 3]
      ],
      garrison: [
        ["japanese_nine_tailed_kitsune", 24],
        ["japanese_river_elder_kappa", 8],
        ["japanese_oni", 2]
      ],
      reward: { artifactIds: ["band_of_insight"] }
    },
    objectives: { crossing: "Cross the river", god: "A second kami", town: "Take the Iron Castle", stele: "Put out the Lantern of Oaths", rival: "Defeat Kurogane (optional)", event: "The hot spring (optional)" },
    scenes: (ids) => [
      { id: "m05_crossed", trigger: { type: "objective_completed", objectiveId: ids.crossing }, lines: [GENZO("We are over. His scouts will be riding back already."), AKANE("Let them ride. I want him to know who is coming.")] },
      { id: "m05_kurogane", trigger: { type: "battle_started", heroDefinitionId: ids.rival }, lines: [KUROGANE("Every spirit you send home is a soldier I lose. Is that fair?"), AKANE("They were never yours to lose.")] },
      { id: "m05_taken", trigger: { type: "objective_completed", objectiveId: ids.town }, lines: [AKANE("The Iron Castle is ours. Now the lantern.")] }
    ]
  });
  const m6 = refugeMission(ctx, {
    name: "The Kirin Meadow",
    summary: "The kirin, whose coming marks a just age, are penned in their high meadow by the Lantern-Eater\u2019s jailers. Break the jailers, accept the kirin covenant, raise kirin of your own and defeat General Oboro at the meadow gate.",
    newDecisions: ["Claim a covenant from the journal", "Kirin in the retinue", "A gate general"],
    briefing: [
      GENZO("The kirin only walk where a just ruler reigns. For a year no one has seen one. The herders say they are penned in the high meadow, like cattle."),
      AKANE("Free them, and the land remembers what justice looks like. Then the last road opens."),
      SHIRO("The meadow gate is held by Oboro, the general of the hazy moon. Nobody has seen his face. Nobody has seen him lose.")
    ],
    victory: [AKANE("The kirin walk again. Tonight I saw the last part of the road from the meadow \u2014 the sun stone, the moon stone and the last torii between them.")],
    town: { townId: "takamori", name: "Takamori", description: "A high town on the edge of the kirin meadows." },
    biome: "high_pass",
    soundscape: "shrine",
    north: {
      name: "Haniwa Steps",
      description: "The northern steps to the meadow, held by clay figures.",
      guard: {
        label: "Step haniwa",
        army: [
          ["clay_golem", 8],
          ["bronze_golem", 2]
        ],
        reward: { resources: { gold: 1e3 } },
        battlefield: "ridge_pass"
      }
    },
    south: {
      name: "Ronin Stair",
      description: "The southern stair, held by ronin and their boars.",
      guard: {
        label: "Stair ronin",
        army: [
          ["brigand_cutthroat", 24],
          ["tusked_boar", 6]
        ],
        reward: { resources: { gold: 1e3 } },
        battlefield: "ridge_pass"
      }
    },
    event: {
      name: "A Kirin Foal",
      description: "A kirin foal caught in a herder\u2019s fence.",
      title: "The Kirin Foal",
      text: "The foal\u2019s scales are the colour of new bronze. Cut free, it will remember you. Or the herder will trade you its shed horn-tip, which glows a little in the dark \u2014 he found it in the fence this morning.",
      options: [
        { label: "Cut the foal free", summary: "+2 Crystal and +10 Favor.", reward: { resources: { crystal: 2, favor: 10 } } },
        { label: "Read the horn-tip\u2019s light", summary: "Akane gains 1,000 experience.", reward: { questXp: 1e3 } }
      ]
    },
    refuge: {
      name: "Kirin Pens",
      description: "The pens where the kirin are held, under the Lantern-Eater\u2019s jailers.",
      guard: {
        label: "Pen jailers",
        army: [
          ["japanese_nine_tailed_kitsune", 30],
          ["bronze_golem", 3],
          ["japanese_queen_jorogumo", 2]
        ],
        reward: { resources: { gold: 1500 } },
        battlefield: "grove"
      }
    },
    nest: { name: "Ogre Shelter", description: "Two ogre chieftains in a shelter of stolen saddles.", guard: { label: "Ogre chieftains", army: [["ogre_chieftain", 2]], reward: { resources: { crystal: 6 } }, battlefield: "grove" } },
    gate: {
      name: "Meadow Gate",
      description: "The gate to the last road, held by General Oboro.",
      guard: {
        label: "Oboro and the gate guard",
        army: [
          ["japanese_nine_tailed_kitsune", 30],
          ["japanese_river_elder_kappa", 10],
          ["japanese_great_tengu", 4],
          ["japanese_oni_warlord", 3]
        ],
        commander: arcCommander(H2["japanese_oboro"], "gate6"),
        reward: { resources: { gold: 1500 }, artifactIds: ["lacquered_oyoroi"] },
        battlefield: "ridge_pass"
      }
    },
    horn: { name: "Drum of the Just Age", description: "The great drum the herders beat when the kirin come.", confirm: "Beat the Drum of the Just Age? This completes The Kirin Meadow." },
    band: { id: "japanese_iron_haniwa", name: "Iron Haniwa", army: [["bronze_golem", 6]] },
    objectives: {
      approach: "Climb to the meadow",
      refuge: "Break the pen jailers",
      claim: "Accept the kirin covenant",
      claimDescription: "Accept the kirin\u2019s covenant in the journal. It can then be assigned to Takamori.",
      elite: "Kirin in the retinue",
      gate: "General Oboro at the gate",
      horn: "Beat the drum of the just age",
      event: "The kirin foal (optional)"
    },
    scenes: (ids) => [
      { id: "m06_freed", trigger: { type: "site_cleared", siteId: ids.refuge }, lines: [AKANE("The pens are open. The kirin will not follow us for being freed \u2014 they follow a covenant, or nothing."), GENZO("Then offer them one, priestess. They are listening.")] },
      { id: "m06_oboro", trigger: { type: "battle_started", siteId: ids.gate }, lines: [YAMIKAGE("Oboro, my general, has never shown his face. Shall I tell you why? There is no face. Only my hunger, wearing armour.")] },
      { id: "m06_gate", trigger: { type: "objective_completed", objectiveId: ids.gateObjective }, lines: [SHIRO("The armour is empty. There really was no one inside."), AKANE("Then there is one less thing to bury.")] }
    ]
  });
  const m7 = finaleMission(ctx, {
    name: "The Last Torii",
    summary: "The Lantern-Eater\u2019s palace stands across the last stretch of the spirits\u2019 road, behind the last torii. Cross the hills, light the sun stone and the moon stone, defeat Yamikage and decide what becomes of the road between the worlds.",
    newDecisions: ["Two stones, one gate", "The Lantern-Eater", "The last choice"],
    briefing: [
      AKANE("The last torii. Every spirit that ever went home went through it. Yamikage has built his palace across the road beyond it, and eats every light that comes near."),
      GENZO("The sun stone and the moon stone open the torii, one on each side of the valley. A warden walks between them \u2014 Kager\u014D."),
      YAMIKAGE("Come and be eaten, little light. You have been delicious so far.")
    ],
    victory: [AKANE("The road is open. I can see them \u2014 thousands of little lights, walking home.")],
    town: { townId: "hikari", name: "Hikari", description: "The last town before the spirits\u2019 road, where the lantern-makers live." },
    biome: "storm_plateau",
    soundscape: "storm_plateau",
    north: {
      name: "Northern Torii Path",
      description: "The northern path up into the hills.",
      guard: {
        label: "Path guard",
        army: [
          ["japanese_nine_tailed_kitsune", 30],
          ["japanese_river_elder_kappa", 6]
        ],
        reward: { resources: { gold: 1e3 } },
        battlefield: "ridge_pass"
      }
    },
    south: {
      name: "Southern Torii Path",
      description: "The southern path, where two penned kirin stand guard against their will.",
      guard: {
        label: "Captive kirin",
        army: [
          ["japanese_kirin", 2],
          ["japanese_nine_tailed_kitsune", 12]
        ],
        reward: { resources: { gold: 1e3 } },
        battlefield: "ridge_pass"
      }
    },
    stones: { north: { name: "Sun Stone", description: "The stone of the day." }, south: { name: "Moon Stone", description: "The stone of the night." }, cost: { gold: 300, stone: 3 } },
    nest: { name: "Wyvern Crags", description: "Wyverns roost above the torii path.", guard: { label: "Crag wyverns", army: [["wyvern_matriarch", 3]], reward: { resources: { crystal: 6 } }, battlefield: "grove" } },
    gate: { name: "The Last Torii", description: "The last gate of the spirits\u2019 road. Both stones must be lit to open it." },
    cache: { name: "Lantern-makers\u2019 Offerings", description: "Offerings left at the torii by generations of lantern-makers.", reward: { resources: { gold: 1500, crystal: 3 } } },
    hall: {
      name: "Palace of the Lantern-Eater",
      description: "A palace built across the spirits\u2019 road, dark as an empty lantern.",
      guard: {
        label: "Yamikage and the dark court",
        army: [
          ["japanese_great_tengu", 2],
          ["japanese_nine_tailed_kitsune", 20],
          ["japanese_nine_tailed_kitsune", 20],
          ["japanese_river_elder_kappa", 12],
          ["japanese_celestial_kirin", 2],
          ["japanese_queen_jorogumo", 2]
        ],
        commander: arcCommander(H2["japanese_yamikage"], "boss7", ["kitsune_fire"]),
        reward: { resources: { gold: 2e3 } },
        battlefield: "beacon_clearing"
      }
    },
    choice: {
      name: "The Road Between Worlds",
      description: "The spirits\u2019 road, where it passes the fallen palace.",
      title: "The Road Between Worlds",
      text: "With Yamikage gone, the road is yours to set. Lit with lanterns again, it will be what it always was: one night a year for the dead to come home and go back. Left open, with no lanterns at all, the spirits will choose their own times and ways \u2014 a stranger world, and a less lonely one.",
      a: { flag: "lanterns_lit", label: "Light the lanterns", summary: "The road is lit the old way, one night a year. Akane gains 500 experience." },
      b: { flag: "road_open", label: "Leave the road open", summary: "The spirits choose their own ways. Akane gains 500 experience." }
    },
    seal: { name: "First Lantern", description: "The first lantern of the road, where every festival begins.", confirm: "Light the first lantern of the road? This completes The Lantern Road." },
    patrol: {
      commander: arcCommander(H2["japanese_kagero"], "patrol7"),
      army: [
        ["japanese_nine_tailed_kitsune", 24],
        ["japanese_river_elder_kappa", 8],
        ["japanese_great_tengu", 2]
      ]
    },
    objectives: { approach: "Into the hills", north: "Light the sun stone", south: "Light the moon stone", gate: "Open the last torii", boss: "The Lantern-Eater", choice: "The road between worlds", seal: "Light the first lantern" },
    scenes: (ids) => [
      { id: "m07_gate", trigger: { type: "objective_completed", objectiveId: ids.gate }, lines: [GENZO("The torii is open. My grandfather carved lanterns for sixty years and never saw it with his own eyes.")] },
      { id: "m07_yamikage", trigger: { type: "battle_started", siteId: ids.hall }, lines: [YAMIKAGE("Every light ends, diviner. I only end them sooner."), AKANE("And every dark ends at morning. I am here to make it sooner.")] },
      { id: "m07_fallen", trigger: { type: "objective_completed", objectiveId: ids.boss }, lines: [AKANE("He is gone. The road is still here. Now \u2014 how should it be lit?")] }
    ]
  });
  const built = [m1, m2, m3, m4, m5, m6, m7];
  const missions = built.map((b) => b.mission);
  return {
    templates: built.map((b) => b.template),
    missions,
    entitlements: arcEntitlements(ctx, { t3: "Tengu Covenant", t6: "Kirin Covenant" }, { t3: "The tengu abbot\u2019s covenant allows a Tengu monastery to be built in one town.", t6: "The freed kirin allow a Kirin meadow to be kept in one town." }),
    campaign: arcCampaign(
      ctx,
      {
        name: "The Lantern Road",
        tagline: "Light. Climb. Bring them home.",
        summary: "The lanterns that guide the dead home have gone dark. Lead the shrine diviner Akane through seven linked missions \u2014 from the unlit festival of Kagaribi to the last torii \u2014 to relight the spirits\u2019 road and face the Lantern-Eater.",
        startingGodNote: "Amaterasu is the fixed patron of this campaign. Hachiman or Susanoo comes in Mission 3; a second kami (Inari, Fujin or Raijin) in Mission 5.",
        epilogue: [
          SHIRO("Every lantern in Kagaribi lit by itself last night. The children ran from one to the next, counting."),
          GENZO("A boar lord, a bell, a sea of fog, an iron castle and a herd of kirin. I will need a bigger lantern to paint it all on.")
        ],
        endings: [
          { flag: "lanterns_lit", lines: [AKANE("One night a year, as it always was. The dead come home, and then they go back. It is enough."), SHIRO("It was always enough, priestess. We only forgot.")] },
          { flag: "road_open", lines: [AKANE("No lanterns now. The spirits come and go when they choose \u2014 grandmothers at the breakfast table, foxes that talk at noon."), GENZO("A stranger world. I think I like it.")] }
        ]
      },
      missions
    )
  };
}

// ../pantheon_realms/packages/content/src/campaign/silverBranch.ts
var P5 = "celtic";
var ORLA = speaker(P5, "Orla");
var CATHAL = speaker(P5, "Cathal");
var SADB = speaker(P5, "Sadb");
var DUBHGHALL = speaker(P5, "Dubhghall");
var FIACHRA = speaker(P5, "Fiachra");
var SILVER_BRANCH_HEROES = [
  arcHero(P5, "celtic_orla", "Orla", "Druid of the Hazel Grove", "druid", "A druid of the hazel grove who keeps the calendar of fires. The hero of The Silver Branch.", "campaign"),
  arcHero(P5, "celtic_dubhghall", "Dubhghall", "The Withered King", "chieftain", "A king who swore himself to the dark half of the year and broke the silver branch so it would never end. Final opponent of The Silver Branch.", "enemy"),
  arcHero(P5, "celtic_fiachra", "Fiachra", "The Usurper of the Ford", "chieftain", "A chieftain who took the high seat in the long winter and keeps it with the Withered King\u2019s help. Rival empire in The Silver Branch, mission 5.", "enemy"),
  arcHero(P5, "celtic_corc", "Corc", "Raider of the Grey Sea", "fian", "A sea-raider who came with the mist and stayed for the plunder. Patrol in The Silver Branch, mission 4.", "enemy"),
  arcHero(P5, "celtic_tadhg", "Tadhg the Grey", "Champion of the Withered King", "fian", "The Withered King\u2019s champion, who holds the stags\u2019 wood. The Silver Branch, mission 6.", "enemy"),
  arcHero(P5, "celtic_ciar", "Ciar", "Warden of the Mound", "fian", "Keeper of the road between the summer stone and the winter stone. Patrol in The Silver Branch, mission 7.", "enemy")
];
var H3 = Object.fromEntries(SILVER_BRANCH_HEROES.map((h) => [h.id, h]));
function buildSilverBranch(names, familyOf2) {
  const ctx = {
    id: "silver_branch",
    pantheonId: P5,
    archetypeId: "celtic_hillfort",
    hero: { heroId: "orla", definitionId: "celtic_orla", classId: "druid", name: "Orla" },
    gods: { patron: "celtic_dagda", first: ["celtic_morrigan", "celtic_brigid"], second: ["celtic_cernunnos", "celtic_epona", "celtic_lugh"] },
    t: [
      { base: "", up: "" },
      { base: "celtic_pooka", up: "celtic_elder_pooka" },
      { base: "celtic_cu_sith", up: "celtic_great_cu_sith" },
      { base: "celtic_kelpie", up: "celtic_dread_kelpie" },
      { base: "celtic_banshee", up: "celtic_battle_banshee" },
      { base: "celtic_selkie", up: "celtic_storm_selkie" },
      { base: "celtic_horned_stag_spirit", up: "celtic_great_stag_spirit" },
      { base: "celtic_fomorian_giant", up: "celtic_ancient_fomorian" }
    ],
    covenantT3: "celtic_kelpie",
    covenantT6: "celtic_horned_stag_spirit",
    covenantT7: "celtic_fomorian_giant",
    hostName: "The Withered King\u2019s Host",
    hiringReason: "Orla rides with her own war-band. Hero hiring is disabled in The Silver Branch.",
    debriefPolicy: [
      "Orla keeps her level, experience (up to the displayed cap), skills, spellbook, spells and equipment.",
      "The Dagda and every god she has committed to carry into the next mission.",
      "Troops, resources, forts, mines and recruitment pools stay behind to hold the land.",
      "The next mission begins with its declared war-band and treasury."
    ],
    seed: 43e4,
    names,
    familyOf: familyOf2
  };
  const m1 = restoreMission(ctx, {
    name: "The Cold Hearth",
    summary: "Beltane came and no fire would catch. Raise a war-band of pooka in D\xFAn Caill, clear the ford of the alders and light the Beltane fire on the old stone.",
    newDecisions: ["Recruit and train", "Shapeshifting", "Learn spells at the Mage Guild", "A one-time choice"],
    briefing: [
      SADB("Beltane, and the cattle still in the byres. We built the fire twice and it would not take. The kindling was dry as bone."),
      ORLA("Then the fire is not refusing the kindling. Something is refusing the summer. The Beltane stone on the ridge is where the year turns \u2014 I need to see it."),
      CATHAL("Reavers have been seen on the ridge. And the boars have taken the alder ford. Bring the pooka \u2014 they are quicker than men.")
    ],
    victory: [ORLA("The fire caught. The cattle went out between the flames this morning. But only here \u2014 over the hills the dark half holds.")],
    town: { townId: "dun_caill", name: "D\xFAn Caill", description: "Orla\u2019s hillfort by the hazel grove." },
    biome: "moor",
    soundscape: "glen",
    barrier: "water",
    event: {
      name: "The Hawthorn Well",
      description: "A holy well under a lone hawthorn, its rags faded.",
      title: "The Hawthorn Well",
      text: "The well is choked with offerings \u2014 coins, pins, a silver brooch \u2014 left by people who wanted the summer back. In the hawthorn above it four hares watch you without blinking, the way no hare should.",
      options: [
        { label: "Take the offerings", summary: "+600 Gold and +4 Wood.", reward: { resources: { gold: 600, wood: 4 } } },
        { label: "Speak to the hares", summary: "4 Pooka join Orla\u2019s war-band.", reward: { creatures: [{ creatureId: "celtic_pooka", count: 4 }] } }
      ]
    },
    camp: { name: "C\xFA Sith Den", description: "Great green hounds of the hills that will run with a druid.", creatureId: "celtic_cu_sith" },
    crossing: {
      name: "Ford of the Alders",
      description: "The ford to the ridge road. Boars, wild with the cold, wallow in it.",
      guard: { label: "Ford boars", army: [["wild_boar", 8]], reward: { resources: { gold: 300, wood: 3, stone: 3 } }, battlefield: "coast_road" }
    },
    cache: { name: "Herders\u2019 Booley", description: "A summer hut the herders never reached this year.", reward: { resources: { gold: 400, crystal: 1 } } },
    monument: {
      name: "Beltane Stone",
      description: "The stone on the ridge where the year turns. Reavers camp around it.",
      guard: {
        label: "Ridge reavers",
        army: [
          ["brigand", 14],
          ["brigand_cutthroat", 4]
        ],
        reward: { resources: { gold: 500 }, artifactIds: ["mistletoe_crown"] },
        battlefield: "beacon_clearing"
      },
      confirm: "Light the Beltane fire on the stone? This completes The Cold Hearth."
    },
    objectives: { recruit: "Gather the pooka", train: "Teach the old shapes", crossing: "Clear the alder ford", guard: "Drive off the reavers", activate: "Light the Beltane fire", event: "The hawthorn well (optional)" },
    scenes: (ids) => [
      { id: "m01_ford", trigger: { type: "site_cleared", siteId: ids.crossing }, lines: [CATHAL("Someone threw grain into that ford every night. You do not keep boars by accident."), ORLA("Then someone wanted the ridge kept quiet. The stone, then.")] },
      { id: "m01_stone_battle", trigger: { type: "battle_started", siteId: ids.monument }, lines: [DUBHGHALL("Little druid. The summer is over. I have seen to it. Go home and sleep until spring \u2014 there will not be one."), ORLA("I have never been good at sleeping.")] },
      { id: "m01_crown", trigger: { type: "site_cleared", siteId: ids.monument }, lines: [SADB("Their chief wore this \u2014 a mistletoe crown from the grove at D\xFAn Bera."), ORLA("A grove-crown on a reaver. Whoever pays them has walked in the groves.")] },
      { id: "m01_losses", trigger: { type: "casualties", minLost: 4 }, lines: [SADB("We buried some of ours under the alders today, Orla."), ORLA("I know. We will not leave more there than we have to.")] }
    ],
    help: [{ id: "shapeshift", title: "Shapeshifting", text: "The Celtic signature: creatures with Shapeshift change aspect at the start of their activation for free." }]
  });
  const m2 = huntMission(ctx, {
    name: "The Iron-Bristled Boar",
    summary: "A boar with bristles like iron nails leads a herd through the fields of D\xFAn Bera and keeps the folk from the ogham stone at the ford. Raise hounds of your own, cross the river, hunt the boar and cut the summer ogham again.",
    newDecisions: ["Hunt a wandering herd", "Use a lookout", "Buy or bargain on the road"],
    briefing: [
      CATHAL("D\xFAn Bera\u2019s fields are ploughed up \u2014 not by ploughs. A boar the size of a bull, bristles like nails, and a herd behind it."),
      ORLA("The ogham stone at the ford still holds the summer\u2019s name. Someone wants it unreadable."),
      SADB("Hounds, then. Build the den, Orla. The c\xFA sith have hunted bigger pigs than this one.")
    ],
    victory: [SADB("Two fires lit. The bards say the next is at the loch of the water-horses, and the water-horses have stopped coming to the shore.")],
    town: { townId: "dun_bera", name: "D\xFAn Bera", description: "A farming fort on the river." },
    biome: "moor",
    soundscape: "glen",
    barrier: "water",
    lookout: { name: "Hill of the Watchers", description: "From the top, the land beyond the river lies open." },
    event: {
      name: "A Feather-cloak Weaver",
      description: "An old woman weaving a cloak of raven feathers.",
      title: "The Feather-cloak Weaver",
      text: "\u201CThe ravens bring me their feathers,\u201D the old woman says, \u201Cbecause I tell them the news.\u201D She holds up a finished cloak, black and shining. \u201CIt makes the road shorter. Or sit with me, and I will tell you what the ravens told me about that boar.\u201D",
      options: [
        { label: "Buy the raven cloak", summary: "Pay 2,000 Gold for the Raven-feather Cloak.", cost: { gold: 2e3 }, reward: { artifactIds: ["raven_feather_cloak"] } },
        { label: "Sit and listen", summary: "Orla gains +1 Knowledge.", reward: { attributes: { knowledge: 1 } } }
      ]
    },
    camp: { name: "Hound Hollow", description: "C\xFA sith that have not fled the boar.", creatureId: "celtic_cu_sith" },
    bridge: {
      name: "Stepping Stones",
      description: "The stepping stones over the river, held by reavers.",
      guard: {
        label: "Ford reavers",
        army: [
          ["brigand", 16],
          ["brigand_cutthroat", 6]
        ],
        reward: { resources: { gold: 600, favor: 3 } },
        battlefield: "coast_road"
      }
    },
    lair: {
      name: "Boar\u2019s Bed",
      description: "A hollow under an oak, where a shield lies half-buried.",
      guard: {
        label: "Bed boars",
        army: [
          ["tusked_boar", 4],
          ["wild_boar", 6]
        ],
        reward: { resources: { gold: 500 }, artifactIds: ["fianna_targe"] },
        battlefield: "grove"
      }
    },
    stone: { name: "Ogham Stone of the Ford", description: "The standing stone that carries the summer\u2019s name in ogham.", confirm: "Cut the summer ogham again? This completes The Iron-Bristled Boar." },
    prey: {
      id: "celtic_iron_boar",
      name: "The Iron-Bristled Boar",
      portraitAssetId: "creature.neutral.wild_boar.upgraded.portrait",
      army: [
        ["tusked_boar", 6],
        ["wild_boar", 12]
      ],
      bounty: { gold: 800 }
    },
    objectives: {
      recruit: "Hounds of our own",
      lookout: "Climb the watchers\u2019 hill",
      bridge: "Take the stepping stones",
      prey: "Hunt the iron-bristled boar",
      preyHint: "The herd roams the fields beyond the river and only charges a war-band it is sure it can beat. Move onto it to fight.",
      activate: "Cut the summer ogham",
      lair: "The boar\u2019s bed (optional)",
      event: "The feather-cloak weaver (optional)"
    },
    scenes: (ids) => [
      { id: "m02_hill", trigger: { type: "site_visited", siteId: ids.lookout }, lines: [ORLA("There \u2014 the fields are ploughed in a ring around the ogham stone. They are guarding it."), CATHAL("Then it still matters to them. Good.")] },
      { id: "m02_boar_battle", trigger: { type: "battle_started", heroDefinitionId: ids.prey }, lines: [DUBHGHALL("Gore her, iron-back. Plough her under with the summer.")] },
      { id: "m02_boar_broken", trigger: { type: "objective_completed", objectiveId: ids.preyObjective }, lines: [SADB("The boar is down. The herd is running for the woods."), ORLA("Let them run. A boar without a master is only a boar.")] }
    ]
  });
  const m3 = covenantMission(ctx, {
    name: "The Water-Horse Bargain",
    summary: "The kelpies of Loch Eala have stopped coming to shore. Break the reavers on the hill road, free the banshees\u2019 hill from the cairn-men, win the kelpie covenant \u2014 by the keeper\u2019s bargain or by force \u2014 and take a god for the dark road ahead.",
    newDecisions: ["A covenant: pay or fight", "Your first minor god", "Elite troops in the army"],
    briefing: [
      CATHAL("The water-horses of Loch Eala carry anyone who keeps the old covenant with them. Nobody has seen one since Samhain."),
      ORLA("A covenant can be broken, bought or stolen. If they have stopped coming, someone holds it who should not."),
      SADB("And the banshees on Keening Hill have gone silent. A silent banshee is worse than a wailing one.")
    ],
    victory: [ORLA("The covenant holds, a god rides with us and the hill fire is lit. The road goes west from here \u2014 to the sea.")],
    town: { townId: "rath_eala", name: "R\xE1th Eala", description: "A ringfort above the loch." },
    biome: "high_pass",
    soundscape: "glen",
    cache: { name: "Bards\u2019 Hoard", description: "A bard\u2019s chest hidden in a rock cleft.", reward: { resources: { gold: 700, wood: 5 }, artifactIds: ["ogham_staves"] } },
    pass: {
      name: "Hill Road",
      description: "The only road over the hill, held by reavers.",
      guard: {
        label: "Hill reavers",
        army: [
          ["brigand", 16],
          ["brigand_cutthroat", 6]
        ],
        reward: { resources: { gold: 750, favor: 5 } },
        battlefield: "ridge_pass"
      }
    },
    roost: {
      name: "Keening Hill",
      description: "The banshees\u2019 hill. Cairn-men \u2014 stones that walk \u2014 stand around it like jailers.",
      guard: { label: "Cairn-men", army: [["clay_golem", 5]], reward: { resources: { favor: 5 }, artifactIds: ["torc_of_the_high_king"] }, battlefield: "ridge_pass" }
    },
    hearth: {
      name: "The Keeper of the Loch",
      description: "An old woman sits on the shore, combing a horse\u2019s mane that is not there.",
      title: "The Keeper of the Loch",
      text: "\u201CThe covenant was sold,\u201D the keeper says, combing. \u201CBy my own son, to a grey king for a ring. Buy it back from me at the price he got, and the horses will come to your hand. Or go down to the Kelpies\u2019 Shore and take it from them \u2014 they will enjoy the struggle.\u201D",
      price: { gold: 1500, wood: 10 },
      payLabel: "Pay the keeper\u2019s price",
      refuseLabel: "Refuse \u2014 take it at the shore"
    },
    home: {
      name: "Kelpies\u2019 Shore",
      description: "The shore where the water-horses come out of the loch.",
      guard: {
        label: "Kelpies of the loch",
        army: [
          ["celtic_kelpie", 4],
          ["celtic_dread_kelpie", 1]
        ],
        reward: { resources: { gold: 1e3 } },
        battlefield: "grove"
      }
    },
    bridge: {
      name: "Causeway of Stones",
      description: "A causeway over the bog, held by reavers and their boars.",
      guard: {
        label: "Causeway reavers",
        army: [
          ["brigand_cutthroat", 12],
          ["tusked_boar", 4]
        ],
        reward: { resources: { gold: 800 } },
        battlefield: "ridge_pass"
      }
    },
    stone: { name: "Hill Fire", description: "The beacon where the year\u2019s fires are passed from hill to hill.", confirm: "Light the hill fire? This completes The Water-Horse Bargain." },
    band: { id: "celtic_bog_boars", name: "Bog Boars", army: [["wild_boar", 6]] },
    objectives: {
      pass: "Take the hill road",
      roost: "Free Keening Hill",
      covenant: "The kelpie covenant",
      covenantDescription: "Win the kelpie covenant: pay the keeper\u2019s price on the shore of the loch, or beat the kelpies at their shore.",
      god: "A god for the dark road",
      elite: "Battle banshees in the war-band",
      activate: "Light the hill fire",
      cache: "The bards\u2019 hoard (optional)"
    },
    scenes: (ids) => [
      { id: "m03_hill", trigger: { type: "site_cleared", siteId: ids.roost }, lines: [SADB("The banshees are keening again. I never thought I would be glad of that sound."), ORLA("They are keening for the year. Let them.")] },
      { id: "m03_shore", trigger: { type: "site_cleared", siteId: ids.home }, lines: [CATHAL("The ring the keeper\u2019s son got \u2014 it is here, on the shore. Grey iron, cold as a grave."), ORLA("The Withered King pays in grave-iron. I will remember.")] },
      { id: "m03_god", trigger: { type: "objective_completed", objectiveId: ids.god }, lines: [ORLA("A god rides with us now. Whatever holds the dark half of the year, it will not meet us alone.")] }
    ]
  });
  const m4 = seekMission(ctx, {
    name: "The Hall Beneath the Waves",
    summary: "The hall of the sea-folk lies beyond the islands, behind a mist that came with the raiders. Raise selkies of your own, take the landing, light both headland fires to burn away the mist and ask the sea-folk where the Withered King keeps the broken branch.",
    newDecisions: ["Light two fires to open a way", "A commanded patrol", "Selkies"],
    briefing: [
      ORLA("The sea-folk see everything that goes into the sea. If the silver branch was thrown into the water, they know where it went."),
      CATHAL("A mist came in with the grey raiders and it has not lifted since. Their captain, Corc, walks the islands."),
      SADB("The old headland fires burn through any mist. Light both and the sea has to clear.")
    ],
    victory: [ORLA("The sea-folk saw it: the branch, broken, carried into a mound in the east by the Withered King himself. And a usurper on the high seat at the ford keeps the road to it.")],
    town: { townId: "inis_ron", name: "Inis R\xF3n", description: "A seal-island fort at the edge of the western sea." },
    biome: "coast",
    soundscape: "glen",
    wanderer: {
      name: "A Bard by the Shore",
      description: "A bard sitting on an upturned boat, tuning a harp.",
      title: "The Bard",
      text: "\u201CYou are going to the sea-hall,\u201D the bard says, not looking up from the harp. \u201CAsk your question as a verse \u2014 the sea-folk answer verses.\u201D He tosses you a small ring of white stone. \u201CA fairy ring. Or sit, and I will teach you the verse.\u201D",
      options: [
        { label: "Take the fairy ring", summary: "The Fairy-ring Band joins Orla\u2019s backpack.", reward: { artifactIds: ["fairy_ring_band"] } },
        { label: "Learn the verse", summary: "Orla gains +1 Spell Power and +1 Knowledge.", reward: { attributes: { power: 1, knowledge: 1 } } }
      ]
    },
    wreck: { name: "Wrecked Currach", description: "A leather boat thrown up by the storm; its cargo is dry.", reward: { resources: { gold: 900, wood: 4 } } },
    landing: {
      name: "Island Landing",
      description: "The landing on the near island, held by grey raiders.",
      guard: {
        label: "Grey raiders",
        army: [
          ["brigand", 36],
          ["brigand_cutthroat", 14]
        ],
        reward: { resources: { gold: 800, favor: 3 } },
        battlefield: "coast_road"
      }
    },
    omen: {
      name: "The Raiders\u2019 Longboat",
      description: "A raider boat beached and empty.",
      title: "The Raiders\u2019 Longboat",
      text: "The longboat is full of plunder from every coast \u2014 and a pen of great green hounds the raiders stole and never dared to let out.",
      options: [
        { label: "Take the plunder", summary: "+800 Gold and +2 Crystal.", reward: { resources: { gold: 800, crystal: 2 } } },
        { label: "Let the hounds out", summary: "6 Great C\xFA Sith join Orla\u2019s war-band.", reward: { creatures: [{ creatureId: "celtic_great_cu_sith", count: 6 }] } }
      ]
    },
    relays: { north: { name: "North Headland Fire", description: "An old fire-pit on the northern headland." }, south: { name: "South Headland Fire", description: "An old fire-pit on the southern headland." }, cost: { gold: 250, stone: 3 } },
    nest: { name: "Ogres\u2019 Sea-cave", description: "Two ogres living on wreck-pickings.", guard: { label: "Sea-cave ogres", army: [["ogre", 2]], reward: { resources: { crystal: 5 } }, battlefield: "grove" } },
    gate: { name: "The Grey Mist", description: "A wall of mist over the western sea. Both headland fires must burn to clear it." },
    goal: {
      name: "Hall Beneath the Waves",
      description: "The sea-folk\u2019s hall, its doors kept by selkies who no longer remember their own skins.",
      guard: {
        label: "Hall selkies",
        army: [
          ["celtic_selkie", 4],
          ["celtic_storm_selkie", 2]
        ],
        reward: { resources: { gold: 1e3 } },
        battlefield: "coast_road"
      },
      reward: { questXp: 2200, artifactIds: ["cauldron_of_plenty"] },
      confirm: "Ask the sea-folk in verse? This completes The Hall Beneath the Waves."
    },
    patrol: {
      commander: arcCommander(H3["celtic_corc"], "patrol4"),
      army: [
        ["celtic_elder_pooka", 16],
        ["celtic_great_cu_sith", 6]
      ]
    },
    objectives: { recruit: "Selkies of our own", landing: "Take the island landing", north: "The north headland fire", south: "The south headland fire", gate: "Burn away the mist", goal: "Ask the sea-folk", nest: "The ogres\u2019 sea-cave (optional)", wanderer: "The bard by the shore (optional)" },
    scenes: (ids) => [
      { id: "m04_landing", trigger: { type: "site_cleared", siteId: ids.landing }, lines: [CATHAL("Grey raiders, grey sails, grey mist. Even their blood looks grey."), ORLA("Then Corc is close. Keep the war-band together.")] },
      { id: "m04_mist", trigger: { type: "objective_completed", objectiveId: ids.gate }, lines: [SADB("The mist is lifting off the water like breath off a cow.")] },
      { id: "m04_hall", trigger: { type: "battle_started", siteId: ids.goal }, lines: [DUBHGHALL("Ask the sea, druid. The sea keeps what it is given \u2014 and so do I.")] }
    ]
  });
  const m5 = rivalMission(ctx, {
    name: "The High Seat",
    summary: "Fiachra took the high seat at the ford in the long winter and holds it with the Withered King\u2019s help. Cross the river, take a second god, besiege his fort and overturn the inauguration stone that names him king.",
    newDecisions: ["A rival empire", "A second minor god", "A siege"],
    briefing: [
      SADB("Fiachra was a cattle-lord on the eastern ford. When the summer failed he sat on the high seat and said the winter was his to keep."),
      ORLA("His inauguration stone names him king. While it stands, the land answers to him \u2014 and he answers to the Withered King."),
      FIACHRA("Go back to your groves, druid. A winter king is still a king, and I keep my people fed.")
    ],
    victory: [ORLA("The stone is overturned and the land is free of his kingship. The road east to the mound is open.")],
    town: { townId: "dun_ard", name: "D\xFAn Ard", description: "A hillfort on the river road, loyal to the old fires." },
    biome: "temperate",
    soundscape: "glen",
    gold: { name: "Gold Mine", description: "An unowned mine.", guard: { label: "Mine boars", army: [["tusked_boar", 10]], reward: { resources: { gold: 500 } }, battlefield: "open_field" } },
    event: {
      name: "The Salmon Pool",
      description: "A pool under hazel trees, where a salmon rises.",
      title: "The Salmon Pool",
      text: "Hazelnuts fall into the pool and a speckled salmon rises to eat them. On the bank lies a purse someone left in thanks \u2014 or you could sit and watch the salmon, which is said to be the wisest thing in the river.",
      options: [
        { label: "Take the purse", summary: "+1,500 Gold.", reward: { resources: { gold: 1500 } } },
        { label: "Watch the salmon", summary: "Orla gains +1 Defense and +1 Knowledge.", reward: { attributes: { defense: 1, knowledge: 1 } } }
      ]
    },
    north: { name: "Cairn Ford", description: "The northern ford, held by cairn-men on Fiachra\u2019s orders.", guard: { label: "Ford cairn-men", army: [["clay_golem", 8]], reward: { resources: { gold: 800 } }, battlefield: "coast_road" } },
    south: {
      name: "Reaver Ford",
      description: "The southern ford, held by Fiachra\u2019s reavers.",
      guard: {
        label: "Ford reavers",
        army: [
          ["brigand", 24],
          ["brigand_cutthroat", 10]
        ],
        reward: { resources: { gold: 800 } },
        battlefield: "coast_road"
      }
    },
    stele: { name: "Inauguration Stone", description: "The stone that names Fiachra king.", confirm: "Overturn the Inauguration Stone? This completes The High Seat." },
    rival: {
      playerId: "dun_fiachra",
      townId: "dun_fiachra",
      townName: "D\xFAn Fiachra",
      townDescription: "Fiachra\u2019s fort on the eastern ford.",
      color: "#7a8f3a",
      hero: { heroId: "fiachra", definitionId: "celtic_fiachra", classId: "chieftain", name: "Fiachra" },
      army: [
        ["celtic_elder_pooka", 26],
        ["celtic_great_cu_sith", 10],
        ["celtic_banshee", 3]
      ],
      garrison: [
        ["celtic_elder_pooka", 24],
        ["celtic_great_cu_sith", 8],
        ["celtic_banshee", 2]
      ],
      reward: { artifactIds: ["stone_of_fal"] }
    },
    objectives: { crossing: "Cross the river", god: "A second god", town: "Take D\xFAn Fiachra", stele: "Overturn the stone", rival: "Defeat Fiachra (optional)", event: "The salmon pool (optional)" },
    scenes: (ids) => [
      { id: "m05_crossed", trigger: { type: "objective_completed", objectiveId: ids.crossing }, lines: [CATHAL("We are over. His cattle-scouts will be running home."), ORLA("Let them run. I want him to hear it from his own people.")] },
      { id: "m05_fiachra", trigger: { type: "battle_started", heroDefinitionId: ids.rival }, lines: [FIACHRA("My people eat this winter. Will they eat in your summer?"), ORLA("They ate in every summer before you.")] },
      { id: "m05_taken", trigger: { type: "objective_completed", objectiveId: ids.town }, lines: [ORLA("D\xFAn Fiachra is ours. And look \u2014 the stone of the kings was in his treasury. Now the inauguration stone.")] }
    ]
  });
  const m6 = refugeMission(ctx, {
    name: "The Stags\u2019 Wood",
    summary: "The great horned stags of the deep wood are bound in iron by the Withered King\u2019s jailers. Break the jailers, accept the stags\u2019 covenant, raise stag spirits of your own and defeat Tadhg the Grey at the wood\u2019s gate.",
    newDecisions: ["Claim a covenant from the journal", "Stag spirits in the war-band", "A gate champion"],
    briefing: [
      CATHAL("The horned stags lead the year from the dark half to the bright. No one has heard them bell since Samhain."),
      ORLA("The Withered King has bound them in grave-iron in their own wood. Free them, and the year can turn."),
      SADB("His champion holds the wood\u2019s gate. Tadhg the Grey. He was a hero once.")
    ],
    victory: [ORLA("The stags are belling. Tonight, from the edge of the wood, I saw the mound in the east \u2014 and the summer stone and the winter stone on either side of the road to it.")],
    town: { townId: "coill_dubh", name: "Coill Dubh", description: "A fort on the edge of the deep wood." },
    biome: "moor",
    soundscape: "glen",
    north: {
      name: "Cairn Steps",
      description: "The northern way into the wood, held by cairn-men.",
      guard: {
        label: "Step cairn-men",
        army: [
          ["clay_golem", 8],
          ["bronze_golem", 2]
        ],
        reward: { resources: { gold: 1e3 } },
        battlefield: "ridge_pass"
      }
    },
    south: {
      name: "Reaver Path",
      description: "The southern path, held by reavers and their boars.",
      guard: {
        label: "Path reavers",
        army: [
          ["brigand_cutthroat", 24],
          ["tusked_boar", 6]
        ],
        reward: { resources: { gold: 1e3 } },
        battlefield: "ridge_pass"
      }
    },
    event: {
      name: "A Fawn in Iron",
      description: "A white fawn with a grave-iron band on one leg.",
      title: "The White Fawn",
      text: "The band is grave-iron, cold enough to burn. Cut it, and the fawn will run to its mother. Or melt it in a druid fire and read the king\u2019s secrets in the smoke.",
      options: [
        { label: "Cut the band", summary: "+2 Crystal and +10 Favor.", reward: { resources: { crystal: 2, favor: 10 } } },
        { label: "Read the smoke", summary: "Orla gains 1,000 experience.", reward: { questXp: 1e3 } }
      ]
    },
    refuge: {
      name: "The Iron Grove",
      description: "Where the stags are bound, under the Withered King\u2019s jailers.",
      guard: {
        label: "Grove jailers",
        army: [
          ["celtic_elder_pooka", 30],
          ["bronze_golem", 3],
          ["celtic_storm_selkie", 2]
        ],
        reward: { resources: { gold: 1500 } },
        battlefield: "grove"
      }
    },
    nest: { name: "Ogre Holt", description: "Two ogre chieftains in a holt of stolen cattle.", guard: { label: "Ogre chieftains", army: [["ogre_chieftain", 2]], reward: { resources: { crystal: 6 } }, battlefield: "grove" } },
    gate: {
      name: "Wood Gate",
      description: "The gate out of the deep wood, held by Tadhg the Grey.",
      guard: {
        label: "Tadhg and the gate guard",
        army: [
          ["celtic_elder_pooka", 30],
          ["celtic_great_cu_sith", 10],
          ["celtic_dread_kelpie", 4],
          ["celtic_battle_banshee", 3]
        ],
        commander: arcCommander(H3["celtic_tadhg"], "gate6"),
        reward: { resources: { gold: 1500 }, artifactIds: ["spear_of_lugh"] },
        battlefield: "ridge_pass"
      }
    },
    horn: { name: "Belling Stone", description: "The stone where the stags bell the turning of the year.", confirm: "Sound the belling stone? This completes The Stags\u2019 Wood." },
    band: { id: "celtic_bronze_cairns", name: "Bronze Cairn-men", army: [["bronze_golem", 6]] },
    objectives: {
      approach: "Into the deep wood",
      refuge: "Break the grove jailers",
      claim: "Accept the stags\u2019 covenant",
      claimDescription: "Accept the stags\u2019 covenant in the journal. It can then be assigned to Coill Dubh.",
      elite: "Stag spirits in the war-band",
      gate: "Tadhg the Grey at the gate",
      horn: "Sound the belling stone",
      event: "The white fawn (optional)"
    },
    scenes: (ids) => [
      { id: "m06_freed", trigger: { type: "site_cleared", siteId: ids.refuge }, lines: [ORLA("The iron is off. They will not follow us for that \u2014 stags follow covenants, not favours."), CATHAL("Then make them one, Orla. They are waiting.")] },
      { id: "m06_tadhg", trigger: { type: "battle_started", siteId: ids.gate }, lines: [DUBHGHALL("Tadhg was the greatest of the fian once. Now he is mine. So is everything that grows old enough.")] },
      { id: "m06_gate", trigger: { type: "objective_completed", objectiveId: ids.gateObjective }, lines: [SADB("Tadhg is down. He thanked me, Orla, at the end."), ORLA("Then he is free too.")] }
    ]
  });
  const m7 = finaleMission(ctx, {
    name: "The Door of the Mound",
    summary: "The Withered King holds the broken silver branch in his hall inside the great mound. Cross the barrow-hills, use the summer stone and the winter stone to open the door, defeat Dubhghall and decide what becomes of the silver branch.",
    newDecisions: ["Two stones, one door", "The Withered King", "The last choice"],
    briefing: [
      ORLA("The great mound. Every door to the Otherworld opened from here once \u2014 at Samhain and at Beltane. The Withered King has made it his hall, and he keeps the broken branch inside."),
      CATHAL("The summer stone and the winter stone open the door, one on each side of the barrow-road. Ciar the warden walks between them."),
      DUBHGHALL("Come in, druid. The dark half is long, and I have room for you in it.")
    ],
    victory: [ORLA("The year has turned. I felt it \u2014 like a door swinging open in a warm wind.")],
    town: { townId: "dun_brugh", name: "D\xFAn Brugh", description: "The last fort before the barrow-hills." },
    biome: "storm_plateau",
    soundscape: "storm_plateau",
    north: {
      name: "Northern Barrow-road",
      description: "The northern way into the barrow-hills.",
      guard: {
        label: "Barrow guard",
        army: [
          ["celtic_elder_pooka", 30],
          ["celtic_great_cu_sith", 6]
        ],
        reward: { resources: { gold: 1e3 } },
        battlefield: "ridge_pass"
      }
    },
    south: {
      name: "Southern Barrow-road",
      description: "The southern way, where two bound stags stand guard against their will.",
      guard: {
        label: "Bound stags",
        army: [
          ["celtic_horned_stag_spirit", 2],
          ["celtic_elder_pooka", 12]
        ],
        reward: { resources: { gold: 1e3 } },
        battlefield: "ridge_pass"
      }
    },
    stones: { north: { name: "Summer Stone", description: "The stone of the bright half of the year." }, south: { name: "Winter Stone", description: "The stone of the dark half of the year." }, cost: { gold: 300, stone: 3 } },
    nest: { name: "Wyvern Tor", description: "Wyverns roost on a tor above the barrow-road.", guard: { label: "Tor wyverns", army: [["wyvern_matriarch", 3]], reward: { resources: { crystal: 6 } }, battlefield: "grove" } },
    gate: { name: "Door of the Mound", description: "The great mound\u2019s door. Both stones must be used to open it." },
    cache: { name: "Grave-goods of the Old Kings", description: "Goods left with the old kings of the barrow-hills.", reward: { resources: { gold: 1500, crystal: 3 } } },
    hall: {
      name: "Hall of the Withered King",
      description: "Dubhghall\u2019s hall inside the great mound, where the dark half of the year is kept.",
      guard: {
        label: "Dubhghall and the barrow court",
        army: [
          ["celtic_dread_kelpie", 2],
          ["celtic_elder_pooka", 20],
          ["celtic_elder_pooka", 20],
          ["celtic_great_cu_sith", 12],
          ["celtic_great_stag_spirit", 2],
          ["celtic_storm_selkie", 2]
        ],
        commander: arcCommander(H3["celtic_dubhghall"], "boss7", ["bramble_snare"]),
        reward: { resources: { gold: 2e3 } },
        battlefield: "beacon_clearing"
      }
    },
    choice: {
      name: "The Silver Branch",
      description: "The broken silver bough, its bells silent.",
      title: "The Silver Branch",
      text: "With the Withered King gone, the two halves of the branch lie before you. Mended, it will open the mounds as it always did \u2014 the Otherworld close, the old folk walking the roads at Samhain and Beltane. Planted, the halves will grow into a new tree; its branches will open the mounds only for those who seek them, and the old folk will grow rarer every year.",
      a: { flag: "branch_mended", label: "Mend the branch", summary: "The mounds open as they always did. Orla gains 500 experience." },
      b: { flag: "branch_planted", label: "Plant the branch", summary: "A new tree, and a quieter Otherworld. Orla gains 500 experience." }
    },
    seal: { name: "Fire of the Year", description: "The fire-pit where the year\u2019s turning is kindled.", confirm: "Kindle the fire of the year? This completes The Silver Branch." },
    patrol: {
      commander: arcCommander(H3["celtic_ciar"], "patrol7"),
      army: [
        ["celtic_elder_pooka", 24],
        ["celtic_great_cu_sith", 8],
        ["celtic_dread_kelpie", 2]
      ]
    },
    objectives: { approach: "Into the barrow-hills", north: "The summer stone", south: "The winter stone", gate: "Open the door of the mound", boss: "The Withered King", choice: "The silver branch", seal: "Kindle the fire of the year" },
    scenes: (ids) => [
      { id: "m07_gate", trigger: { type: "objective_completed", objectiveId: ids.gate }, lines: [SADB("The door is open. I can smell apple blossom from inside \u2014 in this cold.")] },
      { id: "m07_dubhghall", trigger: { type: "battle_started", siteId: ids.hall }, lines: [DUBHGHALL("Every summer ends, druid. I only made sure of it."), ORLA("And every winter ends. I am here to make sure of that.")] },
      { id: "m07_fallen", trigger: { type: "objective_completed", objectiveId: ids.boss }, lines: [ORLA("He is gone. The branch is here, in two halves. One last thing to decide.")] }
    ]
  });
  const built = [m1, m2, m3, m4, m5, m6, m7];
  const missions = built.map((b) => b.mission);
  return {
    templates: built.map((b) => b.template),
    missions,
    entitlements: arcEntitlements(ctx, { t3: "Kelpie Covenant", t6: "Stag Covenant" }, { t3: "The keeper\u2019s covenant allows a Kelpie loch to be kept in one fort.", t6: "The freed stags allow a Stag grove to be kept in one fort." }),
    campaign: arcCampaign(
      ctx,
      {
        name: "The Silver Branch",
        tagline: "Kindle. Ride. Turn the year.",
        summary: "The silver branch that opens the mounds has been broken, and the year has stuck in its dark half. Lead the druid Orla through seven linked missions \u2014 from the cold Beltane of D\xFAn Caill to the door of the great mound \u2014 to turn the year and face the Withered King.",
        startingGodNote: "The Dagda is the fixed patron of this campaign. The Morr\xEDgan or Brigid comes in Mission 3; a second god (Cernunnos, Epona or Lugh) in Mission 5.",
        epilogue: [
          SADB("The cattle went out to the summer grazing this morning. Late \u2014 but they went."),
          CATHAL("A boar with iron bristles, a loch of water-horses, a hall under the sea, a usurper and a wood full of stags. The bards will be at it for a hundred years.")
        ],
        endings: [
          { flag: "branch_mended", lines: [ORLA("The mounds are open. Last night three of the old folk came to the fort gate and asked for milk. We gave it to them."), SADB("We always did, before. It is good to have them back.")] },
          { flag: "branch_planted", lines: [ORLA("The new tree is already taller than me. Its branches open the mounds for those who look for them \u2014 fewer every year."), CATHAL("A quieter world. Maybe the old folk wanted the rest.")] }
        ]
      },
      missions
    )
  };
}

// ../pantheon_realms/packages/content/src/campaign/newFire.ts
var P6 = "mesoamerican";
var ITZEL = speaker(P6, "Itzel");
var CHIMAL = speaker(P6, "Chimal");
var XOCO = speaker(P6, "Grandmother Xoco", "xoco");
var ITZTLI = speaker(P6, "Itztli");
var TECUANI = speaker(P6, "Tecuani");
var NEW_FIRE_HEROES = [
  arcHero(P6, "mesoamerican_itzel", "Itzel", "Day-Keeper of Xochitla", "day_keeper", "A day-keeper who counts the calendar and knows which fire belongs to which day. The hero of The New Fire.", "campaign"),
  arcHero(P6, "mesoamerican_itztli", "Itztli", "The Night-Knife", "day_keeper", "An obsidian priest who wants the age to end in darkness so that the next one will be his. Final opponent of The New Fire.", "enemy"),
  arcHero(P6, "mesoamerican_tecuani", "Tecuani", "Lord of Itzcalli", "tlatoani", "A city lord who swore to the Night-Knife in exchange for the next age\u2019s throne. Rival empire in The New Fire, mission 5.", "enemy"),
  arcHero(P6, "mesoamerican_acatl", "Acatl", "Captain of the Lake Canoes", "jaguar_knight", "A canoe captain who raids the lake towns in the Night-Knife\u2019s name. Patrol in The New Fire, mission 4.", "enemy"),
  arcHero(P6, "mesoamerican_mazatl", "Mazatl", "Keeper of the Fire Mountain", "jaguar_knight", "The Night-Knife\u2019s champion, who holds the fire mountain. The New Fire, mission 6.", "enemy"),
  arcHero(P6, "mesoamerican_tlacatl", "Tlacatl", "Warden of the Smoking Gate", "jaguar_knight", "Keeper of the road between the morning-star stone and the evening-star stone. Patrol in The New Fire, mission 7.", "enemy")
];
var H4 = Object.fromEntries(NEW_FIRE_HEROES.map((h) => [h.id, h]));
function buildNewFire(names, familyOf2) {
  const ctx = {
    id: "new_fire",
    pantheonId: P6,
    archetypeId: "mesoamerican_city",
    hero: { heroId: "itzel", definitionId: "mesoamerican_itzel", classId: "day_keeper", name: "Itzel" },
    gods: { patron: "mesoamerican_quetzalcoatl", first: ["mesoamerican_huitzilopochtli", "mesoamerican_coatlicue"], second: ["mesoamerican_tlaloc", "mesoamerican_tezcatlipoca", "mesoamerican_xiuhtecuhtli"] },
    t: [
      { base: "", up: "" },
      { base: "mesoamerican_feathered_serpent", up: "mesoamerican_celestial_feathered_serpent" },
      { base: "mesoamerican_jaguar_spirit", up: "mesoamerican_sun_jaguar" },
      { base: "mesoamerican_eagle_warrior_spirit", up: "mesoamerican_solar_eagle_warrior" },
      { base: "mesoamerican_cenote_crocodile", up: "mesoamerican_temple_crocodile" },
      { base: "mesoamerican_camazotz", up: "mesoamerican_blood_moon_camazotz" },
      { base: "mesoamerican_xiuhcoatl", up: "mesoamerican_divine_xiuhcoatl" },
      { base: "mesoamerican_stone_colossus", up: "mesoamerican_sun_colossus" }
    ],
    covenantT3: "mesoamerican_eagle_warrior_spirit",
    covenantT6: "mesoamerican_xiuhcoatl",
    covenantT7: "mesoamerican_stone_colossus",
    hostName: "The Night-Knife\u2019s Host",
    hiringReason: "Itzel carries the fire with her own war-band. Hero hiring is disabled in The New Fire.",
    debriefPolicy: [
      "Itzel keeps her level, experience (up to the displayed cap), skills, spellbook, spells and equipment.",
      "Quetzalcoatl and every god she has committed to carry into the next mission.",
      "Troops, resources, cities, mines and recruitment pools stay behind to keep the fires.",
      "The next mission begins with its declared war-band and treasury."
    ],
    seed: 44e4,
    names,
    familyOf: familyOf2
  };
  const m1 = restoreMission(ctx, {
    name: "The Cold Altar",
    summary: "On the night the years are bound, the new fire was never lit \u2014 someone put out the old one first. Raise a war-band of feathered serpents in Xochitla, clear the canoe ford and kindle the fire on the hill altar.",
    newDecisions: ["Recruit and train", "Offering", "Learn spells at the Mage Guild", "A one-time choice"],
    briefing: [
      XOCO("Fifty-two years, and the night came to bind them. We broke the old pots, put out every hearth and waited for the fire from the hill. It never came."),
      ITZEL("Then the fire-drill never turned. Someone stopped the priests before the new fire could be drilled. The hill altar is where it starts."),
      CHIMAL("Men in black paint hold the hill. And the canoe ford is full of peccaries gone mad with hunger. I will carry the shield, day-keeper.")
    ],
    victory: [ITZEL("The new fire burns on the hill, and the runners are carrying it to the hearths. But only here. The sun was paler again this morning.")],
    town: { townId: "xochitla", name: "Xochitla", description: "Itzel\u2019s city of flower terraces on the lake shore." },
    biome: "jungle",
    soundscape: "jungle",
    barrier: "water",
    event: {
      name: "Broken Fire-shrine",
      description: "A small fire-shrine whose brazier has been kicked over.",
      title: "The Broken Fire-shrine",
      text: "The brazier lies in the mud and the copal has burned to nothing. Around it, four small feathered serpents coil in the ashes, as if waiting to be told where the fire went.",
      options: [
        { label: "Take the shrine\u2019s jade and cacao", summary: "+600 Gold and +4 Wood.", reward: { resources: { gold: 600, wood: 4 } } },
        { label: "Call the serpents with the fire-song", summary: "4 Feathered Serpents join Itzel\u2019s war-band.", reward: { creatures: [{ creatureId: "mesoamerican_feathered_serpent", count: 4 }] } }
      ]
    },
    camp: { name: "Jaguar Thicket", description: "Jaguar spirits that will hunt for whoever keeps the right day.", creatureId: "mesoamerican_jaguar_spirit" },
    crossing: {
      name: "Canoe Ford",
      description: "The ford to the hill road. A herd of wild pigs, mad with hunger, holds it.",
      guard: { label: "Ford pigs", army: [["wild_boar", 8]], reward: { resources: { gold: 300, wood: 3, stone: 3 } }, battlefield: "coast_road" }
    },
    cache: { name: "Abandoned Market Stall", description: "A stall abandoned when the fires went out.", reward: { resources: { gold: 400, crystal: 1 } } },
    monument: {
      name: "Altar of the Hill",
      description: "The hilltop altar where the new fire is drilled. Men in black paint guard it.",
      guard: {
        label: "Black-painted cultists",
        army: [
          ["brigand", 14],
          ["brigand_cutthroat", 4]
        ],
        reward: { resources: { gold: 500 }, artifactIds: ["quetzal_war_crown"] },
        battlefield: "beacon_clearing"
      },
      confirm: "Drill the new fire on the Altar of the Hill? This completes The Cold Altar."
    },
    objectives: { recruit: "Call the feathered serpents", train: "Give them sky-feathers", crossing: "Clear the canoe ford", guard: "Drive off the cultists", activate: "Drill the new fire", event: "The broken fire-shrine (optional)" },
    scenes: (ids) => [
      { id: "m01_ford", trigger: { type: "site_cleared", siteId: ids.crossing }, lines: [CHIMAL("Someone penned those pigs in the ford and starved them. Cruel, and on purpose."), ITZEL("Then someone wanted the hill kept clear. The altar, then.")] },
      { id: "m01_altar_battle", trigger: { type: "battle_started", siteId: ids.monument }, lines: [ITZTLI("Little day-keeper. The count is finished. No new fire, no new years. Let the sun go out like a tired hearth."), ITZEL("I have not finished counting.")] },
      { id: "m01_crown", trigger: { type: "site_cleared", siteId: ids.monument }, lines: [XOCO("Their leader wore this \u2014 the quetzal crown from the temple of Xochitla. It was stolen at the binding."), ITZEL("A temple crown on a cultist. Whoever pays them has walked in our temples.")] },
      { id: "m01_losses", trigger: { type: "casualties", minLost: 4 }, lines: [XOCO("We counted our dead today, Itzel. The count is longer than I like."), ITZEL("Then I will count more carefully.")] }
    ],
    help: [{ id: "offering", title: "Offering", text: "The Mesoamerican signature: once per week in each city with a Temple, creatures from the garrison or the visiting hero can be offered for Favor." }]
  });
  const m2 = huntMission(ctx, {
    name: "The Black Jaguars",
    summary: "A pack of black jaguar spirits, loosed by the Night-Knife, hunts the cacao groves of Tepeyolo and guards the altar of the morning star. Raise jaguars of your own, cross the river, hunt the pack down and relight the altar.",
    newDecisions: ["Hunt a wandering pack", "Use a lookout", "Buy or bargain on the road"],
    briefing: [
      CHIMAL("Tepeyolo\u2019s cacao pickers will not go into the groves. Black jaguars \u2014 not the spotted kind \u2014 and they do not eat what they kill."),
      ITZEL("The altar of the morning star is beyond the groves. If the morning star has no fire, the sun has no herald."),
      XOCO("Jaguars of our own, then. Build them a house, child. Jaguars respect their own kind.")
    ],
    victory: [XOCO("Two altars lit. The old eagle knights say the next fire belongs to the House of Eagles in the mountains \u2014 and that the eagles have stopped flying.")],
    town: { townId: "tepeyolo", name: "Tepeyolo", description: "A cacao town in the river valley." },
    biome: "jungle",
    soundscape: "jungle",
    barrier: "water",
    lookout: { name: "Watcher\u2019s Pyramid", description: "From its top, the groves beyond the river lie open." },
    event: {
      name: "A Jade-cutter\u2019s Workshop",
      description: "A jade-cutter who has worked the same stone for a year.",
      title: "The Jade-cutter",
      text: "\u201CA ring for the rain god\u2019s favour,\u201D the jade-cutter says, holding it up to the light. \u201CA year of my life. You may buy it. Or sit with me while I work, and I will tell you what the jaguars are for.\u201D",
      options: [
        { label: "Buy the jade ring", summary: "Pay 2,000 Gold for the Jade Ring of Tlaloc.", cost: { gold: 2e3 }, reward: { artifactIds: ["jade_ring_of_tlaloc"] } },
        { label: "Sit and listen", summary: "Itzel gains +1 Knowledge.", reward: { attributes: { knowledge: 1 } } }
      ]
    },
    camp: { name: "Spotted Thicket", description: "Jaguar spirits that have not joined the black pack.", creatureId: "mesoamerican_jaguar_spirit" },
    bridge: {
      name: "Rope Ferry",
      description: "The rope ferry over the river, held by cultists.",
      guard: {
        label: "Ferry cultists",
        army: [
          ["brigand", 16],
          ["brigand_cutthroat", 6]
        ],
        reward: { resources: { gold: 600, favor: 3 } },
        battlefield: "coast_road"
      }
    },
    lair: {
      name: "Jaguar Den",
      description: "A den under a ceiba tree, where something green glints among the bones.",
      guard: {
        label: "Den jaguars",
        army: [
          ["mesoamerican_sun_jaguar", 4],
          ["mesoamerican_jaguar_spirit", 6]
        ],
        reward: { resources: { gold: 500 }, artifactIds: ["jade_pectoral"] },
        battlefield: "grove"
      }
    },
    stone: { name: "Altar of the Morning Star", description: "The altar where the herald of the sun is greeted.", confirm: "Relight the Altar of the Morning Star? This completes The Black Jaguars." },
    prey: {
      id: "mesoamerican_black_jaguars",
      name: "The Black Jaguars",
      portraitAssetId: "creature.mesoamerican.tier2.upgraded.portrait",
      army: [
        ["mesoamerican_sun_jaguar", 6],
        ["mesoamerican_jaguar_spirit", 12]
      ],
      bounty: { gold: 800 }
    },
    objectives: {
      recruit: "Jaguars of our own",
      lookout: "Climb the watcher\u2019s pyramid",
      bridge: "Take the rope ferry",
      prey: "Hunt the black jaguars",
      preyHint: "The pack roams the groves beyond the river and only attacks a war-band it is sure it can beat. Move onto it to fight.",
      activate: "Relight the morning star",
      lair: "The jaguar den (optional)",
      event: "The jade-cutter (optional)"
    },
    scenes: (ids) => [
      { id: "m02_pyramid", trigger: { type: "site_visited", siteId: ids.lookout }, lines: [ITZEL("There \u2014 the groves are trampled in a ring around the altar. They are guarding it."), CHIMAL("Then it still matters to someone. Good.")] },
      { id: "m02_pack_battle", trigger: { type: "battle_started", heroDefinitionId: ids.prey }, lines: [ITZTLI("Hunt her, my black ones. Night belongs to jaguars.")] },
      { id: "m02_pack_broken", trigger: { type: "objective_completed", objectiveId: ids.preyObjective }, lines: [CHIMAL("The pack is broken. The last of them ran for the hills."), ITZEL("Let them. Without the Night-Knife\u2019s voice they are only cats.")] }
    ]
  });
  const m3 = covenantMission(ctx, {
    name: "The House of Eagles",
    summary: "The eagle warriors of Ocelotepec have stopped flying. Break the cultists on the mountain road, free the crocodiles\u2019 cenote from the stone jailers, win the eagle covenant \u2014 by the elders\u2019 price or by force \u2014 and take a god for the dark road ahead.",
    newDecisions: ["A covenant: pay or fight", "Your first minor god", "Elite troops in the army"],
    briefing: [
      CHIMAL("The eagle warriors fly for whoever keeps the covenant of the House of Eagles. For a month they have only perched."),
      ITZEL("A covenant can be kept, sold or stolen. If they do not fly for us, someone else holds it."),
      XOCO("And the crocodiles of the sacred cenote have sunk to the bottom. A cenote without its guardians is only a hole.")
    ],
    victory: [ITZEL("The covenant holds, a god walks with us and the mountain fire burns. From here the road goes down to the great lake.")],
    town: { townId: "ocelotepec", name: "Ocelotepec", description: "A mountain city under the House of Eagles." },
    biome: "high_pass",
    soundscape: "jungle",
    cache: { name: "Merchants\u2019 Cache", description: "Goods hidden by merchants who fled the mountain road.", reward: { resources: { gold: 700, wood: 5 }, artifactIds: ["quilted_cotton_armor"] } },
    pass: {
      name: "Mountain Road",
      description: "The only road up the mountain, held by cultists.",
      guard: {
        label: "Mountain cultists",
        army: [
          ["brigand", 16],
          ["brigand_cutthroat", 6]
        ],
        reward: { resources: { gold: 750, favor: 5 } },
        battlefield: "ridge_pass"
      }
    },
    roost: {
      name: "Sacred Cenote",
      description: "The crocodiles\u2019 cenote. Stone serpent-heads that walk stand around it like jailers.",
      guard: { label: "Stone jailers", army: [["clay_golem", 5]], reward: { resources: { favor: 5 }, artifactIds: ["jaguar_pelt_cape"] }, battlefield: "ridge_pass" }
    },
    hearth: {
      name: "The Eagle Elders",
      description: "Three old eagle knights sit at the foot of the House of Eagles.",
      title: "The Eagle Elders",
      text: "\u201COur covenant was traded,\u201D the eldest says, \u201Cby a young captain, for an obsidian knife that sings. He is gone; the covenant is with the Night-Knife now. Buy it back at the price it fetched, and the eagles will fly for you. Or climb to the House and take it from the warriors there. They miss the sky.\u201D",
      price: { gold: 1500, wood: 10 },
      payLabel: "Pay the elders\u2019 price",
      refuseLabel: "Refuse \u2014 take it at the House of Eagles"
    },
    home: {
      name: "House of Eagles",
      description: "The eagle knights\u2019 house, where the traded covenant hangs.",
      guard: {
        label: "Perched eagle warriors",
        army: [
          ["mesoamerican_eagle_warrior_spirit", 4],
          ["mesoamerican_solar_eagle_warrior", 1]
        ],
        reward: { resources: { gold: 1e3 } },
        battlefield: "grove"
      }
    },
    bridge: {
      name: "Hanging Bridge",
      description: "A hanging bridge over the gorge, held by cultists and wild pigs.",
      guard: {
        label: "Gorge cultists",
        army: [
          ["brigand_cutthroat", 12],
          ["tusked_boar", 4]
        ],
        reward: { resources: { gold: 800 } },
        battlefield: "ridge_pass"
      }
    },
    stone: { name: "Mountain Fire Altar", description: "The altar where the fire is passed from mountain to mountain.", confirm: "Kindle the mountain fire? This completes The House of Eagles." },
    band: { id: "mesoamerican_gorge_pigs", name: "Gorge Pigs", army: [["wild_boar", 6]] },
    objectives: {
      pass: "Take the mountain road",
      roost: "Free the sacred cenote",
      covenant: "The eagle covenant",
      covenantDescription: "Win the eagle covenant: pay the elders\u2019 price, or beat the perched warriors at the House of Eagles.",
      god: "A god for the dark road",
      elite: "Temple crocodiles in the war-band",
      activate: "Kindle the mountain fire",
      cache: "The merchants\u2019 cache (optional)"
    },
    scenes: (ids) => [
      { id: "m03_cenote", trigger: { type: "site_cleared", siteId: ids.roost }, lines: [XOCO("The crocodiles are rising. They will remember the hands that broke the stone."), ITZEL("Good. I want them to.")] },
      { id: "m03_house", trigger: { type: "site_cleared", siteId: ids.home }, lines: [CHIMAL("The knife the young captain got \u2014 it is here, on the wall. Obsidian, and it hums."), ITZEL("The Night-Knife pays in his own glass. I will remember the sound.")] },
      { id: "m03_god", trigger: { type: "objective_completed", objectiveId: ids.god }, lines: [ITZEL("A god walks with us. Whatever wants the sun to end, it will not meet us alone.")] }
    ]
  });
  const m4 = seekMission(ctx, {
    name: "The House of Bats",
    summary: "The House of Bats stands on an island in the great lake, behind a smoke that came with the raiders\u2019 canoes. Raise camazotz of your own, take the landing, light both lake altars to clear the smoke and ask the bats where the Night-Knife keeps the stolen fire.",
    newDecisions: ["Light two fires to open a way", "A commanded patrol", "Bat-spirits"],
    briefing: [
      ITZEL("The bats see everything that moves at night. If the Night-Knife carried the old fire away, the bats watched him go."),
      CHIMAL("A smoke has lain on the lake since the canoe raiders came. Their captain, Acatl, walks the islands."),
      XOCO("The two lake altars burn through any smoke \u2014 the old priests built them so. Light both and the lake must clear.")
    ],
    victory: [ITZEL("The bats saw him: the Night-Knife, carrying the old fire into the smoking mountain in the east. And a city lord at Itzcalli holds the road for him.")],
    town: { townId: "acalco", name: "Acalco", description: "A canoe-builders\u2019 town on the great lake." },
    biome: "jungle",
    soundscape: "jungle",
    wanderer: {
      name: "A Travelling Merchant",
      description: "A long-distance merchant resting on the shore with his bearers.",
      title: "The Long-road Merchant",
      text: "\u201CI carry news as well as feathers,\u201D the merchant says. \u201CYou are going to the bats. Go at noon \u2014 they sleep then.\u201D He unrolls a painted book. \u201CA codex of the sun\u2019s count. Take it. Or sit, and I will tell you what the bats told me.\u201D",
      options: [
        { label: "Take the codex", summary: "The Sun-stone Codex joins Itzel\u2019s backpack.", reward: { artifactIds: ["sun_stone_codex"] } },
        { label: "Sit and listen", summary: "Itzel gains +1 Spell Power and +1 Knowledge.", reward: { attributes: { power: 1, knowledge: 1 } } }
      ]
    },
    wreck: { name: "Overturned Canoe", description: "A cargo canoe overturned in the reeds; its bundles are dry.", reward: { resources: { gold: 900, wood: 4 } } },
    landing: {
      name: "Island Landing",
      description: "The landing on the near island, held by canoe raiders.",
      guard: {
        label: "Canoe raiders",
        army: [
          ["brigand", 36],
          ["brigand_cutthroat", 14]
        ],
        reward: { resources: { gold: 800, favor: 3 } },
        battlefield: "coast_road"
      }
    },
    omen: {
      name: "The Raiders\u2019 War-canoe",
      description: "A war-canoe of the raiders, pulled up on the island.",
      title: "The War-canoe",
      text: "The canoe is loaded with plunder from every lake town \u2014 and a cage of golden jaguars the raiders took from a temple and never dared to open.",
      options: [
        { label: "Take the plunder", summary: "+800 Gold and +2 Crystal.", reward: { resources: { gold: 800, crystal: 2 } } },
        { label: "Open the cage", summary: "6 Sun Jaguars join Itzel\u2019s war-band.", reward: { creatures: [{ creatureId: "mesoamerican_sun_jaguar", count: 6 }] } }
      ]
    },
    relays: { north: { name: "North Lake Altar", description: "A fire altar on the northern island." }, south: { name: "South Lake Altar", description: "A fire altar on the southern island." }, cost: { gold: 250, stone: 3 } },
    nest: { name: "Giants\u2019 Cave", description: "Two giants of the old age, who never died with it, live in a lake cave.", guard: { label: "Old-age giants", army: [["ogre", 2]], reward: { resources: { crystal: 5 } }, battlefield: "grove" } },
    gate: { name: "The Lake Smoke", description: "A wall of smoke over the lake. Both altars must burn to clear it." },
    goal: {
      name: "House of Bats",
      description: "A dark house on the far island, where the bat-spirits hang.",
      guard: {
        label: "House bats",
        army: [
          ["mesoamerican_camazotz", 4],
          ["mesoamerican_blood_moon_camazotz", 2]
        ],
        reward: { resources: { gold: 1e3 } },
        battlefield: "coast_road"
      },
      reward: { questXp: 2200, artifactIds: ["obsidian_macuahuitl"] },
      confirm: "Ask the bats what they saw? This completes The House of Bats."
    },
    patrol: {
      commander: arcCommander(H4["mesoamerican_acatl"], "patrol4"),
      army: [
        ["mesoamerican_celestial_feathered_serpent", 16],
        ["mesoamerican_sun_jaguar", 6]
      ]
    },
    objectives: { recruit: "Bat-spirits of our own", landing: "Take the island landing", north: "The north lake altar", south: "The south lake altar", gate: "Clear the lake smoke", goal: "Ask the bats", nest: "The giants\u2019 cave (optional)", wanderer: "The long-road merchant (optional)" },
    scenes: (ids) => [
      { id: "m04_landing", trigger: { type: "site_cleared", siteId: ids.landing }, lines: [CHIMAL("Their paddles were obsidian. Every one of them."), ITZEL("Then Acatl is close. Keep the war-band together.")] },
      { id: "m04_smoke", trigger: { type: "objective_completed", objectiveId: ids.gate }, lines: [XOCO("The smoke is lifting off the water like mist at sunrise. The old priests knew their work.")] },
      { id: "m04_bats", trigger: { type: "battle_started", siteId: ids.goal }, lines: [ITZTLI("Ask the bats, day-keeper. They will tell you the night is longer than the day. It always was.")] }
    ]
  });
  const m5 = rivalMission(ctx, {
    name: "The Lord of Itzcalli",
    summary: "Tecuani, lord of Itzcalli, swore to the Night-Knife for the throne of the next age, and holds the road east. Cross the river, take a second god, besiege his city and break the stela of his oath.",
    newDecisions: ["A rival empire", "A second minor god", "A siege"],
    briefing: [
      XOCO("Tecuani was a good lord once. When the fire went out, the Night-Knife promised him the throne of the next age, and he believed it."),
      ITZEL("The oath-stela in his city binds him to the Night-Knife \u2014 and binds the road east to both of them. It has to fall."),
      TECUANI("Go back to your counting, day-keeper. Every age ends. I only want to be standing when the next one begins.")
    ],
    victory: [ITZEL("The stela is broken and the road east is open. Tecuani has nothing left but the Night-Knife\u2019s promise \u2014 and so do we, except that we know where the fire is.")],
    town: { townId: "tonalco", name: "Tonalco", description: "A river city on the road east, loyal to the old count." },
    biome: "jungle",
    soundscape: "jungle",
    gold: { name: "Gold Mine", description: "An unowned mine.", guard: { label: "Mine pigs", army: [["tusked_boar", 10]], reward: { resources: { gold: 500 } }, battlefield: "open_field" } },
    event: {
      name: "The Rain Pool",
      description: "A pool where frogs sing the rain in.",
      title: "The Rain Pool",
      text: "The frogs sing for the rain god here. On a stone at the edge lie jade beads someone left in thanks \u2014 or you could sit and learn the song yourself.",
      options: [
        { label: "Take the jade", summary: "+1,500 Gold.", reward: { resources: { gold: 1500 } } },
        { label: "Learn the rain song", summary: "Itzel gains +1 Defense and +1 Knowledge.", reward: { attributes: { defense: 1, knowledge: 1 } } }
      ]
    },
    north: { name: "Stone Ford", description: "The northern ford, held by stone jailers on Tecuani\u2019s orders.", guard: { label: "Ford stones", army: [["clay_golem", 8]], reward: { resources: { gold: 800 } }, battlefield: "coast_road" } },
    south: {
      name: "Cultist Ford",
      description: "The southern ford, held by black-painted cultists.",
      guard: {
        label: "Ford cultists",
        army: [
          ["brigand", 24],
          ["brigand_cutthroat", 10]
        ],
        reward: { resources: { gold: 800 } },
        battlefield: "coast_road"
      }
    },
    stele: { name: "Oath Stela", description: "The stela of Tecuani\u2019s oath to the Night-Knife.", confirm: "Break the Oath Stela? This completes The Lord of Itzcalli." },
    rival: {
      playerId: "itzcalli",
      townId: "itzcalli",
      townName: "Itzcalli",
      townDescription: "Tecuani\u2019s city, its walls inlaid with obsidian.",
      color: "#3f3550",
      hero: { heroId: "tecuani", definitionId: "mesoamerican_tecuani", classId: "tlatoani", name: "Tecuani" },
      army: [
        ["mesoamerican_celestial_feathered_serpent", 26],
        ["mesoamerican_sun_jaguar", 10],
        ["mesoamerican_cenote_crocodile", 3]
      ],
      garrison: [
        ["mesoamerican_celestial_feathered_serpent", 24],
        ["mesoamerican_sun_jaguar", 8],
        ["mesoamerican_cenote_crocodile", 2]
      ],
      reward: { artifactIds: ["boots_of_the_long_road"] }
    },
    objectives: { crossing: "Cross the river", god: "A second god", town: "Take Itzcalli", stele: "Break the oath stela", rival: "Defeat Tecuani (optional)", event: "The rain pool (optional)" },
    scenes: (ids) => [
      { id: "m05_crossed", trigger: { type: "objective_completed", objectiveId: ids.crossing }, lines: [CHIMAL("We are over. His runners will be in Itzcalli by tonight."), ITZEL("Let them run. He should hear it from his own people.")] },
      { id: "m05_tecuani", trigger: { type: "battle_started", heroDefinitionId: ids.rival }, lines: [TECUANI("Every age ends in fire or flood. Why not end this one with a bargain?"), ITZEL("Because it is not yours to end.")] },
      { id: "m05_taken", trigger: { type: "objective_completed", objectiveId: ids.town }, lines: [ITZEL("Itzcalli is ours. Now the stela.")] }
    ]
  });
  const m6 = refugeMission(ctx, {
    name: "The Fire Mountain",
    summary: "The fire serpents, whose coils carry flame across the sky, are chained in the crater of the fire mountain. Break the jailers, accept the serpents\u2019 covenant, raise fire serpents of your own and defeat Mazatl at the crater gate.",
    newDecisions: ["Claim a covenant from the journal", "Fire serpents in the war-band", "A gate champion"],
    briefing: [
      CHIMAL("The turquoise fire serpents carry the flame across the sky. Since the binding night they have not been seen."),
      ITZEL("The Night-Knife has chained them in the crater of the fire mountain. Free them, and the sky can carry fire again."),
      XOCO("His champion holds the crater gate. Mazatl. He was a temple guard of Xochitla, child. I knew his mother.")
    ],
    victory: [ITZEL("The serpents fly. Tonight, from the crater rim, I saw the smoking mountain in the east \u2014 and the morning-star stone and the evening-star stone on either side of its gate.")],
    town: { townId: "quetzaltepec", name: "Quetzaltepec", description: "A city on the slopes of the fire mountain." },
    biome: "high_pass",
    soundscape: "jungle",
    north: {
      name: "Stone Steps",
      description: "The northern steps to the crater, held by stone jailers.",
      guard: {
        label: "Step jailers",
        army: [
          ["clay_golem", 8],
          ["bronze_golem", 2]
        ],
        reward: { resources: { gold: 1e3 } },
        battlefield: "ridge_pass"
      }
    },
    south: {
      name: "Cultist Stair",
      description: "The southern stair, held by cultists and wild pigs.",
      guard: {
        label: "Stair cultists",
        army: [
          ["brigand_cutthroat", 24],
          ["tusked_boar", 6]
        ],
        reward: { resources: { gold: 1e3 } },
        battlefield: "ridge_pass"
      }
    },
    event: {
      name: "A Turquoise Hatchling",
      description: "A fire-serpent hatchling caught in an obsidian snare.",
      title: "The Hatchling",
      text: "The hatchling glows like a coal. Freed, it will fly to its mother. Or the snare itself \u2014 singing obsidian \u2014 can be melted in a fire and its song read.",
      options: [
        { label: "Free the hatchling", summary: "+2 Crystal and +10 Favor.", reward: { resources: { crystal: 2, favor: 10 } } },
        { label: "Read the snare\u2019s song", summary: "Itzel gains 1,000 experience.", reward: { questXp: 1e3 } }
      ]
    },
    refuge: {
      name: "Crater Chains",
      description: "Where the fire serpents are chained, under the Night-Knife\u2019s jailers.",
      guard: {
        label: "Crater jailers",
        army: [
          ["mesoamerican_celestial_feathered_serpent", 30],
          ["bronze_golem", 3],
          ["mesoamerican_blood_moon_camazotz", 2]
        ],
        reward: { resources: { gold: 1500 } },
        battlefield: "grove"
      }
    },
    nest: { name: "Giants\u2019 Hall", description: "Two chieftains of the old-age giants in a hall of lava stone.", guard: { label: "Giant chieftains", army: [["ogre_chieftain", 2]], reward: { resources: { crystal: 6 } }, battlefield: "grove" } },
    gate: {
      name: "Crater Gate",
      description: "The gate out of the crater, held by Mazatl.",
      guard: {
        label: "Mazatl and the gate guard",
        army: [
          ["mesoamerican_celestial_feathered_serpent", 30],
          ["mesoamerican_sun_jaguar", 10],
          ["mesoamerican_solar_eagle_warrior", 4],
          ["mesoamerican_temple_crocodile", 3]
        ],
        commander: arcCommander(H4["mesoamerican_mazatl"], "gate6"),
        reward: { resources: { gold: 1500 }, artifactIds: ["eagle_chimalli"] },
        battlefield: "ridge_pass"
      }
    },
    horn: { name: "Conch of the Sky", description: "The great conch blown when the serpents rise.", confirm: "Blow the Conch of the Sky? This completes The Fire Mountain." },
    band: { id: "mesoamerican_lava_guardians", name: "Lava Guardians", army: [["bronze_golem", 6]] },
    objectives: {
      approach: "Climb to the crater",
      refuge: "Break the crater jailers",
      claim: "Accept the serpents\u2019 covenant",
      claimDescription: "Accept the fire serpents\u2019 covenant in the journal. It can then be assigned to Quetzaltepec.",
      elite: "Fire serpents in the war-band",
      gate: "Mazatl at the gate",
      horn: "Blow the conch of the sky",
      event: "The hatchling (optional)"
    },
    scenes: (ids) => [
      { id: "m06_freed", trigger: { type: "site_cleared", siteId: ids.refuge }, lines: [ITZEL("The chains are broken. They will not follow us for that \u2014 serpents follow covenants."), CHIMAL("Then make one, day-keeper. They are circling, waiting.")] },
      { id: "m06_mazatl", trigger: { type: "battle_started", siteId: ids.gate }, lines: [ITZTLI("Mazatl guarded your temple once, day-keeper. Now he guards mine. Everything comes to me in the end.")] },
      { id: "m06_gate", trigger: { type: "objective_completed", objectiveId: ids.gateObjective }, lines: [XOCO("Mazatl is down. I will tell his mother he fought well, at the end, and that he was sorry.")] }
    ]
  });
  const m7 = finaleMission(ctx, {
    name: "The Smoking Gate",
    summary: "The Night-Knife keeps the old fire in his obsidian palace inside the smoking mountain. Cross the ash-hills, light the morning-star stone and the evening-star stone to open the gate, defeat Itztli and decide what fire the next years are bound with.",
    newDecisions: ["Two stones, one gate", "The Night-Knife", "The last choice"],
    briefing: [
      ITZEL("The smoking mountain. The old fire of the last binding is inside, in the Night-Knife\u2019s palace. Without it, no new fire can be bound to the years."),
      CHIMAL("The morning-star stone and the evening-star stone open the gate, one on each side of the ash-road. Tlacatl the warden walks between them."),
      ITZTLI("Come in, day-keeper. Count your last day with me.")
    ],
    victory: [ITZEL("The fire is ours. The count goes on.")],
    town: { townId: "tlapallan", name: "Tlapallan", description: "The last city before the ash-hills, where the sun is said to be born." },
    biome: "storm_plateau",
    soundscape: "storm_plateau",
    north: {
      name: "Northern Ash-road",
      description: "The northern way into the ash-hills.",
      guard: {
        label: "Ash-road guard",
        army: [
          ["mesoamerican_celestial_feathered_serpent", 30],
          ["mesoamerican_sun_jaguar", 6]
        ],
        reward: { resources: { gold: 1e3 } },
        battlefield: "ridge_pass"
      }
    },
    south: {
      name: "Southern Ash-road",
      description: "The southern way, where two chained fire serpents stand guard against their will.",
      guard: {
        label: "Chained serpents",
        army: [
          ["mesoamerican_xiuhcoatl", 2],
          ["mesoamerican_celestial_feathered_serpent", 12]
        ],
        reward: { resources: { gold: 1e3 } },
        battlefield: "ridge_pass"
      }
    },
    stones: { north: { name: "Morning-star Stone", description: "The stone of the herald of the sun." }, south: { name: "Evening-star Stone", description: "The stone of the sun\u2019s last light." }, cost: { gold: 300, stone: 3 } },
    nest: { name: "Wyvern Crag", description: "Wyverns roost on a crag above the ash-road.", guard: { label: "Crag wyverns", army: [["wyvern_matriarch", 3]], reward: { resources: { crystal: 6 } }, battlefield: "grove" } },
    gate: { name: "The Smoking Gate", description: "The gate of the smoking mountain. Both stones must burn to open it." },
    cache: { name: "Offerings of the Ages", description: "Offerings left at the mountain at every binding of the years.", reward: { resources: { gold: 1500, crystal: 3 } } },
    hall: {
      name: "Obsidian Palace",
      description: "Itztli\u2019s palace inside the mountain, where the old fire burns black.",
      guard: {
        label: "Itztli and the obsidian court",
        army: [
          ["mesoamerican_solar_eagle_warrior", 2],
          ["mesoamerican_celestial_feathered_serpent", 20],
          ["mesoamerican_celestial_feathered_serpent", 20],
          ["mesoamerican_sun_jaguar", 12],
          ["mesoamerican_divine_xiuhcoatl", 2],
          ["mesoamerican_blood_moon_camazotz", 2]
        ],
        commander: arcCommander(H4["mesoamerican_itztli"], "boss7", ["obsidian_rain"]),
        reward: { resources: { gold: 2e3 } },
        battlefield: "beacon_clearing"
      }
    },
    choice: {
      name: "The Old Fire",
      description: "The old fire of the last binding, burning black in a brazier.",
      title: "The Old Fire",
      text: "With the Night-Knife gone, the old fire is yours. Rekindled, it will bind the years as before: the same sun, the same count, another fifty-two years. Let go, it will burn out, and a new fire drilled from nothing will begin a new age \u2014 a younger sun, a new count, and no one knows what else.",
      a: { flag: "old_sun", label: "Rekindle the old fire", summary: "The same sun, the same count. Itzel gains 500 experience." },
      b: { flag: "new_sun", label: "Drill a new fire", summary: "A new sun and a new count. Itzel gains 500 experience." }
    },
    seal: { name: "Altar of the Binding", description: "The altar where the years are bound.", confirm: "Bind the years at the altar? This completes The New Fire." },
    patrol: {
      commander: arcCommander(H4["mesoamerican_tlacatl"], "patrol7"),
      army: [
        ["mesoamerican_celestial_feathered_serpent", 24],
        ["mesoamerican_sun_jaguar", 8],
        ["mesoamerican_solar_eagle_warrior", 2]
      ]
    },
    objectives: { approach: "Into the ash-hills", north: "The morning-star stone", south: "The evening-star stone", gate: "Open the smoking gate", boss: "The Night-Knife", choice: "The old fire", seal: "Bind the years" },
    scenes: (ids) => [
      { id: "m07_gate", trigger: { type: "objective_completed", objectiveId: ids.gate }, lines: [XOCO("The gate is open. I have counted fifty-two years twice, child, and never stood this close to the beginning.")] },
      { id: "m07_itztli", trigger: { type: "battle_started", siteId: ids.hall }, lines: [ITZTLI("Every age ends, day-keeper. I only chose the day."), ITZEL("The days are not yours to choose. They are only yours to count.")] },
      { id: "m07_fallen", trigger: { type: "objective_completed", objectiveId: ids.boss }, lines: [ITZEL("He is gone. The old fire is still burning. One last thing to decide.")] }
    ]
  });
  const built = [m1, m2, m3, m4, m5, m6, m7];
  const missions = built.map((b) => b.mission);
  return {
    templates: built.map((b) => b.template),
    missions,
    entitlements: arcEntitlements(ctx, { t3: "Eagle Covenant", t6: "Fire Serpent Covenant" }, { t3: "The eagle elders\u2019 covenant allows a House of Eagles to be built in one city.", t6: "The freed fire serpents allow a serpent crater to be kept in one city." }),
    campaign: arcCampaign(
      ctx,
      {
        name: "The New Fire",
        tagline: "Count. Kindle. Bind the years.",
        summary: "The fire that binds the years was put out before it could be renewed, and the sun is fading. Lead the day-keeper Itzel through seven linked missions \u2014 from the cold altar of Xochitla to the smoking gate \u2014 to bind the years again and face the Night-Knife.",
        startingGodNote: "Quetzalcoatl is the fixed patron of this campaign. Huitzilopochtli or Coatlicue comes in Mission 3; a second god (Tlaloc, Tezcatlipoca or Xiuhtecuhtli) in Mission 5.",
        epilogue: [
          XOCO("Every hearth in Xochitla was lit from the hill this morning. The children ran the coals from house to house."),
          CHIMAL("A pack of black jaguars, a house of eagles, a lake of bats, a lord of glass and a mountain of fire serpents. I carried the shield the whole way.")
        ],
        endings: [
          { flag: "old_sun", lines: [ITZEL("The old fire burns again. The same sun, the same count \u2014 fifty-two more years before anyone has to worry."), XOCO("And I will be here to break the pots, child, if I live that long.")] },
          { flag: "new_sun", lines: [ITZEL("A new fire, a new sun. It rose this morning younger and whiter than the old one. The count begins at one."), CHIMAL("A new age. I wonder what it will be like."), ITZEL("So do I. That is the best part.")] }
        ]
      },
      missions
    )
  };
}

// ../pantheon_realms/packages/content/src/campaign/arcCampaigns.ts
var ARC_CAMPAIGN_HEROES = [...TWELFTH_HOUR_HEROES, ...LANTERN_ROAD_HEROES, ...SILVER_BRANCH_HEROES, ...NEW_FIRE_HEROES];
function buildArcCampaigns(names, familyOf2) {
  const built = [buildTwelfthHour(names, familyOf2), buildLanternRoad(names, familyOf2), buildSilverBranch(names, familyOf2), buildNewFire(names, familyOf2)];
  return {
    templates: built.flatMap((b) => b.templates),
    missions: built.flatMap((b) => b.missions),
    campaigns: built.map((b) => b.campaign),
    entitlements: built.flatMap((b) => b.entitlements)
  };
}

// ../pantheon_realms/packages/content/src/skirmish/maps/frostgate.prmap.json
var frostgate_prmap_default = {
  format: "pantheon-realms-map",
  version: 1,
  name: "Frostgate",
  description: "Two fjord valleys and one pass between them, barred by twin crimson gates. The crimson key lies on the glacier islands of the fjord, reached only by portal \u2014 and guarded.",
  author: "Pantheon Realms",
  width: 52,
  height: 30,
  terrain: "vvvvvvvvvvvvvvwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwvvvvvvvvvvvvvvwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwvvvvvvvvvvvvvwwwpppppppppffwwwpwwwwwwwwpppppppppppwvvvvvvvvvvvvvvwwfpfpppfffffwwrpppwwwwwwwpppppppppppwvvvvvvvvvvvvvwwwfffffffffffwwpppwwwwwwwpppppppppppwvvvvvvvvvvvvvvwwffffffffffppwppppwwwwwwppppppppppppwvvvvvvvvvvvvvwwwffffpfffppppwwrwwwwwwwppppppppprrrwvvvvvvvvvvvvvvwwffffpffffppppwwwwwwwwwppppppppprrrrwvvvvvvvvvvvvvwwwffffpfffppppmmwwwwwwwmppppppppprrrwvvvvvvvvvvvvvvwwffpfrffffppppmwwwwwwwmpppppppppprrpwvvvvvvvvvvvvvwwwppfffffpppppmmwwwwwwmmppppppppppppwvvvvvvvvvvvvvvwwpppffffppppppmmmmmmmmmpprrpfpppppppwvvvvvvvvvvvvvwwwrrffffppppppmmmmmmmmmmpprrrrrrrpppwvvvvvvvvvvvvvvwwprffppffpppppmmmmmmmmmpprrrfppppfpfwvvvvvvvvvvvvvwwwfrppppffppppmmmmmmmmmmpprpffppppffwvvvvvvvvvvvvvvwwfrfppppffpppppppppppppppppffppppfrfwvvvvvvvvvvvvvwwwffppppffprppmmmmmmmmmmppppffpppprfwvvvvvvvvvvvvvvwwfpfppppfrrrppmmmmmmmmmpppppffppffrpwvvvvvvvvvvvvvwwwppprrrrrrrppmmmmmmmmmmppppppffffrrwvvvvvvvvvvvvvvwwpppppppfprrppmmmmmmmmmppppppffffpppwvvvvvvvvvvvvvwwwppppppppppppmmwwwwwwmmpppppfffffppwvvvvvvvvvvvvvvwwprrppppppppppmwwwwwwwmppppffffrfpffwvvvvvvvvvvvvvwwwrrrpppppppppmwwwwwwwmmppppfffpffffwvvvvvvvvvvvvvvwwrrrrpppppppppwwwwwwwwwppppffffpffffwvvvvvvvvvvvvvwwwrrrpppppppppwwwwwwwrwwppppfffpffffwvvvvvvvvvvvvvvwwppppppppppppwwwwwwppppwppffffffffffwvvvvvvvvvvvvvwwwpppppppppppwwwwwwwpppwwfffffffffffwvvvvvvvvvvvvvvwwpppppppppppwwwwwwwppprwwfffffpppfpfwvvvvvvvvvvvvvwwwpppppppppppwwwwwwwwpwwwffpppppppppwvvvvvvvvvvvvvvwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwvvvvvvvvvvvvvv",
  roads: [
    "10,17|11,17",
    "10,19|11,18",
    "11,17|12,17",
    "11,18|12,17",
    "12,17|13,16",
    "13,15|14,15",
    "13,16|14,15",
    "14,10|14,11",
    "14,11|14,12",
    "14,12|14,13",
    "14,13|14,14",
    "14,14|14,15",
    "14,15|14,16",
    "14,15|15,14",
    "14,15|15,15",
    "14,16|14,17",
    "14,17|14,18",
    "14,18|14,19",
    "14,19|14,20",
    "14,20|15,20",
    "14,9|14,10",
    "15,14|16,13",
    "15,15|16,15",
    "15,20|15,21",
    "15,21|15,22",
    "15,22|15,23",
    "16,13|17,12",
    "16,15|17,15",
    "17,12|18,11",
    "17,12|18,12",
    "17,15|18,15",
    "18,11|19,10",
    "18,15|19,14",
    "18,15|19,15",
    "19,10|20,9",
    "19,14|20,13",
    "19,15|20,15",
    "20,13|21,13",
    "20,15|21,15",
    "20,9|21,8",
    "21,15|22,15",
    "21,2|21,3",
    "21,3|21,4",
    "21,4|21,5",
    "21,5|21,6",
    "21,6|21,7",
    "21,7|21,8",
    "21,8|22,7",
    "22,15|23,15",
    "22,7|23,6",
    "23,15|24,15",
    "24,15|25,15",
    "25,15|26,15",
    "26,15|27,15",
    "27,15|28,15",
    "28,15|29,15",
    "29,15|30,15",
    "29,24|30,23",
    "30,15|31,15",
    "30,23|31,22",
    "31,15|32,15",
    "31,17|32,17",
    "31,22|31,23",
    "31,22|32,21",
    "31,23|31,24",
    "31,24|31,25",
    "31,25|31,26",
    "31,26|31,27",
    "31,27|31,28",
    "32,15|33,15",
    "32,17|33,16",
    "32,21|33,20",
    "33,15|34,15",
    "33,16|34,15",
    "33,20|34,19",
    "34,15|35,15",
    "34,18|35,18",
    "34,19|35,18",
    "35,15|36,15",
    "35,18|36,17",
    "36,15|37,15",
    "36,17|37,16",
    "37,10|38,10",
    "37,15|38,15",
    "37,16|38,15",
    "37,7|37,8",
    "37,8|37,9",
    "37,9|37,10",
    "38,10|38,11",
    "38,11|38,12",
    "38,12|38,13",
    "38,13|38,14",
    "38,14|38,15",
    "38,15|38,16",
    "38,15|39,14",
    "38,15|39,15",
    "38,16|38,17",
    "38,17|38,18",
    "38,18|38,19",
    "38,19|38,20",
    "38,20|38,21",
    "39,14|40,13",
    "40,13|41,12",
    "40,13|41,13",
    "41,12|42,11",
    "41,13|42,13",
    "42,11|43,10",
    "42,13|43,13",
    "43,9|43,10",
    "9,17|10,17",
    "9,20|10,19",
    "9,20|9,21"
  ],
  biome: "fjord",
  players: [
    {
      pantheonId: "norse"
    },
    {
      pantheonId: "celtic"
    }
  ],
  sites: [
    {
      id: "cache_1",
      kind: "resource_cache",
      q: 10,
      r: 26
    },
    {
      id: "cache_2",
      kind: "resource_cache",
      q: 42,
      r: 4
    },
    {
      id: "camp_1",
      kind: "creature_camp",
      q: 9,
      r: 17,
      creatureId: "norse_frost_wolf",
      name: "Wolf Den"
    },
    {
      id: "camp_2",
      kind: "creature_camp",
      q: 43,
      r: 13,
      creatureId: "norse_frost_wolf",
      name: "Wolf Den"
    },
    {
      id: "chest_1",
      kind: "treasure_chest",
      q: 5,
      r: 26,
      guard: {
        creatureId: "wild_boar",
        count: 10,
        label: "Snow boars"
      }
    },
    {
      id: "chest_2",
      kind: "treasure_chest",
      q: 47,
      r: 4,
      guard: {
        creatureId: "wild_boar",
        count: 10,
        label: "Snow boars"
      }
    },
    {
      id: "crystal_1",
      kind: "crystal_deposit",
      q: 15,
      r: 23,
      guard: {
        creatureId: "hill_slinger",
        count: 16,
        label: "Ice-cave slingers"
      }
    },
    {
      id: "crystal_2",
      kind: "crystal_deposit",
      q: 37,
      r: 7,
      guard: {
        creatureId: "hill_slinger",
        count: 16,
        label: "Ice-cave slingers"
      }
    },
    {
      id: "free_town_1",
      kind: "town",
      q: 21,
      r: 13
    },
    {
      id: "free_town_2",
      kind: "town",
      q: 31,
      r: 17
    },
    {
      id: "gate_1",
      kind: "key_gate",
      q: 24,
      r: 15,
      color: "crimson",
      name: "Frostgate",
      text: "One of the twin gates of the frozen pass. It opens for an empire holding the crimson key, kept on the glacier islands of the fjord."
    },
    {
      id: "gate_2",
      kind: "key_gate",
      q: 28,
      r: 15,
      color: "crimson",
      name: "Frostgate",
      text: "One of the twin gates of the frozen pass. It opens for an empire holding the crimson key, kept on the glacier islands of the fjord."
    },
    {
      id: "gold_1",
      kind: "gold_mine",
      q: 23,
      r: 6,
      guard: {
        creatureId: "ogre",
        count: 6,
        label: "Mine ogres"
      }
    },
    {
      id: "gold_2",
      kind: "gold_mine",
      q: 29,
      r: 24,
      guard: {
        creatureId: "ogre",
        count: 6,
        label: "Mine ogres"
      }
    },
    {
      id: "islet_chest_1",
      kind: "treasure_chest",
      q: 30,
      r: 3
    },
    {
      id: "islet_chest_2",
      kind: "treasure_chest",
      q: 22,
      r: 27
    },
    {
      id: "islet_portal_1",
      kind: "portal",
      q: 28,
      r: 4,
      twinId: "portal_1",
      name: "Glacier Portal"
    },
    {
      id: "islet_portal_2",
      kind: "portal",
      q: 24,
      r: 26,
      twinId: "portal_2",
      name: "Glacier Portal"
    },
    {
      id: "portal_1",
      kind: "portal",
      q: 21,
      r: 2,
      twinId: "islet_portal_1",
      name: "Glacier Portal"
    },
    {
      id: "portal_2",
      kind: "portal",
      q: 31,
      r: 28,
      twinId: "islet_portal_2",
      name: "Glacier Portal"
    },
    {
      id: "quarry_1",
      kind: "quarry",
      q: 9,
      r: 21
    },
    {
      id: "quarry_2",
      kind: "quarry",
      q: 43,
      r: 9
    },
    {
      id: "sawmill_1",
      kind: "sawmill",
      q: 14,
      r: 9
    },
    {
      id: "sawmill_2",
      kind: "sawmill",
      q: 38,
      r: 21
    },
    {
      id: "shrine_1",
      kind: "spell_shrine",
      q: 16,
      r: 3,
      spellId: "lightning"
    },
    {
      id: "shrine_2",
      kind: "spell_shrine",
      q: 36,
      r: 27,
      spellId: "lightning"
    },
    {
      id: "stone_1",
      kind: "learning_stone",
      q: 15,
      r: 19
    },
    {
      id: "stone_2",
      kind: "learning_stone",
      q: 37,
      r: 11
    },
    {
      id: "tent_1",
      kind: "key_tent",
      q: 30,
      r: 4,
      color: "crimson",
      guard: {
        creatureId: "wyvern",
        count: 8,
        label: "Glacier wyverns"
      },
      text: "The keymaster of the frozen pass keeps the crimson key on this glacier, where wyverns nest on the ice beside his tent."
    },
    {
      id: "tent_2",
      kind: "key_tent",
      q: 22,
      r: 26,
      color: "crimson",
      guard: {
        creatureId: "wyvern",
        count: 8,
        label: "Glacier wyverns"
      },
      text: "The keymaster of the frozen pass keeps the crimson key on this glacier, where wyverns nest on the ice beside his tent."
    },
    {
      id: "tower_1",
      kind: "watchtower",
      q: 18,
      r: 18,
      radius: 9,
      name: "Ridge Watchtower"
    },
    {
      id: "tower_2",
      kind: "watchtower",
      q: 34,
      r: 12,
      radius: 9,
      name: "Ridge Watchtower"
    },
    {
      id: "town_1",
      kind: "town",
      q: 13,
      r: 15,
      owner: 0
    },
    {
      id: "town_2",
      kind: "town",
      q: 39,
      r: 15,
      owner: 1
    },
    {
      id: "trainer_1",
      kind: "skill_trainer",
      q: 18,
      r: 6,
      skillId: "logistics"
    },
    {
      id: "trainer_2",
      kind: "skill_trainer",
      q: 34,
      r: 24,
      skillId: "logistics"
    },
    {
      id: "windmill_1",
      kind: "windmill",
      q: 18,
      r: 12
    },
    {
      id: "windmill_2",
      kind: "windmill",
      q: 34,
      r: 18
    }
  ],
  victory: {
    type: "elimination"
  },
  startWealth: "normal"
};

// ../pantheon_realms/packages/content/src/skirmish/maps/burning_oasis.prmap.json
var burning_oasis_prmap_default = {
  format: "pantheon-realms-map",
  version: 1,
  name: "The Burning Oasis",
  description: "Four empires in the corners of a burning desert. Between each pair of neighbours lies an oasis with gold or crystal and a creature camp; in the middle, ringed by red rock, the Burning Shrine. Hold it seven days, or conquer.",
  author: "Pantheon Realms",
  width: 63,
  height: 36,
  terrain: "vvvvvvvvvvvvvvvvvmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmvvvvvvvvvvvvvvvvvmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmvvvvvvvvvvvvvvvvmmppppprrpppprrrppppppppppppppprrrpppprrpppppmvvvvvvvvvvvvvvvvvmppppprrrpppppppppprpppppprpppppppppprrrpppppmvvvvvvvvvvvvvvvvmmfffprrrrppppppppprppfpfpprppppppppprrrrpfffmvvvvvvvvvvvvvvvvvmffffprmmpppppppppppppwwpppppppppppppmmrpffffmvvvvvvvvvvvvvvvvmmfffpppmpppppppppppppwwwpppppppppppppmpppfffmvvvvvvvvvvvvvvvvvmpppppppppppppppppppppwwpppppppppppppppppppppmvvvvvvvvvvvvvvvvmmppppppppmprpppppppppfffppppppppprpmppppppppmvvvvvvvvvvvvvvvvvmppppppppprrpppppppppppppppppppppprrpppppppppmvvvvvvvvvvvvvvvvmmmpppppppprppppppppmpppppmpppppppprppppppppmmvvvvvvvvvvvvvvvvvmmmmppppppppppppppmmmmmmmmmmppppppppppppppmmmmvvvvvvvvvvvvvvvvmmmmpppppppppppppppmmmmpmmmmpppppppppppppppmmmvvvvvvvvvvvvvvvvvmmmpppprpppppppppppmprrrrpmppppppppppprppppmmmvvvvvvvvvvvvvvvvmmpppppprrpppppppmppppprpppppmppppppprrppppppmvvvvvvvvvvvvvvvvvmppppppprpppppppmmpprprrprppmmppppppprpppppppmvvvvvvvvvvvvvvvvmmpppffpppppppmpmmmpppppppppmmmpmpppppppffpppmvvvvvvvvvvvvvvvvvmpppwwfppppprrrmmmppppppppppmmmrrrpppppfwwpppmvvvvvvvvvvvvvvvvmmppwwwfpppprrrrmmprppppppprpmmrrrrppppfwwwppmvvvvvvvvvvvvvvvvvmpppwwfppppprrrmmmppppppppppmmmrrrpppppfwwpppmvvvvvvvvvvvvvvvvmmpppffpppppppmpmmmpppppppppmmmpmpppppppffpppmvvvvvvvvvvvvvvvvvmppppppprpppppppmmpprprrprppmmppppppprpppppppmvvvvvvvvvvvvvvvvmmpppppprrpppppppmppppprpppppmppppppprrppppppmvvvvvvvvvvvvvvvvvmmmpppprpppppppppppmprrrrpmppppppppppprppppmmmvvvvvvvvvvvvvvvvmmmmpppppppppppppppmmmmpmmmmpppppppppppppppmmmvvvvvvvvvvvvvvvvvmmmmppppppppppppppmmmmmmmmmmppppppppppppppmmmmvvvvvvvvvvvvvvvvmmmpppppppprppppppppmpppppmpppppppprppppppppmmvvvvvvvvvvvvvvvvvmppppppppprrpppppppppppppppppppppprrpppppppppmvvvvvvvvvvvvvvvvmmppppppppmprpppppppppfffppppppppprpmppppppppmvvvvvvvvvvvvvvvvvmpppppppppppppppppppppwwpppppppppppppppppppppmvvvvvvvvvvvvvvvvmmfffpppmpppppppppppppwwwpppppppppppppmpppfffmvvvvvvvvvvvvvvvvvmffffprmmpppppppppppppwwpppppppppppppmmrpffffmvvvvvvvvvvvvvvvvmmfffprrrrppppppppprppfpfpprppppppppprrrrpfffmvvvvvvvvvvvvvvvvvmppppprrrpppppppppprpppppprpppppppppprrrpppppmvvvvvvvvvvvvvvvvmmppppprrpppprrrppppppppppppppprrrpppprrpppppmvvvvvvvvvvvvvvvvvmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmvvvvvvvvvvvvvvvvv",
  roads: [
    "10,29|11,29",
    "11,18|11,19",
    "11,18|12,17",
    "11,19|11,20",
    "11,20|11,21",
    "11,21|11,22",
    "11,22|11,23",
    "11,22|12,21",
    "11,23|11,24",
    "11,24|11,25",
    "11,25|11,26",
    "11,26|11,27",
    "11,27|11,28",
    "11,28|11,29",
    "11,29|12,29",
    "12,17|13,16",
    "12,29|13,29",
    "13,16|14,15",
    "13,29|14,29",
    "13,30|14,29",
    "14,15|15,14",
    "14,26|14,27",
    "14,26|15,25",
    "14,27|14,28",
    "14,28|14,29",
    "14,29|14,30",
    "14,29|15,29",
    "14,30|14,31",
    "14,31|14,32",
    "14,32|14,33",
    "14,33|15,33",
    "15,14|15,15",
    "15,14|16,13",
    "15,25|16,24",
    "15,29|16,29",
    "15,33|16,33",
    "16,13|17,12",
    "16,24|17,23",
    "16,29|17,28",
    "16,33|17,33",
    "17,12|18,11",
    "17,23|18,22",
    "17,28|18,27",
    "17,28|18,28",
    "18,11|19,10",
    "18,21|18,22",
    "18,28|19,28",
    "19,10|20,9",
    "19,28|20,27",
    "19,28|20,28",
    "19,6|20,6",
    "20,27|21,26",
    "20,28|20,29",
    "20,29|21,29",
    "20,6|21,6",
    "20,9|21,8",
    "21,15|22,14",
    "21,26|22,25",
    "21,29|22,29",
    "21,6|21,7",
    "21,7|22,7",
    "21,8|22,7",
    "22,10|22,11",
    "22,10|23,9",
    "22,11|22,12",
    "22,12|22,13",
    "22,13|22,14",
    "22,25|23,24",
    "22,29|22,30",
    "22,29|23,29",
    "22,30|22,31",
    "22,31|22,32",
    "22,32|23,32",
    "22,7|23,7",
    "23,24|24,23",
    "23,32|24,32",
    "23,7|24,7",
    "23,9|24,8",
    "24,23|25,22",
    "24,32|25,32",
    "24,7|25,7",
    "24,8|25,7",
    "25,22|26,22",
    "25,32|26,32",
    "25,6|25,7",
    "25,7|26,6",
    "25,7|26,7",
    "26,22|27,22",
    "26,32|27,31",
    "26,6|27,5",
    "26,7|27,7",
    "27,22|28,21",
    "27,31|28,30",
    "27,5|28,4",
    "27,7|27,8",
    "27,8|27,9",
    "27,8|28,8",
    "28,21|29,20",
    "28,29|29,29",
    "28,30|29,29",
    "28,4|29,3",
    "28,8|29,8",
    "29,10|29,11",
    "29,11|29,12",
    "29,12|29,13",
    "29,13|29,14",
    "29,14|30,14",
    "29,20|30,19",
    "29,29|30,29",
    "29,3|30,3",
    "29,8|29,9",
    "29,8|30,8",
    "29,9|29,10",
    "30,14|31,14",
    "30,19|31,18",
    "30,29|31,29",
    "30,33|31,33",
    "30,3|31,3",
    "30,8|31,7",
    "31,14|31,15",
    "31,15|31,16",
    "31,16|31,17",
    "31,17|31,18",
    "31,18|31,19",
    "31,18|32,17",
    "31,19|31,20",
    "31,20|31,21",
    "31,21|31,22",
    "31,22|32,22",
    "31,29|32,28",
    "31,33|32,33",
    "31,3|32,3",
    "31,7|32,7",
    "32,17|33,16",
    "32,22|33,22",
    "32,28|33,28",
    "32,33|33,33",
    "32,7|33,7",
    "33,16|34,15",
    "33,22|33,23",
    "33,23|33,24",
    "33,24|33,25",
    "33,25|33,26",
    "33,26|33,27",
    "33,27|33,28",
    "33,28|34,28",
    "33,33|34,32",
    "33,7|34,6",
    "33,7|34,7",
    "34,15|35,14",
    "34,28|35,28",
    "34,32|35,31",
    "34,6|35,5",
    "35,14|36,14",
    "35,27|35,28",
    "35,28|35,29",
    "35,29|36,29",
    "35,31|36,30",
    "35,5|36,4",
    "36,14|37,14",
    "36,29|37,29",
    "36,30|37,29",
    "36,4|37,4",
    "37,14|38,13",
    "37,29|37,30",
    "37,29|38,28",
    "37,29|38,29",
    "37,4|38,4",
    "38,13|39,12",
    "38,28|39,27",
    "38,29|39,29",
    "38,4|39,4",
    "39,12|40,11",
    "39,27|40,26",
    "39,29|40,29",
    "39,4|40,4",
    "39,7|40,7",
    "40,11|41,10",
    "40,22|40,23",
    "40,22|41,21",
    "40,23|40,24",
    "40,24|40,25",
    "40,25|40,26",
    "40,29|41,28",
    "40,29|41,29",
    "40,4|40,5",
    "40,5|40,6",
    "40,6|40,7",
    "40,7|41,7",
    "41,10|42,9",
    "41,28|42,27",
    "41,29|41,30",
    "41,30|42,30",
    "41,7|42,7",
    "42,27|43,26",
    "42,30|43,30",
    "42,7|42,8",
    "42,8|43,8",
    "42,9|43,8",
    "43,26|44,25",
    "43,8|44,8",
    "44,14|44,15",
    "44,14|45,13",
    "44,25|45,24",
    "44,8|45,8",
    "44,9|45,8",
    "45,13|46,12",
    "45,24|46,23",
    "45,3|46,3",
    "45,8|46,7",
    "46,12|47,11",
    "46,23|47,22",
    "46,3|47,3",
    "46,7|47,7",
    "47,11|48,10",
    "47,21|47,22",
    "47,22|48,21",
    "47,3|48,3",
    "47,7|48,7",
    "48,21|49,20",
    "48,3|48,4",
    "48,4|48,5",
    "48,5|48,6",
    "48,6|48,7",
    "48,7|48,8",
    "48,7|49,6",
    "48,7|49,7",
    "48,8|48,9",
    "48,9|48,10",
    "49,20|50,19",
    "49,7|50,7",
    "50,15|51,14",
    "50,19|51,18",
    "50,7|51,7",
    "51,10|51,11",
    "51,11|51,12",
    "51,12|51,13",
    "51,13|51,14",
    "51,14|51,15",
    "51,15|51,16",
    "51,16|51,17",
    "51,17|51,18",
    "51,7|51,8",
    "51,7|52,7",
    "51,8|51,9",
    "51,9|51,10",
    "52,7|53,6",
    "53,6|54,6",
    "54,6|55,6",
    "7,30|8,30",
    "8,30|9,30",
    "9,30|10,29"
  ],
  biome: "desert",
  players: [
    {
      pantheonId: "egyptian"
    },
    {
      pantheonId: "mesoamerican"
    },
    {
      pantheonId: "greek"
    },
    {
      pantheonId: "norse"
    }
  ],
  sites: [
    {
      id: "art_1",
      kind: "artifact",
      q: 25,
      r: 13,
      reward: {
        artifactId: "winged_sandals"
      },
      guard: {
        creatureId: "clay_golem",
        count: 8,
        label: "Sand golems"
      }
    },
    {
      id: "art_2",
      kind: "artifact",
      q: 42,
      r: 13,
      reward: {
        artifactId: "winged_sandals"
      },
      guard: {
        creatureId: "clay_golem",
        count: 8,
        label: "Sand golems"
      }
    },
    {
      id: "art_3",
      kind: "artifact",
      q: 37,
      r: 23,
      reward: {
        artifactId: "winged_sandals"
      },
      guard: {
        creatureId: "clay_golem",
        count: 8,
        label: "Sand golems"
      }
    },
    {
      id: "art_4",
      kind: "artifact",
      q: 20,
      r: 23,
      reward: {
        artifactId: "winged_sandals"
      },
      guard: {
        creatureId: "clay_golem",
        count: 8,
        label: "Sand golems"
      }
    },
    {
      id: "cache_1",
      kind: "resource_cache",
      q: 15,
      r: 10
    },
    {
      id: "cache_2",
      kind: "resource_cache",
      q: 55,
      r: 10
    },
    {
      id: "cache_3",
      kind: "resource_cache",
      q: 47,
      r: 26
    },
    {
      id: "cache_4",
      kind: "resource_cache",
      q: 7,
      r: 26
    },
    {
      id: "chest_1",
      kind: "treasure_chest",
      q: 20,
      r: 2
    },
    {
      id: "chest_2",
      kind: "treasure_chest",
      q: 58,
      r: 2
    },
    {
      id: "chest_3",
      kind: "treasure_chest",
      q: 42,
      r: 34
    },
    {
      id: "chest_4",
      kind: "treasure_chest",
      q: 4,
      r: 34
    },
    {
      id: "free_town_1",
      kind: "town",
      q: 21,
      r: 15
    },
    {
      id: "free_town_2",
      kind: "town",
      q: 44,
      r: 15
    },
    {
      id: "free_town_3",
      kind: "town",
      q: 41,
      r: 21
    },
    {
      id: "free_town_4",
      kind: "town",
      q: 18,
      r: 21
    },
    {
      id: "oasis_camp_n_1",
      kind: "creature_camp",
      q: 38,
      r: 4,
      creatureId: "wyvern",
      name: "Wyvern Roost"
    },
    {
      id: "oasis_camp_n_3",
      kind: "creature_camp",
      q: 24,
      r: 32,
      creatureId: "wyvern",
      name: "Wyvern Roost"
    },
    {
      id: "oasis_camp_w_1",
      kind: "creature_camp",
      q: 11,
      r: 18,
      creatureId: "centaur",
      name: "Centaur Camp"
    },
    {
      id: "oasis_camp_w_2",
      kind: "creature_camp",
      q: 51,
      r: 18,
      creatureId: "centaur",
      name: "Centaur Camp"
    },
    {
      id: "oasis_crystal_1",
      kind: "crystal_deposit",
      q: 15,
      r: 15,
      name: "Oasis Crystal",
      guard: {
        creatureId: "hill_slinger",
        count: 14,
        label: "Oasis raiders"
      }
    },
    {
      id: "oasis_crystal_2",
      kind: "crystal_deposit",
      q: 50,
      r: 15,
      name: "Oasis Crystal",
      guard: {
        creatureId: "hill_slinger",
        count: 14,
        label: "Oasis raiders"
      }
    },
    {
      id: "oasis_crystal_3",
      kind: "crystal_deposit",
      q: 47,
      r: 21,
      name: "Oasis Crystal",
      guard: {
        creatureId: "hill_slinger",
        count: 14,
        label: "Oasis raiders"
      }
    },
    {
      id: "oasis_crystal_4",
      kind: "crystal_deposit",
      q: 12,
      r: 21,
      name: "Oasis Crystal",
      guard: {
        creatureId: "hill_slinger",
        count: 14,
        label: "Oasis raiders"
      }
    },
    {
      id: "oasis_gold_1",
      kind: "gold_mine",
      q: 34,
      r: 7,
      name: "Oasis Gold Mine",
      guard: {
        creatureId: "egyptian_ushabti",
        count: 11,
        label: "Oasis wardens"
      }
    },
    {
      id: "oasis_gold_2",
      kind: "gold_mine",
      q: 39,
      r: 7,
      name: "Oasis Gold Mine",
      guard: {
        creatureId: "egyptian_ushabti",
        count: 11,
        label: "Oasis wardens"
      }
    },
    {
      id: "oasis_gold_3",
      kind: "gold_mine",
      q: 28,
      r: 29,
      name: "Oasis Gold Mine",
      guard: {
        creatureId: "egyptian_ushabti",
        count: 11,
        label: "Oasis wardens"
      }
    },
    {
      id: "oasis_gold_4",
      kind: "gold_mine",
      q: 23,
      r: 29,
      name: "Oasis Gold Mine",
      guard: {
        creatureId: "egyptian_ushabti",
        count: 11,
        label: "Oasis wardens"
      }
    },
    {
      id: "quarry_1",
      kind: "quarry",
      q: 32,
      r: 3
    },
    {
      id: "quarry_2",
      kind: "quarry",
      q: 45,
      r: 3
    },
    {
      id: "quarry_3",
      kind: "quarry",
      q: 30,
      r: 33
    },
    {
      id: "quarry_4",
      kind: "quarry",
      q: 17,
      r: 33
    },
    {
      id: "relic",
      kind: "relic",
      q: 31,
      r: 18,
      name: "The Burning Shrine",
      guard: {
        creatureId: "basilisk",
        count: 5,
        more: [
          {
            creatureId: "ogre",
            count: 8
          }
        ],
        label: "Shrine wardens"
      }
    },
    {
      id: "sawmill_1",
      kind: "sawmill",
      q: 19,
      r: 6
    },
    {
      id: "sawmill_2",
      kind: "sawmill",
      q: 55,
      r: 6
    },
    {
      id: "sawmill_3",
      kind: "sawmill",
      q: 43,
      r: 30
    },
    {
      id: "sawmill_4",
      kind: "sawmill",
      q: 7,
      r: 30
    },
    {
      id: "shrine_1",
      kind: "spell_shrine",
      q: 30,
      r: 7,
      spellId: "veil"
    },
    {
      id: "shrine_2",
      kind: "spell_shrine",
      q: 43,
      r: 7,
      spellId: "veil"
    },
    {
      id: "shrine_3",
      kind: "spell_shrine",
      q: 32,
      r: 29,
      spellId: "veil"
    },
    {
      id: "shrine_4",
      kind: "spell_shrine",
      q: 19,
      r: 29,
      spellId: "veil"
    },
    {
      id: "stone_1",
      kind: "learning_stone",
      q: 20,
      r: 10
    },
    {
      id: "stone_2",
      kind: "learning_stone",
      q: 50,
      r: 10
    },
    {
      id: "stone_3",
      kind: "learning_stone",
      q: 42,
      r: 26
    },
    {
      id: "stone_4",
      kind: "learning_stone",
      q: 12,
      r: 26
    },
    {
      id: "town_1",
      kind: "town",
      q: 25,
      r: 6,
      owner: 0
    },
    {
      id: "town_2",
      kind: "town",
      q: 49,
      r: 6,
      owner: 1
    },
    {
      id: "town_3",
      kind: "town",
      q: 37,
      r: 30,
      owner: 2
    },
    {
      id: "town_4",
      kind: "town",
      q: 13,
      r: 30,
      owner: 3
    },
    {
      id: "trainer_1",
      kind: "skill_trainer",
      q: 19,
      r: 13,
      skillId: "logistics"
    },
    {
      id: "trainer_2",
      kind: "skill_trainer",
      q: 48,
      r: 13,
      skillId: "logistics"
    },
    {
      id: "trainer_3",
      kind: "skill_trainer",
      q: 43,
      r: 23,
      skillId: "logistics"
    },
    {
      id: "trainer_4",
      kind: "skill_trainer",
      q: 14,
      r: 23,
      skillId: "logistics"
    },
    {
      id: "windmill_1",
      kind: "windmill",
      q: 27,
      r: 9
    },
    {
      id: "windmill_2",
      kind: "windmill",
      q: 44,
      r: 9
    },
    {
      id: "windmill_3",
      kind: "windmill",
      q: 35,
      r: 27
    },
    {
      id: "windmill_4",
      kind: "windmill",
      q: 18,
      r: 27
    }
  ],
  victory: {
    type: "hold_relic",
    days: 7
  },
  startWealth: "normal"
};

// ../pantheon_realms/packages/content/src/skirmish/maps/circle_of_gates.prmap.json
var circle_of_gates_prmap_default = {
  format: "pantheon-realms-map",
  version: 1,
  name: "The Circle of Gates",
  description: "Three high valleys round a peak sanctum. A ring of portals links them: each home gate opens behind the next empire\u2019s town, so every rival is one step from your back door \u2014 and you from theirs.",
  author: "Pantheon Realms",
  width: 74,
  height: 42,
  terrain: "vvvvvvvvvvvvvvvvvvvvmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmvvvvvvvvvvvvvvvvvvvvmmmmmmmmmmmmmmmmmmmmmmmmmpfmfmmmmmmmmmmmmmmmmmmmmmmmmmvvvvvvvvvvvvvvvvvvvmmmmmmmmmmmmmmmmmmmmmmmmpppmfppppmmmmmmmmmmmmmmmmmmmmmvvvvvvvvvvvvvvvvvvvvmmmmmmmmmmmmmmmmmmmrrffppppppppppmmmmmmmmmmmmmmmmmmmmmvvvvvvvvvvvvvvvvvvvmmmmmmmmmmmmmmmmmmmrrrfpppppppprrmppmmmmmmmmmmmmmmmmmmvvvvvvvvvvvvvvvvvvvvmmmmmmmmmmmmmmmmmffrrmppppppprrrmpppmffmmmmmmmmmmmmmmmvvvvvvvvvvvvvvvvvvvmmmmmmmmmmmmmmmmmppfpffppppppppprmppmpppmmmmmmmmmmmmmmvvvvvvvvvvvvvvvvvvvvmmmmmmmmmmmmmmmrrppppprrrrpppppprpmmpppmmmmmmmmmmmmmmmvvvvvvvvvvvvvvvvvvvmmmmmmmmmmmmmmmrpppppppfrrpppppprppppppppmmmmmmmmmmmmmvvvvvvvvvvvvvvvvvvvvmmmmmmmmmmmmmmprppppppffffpppmpppppppppppmmmmmmmmmmmmmvvvvvvvvvvvvvvvvvvvmmmmmmmmmmmmmmpppppppfffpppppppprffpppppppmmmmmmmmmmmmvvvvvvvvvvvvvvvvvvvvmmmmmmmmmmmmmmmppppppffpppppppppffffppppmmmmmmmmmmmmmmvvvvvvvvvvvvvvvvvvvmmmmmmmmmmmmmmmmmpppmfpfpppppppppfffmppmmmmmmmmmmmmmmmvvvvvvvvvvvvvvvvvvvvmmmmmmmmmmmmpmmmmppppppppmmpmmppppppmpmmmmpmmmmmmmmmmmvvvvvvvvvvvvvvvvvvvmmmmmmmmmmmmpppmmpmmppppmmmppmmmppppmmpmmpppmmmmmmmmmmvvvvvvvvvvvvvvvvvvvvmmmmmmmmmmmppppppmmmmrmmmmmpmmmmmpmmmmpppprrmmmmmmmmmmvvvvvvvvvvvvvvvvvvvmmmmmmmmmmmmpppppmmmmmmmmmmppmmmmmmmmmpppppprmmmmmmmmmvvvvvvvvvvvvvvvvvvvvmmmmmmmmmmppppppmppmmmmmmmmpmmmmmmmmppppppprmmmmmmmmmmvvvvvvvvvvvvvvvvvvvmmmmmmmmmmfpppppffpppmmmmmppppmmmmmrppmppppppmmmmmmmmmvvvvvvvvvvvvvvvvvvvvmmmmmmmmmmfpppppffppmmmmmpppppmmmmmppfppppppfmmmmmmmmmvvvvvvvvvvvvvvvvvvvmmmmmmmmmmmmmmppfffppmmmmppppppmmmmpppffpppffmmmmmmmmmvvvvvvvvvvvvvvvvvvvvmmmmmmmmmmmppmppffppmmmmpppppppmmmmpfffpppprrmmmmmmmmmvvvvvvvvvvvvvvvvvvvmmmmmmmmmmmpppppprpppmmmmppppppmmmmpppffppfrrrmmmmmmmmvvvvvvvvvvvvvvvvvvvvmmmmmmmmmmmppmrrppppmmmpppppppppmmmpppffrfmrrmmmmmmmmmvvvvvvvvvvvvvvvvvvvmmmmmmmmmmmmmmrppppppmpppmppppmpppmpppfrrppffmmmmmmmmmvvvvvvvvvvvvvvvvvvvvmmmmmmmmmmmprrpppmpppppmmmmmmmmmpppppfrrpppfmmmmmmmmmmvvvvvvvvvvvvvvvvvvvmmmmmmmmmmmpprrpppppppmmmmmmmmmmmmppppprppppmmmmmmmmmmvvvvvvvvvvvvvvvvvvvvmmmmmmmmmmmppprpppppppmmmmmmmmmmmpppppppppppmmmmmmmmmmvvvvvvvvvvvvvvvvvvvmmmmmmmmmmmmppppppppppppmmmmmmmmppppppppppppmmmmmmmmmmvvvvvvvvvvvvvvvvvvvvmmmmmmmmmmmmpppppppfpppppmmmmmpppppmppppppppmmmmmmmmmmvvvvvvvvvvvvvvvvvvvmmmmmmmmmmmmffpppprrfppfpprmmpppppppppppppmfmmmmmmmmmmvvvvvvvvvvvvvvvvvvvvmmmmmmmmmmmmmmpppprrfffpppmmmppffrpppprppfmmmmmmmmmmmmvvvvvvvvvvvvvvvvvvvmmmmmmmmmmmmmfppppprfffffppmmppfffprpprpppfmmmmmmmmmmmvvvvvvvvvvvvvvvvvvvvmmmmmmmmmmmmmpppppprppfpmpmmmpfffpprrrrppmmmmmmmmmmmmmvvvvvvvvvvvvvvvvvvvmmmmmmmmmmmmmmmppppfpppppppmmmmfppppmmrppmmmmmmmmmmmmmvvvvvvvvvvvvvvvvvvvvmmmmmmmmmmmmmmmmffmfppppppppppppppmppmppmmmmmmmmmmmmmmvvvvvvvvvvvvvvvvvvvmmmmmmmmmmmmmmmmmfrrpppppppmmpppppmpppmmmmmmmmmmmmmmmmvvvvvvvvvvvvvvvvvvvvmmmmmmmmmmmmmmmmmrrrfpppppmmmpppppmppmmmmmmmmmmmmmmmmmvvvvvvvvvvvvvvvvvvvmmmmmmmmmmmmmmmmmmrrfppppppmmppppppmmmmmmmmmmmmmmmmmmmvvvvvvvvvvvvvvvvvvvvmmmmmmmmmmmmmmmmmmmmfprprpmmmpppppfmmmmmmmmmmmmmmmmmmmvvvvvvvvvvvvvvvvvvvmmmmmmmmmmmmmmmmmmmmmmmrrppmmpppmpfmmmmmmmmmmmmmmmmmmmvvvvvvvvvvvvvvvvvvvvmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmvvvvvvvvvvvvvvvvvvvv",
  roads: [
    "20,27|21,27",
    "20,33|21,32",
    "21,22|22,22",
    "21,27|22,27",
    "21,32|22,31",
    "22,22|23,22",
    "22,27|23,27",
    "22,30|22,31",
    "22,30|23,29",
    "22,31|22,32",
    "22,32|22,33",
    "22,33|22,34",
    "22,34|22,35",
    "22,35|22,36",
    "23,18|23,19",
    "23,19|24,19",
    "23,22|24,22",
    "23,27|24,27",
    "23,28|24,28",
    "23,29|24,28",
    "24,19|25,19",
    "24,22|24,23",
    "24,23|24,24",
    "24,24|24,25",
    "24,24|25,23",
    "24,25|24,26",
    "24,25|25,24",
    "24,26|24,27",
    "24,27|24,28",
    "24,28|25,28",
    "25,19|25,20",
    "25,19|26,18",
    "25,20|25,21",
    "25,21|25,22",
    "25,22|25,23",
    "25,24|26,23",
    "25,28|26,28",
    "26,18|27,17",
    "26,28|26,29",
    "26,28|27,27",
    "26,29|26,30",
    "26,29|27,29",
    "27,17|28,16",
    "27,27|28,26",
    "27,29|27,30",
    "27,30|27,31",
    "27,31|28,31",
    "27,35|28,35",
    "28,16|29,15",
    "28,26|29,25",
    "28,35|29,35",
    "29,15|30,14",
    "29,25|30,25",
    "29,35|30,35",
    "30,14|31,13",
    "30,25|31,24",
    "30,35|31,35",
    "31,13|32,12",
    "31,35|32,35",
    "32,12|33,11",
    "32,35|33,35",
    "33,35|34,35",
    "34,35|35,35",
    "34,38|35,37",
    "35,35|35,36",
    "35,35|36,34",
    "35,36|35,37",
    "36,12|37,11",
    "36,34|37,33",
    "37,11|38,11",
    "37,33|38,32",
    "37,6|38,6",
    "38,11|39,11",
    "38,32|39,31",
    "38,33|38,34",
    "38,33|39,32",
    "38,34|38,35",
    "38,35|38,36",
    "38,6|39,6",
    "39,10|40,10",
    "39,11|40,10",
    "39,30|40,30",
    "39,31|40,31",
    "39,32|40,31",
    "39,6|40,6",
    "40,10|41,10",
    "40,14|40,15",
    "40,14|41,13",
    "40,24|41,24",
    "40,30|41,30",
    "40,31|41,30",
    "40,6|41,6",
    "41,10|41,11",
    "41,10|42,9",
    "41,11|41,12",
    "41,12|41,13",
    "41,24|41,25",
    "41,25|42,25",
    "41,30|42,29",
    "41,6|42,6",
    "42,25|43,25",
    "42,29|43,28",
    "42,4|42,5",
    "42,5|42,6",
    "42,6|43,6",
    "42,9|43,8",
    "43,25|44,25",
    "43,28|43,29",
    "43,28|44,27",
    "43,29|43,30",
    "43,30|43,31",
    "43,31|43,32",
    "43,6|43,7",
    "43,7|43,8",
    "43,8|44,7",
    "43,8|44,8",
    "44,25|44,26",
    "44,25|45,24",
    "44,26|44,27",
    "44,27|44,28",
    "44,27|45,27",
    "44,8|45,7",
    "44,8|45,8",
    "45,23|45,24",
    "45,23|46,22",
    "45,24|46,23",
    "45,27|46,27",
    "45,7|46,6",
    "45,8|46,8",
    "46,22|47,21",
    "46,27|47,26",
    "46,6|47,5",
    "46,8|46,9",
    "46,8|47,8",
    "46,9|46,10",
    "47,20|47,21",
    "47,26|48,25",
    "47,26|48,26",
    "47,5|48,4",
    "47,8|47,9",
    "47,8|48,8",
    "47,9|48,9",
    "48,25|49,24",
    "48,26|49,26",
    "48,8|49,8",
    "48,9|49,9",
    "49,24|50,23",
    "49,8|50,7",
    "49,9|50,9",
    "50,23|51,22",
    "50,7|51,6",
    "50,9|51,9",
    "51,10|51,11",
    "51,11|51,12",
    "51,12|51,13",
    "51,13|51,14",
    "51,14|51,15",
    "51,15|51,16",
    "51,16|51,17",
    "51,22|52,21",
    "51,6|52,5",
    "51,9|51,10",
    "51,9|52,8",
    "52,8|53,7",
    "53,7|54,7"
  ],
  biome: "high_pass",
  players: [
    {
      pantheonId: "japanese"
    },
    {
      pantheonId: "greek"
    },
    {
      pantheonId: "celtic"
    }
  ],
  sites: [
    {
      id: "back_portal_1",
      kind: "portal",
      q: 52,
      r: 5,
      twinId: "home_portal_3",
      name: "Gate of the Circle"
    },
    {
      id: "back_portal_2",
      kind: "portal",
      q: 38,
      r: 36,
      twinId: "home_portal_1",
      name: "Gate of the Circle"
    },
    {
      id: "back_portal_3",
      kind: "portal",
      q: 21,
      r: 22,
      twinId: "home_portal_2",
      name: "Gate of the Circle"
    },
    {
      id: "cache_1",
      kind: "resource_cache",
      q: 32,
      r: 8
    },
    {
      id: "cache_2",
      kind: "resource_cache",
      q: 55,
      r: 16
    },
    {
      id: "cache_3",
      kind: "resource_cache",
      q: 24,
      r: 39
    },
    {
      id: "camp_1",
      kind: "creature_camp",
      q: 33,
      r: 11,
      creatureId: "centaur",
      name: "Centaur Camp"
    },
    {
      id: "camp_2",
      kind: "creature_camp",
      q: 51,
      r: 17,
      creatureId: "centaur",
      name: "Centaur Camp"
    },
    {
      id: "camp_3",
      kind: "creature_camp",
      q: 27,
      r: 35,
      creatureId: "centaur",
      name: "Centaur Camp"
    },
    {
      id: "chest_1",
      kind: "treasure_chest",
      q: 46,
      r: 3
    },
    {
      id: "chest_2",
      kind: "treasure_chest",
      q: 46,
      r: 30
    },
    {
      id: "chest_3",
      kind: "treasure_chest",
      q: 19,
      r: 30
    },
    {
      id: "crystal_1",
      kind: "crystal_deposit",
      q: 46,
      r: 10,
      guard: {
        creatureId: "hill_slinger",
        count: 14,
        label: "Cliff slingers"
      }
    },
    {
      id: "crystal_2",
      kind: "crystal_deposit",
      q: 39,
      r: 30,
      guard: {
        creatureId: "hill_slinger",
        count: 14,
        label: "Cliff slingers"
      }
    },
    {
      id: "crystal_3",
      kind: "crystal_deposit",
      q: 26,
      r: 23,
      guard: {
        creatureId: "hill_slinger",
        count: 14,
        label: "Cliff slingers"
      }
    },
    {
      id: "free_town_1",
      kind: "town",
      q: 54,
      r: 7
    },
    {
      id: "free_town_2",
      kind: "town",
      q: 34,
      r: 38
    },
    {
      id: "free_town_3",
      kind: "town",
      q: 23,
      r: 18
    },
    {
      id: "gold_1",
      kind: "gold_mine",
      q: 39,
      r: 10,
      guard: {
        creatureId: "wild_boar",
        count: 22,
        label: "Mountain boars"
      }
    },
    {
      id: "gold_2",
      kind: "gold_mine",
      q: 46,
      r: 23,
      guard: {
        creatureId: "wild_boar",
        count: 22,
        label: "Mountain boars"
      }
    },
    {
      id: "gold_3",
      kind: "gold_mine",
      q: 26,
      r: 30,
      guard: {
        creatureId: "wild_boar",
        count: 22,
        label: "Mountain boars"
      }
    },
    {
      id: "home_portal_1",
      kind: "portal",
      q: 36,
      r: 12,
      twinId: "back_portal_2",
      name: "Gate of the Circle"
    },
    {
      id: "home_portal_2",
      kind: "portal",
      q: 47,
      r: 20,
      twinId: "back_portal_3",
      name: "Gate of the Circle"
    },
    {
      id: "home_portal_3",
      kind: "portal",
      q: 28,
      r: 31,
      twinId: "back_portal_1",
      name: "Gate of the Circle"
    },
    {
      id: "path_guard_1",
      kind: "monster",
      q: 40,
      r: 15,
      name: "Summit Path",
      guard: {
        creatureId: "wyvern",
        count: 7,
        more: [
          {
            creatureId: "centaur",
            count: 6
          }
        ],
        label: "Summit wyverns"
      }
    },
    {
      id: "path_guard_2",
      kind: "monster",
      q: 40,
      r: 24,
      name: "Summit Path",
      guard: {
        creatureId: "wyvern",
        count: 7,
        more: [
          {
            creatureId: "centaur",
            count: 6
          }
        ],
        label: "Summit wyverns"
      }
    },
    {
      id: "path_guard_3",
      kind: "monster",
      q: 31,
      r: 24,
      name: "Summit Path",
      guard: {
        creatureId: "wyvern",
        count: 7,
        more: [
          {
            creatureId: "centaur",
            count: 6
          }
        ],
        label: "Summit wyverns"
      }
    },
    {
      id: "quarry_1",
      kind: "quarry",
      q: 51,
      r: 11
    },
    {
      id: "quarry_2",
      kind: "quarry",
      q: 33,
      r: 35
    },
    {
      id: "quarry_3",
      kind: "quarry",
      q: 27,
      r: 17
    },
    {
      id: "ridge_guard_1",
      kind: "monster",
      q: 51,
      r: 14,
      name: "Ridge Crossing",
      guard: {
        creatureId: "ogre",
        count: 6,
        label: "Ridge ogres"
      }
    },
    {
      id: "ridge_guard_2",
      kind: "monster",
      q: 30,
      r: 35,
      name: "Ridge Crossing",
      guard: {
        creatureId: "ogre",
        count: 6,
        label: "Ridge ogres"
      }
    },
    {
      id: "ridge_guard_3",
      kind: "monster",
      q: 30,
      r: 14,
      name: "Ridge Crossing",
      guard: {
        creatureId: "ogre",
        count: 6,
        label: "Ridge ogres"
      }
    },
    {
      id: "sanctum_shrine_1",
      kind: "spell_shrine",
      q: 39,
      r: 20,
      spellId: "divine_sight"
    },
    {
      id: "sanctum_shrine_2",
      kind: "spell_shrine",
      q: 36,
      r: 23,
      spellId: "mend"
    },
    {
      id: "sanctum_shrine_3",
      kind: "spell_shrine",
      q: 36,
      r: 20,
      spellId: "veil"
    },
    {
      id: "sawmill_1",
      kind: "sawmill",
      q: 37,
      r: 6
    },
    {
      id: "sawmill_2",
      kind: "sawmill",
      q: 52,
      r: 21
    },
    {
      id: "sawmill_3",
      kind: "sawmill",
      q: 22,
      r: 36
    },
    {
      id: "stone_1",
      kind: "learning_stone",
      q: 48,
      r: 4
    },
    {
      id: "stone_2",
      kind: "learning_stone",
      q: 43,
      r: 32
    },
    {
      id: "stone_3",
      kind: "learning_stone",
      q: 20,
      r: 27
    },
    {
      id: "summit",
      kind: "artifact",
      q: 37,
      r: 21,
      name: "Crown of the Summit",
      reward: {
        artifactId: "crown_of_counsel",
        gold: 1500
      },
      text: "An ancient crown left on the summit stone, where the three paths meet."
    },
    {
      id: "terrace_guard_1",
      kind: "monster",
      q: 50,
      r: 7,
      name: "Gate Terrace",
      guard: {
        creatureId: "centaur",
        count: 13,
        label: "Gate wardens"
      }
    },
    {
      id: "terrace_guard_2",
      kind: "monster",
      q: 38,
      r: 34,
      name: "Gate Terrace",
      guard: {
        creatureId: "centaur",
        count: 13,
        label: "Gate wardens"
      }
    },
    {
      id: "terrace_guard_3",
      kind: "monster",
      q: 23,
      r: 22,
      name: "Gate Terrace",
      guard: {
        creatureId: "centaur",
        count: 13,
        label: "Gate wardens"
      }
    },
    {
      id: "town_1",
      kind: "town",
      q: 44,
      r: 7,
      owner: 0
    },
    {
      id: "town_2",
      kind: "town",
      q: 44,
      r: 28,
      owner: 1
    },
    {
      id: "town_3",
      kind: "town",
      q: 23,
      r: 28,
      owner: 2
    },
    {
      id: "trainer_1",
      kind: "skill_trainer",
      q: 47,
      r: 13,
      skillId: "scouting"
    },
    {
      id: "trainer_2",
      kind: "skill_trainer",
      q: 35,
      r: 31,
      skillId: "scouting"
    },
    {
      id: "trainer_3",
      kind: "skill_trainer",
      q: 29,
      r: 19,
      skillId: "scouting"
    },
    {
      id: "windmill_1",
      kind: "windmill",
      q: 42,
      r: 4
    },
    {
      id: "windmill_2",
      kind: "windmill",
      q: 49,
      r: 26
    },
    {
      id: "windmill_3",
      kind: "windmill",
      q: 20,
      r: 33
    }
  ],
  victory: {
    type: "elimination"
  },
  startWealth: "normal"
};

// ../pantheon_realms/packages/content/src/skirmish/maps/barrows.prmap.json
var barrows_prmap_default = {
  format: "pantheon-realms-map",
  version: 1,
  name: "Barrows of the Lost Kings",
  description: "A fog-bound moor of burial mounds. Captive heroes wait in the barrows, hermits pay for deeds, and two sealed hoards open only for the amber and the violet keys. Gold is scarce: each side has one mine.",
  author: "Pantheon Realms",
  width: 52,
  height: 30,
  terrain: "vvvvvvvvvvvvvvmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmvvvvvvvvvvvvvvmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmvvvvvvvvvvvvvmmmpsssrrrrrrrpfffffppprsspfppppwwwwwmvvvvvvvvvvvvvvmmprrrrrpppprppffffprrrmmmpfffffwwwwwmvvvvvvvvvvvvvmmmprrrrrppmmssppffpprrmppmpsfffwwwwwmvvvvvvvvvvvvvvmmpfrrrprprmssswwfffffmpppmssfppwwwwfmvvvvvvvvvvvvvmmmffrppppsssfssmwwfffpmppmppppppwwffmvvvvvvvvvvvvvvmmffpwpppsssssswwwwrrrppmmpppppppwpppmvvvvvvvvvvvvvmmmpmpppppssssrppwwrrrrppffffppppppppmvvvvvvvvvvvvvvmmpmpprprsssssrwwwrrprppffffppprrprppmvvvvvvvvvvvvvmmmfpprrrppppssrmwwrrrrpfffppfpprrrfpmvvvvvvvvvvvvvvmmppppssspppssspwwwrrrfssssspspppprmpmvvvvvvvvvvvvvmmmfpppssfpppsrrpppppffssspsssppppfppmvvvvvvvvvvvvvvmmpfpprsffpprrrrrpppffmssmmssspppffffmvvvvvvvvvvvvvmmmpppprrppprrpprsppppssrrsssmpprrpppmvvvvvvvvvvvvvvmmsppfrrpppfrrrrrppppprrrrrfppprrfppsmvvvvvvvvvvvvvmmmppprrppmsssrrssppppsrpprrppprrppppmvvvvvvvvvvvvvvmmffffpppsssmmssmffppprrrrrppffsrppfpmvvvvvvvvvvvvvmmmppfppppssspsssffppppprrspppfsspppfmvvvvvvvvvvvvvvmmpmrppppspsssssfrrrwwwpssspppsssppppmvvvvvvvvvvvvvmmmpfrrrppfppfffprrrrwwmrsspppprrrppfmvvvvvvvvvvvvvvmmpprprrpppffffpprprrwwwrsssssrprppmpmvvvvvvvvvvvvvmmmppppppppffffpprrrrwwpprsssspppppmpmvvvvvvvvvvvvvvmmpppwpppppppmmpprrrwwwwsssssspppwpffmvvvvvvvvvvvvvmmmffwwppppppmppmpfffwwmssfssspppprffmvvvvvvvvvvvvvvmmfwwwwppfssmpppmfffffwwsssmrprprrrfpmvvvvvvvvvvvvvmmmwwwwwfffspmppmrrppffppssmmpprrrrrpmvvvvvvvvvvvvvvmmwwwwwfffffpmmmrrrpffffpprpppprrrrrpmvvvvvvvvvvvvvmmmwwwwwppppfpssrpppfffffprrrrrrrssspmvvvvvvvvvvvvvvmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmvvvvvvvvvvvvvv",
  roads: [
    "10,15|11,14",
    "10,16|11,15",
    "11,14|12,14",
    "11,15|12,14",
    "12,11|13,10",
    "12,14|13,13",
    "13,10|14,9",
    "13,13|13,14",
    "13,13|14,12",
    "14,12|15,11",
    "14,9|15,8",
    "15,11|16,10",
    "15,16|16,15",
    "15,8|16,8",
    "16,10|17,9",
    "16,15|17,14",
    "16,8|17,8",
    "17,14|18,13",
    "17,8|18,8",
    "17,9|18,8",
    "18,10|18,11",
    "18,11|18,12",
    "18,12|18,13",
    "18,13|19,13",
    "18,7|18,8",
    "18,8|18,9",
    "18,8|19,7",
    "18,9|18,10",
    "19,13|20,13",
    "19,7|20,6",
    "20,13|21,13",
    "20,6|21,5",
    "21,13|21,14",
    "21,14|21,15",
    "21,14|22,14",
    "21,15|22,15",
    "21,5|22,4",
    "22,15|23,15",
    "22,4|23,3",
    "23,15|24,15",
    "23,3|24,2",
    "23,3|24,3",
    "24,15|25,15",
    "24,26|25,26",
    "24,2|25,2",
    "25,15|26,15",
    "25,26|25,27",
    "25,27|25,28",
    "25,28|26,28",
    "25,2|26,2",
    "26,15|27,15",
    "26,28|27,28",
    "26,2|27,2",
    "27,15|28,15",
    "27,28|28,28",
    "27,2|27,3",
    "27,3|27,4",
    "27,4|28,4",
    "28,15|29,15",
    "28,27|29,27",
    "28,28|29,27",
    "29,15|30,15",
    "29,27|30,26",
    "30,15|31,15",
    "30,16|31,16",
    "30,26|31,25",
    "31,15|31,16",
    "31,16|31,17",
    "31,17|32,17",
    "31,25|32,24",
    "32,17|33,17",
    "32,24|33,23",
    "33,17|34,17",
    "33,23|34,22",
    "34,17|34,18",
    "34,17|35,16",
    "34,18|34,19",
    "34,19|34,20",
    "34,20|34,21",
    "34,21|34,22",
    "34,22|34,23",
    "34,22|35,21",
    "34,22|35,22",
    "35,16|36,15",
    "35,21|36,20",
    "35,22|36,22",
    "36,15|37,14",
    "36,20|37,19",
    "36,22|37,22",
    "37,19|38,18",
    "37,22|38,21",
    "38,18|39,17",
    "38,21|39,20",
    "39,16|39,17",
    "39,17|40,16",
    "39,20|40,19",
    "40,16|41,15",
    "40,16|41,16",
    "41,15|42,14",
    "41,16|42,15",
    "42,14|43,13",
    "43,12|43,13",
    "9,17|10,16",
    "9,17|9,18"
  ],
  biome: "moor",
  players: [
    {
      pantheonId: "celtic"
    },
    {
      pantheonId: "norse"
    }
  ],
  sites: [
    {
      id: "barrow_1",
      kind: "prison",
      q: 22,
      r: 14,
      owner: 0,
      level: 5,
      name: "Barrow of the Lost Thane",
      guard: {
        creatureId: "norse_draugr",
        count: 26,
        label: "Barrow-wights"
      },
      text: "A captive hero of your own people is held in the barrow. Beat the wights, free them; they join you at level 5."
    },
    {
      id: "barrow_2",
      kind: "prison",
      q: 30,
      r: 16,
      owner: 1,
      level: 5,
      name: "Barrow of the Lost Thane",
      guard: {
        creatureId: "norse_draugr",
        count: 26,
        label: "Barrow-wights"
      },
      text: "A captive hero of your own people is held in the barrow. Beat the wights, free them; they join you at level 5."
    },
    {
      id: "cache_1",
      kind: "resource_cache",
      q: 20,
      r: 20
    },
    {
      id: "cache_2",
      kind: "resource_cache",
      q: 32,
      r: 10
    },
    {
      id: "camp_1",
      kind: "creature_camp",
      q: 15,
      r: 16,
      creatureId: "celtic_cu_sith",
      name: "Hound Kennels"
    },
    {
      id: "camp_2",
      kind: "creature_camp",
      q: 37,
      r: 14,
      creatureId: "celtic_cu_sith",
      name: "Hound Kennels"
    },
    {
      id: "chest_1",
      kind: "treasure_chest",
      q: 15,
      r: 4
    },
    {
      id: "chest_2",
      kind: "treasure_chest",
      q: 37,
      r: 26
    },
    {
      id: "crown",
      kind: "artifact",
      q: 26,
      r: 15,
      name: "Crown of the Barrow King",
      reward: {
        artifactRarity: "relic"
      },
      guard: {
        creatureId: "basilisk",
        count: 5,
        more: [
          {
            creatureId: "norse_draugr",
            count: 20
          }
        ],
        label: "The Barrow King\u2019s court"
      }
    },
    {
      id: "crystal_1",
      kind: "crystal_deposit",
      q: 9,
      r: 18,
      guard: {
        creatureId: "brigand",
        count: 22,
        label: "Bog brigands"
      }
    },
    {
      id: "crystal_2",
      kind: "crystal_deposit",
      q: 43,
      r: 12,
      guard: {
        creatureId: "brigand",
        count: 22,
        label: "Bog brigands"
      }
    },
    {
      id: "free_town_1",
      kind: "town",
      q: 10,
      r: 15
    },
    {
      id: "free_town_2",
      kind: "town",
      q: 42,
      r: 15
    },
    {
      id: "gold_1",
      kind: "gold_mine",
      q: 28,
      r: 4,
      name: "Barrow Gold Mine",
      guard: {
        creatureId: "ogre",
        count: 7,
        label: "Mound ogres"
      }
    },
    {
      id: "gold_2",
      kind: "gold_mine",
      q: 24,
      r: 26,
      name: "Barrow Gold Mine",
      guard: {
        creatureId: "ogre",
        count: 7,
        label: "Mound ogres"
      }
    },
    {
      id: "hut_defeat_1",
      kind: "quest_hut",
      q: 15,
      r: 19,
      name: "Mourner\u2019s Hut",
      quest: {
        type: "defeat",
        siteId: "barrow_1"
      },
      reward: {
        artifactId: "band_of_insight",
        xp: 1e3
      }
    },
    {
      id: "hut_defeat_2",
      kind: "quest_hut",
      q: 37,
      r: 11,
      name: "Mourner\u2019s Hut",
      quest: {
        type: "defeat",
        siteId: "barrow_2"
      },
      reward: {
        artifactId: "band_of_insight",
        xp: 1e3
      }
    },
    {
      id: "hut_deliver_1",
      kind: "quest_hut",
      q: 26,
      r: 8,
      name: "Grave-digger\u2019s Hut",
      quest: {
        type: "deliver",
        wood: 8,
        stone: 8
      },
      reward: {
        gold: 2500
      }
    },
    {
      id: "hut_deliver_2",
      kind: "quest_hut",
      q: 26,
      r: 22,
      name: "Grave-digger\u2019s Hut",
      quest: {
        type: "deliver",
        wood: 8,
        stone: 8
      },
      reward: {
        gold: 2500
      }
    },
    {
      id: "king_1",
      kind: "prison",
      q: 30,
      r: 9,
      level: 7,
      name: "Barrow of the Lost King",
      guard: {
        creatureId: "norse_deathless_draugr",
        count: 30,
        more: [
          {
            creatureId: "celtic_banshee",
            count: 4
          }
        ],
        label: "The king\u2019s deathless guard"
      }
    },
    {
      id: "king_2",
      kind: "prison",
      q: 22,
      r: 21,
      level: 7,
      name: "Barrow of the Lost King",
      guard: {
        creatureId: "norse_deathless_draugr",
        count: 30,
        more: [
          {
            creatureId: "celtic_banshee",
            count: 4
          }
        ],
        label: "The king\u2019s deathless guard"
      }
    },
    {
      id: "quarry_1",
      kind: "quarry",
      q: 24,
      r: 3
    },
    {
      id: "quarry_2",
      kind: "quarry",
      q: 28,
      r: 27
    },
    {
      id: "sawmill_1",
      kind: "sawmill",
      q: 12,
      r: 11
    },
    {
      id: "sawmill_2",
      kind: "sawmill",
      q: 40,
      r: 19
    },
    {
      id: "shrine_1",
      kind: "spell_shrine",
      q: 9,
      r: 21,
      spellId: "veil"
    },
    {
      id: "shrine_2",
      kind: "spell_shrine",
      q: 43,
      r: 9,
      spellId: "veil"
    },
    {
      id: "stone_1",
      kind: "learning_stone",
      q: 21,
      r: 10
    },
    {
      id: "stone_2",
      kind: "learning_stone",
      q: 31,
      r: 20
    },
    {
      id: "tent_1",
      kind: "key_tent",
      q: 13,
      r: 8,
      color: "amber"
    },
    {
      id: "tent_2",
      kind: "key_tent",
      q: 39,
      r: 22,
      color: "violet"
    },
    {
      id: "tower_1",
      kind: "watchtower",
      q: 18,
      r: 18,
      radius: 10,
      name: "Tor Watchtower",
      text: "From the tor the fog thins: every site within 10 hexes shows on your map."
    },
    {
      id: "tower_2",
      kind: "watchtower",
      q: 34,
      r: 12,
      radius: 10,
      name: "Tor Watchtower",
      text: "From the tor the fog thins: every site within 10 hexes shows on your map."
    },
    {
      id: "town_1",
      kind: "town",
      q: 18,
      r: 7,
      owner: 0
    },
    {
      id: "town_2",
      kind: "town",
      q: 34,
      r: 23,
      owner: 1
    },
    {
      id: "vault_art_1",
      kind: "artifact",
      q: 36,
      r: 5,
      name: "The Lost King\u2019s Hoard",
      reward: {
        artifactRarity: "major",
        gold: 2e3
      },
      guard: {
        creatureId: "basilisk",
        count: 3,
        label: "Hoard basilisks"
      }
    },
    {
      id: "vault_art_2",
      kind: "artifact",
      q: 16,
      r: 25,
      name: "The Lost King\u2019s Hoard",
      reward: {
        artifactRarity: "major",
        gold: 2e3
      },
      guard: {
        creatureId: "basilisk",
        count: 3,
        label: "Hoard basilisks"
      }
    },
    {
      id: "vault_chest_1",
      kind: "treasure_chest",
      q: 37,
      r: 5
    },
    {
      id: "vault_chest_2",
      kind: "treasure_chest",
      q: 15,
      r: 25
    },
    {
      id: "vault_gate_1",
      kind: "key_gate",
      q: 34,
      r: 7,
      color: "amber",
      name: "Amber Barrow Gate"
    },
    {
      id: "vault_gate_2",
      kind: "key_gate",
      q: 18,
      r: 23,
      color: "violet",
      name: "Violet Barrow Gate"
    },
    {
      id: "windmill_1",
      kind: "windmill",
      q: 13,
      r: 14
    },
    {
      id: "windmill_2",
      kind: "windmill",
      q: 39,
      r: 16
    }
  ],
  victory: {
    type: "elimination"
  },
  startWealth: "normal"
};

// ../pantheon_realms/packages/content/src/skirmish/maps/golden_fords.prmap.json
var golden_fords_prmap_default = {
  format: "pantheon-realms-map",
  version: 1,
  name: "The Golden Fords",
  description: "A rich autumn valley between two rivers. Three guarded fords cross each river into the fields between them, full of mines and mills. Twice the usual treasury and a revealed map: a fast, open game.",
  author: "Pantheon Realms",
  width: 52,
  height: 30,
  terrain: "vvvvvvvvvvvvvvmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmvvvvvvvvvvvvvvmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmvvvvvvvvvvvvvmmmppppppffpppwwppppppppffwwppfppppfpmvvvvvvvvvvvvvvmmppppppffpppwwpppppppppfwwppffprppfrmvvvvvvvvvvvvvmmmppppppfppppwwppppppppffwwppfprrpppmvvvvvvvvvvvvvvmmprrrrppppppwwppppppppppwwppppprppppmvvvvvvvvvvvvvmmmrrrpppppppwwfpppppppppwwppppprrpppmvvvvvvvvvvvvvvmmprrppppppppppppppppppppppppppprpppfmvvvvvvvvvvvvvmmmppppppfpppwwppppppppppwwffpppppppfmvvvvvvvvvvvvvvmmpffpppffppwwpppppfppppwwffppppppfffmvvvvvvvvvvvvvmmmpfpppppppwwppppppppppwwfffppppppffmvvvvvvvvvvvvvvmmppppppppppwwfpppppppppwwfffpppppfffmvvvvvvvvvvvvvmmmprrrrrrppwwffppppppppwwpffprrpffppmvvvvvvvvvvvvvvmmpprrprrpppwwppppppppppwwfffrrfpfffpmvvvvvvvvvvvvvmmmpfppppffffwwppppppppppwwffffppppffmvvvvvvvvvvvvvvmmpffpppffffpppppppppppppppffffpppffpmvvvvvvvvvvvvvmmmffppppffffwwppppppppppwwffffppppfpmvvvvvvvvvvvvvvmmpfffpfrrfffwwppppppppppwwppprrprrppmvvvvvvvvvvvvvmmmppffprrpffpwwppppppppffwwpprrrrrrpmvvvvvvvvvvvvvvmmfffpppppfffwwpppppppppfwwppppppppppmvvvvvvvvvvvvvmmmffppppppfffwwppppppppppwwpppppppfpmvvvvvvvvvvvvvvmmfffppppppffwwppppfpppppwwppffpppffpmvvvvvvvvvvvvvmmmfpppppppffwwppppppppppwwpppfppppppmvvvvvvvvvvvvvvmmfppprppppppppppppppppppppppppppprrpmvvvvvvvvvvvvvmmmppprrpppppwwpppppppppfwwppppppprrrmvvvvvvvvvvvvvvmmpppprpppppwwppppppppppwwpppppprrrrpmvvvvvvvvvvvvvmmmppprrpfppwwffppppppppwwppppfppppppmvvvvvvvvvvvvvvmmrfpprpffppwwfpppppppppwwpppffppppppmvvvvvvvvvvvvvmmmpfppppfppwwffppppppppwwpppffppppppmvvvvvvvvvvvvvvmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmvvvvvvvvvvvvvv",
  roads: [
    "10,19|11,18",
    "10,23|11,22",
    "11,18|11,19",
    "11,18|12,17",
    "11,19|11,20",
    "11,20|11,21",
    "11,21|11,22",
    "11,22|11,23",
    "11,23|11,24",
    "11,23|12,23",
    "11,24|11,25",
    "12,17|13,16",
    "12,23|13,23",
    "13,15|14,15",
    "13,16|14,15",
    "13,23|14,23",
    "14,10|14,11",
    "14,11|14,12",
    "14,12|14,13",
    "14,12|15,11",
    "14,13|14,14",
    "14,14|14,15",
    "14,15|15,14",
    "14,15|15,15",
    "14,23|15,23",
    "14,8|14,9",
    "14,9|14,10",
    "15,11|16,10",
    "15,14|16,13",
    "15,15|16,15",
    "15,23|16,23",
    "16,10|17,9",
    "16,13|17,12",
    "16,13|17,13",
    "16,15|17,15",
    "16,23|17,23",
    "17,12|18,11",
    "17,13|18,12",
    "17,15|18,15",
    "17,23|18,23",
    "17,9|18,8",
    "18,11|19,10",
    "18,12|19,11",
    "18,15|19,15",
    "18,8|19,7",
    "19,10|20,9",
    "19,15|20,15",
    "19,7|20,6",
    "20,15|21,15",
    "20,6|21,5",
    "20,9|21,8",
    "21,15|22,15",
    "21,8|22,7",
    "22,15|23,14",
    "22,15|23,15",
    "22,7|23,7",
    "23,14|24,13",
    "23,15|24,15",
    "23,7|24,7",
    "24,15|25,15",
    "24,7|25,7",
    "25,15|26,15",
    "25,21|25,22",
    "25,22|25,23",
    "25,23|26,23",
    "25,7|26,7",
    "26,15|27,15",
    "26,23|27,23",
    "26,7|27,7",
    "27,15|28,15",
    "27,23|28,23",
    "27,7|27,8",
    "27,8|27,9",
    "28,15|29,15",
    "28,17|29,16",
    "28,23|29,23",
    "29,15|30,15",
    "29,16|30,15",
    "29,23|30,23",
    "30,15|31,15",
    "30,23|31,22",
    "31,15|32,15",
    "31,22|32,21",
    "31,25|32,24",
    "32,15|33,15",
    "32,21|33,20",
    "32,24|33,23",
    "33,15|34,15",
    "33,19|34,18",
    "33,20|34,19",
    "33,23|34,22",
    "34,15|35,15",
    "34,18|35,17",
    "34,19|35,18",
    "34,22|35,21",
    "34,7|35,7",
    "35,15|36,15",
    "35,17|36,17",
    "35,18|36,17",
    "35,21|36,20",
    "35,7|36,7",
    "36,15|37,15",
    "36,17|37,16",
    "36,20|37,19",
    "36,7|37,7",
    "37,15|38,15",
    "37,16|38,15",
    "37,19|38,18",
    "37,7|38,7",
    "38,15|38,16",
    "38,15|39,14",
    "38,15|39,15",
    "38,16|38,17",
    "38,17|38,18",
    "38,18|38,19",
    "38,19|38,20",
    "38,20|38,21",
    "38,21|38,22",
    "38,7|39,7",
    "39,14|40,13",
    "39,7|40,7",
    "40,13|41,12",
    "40,7|41,7",
    "41,10|41,11",
    "41,11|41,12",
    "41,12|42,11",
    "41,5|41,6",
    "41,6|41,7",
    "41,7|41,8",
    "41,8|41,9",
    "41,8|42,7",
    "41,9|41,10",
    "42,11|43,10",
    "43,10|44,9",
    "44,9|45,8",
    "7,22|8,21",
    "8,21|9,20",
    "9,20|10,19"
  ],
  biome: "autumn",
  players: [
    {
      pantheonId: "greek"
    },
    {
      pantheonId: "egyptian"
    }
  ],
  sites: [
    {
      id: "camp_1",
      kind: "creature_camp",
      q: 9,
      r: 18,
      creatureId: "hill_slinger",
      name: "Slingers\u2019 Lodge"
    },
    {
      id: "camp_2",
      kind: "creature_camp",
      q: 43,
      r: 12,
      creatureId: "hill_slinger",
      name: "Slingers\u2019 Lodge"
    },
    {
      id: "chest_1",
      kind: "treasure_chest",
      q: 5,
      r: 26
    },
    {
      id: "chest_2",
      kind: "treasure_chest",
      q: 47,
      r: 4
    },
    {
      id: "crystal_1",
      kind: "crystal_deposit",
      q: 11,
      r: 25,
      guard: {
        creatureId: "brigand",
        count: 20,
        label: "Hedge brigands"
      }
    },
    {
      id: "crystal_2",
      kind: "crystal_deposit",
      q: 41,
      r: 5,
      guard: {
        creatureId: "brigand",
        count: 20,
        label: "Hedge brigands"
      }
    },
    {
      id: "ford_c_1",
      kind: "monster",
      q: 20,
      r: 15,
      name: "Golden Ford",
      guard: {
        creatureId: "centaur",
        count: 13,
        label: "Ford keepers"
      }
    },
    {
      id: "ford_c_2",
      kind: "monster",
      q: 32,
      r: 15,
      name: "Golden Ford",
      guard: {
        creatureId: "centaur",
        count: 13,
        label: "Ford keepers"
      }
    },
    {
      id: "ford_n_1",
      kind: "monster",
      q: 24,
      r: 7,
      name: "North Ford",
      guard: {
        creatureId: "brigand",
        count: 40,
        label: "Ford brigands"
      }
    },
    {
      id: "ford_n_2",
      kind: "monster",
      q: 28,
      r: 23,
      name: "North Ford",
      guard: {
        creatureId: "brigand",
        count: 40,
        label: "Ford brigands"
      }
    },
    {
      id: "ford_s_1",
      kind: "monster",
      q: 16,
      r: 23,
      name: "South Ford",
      guard: {
        creatureId: "wild_boar",
        count: 22,
        label: "River boars"
      }
    },
    {
      id: "ford_s_2",
      kind: "monster",
      q: 36,
      r: 7,
      name: "South Ford",
      guard: {
        creatureId: "wild_boar",
        count: 22,
        label: "River boars"
      }
    },
    {
      id: "free_town_1",
      kind: "town",
      q: 10,
      r: 23
    },
    {
      id: "free_town_2",
      kind: "town",
      q: 42,
      r: 7
    },
    {
      id: "gold_1",
      kind: "gold_mine",
      q: 21,
      r: 5
    },
    {
      id: "gold_2",
      kind: "gold_mine",
      q: 31,
      r: 25
    },
    {
      id: "horn",
      kind: "artifact",
      q: 26,
      r: 15,
      name: "The Horn of Plenty",
      reward: {
        artifactId: "cornucopia"
      },
      guard: {
        creatureId: "basilisk",
        count: 4,
        more: [
          {
            creatureId: "ogre",
            count: 6
          }
        ],
        label: "Keepers of the Horn"
      },
      text: "The Horn of Plenty rests on the harvest altar between the rivers, watched by its keepers."
    },
    {
      id: "mid_camp_1",
      kind: "creature_camp",
      q: 24,
      r: 13,
      creatureId: "centaur",
      name: "Centaur Camp"
    },
    {
      id: "mid_camp_2",
      kind: "creature_camp",
      q: 28,
      r: 17,
      creatureId: "centaur",
      name: "Centaur Camp"
    },
    {
      id: "mid_chest_1",
      kind: "treasure_chest",
      q: 25,
      r: 20,
      guard: {
        creatureId: "wild_boar",
        count: 12,
        label: "Orchard boars"
      }
    },
    {
      id: "mid_chest_2",
      kind: "treasure_chest",
      q: 27,
      r: 10,
      guard: {
        creatureId: "wild_boar",
        count: 12,
        label: "Orchard boars"
      }
    },
    {
      id: "mid_crystal_1",
      kind: "crystal_deposit",
      q: 19,
      r: 24,
      guard: {
        creatureId: "clay_golem",
        count: 9,
        label: "Clay golems"
      }
    },
    {
      id: "mid_crystal_2",
      kind: "crystal_deposit",
      q: 33,
      r: 6,
      guard: {
        creatureId: "clay_golem",
        count: 9,
        label: "Clay golems"
      }
    },
    {
      id: "mid_gold_1",
      kind: "gold_mine",
      q: 27,
      r: 9,
      name: "Golden Mine",
      guard: {
        creatureId: "ogre",
        count: 7,
        label: "Mine ogres"
      }
    },
    {
      id: "mid_gold_2",
      kind: "gold_mine",
      q: 25,
      r: 21,
      name: "Golden Mine",
      guard: {
        creatureId: "ogre",
        count: 7,
        label: "Mine ogres"
      }
    },
    {
      id: "mid_mill_1",
      kind: "windmill",
      q: 29,
      r: 4,
      name: "Golden Mill"
    },
    {
      id: "mid_mill_2",
      kind: "windmill",
      q: 23,
      r: 26,
      name: "Golden Mill"
    },
    {
      id: "mid_sawmill_1",
      kind: "sawmill",
      q: 22,
      r: 18
    },
    {
      id: "mid_sawmill_2",
      kind: "sawmill",
      q: 30,
      r: 12
    },
    {
      id: "mid_stone_1",
      kind: "learning_stone",
      q: 33,
      r: 5
    },
    {
      id: "mid_stone_2",
      kind: "learning_stone",
      q: 19,
      r: 25
    },
    {
      id: "quarry_1",
      kind: "quarry",
      q: 7,
      r: 22
    },
    {
      id: "quarry_2",
      kind: "quarry",
      q: 45,
      r: 8
    },
    {
      id: "sawmill_1",
      kind: "sawmill",
      q: 14,
      r: 8
    },
    {
      id: "sawmill_2",
      kind: "sawmill",
      q: 38,
      r: 22
    },
    {
      id: "shrine_1",
      kind: "spell_shrine",
      q: 11,
      r: 12,
      spellId: "blessing"
    },
    {
      id: "shrine_2",
      kind: "spell_shrine",
      q: 41,
      r: 18,
      spellId: "blessing"
    },
    {
      id: "stone_1",
      kind: "learning_stone",
      q: 14,
      r: 20
    },
    {
      id: "stone_2",
      kind: "learning_stone",
      q: 38,
      r: 10
    },
    {
      id: "town_1",
      kind: "town",
      q: 13,
      r: 15,
      owner: 0
    },
    {
      id: "town_2",
      kind: "town",
      q: 39,
      r: 15,
      owner: 1
    },
    {
      id: "windmill_1",
      kind: "windmill",
      q: 19,
      r: 11
    },
    {
      id: "windmill_2",
      kind: "windmill",
      q: 33,
      r: 19
    }
  ],
  victory: {
    type: "elimination"
  },
  startWealth: "high",
  revealMap: true
};

// ../pantheon_realms/packages/content/src/skirmish/maps/six_thrones.prmap.json
var six_thrones_prmap_default = {
  format: "pantheon-realms-map",
  version: 1,
  name: "The Six Thrones",
  description: "One island, six thrones. Each empire holds a wedge of land between two ridges, with one guarded pass to each neighbour and one guarded path to the Shrine at the heart of the island. Hold the Shrine ten days, or conquer.",
  author: "Pantheon Realms",
  width: 95,
  height: 56,
  terrain: "vvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwppppprrwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwwwwwwwwwwwwwwwwpfffpppprrfffrwwwwwwwwwwwwwwwwwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwwwwwwwwwwwwwwwppffffpppprffffffpwwwwwwwwwwwwwwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwwwwwwwwwwwwmppppfrfppppffffffffpmwwwwwwwwwwwwwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwwwwwwwwwwwmmmpfffpppppfffffpffffmmmwwwwwwwwwwwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwwwwwwwwwppmmmffrffpmpppmffmpfrrmmmpwwwwwwwwwwwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwwwwwwwwwfffmmmfprfprrpppfffffprmmmpppwwwwwwwwwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwwwwwwwrfffrmmmpfrrrpppppppffprmmmffpppwwwwwwwwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwwwwwwwffffrrmmmpfrrpppppppfffrmmmfffpffwwwwwwwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwwwwwwfffffprmmmpfrppppppppffpmmmpprffffwwwwwwwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwwwwwrfffppfprmmpfppmppfpppfpfmmmpfrfprffpwwwwwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwwwwrrfffmfffpmpmffpppffpppfpppppfrffpffppwwwwwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwwwwprrffffffffpmmfpppffffprrmmmffrrpppppppwwwwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwwwpppffffpffppmmmppppppfffrmmmfprrrrmpppppwwwwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwwwppppfmfpppffrmmmpfpppppfrmmmffpppprppppppwwwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwwppppfppppppprrmmmrrppppffmmmpppmpppppfpprrwwwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwwpppppppppppppfrmmmrrpppppmmmppppppppppffrrrwwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwwffpppppppppffffmmmppppppmmmrfppppppppmffffwwwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwwfffpmrpppffffpfpmmmmmpmmmmmrrppfffpppffffffwwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwffrpprppppffpppppmmmmppmmmmprpppffppppffffffwwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwpffpfprppppfpppppmmmmmpmmmmmpppppfpppppfmpffrwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwppfffrrpmpppppppmmmmppppmmmmppppffpppfffpfffwwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwppfrrrrrppppppppppmpppppppmppppppfppfffffffffwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwpffpfffpfppfrrpmppppppppppppmppfffrfpffpprffpwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwppffpppfffpprrpmmmpppppppppmmmppfrrrpfprrrrfpwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwmmmmmmmpmmmmmmmmmmppppppppppmmmmmmmmmpmmmmmmmmwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwmmmmmmmpmmmmmmmmmmpppppppppmmmmmmmmmmpmmmmmmmwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwmmmmmmmmpmmmmmmmmmppppppppppmmmmmmmmmmpmmmmmmmwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwpfrrrrpfprrrfppmmmpppppppppmmmprrppfffpppffppwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwpffrppffpfrfffppmppppppppppppmprrfppfpfffpffpwwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwfffffffffppfppppppmpppppppmpppppppppprrrrrfppwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwfffpfffpppffppppmmmmppppmmmmpppppppmprrfffppwwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwrffpmfpppppfpppppmmmmmpmmmmmpppppfpppprpfpffpwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwffffffppppffppprpmmmmppmmmmpppppffpppprpprffwwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwwffffffpppfffpprrmmmmmpmmmmmpfpffffppprmpfffwwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwwffffmppppppppfrmmmppppppmmmffffpppppppppffwwwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwwrrrffppppppppppmmmppppprrmmmrfpppppppppppppwwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwwrrppfpppppmpppmmmffpppprrmmmrrpppppppfppppwwwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwwwpppppprppppffmmmrfpppppfpmmmrffpppfmfppppwwwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwwwpppppmrrrrpfmmmrfffppppppmmmppffpffffpppwwwwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwwwwppppppprrffmmmrrpffffpppfmmpffffffffrrpwwwwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwwwwppffpffrfpppppfpppffpppffmpmpfffmfffrrwwwwwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwwwwwpffrpfrfpmmmfpfpppfppmppfpmmrpfppfffrwwwwwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwwwwwwffffrppmmmpffpppppppprfpmmmrpfffffwwwwwwwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwwwwwwwffpfffmmmrfffppppppprrfpmmmrrffffwwwwwwwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwwwwwwwpppffmmmrpffppppppprrrfpmmmrfffrwwwwwwwwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwwwwwwwwwpppmmmrpfffffppprrpfrpfmmmfffwwwwwwwwwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwwwwwwwwwwpmmmrrfpmffmpppmpffrffmmmppwwwwwwwwwwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwwwwwwwwwwwmmmffffpfffffpppppfffpmmmwwwwwwwwwwwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwwwwwwwwwwwwmpffffffffppppfrfppppmwwwwwwwwwwwwwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwwwwwwwwwwwwwwpffffffrppppffffppwwwwwwwwwwwwwwwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwwwwwwwwwwwwwwwwrfffrrppppfffpwwwwwwwwwwwwwwwwwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwrrpppppwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvvwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwvvvvvvvvvvvvvvvvvvvvvvvvvvv",
  roads: [
    "24,44|24,45",
    "24,44|25,43",
    "24,45|24,46",
    "24,46|24,47",
    "25,34|25,35",
    "25,35|26,35",
    "25,41|25,42",
    "25,41|26,40",
    "25,42|25,43",
    "25,43|25,44",
    "26,35|27,35",
    "26,40|27,39",
    "27,35|28,35",
    "27,38|28,38",
    "27,39|28,38",
    "28,24|29,23",
    "28,35|28,36",
    "28,36|28,37",
    "28,37|28,38",
    "28,37|29,36",
    "28,38|29,38",
    "29,23|30,22",
    "29,36|30,35",
    "29,38|30,38",
    "29,43|30,43",
    "30,22|31,21",
    "30,35|31,34",
    "30,38|30,39",
    "30,38|31,38",
    "30,39|30,40",
    "30,40|31,40",
    "30,43|31,43",
    "31,21|32,21",
    "31,22|32,21",
    "31,31|31,32",
    "31,32|31,33",
    "31,32|32,31",
    "31,33|31,34",
    "31,34|32,33",
    "31,38|32,38",
    "31,40|31,41",
    "31,43|32,43",
    "31,50|32,50",
    "32,21|33,20",
    "32,25|32,26",
    "32,26|32,27",
    "32,27|32,28",
    "32,28|32,29",
    "32,29|32,30",
    "32,30|32,31",
    "32,33|33,32",
    "32,38|33,37",
    "32,38|33,38",
    "32,43|33,43",
    "32,50|33,49",
    "33,20|34,19",
    "33,37|34,36",
    "33,43|34,43",
    "33,49|34,48",
    "34,19|35,19",
    "34,25|35,24",
    "34,36|35,35",
    "34,43|35,43",
    "34,44|35,44",
    "34,48|35,47",
    "35,19|36,19",
    "35,23|35,24",
    "35,23|36,22",
    "35,35|36,35",
    "35,43|35,44",
    "35,44|36,44",
    "35,47|36,47",
    "36,19|37,19",
    "36,22|37,21",
    "36,35|37,34",
    "36,44|37,44",
    "36,47|37,47",
    "37,18|37,19",
    "37,19|37,20",
    "37,19|38,18",
    "37,20|37,21",
    "37,21|37,22",
    "37,22|37,23",
    "37,23|37,24",
    "37,23|38,23",
    "37,34|38,33",
    "37,42|37,43",
    "37,43|37,44",
    "37,44|37,45",
    "37,45|37,46",
    "37,46|37,47",
    "37,47|38,47",
    "37,48|38,47",
    "38,18|39,17",
    "38,18|39,18",
    "38,23|39,23",
    "38,33|39,32",
    "38,47|38,48",
    "38,47|39,46",
    "38,48|38,49",
    "38,49|38,50",
    "38,50|39,50",
    "39,17|40,16",
    "39,18|40,18",
    "39,23|40,23",
    "39,46|40,45",
    "39,50|40,50",
    "40,13|40,14",
    "40,13|41,12",
    "40,14|40,15",
    "40,15|40,16",
    "40,18|41,18",
    "40,23|40,24",
    "40,24|41,24",
    "40,45|41,44",
    "40,45|41,45",
    "40,50|40,51",
    "40,50|41,50",
    "40,51|41,51",
    "41,18|42,17",
    "41,18|42,18",
    "41,24|42,24",
    "41,44|42,43",
    "41,45|42,45",
    "41,51|42,51",
    "42,17|43,16",
    "42,18|43,18",
    "42,24|43,24",
    "42,40|42,41",
    "42,40|43,39",
    "42,41|42,42",
    "42,42|42,43",
    "42,43|43,42",
    "42,45|43,44",
    "42,51|43,51",
    "43,16|44,15",
    "43,16|44,16",
    "43,36|43,37",
    "43,37|43,38",
    "43,38|43,39",
    "43,44|44,44",
    "44,16|45,15",
    "44,46|45,45",
    "45,15|46,14",
    "45,45|46,44",
    "46,14|47,13",
    "46,44|47,43",
    "47,13|48,12",
    "47,43|48,42",
    "48,12|49,11",
    "48,42|49,41",
    "49,11|50,10",
    "49,41|50,40",
    "50,12|51,12",
    "50,40|51,40",
    "50,41|51,40",
    "51,12|52,11",
    "51,14|52,13",
    "51,17|51,18",
    "51,17|52,16",
    "51,18|51,19",
    "51,19|51,20",
    "51,32|52,32",
    "51,38|52,38",
    "51,40|52,39",
    "51,5|52,5",
    "52,11|53,11",
    "52,13|52,14",
    "52,13|53,12",
    "52,14|52,15",
    "52,15|52,16",
    "52,32|53,32",
    "52,38|53,38",
    "52,39|53,38",
    "52,5|53,5",
    "53,11|54,11",
    "53,12|54,11",
    "53,32|54,32",
    "53,38|54,38",
    "53,44|54,43",
    "53,5|54,5",
    "53,6|54,6",
    "54,11|55,10",
    "54,32|54,33",
    "54,33|55,33",
    "54,38|55,38",
    "54,40|54,41",
    "54,40|55,39",
    "54,41|54,42",
    "54,42|54,43",
    "54,5|54,6",
    "54,6|55,6",
    "55,10|56,9",
    "55,24|56,23",
    "55,33|56,33",
    "55,38|56,38",
    "55,39|56,38",
    "55,6|56,6",
    "56,23|57,22",
    "56,33|57,33",
    "56,38|57,37",
    "56,6|56,7",
    "56,7|56,8",
    "56,8|56,9",
    "56,9|57,8",
    "56,9|57,9",
    "57,10|57,11",
    "57,11|57,12",
    "57,12|57,13",
    "57,12|58,12",
    "57,13|57,14",
    "57,22|58,21",
    "57,32|57,33",
    "57,33|57,34",
    "57,34|57,35",
    "57,35|57,36",
    "57,35|58,34",
    "57,36|57,37",
    "57,37|57,38",
    "57,37|58,37",
    "57,9|57,10",
    "57,9|58,9",
    "58,12|59,12",
    "58,21|59,21",
    "58,34|59,33",
    "58,37|59,37",
    "58,9|59,9",
    "59,12|59,13",
    "59,12|60,12",
    "59,13|60,13",
    "59,21|60,20",
    "59,32|59,33",
    "59,32|60,31",
    "59,37|60,37",
    "59,9|60,8",
    "60,13|61,13",
    "60,20|61,19",
    "60,37|61,36",
    "60,8|61,7",
    "61,13|62,13",
    "61,18|62,18",
    "61,19|62,18",
    "61,24|62,23",
    "61,36|62,35",
    "61,7|62,6",
    "62,13|63,13",
    "62,18|63,18",
    "62,23|63,22",
    "62,25|62,26",
    "62,25|63,24",
    "62,26|62,27",
    "62,27|62,28",
    "62,28|62,29",
    "62,29|62,30",
    "62,30|62,31",
    "62,35|63,34",
    "62,35|63,35",
    "62,6|63,6",
    "63,13|64,13",
    "63,15|63,16",
    "63,16|64,16",
    "63,18|64,18",
    "63,22|63,23",
    "63,22|64,21",
    "63,23|63,24",
    "63,24|63,25",
    "63,35|64,34",
    "64,13|65,13",
    "64,16|64,17",
    "64,17|64,18",
    "64,18|65,18",
    "64,21|65,20",
    "64,34|65,33",
    "65,18|66,18",
    "65,20|66,19",
    "65,33|66,32",
    "66,18|66,19",
    "66,18|67,17",
    "66,18|67,18",
    "66,19|66,20",
    "66,20|66,21",
    "66,21|67,21",
    "67,17|68,16",
    "67,21|68,21",
    "68,16|69,15",
    "68,21|69,21",
    "69,12|69,13",
    "69,13|69,14",
    "69,13|70,12",
    "69,14|69,15",
    "69,21|69,22",
    "70,10|70,11",
    "70,11|70,12",
    "70,9|70,10"
  ],
  biome: "coast",
  players: [
    {
      pantheonId: "greek"
    },
    {
      pantheonId: "norse"
    },
    {
      pantheonId: "egyptian"
    },
    {
      pantheonId: "japanese"
    },
    {
      pantheonId: "celtic"
    },
    {
      pantheonId: "mesoamerican"
    }
  ],
  sites: [
    {
      id: "cache_1",
      kind: "resource_cache",
      q: 64,
      r: 8
    },
    {
      id: "cache_2",
      kind: "resource_cache",
      q: 67,
      r: 25
    },
    {
      id: "cache_3",
      kind: "resource_cache",
      q: 50,
      r: 45
    },
    {
      id: "cache_4",
      kind: "resource_cache",
      q: 30,
      r: 48
    },
    {
      id: "cache_5",
      kind: "resource_cache",
      q: 27,
      r: 31
    },
    {
      id: "cache_6",
      kind: "resource_cache",
      q: 44,
      r: 11
    },
    {
      id: "camp_1",
      kind: "creature_camp",
      q: 50,
      r: 8,
      creatureId: "centaur",
      name: "Centaur Camp"
    },
    {
      id: "camp_2",
      kind: "creature_camp",
      q: 67,
      r: 11,
      creatureId: "centaur",
      name: "Centaur Camp"
    },
    {
      id: "camp_3",
      kind: "creature_camp",
      q: 64,
      r: 31,
      creatureId: "centaur",
      name: "Centaur Camp"
    },
    {
      id: "camp_4",
      kind: "creature_camp",
      q: 44,
      r: 48,
      creatureId: "centaur",
      name: "Centaur Camp"
    },
    {
      id: "camp_5",
      kind: "creature_camp",
      q: 27,
      r: 45,
      creatureId: "centaur",
      name: "Centaur Camp"
    },
    {
      id: "camp_6",
      kind: "creature_camp",
      q: 30,
      r: 25,
      creatureId: "centaur",
      name: "Centaur Camp"
    },
    {
      id: "chest_1",
      kind: "treasure_chest",
      q: 59,
      r: 4
    },
    {
      id: "chest_2",
      kind: "treasure_chest",
      q: 71,
      r: 16
    },
    {
      id: "chest_3",
      kind: "treasure_chest",
      q: 59,
      r: 40
    },
    {
      id: "chest_4",
      kind: "treasure_chest",
      q: 35,
      r: 52
    },
    {
      id: "chest_5",
      kind: "treasure_chest",
      q: 23,
      r: 40
    },
    {
      id: "chest_6",
      kind: "treasure_chest",
      q: 35,
      r: 16
    },
    {
      id: "crystal_1",
      kind: "crystal_deposit",
      q: 57,
      r: 14,
      guard: {
        creatureId: "hill_slinger",
        count: 14,
        label: "Cave slingers"
      }
    },
    {
      id: "crystal_2",
      kind: "crystal_deposit",
      q: 61,
      r: 24,
      guard: {
        creatureId: "hill_slinger",
        count: 14,
        label: "Cave slingers"
      }
    },
    {
      id: "crystal_3",
      kind: "crystal_deposit",
      q: 51,
      r: 38,
      guard: {
        creatureId: "hill_slinger",
        count: 14,
        label: "Cave slingers"
      }
    },
    {
      id: "crystal_4",
      kind: "crystal_deposit",
      q: 37,
      r: 42,
      guard: {
        creatureId: "hill_slinger",
        count: 14,
        label: "Cave slingers"
      }
    },
    {
      id: "crystal_5",
      kind: "crystal_deposit",
      q: 33,
      r: 32,
      guard: {
        creatureId: "hill_slinger",
        count: 14,
        label: "Cave slingers"
      }
    },
    {
      id: "crystal_6",
      kind: "crystal_deposit",
      q: 43,
      r: 18,
      guard: {
        creatureId: "hill_slinger",
        count: 14,
        label: "Cave slingers"
      }
    },
    {
      id: "free_town_1",
      kind: "town",
      q: 51,
      r: 5
    },
    {
      id: "free_town_2",
      kind: "town",
      q: 70,
      r: 9
    },
    {
      id: "free_town_3",
      kind: "town",
      q: 66,
      r: 32
    },
    {
      id: "free_town_4",
      kind: "town",
      q: 43,
      r: 51
    },
    {
      id: "free_town_5",
      kind: "town",
      q: 24,
      r: 47
    },
    {
      id: "free_town_6",
      kind: "town",
      q: 28,
      r: 24
    },
    {
      id: "gold_1",
      kind: "gold_mine",
      q: 51,
      r: 14,
      guard: {
        creatureId: "wild_boar",
        count: 24,
        label: "Highland boars"
      }
    },
    {
      id: "gold_2",
      kind: "gold_mine",
      q: 61,
      r: 18,
      guard: {
        creatureId: "wild_boar",
        count: 24,
        label: "Highland boars"
      }
    },
    {
      id: "gold_3",
      kind: "gold_mine",
      q: 57,
      r: 32,
      guard: {
        creatureId: "wild_boar",
        count: 24,
        label: "Highland boars"
      }
    },
    {
      id: "gold_4",
      kind: "gold_mine",
      q: 43,
      r: 42,
      guard: {
        creatureId: "wild_boar",
        count: 24,
        label: "Highland boars"
      }
    },
    {
      id: "gold_5",
      kind: "gold_mine",
      q: 33,
      r: 38,
      guard: {
        creatureId: "wild_boar",
        count: 24,
        label: "Highland boars"
      }
    },
    {
      id: "gold_6",
      kind: "gold_mine",
      q: 37,
      r: 24,
      guard: {
        creatureId: "wild_boar",
        count: 24,
        label: "Highland boars"
      }
    },
    {
      id: "path_guard_1",
      kind: "monster",
      q: 51,
      r: 20,
      name: "Throne Path",
      guard: {
        creatureId: "wyvern",
        count: 6,
        label: "Shrine-path wyverns"
      }
    },
    {
      id: "path_guard_2",
      kind: "monster",
      q: 55,
      r: 24,
      name: "Throne Path",
      guard: {
        creatureId: "wyvern",
        count: 6,
        label: "Shrine-path wyverns"
      }
    },
    {
      id: "path_guard_3",
      kind: "monster",
      q: 51,
      r: 32,
      name: "Throne Path",
      guard: {
        creatureId: "wyvern",
        count: 6,
        label: "Shrine-path wyverns"
      }
    },
    {
      id: "path_guard_4",
      kind: "monster",
      q: 43,
      r: 36,
      name: "Throne Path",
      guard: {
        creatureId: "wyvern",
        count: 6,
        label: "Shrine-path wyverns"
      }
    },
    {
      id: "path_guard_5",
      kind: "monster",
      q: 39,
      r: 32,
      name: "Throne Path",
      guard: {
        creatureId: "wyvern",
        count: 6,
        label: "Shrine-path wyverns"
      }
    },
    {
      id: "path_guard_6",
      kind: "monster",
      q: 43,
      r: 24,
      name: "Throne Path",
      guard: {
        creatureId: "wyvern",
        count: 6,
        label: "Shrine-path wyverns"
      }
    },
    {
      id: "quarry_1",
      kind: "quarry",
      q: 63,
      r: 6
    },
    {
      id: "quarry_2",
      kind: "quarry",
      q: 69,
      r: 22
    },
    {
      id: "quarry_3",
      kind: "quarry",
      q: 53,
      r: 44
    },
    {
      id: "quarry_4",
      kind: "quarry",
      q: 31,
      r: 50
    },
    {
      id: "quarry_5",
      kind: "quarry",
      q: 25,
      r: 34
    },
    {
      id: "quarry_6",
      kind: "quarry",
      q: 41,
      r: 12
    },
    {
      id: "relic",
      kind: "relic",
      q: 47,
      r: 28,
      name: "The Shrine of Six Thrones",
      guard: {
        creatureId: "basilisk",
        count: 6,
        more: [
          {
            creatureId: "wyvern",
            count: 8
          }
        ],
        label: "Shrine wardens"
      }
    },
    {
      id: "ridge_guard_1",
      kind: "monster",
      q: 62,
      r: 13,
      name: "Ridge Pass",
      guard: {
        creatureId: "ogre",
        count: 6,
        label: "Pass ogres"
      }
    },
    {
      id: "ridge_guard_2",
      kind: "monster",
      q: 62,
      r: 28,
      name: "Ridge Pass",
      guard: {
        creatureId: "ogre",
        count: 6,
        label: "Pass ogres"
      }
    },
    {
      id: "ridge_guard_3",
      kind: "monster",
      q: 47,
      r: 43,
      name: "Ridge Pass",
      guard: {
        creatureId: "ogre",
        count: 6,
        label: "Pass ogres"
      }
    },
    {
      id: "ridge_guard_4",
      kind: "monster",
      q: 32,
      r: 43,
      name: "Ridge Pass",
      guard: {
        creatureId: "ogre",
        count: 6,
        label: "Pass ogres"
      }
    },
    {
      id: "ridge_guard_5",
      kind: "monster",
      q: 32,
      r: 28,
      name: "Ridge Pass",
      guard: {
        creatureId: "ogre",
        count: 6,
        label: "Pass ogres"
      }
    },
    {
      id: "ridge_guard_6",
      kind: "monster",
      q: 47,
      r: 13,
      name: "Ridge Pass",
      guard: {
        creatureId: "ogre",
        count: 6,
        label: "Pass ogres"
      }
    },
    {
      id: "sawmill_1",
      kind: "sawmill",
      q: 53,
      r: 6
    },
    {
      id: "sawmill_2",
      kind: "sawmill",
      q: 69,
      r: 12
    },
    {
      id: "sawmill_3",
      kind: "sawmill",
      q: 63,
      r: 34
    },
    {
      id: "sawmill_4",
      kind: "sawmill",
      q: 41,
      r: 50
    },
    {
      id: "sawmill_5",
      kind: "sawmill",
      q: 25,
      r: 44
    },
    {
      id: "sawmill_6",
      kind: "sawmill",
      q: 31,
      r: 22
    },
    {
      id: "shrine_1",
      kind: "spell_shrine",
      q: 51,
      r: 16,
      spellId: "mend"
    },
    {
      id: "shrine_2",
      kind: "spell_shrine",
      q: 59,
      r: 20,
      spellId: "mend"
    },
    {
      id: "shrine_3",
      kind: "spell_shrine",
      q: 55,
      r: 32,
      spellId: "mend"
    },
    {
      id: "shrine_4",
      kind: "spell_shrine",
      q: 43,
      r: 40,
      spellId: "mend"
    },
    {
      id: "shrine_5",
      kind: "spell_shrine",
      q: 35,
      r: 36,
      spellId: "mend"
    },
    {
      id: "shrine_6",
      kind: "spell_shrine",
      q: 39,
      r: 24,
      spellId: "mend"
    },
    {
      id: "stone_1",
      kind: "learning_stone",
      q: 60,
      r: 12
    },
    {
      id: "stone_2",
      kind: "learning_stone",
      q: 63,
      r: 25
    },
    {
      id: "stone_3",
      kind: "learning_stone",
      q: 50,
      r: 41
    },
    {
      id: "stone_4",
      kind: "learning_stone",
      q: 34,
      r: 44
    },
    {
      id: "stone_5",
      kind: "learning_stone",
      q: 31,
      r: 31
    },
    {
      id: "stone_6",
      kind: "learning_stone",
      q: 44,
      r: 15
    },
    {
      id: "town_1",
      kind: "town",
      q: 57,
      r: 8,
      owner: 0
    },
    {
      id: "town_2",
      kind: "town",
      q: 67,
      r: 18,
      owner: 1
    },
    {
      id: "town_3",
      kind: "town",
      q: 57,
      r: 38,
      owner: 2
    },
    {
      id: "town_4",
      kind: "town",
      q: 37,
      r: 48,
      owner: 3
    },
    {
      id: "town_5",
      kind: "town",
      q: 27,
      r: 38,
      owner: 4
    },
    {
      id: "town_6",
      kind: "town",
      q: 37,
      r: 18,
      owner: 5
    },
    {
      id: "trainer_1",
      kind: "skill_trainer",
      q: 55,
      r: 16,
      skillId: "leadership"
    },
    {
      id: "trainer_2",
      kind: "skill_trainer",
      q: 59,
      r: 24,
      skillId: "leadership"
    },
    {
      id: "trainer_3",
      kind: "skill_trainer",
      q: 51,
      r: 36,
      skillId: "leadership"
    },
    {
      id: "trainer_4",
      kind: "skill_trainer",
      q: 39,
      r: 40,
      skillId: "leadership"
    },
    {
      id: "trainer_5",
      kind: "skill_trainer",
      q: 35,
      r: 32,
      skillId: "leadership"
    },
    {
      id: "trainer_6",
      kind: "skill_trainer",
      q: 43,
      r: 20,
      skillId: "leadership"
    },
    {
      id: "windmill_1",
      kind: "windmill",
      q: 50,
      r: 12
    },
    {
      id: "windmill_2",
      kind: "windmill",
      q: 63,
      r: 15
    },
    {
      id: "windmill_3",
      kind: "windmill",
      q: 60,
      r: 31
    },
    {
      id: "windmill_4",
      kind: "windmill",
      q: 44,
      r: 44
    },
    {
      id: "windmill_5",
      kind: "windmill",
      q: 31,
      r: 41
    },
    {
      id: "windmill_6",
      kind: "windmill",
      q: 34,
      r: 25
    }
  ],
  victory: {
    type: "hold_relic",
    days: 10
  },
  startWealth: "normal"
};

// ../pantheon_realms/packages/content/src/skirmish/maps/index.ts
var doc = (json) => json;
var SKIRMISH_MAPS = [
  {
    id: "frostgate",
    order: 1,
    name: "Frostgate",
    tagline: "Two fjord valleys, one pass, and the key on the ice.",
    summary: "Two empires face each other across a frozen fjord. The only way between them is a pass through the ridge, shut by twin crimson gates. Each empire\u2019s crimson key lies on its own glacier island, reached by portal and guarded by nesting wyverns \u2014 whoever takes the key first decides when the war begins.",
    highlights: ["One pass, barred by two crimson key gates.", "Each empire\u2019s key waits on a glacier island, reached by portal.", "Icy spray: the fjord climate in every battle."],
    thumbnailAssetId: "mission.skirmish.frostgate.thumbnail",
    map: doc(frostgate_prmap_default)
  },
  {
    id: "burning_oasis",
    order: 2,
    name: "The Burning Oasis",
    tagline: "Four empires, four oases, one shrine in the fire.",
    summary: "Four empires hold the corners of a burning desert. Between each pair of neighbours lies an oasis: the northern and southern ones hide gold mines, the eastern and western ones crystal, and every oasis keeps a creature camp. At the centre, ringed by red rock, stands the Burning Shrine \u2014 hold it for seven days, or conquer every rival.",
    highlights: ["Four empires; every neighbour shares an oasis with you.", "Hold the Burning Shrine seven days to win.", "Scorching sand slows ground troops in battle."],
    thumbnailAssetId: "mission.skirmish.burning_oasis.thumbnail",
    map: doc(burning_oasis_prmap_default)
  },
  {
    id: "circle_of_gates",
    order: 3,
    name: "The Circle of Gates",
    tagline: "Three valleys and a ring of portals: every rival is at your back door.",
    summary: "Three high valleys surround a peak sanctum with spell shrines and a crown on its summit, reached by guarded paths. Ridges with one guarded crossing part the valleys. A ring of portals links them: each home gate opens behind the next empire\u2019s town, and each back gate leads to the previous empire\u2019s home.",
    highlights: ["A ring of six portals: raid your neighbour\u2019s back \u2014 and watch your own.", "Three spell shrines and the Crown of the Summit in the sanctum.", "Thin air: the high-pass climate in every battle."],
    thumbnailAssetId: "mission.skirmish.circle_of_gates.thumbnail",
    map: doc(circle_of_gates_prmap_default)
  },
  {
    id: "barrows",
    order: 4,
    name: "Barrows of the Lost Kings",
    tagline: "A fog moor of burial mounds, captive heroes and sealed hoards.",
    summary: "A fog-bound moor scattered with barrows. In each empire\u2019s nearest barrow a hero of its own people waits to be freed; in the King\u2019s Barrows wait veterans. Hermits pay for deeds, and two hoards sealed behind amber and violet gates open only for their keys \u2014 one kept in each empire\u2019s back country. Gold is scarce: one mine each.",
    highlights: ["Prisons with captive heroes, guarded by barrow-wights.", "Amber and violet key vaults with major artifacts.", "Scarce gold and moorland fog."],
    thumbnailAssetId: "mission.skirmish.barrows.thumbnail",
    map: doc(barrows_prmap_default)
  },
  {
    id: "golden_fords",
    order: 5,
    name: "The Golden Fords",
    tagline: "A rich valley between two rivers. Fast, open, and generous.",
    summary: "A golden autumn valley between two rivers, with three guarded fords across each. The fields between the rivers hold gold and crystal mines, a mill, camps and the Horn of Plenty. Every empire starts with twice the usual treasury and the whole map revealed: a fast, open game and a good first skirmish.",
    highlights: ["Twice the usual treasury; the map is revealed.", "Three guarded fords on each river.", "The Horn of Plenty between the rivers."],
    thumbnailAssetId: "mission.skirmish.golden_fords.thumbnail",
    map: doc(golden_fords_prmap_default)
  },
  {
    id: "six_thrones",
    order: 6,
    name: "The Six Thrones",
    tagline: "Six empires, one island, one shrine.",
    summary: "One island shared by six thrones. Each empire holds a wedge of land between two ridges, with one guarded pass to each neighbour and one guarded path to the Shrine at the island\u2019s heart. Hold the Shrine for ten days, or be the last throne standing. Seats left to the AI play as AI empires.",
    highlights: ["Six empires; every seat human or AI.", "Hold the Shrine of Six Thrones ten days to win.", "Guarded ridge passes to both neighbours."],
    thumbnailAssetId: "mission.skirmish.six_thrones.thumbnail",
    map: doc(six_thrones_prmap_default)
  }
];

// ../pantheon_realms/packages/content/src/skirmish/skirmish.ts
var HERALD_PORTRAIT = "story.herald.portrait";
var W = 35;
var H5 = 17;
var mirror = (q, r2) => ({ q: W - 1 - q, r: H5 - 1 - r2 });
var HALF = [
  { id: "town", q: 3, r: 8 },
  { id: "sawmill", q: 3, r: 3 },
  { id: "quarry", q: 2, r: 12 },
  { id: "crystal", q: 6, r: 11 },
  { id: "cache", q: 7, r: 5 }
];
var anchor = (id, c3) => ({ id, coord: { q: c3.q, r: c3.r } });
var SKIRMISH_TEMPLATES = [
  {
    id: "skirmish_twin_harbors_v2",
    version: 2,
    width: W,
    height: H5,
    goldenSeed: 240102,
    symmetry: "point",
    barriers: [],
    anchors: [
      // The first anchor is the reachability origin for map validation.
      ...HALF.flatMap((a2) => [anchor(`sk_${a2.id}_w`, a2), anchor(`sk_${a2.id}_e`, mirror(a2.q, a2.r))]),
      anchor("sk_gold", { q: 17, r: 8 }),
      anchor("sk_grove_n", { q: 17, r: 3 }),
      anchor("sk_grove_s", mirror(17, 3))
    ],
    // One half is declared; the generator mirrors every carved road.
    roadEdges: [
      ["sk_town_w", "sk_gold"],
      ["sk_town_w", "sk_sawmill_w"],
      ["sk_town_w", "sk_quarry_w"],
      ["sk_town_w", "sk_crystal_w"],
      ["sk_gold", "sk_grove_n"]
    ],
    biome: "temperate"
  }
];
var coordOf = (id) => SKIRMISH_TEMPLATES[0].anchors.find((a2) => a2.id === id).coord;
var res2 = (id, t) => {
  const info = {
    sawmill: ["Sawmill", "wood", 2],
    quarry: ["Quarry", "stone", 2],
    gold_mine: ["Gold Mine", "gold", 1e3],
    crystal_deposit: ["Crystal Deposit", "crystal", 1]
  };
  const [name, resource, dailyYield] = info[t];
  return { id, anchorId: id, coord: coordOf(id), name, description: `Capture for +${dailyYield} ${resource} per day.`, kind: { type: "resource_site", siteType: t, resource, dailyYield } };
};
var grove = (id, name) => ({
  id,
  anchorId: id,
  coord: coordOf(id),
  name,
  description: "Centaurs guard a store of crystal.",
  kind: { type: "landmark", landmark: "grove" },
  guard: { label: "Grove centaurs", army: [{ creatureId: "centaur", count: 5 }], reward: { resources: { crystal: 3, gold: 600 } }, battlefield: "grove" }
});
var cache = (id) => ({
  id,
  anchorId: id,
  coord: coordOf(id),
  name: "Supply Cache",
  description: "Abandoned supplies.",
  kind: { type: "pickup", reward: { resources: { gold: 400, wood: 2, stone: 2 } } }
});
var SITES = [
  { id: "sk_town_w", anchorId: "sk_town_w", coord: coordOf("sk_town_w"), name: "Westharbor", description: "The western harbor town.", kind: { type: "town", townId: "westharbor" } },
  { id: "sk_town_e", anchorId: "sk_town_e", coord: coordOf("sk_town_e"), name: "Eastharbor", description: "The eastern harbor town.", kind: { type: "town", townId: "eastharbor" } },
  res2("sk_sawmill_w", "sawmill"),
  res2("sk_sawmill_e", "sawmill"),
  res2("sk_quarry_w", "quarry"),
  res2("sk_quarry_e", "quarry"),
  res2("sk_crystal_w", "crystal_deposit"),
  res2("sk_crystal_e", "crystal_deposit"),
  {
    ...res2("sk_gold", "gold_mine"),
    guard: { label: "Mine guards", army: [{ creatureId: "hoplite", count: 12 }, { creatureId: "peltast", count: 4 }], reward: { resources: { gold: 500 } }, battlefield: "open_field" }
  },
  cache("sk_cache_w"),
  cache("sk_cache_e"),
  grove("sk_grove_n", "North Grove"),
  grove("sk_grove_s", "South Grove")
];
var familyAtTier = (specs, tier) => specs.find((f) => f.tier === tier).familyId;
var COVENANT_TIERS = [3, 6, 7];
function kitSide(spec, archetypeId, start) {
  const t1 = spec.families.find((f) => f.tier === 1);
  const t2 = spec.families.find((f) => f.tier === 2);
  return {
    pantheonId: spec.id,
    adjective: spec.name,
    archetypeId,
    buildings: [kitBuildingId(spec.id, "civic_hall", 1), kitBuildingId(spec.id, "tavern", 1), kitBuildingId(spec.id, "fortifications", 1), kitBuildingId(spec.id, "dwelling_t1", 1)],
    population: { [t1.familyId]: 14 },
    army: [
      { creatureId: t1.base.id, count: start[0] },
      { creatureId: t2.base.id, count: start[1] }
    ],
    covenants: COVENANT_TIERS.map((tier) => familyAtTier(spec.families, tier))
  };
}
var KITS = {
  greek: {
    pantheonId: "greek",
    adjective: "Greek",
    archetypeId: "greek_polis",
    buildings: ["village_hall", "tavern", "fort", "barracks"],
    population: { hoplite: 14 },
    army: [
      { creatureId: "hoplite", count: 20 },
      { creatureId: "peltast", count: 8 }
    ],
    covenants: COVENANT_TIERS.map((tier) => familyAtTier(GREEK_FAMILY_SPECS.filter((f) => f.pantheonId === "greek"), tier))
  },
  norse: {
    pantheonId: "norse",
    adjective: "Norse",
    archetypeId: "norse_hold",
    buildings: ["norse_longhouse", "norse_mead_hall", "norse_palisade", "norse_barrow"],
    population: { norse_draugr: 14 },
    // Proposed: chosen by head-to-head auto-battle parity with the Greek start
    // (11 of 20 measured duels won; 2,100 vs 2,000 Gold of troops).
    army: [
      { creatureId: "norse_draugr", count: 24 },
      { creatureId: "norse_frost_wolf", count: 6 }
    ],
    covenants: COVENANT_TIERS.map((tier) => familyAtTier(NORSE_FAMILY_SPECS, tier))
  },
  // 21 + 8 (was 20 + 8): with shooting ranges (2026-10-02) the Jackal Guardians lost
  // some long-range damage; one more Sacred Scarab brings the escort duels back to even.
  egyptian: kitSide(EGYPTIAN_SPEC, "egyptian_city", [21, 8]),
  japanese: kitSide(JAPANESE_SPEC, "japanese_castle_town", [23, 8]),
  celtic: kitSide(CELTIC_SPEC, "celtic_hillfort", [22, 7]),
  mesoamerican: kitSide(MESOAMERICAN_SPEC, "mesoamerican_city", [24, 6])
};
var SKIRMISH_PANTHEONS = ["greek", "norse", "egyptian", "japanese", "celtic", "mesoamerican"];
var STRATEGOS = { attributes: { attack: 1, defense: 2, power: 1, knowledge: 2 }, skills: [{ skillId: "leadership", rank: 1 }] };
var kitLeader = (pantheonId, name, classId, heroId, kind) => ({
  heroId,
  definitionId: `${pantheonId}_${slug(name)}`,
  classId,
  attributes: kind.attributes,
  skills: kind.skills,
  portrait: `hero.${pantheonId}.${slug(name)}.portrait`
});
var LEADERS = {
  greek: {
    player: { heroId: "alexios", definitionId: "alexios", classId: "strategos", ...STRATEGOS, portrait: "hero.greek.alexios.portrait" },
    rival: { heroId: "rival_odysseus", definitionId: "odysseus", classId: "strategos", ...STRATEGOS, portrait: "hero.greek.odysseus.portrait" }
  },
  norse: {
    player: { heroId: "ragnar", definitionId: "norse_ragnar", classId: "jarl", ...STRATEGOS, portrait: "hero.norse.ragnar.portrait" },
    rival: { heroId: "rival_lagertha", definitionId: "norse_lagertha", classId: "jarl", ...STRATEGOS, portrait: "hero.norse.lagertha.portrait" }
  },
  egyptian: {
    player: kitLeader("egyptian", "Hatshepsut", "vizier", "hatshepsut", STRATEGOS),
    rival: kitLeader("egyptian", "Cleopatra", "vizier", "rival_cleopatra", STRATEGOS)
  },
  japanese: {
    player: kitLeader("japanese", "Yoshitsune", "daimyo", "yoshitsune", STRATEGOS),
    rival: kitLeader("japanese", "Benkei", "daimyo", "rival_benkei", STRATEGOS)
  },
  celtic: {
    player: kitLeader("celtic", "Fionn mac Cumhaill", "chieftain", "fionn", STRATEGOS),
    rival: kitLeader("celtic", "Boudicca", "chieftain", "rival_boudicca", STRATEGOS)
  },
  mesoamerican: {
    player: kitLeader("mesoamerican", "Nezahualcoyotl", "tlatoani", "nezahualcoyotl", STRATEGOS),
    rival: kitLeader("mesoamerican", "Eight Deer Jaguar Claw", "tlatoani", "rival_eight_deer", STRATEGOS)
  }
};
var hero3 = (l, kit, startTownId) => ({
  heroId: l.heroId,
  definitionId: l.definitionId,
  classId: l.classId,
  defaults: { level: 1, xp: 0, attributes: l.attributes, skills: l.skills, spellbook: false },
  army: kit.army,
  startTownId
});
function twinHarbors(id, playerPantheon, rivalPantheon) {
  const pk = KITS[playerPantheon];
  const rk = KITS[rivalPantheon];
  const pl = LEADERS[playerPantheon].player;
  const rl = LEADERS[rivalPantheon].rival;
  const mixed = playerPantheon !== rivalPantheon;
  const proposed = [...new Set([pk, rk].filter((k) => k.pantheonId !== "greek").map((k) => k.adjective))];
  return {
    id,
    scenarioId: id,
    campaignId: null,
    order: 1,
    name: "Twin Harbors",
    subtitle: `Skirmish \u2014 ${pk.adjective} vs. ${rk.adjective}`,
    summary: `Two harbor towns contest the gold mine between them. Defeat the rival\u2019s heroes and take Eastharbor. Proposed test scenario; unbalanced${proposed.length ? `; ${proposed.join(" and ")} values are proposed and unplaytested` : ""}.`,
    mapTemplateId: "skirmish_twin_harbors_v2",
    soundscape: "coast",
    targetPlaytime: "20\u201340 minutes (unmeasured)",
    newDecisions: ["Economy race", "Local AI opponent", ...mixed ? ["Mixed pantheons"] : []],
    xpCap: null,
    xpCapLevel: null,
    briefing: [{ speaker: "Herald", portraitAssetId: HERALD_PORTRAIT, text: "Eastharbor\u2019s war-leader marches for the gold mine. Hold the coast." }],
    victory: [{ speaker: "Herald", portraitAssetId: HERALD_PORTRAIT, text: "Both harbors now answer to you." }],
    debriefPolicy: [],
    player: {
      playerId: "player",
      name: "Westharbor",
      pantheonId: pk.pantheonId,
      wallet: { gold: 1e4, wood: 20, stone: 20, crystal: 10, favor: 10 },
      town: { townId: "westharbor", siteId: "sk_town_w", name: "Westharbor", archetypeId: pk.archetypeId, buildings: pk.buildings, population: pk.population, covenants: pk.covenants },
      hero: hero3(pl, pk, "westharbor")
    },
    rivals: [
      {
        playerId: "rival",
        name: "Eastharbor",
        pantheonId: rk.pantheonId,
        color: "#c0392b",
        wallet: { gold: 1e4, wood: 20, stone: 20, crystal: 10, favor: 10 },
        town: { townId: "eastharbor", siteId: "sk_town_e", name: "Eastharbor", archetypeId: rk.archetypeId, buildings: rk.buildings, population: rk.population, covenants: rk.covenants },
        hero: hero3(rl, rk, "eastharbor")
      }
    ],
    initialFlags: ["skirmish"],
    features: SKIRMISH_FEATURES,
    purchasableBuildingIds: null,
    heroHiringEnabled: true,
    sites: SITES,
    objectives: [
      { id: "sk_gold", title: "Take the gold mine", description: "Defeat the mine guards and hold the central gold mine.", category: "optional", initialStatus: "active", condition: { type: "site_cleared", siteId: "sk_gold" }, markerSiteId: "sk_gold" },
      { id: "sk_victory", title: "Defeat Eastharbor", description: "Defeat every rival hero and take every rival town.", category: "primary", initialStatus: "active", condition: { type: "flag", flag: "rivals_eliminated" } }
    ],
    hostileHeroes: [],
    helpTopics: [{ id: "sieges", title: "Sieges", text: "Entering an enemy town that has a garrison or a visiting hero starts a siege. The Fort gives walls and a gate, the Citadel adds a keep and a moat, the Castle stronger walls and two towers. Your Catapult removes one structure point at the start of every round: the gate first, or the section you aim it at on your turn. Cyclopes can batter the walls instead of shooting. The keep and towers fire at the stack their shot hurts most, shooters first. The defender may combine identical stacks, then chooses at most seven; the rest wait in reserve and are lost if the town falls. A town defender cannot retreat or surrender. Values are proposed." }],
    protectedHeroFailure: false,
    thumbnailAssetId: "mission.skirmish.twin_harbors.thumbnail"
  };
}
var SKIRMISH_FEATURES = { expandedContent: true, weeklyEvents: true, interventions: true, heroSpecialties: true, neutralReactions: true, climateRules: true, aiTemperaments: true };
function skirmishMissionId(playerPantheon, rivalPantheon) {
  return playerPantheon === "greek" && rivalPantheon === "greek" ? "skirmish_twin_harbors" : `skirmish_twin_harbors_${playerPantheon}_vs_${rivalPantheon}`;
}
var PAIRS = SKIRMISH_PANTHEONS.flatMap((p) => SKIRMISH_PANTHEONS.map((r2) => [p, r2]));
var SKIRMISH_MISSIONS = PAIRS.map(([p, r2]) => twinHarbors(skirmishMissionId(p, r2), p, r2));
var SKIRMISH_SCENARIOS = [
  {
    id: "skirmish_twin_harbors",
    name: "Twin Harbors",
    tagline: "Two harbors, one gold mine between them.",
    summary: "Two harbor towns face each other along a small stretch of coast. Between them lies a guarded gold mine \u2014 whoever holds it pulls ahead. Choose your pantheon and the rival\u2019s; the rival is played by the AI or by a second player on this computer.",
    highlights: ["A short game for two empires on a small map.", "The guarded gold mine lies halfway between the towns.", "Any pantheon against any pantheon."],
    missionId: "skirmish_twin_harbors",
    status: "playable",
    variants: PAIRS.map(([p, r2]) => ({ playerPantheonId: p, rivalPantheonId: r2, missionId: skirmishMissionId(p, r2) }))
  }
];
var EXTRA_LEADERS = {
  greek: [
    { definitionId: "atalanta", portrait: "hero.greek.atalanta.portrait" },
    { definitionId: "achilles", portrait: "hero.greek.achilles.portrait" }
  ],
  norse: [
    { definitionId: "norse_brynhild", portrait: "hero.norse.brynhild.portrait" },
    { definitionId: "norse_sigurd", portrait: "hero.norse.sigurd.portrait" }
  ],
  egyptian: [
    { definitionId: "egyptian_nefertiti", portrait: "hero.egyptian.nefertiti.portrait" },
    { definitionId: "egyptian_ramses", portrait: "hero.egyptian.ramses.portrait" }
  ],
  japanese: [
    { definitionId: "japanese_tomoe_gozen", portrait: "hero.japanese.tomoe_gozen.portrait" },
    { definitionId: "japanese_yamato_takeru", portrait: "hero.japanese.yamato_takeru.portrait" }
  ],
  celtic: [
    { definitionId: "celtic_scathach", portrait: "hero.celtic.scathach.portrait" },
    { definitionId: "celtic_cu_chulainn", portrait: "hero.celtic.cu_chulainn.portrait" }
  ],
  mesoamerican: [
    { definitionId: "mesoamerican_hunahpu", portrait: "hero.mesoamerican.hunahpu.portrait" },
    { definitionId: "mesoamerican_xbalanque", portrait: "hero.mesoamerican.xbalanque.portrait" }
  ]
};
var RANDOM_MAP_FIRST_LEADER = {
  greek: { definitionId: "odysseus", portrait: "hero.greek.odysseus.portrait" },
  norse: { definitionId: "norse_ragnar", portrait: "hero.norse.ragnar.portrait" },
  egyptian: { definitionId: "egyptian_hatshepsut", portrait: "hero.egyptian.hatshepsut.portrait" },
  japanese: { definitionId: "japanese_yamato_takeru", portrait: "hero.japanese.yamato_takeru.portrait" },
  celtic: { definitionId: "celtic_medb", portrait: "hero.celtic.medb.portrait" },
  mesoamerican: { definitionId: "mesoamerican_nezahualcoyotl", portrait: "hero.mesoamerican.nezahualcoyotl.portrait" }
};
var TOWN_NAMES = {
  greek: ["Myrtos", "Kalliste", "Thera", "Aigina", "Delos", "Korinna"],
  norse: ["Hrafnheim", "Skjoldvik", "Isafjord", "Grimsby", "Ulfsstad", "Vargholm"],
  egyptian: ["Per-Ankh", "Nekheb", "Wadj-Iset", "Tjebu", "Abedju", "Henen"],
  japanese: ["Kiyomizu", "Aonami", "Takamura", "Shirakawa", "Hanamori", "Kurogane"],
  celtic: ["Dun Brega", "Caer Lir", "Ardmor", "Inis Fail", "Rath Mor", "Glenn D\xE1 Loch"],
  mesoamerican: ["Tollan", "Xochitepec", "Cuauhnahuac", "Itzamal", "Teotlalco", "Mictlampa"]
};
var SKIRMISH_KITS = SKIRMISH_PANTHEONS.map((pid) => {
  const kit = KITS[pid];
  const lead = LEADERS[pid];
  const classId = lead.player.classId;
  return {
    pantheonId: pid,
    adjective: kit.adjective,
    archetypeId: kit.archetypeId,
    buildings: kit.buildings,
    population: kit.population,
    covenants: kit.covenants,
    army: kit.army,
    leaders: (() => {
      const first = RANDOM_MAP_FIRST_LEADER[pid];
      const rest = [
        { definitionId: lead.player.definitionId, classId, portraitAssetId: lead.player.portrait },
        { definitionId: lead.rival.definitionId, classId, portraitAssetId: lead.rival.portrait },
        ...(EXTRA_LEADERS[pid] ?? []).map((x) => ({ definitionId: x.definitionId, classId, portraitAssetId: x.portrait }))
      ];
      return first ? [{ definitionId: first.definitionId, classId, portraitAssetId: first.portrait }, ...rest.filter((l) => l.definitionId !== first.definitionId)] : rest;
    })(),
    leaderAttributes: STRATEGOS.attributes,
    leaderSkills: STRATEGOS.skills,
    townNames: TOWN_NAMES[pid] ?? []
  };
});

// ../pantheon_realms/packages/content/src/common/climates.ts
var icon = (id) => `icon.climate.${id}`;
var CLIMATE_RULES = [
  {
    id: "autumn",
    name: "Harvest wind",
    summary: "Harvest wind: every flying creature has +1 Speed in battle.",
    effects: [{ type: "creature_stat", stat: "speed", amount: 1, ability: "flight" }],
    iconAssetId: icon("autumn")
  },
  {
    id: "coast",
    name: "Salt spray",
    summary: "Salt spray: every shooter\u2019s range is 3 hexes shorter in battle.",
    effects: [{ type: "shooting_range", amount: -3 }],
    iconAssetId: icon("coast")
  },
  {
    id: "desert",
    name: "Scorching sand",
    summary: "Scorching sand: every creature without Flight has \u22121 Speed in battle.",
    effects: [{ type: "creature_stat", stat: "speed", amount: -1, withoutAbility: "flight" }],
    iconAssetId: icon("desert")
  },
  {
    id: "fjord",
    name: "Icy spray",
    summary: "Icy spray: every creature has \u22121 Defense in battle.",
    effects: [{ type: "creature_stat", stat: "defense", amount: -1 }],
    iconAssetId: icon("fjord")
  },
  {
    id: "high_pass",
    name: "Thin air",
    summary: "Thin air: every shooter\u2019s range is 2 hexes longer and every flying creature has \u22121 Speed in battle.",
    effects: [
      { type: "shooting_range", amount: 2 },
      { type: "creature_stat", stat: "speed", amount: -1, ability: "flight" }
    ],
    iconAssetId: icon("high_pass")
  },
  {
    id: "jungle",
    name: "Dense canopy",
    summary: "Dense canopy: every shooter\u2019s range is 4 hexes shorter and every flying creature has \u22121 Speed in battle.",
    effects: [
      { type: "shooting_range", amount: -4 },
      { type: "creature_stat", stat: "speed", amount: -1, ability: "flight" }
    ],
    iconAssetId: icon("jungle")
  },
  {
    id: "moor",
    name: "Fog",
    summary: "Fog: every shooter\u2019s range is 6 hexes shorter in battle.",
    effects: [{ type: "shooting_range", amount: -6 }],
    iconAssetId: icon("moor")
  },
  {
    id: "storm_plateau",
    name: "Thunderstorm",
    summary: "Thunderstorm: every flying creature has \u22122 Speed in battle.",
    effects: [{ type: "creature_stat", stat: "speed", amount: -2, ability: "flight" }],
    iconAssetId: icon("storm_plateau")
  },
  {
    id: "tundra",
    name: "Biting cold",
    summary: "Biting cold: every creature has \u22121 Attack in battle.",
    effects: [{ type: "creature_stat", stat: "attack", amount: -1 }],
    iconAssetId: icon("tundra")
  }
];

// ../pantheon_realms/packages/content/src/common/temperaments.ts
var AI_TEMPERAMENTS = [
  {
    id: "greek",
    name: "Strategists",
    summary: "Weighs every option evenly: builds, fights and prays as the moment asks.",
    boldness: 1,
    aggression: 1,
    extraHeroes: 0,
    build: {},
    magic: 1,
    faith: 1
  },
  {
    id: "norse",
    name: "Raiders",
    summary: "Values raids more, keeps an extra hero on the road and raises troops before comforts.",
    // 2026-10-07 balance: attacks at the same margins as everyone (was 0.95: Norse 0.44 on random maps).
    boldness: 1,
    aggression: 1.15,
    extraHeroes: 1,
    build: { military: 1.15, economy: 0.95 },
    magic: 0.9,
    faith: 1
  },
  {
    id: "egyptian",
    name: "Builders",
    summary: "Leans toward its economy and walls in close build choices and raids a little less.",
    boldness: 1,
    aggression: 0.95,
    extraHeroes: 0,
    build: { economy: 1.1, defense: 1.1 },
    magic: 1,
    faith: 1
  },
  {
    id: "japanese",
    name: "Disciplined",
    summary: "Upgrades its dwellings first in close build choices.",
    boldness: 1,
    aggression: 1,
    extraHeroes: 0,
    build: { elite: 1.05 },
    magic: 1,
    faith: 1
  },
  {
    id: "celtic",
    name: "Mystics",
    summary: "Raises its Mage Guild before its other buildings and leans a little toward spellcasters and magic skills.",
    boldness: 1,
    aggression: 1,
    extraHeroes: 0,
    build: { magic: 1.35 },
    magic: 1.1,
    faith: 1
  },
  {
    id: "mesoamerican",
    name: "Devout",
    summary: "Keeps making Temple offerings from its garrisons once its gods are chosen, for more miracles and gifts, and favours the Temple in close build choices.",
    boldness: 1,
    aggression: 1,
    extraHeroes: 0,
    build: { faith: 1.25 },
    magic: 1,
    faith: 1.25
  }
];

// ../pantheon_realms/packages/content/src/common/expanded.ts
var effectsSkill = (id, name, summary, ranks, rankSummaries, pantheonId) => ({
  id,
  name,
  summary,
  rankSummaries,
  rule: { type: "effects", effectsByRank: ranks },
  iconAssetId: `icon.skill.${id}`,
  scope: "expanded",
  ...pantheonId ? { pantheonId } : {}
});
var EXPANDED_SKILLS = [
  effectsSkill(
    "estates",
    "Estates",
    "Revenue from the hero\u2019s holdings, paid every dawn.",
    [[{ type: "daily_income", resource: "gold", amount: 250 }], [{ type: "daily_income", resource: "gold", amount: 500 }], [{ type: "daily_income", resource: "gold", amount: 750 }]],
    ["+250 Gold per day", "+500 Gold per day", "+750 Gold per day"]
  ),
  effectsSkill(
    "mysticism",
    "Mysticism",
    "Faster mana recovery away from a Sanctum.",
    [[{ type: "mana_regen", amount: 2 }], [{ type: "mana_regen", amount: 4 }], [{ type: "mana_regen", amount: 6 }]],
    ["+2 mana at dawn", "+4 mana at dawn", "+6 mana at dawn"]
  ),
  effectsSkill(
    "phalanx_drill",
    "Phalanx Drill",
    "Greek: the hero drills the line infantry to hold shield to shield.",
    [
      [{ type: "creature_stat", stat: "defense", amount: 1, maxTier: 3 }],
      [{ type: "creature_stat", stat: "defense", amount: 2, maxTier: 3 }],
      [{ type: "creature_stat", stat: "defense", amount: 3, maxTier: 3 }]
    ],
    ["Tier 1\u20133 creatures +1 Defense in battle", "Tier 1\u20133 creatures +2 Defense in battle", "Tier 1\u20133 creatures +3 Defense in battle"],
    "greek"
  ),
  effectsSkill(
    "skaldic_lore",
    "Skaldic Lore",
    "Norse: deeds sung by the skald teach the army faster.",
    [[{ type: "battle_xp_percent", percent: 15 }], [{ type: "battle_xp_percent", percent: 30 }], [{ type: "battle_xp_percent", percent: 45 }]],
    ["+15% battle experience", "+30% battle experience", "+45% battle experience"],
    "norse"
  ),
  effectsSkill(
    "embalming",
    "Embalming Rites",
    "Egyptian: after a victory, some of the fallen are restored.",
    [[{ type: "casualty_recovery", percent: 5 }], [{ type: "casualty_recovery", percent: 10 }], [{ type: "casualty_recovery", percent: 15 }]],
    ["5% of losses return after a won battle", "10% of losses return after a won battle", "15% of losses return after a won battle"],
    "egyptian"
  ),
  effectsSkill(
    "bushido",
    "Bushid\u014D",
    "Japanese: the elite fight with perfect resolve.",
    [
      [{ type: "creature_stat", stat: "attack", amount: 1, minTier: 5 }],
      [{ type: "creature_stat", stat: "attack", amount: 2, minTier: 5 }],
      [{ type: "creature_stat", stat: "attack", amount: 3, minTier: 5 }]
    ],
    ["Tier 5\u20137 creatures +1 Attack in battle", "Tier 5\u20137 creatures +2 Attack in battle", "Tier 5\u20137 creatures +3 Attack in battle"],
    "japanese"
  ),
  effectsSkill(
    "druidcraft",
    "Druidcraft",
    "Celtic: grove lore sharpens spells and restores mana.",
    [
      [{ type: "spell_damage_percent", percent: 15 }, { type: "mana_regen", amount: 1 }],
      [{ type: "spell_damage_percent", percent: 30 }, { type: "mana_regen", amount: 2 }],
      [{ type: "spell_damage_percent", percent: 50 }, { type: "mana_regen", amount: 3 }]
    ],
    ["+15% spell damage, +1 mana at dawn", "+30% spell damage, +2 mana at dawn", "+50% spell damage, +3 mana at dawn"],
    "celtic"
  ),
  effectsSkill(
    "sun_calendar",
    "Sun Calendar",
    "Mesoamerican: the hero keeps the sacred calendar, earning the gods\u2019 attention.",
    [[{ type: "daily_income", resource: "favor", amount: 1 }], [{ type: "daily_income", resource: "favor", amount: 2 }], [{ type: "daily_income", resource: "favor", amount: 3 }]],
    ["+1 Favor per day", "+2 Favor per day", "+3 Favor per day"],
    "mesoamerican"
  )
];
var spell = (s3) => ({
  ...s3,
  access: "sanctum",
  scope: "expanded",
  iconAssetId: `icon.spell.${s3.id}`,
  implementationStatus: "implemented"
});
var EXPANDED_SPELLS = [
  spell({ id: "swiftness", name: "Swiftness", tier: 1, manaCost: 4, context: "battle", target: "ally_stack", effect: { type: "speed_bonus", amount: 2, durationRounds: 2 }, summary: "Ally +2 Speed through the current and next round." }),
  spell({ id: "weariness", name: "Weariness", tier: 2, manaCost: 5, context: "battle", target: "enemy_stack", effect: { type: "speed_bonus", amount: -2, durationRounds: 2 }, summary: "Enemy \u22122 Speed through the current and next round (never below 1)." }),
  spell({ id: "fleet_foot", name: "Fleet Foot", tier: 2, manaCost: 6, context: "adventure", target: "self", effect: { type: "movement_bonus", points: 200 }, summary: "Adventure only: the caster gains 200 movement points today." }),
  spell({ id: "homecoming", name: "Homecoming", tier: 3, manaCost: 14, context: "adventure", target: "self", effect: { type: "recall" }, summary: "Adventure only: the caster returns to the nearest town you own; its movement ends for the day." }),
  // Greek
  spell({ id: "aegis", name: "Aegis", tier: 3, manaCost: 9, context: "battle", target: "friendly_army", effect: { type: "mass_bonus", stat: "defense", amount: 2, durationRounds: 2 }, summary: "Every friendly stack +2 Defense through the current and next round.", pantheonId: "greek" }),
  spell({ id: "thunderclap", name: "Thunderclap", tier: 3, manaCost: 12, context: "battle", target: "enemy_stack", effect: { type: "area_damage", base: 20, perPower: 8 }, summary: "Enemy stack and every enemy stack beside it take 20 + 8 \xD7 Power damage.", pantheonId: "greek" }),
  // Norse
  spell({ id: "berserkergang", name: "Berserkergang", tier: 3, manaCost: 9, context: "battle", target: "friendly_army", effect: { type: "mass_bonus", stat: "attack", amount: 2, durationRounds: 2 }, summary: "Every friendly stack +2 Attack through the current and next round.", pantheonId: "norse" }),
  spell({ id: "frost_breath", name: "Frost Breath", tier: 2, manaCost: 6, context: "battle", target: "enemy_stack", effect: { type: "speed_bonus", amount: -3, durationRounds: 2 }, summary: "Enemy \u22123 Speed through the current and next round (never below 1).", pantheonId: "norse" }),
  // Egyptian
  spell({ id: "scarab_swarm", name: "Scarab Swarm", tier: 3, manaCost: 10, context: "battle", target: "enemy_stack", effect: { type: "area_damage", base: 15, perPower: 6 }, summary: "Enemy stack and every enemy stack beside it take 15 + 6 \xD7 Power damage.", pantheonId: "egyptian" }),
  spell({ id: "eye_of_horus", name: "Eye of Horus", tier: 2, manaCost: 8, context: "adventure", target: "known_tile", effect: { type: "reveal_radius", radius: 5 }, summary: "Adventure only: reveal radius 5 around a known tile until next dawn.", pantheonId: "egyptian" }),
  // Japanese
  spell({ id: "divine_wind", name: "Divine Wind", tier: 3, manaCost: 8, context: "battle", target: "friendly_army", effect: { type: "mass_bonus", stat: "speed", amount: 2, durationRounds: 2 }, summary: "Every friendly stack +2 Speed through the current and next round.", pantheonId: "japanese" }),
  spell({ id: "blossom_veil", name: "Blossom Veil", tier: 2, manaCost: 6, context: "battle", target: "ally_stack", effect: { type: "defense_bonus", amount: 5, durationRounds: 2 }, summary: "Ally +5 Defense through the current and next round.", pantheonId: "japanese" }),
  // Celtic
  spell({ id: "glamour", name: "Glamour", tier: 2, manaCost: 6, context: "battle", target: "enemy_stack", effect: { type: "attack_bonus", amount: -3, durationRounds: 2 }, summary: "Enemy \u22123 Attack through the current and next round.", pantheonId: "celtic" }),
  spell({ id: "wild_hunt", name: "Wild Hunt", tier: 3, manaCost: 13, context: "battle", target: "enemy_stack", effect: { type: "area_damage", base: 25, perPower: 9 }, summary: "Enemy stack and every enemy stack beside it take 25 + 9 \xD7 Power damage.", pantheonId: "celtic" }),
  // Mesoamerican
  spell({ id: "obsidian_rain", name: "Obsidian Rain", tier: 3, manaCost: 11, context: "battle", target: "enemy_stack", effect: { type: "area_damage", base: 15, perPower: 7 }, summary: "Enemy stack and every enemy stack beside it take 15 + 7 \xD7 Power damage.", pantheonId: "mesoamerican" }),
  spell({ id: "fifth_sun", name: "Fifth Sun", tier: 3, manaCost: 12, context: "battle", target: "friendly_army", effect: { type: "mass_bonus", stat: "attack", amount: 3, durationRounds: 1 }, summary: "Every friendly stack +3 Attack through the current round.", pantheonId: "mesoamerican" })
];
var piece = (id, name, slot3, effects, summary, setId, price) => ({
  id,
  name,
  slot: slot3,
  effects,
  summary,
  iconAssetId: `icon.artifact.${id}`,
  unique: false,
  merchantPrice: price,
  setId,
  scope: "expanded",
  provenance: { source: "proposed-this-build", note: "Artifact set piece (P)." }
});
var SET_ARTIFACTS = [
  piece("phalanx_spear", "Phalanx Spear", "weapon", [{ type: "commander_attribute", attribute: "attack", amount: 2 }], "+2 commander Attack. Panoply of the Phalanx.", "panoply_of_the_phalanx", { gold: 2500 }),
  piece("phalanx_aspis", "Phalanx Aspis", "shield", [{ type: "commander_attribute", attribute: "defense", amount: 2 }], "+2 commander Defense. Panoply of the Phalanx.", "panoply_of_the_phalanx", { gold: 2500 }),
  piece("phalanx_helm", "Crested Helm", "head", [{ type: "commander_attribute", attribute: "defense", amount: 1 }], "+1 commander Defense. Panoply of the Phalanx.", "panoply_of_the_phalanx", { gold: 1800 }),
  piece("sun_diadem", "Sun Diadem", "head", [{ type: "commander_attribute", attribute: "power", amount: 2 }], "+2 commander Spell Power. Regalia of the Sun King.", "regalia_of_the_sun_king", { gold: 3e3, crystal: 1 }),
  piece("sun_scepter", "Sun Scepter", "weapon", [{ type: "commander_attribute", attribute: "power", amount: 1 }, { type: "commander_attribute", attribute: "knowledge", amount: 1 }], "+1 commander Spell Power and +1 Knowledge. Regalia of the Sun King.", "regalia_of_the_sun_king", { gold: 3e3, crystal: 1 }),
  piece("sun_signet", "Sun Signet", "ring", [{ type: "commander_attribute", attribute: "knowledge", amount: 2 }], "+2 commander Knowledge. Regalia of the Sun King.", "regalia_of_the_sun_king", { gold: 2500 }),
  piece("wayfarer_boots", "Wayfarer\u2019s Boots", "feet", [{ type: "movement_percent", percent: 10 }], "+10% daily land movement. Wayfarer\u2019s Kit.", "wayfarers_kit", { gold: 2e3 }),
  piece("wayfarer_cloak", "Wayfarer\u2019s Cloak", "cape", [{ type: "commander_attribute", attribute: "defense", amount: 1 }, { type: "vision_radius", amount: 1 }], "+1 commander Defense and +1 hex of vision. Wayfarer\u2019s Kit.", "wayfarers_kit", { gold: 2e3 }),
  piece("wayfarer_compass", "Star Compass", "misc", [{ type: "vision_radius", amount: 2 }], "+2 hexes of adventure vision. Wayfarer\u2019s Kit.", "wayfarers_kit", { gold: 1800 }),
  piece("champion_blade", "Champion\u2019s Blade", "weapon", [{ type: "commander_attribute", attribute: "attack", amount: 2 }], "+2 commander Attack. Relics of the Fallen Champion.", "relics_of_the_fallen_champion", { gold: 3e3 }),
  piece("champion_torc", "Champion\u2019s Torc", "neck", [{ type: "luck", amount: 1 }], "+1 Luck for the army. Relics of the Fallen Champion.", "relics_of_the_fallen_champion", { gold: 2500 }),
  piece("champion_banner", "Champion\u2019s Banner", "misc", [{ type: "morale", amount: 1 }], "+1 morale for the army. Relics of the Fallen Champion.", "relics_of_the_fallen_champion", { gold: 2500 })
];
var ARTIFACT_SETS = [
  {
    id: "panoply_of_the_phalanx",
    name: "Panoply of the Phalanx",
    summary: "Spear, shield and helm of a front-rank commander.",
    pieceIds: ["phalanx_spear", "phalanx_aspis", "phalanx_helm"],
    bonuses: [
      { pieces: 2, effects: [{ type: "morale", amount: 1 }], summary: "2 pieces: +1 morale" },
      { pieces: 3, effects: [{ type: "creature_stat", stat: "defense", amount: 2 }], summary: "3 pieces: every creature +2 Defense in battle" }
    ]
  },
  {
    id: "regalia_of_the_sun_king",
    name: "Regalia of the Sun King",
    summary: "Crown, scepter and ring of a priest-king.",
    pieceIds: ["sun_diadem", "sun_scepter", "sun_signet"],
    bonuses: [
      { pieces: 2, effects: [{ type: "mana_regen", amount: 3 }], summary: "2 pieces: +3 mana at dawn" },
      { pieces: 3, effects: [{ type: "spell_damage_percent", percent: 25 }], summary: "3 pieces: +25% spell damage" }
    ]
  },
  {
    id: "wayfarers_kit",
    name: "Wayfarer\u2019s Kit",
    summary: "Boots, cloak and compass of a tireless traveller.",
    pieceIds: ["wayfarer_boots", "wayfarer_cloak", "wayfarer_compass"],
    bonuses: [
      { pieces: 2, effects: [{ type: "movement_percent", percent: 10 }], summary: "2 pieces: +10% daily land movement" },
      { pieces: 3, effects: [{ type: "daily_income", resource: "gold", amount: 300 }], summary: "3 pieces: +300 Gold per day (trade on the road)" }
    ]
  },
  {
    id: "relics_of_the_fallen_champion",
    name: "Relics of the Fallen Champion",
    summary: "Blade, torc and banner of a champion whose name is forgotten.",
    pieceIds: ["champion_blade", "champion_torc", "champion_banner"],
    bonuses: [
      { pieces: 2, effects: [{ type: "battle_xp_percent", percent: 20 }], summary: "2 pieces: +20% battle experience" },
      { pieces: 3, effects: [{ type: "creature_stat", stat: "attack", amount: 2 }], summary: "3 pieces: every creature +2 Attack in battle" }
    ]
  }
];
var PANTHEON_NAMES = {
  favorable_winds: { greek: "Sandals of Hermes", norse: "Bifr\xF6st Crossing", egyptian: "Wings of Horus", japanese: "Fujin\u2019s Wind", celtic: "Epona\u2019s Ride", mesoamerican: "Xolotl\u2019s Guidance" },
  bountiful_harvest: { greek: "Demeter\u2019s Bounty", norse: "Freyja\u2019s Abundance", egyptian: "Harvest of Osiris", japanese: "Inari\u2019s Harvest", celtic: "Cauldron of the Dagda", mesoamerican: "Tlaloc\u2019s Rains" },
  tithe_of_the_faithful: { greek: "Tribute of Hera", norse: "Riches of Njord", egyptian: "Hathor\u2019s Prosperity", japanese: "Gift of Amaterasu", celtic: "Arawn\u2019s Hoard", mesoamerican: "Treasure of Coatlicue" },
  inspiration: { greek: "Wisdom of Athena", norse: "Mead of Odin", egyptian: "Words of Thoth", japanese: "Benzaiten\u2019s Muse", celtic: "Wisdom of Danu", mesoamerican: "Mirror of Tezcatlipoca" },
  rally_the_faithful: { greek: "Fury of Ares", norse: "Thor\u2019s Battle-Fury", egyptian: "Strength of Set", japanese: "Hachiman\u2019s War Cry", celtic: "Morr\xEDgan\u2019s Battle Cry", mesoamerican: "Huitzilopochtli\u2019s Fury" },
  shield_of_the_gods: { greek: "Aegis of Olympus", norse: "Frigg\u2019s Protection", egyptian: "Bastet\u2019s Ward", japanese: "Shield of Susanoo", celtic: "Shield of Nuada", mesoamerican: "Mixcoatl\u2019s Cloud Shield" },
  mending_light: { greek: "Light of Apollo", norse: "Baldr\u2019s Light", egyptian: "Healing of Isis", japanese: "Izanagi\u2019s Renewal", celtic: "Brigid\u2019s Healing Well", mesoamerican: "Waters of Chalchiuhtlicue" },
  wrath_from_above: { greek: "Arrows of Artemis", norse: "Hel\u2019s Grasp", egyptian: "Eye of Ra", japanese: "Raijin\u2019s Thunder", celtic: "Spear of Lugh", mesoamerican: "Fire of Xiuhtecuhtli" }
};
var intervention = (d) => ({ ...d, ...PANTHEON_NAMES[d.id] ? { names: PANTHEON_NAMES[d.id] } : {}, iconAssetId: `icon.intervention.${d.id}` });
var INTERVENTIONS = [
  intervention({ id: "favorable_winds", name: "Favorable Winds", summary: "Every hero of yours regains half a day\u2019s movement.", favorCost: 8, context: "adventure", target: "none", effect: { type: "restore_movement", percent: 50 } }),
  intervention({ id: "bountiful_harvest", name: "Bountiful Harvest", summary: "The chosen town gains 4 recruits for every tier 1\u20133 creature family it houses.", favorCost: 10, context: "adventure", target: "own_town", effect: { type: "town_growth", maxTier: 3, amount: 4 } }),
  intervention({ id: "tithe_of_the_faithful", name: "Tithe of the Faithful", summary: "+1,500 Gold at once.", favorCost: 6, context: "adventure", target: "none", effect: { type: "grant_resources", resources: { gold: 1500 } } }),
  intervention({ id: "inspiration", name: "Inspiration", summary: "Every hero of yours regains 15 mana (never above its maximum).", favorCost: 5, context: "adventure", target: "none", effect: { type: "restore_mana", amount: 15 } }),
  intervention({ id: "rally_the_faithful", name: "Rally the Faithful", summary: "Every friendly stack +2 Attack through the current and next round.", favorCost: 8, context: "battle", target: "none", effect: { type: "battle_status", stat: "attack", amount: 2, durationRounds: 2 } }),
  intervention({ id: "shield_of_the_gods", name: "Shield of the Gods", summary: "Every friendly stack +3 Defense through the current and next round.", favorCost: 8, context: "battle", target: "none", effect: { type: "battle_status", stat: "defense", amount: 3, durationRounds: 2 } }),
  intervention({ id: "mending_light", name: "Mending Light", summary: "The front creature of every friendly stack heals up to 30 HP (no resurrection).", favorCost: 6, context: "battle", target: "none", effect: { type: "battle_heal", amount: 30 } }),
  intervention({ id: "wrath_from_above", name: "Wrath from Above", summary: "One enemy stack takes 120 damage.", favorCost: 10, context: "battle", target: "enemy_stack", effect: { type: "battle_smite", damage: 120 } }),
  // One per pantheon.
  intervention({ id: "thunderbolt_of_zeus", name: "Thunderbolt of Zeus", summary: "One enemy stack takes 200 damage.", favorCost: 14, context: "battle", target: "enemy_stack", effect: { type: "battle_smite", damage: 200 }, pantheonIds: ["greek"] }),
  intervention({ id: "ride_of_the_valkyries", name: "Ride of the Valkyries", summary: "Every friendly stack +2 Speed through the current and next round.", favorCost: 8, context: "battle", target: "none", effect: { type: "battle_status", stat: "speed", amount: 2, durationRounds: 2 }, pantheonIds: ["norse"] }),
  intervention({ id: "blessing_of_the_nile", name: "Blessing of the Nile", summary: "The chosen town gains 3 recruits for every tier 1\u20135 creature family it houses.", favorCost: 12, context: "adventure", target: "own_town", effect: { type: "town_growth", maxTier: 5, amount: 3 }, pantheonIds: ["egyptian"] }),
  intervention({ id: "ward_of_the_kami", name: "Ward of the Kami", summary: "Every friendly stack +4 Defense through the current and next two rounds.", favorCost: 12, context: "battle", target: "none", effect: { type: "battle_status", stat: "defense", amount: 4, durationRounds: 3 }, pantheonIds: ["japanese"] }),
  intervention({ id: "mists_of_the_sidhe", name: "Mists of the S\xEDdhe", summary: "Every hero of yours regains a full day\u2019s movement.", favorCost: 12, context: "adventure", target: "none", effect: { type: "restore_movement", percent: 100 }, pantheonIds: ["celtic"] }),
  intervention({ id: "gift_of_the_feathered_serpent", name: "Gift of the Feathered Serpent", summary: "+1,000 Gold and +3 Crystal at once.", favorCost: 10, context: "adventure", target: "none", effect: { type: "grant_resources", resources: { gold: 1e3, crystal: 3 } }, pantheonIds: ["mesoamerican"] })
];
var WEEKLY_EVENTS = [
  { id: "quiet_week", name: "A Quiet Week", summary: "Nothing unusual stirs this week.", weight: 12, effects: [] },
  { id: "week_of_plenty", name: "Week of Plenty", summary: "Every tier 1\u20133 creature family grows by 3 extra this week.", weight: 4, effects: [{ type: "weekly_growth_bonus", maxTier: 3, amount: 3 }] },
  { id: "week_of_merchants", name: "Week of the Merchants", summary: "Caravans crowd the roads: +300 Gold per day for every empire with a town.", weight: 4, effects: [{ type: "daily_income", resource: "gold", amount: 300 }] },
  { id: "week_of_storms", name: "Week of Storms", summary: "Gales and rain: every hero has 15% less daily movement.", weight: 3, effects: [{ type: "movement_percent", percent: -15 }] },
  { id: "week_of_valor", name: "Week of Valor", summary: "Heralds sing of courage: every army +1 morale.", weight: 3, effects: [{ type: "morale", amount: 1 }] },
  { id: "week_of_omens", name: "Week of Omens", summary: "The auguries are bright: every army +1 luck.", weight: 3, effects: [{ type: "luck", amount: 1 }] },
  { id: "week_of_the_muse", name: "Week of the Muse", summary: "Inspiration flows: every hero recovers 3 extra mana at dawn.", weight: 3, effects: [{ type: "mana_regen", amount: 3 }] },
  { id: "week_of_builders", name: "Week of the Builders", summary: "Quarries and sawmills overflow: +1 Wood and +1 Stone per day for every empire with a town.", weight: 3, effects: [{ type: "daily_income", resource: "wood", amount: 1 }, { type: "daily_income", resource: "stone", amount: 1 }] }
];
var DIFFICULTIES = [
  {
    id: "easy",
    name: "Easy",
    order: 1,
    summary: "A cautious opponent with a thinner treasury.",
    details: ["You start with 125% resources", "AI empires start with 75% and earn 75% income", "The AI attacks only with a clear advantage", "Score \xD70.7"],
    humanStartPercent: 125,
    aiStartPercent: 75,
    aiIncomePercent: 75,
    ai: { heroAttackMargin: 1.5, guardMargin: 1.6, siegeMargin: 1.6, targetHeroes: 2 },
    scorePercent: 70
  },
  {
    id: "normal",
    name: "Normal",
    order: 2,
    summary: "Equal footing: the scenario\u2019s own resources for everyone.",
    details: ["Everyone starts with the scenario\u2019s resources", "Equal income", "Score \xD71.0"],
    humanStartPercent: 100,
    aiStartPercent: 100,
    aiIncomePercent: 100,
    ai: { heroAttackMargin: 1.2, guardMargin: 1.3, siegeMargin: 1.25, targetHeroes: 3 },
    scorePercent: 100
  },
  {
    id: "hard",
    name: "Hard",
    order: 3,
    summary: "A bold opponent with a richer treasury.",
    details: ["AI empires start with 130% resources and earn 125% income", "The AI attacks at smaller advantages and keeps more heroes", "Score \xD71.4"],
    humanStartPercent: 100,
    aiStartPercent: 130,
    aiIncomePercent: 125,
    ai: { heroAttackMargin: 1.05, guardMargin: 1.15, siegeMargin: 1.1, targetHeroes: 4 },
    scorePercent: 140
  },
  // Campaign levels (proposed 2026-10-07; values calibrated with `npm run campaign-sim`, unplaytested).
  // Same creatures and rules as authored; only how many stand in the way, the rivals' purse and the computer's nerve change.
  ...CAMPAIGN_DIFFICULTIES()
];
function CAMPAIGN_DIFFICULTIES() {
  const levels = [
    { id: "campaign_story", name: "Story", order: 11, summary: "For the tale: thinner guards and a cautious enemy.", guardPercent: 75, rivalArmyPercent: 85, hostileThresholdPercent: 130, aiStartPercent: 75, aiIncomePercent: 90, ai: { heroAttackMargin: 1.5, guardMargin: 1.6, siegeMargin: 1.6, targetHeroes: 2 }, scorePercent: 70 },
    { id: "campaign_normal", name: "Normal", order: 12, summary: "The intended challenge: every fight costs something.", guardPercent: 130, rivalArmyPercent: 115, hostileThresholdPercent: 100, aiStartPercent: 100, aiIncomePercent: 100, ai: { heroAttackMargin: 1.2, guardMargin: 1.3, siegeMargin: 1.25, targetHeroes: 3 }, scorePercent: 100 },
    { id: "campaign_hard", name: "Hard", order: 13, summary: "Larger guards, a richer rival and a bold enemy.", guardPercent: 170, rivalArmyPercent: 110, hostileThresholdPercent: 90, aiStartPercent: 130, aiIncomePercent: 120, ai: { heroAttackMargin: 1.05, guardMargin: 1.15, siegeMargin: 1.1, targetHeroes: 4 }, scorePercent: 140 }
  ];
  return levels.map((l) => ({
    ...l,
    scope: "campaign",
    ai: { ...l.ai },
    humanStartPercent: 100,
    details: [
      l.guardPercent === 100 ? "Guards and enemy armies as written" : `Guards and enemy armies: ${l.guardPercent}% of the written numbers`,
      l.hostileThresholdPercent === 100 ? "Enemy heroes attack as written" : l.hostileThresholdPercent > 100 ? "Enemy heroes attack only with a clear advantage" : "Enemy heroes attack at smaller advantages",
      l.aiStartPercent === 100 && l.aiIncomePercent === 100 && l.rivalArmyPercent === 100 ? "Rival empires start and earn as written" : `Rival empires: armies ${l.rivalArmyPercent}%, starting resources ${l.aiStartPercent}%, income ${l.aiIncomePercent}%`,
      `Score \xD7${(l.scorePercent / 100).toFixed(1)}`
    ]
  }));
}
var MAP_EVENT_TEMPLATES = [
  {
    id: "abandoned_camp",
    title: "Abandoned Camp",
    text: "Cold ashes, a torn tent and crates nobody came back for.",
    band: "near",
    options: [
      { label: "Take the supplies", summary: "+600 Gold and +3 Wood", reward: { resources: { gold: 600, wood: 3 } } },
      { label: "Study the scout\u2019s notes", summary: "+300 experience", reward: { questXp: 300 } }
    ]
  },
  {
    id: "wandering_scholar",
    title: "Wandering Scholar",
    text: "A scholar with ink-stained fingers offers lessons \u2014 for a fee.",
    band: "near",
    options: [
      { label: "Pay for lessons", summary: "Pay 1,000 Gold: +1 Knowledge", cost: { gold: 1e3 }, reward: { attributes: { knowledge: 1 } } },
      { label: "Ask for directions", summary: "+250 movement today", reward: { movement: 250 } }
    ]
  },
  {
    id: "warriors_shrine",
    title: "Warrior\u2019s Shrine",
    text: "Old weapons hang from a stone altar, each left by a victor.",
    band: "far",
    options: [
      { label: "Pray for strength", summary: "+1 Attack", reward: { attributes: { attack: 1 } } },
      { label: "Pray for endurance", summary: "+1 Defense", reward: { attributes: { defense: 1 } } }
    ]
  },
  {
    id: "mercenary_band",
    title: "Mercenary Band",
    text: "Centaur outriders between contracts will ride with you \u2014 for gold.",
    band: "far",
    options: [
      { label: "Hire them", summary: "Pay 1,500 Gold: 6 Centaurs join your army", cost: { gold: 1500 }, reward: { creatures: [{ creatureId: "centaur", count: 6 }] } },
      { label: "Send them on their way", summary: "Nothing happens", reward: {} }
    ]
  },
  {
    id: "old_battlefield",
    title: "Old Battlefield",
    text: "Rusted arms and a crested helm lie among the grass.",
    band: "far",
    options: [
      { label: "Search the fallen", summary: "Find a Crested Helm (Panoply of the Phalanx)", reward: { artifactIds: ["phalanx_helm"] } },
      { label: "Bury the dead", summary: "+500 experience", reward: { questXp: 500 } }
    ]
  },
  {
    id: "spring_of_clarity",
    title: "Spring of Clarity",
    text: "Water so clear it seems to hum.",
    band: "near",
    options: [
      { label: "Drink", summary: "+20 mana (up to the hero\u2019s maximum)", reward: { mana: 20 } },
      { label: "Meditate beside it", summary: "+1 Spell Power", reward: { attributes: { power: 1 } } }
    ]
  },
  {
    id: "merchant_caravan",
    title: "Merchant Caravan",
    text: "A caravan stuck in the mud offers a deal, or a reward for help.",
    band: "near",
    options: [
      { label: "Trade", summary: "Pay 1,000 Gold: +5 Wood and +5 Stone", cost: { gold: 1e3 }, reward: { resources: { wood: 5, stone: 5 } } },
      { label: "Help them free the carts", summary: "+1 Crystal and +200 experience", reward: { resources: { crystal: 1 }, questXp: 200 } }
    ]
  },
  {
    id: "hermits_garden",
    title: "Hermit\u2019s Garden",
    text: "A hermit tends herbs and keeps the old rites.",
    band: "far",
    options: [
      { label: "Join the rite", summary: "+4 Favor", reward: { resources: { favor: 4 } } },
      { label: "Learn the herbs", summary: "+1 Knowledge", reward: { attributes: { knowledge: 1 } } }
    ]
  },
  {
    id: "forgotten_armory",
    title: "Forgotten Armory",
    text: "A locked armory; the quartermaster\u2019s ghost still names a price.",
    band: "far",
    options: [
      { label: "Pay the price", summary: "Pay 2,000 Gold: take the Champion\u2019s Blade", cost: { gold: 2e3 }, reward: { artifactIds: ["champion_blade"] } },
      { label: "Leave it locked", summary: "Nothing happens", reward: {} }
    ]
  },
  {
    id: "lost_pilgrims",
    title: "Lost Pilgrims",
    text: "Pilgrims have lost the road to the shrine.",
    band: "near",
    options: [
      { label: "Guide them", summary: "+400 experience", reward: { questXp: 400 } },
      { label: "Ask for alms in return", summary: "+2 Favor and +300 Gold", reward: { resources: { favor: 2, gold: 300 } } }
    ]
  }
];
var DIVINE_GIFTS = [
  { id: "temple_treasury", name: "Temple Treasury", summary: "The priests open the temple coffers: 2,000 Gold.", favorCost: 5, grant: { type: "resources", resources: { gold: 2e3 } }, iconAssetId: "icon.gift.temple_treasury" },
  { id: "timber_and_stone", name: "Timber and Stone", summary: "Pilgrims haul offerings of building stuff: 5 Wood and 5 Stone.", favorCost: 5, grant: { type: "resources", resources: { wood: 5, stone: 5 } }, iconAssetId: "icon.gift.timber_and_stone" },
  { id: "tears_of_the_gods", name: "Tears of the Gods", summary: "Crystal forms where the god wept: 4 Crystal.", favorCost: 6, grant: { type: "resources", resources: { crystal: 4 } }, iconAssetId: "icon.gift.tears_of_the_gods" },
  { id: "anointing", name: "Anointing", summary: "The hero visiting the town is anointed by the high priest: +1,000 experience.", favorCost: 8, grant: { type: "experience", amount: 1e3 }, iconAssetId: "icon.gift.anointing" },
  { id: "blessed_brood", name: "Blessed Brood", summary: "Every dwelling of tiers 1 to 4 in this town gains half a week of growth at once (at least 1).", favorCost: 10, grant: { type: "recruits", maxTier: 4, percentOfWeek: 50 }, iconAssetId: "icon.gift.blessed_brood" },
  { id: "temple_relic", name: "Temple Relic", summary: "The temple lends a relic from its vault to the hero visiting the town: a minor artifact.", favorCost: 20, grant: { type: "artifact", rarity: "minor" }, iconAssetId: "icon.gift.temple_relic" }
];

// ../pantheon_realms/packages/content/src/common/arcana.ts
var spell2 = (s3) => ({
  ...s3,
  access: "sanctum",
  scope: "expanded",
  iconAssetId: `icon.spell.${s3.id}`,
  implementationStatus: "implemented"
});
var ARCANA_SPELLS = [
  // --- Shared Sanctum spells (any pantheon's library may hold them) ---
  spell2({
    id: "ill_omen",
    name: "Ill Omen",
    tier: 1,
    manaCost: 5,
    context: "battle",
    target: "enemy_stack",
    effect: { type: "min_damage_roll", durationRounds: 2 },
    summary: "Enemy stack rolls its minimum damage through the current and next round (a Blessing on it cancels out).",
    lore: "Every army has a soldier who sees a crow on the left and loses heart. The spell finds that soldier in every rank at once and makes him right."
  }),
  spell2({
    id: "shield_of_faith",
    name: "Shield of Faith",
    tier: 1,
    manaCost: 5,
    context: "battle",
    target: "ally_stack",
    effect: { type: "melee_mitigation", numerator: 4, denominator: 5, durationRounds: 2 },
    summary: "Ally takes \xD70.8 damage from melee strikes through the current and next round.",
    lore: "Priests of every road-shrine teach the same prayer: not for victory, only that the next blow land a little lighter. Soldiers say it under their breath before the lines meet."
  }),
  spell2({
    id: "hearthlight",
    name: "Hearthlight",
    tier: 1,
    manaCost: 4,
    context: "battle",
    target: "ally_stack",
    effect: { type: "heal_front", base: 12, perPower: 4 },
    summary: "Heal up to 12 + 4 \xD7 Power of the front creature\u2019s missing HP; no resurrection.",
    lore: "A glow like the fire of home, carried into the field. Wounds close a little, as they do when a mother is near."
  }),
  spell2({
    id: "far_sight",
    name: "Far Sight",
    tier: 1,
    manaCost: 5,
    context: "adventure",
    target: "known_tile",
    effect: { type: "reveal_radius", radius: 2 },
    summary: "Adventure only: reveal radius 2 around a known tile until next dawn.",
    lore: "Shepherds\u2019 magic: look at a hill long enough and you can see what grazes on its far side."
  }),
  spell2({
    id: "ember_burst",
    name: "Ember Burst",
    tier: 2,
    manaCost: 8,
    context: "battle",
    target: "enemy_stack",
    effect: { type: "area_damage", base: 12, perPower: 5 },
    summary: "Enemy stack and every enemy stack beside it take 12 + 5 \xD7 Power damage.",
    lore: "A handful of coals from the forge, thrown with a word. Smiths invented it to keep thieves from their yards; captains made it a weapon."
  }),
  spell2({
    id: "sapping_touch",
    name: "Sapping Touch",
    tier: 2,
    manaCost: 6,
    context: "battle",
    target: "enemy_stack",
    effect: { type: "attack_bonus", amount: -3, durationRounds: 2 },
    summary: "Enemy \u22123 Attack through the current and next round.",
    lore: "The fever-healer\u2019s art turned backwards: instead of drawing sickness out, it pours weariness in."
  }),
  spell2({
    id: "steadfast",
    name: "Steadfast",
    tier: 2,
    manaCost: 6,
    context: "battle",
    target: "ally_stack",
    effect: { type: "defense_bonus", amount: 4, durationRounds: 2 },
    summary: "Ally +4 Defense through the current and next round.",
    lore: "Old sergeants call it the stubborn spell. It does not make soldiers braver, only harder to move."
  }),
  spell2({
    id: "clear_skies",
    name: "Clear Skies",
    tier: 2,
    manaCost: 8,
    context: "adventure",
    target: "known_tile",
    effect: { type: "reveal_radius", radius: 4 },
    summary: "Adventure only: reveal radius 4 around a known tile until next dawn.",
    lore: "Sailors pay well for it: one day without fog, and a whole valley laid out like a map."
  }),
  spell2({
    id: "starfall",
    name: "Starfall",
    tier: 3,
    manaCost: 14,
    context: "battle",
    target: "enemy_army",
    effect: { type: "mass_damage", base: 10, perPower: 4 },
    summary: "Every enemy stack takes 10 + 4 \xD7 Power damage.",
    lore: "On the night the old gods quarrelled, stars fell on both their armies. Astronomers learned to ask for a few more \u2014 but only over the enemy."
  }),
  spell2({
    id: "rallying_hymn",
    name: "Rallying Hymn",
    tier: 3,
    manaCost: 10,
    context: "battle",
    target: "friendly_army",
    effect: { type: "mass_bonus", stat: "defense", amount: 3, durationRounds: 1 },
    summary: "Every friendly stack +3 Defense through the current round.",
    lore: "Every people has a song it sings when the line is about to break. The spell lets the whole army hear it at once."
  }),
  spell2({
    id: "leaden_air",
    name: "Leaden Air",
    tier: 3,
    manaCost: 11,
    context: "battle",
    target: "enemy_army",
    effect: { type: "mass_bonus", stat: "speed", amount: -1, durationRounds: 2 },
    summary: "Every enemy stack \u22121 Speed through the current and next round (never below 1).",
    lore: "The air over the enemy turns thick as summer before a storm. Horses balk; even birds fly low."
  }),
  spell2({
    id: "renewal",
    name: "Renewal",
    tier: 3,
    manaCost: 12,
    context: "battle",
    target: "friendly_army",
    effect: { type: "mass_heal", base: 10, perPower: 5 },
    summary: "The front creature of every friendly stack heals up to 10 + 5 \xD7 Power HP (no resurrection).",
    lore: "Springtime, called down for a moment over a battlefield. It cannot bring back the dead, but it remembers the living."
  }),
  // --- Greek: Glory & Champions ---
  spell2({
    id: "hoplon_wall",
    name: "Hoplon Wall",
    tier: 1,
    manaCost: 5,
    context: "battle",
    target: "ally_stack",
    pantheonId: "greek",
    effect: { type: "melee_mitigation", numerator: 3, denominator: 4, durationRounds: 2 },
    summary: "Ally takes \xD70.75 damage from melee strikes through the current and next round.",
    lore: "Each round shield covers the neighbour\u2019s left side; the line stands or falls together. The spell locks the shields edge to edge as if one smith had forged them all."
  }),
  spell2({
    id: "apollos_arrow",
    name: "Apollo\u2019s Arrow",
    tier: 2,
    manaCost: 8,
    context: "battle",
    target: "enemy_stack",
    pantheonId: "greek",
    effect: { type: "direct_damage", base: 20, perPower: 8 },
    summary: "Enemy stack takes 20 + 8 \xD7 Power direct damage.",
    lore: "The far-shooting god\u2019s arrows brought plague to the proud and light to the faithful. His priests ask only for one arrow, and aim it themselves."
  }),
  spell2({
    id: "wings_of_hermes",
    name: "Wings of Hermes",
    tier: 2,
    manaCost: 7,
    context: "adventure",
    target: "self",
    pantheonId: "greek",
    effect: { type: "movement_bonus", points: 150 },
    summary: "Adventure only: the caster gains 150 movement points today.",
    lore: "The messenger of the gods never walked when he could run, and never ran when he could fly. Heralds who honour him find the road shorter."
  }),
  // --- Norse: Fate & Battle ---
  spell2({
    id: "rune_of_tyr",
    name: "Rune of Tyr",
    tier: 1,
    manaCost: 5,
    context: "battle",
    target: "ally_stack",
    pantheonId: "norse",
    effect: { type: "attack_bonus", amount: 4, durationRounds: 1 },
    summary: "Ally +4 Attack through the current round.",
    lore: "Tyr gave his hand to bind the wolf. Warriors cut his arrow-rune on their blades and ask him for one honest stroke."
  }),
  spell2({
    id: "norns_thread",
    name: "The Norns\u2019 Thread",
    tier: 2,
    manaCost: 7,
    context: "battle",
    target: "enemy_stack",
    pantheonId: "norse",
    effect: { type: "min_damage_roll", durationRounds: 2 },
    summary: "Enemy stack rolls its minimum damage through the current and next round.",
    lore: "At the root of the world-tree three women spin every life. A v\xF6lva who knows the right song can make them shorten one thread \u2014 for a little while."
  }),
  spell2({
    id: "gjallarhorn",
    name: "Gjallarhorn",
    tier: 3,
    manaCost: 12,
    context: "battle",
    target: "enemy_army",
    pantheonId: "norse",
    effect: { type: "mass_bonus", stat: "attack", amount: -2, durationRounds: 2 },
    summary: "Every enemy stack \u22122 Attack through the current and next round.",
    lore: "Heimdall will blow the horn once, at the end of all things. Its echo, called up by a skald, is enough to make an enemy feel that the end has come."
  }),
  // --- Egyptian: Afterlife & Resurrection ---
  spell2({
    id: "ankh_of_renewal",
    name: "Ankh of Renewal",
    tier: 1,
    manaCost: 4,
    context: "battle",
    target: "ally_stack",
    pantheonId: "egyptian",
    effect: { type: "heal_front", base: 15, perPower: 5 },
    summary: "Heal up to 15 + 5 \xD7 Power of the front creature\u2019s missing HP; no resurrection.",
    lore: "The key of life, held to a wound. Temple healers say the ankh does not heal \u2014 it only reminds the body what it was."
  }),
  spell2({
    id: "wrath_of_sekhmet",
    name: "Wrath of Sekhmet",
    tier: 2,
    manaCost: 8,
    context: "battle",
    target: "enemy_stack",
    pantheonId: "egyptian",
    effect: { type: "direct_damage", base: 22, perPower: 9 },
    summary: "Enemy stack takes 22 + 9 \xD7 Power direct damage.",
    lore: "The lioness once nearly devoured mankind and was calmed only with red beer. Her priests can still wake a little of that rage \u2014 and point it."
  }),
  spell2({
    id: "balance_of_maat",
    name: "Balance of Ma\u2019at",
    tier: 3,
    manaCost: 13,
    context: "battle",
    target: "friendly_army",
    pantheonId: "egyptian",
    effect: { type: "mass_heal", base: 12, perPower: 6 },
    summary: "The front creature of every friendly stack heals up to 12 + 6 \xD7 Power HP (no resurrection).",
    lore: "On the scale of judgement a heart is weighed against a feather. Ma\u2019at restores what was taken unjustly \u2014 and in battle, much is."
  }),
  // --- Japanese: Spirits & Harmony ---
  spell2({
    id: "kitsune_fire",
    name: "Kitsune-bi",
    tier: 1,
    manaCost: 5,
    context: "battle",
    target: "enemy_stack",
    pantheonId: "japanese",
    effect: { type: "direct_damage", base: 12, perPower: 5 },
    summary: "Enemy stack takes 12 + 5 \xD7 Power direct damage.",
    lore: "Fox-fire drifts over the rice paddies on autumn nights. Travellers who follow it are lost; enemies who are followed by it burn."
  }),
  spell2({
    id: "yata_mirror",
    name: "Mirror of Yata",
    tier: 2,
    manaCost: 7,
    context: "battle",
    target: "ally_stack",
    pantheonId: "japanese",
    effect: { type: "ranged_mitigation", numerator: 1, denominator: 2, durationRounds: 2 },
    summary: "Ally takes \xD70.5 damage from ranged strikes through the current and next round.",
    lore: "A mirror once drew the sun goddess out of her cave. Its reflection, cast over a company, turns arrows aside like light from polished bronze."
  }),
  spell2({
    id: "raijin_drums",
    name: "Raijin\u2019s Drums",
    tier: 3,
    manaCost: 14,
    context: "battle",
    target: "enemy_army",
    pantheonId: "japanese",
    effect: { type: "mass_damage", base: 12, perPower: 5 },
    summary: "Every enemy stack takes 12 + 5 \xD7 Power damage.",
    lore: "The thunder god beats a ring of drums across the sky. When his shrine-maidens dance, he sometimes beats them over the enemy\u2019s camp."
  }),
  // --- Celtic: Nature & Transformation ---
  spell2({
    id: "bramble_snare",
    name: "Bramble Snare",
    tier: 1,
    manaCost: 4,
    context: "battle",
    target: "enemy_stack",
    pantheonId: "celtic",
    effect: { type: "speed_bonus", amount: -2, durationRounds: 1 },
    summary: "Enemy \u22122 Speed through the current round (never below 1).",
    lore: "Hawthorn is the fairies\u2019 tree; cut it and it takes revenge. The druids simply ask it to reach for the enemy\u2019s ankles."
  }),
  spell2({
    id: "cauldron_of_dagda",
    name: "Cauldron of the Dagda",
    tier: 2,
    manaCost: 7,
    context: "battle",
    target: "ally_stack",
    pantheonId: "celtic",
    effect: { type: "heal_front", base: 25, perPower: 6 },
    summary: "Heal up to 25 + 6 \xD7 Power of the front creature\u2019s missing HP; no resurrection.",
    lore: "No one ever left the Dagda\u2019s cauldron hungry. A ladle of its broth, summoned to the field, mends what hunger and steel have opened."
  }),
  spell2({
    id: "mist_of_manannan",
    name: "Mist of Manann\xE1n",
    tier: 3,
    manaCost: 11,
    context: "battle",
    target: "enemy_army",
    pantheonId: "celtic",
    effect: { type: "mass_bonus", stat: "speed", amount: -2, durationRounds: 2 },
    summary: "Every enemy stack \u22122 Speed through the current and next round (never below 1).",
    lore: "The sea god hides his islands behind a cloak of mist. Druids borrow a corner of it, and the enemy marches in circles."
  }),
  // --- Mesoamerican: Ritual & Sacrifice ---
  spell2({
    id: "jaguar_spirit",
    name: "Jaguar Spirit",
    tier: 1,
    manaCost: 5,
    context: "battle",
    target: "ally_stack",
    pantheonId: "mesoamerican",
    effect: { type: "attack_bonus", amount: 4, durationRounds: 1 },
    summary: "Ally +4 Attack through the current round.",
    lore: "The jaguar hunts by night and by surprise. Warriors who wear its pelt call its spirit into their arms for one leap."
  }),
  spell2({
    id: "smoking_mirror",
    name: "Smoking Mirror",
    tier: 2,
    manaCost: 7,
    context: "battle",
    target: "enemy_stack",
    pantheonId: "mesoamerican",
    effect: { type: "attack_bonus", amount: -4, durationRounds: 2 },
    summary: "Enemy \u22124 Attack through the current and next round.",
    lore: "Tezcatlipoca\u2019s obsidian mirror shows each man his own death. Those who glimpse it fight like men already beaten."
  }),
  spell2({
    id: "rain_of_tlaloc",
    name: "Rain of Tlaloc",
    tier: 2,
    manaCost: 8,
    context: "battle",
    target: "friendly_army",
    pantheonId: "mesoamerican",
    effect: { type: "mass_heal", base: 8, perPower: 4 },
    summary: "The front creature of every friendly stack heals up to 8 + 4 \xD7 Power HP (no resurrection).",
    lore: "The rain god keeps four jars: one waters the maize, the others bring frost, drought and blight. His priests pray only for the first."
  })
];
var art = (id, name, slot3, rarity, effects, summary, lore, origin, price, setId) => ({
  id,
  name,
  slot: slot3,
  effects,
  summary,
  lore,
  iconAssetId: `icon.artifact.${id}`,
  unique: rarity === "relic",
  rarity,
  ...price ? { merchantPrice: price } : {},
  ...origin ? { originPantheonId: origin } : {},
  ...setId ? { setId } : {},
  scope: "expanded",
  provenance: { source: "proposed-this-build", note: "Arcana library 2026-10-01 (P)." }
});
var atk = (amount) => ({ type: "commander_attribute", attribute: "attack", amount });
var def = (amount) => ({ type: "commander_attribute", attribute: "defense", amount });
var pow = (amount) => ({ type: "commander_attribute", attribute: "power", amount });
var know = (amount) => ({ type: "commander_attribute", attribute: "knowledge", amount });
var morale = (amount) => ({ type: "morale", amount });
var luck = (amount) => ({ type: "luck", amount });
var move = (percent) => ({ type: "movement_percent", percent });
var vision = (amount) => ({ type: "vision_radius", amount });
var mana = (amount) => ({ type: "mana_regen", amount });
var income = (resource, amount) => ({ type: "daily_income", resource, amount });
var ARCANA_ARTIFACTS = [
  // --- Head ---
  art(
    "boar_crest_helm",
    "Boar-crested Helm",
    "head",
    "minor",
    [def(2)],
    "+2 commander Defense.",
    "A bronze boar rides the crest, bristles raised. Northern smiths believed the boar watched over a sleeping warrior and woke him before an ambush.",
    "norse",
    { gold: 2500 }
  ),
  art(
    "cap_of_darkness",
    "Cap of Darkness",
    "head",
    "major",
    [vision(2), luck(1)],
    "+2 hexes of adventure vision and +1 Luck.",
    "Made by the Cyclopes for the lord of the dead, it hides its wearer from every eye. A hero who wears it sees much and is seldom seen.",
    "greek",
    { gold: 3500, crystal: 1 },
    "gear_of_perseus"
  ),
  art(
    "nemes_of_ra",
    "Nemes of Ra",
    "head",
    "major",
    [pow(1), know(1)],
    "+1 commander Spell Power and +1 Knowledge.",
    "The striped headcloth of kings, gold and lapis for the sun and the night sky. Whoever wears it speaks with the authority of both.",
    "egyptian",
    { gold: 3e3, crystal: 1 },
    "regalia_of_the_two_lands"
  ),
  art(
    "dragon_kabuto",
    "Dragon Kabuto",
    "head",
    "minor",
    [atk(1), def(1)],
    "+1 commander Attack and +1 Defense.",
    "A lacquered helmet with a gilded dragon between its horns. It was made for a general who never once turned his back on a battle.",
    "japanese",
    { gold: 2500 },
    "treasures_of_takamagahara"
  ),
  art(
    "mistletoe_crown",
    "Mistletoe Crown",
    "head",
    "minor",
    [know(2)],
    "+2 commander Knowledge.",
    "Cut from an oak with a golden sickle on the sixth night of the moon. Druids wear it when they must remember everything at once.",
    "celtic",
    { gold: 2e3 }
  ),
  art(
    "quetzal_war_crown",
    "Quetzal War Crown",
    "head",
    "major",
    [atk(1), morale(1)],
    "+1 commander Attack and +1 morale.",
    "Green plumes of the sacred bird, worth more than gold. A captain who wears them is seen from across the battlefield \u2014 that is the point.",
    "mesoamerican",
    { gold: 3e3, crystal: 1 },
    "gifts_of_the_feathered_serpent"
  ),
  // --- Neck ---
  art(
    "brisingamen_link",
    "Link of Br\xEDsingamen",
    "neck",
    "major",
    [luck(1), pow(1)],
    "+1 Luck and +1 commander Spell Power.",
    "One link of the necklace four dwarves made for the goddess of love and war. It still glows faintly, like a hearth seen through snow.",
    "norse",
    { gold: 3e3, crystal: 1 }
  ),
  art(
    "heart_scarab",
    "Heart Scarab",
    "neck",
    "minor",
    [mana(2)],
    "+2 mana at dawn.",
    "A green stone beetle laid over the heart of the dead, inscribed: \u201CDo not stand against me.\u201D The living wear it so their courage does not testify against them.",
    "egyptian",
    { gold: 2e3 }
  ),
  art(
    "magatama_string",
    "String of Magatama",
    "neck",
    "major",
    [luck(1), vision(1)],
    "+1 Luck and +1 hex of adventure vision.",
    "Curved jewels like claws or crescent moons, strung on silk. They were offered to the sun goddess when the world went dark.",
    "japanese",
    { gold: 2800 },
    "treasures_of_takamagahara"
  ),
  art(
    "torc_of_the_high_king",
    "Torc of the High King",
    "neck",
    "major",
    [morale(1), def(1)],
    "+1 morale and +1 commander Defense.",
    "A twisted gold collar no one may wear who has run from a fight. The warband knows the rule; seeing it on their leader steadies them.",
    "celtic",
    { gold: 3e3 }
  ),
  art(
    "jade_pectoral",
    "Jade Pectoral",
    "neck",
    "major",
    [pow(2)],
    "+2 commander Spell Power.",
    "Green jade is the breath of life. Priest-kings wore a carved plaque over the heart to keep their spirit strong in the presence of gods.",
    "mesoamerican",
    { gold: 3e3, crystal: 1 },
    "gifts_of_the_feathered_serpent"
  ),
  // --- Shoulders (cape) ---
  art(
    "wanderers_grey_cloak",
    "Wanderer\u2019s Grey Cloak",
    "cape",
    "major",
    [vision(2), move(5)],
    "+2 hexes of vision and +5% daily land movement.",
    "A broad-brimmed traveller in a grey cloak asks for a seat by every fire and listens more than he speaks. Some say he leaves his cloak behind for those who listen too.",
    "norse",
    { gold: 3e3 }
  ),
  art(
    "nemean_lionskin",
    "Nemean Lionskin",
    "cape",
    "relic",
    [def(3)],
    "+3 commander Defense. Unique.",
    "No blade could cut the lion of Nemea; the hero strangled it and flayed it with its own claws. The pelt still turns steel.",
    "greek",
    null
  ),
  art(
    "raven_feather_cloak",
    "Raven-feather Cloak",
    "cape",
    "minor",
    [move(10)],
    "+10% daily land movement.",
    "The battle-crow goddess flies over every field before the fighting. A cloak of her feathers makes the road feel like flight.",
    "celtic",
    { gold: 2500 }
  ),
  art(
    "jaguar_pelt_cape",
    "Jaguar-pelt Cape",
    "cape",
    "major",
    [{ type: "creature_stat", stat: "attack", amount: 1, maxTier: 3 }],
    "Tier 1\u20133 creatures +1 Attack in battle.",
    "Only a warrior who has taken four captives may wear the jaguar. Young soldiers fight harder near one, hoping to earn their own.",
    "mesoamerican",
    { gold: 3500 }
  ),
  // --- Weapon ---
  art(
    "harpe_of_perseus",
    "Harpe of Perseus",
    "weapon",
    "major",
    [atk(3)],
    "+3 commander Attack.",
    "A sickle-sword given by the god of messengers, sharp enough to take the head of a monster whose gaze turned men to stone.",
    "greek",
    { gold: 4e3, crystal: 1 },
    "gear_of_perseus"
  ),
  art(
    "rune_marked_sword",
    "Rune-marked Sword",
    "weapon",
    "major",
    [atk(2), luck(1)],
    "+2 commander Attack and +1 Luck.",
    "Its maker hammered his name into the blade in letters no other smith could read. It bends, springs back and never breaks.",
    "norse",
    { gold: 3500 },
    "arms_of_the_einherjar"
  ),
  art(
    "khopesh_of_set",
    "Khopesh of Set",
    "weapon",
    "major",
    [atk(2), pow(1)],
    "+2 commander Attack and +1 Spell Power.",
    "A hooked bronze blade of the red desert\u2019s god \u2014 storm, strength and confusion. It strikes from angles a shield does not expect.",
    "egyptian",
    { gold: 3500 },
    "regalia_of_the_two_lands"
  ),
  art(
    "storm_gods_tachi",
    "Storm God\u2019s Tachi",
    "weapon",
    "relic",
    [atk(2), def(1), luck(1)],
    "+2 commander Attack, +1 Defense and +1 Luck. Unique.",
    "The storm god found it in the tail of the eight-headed serpent he had slain. It is said to part grass like wind and fire like water.",
    "japanese",
    null
  ),
  art(
    "spear_of_lugh",
    "Spear of Lugh",
    "weapon",
    "relic",
    [atk(3), morale(1)],
    "+3 commander Attack and +1 morale. Unique.",
    "One of four treasures the gods brought to Ireland. No battle was ever won against the one who held it.",
    "celtic",
    null,
    "treasures_of_the_tuatha"
  ),
  art(
    "obsidian_macuahuitl",
    "Obsidian Macuahuitl",
    "weapon",
    "major",
    [atk(3)],
    "+3 commander Attack.",
    "A wooden war-club edged with blades of volcanic glass sharper than any steel. Each blade is a fragment of the smoking mirror.",
    "mesoamerican",
    { gold: 4e3, crystal: 1 }
  ),
  // --- Shield ---
  art(
    "polished_bronze_shield",
    "Polished Bronze Shield",
    "shield",
    "major",
    [def(2), vision(1)],
    "+2 commander Defense and +1 hex of vision.",
    "Polished until it was a mirror, so its bearer could look at what must not be looked at. Scouts use it to see around corners.",
    "greek",
    { gold: 3e3 },
    "gear_of_perseus"
  ),
  art(
    "shieldmaiden_round_shield",
    "Shieldmaiden\u2019s Round Shield",
    "shield",
    "major",
    [def(1), { type: "creature_stat", stat: "defense", amount: 1, maxTier: 2 }],
    "+1 commander Defense; tier 1\u20132 creatures +1 Defense in battle.",
    "Painted linden-wood with an iron boss. Shieldmaidens held the front of the wall so the young warriors behind them could learn.",
    "norse",
    { gold: 3e3 },
    "arms_of_the_einherjar"
  ),
  art(
    "shield_of_the_medjay",
    "Shield of the Medjay",
    "shield",
    "minor",
    [def(1), atk(1)],
    "+1 commander Defense and +1 Attack.",
    "Cowhide over a wooden frame, carried by the desert scouts who policed the tombs of kings. Light enough to run with, strong enough to stop a spear.",
    "egyptian",
    { gold: 2200 }
  ),
  art(
    "fianna_targe",
    "Targe of the Fianna",
    "shield",
    "minor",
    [def(2)],
    "+2 commander Defense.",
    "No one joined the war-band of the Fianna until they had stood in a pit with only a shield and a hazel stick, and nine warriors had cast spears at them.",
    "celtic",
    { gold: 2500 }
  ),
  art(
    "eagle_chimalli",
    "Eagle Chimalli",
    "shield",
    "major",
    [def(2), morale(1)],
    "+2 commander Defense and +1 morale.",
    "A round shield faced with eagle feathers and a gold rim. The eagle fights the sun\u2019s enemies every dawn; its warriors fight the empire\u2019s.",
    "mesoamerican",
    { gold: 3200 },
    "gifts_of_the_feathered_serpent"
  ),
  art(
    "bronze_buckler",
    "Bronze Buckler",
    "shield",
    "treasure",
    [def(1)],
    "+1 commander Defense.",
    "A small fist-shield sold in every market from the harbours to the mountains. Not glorious, but often enough.",
    null,
    { gold: 1200 }
  ),
  // --- Workshop wares (tier 1; owner request 2026-10-04): plain crafted gear the Workshop sells four of each week ---
  art(
    "iron_shod_spear",
    "Iron-shod Spear",
    "weapon",
    "treasure",
    [atk(1)],
    "+1 commander Attack.",
    "Ash shaft, iron point, a smith\u2019s mark on the socket. The first weapon of every militia and the last one a veteran gives up.",
    null,
    { gold: 1200 }
  ),
  art(
    "boiled_leather_jerkin",
    "Boiled-leather Jerkin",
    "armor",
    "treasure",
    [def(1)],
    "+1 commander Defense.",
    "Ox-hide boiled in wax until it is hard as wood. It turns a glancing blade and costs a week\u2019s wages.",
    null,
    { gold: 1e3 }
  ),
  art(
    "waxed_travel_cloak",
    "Waxed Travel Cloak",
    "cape",
    "treasure",
    [move(5)],
    "+5% daily land movement.",
    "Wool rubbed with beeswax so the rain runs off. A dry rider rides longer.",
    null,
    { gold: 1e3 }
  ),
  art(
    "copper_circlet",
    "Copper Circlet",
    "head",
    "treasure",
    [know(1)],
    "+1 commander Knowledge.",
    "A plain band hammered from one sheet of copper. Students wear it to keep their hair \u2014 and, they say, their thoughts \u2014 in place.",
    null,
    { gold: 1100 }
  ),
  art(
    "clay_votive_amulet",
    "Clay Votive Amulet",
    "neck",
    "treasure",
    [morale(1)],
    "+1 morale.",
    "A thumb-sized figure of the household god, fired in a potter\u2019s kiln and blessed at the town shrine. Soldiers touch it before every charge.",
    null,
    { gold: 1300 }
  ),
  art(
    "watchmans_lantern",
    "Watchman\u2019s Lantern",
    "misc",
    "treasure",
    [vision(1)],
    "+1 hex of vision.",
    "A horn-paned lantern with a hood that throws its light forward. Night watches see farther, and so does the hero who carries one.",
    null,
    { gold: 900 }
  ),
  art(
    "scholars_oil_lamp",
    "Scholar\u2019s Oil Lamp",
    "misc",
    "treasure",
    [mana(1)],
    "+1 mana at dawn.",
    "A small clay lamp for reading at night. A spellcaster who studies by it wakes with one more charm remembered.",
    null,
    { gold: 1100 }
  ),
  art(
    "bronze_seal_ring",
    "Bronze Seal Ring",
    "ring",
    "treasure",
    [pow(1)],
    "+1 commander Spell Power.",
    "A signet cut with a spiral. Pressed into wax it seals a letter; pressed into a palm before a spell, its owner swears, it seals the spell tighter.",
    null,
    { gold: 1200 }
  ),
  art(
    "woven_saddle_blanket",
    "Woven Saddle Blanket",
    "mount",
    "treasure",
    [move(5)],
    "+5% daily land movement.",
    "Thick wool in the colours of the weaver\u2019s village. A horse that does not chafe walks an extra hour.",
    null,
    { gold: 900 }
  ),
  // --- Armor ---
  art(
    "einherjar_mail",
    "Mail of the Einherjar",
    "armor",
    "major",
    [def(3)],
    "+3 commander Defense.",
    "The chosen dead fight every day in the hall of the slain and are whole again by evening. Their mail mends with them.",
    "norse",
    { gold: 4e3, crystal: 1 },
    "arms_of_the_einherjar"
  ),
  art(
    "lacquered_oyoroi",
    "Lacquered \u014C-yoroi",
    "armor",
    "major",
    [def(2), morale(1)],
    "+2 commander Defense and +1 morale.",
    "Hundreds of lacquered scales laced with silk in the colours of a house. Soldiers recognise the colours across a field and stand firmer.",
    "japanese",
    { gold: 3500 },
    "treasures_of_takamagahara"
  ),
  art(
    "quilted_cotton_armor",
    "Quilted Cotton Armor",
    "armor",
    "minor",
    [def(2)],
    "+2 commander Defense.",
    "Two fingers of salt-hardened cotton, stitched tight. Conquerors from over the sea laughed at it, then traded their steel for it.",
    "mesoamerican",
    { gold: 2200 }
  ),
  art(
    "scarab_scale_corselet",
    "Scarab-scale Corselet",
    "armor",
    "major",
    [def(2), mana(1)],
    "+2 commander Defense and +1 mana at dawn.",
    "Bronze scales shaped like beetles that roll the sun across the sky. The corselet is warm at dawn, as if it knows.",
    "egyptian",
    { gold: 3200 },
    "regalia_of_the_two_lands"
  ),
  // --- Rings ---
  art(
    "draupnir_echo",
    "Echo of Draupnir",
    "ring",
    "major",
    [income("gold", 250)],
    "+250 Gold per day.",
    "Every ninth night the All-father\u2019s ring drips eight rings as heavy as itself. This is one of those \u2014 and it remembers the trick, a little.",
    "norse",
    { gold: 4e3, crystal: 2 }
  ),
  art(
    "andvaris_ring",
    "Andvari\u2019s Ring",
    "ring",
    "major",
    [income("gold", 500), luck(-1)],
    "+500 Gold per day, \u22121 Luck.",
    "The dwarf Andvari cursed the ring when it was taken from him: it would bring gold and ruin to all who owned it. Many have decided the gold is worth it.",
    "norse",
    { gold: 3e3 }
  ),
  art(
    "signet_of_hermes",
    "Signet of Hermes",
    "ring",
    "minor",
    [move(10)],
    "+10% daily land movement.",
    "A herald\u2019s ring with a winged staff cut in carnelian. Gatekeepers wave its bearer through; roads seem to agree.",
    "greek",
    { gold: 2500 }
  ),
  art(
    "jade_ring_of_tlaloc",
    "Jade Ring of Tlaloc",
    "ring",
    "minor",
    [mana(2)],
    "+2 mana at dawn.",
    "Cool as rainwater even in the dry season. Priests wear it to keep their spirit from drying out during long fasts.",
    "mesoamerican",
    { gold: 2200 }
  ),
  art(
    "fairy_ring_band",
    "Fairy-ring Band",
    "ring",
    "minor",
    [luck(1)],
    "+1 Luck.",
    "Woven from grass taken from inside a ring of mushrooms at dawn. The Fair Folk are said to look kindly on whoever wears it \u2014 or at least to look elsewhere.",
    "celtic",
    { gold: 2e3 }
  ),
  // --- Feet ---
  art(
    "boots_of_the_long_road",
    "Boots of the Long Road",
    "feet",
    "major",
    [move(15)],
    "+15% daily land movement.",
    "Cobbled for a pilgrim who swore to visit every shrine of every god. He made it, they say, and the boots outlived him.",
    null,
    { gold: 3500, crystal: 1 }
  ),
  art(
    "tengu_geta",
    "Tengu Geta",
    "feet",
    "minor",
    [move(10), vision(1)],
    "+10% daily land movement and +1 hex of vision.",
    "Tall one-toothed sandals of the mountain goblins, who taught swordsmanship to a boy in the forest. Wearers walk the ridges as if on a road.",
    "japanese",
    { gold: 2500 }
  ),
  art(
    "scribes_papyrus_sandals",
    "Scribe\u2019s Papyrus Sandals",
    "feet",
    "treasure",
    [know(1), move(5)],
    "+1 commander Knowledge and +5% daily land movement.",
    "Woven reed sandals of the temple scribes, who walked between the granaries counting everything. Light, quiet and quick.",
    "egyptian",
    { gold: 1500 }
  ),
  art(
    "skis_of_ullr",
    "Skis of Ullr",
    "feet",
    "major",
    [move(15)],
    "+15% daily land movement.",
    "The god of the hunt crosses the winter faster on his skis than a horse on summer roads. He lends them to anyone who swears by his ring.",
    "norse",
    { gold: 3500, crystal: 1 }
  ),
  // --- Mount ---
  art(
    "sleipnir_horseshoe",
    "Horseshoe of Sleipnir",
    "mount",
    "relic",
    [move(20)],
    "+20% daily land movement. Unique.",
    "A shoe thrown by the eight-legged horse as it leapt the gate of the dead. Any mount that wears it forgets what tiredness was.",
    "norse",
    null
  ),
  art(
    "solar_chariot_harness",
    "Solar Chariot Harness",
    "mount",
    "major",
    [move(10), morale(1)],
    "+10% daily land movement and +1 morale.",
    "Gilded straps from the chariot of a king who drove into battle under the sun-disc. His soldiers followed the glint.",
    "egyptian",
    { gold: 3200 }
  ),
  art(
    "hippeis_barding",
    "Barding of the Hippeis",
    "mount",
    "minor",
    [def(1), move(5)],
    "+1 commander Defense and +5% daily land movement.",
    "Bronze chest-plate for the horse of a cavalry noble. Expensive, heavy, and much admired at festivals.",
    "greek",
    { gold: 2200 }
  ),
  art(
    "wild_hunt_saddle",
    "Saddle of the Wild Hunt",
    "mount",
    "major",
    [move(10), atk(1)],
    "+10% daily land movement and +1 commander Attack.",
    "On storm nights the Hunt rides across the sky. A saddle dropped from it still smells of rain and wants to gallop.",
    "celtic",
    { gold: 3200 }
  ),
  // --- Miscellaneous ---
  art(
    "valkyries_horn",
    "Valkyrie\u2019s Horn",
    "misc",
    "major",
    [morale(1), { type: "battle_xp_percent", percent: 10 }],
    "+1 morale and +10% battle experience.",
    "The choosers of the slain drink from it before they ride. Warriors who hear it blown know they are being watched \u2014 and judged.",
    "norse",
    { gold: 3e3 },
    "arms_of_the_einherjar"
  ),
  art(
    "djed_amulet",
    "Djed Amulet",
    "misc",
    "major",
    [{ type: "casualty_recovery", percent: 10 }],
    "After a won battle each stack regains 10% of its losses (floored).",
    "The backbone of the god who died and rose again. Soldiers carry it so that what falls may stand up.",
    "egyptian",
    { gold: 4e3, crystal: 2 }
  ),
  art(
    "omamori_charm",
    "Omamori Charm",
    "misc",
    "treasure",
    [luck(1)],
    "+1 Luck.",
    "A silk pouch from a shrine, holding a prayer no one may read. Opening it would let the luck out.",
    "japanese",
    { gold: 1500 }
  ),
  art(
    "ogham_staves",
    "Ogham Staves",
    "misc",
    "major",
    [{ type: "spell_damage_percent", percent: 15 }],
    "+15% spell damage.",
    "Twenty letters cut as notches on yew staves, each a tree. Poets cast them to read fate and, when needed, to write it.",
    "celtic",
    { gold: 3500, crystal: 1 }
  ),
  art(
    "sun_stone_codex",
    "Sun-stone Codex",
    "misc",
    "major",
    [{ type: "spell_damage_percent", percent: 10 }, pow(1)],
    "+10% spell damage and +1 commander Spell Power.",
    "A folding book of bark paper that counts the days of five suns. Its reader knows which hour belongs to which god.",
    "mesoamerican",
    { gold: 3500, crystal: 1 }
  ),
  art(
    "lamp_of_prometheus",
    "Lamp of Prometheus",
    "misc",
    "major",
    [mana(2), pow(1)],
    "+2 mana at dawn and +1 commander Spell Power.",
    "A clay lamp lit, the story goes, from the coal the Titan stole for mankind. It has never gone out.",
    "greek",
    { gold: 3500, crystal: 1 }
  ),
  art(
    "cornucopia",
    "Cornucopia",
    "misc",
    "relic",
    [income("wood", 1), income("stone", 1), income("gold", 200)],
    "+200 Gold, +1 Wood and +1 Stone per day. Unique.",
    "The horn of the goat who nursed the king of the gods, broken off and filled forever. Armies that carry it never forage.",
    "greek",
    null
  ),
  art(
    "kibisis",
    "Kibisis",
    "misc",
    "minor",
    [{ type: "battle_xp_percent", percent: 10 }],
    "+10% battle experience.",
    "The silver satchel that carried the monster\u2019s head. Whatever goes into it \u2014 trophies, stories, lessons \u2014 comes out larger.",
    "greek",
    { gold: 2500 },
    "gear_of_perseus"
  ),
  art(
    "cauldron_of_plenty",
    "Cauldron of Plenty",
    "misc",
    "relic",
    [{ type: "casualty_recovery", percent: 10 }, morale(1)],
    "After a won battle each stack regains 10% of its losses; +1 morale. Unique.",
    "The second treasure of the gods of Ireland. It fed every company that came to it, and none went away unsatisfied.",
    "celtic",
    null,
    "treasures_of_the_tuatha"
  ),
  art(
    "stone_of_fal",
    "Stone of F\xE1l",
    "misc",
    "relic",
    [luck(1), def(1)],
    "+1 Luck and +1 commander Defense. Unique.",
    "The third treasure: a stone that roars when the rightful king steps upon it. A fragment of it hums under the hand of a true leader.",
    "celtic",
    null,
    "treasures_of_the_tuatha"
  )
];
var ARCANA_SETS = [
  {
    id: "gear_of_perseus",
    name: "Gear of Perseus",
    summary: "Sickle-sword, mirror shield, cap of darkness and satchel of the hero who slew the Gorgon.",
    pieceIds: ["harpe_of_perseus", "polished_bronze_shield", "cap_of_darkness", "kibisis"],
    bonuses: [
      { pieces: 2, effects: [move(10)], summary: "2 pieces: +10% daily land movement" },
      { pieces: 4, effects: [{ type: "creature_stat", stat: "attack", amount: 2, ability: "flight" }, { type: "battle_xp_percent", percent: 15 }], summary: "4 pieces: flying creatures +2 Attack; +15% battle experience" }
    ]
  },
  {
    id: "arms_of_the_einherjar",
    name: "Arms of the Einherjar",
    summary: "Sword, shield, mail and horn of the warriors chosen for the hall of the slain.",
    pieceIds: ["rune_marked_sword", "shieldmaiden_round_shield", "einherjar_mail", "valkyries_horn"],
    bonuses: [
      { pieces: 2, effects: [morale(1)], summary: "2 pieces: +1 morale" },
      { pieces: 4, effects: [{ type: "creature_stat", stat: "attack", amount: 1 }, { type: "creature_stat", stat: "defense", amount: 1 }], summary: "4 pieces: every creature +1 Attack and +1 Defense in battle" }
    ]
  },
  {
    id: "regalia_of_the_two_lands",
    name: "Regalia of the Two Lands",
    summary: "Headcloth, blade and corselet of a king of the river and the desert.",
    pieceIds: ["nemes_of_ra", "khopesh_of_set", "scarab_scale_corselet"],
    bonuses: [
      { pieces: 2, effects: [mana(2)], summary: "2 pieces: +2 mana at dawn" },
      { pieces: 3, effects: [{ type: "casualty_recovery", percent: 10 }], summary: "3 pieces: after a won battle each stack regains 10% of its losses" }
    ]
  },
  {
    id: "treasures_of_takamagahara",
    name: "Treasures of Takamagahara",
    summary: "Helmet, jewels and armour from the high plain of heaven.",
    pieceIds: ["dragon_kabuto", "magatama_string", "lacquered_oyoroi"],
    bonuses: [
      { pieces: 2, effects: [luck(1)], summary: "2 pieces: +1 Luck" },
      { pieces: 3, effects: [{ type: "creature_stat", stat: "speed", amount: 1, maxTier: 4 }], summary: "3 pieces: tier 1\u20134 creatures +1 Speed in battle" }
    ]
  },
  {
    id: "treasures_of_the_tuatha",
    name: "Treasures of the Tuatha D\xE9",
    summary: "The spear, the cauldron and the stone the gods brought to Ireland.",
    pieceIds: ["spear_of_lugh", "cauldron_of_plenty", "stone_of_fal"],
    bonuses: [
      { pieces: 2, effects: [morale(1)], summary: "2 pieces: +1 morale" },
      { pieces: 3, effects: [{ type: "creature_stat", stat: "defense", amount: 2 }, luck(1)], summary: "3 pieces: every creature +2 Defense in battle; +1 Luck" }
    ]
  },
  {
    id: "gifts_of_the_feathered_serpent",
    name: "Gifts of the Feathered Serpent",
    summary: "Crown, pectoral and shield blessed by the wind god who brought maize and books.",
    pieceIds: ["quetzal_war_crown", "jade_pectoral", "eagle_chimalli"],
    bonuses: [
      { pieces: 2, effects: [luck(1)], summary: "2 pieces: +1 Luck" },
      { pieces: 3, effects: [{ type: "spell_damage_percent", percent: 20 }], summary: "3 pieces: +20% spell damage" }
    ]
  }
];
var EXISTING_LORE = {
  // Spells
  spark: "The first thing every apprentice learns: a crack of light between two fingers, thrown hard. Masters never stop using it.",
  blessing: "A priest touches a spear-point and names a god. For a little while every blow lands as if aimed by that god\u2019s own hand.",
  ward: "A circle drawn in the air around a company. Patron gods grant it to those who keep their oaths.",
  warcry: "A shout that is half prayer, half threat. Soldiers who hear it remember why they came.",
  lightning: "The sky-father\u2019s weapon, borrowed for one stroke. Those who ask too often find the sky stops answering.",
  mend: "Field-surgeons\u2019 magic, plain and practical: flesh remembers being whole and is persuaded to be so again.",
  veil: "A shimmer in the air like heat over stones. Arrows lose their way in it.",
  divine_sight: "Gods see the whole world at once. For a single night, they lend a hero a corner of that view.",
  swiftness: "Spoken over a soldier\u2019s feet, it makes the ground feel like a downhill road.",
  weariness: "Every soldier knows the hour before dawn when the shield gets heavy. This spell brings that hour early.",
  fleet_foot: "Couriers\u2019 magic: the day stretches a little longer for whoever carries urgent news.",
  homecoming: "Every hearth remembers the one who left it. The spell lets that memory pull the hero home.",
  aegis: "The goatskin shield of the sky-father, lent to his daughter of wisdom. Its shadow over an army turns aside every second blow.",
  thunderclap: "The noise of the king of the gods losing his temper. Anyone close enough to hear it is close enough to be hurt.",
  berserkergang: "Bear-shirted warriors who bite their shields and feel no wounds. The spell spreads their madness through the ranks \u2014 briefly.",
  frost_breath: "The breath of the frost giants, who were here before the gods. Joints stiffen, feet freeze to the ground.",
  scarab_swarm: "The scarab rolls the sun across the sky. When angered, a thousand of them roll over whatever stands in the way.",
  eye_of_horus: "The falcon god lost an eye fighting for his father\u2019s throne; it was healed and became a charm of seeing.",
  divine_wind: "A wind sent by the gods once scattered an invading fleet. Called over an army, it pushes every soldier forward.",
  blossom_veil: "Cherry blossoms fall for only a few days. While they fall, nothing sharp seems to reach the one they cover.",
  glamour: "The Fair Folk\u2019s favourite trick: make a sword look like a stick, a captain like a fool. The enemy forgets how to fight.",
  wild_hunt: "Hounds, horns and riders out of the storm. Whatever the Hunt passes over is never quite the same.",
  obsidian_rain: "Volcanic glass falls like hail from a sky the colour of smoke. Priests say the mountain is only returning what was taken from it.",
  fifth_sun: "Four suns have died and the fifth is kept alive by sacrifice. For one round, every warrior burns with its light.",
  // Artifacts
  warding_token: "A clay token stamped with a centaur\u2019s hoof, found in a cache in the hills. Shepherds say it keeps wolves \u2014 and arrows \u2014 away.",
  bronze_standard: "A bronze eagle on an ash pole. Where it stands, the line stands.",
  winged_sandals: "Sandals with small wings at the heel, of the kind the messenger god wears. These are a mortal smith\u2019s copy, and almost as good.",
  bronze_spear: "An honest spear of ash and bronze, the weapon of every citizen soldier.",
  storm_iron_blade: "Forged from iron that fell from the sky in a thunderstorm. It hums before a battle.",
  linen_cuirass: "Layers of linen glued and stitched until they are as stiff as wood. Cheaper than bronze and cooler in summer.",
  scale_hauberk: "Overlapping bronze scales on a leather shirt, like the skin of a river serpent.",
  seers_circlet: "A thin silver band worn by oracles, who see further with their eyes closed.",
  crown_of_counsel: "A crown given to a queen who never made a decision without hearing the poorest of her people first.",
  knucklebone_charm: "Five sheep knucklebones from a game soldiers play in camp. Someone always wins; whoever carries these wins more often.",
  band_of_insight: "A ring of plain iron, engraved inside with \u201CKnow yourself.\u201D",
  watchers_ring: "A ring set with a stone like an eye. The night watch passes it from sentry to sentry.",
  swift_saddle: "A light saddle of the steppe riders, who are born in the saddle and never quite leave it.",
  phalanx_spear: "Long, heavy, and meant to be held with a hundred others pointing the same way.",
  phalanx_aspis: "A great round shield, carried on the left arm to cover the neighbour as much as oneself.",
  phalanx_helm: "A bronze helm with a horsehair crest that makes a man look a head taller in the front rank.",
  sun_diadem: "A diadem of gold rays, worn by a priest-king who was the sun\u2019s representative on earth.",
  sun_scepter: "A gold rod topped with a sun-disc. The priest-king pointed it, and the kingdom moved.",
  sun_signet: "The priest-king\u2019s seal: a sun pressed into wax made any order law.",
  wayfarer_boots: "Boots resoled so many times that nothing of the first pair remains \u2014 except, perhaps, the luck.",
  wayfarer_cloak: "A heavy travelling cloak with deep pockets and a hood that keeps out rain from any direction.",
  wayfarer_compass: "A needle that points not north but toward the nearest place worth seeing.",
  champion_blade: "The sword of a champion whose name is lost. It still remembers every duel.",
  champion_torc: "A champion\u2019s gold neck-ring, worn smooth by years of fighting.",
  champion_banner: "A tattered banner whose emblem has faded. Soldiers still know what it means."
};

// ../pantheon_realms/packages/content/src/catalog.ts
function withLore(defs) {
  return defs.map((d) => d.lore || !EXISTING_LORE[d.id] ? d : { ...d, lore: EXISTING_LORE[d.id] });
}
var VERSIONS = {
  rulesVersion: "pr-0.2-candidate",
  contentVersion: "content-0.8.0",
  campaignVersion: "campaign-three-beacons-0.4",
  mapGeneratorVersion: "pr-mapgen-0.3",
  saveSchemaVersion: 1
};
function index(items, kind) {
  const out = {};
  for (const item of items) {
    if (out[item.id]) throw new Error(`Duplicate ${kind} ID "${item.id}"`);
    out[item.id] = item;
  }
  return out;
}
var KIT_SPECS = [EGYPTIAN_SPEC, JAPANESE_SPEC, CELTIC_SPEC, MESOAMERICAN_SPEC];
function buildCatalog() {
  const greek = buildFamilies(GREEK_FAMILY_SPECS);
  const norse = buildNorseFamilies();
  const neutral = buildFamilies(NEUTRAL_FAMILY_SPECS, { source: "proposed-this-build", note: "Neutral roster (owner request 2026-10-02); proposed values, unplaytested" });
  const kits = KIT_SPECS.map(buildPantheonKit);
  const pantheons = [GREEK_PANTHEON, NORSE_PANTHEON, ...kits.map((k) => k.pantheon)];
  const creatureList = [...greek.creatures, ...norse.creatures, ...kits.flatMap((k) => k.creatures), ...neutral.creatures];
  const creatureIndex = index(creatureList, "creature");
  const arc = buildArcCampaigns((id) => creatureIndex[id], (id) => creatureIndex[id]?.familyId ?? id);
  const familyIndex = index([...greek.families, ...norse.families, ...kits.flatMap((k) => k.families), ...neutral.families], "family");
  const spellIndex = index(withLore([...SPELLS, ...EXPANDED_SPELLS, ...ARCANA_SPELLS]), "spell");
  const godList = [...GREEK_GODS, ...NORSE_GODS, ...kits.flatMap((k) => k.gods)];
  const heroList = withSpecialties([...GREEK_HEROES, ...NORSE_HEROES, ...kits.flatMap((k) => k.heroes), ...ARC_CAMPAIGN_HEROES], { families: familyIndex, creatures: creatureIndex, spells: spellIndex });
  const catalog = {
    versions: VERSIONS,
    rulesProfile: PR_02_CANDIDATE,
    pantheons: index(pantheons, "pantheon"),
    families: familyIndex,
    creatures: creatureIndex,
    abilities: index(ABILITIES, "ability"),
    lore: index([...GREEK_LORE, ...NORSE_LORE, ...kits.flatMap((k) => k.lore), ...NEUTRAL_LORE], "lore"),
    buildings: index([...GREEK_BUILDINGS, ...NORSE_BUILDINGS, ...kits.flatMap((k) => k.buildings)], "building"),
    townArchetypes: index([GREEK_TOWN, NORSE_TOWN, ...kits.map((k) => k.town)], "town archetype"),
    gods: index(godList, "god"),
    godPerks: index(buildGodPerks(godList), "god perk"),
    heroes: index(heroList, "hero"),
    heroClasses: index([...HERO_CLASSES, ...NORSE_HERO_CLASSES, ...kits.flatMap((k) => k.classes)], "hero class"),
    skills: index([...SKILLS, ...EXPANDED_SKILLS], "skill"),
    spells: spellIndex,
    artifacts: index(withLore([...ARTIFACTS, ...SET_ARTIFACTS, ...ARCANA_ARTIFACTS]), "artifact"),
    artifactSets: index([...ARTIFACT_SETS, ...ARCANA_SETS], "artifact set"),
    difficulties: index(DIFFICULTIES, "difficulty"),
    interventions: index(INTERVENTIONS, "intervention"),
    divineGifts: index(DIVINE_GIFTS, "divine gift"),
    climates: index(CLIMATE_RULES, "climate rule"),
    aiTemperaments: index(AI_TEMPERAMENTS, "AI temperament"),
    weeklyEvents: index(WEEKLY_EVENTS, "weekly event"),
    skirmishKits: Object.fromEntries(SKIRMISH_KITS.map((k) => [k.pantheonId, k])),
    mapEventTemplates: index(MAP_EVENT_TEMPLATES, "map event"),
    entitlements: index([...ENTITLEMENTS, ...WINTER_OATH_ENTITLEMENTS, ...arc.entitlements], "entitlement"),
    campaigns: index([THREE_BEACONS, WINTER_OATH, ...arc.campaigns, ...COMING_SOON_CAMPAIGNS], "campaign"),
    missions: index([...THREE_BEACONS_MISSIONS, ...WINTER_OATH_MISSIONS, ...arc.missions, ...SKIRMISH_MISSIONS], "mission"),
    skirmishes: index(SKIRMISH_SCENARIOS, "skirmish"),
    skirmishMaps: index(SKIRMISH_MAPS, "skirmish map"),
    mapTemplates: index([...TEMPLATES, ...WINTER_OATH_TEMPLATES, ...arc.templates, ...SKIRMISH_TEMPLATES], "map template"),
    pantheonOrder: ["greek", "norse", "egyptian", "japanese", "celtic", "mesoamerican"]
  };
  return deepFreeze(catalog);
}

// <stdin>
var c2 = buildCatalog();
module.exports = { heroes: Object.values(c2.heroes), classes: c2.heroClasses };
