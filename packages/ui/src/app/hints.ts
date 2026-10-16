/**
 * Contextual help: short tips shown the first time the player meets a
 * mechanic (Settings → Gameplay → Tutorial hints). Presentation text only;
 * each tip explains rules that already exist and never changes play.
 */
export interface HintDefinition {
  readonly id: string;
  readonly title: string;
  readonly text: string;
}

export const HINTS: Readonly<Record<string, HintDefinition>> = {
  route_planning: {
    id: 'route_planning',
    title: 'Planning a route',
    text: 'Gold arrows are reachable today; bronze arrows, with an hourglass where a new day begins, need later days, and the parchment shows the day of arrival. Continue journey (or Space, or a second click on the destination) marches. The destination is kept from day to day until the hero gets there.',
  },
  out_of_movement: {
    id: 'out_of_movement',
    title: 'Out of movement',
    text: 'This hero has no movement left today. Select another hero, visit your town, or End Day — movement refills at dawn.',
  },
  guarded_path: {
    id: 'guarded_path',
    title: 'Guarded paths',
    text: 'A guard blocks this tile. Moving onto it starts a battle. The threat label is a rough estimate — check the guard’s army with right-click before you commit.',
  },
  first_battle: {
    id: 'first_battle',
    title: 'Your first battle',
    text: 'Stacks act in the order shown at the top. Click a hex to move, an enemy to attack, or use Wait and Defend. Ranged stacks shoot when no enemy is next to them.',
  },
  troop_training: {
    id: 'troop_training',
    title: 'Upgrading troops',
    text: 'Once the upgraded dwelling stands, troops in town can be upgraded for the price difference. Upgrading uses no population — recruiting does.',
  },
  battle_losses: {
    id: 'battle_losses',
    title: 'Battle losses',
    text: 'Fallen creatures are gone for good; wounded survivors heal after the battle. Replace losses in town each week, and avoid fights the threat label calls “Stronger than you”.',
  },
  level_up: {
    id: 'level_up',
    title: 'Levelling up',
    text: 'Each level raises one attribute and offers a skill. Skills you already have improve when chosen again.',
  },
  creature_camp: {
    id: 'creature_camp',
    title: 'Creature camps',
    text: 'Neutral creatures here will join any hero who pays their price. The camp gains new volunteers every week. Guarded camps must be cleared first.',
  },
  map_event: {
    id: 'map_event',
    title: 'Map events',
    text: 'Shrines, wrecks and strangers offer a one-time choice. The first hero to arrive decides; the result is shown before you choose.',
  },
  interventions: {
    id: 'interventions',
    title: 'Divine interventions',
    text: 'You have enough Favor for a miracle. Open the Pantheon screen (or press I) to invoke one — the gods answer once per week, on the map or in battle.',
  },
  weekly_event: {
    id: 'weekly_event',
    title: 'Weekly events',
    text: 'Every new week brings an event that affects all empires alike. Its effect is shown in the top bar until the week ends.',
  },
  wandering_monsters: {
    id: 'wandering_monsters',
    title: 'Wandering monsters',
    text: 'Some creature bands roam their part of the map. They attack heroes they can beat, and leave treasure when defeated.',
  },
  hot_seat: {
    id: 'hot_seat',
    title: 'Hot-seat play',
    text: 'Players take turns on this computer. At each hand-over the map is hidden until the next player presses Begin, so nobody sees another player’s view.',
  },
};
