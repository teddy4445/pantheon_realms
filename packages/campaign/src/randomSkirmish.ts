/**
 * Random skirmish maps for the setup screens: a thin wrapper around the map
 * generator (@pr/mapgen) so the session and the interface can start and preview
 * generated scenarios without depending on the generator package directly.
 */
import type { ContentCatalog } from '@pr/rules';
import { generateSkirmish, type MapCheck, type SkirmishGenOptions } from '@pr/mapgen';
import type { GeneratedScenario } from './missionFactory';

export {
  RANDOM_TEMPLATE_ID,
  SKIRMISH_GENERATOR_VERSION,
  SKIRMISH_SIZE_LABEL,
  SKIRMISH_SIZE_RADIUS,
  skirmishSizeAllows,
  type SkirmishGenOptions,
  type SkirmishMapSize,
  type SkirmishSeat,
  type SkirmishVictory,
} from '@pr/mapgen';

export interface RandomSkirmish extends GeneratedScenario {
  /** Fairness checks the generator ran (all must pass for a returned map). */
  readonly checks: readonly MapCheck[];
}

/** Generate a random skirmish scenario (deterministic for the same options). */
export function createRandomSkirmish(catalog: ContentCatalog, opts: SkirmishGenOptions): RandomSkirmish {
  const g = generateSkirmish(catalog, opts);
  return { mission: g.mission, map: g.map, decor: g.decor, checks: g.checks };
}
