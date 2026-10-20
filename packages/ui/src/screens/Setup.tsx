import { SingleBattleIcon } from '../components/SingleBattleIcon';
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
import { useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { DEFAULT_CAMPAIGN_DIFFICULTY, difficultyLevels, type CampaignDefinition, type ContentCatalog, type DifficultyDefinition, type PantheonDefinition, type SkirmishMapDefinition, type SkirmishScenarioDefinition } from '@pr/rules';
import { useStore } from '../app/context';
import { Button, Panel, SectionTitle, Segmented, TextInput } from '../components/kit';
import { CampaignThumb, Emblem, GodPortrait, MissionThumb, CreaturePortrait, SpeakerPortrait } from '../components/art';
import { resolveArt, resolveAsset } from '../assets/manifest';
import { ScreenHeader } from '../components/game';
import { TemperamentNote } from '../components/temperament';
import { SkirmishMapThumb } from '../components/mapPreview';
import { FactionBanner } from '../components/gui';
import { guiThemeFor } from '../assets/guiArt';
import { FrontendShell, IllustratedChoice, backdropStyle, radioKeys } from '../components/frontend';
import { RANDOM_MAP_TYPES, SKIRMISH_MAX_EMPIRES } from '@pr/session';
import { chronicleModel, defaultSelection } from '../app/chronicle';
import { Chronicle } from '../components/chronicle';

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
  const catalog = store.catalog;
  const pick = (mode: 'campaign' | 'skirmish' | 'random' | 'editor' | 'single') => {
    if (mode === 'single') { store.goto('single-battle'); return; }
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
  // Every count comes from the content (1.1.0: no campaign or map names typed into the copy).
  const campaigns = Object.values(catalog.campaigns).filter((c) => c.status === 'playable');
  const campaignPantheons = new Set(campaigns.map((c) => c.pantheonId)).size;
  const skirmishChoices = Object.values(catalog.skirmishes).filter((x) => x.status === 'playable').length + Object.keys(catalog.skirmishMaps ?? {}).length;
  const pantheons = catalog.pantheonOrder.filter((id) => catalog.pantheons[id]?.playability === 'playable').length;
  const modes = [
    {
      id: 'campaign' as const,
      art: 'frontend.mode.campaign',
      title: 'Campaign',
      // Two Greek campaigns since 2026-10-14: "one for each" only while every pantheon has exactly one.
      text: `${campaigns.length} story ${campaigns.length === 1 ? 'campaign' : 'campaigns'}${campaignPantheons > 1 ? (campaignPantheons === campaigns.length ? `, one for each of ${campaignPantheons} pantheons` : ` across ${campaignPantheons} pantheons`) : ''}, with a hero who carries on from mission to mission.`,
    },
    { id: 'skirmish' as const, art: 'frontend.mode.skirmish', title: 'Skirmish', text: `${skirmishChoices} authored maps against the AI or other players on this computer (hot-seat). All ${pantheons} pantheons.` },
    { id: 'random' as const, art: 'frontend.mode.random-map', title: 'Random Map', text: `A new map every time: ${RANDOM_MAP_TYPES.length} layouts, 2 to ${SKIRMISH_MAX_EMPIRES} empires, AI or hot-seat seats and a choice of victory.` },
    { id: 'single' as const, art: 'frontend.mode.single-battle', title: 'Single Battle', text: '' },
    { id: 'editor' as const, art: 'frontend.mode.map-editor', title: 'Map Editor', text: 'Draw your own map — ground, roads, towns, mines, treasures and the goal — keep it in the map library and play it.' },
  ];
  return (
    <FrontendShell
      backdrop="title-hall"
      title="New Game"
      className="setup-screen fe-modes-screen"
      onBack={() => store.back()}
    >
      <div className="fe-modes" role="group" aria-label="Game modes">
        {modes.map((m) => (
          <IllustratedChoice key={m.id} artId={m.art} name={<><SingleBattleIcon name={({campaign:'campaign',skirmish:'defender',random:'random',single:'land',editor:'editor'})[m.id]} /> {m.title}</>} title={m.text || 'Single Battle'} onSelect={() => pick(m.id)} testId={`mode-${m.id}`} className="fe-choice--mode" />
        ))}
      </div>
    </FrontendShell>
  );
}

/** Difficulty choice with its exact effects: the skirmish levels, or a campaign's (Story / Normal / Hard). */
export function DifficultyPicker({ catalog, value, onChange, scope = 'skirmish' }: { catalog: ContentCatalog; value: string; onChange: (id: string) => void; scope?: 'skirmish' | 'campaign' }) {
  const list: DifficultyDefinition[] = difficultyLevels(catalog, scope);
  const cur = list.find((d) => d.id === value);
  if (list.length === 0) return null;
  return (
    <div className="setting-block">
      <div className="setting-block__label">Difficulty</div>
      <Segmented label="Difficulty" value={value} options={list.map((d) => ({ id: d.id, label: d.name, title: d.summary }))} onChange={onChange} testId={scope === 'campaign' ? 'campaign-difficulty' : 'difficulty'} />
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

/** The chapters (content v2) or missions (v1) a new run of this campaign plays, from the definitions. */
export function campaignRunCount(c: CampaignDefinition): { count: number; noun: 'chapter' | 'mission' } {
  return c.chapters?.length ? { count: c.chapters.length, noun: 'chapter' } : { count: c.missionIds.length, noun: 'mission' };
}

function countLabel({ count, noun }: { count: number; noun: string }): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/**
 * The chosen campaign (concept 03, "Campaign Chronicles"): its cover, story and
 * hero, and the campaign difficulty with its exact effects. A campaign with a
 * chapter graph (content v2, 2026-10-15) shows its chronicle: the chapters and
 * their `requiresAll` links, the selected chapter's summary and the
 * manual-battle line — a new run opens only the single opening chapter, which
 * Begin starts. A campaign without one keeps the read-only outline of its
 * missions in order. The panel wears the campaign's pantheon frame.
 */
function CampaignDetail({ c, difficultyId, onDifficulty }: { c: CampaignDefinition; difficultyId: string; onDifficulty: (id: string) => void }) {
  const store = useStore();
  const catalog = store.catalog;
  const missions = c.chapters?.length ? [] : c.missionIds.map((id) => catalog.missions[id]!).filter(Boolean);
  const chronicle = chronicleModel(catalog, c.id, null);
  const [chapter, setChapter] = useState<string | null>(() => (chronicle ? defaultSelection(chronicle) : null));
  const cover = resolveArt(`campaign.${c.id}.cover`);
  const hero = catalog.heroes[c.heroDefinitionId];
  return (
    <Panel title={c.name} className={`setup-detail fe-chronicle ${chronicle ? 'fe-chronicle--v2' : ''}`} bodyClassName="scroll fe-chronicle__body" framed surface="parchment" theme={guiThemeFor(c.pantheonId)} label={c.name}>
      <div className="fe-chronicle__lead">
        <figure className="fe-chronicle__cover">
          {cover ? <img src={cover.url} alt={`${c.name} cover painting`} draggable={false} data-testid="campaign-cover" /> : <CampaignThumb catalog={catalog} campaignId={c.id} style={{ width: '100%', height: '100%' }} />}
        </figure>
        <div className="fe-chronicle__story">
          <div className="fe-chronicle__kicker">
            <Emblem catalog={catalog} pantheonId={c.pantheonId} size="1.6rem" /> {catalog.pantheons[c.pantheonId]?.name} campaign
          </div>
          <div className="tagline">{c.tagline}</div>
          {/* A new run plays the chapters (content v2): their summary, else the original one. */}
          <p>{c.summaryV2 ?? c.summary}</p>
          {hero ? (
            <div className="fe-chronicle__hero">
              <SpeakerPortrait catalog={catalog} line={{ speaker: hero.name, portraitAssetId: hero.portraitAssetId }} size="3.2rem" bustFirst />
              <span>
                <span className="fe-chronicle__hero-name">{hero.name}</span>
                <span className="fe-chronicle__hero-title"> · {hero.title}</span>
              </span>
            </div>
          ) : null}
        </div>
      </div>
      {chronicle ? (
        <>
          <SectionTitle>
            {chronicle.nodes.length} {chronicle.nodes.length === 1 ? 'chapter' : 'chapters'}
          </SectionTitle>
          <Chronicle catalog={catalog} model={chronicle} selectedId={chapter} onSelect={setChapter} testId="setup-chronicle" />
        </>
      ) : null}
      {missions.length ? (
        <>
          <SectionTitle>
            {missions.length} {missions.length === 1 ? 'mission' : 'missions'}
          </SectionTitle>
          {/* Read-only: the campaign always begins with its first mission. */}
          <ol className="mission-list fe-outline" aria-label="Missions in order">
            {missions.map((m) => (
              <li key={m.id} className="mission-row fe-outline__row">
                <span className="fe-outline__n" aria-hidden="true">
                  {m.order}
                </span>
                <MissionThumb catalog={catalog} missionId={m.id} style={{ width: '7.2rem', height: '4.05rem' }} />
                <div>
                  <div className="mission-row__title">
                    {m.name} <span className="dim">— {m.subtitle}</span>
                  </div>
                  <p className="dim">{m.summary}</p>
                </div>
              </li>
            ))}
          </ol>
        </>
      ) : null}
      {c.status === 'playable' ? <DifficultyPicker catalog={catalog} value={difficultyId} onChange={onDifficulty} scope="campaign" /> : <p className="note">This campaign is not available in this build.</p>}
    </Panel>
  );
}

const BIOME_LABEL: Readonly<Record<string, string>> = { temperate: 'Temperate', autumn: 'Autumn', coast: 'Coast', desert: 'Desert', fjord: 'Fjord', high_pass: 'High pass', jungle: 'Jungle', moor: 'Moor', storm_plateau: 'Storm plateau', tundra: 'Tundra' };

type Fact = { label: string; value: string };

function sizeFact(cells: number): string {
  const size = cells < 700 ? 'Small' : cells < 900 ? 'Medium' : cells < 1800 ? 'Large' : 'Huge';
  return `${size} (${cells.toLocaleString('en-US')} hexes)`;
}

function climateFact(catalog: ContentCatalog, biome: string | undefined): string {
  const climate = catalog.climates?.[biome ?? ''];
  if (!climate) return BIOME_LABEL[biome ?? 'temperate'] ?? 'Temperate';
  // Some summaries already open with the climate's name ("Icy spray: …").
  return climate.summary.startsWith(climate.name) ? climate.summary : `${climate.name} — ${climate.summary}`;
}

/** The facts of an authored skirmish map, from its document. */
export function skirmishMapFacts(catalog: ContentCatalog, def: SkirmishMapDefinition): Fact[] {
  const d = def.map;
  const cells = [...d.terrain].filter((c) => c !== 'v').length;
  return [
    { label: 'Empires', value: String(d.players.length) },
    { label: 'Size', value: sizeFact(cells) },
    { label: 'Victory', value: d.victory.type === 'hold_relic' ? `Hold the shrine ${d.victory.days} days, or conquer` : 'Last empire standing' },
    { label: 'Climate', value: climateFact(catalog, d.biome) },
    { label: 'Treasury', value: d.startWealth === 'high' ? 'Twice the usual' : d.startWealth === 'low' ? 'Half the usual' : 'The usual' },
    { label: 'Map', value: d.revealMap ? 'Revealed from the start' : 'Hidden until explored' },
  ];
}

/** The same facts for an authored scenario (Twin Harbors), from its mission and map template. */
export function scenarioFacts(catalog: ContentCatalog, sk: SkirmishScenarioDefinition): Fact[] {
  const m = catalog.missions[sk.missionId];
  const t = m ? catalog.mapTemplates[m.mapTemplateId] : undefined;
  if (!m) return [];
  const others = m.rivals?.length ?? 0;
  const gold = m.player.wallet.gold ?? 0;
  return [
    { label: 'Empires', value: String(1 + others) },
    ...(t ? [{ label: 'Size', value: sizeFact(t.width * t.height) }] : []),
    { label: 'Victory', value: 'Last empire standing' },
    { label: 'Climate', value: climateFact(catalog, t?.biome) },
    { label: 'Treasury', value: gold === 10000 ? 'The usual' : `${gold.toLocaleString('en-US')} Gold` },
    { label: 'Map', value: 'Hidden until explored' },
  ];
}

/**
 * One detail panel for every skirmish choice (owner request 2026-10-07): a small
 * picture beside the tagline and summary, then the highlights and the facts as
 * sub-sections — the authored maps and Twin Harbors alike, no drawn layout.
 */
function ScenarioDetail({ title, picture, tagline, summary, highlights, facts, testId }: { title: string; picture: ReactNode; tagline?: string; summary: string; highlights: readonly string[]; facts: readonly Fact[]; testId: string }) {
  return (
    <Panel title={title} className="setup-detail fe-atlas__detail" bodyClassName="scroll" framed surface="parchment" label={title}>
      <div className="setup-detail__lead fe-atlas__lead" data-testid={testId}>
        <figure className="fe-atlas__painting">{picture}</figure>
        <div>
          {tagline ? <div className="tagline">{tagline}</div> : null}
          <p>{summary}</p>
        </div>
      </div>
      {highlights.length ? (
        <>
          <SectionTitle>Highlights</SectionTitle>
          <ul className="bullets">
            {highlights.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </>
      ) : null}
      <SectionTitle>The map</SectionTitle>
      <dl className="map-detail__facts">
        {facts.map((f) => (
          <div key={f.label} className="map-detail__fact">
            <dt>{f.label}</dt>
            <dd>{f.value}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

/** The selected map's painting fills the detail page's width (1.1.0 atlas; it is atmosphere, not a tactical plan). */
const DETAIL_PICTURE: CSSProperties = { width: '100%', height: '100%', flex: 'none' };

/** A scenario's list picture drawn like the skirmish maps' (plain painting, no frame); the procedural stand-in otherwise. */
function ScenarioCardPicture({ catalog, missionId }: { catalog: ContentCatalog; missionId: string }) {
  const url = resolveAsset(catalog.missions[missionId]?.thumbnailAssetId ?? '').url;
  const style: CSSProperties = { width: '100%', aspectRatio: '16 / 9', height: 'auto' };
  return url ? <img src={url} alt={`${catalog.missions[missionId]?.name ?? ''}`} style={{ objectFit: 'cover', display: 'block', ...style }} draggable={false} data-testid="map-art" /> : <MissionThumb catalog={catalog} missionId={missionId} style={style} />;
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
  const [campaignDifficulty, setCampaignDifficulty] = useState<string>(store.setup.campaignDifficultyId ?? DEFAULT_CAMPAIGN_DIFFICULTY);
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
      // A campaign is played with its own pantheon and patron: straight to the briefing of its
      // single opening chapter (content v2) or first mission (v1).
      const godId = defaultPatron(catalog, campaign.pantheonId, campaign);
      const opening = campaign.chapters?.find((ch) => ch.requiresAll.length === 0)?.missionId ?? campaign.missionIds[0] ?? null;
      store.setup = { ...store.setup, mode: 'campaign', campaignId: campaign.id, missionId: opening, pantheonId: campaign.pantheonId, godId, campaignDifficultyId: campaignDifficulty };
      store.startCampaign(campaign.id, godId, campaignDifficulty);
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
  const items = mode === 'campaign' ? campaigns.map((c) => c.id) : [...skirmishes.map((c) => c.id), ...maps.map((m) => `map:${m.id}`)];
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const keysFor = (i: number) => radioKeys(items, i, (id) => setSelected(id), itemRefs, mode === 'campaign' ? 1 : 2);
  const footerActions = (
    <>
          <Button onClick={() => store.back()} icon="back">
            Back
          </Button>
          {campaign ? (
            <Button variant="primary" size="large" disabled={!playable} disabledReason="This content is not available in this build" onClick={next} data-testid="setup-begin">
              {campaign.chapters?.length ? `Begin — Chapter ${campaign.chapters.find((ch) => ch.requiresAll.length === 0)?.chapter ?? 1} Briefing` : 'Begin — Mission Briefing'}
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
    </>
  );
  if (mode === 'campaign') {
    return (
      <FrontendShell backdrop="atlas" title="Campaign Chronicles" className="setup-screen" footer={footerActions}>
        <div className="setup-split fe-chronicles">
          <Panel title="Campaigns" className="setup-list fe-chronicles__list" bodyClassName="scroll" framed="compact">
            <div role="radiogroup" aria-label="Campaigns" className="fe-chronicles__items">
              {campaigns.map((c, i) => (
                <button
                  key={c.id}
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={selected === c.id}
                  tabIndex={selected === c.id ? 0 : -1}
                  onKeyDown={keysFor(i)}
                  className={`list-card fe-campaign-row ${selected === c.id ? 'is-selected' : ''}`}
                  onClick={() => setSelected(c.id)}
                  data-gui-theme={guiThemeFor(c.pantheonId)}
                  data-testid={`scenario-${c.id}`}
                >
                  <CampaignThumb catalog={catalog} campaignId={c.id} style={{ width: '5.6rem', aspectRatio: '16 / 9', height: 'auto' }} />
                  <span className="fe-campaign-row__text">
                    <span className="list-card__title">{c.name}</span>
                    <span className="list-card__meta">
                      {catalog.pantheons[c.pantheonId]?.name} · {countLabel(campaignRunCount(c))}
                    </span>
                    {c.status !== 'playable' ? <span className="list-card__meta dim">Not available yet</span> : null}
                  </span>
                </button>
              ))}
            </div>
          </Panel>
          {campaign ? <CampaignDetail key={campaign.id} c={campaign} difficultyId={campaignDifficulty} onDifficulty={setCampaignDifficulty} /> : null}
        </div>
      </FrontendShell>
    );
  }
  return (
    <FrontendShell backdrop="atlas" title="Skirmish Atlas" className="setup-screen" footer={footerActions}>
      <div className="setup-split fe-atlas">
        <Panel title="Maps" className="setup-list fe-atlas__list" bodyClassName="scroll" framed="compact">
          <div role="radiogroup" aria-label="Skirmish maps" className="fe-atlas__grid">
            {skirmishes.map((c, i) => (
              <button
                key={c.id}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                type="button"
                role="radio"
                aria-checked={selected === c.id}
                tabIndex={selected === c.id ? 0 : -1}
                onKeyDown={keysFor(i)}
                className={`list-card fe-map-card ${selected === c.id ? 'is-selected' : ''}`}
                onClick={() => setSelected(c.id)}
                data-testid={`scenario-${c.id}`}
              >
                <ScenarioCardPicture catalog={catalog} missionId={c.missionId} />
                <span className="list-card__title">{c.name}</span>
                <span className="list-card__meta">{`${scenarioFacts(catalog, c)[0]?.value ?? 2} empires · ${c.tagline ?? c.summary}`}</span>
                {c.status !== 'playable' ? <span className="list-card__meta dim">Not available yet</span> : null}
              </button>
            ))}
            {/* The authored maps follow the scenario in the same gallery, same cards (owner request 2026-10-07). */}
            {maps.map((m, k) => {
              const i = skirmishes.length + k;
              return (
                <button
                  key={m.id}
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={selected === `map:${m.id}`}
                  tabIndex={selected === `map:${m.id}` ? 0 : -1}
                  onKeyDown={keysFor(i)}
                  className={`list-card fe-map-card ${selected === `map:${m.id}` ? 'is-selected' : ''}`}
                  onClick={() => setSelected(`map:${m.id}`)}
                  data-testid={`skirmish-map-${m.id}`}
                >
                  <SkirmishMapThumb doc={m.map} assetId={m.thumbnailAssetId} style={{ width: '100%', aspectRatio: '16 / 9', height: 'auto' }} />
                  <span className="list-card__title">{m.name}</span>
                  <span className="list-card__meta">
                    {m.map.players.length} empires · {m.tagline}
                  </span>
                </button>
              );
            })}
          </div>
        </Panel>
        {map ? (
          <ScenarioDetail
            title={map.name}
            picture={
              <span className="portrait fe-atlas__frame" style={{ display: 'block', ...DETAIL_PICTURE }}>
                <SkirmishMapThumb doc={map.map} assetId={map.thumbnailAssetId} large style={{ width: '100%', height: '100%' }} />
              </span>
            }
            tagline={map.tagline}
            summary={map.summary}
            highlights={map.highlights}
            facts={skirmishMapFacts(catalog, map)}
            testId="skirmish-map-detail"
          />
        ) : null}
        {skirmish && skMission ? (
          <ScenarioDetail
            title={skirmish.name}
            picture={<ScenarioCardPicture catalog={catalog} missionId={skMission.id} />}
            tagline={skirmish.tagline}
            summary={skirmish.summary}
            highlights={skirmish.highlights ?? []}
            facts={scenarioFacts(catalog, skirmish)}
            testId={`scenario-detail-${skirmish.id}`}
          />
        ) : null}
      </div>
    </FrontendShell>
  );
}

// ---------------------------------------------------------------------------
// S04 Pantheon selection
// ---------------------------------------------------------------------------

/**
 * The chosen pantheon (concept 09): its patron god, its parchment summary and
 * signature, and the seven creature families of its roster — all from the
 * content (the patron is the one the game would start with, never a fixed one).
 */
function PantheonStage({ p, patronId }: { p: PantheonDefinition; patronId: string | null }) {
  const store = useStore();
  const catalog = store.catalog;
  const patron = patronId ? catalog.gods[patronId] : undefined;
  return (
    <section className="pantheon-stage" aria-label={`${p.name} pantheon`} style={{ ['--faction' as string]: p.theme.accent }} data-gui-theme={guiThemeFor(p.id)} data-testid="pantheon-stage">
      <figure className="pantheon-stage__patron gui-plate" data-testid="pantheon-patron">
        {patron ? (
          <>
            <GodPortrait catalog={catalog} godId={patron.id} size="100%" locked={patron.implementationStatus !== 'implemented'} />
            <figcaption>
              <span className="pantheon-stage__patron-label">Patron</span>
              <span className="pantheon-stage__patron-name">{patron.name}</span>
              <span className="pantheon-stage__patron-domain">{patron.domain}</span>
            </figcaption>
          </>
        ) : (
          <figcaption className="dim small">No patron god is available.</figcaption>
        )}
      </figure>
      <div className="pantheon-stage__info panel--parchment gui-surface--parchment">
        <div className="pantheon-stage__lead">
          <Emblem catalog={catalog} pantheonId={p.id} size="4rem" />
          <div>
            <h2 className="pantheon-stage__name">{p.name}</h2>
            <div className="pantheon-stage__epithet">{p.epithet}</div>
          </div>
        </div>
        <p className="pantheon-stage__summary">{p.summary}</p>
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
        <SectionTitle>Gods</SectionTitle>
        <div className="row gap wrap">
          {p.godIds.map((g) => {
            const god = catalog.gods[g];
            return (
              <span key={g} className="god-pill" title={god?.domain}>
                <GodPortrait catalog={catalog} godId={g} size="1.8rem" locked={god?.implementationStatus !== 'implemented'} /> {god?.name}
              </span>
            );
          })}
        </div>
        {p.playability !== 'playable' ? (
          <p className="note">
            Preparation pantheon: names, tiers and god list are present for architecture and the encyclopedia. Stats, towns and abilities are not designed yet, so it cannot be played.
          </p>
        ) : null}
      </div>
      <div className="pantheon-roster" aria-label="Seven creature families">
        <div className="pantheon-roster__title">Creatures</div>
        <ol className="pantheon-roster__list">
          {p.roster.map((r) => {
            const fam = catalog.families[r.familyId];
            if (!fam) return null;
            const base = catalog.creatures[fam.baseCreatureId];
            const up = fam.upgradedCreatureId ? catalog.creatures[fam.upgradedCreatureId] : undefined;
            return (
              <li key={r.tier} className="pantheon-roster__tile roster-cell" data-testid={`roster-${r.tier}`}>
                <span className="roster-cell__tier">T{r.tier}</span>
                <CreaturePortrait catalog={catalog} creatureId={fam.baseCreatureId} size="5.2rem" />
                <span className="pantheon-roster__names roster-cell__names">
                  <span className="pantheon-roster__base">{base?.name}</span>
                  <span className="pantheon-roster__up">↑ {up?.name}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
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
  // Arrow keys move between the six banners (one radio group, one tab stop).
  const bannerRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const onBannerKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const order = catalog.pantheonOrder;
    const j = (i + step + order.length) % order.length;
    setSelected(order[j]!);
    bannerRefs.current[j]?.focus();
  };
  const patronId = p ? defaultPatron(catalog, p.id, campaign) : null;
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
    <div className="setup-screen fe-shell fe-shell--atlas fe-pantheon-screen" style={backdropStyle('atlas')}>
      <ScreenHeader title="Choose a Pantheon" />
      <div className="pantheon-banners" role="radiogroup" aria-label="Pantheons">
        {catalog.pantheonOrder.map((id, i) => {
          const pp = catalog.pantheons[id];
          if (!pp) return null;
          return (
            <FactionBanner
              key={id}
              theme={guiThemeFor(id)}
              name={pp.name}
              caption={pp.epithet}
              note={pp.playability !== 'playable' ? 'Not playable yet' : undefined}
              selected={selected === id}
              onSelect={() => setSelected(id)}
              tabIndex={selected === id ? 0 : -1}
              onKeyDown={(e) => onBannerKey(e, i)}
              buttonRef={(el) => {
                bannerRefs.current[i] = el;
              }}
              nameClassName="pantheon-card__name"
              captionClassName="pantheon-card__epithet"
              testId={`pantheon-${id}`}
            />
          );
        })}
      </div>
      {p ? <PantheonStage p={p} patronId={patronId} /> : null}
      {rivalOptions.length || isSkirmish ? (
        <div className="setup-drawer gui-plate" data-testid="setup-drawer">
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
        </div>
      ) : null}
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
    store.startCampaign(campaign.id, godId, setup.campaignDifficultyId ?? DEFAULT_CAMPAIGN_DIFFICULTY);
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
