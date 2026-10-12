/**
 * S18 Unit Detail / Animated Bestiary. A large 2D animated viewer of the
 * creature's battle sprite set (the animations its gameplay content calls for:
 * idle, move, attack, defend, hit, death, victory, plus shoot / takeoff-fly-
 * landing / ability where it has them) with playback controls and a
 * reduced-motion still, on the right; on the left one panel: name, summary,
 * statistics, growth and cost, abilities with their exact rules, and lore
 * (owner request 2026-10-04). Each form is its own page (opened from the
 * Encyclopedia or a stack).
 *
 * 1.1.0 (concept 12): the information is a parchment codex page; both forms of
 * the family are explicit controls (each still opens its own page).
 *
 * 1.1.3 (owner: "more nice and structured"): two framed pages in the creature's
 * pantheon frame (neutral creatures: the neutral frame). Left: the name with
 * pantheon, tier and size under it, the summary, both forms as socketed tiles
 * (the current one checked), the statistics as a grid of tiles (growth among
 * them), the cost, each ability as a row with its badge, and the lore. Right:
 * the creature on its pantheon's recruitment court (neutral creatures: an open
 * landscape), with the controls grouped and labelled under it (animation,
 * playback, speed, view).
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { creatureSprites, requiredAnimations } from '@pr/presentation/core';
import type { UnitViewerController, ViewerSpriteStatus } from '@pr/presentation';
import { useStore } from '../app/context';
import { Button, Panel, SectionTitle, Toggle } from '../components/kit';
import { CreaturePortrait, Emblem } from '../components/art';
import { CostList } from '../components/game';
import { FrontendShell } from '../components/frontend';
import { SceneViewport, type SceneFactory } from '../scene/SceneHost';
import { reducedMotion } from '../app/preferences';
import { AbilityBadge } from '../components/badges';
import { Icon, type IconName } from '../assets/icons';
import { guiThemeFor, NEUTRAL_THEME, type FrameTheme } from '../assets/guiArt';
import { adventureKitArt } from '../assets/manifest';
import { adventureScene } from '../components/adventure';

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

/** The painting behind the animated creature: its pantheon's recruitment court, else an open landscape (neutral creatures). */
function viewerBackdrop(pantheonId: string | null | undefined): string | null {
  return (pantheonId ? adventureScene('recruit', pantheonId) : null) ?? adventureKitArt('adventurekit.encounter.temperate')?.url ?? null;
}

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
  useEffect(() => {
    ctrl.current?.setBackdrop(viewerBackdrop(def.pantheonId));
  }, [def.pantheonId]);

  const factory = useCallback<SceneFactory<UnitViewerController>>((lib, engine, canvas) => new lib.UnitViewerController(engine, canvas), []);
  // The controller can arrive after the first render (the 2D layer loads on demand),
  // so it reads the latest settings from a ref when it does.
  const backdrop = viewerBackdrop(def.pantheonId);
  const latest = useRef({ autoplay, reduced, rate, def, accent, anim, facingLeft, backdrop });
  latest.current = { autoplay, reduced, rate, def, accent, anim, facingLeft, backdrop };
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
        c.setBackdrop(l.backdrop);
        c.setSubject(subject(l.def, l.accent));
        c.setAnimation(l.anim);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const own = (s: string) => !!set?.animations[s];
  const pantheon = def.pantheonId ? catalog.pantheons[def.pantheonId] : undefined;
  const frameTheme: FrameTheme = pantheon ? guiThemeFor(pantheon.id) : NEUTRAL_THEME;
  const stats = def.stats;
  const facts: { icon: IconName; label: string; value: ReactNode }[] = stats
    ? [
        { icon: 'attack', label: 'Attack', value: stats.attack },
        { icon: 'defense', label: 'Defense', value: stats.defense },
        { icon: 'damage', label: 'Damage', value: `${stats.damageMin}–${stats.damageMax}` },
        { icon: 'hp', label: 'Health', value: stats.hp },
        { icon: 'speed', label: 'Speed', value: stats.speed },
        { icon: 'growth', label: 'Growth', value: fam ? `${fam.baseGrowth} / week` : '—' },
        ...(stats.shots > 0 ? [{ icon: 'shots' as IconName, label: 'Shots', value: stats.shots }] : []),
        ...(stats.shots > 0 && stats.range ? [{ icon: 'range' as IconName, label: 'Range', value: `${stats.range} hexes` }] : []),
      ]
    : [];
  const playback = (fn: (c: UnitViewerController) => void) => () => {
    const c = ctrl.current;
    if (!c) return;
    fn(c);
    bump((n) => n + 1);
  };
  return (
    <FrontendShell backdrop="library" title={def.name} className="unit-screen" label={def.name} onBack={() => store.back()}>
      <div className="unit-layout unit-layout--codex">
        {/* The left page: who it is, both forms, the numbers, the abilities, the lore — in that order. */}
        <Panel className="unit-info unit-page" bodyClassName="scroll unit-info__body" framed surface="parchment" theme={frameTheme} label={`${def.name}: forms, statistics, abilities and lore`}>
          <header className="unit-title">
            <h2 className="unit-title__name" data-testid="unit-name">
              {def.name}
            </h2>
            <div className="unit-title__sub">
              {pantheon ? <Emblem catalog={catalog} pantheonId={pantheon.id} size="1.5rem" /> : null}
              <span>{pantheon ? pantheon.name : 'Neutral'}</span>
              <span className="unit-title__dot" aria-hidden="true" />
              <span>Tier {ROMAN[def.tier] ?? def.tier}</span>
              {stats ? (
                <>
                  <span className="unit-title__dot" aria-hidden="true" />
                  <span>{stats.footprint === 2 ? 'Two hexes' : 'One hex'}</span>
                </>
              ) : null}
            </div>
            <p className="unit-title__summary">{def.summary}</p>
          </header>
          {fam ? (
            <div className="unit-forms" role="group" aria-label="Forms">
              {[fam.baseCreatureId, fam.upgradedCreatureId].map((cid, i) => {
                const c = catalog.creatures[cid];
                if (!c) return null;
                const here = cid === def.id;
                return (
                  <button
                    key={cid}
                    type="button"
                    className={`unit-form ${here ? 'is-current' : ''}`}
                    aria-current={here ? 'page' : undefined}
                    onClick={() => (here ? undefined : store.replace('unit-detail', { creatureId: cid }))}
                    data-testid={`unit-form-${cid}`}
                  >
                    <span className="unit-form__socket">
                      <CreaturePortrait catalog={catalog} creatureId={cid} size="4.6rem" showPlaceholderTag={here} />
                    </span>
                    <span className="unit-form__text">
                      <span className="unit-form__kind">{i === 0 ? 'Base form' : 'Upgraded form'}</span>
                      <span className="unit-form__name">{c.name}</span>
                    </span>
                    {here ? <Icon name="check" className="unit-form__check" /> : null}
                  </button>
                );
              })}
            </div>
          ) : null}
          <SectionTitle>Statistics</SectionTitle>
          {stats ? (
            <dl className="unit-stats" data-testid="unit-stats">
              {facts.map((f) => (
                <div key={f.label} className="unit-stat">
                  <span className="unit-stat__icon" aria-hidden="true">
                    <Icon name={f.icon} />
                  </span>
                  <dt className="unit-stat__label">{f.label}</dt>
                  <dd className="unit-stat__value num">{f.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="dim">Statistics are not designed for this preparation creature yet.</p>
          )}
          <div className="unit-facts">
            <span className="unit-facts__label">Cost</span> {def.cost ? <CostList cost={def.cost} /> : <span className="dim">—</span>}
          </div>
          <SectionTitle>Abilities</SectionTitle>
          {def.abilityIds.length === 0 ? (
            <p className="dim">No special abilities.</p>
          ) : (
            <div className="unit-abilities">
              {def.abilityIds.map((a) => {
                const ab = catalog.abilities[a];
                if (!ab) return null;
                return (
                  <div key={a} className="ability unit-ability">
                    <AbilityBadge catalog={catalog} abilityId={a} size="2.8rem" />
                    <div className="unit-ability__text">
                      <div className="ability__name">
                        {ab.name} <span className="unit-ability__kind">{ab.activation === 'active' ? 'Active' : 'Passive'}</span>
                      </div>
                      <div className="unit-ability__summary">{ab.summary}</div>
                      <div className="small">
                        <strong>Exact rule:</strong> {ab.exactRule}
                      </div>
                      {ab.restriction ? <div className="faint small">Restriction: {ab.restriction}</div> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <SectionTitle>Lore</SectionTitle>
          {lore ? (
            <div className="unit-lore">
              <p className="lore">{lore.gameLore}</p>
              {lore.upgradeLore ? <p className="lore dim">{lore.upgradeLore}</p> : null}
              <p className="small dim unit-lore__source">{lore.sourceNote}</p>
            </div>
          ) : (
            <p className="dim">No lore written for this creature yet.</p>
          )}
        </Panel>
        {/* The right page: the creature on its pantheon's own ground, and the playback controls under it. */}
        <Panel className="unit-viewer unit-page" bodyClassName="unit-viewer__body" framed theme={frameTheme} label={`${def.name} animated preview`}>
          <div className="unit-viewer__stage">
            <SceneViewport factory={factory} onController={onController} className="unit-viewer__scene" label={`${def.name} animated preview`} />
            {/* Finished sprites carry no label (owner request 2026-10-07); stand-ins stay labelled. */}
            {status.kind === 'ready' && status.status === 'final' ? (
              <span hidden data-testid="viewer-sprite-status" data-status="final" />
            ) : (
              <span className="placeholder-tag unit-viewer__tag" data-testid="viewer-sprite-status" data-status={status.kind === 'ready' ? status.status : status.kind}>
                {status.kind === 'ready' ? 'Placeholder sprites' : status.kind === 'loading' ? 'Loading sprites…' : 'No sprites yet — portrait only'}
              </span>
            )}
          </div>
          <div className="unit-viewer__controls">
            <div className="unit-control unit-control--anims">
              <span className="unit-control__label">Animation</span>
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
            </div>
            <div className="unit-control-row">
              <div className="unit-control">
                <span className="unit-control__label">Playback</span>
                <div className="unit-control__buttons">
                  <Button size="small" icon="play" onClick={playback((c) => (c.playbackState === 'paused' ? c.resume() : c.restart()))} data-testid="viewer-play">
                    Play
                  </Button>
                  <Button size="small" icon="pause" onClick={playback((c) => c.pause())} data-testid="viewer-pause">
                    Pause
                  </Button>
                  <Button size="small" icon="stop" onClick={playback((c) => c.stop())} data-testid="viewer-stop">
                    Stop
                  </Button>
                  <Button size="small" onClick={playback((c) => c.restart())} data-testid="viewer-restart">
                    Restart
                  </Button>
                </div>
              </div>
              <div className="unit-control">
                <span className="unit-control__label">Speed</span>
                <div className="tabs unit-speed" role="radiogroup" aria-label="Playback speed">
                  {[0.5, 1, 2].map((r) => (
                    <button key={r} type="button" role="radio" aria-checked={rate === r} className="tab" onClick={() => setRate(r)}>
                      {r}×
                    </button>
                  ))}
                </div>
              </div>
              <div className="unit-control">
                <span className="unit-control__label">View</span>
                <div className="unit-control__toggles">
                  <label className="row gap small">
                    <Toggle checked={autoplay} onChange={setAutoplay} label="Autoplay" disabled={reduced} /> Autoplay
                  </label>
                  <label className="row gap small">
                    <Toggle checked={facingLeft} onChange={setFacingLeft} label="Face left (defending side)" /> Face left
                  </label>
                </div>
              </div>
            </div>
            {reduced ? <div className="faint small">Reduced motion: a still picture; an animation plays once when you press Play.</div> : null}
            {states.some((st) => !own(st)) ? <div className="faint small">* Stand-in: this animation is not drawn yet; another strip plays in its place.</div> : null}
          </div>
        </Panel>
      </div>
    </FrontendShell>
  );
}
