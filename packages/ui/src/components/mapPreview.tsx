/**
 * A drawn overview of a custom map document (authored skirmish maps,
 * 2026-10-05): ground in the biome's colours, roads, each empire's town in its
 * seat colour and the landmarks that shape play (the shrine, portals, key gates
 * and tents, guarded passes). It is the honest stand-in until a map's painted
 * card (GPT-6 Brief 14) is delivered, and the layout view next to it after.
 */
import { useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { KEY_COLOR_HEX, TERRAIN_BY_CODE, type CustomMapDocument } from '@pr/rules';
import { biomeTerrainCss } from '@pr/presentation/core';
import { SKIRMISH_PLAYER_COLORS } from '@pr/session';
import { resolveAsset } from '../assets/manifest';

const SQ3 = Math.sqrt(3);

export function MapPreview({ doc, style, className, label }: { doc: CustomMapDocument; style?: CSSProperties; className?: string; label?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const box = useMemo(() => {
    let x0 = Infinity;
    let x1 = -Infinity;
    let r0 = Infinity;
    let r1 = -Infinity;
    for (let r = 0; r < doc.height; r++)
      for (let q = 0; q < doc.width; q++) {
        if (doc.terrain[r * doc.width + q] === 'v') continue;
        x0 = Math.min(x0, q + r / 2);
        x1 = Math.max(x1, q + r / 2);
        r0 = Math.min(r0, r);
        r1 = Math.max(r1, r);
      }
    return { x0, x1, r0, r1 };
  }, [doc]);
  const cell = 8;
  const w = Math.ceil((box.x1 - box.x0 + 1) * cell * SQ3) + 2;
  const h = Math.ceil((box.r1 - box.r0) * cell * 1.5 + cell * 2) + 2;
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    const px = (q: number, r: number) => ({ x: (q + r / 2 - box.x0 + 0.5) * cell * SQ3 + 1, y: (r - box.r0) * cell * 1.5 + cell + 1 });
    ctx.fillStyle = '#05070b';
    ctx.fillRect(0, 0, w, h);
    const hex = (x: number, y: number, rad: number) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = ((60 * i - 30) * Math.PI) / 180;
        const fx = x + rad * Math.cos(a);
        const fy = y + rad * Math.sin(a);
        if (i === 0) ctx.moveTo(fx, fy);
        else ctx.lineTo(fx, fy);
      }
      ctx.closePath();
    };
    for (let r = 0; r < doc.height; r++)
      for (let q = 0; q < doc.width; q++) {
        const code = doc.terrain[r * doc.width + q] ?? 'v';
        if (code === 'v') continue;
        const p = px(q, r);
        ctx.fillStyle = biomeTerrainCss(TERRAIN_BY_CODE[code] ?? 'plains', doc.biome ?? 'temperate');
        hex(p.x, p.y, cell + 0.6);
        ctx.fill();
      }
    // Roads.
    ctx.strokeStyle = 'rgba(70, 44, 20, 0.85)';
    ctx.lineWidth = 2;
    for (const e of doc.roads) {
      const [a, b] = e.split('|');
      const [qa, ra] = (a ?? '').split(',').map(Number);
      const [qb, rb] = (b ?? '').split(',').map(Number);
      if ([qa, ra, qb, rb].some((v) => v === undefined || Number.isNaN(v))) continue;
      const pa = px(qa!, ra!);
      const pb = px(qb!, rb!);
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
    }
    // Portal links.
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(200, 140, 255, 0.75)';
    ctx.lineWidth = 1.5;
    for (const s of doc.sites) {
      if (s.kind !== 'portal' || !s.twinId || s.id > s.twinId) continue;
      const t = doc.sites.find((x) => x.id === s.twinId);
      if (!t) continue;
      const a = px(s.q, s.r);
      const b = px(t.q, t.r);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    // Landmarks.
    const dot = (x: number, y: number, rad: number, fill: string, stroke = '#120d08') => {
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = stroke;
      ctx.stroke();
    };
    for (const s of doc.sites) {
      const p = px(s.q, s.r);
      switch (s.kind) {
        case 'town':
          hex(p.x, p.y, cell * 1.35);
          ctx.fillStyle = SKIRMISH_PLAYER_COLORS[(s.owner ?? 0) % SKIRMISH_PLAYER_COLORS.length]!;
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#f5e4b7';
          ctx.stroke();
          break;
        case 'relic':
          dot(p.x, p.y, cell * 0.95, '#ff7a2e', '#fff1d0');
          break;
        case 'portal':
          dot(p.x, p.y, cell * 0.6, '#b07bff');
          break;
        case 'key_gate':
        case 'key_tent':
          if (s.kind === 'key_gate') {
            ctx.fillStyle = KEY_COLOR_HEX[s.color ?? 'azure'];
            ctx.fillRect(p.x - cell * 0.6, p.y - cell * 0.6, cell * 1.2, cell * 1.2);
            ctx.strokeStyle = '#120d08';
            ctx.strokeRect(p.x - cell * 0.6, p.y - cell * 0.6, cell * 1.2, cell * 1.2);
          } else dot(p.x, p.y, cell * 0.55, KEY_COLOR_HEX[s.color ?? 'azure']);
          break;
        case 'gold_mine':
          dot(p.x, p.y, cell * 0.45, '#f2c94c');
          break;
        case 'crystal_deposit':
          dot(p.x, p.y, cell * 0.45, '#9b7bff');
          break;
        case 'monster':
          dot(p.x, p.y, cell * 0.45, '#c0392b');
          break;
        default:
          break;
      }
    }
  }, [doc, box, w, h]);
  return <canvas ref={ref} width={w} height={h} className={`map-preview ${className ?? ''}`} style={style} role="img" aria-label={label ?? `${doc.name} — map overview`} data-testid="map-preview" />;
}

/**
 * A skirmish map's picture: the painted art when delivered (the 640 × 360 card
 * `thumbnailAssetId`, or with `large` the full-size art the importer keeps beside
 * it), else the drawn overview.
 */
export function SkirmishMapThumb({ doc, assetId, style, className, large }: { doc: CustomMapDocument; assetId: string; style?: CSSProperties; className?: string; large?: boolean }) {
  const big = large ? resolveAsset(assetId.replace(/\.thumbnail$/, '.briefing')) : null;
  const rec = big?.url ? big : resolveAsset(assetId);
  if (rec.url) return <img src={rec.url} alt={`${doc.name}`} style={{ objectFit: 'cover', display: 'block', ...style }} className={className} draggable={false} data-testid="map-art" />;
  return <MapPreview doc={doc} style={{ objectFit: 'contain', display: 'block', background: '#05070b', ...style }} className={className} />;
}
