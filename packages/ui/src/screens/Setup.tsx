/**
 * Setup flow: S02 Game Mode → S03 Scenario/Campaign → S04 Pantheon →
 * S05 Starting Divine Selection → Mission Briefing → Adventure Map.
 *
 * Future campaigns and undesigned content are shown honestly as not
 * playable; nothing here invents hidden mechanics. Skirmish scenarios with
 * pantheon variants let the player choose their own pantheon and the rival's.
 */
import { useState } from 'react';
import type { CampaignDefinition, GodDefinition, PantheonDefinition } from '@pr/rules';
import { useStore } from '../app/context';
import { Button, Chip, Panel, SectionTitle, Rule } from '../components/kit';
import { Emblem, GodPortrait, HeroPortrait, MissionThumb, CreaturePortrait } from '../components/art';
import { ScreenHeader, StatusChip } from '../components/game';
import { Icon } from '../assets/icons';

function SetupSteps({ step }: { step: number }) {
  const store = useStore();
  const steps = ['Mode', store.setup.mode === 'skirmish' ? 'Scenario' : 'Campaign', 'Pantheon', 'Patron', 'Briefing'];
  return (
    <ol className="setup-steps" aria-label="Setup progress">
      {steps.map((s, i) => (
        <li key={s} className={i === step ? 'is-current' : i < step ? 'is-done' : ''} aria-current={i === step ? 'step' : undefined}>
          <span className="setup-steps__n">{i + 1}</span> {s}
        </li>
      ))}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// S02 Game Mode
// ---------------------------------------------------------------------------

export function GameModeScreen() {
  const store = useStore();
  const pick = (mode: 'campaign' | 'skirmish') => {
    store.resetSetup(mode);
    store.goto('scenario-select');
  };
  const modes = [
    { id: 'campaign' as const, icon: 'campaign' as const, title: 'Campaign', text: 'Story missions with a persistent hero. The Three Beacons is playable: three Greek missions.', status: 'Playable' },
    { id: 'skirmish' as const, icon: 'skirmish' as const, title: 'Skirmish', text: 'A single scenario against a local AI rival using the same rules as the campaign. All six pantheons are playable.', status: 'Playable' },
  ];
  return (
    <div className="setup-screen">
      <ScreenHeader title="New Game" subtitle="Choose how you want to play" />
      <SetupSteps step={0} />
      <div className="mode-grid">
        {modes.map((m) => (
          <button key={m.id} type="button" className="mode-card panel" onClick={() => pick(m.id)} data-testid={`mode-${m.id}`}>
            <Icon name={m.icon} className="mode-card__icon" />
            <h2>{m.title}</h2>
            <p>{m.text}</p>
            <Chip tone="ok">{m.status}</Chip>
          </button>
        ))}
        <div className="mode-card panel is-disabled" aria-disabled="true">
          <Icon name="flag" className="mode-card__icon" />
          <h2>Multiplayer</h2>
          <p>Hot-seat and online play are not part of this build.</p>
          <Chip tone="muted">Not in this build</Chip>
        </div>
        <div className="mode-card panel is-disabled" aria-disabled="true">
          <Icon name="map" className="mode-card__icon" />
          <h2>Custom Map</h2>
          <p>Random and editor maps are planned. Authored templates exist; the map generator is used for campaign variation only.</p>
          <Chip tone="muted">Planned</Chip>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// S03 Scenario / Campaign selection
// ---------------------------------------------------------------------------

function CampaignDetail({ c }: { c: CampaignDefinition }) {
  const store = useStore();
  const catalog = store.catalog;
  const missions = c.missionIds.map((id) => catalog.missions[id]!).filter(Boolean);
  return (
    <Panel title={c.name} className="setup-detail" bodyClassName="scroll" headerIcon="campaign">
      <div className="setup-detail__lead">
        <HeroPortrait catalog={catalog} definitionId={c.heroDefinitionId} size="6rem" />
        <div>
          <div className="tagline">{c.tagline}</div>
          <p>{c.summary}</p>
          <div className="row gap">
            <Chip tone={c.status === 'playable' ? 'ok' : 'muted'}>{c.status === 'playable' ? 'Playable' : 'Coming later'}</Chip>
            <Chip>{catalog.pantheons[c.pantheonId]?.name} campaign</Chip>
            <Chip>{missions.length} missions</Chip>
          </div>
        </div>
      </div>
      {missions.length ? (
        <>
          <SectionTitle>Missions</SectionTitle>
          <div className="mission-list">
            {missions.map((m) => (
              <div key={m.id} className="mission-row">
                <MissionThumb catalog={catalog} missionId={m.id} style={{ width: '7.5rem', height: '4.6rem' }} />
                <div>
                  <div className="mission-row__title">
                    {m.order}. {m.name} <span className="dim">— {m.subtitle}</span>
                  </div>
                  <p className="dim">{m.summary}</p>
                  <div className="row gap wrap">
                    <Chip>{m.targetPlaytime}</Chip>
                    {m.newDecisions.slice(0, 3).map((d) => (
                      <Chip key={d} tone="info">
                        {d}
                      </Chip>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}
      {c.carryoverPolicy.length ? (
        <>
          <SectionTitle>What carries between missions</SectionTitle>
          <table className="table">
            <tbody>
              {c.carryoverPolicy.map((p) => (
                <tr key={p.category}>
                  <th>{p.category}</th>
                  <td>{p.policy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
    </Panel>
  );
}

export function ScenarioSelectScreen() {
  const store = useStore();
  const catalog = store.catalog;
  const mode = store.setup.mode ?? 'campaign';
  const campaigns = Object.values(catalog.campaigns);
  const skirmishes = Object.values(catalog.skirmishes);
  const [selected, setSelected] = useState<string>(mode === 'campaign' ? (campaigns.find((c) => c.status === 'playable')?.id ?? '') : (skirmishes[0]?.id ?? ''));
  const campaign = mode === 'campaign' ? catalog.campaigns[selected] : undefined;
  const skirmish = mode === 'skirmish' ? catalog.skirmishes[selected] : undefined;
  const playable = campaign ? campaign.status === 'playable' : skirmish ? skirmish.status === 'playable' : false;
  const next = () => {
    if (campaign) {
      store.setup = { ...store.setup, mode: 'campaign', campaignId: campaign.id, missionId: campaign.missionIds[0] ?? null, pantheonId: campaign.pantheonId, godId: null };
    } else if (skirmish) {
      const m = catalog.missions[skirmish.missionId];
      // Scenarios with pantheon variants leave both pantheons to the next step.
      const open = !!skirmish.variants?.length;
      store.setup = {
        ...store.setup,
        mode: 'skirmish',
        campaignId: null,
        scenarioId: skirmish.id,
        missionId: skirmish.missionId,
        pantheonId: open ? null : (m?.player.pantheonId ?? 'greek'),
        rivalPantheonId: open ? null : (m?.rivals?.[0]?.pantheonId ?? null),
        godId: null,
      };
    }
    store.goto('pantheon-select');
  };
  const skMission = skirmish ? catalog.missions[skirmish.missionId] : undefined;
  return (
    <div className="setup-screen">
      <ScreenHeader
        title={mode === 'campaign' ? 'Choose a Campaign' : 'Choose a Scenario'}
        subtitle={mode === 'campaign' ? 'Story campaigns' : 'Skirmish scenarios against the local AI'}
        right={
          <div className="tabs">
            <button type="button" role="tab" className="tab" aria-selected={mode === 'campaign'} onClick={() => { store.resetSetup('campaign'); store.replace('scenario-select'); }}>
              Campaigns
            </button>
            <button type="button" role="tab" className="tab" aria-selected={mode === 'skirmish'} onClick={() => { store.resetSetup('skirmish'); store.replace('scenario-select'); }}>
              Skirmish
            </button>
          </div>
        }
      />
      <SetupSteps step={1} />
      <div className="setup-split">
        <Panel title={mode === 'campaign' ? 'Campaigns' : 'Scenarios'} className="setup-list" bodyClassName="scroll">
          {(mode === 'campaign' ? campaigns : skirmishes).map((c) => (
            <button key={c.id} type="button" className={`list-card ${selected === c.id ? 'is-selected' : ''}`} onClick={() => setSelected(c.id)} data-testid={`scenario-${c.id}`}>
              <div className="list-card__title">{c.name}</div>
              <div className="list-card__meta">{'tagline' in c ? c.tagline : c.summary}</div>
              <Chip tone={c.status === 'playable' ? 'ok' : 'muted'}>{c.status === 'playable' ? 'Playable' : 'Coming later'}</Chip>
            </button>
          ))}
          <div className="list-card is-disabled">
            <div className="list-card__title">{mode === 'campaign' ? 'Other pantheon campaigns' : 'More scenarios'}</div>
            <div className="list-card__meta">
              {mode === 'campaign'
                ? 'Campaigns for the other pantheons are not written yet; every pantheon can be played in skirmish.'
                : 'More maps, random maps and more than one rival are planned.'}
            </div>
            <Chip tone="muted">Not available</Chip>
          </div>
        </Panel>
        {campaign ? <CampaignDetail c={campaign} /> : null}
        {skirmish && skMission ? (
          <Panel title={skirmish.name} className="setup-detail" headerIcon="skirmish" bodyClassName="scroll">
            <div className="setup-detail__lead">
              <MissionThumb catalog={catalog} missionId={skMission.id} style={{ width: '12rem', height: '7rem' }} />
              <div>
                <p>{skirmish.summary}</p>
                <p className="dim">{skMission.summary}</p>
                <div className="row gap wrap">
                  <Chip tone="ok">Playable</Chip>
                  <Chip>{catalog.mapTemplates[skMission.mapTemplateId]?.width}×{catalog.mapTemplates[skMission.mapTemplateId]?.height} map</Chip>
                  <Chip>{(skMission.rivals ?? []).length} AI rival</Chip>
                  <Chip tone={skMission.heroHiringEnabled ? 'ok' : 'muted'}>{skMission.heroHiringEnabled ? 'Hero hiring' : 'No hiring'}</Chip>
                  {skirmish.variants?.length ? <Chip tone="info">Choose both pantheons</Chip> : null}
                </div>
              </div>
            </div>
            <SectionTitle>Objectives</SectionTitle>
            <ul className="bullets">
              {skMission.objectives.map((o) => (
                <li key={o.id}>
                  <strong>{o.title}</strong> <span className="dim">— {o.description}</span>
                </li>
              ))}
            </ul>
            <SectionTitle>Known limits</SectionTitle>
            <p className="dim">
              Sieges use a temporary deterministic model (walls, gate, keep, moat, towers; proposed values). Town-defender stack merging is not available yet. Skirmish grants the covenants for the tier-3, -6 and -7 dwellings so every
              pantheon’s full roster can be built. Norse, Egyptian, Japanese, Celtic and Mesoamerican values are proposed and unplaytested.
            </p>
          </Panel>
        ) : null}
      </div>
      <footer className="setup-footer">
        <Button onClick={() => store.back()} icon="back">
          Back
        </Button>
        <Button variant="primary" size="large" disabled={!playable} disabledReason="This content is not available in this build" onClick={next} data-testid="setup-next">
          Choose Pantheon
        </Button>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// S04 Pantheon selection
// ---------------------------------------------------------------------------

function PantheonDetail({ p }: { p: PantheonDefinition }) {
  const store = useStore();
  const catalog = store.catalog;
  return (
    <Panel title={`${p.name} Pantheon`} className="setup-detail" bodyClassName="scroll" style={{ ['--faction' as string]: p.theme.accent }}>
      <div className="setup-detail__lead">
        <Emblem catalog={catalog} pantheonId={p.id} size="5rem" />
        <div>
          <div className="tagline">{p.epithet}</div>
          <p>{p.summary}</p>
          <div className="row gap">
            <Chip tone={p.playability === 'playable' ? 'ok' : 'info'}>{p.playability === 'playable' ? 'Playable' : 'Preparation content'}</Chip>
            <Chip>{p.godIds.length} gods</Chip>
            <Chip>{p.heroIds.length} heroes</Chip>
          </div>
        </div>
      </div>
      {p.signature ? (
        <>
          <SectionTitle>Signature: {p.signature.name} (proposed)</SectionTitle>
          <ul className="bullets small" data-testid="setup-signature">
            {p.signature.rules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </>
      ) : null}
      <SectionTitle>Seven creature tiers</SectionTitle>
      <div className="roster-grid">
        {p.roster.map((r) => {
          const fam = catalog.families[r.familyId];
          if (!fam) return null;
          const base = catalog.creatures[fam.baseCreatureId];
          const up = catalog.creatures[fam.upgradedCreatureId];
          return (
            <div key={r.tier} className="roster-cell">
              <span className="roster-cell__tier">T{r.tier}</span>
              <CreaturePortrait catalog={catalog} creatureId={fam.baseCreatureId} size="3rem" />
              <div className="roster-cell__names">
                <div>{base?.name}</div>
                <div className="dim">↑ {up?.name}</div>
              </div>
            </div>
          );
        })}
      </div>
      <SectionTitle>Gods</SectionTitle>
      <div className="row gap wrap">
        {p.godIds.map((g) => {
          const god = catalog.gods[g];
          return (
            <span key={g} className="god-pill" title={god?.domain}>
              <GodPortrait catalog={catalog} godId={g} size="2rem" locked={god?.implementationStatus !== 'implemented'} /> {god?.name}
            </span>
          );
        })}
      </div>
      {p.playability !== 'playable' ? (
        <p className="note">
          Preparation pantheon: names, tiers and god list are present for architecture and the encyclopedia. Stats, towns and abilities are not designed yet, so it cannot be played.
        </p>
      ) : null}
    </Panel>
  );
}

function RivalPicker({ options, rival, onPick }: { options: readonly string[]; rival: string; onPick: (id: string) => void }) {
  const catalog = useStore().catalog;
  return (
    <div className="rival-picker" role="radiogroup" aria-label="Rival pantheon">
      <span className="rival-picker__label">AI rival</span>
      {options.map((id) => {
        const pp = catalog.pantheons[id];
        if (!pp) return null;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={rival === id}
            className={`rival-chip ${rival === id ? 'is-selected' : ''}`}
            style={{ ['--faction' as string]: pp.theme.accent }}
            onClick={() => onPick(id)}
            data-testid={`rival-${id}`}
          >
            <Emblem catalog={catalog} pantheonId={id} size="1.6rem" /> {pp.name}
          </button>
        );
      })}
    </div>
  );
}

export function PantheonSelectScreen() {
  const store = useStore();
  const catalog = store.catalog;
  const locked = store.setup.pantheonId;
  const [selected, setSelected] = useState(locked ?? catalog.pantheonOrder[0] ?? 'greek');
  const scenario = store.setup.mode === 'skirmish' && store.setup.scenarioId ? catalog.skirmishes[store.setup.scenarioId] : undefined;
  const variants = scenario?.variants ?? [];
  const rivalOptions = catalog.pantheonOrder.filter((id) => variants.some((v) => v.rivalPantheonId === id));
  const [rival, setRival] = useState(store.setup.rivalPantheonId ?? rivalOptions[0] ?? 'greek');
  const variant = variants.find((v) => v.playerPantheonId === selected && v.rivalPantheonId === rival);
  const p = catalog.pantheons[selected];
  const campaign = store.setup.campaignId ? catalog.campaigns[store.setup.campaignId] : undefined;
  const needsVariant = variants.length > 0;
  const canPick = !!p && p.playability === 'playable' && (!locked || locked === p.id) && (!needsVariant || !!variant);
  const reason = !p
    ? ''
    : p.playability !== 'playable'
      ? `${p.name} is preparation content in this build`
      : locked && locked !== p.id
        ? `${campaign?.name ?? 'This scenario'} is played as the ${catalog.pantheons[locked]?.name} pantheon`
        : needsVariant && !variant
          ? `${scenario?.name ?? 'This scenario'} has no ${p.name} vs. ${catalog.pantheons[rival]?.name} version`
          : '';
  return (
    <div className="setup-screen">
      <ScreenHeader
        title="Choose a Pantheon"
        subtitle={
          campaign
            ? `${campaign.name} is a ${catalog.pantheons[campaign.pantheonId]?.name} campaign`
            : needsVariant
              ? `Your pantheon and the AI rival’s · ${catalog.pantheons[selected]?.name ?? ''} vs. ${catalog.pantheons[rival]?.name ?? ''}`
              : `${catalog.pantheonOrder.length} pantheons; ${catalog.pantheonOrder.filter((id) => catalog.pantheons[id]?.playability === 'playable').length} playable in this build`
        }
      />
      <SetupSteps step={2} />
      <div className="pantheon-row" role="listbox" aria-label="Pantheons">
        {catalog.pantheonOrder.map((id) => {
          const pp = catalog.pantheons[id];
          if (!pp) return null;
          return (
            <button
              key={id}
              type="button"
              role="option"
              aria-selected={selected === id}
              className={`pantheon-card ${selected === id ? 'is-selected' : ''} ${pp.playability !== 'playable' ? 'is-prep' : ''}`}
              style={{ ['--faction' as string]: pp.theme.accent }}
              onClick={() => setSelected(id)}
              data-testid={`pantheon-${id}`}
            >
              <Emblem catalog={catalog} pantheonId={id} size="3.6rem" />
              <div className="pantheon-card__name">{pp.name}</div>
              <div className="pantheon-card__epithet">{pp.epithet}</div>
              <Chip tone={pp.playability === 'playable' ? 'ok' : 'muted'}>{pp.playability === 'playable' ? 'Playable' : 'Preview'}</Chip>
            </button>
          );
        })}
      </div>
      {rivalOptions.length ? <RivalPicker options={rivalOptions} rival={rival} onPick={setRival} /> : null}
      {p ? <PantheonDetail p={p} /> : null}
      <footer className="setup-footer">
        <Button onClick={() => store.back()} icon="back">
          Back
        </Button>
        <Button
          variant="primary"
          size="large"
          disabled={!canPick}
          disabledReason={reason}
          data-testid="setup-next"
          onClick={() => {
            store.setup = variant
              ? { ...store.setup, pantheonId: selected, rivalPantheonId: rival, missionId: variant.missionId, godId: null }
              : { ...store.setup, pantheonId: selected };
            store.goto('divine-select');
          }}
        >
          Choose Patron
        </Button>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// S05 Starting divine selection
// ---------------------------------------------------------------------------

function GodCard({ god, selected, onSelect, disabled, note }: { god: GodDefinition; selected: boolean; onSelect?: () => void; disabled?: boolean; note?: string }) {
  const catalog = useStore().catalog;
  return (
    <button type="button" className={`god-card panel ${selected ? 'is-selected' : ''} ${disabled ? 'is-disabled' : ''}`} onClick={onSelect} disabled={disabled || !onSelect} aria-pressed={selected}>
      <GodPortrait catalog={catalog} godId={god.id} size="6.5rem" locked={god.implementationStatus !== 'implemented'} />
      <div className="god-card__name">{god.name}</div>
      <div className="god-card__domain">{god.domain}</div>
      {god.benefitSummary.length ? (
        <ul className="bullets small">
          {god.benefitSummary.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      ) : (
        <p className="dim small">Blessing not yet designed.</p>
      )}
      {note ? <div className="god-card__note">{note}</div> : null}
    </button>
  );
}

export function DivineSelectScreen() {
  const store = useStore();
  const catalog = store.catalog;
  const setup = store.setup;
  const pantheon = catalog.pantheons[setup.pantheonId ?? 'greek']!;
  const campaign = setup.campaignId ? catalog.campaigns[setup.campaignId] : undefined;
  const options = campaign ? campaign.startingGodOptions : pantheon.godIds.filter((g) => catalog.gods[g]?.role === 'patron' && catalog.gods[g]?.implementationStatus === 'implemented');
  const [godId, setGodId] = useState(setup.godId ?? options[0] ?? null);
  const later = pantheon.godIds.filter((g) => !options.includes(g));
  const fixed = options.length === 1;
  const begin = () => {
    if (!godId) return;
    store.setup = { ...store.setup, godId };
    if (campaign) store.startCampaign(campaign.id, godId);
    else if (setup.missionId) store.startScenario(setup.missionId, godId);
  };
  return (
    <div className="setup-screen">
      <ScreenHeader title="Starting Patron" subtitle={fixed ? 'This scenario fixes its patron god' : 'Choose the god who sponsors your expedition'} />
      <SetupSteps step={3} />
      <div className="divine-layout">
        <Panel title={fixed ? 'Fixed patron' : 'Patron options'} className="divine-options">
          <div className="god-grid">
            {options.map((g) => {
              const god = catalog.gods[g];
              return god ? <GodCard key={g} god={god} selected={godId === g} onSelect={fixed ? undefined : () => setGodId(g)} note={fixed ? 'Fixed by the campaign' : undefined} /> : null;
            })}
          </div>
          {campaign?.startingGodNote ? <p className="note">{campaign.startingGodNote}</p> : null}
          {!fixed ? <p className="note">The patron choice is permanent for this playthrough.</p> : null}
        </Panel>
        <Panel title="Chosen later in play" className="divine-later" bodyClassName="scroll">
          <p className="dim small">Minor gods are committed from the Pantheon screen once their shrine requirements are met. Undesigned gods are listed for completeness only.</p>
          <div className="god-mini-list">
            {later.map((g) => {
              const god = catalog.gods[g];
              if (!god) return null;
              return (
                <div key={g} className="god-mini">
                  <GodPortrait catalog={catalog} godId={g} size="2.6rem" locked={god.implementationStatus !== 'implemented'} />
                  <div>
                    <div>
                      {god.name} <span className="dim">· {god.domain}</span>
                    </div>
                    <div className="row gap">
                      <StatusChip status={god.implementationStatus} />
                      {god.role === 'minor' ? <Chip tone="info">Minor · {god.favorCost} Favor</Chip> : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
      <Rule />
      <footer className="setup-footer">
        <Button onClick={() => store.back()} icon="back">
          Back
        </Button>
        <Button variant="primary" size="large" disabled={!godId} disabledReason="Choose a patron" onClick={begin} data-testid="setup-begin">
          Begin — Mission Briefing
        </Button>
      </footer>
    </div>
  );
}
