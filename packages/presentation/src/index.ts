/**
 * @pr/presentation — the PixiJS 2D views: adventure map, tactical battle and
 * the animated bestiary viewer.
 *
 * Presents committed MatchState-derived view models and immutable GameEvents.
 * Never decides legality, never computes damage and never mutates game state.
 * Depends on @pr/rules types, @pr/mapgen (cosmetic decor stream) and PixiJS.
 */
export * from './core';
export * from './engineHost';
export * from './tween';
export * from './figure';
export * from './adventure';
export * from './battle';
export * from './viewer';
