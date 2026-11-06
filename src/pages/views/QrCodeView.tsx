/**
 * src/pages/views/QrCodeView.tsx — the view „QR-Code“ the plan orders (dashboard.views).
 *
 * ROUTE   #/ansicht/qr-code — generated in App.tsx, OUTSIDE the dashboard chrome
 *         (no header, drawer or assistant: a beamer / kiosk / print surface). Never wire a route for it yourself.
 * LIVE    refreshes every 5 s through useLiveRecords (keep the hook —
 *         the report after the build checks that this page polls).
 * TYPE    read from across a room (K6, Abnahme 7: a fixed 24px read 26px at 1080 rows, the bar is 27):
 *         size by the SCREEN HEIGHT — text the room reads `style={{ fontSize: 'clamp(1.5rem, 2.8vh, 3rem)' }}`,
 *         headings `clamp(2rem, 4.5vh, 4.5rem)`, counters and the join link at least `clamp(1.25rem, 2.2vh, 2.25rem)`;
 *         never a fixed text-xl/text-2xl for content. Paging reads „Abschnitt 2 von 5“ — never a count
 *         noun like „1 Abschnitte“; a count of records goes through countOf (singular for one).
 * ROOM    the room must SEE that it is live (S-20, Abnahme 6): a „Live“ mark while the last
 *         poll succeeded (`!x.stale`), and the count of what the view shows („12 Beiträge“, via
 *         countOf from '@/config/plan' — x.records.length of the read). Both stay on screen.
 * READS   interaktionen (veranstaltung, frage, erlaeuterung, aktiv) — plan: aktiv eq 'true' and aktiv eq 'true' * FILTER  interaktionen: r.v_aktiv == True and r.v_aktiv == True  ← already vSQL, already in the call below: keep `query.filter`
 *         EXACTLY. The plan's words above are NOT vSQL — never send them (a 400 leaves the view empty).
 * SHOWS   exactly the record whose interaktionen.aktiv=true — the OVERVIEW sets that field (its button, plan.dashboard.writes);
 *         never „the newest“ or „the first open one“ (PV-26: the view and the dashboard showed two different events).
 *         The filter below already carries it; nothing marked → the view says so („Nichts ausgewählt“).
 * ERRORS  a read that fails sets `error` (`unauthorized` when nobody is signed in: ask to sign in, never „connection lost“);
 *         a write the view makes by itself (autosave) shows „Nicht gespeichert — erneut versuchen“ on an error, never „Speichert …“ for good (the rows stay the last good state). With no rows AND an
 *         error the view says so on screen (keep the `data-live-error` block) — never the empty state.
 * JOIN    a QR or link to the public page is BUILT: <PublicPageQr entity="veranstaltungen" recordId={…} />
 *         (or usePublicPageLink) from '@/components/widgets/PublicPageQr' — never a record's link field, and
 *         never shown only when such a field is filled: the record existing is enough (EF-15: every new event
 *         read „Kein Feedback-Link hinterlegt“ because a link field nobody writes gated the QR).
 * PURPOSE Den QR-Code zum Feedback-Formular der gerade aktiven Interaktion bildschirmfüllend im Saal zeigen, mit Frage und Erläuterung darüber.
 *
 * CONTRACT — what the overview (or a flow) and this view agree on. The overview
 * agent reads the same sentences; build EXACTLY this, never negotiate:
 *   - Zeigt die Interaktion, die die Übersicht per Klick auf „aktiv“ gesetzt hat, mit Frage und Erläuterung über dem QR-Code zum Feedback-Formular.
 *   - Öffnet sich in einem eigenen Browsertab ohne Menü und Kopfzeile.
 *   - Ist keine Interaktion aktiv, erscheint der Hinweis „Gerade ist keine Interaktion aktiv“.
 *   - Der Klick auf „Aktiv setzen“ in der Übersicht setzt die gewählte Interaktion auf aktiv und alle anderen Interaktionen derselben Veranstaltung auf nicht aktiv.
 *
 * This file is a PLACEHOLDER (KLAR_VIEW_PLACEHOLDER): replace its body with the real
 * view and drop that token. Rules: reads through useLiveRecords / useLiveRecord
 * (silent, stale on error, pauses hidden) — no own setInterval; `tx()` for every
 * visible string; big type, high contrast — this is read from across a room.
 */
import { useLiveRecords } from '@/hooks/useLiveRecords';
import { tx, appLabel } from '@/i18n';
import { countOf } from '@/config/plan';
import { extractRecordId } from '@/services/livingAppsService';
import { PublicPageQr } from '@/components/widgets/PublicPageQr';

export default function QrCodeView() {
  const interaktionen = useLiveRecords('interaktionen', { intervalMs: 5000, query: { filter: "r.v_aktiv == True and r.v_aktiv == True" } });
  const feedbacks = useLiveRecords('feedbacks', { intervalMs: 5000 });
  const active = interaktionen.records[0] ?? null;
  const eventId = active ? extractRecordId(active.fields.veranstaltung) : null;
  const n = active ? feedbacks.records.filter(f => extractRecordId(f.fields.interaktion) === active.record_id).length : 0;
  return (
    <main className="flex min-h-dvh flex-col items-center gap-6 bg-background p-8 text-center text-foreground">
      <div className="flex w-full items-center justify-between" style={{ fontSize: 'clamp(1.25rem, 2.2vh, 2.25rem)' }}>
        <span className={interaktionen.stale ? 'text-amber-600' : 'text-emerald-600'}>● {interaktionen.stale ? tx('Pause') : tx('Live')}</span>
        {active && <span>{countOf('feedbacks', n, appLabel('feedbacks'))}</span>}
      </div>
      {active ? (
        <>
          <h1 className="max-w-5xl whitespace-pre-line font-semibold" style={{ fontSize: 'clamp(2rem, 4.5vh, 4.5rem)' }}>{active.fields.frage}</h1>
          {active.fields.erlaeuterung && (
            <p className="max-w-5xl whitespace-pre-line text-muted-foreground" style={{ fontSize: 'clamp(1.5rem, 2.8vh, 3rem)' }}>{active.fields.erlaeuterung}</p>
          )}
          <div className="flex flex-1 items-center justify-center">
            <PublicPageQr entity="veranstaltungen" recordId={eventId} size="40vh" linkClassName="text-muted-foreground" />
          </div>
        </>
      ) : (
        !interaktionen.error && !interaktionen.loading && (
          <p className="mt-24 text-muted-foreground" style={{ fontSize: 'clamp(1.5rem, 2.8vh, 3rem)' }}>{tx('Gerade ist keine Interaktion aktiv')}</p>
        )
      )}
      {feedbacks.error && feedbacks.records.length === 0 && (
        <p role="alert" data-live-error className="text-destructive" style={{ fontSize: 'clamp(1.25rem, 2.2vh, 2.25rem)' }}>
          {feedbacks.unauthorized ? tx('Bitte melde dich an, um diese Ansicht zu sehen.') : tx('Die Daten konnten nicht geladen werden.')}
        </p>
      )}
      {interaktionen.error && interaktionen.records.length === 0 && (
        <p role="alert" data-live-error className="mt-4 text-destructive" style={{ fontSize: 'clamp(1.5rem, 2.8vh, 3rem)' }}>
          {interaktionen.unauthorized ? tx('Bitte melde dich an, um diese Ansicht zu sehen.') : tx('Die Daten konnten nicht geladen werden.')}
        </p>
      )}
    </main>
  );
}
