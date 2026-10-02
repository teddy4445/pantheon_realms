/**
 * @pr/presentation/core — the part of the presentation layer that does not load
 * Babylon.js: the unit-model registry and manifest validation, colour palette and
 * the list of animation states.
 *
 * The interface imports this statically at start-up. The 3D scenes (`@pr/presentation`)
 * are loaded on demand, the first time a screen shows a 3D view, so the main menu
 * never waits for the engine.
 */
export * from './modelRegistry';
export * from './palette';
export * from './environmentArt';
export { ANIMATION_STATES, type AnimationState } from './animations';
