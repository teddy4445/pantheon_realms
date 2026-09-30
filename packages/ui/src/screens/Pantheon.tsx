/**
 * S10 Pantheon / Gods. Gods are content-driven (any number per pantheon).
 * Each card's state, reason and missing requirements come from
 * quoteGodSelection; committing is a permanent SelectGod command after an
 * explicit divine-choice confirmation. Covenants are assigned to towns here.
 */
import { useState } from 'react';
import { quoteCovenantAssignment, quoteGodSelection, type GodDefinition } from '@pr/rules';
import { useStore } from '../app/context';
import { Button, Chip, Panel, SectionTitle } from '../components/kit';
import { Emblem, GodPortrait } from '../components/art';
import { ScreenHeader, StatusChip } from '../components/game';
import { Icon } from '../assets/icons';
import { humanPlayer } from '../app/view';

const STATE_CHIP: Record<string, { text: string; tone: 'ok' | 'warn' | 'bad' | 'info' | 'muted' }> = {
  selected: { text: 'Committed', tone: 'ok' },
  available: { text: 'Available', tone: 'info' },
  locked: { text: 'Locked', tone: 'warn' },
  excluded: { text: 'Excluded', tone: 'bad' },
  undesigned: { text: 'Not designed yet', tone: 'muted' },
  unaffordable: { text: 'Needs Favor', tone: 'warn' },
};

const GROUP_LABEL: Record<string, string> = { first_minor: 'First choice', second_minor: 'Second choice' };

export function PantheonScreen() {
  const store = useStore();
  const catalog = store.catalog;
  const state = store.session!.state;
  const player = humanPlayer(state);
  const pantheon = catalog.pantheons[player.pantheonId]!;
  const gods = pantheon.godIds.map((g) => catalog.gods[g]).filter((g): g is GodDefinition => !!g);
  const patron = player.pantheon.patronGodId ? catalog.gods[player.pantheon.patronGodId] : undefined;
  const towns = Object.values(state.towns).filter((t) => t.ownerId === player.id);
  const [assignTown, setAssignTown] = useState<Record<string, string>>({});
  const reqNames = (group: string) => {
    const g = gods.find((x) => x.exclusivityGroup === group);
    const names = (g?.requirements ?? []).flatMap((r) => (r.type === 'has_building' ? [catalog.buildings[r.buildingId]?.name ?? r.buildingId] : []));
    return g ? `${names.join(' and ')} in one town, ${g.favorCost} Favor` : null;
  };
  const first = reqNames('first_minor');
  const second = reqNames('second_minor');
  const choiceNote = [first ? `First choice: ${first}.` : '', second ? `Second choice, after the first: ${second}.` : '', 'Each choice is permanent and excludes the other gods of that choice.'].filter(Boolean).join(' ');

  const commit = (god: GodDefinition) => {
    const excluded = god.exclusivityGroup ? gods.filter((g) => g.id !== god.id && g.exclusivityGroup === god.exclusivityGroup).map((g) => g.name) : [];
    store.confirm(
      `Commit to ${god.name}?`,
      'Divine commitments are permanent for this playthrough.',
      `Commit to ${god.name}`,
      () => {
        if (!store.dispatch({ kind: 'SelectGod', godId: god.id })) store.toast(`${god.name} now favors you`, 'success');
      },
      { detail: [...god.benefitSummary, god.favorCost ? `Costs ${god.favorCost} Favor` : 'No Favor cost', ...(excluded.length ? [`Permanently excludes: ${excluded.join(', ')}`] : [])] },
    );
  };

  return (
    <div className="screen pantheon-screen" style={{ ['--faction' as string]: pantheon.theme.accent }}>
      <ScreenHeader title={`${pantheon.name} Pantheon`} subtitle={`${pantheon.epithet} · ${gods.length} gods · Favor ${player.wallet.favor}`} />
      <div className="pantheon-layout">
        <Panel title="Patron" className="pantheon-patron">
          {patron ? (
            <div className="patron">
              <GodPortrait catalog={catalog} godId={patron.id} size="9rem" />
              <div>
                <div className="patron__name">{patron.name}</div>
                <div className="dim">{patron.domain}</div>
                {patron.quote ? <blockquote className="quote">“{patron.quote}”</blockquote> : null}
                <ul className="bullets">
                  {patron.benefitSummary.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="dim">No patron.</p>
          )}
          <div className="row gap">
            <Emblem catalog={catalog} pantheonId={pantheon.id} size="2.4rem" />
            <div className="small">
              <Icon name="favor" className="inline-icon" /> Favor <strong className="num">{player.wallet.favor}</strong> — earned from Temples; spent on minor-god commitments.
            </div>
          </div>
        </Panel>

        <Panel title="Gods" className="pantheon-gods" bodyClassName="scroll">
          {pantheon.signature ? (
            <div className="signature panel" data-testid="signature">
              <div className="row gap wrap">
                <strong>Signature: {pantheon.signature.name}</strong>
                <span className="dim small">{pantheon.signature.summary}</span>
                {state.scenario.signatureMechanics ? <Chip tone="info">Proposed · active here</Chip> : <Chip tone="muted">Not used in this campaign</Chip>}
              </div>
              <ul className="bullets small">
                {pantheon.signature.rules.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="dim small">{choiceNote}</p>
          <div className="god-grid god-grid--wide">
            {gods.map((g) => {
              const q = quoteGodSelection(catalog, state, player.id, g.id);
              const chip = STATE_CHIP[q.state]!;
              return (
                <div key={g.id} className={`god-card panel ${q.state === 'selected' ? 'is-selected' : ''} ${q.state === 'undesigned' ? 'is-disabled' : ''}`} data-testid={`god-${g.id}`}>
                  <GodPortrait catalog={catalog} godId={g.id} size="5.5rem" locked={q.state === 'undesigned' || q.state === 'excluded'} />
                  <div className="god-card__name">{g.name}</div>
                  <div className="god-card__domain">{g.domain}</div>
                  <div className="row gap wrap center">
                    <Chip tone={chip.tone}>{chip.text}</Chip>
                    <Chip>{g.role === 'patron' ? 'Patron' : g.role === 'minor' ? GROUP_LABEL[g.exclusivityGroup ?? ''] ?? 'Minor god' : 'Unassigned'}</Chip>
                    {g.role === 'minor' ? <Chip tone="info">{g.favorCost} Favor</Chip> : null}
                  </div>
                  {g.benefitSummary.length ? (
                    <ul className="bullets small">
                      {g.benefitSummary.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  ) : (
                    <StatusChip status={g.implementationStatus} />
                  )}
                  {q.missing.length ? (
                    <ul className="bullets small danger-list">
                      {q.missing.map((m) => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>
                  ) : q.reason && q.state !== 'selected' && q.state !== 'undesigned' ? (
                    <div className="small warn">{q.reason}</div>
                  ) : null}
                  {g.role === 'minor' && q.state !== 'selected' && q.state !== 'excluded' ? (
                    <Button variant="primary" size="small" disabled={!q.legal} disabledReason={q.reason} onClick={() => commit(g)}>
                      Commit
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Covenants" className="pantheon-covenants">
          <p className="dim small">A covenant lets one town build the dwelling of a creature family that requires it.</p>
          {player.entitlements.length === 0 ? <p className="dim">No covenants earned yet.</p> : null}
          {player.entitlements.map((e) => {
            const ent = catalog.entitlements[e.entitlementId];
            const fam = catalog.families[e.familyId];
            const target = assignTown[e.entitlementId] ?? towns[0]?.id ?? '';
            const q = target ? quoteCovenantAssignment(catalog, state, player.id, target, e.entitlementId) : { legal: false, reason: 'You own no town' };
            return (
              <div key={e.entitlementId} className="covenant">
                <div>
                  <strong>{ent?.name ?? fam?.name}</strong>
                  <div className="dim small">{ent?.summary}</div>
                </div>
                {e.assignedTownId ? (
                  <Chip tone="ok">Assigned to {state.towns[e.assignedTownId]?.name}</Chip>
                ) : (
                  <div className="row gap">
                    <select className="select" value={target} onChange={(ev) => setAssignTown({ ...assignTown, [e.entitlementId]: ev.target.value })} aria-label="Town">
                      {towns.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="small"
                      variant="primary"
                      disabled={!q.legal}
                      disabledReason={q.reason}
                      onClick={() =>
                        store.confirm(`Assign ${ent?.name}?`, `The covenant is bound to ${state.towns[target]?.name} permanently.`, 'Assign', () => {
                          store.dispatch({ kind: 'AssignCovenant', townId: target, entitlementId: e.entitlementId });
                        })
                      }
                    >
                      Assign
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
          <SectionTitle>Committed</SectionTitle>
          <div className="row gap wrap">
            {[player.pantheon.patronGodId, ...player.pantheon.minorGodIds].filter(Boolean).map((g) => (
              <span key={g!} className="god-pill">
                <GodPortrait catalog={catalog} godId={g!} size="2rem" /> {catalog.gods[g!]?.name}
              </span>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
