/**
 * @pr/rules — the authoritative rules core.
 *
 * Depends on nothing outside the TypeScript standard library. Never import React,
 * PixiJS, Electron, DOM or storage APIs here (enforced by tools/check-boundaries.mjs
 * and a DOM-free tsconfig).
 */
export * from './ids';
export * from './core/resources';
export * from './core/rng';
export * from './core/hash';
export * from './core/clone';
export * from './core/hex';

export * from './definitions/common';
export * from './definitions/logic';
export * from './definitions/creatures';
export * from './definitions/towns';
export * from './definitions/pantheons';
export * from './definitions/world';
export * from './definitions/campaign';
export * from './definitions/rulesProfile';
export * from './definitions/skirmish';
export * from './definitions/customMap';
export * from './definitions/catalog';

export * from './state/match';
export * from './commands/commands';
export * from './events/events';

export * from './engine/tx';
export * from './engine/processor';

export * from './resolvers/town';
export * from './resolvers/requirements';
export * from './resolvers/heroes';
export * from './resolvers/army';
export * from './resolvers/world';
export * from './resolvers/effects';
export * from './resolvers/scenario';

export * from './systems/economy';
export * from './systems/heroes';
export * from './systems/divine';
export * from './systems/quests';
export * from './systems/adventure';
export * from './systems/turn';
export * from './systems/magic';
export * from './systems/services';
export * from './systems/world';
export * from './systems/sites';
export * from './systems/interventions';
export * from './systems/gifts';
export * from './systems/stats';
export * from './systems/story';
export * from './systems/battle/common';
export * from './systems/battle/geometry';
export * from './systems/battle/damage';
export * from './systems/battle/flow';
export * from './systems/battle/actions';
export * from './systems/battle/factory';
export * from './systems/battle/resolution';
export * from './systems/battle/siege';
export * from './systems/battle/deployment';
export * from './systems/battle/climate';

export * from './factories/entities';
export * from './systems/ownership';
export * from './systems/missionText';
