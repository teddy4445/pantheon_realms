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
  | 'gift';

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
};

/** Every icon name, in declaration order (the icon catalog tool lists them). */
export const ICON_NAMES = Object.keys(PATHS) as IconName[];

/** URL of the icon art for a name, or null when the icon is an SVG glyph. */
export function iconArt(name: IconName): string | null {
  // Names without art in the pack take delivered final art under `icon.ui.<name>` (ICON_CATALOG.md).
  return resolveAsset(ICON_ART[name] ?? `icon.ui.${name}`).url;
}

export interface IconProps extends SVGProps<SVGSVGElement> {
  readonly name: IconName;
  readonly title?: string;
  /** Force the SVG glyph even when icon art exists (e.g. tiny monochrome contexts). */
  readonly glyph?: boolean;
}

export function Icon({ name, title, glyph, className, ...rest }: IconProps) {
  const art = glyph ? null : iconArt(name);
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
      {art ? <image href={art} x="0" y="0" width="24" height="24" preserveAspectRatio="xMidYMid meet" /> : PATHS[name]}
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
