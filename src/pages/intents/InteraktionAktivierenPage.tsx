/**
 * Interaktion aktivieren — 3-Schritt-Wizard.
 * Steps: 1) Veranstaltung wählen → 2) Interaktion der Veranstaltung wählen → 3) Aktiv setzen & bestätigen.
 * Reads: veranstaltungen, interaktionen. Writes: interaktionen (aktiv, via useInteraktionAktivierenFlow).
 * Composes: IntentWizardShell, EntitySelectStep, StepNav, SummaryStep, SuccessStep.
 */
import { useMemo, useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldNumber, fieldLookup, fieldRef, fieldDate, useLiveList } from '@/lib/journey';
import { useInteraktionAktivierenFlow } from '@/lib/journey/flows/InteraktionAktivieren';
import { tx } from '@/i18n';

export default function InteraktionAktivierenPage() {
  const [step, setStep] = useState(1);
  const [eventId, setEventId] = useState<string | null>(null);
  const [eventLabel, setEventLabel] = useState<string>('');

  const flow = useInteraktionAktivierenFlow({
    steps: { interaktionen: 2 },
    items: {
      interaktionen: r => ({
        id: r.id,
        title: fieldText(r, 'frage'),
        subtitle: tx`Reihenfolge ${fieldNumber(r, 'reihenfolge') ?? '–'}`,
      }),
    },
    where: {
      interaktionen: r => !eventId || fieldRef(r, 'veranstaltung') === eventId,
    },
  });

  const events = useLiveList(flow.port, 'veranstaltungen', { intervalMs: 0 });
  const eventItems = useMemo(
    () =>
      events.records.map(v => ({
        id: v.id,
        title: fieldText(v, 'titel'),
        subtitle: [fieldDate(v, 'termin')?.replace('T', ' '), fieldText(v, 'ort')].filter(Boolean).join(' · ') || undefined,
      })),
    [events.records],
  );

  const picked = flow.targets.interaktionen?.record;
  const alreadyActive = picked ? fieldLookup(picked, 'aktiv') === null && picked.fields.aktiv === true : false;

  return (
    <IntentWizardShell
      title={tx('Interaktion aktivieren')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{ description: tx('Eine Interaktion live schalten — alle anderen der Veranstaltung werden inaktiv.'), needs: [tx('Die Veranstaltung')] }}
    >
      <WizardStep label={tx('Veranstaltung')} description={tx('Für welche Veranstaltung willst du eine Interaktion aktivieren?')}>
        <EntitySelectStep
          items={eventItems}
          loading={events.loading && !events.loaded}
          error={events.error ? events.error.message : null}
          create={false}
          emptyText={tx('Es gibt noch keine Veranstaltung.')}
          selectedId={eventId}
          onSelect={id => {
            setEventId(id);
            setEventLabel(eventItems.find(i => i.id === id)?.title ?? '');
            setStep(2);
          }}
        />
      </WizardStep>
      <WizardStep label={tx('Interaktion')} description={tx('Welche Frage soll jetzt aktiv sein?')}>
        {eventId ? (
          <EntitySelectStep
            {...flow.picks.interaktionen.select}
            {...flow.pick('interaktionen')}
            emptyText={tx('Diese Veranstaltung hat noch keine Interaktion.')}
            searchPlaceholder={tx('Frage suchen …')}
          />
        ) : (
          <StepNav onBack={() => setStep(1)} nextDisabled>
            {tx('Dieser Schritt braucht die Auswahl aus Schritt 1.')}
          </StepNav>
        )}
      </WizardStep>
      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={[
              ...(eventLabel ? [{ key: 'veranstaltung-info', label: tx('Veranstaltung'), value: eventLabel }] : []),
              { key: 'aktiv-info', label: tx('Aktiv'), value: alreadyActive ? tx('Ja (bleibt aktiv)') : tx('Ja') },
            ]}
            whatHappensNext={tx('Diese Interaktion wird aktiv, alle anderen Interaktionen derselben Veranstaltung werden inaktiv.')}
          />
        )}
      </WizardStep>
      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          undo={flow.undo}
          next={[
            { label: tx('Feedbacks zusammenfassen'), href: '#/intents/feedbacks-zusammenfassen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
          whatHappensNext={tx('Teilnehmende können jetzt Feedback zu dieser Interaktion senden.')}
        />
      )}
    </IntentWizardShell>
  );
}
