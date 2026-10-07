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
 */
import { useState } from 'react';
import {
  createRandomSkirmish,
  skirmishSizeAllows,
  skirmishTypeAllows,
  SKIRMISH_MAP_TYPES,
  SKIRMISH_MAX_EMPIRES,
  SKIRMISH_SIZE_LABEL,
  SKIRMISH_START_WALLET,
  WEALTH_PERCENT,
  type GuardStrength,
  type RandomSkirmish,
  type RoadDensity,
  type SkirmishMapSize,
  type SkirmishMapType,
  type SkirmishVictory,
  type StartWealth,
  type TreasureLevel,
  type UnownedTowns,
} from '@pr/session';
import { RESOURCE_KEYS, RESOURCE_LABELS } from '@pr/rules';
import { useStore } from '../app/context';
import { Button, Panel, SectionTitle, Segmented, Toggle } from '../components/kit';
import { ScreenHeader } from '../components/game';
import { DifficultyPicker } from './Setup';
import { SeatRow, patchSeat, patronsOf, type SeatDraft } from '../components/seats';

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
  const [mapType, setMapType] = useState<SkirmishMapType>('continental');
  const [guards, setGuards] = useState<GuardStrength>('normal');
  const [treasure, setTreasure] = useState<TreasureLevel>('normal');
  const [startWealth, setStartWealth] = useState<StartWealth>('normal');
  const [roads, setRoads] = useState<RoadDensity>('full');
  const [revealMap, setRevealMap] = useState(false);
  const [portals, setPortals] = useState(true);
  const [climateRules, setClimateRules] = useState(true);
  const [unownedTowns, setUnownedTowns] = useState<UnownedTowns>('none');
  const [aiTemperaments, setAiTemperaments] = useState(true);
  const [rotating, setRotating] = useState(true);
  const [difficulty, setDifficulty] = useState('normal');
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

  const victory: SkirmishVictory = victoryType === 'hold_relic' ? { type: 'hold_relic', days: relicDays } : { type: 'elimination' };
  const turnOrder = count >= 3 ? (rotating ? ('rotating' as const) : ('fixed' as const)) : undefined;
  const options = {
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
    portals,
    climateRules,
    aiTemperaments,
    ...(turnOrder ? { turnOrder } : {}),
    ...(unownedTowns !== 'none' ? { unownedTowns } : {}),
  };
  const optionsKey = JSON.stringify(options);
  // A generator error is shown until a setting changes.
  const [failure, setFailure] = useState<{ key: string; text: string } | null>(null);
  const error = failure && failure.key === optionsKey ? failure.text : null;

  const setSeat = (i: number, patch: Partial<SeatDraft>) => setSeats((list) => list.map((s, k) => (k === i ? patchSeat(catalog, s, patch) : s)));

  const reason = !sizeOk
    ? 'Four or more empires need a large or huge map'
    : humans === 0
      ? 'At least one seat must be played by a person'
      : active.some((s) => s.controller === 'human' && !s.godId)
        ? 'Every human seat needs a patron god'
        : '';

  const start = () => {
    if (reason) return;
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
      return;
    }
    const ids = [generated.mission.player.playerId, ...(generated.mission.rivals ?? []).map((r) => r.playerId)];
    const playerNames: Record<string, string> = {};
    const patronGodIds: Record<string, string> = {};
    active.forEach((s, i) => {
      const id = ids[i]!;
      if (s.controller === 'human') playerNames[id] = s.name.trim() || `Player ${i + 1}`;
      if (i > 0 && s.controller === 'human' && s.godId) patronGodIds[id] = s.godId;
    });
    store.startGenerated(generated, active[0]!.controller === 'human' ? active[0]!.godId : null, { difficultyId: anyAi ? difficulty : 'normal', playerNames, patronGodIds });
  };

  return (
    <div className="setup-screen">
      <ScreenHeader title="Random Map" />
      <div className="random-setup">
        <Panel className="random-setup__panel" bodyClassName="random-setup__body">
          <div className="random-setup__scroll scroll">
            <SectionTitle>Map</SectionTitle>
            <div className="random-setup__top random-setup__top--full">
              <div className="setting-block">
                <div className="setting-block__label">Map type</div>
                <div className="map-type-grid" role="radiogroup" aria-label="Map type" data-testid="random-type">
                  {SKIRMISH_MAP_TYPES.map((t) => {
                    const allowed = skirmishTypeAllows(t.id, count);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        role="radio"
                        aria-checked={mapType === t.id}
                        aria-disabled={!allowed}
                        disabled={!allowed}
                        className={`map-type ${mapType === t.id ? 'is-selected' : ''}`}
                        onClick={() => setMapType(t.id)}
                        data-testid={`random-type-${t.id}`}
                        title={allowed ? `Learns from ${t.inspiredBy}` : `For ${t.maxEmpires} empires`}
                      >
                        <span className="map-type__name">{t.label}</span>
                        <span className="map-type__text">{t.summary}{allowed ? '' : ` (For ${t.maxEmpires} empires.)`}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="random-setup__grid">
              <div className="setting-block">
                <div className="setting-block__label">Size</div>
                <Segmented
                  label="Map size"
                  value={size}
                  options={(['small', 'medium', 'large', 'huge'] as const).map((id) => ({ id, label: SKIRMISH_SIZE_LABEL[id], disabled: !skirmishSizeAllows(id, count), title: !skirmishSizeAllows(id, count) ? 'Four or more empires need a large or huge map' : undefined }))}
                  onChange={setSize}
                  testId="random-size"
                />
              </div>
              <div className="setting-block">
                <div className="setting-block__label">Wandering monsters</div>
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
              </div>
              <div className="setting-block">
                <div className="setting-block__label">Guards</div>
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
                <div className="setting-block__label">Treasure</div>
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
                <div className="setting-block__label">Roads</div>
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
                <div className="setting-block__label">Map options</div>
                <div className="row gap">
                  <Toggle checked={revealMap} onChange={setRevealMap} label="Revealed map" />
                  <span className="small">Revealed map — terrain and sites known from the start (heroes stay hidden)</span>
                </div>
                <div className="row gap setting-block__details">
                  <Toggle checked={portals} onChange={setPortals} label="Two-way portals" />
                  <span className="small">Two-way portals link the empires’ outer lands: a shortcut to a rival — and a back door for them.</span>
                </div>
                <div className="row gap setting-block__details">
                  <Toggle checked={climateRules} onChange={setClimateRules} label="Climate rules" />
                  <span className="small">Climate rules — the map’s weather changes every battle a little, for both sides alike: fog shortens shots, sand slows the ground troops, storms keep flyers low.</span>
                </div>
              </div>
              <div className="setting-block">
                <div className="setting-block__label">Unowned towns</div>
                <Segmented
                  label="Unowned towns"
                  value={unownedTowns}
                  options={[
                    { id: 'none', label: 'None' },
                    { id: 'own', label: 'Same pantheon' },
                    { id: 'other', label: 'Other pantheon' },
                    { id: 'both', label: 'Both' },
                  ]}
                  onChange={setUnownedTowns}
                  testId="random-unowned"
                />
                <p className="small faint setting-block__details" data-testid="random-unowned-text">
                  {unownedTowns === 'none'
                    ? 'Every town on the map starts with an empire.'
                    : `${unownedTowns === 'both' ? 'Two towns' : 'A town'} in each empire’s outer lands start${unownedTowns === 'both' ? '' : 's'} without a lord or a hero, held by ${unownedTowns === 'both' ? 'their' : 'its'} own militia — ${unownedTowns === 'own' ? 'of the empire’s own pantheon' : unownedTowns === 'other' ? 'of another pantheon' : 'one of the empire’s own pantheon, one of another'}. Take ${unownedTowns === 'both' ? 'them' : 'it'} to build and recruit there.`}
                </p>
              </div>
            </div>

            <SectionTitle>Game</SectionTitle>
            <div className="random-setup__grid">
              <div className="setting-block">
                <div className="setting-block__label">Empires</div>
                <Segmented
                  label="Number of empires"
                  value={String(count) as '2' | '3' | '4' | '5' | '6'}
                  options={(['2', '3', '4', '5', '6'] as const).map((id) => ({ id, label: id }))}
                  onChange={(v) => {
                    const n = Number(v);
                    setCount(n);
                    if (!skirmishSizeAllows(size, n)) setSize('large');
                    if (!skirmishTypeAllows(mapType, n)) setMapType('continental');
                  }}
                  testId="random-count"
                />
              </div>
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

            <SectionTitle>Empires</SectionTitle>
            <div className="random-setup__seats">
              {active.map((s, i) => (
                <SeatRow key={i} catalog={catalog} index={i} seat={s} color={SEAT_COLORS[i]!} pantheons={playable} temperaments={aiTemperaments} onChange={(patch) => setSeat(i, patch)} />
              ))}
            </div>
            {humans > 1 ? <p className="note small">Hot-seat: {humans} players share this computer and take turns. The map is hidden at every hand-over.</p> : null}
          </div>
          <div className="random-setup__actions">
            <Button variant="primary" size="large" icon="play" className="random-setup__start" disabled={!!reason} disabledReason={reason} onClick={start} data-testid="random-start">
              Start
            </Button>
            {reason || error ? (
              <div className="random-setup__reason" role="status" data-testid="random-start-reason">
                {reason || error}
              </div>
            ) : null}
          </div>
        </Panel>
      </div>
    </div>
  );
}
