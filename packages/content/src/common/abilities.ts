/**
 * Reusable creature abilities (design/06 "Ability definitions").
 * Per-form bindings follow the PROPOSED mapping in production/03 §10.
 */
import type { AbilityDefinition } from '@pr/rules';

export const ABILITIES: readonly AbilityDefinition[] = [
  {
    id: 'charge_guard',
    name: 'Charge Guard',
    activation: 'passive',
    summary: 'Braced shields blunt a cavalry charge.',
    exactRule: "Ignore the attacker's charge bonus against this stack.",
    restriction: 'Does not negate the underlying melee strike or Offense.',
    rule: { type: 'charge_guard' },
    implementationStatus: 'implemented',
  },
  {
    id: 'shooter',
    name: 'Shooter',
    activation: 'passive',
    summary: 'Can make stationary ranged attacks.',
    exactRule: 'Enables the stationary Shoot action; one ammunition per shot.',
    restriction: 'Cannot shoot while adjacent to an enemy or at a target beyond its range; half damage in the far half of its range; half damage in melee unless No Melee Penalty.',
    rule: { type: 'shooter' },
    implementationStatus: 'implemented',
  },
  {
    id: 'flight',
    name: 'Flight',
    activation: 'passive',
    summary: 'Flies over obstacles and other stacks.',
    exactRule: 'May cross blocked or occupied cells within its Speed.',
    restriction: 'Requires a legal whole-footprint landing; no travel beyond Speed.',
    rule: { type: 'flight' },
    implementationStatus: 'implemented',
  },
  {
    id: 'retaliation_2',
    name: 'Double Retaliation',
    activation: 'passive',
    summary: 'Answers two melee attacks each round.',
    exactRule: 'Two eligible retaliations each round.',
    restriction: 'Reset only at round start; a destroyed stack cannot retaliate.',
    rule: { type: 'retaliations', perRound: 2 },
    implementationStatus: 'implemented',
  },
  {
    id: 'retaliation_unlimited',
    name: 'Unlimited Retaliation',
    activation: 'passive',
    summary: 'Answers every melee attack.',
    exactRule: 'No retaliation-count limit.',
    restriction: 'Dead or disabled stacks still cannot retaliate; no retaliation chains.',
    rule: { type: 'retaliations', perRound: 'unlimited' },
    implementationStatus: 'implemented',
  },
  {
    id: 'charge',
    name: 'Charge',
    activation: 'passive',
    summary: 'Hits harder after a long approach.',
    exactRule: '+5% damage per hex traversed on the shortest legal approach, capped at +25%.',
    restriction: 'Melee activation only; no charge on retaliation; detours cannot farm distance; negated by Charge Guard.',
    rule: { type: 'charge', perHexPercent: 5, capPercent: 25 },
    implementationStatus: 'implemented',
  },
  {
    id: 'family_ward',
    name: 'Ward',
    activation: 'active',
    summary: 'Places a protective ward on a friendly stack.',
    exactRule: 'Spend the activation: a friendly stack gains +3 Defense through the current and next round.',
    restriction: 'One charge shared by the whole Temple Adept family per army per battle; no hero mana.',
    rule: { type: 'family_ward', defenseBonus: 3, durationRounds: 2, chargesPerBattle: 1 },
    implementationStatus: 'implemented',
  },
  {
    id: 'unyielding',
    name: 'Unyielding',
    activation: 'passive',
    summary: 'Steady under pressure.',
    exactRule: 'Effective morale is at least +1, before the +3 cap.',
    restriction: 'Does not create an extra roll, grant immunity, or affect allies.',
    rule: { type: 'unyielding', minimumMorale: 1 },
    implementationStatus: 'implemented',
  },
  {
    id: 'wall_breaker',
    name: 'Wall Breaker',
    activation: 'active',
    summary: 'Can target fortifications in a siege.',
    exactRule: 'Attacking a town: spend the activation and one shot to remove 1 structure HP from an intact wall, gate, tower or keep. No troop attack that activation.',
    restriction: 'Besieging side only; not while engaged by an adjacent enemy; no effect in open-field battles.',
    rule: { type: 'wall_breaker' },
    implementationStatus: 'implemented',
  },
  // --- Shapeshift aspects (PROPOSED this build; battle statuses, not creature forms) ---
  ...(
    [
      ['shapeshift_hare', 'Hare', 0, -1, 2, 'Slips into a hare’s shape to outrun the line.'],
      ['shapeshift_waterhorse', 'Water-horse', 2, -2, 0, 'Becomes the drowning horse of the loch.'],
      ['shapeshift_sealskin', 'Seal-skin', 0, 3, -2, 'Pulls on the seal-skin and sets like a rock.'],
      ['shapeshift_rut', 'Rut', 3, -3, 0, 'The antlers lower; the forest charges.'],
    ] as const
  ).map(([id, aspect, attack, defense, speed, summary]): AbilityDefinition => {
    const parts = [attack && `${attack > 0 ? '+' : ''}${attack} Attack`, defense && `${defense > 0 ? '+' : ''}${defense} Defense`, speed && `${speed > 0 ? '+' : ''}${speed} Speed`].filter(Boolean).join(', ');
    return {
      id,
      name: `Shapeshift (${aspect})`,
      activation: 'active',
      summary,
      exactRule: `Spend the activation to take the ${aspect} aspect (${parts}) or return to the normal aspect. With the Shapeshifting rite the change is free at the start of the activation, once per activation.`,
      restriction: 'Only the stack itself; lasts until it changes back or the battle ends. Speed changes affect movement at once and turn order from the next round; never adventure travel.',
      rule: { type: 'shapeshift', aspect, attack, defense, speed },
      implementationStatus: 'implemented',
    };
  }),
  {
    id: 'no_melee_penalty',
    name: 'No Melee Penalty',
    activation: 'passive',
    summary: 'Fights at full strength up close.',
    exactRule: "Do not apply the shooter's 0.5 melee penalty.",
    restriction: 'Ordinary ranged distance and wall limits still apply.',
    rule: { type: 'no_melee_penalty' },
    implementationStatus: 'implemented',
  },
];
