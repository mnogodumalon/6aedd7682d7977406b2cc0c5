/**
 * Feedbacks zusammenfassen — 4-Schritt-Wizard.
 * Steps: 1) Interaktion wählen → 2) Zusammenfassung öffnen (Vollbild-Textfeld, neu aufbaubar) →
 * 3) Antwort der KI einfügen → 4) Prüfen & speichern.
 * Reads: interaktionen, feedbacks. Writes: interaktionen (zusammenfassung, ki_antwort — update via useFeedbacksZusammenfassenFlow).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconCopy, IconMaximize, IconMinimize, IconRefresh } from '@tabler/icons-react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { fieldNumber, fieldText, refFilter, useLiveList } from '@/lib/journey';
import type { JourneyRecord } from '@/lib/journey';
import { useFeedbacksZusammenfassenFlow } from '@/lib/journey/flows/FeedbacksZusammenfassen';
import { undoToast } from '@/lib/polish';
import { tx } from '@/i18n';

function buildSummary(record: JourneyRecord | null | undefined, feedbacks: JourneyRecord[]): string {
  if (!record) return '';
  const parts = [
    fieldText(record, 'vorprompt'),
    ...feedbacks.map(f => `${fieldText(f, 'kuerzel')}: ${fieldText(f, 'feedbacktext')}`),
    fieldText(record, 'endprompt'),
  ];
  return parts.map(p => p.trim()).filter(Boolean).join('\n\n');
}

export default function FeedbacksZusammenfassenPage() {
  const [step, setStep] = useState(1);
  const [edited, setEdited] = useState<{ id: string; text: string } | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  // compute runs inside the flow hook; it reads what the page knows through this ref
  const liveRef = useRef<{ record: JourneyRecord | null; feedbacks: JourneyRecord[]; edited: { id: string; text: string } | null }>({
    record: null, feedbacks: [], edited: null,
  });

  const flow = useFeedbacksZusammenfassenFlow({
    steps: { interaktionen: 1, ki_antwort: 3 },
    items: {
      interaktionen: (r, ctx) => ({
        id: r.id,
        title: fieldText(r, 'frage'),
        subtitle: [ctx.ref('veranstaltung'), fieldNumber(r, 'reihenfolge') != null ? tx`Nr. ${fieldNumber(r, 'reihenfolge')}` : '']
          .filter(Boolean).join(' · '),
      }),
    },
    compute: {
      zusammenfassung: () => {
        const { record, feedbacks, edited: e } = liveRef.current;
        if (record && e && e.id === record.id) return e.text;
        return buildSummary(record, feedbacks);
      },
    },
  });

  const record = flow.targets.interaktionen?.record ?? null;
  const recordId = record?.id ?? null;

  const live = useLiveList(flow.port, 'feedbacks', {
    intervalMs: 0,
    list: { filter: recordId ? refFilter('interaktion', recordId) : undefined, limit: 500 },
    enabled: Boolean(recordId),
  });
  const feedbacks = useMemo(
    () => (recordId ? live.records.filter(f => String((f.fields as Record<string, unknown>).interaktion ?? '').includes(recordId)) : []),
    [live.records, recordId],
  );

  const composed = useMemo(() => buildSummary(record, feedbacks), [record, feedbacks]);
  const text = recordId && edited && edited.id === recordId ? edited.text : composed;
  liveRef.current = { record, feedbacks, edited };

  const rebuild = () => {
    if (!recordId) return;
    const previous = edited;
    setEdited(null);
    undoToast(tx('Zusammenfassung neu aufgebaut'), () => setEdited(previous));
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      undoToast(tx('In die Zwischenablage kopiert'), () => {});
    } catch {
      undoToast(tx('Kopieren nicht möglich — bitte Text markieren und kopieren'), () => {});
    }
  };

  const editor = (big: boolean) => (
    <div className={big ? 'flex h-full flex-col gap-3' : 'space-y-3'}>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={rebuild}>
          <IconRefresh size={16} className="shrink-0" /> {tx('Neu aufbauen')}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          <IconCopy size={16} className="shrink-0" /> {tx('Kopieren')}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setFullscreen(v => !v)}>
          {big ? <IconMinimize size={16} className="shrink-0" /> : <IconMaximize size={16} className="shrink-0" />}
          {big ? tx('Vollbild schließen') : tx('Vollbild')}
        </Button>
        <span className="text-xs text-muted-foreground">
          {live.loading ? tx('Feedbacks werden geladen …') : tx`${feedbacks.length} Feedbacks eingearbeitet`}
        </span>
      </div>
      <Textarea
        value={text}
        onChange={e => recordId && setEdited({ id: recordId, text: e.target.value })}
        className={big ? 'min-h-0 flex-1 text-base' : 'min-h-[50vh] text-base'}
        aria-label={tx('Zusammenfassung')}
      />
    </div>
  );

  return (
    <IntentWizardShell
      title={tx('Feedbacks zusammenfassen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Alle Feedbacks einer Interaktion zu einem Text für die KI zusammenführen.'),
        needs: [tx('Die Interaktion, die ausgewertet werden soll')],
      }}
    >
      <WizardStep label={tx('Interaktion')} description={tx('Welche Interaktion soll zusammengefasst werden?')}>
        <EntitySelectStep
          {...flow.picks.interaktionen.select}
          {...flow.pick('interaktionen')}
          searchPlaceholder={tx('Frage suchen …')}
        />
      </WizardStep>

      <WizardStep
        label={tx('Zusammenfassung')}
        description={tx('Text durchgehen, bei Bedarf ändern und kopieren — jederzeit neu aufbaubar.')}
        needs={['interaktionen']}
      >
        {editor(false)}
        <StepNav onBack={() => setStep(1)} nextStepLabel={tx('Antwort der KI')} />
        {fullscreen && createPortal(
          <div className="fixed inset-0 z-[var(--z-overlay)] flex flex-col bg-background p-4">
            {editor(true)}
          </div>,
          document.body,
        )}
      </WizardStep>

      <WizardStep label={tx('Antwort der KI')} description={tx('Die Antwort der KI hier einfügen.')} needs={['interaktionen']}>
        <Bound form={flow.forms.interaktionen} name="ki_antwort" rows={12} />
        <StepNav onBack={() => setStep(2)} onNext={() => flow.validateStep(3)} nextStepLabel={tx('Prüfen')} />
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={[{ key: 'zusammenfassung', label: tx('Zusammenfassung'), value: text.length > 200 ? `${text.slice(0, 200)} …` : text || '—' }]}
            whatHappensNext={tx('Zusammenfassung und Antwort der KI werden an der Interaktion gespeichert.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          next={[
            { label: tx('Interaktion aktivieren'), href: '#/intents/interaktion-aktivieren' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
