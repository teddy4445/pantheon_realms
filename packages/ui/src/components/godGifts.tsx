/**
 * The gods' gifts to heroes (levels 10 and 15). No new art: a gift is drawn with
 * its god's existing portrait and the existing stat icon of its theme.
 */
import type { ContentCatalog, GodPerkDefinition, HeroState } from '@pr/rules';
import { Icon, type IconName } from '../assets/icons';
import { GodPortrait } from './art';

/** Each gift theme → the stat icon that already says what it gives. */
export const GIFT_THEME_ICON: Readonly<Record<string, IconName>> = {
  might: 'attack',
  guard: 'defense',
  sorcery: 'power',
  lore: 'knowledge',
  strategy: 'sword2',
  glory: 'xp',
  fortune: 'luck',
  majesty: 'morale',
  watch: 'eye',
  plenty: 'gold',
  healing: 'hp',
  renewal: 'mana',
  travel: 'movement',
  horizon: 'map',
  hunt: 'bow',
  swift: 'speed',
  storm: 'spell',
  afterlife: 'damage',
};

export function giftIcon(perk: GodPerkDefinition | undefined): IconName {
  return (perk && GIFT_THEME_ICON[perk.theme]) || 'gift';
}

/** The god's portrait with the gift's stat icon on its lower edge. */
export function GiftBadge({ catalog, perk, size = '4.6rem' }: { catalog: ContentCatalog; perk: GodPerkDefinition; size?: string }) {
  return (
    <span className="gift-badge" style={{ width: size, height: size }}>
      <GodPortrait catalog={catalog} godId={perk.godId} size={size} />
      <span className="gift-badge__icon" aria-hidden="true">
        <Icon name={giftIcon(perk)} />
      </span>
    </span>
  );
}

/** The gifts a hero has taken, for the Hero screen (nothing when it has none). */
export function HeroGifts({ catalog, hero, size = '2.4rem' }: { catalog: ContentCatalog; hero: HeroState; size?: string }) {
  const perks = (hero.perks ?? []).map((id) => catalog.godPerks?.[id]).filter((p): p is GodPerkDefinition => !!p);
  if (perks.length === 0) return null;
  return (
    <div className="hero-gifts" data-testid="hero-gifts">
      {perks.map((p) => (
        <div key={p.id} className="specialty hero-gift" data-testid={`hero-gift-${p.id}`} title={`A gift of ${catalog.gods[p.godId]?.name ?? p.godId}`}>
          <GiftBadge catalog={catalog} perk={p} size={size} />
          <div>
            <div className="specialty__name">
              <span className="specialty__tag">Gift</span> {p.name}
            </div>
            <div className="small">{p.summary}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
