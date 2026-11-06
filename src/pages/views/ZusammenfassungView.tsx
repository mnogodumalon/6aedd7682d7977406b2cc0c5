/**
 * src/pages/views/ZusammenfassungView.tsx — the view „Zusammenfassung“ the plan orders (dashboard.views).
 *
 * ROUTE   #/ansicht/zusammenfassung — generated in App.tsx, OUTSIDE the dashboard chrome
 *         (no header, drawer or assistant: a beamer / kiosk / print surface). Never wire a route for it yourself.
 * LIVE    static — loads once.
 * READS   interaktionen (veranstaltung, reihenfolge, frage, erlaeuterung, vorprompt, endprompt, zusammenfassung, ki_antwort); feedbacks (interaktion, kuerzel, feedbacktext) * COMPOSE interaktionen.zusammenfassung: THIS view puts the text together when it opens and the field is empty —
 *         Vorprompt, dann jedes Feedback der Interaktion als Zeile mit Kürzel und Feedbacktext, danach der Endprompt, jeweils durch eine Leerzeile getrennt.
 *         Fill `compose` below (return null until every source read has loaded; `blocked` gets a sentence when one
 *         failed — then nothing is composed or saved). The overview's card opens this view in a NEW TAB with a real
 *         link: <a href={`#/ansicht/zusammenfassung?record=${r.record_id}`} target="_blank" rel="noopener">Zusammenfassen</a> —
 *         no flow, no tool, no window.open after an await. „Neu zusammenführen“ asks twice before it overwrites.
 * EDITS   interaktionen.zusammenfassung is edited ON this view, in front of the room: keep the
 *         <ViewTextEditor field="zusammenfassung" …> below (big field, saves by itself with
 *         „Gespeichert“ / „Speichert …“ / „Nicht gespeichert — erneut versuchen“, „Text kopieren“) on
 *         the record the view SHOWS — never a read-only text with an „Bearbeiten“ dialog
 *         (check-dashboard refuses a view without it).
 * ERRORS  a read that fails sets `error` (`unauthorized` when nobody is signed in: ask to sign in, never „connection lost“);
 *         a write the view makes by itself (autosave) shows „Nicht gespeichert — erneut versuchen“ on an error, never „Speichert …“ for good (the rows stay the last good state). With no rows AND an
 *         error the view says so on screen (keep the `data-live-error` block) — never the empty state.
 * JOIN    a QR or link to the public page is BUILT: <PublicPageQr entity="veranstaltungen" recordId={…} />
 *         (or usePublicPageLink) from '@/components/widgets/PublicPageQr' — never a record's link field, and
 *         never shown only when such a field is filled: the record existing is enough (EF-15: every new event
 *         read „Kein Feedback-Link hinterlegt“ because a link field nobody writes gated the QR).
 * PURPOSE Alle Feedbacks einer Interaktion in einem großen, bearbeitbaren Textfeld zusammenführen, bildschirmfüllend zeigen und mit einem Klick kopierbar machen.
 *
 * CONTRACT — what the overview (or a flow) and this view agree on. The overview
 * agent reads the same sentences; build EXACTLY this, never negotiate:
 *   - Zeigt die Interaktion, bei der der Moderator in der Übersicht auf „Zusammenfassen“ geklickt hat, und öffnet sich sofort in einem eigenen Browsertab ohne Menü.
 *   - Darüber stehen Frage und Erläuterung; im Textfeld steht oben der Vorprompt, danach jedes Feedback der Interaktion mit seinem Kürzel, unten der Endprompt.
 *   - Ist das Zusammenfassungsfeld der Interaktion leer, wird der Text beim Öffnen zusammengeführt; ist es schon gefüllt, bleibt der gespeicherte Text stehen.
 *   - Der Button „Neu zusammenführen“ baut den Text jederzeit aus allen aktuellen Feedbacks neu auf und ersetzt den bisherigen Text.
 *   - Jede Änderung im Textfeld wird automatisch bei der Interaktion gespeichert; ein Button kopiert den ganzen Text mit einem Klick.
 *   - Unter dem Textfeld gibt es ein eigenes Feld für die Antwort der KI, das sofort oder später gespeichert wird.
 *
 * This file is a PLACEHOLDER (KLAR_VIEW_PLACEHOLDER): replace its body with the real
 * view and drop that token. Rules: reads through useLiveRecords / useLiveRecord
 * (silent, stale on error, pauses hidden) — no own setInterval; `tx()` for every
 * visible string; big type, high contrast — this is read from across a room.
 */
import { useLiveRecords } from '@/hooks/useLiveRecords';
import { tx } from '@/i18n';
import { LivingAppsService } from '@/services/livingAppsService';
import { ViewTextEditor } from '@/components/blocks/ViewTextEditor';

export default function ZusammenfassungView() {
  const pinned = (new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('record') ?? '').replace(/["\\]/g, '');
  const interaktionen = useLiveRecords('interaktionen', { intervalMs: 0 });
  const feedbacks = useLiveRecords('feedbacks', { intervalMs: 0 });
  // the record whose zusammenfassung this view edits — the one it shows (the pinned one, else the first read row)
  const interaktionenEdit = interaktionen.records.find(r => r.record_id === pinned) ?? interaktionen.records[0] ?? null;
  return (
    <main className="min-h-dvh bg-background p-8 text-foreground">
      <h1 className="whitespace-pre-line font-semibold" style={{ fontSize: 'clamp(2rem, 4.5vh, 4.5rem)' }}>{interaktionenEdit?.fields.frage ?? tx('Zusammenfassung')}</h1>
      {interaktionenEdit?.fields.erlaeuterung && (
        <p className="mt-3 whitespace-pre-line text-muted-foreground" style={{ fontSize: 'clamp(1.5rem, 2.8vh, 3rem)' }}>{interaktionenEdit.fields.erlaeuterung}</p>
      )}
      {interaktionenEdit && (
        <ViewTextEditor
          field="zusammenfassung"
          recordId={interaktionenEdit.record_id}
          value={String((interaktionenEdit.fields as Record<string, unknown>)['zusammenfassung'] ?? '')}
          save={async text => {
            await LivingAppsService.updateInteraktionenEntry(interaktionenEdit.record_id, { zusammenfassung: text });
interaktionen.apply(interaktionenEdit.record_id, { zusammenfassung: text });
          }}
          // COMPOSE: build the text from the reads as the header says; null while a read is still loading
          compose={() => {
            if (interaktionen.loading || feedbacks.loading) return null;
            const own = feedbacks.records.filter(f => f.fields.interaktion && f.fields.interaktion.endsWith(interaktionenEdit.record_id));
            return [
              interaktionenEdit.fields.vorprompt ?? '',
              ...own.map(f => `${f.fields.kuerzel ?? ''}: ${f.fields.feedbacktext ?? ''}`),
              interaktionenEdit.fields.endprompt ?? '',
            ].map(s => s.trim()).filter(Boolean).join('\n\n');
          }}
          blocked={[interaktionen, feedbacks].some(x => x.error) ? tx('Die Daten konnten nicht geladen werden — es wird nichts zusammengeführt oder gespeichert.') : null}
        />
      )}
      {interaktionen.error && interaktionen.records.length === 0 && (
        <p role="alert" data-live-error className="mt-4 text-destructive" style={{ fontSize: 'clamp(1.5rem, 2.8vh, 3rem)' }}>
          {interaktionen.unauthorized ? tx('Bitte melde dich an, um diese Ansicht zu sehen.') : tx('Die Daten konnten nicht geladen werden.')}
        </p>
      )}
      {feedbacks.error && feedbacks.records.length === 0 && (
        <p role="alert" data-live-error className="mt-4 text-destructive" style={{ fontSize: 'clamp(1.5rem, 2.8vh, 3rem)' }}>
          {feedbacks.unauthorized ? tx('Bitte melde dich an, um diese Ansicht zu sehen.') : tx('Die Daten konnten nicht geladen werden.')}
        </p>
      )}
    </main>
  );
}
