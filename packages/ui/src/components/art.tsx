/**
 * Art components resolve stable asset IDs through the manifest. When no file
 * exists they render the coherent procedural placeholder for that asset family.
 */
import type { CSSProperties } from 'react';
import type { ContentCatalog } from '@pr/rules';
import { resolveAsset, resolveBuildingArt } from '../assets/manifest';
import { CreaturePortraitArt, EmblemArt, GodPortraitArt, HeroPortraitArt, MissionThumbArt } from '../assets/placeholders';

function pantheonAccent(catalog: ContentCatalog, pantheonId: string | null | undefined): string {
  if (!pantheonId) return '#6b5a3a';
  return catalog.pantheons[pantheonId]?.theme.accent ?? '#3b73d9';
}

export function CreaturePortrait({
  catalog,
  creatureId,
  size = '4rem',
  count,
  round,
  style,
  showPlaceholderTag,
}: {
  catalog: ContentCatalog;
  creatureId: string;
  size?: string;
  count?: number | string;
  round?: boolean;
  style?: CSSProperties;
  showPlaceholderTag?: boolean;
}) {
  const def = catalog.creatures[creatureId];
  if (!def) return <span className="portrait" style={{ width: size, height: size }} />;
  const rec = resolveAsset(def.presentation.portraitAssetId);
  return (
    <span className={`portrait ${round ? 'portrait--round' : ''}`} style={{ width: size, height: size, ...style }} title={def.name}>
      {rec.url ? (
        <img src={rec.url} alt={def.presentation.portraitAlt} />
      ) : (
        <CreaturePortraitArt
          seed={def.id}
          body={def.presentation.bodyProfile}
          upgraded={def.form === 'upgraded'}
          tier={def.tier}
          accent={pantheonAccent(catalog, def.pantheonId)}
          label={`${def.name}: ${def.presentation.portraitAlt} (placeholder)`}
        />
      )}
      {count !== undefined ? <span className="portrait__badge">{count}</span> : null}
      {showPlaceholderTag && rec.status !== 'final' ? <span className="placeholder-tag">placeholder</span> : null}
    </span>
  );
}

export function HeroPortrait({
  catalog,
  definitionId,
  name,
  classId,
  size = '4rem',
  style,
}: {
  catalog: ContentCatalog;
  definitionId: string;
  name?: string;
  classId?: string;
  size?: string;
  style?: CSSProperties;
}) {
  const def = catalog.heroes[definitionId];
  const rec = resolveAsset(def?.portraitAssetId ?? `hero.${definitionId}.portrait`);
  // Placeholder look follows the class's starting skill (pantheon classes mirror the three base classes).
  const classDef = catalog.heroClasses[classId ?? def?.classId ?? 'champion'];
  const skillIds = classDef?.startingSkills.map((s) => s.skillId) ?? [];
  const cls: 'champion' | 'strategos' | 'oracle' = skillIds.includes('offense') ? 'champion' : skillIds.includes('leadership') ? 'strategos' : classDef?.startsWithSpellbook ? 'oracle' : 'champion';
  return (
    <span className="portrait" style={{ width: size, height: size, ...style }} title={name ?? def?.name}>
      {rec.url ? (
        <img src={rec.url} alt={`${name ?? def?.name} portrait`} />
      ) : (
        <HeroPortraitArt seed={definitionId} name={name ?? def?.name ?? '?'} accent={pantheonAccent(catalog, def?.pantheonId ?? 'greek')} variant={cls} />
      )}
    </span>
  );
}

/** Story characters without hero definitions (Thaleia, Ione). */
export function StoryPortrait({ name, size = '4rem' }: { name: string; size?: string }) {
  const rec = resolveAsset(`hero.greek.${name.toLowerCase()}.portrait`);
  return (
    <span className="portrait" style={{ width: size, height: size }} title={name}>
      {rec.url ? <img src={rec.url} alt={`${name} portrait`} /> : <HeroPortraitArt seed={name} name={name} accent="#5a4a8a" variant="story" />}
    </span>
  );
}

export function GodPortrait({ catalog, godId, size = '5rem', locked, style }: { catalog: ContentCatalog; godId: string; size?: string; locked?: boolean; style?: CSSProperties }) {
  const god = catalog.gods[godId];
  const rec = resolveAsset(god?.portraitAssetId ?? `god.${godId}.portrait`);
  const bare = godId.includes('_') ? godId.split('_').slice(1).join('_') : godId;
  return (
    <span className="portrait portrait--round" style={{ width: size, height: size, ...style }} title={god?.name}>
      {rec.url ? <img src={rec.url} alt={`${god?.name} portrait`} /> : <GodPortraitArt godId={bare} name={god?.name ?? godId} accent={pantheonAccent(catalog, god?.pantheonId)} locked={locked} />}
    </span>
  );
}

export function Emblem({ catalog, pantheonId, size = '3rem' }: { catalog: ContentCatalog; pantheonId: string; size?: string }) {
  const rec = resolveAsset(`emblem.${pantheonId}`);
  return (
    <span style={{ display: 'inline-block', width: size, height: size, flex: 'none' }}>
      {rec.url ? <img src={rec.url} alt={`${pantheonId} emblem`} style={{ width: '100%' }} /> : <EmblemArt pantheonId={pantheonId} accent={pantheonAccent(catalog, pantheonId)} />}
    </span>
  );
}

export function BuildingArt({ artAssetId, alt, style, className }: { artAssetId: string; alt: string; style?: CSSProperties; className?: string }) {
  const rec = resolveBuildingArt(artAssetId);
  if (rec.url) return <img src={rec.url} alt={alt} style={style} className={className} draggable={false} />;
  return (
    <svg viewBox="0 0 100 70" style={style} className={className} role="img" aria-label={`${alt} (placeholder)`}>
      <path d="M10 60l40-20 40 20-40 10z" fill="#8d8878" />
      <path d="M22 54V30h56v24" fill="#ddd8cc" stroke="#9c7534" />
      <path d="M18 30l32-16 32 16z" fill="#c29a52" />
    </svg>
  );
}

export function MissionThumb({ catalog, missionId, style }: { catalog: ContentCatalog; missionId: string; style?: CSSProperties }) {
  const m = catalog.missions[missionId];
  const rec = resolveAsset(m?.thumbnailAssetId ?? '');
  const template = m ? catalog.mapTemplates[m.mapTemplateId] : undefined;
  return (
    <span className="portrait" style={{ display: 'block', ...style }}>
      {rec.url ? <img src={rec.url} alt={`${m?.name} thumbnail`} /> : <MissionThumbArt seed={missionId} biome={template?.biome ?? 'coast'} beacons={m?.order ?? 1} />}
    </span>
  );
}

/**
 * Adventure-map marker art for a site (UI side panels, journal). Chosen by the
 * site's kind and ownership — presentation only, from the shared marker set.
 */
export function siteMarkerAsset(
  kind: { type: string; siteType?: string; reward?: { resources?: Partial<Record<string, number>>; artifactIds?: readonly string[] }; label?: string },
  opts: { owner?: 'self' | 'other' | null; done?: boolean } = {},
): string {
  switch (kind.type) {
    case 'town':
      return opts.owner === 'self' ? 'icon.marker.town' : opts.owner === 'other' ? 'icon.marker.hostile-town' : 'icon.marker.neutral-town';
    case 'resource_site':
      return kind.siteType === 'sawmill' ? 'icon.marker.sawmill' : kind.siteType === 'quarry' ? 'icon.marker.quarry' : kind.siteType === 'crystal_deposit' ? 'icon.marker.crystal' : 'icon.marker.mine';
    case 'pickup': {
      if (opts.done) return 'icon.marker.check';
      if (kind.reward?.artifactIds?.length) return 'icon.marker.artifact';
      const res = Object.entries(kind.reward?.resources ?? {}).filter(([, v]) => (v ?? 0) > 0);
      if (res.length === 1) {
        const k = res[0]![0];
        if (k === 'gold' || k === 'wood' || k === 'stone' || k === 'crystal') return `icon.marker.${k}`;
      }
      return 'icon.marker.chest';
    }
    case 'watchtower':
      return 'icon.marker.watchtower';
    case 'crossing':
    case 'gate':
      return opts.done ? 'icon.marker.check' : 'icon.marker.locked';
    case 'landmark':
      return opts.done ? 'icon.marker.check' : 'icon.marker.quest';
    case 'activation':
      return opts.done ? 'icon.marker.check' : 'icon.marker.story';
    case 'creature_camp':
      return 'icon.marker.creature';
    case 'map_event':
      return opts.done ? 'icon.marker.check' : 'icon.marker.question';
    case 'relic':
      return 'icon.marker.shrine';
    default:
      return 'icon.marker.unknown';
  }
}

export function MarkerIcon({ assetId, label, size = '2rem' }: { assetId: string; label?: string; size?: string }) {
  const rec = resolveAsset(assetId);
  if (!rec.url) return null;
  return <img className="marker-icon" src={rec.url} alt={label ?? ''} aria-hidden={label ? undefined : true} style={{ width: size, height: size }} draggable={false} />;
}

/** The Pantheon Realms emblem (small branding in dialogs); nothing when the file is missing. */
export function BrandEmblem({ size }: { size?: string }) {
  const rec = resolveAsset('brand.emblem');
  if (!rec.url) return null;
  return <img className="brand-emblem" src={rec.url} alt="" aria-hidden="true" draggable={false} style={size ? { width: size, height: size } : undefined} />;
}

/** Spell art in a round socket: the spell's own icon when delivered, else the effect-family icon. */
const SPELL_EFFECT_ART: Record<string, string> = {
  direct_damage: 'icon.fx.lightning',
  area_damage: 'icon.fx.burning',
  max_damage_roll: 'icon.fx.strike',
  attack_bonus: 'icon.status.buff',
  defense_bonus: 'icon.fx.shield',
  ranged_mitigation: 'icon.fx.shield',
  heal_front: 'icon.fx.healing',
  speed_bonus: 'icon.stat.speed',
  mass_bonus: 'icon.status.buff',
  reveal_radius: 'icon.stat.vision',
  movement_bonus: 'icon.stat.movement',
  recall: 'icon.time.turn',
};

export function SpellIcon({ iconAssetId, effectType, size = '2.4rem' }: { iconAssetId: string; effectType: string; size?: string }) {
  const own = resolveAsset(iconAssetId);
  const rec = own.url ? own : resolveAsset(SPELL_EFFECT_ART[effectType] ?? 'icon.action.spell');
  return (
    <span className="spell-socket" style={{ width: size, height: size }} aria-hidden="true">
      {rec.url ? <img src={rec.url} alt="" draggable={false} /> : null}
    </span>
  );
}
