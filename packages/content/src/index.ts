/**
 * @pr/content — immutable definitions (creatures, towns, gods, heroes, spells,
 * campaigns, map templates) and the ContentValidator suite.
 */
export { buildCatalog, loadCatalog, VERSIONS } from './catalog';
export { validateCatalog, validateGeneratedMission, VALIDATORS, type ValidationIssue, type ValidationReport } from './validation/validators';
export { THREE_BEACONS } from './campaign/threeBeacons';
export { WINTER_OATH } from './campaign/winterOath';
