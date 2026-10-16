/**
 * Painted route markers lookup (recruitment & route kit 2026-10-14) — presentation
 * only, no PixiJS import (part of `@pr/presentation/core`).
 *
 * The interface registers a resolver from its asset manifest at start-up
 * (`registerRouteArt`). The map draws a planned route with these pictures: a gold
 * arrowhead on each step reachable today, a bronze one on later days' steps (with
 * an upright hourglass where a new day begins, so the days never differ by colour
 * alone), the destination seal laid on the ground with an upright parchment
 * carrying the live arrival day, and the selected hero's ring. When nothing is
 * registered or a picture fails to load, the map keeps its drawn route.
 */
export type RouteMarkerId = 'chevronToday' | 'chevronLater' | 'hourglass' | 'dayBadge' | 'destination' | 'selectionRing';

export const ROUTE_MARKER_IDS: readonly RouteMarkerId[] = ['chevronToday', 'chevronLater', 'hourglass', 'dayBadge', 'destination', 'selectionRing'];

export interface RouteMarkerArt {
  readonly url: string;
  readonly width: number;
  readonly height: number;
  /** The painted part of the picture as fractions [left, top, right, bottom] (sizes go by what shows). */
  readonly visibleBounds: readonly [number, number, number, number];
}

type Resolver = (id: RouteMarkerId) => RouteMarkerArt | null;

let resolver: Resolver = () => null;

/** Set by the interface from its asset manifest. */
export function registerRouteArt(fn: Resolver): void {
  resolver = fn;
}

export function routeMarkerArt(id: RouteMarkerId): RouteMarkerArt | null {
  return resolver(id);
}
