/**
 * The hero's spellbook as an open tome: the same pop-up reads the book (hero
 * screen) and casts from it (the adventure map's and the battle's Spells
 * buttons). Fixed size whether it holds no spell or forty; the use and tier
 * filters are always there; each spell shows its icon, a mana gem, its tier
 * in Roman numerals, the pantheon's crest when it belongs to one, and its
 * effect. Presentational: casting calls back into the screen, which sends
 * the command (or enters targeting).
 */
import { useState } from 'react';
import type { ContentCatalog, SpellDefinition } from '@pr/rules';
import type { SpellCaster, SpellCastRequest } from '../app/store';
import { Button, Modal } from './kit';
import { Emblem, SpellIcon } from './art';

type Use = 'all' | 'battle' | 'adventure';
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];

export function SpellBook({
  catalog,
  hero,
  onClose,
  cast,
}: {
  catalog: ContentCatalog;
  hero: SpellCaster;
  onClose: () => void;
  /** Casting mode: where the book is opened from, and each known spell's state; picking one calls `onCast`. */
  cast?: SpellCastRequest;
}) {
  const [use, setUse] = useState<Use>(cast?.context ?? 'all');
  const [tier, setTier] = useState<number>(0);
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
  return (
    <Modal title={cast ? `Cast a spell — ${hero.name}` : `${hero.name}’s spellbook`} onClose={onClose} width="64rem" testId={cast ? 'spell-cast' : 'spellbook'}>
      <div className="tome">
        <div className="tome__bar">
          <div className="tome__filters" role="group" aria-label="Filter spells">
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
          <div className="tome__mana" title="Mana">
            <span className="tome__gem" aria-hidden="true" />
            <span className="num">{hero.mana}</span>
            <span className="dim small">mana</span>
          </div>
        </div>
        <div className="tome__book" data-testid="tome-pages">
          <div className="tome__pages scroll">
            {empty ? (
              <div className="tome__empty">{empty}</div>
            ) : (
              shown.map((sp) => {
                const opt = cast ? cast.options[sp.id] : undefined;
                const usable = !cast || (opt?.castable ?? false);
                const reason = cast ? (opt ? (opt.castable ? null : (opt.reason ?? 'Cannot be cast now')) : sp.context === cast.context ? 'Cannot be cast now' : sp.context === 'battle' ? 'Cast in battle' : 'Cast on the adventure map') : null;
                const short = hero.mana < sp.manaCost;
                const body = (
                  <>
                    <span className="tome-spell__art">
                      <SpellIcon iconAssetId={sp.iconAssetId} effectType={sp.effect.type} size="3.6rem" />
                      <span className={`tome-spell__mana ${short ? 'is-short' : ''}`} title={`${sp.manaCost} mana`}>
                        {sp.manaCost}
                      </span>
                    </span>
                    <span className="tome-spell__text">
                      <span className="tome-spell__name">
                        <span className="tome-spell__tier" aria-label={`Tier ${sp.tier}`}>
                          {ROMAN[sp.tier] ?? sp.tier}
                        </span>
                        {sp.name}
                        {sp.pantheonId ? (
                          <span className="tome-spell__crest" title={`${catalog.pantheons[sp.pantheonId]?.name} spell`}>
                            <Emblem catalog={catalog} pantheonId={sp.pantheonId} size="1.25rem" />
                          </span>
                        ) : null}
                      </span>
                      <span className="tome-spell__use">{sp.context === 'battle' ? 'Battle' : 'Adventure'}</span>
                      <span className="tome-spell__summary">{sp.summary}</span>
                      {!cast && sp.lore ? <span className="tome-spell__lore">{sp.lore}</span> : null}
                      {reason ? <span className="tome-spell__reason">{reason}</span> : null}
                    </span>
                  </>
                );
                return cast ? (
                  <button key={sp.id} type="button" className={`tome-spell is-castable ${usable ? '' : 'is-off'}`} disabled={!usable} title={reason ?? sp.lore ?? sp.summary} onClick={() => cast.onCast(sp.id)} data-testid={`cast-${sp.id}`}>
                    {body}
                  </button>
                ) : (
                  <div key={sp.id} className={`tome-spell ${short ? 'is-short' : ''}`} title={sp.lore ?? undefined} data-testid={`spell-${sp.id}`}>
                    {body}
                  </div>
                );
              })
            )}
          </div>
        </div>
        {cast ? (
          <div className="tome__foot">
            <span className="dim small">{cast.note ?? (cast.context === 'battle' ? 'One spell per round. Pick a spell, then its target on the battlefield.' : 'Pick a spell; a spell with a target asks for a tile next.')}</span>
            <Button onClick={onClose} data-testid="cast-cancel">
              Cancel
            </Button>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
