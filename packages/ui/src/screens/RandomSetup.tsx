/**
 * S19 Random Map setup (proposed): map type (Continental, Highlands, Lake Isle,
 * Wild Forest, Marshlands, Crossroads, Archipelago, Twin Continents (two empires),
 * Central Valley — after Age of Mythology's map scripts
 * and Heroes 3's zone templates), size up to Huge (square maps), two to six
 * seats (each AI or human — several humans play hot-seat on this computer;
 * four or more need a large or huge map), victory condition, guard strength,
 * treasure, starting wealth, roads, wandering monsters, a revealed-map option
 * and difficulty — all on one full-width panel, with Start in its own bar.
 *
 * There is no seed field (owner request 2026-10-04): each Start draws a new
 * seed, so changing any setting (or starting again) gives a new map; the
 * generator itself stays deterministic for a seed. The game opens straight on
 * the adventure map (no briefing).
 *
 * 1.1.0 (pre-game handoff, concept 05): three chapters over ONE draft — Land
 * (the nine map types as paintings, size, guards, treasure, roads and map
 * options), Empires (count, seats, difficulty, AI temperaments) and Rules
 * (victory, starting wealth, turn order). Switching chapters never resets a
 * choice; Create World is available from every chapter with the reason when it
 * cannot start. The paintings are archetypes, not previews of the new map.
 *
 * Campaign expansion (2026-10-15): an optional "New neutral creatures" pool (off
 * by default) — hiring sites of the six new neutrals, only where their habitat
 * fits the map (`app/editorV2Sites.ts` passes content's table to the generator).
 *
 * Naval templates (2026-10-17, assets-source/art/naval-random-v1/): The Shattered Crown and The
 * Serpent Straits follow the nine land layouts, tagged "Ships required". Their seat
 * counts and the Huge size are the only ones offered (others disabled with the
 * reason; the player count is never changed for the player), two-way portals are
 * locked off ("Ships connect these islands."), the type needs hero ships to be ready
 * in this build, and Create World shows the type's loading painting while the
 * islands are generated.
 */
import { useEffect, useRef, useState } from 'react';
import {
  createRandomSkirmish,
  skirmishSizeAllows,
  skirmishTypeAllows,
  RANDOM_MAP_TYPES,
  navalSettingsProblem,
  navalTemplatesReadiness,
  SKIRMISH_MAX_EMPIRES,
  SKIRMISH_SIZE_LABEL,
  SKIRMISH_START_WALLET,
  WEALTH_PERCENT,
  type GuardStrength,
  type RandomSkirmish,
  type RoadDensity,
  type SkirmishMapSize,
  type RandomMapType,
  type SkirmishVictory,
  type StartWealth,
  type TreasureLevel,
  type UnownedTowns,
  SKIRMISH_NEUTRAL_SPECIES,
  neutralSpeciesForBiome,
  skirmishMapBiome,
} from '@pr/session';
import { NAVAL_PORTAL_LOCK_REASON, RESOURCE_KEYS, RESOURCE_LABELS } from '@pr/rules';
import { useStore } from '../app/context';
import { Button, Panel, SectionTitle, Segmented, Toggle } from '../components/kit';
import { FrontendShell, IllustratedChoice, radioKeys } from '../components/frontend';
import { frontendArt, navalRandomArt } from '../assets/manifest';
import '../styles/navalRandom.css';
import { Icon } from '../assets/icons';
import '../styles/polish.css';
import { DifficultyPicker } from './Setup';
import { SeatRow, patchSeat, patronsOf, type SeatDraft } from '../components/seats';
import { NEUTRAL_SITE_TABLE } from '../app/editorV2Sites';

const SEAT_COLORS = ['#3b73d9', '#c0392b', '#2e9e5b', '#c98a1b', '#8a4fc2', '#1f9fa6'];
const MAX_SEATS = SKIRMISH_MAX_EMPIRES;
/** What the starting-wealth choice means, from the generator's own numbers. */
function wealthText(w: StartWealth): string {
  const pct = WEALTH_PERCENT[w];
  const parts = RESOURCE_KEYS.filter((k) => (SKIRMISH_START_WALLET[k] ?? 0) > 0).map((k) => `${Math.floor(((SKIRMISH_START_WALLET[k] ?? 0) * pct) / 100).toLocaleString('en-US')} ${RESOURCE_LABELS[k]}`);
  const lead = w === 'low' ? 'Half the usual treasury' : w === 'high' ? 'Twice the usual treasury' : 'The usual treasury';
  const tail = w === 'low' ? ' A slower, leaner opening.' : w === 'high' ? ' A fast opening: more buildings and troops in the first week.' : '';
  return `${lead} for every empire: ${parts.join(', ')}.${tail}`;
}

function newSeed(): number {
  return Math.floor(Math.random() * 900000) + 100000;
}

export function RandomSetupScreen() {
  const store = useStore();
  const catalog = store.catalog;
  const playable = catalog.pantheonOrder.filter((id) => catalog.pantheons[id]?.playability === 'playable');
  const [size, setSize] = useState<SkirmishMapSize>('medium');
  const [count, setCount] = useState(2);
  const [victoryType, setVictoryType] = useState<'elimination' | 'hold_relic'>('elimination');
  const [relicDays, setRelicDays] = useState(7);
  const [monsters, setMonsters] = useState<'none' | 'few' | 'many'>('few');
  const [mapType, setMapType] = useState<RandomMapType>('continental');
  const [guards, setGuards] = useState<GuardStrength>('normal');
  const [treasure, setTreasure] = useState<TreasureLevel>('normal');
  const [startWealth, setStartWealth] = useState<StartWealth>('normal');
  const [roads, setRoads] = useState<RoadDensity>('full');
  const [revealMap, setRevealMap] = useState(false);
  const [portals, setPortals] = useState(true);
  const [climateRules, setClimateRules] = useState(true);
  const [unownedTowns, setUnownedTowns] = useState<UnownedTowns>('none');
  // New neutral creatures (2026-10-15): off by default, so a seed gives exactly the map it gave before.
  const [neutralCreatures, setNeutralCreatures] = useState(false);
  const [aiTemperaments, setAiTemperaments] = useState(true);
  const [rotating, setRotating] = useState(true);
  const [difficulty, setDifficulty] = useState('normal');
  const [chapter, setChapter] = useState<'land' | 'empires' | 'rules'>('land');
  const [busy, setBusy] = useState(false);
  // Naval templates: the type's loading painting while the islands are generated.
  const [loadingType, setLoadingType] = useState<RandomMapType | null>(null);
  /** The loading painting has been drawn (or could not load): the game may open. */
  const loadingArtShown = useRef(false);
  const typeRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [seats, setSeats] = useState<SeatDraft[]>(() =>
    Array.from({ length: MAX_SEATS }, (_, i) => i).map((i) => {
      const pantheonId = playable[i % Math.max(1, playable.length)] ?? 'greek';
      return { pantheonId, controller: i === 0 ? 'human' : 'ai', name: i === 0 ? 'Player 1' : `Player ${i + 1}`, godId: patronsOf(catalog, pantheonId)[0] ?? null };
    }),
  );
  const active = seats.slice(0, count);
  const humans = active.filter((s) => s.controller === 'human').length;
  const anyAi = active.some((s) => s.controller === 'ai');
  const sizeOk = skirmishSizeAllows(size, count);
  const typeInfo = RANDOM_MAP_TYPES.find((x) => x.id === mapType) ?? RANDOM_MAP_TYPES[0]!;
  const naval = typeInfo.naval ?? null;
  const navalReady = navalTemplatesReadiness(catalog);
  const navalProblem = naval ? (navalReady.ready ? navalSettingsProblem(naval.id, size, count, unownedTowns) : navalReady.reason) : null;

  const victory: SkirmishVictory = victoryType === 'hold_relic' ? { type: 'hold_relic', days: relicDays } : { type: 'elimination' };
  const turnOrder = count >= 3 ? (rotating ? ('rotating' as const) : ('fixed' as const)) : undefined;
  const options = {
    features: { expandedContent: true, mythicLibraryV2: true, weeklyEvents: true, interventions: true, heroSpecialties: true, neutralReactions: true, climateRules, aiTemperaments, cityDedicationsV1: true, scoutingIntelV1: true, targetableCatapultV1: true, recruitmentCaravansV1: true, navalMovementV1: true, seaEncountersV1: true },
    size,
    seats: active.map((s) => ({ pantheonId: s.pantheonId, controller: s.controller })),
    victory,
    monsters,
    mapType,
    guards,
    treasure,
    startWealth,
    roads,
    revealMap,
    // Naval templates: portals are locked off (ships connect the islands).
    portals: naval ? false : portals,
    climateRules,
    aiTemperaments,
    ...(turnOrder ? { turnOrder } : {}),
    ...(unownedTowns !== 'none' ? { unownedTowns } : {}),
    ...(neutralCreatures ? { neutralSites: NEUTRAL_SITE_TABLE } : {}),
  };
  const optionsKey = JSON.stringify(options);
  const neutralNames = neutralSpeciesForBiome(catalog, NEUTRAL_SITE_TABLE, skirmishMapBiome(mapType)).map((id) => catalog.creatures[id]!.pluralName);
  const neutralCount = SKIRMISH_NEUTRAL_SPECIES[size];
  // A generator error is shown until a setting changes.
  const [failure, setFailure] = useState<{ key: string; text: string } | null>(null);
  const error = failure && failure.key === optionsKey ? failure.text : null;

  const setSeat = (i: number, patch: Partial<SeatDraft>) => setSeats((list) => list.map((s, k) => (k === i ? patchSeat(catalog, s, patch) : s)));

  const reason = navalProblem
    ? navalProblem
    : !sizeOk
    ? 'Four or more empires need a large or huge map'
    : humans === 0
      ? 'At least one seat must be played by a person'
      : active.some((s) => s.controller === 'human' && !s.godId)
        ? 'Every human seat needs a patron god'
        : '';

  const start = () => {
    if (reason || busy) return;
    if (naval) {
      // Show the type's loading painting while the islands are generated (painted first, then the work).
      setBusy(true);
      loadingArtShown.current = false;
      setLoadingType(naval.id);
      const began = Date.now();
      window.setTimeout(() => {
        let ok = false;
        try {
          ok = startNow(() => Date.now() - began);
        } finally {
          if (!ok) {
            setBusy(false);
            setLoadingType(null);
          }
        }
      }, 60);
      return;
    }
    setBusy(true);
    try {
      startNow();
    } finally {
      setBusy(false);
    }
  };
  const startNow = (elapsed?: () => number): boolean => {
    // A fresh seed every time (a rare seed the generator cannot lay out is replaced by another).
    let generated: RandomSkirmish | null = null;
    let lastError = '';
    for (let attempt = 0; attempt < 6 && !generated; attempt++) {
      try {
        generated = createRandomSkirmish(catalog, { ...options, seed: newSeed() });
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
      }
    }
    if (!generated) {
      setFailure({ key: optionsKey, text: `The map could not be generated: ${lastError}` });
      return false;
    }
    const ids = [generated.mission.player.playerId, ...(generated.mission.rivals ?? []).map((r) => r.playerId)];
    const playerNames: Record<string, string> = {};
    const patronGodIds: Record<string, string> = {};
    active.forEach((s, i) => {
      const id = ids[i]!;
      if (s.controller === 'human') playerNames[id] = s.name.trim() || `Player ${i + 1}`;
      if (i > 0 && s.controller === 'human' && s.godId) patronGodIds[id] = s.godId;
    });
    const go = () => store.startGenerated(generated!, active[0]!.controller === 'human' ? active[0]!.godId : null, { difficultyId: anyAi ? difficulty : 'normal', playerNames, patronGodIds });
    // The loading painting stays until it is shown and at least a moment, so it can be seen and read
    // (never a gameplay wait; at most four seconds when the picture is slow to load).
    if (!elapsed) {
      go();
      return true;
    }
    const tick = () => {
      const t = elapsed();
      if ((loadingArtShown.current && t >= 1500) || t >= 4000) go();
      else window.setTimeout(tick, 100);
    };
    tick();
    return true;
  };

  /** Choose a map type: a naval template brings its own size and default victory (the player count is never changed). */
  const chooseType = (id: RandomMapType) => {
    setMapType(id);
    const info = RANDOM_MAP_TYPES.find((t) => t.id === id)?.naval;
    if (!info) return;
    if (!info.sizes.includes(size)) setSize(info.sizes[info.sizes.length - 1]!);
    if (info.defaultVictory.type === 'hold_relic') {
      setVictoryType('hold_relic');
      setRelicDays(info.defaultVictory.days);
    } else setVictoryType('elimination');
  };
  const typeReason = (t: (typeof RANDOM_MAP_TYPES)[number]): string | null => {
    if (t.naval) {
      if (!navalReady.ready) return navalReady.reason;
      return t.naval.seats.includes(count) ? null : `For ${t.naval.seats.join(', ').replace(/, (\d+)$/, ' or $1')} empires`;
    }
    return skirmishTypeAllows(t.id, count) ? null : `For ${t.maxEmpires} empires`;
  };
  const countOption = (id: '2' | '3' | '4' | '5' | '6') => {
    const n = Number(id);
    const off = naval && !naval.seats.includes(n) ? naval.seatReason : null;
    return { id, label: id, disabled: !!off, title: off ?? undefined };
  };
  const loadingArt = loadingType ? navalRandomArt(RANDOM_MAP_TYPES.find((t) => t.id === loadingType)?.naval?.loadingArtId ?? '') : null;
  // A naval type's loading painting is fetched as soon as the type is chosen, so Create World shows it at once.
  const preloadUrl = naval ? navalRandomArt(naval.loadingArtId)?.url : undefined;
  useEffect(() => {
    if (!preloadUrl) return;
    const img = new Image();
    img.decoding = 'async';
    img.src = preloadUrl;
  }, [preloadUrl]);
  const typeArt = frontendArt(`frontend.random.${typeInfo.id}`);
  const chapters = [
    { id: 'land' as const, label: 'Land' },
    { id: 'empires' as const, label: 'Empires' },
    { id: 'rules' as const, label: 'Rules' },
  ];
  return (
    <FrontendShell
      backdrop="atlas"
      title="Random Map"
      className="setup-screen fe-random-screen"
      footer={
        <>
          <Button onClick={() => store.back()} icon="back">
            Back
          </Button>
          <div className="fe-random__summary small" aria-live="polite">
            {typeInfo.label} · {SKIRMISH_SIZE_LABEL[size]} · {count} empires · {victoryType === 'hold_relic' ? `hold the relic ${relicDays} days` : 'last empire standing'}
          </div>
          {reason || error ? (
            <div className="random-setup__reason" role="status" data-testid="random-start-reason">
              {reason || error}
            </div>
          ) : null}
          <Button variant="primary" size="large" icon="play" className="random-setup__start" disabled={!!reason || busy} disabledReason={reason} onClick={start} data-testid="random-start">
            {busy ? 'Creating…' : 'Create World'}
          </Button>
        </>
      }
    >
      <div className="random-setup fe-random">
        <div className="tabs fe-random__chapters" role="tablist" aria-label="Random map chapters">
          {chapters.map((c) => (
            <button key={c.id} type="button" role="tab" className="tab" aria-selected={chapter === c.id} aria-controls={`random-chapter-${c.id}-panel`} onClick={() => setChapter(c.id)} data-testid={`random-chapter-${c.id}`}>
              {c.label}
            </button>
          ))}
        </div>
        <Panel className="random-setup__panel fe-random__panel" bodyClassName="random-setup__body" framed>
          <div className="random-setup__scroll scroll" id={`random-chapter-${chapter}-panel`} role="tabpanel" aria-label={chapters.find((c) => c.id === chapter)?.label}>
            {chapter === 'land' ? (
              <>
                <div className="fe-random__land">
                  <div className="setting-block">
                    <div className="setting-block__label">Map type</div>
                    <div className="map-type-grid fe-random__types" role="radiogroup" aria-label="Map type" data-testid="random-type">
                      {RANDOM_MAP_TYPES.map((t, i) => {
                        const why = typeReason(t);
                        return (
                          <IllustratedChoice
                            key={t.id}
                            buttonRef={(el) => {
                              typeRefs.current[i] = el;
                            }}
                            artId={`frontend.random.${t.id}`}
                            name={t.label}
                            selected={mapType === t.id}
                            tabIndex={mapType === t.id ? 0 : -1}
                            onKeyDown={radioKeys(RANDOM_MAP_TYPES, i, (x) => !typeReason(x) && chooseType(x.id), typeRefs, 3)}
                            onSelect={() => chooseType(t.id)}
                            disabledReason={why}
                            title={t.summary}
                            className={`map-type fe-choice--type ${mapType === t.id ? 'is-selected' : ''} ${t.naval ? 'fe-choice--naval' : ''}`}
                            testId={`random-type-${t.id}`}
                          >
                            {t.naval ? (
                              <span className="fe-choice__tag" data-testid={`random-type-${t.id}-ships`}>
                                Ships required
                              </span>
                            ) : null}
                          </IllustratedChoice>
                        );
                      })}
                    </div>
                  </div>
                  <section className="fe-random__type gui-surface--parchment" aria-label={`${typeInfo.label} map type`} data-testid="random-type-detail">
                    {typeArt ? <img className="fe-random__type-art" src={typeArt.url} alt={typeArt.alt} draggable={false} /> : null}
                    <div className="fe-random__type-caption">Illustrative landscape — every map is generated anew</div>
                    <h2 className="fe-random__type-name">{typeInfo.label}</h2>
                    <p className="fe-random__type-text">{typeInfo.summary}</p>
                    {naval ? (
                      <div className="naval-type" data-testid="random-naval-detail">
                        <ul className="naval-type__tags" aria-label="About this map type">
                          <li className="naval-type__tag naval-type__tag--ships">Ships required</li>
                          <li className="naval-type__tag">{naval.sizes.map((x) => SKIRMISH_SIZE_LABEL[x]).join(', ')} only</li>
                          <li className="naval-type__tag">{naval.seats.length === 1 ? `${naval.seats[0]} empires` : `${naval.seats.join(', ').replace(/, (\d+)$/, ' or $1')} empires`}</li>
                          <li className="naval-type__tag">{Math.round(naval.waterBand[0] * 100)}–{Math.round(naval.waterBand[1] * 100)} % water</li>
                        </ul>
                        <p className="naval-type__text" data-testid="random-naval-description">{naval.description}</p>
                        <p className={`naval-type__ready small ${navalReady.ready ? 'is-ready' : 'is-missing'}`} data-testid="random-naval-ready">
                          {navalReady.ready ? navalReady.detail : navalReady.reason}
                        </p>
                      </div>
                    ) : null}
                          <div className="setting-block">
                            <div className="setting-block__label">Size</div>
                            <Segmented
                              label="Map size"
                              value={size}
                              options={(['small', 'medium', 'large', 'huge'] as const).map((id) => {
                                const navalOff = naval && !naval.sizes.includes(id) ? naval.sizeReason : null;
                                const off = navalOff ?? (!skirmishSizeAllows(id, count) ? 'Four or more empires need a large or huge map' : null);
                                return { id, label: SKIRMISH_SIZE_LABEL[id], disabled: !!off, title: off ?? undefined };
                              })}
                              onChange={setSize}
                              testId="random-size"
                            />
                          </div>
                          <div className="setting-block">
                            <div className="setting-block__label">Empires</div>
                            <Segmented
                              label="Number of empires"
                              value={String(count) as '2' | '3' | '4' | '5' | '6'}
                              options={(['2', '3', '4', '5', '6'] as const).map(countOption)}
                              onChange={(v) => {
                                const n = Number(v);
                                setCount(n);
                                if (!skirmishSizeAllows(size, n)) setSize('large');
                                if (!skirmishTypeAllows(mapType, n)) setMapType('continental');
                              }}
                              testId="random-count"
                            />
                          </div>
                  </section>
                </div>
                <SectionTitle>Shape your world</SectionTitle>
                <div className="random-setup__grid world-options">
              <div className="setting-block">
                <div className="setting-block__label"><span className="world-options__icon"><Icon name="bestiary" /></span>Wandering monsters</div>
                <Segmented
                  label="Wandering monsters"
                  value={monsters}
                  options={[
                    { id: 'none', label: 'None' },
                    { id: 'few', label: 'Few' },
                    { id: 'many', label: 'Many' },
                  ]}
                  onChange={setMonsters}
                  testId="random-monsters"
                />
                <p className="small faint setting-block__details">{monsters === 'none' ? 'No roaming armies. Site guards remain.' : monsters === 'few' ? 'Occasional roaming armies challenge your explorers.' : 'Frequent roaming armies make the wilderness dangerous.'}</p>
              </div>
              <div className="setting-block">
                <div className="setting-block__label"><span className="world-options__icon"><Icon name="defense" /></span>Guards</div>
                <Segmented
                  label="Guard strength"
                  value={guards}
                  options={[
                    { id: 'weak', label: 'Weak' },
                    { id: 'normal', label: 'Normal' },
                    { id: 'strong', label: 'Strong' },
                  ]}
                  onChange={setGuards}
                  testId="random-guards"
                />
                <p className="small faint setting-block__details">Armies guarding mines, camps, treasures, passes and the center ({guards === 'weak' ? '×0.6' : guards === 'strong' ? '×1.6' : '×1'}); wandering monsters too.</p>
              </div>
              <div className="setting-block">
                <div className="setting-block__label"><span className="world-options__icon"><Icon name="gold" /></span>Treasure</div>
                <Segmented
                  label="Treasure"
                  value={treasure}
                  options={[
                    { id: 'scarce', label: 'Scarce' },
                    { id: 'normal', label: 'Normal' },
                    { id: 'rich', label: 'Rich' },
                  ]}
                  onChange={setTreasure}
                  testId="random-treasure"
                />
                <p className="small faint setting-block__details">{treasure === 'scarce' ? 'Fewer sites, smaller rewards (×0.6).' : treasure === 'rich' ? 'A small gold mine at home, a sealed vault with a major artifact, a second crystal deposit, a relic at the center; rewards ×1.5.' : 'Mines, camps, one ruin with a minor artifact and a wayside shrine per empire.'}</p>
              </div>
              <div className="setting-block">
                <div className="setting-block__label"><span className="world-options__icon"><Icon name="movement" /></span>Roads</div>
                <Segmented
                  label="Roads"
                  value={roads}
                  options={[
                    { id: 'full', label: 'Full' },
                    { id: 'sparse', label: 'Sparse' },
                  ]}
                  onChange={setRoads}
                  testId="random-roads"
                />
                <p className="small faint setting-block__details">{roads === 'full' ? 'Roads from every town to its mines, camps and the contested center.' : 'Roads only to the sawmill and quarry; everything else across country.'}</p>
              </div>
              <div className="setting-block">
                <div className="setting-block__label"><span className="world-options__icon"><Icon name="map" /></span>Map options</div>
                <div className="row gap">
                  <Toggle checked={revealMap} onChange={setRevealMap} label="Revealed map" />
                  <span className="small">Revealed map — see terrain and sites from the start. Heroes stay hidden.</span>
                </div>
                {naval ? (
                  <div className="row gap setting-block__details naval-portal-lock" data-testid="random-portals-lock">
                    <Toggle checked={false} onChange={() => undefined} label="Two-way portals (locked)" disabled />
                    <span className="small">
                      Two-way portals are off on this map: <strong>{NAVAL_PORTAL_LOCK_REASON}</strong>
                    </span>
                  </div>
                ) : (
                  <div className="row gap setting-block__details">
                    <Toggle checked={portals} onChange={setPortals} label="Two-way portals" />
                    <span className="small">Two-way portals — shortcuts between empires, open to both sides.</span>
                  </div>
                )}
                <div className="row gap setting-block__details">
                  <Toggle checked={climateRules} onChange={setClimateRules} label="Climate rules" />
                  <span className="small">Weather in battle — fog limits shots, sand slows troops, and storms hinder flyers. Applies to both sides.</span>
                </div>
              </div>
              <div className="setting-block">
                <div className="setting-block__label"><span className="world-options__icon"><Icon name="town" /></span>Unowned towns</div>
                <Segmented
                  label="Unowned towns"
                  value={unownedTowns}
                  options={(
                    [
                      { id: 'none', label: 'None' },
                      { id: 'own', label: 'Same pantheon' },
                      { id: 'other', label: 'Other pantheon' },
                      { id: 'both', label: 'Both' },
                    ] as const
                  ).map((o) => {
                    const off = naval ? navalSettingsProblem(naval.id, naval.sizes[0]!, naval.seats.includes(count) ? count : naval.seats[0]!, o.id) : null;
                    return { ...o, disabled: !!off, title: off ?? undefined };
                  })}
                  onChange={setUnownedTowns}
                  testId="random-unowned"
                />
                <p className="small faint setting-block__details" data-testid="random-unowned-text">
                  {unownedTowns === 'none'
                    ? 'Every town on the map starts with an empire.'
                    : `${unownedTowns === 'both' ? 'Two towns' : 'A town'} in each empire’s ${naval ? 'remote islands' : 'outer lands'} start${unownedTowns === 'both' ? '' : 's'} without a lord or a hero, held by ${unownedTowns === 'both' ? 'their' : 'its'} own militia — ${unownedTowns === 'own' ? 'of the empire’s own pantheon' : unownedTowns === 'other' ? 'of another pantheon' : 'one of the empire’s own pantheon, one of another'}. Take ${unownedTowns === 'both' ? 'them' : 'it'} to build and recruit there.`}
                </p>
              </div>
              <div className="setting-block" data-testid="random-neutrals">
                <div className="setting-block__label"><span className="world-options__icon"><Icon name="recruit" /></span>Neutral creatures</div>
                <div className="row gap editor-v2-random">
                  <Toggle checked={neutralCreatures} onChange={setNeutralCreatures} label="New neutral creatures" />
                  <span className="small" data-testid="random-neutrals-text">
                    Recruit neutral creatures — camps open to every pantheon: {neutralCount === 1 ? 'one kind' : 'two kinds'} on a {SKIRMISH_SIZE_LABEL[size].toLowerCase()} map, a site in each empire’s lands.{' '}
                    {neutralNames.length ? `${typeInfo.label}: ${neutralNames.length > 1 ? `${neutralNames.slice(0, -1).join(', ')} or ${neutralNames[neutralNames.length - 1]}` : neutralNames[0]}.` : `None lives in ${typeInfo.label} lands.`}
                  </span>
                </div>

              </div>
                </div>
              </>
            ) : null}
            {chapter === 'empires' ? (
              <>
                <div className="random-setup__grid">
              <div className="setting-block">
                <div className="setting-block__label">Empires</div>
                <Segmented
                  label="Number of empires"
                  value={String(count) as '2' | '3' | '4' | '5' | '6'}
                  options={(['2', '3', '4', '5', '6'] as const).map(countOption)}
                  onChange={(v) => {
                    const n = Number(v);
                    setCount(n);
                    if (!skirmishSizeAllows(size, n)) setSize('large');
                    if (!skirmishTypeAllows(mapType, n)) setMapType('continental');
                  }}
                  testId="random-count"
                />
              </div>
              {anyAi ? <DifficultyPicker catalog={catalog} value={difficulty} onChange={setDifficulty} /> : null}
              {anyAi ? (
                <div className="setting-block">
                  <div className="setting-block__label">AI rivals</div>
                  <div className="row gap">
                    <Toggle checked={aiTemperaments} onChange={setAiTemperaments} label="Pantheon temperaments" />
                    <span className="small">Pantheon temperaments — each AI empire plays in its pantheon’s way: Norse raid, Egyptians build, Celts study magic. Only the AI’s choices change, never a rule.</span>
                  </div>
                </div>
              ) : null}
                </div>
                <SectionTitle>Seats</SectionTitle>
            <div className="random-setup__seats">
              {active.map((s, i) => (
                <SeatRow key={i} catalog={catalog} index={i} seat={s} color={SEAT_COLORS[i]!} pantheons={playable} temperaments={aiTemperaments} onChange={(patch) => setSeat(i, patch)} />
              ))}
            </div>
            {humans > 1 ? <p className="note small">Hot-seat: {humans} players share this computer and take turns. The map is hidden at every hand-over.</p> : null}
              </>
            ) : null}
            {chapter === 'rules' ? (
              <div className="random-setup__grid">
              <div className="setting-block">
                <div className="setting-block__label">Victory</div>
                <Segmented
                  label="Victory condition"
                  value={victoryType}
                  options={[
                    { id: 'elimination', label: 'Last empire standing' },
                    { id: 'hold_relic', label: 'Hold the relic' },
                  ]}
                  onChange={setVictoryType}
                  testId="random-victory"
                />
                {victoryType === 'hold_relic' ? (
                  <div className="row gap setting-block__details">
                    <span className="small dim">Days to hold:</span>
                    <Segmented label="Days to hold the relic" value={String(relicDays) as '5' | '7' | '10'} options={(['5', '7', '10'] as const).map((id) => ({ id, label: id }))} onChange={(v) => setRelicDays(Number(v))} testId="random-relic-days" />
                  </div>
                ) : null}
                <p className="small dim setting-block__details">
                  {victoryType === 'hold_relic' ? `Own the central shrine at ${relicDays} dawns in a row — or defeat every rival.` : 'Defeat every rival hero and take every rival town.'}
                </p>
              </div>
              <div className="setting-block">
                <div className="setting-block__label">Starting wealth</div>
                <Segmented
                  label="Starting wealth"
                  value={startWealth}
                  options={[
                    { id: 'low', label: 'Low' },
                    { id: 'normal', label: 'Normal' },
                    { id: 'high', label: 'High' },
                  ]}
                  onChange={setStartWealth}
                  testId="random-wealth"
                />
                <p className="small faint setting-block__details" data-testid="random-wealth-text">
                  {wealthText(startWealth)}
                </p>
              </div>
              {count >= 3 ? (
                <div className="setting-block">
                  <div className="setting-block__label">Turn order</div>
                  <div className="row gap">
                    <Toggle checked={rotating} onChange={setRotating} label="Rotating turn order" />
                    <span className="small">Rotating: the empire that moves first each day moves last the next day, so no seat always opens the day.</span>
                  </div>
                </div>
              ) : null}
              </div>
            ) : null}
          </div>
        </Panel>
      </div>
      {loadingType ? (
        <div className="naval-loading" role="status" aria-live="polite" data-testid="random-naval-loading">
          {loadingArt ? <img className="naval-loading__art" src={loadingArt.url} alt="" draggable={false} decoding="async" onLoad={() => (loadingArtShown.current = true)} onError={() => (loadingArtShown.current = true)} /> : null}
          <div className="naval-loading__shade" aria-hidden="true" />
          <div className="naval-loading__text">
            <div className="naval-loading__kicker">Random map · Ships required</div>
            <h2 className="naval-loading__title">{RANDOM_MAP_TYPES.find((t) => t.id === loadingType)?.label}</h2>
            <p className="naval-loading__summary">{RANDOM_MAP_TYPES.find((t) => t.id === loadingType)?.naval?.description}</p>
            <p className="naval-loading__status">Charting the islands…</p>
          </div>
        </div>
      ) : null}
    </FrontendShell>
  );
}
