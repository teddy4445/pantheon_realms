/**
 * Pantheon signature mechanics — PROPOSED this build (owner request: one
 * signature per pantheon from its theme, built as shared rules).
 *
 * Each signature is only a named bundle of ordinary effects from the shared
 * vocabulary (packages/rules/src/definitions/logic.ts). The rules never ask
 * which pantheon a player has; any pantheon or god may use the same effects
 * (e.g. Hades and Osiris use `casualty_recovery` too). All numbers are
 * unplaytested proposals measured only by the AI-vs-AI balance tool.
 *
 * The Three Beacons campaign sets `signatureMechanics: false`, so its
 * documented rules and tested balance are unchanged.
 */
import type { PantheonSignatureDefinition } from '@pr/rules';

export const SIGNATURES: Readonly<Record<string, PantheonSignatureDefinition>> = {
  greek: {
    name: 'Glory',
    summary: 'Champions grow through victory.',
    rules: ['Your heroes gain 25% more experience from battles they win (rounded down).'],
    effects: [{ type: 'battle_xp_percent', percent: 25 }],
  },
  norse: {
    name: 'Berserk Fury',
    summary: 'The fewer who stand, the harder they strike.',
    rules: ['In battle, a stack of yours with at most half of its starting creatures alive gains +2 Attack.'],
    effects: [{ type: 'wounded_fury', attack: 2, numerator: 1, denominator: 2 }],
  },
  egyptian: {
    name: 'Afterlife',
    summary: 'The fallen are called back from the west bank.',
    rules: [
      'After a battle you win, each of your stacks regains 20% of the creatures it lost in that battle (rounded down).',
      'Never more than the stack lost; grants no experience, rewards or kills.',
    ],
    effects: [{ type: 'casualty_recovery', percent: 20 }],
  },
  japanese: {
    name: 'Harmony',
    summary: 'Many spirits, one purpose.',
    rules: ['Counted when a battle starts: with 3 or more different creature families in your army, every stack gains +1 Defense.'],
    effects: [{ type: 'army_harmony', families: 3, attack: 0, defense: 1 }],
  },
  celtic: {
    name: 'Shapeshifting',
    summary: 'The old folk wear more than one skin.',
    rules: [
      'Creatures with Shapeshift (Pooka, Kelpie, Selkie, Horned Stag Spirit) change aspect at the start of their activation without spending it, once per activation.',
      'Without this rite, Shapeshift spends the activation.',
    ],
    effects: [{ type: 'free_shapeshift' }],
  },
  mesoamerican: {
    name: 'Offering',
    summary: 'The sun is fed so that it rises.',
    rules: [
      'Once per week in each town with a Temple, offer creatures from the garrison or the visiting hero.',
      'Gain 1 Favor per 150 Gold of their recruitment price (rounded down), at most 10 Favor per offering.',
      'A hero cannot offer its last creature.',
    ],
    effects: [{ type: 'offering', goldPerFavor: 150, maxFavorPerWeek: 10 }],
  },
};
