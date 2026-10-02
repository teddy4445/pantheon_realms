/**
 * S13 Hero Level-Up. A real pending decision stored in MatchState: the offers
 * were rolled once by the rules, so reopening never rerolls. Choosing submits
 * ChooseLevelUp; further pending levels are shown in order.
 */
import { useEffect, useState } from 'react';
import { useStore } from '../app/context';
import { Button, Chip, Panel } from '../components/kit';
import { HeroPortrait, SkillIcon } from '../components/art';
import { Icon, type IconName } from '../assets/icons';

const ATTR_ICON: Record<string, IconName> = { attack: 'attack', defense: 'defense', power: 'power', knowledge: 'knowledge' };

export function LevelUpScreen() {
  const store = useStore();
  const catalog = store.catalog;
  const state = store.session!.state;
  const playerId = store.session!.humanPlayerId;
  const decision = state.pendingDecisions.find((d) => state.heroes[d.heroId]?.ownerId === playerId);
  const [choice, setChoice] = useState<number | null>(null);
  useEffect(() => store.showHint('level_up'), [store]);
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
  const remaining = state.pendingDecisions.filter((d) => d.heroId === hero.id).length;
  const confirm = () => {
    const idx = decision.offers.length === 0 ? null : choice;
    if (decision.offers.length > 0 && idx === null) return;
    const rej = store.dispatch({ kind: 'ChooseLevelUp', decisionId: decision.decisionId, offerIndex: idx });
    if (rej) return;
    setChoice(null);
    const next = store.session!.state.pendingDecisions.some((d) => store.session!.state.heroes[d.heroId]?.ownerId === playerId);
    if (!next) store.toAdventure();
  };
  return (
    <div className="screen levelup-screen" data-testid="level-up">
      <Panel title={`${hero.name} reaches level ${decision.newLevel}`} className="levelup-card">
        <div className="levelup-hero">
          <HeroPortrait catalog={catalog} definitionId={hero.definitionId} name={hero.name} size="8rem" />
          <div>
            <div className="levelup-gain">
              <Icon name={ATTR_ICON[decision.primaryGain]!} className="levelup-gain__icon" />
              <span>
                +1 {decision.primaryGain[0]!.toUpperCase() + decision.primaryGain.slice(1)}
              </span>
            </div>
            <div className="faint small">Primary gain from the {catalog.heroClasses[hero.classId]?.name} progression.</div>
            {remaining > 1 ? <Chip tone="info">{remaining - 1} more level-up{remaining > 2 ? 's' : ''} after this</Chip> : null}
          </div>
        </div>
        <div className="section-title">Choose a skill</div>
        {decision.offers.length === 0 ? <p className="dim">No skill offers are available (all skills are at maximum or slots are full).</p> : null}
        <div className="offer-grid">
          {decision.offers.map((o, i) => {
            const sd = catalog.skills[o.skillId];
            return (
              <button key={i} type="button" className={`offer-card panel ${choice === i ? 'is-selected' : ''}`} onClick={() => setChoice(i)} aria-pressed={choice === i} data-testid={`offer-${i}`}>
                <div className="offer-card__kind">{o.kind === 'new' ? 'New skill' : `Rank ${o.fromRank} → ${o.toRank}`}</div>
                {sd ? <SkillIcon iconAssetId={sd.iconAssetId} size="3rem" /> : null}
                <div className="offer-card__name">{sd?.name}</div>
                <div className="rank">
                  {[1, 2, 3].map((r) => (
                    <span key={r} className={r <= o.toRank ? 'on' : ''}>
                      ◆
                    </span>
                  ))}
                </div>
                <div className="small">{sd?.rankSummaries[o.toRank - 1]}</div>
              </button>
            );
          })}
        </div>
        <div className="modal__actions">
          <Button variant="primary" size="large" disabled={decision.offers.length > 0 && choice === null} disabledReason="Choose one of the offers" onClick={confirm} data-testid="levelup-confirm">
            Confirm
          </Button>
        </div>
      </Panel>
    </div>
  );
}
