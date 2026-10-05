/**
 * One empire's seat in a skirmish setup (random maps S19, authored skirmish
 * maps S23): its colour, pantheon, who plays it (a person on this computer or
 * the AI), the person's name and patron god — or the AI's temperament.
 */
import type { ContentCatalog } from '@pr/rules';
import { Segmented, TextInput } from './kit';
import { Emblem } from './art';
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
    <div className="seat-row" style={{ ['--seat' as string]: color }} data-testid={`seat-${i}`}>
      <span className="seat-row__swatch" aria-hidden="true" />
      <Emblem catalog={catalog} pantheonId={s.pantheonId} size="2.6rem" />
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
            <select className="select" value={s.godId ?? ''} aria-label={`Seat ${i + 1} patron god`} onChange={(e) => onChange({ godId: e.target.value || null })} data-testid={`seat-${i}-patron`}>
              {patrons.map((g) => (
                <option key={g} value={g}>
                  Patron: {catalog.gods[g]?.name}
                </option>
              ))}
            </select>
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
