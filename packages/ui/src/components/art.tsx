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
