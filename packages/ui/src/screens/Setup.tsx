/**
 * Setup flow. Campaign: S02 Game Mode → S03 Campaign → Mission Briefing →
 * Adventure Map (a campaign is played with its own pantheon). Skirmish: S02 →
 * S03 Scenario → S04 Pantheon (own and rival pantheon, rival seat, difficulty)
 * → Mission Briefing. Random maps have their own setup screen (S19,
 * RandomSetup.tsx) and start without a briefing.
 *
 * There is no patron screen (owner decision 2026-10-03): every pantheon has
 * one patron god, so it is taken from the content (`defaultPatron`).
 * Content not yet playable is shown honestly as unavailable.
 */
import { useState, type CSSProperties } from 'react';
import type { CampaignDefinition, ContentCatalog, DifficultyDefinition, PantheonDefinition, SkirmishMapDefinition } from '@pr/rules';
import { useStore } from '../app/context';
import { Button, Panel, SectionTitle, Segmented, TextInput } from '../components/kit';
import { CampaignThumb, Emblem, GodPortrait, HeroPortrait, MissionThumb, CreaturePortrait, SpeakerPortrait } from '../components/art';
import { resolveArt, resolveAsset } from '../assets/manifest';
import { ScreenHeader } from '../components/game';
import { Icon } from '../assets/icons';
import { TemperamentNote } from '../components/temperament';
import { MapPreview, SkirmishMapThumb } from '../components/mapPreview';

/**
 * A chosen campaign's painted cover behind the setup screens (campaign
 * selection and its intro steps), under a scrim; the game UI draws every title,
 * badge and button on top.
 */
function campaignBackdrop(campaignId: string | null | undefined): { className: string; style?: CSSProperties } {
  const art = campaignId ? resolveArt(`campaign.${campaignId}.cover`) : null;
  return art ? { className: 'setup-screen setup-screen--cover', style: { ['--app-art' as string]: `url("${art.url}")` } } : { className: 'setup-screen' };
}

/** The patron god a game starts with: the campaign's starting option, else the pantheon's implemented patron. */
export function defaultPatron(catalog: ContentCatalog, pantheonId: string | null | undefined, campaign?: CampaignDefinition): string | null {
  if (campaign) return campaign.startingGodOptions[0] ?? null;
  return (catalog.pantheons[pantheonId ?? '']?.godIds ?? []).find((g) => catalog.gods[g]?.role === 'patron' && catalog.gods[g]?.implementationStatus === 'implemented') ?? null;
}

// ---------------------------------------------------------------------------
// S02 Game Mode
// ---------------------------------------------------------------------------

export function GameModeScreen() {
  const store = useStore();
  const pick = (mode: 'campaign' | 'skirmish' | 'random' | 'editor') => {
    if (mode === 'editor') {
      store.goto('map-editor');
      return;
    }
    if (mode === 'random') {
      store.resetSetup('skirmish');
      store.goto('random-setup');
      return;
    }
    store.resetSetup(mode);
    store.goto('scenario-select');
  };
  const modes = [
    { id: 'campaign' as const, icon: 'campaign' as const, title: 'Campaign', text: 'Story missions with a persistent hero: The Three Beacons (three Greek missions) and The Winter Oath (seven Norse missions).' },
    { id: 'skirmish' as const, icon: 'skirmish' as const, title: 'Skirmish', text: 'An authored map against the AI or a second player on this computer (hot-seat). All six pantheons, three difficulties.' },
    { id: 'random' as const, icon: 'map' as const, title: 'Random Map', text: 'A new fair map every time: nine layouts, two to six empires, AI or hot-seat seats, and a choice of victory condition.' },
    { id: 'editor' as const, icon: 'build' as const, title: 'Map Editor', text: 'Make your own map — ground, roads, towns, mines, treasures and the goal — save it as a map file, and play it.' },
  ];
  return (
    <div className="setup-screen">
      <ScreenHeader title="New Game" />
      <div className="mode-grid mode-grid--4 mode-grid--large">
        {modes.map((m) => (
          <button key={m.id} type="button" className="mode-card panel" onClick={() => pick(m.id)} data-testid={`mode-${m.id}`}>
            <Icon name={m.icon} className="mode-card__icon" />
            <h2>{m.title}</h2>
            <p>{m.text}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Difficulty choice with its exact effects (skirmish only; the campaign keeps its authored balance). */
export function DifficultyPicker({ catalog, value, onChange }: { catalog: ContentCatalog; value: string; onChange: (id: string) => void }) {
  const list: DifficultyDefinition[] = Object.values(catalog.difficulties ?? {}).sort((a, b) => a.order - b.order);
  const cur = list.find((d) => d.id === value);
  if (list.length === 0) return null;
  return (
    <div className="setting-block">
      <div className="setting-block__label">Difficulty</div>
      <Segmented label="Difficulty" value={value} options={list.map((d) => ({ id: d.id, label: d.name, title: d.summary }))} onChange={onChange} testId="difficulty" />
      {cur ? (
        <ul className="bullets small dim setting-block__details">
          {cur.details.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      ) : null}
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
        {catalog.heroes[c.heroDefinitionId] ? (
          <SpeakerPortrait catalog={catalog} line={{ speaker: catalog.heroes[c.heroDefinitionId]!.name, portraitAssetId: catalog.heroes[c.heroDefinitionId]!.portraitAssetId }} size="6rem" bustFirst />
        ) : (
          <HeroPortrait catalog={catalog} definitionId={c.heroDefinitionId} size="6rem" />
        )}
        <div>
          <div className="tagline">{c.tagline}</div>
          <p>{c.summary}</p>
        </div>
      </div>
      {missions.length ? (
        <>
          <SectionTitle>Missions</SectionTitle>
          <div className="mission-list">
            {missions.map((m) => (
              <div key={m.id} className="mission-row">
                <MissionThumb catalog={catalog} missionId={m.id} style={{ width: '8.4rem', height: '4.725rem' }} />
                <div>
                  <div className="mission-row__title">
                    {m.order}. {m.name} <span className="dim">— {m.subtitle}</span>
                  </div>
                  <p className="dim">{m.summary}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </Panel>
  );
}

const BIOME_LABEL: Readonly<Record<string, string>> = { temperate: 'Temperate', autumn: 'Autumn', coast: 'Coast', desert: 'Desert', fjord: 'Fjord', high_pass: 'High pass', jungle: 'Jungle', moor: 'Moor', storm_plateau: 'Storm plateau', tundra: 'Tundra' };

/** The facts of an authored skirmish map, from its document. */
export function skirmishMapFacts(catalog: ContentCatalog, def: SkirmishMapDefinition): { label: string; value: string }[] {
  const d = def.map;
  const cells = [...d.terrain].filter((c) => c !== 'v').length;
  const size = cells < 900 ? 'Medium' : cells < 1800 ? 'Large' : 'Huge';
  const climate = catalog.climates?.[d.biome ?? ''];
  return [
    { label: 'Empires', value: String(d.players.length) },
    { label: 'Size', value: `${size} (${cells.toLocaleString('en-US')} hexes)` },
    { label: 'Victory', value: d.victory.type === 'hold_relic' ? `Hold the shrine ${d.victory.days} days, or conquer` : 'Last empire standing' },
    { label: 'Climate', value: climate ? `${climate.name} — ${climate.summary}` : (BIOME_LABEL[d.biome ?? 'temperate'] ?? 'Temperate') },
    { label: 'Treasury', value: d.startWealth === 'high' ? 'Twice the usual' : d.startWealth === 'low' ? 'Half the usual' : 'The usual' },
    { label: 'Map', value: d.revealMap ? 'Revealed from the start' : 'Hidden until explored' },
  ];
}

function SkirmishMapDetail({ def }: { def: SkirmishMapDefinition }) {
  const store = useStore();
  const catalog = store.catalog;
  const hasArt = !!resolveAsset(def.thumbnailAssetId).url;
  return (
    <Panel title={def.name} className="setup-detail" headerIcon="map" bodyClassName="scroll">
      {/* The painting once delivered (Brief 14); until then the drawn layout below is the picture. */}
      <div className={`map-detail__art ${hasArt ? '' : 'is-empty'}`} data-testid="skirmish-map-detail">
        {hasArt ? <SkirmishMapThumb doc={def.map} assetId={def.thumbnailAssetId} large style={{ width: '100%', aspectRatio: '16 / 9', height: 'auto' }} /> : null}
      </div>
      <div className="tagline">{def.tagline}</div>
      <p>{def.summary}</p>
      <ul className="bullets">
        {def.highlights.map((h) => (
          <li key={h}>{h}</li>
        ))}
      </ul>
      <div className="map-detail__split">
        <dl className="map-detail__facts">
          {skirmishMapFacts(catalog, def).map((f) => (
            <div key={f.label} className="map-detail__fact">
              <dt>{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
        <figure className="map-detail__layout">
          <MapPreview doc={def.map} style={{ width: '100%', height: 'auto' }} label={`${def.name} — layout`} />
          <figcaption className="small faint">Layout: towns in their seat colours, the shrine, portals, key gates and guarded passes.</figcaption>
        </figure>
      </div>
      <p className="small dim">Every empire’s lands are laid out alike — mirrored or turned — so no seat starts with better ground. Values are proposed and measured only in AI-against-AI games.</p>
    </Panel>
  );
}

export function ScenarioSelectScreen() {
  const store = useStore();
  const catalog = store.catalog;
  const mode = store.setup.mode ?? 'campaign';
  const campaigns = Object.values(catalog.campaigns);
  const skirmishes = Object.values(catalog.skirmishes);
  const maps = Object.values(catalog.skirmishMaps ?? {}).sort((a, b) => a.order - b.order);
  const [selected, setSelected] = useState<string>(mode === 'campaign' ? (campaigns.find((c) => c.status === 'playable')?.id ?? '') : (skirmishes[0]?.id ?? ''));
  const campaign = mode === 'campaign' ? catalog.campaigns[selected] : undefined;
  const skirmish = mode === 'skirmish' ? catalog.skirmishes[selected] : undefined;
  // Authored skirmish maps are listed after the scenarios (selection key `map:<id>`).
  const map = mode === 'skirmish' && selected.startsWith('map:') ? catalog.skirmishMaps?.[selected.slice(4)] : undefined;
  const playable = campaign ? campaign.status === 'playable' : skirmish ? skirmish.status === 'playable' : !!map;
  const next = () => {
    if (map) {
      store.setup = { ...store.setup, mode: 'skirmish', campaignId: null, scenarioId: null, missionId: null, skirmishMapId: map.id, pantheonId: null, rivalPantheonId: null, godId: null };
      store.goto('map-setup');
      return;
    }
    if (campaign) {
      // A campaign is played with its own pantheon and patron: straight to the briefing.
      const godId = defaultPatron(catalog, campaign.pantheonId, campaign);
      store.setup = { ...store.setup, mode: 'campaign', campaignId: campaign.id, missionId: campaign.missionIds[0] ?? null, pantheonId: campaign.pantheonId, godId };
      store.startCampaign(campaign.id, godId);
      return;
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
  // A selected skirmish map's painting (Brief 14) behind the list, like a campaign's cover.
  const mapArt = map ? resolveArt(map.thumbnailAssetId.replace(/\.thumbnail$/, '.briefing')) : null;
  const backdrop = mapArt ? { className: 'setup-screen setup-screen--cover', style: { ['--app-art' as string]: `url("${mapArt.url}")` } } : campaignBackdrop(mode === 'campaign' ? selected : null);
  return (
    <div {...backdrop}>
      <ScreenHeader title={mode === 'campaign' ? 'Choose a Campaign' : 'Choose a Scenario'} />
      <div className="setup-split">
        <Panel title={mode === 'campaign' ? 'Campaigns' : 'Scenarios'} className="setup-list" bodyClassName="scroll">
          {(mode === 'campaign' ? campaigns : skirmishes).map((c) => (
            <button key={c.id} type="button" className={`list-card ${selected === c.id ? 'is-selected' : ''}`} onClick={() => setSelected(c.id)} data-testid={`scenario-${c.id}`}>
              {mode === 'campaign' ? (
                <CampaignThumb catalog={catalog} campaignId={c.id} style={{ width: '100%', aspectRatio: '16 / 9', height: 'auto' }} />
              ) : 'missionId' in c ? (
                <MissionThumb catalog={catalog} missionId={c.missionId} style={{ width: '100%', aspectRatio: '16 / 9', height: 'auto' }} />
              ) : null}
              <div className="list-card__title">{c.name}</div>
              <div className="list-card__meta">{'tagline' in c ? c.tagline : c.summary}</div>
              {c.status !== 'playable' ? <div className="list-card__meta dim">Not available yet</div> : null}
            </button>
          ))}
          {mode === 'skirmish' && maps.length ? (
            <>
              <SectionTitle>Skirmish maps</SectionTitle>
              {maps.map((m) => (
                <button key={m.id} type="button" className={`list-card ${selected === `map:${m.id}` ? 'is-selected' : ''}`} onClick={() => setSelected(`map:${m.id}`)} data-testid={`skirmish-map-${m.id}`}>
                  <SkirmishMapThumb doc={m.map} assetId={m.thumbnailAssetId} style={{ width: '100%', aspectRatio: '16 / 9', height: 'auto' }} />
                  <div className="list-card__title">{m.name}</div>
                  <div className="list-card__meta">
                    {m.map.players.length} empires · {m.tagline}
                  </div>
                </button>
              ))}
            </>
          ) : null}
        </Panel>
        {campaign ? <CampaignDetail c={campaign} /> : null}
        {map ? <SkirmishMapDetail def={map} /> : null}
        {skirmish && skMission ? (
          <Panel title={skirmish.name} className="setup-detail" headerIcon="skirmish" bodyClassName="scroll">
            <div className="setup-detail__lead">
              <MissionThumb catalog={catalog} missionId={skMission.id} style={{ width: '12.8rem', height: '7.2rem' }} />
              <div>
                <p>{skirmish.summary}</p>
                <p className="dim">{skMission.summary}</p>
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
        {campaign ? (
          <Button variant="primary" size="large" disabled={!playable} disabledReason="This content is not available in this build" onClick={next} data-testid="setup-begin">
            Begin — Mission Briefing
          </Button>
        ) : map ? (
          <Button variant="primary" size="large" onClick={next} data-testid="setup-next">
            Set Up Empires
          </Button>
        ) : (
          <Button variant="primary" size="large" disabled={!playable} disabledReason="This content is not available in this build" onClick={next} data-testid="setup-next">
            Choose Pantheon
          </Button>
        )}
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

function RivalPicker({ options, rival, onPick, human }: { options: readonly string[]; rival: string; onPick: (id: string) => void; human?: boolean }) {
  const catalog = useStore().catalog;
  return (
    <div className="rival-picker" role="radiogroup" aria-label="Rival pantheon">
      <span className="rival-picker__label">{human ? 'Second player' : 'AI rival'}</span>
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
  const isSkirmish = store.setup.mode === 'skirmish';
  const [difficulty, setDifficulty] = useState(store.setup.difficultyId ?? 'normal');
  const [rivalCtl, setRivalCtl] = useState<'ai' | 'human'>(store.setup.rivalController ?? 'ai');
  const [p1Name, setP1Name] = useState(store.setup.playerName ?? 'Player 1');
  const [p2Name, setP2Name] = useState(store.setup.rivalName ?? 'Player 2');
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
    <div {...campaignBackdrop(store.setup.mode === 'campaign' ? store.setup.campaignId : null)}>
      <ScreenHeader title="Choose a Pantheon" />
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
              <span className="pantheon-card__emblem">
                <Emblem catalog={catalog} pantheonId={id} size="5.2rem" />
              </span>
              <span className="pantheon-card__name">{pp.name}</span>
              <span className="pantheon-card__epithet">{pp.epithet}</span>
              {pp.playability !== 'playable' ? <span className="pantheon-card__note">Not playable yet</span> : null}
            </button>
          );
        })}
      </div>
      {rivalOptions.length ? <RivalPicker options={rivalOptions} rival={rival} onPick={setRival} human={rivalCtl === 'human'} /> : null}
      {rivalOptions.length && isSkirmish && rivalCtl === 'ai' && variant && catalog.missions[variant.missionId]?.features?.aiTemperaments === true ? (
        <p className="rival-temperament">
          <span className="dim small">As an AI rival, {catalog.pantheons[rival]?.name ?? rival} plays as </span>
          <TemperamentNote catalog={catalog} pantheonId={rival} />
        </p>
      ) : null}
      {isSkirmish ? (
        <div className="match-settings" data-testid="match-settings">
          <div className="setting-block">
            <div className="setting-block__label">Rival seat</div>
            <Segmented
              label="Rival seat"
              value={rivalCtl}
              options={[
                { id: 'ai', label: 'AI' },
                { id: 'human', label: 'Second player (hot-seat)' },
              ]}
              onChange={setRivalCtl}
              testId="rival-controller"
            />
            {rivalCtl === 'human' ? (
              <div className="row gap wrap setting-block__details">
                <TextInput label="First player's name" value={p1Name} onChange={setP1Name} testId="name-p1" />
                <TextInput label="Second player's name" value={p2Name} onChange={setP2Name} testId="name-p2" />
              </div>
            ) : null}
          </div>
          {rivalCtl === 'ai' ? <DifficultyPicker catalog={catalog} value={difficulty} onChange={setDifficulty} /> : <p className="dim small">Two players share this computer and take turns; the map is hidden at each hand-over. Difficulty does not apply.</p>}
        </div>
      ) : null}
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
          data-testid="setup-begin"
          onClick={() => {
            const extra = isSkirmish
              ? { difficultyId: rivalCtl === 'ai' ? difficulty : 'normal', rivalController: rivalCtl, playerName: p1Name.trim() || 'Player 1', rivalName: p2Name.trim() || 'Player 2' }
              : {};
            const godId = defaultPatron(catalog, selected, campaign);
            const rivalGodId = rivalCtl === 'human' ? defaultPatron(catalog, rival) : null;
            store.setup = variant
              ? { ...store.setup, ...extra, pantheonId: selected, rivalPantheonId: rival, missionId: variant.missionId, godId, rivalGodId }
              : { ...store.setup, ...extra, pantheonId: selected, godId, rivalGodId };
            begin(store);
          }}
        >
          Begin — Mission Briefing
        </Button>
      </footer>
    </div>
  );
}

/** Start the game the setup draft describes (campaign or skirmish scenario), with its default patrons. */
function begin(store: ReturnType<typeof useStore>): void {
  const catalog = store.catalog;
  const setup = store.setup;
  const campaign = setup.campaignId ? catalog.campaigns[setup.campaignId] : undefined;
  const godId = setup.godId ?? defaultPatron(catalog, setup.pantheonId, campaign);
  if (campaign) {
    store.startCampaign(campaign.id, godId);
    return;
  }
  if (!setup.missionId) return;
  const mission = catalog.missions[setup.missionId];
  const rivalId = mission?.rivals?.[0]?.playerId;
  const playerId = mission?.player.playerId ?? 'player';
  const hotSeat = setup.rivalController === 'human';
  const rivalGodId = hotSeat ? (setup.rivalGodId ?? defaultPatron(catalog, setup.rivalPantheonId ?? mission?.rivals?.[0]?.pantheonId)) : null;
  store.startScenario(
    setup.missionId,
    godId,
    hotSeat && rivalId
      ? {
          difficultyId: 'normal',
          controllers: { [rivalId]: 'human' },
          playerNames: { [playerId]: setup.playerName ?? 'Player 1', [rivalId]: setup.rivalName ?? 'Player 2' },
          patronGodIds: rivalGodId ? { [rivalId]: rivalGodId } : {},
        }
      : { difficultyId: setup.difficultyId ?? 'normal' },
  );
}
