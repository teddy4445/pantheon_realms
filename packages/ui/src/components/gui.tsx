/**
 * Release 1.1.0 shared interface components: theme selection, sockets,
 * select-then-confirm choices, encounter headers, faction banners, the open
 * book folio and the tooltip layer. Presentational only: no rules, no state
 * mutation (callers dispatch their own commands).
 */
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import type { AppStore } from '../app/store';
import { NEUTRAL_THEME, artReady, artState, guiArt, guiThemeFor, themeEmblemId, type ArtState, type FrameTheme, type GuiArt, type GuiTheme } from '../assets/guiArt';
import { resolveAsset } from '../assets/manifest';

// ---------------------------------------------------------------------------
// Theme selection
// ---------------------------------------------------------------------------

/** Pre-game screens keep the neutral shell even when a finished or paused match is still loaded. */
const SETUP_SCREENS = new Set(['game-mode', 'pantheon-select', 'random-setup', 'map-setup', 'scenario-select', 'map-editor', 'high-scores']);

/**
 * The theme of the current context: the viewing player's pantheon during a
 * match (the acting hero's, town's or battle side's player); outside a match
 * (title, setup, encyclopedia, settings, saves, editor) the neutral shell —
 * faction panels inside it set their own theme.
 */
export function contextTheme(store: AppStore): FrameTheme {
  const session = store.session;
  if (session && !SETUP_SCREENS.has(store.screen.id) && store.screen.id !== 'main-menu') {
    const p = session.state.players[session.humanPlayerId];
    return guiThemeFor(p?.pantheonId);
  }
  return NEUTRAL_THEME;
}

/** The theme of a player (owner of a hero, town or battle side). */
export function playerTheme(store: AppStore, playerId: string | null | undefined): FrameTheme {
  const p = playerId ? store.session?.state.players[playerId] : undefined;
  return p ? guiThemeFor(p.pantheonId) : contextTheme(store);
}

// ---------------------------------------------------------------------------
// Sockets
// ---------------------------------------------------------------------------

export function GuiSocket({
  children,
  qty,
  label,
  onClick,
  selected,
  drop,
  invalid,
  disabled,
  size,
  testId,
  title,
  className = '',
  ghost,
}: {
  children?: ReactNode;
  /** Live quantity in the reserved corner. */
  qty?: ReactNode;
  /** Accessible name; empty sockets keep theirs for focus and inspection. */
  label: string;
  onClick?: () => void;
  selected?: boolean;
  drop?: boolean;
  invalid?: boolean;
  disabled?: boolean;
  size?: string;
  testId?: string;
  title?: string;
  className?: string;
  /** Drawn faintly in an empty socket (e.g. the slot's silhouette icon). */
  ghost?: ReactNode;
}) {
  const empty = !children;
  const cls = `gui-socket ${empty ? 'gui-socket--empty' : ''} ${selected ? 'is-selected' : ''} ${drop ? 'is-drop' : ''} ${invalid ? 'is-invalid' : ''} ${className}`;
  const style = size ? ({ ['--socket' as string]: size } as CSSProperties) : undefined;
  const inner = (
    <>
      {children ?? (ghost ? <span className="gui-socket__ghost">{ghost}</span> : null)}
      {qty !== undefined && qty !== null ? <span className="gui-socket__qty num">{qty}</span> : null}
    </>
  );
  if (!onClick) {
    return (
      <span className={cls} style={style} role="img" aria-label={label} title={title} data-testid={testId}>
        {inner}
      </span>
    );
  }
  return (
    <button type="button" className={cls} style={style} onClick={onClick} disabled={disabled} aria-label={label} aria-pressed={selected} title={title} data-testid={testId}>
      {inner}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Choices: selecting a tile only selects; the dialog's Confirm executes once
// ---------------------------------------------------------------------------

export interface ChoiceOption<T extends string | number> {
  readonly value: T;
  readonly title: ReactNode;
  readonly detail?: ReactNode;
  readonly icon?: ReactNode;
  /** Why this option cannot be chosen now (shown as text, with a lock). */
  readonly reason?: string | null;
  readonly testId?: string;
  /** Accessible name when the title is not plain text. */
  readonly label?: string;
}

export function ChoiceGroup<T extends string | number>({
  options,
  value,
  onChange,
  legend,
  onConfirm,
}: {
  options: readonly ChoiceOption<T>[];
  value: T | null;
  onChange: (v: T) => void;
  legend: string;
  /** Enter on a selected, valid option confirms (the same single path as the Confirm button). */
  onConfirm?: () => void;
}) {
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const enabled = options.map((o) => !o.reason);
  // Roving focus: the selected option, else the first available one.
  const selectedIndex = options.findIndex((o) => o.value === value);
  const focusIndex = selectedIndex >= 0 ? selectedIndex : options.findIndex((o) => !o.reason);
  const move = (from: number, step: number) => {
    for (let k = 1; k <= options.length; k++) {
      const i = (from + step * k + options.length * 4) % options.length;
      if (enabled[i]) {
        onChange(options[i]!.value);
        refs.current[i]?.focus();
        return;
      }
    }
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>, i: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      move(i, 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      move(i, -1);
    } else if (e.key === ' ') {
      e.preventDefault();
      if (enabled[i]) onChange(options[i]!.value);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!enabled[i]) return;
      if (options[i]!.value === value) onConfirm?.();
      else onChange(options[i]!.value);
    }
  };
  return (
    <div className="gui-choices" role="radiogroup" aria-label={legend}>
      <div className="gui-choices__legend" aria-hidden="true">
        {legend}
      </div>
      {options.map((o, i) => {
        const checked = o.value === value;
        const disabled = !!o.reason;
        return (
          <div
            key={String(o.value)}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="radio"
            aria-checked={checked}
            aria-disabled={disabled || undefined}
            aria-label={o.label}
            tabIndex={i === focusIndex ? 0 : -1}
            className="gui-choice"
            onClick={() => {
              if (!disabled) onChange(o.value);
            }}
            onKeyDown={(e) => onKey(e, i)}
            data-testid={o.testId}
          >
            {o.icon}
            <span className="gui-choice__body">
              <span className="gui-choice__title">{o.title}</span>
              {o.detail ? <span className="gui-choice__detail">{o.detail}</span> : null}
              {o.reason ? (
                <span className="gui-choice__reason">
                  <LockGlyph />
                  {o.reason}
                </span>
              ) : null}
            </span>
            <span className="gui-choice__check" aria-hidden="true" />
          </div>
        );
      })}
    </div>
  );
}

export function LockGlyph({ className = 'gui-lock' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" width="0.95em" height="0.95em" aria-hidden="true" focusable="false">
      <path d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3" y="7" width="10" height="7.5" rx="1.2" fill="currentColor" />
    </svg>
  );
}

/**
 * A select-then-confirm guard: Confirm runs the action once; while it runs,
 * and after it succeeds, further presses do nothing. With `rearmMs` (shops and
 * the marketplace, where a second, deliberate purchase is legitimate) the
 * guard opens again that long after a success, so a double click never buys
 * twice.
 */
export function useOnce(rearmMs?: number): [boolean, (run: () => boolean) => void] {
  const busy = useRef(false);
  const timer = useRef<number | null>(null);
  const [pending, setPending] = useState(false);
  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );
  const once = (run: () => boolean) => {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    let ok = false;
    try {
      ok = run();
    } finally {
      if (!ok) {
        busy.current = false;
        setPending(false);
      } else if (rearmMs !== undefined) {
        timer.current = window.setTimeout(() => {
          timer.current = null;
          busy.current = false;
          setPending(false);
        }, rearmMs);
      }
    }
  };
  return [pending, once];
}

// ---------------------------------------------------------------------------
// Encounter header
// ---------------------------------------------------------------------------

export function GuiArtHeader({ art, url, alt, wide }: { art?: GuiArt | null; url?: string | null; alt: string; wide?: boolean }) {
  const src = art?.url ?? url;
  if (!src) return null;
  return (
    <figure className={`gui-art-header ${wide ? 'gui-art-header--wide' : ''}`} style={{ margin: undefined }}>
      <img src={src} alt={alt} draggable={false} />
    </figure>
  );
}

// ---------------------------------------------------------------------------
// Faction banner (setup): the blank banner with the live emblem and name over it
// ---------------------------------------------------------------------------

export function FactionBanner({
  theme,
  name,
  caption,
  note,
  selected,
  onSelect,
  testId,
  disabled,
  tabIndex,
  onKeyDown,
  buttonRef,
  nameClassName = '',
  captionClassName = '',
}: {
  theme: GuiTheme;
  name: string;
  /** A short line under the banner (the pantheon's epithet). */
  caption?: string;
  /** A state note under the caption (e.g. not playable yet). */
  note?: string;
  selected: boolean;
  onSelect: () => void;
  testId?: string;
  disabled?: boolean;
  tabIndex?: number;
  onKeyDown?: (e: KeyboardEvent<HTMLButtonElement>) => void;
  buttonRef?: (el: HTMLButtonElement | null) => void;
  nameClassName?: string;
  captionClassName?: string;
}) {
  const emblem = resolveAsset(themeEmblemId(theme));
  const finished = kitBannerUrl(theme);
  return (
    <button
      ref={buttonRef}
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={caption ? `${name}: ${caption}` : name}
      className={`gui-banner-choice ${finished ? 'gui-banner-choice--kit' : ''}`}
      data-gui-theme={theme}
      onClick={onSelect}
      disabled={disabled}
      data-testid={testId}
      tabIndex={tabIndex}
      onKeyDown={onKeyDown}
    >
      {finished ? (
        <>
          {/* 1.1.0 frontend kit: the finished pennant (its emblem painted on the cloth), whole; the name below it in live text. */}
          <span className="gui-banner gui-banner--kit">
            <img className="gui-banner__art" src={finished} alt="" draggable={false} />
          </span>
          <span className={`gui-banner__label ${nameClassName}`}>{name}</span>
        </>
      ) : (
        /* The blank banner; the live emblem sits in its safe rectangle, the name across the plain cloth below it. */
        <span className="gui-banner">
          <span className="gui-banner__content">{emblem.url ? <img className="gui-banner__emblem" src={emblem.url} alt="" draggable={false} /> : null}</span>
          <span className={`gui-banner__name ${nameClassName}`} style={{ ['--chars' as string]: Math.max(4, name.length) }}>
            {name}
          </span>
        </span>
      )}
      {caption ? <span className={`gui-banner__caption ${captionClassName}`}>{caption}</span> : null}
      {note ? <span className="gui-banner__note">{note}</span> : null}
    </button>
  );
}

/** The frontend kit's finished pennant of a pantheon (emblem painted on), or null without the kit. */
function kitBannerUrl(theme: GuiTheme): string | null {
  return resolveAsset(`frontendkit.banner.${theme}`).url || null;
}

/** A small faction banner with its live emblem (seat rows, battle sides). Decorative: the name is given as text beside it. */
export function MiniBanner({ pantheonId, className = '' }: { pantheonId: string | null | undefined; className?: string }) {
  if (!pantheonId) return null;
  const theme = guiThemeFor(pantheonId);
  const finished = kitBannerUrl(theme);
  if (finished)
    return (
      <span className={`gui-banner gui-banner--mini gui-banner--kit ${className}`} data-gui-theme={theme} aria-hidden="true">
        <img className="gui-banner__art" src={finished} alt="" draggable={false} />
      </span>
    );
  const emblem = resolveAsset(themeEmblemId(theme)).url;
  return (
    <span className={`gui-banner gui-banner--mini ${className}`} data-gui-theme={theme} aria-hidden="true">
      {emblem ? (
        <span className="gui-banner__content">
          <img className="gui-banner__emblem" src={emblem} alt="" draggable={false} />
        </span>
      ) : null}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Open book folio: two safe page rectangles; one parchment page when narrow
// ---------------------------------------------------------------------------

/**
 * Whether a painted skin can be drawn yet (1.1.4, GUI audit): `pending` until it is decoded, then
 * `ready`, or `failed` when it cannot load. Ink-on-parchment screens show a plain paper colour
 * under their text until `ready`, so text never sits on the dark background.
 */
export function useArtState(url: string | null | undefined): ArtState {
  const [state, setState] = useState<ArtState>(() => (url ? artState(url) : 'failed'));
  useEffect(() => {
    if (!url) {
      setState('failed');
      return;
    }
    let live = true;
    setState(artState(url));
    void artReady(url).then((ok) => {
      if (live) setState(ok ? 'ready' : 'failed');
    });
    return () => {
      live = false;
    };
  }, [url]);
  return state;
}

export function Folio({ left, right, label, className = '' }: { left: ReactNode; right: ReactNode; label?: string; className?: string }) {
  const book = guiArt('gui.book.open');
  // The pages carry a paper colour of their own until the book is drawn (or when it cannot load).
  const art = useArtState(book?.url);
  const [l, r] = book?.safePageRects ?? [
    [0.1, 0.15, 0.44, 0.84],
    [0.56, 0.15, 0.9, 0.84],
  ];
  const pageStyle = (rect: readonly number[]): CSSProperties => ({ left: `${rect[0]! * 100}%`, width: `${(rect[2]! - rect[0]!) * 100}%`, top: `${rect[1]! * 100}%`, bottom: `${(1 - rect[3]!) * 100}%` });
  return (
    <div className={`gui-folio-wrap ${className}`}>
      <div className="gui-folio" role="group" aria-label={label} data-art={art}>
        <div className="gui-folio__page gui-folio__page--left gui-surface--parchment" style={pageStyle(l)}>
          {left}
        </div>
        <div className="gui-folio__page gui-folio__page--right gui-surface--parchment" style={pageStyle(r)}>
          {right}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tooltips: themed, after a short hover delay and on keyboard focus
// ---------------------------------------------------------------------------

interface Tip {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly below: boolean;
}

/** The text an element offers as a tooltip: its title (hover) or, for focus, its title or description. */
function tipText(el: Element): string | null {
  const t = el.getAttribute('title') || el.getAttribute('data-gui-tip') || el.getAttribute('aria-description');
  return t && t.trim() ? t : null;
}

function placeTip(el: Element, text: string): Tip {
  const r = el.getBoundingClientRect();
  const below = r.top < 80;
  return { text, x: Math.min(Math.max(r.left + r.width / 2, 12), window.innerWidth - 12), y: below ? r.bottom + 8 : r.top - 8, below };
}

/**
 * One tooltip for the whole interface. Hovering an element with a title shows
 * it after a short delay (the native title is set aside while the themed one is
 * up and restored after); keyboard focus shows it at once. Clicking hides it
 * until the pointer leaves. It never takes pointer events. Required
 * information never lives only here: screens show it as text too.
 */
export function TooltipLayer({ delayMs = 320 }: { delayMs?: number }) {
  const [tip, setTip] = useState<Tip | null>(null);
  const state = useRef<{ el: Element | null; saved: string | null; timer: number | null; suppressed: Element | null }>({ el: null, saved: null, timer: null, suppressed: null });
  useEffect(() => {
    const s = state.current;
    const restore = () => {
      if (s.timer !== null) window.clearTimeout(s.timer);
      s.timer = null;
      if (s.el && s.saved !== null && !s.el.hasAttribute('title')) s.el.setAttribute('title', s.saved);
      s.el = null;
      s.saved = null;
      setTip(null);
    };
    const over = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const target = (e.target as Element | null)?.closest?.('[title], [data-gui-tip]') ?? null;
      if (target === s.el) return;
      restore();
      if (!target || target === s.suppressed) return;
      const text = tipText(target);
      if (!text) return;
      s.el = target;
      s.timer = window.setTimeout(() => {
        s.timer = null;
        if (!s.el || !s.el.isConnected) return;
        // Set the native title aside while the themed tooltip shows (avoids two tooltips).
        s.saved = s.el.getAttribute('title');
        if (s.saved !== null) s.el.removeAttribute('title');
        setTip(placeTip(s.el, text));
      }, delayMs);
    };
    const out = (e: PointerEvent) => {
      const to = e.relatedTarget as Node | null;
      if (s.el && to && s.el.contains(to)) return;
      if (s.suppressed && (!to || !s.suppressed.contains(to))) s.suppressed = null;
      if (s.el) restore();
    };
    const down = () => {
      if (s.el) s.suppressed = s.el;
      restore();
    };
    // Keyboard focus shows the tooltip at once — focus moved by Tab or the arrow keys, not a dialog's
    // automatic first focus (which would cover what the dialog just opened to show).
    let navAt = 0;
    const nav = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Tab' || e.key.startsWith('Arrow')) navAt = performance.now();
    };
    const focus = (e: FocusEvent) => {
      const el = e.target as Element | null;
      if (!el || !(el as HTMLElement).matches?.(':focus-visible') || performance.now() - navAt > 400) return;
      const text = tipText(el);
      restore();
      if (!text) return;
      s.el = el;
      setTip(placeTip(el, text));
    };
    const blur = () => restore();
    const hide = () => restore();
    document.addEventListener('pointerover', over, true);
    document.addEventListener('pointerout', out, true);
    document.addEventListener('pointerdown', down, true);
    document.addEventListener('keydown', nav, true);
    document.addEventListener('focusin', focus, true);
    document.addEventListener('focusout', blur, true);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('keydown', hide, true);
    return () => {
      restore();
      document.removeEventListener('pointerover', over, true);
      document.removeEventListener('pointerout', out, true);
      document.removeEventListener('pointerdown', down, true);
      document.removeEventListener('keydown', nav, true);
      document.removeEventListener('focusin', focus, true);
      document.removeEventListener('focusout', blur, true);
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('keydown', hide, true);
    };
  }, [delayMs]);
  if (!tip) return null;
  return (
    <div className="gui-tip" role="tooltip" style={{ left: tip.x, top: tip.y, transform: `translate(-50%, ${tip.below ? '0' : '-100%'})` }}>
      {tip.text}
    </div>
  );
}
