/** Naval random-map templates (2026-10-17): The Shattered Crown and The Serpent Straits. */
export * from './templates';
export { vertexDisjointPaths } from './geometry';
export { generateNavalSkirmish, navalSettingsProblem, NavalGenerationError, type NavalGenOptions, type NavalHarbor } from './generate';
export { analyzeNavalMap, validateNavalMap, type NavalAnalysis, type NavalIsland, type NavalLandingCluster } from './validate';
