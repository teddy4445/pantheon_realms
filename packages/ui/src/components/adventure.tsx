/**
 * The six adventure screens of 1.1.0 (handoff `docs/adventure-gui-v1.1.0`):
 * one stage shared by the Heroes' Lodge, recruitment, the Marketplace, the
 * level-up, the spellbook and the encounter preview. Layers, back to front: the
 * painted scene (a decorative stage, never a construction layout or a battle
 * board), a readability shade, the real heroes and creatures, the faction's
 * nine-slice frame (never under the pointer), and the live interface. Every
 * label, value, cost, count and control is HTML; the screens keep their own
 * quotes, commands and states.
 */
import { useId, useRef, type CSSProperties, type ReactNode } from 'react';
import { activeBuildingInSlot, terrainAt, type ContentCatalog, type HexCoord, type MatchState, type TownState } from '@pr/rules';
import { adventureKitArt, creatureIdleStrip, encounterKitArt, resolveAsset, townBackground } from '../assets/manifest';
import { guiThemeFor, type GuiTheme } from '../assets/guiArt';
import { Button, useModalFocus } from './kit';
import { BuildingArt, Emblem, HeroPortrait, SkillIcon, speakerBust } from './art';

/** The scene of a screen for a pantheon (`adventurekit.tavern.*`, `adventurekit.recruit.*`), or null. */
export function adventureScene(kind: 'tavern' | 'recruit', pantheonId: string | null | undefined): string | null {
  return adventureKitArt(`adventurekit.${kind}.${guiThemeFor(pantheonId)}`)?.url ?? null;
}

/** The dimmed camp behind the level-up and the spellbook (the hero's pantheon; atmosphere, not a journey). */
export function campScene(pantheonId: string | null | undefined): string | null {
  return encounterKitArt(`encounterkit.meeting.${guiThemeFor(pantheonId)}`)?.url ?? null;
}

export type EncounterBiome = 'temperate' | 'alpine' | 'desert' | 'woodland' | 'jungle' | 'volcanic';

/**
 * The encounter landscape for a destination (terrain-map.json): chosen from the
 * map's climate (biome) and the ground at the destination — never from either
 * side's pantheon. Snow and high passes are alpine; deserts desert; jungles
 * jungle; forest ground in the temperate climates woodland; open temperate
 * ground temperate. No climate of the game is volcanic, so that landscape is
 * kept for a future one. Sieges show the town itself (see the dialog).
 */
export function encounterBiome(state: MatchState, dest: HexCoord | null): EncounterBiome {
  const biome = state.world.map.biome;
  const ground = dest ? terrainAt(state.world.map, dest) : undefined;
  if (biome === 'tundra' || biome === 'high_pass' || biome === 'fjord') return 'alpine';
  if (biome === 'desert') return 'desert';
  if (biome === 'jungle') return 'jungle';
  if (ground === 'mountain') return 'alpine';
  if (ground === 'forest' || biome === 'autumn') return 'woodland';
  return 'temperate';
}

export function encounterScene(state: MatchState, dest: HexCoord | null): string | null {
  return adventureKitArt(`adventurekit.encounter.${encounterBiome(state, dest)}`)?.url ?? adventureKitArt('adventurekit.encounter.temperate')?.url ?? null;
}

/** A town's own painting at its current stage (sieges, garrisons): the real town, not a new place. */
export function townScene(catalog: ContentCatalog, town: TownState): string | null {
  const arch = catalog.townArchetypes[town.archetypeId];
  return arch ? townBackground(arch.backgroundAssetId, town.buildings['civic_hall']).url : null;
}

/**
 * A small picture of a town as it stands (1.1.4, GUI audit D09): its town-hall stage with every
 * constructed building on its slot, placed as on the town screen. Decorative and non-interactive.
 */
export function TownThumbnail({ catalog, town, className = '' }: { catalog: ContentCatalog; town: TownState; className?: string }) {
  const arch = catalog.townArchetypes[town.archetypeId];
  if (!arch) return null;
  const bg = townBackground(arch.backgroundAssetId, town.buildings['civic_hall']);
  return (
    <span className={`town-thumb ${className}`} style={bg.url ? { backgroundImage: `url(${bg.url})` } : undefined} aria-hidden="true" data-testid="town-thumb">
      {arch.slots.map((s) => {
        const b = activeBuildingInSlot(catalog, town, s.id);
        if (!b) return null;
        const p = s.placement;
        return (
          <span key={s.id} className="town-thumb__slot" style={{ left: `${p.x - p.width / 2}%`, bottom: `${100 - p.y}%`, width: `${p.width}%`, zIndex: p.layer }}>
            <BuildingArt artAssetId={b.artAssetId} alt="" />
          </span>
        );
      })}
    </span>
  );
}

/**
 * The stage. `mode="modal"` is a dialog over the map or the town (focus kept
 * inside, Escape closes, focus returns); `mode="screen"` fills a screen of its
 * own (recruitment, level-up). The frame is the theme's (`gui.frame.<theme>`).
 */
export function AdventureStage({
  theme,
  scene,
  title,
  subtitle,
  pantheonId,
  catalog,
  testId,
  onClose,
  footer,
  children,
  className = '',
  mode = 'modal',
  shade = 'default',
  sceneStyle,
  compact = false,
  aside,
}: {
  theme: GuiTheme;
  /** The painted scene behind (relative URL), or null for the plain dark stage. */
  scene: string | null;
  title: ReactNode;
  subtitle?: ReactNode;
  /** The emblem beside the title (a pantheon ID), when one belongs there. */
  pantheonId?: string | null;
  catalog: ContentCatalog;
  testId?: string;
  onClose?: () => void;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  mode?: 'modal' | 'screen';
  /** 'default': dark at the top and the bottom; 'dim': the whole scene darkened (camp behind the book); 'top': a picture above dark panels (market). */
  shade?: 'default' | 'dim' | 'top';
  sceneStyle?: CSSProperties;
  /** A thinner frame and a one-line title strip (recruitment 2026-10-14: the space goes to the content). */
  compact?: boolean;
  /** Live content at the right of the title strip (the treasury). */
  aside?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const trap = useModalFocus(ref);
  const titleId = useId();
  const stage = (
    <div ref={ref} className={`ak-stage gui-window ak-stage--${shade} ${compact ? 'ak-stage--compact' : ''} ${className}`}>
      <span className="ak-stage__backdrop" aria-hidden="true">
        {scene ? <img className="ak-stage__scene" src={scene} alt="" draggable={false} decoding="async" style={sceneStyle} /> : null}
        <span className="ak-stage__shade" />
      </span>
      <header className="ak-head">
        {pantheonId ? (
          <span className="ak-head__emblem" aria-hidden="true">
            <Emblem catalog={catalog} pantheonId={pantheonId} size="100%" />
          </span>
        ) : null}
        <div className="ak-head__text">
          <h2 className="ak-head__title" id={titleId}>
            {title}
          </h2>
          {subtitle ? <p className="ak-head__sub">{subtitle}</p> : null}
        </div>
        {aside ? <div className="ak-head__aside">{aside}</div> : null}
      </header>
      {onClose ? <Button icon="close" variant="ghost" size="small" onClick={onClose} aria-label="Close" className="ak-close" /> : null}
      <div className="ak-body">{children}</div>
      {footer ? <footer className="ak-foot">{footer}</footer> : null}
    </div>
  );
  if (mode === 'screen') {
    return (
      <div className="screen ak-screen" data-gui-theme={theme} data-testid={testId} aria-labelledby={titleId} role="region">
        {stage}
      </div>
    );
  }
  return (
    <div
      className="modal-layer ak-layer"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-testid={testId}
      data-gui-theme={theme}
      onKeyDown={(e) => {
        // Escape closes the window (and only the window: the screen behind stays where it is).
        if (e.key === 'Escape' && onClose) {
          e.preventDefault();
          e.stopPropagation();
          onClose();
          return;
        }
        trap(e);
      }}
    >
      {stage}
    </div>
  );
}

/**
 * A hero standing in a scene: the hero's own painted bust (portrait → bust),
 * else the same hero's portrait — never another hero's picture. Busts face
 * right; `mirror` turns one to face the other way (no raster edit).
 */
export function HeroFigure({ catalog, definitionId, portraitAssetId, name, mirror, className = '' }: { catalog: ContentCatalog; definitionId: string; portraitAssetId?: string; name: string; mirror?: boolean; className?: string }) {
  const portraitId = portraitAssetId ?? catalog.heroes[definitionId]?.portraitAssetId ?? `hero.${definitionId}.portrait`;
  const bust = speakerBust({ portraitAssetId: portraitId });
  if (bust) {
    const gap = bust.alphaBox ? Math.max(0, 1 - bust.alphaBox[3]) : 0;
    return (
      <img
        className={`ak-figure ak-figure--bust ${className}`}
        src={bust.url}
        alt=""
        aria-hidden="true"
        draggable={false}
        loading="lazy"
        decoding="async"
        data-asset={bust.id}
        style={{ aspectRatio: `${bust.width} / ${bust.height}`, transform: `translateY(${(gap * 100).toFixed(2)}%)${mirror ? ' scaleX(-1)' : ''}` }}
      />
    );
  }
  return (
    <span className={`ak-figure ak-figure--portrait ${className}`} data-asset={portraitId}>
      <HeroPortrait catalog={catalog} definitionId={definitionId} portraitAssetId={portraitAssetId} name={name} size="100%" />
    </span>
  );
}

/** The hero medallion (`adventurekit.chrome.hero-medallion`): the real portrait in its round opening, the live name on the plaque. */
export function HeroMedallion({ catalog, definitionId, portraitAssetId, name, size = '12rem' }: { catalog: ContentCatalog; definitionId: string; portraitAssetId?: string; name: string; size?: string }) {
  const frame = adventureKitArt('adventurekit.chrome.hero-medallion');
  const portraitId = portraitAssetId ?? catalog.heroes[definitionId]?.portraitAssetId ?? `hero.${definitionId}.portrait`;
  const url = resolveAsset(portraitId).url;
  return (
    <figure className="ak-medallion" style={{ width: size, height: size }} data-testid="hero-medallion">
      <span className="ak-medallion__portrait">{url ? <img src={url} alt={`${name} portrait`} draggable={false} /> : <HeroPortrait catalog={catalog} definitionId={definitionId} portraitAssetId={portraitAssetId} name={name} size="100%" />}</span>
      {frame ? <img className="ak-medallion__frame" src={frame.url} alt="" aria-hidden="true" draggable={false} /> : null}
      <figcaption className="ak-medallion__name">{name}</figcaption>
    </figure>
  );
}

/**
 * The skill plaque (`adventurekit.chrome.skill-card`): the real skill icon over
 * the empty top medallion, live text in the plaque's content rectangle. A
 * button: the screen decides what a click does.
 */
export function SkillPlaque({
  iconAssetId,
  icon,
  kicker,
  name,
  text,
  extra,
  onClick,
  disabled,
  testId,
  ariaLabel,
  selected,
  role,
}: {
  iconAssetId?: string;
  icon?: ReactNode;
  kicker?: ReactNode;
  name: ReactNode;
  text?: ReactNode;
  extra?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  testId?: string;
  ariaLabel?: string;
  selected?: boolean;
  role?: 'radio';
}) {
  const card = adventureKitArt('adventurekit.chrome.skill-card');
  const [l, t, r, b] = card?.content ?? [0.12, 0.54, 0.88, 0.86];
  return (
    <button
      type="button"
      className={`ak-plaque ${card ? 'has-art' : ''} ${selected ? 'is-selected' : ''}`}
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      aria-label={ariaLabel}
      role={role}
      aria-checked={role === 'radio' ? !!selected : undefined}
      style={card ? ({ aspectRatio: `${card.width} / ${card.height}` } as CSSProperties) : undefined}
    >
      {card ? <img className="ak-plaque__art" src={card.url} alt="" aria-hidden="true" draggable={false} /> : null}
      <span className="ak-plaque__icon" aria-hidden="true">
        {icon ?? (iconAssetId ? <SkillIcon iconAssetId={iconAssetId} size="100%" /> : null)}
      </span>
      <span className="ak-plaque__copy" style={card ? { left: `${l * 100}%`, top: `${t * 100}%`, right: `${(1 - r) * 100}%`, bottom: `${(1 - b) * 100}%` } : undefined}>
        {kicker ? <span className="ak-plaque__kicker">{kicker}</span> : null}
        <span className="ak-plaque__name">{name}</span>
        {text ? <span className="ak-plaque__text">{text}</span> : null}
        {extra}
      </span>
    </button>
  );
}

/** A small decorative picture by asset ID (the balance between the market's panels). */
export function KitOrnament({ id, className = '' }: { id: string; className?: string }) {
  const a = adventureKitArt(id);
  if (!a) return null;
  return <img className={className} src={a.url} alt="" aria-hidden="true" draggable={false} style={{ aspectRatio: `${a.width} / ${a.height}` }} />;
}

/**
 * A creature standing in a scene: its own native idle strip (frame count, size,
 * anchor and rate from the sprite manifest), feet at (50 %, 86 %) of the box,
 * scaled to fit and never cropped; the first frame still under reduced motion.
 * Nothing is enlarged into a new illustration. A creature without an idle strip
 * (the campaign kit's neutrals: frame-region atlases only) stands as its
 * `portrait` instead — the delivered picture fitted inside the stage, never
 * shown larger than its native size, no filter.
 */
export function CreatureStage({
  creatureId,
  name,
  className = '',
  portrait,
}: {
  creatureId: string;
  name: string;
  className?: string;
  /** The creature's large portrait (e.g. `creaturePicture`), shown when it has no idle strip. */
  portrait?: { readonly url: string; readonly alt: string; readonly width?: number | null; readonly height?: number | null; readonly assetId?: string } | null;
}) {
  const strip = creatureIdleStrip(creatureId);
  if (!strip && portrait?.url) {
    return (
      <div className={`recruit-stage ak-creature-stage ak-creature-stage--portrait ${className}`} data-testid="recruit-stage" data-fallback="portrait">
        <img className="ak-creature-stage__portrait" src={portrait.url} alt={portrait.alt || name} width={portrait.width ?? undefined} height={portrait.height ?? undefined} draggable={false} decoding="async" data-asset={portrait.assetId} />
      </div>
    );
  }
  if (!strip) return <div className={`recruit-stage ak-creature-stage ${className}`} role="img" aria-label={name} />;
  const style = {
    ['--fw' as string]: strip.frameWidth,
    ['--fh' as string]: strip.frameHeight,
    ['--frames' as string]: strip.frames,
    ['--ax' as string]: strip.anchor[0],
    ['--ay' as string]: strip.anchor[1],
    ['--dur' as string]: `${(strip.frames / Math.max(1, strip.fps)).toFixed(2)}s`,
    backgroundImage: `url("${strip.url}")`,
  } as CSSProperties;
  return (
    <div className={`recruit-stage ak-creature-stage ${className}`} role="img" aria-label={`${name}, standing ready`} data-testid="recruit-stage">
      <div className="recruit-stage__unit" style={style} />
    </div>
  );
}
