/**
 * @pr/presentation — Babylon.js scene controllers.
 *
 * Presents committed MatchState-derived view models and immutable GameEvents.
 * Never decides legality, never computes damage and never mutates game state.
 * Depends on @pr/rules types, @pr/mapgen (cosmetic decor stream) and Babylon.
 */
export * from './engineHost';
export * from './tween';
export * from './palette';
export * from './meshkit';
export * from './proxies';
export * from './animations';
export * from './adventure';
export * from './battle';
export * from './viewer';
export * from './models';
export * from './mountedHeroes';
