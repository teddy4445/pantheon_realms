/**
 * The god-card icons (GPT6_BRIEF_8 part B; owner request 2026-10-04: "more
 * icons indicating the price and advantage of each god", less text). One list
 * shared by the brief generator and the icon catalog. The Pantheon screen does
 * not use them yet: the icon row on the god cards is built once they are
 * delivered (until then the cards keep their sentences).
 */
export interface GodIconSpec {
  readonly id: string;
  readonly name: string;
  readonly group: 'advantage' | 'price' | 'choice';
  readonly meaning: string;
  readonly draw: string;
}

export const GOD_ICONS: readonly GodIconSpec[] = [
  // --- What a blessing gives (combined on the card with the existing attribute, morale, luck, movement, vision, mana and resource icons) ---
  { id: 'icon.bless.commanders', name: 'Your heroes', group: 'advantage', meaning: 'the blessing applies to your heroes (commanders)', draw: 'a crested hero’s helmet seen from the front, gold rim, a small laurel at the brow' },
  { id: 'icon.bless.armies', name: 'Your armies', group: 'advantage', meaning: 'the blessing applies to all your armies (morale, luck)', draw: 'a tall war banner on a pole with a forked swallow-tail flag streaming in the wind' },
  { id: 'icon.bless.creatures', name: 'Your creatures', group: 'advantage', meaning: 'the blessing applies to your creatures (with a tier range beside it)', draw: 'a single large clawed paw print pressed into gold' },
  { id: 'icon.bless.shooters', name: 'Your shooters', group: 'advantage', meaning: 'the blessing applies to your shooters', draw: 'a recurved bow fully drawn with an arrow on the string, aimed up and right' },
  { id: 'icon.bless.flyers', name: 'Your flyers', group: 'advantage', meaning: 'the blessing applies to your flying creatures', draw: 'one great spread feathered wing, pale gold with blue tips' },
  { id: 'icon.bless.growth', name: 'Weekly growth', group: 'advantage', meaning: 'more creatures appear in your dwellings each week', draw: 'an arched dwelling doorway with a green shoot springing from its threshold and three small upward chevrons above it' },
  { id: 'icon.bless.recovery', name: 'Recovery after victory', group: 'advantage', meaning: 'after a battle you win, stacks regain part of their losses', draw: 'a small rising spirit flame inside a curved arrow that circles back on itself' },
  { id: 'icon.bless.spell_unlock', name: 'Spell to learn', group: 'advantage', meaning: 'a spell becomes learnable at your library', draw: 'an open book with a glowing golden key lying across its pages' },
  { id: 'icon.bless.daily_income', name: 'Daily income', group: 'advantage', meaning: 'an income every day (shown with the resource icon)', draw: 'three stacked coins under the rim of a rising sun with short rays' },
  { id: 'icon.bless.offering', name: 'Richer offerings', group: 'advantage', meaning: 'offerings at the Temple yield more Favor', draw: 'a bronze altar bowl holding coins, a bright golden spark rising from it' },
  { id: 'icon.bless.fury', name: 'Fury of the wounded', group: 'advantage', meaning: 'stacks at half strength or less attack harder', draw: 'a cracked round shield with a red-orange flame bursting through the crack' },
  // --- What a god costs or needs ---
  { id: 'icon.req.temple', name: 'Temple needed', group: 'price', meaning: 'needs a Temple (level 1) in one town', draw: 'a small classical temple front: four columns under a triangular roof, gold on stone' },
  { id: 'icon.req.grand_temple', name: 'Grand Temple needed', group: 'price', meaning: 'needs the Temple’s second level', draw: 'the same temple front grown taller: a second storey of columns and a sun disc on the roof' },
  { id: 'icon.req.city_hall', name: 'City Hall needed', group: 'price', meaning: 'needs the third level of the civic hall', draw: 'a domed civic hall with a short bell tower and a flag on top' },
  { id: 'icon.req.after_first', name: 'After the first choice', group: 'price', meaning: 'available only after your first choice', draw: 'one golden gem on the left joined by a short glowing line to a second, unlit gem on the right' },
  // --- Where a god stands ---
  { id: 'icon.god.patron', name: 'Patron', group: 'choice', meaning: 'your patron god (from the start)', draw: 'a golden laurel crown with a small sun at its front' },
  { id: 'icon.god.first_choice', name: 'First choice', group: 'choice', meaning: 'one of the gods of your first choice', draw: 'a single faceted golden star-gem with a soft glow' },
  { id: 'icon.god.second_choice', name: 'Second choice', group: 'choice', meaning: 'one of the gods of your second choice', draw: 'two faceted golden star-gems side by side with a soft glow' },
  { id: 'icon.god.committed', name: 'Committed', group: 'choice', meaning: 'you have committed to this god', draw: 'a round golden seal with a ribbon tied in a bow below it, glowing warmly' },
  { id: 'icon.god.excluded', name: 'Excluded', group: 'choice', meaning: 'another god of this choice was chosen', draw: 'a grey chain broken in the middle, its two links falling apart' },
  { id: 'icon.god.permanent', name: 'Permanent', group: 'choice', meaning: 'the choice cannot be undone', draw: 'a closed bronze padlock wrapped by a laurel sprig' },
];
