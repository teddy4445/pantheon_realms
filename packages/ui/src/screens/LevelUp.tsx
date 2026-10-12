/**
 * S13 Hero Level-Up. A real pending decision stored in MatchState: the offers
 * were rolled once by the rules, so reopening never rerolls. It opens by itself
 * (store.checkLevelUp, or Continue on the battle result); picking a skill is the
 * choice — it submits ChooseLevelUp at once. Further pending levels follow in
 * order, then the screen underneath returns. At levels 10 and 15 (expanded
 * rules) the gods first offer two gifts: one is picked (it stays selected),
 * then the skill pick submits both.
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useStore } from '../app/context';
import { Button, Chip, Panel } from '../components/kit';
import { AdventureStage, HeroFigure, HeroMedallion, SkillPlaque, campScene } from '../components/adventure';
import { guiThemeFor } from '../assets/guiArt';
import { Icon, type IconName } from '../assets/icons';
import { levelUpBannerArt } from '../assets/momentArt';
import { BannerPlaque } from '../components/moments';
import { GiftBadge } from '../components/godGifts';

const ATTR_ICON: Record<string, IconName> = { attack: 'attack', defense: 'defense', power: 'power', knowledge: 'knowledge' };
const RANK_NAME: Record<number, string> = { 1: 'Basic', 2: 'Advanced', 3: 'Expert' };

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
  const pantheonId = catalog.heroes[hero.definitionId]?.pantheonId ?? state.players[hero.ownerId]?.pantheonId;
  const gainName = decision.primaryGain[0]!.toUpperCase() + decision.primaryGain.slice(1);
  return (
    <AdventureStage
      mode="screen"
      theme={guiThemeFor(pantheonId)}
      scene={campScene(pantheonId)}
      shade="dim"
      title="A legend grows"
      subtitle={`${hero.name} reaches level ${decision.newLevel}`}
      pantheonId={pantheonId}
      catalog={catalog}
      testId="level-up"
      className="ak-level-stage"
    >
      <div className="ak-level">
        {/* The hero's character portrait beside the choice on wide windows (decorative; the medallion names the hero). */}
        <span className="ak-level__figure" aria-hidden="true">
          <HeroFigure catalog={catalog} definitionId={hero.definitionId} portraitAssetId={hero.portraitAssetId} name={hero.name} />
        </span>
        <div className="ak-level__top">
          <HeroMedallion catalog={catalog} definitionId={hero.definitionId} portraitAssetId={hero.portraitAssetId} name={hero.name} size="clamp(9rem, 24vh, 15rem)" />
          <div className="ak-level__facts">
            {banner ? (
              <div className="levelup-banner" data-testid="levelup-banner">
                <BannerPlaque art={banner}>
                  <span className={`plaque-text__title ${hero.name.length > 16 ? 'is-long' : ''}`}>{hero.name}</span>
                  <span className="plaque-text__level">
                    Level up<span className="plaque-text__sep"> · </span>Level {decision.newLevel}
                  </span>
                </BannerPlaque>
              </div>
            ) : (
              <div className="ak-level__level">Level {decision.newLevel}</div>
            )}
            <div className="levelup-gain ak-level__gain">
              <Icon name={ATTR_ICON[decision.primaryGain]!} className="levelup-gain__icon" />
              <span>+1 {gainName}</span>
            </div>
            <div className="ak-muted small">Primary gain from the {catalog.heroClasses[hero.classId]?.name} progression.</div>
            {remaining > 1 ? (
              <Chip tone="info">
                {remaining - 1} more level-up{remaining > 2 ? 's' : ''} after this
              </Chip>
            ) : null}
          </div>
        </div>
        {perkOffers.length > 0 ? (
          <section className="ak-level__section" aria-label="A gift of the gods">
            <h3 className="ak-level__title">A gift of the gods</h3>
            <p className="ak-muted small levelup-gift-hint">The gods your empire serves each offer a gift. Take one; the other is gone for this hero.</p>
            <div className="ak-level__grid gift-grid" role="radiogroup" aria-label="A gift of the gods">
              {perkOffers.map((id, i) => {
                const perk = catalog.godPerks?.[id];
                const god = perk ? catalog.gods[perk.godId] : undefined;
                return (
                  <SkillPlaque
                    key={`${decision.decisionId}-gift-${i}`}
                    role="radio"
                    selected={giftIndex === i}
                    icon={perk ? <GiftBadge catalog={catalog} perk={perk} size="100%" /> : null}
                    kicker={`Gift of ${god?.name ?? 'the gods'}`}
                    name={perk?.name ?? id}
                    text={perk?.summary}
                    onClick={() => setGift({ decisionId: decision.decisionId, index: i })}
                    testId={`gift-${i}`}
                    ariaLabel={`Gift of ${god?.name ?? 'the gods'}: ${perk?.name ?? id}, ${perk?.summary ?? ''}`}
                  />
                );
              })}
            </div>
          </section>
        ) : null}
        <section className="ak-level__section" aria-label="Choose a skill">
          <h3 className="ak-level__title">Choose a skill</h3>
          {needGift && decision.offers.length > 0 ? (
            <p className="ak-muted small" data-testid="levelup-gift-first">
              Take a gift of the gods first.
            </p>
          ) : null}
          {decision.offers.length === 0 ? <p className="ak-muted">No skill offers are available (all skills are at maximum or slots are full).</p> : null}
          <div className="ak-level__grid" style={{ ['--n' as string]: Math.max(1, Math.min(decision.offers.length, 3)) } as CSSProperties}>
            {decision.offers.map((o, i) => {
              const sd = catalog.skills[o.skillId];
              return (
                <SkillPlaque
                  key={`${decision.decisionId}-${i}`}
                  iconAssetId={sd?.iconAssetId}
                  kicker={o.kind === 'new' ? 'Learn Basic' : `${RANK_NAME[o.fromRank] ?? `Rank ${o.fromRank}`} → ${RANK_NAME[o.toRank] ?? `Rank ${o.toRank}`}`}
                  name={sd?.name ?? o.skillId}
                  text={sd?.rankSummaries[o.toRank - 1]}
                  onClick={() => choose(i)}
                  disabled={needGift}
                  testId={`offer-${i}`}
                  ariaLabel={`Take ${sd?.name ?? o.skillId}${o.kind === 'new' ? ' (new skill)' : `, rank ${o.fromRank} to ${o.toRank}`}`}
                />
              );
            })}
          </div>
          {decision.offers.length === 0 ? (
            <div className="ak-level__continue">
              <Button variant="primary" size="large" onClick={() => choose(null)} disabled={needGift} disabledReason="Take a gift of the gods first" data-testid="levelup-confirm">
                Continue
              </Button>
            </div>
          ) : (
            <p className="ak-muted small ak-level__note">Select a skill to take it and continue your journey.</p>
          )}
        </section>
      </div>
    </AdventureStage>
  );
}
