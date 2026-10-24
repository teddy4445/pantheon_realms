import { loadCatalog } from '@pr/content';

/** Read the same validated, frozen catalog used at game startup. Documentation
 * exports are snapshots, never a second source of gameplay definitions. */
export const catalog = loadCatalog();
