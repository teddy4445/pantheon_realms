/**
 * One empire's seat in a skirmish setup (random maps S19, authored skirmish
 * maps S23): its colour, pantheon, who plays it (a person on this computer or
 * the AI), the person's name and patron god (shown, not picked: one per
 * pantheon) — or the AI's temperament.
 *
 * 1.1.0: each seat flies its pantheon's banner with the live emblem; a human
 * seat shows its patron's real portrait. The seat count always comes from the
 * map (authored) or the empire count (random).
 */
import type { ContentCatalog } from '@pr/rules';
import { Segmented, TextInput } from './kit';
import { GodPortrait } from './art';
import { MiniBanner } from './gui';
import { guiThemeFor } from '../assets/guiArt';
import { TemperamentNote } from './temperament';

export interface SeatDraft {
  pantheonId: string;
  controller: 'human' | 'ai';
  name: string;
  godId: string | null;
}

/** The implemented patron gods of a pantheon (a human seat picks one). */
export function patronsOf(catalog: ContentCatalog, pantheonId: string): string[] {
  return (catalog.pantheons[pantheonId]?.godIds ?? []).filter((g) => catalog.gods[g]?.role === 'patron' && catalog.gods[g]?.implementationStatus === 'implemented');
}

/** A seat patch that also resets the patron when the pantheon changes. */
export function patchSeat(catalog: ContentCatalog, s: SeatDraft, patch: Partial<SeatDraft>): SeatDraft {
  const next = { ...s, ...patch };
  if (patch.pantheonId && patch.pantheonId !== s.pantheonId) next.godId = patronsOf(catalog, patch.pantheonId)[0] ?? null;
  return next;
}

export function SeatRow({
  catalog,
  index,
  seat,
  color,
  pantheons,
  temperaments,
  onChange,
}: {
  catalog: ContentCatalog;
  index: number;
  seat: SeatDraft;
  color: string;
  pantheons: readonly string[];
  temperaments: boolean;
  onChange: (patch: Partial<SeatDraft>) => void;
}) {
  const i = index;
  const s = seat;
  const patrons = patronsOf(catalog, s.pantheonId);
  return (
    <div className="seat-row" style={{ ['--seat' as string]: color }} data-gui-theme={guiThemeFor(s.pantheonId)} data-testid={`seat-${i}`}>
      <span className="seat-row__swatch" aria-hidden="true" title={`Seat ${i + 1} colour`} />
      <MiniBanner pantheonId={s.pantheonId} className="seat-row__banner" />
      <div className="seat-row__fields">
        <div className="row gap wrap">
          <select className="select" value={s.pantheonId} aria-label={`Seat ${i + 1} pantheon`} onChange={(e) => onChange({ pantheonId: e.target.value })} data-testid={`seat-${i}-pantheon`}>
            {pantheons.map((id) => (
              <option key={id} value={id}>
                {catalog.pantheons[id]?.name}
              </option>
            ))}
          </select>
          <Segmented
            label={`Seat ${i + 1} controller`}
            value={s.controller}
            options={[
              { id: 'human', label: 'Human' },
              { id: 'ai', label: 'AI' },
            ]}
            onChange={(v) => onChange({ controller: v })}
            testId={`seat-${i}-controller`}
          />
        </div>
        {s.controller === 'human' ? (
          <div className="row gap wrap">
            <TextInput label={`Seat ${i + 1} name`} value={s.name} onChange={(v) => onChange({ name: v })} testId={`seat-${i}-name`} />
            {/* Every pantheon has one patron, so there is nothing to pick (owner request 2026-10-07); a picker returns only if a pantheon gains a second. */}
            {patrons.length > 1 ? (
              <select className="select" value={s.godId ?? ''} aria-label={`Seat ${i + 1} patron god`} onChange={(e) => onChange({ godId: e.target.value || null })} data-testid={`seat-${i}-patron`}>
                {patrons.map((g) => (
                  <option key={g} value={g}>
                    Patron: {catalog.gods[g]?.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="small dim seat-row__patron" data-testid={`seat-${i}-patron-name`}>
                {catalog.gods[s.godId ?? patrons[0] ?? ''] ? <GodPortrait catalog={catalog} godId={s.godId ?? patrons[0]!} size="2.2rem" /> : null}
                Patron: {catalog.gods[s.godId ?? patrons[0] ?? '']?.name ?? '—'}
              </span>
            )}
          </div>
        ) : (
          <div className="small dim">
            AI empire · no patron (as in other skirmishes)
            {temperaments ? (
              <>
                {' · '}
                <TemperamentNote catalog={catalog} pantheonId={s.pantheonId} testId={`seat-${i}-temperament`} />
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
