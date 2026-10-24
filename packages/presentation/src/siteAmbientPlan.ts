/** Ambient identities are explicit, so coverage and performance budgets are testable. */
export const AMBIENT_EFFECTS = [
  'town-pennants', 'town-windows', 'tower-beacon', 'tower-birds', 'camp-flame', 'camp-embers',
  'shrine-rays', 'shrine-motes', 'stone-runes', 'hut-lantern', 'tent-cloth', 'portal-spiral',
  'portal-rings', 'relic-halo', 'chest-glint', 'statue-votives', 'tree-leaves', 'tree-butterflies',
  'waterfall-stream', 'waterfall-mist', 'waterfall-foam', 'ruins-dust', 'ruins-fireflies',
  'sluice-drips', 'mine-cart', 'quarry-dust',
] as const;
export type AmbientEffect = typeof AMBIENT_EFFECTS[number];
export function siteAmbientEffects(kind: string, art = ''): readonly AmbientEffect[] {
  if (art.includes('landmark.tree-')) return ['tree-leaves', 'tree-butterflies'];
  if (art.includes('landmark.waterfall-')) return ['waterfall-stream', 'waterfall-mist', 'waterfall-foam'];
  if (art.includes('landmark.ruins-')) return ['ruins-dust', 'ruins-fireflies'];
  if (art.includes('landmark.statue-')) return ['statue-votives'];
  switch(kind) {
    case 'town': return ['town-pennants', 'town-windows'];
    case 'watchtower': return ['tower-beacon', 'tower-birds'];
    case 'camp': case 'refuge': return ['camp-flame', 'camp-embers'];
    case 'spell_shrine': case 'event_site': return ['shrine-rays', 'shrine-motes'];
    case 'learning_stone': return ['stone-runes'];
    case 'quest_hut': return ['hut-lantern'];
    case 'key_tent': return ['tent-cloth'];
    case 'portal': return ['portal-spiral', 'portal-rings'];
    case 'relic': return ['relic-halo'];
    case 'treasure_chest': case 'pickup': return ['chest-glint'];
    case 'sluice': return ['sluice-drips'];
    case 'gold_mine': return ['mine-cart'];
    case 'quarry': return ['quarry-dust'];
    case 'grove': return ['tree-leaves', 'tree-butterflies'];
    case 'beacon': case 'relay': return ['tower-beacon'];
    default: return [];
  }
}
export function ambientVisible(shown: boolean, loaded: boolean, visible: boolean, inView: boolean, motion: boolean): boolean {
  return shown && loaded && visible && inView && motion;
}
