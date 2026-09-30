/**
 * Norse lore entries. Source notes are short, general pointers that still need
 * review (sourceStatus 'draft_requires_review'); game lore is original fiction.
 * Nothing here establishes a rule.
 */
import type { LoreDefinition } from '@pr/rules';

const entry = (id: string, sourceNote: string, sourceRefs: string[], gameLore: string, upgradeLore: string): LoreDefinition => ({
  id,
  sourceNote,
  sourceRefs,
  sourceStatus: 'draft_requires_review',
  gameLore,
  upgradeLore,
});

export const NORSE_LORE: readonly LoreDefinition[] = [
  entry(
    'lore.norse_draugr',
    'The draugr is the restless dead of Old Norse saga literature, a corpse that keeps to its burial mound and is dangerous to the living. Accounts differ from saga to saga.',
    ['Icelandic family sagas (e.g. Grettis saga) — to be verified'],
    'The barrows above Frosthold were raised for warriors who died owing a debt. Some of them still stand guard over it. The living leave mead at the mound doors and do not ask what drinks it.',
    'The Deathless keep an oath older than the hold itself; nothing on a battlefield is frightening enough to break it.',
  ),
  entry(
    'lore.norse_frost_wolf',
    'Wolves are prominent in Norse myth; the great wolf Fenrir, bound by the gods, is described in the Prose Edda. Our frost wolves are an original adaptation.',
    ['Snorri Sturluson, Prose Edda (Gylfaginning) — to be verified'],
    'The wolves of the white valleys run beside the hold’s riders rather than under them. They are paid in the first share of every hunt, and they remember who pays.',
    'Fenrir Wolves wear a broken link of chain as a collar. Nobody in the hold remembers who first put it there.',
  ),
  entry(
    'lore.norse_frost_troll',
    'Trolls appear widely in Scandinavian folklore as large, dangerous beings of the mountains and wilds; the frost variety here is our invention.',
    ['Scandinavian folklore collections — to be verified'],
    'Frost trolls sleep through summer in caves that never thaw. The hold wakes them in autumn with drums and fresh meat, and sends them home before the thaw.',
    'The ancient trolls have ice grown into their skin like armor, and they are slower to anger and far slower to stop.',
  ),
  entry(
    'lore.norse_valkyrie',
    'Valkyries — "choosers of the slain" — appear in Eddic and skaldic poetry as figures who decide who falls in battle and bring the chosen to Valhalla.',
    ['Poetic Edda; Prose Edda — to be verified'],
    'The hold’s valkyries are not goddesses; they are the women who survived the choosing and came back with wings. They fight where the line is about to break.',
    'Battle Valkyries have chosen before. They turn to meet a second attacker without looking.',
  ),
  entry(
    'lore.norse_lindworm',
    'The lindworm is a serpentine dragon of Scandinavian and wider Germanic folklore; the Sigurd legend (Fáfnir) is carved on the Ramsund rock in Sweden.',
    ['Ramsund carving; Völsunga saga — to be verified'],
    'Lindworms nest on the sea-cliffs where the spray freezes. A lindworm that has been fed from a hand will breathe frost for that hand, and for no one else.',
    'Storm Lindworms are the ones that survived lightning; they bite as readily as they breathe.',
  ),
  entry(
    'lore.norse_jotunn',
    'The jötnar are the giants of Norse myth, frequently in conflict with the gods yet also kin to them; they are named throughout the Eddas.',
    ['Poetic Edda; Prose Edda — to be verified'],
    'A jotunn does not serve the hold. It keeps an agreement with it, renewed each winter by a gift the giants choose. This year it was a bell.',
    'Runic Jotnar cut protections into their own stone bracers and will lend one to an ally who asks politely.',
  ),
  entry(
    'lore.norse_nidhogg_wyrm',
    'Níðhöggr is the dragon that gnaws at the roots of the world-tree Yggdrasil in Eddic poetry; Jörmungandr is the world-serpent. Our wyrms borrow both names.',
    ['Völuspá; Grímnismál — to be verified'],
    'Beneath the hold the roots of an old tree go down into warm dark water, and something down there gnaws. The priests call it a blessing that it has not yet finished.',
    'World-Serpent Wyrms are sea-green and barnacled. Nothing moves them that they do not wish to be moved by.',
  ),
];
