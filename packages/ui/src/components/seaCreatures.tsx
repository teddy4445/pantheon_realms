/**
 * Sea creatures in the interface (sea-creature delivery 2026-10-17): the encounter card (map tile and
 * encyclopedia), the encyclopedia's family panel with its upgrade comparison, and the animated sprite
 * preview. The preview draws the delivered frame regions on a plain 2D canvas (no PixiJS at start-up);
 * only ONE preview runs at a time (its owner holds the choice), it pauses while off-screen or while the
 * window is hidden, and with reduced motion it shows the first pose only. Facts come from
 * `app/seaCreatures.ts` (content data and the rules' resolvers); nothing here changes state.
 */
import { useEffect, useRef, useState } from 'react';
import { creatureSprites, spriteUrl, type SpriteSetDefinition } from '@pr/presentation/core';
import type { ContentCatalog, CreatureFamilyDefinition } from '@pr/rules';
import { seaCreatureFacts, seaUpgradeComparison } from '../app/seaCreatures';
import { CreaturePortrait } from './art';
import { Button } from './kit';
import '../styles/seaCreatures.css';

/** One sea creature's encounter card: portrait, origin, footprint, movement, attack, range and the renewable shots. */
export function SeaCreatureCard({ catalog, creatureId, count, compact }: { catalog: ContentCatalog; creatureId: string; count?: string | number; compact?: boolean }) {
  const f = seaCreatureFacts(catalog, creatureId);
  if (!f) return null;
  return (
    <div className={`seacard${compact ? ' seacard--compact' : ''}`} data-testid={`sea-card-${creatureId}`}>
      <CreaturePortrait catalog={catalog} creatureId={creatureId} size={compact ? '3.2rem' : '4.6rem'} {...(count !== undefined ? { count } : {})} />
      <div className="seacard__body">
        <div className="seacard__name">
          {f.name} <span className="seacard__tier">Tier {f.tier} · {f.form}</span>
        </div>
        <div className="seacard__origin">{f.origin}</div>
        <dl className="seacard__facts">
          <div>
            <dt>Footprint</dt>
            <dd>{f.footprint}</dd>
          </div>
          <div>
            <dt>{f.movement}</dt>
            <dd>{f.movementText}</dd>
          </div>
          <div>
            <dt>Attack</dt>
            <dd>
              <strong>{f.attack}</strong> — {f.attackText}
            </dd>
          </div>
          {f.rangeText ? (
            <div>
              <dt>Range</dt>
              <dd data-testid={`sea-range-${creatureId}`}>{f.rangeText}</dd>
            </div>
          ) : null}
          {f.renewable ? (
            <div>
              <dt>Renewable shots</dt>
              <dd data-testid={`sea-renewable-${creatureId}`}>{f.renewable}</dd>
            </div>
          ) : null}
        </dl>
      </div>
    </div>
  );
}

const PREVIEW_ORDER = ['idle', 'move', 'fly', 'takeoff', 'landing', 'attack', 'shoot', 'hit', 'defend', 'victory', 'death'] as const;
const PREVIEW_LABEL: Readonly<Record<string, string>> = { idle: 'Idle', move: 'Move', fly: 'Fly', takeoff: 'Take off', landing: 'Land', attack: 'Attack', shoot: 'Shoot', hit: 'Hit', defend: 'Defend', victory: 'Victory', death: 'Death' };

/** The animations of a set worth previewing, in a fixed order. */
export function previewAnimations(set: SpriteSetDefinition | null): string[] {
  if (!set) return [];
  return PREVIEW_ORDER.filter((a) => !!set.animations[a]);
}

const images = new Map<string, Promise<HTMLImageElement>>();
function loadImage(url: string): Promise<HTMLImageElement> {
  let p = images.get(url);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`image ${url}`));
      img.src = url;
    });
    images.set(url, p);
  }
  return p;
}

/**
 * An animated preview of one creature's delivered strips on a 2D canvas: constant scale for the whole
 * animation (the creature never grows between poses), ground point at the bottom centre, mirrored when
 * facing left. Pauses off-screen and while hidden; reduced motion shows the first pose.
 */
export function SpritePreview({ creatureId, calm, label }: { creatureId: string; calm: boolean; label: string }) {
  const set = creatureSprites(creatureId);
  const anims = previewAnimations(set);
  const [anim, setAnim] = useState<string>(anims[0] ?? 'idle');
  const [left, setLeft] = useState(false);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const [state, setState] = useState<'loading' | 'playing' | 'paused' | 'still' | 'missing'>('loading');

  useEffect(() => {
    const el = canvas.current;
    const strip = set?.animations[anim];
    if (!el || !strip?.regions?.length) {
      setState('missing');
      return;
    }
    const ctx = el.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let visible = true;
    let img: HTMLImageElement | null = null;
    let start = performance.now();
    let disposed = false;
    const regions = strip.regions;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = el.clientWidth || 240;
    const H = el.clientHeight || 200;
    el.width = Math.round(W * dpr);
    el.height = Math.round(H * dpr);
    // One scale for the whole animation: the largest pose fits.
    const maxW = Math.max(...regions.map((r) => r.rect[2] * r.sourceScale));
    const maxH = Math.max(...regions.map((r) => r.rect[3] * r.sourceScale));
    const scale = Math.min((W * 0.86) / maxW, (H * 0.84) / maxH);
    const frameMs = 1000 / Math.max(1, strip.fps);
    const holdMs = 700;
    const draw = (i: number) => {
      if (!img) return;
      const r = regions[Math.max(0, Math.min(regions.length - 1, i))]!;
      const k = scale * r.sourceScale;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      ctx.translate(W / 2, H * 0.92);
      if (left) ctx.scale(-1, 1);
      ctx.drawImage(img, r.rect[0], r.rect[1], r.rect[2], r.rect[3], -r.anchor[0] * k, -r.anchor[1] * k, r.rect[2] * k, r.rect[3] * k);
      ctx.restore();
    };
    const frameAt = (t: number) => {
      const n = regions.length;
      const elapsed = t - start;
      if (strip.loop) return Math.floor(elapsed / frameMs) % n;
      // A one-shot plays once, holds its last pose, then plays again (death holds).
      const cycle = n * frameMs + holdMs;
      const e = anim === 'death' ? Math.min(elapsed, n * frameMs) : elapsed % cycle;
      return Math.min(n - 1, Math.floor(e / frameMs));
    };
    const tick = (t: number) => {
      raf = 0;
      if (disposed) return;
      draw(frameAt(t));
      if (visible && !document.hidden) raf = requestAnimationFrame(tick);
    };
    const resume = () => {
      if (calm || disposed || !img) return;
      if (visible && !document.hidden) {
        setState('playing');
        if (!raf) raf = requestAnimationFrame(tick);
      } else setState('paused');
    };
    const io = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver((entries) => {
          visible = entries.some((e) => e.isIntersecting);
          if (!visible && raf) {
            cancelAnimationFrame(raf);
            raf = 0;
          }
          resume();
        })
      : null;
    io?.observe(el);
    const onVis = () => {
      if (document.hidden && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      resume();
    };
    document.addEventListener('visibilitychange', onVis);
    loadImage(spriteUrl(strip.file)).then(
      (i) => {
        if (disposed) return;
        img = i;
        start = performance.now();
        draw(0);
        if (calm) setState('still');
        else resume();
      },
      () => !disposed && setState('missing'),
    );
    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      io?.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [set, anim, left, calm]);

  return (
    <div className="seapreview" data-testid={`sea-preview-${creatureId}`} data-state={state} data-anim={anim} data-facing={left ? 'left' : 'right'}>
      <canvas ref={canvas} className="seapreview__canvas" role="img" aria-label={`${label}: ${PREVIEW_LABEL[anim] ?? anim} animation, facing ${left ? 'left' : 'right'}`} />
      <div className="seapreview__controls" role="group" aria-label="Animation">
        {anims.map((a) => (
          <button key={a} type="button" className={`seapreview__anim${a === anim ? ' is-on' : ''}`} aria-pressed={a === anim} onClick={() => setAnim(a)} data-testid={`sea-preview-anim-${a}`}>
            {PREVIEW_LABEL[a] ?? a}
          </button>
        ))}
        <button type="button" className="seapreview__anim" aria-pressed={left} onClick={() => setLeft((v) => !v)} data-testid="sea-preview-facing">
          {left ? 'Face right' : 'Face left'}
        </button>
      </div>
      {state === 'still' ? <div className="seapreview__note">Reduced motion: the first pose only.</div> : state === 'paused' ? <div className="seapreview__note">Paused while out of view.</div> : state === 'missing' ? <div className="seapreview__note">No animation delivered.</div> : null}
    </div>
  );
}

/**
 * A sea family in the encyclopedia: both forms side by side with their cards, the stat-by-stat
 * upgrade comparison and one preview button per form (the owner keeps one preview at a time).
 */
export function SeaFamilyPanel({
  catalog,
  family,
  previewing,
  onPreview,
  onOpen,
  calm,
}: {
  catalog: ContentCatalog;
  family: CreatureFamilyDefinition;
  previewing: string | null;
  onPreview: (creatureId: string | null) => void;
  onOpen: (creatureId: string) => void;
  calm: boolean;
}) {
  const forms = [family.baseCreatureId, ...(family.upgradedCreatureId ? [family.upgradedCreatureId] : [])];
  const delta = seaUpgradeComparison(catalog, family);
  const base = catalog.creatures[family.baseCreatureId];
  const up = family.upgradedCreatureId ? catalog.creatures[family.upgradedCreatureId] : undefined;
  return (
    <div className="seafamily codex-frame" data-testid={`codex-sea-family-${family.id}`}>
      <div className="bestiary-tier__head">
        <span className="tier-badge">T{family.tier}</span> {family.name}
        <span className="codex-meta"> · met only at sea</span>
      </div>
      <div className="seafamily__forms">
        {forms.map((id) => (
          <div key={id} className="seafamily__form">
            <SeaCreatureCard catalog={catalog} creatureId={id} />
            <div className="row gap seafamily__actions">
              <Button size="small" icon="inspect" onClick={() => onOpen(id)} data-testid={`codex-sea-open-${id}`}>
                Unit page
              </Button>
              <Button size="small" icon="play" aria-pressed={previewing === id} onClick={() => onPreview(previewing === id ? null : id)} data-testid={`codex-sea-preview-${id}`}>
                {previewing === id ? 'Hide animation' : 'Show animation'}
              </Button>
            </div>
            {previewing === id ? <SpritePreview creatureId={id} calm={calm} label={catalog.creatures[id]?.name ?? ''} /> : null}
          </div>
        ))}
      </div>
      {delta.length && base && up ? (
        <table className="seafamily__compare" data-testid={`codex-sea-compare-${family.id}`}>
          <caption>
            {base.name} → {up.name}
          </caption>
          <thead>
            <tr>
              <th scope="col">Stat</th>
              <th scope="col">{base.name}</th>
              <th scope="col">{up.name}</th>
            </tr>
          </thead>
          <tbody>
            {delta.map((d) => (
              <tr key={d.label}>
                <th scope="row">{d.label}</th>
                <td>{d.base}</td>
                <td className={`seafamily__delta seafamily__delta--${d.change}`}>
                  {d.upgraded}
                  {d.change === 'up' ? <span className="seafamily__arrow" aria-hidden="true">▲</span> : d.change === 'down' ? <span className="seafamily__arrow" aria-hidden="true">▼</span> : null}
                  <span className="sr-only">{d.change === 'up' ? ' (higher)' : d.change === 'down' ? ' (lower)' : ' (same)'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}

/** The encyclopedia's sea section: the sea families, with at most one animated preview open at a time. */
export function SeaBestiary({ catalog, families, calm, onOpen }: { catalog: ContentCatalog; families: readonly CreatureFamilyDefinition[]; calm: boolean; onOpen: (creatureId: string) => void }) {
  const [previewing, setPreviewing] = useState<string | null>(null);
  if (!families.length) return null;
  return (
    <section className="codex-pantheon codex-pantheon--neutral codex-pantheon--sea" data-testid="codex-pantheon-sea">
      <div className="codex-divider" role="heading" aria-level={2} aria-label="Sea creatures" tabIndex={-1}>
        <span className="codex-divider__line" aria-hidden="true" />
        <span className="codex-divider__center">
          <span className="codex-divider__titles">
            <span className="codex-divider__name">Sea creatures</span>
            <span className="codex-divider__epithet">Neutral creatures of the open sea: met only when a ship sails into them, never recruited</span>
          </span>
        </span>
        <span className="codex-divider__line codex-divider__line--end" aria-hidden="true" />
      </div>
      <div className="bestiary">
        {families.map((f) => (
          <SeaFamilyPanel key={f.id} catalog={catalog} family={f} previewing={previewing} onPreview={setPreviewing} onOpen={onOpen} calm={calm} />
        ))}
      </div>
    </section>
  );
}

/** The encounter cards of a sea-monster stack on the map: one per creature type in its army. */
export function SeaEncounterCards({ catalog, stacks }: { catalog: ContentCatalog; stacks: readonly ({ readonly creatureId: string } | null)[] }) {
  const ids = [...new Set(stacks.filter((s): s is { readonly creatureId: string } => !!s).map((s) => s.creatureId))];
  if (!ids.length) return null;
  return (
    <div className="tile-info__sea" data-testid="sea-encounter-cards">
      <div className="small">Fought from your ship’s deck: troops on foot stay on the deck, sea creatures in the water, flyers go either way. Deck Harpoons reach the water.</div>
      {ids.map((id) => (
        <SeaCreatureCard key={id} catalog={catalog} creatureId={id} compact />
      ))}
    </div>
  );
}
