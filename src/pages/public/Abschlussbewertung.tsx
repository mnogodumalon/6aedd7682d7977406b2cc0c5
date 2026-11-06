import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PublicShell } from '@/components/PublicShell';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Bound } from '@/components/blocks/Bound';
import { Field } from '@/components/blocks/Field';
import { FieldErrorSummary } from '@/components/blocks/FieldErrorSummary';
import { LoadProblem } from '@/components/blocks/LoadProblem';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { tx } from '@/i18n';
import {
  loadPublicPagesConfig,
  prepareChallenge,
  type PublicPagesConfig,
  type PublicPageConfig,
} from '@/lib/publicClient';
import { createPublicPort } from '@/lib/journey/publicPort';
import {
  fieldText,
  useJourneySubmit,
  useLiveList,
  useStepForm,
  useVisitorKey,
} from '@/lib/journey';

const SLUG = 'abschlussbewertung';

export default function Abschlussbewertung() {
  const [cfg, setCfg] = useState<PublicPagesConfig | null>(null);
  const [page, setPage] = useState<PublicPageConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPublicPagesConfig(SLUG).then(c => {
      setCfg(c);
      setPage(c?.pages[SLUG] ?? null);
      setLoading(false);
    });
  }, []);

  if (loading || !cfg || !page) {
    return <PublicShell loading={loading} unavailable={!loading} />;
  }
  return <Bewertung cfg={cfg} page={page} />;
}

function Bewertung({ cfg, page }: { cfg: PublicPagesConfig; page: PublicPageConfig }) {
  const [params] = useSearchParams();
  const veranstaltungId = params.get('veranstaltung');
  const port = useMemo(() => createPublicPort(cfg, page), [cfg, page]);
  const kuerzel = useVisitorKey();
  const live = useLiveList(port, 'veranstaltungen', { intervalMs: 0, enabled: !!veranstaltungId });
  const veranstaltung = live.records.find(r => r.id === veranstaltungId) ?? null;

  const [mailProblem, setMailProblem] = useState<string | null>(null);

  const f = useStepForm('abschlussbewertungen', {
    fields: ['veranstaltung', 'sterne', 'kommentar', 'email', 'einwilligung'],
    required: { veranstaltung: true, sterne: true, kommentar: false, email: false, einwilligung: false },
    autoComplete: true,
  });
  const submit = useJourneySubmit(
    port,
    [
      {
        key: 'bewertung',
        entity: 'abschlussbewertungen',
        form: f,
        primary: true,
        values: { kuerzel: kuerzel },
      },
    ],
    { draftKey: `abschlussbewertung-${veranstaltungId ?? 'x'}` },
  );

  const titel = veranstaltung ? fieldText(veranstaltung, 'titel') : '';
  useEffect(() => {
    if (veranstaltung) {
      f.remember(veranstaltung.id, titel);
      f.prefill('veranstaltung', veranstaltung.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [veranstaltung?.id, titel]);

  if (!veranstaltungId) {
    return (
      <PublicShell title={page.title} description={page.description}>
        <p className="text-sm text-muted-foreground">
          {tx('Dieser Link ist unvollständig. Scanne bitte den QR-Code deiner Veranstaltung.')}
        </p>
      </PublicShell>
    );
  }
  if (!live.loaded && live.error) {
    return (
      <PublicShell title={page.title} description={page.description}>
        <LoadProblem onRetry={live.reload} />
      </PublicShell>
    );
  }
  if (!live.loaded) return <PublicShell loading />;
  if (!veranstaltung) {
    return (
      <PublicShell title={page.title} description={page.description}>
        <p className="text-sm text-muted-foreground">
          {tx('Dieser Link passt zu keiner Veranstaltung. Scanne bitte den QR-Code noch einmal.')}
        </p>
      </PublicShell>
    );
  }

  if (submit.result) {
    return (
      <PublicShell title={page.title} description={page.description}>
        <SuccessStep
          result={submit.result}
          forms={[f]}
          title={tx('Danke für deine Bewertung!')}
          actions={{ copy: false, print: false }}
          whatHappensNext={
            f.get('email')
              ? tx('Deine persönliche Auswertung schicken wir an deine E-Mail-Adresse.')
              : undefined
          }
        >
          <div className="mt-4 text-sm">
            <Link
              className="font-medium text-primary underline underline-offset-4"
              to={`/public/feedback?veranstaltung=${veranstaltungId}`}
            >
              {tx('Zum Feedback-Formular')}
            </Link>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {tx('Dein Kürzel')}: <span className="font-mono font-semibold text-foreground">{kuerzel}</span>
          </p>
        </SuccessStep>
      </PublicShell>
    );
  }

  const termin = fieldText(veranstaltung, 'termin');
  const ort = fieldText(veranstaltung, 'ort');
  const meta = [termin, ort].filter(Boolean).join(' · ');

  const send = async () => {
    setMailProblem(null);
    const ok = f.validate(['veranstaltung', 'sterne']);
    if (!ok) return;
    const mail = String(f.get('email') ?? '').trim();
    if (mail) {
      if (!f.validate(['email'])) return;
      if (!f.get('einwilligung')) {
        setMailProblem(tx('Bitte stimme der Speicherung zu oder lasse die E-Mail-Adresse leer.'));
        return;
      }
    }
    await submit.run();
  };

  return (
    <PublicShell title={page.title} description={page.description}>
      <form
        className="space-y-5"
        onFocus={() => prepareChallenge(cfg, page, 'POST', `/apps/${page.endpoints?.find(e => e.op === 'create')?.app_id ?? ''}/records`)}
        onSubmit={e => {
          e.preventDefault();
          void send();
        }}
      >
        <div className="rounded-lg border bg-muted/40 p-3">
          <div className="font-semibold">{titel}</div>
          {meta && <div className="text-sm text-muted-foreground">{meta}</div>}
        </div>

        <Bound form={f} name="sterne" label={tx('Wie war die Veranstaltung?')} />
        <Bound form={f} name="kommentar" label={tx('Kommentar (freiwillig)')} rows={4} />

        <div className="space-y-3 rounded-lg border p-3">
          <div className="text-sm font-medium">
            {tx('Möchtest du eine persönliche Auswertung zu deinem Kürzel per E-Mail erhalten? Dann trage deine E-Mail-Adresse ein.')}
          </div>
          <div className="space-y-3">
            <Field form={f} name="email" label={tx('E-Mail-Adresse (freiwillig)')}>
              <Input {...f.field('email')} type="email" />
            </Field>
            <Field form={f} name="einwilligung" hideLabel>
              <label className="flex items-start gap-2 text-sm">
                <Checkbox {...f.checkbox('einwilligung')} />
                <span>{tx('Ich willige ein, dass meine E-Mail-Adresse für eine persönliche Auswertung gespeichert wird.')}</span>
              </label>
            </Field>
          </div>
          {mailProblem && <p className="text-sm text-destructive">{mailProblem}</p>}
        </div>

        <FieldErrorSummary forms={[f]} />
        {submit.error && !submit.offline && (
          <p className="text-sm text-destructive">{tx('Das Senden hat nicht geklappt. Bitte versuche es noch einmal.')}</p>
        )}
        {submit.offline && (
          <p className="text-sm text-muted-foreground">{tx('Keine Verbindung — deine Eingaben sind gesichert.')}</p>
        )}
        <Button type="submit" className="w-full sm:w-auto" disabled={submit.submitting}>
          {submit.submitting ? tx('Wird gesendet …') : tx('Bewertung absenden')}
        </Button>
      </form>
    </PublicShell>
  );
}
