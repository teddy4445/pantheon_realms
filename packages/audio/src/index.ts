/**
 * @pr/audio — sound for Pantheon Realms.
 *
 * A sound manifest maps stable IDs to bundled files and mixing buses; the
 * AudioDirector plays them through one Web Audio graph. Presentation only: it
 * never reads or changes game state, and silence never blocks play.
 */
export * from './manifest';
export * from './director';
