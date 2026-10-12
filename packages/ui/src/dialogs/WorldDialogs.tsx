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
import { CreaturePortrait, Emblem, briefingArt } from '../components/art';
import { CostList } from '../components/game';
import { Icon, RESOURCE_ICON } from '../assets/icons';
import { ChoiceGroup, GuiArtHeader, GuiSocket, LockGlyph, playerTheme, useOnce, type ChoiceOption } from '../components/gui';
import { ENCOUNTER_FALLBACK, encounterArt, guiArt, guiThemeFor } from '../assets/guiArt';
import { AdventureStage, CreatureStage, encounterScene } from '../components/adventure';
import { RewardTray } from '../components/rewards';
import { rewardPreviewItems } from '../app/rewards';
import { formatNumber } from '../app/view';
import { RESOURCE_KEYS, RESOURCE_LABELS, scenarioMission, type MatchState, type ContentCatalog } from '@pr/rules';

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

/**
 * A creature camp (1.1.0 adventure screen): the camp's own creature standing in
 * the landscape of the camp's ground (by climate and terrain — no town faction
 * is invented for a neutral camp), its details and the recruitment at the
 * right. quoteCampRecruitment and RecruitFromCamp, as before (never the town's
 * RecruitUnits); range, stock and price rules stay the rules'.
 */
export function CampDialog({ heroId, siteId }: { heroId: string; siteId: string }) {
  const store = useStore();
  const catalog = store.catalog;
  const session = store.session!;
  const state = session.state;
  const playerId = session.humanPlayerId;
  const def = missionSite(catalog, state, siteId);
  const base = quoteCampRecruitment(catalog, state, playerId, heroId, siteId, 1);
  const [qty, setQty] = useState(Math.min(1, base.maxQuantity));
  // Revalidated against the current state on every render (and by the rules on dispatch).
  const n = Math.max(1, Math.min(qty, Math.max(1, base.maxQuantity)));
  const q = quoteCampRecruitment(catalog, state, playerId, heroId, siteId, n);
  const creature = base.creatureId ? catalog.creatures[base.creatureId] : undefined;
  const kind = def?.kind.type === 'creature_camp' ? def.kind : null;
  const [pending, once] = useOnce();
  const hero = state.heroes[heroId];
  const close = () => store.closeOverlay();
  return (
    <AdventureStage
      theme={guiThemeFor(hero ? state.players[hero.ownerId]?.pantheonId : null)}
      scene={encounterScene(state, def?.coord ?? null)}
      title={def?.name ?? 'Creature camp'}
      subtitle="Creature camp"
      catalog={catalog}
      testId="camp"
      onClose={close}
      className="ak-camp-stage"
      footer={
        <>
          {hero ? <span className="ak-muted">Joins {hero.name}’s army</span> : null}
          <span className="grow" />
          <Button onClick={close}>Leave</Button>
          <Button
            variant="primary"
            icon="growth"
            disabled={!q.legal || pending}
            disabledReason={q.reason}
            onClick={() =>
              once(() => {
                if (store.dispatch({ kind: 'RecruitFromCamp', heroId, siteId, quantity: n })) return false;
                store.toast(`${n} ${n === 1 ? creature?.name : creature?.pluralName} joined ${state.heroes[heroId]?.name}`, 'success');
                store.closeOverlay();
                return true;
              })
            }
            data-testid="camp-recruit"
          >
            Recruit {n}
          </Button>
        </>
      }
    >
      <div className="ak-camp">
        <section className="ak-recruit__show" aria-label="The camp">
          {creature ? <CreatureStage creatureId={creature.id} name={creature.name} /> : null}
          {creature ? (
            <div className="ak-recruit__plate">
              <span className="ak-recruit__socket">
                <CreaturePortrait catalog={catalog} creatureId={creature.id} size="3.4rem" />
              </span>
              <span>
                <span className="ak-recruit__plate-name">{creature.name}</span>
                <span className="ak-recruit__plate-role">
                  Tier {creature.tier} · {creature.roleLabel}
                </span>
              </span>
            </div>
          ) : null}
        </section>
        <section className="ak-pane ak-camp__detail" aria-label="Recruit">
          <p className="story-text ak-camp__text">{def?.description}</p>
          {creature ? (
            <>
              <div className="row gap wrap small">
                <Chip tone="info">
                  {campStock(catalog, state, siteId)} {creature.pluralName} available
                </Chip>
                {kind ? <Chip>+{kind.weeklyGrowth} each week</Chip> : null}
              </div>
              <div className="row gap small">
                Price each: <CostList cost={base.unitCost} />
              </div>
              <Button size="small" variant="ghost" onClick={() => store.openOverlay({ kind: 'stack-info', creatureId: creature.id })}>
                Creature details
              </Button>
            </>
          ) : null}
          {base.maxQuantity > 0 ? (
            <>
              <QuantitySelector value={n} max={base.maxQuantity} min={1} onChange={setQty} label="Creatures to recruit" />
              <div className="row gap">
                Total: <span className="ak-big"><CostList cost={q.totalCost} wallet={state.players[playerId]?.wallet} /></span>
              </div>
            </>
          ) : (
            <p className="warn row gap">
              <LockGlyph />
              {base.reason ?? (base.available === 0 ? 'No volunteers this week — come back after the next week begins.' : 'You cannot afford any.')}
            </p>
          )}
          {base.maxQuantity > 0 && !q.legal && q.reason ? (
            <p className="warn small row gap">
              <LockGlyph />
              {q.reason}
            </p>
          ) : null}
        </section>
      </div>
    </AdventureStage>
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

/**
 * The picture over an encounter: the supplied header when one fits the site
 * (treasure, the Frozen Longship, a hermit's hut), else the mission's own
 * painting for an authored event (each is a specific place), else the open
 * crossroads for a generated event. Decorative only: never a source of rewards.
 */
function encounterHeader(catalog: ContentCatalog, state: MatchState, siteKind: string, siteId: string, opts: { claimed?: boolean; hermit?: boolean } = {}): { url: string; alt: string } | null {
  const mission = scenarioMission(catalog, state);
  const gui = encounterArt({ siteKind, siteId, claimed: opts.claimed, hermitNarrative: opts.hermit, mapId: mission?.mapTemplateId ?? state.world.map.templateId, campaignId: state.scenario.campaignId ?? null });
  if (gui) return { url: gui.url, alt: '' };
  if (siteKind !== 'map_event') return null;
  const painting = !state.customMission && mission ? briefingArt(mission.thumbnailAssetId) : null;
  if (painting) return { url: painting.url, alt: '' };
  const fallback = guiArt(ENCOUNTER_FALLBACK);
  return fallback ? { url: fallback.url, alt: '' } : null;
}

export function MapEventDialog({ heroId, siteId }: { heroId: string; siteId: string }) {
  const store = useStore();
  const catalog = store.catalog;
  const session = store.session!;
  const state = session.state;
  const playerId = session.humanPlayerId;
  const def = missionSite(catalog, state, siteId);
  const kind = def?.kind.type === 'map_event' ? def.kind : null;
  const [choice, setChoice] = useState<number | null>(null);
  const [pending, once] = useOnce();
  if (!def || !kind) return null;
  const claimed = !!state.world.sites[siteId]?.claimed;
  const hero = state.heroes[heroId];
  const wallet = state.players[playerId]?.wallet;
  const quotes = kind.options.map((_, i) => quoteMapEvent(catalog, state, playerId, heroId, siteId, i));
  const header = encounterHeader(catalog, state, 'map_event', siteId);
  // Each option's offer as reward items, from the event's own definition.
  const offerItems = kind.options.map((o) => (o.reward ? rewardPreviewItems(catalog, o.reward, hero?.name ?? 'your hero') : []));
  const options: ChoiceOption<number>[] = kind.options.map((o, i) => ({
    value: i,
    title: o.label,
    label: o.label,
    testId: `event-option-${i}`,
    detail: (
      <>
        {o.summary}
        {o.cost ? (
          <span className="row gap small" style={{ marginTop: '0.25rem' }}>
            Costs: <CostList cost={o.cost} wallet={wallet} />
          </span>
        ) : null}
        {offerItems[i]!.length ? <RewardTray items={offerItems[i]!} label={`${o.label}: you receive`} compact plain /> : null}
      </>
    ),
    reason: quotes[i]!.legal ? null : quotes[i]!.reason,
  }));
  const selected = choice !== null && quotes[choice]?.legal ? choice : null;
  const confirm = () =>
    once(() => {
      if (selected === null) return false;
      // Validated against the state at the moment of confirmation (the rules reject anything stale). What was
      // gained is read from this command's committed result (a receipt; Continue never runs it again).
      const option = kind.options[selected]!;
      return !store.claimReward({ kind: 'ResolveMapEvent', heroId, siteId, optionIndex: selected }, { title: option.label, source: kind.title, heroId, closeKind: 'map-event', major: true, nothing: option.summary });
    });
  return (
    <Modal
      title={kind.title}
      onClose={() => store.closeOverlay()}
      width="42rem"
      testId="map-event"
      surface="parchment"
      theme={playerTheme(store, hero?.ownerId)}
      art={header ? <GuiArtHeader url={header.url} alt={header.alt} wide /> : null}
      footer={
        claimed ? (
          <Button onClick={() => store.closeOverlay()}>Close</Button>
        ) : (
          <>
            <Button variant="primary" disabled={selected === null || pending} disabledReason={selected === null ? 'Choose an option first' : null} onClick={confirm} data-testid="event-confirm">
              Confirm
            </Button>
            <Button onClick={() => store.closeOverlay()} data-testid="event-later">
              Decide later
            </Button>
          </>
        )
      }
    >
      <p className="story-text">{kind.text}</p>
      {claimed ? <p className="dim">This has already happened.</p> : <ChoiceGroup legend="Choose one" options={options} value={selected} onChange={setChoice} onConfirm={confirm} />}
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
  const [choice, setChoice] = useState<'gold' | 'xp' | null>(null);
  const [pending, once] = useOnce();
  if (!def || !kind || !hero) return null;
  const q = quoteOpenChest(catalog, state, playerId, heroId, siteId);
  const claimed = !!state.world.sites[siteId]?.claimed;
  const header = encounterHeader(catalog, state, 'treasure_chest', siteId, { claimed });
  // Selecting a tile only selects; Confirm opens the chest once, with the choice, against the current state.
  const confirm = () =>
    once(() => {
      if (!choice) return false;
      // A small pickup passes as a tray notice built from the committed gold or experience (none at the cap).
      const title = choice === 'gold' ? 'Gold for the treasury' : `${hero.name} studies the journals`;
      return !store.claimReward({ kind: 'OpenChest', heroId, siteId, choice }, { title, source: def.name, heroId, closeKind: 'chest' });
    });
  const options: ChoiceOption<'gold' | 'xp'>[] = [
    {
      value: 'gold',
      testId: 'chest-gold',
      label: `${formatNumber(kind.gold)} Gold for your treasury`,
      title: `${formatNumber(kind.gold)} Gold`,
      detail: 'Take the Gold for your treasury.',
      icon: (
        <GuiSocket label="Gold">
          <Icon name={RESOURCE_ICON.gold!} />
        </GuiSocket>
      ),
      reason: q.legal ? null : q.reason,
    },
    {
      value: 'xp',
      testId: 'chest-xp',
      label: `${formatNumber(kind.xp)} experience for ${hero.name}`,
      title: `${formatNumber(kind.xp)} Experience`,
      detail: `Study the journals: experience for ${hero.name}.`,
      icon: (
        <GuiSocket label="Experience">
          <Icon name="xp" />
        </GuiSocket>
      ),
      reason: q.legal ? null : q.reason,
    },
  ];
  return (
    <Modal
      title={def.name}
      onClose={() => store.closeOverlay()}
      width="38rem"
      testId="chest"
      surface="parchment"
      theme={playerTheme(store, hero.ownerId)}
      art={header ? <GuiArtHeader url={header.url} alt={claimed ? 'An open, empty treasure chest' : 'A treasure chest'} /> : null}
      footer={
        claimed ? (
          <Button onClick={() => store.closeOverlay()}>Close</Button>
        ) : (
          <>
            <Button variant="primary" disabled={!choice || !q.legal || pending} disabledReason={!q.legal ? q.reason : !choice ? 'Choose a reward first' : null} onClick={confirm} data-testid="chest-confirm">
              Confirm
            </Button>
            <Button onClick={() => store.closeOverlay()} data-testid="chest-later">
              Decide later
            </Button>
          </>
        )
      }
    >
      <p className="story-text">{def.description}</p>
      {claimed ? <p className="dim">The chest is empty.</p> : <ChoiceGroup legend="Choose one reward" options={options} value={choice} onChange={setChoice} onConfirm={confirm} />}
    </Modal>
  );
}

/** One line of a delivery: needed, held and missing amounts together. */
function DeliveryLines({ cost, wallet }: { cost: Partial<Record<string, number>>; wallet: Readonly<Record<string, number>> | undefined }) {
  const items = RESOURCE_KEYS.filter((k) => (cost[k] ?? 0) > 0);
  return (
    <div className="gui-req" role="list" aria-label="Asked for">
      {items.map((k) => {
        const need = cost[k] ?? 0;
        const have = wallet?.[k] ?? 0;
        const missing = Math.max(0, need - have);
        return (
          <div key={k} role="listitem" style={{ display: 'contents' }}>
            <Icon name={RESOURCE_ICON[k]!} className="gui-req__icon" />
            <span>
              <strong className="num">{formatNumber(need)}</strong> {RESOURCE_LABELS[k]} <span className="dim small">· you have {formatNumber(have)}</span>
            </span>
            {missing > 0 ? <span className="gui-req__missing num">{formatNumber(missing)} missing</span> : <span className="gui-req__ok">✓ ready</span>}
          </div>
        );
      })}
    </div>
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
  const [pending, once] = useOnce();
  if (!def || !kind) return null;
  const hero = state.heroes[heroId];
  const claimed = !!state.world.sites[siteId]?.claimed;
  const q = quoteCompleteQuestHut(catalog, state, playerId, heroId, siteId);
  const progress = questHutProgress(catalog, state, playerId, kind.quest);
  const target = kind.quest.type === 'defeat' ? missionSite(catalog, state, kind.quest.siteId) : undefined;
  const reward = rewardText(catalog, kind.reward);
  // What the quest offers, from the site's own definition (the receipt afterwards is read from what was committed).
  const rewardItems = rewardPreviewItems(catalog, kind.reward, hero?.name ?? 'your hero');
  // The hermit picture only where the site's narrative really is a hermit's request at his hut.
  const hermit = /\b(hermit|hut)\b/i.test(def.description ?? '');
  const header = encounterHeader(catalog, state, 'quest_hut', siteId, { hermit });
  return (
    <Modal
      title={def.name}
      onClose={() => store.closeOverlay()}
      width="42rem"
      testId="quest-hut"
      surface="parchment"
      theme={playerTheme(store, hero?.ownerId)}
      art={header ? <GuiArtHeader url={header.url} alt="" wide /> : null}
      footer={
        claimed ? (
          <Button onClick={() => store.closeOverlay()}>Close</Button>
        ) : (
          <>
            <Button
              variant="primary"
              disabled={!q.legal || pending}
              disabledReason={q.reason}
              onClick={() =>
                once(() => {
                  // The quest's committed rewards in a receipt (the hut's own summary event is not counted twice).
                  return !store.claimReward({ kind: 'CompleteQuestHut', heroId, siteId }, { title: 'Quest fulfilled', source: def.name, heroId, closeKind: 'quest-hut', major: true, nothing: `Quest fulfilled: ${reward.join(', ')}` });
                })
              }
              data-testid="quest-complete"
            >
              {kind.quest.type === 'deliver' ? 'Hand over' : 'Claim the reward'}
            </Button>
            <Button onClick={() => store.closeOverlay()} data-testid="quest-later">
              Return later
            </Button>
          </>
        )
      }
    >
      <p className="story-text">{def.description}</p>
      {claimed ? (
        <p className="dim">You have fulfilled this quest.</p>
      ) : (
        <>
          {/* An exchange, not a choice: what is asked on one side, what is given on the other. */}
          <div className="gui-exchange">
            <section className="gui-exchange__side" aria-label="Quest">
              <div className="gui-exchange__head">{kind.quest.type === 'deliver' ? 'Bring' : 'Defeat'}</div>
              {kind.quest.type === 'deliver' ? (
                <DeliveryLines cost={kind.quest.resources} wallet={state.players[playerId]?.wallet} />
              ) : (
                <div className="small">
                  <strong>{kind.quest.label}</strong>
                  {target ? <> at {target.name}</> : null} with one of your heroes.{' '}
                  {progress.met ? <Chip tone="ok">Done</Chip> : <Chip tone="warn">Not yet</Chip>}
                </div>
              )}
            </section>
            <svg className="gui-exchange__arrow" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <section className="gui-exchange__side" aria-label="Reward">
              <div className="gui-exchange__head">Reward</div>
              {rewardItems.length ? (
                <RewardTray items={rewardItems} label="Reward when fulfilled" compact plain />
              ) : (
                <ul className="bullets small" style={{ margin: 0 }}>
                  {reward.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              )}
            </section>
          </div>
          {!q.legal && q.reason ? (
            <p className="gui-choice__reason" data-testid="quest-reason">
              <LockGlyph />
              {q.reason}
            </p>
          ) : null}
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
