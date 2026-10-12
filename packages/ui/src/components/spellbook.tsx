/**
 * The hero's spellbook as an open tome: the same pop-up reads the book (hero
 * screen) and casts from it (the adventure map's and the battle's Spells
 * buttons). Fixed size whether it holds no spell or forty; the use and tier
 * filters are always there; each spell shows its icon, a mana gem, its tier
 * in Roman numerals, the pantheon's crest when it belongs to one, and its
 * effect. Presentational: casting calls back into the screen, which sends
 * the command (or enters targeting).
 */
import { useRef, useState } from 'react';
import type { ContentCatalog, SpellDefinition } from '@pr/rules';
import type { SpellCaster, SpellCastRequest } from '../app/store';
import { useStore } from '../app/context';
import { Button } from './kit';
import { Folio } from './gui';
import { AdventureStage, campScene } from './adventure';
import { guiThemeFor } from '../assets/guiArt';
import { Emblem, SpellIcon } from './art';

type Use = 'all' | 'battle' | 'adventure';
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];

export function SpellBook({
  catalog,
  hero,
  onClose,
  cast,
  pantheonId,
  manaMax,
}: {
  catalog: ContentCatalog;
  hero: SpellCaster;
  onClose: () => void;
  /** Casting mode: where the book is opened from, and each known spell's state; picking one calls `onCast`. */
  cast?: SpellCastRequest;
  /** The hero's pantheon: the frame, the emblem and the camp behind the book. */
  pantheonId?: string | null;
  /** The hero's mana pool, when known (shown as "mana / pool"). */
  manaMax?: number | null;
}) {
  const store = useStore();
  const [use, setUseState] = useState<Use>(cast?.context ?? 'all');
  const [tier, setTierState] = useState<number>(0);
  const [inspected, setInspected] = useState<string | null>(null);
  // Turning to another section of the book: a page turns.
  const setUse = (u: Use) => {
    if (u !== use) store.audio?.effect('ui.book_page');
    setUseState(u);
  };
  const setTier = (t: number) => {
    if (t !== tier) store.audio?.effect('ui.book_page');
    setTierState(t);
  };
  const known = hero.knownSpellIds.map((id) => catalog.spells[id]).filter((sp): sp is SpellDefinition => !!sp);
  const tiers = [...new Set(Object.values(catalog.spells).map((sp) => sp.tier))].sort((a, b) => a - b);
  const shown = known.filter((sp) => (use === 'all' || sp.context === use) && (tier === 0 || sp.tier === tier)).sort((a, b) => a.tier - b.tier || (a.name < b.name ? -1 : 1));
  const count = (u: Use) => known.filter((sp) => u === 'all' || sp.context === u).length;
  const empty = !hero.spellbook
    ? `${hero.name} has no spellbook. One can be bought at a Sanctum for ${catalog.rulesProfile.spellbookCost} Gold.`
    : known.length === 0
      ? 'No spells known yet. Heroes learn the spells of a town’s Sanctum when they visit it.'
      : shown.length === 0
        ? 'No spell of this kind in the book.'
        : null;
  const reasonOf = (sp: SpellDefinition): string | null => {
    if (!cast) return null;
    const opt = cast.options[sp.id];
    return opt ? (opt.castable ? null : (opt.reason ?? 'Cannot be cast now')) : sp.context === cast.context ? 'Cannot be cast now' : sp.context === 'battle' ? 'Cast in battle' : 'Cast on the adventure map';
  };
  // The page on the right: the inspected spell (hover, focus or a click in the reading book), else the first shown.
  const detail = shown.find((sp) => sp.id === inspected) ?? shown[0] ?? null;
  // One spell per decision: the cast is sent once even if a click repeats before the book closes.
  const casting = useRef(false);
  const castNow = (id: string) => {
    if (!cast || casting.current) return;
    casting.current = true;
    cast.onCast(id);
  };
  const theme = guiThemeFor(pantheonId);
  const sectionTitle = use === 'battle' ? 'Battle spells' : use === 'adventure' ? 'Adventure spells' : 'All spells';
  const left = (
    <div className="ak-book__left">
      <h3 className="ak-book__title">{sectionTitle}</h3>
      <div className="tome__filters ak-book__filters" role="group" aria-label="Filter spells">
        <div className="tome__tabs" role="radiogroup" aria-label="Use">
          {(['all', 'battle', 'adventure'] as const).map((u) => (
            <button key={u} type="button" role="radio" aria-checked={use === u} className={`tome__tab ${use === u ? 'is-on' : ''}`} onClick={() => setUse(u)} data-testid={`book-use-${u}`}>
              {u === 'all' ? 'All' : u === 'battle' ? 'Battle' : 'Adventure'}
              <span className="tome__count">{count(u)}</span>
            </button>
          ))}
        </div>
        <div className="tome__tabs tome__tabs--tiers" role="radiogroup" aria-label="Tier">
          <button type="button" role="radio" aria-checked={tier === 0} className={`tome__tab ${tier === 0 ? 'is-on' : ''}`} onClick={() => setTier(0)}>
            Every tier
          </button>
          {tiers.map((t) => (
            <button key={t} type="button" role="radio" aria-checked={tier === t} className={`tome__tab tome__tab--tier ${tier === t ? 'is-on' : ''}`} onClick={() => setTier(t)} aria-label={`Tier ${t}`}>
              {ROMAN[t] ?? t}
            </button>
          ))}
        </div>
      </div>
      <div className="ak-book__list" data-testid="tome-list">
        {empty ? (
          <div className="tome__empty">{empty}</div>
        ) : (
          shown.map((sp) => {
            const reason = reasonOf(sp);
            const usable = !cast || reason === null;
            const short = hero.mana < sp.manaCost;
            const body = (
              <>
                <span className="ak-spell__art">
                  <SpellIcon iconAssetId={sp.iconAssetId} effectType={sp.effect.type} size="100%" />
                </span>
                <span className="ak-spell__name">{sp.name}</span>
                <span className={`ak-spell__mana ${short ? 'is-short' : ''}`}>
                  {ROMAN[sp.tier] ?? sp.tier} · {sp.manaCost} Mana
                </span>
              </>
            );
            const inspect = () => setInspected(sp.id);
            return cast ? (
              <button
                key={sp.id}
                type="button"
                className={`ak-spell ${usable ? '' : 'is-off'} ${detail?.id === sp.id ? 'is-inspected' : ''}`}
                disabled={!usable}
                title={reason ?? sp.summary}
                onMouseEnter={inspect}
                onFocus={inspect}
                onClick={() => castNow(sp.id)}
                data-testid={`cast-${sp.id}`}
              >
                {body}
              </button>
            ) : (
              <button key={sp.id} type="button" className={`ak-spell ${short ? 'is-short' : ''} ${detail?.id === sp.id ? 'is-inspected' : ''}`} aria-pressed={detail?.id === sp.id} onClick={inspect} onFocus={inspect} title={sp.summary} data-testid={`spell-${sp.id}`}>
                {body}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
  const right = detail ? (
    <div className="ak-book__right" aria-live="polite" data-testid="book-detail">
      <span className="ak-book__icon">
        <SpellIcon iconAssetId={detail.iconAssetId} effectType={detail.effect.type} size="100%" />
      </span>
      <h3 className="ak-book__spell">
        {detail.name}
        {detail.pantheonId ? (
          <span className="tome-spell__crest" title={`${catalog.pantheons[detail.pantheonId]?.name} spell`}>
            <Emblem catalog={catalog} pantheonId={detail.pantheonId} size="1.3rem" />
          </span>
        ) : null}
      </h3>
      <div className="ak-book__meta">
        Tier {ROMAN[detail.tier] ?? detail.tier} · {detail.context === 'battle' ? 'Battle' : 'Adventure'} spell
      </div>
      <p className="ak-book__summary">{detail.summary}</p>
      {detail.lore ? <p className="ak-book__lore">{detail.lore}</p> : null}
      <p className={`ak-book__cost ${hero.mana < detail.manaCost ? 'is-short' : ''}`}>Cost: {detail.manaCost} Mana</p>
      {cast ? (
        <>
          {reasonOf(detail) ? <p className="tome-spell__reason">{reasonOf(detail)}</p> : null}
          <Button variant="primary" disabled={reasonOf(detail) !== null} disabledReason={reasonOf(detail)} onClick={() => castNow(detail.id)} data-testid="cast-detail">
            Cast {detail.name}
          </Button>
        </>
      ) : null}
    </div>
  ) : (
    <div className="ak-book__right ak-book__right--empty">{empty ? null : 'Choose a spell to read it.'}</div>
  );
  return (
    <AdventureStage
      theme={theme}
      scene={campScene(pantheonId)}
      shade="dim"
      title={cast ? `Cast a spell — ${hero.name}` : `${hero.name}’s Spellbook`}
      subtitle={`Mana ${hero.mana}${manaMax ? ` / ${manaMax}` : ''}`}
      pantheonId={pantheonId}
      catalog={catalog}
      testId={cast ? 'spell-cast' : 'spellbook'}
      onClose={onClose}
      className="ak-book-stage"
      footer={
        <>
          {cast ? <span className="ak-muted small">{cast.note ?? (cast.context === 'battle' ? 'One spell per round. Pick a spell, then its target on the battlefield.' : 'Pick a spell; a spell with a target asks for a tile next.')}</span> : null}
          <span className="grow" />
          {cast ? (
            <Button onClick={onClose} data-testid="cast-cancel">
              Cancel
            </Button>
          ) : (
            <Button onClick={onClose} data-testid="book-close">
              Close book
            </Button>
          )}
        </>
      }
    >
      <div className="ak-book tome" data-testid="tome-pages">
        <Folio left={left} right={right} label={`${hero.name}’s spellbook`} className="ak-book__folio" />
      </div>
    </AdventureStage>
  );
}
