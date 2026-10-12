/**
 * Reward presentation (1.1.0 encounter scenes, `docs/encounters-v1.1.0`): the
 * blank velvet tray (`encounterkit.reward.tray`) carrying live item cells —
 * resource and statistic icons, artifact and creature pictures, real amounts
 * and names — inside the tray's safe rectangle (x 11–89 %, y 25–75 %). A long
 * list, or a narrow window, uses a plain dark panel instead of stretching the
 * ornate tray. Every value is text in the DOM at once (the short reveal is
 * decoration only; reduced motion shows the final state).
 */
import { useId, useRef, type CSSProperties } from 'react';
import type { ContentCatalog } from '@pr/rules';
import { useStore } from '../app/context';
import type { ReceiptItem, RewardReceipt } from '../app/rewards';
import { Button, useModalFocus } from './kit';
import { ArtifactIcon, CreaturePortrait } from './art';
import { CostList } from './game';
import { ArtIcon } from './frontend';
import { encounterKitArt } from '../assets/manifest';

/** One reward: its picture, the amount and what it is (and where it went, when that matters). */
export function RewardCell({ catalog, item, index = 0 }: { catalog: ContentCatalog; item: ReceiptItem; index?: number }) {
  const art = catalog.artifacts[item.artifactId ?? ''];
  return (
    <li className={`reward-cell reward-cell--${item.kind}`} style={{ ['--i' as string]: Math.min(index, 6) } as CSSProperties} data-testid={`reward-${item.key}`}>
      <span className="reward-cell__pic" aria-hidden="true">
        {item.kind === 'artifact' && art ? (
          <ArtifactIcon iconAssetId={art.iconAssetId} kind={art.slot} size="100%" rarity={art.rarity} />
        ) : item.kind === 'creature' && item.creatureId ? (
          <CreaturePortrait catalog={catalog} creatureId={item.creatureId} size="100%" />
        ) : (
          <ArtIcon id={item.iconId} glyph="star" />
        )}
      </span>
      {item.amount ? <span className="reward-cell__amount">{item.amount}</span> : null}
      <span className="reward-cell__label">{item.label}</span>
      {item.note ? <span className="reward-cell__note">{item.note}</span> : null}
    </li>
  );
}

/**
 * The tray with its items. `compact` is the small passing notice; `plain`
 * forces the stacked dark panel (lists longer than five use it by themselves).
 */
export function RewardTray({ items, label, compact, plain }: { items: readonly ReceiptItem[]; label: string; compact?: boolean; plain?: boolean }) {
  const catalog = useStore().catalog;
  const tray = encounterKitArt('encounterkit.reward.tray');
  const ornate = !!tray && !plain && items.length <= 5;
  const [l, t, r, b] = tray?.safe ?? [0.11, 0.25, 0.89, 0.75];
  const safe: CSSProperties | undefined = ornate ? { left: `${l * 100}%`, top: `${t * 100}%`, right: `${(1 - r) * 100}%`, bottom: `${(1 - b) * 100}%` } : undefined;
  return (
    <div className={`reward-tray ${ornate ? 'is-ornate' : 'is-plain'} ${compact ? 'is-compact' : ''}`} style={ornate && tray ? { aspectRatio: `${tray.width} / ${tray.height}` } : undefined}>
      {ornate && tray ? <img className="reward-tray__art" src={tray.url} alt="" aria-hidden="true" draggable={false} decoding="async" /> : null}
      <ul className="reward-tray__items" style={safe} aria-label={label}>
        {items.map((it, i) => (
          <RewardCell key={it.key} catalog={catalog} item={it} index={i} />
        ))}
      </ul>
    </div>
  );
}

/** The receipt dialog for one completed action. Continue only dismisses it; it never runs the action again. */
export function RewardDialog({ receipt }: { receipt: RewardReceipt }) {
  const store = useStore();
  const ref = useRef<HTMLDivElement>(null);
  const trap = useModalFocus(ref);
  const titleId = useId();
  return (
    <div className="modal-layer reward-layer" role="dialog" aria-modal="true" aria-labelledby={titleId} data-testid="reward" onKeyDown={trap}>
      <div className="reward" ref={ref}>
        <ArtIcon id="icon.ui.gift" glyph="star" className="reward__mark" />
        <div className="reward__kicker">{receipt.source}</div>
        <h2 className="reward__title" id={titleId}>
          {receipt.title}
        </h2>
        <p className="reward__lead">Received:</p>
        <RewardTray items={receipt.items} label="Rewards received" />
        {receipt.costs ? (
          <p className="reward__costs">
            <span>Paid</span> <CostList cost={receipt.costs} />
          </p>
        ) : null}
        {receipt.notes.map((n) => (
          <p key={n} className="reward__note">
            {n}
          </p>
        ))}
        <Button variant="primary" size="large" onClick={() => store.closeOverlay()} data-autofocus="true" data-testid="reward-continue">
          Continue
        </Button>
      </div>
    </div>
  );
}
