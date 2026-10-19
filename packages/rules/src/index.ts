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
export * from './definitions/cityDedications';
export * from './definitions/scoutingIntel';
export * from './definitions/naval';
export * from './definitions/navalPolicy';
export * from './definitions/caravans';
export * from './definitions/seaSites';
export * from './definitions/seaEncounter';
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
export * from './resolvers/intel';
export * from './resolvers/naval';
export * from './resolvers/caravans';
export * from './resolvers/seaSites';
export * from './resolvers/seaEncounter';

export * from './systems/economy';
export * from './systems/heroes';
export * from './systems/divine';
export * from './systems/quests';
export * from './systems/adventure';
export * from './systems/turn';
export * from './systems/magic';
export * from './systems/services';
export * from './systems/world';
export * from './systems/dedication';
export * from './systems/dedicationSystem';
export * from './systems/dedicationView';
export * from './systems/dedicationServices';
export * from './systems/intel';
export * from './systems/caravans';
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
export * from './systems/battle/libraryUtility';
export * from './systems/battle/activeRelics';
export * from './systems/battle/factory';
export * from './systems/battle/resolution';
export * from './systems/battle/siege';
export * from './systems/battle/engine';
export * from './systems/battle/deployment';
export * from './systems/battle/climate';
export * from './systems/battle/policy';
export * from './systems/battle/neutralAbilities';
export * from './systems/battle/board';
export * from './systems/battle/seaBoard';
export * from './systems/battle/renewableShots';
export * from './systems/naval';
export * from './systems/seaSites';
export * from './systems/seaEncounter';
export * from './systems/pressure';

export * from './factories/entities';
export * from './systems/ownership';
export * from './systems/missionText';

export * from './systems/battle/librarySpatial';
export * from './systems/battle/libraryLife';
export * from './systems/battle/libraryFields';

export * from './systems/libraryEconomy';
export * from './systems/libraryReports';

export * from './systems/libraryCourier';
export * from './systems/librarySignals';
export * from './systems/coalition';
