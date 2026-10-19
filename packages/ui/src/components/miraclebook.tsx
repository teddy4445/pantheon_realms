/**
 * Divine interventions (miracles) as a book of Favor, in the same open-tome
 * design as the spellbook (owner request 2026-10-04): the use filter (all,
 * battle, map) is always there; each miracle shows its picture (the painted
 * card when delivered, else its icon), a Favor gem with its cost, where it can
 * be invoked, its pantheon's crest when it belongs to one, and its effect.
 * Presentational: invoking calls back into the screen, which sends the
 * command (or enters targeting). The rules quote decides what is legal.
 */
import { useState, type ReactNode } from 'react';
import type { ContentCatalog, InterventionDefinition } from '@pr/rules';
import { useStore } from '../app/context';
import { Button, Modal } from './kit';
import { Emblem, SpellIcon } from './art';
import { miracleCardArt } from '../assets/momentArt';

type Use = 'all' | 'battle' | 'adventure';

export interface MiracleOption {
  readonly legal: boolean;
  readonly reason: string | null;
}

export function MiracleBook({
  catalog,
  title,
  miracles,
  favor,
  context,
  usedThisWeek,
  options,
  onInvoke,
  onClose,
  extra,
  testId,
  idPrefix,
}: {
  catalog: ContentCatalog;
  title: string;
  miracles: readonly InterventionDefinition[];
  favor: number;
  /** Where the book is opened: only miracles of this context can be invoked. */
  context: 'battle' | 'adventure';
  usedThisWeek: boolean;
  options: Readonly<Record<string, MiracleOption>>;
  onInvoke: (id: string) => void;
  onClose: () => void;
  /** Anything the screen adds above the pages (e.g. the town for town miracles). */
  extra?: ReactNode;
  testId: string;
  /** Test-id prefix of each miracle button (`invoke-` on the map, `battle-miracle-` in battle). */
  idPrefix: string;
}) {
  const store = useStore();
  const [use, setUseState] = useState<Use>(context);
  const setUse = (u: Use) => {
    if (u !== use) store.audio?.effect('ui.book_page');
    setUseState(u);
  };
  const count = (u: Use) => miracles.filter((d) => u === 'all' || d.context === u).length;
  const shown = miracles.filter((d) => use === 'all' || d.context === use).sort((a, b) => a.favorCost - b.favorCost || (a.name < b.name ? -1 : 1));
  return (
    <Modal title={title} onClose={onClose} width="64rem" testId={testId}>
      <div className="tome tome--favor">
        <div className="tome__bar">
          <div className="tome__filters" role="group" aria-label="Filter miracles">
            <div className="tome__tabs" role="radiogroup" aria-label="Use">
              {(['all', 'battle', 'adventure'] as const).map((u) => (
                <button key={u} type="button" role="radio" aria-checked={use === u} className={`tome__tab ${use === u ? 'is-on' : ''}`} onClick={() => setUse(u)} data-testid={`miracle-use-${u}`}>
                  {u === 'all' ? 'All' : u === 'battle' ? 'Battle' : 'Map'}
                  <span className="tome__count">{count(u)}</span>
                </button>
              ))}
            </div>
            {extra}
          </div>
          <div className="tome__mana tome__favor" title="Favor">
            <span className="tome__gem tome__gem--favor" aria-hidden="true" />
            <span className="num" data-testid="miracle-favor">
              {favor}
            </span>
            <span className="dim small">Favor</span>
          </div>
        </div>
        <div className="tome__book" data-testid="miracle-pages">
          <div className="tome__pages scroll">
            {shown.length === 0 ? (
              <div className="tome__empty">{miracles.length === 0 ? 'Divine interventions are not part of this scenario.' : 'No miracle of this kind.'}</div>
            ) : (
              shown.map((d) => {
                const opt = options[d.id];
                const here = d.context === context;
                const usable = here && (opt?.legal ?? false);
                const reason = !here ? (d.context === 'battle' ? 'Invoked in battle' : 'Invoked on the adventure map') : opt?.legal ? null : (opt?.reason ?? 'Cannot be invoked now');
                const short = favor < d.favorCost;
                const card = miracleCardArt(d.id);
                const crest = d.pantheonIds?.length === 1 ? d.pantheonIds[0]! : null;
                return (
                  <button key={d.id} type="button" className={`tome-spell is-castable ${usable ? '' : 'is-off'}`} disabled={!usable} title={reason ?? d.summary} onClick={() => onInvoke(d.id)} data-testid={`${idPrefix}${d.id}`}>
                    <span className="tome-spell__art">
                      {card ? (
                        <span className="spell-socket miracle-socket" style={{ width: '3.6rem', height: '3.6rem' }} aria-hidden="true">
                          <img src={card.url} alt="" draggable={false} />
                        </span>
                      ) : (
                        <SpellIcon iconAssetId={d.iconAssetId} effectType="favor" size="3.6rem" />
                      )}
                      <span className={`tome-spell__mana tome-spell__favor ${short ? 'is-short' : ''}`} title={`${d.favorCost} Favor`}>
                        {d.favorCost}
                      </span>
                    </span>
                    <span className="tome-spell__text">
                      <span className="tome-spell__name">
                        {d.name}
                        {crest ? (
                          <span className="tome-spell__crest" title={`${catalog.pantheons[crest]?.name} miracle`}>
                            <Emblem catalog={catalog} pantheonId={crest} size="1.25rem" />
                          </span>
                        ) : null}
                      </span>
                      <span className="tome-spell__use">{d.context === 'battle' ? 'Battle' : 'Map'}{d.target === 'enemy_stack' ? ' · an enemy stack' : d.target === 'own_town' ? ' · one of your towns' : d.target === 'ally_stack' ? ' · an allied stack' : d.target === 'own_hero' ? ' · one of your heroes' : ''}</span>
                      <span className="tome-spell__summary">{d.summary}</span>
                      {reason ? <span className="tome-spell__reason">{reason}</span> : null}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
        <div className="tome__foot">
          <span className="dim small">
            The gods answer once per week, on the map or in battle.{usedThisWeek ? ' Already invoked this week.' : ''}
          </span>
          <Button onClick={onClose} data-testid="miracle-close">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
