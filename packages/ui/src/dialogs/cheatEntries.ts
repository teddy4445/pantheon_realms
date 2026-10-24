/** Display/parser vocabulary shared by the cheat console and paginated grimoire.
 * Entries describe commands; they never apply resources or hero changes here.
 * The special 'book' result opens UI only, while real effects go through rules. */
import type { CheatEffect } from '@pr/rules';
import type { IconName } from '../assets/icons';

export const CHEAT_ENTRIES: readonly { phrase: string; title: string; description: string; icon: IconName; effect: CheatEffect | 'book' }[] = [
  {phrase:'blessed by the gods',title:'Divine Treasury',description:'Gain 10,000 gold, 50 wood, 50 stone, 25 crystals and 25 favor.',icon:'gift',effect:'resources'},
  {phrase:'hermes wings',title:'Wings of the Messenger',description:'Set every active hero’s movement to 10,000 for today.',icon:'movement',effect:'movement'},
  {phrase:'atlantis',title:'The Lost Metropolis',description:'Maximize every building in your towns and open their dwelling populations.',icon:'town',effect:'buildings'},
  {phrase:'I am a monster',title:'An Army Awakens',description:'Fill each town garrison with a week of its seven native tiers. Replaces other creatures; matching stacks grow.',icon:'army',effect:'creatures'},
  {phrase:'eyes of olympus',title:'Beyond the Horizon',description:'Explore the whole map. Enemy armies still require live sight.',icon:'eye',effect:'explore'},
  {phrase:'ambrosia',title:'Nectar of Immortals',description:'Restore every active hero’s mana to their current maximum.',icon:'mana',effect:'mana'},
  {phrase:'age of heroes',title:'The Ascendant Host',description:'Upgrade all creatures in your hero armies and town garrisons, preserving their numbers.',icon:'upgrade',effect:'upgrades'},
  {phrase:'midas touch',title:'The Golden Hand',description:'Add 50,000 gold to your treasury.',icon:'gold',effect:'gold'},
  {phrase:'whispering woods',title:'Gift of the Forest',description:'Add 250 wood to your stores.',icon:'wood',effect:'wood'},
  {phrase:'bones of the earth',title:'Heart of the Mountain',description:'Add 250 stone to your stores.',icon:'stone',effect:'stone'},
  {phrase:'starlight in a bottle',title:'Captured Constellations',description:'Add 100 crystals to your stores.',icon:'crystal',effect:'crystal'},
  {phrase:'the gods owe me',title:'A Divine Debt',description:'Add 100 favor to your treasury.',icon:'favor',effect:'favor'},
  {phrase:'ares awakens',title:'The War God’s Edge',description:'Permanently add 5 Attack to every active owned hero.',icon:'attack',effect:'attack'},
  {phrase:'aegis eternal',title:'The Unbroken Shield',description:'Permanently add 5 Defense to every active owned hero.',icon:'defense',effect:'defense'},
  {phrase:'storm in my veins',title:'The Living Tempest',description:'Permanently add 5 Power to every active owned hero.',icon:'power',effect:'power'},
  {phrase:'athena remembers',title:'Wisdom Without End',description:'Permanently add 5 Knowledge to every active owned hero. Use ambrosia to fill the larger mana reserve.',icon:'knowledge',effect:'knowledge'},
  {phrase:'echoes of the legion',title:'The Answering Host',description:'Add 25 creatures to each occupied stack in your active hero armies and town garrisons.',icon:'recruit',effect:'reinforcements'},
  {phrase:'spring without end',title:'The Everlasting Spring',description:'Add 25 recruits to every already-open population pool in your towns.',icon:'growth',effect:'population'},
  {phrase:'alohomora',title:'The Unsealed Grimoire',description:'Unlock this book of secret invocations. No resources are spent.',icon:'lock',effect:'book'},
];

/** Normalize user-entered phrases before lookup; unknown invocations stay null
 * so the console can explain failure without dispatching a guessed command. */
export function parseInvocation(value: string): CheatEffect | 'book' | null {
  const phrase = value.trim().toLowerCase().replace(/\s+/g, ' ');
  return CHEAT_ENTRIES.find(e => e.phrase.toLowerCase() === phrase)?.effect ?? null;
}
