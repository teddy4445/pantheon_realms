/**
 * Core UI kit: panels, buttons, tabs, chips, stats, quantity selector, toggles.
 * Presentational only — no game rules, no state mutation.
 */
import { useEffect, useRef, type ButtonHTMLAttributes, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { Icon, type IconName } from '../assets/icons';
import type { FrameTheme } from '../assets/guiArt';

/** 1.1.0 surfaces: stone for command chrome, parchment for narrative, leather for equipment. */
export type GuiSurface = 'stone' | 'parchment' | 'leather';

/** Classes of a framed 1.1.0 window: the faction frame over an inset surface. */
export function windowClasses(framed: boolean | 'compact' | undefined, surface: GuiSurface | undefined): string {
  if (!framed) return surface === 'parchment' ? 'panel--parchment gui-surface--parchment' : surface === 'leather' ? 'gui-leather' : '';
  return ['gui-window', framed === 'compact' ? 'gui-window--compact' : '', surface && surface !== 'stone' ? `gui-window--${surface}` : '', surface === 'parchment' ? 'gui-surface--parchment' : ''].join(' ');
}

export function Panel({
  title,
  actions,
  children,
  className = '',
  variant,
  style,
  bodyClassName = '',
  headerIcon,
  eq,
  label,
  framed,
  surface,
  theme,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  variant?: 'glass' | 'parchment';
  style?: CSSProperties;
  bodyClassName?: string;
  headerIcon?: IconName;
  /** Equal-height group (see the Encyclopedia's equal card heights). */
  eq?: string;
  /** Accessible name for a panel shown without a title. */
  label?: string;
  /** 1.1.0: draw the faction frame around this window (`compact` for smaller windows). */
  framed?: boolean | 'compact';
  /** 1.1.0: the window's surface (framed windows default to stone). */
  surface?: GuiSurface;
  /** 1.1.0: the frame's faction, when it differs from the screen's. */
  theme?: FrameTheme;
}) {
  return (
    <section className={`panel ${variant ? `panel--${variant}` : ''} ${windowClasses(framed, surface)} ${className}`} style={style} data-eq={eq} aria-label={label} data-gui-theme={theme}>
      <span className="panel__corner panel__corner--tl" />
      <span className="panel__corner panel__corner--tr" />
      <span className="panel__corner panel__corner--bl" />
      <span className="panel__corner panel__corner--br" />
      {title !== undefined ? (
        <header className="panel__header">
          {headerIcon ? <Icon name={headerIcon} style={{ width: '1.2rem', height: '1.2rem', color: 'var(--gold-400)' }} /> : null}
          <h2 className="panel__title">{title}</h2>
          {actions}
        </header>
      ) : null}
      <div className={`panel__body ${bodyClassName}`}>{children}</div>
    </section>
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: 'primary' | 'danger' | 'ghost';
  readonly size?: 'small' | 'large';
  readonly icon?: IconName;
  /** A painted icon (an asset URL) in place of `icon` (1.1.0 frontend kit); decorative. */
  readonly artUrl?: string | null;
  readonly block?: boolean;
  /** Reason shown when disabled (tooltip + accessible description). */
  readonly disabledReason?: string | null;
}

export function Button({ variant, size, icon, artUrl, block, disabledReason, children, className = '', disabled, title, ...rest }: ButtonProps) {
  const cls = ['btn', variant ? `btn--${variant}` : '', size ? `btn--${size}` : '', block ? 'btn--block' : '', !children ? 'btn--icon' : '', className].join(' ');
  const reason = disabled && disabledReason ? disabledReason : undefined;
  return (
    <button type="button" className={cls} disabled={disabled} title={reason ?? title} aria-description={reason} {...rest}>
      {/* Unavailable: a lock shape beside the label (not colour alone); the reason is the tooltip and description. */}
      {disabled && children ? <LockIcon /> : null}
      {artUrl ? <img className="btn__art" src={artUrl} alt="" aria-hidden="true" draggable={false} /> : icon ? <Icon name={icon} style={{ width: '1.15em', height: '1.15em' }} /> : null}
      {children}
    </button>
  );
}

function LockIcon() {
  return (
    <svg className="btn__lock" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3" y="7" width="10" height="7.5" rx="1.2" fill="currentColor" />
    </svg>
  );
}

export function MenuButton({
  icon,
  label,
  meta,
  onClick,
  disabled,
  disabledReason,
  autoFocus,
  testId,
  variant,
  onPreview,
  title,
  artUrl,
}: {
  icon: IconName;
  label: string;
  meta?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  disabledReason?: string;
  autoFocus?: boolean;
  testId?: string;
  /** 'framed': the ornate main-menu entry; 'compact': a small secondary entry. */
  variant?: 'framed' | 'compact';
  /** Called on hover/focus so a screen can show a longer description elsewhere. */
  onPreview?: (on: boolean) => void;
  title?: string;
  /** A painted icon (an asset URL) in place of `icon`; decorative. */
  artUrl?: string | null;
}) {
  return (
    <button
      type="button"
      className={`menu-btn ${variant ? `menu-btn--${variant}` : ''}`}
      onClick={onClick}
      disabled={disabled}
      title={disabled ? disabledReason : title}
      autoFocus={autoFocus}
      data-testid={testId}
      onMouseEnter={onPreview ? () => onPreview(true) : undefined}
      onMouseLeave={onPreview ? () => onPreview(false) : undefined}
      onFocus={onPreview ? () => onPreview(true) : undefined}
      onBlur={onPreview ? () => onPreview(false) : undefined}
    >
      <span className="menu-btn__socket">
        {artUrl ? <img className="menu-btn__icon menu-btn__art" src={artUrl} alt="" aria-hidden="true" draggable={false} /> : <Icon name={icon} className="menu-btn__icon" />}
      </span>
      <span className="menu-btn__text">
        <span className="menu-btn__label">{label}</span>
        {meta ? <span className="menu-btn__meta">{meta}</span> : null}
        {disabled && disabledReason ? <span className="menu-btn__meta">{disabledReason}</span> : null}
      </span>
      {!disabled && variant !== 'compact' ? <span className="menu-btn__chev" aria-hidden="true">›</span> : null}
    </button>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange, label }: { tabs: readonly { id: T; label: string; badge?: ReactNode }[]; value: T; onChange: (t: T) => void; label: string }) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button key={t.id} type="button" role="tab" className="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}>
          {t.label} {t.badge}
        </button>
      ))}
    </div>
  );
}

export function Chip({ tone, children, title }: { tone?: 'ok' | 'warn' | 'bad' | 'info' | 'muted'; children: ReactNode; title?: string }) {
  return (
    <span className={`chip ${tone ? `chip--${tone}` : ''}`} title={title}>
      {children}
    </span>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <div className="section-title">{children}</div>;
}

export function Rule() {
  return <div className="ornament-rule" />;
}

export function QuantitySelector({ value, max, onChange, min = 0, label }: { value: number; max: number; min?: number; onChange: (n: number) => void; label: string }) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  return (
    <div className="qty">
      {/* Step controls at their limit are simply inactive: no lock (nothing is withheld). */}
      <Button size="small" className="gui-no-lock" onClick={() => onChange(clamp(value - 1))} disabled={value <= min} aria-label={`Decrease ${label}`}>
        −
      </Button>
      <input type="range" min={min} max={Math.max(min, max)} value={value} onChange={(e) => onChange(clamp(Number(e.target.value)))} aria-label={label} disabled={max <= min} />
      <Button size="small" className="gui-no-lock" onClick={() => onChange(clamp(value + 1))} disabled={value >= max} aria-label={`Increase ${label}`}>
        +
      </Button>
      <span className="qty__value num" aria-live="polite">
        {value}
      </span>
      <Button size="small" className="gui-no-lock" onClick={() => onChange(max)} disabled={max <= min || value === max}>
        Max
      </Button>
    </div>
  );
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return <button type="button" role="switch" className="toggle" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)} />;
}

export function Bar({ value, max, kind, label }: { value: number; max: number; kind?: 'xp' | 'mana' | 'move' | 'hp'; label?: string }) {
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="bar" role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label}>
      <div className={`bar__fill ${kind ? `bar__fill--${kind}` : ''}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// `a[href]`, not `[href]`: icon art is an SVG <image href>, which cannot take focus.
const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

function focusables(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el instanceof HTMLElement && (el.offsetParent !== null || el === document.activeElement));
}

/**
 * Focus for a modal window: move focus inside on open (an autofocused control,
 * else the first focusable one), keep Tab inside while open, and give focus
 * back to the control that opened it when it closes.
 */
export function useModalFocus(ref: { current: HTMLElement | null }): (e: ReactKeyboardEvent) => void {
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const root = ref.current;
    if (root && !root.contains(document.activeElement)) {
      // An autofocused control, else the first control of the body, then of the footer, then Close.
      const body = root.querySelector<HTMLElement>('.panel__body');
      const foot = root.querySelector<HTMLElement>('.modal__footer');
      const first = root.querySelector<HTMLElement>('[data-autofocus]') ?? (body && focusables(body)[0]) ?? (foot && focusables(foot)[0]) ?? focusables(root)[0];
      first?.focus({ preventScroll: true });
    }
    return () => {
      if (opener && opener !== document.body && opener.isConnected && typeof opener.focus === 'function') opener.focus({ preventScroll: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (e: ReactKeyboardEvent) => {
    if (e.key !== 'Tab' || !ref.current) return;
    const list = focusables(ref.current);
    if (list.length === 0) return;
    const first = list[0]!;
    const last = list[list.length - 1]!;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
}

/**
 * A dialog (1.1.0): one faction frame around the title, the scrolling body and
 * the footer, over a stone (commands) or parchment (narrative) surface; the map
 * stays visible under a modest dimming and does not take clicks while it is
 * open. `art` is an optional header illustration. `splash` (a result painting
 * with its live title) fills the window behind it; the dialog then sits in the
 * lower half, under the painting's title area.
 */
export function Modal({
  title,
  children,
  footer,
  onClose,
  width,
  testId,
  splash,
  surface = 'stone',
  theme,
  art,
  compact,
}: {
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  onClose?: () => void;
  width?: string;
  testId?: string;
  splash?: ReactNode;
  surface?: GuiSurface;
  theme?: FrameTheme;
  art?: ReactNode;
  compact?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const trap = useModalFocus(ref);
  // The frame and its padding come on top of the content width the dialog asked for.
  const w = width ? `calc(${width} + ${compact ? '2.4rem' : '3.4rem'})` : undefined;
  return (
    <div
      className={`modal-layer ${splash ? 'modal-layer--splash' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === 'string' ? title : undefined}
      data-testid={testId}
      data-gui-theme={theme}
      onKeyDown={(e) => {
        // Escape closes a closable dialog (and only the dialog: the screen behind stays where it is).
        if (e.key === 'Escape' && onClose) {
          e.preventDefault();
          e.stopPropagation();
          onClose();
          return;
        }
        trap(e);
      }}
    >
      {splash}
      <div ref={ref} className="modal gui-modal" style={w ? { width: w, maxWidth: `min(${w}, 96vw)` } : undefined}>
        <section className={`panel modal__panel ${windowClasses(compact ? 'compact' : true, surface)}`}>
          <header className="panel__header">
            <h2 className="panel__title">{title}</h2>
          </header>
          {onClose ? <Button icon="close" variant="ghost" size="small" onClick={onClose} aria-label="Close" className="gui-modal__close" /> : null}
          <div className="panel__body scroll">
            {art}
            {children}
          </div>
          {footer ? <div className="modal__footer gui-modal__footer">{footer}</div> : null}
        </section>
      </div>
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

/** A small radio group of buttons (difficulty, controller, map size…). */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  testId,
}: {
  value: T;
  options: readonly { id: T; label: string; disabled?: boolean; title?: string }[];
  onChange: (v: T) => void;
  label: string;
  testId?: string;
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label} data-testid={testId}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          className={`segmented__opt ${value === o.id ? 'is-selected' : ''}`}
          disabled={o.disabled}
          title={o.title}
          onClick={() => onChange(o.id)}
          data-testid={testId ? `${testId}-${o.id}` : undefined}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function TextInput({ value, onChange, label, maxLength = 24, placeholder, testId }: { value: string; onChange: (v: string) => void; label: string; maxLength?: number; placeholder?: string; testId?: string }) {
  return <input type="text" className="text-input" value={value} maxLength={maxLength} placeholder={placeholder} aria-label={label} onChange={(e) => onChange(e.target.value)} data-testid={testId} />;
}
