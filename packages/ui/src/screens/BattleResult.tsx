/**
 * S12 Battle Result. Shows the committed BattleResultRecord: casualties,
 * experience (with visible caps), rewards granted exactly once by the rules,
 * advanced objectives and queued level-ups. Layout (victory and defeat alike):
 * the title, the two sides' boxes side by side at one height right below it,
 * the outcome centred under them and Continue under that, over the player's
 * pantheon painting dimmed by a 20 % black layer. Continue opens pending
 * level-up decisions first, then returns to the adventure map.
 */
import { useEffect } from 'react';
import { scenarioMission } from '@pr/rules';
import { useStore } from '../app/context';
import { Button, Panel, SectionTitle } from '../components/kit';
import { guiThemeFor } from '../assets/guiArt';
import { CreaturePortrait } from '../components/art';
import { RewardTray } from '../components/rewards';
import { artifactPlace, resourceItems, type ReceiptItem } from '../app/rewards';
import { ResultSplash } from '../components/moments';
import { resultSplashArt } from '../assets/momentArt';

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
  // The player's own pantheon painting behind the result (a win or a loss; a stalemate keeps the plain screen).
  const playerRecord = r.playerSide === 'attacker' ? r.attacker : r.playerSide === 'defender' ? r.defender : null;
  const splash = playerRecord?.playerId && r.outcome !== 'stalemate' ? resultSplashArt(state.players[playerRecord.playerId]?.pantheonId, playerWon) : null;
  // The committed rewards of this battle (granted once by the rules), as tray items: resources, each hero's
  // experience (with its cap), artifacts (where they went) and covenants. Casualties stay in the side tables.
  const winnerHeroIds = r.xpAwarded.map((x) => x.heroId);
  const placeOf = (artifactId: string): string => {
    for (const id of winnerHeroIds) {
      const h = state.heroes[id];
      if (!h) continue;
      if (Object.values(h.equipment).some((e) => e?.artifactId === artifactId)) return artifactPlace('equipped', h.name);
      if (h.backpack.some((e) => e.artifactId === artifactId)) return artifactPlace('backpack', h.name);
    }
    return state.mission.flags[`cache:${artifactId}`] ? artifactPlace('cache', '') : 'Taken from the field';
  };
  const trayItems: ReceiptItem[] = [
    ...resourceItems(r.rewards.resources),
    ...r.xpAwarded
      .filter((x) => x.amount > 0)
      .map((x) => ({ kind: 'xp' as const, key: `xp:${x.heroId}`, iconId: 'icon.stat.xp', amount: `+${x.amount.toLocaleString('en-US')}`, label: r.xpAwarded.length > 1 ? `${state.heroes[x.heroId]?.name ?? 'Hero'} · Experience` : 'Experience', ...(x.capped ? { note: 'Mission cap reached' } : {}) })),
    ...r.rewards.artifactIds.map((a, i) => ({ kind: 'artifact' as const, key: `art:${a}:${i}`, iconId: catalog.artifacts[a]?.iconAssetId ?? '', amount: '', label: catalog.artifacts[a]?.name ?? a, note: placeOf(a), artifactId: a })),
    ...r.rewards.entitlementIds.map((e) => ({ kind: 'entitlement' as const, key: `ent:${e}`, iconId: 'icon.ui.gift', amount: '', label: catalog.entitlements[e]?.name ?? e, note: 'Covenant' })),
  ];
  const xpNotes = r.xpAwarded
    .filter((x) => x.capped)
    .map((x) => (x.amount > 0 ? `${state.heroes[x.heroId]?.name ?? 'The hero'} reached this mission’s experience cap: ${x.amount.toLocaleString('en-US')} experience counted.` : `${state.heroes[x.heroId]?.name ?? 'The hero'} is at this mission’s experience cap: no experience gained.`));
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
    <div className={`screen result-screen ${splash ? 'result-screen--splash' : ''}`} data-testid="battle-result">
      {splash ? <ResultSplash art={splash} shade /> : null}
      <div className="result-body">
        <div className={`result-banner ${playerWon ? 'is-victory' : 'is-defeat'}`}>
          <div className="result-banner__title">{title}</div>
        </div>
        <div className="result-sides">
          {/* The player's side first (left), as on the battlefield (owner request 2026-10-14). */}
          {(r.playerSide === 'defender'
            ? [
                { side: r.defender, key: 'defender' as const },
                { side: r.attacker, key: 'attacker' as const },
              ]
            : [
                { side: r.attacker, key: 'attacker' as const },
                { side: r.defender, key: 'defender' as const },
              ]
          ).map(({ side, key }) => (
            <Panel key={key} title={`${side.name}${r.playerSide === key ? ' (you)' : ''}`} className="result-side" bodyClassName="scroll" framed="compact" theme={side.playerId ? guiThemeFor(state.players[side.playerId]?.pantheonId) : undefined}>
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
        </div>
        <Panel title="Outcome" className="result-outcome" framed="compact" surface="parchment">
          <p>{r.heroOutcome}</p>
          {trayItems.length ? (
            <div className="result-rewards" data-testid="result-rewards">
              <SectionTitle>{playerWon ? 'Spoils of victory' : 'Gained'}</SectionTitle>
              <RewardTray items={trayItems} label="Battle rewards" />
            </div>
          ) : null}
          {xpNotes.map((n) => (
            <p key={n} className="small warn result-outcome__cap">
              {n}
            </p>
          ))}
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
          {r.levelUpsQueued > 0 ? <p className="success">Level up! {r.levelUpsQueued > 1 ? `${r.levelUpsQueued} new levels` : 'A new level'} to choose next.</p> : null}
        </Panel>
        <div className="result-actions">
          <Button variant="primary" size="large" onClick={onContinue} autoFocus data-testid="result-continue">
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
