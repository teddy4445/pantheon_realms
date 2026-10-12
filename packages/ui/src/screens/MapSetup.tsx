/**
 * S23 Skirmish map setup (2026-10-05): the empires of an authored skirmish map
 * (catalog `skirmishMaps`) — each seat's pantheon, who plays it (a person on
 * this computer or the AI), the person's name and patron — the difficulty, and
 * whether the map's unowned towns are used (2026-10-07).
 * The seat count is the map's. Start compiles the map for these seats and opens
 * the adventure map, like a random map (no briefing).
 *
 * 1.1.0 ("Gather the Empires"): the map's painting and facts beside one row per
 * seat under its pantheon's banner; Back and Start stay in the footer.
 */
import { useState } from 'react';
import { SKIRMISH_PLAYER_COLORS, compileSkirmishMap } from '@pr/session';
import { useStore } from '../app/context';
import { Button, Panel, SectionTitle, Segmented } from '../components/kit';
import { FrontendShell } from '../components/frontend';
import { SkirmishMapThumb } from '../components/mapPreview';
import { SeatRow, patchSeat, patronsOf, type SeatDraft } from '../components/seats';
import { DifficultyPicker, skirmishMapFacts } from './Setup';

export function MapSetupScreen() {
  const store = useStore();
  const catalog = store.catalog;
  const def = catalog.skirmishMaps?.[store.setup.skirmishMapId ?? ''];
  const playable = catalog.pantheonOrder.filter((id) => catalog.pantheons[id]?.playability === 'playable');
  const [seats, setSeats] = useState<SeatDraft[]>(() =>
    (def?.map.players ?? []).map((p, i) => {
      const pantheonId = playable.includes(p.pantheonId) ? p.pantheonId : (playable[i % Math.max(1, playable.length)] ?? 'greek');
      return { pantheonId, controller: i === 0 ? 'human' : 'ai', name: `Player ${i + 1}`, godId: patronsOf(catalog, pantheonId)[0] ?? null };
    }),
  );
  const [difficulty, setDifficulty] = useState('normal');
  const [unowned, setUnowned] = useState<'none' | 'own' | 'other'>('none');
  if (!def) {
    return (
      <FrontendShell
        backdrop="atlas"
        title="Skirmish Map"
        className="setup-screen"
        footer={
          <Button onClick={() => store.back()} icon="back">
            Back
          </Button>
        }
      >
        <p className="note">This map is not in this build.</p>
      </FrontendShell>
    );
  }
  const freeSpots = def.map.sites.filter((x) => x.kind === 'town' && x.owner === undefined).length;
  const humans = seats.filter((s) => s.controller === 'human').length;
  const anyAi = seats.some((s) => s.controller === 'ai');
  const reason = humans === 0 ? 'At least one seat must be played by a person' : seats.some((s) => s.controller === 'human' && !s.godId) ? 'Every human seat needs a patron god' : '';
  const setSeat = (i: number, patch: Partial<SeatDraft>) => setSeats((list) => list.map((s, k) => (k === i ? patchSeat(catalog, s, patch) : s)));
  const start = () => {
    if (reason) return;
    let compiled;
    try {
      compiled = compileSkirmishMap(
        catalog,
        def.id,
        seats.map((s, i) => ({ pantheonId: s.pantheonId, controller: s.controller, ...(s.controller === 'human' ? { name: s.name.trim() || `Player ${i + 1}` } : {}) })),
        { unownedTowns: unowned },
      );
    } catch (e) {
      store.toast(e instanceof Error ? e.message : String(e), 'error');
      return;
    }
    const ids = [compiled.mission.player.playerId, ...(compiled.mission.rivals ?? []).map((r) => r.playerId)];
    const playerNames: Record<string, string> = {};
    const patronGodIds: Record<string, string> = {};
    seats.forEach((s, i) => {
      if (s.controller === 'human') playerNames[ids[i]!] = s.name.trim() || `Player ${i + 1}`;
      if (i > 0 && s.controller === 'human' && s.godId) patronGodIds[ids[i]!] = s.godId;
    });
    store.startGenerated(compiled, seats[0]!.controller === 'human' ? seats[0]!.godId : null, { difficultyId: anyAi ? difficulty : 'normal', playerNames, patronGodIds });
  };
  return (
    <FrontendShell
      backdrop="atlas"
      title={def.name}
      className="setup-screen"
      footer={
        <>
          <Button onClick={() => store.back()} icon="back">
            Back
          </Button>
          {reason ? (
            <div className="random-setup__reason" role="status" data-testid="map-setup-reason">
              {reason}
            </div>
          ) : null}
          <Button variant="primary" size="large" icon="play" className="random-setup__start" disabled={!!reason} disabledReason={reason} onClick={start} data-testid="map-setup-start">
            Start
          </Button>
        </>
      }
    >
      <div className="map-setup">
        <Panel className="map-setup__map" bodyClassName="scroll" title="The map" framed="compact" surface="parchment">
          <SkirmishMapThumb doc={def.map} assetId={def.thumbnailAssetId} large style={{ width: '100%', aspectRatio: '16 / 9', height: 'auto' }} />
          <div className="tagline">{def.tagline}</div>
          <dl className="map-detail__facts">
            {skirmishMapFacts(catalog, def).map((f) => (
              <div key={f.label} className="map-detail__fact">
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
        </Panel>
        <Panel className="random-setup__panel map-setup__seats" bodyClassName="random-setup__body" framed>
          <div className="random-setup__scroll scroll">
            <SectionTitle>Empires</SectionTitle>
            <p className="small dim">
              {def.map.players.length} seats. Seat 1 starts where the map shows the first colour; every seat’s lands are laid out alike. Seats played by the AI are AI empires.
            </p>
            <div className="random-setup__seats" data-testid="map-setup-seats">
              {seats.map((s, i) => (
                <SeatRow key={i} catalog={catalog} index={i} seat={s} color={SKIRMISH_PLAYER_COLORS[i % SKIRMISH_PLAYER_COLORS.length]!} pantheons={playable} temperaments onChange={(patch) => setSeat(i, patch)} />
              ))}
            </div>
            {humans > 1 ? <p className="note small">Hot-seat: {humans} players share this computer and take turns. The map is hidden at every hand-over.</p> : null}
            {freeSpots > 0 ? (
              <>
                <SectionTitle>Unowned towns</SectionTitle>
                <div className="setting-block">
                  <Segmented
                    label="Unowned towns"
                    value={unowned}
                    options={[
                      { id: 'none', label: 'None' },
                      { id: 'own', label: 'Same pantheon' },
                      { id: 'other', label: 'Other pantheon' },
                    ]}
                    onChange={setUnowned}
                    testId="map-setup-unowned"
                  />
                  <p className="small faint setting-block__details">
                    {unowned === 'none'
                      ? 'Every town on the map starts with an empire.'
                      : `One town near each empire starts without a lord or a hero, held by its own militia — ${unowned === 'own' ? 'of that empire’s pantheon' : 'of another pantheon (one no empire plays, when there is one)'}. Take it to build and recruit there.`}
                  </p>
                </div>
              </>
            ) : null}
            {anyAi ? (
              <>
                <SectionTitle>AI rivals</SectionTitle>
                <DifficultyPicker catalog={catalog} value={difficulty} onChange={setDifficulty} />
              </>
            ) : null}
          </div>
        </Panel>
      </div>
    </FrontendShell>
  );
}
