/**
 * God-card icon rows (GPT-6 Brief 8, Part B; owner delivery 2026-10-04): a god's
 * blessings, price and state as compact icon-and-number tokens instead of
 * repeated sentences. Every token keeps the content's exact sentence
 * (`benefitSummary`, the requirement and the quote's reason) as its tooltip and
 * as screen-reader text, so nothing the sentences said is lost. Values come only
 * from the god definition and `quoteGodSelection`; nothing here changes a rule.
 */
import { useEffect, type ReactNode } from 'react';
import type { ContentCatalog, EffectDefinition, GodDefinition, GodQuote, RequirementDefinition } from '@pr/rules';
import { resolveAsset } from '../assets/manifest';
import { spriteManifest } from '@pr/presentation/core';
import { Icon, type IconName } from '../assets/icons';
import { GodPortrait, SpellIcon } from './art';
import { Burst } from './burst';

/** A delivered god-card icon (`icon.bless.*`, `icon.req.*`, `icon.god.*`), else a glyph stand-in. */
export function GodCardIcon({ id, fallback }: { id: string; fallback: IconName }) {
  const url = resolveAsset(id).url;
  return url ? <img className="god-ico" src={url} alt="" draggable={false} data-asset={id} /> : <Icon name={fallback} className="god-ico god-ico--glyph" />;
}

const RES_ICON: Record<string, IconName> = { gold: 'gold', wood: 'wood', stone: 'stone', crystal: 'crystal', favor: 'favor' };
const ATTR_ICON: Record<string, IconName> = { attack: 'attack', defense: 'defense', power: 'power', knowledge: 'knowledge', speed: 'speed', hp: 'hp', damage: 'damage' };

type Who = 'commanders' | 'armies' | 'creatures' | 'shooters' | 'flyers';
const WHO_FALLBACK: Record<Who, IconName> = { commanders: 'hero', armies: 'flag', creatures: 'bestiary', shooters: 'bow', flyers: 'speed' };

function who(w: Who): ReactNode {
  return <GodCardIcon id={`icon.bless.${w}`} fallback={WHO_FALLBACK[w]} />;
}
const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);
const tiers = (e: { minTier?: number; maxTier?: number }) => (e.maxTier !== undefined ? ` T${e.minTier ?? 1}–${e.maxTier}` : e.minTier !== undefined ? ` T${e.minTier}+` : '');

/** The icons and number for one blessing; null when the effect has no icon form (its sentence is shown instead). */
export function benefitGlyphs(catalog: ContentCatalog, e: EffectDefinition): ReactNode | null {
  const x = e as EffectDefinition & Record<string, unknown>;
  const n = (k: string) => Number(x[k] ?? 0);
  switch (e.type) {
    case 'commander_attribute':
      return (
        <>
          {who('commanders')}
          <Icon name={ATTR_ICON[String(x.attribute)] ?? 'star'} className="god-ico god-ico--attr" />
          <span className="num">{sign(n('amount'))}</span>
        </>
      );
    case 'morale':
    case 'luck':
      return (
        <>
          {who('armies')}
          <Icon name={e.type} className="god-ico god-ico--attr" />
          <span className="num">{sign(n('amount'))}</span>
        </>
      );
    case 'creature_stat': {
      const ability = String(x.ability ?? '');
      const w: Who = ability === 'shooter' ? 'shooters' : ability === 'flight' ? 'flyers' : 'creatures';
      return (
        <>
          {who(w)}
          <Icon name={ATTR_ICON[String(x.stat)] ?? 'star'} className="god-ico god-ico--attr" />
          <span className="num">
            {sign(n('amount'))}
            {tiers(x as { minTier?: number; maxTier?: number })}
          </span>
        </>
      );
    }
    case 'vision_radius':
      return (
        <>
          {who('commanders')}
          <Icon name="eye" className="god-ico god-ico--attr" />
          <span className="num">{sign(n('amount'))}</span>
        </>
      );
    case 'movement_percent':
      return (
        <>
          {who('commanders')}
          <Icon name="movement" className="god-ico god-ico--attr" />
          <span className="num">{sign(n('percent'))}%</span>
        </>
      );
    case 'mana_regen':
      return (
        <>
          {who('commanders')}
          <Icon name="mana" className="god-ico god-ico--attr" />
          <span className="num">{sign(n('amount'))}</span>
        </>
      );
    case 'daily_income':
      return (
        <>
          <GodCardIcon id="icon.bless.daily_income" fallback="hourglass" />
          <Icon name={RES_ICON[String(x.resource)] ?? 'gold'} className="god-ico god-ico--attr" />
          <span className="num">{sign(n('amount'))}</span>
        </>
      );
    case 'weekly_growth_bonus':
      return (
        <>
          <GodCardIcon id="icon.bless.growth" fallback="growth" />
          <span className="num">
            {sign(n('amount'))}
            {tiers(x as { minTier?: number; maxTier?: number })}
          </span>
        </>
      );
    case 'casualty_recovery':
      return (
        <>
          <GodCardIcon id="icon.bless.recovery" fallback="hp" />
          <span className="num">{n('percent')}%</span>
        </>
      );
    case 'spell_eligibility': {
      const sp = catalog.spells[String(x.spellId)];
      return (
        <>
          <GodCardIcon id="icon.bless.spell_unlock" fallback="spell" />
          {sp ? <SpellIcon iconAssetId={sp.iconAssetId} effectType={sp.effect.type} size="1.35rem" /> : null}
          <span className="god-tok__word">{sp?.name ?? String(x.spellId)}</span>
        </>
      );
    }
    case 'offering':
      return (
        <>
          <GodCardIcon id="icon.bless.offering" fallback="favor" />
          <span className="num">1</span>
          <Icon name="favor" className="god-ico god-ico--attr" />
          <span className="num">/{n('goldPerFavor')}</span>
          <Icon name="gold" className="god-ico god-ico--attr" />
        </>
      );
    case 'wounded_fury':
      return (
        <>
          <GodCardIcon id="icon.bless.fury" fallback="attack" />
          <Icon name="attack" className="god-ico god-ico--attr" />
          <span className="num">{sign(n('attack'))}</span>
        </>
      );
    default:
      return null;
  }
}

/** One token: icons visible, the exact sentence as tooltip and for screen readers. */
function Token({ text, children, className = '', testId }: { text: string; children: ReactNode; className?: string; testId?: string }) {
  return (
    <li className={`god-tok ${className}`} title={text} tabIndex={0} data-testid={testId}>
      <span className="god-tok__icons" aria-hidden="true">
        {children}
      </span>
      <span className="sr-only">{text}</span>
    </li>
  );
}

/**
 * A god's blessings as icon rows. A blessing without an icon form, and gods with
 * no mechanical blessing (the patrons), keep their sentences.
 */
export function GodBenefits({ catalog, god }: { catalog: ContentCatalog; god: GodDefinition }) {
  const rows = god.benefits.map((e, i) => ({ text: god.benefitSummary[i] ?? e.type, glyphs: god.benefits.length === god.benefitSummary.length ? benefitGlyphs(catalog, e) : null }));
  const tokens = rows.filter((r) => r.glyphs);
  const sentences = god.benefits.length === 0 ? [...god.benefitSummary] : rows.filter((r) => !r.glyphs).map((r) => r.text);
  return (
    <>
      {tokens.length ? (
        <ul className="god-row god-row--benefits" aria-label="Blessings" data-testid={`god-benefits-${god.id}`}>
          {tokens.map((r, i) => (
            <Token key={i} text={r.text}>
              {r.glyphs}
            </Token>
          ))}
        </ul>
      ) : null}
      {sentences.length ? (
        <ul className="bullets small god-sentences">
          {sentences.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

/** The level a building stands for in its town slot (temple, civic hall …), from the town archetypes. */
function buildingRole(catalog: ContentCatalog, buildingId: string): { role: string | undefined; level: number } | null {
  for (const a of Object.values(catalog.townArchetypes)) {
    for (const s of a.slots) {
      const i = s.chain.indexOf(buildingId);
      if (i >= 0) return { role: s.role, level: i + 1 };
    }
  }
  return null;
}

function requirementToken(catalog: ContentCatalog, r: RequirementDefinition): { text: string; icon: ReactNode } {
  if (r.type === 'has_building') {
    const name = catalog.buildings[r.buildingId]?.name ?? r.buildingId;
    const at = buildingRole(catalog, r.buildingId);
    const id = at?.role === 'pantheon_temple' ? (at.level >= 2 ? 'icon.req.grand_temple' : 'icon.req.temple') : at?.role === 'civic_hall' ? 'icon.req.city_hall' : null;
    const text = `Needs ${name}${at ? ` (level ${at.level})` : ''} in one town`;
    return { text, icon: id ? <GodCardIcon id={id} fallback="town" /> : <Icon name="town" className="god-ico god-ico--attr" /> };
  }
  if (r.type === 'has_god_in_group') {
    const label = r.group === 'first_minor' ? 'your first choice' : r.group === 'second_minor' ? 'your second choice' : `a god of ${r.group}`;
    return { text: `Available only after ${label}`, icon: <GodCardIcon id="icon.req.after_first" fallback="lock" /> };
  }
  return { text: r.type, icon: <Icon name="lock" className="god-ico god-ico--attr" /> };
}

/** The price: Favor coin and number, then the buildings and choices it needs (all in one town). */
export function GodPrice({ catalog, god, quote }: { catalog: ContentCatalog; god: GodDefinition; quote?: GodQuote }) {
  if (god.role !== 'minor') return null;
  const reqs = god.requirements.map((r) => requirementToken(catalog, r));
  const missing = quote && quote.state === 'locked' && quote.missing.length ? quote.missing : [];
  const short = quote?.state === 'unaffordable';
  return (
    <ul className={`god-row god-row--price ${missing.length ? 'is-unmet' : ''}`} aria-label="Price" data-testid={`god-price-${god.id}`}>
      <Token text={`Costs ${god.favorCost} Favor${short && quote?.reason ? ` — ${quote.reason}` : ''}`} className={`god-tok--favor ${short ? 'is-unmet' : ''}`}>
        <Icon name="favor" className="god-ico god-ico--attr" />
        <span className="num">{god.favorCost}</span>
      </Token>
      {reqs.map((r, i) => (
        <Token key={i} text={missing.length ? `${r.text}. Missing: ${missing.join('; ')}` : r.text}>
          {r.icon}
        </Token>
      ))}
    </ul>
  );
}

/** Role and state chips with their icons; the reason of an excluded or locked god is the chip's tooltip. */
export function GodState({ god, quote, stateText, stateTone }: { god: GodDefinition; quote: GodQuote; stateText: string; stateTone: string }) {
  const role =
    god.role === 'patron'
      ? { id: 'icon.god.patron', text: 'Patron', title: 'Your patron god, from the start' }
      : god.exclusivityGroup === 'first_minor'
        ? { id: 'icon.god.first_choice', text: 'First choice', title: 'One of the gods of your first choice' }
        : god.exclusivityGroup === 'second_minor'
          ? { id: 'icon.god.second_choice', text: 'Second choice', title: 'One of the gods of your second choice' }
          : null;
  const st = quote.state === 'selected' ? 'icon.god.committed' : quote.state === 'excluded' ? 'icon.god.excluded' : null;
  const title = quote.state === 'selected' ? (god.role === 'patron' ? 'Your patron god' : 'You have committed to this god (permanent)') : (quote.reason ?? stateText);
  return (
    <div className="row gap wrap center god-state">
      <span className={`chip chip--${stateTone} god-chip`} title={title} data-testid={`god-state-${god.id}`}>
        {st ? <GodCardIcon id={st} fallback={quote.state === 'selected' ? 'check' : 'lock'} /> : null}
        {stateText}
        {quote.state === 'selected' || quote.state === 'excluded' ? <span className="sr-only"> — {title}</span> : null}
      </span>
      {role ? (
        <span className="chip god-chip" title={role.title}>
          <GodCardIcon id={role.id} fallback="star" />
          {role.text}
        </span>
      ) : (
        <span className="chip">Unassigned</span>
      )}
    </div>
  );
}

/** The rule every minor-god choice shares: permanent, and it excludes the rest of its group. */
export function PermanentNote({ children }: { children: ReactNode }) {
  return (
    <span className="god-permanent">
      <GodCardIcon id="icon.god.permanent" fallback="lock" />
      <span>{children}</span>
    </span>
  );
}

/**
 * The commitment dialog's body: who the god is, what the blessing gives and
 * costs (icon rows), the gods of the same choice it shuts out for good, and
 * that the choice is permanent.
 */
export function GodCommitPreview({ catalog, god, excluded }: { catalog: ContentCatalog; god: GodDefinition; excluded: readonly GodDefinition[] }) {
  return (
    <div className="god-commit" data-testid="god-commit-preview">
      <div className="god-commit__head">
        <GodPortrait catalog={catalog} godId={god.id} size="4.6rem" />
        <div className="god-commit__who">
          <div className="god-commit__name">{god.name}</div>
          <div className="dim small">{god.domain}</div>
          <GodPrice catalog={catalog} god={god} />
        </div>
      </div>
      <GodBenefits catalog={catalog} god={god} />
      {excluded.length ? (
        <div className="god-commit__excludes" data-testid="god-commit-excludes">
          <span className="god-commit__label">
            <GodCardIcon id="icon.god.excluded" fallback="lock" />
            Shuts out for good
          </span>
          {excluded.map((x) => (
            <span key={x.id} className="god-pill small">
              <GodPortrait catalog={catalog} godId={x.id} size="1.6rem" /> {x.name}
            </span>
          ))}
        </div>
      ) : null}
      <PermanentNote>This choice cannot be undone in this playthrough.</PermanentNote>
    </div>
  );
}

/** The commitment strip: a dedicated `fx.god.commit` when delivered, else the Anointing gift's golden burst. */
export function godCommitStrip(): string | undefined {
  const fx = spriteManifest().effects;
  return fx['fx.god.commit'] ? 'fx.god.commit' : fx['fx.gift.anointing'] ? 'fx.gift.anointing' : undefined;
}

/**
 * The moment a god accepts the commitment (shown on its card, once): the
 * golden burst over the portrait, the committed seal pressed onto the card and
 * a short glow. Presentation only; the caller leaves it out under reduced motion.
 */
export function GodCommitFx({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1700);
    return () => clearTimeout(t);
    // One timer per celebration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const strip = godCommitStrip();
  return (
    <div className="god-commit-fx" aria-hidden="true" data-testid="god-commit-fx">
      <span className="god-commit-fx__rays" />
      <Burst kind="anoint" {...(strip ? { stripId: strip } : {})} className="god-commit-fx__burst" scale={0.9} />
      <span className="god-commit-fx__seal">
        <GodCardIcon id="icon.god.committed" fallback="check" />
      </span>
    </div>
  );
}
