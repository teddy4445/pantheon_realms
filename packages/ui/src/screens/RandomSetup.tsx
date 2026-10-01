/**
 * S19 Random Map setup (proposed this build): map size, two to four seats
 * (each AI or human — several humans play hot-seat on this computer), victory
 * condition, wandering monsters, difficulty and seed, with a live preview of
 * the generated map and its fairness checks.
 *
 * The map comes from the rules-side generator (deterministic for the same
 * options); this screen only collects choices and shows the result.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { TERRAIN_COLORS } from '@pr/presentation/core';
import { createRandomSkirmish, skirmishSizeAllows, SKIRMISH_SIZE_LABEL, type RandomSkirmish, type SkirmishMapSize, type SkirmishVictory } from '@pr/session';
import type { ContentCatalog } from '@pr/rules';
import { useStore } from '../app/context';
import { Button, Chip, Panel, Segmented, TextInput } from '../components/kit';
import { Emblem } from '../components/art';
import { ScreenHeader } from '../components/game';
import { DifficultyPicker } from './Setup';

const SEAT_COLORS = ['#3b73d9', '#c0392b', '#2e9e5b', '#c98a1b'];

interface SeatDraft {
  pantheonId: string;
  controller: 'human' | 'ai';
  name: string;
  godId: string | null;
}

function patronsOf(catalog: ContentCatalog, pantheonId: string): string[] {
  return (catalog.pantheons[pantheonId]?.godIds ?? []).filter((g) => catalog.gods[g]?.role === 'patron' && catalog.gods[g]?.implementationStatus === 'implemented');
}

function newSeed(): number {
  return Math.floor(Math.random() * 900000) + 100000;
}

function MapPreview({ generated }: { generated: RandomSkirmish }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const map = generated.map;
  const cell = 6;
  const w = Math.ceil((map.width + map.height / 2) * cell);
  const h = Math.ceil(map.height * cell * 0.87 + cell);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#081222';
    ctx.fillRect(0, 0, w, h);
    const at = (q: number, r: number) => ({ x: (q + r / 2) * cell, y: r * cell * 0.87 });
    for (let r = 0; r < map.height; r++) {
      for (let q = 0; q < map.width; q++) {
        const code = map.terrain[r * map.width + q] ?? 'p';
        const terrain = ({ p: 'plains', f: 'forest', r: 'rough', s: 'marsh', m: 'mountain', w: 'water' } as const)[code as 'p'] ?? 'plains';
        ctx.fillStyle = TERRAIN_COLORS[terrain];
        const p = at(q, r);
        ctx.fillRect(p.x, p.y, cell, cell);
      }
    }
    const seatColor = new Map<string, string>();
    seatColor.set(generated.mission.player.town.siteId, SEAT_COLORS[0]!);
    (generated.mission.rivals ?? []).forEach((rv, i) => seatColor.set(rv.town.siteId, rv.color ?? SEAT_COLORS[(i + 1) % 4]!));
    for (const site of generated.mission.sites) {
      const p = at(site.coord.q, site.coord.r);
      if (site.kind.type === 'town') {
        ctx.fillStyle = seatColor.get(site.id) ?? '#aaa';
        ctx.fillRect(p.x - 3, p.y - 3, cell + 6, cell + 6);
        ctx.strokeStyle = '#f5e4b7';
        ctx.strokeRect(p.x - 3, p.y - 3, cell + 6, cell + 6);
      } else if (site.kind.type === 'relic' || site.id === 'center_gold') {
        ctx.fillStyle = '#ffd36a';
        ctx.beginPath();
        ctx.arc(p.x + cell / 2, p.y + cell / 2, cell, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = site.guard ? '#e06050' : '#f5e4b7';
        ctx.fillRect(p.x + 1, p.y + 1, cell - 2, cell - 2);
      }
    }
  }, [generated, map, w, h]);
  return <canvas ref={ref} width={w} height={h} className="random-preview" aria-label="Preview of the generated map" data-testid="random-preview" />;
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
  const [difficulty, setDifficulty] = useState('normal');
  const [seed, setSeed] = useState(newSeed);
  const [seedText, setSeedText] = useState(String(seed));
  const [seats, setSeats] = useState<SeatDraft[]>(() =>
    [0, 1, 2, 3].map((i) => {
      const pantheonId = playable[i % Math.max(1, playable.length)] ?? 'greek';
      return { pantheonId, controller: i === 0 ? 'human' : 'ai', name: i === 0 ? 'Player 1' : `Player ${i + 1}`, godId: patronsOf(catalog, pantheonId)[0] ?? null };
    }),
  );
  const active = seats.slice(0, count);
  const humans = active.filter((s) => s.controller === 'human').length;
  const anyAi = active.some((s) => s.controller === 'ai');
  const sizeOk = skirmishSizeAllows(size, count);

  const victory: SkirmishVictory = victoryType === 'hold_relic' ? { type: 'hold_relic', days: relicDays } : { type: 'elimination' };
  const genKey = JSON.stringify({ seed, size, victory, monsters, seats: active.map((s) => [s.pantheonId, s.controller]) });
  const result = useMemo((): { generated: RandomSkirmish | null; error: string | null } => {
    if (!sizeOk) return { generated: null, error: 'Four empires need a medium or large map.' };
    try {
      return {
        generated: createRandomSkirmish(catalog, {
          seed,
          size,
          seats: active.map((s) => ({ pantheonId: s.pantheonId, controller: s.controller })),
          victory,
          monsters,
        }),
        error: null,
      };
    } catch (e) {
      return { generated: null, error: e instanceof Error ? e.message : String(e) };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, genKey, sizeOk]);
  const generated = result.generated;
  const checksPassed = generated ? generated.checks.filter((c) => c.pass).length : 0;

  const setSeat = (i: number, patch: Partial<SeatDraft>) =>
    setSeats((list) =>
      list.map((s, k) => {
        if (k !== i) return s;
        const next = { ...s, ...patch };
        if (patch.pantheonId && patch.pantheonId !== s.pantheonId) next.godId = patronsOf(catalog, patch.pantheonId)[0] ?? null;
        return next;
      }),
    );

  const reason = !sizeOk
    ? 'Four empires need a medium or large map'
    : humans === 0
      ? 'At least one seat must be played by a person'
      : !generated
        ? (result.error ?? 'The map could not be generated')
        : active.some((s) => s.controller === 'human' && !s.godId)
          ? 'Every human seat needs a patron god'
          : '';

  const start = () => {
    if (!generated || reason) return;
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
      <ScreenHeader title="Random Map" subtitle="A symmetric map generated for two to four empires" />
      <div className="random-setup">
        <Panel title="Map" className="random-setup__map" bodyClassName="scroll">
          <div className="setting-block">
            <div className="setting-block__label">Size</div>
            <Segmented
              label="Map size"
              value={size}
              options={(['small', 'medium', 'large'] as const).map((id) => ({ id, label: SKIRMISH_SIZE_LABEL[id], disabled: !skirmishSizeAllows(id, count), title: !skirmishSizeAllows(id, count) ? 'Too small for four empires' : undefined }))}
              onChange={setSize}
              testId="random-size"
            />
          </div>
          <div className="setting-block">
            <div className="setting-block__label">Empires</div>
            <Segmented
              label="Number of empires"
              value={String(count) as '2' | '3' | '4'}
              options={(['2', '3', '4'] as const).map((id) => ({ id, label: id }))}
              onChange={(v) => {
                const n = Number(v);
                setCount(n);
                if (!skirmishSizeAllows(size, n)) setSize('medium');
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
          {anyAi ? <DifficultyPicker catalog={catalog} value={difficulty} onChange={setDifficulty} /> : null}
          <div className="setting-block">
            <div className="setting-block__label">Seed</div>
            <div className="row gap">
              <TextInput
                label="Map seed"
                value={seedText}
                maxLength={9}
                onChange={(v) => {
                  const clean = v.replace(/[^0-9]/g, '');
                  setSeedText(clean);
                  const n = Number(clean);
                  if (clean && Number.isFinite(n)) setSeed(n);
                }}
                testId="random-seed"
              />
              <Button
                size="small"
                icon="newgame"
                onClick={() => {
                  const s = newSeed();
                  setSeed(s);
                  setSeedText(String(s));
                }}
                data-testid="random-reroll"
              >
                New map
              </Button>
            </div>
            <p className="small faint setting-block__details">The same seed and settings always make the same map.</p>
          </div>
        </Panel>

        <Panel title="Empires" className="random-setup__seats" bodyClassName="scroll">
          {active.map((s, i) => {
            const patrons = patronsOf(catalog, s.pantheonId);
            return (
              <div key={i} className="seat-row" style={{ ['--seat' as string]: SEAT_COLORS[i] }} data-testid={`seat-${i}`}>
                <span className="seat-row__swatch" aria-hidden="true" />
                <Emblem catalog={catalog} pantheonId={s.pantheonId} size="2.2rem" />
                <div className="seat-row__fields">
                  <div className="row gap wrap">
                    <select className="select" value={s.pantheonId} aria-label={`Seat ${i + 1} pantheon`} onChange={(e) => setSeat(i, { pantheonId: e.target.value })} data-testid={`seat-${i}-pantheon`}>
                      {playable.map((id) => (
                        <option key={id} value={id}>
                          {catalog.pantheons[id]?.name}
                        </option>
                      ))}
                    </select>
                    <Segmented
                      label={`Seat ${i + 1} controller`}
                      value={s.controller}
                      options={[
                        { id: 'human', label: 'Human' },
                        { id: 'ai', label: 'AI' },
                      ]}
                      onChange={(v) => setSeat(i, { controller: v })}
                      testId={`seat-${i}-controller`}
                    />
                  </div>
                  {s.controller === 'human' ? (
                    <div className="row gap wrap">
                      <TextInput label={`Seat ${i + 1} name`} value={s.name} onChange={(v) => setSeat(i, { name: v })} testId={`seat-${i}-name`} />
                      <select className="select" value={s.godId ?? ''} aria-label={`Seat ${i + 1} patron god`} onChange={(e) => setSeat(i, { godId: e.target.value || null })} data-testid={`seat-${i}-patron`}>
                        {patrons.map((g) => (
                          <option key={g} value={g}>
                            Patron: {catalog.gods[g]?.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="small dim">AI empire · no patron (as in other skirmishes)</div>
                  )}
                </div>
              </div>
            );
          })}
          {humans > 1 ? <p className="note small">Hot-seat: {humans} players share this computer and take turns. The map is hidden at every hand-over.</p> : null}
        </Panel>

        <Panel title="Preview" className="random-setup__preview" bodyClassName="scroll">
          {generated ? (
            <>
              <MapPreview generated={generated} />
              <div className="row gap wrap">
                <Chip tone={checksPassed === generated.checks.length ? 'ok' : 'bad'}>
                  Fairness checks {checksPassed}/{generated.checks.length}
                </Chip>
                <Chip>
                  {generated.map.width}×{generated.map.height}
                </Chip>
                <Chip>{generated.mission.sites.filter((x) => x.kind.type === 'creature_camp').length} camps</Chip>
                <Chip>{generated.mission.sites.filter((x) => x.kind.type === 'map_event').length} events</Chip>
                <Chip>{generated.mission.hostileHeroes.length} monsters</Chip>
              </div>
              <ul className="bullets small dim">
                {generated.checks.map((c) => (
                  <li key={c.id}>
                    {c.pass ? '✓' : '✗'} {c.detail}
                  </li>
                ))}
              </ul>
              <p className="small faint">Towns are squares in each empire’s colour; the gold circle is the contested center; red marks are guarded sites.</p>
            </>
          ) : (
            <p className="warn">{result.error}</p>
          )}
        </Panel>
      </div>
      <footer className="setup-footer">
        <Button onClick={() => store.back()} icon="back">
          Back
        </Button>
        <Button variant="primary" size="large" disabled={!!reason} disabledReason={reason} onClick={start} data-testid="random-start">
          Begin — Briefing
        </Button>
      </footer>
    </div>
  );
}
