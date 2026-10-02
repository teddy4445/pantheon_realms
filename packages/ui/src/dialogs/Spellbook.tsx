/**
 * The hero's spellbook, Heroes-3 style: an open book of the spells the hero
 * knows, filtered by use (battle / adventure) and ordered by tier, with mana
 * cost, effect and story. Read-only — spells are cast from the battle and
 * adventure command bars.
 */
import { useState } from 'react';
import { useStore } from '../app/context';
import { Chip, Modal, Segmented } from '../components/kit';
import { SpellIcon } from '../components/art';

type Filter = 'all' | 'battle' | 'adventure';

export function SpellbookDialog({ heroId }: { heroId: string }) {
  const store = useStore();
  const catalog = store.catalog;
  const hero = store.session?.state.heroes[heroId];
  const [filter, setFilter] = useState<Filter>('all');
  if (!hero) return null;
  const spells = hero.knownSpellIds
    .map((id) => catalog.spells[id])
    .filter((sp): sp is NonNullable<typeof sp> => !!sp && (filter === 'all' || sp.context === filter))
    .sort((a, b) => a.tier - b.tier || (a.name < b.name ? -1 : 1));
  return (
    <Modal title={`${hero.name}’s spellbook`} onClose={() => store.closeOverlay()} width="58rem" testId="spellbook">
      {!hero.spellbook ? (
        <p className="dim">No spellbook. Buy one at a Sanctum for {catalog.rulesProfile.spellbookCost} Gold.</p>
      ) : (
        <>
          <div className="row gap between">
            <Segmented<Filter>
              label="Show spells"
              value={filter}
              onChange={setFilter}
              options={[
                { id: 'all', label: 'All' },
                { id: 'battle', label: 'Battle' },
                { id: 'adventure', label: 'Adventure' },
              ]}
            />
            <span className="small">
              Mana {hero.mana} · {hero.knownSpellIds.length} spells known
            </span>
          </div>
          {spells.length === 0 ? (
            <p className="dim">No spells known yet. Heroes learn the spells of a town’s Sanctum when they visit it.</p>
          ) : (
            <div className="spellbook-pages">
              {spells.map((sp) => (
                <div key={sp.id} className={`spellbook-entry ${hero.mana < sp.manaCost ? 'is-short' : ''}`} data-testid={`spell-${sp.id}`}>
                  <SpellIcon iconAssetId={sp.iconAssetId} effectType={sp.effect.type} size="3rem" />
                  <div>
                    <div className="row gap">
                      <strong>{sp.name}</strong> <Chip>Tier {sp.tier}</Chip> <Chip tone="info">{sp.manaCost} mana</Chip>
                      {sp.pantheonId ? <Chip tone="ok">{catalog.pantheons[sp.pantheonId]?.name}</Chip> : null}
                    </div>
                    <div className="small">{sp.summary}</div>
                    {sp.lore ? <div className="faint small h3-lore">{sp.lore}</div> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
