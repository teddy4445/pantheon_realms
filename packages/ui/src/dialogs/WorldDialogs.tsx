/**
 * Dialogs for this build's proposed world features: hot-seat hand-over,
 * creature camps, one-time map events, divine interventions on the adventure
 * map, the end of a skirmish, and the keyboard-shortcut reference.
 *
 * Every number shown comes from the rules' quote functions; every change is
 * a command.
 */
import { useState } from 'react';
import {
  campStock,
  interventionUsedThisWeek,
  interventionsFor,
  matchScore,
  missionSite,
  quoteCampRecruitment,
  quoteIntervention,
  quoteMapEvent,
  quoteOpenChest,
  quoteCompleteQuestHut,
  questHutProgress,
  resources,
  type InterventionDefinition,
  type RewardDefinition,
  interventionOf,
} from '@pr/rules';
import { useStore } from '../app/context';
import { MiracleBook, type MiracleOption } from '../components/miraclebook';
import { endOfGameSplash } from '../components/moments';
import { CONTEXT_LABEL, FIXED_KEYS, KEY_ACTIONS, bindingMap, keyLabel, type KeyContext } from '../app/keys';
import { Button, Chip, Modal, QuantitySelector, SectionTitle } from '../components/kit';
import { CreaturePortrait, Emblem } from '../components/art';
import { CostList } from '../components/game';
import { Icon } from '../assets/icons';

// ---------------------------------------------------------------------------
// Hot-seat hand-over
// ---------------------------------------------------------------------------

export function HandoffDialog({ playerId }: { playerId: string }) {
  const store = useStore();
  const catalog = store.catalog;
  const state = store.session!.state;
  const p = state.players[playerId];
  if (!p) return null;
  const begin = () => {
    store.closeOverlay();
    store.showHint('hot_seat');
  };
  return (
    <div className="handoff-layer" role="dialog" aria-modal="true" aria-label={`${p.name}'s turn`} data-testid="handoff">
      <div className="handoff-card panel" style={{ ['--seat' as string]: p.color }}>
        <Emblem catalog={catalog} pantheonId={p.pantheonId} size="4.5rem" />
        <h2>{p.name}</h2>
        <div className="dim">
          {catalog.pantheons[p.pantheonId]?.name} · Week {Math.floor((state.day - 1) / 7) + 1}, Day {((state.day - 1) % 7) + 1}
        </div>
        <p>Pass the computer to {p.name}. The map stays hidden until you are ready.</p>
        <Button variant="primary" size="large" onClick={begin} autoFocus data-testid="handoff-begin">
          Begin {p.name}’s turn
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Creature camps
// ---------------------------------------------------------------------------

export function CampDialog({ heroId, siteId }: { heroId: string; siteId: string }) {
  const store = useStore();
  const catalog = store.catalog;
  const session = store.session!;
  const state = session.state;
  const playerId = session.humanPlayerId;
  const def = missionSite(catalog, state, siteId);
  const base = quoteCampRecruitment(catalog, state, playerId, heroId, siteId, 1);
  const [qty, setQty] = useState(Math.min(1, base.maxQuantity));
  const q = quoteCampRecruitment(catalog, state, playerId, heroId, siteId, qty);
  const creature = base.creatureId ? catalog.creatures[base.creatureId] : undefined;
  const kind = def?.kind.type === 'creature_camp' ? def.kind : null;
  return (
    <Modal
      title={def?.name ?? 'Creature camp'}
      onClose={() => store.closeOverlay()}
      width="36rem"
      testId="camp"
      footer={
        <>
          <Button onClick={() => store.closeOverlay()}>Leave</Button>
          <span className="grow" />
          <Button
            variant="primary"
            icon="growth"
            disabled={!q.legal}
            disabledReason={q.reason}
            onClick={() => {
              if (!store.dispatch({ kind: 'RecruitFromCamp', heroId, siteId, quantity: qty })) {
                store.toast(`${qty} ${qty === 1 ? creature?.name : creature?.pluralName} joined ${state.heroes[heroId]?.name}`, 'success');
                store.closeOverlay();
              }
            }}
            data-testid="camp-recruit"
          >
            Recruit {qty}
          </Button>
        </>
      }
    >
      {creature ? (
        <div className="row gap" style={{ alignItems: 'flex-start' }}>
          <CreaturePortrait catalog={catalog} creatureId={creature.id} size="5rem" />
          <div>
            <p>{def?.description}</p>
            <div className="row gap wrap small">
              <Chip tone="info">
                {campStock(catalog, state, siteId)} {creature.pluralName} available
              </Chip>
              {kind ? <Chip>+{kind.weeklyGrowth} each week</Chip> : null}
              <Chip>Tier {creature.tier}</Chip>
            </div>
            <div className="row gap small" style={{ marginTop: '0.4rem' }}>
              Price each: <CostList cost={base.unitCost} />
            </div>
            <Button size="small" variant="ghost" onClick={() => store.openOverlay({ kind: 'stack-info', creatureId: creature.id })}>
              Creature details
            </Button>
          </div>
        </div>
      ) : null}
      {base.maxQuantity > 0 ? (
        <>
          <SectionTitle>How many?</SectionTitle>
          <QuantitySelector value={qty} max={base.maxQuantity} min={1} onChange={setQty} label="Creatures to recruit" />
          <div className="row gap">
            Total: <CostList cost={q.totalCost} wallet={state.players[playerId]?.wallet} />
          </div>
        </>
      ) : (
        <p className="warn">{base.reason ?? (base.available === 0 ? 'No volunteers this week — come back after the next week begins.' : 'You cannot afford any.')}</p>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// One-time map events
// ---------------------------------------------------------------------------

export function rewardText(catalog: ReturnType<typeof useStore>['catalog'], r: RewardDefinition): string[] {
  const out: string[] = [];
  const res = resources(r.resources ?? {});
  for (const [k, v] of Object.entries(res)) if (v) out.push(`+${v.toLocaleString('en-US')} ${k}`);
  for (const c of r.creatures ?? []) out.push(`${c.count} ${c.count === 1 ? catalog.creatures[c.creatureId]?.name : catalog.creatures[c.creatureId]?.pluralName} join`);
  for (const [k, v] of Object.entries(r.attributes ?? {})) if (v) out.push(`+${v} ${k}`);
  if (r.mana) out.push(`+${r.mana} mana`);
  if (r.movement) out.push(`+${r.movement} movement today`);
  if (r.questXp) out.push(`+${r.questXp} XP`);
  for (const a of r.artifactIds ?? []) out.push(catalog.artifacts[a]?.name ?? a);
  return out;
}

export function MapEventDialog({ heroId, siteId }: { heroId: string; siteId: string }) {
  const store = useStore();
  const catalog = store.catalog;
  const session = store.session!;
  const state = session.state;
  const playerId = session.humanPlayerId;
  const def = missionSite(catalog, state, siteId);
  const kind = def?.kind.type === 'map_event' ? def.kind : null;
  if (!def || !kind) return null;
  const claimed = !!state.world.sites[siteId]?.claimed;
  return (
    <Modal title={kind.title} onClose={() => store.closeOverlay()} width="40rem" testId="map-event" footer={<Button onClick={() => store.closeOverlay()}>{claimed ? 'Close' : 'Decide later'}</Button>}>
      <p className="story-text">{kind.text}</p>
      {claimed ? (
        <p className="dim">This has already happened.</p>
      ) : (
        <div className="event-options">
          {kind.options.map((o, i) => {
            const q = quoteMapEvent(catalog, state, playerId, heroId, siteId, i);
            return (
              <div key={i} className="event-option panel">
                <div className="event-option__label">{o.label}</div>
                <div className="small">{o.summary}</div>
                {o.cost ? (
                  <div className="row gap small">
                    Costs: <CostList cost={o.cost} wallet={state.players[playerId]?.wallet} />
                  </div>
                ) : null}
                <div className="row">
                  <span className="grow" />
                  <Button
                    size="small"
                    variant="primary"
                    disabled={!q.legal}
                    disabledReason={q.reason}
                    onClick={() => {
                      if (!store.dispatch({ kind: 'ResolveMapEvent', heroId, siteId, optionIndex: i })) {
                        store.toast(o.summary, 'success');
                        store.closeOverlay();
                      }
                    }}
                    data-testid={`event-option-${i}`}
                  >
                    Choose
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Treasure chest and quest hut (random-map sites, 2026-10-02)
// ---------------------------------------------------------------------------

export function ChestDialog({ heroId, siteId }: { heroId: string; siteId: string }) {
  const store = useStore();
  const catalog = store.catalog;
  const session = store.session!;
  const state = session.state;
  const playerId = session.humanPlayerId;
  const def = missionSite(catalog, state, siteId);
  const kind = def?.kind.type === 'treasure_chest' ? def.kind : null;
  const hero = state.heroes[heroId];
  if (!def || !kind || !hero) return null;
  const q = quoteOpenChest(catalog, state, playerId, heroId, siteId);
  const claimed = !!state.world.sites[siteId]?.claimed;
  const open = (choice: 'gold' | 'xp') => {
    if (!store.dispatch({ kind: 'OpenChest', heroId, siteId, choice })) {
      store.toast(choice === 'gold' ? `+${kind.gold.toLocaleString('en-US')} Gold` : `${hero.name} studies the journals: +${kind.xp.toLocaleString('en-US')} experience`, 'success');
      store.closeOverlay();
    }
  };
  return (
    <Modal title={def.name} onClose={() => store.closeOverlay()} width="34rem" testId="chest" footer={<Button onClick={() => store.closeOverlay()}>{claimed ? 'Close' : 'Decide later'}</Button>}>
      <p className="story-text">{def.description}</p>
      {claimed ? (
        <p className="dim">The chest is empty.</p>
      ) : (
        <div className="event-options">
          <div className="event-option panel">
            <div className="event-option__label">Take the Gold</div>
            <div className="small">+{kind.gold.toLocaleString('en-US')} Gold for your treasury.</div>
            <div className="row">
              <span className="grow" />
              <Button size="small" variant="primary" disabled={!q.legal} disabledReason={q.reason} onClick={() => open('gold')} data-testid="chest-gold">
                Take Gold
              </Button>
            </div>
          </div>
          <div className="event-option panel">
            <div className="event-option__label">Study the journals</div>
            <div className="small">
              +{kind.xp.toLocaleString('en-US')} experience for {hero.name}.
            </div>
            <div className="row">
              <span className="grow" />
              <Button size="small" variant="primary" disabled={!q.legal} disabledReason={q.reason} onClick={() => open('xp')} data-testid="chest-xp">
                Take experience
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function QuestHutDialog({ heroId, siteId }: { heroId: string; siteId: string }) {
  const store = useStore();
  const catalog = store.catalog;
  const session = store.session!;
  const state = session.state;
  const playerId = session.humanPlayerId;
  const def = missionSite(catalog, state, siteId);
  const kind = def?.kind.type === 'quest_hut' ? def.kind : null;
  if (!def || !kind) return null;
  const claimed = !!state.world.sites[siteId]?.claimed;
  const q = quoteCompleteQuestHut(catalog, state, playerId, heroId, siteId);
  const progress = questHutProgress(catalog, state, playerId, kind.quest);
  const target = kind.quest.type === 'defeat' ? missionSite(catalog, state, kind.quest.siteId) : undefined;
  return (
    <Modal title={def.name} onClose={() => store.closeOverlay()} width="36rem" testId="quest-hut" footer={<Button onClick={() => store.closeOverlay()}>Close</Button>}>
      <p className="story-text">{def.description}</p>
      {claimed ? (
        <p className="dim">You have fulfilled this quest.</p>
      ) : (
        <>
          <div className="small">
            <strong>Quest: </strong>
            {kind.quest.type === 'deliver' ? (
              <>
                bring <CostList cost={kind.quest.resources} wallet={state.players[playerId]?.wallet} />
              </>
            ) : (
              <>
                defeat the {kind.quest.label}
                {target ? ` at ${target.name}` : ''} with one of your heroes. {progress.met ? <Chip tone="ok">Done</Chip> : <Chip tone="warn">Not yet</Chip>}
              </>
            )}
          </div>
          <div className="small">
            <strong>Reward: </strong>
            {rewardText(catalog, kind.reward).join(', ')}
          </div>
          <div className="row">
            <span className="grow" />
            <Button
              variant="primary"
              disabled={!q.legal}
              disabledReason={q.reason}
              onClick={() => {
                if (!store.dispatch({ kind: 'CompleteQuestHut', heroId, siteId })) {
                  store.toast(`Quest fulfilled: ${rewardText(catalog, kind.reward).join(', ')}`, 'success');
                  store.closeOverlay();
                }
              }}
              data-testid="quest-complete"
            >
              {kind.quest.type === 'deliver' ? 'Hand over' : 'Claim the reward'}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Divine interventions (adventure map)
// ---------------------------------------------------------------------------

function InterventionCard({ def, onInvoke, quote }: { def: InterventionDefinition; onInvoke?: () => void; quote: { legal: boolean; reason: string | null } }) {
  return (
    <div className={`intervention panel ${quote.legal ? '' : 'is-disabled'}`} data-testid={`intervention-${def.id}`}>
      <div className="row gap">
        <strong>{def.name}</strong>
        <span className="grow" />
        {/* Just the Favor symbol and the number, no tag (owner request 2026-10-07). */}
        <span className="favor-cost favor-cost--plain" title={`${def.favorCost} Favor`} aria-label={`${def.favorCost} Favor`}>
          <Icon name="favor" className="inline-icon" />
          {def.favorCost}
        </span>
        <Chip>{def.context === 'battle' ? 'In battle' : 'On the map'}</Chip>
      </div>
      <div className="small">{def.summary}</div>
      {onInvoke ? (
        <div className="row">
          <span className="small warn">{quote.legal ? '' : quote.reason}</span>
          <span className="grow" />
          <Button size="small" variant="primary" disabled={!quote.legal} disabledReason={quote.reason} onClick={onInvoke} data-testid={`invoke-${def.id}`}>
            Invoke
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function InterventionList({ adventure }: { adventure: boolean }) {
  const store = useStore();
  const catalog = store.catalog;
  const session = store.session!;
  const state = session.state;
  const playerId = session.humanPlayerId;
  const list = interventionsFor(catalog, state, playerId);
  const towns = Object.values(state.towns).filter((t) => t.ownerId === playerId);
  const [townId, setTownId] = useState(towns[0]?.id ?? '');
  const used = interventionUsedThisWeek(catalog, state, playerId);
  if (list.length === 0) return <p className="dim">Divine interventions are not part of this scenario.</p>;
  return (
    <div className="intervention-list">
      {used ? <p className="small warn">Already invoked this week.</p> : null}
      {list.some((d) => d.context === 'adventure' && d.target === 'own_town') && towns.length > 1 ? (
        <label className="row gap small">
          Town for town miracles:
          <select className="select" value={townId} onChange={(e) => setTownId(e.target.value)} aria-label="Town for town miracles">
            {towns.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {list.map((d) => {
        const q = quoteIntervention(catalog, state, playerId, d.id, { townId: d.target === 'own_town' ? townId : null });
        const humanTurn = state.activePlayerId === playerId && !state.battle;
        const invoke =
          adventure && d.context === 'adventure'
            ? () => {
                if (!store.dispatch({ kind: 'InvokeIntervention', interventionId: d.id, ...(d.target === 'own_town' ? { townId } : {}) })) {
                  store.toast(`${d.name}: the gods answer.`, 'success');
                  store.closeOverlay();
                }
              }
            : undefined;
        return <InterventionCard key={d.id} def={d} quote={humanTurn ? q : { legal: false, reason: 'Not your turn' }} onInvoke={invoke} />;
      })}
    </div>
  );
}

/** The map's Miracles button: the book of Favor (same design as the spellbook; owner request 2026-10-04). */
export function InterventionsDialog() {
  const store = useStore();
  const catalog = store.catalog;
  const session = store.session!;
  const state = session.state;
  const playerId = session.humanPlayerId;
  const list = interventionsFor(catalog, state, playerId);
  const towns = Object.values(state.towns).filter((t) => t.ownerId === playerId);
  const [townId, setTownId] = useState(towns[0]?.id ?? '');
  const humanTurn = state.activePlayerId === playerId && !state.battle;
  const options: Record<string, MiracleOption> = {};
  for (const d of list) {
    const q = quoteIntervention(catalog, state, playerId, d.id, { townId: d.target === 'own_town' ? townId : null });
    options[d.id] = humanTurn ? { legal: q.legal, reason: q.reason } : { legal: false, reason: 'Not your turn' };
  }
  return (
    <MiracleBook
      catalog={catalog}
      title="Divine interventions"
      miracles={list}
      favor={state.players[playerId]?.wallet.favor ?? 0}
      context="adventure"
      usedThisWeek={interventionUsedThisWeek(catalog, state, playerId)}
      options={options}
      testId="interventions"
      idPrefix="invoke-"
      onClose={() => store.closeOverlay()}
      onInvoke={(id) => {
        const d = interventionOf(catalog, state, playerId, id);
        if (!d) return;
        if (!store.dispatch({ kind: 'InvokeIntervention', interventionId: id, ...(d.target === 'own_town' ? { townId } : {}) })) {
          store.toast(`${d.name}: the gods answer.`, 'success');
          store.closeOverlay();
        }
      }}
      extra={
        list.some((d) => d.context === 'adventure' && d.target === 'own_town') && towns.length > 1 ? (
          <label className="row gap small tome__town">
            Town:
            <select className="select" value={townId} onChange={(e) => setTownId(e.target.value)} aria-label="Town for town miracles">
              {towns.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        ) : null
      }
    />
  );
}

// ---------------------------------------------------------------------------
// End of a skirmish
// ---------------------------------------------------------------------------

export function GameOverDialog() {
  const store = useStore();
  const catalog = store.catalog;
  const session = store.session!;
  const state = session.state;
  const outcome = state.outcome;
  if (outcome.status === 'running') return null;
  const winners = (outcome.winnerIds ?? []).map((id) => state.players[id]).filter(Boolean);
  const viewer = session.humanPlayerId;
  const hotSeat = session.humanSeats.length > 1;
  const won = outcome.winnerIds?.includes(viewer) ?? false;
  const score = matchScore(catalog, state, viewer);
  const title = hotSeat ? (winners[0] ? `${winners[0].name} wins` : 'The war is over') : won ? 'Victory' : 'Defeat';
  return (
    <Modal
      title={title}
      width="36rem"
      testId="game-over"
      splash={endOfGameSplash(state, viewer, title, `Day ${outcome.day}`)}
      footer={
        <>
          <Button
            onClick={() => {
              store.endSession();
              store.resetTo('main-menu');
              void store.refreshContinue();
            }}
          >
            Main Menu
          </Button>
          <span className="grow" />
          <Button
            onClick={() =>
              store.confirm('Play this map again?', 'The match restarts from its starting state with the same settings.', 'Restart', () => {
                store.closeAllOverlays();
                session.restartMission();
                store.resetTo('adventure');
                store.openOverlay({ kind: 'briefing' });
              })
            }
            data-testid="game-over-restart"
          >
            Play again
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              store.closeAllOverlays();
              store.goto('summary');
            }}
            autoFocus
            data-testid="game-over-summary"
          >
            View summary
          </Button>
        </>
      }
    >
      <p className={won || hotSeat ? 'success' : 'warn'}>{outcome.reason}</p>
      <p className="small dim">
        Day {outcome.day}. {hotSeat ? '' : `Your score: ${score.total.toLocaleString('en-US')}.`}
        {store.lastRecord?.rank ? ` New high score — rank ${store.lastRecord.rank}.` : ''}
      </p>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Keyboard shortcuts
// ---------------------------------------------------------------------------

export function ShortcutsDialog() {
  const store = useStore();
  const map = bindingMap(store.prefs);
  const contexts: KeyContext[] = ['map', 'adventure', 'battle'];
  return (
    <Modal
      title="Keyboard shortcuts"
      onClose={() => store.closeOverlay()}
      width="44rem"
      testId="shortcuts"
      footer={
        <>
          <span className="small dim">Change any key in Settings → Controls.</span>
          <span className="grow" />
          <Button
            onClick={() => {
              store.closeAllOverlays();
              store.goto('settings', { tab: 'controls' });
            }}
          >
            Change keys
          </Button>
          <Button variant="primary" onClick={() => store.closeOverlay()} autoFocus>
            Close
          </Button>
        </>
      }
    >
      <div className="shortcut-grid">
        {contexts.map((ctx) => (
          <div key={ctx}>
            <SectionTitle>{CONTEXT_LABEL[ctx]}</SectionTitle>
            <table className="shortcut-table small">
              <tbody>
                {KEY_ACTIONS.filter((a) => a.context === ctx).map((a) => (
                  <tr key={a.id}>
                    <td>
                      <span className="kbd">{keyLabel(map[a.id])}</span>
                    </td>
                    <th>{a.label}</th>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        <div>
          <SectionTitle>Always</SectionTitle>
          <table className="shortcut-table small">
            <tbody>
              {FIXED_KEYS.map((k) => (
                <tr key={k.keys}>
                  <td>
                    <span className="kbd">{k.keys}</span>
                  </td>
                  <th>{k.label}</th>
                </tr>
              ))}
              <tr>
                <td>
                  <span className="kbd">Enter</span>
                </td>
                <th>Continue a story scene (Esc: skip it)</th>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}
