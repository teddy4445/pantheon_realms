/**
 * Game-specific presentational components: resource bar, cost lists, army
 * strips, screen headers, status chips and creature stat blocks.
 * They render data; interaction callbacks are supplied by screens.
 */
import { AbilityBadges } from './badges';
import type { ReactNode } from 'react';
import {
  RESOURCE_KEYS,
  RESOURCE_LABELS,
  type ArmyState,
  type ContentCatalog,
  type CreatureDefinition,
  type ResourceCost,
  type ResourceKey,
} from '@pr/rules';
import { Icon, RESOURCE_ICON } from '../assets/icons';
import { Button, Chip } from './kit';
import { CreaturePortrait } from './art';
import { useStore } from '../app/context';
import { SCREEN_CODES, type ScreenId } from '../app/store';
import { dayLabel, formatNumber } from '../app/view';

export function ResourceBar({ wallet, income, compact }: { wallet: Readonly<Record<ResourceKey, number>>; income?: Readonly<Record<ResourceKey, number>>; compact?: boolean }) {
  return (
    <div className="resbar" role="group" aria-label="Resources">
      {RESOURCE_KEYS.map((k) => (
        <div key={k} className="res" title={`${RESOURCE_LABELS[k]}${income ? ` (+${income[k]} per day)` : ''}`}>
          <Icon name={RESOURCE_ICON[k]!} className="res__icon" />
          <div>
            <div className="res__value" data-testid={`res-${k}`}>
              {formatNumber(wallet[k])}
            </div>
            {!compact ? (
              income && income[k] > 0 ? <div className="res__delta">+{formatNumber(income[k])}/day</div> : <div className="res__label">{RESOURCE_LABELS[k]}</div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export function CostList({ cost, wallet, empty = 'Free' }: { cost: ResourceCost; wallet?: Readonly<Record<ResourceKey, number>>; empty?: string }) {
  const items = RESOURCE_KEYS.filter((k) => (cost[k] ?? 0) > 0);
  if (items.length === 0) return <span className="cost dim">{empty}</span>;
  return (
    <span className="cost">
      {items.map((k) => {
        const short = wallet ? wallet[k] < (cost[k] ?? 0) : false;
        return (
          <span key={k} className={`cost__item ${short ? 'cost__item--short' : ''}`} title={`${RESOURCE_LABELS[k]}${short ? ` — you have ${wallet?.[k]}` : ''}`}>
            <Icon name={RESOURCE_ICON[k]!} />
            {formatNumber(cost[k] ?? 0)}
            {short ? <span className="sr-only"> (not enough)</span> : null}
          </span>
        );
      })}
    </span>
  );
}

export function ArmyStrip({
  catalog,
  army,
  selected,
  onSlot,
  onInfo,
  dropTargets,
  label,
  testId,
}: {
  catalog: ContentCatalog;
  army: ArmyState;
  selected?: number | null;
  onSlot?: (slot: number) => void;
  onInfo?: (creatureId: string) => void;
  dropTargets?: readonly number[];
  label: string;
  testId?: string;
}) {
  return (
    <div className="army" role="list" aria-label={label} data-testid={testId}>
      {army.slots.map((s, i) => {
        const cls = ['slot', s ? '' : 'slot--empty', selected === i ? 'slot--selected' : '', dropTargets?.includes(i) ? 'slot--droptarget' : ''].join(' ');
        const def = s ? catalog.creatures[s.creatureId] : undefined;
        return (
          <button
            key={i}
            type="button"
            role="listitem"
            className={cls}
            onClick={() => onSlot?.(i)}
            onContextMenu={(e) => {
              if (s && onInfo) {
                e.preventDefault();
                onInfo(s.creatureId);
              }
            }}
            aria-label={s && def ? `Slot ${i + 1}: ${s.count} ${s.count === 1 ? def.name : def.pluralName}` : `Slot ${i + 1}: empty`}
            disabled={!onSlot}
          >
            <span className="slot__index">{i + 1}</span>
            {s ? (
              <>
                <span className="slot__art">
                  <CreaturePortrait catalog={catalog} creatureId={s.creatureId} size="100%" style={{ border: 'none', boxShadow: 'none', width: '100%', height: '100%' }} />
                </span>
                <span className="slot__count num">{s.count}</span>
                <AbilityBadges catalog={catalog} creatureId={s.creatureId} size="0.85rem" />
              </>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** Standard in-game screen chrome: title, screen code, resources and back. */
export function ScreenHeader({ title, subtitle, back = true, right, onBack }: { title: ReactNode; subtitle?: ReactNode; back?: boolean; right?: ReactNode; onBack?: () => void }) {
  const store = useStore();
  const state = store.session?.state;
  const player = state ? state.players[store.session!.humanPlayerId] : undefined;
  const code = SCREEN_CODES[store.screen.id as ScreenId];
  return (
    <header className="screen-header">
      {back ? <Button icon="back" onClick={onBack ?? (() => store.back())} aria-label="Back" title="Back (Esc)" className="screen-header__back" /> : null}
      <div className="screen-header__titles">
        <h1 className="screen-header__title">{title}</h1>
        {subtitle ? <div className="screen-header__subtitle">{subtitle}</div> : null}
      </div>
      <span className="screen-header__code" aria-hidden="true">
        {code}
      </span>
      <div className="screen-header__right">
        {right}
        {player && state ? (
          <>
            <ResourceBar wallet={player.wallet} compact />
            <div className="daybox" title={`Day ${state.day}`}>
              <Icon name="hourglass" />
              <span>{dayLabel(state).text}</span>
            </div>
          </>
        ) : null}
      </div>
    </header>
  );
}

export function StatusChip({ status }: { status: string }) {
  if (status === 'implemented') return <Chip tone="ok">Implemented</Chip>;
  if (status === 'preparation') return <Chip tone="info" title="Names and topology only — not playable in this build">Preparation</Chip>;
  if (status === 'planned') return <Chip tone="muted" title="Documented location or concept without approved mechanics">Planned</Chip>;
  return <Chip>{status}</Chip>;
}

export function BalanceChip({ status }: { status: string }) {
  if (status === 'proposed_unplaytested') return <Chip tone="warn" title="Proposed values — not yet playtested">Balance: proposed</Chip>;
  if (status === 'approved') return <Chip tone="ok">Balance: approved</Chip>;
  return null;
}

export function CreatureStats({ def, compare }: { def: CreatureDefinition; compare?: CreatureDefinition }) {
  const s = def.stats;
  if (!s) return <p className="dim">Statistics are not designed for this preparation creature yet.</p>;
  const c = compare?.stats;
  const row = (icon: Parameters<typeof Icon>[0]['name'], label: string, v: ReactNode, cv?: number, vv?: number) => (
    <>
      <Icon name={icon} className="stats__icon" style={{ color: 'var(--gold-400)' }} />
      <span className="stats__label">{label}</span>
      <span className={`stats__value ${cv !== undefined && vv !== undefined && vv > cv ? 'stats__value--up' : ''}`}>{v}</span>
    </>
  );
  return (
    <div className="stats">
      {row('attack', 'Attack', s.attack, c?.attack, s.attack)}
      {row('defense', 'Defense', s.defense, c?.defense, s.defense)}
      {row('damage', 'Damage', `${s.damageMin}–${s.damageMax}`, c ? c.damageMax : undefined, s.damageMax)}
      {row('hp', 'Health', s.hp, c?.hp, s.hp)}
      {row('speed', 'Speed', s.speed, c?.speed, s.speed)}
      {s.shots > 0 ? row('shots', 'Shots', s.shots, c?.shots, s.shots) : null}
      {s.shots > 0 && s.range ? row('range', 'Range', `${s.range} hexes (full damage up to ${Math.floor(s.range / 2)})`, c?.range, s.range) : null}
      {row('info', 'Size', s.footprint === 2 ? 'Two hexes' : 'One hex')}
    </div>
  );
}

export function CreatureChip({ catalog, creatureId, count, onClick }: { catalog: ContentCatalog; creatureId: string; count?: number; onClick?: () => void }) {
  const def = catalog.creatures[creatureId];
  if (!def) return null;
  return (
    <button type="button" className="creature-chip" onClick={onClick} disabled={!onClick}>
      <CreaturePortrait catalog={catalog} creatureId={creatureId} size="2.2rem" />
      <span>
        {count !== undefined ? <strong className="num">{count} </strong> : null}
        {count === 1 || count === undefined ? def.name : def.pluralName}
      </span>
    </button>
  );
}
