/**
 * S18 Unit Detail / Animated Bestiary. A large 2D animated viewer of the
 * creature's battle sprite set (the animations its gameplay content calls for:
 * idle, move, attack, defend, hit, death, victory, plus shoot / takeoff-fly-
 * landing / ability where it has them), base/upgraded switching, playback
 * controls with a reduced-motion still, and exact statistics, abilities with
 * exact rules, sourced notes and original lore.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { creatureSprites, requiredAnimations } from '@pr/presentation/core';
import type { UnitViewerController, ViewerSpriteStatus } from '@pr/presentation';
import { useStore } from '../app/context';
import { Button, Chip, Panel, SectionTitle, Tabs, Toggle } from '../components/kit';
import { CreaturePortrait } from '../components/art';
import { BalanceChip, CostList, CreatureStats, ScreenHeader, StatusChip } from '../components/game';
import { SceneViewport, type SceneFactory } from '../scene/SceneHost';
import { resolveAsset } from '../assets/manifest';
import { reducedMotion } from '../app/preferences';
import { AbilityBadge } from '../components/badges';

type Tab = 'stats' | 'abilities' | 'lore' | 'assets';

const STATE_LABEL: Record<string, string> = {
  idle: 'Idle',
  move: 'Move',
  attack: 'Attack',
  shoot: 'Shoot',
  defend: 'Defend',
  hit: 'Hit',
  death: 'Death',
  victory: 'Victory',
  takeoff: 'Take off',
  fly: 'Fly',
  landing: 'Land',
  cast: 'Cast',
  ability: 'Ability',
};

export function UnitDetailScreen() {
  const store = useStore();
  const catalog = store.catalog;
  const initial = (store.screen.params.creatureId as string | undefined) ?? 'hoplite';
  const [creatureId, setCreatureId] = useState(initial);
  const [tab, setTab] = useState<Tab>('stats');
  const [anim, setAnim] = useState<string>('idle');
  const reduced = reducedMotion(store.prefs);
  const [autoplay, setAutoplay] = useState(store.prefs.codexAutoplay && !reduced);
  const [facingLeft, setFacingLeft] = useState(false);
  const [rate, setRate] = useState(1);
  const [status, setStatus] = useState<ViewerSpriteStatus>({ kind: 'loading' });
  const [, bump] = useState(0);
  const ctrl = useRef<UnitViewerController | null>(null);
  const def = catalog.creatures[creatureId] ?? catalog.creatures['hoplite']!;
  const fam = catalog.families[def.familyId];
  const other = def.form === 'base' ? (def.upgradeId ? catalog.creatures[def.upgradeId] : undefined) : def.baseId ? catalog.creatures[def.baseId] : undefined;
  const lore = catalog.lore[def.loreId];
  const accent = def.pantheonId ? (catalog.pantheons[def.pantheonId]?.theme.accent ?? '#3b73d9') : '#6b5a3a';
  const states = requiredAnimations(catalog, def);
  const set = creatureSprites(def.id);
  const subject = (d: typeof def, a: string) => ({ key: d.id, creatureId: d.id, accent: a, footprint: d.stats?.footprint ?? 1 });

  useEffect(() => {
    if (!states.includes(anim as never)) setAnim('idle');
    ctrl.current?.setSubject(subject(def, accent));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def, accent]);
  useEffect(() => {
    if (ctrl.current) {
      ctrl.current.speed = rate;
      ctrl.current.restart();
    }
  }, [rate]);
  useEffect(() => {
    ctrl.current?.setAnimation(anim);
  }, [anim]);
  useEffect(() => {
    if (ctrl.current) {
      ctrl.current.autoplay = autoplay;
      ctrl.current.setAnimation(ctrl.current.animation);
    }
  }, [autoplay]);
  useEffect(() => {
    if (ctrl.current) ctrl.current.mirror = facingLeft;
  }, [facingLeft]);

  const factory = useCallback<SceneFactory<UnitViewerController>>((lib, engine, canvas) => new lib.UnitViewerController(engine, canvas), []);
  // The controller can arrive after the first render (the 2D layer loads on demand),
  // so it reads the latest settings from a ref when it does.
  const latest = useRef({ autoplay, reduced, rate, def, accent, anim, facingLeft });
  latest.current = { autoplay, reduced, rate, def, accent, anim, facingLeft };
  const onController = useCallback(
    (c: UnitViewerController | null) => {
      ctrl.current = c;
      if (c) {
        const l = latest.current;
        c.autoplay = l.autoplay;
        c.reducedMotion = l.reduced;
        c.speed = l.rate;
        c.mirror = l.facingLeft;
        c.onStatus = setStatus;
        c.setSubject(subject(l.def, l.accent));
        c.setAnimation(l.anim);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const own = (s: string) => !!set?.animations[s];
  return (
    <div className="screen unit-screen">
      <ScreenHeader
        title={def.name}
        subtitle={`Tier ${def.tier} · ${def.form === 'upgraded' ? 'Upgraded form' : 'Base form'} · ${def.roleLabel} · ${def.pantheonId ? catalog.pantheons[def.pantheonId]?.name : 'Neutral'}`}
        right={
          other ? (
            <div className="tabs">
              {[fam?.baseCreatureId, fam?.upgradedCreatureId].map((id) =>
                id ? (
                  <button key={id} type="button" role="tab" className="tab" aria-selected={id === def.id} onClick={() => { setCreatureId(id); store.setParams({ creatureId: id }); }}>
                    {catalog.creatures[id]?.name}
                  </button>
                ) : null,
              )}
            </div>
          ) : undefined
        }
      />
      <div className="unit-layout">
        <div className="unit-viewer panel">
          <SceneViewport factory={factory} onController={onController} className="unit-viewer__scene" label={`${def.name} animated preview`} />
          <span className="placeholder-tag unit-viewer__tag" data-testid="viewer-sprite-status" data-status={status.kind === 'ready' ? status.status : status.kind}>
            {status.kind === 'ready'
              ? status.status === 'final'
                ? 'Final sprites'
                : 'Placeholder sprites'
              : status.kind === 'loading'
                ? 'Loading sprites…'
                : 'No sprites yet — portrait only'}
          </span>
          <div className="unit-viewer__controls">
            <div className="anim-buttons" role="radiogroup" aria-label="Animation">
              {states.map((st) => {
                const mine = own(st);
                const reason = mine ? undefined : `No ${STATE_LABEL[st]?.toLowerCase() ?? st} strip yet: a stand-in plays`;
                return (
                  <button key={st} type="button" role="radio" aria-checked={anim === st} className={`anim-btn ${anim === st ? 'is-on' : ''} ${mine ? '' : 'is-standin'}`} onClick={() => setAnim(st)} disabled={!set} title={reason} data-testid={`anim-${st}`} data-own={mine ? 'yes' : 'no'}>
                    {STATE_LABEL[st] ?? st}
                    {mine ? null : <span className="faint"> *</span>}
                  </button>
                );
              })}
            </div>
            <div className="row gap wrap">
              <Button size="small" icon="play" onClick={() => { const c = ctrl.current; if (!c) return; if (c.playbackState === 'paused') c.resume(); else c.restart(); bump((n) => n + 1); }} data-testid="viewer-play">
                Play
              </Button>
              <Button size="small" icon="pause" onClick={() => { ctrl.current?.pause(); bump((n) => n + 1); }} data-testid="viewer-pause">
                Pause
              </Button>
              <Button size="small" icon="stop" onClick={() => { ctrl.current?.stop(); bump((n) => n + 1); }} data-testid="viewer-stop">
                Stop
              </Button>
              <Button size="small" onClick={() => { ctrl.current?.restart(); bump((n) => n + 1); }} data-testid="viewer-restart">
                Restart
              </Button>
              <div className="tabs" role="radiogroup" aria-label="Playback speed">
                {[0.5, 1, 2].map((r) => (
                  <button key={r} type="button" role="radio" aria-checked={rate === r} className="tab" onClick={() => setRate(r)}>
                    {r}×
                  </button>
                ))}
              </div>
            </div>
            {reduced ? <div className="faint small">Reduced motion: a still picture; an animation plays once when you press Play.</div> : null}
            <div className="row gap">
              <label className="row gap small">
                <Toggle checked={autoplay} onChange={setAutoplay} label="Autoplay" disabled={reduced} /> Autoplay
              </label>
              <label className="row gap small">
                <Toggle checked={facingLeft} onChange={setFacingLeft} label="Face left (defending side)" /> Face left
              </label>
            </div>
            {states.some((st) => !own(st)) ? <div className="faint small">* Stand-in: this animation is not drawn yet; another strip plays in its place.</div> : null}
          </div>
        </div>
        <div className="unit-info">
          <div className="row gap">
            <CreaturePortrait catalog={catalog} creatureId={def.id} size="8rem" showPlaceholderTag />
            <div>
              <div className="row gap wrap">
                <StatusChip status={def.implementationStatus} />
                <BalanceChip status={def.balanceStatus} />
                <Chip>Growth {fam?.baseGrowth ?? '—'}/week (shared)</Chip>
              </div>
              <p className="small">{def.summary}</p>
            </div>
          </div>
          <Tabs<Tab>
            label="Unit information"
            value={tab}
            onChange={setTab}
            tabs={[
              { id: 'stats', label: 'Statistics' },
              { id: 'abilities', label: 'Abilities' },
              { id: 'lore', label: 'Lore' },
              { id: 'assets', label: 'Assets' },
            ]}
          />
          <Panel className="unit-tab" bodyClassName="scroll">
            {tab === 'stats' ? (
              <>
                <CreatureStats def={def} compare={def.form === 'upgraded' ? other : undefined} />
                <SectionTitle>Cost</SectionTitle>
                {def.cost ? <CostList cost={def.cost} /> : <span className="dim">Not designed</span>}
                {other?.stats && def.stats ? (
                  <>
                    <SectionTitle>{def.form === 'base' ? `Upgrade → ${other.name}` : `Upgraded from ${other.name}`}</SectionTitle>
                    <table className="table">
                      <thead>
                        <tr>
                          <th />
                          <th>{def.form === 'base' ? def.name : other.name}</th>
                          <th>{def.form === 'base' ? other.name : def.name}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(['attack', 'defense', 'hp', 'speed', 'shots', 'range'] as const).map((k) => {
                          const b = def.form === 'base' ? def.stats! : other.stats!;
                          const u = def.form === 'base' ? other.stats! : def.stats!;
                          if (k === 'range' && !b.range && !u.range) return null;
                          return (
                            <tr key={k}>
                              <th>{k}</th>
                              <td className="num">{b[k] ?? '—'}</td>
                              <td className={`num ${(u[k] ?? 0) > (b[k] ?? 0) ? 'success' : ''}`}>{u[k] ?? '—'}</td>
                            </tr>
                          );
                        })}
                        <tr>
                          <th>damage</th>
                          <td className="num">
                            {(def.form === 'base' ? def.stats : other.stats)!.damageMin}–{(def.form === 'base' ? def.stats : other.stats)!.damageMax}
                          </td>
                          <td className="num">
                            {(def.form === 'base' ? other.stats : def.stats)!.damageMin}–{(def.form === 'base' ? other.stats : def.stats)!.damageMax}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </>
                ) : null}
              </>
            ) : null}
            {tab === 'abilities' ? (
              def.abilityIds.length === 0 ? (
                <p className="dim">No special abilities.</p>
              ) : (
                def.abilityIds.map((a) => {
                  const ab = catalog.abilities[a];
                  if (!ab) return null;
                  return (
                    <div key={a} className="ability">
                      <div className="ability__name">
                        <AbilityBadge catalog={catalog} abilityId={a} size="1.3rem" /> {ab.name} <Chip>{ab.activation}</Chip> <StatusChip status={ab.implementationStatus} />
                      </div>
                      <div className="small">{ab.summary}</div>
                      <div className="small">
                        <strong>Exact rule:</strong> {ab.exactRule}
                      </div>
                      {ab.restriction ? <div className="faint small">Restriction: {ab.restriction}</div> : null}
                    </div>
                  );
                })
              )
            ) : null}
            {tab === 'lore' ? (
              lore ? (
                <>
                  <SectionTitle>In the world</SectionTitle>
                  <p className="lore">{lore.gameLore}</p>
                  {lore.upgradeLore ? <p className="lore dim">{lore.upgradeLore}</p> : null}
                  <SectionTitle>Historical and mythological note</SectionTitle>
                  <p className="small">{lore.sourceNote}</p>
                  <div className="row gap wrap">
                    <Chip tone={lore.sourceStatus === 'verified_note' ? 'ok' : lore.sourceStatus === 'original_invention' ? 'info' : 'warn'}>
                      {lore.sourceStatus === 'verified_note' ? 'Verified note' : lore.sourceStatus === 'original_invention' ? 'Original fiction' : 'Draft — requires review'}
                    </Chip>
                    {lore.sourceRefs.map((r) => (
                      <Chip key={r}>{r}</Chip>
                    ))}
                  </div>
                </>
              ) : (
                <p className="dim">No lore written for this creature yet.</p>
              )
            ) : null}
            {tab === 'assets' ? (
              <table className="table">
                <tbody>
                  <tr>
                    <th>Sprites</th>
                    <td>
                      <code>{def.presentation.spriteAssetId}</code> <Chip tone={set?.status === 'final' ? 'ok' : 'muted'}>{set?.status ?? 'missing'}</Chip>
                      {set ? <div className="faint small">{set.provenance}</div> : null}
                    </td>
                  </tr>
                  <tr>
                    <th>Portrait</th>
                    <td>
                      <code>{def.presentation.portraitAssetId}</code> <Chip tone={resolveAsset(def.presentation.portraitAssetId).status === 'final' ? 'ok' : 'muted'}>{resolveAsset(def.presentation.portraitAssetId).status}</Chip>
                    </td>
                  </tr>
                  <tr>
                    <th>Body profile</th>
                    <td>
                      <code>{def.presentation.bodyProfile}</code>
                    </td>
                  </tr>
                  <tr>
                    <th>Animations</th>
                    <td>
                      {states.map((st) => (
                        <Chip key={st} tone={own(st) ? (set?.status === 'final' ? 'ok' : 'muted') : 'warn'}>
                          {st}
                        </Chip>
                      ))}
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : null}
          </Panel>
        </div>
      </div>
    </div>
  );
}
