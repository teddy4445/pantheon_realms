/**
 * S10 Pantheon / Gods. Gods are content-driven (any number per pantheon).
 * Each card's state, reason and missing requirements come from
 * quoteGodSelection; committing is a permanent SelectGod command after an
 * explicit divine-choice confirmation. Covenants are assigned to towns here.
 *
 * City dedications (app 1.5.0; only in games with the feature): each card separates the
 * god's "Empire blessing" (what still applies empire-wide, from `godBenefitsInMatch`) from
 * its "Available city dedication" (the three local benefits, Temple II, chosen per city),
 * and lists the player's cities — honored, scheduled, could switch, with what works now and
 * what needs a dwelling or service first. A commitment never rededicates a town.
 */
import { useEffect, useState } from 'react';
import { quoteCovenantAssignment, quoteGodSelection, type GodDefinition, interventionsFor } from '@pr/rules';
import { useStore } from '../app/context';
import { Button, Chip, Panel, SectionTitle } from '../components/kit';
import { Emblem, GodPortrait } from '../components/art';
import { ScreenHeader, StatusChip } from '../components/game';
import { Icon } from '../assets/icons';
import { humanPlayer } from '../app/view';
import { InterventionList } from '../dialogs/WorldDialogs';
import { GodBenefits, GodCardIcon, GodCommitFx, GodCommitPreview, GodPrice, GodState, PermanentNote } from '../components/godIcons';
import { reducedMotion } from '../app/preferences';
import { blessingMode, empireBlessing, godCityOptions, godName } from '../app/dedication';
import { GodCityLines, GodCityOptionsList, GodDedicationSections } from '../components/dedication';

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
  // The price of each choice once, as an icon row (the cards repeat it per god).
  const choiceRows = (['first_minor', 'second_minor'] as const).flatMap((group) => {
    const g = gods.find((x) => x.exclusivityGroup === group && x.role === 'minor');
    return g ? [{ group, god: g }] : [];
  });

  const mode = blessingMode(state);
  const city = mode === 'city';
  const openCity = (townId: string) => store.goto('town', { townId, dedication: true });
  const commit = (god: GodDefinition) => {
    const excluded = god.exclusivityGroup ? gods.filter((g) => g.id !== god.id && g.exclusivityGroup === god.exclusivityGroup) : [];
    // With city dedications: the empire blessing as it applies in this game, and the city dedication the god makes possible.
    const cityExtra = city ? (
      <section className="ded-god__part" aria-label="Available city dedication" data-testid="god-commit-city">
        <h4 className="ded-god__title">Available city dedication</h4>
        <GodCityLines catalog={catalog} godId={god.id} />
        <p className="ded-god__note small">Committing changes no city’s god: choose {god.name} per city at a Temple II (free for a city’s first dedication).</p>
        <GodCityOptionsList options={godCityOptions(catalog, state, player.id, god.id)} testId="god-commit-cities" />
      </section>
    ) : undefined;
    store.confirm(
      `Commit to ${god.name}?`,
      'Divine commitments are permanent for this playthrough.',
      `Commit to ${god.name}`,
      () => {
        if (!store.dispatch({ kind: 'SelectGod', godId: god.id })) store.toast(`${god.name} now favors you`, 'success');
      },
      // The same icon rows as the card; every token keeps its sentence as tooltip and screen-reader text.
      { content: <GodCommitPreview catalog={catalog} god={god} excluded={excluded} {...(city ? { blessing: empireBlessing(catalog, god.id, mode), extra: cityExtra } : {})} /> },
    );
  };
  // The god accepts: a short moment on its card once the commitment is committed (not under reduced motion).
  const [celebrate, setCelebrate] = useState<{ godId: string; key: number } | null>(null);
  useEffect(
    () =>
      store.registerPresenter(async (events) => {
        const me = store.session?.humanPlayerId;
        const e = events.find((x) => x.kind === 'GodSelected' && x.playerId === me);
        if (!e || e.kind !== 'GodSelected' || reducedMotion(store.prefs)) return;
        setCelebrate({ godId: e.godId, key: Date.now() });
      }),
    [store],
  );

  return (
    <div className="screen pantheon-screen" style={{ ['--faction' as string]: pantheon.theme.accent }}>
      <ScreenHeader title={`${pantheon.name} Pantheon`} />
      <div className={`pantheon-layout ${city ? 'pantheon-layout--city' : ''}`}>
        <Panel title="Patron" className="pantheon-patron">
          {patron ? (
            <div className="patron">
              <GodPortrait catalog={catalog} godId={patron.id} size="9rem" />
              <div>
                <span className="chip god-chip" title="Your patron god, from the start; a patron cannot be changed">
                  <GodCardIcon id="icon.god.patron" fallback="star" />
                  Patron
                  <GodCardIcon id="icon.god.permanent" fallback="lock" />
                </span>
                <div className="patron__name">{patron.name}</div>
                <div className="dim">{patron.domain}</div>
                {patron.quote ? <blockquote className="quote">“{patron.quote}”</blockquote> : null}
                {city ? (
                  <GodDedicationSections catalog={catalog} god={patron} mode={mode}>
                    <GodCityOptionsList options={godCityOptions(catalog, state, player.id, patron.id)} onOpen={openCity} testId={`god-cities-${patron.id}`} />
                  </GodDedicationSections>
                ) : (
                  <GodBenefits catalog={catalog} god={patron} />
                )}
              </div>
            </div>
          ) : (
            <p className="dim">No patron.</p>
          )}
          {pantheon.signature ? (
            <div className="signature panel" data-testid="signature">
              <div className="row gap wrap">
                <strong>Signature: {pantheon.signature.name}</strong>
                <span className="dim small">{pantheon.signature.summary}</span>
                {state.scenario.signatureMechanics ? null : <Chip tone="muted">Not used in this campaign</Chip>}
              </div>
              <ul className="bullets small">
                {pantheon.signature.rules.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="row gap">
            <Emblem catalog={catalog} pantheonId={pantheon.id} size="2.4rem" />
            <div className="small">
              <Icon name="favor" className="inline-icon" /> Favor <strong className="num">{player.wallet.favor}</strong> — earned from Temples; spent on minor-god commitments.
            </div>
          </div>
        </Panel>

        <Panel title="Gods" className="pantheon-gods" bodyClassName="scroll">
          <div className="god-choices small" data-testid="god-choices">
            {choiceRows.map(({ group, god }) => (
              <div key={group} className="god-choices__row">
                <span className="god-choices__label">
                  <GodCardIcon id={group === 'first_minor' ? 'icon.god.first_choice' : 'icon.god.second_choice'} fallback="star" />
                  {GROUP_LABEL[group]}
                </span>
                <GodPrice catalog={catalog} god={god} />
              </div>
            ))}
            <PermanentNote>Each choice is permanent and excludes the other gods of that choice.</PermanentNote>
          </div>
          <div className="god-grid god-grid--wide">
            {gods
              .filter((g) => g.role !== 'patron')
              .map((g) => {
                const q = quoteGodSelection(catalog, state, player.id, g.id);
                const chip = STATE_CHIP[q.state]!;
                return (
                  <div key={g.id} className={`god-card panel ${q.state === 'selected' ? 'is-selected' : ''} ${q.state === 'undesigned' ? 'is-disabled' : ''} ${celebrate?.godId === g.id ? 'is-celebrating' : ''}`} data-testid={`god-${g.id}`}>
                    {celebrate?.godId === g.id ? <GodCommitFx key={celebrate.key} onDone={() => setCelebrate(null)} /> : null}
                    <GodPortrait catalog={catalog} godId={g.id} size="5.5rem" locked={q.state === 'undesigned' || q.state === 'excluded'} />
                    <div className="god-card__name">{g.name}</div>
                    <div className="god-card__domain">{g.domain}</div>
                    <GodState god={g} quote={q} stateText={chip.text} stateTone={chip.tone} />
                    {!g.benefitSummary.length ? (
                      <StatusChip status={g.implementationStatus} />
                    ) : city ? (
                      <GodDedicationSections catalog={catalog} god={g} mode={mode}>
                        {q.state === 'selected' ? (
                          <GodCityOptionsList options={godCityOptions(catalog, state, player.id, g.id)} onOpen={openCity} testId={`god-cities-${g.id}`} />
                        ) : (
                          <CouldHonor count={godCityOptions(catalog, state, player.id, g.id).filter((o) => o.kind === 'later').length} name={godName(catalog, g.id)} />
                        )}
                      </GodDedicationSections>
                    ) : (
                      <GodBenefits catalog={catalog} god={g} />
                    )}
                    {q.state !== 'selected' && q.state !== 'excluded' ? <GodPrice catalog={catalog} god={g} quote={q} /> : null}
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

        {interventionsFor(catalog, state, player.id).length > 0 ? (
          <Panel title="Divine interventions" className="pantheon-miracles" headerIcon="pantheon" bodyClassName="scroll">
            <InterventionList adventure />
          </Panel>
        ) : null}

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
              <span key={g!} className="god-pill" title={g === player.pantheon.patronGodId ? 'Patron' : 'Committed (permanent)'}>
                <GodPortrait catalog={catalog} godId={g!} size="2rem" /> {catalog.gods[g!]?.name}
                <GodCardIcon id={g === player.pantheon.patronGodId ? 'icon.god.patron' : 'icon.god.committed'} fallback="check" />
              </span>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/** An uncommitted god's card: how many of the player's cities could honor it once committed (the list itself is on committed cards). */
function CouldHonor({ count, name }: { count: number; name: string }) {
  return <p className="ded-god__note small">{count > 0 ? `${count} of your cities could honor ${name} after you commit.` : `Commit first; then choose ${name} per city at a Temple II.`}</p>;
}
