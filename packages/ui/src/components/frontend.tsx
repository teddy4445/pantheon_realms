/**
 * Release 1.1.0 pre-game shell (handoff `docs/frontend-v1.1.0`): the quiet
 * painted backdrop behind a screen, an illustrated choice tile (New Game modes,
 * random map types, skirmish maps) and the empty-archive state. Presentational
 * only; screens keep their own state, routes and commands.
 */
import { type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { frontendArt, resolveAsset } from '../assets/manifest';
import { ScreenHeader } from './game';
import { Icon, type IconName } from '../assets/icons';

export type Backdrop = 'title-hall' | 'atlas' | 'library' | 'battle-room';

/** An absolute URL for a CSS custom property (a relative one would resolve against the stylesheet using it). */
function cssUrl(url: string): string {
  try {
    return `url("${new URL(url, document.baseURI).href}")`;
  } catch {
    return `url("${url}")`;
  }
}

/** The backdrop as a style for any screen root (`.screen` and `.setup-screen` paint `--app-art` under their shade). */
export function backdropStyle(backdrop: Backdrop): CSSProperties | undefined {
  const art = frontendArt(`frontend.backdrop.${backdrop}`);
  return art ? ({ ['--app-art' as string]: cssUrl(art.url) } as CSSProperties) : undefined;
}

/** The frontend kit's blank title plate and round socket as CSS variables (absolute URLs), when present. */
function plateStyle(): CSSProperties {
  const plate = resolveAsset('frontendkit.chrome.header').url;
  const socket = resolveAsset('frontendkit.chrome.round-socket').url;
  return { ...(plate ? { ['--fe-plate' as string]: cssUrl(plate) } : {}), ...(socket ? { ['--fe-socket' as string]: cssUrl(socket) } : {}) } as CSSProperties;
}

/**
 * A pre-game screen: the backdrop, the title bar (the same ScreenHeader, shown
 * as a title plaque), one main region and a footer for the screen's actions,
 * which stays visible while the region scrolls.
 */
export function FrontendShell({
  backdrop,
  title,
  onBack,
  right,
  footer,
  className = '',
  children,
  testId,
  label,
}: {
  backdrop: Backdrop;
  title: ReactNode;
  onBack?: () => void;
  right?: ReactNode;
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
  testId?: string;
  label?: string;
}) {
  return (
    <div
      className={`screen fe-shell fe-shell--${backdrop} ${className}`}
      style={{ ...backdropStyle(backdrop), ...plateStyle() }}
      data-testid={testId}
      data-backdrop={backdrop}
      data-plate={resolveAsset('frontendkit.chrome.header').url ? '' : undefined}
    >
      <ScreenHeader title={title} onBack={onBack} right={right} />
      <main className="fe-shell__main" aria-label={label}>
        {children}
      </main>
      {footer ? <footer className="fe-shell__footer">{footer}</footer> : null}
    </div>
  );
}

/**
 * One illustrated choice: the painting on top, the live name and a short
 * description below. The whole tile is one control. As a radio (`selected`
 * given) it shows a gold outline and a check; unavailable choices say why.
 */
export function IllustratedChoice({
  artId,
  artUrl,
  name,
  description,
  selected,
  onSelect,
  disabledReason,
  testId,
  role,
  tabIndex,
  onKeyDown,
  buttonRef,
  className = '',
  children,
  title,
}: {
  artId?: string;
  artUrl?: string | null;
  name: ReactNode;
  description?: ReactNode;
  /** undefined: a plain button (New Game); true/false: a radio tile. */
  selected?: boolean;
  onSelect: () => void;
  disabledReason?: string | null;
  testId?: string;
  role?: 'radio' | 'button';
  tabIndex?: number;
  onKeyDown?: (e: KeyboardEvent<HTMLButtonElement>) => void;
  buttonRef?: (el: HTMLButtonElement | null) => void;
  className?: string;
  children?: ReactNode;
  title?: string;
}) {
  const url = artUrl ?? (artId ? frontendArt(artId)?.url : null);
  const radio = selected !== undefined;
  return (
    <button
      ref={buttonRef}
      type="button"
      role={role ?? (radio ? 'radio' : undefined)}
      aria-checked={radio ? selected : undefined}
      aria-disabled={disabledReason ? true : undefined}
      className={`fe-choice ${selected ? 'is-selected' : ''} ${disabledReason ? 'is-unavailable' : ''} ${className}`}
      onClick={() => {
        if (!disabledReason) onSelect();
      }}
      onKeyDown={onKeyDown}
      tabIndex={tabIndex}
      title={disabledReason ?? title}
      data-testid={testId}
    >
      <span className="fe-choice__art">{url ? <img src={url} alt="" draggable={false} loading="lazy" decoding="async" /> : null}</span>
      <span className="fe-choice__text">
        <span className="fe-choice__name">{name}</span>
        {description ? <span className="fe-choice__desc">{description}</span> : null}
        {disabledReason ? <span className="fe-choice__reason">{disabledReason}</span> : null}
        {children}
      </span>
      {radio ? <span className="fe-choice__check" aria-hidden="true" /> : null}
    </button>
  );
}

/** Arrow-key movement inside a group of radio tiles (one tab stop; Space or Enter selects). */
export function radioKeys<T>(items: readonly T[], index: number, select: (item: T, i: number) => void, refs: { current: (HTMLButtonElement | null)[] }, columns = 1) {
  return (e: KeyboardEvent<HTMLButtonElement>) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowDown' ? columns : e.key === 'ArrowUp' ? -columns : 0;
    if (!step) return;
    e.preventDefault();
    const j = Math.max(0, Math.min(items.length - 1, index + step));
    select(items[j]!, j);
    refs.current[j]?.focus();
  };
}

/** The empty state of an archive (saves, map library, records): the decorative prop, the message and a real action. */
export function EmptyArchive({ title, children, action, testId }: { title: string; children?: ReactNode; action?: ReactNode; testId?: string }) {
  const art = frontendArt('frontend.empty.archive');
  return (
    <div className="fe-empty" data-testid={testId}>
      {art ? <img className="fe-empty__art" src={art.url} alt="" draggable={false} /> : null}
      <div className="fe-empty__text">
        <div className="fe-empty__title">{title}</div>
        {children ? <div className="fe-empty__body">{children}</div> : null}
        {action ? <div className="fe-empty__action">{action}</div> : null}
      </div>
    </div>
  );
}

/**
 * A painted icon by asset ID (the frontend kit's `frontendkit.icon.*` or an
 * existing `icon.*`), contained in a square; decorative (the label beside it
 * names the action). Nothing when the asset is missing.
 */
export function ArtIcon({ id, className = '', size, glyph, label }: { id: string; className?: string; size?: string; /** Drawn when the asset is missing. */ glyph?: IconName; /** Makes the icon meaningful (alt text) instead of decorative. */ label?: string }) {
  const url = resolveAsset(id).url;
  const style = size ? { width: size, height: size } : undefined;
  if (!url) return glyph ? <Icon name={glyph} className={`art-icon ${className}`} style={style} title={label} /> : null;
  return <img className={`art-icon ${className}`} src={url} alt={label ?? ''} aria-hidden={label ? undefined : true} draggable={false} style={style} data-art={id} />;
}

/** The URL of a painted icon, for components that take one (`Button artUrl`). */
export function artUrl(id: string): string | null {
  return resolveAsset(id).url || null;
}
