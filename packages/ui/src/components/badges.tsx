/**
 * Set and ability badges (owner request 2026-10-02). Each badge shows the final
 * icon once it is delivered under its asset ID (`icon.set.<setId>`,
 * `icon.ability.<abilityId>` — see ICON_CATALOG.md and `npm run icons:import`);
 * until then a clearly temporary stand-in: a gem in a colour derived from the
 * set, or the interface glyph closest to the ability's rule.
 */
import type { ContentCatalog } from '@pr/rules';
import { Icon, type IconName } from '../assets/icons';
import { resolveAsset } from '../assets/manifest';

function hue(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % 360;
}

/** Glyph per ability rule (stand-in until the ability's own icon exists). Exported for the icon catalog. */
export const ABILITY_GLYPH: Readonly<Record<string, IconName>> = {
  shooter: 'bow',
  flight: 'speed',
  retaliations: 'swap',
  charge: 'continue',
  charge_guard: 'defense',
  family_ward: 'defend',
  unyielding: 'morale',
  wall_breaker: 'damage',
  no_melee_penalty: 'sword2',
  shapeshift: 'upgrade',
};

export function SetBadge({ catalog, setId, active = false, size = '1.1rem', className = '' }: { catalog: ContentCatalog; setId: string; active?: boolean; size?: string; className?: string }) {
  const set = catalog.artifactSets?.[setId];
  const rec = resolveAsset(`icon.set.${setId}`);
  const h = hue(setId);
  return (
    <span
      className={`set-badge ${active ? 'is-active' : ''} ${rec.url ? 'is-final' : 'is-standin'} ${className}`}
      style={{ width: size, height: size }}
      title={set ? `${set.name}${active ? ' — bonus active' : ''}: ${set.summary}` : setId}
      data-testid={`set-badge-${setId}`}
      role="img"
      aria-label={set ? `Set: ${set.name}${active ? ' (bonus active)' : ''}` : 'Set'}
    >
      {rec.url ? (
        <img src={rec.url} alt="" draggable={false} />
      ) : (
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="M10 1.5 18 8l-8 10.5L2 8z" fill={`hsl(${h} 55% ${active ? 52 : 34}%)`} stroke={active ? '#f5e4b7' : '#c29a52'} strokeWidth="1.3" />
          <path d="M2 8h16M10 1.5 7 8l3 10.5L13 8z" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.8" />
        </svg>
      )}
    </span>
  );
}

export function AbilityBadge({ catalog, abilityId, size = '1rem', className = '' }: { catalog: ContentCatalog; abilityId: string; size?: string; className?: string }) {
  const ab = catalog.abilities[abilityId];
  const rec = resolveAsset(`icon.ability.${abilityId}`);
  const glyph = ABILITY_GLYPH[ab?.rule.type ?? ''] ?? 'ability';
  return (
    <span
      className={`ability-badge ${rec.url ? 'is-final' : 'is-standin'} ${className}`}
      style={{ width: size, height: size }}
      title={ab ? `${ab.name}: ${ab.summary}` : abilityId}
      data-testid={`ability-badge-${abilityId}`}
      role="img"
      aria-label={ab ? `Ability: ${ab.name}` : 'Ability'}
    >
      {rec.url ? <img src={rec.url} alt="" draggable={false} /> : <Icon name={glyph} />}
    </span>
  );
}

/** Up to `max` ability badges for a creature (its own abilities, in content order). */
export function AbilityBadges({ catalog, creatureId, max = 3, size }: { catalog: ContentCatalog; creatureId: string; max?: number; size?: string }) {
  const ids = catalog.creatures[creatureId]?.abilityIds ?? [];
  if (ids.length === 0) return null;
  return (
    <span className="ability-badges">
      {ids.slice(0, max).map((a) => (
        <AbilityBadge key={a} catalog={catalog} abilityId={a} size={size} />
      ))}
    </span>
  );
}
