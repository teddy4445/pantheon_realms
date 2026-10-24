import type { ButtonHTMLAttributes } from 'react';
import { SINGLE_BATTLE_ICONS, type SingleBattleArtName } from '../assets/singleBattleIcons';

type SingleBattleIconName = SingleBattleArtName | 'undo' | 'redo';

export function SingleBattleIcon({ name }: { name: SingleBattleIconName }) {
  const art = name === 'undo' || name === 'redo' ? 'back' : name;
  const base = SINGLE_BATTLE_ICONS[art];
  return <img
    className={`sb-icon${name === 'redo' ? ' sb-icon--flipped' : ''}`}
    data-sb-icon={name}
    src={`${base}-64.webp`}
    srcSet={`${base}-64.webp 1x, ${base}-128.webp 2x`}
    width={64} height={64} alt="" aria-hidden="true" draggable={false}
  />;
}

export function BattleIconButton({ icon, label, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: SingleBattleIconName; label: string }) {
  return <button type="button" className={['sb-icon-button', className].filter(Boolean).join(' ')} title={label} aria-label={label} {...props}>
    <SingleBattleIcon name={icon}/>
  </button>;
}
