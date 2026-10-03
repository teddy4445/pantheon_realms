/**
 * @pr/presentation/core — the part of the presentation layer that does not load
 * PixiJS: the sprite manifest model and lookup, the animation vocabulary, hex ↔
 * screen conversions, colour palette, ground/sky art lookup and graphics presets.
 *
 * The interface imports this statically at start-up. The 2D views
 * (`@pr/presentation`, which carries PixiJS) are loaded on demand, the first time
 * a screen shows the map, a battle or the bestiary, so the main menu never waits
 * for the renderer.
 */
export * from './palette';
export * from './environmentArt';
export * from './graphics';
export * from './hexmath';
export * from './sprites';
