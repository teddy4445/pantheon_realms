/**
 * Big-moment presentation (GPT6_BRIEF_3): miracle cards, new-week and level-up
 * banners and victory/defeat splashes. Paintings only — every word on them is
 * live interface text, the frames and plates are the game's own kit, and
 * nothing here dispatches a command.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { useStore } from '../app/context';
import type { MatchState } from '@pr/rules';
import { momentHoldMs, viewerWon, type Moment } from '../app/moments';
import { miracleCardArt, newWeekBannerArt, resultSplashArt } from '../assets/momentArt';
import type { StoryArtRecord } from '../assets/manifest';

/**
 * Live text centred on a banner's blank plaque. The plaque was measured per
 * file at import (the generated variants differ slightly), so the text follows
 * each picture's own plaque rather than one shared box.
 */
export function BannerPlaque({ art, children, className = '' }: { art: StoryArtRecord; children: ReactNode; className?: string }) {
  const [l, t, r, b] = art.plaque ?? [0.2, 0.275, 0.8, 0.725];
  return (
    <div className={`banner-art ${className}`} style={{ aspectRatio: `${art.width} / ${art.height}` }} data-asset={art.id}>
      <img className="banner-art__img" src={art.url} alt="" draggable={false} />
      <div className="banner-art__plaque" style={{ left: `${l * 100}%`, top: `${t * 100}%`, width: `${(r - l) * 100}%`, height: `${(b - t) * 100}%` }}>
        {children}
      </div>
    </div>
  );
}

/**
 * A full-window victory or defeat painting behind result UI: with the existing
 * contrast scrim, or (`shade`) under an even 20 % black layer (battle result).
 */
export function ResultSplash({ art, shade = false }: { art: StoryArtRecord; shade?: boolean }) {
  return (
    <div className="result-splash" aria-hidden="true" data-testid="result-splash" data-asset={art.id}>
      <img src={art.url} alt="" draggable={false} />
      <div className={shade ? 'result-splash__shade' : 'scene-art__scrim scene-art__scrim--bottom'} />
    </div>
  );
}

/**
 * The painting and live title behind an end-of-game dialog: the viewer's
 * pantheon (never the opponent's), victory or defeat as the viewer finished.
 * Undefined while the match runs or when the painting is missing (the dialog
 * keeps its plain backdrop).
 */
export function endOfGameSplash(state: MatchState, viewerId: string, title: string, sub?: ReactNode): ReactNode | undefined {
  const won = viewerWon(state, viewerId);
  if (won === null) return undefined;
  const art = resultSplashArt(state.players[viewerId]?.pantheonId, won);
  if (!art) return undefined;
  return (
    <>
      <ResultSplash art={art} />
      <SplashTitle title={title} sub={sub} tone={won ? 'victory' : 'defeat'} />
    </>
  );
}

/** The large live title in the paintings' upper title area (about x 30–70 %, y 8–30 %). */
export function SplashTitle({ title, sub, tone }: { title: string; sub?: ReactNode; tone: 'victory' | 'defeat' }) {
  return (
    <div className={`splash-title is-${tone} ${title.length > 34 ? 'is-very-long' : title.length > 18 ? 'is-long' : ''}`} data-testid="splash-title">
      <div className="splash-title__text">{title}</div>
      {sub ? <div className="splash-title__sub">{sub}</div> : null}
    </div>
  );
}

function MiracleCard({ m, art, onDismiss }: { m: Extract<Moment, { kind: 'miracle' }>; art: StoryArtRecord; onDismiss: () => void }) {
  return (
    <button
      type="button"
      className="miracle-card panel"
      onClick={onDismiss}
      data-testid="miracle-card"
      data-asset={art.id}
      aria-label={`${m.name}${m.invokedBy ? `, invoked by ${m.invokedBy}` : ''}. ${m.summary} Click to close.`}
    >
      <span className="panel__corner panel__corner--tl" />
      <span className="panel__corner panel__corner--tr" />
      <span className="panel__corner panel__corner--bl" />
      <span className="panel__corner panel__corner--br" />
      <span className="miracle-card__art">
        <img src={art.url} alt="" draggable={false} />
        <span className="miracle-card__plate">
          <span className="miracle-card__name">{m.name}</span>
          <span className="miracle-card__by">{m.invokedBy ? `Invoked by ${m.invokedBy}` : 'The gods answer'}</span>
        </span>
      </span>
    </button>
  );
}

function NewWeekBanner({ m, art, onDismiss }: { m: Extract<Moment, { kind: 'new-week' }>; art: StoryArtRecord; onDismiss: () => void }) {
  return (
    <button type="button" className="week-banner" onClick={onDismiss} data-testid="new-week-banner" aria-label={`Week ${m.week}. ${m.title}. ${m.effect} Click to close.`}>
      <BannerPlaque art={art} className="banner-art--week">
        <span className="plaque-text__title">
          Week {m.week}
          <span className="plaque-text__sep"> · </span>
          {m.title}
        </span>
        <span className="plaque-text__body">{m.effect}</span>
      </BannerPlaque>
    </button>
  );
}

/**
 * Shows the first waiting moment above the screen; it rises and fades in
 * (no motion under reduced motion), stays on screen for the hold time and
 * closes on a click or Esc. It does not block play: the rest of the screen
 * stays usable.
 */
export function MomentLayer() {
  const store = useStore();
  const m = store.moments[0];
  const key = m?.key;
  const dismissRef = useRef<() => void>(() => undefined);
  dismissRef.current = () => {
    if (key) store.dismissMoment(key);
  };
  useEffect(() => {
    if (!m) return;
    // The hold counts time on screen: frame by frame, at most a quarter second
    // per frame, so a stalled or hidden window (no frames drawn) never eats into
    // the time the moment is actually seen. On a normal display this is the
    // plain hold time.
    const hold = momentHoldMs(store.prefs, m);
    let shown = 0;
    let last: number | null = null;
    let raf = 0;
    const tick = (now: number) => {
      if (last !== null) shown += Math.min(now - last, 250);
      last = now;
      if (shown >= hold) dismissRef.current();
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      dismissRef.current();
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey, true);
    };
    // One timer per moment (its key); preference changes apply to the next one.
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!m) return null;
  const art = m.kind === 'miracle' ? miracleCardArt(m.interventionId) : newWeekBannerArt(m.eventId);
  if (!art) return null;
  return (
    <div className={`moment-layer moment-layer--${m.kind}`} role="status" aria-live="polite" data-testid="moment-layer" key={m.key}>
      {m.kind === 'miracle' ? <MiracleCard m={m} art={art} onDismiss={() => dismissRef.current()} /> : <NewWeekBanner m={m} art={art} onDismiss={() => dismissRef.current()} />}
    </div>
  );
}
