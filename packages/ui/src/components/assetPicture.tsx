import type { CSSProperties } from 'react';
import type { AssetRecord } from '../assets/manifest';

/** SVG viewport crops in native pixels; no resampling, data URLs or atlas gutters. */
export function AssetPicture({ asset, alt = '', className, style }: {
  asset: AssetRecord; alt?: string; className?: string; style?: CSSProperties;
}) {
  if (!asset.url) return null;
  if (!asset.atlas) return <img src={asset.url} alt={alt} className={className} style={style} draggable={false} />;
  const [x, y, w, h] = asset.atlas.rect;
  return <svg viewBox={`${x} ${y} ${w} ${h}`} className={className} style={{ width: '100%', height: '100%', overflow: 'hidden', ...style }}
    role={alt ? 'img' : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true} focusable="false">
    <image href={asset.url} width={asset.atlas.width} height={asset.atlas.height} />
  </svg>;
}
