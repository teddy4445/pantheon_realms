/**
 * Procedural placeholder art (clearly temporary): creature silhouettes by body
 * profile, hero busts, god medallions, pantheon emblems and mission thumbnails.
 *
 * One coherent style so screens look composed while final art is pending.
 * Final assets replace these by asset ID through the manifest (assets/manifest.ts).
 */
import type { JSX } from 'react';
import type { BodyProfile } from '@pr/rules';

function hashHue(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % 360;
}

const SILHOUETTES: Record<BodyProfile, (up: boolean) => JSX.Element> = {
  humanoid_spear: (up) => (
    <g>
      <path d="M50 22c6 0 9 4 9 9s-3 8-9 8-9-3-9-8 3-9 9-9z" />
      {up ? <path d="M42 22c4-9 12-11 18-6l-4 4c-3-2-8-1-10 3z" /> : <path d="M41 28c1-6 5-9 9-9s8 3 9 9z" />}
      <path d="M38 41h24l4 22h-7l-2 22h-6l-1-16-1 16h-6l-2-22h-7z" />
      <circle cx="33" cy="56" r="14" />
      <path d="M68 12l3 1-6 78-3-1z" />
      <path d="M69 6l4 9h-8z" />
    </g>
  ),
  humanoid_thrower: (up) => (
    <g>
      <path d="M48 24c6 0 9 4 9 9s-3 8-9 8-9-3-9-8 3-9 9-9z" />
      {up ? <path d="M39 30c0-8 5-12 10-12s9 4 9 11z" /> : null}
      <path d="M38 43h22l3 20h-6l-2 24h-6l-1-16-1 16h-6l-2-24h-6z" />
      <path d="M58 44l14-20 3 2-13 20z" />
      <path d="M72 10l3 14-5-1z" />
      <path d="M26 52c4-6 12-6 14 2-6-3-10-2-14-2z" />
      <path d="M30 44l-6 30M33 44l-4 31" stroke="currentColor" strokeWidth="2" fill="none" />
    </g>
  ),
  humanoid_caster: (up) => (
    <g>
      <path d="M50 20c6 0 9 4 9 9s-3 8-9 8-9-3-9-8 3-9 9-9z" />
      {up ? <path d="M40 22l10-10 10 10-3 2-7-6-7 6z" /> : null}
      <path d="M37 40h26l6 48H31z" />
      <path d="M70 18l2 72h-3l-2-72z" />
      <path d="M70.5 8l6 7-6 7-6-7z" />
      {up ? <circle cx="70.5" cy="15" r="9" fill="none" stroke="currentColor" strokeWidth="2" /> : null}
    </g>
  ),
  centaur: (up) => (
    <g>
      <path d="M44 18c5 0 8 3 8 8s-3 7-8 7-8-3-8-7 3-8 8-8z" />
      {up ? <path d="M36 22c3-8 11-10 16-5l-3 3c-3-2-8-2-10 2z" /> : null}
      <path d="M36 35h16l2 16h-18z" />
      <path d="M30 50h44c8 0 12 6 12 12v4H24v-6c0-6 2-10 6-10z" />
      <path d="M28 64h6l-2 24h-5zM40 64h6l-1 24h-5zM66 64h6l1 24h-5zM78 62h6l2 26h-5z" />
      <path d="M86 56c6 2 8 8 6 14-2-4-4-7-8-9z" />
      <path d="M58 8l3 1-20 60-3-1z" />
    </g>
  ),
  griffin: (up) => (
    <g>
      <path d="M30 56c0-10 10-16 24-16s22 8 22 18v6H30z" />
      <path d="M30 60h7l-2 26h-6zM44 62h6l-1 24h-6zM62 62h6l2 24h-6zM72 60h6l3 26h-6z" />
      <path d="M22 50c-4-6-2-14 6-16 6 0 10 6 8 12l-4 6z" />
      <path d="M18 40l-8 4 10 3z" />
      <path d="M44 44C38 26 42 12 56 6c-4 10-2 18 4 26 2-12 10-20 22-22-6 8-8 18-4 28z" />
      {up ? <path d="M24 34c-2-8 2-14 8-16-2 6 0 10 2 12z" /> : null}
      <path d="M78 58c8 0 12 6 10 14-2-5-5-8-10-9z" />
    </g>
  ),
  rider: (up) => (
    <g>
      <path d="M52 12c5 0 8 3 8 8s-3 7-8 7-8-3-8-7 3-8 8-8z" />
      {up ? <path d="M44 16c2-8 12-10 16-4l-3 2c-3-3-8-2-10 2z" /> : null}
      <path d="M44 27h16l2 20H42z" />
      <path d="M24 48h50c8 0 12 6 12 12v4H22v-8c0-5 1-8 2-8z" />
      <path d="M26 62h6l-2 26h-5zM38 62h6l-1 26h-5zM64 62h6l1 26h-5zM76 60h6l2 28h-5z" />
      <path d="M14 42c2-8 8-10 12-6l-2 10z" />
      <path d="M62 30l30-18 2 3-30 18z" />
    </g>
  ),
  bull_biped: (up) => (
    <g>
      <path d="M40 22c0-6 5-9 10-9s10 3 10 9-4 10-10 10-10-4-10-10z" />
      <path d="M40 18c-8-2-12-8-10-14 4 6 8 8 12 8zM60 18c8-2 12-8 10-14-4 6-8 8-12 8z" />
      <path d="M30 34h40l4 26h-9l-3 28h-8l-2-18-2 18h-8l-3-28h-9z" />
      {up ? <path d="M32 40h36v6H32z" /> : null}
      <path d="M76 20l3 1-6 66-3-1z" />
      <path d="M80 18c10 2 14 10 10 18-4-4-8-6-14-6z" />
    </g>
  ),
  giant: (up) => (
    <g>
      <path d="M36 22c0-8 6-12 14-12s14 4 14 12-6 12-14 12-14-4-14-12z" />
      <circle cx="50" cy="21" r="4.5" fill="var(--eye, #fff4d3)" />
      <path d="M26 36h48l6 28H66l-3 26H55l-2-18-3 18h-8l-3-26H24z" />
      <circle cx="80" cy="30" r="10" />
      {up ? <path d="M28 48h12v8H28zM60 48h12v8H60z" /> : null}
    </g>
  ),
  beast: (up) => (
    <g>
      <path d="M22 52c0-8 8-14 22-14h20c10 0 16 6 16 14v8H22z" />
      <path d="M24 58h6l-2 28h-5zM36 60h6l-1 26h-5zM62 60h6l2 26h-6zM72 58h6l3 28h-6z" />
      <path d="M78 48l12-10 2 14-8 6z" />
      <path d="M18 50l-8-14 12 6z" />
      {up ? <path d="M40 38l4-8 4 8 4-8 4 8z" /> : null}
    </g>
  ),
  serpent: (up) => (
    <g>
      <path d="M20 84c20 0 20-18 36-18s18-14 8-22-4-22 10-24c6 0 10 4 10 8l-6 2c-2-2-6-2-6 2 0 6 14 14 4 30-8 12-24 6-28 16-3 6-10 10-28 10z" />
      <path d="M86 22l6-4-2 8z" />
      {up ? <path d="M70 12l4-8 4 8z" /> : null}
    </g>
  ),
  winged_humanoid: (up) => (
    <g>
      <path d="M50 18c6 0 9 4 9 9s-3 8-9 8-9-3-9-8 3-9 9-9z" />
      <path d="M40 38h20l4 24h-7l-2 26h-10l-2-26h-7z" />
      <path d="M40 42C24 36 14 22 14 8c8 10 16 16 28 20zM60 42c16-6 26-20 26-34-8 10-16 16-28 20z" />
      {up ? <path d="M42 14l8-8 8 8z" /> : null}
    </g>
  ),
  spirit: (up) => (
    <g>
      <path d="M50 12c14 0 22 12 22 26 0 18-10 26-6 44-6-4-8-8-10-2-2-6-4-6-6 2-2-8-4-8-6-2-2-6-4-2-10 2 4-18-6-26-6-44 0-14 8-26 22-26z" />
      <circle cx="43" cy="34" r="3" fill="var(--eye, #9fe8ff)" />
      <circle cx="57" cy="34" r="3" fill="var(--eye, #9fe8ff)" />
      {up ? <path d="M36 14l14-10 14 10z" /> : null}
    </g>
  ),
  construct: (up) => (
    <g>
      <path d="M40 10h20v18H40z" />
      <path d="M30 30h40v30H62v28H54V70h-8v18h-8V60h-8z" />
      <path d="M20 32h8v26h-8zM72 32h8v26h-8z" />
      {up ? <path d="M36 4h28l-4 6H40z" /> : null}
    </g>
  ),
};

/** The silhouettes by body profile (also exported as SVG sources for the 2D placeholder sprites: `npm run sprites:plan`). */
export const CREATURE_SILHOUETTES = SILHOUETTES;

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

export interface CreaturePortraitProps {
  readonly seed: string;
  readonly body: BodyProfile;
  readonly upgraded: boolean;
  readonly tier: number;
  readonly accent: string;
  readonly label?: string;
}

export function CreaturePortraitArt({ seed, body, upgraded, tier, accent, label }: CreaturePortraitProps) {
  const id = `cp-${seed.replace(/[^a-z0-9]/gi, '')}`;
  const hue = hashHue(seed);
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label={label}>
      <defs>
        <radialGradient id={`${id}-bg`} cx="50%" cy="38%" r="75%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.85" />
          <stop offset="55%" stopColor={`hsl(${hue} 30% 16%)`} />
          <stop offset="100%" stopColor="#05090f" />
        </radialGradient>
        <linearGradient id={`${id}-fig`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={upgraded ? '#fff1c4' : '#efe3c4'} />
          <stop offset="100%" stopColor={upgraded ? '#c29a52' : '#8f8672'} />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${id}-bg)`} />
      <g opacity="0.18" stroke="#ead08f" strokeWidth="0.5" fill="none">
        <circle cx="50" cy="50" r="44" />
        <circle cx="50" cy="50" r="38" />
      </g>
      <g fill={`url(#${id}-fig)`} color={upgraded ? '#fff1c4' : '#efe3c4'} style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.6))' }}>
        {SILHOUETTES[body](upgraded)}
      </g>
      {upgraded ? (
        <g fill="none" stroke="#ead08f" strokeWidth="1.6" opacity="0.9">
          <path d="M14 78c-6-12-6-30 4-44" />
          <path d="M86 78c6-12 6-30-4-44" />
          <path d="M12 60l6-3M11 50l6-1M13 40l6 1M88 60l-6-3M89 50l-6-1M87 40l-6 1" />
        </g>
      ) : null}
      <text x="8" y="14" fontFamily="Cinzel, serif" fontSize="11" fill="#ead08f" opacity="0.9">
        {ROMAN[tier] ?? tier}
      </text>
      {upgraded ? (
        <path d="M86 6l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7z" fill="#ead08f" />
      ) : null}
    </svg>
  );
}

export function HeroPortraitArt({ seed, name, accent, variant }: { seed: string; name: string; accent: string; variant: 'champion' | 'strategos' | 'oracle' | 'story' }) {
  const id = `hp-${seed.replace(/[^a-z0-9]/gi, '')}`;
  const hue = hashHue(seed);
  const skin = `hsl(${25 + (hue % 20)} 35% ${52 + (hue % 12)}%)`;
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label={`${name} (placeholder portrait)`}>
      <defs>
        <radialGradient id={`${id}-bg`} cx="50%" cy="30%" r="80%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.9" />
          <stop offset="60%" stopColor={`hsl(${hue} 25% 14%)`} />
          <stop offset="100%" stopColor="#05090f" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${id}-bg)`} />
      <path d="M14 100c2-22 16-32 36-32s34 10 36 32z" fill={`hsl(${hue} 30% 28%)`} />
      <path d="M26 100c3-16 12-24 24-24s21 8 24 24z" fill={variant === 'oracle' ? '#d8cfb8' : '#8f6a2f'} opacity="0.85" />
      <ellipse cx="50" cy="46" rx="15" ry="18" fill={skin} />
      {variant === 'champion' || variant === 'strategos' ? (
        <g>
          <path d="M33 44c0-14 8-22 17-22s17 8 17 22l-5-2c-2-8-6-12-12-12s-10 4-12 12z" fill="#c29a52" />
          <path d="M50 22c6-8 18-10 24-4-8-1-16 2-20 8z" fill={variant === 'champion' ? '#b33a2f' : '#2f5fb3'} />
        </g>
      ) : (
        <path d="M34 46c-2-16 6-26 16-26s18 10 16 26c-2-6-6-12-16-12s-14 6-16 12z" fill={`hsl(${hue} 20% 22%)`} />
      )}
      <text x="50" y="94" textAnchor="middle" fontFamily="Cinzel, serif" fontSize="12" fill="#ead08f">
        {name.slice(0, 1)}
      </text>
    </svg>
  );
}

const GOD_SYMBOL: Record<string, JSX.Element> = {
  lightning: <path d="M56 14L34 54h16l-8 32 26-44H52z" />,
  owl: <path d="M50 26c12 0 20 10 20 22 0 16-10 26-20 26S30 64 30 48c0-12 8-22 20-22zm-8 18a5 5 0 100 10 5 5 0 000-10zm16 0a5 5 0 100 10 5 5 0 000-10zM30 30l8 6M70 30l-8 6" />,
  spear: <path d="M48 12h4l-1 70h-2zM50 4l6 12H44zM34 60a16 16 0 1032 0z" />,
  trident: <path d="M48 30h4v54h-4zM36 14h4v20c0 4 4 6 10 6s10-2 10-6V14h4v20c0 8-6 12-14 12s-14-4-14-12zM48 10h4v20h-4z" />,
  skull: <path d="M50 22c14 0 22 10 22 22 0 8-4 12-8 14v10H36V58c-4-2-8-6-8-14 0-12 8-22 22-22zm-9 20a5 5 0 100 10 5 5 0 000-10zm18 0a5 5 0 100 10 5 5 0 000-10z" />,
  sun: <path d="M50 34a16 16 0 110 32 16 16 0 010-32zM48 12h4v14h-4zM48 74h4v14h-4zM12 48h14v4H12zM74 48h14v4H74z" />,
  moon: <path d="M58 20a30 30 0 100 60 24 24 0 010-60z" />,
  crown: <path d="M24 64l6-30 12 14 8-18 8 18 12-14 6 30z" />,
  wing: <path d="M20 70c10-30 30-44 60-46-10 8-14 14-16 20 8 0 12 2 16 4-8 4-14 6-20 6 4 4 6 8 6 14-12-2-28-4-46 2z" />,
  wheat: <path d="M49 20h2v64h-2zM50 26c-8 2-10 8-8 12 6-2 8-6 8-12zm0 0c8 2 10 8 8 12-6-2-8-6-8-12zm0 16c-8 2-10 8-8 12 6-2 8-6 8-12zm0 0c8 2 10 8 8 12-6-2-8-6-8-12z" />,
  star: <path d="M50 16l8 20 22 2-17 14 6 22-19-12-19 12 6-22-17-14 22-2z" />,
};

const GOD_SYMBOL_BY_ID: Record<string, keyof typeof GOD_SYMBOL> = {
  zeus: 'lightning',
  athena: 'owl',
  ares: 'spear',
  poseidon: 'trident',
  hades: 'skull',
  apollo: 'sun',
  artemis: 'moon',
  hera: 'crown',
  hermes: 'wing',
  demeter: 'wheat',
};

export function GodPortraitArt({ godId, name, accent, locked }: { godId: string; name: string; accent: string; locked?: boolean }) {
  const key = GOD_SYMBOL_BY_ID[godId] ?? (godId.includes('thor') || godId.includes('raijin') ? 'lightning' : 'star');
  const id = `gp-${godId.replace(/[^a-z0-9]/gi, '')}`;
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label={`${name} (placeholder emblem)`}>
      <defs>
        <radialGradient id={`${id}-bg`} cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor={locked ? '#394150' : accent} />
          <stop offset="100%" stopColor="#05090f" />
        </radialGradient>
        <linearGradient id={`${id}-g`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff3cf" />
          <stop offset="1" stopColor="#c29a52" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${id}-bg)`} />
      <circle cx="50" cy="50" r="40" fill="none" stroke="#ead08f" strokeOpacity="0.45" strokeWidth="1.5" />
      <circle cx="50" cy="50" r="34" fill="none" stroke="#ead08f" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="2 3" />
      <g fill={locked ? '#8d8a82' : `url(#${id}-g)`}>{GOD_SYMBOL[key]}</g>
    </svg>
  );
}

export function EmblemArt({ pantheonId, accent }: { pantheonId: string; accent: string }) {
  const glyph: Record<string, JSX.Element> = {
    greek: <path d="M50 14v60M38 20c0 14 6 22 12 22s12-8 12-22M30 26c0 20 10 30 20 30s20-10 20-30M40 74h20l-4 10H44z" />,
    norse: <path d="M50 14l24 36-24 36-24-36zM50 14v72M26 50h48" />,
    egyptian: <path d="M20 50c10-14 20-20 30-20s20 6 30 20c-10 14-20 20-30 20S30 64 20 50zm30-10a10 10 0 100 20 10 10 0 000-20zM50 70v16" />,
    japanese: <path d="M18 30h64M24 40h52M32 30v54M68 30v54M22 22c18 6 38 6 56 0" />,
    celtic: <path d="M50 18c12 0 18 10 12 20s-24 10-24 0 6-20 12-20zm-18 30c-10 6-10 20 2 24s20-8 14-18M68 48c10 6 10 20-2 24s-20-8-14-18" />,
    mesoamerican: <path d="M30 80V60h8V44h8V30h8v14h8v16h8v20zM44 22h12v8H44z" />,
  };
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label={`${pantheonId} emblem`}>
      <circle cx="50" cy="50" r="46" fill="#05090f" stroke="#c29a52" strokeWidth="2" />
      <circle cx="50" cy="50" r="40" fill={accent} opacity="0.35" />
      <g fill="none" stroke="#ead08f" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        {glyph[pantheonId] ?? glyph.greek}
      </g>
    </svg>
  );
}

/** Stylized map thumbnail for missions (placeholder for rendered mission art). */
export function MissionThumbArt({ seed, biome, beacons }: { seed: string; biome: string; beacons: number }) {
  const hue = biome === 'coast' ? 200 : biome === 'high_pass' ? 215 : biome === 'storm_plateau' ? 250 : biome === 'tundra' || biome === 'fjord' ? 195 : biome === 'desert' ? 42 : biome === 'jungle' ? 135 : biome === 'autumn' ? 22 : biome === 'moor' ? 285 : 120;
  const h = hashHue(seed);
  return (
    <svg viewBox="0 0 160 90" role="img" aria-label="Mission map thumbnail (placeholder)" preserveAspectRatio="xMidYMid slice">
      <rect width="160" height="90" fill={`hsl(${hue} 45% 18%)`} />
      <path d={`M0 ${50 + (h % 10)} C40 ${30 + (h % 15)} 80 ${70 - (h % 12)} 160 ${40 + (h % 20)} V90 H0z`} fill={`hsl(${hue - 90} 30% 30%)`} />
      <path d="M0 70 C50 60 90 80 160 64 V90 H0z" fill={`hsl(${hue - 80} 25% 24%)`} />
      {biome !== 'coast' && biome !== 'fjord' ? <path d="M70 0 L80 90 L90 0z" fill="#3b3f47" opacity="0.8" /> : <path d="M78 0 L82 90 L88 0z" fill={`hsl(${hue} 60% 40%)`} opacity="0.9" />}
      <path d="M20 60 Q60 50 80 55 T140 40" stroke="#d8b56c" strokeWidth="2" fill="none" strokeDasharray="4 3" />
      {Array.from({ length: beacons }, (_, i) => (
        <g key={i} transform={`translate(${130 - i * 12} ${30 + i * 4})`}>
          <path d="M-3 12h6l-1-10h-4z" fill="#ddd8cc" />
          <circle cx="0" cy="0" r="3" fill="#ffcf6b" />
        </g>
      ))}
    </svg>
  );
}
