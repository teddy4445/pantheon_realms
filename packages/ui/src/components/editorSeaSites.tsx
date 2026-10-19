/**
 * The map editor's coastal sites and sea salvage (sea-sites kit 2026-10-18): the "Coastal sites and the
 * sea" palette section (the lookout, the three kinds of floating salvage, the wreck, and any other water
 * site kind of the palette, such as sea monsters) and the site panel's fields of the three kit kinds.
 * Pure views over the document; the placement rules and their reasons live in `app/editorSeaSites.ts`.
 */
import { CUSTOM_SITE_KINDS, coastalTowerSkin, terrainAt, type CustomMapDocument, type CustomSite, type CustomSiteKind } from '@pr/session';
import { SEA_PICKUP_NAMES, SEA_PICKUP_RESOURCES, seaSitePolicy, type ContentCatalog, type SeaPickupResource } from '@pr/rules';
import { seaCreatureArt, seaSiteArt } from '../assets/manifest';
import { seaPalette, seaSiteDefaults } from '../app/editorSeaSites';

/** The palette section. `selected`: the place tool now chosen (null: another tool). */
export function SeaPaletteSection({
  catalog,
  selected,
  onPick,
}: {
  catalog: ContentCatalog;
  selected: { readonly site: CustomSiteKind; readonly resource?: SeaPickupResource } | null;
  onPick: (site: CustomSiteKind, resource?: SeaPickupResource) => void;
}) {
  const entries = seaPalette(catalog);
  const mine = new Set<string>(entries.map((e) => e.kind));
  const others = CUSTOM_SITE_KINDS.filter((k) => k.palette === 'sea' && !mine.has(k.id));
  const isOn = (site: CustomSiteKind, resource?: SeaPickupResource) => !!selected && selected.site === site && (site !== 'sea_pickup' || (selected.resource ?? 'gold') === resource);
  return (
    <div className="map-editor__grid editor-v2-landmarks editor-sea-sites" role="group" aria-label="Coastal sites and the sea" data-testid="palette-sea">
      {entries.map((e) => {
        const pic = seaSiteArt(e.assetId)?.url ?? null;
        const on = isOn(e.kind, e.resource);
        return (
          <button key={e.testId} type="button" className={`editor-tool editor-landmark ${on ? 'is-selected' : ''}`} onClick={() => onPick(e.kind, e.resource)} title={e.title} aria-pressed={on} data-testid={e.testId}>
            {pic ? <img className="editor-landmark__pic" src={pic} alt="" draggable={false} /> : null}
            <span>{e.label}</span>
          </button>
        );
      })}
      {others.map((k) => {
        const on = isOn(k.id);
        // Other water sites (sea monsters): the portrait of the army a new one starts with.
        const guard = seaSiteDefaults(catalog, k.id, undefined).guard;
        const pic = guard ? (seaCreatureArt(`seacreatures.portrait.${guard.creatureId}`)?.url ?? null) : null;
        return (
          <button key={k.id} type="button" className={`editor-tool editor-landmark ${on ? 'is-selected' : ''}`} onClick={() => onPick(k.id)} title={k.summary} aria-pressed={on} data-testid={`tool-place-${k.id}`}>
            {pic ? <img className="editor-landmark__pic" src={pic} alt="" draggable={false} /> : null}
            <span>{k.label}</span>
          </button>
        );
      })}
    </div>
  );
}

const OUTCOME_LABEL: Record<NonNullable<CustomSite['outcome']>, string> = {
  abandoned_cargo: 'Abandoned cargo (no guards)',
  guarded_salvage: 'Guarded salvage (raiders alongside)',
  rare_cache: 'Rare cache (an artifact, stronger raiders)',
};

/** The site panel's fields of a coastal watchtower, floating salvage or a shipwreck (nothing for other kinds). */
export function SeaSiteFields({ catalog, doc, site, update }: { catalog: ContentCatalog; doc: CustomMapDocument; site: CustomSite; update: (id: string, patch: Partial<CustomSite>) => void }) {
  const policy = seaSitePolicy(catalog);
  if (site.kind === 'coastal_watchtower') {
    const cold = coastalTowerSkin(doc.biome, (x) => terrainAt(doc, x), { q: site.q, r: site.r }) === 'cold';
    return (
      <div className="editor-form" data-testid="site-sea-tower">
        <div className="row gap">
          <span className="small">Its holder sees</span>
          <input
            type="number"
            className="text-input editor-count"
            min={1}
            max={12}
            value={site.radius ?? policy.towerRadius}
            aria-label="Coastal watchtower sight"
            onChange={(e) => {
              const n = Math.max(1, Math.min(12, Math.round(Number(e.target.value) || 1)));
              update(site.id, { radius: n === policy.towerRadius ? undefined : n });
            }}
            data-testid="site-sea-tower-radius"
          />
          <span className="small">hexes around it, sea lanes included</span>
        </div>
        <p className="small dim">Taken by a hero on foot. Its owner is warned when an enemy ship sails into sight. Picture here: {cold ? 'cold stone (a cold climate or rocky shore)' : 'warm timber'}.</p>
      </div>
    );
  }
  if (site.kind === 'sea_pickup') {
    const resource = site.resource ?? 'gold';
    const [lo, hi] = policy.pickupRewards[resource];
    return (
      <div className="editor-form" data-testid="site-sea-pickup">
        <label className="setting-block__label">Salvage</label>
        <select className="text-input" value={resource} aria-label="Salvage resource" onChange={(e) => update(site.id, { resource: e.target.value as SeaPickupResource, amount: undefined })} data-testid="site-sea-pickup-resource">
          {SEA_PICKUP_RESOURCES.map((r) => (
            <option key={r} value={r}>
              {SEA_PICKUP_NAMES[r]} ({r === 'gold' ? 'Gold' : r === 'wood' ? 'Wood' : 'Stone'})
            </option>
          ))}
        </select>
        <div className="row gap">
          <span className="small">Amount</span>
          <input
            type="number"
            className="text-input editor-count"
            min={1}
            max={100000}
            value={site.amount ?? ''}
            placeholder={`${lo}–${hi}`}
            aria-label="Salvage amount (blank: drawn when the game starts)"
            onChange={(e) => {
              const raw = e.target.value.trim();
              update(site.id, { amount: raw === '' ? undefined : Math.max(1, Math.min(100000, Math.round(Number(raw) || 1))) });
            }}
            data-testid="site-sea-pickup-amount"
          />
          <span className="small dim">blank: {lo}–{hi}, drawn when the game starts</span>
        </div>
        <p className="small dim">The first hero to sail onto it takes it; it never blocks the way.</p>
      </div>
    );
  }
  if (site.kind === 'shipwreck') {
    return (
      <div className="editor-form" data-testid="site-sea-wreck">
        <label className="setting-block__label">What lies aboard</label>
        <select className="text-input" value={site.outcome ?? ''} aria-label="Wreck outcome" onChange={(e) => update(site.id, { outcome: (e.target.value || undefined) as CustomSite['outcome'] })} data-testid="site-sea-wreck-outcome">
          <option value="">Drawn when the game starts ({policy.wreckOutcomes.map((o) => `${o.weight}%`).join(' / ')})</option>
          {policy.wreckOutcomes.map((o) => (
            <option key={o.kind} value={o.kind}>
              {OUTCOME_LABEL[o.kind]}
            </option>
          ))}
        </select>
        <label className="setting-block__label">Picture</label>
        <select className="text-input" value={site.skin ?? ''} aria-label="Wreck picture" onChange={(e) => update(site.id, { skin: (e.target.value || undefined) as CustomSite['skin'] })} data-testid="site-sea-wreck-skin">
          <option value="">Drawn when the game starts</option>
          <option value="broken_mast">Broken mast</option>
          <option value="split_hull">Split hull</option>
        </select>
        <p className="small dim">A hero aboard a ship beside it explores it for {policy.wreckExploreCost} movement. Raiders, if any, are fought on the boarding deck; the map’s guard strength sets their number.</p>
      </div>
    );
  }
  return null;
}
