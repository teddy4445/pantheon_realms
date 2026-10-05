/**
 * An AI rival's temperament (scenario feature `aiTemperaments`, proposed
 * 2026-10-04): the pantheon's way of playing — name and one sentence — shown
 * where the rival is chosen. It changes only the AI's choices, never a rule.
 */
import type { ContentCatalog } from '@pr/rules';

export function TemperamentNote({ catalog, pantheonId, testId = 'rival-temperament', className = '' }: { catalog: ContentCatalog; pantheonId: string; testId?: string; className?: string }) {
  const t = catalog.aiTemperaments?.[pantheonId];
  if (!t) return null;
  return (
    <span className={`temperament-note small ${className}`} data-testid={testId} data-temperament={t.id}>
      <strong className="temperament-note__name">{t.name}</strong> — {t.summary}
    </span>
  );
}
