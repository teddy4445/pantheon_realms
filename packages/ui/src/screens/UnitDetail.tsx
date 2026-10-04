/**
 * S18 Unit Detail / Animated Bestiary. A large 2D animated viewer of the
 * creature's battle sprite set (the animations its gameplay content calls for:
 * idle, move, attack, defend, hit, death, victory, plus shoot / takeoff-fly-
 * landing / ability where it has them) with playback controls and a
 * reduced-motion still, on the right; on the left one panel: name, summary,
 * statistics, growth and cost, abilities with their exact rules, and lore
 * (owner request 2026-10-04). Each form is its own page (opened from the
 * Encyclopedia or a stack).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { creatureSprites, requiredAnimations } from '@pr/presentation/core';
import type { UnitViewerController, ViewerSpriteStatus } from '@pr/presentation';
import { useStore } from '../app/context';
import { Button, Panel, SectionTitle, Toggle } from '../components/kit';
import { CreaturePortrait } from '../components/art';
import { CostList, CreatureStats, ScreenHeader } from '../components/game';
import { SceneViewport, type SceneFactory } from '../scene/SceneHost';
import { reducedMotion } from '../app/preferences';
import { AbilityBadge } from '../components/badges';

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
  const creatureId = initial;
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
      <ScreenHeader title={def.name} />
      <div className="unit-layout">
        <Panel className="unit-info" bodyClassName="scroll unit-info__body">
          <div className="unit-head">
            <CreaturePortrait catalog={catalog} creatureId={def.id} size="7rem" showPlaceholderTag />
            <div className="unit-head__text">
              <div className="unit-head__title">
                <span className="tier-badge" title={`Tier ${def.tier}`}>T{def.tier}</span>
                <h2 className="unit-head__name" data-testid="unit-name">
                  {def.name}
                </h2>
              </div>
              <p className="unit-head__summary">{def.summary}</p>
            </div>
          </div>
          <SectionTitle>Statistics</SectionTitle>
          <CreatureStats def={def} />
          <div className="unit-facts">
            <span>
              <span className="dim">Growth</span> {fam?.baseGrowth ?? '—'} per week
            </span>
            <span>
              <span className="dim">Cost</span> {def.cost ? <CostList cost={def.cost} /> : <span className="dim">—</span>}
            </span>
          </div>
          <SectionTitle>Abilities</SectionTitle>
          {def.abilityIds.length === 0 ? (
            <p className="dim">No special abilities.</p>
          ) : (
            def.abilityIds.map((a) => {
              const ab = catalog.abilities[a];
              if (!ab) return null;
              return (
                <div key={a} className="ability">
                  <div className="ability__name">
                    <AbilityBadge catalog={catalog} abilityId={a} size="1.5rem" /> {ab.name} <span className="dim small">· {ab.activation === 'active' ? 'Active' : 'Passive'}</span>
                  </div>
                  <div>{ab.summary}</div>
                  <div className="small">
                    <strong>Exact rule:</strong> {ab.exactRule}
                  </div>
                  {ab.restriction ? <div className="faint small">Restriction: {ab.restriction}</div> : null}
                </div>
              );
            })
          )}
          <SectionTitle>Lore</SectionTitle>
          {lore ? (
            <>
              <p className="lore">{lore.gameLore}</p>
              {lore.upgradeLore ? <p className="lore dim">{lore.upgradeLore}</p> : null}
              <p className="small dim">{lore.sourceNote}</p>
            </>
          ) : (
            <p className="dim">No lore written for this creature yet.</p>
          )}
        </Panel>
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
      </div>
    </div>
  );
}
