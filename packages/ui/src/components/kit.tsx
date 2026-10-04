/**
 * Core UI kit: panels, buttons, tabs, chips, stats, quantity selector, toggles.
 * Presentational only — no game rules, no state mutation.
 */
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react';
import { Icon, type IconName } from '../assets/icons';

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
}) {
  return (
    <section className={`panel ${variant ? `panel--${variant}` : ''} ${className}`} style={style} data-eq={eq} aria-label={label}>
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
  readonly block?: boolean;
  /** Reason shown when disabled (tooltip + accessible description). */
  readonly disabledReason?: string | null;
}

export function Button({ variant, size, icon, block, disabledReason, children, className = '', disabled, title, ...rest }: ButtonProps) {
  const cls = ['btn', variant ? `btn--${variant}` : '', size ? `btn--${size}` : '', block ? 'btn--block' : '', !children ? 'btn--icon' : '', className].join(' ');
  const reason = disabled && disabledReason ? disabledReason : undefined;
  return (
    <button type="button" className={cls} disabled={disabled} title={reason ?? title} aria-description={reason} {...rest}>
      {icon ? <Icon name={icon} style={{ width: '1.15em', height: '1.15em' }} /> : null}
      {children}
    </button>
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
        <Icon name={icon} className="menu-btn__icon" />
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

export function StatRow({ icon, label, value, hint, up }: { icon?: IconName; label: string; value: ReactNode; hint?: string; up?: boolean }) {
  return (
    <>
      {icon ? <Icon name={icon} className="stats__icon" style={{ color: 'var(--gold-400)' }} /> : <span />}
      <span className="stats__label" title={hint}>
        {label}
      </span>
      <span className={`stats__value ${up ? 'stats__value--up' : ''}`}>{value}</span>
    </>
  );
}

export function QuantitySelector({ value, max, onChange, min = 0, label }: { value: number; max: number; min?: number; onChange: (n: number) => void; label: string }) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  return (
    <div className="qty">
      <Button size="small" onClick={() => onChange(clamp(value - 1))} disabled={value <= min} aria-label={`Decrease ${label}`}>
        −
      </Button>
      <input type="range" min={min} max={Math.max(min, max)} value={value} onChange={(e) => onChange(clamp(Number(e.target.value)))} aria-label={label} disabled={max <= min} />
      <Button size="small" onClick={() => onChange(clamp(value + 1))} disabled={value >= max} aria-label={`Increase ${label}`}>
        +
      </Button>
      <span className="qty__value num" aria-live="polite">
        {value}
      </span>
      <Button size="small" onClick={() => onChange(max)} disabled={max <= min || value === max}>
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

/** Hover/focus tooltip with delay; content is supplementary (never the only source of key info). */
export function useTooltip(delay = 450) {
  const [tip, setTip] = useState<{ x: number; y: number; content: ReactNode } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);
  const bind = (content: ReactNode) => ({
    onMouseEnter: (e: React.MouseEvent) => {
      const { clientX, clientY } = e;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setTip({ x: clientX, y: clientY, content }), delay);
    },
    onMouseMove: (e: React.MouseEvent) => setTip((t) => (t ? { ...t, x: e.clientX, y: e.clientY } : t)),
    onMouseLeave: () => {
      if (timer.current) clearTimeout(timer.current);
      setTip(null);
    },
  });
  const node = tip ? (
    <div className="tooltip panel" style={{ left: Math.min(tip.x + 16, window.innerWidth - 360), top: Math.min(tip.y + 18, window.innerHeight - 160) }}>
      {tip.content}
    </div>
  ) : null;
  return { bind, node };
}

/**
 * A dialog. `splash` (a result painting with its live title) fills the window
 * behind it; the dialog then sits in the lower half, under the painting's title
 * area.
 */
export function Modal({ title, children, footer, onClose, width, testId, splash }: { title: ReactNode; children: ReactNode; footer?: ReactNode; onClose?: () => void; width?: string; testId?: string; splash?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>('button, [href], input, select, [tabindex]:not([tabindex="-1"])');
    el?.focus();
  }, []);
  return (
    <div className={`modal-layer ${splash ? 'modal-layer--splash' : ''}`} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined} data-testid={testId}>
      {splash}
      <div ref={ref} className="modal" style={width ? { width, maxWidth: `min(${width}, 94vw)` } : undefined}>
        <Panel
          title={title}
          actions={onClose ? <Button icon="close" variant="ghost" size="small" onClick={onClose} aria-label="Close" /> : undefined}
          className="modal__panel"
          style={{ display: 'flex', flexDirection: 'column', maxHeight: '88vh' }}
          bodyClassName="scroll"
        >
          {children}
        </Panel>
        {footer ? <div className="panel modal__footer-wrap" style={{ marginTop: '-1px' }}><div className="modal__footer">{footer}</div></div> : null}
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
