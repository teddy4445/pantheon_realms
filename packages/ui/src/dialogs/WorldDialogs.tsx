/**
 * Dialogs for this build's proposed world features: hot-seat hand-over,
 * creature camps, one-time map events, divine interventions on the adventure
 * map, the end of a skirmish, and the keyboard-shortcut reference.
 *
 * Every number shown comes from the rules' quote functions; every change is
 * a command.
 */
import { useState, type KeyboardEvent } from 'react';
import {
  interventionUsedThisWeek,
  interventionsFor,
  matchScore,
  missionSite,
  quoteIntervention,
  quoteOpenChest,
  quoteCompleteQuestHut,
  quoteSluice,
  questHutProgress,
  resources,
  type InterventionDefinition,
  type RewardDefinition,
  interventionOf,
} from '@pr/rules';
import { pickSiteSprite, siteSpriteCandidates, spriteUrl } from '@pr/presentation/core';
import { useStore } from '../app/context';
import { MiracleBook, type MiracleOption } from '../components/miraclebook';
import { endOfGameSplash } from '../components/moments';
import { CONTEXT_LABEL, FIXED_KEYS, KEY_ACTIONS, bindingMap, keyLabel, type KeyContext } from '../app/keys';
import { Button, Chip, Modal, QuantitySelector, SectionTitle } from '../components/kit';
import { CreaturePortrait, Emblem, SpeakerPortrait, briefingArt } from '../components/art';
import { ArmyStrip, CostList } from '../components/game';
import { AbilityBadge } from '../components/badges';
import { resolveAsset } from '../assets/manifest';
import { campForm, campQuantity, neutralRecruitView, rememberCampForm, rememberCampQuantity, type NeutralRecruitView } from '../app/neutralRecruit';
import { choiceView, noteChoiceDeferred, noteChoiceMade, type ChoiceOptionView, type ChoiceRecord } from '../app/choiceView';
import { Icon, RESOURCE_ICON } from '../assets/icons';
import { ChoiceGroup, GuiArtHeader, GuiSocket, LockGlyph, playerTheme, useOnce, type ChoiceOption } from '../components/gui';
import { ENCOUNTER_FALLBACK, encounterArt, guiArt, guiThemeFor } from '../assets/guiArt';
import { AdventureStage, CreatureStage, encounterScene } from '../components/adventure';
import { RewardTray } from '../components/rewards';
import { rewardPreviewItems } from '../app/rewards';
import { formatNumber } from '../app/view';
import { RESOURCE_KEYS, RESOURCE_LABELS, scenarioMission, type MatchState, type ContentCatalog, type ResourceKey } from '@pr/rules';

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
// Creature camps and neutral hiring sites
// ---------------------------------------------------------------------------

/** A campaign-kit icon (`campaignv2.icon.<id>`: evidence, pact, supply, evacuation, branch) with its accessible name. */
function CampaignIcon({ id, label, className = '' }: { id: string; label: string; className?: string }) {
  const url = resolveAsset(`campaignv2.icon.${id}`).url;
  if (!url) return null;
  return <img className={`v2-icon ${className}`} src={url} alt={label} title={label} draggable={false} data-art={`campaignv2.icon.${id}`} />;
}

/**
 * A creature camp or a neutral hiring site (screen spec `neutral-recruit`,
 * campaign expansion 2026-10-15). Left: the creature — the kit's large native
 * portrait over the neutral recruitment background for the six single-form
 * neutrals, else its idle strip in the landscape of the camp's ground (by
 * climate and terrain; no town faction is invented for a neutral camp). Right:
 * one compact panel — role, exact statistics and ability rules from the
 * definition, habitat, the shared stock with its restock rule, the exact
 * price, every reason the camp cannot hire now, the visiting hero's seven
 * slots with where the recruits will go, the quantity, Recruit and Recruit all
 * affordable (the rules' legal maximum, one command). Everything is the
 * `neutralRecruitView` of the current state, rebuilt on every render; the
 * rules' quoteCampRecruitment and RecruitFromCamp decide (never the town's
 * RecruitUnits).
 *
 * Neutral upgrades (2026-10-15): a hiring site that hires both forms of its
 * family shows a base / upgraded selector over the picture (the selected form's
 * portrait, statistics, rules and price; one shared stock), and — only when the
 * visiting hero has a base stack of that family — a separate Train action (the
 * rules' quoteCampTraining and TrainAtCamp: the price difference, no stock used).
 */
export function CampDialog({ heroId, siteId }: { heroId: string; siteId: string }) {
  const store = useStore();
  const catalog = store.catalog;
  const session = store.session!;
  const state = session.state;
  const playerId = session.humanPlayerId;
  const [qty, setQtyState] = useState(() => campQuantity(state.matchId, siteId));
  const [form, setFormState] = useState<string | null>(() => campForm(state.matchId, siteId));
  const [trainQty, setTrainQty] = useState(1);
  // A second click right after a hire is ignored (never hires twice); a deliberate second hire works again shortly after.
  const [, once] = useOnce(450);
  const setQty = (n: number) => {
    setQtyState(n);
    rememberCampQuantity(state.matchId, siteId, n);
  };
  const chooseForm = (id: string) => {
    setFormState(id);
    rememberCampForm(state.matchId, siteId, id);
  };
  // Revalidated against the current state on every render (and by the rules on dispatch).
  const v = neutralRecruitView(catalog, state, playerId, heroId, siteId, qty, { form, train: trainQty });
  const def = missionSite(catalog, state, siteId);
  const hero = state.heroes[heroId];
  // Leaving forgets the chosen quantity and form (only a look at the creature card keeps them).
  const close = () => {
    rememberCampQuantity(state.matchId, siteId, 1);
    rememberCampForm(state.matchId, siteId, null);
    store.closeOverlay();
  };
  if (!v || !def) return null;
  const hire = (n: number) =>
    once(() => {
      if (n < 1) return false;
      // The selected form goes with the command only where the site hires more than one (the rules check it again).
      if (store.dispatch({ kind: 'RecruitFromCamp', heroId, siteId, quantity: n, ...(v.formChoice ? { creatureId: v.creatureId } : {}) })) return false;
      store.toast(`${n} ${n === 1 ? v.name : v.pluralName} joined ${hero?.name ?? 'your hero'}’s army`, 'success');
      setQty(1);
      return true;
    });
  const train = (n: number) =>
    once(() => {
      const t = v.training;
      if (!t || n < 1) return false;
      if (store.dispatch({ kind: 'TrainAtCamp', heroId, siteId, fromCreatureId: t.fromId, quantity: n, slot: t.slot })) return false;
      store.toast(`${n} ${n === 1 ? t.fromName : t.fromPlural} trained into ${n === 1 ? t.toName : t.toPlural}`, 'success');
      setTrainQty(1);
      return true;
    });
  const allArt = resolveAsset('recruitroute.icon-recruit-all').url;
  const issueKinds = v.issues.map((i) => i.kind).join(' ');
  const familyPlural = v.forms[0]?.pluralName ?? v.pluralName;
  return (
    <AdventureStage
      theme={guiThemeFor(hero ? state.players[hero.ownerId]?.pantheonId : null)}
      scene={v.background ?? encounterScene(state, def.coord)}
      title={v.siteName}
      subtitle={`${v.siteKind} · ${familyPlural}`}
      catalog={catalog}
      testId="camp"
      onClose={close}
      compact
      className={`ak-camp-stage nr-stage ${v.kit ? 'nr-stage--kit' : ''}`}
      aside={
        <div className="rr-treasury nr-wallet" aria-label="Treasury" data-testid="nr-wallet">
          {RESOURCE_KEYS.map((k) => (
            <span key={k} className="rr-treasury__item" title={`${RESOURCE_LABELS[k]}: ${formatNumber(v.wallet[k])}`}>
              <Icon name={RESOURCE_ICON[k]!} />
              <span className="num">{formatNumber(v.wallet[k])}</span>
            </span>
          ))}
        </div>
      }
      footer={
        <>
          <span className="ak-muted nr-foot-note">{v.description}</span>
          <span className="grow" />
          <Button onClick={close} data-testid="camp-leave">
            Leave
          </Button>
        </>
      }
    >
      <div className={`nr ${v.kit ? 'nr--kit' : ''} ${v.formChoice ? 'nr--forms' : ''}`} data-testid="neutral-recruit" data-issues={issueKinds} data-single={v.singleForm ? 'true' : 'false'} data-kit={v.kit ? 'true' : 'false'} data-form={v.form} data-creature={v.creatureId}>
        <section className="nr-show" aria-label={`${v.name}: picture`}>
          {v.formChoice ? <FormPicker catalog={catalog} v={v} onChoose={chooseForm} /> : null}
          {v.kit && v.portrait ? (
            <figure className="nr-portrait">
              <img src={v.portrait.url} alt={v.portrait.alt} width={v.portrait.width ?? undefined} height={v.portrait.height ?? undefined} draggable={false} decoding="async" data-testid="nr-portrait" data-asset={v.portrait.assetId} />
            </figure>
          ) : (
            <CreatureStage creatureId={v.creatureId} name={v.name} portrait={v.portrait} className="nr-stage-figure" />
          )}
          <div className="nr-plate" aria-hidden="true">
            <span className="nr-plate__name">{v.name}</span>
            <span className="nr-plate__role">
              Tier {v.tier} · {v.roleLabel}
            </span>
          </div>
        </section>

        <section className="nr-panel ak-pane" aria-label={`Hire ${v.pluralName}`}>
          <div className="nr-info" data-testid="nr-info">
            <header className="nr-head">
              <h3 className="nr-name" data-testid="nr-name">
                {v.name}
              </h3>
              <button type="button" className="icon-link nr-details" onClick={() => store.openOverlay({ kind: 'stack-info', creatureId: v.creatureId })} aria-label={`Creature card: ${v.name}`} title={`${v.summary} — open the creature card`} data-testid="nr-details">
                <Icon name="info" />
              </button>
            </header>
            <p className="nr-role">
              <span>Tier {v.tier}</span> · <span>{v.roleLabel}</span>
              {v.formChoice ? (
                <>
                  {' '}
                  · <span className={`nr-formtag nr-formtag--${v.form}`} data-testid="nr-form-tag">{v.form === 'upgraded' ? 'Upgraded form' : 'Base form'}</span>
                </>
              ) : null}
              {v.singleForm ? (
                <>
                  {' '}
                  · <span className="nr-single" data-testid="nr-single-form">Single form</span>
                </>
              ) : null}
            </p>
            {v.singleForm ? <p className="nr-note">One form only: there is no upgraded {v.name} to unlock or train into.</p> : null}
            {v.habitat ? (
              <p className="nr-habitat" data-testid="nr-habitat">
                <span className="nr-k">Habitat</span> {v.habitat}
              </p>
            ) : null}
            <dl className="nr-stats" data-testid="nr-stats">
              {v.stats.map((s) => (
                <div key={s.id} className="nr-stat" data-stat={s.id}>
                  <dt className="nr-stat__label">
                    <Icon name={s.id === 'size' ? 'army' : s.id} />
                    <span>{s.label}</span>
                  </dt>
                  <dd className="nr-stat__value num">{s.value}</dd>
                </div>
              ))}
            </dl>
            {v.abilities.length ? (
              <ul className="nr-abilities" aria-label="Abilities">
                {v.abilities.map((a) => (
                  <li key={a.id} className="nr-ability" data-testid={`nr-ability-${a.id}`}>
                    <AbilityBadge catalog={catalog} abilityId={a.id} size="2.1rem" />
                    <div className="nr-ability__text">
                      <div className="nr-ability__name">
                        {a.name} <span className="nr-ability__kind">{a.activation === 'active' ? 'Active' : 'Passive'}</span>
                      </div>
                      <p className="nr-ability__rule">{a.exactRule}</p>
                      {a.restriction ? <p className="nr-ability__limit">{a.restriction}</p> : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ak-muted">No special abilities.</p>
            )}
            {v.lore ? (
              <details className="nr-lore">
                <summary>Lore</summary>
                <p>{v.lore}</p>
              </details>
            ) : null}
          </div>

          <div className="nr-deal">
            <p className="nr-stock" data-testid="nr-stock">
              <strong className="num">{v.stockText}</strong> <span className="nr-dim">· {v.restockText} · shared by {v.formChoice ? 'both forms and ' : ''}every empire</span>
            </p>
            <p className="nr-price" data-testid="nr-price">
              <span className="nr-k">Price each</span> <CostList cost={v.unitCost} />
            </p>
            {v.issues.length ? (
              <ul className="nr-issues" aria-live="polite" data-testid="nr-issues">
                {v.issues.map((i) => (
                  <li key={i.kind} className={`nr-issue nr-issue--${i.kind}`} data-testid={`nr-issue-${i.kind}`}>
                    {i.kind === 'locked' ? <CampaignIcon id="pact" label="Pact" className="nr-issue__icon" /> : <LockGlyph className="gui-lock nr-issue__lock" />}
                    <span>
                      <strong>{i.title}.</strong> {i.text}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="nr-dest">
              <h4 className="nr-k nr-dest__title">Joins {v.heroName}’s army</h4>
              {hero ? <ArmyStrip catalog={catalog} army={hero.army} label={`${v.heroName}’s army`} selected={v.targetSlot} testId="nr-army" /> : null}
              <p className="nr-dest__where" data-testid="nr-destination">
                {v.destinationText}
              </p>
            </div>
            <div className="nr-qty">
              <QuantitySelector label={`${v.pluralName} to hire`} value={v.quantity} min={v.min} max={v.max} onChange={setQty} />
            </div>
            <div className="nr-actions">
              <Button variant="primary" className="nr-recruit" disabled={!v.recruit.legal} disabledReason={v.recruit.reason} onClick={() => hire(v.recruit.quantity)} data-testid="camp-recruit">
                {/* Nothing to hire now: the price of one, so the shortfall stays readable. */}
                <span className="nr-btn__label">{v.recruit.quantity > 0 ? `Recruit ${v.recruit.quantity}` : 'Recruit'}</span>
                <CostList cost={v.recruit.quantity > 0 ? v.recruit.totalCost : v.unitCost} wallet={v.wallet} />
              </Button>
              <Button className="nr-recruit-all" artUrl={allArt} icon="recruitall" disabled={!v.recruitAll.legal} disabledReason={v.recruitAll.reason} onClick={() => hire(v.recruitAll.quantity)} data-testid="camp-recruit-all">
                <span className="nr-btn__text">
                  <span className="nr-btn__label">Recruit all affordable ({v.recruitAll.quantity})</span>
                  {v.recruitAll.quantity > 0 ? <CostList cost={v.recruitAll.totalCost} wallet={v.wallet} /> : <span className="nr-dim">none now</span>}
                </span>
              </Button>
            </div>
          </div>
          {v.training ? <TrainBlock catalog={catalog} v={v} quantity={v.training.quantity} onQuantity={setTrainQty} onTrain={train} /> : null}
        </section>
      </div>
    </AdventureStage>
  );
}

/**
 * The base / upgraded selector of a hiring site: two medals (portrait, form, name,
 * price each), a radio group — click, or Tab to it and move with the arrow keys.
 */
function FormPicker({ catalog, v, onChoose }: { catalog: ContentCatalog; v: NeutralRecruitView; onChoose: (creatureId: string) => void }) {
  const ids = v.forms.map((f) => f.creatureId);
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = ids[(i + step + ids.length) % ids.length]!;
    onChoose(next);
    const group = e.currentTarget.parentElement;
    requestAnimationFrame(() => (group?.querySelector(`[data-creature="${next}"]`) as HTMLElement | null)?.focus());
  };
  return (
    <div className="nr-forms" role="radiogroup" aria-label={`${v.forms[0]?.pluralName ?? v.pluralName}: form to hire`} data-testid="nr-forms">
      {v.forms.map((f, i) => (
        <button
          key={f.creatureId}
          type="button"
          role="radio"
          aria-checked={f.selected}
          tabIndex={f.selected ? 0 : -1}
          className={`nr-form ${f.selected ? 'is-selected' : ''}`}
          onClick={() => onChoose(f.creatureId)}
          onKeyDown={(e) => onKey(e, i)}
          aria-label={`${f.label} form: ${f.name}`}
          title={`${f.name} (${f.label.toLowerCase()} form)`}
          data-testid={`nr-form-${f.form}`}
          data-creature={f.creatureId}
        >
          <span className="nr-form__face">
            <CreaturePortrait catalog={catalog} creatureId={f.creatureId} size="100%" round />
          </span>
          <span className="nr-form__text">
            <span className="nr-form__kind">{f.label}</span>
            <span className="nr-form__name">{f.name}</span>
            <CostList cost={f.unitCost} />
          </span>
        </button>
      ))}
    </div>
  );
}

/** Training the visiting hero's base stack at this site (shown only when the hero has one): a strip under the panel. */
function TrainBlock({ catalog, v, quantity, onQuantity, onTrain }: { catalog: ContentCatalog; v: NeutralRecruitView; quantity: number; onQuantity: (n: number) => void; onTrain: (n: number) => void }) {
  const t = v.training!;
  return (
    <section className="nr-train" aria-label={`Train ${t.fromPlural} into ${t.toPlural}`} data-testid="nr-train">
      <span className="nr-train__pair" aria-hidden="true">
        <CreaturePortrait catalog={catalog} creatureId={t.fromId} size="2.5rem" count={t.stackCount} />
        <Icon name="back" className="nr-train__arrow" />
        <CreaturePortrait catalog={catalog} creatureId={t.toId} size="2.5rem" />
      </span>
      <span className="nr-train__text">
        <span className="nr-k nr-train__title">Train troops</span>
        <span className="nr-train__what" data-testid="nr-train-what">
          {t.stackCount} {t.stackCount === 1 ? t.fromName : t.fromPlural} (slot {t.slot + 1}) → {t.toPlural} · <CostList cost={t.unitCost} /> each
        </span>
      </span>
      <div className="nr-train__act">
        <QuantitySelector label={`${t.fromPlural} to train`} value={quantity} min={t.min} max={t.max} onChange={onQuantity} />
        <Button icon="train" className="nr-train__go" disabled={!t.train.legal} disabledReason={t.train.reason} onClick={() => onTrain(t.train.quantity)} data-testid="camp-train">
          <span className="nr-btn__label">{t.train.quantity > 0 ? `Train ${t.train.quantity}` : 'Train'}</span>
          <CostList cost={t.train.quantity > 0 ? t.train.totalCost : t.unitCost} wallet={v.wallet} />
        </Button>
      </div>
      <p className={`nr-train__where ${t.reason ? 'is-refused' : ''}`} data-testid="nr-train-destination" aria-live="polite">
        {t.reason ?? t.destinationText}
      </p>
    </section>
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

/**
 * A story choice or negotiation (screen spec `choice`, campaign expansion
 * 2026-10-15): the place and the visiting hero (the existing speaker), the
 * scene that played on arriving there, the short exchange, and each option with
 * its exact known cost and consequence — the authored result, what it gives,
 * the guards that stand down without a battle, the evidence and decisions it
 * records, and what it needs (with the evidence or pact icon). States: an
 * option is affordable, unaffordable (the shortfall), needs evidence not yet in
 * hand, or not possible (the rules' reason); the choice is made once (after it,
 * the dialog shows what was decided and nothing can be paid again); coming back
 * after "Decide later" says so. All of it is `choiceView` of the current state;
 * the rules' quoteMapEvent and ResolveMapEvent decide.
 */
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
  const v = choiceView(catalog, state, playerId, heroId, siteId);
  if (!def || !kind || !v) return null;
  const hero = state.heroes[heroId];
  const wallet = state.players[playerId]?.wallet;
  const header = encounterHeader(catalog, state, 'map_event', siteId);
  // Each option's offer as reward items, from the event's own definition.
  const offerItems = kind.options.map((o) => (o.reward ? rewardPreviewItems(catalog, o.reward, hero?.name ?? 'your hero') : []));
  const options: ChoiceOption<number>[] = v.options.map((o) => ({
    value: o.index,
    title: (
      <span className="ch-opt__title">
        {o.icon ? <CampaignIcon id={o.icon} label={o.icon === 'pact' ? 'Needs a pact' : 'Needs evidence'} className="ch-opt__icon" /> : null}
        {o.label}
      </span>
    ),
    label: `${o.label}. ${o.summary}`,
    testId: `event-option-${o.index}`,
    detail: <ChoiceFacts o={o} offer={offerItems[o.index]!} wallet={wallet} />,
    reason: o.legal ? null : o.reason,
  }));
  const selected = choice !== null && v.options[choice]?.legal ? choice : null;
  const anyLegal = v.options.some((o) => o.legal);
  const leave = () => {
    // Left undecided: the next visit says so (presentation memory; nothing is saved or paid).
    if (!v.committed) noteChoiceDeferred(state.matchId, siteId);
    store.closeOverlay();
  };
  const confirm = () =>
    once(() => {
      if (selected === null) return false;
      // Validated against the state at the moment of confirmation (the rules reject anything stale). What was
      // gained is read from this command's committed result (a receipt; Continue never runs it again). An option
      // that gives something closes into the reward tray; one that only records a decision stays open and shows it.
      const option = kind.options[selected]!;
      const tray = offerItems[selected]!.length > 0;
      const rejected = store.claimReward(
        { kind: 'ResolveMapEvent', heroId, siteId, optionIndex: selected },
        { title: option.label, source: kind.title, heroId, ...(tray ? { closeKind: 'map-event' as const } : {}), major: true, nothing: `${option.label}: ${option.summary}` },
      );
      if (rejected) return false;
      noteChoiceMade(state.matchId, siteId, selected);
      return true;
    });
  const chosen = v.chosen ? v.options[v.chosen.index] : undefined;
  const selectedCost = selected !== null ? v.options[selected]?.cost : null;
  return (
    <Modal
      title={kind.title}
      onClose={leave}
      width="46rem"
      testId="map-event"
      surface="parchment"
      theme={playerTheme(store, hero?.ownerId)}
      footer={
        v.committed ? (
          <Button onClick={() => store.closeOverlay()} data-testid="event-close">
            Close
          </Button>
        ) : (
          <>
            <Button variant="primary" disabled={selected === null || pending} disabledReason={selected === null ? (anyLegal ? 'Choose an option first' : 'No option is possible now') : null} onClick={confirm} data-testid="event-confirm">
              Confirm
              {selectedCost ? <CostList cost={selectedCost} wallet={wallet} /> : null}
            </Button>
            <Button onClick={leave} data-testid="event-later">
              Decide later
            </Button>
          </>
        )
      }
    >
      <div className="ch" data-testid="choice" data-state={v.committed ? 'committed' : v.repeat ? 'repeat' : 'open'}>
        {header ? <GuiArtHeader url={header.url} alt={header.alt} wide /> : null}
        <div className="ch-scene">
          {v.speaker ? <SpeakerPortrait catalog={catalog} line={v.speaker} size="3.4rem" /> : null}
          <div className="ch-scene__text">
            <span className="ch-where" data-testid="event-location">
              {v.speaker ? <strong>{v.speaker.speaker}</strong> : null} at {v.location}
            </span>
            {v.repeat ? (
              <span className="ch-repeat" data-testid="event-repeat">
                You came back: nothing was decided or paid last time, and the offer still stands.
              </span>
            ) : v.committed ? null : (
              <span className="ch-once">One decision, made once: confirming pays its cost and records it; it cannot be changed or paid again.</span>
            )}
          </div>
        </div>
        {v.exchange.length ? (
          <ol className="ch-exchange" aria-label="What was said here" data-testid="event-exchange">
            {v.exchange.map((l, i) => (
              <li key={i} className="ch-line">
                <SpeakerPortrait catalog={catalog} line={l} size="2.4rem" />
                <span>
                  <strong className="ch-line__who">{l.speaker}</strong> {l.text}
                </span>
              </li>
            ))}
          </ol>
        ) : null}
        <p className="story-text ch-text">{v.text}</p>
        {v.committed ? (
          <section className="ch-done" aria-label="Decided" data-testid="event-committed">
            <SectionTitle>Decided</SectionTitle>
            {v.chosen ? (
              <>
                <p className="ch-done__label" data-testid="event-chosen">
                  {v.chosen.label}
                </p>
                <p className="ch-done__summary">{v.chosen.summary}</p>
                {chosen?.records.length ? <ChoiceRecords records={chosen.records} /> : null}
              </>
            ) : (
              <p className="ch-done__summary">The choice here has been made; it happens only once.</p>
            )}
          </section>
        ) : (
          <ChoiceGroup legend="Choose one" options={options} value={selected} onChange={setChoice} onConfirm={confirm} />
        )}
      </div>
    </Modal>
  );
}

/** The flags an option records, in the mission's words (evidence and pacts with their icon). */
function ChoiceRecords({ records }: { records: readonly ChoiceRecord[] }) {
  return (
    <span className="ch-fact" data-testid="event-records">
      <span className="ch-fact__k">Records</span>
      <span className="ch-fact__v">
        {records.map((r) => (
          <span key={`${r.kind}-${r.label}`} className={`ch-chip ch-chip--${r.kind}`}>
            {r.icon ? <CampaignIcon id={r.icon} label={r.icon === 'pact' ? 'Pact' : r.icon === 'evidence' ? 'Evidence' : r.icon} className="ch-chip__icon" /> : null}
            {r.kind === 'objective' ? `Counts toward: ${r.label}` : r.kind === 'opens' ? `Opens ${r.label}` : r.label}
          </span>
        ))}
      </span>
    </span>
  );
}

/** One option's exact cost and consequences, as text (never hover-only). */
function ChoiceFacts({ o, offer, wallet }: { o: ChoiceOptionView; offer: ReturnType<typeof rewardPreviewItems>; wallet: Readonly<Record<ResourceKey, number>> | undefined }) {
  return (
    <>
      <span className="ch-summary">{o.summary}</span>
      <span className="ch-facts">
        <span className="ch-fact" data-testid={`event-cost-${o.index}`}>
          <span className="ch-fact__k">Cost</span>
          <span className="ch-fact__v">{o.cost ? <CostList cost={o.cost} wallet={wallet} /> : 'Nothing'}</span>
        </span>
        {offer.length ? (
          <span className="ch-fact">
            <span className="ch-fact__k">Gives</span>
            <span className="ch-fact__v">
              <RewardTray items={offer} label={`${o.label}: you receive`} compact plain />
            </span>
          </span>
        ) : null}
        {o.standsDown.length ? (
          <span className="ch-fact" data-testid={`event-standdown-${o.index}`}>
            <span className="ch-fact__k">No battle</span>
            <span className="ch-fact__v">
              {o.standsDown.map((s) => (
                <span key={s.siteId} className="ch-chip">
                  {s.name ? `${s.guard ? `${s.guard} at ` : 'The guards at '}${s.name} stand down` : 'Guards you have not found yet stand down'}
                  {s.alreadyCleared ? ' (already cleared)' : ''}
                </span>
              ))}
            </span>
          </span>
        ) : null}
        {o.records.length ? <ChoiceRecords records={o.records} /> : null}
        {o.needs.length ? (
          <span className="ch-fact" data-testid={`event-needs-${o.index}`}>
            <span className="ch-fact__k">Needs</span>
            <span className="ch-fact__v">
              {o.needs.map((n) => (
                <span key={n.flag} className={`ch-chip ${n.held ? 'is-held' : 'is-missing'}`}>
                  {n.icon ? <CampaignIcon id={n.icon} label={n.icon === 'pact' ? 'Pact' : n.icon === 'evidence' ? 'Evidence' : n.icon} className="ch-chip__icon" /> : null}
                  {n.label}
                  {n.earlier ? ' (earlier chapter)' : ''}
                  <span className="ch-chip__state">{n.held ? ' · in hand' : ' · not yet'}</span>
                </span>
              ))}
            </span>
          </span>
        ) : null}
      </span>
    </>
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
// Sluices (campaign content v2, 2026-10-15)
// ---------------------------------------------------------------------------

/**
 * A sluice: its picture in its current state, open or closed, exactly what
 * operating it changes (the rules' `quoteSluice` text) and, when it cannot be
 * operated now, the rules' reason. Operate is the `OperateSluice` command; the
 * map then draws the channel's new ground from the committed terrain.
 */
export function SluiceDialog({ heroId, siteId }: { heroId: string; siteId: string }) {
  const store = useStore();
  const catalog = store.catalog;
  const state = store.session!.state;
  const def = missionSite(catalog, state, siteId);
  const kind = def?.kind.type === 'sluice' ? def.kind : null;
  const [pending, once] = useOnce();
  if (!def || !kind) return null;
  const st = state.world.sites[siteId];
  const open = !!st?.open;
  const hero = state.heroes[heroId];
  // Revalidated against the current state on every render (and by the rules on dispatch).
  const q = quoteSluice(catalog, state, heroId, siteId);
  // The same picture the map draws for this state (the site's art, else the sluice's own state picture).
  const pic = pickSiteSprite(siteSpriteCandidates(def, st), 'sluice');
  const close = () => store.closeOverlay();
  const operate = () =>
    once(() => {
      if (store.dispatch({ kind: 'OperateSluice', heroId, siteId })) return false;
      store.closeOverlay();
      return true;
    });
  return (
    <Modal
      title={def.name}
      onClose={close}
      width="40rem"
      testId="sluice"
      theme={playerTheme(store, hero?.ownerId)}
      footer={
        <>
          <Button onClick={close} data-testid="sluice-later">
            Not now
          </Button>
          <span className="grow" />
          <Button variant="primary" icon="swap" disabled={!q.legal || pending} disabledReason={q.reason} onClick={operate} data-testid="sluice-operate">
            {q.willOpen ? 'Open the sluice' : 'Close the sluice'}
          </Button>
        </>
      }
    >
      <div className="sluice-dialog">
        {pic.def ? (
          <figure className="sluice-dialog__picture">
            <img src={spriteUrl(pic.def.file)} alt={`${def.name}, ${open ? 'open' : 'closed'}`} draggable={false} data-testid="sluice-picture" data-sprite={pic.id ?? ''} />
          </figure>
        ) : null}
        <div className="sluice-dialog__text">
          <p className="story-text">{def.description}</p>
          <div className="row gap small" data-testid="sluice-state" data-open={open ? 'true' : 'false'}>
            <span>Now</span>
            <Chip tone={open ? 'info' : 'muted'}>{open ? 'Open' : 'Closed'}</Chip>
          </div>
          <SectionTitle>{q.willOpen ? 'Opening it' : 'Closing it'}</SectionTitle>
          <p data-testid="sluice-change">{q.text}</p>
          {!q.legal && q.reason ? (
            <p className="warn row gap" data-testid="sluice-reason">
              <LockGlyph />
              {q.reason}
            </p>
          ) : hero ? (
            <p className="dim small">{hero.name} stands at the sluice and can work it now.</p>
          ) : null}
        </div>
      </div>
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
