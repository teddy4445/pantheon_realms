/**
 * S13 Hero Level-Up. A real pending decision stored in MatchState: the offers
 * were rolled once by the rules, so reopening never rerolls. It opens by itself
 * (store.checkLevelUp, or Continue on the battle result); picking a skill is the
 * choice — it submits ChooseLevelUp at once. Further pending levels follow in
 * order, then the screen underneath returns. At levels 10 and 15 (expanded
 * rules) the gods first offer two gifts: one is picked (it stays selected),
 * then the skill pick submits both.
 */
import { useEffect, useRef, useState } from 'react';
import { useStore } from '../app/context';
import { Button, Chip, Panel } from '../components/kit';
import { HeroPortrait, SkillIcon } from '../components/art';
import { Icon, type IconName } from '../assets/icons';
import { levelUpBannerArt } from '../assets/momentArt';
import { BannerPlaque } from '../components/moments';
import { GiftBadge } from '../components/godGifts';

const ATTR_ICON: Record<string, IconName> = { attack: 'attack', defense: 'defense', power: 'power', knowledge: 'knowledge' };

export function LevelUpScreen() {
  const store = useStore();
  const catalog = store.catalog;
  const state = store.session!.state;
  const playerId = store.session!.humanPlayerId;
  const decision = state.pendingDecisions.find((d) => state.heroes[d.heroId]?.ownerId === playerId);
  useEffect(() => store.showHint('level_up'), [store]);
  // A double click must not also take an offer of the next pending level.
  const lastPick = useRef(0);
  // The chosen gift of the gods, per decision (a new level starts unchosen).
  const [gift, setGift] = useState<{ decisionId: string; index: number } | null>(null);
  if (!decision) {
    return (
      <div className="screen levelup-screen">
        <Panel title="No level-up pending" className="levelup-card">
          <Button variant="primary" onClick={() => store.toAdventure()}>
            Return to the map
          </Button>
        </Panel>
      </div>
    );
  }
  const hero = state.heroes[decision.heroId]!;
  // The hero's own pantheon (not the town's): its painted banner, with the words written live on its plaque.
  const banner = levelUpBannerArt(catalog.heroes[hero.definitionId]?.pantheonId);
  const remaining = state.pendingDecisions.filter((d) => d.heroId === hero.id).length;
  const perkOffers = decision.perkOffers ?? [];
  const giftIndex = gift && gift.decisionId === decision.decisionId ? gift.index : null;
  const needGift = perkOffers.length > 0 && giftIndex === null;
  // Picking an offer is the decision (no separate confirmation); with no offers, Continue takes the primary gain.
  const choose = (idx: number | null) => {
    if (needGift) return;
    const now = performance.now();
    if (now - lastPick.current < 350) return;
    lastPick.current = now;
    const rej = store.dispatch({ kind: 'ChooseLevelUp', decisionId: decision.decisionId, offerIndex: idx, perkIndex: perkOffers.length > 0 ? giftIndex : null });
    if (rej) return;
    const next = store.session!.state.pendingDecisions.some((d) => store.session!.state.heroes[d.heroId]?.ownerId === playerId);
    if (next) return;
    if (store.stack.length > 1) store.back();
    else store.toAdventure();
  };
  return (
    <div className={`screen levelup-screen ${banner ? 'has-banner' : ''}`} data-testid="level-up">
      {banner ? (
        <div className="levelup-banner" data-testid="levelup-banner">
          <BannerPlaque art={banner}>
            <span className={`plaque-text__title ${hero.name.length > 16 ? 'is-long' : ''}`}>{hero.name}</span>
            <span className="plaque-text__level">
              Level up<span className="plaque-text__sep"> · </span>Level {decision.newLevel}
            </span>
          </BannerPlaque>
        </div>
      ) : null}
      <Panel title={banner ? undefined : `${hero.name} reaches level ${decision.newLevel}`} className="levelup-card">
        <div className="levelup-hero">
          <HeroPortrait catalog={catalog} definitionId={hero.definitionId} name={hero.name} size="8rem" />
          <div>
            <div className="levelup-gain">
              <Icon name={ATTR_ICON[decision.primaryGain]!} className="levelup-gain__icon" />
              <span>+1 {decision.primaryGain[0]!.toUpperCase() + decision.primaryGain.slice(1)}</span>
            </div>
            <div className="faint small">Primary gain from the {catalog.heroClasses[hero.classId]?.name} progression.</div>
            {remaining > 1 ? <Chip tone="info">{remaining - 1} more level-up{remaining > 2 ? 's' : ''} after this</Chip> : null}
          </div>
        </div>
        {perkOffers.length > 0 ? (
          <>
            <div className="section-title">A gift of the gods</div>
            <p className="faint small levelup-gift-hint">The gods your empire serves each offer a gift. Take one; the other is gone for this hero.</p>
            <div className="offer-grid gift-grid" role="radiogroup" aria-label="A gift of the gods">
              {perkOffers.map((id, i) => {
                const perk = catalog.godPerks?.[id];
                const god = perk ? catalog.gods[perk.godId] : undefined;
                const on = giftIndex === i;
                return (
                  <button
                    key={`${decision.decisionId}-gift-${i}`}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    className={`offer-card gift-card panel ${on ? 'is-selected' : ''}`}
                    onClick={() => setGift({ decisionId: decision.decisionId, index: i })}
                    data-testid={`gift-${i}`}
                    aria-label={`Gift of ${god?.name ?? 'the gods'}: ${perk?.name ?? id}, ${perk?.summary ?? ''}`}
                  >
                    <span className="offer-card__icon">{perk ? <GiftBadge catalog={catalog} perk={perk} size="4.8rem" /> : null}</span>
                    <span className="offer-card__body">
                      <span className="offer-card__kind">Gift of {god?.name ?? 'the gods'}</span>
                      <span className="offer-card__name">{perk?.name ?? id}</span>
                      <span className="offer-card__text">{perk?.summary}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        ) : null}
        <div className="section-title">Choose a skill</div>
        {needGift && decision.offers.length > 0 ? <p className="faint small" data-testid="levelup-gift-first">Take a gift of the gods first.</p> : null}
        {decision.offers.length === 0 ? <p className="dim">No skill offers are available (all skills are at maximum or slots are full).</p> : null}
        <div className="offer-grid">
          {decision.offers.map((o, i) => {
            const sd = catalog.skills[o.skillId];
            return (
              <button
                key={`${decision.decisionId}-${i}`}
                type="button"
                className="offer-card panel"
                onClick={() => choose(i)}
                disabled={needGift}
                data-testid={`offer-${i}`}
                aria-label={`Take ${sd?.name ?? o.skillId}${o.kind === 'new' ? ' (new skill)' : `, rank ${o.fromRank} to ${o.toRank}`}`}
              >
                <span className="offer-card__icon">{sd ? <SkillIcon iconAssetId={sd.iconAssetId} size="5.4rem" /> : null}</span>
                <span className="offer-card__body">
                  <span className="offer-card__kind">{o.kind === 'new' ? 'New skill' : `Rank ${o.fromRank} → ${o.toRank}`}</span>
                  <span className="offer-card__name">{sd?.name}</span>
                  <span className="rank">
                    {[1, 2, 3].map((r) => (
                      <span key={r} className={r <= o.toRank ? 'on' : ''}>
                        ◆
                      </span>
                    ))}
                  </span>
                  <span className="offer-card__text">{sd?.rankSummaries[o.toRank - 1]}</span>
                </span>
              </button>
            );
          })}
        </div>
        {decision.offers.length === 0 ? (
          <div className="modal__actions">
            <Button variant="primary" size="large" onClick={() => choose(null)} disabled={needGift} disabledReason="Take a gift of the gods first" data-testid="levelup-confirm">
              Continue
            </Button>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
