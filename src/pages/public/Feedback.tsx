import { useEffect, useMemo, useRef, useState } from 'react';
import { PublicShell } from '@/components/PublicShell';
import { Button } from '@/components/ui/button';
import { Bound } from '@/components/blocks/Bound';
import { FieldErrorSummary } from '@/components/blocks/FieldErrorSummary';
import { LoadProblem } from '@/components/blocks/LoadProblem';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import {
  loadPublicPagesConfig, prepareChallenge,
  type PublicPagesConfig, type PublicPageConfig,
} from '@/lib/publicClient';
import { createPublicPort } from '@/lib/journey/publicPort';
import {
  useStepForm, useJourneySubmit, useLiveList, useVisitorKey, fieldText,
} from '@/lib/journey';
import { tx } from '@/i18n';

function newSendId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export default function Feedback() {
  const [cfg, setCfg] = useState<PublicPagesConfig | null>(null);
  const [page, setPage] = useState<PublicPageConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPublicPagesConfig('feedback').then(c => {
      setCfg(c);
      setPage(c?.pages['feedback'] ?? null);
      setLoading(false);
    });
  }, []);

  if (loading || !cfg || !page) {
    return <PublicShell loading={loading} unavailable={!loading} />;
  }
  return <FeedbackForm cfg={cfg} page={page} />;
}

function FeedbackForm({ cfg, page }: { cfg: PublicPagesConfig; page: PublicPageConfig }) {
  const port = useMemo(() => createPublicPort(cfg, page), [cfg, page]);
  const kuerzel = useVisitorKey({ length: 5 });
  const live = useLiveList(port, 'interaktionen', { intervalMs: 20000 });
  const active = live.records[0] ?? null;
  const activeId = active?.id ?? null;

  const [sendId, setSendId] = useState(newSendId);
  const activeRef = useRef<string | null>(null);
  const sendIdRef = useRef(sendId);
  activeRef.current = activeId;
  sendIdRef.current = sendId;

  const f = useStepForm('feedbacks', {
    fields: ['feedbacktext'],
    required: { feedbacktext: true },
    autoComplete: true,
    messages: { feedbacktext: tx('Bitte schreib dein Feedback.') },
  });

  const shownIdRef = useRef<string | null>(null);
  shownIdRef.current = activeId;

  const submit = useJourneySubmit(
    port,
    [{
      key: 'feedback',
      entity: 'feedbacks',
      form: f,
      primary: true,
      values: () => ({
        interaktion: activeRef.current ?? '',
        kuerzel: kuerzel,
        sendekennung: sendIdRef.current,
      }),
    }],
    {
      draftKey: 'feedback',
      check: async () => {
        const shown = shownIdRef.current;
        if (!shown) return tx('Gerade ist keine Frage offen.');
        // freshRef(port, 'interaktionen', shown, 'aktiv') would read a bool as a ref (always null) — read the record itself
        const rec = await port.get('interaktionen', shown);
        return rec && rec.fields.aktiv ? null : tx('Inzwischen ist eine andere Frage dran.');
      },
    },
  );

  useEffect(() => { prepareChallenge(cfg, page, 'POST', `/apps/${page.endpoints?.find(e => e.op === 'create')?.app_id ?? ''}/records`); }, [cfg, page]);

  const restart = () => {
    submit.reset();
    f.reset();
    setSendId(newSendId());
  };

  const send = async () => {
    if (!f.validate()) return;
    await submit.run();
  };

  if (!live.loaded && live.error) return <PublicShell title={page.title}><LoadProblem onRetry={live.reload} /></PublicShell>;
  if (!live.loaded) return <PublicShell loading />;

  if (submit.result) {
    return (
      <PublicShell title={page.title}>
        <SuccessStep
          result={submit.result}
          title={tx('Danke für dein Feedback!')}
          actions={{ copy: false, print: false }}
          next={[
            { label: tx('Weiteres Feedback abgeben'), onClick: restart },
            { label: tx('Zur Abschlussbewertung'), href: '#/public/abschlussbewertung' },
          ]}
        >
          <p className="text-center text-sm text-muted-foreground">
            {tx('Dein Kürzel')}: <span className="font-mono text-lg font-semibold tracking-widest text-foreground">{kuerzel}</span>
          </p>
        </SuccessStep>
      </PublicShell>
    );
  }

  return (
    <PublicShell title={page.title}>
      {!active ? (
        <p className="text-sm text-muted-foreground">{tx('Gerade ist keine Frage offen. Diese Seite aktualisiert sich von selbst.')}</p>
      ) : (
        <form className="space-y-5" onSubmit={e => { e.preventDefault(); void send(); }}>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">{fieldText(active, 'frage')}</h2>
            {fieldText(active, 'erlaeuterung') && (
              <p className="whitespace-pre-line text-sm text-muted-foreground">{fieldText(active, 'erlaeuterung')}</p>
            )}
          </div>
          <Bound form={f} name="feedbacktext" rows={5} />
          <FieldErrorSummary forms={[f]} />
          {submit.error && !submit.offline && (
            <p className="text-sm text-destructive">{submit.error.message}</p>
          )}
          <Button type="submit" className="w-full" disabled={submit.submitting}>
            {submit.submitting ? tx('Wird gesendet …') : tx('Absenden')}
          </Button>
        </form>
      )}
    </PublicShell>
  );
}
