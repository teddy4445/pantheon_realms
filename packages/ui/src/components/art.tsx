/**
 * Art components resolve stable asset IDs through the manifest. When no file
 * exists they render the coherent procedural placeholder for that asset family.
 */
import type { CSSProperties, ReactNode } from 'react';
import type { ContentCatalog } from '@pr/rules';
import { resolveAsset, resolveBuildingArt, type StoryArtRecord } from '../assets/manifest';
import { speakerBust, type SpeakerSide } from '../assets/storyArt';

export { briefingArt, campaignEndingArtId, speakerBust, speakerSides, type SpeakerSide } from '../assets/storyArt';
import { CreaturePortraitArt, EmblemArt, GodPortraitArt, HeroPortraitArt, MissionThumbArt } from '../assets/placeholders';
import { Icon, type IconName } from '../assets/icons';

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
  const portraitId = def?.portraitAssetId ?? `hero.${definitionId}.portrait`;
  const rec = resolveAsset(portraitId);
  // No portrait of its own: the hero's painted story bust (Brief 1), framed on the head and shoulders.
  const bust = rec.url ? null : speakerBust({ portraitAssetId: portraitId });
  // Placeholder look follows the class's starting skill (pantheon classes mirror the three base classes).
  const classDef = catalog.heroClasses[classId ?? def?.classId ?? 'champion'];
  const skillIds = classDef?.startingSkills.map((s) => s.skillId) ?? [];
  const cls: 'champion' | 'strategos' | 'oracle' = skillIds.includes('offense') ? 'champion' : skillIds.includes('leadership') ? 'strategos' : classDef?.startsWithSpellbook ? 'oracle' : 'champion';
  return (
    <span className="portrait" style={{ width: size, height: size, ...style }} title={name ?? def?.name}>
      {rec.url ? (
        <img src={rec.url} alt={`${name ?? def?.name} portrait`} />
      ) : bust ? (
        <img className="portrait__bust" src={bust.url} alt={`${name ?? def?.name} portrait`} draggable={false} data-asset={bust.id} />
      ) : (
        <HeroPortraitArt seed={definitionId} name={name ?? def?.name ?? '?'} accent={pantheonAccent(catalog, def?.pantheonId ?? 'greek')} variant={cls} />
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Story art (ASSET_PIPELINE.md §13): dialogue busts, covers, endings, briefing art
// ---------------------------------------------------------------------------

/**
 * A dialogue bust standing beside (behind) the dialogue box: contain fit,
 * transparency kept, its visible lower edge at the box's lower edge; mirrored
 * only on the right side. No frame.
 */
export function StoryBust({ art, side, name }: { art: StoryArtRecord; side: SpeakerSide; name: string }) {
  const gap = art.alphaBox ? Math.max(0, 1 - art.alphaBox[3]) : 0;
  const flip = side === 'right' ? ' scaleX(-1)' : '';
  return (
    <img
      className={`story-bust story-bust--${side}`}
      src={art.url}
      alt={`${name}`}
      draggable={false}
      data-testid="story-bust"
      data-side={side}
      style={{ aspectRatio: `${art.width} / ${art.height}`, transform: `translateY(${(gap * 100).toFixed(2)}%)${flip}` }}
    />
  );
}

/** A bust in a small 2:3 slot for dialogue lists (contain fit), else the square portrait. */
export function SpeakerPortrait({ catalog, line, size = '3.4rem' }: { catalog: ContentCatalog; line: { readonly speaker: string; readonly portraitAssetId: string }; size?: string }) {
  const bust = speakerBust(line);
  if (bust) {
    return (
      <span className="bust-slot" style={{ width: size, height: `calc(${size} * 1.5)` }} title={line.speaker}>
        <img src={bust.url} alt={`${line.speaker} portrait`} draggable={false} />
      </span>
    );
  }
  const heroDef = Object.values(catalog.heroes).find((h) => h.name === line.speaker);
  return heroDef ? <HeroPortrait catalog={catalog} definitionId={heroDef.id} size={size} /> : <StoryPortrait name={line.speaker} size={size} />;
}

/** Full-screen story picture (cover, ending, briefing art) behind a scene, with a scrim. */
export function SceneArt({ art, fallback, scrim = 'bottom' }: { art: StoryArtRecord | null; fallback?: ReactNode; scrim?: 'bottom' | 'full' }) {
  return (
    <div className="scene-art" aria-hidden="true">
      {art ? <img src={art.url} alt="" draggable={false} data-testid="scene-art" /> : fallback ?? null}
      <div className={`scene-art__scrim scene-art__scrim--${scrim}`} />
    </div>
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
      {rec.url ? <img src={rec.url} alt={`${pantheonId} emblem`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} draggable={false} /> : <EmblemArt pantheonId={pantheonId} accent={pantheonAccent(catalog, pantheonId)} />}
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

/** A mission's 640 × 360 card (`thumbnailAssetId`); `assetId` serves generated missions not in the catalog. */
export function MissionThumb({ catalog, missionId, assetId, style }: { catalog: ContentCatalog; missionId: string; assetId?: string; style?: CSSProperties }) {
  const m = catalog.missions[missionId];
  const rec = resolveAsset(assetId ?? m?.thumbnailAssetId ?? '');
  const template = m ? catalog.mapTemplates[m.mapTemplateId] : undefined;
  return (
    <span className="portrait" style={{ display: 'block', ...style }}>
      {rec.url ? <img src={rec.url} alt={`${m?.name} thumbnail`} /> : <MissionThumbArt seed={missionId} biome={template?.biome ?? 'coast'} beacons={m?.order ?? 1} />}
    </span>
  );
}

/** A campaign's 640 × 360 card (made from its cover), else a procedural stand-in. */
export function CampaignThumb({ catalog, campaignId, style }: { catalog: ContentCatalog; campaignId: string; style?: CSSProperties }) {
  const c = catalog.campaigns[campaignId];
  const rec = resolveAsset(c?.thumbnailAssetId ?? `campaign.${campaignId}.thumbnail`);
  const first = c ? catalog.missions[c.missionIds[0] ?? ''] : undefined;
  const template = first ? catalog.mapTemplates[first.mapTemplateId] : undefined;
  return (
    <span className="portrait" style={{ display: 'block', ...style }}>
      {rec.url ? <img src={rec.url} alt={`${c?.name} cover`} /> : <MissionThumbArt seed={campaignId} biome={template?.biome ?? 'coast'} beacons={1} />}
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
    case 'portal':
      return 'icon.marker.portal';
    // Sites added 2026-10-02: their own marker once delivered (ICON_CATALOG.md), else the nearest existing one.
    case 'learning_stone':
      return ownMarker('icon.marker.learning-stone', 'icon.marker.story');
    case 'spell_shrine':
      return ownMarker('icon.marker.spell-shrine', 'icon.marker.shrine');
    case 'skill_trainer':
      return ownMarker('icon.marker.skill-trainer', 'icon.marker.quest');
    case 'quest_hut':
      return opts.done ? 'icon.marker.check' : ownMarker('icon.marker.quest-hut', 'icon.marker.quest');
    case 'key_tent':
      return ownMarker('icon.marker.key-tent', 'icon.marker.locked');
    case 'key_gate':
      return opts.done ? 'icon.marker.check' : ownMarker('icon.marker.key-gate', 'icon.marker.locked');
    case 'windmill':
      return ownMarker('icon.marker.windmill', 'icon.marker.mine');
    case 'treasure_chest':
      return opts.done ? 'icon.marker.check' : 'icon.marker.chest';
    case 'prison':
      return opts.done ? 'icon.marker.check' : ownMarker('icon.marker.prison', 'icon.marker.hero');
    default:
      return 'icon.marker.unknown';
  }
}

/** A marker's own art when delivered, else the stand-in marker. */
function ownMarker(assetId: string, fallback: string): string {
  return resolveAsset(assetId).url ? assetId : fallback;
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
export const SPELL_EFFECT_ART: Record<string, string> = {
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
  melee_mitigation: 'icon.fx.shield',
  min_damage_roll: 'icon.status.debuff',
  mass_heal: 'icon.fx.healing',
  mass_damage: 'icon.fx.burning',
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

/** Fallback glyph per artifact kind until the item's own icon is delivered (ICON_CATALOG.md). */
export const ARTIFACT_KIND_GLYPH: Record<string, IconName> = {
  head: 'power',
  neck: 'luck',
  cape: 'movement',
  weapon: 'attack',
  shield: 'defense',
  armor: 'defense',
  ring: 'knowledge',
  feet: 'movement',
  mount: 'speed',
  misc: 'star',
};

/**
 * A hero's specialty (proposed 2026-10-02): its kind's picture — the family's
 * portrait, the spell's icon or the resource — the name and the exact rule. Shown
 * in the Tavern before hiring, on the hero screen and in the Encyclopedia;
 * `active: false` notes that the scenario does not use specialties.
 */
export function SpecialtyLine({ catalog, definitionId, active = true, size = '2.4rem' }: { catalog: ContentCatalog; definitionId: string; active?: boolean; size?: string }) {
  const sp = catalog.heroes[definitionId]?.specialty;
  if (!sp) return null;
  const fam = sp.familyId ? catalog.families[sp.familyId] : undefined;
  const spell = sp.spellId ? catalog.spells[sp.spellId] : undefined;
  const income = sp.effects.find((e) => e.type === 'daily_income');
  const icon =
    sp.kind === 'creature' && fam ? (
      <CreaturePortrait catalog={catalog} creatureId={fam.baseCreatureId} size={size} />
    ) : sp.kind === 'spell' && spell ? (
      <SpellIcon iconAssetId={spell.iconAssetId} effectType={spell.effect.type} size={size} />
    ) : income && income.type === 'daily_income' ? (
      <span className="specialty__res" style={{ width: size, height: size }}>
        <Icon name={income.resource} />
      </span>
    ) : null;
  return (
    <div className={`specialty ${active ? '' : 'is-inactive'}`} data-testid={`specialty-${definitionId}`}>
      {icon}
      <div>
        <div className="specialty__name">
          <span className="specialty__tag">Specialty</span> {sp.name}
        </div>
        <div className="small">
          {sp.summary}
          {active ? '' : ' Not used in this scenario.'}
        </div>
      </div>
    </div>
  );
}

/** A hero skill's own icon when delivered (icon.skill.<id>), else the generic star glyph in the same socket. */
export function SkillIcon({ iconAssetId, size = '2.2rem' }: { iconAssetId: string; size?: string }) {
  const own = resolveAsset(iconAssetId);
  return (
    <span className="skill-socket" style={{ width: size, height: size }} aria-hidden="true">
      {own.url ? <img src={own.url} alt="" draggable={false} /> : <Icon name="star" className="skill-socket__glyph" />}
    </span>
  );
}

/** An artifact's own icon when delivered, else its kind's glyph in the same socket. */
export function ArtifactIcon({ iconAssetId, kind, size = '2.6rem', rarity }: { iconAssetId: string; kind: string; size?: string; rarity?: string }) {
  const own = resolveAsset(iconAssetId);
  return (
    <span className={`artifact-socket ${rarity ? `is-${rarity}` : ''}`} style={{ width: size, height: size }} aria-hidden="true">
      {own.url ? <img src={own.url} alt="" draggable={false} /> : <Icon name={ARTIFACT_KIND_GLYPH[kind] ?? 'star'} className="artifact-socket__glyph" />}
    </span>
  );
}
