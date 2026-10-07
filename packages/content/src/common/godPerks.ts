/**
 * The gods' gifts to heroes (owner request 2026-10-07): at hero levels 10 and 15
 * the level-up offers two gifts from the gods the hero's empire committed to.
 * Every god gives two, one for each word of its domain ("War & Conquest" → a
 * gift of war and a gift of conquest), so the gifts follow what each god stands
 * for. A word's theme is a small bundle of effects from the shared vocabulary;
 * when both words of a god name the same theme, the second takes the theme's
 * neighbour, so a god never offers the same gift twice. The interface draws a
 * gift with the god's portrait and the theme's existing stat icon — no new art.
 * Values are proposed and unplaytested.
 */
import type { EffectDefinition, GodDefinition, GodPerkDefinition } from '@pr/rules';

interface Theme {
  /** What the gift is called after the god's name when the domain word does not read well. */
  readonly label: string;
  readonly summary: string;
  readonly effects: readonly EffectDefinition[];
}

export const PERK_THEMES: Readonly<Record<string, Theme>> = {
  might: { label: 'Might', summary: '+2 Attack', effects: [{ type: 'commander_attribute', attribute: 'attack', amount: 2 }] },
  guard: { label: 'Guard', summary: '+2 Defense', effects: [{ type: 'commander_attribute', attribute: 'defense', amount: 2 }] },
  sorcery: { label: 'Sorcery', summary: '+2 Spell Power', effects: [{ type: 'commander_attribute', attribute: 'power', amount: 2 }] },
  lore: { label: 'Lore', summary: '+2 Knowledge', effects: [{ type: 'commander_attribute', attribute: 'knowledge', amount: 2 }] },
  strategy: {
    label: 'Strategy',
    summary: '+1 Attack and +1 Defense',
    effects: [
      { type: 'commander_attribute', attribute: 'attack', amount: 1 },
      { type: 'commander_attribute', attribute: 'defense', amount: 1 },
    ],
  },
  glory: { label: 'Glory', summary: '+25 % experience from battles this hero wins', effects: [{ type: 'battle_xp_percent', percent: 25 }] },
  fortune: { label: 'Fortune', summary: '+1 Luck', effects: [{ type: 'luck', amount: 1 }] },
  majesty: { label: 'Majesty', summary: '+1 Morale', effects: [{ type: 'morale', amount: 1 }] },
  watch: { label: 'Watch', summary: '+3 hexes of vision', effects: [{ type: 'vision_radius', amount: 3 }] },
  plenty: { label: 'Plenty', summary: '+350 Gold a day', effects: [{ type: 'daily_income', resource: 'gold', amount: 350 }] },
  healing: { label: 'Healing', summary: 'After a won battle, 15 % of the army’s losses return', effects: [{ type: 'casualty_recovery', percent: 15 }] },
  renewal: { label: 'Renewal', summary: '+4 mana every dawn', effects: [{ type: 'mana_regen', amount: 4 }] },
  travel: { label: 'Travel', summary: '+15 % movement on land', effects: [{ type: 'movement_percent', percent: 15 }] },
  horizon: {
    label: 'Horizon',
    summary: '+10 % movement on land and +1 hex of vision',
    effects: [
      { type: 'movement_percent', percent: 10 },
      { type: 'vision_radius', amount: 1 },
    ],
  },
  hunt: { label: 'Hunt', summary: 'Shooting creatures +2 Attack in battle', effects: [{ type: 'creature_stat', stat: 'attack', amount: 2, ability: 'shooter' }] },
  swift: { label: 'Swiftness', summary: 'Every creature +1 Speed in battle', effects: [{ type: 'creature_stat', stat: 'speed', amount: 1 }] },
  storm: { label: 'Storm', summary: '+20 % damage from this hero’s spells', effects: [{ type: 'spell_damage_percent', percent: 20 }] },
  afterlife: { label: 'Afterlife', summary: 'A stack reduced to a third of its creatures fights with +3 Attack', effects: [{ type: 'wounded_fury', attack: 3, numerator: 1, denominator: 3 }] },
};

/** Each word of the gods' domains → its theme. */
export const DOMAIN_THEME: Readonly<Record<string, string>> = {
  Lightning: 'storm', Storms: 'storm', Thunder: 'storm', Fire: 'storm',
  Power: 'might', War: 'might', Strength: 'might',
  Conquest: 'glory', Honor: 'glory', Dominion: 'glory',
  Knowledge: 'lore', Inspiration: 'lore', Skill: 'lore', Insight: 'lore',
  Strategy: 'strategy',
  Magic: 'sorcery', Night: 'sorcery', Shadow: 'sorcery', Prophecy: 'sorcery', Wisdom: 'sorcery', Control: 'sorcery', Transformation: 'sorcery', 'the Otherworld': 'sorcery', Change: 'sorcery',
  Foresight: 'fortune', Trickery: 'fortune', Chaos: 'fortune', Grace: 'fortune', Fate: 'fortune', Mists: 'fortune',
  Protection: 'guard', 'Funerary Protection': 'guard', Guardianship: 'guard', Vigilance: 'guard', Family: 'guard', Justice: 'guard', 'the Land': 'guard', Earth: 'guard',
  Alertness: 'watch',
  Sun: 'majesty', Light: 'majesty', Kingship: 'majesty', Authority: 'majesty', Law: 'majesty', Ancestry: 'majesty', Joy: 'majesty', Love: 'majesty', Arts: 'majesty', Hearth: 'majesty',
  Abundance: 'plenty', Prosperity: 'plenty', Bounty: 'plenty', Fertility: 'plenty', Trade: 'plenty',
  Healing: 'healing', Harvest: 'healing', Purity: 'healing', Vitality: 'healing', Rebirth: 'healing', Survival: 'healing', Renewal: 'healing',
  Creation: 'renewal', Eternity: 'renewal', Transition: 'renewal', Rain: 'renewal',
  Movement: 'travel', Journeys: 'travel', Journey: 'travel', Wilderness: 'travel',
  Sea: 'horizon', Seas: 'horizon', Waters: 'horizon', 'River Power': 'horizon', Wind: 'horizon',
  Hunt: 'hunt', Wilds: 'hunt',
  Horses: 'swift',
  Underworld: 'afterlife', Death: 'afterlife', 'Underworld Guidance': 'afterlife',
};

/** When a god's two words share a theme (or its domain has one word), the second gift takes this one. */
const NEIGHBOUR: Readonly<Record<string, string>> = {
  might: 'glory', guard: 'afterlife', sorcery: 'lore', lore: 'sorcery', strategy: 'might', glory: 'might', fortune: 'sorcery', majesty: 'guard', watch: 'guard',
  plenty: 'healing', healing: 'renewal', renewal: 'healing', travel: 'horizon', horizon: 'travel', hunt: 'travel', swift: 'travel', storm: 'might', afterlife: 'sorcery',
};

const possessive = (name: string) => (name.endsWith('s') ? `${name}’` : `${name}’s`);

/** The two gifts of one god. Throws for a domain word without a theme (content must cover every god). */
export function godPerksOf(god: GodDefinition): GodPerkDefinition[] {
  const words = god.domain.split(/\s*&\s*/).map((w) => w.trim()).filter(Boolean);
  const themes = words.map((w) => {
    const t = DOMAIN_THEME[w];
    if (!t) throw new Error(`No gift theme for "${w}" (${god.name})`);
    return t;
  });
  const first = themes[0]!;
  const second = themes[1] && themes[1] !== first ? themes[1] : NEIGHBOUR[first]!;
  const secondWord = themes[1] && themes[1] !== first ? words[1]! : null;
  return [
    { theme: first, word: words[0]! },
    { theme: second, word: secondWord },
  ].map(({ theme, word }, i) => {
    const t = PERK_THEMES[theme]!;
    // "Athena's Knowledge"; a borrowed theme takes its own label ("Hera's Guard").
    const name = `${possessive(god.name)} ${word && !word.startsWith('the ') ? word : t.label}`;
    return { id: `${god.id}.gift${i + 1}`, godId: god.id, theme, name, summary: t.summary, effects: t.effects };
  });
}

export function buildGodPerks(gods: readonly GodDefinition[]): GodPerkDefinition[] {
  return gods.filter((g) => g.implementationStatus === 'implemented' && g.role !== 'undesigned').flatMap(godPerksOf);
}
