/**
 * UI icons. Illustrative icons (resources, stats, battle actions, main-menu
 * entries) draw the owner-supplied icon art from assets-runtime/ui (asset IDs
 * in ICON_ART); interface glyphs (close, back, check, lock…) and anything
 * without art stay simple original SVG shapes. Either way the element is an
 * <svg> with a 24×24 view box, so sizing, layout and accessibility are the
 * same, and final iconography replaces files by asset ID only.
 */
import type { JSX, SVGProps } from 'react';
import { resolveAsset } from './manifest';

export type IconName =
  | 'gold'
  | 'wood'
  | 'stone'
  | 'crystal'
  | 'favor'
  | 'attack'
  | 'defense'
  | 'hp'
  | 'damage'
  | 'speed'
  | 'shots'
  | 'range'
  | 'growth'
  | 'movement'
  | 'mana'
  | 'morale'
  | 'luck'
  | 'power'
  | 'knowledge'
  | 'xp'
  | 'hero'
  | 'town'
  | 'journal'
  | 'overview'
  | 'bestiary'
  | 'pantheon'
  | 'settings'
  | 'save'
  | 'load'
  | 'hourglass'
  | 'back'
  | 'close'
  | 'play'
  | 'pause'
  | 'stop'
  | 'continue'
  | 'newgame'
  | 'campaign'
  | 'skirmish'
  | 'quit'
  | 'credits'
  | 'defend'
  | 'wait'
  | 'retreat'
  | 'spell'
  | 'auto'
  | 'upgrade'
  | 'lock'
  | 'check'
  | 'info'
  | 'swap'
  | 'flag'
  | 'eye'
  | 'map'
  | 'beacon'
  | 'star'
  | 'sword2'
  | 'bow'
  | 'ability'
  | 'surrender'
  | 'build'
  | 'recruit'
  | 'market'
  | 'tavern'
  | 'merchant'
  | 'gift'
  | 'journey'
  | 'army'
  | 'recruitall'
  | 'train'
  // Expedition, naval & siege kit (2026-10-17): the 28 controls (paths of assets-runtime/expedition-v1/icons/).
  | 'inspect'
  | 'pin'
  | 'source'
  | 'remaining'
  | 'sighting'
  | 'identified'
  | 'scouted'
  | 'staleReport'
  | 'caravan'
  | 'dispatch'
  | 'arrival'
  | 'cargo'
  | 'route'
  | 'blocked'
  | 'intercept'
  | 'garrison'
  | 'ship'
  | 'embark'
  | 'disembark'
  | 'boarding'
  | 'anchor'
  | 'catapult'
  | 'aim'
  | 'fire'
  | 'skip'
  | 'wreck'
  | 'ownerFlag'
  | 'water';

const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const PATHS: Record<IconName, JSX.Element> = {
  gold: (
    <g>
      <ellipse cx="12" cy="15" rx="7.5" ry="3.2" fill="#8f6a2f" stroke="#f1d99a" strokeWidth="1" />
      <ellipse cx="12" cy="12" rx="7.5" ry="3.2" fill="#c9a05a" stroke="#f1d99a" strokeWidth="1" />
      <ellipse cx="12" cy="9" rx="7.5" ry="3.2" fill="#e8c46f" stroke="#fff1c4" strokeWidth="1" />
      <path d="M9.5 9h5" stroke="#8f6a2f" strokeWidth="1.2" />
    </g>
  ),
  wood: (
    <g>
      <rect x="3" y="12" width="16" height="4.5" rx="2.2" fill="#8a5a33" stroke="#e0b98a" strokeWidth="0.9" />
      <rect x="5" y="7" width="16" height="4.5" rx="2.2" fill="#a06a3c" stroke="#e0b98a" strokeWidth="0.9" />
      <circle cx="19" cy="9.25" r="1.6" fill="#e3c393" />
      <circle cx="17" cy="14.25" r="1.6" fill="#e3c393" />
    </g>
  ),
  stone: (
    <g>
      <path d="M4 16l3-7 6-2 6 4 1 6-8 3z" fill="#8d9097" stroke="#e1e3e8" strokeWidth="0.9" />
      <path d="M7 9l5 3 8-1M12 12l-1 8" stroke="#5a5d63" strokeWidth="0.9" fill="none" />
    </g>
  ),
  crystal: (
    <g>
      <path d="M12 2.5l5 6-5 13-5-13z" fill="#4aa8ff" stroke="#d6ecff" strokeWidth="0.9" />
      <path d="M7 8.5h10M12 2.5v19" stroke="#d6ecff" strokeWidth="0.7" />
      <path d="M17.5 11l3 2.5-3 5-2-4z" fill="#2f7fd6" stroke="#d6ecff" strokeWidth="0.7" />
    </g>
  ),
  favor: (
    <g>
      <path d="M12 2l2.2 6.6H21l-5.5 4 2.1 6.6L12 15.3 6.4 19.2l2.1-6.6L3 8.6h6.8z" fill="#f3c86b" stroke="#fff3cf" strokeWidth="0.9" />
      <circle cx="12" cy="11" r="2" fill="#fff3cf" />
    </g>
  ),
  attack: <path {...common} d="M5 19L17 7m0 0l1-3 3-1-1 3-3 1m-9 7l3 3m-5 1l2-2" />,
  sword2: <path {...common} d="M4 20l9-9m2-2l5-5m-7 3l3 3M6 14l4 4" />,
  bow: <path {...common} d="M6 4c8 2 12 6 14 14M6 4l14 14M9 20l3-3M4 15l3-3" />,
  defense: <path {...common} d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z" />,
  hp: <path {...common} d="M12 20s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.5-7 10-7 10z" />,
  damage: <path {...common} d="M12 3v6m0 6v6M3 12h6m6 0h6M6 6l3 3m6 6l3 3m0-12l-3 3m-6 6l-3 3" />,
  speed: <path {...common} d="M4 17h8l3-8h5M9 17l2-5m-7 7h16" />,
  shots: <path {...common} d="M4 20L20 4m0 0h-6m6 0v6M7 17l-3-1 1-3" />,
  range: <path {...common} d="M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zm0 5a4 4 0 1 0 0 8a4 4 0 1 0 0-8zm0 3v2" />,
  growth: <path {...common} d="M12 21v-8m0 0c0-4 3-7 7-7 0 4-3 7-7 7zm0 2c0-3-2.5-5.5-6-5.5 0 3 2.5 5.5 6 5.5z" />,
  movement: <path {...common} d="M7 20c2-1 2-4 2-6s-2-3-2-6a3 3 0 016 0M13 20c1.5 0 2.5-1 2.5-3s-1.5-3-1.5-5a2.5 2.5 0 015 0" />,
  mana: <path {...common} d="M12 3c3 4 6 7 6 10.5A6 6 0 016 13.5C6 10 9 7 12 3z" />,
  morale: <path {...common} d="M5 21V4m0 0h11l-2 4 2 4H5" />,
  luck: <path {...common} d="M12 12c-3-5-8-3-6 1s6 3 6-1zm0 0c3-5 8-3 6 1s-6 3-6-1zm0 0c-5 3-3 8 1 6s3-6-1-6zm0 0v9" />,
  power: <path {...common} d="M13 2L5 13h6l-1 9 8-11h-6z" />,
  knowledge: <path {...common} d="M4 5c3-1 6 0 8 2 2-2 5-3 8-2v13c-3-1-6 0-8 2-2-2-5-3-8-2zm8 2v13" />,
  xp: <path {...common} d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z" />,
  hero: <path {...common} d="M12 11a4 4 0 100-8 4 4 0 000 8zm-7 10c0-4 3-7 7-7s7 3 7 7M9 3l3-1 3 1" />,
  town: <path {...common} d="M3 21h18M5 21V10l7-5 7 5v11M9 21v-5h6v5M7 10h10" />,
  journal: <path {...common} d="M6 3h11a2 2 0 012 2v16H8a2 2 0 01-2-2zm0 16a2 2 0 012-2h11M10 8h6m-6 4h5" />,
  overview: <path {...common} d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zm6-2v14m6-12v14" />,
  bestiary: <path {...common} d="M5 19c0-6 3-9 7-9s7 3 7 9M8 10L6 5l4 2 2-3 2 3 4-2-2 5M10 14h.01M14 14h.01" />,
  pantheon: <path {...common} d="M3 20h18M4 17h16M5 9h14l-7-5zM6 9v8m4-8v8m4-8v8m4-8v8" />,
  settings: <path {...common} d="M12 15a3 3 0 100-6 3 3 0 000 6zm7.4-3a7.4 7.4 0 00-.1-1.2l2-1.5-2-3.4-2.4.9a7 7 0 00-2-1.2L14.5 3h-5l-.4 2.6a7 7 0 00-2 1.2l-2.4-.9-2 3.4 2 1.5a7.4 7.4 0 000 2.4l-2 1.5 2 3.4 2.4-.9a7 7 0 002 1.2l.4 2.6h5l.4-2.6a7 7 0 002-1.2l2.4.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z" />,
  save: <path {...common} d="M5 3h11l3 3v15H5zm3 0v5h7V3M8 21v-7h8v7" />,
  load: <path {...common} d="M4 7h6l2 2h8v10H4zm8 3v6m-3-3l3 3 3-3" />,
  hourglass: <path {...common} d="M7 3h10M7 21h10M8 3c0 5 8 6 8 9s-8 4-8 9m8-18c0 5-8 6-8 9s8 4 8 9" />,
  back: <path {...common} d="M15 5l-7 7 7 7" />,
  close: <path {...common} d="M6 6l12 12M18 6L6 18" />,
  play: <path {...common} d="M8 5l11 7-11 7z" />,
  pause: <path {...common} d="M8 5v14m8-14v14" />,
  stop: <rect {...common} x="6" y="6" width="12" height="12" />,
  continue: <path {...common} d="M6 5l7 7-7 7m6-14l7 7-7 7" />,
  newgame: <path {...common} d="M12 3l2 5h5l-4 3.5 1.5 5.5L12 14l-4.5 3 1.5-5.5L5 8h5z" />,
  campaign: <path {...common} d="M4 5l5-2 6 2 5-2v15l-5 2-6-2-5 2zm5-2v15m6-13v15M7 9l2 1 2-2 2 3 2-1" />,
  skirmish: <path {...common} d="M5 19L15 9m0 0l1-4 4-1-1 4zM19 19L9 9m0 0L8 5 4 4l1 4z" />,
  quit: <path {...common} d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10" />,
  credits: <path {...common} d="M12 21a9 9 0 100-18 9 9 0 000 18zm0-12v.01M11 12h1v5h1" />,
  defend: <path {...common} d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6zm0 5v8m-3-4h6" />,
  wait: <path {...common} d="M12 21a9 9 0 100-18 9 9 0 000 18zm0-14v5l3 3" />,
  retreat: <path {...common} d="M10 5l-6 7 6 7M4 12h11a5 5 0 010 10" />,
  spell: <path {...common} d="M5 19L15 9m2-6l1 3 3 1-3 1-1 3-1-3-3-1 3-1zM6 5l.5 1.5L8 7l-1.5.5L6 9l-.5-1.5L4 7l1.5-.5z" />,
  auto: <path {...common} d="M4 12a8 8 0 0114-5.3M20 12a8 8 0 01-14 5.3M18 3v4h-4M6 21v-4h4" />,
  upgrade: <path {...common} d="M12 20V6m0 0l-6 6m6-6l6 6M6 4h12" />,
  lock: <path {...common} d="M6 11h12v10H6zm2 0V8a4 4 0 018 0v3" />,
  check: <path {...common} d="M5 12l5 5 9-10" />,
  info: <path {...common} d="M12 21a9 9 0 100-18 9 9 0 000 18zm0-12v.01M12 11v6" />,
  swap: <path {...common} d="M4 8h14l-3-3m5 11H6l3 3" />,
  flag: <path {...common} d="M5 21V4h11l-2 3.5L16 11H5" />,
  eye: <path {...common} d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zm10 3a3 3 0 100-6 3 3 0 000 6z" />,
  map: <path {...common} d="M9 4l-6 2v14l6-2 6 2 6-2V4l-6 2zm0 0v14m6-12v14" />,
  beacon: <path {...common} d="M9 21h6l-1-11h-4zM8 10h8M10 10V7h4v3M12 7c-2-2 0-4 0-4s2 2 0 4zM5 5l2 2m12-2l-2 2" />,
  star: <path {...common} d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z" />,
  ability: <path {...common} d="M12 2l2 7 7 3-7 3-2 7-2-7-7-3 7-3z" />,
  surrender: <path {...common} d="M6 21V4m0 0h10l-1.5 3.5L16 11H6" />,
  // Town actions (2026-10-03): glyphs until icon art is delivered as icon.ui.<name>.
  build: <path {...common} d="M13.5 3.5l7 7-2.6 2.6-7-7zM12.2 7.8l-8.6 8.6a1.5 1.5 0 000 2.1l1.9 1.9a1.5 1.5 0 002.1 0l8.6-8.6" />,
  recruit: <path {...common} d="M4 15a8 8 0 0116 0v2h-5v4H9v-4H4zM12 7V2.5M9.5 2.5h5M8 12h8" />,
  market: <path {...common} d="M12 3v17M7.5 20.5h9M4.5 7h15M6.5 7L3.5 13a3 3 0 006 0zM17.5 7l-3 6a3 3 0 006 0z" />,
  tavern: <path {...common} d="M5 8h10v11a2 2 0 01-2 2H7a2 2 0 01-2-2zM15 11h2a2 2 0 012 2v2a2 2 0 01-2 2h-2M5 8c0-2 1.6-3 3-2.2C8.7 4 11.6 4 12.6 5.8 14 5.2 15 6.3 15 8M8.5 12v5M11.5 12v5" />,
  merchant: <path {...common} d="M8 8h8l3 4v6a3 3 0 01-3 3H8a3 3 0 01-3-3v-6zM9.5 8L7.5 3.5h9l-2 4.5M13.6 12.2h-2.4a1.2 1.2 0 000 2.4h1.6a1.2 1.2 0 010 2.4h-2.6M12 11v1.2M12 17v1.2" />,
  gift: <path {...common} d="M4 10h16v4H4zM5.5 14h13v7h-13zM12 10v11M12 10c-1.5-3.5-6-4.5-6-1.5S12 10 12 10zm0 0c1.5-3.5 6-4.5 6-1.5S12 10 12 10z" />,
  // Recruitment & route kit (2026-10-14): glyphs under the painted icons (ICON_ART).
  army: <path {...common} d="M8 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zm8 0a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM3 20v-3a5 5 0 0110 0v3m-2-6.5a5 5 0 0110 3.5v3" />,
  journey: <path {...common} d="M5 4h5v8l4 3v4H5zM5 15h9M15 9h6m-2.5-2.5L21 9l-2.5 2.5" />,
  recruitall: <path {...common} d="M7 4v16M12 2v18M17 4v16M5 13a2 3 0 004 0v-3H5zm5 0a2 3 0 004 0v-3h-4zm5 0a2 3 0 004 0v-3h-4z" />,
  train: <path {...common} d="M4 14h12l-2 3H6zM8 17v3h4v-3M14 4l6 6-2 2-6-6zM11 9l-5 5" />,
  // Expedition, naval & siege kit (2026-10-17): the kit's own paths, drawn in the current colour like
  // every glyph (the kit's files draw the same path in gold; `EXPEDITION_ICONS` names each file's ID).
  inspect: <path {...common} d="M3 11s3-6 9-6 9 6 9 6-3 6-9 6-9-6-9-6zm9-3a3 3 0 100 6 3 3 0 000-6" />,
  pin: <path {...common} d="M8 3h8l-1 6 3 4H6l3-4zM12 13v8" />,
  source: <path {...common} d="M5 5h6v6H5zM13 15h6v6h-6zM11 8h5v7" />,
  remaining: <path {...common} d="M7 3h10M7 21h10M8 3c0 5 8 6 8 9s-8 4-8 9m8-18c0 5-8 6-8 9s8 4 8 9" />,
  sighting: <path {...common} d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12M12 9v6" />,
  identified: <path {...common} d="M8 10a3 3 0 100-6 3 3 0 000 6M3 20v-3a5 5 0 0110 0v3M15 7l2 2 4-5M16 15h5m-5 4h5" />,
  scouted: <path {...common} d="M3 16l3-9h4v9a4 4 0 11-7 0zm11 0V7h4l3 9a4 4 0 11-7 0zM10 10h4" />,
  staleReport: <path {...common} d="M4 3h11v9M4 3v18h6M7 7h5m-5 4h5M17 13a4 4 0 100 8 4 4 0 000-8M17 15v2l2 1" />,
  caravan: <path {...common} d="M3 14V7h12v7H3zm1-7a5 5 0 0110 0M4 14v2m9-2v2M5 16a2 2 0 100 4 2 2 0 000-4m8 0a2 2 0 100 4 2 2 0 000-4M15 12h5l1 5m-3-5V8l3-1" />,
  dispatch: <path {...common} d="M3 12h17m-6-6l6 6-6 6M3 5h5M3 19h5" />,
  arrival: <path {...common} d="M3 21h18M5 21V9l7-5 7 5v16M9 15l2 2 5-6" />,
  cargo: <path {...common} d="M4 7l8-4 8 4v13H4V7zm0 0h16M12 3v17M8 5l8 4v4" />,
  route: <path {...common} d="M5 5a2 2 0 100 4 2 2 0 000-4M19 15a2 2 0 100 4 2 2 0 000-4M7 7h8a3 3 0 010 6H9a3 3 0 000 6h8" />,
  blocked: <path {...common} d="M4 5l16 14M4 19L20 5M3 12a9 9 0 1018 0 9 9 0 10-18 0" />,
  intercept: <path {...common} d="M4 20L17 7l3-4-4 3L4 20M20 20L7 7 4 3l3 4 13 13M5 15l4 4m6-14l4 4" />,
  garrison: <path {...common} d="M3 21h18M5 21V6h3V3h3v3h2V3h3v3h3v15M10 21v-6h4v6" />,
  ship: <path {...common} d="M3 15h18l-4 5H7zM12 3v12M11 4L5 12h6m2-8l6 8h-6M3 22q3-2 6 0 3-2 6 0 3-2 6 0" />,
  embark: <path {...common} d="M3 15h18l-4 5H7zM6 4v8m-3-3l3 3 3-3M12 5h7v7" />,
  disembark: <path {...common} d="M3 15h18l-4 5H7zM6 12V4M3 7l3-3 3 3M12 5h7v7" />,
  boarding: <path {...common} d="M2 9h6v10H2zm14 0h6v10h-6M8 12h8v4H8M4 3v6m16-6v6" />,
  anchor: <path {...common} d="M12 6v15M5 13v3c0 3 7 5 7 5s7-2 7-5v-3M9 6h6M12 2a2 2 0 100 4 2 2 0 000-4M3 14l2-2 2 2m10 0l2-2 2 2" />,
  catapult: <path {...common} d="M3 17h17M5 17l4-9 6 9M9 8l10-4M17 3l3 1-1 3M5 18a2 2 0 100 4 2 2 0 000-4m12 0a2 2 0 100 4 2 2 0 000-4" />,
  aim: <path {...common} d="M12 2v5m0 10v5M2 12h5m10 0h5M12 5a7 7 0 100 14 7 7 0 000-14M12 10a2 2 0 100 4 2 2 0 000-4" />,
  fire: <path {...common} d="M4 20L17 7m-5 0h5v5M4 6l3 1-1-4m12 14l3 1-1-4" />,
  skip: <path {...common} d="M5 5l10 7-10 7zM19 5v14" />,
  wreck: <path {...common} d="M4 17l4 4h9l4-6-6 2-3-5-3 5zM12 12V3l4 2-3 3M3 23h18" />,
  ownerFlag: <path {...common} d="M5 22V3M5 4h14l-3 5 3 5H5" />,
  water: <path {...common} d="M2 7q3-3 6 0t6 0 6 0M2 12q3-3 6 0t6 0 6 0M2 17q3-3 6 0t6 0 6 0" />,
};

/** Illustrative icons drawn from the UI art manifest (asset IDs, never file paths). */
/** Icon art by name (asset IDs); names not listed draw their SVG glyph. Read by the icon catalog tool. */
export const ICON_ART: Partial<Record<IconName, string>> = {
  gold: 'icon.res.gold',
  wood: 'icon.res.wood',
  stone: 'icon.res.stone',
  crystal: 'icon.res.crystal',
  favor: 'icon.res.favor',
  attack: 'icon.stat.attack',
  defense: 'icon.stat.defense',
  hp: 'icon.stat.hp',
  damage: 'icon.stat.damage',
  speed: 'icon.stat.speed',
  shots: 'icon.stat.shots',
  range: 'icon.stat.range',
  movement: 'icon.stat.movement',
  mana: 'icon.stat.mana',
  morale: 'icon.stat.morale',
  luck: 'icon.stat.luck',
  power: 'icon.stat.power',
  knowledge: 'icon.stat.knowledge',
  xp: 'icon.stat.xp',
  hero: 'icon.world.hero',
  town: 'icon.world.town',
  hourglass: 'icon.time.day',
  eye: 'icon.stat.vision',
  defend: 'icon.action.defend',
  wait: 'icon.action.wait',
  spell: 'icon.action.spell',
  retreat: 'icon.action.retreat',
  ability: 'icon.action.ability',
  surrender: 'icon.action.surrender',
  continue: 'icon.menu.continue',
  newgame: 'icon.menu.new-game',
  load: 'icon.menu.load-game',
  campaign: 'icon.menu.campaign',
  skirmish: 'icon.menu.skirmish',
  bestiary: 'icon.menu.encyclopedia',
  settings: 'icon.menu.settings',
  credits: 'icon.menu.credits',
  quit: 'icon.menu.quit',
  army: 'icon.world.army',
  journey: 'recruitroute.icon-resume-route',
  recruitall: 'recruitroute.icon-recruit-all',
  train: 'recruitroute.icon-train-troops',
};

/**
 * The expedition kit's controls (2026-10-17) by Icon name → their kit asset ID (`expedition.icon.*`,
 * files in assets-runtime/expedition-v1/icons/). Default to glyphs (their paths above), with final
 * painted art taking precedence when supplied (such as the caravan). `flag` stays the delivered objective flag
 * (icon.ui.flag); the kit's ship/owner flag is `ownerFlag`.
 */
export const EXPEDITION_ICONS: Readonly<Partial<Record<IconName, string>>> = {
  inspect: 'expedition.icon.inspect',
  pin: 'expedition.icon.pin',
  source: 'expedition.icon.source',
  remaining: 'expedition.icon.remaining',
  sighting: 'expedition.icon.sighting',
  identified: 'expedition.icon.identified',
  scouted: 'expedition.icon.scouted',
  staleReport: 'expedition.icon.stale-report',
  caravan: 'expedition.icon.caravan',
  dispatch: 'expedition.icon.dispatch',
  arrival: 'expedition.icon.arrival',
  cargo: 'expedition.icon.cargo',
  route: 'expedition.icon.route',
  blocked: 'expedition.icon.blocked',
  intercept: 'expedition.icon.intercept',
  garrison: 'expedition.icon.garrison',
  ship: 'expedition.icon.ship',
  embark: 'expedition.icon.embark',
  disembark: 'expedition.icon.disembark',
  boarding: 'expedition.icon.boarding',
  anchor: 'expedition.icon.anchor',
  catapult: 'expedition.icon.catapult',
  aim: 'expedition.icon.aim',
  fire: 'expedition.icon.fire',
  skip: 'expedition.icon.skip',
  wreck: 'expedition.icon.wreck',
  ownerFlag: 'expedition.icon.flag',
  water: 'expedition.icon.water',
};

/** Every icon name, in declaration order (the icon catalog tool lists them). */
export const ICON_NAMES = Object.keys(PATHS) as IconName[];

/** URL of the icon art for a name, or null when the icon is an SVG glyph. */
export function iconArt(name: IconName): string | null {
  // Names without art in the pack take delivered final art under `icon.ui.<name>` (`npm run icons:catalog`).
  return resolveAsset(ICON_ART[name] ?? `icon.ui.${name}`).url;
}

export interface IconProps extends SVGProps<SVGSVGElement> {
  readonly name: IconName;
  readonly title?: string;
  /** Force the SVG glyph even when icon art exists (e.g. tiny monochrome contexts). */
  readonly glyph?: boolean;
}

export function Icon({ name, title, glyph, className, ...rest }: IconProps) {
  const illustrated = !glyph && (name === 'ship' || name === 'catapult');
  const art = glyph || illustrated ? null : iconArt(name);
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      className={art ? `icon-art ${className ?? ''}` : className}
      data-icon={name}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {illustrated ? name === 'ship' ? <g strokeLinejoin="round" strokeLinecap="round">
        <path d="M2 20q3-2 6 0t6 0t7 0M4 23q3-2 6 0t6 0t6 0" fill="none" stroke="#69b7c9" strokeWidth="1.1"/>
        <path d="M2 15l4 5h12l4-7-5 2z" fill="#91603b" stroke="#f0c777" strokeWidth="1"/>
        <path d="M5 17h14" stroke="#ddb374"/><path d="M12 2v14" stroke="#f1ce86" strokeWidth="1.4"/>
        <path d="M10 3Q4 8 4 12h6z" fill="#e6d7ad" stroke="#c69c5d" strokeWidth=".7"/>
        <path d="M14 4q6 4 6 8h-6z" fill="#5c95af" stroke="#e6c17c" strokeWidth=".7"/>
        <path d="M12 2h6l-2 2h-4" fill="#d4a854"/><path d="M4 15l-2-3" stroke="#f0c777"/>
      </g> : <g strokeLinejoin="round" strokeLinecap="round">
        <path d="M3 18h18l-2 2H5z" fill="#765033" stroke="#dfb66b"/>
        <path d="M6 18l6-12 6 12M9 13h6" fill="none" stroke="#e1b773" strokeWidth="2"/>
        <path d="M9 16L19 3" stroke="#563d2c" strokeWidth="3.2"/><path d="M9 16L19 3" stroke="#e2be7d" strokeWidth="1.6"/>
        <path d="M17 2l5 2-2 3-3-2z" fill="#9e7846" stroke="#f5d58f" strokeWidth=".8"/>
        <circle cx="20" cy="3" r="1.7" fill="#b2b9b5" stroke="#edf1da" strokeWidth=".6"/>
        <path d="M7 7l6 1-1 5-6-1z" fill="#8a9397" stroke="#d9bd7c" strokeWidth=".8"/>
        <circle cx="6" cy="20" r="2.5" fill="#493d31" stroke="#e8bd72"/><circle cx="18" cy="20" r="2.5" fill="#493d31" stroke="#e8bd72"/>
        <path d="M6 18v4m-2-2h4m10-2v4m-2-2h4" stroke="#c99d58" strokeWidth=".7"/>
      </g> : art ? <image href={art} x="0" y="0" width="24" height="24" preserveAspectRatio="xMidYMid meet" /> : PATHS[name]}
    </svg>
  );
}

export const RESOURCE_ICON: Record<string, IconName> = {
  gold: 'gold',
  wood: 'wood',
  stone: 'stone',
  crystal: 'crystal',
  favor: 'favor',
};
