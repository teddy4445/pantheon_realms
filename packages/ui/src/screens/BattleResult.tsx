/**
 * S12 Battle Result. Shows the committed BattleResultRecord: casualties,
 * experience (with visible caps), rewards granted exactly once by the rules,
 * advanced objectives and queued level-ups. Continue leads to pending
 * level-up decisions first, then back to the adventure map.
 */
import { useEffect } from 'react';
import { RESOURCE_KEYS, scenarioMission } from '@pr/rules';
import { useStore } from '../app/context';
import { Button, Chip, Panel, SectionTitle } from '../components/kit';
import { CreaturePortrait } from '../components/art';
import { CostList } from '../components/game';

export function BattleResultScreen() {
  const store = useStore();
  const catalog = store.catalog;
  const state = store.session!.state;
  const r = state.lastBattleResult;
  const mySide = r?.playerSide ? (r.playerSide === 'attacker' ? r.attacker : r.defender) : null;
  const lost = mySide ? mySide.lines.reduce((n, l) => n + Math.max(0, l.before - l.after), 0) : 0;
  useEffect(() => {
    if (lost > 0) store.showHint('battle_losses');
  }, [lost, store]);
  if (!r) {
    return (
      <div className="screen">
        <p className="pad">No battle result.</p>
        <Button onClick={() => store.toAdventure()}>Return to map</Button>
      </div>
    );
  }
  const playerWon = r.playerSide !== null && r.winner === r.playerSide;
  const title = r.outcome === 'retreat' ? (playerWon ? 'The enemy fled' : 'Retreat') : r.outcome === 'surrender' ? (playerWon ? 'The enemy surrendered' : 'Surrendered') : r.outcome === 'stalemate' ? 'Stalemate' : playerWon ? 'Victory' : 'Defeat';
  const hasRewards = RESOURCE_KEYS.some((k) => r.rewards.resources[k] > 0) || r.rewards.artifactIds.length > 0 || r.rewards.entitlementIds.length > 0;
  const pending = state.pendingDecisions.some((d) => state.heroes[d.heroId]?.ownerId === store.session!.humanPlayerId);
  const onContinue = () => {
    if (pending) {
      store.resetTo('adventure');
      store.goto('level-up');
    } else store.toAdventure();
  };
  const lines = (side: typeof r.attacker) =>
    side.lines.map((l, i) => (
      <tr key={i}>
        <td>
          <span className="row gap">
            <CreaturePortrait catalog={catalog} creatureId={l.creatureId} size="2.2rem" />
            {catalog.creatures[l.creatureId]?.pluralName}
          </span>
        </td>
        <td className="num">{l.before}</td>
        <td className={`num ${l.before - l.after > 0 ? 'danger' : 'faint'}`}>{l.before - l.after > 0 ? `−${l.before - l.after}` : '0'}</td>
        <td className="num">
          {l.after}
          {l.recovered ? (
            <span className="success small" title="Returned after the battle (casualty recovery)" data-testid="recovered">
              {' '}
              (+{l.recovered} returned)
            </span>
          ) : null}
        </td>
      </tr>
    ));
  return (
    <div className="screen result-screen" data-testid="battle-result">
      <div className={`result-banner ${playerWon ? 'is-victory' : 'is-defeat'}`}>
        <div className="result-banner__title">{title}</div>
        <div className="result-banner__sub">
          {r.label} · Day {r.day} · {r.rounds} round{r.rounds === 1 ? '' : 's'}
        </div>
      </div>
      <div className="result-layout">
        {[
          { side: r.attacker, key: 'attacker' as const },
          { side: r.defender, key: 'defender' as const },
        ].map(({ side, key }) => (
          <Panel key={key} title={`${side.name}${r.playerSide === key ? ' (you)' : ''}`} className="result-side">
            <div className="row gap">
              <Chip tone={r.winner === key ? 'ok' : 'bad'}>{r.winner === key ? 'Won' : 'Lost'}</Chip>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Stack</th>
                  <th>Before</th>
                  <th>Lost</th>
                  <th>After</th>
                </tr>
              </thead>
              <tbody>{lines(side)}</tbody>
            </table>
          </Panel>
        ))}
        <Panel title="Outcome" className="result-outcome">
          <p>{r.heroOutcome}</p>
          {r.xpAwarded.length ? (
            <>
              <SectionTitle>Experience</SectionTitle>
              {r.xpAwarded.map((x) => (
                <div key={x.heroId} className="small">
                  {state.heroes[x.heroId]?.name ?? x.heroId}: +{x.amount} XP {x.capped ? <Chip tone="warn">Mission cap reached</Chip> : null}
                </div>
              ))}
            </>
          ) : null}
          {hasRewards ? (
            <>
              <SectionTitle>Rewards</SectionTitle>
              <CostList cost={r.rewards.resources} empty="—" />
              {r.rewards.artifactIds.map((a) => (
                <div key={a} className="small">
                  Artifact: <strong>{catalog.artifacts[a]?.name}</strong> — {catalog.artifacts[a]?.summary}
                </div>
              ))}
              {r.rewards.entitlementIds.map((e) => (
                <div key={e} className="small">
                  Covenant: <strong>{catalog.entitlements[e]?.name}</strong>
                </div>
              ))}
            </>
          ) : null}
          {r.objectivesAdvanced.length ? (
            <>
              <SectionTitle>Objectives</SectionTitle>
              <ul className="bullets small">
                {r.objectivesAdvanced.map((o) => (
                  <li key={o}>{scenarioMission(catalog, state)?.objectives.find((x) => x.id === o)?.title ?? o}</li>
                ))}
              </ul>
            </>
          ) : null}
          {r.levelUpsQueued > 0 ? <p className="success">Level up! {r.levelUpsQueued} decision{r.levelUpsQueued > 1 ? 's' : ''} waiting.</p> : null}
        </Panel>
      </div>
      <footer className="setup-footer">
        <Button variant="primary" size="large" onClick={onContinue} autoFocus data-testid="result-continue">
          {pending ? 'Continue — Level up' : 'Continue'}
        </Button>
      </footer>
    </div>
  );
}
